---
name: hull-intake
description: Validate a 3D model export (GLB) — unit, structure, or environment prop — and bake the top-down review maps (albedo, normal, emissive, height) plus a report of what the export actually contains. Use this whenever a GLB or glTF model arrives (from Claude Design or anywhere else), when asked to check, inspect, convert, import, or "bring in" a 3D model, and for environment props via --category env. Prefer this over improvising a three.js/Blender setup by hand — there is no Blender in this container, and this harness is already verified against the repo's Playwright/Chromium setup.
---

# Hull intake — from GLB export to repo assets

Claude Design (and most 3D tools) export GLB, and GLB is the format of record
here rather than OBJ+MTL because glTF carries a first-class emissive channel
and MTL drops it — emissive is the style: glow encodes loudness
(`docs/style-neon-noir.md`). Since the three-layer-ocean revision the game
**does** load approved GLBs at runtime — the conn view renders own-force
hulls and structures as meshes (`rosterModels.ts`) and environment props as
instanced meshes (`environmentModels.ts`) — while the baked maps remain the
loading fallback and the sonar scope's sprite language
(`packages/frontend/src/game/hullTextures.ts`). Intake is the one gate both
paths pass through (`docs/graphics-standards.md` gate 2).

## 1. Bake

```bash
node .claude/skills/hull-intake/scripts/bake.mjs <model.glb> \
  --length-m <metres> --out /tmp/hull-intake/<unit>
```

`--length-m` is the design hull length from `HULL_LENGTH_M` in
`packages/frontend/src/game/silhouettes.ts` (Light Scout 60, Corvette 80,
Cruiser 130, Abyssal Submersible 95, Harvester 75). The harness rescales the
export to it, auto-rotates if the exporter put length on Z instead of X, and
renders four top-down orthographic passes in headless Chromium
(three.js is fetched once into a temp prefix; nothing is added to the repo):

| Map | What it is | Why it exists |
| --- | --- | --- |
| `albedo.png` | Unlit base colour, transparent ground | Hull cladding + free sprite mask |
| `normal.png` | World-space normals | Per-pixel relighting in faction palette |
| `emissive.png` | Emissive channel only, black ground | The glow layer — bright = loud |
| `height.png` | Depth from above, bright = high | Replaces the distance-transform guess |

`meta.json` records mesh/material inventory, sizes, the scale applied, glow
energy (the gate-3 metric in `docs/graphics-standards.md`), and warnings.
Default `--ppm 2` (pixels per metre) matches sprite scale; raise it for
archival maps. `--glow-e <target>` calibrates the emissive map onto a target
glow energy — `tools/hull-maps/build.mjs` passes it from the unit's SIG, so
intake runs measure raw and the shipped maps land on the curve.

**The bake fails if no material is emissive** — that almost always means the
export dropped the channel, and a glow-less hull is a style bug, not a
preference. Re-export before overriding with `--allow-no-emissive` (only a
deliberately dark hull earns the override).

## 2. Look at the maps — this is the review, not a formality

Open the four PNGs (the Read tool renders them). Check against the
consistency checklist in `docs/asset-prompts-3d.md`, and specifically:

- **emissive**: are the lights where the design says, and does the reported
  glow energy sit near the unit's gate-3 target? Intensity is normalised by
  the pipeline, but placement is not — a Light Scout showing more than
  navigation marks is wrong, and a hull whose energy undershoots even at max
  gain needs its lights reworked as strips, bars or patches.
- **albedo**: faction palette, not generic grey; silhouette readable at
  actual sprite size (the default bake IS actual size — squint test it).
- **height**: raised features (fins, domes, spines) visibly brighter than
  the deck; a flat uniform grey means the model has no relief to light.
- **meta.json warnings**: a Z→X rotation warning means verify the bow points
  +X; a rescale warning is harmless but note the factor.

## 3. File it

Approved model → `docs/concept-art/models/<unit>-<faction>.glb` (flat
naming, beside the plates it descends from). The maps are cheap to re-bake,
so commit the GLB, not the PNGs, unless a doc embeds one.

Wiring the maps into `hullTextures.ts` is a separate, deliberate code change
— don't do it as a side effect of intake. Once that wiring exists, verify in
the real client with the `run-game` skill.

## Environment props — `--category env`

Environment models (the Block 4 kit in `docs/asset-prompts-3d.md`: kelp
clusters, vent chimneys, ruin blocks, crags) pass the same gate in its env
mode:

```bash
node .claude/skills/hull-intake/scripts/bake.mjs <env-model.glb> \
  --category env --footprint-m <metres> --out /tmp/hull-intake/<slug> \
  [--world-light <vent|flora|crystal>]
```

What changes against the hull run, per `docs/graphics-standards.md` gate 2:

- **`--footprint-m` replaces `--length-m`** — the registry `footprintM` from
  `packages/frontend/src/game/environment.ts` (and the Block 4 table). Scale
  is held on the larger horizontal axis; there is no length-on-X yaw, because
  a prop has no bow and stands at a random yaw per instance.
- **The emissive rule is inverted.** Any emissive **fails** unless
  `--world-light` names the family Block 4 licenses for this prop — on the
  ground, the glowing rock is the style bug. `--glow-e` is rejected outright:
  props have no SIG, and gate 3 does not apply to them.
- **Budgets are checked**: triangles against `--max-tris` (default 800, the
  registry fence) and distinct materials against `--max-materials` (default
  2 — each material is a draw call per instance batch, gate 6).

Review reads the same four maps (the height and albedo passes are the
silhouette check from the 55° camera's point of view), but they are **review
artifacts only** — props ship as the GLB itself, instanced at runtime, and
never appear in the sprite bake or on the sonar scope. File approved props as
`docs/concept-art/models/env-<biome-word>-<thing>.glb`, then add the
registry row in `environment.ts` (slug, footprint, triBudget from the meta,
density, eligibility) as its own deliberate change, and verify with
`run-game` plus the probe's `props` / `propTris` numbers.

## Self-test (no model yet?)

```bash
node .claude/skills/hull-intake/scripts/make-test-glb.mjs /tmp/test-hull.glb
node .claude/skills/hull-intake/scripts/bake.mjs /tmp/test-hull.glb \
  --length-m 60 --out /tmp/hull-intake/self-test
```

The fixture is an elongated hull with one emissive nav light: a correct run
prints four map paths, reports `1 emissive`, warns about the ×15 rescale, and
the emissive map shows exactly one green dot on black.
