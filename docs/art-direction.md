# Echoes of the Abyss — Art Direction Guide

*(Industrial, claustrophobic, pressure-scarred — but fully original. Dieselpunk meets abyssal sci-fi.)*

## Visual Identity Overview

The art direction should communicate three things instantly:

1. **Depth** — crushing pressure, darkness, bioluminescent life
2. **Industry** — welded steel, pipes, ballast tanks, cavitation scars
3. **Conflict** — factions with distinct philosophies expressed visually

## Two layers, two laws

*Decided by the owner in session on 11 November 2026, for
[#1637](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1637) and
[#1694](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1694). High is in
development behind its setting, a step at a time, and the owner accepted its first step
on 19 November 2026
([#1801](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1801)):
[What is built at High](#what-is-built-at-high) lists what is drawn and what is accepted.
The shipped renderer is the Low graphics quality
([graphics-standards.md](graphics-standards.md) gate 6), and every rule released below
still binds it. Limits 5 and 7 were the author's, written to carry the decision out, and
the owner confirmed both on the same day
([#1798](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1798)). Limit 6 has
been read twice. On 11 November 2026 a mark carried a plate, and on 19 November 2026, on
the named GPU's frames, the owner took the plates away: a mark stands bare
([A mark on the lit world](#a-mark-on-the-lit-world)). Its wording below is the author's,
written to carry that out. On 13 November 2026 the owner read limit 2 for a model in the
world pass ([A model in the world's light](#a-model-in-the-worlds-light)). On 22 November
2026 the owner read the tactical layer's law for the survey ink: at High it fades by the
water over the ground it lies on ([The crater from above](#the-crater-from-above)).*

The owner turned the look down three times in two weeks. Three proposed designs "seem
lifeless" (26 October, #1637). The free-water slice was "a map editor, not an ocean" on
4 November and not met again on 6 November (#1694), with every evidence row passing.
That slice was built inside rules that hold the ground at 5–10% luminance and refuse
light shafts, hue in the water and any new full-screen pass
([free-water-slice.md](free-water-slice.md) §9), under a canvas that adds no bloom and no
shadow. Those rules were written for the chart, where a dark ground is what lets a mark
read, and were carried into the conn view's world. The [Lighting](#lighting) list below
asked for volumetric fog, bioluminescent light and flickering lamps from the first draft.
This decision returns to it.

The picture is two layers, and each now has its own law.

| Layer | What is on it | Its law |
| --- | --- | --- |
| **Tactical layer** | Rungs 4 to 7 of the ladder ([map-visuals.md](map-visuals.md) §5): survey ink, map furniture, instruments and agents. That is every mark, ring and glyph, public life's field marks and stipple, contacts at every tier, own lamps with their halo and collar, the scope and the Pixi HUD | Unchanged at both graphics qualities: no mark, ring, lamp or glyph is drawn differently at High. Glow is loudness, hue is the faction's, fidelity is asymmetric and the glance test holds ([graphics-standards.md](graphics-standards.md) gates 3, 4, 5 and 7). At High a mark stands bare on the lit world, and the glance test is asked of it there (limit 6). One thing is drawn differently, by the owner's call: the survey ink fades by the water over the ground it lies on, as that ground does ([The crater from above](#the-crater-from-above)) |
| **World layer** | Rungs 1 to 3 and world light: the water, stone and ground, flora, the modelled bodies of public life with their light, and the surfaces of hulls, structures, props and landmarks | At Low, every rule as written. At High, lit, inside the limits below |

### What the world layer may do at High

- **Take light and cast shadow.** The ground, the stone and every surface are lit by the
  scene's lights and shadow one another. The ground stops being a baked chart under lit
  models.
- **Carry light sources of its own.** The Lid's scattered glow from above, bioluminescent
  flora and the bodies of public life, vents and civic lamps are world-owned, each in its
  own token (limits 3 and 4 below). The searchlights, work lights and floodlights of the
  player's own hulls and structures are agent light: they keep their navy's glow and
  answer gate 3 (limit 5). Either kind may pool on the ground and scatter in the water as
  a visible volume.
- **Carry hue in the water**, and only the hue of the biome under it. Hue is biome and
  biome is propagation factor ([map-visuals.md](map-visuals.md) §6), so water that wears
  its biome's hue tells the player the same truth the ground does. Depth still darkens
  it.
- **Spend full-screen passes**: bloom, grading, ambient occlusion and whatever else gate
  6's High frame time holds.
- **Move smoothly**, light included. The 5 Hz grid is the instruments' cadence, not the
  world's. A smooth light on the ground was refused because it read as an agent
  ([style-neon-noir.md](style-neon-noir.md) "World light", rule 3). At High an agent is
  told by its mark: an own hull by its faction hue and collar as well, and a creature
  contact by the form [map-visuals.md](map-visuals.md) §8 holds against public life. No
  world-owned light takes an agent's token or answers activity, and no contact casts light
  (limits 2 to 4 below), so light moving on the ground is never an enemy's.

### What binds both layers, at both qualities

1. **No sun below the Lid.** The canon is unchanged ([world.md](world.md)), so there are
   no sunlit shafts and no caustics ([Shallow caustics](#shallow-caustics--spec)). Light
   from above is the Lid's glow, from everywhere and nowhere in particular.
2. **Nothing unresolved is drawn.** Light, shadow, wake and silt come from the world and
   from the player's own force. A contact casts none of them, and an enemy's lamp lights
   nothing: light from a contact would draw more than its tier resolves (gate 5). A
   contact's model is drawn whole in the tactical pass at both qualities, so its body
   hides no light from the ground and feeds no bloom.
3. **Faction and interface hues are reserved.** World light and the water keep their own
   tokens, away from the neons ([style-neon-noir.md](style-neon-noir.md) "World light",
   rule 5). A new source or a water hue takes a token there before it is drawn (gate 4).
4. **World-owned light is not an instrument.** It is placed by the map, identical for
   every client, and never answers activity, occupancy or proximity (the same section's
   rule 4).
5. **Own light never contradicts gate 3.** Light an own hull throws on the world reads no
   louder than its lamps say. A hull on Silent Running does not floodlight the seabed.
6. **The tactical layer reads over the lit world.** A mark stands bare: nothing is drawn
   under it to hold the world's light back. The Lid's glow lights no ground paler than
   the palest the ladder weighs, so over ground the Lid alone lights each tactical rung's
   floor reads as it reads at Low, in all four palettes. Over a pool, a volume or the
   bloom nothing holds that by construction. Gate 7's questions are asked of the lit
   frame, and a light a mark cannot be read over is too bright or too busy
   ([A mark on the lit world](#a-mark-on-the-lit-world)).
7. **No blur over play.** Depth of field and motion blur stay off the playfield while the
   player commands. Reduced motion and the colour-vision palettes bind High as they bind
   Low.

### What it releases at High

| Rule | Where it is written | At High |
| --- | --- | --- |
| The ground sits at 5–10% luminance inside an 85–90% darkness budget | [style-neon-noir.md](style-neon-noir.md) principle 1 and "World light", rule 2; [map-visuals.md](map-visuals.md) §3 and §5, rung 3 | Released |
| The conn canvas keeps at least 95% of its pixels under 10% encoded luma | [Lamp halo — SPEC](#lamp-halo--spec), "Darkness" | Released. The halo still costs no more than 1.5 points against its own off frame |
| Light is loudness: the brighter something burns, the louder it is | [style-neon-noir.md](style-neon-noir.md) principle 3; [map-visuals.md](map-visuals.md) §6 | Narrowed to the tactical layer: an agent's lamps, halo and collar. World light is not loudness |
| World light is points and seams, never area glow, with the vent ember as its ceiling | [style-neon-noir.md](style-neon-noir.md) "World light", rules 1 and 2 | Released, save rule 1's sentence that keeps terrain light out of the lamp halo's source. Limits 3 and 4 above still hold |
| World light is static or on the 5 Hz grid | The same section, rule 3 | Released. Limits 2 to 4 above are what keep it from reading as an enemy |
| The canvas pass adds no bloom, shadows, camera effects or geometry, and the lamp halo is the one full-screen pass | [Shared model lighting](#shared-model-lighting--abyss-render-stack) below; gate 3 | Released. Gate 6's frame time is the bound |
| The water is one blue, luminance only | [Reading the Water](#reading-the-water); [map-visuals.md](map-visuals.md) §5, rung 1, and §6 | Hue released, as the hue of the biome under it. Depth still darkens |
| No light shafts, hue in the water, new full-screen pass or glow on terrain | [free-water-slice.md](free-water-slice.md) §9, "Water medium" | Released: shafts from the world's own lights, the water wearing its biome's hue, a full-screen pass and glow on terrain. Kept: no sun, no caustics, and no effect that rotates with the projection (gate 8) |
| "No new neon, sunlight, cinematic blur or full-detail enemy fleet" | [visual-reboot.md](visual-reboot.md) §1 | A lit world is licensed. New neon, sunlight, blur over play and the enemy fleet stay refused |
| 150 draw calls and 400,000 triangles a frame | Gate 6 | Replaced by a frame time |

Three options were written. **Refine inside the existing rules** was tried three times
and refused each time. **Release the rules on both layers** would let glow stop meaning
loudness, which is the game's argument ([graphics-standards.md](graphics-standards.md)
gate 3). **Two layers** is taken: the world may be lit because the tactical layer keeps
every law that makes it readable.

This section sets no number. High's values are written here from the first frame the
owner accepts, not before it, and the `dev-loop` skill's "Look work" is the loop that
builds toward that frame. The slice, its renderer work and its assets are tracked on
[#1637](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1637).

### What is built at High

*In development, a step at a time. **Four steps are accepted**, each by the owner in
session on 19 November 2026, on the named GPU's frames. **Step 1**
([#1801](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1801);
[issue-1801](screenshots/issue-1801/README.md)) is the lit ground and stone, the water as
a medium, the world's own sources and the chain
([Step 1's numbers](#step-1s-numbers--spec)). **An own model in the world's light**
([#1814](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1814)), **a navy's
surface** ([#1811](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1811), its
two faults mended by
[#1844](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1844)) and **an own
hull's searchlight** ([#1836](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1836))
are the other three. The numbers of all four are SPEC, each printed by the section that
owns it. **A manta**
([#1867](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1867)) was accepted
on 24 November 2026, on the named GPU's Close frame, and its numbers are SPEC too. Every
later step is not accepted, and its numbers stay TUNABLE in
`HIGH_GRAPHICS` (`packages/shared/src/constants.ts`) until a frame of it is.*

High draws the one scene as two layers
(`packages/frontend/src/game/highFrame.ts`):

1. **The world pass** draws the world layer, the cladding of the player's own models
   with it, into a linear half-float target with the canvas's four samples. Nothing in
   it is tone-mapped, so its light stays
   scene-referred. A fragment there only loses light to the water.
2. **The scatter pass** draws what the world's own sources and the own hulls'
   searchlights scatter in the water, against the world's depth, at half the frame's
   size.
3. **The chain** runs at half the frame's size and smaller: ambient occlusion off the
   world's depth, then the frame's light over a soft threshold, spread down four levels
   and back as bloom.
4. **The composite** is one full-screen draw to the canvas. It sums the world's light,
   occluded, the water's own light by how much of each pixel the water took, the sources'
   volumes and the bloom. It grades the sum and runs the tone curve, and lays the world's
   depth so the next pass is hidden by the world as it is at Low.
5. **The tactical pass** draws everything else on the canvas as Low draws it: the same
   materials, the same per-material curve, the same fog. Every lamp is drawn here, and
   so is a contact's model, whole. The survey ink is drawn here,
   as a layer of its own over the lit ground, and fades by the water over that ground
   ([The crater from above](#the-crater-from-above)). The lamp halo and the chromatic split
   follow as they always have. The chain runs before this pass, so no
   mark, ring or lamp is occluded, spread or graded.

Built so far:

- **The ground and the stone are lit by the Lid's glow.** It is light from the whole
  water above, in the `lid-glow` token ([style-neon-noir.md](style-neon-noir.md) "World
  light"): a surface takes it by how far it faces up and from no quarter, since there is
  no sun below the Lid (limit 1), and the water above the ground takes it with depth, so
  depth still darkens. The albedo is each biome's fill and the stone, lifted by one gain
  so their hues and their order hold. The slope and the darkening at a cliff's rim, its
  lee and a stone's scour come from the seabed bake. The glow's level stands at its
  bounds: the palest ground it lights is within a tenth of the palest ground the ladder
  weighs, so a mark over ground the Lid alone lights reads as it does at Low (limit 6),
  and just under the bloom's knee, so it spreads nothing.
- **The silt is relief, not paint.** Low paints its dunes, ripples and scours as a
  hillshade from the bake's key light
  ([Silt detail and seated stones — SPEC](#silt-detail-and-seated-stones--spec)). The lit
  ground takes the same three as hollows instead: a dune's trough and the foot of its
  lee, a ripple's lee and a scour each lose a share of the water above them, by their
  biome's own strength, and the ground in them takes that much less of the Lid's glow
  and of a pool. Nothing reads a heading, since the glow has none (limit 1), and nothing
  lifts: a crest takes what level ground takes. The grain stays the silt's own colour.
  The free-water study's ground carries the relief too, where its Low ground is a smooth
  bake and stays one: Low is High's control and does not move.
- **The relief runs under a ground shadow.** A hull's height above its own shadow is its
  depth ("Depth is drawn, not implied", below), and a dune's trough stands as dark as a
  shadow. On 13 November 2026 the owner took a hold: level ground under each own shadow,
  so that a shadow read apart from a trough. On 19 November 2026, on the named GPU's
  frames, the owner took it away again
  ([#1801](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1801), D3), so a
  shadow lies on the silt as the silt is. What the hold cost was a patch of level ground
  under every hull, about 3 of 255 paler than the troughed ground round it.
- **The water is a medium.** It keeps the depth ramp's brightness
  ([Reading the Water](#reading-the-water)), carried through the grade and the curve, and
  wears the hue of the biome under the water its light comes from, in that biome's water
  token. A pixel takes that light by what the swim cost its own.
- **The world's own sources light the world.** The vent embers, the civic lamps and each
  prop that carries a licensed family stand as lights in their family's token. Each pools
  on the ground and scatters in the water as a volume that stops at the ground. They are
  placed by the map alone and answer nothing a match does (limits 2 to 4). A pool lifts
  the ground as far as its light reaches, and a mark over one stands bare (limit 6).
- **Ambient occlusion, bloom and a grade.** The ground round a point hides part of the
  world's own light from it, the Lid's glow and the pools on the ground with it. For the
  glow that is the one shadow a light with no direction casts. Bloom
  spreads only what stands over the brightest ground the glow lights, so a source blooms
  and the ground does not. The grade puts a little weight into the darks and a little
  chroma back.
- **The props** draw in the world pass under the shared rig. Their additive clouds, the
  haze and the sift, stay in the tactical pass. A chimney's steam does not: at High it is
  lit smoke in the world pass, in development ([The vents at work](#the-vents-at-work)).
- **A navy's cladding wears a surface**
  ([#1811](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1811)), the
  Commune's four materials first. Below.
- **An own model's cladding is lit by the world**
  ([#1814](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1814)). Below.
- **An own hull throws a searchlight, and it casts a shadow**
  ([#1836](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1836)). Below.
- **The crater's life stands in the world's light, its fry carry their own, and its
  jellies are lanterns**
  ([#1837](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1837)). In
  development and not accepted. Below.
- **The crater stands one vent stand, and its chimneys breathe lit smoke** (#1837). In
  development and not accepted. Below.
- **Every map's chimneys breathe that smoke**
  ([#1853](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1853)). In
  development and not accepted. Below.
- **A river of 120 lanterns drifts far out over the crater's bowl**
  ([#1859](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1859)). In
  development and not accepted. Below.
- **The fine snow inside an own hull's beam is lit**
  ([#1855](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1855)). In
  development and not accepted. Below.
- **From the survey dolly the free-water crater stands under its own water and its own
  walls' shade, on ground that runs on past the map's edge** ([#1891](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1891)).
  In development and not accepted. Below.

Not built yet: a searchlight on a standing prop, a prop's shadow, a hull's shadow on
another hull, and the work lights and floodlights of the player's own structures.

#### Step 1's numbers — SPEC

*Promoted on 19 November 2026 with the owner's acceptance
([#1801](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1801)), from the
frames taken with neither plate nor hold.* `HIGH_GRAPHICS` in
`packages/shared/src/constants.ts` holds each, and
`packages/frontend/test/highSpec.test.ts` holds this table to it. A number moves here
first, then there. Light is in the renderer's linear units, where the shared rig's key
gives 1.8 face on.

| What | Constant | Value |
| --- | --- | --- |
| The world pass's samples | `SAMPLES` | 4 |
| Exposure before the curve | `EXPOSURE` | 1 |
| The Lid's glow on level ground at the Lid | `LID.IRRADIANCE` | 3.3 |
| Depth over which the water above takes the glow to 1/e, metres | `LID.FALLOFF_M` | 3000 |
| What a vertical face keeps of the glow | `LID.HORIZON` | 0.3 |
| Linear luminance the palest biome fill is lifted to as an albedo | `GROUND.ALBEDO_LUMINANCE` | 0.2 |
| Share of a fill's chroma the albedo keeps | `GROUND.ALBEDO_SATURATION` | 0.6 |
| Gain on the baked slope the light reads | `GROUND.RELIEF_GAIN` | 8 |
| How fast a hollow of the silt loses the water above it | `GROUND.HOLLOW` | 7 |
| Reaches along a sight line to the water whose hue a pixel wears | `WATER.HUE_REACH` | 0.8 |
| Ambient occlusion's radius, metres | `AO.RADIUS_M` | 45 |
| Radii inside which ground counts whole, and past which not at all | `AO.FALLOFF` | 0.6, 1.4 |
| Gain on what the occlusion's taps found hidden | `AO.GAIN` | 2 |
| Share of the occlusion taken | `AO.STRENGTH` | 0.7 |
| Bloom's threshold | `BLOOM.THRESHOLD` | 0.15 |
| Bloom's knee | `BLOOM.KNEE` | 0.05 |
| Share of the spread light added back | `BLOOM.INTENSITY` | 0.6 |
| The grade's slope, a channel | `GRADE.SLOPE` | 1, 1, 1 |
| The grade's offset, a channel | `GRADE.OFFSET` | 0, 0, 0 |
| The grade's power, a channel | `GRADE.POWER` | 1.06, 1.03, 1 |
| The grade's saturation | `GRADE.SATURATION` | 1.12 |
| Sources a ground draws at most, brightest first | `WORLD_LIGHT.MAX` | 192 |
| Light a source scatters in the water against its light on the ground | `WORLD_LIGHT.VOLUME` | 0.2 |
| How fast a volume's light dies from its source out | `WORLD_LIGHT.VOLUME_FALLOFF` | 24 |
| Share of a source one vent ember is | `WORLD_LIGHT.EMBER_SHARE` | 0.2 |

The world's own sources, a family a row: the light level ground takes directly under
one, how far its pool and its volume reach, and how high over the ground it stands.

| Family | `POWER` | `RADIUS_M` | `HEIGHT_M` |
| --- | --- | --- | --- |
| `vent` | 8 | 160 | 25 |
| `flora` | 4 | 120 | 35 |
| `crystal` | 4 | 110 | 20 |
| `ore` | 1.5 | 70 | 12 |
| `civic` | 6 | 140 | 15 |

`FRAME_GPU_MS`, gate 6's 8 ms, is [graphics-standards.md](graphics-standards.md)'s. Of
the three blocks after step 1's, `HULL_LIGHT`, `HULL_SURFACE` and `SEARCHLIGHT` are SPEC
too, each printed by the section below that owns it and held by the same test.

#### A model in the world's light

*Accepted. The owner accepted this step's look in session on 19 November 2026, on the
named GPU's frames
([#1814](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1814);
[issue-1814](screenshots/issue-1814/README.md)), and its numbers are SPEC, below. The
owner took three calls for it in session on 13 November 2026, each from options written
with the first frames. One of them, that no plate holds a model, went with the plates on
19 November 2026 ([A mark on the lit world](#a-mark-on-the-lit-world)).*

The world pass draws the cladding of the player's own hulls and structures: every opaque
material that is no lamp. So the water takes a hull's light as it takes the ground's, and
the occlusion, the bloom and the grade reach it.

- **The rig stays, and the world's light is added to it.** The other reading dropped the
  rig's key and rim, since there is no sun below the Lid (limit 1): a hull went darker
  and flatter until the own searchlights land. The props keep the rig in this pass, and a
  hull keeps it with them. Beside it a face takes the two lights the ground takes. The
  Lid's glow is the ground's own function of it: by how far the face looks up and by the
  water over it, so a hull that dives darkens as the ground under it does. The pools
  reach it from below: a hull takes what the sources put on the ground under it, by how
  far over that ground it hangs and by how far a face looks down: all of a hull's share
  on a keel, a quarter on a flank and none on a back, so the light shapes the hull. A
  keel over a vent field goes amber and its back does not. That share is well short of
  the ground's, since a hull that outshone the ground under it would read as loud
  (gate 3). Both are added as indirect light, so a navy's
  surface shades them with the rest, and again as what a face mirrors, so a metalled
  plate answers them.
- **The ink and its register do not move.** Colour is never written: hue is the
  faction's (gate 4), and each material keeps the brightness the recolour gave it
  against its model's brightest. The light is the world's own, placed by the map and the
  same for every client (limits 3 and 4).
- **A lamp stays in the tactical pass**, with a blended material such as a haze. Its
  hue, its strength and its halo are what Low draws (gate 3), and the world's depth
  hides it as Low's does.
- **A contact's model is not in this pass.** A live Tier-4 track stands as its model
  ([map-visuals.md](map-visuals.md) §5), and it keeps the template Low draws, whole in
  the tactical pass. In the world pass its body would hide the Lid's glow from the
  ground beside it and feed the bloom, and a contact casts neither shadow nor light
  (limit 2). The other reading counted both as light received. Fidelity stays asymmetric
  (gate 5): the player's own navy is in the world's light and a contact is not.

A model draws from a template of its own at High, as a surfaced one already did, so
nothing Low draws is built, patched or keyed differently:
`packages/frontend/test/hullLight.test.ts` holds that and the split of the two passes.

How much of each light a hull takes is SPEC, promoted on 19 November 2026 with the
owner's acceptance, at the values the accepted frames were taken with.
`HIGH_GRAPHICS.HULL_LIGHT` in `packages/shared/src/constants.ts` holds each, and
`packages/frontend/test/highSpec.test.ts` holds this table to it. A number moves here
first, then there.

| What | Constant | Value |
| --- | --- | --- |
| Share of the Lid's glow a face looking straight up takes, of what level ground takes at its depth | `HULL_LIGHT.LID` | 1 |
| Share of a pool's light a face looking straight down takes on a hull resting on the ground, of what that ground takes | `HULL_LIGHT.POOL` | 0.3 |
| Height over the ground at which that share has halved, drawn metres | `HULL_LIGHT.POOL_REACH_M` | 80 |

Read on those frames: a mark that crosses a hull's body reads over a hull a pool lights
(#1814, D2). Still open, since no frame has tested either: whether a hull's glint feeding
the bloom reads as loudness (gate 3, limit 5), and a second navy, since the crater seats
the Commune's three hulls alone.

#### A navy's surface

*Accepted. The owner accepted this step's look in session on 19 November 2026, on the
named GPU's frames
([#1811](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1811);
[issue-1811](screenshots/issue-1811/README.md)), and its numbers are SPEC, below. Blender
is dropped for hero hulls with it. The owner chose the route in session on 13 November
2026: the surface is built before the step that lights a hull, and a hull wears it
without a layout.*

[#1802](screenshots/issue-1802/README.md) rebuilt one hull in Blender and baked a surface
onto it, and its control showed that surface carried most of the gain on the lit table at
the kit hull's own 2,652 triangles. A map a hull costs 2 MB. This is the cheap
route that record names: the relief belongs to the navy's material, is drawn once, and
tiles.

- **One image a navy material.** `tools/hull-models/surface.mjs` draws each from a row of
  the navy's `SURFACE` table (`tools/hull-models/factions/`), with no random number in
  it, and `npm run check:models` holds the committed image to the draw. Red and green are
  the relief's slope along the tile's two axes and blue is its height, so nothing in it
  is colour.
- **No model carries it and none is laid out for it.** A trim sheet's layout
  ([UV layout and trim sheets](#uv-layout-and-trim-sheets--spec)) packs a part's width
  into strake bands, which tile along a part and not across it, and it lays a grown body
  a triangle at a time. So a fragment reads the image by its own place on the model in
  metres, on the three planes of the model's frame, each weighted by how squarely the
  face looks down that plane's axis. The keel's axis is one axis of the image on the two
  planes that hold it, so a pattern can run square to the keel. The image's other axis,
  `v`, is the beam from above and from ahead and the height from the side. So the line
  where `v` is 0 is the model's centreline on a back, a bow and a stern, and its axis
  along a flank. A material is found by its navy and its own name. No GLB changed, and
  every model of the navy that carries the material wears its surface: twenty-seven of
  the Commune's twenty-eight carry at least one of the four.
- **A flank reads a second image.** *Accepted on 19 November 2026, on the named GPU's
  frames ([#1844](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1844);
  [issue-1844](screenshots/issue-1844/README.md#on-the-named-gpu)).* Whatever a pattern draws along `v` 0
  came out along each flank at the hull's axis, where a hull has neither a back nor a
  keel. A pattern that draws there draws a second image without it, on the first one's
  scale, and the plane seen from the side reads that one. It costs no tap, and a pattern
  that draws nothing along `v` 0 has no second image.
- **A blade reads in a frame of its own.** *Accepted with the flank (#1844).* The
  model's frame stands a line at constant `u` square to the keel, which is root to tip
  only on a fin that stands square off it. A material's row in the navy's table may name
  a **blade**: a part at most `thick` of its depth through and at least `long` depths
  long, measured along the principal axes of its own surface. A blade's place and normal
  are turned into those axes before the three reads, its length where a hull's beam is
  and its normal where a hull's height is, so a line at constant `u` runs along it. The
  frame is found from the part's shape when the High template is built and rides on its
  vertices, so no GLB changed and the fragment pays nothing. A part that is no blade
  keeps the model's frame.
- **It leans the normal and shades the indirect light, and nothing else.** The slope
  tilts the shading normal. The height lifts and lowers the rig's ambient and environment
  light, and the world's with them
  ([A model in the world's light](#a-model-in-the-worlds-light)), about the surface's own
  mean, as a baked occlusion map touches indirect light
  alone ([Bevels and baked occlusion](#bevels-and-baked-occlusion--spec)). Colour is never
  written, so hue stays the faction's ink (gate 4). A lamp wears none, so gate 3 holds
  unaltered. It adds no pass, call or triangle.
- **It is the world layer's, at High alone.** A hull's surface is on the world layer
  ([Two layers, two laws](#two-layers-two-laws)). The High quality builds a model's
  template apart from Low's, so nothing Low draws is built, patched or keyed differently:
  `packages/frontend/test/navySurface.test.ts` holds that.
- **A hull that brings a surface of its own keeps it.** A material with a normal map in
  its file wears no second one over it.

The Commune's four are the fields #1802 baked, said as tiles. `chitin_hull` is a leaf's
venation over growth lines: a midrib, laterals trailing aft from it, and a net of
veinlets between. The midrib is drawn where the image's `v` is 0, so it runs down the
back and the keel, and down the bow and the stern at the centreline. The owner took the
bow and the stern in session on 13 November 2026: the first cut drew it across them as a
band. A flank reads the skin's second image, which has no midrib. Its `v` 0 is the leaf's
margin, half a tile from the midrib: the laterals that came down off the back meet the
ones that came up off the keel there, each at its thinnest, and both trail aft as the
back's do. `growth_ridge` is a grain of rings square to the
keel, `spore_pod` a pored skin, and `algae_membrane` a fin's rays. Its blade is at most a
quarter as thick as it is deep and at least 2.35 times as long: 32 of the navy's 175
membrane parts, the Corvette's six fins among them. A part's length is root to tip when it
is rooted at one end, and 2.35 stands in the widest gap the roster leaves, between the
Spinner's flukes at 2.24 and the Chorister's at 2.49. A trim vane rooted along its length,
a fluke as wide as it is long, a pod and a ring are not blades, and square to the keel is
already root to tip on each. Both numbers are the table's own, as the heights are, and
the frames the owner accepted for #1844 were taken with them. The navy's block asks
for "growth rings and living bioluminescent veins"
([asset-prompts-3d.md](asset-prompts-3d.md)); these veins are relief and emit nothing.
Their heights are in the table, in metres.

How far the client leans them is SPEC, promoted on 19 November 2026 with the owner's
acceptance, at the values the accepted frames were taken with.
`HIGH_GRAPHICS.HULL_SURFACE` in `packages/shared/src/constants.ts` holds each, and
`packages/frontend/test/highSpec.test.ts` holds this table to it. A number moves here
first, then there.

| What | Constant | Value |
| --- | --- | --- |
| Gain on the drawn slopes, 1 being the relief as its table gives it in metres | `HULL_SURFACE.RELIEF` | 2.5 |
| Spread of the indirect light from the deepest hollow to the highest crest, about the surface's own mean | `HULL_SURFACE.CAVITY` | 0.5 |
| Anisotropic taps a surface is read with, the trim sheets' four | `HULL_SURFACE.ANISOTROPY` | 4 |

Two things a tile cannot do, which the Blender hull does. It cannot find a hull's own
back, so the midrib follows the model's frame and a wide deck takes another every
16 m. And it cannot find a fin's outline: a blade's rays run parallel along it and off
its edge, where the Blender hull's close on its tip.

Read on the named GPU's frames ([issue-1811](screenshots/issue-1811/README.md)), and
closed (#1811):

- **Blender is dropped for hero hulls** (D1). Beside the kit Corvette wearing this, the
  Blender one does not clearly win at the near cameras, and it adds 83,260 triangles a
  frame. The spike stays as [#1802](screenshots/issue-1802/README.md)'s
  record, and no shipped hull is built by it.
- **Nothing shimmers** on the swing round the hull (D2).
- **The lean stays 2.5.** It was set under Low's rig, before the world lit a hull
  (#1814), and the owner kept it under that light on 17 November 2026.
- **Three taps a clad fragment fit gate 6.** High reads 2.11 to 2.78 ms queued at its
  four cameras with them in it, inside the 8 ms
  ([issue-1801](screenshots/issue-1801/README.md#on-the-named-gpu)).

The tile's two faults, a fin's rays crossing a raked blade and the midrib's line along
each flank, were filed as
[#1844](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1844) (D3) and mended
there. The owner accepted its frames on 19 November 2026 and kept its three calls: a
blade's rays run parallel in its own frame, a face seen abeam reads a second image, and
the flank's laterals meet at the leaf's margin.

#### An own hull's searchlight

*Accepted. The owner accepted this step's look in session on 19 November 2026, on the
named GPU's frames
([#1836](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1836);
[issue-1836](screenshots/issue-1836/README.md#on-the-named-gpu)), and its numbers are
SPEC, below. Three calls were taken in the open with the first frames: its strength, its
shadow, and how many beams a hull throws. **The owner kept all three** the same day: the
lamp halo's gain, the read shadow, and one beam a hull. The readings not taken stay
written under each. High at rest reads 2.05 to 2.72 ms queued on those frames, inside
gate 6's 8 ms. **Gate 7 reads in the standard palette:** the owner read the Corvette's
ring over its own pool on those frames the same day. The other three palettes are not
taken yet.*

Each of the player's own hulls throws one beam from its bow, along its heading, in its
navy's glow ([style-neon-noir.md](style-neon-noir.md) "World light").
It is agent light, the first at High: it pools on the ground and the stone, lights the
cladding of another own hull it crosses, and scatters in the water as a cone. It is the
first light with a direction, so it is the first to cast a shadow.

- **Its strength is the lamp halo's.** Limit 5 says a beam reads no louder than the
  hull's lamps, and gate 3 at High lets a lamp's light spread "only as far as its SIG
  says, as the halo does". So a beam takes the halo's own gain
  ([Lamp halo — SPEC](#lamp-halo--spec)): nothing through SIG 15, climbing to 1 at
  SIG 35 along gate 3's curve, and on to SIG 45, where it stops. The halo climbs to 80,
  and a beam does not follow it there because a pool is ground a mark stands on
  (limit 6). The server holds a hull on Silent Running to SIG 3 to 8, so it throws no
  beam and no pool, by construction. Two other readings were written. **The lamp's own
  factor**, which is its live SIG against its resting SIG, lights every hull at rest and
  leaves a silent hull a twentieth of a beam: a Light Scout resting at SIG 6 would
  floodlight the seabed. **The 61+ band alone**, where the prompt table says
  "floodlit", keeps the target frame's brightest light off almost every frame.
- **It looks at the ground a throw ahead.** A move order takes a hull down to the floor
  it is sent over, and a hull at rest in the crater hangs 66 drawn metres over it. A
  beam at one angle under the level put the first one's pool under its own keel. So a
  beam looks at the ground 130 m ahead of its lamp, between 8 and 50 degrees under the
  level: a hull skimming the floor rakes it, and one over the bowl does not look
  straight down. The lamp stands at least 4 m over the ground, since a hull is drawn
  larger than life at the far dollies and its keel line with it.
- **Own hulls only.** A contact throws no beam and shadows none (limit 2): the list is
  built from the player's own hulls, and a contact's model is not in it. A structure
  throws none yet.
- **The shadow is read, not rendered.** The ground is a height field, so a lit point asks
  the ground's own heights whether the line to the lamp clears them, and asks each own
  hull the same, as its keel line and half its beam. Rock is ground here, so rock
  shadows ground, hull and water, and a hull shadows ground and water. A shadow's edge
  is 2 m of clearance either way, soft and of one width. The other reading
  was a shadow map a beam: a second camera and a pass a beam, which gate 8 refuses a
  lighting change, for the silhouette of a hull where this has its length and beam. It
  is the cheaper to reverse. What it does not draw: a hull's shadow on another hull, a
  prop's shadow on anything, and a roof over a passage.
- **The cone is cut by the same shadow.** A beam's light in the water is summed along
  each sight line through the cone, into the scatter pass's target, and a rock or a hull
  in the beam leaves a dark shaft behind it. No pass is added.
- **One beam a hull, and six a frame.** The target frame shows several lamps a hull,
  each with a beam. Three readings were written. **One beam, off the bow**, is taken:
  six beams light six hulls, and a beam costs every lit fragment in its cone the same
  whichever hull throws it. **A beam from each lamp the model carries** is the closest
  to the target, and a beam would leave a lamp the tactical pass draws. Six beams would
  then light fewer hulls. The owner kept one beam, and a beam from each lamp is a look
  step of its own ([#1845](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1845)).
  **A count a hull class**, written in
  [asset-prompts-3d.md](asset-prompts-3d.md), needs that doc's blocks first. Past six,
  the hulls nearest the camera's focus throw theirs and the rest throw none: a beam off
  the frame lights nothing a player sees. The work lights keep the loudest instead
  (`workLight.ts`), which here would spend a beam on a loud hull across the map. Eight
  hulls may shadow.
- **The ground reads it by its relief.** A beam has a direction, so the bake's slope
  shades it as it cannot shade the Lid's glow: a dune's lit face and its lee. The
  hollows take a share of it as they take a share of a pool.
- **A prop takes none yet.** A stand in a beam is lit by the rig as it was. Props are
  one material at both qualities, and a High prop needs a template of its own first, as
  a hull's cladding has. A decorative body has one since #1837 and takes a beam
  ([Life in the world's light](#life-in-the-worlds-light)); a standing prop still takes
  none.
- **No mark, lamp or halo is touched.** The lamp a beam leaves is the tactical pass's,
  at the strength its SIG set (gate 3). A mark over a pool stands bare (limit 6), and
  gate 7's glance at one reads in the standard palette and is owed in the other three
  (above).

`packages/frontend/test/searchlights.test.ts` holds the gain to the halo's, the silent
hull dark, the aim and the shadow's two readers, and
`packages/frontend/test/rendererSmoke.test.ts` counts the beams a frame draws. Limit 2
is held by what the view hands over: its own units, which the wire types as the
player's (`OwnUnit`), and never a track.

How strong a beam is, where it looks and how its shadow is read are SPEC, promoted on
19 November 2026 with the owner's acceptance, at the values the accepted frames were
taken with. `HIGH_GRAPHICS.SEARCHLIGHT` in `packages/shared/src/constants.ts` holds each,
and `packages/frontend/test/highSpec.test.ts` holds this table to it. A number moves here
first, then there. Light is in the renderer's linear units, where the shared rig's key
gives 1.8 face on.

| What | Constant | Value |
| --- | --- | --- |
| Beams a frame draws, nearest the camera's focus first | `SEARCHLIGHT.MAX` | 6 |
| Own hulls that may shadow them | `SEARCHLIGHT.OCCLUDERS` | 8 |
| Light a face square to the beam takes at the reference distance, at the halo's gain of 1 | `SEARCHLIGHT.POWER` | 40 |
| That reference distance along the beam, metres | `SEARCHLIGHT.REF_M` | 100 |
| Distance inside which the fall by the square is softened, so the lamp is finite, metres | `SEARCHLIGHT.CORE_M` | 45 |
| Distance at which the beam's window closes, metres | `SEARCHLIGHT.REACH_M` | 520 |
| Live SIG past which a beam no longer brightens | `SEARCHLIGHT.GAIN_SIG_CAP` | 45 |
| Half-angle the cone is whole inside, degrees | `SEARCHLIGHT.INNER_DEG` | 10 |
| Half-angle the cone is gone outside, degrees | `SEARCHLIGHT.OUTER_DEG` | 17 |
| How far ahead of its lamp a beam looks at the ground, metres | `SEARCHLIGHT.THROW_M` | 130 |
| The least and the most a beam looks under the level, degrees | `SEARCHLIGHT.DEPRESSION_DEG` | 8, 50 |
| How far off the bow the lamp hangs, metres | `SEARCHLIGHT.CLEAR_M` | 3 |
| How far under the keel line the lamp hangs, in beams | `SEARCHLIGHT.KEEL` | 0.25 |
| The least the lamp stands over the ground, metres | `SEARCHLIGHT.LAMP_CLEAR_M` | 4 |
| Share of a beam another own hull's cladding takes, of what ground would | `SEARCHLIGHT.HULL` | 0.5 |
| Share of a beam's light a metre of water scatters to the eye | `SEARCHLIGHT.VOLUME` | 0.0001 |
| Steps a sight line takes through the cone | `SEARCHLIGHT.VOLUME_STEPS` | 16 |
| Reads of the ground's heights between a lit surface and the lamp | `SEARCHLIGHT.SHADOW.STEPS` | 12 |
| The same, from a point in the water | `SEARCHLIGHT.SHADOW.VOLUME_STEPS` | 4 |
| Height the shadow's line is carried over the ground, so level ground never shadows itself, metres | `SEARCHLIGHT.SHADOW.LIFT_M` | 1.5 |
| Half-width of a shadow's soft edge, in metres of clearance | `SEARCHLIGHT.SHADOW.SOFT_M` | 2 |
| Where a hull's shadow is whole and where it is gone, in half-beams from its keel line | `SEARCHLIGHT.SHADOW.HULL_EDGE` | 0.7, 1.4 |

#### Life in the world's light

*In development with the rest of High, and not accepted
([#1837](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1837);
[issue-1837](screenshots/issue-1837/README.md)). Every number is TUNABLE in
`HIGH_GRAPHICS.LIFE` and `FREE_WATER_HIGH_LIFE` (`packages/shared/src/constants.ts`) until
a frame of it is accepted. The owner took three calls in session on 20 November 2026,
before any frame: the bodies are the crater's decorative life, the drifting bodies are a
new jelly model, and the vents are an authored stand on the rim. The schools were the
step's first instalment and the jelly its third. Its own light is the section after this,
on a fourth call of the owner's, and the vents the one after that. Three more calls were
taken in the open with the frames, and wait on the owner: a body's register, a fry's own
light, and where High's life stands.*

The crater's decorative bodies
([free-water-slice.md](free-water-slice.md) §5) were props in the world pass under the
shared rig: a fish beside a lit hull stood in none of the light the hull did, and read as
a hole in the water. Each now draws from a template of its own at High, as an own hull
does, and nothing Low draws is built, patched or keyed differently.

- **A body takes the light a hull takes.** The rig stays, and beside it a face takes the
  Lid's glow by how far it looks up and by the water over it, and the pools from below.
  Its three shares are knobs of its own, set to a hull's
  ([A model in the world's light](#a-model-in-the-worlds-light)), since a fish beside a
  hull stands in the same light. An own hull's searchlight lights a body
  that swims through it, at half of what ground would take, and the ground and a hull
  shadow it. So a school crossing a beam shows in the navy's glow, and one outside it is
  lit by the Lid alone.
- **It answers the light and never the hull** (limit 4). Where a body swims is its
  authored loop and the shared match time. A beam finds a school or misses it and moves
  neither. A contact throws no beam, so no body is ever lit by one (limit 2).
- **Its register is the cladding's ceiling.** A prop's brightest material is held to
  0.06 linear, under every vessel, and at that a body a few pixels long is darker than
  the water behind it. Three readings were written. **The props' 0.06** keeps the rule
  and loses the fish. **An own hull's cladding ceiling, 0.16**, is taken: a body stands
  no brighter than a vessel's cladding, so scenery still never out-reads one, but for
  the manta's belly ([A manta shows its belly](#a-manta-shows-its-belly)). **A silver
  flank**, 0.4 and up, reads best under the Lid and blooms white in a beam.
- **A schooling fry carries one light of its own**, in `life-glint`
  ([style-neon-noir.md](style-neon-noir.md) "World light"). Under the Lid alone a school
  at the cladding's register is still only a little paler than the water, and the law
  gives the world layer "the modelled bodies of public life with their light". Three
  readings were written. **No light but the deep fish's photophores**, as Low has them,
  leaves a school dim wherever no beam is. **One point on each schooling fry** is taken:
  a soft disc 0.22 m across on the flank, drawn in the world pass, so the water takes it
  with distance and the bloom spreads it a little. One light stands under the lamps of a
  hull loud enough to throw a beam: on the software frames it peaks at 144 of 255, and the
  Corvette's lamp, at SIG 28, at 165. Light adds, so where a dense school's lights overlap
  the peak is 160, level with the Harvester's lamp at SIG 18. A quiet hull's lamp is
  dimmer than one fry: the Light Scout's, at SIG 6, reads 130. World light is not loudness
  at High ([What it releases at High](#what-it-releases-at-high)). A fry over a quiet
  hull's lamp is kept as built: the owner read a school beside a hull as clear of gate
  3's reading of it on 24 November 2026, on the named GPU's Close frame (#1863).
  **A light on every
  body** would make the ray and the outer fish lamps of their own. A light far enough to
  draw under 1.6 pixels is drawn at 1.6 with its level cut by the area gained, so a far
  school fades instead of sparkling.
- **A drifting jelly is not a lit body.** Its first cut was one: `env-drift-jelly` at
  the cladding's register, a pewter bell over dark arms, with a point of `life-glint` on
  each of the six seats its file marks, at a fry's level. A seat 190 m off read 127 of
  255 at Close, under every lamp, and the bell read by its body. The owner saw that
  frame on 20 November 2026 and asked for the target's jelly instead:
  [A jelly is a lantern](#a-jelly-is-a-lantern), below. At Low a jelly is not stood, and
  its seats are never the stipple channel's dots.
- **A fry's light is not the stipple.** Rung 5's stipple is public life's field mark, in
  the palette's fauna colour, on the tactical layer at both qualities
  ([map-visuals.md](map-visuals.md) §8). This is world light, in a world token, and it
  never scatters, gathers or brightens for anything a match does. The deep fish's
  photophores are the stipple channel's at Low alone: the next call moves them.
- **A deep fish's photophores are world light**
  ([#1857](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1857);
  [issue-1857](screenshots/issue-1857/README.md)). *In development, and not accepted.*
  At High each of the six seats its file marks carries a point of `life-glint` in the
  fry's cloud, and no dot of the stipple channel stands on one: a seat drawn twice would
  be taken by the water once and handed back by the canvas. Low keeps its dots and its
  licence ([free-water-slice.md](free-water-slice.md) §5). Three readings of the token
  were written. **`life-glint`** is taken, one token for the crater's fish. **A token of
  its own**, a palette's as `jelly-lantern` is, would be a third hue of life for six
  points a fish. **Leave them the stipple's** keeps a field mark's colour on a body the
  world pass lights. The owner took a seat's light in two calls in session on
  21 November 2026, on the software frames. It was read from two eyes: an orbit focused
  on a ring of fish at its least dolly, 250 m, where a 2 m fish draws 12 px at
  1920 × 1080, and NAV's flight, about 60 m from one. The dolly bounds an eye's
  distance to its focus and not to a fish, so an orbit focused past a ring can stand
  between the two, and no frame was taken there. Five readings were written. **A fry's point**, 0.22 m at a
  fry's 0.3, is under the 1.6 px floor at 250 m: a fish peaked at 71 to 111 of 255, a
  faint dash. **0.5 m at 0.4** peaked at 150 to 195 there, over the Corvette's lamp at
  165. **0.4 m at a fry's level** was the first call, at 108 to 161, and its flight
  frame overturned it: a flank's three seats stand 0.22 to 0.24 m apart, so discs that
  wide merge into one lit patch, lit skin and no photophore. **A fry's width at twice
  its level, 0.6** is taken: three points that stand apart on the flank, and a fish
  peaked at 102 to 162 from 250 m, until #1876 below. Its cost is the register. A
  seat's centre is over a fry's and over the bloom's threshold, and from a flight eye
  about 60 m off a fish
  peaks at 184, over that lamp, as the patch did at 186. A deep fish swims at 2,000 m
  and the fixture's hulls start at 300 m, so none stands beside a lamp unless a hull is
  ordered down, and whether its points muddy gate 3's reading of a hull there is the
  owner's glance. **Three points
  held under the lamp**, at a level of about 0.45, was put to the owner with these and
  not taken. The water takes a seat's light with distance, as it takes a fry's. From
  gate 6's low camera the three rings Low draws into the pocket, 2 km off, are gone at
  High, and were under every reading captured there: the widest lifted a ring's pixels
  by 8 of 255. That is the cost of the move, and the owner took it with the
  first call. A seat's light is lit by the way its seat faces
  ([#1876](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1876);
  [issue-1876](screenshots/issue-1876/README.md)). The lift that keeps a body's flank
  from cutting a light's disc, a fry's 0.15 m, carried the far flank's aft light 1.3 cm
  through a body 0.12 m wide there, from abeam, where it added to the near one. Three
  readings were written, and the owner took two calls in session on 21 November 2026.
  **A lift of a seat's own, 0.04 m** was the first, and its flight frame overturned it:
  it hid a far flank's light from every bearing, and seen off square the flank cut the
  near discs into ovals. **Lit by its facing** is taken: a
  seat's light is whole while its seat faces the eye, within 60 degrees of square, and
  gone edge on, on its facet's own normal in the file. A far flank's light is then dark
  from every bearing, and the lift is a fry's again. Its cost is a fish seen end on,
  where both flanks' seats stand near edge on to the eye. From 250 m the ring's six
  peak at 64 to 113 where they peaked at 102 to 162: the two seen end on lost 42 and
  49, and the other four lost 5 to 29, which was a far flank's light showing. **A
  fry's lift and no more** leaves one point of three doubled from abeam.
- **High stands more life than Low**, where the target's cameras read a body
  ([free-water-slice.md](free-water-slice.md) §5, "High's own life"). Two readings were
  written. **Add to Low's lists** would move the frame Low draws. **Slots High alone
  stands** is taken: two streams of schools by the fleet's start, 480 fry and 48 outer
  fish, and five jellies over it, after Low's list and never among it. #1856 adds a
  third stream, below. A school there
  keeps a tight station: a ribbon of fry 14 m long with a body about every metre. The
  first cut spread a school over 52 m, so that a still camera always held fish, and from
  the Close eye it read as scattered points and not as a school. Five schools a loop keep
  the frame filled instead.
- **A school stands before a light, to read dark against it**
  ([#1856](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1856);
  [issue-1856](screenshots/issue-1856/README.md)). *The owner accepted its look on
  24 November 2026, on the named GPU's Close frame
  ([issue-1891](screenshots/issue-1891/README.md#on-the-named-gpu)). Its slot stays
  TUNABLE with the rest of this section until step 3 is accepted.*
  The target's schools are dark masses against lit water. No model, material or light
  is new to get one. A source's volume stops at what the world pass draws, a body as
  the ground ([What is built at High](#what-is-built-at-high)), so a body before a
  source hides the light behind it. An outer fish carries no light. Its flank is still
  lit: by the rig, by the Lid's glow and by a quarter of a pool, less by its height
  over the floor, as a hull's is
  ([A model in the world's light](#a-model-in-the-worlds-light)). On the software
  frames a body before the vent stand reads at 0.65 of the water behind it, darker than
  the glow and paler than the target's near black. A silhouette is the aim, and the
  owner read it as one on the named GPU. Three readings were written. **A
  third stream, of outer fish, before the vent stand** is taken: a mill of 120 between
  the Close eye and the stand's light ([free-water-slice.md](free-water-slice.md) §5).
  **Move the rim's outer stream there** would change frames #1837 already shows. **Dim
  a fry's light where it is backlit** is refused: a light that answers a light is an
  instrument (limit 4).
- **No mark, lamp or halo is touched.** A fry's light is a point of the world layer's,
  under every mark, and gate 7's glance at a ring among a school is the owner's, on the
  named GPU.

`packages/frontend/test/lifeLight.test.ts` holds the two templates apart, the patch's
anchors and the light's pass, and `packages/frontend/test/freeWaterDecoration.test.ts`
holds Low's list unmoved under High's.

| What | Constant | Value |
| --- | --- | --- |
| Share of the Lid's glow a face looking straight up takes, of what level ground takes at its depth | `LIFE.LID` | 1 |
| Share of a pool's light a face looking straight down takes on a body at the ground, of what that ground takes | `LIFE.POOL` | 0.3 |
| Height over the ground at which that share has halved, drawn metres | `LIFE.POOL_REACH_M` | 80 |
| Share of a beam a body takes, of what ground would | `LIFE.BEAM` | 0.5 |
| Linear luminance a body's brightest material is lifted to | `LIFE.ALBEDO` | 0.16 |
| A fry's light at its centre, in the renderer's linear units | `LIFE.GLOW.LEVEL` | 0.3 |
| Width of a fry's light, metres | `LIFE.GLOW.SIZE_M` | 0.22 |
| The least a light is drawn, pixels | `LIFE.GLOW.MIN_PX` | 1.6 |
| How far toward the eye a light is drawn from its body's axis, metres | `LIFE.GLOW.LIFT_M` | 0.15 |
| A deep fish's seat light at its centre, in the renderer's linear units | `LIFE.GLOW.SEAT.LEVEL` | 0.6 |
| Width of a deep fish's seat light, metres | `LIFE.GLOW.SEAT.SIZE_M` | 0.22 |
| Cosines between a seat's facing and the sight line at which its light is dark, and whole | `LIFE.GLOW.SEAT.FACE` | 0, 0.5 |
| A jelly's seat light at its centre, in the renderer's linear units | `LIFE.GLOW.LANTERN.LEVEL` | 0.3 |
| Width of a jelly's seat light, metres | `LIFE.GLOW.LANTERN.SIZE_M` | 0.55 |

#### A jelly is a lantern

*In development with the rest of High, and not accepted
([#1837](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1837);
[issue-1837](screenshots/issue-1837/README.md)). Every number is TUNABLE in
`HIGH_GRAPHICS.LIFE.JELLY` (`packages/shared/src/constants.ts`) until a frame of it is
accepted. The owner called it in session on 20 November 2026, with a crop of the target
([target-jelly.jpg](screenshots/issue-1837/target-jelly.jpg)): bring the jellies closer to
the target's and develop their bioluminescence, in as many rounds as it takes. Four
calls were taken in the open on the way, and wait on the owner: its hue, how bright it
stands, what moves, and its strands beside the Tetherjelly's figure. The round's critic
overturned the first hue, which is now a palette's own.*

The target's jelly is light and not a lit body: a translucent bell glowing from within,
over long strands of beads of light. At High `env-drift-jelly` is drawn as one.

- **The bell is a membrane.** Each face adds its light to what is behind it and hides
  nothing, both sides drawn. So the far wall shows through the near one, and the edge,
  where the eye looks along the skin, is the brightest of it: what a thin lit skin does.
  Sixteen radial canals and the lip are brighter lines on it, and the short lobes under
  the bell a plainer light. The file emits nothing and is flat-shaded stone at intake;
  the renderer gives the membrane one normal a vertex, so the skin curves where the
  file's facets meet.
- **Its strands are beads of light, not geometry.** Eighteen hang from the lip, 7 to
  12 m long and 18 beads each, smaller and dimmer toward the tip. The first cut hung
  twenty-two of up to 17 m, a curtain 2.4 bell-widths long where the target's strands
  fall about 1.4. With them go a point on
  each of the six seats the file marks, and one soft disc 15 m across for the glow in
  the water round the bell. All are points of the world pass, as a fry's light is, each
  never narrower than its floor.
- **Its light is a token of its own, `jelly-lantern`, and a palette's**
  ([style-neon-noir.md](style-neon-noir.md#world-light--the-terrain-carve-outs)). Four
  readings were written. **The target's own hue** is Hadron's glow within a degree, and
  violet is reserved: no world-owned light takes an agent's token. **`life-glint`**, the
  bone white the first cut wore, keeps one token for all life and is nothing like the
  target. **One orchid pink for every palette** was taken first, and the round's critic
  overturned it on a measurement: to a tritanope it stood 1.7 dE from the Directorate's
  glow. That projection of a tritanope had no red-green axis
  ([#1905](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1905)); a
  deuteranope's 4.2 dE from a Tier 2 contact refuses the one pink all the same.
  **A lantern each palette owns** is taken, as a navy's inks are: an orchid pink
  in the standard palette, 35 degrees pinker than Hadron's violet and 29 bluer than the
  interface's magenta, a saturated violet in the red-green pair's and that orchid a shade
  pinker in tritanopia's (#1913). Its floor is
  25 dE from every navy's inks, every contact tier, both chrome neons and
  `neon-violet`, to the eye its palette serves. All four hold it, and what the floor
  leaves out is in
  [style-neon-noir.md](style-neon-noir.md#world-light--the-terrain-carve-outs). A lantern
  follows a palette changed mid-match.
- **It moves, and for nothing** (limit 4). Three things run on the shared match time,
  each jelly's clock 19.75 s ahead of the last's. That leaves every pair of the five at
  least 1 s apart in the stroke, 1.75 s in the wave and 1.25 s in the sway, so no two
  are in step. The first stagger, 2.3 s, folded two of the five onto one another, 0.2 s
  apart in the wave. The bell strokes: once in
  5.5 s the lip is drawn in by 16% of its radius and let go. The strands sway 1.8 m at
  the tip and trail 5 m behind the way the jelly drifts. And a wave of light runs from
  the crown down the bell and out along the strands once in 9 s, at 5 m/s, adding 60% to
  what it passes. High lets a world light move smoothly
  ([What the world layer may do at High](#what-the-world-layer-may-do-at-high)). No
  hull, shot, ping or camera starts, hurries or brightens any of it, and reduced motion
  holds all three, with no wave held on the body.
- **It stands at about the target's own level.** The target's jelly reads 176 of 255 at
  its brightest. On the Close frame the three nearest lanterns' lips read 189, 177 and
  164, from 190, 260 and 318 m, the far two 146 and 142, and a bead 149 at most. The
  first take stood them at 218 and was turned down. A lantern is still the brightest life in
  the frame, and over every lamp beside it, which read 165, 159 and 130. The first cut
  held a seat under the lamps; that was the author's bar and not a rule. World light is
  not loudness at High, and what tells a lantern from a lamp is its hue and its form.
  The held frames show no wave, which adds 60% as it passes. A lantern at 189 of 255 over
  every lamp beside it is kept as built: the owner read five lanterns over the fleet as
  clear of gate 3's reading of a hull on 24 November 2026, on the named GPU (#1863).
- **It is not the Tetherjelly's figure.** A shallow bell over trailing strands is also
  what a Tetherjelly field's stipple draws ([map-visuals.md](map-visuals.md) §8), and
  [free-water-slice.md](free-water-slice.md) §5 keeps the two apart. Three readings were
  written. **A bell alone** is clear of the figure and is not the target. **Strands as
  unbroken lines** leave the figure's dots, and the target's beads with them. **Beads, as
  the target has them** is taken, on the owner's call for the target. What still stands
  between the two: a lantern is a lit skin and not a figure in dots, in its own hue and
  not the fauna colour, a seventh as wide, over eighteen strands and not six, alone and
  adrift where a field's bells stand. The owner kept the figure as built on 24 November
  2026 (#1863).
- **Low draws none of it, and no mark, lamp or halo is touched.** A jelly is not stood
  at Low, and Low's template of its file is the stone it always was. A lantern hangs
  inside the Harvester's ring at Home and the Corvette's at Close, and along every
  ring's circle the lanterns lift the ground by 10 of 255 at most.

`packages/frontend/test/jellyLight.test.ts` holds the two templates apart, the membrane's
blend and pass, the patch's anchors, the points a jelly hangs and what reduced motion
holds, and `packages/frontend/test/tutorialLoading.test.mjs` counts them in the crater.

| What | Constant | Value |
| --- | --- | --- |
| Light a face of the bell square to the eye gives, in the renderer's linear units | `LIFE.JELLY.BELL.LEVEL` | 0.04 |
| What a face edge-on adds | `LIFE.JELLY.BELL.RIM` | 0.2 |
| How fast that falls toward the face: the exponent on one less the cosine | `LIFE.JELLY.BELL.RIM_POWER` | 2.2 |
| Radial canals round the bell | `LIFE.JELLY.BELL.RIBS` | 16 |
| What a canal adds on its line | `LIFE.JELLY.BELL.RIB` | 0.04 |
| How thin that line is: the exponent on its cosine | `LIFE.JELLY.BELL.RIB_POWER` | 12 |
| What the lip's band adds | `LIFE.JELLY.BELL.MARGIN` | 0.07 |
| Half-width of that band, metres | `LIFE.JELLY.BELL.LIP_M` | 0.3 |
| Light of the lobes under the bell | `LIFE.JELLY.BELL.CORE` | 0.08 |
| Strands a jelly hangs | `LIFE.JELLY.STRANDS.COUNT` | 18 |
| Beads a strand | `LIFE.JELLY.STRANDS.BEADS` | 18 |
| The longest strand, metres | `LIFE.JELLY.STRANDS.LENGTH_M` | 12 |
| The shortest, as a share of the longest | `LIFE.JELLY.STRANDS.SHORTEST` | 0.6 |
| Where a strand hangs, as a share of the lip's radius | `LIFE.JELLY.STRANDS.ROOT` | 0.94 |
| How much of that radius a strand is gathered in by, at its tip | `LIFE.JELLY.STRANDS.GATHER` | 0.3 |
| Width of a bead at the lip, metres | `LIFE.JELLY.STRANDS.SIZE_M` | 0.45 |
| How much narrower the bead at the tip is, as a share | `LIFE.JELLY.STRANDS.TAPER` | 0.45 |
| A bead's light at its centre, at the lip | `LIFE.JELLY.STRANDS.LEVEL` | 0.38 |
| How a bead's light falls to the tip: the exponent on what is left of the strand | `LIFE.JELLY.STRANDS.FADE` | 0.4 |
| How far a strand's tip sways, metres | `LIFE.JELLY.STRANDS.SWAY_M` | 1.8 |
| Seconds one sway of a strand takes | `LIFE.JELLY.STRANDS.SWAY_PERIOD_S` | 7 |
| How far its tip trails behind the drift, metres | `LIFE.JELLY.STRANDS.TRAIL_M` | 5 |
| Width of the glow round the bell, metres | `LIFE.JELLY.HALO.SIZE_M` | 15 |
| That glow at its centre | `LIFE.JELLY.HALO.LEVEL` | 0.03 |
| Seconds a stroke of the bell | `LIFE.JELLY.SWIM.PERIOD_S` | 5.5 |
| Share of its radius a stroke draws the lip in | `LIFE.JELLY.SWIM.SQUEEZE` | 0.16 |
| Seconds between two waves of light | `LIFE.JELLY.PULSE.PERIOD_S` | 9 |
| Speed of a wave along the body, metres a second | `LIFE.JELLY.PULSE.SPEED_MPS` | 5 |
| Width of a wave, metres | `LIFE.JELLY.PULSE.WIDTH_M` | 3.5 |
| How far over the crown a wave starts, in its widths | `LIFE.JELLY.PULSE.LEAD` | 2 |
| What a wave adds, as a share of the light it passes | `LIFE.JELLY.PULSE.GAIN` | 0.6 |
| Seconds one jelly's clock runs ahead of the last's | `LIFE.JELLY.STAGGER_S` | 19.75 |

#### A far bloom of lanterns

*In development with the rest of High, and not accepted
([#1859](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1859);
[issue-1859](screenshots/issue-1859/README.md)). Every number is TUNABLE in
`FREE_WATER_HIGH_LIFE.BLOOM` and `HIGH_GRAPHICS.LIFE.JELLY.FAR`
(`packages/shared/src/constants.ts`) until a frame of it is accepted.
[issue-1837](screenshots/issue-1837/README.md) offered it with its frames and did not
build it. Its first cut drew a lantern as two points and no body. The owner saw that
cut's software frames and took six calls in session on 22 November 2026: whole lanterns,
120 of them, on the ellipse, in procession clockwise, with a softer wave, and a
Tetherjelly field staged beside the river before it merges. The same day, on the second
cut's software frames, the owner left the river from Home and from Survey as they
stood, left a lantern keeping its depth and leaning its own way, found a mark readable
among the lanterns, ruled that the bloom may go on a map that has fields, and asked that
its movement be thought through as the ocean's currents and turbulence. None of that is acceptance, which waits on the named
GPU's frames. Three calls were the author's, taken in the open here: the eddy, with its
numbers and its loop closing, where the staged field stands, and that the page carries
no timing run. The owner saw the third cut's clip the same day and left all three as
they stood, which is not acceptance either.*

From Home's eye the bowl beyond the fleet was empty water, and the five lanterns hung
over the fleet's start alone. A river of 120 lanterns now drifts far out over the bowl
([free-water-slice.md](free-water-slice.md) §5, "A far bloom over the bowl").

- **A far lantern is a whole lantern.** Each is `env-drift-jelly` as the five by the
  fleet are ([A jelly is a lantern](#a-jelly-is-a-lantern)): the bell a membrane, its
  seats, its eighteen strands of beads and the glow round it. Three readings were
  written. **Points alone** was the first cut: a soft disc for the bell and a glow
  round it, at no triangle. From 400 m it was a disc with no bell and no strands.
  **None** leaves the bowl the dark it is. **Whole lanterns** is the owner's call. The
  river costs 71,280 triangles and 39,720 points, and High's frame stands at up to
  835,327 of the crater's 900,000 with it ([free-water-slice.md](free-water-slice.md)
  §7).
- **There are 120.** The owner's count, against 30, 60 and 200. From Home's eye a bell
  is 4 to 7 px across, so a river needs enough of them to read as one, and 200 would
  leave every later step 17,000 triangles.
- **It is no draw of its own.** The river's lanterns are instances of the jelly's own
  file, after the five in its list, so its bells are the two draws the five already
  take and its points are in the lantern's cloud. High's draw calls and passes are
  what they were.
- **A lantern's beads are written once, not drawn again each frame.** A lantern hangs
  331 points, and their places are written on the CPU every frame. As #1837 wrote
  them, each bead drew its own hashes, powers and sine: 720 sines a jelly, and 9 ms of
  a frame for 125 jellies in Node on the machine that built this. What never changes
  is now kept: a strand's bearing, length and phase, and a bead's place on its strand.
  A frame draws one sine and one cosine a strand, and an exponential only for a bead
  the wave of light is near. That is under 2 ms for the same 125, with every light the
  same to eleven places ([beads.mjs](screenshots/issue-1859/beads.mjs)). The five by
  the fleet are written the same way, and their frames do not move.
- **The water fades it.** From Home's eye 92 of the 120 stand in the frame, 1,316 to
  2,453 m off, where the water leaves 0.59 to 0.16 of a lantern's light, so the river's
  far end goes out into the dark and no edge is drawn. A bell draws 3.6 to 6.8 px
  there. A bead is half a pixel or less, so it is drawn at the 1.6 px floor with its
  level cut by the area gained
  ([Life in the world's light](#life-in-the-worlds-light)), and a lantern's strands
  read from there as a faint fall under its bell. From the Close eye, whose water
  reaches 630 m, 0.08 is left at most. From Survey's 10 km a bell is under a pixel.
- **The river runs along the bowl's north half, on a loop that is no circle.** Three
  shapes were written, each read by what Home's eye holds of it
  ([river.mjs](screenshots/issue-1859/river.mjs)). **A circle about the crater's
  centre** shows that eye 68 of the 120, in the last 190 px of the frame. **A circle in
  the bowl's north-west** shows it 91, in the last 370 px: a hook at the frame's edge.
  **An ellipse along the north half** is the owner's call: 89, across 475 px, its west
  end toward that eye and both its sides running off east into the dark. Each of the
  three is the same list on the shape's plain line; with the eddy's pace, below, the
  ellipse shows that eye 92. It is the one loop of the fixture that is no circle. The river fills 230 degrees of it, thickest at
  its middle and thinning to both ends: a river with a head and a tail, where a full
  loop would read from Survey as a ring, and a ring there is a hull's.
- **It is a procession, clockwise.** The owner's call, against the same river turned
  the other way and against each lantern on a small loop of its own, which holds the
  river's place in Home's frame all match and reads as a bloom hanging, not a river
  flowing. Every lantern heads the way it travels, with its strands trailing behind it.
- **It is carried round the eddy over the bowl.** The owner saw the procession's clip and
  asked that its movement be thought through as the ocean's currents and turbulence.
  What follows is the author's reading of that, which the owner saw in the third cut's
  clip and left. The
  fixture writes one current, east, which the kelp leans to
  ([free-water-slice.md](free-water-slice.md) §5, "No rows"), and the kelp stands in
  the garden, along the bowl's north side. The reading: the stream runs over the
  garden, and the water over the bowl south of it is slower. Where a stream runs beside
  slower water the two shear, and the shear on the south flank of an eastward stream
  turns clockwise seen from above, fastest beside the stream. That is how the
  procession already went and how every loop of the fixture turns, so the direction
  stands, and the south side running west is the eddy's far side coming back. Nothing
  walls it in: at the lanterns' 100 to 220 m the garden's water and the bowl's are one
  open layer. That the loop closes is the author's choice for the frame. What changed
  is how it moves, in three things an eddy has and a ring turning does not:
  - **Its pace is uneven.** Beside the stream, at the loop's north point, a lantern
    makes 0.57 m/s, and coming back along the south side 0.32. A lap is still 13,500 s
    and 0.32 m/s on the average, against a drifting jelly's 0.31 on its own loop.
  - **Its width is uneven the other way**, as slower water is wider: a lantern keeps up
    to 57 m off the river's line by the north point and up to 104 m by the south.
  - **No lantern holds a fixed station.** Each wanders across the flow, 8 to 20 m
    either way, once in 10 to 25 minutes, each on a rhythm of its own, and heads where
    that carries it. A river whose lanterns all kept station turned as one rigid ring.

  Three readings were written. **Turn it the other way** runs its near side against
  the stream beside it. **A river that does not close**, east with the stream and
  gone, is the truer of open water, and leaves the bowl empty behind it or has to be
  fed. **A closed eddy** is taken. Its
  three numbers are the author's and TUNABLE: how much faster the stream side runs,
  0.3 of the lap's pace, how much wider the far side is, 0.4, and the wander. After
  an hour the river's middle stands far along the loop's north side, and Home's eye
  holds 55 of the 120.
- **A lantern of it keeps its depth and leans its own way.** The author's, and left by
  the owner on the second cut's frames. The five by the fleet rise and sink 10 m a lap
  and lean 12 degrees into their turn. On a loop 1.9 km long there is no turn to lean
  into and a lap is hours, so a lantern of the river hangs at the depth it was drawn,
  100 to 220 m, and leans up to 12 degrees either way, each its own.
- **Its wave of light is a third of a lantern's by the fleet.** The owner's call. A
  lantern strokes its bell, sways its strands and takes a wave of light down its body
  once in 9 s. From Home's range the stroke and the sway are under a pixel, so the
  wave is what shows. Three readings were written. **The whole wave**, 60%, on 120
  lanterns out of step is about 13 flashes a second along the river, the busy frame
  the issue names as its risk. **No wave** is a steady river beside five that flash.
  **A softer wave**, 20%, is taken: a shimmer. A lantern's clock still runs 19.75 s
  ahead of the last's in the list, which spreads the 125 over 36 moments of the wave a
  quarter of a second apart, so no flash of the river is a flash of all of it. The
  stroke and the sway are the five's own, for a camera that comes near.
- **It moves, and for nothing** (limit 4). The list is drawn once from the fixture's
  seed and is the same for every client. It drifts on the shared match time alone. No
  hull, shot, ping or camera starts, hurries, gathers or brightens it, and reduced
  motion holds it where the match's start stands it, with no wave on any body.
- **It is not a Tetherjelly field, and a field is staged beside it to show that.** One
  lantern was held apart from a field's bell by being alone and adrift
  ([A jelly is a lantern](#a-jelly-is-a-lantern)), and 120 together are not alone. A
  field is public chart data that a commander plans by
  ([map-visuals.md](map-visuals.md) §8), so a river read as one would be a false
  chart. The crater's simulation authors no field. Three readings were written. **Rule
  the bloom off any map that stands a field** costs nothing and shows nothing.
  **Trust hue and form** rests on frames that hold no field. **Stage both** is the
  owner's call. Where it stands is the author's: the study stands the client's own
  figure of a field inside the river's loop by its west end, where the river is
  thickest and passes it on three sides
  ([issue-1859](screenshots/issue-1859/README.md#a-tetherjelly-field-beside-the-river)).
  The staged field is a figure and no field: no server holds it, and it bends no sound.
  What stands between the two in that frame: a field is a rim 250 m in radius and nine
  bells, each a dome, a rim and tentacles in pale dots, 44 m across, in the fauna
  colour on the tactical layer, and it stands where the map puts it. A lantern is a
  lit skin 6 m across over beads, in `jelly-lantern`, and adrift. The owner saw the
  pair on the second cut's software frames and ruled that the bloom may go on a map
  that has fields, so no rule keeps it off one. The owner also found the field hard to
  identify even with no lantern by it. That is the field's own mark, on the tactical
  layer, which this step does not touch:
  [#1882](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1882) holds it.
- **Low draws none of it, and no mark, lamp or halo is touched.** With the fleet at
  rest no ring stands in the water it crosses from Home's eye. The Corvette sent out
  under it is staged
  ([issue-1859](screenshots/issue-1859/README.md#gate-7-and-the-limits)): a mark is
  drawn over the world, so its ring's stroke reads at High what it reads at Low, with
  22 bells inside the ring and 1 across its stroke. The owner looked at the second
  cut's staged frame against gate 7's three questions: the ring is found straight away,
  its loudness arc reads as easily as with no lantern by it, and no lantern looks like
  a contact or a mark. That is a glance at a software frame; the named GPU's is still
  owed.

`packages/frontend/test/farBloom.test.ts` holds the river over the bowl a whole lap
long, its list, its seed, the eddy's direction, pace, width and wander, and its softer
wave,
`packages/frontend/test/jellyLight.test.ts` counts what writing a jelly's beads draws,
and `packages/frontend/test/tutorialLoading.test.mjs` counts the river's lanterns in the
crater at High, none at Low, and holds it under reduced motion.

| What | Constant | Value |
| --- | --- | --- |
| What a wave of light adds as it passes a lantern of the river, as a share of the light it passes | `LIFE.JELLY.FAR.PULSE_GAIN` | 0.2 |

Where the river runs, its count and its pace are
[free-water-slice.md](free-water-slice.md) §5's.

#### A manta shows its belly

*Accepted on 24 November 2026, by the owner in session, on the named GPU's Close frame
([#1867](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1867), #1870;
[issue-1891](screenshots/issue-1891/README.md#on-the-named-gpu)). Its numbers are SPEC:
the table at this section's foot and `HIGH_GRAPHICS.LIFE.MANTA`
(`packages/shared/src/constants.ts`) say the same thing, and
`packages/frontend/test/highSpec.test.ts` holds them together. The owner named its
target in session on 21 November 2026 ([target-manta.jpg](screenshots/issue-1867/target-manta.jpg)), a manta seen from below,
and took three calls before any frame: the photograph is committed, the manta is a new
model that High alone stands, and it keeps the rim ray's 18 m. Five more were taken in
the open on the way: its belly's register, the light through its wings, its smoothed
skin, its stroke, and its triangles. The owner kept all five with the frame, and the
pale belly on darker water that reverses the target's figure.*

The target's manta is a pale belly over the eye, its gill slits and blotches dark on it
and its thin margins the palest of it. At High `env-rim-manta` is a body in the world's
light, as a fish is ([Life in the world's light](#life-in-the-worlds-light)), with four
things a fish has not. Where it glides is
[free-water-slice.md](free-water-slice.md) §5's.

- **Its belly has a register of its own.** A face that looks down takes the Lid's glow
  at its horizon share, 0.3 of what a face looking up takes, and from 95 m of drawn
  height over the rim an eighth of whatever pool lies under it. At a body's 0.16 the
  belly drew as a silhouette darker than the water behind it, on the software frames 13
  of 255 against the water's 38. Three
  readings were written. **A body's 0.16** keeps
  [the cladding's ceiling](#life-in-the-worlds-light) and loses the target. **A light
  under the manta** would be a source the map does not place, there for one body.
  **The belly's own albedo, 0.7** is taken: a manta's underside is white, and it is the
  one skin of the crater's life over a vessel's cladding. Its back and its marks keep
  the file's ratio, 0.2 of the belly, so the back stands at 0.14, under a fish's flank.
  The owner read a belly that pale beside a hull as clear of gate 3's reading of the
  hull: it is paler than a hull's cladding and it is no lamp, with no glow, no halo and
  no ring. A silver flank at 0.4 was turned down for a fish because it blooms
  white in a beam. A beam is thrown down off a hull's bow and the manta swims 131 to
  199 m deep, over the hulls' 300 m, so at rest none reaches it. A hull ordered above it
  can put it in one, where a belly at 0.7 takes half the beam, and no frame of that is
  taken.
- **The Lid's glow comes through its wings.** A wing is centimetres thick at its margin
  and the body 1.5 m at its centre. A face that looks down takes, beside the rest, the
  Lid's glow that stands on the back over it, less what the body between keeps: all of
  it through a skin of no thickness, 1/e of it through 0.5 m. So the margins and the
  tips are the palest of the belly and the centre the darkest. That is the target's
  backlit edge and the reverse of its grey: the target's belly is palest at its centre
  and greys toward its trailing margin and tips. Three readings were written. **No light
  through the wing** leaves the whole belly at one level, under the Lid's horizon share
  alone; no frame of it at this register was taken. **A grey margin painted by the renderer** is a pattern the file
  does not carry. **The light through the wing** is taken, for a thin thing in lit
  water. It is the Lid's own light in the Lid's token, on a face only by how far it looks down. No
  source is new, and nothing answers a hull (limits 3 and 4). The thickness is read off
  the file once, a plumb line through each vertex, when the template is built.
- **Its skin is smooth**, a call the owner kept, with the fine unpushed
  facets Block 4 lets its file have for it. Three readings were written. **Flat facets
  under 800 triangles**, as every prop's, are plates on a body 280 px across. **Normals
  authored in the file** would leave the kit's one way of writing a prop, flat and
  unindexed (`tools/hull-models/kit.mjs` `faceted`). **Fine facets with no
  corner pushed, smoothed by the renderer** is taken, as a jelly's bell is. The file is
  flat-shaded, as the kit writes every prop, and 95 m from the eye each facet of a body
  18 m across drew as a plate. The renderer
  gives every vertex one normal across the faces that meet at it, belly and back
  together, as it does [a jelly's bell](#a-jelly-is-a-lantern), and leaves an edge
  sharper than 60 degrees an edge, which keeps the wing's trailing edge. No vertex moves.
- **Its wings stroke, and for nothing** (limit 4). Three readings were written. **A
  still glide in the file's pose**, as the rim ray's, is a model towed across the frame
  at 95 m. **The whole body bobbing** moves a manta as a
  float moves. **A wave out along each wing** is taken: High lets the world move
  smoothly ([What the world layer may do at High](#what-the-world-layer-may-do-at-high)).
  A wave runs out along each wing from
  the body's edge, 2.3 m from the centreline, to the tip, once in 7 s: the tip swings
  1.6 m either way about the file's pose, 1.2 radians behind the root. The centre body
  is still, and the head, the mouth, the gill slits and the tail's root with it. It runs
  on the shared match time. No hull, shot, ping or camera starts, hurries or stills it,
  and reduced motion holds the file's pose.
- **Its marks are the file's.** The gill slits, the blotches and the mouth are geometry
  in the back's material, 4 cm proud of the belly
  ([asset-prompts-3d.md](asset-prompts-3d.md), Block 4). The renderer draws no pattern
  of its own. The blotches are not mirrored port to starboard, as the target's are not.
- **It is 2,689 triangles**, over the 800 Block 4 fences a prop at, in a row allowed
  4,000. Two readings were written. **Under 800**, as the rim ray is, is a body of
  plates once it is 280 px across. **One body near the eye, High alone** is taken, as
  the kelp stand's 9,000 were for a forest. High's frame stands at up to 764,047 of its
  900,000 with it ([free-water-slice.md](free-water-slice.md) §9).
- **What the target shows and this does not.** The target's manta is a mid tone
  against brighter water, the light behind it. Here it is the reverse, a pale belly on
  darker water: on the software frames 81 of 255 against the water's 42. There is no sun
  below the Lid (limit 1), and the Lid's glow at 170 m lights no water behind the manta
  brighter than its belly; the belly's register, above, is where that was decided. The
  target's wingtips curl, and the file's are rounded off in plan and rise 0.39 m in
  their last tenth. The target's lobes and pelvic fins are
  pale underneath, and the file builds each whole in the back's material, so from below
  they are dark. The target's belly greys toward the wings' trailing margin and tips,
  and here the margin is the palest of it, by the light through it. Its blotches are
  many small round dots and broad smudges, and the file's are seventeen angular ones.
  A gill slit is 0.11 to 0.14 m wide, about 2 px at the loop's near side and under one
  at its far side, so the marks read on the near part of the lap alone. None is built,
  and each is the owner's to ask for.
- **It carries no light, and no mark, lamp or halo is touched.** Low never builds this
  template: the manta is not stood there, and its file under the shared rig is the dark
  prop every body's is.

`packages/frontend/test/mantaWing.test.ts` holds the two templates apart, the belly's
register and the back's ratio, the skin, the thickness, the stroke and what reduced
motion holds, and the patch's anchors. `packages/frontend/test/freeWaterDecoration.test.ts`
holds its glide and what the Close eye sees of it.

| What | Constant | Value |
| --- | --- | --- |
| Linear luminance the belly's material is lifted to | `LIFE.MANTA.BELLY.ALBEDO` | 0.7 |
| Share of the Lid's glow on the back that a skin of no thickness lets through to a face looking straight down | `LIFE.MANTA.BELLY.THROUGH` | 1 |
| Thickness of body at which that has fallen to 1/e, metres | `LIFE.MANTA.BELLY.THROUGH_M` | 0.5 |
| The sharpest edge the skin is smoothed across, degrees | `LIFE.MANTA.CREASE_DEG` | 60 |
| Seconds a stroke of the wings | `LIFE.MANTA.STROKE.PERIOD_S` | 7 |
| How far a tip swings either way, metres | `LIFE.MANTA.STROKE.LIFT_M` | 1.6 |
| Where the stroke starts, metres from the centreline | `LIFE.MANTA.STROKE.ROOT_M` | 2.3 |
| How the swing grows out along the wing: the exponent on the way out | `LIFE.MANTA.STROKE.POWER` | 1.7 |
| How far the tip runs behind the root, radians | `LIFE.MANTA.STROKE.LAG` | 1.2 |

#### The vents at work

*In development with the rest of High, and not accepted
([#1837](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1837);
[issue-1837](screenshots/issue-1837/README.md)). Every number is TUNABLE in
`HIGH_GRAPHICS.VENT` and `FREE_WATER_HIGH_VENTS` (`packages/shared/src/constants.ts`)
until a frame of it is accepted. This is the step's second instalment. The owner's call
of 20 November 2026 put an authored vent stand on the crater's rim. Three more calls were
taken in the open with the first frames, and wait on the owner: what a chimney breathes
at High, which chimneys breathe it, and where the crater's stand is. The second was
overturned by the round's critic, and the owner then took it on a frame of a vent field
([#1853](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1853);
[issue-1853](screenshots/issue-1853/README.md)), as written under it.*

A chimney breathes steam as world light: puffs in the vent's own colour on the canvas,
stepped on the 5 Hz grid ([style-neon-noir.md](style-neon-noir.md) "World light"). At
High the world round it is lit, and a column of steam the colour of a lamp stands in it
as a second light beside the vent's own. At High this step draws a chimney's breath
another way.

- **A chimney's breath is matter, and shows by the light on it.** Three readings were
  written. **The steam as Low draws it** keeps the canvas pass untouched, and leaves a
  column that no searchlight, pool or water reaches. **Lit matter in the world pass** is
  taken: one draw of soft puffs, scene-referred, so the water takes a column with
  distance and the bloom and the grade reach it. **Both** draws two columns on one
  stack. A puff sends on a fourteenth of the light that falls on its centre.
- **Three lights fall on it.** The vent's own, in `vent-ember`, from the mouth under the
  puff: strongest where the column leaves the stack and halved 14 m up, so a column is
  amber at its foot. The Lid's glow, as a face looking half up takes it at that depth: a
  faint cold grey above. And an own hull's searchlight that crosses it, in the navy's
  glow, less what the ground and a hull hide of the beam
  ([An own hull's searchlight](#an-own-hulls-searchlight)). No contact lights one
  (limit 2).
- **It rises straight, opens evenly and moves smoothly.** A column climbs up to 130 m
  in 18 s, fast out of the mouth and slowing, and opens 16 m about its own axis by the
  top, each puff along the bearing it formed on. It leans nowhere: a column that leaned
  would state a current ([map-visuals.md](map-visuals.md) §8). The 5 Hz step is released
  with the grid
  ([What the world layer may do at High](#what-the-world-layer-may-do-at-high)), and
  reduced motion holds the clock, so each column stands still.
- **It answers nothing** (limit 4). A column stands where the map stands a chimney, and
  a puff's line, phase and bearing are a hash of that placement. The acoustic veil drains
  it as it drains the steam.
- **Every chimney a map stands breathes it.** Two readings were written. **Every
  chimney** was taken first, and #1837's critic overturned it: it changes every Thermal
  Vein at High, no frame showed one, and look work starts from a frame. **The crater's
  stand alone** stood in its place until a vent field had a frame. The owner took **every
  chimney** in session on 24 November 2026, on a software rasteriser's frames of the
  Ventfront Divide's middle vent field, the steam beside the smoke at four cameras, and
  named the target frame and its camera
  ([issue-1853](screenshots/issue-1853/README.md)). That names the target and is not the
  look's acceptance. Kept for good, the crater's stand alone would leave two readings of a
  vent at High. So wherever High draws, every chimney breathes lit smoke, and at Low every
  chimney breathes the steam: one plume a stack, never both. A view High does not reach
  draws Low, steam and all ([graphics-standards.md](graphics-standards.md) gate 6). The
  column's numbers are the crater's, unmoved. Over a field no hull listens to, a column
  reads faint: the acoustic veil drains it, as it drains the steam.
- **The crater's stand is between two hulls.** The fixture stands two chimneys and three
  basalt boulders ([free-water-slice.md](free-water-slice.md) §5, "High's own vents").
  Both chimneys lie in one 80 m cell of the `vent` family's lattice, so the stand is one
  source at √2 of a chimney's strength ([Step 1's numbers](#step-1s-numbers--spec)), and
  that light's volume is the widest thing the step draws. Three readings were written.
  **Among the hulls, 326 m from the Close eye**, was the first cut, of three chimneys:
  its volume filled the Close frame, hulls and rings in it. **By the garden, 1,041 m
  off**, puts the stand's light farthest from every ring, and draws a chimney 52 px tall
  at Close. **Between the Light Scout and the Corvette, 421 m off**, is taken: a chimney
  is 126 px tall at Close, where the stand fills the gap between the two hulls, as the
  target has its chimneys beside its hull.
- **Its light reaches two rings, and each still stands over it.** Read on the software
  frames against the same frames without the stand, along each ring's own circle. At
  Close the light lifts the ground under the Light Scout's ring on 35% of its arc, by 22
  of 255 at most, and under the Corvette's on 37%, by 33. At Home it is 55% and 55 for
  the Light Scout's, 36% and 76 for the Corvette's. The Harvester's is untouched. Where
  the ground is lifted, a ring's stroke stands 19 to 22 of 255 over the ground beside it
  at the median, where it stood 23 to 25 before. At Survey the fleet's three rings
  overlap one another, and the stand lies under them. A search of the rim ranked slots
  by a 60 m radius, where the stand's pool has fallen to a twenty-fifth of its peak: 16
  of 4,173 cleared every ring at Home and Close by that measure, none by more than
  18 px, and the frames show the light reaching well past it.
- **A mark over the stand's light is kept as built** (limit 6, gate 7): the owner kept
  the stand's light under the Light Scout's and the Corvette's rings on 24 November 2026,
  on the named GPU's Close frame (#1863). Nothing
  holds a mark over a volume by construction, and the limit refuses only a light a mark
  cannot be read over. The stand is the frame's brightest light, 231 to 234 of 255 at its
  core over four takes.
  Two of its numbers are this step's and TUNABLE: both chimneys in one cell, which makes
  one source of √2 where two cells would make two, and the slot. The third is not: the
  `vent` family's strength is step 1's SPEC, accepted on frames that held no vent, and
  this is the first frame of one. If a ring cannot be read over it, that is what turns
  down, by this doc first.
- **A chimney stays a prop.** It is lit by the rig, as every standing prop is, and its
  own emissive mouth is the file's.

`packages/frontend/test/ventSmoke.test.ts` holds the column's shape, its three lights
and its clock, and `packages/frontend/test/tutorialLoading.test.mjs` holds the one plume
a stack at each quality. The third light has a frame since #1855: a beam staged across
both columns, beside the same hull silent
([issue-1855](screenshots/issue-1855/README.md#a-beam-across-the-plume)).

| What | Constant | Value |
| --- | --- | --- |
| Puffs a column | `VENT.PUFFS` | 30 |
| Seconds from the mouth to gone | `VENT.LIFE_S` | 18 |
| Height a column climbs, metres | `VENT.RISE_M` | 130 |
| Radius of the mouth a puff forms in, metres | `VENT.MOUTH_M` | 2.5 |
| How far a column opens about its axis by the top, metres | `VENT.SPREAD_M` | 16 |
| A puff's width at the mouth and at the top, metres | `VENT.SIZE_M` | 5, 24 |
| Share of the light on a puff it sends to the eye | `VENT.ALBEDO` | 0.07 |
| The vent's own light on a puff at the mouth, in the renderer's linear units | `VENT.GLOW` | 6 |
| Height over the mouth at which that has halved, metres | `VENT.GLOW_REACH_M` | 14 |

#### Snow in a beam

*In development with the rest of High, and not accepted
([#1855](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1855);
[issue-1855](screenshots/issue-1855/README.md)). Every number is TUNABLE in
`HIGH_GRAPHICS.MOTES` (`packages/shared/src/constants.ts`) until a frame of it is
accepted. Three calls were taken in the open with the first frames: which snow a beam
lights, how bright a mote may stand, and how a beam is put across the vent stand's
plume. **The owner kept all three** in session on 20 November 2026, on the software
rasteriser's frames. That is not the look's acceptance, which waits on the named GPU's
frames, gate 6's 8 ms and gate 7's glance. The readings not taken stay written under
each.*

The target frame's searchlight cones are full of lit particles
([issue-1799](screenshots/issue-1799/README.md)). A beam lit the ground, the cladding,
the crater's bodies and a chimney's smoke, and scattered in the water as a smooth cone
([An own hull's searchlight](#an-own-hulls-searchlight)). The marine snow took none of
it. At High the snow inside an own hull's beam now shows by the beam's light.

- **A beam shows a finer snow than the water draws.** Three readings were written.
  **The flakes the water already draws** ([Reading the Water](#reading-the-water)) are
  the issue's own words, and there are too few of them. At the Close camera the cloud
  that reaches the Corvette stands 7,000 flakes in a slab 500 m square, 42 in a million
  cubic metres, and that hull's cone holds a fifth of a million cubic metres down to its
  pool: nine flakes. **A brighter cone and no particulate** is cheaper, and is the haze
  the cone already is. **A finer snow, which a beam is bright enough to show and the
  Lid's glow is not**, is taken: 2,604 motes in a million cubic metres, about 560 in that
  cone. The flakes stay as they are at both qualities, on the canvas and in the water's
  one blue, and take no beam.
- **The snow is the world's, and holds still.** It is one lattice, fixed in the world:
  36,000 motes in a cell 240 m on a side, repeated. A beam draws the copy of each mote
  nearest a point 86 m down its axis. So a beam that turns, or a hull under way, sweeps
  over motes that stay where they are, which is the parallax that makes the flakes read
  as a medium. Every beam reads the one lattice, so a mote in two cones is one mote and
  takes both lights.
- **It ends before the beam does.** A mote is whole within 96 m of that point and gone by
  120 m, half a cell, so none is lit where the lattice wraps. Lit snow reaches about
  180 m from the lamp, where the beam's own window closes at 520 m: at rest a beam meets
  the ground 130 m out, and past 200 m it gives a mote under a twentieth of what it gives
  at the lamp.
- **It sinks, and only sinks**, at the flakes' own rate, 1.3 m a second, and reduced
  motion holds it. A drift would state a current
  ([Reading the Water](#reading-the-water)).
- **The only light on it is an own hull's** (limit 2), in the navy's glow (limit 3). A
  mote reads the beams' own uniforms, so the ground and a hull shadow it as they shadow
  the cone, and a contact lights none. The coarsest mote sends on 7% of the beam's light
  at its centre, and the finest two fifths of that.
- **Its strength is the beam's, and so the lamp halo's** (limit 5). A hull through
  SIG 15 throws no beam and shows no mote, and Silent Running holds a hull under that.
  Two readings were written of what the limit asks beyond that. **No mote brighter on
  the screen than the lamp that lights it** caps a mote near the lamp, where the beam is
  strongest, and leaves the cone dimmest at its source. **A mote as bright as the beam
  makes it** is taken, as the pool and the cone are: the brightest mote at Close reads
  221 of 255 where #1837's frame reads the Corvette's lamp at 165, and step 2's accepted
  frames read 227 under way. If the owner's glance wants it down, `MOTES.ALBEDO` is what
  turns.
- **A mote is small, and a far cone fades.** A mote is 0.5 to 1.4 m across and most are
  fine. One that would draw under 1.5 pixels is drawn at 1.5 with its light cut by the
  area it gained, so from Home a cone is a fine dust and not a cloud of full pixels.
- **No mark is touched** (limit 6). The snow is drawn in the world pass, under every
  mark, and a ring over a cone stands bare as it did. Whether the Corvette's ring still
  reads over its own cone in under a second is the owner's glance, on the named GPU
  (gate 7).
- **A beam across the plume is staged, not placed.** #1837's frames show no beam on the
  stand's smoke, and the issue asks for one. Two readings were written. **Move the stand,
  or a hull's start, until the opening frame holds one** reopens the slot #1837 chose
  against two rings ([The vents at work](#the-vents-at-work)). **Stage it in the
  capture** is taken: the Corvette is turned on the stand by one order, and the fixture
  does not move. At the fleet's 300 m a beam looks down at 26 degrees and lights the
  columns' mouths alone, in the stand's own glare. The order is to 150 m, where the
  beam's axis meets the nearer column 67 m over the ground and the farther 45 m over it,
  on mouths 35 m up.

`packages/frontend/test/beamMotes.test.ts` holds the lattice still under a beam that
moves, the fade inside the cell, the sink and the count, and
`packages/frontend/test/rendererSmoke.test.ts` counts the snow's one draw at High with a
loud hull and none at Low or on Silent Running.

| What | Constant | Value |
| --- | --- | --- |
| Motes in a cell of the lattice, which is what one beam draws | `MOTES.COUNT` | 36000 |
| A cell's side, metres | `MOTES.CELL_M` | 240 |
| How far down a beam's axis the cell it draws is centred, metres | `MOTES.AHEAD_M` | 86 |
| Distance from that centre a mote is whole within, and gone by, metres | `MOTES.FADE_M` | 96, 120 |
| A mote's width, the finest and the coarsest, metres | `MOTES.SIZE_M` | 0.5, 1.4 |
| The narrowest a mote is drawn, pixels | `MOTES.MIN_PX` | 1.5 |
| Share of the beam's light the coarsest mote sends to the eye | `MOTES.ALBEDO` | 0.07 |
| What the finest mote sends, as a share of the coarsest's | `MOTES.FINE_SHARE` | 0.4 |

#### The crater from above

*In development with the rest of High, and not accepted
([#1891](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1891);
[issue-1891](screenshots/issue-1891/README.md)). Every number is TUNABLE in
`HIGH_GRAPHICS.CRATER` (`packages/shared/src/constants.ts`) until a frame of it is
accepted. **The owner took two calls** in session on 22 November 2026, on a software
rasteriser's frames of four prototypes: what the step builds, and that the survey ink
takes the water. Neither is the look's acceptance, which waits on the named GPU's
frames. The readings not taken stay written under each.*

From the survey dolly the free-water crater read as built: flat panels with dark
outlines, a black hole in the middle, on a square tile
([free-water-slice.md](free-water-slice.md) §9, "Crater walls"). One cause produces all
three. **At that dolly High's light and water do not work at the crater's scale.** The
water's reach follows the dolly ([Reading the Water](#reading-the-water)) and stands at
32 km from 10 km out, so every floor keeps 0.91 of its light whatever lies over it. The
light is shaded a pixel at a time: by the slope under the pixel and by ground within
45 m of it. So a wall 900 m tall reaches the frame only as its 80 m scarp, a dark band of
one width round every floor. The pocket's trench floor, with no water drawn over its
2,400 m, read 1.0 of 255 beside open water at 7.0. And nothing hides where the ground
stops. Home and Close do not show the fault: there the eye's own swim is the medium.

Four things were written against that cause, and the owner took the second.

- **Water over each floor, and shade under each wall.** No ground moves, and Low is
  untouched. Taken, with the next.
- **Those, then ground past the map's edge,** falling away into the deep. Taken.
- **Water alone.** It mends the hole and leaves the outlines.
- **Reshape the ground:** slopes sized by their drop, or a re-cut literal. It moves Low
  and the simulation's ground, so it is no step of High's.

Built, in the free-water study alone:

- **The water over a floor takes its light.** Past the dolly where the eye has left the
  water, a fragment of the world pass loses light to the column over it as well as to the
  swim from the eye, and the composite gives the water that share back at the floor's
  depth, in its biome's hue. The rim's 600 m keeps 0.92 of its light, the bowl's 1,500 m
  0.60 and the pocket's 2,400 m 0.27. The pocket then reads 7.0 of 255, as deep water
  does. Depth is luminance, in the medium as on the ground. The term comes in between
  2,000 m and 5,000 m of dolly, so it takes nothing at Close, Home and gate 6's low
  camera, at 420 m, 1,200 m and 1,600 m. The sources' volumes and the searchlights'
  cones do not take it. The crater's kelp stands no deeper than 620 m and its vent stand
  is on the rim, where the column takes 0.08 at most.
- **A wall hides the Lid's glow from the floor under it.** The Lid's glow is light from
  the whole water above (limit 1), so a point under a wall takes less of it than a point
  on open ground, by more the taller the wall and the nearer it stands. The lit ground
  reads that off its own drawn heights, at their true scale, along 16 bearings out to
  800 m, and takes 0.6 of what they find hidden. At the whole of it the bowl's ring drew
  as dark as the pocket beside it. It shades the glow alone: a pool and a beam are light
  from beside the ground. Two readings of where it shows were written. **In the ground's
  bake, at every camera** is taken: it is the ground's own light, and it does not come and
  go with the zoom. Against `main`, Home then moves 2.2% of its pixels by more than 2 of
  255, Close 0.8%, and gate 6's low camera, which looks across the bowl's floor, 8.1%. **Brought in with the column's knee** would leave those
  three cameras as `main` draws them, and stand the walls' shade up as the camera pulls
  out.
- **The survey ink takes the same water.** The tactical layer is drawn as Low draws it,
  and [map-visuals.md](map-visuals.md) §4, rule 6, has the ink fade into the water like
  the ground it lies on. With water over the deep floors the two disagree. Two readings
  were written. **The ink stays as Low draws it** keeps the layer's law whole, and
  redraws every edge at full strength over ground the water has taken. **The ink fades
  by the column over its ground** is the owner's call: rule 6 holds at High. An ink
  stroke only loses strength by it, so rung 4 stays under rung 5 wherever it stood. Over
  the pocket a stroke keeps 0.27 of its strength from the survey dolly, and under the
  knee's 2,000 m of dolly it loses nothing.

- **The ground runs on past the map's edge.** A mission drawn alone ends in the skirt,
  a wall under the map's rectangle, and from above that is a square tile. The study's
  ground is now drawn 2,000 m past its edge, as one more draw of the world pass and
  15,904 triangles, with 224 more in the skirt. It is the edge's own ground and nothing else: past the edge the
  cells are the edge's, held, so the rim runs out as rim and the exit pool as the pool's
  channel, and the relief is the field the map's ground reads, so it crosses the edge
  with no seam. It falls from the edge's depth to the map's 3,000 m floor at the reach,
  level at both ends. There the column leaves 0.13 of its light and the rest is the
  water's, so it ends in the colour the open water already is. The relief stands whole
  for 250 m and has eased out by 1,000 m. Its lit bake is 1,024 px a side at the map's
  own 7.8125 m a pixel, 11.2 MB with its mips. It takes the veil of the point on the
  edge nearest it. The skirt hangs from its far boundary. Nothing is asked of it by the
  simulation: no cell lies under it, and a click on it is clamped onto the map as before.
  Two readings of the chart out there were written. **The chart ends at the rim** is
  taken: the survey draws no ink on it, a ring or a course still stops on the rim
  ([map-visuals.md](map-visuals.md) §5), and the rim line stays where it was. The rim is
  where the heard water ends, and a ring laid past it would draw heard water the
  simulation does not have. **Marks land on it, as on a placed mission's exterior**
  (#1556) would run the chart on with the ground, over ground with no cells. Low, and
  every shipped map, keep the skirt at the edge.

Not built: the roofed cut keeps its ruled sides
([free-water-slice.md](free-water-slice.md) §9), and the outer ground carries no silt
detail, which the map's ground beside it does. The owner called on 24 November 2026 for
the edge's silt to be carried on past the map
([#1904](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1904)).

`packages/frontend/test/water.test.ts` holds the column to its knee and to the three
floors, `packages/frontend/test/lidShade.test.ts` holds the shade's order under a taller
and a nearer wall, `packages/frontend/test/surveyInk.test.ts` holds the ink's fade to
taking strength away and never adding it, and
`packages/frontend/test/outerGround.test.ts` holds the outer ground to the map's own on
the edge, to its fall, and to its triangles.

| What | Constant | Value |
| --- | --- | --- |
| Depth of water that leaves 1/e of a floor's light, metres | `CRATER.COLUMN_REACH_M` | 2100 |
| Dolly the column comes in over: none at the first, whole from the second, metres | `CRATER.COLUMN_KNEE_M` | 2000, 5000 |
| How far round a point a wall is looked for, metres | `CRATER.SHADE_REACH_M` | 800 |
| Bearings it is looked for along | `CRATER.SHADE_RAYS` | 16 |
| Share taken of the glow the walls hide | `CRATER.SHADE` | 0.6 |
| How far past the edge the ground is drawn, and falls to the map's floor by, metres | `CRATER.OUTER.REACH_M` | 2000 |
| Distance past the edge the relief stands whole to, and has eased out by, metres | `CRATER.OUTER.RELIEF_M` | 250, 1000 |
| Distances past the edge the outer mesh has vertices at, metres | `CRATER.OUTER.RINGS_M` | 62.5, 125, 187.5, 250, 312.5, 375, 437.5, 500, 625, 750, 1000, 1250, 1500, 2000 |
| Side of the outer ground's lit bake, pixels | `CRATER.OUTER.BAKE_PX` | 1024 |

#### A mark on the lit world

*Decided by the owner twice
([#1801](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1801)). On
11 November 2026 three readings of limit 6 were written. **The lit ground alone**, held
by a ceiling on the ground's light, was built first: it left light in the water unbound.
**Everything the world layer draws under a mark** brought the scatter and the bloom down
with it. **Marks carry their own ground** was taken: a plate under each mark, which held
the world layer there to what Low could draw. On 19 November 2026, on the named GPU's
frames of the garden and the survey with the plates and without, the owner took
**bare**: the plates went, with their pass and their tests.*

A mark is drawn at High as it is at Low, in the tactical pass, and nothing under it is
changed for it. What that leaves standing, and what it does not:

- **Over ground the Lid alone lights, the ladder holds.** Its comparisons for rungs 4 to
  7 hold over grey ground up to 11.8% encoded luminance in tritanopia, 17.3% in
  deuteranopia and protanopia, and 18.8% in the standard palette
  ([map-visuals.md](map-visuals.md) §5). The palest ground the ladder weighs at Low is
  the palest biome fill lifted by the terrain cap, 11.6%, and the Lid's glow lights no
  ground paler than that. The ladder's comparisons are linear in the ground's luminance,
  and `packages/frontend/test/ladder.test.ts` holds them from black to that ground in
  all four palettes. `packages/frontend/test/litGround.test.ts` holds the glow under it.
- **Over a pool, a volume or the bloom, nothing holds it by construction.** Past 11.8%
  the unselected ring falls under rung 5's floor in tritanopia; past the others, rung 7's
  quietest outline no longer lifts the ground. A pool that reads as light stands past
  those. So a mark over one is read on the frame, by gate 7's glance
  ([graphics-standards.md](graphics-standards.md)), in all four palettes, and a light a
  mark cannot be read over is turned down at its source.
- **Over shallow water a mark stands about where it does at Low.** Low's water is paler
  than the palest ground above about 290 m, and in tritanopia rung 6 does not clear
  rung 5 over it above 270 m ([map-visuals.md](map-visuals.md) §10 records the
  shallowest stop). High's water keeps the ramp's luminance and wears its biome's hue,
  and in the ladder's measure a greyer hue reads paler than Low's blue at one luminance:
  by up to 1.7 of 255 at the surface, for the Abyssal Trench, the Coral Ruins and the
  Resonance Field. Whether that moves tritanopia's stop is read with the palettes, at
  promotion.
- **No lamp, halo or mark is touched.** The chain runs before the tactical pass, so the
  world's bloom spreads nothing of theirs, and gate 3 reads as it does at Low.

Gate 7's glance at an own hull's ring over its own searchlight's pool
([An own hull's searchlight](#an-own-hulls-searchlight)), the brightest light a mark
stands over, reads in the standard palette: the owner read it on 19 November 2026, on the
named GPU's frames. Still open: the other three palettes, which no frame shows yet.

## World Aesthetic

The first staged visual-reboot slice is specified in
[visual-reboot.md](visual-reboot.md): the Sorrowgate tutorial develops runtime surfaces
and the approved environment kit before commissioning replacement shapes. Its
mission-scoped profile keeps the palette, SIG and contact laws below; it does not change
the look of every mission that shares its map.

### Color Palette

- Deep blues, blacks — abyssal trenches
- Rust orange, iron grey — industrial mining zones
- Toxic green, algae teal — kelp forests and bio-tech factions
- Volcanic red, magma gold — geothermal vent regions
- Violet resonance — Hadron territory

Use gradients to show depth: dark → darker → pitch black → bioluminescent highlights.

### Lighting

- Hard rim lights on subs
- Soft volumetric fog in trenches
- Bioluminescent flora/fauna as natural light sources
- Flickering industrial lamps in bases

### Shared model lighting — Abyss Render Stack

*This section specifies the Low graphics quality's rig, the only one built.
[Two layers, two laws](#two-layers-two-laws) releases its bans on bloom, shadows and
passes at High. The lamp halo below is tactical and binds both qualities, the 95% floor
in its "Darkness" line apart.*

Sorrowgate is the blueprint for the game's graphics, not a permanently separate
lighting style. The first increment of [#974](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/974)
promotes its readability rig to every production match: cold ambient **0.75**,
oblique key **1.8**, cyan rim **1.6**, retaining the existing colours and directions.
Its Pelagia laminate and authored court surfaces remain mission-specific; sharing a
light rig does not make every navy Commune-built.

**Decision.** Keeping the old standard rig and improving only it would make the
tutorial a competing look. Instead, share the tutorial rig and add the same metal
reflections and highlight handling to both profiles. The approved
[hull portraits](#hull-portraits--the-roster-photographed) below and Sorrowgate's
retained-geometry slice supply the reference: transfer wet
surface definition and controlled highlights, not their offline shadows or bloom.
The emotion remains inhabited darkness: close views reveal construction, home views
separate hulls from ground, and survey views preserve sound and depth information.

**SPEC.** The world renderer uses ACES filmic tone mapping at exposure **1.0**.
One **128 × 64** linear-float equirectangular texture grades vertically from the
existing cold ambient colour overhead to the deepest water colour below; a PMREM
is generated once per mounted view, used at environment intensity **0.35**, and
disposed with that view. It reflects no entities, faction accents or hidden state.
It is not a background replacement, a sun, or a new emissive source.
Only lit surfaces take the curve: the hulls, structures and props, and the ordnance
bodies. Every unlit layer bypasses it and keeps its authored register: the water
backdrop and marine snow; the baked seabed with its route ink, map rim and skirt;
fallback sprites and depth marks; public life's stipple; embers; and ordnance lamps
with their trails and launch bubbles, own hulls' wakes, the spray of a hit on one, own harvesters' silt plumes and the cutter sparks under them, and the sediment haze over a resource field. The loudness ladder measures its rungs in encoded luminance
([map-visuals.md](map-visuals.md) §5), and the water, the routes, the rim and the stipple
stand on its rungs 1 and 5; the conn view places the skirt, which §5 does not name, on
rung 1. A trail wears its lamp's glow, which ACES would fade toward white. Each of these
layers sets three's `toneMapped` flag false, the shader layers included: a true flag
hands a shader the curve's function, which it can call without the chunk. The Pixi HUD and enemy
contacts remain outside this world-material operation. Live SIG still drives the
same input emission curve, and the curve applies to **surface light only**: a model's
emissive glow is added after tone mapping, at its own faction hue and approved strength,
held at white along that hue where the export rests past it (gate 3's lamp core).
ACES alone fades a saturated glow toward white (Ventfront close camera on a GTX 1070:
bright-pixel saturation 0.66 untone-mapped, 0.39 under ACES), which breaks palette discipline and
makes a loud hull lie about its colour. The canvas pass adds no bloom, shadows, camera effects
or geometry; the lamp halo below is the one full-screen pass after it, behind its own setting.

The asset list is the existing approved roster and prop kit, with no new downloads
or GLB edits. Evidence pairs the old and new standard-match and tutorial frames at
close, home, low-pitch and survey cameras with the HUD present, and includes quiet
and loud own-unit readings. The non-target control is the baked chart/overlay path,
not the tutorial: both production profiles intentionally receive the lighting.
Gate 6 counts steady-state work separately from the one-time PMREM bake; gates 3
and 8 still bind. The development-only Dream Loop study remains an isolated
experiment, not the production reference.

#### Lamp halo — SPEC

*Built for [#1001](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1001), and on
by default since the owner approved its frames on 4 October 2026*
([issue-1001](screenshots/issue-1001/README.md), "The frames against the SPEC"), its reading
on the named GPU inside [graphics-standards.md](graphics-standards.md) gate 6's line. The
Lamp halos toggle in Settings turns it off for a player, and a development switch drives
captures.

The lamp halo is the soft light a loud own lamp spreads into the water around it. It
carries one fact: how loud that hull or structure is now. It carries the part of that fact
gate 3's lamp core cannot show. A lamp held at white along its hue has no headroom left, so
a ping or a firing burst loses 66–83 % of a unit's lamp light to that white
([issue-1001](screenshots/issue-1001/README.md), "Halo readings"). The halo is where that
flare reads, up to SIG 80: past it the halo holds still ("The SIG gate" below), and the
collar alone reads how much louder.

It is a second reading of loudness, never the first. With the halo off, the lamp core and
the loudness collar ([ui-ux.md](ui-ux.md) §3.5) carry every loudness fact, so turning it off
withholds nothing. It is drawn only for the player's own force, from the live SIG the client
already holds. It is not "bloom", which in this world is a Commune word
([glossary.md](glossary.md)), and nothing in it thresholds the frame.

**Route.** The canvas pass is drawn exactly as the SPEC above describes: per-material ACES,
glow after the curve, the unlit layers, encoded blending and 4× MSAA. Then, inside the same
GPU-timer bracket, four steps run, and the halo draws nothing else:

1. **Depth copy.** One framebuffer blit copies the canvas depth, the depth bit only, into a
   DEPTH24_STENCIL8 depth texture the size of the drawing buffer. Asking for the stencil
   bit as well cost 5–7 ms on the named GPU. With the canvas stencil the composite needs
   present, the depth-only copy read 0.17 ms at 1440 × 900 and 0.27 ms at 2160 × 1350,
   against 0.15 and 0.29 ms without one: the same, within run-to-run spread
   ([issue-1001](screenshots/issue-1001/README.md), "What each route costs on its own").
2. **Source.** One instanced draw writes a splat for every lamp site into a half-float
   target the size of the drawing buffer, depth-tested against that copy.
3. **Spread.** The source is blurred over three levels, at 1/2, 1/4 and 1/8 of the drawing
   buffer.
4. **Composite.** One full-screen draw puts the result onto the canvas.

There is no EffectComposer, no OutputPass and no second camera: the splats project through
the conn camera, and the full-screen draws ignore its matrices (gate 8). A frame in which
no entity draws a splat runs none of the four steps. The halo is never built while the
development-only Dream Loop study is on, which has lamp halos of its own. The chromatic
split runs after the composite, over the frame with its halo
([Atmosphere rides on top](#atmosphere-rides-on-top-in-screen-space)).

**What feeds it.** Only own hull and structure lamps whose model is showing feed the
source, one splat per lamp site: one connected bulb or strip of an emissive material, the
split `lampScreen.ts` already reads. Nothing else can write into the source, which excludes
ordnance lamps, sprite-fallback and still-loading hulls, construction sites, environment
props and every world light, fauna, contacts and the HUD. Because the source holds lamp
sites and nothing else, no brightness threshold is involved, and a reflected highlight has
no way in.

**Energy.** Each entity's halo is given one energy, set by its live SIG and nothing else:

```text
Q = Ā · w(SIG) · e^((min(SIG, 80) − 35) / 14) · drawScale²
```

w is the gate below. e^((SIG − 35)/14) is gate 3's E(SIG), normalised to 1 at SIG 35, and
taken no further than SIG 80 (the gate below says why).
drawScale is the far-zoom readability scale, so a halo grows with its drawn hull. Ā is
**20 m²** (TUNABLE, set from the reading below): a SIG-35 entity's halo carries the light of
20 square metres of lamp at full ink. Each site takes a share of Q in proportion to its
surface area times its material's resting luminance after the lamp core, so a model keeps
its light placement and its lamps' relative strengths, and its size and lit area never
change its total.

A source built from the lamps' displayed light would order the halo by lit area instead:
every lamp displays about the same luminance under the core, so at Ventfront's home camera
the SIG-25 Foundry would carry 91 times a SIG-64 Caisson's light. Under this law the ratio
between two entities is a function of their SIG alone: each Caisson (64) carries 7.9 times
the Bastion's (35), and 32 times the Foundry's (25).

**The SIG gate.** Each entity is weighted by its live SIG on the 5 Hz snapshot, the reading
that already swings its lamps: w = clamp((SIG − 15) / 20, 0, 1), nothing through SIG 15,
rising linearly to full at SIG 35. It is not eased between snapshots, because the lamp core
steps on the same 200 ms. An entity at weight 0 draws no splat, so gate 3's exclusion of
SIG 0–15 holds by construction, over every input. Above 35 the halo rides the curve up to
**SIG 80** and stops there, though `GLOW_FACTOR_MAX` stops the lamp itself at 6: a ping's
SIG 95 carries what SIG 80 does, 25 times a SIG-35 entity's energy, as does every SIG past
80: a Reciter's resting 90, a firing burst that crosses it. Uncapped, a ping
carried 73 times, and a pinging hull's halo reached its own collar
([issue-1001](screenshots/issue-1001/README.md), "The collar at a ping"). A hull whose live SIG
stays at 15 or under, as a Light Scout's does idling (6) and cruising (12), gains a halo only
while something lifts it past 15: a ping, a firing burst, a dive. An entity whose
whole energy, gathered at one pixel, would stay under the toe below also draws no splat.

**Splats.** A site's box is treated as a Gaussian, σ = half-extent ÷ √3 on each axis,
projected through the conn camera into a screen ellipse with a floor of 0.6 drawing-buffer
pixels, truncated at 3σ and renormalised. A splat therefore carries exactly its share of
the energy at any size: a lamp a quarter of a pixel across keeps its whole light and never
flickers with its sub-pixel phase, where a rasterised lamp would. Every Sorrowgate site is
under 1.1 px.

**Occlusion.** A splat sits at its site's nearest point along the view ray, less
**2 m × drawScale**, so a lamp never occludes itself; that bias stays above two steps of the
copied depth even at the survey dolly. The splat is drawn less-or-equal against the copied
canvas depth, without depth writes, so terrain, props, structures and other hulls hide a
halo where they hide its lamp. The copy matches a single-sampled depth in all but about 1 %
of pixels, the 4× edges.

**Fog.** Each splat is multiplied by τ^2.2, where τ = e^(−(fogDensity · d)²) is the lamp's
own FOG_EXP2 transmittance at its view depth d, at the density the water setting gives. The
lamp is faded in encoded space, after its sRGB encode; raised to 2.2, τ makes the encoded
halo fade by the same ratio, to within the sRGB curve's departure from a 2.2 power. The fade
is extinction only: the halo never mixes toward the water colour, and at Water density 0 it
does not fade at all. The halo is agent light dimming with its lamp, never the water
brightening ("Reading the Water").

**Spread.** Each level is a 2 × 2 box downsample of the level above (the source, for the
first), so a sub-pixel lamp keeps all its light, and then a separable Gaussian of σ = 1.69 ×
the pixel ratio in that level's texels, with taps one texel apart out to at least 2.3σ. At
ratio 1 that is the nine-tap kernel #1001 timed. The horizontal half reads the level above
at this level's texel centres, one of its texels apart, so the downsample takes no draw of
its own. Where the level above has twice this level's texels, each tap lands on the centre
of a 2 × 2 block and linear filtering gives the block's mean; along an odd count, such as
the 225 rows a 1440 × 900 frame's 1/4 level has, the taps drift up to a texel from the block
centres, as a downsample drawn at that size samples too. Only a tap past a level's edge
reads differently, clamped to the edge of the level above rather than its own. Each level blurs the one before it, so the
three widths are about **3.4, 7.6 and 15.6 CSS px** at any pixel ratio, summed in the
composite with weights **0.6, 0.3 and 0.1**. A halo's size is the chain's, not the lamp's,
so a louder hull's halo reaches further rather than only brighter.

**Strength.** In the composite, the field's brightest channel m becomes
C = K · (1 − e^(−(m − 0.004) / K)) above 0.004 and 0 below, and the colour is scaled along
its hue to match. The toe, 0.004 linear (5 % encoded), ends a halo rather than letting it
haze the water. The ceiling K is **0.25** linear, 54 % encoded, near the glow recipe's 35 %
halo, so overlapping halos and a ping never sum toward white. Both are TUNABLE and approved
on frames. Modelled at Ā = 20 m², as point sources at Ventfront's home camera at ratio 1,
and so upper bounds: SIG 25 peaks at 0.08 encoded and never passes 10 % luma; SIG 35 peaks at
0.22, past 10 % luma out to about 4.5 CSS px; a resting Caisson peaks at 0.48, out to 10 px;
a ping reaches the ceiling, out to about 15 px, with its faint edge at about 23 px.

**Composite.** The halo is added as light: screen-blended onto the canvas, in the encoded
space every transparent layer here blends in (out = halo + canvas × (1 − halo)). The
plating, its texture and the hull's outline stay visible under it, and no channel passes
white. Lamp pixels take none of it: while the halo is on, every own lamp material marks the
pixels it draws in the canvas's stencil, at no extra draw, and the composite skips them
sample by sample under 4× MSAA. A lamp therefore reads byte-identically with the halo on or
off, at any strength, and gate 3's lamp core is untouched. The canvas always asks for a
stencil buffer for this, so the setting can turn the halo on and off mid-match, and nothing
else draws into it.

**Colour.** Each splat takes its site material's emissive colour, the faction glow ink after
the palette recolour, normalised so its brightest channel is 1, so the hue holds in all four
palettes. Energy is carried separately, so loudness never leaks into hue. Every lamp's light
sums in one field before the one curve, so neighbouring halos merge into one layer and never
stack.

**Cap.** At most **1,024** sites are drawn. Sites are culled to the view first, and the
faintest on-screen energies drop first. Dropped light is lost, not redistributed.

**What it must show.** Read on the named GPU, with the halo on and off, at gate 6's
stations:

- **Loudness order.** At Ventfront's opening, each hull's on-minus-off light is ordered by
  live SIG: Caisson > Harvester (40, working), and nothing from the Light Scout. A structure
  spreads its energy over lamps three to five times a hull's width, so it stays dark through
  its working hum and shows only at its loudest: nothing from the Bastion (35) or the Foundry
  (25, or 55 producing), while a Bastion striking the Order's instant refit (80) shows. Its
  collar carries the rest, as it carries everything a structure's loudness reports
  ([ui-ux.md](ui-ux.md) §3.5). No own entity at live SIG 0–15 contributes a splat, over
  every input.
- **Ping.** A ping at least doubles the area a hull's halo lifts past 10 % luma, for any hull
  resting at SIG 64 or under.
- **The lamp.** Lamp pixels are unchanged with the halo on, within 1/255 on at least 99 % of
  them, at every station. A lamp behind a ridge at the low (12°) camera adds nothing.
- **Darkness.** The conn canvas keeps at least 95 % of its pixels under 10 % encoded luma,
  and loses no more than 1.5 points against the halo-off frame, at every capture camera on
  both maps and both ratios. The frame with the HUD is reported beside it; the HUD already
  holds that frame at 62–83 %. At the High graphics quality the 95 % floor is released
  with the rest of the luminance cap, and the 1.5 points stand.
- **Flash.** One hull's ping changes no more than 0.6 % of the frame and 5.5 % of any
  third-by-third window at the close camera, counted by WCAG 2.3.1's pair: the 2× bound
  #1001 read. One hull changes state at most once every 3 s.
- **The collar.** The loudness collar draws above the conn canvas and is never covered. At
  rest its core keeps at least 3:1 contrast against the halo-on pixels beside it, at the
  home and close cameras; at a ping it keeps 3:1 on at least 90 % of its track.
- **Cost.** It spends only what gate 6 allocates.

**Off, and when it is unavailable.** "Lamp halos" is a toggle in Settings
([ui-ux.md](ui-ux.md) §14). Off, no halo pass runs and no halo target is held, so the
frame is the canvas pass and the chromatic split after it. Reduced motion keeps the halo,
because its flare is a change of state and the state is the message. The halo turns itself
off for a view only when that view fails its capability check, run when the halo turns on
and after a context restore: a renderable half-float colour target, framebuffer-complete
with its depth texture; a canvas stencil buffer; a depth copy that blits without error;
and a known clear read back from the half-float target. On a failure the stored choice is
kept, Settings says "Not available on this display", and the probe gives the reason. A
software rasteriser is not a reason, since half-float targets render under SwiftShader.

**What it is not.** It is not world light: the world-light families keep "no halo recipe"
([style-neon-noir.md](style-neon-noir.md)). It is not an interface glow: the glow recipe's
two-layer cap binds interface elements, and the collar keeps its two layers. It reveals
nothing the client did not already resolve, because it reads only own entities and their
live SIG.

**Where the numbers live.** The gate's 15 and 35 are SPEC, from gate 3, beside
`SIG_GLOW_EFOLD` in `glow.ts`. The rest are TUNABLE, in the halo's own module: the 20 m²
energy and its SIG-80 cap, the ceiling and the toe, the 1.69-tap kernel and the 0.6/0.3/0.1
weights, the 0.6 px floor, the 2 m bias, the 1,024 site cap and the build default. All are
frontend-only, because no other package reads them. The reach is derived from the chain and
stored nowhere.

**Hull portraits** take this halo rather than a bloom of their own
([#1015](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1015)):
`tools/hull-renders/scene.html` draws the game's frame and runs this pass at each hull's
idle SIG, with its three widths multiplied by the hull's drawn length in the portrait over
its drawn length at the close camera, so a portrait shows the close camera's halo magnified
with the hull. Drawn length is the draw's scale, pixels per metre at the hull times its
length, not its span on screen: the same at any heading or camera angle, so the halo grows
as the hull's metres do. At 900 px of view 1,800 m out and a portrait's 940 px a hull, the
widths grow 10.5 to 27.3 times, past the blur's seven taps, so a portrait starts the
three levels whole octaves further down, a 2 × 2 downsample each (`chainShift`); the game
never does. The 20 portraits are re-rendered once.

#### Shallow caustics — SPEC

*Decided for [#1006](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1006):
there are none, and the reason is canon rather than budget.*

A caustic is sunlight focused by a clear, moving surface into a bright moving pattern on
whatever lies under it. This ocean has no clear sunlit water. The sunlit layer is the Lid,
the sour top 150 m, pale and milky since the Collapse, and the Sounding of 141 found white
water to the horizon ([world.md](world.md) "The Salinity Collapse", "The Sounding"). Milky
water scatters light; it does not focus it. What reaches the first clear water under the
Lid, where the Commune's kelp plateaus begin, is a dim light from everywhere above and
nowhere in particular, and that light is already drawn: the water ramp makes the Lid the
brightest water a hull can loiter in and fades it down the column ([Reading the
Water](#reading-the-water)), and the shared rig's environment map grades from a cold
overhead to the deep water below with no sun in it (the SPEC above). By 400 m there is
nothing left to pattern, and most factions live below that line
([systems-depth.md](systems-depth.md) §1).

So the rule is a prohibition, and it binds the four places a caustic could have appeared:

- **Terrain never carries one.** World light is points and seams, never area glow, in
  exactly five families ([style-neon-noir.md](style-neon-noir.md) "World light"); a moving
  light pattern on the ground would be a sixth family and area glow at once.
- **No hull, structure or prop carries one at any depth.** The depth a hull sits at is
  read from the water it stands in, never from a pattern on its skin; a pattern that
  brightened with shallowness would be an instrument drawn in the world, and instruments
  live on the HUD ([style-neon-noir.md](style-neon-noir.md) "World light", rule 4).
- **The Lid's underside does not shimmer.** The surface is finished, not a hope
  ([world.md](world.md) "There is nothing up there", "Writing rule"), and a lit, moving
  ceiling is an invitation drawn in light. The ramp's brightest stop is the whole of what
  the Lid shows.
- **No pass is reserved for it.** Gate 6 allocates nothing to caustics; the halo's four
  steps are the only full-screen work after the canvas pass.

Options written and rejected, so a later reader can overturn the call in one comment:

1. **None — taken.** Costs nothing and matches the canon above.
2. **Caustics on hulls in the Lid only, fading out by 150 m.** Costs a depth-keyed texture
   term in the shared rig. Rejected: it needs clear water the Lid does not have, and it
   makes the one place no one should want to be the one place that looks alive.
3. **A diffuse down-light on own hulls above 400 m, no pattern.** Costs a term in the
   rig's environment weighting. Rejected as a duplicate: the PMREM environment and the
   water ramp already say this, and a second copy of the depth reading on the hull drifts
   from the first.

Reopening this means a biome whose water is clear and sunlit, which no map has and
[world.md](world.md) rules out; it would amend that document first.

#### Bevels and baked occlusion — SPEC

*For [#1002](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1002), row 3 of the
audit below: the kit's bevel measured over the library before anything is added to it, and
the first model given a baked occlusion map, with what that map is allowed to touch.*

**The bevel is a plate's.** `tools/hull-models/kit.mjs` rounds a `plate` or a `plan`, a slab
extruded from a plan outline, with one chamfer segment `bevelM` proud of the outline, and that
is the kit's only bevel: a box, a cylinder, a lathe, a sphere or a torus has a square edge and
no option for another. A GLB cannot say whether a slab was extruded or whether its rim is a
chamfer, so `node tools/render-stack/bevels.mjs` runs every model script and sums what each
export reports it is built from (kit.mjs `census`: the geometry each part holds, and whether an
extruded one was bevelled). A part here is a scene mesh, which is what a script adds and the
export names; row 6 below counts GLB primitives, a different unit. A plate is every extruded
part, the kit's and the faction modules' own, and so is a bevel: `factions/hadron.mjs`
`frameBlades` chamfers its own, and two of the Knights' three are its. At `9e3bfae2`:

| Navy | Models | With plates | Parts | Plates | Bevelled |
| --- | --- | --- | --- | --- | --- |
| Bathyarch Consortium | 24 | 10 | 3,424 | 27 | 5 |
| Pelagia Commune | 24 | 16 | 1,189 | 69 | 15 |
| Abyssal Directorate | 22 | 4 | 1,734 | 19 | 7 |
| Hadron Knights | 24 | 14 | 971 | 75 | 3 |
| Environment props | 14 | 0 | 162 | 0 | 0 |
| Library | 108 | 44 | 7,480 | 190 | 30 |

Three readings follow, and they bound what the row can do:

- **Plates are 3 % of the library.** 3,403 parts are boxes and 2,128 are cylinders, 74 %
  between them; 190 are extruded plates. The razor edge the audit named is, in most places,
  a box's or a cylinder's, and the kit's bevel does not reach it. A chamfered box would. It
  is a new primitive, which the row excludes, and a chamfer switched on across 108 approved
  files is 108 shape decisions taken at once; if one is wanted it is taken per model, by the
  designer under rule 3 of [asset-prompts-3d.md](asset-prompts-3d.md), with
  `tools/hull-models/diff.mjs` as the witness, and it starts in that document.
- **Of the plates, 16 % are bevelled, and the spread is doctrine before it is coverage.**
  The Knights' 3 of 75 is "square-edged is what an Order wing wants" (kit.mjs `plate`), and
  razor-thin lines are their light ([style-neon-noir.md](style-neon-noir.md) "Faction accents
  on a neon-noir ground"): not a gap. The Commune's 15 of 69 is the one to read for coverage:
  the kit calls the navy "soft-edged by doctrine", yet 54 of its 69 plates have none: four
  of its five shared kinds carry 29 plates, none bevelled, the Chorister and the Spinner five
  each the same, and its membranes and intake scoops are extruded square
  (`factions/pelagia.mjs` `membranes`, `intakeScoop`). The Consortium's 5 of 27 and the
  Directorate's 7 of 19 carry a bevel where the hull's own numbers give one (a slab's,
  plough's, scoop's or fan plate's `bevel`) and none otherwise.
- **The count is the library at the commit named.** It moves whenever a model does, so a
  later reading re-runs the script rather than trusting this table.

So the row adds no primitive. Bevelling a Commune plate is a shape decision on an approved
model, one hull at a time, and the designer's to take; this section records where the
candidates are.

**The occlusion map is baked by the script that builds the model, and read by the conn view
alone.** A model opts in by one argument to its export (`tools/hull-models/kit.mjs`
`exportGlb`'s `occlusion`), and `tools/hull-models/occlusion.mjs` does the rest at build time,
so the map is reproduced on every machine `npm run check:models` runs on and compared there
with the committed file, a texel to two grey levels and a corner to 1/4,096 of the atlas, an
eighth of a texel at 512². The
bake lays every part on one atlas on its own UV set (`uv1`, glTF `TEXCOORD_1`), in charts
grown over shared edges within 50° of a seed face and cut until each fills its box; from
every texel it casts 64 cosine-weighted rays and shades the texel by every solid face they
meet within a reach of a quarter of the model's longest axis, the nearer the darker; and it
writes the map as one 8-bit PNG into the binary, named on every solid material at strength 1.
A haze neither shades nor carries it (`glb.mjs` `occludes`). No vertex moves: a vertex two
charts share is split, and `diff.mjs` reads the baked file as unchanged.

What the map may touch is set by where three applies an `aoMap`: the indirect light alone,
the ambient and the environment of the shared rig, never the key or the rim, and never
emissive. So gate 3 holds unaltered, a lamp in a crevice as loud as its SIG; gates 6 and 8
are untouched, no pass, call, triangle or second projection; and the chart never sees it,
because intake's albedo pass copies colour and base map into an unlit material and nothing
else (`hull-intake` page.html), so the four maps of a baked model are byte for byte the maps
of the bare one. That is the non-target control of [Shared model
lighting](#shared-model-lighting--abyss-render-stack), kept.

The first model is the Knights' Bastion, this session's choice where the issue asked for one
reviewed asset and the owner's comment for one reviewed hull, taken in the open in the pull
request's Options: reviewed on
[#960](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/960) and
[#1011](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1011), pre-built at every
opening, and a dome with ribs and conduits lying on it that a map has something to say
about. At 512², 744 charts fill 36 % of the atlas at 0.45 texels a metre, 64 rays to 110 m,
13 s to bake. `bastion-hadron.glb` goes from 118,892 to 416,948 bytes, 170,426 of them the
PNG and the rest the second UV set, the split vertices, and the fifteen parts that read a
sibling's buffer and now carry their own (`audit.mjs` counts 7,010 primitives → 7,025). The
library goes from 19,440,664 to **19,738,720 raw bytes** and from 2,366,027 to **2,564,136
gzipped**, 1.5 % and 8.4 %. On the GPU three uploads the PNG as RGBA8 with mipmaps, 1.33 MiB
a model at 512², which is the line gate 6 of [graphics-standards.md](graphics-standards.md)
holds a model to.

The first hull is the Consortium's Bulwark
([#1111](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1111)), the owner's choice
where the issue named it a candidate, taken in the open in the pull request's Options: the
longest of the four hulls on a trim sheet, 150 m of tiers, turret and citadel on a slab. It is
the first file to carry both, the sheet's layout on UV0 and the map on `uv1`, and the layout
runs first, so a vertex the bake splits keeps its place on the sheet. At 512², 1,025 charts
fill 70 % of the atlas at 1.38 texels a metre, 64 rays to 37.5 m. `bulwark-bathyarch.glb`
goes from 331,428 to 587,556 bytes, 170,852 of them the PNG, and `audit.mjs` counts 7,027
primitives either side. The library goes from 19,770,008 to **20,026,136 raw bytes** and from
2,579,880 to **2,769,351 gzipped**, 1.3 % and 7.3 %, and twelve materials carry a map, seven
of them the Bulwark's. A close conn-view frame of one of four staged Bulwarks draws 42 calls
and 149,434 triangles before and after, and 21 textures where it drew 20
([frames](screenshots/issue-1111/README.md)).

Which model is baked next is a call per model, not a switch. Each costs a quarter to a third
of a megabyte raw and a bake on every `npm run check:models`: on one i7-6700K the Bastion's
takes 13 s and the Bulwark's 57 s. A hull drawn at 60 m has less for a map to say than a
150 m one.

#### UV layout and trim sheets — SPEC

*For [#1005](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1005), row 6 of the
audit below: a UV layout the kit writes, a sheet the kit draws, and the first hull on it.*

**UV0 is laid out by the script that builds the model, in metres.** Until this, UV0 on a
part said only that it merges (kit.mjs `uvAlike`): a three constructor carried its own 0..1
parameterisation, an extruded plate its outline's metres, a sweep zeros, and nothing sampled
any of them. A model opts in by one argument to its export (`tools/hull-models/kit.mjs`
`exportGlb`'s `trim`, a navy's table such as `factions/bathyarch.mjs` `TRIM`), and
`tools/hull-models/trim.mjs` lays every part at export, before the occlusion bake lays
`uv1`: each triangle on the plane of the part's frame its face is most along, plates running
along the part's longer in-plane extent from the part's own edge at one wrap of the sheet per
**24 m**, and the shorter extent spread over one of four bands of **1, 2, 4 or 8** strakes,
the band whose strakes come nearest **6 m** over it — a 60 m deck gets eight of 7.5 m, a 14 m
flank two of 7, a rivet one. A round part (a cylinder, lathe, sphere, torus or capsule, by
its geometry's type) is unrolled instead, whole 12 m plates round its girth, so the unroll's
seam falls on a plate seam along the even strakes and mid-plate along the staggered ones,
and its caps laid flat. The part's frame is the world's, turned by whatever the part is
yawed or tilted off the nearest axis, so a part square to the axes or a quarter turn off
them lays on the world's planes, and a box the Sentinel Turret yaws 29° keeps its seams
along its own edges rather than across them (#1107). A round part of four facets or fewer
round its axis is not a curve but plate cut and welded, so it is laid flat as a box is
([#1124](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1124)). Unrolled by
angle, the two triangles of one tapered facet took two maps, and a joint mid-facet
zig-zagged at the diagonal, 95 texels of the sheet on the Harvester's bow apron. The rule
reads the facet count alone, not the taper, so a straight cable and a wedge lay alike.
On a tapered round of more than four facets that kink stays
([#1447](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1447)): measured over the
6,866 such facets on the 31 laid models, it is under a pixel at the conn view's 3 px/m on 97 %
of them and 6.75 px at most, on the Bastion's dome skirt, and it is left rather than laid one
map per facet, which steps every joint at every facet edge, or cut into rings, which spends
triangles under gate 6. What #1447 moved is the unroll's seam: a facet's triangles now close
the same way round the cut, so the plate between the two ways round — a tone's step at an odd
plate count — falls on a facet edge and not down a diagonal, as it did across the Harvester's
ballast caps: none of the 31 models lays one across a diagonal now. `roundAxis` counts each
corner once, so a squat drum unrolls about its own axis and no longer lays its caps as sides
([#1501](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1501)). No
vertex moves: a vertex whose corners disagree
is split, as the occlusion bake splits a chart's edge, so `diff.mjs` reads the file as
unchanged and `check.mjs` compares the layout to 1/4,096 of the sheet.

**The sheet is the navy's, drawn not painted, and carries luminance only.** `drawTrimSheet`
rasterises the four bands from the navy's numbers — two plates a wrap with half a plate of
stagger on alternate strakes, seams, weathering beside them, a patchwork between plates from
an integer hash, a 0.015 grain — so it is reproduced wherever the script runs and compared
texel by texel. One sheet
serves every model of its navy, so no GLB carries it: `tools/hull-models/sheets.mjs` draws
each navy's table once into `packages/frontend/src/assets/trim/<navy>.png`, `check.mjs`
holds that file to the draw, and a laid-out model carries only its UV0 and, on every solid
unlit material and no lamp, the sheet's name in the material's `extras`. The conn view
attaches the sheet to the tagged materials at load (`trimSheets.ts`, one texture a navy for
the page's lifetime), as `map`, which three multiplies into the material's colour. That
colour is the faction's ink, recoloured from the active palette at load (`rosterModels.ts`,
gate 4), so hue is still the palette's and the sheet says only where a plate ends. It never
reaches `emissive`, so gate 3 holds unaltered, and it adds no pass, call or triangle, so
gates 6 and 8 are untouched. The sheet is held bright for the register the conn view puts a
navy on (`CLADDING_CEILING`): the Consortium's reads a mean of **0.86** in linear light, so
its models land a seventh under it. Sorrowgate's triplanar surfaces
([visual-reboot.md](visual-reboot.md)) are kept: the laminate multiplies `diffuseColor`
after three's `map_fragment`, so a Commune hull in the tutorial wears both, the sheet under
the laminate, and `packages/frontend/test/trimSheet.test.ts` holds the chain.

**A joint is drawn for the camera that reads it, in metres on both axes.** The sheet first
gave its seam in texels, and a texel is 4.7 cm along a plate but 19 cm across a strake of
the two-, four- and eight-strake bands, so a butt was drawn 9 cm wide and a strake seam
38 cm. The conn view draws a hull at about 3 px/m, where the butts mipmapped away and a
hull read as stripes, and the 0.08 patchwork, the one signal coarse enough to survive,
moved a lit hull by a grey level or two. Since
[#1107](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1107) a navy may give
its joints in metres (`seamM`, `weatherM`), and the Consortium's are drawn as laps: a
**0.25 m** seam at **0.4** of the plate on the plate's far end and the strake's top, a lit
lip as wide on the near side, and **0.8 m** of weathering beside both, so a joint is about
a pixel's shadow beside a pixel's light at the conn view's range. Its patchwork is
**0.12**, each plate ramped **±5 %** along its length, under **5 %** of grime in two
octaves, cells of 8 and 3 m, each a whole number of cells a wrap so the sheet still tiles.
Its rivets are the lap's, discs **0.14 m** across at a 0.6 m pitch 0.45 m in from each
strake edge, read close in; the hero rivets stay geometry, `rivetRows`' boxes 0.3 to 1 m
across (the Bulwark's 0.9 and 1 m), two to seven times the drawn ones. Each texel averages
sixteen samples in linear light, so a rivet finer than a texel is drawn at its coverage
rather than grown to the texel; a seam is never drawn narrower than a texel on either axis,
which the Consortium's 0.25 m never is. A table that names none of these keys draws what
it drew before, texel for texel, and `tools/hull-models/test/trim.test.mjs` holds that, a
seam's width on both axes and a rivet's area, each in metres. The sheet is filtered at
four taps (`TRIM_SHEET.ANISOTROPY`, Sorrowgate's number), so a deck seen from the low
camera keeps its plates, and the lit table and the portraits filter it the same
(`tools/hull-renders/trimSheets.mjs`); that is a sampler state, not a pass, call or texel
more.
On the GTX 1070, with ten Bulwarks on screen at `capture.mjs`' four cameras on Ventfront,
gate 6's queued GPU time reads 0.71 to 0.96 ms at pixel ratio 1 and 1.32 to 1.91 ms at 1.5,
at four taps and at one alike within 0.03 ms a camera
([readings](screenshots/issue-1107/anisotropy-gate6.json)). The fight station's opening
fleet is read below, once the Consortium's others were laid; Sorrowgate's Consortium
delegation is contacts, which the conn view never draws as geometry, so it has no sheet to
read. The Directorate's sheet below takes the same four taps; its own GPU reading is the
one #1108 leaves open.

Embedding the sheet in each file was the first cut and the owner's call to reverse: 31 KB a
model that gzip cannot shrink, 2.9 MB over the 94 navy models were every navy given a sheet,
and a re-export of every model on a sheet whenever one of its numbers moved. Apart from the file,
a navy's look is one PNG and one table, and a model's part of it is a layout and a name.

Unlike the occlusion map, the sheet reaches the chart: the sprite bake hands intake's albedo
pass the navy's sheet (`hull-intake` `bake.mjs --trim`, which `tools/hull-maps/build.mjs`
passes for a model named for a navy with one), so the Bulwark's baked sprite carries the
same luminance detail at 4 px/m, which is gate 4 applied — the bake takes the albedo's
luminance and recolours it — and its height and emissive maps are byte for byte what they
were. The lit table (`tools/hull-renders/inspect.mjs`) and the portraits
(`tools/hull-renders/render.mjs`) attach the sheet too, by the name each material carries, as
`trimSheets.ts` does ([#1112](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1112),
`tools/hull-renders/trimSheets.mjs`), so a reviewer judges the plates the conn view draws; an
untagged model renders byte for byte as before. The lit table's `--before` column takes the
sheet as it stood at that revision, so a change to the sheet itself shows in a before and after.

The first hull is the Bulwark, the owner's choice where the issue asked for one hull, taken
in the open in the pull request's Options: the hull #540 opened with, a slab with three tiers
and patchworked flank plates, riveted plate its brief, and the roster's most flat plate.
Its 162 parts lay 2,116 faces flat and 436 unrolled — 2,076 on the one-strake band, 244 on
two, 76 on four, 156 on eight — and split 80 vertices. `bulwark-bathyarch.glb` goes from
324,608 to **331,428 bytes**: 2,560 the split vertices and the rest the glTF JSON naming
them and the tags; the library goes from 19,738,720 to **19,745,540 raw bytes** and from
2,564,136 to **2,567,479 gzipped**. The Consortium's sheet is **46,837 bytes** once, in the
client's assets (31,159 before its laps, ramps and grime), and on the GPU three uploads it
as RGBA8 with mipmaps, 1.33 MiB a navy present at 512², the line gate 6 holds the occlusion
map to per model. A second Consortium script passes the same table and re-exports itself
alone, which is how the rest of the navy was laid (below); another navy's plate starts in its
own faction module, as a table and a drawn sheet.

The rest of the Consortium ([#1107](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1107))
is laid on that table: twenty-two of its other twenty-three models, fourteen hulls and eight
structures, each script passing `bathyarch.TRIM` as the Bulwark's does. Their 3,103 parts lay
**43,040** faces flat and **20,834** unrolled — 50,978 on the one-strake band, 5,854 on two,
2,156 on four, 4,886 on eight — and split **7,556** vertices; no vertex moved, `diff.mjs`
reading every shape unchanged, and the Bulwark re-exports byte for byte. Every file is
metre-true, its length the design length, so a plate is 12 m in the water as in the script.
Seventeen of the twenty-two carry a flat part turned off the axes, which the layout lays in
its own frame (above): before it did, the Sentinel Turret's housing, the Bio-reactor's booms
and the Bastion's quarters took seams across their own edges. The frame re-lays 21 of the
Directorate's Light Scout's 32 parts too, its segments, tail plates, limbs and telson each a
few degrees off the axes, and moves the UVs of three lamp boxes on the Knights' Responsory
that nothing samples. Both keep their raw bytes; zlib's gzip takes the Light Scout from
13,173 to 11,677 and the Responsory from 15,676 to 15,477, and the Light Scout's sprite is
rebaked, 4,213 to 4,280 bytes at the same luminance, where the Responsory's is byte for byte.
The Reed is byte for byte. A part turned exactly 45° ties to
the lower axis, so of four diagonal arms — the Vent Tap's exchangers, the Sentinel's feet,
the Baffle Barge's emitter fins — two pairs lay alike, each pair the other turned end for
end. The Harvester waited on
[#1124](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1124): its bow apron is a
four-facet taper, and unrolled by angle its seams zig-zagged where the facet's two triangles
disagreed. Laid flat since, it went on the sheet, its four finishes tagged, its file from
66,644 to 104,928 bytes and its sprite from 4,925 to 26,511. The rule re-laid nine more
models' four-facet parts, the wedges on the Corvette, the Cruiser, the Spark and both Light
Scouts, the Responsory's barrel, and the cables of the Gantry, the Bastion and the
Slipway. Each shape reads unchanged under `diff.mjs`.

The sheet is on `hull_black`, `iron_grey`, `oxide_rust` and `hazard_amber` wherever a model
carries them, and three finishes stay bare, the owner's calls. `baffle_foam`, the Baffle
Barge's vanes and pads, is foam and not lapped plate. `amber_lamp_unlit`, the lamp family's
base the Furnace and the Bio-reactor wear dark, stays bare as the Order's and the Commune's
do. `ground_rust` is `oxide_rust`'s hex under a second name
([asset-prompts-3d.md](asset-prompts-3d.md)) on the ground a structure stands in — the
Bio-reactor's kelp holdfast and the Vent Tap's basalt chimney, lobes and apron — which under
the rust's own name wore its rivets, while the feet, clamp and flanges bolted into it keep
their plate (`ventWellhead` takes the clamp's finish apart from the rock's for that).

The files grow more than the Bulwark's did, since the layout lays each part where it stands
and gives a geometry two parts shared a copy each, with UVs of its own (`layoutTrim`); the
Bulwark shared none. The twenty-two go from 6,041,688 to **7,129,644 bytes** raw and from
445,186 to **605,182** gzipped, the Corvette from 132,708 to 301,128 as its 59 position
buffers become 138; the library goes from 20,026,136 to **21,114,092 raw bytes** and from
2,769,351 to **2,927,652 gzipped**, and 97 materials carry a trim tag where 13 did. The
sprite rebake changes the albedo alone: twenty-two maps from 228,610 to **1,371,793 bytes**,
the Bastion's from 45,554 to 319,791, since the sheet's grime and grain do not compress as
flat ink did. The heights and emissives are byte for byte what they were, so every glow
stays where gate 3 put it. Each sprite reads 0.83 to 0.87 of its old linear luminance, the
Beacon the darkest, and the Bio-reactor and the Vent Tap 0.89 and 0.90 with their ground
bare. Delivery is the cost: a Consortium opening on Ventfront — the Light Scout, two
Caissons, a Harvester, the Bastion and a Foundry — fetches 36,311 gzipped bytes more model
and 404,825 more sprite, the Bastion's map most of it.

Gate 6 is read on the GTX 1070, unpaced and queued, main's files against these at pixel
ratio 1 and 1.5 ([readings](screenshots/issue-1107/gate6.json)), with no staging, since the
first client takes the Consortium by default. Ventfront's opening, four hulls and two
structures on screen, draws the same 56 to 57 calls and 150,676 to 150,696 triangles and one
texture more, 21, the sheet; queued GPU time reads 0.85 to 0.98 ms at ratio 1 and 1.48 to
1.85 ms at 1.5, within 0.06 ms a camera of main's. The fight station draws 59 calls and
150,984 triangles either side and reads 1.00 and 1.65 ms against 0.95 and 1.64. Sorrowgate
does not move: 30 to 38 calls, 46,607 to 46,634 triangles and 11 to 17 textures before and
after, and its GPU time within 0.02 ms, since its six own hulls are the court's
([mission-sorrowgate.md](mission-sorrowgate.md) §2). [The conn view](screenshots/issue-1107/conn-view.png)
shows the opening's laid models close, main on the left and this on the right, and
[the lit table](screenshots/issue-1107/lit-table.png) each laid model's conn row.

The Directorate's sheet ([#1108](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1108))
keeps that layout machinery, but not the Consortium's rectangular patchwork or its
numbers above. Its substrate is segmented chitin: **8 m** tergites, **6 m** target strakes,
two tergites per **16 m** wrap. The `tergite` draw mode curves each transverse seam by
**24 texels** at 512², meeting the next strake's curve without a longitudinal grid.
The **1.5 texel** seam sits at **0.45** of the shell's light; **8 texels** of shadow at
**0.14** strength lie under the overlap, with a clean lip on the other side. Five faint
growth lines follow each segment's curve at **0.035** strength, fading at the lip;
**0.04** segment tone variation and **0.01** grain sit under a **0.98** light ceiling.
These are surface marks, not new geometry, rivets or biolights. The Light Scout is the
first hull: its carapace and tail expose the sheet in the opening fleet, while its three
photophore domes keep their approved resting light. Other Directorate models remain
unlaid. The sheet has the same 512² sRGB, mipmapped RGBA8 upload and page-lifetime ownership
as the Consortium's: **1.33 MiB** once per navy present, no extra draw or triangle.
The Light Scout's GLB grows from **60,388 to 68,612 bytes** (+8,224; gzip 8,598 to 13,173),
with **32 parts and 468 triangles** unchanged; its layout splits 73 vertices and tags
three cladding materials. The sheet is **37,757 bytes**, mean linear luminance **0.938**.
Only the fallback albedo changes: normal, height and calibrated emissive intake maps
remain byte-identical. [The hull comparison](screenshots/issue-1108/hull-review.png) shows
the sheet, maps and bare-file shape check; [the close scout pair](screenshots/issue-1108/scout.png)
and [four in-game views](screenshots/issue-1108/views.png) show the shipped material.
The [before](screenshots/issue-1108/before.json) and [after](screenshots/issue-1108/after.json)
counts stay at 53–54 draws and at most 148,239 triangles; textures rise from 20 to 21.
These are Chrome/SwiftShader visual captures at 1080×675, not GPU timing evidence:
the standard 240-frame capture timed out, so the four views were held for four seconds
each. The offline intake, lit-table and roster-sheet harnesses accept
`PLAYWRIGHT_CHANNEL=chrome` to use installed Chrome when bundled Chromium is absent.

**Evidence follow-up (#1108).** Independent visual reviews now cover all three
comparison sheets: the hull/maps, close scout and four-camera view. The four-camera
review found no obvious silhouette, faction-colour, HUD or acoustic-overlay regression.
Its cameras are comparable, not pixel-identical: small eye/focus offsets and different
simulation states prevent attributing every changed pixel to the trim. Survey distance
does not resolve the trim; the close scout pair, not the survey frame, shows its detail.
Still images do not establish temporal stability while the camera moves.
An independent code review of `d62ffa62` → `c720cfa6` also found no significant
issues, covering the drawing branch, layout opt-in, tests and browser selection.
This closes the review-coverage gap left by the unavailable automated review service;
it is not a claim that the service itself recovered.

**Still open: hardware measurement and motion.** The follow-up runner exposes only
`hyperv_drm` on `/dev/dri/card1`, with no GPU render node. A longer SwiftShader capture
cannot close the hardware timing gap, and the four-second captures above do not satisfy
the standard 240-frame dwell. On a GPU-equipped desktop, compare the baseline `d62ffa62`
and trimmed assets at the same camera and Directorate fleet state, using
`tools/render-stack/capture.mjs` with a headed browser, `UNPACED=1` and `VIEW_DPR=1`,
then `VIEW_DPR=1.5`. Retain the renderer identity, four views and `readings.json`;
require `software: false`, `gpuTimer: timing`, at least 240 frames per camera and the
queued load longer than the measured frame. Review a moving-camera pass for seam
shimmer as well. Select the Directorate **before readying**: the stock `drive.mjs`
readies its default navy before invoking `--steps`, so passing the capture module alone
does not prove this navy was measured. No GPU-time or motion pass is claimed here.

The Knights' sheet ([#1109](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1109))
keeps the layout machinery and takes a third draw mode, `facet`, for a navy whose Block 2 brief
is polished pale alloy and mirror facets and whose Responsory block is "fine ceramic panelling
over the whole hull, seams tight ... no rivet": an aligned grid with no stagger, lap, rivet,
grime or ramp. Panels are **4.5 m** by **4 m**, two a **9 m** wrap — the facet rule's own grain
(Block 2c cuts a mirror facet at a 3 m chord), and the half metre over four is parity: a round
part unrolls at whole plates round its girth, and between 4.31 and 4.97 m the Responsory's blade
(19.4 m round), horn (17.4) and drive (8.1) come out at four, four and two, so a butt on one
beam has its twin on the other. Each joint is a hairline **0.2 m** wide at **0.4** of the light,
centred on the joint, under a flat chamfer **0.2 m** wide each side at **1.0**, brighter than
any panel, so close in a joint is light-dark-light and at the conn view's 3 px/m the hairline
takes 14 to 33 % off the pixel it crosses by where it falls; 0.15 m took 10 to 23 % and
mipmapped to a rumour, and the Consortium's 0.25 m reads as plate. Panels sit at **0.96** under
a **0.04** tone keyed on the strake's distance from its band's middle, so every band is the
same turned over — which is how the layout lands a keel-centred part's port face against its
starboard and a port part against its twin — and no grain, since a mirror has no tooth and the
grain is the one mark that does not mirror; measured texel for texel, no band differs from
itself turned over by a level and the wrap closes to the level. The table's `mirror` key is
the layout's half of that: a flat face laid along the beam measures its plates from the
centreline out rather than from the part's own low edge — from the inboard edge on a part
wholly to one side, and from z 0 on a part across the keel, set half a plate out so the
centreline is mid-plate and a plate's index keeps its parity under the mirror, where a joint
on the centreline would swap the tones — because that low edge is inboard on a starboard part
and outboard on its twin, and the first layout put the port wing seams' joints at other
distances from the keel than the starboard's. A round part takes the same rule
([#1375](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1375)): one wholly to one
side unrolls as its starboard twin turned over, its angle from the inboard line, and one on the
keel unrolls from its crown, half a plate on, so the mirror takes each plate to itself at any
count. The Consortium's and the Directorate's tables do
not set it, and their layouts and files are byte for byte what they were. The table's
`untagged` keeps the sheet off `resonance_crystal` and the lamp family's unlit finish
`crystal_seam_unlit`:
violet stone and a dark seam are not panelling, so both are laid out and left bare, and the
lamps are never tagged. The Responsory is the first hull, the owner's choice: its 48 parts lay
**584** faces flat and **572** unrolled — 856 on the one-strake band, 120 on two, 40 on four,
140 on eight — split **138** vertices (140 since #1375) and tag two materials, `shadow_indigo` and `pale_alloy`.
`responsory-hadron.glb` goes from **104,480 to 110,156 bytes** (zlib's default gzip 13,098 to
15,676, as `tools/render-stack/audit.mjs` measures) with
its 48 parts, 1,156 triangles and outline unchanged; no triangle moved, so the sprite rebake
changes the albedo alone (`responsory-albedo.png`, 7,191 to 19,047 bytes, 21,963 since #1375, the wings' butts drawn
at 4 px/m) and the height and emissive maps are byte for byte what they were, the glow on its
gate-3 target of 3.10. The sheet is
**1,653 bytes**, flat fields compressing where plate and chitin do not, at a mean linear
luminance of **0.899**: under the Directorate's 0.938, over the Consortium's 0.857, so a
polished navy is not darker than riveted plate on the register the conn view puts it on. On
the GPU it is the same 512² RGBA8 upload with mipmaps, **1.33 MiB** once per navy present, no
draw or triangle more. With four staged Responsories on Ventfront, read on the GTX 1070 at
`capture.mjs`' four cameras, calls and triangles are the same before and after (49–50 and
143,656–143,756), textures go from 20 to 21, and gate 6's queued GPU time reads 0.70 to 0.82 ms
at pixel ratio 1 and 1.29 to 1.68 ms at 1.5, within 0.02 ms a camera either side
([readings](screenshots/issue-1109/gate6.json)). [The conn view](screenshots/issue-1109/conn-view.png)
and [the lit table](screenshots/issue-1109/lit-table.png) show the panels; the GPU readings
were taken on the first layout, which `mirror` moved in UV values alone. The skin's
symmetry is measured by [the mirror measure](screenshots/issue-1109/mirror.mjs): the sheet at
interior points of every tagged triangle against the sheet at the mirrored point, through a
16-texel blur. The flat skin differs from its mirror by under **3** sRGB levels everywhere, where
the first layout had up to 29 % of a wing or panel seam's samples over 8, and the emitter barrel,
one plate round with its joint and the unroll's wrap on the keel line, by 3.7 at most. Every
round part mirrors at its corners, the ring stays included, which before #1375 carried their
butt on the inboard face of one and the outboard face of the other. Between the corners the
rounds do not quite: the layout sets `u` per corner from the angle, so a joint that falls
mid-facet where the facet tapers follows the triangle's diagonal and kinks, under a pixel at the
conn view's 3 px/m but on the horn's widest facets, 2.8 px, and the drive's, 1.1 px, and the mirror
of a diagonal is the other one, on the blade, the horn, the drive and the resonator rings. **4.1 %** of the tagged area (243 of 5,898 m²) differs from its
mirror by more than 8 levels, 4.2 % before #1375 and 4.7 % before `mirror`, all of it on those
rounds, and [#1447](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1447) measured
the kink and left it. The barrel, four facets round, is laid flat since
[#1124](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1124), within 2.7 levels
of its mirror, and the 4.1 % does not move. A round part's end caps laid from world position rather than the part's centre
(`layoutMesh`) are the layout's too, and
[#746](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/746) holds them.

The Commune's sheet ([#1110](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1110))
keeps the layout machinery and takes a fourth draw mode, `grown`, for a navy whose Block 2 brief
is "grown chitin-and-algae composite hull with growth rings ... nothing is painted": no plate at
all, so no butt, lap, rivet, ramp, grime or stagger. It draws growth increments along each
strake, lines of constant `v`, and the layout makes that one line two things: an unrolled part
runs `v` along its axis, so the line is a ring round a stem, a pod or a `grownBody` orb (it keeps
its sphere's type and unrolls), and a flat part runs `v` across its shorter extent, so the line
runs along a leaf's or a fin's span. Four increments a **6 m** strake, a metre and a half each,
the facet rule's own edge for the navy; each sits up to **0.3** of its pitch off its station by
an integer hash and wanders **±0.5 m** across the strake on 4 m cells, because a line at a
regular pitch reads as ruled paper and a ring at every station as the segmented worm `kit.mjs`
`loft` warns of. A line is **0.15 m** at **0.84** of the light, and about one in four is a check,
**0.5 m** at **0.25**, each varying by the line within ±30 % in width and ±10 % in depth; both are
held to a texel across the strake, as the lap is. **0.03** of tone is keyed on the increment, so
the one step falls on a line and never on a strake's edge, under **0.04** of mottle in two octaves
of 8 and 3.2 m cells and a **0.01** grain. The pitch in metres is the part's, since the bands stop
at eight strakes: the Reed's 60.5 m stem lays on the eight-strake band at 7.6 m a strake and
1.9 m an increment, and its two rings, 1.1 and 1.2 m along it, on the one-strake band at about
0.3 m, a tone. The hero rings stay geometry (`growthRings`, `grownRings`, `drumRings`), as the
Consortium's `rivetRows` stand over its drawn rivets: the Reed's, on a 0.5 m tube, are over twice
the drawn check, though the Runner's, on a 0.22 m tube, are finer than it. `mirror` is off, since the Commune refuses a
mirrored pair, and `untagged` leaves `bio_vein_unlit` bare, the vein family's unlit base and the
Knights' `crystal_seam_unlit` precedent, and `grown_steel`, the structures' fitted collars and
pipes and the one thing on a Commune model not grown.

Nothing on this sheet is a joint, so the plate, **16 m**, is two things only: the count a round
part unrolls at, and the period of everything that varies along `u`, the wander's four cells and
the mottle's two and five, each a whole number a plate. That period is what closes an unroll. A
round part unrolls at whole plates, and one plate is half the **32 m** wrap, so a field repeating
only every wrap met itself half a field out of phase at a one-plate part's unroll seam: the first
sheet, at the Directorate's 8 m plate, left a row of dark diamonds down the Reed's port beam, one
a ring, 51 levels off in the eight-strake band, where the fields a plate leave the two edges
within the grain's 3. At 8 m with the fields a plate the coarse mottle would be one cell, flat
along `u`, so the plate went to 16; a 16 m repeat is under one and a half periods along the
21.5 m starboard leaf. The check is drawn for the camera that reads it, and the Commune's ink is
what sets its depth: `chitin_hull` is nearly black at rest, and a sheet only darkens what the ink
has. At the conn view's nearest zoom, about 5 px/m, a first check of 0.3 m at 0.55 moved 45
pixels of a 50,700-pixel crop of the Reed from above by more than 16 levels of luma and no ring
read; at 0.5 m and 0.25 it moves 113, and the rings read on the stem between its nodes and as
lines along the leaves, the fine lines a tone ([the conn view](screenshots/issue-1110/conn-view.png):
main, the first check and the final, the top row that crop's 390 by 130 pixels each doubled, the
lower row a low camera for the look). The sheet is **39,782 bytes** at a mean linear luminance of **0.875**: over the
Consortium's 0.857, under the Knights' 0.899 and the Directorate's 0.938, a matte skin girdled by
a dark ring every few metres, so the register the conn view puts a navy on moves by an eighth.

The Reed is the first hull, the owner's choice: two of the three hulls in the Commune's opening
escort (`OPENING_ESCORT`), and its block names the surface, "growth rings at two nodes where the
stem swells". Its 16 parts lay **1,149** faces flat and **897** unrolled (1,496 on the one-strake
band, 90 on two, none on four, 460 on eight), split **314** vertices and tag four materials,
`chitin_hull`, `growth_ridge`, `algae_membrane` and `spore_pod`; `bio_vein_unlit` is laid out and
bare, and the lamps are never tagged. `reed-pelagia.glb` goes from **122,148 to 132,652 bytes**
(zlib's default gzip 37,407 to 42,633) with its 16 parts, 2,046 triangles and outline unchanged,
so the sprite rebake changes the albedo alone (`reed-albedo.png`, 3,623 to 8,815 bytes), the
height and emissive maps byte for byte what they were and the glow on its gate-3 target of 1.06.
On the GPU the sheet is the same 512² RGBA8 upload with mipmaps, **1.33 MiB** once per navy
present. With four staged Reeds on Ventfront, read on the GTX 1070 at `capture.mjs`' four
cameras, calls and triangles are the same before and after (52–53 and 198,756–198,828), textures
go from 19 to 20, and gate 6's queued GPU time reads 0.67 to 0.82 ms at pixel ratio 1 and 1.27 to
1.71 ms at 1.5, within 0.02 ms a camera of main's
([readings](screenshots/issue-1110/gate6.json)). [The lit table](screenshots/issue-1110/lit-table.png)
shows the rings round the stem and the lines along the leaves close in. The Commune is
Sorrowgate's navy, so its sheet is the one the tutorial's triplanar laminate will meet, the
laminate multiplying `diffuseColor` after `map_fragment` with the sheet under it; in play that
waits on the Commune's Light Scout, the tutorial's only Commune hull
([mission-sorrowgate.md](mission-sorrowgate.md) §5), and until it is laid out
`packages/frontend/test/trimSheet.test.ts` holds the chain on a stand-in tagged `pelagia` and
built as a Commune Reed.

#### Ranked audit and remaining work

The baseline is commit `1df288a` (28 September 2026), not the earlier #286 scene.
`PerspectiveView.ts` submits the world directly through WebGLRenderer with no tone
mapping, environment, shadow-map enable or composer at that baseline.
`tools/hull-renders/scene.html` instead configured ACES, PMREM, shadows and a bloom
composer, a lighting reference rather than a runtime implementation to copy; since
[#1015](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1015) it draws the conn
view's frame.

| Rank | Upgrade | Verified starting point and boundary |
| --- | --- | --- |
| 1 | Shared rig, tone mapping, PMREM | Landed first ([#1008](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1008)). The tutorial rig promoted to every match, with ACES and the static PMREM above; no model edits or full-screen pass |
| 2 | Lamp core, then a lamp halo ([#1001](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1001)) | The lamp core landed ([#1021](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1021), [#1029](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1029)). From #1001's readings the owner picked the full-screen route, drawn after the canvas over a depth-only copy of its depth; "Lamp halo — SPEC" above and gate 6's line specify it, on by default behind its setting since the owner approved its frames |
| 3 | Bevel coverage and baked AO ([#1002](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1002)) | Both landed ("Bevels and baked occlusion — SPEC" above). Coverage measured: 30 of 190 extruded plates are bevelled, and plates are 3 % of 7,480 parts, so no primitive was added. The Knights' Bastion carries the first baked occlusion map and the Consortium's Bulwark the first hull's ([#1111](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1111)), each on its own UV set, read by the conn view alone, its silhouette unchanged; the next model is a call per model |
| 4 | Vignette, chromatic split, camera sway ([#1003](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1003)) | All three are built ([Atmosphere rides on top](#atmosphere-rides-on-top-in-screen-space)). The vignette and the sway use no pass. The split is a colour copy and one full-screen draw after the halo, and gate 6 allocates both. Existing shader-driven kelp sway and water fog are different effects; do not duplicate them. Respect gate 8 and reduced motion |
| 5 | GLB gzip ([#1004](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1004)) | Built. The nginx image's `mime.types` names no `glb`, so `packages/frontend/nginx.conf` names the type in the models' own location and gzips them at level 6. Delivery cost, not frame quality |
| 6 | UV layout and trim sheets ([#1005](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1005)) | Landed on all four navies: the Consortium's Bulwark and, since [#1107](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1107), its other twenty-three models, the Harvester since [#1124](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1124), and one hull a navy for the other three: the Directorate's Light Scout ([#1108](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1108)), the Knights' Responsory ([#1109](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1109)) and the Commune's Reed ([#1110](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1110)), each on its navy's sheet ("UV layout and trim sheets — SPEC" above). At #1005, 6,863 of 7,025 primitives carry UV0 and 13 carry `uvAlike`'s zeros, but attribute presence is not a layout: the Bulwark's 162 parts are laid out in metres by its script, and four materials are tagged for the Consortium's sheet, one PNG a navy attached at load, luminance only, hue still the palette's. Sorrowgate's triplanar surfaces are kept under it; the next hull in the other three navies is a call per hull |
| 7 | Shallow caustics ([#1006](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1006)) | Decided: none. The sunlit layer is the milky Lid, which scatters rather than focuses, and the water ramp already carries what light reaches the Shelf ("Shallow caustics — SPEC" above). Nothing to build |
| 8 | WebGPU/TSL ([#1007](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1007)) | Defer migration until a separate feasibility decision. Water, survey, surface and sway shader patches depend on the current WebGL pipeline; this is not a renderer-constructor swap. The feasibility note is written ([webgpu-feasibility.md](webgpu-feasibility.md)): every patch has a TSL equivalent, but under r169 frame-wide tone mapping holds gate 3 only if every material carries its own curve, one-pixel points cost gate 6 triangles, and the halo's depth copy costs gate 6 a call or a target |

Over the model library as it stood at `1df288a`, `node tools/render-stack/audit.mjs`
counts **17,819,812 raw bytes** and **2,211,283 gzip bytes** over 108 source GLBs with
Node's default gzip settings. It reads the library as it stands, so the bytes move
whenever a model does: with the Bastion's and the Bulwark's occlusion maps it counted
20,026,136 and 2,769,351, and twelve materials with an occlusion texture ("Bevels and baked occlusion — SPEC" above),
and with the Consortium's other twenty-two on its sheet (#1107) it counts 21,114,092 and
2,927,652, and 97 materials with a trim tag. Then 4,578,876 of those bytes were primitives
byte for byte another's in the same file, since GLTFExporter shares one only between parts
holding one geometry object. With each written once and both nodes pointing at it
([#1125](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1125), kit.mjs
`shareAlike`), 90 files are re-exported, every part and UV bit for bit as before and every
material equal at float32, and the library counts 13,643,272 raw bytes and 2,628,937 gzipped; the raw fall is larger
than the duplicates because the JSON lists fewer accessors. Parts alike only in part still
wrote 2,737,452 bytes of accessors twice: two boxes of different widths share their normals,
UVs and index, and the Bathyarch submersible's reinforcement bands their corners but not
their UVs. With each attribute and index
alike written once as well ([#1129](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1129),
the same function), 98 files are re-exported under the same readings, the Knights' Bastion
now writing the occlusion strength of 1 its file had left to glTF's default. The files hold
8,635 accessors rather than 16,225, and the library counts **9,517,896 raw bytes** and
**2,457,017 gzipped**.
Those are sums over the source library, not a browser's initial download: Vite hashes
assets and the client loads them by need. A solo match on the default map, its build at
`c771ca8` served by nginx 1.24 through `nginx.conf` and the image's `http` settings, fetched
13 of the 108 models before its requests stopped: **1,213,200 bytes** raw and **150,459**
gzipped, by nginx's access log. The whole load fell from 4,546,477 bytes to 3,483,736. The
same load at `7788976` fetched 19 JS and CSS files, **2,238,882 bytes** raw; gzipped at the
models' level ([#1038](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1038)),
they sent **754,104**, and the whole load fell from 3,532,664 bytes to 2,047,886. The
rank retains the issue's visual priority, and WebGPU is not a prerequisite for the other
seven.

### Reading the Sea Floor

The ground has a shape now ([systems-depth.md](systems-depth.md) §1), and the player has to
be able to read it without being told. Three things, in order of how loudly they should
speak:

- **Depth is luminance.** The gradient rule above, applied to the map itself: shallow ground
  is the brighter end of its biome's colour and deep water the darker. It carries no hue of
  its own — a plateau in kelp is still kelp-green, only paler — because hue belongs to the
  biome and the biome is what the Echo Layer prices sound by. A player should be able to see
  the trench, the shelf and the vent line as terrain before they know any of the numbers.
  Where two biomes meet, each fill eases into the other across 60 m of the cell edge
  (`BIOME_BAND_M`, [#1532](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1532)),
  the two meeting half and half on the line. Inside that band a pixel carries a mix of two
  biomes' hues, and nowhere else: the coast the survey ink dashes on the edge is still the
  PF line, so which biome holds a cell is read from the ink, never from the band. A hard cut
  printed the 250 m grid back onto every authored ramp, vein and dome as a staircase of
  colour. Rock keeps its solid coast and takes no band. The free-water study draws its
  band and its coast on its rounded edge instead ([map-visuals.md](map-visuals.md) §4, the
  study's clause).
- **Ground you cannot enter speaks in the interface voice.** Whether ground blocks you is not
  a property of the ground, it is a relationship between the ground and *your* hulls: a ridge
  that stops a deep raider is open water to a scout. So it is drawn only while something is
  selected, in the cyan the HUD uses to tell you things
  ([style-neon-noir.md](style-neon-noir.md)) — never in threat-red. Being unable to cross a
  ridge is not danger; it is information, and the difference matters when the same screen has
  to show both.
- **A roofed passage is a hole under a ridge, and its route is drawn on top.** The water
  above a ceiling is no water at all ([systems-depth.md](systems-depth.md) §1), so the conn
  view stands the roof up as stone, risen like a mesa and always clear of the ceiling it
  lids, and bores the passage under it. Where
  the passage meets water deeper than its ceiling, the stone ends in a lintel at the ceiling
  depth and the mouth is open beneath it. Where it meets shallower ground or rock, the side is closed
  ([three-layer-ocean.md](three-layer-ocean.md) §5). A tunnel is still invisible from above
  by construction, so its line is drawn on the ridge and on the sonar scope. The line runs
  along the passage, mouth to mouth. It is public map data like every other part of the
  ground: everyone can see that the passage exists, and nobody can see who is in it.
- **Your own hull under a roof turns that roof to glass.** While one of your hulls is inside
  a passage, its whole roof draws translucent, so the hull and its plumb line stay readable.
  Only your own force opens a roof: the conn view holds no other hull's position, and a roof
  that cleared for a contact would be a detection drawn in stone.

The order matters. Terrain must stay quieter than contacts — "RTS readability > realism" —
so none of this may compete with a return for attention. If a player cannot find the enemy
because the seabed is shouting, the seabed is wrong.

What gives the ground its shape at the survey dolly is not on this list, because it is not
ground: **survey ink** — isobaths and coastlines, hue-neutral and a constant pixel wide —
is specified in [map-visuals.md](map-visuals.md) §4, with the ladder that keeps it below
the quietest map-furniture outline and below your own unselected detection ring in §5.

Within a region, the ground is allowed **texture, not information**. The renderer lays a
deterministic detail relief under the authored floor and lights it with the shared key
light, so a vent field reads as broken ground, the trench floor as pressure-eroded stone,
and coral ruins as terraced right angles — "Environmental Shapes" below, become pixels.
The free-water study cuts its coral as wandering benches instead
([free-water-slice.md](free-water-slice.md) §9, "Crater walls").
Its amplitude belongs to the biome (SPEC: the per-biome table lives in
`packages/frontend/src/game/seabed.ts`, values TUNABLE), it is centred on the authored fill
rather than drawn under it (below), and it is **render-only**: the simulation never reads it,
no gameplay quantity — floors, collisions, PF, detection — may ever derive from it, and it
must never out-shade an authored terrain step. It is what the ground looks like, never what
it is.

**Texture is centred on the fill, and capped under the ink.** Until
[#1103](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1103) the fill was a
ceiling. A darken-only texture can only draw shadows. At the home dolly the ground sits near
20 of 255, so those shadows moved too few code values to read, and the silt detail below
stayed at two fifths of #967's target. The owner lifted the ceiling on two conditions. Under
them the ground averages to its fill, where the 5–10 % band was authored, rather than the
5 % or so under it where darken-only texture had held the home plateau:

- **No texture averages brighter than its fill.** Each texture pass is centred: a face turned
  to the key light lifts and one turned from it darkens. Over many of its own scale — dune
  cycles, ripples, the relief's and the mottle's wavelengths — it averages to the fill or
  under it, within a thousandth of the fill. So wherever the eye averages, the ground keeps
  its brightness, the fills keep the 5–10 % band, and depth keeps reading as luminance.
- **No pixel lifts past 0.15 of its fill** (`TERRAIN_LIFT`): the bake's texture takes 0.05
  of it and the silt detail the rest. The ladder sets the cap ([map-visuals.md](map-visuals.md)
  §5). Its tightest pair, tritanopia's unselected ring over rung 5's floor, ties once the
  palest fill is lifted by 0.19. At 0.15, rungs 4 to 6 still clear each other over the lifted
  ground, and a lit face lifts the palest fill by 0.017, under the quietest line of survey
  ink's 0.034 over it. Rung 7's recorded break on the chart widens to the standard palette
  there, which the owner accepted and §10 of that doc records.

What stays darken-only is everything that is not texture. `depthShade` does, because
luminance is depth. An authored step's hillshade does, because a lit shelf edge would read
as shallower ground. And the cliff shadows, a mesa's rim and a seated stone's scour do,
because each is the shadow of something.

Three further layers of the same texture-not-information rule:

- **Albedo mottling.** Beside the relief, each biome's fill carries a faint
  luminance-only variegation — sediment, growth, scatter — from an independent noise
  channel in the same bake. It is hue-preserving by construction (all three channels
  scale together, because hue belongs to the biome and the biome is what sound is
  priced by), centred on the fill under the same cap as every texture, and its per-biome
  strength lives in the `seabed.ts` table with the relief numbers.
- **Rock speaks in stone.** Ground that admits no water — mesas, trench walls, the
  rock over a roofed passage — is the one ground with no propagation factor to
  encode, so it takes no biome fill: it renders in the hue-neutral stone ramp
  (`rock-face` / `rock-shadow`, [style-neon-noir.md](style-neon-noir.md) "The
  stone"), with its own relief — jagged, cliff-lipped, shadowed at the base where a
  mesa meets open ground. Its crags are texture, centred on `rock-face` like any other;
  its rim and its cliff shadow darken only. The ramp sits below the palest biome fill on
  purpose, and stays there lifted: 1.15 × `rock-face` is still under the palest fill. Ground
  you can enter always speaks louder than ground you cannot, and the cyan blocked-ground
  overlay stays the only voice that says "not for *this* hull".
- **World light.** Terrain-owned light exists in exactly five families, spec'd and
  capped in [style-neon-noir.md](style-neon-noir.md) "World light": **vent ember**
  points in `#E06A2B` (SPEC — deliberately redder than Bathyarch's hazard amber),
  flickering on the 5 Hz sonar grid; **flora biolight** tips on kelp and living
  coral; the **crystal seam** in resonance crystal; the **civic lamp**, a steady
  `#B8875A` point on the Upper Concourse, the one ground that was built (#1533); and the
  **ore trace**, a dull `#7A5634` glint on a few lumps of each nodule bed (#1555). All
  five are points and seams, never area glow, with the vent ember as the brightness
  ceiling: decoration for ground the map already declares hot, alive, charged or
  built — deterministic per
  map, render-only, and carrying no state, never brightening with activity,
  occupancy, or anything else a player could read as a signal. The seafloor
  otherwise stays unlit at the Low graphics quality; at High it is lit, and its light may
  leave the 5 Hz grid the steam below steps on
  ([Two layers, two laws](#two-layers-two-laws)). Each vent chimney breathes steam in the ember's hue (#1514): soft
  puffs leave its mouth, climb straight up and thin out, each puff dimmer than an ember at its peak.
  The climb steps on the same 5 Hz grid, and reduced motion holds each column still. At
  High the column is lit smoke instead ([The vents at work](#the-vents-at-work)).

#### Silt detail and seated stones — SPEC

*For [#1083](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1083): #967's dune
study, made fit for every map, and promoted to every match on
[#1103](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1103).*

The bake draws the ground at 7.8 m a pixel, so at the home dolly, about a metre a pixel,
the plain between two isobaths is one smooth wash. The target asks for low silt dunes and
current ripples running east–west, shallow scours, and faceted stone half-buried in the
silt ([issue-967](screenshots/issue-967/README.md), round 2). It is a fourth layer of
texture, not information, and it obeys every rule above: render-only, deterministic,
hue-preserving, centred on the fill under the cap, and quieter than any authored step.

**Silt detail** is four terms shaded in the terrain's own fragment shader. Each is signed,
in [−1, 1]: a positive term darkens and a negative one lifts. The biome's strength says how
far either way it may move a pixel:

| Ground | Dunes | Ripples | Scours | Grain | Sum |
| --- | --- | --- | --- | --- | --- |
| Open Water | 0.25 | 0.07 | 0.05 | 0.03 | 0.40 |
| Kelp Forest | 0.18 | 0.04 | 0.10 | 0.06 | 0.38 |
| Thermal Vein | 0 | 0 | 0.16 | 0.10 | 0.26 |
| Abyssal Trench | 0.14 | 0 | 0.08 | 0.04 | 0.26 |
| Resonance Field | 0.18 | 0.04 | 0.08 | 0.06 | 0.36 |
| Coral Ruins | 0.10 | 0.05 | 0.08 | 0.08 | 0.31 |
| Rock | 0 | 0 | 0.12 | 0.10 | 0.22 |

The table is the ground's reading of its water. Loose silt drifts where the current runs,
so open water carries the most. Kelp baffles the current, and a vent field is broken
basalt with no silt to ripple. The trench is still water over pressure-eroded stone, swells
without ripples, and rock admits no water at all.

- **Never out-shading a step is structural.** No term exceeds 1, so a pixel loses at
  most its row's sum, an encoded-space gain like the bake's. No row may exceed **0.40**:
  a full-strength authored face darkens the fill to 0.58, and the detail at its worst holds
  0.60. The bound is a property of the table, which a test holds, not of a picture.
- **Why so near a face.** The ground sits near 20 of 255 at the home dolly. Capped at half
  a face, 0.21, the layer moved one pixel in ten by a single code value, and its texture
  read nothing; at 0.40 two pixels in five move and the dunes show. Darken-only, that was
  still two fifths of the target's liveliness, because the target's lit faces rise above
  the fill ([issue-1083](screenshots/issue-1083/README.md)). Signed terms give the same
  table twice the span, and the cap below bounds the lit half.
- **Centred, and capped.** Each term is centred on its own mean, measured off the lattice
  it reads, so a patch of silt averages at or under the fill. A dune's stoss is 70 % of its
  cycle, so a lit face as strong as the lee's shadow would tip the cycle bright: its lit side
  takes 0.44 of the strength, the most that keeps every cycle at or under the fill at any
  heading the meander gives it. A ripple is centred over its own 7 m, a scour on the
  lattice's share of hollow, and grain on the lattice's mean byte. The detail lifts the
  bake's pixel by at most 1.15 / 1.05 − 1, about 0.095, so with the bake's own 0.05 no pixel
  passes `TERRAIN_LIFT`'s 0.15 of its fill.
- **Dunes** run in crests 110 m apart across the current, meandering over 420 m. The lee
  face is the far 30 % of each dune, down-current. Each map's current comes from a point off
  its edge, and the crests are arcs about that point
  ([#1560](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1560)): a distance
  keeps the crests 110 m apart wherever they turn, so two plateaus never share a crest line
  and the lit-face bound below holds at every bearing. One crest line on every map read as
  corduroy, the only large regularity on an organic floor. They are hillshaded by the key light about
  flat ground: a face turned from it darkens by the whole strength, flat ground stays at
  the fill, and a face turned to it lifts by up to 0.44 of the strength, as far as the cap
  lets it. The dunes read by their lit faces as well as their shadows. A second field on
  the meander's 420 m lattice fades them in and out, down to a quarter of their strength.
- **The current's source**, in metres east and south of the map's north-west corner:

  | Map | East | South | The water |
  | --- | --- | --- | --- |
  | The Ventfront Divide | 4,000 | −2,500 | Over the north trench, fanning south across the divide |
  | Abyssal Rift Corridor | −2,500 | 3,000 | Off the west end, down the rift |
  | Kelp Labyrinth | 4,000 | −12,000 | Far north, nearly straight south |

  The Kelp Labyrinth's cold-shock currents cross in a saddle, south-east on one diagonal and
  south-west on the other ([hazards.md](hazards.md) §8), and no one source draws both. A far
  one keeps every lee within 60° of the current over each site, so the floor never says the
  water runs the other way. A map with no source of its own, every mission map today, takes
  one 60,000 m north of its centre: across 10 km of map its crests stay within 6° of
  east–west.
- **Ripples** lie 7 m apart, parallel to the dunes and settled in their troughs. A
  ripple's lee darkens, and the rest of its 7 m lifts by as much in sum. A ripple draws
  while it spans 8 pixels and is gone at 3. **Scours** are hollows on a 38 m field,
  drawn out 1.8 times longer along the current
  ([#1573](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1573)). They take
  one heading a map, the flow at its centre: a turn that varied across the map would shear
  the field, the further from its origin the more. So they run north–south on the
  Ventfront Divide and the Kelp Labyrinth, whose centres the current crosses heading south,
  and east–west down the Abyssal Rift Corridor.
  **Grain** runs at 3 m and 1.3 m, each octave whole from 6 pixels and gone at 3.
- **The layer fades with distance.** It is whole through 2 m a pixel and gone by 8, so the
  survey dolly sees the bake and the ink and nothing else: no second map grid.
- **Strength follows the cell.** One texel a cell, filtered between cell centres, as the
  bake's relief does. The amount of texture fades across a biome edge while the field
  stays one continuous function of position, so no authored rectangle prints on it.
- **The shader hashes nothing.** Its noise is a 128 × 128 lattice of hashed bytes in one
  page-lifetime texture, four fields to a fetch, read as value noise by shifting the
  coordinate by the smoothstep of its fraction. A sine hash keeps few bits at map
  coordinates in single precision and differs between GPUs; an integer hash cost the
  named GPU up to a millisecond a frame. Seven fetches a fragment, and the meander's slope
  comes from its screen derivatives rather than more of them.
- **Order.** It lands after the bake's colour, and before the veil, the survey ink and the
  fog: the veil drains the finished ground in display terms, and the ink goes over it. Ink
  lifts darker ground further, but the ladder already weighs ink over black, the fully
  drained veil, so darkening cannot break it. Ink lifts paler ground less, so the
  ladder's tests also weigh it over the palest fill lifted by the whole cap.
- **Cost.** No pass, draw call or triangle. One RGBA8 texture of one texel a cell, 4 KiB
  on a 32 × 32 map, and the 64 KiB noise lattice, once a page. GPU time is read on the
  named GPU (gate 6, [issue-1083](screenshots/issue-1083/README.md),
  [issue-1103](screenshots/issue-1103/README.md)).

**Seated stones.** The stone props stand sunk into the silt by a share of their own
height: `env-open-boulder` 0.3 (1.8 of its 6 m), `env-vent-basalt` 0.15 (1.2 of 8 m) and
`env-trench-slab` 0.3 (4.2 of 14 m). The share is never more than half, so the approved
silhouette still stands. The models do not change; their instances stand lower.

Each seated stone leaves a **scour** in the bake, on open ground only. Its radius is half
its footprint at its own scale. The ground darkens to 0.7 at and under the stone, a
shallower dip than a full face, and recovers by 2.2 radii up-current and across. The
scour runs 1.6 times further on the lee, down-current, away from the map's source,
where the current drops its silt
([#1573](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1573)). The room names
its map before it sends the ground, so the bake knows the source from its first frame. It stays inside its stone's own cell, faded to nothing over the last radius before
the edge, like an ember's glow. A ground delta's rebake of the touched cells and a ring
then redraws every scour it moved. Being in the bake, it costs nothing per frame, and fog,
veil and ink treat it as ground.

**Promoted on #1103.** The layer and the seated stones draw in every match, on the
standard surfaces only: Sorrowgate keeps its own mission surface
([visual-reboot.md](visual-reboot.md) §5). The owner took promotion with the lift above,
not without it: darken-only, the layer was one few players would notice, and
floor-following asks them to pick ground they can see. A development build opened with
`?seabed-detail=0` draws the ground without them, for an on/off pair; no shipped build can.
The switch is one predicate, `seabedDetailEnabled` in
`packages/frontend/src/game/seabedDetail.ts`.

### Reading the Water

The ground has a shape and now the water has a body. This section is the sibling of
"Reading the Sea Floor" above and deliberately reads like it, because it is the *same
rule* pointed at the other half of the frame: **depth is luminance**, applied to the
medium rather than to the floor of it. The two agree, so a far ridge and the water in
front of it are the same brightness family, and the horizon stops being an edge wherever
the far ground is as deep as the water drawn behind it. Far ground at another depth stays
darker or brighter than that water, and the edge left there is the depth, kept on purpose
([free-camera.md](free-camera.md) Phase 5).

At the High graphics quality the ramp's brightness stands and its one blue is released:
the water may wear the hue of the biome under it, in a token of its own, and light may
scatter in it ([Two layers, two laws](#two-layers-two-laws)). The reason given below for
one blue is answered rather than dropped. A hue that is the biome's reads as that biome's
base propagation factor, which is true, as the ground's hue does.

It exists because freeing the camera exposed that it did not ([free-camera.md](free-camera.md)
§9). A pinned 55° filled the frame with seabed; a camera at 12° spends most of the frame
looking through open water, and open water used to draw nothing at all — `scene.fog` was a
*distance* fog over geometry, so where there was no mesh there was only the clear colour.

Three terms, one table. `packages/frontend/src/game/water.ts` transcribes this section, and
its `WATER_RAMP` is the table — SPEC by reference, the way the biome relief's numbers live
in `seabed.ts`; the stops are TUNABLE, the shape is not.

- **The column is a ramp, and only a ramp.** Depth 0 to 3,000 m maps to one blue that
  changes brightness and never hue, because hue belongs to the biome and the biome is what
  the Echo Layer prices sound by — water that carried a hue could be read as a propagation
  factor. Three of its six stops are the column's own rather than an artist's: the **Lid**
  at 150 m is the brightest water a hull can loiter in, the **thermocline** at 1,200 m is
  where the ramp puts its knee because below the column's one physical boundary the light
  story is over, and **3,000 m** is `UI.background` exactly — the deep end of the new ramp
  is the flat colour the game already had. Nothing about the abyss changed. No line is
  drawn at the thermocline in the water: it is an inflection, not a boundary. The ground
  carries it as survey ink instead ([map-visuals.md](map-visuals.md) §4).
- **Distance fades into the water the thing is standing in.** The fog over geometry takes
  its colour from the *fragment's own depth*, so a trench and the shelf beside it are the
  same distance away and fade to different darknesses. That is the luminance rule governing
  the air between the camera and the ground as well as the ground itself. It deliberately
  does not read the camera's depth: the column is drawn at 0.22 world-metres per metre, so
  any dolly past a few hundred units lifts the eye clear of the surface and its height
  stops being a depth at all.
- **Where there is no geometry, the same water is drawn anyway.** One screen-filling pass
  unprojects each pixel to a world-space ray, and grades the ramp from the **focus** — the
  one depth in the frame that is the player's own statement and is always in water
  ([free-camera.md](free-camera.md) §4 clamps it to the column). Looking down darkens,
  looking up lightens, and both happen because the ray goes there rather than because the
  screen has a top and a bottom. That is why it is a world-ray shader and not a vertical
  screen gradient: a screen gradient would be an atmosphere pass that rotates with the
  projection, and §5 of [free-camera.md](free-camera.md) keeps that prohibition verbatim —
  the *player* may turn the camera, an *effect* may not.

Beside the three, **marine snow**: particulate in the near column, and the only one of the
four with structure to parallax, which is most of why a low shot feels like water rather
than like a gradient. It **sinks, and only sinks**. A lateral drift would be prettier and is
not available — a current is a real mechanic with an authored bearing published to the
client ([hazards.md](hazards.md)), so moving particulate sideways states a direction, and
would state the wrong one everywhere outside a current site. Falling states nothing, because
everything falls. It fills the column as a slab rather than a box, because 3,000 m of water
drawn at 0.22 is 660 world units thick against a map eight kilometres across. And it fades
out as the camera climbs out of the column, which is a gate-7 requirement before it is an
aesthetic one: at the home dolly the eye is nine kilometres of drawn column above the
seabed, and every mote up there lands in front of lit ground and brightens it. The reward
for going down into the water is that the water is there.

**Texture, not information**, under the same law as the seabed relief: the simulation never
reads any of it, no gameplay quantity derives from it, and nothing about it is state. The
water never brightens with activity, occupancy or anything a player could read as a signal.
The lamp halo is an own lamp's light, gated by its entity's live SIG and faded by extinction
alone, so the water itself still never brightens.

**The colour is absolute; the reach is relative.** A metre of depth is the same colour at
every zoom, so the luminance rule is never scaled or lied about. How far the medium reaches
follows the dolly, because the alternative fails gate 7: a true clear-water visibility of a
couple of kilometres makes the strategic dolly — which puts the eye twenty kilometres out —
a uniform black wash with the player's own base inside it, and a chart nobody can read is
not a view. So the reach breathes and the ramp does not. The falloff is exponential-squared,
which keeps the subject of the frame crisp (about 9% fog one dolly out) and dissolves it
from roughly three dollies.

It is one setting, `waterDensity` ([ui-ux.md](ui-ux.md) §11). Distance fog reduces contrast,
and §11 makes that a control rather than a preference — and it can be one without argument,
because the only things distance hides are the player's own hulls and the ground they stand
on, so turning it down can only ever reveal more. The ramp does not move with it.

**The arch study's distance grade.** On 29 October the owner licensed one exception, for the
Sorrowgate arch study's normal-view refinement
([sorrowgate-arch-study.md](sorrowgate-arch-study.md) §11) and nowhere else. Behind the
study's flag, on the prologue's look, public ground beyond the focus fades further into the
water it stands in. A fragment's range past the focus distance adds to the fog factor,
linearly up to 0.35 extra at a reach of 0.58 of the dolly, 1,500 m at the opening, so the
reach still breathes with the dolly and the ramp does not move. It takes the fade's colour from the fragment's depth, as above, so it carries no
hue. It reaches terrain and props only, never the landmark, a hull, contact, glow, lamp or
survey ink, so it still hides nothing but ground, and its extra is multiplied by
`waterDensity`, so 0 draws none.
Production keeps the falloff above until a written decision promotes it.

### Environmental Shapes

- Jagged rock formations
- Smooth pressure-eroded stone
- Coral ruins with geometric patterns
- Massive industrial structures anchored to the seabed

These shapes ship two ways, both under the texture-not-information law above. The
ground itself carries them as baked relief — a vent field reads as broken ground
because the detail field says so. Standing *on* the ground, they are **instanced
environment props**: real low-poly meshes (kelp clusters, vent chimneys, ruin
blocks, crags) from the environment branch of the pipeline of record
([graphics-standards.md](graphics-standards.md)), scattered deterministically from
the terrain grid the server already published. Props are dressing for what a cell
already declares — a kelp cluster stands only in kelp, a crag only against rock —
so they never *add* information, and they obey the same silence: desaturated,
darker than any contact, lit only within the world-light families. A public landmark
is the one prop a map places by name rather than by cell
([graphics-standards.md](graphics-standards.md#1-model-backed-or-deliberately-procedural--no-third-path)
gate 1), and it keeps the same silence. Its licensed lamp pools are the one exception,
held under the flight's own lamps
([style-neon-noir.md](style-neon-noir.md#the-arch-studys-licence)). Where kelp
slows and hides a hull ([environments.md](environments.md)), the props are what
the player sees; the cell grid stays what the simulation reads.

## Faction Art Styles

Each faction has a full visual identity sheet (silhouette language, materials, palette, FX, UI, environmental presence, doctrine) in [factions.md](factions.md). Reference palette:

| Faction | Shapes | Palette | Silhouette |
| --- | --- | --- | --- |
| Bathyarch Consortium | Boxy, riveted, over-engineered rectangles and cylinders | `#F2B233` hazard amber · `#8C8378` iron grey · `#3D2B1F` oxide brown · `#0E1418` hull black | Heavy, slow, angular — visibly patchworked repairs |
| Pelagia Commune | Organic, curved, asymmetric — leaves, seed-pods, swimming things | `#1FA67A` algae teal · `#8FE36B` bioluminescent green · `#E8F0A3` spore pale · `#0B241E` deep chlorophyll | Sleek, stealthy — bioluminescence pulses with unit health |
| Abyssal Directorate | Spiked, insectoid, chitinous — crustacean, segmented, many-limbed | `#7A1B2E` abyssal red · `#2D1B3D` bruise violet · `#0A0710` trench black · `#C2465E` biolight crimson | Grown yet disciplined — organic forms in rigid formation |
| Hadron Knights | Symmetrical, blade-like, crystalline — instruments and blades | `#8B5CF6` resonance violet · `#E6E9F2` alloy white · `#3B2E5A` shadow indigo · `#C9A6FF` crystal glow | Elite, precise, mirror-finish — the only faction with true bilateral symmetry |

This is the standard palette. Three substitutions ship beside it — deuteranopia, protanopia and tritanopia ([ui-ux.md](ui-ux.md) §11) — and their faction rows are tabled in [style-neon-noir.md](style-neon-noir.md). They replace hue only: the shape language, the silhouette law and the faction glyphs above are what identity actually rests on, which is why the hue is free to move.

## Concept Art — Pressure Cartography

Five survey plates establish the visual language: **the discipline of measuring things that resist measurement.** Two presentation plates extend it into the neon-noir register that governs key art and the command UI (see [style-neon-noir.md](style-neon-noir.md)).

| Plate | Subject |
| --- | --- |
| [I — Depth Strata](concept-art/plate-01-depth-strata.png) | Vertical cross-section, propagation field, the Mouth |
| [II — Four Powers](concept-art/plate-02-four-powers.png) | Shape language, palettes, silhouettes, signature doctrine |
| [III — The Echo Layer](concept-art/plate-03-echo-layer.png) | Resolution tiers and the cost of the ping |
| [IV — The Mouth](concept-art/plate-04-the-mouth.png) | Concentric banding, return anomaly, unresolved |
| [V — Submarine Classes](concept-art/plate-05-submarine-classes.png) | Neon-noir key art: hull line-up surfaced at night, magenta/cyan signage |
| [VI — Build Menu UI](concept-art/plate-06-build-menu-ui.jpg) | Neon-noir command panel mock: glass cards, magenta bevels, cyan headers |
| [VII — The Pelagion Rift](concept-art/plate-07-rift-chart.png) | Survey chart of the whole Rift: the Lid, the named places, the Mouth ([world-map.md](world-map.md)). SVG source alongside |

## Hull portraits — the roster photographed

The plates above are *drawn*. These are **rendered**: each approved hull model
photographed in the water its navy lives in, by
`node tools/hull-renders/render.mjs`, which writes into
[concept-art/renders/](concept-art/renders). One hull, a three-quarter hero
angle, a displaced seabed, the biome's own environment props, and the rig this
doc's [Lighting](#lighting) section and
[style-neon-noir.md](style-neon-noir.md) describe — key, faction rim, fill —
with no bloom of its own. Since
[#1015](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1015) the frame is the
conn view's: each material tone-maps itself, lamps and lit props add their glow after the
curve, and the lamp halo spreads the lamps' light.

Everything about a portrait is transcribed rather than invented. The dressing
is each navy's biome and licensed world light; the accent is its neon signal;
the lamps burn as the conn view draws a hull at its idle SIG, in the navy's glow ink at
the strength the model was approved at, held at gate 3's lamp core, and the halo
("Lamp halo — SPEC", "Hull portraits") spreads them as loud as that SIG is: a Cruiser at
SIG 55 carries one, and a Chorister at 16 none. What the renderer adds is the seabed and
the water, because a portrait needs a floor and a volume and neither is in the
model.

| Navy | Water | What the frame carries |
| --- | --- | --- |
| [Bathyarch Consortium](concept-art/renders/cruiser-bathyarch.png) | Thermal Vein | Sodium work-lamps over basalt, ember at a vent mouth |
| [Pelagia Commune](concept-art/renders/abyssal-submersible-pelagia.png) | Kelp Forest | Biolight seams in forty-metre kelp |
| [Abyssal Directorate](concept-art/renders/cruiser-directorate.png) | Abyssal Trench | Rows of crimson points, and no world light at all |
| [Hadron Knights](concept-art/renders/cruiser-hadron.png) | Resonance Field | Razor-thin violet on blade hulls, lit crystal underfoot |

These are presentation artifacts, not evidence. A model is approved by the
hull-intake bake and by `tools/hull-models/check.mjs`, both of which measure;
a portrait flatters, which is its job and its disqualification. Nothing in
[graphics-standards.md](graphics-standards.md) is settled by one.

## Unit Art Direction

3D concept models of the roster are generated from the prompt kit in
[asset-prompts-3d.md](asset-prompts-3d.md), which transcribes the silhouette and glow
law below into copy-paste prompts — change this doc first, then the kit.

### Rendering Target

The presentation target is **detailed sprite art** in the classic RTS mould — rendered
hulls with rim light, running lights, cavitation trails, and animated bases — not
abstract markers. The prototype's own-force rendering is now there in still form: units
*and* completed structures render as lit, textured sprites baked at load time. Anything
with an approved 3D model in `concept-art/models/` — unit or structure — bakes from
maps rendered offline from that model (mask, heightfield, and light placement are the
designed geometry's own — see `tools/hull-maps/`), recoloured per faction. Anything
without one falls back to a procedural stand-in: units to a pressure-hull heightfield
guessed from the outline and clad in the plating of
[Plate V — Submarine Classes](concept-art/plate-05-submarine-classes.png), structures
to slab-and-landmark architecture (the Bastion's dome, the Refinery's silo rank, the
Foundry's recessed launch bay, the turret's mount and barrel). Everything is lit per
pixel with rim light and glow marks in the faction's colours. Vector primitives remain in three deliberate places: the fallback while the art
decodes, every enemy contact the law below still caps at a flat silhouette — every tier
below Track, and a Track that has gone to ghost — and
**construction sites** — a half-built structure is schematic on purpose, and reads as
scaffolding until it is commissioned. Cavitation trails run behind the player's own
torpedoes in the conn view ("Own ordnance is geometry too", below), and behind the
player's own moving hulls (#1508). A hull sheds bubbles at its stern as it travels, five
metres apart at the closest zoom and wider as the far-zoom scale grows, and never more than
twelve alive at once, so a fast hull's bubbles spread out. Each stays where it was shed,
climbing and fading, so a turn leaves a curve.
The wake is its live SIG on gate 3's curve, full at the red stop of 65: long and bright for
a hull pushing hard, short and faint for one running silent, and none for a hull holding
still or with its engine cut. Reduced motion keeps the bubbles and stops their climb. It states how
loud the hull is and nothing more, so an enemy hull never has one: below Tier 4 it is
never geometry in the conn view, and a Tier-4 payload carries no SIG to size a wake by. Animated bases are still to come.

An own harvester working a node stirs a silt plume at its keel (#1512). It plumes while its
cargo rises between two own snapshots, which is the dredge biting, and its size is the
throttle's SIG against Overburden's: a harder dredge is louder, so its cloud is wider,
higher and denser. Each mote lifts straight up and settles back on the same line, so the
plume never drifts sideways ([map-visuals.md](map-visuals.md) §8). Silt wears no faction
glow: it is a dim sediment fleck. A struck dredge never plumes. Reduced motion draws each
dredging harvester one fixed cloud, sized by strength as the moving plume is, at constant
brightness.

### The Asymmetric Fidelity Law

Detail is something you *own*, never something you are shown. The player's base and
force render at full fidelity — lit, animated, alive. The enemy renders **only at the
fidelity their detection earned** — no more, and since #834, #1531 and #1539 no less: a
Tier-1 return is a smudge, a Tier-2 a blurred blob, a Tier-3 a classified disc, and a
Tier-4 track its own roster model in the conn view, a hull sailing as an own hull does and
a structure standing as an own structure does.
[systems-echo.md](systems-echo.md) §4 calls Tier 4 "full resolution: exact unit, health,
facing" and means it. The art side used to cap that tier at a flat silhouette, then at a
sprite in the overlay; both were one rule too many.

**The rule that stays is information safety.** The server attaches `kind` and `faction` no
earlier than Tier 3 and `heading` no earlier than Tier 4, so a renderer reaching for a hull
below Track has nothing real to reach for. The conn view's old cap was a *budget* instead:
gate 6 of [graphics-standards.md](graphics-standards.md) spends its draw calls on the own
force. A live track costs that budget its template's batch, one draw per material however
many tracks share it, and only while the Echo Layer holds it at four times threshold or a
ping. A cruising hull reaches that against a HYD-50 listener at 0.9 to 1.3 km, outside the
400 to 900 m weapon ranges, so the enemy you fight is a model before the first shot lands;
a hull running silent can close unresolved, which is the ambush the Echo Layer exists for.
A structure reaches Tier 4 the same way, and a refinery's sustained 55 to 75 SIG carries
it further than most hulls.

The model takes nothing a track did not earn. It sits where the last return put it and
moves only when the next one does, with no glide between them. Its lamps hold at their
intake-approved rest, because a Tier-4 payload carries no SIG and glow is loudness. It is
drawn at true metres, without the far-zoom readability factor that is ink about an own
entity, so the threat-red outline about it in the overlay matches its size. A structure
track stands unrotated on its depth, and always as the finished model: the payload carries
no build progress, so a site at Tier 4 shows the building it will be rather than the
scaffold it is.

**A track is a return, not a window.** It decays on the same twenty-second ghost clock
every other contact does, and the model is drawn only while the track is *live*: the
moment it ghosts it falls back to the outline, because a lit hull sitting on a
last-known position claims a present tense the Echo Layer never granted
([ui-ux.md](ui-ux.md) §4). The threat-red stroke stays around it for the reason it was
put there — a faction's livery can match the biome it is sitting in, and the edge is what
keeps a track readable when it does.

A fully-lit battlefield where both sides gleam would still be a lie the renderer tells
against the Echo Layer. What buys the enemy's gleam is a live Tier-4 track: four times threshold,
or a ping and the 2,400 m of self-reveal it costs. The contrast between the rich home base
and the black ocean past the sonar line is where the dread lives, and past the sonar line
is still black.

### Silhouette Rules

- Every faction must be recognizable at a glance
- Exaggerated shapes for readability
- RTS readability > realism
- Strong rim lighting

### Animation Style

- Sub movement: slow acceleration, cavitation trails
- Drones: quick darting motions
- Siege subs: heavy recoil animations
- Bio-units: pulsing, undulating movement

### FX Language

- **Pressure weapons:** shockwaves, distortion rings
- **Sonic disruptors:** vibrating air bubbles
- **Thermal lances:** molten particle beams
- **Organic torpedoes:** glowing spores

## Building & Base Art Direction

### Construction Style

- Modular pieces that snap together
- Pressure domes with visible reinforcement
- Pipes, ballast tanks, external wiring
- Faction-specific architecture language

### Base Identity

- Bathyarch: industrial rigs, cranes, mining drills
- Pelagia: coral towers, algae farms, bio-reactors
- Abyssal: trench fortresses, chitin walls
- Hadron: magnetic pylons, resonance towers

## UI Direction

The interface register is **neon-noir** — tokens, glow rules, and the panel
anatomy live in [style-neon-noir.md](style-neon-noir.md), which is the source
of every chrome colour in the frontend.

### Style

- Transparent glass panels
- Soft blue holographic overlays
- Pressure gauge motifs
- Sonar-inspired minimap

### HUD Layout

Classic command layout, three bands:

- **Top bar** — stockpiles and the SIG meter, always visible. Resources read left to
  right; the player's own loudness is a first-class resource and sits beside them.
- **Bottom left** — the sonar scope (minimap). It renders *only what the player has
  earned*: own units and structures at full clarity, contacts at tier fidelity,
  nodule fields as chart data. Terrain is chart data too. Clicking it moves the camera.
- **Bottom centre** — the command panel, tabbed (Build / Units; later Upgrades and
  Special Abilities). Buttons carry cost and dim when unaffordable.
- **Bottom right** — the selected-entity panel: name, hull, SIG, and state (silent
  running, throttle, cargo, production queue), with the unit's command buttons.

On a narrow window the same bands compress: the scope shrinks, the info panel folds to a
status line, and the command panel keeps its full-size targets ([ui-ux.md](ui-ux.md) §11).

### Fonts

- Angular industrial font for Bathyarch
- Soft rounded font for Pelagia
- Sharp serif font for Hadron
- Blocky military font for Abyssal

### UI FX

- Sonar pings
- Pressure warnings
- Cavitation distortion on damage

A hit on the player's own hull or structure (#1510) flashes that hull's lamps and throws a
short spray from it: bubbles in the faction glow climbing, pale hull fragments sinking.
Both scale with the share of hull the blow took, full at a fifth. The flash lifts gate 3's
lamp factor for about a third of a second, to twice its ceiling at full, since a hull under
fire is usually loud and already at the ceiling; the spray lives 1.2 s. The
trigger is the server's `Damaged` self-event, and the size is the difference of two own
snapshots, so nothing unresolved is drawn. Reduced motion keeps the flash and drops the
spray.

A live Tier-4 track whose hp falls between two readings (#1517) takes the same hit on the
chart, beside its sprite: a pale flash swelling as it fades and the same spray, bubbles in
the contact's colour and pale fragments, at the size the same blow on an own hull would
be. The player already reads that hp on the track's bar, so it reveals nothing. It fires
only between two live Tier-4 readings of one handle, never across a tier change or after
a ghost, and a ghost draws none. It stays on the chart even where the conn view draws
the track's model, since the blow is read from the bar the chart draws. Reduced motion
keeps the flash.

An own gun firing (#1511) throws a short flash from the hull or turret down the bearing it
fired on, white-hot cooling into the faction glow over about a third of a second, and a pressure
ring spreading flat from the muzzle for three quarters of one. A siege hull, the Furnace's
cutter and the Tocsin's bell, also kicks astern of that bearing by 12% of its drawn
half-length in 70 ms and settles over 650 ms: the "heavy recoil" above. The trigger is the
server's `Fired` self-event, which only the gun's owner receives. Its bearing points at the
point the owner was shown of the target, the spot a torpedo is aimed at
([systems-combat.md](systems-combat.md) §7), and only at Bearing or better. Below Bearing a
gun can be firing at a smudge or a ghost, so the event carries no bearing: a hull's flash
leaves along its own heading, and a turret's flashes all round with nothing to kick. Reduced
motion keeps the flash and drops the ring and the recoil.

### Echo Layer Requirements

The Echo Layer (see [systems-echo.md](systems-echo.md)) only works if it's readable at a glance:

- The minimap is a **sonar scope**, not a map — contacts render as returns with tier-appropriate fidelity
- The player's own Acoustic Signature is a permanent HUD element: a horizontal meter, always visible, colour-shifting amber → red
- Detection radius renders as a soft ring on the terrain — selected hulls, and loud ones,
  merged into one envelope where their reach overlaps
- Ping cost is previewed before commit — hovering the ping button shows the 2,400 m reveal radius in threat-red
- Audio mix is the primary channel: a Tier-1 contact should be *heard* before it is *seen* on the minimap

## Camera & Projection

This section is SPEC: `packages/frontend/src/game/PerspectiveView.ts` transcribes it. The
lineage is the classic-RTS oblique camera — Command & Conquer's ~45° dimetric sprites,
Warcraft III's ~55° locked 3D pitch — and since the August 2026 presentation revision
([three-layer-ocean.md](three-layer-ocean.md)) *Echoes* ships that camera itself: the
world is a perspective view over a sculpted, visible seabed, and the chart survives as
the instrument layer drawn over it.

### The conn view: a freely aimed perspective camera — SPEC

The world renders in perspective through a 40° vertical field of view, from a rig that is
a **focus point anywhere in the water column**, a yaw, a pitch and a dolly distance. Pan
slides the focus across the plan, a left + right drag or `Shift` + wheel raises and sinks it
through the column, where a click into open water then lands ([ui-ux.md](ui-ux.md) §9),
orbit turns and tilts the camera about it, and zoom dollies about the cursor. One camera
serves both canvases — the GL world and the Pixi mark layer project through it
(`EchoRenderer.setConn`) — so the two painters cannot disagree about where the water is.

**55° below horizontal, yaw to north, focus on the seabed is the *home* frame**, not the
only one: it is what every match opens on, what the Phase-1 screenshot comparison settled
against 45° and 62°, and what the `Home` key restores in a single press. Yaw is free and
continuous; pitch is free within **10°–88°**; the focus clamps to the water column and the
eye clamps to **25 m of water** (TUNABLE) above the local floor, because a camera under
the seabed renders the inside of the terrain shell. Nothing else is clamped — the player
looking at a thing is not the player committing a hull to it, so none of the column's
costs are the camera's to pay.

The freedom is [free-camera.md](free-camera.md), which is also where the rule it replaced
— "no camera rotation, ever" — is retired with the account of where each of its four
protections went.

The projection change moved the old plan-view protections; it did not drop them:

- **Range rings stay honest by conforming, not by flattening.** This game is played in
  range rings — the 2,400 m ping reveal, detection radii — quoted as concrete metre
  figures the player reasons with. Rings are projected vertex by vertex onto the terrain
  and lie on it like paint, drawn through the same camera that draws the ground: equal
  metres read as the same water, even where the seabed climbs. A screen-space ellipse
  approximating the ring would be the lie the old plan view existed to prevent.
- **Symbols billboard; measurements conform.** Contact marks, bars, glyphs and selection
  rings face the screen and scale with the local pixels-per-metre — they are statements
  about the interface. Rings, hazard sites, residue stains and blocked ground lie on the
  terrain — they are statements about the water. The split is deliberate and load-bearing.
- **Depth is drawn, not implied.** Own hulls render at true depth with a plumb line and
  ground shadow; a hull's height above its own shadow *is* its depth. Verticality keeps
  its luminance-and-fog language ("Reading the Sea Floor" above); the tilt supports it
  rather than competing with it. One look is the exception, at the owner's call (#1772):
  the development-only free-water study hangs no hull, structure, shot or track on a
  plumb and keeps their shadows, and its command plane's foot rings and section scope
  carry the depth there
  ([free-water-slice.md](free-water-slice.md) §9, "Vertical command").
- **A structure stands on its depth.** A hull is a point in the water and hangs by its
  centre. A structure is built up from a footing: its model's ground, the y 0 it was
  authored standing on, sits at the depth it was built at, 600 m of Mid-Water, and the
  model rises from there; where the seabed is higher, it stands on the seabed. An anchor, a
  root or a slab authored under that line grips the floor wherever the floor meets it.
  Hung by its centre, a 133 m Refinery reached some 300 m of drawn depth under that point,
  because the view draws depth at 0.22 and models true, and on any floor shallower than
  about 900 m its lower half was underground (#955). The plumb runs from the footing to the
  seabed.
- **An unearned depth is drawn as a column, not as a height.** Below Tier 3 the server
  sends no depth at all, and a projection that picks one — even a stable, deliberately
  arbitrary one — draws a precision the tier never carried. So a contact with no earned
  depth is a soft vertical presence spanning the water it could be standing in at that
  plan position, Lid to seabed: nested ribbons, no taper, no hairline, the widest of them
  exactly the tier's own uncertainty radius. The screen says "somewhere in this water",
  which is what the Echo Layer said. Deep water therefore draws a *taller* claim than
  shallow, because it is one. The whole column is the click target, per the aim rule
  below.
- **What you click is what the simulation collides.** Selection and orders are resolved
  in screen space against drawn positions, through the same projection, with the old
  world-metre reach radii scaled to the local pixels-per-metre.

### Dimensionality is the roster models, lit by the law

Own hulls and structures render as the approved roster models
([asset-prompts-3d.md](asset-prompts-3d.md), hull-intake canonicalisation), lit by the
same rig the sprite bake transcribed: cold ambient, low oblique key, hard cyan rim. The
plan-view sprite bake (`packages/frontend/src/game/bake.ts`) survives as the loading
fallback and the sonar scope's language. Glow is loudness (gate 3): the model lamps swing
with live SIG, so a hull running silent goes dark instead of translucent. An enemy hull or
structure renders as a model only as a live Tier-4 track, under the Asymmetric Fidelity
Law above; below Track it never does, whatever the camera.

### Own ordnance is geometry too

The player's own torpedoes, mines, noisemakers and depth charges render in the conn view
as small instanced meshes (`packages/frontend/src/game/ordnanceLayer.ts`): a spindle with
a cavitation trail climbing behind it, a faceted mine, a lit canister, a falling can —
each on the plumb line and ground shadow every own entity carries, so a torpedo's depth
reads exactly as a hull's does. They are the player's own information, sent in full
(`OwnOrdnance`), so drawing them leaks nothing; the enemy's torpedo stays a contact,
resolved by the Echo Layer and drawn by the chart at the tier it earned. Glow encodes
loudness here as on a hull (gate 3): each lamp burns at the faction glow scaled by live
SIG on the spec curve, normalised to the noisemaker's 70 — a running torpedo (60) burns, a
noisemaker outshines it for its eight seconds, and an armed mine (2) is the near-black
[systems-combat.md](systems-combat.md) §6 describes, a listener rather than an emitter.
The chart annotates each shot in the own voice — a ring whose arc is the run a torpedo
has left, a diamond for a mine, a breathing ring for a noisemaker, a down-pointing tick
for a depth charge — and the scope carries an own-force dot for every one. A launch, the
loudest moment of a shot's life, throws a short burst of bubbles where the torpedo first
appears; they climb straight up and fade within a second and a half, and reduced motion
skips them.

### Far-zoom readability scale — SPEC

Hulls are 60–130 m long and the ground is kilometres wide, so a fleet drawn at true metre
scale is a scatter of specks the moment the dolly pulls back to survey distance. Gate 7 in
[graphics-standards.md](graphics-standards.md) judges readability *at every zoom the camera
allows*, and true scale fails it there. The answer is WC3's: **as the camera pulls back,
the fleet is drawn larger than the ground it stands on.**

One factor for the whole view, taken from the dolly distance alone:

```text
pxPerM = viewHeightPx / 2 / (tan(FOV / 2) · dollyDistanceM)
scale  = clamp(FLOOR_PX / (REFERENCE_HULL_M · pxPerM), 1, MAX_SCALE)
```

`REFERENCE_HULL_M` is the shortest hull **a yard builds**, derived from the unit table
rather than written down a second time — today the Chorister's 50 m. The exclusion is the
carrier wave's craft ([units.md](units.md), "The craft"): a Runner is 14 m, and measuring
the floor against it would hold the *whole fleet* at 1.5× true scale from a 700 m dolly
outward, trading away the "1 means true scale" promise below for the sake of a hull nobody
commands. A craft is drawn beside its carrier and read as part of it, which is what makes
that trade a bad one and not merely an expensive one. `FLOOR_PX` (**TUNABLE**, 26)
is the drawn length below which that hull stops reading as a silhouette; `MAX_SCALE`
(**TUNABLE**, 4) is where exaggeration stops, because a fleet drawn past it stops being a
fleet on a map and becomes a row of icons overlapping each other. On a 900 px-tall
viewport the factor leaves 1 at roughly a 2,850 m dolly and reaches the cap at 11,400 m.

What the rule is careful about:

- **At close zoom the factor is exactly 1.** Hulls, structures and terrain agree metre for
  metre, which is what the Phase-2 canonicalisation
  ([three-layer-ocean.md](three-layer-ocean.md)) exists to guarantee. The curve is clamped,
  not blended, so "1 means true scale" stays a fact rather than an approximation.
- **One factor, so proportion survives.** Hulls and structures take the same number. A
  per-hull pixel floor would grow a scout more than a cruiser and converge the roster on
  one apparent size at survey zoom — losing class-at-a-glance, which is the readability
  this rule exists to buy.
- **It is texture, not information.** The simulation, collision, range rings and aim reach
  never read it: a 2,400 m ring is still 2,400 m of water, and selection keeps its own
  140 m reach under an 18 px floor. The numbers are chosen together — wherever the scale is
  active the reference hull is pinned at 26 px, which is 13 px of half-hull, inside that
  floor — so a hull is never drawn larger than it can be clicked, and aim never has to know
  the scale exists.
- **Depth stays honest.** The plumb line is never scaled: its length *is* the hull's depth,
  and the hull's centre does not move, nor a structure's footing: a structure grows up from
  it. The ground shadow scales with the hull, because a
  shadow that stayed true-scale under an exaggerated hull would read as the wrong depth.
  Instrument ink drawn *about* a hull — selection ring, loudness ring, bars — scales with
  it, for the same reason a caption tracks its figure.

### Orbit, pitch and zoom — SPEC

- **The camera is freely aimed, and always one key from home.** Yaw and pitch are the
  player's, within the band above. What the old no-rotation rule protected is re-homed
  rather than dropped ([free-camera.md](free-camera.md) §5): the sonar scope stays
  north-up and its camera box — the view's true ground footprint, a trapezoid — rotates
  with the camera, so the instrument that always agreed with the viewport about north now
  *reports* the heading, with its far edge drawn heavier to say which way that is. `Home`
  restores north, 55° and the seabed in one press, which is the frame the old rule made
  permanent.
- **Zoom about the cursor** (wheel), taken from WC3 rather than C&C. The dolly
  band is TUNABLE and lives in `PerspectiveView.ts`; whatever the band, every gate in
  [graphics-standards.md](graphics-standards.md) is judged "at every zoom the camera
  allows" — and now at every **angle** it allows, which is the honest price of the
  freedom. UI scale is a separate control and never touches the world camera
  ([ui-ux.md](ui-ux.md) §11).
- **An atmosphere pass still may not rotate the projection.** The distinction is now
  load-bearing rather than incidental: the *player* may turn the camera, an *effect* may
  not. Sway stays translation only.
- **A mission's border is a fade in the world, not a vignette on the screen.** In the
  continuous-world pilot the exterior of the mission rectangle falls to darkness by plan
  distance — a smoothstep over 2,000 m, corners rounded, exactly 1 inside — whatever the eye
  is doing, and replaces the skirt there. The rim line stays, as chart ink. The HUD, own
  hulls, resolved contacts and survey cues never fade. [world-map.md](world-map.md) §7.4 owns the curve.

### Atmosphere rides on top, in screen space

The submarine feel — slight vignette, slow camera sway, fog layers for parallax, the ≤1 px
chromatic split at frame edges ([style-neon-noir.md](style-neon-noir.md)) — rides on top
of the world. The vignette and the split are post-work composited over it, in screen
space. The sway is the exception: it translates the shared camera rather than the
picture, because a picture shifted under the glass would need a second projection for
every mark drawn on it ([graphics-standards.md](graphics-standards.md) gate 8). Sway is
translation only. None of these effects may tilt, shear or rotate the projection: the
moment an atmosphere pass bends a range ring, it has crossed from mood into
misinformation.

The vignette and the sway are built
([#1003](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1003)), and neither is
a pass. The **vignette** is a radial gradient toward `abyss-void` on the conn view's host,
which the browser composites over the world canvas and under the HUD glass: clear inside
55% of the way to the corners, about 14% abyss at the middle of each edge, 40% at the
corners. It costs the conn view no draw call and sits outside its tone mapping, and the
HUD and every contact mark stay outside it by layer order. It does dim an own lamp near
the frame's edge: at 1440×900, by up to 35% in the top corners just under the resource
bar, and 22% in the bottom ones just above the command strip. Gate 3 holds as it does
through the water's fade with range: everything at one place on screen dims alike, so
lamps keep their order there, and the loudness collar on the glass keeps the reading
([ui-ux.md](ui-ux.md) §3.5). The **sway** moves the one camera after it is aimed, along
the camera's own right and up axes, so it can only translate: a heave of 0.3% of the
frame's height at the focus over 11 s, and a drift of 0.2% over 17 s. The overlay projects
through that camera, so a ring rides with the water it measures and a click resolves
through the camera the frame was drawn with. So the overlay re-projects on every frame of
the sway: its static layers key on a revision that bumps whenever the applied camera or the
viewport changes, and a swaying camera changes every frame. A heave that would dip the eye
under its clearance is lifted straight up, not re-aimed. Reduced motion holds the sway at
rest, because it carries nothing ([ui-ux.md](ui-ux.md) §11), and so does the
development-only Dream Loop study, whose ground cover rebuilds whenever the view moves. A
camera held still keeps its revision, so a frame that moves nothing leaves the overlay's
static layers alone ([#1032](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1032)).
Both are TUNABLE: `packages/frontend/src/game/cameraSway.ts` holds the sway's numbers, and
the conn view's stylesheet holds the vignette's.

The **chromatic split** is the one of the three that is a pass
([#1003](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1003)). Near the frame's
rim the picture comes apart into two images at most a pixel apart: a magenta one pushed
outward from the frame's centre and a cyan one pulled in toward it. So a bright edge near the
rim takes a magenta fringe on its outer side and a cyan one on its inner side
([style-neon-noir.md](style-neon-noir.md), "Camera"). It needs the drawn frame as a
texture, so it runs after the canvas render and the lamp halo, inside the same GPU-timer
bracket, in two steps and with no composer:

1. **Copy.** One framebuffer blit copies the canvas colour, its 4× samples resolved, into an
   8-bit target the size of the drawing buffer. The canvas is already tone-mapped and
   encoded, so the copy is the frame as drawn, and nothing in the canvas pass moves.
2. **Split.** One full-screen draw reads the copy and writes onto the canvas. Red comes from
   the magenta image, green from the cyan, and blue from the brighter of the two. A flat
   colour is unchanged; only an edge splits.

Nothing splits inside the vignette's clear ellipse, 55% of the way to the corners: the draw
discards those pixels, so the middle of the frame keeps its samples untouched. Past it the
two images separate linearly with the distance, to **1 drawing-buffer pixel at the
corners** and 0.35 px at the middle of each edge, each image moving half of that along the
ray from the frame's centre. The bound is a drawing-buffer pixel at every pixel ratio, so
at 1.5 the split is two-thirds of a CSS pixel. It moves no colour across the frame, only
along that ray, and it adds light in one place: blue from the brighter image widens a bright
edge's blue by up to the separation.

It reaches only the world canvas. The HUD and every contact mark are on the glass above,
outside it by layer order, as they are outside the vignette. What the world canvas draws
splits with it, by at most that pixel: the ground, hulls, lamps and the halo, and the map
furniture drawn on the ground, such as the rim and the tunnel routes. The full-screen draw writes
clip-space positions itself and never reads the conn camera, so it tilts, shears and
rotates nothing (gate 8). It does not move, so reduced motion leaves it on. It is on
wherever its check passes: an 8-bit target the canvas can blit into, complete, and a copy
that raises no error. A display that fails it draws the frame without the split. A lost
context drops the target and a restored one re-runs the check. There is no player setting:
the owner decided on 4 October 2026 that a pixel at the corners needs none. A development
switch turns it off for captures. A hull portrait does not take it either, since the
portraits draw the halo through their own harness and the split belongs to the conn
view's world canvas. Both numbers are TUNABLE, in `packages/frontend/src/game/chromaticSplit.ts`,
and the separation may only fall: 1 px is style-neon-noir's bound. Gate 6 allocates the
copy and the draw ([graphics-standards.md](graphics-standards.md), "Chromatic split").

## Atmosphere & Mood

### Key Mood Words

Claustrophobic, industrial, oppressive, bioluminescent, cold, metallic, alien.

### Camera & Composition

The projection itself is SPEC — see [Camera & Projection](#camera--projection) above.
Within it:

- Slight vignette to simulate depth
- Slow camera sway (submarine feel) — translation only, per the projection rules
- A barely visible magenta/cyan split, at most 1 px, at the frame's edges — see
  [Atmosphere rides on top](#atmosphere-rides-on-top-in-screen-space)
- The water itself is a rendered medium rather than a parallax layer — see
  [Reading the Water](#reading-the-water) above, which is where the old "fog layers for
  parallax depth" line went and why it is not a *layer*

## Cutscene & Narrative Art Direction

### Style

- 2D animated panels with parallax
- Heavy shadows
- Minimal color
- Strong silhouettes

### Mood

- Political tension
- Resource scarcity
- Environmental collapse
- Faction propaganda

## Related

- [three-layer-ocean.md](three-layer-ocean.md) — the presentation revision the camera spec above transcribes, phase by phase
- [free-camera.md](free-camera.md) — the revision that freed that camera's yaw, pitch and focus, and retired the no-rotation rule
- [graphics-standards.md](graphics-standards.md) — the acceptance bar that enforces this direction
- [factions.md](factions.md) — full faction visual identity sheets
- [style-neon-noir.md](style-neon-noir.md) — presentation-layer palette tokens and glow rules
- [asset-prompts-3d.md](asset-prompts-3d.md) — prompt kit that transcribes this doc for 3D model generation
- [ui-ux.md](ui-ux.md) — the Echo Layer HUD this direction serves
- [habitats-art-brief.md](habitats-art-brief.md) — the inhabited places as art briefs: what is beautiful about each, and how it appears inside these rules
- [map-visuals.md](map-visuals.md) — the map revision: survey ink on the seabed, the loudness ladder every layer sits on, and stipple life in the water
