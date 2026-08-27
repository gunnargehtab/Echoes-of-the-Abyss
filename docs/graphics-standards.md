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

**Fallback:** a unit or structure with no approved model bakes procedurally — units from a
distance-transform heightfield guessed from `HULL_OUTLINE`, clad in
[Plate V](concept-art/plate-05-submarine-classes.png); structures from slab-and-landmark
architecture. That is an intended state for unfinished art, not a third art style: the
procedural and model-backed paths share one lighting model (`bake.ts`) precisely so the
two cannot drift into different-looking navies.

## The gates

### 1. Model-backed or deliberately procedural — no third path

Every shipped visual either bakes from an approved model in `docs/concept-art/models/` or
uses the documented procedural fallback. No hand-painted one-off sprites, no
per-unit special-case rendering code, no "temporary" art that bypasses the shared bake.
Vector primitives are legal in exactly three places, all deliberate: the loading fallback,
enemy contacts (capped by the Asymmetric Fidelity Law), and construction sites, which read
as scaffolding on purpose until commissioned.

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

### 4. Palette discipline — hue belongs to the faction constant

Every colour on screen traces to a source of truth: faction palettes to the four-row table
in [art-direction.md](art-direction.md) (and the identity sheets in
[factions.md](factions.md)), UI chrome to the tokens in
[style-neon-noir.md](style-neon-noir.md). Models are dressed in one faction's palette for
generation, so their hue is **not shippable** — the bake takes the albedo's *luminance*
(this hull's panel, ridge and frill shading) and recolours it in the owning faction's
primary at load time. Never bake a faction hue into a shared shape asset, and never
introduce an unlisted hex value to make one sprite pop.

### 5. The Asymmetric Fidelity Law is a rendering gate

The player's own force renders at full fidelity. The enemy renders **only at the fidelity
their detection earned**: a Tier-1 return is a smudge, a Tier-2 a blurred blob, and even a
Tier-4 track is a resolved flat silhouette carrying `HULL_OUTLINE` — never the model-backed
sprite with its fins and frills. That outline gap is correct asymmetry, not drift: a track
is a sonar return the player earned, and it was never meant to carry the fins. Since the
server only sends resolved contacts (see the server-authoritative rule in
[tech-stack.md](tech-stack.md)), a renderer that draws unearned detail has nothing real to
draw it *from* — keep it that way. No debug path that renders the full enemy sprite ships,
ever.

### 6. Performance: the client ships PNGs, not geometry

The 3D work stays offline. The frontend is PixiJS and loads flat maps rendered by
`tools/hull-maps/build.mjs` at **4 px/m** for units and **1.5 px/m** for structures —
those densities are contracts with `hullTextures.ts` and `structureMaps.ts` (the maps
carry no metadata; pixel size ÷ density *is* the metre extent), so a change must land in
both places at once. Sprites bake once at load time, not per frame. Runtime 3D, per-frame
relighting of whole rosters, or map densities that push a structure out of its current
memory class are all regressions, and anything drawn per tick is on the 60 Hz budget
([tech-stack.md](tech-stack.md)).

### 7. Readability outranks richness

RTS readability beats realism, at every zoom the camera allows: faction from silhouette,
state from glow, threat from motion. If a detail survives only at full zoom, it is model
garnish, not game information — fine to keep in the bake, never a reason to raise texture
density. The glance test for any new visual: can a player who has read nothing tell *whose*
it is, *how loud* it is, and *whether it is theirs* in under a second?

### 8. Projection discipline — gameplay geometry is plan view

The camera spec in [art-direction.md](art-direction.md) ("Camera & Projection") is a gate,
not a mood note. Everything that carries gameplay information — terrain, the cell grid,
movement, detection rings, the ping preview — renders in pure top-down orthographic plan
view: a range ring is a perfect circle on screen, and a metre is the same length in every
direction. No camera rotation ships, and no atmosphere pass (vignette, sway, parallax fog,
chromatic split) may tilt, shear or rotate that projection — sway is translation only.
Hulls get their three-quarter read from per-pixel relief lighting in the shared bake, never
from an oblique render: a sprite's footprint stays exactly its `HULL_OUTLINE`. The gate-6
density contract (pixel size ÷ px/m = metre extent) is plan-view arithmetic and is one of
the reasons this rule cannot be bent locally.

## Review checklist for any PR that touches visuals

- [ ] New or changed hull/structure art goes through the pipeline of record (gate 1) —
  no bypasses, no one-offs
- [ ] Any new GLB passed hull-intake, and its four review maps were actually looked at
  (gate 2)
- [ ] Emissive matches the unit's SIG band in [units.md](units.md), and the shipped maps
  sit on the gate-3 energy curve (`node tools/hull-maps/build.mjs` reports it)
- [ ] Every colour traces to a documented palette or token; no new hex values outside the
  style docs (gate 4)
- [ ] Enemy-facing rendering still caps at tier fidelity; own-force-only detail stayed
  own-force-only (gate 5)
- [ ] Map density contracts (`4` / `1.5` px/m) untouched, or changed on both sides at once
  (gate 6)
- [ ] Gameplay geometry still renders in plan view — rings are circles, no rotation, no
  oblique or tilted rendering path, atmosphere effects stay screen-space (gate 8)
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
