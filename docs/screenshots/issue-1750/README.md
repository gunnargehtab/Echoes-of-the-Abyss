# Free water: the crater walls (#1750)

Evidence for the crater-walls part of the feel pass
([free-water-slice.md §9](../../free-water-slice.md#9-feel-pass-the-approved-look-target),
"Crater walls"). One change, study-only: under the free-water look the blend between cell
centres takes a profile per edge (`erodedGroundAtM` in `packages/frontend/src/game/seabed.ts`),
and the heightfield, the bake and the roof over the cut read it. A ramp between two open
centres climbs as a wandering scarp with a tread either side; a rock face has a foot in the
water and a lip set back into the stone; the roof's top slopes down to a lip over each
mouth (`ERODED_BROW` in `passages.ts`). Nothing moves at a cell centre, a solid cell stays
rock at its centre, the survey ink keeps tracing the authored floor, and every shipped map
reads the bilinear to the bit.

## Reproduce

Run the dev servers, then the frames module. It walks §9's four poses and three of this
issue's own, pans the wall pose, and writes the probe's reading of each frame beside it:

```bash
node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1750/after --steps docs/screenshots/issue-1750/frames.mjs
CONTROL=1 node .claude/skills/run-game/scripts/drive.mjs \
  --url 'http://localhost:5173/?map=kelp-labyrinth' \
  --out docs/screenshots/issue-1750/control-after --steps docs/screenshots/issue-1750/frames.mjs
node --import tsx docs/screenshots/issue-1750/bake.mjs
```

`before/` and `control-before/` are the same runs against the base commit (d5c8c9884).
The after sets were captured at 1badc2602, the last commit that changes what is drawn. `bake.mjs` needs no browser: it bakes the
crater's skin and samples its drawn surface from the pure functions the view draws from.

## The drawn surface, without the water

The ground in the frames below sits at 5–10% luminance under the study's water, where the
reshaping is hard to read in a still. So the surface is shown on its own first, from the
functions themselves: a hillshade of the drawn surface sampled at the bake's 7.8 m step,
plain and eroded. These are review aids, not what the game draws.

| Plain | Eroded |
| --- | --- |
| [plain-relief](bake/plain-relief.png) | [eroded-relief](bake/eroded-relief.png) |
| [plain skin, lifted ×4](bake/plain-lifted.png) | [eroded skin, lifted ×4](bake/eroded-lifted.png) |
| [plain skin](bake/plain.png) | [eroded skin](bake/eroded.png) |

In the eroded relief the bowl's rim is a wandering scarp with the Coral Ruins' 90 m
terracing on the tread above it, the pocket's edge a second scarp, the southern wall's
north and south faces a foot and a wavy lip, and the two rock blocks' corners rounded. The
jambs of the cut keep their step on the edge, where the roof's curtains stand. The skin is
the same hillshade in the bake's own colour, so the mesh and its texture agree.

## The frames

| Row | Before | After | Reads as |
| --- | --- | --- | --- |
| Low, 2,000 / 2,000, 1,600 m, 12°, 850 m | [before](before/03-low.png) | [after](after/03-low.png) | The bowl's far rim as an uneven line against the water rather than a straight shelf, with the ink unchanged under it |
| Survey, 2,000 / 2,000, 10,000 m, 88°, seabed | [before](before/04-survey.png) | [after](after/04-survey.png) | Unchanged ink: coastlines on the cell edges and isobaths of the authored floor; the fills between them follow the reshaped surface |
| Bowl, 2,000 / 2,000, 4,500 m, 70°, seabed | [before](before/05-bowl.png) | [after](after/05-bowl.png) | The owner's kind of pose. The ink stacks stay where the authored floor puts them; the shading between them and the southern wall's edges follow the eroded surface |
| Wall, 2,125 / 2,875, 700 m, 14°, 900 m, `yawDeg` 180 | [before](before/06-wall.png) | [after](after/06-wall.png) | The southern wall's north face and the cut's mouth from inside the bowl |
| Rim, 1,000 / 1,875, 700 m, 14°, 900 m, `yawDeg` 90 | [before](before/07-rim.png) | [after](after/07-rim.png) | The west rim's ramp beside START |
| Home, 542 / 1,958, 2,600 m, 55°, seabed | [before](before/01-home.png) | [after](after/01-home.png) | The opening row's before pose; the garden's rim is the one edge in frame |
| Garden close, 1,875 / 1,125, 250 m, 12°, 275 m, `yawDeg` 90 | [before](before/02-garden-close.png) | [after](after/02-garden-close.png) | Kelp on a 400 m floor with no edge in frame: unchanged |

The low row's "eroded rock terraces rather than 250 m boxes under unchanged ink" is read
against the relief above as much as the frame: at this luminance the frame shows the rim's
silhouette and the ink, and the ink is unchanged by §9's own rule. A survey frame without
the cell-edge outline is an ink change, which is the owner's decision with map-visuals.md §4
amended first, not this pass's.

## What the probe read

| Pose | `ground.eroded` before → after | Calls before → after | Triangles before → after | Reach, m |
| --- | --- | --- | --- | --- |
| Home | absent → true | 43 → 43 | 405,088 → 405,088 | 4,487 |
| Garden close | absent → true | 30 → 30 | 402,015 → 402,015 | 600 |
| Low | absent → true | 25 → 25 | 397,119 → 397,119 | 2,457 |
| Survey | absent → true | 44 → 44 | 405,088 → 405,088 | 32,000 |
| Bowl | absent → true | 44 → 44 | 405,088 → 405,088 | 10,575 |
| Wall | absent → true | 25 → 25 | 397,119 → 397,119 | 1,050 |
| Rim | absent → true | 43 → 43 | 404,688 → 404,688 | 1,050 |
| Control, low | absent → false | 75 → 75 | 160,006 → 160,006 | 5,120 |
| Control, survey | absent → false | 76 → 76 | 163,878 → 163,878 | 32,000 |

The base commit's probe has no `ground` field, so before reads absent. Prop triangles are
387,952 at every study pose, under the 400,000 reservation that binds until #1751.

Triangles and calls are the frame's whole: the terrain is one draw call and one mesh of
the same vertex count whatever its heights, and the roof the same few hundred triangles,
so the eroded ground adds no call and no triangle, and the eye lands within the sway of
where it did.

## Motion, clearance and the control

- **Motion.** A continuous middle-drag pan along the wall while the match runs, 40 px of
  drag a frame, four frames: [wall-pan-0](after/08-wall-pan-0.png) to
  [wall-pan-3](after/11-wall-pan-3.png), with the page clock, focus and eye per frame in
  `readings.json`. Reduced motion changes nothing here: the ground is static geometry and
  the sway is the camera's.
- **Clearance.** The flight eye sweeps the drawn triangles (`flightCamera.ts`), so its
  clearance follows the override. `flightCamera.test.ts` holds it on the crater: the vertex
  where the two grids differ most over open water stops a diving eye at two different
  depths, each the drawn floor's plus the clearance. The orbit's eye clamp reads the same
  function (`groundYAt`), and the props stand on it.
- **Kelp Labyrinth control.** [control-before](control-before/readings.json) and
  [control-after](control-after/readings.json) at the low and survey poses: the standard
  look reads `ground.eroded` false, and the frame's calls and triangles are the same within
  the sway. `perspectiveTerrain.test.ts` and `seabedRegion.test.ts` hold the stronger
  claim: with the switch off the grid and the skin are the shipped ones to the bit.

## Hardware and what is open

These frames come from this container's software rasteriser (SwiftShader, in each
`readings.json`), which is why no millisecond is recorded here. The study's GPU rows,
unpaced and queued at DPR 1 and 1.5 on named hardware, are
`docs/screenshots/issue-1713/gpu.mjs` run as its README says; §7 leaves that criterion
open until a GPU reads it.
