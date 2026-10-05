# #1079 — own models instanced per template, at the berth ceiling

Gate 6 ([graphics-standards.md](../../graphics-standards.md) §6, "The berth ceiling") let
the ceiling breach 150 calls until own models were instanced. They now are: every own hull
or structure of one template, which is its kind, navy, look and palette, draws from one
`InstancedMesh` per material (`packages/frontend/src/game/rosterBatches.ts`). These readings
are the forty Beacons and the dozen structures of [issue-1027](../issue-1027/README.md),
on `main` at `1320744` and on this branch.

## How it was read

The force is #1027's local stand-in: `staging.patch` from that folder, applied, read and
reverted, with `STAGE_FILE` holding
`Bathyarch Beacon 40 Refinery,Refinery,Refinery,VentTap,VentTap,BaffleBarge,SentinelTurret,BioReactor`.
That is the four structures that grant forty berths, the Bastion, two Foundries and a
Slipway, and eight more. `counts.mjs` reads calls and triangles at `capture.mjs`'s four
cameras, headless at 1440×900 and ratio 1, through SwiftShader, on 5 October 2026.

A software rasteriser's times measure the rasteriser, but its counts are the scene's.
`main` read here exactly what the named GPU read for the same force on 4 October: 336 calls
and 314,174 triangles at home, 242 and 263,324 at close.

## The counts

| Camera | `main`: calls / triangles | Instanced: calls / triangles | On screen |
| --- | --- | --- | --- |
| Home | 336 / 314,174 | 80 / 314,174 | 40 hulls, 12 structures |
| Close | 242 / 263,324 | 63 / 307,760 | 32, 4 |
| Low, 12° | 336 / 314,160 | 80 / 314,160 | 40, 12 |
| Survey | 336 / 314,120 | 80 / 314,120 | 40, 12 |

The 80 is the frame's 30 other calls and 50 model meshes: 6 for the forty Beacons, and 44
for the twelve structures in their eight templates, where `main` drew 306 for the models.
Where the whole force is on screen, every triangle drawn before is drawn now and no other.
At close, the instanced frame draws 44,436 more: a template is culled by one sphere round
all of its instances, so instances outside the frame are drawn whenever that sphere
reaches it. No camera can draw more than the whole force, which is the home camera's
frame.

## Gate 3, in pixels

Each hull's lamps share one material with every hull of its kind, and its own SIG reaches
them as a per-instance factor. `tools/render-stack/lamps.mjs`, on the opening without
staging and with its ping stage cut, since SwiftShader cannot read inside the ping's three
seconds, differences each hull's states in linear light:

| Pair | `main`: emission moved / hue | Instanced: emission moved / hue | Lamp ink hue |
| --- | --- | --- | --- |
| Caisson, rest − silent | 1,950.7 / 31.4° | 1,856.6 / 31.4° | 28.9° |
| Light Scout, rest − engine off | 29.3 / 30.4° | 31.0 / 33.5° | 28.9° |

Both runs read every lamp on the curve and after the tone curve; the instanced run, at
`e906971`, reads each lamp's strength back from its hull's slot in the batch. The two
differ by under 6 %, on identical crops, and that is the reading's own spread: an earlier
instanced run, at `1c77bbe`, moved 1,889.7 and 27.6. The two frames at close,
`dozen-close-main.png` and `dozen-close-instanced.png`, show the same force drawn both ways.

## Files

- `readings/dozen-main.json`, `readings/dozen-instanced.json`: `counts.mjs`'s output.
- `readings/lamps-main.json`, `readings/lamps-instanced.json`: `lamps.mjs`'s output.
- `dozen-close-main.png`, `dozen-close-instanced.png`: the close camera, HUD on.
- `counts.mjs`: the counting module.

## Related

- [graphics-standards.md](../../graphics-standards.md) §6, "The berth ceiling"
- [issue-1027](../issue-1027/README.md), the force and the named GPU's readings
