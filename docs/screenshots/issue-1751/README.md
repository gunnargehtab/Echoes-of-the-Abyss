# Free water: the kelp forest (#1751)

Evidence for the kelp part of the feel pass
([free-water-slice.md §9](../../free-water-slice.md#9-feel-pass-the-approved-look-target),
"Kelp"). One placement change, study-only: §5's authored list and `freeWaterPlacements`
in `packages/frontend/src/game/freeWaterDecoration.ts` now carry 60 kelp stands in two
rows on each flank of the clearing at one 125 m pitch, the inner rows 5 m from its edges,
and the 16 retained clusters behind the forest at the garden's north edge. The prop
reservation is 600,000 triangles (§7). No model, scale, material or shipped map changes.

## Reproduce

Run the dev servers, then the frames module. It walks §9's four poses and three of this
issue's own, drags a continuous middle-button pan along the clearing, and writes the
probe's reading of each frame beside it:

```bash
node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1751/after --steps docs/screenshots/issue-1751/frames.mjs
SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' FRAMES=garden-close,garden-east PAN=0 \
  node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1751/reduced-motion --steps docs/screenshots/issue-1751/frames.mjs
CONTROL=1 PAN=0 node .claude/skills/run-game/scripts/drive.mjs \
  --url 'http://localhost:5173/?map=kelp-labyrinth' \
  --out docs/screenshots/issue-1751/control-after --steps docs/screenshots/issue-1751/frames.mjs
```

`before/` and `control-before/` are the same runs against the base commit (043bf6d67),
with `PROPS=184` for the base's list. The after, reduced-motion and control sets were
captured at d32aecb14, the commit that changes the list.

## The frames

| Row | Before | After | Reads as |
| --- | --- | --- | --- |
| Garden close, 1,875 / 1,125, 250 m, 12°, 275 m, `yawDeg` 90 | [before](before/03-garden-close.png) | [after](after/03-garden-close.png) | One forest on both flanks of a bare clearing, the near stands parted from the far ones by the water. Before, the south flank (left) was the four clusters' cell and the north flank one row set back from the edge |
| Garden east, 1,375 / 1,125, 250 m, 12°, 275 m, `yawDeg` −90 | [before](before/04-garden-east.png) | [after](after/04-garden-east.png) | The same clearing from its west end: both flanks filled to the edge, the canopy continuous along each |
| Bowl, 2,000 / 2,000, 4,500 m, 70°, seabed | [before](before/07-bowl.png) | [after](after/07-bowl.png) | The owner's kind of pose. Before: three thin strips along the north edge. After: two bands with the clearing as the one cut between them |
| Opening, 760 / 1,650, 240 m, 15°, 300 m, `yawDeg` −34 | [before](before/02-opening.png) | [after](after/02-opening.png) | Of #1752's kind, low behind the scout toward A: the garden's south flank as a dark canopy beyond the water's reach at upper right, denser after. #1752 sets the pose and judges the row |
| Home, 542 / 1,958, 2,600 m, 55°, seabed | [before](before/01-home.png) | [after](after/01-home.png) | The opening row's before pose: the garden's two bands at upper right instead of three strips |
| Low, 2,000 / 2,000, 1,600 m, 12°, 850 m | [before](before/05-low.png) | [after](after/05-low.png) | Unchanged: no stand is in frame from the bowl's floor, and the water reads as it did |
| Survey, 2,000 / 2,000, 10,000 m, 88°, seabed | [before](before/06-survey.png) | [after](after/06-survey.png) | Decoration below tactical ink, the ink unchanged; the garden's bands under it |

The clearing row `y=1,000..1,250` holds no stand: the test's clearance check now adds the
4 m sway to the 60 m plan radius, and the inner rows stand at `y=935` and `y=1,315`. Stands
are at canonical scale throughout (`scale` 1 on every placement).

## What the probe read

| Pose | Props before → after | Prop triangles before → after | Frame triangles before → after | Calls |
| --- | --- | --- | --- | --- |
| Home | 184 → 204 | 387,952 → 566,512 | 405,088 → 583,648 | 43 → 43 |
| Opening | 184 → 204 | 387,952 → 566,512 | 396,719 → 575,279 | 22 → 22 |
| Garden close | 184 → 204 | 387,952 → 566,512 | 402,015 → 580,575 | 30 → 30 |
| Garden east | 184 → 204 | 387,952 → 566,512 | 396,719 → 575,279 | 22 → 22 |
| Low | 184 → 204 | 387,952 → 566,512 | 397,119 → 575,679 | 25 → 25 |
| Survey | 184 → 204 | 387,952 → 566,512 | 405,088 → 583,648 | 44 → 44 |
| Bowl | 184 → 204 | 387,952 → 566,512 | 405,088 → 583,648 | 44 → 44 |
| Control, low | 363 → 363 | 104,958 → 104,958 | 160,006 → 160,006 | 75 → 75 |
| Control, survey | 363 → 363 | 104,958 → 104,958 | 163,878 → 163,878 | 76 → 76 |

The 20 stands add 178,560 triangles (20 × 8,928) and no call: the stands share one
instanced batch. Every study frame stays under the 720,000 cap and the props under the
600,000 reservation; the opening list's counts (60, 16, 16, 96, 8, 8) are in each
`readings.json` as `instances`, with the deep fish's 48 photophores.

## Motion, reduced motion and the control

- **Motion.** A continuous middle-drag pan along the clearing while the match runs, 40 px
  of drag a frame, four frames: [clearing-pan-0](after/08-clearing-pan-0.png) to
  [clearing-pan-3](after/11-clearing-pan-3.png), with the page clock, focus and eye per
  frame in `readings.json`.
- **Reduced motion.** [reduced-motion/01-garden-close.png](reduced-motion/01-garden-close.png)
  and [02-garden-east.png](reduced-motion/02-garden-east.png), with the sway held as
  docs/ui-ux.md §11 asks (`sway: held` in its `readings.json`).
- **Kelp Labyrinth control.** [control-before](control-before/readings.json) and
  [control-after](control-after/readings.json) at the low and survey poses: the same
  props, triangles and calls. `freeWaterDecoration.test.ts` holds the stronger claim: the
  registry's placement on the control is unchanged by the fixture's rows.

## Hardware and what is open

These frames come from this container's software rasteriser (SwiftShader, in each
`readings.json`), which is why no millisecond is recorded here. The study's GPU rows,
unpaced and queued at DPR 1 and 1.5 on named hardware, are
`docs/screenshots/issue-1713/gpu.mjs` run as its README says, with its prop count and
reservation read against this list (204 props, 600,000); §7 leaves that criterion open
until a GPU reads it.
