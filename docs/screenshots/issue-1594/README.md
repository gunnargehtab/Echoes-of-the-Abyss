# The way north: a tender's ears, the lock named, the flight at the freight's pace

Evidence for [#1594](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1594): the
prologue in real time, at 1,440 × 900 in system Chrome on the GPU, driven by `frames.mjs`:

```bash
node .claude/skills/run-game/scripts/drive.mjs --headed --channel chrome \
  --url "http://localhost:5173/?mission=prologue-sorrowgate" \
  --out <dir> --steps docs/screenshots/issue-1594/frames.mjs
```

The drive plays the tender gloss as a newcomer would. It waits for Tender One to load with
the flight still under the arch, then brings the flight to the tender. Then it boxes tender
and flight together and sends them to the Concourse with one right click on the plateau.
It gives no waypoint through the lock, and no separate climb.

| Frame | Clock | What it shows |
| --- | --- | --- |
| `ears-asking.png` | T+11:24 | Tender One loaded, the flight 500 m off: its 400 m ring in the magenta that asks, and *The service lock* ringed and named north of it |
| `ears-answered.png` | T+11:37 | The flight arrived: the same ring in cyan |
| `the-way-north.png` | T+12:03 | Twenty seconds after the one right click, tender and flight in the lock together, the ring cyan the whole way |
| `concourse.png` | T+14:17 | Tender One met, `1 of 1`, on the Concourse; Tender Two's row open |

Hulls route round ground on their own (`pathfinding.ts`, #431), and a click on the plateau's
floor carries its depth (#1132), so the one click found the lock and made the climb. Without
the pace, the probe that found #1594's trap stopped the tender 150 m from its seat, held, for
the rest of the run (`missionHold.test.ts`, *leaves the tender behind when the two are sent
apart*).

In `the-way-north.png` the flight's rings sit over the lock's name. The name stands over the
ring's highest point on screen, and the freight is in the lock.

## The panel

At T+13:45, with both tender rows in, `.objectives-body` overflows by 171 px with the new
glosses. It also overflows by 171 px with #1585's two glosses swapped back into the page.
The new glosses cost the panel no line. The overflow is the panel's own, from 13:40 (#1593).
