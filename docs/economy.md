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
| **Biomass** | Rendered fauna — what the cohort programme grows its hulls from. Cheap, fast, morally simple to nobody | Wherever the Drift is healthy | Directorate at full rate; others at ~30% via rendering contracts | 45–60 during harvest |
| **Resonance Crystal** | The tech gate. Every faction's upper tech tier is crystal-locked | **Almost entirely Abyssal** | Everyone, insufficiently | 60–70 sustained |

Nodules and Thermal Draw are the working economy. Biomass is a faction-shaped bonus channel ([bestiary.md](bestiary.md) §5). **Resonance Crystal is the reason anybody goes deep at all** ([systems-depth.md](systems-depth.md)), and its scarcity is the clock every match runs on. It is also the account every refit is priced in — the five fleet-wide upgrades of [systems-progression.md](systems-progression.md) §2, bought on the Slipway's line — so the deep, not a research timer, paces the mid-game.

---

## 3. The Noise Curve

Yield and SIG are tied to each other, not to the resource. A harvester that takes less is quieter, and every faction can choose to be poorer and safer.

| Throttle | Yield per trip | Harvester SIG | Typical use |
| --- | --- | --- | --- |
| **Idle** | 0 | 8–18 | Waiting out a contact |
| **Trickle** | 40% | 22–28 | Contested ground, early scouting window |
| **Standard** | 100% | 40–50 | The default, and the reason you get found |
| **Overburden** | 140% | 62–75 | Deliberate. A four-minute announcement |

**Yield is the load, not the cut.** The throttle sets how much a hauler takes before it turns for home — seventy nodules at Overburden where Standard takes fifty — and the cut rate is fixed, so the heavy load also holds the hull on the node longer at the louder setting. Scaling the *cut rate* instead is the reading that does not work, and it was in the scaffold long enough to be measured: a hold caps out either way and a round trip is dominated by travel, so a louder throttle saved a second and a half out of forty-five and banked exactly what Standard banked. A premium that pays nothing is not a decision surface, whatever the table says.

Six minutes on a home field, one harvester, one throttle held throughout:

| Throttle | Nodules/min | Mean harvester SIG | Against Standard |
| --- | --- | --- | --- |
| **Trickle** | 53 | 38.7 | 46% of the income |
| **Standard** | 117 | 41.0 | — |
| **Overburden** | 152 | 47.0 | 130% of the income |

Income tracks the load without matching it exactly, because time on the node is real: Trickle's short cut buys back a little of the forty per cent it gives up, and Overburden's long one costs a little of the forty per cent it takes. Mean SIG moves much less than the throttle's own SIG for the same reason in reverse — most of a round trip is travel, and the throttle only changes what a harvester sounds like while it is working.

**The throttle is also a lever on the map's clock.** Those numbers are nodules leaving the ground as well as nodules arriving home, so Overburden strips a field around 30% faster than Standard and Trickle takes half as much out of it. Against the cut rate that was not true — every setting emptied a field at nearly the same speed, because a hold capped at fifty either way — so "spend the field faster" is a decision the throttle now carries and did not before. On a map whose fields are finite it is the difference between a home field that outlasts the match and one that sends its haulers looking further out.

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

**Measured, and it holds.** The hum is a leaky integrator — deliveries push its level up, time bleeds it down, and where it rests is throughput. One harvester on flat water, one throttle held, resting level sampled over ninety seconds:

| Throttle | Nodules delivered | Resting hum | Hum per nodule |
| --- | --- | --- | --- |
| **Idle** | 0 | 0.000 | — |
| **Trickle** | 120 | 0.134 | 0.00111 |
| **Standard** | 250 | 0.289 | 0.00116 |
| **Overburden** | 350 | 0.398 | 0.00114 |

The last column is the bullet above, tested: the hum reads income to within a few per cent whichever throttle produced it, so a listener over the ±20% bar is reading a budget and not a hull count. Idling stops the deliveries outright and the mark decays away.

It did not hold until §3's throttle was fixed to scale the load rather than the cut rate. While it scaled the cut rate, throttling down to *Trickle* barely moved the hum — 0.238 against Standard's 0.299 — because it barely moved throughput, and this section had to carry a note saying so.

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

**Biomass is what a cohort costs, not a discount on what a hull costs.** The cohort hull — the **Chorister**, at 30 Nodules and 20 Biomass ([units.md](units.md)) — carries a Biomass price beside the Nodules every hull is written in, and the accounts are checked together and never exchanged: a commander rich in Nodules and short one rendering is refused exactly as a commander short of crystal is refused the tech tier. That is what "scaling with the map's health" means — the price is a roster fact and does not move, and the income that pays it rises and falls with Drift Health (§9). The rendering contracts the other three navies sell through credit the same account at a fraction, and the price is as faction-blind as every other price in the roster: the doctrine is carried by the rate, the way the Directorate's listening is carried by HYD rather than by a special case ([units.md](units.md), design notes). So "cheapest per unit" is a sentence about the Chorister, the cheapest hull in the game in Nodules, and not about the Abyssal Submersible, which is the crystal-locked deep hull and the second most expensive; the two sentences were true of different hulls, and the roster now carries both (issue #352, recorded in [units.md](units.md)'s design notes). §8 records the mechanism it is priced with.

Their real economy is the Abyssal band: free PR-3 access means they harvest Resonance Crystal with no refit cost while everyone else is still paying to arrive. The counterweight is that **Biomass yield collapses as Drift Health falls**, so the Directorate is the only faction with a direct incentive to keep the map alive, and the only faction whose income another player can destroy without ever attacking it.

### Hadron Knights — tithed

Thinnest economy in the game, by design and by population — 30,000 people cannot run an industrial base ([factions.md](factions.md)). Knights take a **tithe**: fixed periodic income from each chapter-house, independent of extraction, plus crystal cut at unmatched efficiency (2.2× everyone else's yield per node).

**Implemented flat per commander, not per structure**, and the next paragraph is why: an income paid per building would scale with map control, which is the one thing this economy is defined as not doing. The chapter-houses are the Order's nine home institutions in Resonance Fields ([factions.md](factions.md)) rather than things a player builds — they tithe to the Order, the Order funds the expedition, and taking ground does not change the stipend. It stops when the Bastion falls, because that is the expedition ending rather than the Order's income drying up.

**And nodules are cut at half the field's yield.** The tithe is the Order's income; the haulers are not an industry. A Knight harvester works a field like anyone's and the field depletes by what it cut, but the Order banks **0.5×** the nodules per load (`HADRON.NODULE_YIELD_MULTIPLIER`, applied at the deposit exactly as the crystal premium is) — 30,000 people cannot run an industrial base, and this is where that sentence becomes a number. The reason it has to: the tithe was calibrated in a baseline where nobody's haulers survived long enough to matter, and once matches decided (#440) the Knights were earning the tithe *and* a full extraction economy — 250–280 nodules a minute against a field of about 150, the richest navy on the map and an 80–100% duel win rate against every other navy (#454). With the halved cut and the tithe, four haulers earn about what the field earns with three: a floor that holds and a ceiling that is low, which is what this section has always said.

The rate was set by measurement, and the first answer was wrong in a way worth recording: **a flat income is proportionally larger in a poorer game.** Swept in a duel, where the field earns about 275 nodules a minute, 1.5/s looked like the knee. In the four-faction baseline the field earns 165, so the same tithe took the Knights to 177 — the richest faction on the map, contradicting this section's own first sentence. At 1.0/s they land on 108, the poorest of the four against 191, 178 and 145, and well clear of the 65 they starved at. Their win rate comes out level with the two richest factions, which is what a low ceiling over a floor that holds is supposed to look like.

The step is superlinear either way, because it is the point where the budget covers a hull and a hull earns — which is this section's claim about a budget spent once, showing up in the numbers.

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
| Nodule | **Implemented** — per-player stockpile, spent on units and structures | Harvesters cut 10/s and carry 50 nodules per trip at Standard throttle |
| Throttle states | **Implemented** — all four states of §3, per harvester | Mining SIG follows the throttle (12/25/45/68); the load scales 0/0.4/1.0/1.4, so a trip brings home 0/20/50/70 |
| Refining SIG | **Implemented** — the Refinery holds 65 SIG sustained (§4) | Forward refineries are real: any deposit structure works, the loud one is optional |
| Thermal Draw | **Implemented** — a rate, recomputed every tick and never banked | Vent taps on Thermal Vein terrain supply it; Foundries and Refineries consume it; a deficit slows production and nothing else |
| Biomass | **Implemented** — paid on a fauna kill, Directorate at full rate and everyone else at 30%; spent as the third column of a price, refused and debited on the same server path as Nodules and Crystal | Yield scales with the region's Drift Health, which is the guard-rail against a Directorate snowball (§9): over-harvesting kills the region that pays them. The Chorister is priced in it — see below |
| Resonance Crystal | **Implemented** — Abyssal field, second stockpile, tech gate | See below |
| Depth economics (§7) | **Implemented** — the round trip has a clock on it | Harvesters issue their own depth orders: loud descent to the field, slow climb home |
| Industrial hum (§5) | **Implemented** — a decaying Echo Mark at the depot, intensity per delivered cargo | Keyed to throughput, not to the building: a refinery nobody hauls to is silent, and throttling down drops the hum because the loads shrink with it |
| Refits ([systems-progression.md](systems-progression.md) §2) | **Designed, not built** — five fleet-wide upgrades priced in Nodules and Crystal, the Pressure Refit at a signature structure's 120 | Each is a `Priced` roster entry through the same `priceOf`, `affords` and `charge`, produced on the Slipway's line, which #461 built |

### Thermal Draw in the scaffold

The only resource in the game that is a **rate**, and it is implemented as one: capacity and demand are recomputed from live structures every tick and the report is thrown away. Nothing accumulates, because anything that banked a surplus would turn this back into a stockpile with extra steps.

**The vent tap** is buildable only on Thermal Vein terrain, enforced server-side, and sustains 55–75 SIG per §2. That is the whole point of the structure: it is loud precisely where the ground is quiet, so tapping the game's best masking terrain (PF 0.45) is what makes that terrain worth contesting. Before it existed, the safest place to hide on any map was worth nothing.

**The deficit consequence is production speed, and only that.** A starved line runs slower, never stops — a frozen line is a spiral, because a player cannot build the tap that would fix it. The floor is 25%.

**The opening kit is self-sufficient.** The Bastion carries its own plant, sized to cover the pre-built Foundry and a first Refinery exactly. §2 places Thermal Draw in "Thermal Veins, Shelf and Mid-Water" — the vein is the concentrated source, not the only one — so a bastion on working ground has a trickle of its own. Without that the pre-built Foundry would start every match in deficit, making a tap a compulsory opening rather than a choice, and would be unplayable on a map with no vein terrain at all.

**Reaching a tap is a commitment.** New structures must rise within 1,500 m of one you already own, so on the Ventfront Divide a tap is two build-hops out from the base and sits in the contested middle. Capacity is tied to a place you have to reach and then hold, which is what makes a rate feel different from a stockpile at the table.

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
| Hold capacity | 20 at Standard (vs 50 nodules) | Dense, awkward cargo; more trips, more descents. The §3 throttle scales it like any other hold |
| Field depth | 2,400 m | Abyssal: PR-3, or crush attrition on a clock |

**The tech gate.** The four faction signature structures — Baffle Barge, Cantor, Sounding
Spire, Spore Veil — cost 120 crystal each, and the Abyssal Submersible costs 80. That is
one crystal-locked producible per navy plus the hull built to live where the crystal is,
which is §2's "every faction's upper tech tier is crystal-locked" at prototype scale.

**Nothing on the path *to* crystal may be priced in crystal**, and that rule had to be
enforced once. The rung (#461) put a crystal price on the Slipway and on the Sower, on the
reasonable-sounding ground that a second yard is "the same kind of decision". It is not, and
the difference is a circle. Only
the Abyssal Directorate's harvester is rated for 2,400 m; every other navy reaches that water
by renting a band, and there are exactly three sources of a rented band in the game — the
Sounding Spire, the Cantus, and the Sower. The Order's is a 400-nodule Foundry hull, so it
opens the deep whenever it likes. The Commune's was a Slipway hull at 80 crystal behind a
yard at 120, so the navy whose entire doctrine is *changing* deep water needed the crystal to
buy the key to the crystal. The Consortium has no source at all: its route is the Pressure
Refit ([systems-progression.md](systems-progression.md) §2), which is designed and not built
and would be produced on that same Slipway line. Two of four navies could not reach the
Abyssal band by any implemented means, and none of them ever built a second yard — measured
across every map (#491).

Both prices are now nodules. Nothing here is cheaper to *field*: the crystal stays on the
producibles above, and on the Dredge — a hull the Directorate fields, and the one navy that
needs no path at all. What moved is that reaching the gate no longer requires having reached
it.

**What makes it a raid rather than an expansion** (§7) is that the harvest loop issues its
own depth orders. A hauler dives to the field — loudly, because descent is deafening — cuts
slowly, and then climbs home at a third of the speed it went down. The exposure is not a
number in a table; it is the shape of the trip.

An earlier draft of the scaffold used a flat 5 nodules/minute abstraction; the cargo loop
replaced it because a positional economy — where the *route* between field and depot is
the thing you defend — is the half of the design the abstraction could not exercise, and
because 5/minute could never fund the roster's 50-750 nodule price range in a playable
match. [units.md](units.md) carries the current harvester figures.

### Biomass in the scaffold

The third account, and since issue #351 the third column of a price. A hull or structure in
`packages/shared/src/units.ts` and `structures.ts` is priced in Nodules (`cost`) and, where
it is locked to them, in Resonance Crystal (`crystalCost`) and Biomass (`biomassCost`).
`priceOf` in `packages/shared/src/economy.ts` turns those columns into one sum, and
`affords` and `charge` are the only way anything is refused or paid. The server
(`Match.build`, `Match.produce`), the commander AI's running purse and the client's command
bar all call the same three functions on the same roster entry, so the price a button shows
and the price the server charges cannot drift — they are one figure, written twice.

| Property | Value | Why |
| --- | --- | --- |
| Accounts | Nodules, Crystal, Biomass — checked together, never exchanged | §6: the Directorate's living is a different resource, not a discount on the same one. A commander short one rendering is refused however rich in Nodules |
| Rendering contracts | The same account, at `DRIFT.RENDERING_CONTRACT_RATE` (0.3) | §2's "others at ~30%". The price is as faction-blind as every other price in the roster; the doctrine is the rate |
| Where a refusal shows | The button, greyed, and on a press the account it fell short in — *Abyssal Submersible: 80 crystal short* | [ui-ux.md](ui-ux.md) §7 forbids the silent grey-out, and naming the account names the readout to watch. The same wording serves a Biomass price the day one exists |
| The roster's Biomass column | **The Chorister, at 30 Nodules and 20 Biomass** ([units.md](units.md), #352); since #461 the Precentor and the Dredge, and since #501 the Verger at 140 and 30. The Abyssal Submersible stays the crystal-locked deep hull, at 260 Nodules and 80 Crystal | One mid-water rendering at full rate; a third of one through a contract, which is how the hull is the Directorate's without a faction lock. Under a strained region the same rendering pays 16.5 and is refused, so §9's guard-rail bites at the first hull rather than the tenth |

**Why the mechanism shipped ahead of the entry.** [mission-intake.md](mission-intake.md)
§13 found that *"cheap expendable units"* — [campaign.md](campaign.md) §6 row 2's teaching
target — cannot be taught by any mission until spending exists, and that the mission which
will ask is the Directorate's fifth. The account, the query over it (#330) and the price
(#351) each landed before the hull, so the entry (#352) was a roster row and nothing else:
no new path, no new account. `packages/shared/test/economy.test.ts` holds the roster to it —
the Biomass column names the cohort programme's hulls and nobody else's (the Chorister and,
since wave 1 of [roster-plan.md](roster-plan.md), the Verger, both locked by the price alone;
the Precentor and the Dredge, locked besides), and the Chorister the cheapest in Nodules.

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

## 10. Berths — the population cap

Every hull afloat is crewed from somewhere, and a crew is quartered in a **berth**: a
hull-house on the base that feeds, airs and sleeps it. A navy can field as many hulls as it
has berths for, and berths are infrastructure — which in this game means they hum.

### The rule

- Each hull occupies a number of berths set by its tonnage, listed on its stat block in
  [units.md](units.md): one for a Light Scout, a Harvester, a Chorister, a Spinner, a
  Precentor or a Drifter; two for a Corvette, a Clarion, an Abyssal Submersible, a Tender, a
  Sower, a Cantus, a Reciter, a Verger or an Antiphon; three for a Cruiser, a Dredge or a
  Freighter; four for a Bulwark. A transport's *hold* is a separate number and is not
  quarters: what it carries keeps its own berths ([systems-echo.md](systems-echo.md) §3).
- The **Bastion grants 16 berths** and every commissioned **Foundry grants 8 more**, to a
  hard **ceiling of 40** per commander — and so does the **Slipway**, the second yard
  [units.md](units.md) designs (#461), so the ceiling is a Bastion, two Foundries and a
  Slipway. Nothing else grants any: a Refinery is a depot, a turret has no crew to speak of,
  and the four signature structures are instruments.
- A hull counts against the berths from the moment it is **queued** — the crew is called
  up when the keel is laid, not when it launches — and stops counting when it dies. A
  Foundry lost mid-match takes its eight berths with it; the hulls already afloat stay
  afloat, and nothing new is laid down until the count is back under the grant.
- The cap is a **production** rule, enforced on the same server path as the price
  (`Match.produce`): a mission that hands the player a fleet, or a beat that lifts one in,
  is not asking a yard, and the runtime is not bound by it.

### Why it is an argument about sound

Supply in the classic RTS mould is a silent number that goes up when you build a house. Here
the only way to raise the ceiling is a **Foundry** — 25 SIG idle and 55 while the line runs,
the second-loudest permanent thing you can own — so a base that can field forty berths is a
base with three Foundries humming on it. The size of the army you *could* have is audible
before the army is. That is the premise of this document applied to the one number every RTS
has and none of them price: **capacity is loud**.

The other half of the argument is the Directorate. [factions.md](factions.md) gives them
*very many, cheap, slow*, and berths are the sentence that makes that true without making it
free: forty berths is forty Choristers for them and thirteen Cruisers for the Consortium. The
swarm is real, it is bought in Biomass, and it fills the same forty berths everyone else
does — so "very many" is a shape the tonnage takes, not an exemption from it.

### Why the ceiling is forty

The ceiling is the engine's promise as much as the design's. Detection is priced per
emitter–listener pair ([tech-stack.md](tech-stack.md), "What keeps the pass inside 2 ms"),
and a match with no upper bound on hulls has no upper bound on what the Echo pass costs. At
the ceiling a four-commander skirmish is at most 160 hulls, the structures that granted
them, the Drift's 48 creatures and whatever ordnance is in the water — the ~250-entity mark
at which the pass meets its budget on the reference machine. A larger ceiling is a design
decision that has to be paid for in that pass first; a smaller one is free.

### Prototype mapping

| Doc concept | Prototype today | Implementation note |
| --- | --- | --- |
| Berths per hull | **Implemented** — `berths` on every stat block in `packages/shared/src/units.ts` | Transcribed from [units.md](units.md); a hull without the field cannot be built |
| Grant and ceiling | **Implemented** — `BERTHS` in `packages/shared/src/constants.ts` | SPEC, this section. Bastion 16, Foundry +8, ceiling 40 |
| Enforcement | **Implemented** — `Match.produce` refuses past the grant; queued hulls count | The command bar greys the button with the reason, and the HUD's top bar reads the count |
| Loss of a Foundry | **Implemented** — the grant is recounted every pass from what is standing | A commissioned Foundry only; a site still under construction grants nothing |

---

## Related

- **[systems-echo.md](systems-echo.md)** — why income is a detection event
- **[systems-depth.md](systems-depth.md)** — the Abyssal crystal gate and the cost of the round trip
- **[bestiary.md](bestiary.md)** — Biomass, Drift Health, and the income you can kill
- **[factions.md](factions.md)** — the doctrines these four economies express
- **[units.md](units.md)** — harvester stats and the abstract prototype pool
- **[maps.md](maps.md)** — node placement and the refine-forward question
- **[systems-progression.md](systems-progression.md)** — what the crystal buys after the rung: refits, and the Hold Refit's effect on the hum
