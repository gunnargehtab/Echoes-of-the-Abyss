Glossary — Echoes of the Abyss

Authoritative terms used across the design docs. Definitions are concise; systems-echo.md and systems-depth.md contain the full design rationale and examples.

Acoustic Signature (SIG)

- A numeric measure (0–100) of how much sound an entity emits. Sources: engines, weapons, construction, movement, active sonar, special abilities.
- Higher SIG increases detection range and resolution tier exposure and influences fauna attraction and targeting lock speed.

Propagation Factor (PF)

- A per-location scalar that modifies how sound attenuates or carries through the water. Applied multiplicatively to SIG when resolving detections, and integrated along the path between emitter and listener rather than sampled at either end.
- Its base value comes from the biome, but it is not fixed by it: hazards modify PF while they last, and some abilities modify it permanently.
- Example base values: Thermal Veins (0.45), Kelp Forest (0.55), Coral Ruins (0.80), Resonance Fields (0.70), Trenches (1.60).
- PF is not the only multiplier on a detection. The Thermocline applies a second one, and it is not per-location: it depends on the depths of *both* ends of the path, so no single point on the map has a thermocline factor the way it has a PF.

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

Directional Signature

- The Hadron Knights' doctrine, as a term in the detection formula: a Knight hull's SIG is multiplied by where the listener stands relative to that hull's **bow** — ×1.00 inside the 90° cone, ×0.35 on either flank, ×0.10 in the wake (systems-echo.md §8).
- Emitter-side only. It changes what a Knight is heard at and never what a Knight hears; HYD stays a flat hull property, and the listening side of the formula stays at distance and HYD.
- **A hull's listed SIG is its cone figure.** Averaged over the compass the term is 0.45, so the doctrine moves loudness rather than removing it.
- Does not apply to active sonar (omnidirectional by definition, systems-echo.md §5), to Echo Marks, or to structures, which have no bow.

Silent Running

- A tactical mode that heavily reduces SIG (typically to single digits) at the cost of disabling weapons, shields/regeneration, and reducing movement speed.
- Silent Running enables ambush and infiltration but requires a commitment: breaking silence produces a large SIG spike.

Ghost Markers

- The decaying last-known position of a contact a listener has already detected. Tier 1 and Tier 2 contacts persist this way and fade over 20 s (systems-echo.md §4). A ghost marker is your own stale reading of a live unit, and it lies to you by exactly as much as that unit has moved since you heard it.
- **Not Echo Marks**, which are the opposite thing. A ghost is a unit you heard; a mark is a thing that happened. The ghost belongs to one listener and tracks a contact that still exists; the mark is residue the world keeps of a past event, attached to no contact and readable by anyone with the HYD for it.

Scattered Water

- Water that lies about *where* a sound came from. The Resonance Field's PF is "0.70, scattered": the 0.70 prices loudness like any PF, and *scattered* means a contact resolved through those cells is reported up to ±30° off its true bearing and up to 15% long in range — never short — at every tier that carries a bearing, Classification and Track included. It never moves a tier (systems-echo.md §3, "Scattered water"). Deterministic per match and moving over time, so it cannot be averaged or triangulated back to the truth. A Standing Wave corridor un-scatters the cells it writes; a storm does not.

Phantom

- A false contact returned by an active ping transmitted from scattered water: a handle, Tier 4, a plausible enemy hull with health and a heading, and no entity behind it. One to three per transmission (audio-direction.md §5); an attack or torpedo order on one resolves to nothing; it is held for the transmission's three seconds and then fades like a ghost marker. It sounds and reads identical to a true return (systems-echo.md §3).
- **Not a Ghost Marker**, which is a stale reading of a real unit. A phantom was never anything.

Echo Marks

- Decaying acoustic residues left by high-SIG events (battles, construction, mining, destruction). Echo Marks are visible/usable by units with sufficient HYD.
- Durations are design-tunable (examples: battle sites ≈ 90 s, destroyed structures ≈ 3 min).

Depth Bands

- The vertical map bands defining pressure and value: Shelf (0–400 m), Mid-Water (400–1,800 m), Abyssal (1,800+ m).
- Depth interacts with PR and ascent/descent mechanics; see systems-depth.md for the commitment and attrition rules.
- The bands are the ruleset and are identical on every map. How much water stands over a given patch of ground is map data — see Floor and Ceiling.

The Shallow Band

- **A place, not a depth band.** The First Trench at 1,800 m — the Directorate's shallowest holding, and the posting the roughly eight per cent of each intake who cannot hold their band are reassigned to (habitats.md §6; factions.md, "shallow-band labour"). It is the setting of mission-trench-awakening.md and the name of that mission's map.
- It is *shallow* only relative to the Directorate, whose cities stand at 2,750–4,000 m. In the ruleset's own terms 1,800 m is the first metre of the **Abyssal** band, not the Shelf.
- Deliberately distinct from two neighbours it is easy to hear as the same word. **Shelf** is the 0–400 m depth band (see Depth Bands). The **Directorate's shallow-water penalty** is their physiology above 400 m and theirs alone — −20% speed and −15% HP — which is the subject of mission-shallow.md, one mission earlier in the same campaign and four hundred metres from the surface rather than eighteen hundred below it.
- So: a Directorate hull is never penalised for being in the shallow band, and is always penalised for being in shallow water. The two are unrelated, and the campaign uses both within two missions of each other.

The Lid

- The Rift's name for the sour surface layer: roughly the top 150 m of the ocean, poisoned since the Salinity Collapse and stable ever since (world.md). *Sour* is the old industry word for sulfide-laden water, and it is the word that survived.
- A mechanic since the three-layer-ocean revision (three-layer-ocean.md §7): a hull above 150 m runs a sour timer — 20 s of grace, then unhealable bleed on the crush ledger at 1% of max hull per second, until it descends below the Lid and recovers. Universal and faction-blind; the column is hostile at both ends, crush below and sour above (systems-depth.md §2).
- Distinct from the Directorate's shallow-water penalty, which is their own physiology above 400 m and theirs alone (factions.md); the two stack for a Directorate hull in the Lid.

Floor (seabed)

- How deep the water goes at a point on the map, in metres. Map data, authored per region — not a global constant, and unrelated to the Depth Band boundaries.

Ceiling

- How shallow the water goes at a point before it becomes ground. 0 m on open water, which is the common case. A non-zero ceiling is a roofed passage — a tunnel, cavern or overhang — water reachable only from below.

Passable Interval

- The water a hull may occupy at a point: everything between the ceiling and the floor. A hull at depth D fits where ceiling ≤ D ≤ floor. An interval whose ceiling is deeper than its floor is solid ground and admits nothing at any depth.
- "Blocked" is therefore derived, never authored: ground stops a hull because of where that hull sits in the water column, not because a cell was flagged impassable.

Plateau

- Terrain: a raised area of seabed — ground whose floor is shallower than the water around it. Becomes mechanical once floors are authored, since a plateau is ground that deep-running hulls cannot cross without rising.
- The Commune's usage in culture.md and economy.md is the same word for the same ground, used for the community that tends it: bloom-share is anchored to Shelf-band plateau nodes, and a Commune name is the plateau a person farms. "The plateaus voted" is metonymy, not a second definition.

Thermocline

- The temperature boundary at 1,200 m, and the acoustic divide between the map's upper and lower halves. Not a biome and not terrain: it has no cells, and it modifies a listening pair rather than a place.
- Sound crossing it is multiplied by 0.3. Sound whose emitter and listener are both inside the duct — the 100 m either side of the boundary — is multiplied by 1.2 and carries further than open water. Everything else is unaffected.
- The factor multiplies the path's PF; it does not replace it. Crossing the layer inside a Thermal Vein is quieter than crossing it in open water. See systems-echo.md §3.

Acoustic Fog of War

- The principle that all detection and resolution is computed server-authoritatively and delivered to each player as resolved results only; clients never receive unexplored map state.

Mission

- The campaign's unit of play: one authored scenario, of which there are 29 (campaign.md). Not "sortie", not "operation" — the bible uses one word for this and this is it.

Objective

- A single stated goal within a mission, carrying a status of pending, met or failed.
- "Objective" is the name of the field, not a word any character says. The text of an objective is authored in the register of whoever set it (campaign.md §10), which is why there is no shared template: the court states a fact about the room and the Commune will not use the imperative at all.

Briefing

- The authored mission text a player is given before a mission runs, in the voice of whoever is speaking (campaign.md §10).
- **It is not the join-time map payload.** tech-stack.md used "briefing" for the terrain grid and spawn data every client receives on join; that is corrected to *survey chart*, because a briefing is addressed to somebody and a terrain grid is not. campaign.md's usage is the older and load-bearing one, so the technical doc is the one that moves.

Scene

- An event two missions witness from opposite sides, identified by a stable id so that having seen it in one can change what the other reads out (campaign.md §1). *The sweep filed the Marr Plateau's gardens* is a scene: **Tend** witnesses it as being heard, **Thin Water** and **Convocation** meet it as water the concern has already charted.
- A scene is not a mission. Playing a mission does not witness its scenes — a Tend that came home unfiled witnessed nothing, however completely it was played — which is why the progression record remembers scenes rather than mission ids.
- What a witnessed scene may change is **briefing text and nothing else**. A line spoken inside a mission is the mission, and no variant may move one.

Briefing Variant

- An alternate briefing a mission ships for a player who has already witnessed a named scene. Authored prose in the same voice as the default, shipped in the mission's public header, and chosen on the player's own device — the room is never told which was read.

Mission Outcome

- How a mission ends. A mission concludes on its own authored terms — a count read aloud, a retreat completed, a refusal — rather than resolving a winner the way a skirmish match does; three of the 29 are winnable only as evacuations (campaign.md §2).
- A partial outcome is an outcome. It ends the mission and is read out as what it is, rather than being scored as a soft failure the player is asked to replay.

Silence Order

- A mission-imposed SIG ceiling on the player's force, enforced server-side like every other rule about who hears what. Its penalty is a loss of listening, never a loss of the mission: exceed it and the instrument you were lent is withdrawn until the debt is paid.
- Introduced by the Sorrowgate court, which is also where its numbers are set (mission-sorrowgate.md §4).

Scuttling

- The second way a commander leaves a match: a position with no harvester alive, nothing on a production line or rising, not the price of a harvester in the bank and nothing landing in any stockpile, held for sixty seconds while another commander is still earning and fields at least as many armed hulls, ends with the crew scuttling and the commander eliminated exactly as a lost Bastion eliminates them (game-identity.md "Match Structure").
- Automatic and unilateral. It is not an offer of surrender, and it is distinct from a *resignation*, which is a player leaving a live match (tech-stack.md).

Cohort Hull

- Any hull the Directorate crews is a cohort's — a cohort is assigned at birth to a depth band and belongs to it (factions.md) — and mission documents use "cohort hull" in that sense for whatever the year is seated in.
- The roster's **cohort hull** is the **Chorister**: the one entry priced in Biomass (30 Nodules and 20 Biomass), the cheapest hull in the game in Nodules, PR-2 on the hull and PR-3 in the Directorate's hands. The Abyssal Submersible is not it — it is the crystal-locked deep hull (units.md, economy.md §6, §8; issue #352).
- Not faction-locked. The rendering-contract rate (30%) is what makes it the Directorate's: the price is the same for everyone and the income that pays it is not.

Silence-Debt

- The Rift's social ledger for interrupting a listener: you owe the silence back, and you repay it by being quiet the next time that person listens (culture.md §5).
- Informal in three factions and written down in the fourth (culture.md §5). At Sorrowgate it is neither: it is a condition of admission counted in seconds, and it is the mechanical form the silence order takes.

Related

- systems-echo.md — the Echo Layer and detailed detection rules
- systems-depth.md — depth bands, PR, and pressure mechanics
- units.md — per-unit SIG, HYD, and PR values
- audio-direction.md — audio mix and player perception
- ui-ux.md — how resolution tiers are rendered and read
- bestiary.md — fauna as listeners, and what SIG attracts
- economy.md — resources, the noise curve, and per-faction economies
- game-identity.md — the match loop, the win condition, and scuttling
- campaign.md — missions, briefings, objectives, and how one ends
- mission-sorrowgate.md — the prologue, where the silence order is set out with its numbers
- mission-aptitude.md — the Knights' first mission, where directional signature is worked in full
