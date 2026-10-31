# #1695 — the court's two refusals

[sorrowgate-arch-study.md](../../sorrowgate-arch-study.md) §9 asks to "demonstrate sonar and
construction refusal separately, with their real feedback, rather than triggering either to
improve the frame". Neither #1637's evidence nor #1674's had it. These frames are that
demonstration.

Every frame is the real client at `346b4771`, 1920 × 1080 at device pixel ratio 1, default
settings, the HUD on. The court half is one session through Tutorial → briefing → Descend with
`?arch-study=1` on the title URL; the control half is one standard `ventfront-divide` skirmish.
The camera is the one each session opened on (pitch 55°, yaw 0°, distance 2,600) and is never
moved, so neither press is staged for the frame. [`refusals.mjs`](refusals.mjs) is the
`--steps` module, and its header gives the command. The rasteriser is SwiftShader, so no frame
time is recorded.

## What a press gets in the court

The module selects the flight with a marquee, presses P, waits out the hint bar's four
seconds, presses R, then left-clicks one fixed point of the view (55 %, 40 %), where an armed
placement would land. It logs every message the page sends on the room's socket from the first
press on. `court.json` and `control.json` carry the log, each frame's tick and the opening
probe.

| Frame | Court (`court-*.png`) | Control (`control-*.png`) |
| --- | --- | --- |
| `selected` | Light Scout +5 selected, SIG 018. The orders panel lists seven actions withheld, active sonar and construction among them, and the PING button is greyed | Light Scout +3 selected; PING live |
| `after-P` | The hint bar reads "disabled — the array was pulled with the hardpoints". SIG stays 018, no ring is drawn, and the socket sent nothing | SIG 095 and the ping ring; the socket sent `ping` |
| `after-R` | The hint bar reads "the court's water is not yours to build in". Nothing is armed: the bar offers no CANCEL | The hint bar reads "placing Nodule Refinery (300 nodules)", and the bar offers CANCEL REF 300 |
| `after-click` | The click lands on a scout's collar and selects it, so the large ring is that hull's own (ui-ux.md §3.5), not a ping; the socket sent nothing | The click spends the armed placement at the Foundry's edge: the socket sent `build`. No refinery stands and nodules still read 750, so the room refused that site, silently (`wire.ts`) |

So each refusal is the shell's, with the mission's reason on the hint bar, as
[mission-sorrowgate.md](../../mission-sorrowgate.md) §3 and [ui-ux.md](../../ui-ux.md) §7 ask.
Nothing reaches the room, and neither press changes anything but the hint bar. Had a `build`
reached it, the room would refuse it too: `Match.build` asks `missionDenies` first. The
interface cue that would also sound ([audio-direction.md](../../audio-direction.md) §12) is off
by default and was not turned on. The control proves the log: the same module in a skirmish
records both messages.

## Not shown here

The `after-click` frame's hint bar, with one scout selected, still offers `W attack-move`,
`CTRL+RMB torpedo` and `P ping`, all three refused in the court. That is a §7 fault of its
own, filed as #1701.
