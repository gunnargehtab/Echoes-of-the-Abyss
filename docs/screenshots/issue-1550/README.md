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
under a move order sails out of shot while a fight frame is drawn here. It then frames
each effect as the probes report it alive. `fight.json` records every frame it took, with
the probe's reading after it, with three exceptions read before the frame: the lean and the
track hit after the camera move, and a shoal's state before it. A retry overwrote its frame.
The drive was run nine times while it was built, and the fleet's fortunes differ from run to
run. This set is one match and every frame is from it.

## Which frame shows which

| Frame | Clock | Effect | What the record read |
| --- | --- | --- | --- |
| `silt-plume.png` | T+00:20 | Silt plume | 5 motes; pale motes over the dredging harvester |
| `vent-plume.png` | T+00:27 | Vent plumes | 34 columns; the first chimney's ember steam |
| `track-hit.png` | T+04:22 | Tier-4 track hit | 1 live hit before the frame; teal spray under the track's red bar |
| `bank-pitch.png` | T+07:51 | Muzzle | A Caisson's shot: the amber pressure ring and white flash off its bow |
| `shoal.png` | T+08:08 | Shoals | Shoal 2, scattered; its stipple around a contact |

`bank-pitch.png` was the drive's try at the lean, and it shows the muzzle instead. The
drive's own `muzzle` frames came too late, so this is the match's frame of it.

## What no frame caught, and why

- **Bank and pitch.** The probe read 3.7° of roll on a Caisson when the drive chose it. After
  the camera move and before the frame, every hull it watches read 0.0°, so the hulls were
  drawn level. `fight.json` lists the lean as missed.
  [#1507's frames](../issue-1507/hull-banking-into-turn.png) show it.
- **The launch burst.** The second launch order went: own ordnance read 0 before it and 1
  after the frame. That reading came 12 s after the order, and the burst lives 1.5 s. The
  frame shows the two Caissons with no burst and is not committed.
  [#1509's GPU frames](../issue-1509/README.md) show it.
- **The wake.** The drive counted it as taken: 23 bubbles after the frame, and a Caisson
  inside its focus test. The frame shows open water, the pair just past its top edge. Not
  committed. [#1508's frames](../issue-1508/README.md) show it.
- **The own-hull hit.** A hit lives 1.2 s. The one try's hit had faded by the time its frame
  was drawn, and the probe read 0 live hits after it. Not committed.
  [#1510's frames](../issue-1510/README.md) show it.

## Does an effect hide a contact, a mark or the HUD?

None did, in these frames.

- The HUD draws over the conn view: the strip and console on the Pixi layer, the contact log
  in the DOM. No world effect draws over a plate.
- The track-hit spray sits on the track in its own navy's colour, and the track's red bar
  stays clear above it.
- The shoal's stipple is faint points around the contact at its centre. The glyph and its
  bar read through it.
- The muzzle ring sits off the bow, inside the hull's SIG ring. Neither the selection ring
  nor the health bar is covered.
- The silt motes stand on the harvester's own hull, inside its SIG ring and the node
  field's rim.
- The steam column stands clear of every mark in its frame.
