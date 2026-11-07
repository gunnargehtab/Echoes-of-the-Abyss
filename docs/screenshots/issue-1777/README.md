# Free water: the ray in the opening frame (#1777)

Evidence for §5's "Life in the frames", the opening bullet
([free-water-slice.md §5](../../free-water-slice.md#5-place-to-kit-sheet-and-wildlife-licence)).
One new decorative body, `env-rim-ray`, 18 m across
([asset-prompts-3d.md](../../asset-prompts-3d.md) Block 4), on one loop at `735 / 2,210`,
250 ± 30 m deep, 60 m round over 300 s (`RAY` in `FREE_WATER_LIFE`,
`packages/shared/src/constants.ts`; `freeWaterPlacements` in
`packages/frontend/src/game/freeWaterDecoration.ts`). Nothing else on #1771's list moves.

## Reproduce

Run the dev servers, then the frames module. It shoots the frame the study opens on, then
§9's four poses, the opening pose twice ten seconds of match apart, and writes the probe's
reading of each frame beside it, with each kit's bodies in the world's band of the window
and the width each draws at:

```bash
MOTION=1 node .claude/skills/run-game/scripts/drive.mjs \
  --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1777/after --steps docs/screenshots/issue-1777/frames.mjs
SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' FRAMES=opening-pose MOTION=1 \
  node .claude/skills/run-game/scripts/drive.mjs \
  --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1777/reduced-motion --steps docs/screenshots/issue-1777/frames.mjs
```

The before set is [issue-1771/after](../issue-1771/after/), the same poses at `72dd2e73`,
the commit this branch starts from. Every set here was taken headless in this container
through SwiftShader, at 1,440 × 900 and DPR 1, so no millisecond or GPU figure is recorded
(`run-game`, "Frame times from this container are worthless"); the GPU readings §7 asks
for, at DPR 1 and 1.5 on named hardware, are owed from the owner's machine, as #1771's were.

## The frames

| Row | Before | After | Reads as |
| --- | --- | --- | --- |
| Opening pose, 709 / 1,710, 1,200 m, 15°, 300 m, `yawDeg` −34 | [before](../issue-1771/after/02-opening-pose.png) | [after](after/02-opening-pose.png) | The ray at the lower right, 812 to 927 m from the eye, its span 26.6 to 28.4 px, 40 px clear of the corvette's ring and above the legend. It draws as a pale sliver of lit back, not as a body: see "What the frame shows" |
| Opening pose, ten seconds later | none | [after](after/03-opening-pose-later.png) | The ray a few metres along its loop, the sliver turned with it |
| Garden close, 1,875 / 1,125, 250 m, 12°, 275 m, `yawDeg` 90 | [before](../issue-1771/after/03-garden-close.png) | [after](after/04-garden-close.png) | Unchanged: the ray is behind the eye |
| Low, 2,000 / 2,000, 1,600 m, 12°, 850 m | [before](../issue-1771/after/05-low.png) | [after](after/05-low.png) | Unchanged: the ray is out of frame |
| Survey, 2,000 / 2,000, 10,000 m, 88°, seabed | [before](../issue-1771/after/06-survey.png) | [after](after/06-survey.png) | Decoration below tactical ink: 18 m is 2 px at 10 km |

## What the frame shows

The probe projects the ray into the opening pose at 27.6 px, where #1771 measured that a
4 m fish reads as a fish at 16 px and more. But a fish at garden close is a dark body
against lit water, and the ray at the opening lies over the 600 m shelf, which the eye above
the Lid sees as dark ground under contour ink. `fish_flank` is #212A2B, so the body is dark
on dark, and only its lit back shows: a pale sliver about 25 px wide and 3 px tall at
screen 1,085 / 580 in `after/02`, moved to 1,092 / 566 in `after/03`. The water is not what
hides it: the fog's transmittance at 820 m is 0.81 (`waterTransmittance`, reach 1,805 m).

Two experiments on the opening pose, not committed, say what does not help:

- **A 30 m span** (the registry row at 30, the model unchanged): 46 px, and still a sliver
  of lit back, longer.
- **Beyond the hulls** (the loop at `833 / 1,794`, 150 m deep, against the far water):
  19.6 px at 1,200 m, a fainter glint.

So a larger dark body reads no better than a smaller one here, and placing it nearer than
about 800 m puts it under the console. What would read is light, as the deep fish's
photophores do at 2.3 km, or a body that turns its lit back to the eye, which is a pose
decision; both are the owner's call, and neither is taken here. The pull request says so.

## What the probe read

| Frame | Ray in frame, px | Calls before → after | Triangles before → after |
| --- | --- | --- | --- |
| Opening pose | 1, 27.6 | 43 → 45 | 568,010 → 568,596 |
| Opening pose, later | 1, 26.6 | 45 | 568,596 |
| Garden close | 0 | 30 → 32 | 565,327 → 565,913 |
| Low | 0 | 25 → 27 | 560,431 → 561,017 |
| Survey | not projected | 44 → 46 | 568,400 → 568,986 |

Every frame adds the ray's 586 triangles and two calls, one per material of the new
slug's instanced batch; the prop layer reads 551,850 triangles under the 600,000
reservation, and the photophores hold at 156. The before figures are #1771's GPU set's;
calls and triangles do not depend on the rasteriser.

## Motion and reduced motion

- **Motion.** `after/02` and `after/03` are one camera ten seconds apart: the ray has moved
  along its loop, and the probe's width goes from 27.6 to 26.6 px as it recedes.
- **Reduced motion.** [reduced-motion/02](reduced-motion/02-opening-pose.png) and
  [reduced-motion/03](reduced-motion/03-opening-pose-later.png), ten seconds apart, are
  pixel-identical across the ray's box, the ray held at its phase-zero point at 29.2 px and
  the sway held.
- **Tests.** `freeWaterDecoration.test.ts` holds the ray inside the opening frame within
  930 m of its eye over its whole loop, inside §5's 70 m plan radius and 200..300 m band,
  above the drawn floor, and loads its file at 586 triangles with no emission and no
  photophore seat.
