# #1683 — the arch study's normal-view refinement, before and after

The readings [sorrowgate-arch-study.md](../../sorrowgate-arch-study.md) §11 asks of the
refinement, at §9's four stations. The refinement does not yet meet §11's H criteria. Round 1's
critic stopped the loop and handed the light bound back to the owner. The findings are at the
foot of this page.

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
- **After** (`a-*`): `db269506`, with the bounce, the 0.10 ceiling, rib roughness 0.6, the
  distance grade and the reshaped model. `SPAN_Z` 45, the span face's new Z.

`*-windows.png` is the frame with each §11 window drawn where it fell. Each `*.json` carries
the reading tick, the pose, the probe, the windows and the per-material masks (`arch.masks`:
pixels outside the pools, mean and brightest luma, and the pixels inside the pools).

Sessions on this container stand the six hull models between ticks 1,730 and 2,150, so a
station at T+00:30 failed on most tries: C with the study on took thirty-one. Reading ticks run 1,800
to 1,884, so a pair's halves are up to 1.2 s apart, not matched to the tick.

## The readings

| Station | Reading tick before / after | Calls on / off | Landmark triangles | Near-black before → after |
| --- | --- | --- | --- | --- |
| H | 1824 / 1860 | 56 / 51 both | 2,412 → 2,626 | 98.7 % → 98.8 % |
| C | 1848 / 1860 | 36 / 31 both | 2,412 → 2,626 | 86.9 % → 89.3 % |
| L | 1872 / 1812 | 54 / 49 both | 2,412 → 2,626 | 98.1 % → 97.9 % |
| S | 1848 / 1800 | 56 / 51 both | 2,412 → 2,626 | 99.1 % → 99.0 % |

The study-off halves read the same calls and triangles before and after (120,963 at H and S,
103,715 at C, 112,998 at L), so nothing outside the flag moved.

| §11 criterion | Before | After | Result |
| --- | --- | --- | --- |
| H, each pier window at least 5 over its floor window | −12.65 W, −9.79 E | +1.09 W, +0.85 E | Fails |
| H, the opening at least 5 under both piers | 12.05 over | 1.47 under | Fails |
| H, no arch pixel outside a pool over the escorts' brightest lamp pixel | 44.4 < 177.9 | 63.7 < 177.9 | Holds |
| H, no arch window over the escorts' laminate mean | 17.4 < 29.3 | 18.3 < 29.3 | Holds |
| H, near-black falls from 98.7 % and stays at or above 85 % | 98.7 % | 98.8 % | Fails |
| C, `structure_rib` and `stone_dark` masks at least 5 apart | 3.5 / 19.5 | 8.1 / 23.2 | Holds, 15.1 |
| C, the capitals' south faces above near-black | — | — | Not read |
| L, span face and Descent wall windows at least 5 apart | 5.4 / 12.7 | 8.1 / 14.3 | Holds, 6.2 |

The masks show the surface change at every station. At H, the arch's stone outside the pools
rose from mean luma 23.7 to 32.6, its ribs from 6.4 to 14.0 and its silt from 29.2 to 39.9.
The escorts' laminate reads 29.3 in both.

## Why H falls short

Round 1's critic read the after frame's rows through the west pier's window. The capital's
top reads about 42 luma, key-lit. Its south face reads 4–15, drum 2's face 4, drum 1's ledge
40 for one row and its face about 4. The windows rise only by the lit tops they take in, about
a quarter of each.

§11 projected a south face of about 16/20/26, luma 19.5, from a 3.3× gain in linear light.
That gain applies before the tone curve. The view tone-maps with ACES at exposure 1, which
divides by 0.6, and three's fit returns zero below about 0.0034. A south face lit only by
the ambient, the bounce and the environment, at a diffuse of 0.10 or less, sits in that toe:
measured, it went from about 2 luma to 4. The court floor is drawn unlit and is not
tone-mapped, so it reads 17 either way. By the critic's rough inversion, a face at about 22
luma needs about 5× today's south-face radiance. The bounce is already the ambient again and
the ceiling already 0.10, so no lever inside §11's bounds reaches H.

## Not taken here

§11 asks for §9's whole set. These are left:

- The capitals' south faces at C, and the drum bands at H, band by band.
- The diagnosis #1683 asks for: one H frame with the bounce off and one with the ceiling at
  0.06, and the veil's shade at the anchor.
- An escort's pixels on and off at a matched tick, and a vent ember's mean breath.
- The transit pair, the motion clips, reduced motion, the palettes and the
  `ventfront-divide` control.
- GPU time with the bounce and the grade on and off, on a named desktop GPU, which this
  container cannot give.

## Related

- [The arch study's brief](../../sorrowgate-arch-study.md)
- [#1674's §9 evidence](../issue-1674/README.md)
- [The study's first evidence](../issue-1637/README.md)
