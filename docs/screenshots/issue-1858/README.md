# Life by depth band (#1858)

Frames for the first increment of #1858 at the High graphics quality: the crater's
decorative life placed by depth band
([free-water-slice.md](../../free-water-slice.md) §5, "Life by depth band"). Nothing lives
in the Lid's top 150 m, measured by a body's axis, and no body crosses a line. Each
camera is shown twice: before, with `main`'s constants, and after, with the branch's.

**A software rasteriser drew every frame here**: SwiftShader, in headless Chromium, in the
cloud container that built the step. The frames are good enough to judge placement, but
they are not offered for acceptance. The owner accepts against frames taken on the named
GPU.

## The frames

The labelled frames are the ones to read. Red marks a body in the Lid or across 400 m,
cyan the Shelf, and orange Mid-Water. A lantern's tag gives its depth in that frame. A
group's label gives its axis over a lap.

| Camera | Before | After |
| --- | --- | --- |
| Close, eye 233 m deep | [before-close.png](software/labelled/before-close.png) | [after-close.png](software/labelled/after-close.png) |
| Home, eye over the Lid | [before-home.png](software/labelled/before-home.png) | [after-home.png](software/labelled/after-home.png) |

The same frames without labels are in [before/](software/before/01-close.png) and
[after/](software/after/01-close.png), each with the camera's probe reading beside it.

## What they show

- **Close, before.** Four of the five lanterns hang in the Lid, at 105 to 140 m. The far
  bloom reaches up to 101 m. The rim's outer fish cross 400 m, at 377 to 484 m.
- **Close, after.** Every lantern is on the Shelf, at 155 to 206 m in this frame. They
  draw about 90 px lower, just over the fry's ribbon rather than well over it: that is
  the owner's glance to take. The rim's outer fish keep 406 to 455 m, wholly in Mid-Water.
- **Home.** The same shift, smaller: from this eye the five are small by the fleet. The
  river's top comes down from 101 m to 151 m, and 92 of its 120 lanterns stay in the frame.
- **Unmoved.** The manta (157 to 173 m), the fry stream and the mill before the vent.

The labels are computed, not traced. [labels.mjs](labels.mjs) stands each body where the
match's start stands it and projects it through the frame's camera; the rings land on
the drawn jellies and schools, which is the check that the cameras agree.

## Reproduce

Both sides come from one tree. The after side is the branch. The before side is the same
tree with `packages/shared/src/constants.ts` at the base commit, 697b0ebb5, built; restore
it after.

```bash
SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
  node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1858/software/after --steps docs/screenshots/issue-1858/frames.mjs
node --import tsx --import ./packages/frontend/test/support/viteAssets.mjs \
  docs/screenshots/issue-1858/labels.mjs docs/screenshots/issue-1858/software/after/labels.json
python3 docs/screenshots/issue-1858/labels.py docs/screenshots/issue-1858/software/after/01-close.png \
  docs/screenshots/issue-1858/software/after/labels.json close after \
  docs/screenshots/issue-1858/software/labelled/after-close.png
```

The before side is the same three commands with `before` for `after`. Home is
`02-home.png` and `home`. [frames.mjs](frames.mjs) takes the two cameras at High with the
fleet at rest. [labels.py](labels.py) needs Pillow and the DejaVu fonts.

## Owed

- **Frames on the named GPU**, at the same two cameras, for the owner's glance.
- **The deep body**, from the shape lane, in #1860's second hue. It is not in these frames.

## Related

- [issue-1799](../issue-1799/README.md) — the High slice's target frame and its cameras
- [issue-1859](../issue-1859/README.md) — the far bloom, and the staged Corvette ring
- [free-water-slice.md](../../free-water-slice.md) — §5, the rule and the slots it moved
- [systems-depth.md](../../systems-depth.md) — §1, the bands and the Lid
