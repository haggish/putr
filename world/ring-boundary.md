# Ring boundary — "inside the Berlin Ringbahn"

Documented boundary for the area enclosed by the Berlin Ringbahn (the S41/S42
circle line) for a later tile-projection step.

> **STATUS: APPROXIMATION — refine later.**
> This polygon was produced from known geography, **not** from live OpenStreetMap
> geometry, because the OSM Overpass API was **not reachable** from the build
> environment (both `curl` and `WebFetch` network access were denied). The shape
> should be replaced with the real S41/S42 route-relation geometry when network
> access is available.

## Method / source

- **Intended method:** query the OSM Overpass API
  (`https://overpass-api.de/api/interpreter`) for the Ringbahn route relations
  (`relation["route"="railway"]["ref"~"^S4[12]$"]`), pull the member way
  geometry, stitch the closed loop, and use it as the polygon boundary.
- **Actual method (fallback):** hand-placed vertices tracing the ring's
  characteristic corners near well-known Ringbahn stations, walked clockwise:
  - **N:** Westhafen / Wedding / Gesundbrunnen (northernmost reach ≈ 52.559)
  - **NE/E:** Prenzlauer Berg / Schönhauser Allee / Landsberger Allee /
    Frankfurter Allee / Ostkreuz (easternmost reach ≈ 13.475)
  - **SE/S:** Treptower Park / Sonnenallee / Neukölln / Hermannstraße
    (southernmost reach ≈ 52.477)
  - **SW/W:** Tempelhof / Südkreuz / Schöneberg / Innsbrucker Platz /
    Halensee / Westkreuz (westernmost reach ≈ 13.284)
  - **NW:** Charlottenburg / Messe back to Westhafen
- The enclosed inner-Berlin districts are Mitte, Kreuzberg, Friedrichshain,
  Prenzlauer Berg, north Neukölln, east Charlottenburg, north Schöneberg,
  and Wedding.

## OSM elements referenced

- None directly (fallback path did not fetch OSM data). The elements that
  *should* be referenced on refinement are the S41 and S42 railway route
  relations and their member ways forming the closed Ringbahn loop.

## Polygon geometry

- **File:** `ring-boundary.geojson` — a single GeoJSON `Feature` with a
  `Polygon` geometry (WGS84, lon/lat order), 18 coordinates (closed ring,
  first == last).

### Bounding box

| | Longitude (lon) | Latitude (lat) |
|-------|-----------------|----------------|
| **min** | 13.2840 | 52.4770 |
| **max** | 13.4750 | 52.5590 |

### Approximate enclosed area

- **≈ 80.4 km²** (shoelace formula on a local equirectangular projection
  centered at the polygon, `latRef ≈ 52.518°`, mean Earth radius 6371.0088 km).
- For reference, the area inside the Ring is commonly cited at **~88 km²**;
  this approximation is intentionally a touch conservative and should tighten
  toward the cited figure once real OSM geometry replaces it.

## Attribution

© OpenStreetMap contributors

Boundary data derived from / intended to derive from OpenStreetMap, licensed
under the Open Database License (ODbL).

## Notes for refinement

- `build-ring.mjs` in this directory contains the vertex list plus the bbox and
  area computation (equirectangular projection + shoelace). Re-run it after
  swapping in real Overpass geometry to regenerate the bbox / area figures.
