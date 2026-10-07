# Issue 1147 — Board Country drawn in shapes

Headed Edge, 1920×1080, through `run-game`'s `drive.mjs`, on `?mission=ledger-item-nine`
with the HUD hidden. The client and server are `main` at `415ca2e8`. The "after" frames swap
this branch's `holdingBoard.ts` into the running server and change nothing else, since the map is
server data.

| Frame | Camera | Shows |
| --- | --- | --- |
| [survey-before](survey-before.png) | Map centre, 88°, dolly 4,800 m | The Underway as a box |
| [survey-after](survey-after.png) | Same | The Underway as a long hall, round at both ends |
| [oblique-before](oblique-before.png) | Map centre, 50°, dolly 3,300 m | The box in perspective |
| [oblique-after](oblique-after.png) | Same | The hall in perspective |

```bash
SHOOT_MAP=3000,2500 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --headed --channel msedge --url 'http://localhost:5173/?mission=ledger-item-nine' \
  --out <dir> --steps docs/screenshots/issue-1147/shoot.mjs
```

The edges still step at 250 m, because the simulation keeps its grid
([maps.md](../../maps.md#how-a-map-is-written)).
