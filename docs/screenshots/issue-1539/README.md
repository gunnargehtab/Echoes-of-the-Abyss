# Live Tier-4 structure tracks as roster models

Evidence for [#1539](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1539): a
live Tier-4 enemy structure track stands in the conn view as its roster model, under the
Asymmetric Fidelity Law in [art-direction.md](../../art-direction.md). Taken headless in a
Linux container on The Ventfront Divide against one AI opponent, so the frames come from
SwiftShader.

```bash
node docs/screenshots/issue-1539/structure.mjs <dir>
```

The drive attack-moves the opening fleet at the opponent's spawn and parks the camera over
it. It pings from the fleet every few seconds and takes the frame the moment the conn
probe reports a live structure track (`__perspectiveProbe().structureTracks`). A ping's
reveal lasts three seconds, and a camera move costs seconds under SwiftShader, so the
camera is not moved between the ping and the frame.

`structure-track.png` is that frame. The probe read one structure track among five tracks
before and after it. Top left, a Commune structure stands as its model inside its
threat-red outline. Lower left, the Commune hulls the ping resolved are drawn as models at
true metres inside their threat-red outlines, too small at this distance to read.
