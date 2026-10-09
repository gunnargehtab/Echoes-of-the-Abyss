# Issue 1246 — what a metre below the lead hull costs

Headless Chromium (SwiftShader), 1440×900, through `run-game`'s `drive.mjs`, on the Ventfront
Divide with the Consortium's opening force. The Light Scout is lifted from 600 m to 450 m,
clear of the base's 700 m plateau, since a mark within 100 m of the seabed follows the floor
([ui-ux.md](../../ui-ux.md) §9). The camera's focus then sits a metre below it, and `Alt` is
held over open water ([ui-ux.md](../../ui-ux.md) §8).

| Frame | Shows |
| --- | --- |
| [ribbons](ribbons.png) | Crops of the ribbon and its readout from the `level`, `breaks-silence` and `dive` frames, side by side. A metre down with the scout open: `LEVEL`, in the accent. The same metre with the scout silent: `DIVE · BREAKS SILENCE`, in the accent, since no descent is charged. Eleven metres down: `DIVE 72 SIG`, in the descent's colour, and the target bar with it |
| [breaks-silence](breaks-silence.png) | The whole 1440×900 frame behind the second crop: the scout selected, its card reading `SILENT RUNNING · 450m` at SIG 4 |

```bash
node .claude/skills/run-game/scripts/drive.mjs --out <dir> \
  --steps docs/screenshots/issue-1246/drive.mjs
```

[readings.json](readings.json) holds the drive's own record: the scout at 450 m for all three,
and the focus at 451 m, 451 m and 461 m.
