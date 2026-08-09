# How to play — Penultimate I: The Ring

An Ultima III-style, tile-based, keyboard-driven adventure across real Berlin
inside the S-Bahn Ring. This page is the player's guide; for setup/install see
the [README](../README.md).

Open **<http://localhost:3000/play>** (or `/play/create` to roll a custom party).

## The goal (for now)

There is **no win condition or overarching quest yet** — it's a sandbox. Wander
the city, uncover the map, chat with venue keepers, buy gear and food, fight
random encounters, level your party, clear a night-club dungeon for the Neon
Blade, and see how much of the Ring you can explore. A "point"/goal is a planned
addition.

## The screen

- **Left:** the map viewport — an ~11×11 tile window centred on your party
  (always drawn in the middle).
- **Right:** the sidebar HUD — party status, your position/district, contextual
  panels (shop, keeper, station, pack), a **Messages** log, and a **Keys** hint
  bar at the top that always shows the keys for whatever you're doing.

## Moving & exploring

- **Arrow keys / WASD** move one tile at a time. Water, buildings, and the rail
  are impassable.
- Crossing into a new **district** (Mitte, Kreuzberg, …) prints a message.
- Everywhere you walk is remembered as **explored**. Press **M** on the overworld
  to open the **map overlay**: explored tiles show as a high-level colour map
  (streets, parks, the Spree, gold venues, bright-gold Michelin stars, blue
  stations), the rest is black fog. While the map is open: **arrow keys pan**,
  **Z** cycles zoom, **M/Esc** closes. Exploration is saved when you Save.

## Venues (the gold-marked buildings)

Each venue type has its own icon (cocktail = bar, bottle = Späti, plate =
restaurant, speaker = club, sword = armoury, …), and famous landmarks
(Fernsehturm, Brandenburger Tor, Siegessäule, Reichstag, Berliner Dom) have their
own. Stand on one and press **Enter** to go inside; press **Enter** again (or step
on the door) to leave.

- **Restaurants** show their **real menu** — the actual signature dishes of that
  place, priced by its **€–€€€€€** level — plus a cook you can talk to. Menu,
  cuisine, and price come from the Berlin Food Stories data. **Michelin-starred**
  restaurants carry a gold ★ marker.
- **Shops** (grocery, Späti, clothing, sport, armoury, bar) let you **buy**,
  **sell**, and **equip** gear/consumables.
- Behind the counter stands a **keeper** whose look matches the trade.

### Buying, selling, equipping

- **1–9** buys the numbered item in the current shop/menu.
- The **Pack** panel lists what you carry. Use **[** and **]** to move the pack
  cursor, **G** to equip the selected item onto the selected hero, **X** to sell
  it (in a shop).
- **1–6** (when not in a shop) selects a party member; **C** cycles the selected
  member anywhere (they're the equip target).

## Talking to keepers (AI)

Inside any venue, press **T** (or the *Talk to the keeper* button) to chat. The
keeper is played by Claude, in character for the trade, district, and — for
restaurants — the actual cuisine and dishes they serve. Type and press **Enter**
to send, **Esc** to leave. (Requires `ANTHROPIC_API_KEY`; without it you get a
placeholder line — see the README.)

## Combat

Walking streets/parks triggers **~10% random encounters** (drug addicts, thieves,
wild boars, and exotic foes); a turn-based **tile arena** opens.

- **Arrow keys / WASD** move the active hero, or attack a foe on the adjacent tile.
- Party members act in turn; then monsters take theirs. Hits, KOs, and the
  outcome scroll in the combat feed, with short hit/death/victory animations.
- **F** flees. Win → **loot + XP** (and level-ups); lose → you black out and lose
  half your gold.

## Getting around by rail

There are 121 U-/S-Bahn stations (blue). Stand on one and either press **1–9** for
the listed destination or use the **Ride** buttons to **fast-travel** across the
Ring.

## Night-club dungeons

Entering a nightclub drops you into a dark **maze** with a boss, the **Techno
Titan** — beat it to clear the dungeon and claim the **Neon Blade**.

## Party, levelling, saving

- Party members have race/class, HP, ATK/DEF, level, and XP; winning fights grants
  XP and levels them up. Equip weapons/armour to raise ATK/DEF.
- **Save** with the Save button — it stores position, gold, roster, inventory, and
  your explored map. Reload resumes from the last save.

## Sound

Procedural, chiptune-style audio, all synthesized (no files):

- **Music** changes by scene — a long evolving overworld theme, shop, Späti
  (style per cuisine's "nationality"), combat, and club (minimal techno / gabber /
  acid). Toggle with the 🎵 button.
- **Sound effects** for footsteps, encounters, hits, win/lose, and coins. Toggle
  with **V** (or the 🔊 button).

## Keyboard reference

| Context | Key | Action |
| --- | --- | --- |
| Overworld | Arrows / WASD | Move |
| Overworld | Enter / E / Space | Enter the venue you're on |
| Overworld | **M** | Open the explored-world map |
| Overworld | 1–6 | Select party member |
| Map open | Arrows | Pan · **Z** zoom · **M/Esc** close |
| Interior | Enter / E / Space | Step back outside |
| Any venue | **T** | Talk to the keeper (Esc leaves) |
| Shop | 1–9 | Buy that item |
| Station | 1–9 | Board that train |
| Anywhere | **C** | Cycle the selected hero |
| Pack | **[** **]** / **G** / **X** | Pick item / equip / sell |
| Combat | Arrows / WASD | Attack or move · **F** flee |
| Anywhere | **V** | Toggle sound |

Every action also has a button in the sidebar, so the game is fully playable with
the mouse too. The **Keys** bar at the top of the sidebar always shows the keys
for your current context.