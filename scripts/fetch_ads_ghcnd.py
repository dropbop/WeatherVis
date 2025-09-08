#!/usr/bin/env python3
import os, sys, time, csv, io, datetime, requests

BASE = "https://www.ncei.noaa.gov/access/services/data/v1"
STATION = "GHCND:USW00012918"  # Hobby
START_YEAR = 1990
UNITS = "standard"  # "metric" for SI

# Output path under docs/ so GitHub Pages serves it
OUT_DIR = os.path.join("docs", "data")
OUT_CSV = os.path.join(OUT_DIR, "USW00012918_1990_present.csv")

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

def write_merged_csv(chunks: list[str]) -> None:
    # Merge CSVs with consistent header union (some years may lack some columns)
    # Build a superset header first
    headers_set = set()
    parsed_rows = []
    for t in chunks:
        s = io.StringIO(t)
        rdr = csv.DictReader(s)
        rows = [row for row in rdr]
        parsed_rows.append(rows)
        headers_set.update(rdr.fieldnames or [])
    headers = [h for h in sorted(headers_set) if h]  # stable order
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=headers)
        w.writeheader()
        for rows in parsed_rows:
            for row in rows:
                w.writerow(row)

def main():
    today = datetime.date.today()
    end_year = today.year
    print(f"Fetching {START_YEAR}..{end_year} for {STATION} (units={UNITS})")
    chunks = []
    for y in range(START_YEAR, end_year + 1):
        print(f"- {y}")
        chunks.append(fetch_year(y))
    write_merged_csv(chunks)
    print(f"Wrote {OUT_CSV} ({sum(len(c.splitlines())-1 for c in chunks)} rows)")

if __name__ == "__main__":
    main()
