# WeatherVis

Static GitHub Pages site visualizing GHCN-Daily data for station [USW00012918](https://www.ncei.noaa.gov/access/search/data-search/daily-summaries?stations=USW00012918) (HOU / William P. Hobby Airport).

The `fetch_ads_ghcnd.py` script (run daily via GitHub Actions) downloads data from NCEI's tokenless Access Data Service and commits the CSV into `docs/data/` so the page can read it locally without CORS issues.

## Development

* `scripts/fetch_ads_ghcnd.py` merges yearly CSVs from 1990 to present.
* `docs/index.html` + `docs/assets/main.js` render a Plotly chart of daily high/low temperatures.
* GitHub Pages serves from the `docs/` folder.
