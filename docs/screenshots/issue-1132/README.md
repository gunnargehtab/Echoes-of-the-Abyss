# Issue 1132 — a click is a point in the water

Headless Chromium (SwiftShader), 1440×900, through `run-game`'s `drive.mjs`, on the Ventfront
Divide with the Consortium's opening force. One Light Scout, starting at 600 m over ground
about 700 m down, is driven with the player's own mouse and keys
([ui-ux.md](../../ui-ux.md) §9, "A click is a point in the water").

| Frame | Camera | Shows |
| --- | --- | --- |
| [home-card](home-card.png) | 55°, dolly 2,600, focus on the seabed | The squad card with no Dive, Rise or Follow and the deselect back on it; the hint bar's `L+R drag depth`; the ribbon's focus chevron just below the scout's marker |
| [focus-raised](focus-raised.png) | Same, after a left + right drag 40 px down | The chevron 200 m up, at 494 m |
| [alt-preview](alt-preview.png) | Same, `Alt` held over open water | The preview mark at 494 m and `RISE 7s` on the readout |
| [queued-leg](queued-leg.png) | Same, after a right click there and a `Shift` + right click west of the base, one `Shift` + wheel notch higher | The scout on its first leg, `rising to 494m`; the queued leg's route on the floor and its ring at 344 m on a plumb line |
| [in-the-water-low](in-the-water-low.png) | 18°, dolly 1,400, focus at the scout | The scout holding 344 m in open water, its plumb line to the ground |
| [following-floor](following-floor.png) | 55°, after `Home` and a right click on the ground | The card reading `FOLLOWING FLOOR · 670m`, and the dive logged as the scout going loud |

```bash
node .claude/skills/run-game/scripts/drive.mjs --out <dir> \
  --steps docs/screenshots/issue-1132/drive.mjs
```

[readings.json](readings.json) holds the drive's own record. The drag took the focus from
the seabed to 494 m and the wheel notch to 344 m. Ordered there, the scout held 494 m on its
first leg, then climbed at 15 m/s to 344 m on the queued one and held it. The click on the
ground dived it at 45 m/s to 670 m, 30 m over the floor, and it held there, following.

The first takes put the first point over the Foundry. A hull ordered over a structure never
reaches the point, whatever its depth, because separation pushes it off the footprint in plan;
the leg never ends, and nothing queued behind it begins. That predates this change and is filed
as #1214 against #746 rather than fixed here.
