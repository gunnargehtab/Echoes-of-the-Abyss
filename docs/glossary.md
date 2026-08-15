Glossary — Echoes of the Abyss

This glossary defines authoritative terms used across design docs.

Acoustic Signature (SIG)
- A numeric measure (0–100) of how much sound a unit or structure emits. Sources: engines, weapons, construction, movement, active sonar.
- Higher SIG increases detection ranges and resolution tier exposure.

Propagation Factor (PF)
- A biome scalar determining how sound attenuates or carries. Example values: Thermal Veins (0.45), Kelp Forest (0.55), Trenches (1.60), Resonance Fields (0.70), Coral Ruins (0.80).
- Applied multiplicatively to signal strength when resolving detections.

Pressure Rating (PR)
- An integer rating for units/structures describing depth resilience. Units below their PR take crush attrition that cannot be healed without refit.

Resolution Tiers (1–5)
- Tier 1: Presence — something is out there, approximate bearing
- Tier 2: Bearing — rough vector and range band
- Tier 3: Contact — individual unit identification begins
- Tier 4: Track — velocity and heading resolved
- Tier 5: Full Lock — unit identity, exact position, and state

Active Sonar
- Emission with fixed range (default 900 m) that yields high-resolution data to the emitter but broadcasts the emitter's presence to others within a larger reveal radius (default 2,400 m).

Acoustic Fog of War
- The game-wide rule set where the clients never receive unexplored map state; detections are server-authoritative and per-player.

Related: systems-echo.md, systems-depth.md
