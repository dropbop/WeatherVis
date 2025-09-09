# WeatherVis

An entirely online web app that displays local weather data for HOU / William P. Hobby (station [USW00012918](https://www.ncei.noaa.gov/access/search/data-search/daily-summaries?stations=USW00012918)). It’s part exploratory data analysis and part art project: build it, publish it, and avoid ongoing maintenance beyond generating new visuals.

## How It Works

- Hosting: GitHub Pages serves a static app from `docs/` (no server).
- Data: A daily GitHub Action downloads GHCN‑Daily via NCEI ADS and writes `docs/data/USW00012918_1990_present.csv`.
- Visuals: `docs/index.html` + `docs/assets/main.js` render interactive views in the browser (Plotly.js + Grid.js; CSV parsed with PapaParse). No Flask in production.

## Backup Data (Do Not Overwrite)

Keep a backup file that the workflow never touches:

- Path: `docs/data/backup/USW00012918_backup.csv`
- Policy: The action only updates `docs/data/USW00012918_1990_present.csv`, not files under `docs/data/backup/`.

If the API is down or a bad update occurs, restore by copying the backup over the live file and committing:

```
cp docs/data/backup/USW00012918_backup.csv docs/data/USW00012918_1990_present.csv
git add docs/data/USW00012918_1990_present.csv
git commit -m "Restore data from backup"
git push
```

## Tech Stack & Guidelines

- Charts: Prefer Plotly.js for time series, ridgeline, and rich interactivity. Chart.js is optional for simple charts.
- Tables: Grid.js for sortable, paginated tables (CSV download supported).
- Data: Load CSV directly from `docs/data/…` via `fetch` and PapaParse. Add derived JSON under `docs/data/derived/` if needed.
- Structure: Keep browser code in `docs/assets/main.js` (or split into small files and import via `<script type="module">`).
- Keep dependencies lean; avoid server frameworks.

## Development

- Local preview (static): `python -m http.server -d docs 5500` then open http://localhost:5500
- Refresh data manually: `python scripts/fetch_ads_ghcnd.py`

Tip: Add new visuals in `docs/assets/main.js` and corresponding sections in `docs/index.html`.
