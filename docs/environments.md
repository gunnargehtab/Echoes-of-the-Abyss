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
| Resonance Fields | **0.70 (scattered)** | Bearings lie — pings return false contacts |
| Coral Ruins | **0.80 (occluded)** | Hard shadows behind structures — the only biome that changes during a match |

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

- PF 0.70 scattered — bearings lie, pings return false contacts
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
- The only biome that changes state during a match
- Perfect for campaign missions

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
