# Dune crests turn with each map's current

Evidence for [#1560](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1560). The
crests were east–west on every map. They now arc about each map's current source, so
neighbouring plateaus no longer share a crest line. The specification is
[art-direction.md](../../art-direction.md), "Silt detail and seated stones — SPEC".

## Files

| File | What it is |
| --- | --- |
| `ventfront-west-*.png` | Ventfront Divide, west kelp plateau, camera (500, 2500), 2,000 m, pitch 55° |
| `ventfront-east-*.png` | Its mirror, the east plateau, camera (7500, 2500) |
| `rift-centre-*.png` | Abyssal Rift Corridor, the rift's middle, camera (5000, 3000), 2,000 m |
| `shoot.mjs` | The `--steps` module that took them; `FRAMES` names each camera |

`*-before.png` is the base commit and `*-after.png` this change, from the same server
setup and cameras. Before, both plateaus show the same horizontal bands. After, the west
plateau's crests fall to the right and the east plateau's rise, and the rift's run nearly
north–south across its east-flowing water.

## How the frames were taken

Headless Chromium on SwiftShader in a Linux container, 1440 × 900 at ratio 1, a solo match
in the default seat. No console error occurred in either set.

```bash
FRAMES='[["ventfront-west-plateau",500,2500,2000,55],["ventfront-east-plateau",7500,2500,2000,55]]' \
  node .claude/skills/run-game/scripts/drive.mjs \
  --url 'http://localhost:5173/?map=ventfront-divide' \
  --out <dir> --steps docs/screenshots/issue-1560/shoot.mjs
```

SwiftShader frame times measure nothing, so no GPU time was read. The change adds a length
and a divide per fragment and no fetch, draw call or triangle.
