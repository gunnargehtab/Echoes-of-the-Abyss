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
each kind (`paced/clock.csv`, `unpaced/clock.csv`), read the GPU in its P8 state at
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

## Related

[graphics-standards.md](../../graphics-standards.md) gate 6 ·
[issue-974](../issue-974/README.md) (the calls and triangles this matches)
