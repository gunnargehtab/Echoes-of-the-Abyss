# Issue 1158 — The First drawn in shapes

Headed Edge, 1920×1080, through `run-game`'s `drive.mjs`, on `?mission=chord-the-three`
with the HUD hidden. The client and server are `main` at `443bcb9b`. The "after" frames swap
this branch's `theFirst.ts` into the running server and change nothing else, since the map is
server data.

| Frame | Camera | Shows |
| --- | --- | --- |
| [survey-before](survey-before.png) | Map centre, 88°, dolly 6,400 m | The Axis as a full-width band under the house |
| [survey-after](survey-after.png) | Same | The Axis narrowing toward both map edges, widest under the house |
| [oblique-before](oblique-before.png) | Map centre, 50°, dolly 4,400 m | The band in perspective |
| [oblique-after](oblique-after.png) | Same | The narrowed ends in perspective |

```bash
SHOOT_MAP=4000,3000 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --headed --channel msedge --url 'http://localhost:5173/?mission=chord-the-three' \
  --out <dir> --steps docs/screenshots/issue-1158/shoot.mjs
```

The edges still step at 250 m, because the simulation keeps its grid
([maps.md](../../maps.md#how-a-map-is-written)).
