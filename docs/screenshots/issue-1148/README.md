# Issue 1148 — Marr Plateau drawn in shapes

Headed Edge, 1920×1080, through `run-game`'s `drive.mjs`, on `?mission=seeding-tend`
with the HUD hidden. The client and server are `main` at `415ca2e8`. The "after" frames swap
this branch's `marrPlateau.ts` into the running server and change nothing else, since the map is
server data.

| Frame | Camera | Shows |
| --- | --- | --- |
| [survey-before](survey-before.png) | Map centre, 88°, dolly 6,400 m | A straight lip to the Drop, and a boxed Face |
| [survey-after](survey-after.png) | Same | The lip running on a slant to the west edge, and the Face's north-east corner given to the Drop |
| [oblique-before](oblique-before.png) | Map centre, 50°, dolly 4,400 m | The straight lip in perspective |
| [oblique-after](oblique-after.png) | Same | The slanted lip in perspective |

```bash
SHOOT_MAP=4000,2500 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --headed --channel msedge --url 'http://localhost:5173/?mission=seeding-tend' \
  --out <dir> --steps docs/screenshots/issue-1148/shoot.mjs
```

The edges still step at 250 m, because the simulation keeps its grid
([maps.md](../../maps.md#how-a-map-is-written)).
