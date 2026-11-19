# The High slice, step 2: shadows and own searchlights (#1836)

Frames for the second look step of the High graphics quality
([art-direction.md](../../art-direction.md#an-own-hulls-searchlight)), beside
[the target frame](../issue-1799/README.md) at its three cameras, in the free-water crater
with the HUD on.

**A software rasteriser drew every frame here**: SwiftShader, in headless Chromium, in the
cloud container that built the step. They guide a round and are not offered for
acceptance. **Nothing here is accepted.** The frames the owner judges are taken on the
named GPU, with the command under "Who captures".

The set was taken on `claude/issue-1836-yiljpg`, over
[#1838](https://github.com/gunnargehtab/Echoes-of-the-Abyss/pull/1838): no plate, no hold.

## Reproduce

```bash
SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
  node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1836/software --steps docs/screenshots/issue-1836/frames.mjs
```

[frames.mjs](frames.mjs) takes Low at the four cameras, then High four times: the fleet
at rest, the Harvester parked in the Corvette's beam, the fleet under way, and on Silent
Running. It writes [readings.json](software/readings.json): each frame's passes, calls,
triangles, beams and every hull's live SIG. An under-way frame follows the fleet, so its
camera is the Home eye carried to where the hulls are. The Close eye under way is taken
on a GPU alone: this rasteriser's frame is seconds old when it is taken, and a hull
under way has left a 420 m dolly's frame by then.

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
| A hull in a beam | [across the beam](software/09-high-shadow-pool.png) | The Harvester sent into the Corvette's pool, seen square across the beam. The beam comes in from the left and pools on the dunes, and the pool stops at the Harvester: the ground under and behind it is dark, out to about its ring. That is the hull's shadow, read from its keel line and half its beam, and it is a blob and not a silhouette |
| Under way | [home](software/10-high-underway-home.png), and [close](software/09-high-underway-close.png) from an earlier take of this tree, at 87a29736 | The fleet ordered along the rim, which takes it down to the floor. The Harvester runs at SIG 40 and its beam rakes the ground ahead of it, white at the lamp; the Corvette's, at 28, is dim; the Light Scout, at 6 to 12, throws none |
| Silent Running | [home](software/11-high-silent-home.png), [close](software/12-high-silent-close.png) | The same fleet at SIG 3.5 to 5.3: no beam and no pool, and `readings.json` counts none |

The clip is [clip-home-to-close.mp4](software/clip-home-to-close.mp4): the camera moved
from Home to Close at High over the fleet at rest, at 1280 × 720 and six times the speed
the rasteriser drew it.

What the target shows and these do not: beams from more than one lamp a hull, white
light where these are the navy's green, a rock's shadow across a pool, and life in the
water. No frame here puts rock in a beam: the crater's rim is level where the fleet
opens. So the ground's shadow is held by `packages/frontend/test/searchlights.test.ts`
and not yet by a picture, and the hull's by the frame above. That frame has no control:
a pool's own edge and a shadow's look alike at this angle. The GPU's take wants the same
pose again with the Harvester moved off, and the difference between the two.

The shadow frame also shows a fault of the client's that is older than this step. A hull
passing near another nudges it a metre or two, and the conn view turns a hull to where
it last moved, so the Corvette's beam swung when the Harvester arrived
([#1840](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1840)). `frames.mjs`
parks the Harvester in the pool as it then lies.

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
steps of four reads. Gate 6's 8 ms is read on the named GPU and has not been.

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

The first writes the frames and `readings.json`, whose `queued` GPU time at the four
cameras at rest is gate 6's reading. The second records the clip.

## Related

- [The target frame](../issue-1799/README.md) — the cameras, and who captures
- [art-direction.md](../../art-direction.md#an-own-hulls-searchlight) — what is built,
  and the calls taken
- [graphics-standards.md](../../graphics-standards.md) — gate 6, the two graphics qualities
