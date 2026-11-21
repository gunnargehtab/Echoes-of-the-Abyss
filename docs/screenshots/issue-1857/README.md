# The deep fish's photophores as world light (#1857)

Frames for one move at the High graphics quality: the six photophore seats a deep fish's
file marks are points of the world pass there, in the fry's `life-glint`, and no dot of
the stipple channel stands on one
([art-direction.md](../../art-direction.md#life-in-the-worlds-light)). Low keeps its dots.
[issue-1837](../issue-1837/README.md) left them the stipple's "until a step moves them".
The frames stand beside [the target frame](../issue-1799/README.md) at its three cameras,
with the HUD on, and at the three eyes the move is read from: gate 6's low camera, the
garden close, and one in the deep fish's pocket.

**A software rasteriser drew every frame here**: SwiftShader, in headless Chromium, in the
cloud container that built the step. They guide a round and are not offered for
acceptance. The frames the owner accepts against are taken on the named GPU, with the
commands under [Who captures](#who-captures).

## Reproduce

```bash
SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
  node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1857/software --steps docs/screenshots/issue-1837/frames.mjs
SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
  node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1857/software/pocket --steps docs/screenshots/issue-1857/pocket.mjs
```

[frames.mjs](../issue-1837/frames.mjs) is #1837's module, unchanged: Low and then High at
the target's three cameras, at gate 6's low camera and at the garden close. This
container's rasteriser took longer than Playwright's 30 s to hand over a High frame at
Home, so the High five are a second run of the same module, `QUALITY=high`, with that
limit raised to 240 s, and `readings.json` holds both runs.
[pocket.mjs](pocket.mjs) is new, for the one eye those cameras have not got: 250 m from
the middle ring of six along the pocket's north edge, looking north at the deep fish's
2,000 m. 250 m is where the orbit's dolly stops, so no orbit stands nearer a deep fish.
Reduced motion holds every body at its loop's start, so two runs frame alike.

## The frames beside the target

![The target frame](../issue-1799/target.png)

| Camera | Low | High | What High shows now |
| --- | --- | --- | --- |
| Home | [low](software/01-low-home.png) | [high](software/06-high-home.png) | Nothing moved: no deep fish is in the frame |
| Close | [low](software/02-low-close.png) | [high](software/07-high-close.png) | Nothing moved |
| Survey | [low](software/04-low-survey.png) | [high](software/09-high-survey.png) | 22 pixels moved and no other: the pinpricks the stipple laid over the pocket, three along its north edge and the rest among #1713's patches, are gone. From 10 km no seat's light reaches the eye |
| Low, gate 6's | [low](software/03-low-low.png) | [high](software/08-high-low.png) | The three rings of white pinpricks Low draws into the pocket are gone. The eye is 2 km from them, and the water takes a seat's light on the way. The pocket is dark |
| Garden close | [low](software/05-low-garden.png) | [high](software/10-high-garden.png) | Nothing moved: no deep fish swims in the garden, and the fry's lights are #1837's |
| Pocket | [low](software/pocket/01-low-pocket.png) | [high](software/pocket/02-high-pocket.png) | Six fish 250 m off, each a dark body 12 px long with pale points along its flank, where Low draws the stipple's dots in the fauna colour |

![The ring from the pocket eye: Low, a fry's point, the width taken, and 0.5 m at 0.4](software/pocket/beside.png)

The ring at four times its size ([seats.py](seats.py)): Low's dots, then High at the
three readings of a seat's width. Only the third is built.

## How a deep fish reads

[seats.py](seats.py) reads the peak of each of the ring's six fish from the pocket eye,
as luma of 255. The lamps are [#1837's readings](../issue-1837/README.md), at Close.

| What | Peak, of 255: the least, the median pair, the most |
| --- | --- |
| Low: the stipple's dots | 133, 158 and 164, 236 |
| High, a fry's point: 0.22 m at 0.3 | 71, 74 and 75, 111 |
| **High, as built: 0.4 m at 0.3** | 108, 123 and 125, 161 |
| High, 0.5 m at 0.4 | 150, 159 and 160, 195 |
| The Corvette's lamp, SIG 28 | 165 |
| A dense school of fry, where its lights overlap | 160 |
| The Light Scout's lamp, SIG 6 | 130 |
| The water between the fish | 1 at High, 6 at Low |

The two readings not taken were captured on the same tree with
`HIGH_GRAPHICS.LIFE.GLOW.SEAT` set to each, and are kept as their crops above and no
frame. A fry's point is under the 1.6 px floor at 250 m, so its level is cut by the area
the floor adds. The brightest fish of the six shows its flank broadside, where its three
near seats overlap.

From gate 6's low camera the rings are gone under every reading. At the pixels of Low's
46 brightest dots, the widest reading lifted the frame by about 10 of 255 and a fry's
point by nothing.

## What is new in the frame

Read off `readings.json` against [#1867's](../issue-1867/software/readings.json), which
is `main`.

| Camera | High before: calls, triangles | High now | Stipple dots before, now | Seat lights before, now |
| --- | --- | --- | --- | --- |
| Home | 66, 763,409 | 65, 763,409 | 156, 0 | 0, 156 |
| Close | 66, 763,409 | 65, 763,409 | 156, 0 | 0, 156 |
| Low | 47, 756,078 | 46, 756,078 | 156, 0 | 0, 156 |
| Survey | 66, 764,047 | 65, 764,047 | 156, 0 | 0, 156 |
| Garden close | 53, 760,726 | 52, 760,726 | 156, 0 | 0, 156 |
| Pocket | not taken | 44, 755,430 | 156, 0 | 0, 156 |

One draw fewer and no triangle more. The 156 lights are points of the fry's cloud, one
draw already, and the stipple cloud with no dot to draw submits none. The eight or
twelve passes, the 72 world sources, the 624 fry lights and the 1,655 lantern points are
`main`'s. #1867's `readings.json` holds no dot count: 156 before is what
`packages/frontend/test/tutorialLoading.test.mjs` counted there, and what these Low
frames report.

Against #1867's own High frames, read as
[issue-1801](../issue-1801/README.md#low-does-not-move) reads a pair, Home differs by
0.14, Close by 0.28, Low by 0.28, Garden close by 0.25 and Survey by 0.00: marine snow,
the rings at Low and 22 pixels at Survey.

The move adds no pass and no per-fragment work, so it is placement, and no timing run
from the named GPU is owed with it (`dev-loop`, "Look work"). Gate 6's 8 ms is read on
the named GPU with the rest of #1637.

## Low does not move

These Low frames against [#1867's](../issue-1867/README.md), which is `main`: the mean,
over the world area, of each pixel's largest channel difference, out of 255
([diff.py](../issue-1801/low-control/diff.py)).

| Camera | #1867's Low against these | `main` against `main`, from #1837 | Calls and triangles |
| --- | --- | --- | --- |
| Home | 0.08 | 0.24 | 44 and 593,684, both |
| Close | 0.18 | 0.41 | 44 and 593,684, both |
| Low | 0.16 | 0.47 | 26 and 587,001, both |
| Survey | 0.00 | 0.00 | 45 and 594,970, both |
| Garden close | 0.16 | 0.35 | 31 and 591,001, both |

LOW_PROSE

## The clip

CLIP_PROSE

## Calls taken with these frames

- **`life-glint`, the fry's token.** The issue's recommendation, against a token of its
  own and against leaving the seats the stipple's.
- **A seat 0.4 m wide, at a fry's level.** The owner's, in session on 21 November 2026,
  on these frames, against a fry's point and against stopping. It reads under the
  Corvette's lamp and level with a dense school.
- **The low camera's rings go dark at High.** The owner's, with the width: no reading
  kept them, and Low's frame keeps its rings.
- **One cloud.** A seat's light is a point of the fry's cloud with a width of its own, so
  the move adds no draw.

## Who captures

On the owner's desktop, the named GPU of
[graphics-standards.md](../../graphics-standards.md) gate 6, with the dev servers running
(`npm run dev`):

```bash
UNPACED=1 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --headed --channel msedge --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1857/gpu --steps docs/screenshots/issue-1837/frames.mjs
VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --headed --channel msedge --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1857/gpu/pocket --steps docs/screenshots/issue-1857/pocket.mjs
CLIP=1 RECORD_VIDEO=docs/screenshots/issue-1857/gpu VIEW_W=1920 VIEW_H=1080 \
  node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
  --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1857/gpu --steps docs/screenshots/issue-1857/pocket.mjs
```

The first writes ten frames and `readings.json`. The second writes the pocket's two. The
third records the clip. None sets reduced motion, so the fish swim: a lap of a ring takes
240 s.

## Related

- [The target frame](../issue-1799/README.md) — the cameras, and who captures
- [issue-1837](../issue-1837/README.md) — the step this move adds to
- [free-water-slice.md](../../free-water-slice.md) — §5, the deep fish and its seats
- [art-direction.md](../../art-direction.md#life-in-the-worlds-light) — the call, and its
  other readings
