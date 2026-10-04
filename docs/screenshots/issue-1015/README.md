# #1015 — the hull portraits through the game's frame

[art-direction.md](../../art-direction.md) "Hull portraits" and "Lamp halo — SPEC": the
portrait rig, `tools/hull-renders/scene.html`, now draws the conn view's frame. Each material
tone-maps itself, lamps take the navy's glow ink at the strength the model was approved at,
held at gate 3's lamp core, lamps and lit props add their glow after the curve, and the lamp
halo runs at the hull's idle SIG. The rig's lights, plate, seabed, props and snow are its
own, as the owner decided on 4 October 2026. The bloom the rig ran before is gone.

`before-after-bathyarch-pelagia.png` and `before-after-directorate-hadron.png` set each of
the 20 portraits beside its predecessor: per navy, the frame of 11 September on the left and
the new one on the right, in rows Chorister, Harvester, Corvette, Abyssal Submersible,
Cruiser. The new portraits replace those in `docs/concept-art/renders/`.

## The halo's widths

The SPEC multiplies the halo's three widths by the hull's drawn length in the portrait over
its drawn length at the close camera (1,800 m, 900 px of view, draw scale 1): 1,364 ÷ the
hull's length, from 10.5 for the Cruiser to 27.3 for the Chorister. The blur's seven taps
reach 1.8 of that, so the chain starts whole octaves further down (`chainShift`,
`lampHalo.ts`). The game's pixel ratio stops at 1.5 and never shifts.

| Kind | Length | Idle SIG | Width multiplier | Sites drawn, four navies |
| --- | --- | --- | --- | --- |
| Chorister | 50 m | 16 | 27.3 | none |
| Harvester | 75 m | 18 | 18.2 | none |
| Abyssal Submersible | 95 m | 22 | 14.4 | 1–27 |
| Corvette | 80 m | 28 | 17.1 | 2–15 |
| Cruiser | 130 m | 55 | 10.5 | 15–29 |

The Chorister and the Harvester draw no halo: at SIG 16 and 18 the SIG gate weighs their
energy at 0.05 and 0.15, under the toe, as the conn view would.

## What else changed in the frame

- **The deep shadows lift.** The old composer held the frame in an 8-bit linear buffer, which
  crushes everything under about 5 % encoded luma to black. The canvas is 8-bit sRGB and
  keeps those tones. The share under 10 % luma barely moves, 91.5–99.3 % before and
  92.2–99.5 % after, inside the style's 85–90 % floor; mean luma goes from 1.0–4.4 % to
  2.0–5.7 %.
- **The vent chimneys go dark, from their model.** `env-vent-chimney.glb` turned its ember to
  face up in #890, after these portraits were taken; `main`'s own rig, bloom included, now
  draws the chimney dark from this camera too.
- **The audit's frame stays the old one.** The render-stack audit compares against the
  Bathyarch Cruiser of 11 September, now kept as
  [issue-974](../issue-974/README.md)'s `portrait-cruiser-bathyarch.png`.
