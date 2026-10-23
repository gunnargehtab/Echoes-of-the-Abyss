# Scours turn with each map's current

Evidence for [#1573](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1573). Scours
stretch along the flow at the map's centre, and a seated stone's scour trails down the flow
past it. The specification is [art-direction.md](../../art-direction.md), "Silt detail and
seated stones — SPEC".

## Files

| File | What it is |
| --- | --- |
| `rift-north-vents-*.png` | Abyssal Rift Corridor, the north vent field, camera (2875, 1125), 800 m, pitch 70° |
| `rift-north-vents-*-x4.png` | The same frame cropped and multiplied by 4: a viewing aid, never a reading of brightness |

`*-before.png` is the base commit and `*-after.png` this change. Before, the vent field's
hollows are drawn out north–south. After, they lie east–west, down the rift the
current runs along. The Ventfront Divide and the Kelp Labyrinth are unchanged: the flow at
their centres runs due south, so their frame is the old one.

No frame shows a stone's trail: no camera taken here put a seated stone on lit ground. The
turned trail is held by `seabedRegion.test.ts`, which checks the turned scour gain-for-gain
against the southward one, and `environment.test.ts`, which checks each seat's flow.

## How the frames were taken

Headless Chromium on SwiftShader in a Linux container, 1440 × 900 at ratio 1, a solo match
in the default seat, with [issue-1560's `shoot.mjs`](../issue-1560/shoot.mjs). No console
error occurred in either set.

```bash
FRAMES='[["rift-north-vents",2875,1125,800,70]]' \
  node .claude/skills/run-game/scripts/drive.mjs \
  --url 'http://localhost:5173/?map=abyssal-rift-corridor' \
  --out <dir> --steps docs/screenshots/issue-1560/shoot.mjs
```

SwiftShader frame times measure nothing, so no GPU time was read. The change adds a
normalize and a turn per fragment, and no fetch, draw call or triangle.
