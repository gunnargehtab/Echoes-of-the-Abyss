# Issue 1145 — The Underworks drawn in shapes

Headed Edge, 1920×1080, through `run-game`'s `drive.mjs`, on `?mission=ledger-tolerance`
with the HUD hidden. The client and server are `main` at `63784b64`. The "after" frames swap
this branch's `holdingUnderworks.ts` into the running server and change nothing else, since the map is
server data.

| Frame | Camera | Shows |
| --- | --- | --- |
| [survey-before](survey-before.png) | Map centre, 88°, dolly 6,400 m | Straight berths and a straight overhang lip |
| [survey-after](survey-after.png) | Same | The berths hanging one row lower under Vayle's frame, the overhang's lip climbing one row west of x 1,250 |
| [oblique-before](oblique-before.png) | Map centre, 50°, dolly 4,400 m | The same boxes in perspective |
| [oblique-after](oblique-after.png) | Same | The sag and the climbing lip in perspective |

```bash
SHOOT_MAP=4000,3000 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs   --headed --channel msedge --url 'http://localhost:5173/?mission=ledger-tolerance'   --out <dir> --steps docs/screenshots/issue-1145/shoot.mjs
```

The edges still step at 250 m, because the simulation keeps its grid
([maps.md](../../maps.md#how-a-map-is-written)).
