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

## Style Reference Files (DO NOT MODIFY)
- `STYLE.md`: Complete design system documentation for the Retro Meteorology theme
- `STYLE.html`: Working example implementation showing all design patterns
- **IMPORTANT**: These files are reference-only. Do not modify them. Use them as the authoritative source for styling decisions.

## Design System Implementation
When updating the app's visual design:
1. Follow the Retro Meteorology Design System defined in `STYLE.md`
2. Reference `STYLE.html` for implementation examples
3. Core design principles:
   - 1960s-1970s weather documentation aesthetic
   - Typewriter fonts (Courier Prime), bureaucratic elements
   - Earth tone color palette (burnt orange, olive, brown)
   - Paper textures, halftone patterns, graph paper grids
   - No smooth transitions, rounded corners, or modern effects
   - Official stamps, form numbers, and administrative details

## Testing Guidelines
- No formal test suite. Validate locally by loading the site via a static server and exercising interactivity.
- Check rendering on desktop + mobile widths; verify CSV download from the summary table.

## Commit & Pull Request Guidelines

### Commits
- Use an imperative, concise subject (≤ 60 chars). Keep body wrapped at ~72 chars.
- Prefix subjects with a scope when helpful:
  - `data:` CSV/metadata updates under `docs/data/` (manual updates only; the workflow may use its own message)
  - `charts:` Plotly/Grid.js changes (e.g., `charts: ridgeline hover and axis tweaks`)
  - `ui:` layout/typography/colors in `docs/index.html` or CSS
  - `scripts:` data fetch/merge logic in `scripts/`
  - `infra:` CI, GitHub Actions, Pages config
  - `docs:` README or project docs
  - `chore:` non-functional maintenance
- When touching data or chart semantics, include context in the body:
  - Data: note `startDate → endDate`, `rowCount`, `paddedDays`, and `generatedAt (CST/CDT)` if known.
  - Units/fields: call out any schema or meaning changes (e.g., Fahrenheit vs Celsius).
- Keep diffs minimal and atomic; avoid unrelated refactors. Prefer multiple small commits over one mixed change.
- Example subjects:
  - `charts: add CST/CDT timestamp to header`
  - `scripts: write metadata.json with generatedAt`
  - `ui: tighten legend spacing per STYLE.md`

### Pull Requests
- Include:
  - Summary and rationale of the change
  - Scope: key files/areas touched
  - Validation steps (local server URL, controls exercised, CSV download checked)
  - Before/after screenshots for any UI change (desktop + mobile widths)
  - Data impact (if applicable): new range, row counts, padded days; link the workflow run if it produced the data
  - Related issues/links
- Keep PRs narrowly scoped. Split large data-only changes from code/UI where practical.
- Label PRs to aid triage: `area:data`, `area:charts`, `area:ui`, `area:scripts`, `type:feature`, `type:fix`, `type:chore`.
- Prefer "Squash and merge" for tidy history unless preserving individual commits is important.
- For risky data/UI changes, include a rollback note (e.g., revert to `docs/data/backup/USW00012918_backup.csv` or prior commit SHA).

## Security & Configuration Tips
- No secrets required; data is public. Avoid committing local tokens.
- Backup: keep `docs/data/backup/USW00012918_backup.csv` as the restore source.
- CDN vs local: default to CDN for Plotly/Grid.js; vendor locally under `docs/vendor/` if your environment blocks CDNs.
