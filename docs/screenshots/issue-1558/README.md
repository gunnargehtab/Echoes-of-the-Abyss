# The scope's camera box at the map's edge

Evidence for [#1558](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1558): the
scope on the Ventfront Divide at the home frame and from the issue's two cameras, plus one
turned 45° past a corner. Headless, 1440×900, SwiftShader, at the branch.

```bash
node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?map=ventfront-divide' \
  --out <dir> --steps docs/screenshots/issue-1558/frames.mjs
node docs/screenshots/issue-1558/crop.mjs <dir>
```

`crop.mjs` cuts the scope out of each frame and enlarges it three times, side by side.

| Frame | What it shows |
| --- | --- |
| `ventfront-home-frame.png` | The whole home frame, the scope bottom-left |
| `scope-boxes.png`, 1st | Home frame: the box cut at the north and west rims, heavy on the north one |
| `scope-boxes.png`, 2nd | `(4000, 4000, 8400)` at 70°: the true far edge on the map, heavy; the box stops at the east and west rims |
| `scope-boxes.png`, 3rd | `(4000, 4000, 6400)` at 15°, focus 600 m: a trapezoid cut at three rims, heavy on the north one |
| `scope-boxes.png`, 4th | `(1200, 1200, 3000)`, yaw −45°, 30°: the box turned with the camera, heavy where its centre line leaves by the north rim |
