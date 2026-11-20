# The High slice: snow in a beam, and a beam across the plume (#1855)

Frames for a look step of the High graphics quality
([art-direction.md](../../art-direction.md#snow-in-a-beam)), beside
[the target frame](../issue-1799/README.md) at its three cameras, in the free-water crater
with the HUD on.

**A software rasteriser drew every frame here**: SwiftShader, in headless Chromium, in the
cloud container that built the step. They guide a round and are not offered for
acceptance. The frames the owner accepts against are taken on the named GPU, with the
commands under [Who captures](#who-captures).

The step is two things. The fine marine snow inside an own hull's searchlight is lit by
the beam. And one beam is staged across the vent stand's plume, which
[#1837's frames](../issue-1837/README.md) never showed.

## Reproduce

```bash
SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
  node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1855/software --steps docs/screenshots/issue-1855/frames.mjs
```

[frames.mjs](frames.mjs) takes Low and then High at the target's three cameras and at gate
6's low camera, then stages the Corvette's beam across the stand and takes that camera
twice: with the beam, and with the same hull on Silent Running. It writes
[readings.json](software/readings.json) after every frame: its passes, calls and
triangles, its camera, every hull's SIG, place and beam, and the motes handed to the GPU.
Reduced motion holds the camera's sway, the snow's sink and the smoke's clock, so the
staged pair lies pixel on pixel.

## The frames beside the target

![The target frame](../issue-1799/target.png)

The Corvette rests at SIG 28 and throws the fleet's one strong beam. The Harvester's, at
SIG 18, is about a ninth of it, and the Light Scout throws none.

| Camera | Low | High | What High shows now |
| --- | --- | --- | --- |
| Home | [low](software/01-low-home.png) | [high](software/05-high-home.png) | The Corvette's cone, 850 m off, is a fine green dust over its pool where [#1837's frame](../issue-1837/software/06-high-home.png) had a smooth wedge. A metre is 1.8 px from here, so most motes draw at the 1.5 px floor, dimmed. Nothing shows in the Harvester's faint beam |
| Close | [low](software/02-low-close.png) | [high](software/06-high-close.png) | The Corvette's cone, 450 m off, from its lamp to its pool: lit motes through its whole length, most of them fine and a few bright, thickest where the cone is widest. The outer fish that swim through it stand among them. The hull's ring crosses the cone's lower third. [#1837's frame](../issue-1837/software/07-high-close.png) is the same camera before |
| Survey | [low](software/04-low-survey.png) | [high](software/08-high-survey.png) | Nothing moved: against [#1837's frame](../issue-1837/software/09-high-survey.png) the pair differs by 0.00 of 255 |
| Low | [low](software/03-low-low.png) | [high](software/07-high-low.png) | Gate 6's fourth camera, over the bowl, with the fleet behind the eye and no cone in the frame. Against [#1837's frame](../issue-1837/software/08-high-low.png) it differs by 0.67 of 255, which is what Low's own pair differs by there: the water's flakes |

The clip is [clip-home-to-close.mp4](software/clip-home-to-close.mp4): the camera moved
from Home to Close at High and held there, at 1280 × 720 and six times the speed the
rasteriser drew it. It is taken without reduced motion, so the camera sways and the
snow sinks, six times as fast as it does.

What the target shows and these do not: white light where these are the navy's green,
several lamps a hull each with its cone
([#1845](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1845)), and
particles blurred by a lens, which limit 7 keeps off the playfield.

## A beam across the plume

| Frame | What it shows |
| --- | --- |
| [The beam](software/09-high-plume.png) | The Corvette, turned on the stand and risen to 150 m, upper right. Its beam falls down and to the left across both columns. Seven puffs stand lit in it over the chimneys, four on the nearer column and three on the farther, pale and blooming, where the smoke over them is dark. The cone is full of motes on the near side of the stand, and its pool lies on the rim at the lower left |
| [The same hull silent](software/10-high-plume-silent.png) | The same camera with the Corvette on Silent Running, at SIG 5.3. No beam, no pool, no mote, and the smoke shows by the vent's light and the Lid's alone |
| [The difference](software/diff-plume-vs-silent.png) | Red is every pixel that moved by more than 2 of 255: the cone and its motes, the lit puffs, the pool, the Corvette's lamps and ring, and two lines of a mark of the selected hull's that follows its SIG. The water's own flakes did not move |

The beam's axis passes the nearer chimney's own axis 43.5 m down the beam, 66.7 m over
the ground, and the farther 6.7 m to one side, 80.6 m down the beam and 45.1 m over the
ground. The chimneys are 35 m tall. `readings.json` holds both as `crossed`, and the run
fails if the beam's whole cone misses both columns.

The order is given on a focus plane raised to 150 m. At the fleet's own 300 m a beam
looks down at 26 degrees from 58 m over the rim: a first staging there lit the two
mouths and nothing above them, inside the stand's own light, and is not kept.

The lit puffs are as bright as the stand's own core. Their centres read 237 to 255 of
255 where the same pixels read 114 to 226 with the hull silent, so the beam lifts the
topmost by 123, and the stand's core reads 252. A puff sends on 7% of the light on it,
[#1837's number](../../art-direction.md#the-vents-at-work), and this is its first frame
in a beam.

## What the frame costs

Read off `readings.json`, against [issue-1837](../issue-1837/README.md#what-is-new-in-the-frame)'s
High.

| Camera | High before: calls, triangles | High now | Beams, motes |
| --- | --- | --- | --- |
| Home | 63, 719,680 | 64, 719,680 | 2, 72,000 |
| Close | 63, 719,680 | 64, 719,680 | 2, 72,000 |
| Low | 44, 712,349 | 45, 712,349 | 2, 72,000 |
| Survey | 63, 720,318 | 64, 720,318 | 2, 72,000 |

One draw more and no triangle: the snow is one instanced draw of points in the world
pass, 36,000 vertices a beam. The passes are the six they were and the targets hold the
136,145,280 bytes they did. A vertex in no beam is sent off the clip volume. The cost
not counted here is the vertices themselves, 216,000 at six beams, and a lit mote's four
reads of the ground's heights. Gate 6's 8 ms is read on the named GPU.

The staged pair draws 62 calls and 54. The eight are the lamp halo's, which has no splat
to draw once the only loud hull in the frame is silent.

## Low does not move

`main` at 275f219c was taken once with `QUALITY=low` and read as
[issue-1801](../issue-1801/README.md#low-does-not-move) reads a pair: the mean, over the
world area, of each pixel's largest channel difference, out of 255.

| Camera | `main` against the branch | `main` against `main`, as [#1837](../issue-1837/README.md#low-does-not-move) read it | Calls and triangles |
| --- | --- | --- | --- |
| Home | 0.16 | 0.24 | 44 and 593,684, both |
| Close | 0.33 | 0.41 | 44 and 593,684, both |
| Low | 0.33 | 0.47 | 26 and 587,001, both |
| Survey | 0.00 | 0.00 | 45 and 594,970, both |

A take differs from a take by where the water's flakes have sunk.
[The Close map](software/low-control/diff-close-main-vs-branch.png) is marine snow and
nothing else, and the other three lie beside it. In counted work
`packages/frontend/test/rendererSmoke.test.ts` holds the rest: at Low no beam is thrown
and no mote is drawn, before High and after it. The snow's cloud stands on the world
pass's layer for good, which Low's camera never draws.

## Gate 3, gate 7 and the limits

Read on [Close](software/06-high-close.png), in luma out of 255.

| What | Reading |
| --- | --- |
| The brightest mote in the Corvette's cone | 221 |
| Pixels of that cone over 155, and over 200 | 91, 12 |
| The brightest pixel of the same water in #1837's frame | 128 |
| The Corvette's lamp, as #1837 read it | 165 |
| The 99.9th percentile of the world area: Home, Close, Survey | 197, 188, 162 |
| The same in #1837's frames | 197, 187, 162 |

A few motes near the lamp stand over the lamp itself. A beam's strength is the lamp
halo's gain, so the snow comes on with the halo and is dark on Silent Running, as
[the pair](#a-beam-across-the-plume) shows (limit 5). What it is not held to is the
lamp's own level on the screen: step 2's accepted frames read 227 under way. That is one
of the three calls below.

The Corvette's ring crosses its own cone at Close, among the motes. Whether it reads
there in under a second is the owner's glance, on the named GPU (limit 6, gate 7).

Limits 2 to 4 hold by construction. The only beams a mote reads are the own hulls'. Its
hue is the navy's glow and it takes no token. Where a mote stands is a fixed table and
the sink, the same on every client, and answers nothing.

## Calls taken with these frames

Three, each written with its other readings in
[art-direction.md](../../art-direction.md#snow-in-a-beam). **The owner kept all three**
in session on 20 November 2026, on the frames here. The look is not accepted by that:
acceptance is on the named GPU's frames.

- **A beam shows a finer snow than the water draws.** The flakes the water already draws
  would put nine in the Corvette's cone at Close. A lattice of fine motes puts about 560
  there, and the flakes stay as they are.
- **A mote is as bright as the beam makes it**, and is not capped at its lamp's level.
- **The beam across the plume is staged in the capture**, by one order to the Corvette,
  and the stand does not move.

## Who captures

On the owner's desktop, the named GPU of
[graphics-standards.md](../../graphics-standards.md) gate 6, with the dev servers running
(`npm run dev`):

```bash
UNPACED=1 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --headed --channel msedge --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1855/gpu --steps docs/screenshots/issue-1855/frames.mjs
CLIP=1 RECORD_VIDEO=docs/screenshots/issue-1855/gpu VIEW_W=1920 VIEW_H=1080 \
  node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
  --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1855/gpu --steps docs/screenshots/issue-1855/frames.mjs
```

The first writes ten frames and `readings.json`, whose `queued` GPU time at the four
cameras and at the staged pair is gate 6's reading. The second records the clip. This
command does not set reduced motion, so the camera sways and the snow sinks between the
pair's two frames. To measure the pair and not only look at it, run the first command
again into another folder with the software run's `SETTINGS_JSON`, then:

```bash
python3 docs/screenshots/issue-1801/low-control/diff.py \
  <folder>/10-high-plume-silent.png <folder>/09-high-plume.png <folder>/diff-plume-vs-silent.png
```

## Related

- [The target frame](../issue-1799/README.md) — the cameras, and who captures
- [art-direction.md](../../art-direction.md#snow-in-a-beam) — what is built, and the
  calls taken
- [issue-1836](../issue-1836/README.md) — the searchlight these motes stand in
- [issue-1837](../issue-1837/README.md) — the vent stand and its smoke
- [graphics-standards.md](../../graphics-standards.md) — gate 6, the two graphics qualities
