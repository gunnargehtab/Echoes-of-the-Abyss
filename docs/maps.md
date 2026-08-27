# Echoes of the Abyss — RTS Map Layout Concepts

Readable, tactical, atmospheric — built for the underwater world.

## Core Map Design Principles

- Clear silhouettes — terrain must be readable even in dark biomes
- Biome contrast — each region has distinct color + shape language
- Hazard telegraphing — players must see danger before entering
- Multiple attack routes — no single dominant path
- Factions interact differently with terrain and hazards
- **Verticality through depth.** Every region carries a seabed depth, and may carry a roof.
  Trenches are deep floors, plateaus are shallow ones, and caverns and tunnels are regions
  with a ceiling — water under rock, reachable only from below. A route over a ridge and a
  route under it are different routes with different costs, and only one of them can be
  seen from above. See [systems-depth.md](systems-depth.md) §1.

## Map Type 1 — The Ventfront Divide

A geothermal battlefield split by erupting thermal veins.

### Layout Logic

- Central geothermal vent line divides the map
- Two safe plateaus on each side for base building
- Multiple narrow crossing points
- Side tunnels for flanking

### Biome Distribution

- Center: Thermal Veins (hot, bright, dangerous)
- North/South: Abyssal Trenches
- East/West: Kelp Forest Plateaus

### Hazards

- Geothermal eruptions (predictable intervals)
- Toxic brine pockets near mining rigs

### Strategic Dynamics

- Bathyarch gains early control via vent stabilization
- Pelagia uses kelp forests for stealth flanks
- Abyssal thrives in trench side routes
- Hadron dominates crystal-rich corners

### Ideal Use

Competitive 1v1 or 2v2; high-pressure mid-control gameplay.

## Map Type 2 — Kelp Labyrinth

A dense maze of kelp forests with hidden paths and stealth zones.

### Layout Logic

- Central kelp maze with multiple winding routes
- Open outer ring for expansions
- Hidden tunnels connecting corners

### Biome Distribution

- Center: Kelp Forest Plateaus
- Outer ring: Coral Ruins
- Deep pockets: Abyssal pressure zones

### Hazards

- Kelp entanglement fields
- Cold shock currents in deeper pockets

### Strategic Dynamics

- Pelagia dominates central stealth routes
- Abyssal uses pressure pockets for ambushes
- Bathyarch must clear kelp to create firing lanes
- Hadron uses resonance towers to reveal hidden paths

### Ideal Use

Asymmetric campaign missions; stealth-heavy gameplay.

## Map Type 3 — Abyssal Rift Corridor

A long trench map with brutal choke points and vertical depth gameplay.

### Layout Logic

- Central trench corridor (long, narrow, deep)
- Side plateaus for expansions
- Vertical depth layers with fog separation

### Biome Distribution

- Center: Abyssal Trenches
- Side: Thermal Veins + Coral Ruins
- Corners: Resonance Fields

### Hazards

- Pressure zones (constant DoT)
- Abyssal creature migration paths
- Sonic resonance storms in corners

### Strategic Dynamics

- Abyssal Directorate has home-field advantage
- Bathyarch must build heavy armor to survive pressure
- Pelagia struggles in trench but excels on side plateaus
- Hadron controls corner resonance fields for tech boosts

### Ideal Use

1v1 competitive; high-skill micro + positioning.

## Map Type 4 — Crystal Convergence

A symmetrical map centered around a massive resonance crystal formation.

### Layout Logic

- Central crystal cluster (high-value tech zone)
- Four radial lanes leading to bases
- Outer ring with resource nodes
- Diagonal tunnels for flanking

### Biome Distribution

- Center: Resonance Fields
- Mid-ring: Coral Ruins
- Outer ring: Kelp + Thermal mix

### Hazards

- Resonance storms (random pulses)
- Magnetic debris fields
- Toxic brine pockets near ruins

### Strategic Dynamics

- Hadron gains major buffs in center
- Bathyarch can mine crystal fragments
- Pelagia uses coral ruins for ambushes
- Abyssal thrives in dark diagonal tunnels

### Ideal Use

2v2 team battles; strong mid-control + tech race.

## Map Type 5 — Sunken Metropolis

A ruined underwater city with tight corridors and vertical combat layers.

### Layout Logic

- Multi-layered ruins with ramps and collapsed domes
- Central plaza with open combat space
- Underground tunnels beneath main lanes
- Side districts for expansions

### Biome Distribution

- Center: Coral Ruins
- Lower levels: Abyssal pockets
- Upper levels: Kelp overgrowth

### Hazards

- Chemical spill zones
- Collapsing structures (timed hazards)
- Cold shock currents in lower tunnels

### Strategic Dynamics

- Bathyarch excels in tight industrial corridors
- Pelagia uses upper kelp layers for stealth
- Abyssal dominates lower tunnels
- Hadron controls vertical chokepoints with sonic pulses

### Ideal Use

Campaign missions; narrative-heavy battles.

## Map Type 6 — The Fourfold Frontier

A macro-focused map with four distinct biome quadrants.

### Layout Logic

- Each quadrant is a different biome
- Central neutral zone with rare resources
- Multiple wide lanes for large armies
- Balanced symmetry for competitive play

### Biome Distribution

- NW: Thermal Veins
- NE: Kelp Forest
- SW: Abyssal Trench
- SE: Resonance Field
- Center: Coral Ruins

### Hazards

- One signature hazard per quadrant
- Center has mild hazards but high rewards

### Strategic Dynamics

- Each faction has a "home biome" advantage
- Encourages multi-front macro play
- Strong scouting required

### Ideal Use

1v1, 2v2, 4-player FFA; balanced competitive map.

---

## Scaffold Status

Three archetypes are implemented, in `packages/backend/src/sim/maps/`. They were chosen to span the PropagationFactor range rather than for variety — PF is the game's main lever, and the point of having more than one map is having more than one PF landscape to test a faction on:

| Archetype | Implemented | The argument it makes |
| --- | --- | --- |
| Map Type 1 — The Ventfront Divide | Yes (default) | A **masked middle** at PF 0.45 with loud flanks: the contested ground is the quiet ground, and the fast routes are the loud ones |
| Map Type 2 — Kelp Labyrinth | Yes | **Broken sightlines** — kelp does not hide an army so much as destroy your sense of how far away one is |
| Map Type 3 — Abyssal Rift Corridor | Yes | A PF 1.6 highway with **no secrets** down its length |
| Map Type 4 — Crystal Convergence | Not yet | |
| Map Type 5 — Sunken Metropolis | Not yet | Sorrowgate is cut from this shape, but a one-seat chamber is not the four-seat archetype |
| Map Type 6 — The Fourfold Frontier | Not yet | |

That count is a count of **archetypes**, which is the only thing this catalogue holds. A mission map is authored per mission and answers to that mission's document instead: it is not an archetype, it is not required to be multi-seat or balanced, and it is **not in the public catalogue** — it is resolved by mission id and cannot be selected in a skirmish. The ones that exist are listed under Mission maps below.

**Floors and ceilings are built, and the archetypes author both.** Every region carries a floor and may carry a ceiling — the Ventfront's tunnels run under a 520 m roof, the Kelp Labyrinth's under 700 m — and the terrain grid stores each per cell, so `Terrain.admits()` answers whether a hull at a given depth can be in a given place at all. Ground whose ceiling sits below its floor admits nothing at any depth, which is how solid rock is written. [systems-depth.md](systems-depth.md) §6 tracks what the simulation enforces, row by row. Read the verticality in the archetype descriptions below as ground you can sail into, and be stopped by.

### How a map is written

Authored data, never generated. `Terrain.demo()`'s own comment makes the case and it still holds: "an RTS simulation must be reproducible, and a seeded generator is one refactor away from not being." A map is a literal — regions, spawns, resource fields, hazard sites — with no procedural step anywhere in it.

Regions are rectangles, painted in order so a later one overwrites an earlier one. Every layout above is corridors, plateaus, bands and quadrants, all of which are rectangles or unions of them; a richer shape vocabulary would be more expressive than anything this document asks for.

**A cell belongs to the region whose rectangle contains its centre.** The grid is 250 m, the rectangles are in metres, and that rule is what converts between them. It has two consequences an author should hold on to:

- Adjacent regions tile. Two bands meeting at 3,000 m divide the grid between them exactly once, so which biome a boundary cell ends up with is a fact about the geometry rather than about paint order.
- A rectangle laid on cell boundaries paints exactly the metres it reads, and every rectangle in `sim/maps/` is written that way. A rectangle that is not — one 1,600 m tall on a 250 m grid — is asking for something the grid cannot hold, and gets the whole cells whose centres are inside it: 1,500 m, not 1,600.

The rule the grid used until issue #157 was the other one: a cell was painted if the rectangle touched it *at all*. That is not a rounding detail, because biome is PropagationFactor. A band authored 1,600 m wide painted 2,000 m of cells — a 25% over-paint — and every over-painted cell carried sound at a rate no document described, priced into `pathPropagation` and therefore into detection. It also let the map edge clip a column on one flank that the opposite flank kept, which is how two maps that describe themselves as symmetric were not.

Regions may also set a **floor** and a **ceiling**. Both are optional: a region with neither is open water over the map's base seabed, which is what most of a map is. A floor is how deep the water goes there; a ceiling is rock above the water, 0 on open water and non-zero only for a roofed passage.

Because regions paint in order, terrain is authored the way it reads — the ground, then what was cut into it. The same property that lets a trench cut *through* a vent line in two lines of data lets a tunnel run *under* a ridge in two: paint the plateau, then paint a narrower region across it with a ceiling and a deeper floor. Read in order, that is a shelf with a hole bored through it.

The ruleset does not care how deep a map goes. The depth bands mean the same thing on every map ([systems-depth.md](systems-depth.md) §1), and the maximum-floor constant is only a sanity ceiling on what a map may author, so a mistyped floor of 300,000 m fails a map test rather than producing a match.

A map's **spawn list is its player count**, which is why the Abyssal Rift Corridor has two and the others four. The old spawn logic computed corners from the map's width and height, which quietly assumed every map is a square — false the moment a corridor map exists.

A mission map is the one carve-out, and it is not a counter-example. It carries a single spawn because the player commands a single force; every other party in the water is placed by the mission, with its own hulls and its own standing, and the map never hears about them. Reading a mission map's spawn list as a player count is therefore correct and tells you almost nothing about how crowded the water is.

**Hazard sites are placed; two kinds are simulated.** Geothermal eruptions and resonance storms run a full lifecycle — see [hazards.md](hazards.md) for the status of all eight. A simulated hazard is drawn live, with a phase and a closing countdown ring; an inert site is drawn into the static terrain layer as hatched ground, because a solid marker would imply an effect that does not exist yet. Either way the site is visible from the first frame, which is what the telegraphing principle above requires.

`Terrain.demo()` remains, explicitly as a **test fixture**: a hand-built grid with no spawns, resources or hazards, for tests that want ground whose PF landscape is not also under test.

### Mission maps

A mission map is authored the same way — a literal, regions painted in order — and is held to a different set of obligations, because a mission owns its own water. It is written against the mission's document, it carries whatever seats, spawns and empty resource lists that document asks for, and it is never offered to a player choosing a map. Balance does not apply to a chamber the player is scripted into.

| Mission map | Implemented | What it is |
| --- | --- | --- |
| Sorrowgate | Implemented (#190) | One seat, no economy, not selectable in skirmish |

Sorrowgate is specified in full in [mission-sorrowgate.md](mission-sorrowgate.md) — its regions, its floors, its single spawn and the parties the mission seats around it — and that document, not this one, owns those numbers. It is cut from Map Type 5's shape, which is what that archetype's *Ideal Use* line asks of it; it is not a Sunken Metropolis, and Map Type 5 stays *Not yet* in the archetype table, because ticking it would promise a four-seat competitive layout that nobody has written.

### Two authoring faults the tests caught

Both were found by writing down an invariant rather than by looking at the map:

- The Kelp Labyrinth's corner pressure pockets sat exactly on its corner spawns, which would have started two players in the deepest and loudest biome on the map.
- The Abyssal Rift Corridor's trench ran the full width, putting both bases inside PF 1.6 and making the opening a permanent broadcast. The trench is now *central*, with coral base aprons at either end — committing to the rift is something a player does, not something they wake up in.

Related: [environments.md](environments.md) · [hazards.md](hazards.md) · [systems-echo.md](systems-echo.md) · [mission-sorrowgate.md](mission-sorrowgate.md)
