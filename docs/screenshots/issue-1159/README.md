# Issue 1159 — The Fifth drawn in shapes

Headed Edge, 1920×1080, through `run-game`'s `drive.mjs`, on `?mission=chord-standing-wave`
with the HUD hidden. The client and server are `main` at `443bcb9b`. The "after" frames swap
this branch's `theFifth.ts` into the running server and change nothing else, since the map is
server data.

| Frame | Camera | Shows |
| --- | --- | --- |
| [survey-before](survey-before.png) | Map centre, 88°, dolly 8,000 m | A boxed South Mouth at the defile's foot |
| [survey-after](survey-after.png) | Same | The South Mouth fanning out to the map's south edge |
| [oblique-before](oblique-before.png) | Map centre, 50°, dolly 5,500 m | The boxed Mouth in perspective |
| [oblique-after](oblique-after.png) | Same | The fanned Mouth in perspective |

```bash
SHOOT_MAP=5000,4000 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --headed --channel msedge --url 'http://localhost:5173/?mission=chord-standing-wave' \
  --out <dir> --steps docs/screenshots/issue-1159/shoot.mjs
```

The edges still step at 250 m, because the simulation keeps its grid
([maps.md](../../maps.md#how-a-map-is-written)).
