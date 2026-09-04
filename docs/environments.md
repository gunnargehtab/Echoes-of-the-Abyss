# Echoes of the Abyss — Environments

Atmospheric, industrial, abyssal — built for RTS readability and faction identity.

## Environment Philosophy

The world must feel:

- **Deep** — crushing pressure, darkness, volumetric fog
- **Industrial** — welded steel, mining rigs, pipelines
- **Alive** — bioluminescent flora and fauna
- **Hostile** — trenches, volcanic vents, toxic zones
- **Readable** — clear silhouettes, distinct biomes, faction color cues

RTS readability always wins over realism.

## Acoustics — PropagationFactor by Biome

Every biome is also an acoustic space: terrain sets how far sound travels under [the Echo Layer](systems-echo.md). PropagationFactor (PF) scales a unit's Acoustic Signature before it reaches enemy listeners — low PF masks you, high PF carries you.

| Biome | PropagationFactor | Acoustic Effect |
| --- | --- | --- |
| Thermal Veins | **0.45** | Vent roar masks you — natural ambush terrain |
| Kelp Forest Plateaus | **0.55** | Absorption muffles movement — the stealth biome |
| Abyssal Trenches | **1.60 (axial)** | Trench walls channel sound impossibly far down the axis — no secrets, only distances |
| Resonance Fields | **0.70 (scattered)** | Bearings lie by up to ±30° and read up to 15% long; a ping returns one to three false contacts ([systems-echo.md](systems-echo.md) §3, "Scattered water") |
| Coral Ruins | **0.80 (occluded)** | Hard shadows behind structures — the only biome *specified* to change during a match, not yet built |

PF is a property of a *place*, and it is not the only thing that scales a signature. The **thermocline** at 1,200 m applies a second multiplier that no cell of the map carries, because it depends on the depths of both ends of the path: 0.3 across the layer, 1.2 along its duct, 1.0 otherwise. It multiplies the biome's PF rather than replacing it — crossing the layer inside a Thermal Vein is quieter than crossing it in open water. See [systems-echo.md](systems-echo.md) §3.

The map is also a **living ecosystem** — see [hazards.md](hazards.md) for creature migration and fauna interactions. It responds to noise, hunger, and over-extraction, and can be permanently degraded: the winner of a long, loud match can inherit a corpse of a biome.

## Major Biomes (Primary Play Spaces)

### 1. Thermal Veins — Geothermal Hotspots

High-energy zones powering Bathyarch industry.

**Visual Identity**

- Magma-lit cracks in the seabed
- Red/orange glow bleeding through fog
- Steam plumes and micro-eruption particles
- Metallic mining rigs anchored into rock

**Materials:** Basalt, heat-scorched steel, magma glass deposits

**Gameplay Readability**

- PF 0.45 — vent roar masks approaching units
- Bright warm palette → easy to spot
- High contrast silhouettes
- Clear "danger zones" around vents

**Faction Tie-In:** Bathyarch structures dominate these regions; hazard-yellow industrial lights.

### 2. Kelp Forest Plateaus — Bio-Rich Regions

Home of Pelagia Commune.

**Visual Identity**

- Tall kelp strands swaying with currents
- Soft green/teal bioluminescence
- Coral towers and algae farms
- Schools of small glowing fish

**Materials:** Algae composites, coral stone, biopolymer membranes

**Gameplay Readability**

- PF 0.55 — absorption is the Commune's home advantage
- Soft green palette
- High vertical silhouettes (kelp pillars)
- Clear paths carved through vegetation

**Faction Tie-In:** Pelagia's organic buildings blend into flora; bioluminescent trails mark territory.

### 3. Abyssal Trenches — Deep Pressure Zones

The domain of the Abyssal Directorate.

**Visual Identity**

- Pitch-black voids
- Jagged rock walls
- Occasional red biolights from abyssal creatures
- Thick volumetric fog

**Materials:** Abyssal chitin, hardened stone, blackened steel

**Gameplay Readability**

- PF 1.60 axial — trench walls carry sound impossibly far along the channel
- Dark palette with bright faction accents
- Strong rim-lighting on units
- Fog layers for depth separation

**Faction Tie-In:** Directorate fortresses embedded in trench walls; red sonar-distortion FX.

### 4. Resonance Fields — Crystal & Magnetic Zones

Sacred territory of the Hadron Knights.

**Visual Identity**

- Giant resonance crystals emitting violet light
- Magnetic pylons humming with energy
- Floating metallic shards
- Sonic ripple distortions in water

**Materials:** Crystal composites, polished alloys, magnetic rails

**Gameplay Readability**

- PF 0.70 scattered — bearings lie by up to ±30° and read up to 15% long at every tier that
  carries a bearing, and a ping transmitted from inside the Fields returns one to three phantoms.
  The numbers, and what a Standing Wave corridor does to them, are
  [systems-echo.md](systems-echo.md) §3, "Scattered water" — the 0.70 prices loudness like any
  PF and never moves a tier
- Purple/blue palette
- Crystals act as natural light sources
- Clear geometric shapes

**Faction Tie-In:** Hadron structures mirror crystal geometry; sonic pulse FX on buildings.

## Secondary Biomes (Detail Layers)

### Coral Ruins

- PF 0.80, occluded — hard acoustic shadows behind structures
- Remnants of pre-collapse cities
- Overgrown with coral and algae
- Broken domes, collapsed tunnels
- **The only biome that changes state during a match** — specified here, and built
- Perfect for campaign missions

The state change is specified here and belongs here rather than in any other biome: a dome
that comes down or a tunnel that silts up moves the acoustic shadows a player was already
fighting from, and a ruin is the only terrain in the game where that reads as a building
failing rather than as the seabed misbehaving.

A mission beat writes it. The beat names a region and the biome the water over it becomes,
and it may collapse the geometry in the same breath — a dome coming down and the water
behind it turning to ruins are one event at one tick, not two. The PropagationFactor moves
with the biome, so the change is audible at the tick it happens rather than at the next
storm, and it composes with any hazard standing over the same cells: a Resonance Storm over
ground that just became ruins prices the new biome, never the old one.

Nothing about it is hidden. Terrain is public on join by design — both commanders are
standing on it — and a mid-match repaint is that same published fact changing, sent to
every client as the cells that moved. It resolves nothing per observer and adds no channel
the Echo Layer does not already own. A client that joins after the collapse is served the
ground as it *is*; one that was already here is sent the difference.

[campaign.md](campaign.md) §10 states the same fact from the mission side; the two lines
move together.

### Toxic Brine Zones

- Greenish fog
- Chemical waste barrels
- Damaged fauna
- Slow damage over time

### Bioluminescent Caverns

- Glowing flora
- Soft blue/pink lights
- Peaceful but eerie atmosphere

### Industrial Scrap Fields

- Submarine wrecks
- Rusted pipelines
- Floating debris
- High-risk navigation

## Lighting & Atmosphere Guide

### Global Lighting Rules

- Depth gradient: brighter near surface, darker downward
- Bioluminescence: used as natural light sources
- Volumetric fog: defines depth and direction
- Rim lighting: ensures unit readability

### Color Temperature

- Warm in geothermal zones
- Cool in kelp forests
- Neutral in industrial areas
- Cold violet in resonance fields

## Material Library

**Natural:** Basalt, coral stone, algae membranes, abyssal chitin

**Industrial:** Pressure-forge steel, rusted iron, tungsten plating, magnetic alloys

**FX Materials:** Bioluminescent nodes, resonance crystals, magma glass

## Gameplay Readability Rules

### Terrain

- Clear silhouettes
- Strong contrast between passable and blocked ground — and blocked is relative to the
  viewer's own depth, not absolute. A ridge that stops a deep-running hull is open water
  to a shallow one, so the map has to show which it is for the units currently selected.
- Faction-colored highlights for bases

### Hazards

- Always visually telegraphed
- Pulsing glow for geothermal vents
- Toxic fog for brine zones
- Sonic ripple for resonance fields

(See [hazards.md](hazards.md) for full hazard mechanics.)

### Pathing

- Use kelp gaps, rock corridors and crystal formations. These are readability aids, not
  barriers: kelp never blocks a hull, it slows and hides one ([hazards.md](hazards.md) §4).
  What blocks is ground.
- Where a route passes under a ridge rather than around it, the map must make the roof
  legible — a passage nobody can see is a passage nobody takes.
- Avoid overly noisy backgrounds

## Environmental Storytelling

### Techniques

- Abandoned mining rigs → Bathyarch overreach
- Coral-covered ruins → Pelagia reclamation
- Chitin growths → Directorate bio-engineering
- Crystal shrines → Hadron rituals

### Campaign Hooks

- Collapsing vent fields
- Toxic spill disasters
- Abyssal creature migrations
- Crystal resonance storms
