# Issue 1152 — The Banding Ground drawn in shapes

Headed Edge, 1920×1080, through `run-game`'s `drive.mjs`, on `?mission=attending-intake`
with the HUD hidden. The client and server are `main` at `4d80c700`. The "after" frames swap
this branch's `bandingGround.ts` into the running server and change nothing else, since the map is
server data.

| Frame | Camera | Shows |
| --- | --- | --- |
| [survey-before](survey-before.png) | Map centre, 88°, dolly 8,000 m | Two square overhangs either side of the bench |
| [survey-after](survey-after.png) | Same | Both overhangs' inner corners cut on a slant, narrowing to the bench across its middle 500 m |
| [oblique-before](oblique-before.png) | Map centre, 50°, dolly 5,500 m | The square overhangs in perspective |
| [oblique-after](oblique-after.png) | Same | The slanted corners in perspective |

```bash
SHOOT_MAP=5000,4000 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --headed --channel msedge --url 'http://localhost:5173/?mission=attending-intake' \
  --out <dir> --steps docs/screenshots/issue-1152/shoot.mjs
```

The edges still step at 250 m, because the simulation keeps its grid
([maps.md](../../maps.md#how-a-map-is-written)).
