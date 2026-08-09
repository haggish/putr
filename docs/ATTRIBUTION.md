# Attribution & Licensing — Penultimate I: The Ring

The single source of truth for third-party data licenses and this project's
intellectual-property stance. **When you add any data source or asset, record its
source + license here _before_ using it.**

## 1. OpenStreetMap (world terrain & venues)

The overworld terrain and venue locations are derived from **OpenStreetMap**.

- **License:** Open Database License (**ODbL 1.0**).
- **Required attribution:** `© OpenStreetMap contributors`.
- **Share-alike:** a database _produced_ from OSM (our generated world asset — the
  tile map, district zones, placed venues) is an ODbL Derivative Database and is
  itself distributed under ODbL. The produced world asset files must carry the
  attribution and a license reference.
- **Where attribution must appear:** (a) the generated world asset files, (b) the
  in-game credits/about screen, and (c) this file.

## 2. Transit data — U-Bahn / S-Bahn (VBB / BVG)

Public-transit stations and lines will come from **VBB/BVG open data** (GTFS).

- **License: TODO — confirm at ingestion.** Commonly **CC-BY 4.0** or
  **Datenlizenz Deutschland – Namensnennung (DL-DE-BY-2.0)**, but the exact terms
  for the specific dataset must be verified before shipping.
- **TODO checklist (fill in when the transit-data bead runs):**
  - [ ] Confirmed license + link to the license text
  - [ ] Exact required attribution string
  - [ ] Dataset name, source URL, and download date

## 3. Restaurant & dining data (Berlin Food Stories, Michelin)

The restaurant layer inside the Ring is curated from two third-party sources, and
neither carries a confirmed open license — **treat this as a licensing TODO before
any public distribution or hosting.**

- **Berlin Food Stories** — restaurant **names, coordinates, cuisine tags, price
  levels (€–€€€€€), and signature-dish ("Eats") lists** were extracted from the
  Berlin Food Stories map (`berlinfoodstories.com/map`). Editorial/curatorial
  content owned by its authors; **no open data license**. Used here as factual
  reference for a non-commercial homage. Committed data: `world/bfs-places.json`
  (re-derivable via `world/build/extract-bfs.mjs` from a fresh dump).
- **Michelin** — **which restaurants hold 1–3 stars** (2026 guide) was taken from
  public reporting. Star ratings are facts, but the Michelin Guide is proprietary;
  the ★ markers are informational only.
- **Signature dishes for starred restaurants not in the BFS data**
  (`world/michelin-dishes.json`) are representative dishes drawn from public
  reviews / the MICHELIN Guide / visitBerlin (menus change; these are factual
  descriptions, not reproductions of any menu).
- Real-world restaurant **names** are used nominatively to place real venues on a
  map of the real city; the game claims no affiliation or endorsement.
- **TODO before distribution:** confirm whether this reuse is permissible (or
  replace with an openly-licensed / self-authored dataset), and add the required
  attribution.

## 4. Intellectual-property stance

This project is an original homage, not a copy.

- **Mechanics are fair to reimplement.** Game rules and mechanics (tile movement,
  HP/armor, shops, dungeons) are not protected by copyright. Reimplementing
  Ultima III-style _mechanics_ is fine.
- **All art is original or openly licensed.** Every sprite/tile is either created
  for this project or sourced from a permissive license (e.g. CC0 / CC-BY), with
  its source and license logged in the Asset Registry below. The project does
  **not** copy, trace, extract, or reproduce any Ultima III / Origin Systems /
  Electronic Arts sprites, tilesets, maps, music, or text.
- **Names & marks.** "Ultima", "Exodus", and related names are trademarks of their
  respective owners and are referenced here **only nominatively** (for comparison /
  benchmark), never as branding. The project's name and all in-game names and text
  are original.
- **Reference screenshots** (e.g. the MobyGames Amiga screenshots) are used solely
  as a private visual layout/feel **benchmark** and are not redistributed or
  reproduced in the project.

### Contributor rule

Before adding any asset or data source, add a row to the registry below with its
source and license. No un-logged assets.

### Asset registry

| Asset / dataset | Source | License | Attribution string |
| --- | --- | --- | --- |
| Overworld world asset | OpenStreetMap | ODbL 1.0 | © OpenStreetMap contributors |
| Pixel-art tiles / sprites / icons | Original (this project) | Project-owned | — |
| Procedural audio (SFX + music) | Original (synthesized, no samples) | Project-owned | — |
| Restaurant data (cuisine/dishes/price) | Berlin Food Stories | **TODO — no open license** | _TODO_ |
| Michelin star ratings | Michelin Guide (public reporting) | **TODO — facts, guide proprietary** | _TODO_ |
| Starred-restaurant signature dishes | Public reviews / MICHELIN Guide / visitBerlin | Factual descriptions | _informational_ |
| _(transit data)_ | VBB/BVG | _TODO_ | _TODO_ |
