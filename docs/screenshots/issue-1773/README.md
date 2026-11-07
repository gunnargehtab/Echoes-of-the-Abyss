# Free water: the kelp forest out of its rows (#1773)

Evidence for §5's "No rows" and §9's "Kelp" as #1773 amends them
([free-water-slice.md §5](../../free-water-slice.md#5-place-to-kit-sheet-and-wildlife-licence)).
The owner read the forest as planted in rows on 6 November 2026. A stand is 120 m long and
69 m wide, and #1751 stood all 56 facing down-current, end to end in four rows at one
125 m pitch, so the forest drew as four strips with bare lanes about 55 m wide between
them. The 56 stands and 16 clusters keep their counts, the tread, the clearing and no
overlap. Each is now cleared by its outline rather than a 120 m disc kept inside its own
cell, turns at most 45 degrees from the current, and stands where a seeded anneal from the
rows of #1751 left it: 46 north of the clearing and 10 south, so the south band opens four
gaps. The owner's five calls are recorded on the issue
([#1773](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1773#issuecomment-6711814826)).
The list is `KELP_STANDS` and `KELP_CLUSTERS` in
`packages/frontend/src/game/freeWaterDecoration.ts`.

## The plan

[plan.svg](plan.svg) draws the garden from above, north up, before and after (a link):
each stand's and cluster's outline, and a yellow tick down-current from each stand's
centre. Before, four strips of fourteen with lanes between them and a straight fringe of
clusters; after, 46 stands north of the clearing at varied headings, 10 south of it in
clumps with four gaps of 60 m or more, and the clusters scattered along the fringe.

## The frames

Run the dev servers, then the frames module against the study and the Kelp Labyrinth
control:

```bash
node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
  --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1773/after --steps docs/screenshots/issue-1773/frames.mjs
CONTROL=1 node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
  --url 'http://localhost:5173/?map=kelp-labyrinth' \
  --out docs/screenshots/issue-1773/control-after --steps docs/screenshots/issue-1773/frames.mjs
```

The before sets are the same two commands with `origin/main`'s
`packages/frontend/src/game/freeWaterDecoration.ts`, at `273e3517`, swapped in between
drives and restored after, into `before/` and `control-before/`. Every set was taken
headed on a GeForce GTX 1070 (ANGLE, Direct3D 11) at 1,440 × 900 and DPR 1, as each
`readings.json` records.

| Row | Before | After | Reads as |
| --- | --- | --- | --- |
| Opening, as the study opens | [before](before/01-opening.png) | [after](after/01-opening.png) | The hulls in the lower third and the garden's canopy at the top right, too far off for its layout to read |
| Garden close, 1,875 / 1,125, 250 m, 12°, 275 m, `yawDeg` 90 | [before](before/02-garden-close.png) | [after](after/02-garden-close.png) | Before, each flank a continuous wall along the clearing, one stand repeated at one heading; after, stands in clumps and gaps at varied headings, the clearing still the one cut |
| North flank, 2,000 / 900, 500 m, 25°, 300 m, `yawDeg` 0 | [before](before/03-north-flank.png) | [after](after/03-north-flank.png) | Before, three rows one behind another, every stand leaning the same way; after, no row to follow into the flank's depth |
| Garden from above, 2,000 / 1,000, 2,400 m, 88°, seabed | [before](before/04-garden-above.png) | [after](after/04-garden-above.png) | Before, four strips of fourteen; after, the plan above, drawn |
| Low, 2,000 / 2,000, 1,600 m, 12°, 850 m, `yawDeg` 0 | [before](before/05-low.png) | [after](after/05-low.png) | The garden on the far rim at the top of the frame: before, the south band one unbroken strip with three rows behind it; after, the band in clumps with gaps and the forest behind it irregular |
| Survey, 2,000 / 2,000, 10,000 m, 88°, seabed | [before](before/06-survey.png) | [after](after/06-survey.png) | The garden at the top of the bowl: before, four lines of stipple; after, the north flank an even texture and the south band a broken line of clumps |
| Kelp Labyrinth control: its opening, then its own force from 3,000 m at 60° | [02](control-before/02-opening.png), [03](control-before/03-overview.png) | [02](control-after/02-opening.png), [03](control-after/03-overview.png) | Unchanged: a shipped map places its kelp by the registry's scatter, which #1773 leaves alone (01 is its lobby) |

The study's frames are dark by design (§9, Light). Three crops (links) put before above
after: [garden close](crops/garden-close.png) and [the north flank](crops/north-flank.png),
brightened three times, and [Low's band](crops/low.png), rows 240 to 360, brightened four
times.

## What the probe read

| Frame | Props | Calls | Triangles |
| --- | --- | --- | --- |
| Opening | 291 | 44 | 568,596 |
| Garden close | 291 | 31 | 565,913 |
| North flank | 291 | 23 | 560,617 |
| Garden from above | 291 | 25 | 562,517 |
| Low | 291 | 26 | 561,017 |
| Survey | 291 | 45 | 568,986 |
| Control opening | 363 | 74 | 160,006 |
| Control overview | 363 | 74 | 160,006 |

Before and after read the same in every frame: the list moves and turns instances and
adds none, so the props, calls and whole-frame triangles hold, under the study's
720,000-triangle frame cap (§7). The props' own 600,000 reservation holds with them, at
most 568,928 at the per-model ceilings (§7), and the decoration test sums the registry's
budgets under it. The control reads the same too.

## Motion and reduced motion

`MOTION=1 FRAMES=garden-close,north-flank` shoots each of those poses again ten seconds of
match later, and `SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}'` stores
reduced motion for the second drive. The sway is object-space
(`packages/frontend/src/game/environmentModels.ts`), so a turned stand sways along its own
heading, the way its stalks lean.

- **Motion.** [motion/04](motion/04-north-flank.png) and
  [motion/05](motion/05-north-flank-later.png), and the garden-close pair 02 and 03, are
  one camera ten seconds apart: the stands sway and the life moves, and 115,273 of the
  604,800 pixels in rows 180 to 600 of the north-flank pair change by more than 8 levels
  (24,304 at garden close), marine snow included.
- **Reduced motion.** [reduced-motion/04](reduced-motion/04-north-flank.png) and
  [reduced-motion/05](reduced-motion/05-north-flank-later.png), and 02 and 03, are the
  same pairs with reduced motion stored: no pixel in those rows changes by more than one
  level, the sway held. Outside them only the HUD's clock and one panel border change.

## Hardware

`docs/screenshots/issue-1713/gpu.mjs`, unpaced, with the animation running, at the
fixture's 291 props and 156 photophores:

```bash
UNPACED=1 VIEW_DPR=1 GPU_PROPS=291 GPU_PHOTOPHORES=156 \
  node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
  --url 'http://localhost:5173/?study=free-water' --out <dir> \
  --steps docs/screenshots/issue-1713/gpu.mjs
```

Each revision was read twice at DPR 1 and 1.5 on the GeForce GTX 1070 through Edge/ANGLE
D3D11, the revisions interleaved, `before` with `origin/main`'s `freeWaterDecoration.ts`
served as above. Every window holds at least 240 samples and every queue load, 3.63 ms or
more, outlasts the frame it measures. The table gives both runs' queued time, gate 6's
reading, as the files record it; the raw runs are
`gpu/{before,after}/dpr-{1,1.5}/run-{1,2}.json`, for example
[gpu/after/dpr-1/run-1.json](gpu/after/dpr-1/run-1.json).

| Station | Calls | Triangles | DPR 1 queued ms, two runs, before → after | DPR 1.5 queued ms, two runs, before → after |
| --- | --- | --- | --- | --- |
| Home | 44 | 568,986 | 1.07, 1.10 → 1.09, 1.10 | 1.83, 1.83 → 1.83, 1.84 |
| Garden, 1,875 / 875 at `yawDeg` 0 | 23 | 560,617 | 1.19, 1.21 → 1.21, 1.18 | 2.01, 2.05 → 2.07, 2.03 |
| Low | 26 | 561,017 | 0.99, 1.03 → 1.00, 1.01 | 1.54, 1.48 → 1.53, 1.50 |
| Survey | 45 | 568,986 | 0.93, 0.93 → 0.94, 0.93 | 1.48, 1.50 → 1.48, 1.48 |

Calls and triangles hold at every station. One revision's two runs differ by up to
0.06 ms queued, and every mean moves less than that: the most, the garden station at
DPR 1.5, where the camera looks north into the flank from the clearing, moves 2.03 →
2.05 ms. Unqueued time scatters more, up to 0.19 ms between one revision's runs.

## Reproduce the list

```bash
node docs/screenshots/issue-1773/layout.mjs
```

It starts from #1751's rows, lifts four stands out of the south row, which opens the
band's gaps, and seats them on the north flank as its anneal makes room. It anneals every
plant under §5's rules, the sway's reach by heading and the band's four gaps among them.
Each outline is its GLB's box, the longer side scaled to the registry footprint: a stand
120 by 69.1 m, a cluster 18 by 13.7 m. That box bounds the template the decoration test
reads, so a list that clears it clears the test. The anneal lowers the "No rows" readings
past the test's bars, turns neighbouring stands apart, and ends on a max-min pass that
lifts the one worst triple a summed cost can leave. With its defaults, seed 1773 and
16,000 sweeps, it prints the committed list in about 35 s:

```text
// seed 1773, 16000 sweeps: nearest to a row 14.9 m,
// thinnest north-flank line 31% of the tread; stands turned 14.9 degrees on average, 24 within 10
// 46 stands north and 10 south, the south band's gaps of 60 m or more: 4
```

The test asks 10 m, a quarter and four gaps. The stands turn 14.9 degrees on average
because the north flank's 46 outlines cover about 58% of its tread, and a turned stand
needs more of it. The south band is one stand deep, so its ten turn at most 18 degrees
and wander across it. A seed draws the same list on one engine; the list, not the seed, is
the record.

## Tests

`packages/frontend/test/freeWaterDecoration.test.ts`, which reads each outline off the
template the layer builds and turns it by the placement's yaw as the instance matrix does:

- "places every commissioned instance without scatter, scale jitter or truncation": every
  plant within 45 degrees of the current, its outline and its sway's reach by heading
  clear of the clearing, no two outlines overlapping, each stand's outline whole on the
  tread, the eroded floor within 40 m of its root across the outline, 46 stands north and
  10 south, the clusters' fringe, the counts, the 600,000 reservation and the Kelp
  Labyrinth control.
- "stands no three plants in a row, opens no lane and breaks the south band": §5's three
  readings, over every triple of stands and of clusters, every east-west line across the
  north flank from `y=650` to `970` every 5 m, and the south band's gaps.
- "a public delta invalidates only placements whose envelopes touch its cells": a change
  takes every placement whose footprint reaches the changed cell, slots in neighbouring
  cells among them, and nothing whose footprint's square stays clear of it.

Twelve negative controls, each run on scratch copies of the module and, where a check
had to be isolated, the test, fail on the check they target: the rows of #1751 (a stand
0.0 m off the line through its neighbours, and with that check off, the line `y=650`
meeting stands over 0%), a stand turned 50 degrees, a stand moved onto its neighbour, a
south stand moved 3 m toward the scarp, one moved onto the scarp with the tread check off
(the floor 100 m from its root), a north stand moved 1 m past its sway's reach toward the
clearing, a south stand dropped (9 south), a cluster moved 2 m out of the fringe, three
clusters stood in line, a south stand moved 40 m to close a gap (3 gaps left), and the
cell check narrowed to a slot's own cell.
