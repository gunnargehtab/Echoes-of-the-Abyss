# #1674 — the arch study's §9 evidence, retaken

Three of the four [sorrowgate-arch-study.md](../../sorrowgate-arch-study.md) §9 clauses that
[#1637's increment C](../issue-1637/README.md#increment-c--the-9-pairs-and-readings-this-container-can-take-c-)
did not meet: the colour-vision palettes, the stations at §9's viewport and times, and the
transit pair. The fourth, GPU time, needs the named desktop GPU and is not here.

Every frame is the real client at `6021dd06` through Tutorial → briefing → Descend: one fresh
session per station, and one per half for the transit pair. Each is 1920 × 1080 at device pixel
ratio 1, with the HUD on and default water, halo and motion settings. The study is on with
`?arch-study=1` on the title URL and off without it. The renderer is SwiftShader, `ANGLE
(Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)` in
every JSON, so no frame time here is evidence; calls and triangles are. Each frame is from
[`capture.mjs`](capture.mjs), driven by `.claude/skills/run-game/scripts/drive.mjs`. Its
header says how a frame is timed without stopping or accelerating the server clock.

Two clocks are recorded per frame. The image's time is the HUD clock in its top right. The
readings' time is `readingTick`: the conn canvas and the probe, read together in the first
animation frame whose tick reached the requested time. Each `d-*.json` also carries the
session's settings record, `leadS` (0 for every frame here), the tick the six hull models
stood (`modelsTick`), and the requested and actual pose. The conn readings are its near-black
share (luma under 10 %), its brightest pixel and a 28 px window round each standing lamp. Six
hull models stood in every session; none counted the array fallback.

## The quartet at T+00:30, on and off

Every frame's HUD clock reads T+00:30, so H, C, L and S are within one second of each other.
Two were retaken for that: a first C-on session drew T+00:31 and a first C-deuteranopia
session T+00:29. Every reading is between ticks 1800 and 1848, the first 0.8 s of that second.
A reading is the first frame at or past its time, so two sessions' readings can differ by up
to a frame. §9 pairs C and L at the same tick, and #1674 L and S, so a half was retaken until
its reading matched the other's. The committed L-on is its third session (the first two read
1824 and 1812), and S-on its second (the first read 1836).

| Station | Pose (focus, dolly, pitch, yaw) | On | Off | Reading tick on / off | Calls on / off | Triangles on / off | Near-black on / off |
| --- | --- | --- | --- | --- | --- | --- | --- |
| H | Unmodified opening: (2550, 2553) on the seabed, 2,600, 55°, 0° | `d-H-on-H-030s.png` | `d-H-off-H-030s.png` | 1848 / 1800 | 56 / 51 | 123,375 / 120,963 | 98.7 % / 99.5 % |
| C | (2550, 2200) at 1,450 m, 420, 35°, 25° | `d-C-on-C-030s.png` | `d-C-off-C-030s.png` | 1800 / 1800 | 36 / 31 | 106,127 / 103,715 | 86.8 % / 99.3 % |
| L | (2550, 2750) at 1,450 m, 650, 12°, 0° | `d-L-on-L-030s.png` | `d-L-off-L-030s.png` | 1848 / 1848 | 54 / 49 | 115,410 / 112,998 | 98.1 % / 98.3 % |
| S | (2500, 2000) on the seabed, 6,500, 55°, 0° | `d-S-on-S-030s.png` | `d-S-off-S-030s.png` | 1800 / 1800 | 56 / 51 | 123,375 / 120,963 | 99.1 % / 99.2 % |

The opening camera at 1920 × 1080 is the pose increment C recorded at 1440 × 900. The study
is five calls and 2,412 triangles at every station, as in increment C, with the landmark
intact and the sift's 256 motes. Only C sits inside the 85–90 % darkness budget; at H, L and
S the baseline is over it before the study adds anything, as increment C found.

The C pair was read at the same tick, 1800, the L pair at 1848 and the S pair at 1800. C's
lamp glass reads 88.4, 83.9 and 84.8 (lamps 0, 2 and 3; lamp 1 is off screen), increment C's
values at 1440 × 900. C's brightest pixel in both halves is an escort's green navigation
mark, luma 215.6 and RGB (153, 244, 118) at (1601, 958) on and (1602, 958) off. So the escort
reads the same between the pair.

## The colour-vision palettes

H and C with the study on, each its own session at T+00:30, seeded through `SETTINGS_JSON`
with the record version the store reads. Each JSON's `settings` field is the record the page
held. The palette is in the frames: the threat marks draw red-orange in deuteranopia, orange
in protanopia and red with white bars in tritanopia, against the standard red.

| Palette | H | C |
| --- | --- | --- |
| Deuteranopia | `d-H-deuteranopia-H-030s.png` | `d-C-deuteranopia-C-030s.png` |
| Protanopia | `d-H-protanopia-H-030s.png` | `d-C-protanopia-C-030s.png` |
| Tritanopia | `d-H-tritanopia-H-030s.png` | `d-C-tritanopia-C-030s.png` |

The arch and the sift are the same in all three: calls 56 at H and 36 at C, the landmark
2,412 triangles. C's near-black is 86.8–86.9 %. At C the lamp glass reads 88.4, 83.9 and
84.8 in every palette, except that lamp 3 read 68.0 in the tritanopia session's frame. At H
the 28 px lamp windows read between 31.9 and 84.9 across the four sessions with no pattern by
palette. Each session's reading is its own frame, between ticks 1824 and 1848, and at H's
dolly a window holds stone and water as well as glass.

## The transit pair

Two sessions, the study on and off, each taken at H's pose re-applied at T+10:35 and T+10:55,
either side of the 10:40 ground change. Every frame's HUD clock reads its time, and the
readings are within 0.4 s of it. The pose held: the actual focus read (2550, 2553) on the
seabed, dolly 2,600, 55° and 0° in all four readings. So the ground change drove no focus
clamp at this pose.

| Time | On | Off | Reading tick on / off | Landmark on | Lamps standing on | Calls on / off | Props on / off |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T+10:35 | `d-T-on-H-635s.png` | `d-T-off-H-635s.png` | 38124 / 38112 | intact, 2,412 triangles | 4 | 56 / 51 | 186 / 186 |
| T+10:55 | `d-T-on-H-655s.png` | `d-T-off-H-655s.png` | 39324 / 39324 | ruined, 732 triangles | 0 | 45 / 41 | 198 / 198 |

At 10:35 the intact arch stands over the flight with its four lamps. At 10:55 the span is gone
into the new wall, the ruined state stands no lamp, and the sift's 256 motes carry on; the
cloud has settled (0 motes). The props read 186 at 49,244 triangles in both halves before the
change and 198 at 50,356 after it, the collapse's count increment A recorded.

## Not taken here: the GPU run

GPU time at C with the pools on and off, DPR 1.5, the 240-frame performance stations and
the clips: SwiftShader's milliseconds measure the rasteriser, and its frames take about
1.8 s at C, so a clip would be a slideshow. They need the named desktop GPU
([issue-1001](../issue-1001/README.md)), and [`gpu.mjs`](gpu.mjs) is the run for it, driven
headed by `.claude/skills/run-game/scripts/drive.mjs` on that machine. Its header gives the
commands. One session per half and per pixel ratio holds H, C, L and S for 240 frames of
both painters and 240 GPU frames, reads each unqueued and behind the queue load, and reads C
again with the pools off through the study's switch, writing `<TAG>.json` beside the frames
with the renderer string: a software one is flagged there and in the console, and its
milliseconds are not evidence. The clips are the drive's own recording (`RECORD_VIDEO`),
a WebM of the whole session, cut by the HUD clock to the holds the JSON records: C with no
input for 12 s, C with one escort's short move and Stop, and H's pose from 10:38 to 10:56
with the ticks the ruin arrived and the sequence began. `REDUCED_MOTION=1` repeats each.

The module was run once here under SwiftShader to prove its mechanics, not its numbers: the
stations read `gpuTimer: software` with no queued reading, and the run took eighteen minutes
of mission time, so H and C read the intact arch and the three stations after them the ruin
past 10:40, which the module warns of on a software run and fails on a GPU one; the C-move
clip selected an escort and ordered it; each recording landed with its JSON. None of those
frames is filed.
