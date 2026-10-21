# Bubble burst at an own torpedo's launch

Evidence for [#1509](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1509),
taken for [#1530](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1530): the
bubbles that rise where an own torpedo leaves its tube (`ordnanceLayer.ts`, eight a burst,
1.5 s each). Taken headed in Edge on a GTX 1070 on The Ventfront Divide, against an AI
opponent. A SwiftShader frame takes longer than the burst lives, which is why #1516
merged without these.

```bash
node docs/screenshots/issue-1509/launch.mjs <dir>
```

The drive attack-moves the opening fleet at the opponent's spawn. When a gun hits a live
track within 1,800 m of that spawn, it Ctrl+right-clicks the track with the fleet
selected, frames the tube-carrier nearest it at 600 m, and photographs four moments. A
hit farther out is fauna on the way in, which a launch refuses. `launch.json` records the
set: the probe's own ordnance rose from 0 to 2 by the first frame, one torpedo from each
Caisson.

- `launch-1.png` to `launch-4.png`: about 0.47, 0.8, 1.2 and 1.6 s after the click, which
  includes the order's trip to the server. Both Caissons, each torpedo's cyan ring pulling
  away off the bow.
- `launch-strip.png`: the bows cropped from the four frames and doubled. The amber
  bubbles sit in each torpedo's ring in the first, stay at the launch point as the
  torpedo leaves in the second, and rise and thin through the last two. The hulls move
  between frames; the crop does not follow them.

The drive names its frames `launch-<set>-<ms>ms.png` and took two sets. The first set is
committed, renamed `launch-1.png` to `launch-4.png`, and `launch.json` keeps that set
under the new names. The strip was cropped by hand: the box from (760, 240) to
(1020, 460) of each frame, doubled with nearest-neighbour scaling.
