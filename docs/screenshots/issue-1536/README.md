# #1536 — the interior veil, in display space

The Ventfront Divide at 1440×900, 3.8 km at 55°, over ground no hull of the player's hears.
One drive each: `main` at `a6e380da` before, this branch after, and this branch with the
veil set to 0 in Settings. Headless Chromium on a software rasteriser, so gate 6's GPU time
was not read; #1551 holds that reading for the named GPU.

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

## The props and the lights

The vent field at 1.4 km and 40°, the same three drives: `main` at `bfeb8615`, with the
ground already fixed, before; this branch after, and with the veil off.

| Before | After | Veil off |
| --- | --- | --- |
| [before](vents-before.png) | [after](vents-after.png) | [veil off](vents-veil-off.png) |

| Pixels | Before (r, g, b) | After (r, g, b) |
| --- | --- | --- |
| A rock prop, 447–461 × 527–537 | 0.30, 0.28, 0.35 | 0.36, 0.46, 0.64 |
| A plume column, 485–515 × 560–650 | 0.43, 0.49, 0.69 | 0.44, 0.53, 0.74 |

The prop now drains to near the floor's proportions rather than below them. The plume
barely moves: on a light's bright colours a linear multiply and a display one nearly
agree, and the toe is where they part. The prologue at home, in held water, draws as
`main` does, 186 props with their glow, and the console stays clean.

## Related

- [ui-ux.md §4.5](../../ui-ux.md#45-the-acoustic-veil), the veil
- [#1532's frames](../issue-1532/README.md), the exterior's half
