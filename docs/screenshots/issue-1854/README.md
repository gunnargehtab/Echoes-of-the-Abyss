# World light in the colour-vision palettes (#1854)

Frames for [style-neon-noir.md](../../style-neon-noir.md#rule-5-in-the-colour-vision-palettes):
each world-light family a skirmish map stands, close, in the standard, deuteranopia and
protanopia palettes, before the change and after it.

**A software rasteriser drew every frame here**: SwiftShader, in headless Chromium, in the
cloud container that built the change. They guide a round and are not offered for
acceptance. Whether the four new tokens read as an ember, a biolight, a seam and a trace
is the owner's glance.

## The sheets

A row is a family on a map. The columns are the standard palette, then deuteranopia
before and after, then protanopia before and after. Each cell is the middle 560 by 350
pixels of a 1440 by 900 frame, taken from 150 m.

![Low: each family in three palettes, before and after](software/low-beside.png)

At Low a world light is a point or a seam (rule 1), so what moves is small: the steam
over a chimney's mouth, the ember beside it and the tip of a coral growth. The Abyssal
Rift's biolight stands under a hull of the own base, and its row shows that hull.

![High: each family in three palettes, before and after](software/high-beside.png)

At High the same tokens pool on the ground and scatter in the water, so the change fills
the frame: the vent's light goes from orange to a dusty terracotta, the biolight from teal
to a leaf green, and the seam a shade bluer.

## What the frames hold

- **The standard palette does not move.** [control.json](software/control.json) compares
  the standard column before and after, cell by cell. The most pixels that differ by more
  than 8 in a channel is 114 of 196,000, over the crystal, the same count at both
  qualities. They lie scattered across the whole cell in 36 separate places, a few pixels
  each, which is how two sessions' drifting motes differ and not how a light would.
- **A palette changed mid-match is followed.** [frames.mjs](frames.mjs) writes the palette
  and the quality through the settings store with no reload, and reads back what the view
  draws before each frame. So every deuteranopia and protanopia cell is a ground that
  stood in another palette a moment before.
- **An ember only half follows at Low.** A dressing rebuild leaves the old ember cloud in
  the scene ([#1906](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1906)), and
  a stale cloud keeps the palette it was last written in. The steam, the props and High's
  pools follow whole. A palette chosen before the match is right everywhere.
- **No frame shows ore or a lamp.** `ore-trace` moves by 8.7 dE to a normal eye and stands
  on fields the room places; `civic-lamp` does not move in any palette.

## Reproduce

```bash
SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' \
  node .claude/skills/run-game/scripts/drive.mjs \
  --url 'http://localhost:5173/?map=ventfront-divide' \
  --out /tmp/issue-1854/after/ventfront-divide --steps docs/screenshots/issue-1854/frames.mjs
```

The same against `?map=abyssal-rift-corridor`, the one skirmish map that stands a crystal.
The before set is the same module against servers started at the base commit, 6e520464.
Then `python3 docs/screenshots/issue-1854/sheet.py <before> <after> docs/screenshots/issue-1854/software`
lays the two beside each other. [sites.json](sites.json) is every licensed prop the
default placement stands on the two maps, by family.

## Related

[style-neon-noir.md](../../style-neon-noir.md) · [ui-ux.md](../../ui-ux.md) ·
[graphics-standards.md](../../graphics-standards.md) · [issue-1837](../issue-1837/README.md)
