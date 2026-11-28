# The High slice: a beam from each lamp a class carries (#1845)

Frames for a look step of the High graphics quality
([art-direction.md](../../art-direction.md#a-beam-from-each-lamp)), beside
[the target frame](../issue-1799/README.md) at its three cameras, in the free-water crater
with the HUD on.

**The named GPU drew every frame here**: the GTX 1070 of
[graphics-standards.md](../../graphics-standards.md) gate 6, in Edge, headed, on
28 November 2026. The branch is `claude/issue-1845-lamp-beams` at `f52b06b9`, over `main`
at `066ddf13`. The look is in development and not accepted. Acceptance is the owner's, at
[#1637](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1637)'s run, and no
frame here was read for gate 7.

## The frames beside the target

![The target frame](../issue-1799/target.png)

The study's fleet at rest: a Light Scout at SIG 6, a Corvette at 28 and a Harvester at 18.
A Light Scout's class carries one lamp, and the other two carry two
([asset-prompts-3d.md](../../asset-prompts-3d.md#searchlights-a-hull-class-throws)).

| Camera | `main` at High | The branch at High | What the branch shows |
| --- | --- | --- | --- |
| Home | [main](gpu/main/05-high-home.png) | [branch](gpu/rest/05-high-home.png), [difference](gpu/rest/diff-high-home-main-vs-branch.png) | The Corvette throws two beams: its bow beam to the pool it had, and a mast beam ahead and up, a cone of lit snow with no pool. The Harvester's two are faint, and the Light Scout throws none |
| Close | [main](gpu/main/06-high-close.png) | [branch](gpu/rest/06-high-close.png), [difference](gpu/rest/diff-high-close-main-vs-branch.png) | The Corvette's mast cone runs away from the eye, so it stands as a cloud of lit snow over the hull. The Harvester's is a faint streak over its back. The manta is in neither |
| Survey | [main](gpu/main/08-high-survey.png) | [branch](gpu/rest/08-high-survey.png) | The Corvette's wedge east of its ring, as it was. A mast beam adds nothing a survey shows |

The Harvester's beams burn at 0.045 of the lamp halo's full gain at SIG 18, and the
Corvette's at 0.39 at SIG 28. So at rest this fleet shows one hull with two beams.

No class in the study's fleet carries four lamps. The frames below were taken with
[staging.patch](staging.patch) applied to the server, which is never committed: a Cruiser
in the Harvester's berth, at SIG 55.

| Camera | The staged Cruiser at High | What it shows |
| --- | --- | --- |
| Home | [frame](gpu/cruiser/05-high-home.png) | The Cruiser throws four: its bow beam east, its mast beam over it, and a flood to each side. The port flood's pool lies beyond the hull, behind its stern as this eye sees it. With the Corvette's two the frame draws its six |
| Close | [frame](gpu/cruiser/06-high-close.png) | The mast cone rises to the right, over the bow beam's pool. A flood's cone falls from each side of the hull to the rim. The Cruiser's ring crosses its cones |
| Survey | [frame](gpu/cruiser/08-high-survey.png) | Two small pools abeam of the Cruiser, north and south of its mark, and its bow wedge |

The clips are the camera moved from Home to Close at High, 1280 × 720:
[the fleet at rest](gpu/rest/clip-home-to-close.mp4) and
[the staged Cruiser](gpu/cruiser/clip-home-to-close.mp4). Each was taken without reduced
motion and cut from a second before the move to the end of its hold.

What the target shows and these do not: white light where these are the navy's green
(limit 3), and a beam on a body. The manta's loop is centred 310 m west of the Corvette,
which heads east.

## What only the new lamps changed at High

`tools/render-stack/framediff.mjs` on `main`'s High frame against the branch's, at Close:

```bash
node tools/render-stack/framediff.mjs docs/screenshots/issue-1845/gpu/main/06-high-close.png \
  docs/screenshots/issue-1845/gpu/rest/06-high-close.png \
  --box=harvester:60,470,410,640 --box=corvette:1600,510,1690,600 --box=scout:830,505,920,550
```

| Region | High pair, mean of 255 | Low pair, mean of 255 |
| --- | --- | --- |
| The world area | 1.12 | 0.36 |
| The Harvester's box | 0.29 | 0.29 |
| The Corvette's box | 0.34 | 0.22 |
| The Light Scout's box | 0.67 | 0.67 |

The Low column is the same command on the two `02-low-close.png` frames: what the snow
alone moves in each box. [The difference map](gpu/rest/diff-high-close-main-vs-branch.png)
is two mast cones and the snow. No hull's cladding took light from its own new lamp: two
boxes read what the snow moves, and the Corvette's top rows hold the foot of its mast
cone. Its bow beam looks 26.5 degrees under the level in both trees' `readings.json`.

## What the frame costs

Queued GPU time at High, unpaced, in milliseconds, two runs a tree
([main](gpu/main/readings.json), [again](gpu/main-again/readings.json);
[branch](gpu/rest/readings.json), [again](gpu/rest-again/readings.json);
[the staged Cruiser](gpu/cruiser/readings.json), one run). The four runs were interleaved:
branch, `main`, `main`, branch.

| Camera | `main`, 2 beams | The branch at rest, 4 beams | The staged Cruiser, 6 beams |
| --- | --- | --- | --- |
| Home | 4.51, 4.44 | 4.93, 5.11 | 5.04 |
| Close | 4.54, 4.33 | 5.10, 5.17 | 5.34 |
| Low | 3.69, 3.57 | 3.88, 3.86 | 3.86 |
| Survey | 3.87, 3.72 | 3.83, 3.93 | 3.96 |

Gate 6's 8 ms holds at every camera, at the frame's cap of six beams too. Two more beams
cost 0.4 to 0.8 ms at Home and Close, 0.2 ms at the low camera and nothing at Survey that
two runs can tell apart. The Low quality reads the same in both trees, 1.95 to 2.72 ms. A
single frame read 23.77 ms in the branch's second run at High and 24.28 ms in `main`'s
second at Low: a hitch of the machine's, in both trees.

At rest the branch draws 69 calls, as `main` does, and 4 triangles more: two more quads in
the cones' one instanced draw. It shows 144,000 motes of snow where `main` shows 72,000.
The staged Cruiser's frame draws 6 beams and 216,000 motes.

## Low does not move

Low throws no beam: `frames.mjs` asserts it at every camera, and
`packages/frontend/test/rendererSmoke.test.ts` counts none. Calls and triangles are the
same in both trees at all four cameras.

The pixels were read twice. First with the water's density at 0, which draws no flake
(`"waterDensity":0` beside the reduced-motion settings, `QUALITY=low`), so two page loads
frame alike:

```bash
node tools/render-stack/framediff.mjs docs/screenshots/issue-1845/gpu/low-control/main/01-low-home.png \
  docs/screenshots/issue-1845/gpu/low-control/branch/01-low-home.png \
  --floor=docs/screenshots/issue-1845/gpu/low-control/main-again/01-low-home.png
```

| Camera | `main` against `main` | `main` against the branch |
| --- | --- | --- |
| Home | 0.00, nothing moved | 0.00, nothing moved |
| Close | 0.00, nothing moved | 0.00, nothing moved |
| Low | 0.00, nothing moved | 0.00, nothing moved |
| Survey | 0.00, nothing moved | 0.00, nothing moved |

Then as a player has it, with the snow, on the `01` to `04` frames of `gpu/main`,
`gpu/main-again` and `gpu/rest`:

| Camera | `main` against `main` | `main` against the branch |
| --- | --- | --- |
| Home | 0.01 | 0.19 |
| Close | 0.01 | 0.36 |
| Low | 0.01 | 0.38 |
| Survey | 0.00 | 0.00 |

Here the pair stands over its floor, and [the map](gpu/rest/diff-low-close-main-vs-branch.png)
is flakes and nothing else: the snow stands elsewhere in the two trees' page loads, where
`main`'s two takes found it alike. The first table is the one that reads the change.

## Reproduce

With the dev servers running (`npm run dev`), on the named GPU:

```bash
UNPACED=1 SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' \
  VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --headed --channel msedge --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1845/gpu/rest --steps docs/screenshots/issue-1845/frames.mjs
CLIP=1 RECORD_VIDEO=docs/screenshots/issue-1845/gpu/rest VIEW_W=1920 VIEW_H=1080 \
  node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
  --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1845/gpu/rest --steps docs/screenshots/issue-1845/frames.mjs
```

The first writes eight frames and `readings.json`, which names every beam by its hull and
its lamp. The second records the clip and prints where the move starts and ends in it.
`main`'s sets are the first command with `packages/frontend/src` checked out from `main`.
The Cruiser's are both commands after `git apply docs/screenshots/issue-1845/staging.patch`,
which `git checkout -- packages/backend/src/sim/maps/freeWaterSlice.ts` undoes. That run's
four Low frames are not kept.

## Related

- [The target frame](../issue-1799/README.md) — the cameras, and who captures
- [issue-1836](../issue-1836/README.md) — the accepted step, one beam a hull
- [art-direction.md](../../art-direction.md#a-beam-from-each-lamp) — what is built, and the
  calls taken
- [asset-prompts-3d.md](../../asset-prompts-3d.md#searchlights-a-hull-class-throws) — the
  count a class
- [graphics-standards.md](../../graphics-standards.md) — gate 6, the two graphics qualities
