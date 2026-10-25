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
