# Free water: the water medium (#1749)

Evidence for the water-medium part of the feel pass
([free-water-slice.md §9](../../free-water-slice.md#9-feel-pass-the-approved-look-target),
"Water medium"). Two changes, both study-only and both in
`packages/frontend/src/game/water.ts`: a reach curve for the free-water look, and a
second marine-snow cloud wrapped on the nearest water the eye looks into. No new pass,
target or texture; the ramp's stops and hue are unchanged. The shipped water reads neither.

## Reproduce

Run the dev servers, then the frames module. It walks §9's four poses and a fifth on the
fleet, pans the low pose 200 m east, and drags a continuous middle-button pan across the
garden close and the low pose, one frame per step, with the page clock beside each:

```bash
node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1749/after --steps docs/screenshots/issue-1749/frames.mjs
SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' FRAMES=low PAN=0 \
  node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1749/reduced-motion --steps docs/screenshots/issue-1749/frames.mjs
CONTROL=1 FRAMES=low,survey PAN=0 node .claude/skills/run-game/scripts/drive.mjs \
  --url 'http://localhost:5173/?map=kelp-labyrinth' \
  --out docs/screenshots/issue-1749/control-after --steps docs/screenshots/issue-1749/frames.mjs
```

`before/` and `control-before/` are the same runs against the base commit (398322fdd).
Every `readings.json` carries the probe's reach, mote counts, the near cloud's anchor,
calls and triangles per frame, and `subject`: the fog on a subject one dolly out and the
share of a lamp's halo that survives it.

## The frames

| Row | Before | After | Reads as |
| --- | --- | --- | --- |
| Garden close, 1,875 / 1,125, 250 m, 12°, 275 m, `yawDeg` 90 | [before](before/02-garden-close.png) | [after](after/02-garden-close.png) | Near stands on both flanks parted from far ones by the water; the far flank dissolves rather than standing as a wall; near motes as soft discs around the eye, which is in the water |
| Low, 2,000 / 2,000, 1,600 m, 12°, 850 m | [before](before/09-low.png) | [after](after/09-low.png) | Water between the eye and the floor: the near motes fill the lower half of the frame, the bowl floor fades toward the water at its depth, the far rim into it, and depth still darkens downward. The near rim's survey ink reads; the far rim's coastline at about 3,000 m fades with the ground under it |
| Low, panned 200 m east | [before](before/10-low-panned.png) | [after](after/10-low-panned.png) | The same water, the cloud still wrapped on the sight line's entry |
| Fleet, 542 / 1,958, 1,200 m, 12°, 300 m | [before](before/18-fleet.png) | [after](after/18-fleet.png) | The three hulls a dolly out through the medium: lamps lit, loudness collars and rings readable, plumb lines faded with the ground |
| Home, 542 / 1,958, 2,600 m, 55°, seabed (the opening row's before) | [before](before/01-home.png) | [after](after/01-home.png) | The fleet readable at 29% fog, and no snow in either frame: both clouds have faded 9,100 m up. The opening row's after is #1752's |
| Survey, 2,000 / 2,000, 10,000 m, 88°, seabed | [before](before/17-survey.png) | [after](after/17-survey.png) | Unchanged: the same reach, no snow, the ink as it was |

The garden-close pose is §9's, not `gpu.mjs`'s yaw-0 station, so its before frame is
captured here on the base rather than taken from issue-1713. The fleet pose is this
issue's, for the lamp reading, and is not a §9 row.

## What the probe read

| Pose | Reach before → after (m) | Snow far / near | Fog on the subject, before → after | Halo kept, before → after | Calls before → after |
| --- | --- | --- | --- | --- | --- |
| Home | 8,320 → 4,487 | 0 / 0 | 9% → 29% | 80% → 48% | 43 → 43 |
| Garden close | 900 → 600 | 7,000 / 24,000 | 7% → 16% | 85% → 68% | 29 → 30 |
| Low | 5,120 → 2,457 | 7,000 / 24,000 | 9% → 35% | 81% → 39% | 24 → 25 |
| Fleet | 3,840 → 1,805 | 7,000 / 24,000 | 9% → 36% | 81% → 38% | 42 → 43 |
| Survey | 32,000 → 32,000 | 0 / 0 | 9% → 9% | 81% → 81% | 44 → 44 |

Triangles are unchanged at each §9 pose (405,088 / 402,015 / 397,119 / 405,088) and within
ten at the fleet pose (404,698 → 404,688), with prop triangles at 387,952, under the
study's 720,000. The one added call is the near cloud, a `Points` draw
of 24,000 vertices, drawn only where the eye has not climbed out of it.

## Lamps, SIG and hidden information

The fog chunk mixes every fogged fragment, lamp pixels included, toward the water at its
depth, and the lamp halo keeps the fog's transmittance raised to 2.2 (`lampHaloPass.ts`).
Both are scaled by distance alone, so two hulls at one distance keep their ratio: glow still
encodes loudness (gate 3), and the fleet frame shows the Corvette's collar louder than the
scout's through the same water. What the medium costs is absolute: a halo one dolly out
keeps 38% to 48% of itself where it kept about 80%. The HUD's rings, collars and marks are
drawn by the overlay and are not in the water.

Nothing here reads a contact. The reach is a function of the dolly, the clouds of the
camera, and the study seats no opponent; `freeWaterDecoration.test.ts` still compares the
decoration with and without a hidden Hollow byte for byte, and no wire field changed.

## Motion, reduced motion and the control

- **Motion.** Two continuous middle-drag pans while the match runs, 30 px of drag a
  frame, six frames each: [garden close](after/03-garden-close-pan-0.png) to
  [step 5](after/08-garden-close-pan-5.png), and [low](after/11-low-pan-0.png) to
  [step 5](after/16-low-pan-5.png). Each strip's entry in `readings.json` carries the page
  clock, focus and eye per frame: the low focus walks 39 m east a frame, the garden focus
  6 m along the clearing. The near motes cross more of the frame than the floor behind
  them; the sink runs throughout (`sway: on`).
- **Reduced motion.** [reduced-motion/01-low.png](reduced-motion/01-low.png): both clouds
  drawn with the sink held, as docs/ui-ux.md §11 asks, since the parallax belongs to the
  camera and not to an animation.
- **Kelp Labyrinth control.** [control-before](control-before/readings.json) and
  [control-after](control-after/readings.json) at the low and survey poses: the standard
  look's reach and triangles are the same in both and the probe reports no near cloud and
  no anchor. Calls read 75 / 72 / 76 before and 75 / 70 / 77 after, with the eye a few
  metres apart under the sway between runs: a frustum-edge batch, not a draw this change
  adds, which the study's own rows show as exactly one.

## Hardware and what is open

These frames come from this container's software rasteriser (SwiftShader, in each
`readings.json`), which is why no millisecond is recorded here: the call and triangle
columns are real, the timings are not (`run-game`, "The gate-6 review drive"). The study's
GPU rows, unpaced and queued at DPR 1 and 1.5 on named hardware, are
`docs/screenshots/issue-1713/gpu.mjs` run as its README says; §7 leaves that criterion
open until a GPU reads it.
