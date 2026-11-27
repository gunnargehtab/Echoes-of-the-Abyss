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
- **The deep body** is the second increment, below. It is not in the frames above.

## The deep body

The second increment of #1858: `env-comb-jelly`, six of them under the Shelf's 400 m
line over the rim, in `comb-light`
([art-direction.md](../../art-direction.md#a-comb-jelly-is-eight-seams-of-light);
[free-water-slice.md](../../free-water-slice.md) §5, "Life by depth band"). The owner
chose the body, a comb jelly, and its hue, a sulphur lime, in session on 27 November
2026.

**A software rasteriser drew every frame here too**: SwiftShader, in headless Chromium.
They show where the bodies stand and how they read against the lanterns. They are not
offered for acceptance.

| Camera, High | `main` at 462647b1 | The branch |
| --- | --- | --- |
| Close, eye 233 m deep | [01-high-close.png](deep-body/software/main-high/01-high-close.png) | [01-high-close.png](deep-body/software/branch-high/01-high-close.png) |
| Home, eye over the Lid | [02-high-home.png](deep-body/software/main-high/02-high-home.png) | [02-high-home.png](deep-body/software/branch-high/02-high-home.png) |

The water under the rings, `main` over the branch: [Close at twice](deep-body/software/crop-close.png)
and [Home at three times](deep-body/software/crop-home.png). Reduced motion holds every
body at its loop's start in those. [One Close frame with motion on](deep-body/software/branch-high-moving/01-high-close.png)
shows the bodies a minute and a half round their loops, with crests on the rows. The
model's lit sheet under neutral light is [comb-jelly-inspect.png](comb-jelly-inspect.png).

### What they show

- **Close.** Six lime eggs stand under the hulls' rings, between the Harvester's ring
  and the vent stand, 238 to 522 m from the eye. The nearest to the stand, Comb 5, is at
  the edge of its light. The five lanterns stand over the
  rings, as they did. A body reads as an egg with lit seams from 238 m, and as a lime
  fleck from 522 m.
- **Home.** The six are olive flecks 7 to 9 px tall beside the Harvester and under the
  Light Scout. They are dimmer than the lanterns and smaller. Whether that tells depth
  from this eye is the owner's glance.
- **Nothing else moved at High.** `framediff.mjs` on `main` against the branch finds
  one box that moved at each camera, the one that holds the six: x 400 to 1,024 and
  y 630 to 807 at Close, x 650 to 856 and y 643 to 820 at Home.
- **For the owner's glance.** The lime stands 36.8 dE from Pelagia's accent, and the
  Corvette's searchlight motes are that accent's green. Combs 2 and 6 stand among
  green motes in the water at Close.
- **No survey frame.** From the survey dolly, 10 km off, a 5 m body draws under a
  pixel, so the third camera of [issue-1799](../issue-1799/README.md) shows none of it.

### Levels

[levels.mjs](deep-body/levels.mjs) stands each body where the match's start stands it,
projects it through the frame's camera and reads the brightest pixel in a box about it,
as luma out of 255. The box holds what stands behind the body too.

| Body | Depth | Close: from the eye | Close: peak | Home: from the eye | Home: peak |
| --- | --- | --- | --- | --- | --- |
| Lantern 1 | 190 m | 190 m | 188 | 739 m | 110 |
| Lantern 2 | 179 m | 260 m | 214 | 752 m | 134 |
| Lantern 3 | 206 m | 318 m | 161 | 751 m | 214, before the vent's light |
| Lantern 4 | 155 m | 415 m | 150 | 927 m | 105 |
| Lantern 5 | 170 m | 526 m | 150 | 948 m | 140 |
| Comb 1 | 434 m | 238 m | 133 | 808 m | 94 |
| Comb 2 | 460 m | 522 m | 119 | 1,062 m | 73 |
| Comb 3 | 434 m | 409 m | 98 | 939 m | 95 |
| Comb 4 | 526 m | 342 m | 113 | 878 m | 90 |
| Comb 5 | 450 m | 274 m | 147, before the vent's light | 801 m | 90 |
| Comb 6 | 556 m | 435 m | 108 | 978 m | 79 |

The first cut drew a row at twice these levels, and its nearest body read 181, level
with a lantern.

### Low is unchanged

Low stands no comb jelly. `tools/render-stack/framediff.mjs` reads `main`'s Low frame
against the branch's over the world area, beside a second take of `main` for the noise.
Reduced motion holds the scene, so two takes of one build match to the pixel.

| Camera | Pair | Mean of 255 | Moved over 2 |
| --- | --- | --- | --- |
| Close | `main` twice, the floor | 0.00 | 0.00% |
| Close | `main` against the branch | 0.00 | 0.00% |
| Home | `main` twice, the floor | 0.00 | 0.00% |
| Home | `main` against the branch | 0.00 | 0.00% |

### Reproduce the deep body's frames

With the dev servers running (`npm run dev`), on the branch:

```bash
SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
  node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1858/deep-body/software/branch-high \
  --steps docs/screenshots/issue-1858/deep-body/frames.mjs
node --import tsx --import ./packages/frontend/test/support/viteAssets.mjs \
  docs/screenshots/issue-1858/deep-body/levels.mjs \
  docs/screenshots/issue-1858/deep-body/software/branch-high/01-high-close.png \
  docs/screenshots/issue-1858/deep-body/software/branch-high/02-high-home.png
node tools/render-stack/framediff.mjs \
  docs/screenshots/issue-1858/deep-body/software/main-low-a/01-low-close.png \
  docs/screenshots/issue-1858/deep-body/software/branch-low/01-low-close.png \
  --floor=docs/screenshots/issue-1858/deep-body/software/main-low-b/01-low-close.png
```

`QUALITY=low` takes the Low frames into `branch-low`. `main`'s sets are the same drive
with `packages/frontend/src` and `packages/shared/src` at 462647b1, shared rebuilt, and
`COMBS=0` so the High drive does not wait for a body `main` does not stand. Home's pair is
`02-low-home.png`. The moving frame is the first command without `SETTINGS_JSON`.

### Owed on the deep body

All of it waits on the named GPU, and is listed on
[#1939](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1939):

- **Close and Home frames at High**, for the owner's glance at the six and their hue.
- **One clip**, the camera moving from Home to Close, with the waves running.
- **One unpaced, queued timing run**: the comb jellies' points are one more draw of the
  world pass, and their membranes two more.
- **The colour-vision palettes**, at promotion: tritanopia's token is a ninth as bright
  as the standard lime.

## Related

- [issue-1799](../issue-1799/README.md) — the High slice's target frame and its cameras
- [issue-1859](../issue-1859/README.md) — the far bloom, and the staged Corvette ring
- [free-water-slice.md](../../free-water-slice.md) — §5, the rule and the slots it moved
- [systems-depth.md](../../systems-depth.md) — §1, the bands and the Lid
