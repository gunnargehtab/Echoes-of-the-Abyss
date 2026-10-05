# Terrain lift and the silt detail promoted

Evidence for [#1103](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1103). Terrain
texture is centred on its fill and capped at 0.15 above it, and the silt detail draws in every
match. The specification is [art-direction.md](../../art-direction.md#reading-the-sea-floor),
"Reading the Sea Floor", and its "Silt detail and seated stones — SPEC".

## Files

| File | What it is |
| --- | --- |
| `*-on.png`, `*-off.png` | [issue-1083's `shoot.mjs`](../issue-1083/shoot.mjs) stations, every match's ground and `?seabed-detail=0` |
| `home-*-x4.png` | The home frame's plateau, bottom left, multiplied by 4: a viewing aid, never a reading of brightness |
| `stations-on.json`, `stations-off.json` | What `shoot.mjs` read at each view |
| `gpu/`, `fight/` | Gate 6's `capture.mjs` and [`fight.mjs`](../issue-1083/fight.mjs) readings, unpaced, ratio 1 and 1.5, off and on, two runs each |

## How the frames were taken

As [issue-1083](../issue-1083/README.md) took them: a solo Ventfront match from the
Consortium seat, 1920 × 1080 at ratio 1, headed Edge on a GeForce GTX 1070 through ANGLE and
Direct3D 11.

```bash
VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs --headed \
  --channel msedge --url 'http://localhost:5173/?map=ventfront-divide' \
  --out <dir> --steps docs/screenshots/issue-1083/shoot.mjs
```

The off set adds `&seabed-detail=0`. It keeps the bake's centred relief and mottle, so the
shipped ground before this change is issue-1083's `home-off.png`. No console error occurred.

## Pixel readings

`contrast.mjs patch` over the home plateau, mean encoded luma out of 255:

| Frame | Mean | Spread | p5 to p95 | Fine spread |
| --- | --- | --- | --- | --- |
| [Target](../issue-967/target.png) | 19.4 | 3.92 | 13.4 to 24.7 | 3.10 |
| [Before, shipped](../issue-1083/home-off.png) | 21.5 | 1.30 | 19.5 to 22.9 | 0.67 |
| [Before, silt detail](../issue-1083/home-on.png) | 19.3 | 1.59 | 16.9 to 21.9 | 0.75 |
| [After, `?seabed-detail=0`](home-off.png) | 22.6 | 1.48 | 20.4 to 24.5 | 0.70 |
| [After, every match](home-on.png) | 22.1 | 2.23 | 18.0 to 25.2 | 1.00 |

- **Lit faces reach the target's p95**, 25.2 against 24.7. Darken-only, the layer stopped at
  21.9.
- **The spread is 1.7 times the shipped ground's** and 1.4 times the darken-only layer's: 57 % of
  the target's. The rest is in the target's dark side, p5 13.4 against 18.0, and in its fine
  spread, 3.10 against 1.00.
- **The mean rose about 5 %**, from 21.5 to 22.6 with the detail off. The darken-only relief and
  mottle had held the plateau under its fill; centred, it averages back to the fill.

`contrast.mjs diff`, off against on:

| View | Off | On | Pixels moved a code value or more |
| --- | --- | --- | --- |
| Home, 1,500 m at 55° | 17.11 | 16.81 | 20.1 % |
| Silt, 420 m at 50° | 9.83 | 9.55 | 19.2 % |
| Trench, 520 m at 50° | 3.67 | 3.63 | 0.6 % |
| Low, 3,500 m at 12° | 17.49 | 17.39 | 11.6 % |
| Survey, 18,000 m at 88° | 8.28 | 8.29 | 1.5 % |

Fewer pixels move than #1083's 42.3 % at home: the darken-only layer dimmed flat ground by half
its dune strength everywhere, and the centred one leaves flat ground at the fill.

## Cost

Gate 6's reading ([graphics-standards.md](../../graphics-standards.md)): the conn view's GPU
time, unpaced and queued, on minus off, two runs each, at `capture.mjs`'s four cameras and
the fight station on Ventfront, at `drive.mjs`'s 1440 × 900.

| Station | Ratio 1, off → on | Ratio 1, on − off | Ratio 1.5, off → on | Ratio 1.5, on − off |
| --- | --- | --- | --- | --- |
| Home | 0.78 → 0.83, 0.76 → 0.84 ms | +0.05, +0.08 ms | 1.34 → 1.52, 1.38 → 1.54 ms | +0.18, +0.16 ms |
| Close | 0.84 → 0.96, 0.83 → 0.96 ms | +0.12, +0.13 ms | 1.58 → 1.84, 1.57 → 1.82 ms | +0.26, +0.25 ms |
| Low | 0.80 → 0.87, 0.79 → 0.88 ms | +0.07, +0.09 ms | 1.38 → 1.56, 1.36 → 1.53 ms | +0.18, +0.17 ms |
| Survey | 0.72 → 0.84, 0.78 → 0.82 ms | +0.12, +0.04 ms | 1.31 → 1.42, 1.34 → 1.46 ms | +0.11, +0.12 ms |
| Fight | 0.88 → 1.01, 0.88 → 0.94 ms | +0.13, +0.06 ms | 1.44 → 1.65, 1.45 → 1.62 ms | +0.21, +0.17 ms |

- **The layer meets its allocation**, 0.15 ms at ratio 1 and 0.30 ms at 1.5: its worst
  readings are 0.13 and 0.26 ms, as #1083's were 0.12 and 0.26 ms. The centring adds no fetch.
- **The close camera's frame at 1.5 is over the 1.7 ms line**, at 1.82 and 1.84 ms. With the
  layer off it reads 1.57 and 1.58 ms, against #1083's 1.41: the frame drifted 0.13–0.19 ms
  on main since `fa8d8160`, at every station. The owner promoted the layer anyway and the drift
  is [#1114](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1114).
- **Calls and triangles did not move** at any camera: 57 calls at home, low and survey, 56
  close; 150,696 triangles, 150,676 at the survey. `avgConnMs`, the CPU side, moved −0.06 to
  +0.12 ms, run to run.

## Related

- [art-direction.md](../../art-direction.md#reading-the-sea-floor) — the cap and the centring
- [map-visuals.md](../../map-visuals.md) — §5, the ladder that sets the cap
- [issue-1083](../issue-1083/README.md) — the layer, and the stations reused here
- [graphics-standards.md](../../graphics-standards.md) — gate 6
