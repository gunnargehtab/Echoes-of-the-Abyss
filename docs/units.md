Units — Prototype roster

**Glossary:** See [Glossary](glossary.md) for SIG, PF, HYD, PR and Resolution Tier definitions.

This document expands the prototype roster with concise stat tables, cost/production notes, and a playtest plan focused on verifying SIG ⇆ PR interactions across biomes.

Unit stat format

- SIG: reported as (idle / cruise / firing-burst)
- PR: Pressure Rating (integer)
- Cost: abstract resource units for prototyping
- Build time: seconds (prototype simulation)
- Role: short
- Notes: design intent, biome synergies

---

Light Scout (Pelagia)

- Role: Recon / map control
- SIG: 6 / 12 / +15
- PR: 1
- Cost: 50
- Build time: 12s
- Speed: Very high
- Notes: Extremely low baseline SIG; excels in Kelp Forest and Thermal Veins. Fragile; primary scouting platform.

Corvette

- Role: Strike / raiding
- SIG: 28 / 28 / +25
- PR: 2
- Cost: 120
- Build time: 30s
- Speed: High
- Notes: Versatile skirmisher. Good balance of noise and combat capability.

Cruiser

- Role: Fleet anchor / command
- SIG: 55 / 65 (active systems) / +30
- PR: 2
- Cost: 420
- Build time: 90s
- Speed: Medium
- HP: 1200
- Notes: Heavy sensors and sustained combat presence. Produces sustained SIG when power systems are online.

Abyssal Submersible (Directorate)

- Role: Deep operations / raiding
- SIG: 22 / 28 / +20
- PR: 3
- Cost: 260
- Build time: 45s
- Speed: Medium
- Notes: Born to depth; no refit required for abyssal pressure. Strong HYD synergy; benefits from Directorate listening mechanics.

Harvester

- Role: Resource production (economy)
- SIG: 18 (idle) / 40 (mining)
- PR: 1–2 (variant)
- Cost: 80
- Build time: 20s
- Production: 5 resource / minute (baseline)
- Notes: Mining is loud; economy is a noise source. Pelagia harvesters are quieter by design (see factions.md).

Baffle Barge (Structure — Consortium)

- Role: Noise masking support
- SIG: 30 idle / 40 active
- PR: 2
- Cost: 600
- Build time: 120s
- Effect: Projects a 400 m noise-masking bubble that reduces PF for units inside by 0.6× (prototype value)
- Notes: Expensive support structure that enables loud armies to advance.

Cantor (Support — Directorate)

- Role: Listening dome
- SIG: 35 idle
- PR: 2
- Cost: 300
- Build time: 80s
- Effect: Grants allied units +1 effective HYD (prototype) within a 1,200 m dome
- Notes: Increases detection resolution for allies; central to Directorate doctrine.

Hadron Spire / Sounding Spire (Structure — Knights)

- Role: Projected depth access / resonance node
- SIG: 80 when active (directional)
- PR: 2
- Cost: 750
- Build time: 150s
- Effect: Grants PR+1 to allied units within 600 m and can form Standing Wave corridors when two nodes pair.
- Notes: High-cost strategic structure; transforms local depth economics.

Design notes

- Numbers are prototyping intent. Exact costs and timings are tuneable.
- Every unit lists SIG and PR so designers can simulate detection interactions without needing full gameplay code.

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
- Add per-unit HYD values where relevant (sensors vs combat hulls)
- Link these stats into a simple simulator (spreadsheet or minimal Node script) to iterate quickly on thresholds

Related

- systems-echo.md — detection math and Echo Marks
- systems-depth.md — PR and depth behaviour
- glossary.md — authoritative definitions
