# #1111 — the Bulwark with its baked occlusion map

The first hull to carry a baked occlusion map
([art-direction.md](../../art-direction.md#bevels-and-baked-occlusion--spec)), over its
Consortium trim layout. The before is `main` at `a5aa58bd`, the bare file; the after is the
same script with `occlusion: { size: 512 }`.

| Frame | What it shows |
| --- | --- |
| `lit-table.png` | `node tools/hull-renders/inspect.mjs bulwark-bathyarch --before a5aa58bd`: bare on the left, baked on the right, four cameras. No vertex moved, so only the shading differs |
| `lit-close.png` | The same with `--view turret:40:35:0.9:turret_ring+turret --view citadel:150:35:0.9:citadel+stack`: the drum's foot, the barrels' undersides, the stacks' feet and the citadel's foot darken; the lamps do not |
| `occlusion-atlas.png` | The 512² map as the file carries it: 1,025 charts filling 70 % of the atlas |
| `conn-view.png` | A close conn-view frame of one of four staged Bulwarks on Ventfront, before above and after below, cropped from 1440×900 frames |

The conn frames come from `close.mjs` in this directory, driven headed through Edge on a
GTX 1070. No opening fields a Bulwark, so the force is
[`staging.patch`](../issue-1027/staging.patch) with `STAGE_FILE` holding
`Bathyarch Bulwark 4`: a local stand-in, never committed. The before swapped `main`'s GLB
over the served file between drives, with no page open, and restored it after. Marine snow
drifts between the two drives, so the frames are compared by eye, not by pixel.

The probe's counts at both views of the frame:

| View | Draw calls | Triangles | Textures |
| --- | --- | --- | --- |
| Close, before | 42 | 149,434 | 20 |
| Close, after | 42 | 149,434 | 21 |
| Quarter, before | 42 | 149,428 | 20 |
| Quarter, after | 42 | 149,428 | 21 |

The one texture is the map: no call, no triangle and no pass, as gate 6 of
[graphics-standards.md](../../graphics-standards.md) allows it.

Related: [art-direction.md](../../art-direction.md) ·
[issue-1002](../issue-1002/README.md) (the Bastion, the first baked model)
