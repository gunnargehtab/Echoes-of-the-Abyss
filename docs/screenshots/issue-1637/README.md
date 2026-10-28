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

## Increment C — the §9 pairs and readings this container can take (`c-*`)

Two fresh tutorial sessions, the study on and off, each station taken once the probe's
mission clock (`__echoClock`, the HUD's own tick) passed T+01:30, so H and C are matched
within a second; L and S of the on half came later because the on half also took the
pools-off and glass-dark readings at C. Every reading is off the conn canvas alone, read in
the frame that drew it (`tools/render-stack/halo.mjs`'s method), so the HUD's panels are
not in it. `c-readings-*.json` carry each frame's probe and its conn readings.

| Station | Tick on / off | Calls on / off | Triangles on / off | Near-black (luma < 10) on / off |
| --- | --- | --- | --- | --- |
| H | 5676 / 5640 | 56 / 51 | 123,375 / 120,963 | 98.5 % / 99.4 % |
| C | 6192 / 6132 | 36 / 31 | 106,127 / 103,715 | 87.2 % / 99.2 % |
| L | 7968 / 6600 | 54 / 49 | 115,410 / 112,998 | 97.9 % / 98.0 % |
| S | 8616 / 7224 | 56 / 51 | 123,375 / 120,963 | 98.8 % / 99.0 % |

The study is five calls and 2,412 triangles at every station: the landmark's four and the
sift's one. At C the arch fills the frame and its stone, at the prop luminance ceiling,
takes the near-black share from 99 % to 87 %, inside the 85–90 % budget; the pools and the
glass move it by under half a point (pools off 87.1 %, glass dark 86.7 %).

### The lamp glass, the lit stone and what they must stay under

Read in a 28 px window round each lamp the probe projects (`landmarkLampsPx`), at C, with
the study's switches (`__archStudy`): the glass alone with the pools off, the stone alone
with the glass dark. Lamp 1 is off screen at C's pose.

| Reading | Lamp 0 | Lamp 2 | Lamp 3 |
| --- | --- | --- | --- |
| Lamp glass, pools off (max luma, RGB) | 88 (113, 84, 59) | 83 (106, 79, 57) | 85 (107, 81, 57) |
| Lit stone, glass dark (max luma, RGB) | 36 (29, 37, 46) | 45 (28, 48, 65) | 48 (21, 54, 74) |

With the glass dark the brightest pixel under each lamp is the stone's own key-lit face,
blue-grey, not the pool: the pool sits under that. So the lit stone stays under the lamp
glass beside it (36–48 against 83–88) and under the escorts' brightest lamp pixel, a green
navigation mark at luma 215 in the same frame (RGB 153, 243, 118). The ember's mean breath, read the same way at a C-matched station on the probe's first standing chimney (`c-ember.png`, `c-readings-ember.json`: the brightest warm pixel in a 60 px window round the mouth on twelve sonar buckets, their mean), is luma 83: the lit stone sits under it, and the lamp glass reads level with it.

The three colour-vision palettes and reduced motion read the glass identically (world light
takes no UI hue, style-neon-noir.md rule 5) and the stone within a few levels:
`c-H-*.png` and `c-C-*.png` for `deuteranopia`, `protanopia`, `tritanopia` and
`reduced-motion`, each with its `c-readings-*.json`.

### The non-target control

`ventfront-divide` with the flag on and off at the home station, tick 5688 / 5712: the
landmark, the sift and the cloud read 0 in both, triangles 166,978 in both; the one call's
difference (69 against 68) is the harvester's dredging plume, which read 17 motes in one
frame and 20 in the other.

### The transit pair and the reload

At C's pose, on one session through the 10:40 change (`c-T-*.png`, `c-readings-collapse.json`):

| Frame | Tick | Landmark | Sift | Cloud | Calls |
| --- | --- | --- | --- | --- | --- |
| `c-T-before-C.png` | 37704 | intact, 2,412 | 256 | 0 | 36 |
| `c-T-after-C-0s.png` | 38496 | ruined, 732 | 256 | 384 | 37 |
| `c-T-after-C-2s.png` | 38808 | ruined, 732 | 256 | 384 | 38 |
| `c-T-after-C-6s.png` | 39240 | ruined, 732 | 256 | 384 | 38 |
| `c-T-after-C-15s.png` | 39984 | ruined, 732 | 256 | 0 | 38 |
| `c-T-reload-C.png` | 41016 | ruined, 732 | 256 | 0 | 37 |

The before frame is T+10:28, the first after frame T+10:41, the first the probe read after
the change on this rasteriser. The lamps are dark from that frame (the ruined state stands
no glass and the pool count is zero), the cloud's 384 motes stand in the first three frames
and are gone by the fourth, and the ruin's four sift sites carry the sift on. The reload row
is the same session rejoined through the parked reconnection token after the change: the
probe read the ruined state, no cloud and no sequence on its first frame (`atOnce` in the
JSON), as gate 1's join clause requires.

### Not taken here

The clips, the GPU time at C with the pools on and off, DPR 1.5, and the 240-frame
performance stations: this container draws through SwiftShader, whose milliseconds measure
the rasteriser. They need the named desktop GPU (`docs/screenshots/issue-1001/README.md`),
and are listed in the pull request's open findings.
