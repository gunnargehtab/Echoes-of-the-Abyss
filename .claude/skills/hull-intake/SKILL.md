---
name: hull-intake
description: Validate a 3D unit model export (GLB) and bake the top-down maps the sprite pipeline needs — albedo, normal, emissive, height — plus a report of what the export actually contains. Use this whenever a GLB or glTF model of a unit, hull, or structure arrives (from Claude Design or anywhere else), when asked to check, inspect, convert, import, or "bring in" a 3D model, or when working on replacing the guessed heightfield in hullTextures.ts with real model-derived maps. Prefer this over improvising a three.js/Blender setup by hand — there is no Blender in this container, and this harness is already verified against the repo's Playwright/Chromium setup.
---

# Hull intake — from GLB export to repo assets

Claude Design (and most 3D tools) export GLB. The game never loads 3D at
runtime — the frontend is PixiJS and bakes **sprites** — so intake means
turning the model into the flat maps that
`packages/frontend/src/game/hullTextures.ts` composes: today it *guesses* a
heightfield from the 2D outline (see its header comment); a real model
replaces that guess. GLB is the format of record here rather than OBJ+MTL
because glTF carries a first-class emissive channel and MTL drops it — and
emissive is the style: glow encodes loudness (`docs/style-neon-noir.md`).

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

## Self-test (no model yet?)

```bash
node .claude/skills/hull-intake/scripts/make-test-glb.mjs /tmp/test-hull.glb
node .claude/skills/hull-intake/scripts/bake.mjs /tmp/test-hull.glb \
  --length-m 60 --out /tmp/hull-intake/self-test
```

The fixture is an elongated hull with one emissive nav light: a correct run
prints four map paths, reports `1 emissive`, warns about the ×15 rescale, and
the emissive map shows exactly one green dot on black.
