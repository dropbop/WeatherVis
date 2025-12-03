/**
 * Houston Weather Station - Main Application
 * Visualizes GHCN-Daily temperature data for USW00012918 (Houston Hobby Airport)
 */

// =============================================================================
// THEME CONFIGURATION
// =============================================================================

const THEME = {
  paper: '#fdfcf8',
  bg: '#f4f1e8',
  grid: '#d4cfc0',
  brown: '#5c4033',
  olive: '#6b7334',
  orange: '#cc5500',
  gold: '#daa520',
  cream: '#fff8dc',
  rust: '#b7410e',
  fontBody: "Courier Prime, 'Courier New', monospace",
  fontTitle: "Bebas Neue, Oswald, sans-serif"
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function asNumber(v) {
  const n = typeof v === 'number' ? v : v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : null;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function formatDateOrdinal(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  const month = d.toLocaleString('en-US', { timeZone: 'UTC', month: 'long' });
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  return `${month} ${day}${ordinal(day)}, ${year}`;
}

function formatDateShort(iso) {
  if (!iso) return '';
  return String(iso).slice(0, 10);
}

function formatCentral(isoLike) {
  if (!isoLike) return '';
  const d = new Date(String(isoLike));
  if (isNaN(d)) return String(isoLike);
  return d.toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

function dayOfYearISO(isoDate) {
  const dt = new Date(isoDate + 'T00:00:00Z');
  const start = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.floor((dt - start) / 86400000) + 1;
}

function isoFromYearAndDoy(year, doy) {
  const start = new Date(Date.UTC(year, 0, 1));
  start.setUTCDate(start.getUTCDate() + (doy - 1));
  return start.toISOString().slice(0, 10);
}

function isLeap(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function interpHex(c1, c2, t) {
  const a = parseInt(c1.slice(1), 16);
  const b = parseInt(c2.slice(1), 16);
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const int = parseInt(h, 16);
  const r = (int >> 16) & 255, g = (int >> 8) & 255, b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

// =============================================================================
// DOM HELPERS
// =============================================================================

function setLoading(elementId, loading) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (loading) {
    el.classList.add('loading');
    el.innerHTML = '';
  } else {
    el.classList.remove('loading');
  }
}

function setError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.classList.remove('loading');
  el.classList.add('error');
  el.dataset.error = message;
  el.innerHTML = `<div style="padding:20px;color:var(--rust);text-align:center;">${message}</div>`;
}

function setText(elementId, text) {
  const el = document.getElementById(elementId);
  if (el) el.textContent = text;
}

// =============================================================================
// DATA LOADING
// =============================================================================

async function loadWeatherData() {
  const csvUrl = './data/USW00012918_1990_present.csv';
  const resp = await fetch(csvUrl, { cache: 'no-store' });
  
  if (!resp.ok) {
    throw new Error(`Failed to load data: ${resp.status}`);
  }
  
  const text = await resp.text();
  const parsed = Papa.parse(text, { header: true, dynamicTyping: true });
  const rows = parsed.data.filter(r => r && r.DATE);
  
  if (rows.length === 0) {
    throw new Error('No valid data rows found');
  }
  
  // Extract arrays
  const dates = [];
  const tmax = [];
  const tmin = [];
  const prcp = [];

  for (const r of rows) {
    const d = String(r.DATE).slice(0, 10);
    let tmaxF = asNumber(r.TMAX);
    let tminF = asNumber(r.TMIN);
    let prcpVal = asNumber(r.PRCP);

    // Fallback to alternative field names
    if (tmaxF == null) tmaxF = asNumber(r.TMAX_F ?? r.TMAX_f);
    if (tminF == null) tminF = asNumber(r.TMIN_F ?? r.TMIN_f);

    dates.push(d);
    tmax.push(tmaxF);
    tmin.push(tminF);
    prcp.push(prcpVal);
  }

  return { dates, tmax, tmin, prcp };
}

async function loadMetadata() {
  try {
    const res = await fetch('./data/derived/metadata.json', { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (_) {
    // Metadata is optional
  }
  return null;
}

// =============================================================================
// STATISTICS
// =============================================================================

function computeOverallStats(dates, tmax, tmin) {
  let recordHigh = -Infinity;
  let recordHighDate = null;
  let recordLow = Infinity;
  let recordLowDate = null;
  let sumMean = 0;
  let countMean = 0;
  let dataPoints = 0;
  
  for (let i = 0; i < dates.length; i++) {
    const tx = tmax[i];
    const tn = tmin[i];
    
    if (tx != null) {
      dataPoints++;
      if (tx > recordHigh) {
        recordHigh = tx;
        recordHighDate = dates[i];
      }
    }
    
    if (tn != null) {
      if (tn < recordLow) {
        recordLow = tn;
        recordLowDate = dates[i];
      }
    }
    
    if (tx != null && tn != null) {
      sumMean += (tx + tn) / 2;
      countMean++;
    }
  }
  
  return {
    recordHigh: recordHigh !== -Infinity ? recordHigh : null,
    recordHighDate,
    recordLow: recordLow !== Infinity ? recordLow : null,
    recordLowDate,
    meanTemp: countMean > 0 ? (sumMean / countMean) : null,
    dataPoints,
    minDate: dates[0],
    maxDate: dates[dates.length - 1]
  };
}

function precomputeMonthlyStats(dates, tmax, tmin) {
  const stats = {
    avg_tmax: {},
    avg_tmin: {},
    rec_tmax: {},
    rec_tmin: {},
    years: new Set()
  };
  
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    const year = Number(d.slice(0, 4));
    const month = Number(d.slice(5, 7));
    const tx = tmax[i];
    const tn = tmin[i];
    
    if (!stats.avg_tmax[year]) {
      stats.avg_tmax[year] = {};
      stats.avg_tmin[year] = {};
      stats.rec_tmax[year] = {};
      stats.rec_tmin[year] = {};
    }
    
    // Averages: accumulate sum and count
    const axt = stats.avg_tmax[year][month] || { s: 0, c: 0 };
    if (tx != null) { axt.s += tx; axt.c += 1; }
    stats.avg_tmax[year][month] = axt;
    
    const ait = stats.avg_tmin[year][month] || { s: 0, c: 0 };
    if (tn != null) { ait.s += tn; ait.c += 1; }
    stats.avg_tmin[year][month] = ait;
    
    // Records
    const rxt = stats.rec_tmax[year][month];
    stats.rec_tmax[year][month] = tx != null ? (rxt == null ? tx : Math.max(rxt, tx)) : rxt ?? null;
    
    const rit = stats.rec_tmin[year][month];
    stats.rec_tmin[year][month] = tn != null ? (rit == null ? tn : Math.min(rit, tn)) : rit ?? null;
    
    stats.years.add(year);
  }
  
  // Finalize averages
  for (const metric of ['avg_tmax', 'avg_tmin']) {
    for (const y of Object.keys(stats[metric])) {
      for (let m = 1; m <= 12; m++) {
        const cell = stats[metric][y][m];
        stats[metric][y][m] = cell && cell.c > 0 ? Number((cell.s / cell.c).toFixed(1)) : null;
      }
    }
  }
  
  stats.yearMin = Math.min(...stats.years);
  stats.yearMax = Math.max(...stats.years);
  
  return stats;
}

// =============================================================================
// UI UPDATES
// =============================================================================

function updateStatCards(stats) {
  // Record High
  setText('statRecordHigh', stats.recordHigh != null ? stats.recordHigh.toFixed(1) : '--');
  setText('statRecordHighDate', stats.recordHighDate ? formatDateOrdinal(stats.recordHighDate) : '');
  
  // Record Low
  setText('statRecordLow', stats.recordLow != null ? stats.recordLow.toFixed(1) : '--');
  setText('statRecordLowDate', stats.recordLowDate ? formatDateOrdinal(stats.recordLowDate) : '');
  
  // Mean Temp
  setText('statMeanTemp', stats.meanTemp != null ? stats.meanTemp.toFixed(1) : '--');
  
  // Data Points
  setText('statDataPoints', stats.dataPoints.toLocaleString());
  setText('statDateRange', `${formatDateShort(stats.minDate)} → ${formatDateShort(stats.maxDate)}`);
}

async function updateDataStatus(minDate, maxDate, metadata) {
  const el = document.getElementById('dataStatus');
  if (!el) return;

  let text = `Data: ${formatDateShort(minDate)} → ${formatDateShort(maxDate)}`;

  if (metadata && metadata.generatedAt) {
    text += ` · Updated: ${formatCentral(metadata.generatedAt)}`;
  }

  el.textContent = text;
}

// =============================================================================
// ON THIS DAY
// =============================================================================

function computeOnThisDayStats(dates, tmax, tmin) {
  const now = new Date();
  let month = now.getMonth() + 1;
  let day = now.getDate();

  // Handle Feb 29 - use Feb 28 data instead
  if (month === 2 && day === 29) {
    day = 28;
  }

  const mmdd = String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');

  let recordHigh = -Infinity;
  let recordHighYear = null;
  let recordLow = Infinity;
  let recordLowYear = null;
  let sumHigh = 0;
  let countHigh = 0;
  let sumLow = 0;
  let countLow = 0;

  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    const dateMmdd = d.slice(5, 10);
    if (dateMmdd !== mmdd) continue;

    const year = Number(d.slice(0, 4));
    const tx = tmax[i];
    const tn = tmin[i];

    if (tx != null) {
      sumHigh += tx;
      countHigh++;
      if (tx > recordHigh) {
        recordHigh = tx;
        recordHighYear = year;
      }
    }

    if (tn != null) {
      sumLow += tn;
      countLow++;
      if (tn < recordLow) {
        recordLow = tn;
        recordLowYear = year;
      }
    }
  }

  return {
    month,
    day,
    recordHigh: recordHigh !== -Infinity ? recordHigh : null,
    recordHighYear,
    recordLow: recordLow !== Infinity ? recordLow : null,
    recordLowYear,
    avgHigh: countHigh > 0 ? sumHigh / countHigh : null,
    avgLow: countLow > 0 ? sumLow / countLow : null,
    yearCount: countHigh
  };
}

function updateOnThisDay(stats) {
  // Format date for title
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = monthNames[stats.month - 1];
  const dayOrd = stats.day + ordinal(stats.day);

  setText('onThisDayTitle', `ON THIS DAY — ${monthName.toUpperCase()} ${dayOrd.toUpperCase()}`);

  // Record High
  setText('otdRecordHigh', stats.recordHigh != null ? stats.recordHigh.toFixed(1) : '--');
  setText('otdRecordHighYear', stats.recordHighYear ? String(stats.recordHighYear) : '');

  // Record Low
  setText('otdRecordLow', stats.recordLow != null ? stats.recordLow.toFixed(1) : '--');
  setText('otdRecordLowYear', stats.recordLowYear ? String(stats.recordLowYear) : '');

  // Averages
  setText('otdAvgHigh', stats.avgHigh != null ? stats.avgHigh.toFixed(1) : '--');
  setText('otdAvgLow', stats.avgLow != null ? stats.avgLow.toFixed(1) : '--');
  setText('otdAvgYears', stats.yearCount > 0 ? `${stats.yearCount}-yr avg` : '');
}

// =============================================================================
// CHARTS
// =============================================================================

function buildTimeSeriesChart(dates, tmax, tmin) {
  const hoverDates = dates.map(formatDateOrdinal);
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];
  
  // Default view: 2020 to present (or all data if earlier)
  const DEFAULT_START = '2020-01-01';
  const initialStart = maxDate >= DEFAULT_START && minDate <= DEFAULT_START ? DEFAULT_START : minDate;
  
  const traceMax = {
    type: 'scatter',
    mode: 'lines',
    name: 'HIGH',
    x: dates,
    y: tmax,
    customdata: hoverDates,
    line: { color: THEME.orange, width: 1.5, shape: 'spline' },
    connectgaps: false,
    hovertemplate: '%{customdata}<br>High: %{y:.1f}°F<extra></extra>'
  };
  
  const traceMin = {
    type: 'scatter',
    mode: 'lines',
    name: 'LOW',
    x: dates,
    y: tmin,
    customdata: hoverDates,
    line: { color: THEME.olive, width: 1.5, shape: 'spline', dash: 'dot' },
    connectgaps: false,
    hovertemplate: '%{customdata}<br>Low: %{y:.1f}°F<extra></extra>'
  };
  
  const layout = {
    uirevision: 'timeseries',
    font: { color: THEME.brown, family: THEME.fontBody, size: 10 },
    paper_bgcolor: THEME.paper,
    plot_bgcolor: THEME.paper,
    height: 500,
    margin: { t: 20, r: 20, b: 60, l: 50 },
    legend: {
      orientation: 'h',
      x: 1,
      y: 1.02,
      xanchor: 'right',
      yanchor: 'bottom',
      bgcolor: THEME.paper,
      bordercolor: THEME.brown,
      borderwidth: 1,
      font: { size: 11 }
    },
    xaxis: {
      type: 'date',
      autorange: false,
      range: [initialStart, maxDate],
      gridcolor: THEME.grid,
      linecolor: THEME.brown,
      zeroline: false,
      rangeslider: {
        visible: true,
        range: [minDate, maxDate],
        bgcolor: THEME.bg,
        bordercolor: THEME.olive,
        borderwidth: 1
      }
    },
    yaxis: {
      title: { text: '°F', font: { size: 11 } },
      gridcolor: THEME.grid,
      linecolor: THEME.brown,
      zeroline: false
    },
    hovermode: 'x unified',
    hoverlabel: {
      bgcolor: THEME.cream,
      bordercolor: THEME.brown,
      font: { family: THEME.fontBody, size: 11 }
    }
  };
  
  setLoading('chart', false);
  Plotly.newPlot('chart', [traceMax, traceMin], layout, {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d']
  });
  
  // Wire up range buttons
  const btnDefault = document.getElementById('btnRangeDefault');
  const btnAll = document.getElementById('btnRangeAll');
  
  if (btnDefault) {
    btnDefault.addEventListener('click', () => {
      Plotly.relayout('chart', { 'xaxis.range': [initialStart, maxDate] });
    });
  }
  
  if (btnAll) {
    btnAll.addEventListener('click', () => {
      Plotly.relayout('chart', { 'xaxis.range': [minDate, maxDate] });
    });
  }
}

function buildRidgelineChart(dates, tmax, tmin, years) {
  function meanTemp(tx, tn) {
    if (tx != null && tn != null) return (tx + tn) / 2;
    if (tx != null) return tx;
    if (tn != null) return tn;
    return null;
  }
  
  function yearSeries(year) {
    const yVals = new Array(366).fill(null);
    const hover = new Array(366).fill(null);
    
    for (let i = 0; i < dates.length; i++) {
      const ds = dates[i];
      const y = Number(ds.slice(0, 4));
      if (y !== year) continue;
      
      const tm = meanTemp(tmax[i], tmin[i]);
      if (tm === null) continue;
      
      const natDOY = dayOfYearISO(ds);
      // Canonical DOY: align non-leap years to leap year calendar
      const cDOY = isLeap(year) ? natDOY : (natDOY >= 60 ? natDOY + 1 : natDOY);
      if (cDOY < 1 || cDOY > 366) continue;
      
      yVals[cDOY - 1] = tm;
      const actualDOY = isLeap(year) ? cDOY : (cDOY > 60 ? cDOY - 1 : cDOY);
      hover[cDOY - 1] = formatDateOrdinal(isoFromYearAndDoy(year, actualDOY));
    }
    
    return { yVals, hover };
  }
  
  // Compute data for each year
  const perYear = new Map();
  let gmin = Infinity, gmax = -Infinity;
  
  for (const yr of years) {
    const obj = yearSeries(yr);
    perYear.set(yr, obj);
    for (const v of obj.yVals) {
      if (v === null) continue;
      if (v < gmin) gmin = v;
      if (v > gmax) gmax = v;
    }
  }
  
  if (!isFinite(gmin) || !isFinite(gmax)) {
    setError('ridge', `No data for ${years[0]}–${years[years.length - 1]}`);
    return;
  }
  
  // Update title
  setText('ridgeTitle', `RIDGELINE — DAILY MEAN BY DAY-OF-YEAR (${years[0]}–${years[years.length - 1]})`);
  
  // Build traces
  const GAP = 40;
  const SCALE = 0.5;
  const COLORS = years.map((_, i) => interpHex(THEME.olive, THEME.orange, years.length === 1 ? 0.5 : i / (years.length - 1)));
  const DOY = Array.from({ length: 366 }, (_, i) => i + 1);
  const traces = [];
  
  years.forEach((yr, idx) => {
    const baseY = idx * GAP;
    const { yVals, hover } = perYear.get(yr);
    const yRidge = yVals.map(v => v === null ? null : (v - gmin) * SCALE + baseY);
    
    let sx = [], sb = [], sr = [], sh = [];
    let legendShown = false;
    
    const flush = () => {
      if (sx.length === 0) return;
      
      if (sx.length === 1) {
        // Single point - use marker
        traces.push({
          type: 'scatter',
          mode: 'markers',
          name: String(yr),
          showlegend: !legendShown,
          marker: { color: COLORS[idx], size: 5 },
          x: [sx[0]],
          y: [sr[0]],
          customdata: [[sh[0], yVals[sx[0] - 1]]],
          hovertemplate: '%{customdata[0]}<br>Mean: %{customdata[1]:.1f}°F<extra></extra>'
        });
      } else {
        // Baseline trace (invisible)
        traces.push({
          type: 'scatter',
          mode: 'lines',
          x: sx,
          y: sb,
          line: { color: 'rgba(0,0,0,0)' },
          hoverinfo: 'skip',
          showlegend: false
        });
        
        // Ridge trace with fill
        traces.push({
          type: 'scatter',
          mode: 'lines',
          name: String(yr),
          showlegend: !legendShown,
          x: sx,
          y: sr,
          line: { color: COLORS[idx], width: 1.2, shape: 'spline' },
          fill: 'tonexty',
          fillcolor: hexToRgba(COLORS[idx], 0.4),
          connectgaps: false,
          customdata: sr.map((_, j) => [sh[j], yVals[sx[j] - 1]]),
          hovertemplate: '%{customdata[0]}<br>Mean: %{customdata[1]:.1f}°F<extra></extra>'
        });
      }
      
      legendShown = true;
      sx = []; sb = []; sr = []; sh = [];
    };
    
    for (let j = 0; j < DOY.length; j++) {
      const x = DOY[j];
      const yv = yRidge[j];
      if (yv === null) {
        flush();
        continue;
      }
      sx.push(x);
      sb.push(baseY);
      sr.push(yv);
      sh.push(hover[j]);
    }
    flush();
  });
  
  const layout = {
    font: { color: THEME.brown, family: THEME.fontBody, size: 10 },
    paper_bgcolor: THEME.paper,
    plot_bgcolor: THEME.paper,
    height: Math.max(400, years.length * GAP + 120),
    margin: { t: 20, r: 20, b: 40, l: 50 },
    legend: {
      orientation: 'h',
      x: 1,
      y: 1.02,
      xanchor: 'right',
      yanchor: 'bottom',
      bgcolor: THEME.paper,
      bordercolor: THEME.brown,
      borderwidth: 1,
      font: { size: 10 }
    },
    xaxis: {
      title: { text: 'DAY OF YEAR', font: { size: 10 } },
      range: [1, 366],
      tickmode: 'array',
      tickvals: [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335],
      ticktext: MONTH_NAMES,
      gridcolor: THEME.grid,
      linecolor: THEME.brown,
      zeroline: false
    },
    yaxis: {
      zeroline: false,
      showgrid: false,
      tickmode: 'array',
      tickvals: years.map((_, i) => i * GAP),
      ticktext: years.map(String),
      linecolor: THEME.brown
    },
    hovermode: 'x unified',
    hoverlabel: {
      bgcolor: THEME.cream,
      bordercolor: THEME.brown,
      font: { family: THEME.fontBody, size: 11 }
    }
  };
  
  setLoading('ridge', false);
  Plotly.newPlot('ridge', traces, layout, {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d']
  });
}

// =============================================================================
// PRECIPITATION CALENDAR
// =============================================================================

function getPrecipClass(value) {
  if (value === null) return 'precip-missing';
  if (value === 0) return 'precip-0';
  if (value < 0.1) return 'precip-1';
  if (value < 0.5) return 'precip-2';
  if (value < 2.0) return 'precip-3';
  return 'precip-4';
}

function buildPrecipCalendar(dates, prcp, year, years) {
  const container = document.getElementById('precip-calendar');
  const tooltip = document.getElementById('calendar-tooltip');
  if (!container) return;

  // Build lookup map for this year's data
  const dataMap = new Map();
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    const y = Number(d.slice(0, 4));
    if (y === year) {
      dataMap.set(d, prcp[i]);
    }
  }

  // Calculate first day of year and total days
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const startDow = jan1.getUTCDay(); // 0 = Sunday
  const daysInYear = isLeap(year) ? 366 : 365;
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Clear container
  container.innerHTML = '';

  // Create wrapper for horizontal scroll on mobile
  const wrapper = document.createElement('div');
  wrapper.className = 'calendar-wrapper';

  // Inner container to keep months + grid aligned together when centered
  const inner = document.createElement('div');
  inner.className = 'calendar-inner';

  // Cell dimensions for positioning calculations
  const cellSize = 14;
  const cellGap = 3;
  const cellUnit = cellSize + cellGap;

  // Calculate week column for first day of each month
  const monthWeekStarts = [];
  for (let m = 0; m < 12; m++) {
    const firstOfMonth = new Date(Date.UTC(year, m, 1));
    const dayOfYear = Math.floor((firstOfMonth - jan1) / 86400000);
    const weekCol = Math.floor((startDow + dayOfYear) / 7);
    monthWeekStarts.push(weekCol);
  }

  // Month labels with calculated positions
  const monthsRow = document.createElement('div');
  monthsRow.className = 'calendar-months';
  MONTH_NAMES.forEach((m, i) => {
    const span = document.createElement('span');
    span.textContent = m;
    span.style.left = (monthWeekStarts[i] * cellUnit) + 'px';
    monthsRow.appendChild(span);
  });
  inner.appendChild(monthsRow);

  // Calendar container (days labels + grid)
  const calContainer = document.createElement('div');
  calContainer.className = 'calendar-container';

  // Day of week labels
  const daysCol = document.createElement('div');
  daysCol.className = 'calendar-days';
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(d => {
    const span = document.createElement('span');
    span.textContent = d;
    daysCol.appendChild(span);
  });
  calContainer.appendChild(daysCol);

  // Grid
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  // Add empty cells for days before Jan 1
  for (let i = 0; i < startDow; i++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    cell.style.visibility = 'hidden';
    grid.appendChild(cell);
  }

  // Add cells for each day of the year
  for (let dayNum = 1; dayNum <= daysInYear; dayNum++) {
    const date = new Date(Date.UTC(year, 0, dayNum));
    const isoDate = date.toISOString().slice(0, 10);
    const prcpValue = dataMap.get(isoDate);

    const cell = document.createElement('div');
    cell.className = 'calendar-cell';

    // Check if this is a future date
    if (isoDate > todayStr) {
      cell.classList.add('future');
    } else {
      cell.classList.add(getPrecipClass(prcpValue));
    }

    cell.dataset.date = isoDate;
    cell.dataset.prcp = prcpValue !== null ? prcpValue : '';

    grid.appendChild(cell);
  }

  calContainer.appendChild(grid);
  inner.appendChild(calContainer);
  wrapper.appendChild(inner);
  container.appendChild(wrapper);

  // Tooltip handling
  grid.addEventListener('mouseover', (e) => {
    const cell = e.target.closest('.calendar-cell');
    if (!cell || !cell.dataset.date) return;

    const dateStr = cell.dataset.date;
    const prcpStr = cell.dataset.prcp;

    let text = formatDateOrdinal(dateStr);
    if (cell.classList.contains('future')) {
      text += '<br>Future date';
    } else if (prcpStr === '') {
      text += '<br>No data';
    } else {
      text += `<br>Precip: ${Number(prcpStr).toFixed(2)}"`;
    }

    tooltip.innerHTML = text;
    tooltip.classList.add('visible');
  });

  grid.addEventListener('mousemove', (e) => {
    tooltip.style.left = (e.clientX + 12) + 'px';
    tooltip.style.top = (e.clientY + 12) + 'px';
  });

  grid.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget || !e.relatedTarget.closest('.calendar-grid')) {
      tooltip.classList.remove('visible');
    }
  });

  // Populate year selector if not already done
  const yearSelect = document.getElementById('precip-year');
  if (yearSelect && yearSelect.options.length === 0) {
    years.slice().reverse().forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === year) opt.selected = true;
      yearSelect.appendChild(opt);
    });
  }
}

// =============================================================================
// SUMMARY TABLE
// =============================================================================

let summaryGrid = null;

function getSelectedMetric() {
  const el = document.querySelector('input[name="metric"]:checked');
  return el ? el.value : 'avg_tmax';
}

function getSummaryRows(stats) {
  const metric = getSelectedMetric();
  const start = Number(document.getElementById('yearStart').value) || stats.yearMin;
  const end = Number(document.getElementById('yearEnd').value) || stats.yearMax;
  
  const years = [];
  for (let y = Math.max(start, stats.yearMin); y <= Math.min(end, stats.yearMax); y++) {
    years.push(y);
  }
  
  const rows = years.map(y => [
    y,
    ...MONTH_NAMES.map((_, idx) => stats[metric][y] ? stats[metric][y][idx + 1] ?? null : null)
  ]);
  
  return { years, rows };
}

function renderSummary(stats) {
  const { rows } = getSummaryRows(stats);
  
  const columns = [
    { id: 'year', name: 'YEAR', sort: true },
    ...MONTH_NAMES.map(m => ({
      id: m,
      name: m.toUpperCase(),
      sort: true,
      formatter: cell => cell == null ? '—' : Number(cell).toFixed(1)
    }))
  ];
  
  if (!summaryGrid) {
    summaryGrid = new gridjs.Grid({
      columns,
      data: rows,
      sort: true,
      search: false,
      pagination: false,
      fixedHeader: true
    });
    summaryGrid.render(document.getElementById('summary-grid'));
  } else {
    summaryGrid.updateConfig({ data: rows }).forceRender();
  }
}

function downloadCSV(filename, rows) {
  const headers = ['Year', ...MONTH_NAMES];
  const lines = [headers.join(',')];
  
  for (const r of rows) {
    const line = r.map(v => v == null ? '' : v).join(',');
    lines.push(line);
  }
  
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// =============================================================================
// MAIN INITIALIZATION
// =============================================================================

(async function main() {
  try {
    // Load data
    const [data, metadata] = await Promise.all([
      loadWeatherData(),
      loadMetadata()
    ]);

    const { dates, tmax, tmin, prcp } = data;

    // Compute statistics
    const overallStats = computeOverallStats(dates, tmax, tmin);
    const monthlyStats = precomputeMonthlyStats(dates, tmax, tmin);

    // Get year range
    const years = [...new Set(dates.map(d => Number(d.slice(0, 4))))].sort((a, b) => a - b);

    // Default ridgeline range: current year and previous 2 years
    const currentYear = new Date().getFullYear();
    const ridgeStart = Math.max(currentYear - 2, years[0]);
    const ridgeEnd = Math.min(currentYear, years[years.length - 1]);
    const ridgeYears = years.filter(y => y >= ridgeStart && y <= ridgeEnd);

    // Summary table range: 2020 to present (wider than ridgeline)
    const summaryStart = Math.max(2020, years[0]);
    const summaryEnd = ridgeEnd;

    // Update UI
    updateStatCards(overallStats);
    updateDataStatus(overallStats.minDate, overallStats.maxDate, metadata);

    // On This Day panel
    const onThisDayStats = computeOnThisDayStats(dates, tmax, tmin);
    updateOnThisDay(onThisDayStats);

    // Set default year inputs for summary table
    document.getElementById('yearStart').value = summaryStart;
    document.getElementById('yearEnd').value = summaryEnd;

    // Build charts
    buildTimeSeriesChart(dates, tmax, tmin);
    buildRidgelineChart(dates, tmax, tmin, ridgeYears);

    // Build precipitation calendar (default to current year or most recent)
    const precipYear = years.includes(currentYear) ? currentYear : years[years.length - 1];
    buildPrecipCalendar(dates, prcp, precipYear, years);

    // Wire up precipitation year selector
    document.getElementById('precip-year').addEventListener('change', (e) => {
      buildPrecipCalendar(dates, prcp, Number(e.target.value), years);
    });

    // Render summary table
    renderSummary(monthlyStats);

    // Wire up summary controls
    document.getElementById('btnApply').addEventListener('click', () => renderSummary(monthlyStats));

    document.querySelectorAll('input[name="metric"]').forEach(radio => {
      radio.addEventListener('change', () => renderSummary(monthlyStats));
    });

    document.getElementById('btnDownload').addEventListener('click', () => {
      const { rows } = getSummaryRows(monthlyStats);
      const metric = getSelectedMetric();
      const metricLabel = {
        avg_tmax: 'avg_high',
        avg_tmin: 'avg_low',
        rec_tmax: 'record_high',
        rec_tmin: 'record_low'
      }[metric] || metric;
      downloadCSV(`houston_weather_${metricLabel}.csv`, rows);
    });

  } catch (err) {
    console.error('Failed to initialize:', err);
    setError('chart', `Error: ${err.message}`);
    setError('ridge', 'Unable to load data');
  }
})();
