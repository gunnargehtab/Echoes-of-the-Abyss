# The High slice, step 3: life and effects (#1837)

Frames for the third look step of the High graphics quality
([art-direction.md](../../art-direction.md#life-in-the-worlds-light) and
[the vents](../../art-direction.md#the-vents-at-work)), beside
[the target frame](../issue-1799/README.md) at its three cameras, in the free-water crater
with the HUD on.

**A software rasteriser drew every frame here**: SwiftShader, in headless Chromium, in the
cloud container that built the step. They guide a round and are not offered for
acceptance. The frames the owner accepts against are taken on the named GPU, with the
commands under [Who captures](#who-captures).

**These are the step's four instalments: the schools, the vents at work, the drifting
jellies, and the jellies as lanterns.** The owner took three calls in session on 20 November 2026: the bodies
are the crater's decorative life, the drifting bodies are a new jelly model, and the
vents are an authored stand on the rim. A fourth call, the same day, asked for the
target's jelly, with [a crop of it](target-jelly.jpg): a translucent bell lit from
within, over long strands of beads of light.

## Reproduce

```bash
SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
  node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1837/software --steps docs/screenshots/issue-1837/frames.mjs
```

[frames.mjs](frames.mjs) takes Low and then High at the target's three cameras, at gate
6's low camera and at [free-water-slice.md](../../free-water-slice.md) §9's garden close.
It writes [readings.json](software/readings.json) after every frame: its passes, calls and
triangles, its camera, the bodies the crater stands, the lights its fry carry, the
points of its jellies' lanterns, and the columns over the vent stand.
Reduced motion holds the camera's sway and every body at its loop's start, so two runs
frame alike.

## The frames beside the target

![The target frame](../issue-1799/target.png)

| Camera | Low | High | What High shows now |
| --- | --- | --- | --- |
| Home | [low](software/01-low-home.png) | [high](software/06-high-home.png) | The vent stand in the gap between the three hulls: two chimneys in their own amber light, its pool on the rim and its volume in the water, with a column of smoke over them. The fry's schools are faint knots beside the Harvester, found by looking for them: a fry is 0.5 m and the eye 900 m off, so its light draws at the 1.6 px floor at about a twentieth of its level. The outer fish by the Corvette's beam are specks of a few pixels. Five jellies hang over the fleet, 734 to 945 m off, as orchid lanterns: bells 10 to 12 px across, each over a faint fall of strands. One hangs inside the Harvester's ring, and one is a pale bell in the stand's light. A bead is under the 1.6 px floor from here, and draws at a third of its level or less |
| Close | [low](software/02-low-close.png) | [high](software/07-high-close.png) | The stand 421 m off, between the Light Scout and the Corvette: two chimneys 126 px tall against their own light, three boulders at their feet, and a column of pale puffs climbing out of the frame's amber into the dark. Three of the fry stream's five schools, at the eye's own depth: one 49 to 57 m off, between the Harvester and the Light Scout, a ribbon of pale points with a dark body through each, and two 209 to 227 m off as knots of fine points. Outer fish, 510 to 680 m off, stand as dark shapes against the edge of the vent's light, and one school swims through the Corvette's cone, lit in its green. Five jellies hang over the fleet, 190 to 526 m off, as lanterns: translucent bells 17 to 48 px across, brightest at the lip and along the edge, each over twenty-two strands of beads that fall 9 to 17 m. The nearest hangs over the fry's stream, one inside the Corvette's ring, and the farthest behind the stand's light |
| Survey | [low](software/04-low-survey.png) | [high](software/09-high-survey.png) | The stand as one amber point among the fleet's three rings, which overlap one another at this dolly. No body draws a pixel from 10 km |

Two more, off the target's three:

| Camera | Low | High | What High shows now |
| --- | --- | --- | --- |
| Garden close | [low](software/05-low-garden.png) | [high](software/10-high-garden.png) | Low's own two fry schools over the clearing, which were dark knots, are knots of pale points. The outer fish beside them stand at the cladding's register |
| Low | [low](software/03-low-low.png) | [high](software/08-high-low.png) | Gate 6's fourth camera, over the bowl: the stand is behind the eye. The deep fish's photophores are the stipple channel's still, and unchanged |

The clip is [clip-home-to-close.mp4](software/clip-home-to-close.mp4): the camera moved
from Home to Close at High and held there, at 1280 × 720 and six times the speed the
rasteriser drew it, so the streams swim and the jellies drift six times as fast as they
do. It is taken without reduced motion: the bodies move, the smoke climbs, the camera
sways, each bell strokes, its strands sway and a wave of light runs down it, which no
held frame shows.

## The jelly beside the target's

![The target's jelly, and the nearest lantern at Close](software/jelly-beside-target.png)

Left, the target's, from the owner's crop. Right, the lantern 190 m from the Close eye,
at the same size. What transfers is the form: a translucent bell brightest at its lip,
and long strands of beads. What does not:

- **The hue.** The target's brightest pixels are `#BFA6E2`, Hadron's glow within a
  degree of hue, and violet is reserved. The lantern is `jelly-lantern`, `#CC7AD4`, an
  orchid pink of its own
  ([style-neon-noir.md](../../style-neon-noir.md#world-light--the-terrain-carve-outs)).
- **The water.** The target's is bright teal, so its strands are soft against it; the
  crater's is dark, and beads stand out of it.
- **The tilt.** The target's bell is seen from under and leaning. A lantern leans 12
  degrees into its turn, and reduced motion holds it facing the Close eye square.
- **A second jelly in blue.** One hue serves all five.

[drift-jelly-inspect.png](drift-jelly-inspect.png) is the jelly's file alone under
neutral light, before and after it was reshaped for this: a shallow bell over a short
core where a tall bell hung long arms, seven views.

What the target shows and these do not, beyond the jelly: schools of hundreds as dark masses against
bright water, any school that reads from Home's distance, a searchlight turned on a
vent's plume, and chimneys in the foreground at several heights. The crater's water is
dark, so a body out of every light reads by its own or barely, and a school here is a
ribbon of points where the target's is a dark ribbon. No hull's beam
crosses the stand's column at the fleet's start, so the smoke's third light is in no
frame here: `ventSmoke.test.ts` holds it.

The first take spread each school over 52 m, so that the Close frame always held fish.
The round's critic read that frame as an even scatter of sparks and not as schools, and
was right. A school is now a ribbon 14 m long, and the stream is five schools of 96.

## What is new in the frame

Read off `readings.json`, against [issue-1836](../issue-1836/README.md#what-the-frame-costs)'s
High at rest.

| Camera | High before: calls, triangles | High now | Fry, outer fish, jellies, fry lights, lantern points, columns |
| --- | --- | --- | --- |
| Home | 55, 626,614 | 63, 719,680 | 624, 64, 5, 624, 2,455, 2 |
| Close | 55, 626,614 | 63, 719,680 | 624, 64, 5, 624, 2,455, 2 |
| Low | 36, 619,283 | 44, 712,349 | 624, 64, 5, 624, 2,455, 2 |
| Survey | 55, 627,252 | 63, 720,318 | 624, 64, 5, 624, 2,455, 2 |

Eight draws and 93,066 triangles more. Two draws are points of the world pass: the fry's
lights, 624, and the lanterns', 2,455, which is 491 a jelly: one glow, six seats and 22
strands of 22 beads. Of the triangles, 88,416 are High's own fish, 480 fry of 150 and 48
outer fish of 342, in the draws Low's fish already take. Two draws and 2,970 triangles
are the five jellies, 594 each in two membranes, both sides in one draw. The other four
draws
and 1,680 triangles are the vent stand: two
chimneys of 434 in two materials, three boulders of 270 in one, one draw of 60 puffs,
and the two triangles of its light's quad in the scatter pass. The stand is one more of
the world's sources, 72 where the crater stood 71. The passes are the six they
were and the targets hold the 136,145,280 bytes they did. The cost not counted here is
fragments: a body's fragment inside a cone reads the ground's heights twelve times a
beam, as lit ground does, and a puff is up to 24 m of blended fragments. Gate 6's 8 ms
is read on the named GPU.

## Low does not move

`main` at 6fec3917 was taken twice with `QUALITY=low` and read as
[issue-1801](../issue-1801/README.md#low-does-not-move) reads a pair: the mean, over the
world area, of each pixel's largest channel difference, out of 255.

| Camera | `main` against `main` | `main` against these frames | `main` against a second take of the branch | The branch against itself | Calls and triangles |
| --- | --- | --- | --- | --- | --- |
| Home | 0.24 | 0.30 | 0.17 | 0.14 | 44 and 593,684, all |
| Close | 0.41 | 0.45 | 0.33 | 0.29 | 44 and 593,684, all |
| Low | 0.47 | 0.60 | 0.33 | 0.28 | 26 and 587,001, all |
| Survey | 0.00 | 0.00 | 0.00 | 0.00 | 45 and 594,970, all |
| Garden close | 0.35 | 0.38 | 0.29 | 0.26 | 31 and 591,001, all |

A take differs from a take by where the marine snow has drifted, and by nothing else.
These frames stand a little further from `main`'s first take than `main`'s second does;
a second take of the branch stands nearer to it than either, and `main`'s second take is
1.02 from these at the Low camera. The earlier sets here read 0.04 to 0.09 and 0.15 to
0.31 against the same take of `main`. So the reading is the snow's, take by take, and
no camera tells the branch from `main`.
[The Close map](software/low-control/diff-close-main-vs-branch.png) is marine snow and
nothing else, and the other four maps lie beside it. In counted work
`packages/frontend/test/freeWaterDecoration.test.ts` holds Low's list unmoved under High's
and no vent or jelly in it, `packages/frontend/test/lifeLight.test.ts` and
`packages/frontend/test/jellyLight.test.ts` hold Low's templates unpatched, and
`packages/frontend/test/tutorialLoading.test.mjs` holds the steam on the canvas at Low
and no lantern in the layer.

## Gate 3, gate 7 and the limits

Read on [Close](software/07-high-close.png), by the brightest pixel of each, in luma out
of 255. A lamp's is its brightest pixel in the navy's green.

| What | Peak |
| --- | --- |
| One fry's light in the near school: the median of 90, and the most | 136, 144 |
| The near school, where its lights overlap | 160 |
| A lantern's lip, on the bells 190, 260, 318, 416 and 526 m off | 196, 188, 181, 162, 152 |
| The brightest bead of the nearest lantern's strands | 161 |
| The target's own jelly, off the owner's crop | 176 |
| The Corvette's lamp, SIG 28 | 165 |
| The Harvester's lamp, SIG 18 | 159 |
| The Light Scout's lamp, SIG 6 | 130 |

One fry's light stands under the lamp of either hull that throws a beam and over the
quiet Light Scout's. Light adds, so a dense school's brightest pixel is level with the
Harvester's lamp. World light is not loudness at High, so that breaks no rule as
written; whether a school beside a hull muddies the reading of its lamps is the owner's
glance. The near school crosses the upper right of the Harvester's ring in this frame and
stops short of the Light Scout's, and the ring's arc reads among its points on the
software frame. Gate 7's glance is the owner's, on the named GPU.

A lantern is the brightest life in the frame, and over every lamp beside it. Its first
take read 218 at the nearest lip; it was turned down toward the target's own 176. Its
light renders at a hue of 287 to 301 degrees on the four clear of the stand, between
Hadron's 264 and the interface magenta's 328. From Home the four lanterns clear of the stand read 142, 163, 130 and
116. The jellies were first drawn as lit bodies with seats held under every lamp, which
the owner saw and asked to be the target's instead; whether five lanterns over the
fleet muddy the reading of a hull's lamps is the owner's glance. A wave of light adds
60% as it passes, and the frames hold it. One lantern hangs inside the Corvette's ring
at Close and one inside the Harvester's at Home; along every ring's circle the lanterns
lift the ground by 7 of 255 at most.

**The vent stand is now the brightest thing in the frame.** Its light's core reads 231
of 255 at Close on this take, and 233 and 234 on the two before, over the Corvette's
pool, and the smoke 100 px over
the stacks reads 156. The 99.9th percentile of the world area's luma is 198 at Home, 188
at Close and 162 at Survey; before the lanterns it was 196, 187 and 162, with the
schools alone 162, 157 and 157, and
[issue-1836](../issue-1836/README.md#gate-7-and-limit-5) read 169 at Home at rest. The
`vent` family's strength is step 1's SPEC, accepted on frames that held no vent, and this
is the first frame of one.

Where the stand's light meets a ring, read by [rings.py](rings.py) along each ring's own
circle against the same frame without the stand (the set at f92e4568). A lift is the
median of five neighbouring samples, so a speck of marine snow is not read as light:

| Ring | Arc whose ground the light lifts by more than 10 of 255 | Most | The ring's stroke over the ground beside it there: median now, and before |
| --- | --- | --- | --- |
| Light Scout's, Close | 35% | 22 | 21, 23 |
| Corvette's, Close | 37% | 33 | 21, 23 |
| Light Scout's, Home | 56% | 55 | 22, 25 |
| Corvette's, Home | 37% | 76 | 19, 25 |

The Harvester's ring is untouched at both, and at Survey the three rings overlap one
another and the stand lies under them. So the light reaches a third to a little over
half of two rings, and where it does a ring's stroke keeps three quarters to nine tenths
of what it stood over the ground. Whether that reads in under a second on the named GPU,
in four palettes, is the owner's glance, and a light a mark cannot be read over is turned
down at its source
(limit 6). Of the stand's light, the slot and the two chimneys sharing one lattice cell
are this step's and TUNABLE; the `vent` family's strength is not.

Limits 2 to 4 hold by construction. A body swims its authored loop on the match's clock
and answers nothing. The beams a body reads are the own hulls' alone. `life-glint` and
`jelly-lantern` are no faction's, interface's or family's hues
([style-neon-noir.md](../../style-neon-noir.md#world-light--the-terrain-carve-outs)).

## Calls taken with these frames

Ten, each written with its other readings in
[art-direction.md](../../art-direction.md#life-in-the-worlds-light) and
[its next two sections](../../art-direction.md#a-jelly-is-a-lantern), and each the
owner's to overturn:

- **A body's register is the cladding's ceiling**, 0.16, over the props' 0.06.
- **A schooling fry carries one light of its own**, in a new token, `life-glint`.
- **A lantern's hue is an orchid pink of its own**, `jelly-lantern`, not the target's
  violet, which is Hadron's, nor the fry's bone white.
- **It stands at the target's own level**, over every lamp beside it.
- **It moves**: a stroke, a sway and a wave of light, on the match's clock, held under
  reduced motion.
- **Its strands are beads, as the target's are**, beside the Tetherjelly's stipple
  figure, which a bell over strands also is.
- **High stands its own life**, two streams and five jellies by the fleet's start, after
  Low's list.
- **A chimney's breath is lit matter in the world pass**, not Low's steam.
- **The crater's stand alone breathes it.** Every chimney on every map was taken first,
  and the round's critic overturned it: no frame shows a Thermal Vein at High. Every
  other map keeps its steam, and #1853 holds the other reading.
- **The crater's stand is between the Light Scout and the Corvette**, 421 m from the
  Close eye, where its light reaches both their rings.

## Who captures

On the owner's desktop, the named GPU of
[graphics-standards.md](../../graphics-standards.md) gate 6, with the dev servers running
(`npm run dev`):

```bash
UNPACED=1 VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
  --headed --channel msedge --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1837/gpu --steps docs/screenshots/issue-1837/frames.mjs
CLIP=1 RECORD_VIDEO=docs/screenshots/issue-1837/gpu VIEW_W=1920 VIEW_H=1080 \
  node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
  --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1837/gpu --steps docs/screenshots/issue-1837/frames.mjs
```

The first writes ten frames and `readings.json`, whose `queued` GPU time at the four
cameras is gate 6's reading. The second records the clip and holds six seconds at Close,
for the stream to pass. This command does not set reduced motion, so the bodies stand
where the match's clock has carried them. Over a lap of the stream, 288 to 368 of its 480
fry stand inside the Close frame at any moment, so no frame there finds open water; which
school is the near one changes. For about a fifth of the lap no fry inside the frame is
within 100 m, and at the worst the nearest is 182 m off, a knot of fine points: the two
schools between stand just past the frame's edges. `CLIP_HOLD_MS` lengthens the hold.

## Related

- [The target frame](../issue-1799/README.md) — the cameras, and who captures
- [art-direction.md](../../art-direction.md#life-in-the-worlds-light) — what is built,
  and the calls taken
- [free-water-slice.md](../../free-water-slice.md) — §5, the crater's life and High's own
- [graphics-standards.md](../../graphics-standards.md) — gate 6, the two graphics qualities
