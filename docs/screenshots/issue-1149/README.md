# Issue 1149 — The Attending Galleries drawn in shapes

Headed Edge, 1920×1080, through `run-game`'s `drive.mjs`, on `?mission=attending-attendance`
with the HUD hidden. The client and server are `main` at `30fd60c8`. The "after" frames swap
this branch's `attendingGalleries.ts` into the running server and change nothing else, since the map is
server data.

| Frame | Camera | Shows |
| --- | --- | --- |
| [survey-before](survey-before.png) | Map centre, 88°, dolly 8,000 m | A straight Step and two square benches |
| [survey-after](survey-after.png) | Same | The Step's shoulders running on a slant to the galleries' corners, and both benches' outer corners cut on a slant |
| [oblique-before](oblique-before.png) | Map centre, 50°, dolly 5,500 m | The boxes in perspective |
| [oblique-after](oblique-after.png) | Same | The slanted shoulders and corners in perspective |

```bash
SHOOT_MAP=5000,4000 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --headed --channel msedge --url 'http://localhost:5173/?mission=attending-attendance' \
  --out <dir> --steps docs/screenshots/issue-1149/shoot.mjs
```

The edges still step at 250 m, because the simulation keeps its grid
([maps.md](../../maps.md#how-a-map-is-written)).
