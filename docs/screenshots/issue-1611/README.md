# The arch, named and counted down

Evidence for [#1611](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1611): the
prologue in real time, at 1,440 × 900 in system Chrome on the GPU, driven by `frames.mjs`:

```bash
node .claude/skills/run-game/scripts/drive.mjs --headed --channel chrome   --url "http://localhost:5173/?mission=prologue-sorrowgate"   --out <dir> --steps docs/screenshots/issue-1611/frames.mjs
```

| Frame | Clock | What it shows |
| --- | --- | --- |
| `arch.png` | T+00:50 | The arch's ring round the four escorts, named; the station row reads `OPEN` over `09:51` |
| `arch-row-pressed.png` | T+00:53 | The station row pressed: the camera on the arch, at 2,550, 2,125 |
| `arch-fallen.png` | T+10:45 | The station met: no countdown, and the arch's ring and name gone with the span |
| `concourse.png` | T+11:30 | Tender One's row pressed: the Concourse ringed and named on the plateau |

The countdown and the strip clock add to one second over 10:40 in `arch.png`. The hold is
stamped on the first pass that derives it, and the countdown rounds up while the clock
rounds down.

In `concourse.png` the withheld list runs under the panel's foot. #1585's `tender-one.png`
on `main` at T+11:27 cuts it at the same line (#1593). The scrollbar shows only because the
drive had just pressed a row in the panel.

The Concourse's ring reaches north past the map's edge. The prologue is a placed mission,
so its exterior is ground, and a ground mark keeps drawing there
([map-visuals.md](../../map-visuals.md) §5, #1556).

## The fit check

The countdown sits under the status word and costs no line (`ui-ux.md` §10.5). Two scripts
read `.objectives-body` with it shown and hidden, so an overflow can be blamed or cleared.
`panelFit.mjs` reads once: at the first countdown row, or with `FIT_LEFT_S` once it reads
that many seconds or fewer. `panelSweep.mjs` samples every second for `SWEEP_S` seconds,
presses the commander's act at `SWEEP_BELL_S`, and keeps the worst reading for each state
it saw:

```bash
node .claude/skills/run-game/scripts/drive.mjs --headed --channel chrome   --url "http://localhost:5173/?mission=<id>"   --out <dir> --steps docs/screenshots/issue-1611/panelSweep.mjs
```

A silence debt and a stalled walk are staged: `stage-patch.py` patches the server for the
drive and restores it, and its header says how. Only Sorrowgate keeps a silence ledger among
the five, only Convocation has a walk and a bell, and Item Nine, Tend and Conclave Chord
reveal no state of either kind.

| Mission, state | Countdown | Overflow, shown / hidden | Height, shown / hidden |
| --- | --- | --- | --- |
| `prologue-sorrowgate`, silence owed (`sorrowgate-debt.png`) | 10:16 | 0 / 0 px | 309 / 309 px |
| `seeding-convocation`, walk stalled (`convocation-stall.png`) | 18:26 | 0 / 0 px | 308 / 308 px |
| `seeding-convocation`, stalled, bell ringing | 17:55 | 0 / 0 px | 298 / 298 px |
| `ledger-item-nine` | 12:11 | 0 / 0 px | 233 / 233 px |
| `chord-conclave`, at 13:43 (`chord-full.png`, `FIT_LEFT_S=50`) | 00:47 | 170 / 170 px | 313 / 313 px |
| `seeding-tend`, at 15:03 (`tend-turning.png`) | 00:48 | 80 / 80 px | 313 / 313 px |

Every panel measures the same with the countdown as without it. In its first place, the
counter's column, it narrowed the reading and cost a line: Sorrowgate with a debt overflowed
by 10 px and Convocation stalled by 11, against 0 without it, and Conclave Chord's overflow
grew from 170 px to 186 (#1622). Tend's 80 px at its cap (#1619) and Conclave Chord's 170
from 13:30 (#1621) are the panels' own, and the countdown adds nothing to either.
