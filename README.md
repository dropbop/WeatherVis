# WeatherVis

An entirely online web app that displays local weather data for HOU / William P. Hobby (station [USW00012918](https://www.ncei.noaa.gov/access/search/data-search/daily-summaries?stations=USW00012918)). It’s part exploratory data analysis and part art project: build it, publish it, and avoid ongoing maintenance beyond generating new visuals.

## How It Works

- Hosting: GitHub Pages serves the static site from `docs/`.
- Data: A daily GitHub Action downloads GHCN‑Daily via NCEI ADS and writes `docs/data/USW00012918_1990_present.csv`.
- Visuals: `docs/index.html` + `docs/assets/main.js` render interactive Plotly views directly in the browser.
- Local dev (optional): `app.py` provides a Flask view and JSON APIs to iterate quickly on visuals.

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

## Development

- Setup: `python -m venv .venv && . .venv/bin/activate` (Windows: `.venv\Scripts\activate`)
- Install: `pip install flask pandas numpy plotly requests`
- Run (local): `python app.py` → http://localhost:5003
- Refresh data manually: `python scripts/fetch_ads_ghcnd.py`

Tip: New visuals should be implemented in `docs/assets/main.js` (for Pages) and optionally mirrored in `templates/index.html` (for Flask dev).
