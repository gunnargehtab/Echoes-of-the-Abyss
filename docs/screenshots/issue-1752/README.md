# Free water: the opening view and the study HUD (#1752)

Evidence for the opening-view and HUD parts of the feel pass
([free-water-slice.md §9](../../free-water-slice.md#9-feel-pass-the-approved-look-target),
"Opening view"), and the re-acceptance set its "Frames and the last gate" asks of #1752.
Three changes, all study-only: the orbit opens low behind the fleet on the first sight of
the force (`openStudy` in `packages/frontend/src/game/EchoRenderer.ts`, the pose
`FREE_WATER_OPENING` in `packages/shared/src/constants.ts`); the decorative-life legend
is one unboxed line in the bottom-right corner; and FLIGHT, NAV and HOME stand beside the
console's command block, placed off the console's own layout (`consoleLayout.ts`), and the
hint line yields to the legend on its row. Home, flight, NAV, survey ink and the study-off
opening are unchanged.

## Reproduce

Run the dev servers, then the frames module. It shoots the frame the study opens on with
no camera call, then Home from it, then FLIGHT from the opening pose set again and NAV
from the Home pose that leaving flight leaves, then the four §9 poses set explicitly, and writes the probe's reading of each frame beside
it, with where the panel, the legend and the hint line stand in the window:

```bash
node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1752/after --steps docs/screenshots/issue-1752/frames.mjs
SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' FRAMES=none HUD=0 \
  node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1752/reduced-motion --steps docs/screenshots/issue-1752/frames.mjs
SETTINGS_JSON='{"uiScale":2}' FRAMES=none HUD=0 \
  node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1752/scale-154 --steps docs/screenshots/issue-1752/frames.mjs
CONTROL=1 node .claude/skills/run-game/scripts/drive.mjs \
  --url 'http://localhost:5173/?map=kelp-labyrinth' \
  --out docs/screenshots/issue-1752/control-after --steps docs/screenshots/issue-1752/frames.mjs
```

`before/` and `control-before/` are the same runs against the base commit (c3cef4927).
The after, reduced-motion and control sets were captured at 4919493d4, and the 154% set at 1dc01e780, which gave the legend its own path to the hint line and changes no other frame; the first after set, at c89f9bd1f, had the legend over the hint's end above about 122% UI scale, which round 1's critic measured, and was replaced.

## The frames

| Row | Before | After | Reads as |
| --- | --- | --- | --- |
| Opening, as the study opens: no camera call | [before](before/01-opening.png) | [after](after/01-opening.png) | Before: Home pitch over the fleet from 2,600 m, the legend boxed over the top centre. After: the three hulls in the lower third, the garden canopy beyond them at the top right, water rather than clear colour above the far rim, and the legend as one line in its corner |
| Opening pose, set explicitly: 709 / 1,710, 1,200 m, 15°, 300 m, `yawDeg` −34 | [before](before/05-opening-pose.png) | [after](after/05-opening-pose.png) | The same frame as the row above in `after/`: the opening is §9's pose, read back by the probe as 326° (−34°), 15°, 1,200 m, focus 709 / 1,710 at 300 m |
| Home, the Home key pressed on the opening frame | [before](before/04-home.png) | [after](after/02-home.png) | North, 55° and the seabed, keeping the 1,200 m dolly and the place, as Home keeps any |
| Flight, F8 from the opening pose | [before](before/02-flight.png) | [after](after/03-flight.png) | Entry takes the command focus, since the orbit eye is above the Lid: EYE 300 m, bearing 34°, the garden ahead. The readout stands with its buttons beside the command block |
| NAV, F9 after leaving flight | [before](before/03-nav.png) | [after](after/04-nav.png) | The status line and the twelve motion buttons, grown upward from the same foot and exactly the command block's width |
| Opening at 154% UI scale, the most a 900 px window holds | none: the legend was boxed over the top centre | [scale-154](scale-154/01-opening.png) | The hint line trimmed to "LMB drag select · MMB pan · L+R drag depth", ending at x=783, and the legend from x=985: the hint yields to the panel on its row rather than running under it. The larger console reaches the fleet: one hull behind the hint's first clause, one beside the panel's left edge above the row, the third under the console's top edge with its ring showing |
| Garden close, 1,875 / 1,125, 250 m, 12°, 275 m, `yawDeg` 90 | [before](before/06-garden-close.png) | [after](after/06-garden-close.png) | One forest on both flanks of a bare clearing (#1751); the panel and the legend in their places |
| Low, 2,000 / 2,000, 1,600 m, 12°, 850 m | [before](before/07-low.png) | [after](after/07-low.png) | Water between the eye and the floor, the bowl's edges eroded (#1749, #1750) |
| Survey, 2,000 / 2,000, 10,000 m, 88°, seabed | [before](before/08-survey.png) | [after](after/08-survey.png) | Decoration below tactical ink, the ink unchanged |

The opening pose and the last three rows are §9's four frames, captured with the HUD on.
They predate #1753, which was open when the owner asked for this issue in the session the
pull request links, and which adds its instruments to the same four frames. So `after/` is
not the set the owner re-accepts on #1694; `re-acceptance/` below is.
The opening dolly leaves the orbit eye 1,110 m above the Lid, as the Home frame's eye is
about 9,100 m above it: with a 40° field of view and the console over the bottom quarter of the
window, a nearer eye at 15° loses the hulls under the console, and a focus nearer the
centroid lifts them to the centre, so the offset and the dolly are TUNABLEs chosen here.

## The re-acceptance set

`re-acceptance/` is the same run as `after/`, taken at 5fcce335b, the head of `main` once
the merge of #1753 (abd4d8089) had landed, so these frames carry every child of the feel
pass: #1749's water, #1750's walls, #1751's forest, #1753's instruments and this issue's
opening and HUD. Two merges outside the pass are on that head too: #1759, which runs a
square passage's route between its mouths, so the cut's route line in the survey frame
stands north–south where `after/` drew it east–west, and #1762, which stands the mission
log's foot above the hint row and draws nothing in the study.
It is the set §9's "Frames and the last gate" asks #1752 to capture for the owner's
re-acceptance on #1694, the pass's last gate. The four rows below are §9's four frames,
each with the HUD on; the other four frames in the directory are the HUD states, for the
record.

| Frame | Pose | Must read as (§9) | What the frame shows |
| --- | --- | --- | --- |
| [05-opening-pose](re-acceptance/05-opening-pose.png) | 709 / 1,710, 1,200 m, 15°, 300 m, `yawDeg` −34 | The three hulls in the lower third, the garden canopy beyond them, water rather than clear colour above the far rim, and the legend as one line in its corner | The hulls under their rings in the lower third of the water above the console, each with a foot ring on the 300 m plane and no stalk, the canopy's crest along the top right, haze between the eye and the rim, the legend in the bottom-right corner, and the SECTION block beside the scope reading the 034° slice |
| [06-garden-close](re-acceptance/06-garden-close.png) | 1,875 / 1,125, 250 m, 12°, 275 m, `yawDeg` 90 | Kelp at canonical scale as one forest on both flanks of a bare clearing, with near stands separated from far ones by the water | Stands on both flanks with the clearing bare between them, the far stands greyed by the 600 m reach, and two hull rings at the top left, 25 m under the plane |
| [07-low](re-acceptance/07-low.png) | 2,000 / 2,000, 1,600 m, 12°, 850 m | Water visibly between the eye and the floor, the bowl's drawn edges as eroded rock terraces rather than 250 m boxes under unchanged ink, and depth still darkening downward | Snow and haze over the bowl, its terraces stepped rather than boxed under the isobaths, the floor darkening toward the pocket, and the section's stepped profile under the 850 m plane line |
| [08-survey](re-acceptance/08-survey.png) | 2,000 / 2,000, 10,000 m, 88°, seabed | Decoration below tactical ink, own hulls and contacts readable, and the ink unchanged: coastlines on the cell edges and isobaths of the authored floor ([map-visuals.md](../../map-visuals.md) §4) | The three hulls and their rings on the west rim over the dimmed forest and bowl, the cell-edge coastlines and isobaths as before, the cut's route line turned by #1759, and no plane line or stalk, since the focus is on the seabed |

[re-acceptance/readings.json](re-acceptance/readings.json) reads each pose back as the
table gives it, and every calls and triangles figure is the number
[#1753's after set](../issue-1753/after/readings.json) read at the same pose: 43 / 547,546
at the opening, 30 / 544,863 at garden close, 25 / 539,967 low and 44 / 547,936 at survey.
SwiftShader at 1,440 × 900 and DPR 1, motion on, so no millisecond is read. This issue's
GPU rows stand in "Hardware" below, read in #1766 against c48618e9; #1753 recorded none,
its README leaving them to `gpu.mjs` on named hardware, and they stay #1753's debt. The
HUD table in "Where the HUD stands" is `after/`'s: #1753's SECTION block moved the command
block 60 px left, so in every `re-acceptance/` reading the camera panel spans 674..866,
and 674..1054 in NAV, still on the block's left edge (`--commands-x`).

## Where the HUD stands

| Element | Before | After |
| --- | --- | --- |
| Camera panel, collapsed | 566..874 × 62..192, boxed over the top centre, the legend its first line | 734..926 × 618..668, on the hint line above the command block (734..1114), on its left edge |
| Camera panel, in flight | 566..874 × 62..224 | 734..926 × 586..668, grown upward |
| Camera panel, in NAV | 566..874 × 62..432 | 734..1114 × 378..668, grown upward, the block's own 380 px with border and padding inside it |
| Legend | inside the panel | 1132..1428 × 671..689: one line, no box, right-aligned on the hint line's row |
| Hint line | 176..870 | 176..870, the whole line: the legend starts 262 px past its end |
| At 154%: panel, legend, hint | | 764..956 × 492..542 beside the command block, which the narrower HUD has moved to 764; the legend 985..1422 × 547..575; the hint 271..783, trimmed to three clauses, 202 px short of the legend |

At 1,440 × 900, read off `getBoundingClientRect` and the hint's own probe in each
`readings.json`. The panel's left edge follows `--commands-x`, the command block's own
left edge from `consoleBlocks`, which the console draws from too: at 154% the HUD is 935
units wide, the fleet and production blocks are dropped, and the panel moves with the
block. Its foot stands on `--hint-row-units`, where the hint line's row begins, so the hulls
of the opening frame sit above it; the corvette's loudness ring at the right edge of that
frame touches the panel's corner. The legend reaches the renderer by its own path
(`HINT_ROW_PANELS` in `panelRects.ts`, `setHintRowPanels`), and the hint trims a clause at
a time to clear it; the floating panels over the water are not read, since the mission
log's foot stands 8 units into the row and a hint on a mission map is not the study's to
cut. `rendererSmoke.test.ts` holds it on the real class: the floating panels take nothing,
a hint-row rect off the row takes nothing, one on the row trims from the end with a gap.

## What the probe read

| Pose | Yaw, pitch, dolly, focus depth before → after | Calls before → after | Triangles before → after |
| --- | --- | --- | --- |
| Opening | 0°, 55°, 2,600 m, seabed → 326°, 15°, 1,200 m, 300 m | 43 → 43 | 547,936 → 547,546 |
| Home | 0°, 55°, 2,600 m, seabed → 0°, 55°, 1,200 m, seabed | 43 → 43 | 547,936 → 547,546 |
| Garden close | unchanged | 30 → 30 | 544,863 → 544,863 |
| Low | unchanged | 25 → 25 | 539,967 → 539,967 |
| Survey | unchanged | 44 → 44 | 547,936 → 547,936 |
| Control, opening | 0°, 55°, 2,600 m, seabed, unchanged | 74 → 74 | 160,006 → 160,006 |
| Control, low | unchanged | 75 → 75 | 160,006 → 160,006 |
| Control, survey | unchanged | 78 → 76 | 163,878 → 163,878 |

The opening frame costs no more than the Home frame did: the same calls, 390 triangles
fewer. The control's survey calls differ by two within the sway, as #1749's and #1750's
controls did; its triangles and its opening frame are the same to the number.

## Motion, reduced motion and the control

- **Motion.** The match runs through every frame; the HUD rows are three states of one
  live camera, taken by the keys in turn.
- **Reduced motion.** [reduced-motion/01-opening.png](reduced-motion/01-opening.png): the
  opening with the sway held (`sway: held` in its `readings.json`), the same pose.
- **Accessibility.** `flightPanel.test.ts` holds FLIGHT, NAV and HOME in their order under
  the panel's `aria-label`, the EYE readout and NO CAMERA CLEARANCE in flight only, and the
  NAV status line and motion buttons in NAV only. `rendererSmoke.test.ts` keeps #1713's
  checks: the NAV latch, Enter never confirming from a stored binding, blur and menu
  release, and the one-handed fleet layout outside NAV. The hint stays readable at every
  UI scale: the row above and the 154% frame.
- **Kelp Labyrinth control.** [control-before](control-before/readings.json) and
  [control-after](control-after/readings.json): the study off, the match opens on the
  Home frame over the force as it did, with no panel and no legend.
  `rendererSmoke.test.ts` holds the stronger claim on the real class: with the study off
  the opening is the Home frame, as before, and with it on, §9's pose.

## Hardware

The frames above come from a software rasteriser (SwiftShader, in each `readings.json`),
so they carry no millisecond. The GPU rows below are `docs/screenshots/issue-1713/gpu.mjs`
run as its README says: an NVIDIA GeForce GTX 1070 through Edge/ANGLE D3D11, unpaced,
animation running, every window at least 240 samples. Each revision was read twice at each
DPR, interleaved with #1751's, and the table gives the mean of the two runs. `before` is
the base, c3cef492, whose runs are
[#1751's after](../issue-1751/README.md#hardware); `after` is the merge, c48618e9, in
`gpu/after/dpr-{1,1.5}/run-{1,2}.json`, for example
[gpu/after/dpr-1/run-1.json](gpu/after/dpr-1/run-1.json).

| Station | Calls | DPR 1 GPU / queued ms, before → after | DPR 1.5 GPU / queued ms, before → after |
| --- | --- | --- | --- |
| Home | 43 → 43 | 1.17 / 1.07 → 1.15 / 1.07 | 1.89 / 1.81 → 1.89 / 1.82 |
| Garden close | 22 → 22 | 1.28 / 1.18 → 1.29 / 1.18 | 2.01 / 2.05 → 2.05 / 2.07 |
| Low | 25 → 25 | 1.05 / 0.98 → 1.07 / 0.99 | 1.52 / 1.49 → 1.53 / 1.47 |
| Survey | 44 → 44 | 1.09 / 0.90 → 1.07 / 0.90 | 1.59 / 1.46 → 1.52 / 1.45 |

Queued time moves −0.02 to +0.02 ms, inside the 0.04 ms two runs of one revision differ
by, and calls and triangles are unchanged (547,936 / 539,567 / 539,967 / 547,936). That is
what the change predicts at these stations: `gpu.mjs` pins its own four poses, so the new
opening pose is not one of them, and the HUD's layout is drawn by the overlay, not by the
world's passes these timers read. Queue loads read 3.68–3.82 ms, each longer than the
frame it measures.
