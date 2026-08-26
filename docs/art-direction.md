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

### Environmental Shapes

- Jagged rock formations
- Smooth pressure-eroded stone
- Coral ruins with geometric patterns
- Massive industrial structures anchored to the seabed

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

Four survey plates establish the visual language: **the discipline of measuring things that resist measurement.** Two presentation plates extend it into the neon-noir register that governs key art and the command UI (see [style-neon-noir.md](style-neon-noir.md)).

| Plate | Subject |
| --- | --- |
| [I — Depth Strata](concept-art/plate-01-depth-strata.png) | Vertical cross-section, propagation field, the Mouth |
| [II — Four Powers](concept-art/plate-02-four-powers.png) | Shape language, palettes, silhouettes, signature doctrine |
| [III — The Echo Layer](concept-art/plate-03-echo-layer.png) | Resolution tiers and the cost of the ping |
| [IV — The Mouth](concept-art/plate-04-the-mouth.png) | Concentric banding, return anomaly, unresolved |
| [V — Submarine Classes](concept-art/plate-05-submarine-classes.png) | Neon-noir key art: hull line-up surfaced at night, magenta/cyan signage |
| [VI — Build Menu UI](concept-art/plate-06-build-menu-ui.jpg) | Neon-noir command panel mock: glass cards, magenta bevels, cyan headers |

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
decodes, every enemy contact, which the law below caps at a flat silhouette, and
**construction sites** — a half-built structure is schematic on purpose, and reads as
scaffolding until it is commissioned. Cavitation trails and animated bases are still to
come.

### The Asymmetric Fidelity Law

Detail is something you *own*, never something you are shown. The player's base and
force render at full fidelity — lit, animated, alive. The enemy renders **only at the
fidelity their detection earned**: a Tier-1 return is a smudge, a Tier-2 a blurred blob,
and even a Tier-4 track is a resolved silhouette, never the full-detail sprite. A
fully-lit battlefield where both sides gleam would be a lie the renderer tells against
the Echo Layer; the contrast between the rich home base and the black ocean past the
sonar line is where the dread lives.

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
- Selected-unit detection radius renders as a soft ring on the terrain
- Ping cost is previewed before commit — hovering the ping button shows the 2,400 m reveal radius in threat-red
- Audio mix is the primary channel: a Tier-1 contact should be *heard* before it is *seen* on the minimap

## Atmosphere & Mood

### Key Mood Words

Claustrophobic, industrial, oppressive, bioluminescent, cold, metallic, alien.

### Camera & Composition

- Slight vignette to simulate depth
- Slow camera sway (submarine feel)
- Fog layers for parallax depth

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

- [graphics-standards.md](graphics-standards.md) — the acceptance bar that enforces this direction
- [factions.md](factions.md) — full faction visual identity sheets
- [style-neon-noir.md](style-neon-noir.md) — presentation-layer palette tokens and glow rules
- [asset-prompts-3d.md](asset-prompts-3d.md) — prompt kit that transcribes this doc for 3D model generation
- [ui-ux.md](ui-ux.md) — the Echo Layer HUD this direction serves
