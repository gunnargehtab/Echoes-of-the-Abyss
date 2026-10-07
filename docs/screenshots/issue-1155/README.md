# Issue 1155 — The Shallow Band drawn in shapes

Headed Edge, 1920×1080, through `run-game`'s `drive.mjs`, on `?mission=attending-trench-awakening`
with the HUD hidden. The client and server are `main` at `4d80c700`. The "after" frames swap
this branch's `shallowBand.ts` into the running server and change nothing else, since the map is
server data.

| Frame | Camera | Shows |
| --- | --- | --- |
| [survey-before](survey-before.png) | Map centre, 88°, dolly 8,000 m | Two boxed overhangs beside the row and the stalls |
| [survey-after](survey-after.png) | Same | The West Overhang reaching north on a slant to the rim, the East into one cell beside the stalls, and both inner south corners cut |
| [oblique-before](oblique-before.png) | Map centre, 50°, dolly 5,500 m | The boxed overhangs in perspective |
| [oblique-after](oblique-after.png) | Same | The slanted overhangs in perspective |

```bash
SHOOT_MAP=5000,4000 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --headed --channel msedge --url 'http://localhost:5173/?mission=attending-trench-awakening' \
  --out <dir> --steps docs/screenshots/issue-1155/shoot.mjs
```

The edges still step at 250 m, because the simulation keeps its grid
([maps.md](../../maps.md#how-a-map-is-written)).
