# Gate 6 on the GPU for the animation effects

Evidence for [#1530](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1530): the
conn view's GPU time, every pass summed, before and after the nine effects of
[#1467](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1467), read as gate 6
of [graphics-standards.md](../../graphics-standards.md) asks ("Abyss Render Stack
increment"). Each effect's own README took its frames on SwiftShader, and so measured no
millisecond.

- **Before** is `b6db7fe9`, `main` just before #1515. **After** is `d7d255dc`, `main` with
  #1526. The one other merge between them, `fb16c940`, changed Rift and Kell Shoulder
  data, neither drawn at these stations.
- **How**: `gate6.sh` checks out the whole tree at each revision and rebuilds shared with
  the dev servers up. Then it drives `tools/render-stack/capture.mjs`'s four cameras on
  Ventfront and Sorrowgate (`?mission=prologue-sorrowgate`) and the Ventfront fight
  station (`docs/screenshots/issue-1083/fight.mjs`). Every drive is headed in Edge on
  the GTX 1070, unpaced (`UNPACED=1`), at pixel ratio 1 and 1.5, two runs each: 24 drives,
  45 minutes, every one exiting clean. `table.py` writes the table.

```bash
bash docs/screenshots/issue-1530/gate6.sh
python -I docs/screenshots/issue-1530/table.py
```

## Queued GPU time

Queued `avgGpuMs` in ms, run 1 / run 2. Calls and triangles are the frame's whole count.

| Map | Station | Ratio | Before | After | Δ mean | Calls | Triangles |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ventfront | home | 1 | 0.78 / 0.75 | 0.74 / 0.75 | −0.02 | 59 → 61 | 152 k |
| Ventfront | home | 1.5 | 1.42 / 1.42 | 1.45 / 1.44 | +0.02 | 59 → 61 | 152 k |
| Ventfront | close | 1 | 0.86 / 0.85 | 0.87 / 0.88 | +0.02 | 56 → 58 | 152 k |
| Ventfront | close | 1.5 | 1.75 / 1.73 | 1.72 / 1.73 | −0.01 | 56 → 58 | 152 k |
| Ventfront | low | 1 | 0.73 / 0.73 | 0.74 / 0.75 | +0.02 | 57 → 59–60 | 152 k |
| Ventfront | low | 1.5 | 1.43 / 1.42 | 1.43 / 1.44 | +0.01 | 57 → 59 | 152 k |
| Ventfront | survey | 1 | 0.72 / 0.71 | 0.71 / 0.71 | −0.01 | 61 → 63–64 | 153 k |
| Ventfront | survey | 1.5 | 1.31 / 1.30 | 1.32 / 1.33 | +0.02 | 61 → 63 | 153 k |
| Ventfront | fight | 1 | 0.83 / 0.86 | 0.85 / 0.85 | +0.01 | 61–63 → 63 | 153 k |
| Ventfront | fight | 1.5 | 1.50 / 1.49 | 1.51 / 1.51 | +0.01 | 61 → 63 | 153 k |
| Sorrowgate | home | 1 | 0.48 / 0.47 | 0.49 / 0.47 | +0.01 | 32 → 33 | 80 k |
| Sorrowgate | home | 1.5 | 0.87 / 0.86 | 0.87 / 0.87 | +0.01 | 32 → 33 | 80 k |
| Sorrowgate | close | 1 | 0.65 / 0.66 | 0.66 / 0.67 | +0.01 | 40 → 41 | 80 k |
| Sorrowgate | close | 1.5 | 1.39 / 1.40 | 1.42 / 1.42 | +0.02 | 40 → 41 | 80 k |
| Sorrowgate | low | 1 | 0.41 / 0.41 | 0.42 / 0.41 | +0.01 | 33 → 34 | 80 k |
| Sorrowgate | low | 1.5 | 0.76 / 0.75 | 0.75 / 0.76 | +0.00 | 33 → 34 | 80 k |
| Sorrowgate | survey | 1 | 0.42 / 0.41 | 0.36 / 0.39 | −0.04 | 32 → 33 | 80 k |
| Sorrowgate | survey | 1.5 | 0.67 / 0.67 | 0.68 / 0.70 | +0.02 | 32 → 33 | 80 k |

Every change is −0.04 to +0.02 ms, against the up to 0.03 ms the two runs of one
revision differ by, and the largest is a fall. The effects add zero to three calls a
station and not one triangle, since every draw they add is a `Points`; banking and the
shoals' burst add none. That is well inside gate 6's
150 calls and 400 k triangles: no breach, so nothing is filed. The unqueued bracket,
which adds the browser's hand-over, moved −0.02 to +0.44 ms on Ventfront and at most
0.03 ms on Sorrowgate. Gate 6 bounds the queued reading, not that.

## What the stations drew

The after probe says which effects were in the frame. On Ventfront, 34 vent plumes stood,
the moving fleet's wake held 1–9 live bubbles, and the survey camera caught a dredging
harvester's silt plume (11 motes). On Sorrowgate, 3 vent plumes stood and no wake bubble was live.
No station fires, hits or launches: the probe read 0 `shots`, `hits` and `ordnance`
throughout. Gate 6 gives each of those three effects no draw once its last particle
fades, so they are priced here at that idle cost. The torpedo burst's frames on the GPU
are in [issue-1509](../issue-1509/README.md).
