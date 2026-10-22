# #1536 — the interior veil, in display space

The Ventfront Divide at 1440×900, 3.8 km at 55°, over ground no hull of the player's hears.
One drive each: `main` at `a6e380da` before, this branch after, and this branch with the
veil set to 0 in Settings. Headless Chromium on a software rasteriser, so gate 6's GPU time
was not read; it is owed on the named GPU.

| Before | After | Veil off |
| --- | --- | --- |
| [before](cold-ground-before.png) | [after](cold-ground-after.png) | [veil off](cold-ground-veil-off.png) |

Mean pixel, as a share of the veil-off frame:

| Ground | Before (r, g, b) | After (r, g, b) |
| --- | --- | --- |
| Vent field, 300–460 × 540–640 | 0.52, 0.54, 0.74 | 0.67, 0.74, 0.88 |
| Kelp shelf, 1150–1400 × 200–400 | 0.44, 0.38, 0.61 | 0.59, 0.56, 0.76 |

What the frames show: the cold ground is drained rather than blacked out, and blue still
holds above the other two, so it goes towards the water's cold grey. The fog in the frame
pulls every share towards 1, yet the before column falls to or below `VEIL_FLOOR_RGB`'s
0.30, 0.38, 0.62 on the kelp shelf: the bug itself. The after column stays above it.
Embers, vent plumes and props still take the linear table.

## Related

- [ui-ux.md §4.5](../../ui-ux.md#45-the-acoustic-veil), the veil
- [#1532's frames](../issue-1532/README.md), the exterior's half
