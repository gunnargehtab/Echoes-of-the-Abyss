# Free water: the water medium (#1749)

Evidence for the water-medium part of the feel pass
([free-water-slice.md §9](../../free-water-slice.md#9-feel-pass-the-approved-look-target),
"Water medium"). Two changes, both study-only and both in
`packages/frontend/src/game/water.ts`: a reach curve for the free-water look, and a
second marine-snow cloud wrapped on the eye. No new pass, target or texture; the ramp's
stops and hue are unchanged. The shipped water reads neither.

## Reproduce

Run the dev servers, then the frames module, which walks §9's four poses and pans the low
pose 200 m east for the parallax pair:

```bash
node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1749/after --steps docs/screenshots/issue-1749/frames.mjs
SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' FRAMES=low \
  node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1749/reduced-motion --steps docs/screenshots/issue-1749/frames.mjs
CONTROL=1 FRAMES=low,survey node .claude/skills/run-game/scripts/drive.mjs \
  --url 'http://localhost:5173/?map=kelp-labyrinth' \
  --out docs/screenshots/issue-1749/control-after --steps docs/screenshots/issue-1749/frames.mjs
```

`before/` and `control-before/` are the same runs against the base commit (398322fdd).
Every `readings.json` carries the probe's reach, mote counts, calls and triangles per frame.

## The frames

| §9 row | Before | After | Reads as |
| --- | --- | --- | --- |
| Garden close, 1,875 / 1,125, 250 m, 12°, 275 m, `yawDeg` 90 | [before](before/02-garden-close.png) | [after](after/02-garden-close.png) | Near stands on both flanks parted from far ones by the water; the far flank dissolves rather than standing as a wall |
| Low, 2,000 / 2,000, 1,600 m, 12°, 850 m | [before](before/03-low.png) | [after](after/03-low.png) | Water between the eye and the floor: the bowl floor fades toward the water at its depth and the far rim into it, while the near rim's ink still reads and depth still darkens downward |
| Low, panned 200 m east | [before](before/04-low-panned.png) | [after](after/04-low-panned.png) | The near motes cross more of the frame than the floor behind them |
| Home, 542 / 1,958, 2,600 m, 55°, seabed (the opening row's before) | [before](before/01-home.png) | [after](after/01-home.png) | The fleet readable at 29% fog, with faint snow over the floor; the opening row's after is #1752's |
| Survey, 2,000 / 2,000, 10,000 m, 88°, seabed | [before](before/05-survey.png) | [after](after/05-survey.png) | Unchanged: the same reach, no snow, the ink as it was |

The garden-close pose is §9's, not `gpu.mjs`'s yaw-0 station, so its before frame is
captured here on the base rather than taken from issue-1713.

## What the probe read

| Pose | Reach before → after (m) | Snow far / near | Calls before → after | Triangles |
| --- | --- | --- | --- | --- |
| Home | 8,320 → 4,487 | 0 / 24,000 | 43 → 44 | 405,088 |
| Garden close | 900 → 600 | 7,000 / 24,000 | 29 → 30 | 402,015 |
| Low | 5,120 → 2,457 | 7,000 / 24,000 | 24 → 25 | 397,119 |
| Survey | 32,000 → 32,000 | 0 / 0 | 44 → 44 | 405,088 |

The one added call is the near cloud, a `Points` draw of 24,000 vertices. Prop triangles
stay at 387,952 and the frame under the study's 720,000. The fog at the subject of each
scene pose: 37% at the low pose's focus, 29% at the home pose's fleet, and the garden
close's floor of 600 m parts a stand at 300 m (22%) from one at 600 m (63%).

## Motion, reduced motion and the control

- **Motion.** The low pair above; the sink runs in both frames (`sway: on`).
- **Reduced motion.** [reduced-motion/01-low.png](reduced-motion/01-low.png): both clouds
  drawn with the sink held, as docs/ui-ux.md §11 asks, since the parallax belongs to the
  camera and not to an animation.
- **Kelp Labyrinth control.** [control-before](control-before/readings.json) and
  [control-after](control-after/readings.json) at the low and survey poses: the standard
  look's reach, calls and triangles are the same in both, and the probe reports no near
  cloud.

## Hardware and what is open

These frames come from this container's software rasteriser (SwiftShader, in each
`readings.json`), which is why no millisecond is recorded here: the call and triangle
columns are real, the timings are not (`run-game`, "The gate-6 review drive"). The study's
GPU rows, unpaced and queued at DPR 1 and 1.5 on named hardware, are
`docs/screenshots/issue-1713/gpu.mjs` run as its README says; §7 leaves that criterion
open until a GPU reads it.
