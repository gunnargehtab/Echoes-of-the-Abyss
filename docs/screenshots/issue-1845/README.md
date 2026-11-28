# The High slice: a beam from each lamp a class carries (#1845)

Frames for a look step of the High graphics quality
([art-direction.md](../../art-direction.md#a-beam-from-each-lamp)), beside
[the target frame](../issue-1799/README.md) at its three cameras, in the free-water crater
with the HUD on.

**The named GPU drew every frame here**: the GTX 1070 of
[graphics-standards.md](../../graphics-standards.md) gate 6, in Edge, headed, on
28 November 2026. The branch is `claude/issue-1845-lamp-beams` at `4f47436d`, over `main`
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
| Home | [main](gpu/main/05-high-home.png) | [branch](gpu/rest/05-high-home.png), [difference](gpu/rest/diff-high-home-main-vs-branch.png) | The Corvette throws two beams off its bow: the bow beam to the pool it had, and a mast beam ahead and up, a cone of lit snow with no pool. The Harvester's two are faint, and the Light Scout throws none |
| Close | [main](gpu/main/06-high-close.png) | [branch](gpu/rest/06-high-close.png), [difference](gpu/rest/diff-high-close-main-vs-branch.png) | The Corvette's mast cone runs away from the eye, so it stands as a cloud of lit snow over the hull. The Harvester's is a faint streak. The manta is in neither |
| Survey | [main](gpu/main/08-high-survey.png) | [branch](gpu/rest/08-high-survey.png) | The Corvette's wedge east of its ring, as it was. A mast beam adds nothing a survey shows |

The Harvester's beams burn at 0.045 of the lamp halo's full gain at SIG 18, and the
Corvette's at 0.39 at SIG 28. So at rest this fleet shows one hull with two beams.

No class in the study's fleet carries four lamps. The frames below were taken with
[staging.patch](staging.patch) applied to the server, which is never committed: a Cruiser
in the Harvester's berth, at SIG 55.

| Camera | `main`, staged | The branch, staged | What the branch shows |
| --- | --- | --- | --- |
| Home | [main](gpu/cruiser/main-01-high-home.png) | [branch](gpu/cruiser/01-high-home.png) | The Cruiser throws four: its bow beam east, its mast beam over it from the same bow, and a flood to each side. The port flood's pool lies beyond the hull, behind its stern as this eye sees it. With the Corvette's two the frame draws its six |
| Close | [main](gpu/cruiser/main-02-high-close.png) | [branch](gpu/cruiser/02-high-close.png) | The mast cone leaves the bow and rises to the right, over the bow beam's pool. A flood's cone falls from each side of the hull to the rim. The Cruiser's ring crosses its cones |
| Survey | | [branch](gpu/cruiser/04-high-survey.png) | Two small pools abeam of the Cruiser, north and south of its mark, and its bow wedge |

The clips are the camera moved from Home to Close at High, 1280 × 720:
[the fleet at rest](gpu/rest/clip-home-to-close.mp4) and
[the staged Cruiser](gpu/cruiser/clip-home-to-close.mp4). Each was taken without reduced
motion and cut from a second before the move. The recording ends a few seconds into the
hold at Close.

What the target shows and these do not: white light where these are the navy's green
(limit 3), and at rest a beam on a body.

## No hull is lit by a lamp of its own

`packages/frontend/test/searchlights.test.ts` holds it by geometry: every lamp hangs
clear of its hull's box and looks away from it. The staged pair measures it on the hull
with the most lamps:

```bash
node tools/render-stack/framediff.mjs docs/screenshots/issue-1845/gpu/cruiser/main-02-high-close.png \
  docs/screenshots/issue-1845/gpu/cruiser/02-high-close.png \
  --box=cruiser-hull:120,470,440,620 --box=scout:830,505,920,550 --box=corvette:1620,535,1675,572
```

| Region | Mean of 255 | Moved over 2 |
| --- | --- | --- |
| The world area | 11.42 | 18.66% |
| The Cruiser's hull | 0.02 | 0.27% |
| The Corvette's hull | 0.33 | 2.75% |
| The Light Scout | 14.35 | 78.05% |

The Cruiser's cladding does not move under its own four lamps. The Light Scout does: it
rests 250 m dead ahead of the Cruiser at the same depth, inside the mast beam, and its
fins and ring edges take the light from astern. That is a beam crossing another own
hull, as the accepted step lights one, and a mast beam finds a hull ahead where a bow
beam passed under it. A silent hull lit by a loud one's lamp is the owner's reading
under gate 3, and it is not taken.

At rest in the study's own fleet, the same boxes on `gpu/main/06-high-close.png` against
`gpu/rest/06-high-close.png` read 0.25 for the Harvester, 0.67 for the Corvette's hull
and 1.11 for the Light Scout, where the snow alone moves them by 0.24, 0.38 and 0.56 on
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
| [staging-manta.patch](staging-manta.patch): the Corvette in its own berth, turned west at the manta, 355 m off, at SIG 28 | [main](gpu/manta/corvette-west-main.png) | [branch](gpu/manta/corvette-west-branch.png) | 33, 67, 98 to 34, 69, 98 |
| [staging-belly.patch](staging-belly.patch): a Cruiser at 150 / 2,330, on the belly's side, 234 m off, at SIG 55 | [main](gpu/manta/cruiser-belly-main.png) | [branch](gpu/manta/cruiser-belly-branch.png) | 33, 67, 98 to 242, 251, 235 |

The belly's patch is x 1080 to 1130, y 240 to 300 of each frame. The Corvette's beam
strikes the manta's far side, and the belly this eye sees hardly moves. The Cruiser's
whitens it, and the manta's box differs from `main`'s by 168 of 255. In that frame the
eye stands inside the cone: the world area differs by 78 of 255, and the snow near the
eye draws as discs tens of pixels across.

The owner was shown both frames in session on 28 November 2026 and kept the lamp as
built, on the record. The reading of a belly at 0.7 in a beam waits for #1637's run. A lit mote has
a least size and no greatest (`packages/frontend/src/game/beamMotes.ts`), which is filed
apart from this step.

## What the frame costs

Queued GPU time at High, unpaced, in milliseconds. The first set is four runs
interleaved branch, `main`, `main`, branch at `f52b06b9`, when the mast lamp still hung
amidships. In it the Low quality read 2.63 to 2.72 ms at Home in all four runs, so its
runs compare.

| Camera | `main`, 2 beams | The branch at rest, 4 beams | The staged Cruiser, 6 beams |
| --- | --- | --- | --- |
| Home | 4.51, 4.44 | 4.93, 5.11 | 5.04 |
| Close | 4.54, 4.33 | 5.10, 5.17 | 5.34 |
| Low | 3.69, 3.57 | 3.88, 3.86 | 3.86 |
| Survey | 3.87, 3.72 | 3.83, 3.93 | 3.96 |

Two more beams cost 0.4 to 0.8 ms at Home and Close, 0.2 ms at the low camera and
nothing at Survey that two runs can tell apart.

The runs after the lamp moved to the bow, at `4f47436d`, in the order taken. The machine
did not hold still for them: the Low quality, which is one code in both trees, read from
1.68 to 2.85 ms at Home. So each row carries its own Low reading, and these rows do not
resolve what the step costs.

| Run | Low quality at Home | High: Home | Close | Low | Survey |
| --- | --- | --- | --- | --- | --- |
| The branch at rest | 2.61 | 4.90 | 5.07 | 3.93 | 3.93 |
| The branch at rest | 2.35 | 4.12 | 4.13 | 3.22 | 3.29 |
| The staged Cruiser, 6 beams | not taken | 4.24 | 4.50 | 3.31 | 3.42 |
| The branch at rest | 2.28 | 4.07 | 4.16 | 3.75 | 4.03 |
| `main` | 2.73 | 4.64 | 4.53 | 3.81 | 3.89 |
| `main` | 2.85 | 4.47 | 4.40 | 3.63 | 3.85 |
| The branch at rest | 1.68 | 3.64 | 3.75 | 2.88 | 2.89 |

Gate 6's 8 ms holds in every reading of both tables, the six-beam frames with them. The
highest is 5.34 ms. A single frame read over the 16.7 ms interval four times, in two
runs of the branch and one of `main`: 23.77 and 17.09 ms at Home and Close in the first
set's second branch run, 24.28 ms at Low's Survey in its second `main` run, and 17.37 ms
at the low camera in the first later branch run. Their cause was not found. They fall in
both trees and at the Low quality, which throws no beam.

At rest the branch draws 69 calls, as `main` does, and 4 triangles more: two more quads in
the cones' one instanced draw. It shows 144,000 motes of snow where `main` shows 72,000.
The staged Cruiser's frame draws 6 beams and 216,000 motes.

Every run's `readings.json` is kept: [rest](gpu/rest/readings.json),
[main](gpu/main/readings.json), [main again](gpu/main-again/readings.json),
[the Cruiser](gpu/cruiser/readings.json) and the rest under [timing](gpu/timing), where
`f52b06b9-` names the first set and `later-` the last four runs.

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
| Home | 0.01 | 0.14 |
| Close | 0.01 | 0.29 |
| Low | 0.01 | 0.28 |
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
A staged set is the first command, with `QUALITY=high` and `FRAMES` naming its cameras,
after `git apply` of its patch, which
`git checkout -- packages/backend/src/sim/maps/freeWaterSlice.ts` undoes. The manta's four
frames were taken paced.

## Related

- [The target frame](../issue-1799/README.md) — the cameras, and who captures
- [issue-1836](../issue-1836/README.md) — the accepted step, one beam a hull
- [art-direction.md](../../art-direction.md#a-beam-from-each-lamp) — what is built, and the
  calls taken
- [asset-prompts-3d.md](../../asset-prompts-3d.md#searchlights-a-hull-class-throws) — the
  count a class
- [graphics-standards.md](../../graphics-standards.md) — gate 6, the two graphics qualities
