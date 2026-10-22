# #1540 — gate 6 on the Sorrowgate pilot after #1538

[#1538](https://github.com/gunnargehtab/Echoes-of-the-Abyss/pull/1538) raised the
prologue's props from 74 to 186 and took its frames on a software rasteriser. This is the
GPU reading [#1540](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1540) asked
for, against [graphics-standards.md](../../graphics-standards.md) gate 6: at most 150 calls
and 400 k triangles.

**Where and how.** The GTX 1070 of [#1463](../issue-1463/README.md), system Chrome headed at
1440×900, unpaced, `main` at `3fdb6015`. One drive per ratio of
[#1463's `world.mjs`](../issue-1463/world.mjs), unchanged and unstaged, under the same
uncommitted copy of `drive.mjs` its header describes. Each drive exits 1 for the reconnect
attempts it stages offline, and for nothing else. `readings-1.json` and `readings-1.5.json`
are every reading the two drives took; `table.py` sets them beside #1463's.

```bash
python -I docs/screenshots/issue-1540/table.py
```

## Verdict

**Gate 6 holds.** The most any frame drew, held view or transition, was 58 calls and
149,103 triangles: the second and third entries' ramp-in at ratio 1.5. #1463 read 40 calls
and 108,129 triangles. Every held view drew the same at both ratios, within one call.

The reading is everything merged since #1463's `2535d6ee`, not #1538 alone: #1467's effects
and #1536's display-space veil are among the 33 merges in between. The session draws 186 props, 198
after the arch falls, where #1463 drew 74 and 75.

## Held views

Calls, triangles and queued GPU ms (12,000 steps of load), ratio 1 and 1.5. The arrow is
#1463 → now.

| Station | Calls | Triangles | Queued ms, 1 | Queued ms, 1.5 |
| --- | ---: | ---: | ---: | ---: |
| Board | 16 → 18 | 93,025 → 123,407 | 0.20 → 0.23 | 0.41 → 0.43 |
| Arrival | 32 → 49 | 80,049 → 120,963 | 0.42 → 0.52 | 0.82 → 0.92 |
| Escorts moving | 32 → 50 | 80,049 → 120,963 | 0.43 → 0.55 | 0.83 → 0.93 |
| Close | 40 → 57–58 | 80,076 → 120,990 | 0.66 → 0.83 | 1.38 → 1.49 |
| Low | 33 → 50 | 80,049 → 120,963 | 0.43 → 0.59 | 0.74 → 0.83 |
| Survey | 32 → 49 | 80,049 → 120,963 | 0.37 → 0.47 | 0.66 → 0.72 |
| Corner, south-east | 32 → 49 | 80,049 → 120,963 | 0.46 → 0.57 | 0.86 → 0.92 |
| Corner, north-west | 32 → 50 | 80,049 → 120,963 | 0.42 → 0.52 | 0.75 → 0.82 |
| Collapse | 33 → 39 | 79,541 → 114,139 | 0.51 → 0.59 | 0.89 → 0.99 |
| Reconnected | 33 → 40–41 | 79,541 → 114,139 | 0.45 → 0.58 | 0.89 → 0.99 |
| Board, returned | 18 → 21 | 93,165 → 123,687 | 0.30 → 0.30 | 0.58 → 0.56 |

Queued GPU time rose 0.06–0.17 ms a held view in the session and stayed under 1.5 ms.

## Transitions

Most calls and triangles any frame drew, ratio 1 / 1.5. No frame held more than one detail
region or had more than one request in flight, against §7.5's two and two.

| Transition | Calls | Triangles |
| --- | ---: | ---: |
| Entry, first | 49 / 50 | 124,239 / 149,043 |
| Return, first | 41 / 40 | 125,367 |
| Entry, second and third | 52 | 149,103 |
| Return, second and third | 51 | 124,255 |

## Frames

Ratio 1, HUD on. The pilot at arrival, and after the arch falls:

| Arrival | Collapse |
| --- | --- |
| [arrival](arrival.png) | [collapse](collapse.png) |

## Related

- [#1463's acceptance](../issue-1463/README.md), the readings these sit beside
- [world-map.md](../../world-map.md) §7, the pilot
- [graphics-standards.md](../../graphics-standards.md), gate 6
