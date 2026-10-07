# Issue 1171 — The Upper Workings without the Downworks' dip

Headed Edge, 1920×1080, through `run-game`'s `drive.mjs`, on `?mission=ledger-shift-change`
with the HUD hidden. The client and server are `main` at `415ca2e8`. The "after" frames swap
this branch's `ninefoldWorkings.ts` into the running server and change nothing else, since the map is
server data.

| Frame | Camera | Shows |
| --- | --- | --- |
| [survey-before](survey-before.png) | Map centre, 88°, dolly 6,400 m | The Downworks as #1164 drew it, dipping south between the faces |
| [survey-after](survey-after.png) | Same | The dip taken back out: the Downworks' south edge straight at y 2,000 |
| [oblique-before](oblique-before.png) | Map centre, 50°, dolly 4,400 m | The dip in perspective |
| [oblique-after](oblique-after.png) | Same | The straight south edge in perspective |

```bash
SHOOT_MAP=4000,3000 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --headed --channel msedge --url 'http://localhost:5173/?mission=ledger-shift-change' \
  --out <dir> --steps docs/screenshots/issue-1171/shoot.mjs
```

The edges still step at 250 m, because the simulation keeps its grid
([maps.md](../../maps.md#how-a-map-is-written)).
