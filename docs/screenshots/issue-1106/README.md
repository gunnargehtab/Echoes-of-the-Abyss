# Issue 1106 — the Ventfront Divide drawn in shapes

Headed Edge, 1920×1080, through `run-game`'s `drive.mjs`, from the Bathyarch Consortium
seat with the HUD hidden. The client and server are this branch at `e19e2abf`. The
"before" frames swap `main`'s `ventfrontDivide.ts` into the running server and change
nothing else, since this branch paints a rectangle on the same cells as `main`.

| Frame | Camera | Shows |
| --- | --- | --- |
| [survey-before](survey-before.png) | Map centre, 88°, dolly 18,000 m | The checkerboard: square plateaus, straight trench lips, a straight rift, boxed reefs |
| [survey-after](survey-after.png) | Same | Plateaus with a flank to the middle, notched lips, a rift that swells at its vents, reefs that round off past it |
| [oblique-before](oblique-before.png) | North-west quarter, 50°, dolly 7,000 m | The north-west plateau as a square table |
| [oblique-after](oblique-after.png) | Same | Its flank stepping down to the transit gap, a reef tip standing in the gap |

```bash
VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs --headed \
  --channel msedge --url 'http://localhost:5173/?map=ventfront-divide' --out <dir> \
  --steps docs/screenshots/issue-1106/shoot.mjs
```

The edges still step at 250 m, because the simulation keeps its grid
([maps.md](../../maps.md#how-a-map-is-written)). What changed is the outline at the scale of
the map; every straight line between two spawns still crosses the cells it did before.
