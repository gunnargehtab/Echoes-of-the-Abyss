# Ground ink behind a model

Evidence for [#1557](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1557): the
issue's own camera on the Ventfront Divide, `__perspectiveCamera(1900, 1450, 1800, { pitchDeg:
55 })`, and the same at 900 m. Each at the branch (`cut`) and with `PerspectiveView.inkHidden`
forced to false on the live conn view (`uncut`), which is how `main` drew. Headless, 1440×900,
SwiftShader.

```bash
node .claude/skills/run-game/scripts/drive.mjs --url "http://localhost:5173/?map=ventfront-divide" \
  --out <dir> --steps docs/screenshots/issue-1557/frames.mjs
```

The drive numbers its frames; they were renamed below for what they show. The harvester moves
between a cut frame and its uncut one, so its own ink differs.

| Frame | What it shows |
| --- | --- |
| `ventfront-home-uncut.png` | The toxic-brine site's red rim across the Foundry's roof and slipway |
| `ventfront-home-cut.png` | The same rim ending at the Foundry's footing on both sides |
| `ventfront-close-uncut.png` | At 900 m, the rim across the slipway's lit bay |
| `ventfront-close-cut.png` | The rim passing behind the Foundry |

The grey circle about each structure, and the amber and green arcs on it, are its loudness
collar. It is drawn in screen space rather than traced on the ground, so the cut does not reach
it, and it still crosses the Foundry's roof: docs/map-visuals.md §5 records that as open.
