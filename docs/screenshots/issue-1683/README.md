# #1683 — the arch study's normal-view refinement, before and after

The readings [sorrowgate-arch-study.md](../../sorrowgate-arch-study.md) §11 asks of the
refinement, at §9's four stations. Round 1 built every change at its 29 October bound and failed
H: its critic stopped the loop. On 30 October the owner restated the court bounce's bound in
display terms, and then its gain and two criteria, from round 2's sweeps (§11, the decisions of
30 October). Round 2, at a bounce gain of 10, meets every criterion this container can read.

## How the frames were taken

Every frame is the real client through Tutorial → briefing → Descend, one fresh session per
half, 1920 × 1080 at device pixel ratio 1, HUD on, default settings. The renderer is
SwiftShader in every JSON, so no frame time here is evidence; calls and triangles are. The
study is on with `?arch-study=1` and off without it. Each was taken by
[`capture.mjs`](../issue-1674/capture.mjs), which now also reads §11's windows and masks:

```sh
VIEW_W=1920 VIEW_H=1080 SHOTS=H@30 TAG=a-H-on SPAN_Z=45 \
  node .claude/skills/run-game/scripts/drive.mjs --entry tutorial \
  --url 'http://localhost:5173/?arch-study=1' --out <dir> \
  --steps docs/screenshots/issue-1674/capture.mjs
```

- **Before** (`b-*`): `0015aa68`, the base `8411623f` scene with only the probe added, which
  changes nothing in it. `SPAN_Z` 72.
- **Round 1** (`a-*.json`): `db269506`, with the bounce at the ambient again, the 0.10 ceiling,
  rib roughness 0.6, the distance grade and the reshaped model. `SPAN_Z` 45, the span face's
  new Z. Its frames are superseded and not kept.
- **Round 2** (`g-*`): `20bd0000`, the bounce at 10 times the ambient, `SPAN_Z` 45. The study-off
  halves `r-H-off.json` and `r-C-off.json` are from the same branch at `8b774ba3`, whose
  scene with the study off is the same, and read the escorts' masks with the study off.

`*-windows.png` is the frame with each §11 window drawn where it fell. Each `*.json` carries
the reading tick, the pose, the probe, the windows and the per-material masks (`arch.masks`:
pixels outside the pools, mean and brightest luma, and the pixels inside the pools).

Sessions on this container stand the six hull models between ticks 1,730 and 2,150, so in round
1 a station at T+00:30 failed on most tries: C with the study on took thirty-one. Round 2's
four took one each. Reading ticks run 1,800 to 1,884, so a pair's halves are up to 1.2 s apart,
not matched to the tick.

[`sweep.mjs`](sweep.mjs) reads the same windows and masks at several settings of the study's
switches in one session; `sweep-H.json`, `sweep-L.json`, `sweep-C.json` and
`diagnosis-H.json` are its runs.

## The readings

| Station | Reading tick before / round 2 | Calls on / off | Landmark triangles | Near-black before → round 1 → round 2 |
| --- | --- | --- | --- | --- |
| H | 1824 / 1824 | 56 / 51 | 2,412 → 2,626 | 98.71 % → 98.80 % → 98.73 % |
| C | 1848 / 1848 | 36 / 31 | 2,412 → 2,626 | 86.9 % → 89.3 % → 88.7 % |
| L | 1872 / 1824 | 54 / 49 | 2,412 → 2,626 | 98.1 % → 97.9 % → 97.8 % |
| S | 1848 / 1824 | 56 / 51 | 2,412 → 2,626 | 99.1 % → 99.0 % → 98.9 % |

The study-off halves read the same calls and triangles before and after (120,963 at H and S,
103,715 at C, 112,998 at L), so nothing outside the flag moved.

| §11 criterion, as amended on 30 October | Before | Round 1 | Round 2 |
| --- | --- | --- | --- |
| H, each pier window at least 5 over its floor window | −12.65 W, −9.79 E | +1.09, +0.85: fails | +10.17, +10.08: holds |
| H, the opening at least 5 under both piers | 12.05 over | 1.47 under: fails | 10.85 under: holds |
| H, no arch pixel outside a pool over the escorts' brightest lamp pixel or the ember's 83 | 44.4 | 63.7: holds | 63.9 against 177.9: holds |
| H, no arch window over the escorts' laminate mean | 17.4 < 29.3 | 18.3 < 29.3: holds | 29.98, the west capital, against 30.51: holds |
| H, near-black rises at most 0.1 point from 98.7 % | 98.71 % | 98.80 %: holds as amended | 98.73 %: holds |
| H, each capital's south face above near-black | — | — | 29.98 W, 29.65 E: holds |
| C, `structure_rib` and `stone_dark` masks at least 5 apart | 3.5 / 19.5 | 8.1 / 23.2 | 14.2 / 31.2: holds, 17.0 |
| C, near-black inside 85–90 % | 86.9 % | 89.3 % | 88.7 %: holds |
| L, span face and Descent wall windows at least 5 apart | 5.4 / 12.7 | 8.1 / 14.3 | 22.3 / 14.3: holds, 8.0 |

The laminate clause is the tightest: the west capital's window sits 0.5 under the escorts'
laminate at H. At a gain of 12 the sweep put the piers level with it (`sweep-H.json`), which is
why §11 now bounds the gain by the least that holds H and L, 10.

The bands: each `g-H-on.json` carries a 5 px column down each pier (`arch.profiles`), one mean
luma a row. Down the west pier at H, from the capital's top, the column reads 39–41 for 23
rows, 26–46 for ten, 21–26 for fourteen, 36–47 for twelve, then alternates between 12 and 44
down to the plinth's 16–22: lit bands several rows tall between darker ones. Which part each
band is, the rows do not say. The east pier reads the same order.

## Why round 1 fell short

Round 1's critic read the after frame's rows through the west pier's window. The capital's
top read about 42 luma, key-lit; its south face 4–15 and drum 2's face 4. §11 had projected a
south face of luma 19.5 from a 3.3× gain in linear light. That gain applies before the tone
curve: the view tone-maps with ACES at exposure 1, which divides by 0.6, and three's fit
returns zero below about 0.0034. A south face lit only by the ambient, the bounce and the
environment sat in that toe, and went from about 2 luma to 4. The court floor is drawn unlit
and is not tone-mapped, so it reads 17 either way.

## The diagnosis

`diagnosis-H.json`, one session at H, the pier windows west and east against floors of about
17.2:

| Switches | Piers | Over the floor |
| --- | --- | --- |
| Bounce 7, ceiling 0.10, grade on | 23.7 / 24.7 | +6.5 / +7.5 |
| No bounce | 16.8 / 16.1 | −0.5 / −1.1 |
| Ceiling 0.06 | 16.7 / 17.1 | −0.6 / 0.0 |
| Grade off | 23.7 / 23.7 | +6.3 / +6.4, the floors at 17.4 |
| No bounce, ceiling 0.06, grade off | 13.2 / 12.9 | −4.2 / −4.4 |

The bounce and the ceiling each carry about half of the lift, and neither does alone. The
veil's shade on the arch reads 1, 1, 1 in every reading, so the veil takes nothing from it at
T+00:30. The grade darkens the court floor's windows by about 0.2 and adds 0.03–0.06 point of
near-black at H; with it off, H read 98.71–98.73 %.

## Not taken here

§11 asks for §9's whole set. These are left:

- An escort's pixels unchanged with the study on. At C's matched tick 1800 (`r-C-*` at
  `8b774ba3`) the escorts' laminate mean reads 31.12 on and 31.10 off, but pixels differ
  everywhere by up to 115 levels, in boxes with and without an escort, because the snow and
  the sift move between the two sessions' frames. A per-pixel reading needs a render without
  the particles.
- A vent ember's mean breath at this branch: #1637 read it at 83, and the refinement does not
  touch the embers.
- No drift line reading as a chart mark at S, which is the owner's look, and no surface
  shimmering in motion.
- The transit pair, the motion clips, reduced motion, the palettes and the
  `ventfront-divide` control.
- GPU time with the bounce and the grade on and off, on a named desktop GPU, which this
  container cannot give.

## Related

- [The arch study's brief](../../sorrowgate-arch-study.md)
- [#1674's §9 evidence](../issue-1674/README.md)
- [The study's first evidence](../issue-1637/README.md)
