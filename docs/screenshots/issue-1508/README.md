# Own hulls' cavitation wakes

Evidence for [#1508](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1508): the
wake behind the player's own moving hulls, specified in
[art-direction.md](../../art-direction.md#rendering-target) and counted under gate 6 of
[graphics-standards.md](../../graphics-standards.md). Taken headless in a Linux container
on The Ventfront Divide, so the frames come from SwiftShader: they show what is drawn, and
no millisecond is a gate-6 reading.

```bash
node .claude/skills/run-game/scripts/drive.mjs --out <dir> \
  --steps docs/screenshots/issue-1508/wake.mjs
```

`wake-loud.png` is the opening fleet about 1.5 s after a move order, at SIG 64: each hull
trails amber bubbles from its stern, left in the water where they were shed, and the
light scout at SIG 12 trails a fainter, shorter line. The probe read 97 live bubbles.

`wake-silent.png` is the same fleet coming back under Silent Running, at SIG 8: the wakes
are at the floor's strength and barely show. The probe read 76 live bubbles.

After a stop order the probe read 0 live bubbles once the last had faded.
