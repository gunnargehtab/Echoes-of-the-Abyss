# Issue 1105 — roofed passages as stone over a hole

Headless Chromium (SwiftShader), 1440×900, through `run-game`'s `drive.mjs`. The "before"
frames are the same steps against `main`'s client at `c67090cf`, with this branch's
server.

| Frame | Camera | Shows |
| --- | --- | --- |
| [kelp-ridge-before](kelp-ridge-before.png) | Kelp Labyrinth west wall, 55°, dolly 1,800 m | The passage floor, hatched east–west across a north–south tunnel |
| [kelp-ridge-after](kelp-ridge-after.png) | Same | The roof as stone, one route line along it |
| [kelp-mouth-low-before](kelp-mouth-low-before.png) | North mouth, 14°, looking south | The floor and its hatching, no roof |
| [kelp-mouth-low-after](kelp-mouth-low-after.png) | Same | The lintel face over the mouth, the route on the ridge |
| [kelp-inside-glass](kelp-inside-glass.png) | A Light Scout at 1,200 m inside the tunnel | The roof translucent over an own hull |
| [ventfront-slot-home](ventfront-slot-home.png) | Ventfront west slot, 55°, dolly 1,600 m | The roof standing in the coral divider, route east–west |
| [ventfront-slot-mouth-low](ventfront-slot-mouth-low.png) | West mouth, 12°, looking east | The hole under the lintel, closed sides against the divider |

```bash
node .claude/skills/run-game/scripts/drive.mjs \
  --url 'http://localhost:5173/?map=kelp-labyrinth' --out <dir> \
  --steps docs/screenshots/issue-1105/roofs.mjs
node .claude/skills/run-game/scripts/drive.mjs \
  --url 'http://localhost:5173/?map=ventfront-divide' --out <dir> \
  --steps docs/screenshots/issue-1105/slot.mjs
```

The first capture found the Kelp Labyrinth's roof upside down. Every floor there is
1,800 m or deeper, so the rock top fell below the 700 m ceiling. A roof's top now starts
150 m above its ceiling, or at the surface if that is closer (`roofTopDepthM` in
`passages.ts`), and never dips below the ceiling (`roofSurfaceDepthM`).

Each roof is one draw call: two on each of these maps. A Kelp Labyrinth roof is about
1,900 triangles against gate 6's 400 k.
