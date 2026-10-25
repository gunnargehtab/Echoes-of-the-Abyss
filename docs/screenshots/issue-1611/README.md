# The arch, named and counted down

Evidence for [#1611](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1611): the
prologue in real time, at 1,440 × 900 in system Chrome on the GPU, driven by `frames.mjs`:

```bash
node .claude/skills/run-game/scripts/drive.mjs --headed --channel chrome   --url "http://localhost:5173/?mission=prologue-sorrowgate"   --out <dir> --steps docs/screenshots/issue-1611/frames.mjs
```

| Frame | Clock | What it shows |
| --- | --- | --- |
| `arch.png` | T+00:48 | The arch's ring round the four escorts, named; the station row reads `09:53 left` |
| `arch-row-pressed.png` | T+00:51 | The station row pressed: the camera on the arch, at 2,550, 2,125 |
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

`panelFit.mjs` waits for the first countdown row, then reads `.objectives-body` with the
countdown shown and hidden, so an overflow can be blamed or cleared:

```bash
node .claude/skills/run-game/scripts/drive.mjs --headed --channel chrome   --url "http://localhost:5173/?mission=<id>"   --out <dir> --steps docs/screenshots/issue-1611/panelFit.mjs
```

| Mission | Countdown from | Overflow, shown | Overflow, hidden | Height, shown / hidden |
| --- | --- | --- | --- | --- |
| `prologue-sorrowgate` | 00:00 | 0 px | 0 px | 294 / 280 px |
| `ledger-item-nine` | 00:00 | 0 px | 0 px | 249 / 233 px |
| `seeding-convocation` | 00:00 | 0 px | 0 px | 308 / 292 px |
| `chord-conclave` | 00:00 | 0 px | 0 px | 223 / 207 px |
| `seeding-tend` | 15:00 | 80 px | 80 px | 313 / 313 px |

Where the panel has room, the countdown costs one line of 14–16 px and the panel still fits.
Tend's panel is already at its cap at 15:00 and overflows by the same 80 px either way
(`tend-turning.png`, #1619): the countdown is not what pushes it.
