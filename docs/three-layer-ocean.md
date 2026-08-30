# The Three-Layer Ocean — Presentation Revision

> The rules already know the ocean is three bands deep. This revision makes the *screen* know it.

This document turns the August 2026 playtest feedback into a plan. The feedback, condensed:
the game should look and feel like Warcraft III — you should really *see* the units, not just
their tops; the ocean should play as three levels you dive and rise between; the bottom level
should have a visible, textured seabed the units steer along; and sitting close to the surface
should cost you, on a timer, until you sink back down.

Most of that is already designed and implemented as *rules* — [systems-depth.md](systems-depth.md)
is a document about exactly this ocean. What the feedback is reacting to is the *presentation*:
the shipped renderer projects the whole water column onto a flat top-down chart, so three
kilometres of designed verticality and forty approved 3D models read as coloured counters on a
board. The revision is therefore mostly a renderer and UX revision, plus one genuinely new
mechanic at the top of the water column.

Status of each part:

- **The perspective presentation (§4–§5) and band navigation UX (§6) are the accepted
  direction.** They replace the pure plan-view camera spec in
  [art-direction.md](art-direction.md) once the migration phases in §9 land.
- **The Lid exposure mechanic (§7) is a proposal.** It changes a worldbuilding rule
  ([world.md](world.md) says the Lid is lore, not a mechanic), so it ships only after an
  explicit yes — it is listed with the other open questions in §10.

---

## 1. The feedback, restated as goals

| # | Goal | Source in the feedback |
| --- | --- | --- |
| G1 | See the units — the approved roster models, dimensional, from a real camera | "more like Warcraft III… really see the units, not just from top. We designed so beautiful models" |
| G2 | Three navigable levels, entered by diving and left by rising, one level at a time | "you can dive… rise up to the next level… to the third level… and sink again" |
| G3 | A visible seabed with relief and texture; units steer along it; some deep areas where the floor drops away | "the first level should have a seabed… deep areas where there might be no seabed… steer your units along the seabed" |
| G4 | Being close to the surface runs a timer, then hurts, until you sink back down | "the third level is close to the surface… maybe a timer until you get damage… until you sink down" |
| G5 | Textures and models keep coming from the Claude Design pipeline | "we can design all sorts of textures and graphics" |

## 2. What already exists

The feedback asks, of G4, "maybe there's already something in the game" — worth answering for
all five goals, because the answer decides how big this revision actually is.

| Goal | What canon already has | Where |
| --- | --- | --- |
| G2 — three levels | The three depth bands: Shelf 0–400 m, Mid-Water 400–1,800 m, Abyssal 1,800 m+. Continuous depth orders, descent at 45 m/s and loud (SIG floor 72), ascent at 15 m/s and silent. Implemented and tested | [systems-depth.md](systems-depth.md) §1–§2, `DEPTH_BANDS` / `DEPTH` in shared constants |
| G3 — a seabed | Every cell carries an authored floor and ceiling; movement resolves against the water column and slides along ground it cannot enter; terrain raises a hull and never lowers it; trenches, plateaus and roofed passages are authored map data | [systems-depth.md](systems-depth.md) §1–§2, [maps.md](maps.md) |
| G3 — "deep areas with no seabed" | Trench floors below 1,800 m — the Abyssal band's floor is wherever the map says the water ends, and `DEPTH.MAX_M` is the only ceiling on how deep that may be | [systems-depth.md](systems-depth.md) §1 |
| G4 — surface cost | **Partially.** The Lid — the sour top ~150 m, poisoned since the Collapse — exists as lore with no mechanic. The Directorate bleed above 400 m exists as a mechanic but is theirs alone | [world.md](world.md), [glossary.md](glossary.md), [factions.md](factions.md) |
| G1 — the models | Forty approved GLBs — the full prototype roster and structures, per faction — sit in `docs/concept-art/models/`, validated by hull-intake at real metre scale. The shipped renderer flattens them into top-down sprite bakes | [graphics-standards.md](graphics-standards.md) pipeline of record |
| G5 — the pipeline | Already the pipeline of record: [asset-prompts-3d.md](asset-prompts-3d.md) → hull-intake → approved model. Nothing changes upstream of the renderer | [graphics-standards.md](graphics-standards.md) |

So: G2 and G3 are presentation gaps over implemented rules, G1 and G5 are a renderer change
consuming assets that already exist, and G4 is the one new mechanic — and even it has its lore
anchor already in the water.

## 3. Terminology — bands, not layers

The feedback says "levels" and "layers". Canon must not: **Echo Layer** is the game's central
system, and sonar speech already uses "the layer" for the thermocline ("under the layer you are
hidden"). A third meaning would be exactly the collision [glossary.md](glossary.md) exists to
prevent.

The three levels **are the three depth bands**, and the docs keep calling them that. The
feedback counts from the seabed up — level one at the bottom, level three near the surface —
and the Rift agrees with the instinct, because status runs downward
([culture.md](culture.md)): the deep is first water, the shallows are the cheap berths.
Player-facing UI avoids the ordering question entirely by using the band *names*, which are
short, evocative, and already canon: **Abyssal** (the feedback's first level), **Mid-Water**
(second), **Shelf** (third). The UI verbs are **Dive** and **Rise**.

## 4. The camera — from chart to conning view

This is the section that supersedes SPEC. [art-direction.md](art-direction.md) "Camera &
Projection" mandates pure top-down orthographic plan view, and it argued its case well — the
reasons were mechanical, not taste. The playtest verdict is that the chart wins the argument
and loses the game: honest rings on a flat board read as an abstraction, and the target
emotion is dread, which needs a *place*. The revision:

- **Perspective projection, WC3-lineage pitch.** The camera looks down and along at roughly
  55° from horizontal (TUNABLE within 50–60°, settled by Phase-1 screenshots). Units show hull,
  sail and flank, not silhouette-from-above; the seabed reads as ground with relief receding
  into fog.
- **Yaw stays locked. No camera rotation, ever — that rule survives intact.** North-up is what
  keeps the viewport and the sonar scope in agreement, and nothing in the feedback asks for
  rotation. WC3 itself shipped effectively rotationless; the pitch is what it contributes here,
  not free-look.
- **Zoom dollies along the view axis, about the cursor** — the existing zoom rule, re-based
  onto the new camera. The zoom band stays TUNABLE in the renderer, and every graphics gate is
  still judged at every zoom the camera allows.

### What the plan view protected, and where each protection goes

The old spec was load-bearing. Each load moves; none is dropped:

- **Honest range rings.** The plan view's core argument: a 2,400 m ping ring must not lie. In
  a true 3D scene the ring is drawn as a **decal on the world** — projected onto the terrain
  or onto the emitter's depth plane — so it is geometrically exact in world space: 2,400 m is
  2,400 m in every direction, and foreshortening is the uniform, learnable foreshortening of
  the whole scene rather than a per-ring distortion. This is precisely how WC3 and its
  descendants draw selection circles and AoE previews, and nobody misjudges them. The **sonar
  scope stays pure plan view** — the chart register lives on in the instrument built for it
  ([ui-ux.md](ui-ux.md) §5), which is also where a player goes to *measure*.
- **Depth is luminance.** Survives and gets stronger: the gradient rule becomes actual
  distance-and-depth fog in the scene. A trench reads dark because it is deep, not because a
  shader tinted a flat polygon.
- **What you click is what the simulation collides.** Restated for 3D rather than dropped:
  picking resolves through a hull's collision proxy — `HULL_OUTLINE` extruded to the hull's
  height — never through fins, frills or glow. The footprint law becomes a volume law.
- **The bake contract.** The plan-view sprite bake (4 px/m units, 1.5 px/m structures) stops
  being the shipped look of the player's own force and becomes three things it is already
  good at: the sonar-scope language, the tier-capped contact representation (§5), and the
  loading/low-spec fallback. The pipeline that produces it is untouched.

### What does not move at all

- **Server-authoritative resolution.** A perspective camera changes what the client draws,
  never what it receives. Contacts still arrive resolved, under opaque per-observer handles.
- **The Asymmetric Fidelity Law.** Own force renders as full models. The enemy renders at the
  fidelity their detection earned: Tier 1 a smudge, Tier 2 a blurred blob, Tier 4 a resolved
  flat silhouette — as billboarded impostors in the 3D scene, never as meshes. The renderer
  cannot leak what the server never sent, and it stays that way.
- **Glow encodes loudness.** The `E(SIG)` energy curve in
  [graphics-standards.md](graphics-standards.md) gate 3 applies to runtime emissive materials
  exactly as it applied to baked emissive maps. A quiet hull is dark in 3D too.
- **Atmosphere is screen-space.** Vignette, sway (translation only), chromatic split — the
  existing rules carry over unchanged.

## 5. The seabed made visible

The ground already has a shape; now it gets geometry.

- **The mesh transcribes the authored floors.** The 250 m cell grid's floor values become a
  heightfield mesh, interpolated smoothly between cells for the eye. The **collision truth
  stays the cell grid**: a visual slope never opens a route the grid refuses, and the
  passable-interval rule is not renegotiated by a triangle.
- **Detail relief is promoted from shading to displacement.** The deterministic render-only
  relief in `packages/frontend/src/game/seabed.ts` — vent fields as broken ground, trench
  floors as pressure-eroded stone, coral ruins as terraced right angles — displaces the mesh
  instead of merely darkening the fill. It keeps every existing constraint: amplitude belongs
  to the biome, the simulation never reads it, and no gameplay quantity may ever derive from
  it. Texture, not information — now with a third dimension.
- **Biome texturing carries the existing rules.** Hue belongs to the biome, depth is
  luminance, albedo mottling stays hue-preserving and darken-only. Vent embers become true
  emissive points, still `#E06A2B`, still stepping on the 5 Hz sonar cadence, still stateless.
- **Where there is no seabed, there is dark.** A trench floor beyond the fog's reach renders
  as depth, not as geometry — the floor drops out of the light. That is the feedback's "deep
  areas with no seabed", and it is also the cheapest dread the new camera buys.
- **Roofed passages become real overhangs.** A tunnel mouth is now an actual hole under an
  actual ridge. The chart rule — a passage is drawn as a route, public to everyone, occupancy
  visible to no one — moves to the route overlay and the sonar scope, because in the world
  view "invisible from above by construction" is finally literally true.

## 6. Steering the bands

The feedback's navigation model — dive to a level, steer along it, rise to the next — becomes
the *default verbs*, layered over the continuous-depth simulation rather than replacing it.
Steering itself already works and is not touched.

- **Dive / Rise step one band.** The primary depth controls on the command panel become two
  buttons (and hotkeys): Dive orders the selected hulls to the next band down, Rise to the
  next band up, at each band's cruise depth. They compile to the existing `orderDepth` — no
  new protocol, no new simulation rule, and every existing cost applies untouched: descent is
  fast and deafening, ascent is slow and silent, and crush attrition below a hull's PR is the
  hull's own problem. Expert play keeps the precise depth order it has today
  ([ui-ux.md](ui-ux.md) §8) — the thermocline at 1,200 m sits *inside* Mid-Water, so hugging
  the duct remains an in-band decision the two buttons deliberately do not flatten.
- **Floor-following is an explicit mode.** A hull ordered to hug the seabed holds a set
  clearance above the local floor and follows the ground — up for free (terrain already
  raises hulls), down at the ordinary loud descent rate, and never below its own PR. The
  standing rule that nothing may spend a descent the player never ordered survives because
  floor-following *is* the order: entering the mode is the commitment, its dives are exactly
  as loud as dives are, and the mode disengages where following would cross the hull's PR.
- **The band is readable at a glance.** Selection UI names the band; hulls in other bands are
  depth-cued by the scene itself — fog, luminance, scale — the way WC3 makes high ground read
  without a tooltip. The sonar scope keeps its existing depth presentation.

## 7. The top of the column — the Lid becomes a cost

*Proposal — requires sign-off, because it changes a worldbuilding rule.*

The feedback wants the near-surface level to run a timer and then hurt until you sink. Canon
already holds the answer it is reaching for: **the Lid**, the sour top ~150 m, poisoned since
the Salinity Collapse — today "lore, not a mechanic" ([world.md](world.md)).

The proposal is to make the water say what the lore says:

- **Sour exposure.** A hull above 150 m runs a sour timer — 20 s grace (TUNABLE). When it
  expires, the hull bleeds unhealable damage on the same ledger as crush attrition — 1% of
  max hull per second (TUNABLE) — until it descends below the Lid. The timer resets only
  after a full recovery interval below (TUNABLE), so bobbing along the boundary is not free.
- **The symmetry is the argument.** The column becomes hostile at both ends: the bottom
  crushes what goes below its rating, the top poisons what floats too high, and the playable
  ocean is the water between two costs. That is an argument about depth, which is the test
  every mechanic here has to pass.
- **Grace-then-bleed, not a wall.** The grace window makes the Lid a *desperate* transit — a
  route over a Shelf fight that anyone can take and nobody can hold. Unlike crush, the bleed
  is universal: every faction sours at the same rate, because the Lid predates all of them.
- **The writing rule survives.** The surface stays finished, not forbidden — no goal, no
  hope, no plot device. Mechanising the Lid does not open the surface; it prices the last
  metres below it, which is the opposite of an invitation.

What it touches if adopted: [world.md](world.md) "The Lid" (drops "not a mechanic"),
[glossary.md](glossary.md) (same entry), [systems-depth.md](systems-depth.md) §1–§2 (the band
table gains the Lid row and the attrition section gains its mirror), a `LID` constant block in
shared constants, and the pressure system server-side. The Directorate interaction is a
footnote, not a conflict: their own bleed starts at 400 m, so a Directorate hull in the Lid is
already deep in a penalty it chose twice.

## 8. Pipeline and gates — what changes, what does not

**Upstream of the renderer, nothing changes.** Prompt kit → hull-intake → approved GLB in
`docs/concept-art/models/` remains the one road in, with the same scale, silhouette, and
emissive review. The feedback's "we can design textures with Claude Design" is that road.

Downstream:

- **The runtime consumes the GLBs directly.** The recommended engine is **three.js** — native
  glTF loading, instancing, and it slots under the existing React shell; the HUD stays
  React/DOM. PixiJS remains for the sonar scope or retires to it. The frontend stays a
  terminal, not a simulation.
- **Faction recolour moves from bake-time to material-time.** Same rule, new address: models
  ship shape, the owning faction's constant ships hue, and no faction colour is ever baked
  into a shared asset (gate 4 unchanged in spirit, reworded in mechanism).
- **Gate 3 survives verbatim.** Emissive intensity follows `E(SIG)`; the normalisation moves
  from the offline map bake to material calibration against the same curve.
- **Gate 6 is rewritten, not deleted.** "The client ships PNGs, not geometry" becomes per-model
  budgets a reviewer can check: triangle and texture caps per hull class, instanced rendering
  for rosters, chunked static terrain, a scene-wide draw-call budget — numbers to be set by
  Phase-1 measurement and recorded in [graphics-standards.md](graphics-standards.md). The
  floor this protects is real: this game runs on phones in Termux
  ([SETUP-ANDROID](../SETUP-ANDROID.md)), so the sprite path is retained as the documented
  low-spec fallback, which it already knows how to be.
- **Gate 8 is rewritten to the new spec.** Fixed-pitch perspective, locked yaw, rings as
  world-space decals, sonar scope stays plan view, atmosphere stays screen-space.
- **Gate 5 and the review checklist survive untouched** — including the rule that every visual
  PR carries a run-game screenshot. A camera revision is reviewed by looking at it.

## 9. Migration plan

Phased so the game is playable and green at every step; both renderers coexist behind a
toggle until Phase 5. Every phase lands through the standard CI gates.

| Phase | Delivers | Touches |
| --- | --- | --- |
| **D — Docs** | This document merges. Then, as their phases start: [art-direction.md](art-direction.md) "Camera & Projection" rewritten to §4, [graphics-standards.md](graphics-standards.md) gates 6/8, [tech-stack.md](tech-stack.md) renderer entry, [ui-ux.md](ui-ux.md) §8 controls; [world.md](world.md)/[glossary.md](glossary.md) only if §7 is adopted | docs only |
| **1 — The ground** | three.js viewport behind a toggle: terrain heightfield from authored floors, biome texturing, depth fog, existing sprites as billboards. Camera pitch settled by screenshots. Perf measured on desktop + Termux, gate-6 budgets set from the numbers | frontend |
| **2 — The fleet** | GLB roster rendered as instanced meshes, own force only; faction recolour and `E(SIG)` emissive at material level; contacts stay tier-capped impostors; volume picking | frontend |
| **3 — The verbs** | Dive/Rise band controls, band readouts, floor-following mode (the one server change in the presentation track: a follow-floor order mode beside `orderDepth`) | frontend, backend, shared |
| **4 — The Lid** | Sour exposure per §7, if adopted: `LID` constants, pressure-system extension, tests, band-table doc updates | shared, backend, docs |
| **5 — The switch** | Perspective becomes the default; the plan-view *world* renderer retires (the sonar scope keeps the chart); gates and playtest checklist updated; screenshots refreshed | frontend, docs |

## 10. Open questions

Parked here as plain text until decided; none blocks Phase 1.

1. **Adopt the Lid mechanic (§7)?** Recommended yes — it is the only part of the feedback
   with no existing rule behind it, and its lore anchor is already canon.
2. **Does a full-screen chart view survive as a toggle,** or does the plan view live only in
   the sonar scope? Recommendation: scope-only first; add the toggle if playtests miss it.
3. **Camera pitch** — settled inside the 50–60° band by Phase-1 screenshots, then pinned as
   SPEC in [art-direction.md](art-direction.md).
4. **Engine confirmation** — three.js recommended in §8; Babylon is the fallback candidate if
   Phase 1 hits a wall. Decided by the Phase-1 spike, recorded in
   [tech-stack.md](tech-stack.md).
5. **Player-facing band naming** — band names (recommended, per §3) versus numbered levels.

---

## Related

- **[systems-depth.md](systems-depth.md)** — the rules this revision puts on screen: bands,
  floors, ceilings, PR, the descent/ascent asymmetry
- **[art-direction.md](art-direction.md)** — the camera spec §4 supersedes, and the visual
  language everything else here inherits
- **[graphics-standards.md](graphics-standards.md)** — the gates §8 rewrites and the ones it
  keeps
- **[tech-stack.md](tech-stack.md)** — renderer choice and performance budgets
- **[world.md](world.md)** — the Lid, the Collapse, and the writing rule §7 must not break
- **[ui-ux.md](ui-ux.md)** — the depth controls §6 revises and the sonar scope that keeps the
  chart
- **[asset-prompts-3d.md](asset-prompts-3d.md)** — the model pipeline, unchanged and now
  load-bearing at runtime
- **[culture.md](culture.md)** — why counting the ocean from the bottom up is the Rift's own
  instinct
