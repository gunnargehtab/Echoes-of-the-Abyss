# #1107 — the Consortium on its trim sheet

Two pull requests answered #1107. The first drew the sheet's joints for the conn view; the
second laid the navy's other models on it
([art-direction.md](../../art-direction.md#uv-layout-and-trim-sheets--spec)).

| File | What it shows |
| --- | --- |
| `consortium-trim-sheet.png` | The Consortium's sheet with its laps, ramps and grime (the first pull request) |
| `bulwark-before-after.png` | The Bulwark before and after those joints (the first pull request) |
| `anisotropy-gate6.json` | Gate 6 with the sheet sampled at four taps and one, ten Bulwarks on Ventfront (the first pull request) |
| `lit-table.png` | The conn row (55° of pitch) of each of the 22 models the second laid, from `node tools/hull-renders/inspect.mjs <slug> --before 6365448d`, the after column at half size |
| `conn-view.png` | The Consortium's opening in the conn view, main at `6365448d` on the left and the branch on the right, cropped from 1440 × 900 frames |
| `close.mjs` | The steps module behind `conn-view.png`: one of each own Consortium kind framed close, HUD hidden, the probe's counts in `close.json` |
| `gate6.json` | Gate 6, main's files against the branch's, at pixel ratio 1 and 1.5 |

The frames and readings were taken headed through Edge on a GTX 1070, unpaced. No staging was
needed, since the first client takes the Consortium by default. The before swapped `main`'s
Consortium GLBs over the served files between drives, with no page open, and restored them
after. Marine snow drifts between drives, so the frames are compared by eye, not by pixel.

`gate6.json` holds `capture.mjs`' four cameras on Ventfront and Sorrowgate, and the fight
station of `docs/screenshots/issue-1083/fight.mjs` on Ventfront. Calls and triangles are the
same at every station. Ventfront gains one texture, the sheet, and its queued GPU time moves
by at most 0.06 ms. Sorrowgate draws no Consortium model, so nothing there moves.

Related: [art-direction.md](../../art-direction.md) ·
[issue-1111](../issue-1111/README.md) (the Bulwark's occlusion map)
