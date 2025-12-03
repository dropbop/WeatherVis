# Retro Meteorology Style Guide

Visual language inspired by 1960s–70s weather bureau documentation. Typewritten forms, graph paper, official stamps, dense data displays.

---

## Color Palette

### Primary
```css
--burnt-orange: #cc5500;  /* Accent, alerts, maxima */
--olive: #6b7334;         /* Secondary, minima, subdued */
--brown: #5c4033;         /* Text, borders */
```

### Supporting
```css
--paper: #fdfcf8;         /* Card backgrounds */
--bg: #f4f1e8;            /* Page background */
--cream: #fff8dc;         /* Highlights, hover states */
--gold: #daa520;          /* Tertiary accent */
--rust: #b7410e;          /* Stamps, warnings */
--amber: #ffbf00;         /* Annotations */
--grid: #d4cfc0;          /* Grid lines, subtle borders */
```

### Usage
- Temperature scale: olive (cold) → gold (moderate) → burnt-orange (hot)
- Maintain WCAG AA contrast (4.5:1 minimum)
- Warm colors for warnings/maxima, cool for safe/minima

---

## Typography

### Font Stack
```css
/* Primary: Typewriter */
font-family: 'Courier Prime', 'Courier New', monospace;

/* Display: Condensed Sans */
font-family: 'Bebas Neue', 'Oswald', sans-serif;

/* Technical */
font-family: 'JetBrains Mono', 'IBM Plex Mono', monospace;
```

### Scale
```css
h1 { font: 48px 'Bebas Neue'; letter-spacing: 3px; text-transform: uppercase; }
h2 { font: 20px 'Oswald'; letter-spacing: 2px; text-transform: uppercase; }
body { font: 12px/1.35 'Courier Prime'; }
.caption { font: 10px 'Courier Prime'; letter-spacing: 1px; }
.data-label { font: 11px 'Courier Prime'; text-transform: uppercase; letter-spacing: 2px; }
```

### Rules
- All caps for headers
- Wide letter-spacing throughout
- Tabular figures for data alignment

---

## Layout

### Panels
```css
.panel {
  background: var(--paper);
  border: 2px solid var(--olive);
  padding: 25px;
  position: relative;
  box-shadow: 4px 4px 0 #00000008;
}
```

### Grid System
- Base unit: 20px
- Gutters: 20px or 25px
- Max width: 1200px

### Paper Textures
```css
/* Halftone */
background-image: radial-gradient(circle at 2px 2px, #00000008 1px, transparent 1px);

/* Graph paper */
background: 
  linear-gradient(90deg, var(--grid) 1px, transparent 1px),
  linear-gradient(180deg, var(--grid) 1px, transparent 1px);
background-size: 20px 20px;
```

---

## Components

### Stamps
```css
.stamp {
  border: 3px solid var(--rust);
  border-radius: 50%;
  transform: rotate(-15deg);
  opacity: 0.3;
  text-align: center;
  font-weight: bold;
  letter-spacing: 1px;
}
```

### Data Tables
```css
.data-table {
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12px;
}

.data-table thead {
  background: var(--olive);
  color: var(--cream);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.data-table td {
  border-bottom: 1px dashed var(--grid);
  border-right: 1px solid #00000010;
}

.data-table tbody tr:nth-child(even) {
  background: #00000005;
}
```

### Interactive Hints
```css
.interactive-note {
  position: absolute;
  top: 10px;
  right: 10px;
  background: var(--amber);
  color: var(--brown);
  padding: 3px 8px;
  font-size: 9px;
  letter-spacing: 1px;
  transform: rotate(2deg);
}
```

---

## Charts & Visualization

### Line Charts
- Rough/hand-drawn appearance via SVG filters
- Spline interpolation for organic curves
- Dotted/dashed lines for secondary data
- Halftone fills between lines

```xml
<filter id="roughPaper">
  <feTurbulence type="fractalNoise" baseFrequency="0.04" />
  <feDisplacementMap scale="1" />
</filter>
```

### Color Scales
- Sequential: Olive → Gold → Burnt Orange
- Diverging: Olive → Cream → Burnt Orange

### Axes & Grid
- Dashed grid lines at 0.5 opacity
- 2px axis lines in brown
- Typewriter font for labels
- 45° rotation for crowded x-axis

### Hover & Tooltips
```css
.hover-target {
  transition: none;
  cursor: crosshair;
}

.hover-target:hover {
  background: var(--cream);
  outline: 2px solid var(--burnt-orange);
  outline-offset: -1px;
}

.tooltip {
  background: var(--paper);
  border: 2px solid var(--brown);
  font-size: 11px;
  box-shadow: 3px 3px 0 #00000020;
}
```

---

## Animation

Keep it mechanical. Avoid smooth transitions.

```css
/* Typewriter effect */
@keyframes typewriter {
  from { width: 0; }
  to { width: 100%; }
}
.typewriter {
  animation: typewriter 2s steps(40, end);
}

/* Stamp hover */
.stamp {
  transition: transform 0.2s ease-out;
}
.stamp:hover {
  transform: rotate(-10deg) scale(1.05);
}
```

---

## Shadows & Borders

### Shadows (no blur)
```css
/* Subtle */
box-shadow: 2px 2px 0 #00000008;

/* Standard */
box-shadow: 4px 4px 0 #00000010;

/* Elevated */
box-shadow: 6px 6px 0 #00000020;

/* Stacked paper */
box-shadow: 5px 5px 0 #00000010, 10px 10px 0 #00000008;
```

### Borders
```css
border: 2px solid var(--olive);        /* Primary */
border: 3px solid var(--brown);        /* Strong */
border: 1px dashed var(--grid);        /* Subtle */
```

---

## Responsive

```css
@media (max-width: 768px) {
  .panel {
    margin: 10px;
    padding: 15px;
  }
  
  .grid-layout {
    grid-template-columns: 1fr;
  }
}
```

- Maintain textures, reduce complexity
- Preserve color palette
- Simplify to tap interactions

---

## Implementation

### Performance
- CSS textures over images
- Single SVG sprite for decorative elements
- Debounced interactions on heavy visualizations

### Accessibility
- WCAG AA contrast minimum
- Thick outline focus indicators
- Screen reader hints for decorative elements
- Respect `prefers-reduced-motion`

---

## Do / Don't

**Avoid:**
- Rounded corners
- Smooth gradients
- Blurred shadows
- Sans-serif body text
- Centered layouts
- Modern easing
- Thin font weights (<400)
- Pure black/white (#000, #FFF)
- Neon colors, glassmorphism
- Smooth animations
- Emoji or modern icon sets

**Use:**
- Sharp corners
- Halftone patterns
- Hard offset shadows
- Monospace fonts
- Left-aligned layouts
- Instant or stepped transitions
- Bold weights
- Off-black (--brown), off-white (--paper)
- Earth tones
- Text labels, ASCII symbols

---

## Station Reference

- **Station**: Houston William P Hobby Airport, TX US
- **ID**: GHCND:USW00012918
- **Coordinates**: 29.64586°, -95.28212°
- **Elevation**: 13.2 m
