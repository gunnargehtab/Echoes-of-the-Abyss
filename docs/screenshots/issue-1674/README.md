# #1674 — the arch study's §9 evidence, retaken

The four [sorrowgate-arch-study.md](../../sorrowgate-arch-study.md) §9 clauses that
[#1637's increment C](../issue-1637/README.md#increment-c--the-9-pairs-and-readings-this-container-can-take-c-)
did not meet: the colour-vision palettes, the stations at §9's viewport and times, and the
transit pair, taken in a container; and GPU time with the motion clips, taken on the named
desktop GPU ([The GPU run](#the-gpu-run)).

Every container frame is the real client at `6021dd06` through Tutorial → briefing → Descend: one fresh
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

## The GPU run

[`gpu.mjs`](gpu.mjs), driven headed by `.claude/skills/run-game/scripts/drive.mjs --channel
msedge` on the named desktop: a GTX 1070 through `ANGLE (NVIDIA, NVIDIA GeForce GTX 1070
(0x00001B81) Direct3D11 vs_5_0 ps_5_0, D3D11)` and the i7-6700K of
[gate 6's first reading](../../graphics-standards.md#6-performance-one-world-scene-on-measured-budgets),
on a 1920 × 1080, 60 Hz display, with the dev servers on the same machine. The client is
`710ba338`, after #1683's refinement, so the intact arch is 2,626 triangles here where the
container frames above have 2,412. The ruin is 732 in both.

### Stations

One session per half and per pixel ratio, two runs of each: eight sessions, 1920 × 1080,
unpaced (`UNPACED=1`). Each station holds 240 frames of both painters and 240 GPU frames
unqueued, then 240 behind the queue load. All eight read `gpuTimer: timing`, no dropped GPU
frame and the intact arch with its 256 motes. The JSONs are `gpu-<half>-dpr<ratio>-r<run>.json`;
run 1's frames at ratio 1 are `gpu-<half>-dpr1-<station>.png`.

Two things in the module changed to get readings that repeat:

- **C is read behind a 12 ms load, the rest behind 3.6 ms.** The overlay spends about 7 ms
  a frame at C, in both halves, so C's frames ship every 10 ms. Behind the default load
  the GPU idled for most of each one, and C read 2.0–3.6 ms queued, with the pools off
  above the pools on in three runs of four. Behind 40,000 steps (`QUEUE_STEPS_C`) it reads
  within 0.03 ms of itself. The module now asserts every load outlasts the frame interval.
- **C is read last.** C's heavier load and its pools-off station run in the on half only.
  Taken second, they put that half's L and S one to two minutes of mission time behind
  the off half's, at another scene: L read 65 calls on against 49 off.

Queued `avgGpuMs`, in ms. On − off is the mean of the two runs on less the mean of the two
off. C-pools-off is set against C off. The clock is the mission time of run 1's reading.

| Station | Clock on / off | Queued on, r1 / r2 | Queued off, r1 / r2 | On − off | Unqueued on / off (r1) | Worst queued on / off (r1) |
| --- | --- | --- | --- | --- | --- | --- |
| **Ratio 1** | | | | | | |
| H | 0:52 / 0:54 | 0.77 / 0.72 | 0.68 / 0.69 | +0.06 | 0.84 / 0.83 | 1.26 / 1.17 |
| L | 1:33 / 1:37 | 1.14 / 1.09 | 1.01 / 1.03 | +0.09 | 1.68 / 1.20 | 1.61 / 1.60 |
| S | 2:12 / 2:18 | 0.73 / 0.74 | 0.70 / 0.72 | +0.03 | 0.86 / 0.89 | 1.25 / 1.29 |
| C | 3:39 / 3:41 | 1.06 / 1.03 | 0.66 / 0.66 | +0.38 | 2.27 / 1.71 | 2.26 / 1.90 |
| C-pools-off | 4:54 / 3:41 | 1.04 / 1.03 | 0.66 / 0.66 | +0.38 | 1.92 / 1.71 | 1.85 / 1.90 |
| **Ratio 1.5** | | | | | | |
| H | 1:00 / 1:00 | 1.50 / 1.51 | 1.40 / 1.39 | +0.11 | 1.65 / 1.54 | 2.13 / 2.00 |
| L | 2:01 / 2:05 | 2.33 / 2.34 | 2.19 / 2.15 | +0.17 | 2.51 / 2.39 | 2.96 / 2.94 |
| S | 2:47 / 2:52 | 1.41 / 1.40 | 1.34 / 1.37 | +0.05 | 1.59 / 1.55 | 2.39 / 2.38 |
| C | 4:23 / 4:11 | 2.19 / 2.20 | 1.29 / 1.29 | +0.91 | 3.30 / 2.57 | 6.28 / 2.21 |
| C-pools-off | 5:59 / 4:11 | 2.04 / 2.01 | 1.29 / 1.29 | +0.73 | 2.95 / 2.57 | 3.55 / 2.21 |

The study costs the GPU 0.03–0.09 ms at H, L and S at ratio 1, and 0.05–0.17 ms at 1.5. At
C, where the arch fills the frame, it costs 0.38 ms at ratio 1 and 0.91 ms at 1.5. The lamp
pools are 0.01 ms of that at ratio 1 and 0.17 ms at 1.5. Run 1's 6.28 ms worst at C, ratio
1.5, is one frame; run 2's worst there is 3.06 ms.

Counts and CPU, ratio 1, run 1, in ms (average / worst):

| Station | Half | Calls | Triangles | Frame | Conn | Overlay |
| --- | --- | --- | --- | --- | --- | --- |
| H | on / off | 56 / 51 | 123,589 / 120,963 | 2.61 / 6.00 · 2.52 / 5.80 | 0.82 / 1.10 · 0.72 / 1.10 | 0.55 / 0.80 · 0.55 / 0.80 |
| L | on / off | 54 / 49 | 115,624 / 112,998 | 2.88 / 5.60 · 2.49 / 5.40 | 0.99 / 1.40 · 0.76 / 1.20 | 0.64 / 1.20 · 0.60 / 1.40 |
| S | on / off | 56 / 51 | 123,589 / 120,963 | 2.56 / 5.30 · 2.60 / 8.70 | 0.82 / 1.20 · 0.76 / 2.80 | 0.54 / 1.60 · 0.60 / 6.00 |
| C | on / off | 36 / 31 | 106,341 / 103,715 | 9.56 / 12.50 · 9.66 / 16.90 | 0.73 / 1.40 · 0.63 / 0.90 | 6.90 / 10.10 · 7.13 / 14.20 |
| C-pools-off | on | 36 | 106,341 | 9.55 / 14.20 | 0.73 / 1.20 | 6.92 / 10.50 |

The study is five calls and 2,626 triangles at every station, both ratios. Its CPU cost is
the conn view's, 0.06–0.23 ms; the overlay reads the same in both halves. Every station
draws `canvas`, `split-copy` and `split`, and L also the lamp halo's `depth-copy`,
`halo-source`, `halo-spread` and `halo-composite`. Textures read 18 at H and 24 elsewhere,
and the render targets (halo, split and environment) 42.4 MiB at ratio 1 and 94.9 MiB at
1.5, in both halves. At ratio 1.5 the counts are the same, except C-pools-off, which read
at 5:59 with another hull in view: 112,101 triangles.

At C the overlay spends 7 ms of a 10 ms frame with the study on or off; at H, L and S it
spends 0.6 ms. That is not the study's cost and is filed as #1692.

### Clips

Paced, one session per clip, the study on, ratio 1, recorded full screen. The page runs in
Edge set full screen through the DevTools protocol, and the screen is recorded with
ffmpeg 7.1.1's `ddagrab` at 60 fps into lossless NVENC H.264, then cut to the hold with a
re-encode (libx264, CRF 16, 60 fps). Playwright's own screencast is off: at C it put the
overlay at 11.7–14.5 ms a frame and the frame interval at 17.6–21.6 ms, against 7.3 and
16.7 without it, so each hold is timed against the recorder's start instead
(`SCREEN_START_MS`, each mark's `screenS`). Every cut's first and last frame read the
HUD clock its ticks give. The recorder keeps 93–97 % of a C hold's frames, 97 % of the
reload's and 99.7 % of a change hold's; the cut repeats the frame before for each one
missed. The page held 16.7 ms a frame through every hold but the C move, so those gaps are
the recorder's, not the scene's.

| Clip | File | Ticks | What it shows | Page frame / overlay ms |
| --- | --- | --- | --- | --- |
| C, no input | `clip-C-still.mp4` | 1092–1812 | The sift, the sway and the lamps | 16.67 / 7.37 |
| C, no input, reduced motion | `clip-C-still-reduced.mp4` | 1104–1824 | All three hold | 16.67 / 0.91 |
| C, one escort's move and Stop | `clip-C-move.mp4` | 1092–1836 | Four seconds held, the order at 1380, Stop at 1392, the settled view | 24.46 / 19.38 |
| The same, reduced motion | `clip-C-move-reduced.mp4` | 1080–1836 | Order at 1368, Stop at 1380 | 16.74 / 2.22 |
| H, 10:38 to 10:56 | `clip-H-change.mp4` | 38280–39360 | The change, the debris falling, the settled ruin | 16.67 / 0.76 |
| The same, reduced motion | `clip-H-change-reduced.mp4` | 38280–39360 | A cut to the ruin, no debris | 16.67 / 0.64 |
| H, reload after 10:40 | `clip-H-reload.mp4` | 38640–39336 | The ruin standing from the first frame | 16.66 / 0.76 |

Each clip's JSON beside it holds its ticks, offsets and the probe at its end.

- **The move.** A Light Scout under the arch, ordered about 200 m east; Stop landed with
  the hull 4 m under way, and it settled 12 m from where it started (16 m with reduced
  motion), with no drift from two to four seconds after Stop and no change of depth (1,450
  m throughout). The flight reading and the hull's depth strip are on screen; nothing
  dives or unlocks. No wake reads at C's dolly once the hull is settled.
- **The change.** The ruin arrived at tick 38388, 10:39.8, and the sequence began on the
  same tick. With reduced motion the ruin arrived on the same tick and no sequence ran.
  The debris reads in the cut; the cloud's motes do not at H's dolly, and the module
  counts them only at the hold's end, when the cloud has settled (0 motes).
- **The reload.** At tick 38640, 10:44, the page reloaded and Resume redeemed the tab's
  seat. Every frame from the first that drew a landmark, tick 38844, drew the ruin: 481
  frames, none intact, none collapsing, no cloud. For the 2.1 s before that frame, the
  view is empty water under a HUD reading T+00:00 with the skirmish economy and build
  tabs; that is not the arch's, and is filed as #1693.
- **The move clip's frame rate.** With the escort selected and the sway on, the overlay
  spends 19.4 ms a frame and the page ships 41 frames a second. With reduced motion it is
  2.2 ms. That is #1692 too.

§9 also asks for sonar and construction refusal shown separately; #1674 does not list them,
and they are not here.
