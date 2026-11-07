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
