# Issue 1153 — The Furrow drawn in shapes

Headed Edge, 1920×1080, through `run-game`'s `drive.mjs`, on `?mission=seeding-deep-furrow`
with the HUD hidden. The client and server are `main` at `4d80c700`. The "after" frames swap
this branch's `anholtFurrow.ts` into the running server and change nothing else, since the map is
server data.

| Frame | Camera | Shows |
| --- | --- | --- |
| [survey-before](survey-before.png) | Map centre, 88°, dolly 6,400 m | Two boxed walls and a boxed sill |
| [survey-after](survey-after.png) | Same | Each wall's outer north corner given to the lanes on a slant, and the sill fanning out past the walls' feet |
| [oblique-before](oblique-before.png) | Map centre, 50°, dolly 4,400 m | The boxed walls in perspective |
| [oblique-after](oblique-after.png) | Same | The slanted corners and the fanned sill in perspective |

```bash
SHOOT_MAP=4000,3000 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --headed --channel msedge --url 'http://localhost:5173/?mission=seeding-deep-furrow' \
  --out <dir> --steps docs/screenshots/issue-1153/shoot.mjs
```

The edges still step at 250 m, because the simulation keeps its grid
([maps.md](../../maps.md#how-a-map-is-written)).
