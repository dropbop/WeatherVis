# Repository Guidelines

## Project Structure & Module Organization
- `app.py`: Flask app for local development and JSON APIs (`/api/weather`, `/api/summary`).
- `docs/`: GitHub Pages site (published from this folder). Key files: `docs/index.html`, `docs/assets/main.js`, `docs/data/USW00012918_1990_present.csv`.
- `templates/`: Flask HTML template mirroring the Pages UI.
- `static/vendor/`: Local JS bundles staged at runtime (Plotly, Grid.js) for offline/restricted networks.
- `scripts/`: Data fetcher `fetch_ads_ghcnd.py` (merges yearly CSVs).
- `.github/workflows/`: Scheduled workflow that refreshes CSV and commits to `docs/data/`.

## Build, Test, and Development Commands
- Create env: `python -m venv .venv && . .venv/bin/activate` (Windows: `.venv\Scripts\activate`).
- Install deps: `pip install flask pandas numpy plotly requests`.
- Run locally: `python app.py` (serves `http://localhost:5003`). Alt: `flask --app app:app run -p 5003 --debug`.
- Refresh data manually: `python scripts/fetch_ads_ghcnd.py` (writes `docs/data/USW00012918_1990_present.csv`).
- Pages deploy: commits to `docs/` are published by GitHub Pages.

## Coding Style & Naming Conventions
- Python: PEP 8, 4‑space indent, `snake_case`; constants `UPPER_CASE`; add docstrings for helpers.
- JavaScript: modern ES, `camelCase`, small focused functions; avoid global leaks.
- Formatting: no enforced config; prefer `black` + `ruff` locally to keep diffs minimal.
- Data path: by default the site reads `docs/data/...`. If changing sources, update `CSV_PATH` in `app.py` accordingly.

## Testing Guidelines
- No formal test suite yet. Validate locally:
  - `curl http://localhost:5003/api/weather`
  - `curl "http://localhost:5003/api/summary?metric=avg_tmax&start=2015&end=2020"`
- PRs adding `pytest` for data transforms in `app.py` are welcome (focus on unit tests, not network).

## Commit & Pull Request Guidelines
- Commits: concise, imperative subject; include context when changing data or charts (e.g., "bundle gridjs assets and fix fahrenheit conversion").
- PRs: include summary, rationale, validation steps, before/after screenshots for UI changes, and link related issues.
- Keep changes scoped; avoid unrelated refactors.

## Security & Configuration Tips
- No secrets required; data is public. Avoid committing local tokens.
- Offline assets: set `GRIDJS_JS_PATH` and `GRIDJS_CSS_PATH` to local files if CDNs are blocked.
- Do not run Flask with `debug=True` outside local development.

