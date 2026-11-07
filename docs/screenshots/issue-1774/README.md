# Free water: the crater as ground from above (#1774)

Evidence for the crater-walls part of the feel pass as #1774 amends it
([free-water-slice.md §9](../../free-water-slice.md#9-feel-pass-the-approved-look-target),
"Crater walls"), and for the study's clause in [map-visuals.md](../../map-visuals.md) §4.
Study-only. The drawn ground rounds the cells' staircase between their centres
(`roundedCells.ts`, and `erodedGroundAtM` in `packages/frontend/src/game/seabed.ts`). Coral's
relief is cut into wandering benches rather than sampled on 90 m blocks (`benchedDetailM`).
The survey ink draws its coastlines on the drawn ground's edges and contours its floor
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
| Survey, 2,000 / 2,000, 10,000 m, 88°, seabed | [before](before/01-survey.png) | [after](after/01-survey.png) | The crater as ground rather than squares. The bowl and the pocket are rounded where they were a stepped cross and a square, the rim is benched where it was gridded in 90 m blocks, the wall's corners are worn, and the ink lies on the drawn edges with no 250 m staircase |
| Low, 2,000 / 2,000, 1,600 m, 12°, 850 m | [before](before/02-low.png) | [after](after/02-low.png) | Water between the eye and the floor as before, and depth darkening downward. The garden's far edge is a worn line rather than a straight shelf, and the isobaths under the snow follow the ground's curves |
| Bowl, 2,000 / 2,000, 4,500 m, 70°, seabed | [before](before/03-bowl.png) | [after](after/03-bowl.png) | The owner's kind of pose. The walls read as cliffs whose contours follow their curves, where the cells drew boxes and their ink stepped round them |
| Wall, 2,125 / 2,875, 700 m, 14°, 900 m, `yawDeg` 180 | [before](before/04-wall.png) | [after](after/04-wall.png) | The southern wall's north face and the cut's mouth from inside the bowl. Within half a cell of the cut nothing rounds, so the jambs keep their step on the cell edges, where the roof's curtains stand |
| Rim, 1,000 / 1,875, 700 m, 14°, 900 m, `yawDeg` 90 | [before](before/05-rim.png) | [after](after/05-rim.png) | The west rim's scarp beside START, looking west: mostly water, as before |

## What the probe read

| Pose | Calls before → after | Triangles before → after |
| --- | --- | --- |
| Survey | 45 → 45 | 568,986 → 568,986 |
| Low | 26 → 26 | 561,017 → 561,017 |
| Bowl | 45 → 45 | 568,986 → 568,986 |
| Wall | 26 → 26 | 561,017 → 561,017 |
| Rim | 44 → 44 | 568,586 → 568,586 |
| Control, survey | 76 → 76 | 163,878 → 163,878 |
| Control, low | 75 → 75 | 160,006 → 160,006 |

`ground.eroded` reads true at every study pose and false on the control, before and after.
The terrain is one mesh of the same vertex count whatever its heights, and the ink is
drawn in its own shader, so the rounding adds no call and no triangle.

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
study's frame adds, counted: no call and no triangle; one float texture of the survey
floor, 512 × 512 (1 MB); and on each terrain fragment, four texel fetches and six biome
fields' derivatives. The arch study read fragment work of this kind as GPU time on and off
(graphics-standards.md, gate 6), and that reading is owed.

## Limits

- **A plain's foot isobath steps at the bake's pixels.** The line half a metre past a
  plain's depth runs along the foot of each ramp, where the floor turns from flat to
  sloping. Contoured from the bake's 7.8 m samples it steps by a sample where it crosses
  them at an angle: a pixel at the survey pose, two or three at the bowl's. Every other
  isobath is mid-ramp and smooth.
- **The pocket stays a rounded square.** Its ellipse is six cells across, and a 50 m
  licence rounds its corners without making it a circle.
- **At a corner the roof holds, the coastline is half a line for one triangle.** There all
  three of a mesh triangle's vertices lie on the coast, so its field reads nothing. The
  pass draws no line in it rather than inking the triangle whole, and its neighbours draw
  their half.

## Tests

- `perspectiveTerrain.test.ts`, "the rounded ground": each centre's floor, kind and biome;
  the positive control; the step between its four centres; no seam but the jambs; no edge
  past the licence; the bowl's rim as a curve; the roof's hold; the jamb; the wall's foot
  and lip; the ink's fields at every vertex; the cells as the only input (§4 rule 2); the
  delta path; the forgotten terrain; the benches.
- `roundedCells.test.ts`: a straight edge moves nowhere, a corner rounds inside the
  licence, each centre keeps its kind, and a T settles into a Y.
- `surveyInk.test.ts`, "the study's pass", and `seabedRegion.test.ts`, the bake's floor.
