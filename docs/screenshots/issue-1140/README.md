# Issue 1140 — Sorrowgate drawn in shapes

Headed Edge, 1920×1080, through `run-game`'s `drive.mjs`, on `?mission=prologue-sorrowgate`
with the HUD hidden. The client and server are `main` at `f9d064c4`. The "after" frames swap
this branch's `sorrowgate.ts` into the running server and change nothing else, since the map
is server data.

| Frame | Camera | Shows |
| --- | --- | --- |
| [survey-before](survey-before.png) | Map centre, 88°, dolly 8,000 m | A boxed West Approach, a square Descent, a square Gate |
| [survey-after](survey-after.png) | Same | The approach widening from the west edge, the Descent narrowing to its foot at the lock |
| [oblique-before](oblique-before.png) | Map centre, 50°, dolly 5,500 m | The Descent as a square pit under the Concourse |
| [oblique-after](oblique-after.png) | Same | The Descent's east wall stepping in as it runs south to the lock |

```bash
SHOOT_MAP=5000,4000 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --headed --channel msedge --url 'http://localhost:5173/?mission=prologue-sorrowgate' \
  --out <dir> --steps docs/screenshots/issue-1140/shoot.mjs
```

The edges still step at 250 m, because the simulation keeps its grid
([maps.md](../../maps.md#how-a-map-is-written)).
