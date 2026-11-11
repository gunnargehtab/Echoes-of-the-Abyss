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

The GPU reading gate 6 asks for, on the named GPU before and after, is still owed.
