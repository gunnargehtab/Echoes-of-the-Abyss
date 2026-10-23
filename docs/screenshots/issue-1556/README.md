# Ground ink at the map's rim

Evidence for [#1556](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1556): from the
issue's own cameras, at the branch (`cut`) and with `PerspectiveView.inkBounds` forced to null
on the live conn view (`uncut`), which is how `main` drew. Headless, 1440×900, SwiftShader.

```bash
node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?map=ventfront-divide' \
  --out <dir> --steps docs/screenshots/issue-1556/frames.mjs
```

| Frame | What it shows |
| --- | --- |
| `ventfront-bastion-ring-uncut.png` | The Bastion's SIG ring rising past the pink rim into the void |
| `ventfront-bastion-ring-cut.png` | The same ring ending on the rim |
| `corridor-storm-rings-uncut.png` | Two corner storm rings floating in the void at the horizon |
| `corridor-storm-rings-cut.png` | Only the storm rings' arcs on the map; the orange ring ends on the rim |
