# Free water: the kelp forest (#1751)

Evidence for the kelp part of the feel pass
([free-water-slice.md §9](../../free-water-slice.md#9-feel-pass-the-approved-look-target),
"Kelp"). One placement change, study-only: §5's authored list and `freeWaterPlacements`
in `packages/frontend/src/game/freeWaterDecoration.ts` now carry 56 kelp stands in three
rows north of the clearing and one south, at one 125 m pitch with the inner rows 5 m from
its edges, every stand whole on the garden's 400 m tread, and the 16 retained clusters as
a fringe along the garden's north edge. The prop reservation is 600,000 triangles (§7). No
model, scale, material or shipped map changes.

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
captured at 95b8e8940, the commit that re-lays the list on the tread; the first after set, at
d32aecb14, stood a south outer row on the scarp into the bowl, which round 1's critic
measured, and was replaced.

## The frames

| Row | Before | After | Reads as |
| --- | --- | --- | --- |
| Garden close, 1,875 / 1,125, 250 m, 12°, 275 m, `yawDeg` 90 | [before](before/03-garden-close.png) | [after](after/03-garden-close.png) | One forest on both flanks of a bare clearing, the near stands parted from the far ones by the water. Before, the south flank (left) was the four clusters' cell and the north flank one row set back from the edge |
| Garden east, 1,375 / 1,125, 250 m, 12°, 275 m, `yawDeg` −90 | [before](before/04-garden-east.png) | [after](after/04-garden-east.png) | The same clearing from its west end: both flanks filled to the edge, the canopy continuous along each |
| Bowl, 2,000 / 2,000, 4,500 m, 70°, seabed | [before](before/07-bowl.png) | [after](after/07-bowl.png) | The owner's kind of pose. Before: three thin strips along the north edge. After: a deep band north of the clearing and a row south of it, the clearing the one cut between them, and the scarp into the bowl bare |
| Opening, 760 / 1,650, 240 m, 15°, 300 m, `yawDeg` −34 | [before](before/02-opening.png) | [after](after/02-opening.png) | Of #1752's kind, low behind the scout toward A: the garden's south flank as a dark canopy beyond the water's reach at upper right, denser after. #1752 sets the pose and judges the row |
| Home, 542 / 1,958, 2,600 m, 55°, seabed | [before](before/01-home.png) | [after](after/01-home.png) | The opening row's before pose: the garden's bands at upper right instead of three strips |
| Low, 2,000 / 2,000, 1,600 m, 12°, 850 m | [before](before/05-low.png) | [after](after/05-low.png) | From the bowl's floor looking north, the garden's south row of stands stands along the top of the far scarp, on the tread, in both frames: before, only at its two ends, with its envelopes reaching over the scarp's edge; after, across the whole width. The water reads as it did |
| Survey, 2,000 / 2,000, 10,000 m, 88°, seabed | [before](before/06-survey.png) | [after](after/06-survey.png) | Decoration below tactical ink, the ink unchanged; the garden's bands under it |

The clearing row `y=1,000..1,250` holds no stand: the test's clearance check now adds the
4 m sway to the 60 m plan radius, and the inner rows stand at `y=935` and `y=1,315`. Every
stand's envelope lies where all four surrounding cell centres are the garden's tread, and
the eroded floor under it stays within 40 m of its root (`freeWaterDecoration.test.ts`,
reading `seabedDepthAtM` as the view does; the measured worst case is 26 m). Stands are at
canonical scale throughout (`scale` 1 on every placement).

## What the probe read

| Pose | Props before → after | Prop triangles before → after | Frame triangles before → after | Calls |
| --- | --- | --- | --- | --- |
| Home | 184 → 200 | 387,952 → 530,800 | 405,088 → 547,936 | 43 → 43 |
| Opening | 184 → 200 | 387,952 → 530,800 | 396,719 → 539,567 | 22 → 22 |
| Garden close | 184 → 200 | 387,952 → 530,800 | 402,015 → 544,863 | 30 → 30 |
| Garden east | 184 → 200 | 387,952 → 530,800 | 396,719 → 539,567 | 22 → 22 |
| Low | 184 → 200 | 387,952 → 530,800 | 397,119 → 539,967 | 25 → 25 |
| Survey | 184 → 200 | 387,952 → 530,800 | 405,088 → 547,936 | 44 → 44 |
| Bowl | 184 → 200 | 387,952 → 530,800 | 405,088 → 547,936 | 44 → 44 |
| Control, low | 363 → 363 | 104,958 → 104,958 | 160,006 → 160,006 | 75 → 75 |
| Control, survey | 363 → 363 | 104,958 → 104,958 | 163,878 → 163,878 | 76 → 76 |

The 16 stands add 142,848 triangles (16 × 8,928) and no call: the stands share one
instanced batch. Every study frame stays under the 720,000 cap and the props under the
600,000 reservation; the opening list's counts (56, 16, 16, 96, 8, 8) are in each
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

## Hardware

The frames above come from a software rasteriser (SwiftShader, in each `readings.json`),
so they carry no millisecond. The GPU rows below are `docs/screenshots/issue-1713/gpu.mjs`
run as its README says: an NVIDIA GeForce GTX 1070 through Edge/ANGLE D3D11, unpaced,
animation running, every window at least 240 samples. Its prop count and reservation are
read against each revision's list: 184 under 400,000 before, 200 under 600,000 after.
Each revision was read twice at each DPR, interleaved with #1752's, and the table gives
the mean of the two runs. `before` is the base, 043bf6d6; `after` is the merge, c3cef492.
The raw runs are `gpu/{before,after}/dpr-{1,1.5}/run-{1,2}.json`, for example
[gpu/after/dpr-1/run-1.json](gpu/after/dpr-1/run-1.json).

| Station | Triangles, before → after | DPR 1 GPU / queued ms, before → after | DPR 1.5 GPU / queued ms, before → after |
| --- | --- | --- | --- |
| Home | 405,088 → 547,936 | 1.01 / 0.93 → 1.17 / 1.07 | 1.69 / 1.63 → 1.89 / 1.81 |
| Garden close | 396,719 → 539,567 | 0.92 / 0.87 → 1.28 / 1.18 | 1.41 / 1.44 → 2.01 / 2.05 |
| Low | 397,119 → 539,967 | 0.90 / 0.84 → 1.05 / 0.98 | 1.38 / 1.30 → 1.52 / 1.49 |
| Survey | 405,088 → 547,936 | 1.04 / 0.80 → 1.09 / 0.90 | 1.49 / 1.33 → 1.59 / 1.46 |

The 16 added stands cost 0.10–0.31 ms queued at DPR 1 and 0.13–0.61 ms at DPR 1.5. The
garden station, which looks along the forest from inside it, rises most: 0.87 → 1.18 and
1.44 → 2.05 ms. Calls are unchanged at 43 / 22 / 25 / 44, since the stands join the
existing instanced batch. Prop triangles read 387,952 → 530,800, under the 600,000
reservation, and every frame stays under the study's 720,000. Two runs of one revision
differ by up to 0.04 ms queued, and the base reproduces #1750's `after` (the same commit,
read an hour earlier) to 0.02 ms. Queue loads read 3.61–3.80 ms, each longer than the
frame it measures.
