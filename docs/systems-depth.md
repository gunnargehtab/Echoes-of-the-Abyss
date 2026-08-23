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

**Value increases with depth. So does the cost of being there.** The richest resource on the map — Resonance Crystal, the tech gate for every faction — is almost entirely Abyssal. Everyone must eventually descend, and each faction has a different, expensive answer to how.

## 2. Pressure Rating (PR)

Every unit has a **Pressure Rating**. A unit operating below its PR takes **unhealable crush attrition** — damage that ignores repair and regeneration. Depth is not a hazard you route around; it is a resource you rent, on a clock.

- **Descent is fast and deafening.** Diving is quick, but it's loud — see [systems-echo.md](systems-echo.md) for how SIG scales with movement and construction.
- **Ascent is slow and silent.** Retreating to shallower, safer water costs time, not noise.

## 3. Faction Relationships to Depth

Depth access is one of the two axes (with sound) that every faction's mechanics are built from. See [factions.md](factions.md) for full doctrine.

| Faction | Baseline PR | Depth Strategy |
| --- | --- | --- |
| **Bathyarch Consortium** | PR-2 | **Buys** access — cheapest refits in the game, but pays for every metre |
| **Pelagia Commune** | PR-1 | **Terraforms** access — poor refits, but Deepbloom structures slowly convert Abyssal tiles to habitable ground; they don't survive the deep, they change it |
| **Abyssal Directorate** | PR-3 | **Born to it** — no refit needed, free access to the map's richest third; the trade-off is shallow water poisons them (−20% speed, −15% HP above 400 m) |
| **Hadron Knights** | PR-2 | **Projects** access — instant refits paid in Resonance, and **Sounding Spire** structures grant allied units +1 PR within 600 m as a support ability |

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
| Sounding Spire rents depth (§3, §4) | **Implemented** | `STRUCTURE_AURAS.SOUNDING_SPIRE`; the grant is real while the aura holds and lost on leaving it |
| Directorate shallow-water penalty (§3) | Not modelled | −20% speed, −15% HP above 400 m; needs a per-faction modifier pass |
| Pelagia Deepbloom terraforming (§3) | Not modelled | Requires terrain that can change band, which the biome grid does not yet support |
| Commander abilities, e.g. Seeding (§4) | Not modelled | No commander-ability layer exists yet |
| Map floor | Placeholder | `DEPTH.MAX_M` is a flat 3,000 m for every map; it belongs to map data once authored maps land |

The descent and ascent *rates* are TUNABLE — this document pins the asymmetry, not the
numbers. The asymmetry itself is not tunable: it is what §5 above is about.

---

## Related

- **[systems-echo.md](systems-echo.md)** — the acoustic axis
- **[factions.md](factions.md)** — per-faction doctrine and depth economics
- **[characters.md](characters.md)** — commanders whose abilities manipulate depth directly
- **[environments.md](environments.md)** — biome-level PropagationFactor and terrain
