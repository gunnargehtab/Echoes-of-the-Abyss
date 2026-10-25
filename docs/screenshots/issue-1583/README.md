# A structure's collar about its model

Evidence for [#1583](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1583): #1557's
camera on the Ventfront Divide, `__perspectiveCamera(1900, 1450, 1800, { pitchDeg: 55 })`, and
the same at 900 m. Each at the branch (`model`) and with `PerspectiveView.structureCentre` forced
to null on the live conn view (`footing`), which is the anchor `main` drew from. Headless,
1440×900, SwiftShader.

```bash
node .claude/skills/run-game/scripts/drive.mjs --url "http://localhost:5173/?map=ventfront-divide" \
  --out <dir> --steps docs/screenshots/issue-1583/frames.mjs
```

The drive numbers its frames; they were renamed below for what they show. The harvester moves
between a model frame and its footing one.

| Frame | What it shows |
| --- | --- |
| `ventfront-home-footing.png` | The Foundry's collar across its roof's left edge |
| `ventfront-home-model.png` | The same collar ringing the whole Foundry, roof included |
| `ventfront-close-footing.png` | At 900 m, the Foundry's collar across its roof and lit bay |
| `ventfront-close-model.png` | The same collar passing outside the Foundry's roof |

The Foundry's near footing corners can still meet its collar: its plan is wider than the
half-length the collar is sized from ([ui-ux.md](../../ui-ux.md) §3.5).
