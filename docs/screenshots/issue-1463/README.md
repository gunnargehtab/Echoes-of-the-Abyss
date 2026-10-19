# #1463 — the continuous-world pilot, accepted

The Sorrowgate pilot of [#1449](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1449),
driven whole in the real client and measured against
[world-map.md](../../world-map.md) §7.7 and
[graphics-standards.md](../../graphics-standards.md) gate 6. The other maps' inventory is
[world-map.md](../../world-map.md) §7.9.

**Where and how.** A GTX 1070 through ANGLE and Direct3D 11, an i7-6700K, system Chrome
driven headed at 1440×900, unpaced, with the dev server on the same machine. The branch
was `claude/issue-1463-pilot-acceptance`, whose client is `main` at `2535d6ee`. Each
ratio is one unstaged drive: nothing in the mission was shortened or seeded, so the arch
falls at 10:40 of the match, as it does for a player.

- [`world.mjs`](world.mjs) is the drive, and its header has the command. It runs under a
  copy of the run-game `drive.mjs` without its title, Solo and lobby steps, since a board
  launch starts at the title. The driver reports each run as failed, because it fails any
  run with console errors: the only ones are the four reconnect attempts made while the
  page was offline, which the drive stages on purpose.
- `readings-1.json` and `readings-1.5.json` are every reading the two drives took, at
  ratio 1 and 1.5, both from the committed `world.mjs`.
- `pairs/` holds the four cameras of `tools/render-stack/capture.mjs` on this branch and on
  the baseline, `main` at `44cd23c6` before the first world code (#1465), for the pilot and
  both non-target controls.

## What the drive exercised

Every frame below is ratio 1, with the HUD on, and is a link.

| §7 asks | Frame | What it shows |
| --- | --- | --- |
| The board over the world (§7.6 step 1) | [board](world-board.png), [glass hidden](world-board-world.png) | The atlas behind the board, at the board's fixed frame |
| Travel (step 2) | [mid-travel](world-travel-mid.png) | The camera on its way down; the bar names the destination beside Skip and Cancel |
| Join, on the frame the travel ended (step 3) | [arrival](world-arrival.png) | The session opens on the spawn at 2,600 m; fade at full strength |
| Escort movement | [escorts moving](world-escorts-moving.png) | The player's six hulls box-selected and ordered north; the HUD logs the escorts going loud |
| Locked actions | [ping](world-locked-ping.png), [noisemaker](world-locked-noisemaker.png) | The hint bar says why each key did nothing |
| Close, low and survey views | [close](world-close.png), [low](world-low.png), [survey](world-survey.png) | The interior unchanged by the fade; the exterior dark |
| No order outside (§7.4 rule 3) | [refused](world-refused-outside.png) | A right click about 5 km west of the map's middle, 3 km past its edge: no route, and every hull within 4 m of where it was 3 s later |
| The focus clamped at the corners (rule 1) | [south-east](world-corner-se.png), [north-west](world-corner-nw.png) | Asked for 4 km past each corner, the focus held on it, (5,000, 4,000) and (0, 0), while the eye orbits outside |
| The collapse at 10:40, the service lock | [collapse](world-collapse.png) | The court after the fall. The drawn seabed reads below |
| A lost signal after the fall (§7.6) | [signal lost](world-signal-lost.png), [reconnected](world-reconnected.png) | The world kept under the overlay; the room re-sends the fallen ground |
| Return to port (step 4) | [board after](world-board-returned.png) | Back on the board's frame, the region's baseline drawn again |

**The arch, as a number.** The court sits at 1,500 m and its frames are near-black, so the
drive reads the drawn seabed across the arch's span and in the service lock. Both ratios
read the same, to the metre.

| When | Span, four points west to east | Service lock |
| --- | --- | --- |
| Standing, at the join | 1,577 · 1,649 · 1,575 · 1,601 m | 1,510 m |
| Fallen, at about 11:00 | 197 · 181 · 200 · 220 m | 1,510 m |
| After the reconnect | 186 · 198 · 206 · 171 m | 1,513 m |

The fall also shows in the counts: 80,049 triangles and 74 props before it, 79,541 and 75
after. The reconnected session draws the same 79,541, so the ground came back fallen from
the room rather than standing from the atlas. Its relief is not quite the same, though.
The ground's noise is seeded from the floors it was built from, so the fall, applied in
place, keeps the join's seed, while the reconnect's ground is the fallen map whole and
seeds anew: every cell's relief moves, up to 49 m here, and the lock 3 m though the fall
never touched it. That predates the world and is filed as
[#1496](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1496).

## Gate 6, held views

Calls and triangles are the whole frame's, every pass summed. GPU time is the conn view's,
every pass summed, averaged over 3 s; *queued* is the same frame behind gate 6's fixed load
of 12,000 steps, 3.5–4.1 ms here. Both ratios drew the same calls and triangles.

| Station | Calls | Triangles | GPU ms, ratio 1 | Queued, 1 | GPU ms, 1.5 | Queued, 1.5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Board | 16 | 93,025 | 0.22 | 0.20 | 0.45 | 0.41 |
| Arrival | 32 | 80,049 | 0.51 | 0.42 | 0.91 | 0.82 |
| Escorts moving | 32 | 80,049 | 0.55 | 0.43 | 0.92 | 0.83 |
| Close | 40 | 80,076 | 0.79 | 0.66 | 1.51 | 1.38 |
| Low | 33 | 80,049 | 0.64 | 0.43 | 0.86 | 0.74 |
| Survey | 32 | 80,049 | 0.51 | 0.37 | 0.77 | 0.66 |
| Corner, south-east | 32 | 80,049 | 0.56 | 0.46 | 0.96 | 0.86 |
| Corner, north-west | 32 | 80,049 | 0.55 | 0.42 | 0.86 | 0.75 |
| Collapse | 33 | 79,541 | 0.75 | 0.51 | 0.98 | 0.89 |
| Reconnected | 33 | 79,541 | 0.57 | 0.45 | 1.01 | 0.89 |
| Board, returned | 18 | 93,165 | 0.31 | 0.30 | 0.65 | 0.58 |

The close station also drew the lamp halo's passes, which the other held views did not. The board draws the overview and the region's baseline with
its 74 props; a session draws its own ground and the same 74 props, and the overview not
at all, since at full fade nothing past *W* shows.

## Gate 6, transitions

Each frame's calls, triangles, textures, §7.5's held regions and requests in flight were
sampled in the page through the whole transition. An entry runs from Descend through the
travel, the join and the fade's 0.8 s ramp-in to a second at full strength. A return runs
from Abandon through the ramp-out and the travel back to the board's frame. GPU time is
over the transition's frames.

| Transition | Ratio | Most calls | Most triangles | GPU avg / worst ms | Worst frame ms |
| --- | --- | ---: | ---: | ---: | ---: |
| Entry, first | 1 | 37 | 108,129 | 0.52 / 242.8 | 2,644 |
| Return, first | 1 | 33 | 93,229 | 0.59 / 37.5 | 61 |
| Entry, second | 1 | 34 | 108,129 | 0.53 / 97.2 | 1,970 |
| Return, second | 1 | 33 | 93,733 | 0.80 / 73.6 | 25 |
| Entry, third | 1 | 34 | 108,129 | 0.50 / 116.3 | 1,809 |
| Return, third | 1 | 33 | 93,733 | 0.72 / 64.8 | 28 |
| Entry, first | 1.5 | 37 | 108,129 | 0.95 / 204.4 | 2,477 |
| Return, first | 1.5 | 33 | 93,229 | 0.81 / 0.96 | 177 |
| Entry, second | 1.5 | 34 | 108,129 | 0.92 / 108.2 | 2,010 |
| Return, second | 1.5 | 33 | 93,733 | 1.22 / 83.9 | 33 |
| Entry, third | 1.5 | 34 | 108,129 | 0.92 / 1.8 | 1,876 |
| Return, third | 1.5 | 33 | 93,733 | 1.23 / 87.5 | 24 |

The frame's peak is the ramp-in, where the overview and the session's ground are drawn
together: 37 calls and 108,129 triangles, against 150 and 400 k. No transition frame held
more than one detail region or had more than one request in flight, against §7.5's two
and two; a return's one request is the region's baseline, built while the fade ramps out.

**Where the long frames are.** The travel's motion was smooth in every entry. Its first
long frames came as the camera reached the home frame, when the match's code mounts: one
to three of 54–452 ms. The longest came after, on the held home frame once the room's
ground arrived: two of 1.7–2.4 s at every one of the six joins. A CPU profile of one join
names them. The first is `setTerrain` baking the session's seabed on the main thread,
3.4 s of profiled time, 2.8 s of it the surround's apron. The second is the first render
of the session's materials, where linking shader programs blocks for about 1.2 s. The
ramp-in then has a few frames of 94–291 ms. The first return of each drive opened on one
frame of 0.33 s and 0.43 s as the session was let go, and the one at ratio 1.5 had a
167 ms frame mid-travel too. The later returns had none over 58 ms. §7.6 holds the frame and takes no order then, so nothing is lost, but the page does
not answer for those seconds. It is filed as
[#1495](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1495).

## Repeated entry

Three entries and exits in each drive, the first played past the fall. What the page held
at rest, on the board after each exit and in each session; the transitions above give the
held regions and requests while the camera moved.

| | Textures | Canvases | Detail regions held | Requests in flight |
| --- | ---: | ---: | --- | ---: |
| The board, first | 5 | 1 | Sorrowgate | 0 |
| The first session | 14 at arrival, 20 from the next station on | 2 | none | 0 |
| The second and third sessions | 20 | 2 | none | 0 |
| The board, after each exit | 17 | 1 | Sorrowgate | 0 |

The same at both ratios. The counts return to the same values after every exit, and the
page holds the world's one canvas on the board and the HUD's beside it in a session. The
JS heap moved between 42 and 197 MB with no collection forced, so it is not a reading of
a leak either way.

## Paired frames and the controls

`tools/render-stack/capture.mjs`'s four cameras on the force, held 240 frames each, on
this branch and on the baseline, entered by link (`?mission=` or `?map=`). Calls and
triangles were the same at both ratios; GPU time is the queued reading.

| Scene | Camera | Baseline calls / triangles | Branch calls / triangles | Queued ms, 1: before → after | Queued ms, 1.5: before → after |
| --- | --- | ---: | ---: | ---: | ---: |
| Pilot | Home | 32 / 44,785 | 32 / 80,049 | 0.34 → 0.45 | 0.66 → 0.86 |
| Pilot | Close | 40 / 44,812 | 40 / 80,076 | 0.66 → 0.64 | 1.38 → 1.38 |
| Pilot | Low | 33 / 44,785 | 33 / 80,049 | 0.35 → 0.39 | 0.65 → 0.73 |
| Pilot | Survey | 32 / 44,785 | 32 / 80,049 | 0.24 → 0.35 | 0.43 → 0.66 |
| Ventfront | Home · close · low · survey | 59 · 56 · 57 · 61 calls, 151,684–152,800 triangles | The same | 0.65–0.84, within 0.01 | 1.25–1.69, within 0.02 |
| Radicals | Home · close · low · survey | 54 · 49 · 55 · 54 calls, 60,792–61,360 triangles | The same | 0.51–0.67, within 0.01 | 1.02–1.41, within 0.03 |

**The pilot.** The interior reads as it did, camera for camera; the exterior is the
world's surround, dark at full fade under the veil where the baseline drew the skirt. The
world costs the pilot no draw call and 35,264 triangles, the surround's ground, and
at most 0.23 ms of queued GPU time.

- Home: [before](pairs/baseline-prologue-home.png), [after](pairs/branch-prologue-home.png)
- Close: [before](pairs/baseline-prologue-close.png), [after](pairs/branch-prologue-close.png)
- Low: [before](pairs/baseline-prologue-low.png), [after](pairs/branch-prologue-low.png)
- Survey: [before](pairs/baseline-prologue-survey.png), [after](pairs/branch-prologue-survey.png)

**The controls render as before** (§7.7). Ventfront and Radicals draw the same calls and
triangles at every camera, and their frames compare by eye; Radicals, on Sorrowgate's own
map, keeps its rim and skirt and draws no surround.

- Ventfront: [home before](pairs/baseline-ventfront-home.png), [after](pairs/branch-ventfront-home.png); [survey before](pairs/baseline-ventfront-survey.png), [after](pairs/branch-ventfront-survey.png)
- Radicals: [home before](pairs/baseline-radicals-home.png), [after](pairs/branch-radicals-home.png); [survey before](pairs/baseline-radicals-survey.png), [after](pairs/branch-radicals-survey.png)

Every capture's probe is beside its frames as `pairs/<revision>-<scene>-<ratio>.json`.
