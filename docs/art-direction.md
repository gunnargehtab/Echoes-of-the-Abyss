# Echoes of the Abyss — Art Direction Guide

*(Industrial, claustrophobic, pressure-scarred — but fully original. Dieselpunk meets abyssal sci-fi.)*

## Visual Identity Overview

The art direction should communicate three things instantly:

1. **Depth** — crushing pressure, darkness, bioluminescent life
2. **Industry** — welded steel, pipes, ballast tanks, cavitation scars
3. **Conflict** — factions with distinct philosophies expressed visually

## World Aesthetic

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
front of it are the same brightness family and the horizon stops being an edge.

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
bloom over the lamps.

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
  and the hull's centre does not move. The ground shadow scales with the hull, because a
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
chromatic split at frame edges ([style-neon-noir.md](style-neon-noir.md)) — is post-work
composited over the world. Sway is translation only. None of these effects may tilt,
shear or rotate the projection: the moment an atmosphere pass bends a range ring, it has
crossed from mood into misinformation.

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
