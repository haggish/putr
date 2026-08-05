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

## 3. Intellectual-property stance

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
| _(pixel-art tileset)_ | _TODO_ | _TODO_ | _TODO_ |
| _(transit data)_ | VBB/BVG | _TODO_ | _TODO_ |
