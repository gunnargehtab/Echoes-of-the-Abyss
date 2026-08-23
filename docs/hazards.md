# Echoes of the Abyss — Environmental Hazards

Dynamic, readable, faction-flavored threats that shape strategy.

## 1. Geothermal Vent Eruptions

### Visual Cues

- Pulsing red/orange glow beneath the seabed
- Steam plumes rising in intervals
- Magma particles drifting upward
- Rock cracks widening before eruption

### Gameplay Mechanics

- Periodic eruptions dealing high AoE damage
- Units pushed away by pressure shockwave
- Buildings take reduced damage (but still vulnerable)
- Can be used as natural defenses

### Faction Interactions

- Bathyarch can stabilize vents for energy boosts
- Pelagia suffers extra damage (organic hulls)
- Abyssal units resist knockback
- Hadron can predict eruptions via resonance sensors

## 2. Toxic Brine Clouds

### Visual Cues

- Greenish fog drifting slowly
- Floating chemical particles
- Dead fish and damaged flora
- Corroded metal debris

### Gameplay Mechanics

- Continuous DoT (damage over time)
- Reduced visibility
- Slower movement
- Projectiles passing through suffer accuracy penalties

### Faction Interactions

- Pelagia can cleanse brine with algae reactors
- Abyssal bio-units are immune
- Hadron sonic pulses disperse clouds
- Bathyarch can harvest brine for chemical weapons

## 3. Abyssal Pressure Zones

### Visual Cues

- Pitch-black void
- Heavy volumetric fog
- Distorted sonar readings
- Crushed wrecks scattered around

### Gameplay Mechanics

- Units take pressure damage over time
- Sensors fail → reduced detection range
- Projectiles slow down
- Some units cannot enter at all

### Faction Interactions

- Abyssal Directorate thrives here (no penalties)
- Hadron suffers reduced resonance efficiency
- Pelagia units lose bioluminescent stealth
- Bathyarch heavy subs take extra pressure damage

## 4. Kelp Entanglement Fields

### Visual Cues

- Dense kelp strands
- Bioluminescent spores drifting
- Schools of fish weaving through
- Soft green fog

### Gameplay Mechanics

- Movement speed reduced
- Stealth units gain bonus concealment
- Large units risk temporary immobilization
- Explosions clear kelp temporarily

### Faction Interactions

- Pelagia moves freely
- Abyssal bio-units tear through kelp
- Hadron units get stuck more easily (sharp fins)
- Bathyarch can burn kelp with thermal cutters

## 5. Resonance Storms

### Visual Cues

- Violet lightning arcs through water
- Sonic ripple distortions
- Crystals vibrating violently
- Magnetic debris floating erratically

### Gameplay Mechanics

- Random sonic shockwaves damaging units
- Magnetic interference → disables abilities
- Buildings take reduced damage
- Projectiles curve unpredictably

### Faction Interactions

- Hadron Knights gain temporary buffs
- Pelagia organic tech becomes unstable
- Bathyarch machinery malfunctions
- Abyssal creatures panic (reduced control)

## 6. Abyssal Creature Migration

### Visual Cues

- Massive silhouettes moving in the fog
- Bioluminescent eyes
- Disturbed sediment clouds
- Deep rumbling sounds

### Gameplay Mechanics

- Creatures move across the map on fixed paths
- Collision causes heavy damage
- Can destroy buildings
- Can be lured with bait structures
- Fauna are drawn to noise — high-SIG activity near creature territory increases migration and aggro risk (see [systems-echo.md](systems-echo.md))

### Faction Interactions

- Abyssal Directorate can temporarily control creatures, and harvests fauna for Biomass — they are structurally rewarded for letting enemies be loud near their ecosystem
- Pelagia can pacify them
- Hadron can repel them with sonic pulses
- Bathyarch can harvest remains for rare resources

## 7. Chemical Spill Zones

### Visual Cues

- Bright neon slicks
- Corroded metal fragments
- Bubbling water surface
- Toxic foam patches

### Gameplay Mechanics

- Severe DoT
- Armor degradation
- Reduced healing/repair
- Explosive chain reactions if ignited

### Faction Interactions

- Bathyarch can weaponize spills
- Pelagia can neutralize them
- Abyssal bio-units mutate (temporary buffs)
- Hadron suffers heavy penalties

## 8. Cold Shock Currents

### Visual Cues

- Blue/white streaks
- Fast-moving water particles
- Frost forming on metal surfaces
- Cracked ice crystals drifting

### Gameplay Mechanics

- Sudden movement speed reduction
- Energy weapons lose effectiveness
- Hull integrity drops temporarily
- Can push units off course

### Faction Interactions

- Hadron unaffected (mag-propulsion)
- Pelagia slows dramatically
- Bathyarch reactors stall
- Abyssal creatures freeze briefly

## Hazard Integration Rules (RTS-specific)

### Readability

- Every hazard must have clear telegraphing
- Color coding per hazard type
- Distinct particle FX
- Predictable timing (except storms)

### Balance

- Hazards should shape strategy, not dominate it
- Factions should have unique interactions
- Hazards should create map control opportunities

### Art Direction

- Use fog layers for depth
- Strong rim lighting for readability
- Bioluminescence for natural illumination
- Particle FX for danger telegraphing

---

## Implementation Status

Two of the eight are simulated. The framework is the deliverable; the remaining six are additions to it rather than new systems.

| Hazard | Status |
| --- | --- |
| 1. Geothermal Vent Eruptions | **Implemented** — full cycle, damage, knockback, acoustic spike, all four faction interactions |
| 2. Toxic Brine Clouds | Site only — placed and telegraphed, no behaviour |
| 3. Abyssal Pressure Zones | Site only. Crush attrition already exists as a depth mechanic ([systems-depth.md](systems-depth.md)); a *zone* would layer on top of it |
| 4. Kelp Entanglement Fields | Site only |
| 5. Resonance Storms | **Implemented** — full cycle, PF degradation, light damage, three of four faction interactions |
| 6. Abyssal Creature Migration | Not started — needs the fauna simulation first |
| 7. Chemical Spill Zones | Site only |
| 8. Cold Shock Currents | Site only |

A **site** is a position and a radius authored into a map ([maps.md](maps.md)); a **simulated** hazard additionally has a phase, timers and effects. Sites are drawn either way, because hazard telegraphing is a core map principle and a site the player cannot see is a trap rather than a hazard.

### The lifecycle

Every hazard runs **dormant → warning → active → decay → dormant**.

The warning phase is a design constraint, not polish. [CLAUDE.md](../CLAUDE.md) fixes the target emotion as *dread, not confusion*, and an unannounced instant kill teaches a player that the map is arbitrary rather than that it is dangerous. The warning is sized against the **slowest hull in the roster clearing the largest authored plume** — a Harvester at 40 m/s needs 17.5 s to cross 700 m from the centre, so the window is 20 s. There is a test that keeps that true when either number moves.

Dormant sites stay drawn, faintly. A hazard the player can forget is a hazard that will surprise them, and surprise is the failure mode the warning exists to prevent.

### Two shapes of hazard

The implemented pair was chosen to exercise opposite ends of the framework:

**Eruptions damage hulls and give them away.** A hull caught in the plume takes damage, is thrown outward, *and* is spiked to SIG 55 through the ordinary acoustic path — so being hurt and being found are the same moment. That is this game's thesis applied to weather, and it is why an eruption is an acoustic event rather than a damage zone.

**Storms attack information.** A storm multiplies PropagationFactor inside its area, which reaches detection as a write to the per-cell array the Echo Layer already reads on every path integral. No new code path, and biome and storm compose for free. Modifiers are **recomputed from the biome rather than inverted**, so overlapping storms are exact and a long match cannot drift.

### Faction interactions

These are why hazards are asymmetric content rather than weather. §1 and §5 are implemented in full, with one exception:

- §5's *"Abyssal creatures panic (reduced control)"* is about **fauna**, which does not exist yet. It is left unimplemented rather than approximated with something the doc does not say.

Related: [maps.md](maps.md) · [environments.md](environments.md) · [systems-echo.md](systems-echo.md)
