# Core System — Depth

> The Echo Layer is *what* you know. Depth is *what it costs* to go get it.

**Glossary:** See [Glossary](glossary.md) for authoritative term definitions (SIG, PF, HYD, PR, Resolution Tiers, Active Sonar, Silent Running, Echo Marks).

---

## 1. Premise

Maps are stacks, not planes. Every map is built from three vertical bands:

| Band | Range | Character |
| --- | --- | --- |
| **Shelf** | 0–400 m | Shallow, exposed, low value |
| **Mid-Water** | 400–1,800 m | The contested middle — where most factions live |
| **Abyssal** | 1,800 m+ | Highest value, highest cost |

Above the Shelf's first clear metres sits one more stripe that is not a band: **the Lid**,
the sour top ~150 m ([world.md](world.md)). It prices itself — §2's sour exposure — rather
than through PR, because it is not about what a hull is rated for; it is about what the
water up there is made of.

**Value increases with depth. So does the cost of being there.** The richest resource on the map — Resonance Crystal, the tech gate for every faction — is almost entirely Abyssal. Everyone must eventually descend, and each faction has a different, expensive answer to how.

Maps are stacks, not planes — and the stack is not the same height everywhere.

The three bands above are the **ruleset**: they say what 600 m means, and they mean the same thing on every map. How much water actually stands over a given patch of ground is **map data**. A trench floor may lie at 2,800 m while the plateau beside it stops at 380 m, and the band boundaries do not move to accommodate either.

Every point on a map therefore carries two numbers, not one:

| | What it is | The common case |
| --- | --- | --- |
| **Floor** | How deep the water goes before it becomes ground | The seabed |
| **Ceiling** | How shallow the water goes before it becomes ground | 0 m — open to the surface |

Between them is the water a hull may occupy. A hull at depth *D* fits at a point when **ceiling ≤ D ≤ floor**, and nowhere else.

Most ground has a ceiling of 0: open water from the surface down to the seabed. The other two cases are what the pair buys:

- **A ceiling deeper than its floor** — no water at all. Solid rock, a wall, the sheer side of a trench. Nothing fits at any depth.
- **A ceiling deeper than 0, with the floor deeper still** — a roofed passage. A tunnel under a ridge, a cavern mouth, an overhang. Water you can only be in by being *under* something, which means water nobody reaches by accident.

That last case is why this is a pair and not a single seabed depth. One number can describe a trench and a plateau, but it draws a tunnel as an open ditch — and [maps.md](maps.md) asks for caverns, for tunnels beneath the main lanes, and for vertical chokepoints. A map that cannot say "there is rock above this water" cannot say any of them.

### Depth also decides who can hear you

The bands price what being somewhere costs. The **thermocline** — the temperature boundary at 1,200 m — decides something else: which half of the map can hear you at all.

Sound crossing that boundary is cut to roughly a third. Sound running *along* it, inside the hundred metres either side where the water ducts, carries further than open water does. Two hulls on the same side of the layer hear each other normally; two hulls on opposite sides are nearly deaf to one another, whatever the biome between them.

This is the third thing depth means, and it is not a restatement of the first two. The bands say a raid into the Abyssal is expensive. The floor-and-ceiling pair says where a hull physically fits. The thermocline says that a fleet at 2,000 m and a fleet at 400 m are, acoustically, on different maps — and that the moment either one crosses 1,200 m, it is not. [systems-echo.md](systems-echo.md) §3 has the numbers and the geometry.

## 2. Pressure Rating (PR)

Every unit has a **Pressure Rating**. A unit operating below its PR takes **unhealable crush attrition** — damage that ignores repair and regeneration. Depth is not a hazard you route around; it is a resource you rent, on a clock.

- **Descent is fast and deafening.** Diving is quick, but it's loud — see [systems-echo.md](systems-echo.md) for how SIG scales with movement and construction.
- **Ascent is slow and silent.** Retreating to shallower water costs time, not noise.

Shallower is not the same as safer. Rising out of a deep raid does not make you louder — but crossing 1,200 m hands you to a different set of ears. Below the layer you were nearly inaudible to everything above it; above the layer you are audible to all of it, and nearly deaf to the ground you just left. The ascent is silent and it is still a decision.

### Ground you do not fit through

A hull whose depth is deeper than the floor beneath it does not fit there, and movement will not take it there: an order across a plateau stops at the plateau's edge rather than driving the hull into rock.

It does not stop for long. **Terrain may raise a hull. It may never lower one.** A hull standing in water shallower than its own depth rises, at the ordinary ascent rate, until it fits — and then carries on. The order is not cancelled and the hull's own depth order is not overwritten; the seabed simply holds it no deeper than the ground allows, and releases it when the ground falls away again.

The asymmetry is the one stated just above, applied to terrain. Ascent is slow and silent, so terrain lifting a hull spends the player's time and nothing else. Descent is fast and deafening, and below a hull's Pressure Rating it is fatal — so terrain that could push a hull *down* would be spending a commitment the player never made, and could feed a hull into crush attrition it never ordered. Nothing in this game should be able to do that on your behalf.

The consequence is that a roofed passage is enterable only by a deliberate dive. A tunnel is not a shortcut you fall into; it is a route you have to read the map to find, and pay the loud descent to use. That is the right price for a path nobody can watch you take.

### Steering along the ground

Beside the depth order sits one standing order: **floor-following**. A hull ordered to
follow the floor holds a fixed clearance — 30 m (TUNABLE) — above whatever ground is under
it, and keeps holding it as the ground changes: up for free, because terrain already raises
hulls, and down at the ordinary loud descent rate, because a dive is a dive whoever asked
for it. Entering the mode *is* the order — the rule that nothing may spend a descent the
player never made survives because the player made this one, standing, when they engaged it.

Two things end it. A manual depth order replaces it, because the newer instruction is the
player's current mind. And ground that falls away below the hull's Pressure Rating
**disengages it**: the mode will ride a hull down to the edge of what it is rated for and
not one metre past, because a standing order that could feed a hull into crush attrition
would be the seabed spending the player's hull on their behalf — the exact thing this
document forbids terrain to do. A disengaged hull holds its depth and says so.

### The other end of the column: sour exposure

The bottom of the column crushes what goes below its rating. The top poisons what floats
too high. A hull above **150 m** — inside the Lid ([world.md](world.md)) — runs a **sour
timer**: **20 seconds** of grace (TUNABLE), and then unhealable bleed at **1% of max hull
per second** (TUNABLE) on the same ledger as crush, until the hull descends below the Lid.
The timer does not reset the moment a hull dips under; it recovers over **30 seconds**
(TUNABLE) of clean water, so bobbing along the boundary is not free.

The mirror with crush is the design, not a coincidence:

- **Crush** is a bet — depth you are not rated for, priced per rating, and it can kill.
- **Sour** is a fact — water nothing is rated for, priced the same for every navy because
  the Lid predates all of them, and it can kill, because the Salinity Collapse was not a
  tax.

The grace window is what keeps the Lid a *desperate* transit rather than a wall: a route
over a fight, open to anyone, holdable by no one. It stacks with the Directorate's own
shallow penalty (§3) in the only way it can — a Directorate hull in the Lid is paying for
its physiology and for the water at once, and chose both.

Depth access is one of the two axes (with sound) that every faction's mechanics are built from. See [factions.md](factions.md) for full doctrine.

| Faction | Baseline PR | Depth Strategy |
| --- | --- | --- |
| **Bathyarch Consortium** | PR-2 | **Buys** access — cheapest refits in the game, but pays for every metre |
| **Pelagia Commune** | PR-1 | **Terraforms** access — poor refits, but Deepbloom structures slowly convert Abyssal tiles to habitable ground; they don't survive the deep, they change it |
| **Abyssal Directorate** | PR-3 | **Born to it** — no refit needed, free access to the map's richest third; the trade-off is shallow water poisons them (−20% speed, −15% HP above 400 m) |
| **Hadron Knights** | PR-2 | **Projects** access — instant refits paid in Resonance, and **Sounding Spire** structures grant allied units +1 PR within 600 m as a support ability |

### The baseline is what makes the weakness a trade

The **Baseline PR** column above is a floor, not a stat block: a hull whose own rating is
higher keeps it, and the baseline is simply the depth a navy is born rated for before it
buys, projects or terraforms a single metre.

It is load-bearing for the row below it. Crush attrition begins where a hull's rating runs
out, and the Directorate's poison begins on the Shelf — so for a PR-1 hull those two regions
are exact complements, and a Directorate scout without its navy's baseline would have had
nowhere in three kilometres of water to stand: crushing below 400 m, bleeding above it. The
PR-3 baseline is what turns "shallow water poisons them" from a hole into a choice, which is
why the two halves of §3 have to ship together.

### What "shallow water poisons them" means

The Directorate's weakness is the mirror of everyone else's: the rest of the Rift rents
depth it has not earned, and the Directorate rents *shallows* it was engineered out of.
Above 400 m — the Shelf, the same line the depth bands are drawn on — their hulls move at
**80% speed** and are **poisoned**, losing hull for as long as they stay.

The hull half is a **bleed with a floor**, not a stat debuff. A Directorate hull above the
line loses unhealable hull until it has lost 15% of its maximum, and then stops. Three
consequences follow, and all three are the point:

- **It can never kill them.** Crush attrition runs to zero, because renting depth is a bet
  and a bet can be lost. The shallows are not a bet — they are a region — so they price
  ground rather than lives. A Shelf that killed would be a map edge, not a weakness.
- **It is 15% once, not 15% per visit.** A hull that is already below the floor has nothing
  left for the water to take. Coming up the second time is free; it is the *first* metre
  above the line that is expensive.
- **Leaving does not refund it.** The hull is gone the way crushed hull is gone, and shows
  on the same unrecoverable segment of the health bar. Descending stops the bleeding; it
  does not undo it.

That is what makes the doctrine line true — *the Rift's most feared army can be beaten by
refusing to descend*. A defender who never leaves the Shelf forces the Directorate to come
up and pay, every engagement, for ground they cannot hold cheaply. What it does not do is
let the defender win by waiting: the price is bounded, and a Directorate commander who
accepts it arrives at 85% and still outnumbers you.

## 4. Depth as a Playable Ability

Depth access shows up directly as commander and unit abilities, not just as a passive stat:

- **Seeding** (Bloomwright Sefa Anholt, Pelagia Commune) — instantly converts a 400 m radius of Abyssal terrain to habitable, granting all friendly units +1 PR in the zone for 60 seconds. See [characters.md](characters.md).
- **Sounding Spires** (Hadron Knights) — standing structures that project +1 PR to allied units within 600 m, letting a comparatively fragile faction contest deep ground without redesigning its army.

## 5. Design Intent

Depth is the axis of **commitment**. A raid that goes deep goes in loud (the descent) and comes out slow (the ascent), which means every deep push is a real bet: you cannot both strike the richest ground on the map and retreat from it quickly. Combined with the Echo Layer, the two systems mean the same question is always on the table — *is what's down there worth what it will cost to get it, and to get back?*

## 6. Prototype Mapping

What the simulation scaffold implements against this document, so nobody re-implements
what exists or assumes what does not. Constants live in `DEPTH` in
`packages/shared/src/constants.ts`; the travel itself is
`packages/backend/src/sim/systems/depth.ts`.

| Doc concept | Prototype today | Implementation note |
| --- | --- | --- |
| Depth bands (§1) | **Implemented** | `DEPTH_BANDS`, and `depthBandFor()` in the shared echo module |
| Pressure Rating (§2) | **Implemented** | Per-unit `pressureRating`; crush attrition applied directly to hull so no future repair system can undo it |
| Depth as an order (§2) | **Implemented** | `Match.orderDepth()`, validated server-side; a depth outside the map is refused, not clamped |
| Descent is fast and deafening (§2) | **Implemented** | 45 m/s, and a SIG floor of 72 — above every cruise SIG in the roster, below the ping's 95. Ordering a dive breaks Silent Running, and re-asserting it mid-dive does not buy quiet |
| Ascent is slow and silent (§2) | **Implemented** | 15 m/s, one third of the descent rate, and no SIG contribution at all. Compatible with Silent Running |
| Baseline PR per faction (§3) | **Implemented** | `FACTION_PRESSURE_BASELINE`, applied at spawn as a **floor** on the hull's own rating — a hull rated higher keeps it. Without it the Directorate's PR-3 line was prose, and a Directorate PR-1 hull had no depth in the water column where it was neither crushing nor poisoned |
| Sounding Spire rents depth (§3, §4) | **Implemented** | `STRUCTURE_AURAS.SOUNDING_SPIRE`; the grant is real while the aura holds and lost on leaving it |
| Directorate shallow-water penalty (§3) | **Implemented** | Speed in `movementSystem`, stacking multiplicatively with silent running, storms, currents and kelp; hull in `pressureSystem`, as a bleed to `DIRECTORATE_SHALLOW.HULL_FLOOR` that shares the unhealable ledger with crush. The 400 m line is `DEPTH_BANDS`' Shelf boundary rather than a number of its own |
| Pelagia Deepbloom terraforming (§3) | Not modelled | Requires terrain that can change band. The per-region floor is the substrate for it; what is missing is the ability to write to it mid-match |
| Commander abilities, e.g. Seeding (§4) | Not modelled | The commander-ability layer exists — `MissionCommanderAbility`, built for Marr's Convocation — but carries a speed term and a Silent Running immunity, not a PR grant or a band change, so Seeding's +1 PR zone has nothing to stand on |
| Map floor (§1) | **Implemented** | Per-region, authored in the map. `DEPTH.MAX_M` is now only the ruleset's ceiling on what a map may author and what may be ordered |
| Map ceiling (§1) | **Implemented** | Per-region, 0 on open water. Two maps author roofed passages: the Ventfront flanking tunnels and the Kelp Labyrinth's wall runs |
| Ground you do not fit through (§2) | **Implemented** | `movementSystem` resolves each step against the water column and slides along ground it cannot enter, rather than refusing the order |
| Thermocline (§1) | **Implemented** | Depth-dependent multiplier on detection, applied to contacts, Echo Marks and fauna hearing alike. `THERMOCLINE` in shared constants; the layer sits at 1,200 m and is not terrain, because it depends on both ends of a listening pair rather than on any cell |
| Terrain raises, never lowers (§2) | **Implemented** | `depthSystem` holds a hull no deeper than the ground allows, at the ascent rate, without touching its depth order. Fauna get the horizontal refusal only — they carry no depth order, so nothing would lift them again |
| Floor-following (§2) | **Implemented** | `Match.orderFollowFloor()`; the depth system retargets the hull each tick to the local floor minus `FOLLOW_FLOOR.CLEARANCE_M`, through the ordinary descent/ascent rates and the descent's SIG. Disengages at the hull's effective PR edge; cancelled by any manual depth order |
| Sour exposure under the Lid (§2) | **Implemented** | `LID` in shared constants; a third pass in `pressureSystem` on the crush ledger. Universal, faction-blind, and lethal; grace and recovery per this document. Hulls only — fauna are of the Drift, ordnance is in the water for seconds, and no map floor reaches the Lid for a structure to stand in |

The descent and ascent *rates* are TUNABLE — this document pins the asymmetry, not the
numbers. The asymmetry itself is not tunable: it is what §5 above is about.

---

## Related

- **[systems-echo.md](systems-echo.md)** — the acoustic axis
- **[three-layer-ocean.md](three-layer-ocean.md)** — the presentation revision that puts the bands on screen
- **[factions.md](factions.md)** — per-faction doctrine and depth economics
- **[characters.md](characters.md)** — commanders whose abilities manipulate depth directly
- **[environments.md](environments.md)** — biome-level PropagationFactor and terrain
