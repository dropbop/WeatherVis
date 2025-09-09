(async () => {
  const csvUrl = "./data/USW00012918_1990_present.csv";
  const resp = await fetch(csvUrl, { cache: "no-store" });
  if (!resp.ok) { document.getElementById("chart").innerHTML = "<p>Data file missing.</p>"; return; }
  const text = await resp.text();
  const parsed = Papa.parse(text, { header: true, dynamicTyping: true });
  const rows = parsed.data.filter(r => r && r.DATE);

  // Convert to arrays we can reuse across views
  // Assume CSV temperatures are already in °F. No conversions.
  function asNumber(v) {
    const n = (typeof v === "number") ? v : (v == null ? NaN : Number(v));
    return Number.isFinite(n) ? n : null;
  }
  function c_to_F(v) { return (v * 9/5) + 32; }
  // Infer units for a numeric temperature and convert to °F.
  // Heuristic:
  // - >200 or < -150  => tenths °C (e.g., 350 => 95°F)
  // - between -50..60 => °C
  // - otherwise        => already °F
  function toFahrenheitAuto(v) {
    if (!Number.isFinite(v)) return null;
    if (v > 200 || v < -150) return tenthsC_to_F(v);
    if (v >= -50 && v <= 60) return c_to_F(v);
    return v;
  }
  const dates = [];
  const tmax = [];
  const tmin = [];
  for (const r of rows) {
    const d = String(r.DATE).slice(0, 10); // YYYY-MM-DD
    // Use TMAX/TMIN as-is (°F). If missing, fallback to any *_F fields without conversion.
    let tmaxF = asNumber(r.TMAX);
    let tminF = asNumber(r.TMIN);
    if (tmaxF == null) tmaxF = asNumber(r.TMAX_F ?? r.TMAX_f ?? r.tmax_f);
    if (tminF == null) tminF = asNumber(r.TMIN_F ?? r.TMIN_f ?? r.tmin_f);
    dates.push(d);
    tmax.push(tmaxF);
    tmin.push(tminF);
  }

  // ---------- Chart 1: Daily Max/Min ----------
  const hoverDates = dates.map(ds => formatDateOrdinal(ds));
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];
  const DEFAULT_START = "2020-01-01";
  const startCandidate = (maxDate >= DEFAULT_START) ? DEFAULT_START : minDate;
  const initialStart = (minDate > startCandidate) ? minDate : startCandidate;

  const traceMax = {
    type: "scattergl", mode: "lines", name: "TMAX (°F)",
    x: dates, y: tmax, customdata: hoverDates,
    line: { color: "#d62728", width: 1.5 }, connectgaps: false,
    hovertemplate: "%{customdata}<br>TMAX: %{y:.1f}°F<extra></extra>"
  };
  const traceMin = {
    type: "scattergl", mode: "lines", name: "TMIN (°F)",
    x: dates, y: tmin, customdata: hoverDates,
    line: { color: "#1f77b4", width: 1.5 }, connectgaps: false,
    hovertemplate: "%{customdata}<br>TMIN: %{y:.1f}°F<extra></extra>"
  };
  const layout1 = {
    uirevision: "keep",
    title: { text: "USW00012918 — Daily Max/Min Temperature (°F)", x: 0, xanchor: "left" },
    legend: { orientation: "h", x: 1, y: 1.15, xanchor: "right", yanchor: "bottom" },
    margin: { t: 60, r: 20, b: 60, l: 60 },
    xaxis: { type: "date", title: "Date", autorange: false, range: [initialStart, maxDate], rangeslider: { visible: true, range: [minDate, maxDate] } },
    yaxis: { title: "Temperature (°F)", tickformat: ".1f", ticksuffix: "°F", zeroline: false },
    hovermode: "x unified",
    updatemenus: [{ type: "buttons", direction: "right", x: 0, y: 1.22, xanchor: "left", yanchor: "bottom", pad: { r: 6, t: 0, b: 0, l: 0 }, showactive: false,
      buttons: [
        { label: "Default", method: "relayout", args: [ { "xaxis.range": [initialStart, maxDate] } ] },
        { label: "All",     method: "relayout", args: [ { "xaxis.range": [minDate,    maxDate] } ] }
      ]
    }]
  };
  Plotly.newPlot("chart", [traceMax, traceMin], layout1, { responsive: true, displaylogo: false });

  // ---------- Chart 2: Ridgeline (client-side) ----------
  const years = [...new Set(dates.map(ds => Number(ds.slice(0,4))))].sort((a,b) => a - b);
  window.yearList = years;
  // Ridgeline default: show only 2020–2025 (clamped to available data)
  const DESIRED_RIDGE_START = 2020;
  const DESIRED_RIDGE_END = 2025;
  const clampStart = Math.max(DESIRED_RIDGE_START, years[0] ?? DESIRED_RIDGE_START);
  const clampEnd = Math.min(DESIRED_RIDGE_END, years[years.length - 1] ?? DESIRED_RIDGE_END);
  const hasOverlap = clampStart <= clampEnd;
  const ridgeYears = hasOverlap ? years.filter(y => y >= clampStart && y <= clampEnd) : years.slice();
  // Also preset summary year inputs to the same default range
  document.getElementById("yearStart").value = hasOverlap ? clampStart : years[0];
  document.getElementById("yearEnd").value = hasOverlap ? clampEnd : years[years.length - 1];
  buildRidgelineCanonical(dates, tmax, tmin, ridgeYears);

  // ---------- Monthly summary (client-side) ----------
  const monthStats = precomputeMonthlyStats(dates, tmax, tmin);
  await renderSummary(monthStats);

  // Controls
  document.getElementById("btnApply").addEventListener("click", () => renderSummary(monthStats));
  document.querySelectorAll('input[name="metric"]').forEach(r => r.addEventListener("change", () => renderSummary(monthStats)));
  document.getElementById("btnDownload").addEventListener("click", async () => {
    const { rows } = getSummaryRows(monthStats);
    downloadCSV("summary.csv", rows);
  });

})().catch(err => {
  const el = document.getElementById("chart");
  if (el) el.innerHTML = `<div style="padding:1rem;color:crimson"><strong>Error:</strong> ${String(err.message || err)}</div>`;
});

// -------- Helpers for charts and stats --------
function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const int = parseInt(h, 16);
  const r = (int >> 16) & 255, g = (int >> 8) & 255, b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
function ordinal(n) {
  const s = ["th","st","nd","rd"], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
function formatDateOrdinal(iso) {
  const d = new Date(iso + "T00:00:00Z");
  const month = d.toLocaleString("en-US", { timeZone: "UTC", month: "long" });
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  return `${month} ${day}${ordinal(day)} ${year}`;
}
function dayOfYearISO(isoDate) {
  const dt = new Date(isoDate + "T00:00:00Z");
  const start = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.floor((dt - start) / 86400000) + 1;
}
function isoFromYearAndDoy(year, doy) {
  const start = new Date(Date.UTC(year, 0, 1));
  start.setUTCDate(start.getUTCDate() + (doy - 1));
  return start.toISOString().slice(0, 10);
}
function isLeap(year) {
  return (year % 4 === 0) && (year % 100 !== 0 || year % 400 === 0);
}

function buildRidgelineCanonical(dates, tmax, tmin, years) {
  const COLORS = years.map((_, i) => `hsl(${(i * 360 / years.length)}, 65%, 45%)`);
  const DOY = Array.from({ length: 366 }, (_, i) => i + 1);

  function meanF(v1, v2) {
    const hasMax = (v1 !== null && v1 !== undefined);
    const hasMin = (v2 !== null && v2 !== undefined);
    if (hasMax && hasMin) return Number(((v1 + v2) / 2).toFixed(1));
    if (hasMax) return v1; if (hasMin) return v2; return null;
  }

  function yearSeries(year) {
    const yVals = new Array(366).fill(null);
    const hover = new Array(366).fill(null);
    for (let i = 0; i < dates.length; i++) {
      const ds = dates[i]; const y  = Number(ds.slice(0, 4));
      if (y !== year) continue;
      const tm = meanF(tmax[i], tmin[i]);
      if (tm === null) continue;
      const natDOY = dayOfYearISO(ds);
      const cDOY = isLeap(year) ? natDOY : (natDOY >= 60 ? natDOY + 1 : natDOY);
      if (cDOY < 1 || cDOY > 366) continue;
      yVals[cDOY - 1] = tm;
      const actualDOY = isLeap(year) ? cDOY : (cDOY > 60 ? cDOY - 1 : cDOY);
      const iso = isoFromYearAndDoy(year, actualDOY);
      hover[cDOY - 1] = formatDateOrdinal(iso);
    }
    return { yVals, hover };
  }

  const perYear = new Map();
  let gmin = +Infinity, gmax = -Infinity;
  for (const yr of years) {
    const obj = yearSeries(yr);
    perYear.set(yr, obj);
    for (const v of obj.yVals) { if (v === null) continue; if (v < gmin) gmin = v; if (v > gmax) gmax = v; }
  }
  if (!isFinite(gmin) || !isFinite(gmax)) {
    document.getElementById("ridge").innerHTML = `<div class="note">No data for ${years[0]}–${years[years.length-1]}.` + `</div>`;
    return;
  }

  document.getElementById("ridgeTitle").textContent = `Ridgeline — Daily Mean Temperature by Day‑of‑Year (${years[0]}–${years[years.length-1]})`;

  const GAP = 30, SCALE = 0.25;
  const traces = [];
  const MONTH_TICKS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
  const MONTH_TEXT  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  years.forEach((yr, idx) => {
    const baseY = idx * GAP;
    const { yVals, hover } = perYear.get(yr);
    const yRidge = yVals.map(v => (v === null ? null : (v - gmin) * SCALE + baseY));
    let sx = [], sb = [], sr = [], sh = [];
    let legendShown = false;
    const flush = () => {
      if (sx.length === 0) return;
      if (sx.length === 1) {
        const tempAtPoint = yVals[DOY.indexOf(sx[0])];
        traces.push({ type: "scatter", mode: "markers", name: String(yr), showlegend: !legendShown,
          marker: { color: COLORS[idx], size: 5 }, x: [sx[0]], y: [sr[0]],
          customdata: [[sh[0], tempAtPoint]], hovertemplate: "%{customdata[0]}<br>Mean: %{customdata[1]:.1f}°F<extra></extra>" });
        legendShown = true;
      } else {
        traces.push({ type: "scatter", mode: "lines", x: sx, y: sb, line: { color: "rgba(0,0,0,0)" }, hoverinfo: "skip", showlegend: false });
        traces.push({ type: "scatter", mode: "lines", name: String(yr), showlegend: !legendShown, x: sx, y: sr,
          line: { color: COLORS[idx], width: 1.2, shape: "spline" }, fill: "tonexty", fillcolor: hexToRgba(COLORS[idx], 0.55),
          connectgaps: false, customdata: sr.map((_, j) => [sh[j], yVals[DOY.indexOf(sx[j])]]),
          hovertemplate: "%{customdata[0]}<br>Mean: %{customdata[1]:.1f}°F<extra></extra>" });
        legendShown = true;
      }
      sx = []; sb = []; sr = []; sh = [];
    };
    const DOY = Array.from({ length: 366 }, (_, i) => i + 1);
    for (let j = 0; j < DOY.length; j++) {
      const x = DOY[j], yv = yRidge[j];
      if (yv === null) { flush(); continue; }
      sx.push(x); sb.push(baseY); sr.push(yv); sh.push(hover[j]);
    }
    flush();
  });

  const layout2 = {
    title: { text: `Ridgeline — Daily Mean Temperature by Day‑of‑Year (${years[0]}–${years[years.length-1]})`, x: 0, xanchor: "left" },
    margin: { t: 60, r: 20, b: 40, l: 60 },
    xaxis: { title: "Day of Year", range: [1, 366], tickmode: "array", tickvals: [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335], ticktext: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] },
    yaxis: { title: "", zeroline: false, showgrid: true, tickmode: "array", tickvals: years.map((_, i) => i * GAP), ticktext: years.map(String) },
    hovermode: "x unified", hoverdistance: 1, legend: { orientation: "h", x: 1, y: 1.12, xanchor: "right", yanchor: "bottom" }
  };
  Plotly.newPlot("ridge", traces, layout2, { responsive: true, displaylogo: false });
}

// Precompute per-(year, month) aggregates
function precomputeMonthlyStats(dates, tmax, tmin) {
  const stats = { avg_tmax: {}, avg_tmin: {}, rec_tmax: {}, rec_tmin: {}, years: new Set() };
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i]; const year = Number(d.slice(0,4)); const month = Number(d.slice(5,7));
    const tx = tmax[i]; const tn = tmin[i];
    if (!stats.avg_tmax[year]) { stats.avg_tmax[year] = {}; stats.avg_tmin[year] = {}; stats.rec_tmax[year] = {}; stats.rec_tmin[year] = {}; }
    // Averages: accumulate sum and count
    const axt = stats.avg_tmax[year][month] || { s: 0, c: 0 }; if (tx != null) { axt.s += tx; axt.c += 1; } stats.avg_tmax[year][month] = axt;
    const ait = stats.avg_tmin[year][month] || { s: 0, c: 0 }; if (tn != null) { ait.s += tn; ait.c += 1; } stats.avg_tmin[year][month] = ait;
    // Records
    const rxt = stats.rec_tmax[year][month]; stats.rec_tmax[year][month] = (tx != null) ? (rxt == null ? tx : Math.max(rxt, tx)) : rxt ?? null;
    const rit = stats.rec_tmin[year][month]; stats.rec_tmin[year][month] = (tn != null) ? (rit == null ? tn : Math.min(rit, tn)) : rit ?? null;
    stats.years.add(year);
  }
  // finalize averages (to 1 decimal)
  for (const metric of ["avg_tmax","avg_tmin"]) {
    for (const y of Object.keys(stats[metric])) {
      for (let m = 1; m <= 12; m++) {
        const cell = stats[metric][y][m];
        stats[metric][y][m] = (cell && cell.c > 0) ? Number((cell.s / cell.c).toFixed(1)) : null;
      }
    }
  }
  stats.yearMin = Math.min(...stats.years);
  stats.yearMax = Math.max(...stats.years);
  return stats;
}

const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getSelectedMetric() {
  const el = document.querySelector('input[name="metric"]:checked');
  return el ? el.value : "avg_tmax";
}

function getSummaryRows(stats) {
  const metric = getSelectedMetric();
  const start = Number(document.getElementById("yearStart").value || stats.yearMin);
  const end   = Number(document.getElementById("yearEnd").value   || stats.yearMax);
  const years = [];
  for (let y = Math.max(start, stats.yearMin); y <= Math.min(end, stats.yearMax); y++) years.push(y);
  const rows = years.map(y => [y, ...monthNames.map((_, idx) => (stats[metric][y] ? stats[metric][y][idx+1] ?? null : null))]);
  return { years, rows };
}

let grid = null;
async function renderSummary(stats) {
  const { rows } = getSummaryRows(stats);
  const gridColumns = [ { id: "year", name: "Year", sort: true }, ...monthNames.map(m => ({ id: m, name: m, sort: true, formatter: (cell) => (cell == null ? "—" : Number(cell).toFixed(1)) })) ];
  if (!grid) {
    grid = new gridjs.Grid({ columns: gridColumns, data: rows, sort: true, search: false, pagination: false, fixedHeader: true, style: { table: { 'font-size': '0.95rem' } } });
    grid.render(document.getElementById("summary-grid"));
  } else {
    grid.updateConfig({ data: rows }).forceRender();
  }
}

// Simple CSV download
function downloadCSV(filename, rows) {
  const headers = ["Year", ...monthNames];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const line = r.map(v => (v === null || v === undefined) ? "" : v).join(",");
    lines.push(line);
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.style.display = "none"; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}
