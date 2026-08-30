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

- **The perspective presentation (§4–§5) and band navigation UX (§6) are landed.** With
  Phase 5 the conn view *is* the game view, and [art-direction.md](art-direction.md)
  "Camera & Projection" now carries the perspective spec — pitch 55°, SPEC — that §4
  argued for. The plan-view world renderer is retired; the chart lives on in the sonar
  scope.
- **The Lid exposure mechanic (§7) is adopted** — the owner's yes came with Phase 3/4
  ("do them together", 2026-08-30). [world.md](world.md), [glossary.md](glossary.md) and
  [systems-depth.md](systems-depth.md) §2 now carry it as a rule of the water.

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

*Adopted with Phase 4 — the sign-off this section asked for arrived with "do them
together". The rule of record now lives in [systems-depth.md](systems-depth.md) §2; this
section stays as the argument that won it.*

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

### Phase 1 — landed

The viewport exists: `packages/frontend/src/game/PerspectiveView.ts` (three.js scene),
`perspectiveTerrain.ts` (the pure heightfield, node-tested), and a **Chart / Conn** toggle in
the match UI — *conn*, because the command bar already sells DIVE as a depth order and a view
is not an order. `?view=perspective&pitch=NN` opens straight into it for the harness. Own
force renders as the chart's own baked sprites laid flat at true depth with a plumb line and
ground shadow (depth made visible); contacts are tier-capped smudges; nodes, vent embers,
depth fog and the rock walls are in. Review screenshots live in
`docs/screenshots/three-layer-phase1/`.

Decisions the phase settled:

- **Engine: three.js**, confirmed — the spike hit no wall worth Babylon.
- **Pitch: 55°** ships as the default (TUNABLE band unchanged). The 50/55/60 comparison is in
  the screenshots directory: 50° buys hull profile at the cost of ground legibility, 60°
  flattens back toward the chart; 55° holds both. Pinned as SPEC in
  [art-direction.md](art-direction.md) at Phase 5, when this view becomes the default.
- **Vertical scale: 0.22 world-metres per metre of depth** (`DEPTH_VISUAL_M_PER_M`,
  render-only by rule), and a 150 m rock rise above the shallowest open floor.
- **Gate-6 starting budgets**, from measurement: the whole Ventfront scene is **35 draw calls
  / ~33k triangles**, so the world pass gets budget caps of **150 draw calls / 250 k
  triangles** (TUNABLE) with pixel ratio capped at 1.5. The container only has software GL,
  where the scene renders at ~270 ms/frame — that number measures SwiftShader, not the
  scene — so wall-clock validation on real GPUs and on the Termux floor is Phase 2's first
  errand, before the model roster raises the load.

### Phase 2 — landed

The approved roster sails: own units and commissioned structures render in the conn view as
the GLBs from `docs/concept-art/models/`, loaded at runtime through
`packages/frontend/src/game/rosterModels.ts` and served by the bundler straight from the docs
tree — one set of files, no copy to drift. The Phase-1 sprites remain exactly what the plan
said they would be: the loading fallback, and the whole of any kind without an approved model
(the VentTap). Construction sites keep the dimmed schematic until commissioned, per gate 1's
scaffold register. Review screenshots live in `docs/screenshots/three-layer-phase2/`.

What the phase settled:

- **Canonicalisation is the intake harness's, verbatim.** The exports are not metre-true and
  not axis-uniform (the roster is Z-long; the Bastion arrives fifty times under scale), and
  the offline map bake has always corrected this through hull-intake's rule — yaw a Z-long
  export onto X, scale the length to the design figure, centre. `rosterModels.ts` replicates
  that rule exactly, which is why the conn view and the chart's sprites agree about every
  hull without a single model being re-exported.
- **Gate 4 moved to material level.** Each material keeps its luminance and wears the owning
  faction's primary; lamps are recoloured to the faction glow. Templates cache per palette,
  so the colour-vision palettes (ui-ux.md §11) recolour the meshes the way they re-bake the
  sprites.
- **Gate 3 went live.** Lamps carry their intake-approved resting strength and swing with the
  hull's *live* SIG along the spec curve's exponent (`glow.ts`, node-tested): silent running
  visibly darkens a hull, a ping flares it. Loudness is the lights, never the paint.
- **Draw calls hold budget with the models on.** Design exports arrive as dozens of parts per
  hull; merging by material collapses the starting base — six model-backed entities, terrain,
  embers — to **~50–58 draw calls / ~50 k triangles**, inside Phase 1's 150 / 250 k caps.
  Same software-GL caveat as Phase 1 (~180–195 ms/frame measures SwiftShader, not the
  scene); **real-GPU and Termux wall-clock validation is still owed** and remains the next
  hardware errand.
- **Volume picking is in, orders are not.** Clicking resolves through an outline-extruded
  invisible proxy — never fins or glow — and draws a chart-parity highlight ring. It is
  deliberately view-local: the verbs stay on the chart until Phase 3.

### Phase 3 — landed

An honest ledger first: most of this phase was already in the water when it began. The
backlog had shipped the band verbs while the plan was still being written — DIVE and RISE
on the command bar step the three band stations plus the thermocline duct, `D`/`A` are
bound, and the readout speaks band names ([ui-ux.md](ui-ux.md) §8) — which also settled
§10's naming question the way §3 recommended. What Phase 3 itself added:

- **Floor-following, end to end.** The standing order of
  [systems-depth.md](systems-depth.md) §2: `S` (and the squad bar's FOLLOW button) holds
  the selection 30 m over whatever ground is under it — up for free, down as a real dive,
  disengaging at the hull's PR edge, replaced by any manual depth order. The one server
  change the presentation track needed: an order mode beside `orderDepth`, in the replay
  record like every order, node-tested from grace to disengage.
- **The conn view's first verb.** Right-click moves the picked hull, through the chart's
  own callback — one order channel, whichever view the player stands in. The rest of the
  verbs wait for Phase 5, when this view earns the HUD.

Review screenshots live in `docs/screenshots/three-layer-phase34/`, shared with Phase 4:
the squad bar's FOLLOW lit with the card reading station keeping at floor-minus-30, and
the ribbon's Lid hatch.

### Phase 4 — landed

The Lid is a mechanic. [world.md](world.md) and [glossary.md](glossary.md) flipped their
"lore, not a mechanic" lines, [systems-depth.md](systems-depth.md) §2 carries the rule of
record, and the simulation carries the rule: a third pass in the pressure system, on the
crush ledger, behind `LID` in shared constants — 20 s of grace above 150 m, then 1% of max
hull per second, universal, unhealable, lethal, recovering over 30 s of clean water so the
boundary cannot be straddled for free. The ribbon hatches the top 150 m in the threat
register; a hull in sour water counts its grace down on the card and says `SOUR — BLEEDING`
when it runs out. Backend tests pin the shape: the grace is whole, the bleed is a fraction
on the unhealable ledger, every navy pays the same, recovery is slower than spending, and
it kills.

Presentation debts, carried or new: a contact below Tier 3 still hovers at the 600 m
reference — the honest column glyph is owed; hulls at true metre scale still read small
against kilometres of ground at far zoom (a readability scale is owed; RTS readability >
realism); the map edge still ends in blackness; hazard sites, echo marks, own ordnance,
the Lid's own presence and the depth verbs are not yet in the conn view — the chart
remains the command surface until Phase 5; and sour exposure has no audio cue yet, which
[audio-direction.md](audio-direction.md) should decide a channel for rather than inherit.

### Phase 5 — landed

The switch is thrown: the conn view is the game view, and the chart's world renderer is
retired. The Pixi canvas is now transparent glass composited over the GL world, and it
kept everything that was ever *instrument* rather than *world*: the whole HUD, the sonar
scope (which keeps the chart, per §4), the depth ribbon, the command bar — and every
world-anchored mark, redrawn per frame **through the conn camera**. `EchoRenderer.setConn`
is the whole coupling: `resolveGround` turns a pointer into water, `projectPoint` turns
water into pixels, and the pan / zoom / focus verbs move the one camera both canvases
share. One projection, two painters, no second opinion about where anything is.

What the phase settled:

- **Measurements conform; symbols billboard.** The split §4 promised, made code. Range
  rings, ping previews, hazard sites, residue stains, blocked ground and queued routes
  are sampled vertex by vertex onto the terrain — a 2,400 m ring climbs a ridge because
  the distance it measures does. Contact marks, silhouettes, glyphs, bars and selection
  rings live in pooled per-entity Graphics billboarded at the entity's projected position
  and scaled by the local pixels-per-metre, so the chart's draw bodies ported with the
  entity at the local origin and their fidelity rules untouched.
- **Aim is screen-space now.** Selection, marquees, and right-click targets resolve
  against *drawn* positions through the same projection — a hull 600 m above its plumb is
  clicked where it is seen — with the old world-metre reach radii scaled to local
  pixels-per-metre under an 18 px floor, so survey zoom never demands pixel-perfect aim.
- **The scope's camera box became honest.** The viewport's ground footprint is a
  trapezoid (`groundQuad`), because that is what a tilted camera sees; scope scrubbing,
  group-recall centring and log-row focus all drive `focusWorld` on the one camera.
- **The toggle, `?view=` and `?pitch=` retired.** Pitch 55° is pinned as SPEC in
  [art-direction.md](art-direction.md); gates 6 and 8 in
  [graphics-standards.md](graphics-standards.md) are rewritten to the budgets and the
  one-camera rule; [tech-stack.md](tech-stack.md) and the root `CLAUDE.md` describe the
  two-canvas architecture.
- **WebGL is now a requirement, said out loud.** The flat world renderer was the de facto
  no-GL path, and it no longer exists; a browser that refuses a context gets a hard stop
  with the reason, not a black screen wearing a working HUD. The low-spec fallback is the
  conn view's own sprite path — baked billboards inside the 3D scene until models decode,
  and the pixel-ratio cap — which is what [SETUP-ANDROID](../SETUP-ANDROID.md)'s floor
  runs on.

Review screenshots live in `docs/screenshots/three-layer-phase5/`: the default view with
the HUD over the world, a squad's detection rings conforming over a ridge, the ping
preview, and the survey zoom with the scope's trapezoid box. The composited scene held
**47 draw calls / ~50 k triangles** through the whole drive — inside Phase 1's caps —
with zero console errors.

Debts carried forward, unchanged from Phase 4 where not listed: the sub-Tier-3 column
glyph, the far-zoom readability scale, the sour-exposure audio cue — and one new one: the
real-GPU / Termux wall-clock validation owed since Phase 1 now covers the composited
two-canvas frame, not just the GL pass.

### After the switch — debts settled

The Phase-4 and Phase-5 records both carried "the honest column glyph is owed". It is
paid: a contact the player has earned no depth for is no longer parked at the 600 m
reference, and `UNRESOLVED_CONTACT_DEPTH_M` is gone with it.

The mark is now a statement about the **water column** rather than a point in it. At the
contact's plan position — still tier-capped, still blurred at Tier 2, still the
*listener's* own position at Tier 1 — the glyph is a soft vertical presence spanning the
water a hull could actually hold in: the Lid at the top ([systems-depth.md](systems-depth.md)
§2), the seabed under that position at the bottom, both projected through the one camera
like any other measurement, so a column over a trench is drawn tall and a column over a
plateau is drawn short. That difference is information the player earned — how much water
the contact could be hiding in — rather than the fixed height the reference used to draw
everywhere.

Three things the shape had to avoid, and how ([art-direction.md](art-direction.md), the
fidelity principle; [graphics-standards.md](graphics-standards.md) gates 5 and 8):

- **No hairline.** The obvious drawing — a thin vertical line with the tier smudge riding
  it — reports the plan position to the pixel, which is a precision neither tier carried
  and which at Tier 1 would be pointing at the player's own listener. The column is drawn
  as nested soft ribbons instead, the widest exactly the tier's own uncertainty radius, so
  the mark is never narrower than the position is uncertain.
- **No taper, no bulge.** A column bright in the middle says "probably mid-water" — the
  600 m lie told softly. The ribbons hold one width and one alpha end to end.
- **Quieter than an earned track.** The ribbons' composite alpha lands under the tier's
  own flat-blob alpha, which is already far under a Tier-4 track's; the fidelity encoding
  in `TIER_SHAPE` is untouched, and only the height claim was dropped.

The symbol still billboards, at the column's middle sample rather than at a chosen depth,
so the anchor is a consequence of the span instead of a claim about a place. Aim follows
the drawing, per Phase 5's screen-space rule: the whole column is the click target, so a
Tier-2 contact is attacked where it is *drawn* rather than at a height nothing was ever
drawn at. The layout is pure arithmetic in `contactColumn.ts` and node-tested; the pixels
are reviewed by screenshot, as the graphics checklist requires.

One incidental fix rode along, because the column made it load-bearing: `projectPoint`
reaches the ground on every null-depth vertex, and `groundYAt` was recomputing the terrain
seed and the rock-top scan — both O(cells) — per call. They are cached per terrain now and
refreshed where the ground changes.

Review screenshots live in `docs/screenshots/issue-283/`: the midfield fight with several
columns standing in the water, one column at detail, and — for the comparison the record is
owed — the same fight under the old reference, where the unresolved marks are grey discs
hanging at one height over ground that is nowhere near them.

Debts still carried: the far-zoom readability scale, the sour-exposure audio cue, and the
real-GPU / Termux wall-clock validation.

## 10. Open questions

Parked here as plain text until decided; none blocks Phase 1.

1. ~~Adopt the Lid mechanic (§7)?~~ — **adopted**, with Phase 3/4 ("do them together").
   The rules landed in [systems-depth.md](systems-depth.md) §2 and the water now bills for
   the top 150 m.
2. ~~Does a full-screen chart view survive as a toggle?~~ — **settled with Phase 5:
   scope-only.** The toggle retired with the chart's world renderer; the plan view lives
   in the sonar scope, per the standing recommendation. The fallback position survives as
   itself: if playtests miss the full-screen chart, it can return as a view over the same
   resolved data — nothing about the retirement forecloses it.
3. ~~Camera pitch~~ — **settled at 55°** by the Phase-1 screenshots (§9); SPEC-pinned in
   [art-direction.md](art-direction.md) at Phase 5.
4. ~~Engine confirmation~~ — **three.js**, per §9's Phase-1 record.
5. ~~Player-facing band naming~~ — **settled: band names**, and in the event the backlog
   settled it before Phase 3 arrived: the shipped depth controls already step the band
   stations under `SHELF` / `MID` / `ABYSS` readouts ([ui-ux.md](ui-ux.md) §8), which is
   §3's recommendation in the water.

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
