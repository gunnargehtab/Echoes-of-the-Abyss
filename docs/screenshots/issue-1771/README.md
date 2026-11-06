# Free water: life where the frames read it (#1771)

Evidence for §5's "Life in the frames"
([free-water-slice.md §5](../../free-water-slice.md#5-place-to-kit-sheet-and-wildlife-licence)).
One placement change, study-only: `freeWaterPlacements` in
`packages/frontend/src/game/freeWaterDecoration.ts` adds 90 bodies to #1713's 128. Four crab
patches, two fry schools and two outer-fish schools are for garden close, and three
deep-fish patches for the low pose. A school now keeps station on one loop
(`FREE_WATER_LIFE` in `packages/shared/src/constants.ts`). No model, scale, material or
shipped map changes, and the opening gets no life (§5).

## Reproduce

Run the dev servers, then the frames module. It shoots the frame the study opens on, then
§9's four poses, garden close twice ten seconds of match apart, and writes the probe's
reading of each frame beside it, with each kit's bodies in the world's band of the window
and the width each draws at:

```bash
MOTION=1 node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
  --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1771/after --steps docs/screenshots/issue-1771/frames.mjs
SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' FRAMES=garden-close MOTION=1 \
  node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
  --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1771/reduced-motion --steps docs/screenshots/issue-1771/frames.mjs
CONTROL=1 node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
  --url 'http://localhost:5173/?map=kelp-labyrinth' \
  --out docs/screenshots/issue-1771/control-after --steps docs/screenshots/issue-1771/frames.mjs
```

`before/` and `control-before/` are the same runs with `main`'s `freeWaterDecoration.ts`
(234d0371) served in place of the branch's, and `PROPS=200`. Every set was taken at
b321a556 on an NVIDIA GeForce GTX 1070 through Edge/ANGLE D3D11, at 1,440 × 900 and DPR 1.
They are GPU frames because SwiftShader frames on this machine carry two black boxes, the
MOVE 3D and camera panels' rects mirrored top to bottom, on `main`'s list as on this one;
the GPU frames carry none.

## The frames

| Row | Before | After | Reads as |
| --- | --- | --- | --- |
| Opening pose, 709 / 1,710, 1,200 m, 15°, 300 m, `yawDeg` −34 | [before](before/02-opening-pose.png) | [after](after/02-opening-pose.png) | Unchanged by design: no water in frame is nearer than about 550 m to the eye, and no body in frame draws wider than 2.8 px |
| Garden close, 1,875 / 1,125, 250 m, 12°, 275 m, `yawDeg` 90 | [before](before/03-garden-close.png) | [after](after/03-garden-close.png) | Before: four crabs at 5 px and 24 fry under a pixel. After: four outer fish crossing the clearing, a fry school as a knot of small fish in the lower half, and crabs as specks on the floor |
| Garden close, ten seconds later | [before](before/04-garden-close-later.png) | [after](after/04-garden-close-later.png) | The schools and the crabs have moved along their loops; the outer fish now face the eye |
| Low, 2,000 / 2,000, 1,600 m, 12°, 850 m | [before](before/05-low.png) | [after](after/05-low.png) | Before: one photophore pinprick at the console's edge. After: three rings of photophore pinpricks along the pocket's north edge, above the camera panel |
| Survey, 2,000 / 2,000, 10,000 m, 88°, seabed | [before](before/06-survey.png) | [after](after/06-survey.png) | Decoration below tactical ink: the new bodies are under a pixel at 10 km, and the photophores faint pinpricks in the pocket |

## What the probe read

Bodies in the world's band, between the top bar and the console and before any panel, and
the widths they draw at, from each `readings.json`'s `life`. Each cell gives the count
before → after, then the widths, before → after where they differ:

| Frame | Crabs | Fry | Outer fish | Deep fish |
| --- | --- | --- | --- | --- |
| Opening pose | 16 → 32, 1.0–1.3 px | 96 → 144, 0.2–0.3 px | 2 → 10, 2.6–2.8 → 2.2–2.8 px | 0 → 12, 1.1–1.2 px |
| Garden close | 4 → 20, 4.8–5.2 → 4.8–11.4 px | 24 → 72, 0.8–0.9 → 0.8–8.5 px | 0 → 8, 14.5–19.7 px | 0 → 0 |
| Low | 16 → 32, about 1 px | 96 → 144, 0.2–0.3 px | 8 → 16, 2.7–4.5 → 2.0–4.5 px | 4 → 22, 1.2–1.6 px |
| Survey | not projected, the focus is on the seabed | | | |

| Pose | Calls before → after | Triangles before → after |
| --- | --- | --- |
| Opening pose | 43 → 43 | 547,546 → 568,010 |
| Garden close | 30 → 30 | 544,863 → 565,327 |
| Low | 25 → 25 | 539,967 → 560,431 |
| Survey | 44 → 44 | 547,936 → 568,400 |

Every frame adds the same 20,464 triangles and no call, since each kit stays one instanced
batch; the prop layer reads 551,264 triangles under the 600,000 reservation, and the
photophores 48 → 156. The before figures are #1752's re-acceptance set's to the triangle.

## How the thresholds were measured

§5's reading distances come from scratch builds that stood each kit at known distances in
front of a pose, shot under SwiftShader and cropped at three times with each tile's kit,
width and distance printed on it. None of those placements is on a commit; the sheets are:

- [garden-148-262m.png](calibration/garden-148-262m.png): outer fish read as fish at 148 m
  (34 px) and 212 m (24 px); crabs at 217–262 m are specks; spread fry at 184 m are 3 px.
- [garden-80-330m.png](calibration/garden-80-330m.png): outer fish still read at 314 m
  (16 px); spread fry at 80 m are faint dashes.
- [garden-tight-fry.png](calibration/garden-tight-fry.png): a tight fry school at 150 m is
  a smudge.
- [opening-school-1190m.png](calibration/opening-school-1190m.png): a 12-fish outer school
  ahead of the hulls at the opening, 1,190 m out at 4.2 px, shows nothing but snow; the
  deep fish's photophores read as pinpricks at 2.3 km.

## Motion, reduced motion and the control

- **Motion.** `after/03` and `after/04` are one camera ten seconds apart: the fry's widest
  body goes from 8.5 to 7.3 px and the outer fish from 14.5–19.7 to 14.0–20.5 px.
- **Reduced motion.** [reduced-motion/02](reduced-motion/02-garden-close.png) and
  [reduced-motion/03](reduced-motion/03-garden-close-later.png), ten seconds apart, read
  the same to 0.1 px, with the sway held.
- **Kelp Labyrinth control.** [control-before](control-before/readings.json) and
  [control-after](control-after/readings.json) read the same: 74, 75 and 76 calls over
  160,006, 160,006 and 163,878 triangles, 363 props.
- **Tests.** `freeWaterDecoration.test.ts` holds every new patch inside its frame over its
  whole loop and every swimmer above the drawn floor; moving the near fry school to
  2,060 / 1,095, or a deep patch to 2,150 / 1,580, fails each.

## Hardware

The GPU rows are `docs/screenshots/issue-1713/gpu.mjs` run as its README says: the GTX 1070
through Edge/ANGLE D3D11, unpaced, animation running, every window at least 240 samples.
Each revision was read twice at each DPR, the two interleaved, and the table gives the mean
of the two runs, in [gpu/](gpu/) as `{before,after}/dpr-{1,1.5}/run-{1,2}.json`. `before`
read `main`'s list with `GPU_PROPS=200 GPU_PHOTOPHORES=48`; `after` the branch's, at its
defaults. `gpu.mjs` pins its own four stations, so its garden close is the yaw-0 station
over 1,875 / 875, not §9's pose.

| Station | Calls | Triangles before → after | DPR 1 GPU / queued ms, before → after | DPR 1.5 GPU / queued ms, before → after |
| --- | --- | --- | --- | --- |
| Home | 43 → 43 | 547,936 → 568,400 | 1.17 / 1.06 → 1.17 / 1.08 | 1.88 / 1.80 → 1.90 / 1.81 |
| Garden close | 22 → 22 | 539,567 → 560,031 | 1.30 / 1.17 → 1.29 / 1.21 | 1.97 / 2.06 → 2.05 / 2.06 |
| Low | 25 → 25 | 539,967 → 560,431 | 1.05 / 0.99 → 1.06 / 0.99 | 1.58 / 1.51 → 1.59 / 1.48 |
| Survey | 44 → 44 | 547,936 → 568,400 | 1.21 / 0.90 → 1.24 / 0.92 | 1.60 / 1.46 → 1.60 / 1.47 |

Queued time moves −0.03 to +0.04 ms, where two runs of one revision differ by up to
0.03 ms; the largest step, +0.04 ms at garden close at DPR 1, is about 3% of that frame.
Calls hold at every station and the study's caps hold with room: 44 of 150 calls and
568,400 of 720,000 triangles at the most. Queue loads read 3.58–3.80 ms, each longer than
the frame it measures.
