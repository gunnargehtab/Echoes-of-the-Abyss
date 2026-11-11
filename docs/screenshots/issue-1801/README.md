# The High slice, step 1: the crater's ground and water lit (#1801)

Frames for the first look step of the High graphics quality
([art-direction.md](../../art-direction.md#what-is-built-at-high)), beside
[the target frame](../issue-1799/README.md) at its three cameras, in the free-water crater
with the HUD on.

**A software rasteriser drew every frame here**: SwiftShader, in headless Chromium, in the
cloud container that built the step. They guide a round and are not offered for
acceptance. The frames the owner accepts against are taken on the named GPU, with the
command under "Who captures" in [the target's README](../issue-1799/README.md).

## Reproduce

```bash
SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
  node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1801/software --steps docs/screenshots/issue-1801/frames.mjs
```

[frames.mjs](frames.mjs) sets each camera with `__perspectiveCamera`, switches the
quality with the development switch beside the setting, `__perspectiveQuality`, and
writes [readings.json](software/readings.json): each frame's passes, calls, triangles and
the bytes High holds. Reduced motion holds the camera's sway, so two runs frame alike.

## The frames beside the target

![The target frame](../issue-1799/target.png)

| Camera | Low | High | What High shows so far |
| --- | --- | --- | --- |
| Home | [low](software/01-low-home.png) | [high](software/04-high-home.png) | The garden beyond the rim glowing in the flora's own green: its stands scatter in the water over it, and the glow blooms. The rim under the hulls is dark, lit by the Lid's glow alone, with the survey ink over it |
| Close | [low](software/02-low-close.png) | [high](software/05-high-close.png) | The rim in the foreground, the three hulls across the frame, and the bowl's open water behind, the water in the Coral Ruins' hue. No source of the world's stands near this camera, so the frame is as dark as Low's |
| Survey | [low](software/03-low-survey.png) | [high](software/06-high-survey.png) | Depth still reads as luminance: the rim, the garden, the bowl's flanks and the black pocket. Each of the garden's stands has its glow in the water; its pool on the ground is held under the ceiling below |

The clip is [clip-home-to-close.mp4](software/clip-home-to-close.mp4): the camera moved
from Home to Close at High, at 1280 × 720 and twice the speed the rasteriser drew it.

What the target shows and these do not: the searchlights of the player's own hulls and
their pools, which are the target's brightest light and the issue's next step; shadow
cast between the rocks; and life at work in the water. And one thing the limits hold
back: light that reads on the ground. "The lit ground under the marks" below says why, and
[art-direction.md](../../art-direction.md#what-is-built-at-high) puts the call to the
owner.

## What the frame costs

Counted, not timed: a software rasteriser's milliseconds measure the rasteriser.

| Camera | Low: calls, triangles | High: calls, triangles | High's passes |
| --- | --- | --- | --- |
| Home | 44, 593,684 | 54, 626,610 | `high-world`, `high-scatter`, `high-occlusion`, `high-bloom`, `high-composite`, `high-tactical`, then the halo's and the split's |
| Close | 44, 593,684 | 54, 626,610 | The same |
| Survey | 45, 594,970 | 55, 627,896 | The same |

High draws ten calls more. It drops the water backdrop. It adds the survey ink's own
draw, which is the ground's 32,768 triangles a second time, one instanced draw for the
crater's 71 sources, and nine full-screen draws: the occlusion, the bloom's seven and the
composite. At 1920 × 1080 its targets hold 136,145,280 bytes: four samples of half-float
colour and of depth and one resolve of each, and the half-size and smaller targets of the
scatter, the occlusion and the bloom. The lit ground's two textures hold 2,796,203. Gate 6 bounds
High by GPU time, at most 8 ms read queued and unpaced on the named GPU. That reading is
owed: the capture takes it on a GPU and records `insideBudget` beside it.

## Low does not move

The Low quality is the non-target control. `low-control/` holds `main`'s Low frames at
the branch's base, 96180933f, taken by the same module with `QUALITY=low`.

A match is live, so two runs never match pixel for pixel. A second run of `main` against
the first gives the floor, read as [issue-1800](../issue-1800/README.md) reads it: the
mean, over the world area, of each pixel's largest channel difference, out of 255
([diff.py](low-control/diff.py)).

| Camera | `main` against `main` | `main` against the branch | Calls and triangles |
| --- | --- | --- | --- |
| Home | 0.07 | 0.19 | 44 and 593,684, both |
| Close | 0.15 | 0.36 | 44 and 593,684, both |
| Survey | 0.00 | 0.00 | 45 and 594,970, both |

The branch's Home and Close figures move run to run with the snow: the same comparison
read 0.15 and 0.31 at this pull request's first commit and 0.04 and 0.08 at its second.

The difference maps paint a pixel red where any channel moved by more than 2. At Close
both maps are marine snow and nothing else: the motes sink, and a later frame finds them
lower ([main against main](low-control/diff-close-main-vs-main.png),
[main against the branch](low-control/diff-close-main-vs-branch.png)). No ground, hull,
ring, lamp or ink pixel moved, and the survey frame matches to the pixel.

In counted work, `packages/frontend/test/rendererSmoke.test.ts` holds the rest: at Low the
frame is the canvas pass it was, and at High every draw of the tactical pass is one Low
makes, in a material of the kind Low makes it in.

## The lit ground under the marks

Limit 6 of [art-direction.md](../../art-direction.md#two-layers-two-laws) holds the lit
ground under the tactical layer. A ceiling holds it there, and
`packages/frontend/test/litGround.test.ts` runs the loudness ladder's rung comparisons
over the brightest ground the ceiling leaves, in the Lid's hue and each family's, in all
four palettes. The same file pins how pale a ground the ladder's order holds over: 11.8%
in tritanopia, 23.1% in deuteranopia, 27.8% in the standard palette, 37.6% in protanopia.

In these frames the 99th percentile of the world area's luma, out of 255, is 64 at Low
and 60 at High at Home, 70 and 69 at Close, and 55 and 56 at Survey.

Light in the water is not ground, and is not under that ceiling. Over the garden at
Survey the 99th percentile of encoded luminance is 14.8% at Low and 24.6% at High, and
the glow's cores reach 33.7% at the 99.9th. That is past the tritanopia and deuteranopia
figures. Whether limit 6 binds it is put to the owner in
[art-direction.md](../../art-direction.md#the-lit-ground-under-the-marks). The frames this
pull request's second commit drew, 270b64727, show the ground's pools before the ceiling.

## Related

- [The target frame](../issue-1799/README.md) — the cameras, and who captures
- [art-direction.md](../../art-direction.md#two-layers-two-laws) — what a look may and may
  not do, and what is built
- [graphics-standards.md](../../graphics-standards.md) — gate 6, the two graphics qualities
