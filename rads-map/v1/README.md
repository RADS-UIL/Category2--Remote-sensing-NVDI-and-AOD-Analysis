# RADS shared map template — v1

One layout for every RADS Leaflet map that is embedded as an iframe on rads.org.
The map fills the iframe. A title chip sits top left, Leaflet's zoom control sits under it,
and one collapsible **Layers** panel sits top right. Method notes go behind an **i** button.

```
rads-map/v1/
  rads-map.css   layout and house style (flat, white panels, RADS red #D01C24)
  rads-map.js    builds the chip, note, panel and legend from RADS_MAP_CONFIG
  README.md      this file
```

Dependencies: only Leaflet 1.9.x, which the map page already loads. Nothing else.

---

## Where the files live and how maps load them

**Current setup (RADS-UIL):** each category repository carries its own copy of this folder at
`rads-map/v1/`, next to its `index.html`. The map loads it with a relative URL:

```html
<link rel="stylesheet" href="rads-map/v1/rads-map.css">
<script src="rads-map/v1/rads-map.js"></script>
```

Load the stylesheet **after** Leaflet's CSS (including Leaflet CSS inlined in a `<style>` block),
so the template's flat style wins.

**Keep every copy byte-identical.** To change the template, edit one copy, then copy the same files
into every repository that uses it (and bump to `v2` if live maps would change; see Versioning).
Check with `md5sum */rads-map/v1/*`: every file should show the same hash in every repo.

**Alternative** (not used now): one public repository `rads-map-shared` with Pages switched on,
loaded from every map as `../rads-map-shared/v1/…`. All RADS-UIL repositories share the host
`rads-uil.github.io`, so that relative path works too.

### Versioning

Never edit `v1` once live maps use it. For a change, copy the folder to `v2`, change `v2`, then
move maps over one at a time by editing their two tags. Old maps stay on `v1` untouched.

---

## How to add a new map (step by step)

1. **Start from the page skeleton** below. Keep `<div id="map"></div>` as a direct child of
   `<body>` and do not add any other visible text to the page.
2. **Load Leaflet first, then the two shared files** (as above). Leaflet plugins the map already
   uses can stay.
3. **Write `RADS_MAP_CONFIG`** (reference below). Keep to the content budget:
   title ≤ 60 characters, ≤ 6 layer toggles, short legend labels, note ≤ 300 characters.
   Anything longer belongs on the WordPress project panel, not in the map.
4. **Create the map** with the reduced-motion helper:
   `var map = L.map('map', RadsMap.motionOptions());`
5. **Build your layers** exactly as before. Do not change data or layer styling.
6. **Call `RadsMap.init(map, RADS_MAP_CONFIG, handlers)`** once, after the layers exist. Init
   applies each default (`defaultOn`) through your handlers, so you don't need separate start-up code
   to add layers.
7. **Show click details in a popup** with `RadsMap.popup(latlng, html)` rather than a
   floating card. It is sized to fit the box and kept clear of the chip and panel.
8. **Test inside an iframe** at 713 × 678, 802 × 598 and 356 × 518, with the panel open
   and closed (`?panel=open` / `?panel=closed` force the state for testing). Check: no page
   scrollbar, nothing overlapping, no console errors, Tab reaches the i button, Layers and every control.

### Page skeleton

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Map title</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<link rel="stylesheet" href="rads-map/v1/rads-map.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="rads-map/v1/rads-map.js"></script>
<style>/* map-specific styles only (tooltips, popup content, data labels) */</style>
</head>
<body>
<div id="map"></div>
<script>
var RADS_MAP_CONFIG = {
  title: 'Map title',
  search: false,
  baseLayers: [
    {id:'map',       label:'Map',       defaultOn:true, layer:L.tileLayer('https://…/{z}/{y}/{x}')},
    {id:'satellite', label:'Satellite',                 layer:L.tileLayer('https://…/{z}/{y}/{x}')}
  ],
  layers: [
    {id:'aod', label:'AOD', defaultOn:true, opacity:true, layer:myRasterOverlay}
  ],
  timeSlider: {min:2013, max:2023, label:'Year'},
  legend: [ {label:'High', color:'#8E2F1E'}, {label:'Low', color:'#F1F4F9'} ],
  note: 'One short caveat or method note.'
};

var map = L.map('map', RadsMap.motionOptions()).setView([24.9, 67.1], 11);
// ... the map's own data loading and layers ...

RadsMap.init(map, RADS_MAP_CONFIG, {
  onTime: function(year){ /* swap the raster for this year */ }
});
</script>
</body>
</html>
```

---

## Config reference — `RADS_MAP_CONFIG`

| Key | Type | Notes |
|---|---|---|
| `title` | string | One line, ≤ 60 characters. It is cut with "…" if it doesn't fit; the full text shows on hover. No subtitle. |
| `search` | `false` \| `true` \| `{placeholder, label}` | Adds the Search section (first). Typing calls `onSearch(lowercaseText, rawText)`. |
| `zoomTo` | array of `{id, label}` (optional) | A "Zoom to" row of buttons (for example "Survey area", "Whole city", one per zone), shown right after Search. A click calls `onZoomTo(id)`. Use only where the map already had such buttons. |
| `baseLayers` | array of `{id, label, defaultOn, layer?}` | Radio list. Only shown when there are two or more. If `layer` is a Leaflet layer it is swapped automatically; `onBase(id)` is called either way. |
| `layers` | array of `{id, label, defaultOn, opacity, layer?, group?, disabled?, disabledReason?, opacityValue?, swatch?}` | Checkbox per layer, ≤ 6. `group:'x'` turns rows with the same group into radio buttons (one at a time). `opacity:true` adds a slider (only where the map already had one). `layer` (Leaflet layer) is added/removed automatically; `onLayer(id, on)` is called either way. `swatch` takes a legend item (`{color, shape}`) to draw beside the label. |
| `timeSlider` | `{min, max, step?, value?, label}` or `null` | Range slider with live value. Calls `onTime(value)`. |
| `legend` | array of legend items, see below | Shown last. Can be replaced at any time with `RadsMap.setLegend(items)`. |
| `note` | string | ≤ 300 characters. Shown in a popover from the **i** button in the title chip. Omit or leave empty for no button. |
| `startCollapsed` | boolean (optional) | Force the panel to start closed on every width. By default it starts open at ≥ 600 px and closed below. |
| `applyDefaults` | boolean (optional, default `true`) | When `true`, `init` calls `onLayer(id, defaultOn)` for each layer. |

Section order is fixed: **Search → (Zoom to) → Base layer → Layers → Year → Legend**. A section with nothing
in it is left out.

### Legend items

| Item | Shape |
|---|---|
| `{label, color, shape}` | One row. `shape`: `'square'` (default), `'dot'`, `'line'`, `'dash'`, `'outline'`. Use different shapes and always a text label, so colour is never the only cue. |
| `{heading}` | A small sub-heading inside the legend. |
| `{label, gradient:[c1, c2, …], min, max}` | A colour ramp with end labels. |
| `{label, color, shape, toggle:'key', defaultOn}` | A legend row with a checkbox, used as a filter. Calls `onLegendToggle(key, on)`. |

### Handlers (third argument of `init`)

`onSearch(text, raw)`, `onZoomTo(id)`, `onBase(id)`, `onLayer(id, on)`, `onOpacity(id, 0…1)`, `onTime(value)`,
`onLegendToggle(key, on)`, `onPanel(open)`. All are optional.

### API

| Call | Does |
|---|---|
| `RadsMap.init(map, config, handlers)` | Builds the UI. Call once. |
| `RadsMap.motionOptions()` | Options for `L.map()` that turn animations off when the visitor asks for reduced motion. |
| `RadsMap.setLegend(items)` | Replaces the legend (for example when the view changes). |
| `RadsMap.setStatus(text)` | Shows a short status line bottom left (loading, errors). Empty string hides it. |
| `RadsMap.setChecked(id, on)` | Changes a base, layer or legend control from code without calling its handler. |
| `RadsMap.popup(latlng, html, options?)` | Opens a popup sized to the box and kept clear of the chip and panel. |
| `RadsMap.popupOptions(extra?)` | The same sizing options, if you build `L.popup` yourself. |
| `RadsMap.openPanel()`, `closePanel()`, `isPanelOpen()` | Panel control. |

The template also calls `map.invalidateSize()` on window resize and whenever the panel opens or
closes. On boxes narrower than 600 px it closes the panel when a popup opens.

---

## Layout rules the CSS enforces

- `html, body {height:100%; margin:0; overflow:hidden}`, so the page itself never scrolls.
- Title chip: top left, 40 px tall, one line, ellipsis.
- Zoom control: under the chip, 40 × 40 px buttons.
- Panel: top right, ≤ 260 px wide, max height `100% − 52px` (it keeps the attribution clear) and
  `50%` below 600 px wide, so an open panel covers at most about 37 % of the map at every tested size.
  Scrolls inside.
- Flat (border-radius 0), white panels, charcoal text, RADS red for accents and active states,
  `#D6D6D6` borders, a light shadow for readability over imagery. No teal or blue in the UI.
- Accessibility: real buttons and inputs with labels, visible red focus outline, `aria-expanded`
  on the Layers and i buttons, Escape closes the note, controls come before the map in Tab order,
  reduced-motion respected.
