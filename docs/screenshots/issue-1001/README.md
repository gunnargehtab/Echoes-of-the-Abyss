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

## The halo, built and off

The lamp halo ([art-direction.md](../../art-direction.md), "Lamp halo — SPEC") is built and
switched off; the Lamp halos toggle in Settings turns it on, and a development switch for
captures. `HALO=on` turns it on for `tools/render-stack/capture.mjs`. `halo-built/` holds a Ventfront capture each way at
ratio 1 and 1.5 on the named GPU, unpaced, and paced home and close frames off and on.

| Camera | Ratio | Calls, off → on | Triangles, off → on | Sites | Frame GPU ms, off → on | Frame interval ms, off → on |
| --- | --- | --- | --- | --- | --- | --- |
| home | 1 | 55 → 66 | 148290 → 148516 | 108 | 0.5 → 1.77 | 3.53 → 3.61 |
| close | 1 | 54 → 65 | 148290 → 148516 | 108 | 0.62 → 1.59 | 3.1 → 3.28 |
| low | 1 | 55 → 66 | 148290 → 148516 | 108 | 0.49 → 1.49 | 3.12 → 3.22 |
| survey | 1 | 55 → 66 | 148290 → 148496 | 98 | 0.53 → 1.48 | 3.56 → 3.47 |
| home | 1.5 | 55 → 66 | 148290 → 148516 | 108 | 0.57 → 2.49 | 3.43 → 4.35 |
| close | 1.5 | 54 → 65 | 148290 → 148516 | 108 | 0.77 → 2.33 | 3.12 → 4.21 |
| low | 1.5 | 55 → 66 | 148290 → 148516 | 108 | 0.65 → 1.95 | 3.28 → 3.71 |
| survey | 1.5 | 55 → 66 | 148290 → 148496 | 98 | 0.65 → 1.84 | 3.49 → 3.84 |

Calls and triangles were gate 6's allocation exactly: +11 calls, 2 × sites + 10 triangles,
108 sites at Ventfront's opening. That was the nine-draw chain; it is six draws and +8 calls
since "Six chain draws" below. The halo holds 21.38 MiB at 1440×900 (gate 6's cap is
21.4).

**GPU time does not meet gate 6's line yet.** On − off frame
GPU time is 0.95–1.27 ms at ratio 1 and 1.19–1.92 ms at 1.5, against the 0.40 and 0.75 ms
gate 6 allows. The conn frame's own line fails with it: 1.48–1.77 ms on at ratio 1 and
1.84–2.49 ms at 1.5, against 1.2 and 1.7 ms.

The halo's own passes measured far less in earlier runs, before the nearest-point offset. On
a bare page with no game the pass read 0.23–0.30 ms at 1440×900 across five runs, the stand-in
route's figure; in the game, with the frame's timer opened after the canvas pass, its passes
read 0.26 ms. The unpaced frame interval, which no timer semantics can inflate, splits the
two. At ratio 1 it moves by −0.09 to +0.18 ms, inside the line; at 1.5 it rises by 0.35–1.09
ms, past it at home and close (the table above). So the timer may overstate the halo, but at
1.5 the frame really slows. What the extra timer time is was not settled: it is not CPU time
inside the timed span (a 1 ms spin there read as 0.14 ms), not a second context's work (a busy
one beside the bench changed nothing), not the lamp stencil marks and not the blur shader.
The 0.23–0.30, 0.26 and 0.14 ms readings were console output from local instrumented builds,
neither committed nor kept; the readings increment re-takes them with committed tools, and
decides how gate 6 reads a multi-pass frame before the default can turn on.

Settled below, in "Queued": the extra time was the GPU waiting for the frame's commands.

## Queued

**The halo's passes cost the GPU 0.25–0.28 ms at ratio 1 and 0.54–0.58 ms at 1.5, inside
gate 6's 0.40 and 0.75 ms.** The bracket above read about four times that because it timed
the GPU waiting as well as working.

A timer query counts from the GPU reaching its begin to reaching its end. Unpaced, the named
GPU runs the conn frame faster than the browser's GPU process hands it over: at Ventfront's
cameras it sat at 1,809 MHz and 20–25 % busy (`nvidia-smi`), and the bracket held its waits
between commands. Three local builds, not kept, showed it before any tool was written:

| Build | Read |
| --- | --- |
| The spread chain drawn 1, 4 and 16 times a frame | 0.60–0.75, 1.58 and 3.46 ms. A repeat past the first added 0.19–0.29 ms, and the first 0.4 ms more |
| A 3 ms load drawn first in the bracket, each pass in its own query | The canvas pass fell from 0.49–0.61 to 0.26–0.38 ms and read the same with the halo on. The halo's four steps read 0.12, 0.01, 0.07 and 0.05 ms at every camera |
| The frame held GPU-bound by a 7.5 ms load, three on/off pairs | The frame interval rose 0.05–1.09 ms at ratio 1 and −1.17 to 1.27 ms at 1.5: too noisy for a 0.40 ms line |

The second is the committed reading now. `gpuQueueLoad.ts` draws the load before the frame's
bracket opens, so by the time the GPU reaches the frame its commands are queued behind the
load. `tools/render-stack/halo-cost.mjs` reads each station six ways: the halo on and off,
each in one bracket (unqueued), queued, and queued with each pass in a query of its own. It
fails a station whose load took less than its unqueued frame on average, since a load that
ran out first queued nothing. The loads took 3.54–4.00 ms against unqueued station averages
of at most 2.28 ms. Single unqueued frames reached 12.6 ms, and a frame whose handover
outlasts its load waits again and reads high, never low. The queued worst frames were under
3 ms but for 4.53 and 9.86 ms, both in split readings taken before the two timers shared the
disjoint flag, so either may be a voided result that was averaged.
Two runs at each ratio on the named GPU, unpaced, are in `halo-cost/`, both runs per cell:

| Map | Ratio | Station | Frame, queued, off → on | Halo, queued | Frame, unqueued, off → on | CPU, off → on |
| --- | --- | --- | --- | --- | --- | --- |
| Ventfront | 1 | home | 0.30 → 0.55, 0.30 → 0.55 | 0.25, 0.25 | 0.46 → 1.61, 0.54 → 1.49 | 0.60 → 0.81, 0.58 → 0.82 |
| Ventfront | 1 | close | 0.38 → 0.64, 0.38 → 0.64 | 0.26, 0.26 | 0.61 → 1.62, 0.54 → 1.37 | 0.58 → 0.87, 0.56 → 0.80 |
| Ventfront | 1 | low | 0.30 → 0.56, 0.29 → 0.57 | 0.26, 0.28 | 0.49 → 1.65, 0.56 → 1.42 | 0.63 → 0.86, 0.59 → 0.78 |
| Ventfront | 1 | survey | 0.28 → 0.54, 0.28 → 0.53 | 0.26, 0.25 | 0.57 → 2.28, 0.54 → 1.88 | 0.79 → 1.10, 0.58 → 0.89 |
| Ventfront | 1 | fight | 0.32 → 0.60, 0.33 → 0.61 | 0.28, 0.28 | 0.55 → 2.14, 0.55 → 1.85 | 0.64 → 0.88, 0.62 → 0.83 |
| Sorrowgate | 1 | home | 0.27 → 0.27, 0.27 → 0.27 | 0.00, 0.00 | 0.32 → 0.37, 0.35 → 0.37 | 0.46 → 0.50, 0.54 → 0.49 |
| Sorrowgate | 1 | close | 0.33 → 0.59, 0.34 → 0.59 | 0.26, 0.25 | 0.38 → 0.67, 0.37 → 0.68 | 0.47 → 0.63, 0.49 → 0.63 |
| Sorrowgate | 1 | low | 0.29 → 0.30, 0.29 → 0.29 | 0.01, 0.00 | 0.33 → 0.35, 0.32 → 0.35 | 0.56 → 0.53, 0.50 → 0.51 |
| Sorrowgate | 1 | survey | 0.17 → 0.16, 0.17 → 0.17 | -0.01, 0.00 | 0.22 → 0.26, 0.22 → 0.26 | 0.53 → 0.53, 0.49 → 0.50 |
| Ventfront | 1.5 | home | 0.51 → 1.07, 0.52 → 1.08 | 0.56, 0.56 | 0.77 → 1.74, 0.74 → 1.74 | 0.62 → 0.81, 0.61 → 0.81 |
| Ventfront | 1.5 | close | 0.71 → 1.27, 0.70 → 1.27 | 0.56, 0.57 | 0.79 → 1.56, 0.80 → 1.65 | 0.58 → 0.77, 0.62 → 0.82 |
| Ventfront | 1.5 | low | 0.53 → 1.08, 0.55 → 1.09 | 0.55, 0.54 | 0.70 → 1.72, 0.66 → 1.83 | 0.60 → 0.79, 0.60 → 0.85 |
| Ventfront | 1.5 | survey | 0.42 → 0.99, 0.43 → 0.98 | 0.57, 0.55 | 0.59 → 1.65, 0.61 → 2.14 | 0.59 → 0.80, 0.62 → 0.94 |
| Ventfront | 1.5 | fight | 0.54 → 1.12, 0.54 → 1.12 | 0.58, 0.58 | 0.78 → 2.15, 0.78 → 2.16 | 0.64 → 0.83, 0.63 → 0.89 |
| Sorrowgate | 1.5 | home | 0.50 → 0.50, 0.51 → 0.49 | 0.00, -0.02 | 0.53 → 0.58, 0.52 → 0.56 | 0.54 → 0.53, 0.51 → 0.50 |
| Sorrowgate | 1.5 | close | 0.66 → 1.20, 0.65 → 1.20 | 0.54, 0.55 | 0.67 → 1.27, 0.67 → 1.27 | 0.56 → 0.63, 0.48 → 0.63 |
| Sorrowgate | 1.5 | low | 0.51 → 0.51, 0.50 → 0.50 | 0.00, 0.00 | 0.52 → 0.58, 0.51 → 0.56 | 0.51 → 0.57, 0.49 → 0.50 |
| Sorrowgate | 1.5 | survey | 0.27 → 0.28, 0.28 → 0.27 | 0.01, -0.01 | 0.33 → 0.38, 0.34 → 0.37 | 0.50 → 0.50, 0.49 → 0.50 |

Read queued, the halo meets gate 6's GPU lines at every station:

- **The halo** costs 0.25–0.28 ms at ratio 1 and 0.54–0.58 ms at 1.5. At Sorrowgate it
  draws only at the close camera, 10 sites, for 0.25–0.26 and 0.54–0.55 ms; at its other
  cameras no own entity draws a splat, and it runs no pass.
- **The conn frame** with the halo on, where it draws, is 0.53–0.64 ms at ratio 1 and
  0.98–1.27 ms at 1.5, against 1.2 and 1.7 ms.
- **The depth copy is half of it**, split: 0.12–0.13 ms at ratio 1 and 0.27–0.28 ms at 1.5.
  The source, spread and composite read 0.01, 0.07 and 0.05 ms, and 0.02, 0.18 and 0.10.
- **The canvas pass** reads the same with the halo on or off, within 0.05 ms, so the lamp
  stencil marks cost nothing a timer resolves.
- **The stand-in agrees.** `route-cost.mjs` read 0.29 and 0.54 ms for its route on a bare
  page.

**The CPU line is not met.** `avgConnMs` rose 0.21 and 0.24 ms at the fight station at ratio
1, and 0.19 and 0.26 ms at 1.5, against 0.2 ms. At Ventfront's other cameras it rose
0.19–0.32 ms, and at Sorrowgate's close camera 0.07–0.16 ms. Met since, in "Six chain
draws" below.

**The handover is the rest of the unqueued bracket.** At Ventfront it rose 0.83–1.71 ms
with the halo on at ratio 1 and 0.77–1.53 ms at 1.5, where the GPU's work rose a quarter or
half of a millisecond. At Sorrowgate's close camera, with 10 sites to Ventfront's 98–108 and
the same GPU work, it rose 0.29–0.31 and 0.60 ms, so the handover tracks the sites drawn
rather than the pixels. It is CPU time in the browser's GPU process, which gate 6 bounds
nowhere. Ventfront's unpaced frame interval rose 0.07–0.65 ms at ratio 1 and 0.09–0.60 ms at
1.5.

**Why not the frame interval.** The third local build is the only one that held the frame
GPU-bound, and it was not kept. The committed readings say the same thing another way:
unpaced, Ventfront's frame interval is 3.05–4.74 ms against 0.28–1.27 ms of the conn view's
GPU work, so it is bound by the CPU, and what it moves by is the CPU's cost, not the GPU's.

## Six chain draws

**Gate 6's CPU line is met at the fight station, with no margin.** `avgConnMs` rose 0.16 and
0.17 ms there at ratio 1, and 0.15 and 0.20 ms at 1.5, against 0.2 ms; with the nine-draw
chain it rose 0.19–0.26 ms.

A Chrome CPU profile of the home camera, taken through the DevTools protocol against the dev
build and not kept, put the halo's CPU at 0.24 ms a frame: 0.17 ms in the pass's eleven
render calls and a clear, about 10 µs of three's own work each, and 0.07 ms in the
splat gather, half of that walking each model's tree once per lamp material. Three changes
took it to about 0.18 ms:

- **The downsample is folded into the blur.** Each level's horizontal blur reads the level
  above at this level's texel centres ("Lamp halo — SPEC", Spread), so the chain is six draws
  and the halo +8 calls. Over a 400-splat half-float source on the named GPU, the six-draw
  and nine-draw chains gave identical texels inside level 1, inside levels 2 and 3 within
  0.008 of peaks of 10–38 (half-float rounding), and at the border up to about 2 % of a peak,
  keeping 99.92 % of the energy or more. That comparison ran on a scratch WebGL2 page that
  rebuilt both chains with the pass's shaders and weights, not in the game, and was not kept.
- **The gather finds each model's lamp meshes once,** and allocates one object a site.
- **The full-screen draws set their uniforms in place.**

The readings below are `halo-cost.mjs`, two runs at each ratio on both maps, unpaced on the
named GPU, in `halo-six/`. One more Ventfront run at ratio 1 is left out: other work ran on
the machine beside it, and its halo-off CPU read 0.2–0.3 ms high at two cameras. No frame was
voided by a disjoint event, and the loads took 3.60–4.00 ms against unqueued station averages
of at most 1.86 ms.

| Map | Ratio | Station | Frame, queued, off → on | Halo, queued | Frame, unqueued, off → on | CPU, off → on |
| --- | --- | --- | --- | --- | --- | --- |
| Ventfront | 1 | home | 0.30 → 0.54, 0.30 → 0.54 | 0.24, 0.24 | 0.52 → 1.37, 0.59 → 1.19 | 0.65 → 0.80, 0.57 → 0.75 |
| Ventfront | 1 | close | 0.38 → 0.63, 0.38 → 0.63 | 0.25, 0.25 | 0.56 → 1.07, 0.58 → 1.07 | 0.57 → 0.76, 0.56 → 0.72 |
| Ventfront | 1 | low | 0.31 → 0.55, 0.31 → 0.55 | 0.24, 0.24 | 0.47 → 1.25, 0.55 → 1.09 | 0.61 → 0.79, 0.58 → 0.73 |
| Ventfront | 1 | survey | 0.27 → 0.52, 0.27 → 0.51 | 0.25, 0.24 | 0.55 → 1.26, 0.45 → 1.05 | 0.59 → 0.76, 0.57 → 0.72 |
| Ventfront | 1 | fight | 0.32 → 0.59, 0.34 → 0.59 | 0.27, 0.25 | 0.73 → 1.86, 0.58 → 1.57 | 0.64 → 0.81, 0.63 → 0.79 |
| Sorrowgate | 1 | home | 0.27 → 0.28, 0.26 → 0.26 | 0.01, 0.00 | 0.34 → 0.36, 0.32 → 0.35 | 0.46 → 0.48, 0.47 → 0.49 |
| Sorrowgate | 1 | close | 0.34 → 0.58, 0.33 → 0.58 | 0.24, 0.25 | 0.36 → 0.65, 0.37 → 0.64 | 0.49 → 0.58, 0.46 → 0.59 |
| Sorrowgate | 1 | low | 0.32 → 0.30, 0.32 → 0.31 | -0.02, -0.01 | 0.31 → 0.33, 0.32 → 0.34 | 0.46 → 0.49, 0.58 → 0.49 |
| Sorrowgate | 1 | survey | 0.17 → 0.19, 0.17 → 0.16 | 0.02, -0.01 | 0.24 → 0.26, 0.24 → 0.25 | 0.49 → 0.53, 0.50 → 0.54 |
| Ventfront | 1.5 | home | 0.51 → 1.06, 0.52 → 1.08 | 0.55, 0.56 | 0.83 → 1.73, 0.72 → 1.41 | 0.76 → 0.84, 0.59 → 0.76 |
| Ventfront | 1.5 | close | 0.69 → 1.26, 0.71 → 1.29 | 0.57, 0.58 | 0.85 → 1.64, 0.79 → 1.51 | 0.60 → 0.80, 0.64 → 0.77 |
| Ventfront | 1.5 | low | 0.51 → 1.07, 0.50 → 1.09 | 0.56, 0.59 | 0.70 → 1.57, 0.68 → 1.26 | 0.60 → 0.84, 0.60 → 0.75 |
| Ventfront | 1.5 | survey | 0.42 → 0.99, 0.42 → 0.98 | 0.57, 0.56 | 0.60 → 1.65, 0.61 → 1.35 | 0.59 → 0.80, 0.59 → 0.76 |
| Ventfront | 1.5 | fight | 0.53 → 1.11, 0.54 → 1.11 | 0.58, 0.57 | 0.69 → 1.73, 0.68 → 1.49 | 0.59 → 0.79, 0.61 → 0.76 |
| Sorrowgate | 1.5 | home | 0.49 → 0.49, 0.50 → 0.49 | 0.00, -0.01 | 0.52 → 0.56, 0.53 → 0.59 | 0.49 → 0.50, 0.55 → 0.63 |
| Sorrowgate | 1.5 | close | 0.65 → 1.19, 0.65 → 1.20 | 0.54, 0.55 | 0.67 → 1.28, 0.66 → 1.29 | 0.50 → 0.64, 0.46 → 0.64 |
| Sorrowgate | 1.5 | low | 0.51 → 0.50, 0.50 → 0.51 | -0.01, 0.01 | 0.52 → 0.56, 0.52 → 0.56 | 0.48 → 0.51, 0.48 → 0.53 |
| Sorrowgate | 1.5 | survey | 0.27 → 0.27, 0.33 → 0.27 | 0.00, -0.06 | 0.32 → 0.37, 0.34 → 0.38 | 0.50 → 0.50, 0.50 → 0.56 |

- **The halo** costs the GPU 0.24–0.27 ms at ratio 1 and 0.54–0.59 ms at 1.5, the
  nine-draw chain's figures within 0.03 ms, and the conn frame where it draws 0.51–0.63 and
  0.98–1.29 ms.
- **Calls and triangles** are +8 and 2 × sites + 7 at every station: 54–55 → 62–63 at
  Ventfront's cameras, 57 → 65 at the fight and 45 → 53 at Sorrowgate's close camera.
- **The handover** at Ventfront rose 0.49–1.13 ms at ratio 1 and 0.58–1.05 ms at 1.5, from
  0.83–1.71 and 0.77–1.53: fewer render calls, less for the browser's GPU process to hand
  over. At Sorrowgate's close camera it rose 0.27–0.29 ms at ratio 1.

## The frames against the SPEC

**Five of the SPEC's seven "What it must show" items hold; two do not, so the default stays
off.** The resting Bastion and Foundry draw no halo at any camera, and at its ping the Light
Scout's collar keeps 3:1 on 89.3–89.6 % of its core against 90 %. Both rest on TUNABLEs the
SPEC says are approved on frames.

`tools/render-stack/halo-frames.mjs` reads them on the named GPU with reduced motion, so
paired shots frame the same water. A development hook reads one frame's conn canvas after
the canvas pass, after the halo, and as a mask of the lamps the stencil marked; another draws
one entity's halo and lamp marks alone. The readings are in `halo-frames/`, with Ventfront's
frames at ratio 1, the halo off and on.

| Must show | Read | Holds |
| --- | --- | --- |
| Loudness order | At the close camera, light in CSS px² of relative luminance: Caisson 49–50, Harvester (40–45) 9.6–10.2, Light Scout 0. The Bastion (35) and Foundry (25) draw 0 at every camera, with 300–3,750 px of lamp on screen | No |
| Ping | The area a hull's halo lifts past 10 % luma: Caisson 709 → 2,621 px, Harvester 171 → 3,394, Light Scout 0 → 3,137 | Yes |
| The lamp | Every whole lamp pixel unchanged, at every camera, map and ratio | Yes |
| Darkness | 95.5–99.7 % of the conn canvas under 10 % luma with the halo on, at most 0.13 points lost; 64–83 % with the HUD | Yes |
| Flash | One hull's ping changes at most 0.07 % of the frame and 0.67 % of a third-by-third window | Yes |
| The collar at rest | The halo changes no core's contrast at the home and close cameras | Yes |
| The collar at a ping | 3:1 on 100 % of the Caisson's core, 94 % of the Harvester's and 89.3 % (89.6 % at 1.5) of the Light Scout's; 100 % of each with the halo off | No |

**Why the structures draw nothing.** Under the SPEC's energy law a SIG-35 Bastion carries an
eighth of a Caisson's energy and a SIG-25 Foundry a thirty-second, and each spreads it over a
footprint three to five times a hull's width: 27 sites across the Bastion's dome, most of the
Foundry's in its flood bay. No pixel of either crosses the toe. With the toe at 0, in a scratch run not kept, the Bastion
peaks at 6 encoded levels at the close camera and the Foundry at 1; the light is then in SIG
order, Caisson, Harvester, Bastion, Foundry, but too faint to see. A Bastion loud enough to
carry a Caisson's energy would show.

**What hides a hull's halo is right.** At the home camera one Caisson and the Harvester draw
no halo: neither has a lamp pixel on screen, both hidden behind the base, and the SPEC hides
a halo where it hides its lamp. On Sorrowgate the halo draws 10 sites at the close camera and
lifts no pixel: the tutorial's hulls show 1–6 px of lamp there.

**Why the scout's collar misses.** The scout's collar sits a few pixels outside its selection
ring, and at SIG 95 its halo reaches it: the left arc of the red core runs over amber glow
(`ping-light-scout-collar.png`). The Caisson's collar is wider and clears its halo.

The ridge case, a lamp behind a ridge at the low camera, was not staged. The flash and the
collar at a ping are Ventfront's; the Harvester's ping did not register at ratio 1.5.

## Related

[graphics-standards.md](../../graphics-standards.md) gate 6 ·
[issue-974](../issue-974/README.md) (the calls and triangles this matches)
