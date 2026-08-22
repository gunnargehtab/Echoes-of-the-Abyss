Glossary — Echoes of the Abyss

Authoritative terms used across the design docs. Definitions are concise; systems-echo.md and systems-depth.md contain the full design rationale and examples.

Acoustic Signature (SIG)

- A numeric measure (0–100) of how much sound an entity emits. Sources: engines, weapons, construction, movement, active sonar, special abilities.
- Higher SIG increases detection range and resolution tier exposure and influences fauna attraction and targeting lock speed.

Propagation Factor (PF)

- A biome scalar that modifies how sound attenuates or carries through terrain. Applied multiplicatively to SIG when resolving detections.
- Example values: Thermal Veins (0.45), Kelp Forest (0.55), Coral Ruins (0.80), Resonance Fields (0.70), Trenches (1.60).

Hydrophone Rating (HYD)

- A unit/structure's passive listening sensitivity. HYD adjusts detection thresholds: higher HYD lets a listener resolve contacts at lower SIG or greater range.
- Used in the detection formula: detected if SIG(target) × PF ≥ Threshold(distance, HYD(listener)). See systems-echo.md for the exact threshold rules.

Pressure Rating (PR)

- Integer rating describing a unit's depth resilience. Operating below a unit's PR causes unhealable crush attrition.
- PR is used by faction mechanics and depth-affecting abilities (see systems-depth.md).

Resolution Tiers (0–4)

- Tier 0 — Silent: not detected.
- Tier 1 — Contact: something is out there; minimal information.
- Tier 2 — Bearing: direction and rough range band.
- Tier 3 — Classification: unit type and count estimates.
- Tier 4 — Track: full resolution — exact unit, health, facing; the terminal tier.
  There is no tier above Track: it already reveals everything the Echo Layer models,
  so a further "Full Lock" tier would have nothing left to add. (An earlier draft
  listed one; systems-echo.md §4 is the tier table of record.)

Active Sonar

- An active emission that grants high-resolution data to the emitter within a defined radius (default 900 m) for a short duration and places a large omnidirectional SIG on the emitter (default SIG ≈ 95) that reveals the emitter to others within a larger radius (default 2,400 m).
- Active Sonar is powerful and strategic: it trades local knowledge for global disclosure.

Silent Running

- A tactical mode that heavily reduces SIG (typically to single digits) at the cost of disabling weapons, shields/regeneration, and reducing movement speed.
- Silent Running enables ambush and infiltration but requires a commitment: breaking silence produces a large SIG spike.

Echo Marks

- Decaying acoustic residues left by high-SIG events (battles, construction, mining, destruction). Echo Marks are visible/usable by units with sufficient HYD.
- Durations are design-tunable (examples: battle sites ≈ 90 s, destroyed structures ≈ 3 min).

Depth Bands

- The vertical map bands defining pressure and value: Shelf (0–400 m), Mid-Water (400–1,800 m), Abyssal (1,800+ m).
- Depth interacts with PR and ascent/descent mechanics; see systems-depth.md for the commitment and attrition rules.

Acoustic Fog of War

- The principle that all detection and resolution is computed server-authoritatively and delivered to each player as resolved results only; clients never receive unexplored map state.

Related

- systems-echo.md — the Echo Layer and detailed detection rules
- systems-depth.md — depth bands, PR, and pressure mechanics
- units.md — per-unit SIG, HYD, and PR values
- audio-direction.md — audio mix and player perception
- ui-ux.md — how resolution tiers are rendered and read
- bestiary.md — fauna as listeners, and what SIG attracts
- economy.md — resources, the noise curve, and per-faction economies
