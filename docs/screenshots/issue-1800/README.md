# three r169 to r187: Low's frames before and after (#1800)

At these four cameras the branch differs from `main` by about what a second run of
`main` does: less at Close and Low, a little more at Home and Survey, and each map is
moved edges rather than a changed surface. The frames hold Low, the shipped graphics quality, at
`tools/render-stack/capture.mjs`' four cameras on `ventfront-divide`, with the HUD on.
Sorrowgate and the free-water study loaded on r187 with no console error, but no
before frame was taken for either.
`before-r169-*` is `main` at the branch's base and `after-r187-*` is the branch.

A software rasteriser drew them, SwiftShader in headless Chromium, so they are no
gate 6 reading. `capture.mjs` itself timed out holding 240 frames a camera on it, so
the cameras were set by the same `__perspectiveCamera` calls and held five seconds.

## Reading the pairs

A match is live, so two runs never match pixel for pixel. A second run of `main`
against the first gives the floor: the mean, over the world area, of each pixel's
largest channel difference, out of 255.

| Camera | `main` against `main` | `main` against the branch |
| --- | --- | --- |
| Home | 0.59 | 1.28 |
| Close | 3.85 | 2.82 |
| Low | 3.03 | 1.28 |
| Survey | 1.31 | 1.52 |

The difference maps paint a pixel red where any channel moved by more than 2. They are
mostly edges: units that moved and rings that redrew. The one filled patch, on the
Bastion's dome at Close and Low, is in the `main` against `main` maps too, so a run
moves it without any upgrade. Close's pair is committed: `diff-close-main-vs-branch.png`
and `diff-close-main-vs-main.png`. Side by side, the Bastion, the
hulls, their glow, the ground and the water read the same.

## Gate 6 on the named GPU

The upgrade costs no GPU time the GTX 1070 can read. `tools/render-stack/capture.mjs` ran
at its four cameras on `ventfront-divide`, unpaced, through Edge/ANGLE D3D11, at
1440 × 900. `before` is the base, db8f045f, serving three r169; `after` is the merge,
96180933, serving r187. Each served revision was checked in Vite's dependency cache.
Each revision was read twice at each pixel ratio, interleaved, behind a 24,000-step queue
load of about 7.3 ms: the 12,000-step default ran out before the survey's unqueued frame.
The table gives the mean of the two queued readings, in ms.

| Camera | Ratio 1, before → after | Ratio 1.5, before → after |
| --- | --- | --- |
| Home | 0.83 → 0.81 | 1.53 → 1.50 |
| Close | 0.95 → 0.95 | 1.83 → 1.83 |
| Low | 0.80 → 0.82 | 1.52 → 1.51 |
| Survey | 0.78 → 0.78 | 1.39 → 1.39 |

Every step lies within 0.04 ms, as two runs of one revision do. Triangles are the same at every camera, 166,978 to
168,094, and calls differ by at most two, within a revision's own spread. A first pass is
left out: its `before` page met a stale server from an earlier run and drew no hull. The
raw runs are `gpu/{before-r169,after-r187}/dpr-{1,1.5}/run-{1,2}.json`, for example
[gpu/after-r187/dpr-1/run-1.json](gpu/after-r187/dpr-1/run-1.json).
