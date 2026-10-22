# #1551 — gate 6 on the GPU for the display-space veil

[#1536](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1536) moved the
interior veil's drain into display space: two `vec3` `pow` per fragment on the mission
ground, roofs, props, embers and vent plumes, where the old drain was one multiply per
vertex or instance. Its frames came from a software rasteriser
([issue-1536](../issue-1536/README.md)), so this is the GPU time
[#1551](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1551) asked for, as
[graphics-standards.md](../../graphics-standards.md) gate 6 reads it.

- **Before** is `a6e380da`, `main` just before #1536. **After** is `3fdb6015`, `main` with
  its last merge. The only merges between them are #1536's two.
- **How**: `gate6.sh` checks out the whole tree at each revision and rebuilds shared with
  the dev servers up. It then drives `tools/render-stack/capture.mjs`'s four cameras on the
  Ventfront Divide, headed in system Chrome on the GTX 1070, unpaced, at pixel ratio 1 and
  1.5. There were four runs per revision and ratio, as two passes of `RUNS="1 2"` and
  `RUNS="3 4"`: 16 drives, every one exiting clean. `table.py` writes the table.

```bash
bash docs/screenshots/issue-1551/gate6.sh
RUNS="3 4" bash docs/screenshots/issue-1551/gate6.sh
python -I docs/screenshots/issue-1551/table.py
```

## Queued GPU time

Queued `avgGpuMs` in ms, runs 1–4. Calls and triangles are the frame's whole count.

| Station | Ratio | Before | After | Δ mean | Calls | Triangles |
| --- | --- | --- | --- | --- | --- | --- |
| home | 1 | 0.77 / 0.95 / 0.70 / 0.69 | 0.83 / 0.80 / 0.70 / 0.70 | −0.02 | 62 | 153 k |
| home | 1.5 | 1.39 / 1.39 / 1.33 / 1.37 | 1.44 / 1.45 / 1.39 / 1.41 | +0.05 | 62 | 153 k |
| close | 1 | 0.83 / 0.86 / 0.82 / 0.81 | 0.88 / 0.87 / 0.83 / 0.84 | +0.03 | 59–60 | 152 k |
| close | 1.5 | 1.71 / 1.72 / 1.68 / 1.69 | 1.77 / 1.77 / 1.74 / 1.75 | +0.06 | 59 | 152 k |
| low | 1 | 0.79 / 0.78 / 0.70 / 0.71 | 0.76 / 0.81 / 0.73 / 1.00 | +0.08 | 60 | 152 k |
| low | 1.5 | 1.41 / 1.42 / 1.38 / 1.40 | 1.47 / 1.47 / 1.41 / 1.44 | +0.05 | 60 | 152 k |
| survey | 1 | 0.86 / 0.78 / 0.89 / 0.81 | 0.92 / 0.86 / 0.70 / 0.77 | −0.02 | 64–65 | 153 k |
| survey | 1.5 | 1.28 / 1.31 / 1.26 / 1.24 | 1.39 / 1.36 / 1.28 / 1.28 | +0.06 | 64 | 153 k |

**At ratio 1.5 the veil costs 0.05–0.06 ms a station**, about 4 %. Every after run reads
at or above its own before run there, the two passes agree, and the cost scales with
pixels, as a per-fragment change should. **At ratio 1 it is inside the noise.** One run
there read about 0.25 ms above its siblings at each of two stations (0.95 at home before,
1.00 at low after), and the means span −0.02 to +0.08 ms. Without the two outliers the change is −0.02 to +0.04 ms.

Calls and triangles did not move at any station, as `rendererSmoke` found. Gate 6 bounds
those at 150 calls and 400 k triangles and asks only that GPU time be reported, so nothing
breaches and nothing is filed. The unqueued bracket moved −0.17 to +0.06 ms; gate 6 reads
the queued one.

## Related

- [#1536's frames](../issue-1536/README.md), what the change draws
- [#1530's readings](../issue-1530/README.md), the same stations before #1536
- [graphics-standards.md](../../graphics-standards.md), gate 6
