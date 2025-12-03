#!/usr/bin/env python3
"""
Fetch GHCN-Daily data for Houston Hobby (USW00012918) from NCEI ADS.

Incremental mode: only fetches recent years to minimize server load.
Full mode: fetches entire history (use --full flag or when no existing data).
"""

import os
import sys
import time
import csv
import io
import datetime
import json
import argparse
import requests

# --- Configuration ---
BASE_URL = "https://www.ncei.noaa.gov/access/services/data/v1"
STATION = "USW00012918"  # Houston Hobby Airport
START_YEAR = 1990
UNITS = "standard"  # Fahrenheit, inches, etc.

# Output paths (under docs/ for GitHub Pages)
OUT_DIR = os.path.join("docs", "data")
OUT_CSV = os.path.join(OUT_DIR, f"{STATION}_{START_YEAR}_present.csv")
DERIVED_DIR = os.path.join(OUT_DIR, "derived")
META_JSON = os.path.join(DERIVED_DIR, "metadata.json")

# How many years back to fetch in incremental mode
# (catches late-arriving data and covers year boundaries)
INCREMENTAL_YEARS_BACK = 2


def fetch_year(year: int, retries: int = 3) -> str:
    """Fetch one year of daily summaries from NCEI ADS."""
    params = {
        "dataset": "daily-summaries",
        "stations": STATION,
        "startDate": f"{year}-01-01",
        "endDate": f"{year}-12-31",
        "includeAttributes": "true",
        "includeStationName": "true",
        "includeStationLocation": "true",
        "units": UNITS,
        "format": "csv",
    }

    for attempt in range(retries):
        try:
            resp = requests.get(BASE_URL, params=params, timeout=60)
            if resp.status_code == 200 and resp.text.strip():
                # Basic validation: should have DATE column
                if "DATE" in resp.text.split("\n")[0]:
                    return resp.text
                print(f"  Warning: response for {year} missing DATE column, retrying...")
            else:
                print(f"  Warning: {year} returned status {resp.status_code}, retrying...")
        except requests.RequestException as e:
            print(f"  Warning: {year} request failed ({e}), retrying...")

        time.sleep(3 * (attempt + 1))

    # Final attempt - raise on failure
    resp = requests.get(BASE_URL, params=params, timeout=60)
    resp.raise_for_status()
    return resp.text


def parse_csv_text(text: str) -> tuple[list[str], list[dict]]:
    """Parse CSV text, return (fieldnames, rows)."""
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    return list(reader.fieldnames or []), rows


def load_existing_csv() -> tuple[list[str], dict[str, dict]]:
    """Load existing CSV into a date-indexed dict. Returns (headers, {date: row})."""
    if not os.path.exists(OUT_CSV):
        return [], {}

    with open(OUT_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        headers = list(reader.fieldnames or [])
        by_date = {}
        for row in reader:
            date = row.get("DATE", "").strip()
            if date:
                by_date[date] = row
        return headers, by_date


def get_last_date_in_data(by_date: dict[str, dict]) -> datetime.date | None:
    """Find the most recent date with actual data (not just a padded row)."""
    if not by_date:
        return None

    # Find max date that has at least one non-empty value besides DATE
    for date_str in sorted(by_date.keys(), reverse=True):
        row = by_date[date_str]
        has_data = any(
            v.strip() for k, v in row.items()
            if k != "DATE" and v
        )
        if has_data:
            return datetime.date.fromisoformat(date_str)

    return None


def merge_data(
    existing_headers: list[str],
    existing_data: dict[str, dict],
    new_chunks: list[str],
) -> tuple[list[str], dict[str, dict], int]:
    """
    Merge new CSV chunks into existing data.
    Returns (merged_headers, merged_data, new_rows_count).
    """
    headers_set = set(existing_headers)
    merged = dict(existing_data)
    new_count = 0

    for text in new_chunks:
        chunk_headers, rows = parse_csv_text(text)
        headers_set.update(chunk_headers)

        for row in rows:
            date = row.get("DATE", "").strip()
            if not date:
                continue

            # Check if this is actually new/updated data
            if date not in merged:
                new_count += 1
            elif row != merged[date]:
                # Data changed for existing date
                new_count += 1

            merged[date] = row

    # Stable header order
    headers = sorted(h for h in headers_set if h)
    return headers, merged, new_count


def write_csv(headers: list[str], data: dict[str, dict]) -> tuple[int, str, str]:
    """
    Write merged data to CSV with gap-filling for missing days.
    Returns (row_count, start_date, end_date).
    """
    os.makedirs(OUT_DIR, exist_ok=True)

    # Determine date range
    if not data:
        start_date = datetime.date(START_YEAR, 1, 1)
        end_date = start_date
    else:
        dates = sorted(data.keys())
        start_date = datetime.date(START_YEAR, 1, 1)
        end_date = datetime.date.fromisoformat(dates[-1])

    # Write with gap-filling
    row_count = 0
    padded_count = 0

    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()

        current = start_date
        while current <= end_date:
            date_str = current.isoformat()
            row = data.get(date_str)

            if row is None:
                # Gap-fill with empty row
                row = {h: "" for h in headers}
                row["DATE"] = date_str
                padded_count += 1

            writer.writerow(row)
            row_count += 1
            current += datetime.timedelta(days=1)

    return row_count, start_date.isoformat(), end_date.isoformat(), padded_count


def write_metadata(
    row_count: int,
    start_date: str,
    end_date: str,
    padded_count: int,
    fetch_mode: str,
    years_fetched: list[int],
):
    """Write metadata JSON for the frontend."""
    os.makedirs(DERIVED_DIR, exist_ok=True)

    meta = {
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "station": STATION,
        "units": UNITS,
        "startDate": start_date,
        "endDate": end_date,
        "rowCount": row_count,
        "paddedDays": padded_count,
        "fetchMode": fetch_mode,
        "yearsFetched": years_fetched,
    }

    with open(META_JSON, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)


def main():
    parser = argparse.ArgumentParser(description="Fetch GHCN-Daily data for Houston Hobby")
    parser.add_argument(
        "--full",
        action="store_true",
        help="Force full historical fetch (default: incremental)",
    )
    args = parser.parse_args()

    today = datetime.date.today()
    current_year = today.year

    # Load existing data
    existing_headers, existing_data = load_existing_csv()
    last_date = get_last_date_in_data(existing_data)

    # Determine fetch range
    if args.full or not existing_data:
        fetch_mode = "full"
        start_year = START_YEAR
        print(f"Full fetch: {START_YEAR}–{current_year} for {STATION}")
    else:
        fetch_mode = "incremental"
        # Fetch from N years back to catch any late-arriving data
        start_year = max(current_year - INCREMENTAL_YEARS_BACK, START_YEAR)
        print(f"Incremental fetch: {start_year}–{current_year} for {STATION}")
        if last_date:
            print(f"  Last data point: {last_date}")

    # Fetch years
    chunks = []
    years_fetched = list(range(start_year, current_year + 1))

    for year in years_fetched:
        print(f"  Fetching {year}...")
        chunks.append(fetch_year(year))

    # Merge with existing data
    headers, merged_data, new_count = merge_data(existing_headers, existing_data, chunks)
    print(f"  Merged: {new_count} new/updated rows")

    # Write output
    row_count, start_date, end_date, padded_count = write_csv(headers, merged_data)
    write_metadata(row_count, start_date, end_date, padded_count, fetch_mode, years_fetched)

    print(f"Wrote {OUT_CSV}")
    print(f"  {row_count} rows [{start_date} → {end_date}], {padded_count} gap-filled")
    print(f"Wrote {META_JSON}")


if __name__ == "__main__":
    main()
