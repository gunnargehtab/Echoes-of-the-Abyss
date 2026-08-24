# Economy — Everything That Pays Is Loud

> [systems-echo.md](systems-echo.md) §2: *"Economy is loud. Construction is loud."* The economy is not a subsystem that happens to make noise. It is the largest, most continuous, most predictable noise source in the game, and that is the whole design.

**Glossary:** See [Glossary](glossary.md) for authoritative term definitions (SIG, PF, HYD, PR, Resolution Tiers, Active Sonar, Silent Running, Echo Marks).

---

## 1. Premise

In a conventional RTS, economy is the safe half of the game — you build it at home and fight somewhere else. Here there is no *somewhere else*, because income is audible from further away than an army is. A base that is earning is a base that is broadcasting, and the industrial hum it leaves behind outlives the shift that made it ([systems-echo.md](systems-echo.md) §7).

Three consequences shape every rule below:

1. **Income has a detection cost**, paid continuously, whether or not anyone is listening.
2. **Efficiency and quiet are opposed.** Every faction gets a different exchange rate between them, and that exchange rate *is* their economy.
3. **Where you refine matters as much as where you mine**, because refining is louder than extraction.

---

## 2. The Four Resources

| Resource | What it is | Where | Who uses it | Extraction SIG |
| --- | --- | --- | --- | --- |
| **Nodule** | Polymetallic seabed nodules — hulls, plate, structures. The bulk resource | All bands; densest Mid-Water | Everyone | 40–50 sustained |
| **Thermal Draw** | Heat and pressure differential tapped from vents — the power resource, consumed continuously rather than stockpiled | Thermal Veins, Shelf and Mid-Water | Everyone | 55–75 sustained at the tap |
| **Biomass** | Rendered fauna. Cheap, fast, morally simple to nobody | Wherever the Drift is healthy | Directorate at full rate; others at ~30% via rendering contracts | 45–60 during harvest |
| **Resonance Crystal** | The tech gate. Every faction's upper tech tier is crystal-locked | **Almost entirely Abyssal** | Everyone, insufficiently | 60–70 sustained |

Nodules and Thermal Draw are the working economy. Biomass is a faction-shaped bonus channel ([bestiary.md](bestiary.md) §5). **Resonance Crystal is the reason anybody goes deep at all** ([systems-depth.md](systems-depth.md)), and its scarcity is the clock every match runs on.

---

## 3. The Noise Curve

Yield and SIG are tied by rate, not by resource. A harvester that works slower is quieter, and every faction can choose to be poorer and safer.

| Throttle | Yield | Harvester SIG | Typical use |
| --- | --- | --- | --- |
| **Idle** | 0 | 8–18 | Waiting out a contact |
| **Trickle** | 40% | 22–28 | Contested ground, early scouting window |
| **Standard** | 100% | 40–50 | The default, and the reason you get found |
| **Overburden** | 140% | 62–75 | Deliberate. A four-minute announcement |

Overburden is not a trap option — the Consortium's whole doctrine is that being heard is survivable ([factions.md](factions.md)), and a Klaxon push funded by overburdened harvesters is a legitimate way to play. The point is that the throttle is a *decision surface*, visible on the SIG meter ([ui-ux.md](ui-ux.md) §3), not an efficiency setting nobody looks at.

---

## 4. Extraction, Refinement, Storage

The chain has three stages, and the noise is not evenly distributed across them.

| Stage | Structure | SIG | Notes |
| --- | --- | --- | --- |
| **Extract** | Harvester on a node | 40–50 | Mobile, retreatable, moderately loud |
| **Refine** | Refinery / smelter | **55–75 sustained** | Static, and the loudest permanent thing you own |
| **Store** | Pressure silo | 6–12 | Nearly silent, but a silo lost is a shift lost |

**Raw is quiet, refined is loud.** That produces the economy's central positional question: refine forward, near the nodes, and accept a loud installation on contested ground — or haul raw material home and pay in travel time and interception risk. There is no default correct answer, and maps are built to make the question live ([maps.md](maps.md)).

Storage has a hard cap per silo; overflow is not lost but is *stockpiled at the refinery*, where it raises that structure's SIG by up to +10 as it backs up. A player who out-produces their storage is audibly running hot.

---

## 5. Expansion and the Hum

Expansions are how a player scales and how a player gets located. Two mechanics govern the trade:

- **Industrial hum.** Mining leaves a slow-decaying Echo Mark ([systems-echo.md](systems-echo.md) §7) that reveals economic activity long after the harvesters have left. A scout that finds a hum has found not the enemy army but the enemy *budget*, which is more useful.
- **Read the hum, not the base.** Hum intensity scales with throughput, so an opponent with HYD ≥ 40 can estimate income within roughly ±20% without ever seeing a structure. Skilled play scouts economies, not armies.

Counter-play is real and cheap: **stopping the hauling** collapses the hum's intensity within a decay window, and a refinery placed inside a Thermal Vein field (PF 0.45) is meaningfully harder to locate than the same building in open water. Terrain is an economic decision.

**Measured, and one clause of that does not currently hold.** The hum is a leaky integrator — deliveries push its level up, time bleeds it down, and where it rests is throughput. Idling the harvesters drops it to nothing (audible in 9% of samples, mean intensity 0.004). Throttling to *Trickle* barely moves it (0.238 against Standard's 0.299), because a throttle changes how fast a hold fills and a round trip is dominated by travel — so throughput, and therefore the hum, is nearly unchanged. That is a property of §3's throttle rather than of the hum, and it is tracked separately.

---

## 6. The Four Economies

### Bathyarch Consortium — financed

Richest and least efficient. Consortium extraction is the highest-yield in the game and the loudest, and their unique instrument is **debt-berth financing**: a structure may be commissioned immediately against future income, arriving at full function and carrying an upkeep that scales with how long the debt runs. They can always afford the thing they cannot yet afford, and they pay for it forever.

Their weakness is structural rather than numerical — a Consortium economy at full tilt is audible across a third of the map, and cannot be made quiet by any means they own except the Baffle Barge, which is expensive, slow, and must be defended.

### Pelagia Commune — bloom-share

Most efficient, least defensible. Harvest SIG 18 where others sit at 50, and organic refineries that run at 30–40 instead of 55–75. Their income is not extraction but **bloom-share**: plateau blooms yield continuously, without a harvester loop, provided the plateau is theirs.

The catch is deliberate and is the Commune's whole balance: **bloom-share requires surface plateau nodes** ([systems-echo.md](systems-echo.md) §10). The quietest faction earns its living on the most exposed ground on the map, in the Shelf band where the Directorate cannot follow and where everyone can see them. Their economy is safe from being *heard* and permanently vulnerable to being *reached*.

### Abyssal Directorate — biomass

Cheapest per unit, scaling with the map's health. Directorate cohorts are inexpensive and their Biomass channel converts other players' noise into their income ([bestiary.md](bestiary.md) §5). They mine Nodules poorly and tap Thermal Draw worse — shallow infrastructure poisons them, exactly like their units do above 400 m.

Their real economy is the Abyssal band: free PR-3 access means they harvest Resonance Crystal with no refit cost while everyone else is still paying to arrive. The counterweight is that **Biomass yield collapses as Drift Health falls**, so the Directorate is the only faction with a direct incentive to keep the map alive, and the only faction whose income another player can destroy without ever attacking it.

### Hadron Knights — tithed

Thinnest economy in the game, by design and by population — 30,000 people cannot run an industrial base ([factions.md](factions.md)). Knights take a **tithe**: fixed periodic income from each chapter-house, independent of extraction, plus crystal cut at unmatched efficiency (2.2× everyone else's yield per node).

**Implemented flat per commander, not per structure**, and the next paragraph is why: an income paid per building would scale with map control, which is the one thing this economy is defined as not doing. The chapter-houses are the Order's nine home institutions in Resonance Fields ([factions.md](factions.md)) rather than things a player builds — they tithe to the Order, the Order funds the expedition, and taking ground does not change the stipend. It stops when the Bastion falls, because that is the expedition ending rather than the Order's income drying up.

The rate was set by measurement, not taste. Below 1.5 nodules/s the tithe *is* their whole income, because they cannot afford to produce at all and so never earn anything else; at 1.5 they reach roughly two thirds of the richest faction's income, which is thin rather than unplayable. Above it nothing improves. The step is superlinear because it is the point where the budget covers a hull, and a hull earns — which is this section's own claim about a budget spent once, showing up in the numbers.

They are the only faction whose economy does not scale with map control, which means a Knight player who has not converted their mid-game tech advantage into a decision loses to arithmetic. Every Knight loss is permanent — units cost lives the Order cannot replace — so their economy is really a *budget*, spent once.

---

## 7. Depth Economics

| Band | Nodule density | Crystal | Cost to work it |
| --- | --- | --- | --- |
| **Shelf** (0–400 m) | Low | None | Free; fully exposed; Directorate penalised |
| **Mid-Water** (400–1,800 m) | High | Trace | Standard refits, standard risk |
| **Abyssal** (1,800 m+) | Moderate | **Almost all of it** | PR-3 or crush attrition; descent is loud, ascent is slow |

Deep economy is a **round trip with a clock on it**. Descent is fast and deafening, so an Abyssal mining operation announces itself on arrival; ascent is slow and silent, so a haul that has to leave in a hurry cannot. The practical result is that abyssal extraction is run as raids, not as expansions, by everyone except the Directorate — and the Directorate's advantage in the deep is therefore an advantage in *tempo*, not merely in access.

---

## 8. Prototype Mapping

The simulation scaffold implements the Nodule economy as the classic C&C harvester loop:
drive to a field, mine, haul home, deposit at a Bastion or Refinery. Constants live in
`ECONOMY` and `HARVEST_THROTTLE` in `packages/shared/src/constants.ts`; the loop itself is
`packages/backend/src/sim/systems/harvest.ts`.

| Doc concept | Prototype today | Implementation note |
| --- | --- | --- |
| Nodule | **Implemented** — per-player stockpile, spent on units and structures | Harvesters carry 50 nodules per trip, mining 10/s at Standard throttle |
| Throttle states | **Implemented** — all four states of §3, per harvester | Mining SIG follows the throttle (12/25/45/68); yield scales 0/0.4/1.0/1.4 |
| Refining SIG | **Implemented** — the Refinery holds 65 SIG sustained (§4) | Forward refineries are real: any deposit structure works, the loud one is optional |
| Thermal Draw | **Implemented** — a rate, recomputed every tick and never banked | Vent taps on Thermal Vein terrain supply it; Foundries and Refineries consume it; a deficit slows production and nothing else |
| Biomass | **Implemented** — paid on a fauna kill, Directorate at full rate and everyone else at 30% | Yield scales with the region's Drift Health, which is the guard-rail against a Directorate snowball (§9): over-harvesting kills the region that pays them |
| Resonance Crystal | **Implemented** — Abyssal field, second stockpile, tech gate | See below |
| Depth economics (§7) | **Implemented** — the round trip has a clock on it | Harvesters issue their own depth orders: loud descent to the field, slow climb home |
| Industrial hum (§5) | **Implemented** — a decaying Echo Mark at the depot, intensity per delivered cargo | Keyed to throughput, not to the building: a refinery nobody hauls to is silent, and throttling collapses the hum as the deliveries stop |

### Thermal Draw in the scaffold

The only resource in the game that is a **rate**, and it is implemented as one: capacity and demand are recomputed from live structures every tick and the report is thrown away. Nothing accumulates, because anything that banked a surplus would turn this back into a stockpile with extra steps.

**The vent tap** is buildable only on Thermal Vein terrain, enforced server-side, and sustains 55–75 SIG per §2. That is the whole point of the structure: it is loud precisely where the ground is quiet, so tapping the game's best masking terrain (PF 0.45) is what makes that terrain worth contesting. Before it existed, the safest place to hide on any map was worth nothing.

**The deficit consequence is production speed, and only that.** A starved line runs slower, never stops — a frozen line is a spiral, because a player cannot build the tap that would fix it. The floor is 25%.

**The opening kit is self-sufficient.** The Bastion carries its own plant, sized to cover the pre-built Foundry and a first Refinery exactly. §2 places Thermal Draw in "Thermal Veins, Shelf and Mid-Water" — the vein is the concentrated source, not the only one — so a bastion on working ground has a trickle of its own. Without that the pre-built Foundry would start every match in deficit, making a tap a compulsory opening rather than a choice, and would be unplayable on a map with no vein terrain at all.

**Reaching a tap is a commitment.** New structures must rise within 1,200 m of one you already own, so on the Ventfront Divide a tap is two build-hops out from the base and sits in the contested middle. Capacity is tied to a place you have to reach and then hold, which is what makes a rate feel different from a stockpile at the table.

The [hazards](hazards.md) §1 interaction lands here too: a Consortium hull stabilising a vent earns **draw capacity**, since "energy boosts" is what the doc says and draw is now the power resource. And the best tap sites are in the vein band, which is exactly where vents erupt — a tap is a raid target and a weather casualty both.

### Resonance Crystal in the scaffold

One crystal field is seeded dead centre of the map at 2,400 m — Abyssal, so it cannot be
worked without committing to the descent, and contested because both sides need it for the
same reason. Constants live in `CRYSTAL` and `RESOURCE` in
`packages/shared/src/constants.ts`.

| Property | Value | Why |
| --- | --- | --- |
| Extraction SIG | Throttle SIG **+20** | Puts Standard-throttle crystal work at 65, mid-band for §2's 60-70, while leaving the throttle a live decision rather than something the resource overrides |
| Cut rate | 45% of nodule rate | The deep is slow work, which lengthens the exposure |
| Hold capacity | 20 (vs 50 nodules) | Dense, awkward cargo; more trips, more descents |
| Field depth | 2,400 m | Abyssal: PR-3, or crush attrition on a clock |

**The tech gate.** The four faction signature structures — Baffle Barge, Cantor, Sounding
Spire, Spore Veil — cost 120 crystal each, and the Abyssal Submersible costs 80. That is
one crystal-locked producible per navy plus the hull built to live where the crystal is,
which is §2's "every faction's upper tech tier is crystal-locked" at prototype scale.

**What makes it a raid rather than an expansion** (§7) is that the harvest loop issues its
own depth orders. A hauler dives to the field — loudly, because descent is deafening — cuts
slowly, and then climbs home at a third of the speed it went down. The exposure is not a
number in a table; it is the shape of the trip.

An earlier draft of the scaffold used a flat 5 nodules/minute abstraction; the cargo loop
replaced it because a positional economy — where the *route* between field and depot is
the thing you defend — is the half of the design the abstraction could not exercise, and
because 5/minute could never fund the roster's 50-750 nodule price range in a playable
match. [units.md](units.md) carries the current harvester figures.

---

## 9. Balance Guard-Rails

| Risk | Mitigation |
| --- | --- |
| Quiet economies simply win | Commune bloom-share is anchored to exposed Shelf plateaus; the quietest income is on the most reachable ground |
| Loud economies are unplayable | Consortium yield premium, best repair, and the Baffle Barge; being found is survivable for exactly one faction, and that is their identity |
| Directorate Biomass snowballs | Yield scales with Drift Health, which their own harvesting degrades, and every harvest cycle is a 45–60 SIG event at a location the region just heard |
| Knights starve out of every long game | The tithe is map-control-independent, so their floor never falls; their ceiling is meant to be low, and their win condition is meant to be early |
| Economic scouting becomes mandatory busywork | Hum is passive, persistent, and readable from range — you find economies by listening from safety, not by sending scouts to die |
| Throttling becomes a required micro chore | Three states, per-structure defaults, and a global toggle; a player who never touches it plays a coherent Standard-throttle game |

---

## Related

- **[systems-echo.md](systems-echo.md)** — why income is a detection event
- **[systems-depth.md](systems-depth.md)** — the Abyssal crystal gate and the cost of the round trip
- **[bestiary.md](bestiary.md)** — Biomass, Drift Health, and the income you can kill
- **[factions.md](factions.md)** — the doctrines these four economies express
- **[units.md](units.md)** — harvester stats and the abstract prototype pool
- **[maps.md](maps.md)** — node placement and the refine-forward question
