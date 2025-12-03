# Retro Meteorology Design System
## Style Guide v1.0

---

## Design Philosophy

### Core Concept: "Analog Precision"
This design system draws from the golden age of meteorological documentation (1960s-1970s), when weather data visualization balanced scientific precision with hand-crafted aesthetics. The philosophy centers on creating a tangible, trustworthy feeling—as if the data was typed on a typewriter, plotted by hand, and filed in a metal cabinet.

### Design Pillars

1. **Authenticity Over Polish**
   - Embrace imperfections that suggest human touch
   - Favor rough edges, slight misalignments, and organic shapes
   - Use filters and effects that simulate age and wear

2. **Data as Documentation**
   - Treat each visualization as an official document
   - Include bureaucratic elements (form numbers, stamps, dates)
   - Create hierarchy through typewriter-style emphasis

3. **Functional Nostalgia**
   - Modern interactivity hidden behind vintage aesthetics
   - Progressive enhancement—works without JavaScript, better with it
   - Respect the constraints of period technology while leveraging modern capabilities

4. **Scientific Gravitas**
   - Every element should feel purposeful and authoritative
   - No decorative elements without functional purpose
   - Dense information display is acceptable, even preferred

---

## Color Palette

### Primary Colors
```css
--burnt-orange: #cc5500;  /* Primary accent, alerts, maxima */
--olive: #6b7334;         /* Secondary accent, minima, subdued data */
--brown: #5c4033;         /* Text, borders, emphasis */
```

### Supporting Colors
```css
--paper: #fdfcf8;         /* Main background for cards/documents */
--bg: #f4f1e8;            /* Page background */
--cream: #fff8dc;         /* Highlights, hover states */
--gold: #daa520;          /* Tertiary accent, special indicators */
--rust: #b7410e;          /* Stamps, warnings, critical values */
--amber: #ffbf00;         /* Interactive hints, annotations */
--grid: #d4cfc0;          /* Grid lines, subtle borders */
```

### Usage Principles
- **Temperature Scaling**: Use gradient from olive (cold) through gold (moderate) to burnt-orange (hot)
- **Depth**: Layer colors from light (paper) to dark (brown) to create physical depth
- **Contrast**: Maintain WCAG AA compliance while preserving aged appearance
- **Meaning**: Warm colors for warnings/maxima, cool colors for safe/minima

### Color Combinations
```css
/* High contrast for data */
.data-point {
  fill: var(--paper);
  stroke: var(--burnt-orange);
  stroke-width: 2;
}

/* Subtle for backgrounds */
.grid-line {
  stroke: var(--grid);
  opacity: 0.5;
}

/* Emphasis through layering */
.important-value {
  background: var(--cream);
  border: 2px solid var(--olive);
  color: var(--brown);
}
```

---

## Typography

### Font Stack
```css
/* Primary: Typewriter */
font-family: 'Courier Prime', 'Courier New', 'Courier', monospace;

/* Display: Condensed Sans */
font-family: 'Bebas Neue', 'Oswald', 'Anton', sans-serif;

/* Technical: System Mono */
font-family: 'JetBrains Mono', 'IBM Plex Mono', 'Consolas', monospace;
```

### Type Scale
```css
/* Display */
h1 { 
  font: 48px 'Bebas Neue'; 
  letter-spacing: 3px;
  text-transform: uppercase;
}

/* Section Headers */
h2 { 
  font: 20px 'Oswald'; 
  letter-spacing: 2px;
  text-transform: uppercase;
}

/* Body Text */
body { 
  font: 12px/1.35 'Courier Prime'; 
}

/* Small Print */
.caption { 
  font: 10px 'Courier Prime'; 
  letter-spacing: 1px;
}

/* Data Labels */
.data-label { 
  font: 11px 'Courier Prime'; 
  text-transform: uppercase;
  letter-spacing: 2px;
}
```

### Typography Rules
1. **All caps for headers** - Mimics official weather bulletins
2. **Wide letter spacing** - Suggests typewriter spacing
3. **No font smoothing** - Preserve pixelated edges
4. **Tabular figures** - For data alignment

---

## Layout Patterns

### Document Structure
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
- **Base Unit**: 20px (graph paper square)
- **Margins**: Multiples of base unit
- **Gutters**: 20px or 25px
- **Max Width**: 1200px (standard paper width at 72dpi)

### Paper Effects
```css
/* Halftone dot pattern */
background-image: radial-gradient(
  circle at 2px 2px, 
  #00000008 1px, 
  transparent 1px
);

/* Graph paper grid */
background: 
  linear-gradient(90deg, var(--grid) 1px, transparent 1px),
  linear-gradient(180deg, var(--grid) 1px, transparent 1px);
background-size: 20px 20px;

/* Aged paper texture */
background: 
  repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    #00000003 10px,
    #00000003 20px
  );
```

---

## Component Patterns

### Official Stamps
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

### Form Numbers
```html
<div class="panel">
  <div class="form-number">FORM WB-1247</div>
  <!-- content -->
</div>
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

---

## Visualization Guidelines

### Chart Aesthetics

#### Line Charts
- **Rough/hand-drawn appearance** using SVG filters
- **Spline interpolation** for organic curves
- **Dotted/dashed lines** for secondary data
- **Halftone fills** between lines

```javascript
// SVG filter for hand-drawn effect
<filter id="roughPaper">
  <feTurbulence type="fractalNoise" baseFrequency="0.04" />
  <feDisplacementMap scale="1" />
</filter>
```

#### Color Scales
- **Sequential**: Olive → Gold → Burnt Orange
- **Diverging**: Olive → Cream → Burnt Orange
- **Categorical**: Rotate through primary palette with distinct hue shifts

#### Grid and Axes
- **Dashed grid lines** at 0.5 opacity
- **Thick axis lines** (2px) in brown
- **Typewriter font** for all labels
- **45° rotation** for crowded x-axis labels

### Interactive Elements

#### Hover States
```css
.hover-target {
  transition: none; /* No smooth transitions */
  cursor: crosshair;
}

.hover-target:hover {
  background: var(--cream);
  outline: 2px solid var(--burnt-orange);
  outline-offset: -1px;
}
```

#### Tooltips
```css
.tooltip {
  background: var(--paper);
  border: 2px solid var(--brown);
  font-size: 11px;
  box-shadow: 3px 3px 0 #00000020;
  /* No rounded corners */
}
```

#### Controls
```css
select, input {
  border: 2px solid var(--olive);
  background: var(--paper);
  font-family: 'Courier Prime';
  padding: 5px 10px;
  /* No border-radius */
}
```

---

## Motion & Animation

### Principles
1. **No smooth transitions** - Instant state changes feel more mechanical
2. **Stepped animations** - Use steps() for typewriter effects
3. **Physical metaphors** - Stamps rotating, papers sliding

### Acceptable Animations
```css
/* Typewriter effect */
@keyframes typewriter {
  from { width: 0; }
  to { width: 100%; }
}
.typewriter {
  animation: typewriter 2s steps(40, end);
}

/* Stamp rotation */
.stamp {
  transition: transform 0.2s ease-out;
}
.stamp:hover {
  transform: rotate(-10deg) scale(1.05);
}

/* NO fade-ins, smooth scrolling, or modern easing */
```

---

## Texture & Depth

### Shadow Hierarchy
```css
/* Subtle - background elements */
box-shadow: 2px 2px 0 #00000008;

/* Standard - cards and panels */
box-shadow: 4px 4px 0 #00000010;

/* Elevated - modals, tooltips */
box-shadow: 6px 6px 0 #00000020;

/* Multiple shadows for paper stack effect */
box-shadow: 
  5px 5px 0 #00000010,
  10px 10px 0 #00000008;
```

### Border Styles
```css
/* Primary borders */
border: 2px solid var(--olive);

/* Strong emphasis */
border: 3px solid var(--brown);

/* Subtle dividers */
border: 1px dashed var(--grid);

/* Data tables */
border-bottom: 1px dashed var(--grid);
border-right: 1px solid #00000010;
```

---

## Responsive Considerations

### Breakpoints
```css
/* Preserve document metaphor */
@media (max-width: 768px) {
  .panel {
    /* Maintain borders and shadows */
    margin: 10px;
    padding: 15px;
  }
  
  .grid-layout {
    /* Stack, don't squeeze */
    grid-template-columns: 1fr;
  }
}
```

### Mobile Adaptations
- **Maintain textures** but reduce complexity
- **Keep typography scale** but adjust letter-spacing
- **Preserve color palette** entirely
- **Simplify interactions** to tap-only

---

## Implementation Notes

### Performance
1. **Textures via CSS** not images when possible
2. **Single SVG sprite** for all decorative elements
3. **CSS containment** for complex panels
4. **Debounced interactions** on data-heavy visualizations

### Accessibility
1. **WCAG AA contrast** minimum (4.5:1 for normal text)
2. **Focus indicators** using thick outline, not color alone
3. **Screen reader hints** for all decorative stamps/numbers
4. **Reduced motion** respects prefers-reduced-motion

### Progressive Enhancement
```css
/* Base experience */
.chart-container {
  background: var(--paper);
  min-height: 300px;
}

/* Enhanced with JS */
.chart-container.loaded {
  /* Interactive features */
}

/* Fallback message */
.chart-container:empty::before {
  content: "Loading weather data...";
  font-style: italic;
  color: var(--olive);
}
```

---

## Anti-Patterns to Avoid

### ❌ Don't Use
- Rounded corners (border-radius)
- Smooth gradients
- Drop shadows with blur
- Sans-serif for body text
- Centered layouts
- Modern easing functions
- Thin weights (<400)
- Pure black (#000000)
- Pure white (#FFFFFF)
- Neon/cyberpunk colors
- Glass morphism
- Smooth animations
- Modern icons
- Emoji

### ✅ Do Use
- Sharp corners
- Halftone patterns
- Offset shadows (no blur)
- Monospace/typewriter fonts
- Left-aligned, document style
- Instant or stepped transitions
- Bold, authentic weights
- Off-black (var(--brown))
- Off-white (var(--paper))
- Earth tones
- Solid backgrounds
- Mechanical transitions
- Text labels
- ASCII symbols

---

## Example Compositions

### Weather Alert
```html
<div class="alert-box">
  <div class="stamp">URGENT</div>
  <h3>SEVERE WEATHER BULLETIN</h3>
  <div class="bulletin-number">NWS-HOU-2024-001</div>
  <p class="alert-text">
    EFFECTIVE IMMEDIATELY UNTIL FURTHER NOTICE...
  </p>
</div>
```

### Data Card
```html
<div class="panel">
  <div class="form-number">FORM WB-1247</div>
  <div class="panel-title">
    ▶ TEMPERATURE OBSERVATIONS
  </div>
  <div class="interactive-note">HOVER FOR DETAILS</div>
  <div class="chart-container">
    <!-- visualization -->
  </div>
  <div class="legend">
    <!-- legend items -->
  </div>
</div>
```

---

## Future Considerations

### Extending the System
When adding new components:
1. Research period-appropriate references (1960s-1970s NOAA documents)
2. Favor authenticity over modern conventions
3. Test with both monochrome and full color
4. Ensure it "feels" physical, not digital
5. Add bureaucratic details (stamps, form numbers, dates)

### Seasonal Variations
Consider subtle seasonal themes:
- **Winter**: Cooler olive tones, frost patterns
- **Summer**: Warmer orange emphasis, sun bleaching effects
- **Storm Season**: Higher contrast, urgent stamps
- **Drought**: Faded colors, cracked texture overlays

### Update Weather Station Details
##Station Details
- **Name**	HOUSTON WILLIAM P HOBBY AIRPORT, TX US
- **Network:ID**	GHCND:USW00012918
- **Latitude/Longitude** 	29.64586°, -95.28212°
- **Elevation** 	13.2 m 

---

*This style guide represents the complete design system for the Retro Meteorology theme. All decisions prioritize authenticity, scientific authority, and the tactile feeling of official weather documentation from the golden age of analog meteorology.*
