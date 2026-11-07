# Free water: the altitude lines off the hulls (#1772)

Evidence for §9's "Vertical command" as #1772 amends it
([free-water-slice.md §9](../../free-water-slice.md#9-feel-pass-the-approved-look-target)).
In the study nothing hangs on a plumb, and #1753's stalks have lost their lines: each own
hull and Tier 3+ contact keeps its foot ring on the command plane, and every entity keeps
its ground shadow. Shipped maps keep the plumb
([art-direction.md](../../art-direction.md), "Depth is drawn, not implied"). The switch is
`plumbsDrawn` in `packages/frontend/src/game/PerspectiveView.ts`, keyed on the look as the
study's water and ground are; the rings are `drawFootRing` in `EchoRenderer.ts`.

## Reproduce

Run the dev servers, then the frames module. It shoots the frame the study opens on, §9's
opening and garden-close poses, and the opening pose under a raised focus's plane at 600 m
and at 150 m, where #1753's stalks drew their longest lines, and writes the probe's reading
of each beside it:

```bash
node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
  --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1772/after --steps docs/screenshots/issue-1772/frames.mjs
CONTROL=1 node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
  --url 'http://localhost:5173/?map=kelp-labyrinth' \
  --out docs/screenshots/issue-1772/control-after --steps docs/screenshots/issue-1772/frames.mjs
```

The before sets are the same two commands run at `61e54efc`, main's head when this branch
was cut, into `before/` and `control-before/`. All four sets were taken headed on a GeForce
GTX 1070 (ANGLE, Direct3D 11) at 1,440 × 900 and DPR 1, as each `readings.json` records.

## The frames

| Row | Before | After | Reads as |
| --- | --- | --- | --- |
| Opening, as the study opens | [before](before/01-opening.png) | [after](after/01-opening.png) | The same frame as the opening pose below: the study opens on it |
| Opening pose, 709 / 1,710, 1,200 m, 15°, 300 m, `yawDeg` −34 | [before](before/02-opening-pose.png) | [after](after/02-opening-pose.png) | The three hulls on the 300 m plane, each wearing its foot ring over its shadow. The grey plumb under each hull is gone |
| Garden close, 1,875 / 1,125, 250 m, 12°, 275 m, `yawDeg` 90 | [before](before/03-garden-close.png) | [after](after/03-garden-close.png) | The two hulls in frame, far off at the upper left and 25 m under the plane: the short dashed stalk into each ring is gone, and the ring stays |
| Plane at 600 m, the opening pose | [before](before/04-rings-above.png) | [after](after/04-rings-above.png) | Nothing selected, so the raised focus is the plane, clamped to the drawn seabed at 586 m, and the hulls stand 286 m above it. Before, a solid stalk and a grey plumb hang from each hull; after, a ring alone lies under each, beside its shadow |
| Plane at 150 m, the opening pose | [before](before/05-rings-below.png) | [after](after/05-rings-below.png) | The hulls 150 m under the plane: the dashed stalk up to each ring is gone, and the ring stands over its hull |
| Kelp Labyrinth control: its opening, then the fleet from 900 m at 20°, the focus at the lead hull's 600 m | [02](control-before/02-opening.png), [03](control-before/03-fleet-low.png) | [02](control-after/02-opening.png), [03](control-after/03-fleet-low.png) | Unchanged: a shipped map hangs every hull on its cyan plumb (01 is its lobby, which the study skips) |

## What the probe read

| Frame | Calls before → after | Triangles, before and after |
| --- | --- | --- |
| Opening | 45 → 44 | 568,596 |
| Opening pose | 45 → 44 | 568,596 |
| Garden close | 32 → 31 | 565,913 |
| Plane at 600 m | 45 → 44 | 568,596 |
| Plane at 150 m | 45 → 44 | 568,596 |
| Control opening | 74 → 74 | 160,006 |
| Control fleet | 68 → 68 | 158,202 |

Every plumb is in one `LineSegments` (`depthCues.ts`), so each study frame draws one call
fewer. A line has no triangles, so the triangle counts hold, and the control's calls do too.

## Tests

- `packages/frontend/test/verticalCommand.test.ts`, "marks the plane under or over each own
  hull and Tier 3+ contact with a foot ring and no line": four own rings and five contact
  rings at a 1,200 m plane, and again at the Scout's 900 m once it is selected, with no
  segment in any ring's stroke.
- The same file, "hangs nothing on a plumb in the study, over the shadows a shipped map also
  draws". Read through the renderer's walk of the visible scene, a shipped look draws a plumb
  for every cue slot and the study draws none, over the same shadows. A view moved between
  looks before its session (`setLook`) takes the new look's rule both ways.
- `packages/frontend/test/depthCues.test.ts`, "takes the plumbs off as one and keeps them off
  across a growth, the shadows drawn".

Each test fails without the rule it holds: with a line drawn into the ring, without either
`plumbsShown` assignment in `PerspectiveView.ts`, or with a growth building the plumbs again
without the switch.

## Not captured

No GPU timing: the change removes one draw of a handful of line segments, and the calls are
counted above. No reduced-motion or motion pair: nothing removed or kept here moves on its
own, and a ring follows its hull as the stalk's foot did.
