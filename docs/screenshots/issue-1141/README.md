# Issue 1141 — Face Six drawn in shapes

Headed Edge, 1920×1080, through `run-game`'s `drive.mjs`, on `?mission=ledger-asset-recovery`
with the HUD hidden. The client and server are `main` at `f9d064c4`. The "after" frames swap
this branch's `ninefoldFaceSix.ts` into the running server and change nothing else, since the
map is server data.

| Frame | Camera | Shows |
| --- | --- | --- |
| [survey-before](survey-before.png) | Map centre, 88°, dolly 6,400 m | A straight Terrace band, a boxed Works, a boxed Scar |
| [survey-after](survey-after.png) | Same | The Terrace rising about its two eruption sites, the Works fanning west, the Scar torn east and down past the fall |
| [oblique-before](oblique-before.png) | Map centre, 50°, dolly 4,400 m | The same three boxes in perspective |
| [oblique-after](oblique-after.png) | Same | The same three shapes in perspective |

```bash
SHOOT_MAP=4000,3000 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --headed --channel msedge --url 'http://localhost:5173/?mission=ledger-asset-recovery' \
  --out <dir> --steps docs/screenshots/issue-1141/shoot.mjs
```

The edges still step at 250 m, because the simulation keeps its grid
([maps.md](../../maps.md#how-a-map-is-written)).
