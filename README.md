# WeatherVis

Static GitHub Pages site visualizing GHCN-Daily data for station [USW00012918](https://www.ncei.noaa.gov/access/search/data-search/daily-summaries?stations=USW00012918) (HOU / William P. Hobby Airport).

The `fetch_ads_ghcnd.py` script (run daily via GitHub Actions) downloads data from NCEI's tokenless Access Data Service and commits the CSV into `docs/data/` so the page can read it locally without CORS issues.

## Development

* `scripts/fetch_ads_ghcnd.py` merges yearly CSVs from 1990 to present.
* `docs/index.html` + `docs/assets/main.js` render a Plotly chart of daily high/low temperatures.
* GitHub Pages serves from the `docs/` folder.


## To-Do

* Already have daily low and high time series in place. Need to
  * Set default time series view 
  * Figure out why the
* Add Ridgeline chart
  * Default to last 5 years of data
  * Include controls on months to view
  * Adjust height of plot for superior visualization
* Add monthly summary table
  * Include controls on which metrics to display
  * 
