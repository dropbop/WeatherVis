import os
import shutil
from functools import lru_cache

from flask import Flask, render_template, jsonify, request
import pandas as pd
import numpy as np

app = Flask(
    __name__,
    static_folder=os.path.join(os.path.dirname(__file__), "static"),
    template_folder=os.path.join(os.path.dirname(__file__), "templates"),
)

CSV_PATH = os.path.join(app.static_folder, "data", "USW00012918.csv")


# --- Provision local Plotly bundle (no CDN), compatible with Flask >= 2.3 ---
def _ensure_plotly_local_bundle():
    """
    Copy plotly.min.js from the installed 'plotly' Python package into:
      static/vendor/plotly/plotly.min.js
    so index.html can reference it locally.
    """
    vendor_dir = os.path.join(app.static_folder, "vendor", "plotly")
    os.makedirs(vendor_dir, exist_ok=True)
    dest = os.path.join(vendor_dir, "plotly.min.js")
    if os.path.exists(dest):
        return dest

    try:
        from importlib import resources
        src_res = resources.files("plotly") / "package_data" / "plotly.min.js"  # type: ignore[attr-defined]
        with resources.as_file(src_res) as src_path:
            shutil.copyfile(src_path, dest)
    except Exception:
        import plotly  # type: ignore
        pkg_dir = os.path.dirname(plotly.__file__)
        candidate = os.path.join(pkg_dir, "package_data", "plotly.min.js")
        if not os.path.exists(candidate):
            raise FileNotFoundError("plotly.min.js not found inside 'plotly' package.")
        shutil.copyfile(candidate, dest)
    return dest


# --- Provision local Grid.js bundle (no CDN), robust in restricted networks ---
def _ensure_gridjs_local_bundle(version: str = "6.2.0"):
    """
    Ensure the following files exist under:
        static/vendor/gridjs/gridjs.umd.js
        static/vendor/gridjs/mermaid.min.css

    Provision order:
      1) Explicit env paths (GRIDJS_JS_PATH / GRIDJS_CSS_PATH)
      2) node_modules/gridjs/dist (if you have node_modules in the project)
      3) vendor_sources/gridjs (if you vendor files in your repo)
      4) Download from CDN (jsDelivr -> unpkg) as a last resort

    Returns: (js_dest, css_dest)
    Raises: RuntimeError if assets cannot be provisioned.
    """
    vendor_dir = os.path.join(app.static_folder, "vendor", "gridjs")
    os.makedirs(vendor_dir, exist_ok=True)

    js_dest = os.path.join(vendor_dir, "gridjs.umd.js")
    css_dest = os.path.join(vendor_dir, "mermaid.min.css")

    # If both already exist, we are done
    if os.path.exists(js_dest) and os.path.exists(css_dest):
        return js_dest, css_dest

    # 1) Environment overrides (explicit local file paths)
    js_src_env = os.getenv("GRIDJS_JS_PATH")
    css_src_env = os.getenv("GRIDJS_CSS_PATH")
    if js_src_env and css_src_env and os.path.exists(js_src_env) and os.path.exists(css_src_env):
        shutil.copyfile(js_src_env, js_dest)
        shutil.copyfile(css_src_env, css_dest)
        return js_dest, css_dest

    base_dir = os.path.dirname(__file__)

    # 2) node_modules (e.g., if you've used npm/yarn/pnpm to install gridjs)
    nm_js = os.path.join(base_dir, "node_modules", "gridjs", "dist", "gridjs.umd.js")
    nm_css = os.path.join(base_dir, "node_modules", "gridjs", "dist", "theme", "mermaid.min.css")
    if os.path.exists(nm_js) and os.path.exists(nm_css):
        shutil.copyfile(nm_js, js_dest)
        shutil.copyfile(nm_css, css_dest)
        return js_dest, css_dest

    # 3) vendored sources in repo (optional convention)
    src_js = os.path.join(base_dir, "vendor_sources", "gridjs", "gridjs.umd.js")
    src_css = os.path.join(base_dir, "vendor_sources", "gridjs", "mermaid.min.css")
    if os.path.exists(src_js) and os.path.exists(src_css):
        shutil.copyfile(src_js, js_dest)
        shutil.copyfile(src_css, css_dest)
        return js_dest, css_dest

    # 4) Attempt CDN download (jsDelivr -> unpkg)
    try:
        import urllib.request
        urls = [
            (f"https://cdn.jsdelivr.net/npm/gridjs@{version}/dist/gridjs.umd.js", js_dest),
            (f"https://cdn.jsdelivr.net/npm/gridjs@{version}/dist/theme/mermaid.min.css", css_dest),
        ]
        for url, dest in urls:
            with urllib.request.urlopen(url, timeout=10) as resp, open(dest, "wb") as f:
                f.write(resp.read())
        return js_dest, css_dest
    except Exception as e1:
        try:
            import urllib.request
            urls = [
                (f"https://unpkg.com/gridjs@{version}/dist/gridjs.umd.js", js_dest),
                (f"https://unpkg.com/gridjs@{version}/dist/theme/mermaid.min.css", css_dest),
            ]
            for url, dest in urls:
                with urllib.request.urlopen(url, timeout=10) as resp, open(dest, "wb") as f:
                    f.write(resp.read())
            return js_dest, css_dest
        except Exception as e2:
            # Clean up any empty partials
            for p in (js_dest, css_dest):
                try:
                    if os.path.exists(p) and os.path.getsize(p) == 0:
                        os.remove(p)
                except Exception:
                    pass
            raise RuntimeError(
                "Unable to provision Grid.js assets. Tried env paths, node_modules, vendored sources, "
                "and CDNs (jsDelivr/unpkg).\n"
                f"Please download manually into:\n  {js_dest}\n  {css_dest}\n"
                f"Errors:\n  jsDelivr: {e1!r}\n  unpkg: {e2!r}"
            )


# Eager, idempotent provisioning on import
try:
    _ensure_plotly_local_bundle()
except Exception as e:
    print(f"[WARN] Could not stage plotly.min.js: {e}")

try:
    _ensure_gridjs_local_bundle()
except Exception as e:
    print(f"[WARN] Could not stage Grid.js assets: {e}")


# -------------------------------
# Data loading / transforms
# -------------------------------
def _tenths_to_f(v):
    v = pd.to_numeric(v, errors="coerce")
    return (v / 10.0) * 9.0 / 5.0 + 32.0


@lru_cache(maxsize=1)
def _load_df_fahrenheit():
    """
    Read once. Returns DataFrame with:
      DATE (datetime), YEAR (int), MONTH (int), TMAX_F (float), TMIN_F (float)
    Missing sentinels are masked to NaN. Temps in °F.
    """
    usecols = ["DATE", "TMAX", "TMIN"]
    df = pd.read_csv(
        CSV_PATH,
        usecols=usecols,
        encoding="utf-8-sig",
        dtype={"DATE": str, "TMAX": str, "TMIN": str},
    )
    df["DATE"] = pd.to_datetime(df["DATE"], errors="coerce")
    df = df.dropna(subset=["DATE"]).sort_values("DATE").reset_index(drop=True)

    tmax_raw = pd.to_numeric(df["TMAX"], errors="coerce")
    tmin_raw = pd.to_numeric(df["TMIN"], errors="coerce")
    tmax_raw = tmax_raw.mask(tmax_raw <= -9990, np.nan)
    tmin_raw = tmin_raw.mask(tmin_raw <= -9990, np.nan)
    max_abs = np.nanmax([tmax_raw.abs().max(), tmin_raw.abs().max()])
    if max_abs > 200:
        df["TMAX_F"] = _tenths_to_f(tmax_raw)
        df["TMIN_F"] = _tenths_to_f(tmin_raw)
    else:
        df["TMAX_F"] = tmax_raw
        df["TMIN_F"] = tmin_raw

    df["YEAR"] = df["DATE"].dt.year.astype(int)
    df["MONTH"] = df["DATE"].dt.month.astype(int)

    return df[["DATE", "YEAR", "MONTH", "TMAX_F", "TMIN_F"]]


@lru_cache(maxsize=1)
def _precompute_monthly_stats():
    """
    Precompute per-(YEAR, MONTH) aggregates (mean/max/min) and pivot to 12 columns (1..12).
    Returns dict of pivot DataFrames keyed by metric id:
      - 'avg_tmax' -> monthly mean of daily TMAX_F
      - 'avg_tmin' -> monthly mean of daily TMIN_F
      - 'rec_tmax' -> monthly max  of daily TMAX_F   (record high within year-month)
      - 'rec_tmin' -> monthly min  of daily TMIN_F   (record low within year-month)
    """
    df = _load_df_fahrenheit()

    def pivot(series, func):
        g = df.groupby(["YEAR", "MONTH"])[series].agg(func)  # NaN ignored by default
        pv = g.unstack("MONTH").sort_index().reindex(columns=range(1, 13))
        return pv.round(1)

    stats = {
        "avg_tmax": pivot("TMAX_F", "mean"),
        "avg_tmin": pivot("TMIN_F", "mean"),
        "rec_tmax": pivot("TMAX_F", "max"),
        "rec_tmin": pivot("TMIN_F", "min"),
    }

    years = sorted(df["YEAR"].unique().tolist())
    stats["_meta_year_min"] = int(min(years)) if years else None
    stats["_meta_year_max"] = int(max(years)) if years else None
    return stats


@lru_cache(maxsize=1)
def _load_weather_lists():
    """
    Backward-compatible dict for /api/weather as lists; °F rounded to 0.1.
    """
    df = _load_df_fahrenheit().copy().sort_values("DATE")
    dates = df["DATE"].dt.strftime("%Y-%m-%d").tolist()

    def to_1dec(a):
        out = []
        for v in a:
            if pd.isna(v):
                out.append(None)
            else:
                out.append(round(float(v), 1))
        return out

    return {
        "dates": dates,
        "tmax": to_1dec(df["TMAX_F"].to_numpy()),
        "tmin": to_1dec(df["TMIN_F"].to_numpy()),
    }


# -------------------------------
# Routes
# -------------------------------
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/weather")
def api_weather():
    return jsonify(_load_weather_lists())


@app.route("/api/summary")
def api_summary():
    """
    Query params:
      metric: {avg_tmax, avg_tmin, rec_tmax, rec_tmin}  (default: avg_tmax)
      start:  start year (int, default 2020)
      end:    end year   (int, default 2025)
    Returns rows: [{"year": YYYY, "Jan": v, ..., "Dec": v}, ...] with floats or null.
    """
    allowed = {"avg_tmax", "avg_tmin", "rec_tmax", "rec_tmin"}
    metric = (request.args.get("metric") or "avg_tmax").lower()
    if metric not in allowed:
        metric = "avg_tmax"

    try:
        start = int(request.args.get("start", 2020))
        end = int(request.args.get("end", 2025))
    except Exception:
        start, end = 2020, 2025

    if start > end:
        start, end = end, start

    stats = _precompute_monthly_stats()
    pv = stats.get(metric)
    if pv is None or pv.empty:
        return jsonify({"metric": metric, "years": [], "months": [], "rows": []})

    y_min, y_max = stats.get("_meta_year_min"), stats.get("_meta_year_max")
    if y_min is not None and y_max is not None:
        start = max(start, y_min)
        end = min(end, y_max)

    years = [y for y in range(start, end + 1)]
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    rows = []
    for y in years:
        row = {"year": y}
        if y in pv.index:
            vals = pv.loc[y]
            for m_idx, m_name in enumerate(month_names, start=1):
                # pandas Series .get on int key; may be NaN
                v = vals.get(m_idx, np.nan)
                row[m_name] = None if pd.isna(v) else float(v)
        else:
            for m_name in month_names:
                row[m_name] = None
        rows.append(row)

    return jsonify({
        "metric": metric,
        "years": years,
        "months": month_names,
        "rows": rows
    })


if __name__ == "__main__":
    # Remember to switch debug=False for production
    app.run(host="0.0.0.0", port=5003, debug=True)
