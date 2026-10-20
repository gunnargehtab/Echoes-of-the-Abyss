# Hit effect on own hulls

Evidence for [#1510](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1510): the
flash and spray on an own hull that takes damage, specified under "UI FX" in
[art-direction.md](../../art-direction.md) and counted under gate 6 of
[graphics-standards.md](../../graphics-standards.md). Taken headless in a Linux container
on The Ventfront Divide against a Veteran AI opponent, so the frames come from SwiftShader:
they show what is drawn, and no millisecond is a gate-6 reading.

```bash
node docs/screenshots/issue-1510/hit.mjs <dir>
```

The drive sails the opening fleet into the opponent's base and stops it at the first hit.
SwiftShader takes seconds a frame in the fight, so a moving hull leaves the frame between
aiming and the shot.

`hit-spray.png` is a Caisson under fire at 670 m, SIG 89. The probe read one live hit and
16 particles: amber bubbles climb above the hull and pale fragments fall below it.

`hit-spray-pair.png` is the second Caisson hit later in the same fight, with the opponent's
hulls that hit it in frame.

The lamp flash lasts about 0.36 s, shorter than one SwiftShader frame in a fight, so no
frame here shows it. One earlier run read the struck hull's lamp factor at 1.54 against its
resting 1, the flash's tail. `hullHit.test.ts` holds its peak and its fall.
