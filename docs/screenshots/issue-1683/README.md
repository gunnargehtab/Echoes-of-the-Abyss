# #1683 — the arch study's normal-view refinement, before and after

The readings [sorrowgate-arch-study.md](../../sorrowgate-arch-study.md) §11 asks of the
refinement, at §9's four stations. Round 1 built every change at its 29 October bound and failed
H: its critic stopped the loop. On 30 October the owner restated the court bounce's bound in
display terms, then set its gain and amended three criteria from rounds 2 and 3's sweeps (§11,
the decisions of 30 October). Round 3, at a bounce gain of 9, met every criterion this
container can read but the band clause; round 4, granted with a fifth for that clause, reads it
on the mask's band tags (below). What this container cannot read is listed at the foot.

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
- **Round 2** (`g-*.json`): `20bd0000`, the bounce at 10 times the ambient. Its frames are
  superseded and not kept. The study-off halves `r-H-off.json` and `r-C-off.json` are from the
  same branch at `8b774ba3`, whose scene with the study off is the same, and read the escorts'
  masks with the study off.
- **Round 4** (`u-H-on*`): H only, over the round-3 scene with the band tags and their silt
  and span corrections, each pier column read on the mask's band tags (`arch.bands`).
- **Round 3** (`t-*`): `4a2db756`, the bounce at 9 times the ambient. Each JSON also carries
  every pier face read on its own rows (`arch.faces`), between its top and bottom edges
  projected through the frame's camera.

`*-windows.png` is the frame with each §11 window drawn where it fell. Each `*.json` carries
the reading tick, the pose, the probe, the windows and the per-material masks (`arch.masks`:
pixels outside the pools, mean and brightest luma, and the pixels inside the pools).

Sessions on this container stand the six hull models between ticks 1,730 and 2,150, so in round
1 a station at T+00:30 failed on most tries: C with the study on took thirty-one. Rounds 2 and
3 took one try each. Reading ticks run 1,800 to 1,884, so a pair's halves are up to 1.2 s apart,
not matched to the tick.

[`sweep.mjs`](sweep.mjs) reads the same windows and masks at several settings of the study's
switches in one session; `sweep-H.json`, `sweep-L.json`, `sweep-C.json` and
`diagnosis-H.json` are round 2's runs, and `sweep-H-faces.json` and `sweep-L-whole.json`
round 3's, with the faces and whole gains from 5.

## The readings

| Station | Reading tick before / round 3 | Calls on / off | Landmark triangles | Near-black before → round 1 → round 3 |
| --- | --- | --- | --- | --- |
| H | 1824 / 1812 | 56 / 51 | 2,412 → 2,626 | 98.71 % → 98.80 % → 98.75 % |
| C | 1848 / 1824 | 36 / 31 | 2,412 → 2,626 | 86.9 % → 89.3 % → 88.8 % |
| L | 1872 / 1800 | 54 / 49 | 2,412 → 2,626 | 98.1 % → 97.9 % → 97.9 % |
| S | 1848 / 1800 | 56 / 51 | 2,412 → 2,626 | 99.1 % → 99.0 % → 98.9 % |

The study-off halves read the same calls and triangles before and after (120,963 at H and S,
103,715 at C, 112,998 at L), so nothing outside the flag moved.

| §11 criterion, as amended on 30 October | Before | Round 1, gain 1 | Round 3, gain 9 |
| --- | --- | --- | --- |
| H, each pier window at least 5 over its floor window | −12.65 W, −9.79 E | +1.09, +0.85: fails | +8.34, +8.77: holds |
| H, the opening at least 5 under both piers | 12.05 over | 1.47 under: fails | 8.98 under: holds |
| H, no arch pixel outside a pool over the escorts' brightest lamp pixel or the ember's 83 | 44.4 | 63.7: holds | 63.6 against 177.9: holds |
| H, no arch window over the escorts' laminate mean, the capital windows included | 17.4 < 29.3 | 18.3 < 29.3: holds | 29.74, the west capital's, against 29.92: holds |
| H, near-black rises at most 0.1 point from 98.71 % | 98.71 % | 98.80 %: holds | 98.75 %: holds |
| H, each capital's south face over its floor window, on its own rows | — | — | 18.88 against 17.18 W, 20.16 against 17.10 E: holds |
| C, `structure_rib` and `stone_dark` masks at least 5 apart | 3.5 / 19.5 | 8.1 / 23.2 | holds, 16.9 |
| C, near-black inside 85–90 % | 86.9 % | 89.3 % | 88.8 %: holds |
| L, span face and Descent wall windows at least 5 apart | 5.4 / 12.7 | 8.1 / 14.3 | 20.76 / 14.31: holds, 6.45 |

Three margins are thin. The west capital's face clears its floor by 1.7. The capital windows
`capW` and `capE`, which take in the key-lit tops, read 29.74 and 29.30 against the laminate's
29.92; §11's own windows read at most 25.87. L's span face clears the wall by 6.45, where gain 8
gave 4.95.
C's west capital, under the HUD's orders panel and read on the GL canvas, is 17.7 on its rows.

The faces: at H a capital's south face is 2 px tall and reads 18.9 west and 20.2 east, over
the court floor's 17.2. The other face rows are not each face's own: drum 2 stands 10 m behind
the capital, so its projected top lies above the capital's and its upper rows are the capital's
(round 3's critic, from the rows in `t-H-on.json`), and drum 1's mean is carried by its lit
ledge, its face rows reading 14.4–17.7. So "the capitals and the drum bands draw as separate
lit bands at least 2 px tall" is not shown by the face rows; round 4 reads it on the band
tags instead.

### The bands, round 4

The mask's blue channel tags every pier fragment with its mass (plinth, drums 0–2, capital) and
whether it is a top or a south face (`archMask.ts` `MASK_BAND`). A top is banded by the height
just under it, 2 m for silt so a ledge's drift stays its ledge's; a face at the capital's
heights counts only in front of Z 70, so the span's face is not the capital's. `u-H-on.json`,
H at T+00:30 (tick 1800, gain 9), reads five 16 px columns a pier, every 20 m from X 195 to
275, from the capital top's north edge to the plinth's foot, each row taking its most common
tag. Rows and mean luma of each mass, top and face together, against the court floor's 17.21
west and 17.12 east (§11 "H, masses" as amended on 30 October: the capital, drum 1 and drum 0
each at least 2 px tall over the floor; drum 2 excepted):

| Column | Capital | Drum 2 | Drum 1 | Drum 0 |
| --- | --- | --- | --- | --- |
| West 195 | 16 @ 34.0 | 3 @ 22.3 | 14 @ 22.2 | 14 @ 23.3 |
| West 215 | 16 @ 35.9 | 3 @ 20.5 | 12 @ 21.9 | 16 @ 26.9 |
| West 235 | 17 @ 34.9 | — | 13 @ 20.8 | 18 @ 28.6 |
| West 255 | 17 @ 36.2 | 3 @ 19.6 | 14 @ 21.4 | 13 @ 24.8 |
| West 275 | 17 @ 35.6 | 3 @ 22.4 | 14 @ 23.3 | 13 @ 25.5 |
| East 195 | 22 @ 36.3 | 2 @ 22.3 | 15 @ 22.2 | 14 @ 24.7 |
| East 215 | 22 @ 36.8 | — | 13 @ 20.9 | 18 @ 29.3 |
| East 235 | 22 @ 37.7 | — | 14 @ 20.6 | 17 @ 26.7 |
| East 255 | 22 @ 36.5 | — | 13 @ 19.4 | 18 @ 26.2 |
| East 275 | 21 @ 37.1 | — | 16 @ 19.9 | 15 @ 23.1 |

Every capital, drum 1 and drum 0 holds. Apart, the capital's top reads 39.1–41.4 over 12–18
rows and its face 18.7–21.5 over 4. Drum 1's face reads 18.0–20.5 and its ledge 33.0–39.8 over
1–2 rows, one row in four of the five east columns; drum 0's face reads 20.0–22.8 and its
ledge 34.6–41.4 over 2–7, the east pier's from the ledge at 20 m where its cladding fell.
Drum 2 draws at most 3 rows, of face, where its cladding stands, and none where it has fallen:
the capital stands 10 m proud of it. `sweep-H-bands.json` is an earlier untimed session,
taken before the silt and span corrections.

`H-arch-before-after-x3.png` crops the arch from `b-H-on-H-030s.png` and `t-H-on-H-030s.png`
and scales both three times, nearest neighbour, at the frames' own values.

### How the gain was set

| Gain | H piers over the floor | L span over the wall | H piers against the laminate |
| --- | --- | --- | --- |
| 5 | +3.99, +4.62 | 0.10 | 21.2 / 21.8 against 30.1 |
| 6 | +5.38, +5.75 | 1.71 | 22.6 / 22.9 against 30.2 |
| 8 | +8.10, +8.15 | 4.95 | 25.3 / 25.3 against 29.7 |
| 9 | +8.65, +9.23; +8.25, +8.94 | 6.46; 6.45 | 25.8 / 26.4 against 29.9 |
| 10 | +9.15, +10.14 | 8.02 | 26.4 / 27.3 against 29.5 |
| 12 | +11.53, +12.30 | 10.9 (round 2) | 28.7 / 29.5 against 29.9 |

From `sweep-H-faces.json` and `sweep-L-whole.json`, one session a station. Nine is the least
whole gain holding both. At 12, of the gains read, H's capital faces reach 24.0 and 25.7,
nearest the 25.5 near-black line, and the capital windows pass the laminate there (30.79 and
31.04 against 29.89). Gain 11 was not read with the faces.

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

## GPU time with the bounce and the grade

§11 asks for GPU time with the bounce and the grade on and off, on a named desktop GPU, the
grade read at L and S. The study's switches had only zeroed a uniform, so the code still ran.
Off now compiles the term out: `ARCH_BOUNCE` on the landmark's materials at gain 0, and
`ARCH_GRADE` on every graded ground and prop material with the grade off
(`archRefinement.test.ts` holds both).

[`gpu.mjs`](gpu.mjs) read §9's stations on the GTX 1070 of
[#1674's GPU run](../issue-1674/README.md#the-gpu-run): `ANGLE (NVIDIA, NVIDIA GeForce GTX
1070 (0x00001B81) Direct3D11 vs_5_0 ps_5_0, D3D11)`, 1920 × 1080, unpaced, the client at
`74b498c2`. Each session holds one station with the study on, from 0:18–0:21 of the mission
clock. It reads the settings in the order on, bounce off, grade off, both off, then back,
each for 240 GPU frames behind #1674's queue load, 3.6 ms, and 12 ms at C. Behind C's load
about three frames a second are timed, so its eight windows outran the 10:40 change. C is
read in two sessions instead, the bounce in one and the grade in the other, with no "both"
reading. Two runs at each ratio, 20 sessions; no frame or load was dropped. The JSONs are
`gpu-dpr<ratio>-r<run>-<station>.json`, and run 1's frames at ratio 1 are
`gpu-dpr1-r1-<station>.png`.

Queued `avgGpuMs`, in ms. A term's cost is the mean of its two "on" readings less the mean
of its two "off" readings, in one session. C's "on" is each session's.

| Station | On, r1 / r2 | Bounce, r1 / r2 | Grade, r1 / r2 | Both, r1 / r2 | Worst queued |
| --- | --- | --- | --- | --- | --- |
| **Ratio 1** | | | | | |
| H | 0.73 / 0.77 | −0.01 / +0.00 | −0.02 / −0.00 | +0.00 / +0.01 | 2.06 |
| L | 1.11 / 1.09 | −0.01 / +0.00 | +0.01 / +0.00 | +0.04 / +0.03 | 1.99 |
| S | 0.72 / 0.72 | −0.01 / −0.02 | +0.01 / +0.01 | +0.02 / +0.04 | 1.86 |
| C | 1.04, 1.04 / 1.03, 1.04 | −0.01 / −0.03 | −0.02 / −0.02 | — | 2.60 |
| **Ratio 1.5** | | | | | |
| H | 1.50 / 1.47 | +0.01 / −0.03 | −0.01 / −0.02 | +0.03 / −0.01 | 5.30 |
| L | 2.30 / 2.30 | −0.03 / −0.03 | +0.00 / −0.02 | +0.04 / +0.01 | 5.15 |
| S | 1.38 / 1.38 | −0.04 / −0.03 | +0.00 / +0.02 | +0.04 / +0.04 | 3.02 |
| C | 2.12, 2.21 / 2.11, 2.12 | +0.01 / −0.03 | −0.01 / +0.01 | — | 5.60 |

Neither term has a cost the GTX 1070 can read. Every difference lies within 0.04 ms of zero,
either side, at both ratios. The "on" readings differ between runs by up to 0.04 ms at ratio
1 and 0.09 ms at C at ratio 1.5, so the differences are inside the instrument's spread.
At L and S, where the grade covers most of the frame, it reads −0.02 to +0.02 ms. Together the
two read at most +0.04 ms. #1674 read the whole study at +0.09 ms at L and ratio 1, so most of
that is the model and its pools, not these two terms.

## The escorts' pixels

"H, order" holds an escort's pixels unchanged with the study on, and §9 pairs them "at the same
tick". [`pair.mjs`](pair.mjs) reads the frame at the first animation frame whose tick reaches
T+00:30, losslessly (`e-<station>-<half>-frame.png`), with the hull pixels of the same frame
from the study's per-material mask (`-hulls.png`, codes 5 and 6), since a hull's box also
holds the ground behind it. The drifting motes are left out of every frame
(`__perspectiveMotes`): the snow, the sift, the cloud, the plumes and the haze moved between
sessions by up to 115 levels. Each half is its own session on the GTX 1070 of the GPU run, at
`e18d150d`, every reading at tick 1800. [`compare.py`](compare.py) reads each escort's hull
pixels inside its box, where either half's mask is set (`compare-<station>-<pair>.json`).

The pair is set against two controls: two sessions with the study on, and two with it off.

| Station, escorts | Pair | Hull pixels changed | Largest difference |
| --- | --- | --- | --- |
| C, three on screen | on / off | 7–8 % of 4,425–9,853 | 18–54 |
| | on / on | 23–25 % | 46–57 |
| | off / off | 32–36 % | 60–116 |
| H, six | on / off | 23–47 % of 113–574 | 8–57 |
| | on / on | 62–86 % | 17–58 |
| | off / off | 86–97 % | 48–61 |

No pair reads identical: two sessions with the same flag differ on every hull, at its
silhouette and in a faint grain over its body, a sub-pixel shift of the hull between sessions.
The study's pair differs less than either control at both stations, so it changes no escort
pixel beyond what a second session changes. A reading of "unchanged" to the pixel would need
a hull that holds still between sessions, which the scene does not give.

## The ember's mean breath

§9 reads a vent ember's mean breath at a C-matched station on the West Approach's nearest
chimney. `pair.mjs` (`MODE=ember`) poses C's dolly and angles over the probe's first standing
chimney, the West Approach vent at (208, 2184), 1,415 m, which #1637 read. For 60 of the
ember's 5 Hz buckets it takes the brightest warm pixel, red over blue by at least 40, and
averages them.

The ember's sprite stands at its vent cell, 102 px west of the chimney's mouth at this pose
(`m-on-nomotes-400.png`). A 60 px window round the mouth, #1637's, never reaches it: it reads
the plume's puffs and the warm water over the mouth, 85.1 with the motes and 70.3 without
(`m-on.json`, `m-on-nomotes.json`). #1637's 83 was that reading. With the motes left out, a
400 px window holds the sprite as its only warm pixel over 120:

| Half | Session a | Session b |
| --- | --- | --- |
| On | 136.3 | 136.2 |
| Off | 155.0 | 133.0 |

The flicker is keyed to the page's own clock, so the two "on" sessions read the same buckets.
The two "off" sessions read 22 apart, one under "on", so the spread is the buckets', not the
study's. The ember's mean breath is 133–155. Round 3's brightest arch pixel outside a pool,
63.6, stays under it, as under 83.

## Not taken here

§11 asks for §9's whole set. These are left:

- No drift line reading as a chart mark at S, which is the owner's look, and no surface
  shimmering in motion.
- The transit pair, the palettes and the `ventfront-divide` control. The motion clips and
  reduced motion are #1674's, filmed at `710ba338` after this refinement
  ([its clips](../issue-1674/README.md#clips)).

## Related

- [The arch study's brief](../../sorrowgate-arch-study.md)
- [#1674's §9 evidence](../issue-1674/README.md)
- [The study's first evidence](../issue-1637/README.md)
