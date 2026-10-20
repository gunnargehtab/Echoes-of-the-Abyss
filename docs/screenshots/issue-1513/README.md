# Lampfry shoal burst and gather

Evidence for [#1513](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1513): a
scattering shoal's motes burst out from its centre, and gather back when it reforms
([map-visuals.md](../../map-visuals.md) §10, Phase 3). Taken headless on The Ventfront
Divide with SwiftShader, so the frames show what is drawn and time nothing.

```bash
node .claude/skills/run-game/scripts/drive.mjs --out <dir> \
  --url 'http://localhost:5173/?map=ventfront-divide' --steps docs/screenshots/issue-1513/burst.mjs
```

`burst-six-frames.png` crops one shoal, id 2 at 265 m, at six moments: formed, 0.1 s and
0.25 s into the burst, settled scattered, 0.6 s into the gather, and formed again.

Two things are the harness's, not the game's. The scatter is forced in the page: the
stipple's `setLife` is told the shoal is scattered, so the chart painter's 300 m ring,
drawn only on the server's word, is absent. And a SwiftShader frame outlasts the 0.6 s
burst, so each frame pins the burst clock `uBurstS` at its moment.
