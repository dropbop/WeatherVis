# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static weather visualization app for Houston Hobby Airport (GHCND:USW00012918) using NOAA GHCN-Daily data. Hosted on GitHub Pages from `docs/`.

## Commands

```bash
# Local preview (required for fetch to work - file:// triggers CORS errors)
python -m http.server -d docs 5500

# Manual data refresh
python scripts/fetch_ads_ghcnd.py

# Full data refresh (1990-present, not just incremental)
python scripts/fetch_ads_ghcnd.py --full
```

Data updates automatically via GitHub Actions daily at 06:15 UTC.

## Architecture

- **`docs/index.html`** - Single page app with embedded CSS
- **`docs/assets/main.js`** - All visualization logic (~770 lines)
- **`docs/data/USW00012918_1990_present.csv`** - Weather data (gap-filled daily records)
- **`scripts/fetch_ads_ghcnd.py`** - Python data pipeline (fetches from NOAA NCEI API)

Frontend uses vanilla JS with CDN-loaded libraries: Plotly.js (charts), Papa Parse (CSV), Grid.js (tables).

## Design System

Follow `style/STYLE.md` - retro 1960s-70s weather bureau aesthetic:

- **Colors**: burnt-orange (#cc5500), olive (#6b7334), brown (#5c4033), cream (#fff8dc)
- **Fonts**: Courier Prime (body), Bebas Neue/Oswald (headers)
- **Effects**: Hard shadows (no blur), graph paper backgrounds, no rounded corners
- **Animation**: None or stepped - no smooth transitions

Key rules:
- No emoji
- No pure black/white - use --brown and --paper
- Monospace for data, condensed sans for headers
- All caps for headings with wide letter-spacing
