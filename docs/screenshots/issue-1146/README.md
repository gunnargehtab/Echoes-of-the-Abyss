# Issue 1146 — The Rim drawn in shapes

Headed Edge, 1920×1080, through `run-game`'s `drive.mjs`, on `?mission=ledger-prospect`
with the HUD hidden. The client and server are `main` at `415ca2e8`. The "after" frames swap
this branch's `mouthRim.ts` into the running server and change nothing else, since the map is
server data.

| Frame | Camera | Shows |
| --- | --- | --- |
| [survey-before](survey-before.png) | Map centre, 88°, dolly 9,600 m | The slopes' foot as one straight edge across the map |
| [survey-after](survey-after.png) | Same | A bay cut into the slopes' foot at the west edge, and a corner at the east |
| [oblique-before](oblique-before.png) | Map centre, 50°, dolly 6,600 m | The straight foot in perspective |
| [oblique-after](oblique-after.png) | Same | The bay and the corner in perspective |

```bash
SHOOT_MAP=6000,4000 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --headed --channel msedge --url 'http://localhost:5173/?mission=ledger-prospect' \
  --out <dir> --steps docs/screenshots/issue-1146/shoot.mjs
```

The edges still step at 250 m, because the simulation keeps its grid
([maps.md](../../maps.md#how-a-map-is-written)).
