# Free water: the kelp forest out of its rows (#1773)

Evidence for §5's "No rows" and §9's "Kelp" as #1773 amends them
([free-water-slice.md §5](../../free-water-slice.md#5-place-to-kit-sheet-and-wildlife-licence)).
The owner read the forest as planted in rows on 6 November 2026. A stand is 120 m long and
69 m wide, and #1751 stood all 56 facing down-current, end to end in four rows at one
125 m pitch, so the forest drew as four strips with bare lanes about 55 m wide between
them. The 56 stands and 16 clusters keep their counts, the tread, the clearing and no
overlap. Each is now cleared by its outline rather than a 120 m disc kept inside its own
cell, turns at most 45 degrees from the current, and stands where a seeded anneal from the
rows of #1751 left it. The list is `KELP_STANDS` and `KELP_CLUSTERS` in
`packages/frontend/src/game/freeWaterDecoration.ts`.

## The plan

[plan.svg](plan.svg) draws the garden from above, north up, before and after (a link):
each stand's and cluster's outline, and a yellow tick down-current from each stand's
centre. Before, four strips of fourteen with lanes between them and a straight fringe of
clusters; after, 42 stands north of the clearing and 14 south of it at varied headings,
with the clusters scattered along the fringe.

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
drives and restored after, into `before/` and `control-before/`. All four sets were taken
headed on a GeForce GTX 1070 (ANGLE, Direct3D 11) at 1,440 × 900 and DPR 1, as each
`readings.json` records.

| Row | Before | After | Reads as |
| --- | --- | --- | --- |
| Opening, as the study opens | [before](before/01-opening.png) | [after](after/01-opening.png) | The hulls in the lower third and the garden's canopy at the top right, too far off for its layout to read |
| Garden close, 1,875 / 1,125, 250 m, 12°, 275 m, `yawDeg` 90 | [before](before/02-garden-close.png) | [after](after/02-garden-close.png) | Before, each flank a continuous wall along the clearing, one stand repeated at one heading; after, stands in clumps and gaps at varied headings, the clearing still the one cut |
| North flank, 2,000 / 900, 500 m, 25°, 300 m, `yawDeg` 0 | [before](before/03-north-flank.png) | [after](after/03-north-flank.png) | Before, three rows one behind another, every stand leaning the same way; after, no row to follow into the flank's depth |
| Garden from above, 2,000 / 1,000, 2,400 m, 88°, seabed | [before](before/04-garden-above.png) | [after](after/04-garden-above.png) | Before, four strips of fourteen; after, the plan above, drawn |
| Survey, 2,000 / 2,000, 10,000 m, 88°, seabed | [before](before/05-survey.png) | [after](after/05-survey.png) | The garden at the top of the bowl: before, four lines of stipple; after, an even texture with no line in it |
| Kelp Labyrinth control: its opening, then its own force from 3,000 m at 60° | [02](control-before/02-opening.png), [03](control-before/03-overview.png) | [02](control-after/02-opening.png), [03](control-after/03-overview.png) | Unchanged: a shipped map places its kelp by the registry's scatter, which #1773 leaves alone (01 is its lobby) |

The garden-close and north-flank frames are dark by design (§9, Light). The
[garden-close](crops/garden-close.png) and [north-flank](crops/north-flank.png) crops
(links) put before above after, each brightened three times, so the stands' layout reads.

## What the probe read

| Frame | Props | Calls | Triangles |
| --- | --- | --- | --- |
| Opening | 291 | 44 | 568,596 |
| Garden close | 291 | 31 | 565,913 |
| North flank | 291 | 23 | 560,617 |
| Garden from above | 291 | 25 | 562,517 |
| Survey | 291 | 45 | 568,986 |
| Control opening | 363 | 74 | 160,006 |
| Control overview | 363 | 74 | 160,006 |

Before and after read the same in every frame: the list moves and turns instances and
adds none, so the props, calls and whole-frame triangles hold, under the study's
720,000-triangle frame cap (§7). The props' own 600,000 reservation holds with them, at
most 568,928 at the per-model ceilings (§7), and the decoration test sums the registry's
budgets under it. The control reads the same too.

## Reproduce the list

```bash
node docs/screenshots/issue-1773/layout.mjs
```

It starts from #1751's rows and anneals every plant under §5's rules, reading each outline
off the committed GLB as the test does: a stand 120 by 69.1 m, a cluster 18 by 13.7 m. It
lowers the two "No rows" readings past the test's bars, turns neighbouring stands apart,
and ends on a max-min pass that lifts the one worst triple a summed cost can leave. With
its defaults, seed 1773 and 16,000 sweeps, it prints the committed list in about 35 s:

```text
// seed 1773, 16000 sweeps: nearest to a row 14.1 m,
// thinnest north-flank line 34% of the tread; stands turned 13.5 degrees on average, 28 within 10
```

The test asks 10 m and a quarter. The stands turn 13.5 degrees on average because the
north flank holds 42 outlines in 371 m of tread, covering 54% of it, and a turned stand
needs more of it. The south flank holds one band of 14 that nearly fills its 1,750 m end
to end, so its stands turn at most 11 degrees and wander across the band rather than out
of it. A seed draws the same list on one engine; the list, not the seed, is the record.

## Tests

`packages/frontend/test/freeWaterDecoration.test.ts`, which reads each outline off the
template the layer builds and turns it by the placement's yaw as the instance matrix does:

- "places every commissioned instance without scatter, scale jitter or truncation": every
  plant within 45 degrees of the current, its outline and sway clear of the clearing, no
  two outlines overlapping, each stand's outline whole on the tread, the eroded floor
  within 40 m of its root across the outline, 42 stands north and 14 south, the counts,
  the 600,000 reservation and the Kelp Labyrinth control.
- "stands no three plants in a row and opens no lane through the forest": §5's two
  readings, over every triple of stands and of clusters, and every east-west line across
  the north flank from `y=650` to `970` every 5 m.
- "a public delta invalidates only placements whose envelopes touch its cells": a change
  takes every placement whose footprint reaches the changed cell, slots in neighbouring
  cells among them, and nothing whose footprint's square stays clear of it.

Each fails without the rule it holds, run on scratch copies of the module and the test:
the rows of #1751 (a stand 0.0 m off the line through its neighbours, and with that check off,
the line `y=650` meeting stands over 0%), a stand turned 50 degrees, a stand moved onto
its neighbour, a south stand moved 7.6 m toward the scarp, a north stand moved 2.3 m
toward the clearing, and the cell check narrowed to a slot's own cell.
