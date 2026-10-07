# Issue 1138 — the Abyssal Rift Corridor drawn in shapes

Headless Chromium, 1280×720, through `run-game`'s `drive.mjs` on
`?map=abyssal-rift-corridor`, with the HUD hidden. The "before" frames are `main` at
`b719ff2`; the "after" frames are this branch, whose server reloaded the reshaped
`abyssalRiftCorridor.ts` and changed nothing else.

| Frame | Camera | Shows |
| --- | --- | --- |
| [survey-before](survey-before.png) | Map centre, 88°, dolly 16,000 m | The rift as one bar between two square aprons, square vent and coral flanks, square corner fields |
| [survey-after](survey-after.png) | Same | The rift narrowing at each apron and each choke and opening into a basin about the crystal; round vent fields, reef banks along the rim, rounded aprons and corners |
| [oblique-before](oblique-before.png) | Map centre, 50°, dolly 11,000 m | The same boxes in perspective |
| [oblique-after](oblique-after.png) | Same | The basin's walls stepping down into the rift, the chokes standing proud of the throats |

```bash
SHOOT_MAP=10000,6000 VIEW_W=1280 VIEW_H=720 node .claude/skills/run-game/scripts/drive.mjs \
  --url 'http://localhost:5173/?map=abyssal-rift-corridor' --out <dir> \
  --steps docs/screenshots/issue-1143/shoot.mjs
```

The edges still step at 250 m, because the simulation keeps its grid
([maps.md](../../maps.md#how-a-map-is-written)). The chokes kept every cell, and the line
between the two spawns crosses the cells it did before.
