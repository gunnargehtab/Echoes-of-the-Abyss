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

The Setting's Proper Nouns

The entries above are the ruleset's. The entries below are the world's, and they are here for the same reason: rule 1 of docs/README.md makes this document the place a term that means two things in two docs is resolved. Three such collisions are arbitrated here — the Sounding, the Descent, and Sufficiency — and the rest are terms five or more world docs use without any of them owning the definition.

PC (Post-Collapse)

- The Rift's calendar. Year 0 is the Salinity Collapse; the present of the game is **214 PC**. Everything before year 0 is the **Surface Age**, dated only in approximations — partly because the records were lost and partly because nobody down here is sentimental about it (timeline.md).
- There is no other era, no other epoch, and no BC equivalent. A date without PC on it is not a Rift date.

Tide

- The Rift's short interval, standing where the hour stands elsewhere. "Three tides" is a working day and a bit; "every first tide" is a monthly obligation (culture.md §2).
- Horizontal distance is stated in metres and immediately forgotten. **Depth** is stated in metres and never forgotten. Hours, days and weeks are not used in dialogue.

The Mouth

- The eleven-kilometre depression at **4,410 m** at the Rift's southern terminus — the floor of the setting, in every sense (world-map.md §3). It returns sonar pings *before they should arrive*, on a cycle measured at 43 hours from 88 PC and at 39 hours since 213 PC (timeline.md).
- **Described, measured, never explained.** No character and no line of narration is ever authoritatively correct about what it is (culture.md §6). Characters may speculate, contradict each other, and be wrong. This entry stops where the bible stops.
- Each faction has an incompatible relationship to it: the Consortium files for mineral rights, the Commune calls it a wound, the Directorate attends it, and the Knights are building something to answer it (world.md).

Debt-Berth

- The Consortium contract that trades berth space for obligation, first recorded in 11 PC and now covering roughly 40% of the Rift's population (timeline.md, factions.md). The Rift's dominant financial instrument.
- The word *berth* alone now means obligation everywhere, including among people who have never signed one (culture.md §2). "He married dry" is about the same economy from the other end.
- The Directorate has no debt and despises the instrument — which is what makes shallow-band labour, the posting for the 8% of each intake who cannot hold their band, the one job in the Directorate that resembles it (factions.md; see The Shallow Band).

Halvard

- A pre-Collapse habitat at 1,600 m on the west wall that imploded in **14 PC**: the Rift's founding grave. Bathyarch salvage — not yet a government, not yet chartered — recovered the bodies, and was chartered five years later on the strength of it (timeline.md).
- The wreck has been left exactly as the salvors closed it. By unspoken agreement across all four powers, Halvard is not entered, not mined, and not built within a kilometre of (world-map.md §3).
- **Sound:** none. Crews cut engines passing it, which in the Rift is what reverence is.

Ninefold Vein

- The Consortium's founding vent field and the one on the corporate seal: nine vents on a fault line at 900–1,400 m on the west wall, producing decades before year 0 (world-map.md §3).
- In **terminal decline since 209 PC**, with an internal actuarial projection of eleven years to insolvency without a new field. That projection, and not ambition, is why the Consortium is at the Rim in 214 PC (factions.md).

The Thermal Grid

- The pipe-and-cable spine built in **71 PC** along the west wall, linking the major vent fields and carrying heat and power to every habitat that pays for *draw* (world-map.md §3, economy.md).
- Whoever runs the grid runs the air, and everyone understood this immediately when it was built (timeline.md). The Consortium runs the grid.

Sorrowgate

- Two things at once, and most sentences mean both. The **drowned city** is the Surface Age's one attempt at a permanent deep colony — a transit line, a passenger terminus, and a hydrophone array larger than anything built since — half-finished at year 0, which took the descent's whole weight and fell in some year nobody kept. Its own name did not survive it; the Rift calls the ruin Sorrowgate, after the gate its dead went through (world-map.md §3).
- The **Sorrowgate Arbitration Court** is inside it: a collapsed transit dome at 1,500 m, under the thermocline, where Arbiter Mosk Halloran has kept the Rift's only neutral record since **165 PC**. All four powers use it; all four deny using it (mission-sorrowgate.md).
- Unqualified, *Sorrowgate* means the court unless the context is geography. The city is *the drowned city* when the two need separating.

The Undermarshalcy

- The Abyssal Directorate's military-theocratic command structure, constituted in **104 PC**, headed by the Undermarshal and seated at Sufficiency — cut into the north wall at the head of the Ninth Trench, facing the Cantorate across it (factions.md, habitats.md §6).
- The Directorate's own word for itself in the third person, alongside *the cohorts* and *those below* (culture.md §3). A faction voice that says "the Undermarshalcy has decided" is not naming a building.

The Cantorate

- The body beneath the Undermarshalcy that manages the Deep Choir, seated on Sufficiency's south wall (factions.md, habitats.md §6). Its officers are **Cantors**, who are also a structure in play: a Cantor projects a 1,200 m listening dome (units.md).
- Its careful institutional position is that the Mouth **must be attended, never understood** — and Korrin's crisis is that she can no longer hold it without lying (factions.md).

The Deep Choir

- The Directorate's state religion: *attending* to the Mouth. Not a choir in the musical sense and not a body of people — the Cantorate is the body; the Choir is the practice and what the practice is addressed to.
- Its central rite is **attendance**: a shift spent listening down the trench toward the Mouth's return cycle and recording, without interpretation, what you dreamt. Compulsory, unpaid, and universally described by Directorate citizens as the best part of their month (culture.md §5).
- The dream transcripts run to 6,000 pages since 88 PC, are collected in Sufficiency's attending galleries, and are published nowhere (world-map.md §3).

The First Chord · The Second Chord

- The **First Chord** is the instrument raised at the First Chapter-House (2,900 m) in **178 PC** and aimed down the trench axis into the Mouth — the one alignment in the Rift where PF 1.6 water carries a transmission that far. It transmitted, and a reply arrived **forty-one seconds early**. Three technicians never regained speech; they began to write, and have not stopped (timeline.md, world-map.md §3).
- The **Second Chord** is what the Order is building to transmit something *structured* — a message rather than a tone. It requires more resonant crystal than exists in Knight territory, which is what points the Order at the Mouth's rim deposits and makes 214 PC a war rather than a project (factions.md).
- Both are instruments, not places and not chapter-houses. *The Second Chord* is also the name of the Knight campaign and of its seventh mission (campaign.md §7).

The Sounding

- **The Sounding of 141** is the event: the only joint expedition in the Rift's history, up through the Lid in sealed hulls for three tides on the surface. It found white water to the horizon, air breathable on a good wind, and nothing to eat, nothing to burn and nothing to hear. Its four-hour hydrophone record is the real report and the reason there was never a second expedition; after it, *when do we go back* left the Rift's politics and did not return (world.md, timeline.md).
- A **Sounding Spire** is a Hadron Knight structure, granting allied units **+1 PR within 600 m** — depth access as a support ability (factions.md).
- The two share a verb rather than a subject: *to sound* is to measure by listening (culture.md §1). Unqualified, *the Sounding* is the 141 PC expedition; the structure is always named in full.

The Descent

- **The Descent**, capitalised and dated, is the era **0 to 50 PC**: the rout downward and the overload decades after it (timeline.md).
- **The descent**, uncapitalised, is the universal funeral rite: all four cultures commit their dead to water below their own habitation, for four incompatible reasons and by four incompatible methods (culture.md §5).
- The era takes the article and a date; the rite takes neither. A line that could be read either way should carry the years.

Sufficiency

- **Sufficiency** is the Directorate's seat: terraced galleries cut into the slope at the head of the Ninth Trench, **2,750–3,400 m**, housing the Undermarshalcy, the Cantorate, and the largest population in the deep (world-map.md §3, habitats.md §6).
- **Sufficient** is the Directorate's highest word of praise — *"You were sufficient"*, said without sarcasm and heard as praise (culture.md §3).
- This is a pun the Directorate made on purpose: the city is the word turned into an address, and it means it. Capital S with no article is the place; the adjective is the praise. Not a collision to remove.

Offices and Titles

- Address is by title in all four cultures, and getting a title wrong is a real error rather than a small one (culture.md §4).
- **Tidespeaker** (Commune) — the rotating coordinator of the bloom-collectives, with almost no unilateral authority. Outsiders keep treating it as *head of state*, which is precisely the misunderstanding the Commune is built on. Ysolde Marr holds it.
- **Bloomwright** (Commune) — the office of a programme lead on the plateaus. Sefa Anholt is the Deepbloom Bloomwright.
- **Executor** (Consortium) — the title carried by a member of the Ninth Board. Odile Varr-Kest is an Executor and chairs the Board; the two are not the same fact.
- **Undermarshal** (Directorate) — the head of the Undermarshalcy. Setha Korrin holds it.
- **Cohort-Prime** (Directorate) — the field commander of a trench cohort. Adze commands the 9th Trench Cohort, the deepest standing formation in the Rift.
- **Choirmaster** (Knights) — the coordinator of the nine chapter-houses. Ivane Sull holds it, and the Order's centre moved to her house with her.
- **Chapter-Master** (Knights) — the head of one chapter-house. Halden Vrey holds the Third.
- **Arbiter** (Sorrowgate) — the presiding officer of the Arbitration Court, and the only title here belonging to no faction. Mosk Halloran holds it.
- Knight and court usage puts the title before the name and keeps it there; a Knight is *Choirmaster Sull* in the third sentence as well as the first.

Doctrine Names

- One per faction, and a set: each names that faction's answer to noise, and no two are the same *kind* of answer (factions.md).
- **The Klaxon** (Bathyarch Consortium) — stealth as a rounding error. The loudest units in the game, built to survive being heard: **+12% damage while SIG > 60**.
- **The Veil** (Pelagia Commune) — the lowest SIG in the game. They harvest at 18 SIG where others harvest at 50, and Silent Running costs them only −20% speed.
- **The Listening** (Abyssal Directorate) — the best hydrophone ratings by a wide margin: Directorate units resolve one tier higher than anyone else, and their Cantors project 1,200 m domes.
- **The Score** (Hadron Knights) — sound as a weapon rather than a liability: high SIG, aimed. The term in the formula is Directional Signature, above.
- Used as bare nouns in faction voice — *the Klaxon posture*, *under the Veil* — and never as the name of a unit, structure or ability.

Related

- [systems-echo.md](systems-echo.md) — the Echo Layer and detailed detection rules
- [systems-depth.md](systems-depth.md) — depth bands, PR, and pressure mechanics
- [units.md](units.md) — per-unit SIG, HYD, and PR values
- [audio-direction.md](audio-direction.md) — audio mix and player perception
- [ui-ux.md](ui-ux.md) — how resolution tiers are rendered and read
- [bestiary.md](bestiary.md) — fauna as listeners, and what SIG attracts
- [economy.md](economy.md) — resources, the noise curve, and per-faction economies
- [game-identity.md](game-identity.md) — the match loop, the win condition, and scuttling
- [campaign.md](campaign.md) — missions, briefings, objectives, and how one ends
- [mission-sorrowgate.md](mission-sorrowgate.md) — the prologue, where the silence order is set out with its numbers
- [mission-aptitude.md](mission-aptitude.md) — the Knights' first mission, where directional signature is worked in full
- [world.md](world.md) — the Collapse, the Lid, the Sounding, and the Mouth
- [world-map.md](world-map.md) — the gazetteer every place named above is an entry in
- [habitats.md](habitats.md) — inside those places: berths, light, air, and the hush
- [timeline.md](timeline.md) — the PC calendar and every year cited above
- [culture.md](culture.md) — tides, titles, the five registers, and the writing guide
- [factions.md](factions.md) — the four doctrines, in institutional detail
