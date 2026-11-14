# A mark's plate over open water (#1816)

The Close camera of [the target's README](../issue-1799/README.md) in the free-water
crater, where each hull's disc rises over the bowl's open water. Two sets: `before` is
`main` at 305bd196, and `after` is the fix
([art-direction.md](../../art-direction.md#the-plate-under-a-mark)).

**A software rasteriser drew every frame here**: SwiftShader, in headless Chromium, in the
cloud container that built the fix. They show the fault and its fix and are not offered
for acceptance of the look, which is the owner's on the named GPU
([#1801](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1801)).

## Reproduce

```bash
SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
  node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1816/software/after --steps docs/screenshots/issue-1816/frames.mjs
python3 docs/screenshots/issue-1816/read.py docs/screenshots/issue-1816/software/after after
```

[frames.mjs](frames.mjs) takes Low, then High with the marks' plates and without them,
by `__perspectivePlates`. [read.py](read.py) reads a set.

## What the frames show

| | Before | After |
| --- | --- | --- |
| High, with plates | [frame](software/before/02-high-close-plates.png) | [frame](software/after/02-high-close-plates.png) |
| High, bare | [frame](software/before/03-high-close-bare.png) | [frame](software/after/03-high-close-bare.png) |
| What the plates took, twelve times amplified | [map](software/before/plates-diff.png) | [map](software/after/plates-diff.png) |
| Low | [frame](software/before/01-low-close.png) | [frame](software/after/01-low-close.png) |

Read off them, in luma out of 255:

| Reading | Before | After |
| --- | --- | --- |
| The left disc's upper edge, with plates | 31.2 to 27.6 | 34.1 to 32.0 |
| The same water, bare | 31.2 to 30.1 | 34.1 to 33.7 |
| The same water at Low | 33.0 to 32.1 | 33.0 to 32.1 |
| Open-water pixels a plate held by over 1 | 9,201 | 110,173 |
| Open water at the frame's centre, High | 34.0 | 37.6 |
| The same at Low | 36.3 | 36.3 |

Before, the plate held each disc's cap to the ground's level: 27.6 where Low draws 32.1.
After, it holds the disc's water to Low's own: 32.0 for Low's 32.1. A mark over open
water stands over what it stands over at Low.

The disc still shows, fainter and wider. The bowl's water wears the Coral Ruins' hue,
which reads 1.6 over Low's blue in luma at one luminance, and the plate holds that to
Low's. So the step at the disc's edge is 1.7 where it was 3.6, and it now runs over all
of the disc's water above about 290 m, not the cap alone. That is the cost the owner
chose with the level
([art-direction.md](../../art-direction.md#the-plate-under-a-mark)): the level that
held no hue left no disc and broke tritanopia's rung order deeper than Low does.

The water at High went from 2.3 under Low's to 1.3 over it, the same hue's offset.
`packages/frontend/test/waterMedium.test.ts` holds each stop's luminance to the ramp's.
The disc's edge is read near the frame's left side, under the view's vignette, so its
levels are lower than the centre's.

Low's source is not touched: the fix is in `markPlates.ts`, `waterMedium.ts` and
`highFrame.ts`, which only the High frame runs. Its two frames differ by the marine snow
alone.

## Related

- [art-direction.md](../../art-direction.md#the-plate-under-a-mark): the plate's two
  levels
- [The High slice's frames](../issue-1801/README.md): the step this fault was found on
