# The vignette and the sway

Evidence for [#1003](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1003):
the conn view's slight vignette and slow camera sway, specified in
[art-direction.md](../../art-direction.md#atmosphere-rides-on-top-in-screen-space).
Taken headless in a Linux container on Ventfront, so the frames come from SwiftShader:
they show what is drawn, and no millisecond here is a gate-6 reading.

```bash
node .claude/skills/run-game/scripts/drive.mjs --out <dir> \
  --url 'http://localhost:5173/?map=ventfront-divide' \
  --steps docs/screenshots/issue-1003/atmosphere.mjs
node docs/screenshots/issue-1003/pair.cjs <dir>
```

## The vignette

`vignette-on.png` is the opening view with the HUD; `vignette-off.png` is the same
view 3 s later with the vignette's layer hidden. `vignette-pair.png` sets the lower
world of each side by side, off on the left. The HUD, the hint line and every ring
keep their ink, because the layer sits under the glass.

Mean luma of the two frames, from `vignette-luma.json`:

| Region | Off | On | On ÷ off |
| --- | ---: | ---: | ---: |
| Centre, 400×300 | 26.47 | 26.06 | 0.984 |
| Left edge, 60×300 | 12.72 | 11.45 | 0.900 |
| Right edge, 60×300 | 11.00 | 10.11 | 0.919 |
| Lower-left world corner, 120×100 | 19.45 | 17.23 | 0.886 |

The centre is inside the clear 55%, so its 1.6% is the three seconds between the
frames: the sway, a gliding hull and the collars' crackle. The edges sink by about
a tenth.

## The sway

`sway-probe.json` is five probe readings 2.2–2.5 s apart with the sway on. Focus,
yaw, pitch and dolly hold still while the eye moves: 6 m across, 8 m along and 26 m
in depth, peak to peak, at a 2,600 m dolly. The 0.3% heave and 0.2% drift of a
1,893 m frame allow 7.6 m, 9.3 m and 29.7 m, with the heave's up axis tilted 55°, and
five samples need not land on the peaks. Draw calls stay at 55.
That the sway never turns the camera is held by
`packages/frontend/test/rendererSmoke.test.ts`, "sways by translation alone, and holds
still under reduced motion (#1003)".

## The chromatic split

The split is a pass, so it was read on the named GPU: a GTX 1070 through ANGLE/Direct3D 11,
Edge headed at 1440×900, on 4 October 2026. It is specified in
[art-direction.md](../../art-direction.md#atmosphere-rides-on-top-in-screen-space), and
gate 6 allocates it ([graphics-standards.md](../../graphics-standards.md), "Chromatic
split").

```bash
node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
  --url 'http://localhost:5173/?map=ventfront-divide' --out <dir> \
  --steps tools/render-stack/split-frames.mjs
UNPACED=1 node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
  --url 'http://localhost:5173/?map=ventfront-divide' --out <dir> \
  --steps tools/render-stack/split-cost.mjs
```

`VIEW_DPR=1.5` takes the second ratio, and `?mission=prologue-sorrowgate` the second map.

### The frames

`split-frames.mjs` takes one frame's conn canvas before the split and after it, at
capture.mjs's four cameras. Pixels inside the clear ellipse must come back byte for byte.
Pixels past it are recomputed in JS from the frame before, by the SPEC's rule, and
compared with what the GPU drew. The readings are in `split/frames-*.json`.

| Map, ratio | Inside the ellipse: px, changed | Band px | Band px the split moved | Worst error vs the rule | Px over 1 level | Widest separation |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Ventfront, 1 | 615,808, 0 | 680,192 | 0.9–5.9 % | 1.09 levels | 1 | 0.998 px |
| Ventfront, 1.5 | 1,385,632, 0 | 1,530,368 | 0.7–4.0 % | 1.27 levels | 7 | 0.999 px |
| Sorrowgate, 1 | 615,808, 0 | 680,192 | 0–6.3 % | 0.81 levels | 0 | 0.998 px |

The middle of the frame is untouched at every camera. In the band the GPU draws the rule to
within 1.27 levels of 255 everywhere, and to within one level in all but at most four
pixels of a frame: bilinear weights on the GPU are fixed-point, and the rule is double
precision. "Px over 1 level" sums the four cameras. So the separation never passes a
pixel, and the colours are the SPEC's. Most of the band is flat dark water, which a split
leaves as it is: 0–6.3 % of it moved at all, and Sorrowgate's survey camera moved nothing.

`split/crop-*.png` is the 32-pixel window of the band the split moved most, magnified 8×
with no smoothing: before, after, and the difference ×8. At Ventfront's home camera the
window holds kelp tips near the lower-right corner. Each tip takes a cyan edge on the side
toward the frame's centre and a magenta one on the side away from it. At the
low camera it is the map's rim on the left edge, which is world furniture and splits with
the ground. `split/home-ventfront-dpr1.png` is the whole frame with the HUD: at full size
the split is the barely visible effect style-neon-noir.md asks for.

### The cost

`split-cost.mjs` reads the split off and on at each station, unpaced and queued, as
`halo-cost.mjs` reads the halo, with the halo on as a player has it. Two runs of each map
and ratio; each cell gives both. The split is on − off `avgGpuMs`; the copy and the draw
are each pass in a query of its own; the last column is the whole conn frame with the
split on. All in ms. The records are `split/cost-<map>-<ratio>-<run>.json`.

| Map | Ratio | Station | Split | Copy | Draw | Conn frame |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| Ventfront | 1 | home | 0.06, 0.07 | 0.05, 0.05 | 0.02, 0.02 | 0.60, 0.62 |
| Ventfront | 1 | close | 0.07, 0.07 | 0.05, 0.05 | 0.02, 0.02 | 0.70, 0.71 |
| Ventfront | 1 | low | 0.07, 0.06 | 0.05, 0.05 | 0.02, 0.02 | 0.62, 0.62 |
| Ventfront | 1 | survey | 0.06, 0.07 | 0.05, 0.05 | 0.02, 0.02 | 0.58, 0.59 |
| Ventfront | 1 | fight | 0.08, 0.07 | 0.05, 0.05 | 0.02, 0.02 | 0.66, 0.66 |
| Ventfront | 1.5 | home | 0.16, 0.15 | 0.10, 0.10 | 0.05, 0.05 | 1.23, 1.23 |
| Ventfront | 1.5 | close | 0.12, 0.13 | 0.10, 0.10 | 0.05, 0.05 | 1.41, 1.43 |
| Ventfront | 1.5 | low | 0.14, 0.15 | 0.10, 0.10 | 0.05, 0.05 | 1.23, 1.23 |
| Ventfront | 1.5 | survey | 0.13, 0.14 | 0.10, 0.10 | 0.05, 0.05 | 1.12, 1.14 |
| Ventfront | 1.5 | fight | 0.15, 0.13 | 0.10, 0.10 | 0.05, 0.06 | 1.25, 1.25 |
| Sorrowgate | 1 | home | 0.07, 0.08 | 0.05, 0.05 | 0.02, 0.02 | 0.34, 0.35 |
| Sorrowgate | 1 | close | 0.09, 0.07 | 0.05, 0.05 | 0.02, 0.02 | 0.66, 0.65 |
| Sorrowgate | 1 | low | 0.07, 0.09 | 0.05, 0.05 | 0.02, 0.02 | 0.37, 0.38 |
| Sorrowgate | 1 | survey | 0.06, 0.07 | 0.05, 0.05 | 0.02, 0.02 | 0.22, 0.25 |
| Sorrowgate | 1.5 | home | 0.15, 0.13 | 0.11, 0.11 | 0.05, 0.05 | 0.65, 0.65 |
| Sorrowgate | 1.5 | close | 0.17, 0.15 | 0.10, 0.10 | 0.05, 0.05 | 1.36, 1.34 |
| Sorrowgate | 1.5 | low | 0.16, 0.17 | 0.10, 0.11 | 0.05, 0.05 | 0.66, 0.67 |
| Sorrowgate | 1.5 | survey | 0.13, 0.10 | 0.10, 0.10 | 0.05, 0.05 | 0.42, 0.43 |

The split costs the same wherever the camera looks, because its work is the whole drawing
buffer: 0.06–0.09 ms at ratio 1 and 0.10–0.17 ms at 1.5, against gate 6's 0.12 and
0.24 ms. Two-thirds of it is the copy, which resolves 4× samples, and it scales with the
pixels: 2.25 times the pixels at 1.5, about twice the time. `avgConnMs`, the CPU side, moved
by −0.07 to +0.09 ms on − off, which is the spread between runs. Every queued reading's
load outlasted its unqueued frame, as the script asserts, and no reading dropped a frame
to a disjoint event.
