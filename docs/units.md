Units — Prototype roster

**Glossary:** See [Glossary](glossary.md) for SIG, PF, HYD, PR and Resolution Tier definitions.

This document expands the prototype roster with concise stat tables, cost/production notes, and a playtest plan focused on verifying SIG ⇆ PR interactions across biomes.

Unit stat format

- SIG: reported as (idle / cruise / firing-burst)
- HYD: Hydrophone Rating, 0–100 — passive listening sensitivity (see systems-echo.md §3)
- PR: Pressure Rating (integer)
- Cost: abstract resource units for prototyping
- Build time: seconds (prototype simulation)
- Role: short
- Notes: design intent, biome synergies

---

Light Scout (Pelagia)

- Role: Recon / map control
- SIG: 6 / 12 / +15
- HYD: 70 (the sensor suite is most of the hull; it finds things, it does not fight them)
- PR: 1
- Cost: 50
- Build time: 12s
- Speed: Very high
- Notes: Extremely low baseline SIG; excels in Kelp Forest and Thermal Veins. Fragile; primary scouting platform.

Corvette

- Role: Strike / raiding
- SIG: 28 / 28 / +25
- HYD: 50 (the baseline listener — the propagation model's BASELINE_HYD is calibrated to it)
- PR: 2
- Cost: 120
- Build time: 30s
- Speed: High
- Notes: Versatile skirmisher. Good balance of noise and combat capability.

Cruiser

- Role: Fleet anchor / command
- SIG: 55 / 65 (active systems) / +30
- HYD: 65 (the "heavy sensors" below, made a number — a command hull hears for the fleet)
- PR: 2
- Cost: 420
- Build time: 90s
- Speed: Medium
- HP: 1200
- Notes: Heavy sensors and sustained combat presence. Produces sustained SIG when power systems are online.

Abyssal Submersible (Directorate)

- Role: Deep operations / raiding
- SIG: 22 / 28 / +20
- HYD: 85 (the best mobile ears in the game — the Directorate's "best HYD by a wide margin",
  systems-echo.md §8, is carried by their native hull)
- PR: 3
- Cost: 260
- Build time: 45s
- Speed: Medium
- Notes: Born to depth; no refit required for abyssal pressure. Strong HYD synergy; benefits from Directorate listening mechanics.

Harvester

- Role: Resource production (economy)
- SIG: 18 (idle) / mining follows the throttle — 12 / 25 / 45 / 68 (see economy.md §3)
- HYD: 30 (dredge gear deafens its own hydrophones — deliberately below the HYD-40 floor
  for reading Echo Marks, systems-echo.md §7: a harvester cannot even read the residue
  of a fight, so escorting the economy is a real job)
- PR: 1–2 (variant)
- Cost: 80
- Build time: 20s
- Production: 50-nodule cargo per trip, mined at 10/s on the node at Standard throttle;
  income is the round trip, so route length is part of the price
- Notes: Mining is loud; economy is a noise source. Pelagia harvesters are quieter by design (see factions.md).

---

Core structures — the base-building loop

Every faction fields these four; they are the C&C skeleton the faction-specific structures
below decorate. Numbers are transcribed into `packages/shared/src/structures.ts`.

Bastion (Structure — all factions)

- Role: HQ, structure commissioning, harvester deposits — and the match's stake
- SIG: 35 sustained
- HYD: 60 (a base mounts the largest fixed arrays a faction owns)
- HP: 5000
- Cost: — (one per player, never rebuilt; losing it is elimination)
- Produces: Harvesters
- Notes: The win condition. A settlement hums; it can never run silent.

Nodule Refinery (Structure — all factions)

- Role: Harvester deposit point
- SIG: 65 sustained (economy.md §4 — the loudest permanent thing you own)
- HP: 1500
- Cost: 300
- Build time: 45s
- Notes: Enables refine-forward play: a refinery beside a contested field shortens the
  haul and plants a 65-SIG beacon on contested ground. That trade is the economy.

Foundry (Structure — all factions)

- Role: Unit production
- SIG: 25 idle / 55 while the line runs
- HP: 2000
- Cost: 400
- Build time: 60s
- Produces: all combat hulls and harvesters
- Notes: A producing base is audibly producing.

Sentinel Turret (Structure — all factions)

- Role: Static defence
- SIG: 12 idle / +30 firing burst
- HYD: 55
- HP: 1000
- Cost: 250
- Build time: 30s
- Damage: 24 at 700 m, 1.5s cycle (prototype values)
- Notes: An ambush predator — near-silent until it fires, then it tells the region.

Construction rules (prototype): sites must rise within 1,200 m of an existing own
structure, broadcast at SIG 70 for the whole build time, and start at 10% hull. See
economy.md and systems-echo.md §2 — construction is loud.

---

Faction structures

Each navy adds exactly one signature structure to the core four, and each is an argument
about one input of the detection formula — the four structures cover the four levers:
the Barge bends PF, the Cantor raises HYD, the Spire grants PR, and the Veil suppresses
SIG itself. Numbers and effects are transcribed into `packages/shared/src/structures.ts`
and `STRUCTURE_AURAS` in `packages/shared/src/constants.ts`.

Baffle Barge (Structure — Consortium)

- Role: Noise masking support
- SIG: 30 idle / 40 active
- PR: 2
- Cost: 600
- Build time: 120s
- Effect: Projects a 400 m noise-masking bubble that reduces PF for units inside by 0.6× (prototype value)
- Notes: Expensive support structure that enables loud armies to advance.

Spore Veil (Structure — Commune)

- Role: Living spore cloud / mutual concealment
- SIG: 20 idle (a breathing bed; the cloud itself is silent)
- HP: 900
- Cost: 450
- Build time: 90s
- Effect: Maintains a 350 m spore cloud (radius tunable). Everything inside — friend or
  foe alike — emits at 40% SIG and is hydrophone-blind (effective HYD 5). The symmetry
  is the design (systems-echo.md §8): it hides them from you and you from them.
- Notes: The Commune does not weaponise the bloom; it is simply the only navy whose
  doctrine already works silent and blind. Anyone who follows them into the veil fights
  on Commune terms.

Cantor (Support — Directorate)

- Role: Listening dome
- SIG: 35 idle
- PR: 2
- Cost: 300
- Build time: 80s
- Effect: Grants allied units +25 HYD, capped at 95, within a 1,200 m dome
- Notes: Increases detection resolution for allies; central to Directorate doctrine. The
  bonus lifts a Corvette (HYD 50) past a Cruiser's ears and an Abyssal Submersible to the
  cap — inside the dome, everything listens like a Listener. (An earlier draft said
  "+1 effective HYD", which is not meaningful against the 0–100 HYD scale.)

Hadron Spire / Sounding Spire (Structure — Knights)

- Role: Projected depth access / resonance node
- SIG: 30 idle hum (tunable) / 80 when active — "active" means the depth grant is
  load-bearing: some allied unit under the aura is genuinely below its own PR. Deep
  play under a spire is never quiet; that is the price of rented depth.
- PR: 2
- Cost: 750
- Build time: 150s
- Effect: Grants PR+1 to allied units within 600 m and can form Standing Wave corridors when two nodes pair.
- Notes: High-cost strategic structure; transforms local depth economics.

Design notes

- Numbers are prototyping intent. Exact costs and timings are tuneable.
- **HYD is a flat hull property.** Silent Running changes what a unit *emits* (SIG), never
  what it *hears* — throttling engines does not unplug the hydrophones. Anything that
  modifies listening does so as an explicit HYD modifier (the Cantor's dome), so the
  detection formula keeps exactly two listening-side inputs: distance and HYD.
- **The Directorate's listening doctrine is carried by numbers, not a special case.** Their
  native hull owns the highest mobile HYD (85) and their Cantor raises allied HYD in an
  area. The "passively detect one tier higher" phrasing in systems-echo.md §8 is realised
  through these HYD values — a separate tier bonus would be a second lever for the same
  effect and harder to balance.
- Every unit lists SIG and PR so designers can simulate detection interactions without needing full gameplay code.
- Combat hulls carry prototype weapon stats in `packages/shared/src/units.ts` (damage,
  range, cooldown) so the scaffold's combat loop can run; the doc-authored number is the
  firing-burst SIG, which is the design-relevant one. Damage figures are placeholders
  until a combat design doc exists.

---

Playtest plan — SIG/PR interactions

Goal

- Validate that SIG and PR mechanics create meaningful trade-offs across biomes and that active sonar, silent running, and depth commitment behave as intended.

Method

- Run deterministic simulation matches with instrumented logging (timestamped events: SIG changes, detection events, resolution tier changes, echo mark creation, pressure attrition ticks).
- Repeat each scenario 10 times to capture variance.

Scenarios

Scenario 1 — Scout Ambush

- Map: Kelp Forest (PF 0.55) vs Open Mid-Water (PF 1.0)
- Setup: Pelagia Light Scout (silent-run approach) vs single Corvette patrol.
- Measure: Time-to-detection, resolution tier at first contact, survival of scout, echo marks usage.

Scenario 2 — Depth Raid (PR mismatch)

- Map: Abyssal rim with trenches (PF 1.6)
- Setup: Consortium cruiser + Baffle Barge attempts descent against Directorate Abyssal Submersible defensive patrol.
- Measure: Pressure attrition occurrences, time-to-retreat (ascent), resource captured vs lost.

Scenario 3 — Ping Timing Test

- Map: Mid-Water open
- Setup: Controlled active sonar pings at varying distances and timings before an assault (ping at T-5, T-2, T-0)
- Measure: Allied accuracy bonus effectiveness, enemy reaction time, cost in counter-detection (number of enemy units alerted inside 2,400 m), fauna aggro events.

Scenario 4 — Economy Noise Curve

- Map: Resource-rich shelf
- Setup: Compare two economies: Pelagia quiet harvesters vs Consortium noisy refineries; measure resource per minute, detection incidents, and echo mark footprints over a 10-minute run.
- Measure: Resource efficiency per detection event; correlation of noise with fauna-driven event variance.

Metrics (collected per run)

- Detection events (count) by scenario and tier
- Time to first Tier-2 and Tier-4 contacts
- Units lost to combat vs units lost to pressure attrition
- Resources gathered and net lost due to attrition / interception
- Echo marks created and their subsequent use (re-scans, traps)
- Fauna aggro events triggered (counts and casualties)

Success criteria

- SIG produces predictable tier transitions (qualitative match to expected thresholds).
- PR advantages enable strategic depth play without being overwhelmingly decisive (no >75% win-rate advantage in single-run tests).
- Active Sonar remains high-cost high-reward: pings should convert local information to a decisive advantage only when used with timing.

Notes for testers

- Log format: CSV with fields [timestamp, event_type, actor, SIG, PF, HYD, distance, tier, result]
- Include a short narrative after each run capturing surprising emergent behaviour.
- Use consistent random seeds for reproducibility where applicable.

---

Next steps

- Author unit variants for each faction (transports, artillery, static defence)
- Done: per-unit HYD values are authored in the stat blocks above and transcribed into
  `packages/shared/src/units.ts`
- Done: `tools/echo-sim` runs these stats through the shared detection model
  (`@echoes/shared`) for fast threshold iteration

Related

- systems-echo.md — detection math and Echo Marks
- systems-depth.md — PR and depth behaviour
- glossary.md — authoritative definitions
