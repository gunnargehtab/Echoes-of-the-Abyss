# Muzzle effect on own guns

Evidence for [#1511](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1511): the
flash and pressure ring of an own gun's shot, specified under "UI FX" in
[art-direction.md](../../art-direction.md) and counted under gate 6 of
[graphics-standards.md](../../graphics-standards.md). Taken headless in a Linux container
on The Ventfront Divide against a Veteran AI opponent, so the frames come from SwiftShader:
they show what is drawn, and no millisecond is a gate-6 reading.

```bash
node docs/screenshots/issue-1511/fire.mjs <dir>
```

The drive sails the opening fleet into the opponent's base and holds it at the first blow
either way. A hull under a move order does not stop to brawl, so its guns open only once
it is held.

`muzzle-ring.png` is a Caisson firing at 670 m, SIG 89. The probe read 34 live particles,
one shot's flash and ring, spread ahead of the hull on its firing bearing in the faction
glow.

`muzzle-ring-pair.png` is the same Caisson five minutes later, 52 shots in, beside the
second Caisson of the pair.

No siege hull is in the opening fleet, so no frame shows the recoil, and the flash lasts
0.32 s, shorter than one SwiftShader frame in a fight. `gunFire.test.ts` holds both: the
recoil's kick and settle, the flash's lifetime, and the conn view kicking a Tocsin on a
`Fired`.
