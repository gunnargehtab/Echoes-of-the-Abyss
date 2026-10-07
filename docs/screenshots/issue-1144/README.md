# Issue 1144 — The Western Margin drawn in shapes

Headed Edge, 1920×1080, through `run-game`'s `drive.mjs`, on `?mission=ledger-exposure`
with the HUD hidden. The client and server are `main` at `63784b64`. The "after" frames swap
this branch's `firstTrenchMargin.ts` into the running server and change nothing else, since the map is
server data.

| Frame | Camera | Shows |
| --- | --- | --- |
| [survey-before](survey-before.png) | Map centre, 88°, dolly 8,000 m | A straight slope band and a straight listening ground |
| [survey-after](survey-after.png) | Same | The listening ground reaching up the slope in two canyons, the slope's spur south of the muster, the margin showing as a bench at either end |
| [oblique-before](oblique-before.png) | Map centre, 50°, dolly 5,500 m | The same bands as boxes in perspective |
| [oblique-after](oblique-after.png) | Same | The canyons and the end benches in perspective |

```bash
SHOOT_MAP=5000,3000 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs   --headed --channel msedge --url 'http://localhost:5173/?mission=ledger-exposure'   --out <dir> --steps docs/screenshots/issue-1144/shoot.mjs
```

The edges still step at 250 m, because the simulation keeps its grid
([maps.md](../../maps.md#how-a-map-is-written)).
