# Free water: the camera feel (#1775)

Evidence for [free-camera.md](../../free-camera.md) §4, "The study's camera feel": the
free-water study's orbit eases its steps, coasts a drag let go moving, glides its jumps,
follows a double-clicked hull at its depth, orbits on a right drag, and glides into and
out of NAV's flight. Shipped maps keep the instant camera. The feel is `cameraFeel.ts` and
the rig it moves in `PerspectiveView.ts`; its five TUNABLEs are `CAMERA_FEEL` in
`packages/shared/src/constants.ts`.

## Reproduce

Run the dev servers, then the pose module. It records the camera's pose on every frame
through one scripted gesture and writes `readings.json`, every row and a summary of each
step, beside a frame after each step:

```bash
node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1775/after --steps docs/screenshots/issue-1775/pose.mjs
CONTROL=1 node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?map=kelp-labyrinth' \
  --out docs/screenshots/issue-1775/control-after --steps docs/screenshots/issue-1775/pose.mjs
```

The before sets are the same two commands with `packages/frontend/src` and
`packages/shared/src` at `273e35171`, main's head when this branch was cut, into `before/`
and `control-before/`. All four were taken headless in this container on SwiftShader at
1,440 × 900 and DPR 1, as each `readings.json` records.

Two things about this renderer shape the readings. A frame takes 0.4 to 1.5 s, and the
study camera steps at most 0.1 s a frame, so its motion runs slower than wall time: read
the shape of each step, not its speed. And Playwright's input waits on frames, so its
moves arrive a frame apart, which reads as a hand held still, and its two clicks land past
the double-click's 320 ms. The module therefore dispatches the flicks and the double-click
in the page at a hand's pace, 16 ms a move and 90 ms between clicks.

## What the readings show

"Largest frame" is the largest share of a step's travel that any one frame took: 1 is a
cut, and a small share is motion spread over frames.

| Step | Before | After | Rule |
| --- | --- | --- | --- |
| Three wheel notches | Each notch a jump: largest frame 0.37, still after 7 frames | Eased: largest frame 0.24, arriving exactly after 11 | 3 |
| A middle-drag pan let go moving | Stops dead at the drag's 141 m | The drag's 140 m, then a 263 m coast over 17 frames to a stop | 2 |
| The same pan held still 250 ms first | 140 m, no coast | 140 m, no coast | 2 |
| A right drag let go moving | No turn: the drag is an order | Yaw 326° round to 233°: the drag's 81° and a 186° coast, just over half a turn; pitch 15° to 29.7° | Decision 3, 2 |
| A double-click on the Corvette | Selects only | Selects and follows: an 898 m glide over 6 frames (largest frame 0.24), then 0 m from the hull as drawn | Decision 2, 4 |
| The Corvette sent 363 m | The camera stays | The focus travels with it, 0 m from the hull as drawn and 17 m behind its last reported place, which leads the drawn hull on slow frames | Decision 2 |
| An arrow pan | 65 m in one frame | 65 m eased; the follow lets go | 3 |
| `Home` | Yaw and pitch cut in one frame (1) | A glide over 6 frames (largest frame 0.24) | 4 |
| NAV in | The eye cut 3,365 m to the command focus, out of the air | A glide (largest frame 0.24) | 4 |
| NAV out | Stays in flight | Glides back to the orbit it left (largest frame 0.24) | Decision 4, 4 |

The Kelp Labyrinth control is the same before and after: each notch a jump, pans that stop
in the frame they end, a right drag that never turns the camera, no follow and no NAV.

## The frames

| Step | Before | After |
| --- | --- | --- |
| The study opening | [before](before/01-opening.png) | [after](after/01-opening.png) |
| Zoomed by three notches | [before](before/02-zoomed.png) | [after](after/02-zoomed.png) |
| After the right drag | [before](before/03-orbited.png) | [after](after/03-orbited.png) |
| After the double-click | [before](before/04-following.png) | [after](after/04-following.png) |
| After the Corvette moved | [before](before/05-following-moved.png) | [after](after/05-following-moved.png) |
| `Home` | [before](before/06-home.png) | [after](after/06-home.png) |
| In NAV | [before](before/07-nav.png) | [after](after/07-nav.png) |
| Out of NAV | [before](before/08-nav-left.png) | [after](after/08-nav-left.png) |

After, the Corvette stands centred in both following frames, 363 m apart, and the scope's
camera box has moved with it. The control's frames are in `control-before/` and
`control-after/`.

## What this cannot show

How it feels at 60 frames a second on a real GPU, where a step closes 15% of its gap a
frame rather than 63%. That, and whether the five numbers are right, is the owner's hands
on it: the last gate the target names.

## Related

- [free-camera.md](../../free-camera.md) §4, "The study's camera feel" — the target
- [free-water-slice.md](../../free-water-slice.md) §6 — NAV and flight
- [ui-ux.md](../../ui-ux.md) §9 — the controls table
