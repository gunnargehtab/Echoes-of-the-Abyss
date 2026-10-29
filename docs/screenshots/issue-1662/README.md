# Marker names off the hulls and on the water

Evidence for [#1662](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1662):
[ui-ux.md](../../ui-ux.md) §10.5's placement rule in five frames, at 1,440 × 900 in headless
Chromium (SwiftShader), with motion reduced so the camera holds still. Each is driven by the
`frames.mjs` #1617 wrote, which presses the first open row with a marker:

```bash
FRAME_OUT=docs/screenshots/issue-1662 FRAME_NAME=<frame> REDUCED_MOTION=1 [ZOOM_OUT=8] \
  node .claude/skills/run-game/scripts/drive.mjs \
  --url "http://localhost:5173/?mission=<id>" --out <dir> \
  --steps docs/screenshots/issue-1617/frames.mjs
```

| Frame | Mission | What it shows | Before ([#1617](../issue-1617/README.md)) |
| --- | --- | --- | --- |
| `chord-standing-wave.jpg` | `chord-standing-wave` | *The Fifth* on the ring's west shoulder, clear of the Bastion's collar | On the Bastion's dome, its "Fi" lost in the highlight |
| `chord-second-chord.jpg` | `chord-second-chord` | *The Chord* stepped west along the ring's top, clear of the Sounding Spire's collar | Through the Spire's base |
| `ledger-exposure-zoomed.jpg` | `ledger-exposure`, `ZOOM_OUT=8` | *The worked ground* stepped east along the ring's top, past the three surveyors' collars | Through all three collars |
| `ledger-exposure.jpg` | `ledger-exposure` | *The worked ground* at the head of the water: the view stands inside the ring, which reaches the water only under the panels | No name until the camera wheeled out |
| `chord-nineteen.jpg` | `chord-nineteen` | *The Rest* at the head of the water, for the same reason | No name until the camera wheeled out |

The last two are at the dolly a row's focus keeps, which is the frame a player has when they
press the row. #1617 wheeled each out eight notches to show a name at all.

## Related

- [ui-ux.md](../../ui-ux.md) §10.5, the rule these frames show
- [issue-1617](../issue-1617/README.md), the frames before it
