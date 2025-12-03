# WeatherVis

Historical weather visualization for Houston Hobby Airport (1990–present).

**Live:** https://dropbop.github.io/WeatherVis/

## Run Locally

Open `docs/index.html` in a browser. No build step.

## Update Data

Runs automatically via GitHub Actions (daily). Manual:

```
python scripts/fetch_ads_ghcnd.py
```
