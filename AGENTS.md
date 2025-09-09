# Repository Guidelines

## Project Structure & Module Organization
- `docs/`: GitHub Pages site (published from this folder). Key files: `docs/index.html`, `docs/assets/main.js`, `docs/data/USW00012918_1990_present.csv`.
- `docs/data/backup/`: Holds a backup CSV not touched by the workflow.
- `scripts/`: Data fetcher `fetch_ads_ghcnd.py` (merges yearly CSVs).
- `.github/workflows/`: Scheduled workflow that refreshes CSV and commits to `docs/data/`.

## Build, Test, and Development Commands
- Local preview (static): `python -m http.server -d docs 5500` and open `http://localhost:5500`.
- Refresh data: `python scripts/fetch_ads_ghcnd.py` (writes `docs/data/USW00012918_1990_present.csv`).
- Deploy: commits to `docs/` are published by GitHub Pages.

## Coding Style & Naming Conventions
- JavaScript: modern ES, `camelCase`, small focused functions; avoid global state.
- Charts: prefer Plotly.js for rich interactivity; Chart.js optional for simple charts.
- Tables: use Grid.js for interactivity and CSV export.
- Data path: the site reads `docs/data/...`; derived artifacts may live under `docs/data/derived/`.
- Formatting: no enforced config; keep diffs minimal and consistent.

## Testing Guidelines
- No formal test suite. Validate locally by loading the site via a static server and exercising interactivity.
- Check rendering on desktop + mobile widths; verify CSV download from the summary table.

## Commit & Pull Request Guidelines
- Commits: concise, imperative subject; include context when changing data or charts (e.g., "bundle gridjs assets and fix fahrenheit conversion").
- PRs: include summary, rationale, validation steps, before/after screenshots for UI changes, and link related issues.
- Keep changes scoped; avoid unrelated refactors.

## Security & Configuration Tips
- No secrets required; data is public. Avoid committing local tokens.
- Backup: keep `docs/data/backup/USW00012918_backup.csv` as the restore source.
- CDN vs local: default to CDN for Plotly/Grid.js; vendor locally under `docs/vendor/` if your environment blocks CDNs.
