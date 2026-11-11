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
| Home | [low](software/01-low-home.png) | [high](software/04-high-home.png) | The garden beyond the rim glowing in the flora's own green: its stands pool on the ground and scatter in the water over it. The rim under the hulls is dark, lit by the Lid's glow alone, with the survey ink over it |
| Close | [low](software/02-low-close.png) | [high](software/05-high-close.png) | The rim in the foreground, the three hulls across the frame, and the bowl's open water behind, the water in the Coral Ruins' hue. No source of the world's stands near this camera, so the frame is as dark as Low's |
| Survey | [low](software/03-low-survey.png) | [high](software/06-high-survey.png) | Depth still reads as luminance: the rim, the garden, the bowl's flanks and the black pocket. Each of the garden's stands has its pool |

The clip is [clip-home-to-close.mp4](software/clip-home-to-close.mp4): the camera moved
from Home to Close at High, at 1280 × 720 and twice the speed the rasteriser drew it.

What the target shows and these do not, since their steps are not built: the searchlights
of the player's own hulls and their pools, which are the target's brightest light and the
issue's next step; bloom; shadow between the rocks; and life at work in the water. What
is left is listed in [art-direction.md](../../art-direction.md#what-is-built-at-high).

## What the frame costs

Counted, not timed: a software rasteriser's milliseconds measure the rasteriser.

| Camera | Low: calls, triangles | High: calls, triangles | High's passes |
| --- | --- | --- | --- |
| Home | 44, 593,684 | 46, 626,594 | `high-world`, `high-scatter`, `high-composite`, `high-tactical`, then the halo's and the split's |
| Close | 44, 593,684 | 46, 626,594 | The same |
| Survey | 45, 594,970 | 47, 627,880 | The same |

High draws two calls more: it drops the water backdrop, and adds the composite, the
survey ink's own draw, which is the ground's 32,768 triangles a second time, and one
instanced draw for the crater's 71 sources. At 1920 × 1080 its targets hold 128,563,200
bytes: four samples of half-float colour and of depth and one resolve of each, and the
scatter pass's half-size target. The lit ground's two textures hold 2,796,203. Gate 6 bounds
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
| Home | 0.07 | 0.04 | 44 and 593,684, both |
| Close | 0.15 | 0.08 | 44 and 593,684, both |
| Survey | 0.00 | 0.00 | 45 and 594,970, both |

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
ground under the tactical layer. The Lid's glow is bounded by a test
(`packages/frontend/test/litGround.test.ts`): the brightest ground it can light is no paler
than the palest ground the loudness ladder weighs. In these frames the 99th percentile of
the world area's luma, out of 255, is 64 at Low and 63 at High at Home, 70 and 71 at
Close, and 55 and 61 at Survey, where the garden's pools are in frame. Under a pool the
ground is brighter than the ladder weighs, and that reading is owed before a frame is
promoted.

## Related

- [The target frame](../issue-1799/README.md) — the cameras, and who captures
- [art-direction.md](../../art-direction.md#two-layers-two-laws) — what a look may and may
  not do, and what is built
- [graphics-standards.md](../../graphics-standards.md) — gate 6, the two graphics qualities
