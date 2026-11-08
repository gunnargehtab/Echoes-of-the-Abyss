# Free water: the crater as ground from above (#1774)

Evidence for the crater-walls part of the feel pass as #1774 amends it
([free-water-slice.md §9](../../free-water-slice.md#9-feel-pass-the-approved-look-target),
"Crater walls"), and for the study's clause in [map-visuals.md](../../map-visuals.md) §4.
Study-only. The drawn ground rounds the cells' staircase between their centres
(`roundedCells.ts`, and `erodedGroundAtM` in `packages/frontend/src/game/seabed.ts`), on a
mesh of 8 vertices a cell where a shipped map draws 4. Coral's relief is cut into wandering
benches rather than sampled on 90 m blocks (`benchedDetailM`). The survey ink draws its
coastlines on the drawn ground's edges and contours its floor from the seabed bake
(`installSurveyInk`'s drawn pass in `surveyInk.ts`). Every centre keeps its authored floor
and kind, and every shipped map draws as it did.

## Reproduce

Run the dev servers, then the frames module. It walks §9's survey and low poses and three
of its own, ends on a pan across the bowl, and writes the probe's reading of each frame
beside it:

```bash
node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1774/after --steps docs/screenshots/issue-1774/frames.mjs
SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' FRAMES=survey,low PAN=0 \
  node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1774/reduced-motion --steps docs/screenshots/issue-1774/frames.mjs
CONTROL=1 node .claude/skills/run-game/scripts/drive.mjs \
  --url 'http://localhost:5173/?map=kelp-labyrinth' \
  --out docs/screenshots/issue-1774/control-after --steps docs/screenshots/issue-1774/frames.mjs
```

`before/` and `control-before/` are the same runs with `packages/frontend/src` at
`4abd233da`, main's head when this branch merged it, #1773's kelp included. Every set was
taken headless under SwiftShader at 1,440 × 900 and DPR 1, as each `readings.json`
records. The ground sits at 5–10% luminance under the study's water, so open the frames at
full size, or lift them, to compare the ground.

## The frames

| Row | Before | After | Reads as |
| --- | --- | --- | --- |
| Survey, 2,000 / 2,000, 10,000 m, 88°, seabed | [before](before/01-survey.png) | [after](after/01-survey.png) | The crater as ground rather than squares. The bowl is a rounded ring and the pocket a rounded square, where they were a stepped cross; the rim is benched where it was gridded in 90 m blocks; the ink lies on the drawn edges. One corner keeps half its step: the pocket's south-west, over the cut's west jamb (Limits) |
| Low, 2,000 / 2,000, 1,600 m, 12°, 850 m | [before](before/02-low.png) | [after](after/02-low.png) | Water between the eye and the floor as before, and depth darkening downward. The garden's far edge is a worn line rather than a straight shelf, and the isobaths stack down the pocket's cliffs along their curves |
| Bowl, 2,000 / 2,000, 4,500 m, 70°, seabed | [before](before/03-bowl.png) | [after](after/03-bowl.png) | The owner's kind of pose. The walls read as cliffs that curve, their contours with them, where the cells drew boxes and their ink stepped round them |
| Wall, 2,125 / 2,875, 700 m, 14°, 900 m, `yawDeg` 180 | [before](before/04-wall.png) | [after](after/04-wall.png) | The southern wall's north face and the cut's mouth from inside the bowl: the rock uncontoured inside its coast. Near the cut nothing rounds, so the jambs keep their step on the cell edges, where the roof's curtains stand |
| Rim, 1,000 / 1,875, 700 m, 14°, 900 m, `yawDeg` 90 | [before](before/05-rim.png) | [after](after/05-rim.png) | The west rim's scarp beside START, looking west: mostly water, as before |

## What the probe read

| Pose | Calls before → after | Triangles before → after |
| --- | --- | --- |
| Survey | 45 → 45 | 568,986 → 594,970 |
| Low | 26 → 26 | 561,017 → 587,001 |
| Bowl | 45 → 45 | 568,986 → 594,970 |
| Wall | 26 → 26 | 561,017 → 587,001 |
| Rim | 44 → 44 | 568,586 → 593,674 |
| Control, survey | 76 → 76 | 163,878 → 163,878 |
| Control, low | 75 → 75 | 160,006 → 160,006 |

`ground.eroded` reads true at every study pose and false on the control, before and after.
The study's ground is one mesh, as before, at twice the density: its 8,192 triangles
become 32,768. The map's skirt (512) and the roof over the cut (448, drawn twice as a
translucent two-sided mesh) stand on its vertices and take the rest of the 25,984; the rim
pose has the roof out of view. Every pose stays under the study's 720,000
(free-water-slice §7). The ink is drawn in the ground's own shader, so the rounding adds no call.

## Gate 7: the ink alone

At the survey dolly gate 7 asks one question of the ground: from the ink alone, can you
name the plateau, the trench and the rock ([graphics-standards.md](../../graphics-standards.md),
gate 7)?

- **Survey, [after/01-survey.png](after/01-survey.png): yes.** The trench is the pocket at
  2,400 m: the field ringed by the densest bands, where the floor falls 900 m, and under
  the garden 2,000 m, in 80 m. The
  plateaus are the garden at 400 m and the rim's shelf at 600 m: fields with no line
  inside them, each ringed by its edge's lines. The rock is the wall: the field inside a
  solid coastline with no isobath (rule 7), the cut's passage through it.
- **Low, [after/02-low.png](after/02-low.png), 12°: the plateau and the trench.** The
  garden is the far flat, its lip one line, and the pocket's isobaths stack down its
  cliffs. The rock is behind the eye at yaw 0. The wall frame, at 14° looking south, shows
  it: stone inside its coast, uncontoured.

## Motion, reduced motion and the control

- **Motion.** A continuous middle-drag pan across the bowl pose while the match runs, 40 px
  of drag a frame, four frames: [bowl-pan-0](after/06-bowl-pan-0.png) to
  [bowl-pan-3](after/09-bowl-pan-3.png), with the page clock and the focus per frame in
  `readings.json`. The ground is static geometry, so its ink and edges move with the
  camera and nothing else.
- **Reduced motion.** [reduced-motion/01-survey.png](reduced-motion/01-survey.png) and
  [02-low.png](reduced-motion/02-low.png): they differ from `after/` only by the sway and
  the snow.
- **Kelp Labyrinth control.** [control-before](control-before/02-survey.png) and
  [control-after](control-after/02-survey.png) at the survey and low poses: the same calls
  and triangles. The frames differ by the live match, a contact's ring and log line, and by
  the camera's sway, which moves every edge by a pixel. `perspectiveTerrain.test.ts`,
  `seabedRegion.test.ts` and `surveyInk.test.ts` hold the stronger claim, that a shipped
  map's grid, skin and pass are the shipped ones to the bit.

## Gate 6 on hardware

Not read. The GPU rows (`docs/screenshots/issue-1713/gpu.mjs`, DPR 1 and 1.5 on named
hardware) need a GPU, and this session had SwiftShader and no computer to reach. What the
study's frame adds, counted: no call; 25,984 triangles; one float texture of the survey
floor, 512 × 512, 1,048,576 bytes, which free-water-slice §4 now allows; and on each
terrain fragment, four texel fetches and six biome fields' derivatives. The arch study
read fragment work of this kind as GPU time on and off (graphics-standards.md, gate 6),
and that reading is owed.

## Limits

- **The pocket's south-west corner keeps half its step.** It stands a cell from the roofed
  cut, where nothing rounds within half a cell and the rounding eases in over the next, so
  the corner over the west jamb rounds half way. The south-east corner, two cells off,
  rounds whole.
- **The bowl's rim is not the circle.** Its edge is a curve within 34 m of the authored
  1,250 m circle, where the cells stair up to 129 m off it: up to 10 m outside it 13°
  off the axes and 34 m inside it 30° off them, so the rim reads a little square.
- **The pocket stays a rounded square.** Its ellipse is six cells across, and a 115 m
  licence rounds its corners without making it a circle.
- **Steep curved cliffs still waver by about a pixel.** The ink contours the bake's 7.8 m
  floor and lies on a mesh 31.25 m apart, so on an 80 m scarp seen at 70° a line swings
  with the mesh's error. At 62.5 m the swing was a saw-tooth (Mesh, §9).
- **A plain's foot isobath steps at the bake's pixels.** The line half a metre past a
  plain's depth runs along the foot of each ramp, where the floor turns from flat to
  sloping. Contoured from the bake's 7.8 m samples it steps by a sample where it crosses
  them at an angle. Every other isobath is mid-ramp and smooth.
- **At a corner the roof holds, the coastline is half a line for one triangle.** There all
  three of a mesh triangle's vertices lie on the coast, so its field reads nothing. The
  pass draws no line in it rather than inking the triangle whole, and its neighbours draw
  their half.

## Tests

- `perspectiveTerrain.test.ts`, "the rounded ground": each centre's floor, kind and biome;
  the positive control; the finer mesh; the step between the cells within a cell; no seam but the
  jambs; no edge past the licence; the bowl's rim near its circle and without the stair's
  kinks; the roof's hold; the jamb; the wall's foot and lip; the ink's fields at every
  vertex; the cells as the only input (§4 rule 2); the delta path; the forgotten terrain;
  the benches.
- `roundedCells.test.ts`: a straight edge moves nowhere, a corner rounds inside the
  licence, each centre keeps its kind with the margin to spare, a lone cell bends the edge
  round its centre, and a T settles into a Y.
- `passages.test.ts`: the roof walks the study's finer grid, a curtain's foot on each of
  its vertices. `flightCamera.test.ts`: the flight eye clears the drawn ground.
- `surveyInk.test.ts`, "the study's pass", and `seabedRegion.test.ts`, the bake's floor.
