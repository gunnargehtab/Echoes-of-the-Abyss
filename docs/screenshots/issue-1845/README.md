# The High slice: a beam from each lamp a class carries (#1845)

Frames for a look step of the High graphics quality
([art-direction.md](../../art-direction.md#a-beam-from-each-lamp)), beside
[the target frame](../issue-1799/README.md) at its three cameras, in the free-water crater
with the HUD on.

**The named GPU drew every frame here**: the GTX 1070 of
[graphics-standards.md](../../graphics-standards.md) gate 6, in Edge, headed, on
28 November 2026. The branch is `claude/issue-1845-lamp-beams` at `8e2d058c`, over `main`
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
| Home | [main](gpu/main/05-high-home.png) | [branch](gpu/rest/05-high-home.png), [difference](gpu/rest/diff-high-home-main-vs-branch.png) | The Corvette throws two beams: its bow beam to the pool it had, and a mast beam off its back, ahead and up, a cone of lit snow with no pool. The Harvester's two are faint, and the Light Scout throws none |
| Close | [main](gpu/main/06-high-close.png) | [branch](gpu/rest/06-high-close.png), [difference](gpu/rest/diff-high-close-main-vs-branch.png) | The Corvette's mast cone runs away from the eye, so it stands as a cloud of lit snow over the hull. The Harvester's is a faint streak. The manta is in neither |
| Survey | [main](gpu/main/08-high-survey.png) | [branch](gpu/rest/08-high-survey.png) | The Corvette's wedge east of its ring, as it was. A mast beam adds nothing a survey shows |

The Harvester's beams burn at 0.045 of the lamp halo's full gain at SIG 18, and the
Corvette's at 0.39 at SIG 28. So at rest this fleet shows one hull with two beams.

No class in the study's fleet carries four lamps. The frames below were taken with
[staging.patch](staging.patch) applied to the server, which is never committed: a Cruiser
in the Harvester's berth, at SIG 55.

| Camera | `main`, staged | The branch, staged | What the branch shows |
| --- | --- | --- | --- |
| Home | [main](gpu/cruiser/main-01-high-home.png) | [branch](gpu/cruiser/05-high-home.png) | The Cruiser throws four: its bow beam east, its mast beam from its back over that, and a flood to each side. The port flood's pool lies beyond the hull, behind its stern as this eye sees it. With the Corvette's two the frame draws its six |
| Close | [main](gpu/cruiser/main-02-high-close.png) | [branch](gpu/cruiser/06-high-close.png) | The mast cone leaves the hull's back and rises to the right, over the Light Scout. The bow beam falls from the bow to its pool, and a flood's cone from each side of the hull to the rim. The Cruiser's ring crosses its cones |
| Survey | | [branch](gpu/cruiser/08-high-survey.png) | Two small pools abeam of the Cruiser, north and south of its mark, and its bow wedge |

The clips are the camera moved from Home to Close at High, 1280 × 720:
[the fleet at rest](gpu/rest/clip-home-to-close.mp4) and
[the staged Cruiser](gpu/cruiser/clip-home-to-close.mp4). Each was taken without reduced
motion and cut from a second before the move. The recording ends a few seconds into the
hold at Close.

What the target shows and these do not: white light where these are the navy's green
(limit 3), and at rest a beam on a body.

## No hull is lit by a lamp of its own

`packages/frontend/test/searchlights.test.ts` holds it by geometry: no point of a hull's
box stands in a cone of its own. The staged pair reads it on the hull with the most
lamps:

```bash
node tools/render-stack/framediff.mjs docs/screenshots/issue-1845/gpu/cruiser/main-02-high-close.png \
  docs/screenshots/issue-1845/gpu/cruiser/06-high-close.png \
  --box=cruiser-hull:120,470,440,620 --box=scout:830,505,920,550 --box=corvette:1620,535,1675,572
```

| Region | Mean of 255 | Moved over 2 |
| --- | --- | --- |
| The world area | 12.87 | 21.39% |
| The Cruiser's hull | 0.21 | 0.81% |
| The Corvette's hull | 0.43 | 1.92% |
| The Light Scout | 0.96 | 4.69% |

The Corvette rests 354 m off the Cruiser and outside every cone of it, so its 0.43 is what
the snow moves between two page loads. The Cruiser's hull moves by less than that under its
own four lamps.

The Light Scout rests 250 m dead ahead of the Cruiser at the same depth. With the mast
lamp over the bow, at `4f47436d`, that box read 14.35 and 78.05%: the beam lit the
Scout's fins and ring edges from astern. On the hull's back the lamp stands higher and
the beam passes over it. A hull ahead of a mast lamp and over its level still stands in
the beam, as any hull a beam crosses does. The owner was shown the lit Scout in session
on 28 November 2026 and kept the rule, and the reading under gate 3 waits for #1637's
run.

At rest in the study's own fleet, the same boxes on `gpu/main/06-high-close.png` against
`gpu/rest/06-high-close.png` read 0.29 for the Harvester, 0.43 for the Corvette's hull
and 0.75 for the Light Scout, where the snow alone moves them by 0.27, 0.42 and 0.62 on
the two `02-low-close.png` frames.
[The difference map](gpu/rest/diff-high-close-main-vs-branch.png) is two mast cones and
the snow.

## The manta in a mast beam

The accepted manta ([art-direction.md](../../art-direction.md#a-manta-shows-its-belly))
stood on no beam reaching it at rest. A mast beam can. Two stagings, each taken on
`main` and on the branch at Close, with reduced motion holding the manta at its loop's
start, at 270 / 2,129 and 175 m by the view's own reading.

| Staging | `main` | The branch | The belly, RGB of 255 |
| --- | --- | --- | --- |
| [staging-manta.patch](staging-manta.patch): the Corvette in its own berth, turned west at the manta, 355 m off, at SIG 28 | [main](gpu/manta/corvette-west-main.png) | [branch](gpu/manta/corvette-west-branch.png) | 33, 67, 98 to 34, 68, 98 |
| [staging-belly.patch](staging-belly.patch): a Cruiser at 150 / 2,330, on the belly's side, 234 m off, at SIG 55 | [main](gpu/manta/cruiser-belly-main.png) | [branch](gpu/manta/cruiser-belly-branch.png) | 33, 67, 98 to 232, 247, 224 |

The belly's patch is x 1080 to 1130, y 240 to 300 of each frame. The Corvette's beam
strikes the manta's far side, and the belly this eye sees hardly moves. The Cruiser's
whitens it, and the manta's box differs from `main`'s by 127 of 255. In that frame the
cone passes close over the eye: the world area differs by 34 of 255, and the snow near
the eye draws as discs tens of pixels across.

The owner was shown both stagings in session on 28 November 2026, on the frames taken
with the lamp over the bow, and kept the lamp as built, on the record. The reading of a
belly at 0.7 in a beam waits for #1637's run. A lit mote has a least size and no
greatest (`packages/frontend/src/game/beamMotes.ts`), which is filed apart as
[#1989](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1989).

## What the frame costs

Queued GPU time at High, unpaced, in milliseconds: four runs interleaved branch, `main`,
`main`, branch at `8e2d058c`, and the staged Cruiser after them. The Low quality, which
is one code in both trees, read 1.61 to 1.69 ms at Home in all five, so the runs compare.

| Camera | `main`, 2 beams | The branch at rest, 4 beams | The staged Cruiser, 6 beams |
| --- | --- | --- | --- |
| Home | 3.28, 3.29 | 3.65, 3.78 | 3.94 |
| Close | 3.26, 3.28 | 3.75, 3.76 | 4.13 |
| Low | 2.65, 2.66 | 2.91, 2.87 | 3.10 |
| Survey | 2.74, 2.72 | 2.90, 2.90 | 3.05 |

Gate 6's 8 ms holds at every camera, at the frame's cap of six beams too. Two more beams
cost 0.4 to 0.5 ms at Home and Close, 0.2 to 0.3 ms at the low camera and 0.2 ms at
Survey. The Low quality reads the same in both trees.

At rest the branch draws 69 calls, as `main` does, and 4 triangles more: two more quads in
the cones' one instanced draw. It shows 144,000 motes of snow where `main` shows 72,000.
The staged Cruiser's frame draws 6 beams and 216,000 motes.

A single queued frame read over the 16.7 ms interval in five of the branch's ten High
runs kept here, 17.09 to 28.55 ms, in none of `main`'s six, and once at Low on `main`,
24.28 ms. Gate 6 warns that a queued frame whose handover outlasts the load reads high.
So ten more High runs read the worst frame unqueued beside it, five a tree, the
`worst-` files under [timing](gpu/timing). Unqueued, no frame passes 6.27 ms on the
branch or 6.51 ms on `main`. Queued, one reads 11.55 and one 14.98 ms on the branch, and
one 12.13 and one 17.60 ms on `main`. So the long frames are the queue's, in both trees,
and the step draws none of its own.

Earlier runs are kept under [timing](gpu/timing) and none is read here. `f52b06b9-` is
the first set, with the mast lamp 0.9 of a beam over the keel line. `rest-a`, `rest-b`
and `later-` are the runs with it over the bow, at `4f47436d`, on a machine whose Low
reading moved from 1.68 to 2.85 ms between runs. `branch-again` is this set's second
branch run, and [main](gpu/main/readings.json), [main again](gpu/main-again/readings.json),
[rest](gpu/rest/readings.json) and [the Cruiser](gpu/cruiser/readings.json) are its
others.

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
| Home | 0.13 | 0.16 |
| Close | 0.27 | 0.32 |
| Low | 0.26 | 0.32 |
| Survey | 0.00 | 0.00 |

[The map](gpu/rest/diff-low-close-main-vs-branch.png) is flakes and nothing else: the
snow stands elsewhere from one page load to the next, in one tree as between two. The
first table is the one that reads the change. `main`'s two frame sets there were taken at
`066ddf13` earlier the same day, and the branch's at `8e2d058c`.

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
A staged set is the first command after `git apply` of its patch, which
`git checkout -- packages/backend/src/sim/maps/freeWaterSlice.ts` undoes. The manta's
frames and `main`'s staged Cruiser frames were taken paced, with `QUALITY=high` and
`FRAMES` naming their cameras.

## Related

- [The target frame](../issue-1799/README.md) — the cameras, and who captures
- [issue-1836](../issue-1836/README.md) — the accepted step, one beam a hull
- [art-direction.md](../../art-direction.md#a-beam-from-each-lamp) — what is built, and the
  calls taken
- [asset-prompts-3d.md](../../asset-prompts-3d.md#searchlights-a-hull-class-throws) — the
  count a class
- [graphics-standards.md](../../graphics-standards.md) — gate 6, the two graphics qualities
