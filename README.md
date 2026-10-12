# Orangi Town NDVI & AOD Time Series Viewer

An interactive web map for exploring how vegetation cover (NDVI) and aerosol load (AOD) changed across Orangi Town, Karachi, from 2013 to 2026.

## Short Description

An interactive viewer comparing vegetation cover (NDVI) and aerosol load (AOD) across Orangi Town, Karachi, from 2013 to 2026. Use the year slider to step through each year, toggle the NDVI and AOD layers independently, and switch between a street map and satellite basemap.

## Key Results

- **13-year NDVI record (2013-2026):** annual vegetation stills derived from Landsat 8/9 surface reflectance at 30 m resolution.
- **12-year AOD record (2013-2025):** annual aerosol stills derived from MODIS MAIAC (MCD19A2) at 1 km resolution.
- **Side-by-side comparison:** vegetation and aerosol layers can be viewed together, with adjustable opacity, to compare patterns over the same settlement boundary.
- **Year-by-year exploration:** a single slider steps through every year so that trends, gaps and anomalies are easy to spot.
- **Pollution proxy, not a measurement:** AOD is a proxy for particulate pollution and is not a direct PM2.5 measurement.

## Features

- Year slider (2013-2026) to step through the time series
- Independent toggles and opacity controls for the NDVI and AOD layers
- Street map and satellite basemap switch
- Colour legends for both layers
  - NDVI: red (bare / low vegetation) to green (dense vegetation)
  - AOD: green (clean air) to purple (heavy aerosol / particulate load)
- On-screen notice when a year has no data for a layer (AOD ends in 2025)

## Data Sources

| Layer | Source | Resolution | Coverage |
|-------|--------|------------|----------|
| NDVI | Landsat 8/9 surface reflectance | 30 m | 2013-2026 |
| AOD | MODIS MAIAC (MCD19A2) | 1 km | 2013-2025 |

## Usage

1. Place `AOD_NVDI_Viewer.html` and the `images/` folder in the same directory.
2. Open `AOD_NVDI_Viewer.html` in a web browser (an internet connection is needed for Leaflet and the basemap tiles).
3. Use the year slider and layer controls in the side panel to explore the data.

If the overlays do not line up with the settlement boundary, edit `AOI_BOUNDS` near the top of the script in the HTML file.

## Built With

- [Leaflet](https://leafletjs.com/) for the interactive map
- Esri World Street Map and World Imagery basemaps
- Plain HTML, CSS and JavaScript (no build step)

## Limitations

- AOD is a proxy for particulate pollution, not a direct PM2.5 measurement.
- AOD data are not available for 2026.
- AOD is coarser (1 km) than NDVI (30 m), so fine-scale AOD detail within the town should be interpreted with caution.
