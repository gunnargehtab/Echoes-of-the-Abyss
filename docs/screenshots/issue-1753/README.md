# Free water: the vertical command instruments (#1753)

Evidence for the vertical command part of the feel pass
([free-water-slice.md §9](../../free-water-slice.md#9-feel-pass-the-approved-look-target),
"Vertical command"), as [ui-ux.md §9](../../ui-ux.md#9-selection-orders-controls) and
[free-camera.md §4](../../free-camera.md#4-the-shipped-orbit-camera--spec) now record it.
Four instruments, all study-only: stalks from own hulls and Tier 3+ contacts to the
command plane; a section scope beside the plan scope that is also MOVE 3D's alternate depth
picker; edge marks for earned contacts off the frame; and the orbit's pitch band widened to
−60°–88°. The arithmetic is `packages/frontend/src/game/verticalCommand.ts`; the band is
`STUDY_PITCH_MIN_DEG` in `PerspectiveView.ts`.

## Reproduce

Run the dev servers, then the frames module. It shoots the frame the study opens on, the
four §9 poses with the HUD on, and then the instruments' own frames, and writes the probe's
reading of each beside it:

```bash
node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1753/after --steps docs/screenshots/issue-1753/frames.mjs
```

The before frames for the four §9 poses are [issue-1752/after](../issue-1752/README.md),
captured at 4919493d4 with the same poses and no instruments. The set here was captured on
SwiftShader at 1440 × 900 and DPR 1, so the readings carry draw calls and triangles and no
GPU timing; the GPU rows stay with `docs/screenshots/issue-1713/gpu.mjs` on named hardware.
The crater fixture seats one player and has no contacts, so the contact stalks and the edge
marks are proven by `packages/frontend/test/verticalCommand.test.ts` against the canned
match, not by a frame.

## The frames

| Row | Frame | Reads as |
| --- | --- | --- |
| Opening, as the study opens | [01-opening](after/01-opening.png) | The §9 opening with the SECTION block beside the scope: the slice along the 034° heading, the garden's 400 m floor ahead, the hulls' three dots at 300 m, and the plane line at the raised focus's 300 m. The hulls stand on the plane, so each carries a foot ring and no line |
| Opening pose, set explicitly | [02-opening-pose](after/02-opening-pose.png) | The same frame, read back as 326° (−34°), 15°, 1,200 m, focus 300 m |
| Garden close, 1,875 / 1,125, 250 m, 12°, 275 m, `yawDeg` 90 | [03-garden-close](after/03-garden-close.png) | The forest on both flanks; the two hulls in frame hang 25 m below the 275 m plane, a short dashed stalk each up to its foot ring |
| Low, 2,000 / 2,000, 1,600 m, 12°, 850 m | [04-low](after/04-low.png) | The plane at 850 m: the hulls are out of frame to the west, and on the section their dots stand 550 m above the plane line over the bowl's stepped profile |
| Survey, 2,000 / 2,000, 10,000 m, 88°, seabed | [05-survey](after/05-survey.png) | No plane on the seabed, so no stalks and no plane line; the ink unchanged |
| Stalks above the plane: the opening pose, focus 600 m | [06-stalks-above](after/06-stalks-above.png) | Nothing selected, so the raised focus is the plane; the three hulls at 300 m stand 286 m above it (the focus clamps to the drawn seabed, 586 m) and each draws a solid hairline down to a foot ring on the plane |
| Stalks below the plane: the opening pose, focus 150 m | [07-stalks-below](after/07-stalks-below.png) | The same hulls 150 m below the plane: a dashed hairline up to the foot ring, the side read by line style and never by hue |
| Bowl look-up, 1,250 / 2,250, 300 m, −60°, 300 m, `yawDeg` 90 | [08-bowl-lookup](after/08-bowl-lookup.png) | The band's floor, proven: the probe reads −60°, the eye at 1,480 m under a 300 m focus, in the water looking up. The frame is water and snow because the reach at a 300 m dolly is 600 m (#1749), and the rim wall stands farther than that; the section still reads the slope ahead |
| Garden look-up, 2,000 / 1,400, 400 m, −45°, 300 m, `yawDeg` 180 | [09-garden-lookup](after/09-garden-lookup.png) | What §4 predicts over the garden: the rig at −45°, the clamp holding the eye 25 m over the 400 m floor at 382 m, so the gaze is a few degrees up, through the stands at canopy height |
| Bowl level, the look-up pose at the shipped floor, 10° | [10-bowl-level](after/10-bowl-level.png) | The pair for the look-up: from 65 m the hulls on the rim ahead, each with its foot ring on the 300 m plane |
| Depth pick: the low pose, army selected, MOVE 3D pinned at 2,000 / 2,000, the section pressed three quarters down | [11-depth-pick](after/11-depth-pick.png) | The destination depth reads 2,250 m in the panel, the section marks it with a cross under the plane line at the lead hull's 300 m, and the tether in the world runs to the pinned point |

The opening pose and the garden close, low and survey rows are §9's four frames, with
the instruments on them as §9 asks of #1753; #1752 recaptures them for the owner's
re-acceptance.
