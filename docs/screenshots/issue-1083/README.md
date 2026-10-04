# Silt detail and seated stones

Evidence for [#1083](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1083): the
dune study of [#967](../issue-967/README.md), made fit for every map and still opt-in. The
specification is
[art-direction.md](../../art-direction.md#silt-detail-and-seated-stones--spec), "Silt
detail and seated stones — SPEC".

## Files

| File | What it is |
| --- | --- |
| `shoot.mjs` | A `run-game` steps module: five held views of a solo Ventfront match, HUD hidden, with each view's calls, triangles and props |
| `contrast.mjs` | The pixel readings below, from two `shoot.mjs` frame sets, and the brightened crops |
| `home-off.png`, `home-on.png`, `home-dream.png` | #967's locked frame: shipped ground, the silt detail, and #967's whole study |
| `silt-off.png`, `silt-on.png` | A seated boulder on open water at 420 m |
| `trench-off.png`, `trench-on.png` | A seated trench slab at 520 m |
| `low-on.png`, `survey-on.png` | The 12° low view and the survey dolly, where the layer has faded |
| `*-x6.png`, `*-x10.png` | Crops of the silt and trench frames, scaled up and multiplied by 6 or 10: a viewing aid for near-black ground, never a reading of brightness |
| `stations-off.json`, `stations-on.json` | What `shoot.mjs` read at each view |
| `gpu/` | `tools/render-stack/capture.mjs` readings, unpaced, at ratio 1 and 1.5, off and on, two runs each |

## How the frames were taken

A solo match on the Ventfront Divide from the Bathyarch Consortium seat, at 1920 × 1080
and ratio 1, in headed Edge on a GeForce GTX 1070 through ANGLE and Direct3D 11:

```bash
VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs --headed \
  --channel msedge --url 'http://localhost:5173/?map=ventfront-divide&seabed-detail=1' \
  --out <dir> --steps docs/screenshots/issue-1083/shoot.mjs
```

The shipped set drops `&seabed-detail=1`; `home-dream.png` uses `&dream-loop=1`. No console
error occurred in any drive. Each view drew the same calls and triangles on and off: 64
and 150,696 at home, 22 and 133,435 at the silt and trench views, which frame no
structure.

## What the frames show

The [shipped home frame](home-off.png) and the [silt detail](home-on.png) share every
model and every call. On, the kelp plateau carries faint east–west dune shadows and scour
mottling; in [#967's study](home-dream.png) the cool steel sits on the same ground.

Over open water, the [shipped boulder](silt-off.png) stands on its silt skirt on flat
ground; [seated](silt-on.png), it is sunk to its shoulders. The [brightened
crop](silt-on-x6.png) shows the dune shadows, the ripples in their troughs and the scour
trailing south on the lee, against the [flat shipped ground](silt-off-x6.png). The
[trench slab](trench-on-x10.png) sits in its own hollow, [standing proud](trench-off-x10.png)
before. The faint colour fringe at the hollow's edge is 8-bit rounding at two or three
code values, magnified ten times; the bake's mottle rounds the same way.

## Pixel readings

`contrast.mjs diff` over the two sets, mean encoded luma out of 255:

| View | Off | On | Pixels moved a code value or more |
| --- | --- | --- | --- |
| Home, 1,500 m at 55° | 16.64 | 15.50 | 42.3 % |
| Silt, 420 m at 50° | 9.80 | 8.48 | 65.4 % |
| Trench, 520 m at 50° | 3.67 | 3.45 | 0.7 % |
| Low, 3,500 m at 12° | 17.26 | 16.91 | 14.4 % |
| Survey, 18,000 m at 88° | 8.25 | 8.25 | 0.7 % |

The survey view is the fade working: the layer is gone by 8 m a pixel. The trench reads
almost nothing because its ground sits near 3 of 255, where a darken-only layer has no
room; the slab's seat and hollow are what change there.

`contrast.mjs patch` over the home frame's plateau, bottom left, and over the same pixels
in the target of #967:

| Frame | Mean | Spread | p5 to p95 | Fine spread |
| --- | --- | --- | --- | --- |
| [Target](../issue-967/target.png) | 19.4 | 3.92 | 13.4 to 24.7 | 3.10 |
| [#967 round 4](../issue-967/prototype-4.png) | 19.9 | 1.56 | 18.5 to 21.1 | 1.39 |
| Shipped | 21.5 | 1.30 | 19.5 to 22.9 | 0.67 |
| Silt detail | 19.3 | 1.60 | 16.9 to 21.4 | 0.77 |
| Silt detail in #967's study | 19.4 | 1.85 | 16.9 to 21.9 | 1.21 |

The target's p95 sits above the shipped fill's: its lit faces are brighter than the
biome fill, which "Reading the Sea Floor" forbids. A darken-only layer cannot reach it.

## The bound

The first table capped every row at half a full authored face, 0.21. On the home frame
it moved 9.6 % of pixels by a code value and left the plateau's spread at 1.28, the
shipped ground's. Capped at 0.40, two pixels in five move and the dunes show. The owner
took 0.40: the detail's darkest pixel, 0.60 of the fill, stays lighter than a full face
at 0.58. Lifting lit faces above the fill would reach the target and was not taken.

## Cost

Gate 6's reading ([graphics-standards.md](../../graphics-standards.md)): the conn view's
GPU time, unpaced and queued, at `capture.mjs`'s four cameras on Ventfront, on minus off,
two runs each. The first shader hashed its noise in the fragment shader, nine noises of
four lattice points, and its integer multiplies cost what the hashed columns say. The
shipped shader reads a 128 × 128 lattice texture instead, seven fetches a fragment.

| Camera | Hashed, ratio 1 | Lattice, ratio 1 | Hashed, ratio 1.5 | Lattice, ratio 1.5 |
| --- | --- | --- | --- | --- |
| Home | +0.33, +0.31 ms | +0.12, +0.08 ms | +0.64, +0.63 ms | +0.15, +0.15 ms |
| Close | +0.49, +0.48 ms | +0.13, +0.10 ms | +1.03, +1.05 ms | +0.24, +0.23 ms |
| Low | +0.33, +0.32 ms | +0.08, +0.07 ms | +0.66, +0.68 ms | +0.16, +0.16 ms |
| Survey | +0.29, +0.27 ms | +0.06, +0.09 ms | +0.46, +0.48 ms | +0.12, +0.14 ms |

With the lattice the conn frame reads 0.70 to 0.86 ms queued at ratio 1 and 1.30 to
1.70 ms at 1.5, the close camera the most. `avgConnMs`, the CPU side, moved by run-to-run
spread only, −0.10 to +0.03 ms. Calls and triangles did not move at any camera. The `gpu/`
readings are the lattice shader's, at `drive.mjs`'s 1440 × 900.

## Sorrowgate

The tutorial draws its own mission surface and never takes the layer. Opened with
`?mission=prologue-sorrowgate&seabed-detail=1`, the camera pinned at (2,500, 2,500) m,
its frame differs from the unflagged one in 0.05 % of pixels, against 0.12 % between two
unflagged runs; both draw 55 calls, 46,634 triangles and 80 props.

## What is left

- **Promotion.** One predicate, `seabedDetailEnabled`, and a decision written in the
  SPEC section. Until then the layer draws only in a development build with the flag.
- **The target's contrast.** About two and a half times the layer's, and out of reach
  without a lift above the fill.
- **Deep ground.** Water deeper than the plateau sits under 10 of 255, where the layer
  moves little; the seated stones carry those views.
- **The scour's resolution.** It is baked at 7.8 m a pixel, so it reads as a soft hollow
  rather than a crisp rim.
- **One map measured.** Ventfront's four cameras, as gate 6 names them for the halo; no
  other skirmish map was read.

## Related

- [art-direction.md](../../art-direction.md#silt-detail-and-seated-stones--spec) — the SPEC
- [issue-967](../issue-967/README.md) — the target and the study this came from
- [graphics-standards.md](../../graphics-standards.md) — gate 6
- [visual-reboot.md](../../visual-reboot.md) — Sorrowgate's own surface
