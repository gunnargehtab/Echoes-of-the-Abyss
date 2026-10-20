# Hit effect on live Tier-4 tracks

Evidence for [#1517](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1517): the
flash and spray on a live enemy track whose hp falls, specified under "UI FX" in
[art-direction.md](../../art-direction.md). Taken headless in a Linux container on The
Ventfront Divide against a Veteran AI opponent, so the frames come from SwiftShader.

```bash
node docs/screenshots/issue-1517/hit.mjs <dir>
```

The drive attack-moves the opening fleet at the opponent's base and parks the camera where
the chart probe (`__chartProbe`) reports the last track hit. It shoots when a hit is a
quarter to half a second old, so the spray has spread.

`track-hit.png` is a Hadron hull at Tier 4 under the fleet's guns, 507 ms after the hit.
Teal bubbles in the navy's colour climb above it and pale fragments sink below. The flash
has faded by then.

SwiftShader takes seconds a frame in a fight, and a frame drawn more than 0.4 s after a
track's last resolution reads it as a ghost. A ghost draws no hit, so most frames a run
takes show none. An earlier build forgot the hit on that first ghost frame, so no later
live frame drew it either; it is now held until its life runs out.
