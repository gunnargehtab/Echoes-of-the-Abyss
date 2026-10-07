# Issue 1137 — the Kelp Labyrinth drawn in shapes

Headless Chromium, 1280×720, through `run-game`'s `drive.mjs` on `?map=kelp-labyrinth`, with
the HUD hidden. 1920×1080 timed out taking the frame under the container's software WebGL, so
these are smaller than #1106's. The "before" frames are `main` at `415ca2e8`; the "after"
frames are this branch, whose server reloaded the reshaped `kelpLabyrinth.ts` and changed
nothing else.

| Frame | Camera | Shows |
| --- | --- | --- |
| [survey-before](survey-before.png) | Map centre, 88°, dolly 12,800 m | A square lagoon inside a square coral frame, four square corner pockets |
| [survey-after](survey-after.png) | Same | The rim bowing in between the seats, shouldering each vent and stepping toward the east and west gates; each corner pocket spreading into the lagoon |
| [oblique-before](oblique-before.png) | Map centre, 50°, dolly 8,800 m | The same boxes in perspective |
| [oblique-after](oblique-after.png) | Same | The pits slumping toward the lagoon, the rim's steps along the east and west |

```bash
SHOOT_MAP=8000,8000 VIEW_W=1280 VIEW_H=720 node .claude/skills/run-game/scripts/drive.mjs \
  --url 'http://localhost:5173/?map=kelp-labyrinth' --out <dir> \
  --steps docs/screenshots/issue-1143/shoot.mjs
```

The edges still step at 250 m, because the simulation keeps its grid
([maps.md](../../maps.md#how-a-map-is-written)). The maze, the vents and the central pocket
kept every cell, and every straight line between two spawns crosses the cells it did before.
