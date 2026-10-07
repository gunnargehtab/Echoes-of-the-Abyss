# Issue 1142 — The Upper Workings drawn in shapes

Headed Edge, 1920×1080, through `run-game`'s `drive.mjs`, on `?mission=ledger-shift-change`
with the HUD hidden. The client and server are `main` at `f9d064c4`. The "after" frames swap
this branch's `ninefoldWorkings.ts` into the running server and change nothing else, since the
map is server data.

| Frame | Camera | Shows |
| --- | --- | --- |
| [survey-before](survey-before.png) | Map centre, 88°, dolly 6,400 m | A straight Downworks band and two square faces |
| [survey-after](survey-after.png) | Same | The Downworks as a basin dipping south between the faces, Face Two cut down the slope, Face Five round |
| [oblique-before](oblique-before.png) | Map centre, 50°, dolly 4,400 m | The band and faces as boxes in perspective |
| [oblique-after](oblique-after.png) | Same | The basin's ends rising back to the Field |

```bash
SHOOT_MAP=4000,3000 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --headed --channel msedge --url 'http://localhost:5173/?mission=ledger-shift-change' \
  --out <dir> --steps docs/screenshots/issue-1142/shoot.mjs
```

The edges still step at 250 m, because the simulation keeps its grid
([maps.md](../../maps.md#how-a-map-is-written)).
