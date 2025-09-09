#!/usr/bin/env python3
import os, sys, time, csv, io, datetime, json, requests

BASE = "https://www.ncei.noaa.gov/access/services/data/v1"
STATION = "USW00012918"  # Hobby
START_YEAR = 1990
UNITS = "standard"  # "metric" for SI

# Output path under docs/ so GitHub Pages serves it
OUT_DIR = os.path.join("docs", "data")
OUT_CSV = os.path.join(OUT_DIR, "USW00012918_1990_present.csv")
DERIVED_DIR = os.path.join(OUT_DIR, "derived")
META_JSON = os.path.join(DERIVED_DIR, "metadata.json")

def fetch_year(y: int) -> str:
    params = {
        "dataset": "daily-summaries",
        "stations": STATION,
        # omit dataTypes to get all available daily summary variables for this dataset
        "startDate": f"{y}-01-01",
        "endDate": f"{y}-12-31",
        "includeAttributes": "true",
        "includeStationName": "true",
        "includeStationLocation": "true",
        "units": UNITS,
        "format": "csv",
    }
    for attempt in range(3):
        r = requests.get(BASE, params=params, timeout=60)
        if r.status_code == 200 and r.text.strip():
            return r.text
        time.sleep(3 * (attempt + 1))
    r.raise_for_status()
    return r.text

def write_merged_csv(chunks: list[str]) -> tuple[int, str | None, str | None]:
    # Merge CSVs with consistent header union (some years may lack some columns)
    # Build a superset header first
    headers_set = set()
    parsed_rows = []
    row_count_actual = 0  # rows returned by ADS
    min_date_actual: str | None = None
    max_date_actual: str | None = None
    for t in chunks:
        s = io.StringIO(t)
        rdr = csv.DictReader(s)
        rows = [row for row in rdr]
        parsed_rows.append(rows)
        headers_set.update(rdr.fieldnames or [])
        for row in rows:
            d = (row.get("DATE") or "").strip()
            if d:
                min_date_actual = d if (min_date_actual is None or d < min_date_actual) else min_date_actual
                max_date_actual = d if (max_date_actual is None or d > max_date_actual) else max_date_actual
        row_count_actual += len(rows)
    headers = [h for h in sorted(headers_set) if h]  # stable order
    os.makedirs(OUT_DIR, exist_ok=True)
    # Build a daily index from START_YEAR-01-01 to last available date, padding missing days
    by_date: dict[str, dict] = {}
    for rows in parsed_rows:
        for row in rows:
            d = (row.get("DATE") or "").strip()
            if d:
                by_date[d] = row
    # Determine output range
    start_date = datetime.date(START_YEAR, 1, 1)
    if max_date_actual is None:
        # No data at all
        end_date = start_date
    else:
        y, m, dd = map(int, max_date_actual.split("-"))
        end_date = datetime.date(y, m, dd)

    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=headers)
        w.writeheader()
        cur = start_date
        padded_count = 0
        written = 0
        while cur <= end_date:
            ds = cur.isoformat()
            row = by_date.get(ds)
            if row is None:
                row = {"DATE": ds}
                padded_count += 1
            w.writerow(row)
            written += 1
            cur += datetime.timedelta(days=1)
    # Write metadata JSON for the site to display
    os.makedirs(DERIVED_DIR, exist_ok=True)
    generated_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
    meta = {
        "generatedAt": generated_at,
        "station": STATION,
        "units": UNITS,
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "rowCount": written,
        "rowCountActual": row_count_actual,
        "paddedDays": padded_count,
    }
    with open(META_JSON, "w", encoding="utf-8") as mf:
        json.dump(meta, mf, ensure_ascii=False, indent=2)
    return written, start_date.isoformat(), end_date.isoformat()

def main():
    today = datetime.date.today()
    end_year = today.year
    print(f"Fetching {START_YEAR}..{end_year} for {STATION} (units={UNITS})")
    chunks = []
    for y in range(START_YEAR, end_year + 1):
        print(f"- {y}")
        chunks.append(fetch_year(y))
    rows, start_date, end_date = write_merged_csv(chunks)
    print(f"Wrote {OUT_CSV} ({rows} rows) [{start_date}→{end_date}] and {META_JSON}")

if __name__ == "__main__":
    main()
