# The conn frame's drift since fa8d8160

Evidence for [#1114](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1114). The
conn frame rose about 0.15 ms at every station between `fa8d8160`, where
[issue-1083](../issue-1083/README.md) read it, and `8851d622`. A bisect names `cb5cb822`,
[#1079](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1079)'s instanced own
models, and the canvas pass carries all of it. The gate is
[graphics-standards.md](../../graphics-standards.md) gate 6.

## Files

| File | What it is |
| --- | --- |
| `readings.json` | Every reading below, a line a station a run: `bisect` (`capture.mjs` at each revision, ratio 1.5, the silt detail off), `split` and `gate6` (`capture.mjs` on Ventfront and Sorrowgate, and [`fight.mjs`](../issue-1083/fight.mjs)) |
| `split.mjs` | A `run-game` steps module: the close camera's queued GPU time, each pass on its own, three windows of 240 frames |

## How the readings were taken

A solo Ventfront match from the Consortium seat, in headed Edge on a GeForce GTX 1070 through
ANGLE and Direct3D 11, at `drive.mjs`'s 1440 × 900, unpaced, queued behind
`capture.mjs`'s 12,000-step load:

```bash
UNPACED=1 VIEW_DPR=1.5 node .claude/skills/run-game/scripts/drive.mjs --headed \
  --channel msedge --url 'http://localhost:5173/?map=ventfront-divide' \
  --out <dir> --steps tools/render-stack/capture.mjs
```

For the bisect the whole tree was checked out at each revision, `npm run build:shared` run
and the dev servers left to reload, so each revision ran its own client, server and
`capture.mjs`. Before #1103 the silt detail was opt-in and off by default; from #1103 on,
`&seabed-detail=0` takes it out. No console error occurred in any drive.

## The bisect

Queued `avgGpuMs` at ratio 1.5, two runs each:

| Revision | Home | Close | Low | Survey | Calls |
| --- | --- | --- | --- | --- | --- |
| `fa8d8160`, #1083's reading | 1.19, 1.20 | 1.38, 1.43 | 1.19, 1.21 | 1.12, 1.12 | 64, 63 close |
| `e5462204`, before #1079 | 1.20, 1.22 | 1.40, 1.41 | 1.23, 1.24 | 1.14, 1.14 | 64, 63 close |
| `cb5cb822`, #1079 merged | 1.34, 1.41 | 1.54, 1.61 | 1.42, 1.43 | 1.36, 1.36 | 57, 56 close |
| `8851d622`, #1103's base | 1.32, 1.34 | 1.54, 1.55 | 1.34, 1.34 | 1.30, 1.31 | 57, 56 close |

- **`fa8d8160` reads today what it read then**, 1.38 and 1.43 ms at close against 1.41: the
  drift is the code's, not the driver's or the browser's.
- **`cb5cb822` is the step**, +0.12 to +0.22 ms at every camera. `e5462204` holds #1086's
  scope fix and three AI and simulation fixes, and reads as `fa8d8160` does. `408f0609`,
  #1096's ring labels, falls between `cb5cb822` and `8851d622`, which read the same.
- **Calls fell by seven** and triangles held at 150,696, so the rise is not geometry.

The frame kept moving after `8851d622`, in smaller steps, with the silt detail off:

| Revision | Close, ratio 1.5 |
| --- | --- |
| `8851d622` | 1.54, 1.55 ms |
| `71d23266`, #1103's centring | 1.58, 1.59 ms |
| `54d37f83`, #1104's thermocline rule | 1.66, 1.61 ms |
| `39cc1e41`, the Consortium's joints | 1.62, 1.62 ms |
| `0e0582a5`, this branch's base | 1.60, 1.64 ms |

None of those steps is larger than two runs of one revision differ by, up to 0.07 ms
(`cb5cb822`).

## Where it lands

`split.mjs` at the close camera, ratio 1.5, the silt detail off, three windows each:

| Revision | Frame | Canvas | Depth copy | Halo spread | Halo composite | Split copy | Split |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `e5462204` | 1.45–1.47 | 0.73–0.74 | 0.27–0.28 | 0.17 | 0.10–0.11 | 0.10 | 0.05 |
| `8851d622` | 1.58–1.60 | 0.87–0.88 | 0.27–0.28 | 0.17 | 0.10–0.11 | 0.10 | 0.05 |

Every pass but the canvas reads the same to 0.01 ms. The canvas pass draws the own models,
and `rosterBatches.ts` wrote each hull's slot into every part's buffer and flagged the whole
buffer for upload, for every own hull, every frame. The view places every own hull every
frame, moved or not: a counting build, not committed, read four writes a frame at the
opening, each one an upload a part.

## The fix

Three variants of `rosterBatches.ts` on `0e0582a5`, the same reading, two runs each:

| Variant | Frame | Canvas |
| --- | --- | --- |
| `main`: every part, every hull, every frame | 1.61–1.67 | 0.90–0.95 |
| A slot written only when it changed, its range alone | 1.52–1.54 | 0.80–0.83 |
| That, with one matrix buffer and one glow buffer a batch (taken) | 1.47–1.52 | 0.77–0.80 |

With writes on change, five uploads a frame were left, the parts of what the opening keeps
moving, and no glow upload; sharing the buffer makes that one a moving hull. A variant that
froze every slot after load read 0.00–0.05 ms under the first at home, low and survey, about
what sharing saved; its close camera framed a frozen hull out of place and does not count.
Static and dynamic buffer usage read the same, 1.52–1.53 ms at close. The counts here, and
the freeze and static readings, came from scratch builds that were not committed.

## Gate 6, before and after

`main`'s `rosterBatches.ts` swapped over the served file between drives against this
branch's, queued `avgGpuMs` in ms, two runs each: `capture.mjs` on Ventfront with the silt
detail on, and with it off at 1.5; `capture.mjs` on Sorrowgate; and
[`fight.mjs`](../issue-1083/fight.mjs) on Ventfront.

| Station | Ratio 1, before → after | Ratio 1.5, before → after |
| --- | --- | --- |
| Ventfront, home | 0.88 → 0.78, 0.88 → 0.76 | 1.53 → 1.45, 1.57 → 1.45 |
| Ventfront, close | 1.02 → 0.88, 1.01 → 0.87 | 1.84 → 1.76, 1.90 → 1.76 |
| Ventfront, low | 0.93 → 0.77, 0.92 → 0.76 | 1.54 → 1.48, 1.58 → 1.51 |
| Ventfront, survey | 0.87 → 0.72, 0.90 → 0.74 | 1.46 → 1.34, 1.46 → 1.33 |
| Sorrowgate, home | 0.39 → 0.37, 0.39 → 0.37 | 0.70 → 0.69, 0.71 → 0.69 |
| Sorrowgate, close | 0.69 → 0.67, 0.69 → 0.67 | 1.41 → 1.38, 1.43 → 1.41 |
| Sorrowgate, low | 0.43 → 0.40, 0.44 → 0.38 | 0.70 → 0.71, 0.70 → 0.70 |
| Sorrowgate, survey | 0.29 → 0.25, 0.27 → 0.26 | 0.47 → 0.45, 0.47 → 0.44 |
| Ventfront, fight | 1.01 → 0.86, 0.99 → 0.88 | 1.61 → 1.53, 1.67 → 1.52 |
| Ventfront, home, silt off | | 1.43 → 1.29, 1.45 → 1.29 |
| Ventfront, close, silt off | | 1.66 → 1.50, 1.62 → 1.52 |
| Ventfront, low, silt off | | 1.43 → 1.29, 1.47 → 1.28 |
| Ventfront, survey, silt off | | 1.37 → 1.23, 1.37 → 1.24 |

- **Ventfront falls 0.06–0.19 ms at every station**: 0.10–0.16 ms at ratio 1, 0.06–0.14
  ms at 1.5 with the silt detail on, and 0.10–0.19 ms with it off. The fight, where the
  fleet is under way, falls 0.08–0.15 ms.
- **Sorrowgate moves −0.06 to +0.01 ms.** The tutorial's own force is a few hulls, mostly off
  the close camera.
- **Calls and triangles did not move**: 57 and 150,696 at Ventfront's home, 56 close; 30 to
  38 and 46,607 to 46,634 at Sorrowgate. The fight read 59 calls, and 61 in one run after,
  as its ordnance varies. `avgConnMs`, the CPU side, moved −0.23 to +0.09 ms, run to run.
- **Ratio 1 is under its 1.2 ms line everywhere**, the close camera at 0.87–0.88 ms.

## What is left

- **The 1.7 ms line.** With the silt detail on, the close camera at ratio 1.5 reads 1.76 ms
  in both runs, 0.06 ms over. With it off it reads 1.50–1.52 ms, against `e5462204`'s
  1.40–1.41: what `main` gained after `8851d622`, 1.54–1.55 to 1.62–1.66 ms before this
  change, and whatever is left of #1079's cost, which two runs a revision cannot separate.
  #1114 stays open for it.
- **The forty-berth frame.** Only the opening was timed. A force under way still uploads
  one slot a moving hull a frame.

## Related

- [graphics-standards.md](../../graphics-standards.md) — gate 6, the berth ceiling and the
  silt detail's cost
- [issue-1079](../issue-1079/README.md) — the instanced own models
- [issue-1083](../issue-1083/README.md) and [issue-1103](../issue-1103/README.md) — the
  readings that showed the drift
