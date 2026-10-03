# Echoes of the Abyss — Art Direction Guide

*(Industrial, claustrophobic, pressure-scarred — but fully original. Dieselpunk meets abyssal sci-fi.)*

## Visual Identity Overview

The art direction should communicate three things instantly:

1. **Depth** — crushing pressure, darkness, bioluminescent life
2. **Industry** — welded steel, pipes, ballast tanks, cavitation scars
3. **Conflict** — factions with distinct philosophies expressed visually

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
with their trails. The loudness ladder measures its rungs in encoded luminance
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

*Built for [#1001](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1001) and
switched off.* The Lamp halos toggle in Settings turns it on for a player, and a development
switch for captures; it turns on by default only after its reading on the named GPU
([graphics-standards.md](graphics-standards.md) gate 6) and the owner's approval of its
frames.

The lamp halo is the soft light a loud own lamp spreads into the water around it. It
carries one fact: how loud that hull or structure is now. It carries the part of that fact
gate 3's lamp core cannot show. A lamp held at white along its hue has no headroom left, so
a ping or a firing burst loses 66–83 % of a unit's lamp light to that white
([issue-1001](screenshots/issue-1001/README.md), "Halo readings"). The halo is where that
flare reads.

It is a second reading of loudness, never the first. With the halo off, the lamp core and
the loudness collar ([ui-ux.md](ui-ux.md) §3.5) carry every loudness fact, so turning it off
withholds nothing. It is drawn only for the player's own force, from the live SIG the client
already holds. It is not "bloom", which in this world is a Commune word
([glossary.md](glossary.md)), and nothing in it thresholds the frame.

**Route.** The canvas pass is drawn exactly as the SPEC above describes: per-material ACES,
glow after the curve, the unlit layers, encoded blending and 4× MSAA. Then, inside the same
GPU-timer bracket, four steps run, and nothing else is drawn:

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
development-only Dream Loop study is on, which has lamp halos of its own.

**What feeds it.** Only own hull and structure lamps whose model is showing feed the
source, one splat per lamp site: one connected bulb or strip of an emissive material, the
split `lampScreen.ts` already reads. Nothing else can write into the source, which excludes
ordnance lamps, sprite-fallback and still-loading hulls, construction sites, environment
props and every world light, fauna, contacts and the HUD. Because the source holds lamp
sites and nothing else, no brightness threshold is involved, and a reflected highlight has
no way in.

**Energy.** Each entity's halo is given one energy, set by its live SIG and nothing else:

```text
Q = Ā · w(SIG) · e^((SIG − 35) / 14) · drawScale²
```

w is the gate below. e^((SIG − 35)/14) is gate 3's E(SIG), normalised to 1 at SIG 35.
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
SIG 0–15 holds by construction, over every input. Above 35 the halo rides the curve
uncapped, with SIG taken between 0 and 100: a ping's SIG 95 carries 73 times a SIG-35
entity's energy, though `GLOW_FACTOR_MAX` stops the lamp itself at 6. A hull whose live SIG
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
ratio 1 that is the nine-tap kernel #1001 timed. Each level blurs the one before it, so the
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
a ping reaches the ceiling, out to about 20 px, with its faint edge at about 30 px.

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

- **Loudness order.** At Ventfront's opening, each entity's on-minus-off light is ordered by
  live SIG: Caisson > Harvester (40, working) > Bastion > Foundry, and nothing from the Light
  Scout. No own entity at live SIG 0–15 contributes a splat, over every input.
- **Ping.** A ping at least doubles the area a hull's halo lifts past 10 % luma, for any hull
  resting at SIG 64 or under.
- **The lamp.** Lamp pixels are unchanged with the halo on, within 1/255 on at least 99 % of
  them, at every station. A lamp behind a ridge at the low (12°) camera adds nothing.
- **Darkness.** The conn canvas keeps at least 95 % of its pixels under 10 % encoded luma,
  and loses no more than 1.5 points against the halo-off frame, at every capture camera on
  both maps and both ratios. The frame with the HUD is reported beside it; the HUD already
  holds that frame at 62–83 %.
- **Flash.** One hull's ping changes no more than 0.6 % of the frame and 5.5 % of any
  third-by-third window at the close camera, counted by WCAG 2.3.1's pair: the 2× bound
  #1001 read. One hull changes state at most once every 3 s.
- **The collar.** The loudness collar draws above the conn canvas and is never covered. At
  rest its core keeps at least 3:1 contrast against the halo-on pixels beside it, at the
  home and close cameras; at a ping it keeps 3:1 on at least 90 % of its track.
- **Cost.** It spends only what gate 6 allocates.

**Off, and when it is unavailable.** "Lamp halos" is a toggle in Settings
([ui-ux.md](ui-ux.md) §14). Off, no halo pass runs and no halo target is
held, so the frame is the canvas pass alone. Reduced motion keeps the halo, because its
flare is a change of state and the state is the message. The halo turns itself off for a
view only when that view fails its capability check, run when the halo turns on and after a
context restore: a renderable half-float colour target, framebuffer-complete with its depth
texture; a canvas stencil buffer; a depth copy that blits without error; and a known clear
read back from the half-float target. On a failure the stored choice is kept, Settings says
"Not available on this display", and the probe gives the reason. A software rasteriser is
not a reason, since half-float targets render under SwiftShader.

**What it is not.** It is not world light: the world-light families keep "no halo recipe"
([style-neon-noir.md](style-neon-noir.md)). It is not an interface glow: the glow recipe's
two-layer cap binds interface elements, and the collar keeps its two layers. It reveals
nothing the client did not already resolve, because it reads only own entities and their
live SIG.

**Where the numbers live.** The gate's 15 and 35 are SPEC, from gate 3, beside
`SIG_GLOW_EFOLD` in `glow.ts`. The rest are TUNABLE, in the halo's own module: the 20 m²
energy, the ceiling and the toe, the 1.69-tap kernel and the 0.6/0.3/0.1 weights, the 0.6 px
floor, the 2 m bias, the 1,024 cap and the build default. All are frontend-only, because no
other package reads them. The reach is derived from the chain and stored nowhere.

**Hull portraits** take this halo rather than a bloom of their own. Once the default turns
on, `tools/hull-renders/scene.html` draws the game's frame and runs this pass at each hull's
idle SIG, with its three widths multiplied by the hull's drawn length in the portrait over
its drawn length at the close camera, so a portrait shows the close camera's halo magnified
with the hull. The 20 portraits are re-rendered once
([#1015](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1015)).

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
  exactly three families ([style-neon-noir.md](style-neon-noir.md) "World light"); a moving
  light pattern on the ground would be a fourth family and area glow at once.
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
holds a model to. Which model is baked next is a call per model, not a switch: each costs a
third of a megabyte raw and thirteen seconds in the round trip, and a hull drawn at 60 m has
less for a map to say than a 440 m dome.

#### UV layout and trim sheets — SPEC

*For [#1005](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1005), row 6 of the
audit below: a UV layout the kit writes, a sheet the kit draws, and the first hull on it.*

**UV0 is laid out by the script that builds the model, in metres.** Until this, UV0 on a
part said only that it merges (kit.mjs `uvAlike`): a three constructor carried its own 0..1
parameterisation, an extruded plate its outline's metres, a sweep zeros, and nothing sampled
any of them. A model opts in by one argument to its export (`tools/hull-models/kit.mjs`
`exportGlb`'s `trim`, a navy's table such as `factions/bathyarch.mjs` `TRIM`), and
`tools/hull-models/trim.mjs` lays every part at export, before the occlusion bake lays
`uv1`: each triangle on the world plane its face is most along, plates running along the
part's longer in-plane extent from the part's own edge at one wrap of the sheet per
**24 m**, and the shorter extent spread over one of four bands of **1, 2, 4 or 8** strakes,
the band whose strakes come nearest **6 m** over it — a 60 m deck gets eight of 7.5 m, a 14 m
flank two of 7, a rivet one. A round part (a cylinder, lathe, sphere, torus or capsule, by
its geometry's type) is unrolled instead, whole 12 m plates round its girth, so the unroll's
seam falls on a plate seam along the even strakes and mid-plate along the staggered ones,
and its caps laid flat. No vertex moves: a vertex whose corners disagree
is split, as the occlusion bake splits a chart's edge, so `diff.mjs` reads the file as
unchanged and `check.mjs` compares the layout to 1/4,096 of the sheet.

**The sheet is the navy's, drawn not painted, and carries luminance only.** `drawTrimSheet`
rasterises the four bands from the navy's numbers — two plates a wrap with half a plate of
stagger on alternate strakes, a seam at **0.45** of the plate's light over 1.5 texels with 6
of weathering beside it, a 0.08 patchwork between plates from an integer hash, a 0.015
grain — so it is reproduced wherever the script runs and compared texel by texel. One sheet
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
navy on (`CLADDING_CEILING`): the Consortium's reads a mean of **0.88** in linear light, so
the Bulwark lands an eighth under it. Sorrowgate's triplanar surfaces
([visual-reboot.md](visual-reboot.md)) are kept: the laminate multiplies `diffuseColor`
after three's `map_fragment`, so a Commune hull in the tutorial wears both, the sheet under
the laminate, and `packages/frontend/test/trimSheet.test.ts` holds the chain.

Embedding the sheet in each file was the first cut and the owner's call to reverse: 31 KB a
model that gzip cannot shrink, 2.9 MB over the 94 navy models were every navy given a sheet,
and a re-export of every model on a sheet whenever one of its numbers moved. Apart from the file,
a navy's look is one PNG and one table, and a model's part of it is a layout and a name.

Unlike the occlusion map, the sheet reaches the chart: the sprite bake hands intake's albedo
pass the navy's sheet (`hull-intake` `bake.mjs --trim`, which `tools/hull-maps/build.mjs`
passes for a model named for a navy with one), so the Bulwark's baked sprite carries the
same luminance detail at 4 px/m, which is gate 4 applied — the bake takes the albedo's
luminance and recolours it — and its height and emissive maps are byte for byte what they
were. The lit table (`tools/hull-renders/inspect.mjs`) and the portraits show the bare file,
since neither attaches a sheet yet.

The first hull is the Bulwark, the owner's choice where the issue asked for one hull, taken
in the open in the pull request's Options: the hull #540 opened with, a slab with three tiers
and patchworked flank plates, riveted plate its brief, and the roster's most flat plate.
Its 162 parts lay 2,116 faces flat and 436 unrolled — 2,076 on the one-strake band, 244 on
two, 76 on four, 156 on eight — and split 80 vertices. `bulwark-bathyarch.glb` goes from
324,608 to **331,428 bytes**: 2,560 the split vertices and the rest the glTF JSON naming
them and the tags; the library goes from 19,738,720 to **19,745,540 raw bytes** and from
2,564,136 to **2,567,479 gzipped**. The Consortium's sheet is **31,159 bytes** once, in the
client's assets, and on the GPU three uploads it as RGBA8 with mipmaps, 1.33 MiB a navy
present at 512², the line gate 6 holds the occlusion map to per model. Which hull is laid
next is a call per hull, and cheap: a second Consortium script passes the same table and
re-exports itself alone; another navy's plate starts in its own faction module, as a table
and a drawn sheet.

#### Ranked audit and remaining work

The baseline is commit `1df288a` (28 September 2026), not the earlier #286 scene.
`PerspectiveView.ts` submits the world directly through WebGLRenderer with no tone
mapping, environment, shadow-map enable or composer at that baseline.
`tools/hull-renders/scene.html` instead configures ACES, PMREM, shadows and a bloom
composer. Its still is a lighting reference, not a runtime implementation to copy.

| Rank | Upgrade | Verified starting point and boundary |
| --- | --- | --- |
| 1 | Shared rig, tone mapping, PMREM | This increment. Promote the tutorial rig; no model edits or full-screen pass |
| 2 | Lamp core, then a lamp halo ([#1001](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1001)) | The lamp core landed ([#1021](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1021), [#1029](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1029)). From #1001's readings the owner picked the full-screen route, drawn after the canvas over a depth-only copy of its depth; "Lamp halo — SPEC" above and gate 6's line specify it, landing off behind its setting |
| 3 | Bevel coverage and baked AO ([#1002](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1002)) | Both landed ("Bevels and baked occlusion — SPEC" above). Coverage measured: 30 of 190 extruded plates are bevelled, and plates are 3 % of 7,480 parts, so no primitive was added. The Knights' Bastion carries the first baked occlusion map, on its own UV set, read by the conn view alone, its silhouette unchanged; the next model is a call per model |
| 4 | Vignette, chromatic split, camera sway ([#1003](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1003)) | Vignette and sway are built, with no pass ([Atmosphere rides on top](#atmosphere-rides-on-top-in-screen-space)). The split waits on a gate-6 allocation for its full-screen draw and copy. Existing shader-driven kelp sway and water fog are different effects; do not duplicate them. Respect gate 8 and reduced motion |
| 5 | GLB gzip ([#1004](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1004)) | Built. The nginx image's `mime.types` names no `glb`, so `packages/frontend/nginx.conf` names the type in the models' own location and gzips them at level 6. Delivery cost, not frame quality |
| 6 | UV layout and trim sheets ([#1005](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1005)) | Landed on one hull ("UV layout and trim sheets — SPEC" above). 6,863 of 7,025 primitives carry UV0 and 13 carry `uvAlike`'s zeros, but attribute presence is not a layout: the Bulwark's 162 parts are laid out in metres by its script, and four materials are tagged for the Consortium's sheet, one PNG a navy attached at load, luminance only, hue still the palette's. Sorrowgate's triplanar surfaces are kept under it; the next hull is a call per hull |
| 7 | Shallow caustics ([#1006](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1006)) | Decided: none. The sunlit layer is the milky Lid, which scatters rather than focuses, and the water ramp already carries what light reaches the Shelf ("Shallow caustics — SPEC" above). Nothing to build |
| 8 | WebGPU/TSL ([#1007](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1007)) | Defer migration until a separate feasibility decision. Water, survey, surface and sway shader patches depend on the current WebGL pipeline; this is not a renderer-constructor swap. The feasibility note is written ([webgpu-feasibility.md](webgpu-feasibility.md)): every patch has a TSL equivalent, but under r169 frame-wide tone mapping holds gate 3 only if every material carries its own curve, one-pixel points cost gate 6 triangles, and the halo's depth copy costs gate 6 a call or a target |

Over the model library as it stood at `1df288a`, `node tools/render-stack/audit.mjs`
counts **17,819,812 raw bytes** and **2,211,283 gzip bytes** over 108 source GLBs with
Node's default gzip settings. It reads the library as it stands, so the bytes move
whenever a model does: with the Bastion's occlusion map it counts 19,738,720 and 2,564,136,
and five materials with an occlusion texture ("Bevels and baked occlusion — SPEC" above).
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
- **Ground you cannot enter speaks in the interface voice.** Whether ground blocks you is not
  a property of the ground, it is a relationship between the ground and *your* hulls: a ridge
  that stops a deep raider is open water to a scout. So it is drawn only while something is
  selected, in the cyan the HUD uses to tell you things
  ([style-neon-noir.md](style-neon-noir.md)) — never in threat-red. Being unable to cross a
  ridge is not danger; it is information, and the difference matters when the same screen has
  to show both.
- **A roofed passage is drawn as a route, not as a hole.** A tunnel is the one piece of
  terrain that is invisible from above by construction, so the map marks its line rather than
  its opening. It is public map data like every other part of the ground: everyone can see
  that the passage exists, and nobody can see who is in it.

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
Its amplitude belongs to the biome (SPEC: the per-biome table lives in
`packages/frontend/src/game/seabed.ts`, values TUNABLE), it only ever darkens the authored
fill, and it is **render-only**: the simulation never reads it, no gameplay quantity —
floors, collisions, PF, detection — may ever derive from it, and it must never out-shade an
authored terrain step. It is what the ground looks like, never what it is.

Three further layers of the same texture-not-information rule:

- **Albedo mottling.** Beside the relief, each biome's fill carries a faint
  luminance-only variegation — sediment, growth, scatter — from an independent noise
  channel in the same bake. It is hue-preserving by construction (all three channels
  scale together, because hue belongs to the biome and the biome is what sound is
  priced by), darken-only under the same ceiling as everything else, and its per-biome
  strength lives in the `seabed.ts` table with the relief numbers.
- **Rock speaks in stone.** Ground that admits no water — mesas, trench walls, the
  rock over a roofed passage — is the one ground with no propagation factor to
  encode, so it takes no biome fill: it renders in the hue-neutral stone ramp
  (`rock-face` / `rock-shadow`, [style-neon-noir.md](style-neon-noir.md) "The
  stone"), with its own darken-only relief — jagged, cliff-lipped, shadowed at the
  base where a mesa meets open ground. The ramp's ceiling sits below the palest
  biome fill on purpose: ground you can enter always speaks louder than ground you
  cannot, and the cyan blocked-ground overlay stays the only voice that says
  "not for *this* hull".
- **World light.** Terrain-owned light exists in exactly three families, spec'd and
  capped in [style-neon-noir.md](style-neon-noir.md) "World light": **vent ember**
  points in `#E06A2B` (SPEC — deliberately redder than Bathyarch's hazard amber),
  flickering on the 5 Hz sonar grid; **flora biolight** tips on kelp and living
  coral; and the **crystal seam** in resonance crystal. All three are points and
  seams, never area glow, with the vent ember as the brightness ceiling: decoration
  for ground the map already declares hot, alive, or charged — deterministic per
  map, render-only, and carrying no state, never brightening with activity,
  occupancy, or anything else a player could read as a signal. The seafloor
  otherwise stays unlit.

### Reading the Water

The ground has a shape and now the water has a body. This section is the sibling of
"Reading the Sea Floor" above and deliberately reads like it, because it is the *same
rule* pointed at the other half of the frame: **depth is luminance**, applied to the
medium rather than to the floor of it. The two agree, so a far ridge and the water in
front of it are the same brightness family, and the horizon stops being an edge wherever
the far ground is as deep as the water drawn behind it. Far ground at another depth stays
darker or brighter than that water, and the edge left there is the depth, kept on purpose
([free-camera.md](free-camera.md) Phase 5).

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
  drawn at the thermocline: it is an inflection, not a boundary.
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
darker than any contact, lit only within the world-light families. Where kelp
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
[style-neon-noir.md](style-neon-noir.md) describe — key, faction rim, fill, one
bloom over the lamps. That bloom is the rig's own until [#1015](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1015) re-renders the
portraits through the conn view's lamp halo.

Everything about a portrait is transcribed rather than invented. The dressing
is each navy's biome and licensed world light; the accent is its neon signal;
the lamps burn at the hull's own idle SIG through the same
loudness-encodes-glow law the sprite maps bake with, so a Cruiser at SIG 55
visibly outshines a Chorister at 16. What the renderer adds is the seabed and
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
torpedoes in the conn view ("Own ordnance is geometry too", below); animated bases are
still to come.

### The Asymmetric Fidelity Law

Detail is something you *own*, never something you are shown. The player's base and
force render at full fidelity — lit, animated, alive. The enemy renders **only at the
fidelity their detection earned** — no more, and since #834 no less: a Tier-1 return is a
smudge, a Tier-2 a blurred blob, a Tier-3 a classified disc, and a Tier-4 track the hull's
own sprite. [systems-echo.md](systems-echo.md) §4 calls Tier 4 "full resolution: exact
unit, health, facing" and means it; the art side used to cap that same tier at a flat
silhouette, which was one rule too many and is the half this law no longer holds.

**It is two rules, and only one of them was ever about dread.** Below Tier 4 the law is
*information safety*: the server attaches `kind` and `faction` no earlier than Tier 3, so
a renderer reaching for a sprite under that has nothing real to reach for. In the conn
view it is a *budget*: gate 6 of [graphics-standards.md](graphics-standards.md) spends its
draw calls on the own force, so the enemy is never geometry there at any tier. A
billboarded sprite is not a mesh, which is why lifting the first rule leaves the second
standing — see "Dimensionality is the roster models, lit by the law", below.

**A track is a return, not a window.** It decays on the same twenty-second ghost clock
every other contact does, and the sprite is drawn only while the track is *live*: the
moment it ghosts it falls back to the outline, because a lit hull sitting on a
last-known position claims a present tense the Echo Layer never granted
([ui-ux.md](ui-ux.md) §4). The threat-red stroke stays around it for the reason it was
put there — a faction's livery can match the biome it is sitting in, and the edge is what
keeps a track readable when it does.

A fully-lit battlefield where both sides gleam would still be a lie the renderer tells
against the Echo Layer. What buys the gleam is a live Tier-4 track: four times threshold,
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

On phones the same bands compress: the scope shrinks, the info panel folds to a
status line, and the command panel keeps full-size touch targets.

### Fonts

- Angular industrial font for Bathyarch
- Soft rounded font for Pelagia
- Sharp serif font for Hadron
- Blocky military font for Abyssal

### UI FX

- Sonar pings
- Pressure warnings
- Cavitation distortion on damage

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
slides the focus across the plan, `Shift` + wheel raises and sinks it through the column,
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
  rather than competing with it.
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
with live SIG, so a hull running silent goes dark instead of translucent. The enemy never
renders as a model at any tier — the Asymmetric Fidelity Law is untouched by the camera.

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
for a depth charge — and the scope carries an own-force dot for every one.

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
- **Zoom about the cursor** (wheel / pinch), taken from WC3 rather than C&C. The dolly
  band is TUNABLE and lives in `PerspectiveView.ts`; whatever the band, every gate in
  [graphics-standards.md](graphics-standards.md) is judged "at every zoom the camera
  allows" — and now at every **angle** it allows, which is the honest price of the
  freedom. UI scale is a separate control and never touches the world camera
  ([ui-ux.md](ui-ux.md) §11).
- **An atmosphere pass still may not rotate the projection.** The distinction is now
  load-bearing rather than incidental: the *player* may turn the camera, an *effect* may
  not. Sway stays translation only.

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

The chromatic split is not built. It needs the drawn frame as a texture, so it is a
full-screen draw and a framebuffer copy, and gate 6 of
[graphics-standards.md](graphics-standards.md) must allocate both, and the named GPU time
them, before it lands.

## Atmosphere & Mood

### Key Mood Words

Claustrophobic, industrial, oppressive, bioluminescent, cold, metallic, alien.

### Camera & Composition

The projection itself is SPEC — see [Camera & Projection](#camera--projection) above.
Within it:

- Slight vignette to simulate depth
- Slow camera sway (submarine feel) — translation only, per the projection rules
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
