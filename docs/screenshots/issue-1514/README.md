# Steam from the vent chimneys

Evidence for [#1514](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1514): the
steam each vent chimney breathes, specified in [art-direction.md](../../art-direction.md)
and [style-neon-noir.md](../../style-neon-noir.md) "World light", and counted under gate 6
of [graphics-standards.md](../../graphics-standards.md). Taken headless in a Linux container
on The Ventfront Divide, so the frames come from SwiftShader: they show what is drawn, and
no millisecond is a gate-6 reading.

```bash
node .claude/skills/run-game/scripts/drive.mjs --out <dir> \
  --url 'http://localhost:5173/?map=ventfront-divide' \
  --steps docs/screenshots/issue-1514/plume.mjs
```

Each frame is framed on the map's first chimney, at its mouth's depth. The probe read 34
columns standing, one per chimney.

- `chimney-steam.png`: 450 m out at 50° pitch. Ember-hued puffs climb straight up from the
  stack and thin out.
- `chimney-steam-close.png`: 260 m at 40°. The column is spaced puffs at their own heights,
  dimmer than the embers.
- `chimney-steam-low.png`: 320 m at 15°, across the column. It stays one vertical line.
