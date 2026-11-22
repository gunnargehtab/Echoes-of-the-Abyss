# The High slice, step 2: shadows and own searchlights (#1836)

Frames for the second look step of the High graphics quality
([art-direction.md](../../art-direction.md#an-own-hulls-searchlight)), beside
[the target frame](../issue-1799/README.md) at its three cameras, in the free-water crater
with the HUD on.

**A software rasteriser drew every frame here**: SwiftShader, in headless Chromium, in the
cloud container that built the step. They guide a round and are not offered for
acceptance. The owner accepted the step on 19 November 2026 on the frames under
[On the named GPU](#on-the-named-gpu).

The set was taken on `claude/issue-1836-yiljpg`, over
[#1838](https://github.com/gunnargehtab/Echoes-of-the-Abyss/pull/1838): no plate, no hold.
The three frames under `software/poses` are one later run of the whole module, on the
branch that added the two poses
[#1842](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1842) asked for, over
`main` at b9ca3366, the merge of the first. Its
[readings.json](software/poses/readings.json) lies beside them. Its other eleven frames
repeat the poses of the set here and are not kept. The two under `software/cast` are a
third run of the whole module, on the branch that added the cast edge, over `main` at
038f5a49. [Its readings](software/cast/readings.json) lie beside them, and its other
fourteen frames are not kept.

## Reproduce

```bash
SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
  node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1836/software/poses --steps docs/screenshots/issue-1836/frames.mjs
```

That is the later run, and the third is the same command into `software/cast`. The set
was taken by the same command into `software`, before the module took the two poses:
run there now it would number its frames past the pair and write over the set's readings. The set's `readings.json` keeps a `pool` row whose
frame is gone.

[frames.mjs](frames.mjs) takes Low at the four cameras, then High six times: the fleet
at rest, the Harvester parked in the Corvette's beam and then sent off it, the fleet
under way, on Silent Running, the Corvette alone at the foot of the rim, and the
Corvette past a mesa's corner, with the ground's shadow and then without it. It writes
`readings.json` after every frame: its passes, calls, triangles and beams, its camera,
and every hull's live SIG, place and beam. [The set's](software/readings.json) was
written before the camera, the places and the beams were;
[the later run's](software/poses/readings.json) has them. An under-way frame follows the
fleet, so its camera is the Home eye carried to where the hulls are. The Close eye under
way is taken on a GPU alone: this rasteriser's frame is seconds old when it is taken,
and a hull under way has left a 420 m dolly's frame by then.

## The frames beside the target

![The target frame](../issue-1799/target.png)

A beam's strength is its hull's loudness, so one camera is three frames. The Light Scout
rests at SIG 6, the Corvette at 28 and the Harvester at 18.

| Camera | Low | High at rest | What High shows now |
| --- | --- | --- | --- |
| Home | [low](software/01-low-home.png) | [high](software/05-high-rest-home.png) | The Corvette's pool on the rim ahead of it, the dune troughs dark inside it, and its cone in the water. The Harvester's is a faint patch, and the Light Scout throws none |
| Close | [low](software/02-low-close.png) | [high](software/06-high-rest-close.png) | The Corvette's cone from its bow to its pool, 66 drawn metres under it. The Harvester's pool is a dim ellipse on the rim. The Light Scout is dark |
| Survey | [low](software/04-low-survey.png) | [high](software/08-high-rest-survey.png) | The Corvette's beam is a wedge a few pixels long east of its ring. Nothing else moved |

| State | Frames | What it shows |
| --- | --- | --- |
| A hull in a beam | [across the beam](software/poses/09-high-shadow-pool.png) | The Harvester sent into the Corvette's pool, seen square across the beam. The beam comes in from the upper left. The pool's near half is bright, and the pool stops at the Harvester: the ground behind it is dark. The streak at the lower right is the Harvester's own faint pool |
| The same pool, empty | [control](software/poses/10-high-shadow-pool-empty.png), [difference](software/poses/diff-shadow-pool-vs-empty.png) | The same camera with the Harvester sent 260 m off, out of the frame. The pool is a whole ellipse. In the difference red is light the first frame lacks: under the hull and down the beam to 132 pixels past its model's box, up to 35 of 255 darker. That is the hull's shadow, read from its keel line and half its beam, and it is a blob and not a silhouette. Cyan is what the hull adds: itself, its ring and its own faint pool. The two lines along the top are a mark of the selected Harvester's, which went with it |
| Rock in a beam | [at the rim's foot](software/poses/14-high-rim-foot.png) | The Corvette alone on the bowl's floor at 1,470 m, its bow at the west rim's wall. Its cone ends on the rock, and the pool climbs the wall unbroken, ribbed by the relief on it. Nothing is lit behind the wall |
| Rock's shadow on lit ground | [cast edge](software/cast/15-high-cast-edge.png), [control](software/cast/16-high-cast-open.png), [difference](software/cast/diff-cast-edge-vs-open.png) | The Corvette alone in the trench south of the mesas, at 1,075 m and 450 m over the floor, its beam looking 30 m past the west mesa's south-east corner. Seen from the south-south-east, the cone comes in from the left. The pool on the channel floor is lit on its near side and cut on its far side, along an edge run north-east from the corner. The control is the same frame with the walk handed no ground: the pool runs on whole. In the difference red is light the first frame lacks: the floor beyond the edge, up to 172 of 255 darker, and a shaft through the cone behind the corner. Nothing is cyan |
| Under way | [home](software/10-high-underway-home.png), and [close](software/09-high-underway-close.png) from an earlier take of this tree, at 87a29736 | The fleet ordered along the rim, which takes it down to the floor. The Harvester runs at SIG 40 and its beam rakes the ground ahead of it, white at the lamp; the Corvette's, at 28, is dim; the Light Scout, at 6 to 12, throws none |
| Silent Running | [home](software/11-high-silent-home.png), [close](software/12-high-silent-close.png) | The same fleet at SIG 3.5 to 5.3: no beam and no pool, and `readings.json` counts none |

The clip is [clip-home-to-close.mp4](software/clip-home-to-close.mp4): the camera moved
from Home to Close at High over the fleet at rest, at 1280 × 720 and six times the speed
the rasteriser drew it.

What the target shows and these do not: beams from more than one lamp a hull, white
light where these are the navy's green, and life in the water.

The hull's shadow is held by a pair. A pool's own edge and a shadow's look alike, so
`frames.mjs` takes the pose twice, with the Harvester in the pool and with it sent off,
and the shadow is what differs. Between the two the Corvette's lamp moved 0 m and its
beam turned 0 degrees, the Harvester's model stood off the viewport in the second, and
`readings.json` records all three as that frame's `control`.
[pairdiff.py](pairdiff.py) makes the difference and prints its figures. Its window is
the Harvester's model box grown by half its size each way. Inside it the control stands
8 or more of 255 over the first frame on 40,036 pixels, by 35 at most. Outside it,
where only noise and the mark that went with the Harvester differ, the pair differs by
0.30 of 255 a pixel, in the measure [Low does not move](#low-does-not-move) uses.

The first take's shadow frame had no control and is not kept. The park then read the
pool at the survey camera, where a hull is drawn larger and its lamp hangs off its drawn
bow. A run here with that park stood the Harvester about 90 m down the beam of where the
beam's axis met the ground, at the pool's faint end, and its control found only a faint
shadow. `frames.mjs` now reads the pool at the frame's own dolly.

The ground's shadow has two frames, and each answers half. At the rim's foot the wall
faces the lamp and nothing stands between them, so the walk has nothing to cut. The JS
copy, `groundShade` in `searchlights.ts`, was run once over the crater's own heights
sampled every 5 m, a scratch run that is not kept, and left 99.5% of that beam's light.
In the frame the pool is unbroken, on a wall some 900 m high. A steep face is where a
walk over filtered heights is likeliest to shadow what it should light, so that is what
the frame holds.

The cast edge is the other half: rock's shadow on ground the beam would light. It is a
pair, as the hull's shadow is, since a pool's edge and a shadow's look alike. The
control is the same frame with `__perspectiveGroundShadow(false)`, a development switch
that hands the walk `NO_GROUND`, heights far under any beam, in place of the ground's.
Only the walk reads the heights, so every beam and every pixel the walk does not cut
stand as they were. `readings.json` holds the second frame's `control`: the lamp moved
0 m and the beam turned 0 degrees, with the sway held.
`python3 docs/screenshots/issue-1836/pairdiff.py docs/screenshots/issue-1836/software/cast cast`
makes the difference. The control stands 8 or more of 255 over the cast edge on 75,118
pixels, by 172 at most, and the cast edge stands 8 over the control on none: the walk
only takes light away.

The pose was found by running the JS walk over those heights for the Corvette at every
place and heading in the crater's south half, from 30 to 700 m over the floor. The
mesas' corners are where it found the longest edges between lit ground and ground the
walk cuts, and a sweep about this one put its edge across the pool's middle.

The frame's edge is toothed, five or six teeth across the pool. The JS copy draws the
same teeth at its 12 reads a line, and at 48 they nearly go. Near the edge a line to the
lamp crosses only a sliver of the corner, and reads a thirteenth of the line apart can
step over it. So the GLSL walk cuts what the JS copy does here too, and the teeth are
the walk's, not the shader's. The scratch runs are not kept.

The shadow frame also shows a fault of the client's that is older than this step. A hull
passing near another nudges it a metre or two, and until #1840 the conn view turned a hull
to where it last moved, so the Corvette's beam swung when the Harvester arrived
([#1840](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1840)). `frames.mjs`
parks the Harvester in the pool as it then lies.
A metre or two is not its limit: in the run under `software/poses` the Corvette was
shoved 5 m and its beam swung from east to 19 degrees west of south, which is why that
pair looks east across a beam thrown south.

## What the frame costs

Read off `readings.json`, against [issue-1801](../issue-1801/README.md)'s set with
neither plate nor hold.

| Camera | High before: calls, triangles | High at rest | Beams |
| --- | --- | --- | --- |
| Home | 54, 626,610 | 55, 626,614 | 2 |
| Close | 54, 626,610 | 55, 626,614 | 2 |
| Low | 35, 619,279 | 36, 619,283 | 2 |
| Survey | 54, 627,248 | 55, 627,252 | 2 |

One draw and four triangles more: the beams' cones are one instanced quad a beam, into
the scatter pass's target. The passes are the six they were, and the targets hold the
136,145,280 bytes they did. The ground's heights are one more texture, 131,072 bytes for
this map.

The cost that is not counted here is fragments: a lit ground fragment inside a cone
reads the ground's heights twelve times a beam, and a sight line through a cone sixteen
steps of four reads. Gate 6's 8 ms is read [on the named GPU](#on-the-named-gpu), at the
four cameras and at the shadow pair and the rim frame. The cast pair adds no pass and no
work a fragment: its control only hands the walk other heights to read.

## Low does not move

`main` at b5af0b95 was taken twice with `QUALITY=low` and read as
[issue-1801](../issue-1801/README.md#low-does-not-move) reads a pair: the mean, over the
world area, of each pixel's largest channel difference, out of 255.

| Camera | `main` against `main` | `main` against the branch | Calls and triangles |
| --- | --- | --- | --- |
| Home | 0.01 | 0.03 | 44 and 593,684, both |
| Close | 0.01 | 0.06 | 44 and 593,684, both |
| Survey | 0.00 | 0.00 | 45 and 594,970, both |

The branch's figures are inside what [issue-1801](../issue-1801/README.md#low-does-not-move)
records for Low across its own takes, 0.02 to 0.43: the motes sink, and a frame taken
later in a match finds them lower.

[The Close map](software/low-control/diff-close-main-vs-branch.png) is marine snow and
nothing else. In counted work `packages/frontend/test/rendererSmoke.test.ts` holds the
rest: at Low no beam is thrown, before High and after it.

## Gate 7, and limit 5

With no plates, a mark stands over its own hull's pool. At rest the Corvette's pool lies
ahead of its ring and its cone crosses the ring's lower arc
([Close](software/06-high-rest-close.png)). Under way the Harvester's selection ring
and collar stand over the brightest light in the set, the lamp's own glare
([Home](software/10-high-underway-home.png)). The 99.9th percentile of the world area's
luma, out of 255, is 169 at Home at rest and 227 under way, where step 1's frame read
159. Whether a ring reads there in under a second is the owner's glance, on the named
GPU, in the four palettes.

Limit 5 is the three states above: the beam is the lamp halo's gain, so the silent
frames are dark by construction and the loud hull is the bright one.

## On the named GPU

Taken on 19 November 2026 on the GTX 1070 of
[graphics-standards.md](../../graphics-standards.md) gate 6, in Edge, on `main` at
`a636f25d`, by the first command under [Who captures](#who-captures). **The owner
accepted these frames in session the same day.** The run's [readings.json](gpu/readings.json) lies beside its fifteen
frames. The camera swayed (`sway: on`), so the same command was run once more with the
software run's `SETTINGS_JSON` into `gpu/held`, which keeps the pair, its difference, the
rim frame and [its readings](gpu/held/readings.json). The cast pair came after this take
and is not in it. Its frames on the named GPU are taken once, at
[#1637](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1637)'s run, with the
rest of that design work.

| Camera | Low | High at rest | Queued GPU time, Low and High |
| --- | --- | --- | --- |
| Home | [low](gpu/01-low-home.png) | [high](gpu/05-high-rest-home.png) | 1.62 and 2.72 ms |
| Close | [low](gpu/02-low-close.png) | [high](gpu/06-high-rest-close.png) | 1.57 and 2.71 ms |
| Low | [low](gpu/03-low-low.png) | [high](gpu/07-high-rest-low.png) | 1.26 and 2.18 ms |
| Survey | [low](gpu/04-low-survey.png) | [high](gpu/08-high-rest-survey.png) | 1.22 and 2.05 ms |

Gate 6's 8 ms holds at every camera. High at rest costs 0.83 to 1.14 ms more than Low,
and the held run reads each camera within 0.13 ms of these. The calls and triangles are
the ones [What the frame costs](#what-the-frame-costs) counts.

| State | Swaying | Held | Queued GPU time, held |
| --- | --- | --- | --- |
| A hull in a beam | [frame](gpu/09-high-shadow-pool.png) | [frame](gpu/held/09-high-shadow-pool.png) | 2.71 ms |
| The same pool, empty | [control](gpu/10-high-shadow-pool-empty.png), [difference](gpu/diff-shadow-pool-vs-empty.png) | [control](gpu/held/10-high-shadow-pool-empty.png), [difference](gpu/held/diff-shadow-pool-vs-empty.png) | 2.55 ms |
| Rock in a beam | [frame](gpu/15-high-rim-foot.png) | [frame](gpu/held/15-high-rim-foot.png) | 2.38 ms |
| Under way | [close](gpu/11-high-underway-close.png), [home](gpu/12-high-underway-home.png) | | |
| Silent Running | [home](gpu/13-high-silent-home.png), [close](gpu/14-high-silent-close.png) | | |

Both pairs are pairs: the lamp moved 0 m, the beam turned 0 degrees, and the Harvester
stood off the second frame. This time the beam is thrown east and the pair looks north
across it. In the held pair the control stands 8 or more of 255 over the shadow frame on
77,567 pixels, by 111 at most, and outside the window the two differ by 0.42 of 255. The
red lies on and behind the Harvester, down the beam. The swaying pair reads 89,643
pixels, by 146, and 2.45 outside: its difference also draws edges the sway moved.

At the rim's foot the pool stands whole on the wall in both runs, with no hole cut in
it. In the held run the Corvette rested at a bearing of −125.9 degrees, as the software
run's did at −125, and the frame matches that one's. In the swaying run it rested at
−134.7, so its pool lies farther along the wall and dimmer.

Under way the Corvette and the Harvester each throw a beam, and on Silent Running none
is thrown, as `readings.json` counts. [The clip](gpu/clip-home-to-close.mp4) is the
second command's recording without the match's load: 16 s at 1920 × 1080, in real time.

Gate 7 reads in the standard palette: the owner read the Corvette's ring over its own
pool on these frames the same day. Every frame here is in that palette, so the other
three are not read.

## Who captures

On the owner's desktop, the named GPU of
[graphics-standards.md](../../graphics-standards.md) gate 6, with the dev servers running
(`npm run dev`):

```bash
UNPACED=1 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --headed --channel msedge --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1836/gpu --steps docs/screenshots/issue-1836/frames.mjs
CLIP=1 RECORD_VIDEO=docs/screenshots/issue-1836/gpu VIEW_W=1920 VIEW_H=1080 \
  node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
  --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1836/gpu --steps docs/screenshots/issue-1836/frames.mjs
```

The first writes seventeen frames and `readings.json`, whose `queued` GPU time at the
four cameras at rest is gate 6's reading. The second records the clip. Five frames of
the first answer [#1842](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1842):

- `high-shadow-pool` and `high-shadow-pool-empty` are the hull's shadow and its control.
  The run prints whether they are a pair, and `readings.json` holds it as `control`.
  The shadow is their difference:
  `python3 docs/screenshots/issue-1836/pairdiff.py docs/screenshots/issue-1836/gpu`
  writes the map beside them and prints the figures [above](#the-frames-beside-the-target).
- `high-rim-foot` is rock in a beam. The pool should stand whole on the wall, as it
  does here: a hole in it is the GLSL walk cutting what the JS copy does not.
- `high-cast-edge` and `high-cast-open` are rock's shadow on lit ground and its
  control, held as `control` the same way.
  `python3 docs/screenshots/issue-1836/pairdiff.py docs/screenshots/issue-1836/gpu cast`
  writes their difference. The edge should run north-east from the mesa's corner across
  the pool, toothed as [above](#the-frames-beside-the-target).

The rim frame and the cast pair come last. The first waits out a 900 m dive, the second
a route round the mesas at 1,075 m. Any staged frame can fail to stage: the Harvester
never stands in the pool, neither side of the beam is level rim, a hull never comes to
rest or rests away from its order, the beam moves between a pair. The run then warns, takes
every frame after it, and ends in a failure that names it. `readings.json` is written
after every frame.

This command does not set reduced motion, so motion follows the desktop's own setting,
and `control.sway` says which: `held` or `on`. With it on, the camera sways by about
0.3% of the frame's height (`cameraSway.ts`) and the snow sinks between the pair's two
frames, and the difference draws edges that are not shadow. The software run holds
both. To measure the pair and not only look at it, run the first command again into
another folder with the software run's `SETTINGS_JSON`.

## Related

- [The target frame](../issue-1799/README.md) — the cameras, and who captures
- [art-direction.md](../../art-direction.md#an-own-hulls-searchlight) — what is built,
  and the calls taken
- [graphics-standards.md](../../graphics-standards.md) — gate 6, the two graphics qualities
