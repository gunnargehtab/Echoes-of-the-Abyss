# #1001 — the conn view's GPU time, before the lamp core

Gate 6 asks every render-stack change for the frame's GPU time on the named GPU, every
pass summed, before and after ([graphics-standards.md](../../graphics-standards.md),
"Abyss Render Stack increment"). These are the first such readings, and the "before" for
the lamp core ([#1021](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1021)).

`__perspectiveProbe` reports `avgGpuMs` and `worstGpuMs` from a timer query
(`EXT_disjoint_timer_query_webgl2`) that brackets the frame's passes
(`packages/frontend/src/game/gpuTimer.ts`), in a development build only. Hardware: GTX
1070 through ANGLE/Direct3D 11, headed Edge, 1440×900; the client at `cc5f24ed`, and
`drive.mjs`, `capture.mjs` and `stations.mjs` as at `36920695`. Every reading
below had `gpuTimer: timing`, 240 GPU frames in its average and no result dropped to a
disjoint event.

## Read it unpaced

Paced at the display's 60 fps, the frame leaves the GPU mostly idle, the driver lowers its
clock, and a timer query measures the clock as much as the frame. Three paced runs of the
same Ventfront capture (`paced/`):

| Camera | Ratio 1, three runs (avg ms) | Ratio 1.5, three runs (avg ms) |
| --- | --- | --- |
| home | 2.00 · 2.01 · 1.98 | 1.80 · 1.72 · 1.79 |
| close | 2.30 · 2.29 · 2.25 | 1.02 · 1.99 · 2.09 |
| low (12°) | 2.52 · 2.04 · 2.13 | 0.95 · 1.69 · 1.77 |
| survey | 2.04 · 1.87 · 1.86 | 0.54 · 1.36 · 1.45 |

The same frame at 2.25 times the fragments reads *less*, and one run reads half the
next. The GPU clock shows why. `nvidia-smi`, sampled every 500 ms through one more capture of
each kind (`clock.csv` and `ventfront-dpr1-clock.json` in each folder), read the GPU in its P8 state at
139–405 MHz (median 215) while paced, and in P0 at 1,771 MHz while unpaced; that pair read
home 1.92 ms paced and 0.48 ms unpaced. Unpaced (vsync and the frame-rate limit off, about
240–460 fps), the GPU stays loaded and the readings repeat and grow with the pixel count.
That is gate 6's reading; an unpaced run's frame times are no frame budget, so a
frame-time drive stays paced.

```powershell
$env:UNPACED = '1'; $env:VIEW_DPR = '1.5'
node .claude\skills\run-game\scripts\drive.mjs --headed --channel msedge `
  --url 'http://localhost:5173/?map=ventfront-divide' --out <dir> `
  --steps tools\render-stack\capture.mjs
```

For the tutorial use `?mission=prologue-sorrowgate`; for the fight station use
`.claude\skills\run-game\scripts\stations.mjs` as the steps file.

## The readings (`unpaced/`)

Average / worst GPU ms per camera. A worst near 26 ms is a single hitch, such as the
first frame of a view, and the average is the reading.

| Map, camera | Ratio 1 (1440×900) | Ratio 1 repeat | Ratio 1.5 (2160×1350) | Ratio 1.5 repeat | Calls / triangles |
| --- | --- | --- | --- | --- | --- |
| Ventfront home | 0.46 / 2.51 | 0.57 / 26.88 | 0.69 / 4.41 | 0.64 / 2.27 | 55 / 148,290 |
| Ventfront close | 0.49 / 3.39 | 0.47 / 1.89 | 0.75 / 1.42 | 0.75 / 1.73 | 54 / 148,290 |
| Ventfront low | 0.42 / 1.88 | 0.44 / 2.39 | 0.62 / 26.04 | 0.61 / 1.77 | 55 / 148,290 |
| Ventfront survey | 0.43 / 3.95 | 0.37 / 2.22 | 0.59 / 3.31 | 0.54 / 2.12 | 55 / 148,290 |
| Sorrowgate home | 0.35 / 1.04 | | 0.52 / 1.27 | | 45 / 47,422 |
| Sorrowgate close | 0.40 / 1.20 | | 0.68 / 1.56 | | 45 / 47,422 |
| Sorrowgate low | 0.35 / 24.07 | | 0.53 / 26.81 | | 46 / 47,422 |
| Sorrowgate survey | 0.24 / 2.03 | | 0.34 / 2.48 | | 45 / 47,422 |
| Ventfront fight station | 0.62 / 5.28 | | 0.85 / 6.94 | | 57 / 148,578 |

The fight station is `stations.mjs`'s, with three own ordnance in the water; its other
four stations are in `unpaced/stations-dpr1.json` and `stations-dpr1.5.json`. Calls and
triangles match #974's readings, so the timer added no draw. Two runs of one camera agree
within 0.11 ms, which is the smallest change these readings can resolve.

## Halo readings, with the lamp core in place

What a lamp halo would have to work with, read before any halo exists, so the owner can
pick point halos, a full-screen pass or none
([graphics-standards.md](../../graphics-standards.md) gate 6). Same hardware; the
client at `99d9d8d8` with this increment's lamp hook; `halo/` holds the JSON.
`tools/render-stack/halo.mjs` reads the game at capture.mjs's four cameras, and
`tools/render-stack/route-cost.mjs` times each route's own passes on a stand-in scene.
The GPU time at gate 6's stations, the low camera and the fight station included, is
[issue-1021](../issue-1021/README.md)'s after set, taken on the same lamp core and cited
rather than taken again: between the two only comments changed in the client.

### Near-black share

The share of pixels whose encoded luma is under 5, 10 and 20 %. style-neon-noir.md asks
85–90 % near-black of any frame and names no threshold, so three are given. The conn
canvas is the world alone; the frame is everything the player sees, HUD included.

| Map, camera | Conn canvas: under 5 / 10 / 20 % | Frame with HUD: under 5 / 10 / 20 % | Ratio 1.5, frame under 10 % |
| --- | --- | --- | --- |
| Ventfront home | 82.7 / 97.6 / 99.1 | 39.8 / 77.7 / 96.6 | 77.6 |
| Ventfront close | 45.7 / 96.0 / 98.7 | 30.0 / 72.0 / 96.3 | 70.8 |
| Ventfront low | 29.3 / 99.0 / 99.6 | 7.8 / 69.3 / 97.1 | 69.4 |
| Ventfront survey | 95.5 / 98.8 / 99.6 | 53.1 / 82.6 / 97.3 | 82.7 |
| Sorrowgate home | 60.8 / 99.2 / 99.7 | 16.1 / 64.5 / 96.0 | 65.6 |
| Sorrowgate close | 29.2 / 99.2 / 99.7 | 4.1 / 63.3 / 95.7 | 64.6 |
| Sorrowgate low | 45.9 / 99.3 / 99.8 | 15.1 / 62.3 / 96.0 | 65.0 |
| Sorrowgate survey | 89.6 / 99.6 / 99.9 | 32.3 / 65.2 / 96.1 | 66.2 |

Under 10 %, the world alone is 96.0–99.7 % near-black at every camera and both
ratios. The frame with the HUD is 62.3–82.7 %, under the 85 % the style asks for,
and the HUD is what takes it there. A halo adds light to the world half.

### Lamp sizes on screen

Each lamp site's radius (one connected bulb or strip, `lampScreen.ts`), at pixel ratio
1; sizes are CSS pixels, so ratio 1.5 reads the same.

| Map, camera | Lamp sites | Radius min / median / 90th / max (CSS px) |
| --- | --- | --- |
| Ventfront home | 113 | 0.25 / 2.63 / 10.62 / 40.82 |
| Ventfront close | 113 | 0.33 / 3.34 / 14.63 / 52.82 |
| Ventfront low | 113 | 0.25 / 2.43 / 10.88 / 38.94 |
| Ventfront survey | 113 | 0.13 / 1.46 / 5.51 / 21.8 |
| Sorrowgate home | 30 | 0.34 / 0.35 / 0.59 / 0.74 |
| Sorrowgate close | 30 | 0.42 / 0.44 / 0.87 / 1.08 |
| Sorrowgate low | 30 | 0.32 / 0.34 / 0.64 / 0.8 |
| Sorrowgate survey | 30 | 0.24 / 0.24 / 0.38 / 0.48 |

At Ventfront most lights are a few pixels across and the largest is the Foundry's flood
bay. Every Sorrowgate site has a radius of at most 1.08 px, at every camera.

### Light against SIG

Each own entity in view at Ventfront's home camera: its lamps' camera-facing area, and
its light, that area times the displayed lamp's luminance in linear light, which is what
a source built from the emissive term would carry before occlusion. "Lost at white" is
the share of a unit's lamp light past white under gate 3's lamp core at a ping (SIG 95,
under the live factor's clamp) and at its firing burst.

| Entity (Ventfront, home) | SIG now / at rest | Lamp area (CSS px²) | Light | Largest site (px) | Lost at white: ping / firing |
| --- | --- | --- | --- | --- | --- |
| Foundry | 25 / 25 | 4051.5 | 2325.12 | 40.82 | — / — |
| Bastion | 35 / 35 | 512 | 289.31 | 7.45 | — / — |
| Caisson | 64 / 64 | 48.6 | 25.51 | 10.62 | 81.8 % / 81.7 % |
| Caisson | 64 / 64 | 48.5 | 25.45 | 10.62 | 81.8 % / 81.7 % |
| Light Scout | 6 / 6 | 5.8 | 3.33 | 2.22 | 83.3 % / 65.7 % |
| Harvester | 40 / 18 | 2.9 | 1.66 | 0.55 | 83.3 % / — |

A halo built from the emissive term would order light by lit area, not by loudness: the
SIG-25 Foundry carries about 91 times a SIG-64 Caisson's light, and the SIG-35 Bastion
about 11 times. At Sorrowgate, two Harvesters (SIG 18) carry 0.95 each against four
scouts' (SIG 6) 0.48, which does follow SIG. A ping or a firing burst would lose 66–83 %
of a unit's lamp light to the white the core holds, which is the flare a halo could carry.

### A ping's flash

No halo exists, so the flash a halo would add is bounded rather than measured. For the
unit in view whose halo would cover most, discs of 2, 4 and 8 times each lamp site's
radius are counted as flashing in full, over the frame and over one window a third of
the frame each way, all of it placed in that window. WCAG 2.3.1's general-flash limit is
25 % of a 10° field, and it applies only to more than three flashes in a second.

| Map, camera | 2×: frame / window % | 4× | 8× | Unit |
| --- | --- | --- | --- | --- |
| Ventfront home | 0.3 / 2.9 | 1.3 / 11.5 | 5.1 / 46.1 | Caisson |
| Ventfront close | 0.6 / 5.5 | 2.4 / 21.8 | 9.7 / 87.3 | Caisson |
| Ventfront low | 0.3 / 3.0 | 1.3 / 12.0 | 5.3 / 48.1 | Caisson |
| Ventfront survey | 0.1 / 0.8 | 0.3 / 3.1 | 1.4 / 12.5 | Caisson |
| Sorrowgate home | 0.0 / 0.0 | 0.0 / 0.1 | 0.0 / 0.3 | Harvester |
| Sorrowgate close | 0.0 / 0.0 | 0.0 / 0.1 | 0.1 / 0.6 | Harvester |
| Sorrowgate low | 0.0 / 0.0 | 0.0 / 0.1 | 0.0 / 0.3 | Harvester |
| Sorrowgate survey | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.1 | Harvester |

The no-halo baseline, measured: between the frame before a Light Scout's ping at the home
dolly and the frame once its SIG 95 had arrived, the pixels whose relative luminance moved
by at least 0.1, the darker under 0.8. The conn canvas changed in 0.00–0.01 % of its pixels,
since the scout's lamp is held at white and has no flare left. The frame with the HUD,
whose ping ring is the change, moved in 0.36–0.37 %, and in at most 2.2 % of any such
window. A ping holds SIG 95 for 3 s and a repeat refreshes the timer, so one hull changes
state at most once every 3 s. Sorrowgate strikes the ping.

### What each route costs on its own

`route-cost.mjs`, unpaced, average GPU ms over 240 frames on a 4× MSAA canvas.

| Part | Draw calls | 1440×900 | 2160×1350 |
| --- | --- | --- | --- |
| Full-screen: copy the canvas depth | a blit, not a draw | 0.154 | 0.290 |
| Full-screen: 250 lamp sites into a full-size half-float source | 1 here; one per lamp mesh in the game | 0.008 | 0.017 |
| Full-screen: blur over three mips from half size | 11 | 0.098 | 0.173 |
| Full-screen: add onto the canvas | 1 | 0.033 | 0.055 |
| Full-screen, total, and its targets | 12 + the source's | 0.29, 21.32 MiB | 0.54, 47.97 MiB |
| 1024 point halos in the canvas pass | 1 | 0.013 | 0.011 |

The stand-in draws the source as one instanced draw of 250 quads, so its time is a floor:
in the game the source redraws each lamp mesh, one call each. Its point sprites are 4–48 px
across, under the 53 px radius the largest Ventfront site reaches at close.
Against the conn frame's own GPU time (issue-1021's after set), the full-screen route would
add 55–67 % at Ventfront's cameras at ratio 1 and 72–92 % at 1.5, 73–113 % and
82–167 % at Sorrowgate's, whose frame is lighter, and 42 % and 61 % at the fight station; the
point layer adds nothing these readings resolve.

The depth copy must ask for depth only: with the stencil bit as well it took 5–7 ms at
1440×900, though the canvas has no stencil (`?mask=depthstencil` shows it). Its values
match the same scene's depth drawn single-sampled in all but 1.0 % of pixels at 1440×900
and 0.8 % at 2160×1350, the edges, where the 4× resolve keeps a sample the reference did not
draw.

The lamp halo's masked composite needs a canvas stencil, so the copy was read again with
one: `node tools/render-stack/route-cost.mjs --stencil` gives the canvas 8 stencil bits and
writes `halo/route-cost-stencil.json`. The depth-only copy read 0.17 ms at 1440×900 and
0.27 ms at 2160×1350, against 0.15 and 0.29 ms without a stencil, the same within the
spread between runs, and its depth check is identical.

## Related

[graphics-standards.md](../../graphics-standards.md) gate 6 ·
[issue-974](../issue-974/README.md) (the calls and triangles this matches)
