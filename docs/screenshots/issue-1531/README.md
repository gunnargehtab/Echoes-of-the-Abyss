# Live Tier-4 hull tracks as roster models

Evidence for [#1531](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1531): a
live Tier-4 enemy hull track sails in the conn view as its roster model, under the
Asymmetric Fidelity Law in [art-direction.md](../../art-direction.md). Taken headless in a
Linux container on The Ventfront Divide against one AI opponent, so the frames come from
SwiftShader.

`tracks.mjs` is a `run-game` steps module. It sends the opening fleet to the map's centre,
pings there every fifteen seconds, and frames the first track the conn probe reports
(`__perspectiveProbe().trackAt`). The stock `drive.mjs` readies without an opponent, so
this run clicked the lobby's "Add opponent" first.

`track-model.png` is the frame on that track, with the probe reading `tracks=2`. The hull
at the centre without a wake is the track; the own hulls around it trail theirs. The
track first resolved 84 s into the drive, and SwiftShader took about three minutes to
reach this frame, so the fight had moved on by then.
