(async () => {
  const csvUrl = "./data/USW00012918_1990_present.csv";
  const resp = await fetch(csvUrl, { cache: "no-store" });
  if (!resp.ok) { document.body.innerHTML = "<p>Data file missing.</p>"; return; }
  const text = await resp.text();
  const parsed = Papa.parse(text, { header: true, dynamicTyping: true });
  const rows = parsed.data.filter(r => r && r.DATE);
  // Prefer ADS fields in °F if units=standard was used; otherwise convert from tenths °C (GHCN convention)
  function tenthsC_to_F(v) { return (v / 10) * 9/5 + 32; }
  const x = [];
  const yMax = [];
  const yMin = [];
  for (const r of rows) {
    const d = r.DATE; // YYYY-MM-DD
    let tmaxF = (r.TMAX_F ?? r.TMAX_f ?? r.tmax_f);
    let tminF = (r.TMIN_F ?? r.TMIN_f ?? r.tmin_f);
    if (tmaxF == null && r.TMAX != null) tmaxF = (typeof r.TMAX === "number") ? tenthsC_to_F(r.TMAX) : null;
    if (tminF == null && r.TMIN != null) tminF = (typeof r.TMIN === "number") ? tenthsC_to_F(r.TMIN) : null;
    // ADS "units=standard" returns TMAX/TMIN already in °F; some exports may name them TMAX, TMIN
    if (tmaxF == null && typeof r.TMAX === "number") tmaxF = r.TMAX;
    if (tminF == null && typeof r.TMIN === "number") tminF = r.TMIN;
    x.push(d);
    yMax.push(Number.isFinite(tmaxF) ? Number(tmaxF) : null);
    yMin.push(Number.isFinite(tminF) ? Number(tminF) : null);
  }
  const traceMax = { type: "scattergl", mode: "lines", name: "TMAX (°F)", x, y: yMax, line: { width: 1.2 } };
  const traceMin = { type: "scattergl", mode: "lines", name: "TMIN (°F)", x, y: yMin, line: { width: 1.2 } };
  Plotly.newPlot("chart", [traceMax, traceMin], {
    title: "Daily High / Low — William P. Hobby (USW00012918)",
    xaxis: { type: "date" }, yaxis: { title: "°F" }, legend: { orientation: "h" }, margin: { t: 48, r: 16, b: 40, l: 56 }
  }, { displaylogo: false, responsive: true });
})();
