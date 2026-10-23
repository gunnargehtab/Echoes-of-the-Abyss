# Issue 1555 — resource fields on the seabed

Frames from `run-game` on Ventfront Divide, 1440×900, the conn view at the camera named.

| Frame | What it shows |
| --- | --- |
| `00-before-home-field-55.png` | The NW home field before: the chart's rim, fill and seven discs, over bare ground |
| `01-home-field-55.png` | After, 450 m at 55°: eight nodule beds inside the rim, the sediment haze over them |
| `02-home-field-close.png` | 180 m: dark lumps on pale silt, the `ore-trace` glint on a few, the haze as single motes |
| `03-home-field-survey.png` | 1,400 m: the beds read as a patch of ore by tone; the haze is gone |
| `04-crystal-field-55.png` | The crystal field at 2,400 m: three resonance shards inside the dashed depth ring |
| `05-worked-field-300.png` | The work-light and sparks, as the capture could hold them. A frame in this headless renderer takes about seven seconds and a dredge lasts five, so the hull had filled its hold and turned for home before the frame completed; `WORK_LIGHT_HOLD_MS` was raised to 30 s for this capture only, which kept the light and the sparks where the hull cut. So the sparks sit at the cut, not under the hull, and the hull 200 m away takes the same light on its flank; the shipped 600 ms hold never draws that state. The probe at the trigger read `workLightsLit 1, sparks 10, plumeMotes 14` |
| `06-nodule-bed-lit-sheet.png` | `env-nodule-bed` on the lit table, before (HEAD) and after the review rounds |
| `07-home-field-55-brighter.png` | The follow-up after #1563 merged, the owner's "brighter glint, more visible field": ten beds at up to 1.45×, the rim at 0.45, the haze at 0.10 on 6 units, a harvester cutting inside the field under its work-light |
| `08-home-field-close-brighter.png` | 200 m: `ore-trace` at 0.14 on six lumps per bed, reading as amber facets |
| `09-home-field-worked-brighter.png` | The frame the probe triggered on a lit dredge, at the shipped 600 ms hold |

The probe at the 55° home frame: 418 props, 113,522 prop triangles, 7 hazed fields, 33 draw
calls, 147,437 triangles.
