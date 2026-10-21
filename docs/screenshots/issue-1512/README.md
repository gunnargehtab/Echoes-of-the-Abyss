# Own harvesters' silt plumes

Evidence for [#1512](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1512): the
silt plume an own harvester stirs while it dredges, specified in
[art-direction.md](../../art-direction.md#rendering-target) and counted under gate 6 of
[graphics-standards.md](../../graphics-standards.md). Taken headless in a Linux container
on The Ventfront Divide, so the frames come from SwiftShader: they show what is drawn, and
no millisecond is a gate-6 reading.

```bash
node .claude/skills/run-game/scripts/drive.mjs --out <dir> \
  --url 'http://localhost:5173/?map=ventfront-divide' \
  --steps docs/screenshots/issue-1512/plume.mjs
```

`plume-dredging-close.png` is the opening harvester on Standard throttle about 0.7 s into a
dredge, framed at its depth: pale silt motes stand around and over its hull. The probe read
13 live motes. `plume-dredging.png` is the same at the home distance, 11 motes.

The harvester fills its 50-unit hold in about two seconds and leaves for its depot. Three
seconds later the probe read 0 live motes: a harvester under way stirs nothing.
