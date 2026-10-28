# #1637 — the arch study, step 2

The development-only study of [sorrowgate-arch-study.md](../../sorrowgate-arch-study.md):
the Sorrowgate transit arch stood by its cells, its licensed light and motion, and the paired
evidence §9 asks for. Every frame is the real client through Tutorial → briefing → Descend,
1440 × 900 at device pixel ratio 1, default settings, the HUD on, from
`.claude/skills/run-game/scripts/drive.mjs` with `?arch-study=1` on the title URL for the
"on" half and nothing for the "off" half. The rasteriser in the capture container is
SwiftShader, so no frame time here is evidence; calls and triangles are.

## Increment A — the landmark stands (`a-*`)

The arch in the state its anchor cells give, at the literal's floor, behind the flag.
`a-readings-on.json` and `a-readings-off.json` carry each station's probe: pose, calls,
triangles, and the landmark's own ledger (`landmarks`, `landmarkTris`).

| Station | On | Off | Read |
| --- | --- | --- | --- |
| H, the unmodified opening camera (pitch 55°, yaw 0) | `a-H-opening-on.png` | `a-H-opening-off.png` | The span and both piers stand over the flight; four lamps on the south face read as four small marks. Calls 55 against 51: the landmark's four. Landmark 2,412 triangles, props 186 at 49,244 in both halves |
| C, construction (focus 2550, 2200 at 1,450 m; dolly 420; pitch 35°, yaw 25°) | `a-C-escorts-on.png` | `a-C-escorts-off.png` | The soffit, the ribs and the hung fittings over the escorts; calls 35 against 31 |
| L, low court (focus 2550, 2750 at 1,450 m; dolly 650; pitch 12°, yaw 0) | `a-L-court-on.png` | `a-L-court-off.png` | The opening framed between the piers behind the flight; calls 64 against 60 |
| S, survey (focus 2500, 2000 on the seabed; dolly 6,500; pitch 55°, yaw 0) | `a-S-survey-on.png` | `a-S-survey-off.png` | Its HUD clock reads T+12:00, after the 10:40 ground change: the landmark reads ruined, 732 triangles, and props stand 198 at 50,356, the collapse's count. The off half's S came before 10:40 (its clock reads T+10:26) and read 186. The `file` fields in both JSONs name the frames as committed here |

Increment A alone drew no light and no motion: the lamps were the model's own emissive at
the licence's level, with no pool, no flicker, no sift, no sway and no collapse sequence.

## Increment B — light and motion (`b-*`)

The study's licence on the landmark alone: the four lamps' guttering and their pools on the
arch's own stone, the hung fittings' sway, the silt sift, and the collapse sequence on the
received ground change. `b-readings.json` carries each frame's probe, with `siftMotes` and
`cloudMotes` beside the landmark's ledger. The study's calls standing are five: four for
the landmark and one for the sift (H read 56 against increment A's 55); on the ruin they
are the landmark's three, the sift's one and, while it lives, the cloud's one (50 at 0.4 s
and 2 s, 45 after).

| Frame | Pose | Read |
| --- | --- | --- |
| `b-C-escorts-a.png`, `b-C-escorts-b.png` | C, 3 s apart | The ribs, the rail and the hung fittings over the escorts; the sift's 256 motes stand. The pools are faint at this exposure and the fittings' 1.5 m is under a pixel at this dolly: the §9 pixel readings and clips are increment C's |
| `b-T-before.png` | H's pose, T+10:22 | The intact arch, lamps lit, the flight under it |
| `b-T-after-0.4s.png` … `b-T-after-16s.png` | H's pose, the first probe reads after the ruined state | The arch gone into the wall, the lamps dark from the first frame, the landmark 732 triangles; the cloud's 384 motes stand in the first two frames and are gone by the third (the software rasteriser took longer between shots than their names say), and the sift stands on the ruin's four sites. The ruin itself is a dark line against the dark wall from this pose: C's station after the change is increment C's |

The clips §9 asks for are not here: this container draws through SwiftShader at a few
frames a second, so a clip from it would be a slideshow. They are increment C's, on a
machine with a GPU, with the pixel readings and the performance stations.
