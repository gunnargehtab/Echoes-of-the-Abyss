# Graphics Standards — the acceptance bar

[art-direction.md](art-direction.md) says what things *look like*. This document says what
is *allowed to ship*. It exists so that "high standards for graphics" is a checklist a
reviewer can run, not a feeling — every rule here is a gate with a yes/no answer, and a
visual change that cannot answer yes to all of them does not merge.

The register throughout is the game's own: detail is something you **own**, never
something you are shown, and glow is never decoration — it is loudness made visible.

## The pipeline of record

There is exactly one way a hull or structure gets its shipped look, with one documented
fallback. Nothing ships outside these two paths.

```text
Claude Design prompt kit          docs/asset-prompts-3d.md   (prompts transcribe art-direction.md)
        │
        ▼
GLB export → hull-intake bake     .claude/skills/hull-intake (validates + renders review maps)
        │
        ▼
Approved model committed          docs/concept-art/models/*.glb
        │
        ▼
Offline map render                node tools/hull-maps/build.mjs
        │                         (albedo · height · emissive PNGs, 4 px/m units, 1.5 px/m structures)
        ▼
Load-time sprite bake             packages/frontend/src/game/hullTextures.ts
                                  (lit per pixel, recoloured per faction)
```

**Where the GLB comes from.** Every approved model in `docs/concept-art/models/` is
`THREE.GLTFExporter` output — a scene of named primitive parts, no sculpts and no
textures. The Bulwark is `hull_slab` + `armour_tier_1..3` + `flank_plate_p0..p3`; the
Dredge is `tergite_0..n` + `tergite_ridge_0..n` + `tergite_spine_0..n`. Because those
repeating series are loops, a hull can be *built* as well as exported, and
`tools/hull-models/` is that path: a shared kit (metres, bow on +X, port on -z, the
export), one module a navy holding its shape language, and one script a model composing
from it.

```text
node tools/hull-models/hulls/<hull>.mjs → docs/concept-art/models/<hull>-<navy>.glb → intake
node tools/hull-models/structures/<kind>-<navy>.mjs → docs/concept-art/models/<kind>-<navy>.glb → intake
node tools/hull-models/props/<thing>.mjs → docs/concept-art/models/env-<thing>.glb → intake --category env
```

A structure is the same path with a different vocabulary. A navy's module holds a
base / mount / head / barrel family beside its hull builders, because a settlement is
one architecture grown four ways and that repetition is exactly where a module pays.
Two things differ from a hull and both come from the kind rather than the script:
scale is held on the footprint diameter (`lengthM` in `tools/hull-maps/models.mjs` is
2 × `radiusM`), and no plan outline is generated, because a structure renders from its
map rather than from a polygon under the Asymmetric Fidelity Law.

An environment prop is the same path again (#869), with `seabed.mjs` where a navy's module
would be, since a prop belongs to nobody. Scale is held on the registry `footprintM`,
the larger horizontal axis, with no yaw and no outline, which is "The environment branch"
below.

This changes where a GLB comes from, never whether it is checked: the script's output goes
through `hull-intake` and gates 2–5 exactly as a hand-exported one does, and a warning-free
bake is still the bar. What it buys is that a hull becomes editable, diffable and
restylable — a navy's whole fleet can be re-proportioned by editing its faction module
rather than by re-authoring seventeen binaries. The prompt kit stays canonical: a hull
script transcribes its `docs/asset-prompts-3d.md` block the way the constants transcribe a
design doc, and the prose is what it answers to when the two disagree.

Two things hold a script and its file together. The kit measures the light rule before
intake can: on every export it rasterises the scene from above at the maps' own 4 px/m and
names each lit part that shows less than a cell of plan area — a lamp on a vertical face,
a glow inside a horn, a flood under a deck. And `npm run check:models` (CI's `build` job)
rebuilds every hull and every structure in a scratch directory and fails on any part that
differs from the committed GLB, so a faction module cannot be edited without the models it
moves being re-run and committed with it.

**Neither holds a port to the model it ported.** A port replaces the hand-exported binary
with the script's own output, so from that commit on the round-trip check is comparing the
script against itself, and a shape the port moved moved in both halves at once. The only
witness to what the hull used to be is the pre-port binary in git history:
`node tools/hull-models/diff.mjs <slug>` reads it back, divides out the one uniform root
scale a metre-true port is expected to introduce, and lists what survives — per part, in
metres, with triangle-count and ordering changes called out separately. It is not a gate
and fails nothing: a port is allowed to move a bound, and only a reader can say whether a
given millimetre was a transcription or a decision. It exists so that reading costs a
minute, because the alternative is what #594 demonstrated — three shape decisions, green
on every gate, because every gate was reading the file the port had already rewritten.
`node tools/hull-models/parts.mjs <model.glb>` is the reader on the other side of a port:
it prints a committed file the way a script is written — each node's transform, which
primitive its buffer is, every material with its finish — so a port is transcribed from
the file rather than from an issue's description of it.

**The plan outline is drawn once.** A kind with an approved model no longer carries its
plan shape twice — once in the GLB and once typed out by hand as `HULL_OUTLINE` fractions.
`tools/hull-maps/outlines.mjs` cuts each model's plan section from the GLB, normalised as
the bake normalises it, smooths off anything narrower along the hull than a couple of
metres (a spine, a folded limb — a return is the mass of the hull, not its bristles) and
writes the result into `packages/frontend/src/game/hullOutlines.generated.ts`, which is
committed and which the same round-trip check holds to the models. The runtime still reads
an array for all thirty-six kinds — generated for the modelled ones, hand-drawn for the
rest — and never a GLB, because the outline is what a TRACK is drawn with under the
Asymmetric Fidelity Law — its threat-red edge always, and the whole shape whenever the
sprite is not there to fill it — and has to be free.

**Fallback:** a unit or structure with no approved model bakes procedurally — units from a
distance-transform heightfield guessed from `HULL_OUTLINE`, clad in
[Plate V](concept-art/plate-05-submarine-classes.png); structures from slab-and-landmark
architecture. That is an intended state for unfinished art, not a third art style: the
procedural and model-backed paths share one lighting model (`bake.ts`) precisely so the
two cannot drift into different-looking navies.

**The environment branch.** Environment props — kelp clusters, vent chimneys, ruin
blocks, crags — enter through the same front door and ship by a shorter road, because a
prop is a mesh, not a sprite:

```text
Claude Design prompt kit          docs/asset-prompts-3d.md   (Block 4 — ENVIRONMENT)
        │
        ▼
GLB export → hull-intake bake     .claude/skills/hull-intake --category env
        │                         (validates scale, tris, materials, licensed light)
        ▼
Approved model committed          docs/concept-art/models/env-*.glb
                                  (written by tools/hull-models/props/, #869)
        │
        ▼
Runtime instancing                packages/frontend/src/game/environment registry
                                  (deterministic scatter from the terrain grid;
                                  no offline map render — props have no chart presence)
```

Props never appear on the sonar scope or in the sprite bake: they are world dressing,
render-only by the same law as the seabed's detail relief, and the scope stays the flat
chart. Their procedural fallback is the seabed bake itself — a biome with no approved
props reads through relief and mottle alone.

The front door admits one design. Every `env-*.glb` in `docs/concept-art/models/` is a
Claude Design model from the Block 4 batch, intaken with `--category env` against its
row's footprint, cap and licensed light and committed slug for slug; the registry, the
placement rules and the kelp sway read the file, never its author. Since #869 each file
is written by a script under `tools/hull-models/props/` that ports its approved model
part for part, as Phase 3 of #540 ported the roster, so `npm run check:models` holds the
script and the file together and `diff.mjs` reads a port against the Claude Design
binary in git history. A deterministic generator stood in for that batch while the
runtime was ahead of it, and was retired when the last row landed. A port is not that
generator come back: it writes the approved model, not a stand-in. A row with no
approved model is an absence, and the biome reads through relief and mottle alone,
which is the fallback above. Replacing a model goes through its script: port the new
export into it, run it, intake, commit the GLB with the script, and update the registry
row's triangle count. The run-game screenshot in the PR is its review.

## The gates

### 1. Model-backed or deliberately procedural — no third path

Every shipped visual either bakes from an approved model in `docs/concept-art/models/` or
uses the documented procedural fallback. No hand-painted one-off sprites, no
per-unit special-case rendering code, no "temporary" art that bypasses the shared bake.
Vector primitives are legal in exactly three places, all deliberate: the loading fallback,
enemy contacts still capped by the Asymmetric Fidelity Law (every tier below Track, and a
Track gone to ghost — gate 5), and construction sites, which read as scaffolding on purpose
until commissioned.

The same law covers the ground. An environment visual is either an approved `env-*` model
instanced by the environment registry, or the documented procedural seabed bake (relief,
mottle, embers) — no hand-placed one-off decor, no per-map special-case dressing code.
Prop *placement* is itself part of the rule: deterministic from the published terrain
grid, identical on every client, and render-only — the simulation never reads where a
prop stands.

### 2. Intake is the gate, not a formality

No GLB enters `docs/concept-art/models/` without passing the **hull-intake** skill's bake
and its review: correct scale against `HULL_LENGTH_M`
(`packages/frontend/src/game/silhouettes.ts`), length on the X axis, and the four-question
consistency checklist in [asset-prompts-3d.md](asset-prompts-3d.md) — faction readable
from silhouette alone at RTS camera distance, glow matched to SIG band, near-black
background with a single hard cyan rim light, and a shape that still reads black-on-black
when running silent. The bake **fails a model with no emissive channel** — a glow-less
hull is a style bug, and only a deliberately dark hull earns the
`--allow-no-emissive` override.

Environment models pass the same gate in its env mode (`--category env`): scale against
the prop's registry `footprintM` instead of `HULL_LENGTH_M` (props have no bow, so no
length-on-X requirement — they stand at a random yaw), triangle and material counts
reported against the registry's budgets (≤ 2 materials; the per-prop triangle cap), and
the emissive rule **inverted** — a prop with any emissive channel fails unless its
world-light family ([style-neon-noir.md](style-neon-noir.md) "World light") licenses it,
because on the ground it is the *glowing* rock that is the style bug.

### 3. Glow encodes loudness — always

Emissive intensity is set from the unit's idle/cruise SIG in [units.md](units.md), per the
band table in [asset-prompts-3d.md](asset-prompts-3d.md): 0–15 SIG is nearly black with
navigation marks only; 61+ burns floodlit. This is a *rule of the world*, not a style
preference — a quiet unit that glows brightly is lying to the player about the Echo Layer,
exactly as a loud unit rendered dark is. Firing bursts may flare; the resting state must
match the number.

The rule is measured, not eyeballed. On the shipped maps, **glow energy** is the sum of
`v / 255` over all emissive pixels (`v` = the max of R, G, B), per 1,000 hull-mask pixels
(albedo alpha > 16), at the record densities of gate 6. There is deliberately no
brightness cutoff in the metric: the renderer shows sub-cutoff light, and a cutoff makes
a large uniformly lit surface — a launch bay, a floodlit deck — impossible to calibrate,
because its energy would jump from everything to nothing at the cutoff instead of
dimming smoothly. The target curve is:

```text
E(SIG) = 0.45 × e^(SIG / 14)
```

anchored so the prototype roster lands at: SIG 6 → 0.7 · 12 → 1.1 · 18 → 1.6 ·
22 → 2.2 · 25 → 2.7 · 28 → 3.3 · 35 → 5.5 · 55 → 23 · 65 → 47.
`tools/hull-maps/build.mjs` normalises every emissive map's *intensity* onto this curve —
light *placement* stays the model's own, per the pipeline of record. A model whose lit
features are too small or dim to reach its target even at maximum gain (×64) fails
review: lit features must read as strips, bars or patches — sub-pixel dots vanish at
sprite scale, and no gain can bring them back.

This gate is scoped to units and structures — the things that have a SIG. Environment
props have none, so the curve has no meaning for them; their light is governed instead by
the world-light families and caps in [style-neon-noir.md](style-neon-noir.md), enforced
at intake by gate 2's inverted emissive rule. The two regimes must never blur: if a piece
of terrain glow starts encoding a number, it has become an instrument and belongs to the
HUD, not the ground.

### 4. Palette discipline — hue belongs to the faction constant

Every colour on screen traces to a source of truth: faction palettes to the four-row table
in [art-direction.md](art-direction.md) (and the identity sheets in
[factions.md](factions.md)), UI chrome to the tokens in
[style-neon-noir.md](style-neon-noir.md). Models are dressed in one faction's palette for
generation, so their hue is **not shippable** — the bake takes the albedo's *luminance*
(this hull's panel, ridge and frill shading) and recolours it in the owning faction's
primary at load time. Never bake a faction hue into a shared shape asset, and never
introduce an unlisted hex value to make one sprite pop.

"Unlisted hex" means one that reaches a **pixel**, which a model's own material colours
never do — both renderers replace them, so the values an approved GLB carries are authoring
conveniences rather than palette entries. What they owe each other instead is consistency:
see "Block 2b — the derived palette" in [asset-prompts-3d.md](asset-prompts-3d.md), which
carries the registry and the one-name-one-value rule.

### 5. The Asymmetric Fidelity Law is a rendering gate

The player's own force renders at full fidelity. The enemy renders **only at the fidelity
their detection earned** — no more, and since #834 no less: a Tier-1 return is a smudge, a
Tier-2 a blurred blob, a Tier-3 a classified disc, and a Tier-4 track the model-backed
sprite, stroked threat-red and drawn only while the track is live.

The gate is **two independent rules**. Lifting one has never lifted the other:

- **Below Tier 4, in every view.** The server attaches `kind` and `faction` no earlier than
  Tier 3, and `hp`/`heading` no earlier than Tier 4
  (`packages/backend/src/sim/systems/echoLayer.ts`, "Fields are attached strictly by
  tier"). A renderer that draws unearned detail has nothing real to draw it *from* — keep
  it that way. No debug path that renders a sprite for a sub-Track contact ships, ever.
  This is the server-authoritative rule in [tech-stack.md](tech-stack.md) wearing a
  renderer's clothes, and it is the half that is absolute.
- **The conn view, at every tier.** Gate 6 spends its 150 draw calls and 250 k triangles on
  the own force, which is what keeps the budget flat — "never an army of contacts". The
  enemy is never geometry there. A billboarded sprite is not a mesh, so Tier 4 earning a
  sprite in the overlay does not touch this; `packages/frontend/test/rendererSmoke.test.ts`
  asserts the conn scene holds nothing about contacts, and that assertion does not move.

**A live track, not a window.** Every contact decays on one twenty-second ghost clock
(`PERSISTENCE.GHOST_MARKER_DECAY_S`). The sprite is drawn only while the track is live —
`PERSISTENCE.LIVE_TRACK_S`, two Echo passes — and falls back to `HULL_OUTLINE` the moment
it ghosts, because a lit hull on a last-known position claims a present tense the Echo
Layer never granted ([ui-ux.md](ui-ux.md) §4). The threat-red stroke survives the change
and is not decoration: a faction's livery can match the biome it is sitting in, and the
edge is what keeps a track readable when it does.

### 6. Performance: one world scene, on measured budgets

The conn view renders the world at runtime — the terrain heightfield and the player's
*own* roster models — inside the budgets the Phase-1 measurement pinned
([three-layer-ocean.md](three-layer-ocean.md)): **≤ 150 draw calls** and **≤ 250 k
triangles** on screen (`mergeByMaterial` collapses each model to one mesh per material),
pixel ratio capped at 1.5, and the `__perspectiveProbe` frame-cost telemetry is how the
number is checked rather than argued about. Only the own force is ever geometry — five
hulls and a dozen structures, never an army of contacts — which is what keeps the budget
flat. The offline bake (`tools/hull-maps/build.mjs`, **4 px/m** units, **1.5 px/m**
structures) remains a contract with `hullTextures.ts` and `structureMaps.ts` (the maps
carry no metadata; pixel size ÷ density *is* the metre extent): it is the loading
fallback and the scope's language, and a change must land in both places at once.
Per-frame relighting of whole rosters and densities that push a structure out of its
memory class are still regressions, and anything drawn per tick is on the 60 Hz budget
([tech-stack.md](tech-stack.md)).

Environment props spend from the same two budgets, on a stated reservation: roughly
**30 draw calls and 105 k triangles** for the whole prop layer, achieved by instancing
(one `InstancedMesh` per prop type per material — instance count never adds draw calls)
under a registry-level instance cap, the `VENT_EMBER_CAP` pattern applied to geometry.
The probe reports the layer separately (`props` / `propTris`) so a prop regression is a
number, not an impression, and a test sums the registry's worst case over the shipped
maps so the reservation cannot be exceeded by accretion. Terrain never rebuilds
per frame: props rebuild only when the ground does.

The water ([art-direction.md](art-direction.md), "Reading the Water") spends **two draw
calls and no triangles**, and its largest term spends neither. The depth-graded fog is a
patch on three.js's global fog shader chunks, so it rides materials that were already
compiled and going to be drawn: a few instructions per fragment, no pass, no overlay
geometry, no second draw of anything. The backdrop is one screen-filling pair of triangles
that replaces a clear, and the marine snow is one `Points` cloud whose wrap, sink, fade and
sizing all happen in its vertex shader — three uniform writes a frame rather than three
thousand, which keeps it off the CPU half of the frame as well as this one. The Ventfront
measurement across the pitch band is 41–54 calls and 143–148 k triangles (#836), against
34–52 before it. A water term that grew a render target, or that re-shaded the scene in a
second pass, would be the regression.

The acoustic veil ([ui-ux.md](ui-ux.md) §4.5) is on this budget by costing nothing on it.
The ground is already one unlit mesh carrying a baked map, so the veil rides it as a
**vertex colour** and the props as an instance colour — no pass, no overlay geometry, no
second draw of the seabed. It is written on the 5 Hz Echo tick rather than per frame,
because where the fleet's ears are is a 5 Hz fact; and with the setting at 0 the writing
stops after the one pass that puts the colour back. A veil that grew a render target, or
that re-shaded the ground per frame, would be the regression — and a veil used as a
*reason to draw less* would be a worse one: the ground under it still exists, still
raycasts, and still gets its props.

Own ordnance is instanced the same way (`ordnanceLayer.ts`, [art-direction.md](art-direction.md)
"Own ordnance is geometry too"): one body and one lamp mesh per kind and one line object
for every torpedo's trail — nine draw calls at most for any number of shots, none for a
kind with nothing in the water — sharing the fleet's depth cues, and reported by the
probe as `ordnance`.

The fleet's depth cues follow the same rule (#434). Every own hull hangs over a ground
shadow on a plumb line — the cue that makes the water column readable — and each used to
be its own line and its own disc: two draw calls per hull, ninety-six at the berth
ceiling, against the one hundred and fifty the whole frame has. They are one
`LineSegments` and one `InstancedMesh` now (`depthCues.ts`), two draw calls for the
whole fleet, updated in place from wherever the hull is drawn; the probe's `drawCalls`
is where the difference shows. And a ground delta no longer rebuilds the world: a
collapsed span moves the vertices within a cell of itself and re-shades those cells
and a ring on the seabed canvas the join baked, on the seed and the depth ramp the join
set — so the arch falls and nothing else on the map re-textures.

#### The wall-clock half: the review drive

Both budgets above are **counted geometry**, and counted geometry has been honest about
the GL pass and silent about the rest of the shipped frame. Since the Phase-5 switch the
frame is composited from two painters — the three.js world, and a transparent Pixi overlay
that re-projects every ring vertex, symbol and route through the same camera on the CPU —
and the second one spends no draw calls and no triangles. It is priced in milliseconds or
not at all. The floor that pricing protects is real: [SETUP-ANDROID](../SETUP-ANDROID.md)
promises the whole game, server included, on-device in Termux.

So the probe reports the frame three ways, per **station**:

| Reading | What it is |
| --- | --- |
| `avgFrameMs` / `worstFrameMs` | The interval between shipped frames — what a player feels |
| `avgConnMs` / `worstConnMs` | Time inside the conn view's `renderFrame`: entity sync and the GL submit |
| `avgOverlayMs` / `worstOverlayMs` | Time inside the overlay's `draw`: the projection and re-issue of every mark |

The two halves do not sum to the interval and are not meant to — the gap is Pixi's own
rasterisation, the browser's compositing, and whatever idle a frame finished early enough
to have. They are separate because every remedy this gate would reach for (quantising ring
redraws to the 5 Hz sonar grid, dropping `CIRCLE_SEGMENTS` at far zoom, culling marks
against the ground quad before projecting) acts on the overlay half alone. A single number
would be real and still could not choose among them.

A **station** is a held view, and it is a hard boundary rather than a moment:
`window.__perspectiveStation('<label>')` zeroes all three series and returns the reading of
the station it just closed, so a worst case never survives into the station after it and an
average never blends the station before it. The reading carries `stationFrames` and
`avgFrames` for exactly this reason — the average runs on a 240-frame window, which is four
seconds at 60 fps and twelve on a floor that manages twenty, so an average taken from a
station shorter than its window is its tail rather than the whole of it, and the two counts
say which happened rather than leaving it to be assumed.

The drive is five stations, chosen because each loads a different part of the frame:

| Station | What it loads |
| --- | --- |
| `base` | The opening view. The floor every other station is read against |
| `marquee` | The fleet selected: a signature ring per hull, conforming to the terrain |
| `ping-preview` | Alt held — two more projected rings per selected hull, the polyline worst case |
| `survey-zoom` | Dollied out, where `CIRCLE_SEGMENTS` is spent on rings a few pixels across |
| `fight` | Own ordnance in the water and hulls under orders, so the force layer is on the frame cadence rather than held by its layer stamps |

`.claude/skills/run-game/scripts/stations.mjs` walks all five and prints the table
(`drive.mjs --steps`, `STATION_SECONDS` to lengthen the dwell). Where Playwright will not
run — which includes most Termux setups — `.claude/skills/run-game/scripts/stations-console.js`
is the same five as a paste into the page's own console, reached from a PC over USB
debugging, and it reads the same two calls.

**None of the figures in the Phase-1/2/5 records are candidates.** Every one of them was
taken under SwiftShader in a container, which is the software rasteriser rather than the
scene: the container's composited frame runs ~170 ms while the two CPU halves it contains
total under 3 ms, so what those figures measured was almost entirely the thing that will
not be there on a GPU.

The first real-GPU reading (#286) is a desktop: a GTX 1070 through ANGLE/Direct3D 11 and an
i7-6700K, Edge driven headed by `stations.mjs` at 1440×900 on a 60 Hz display, eight seconds
a station, against the dev build with the server on the same machine:

| Station | fps | Frame avg / worst ms | Conn avg / worst ms | Overlay avg / worst ms | Draw calls | Triangles |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `base` | 57.0 | 17.55 / 24.8 | 0.62 / 1.3 | 1.39 / 2.7 | 42 | 140,920 |
| `marquee` | 57.1 | 17.52 / 24.6 | 0.59 / 1.0 | 1.58 / 2.6 | 42 | 140,920 |
| `ping-preview` | 57.1 | 17.53 / 23.7 | 0.63 / 1.3 | 1.68 / 3.1 | 42 | 140,920 |
| `survey-zoom` | 57.0 | 17.52 / 24.6 | 0.62 / 1.0 | 1.64 / 2.5 | 42 | 140,920 |
| `fight` | 57.0 | 17.54 / 25.5 | 0.68 / 1.3 | 1.74 / 3.0 | 44 | 141,208 |

What it says: both painters together spend **under 2.5 ms on average** at every station,
and their worst cases sum to under 4.5 ms, against a 16.7 ms display interval. The overlay
is the larger half, as expected, and it grows from `base` to `fight` by a third of a
millisecond. On this floor the frame is paced by the display rather than spent by the
scene, so no remedy on the list above is demanded, and none lands.

One reading does not come from the scene, and it is recorded rather than explained away.
Two drives on the same machine the same hour held **60.0 fps** at every station with the
same two halves, and two later drives held ~57. A shortfall that is identical at the idle
`base` and the loaded `fight`, while neither half moves, is frame pacing on the machine
rather than cost in the frame. The split is what makes that distinction possible.

The same drive found a fault in the instrument itself. The probe used to drop any interval
over 500 ms as a hidden tab, and a three-second stall in plain view was reported as a
station whose worst frame was 17.7 ms. It now drops an interval only when the page actually
went hidden, and [invariants.md](invariants.md) lists that as the conn probe's rule.

**The Termux row is still owed.** It belongs here and in the Phase-5 record
([three-layer-ocean.md](three-layer-ocean.md)) once taken, and until then this gate bounds
the desktop frame and says out loud that it does not bound the floor.

### 7. Readability outranks richness

RTS readability beats realism, at every zoom the camera allows: faction from silhouette,
state from glow, threat from motion. If a detail survives only at full zoom, it is model
garnish, not game information — fine to keep in the bake, never a reason to raise texture
density. The glance test for any new visual: can a player who has read nothing tell *whose*
it is, *how loud* it is, and *whether it is theirs* in under a second?

The acoustic veil is held to this gate rather than excused from it. It is a **drain, not a
blur and not a blackout**: at its floor the chart still carries its ridges, its biome
boundaries and its route lines, and a player can still plan a move into water they cannot
hear — which is the whole point of a chart both navies own. A veil that hid the seabed the
player has already learned would read as a broken renderer rather than as dread
(`CLAUDE.md`), and it would be re-fighting [ui-ux.md](ui-ux.md) §5's settled "no
explored/unexplored state" by another route. The review question is one question: **can
you still route through the cold corner?** If not, the floor is too deep.

"At every zoom" is load-bearing, and true metre scale cannot satisfy it on its own: a 60 m
hull against kilometres of ground is a speck at survey distance. The conn view answers with
the far-zoom readability scale specified in [art-direction.md](art-direction.md) ("Camera &
Projection") — one view-wide factor that draws the fleet larger than the ground as the
dolly pulls back, clamped to exactly 1 at close zoom and render-only by rule. A new hull or
structure passes this gate at survey zoom *with* that scale applied; it does not get to
fail the glance test and call the scale someone else's problem.

### 8. Projection discipline — one camera, honest geometry

The camera spec in [art-direction.md](art-direction.md) ("Camera & Projection") is a gate,
not a mood note. The world renders through **one** perspective camera — freely aimed by the
player within its spec'd bands ([free-camera.md](free-camera.md) §4) — and everything that
carries gameplay information projects through that same camera: the Pixi mark layer asks it
(`projectPoint` / `resolveGround`) and never keeps a projection of its own. Measurements
conform, symbols billboard — a range ring is sampled onto the terrain so equal metres read
as the same water, while contact marks, bars and glyphs face the screen at local scale —
and no drawing path may approximate a ring as a screen ellipse or flatten a measurement it
should project. The gate's content was always that nothing keeps a *second* projection, and
that is what freeing the camera does not touch.

What the freedom adds is a wider judgement: every gate judged "at every zoom the camera
allows" is now judged at every **angle** it allows too. A fleet legible at 55° may not be
legible at 12°, and a draw-call budget met looking down may not be met looking along, where
half the map is in frame.

An **atmosphere pass** (vignette, sway, parallax fog, chromatic split) still may not tilt,
shear or rotate the projection — sway is translation only. The player may turn the camera;
an effect may not, because an effect that bends a range ring has crossed from mood into
misinformation. The sonar scope stays the flat chart, and its camera box is the view's true
ground footprint: a trapezoid, because that is what a tilted camera honestly sees — and
under a free yaw it is also the compass, its far edge drawn heavier to say which way the
camera faces.

## What `npm test` holds, and what only a screenshot can

The gates above are reviewed by looking at the picture, because most of them are claims
about the picture. Two things are not: whether the renderers *boot*, and whether a frame
costs what it costs. Those are now held by a headless smoke test in the ordinary suite
(`packages/frontend/test/rendererSmoke.test.ts`), which builds both painters against a
canned match — a snapshot with contacts at every tier, a building under construction, a
hull below its Pressure Rating, hazards in three phases — and runs frames against them.

Only the two rasterisers are stand-ins. The Pixi and three.js scene graphs are real, so
what the test verifies is real: the overlay's eight layers are wired in the documented
order, the HUD's labels are built, a frame puts ink on every layer, thirty repeated
frames allocate **no new display object** (identity-checked, not merely counted — a
renderer that rebuilds its marks each frame holds its size while replacing everything in
it), own-force symbols return to their pools the frame after the force leaves while the
contact ghosts correctly outlive it, project-and-resolve round-trips inside one cell,
and teardown detaches every listener it attached.

The shell that owns both painters is held the same way
(`packages/frontend/test/gameCanvas.test.ts`). React renders to an object tree rather than
a DOM there, and the two host elements come from the same stubs, so what is checked is the
thing a composition root gets wrong: a server message that reaches the chart but not the
conn view, a snapshot that never reaches the mix, a device left open on unmount. It also
covers the two paths a screenshot review can never reach — a machine that can take a
screenshot has a GPU and a person to touch the page — namely that a client which finds no
WebGL says so and **takes no seat**, and that the mix stays silent until the first gesture
and opens on it.

Its budgets are **counted**, never timed — display objects, draw instructions, scene
objects, index counts — for the reason `packages/backend/test/match.test.ts` argues at
length about the simulation's budgets: a wall-clock maximum is the noisiest statistic a
shared runner produces, and a count is a property of the algorithm.

What it cannot hold is everything the gates are actually about. It has no GPU, so it
renders nothing; it decodes no art, so every hull is on its vector-fallback path; and it
would pass happily on a frame that drew the whole scene in the wrong colour, at the wrong
scale, or on top of the HUD. The gate-6 draw-call and triangle budgets are still read off
`__perspectiveProbe` in a real browser via the **run-game** skill, and the screenshot in
the PR is still how a visual change is reviewed. The smoke test's job is to make sure
there is a picture to review.

## Review checklist for any PR that touches visuals

- [ ] New or changed hull/structure art goes through the pipeline of record (gate 1) —
  no bypasses, no one-offs
- [ ] Any new GLB passed hull-intake, and its four review maps were actually looked at
  (gate 2); environment models went through `--category env` and their light is inside a
  licensed world-light family
- [ ] Environment dressing is registry-instanced or seabed-baked — no hand-placed decor —
  and its placement is deterministic and render-only (gate 1)
- [ ] Emissive matches the unit's SIG band in [units.md](units.md), and the shipped maps
  sit on the gate-3 energy curve (`node tools/hull-maps/build.mjs` reports it)
- [ ] Every colour traces to a documented palette or token; no new hex values outside the
  style docs (gate 4)
- [ ] Enemy-facing rendering still caps at tier fidelity; own-force-only detail stayed
  own-force-only (gate 5)
- [ ] Draw calls and triangles stay inside the gate-6 budgets (`__perspectiveProbe`
  reports them), and the map density contracts (`4` / `1.5` px/m) are untouched or
  changed on both sides at once
- [ ] World marks still project through the conn camera — measurements conform, symbols
  billboard, no second projection, atmosphere effects stay screen-space and rotate
  nothing (gate 8)
- [ ] Gates 6 and 7 still hold **across the pitch band**, not only at the 55° home frame —
  a shot at 12° has far more map in it than a shot at 55° (gate 8)
- [ ] `npm test` still passes, including the headless renderer smoke test — a change that
  boots, pools and tears down correctly is the floor a screenshot review starts from
- [ ] Screenshot in the PR, taken via the **run-game** skill — a visual change is reviewed
  by looking at it, not by reading its diff
- [ ] If the change alters what things *should* look like (not just how they are built),
  [art-direction.md](art-direction.md) or [style-neon-noir.md](style-neon-noir.md) was
  updated first, per the docs-are-canonical rule

## Related

- [art-direction.md](art-direction.md) — what things look like: palettes, silhouette law,
  the Asymmetric Fidelity Law this doc enforces
- [style-neon-noir.md](style-neon-noir.md) — presentation tokens and the glow recipe
- [asset-prompts-3d.md](asset-prompts-3d.md) — the prompt kit, SIG glow bands, and model
  consistency checklist
- [units.md](units.md) — the SIG numbers glow is set from
- [tech-stack.md](tech-stack.md) — the performance budgets gates 5–6 live inside
