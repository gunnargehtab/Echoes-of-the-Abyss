# The #1467 animations in one fight

Evidence for [#1550](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1550): the
nine effects of [#1467](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1467)
together, in one match on The Ventfront Divide against a Veteran AI opponent, the opening
fleet attack-moved at its spawn. Taken headless in a Linux container, so the frames come
from SwiftShader: they show what is drawn, and no millisecond is a gate-6 reading.
[#1530](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1530) holds gate 6.

```bash
node docs/screenshots/issue-1550/fight.mjs <dir>
```

The drive frames the harvester's silt, the first chimney and the nearest shoal at home, then
sends the fleet in and holds it at the first blow, as #1510's and #1511's drives do: a hull
under a move order sails out of shot in the seconds a fight frame takes here. It then frames
each effect as the probes report it alive. `fight.json` records every frame it took, with
the probe's reading after it; a retry overwrote its frame. The drive was run nine times
while it was built, and the fleet's fortunes differ from run to run. This set is one match
and every frame is from it.

## Which frame shows which

| Frame | Clock | Effect | What the record read |
| --- | --- | --- | --- |
| `silt-plume.png` | T+00:20 | Silt plume | 5 motes; pale motes over the dredging harvester |
| `vent-plume.png` | T+00:27 | Vent plumes | 34 columns; the first chimney's ember steam |
| `track-hit.png` | T+04:22 | Tier-4 track hit | 1 live hit; teal spray under the track's red bar, framed at 650 m |
| `launch.png` | T+07:25 | Launch bubbles | Ordnance 0 before, 1 after: a torpedo left a tube |
| `bank-pitch.png` | T+07:51 | Bank, and a muzzle | Caisson at 3.7° roll before the frame, 250 m out |
| `shoal.png` | T+08:08 | Shoals | Shoal 2, scattered; its stipple around a contact |

`bank-pitch.png` also holds the muzzle effect: the amber pressure ring and white flash of a
shot, off the Caisson's bow. The drive's own `muzzle` frames came too late, so this is the
match's frame of it.

## What no frame caught, and why

- **Bank and pitch, legibly.** The probe read 3.7° of roll on a Caisson as the frame was
  ordered. At 250 m the lean does not read by eye. The drive also kept trying, because after
  the frame the most-leaned hull was the other Caisson, so `fight.json` lists it as missed.
  [#1507's frames](../issue-1507/hull-banking-into-turn.png) show the lean close.
- **The launch burst.** The order went, and the probe read after the frame was 12 s after
  it. The burst lives 1.5 s, under one SwiftShader frame in a fight.
  [#1509's GPU frames](../issue-1509/README.md) show it.
- **The wake.** The `wake` frame was ordered with 23 bubbles alive, and drawn after the pair
  had sailed out of shot. It shows open water and is not committed.
- **The own-hull hit.** A hit lives 1.2 s. The one try's hit had faded by the time its frame
  was drawn, and the probe read 0 live hits after it. Not committed.
  [#1510's frames](../issue-1510/README.md) show it.

## Does an effect hide a contact, a mark or the HUD?

None did, in these frames.

- The HUD is the Pixi layer over the conn view, so no world effect draws over a plate.
- The track-hit spray sits on the track in its own navy's colour, and the track's red bar
  stays clear above it.
- The shoal's stipple is faint points around the contact at its centre. The glyph and its
  bar read through it.
- The muzzle ring sits off the bow, inside the hull's SIG ring. Neither the selection ring
  nor the health bar is covered.
- The silt motes stand on the harvester's own hull, inside its SIG ring and the node
  field's rim.
- The steam column stands clear of every mark in its frame.
