Units — Prototype roster

**Glossary:** See [Glossary](glossary.md) for SIG, PF, HYD, PR and Resolution Tier definitions.

This document expands the prototype roster with concise stat tables, cost/production notes, and a playtest plan focused on verifying SIG ⇆ PR interactions across biomes.

Unit stat format

- SIG: reported as (idle / cruise / firing-burst)
- HYD: Hydrophone Rating, 0–100 — passive listening sensitivity (see systems-echo.md §3)
- PR: Pressure Rating (integer)
- Cost: Nodules, the account every hull is written in. A hull locked to Resonance Crystal or
  Biomass lists that too (economy.md §2, §8); the accounts are checked together and never
  exchanged
- Build time: seconds (prototype simulation)
- Berths: what the hull's crew occupies on the base, against the commander's grant
  (economy.md §10). Tonnage, not headcount: a Cruiser is three, a Chorister one
- Hold: for a transport, the berths of hull it carries (systems-echo.md §3, "A hull in a
  hold"). Tonnage carried, not crew: a hold of six takes three Corvettes or six scouts. The
  Hold Refit of systems-progression.md is a harvester's cargo hold, and not this
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
- Berths: 1 (economy.md §10)
- Speed: Very high
- Notes: Extremely low baseline SIG; excels in Kelp Forest and Thermal Veins. Fragile; primary scouting platform.

Corvette

- Role: Strike / raiding
- SIG: 28 / 28 / +25
- HYD: 50 (the baseline listener — the propagation model's BASELINE_HYD is calibrated to it)
- PR: 2
- Cost: 120
- Build time: 30s
- Berths: 2 (economy.md §10)
- Speed: High
- Notes: Versatile skirmisher. Good balance of noise and combat capability.

Cruiser

- Role: Fleet anchor / command
- SIG: 55 / 65 (active systems) / +30
- HYD: 65 (the "heavy sensors" below, made a number — a command hull hears for the fleet)
- PR: 2
- Cost: 420
- Build time: 90s
- Berths: 3 (economy.md §10)
- Speed: Medium
- HP: 1200
- Notes: Heavy sensors and sustained combat presence. Produces sustained SIG when power systems are online.

Abyssal Submersible (Directorate)

- Role: Deep operations / raiding
- SIG: 22 / 28 / +20
- HYD: 85 (the best mobile ears in the game — the Directorate's "best HYD by a wide margin",
  systems-echo.md §8, is carried by their native hull)
- PR: 3
- Cost: 260, plus 80 Resonance Crystal — the crystal-locked hull, built to live where the
  crystal is (economy.md §8)
- Build time: 45s
- Berths: 2 (economy.md §10)
- Speed: Medium
- Notes: Born to depth; no refit required for abyssal pressure. Strong HYD synergy; benefits from Directorate listening mechanics.

Chorister (Directorate)

- Role: Cohort hull — the array. Picket, screen, and numbers
- SIG: 16 / 24 / +15 (the floor of the 16–35 band every Directorate hull sits in,
  habitats-art-brief.md; grown chitin over a pressure bladder has no engine to speak of)
- HYD: 75 (a cohort is a listener before it is anything else — above the Light Scout's 70,
  below the Submersible's 85, and the Cantor's +25 takes it to the 95 cap)
- PR: 2 on the hull. The Directorate's PR-3 baseline lifts it to 3 for nothing
  (systems-depth.md §3), so for them it is a deep hull that costs no crystal; anyone else
  buying one through a rendering contract gets a Mid-Water hull, and the Abyssal band stays
  crystal-gated (economy.md §7)
- Cost: 30, plus 20 Biomass — the cheapest hull in the game in Nodules, and the only one
  priced in the account that rises and falls with the map's health (economy.md §6, §8).
  A Draymaw's rendering (22) pays for one, a Hollow's (35) for one and change, a Sounder's
  (260) for a shift of thirteen. Through a rendering contract at 30%, the same Draymaw pays
  for a third of one — which is the whole of why the hull is the Directorate's without a
  faction lock (design notes)
- Build time: 10s
- Berths: 1 (economy.md §10)
- Speed: Slow (the slowest combat hull in the roster — factions.md, "Very many, cheap, slow")
- HP: 200
- Hull: 50 m — the shortest in the roster, and beneath a Sounder's notice (bestiary.md §4:
  the colossus grinds hulls of 95 m and up, which is the Submersible exactly)
- Weapon: 20 damage at 450 m, 1.5 s cycle (prototype). Not a §9 band; the roster's own
  arithmetic, and `ttkBands.test.ts` holds it: a Corvette kills one inside the Light Scout's
  ≤ 6 s, a Chorister duel lasts as long as a Corvette duel, and one alone needs thirty
  seconds against a Corvette. "Expendable" is a sum, not a claim
- Notes: Grown, not built — the cohort programme's own hull (economy.md §2). Quiet alone and
  loud in company: four idling in one Drift cell cross the ledger's 60 (bestiary.md §6), so
  a cohort massed on the ground that pays for it wears that ground — economy.md §9's
  guard-rail written into the hull. No torpedo tubes. Above 400 m the shallow penalty
  applies to it as to every hull the Directorate crews.

Clarion (Knights)

- Role: Line hull — the cone made a ship. Strike, escort, and the Order's answer
- SIG: **62 / 62 / +10** — and the first two are **cone** figures, not compass ones.
  [systems-echo.md](systems-echo.md) §8 measures a Knight hull's signature from its own bow:
  the listed 62 is what a listener standing ahead of it hears, 21.7 is what a listener on the
  beam hears, and 6.2 is what a listener astern hears. Averaged over the compass the term
  takes 62 to **27.9**, which is a Corvette's 28 — §8's balance clause, solved rather than
  chosen, and the whole reason the entry is 62 and not some rounder number. **The Clarion is
  the Corvette with its noise aimed**: louder than one in front, quieter than one behind,
  and level with one over the circle
- The firing figure is the Order's, not the hull's: energy is a different weapon class
  ([systems-combat.md](systems-combat.md) §3, §11), and the class replaces a hull's burst
  outright at +10 rather than scaling it. A 2.2×'d kinetic burst would be a number this hull
  could never emit, so `packages/shared/src/units.ts` reads it from `FACTION_COMBAT` instead
  of listing one
- HYD: 50 — a Corvette's ears exactly, and deliberately. §8: the term "changes what a Knight
  emits and never what a Knight hears", so everything this hull buys is on the emitting side
  and the trade is entirely positional
- PR: 2 — the Hadron baseline, so the hull grants nothing. The Order rents depth from the
  Sounding Spire's +1 ([factions.md](factions.md), "projects access"); a deep Knight hull
  would buy for 180 nodules what the doctrine charges 750 for
- Cost: 180. No Resonance Crystal — the Order's crystal goes into the Spire
  ([economy.md](economy.md) §2), and the Abyssal Submersible stays the roster's crystal-locked
  hull. **Two Clarions cost what three Corvettes cost**, which is the choice a Knight commander
  makes at the yard: numbers, or facing
- Build time: 40s
- Berths: 2 (economy.md §10)
- Speed: 75 (below the Corvette's 85 — a longer hull built around a bow array)
- HP: 420
- Hull: 90 m
- Weapon: 60 damage at 700 m, 2.25 s cycle (prototype). A third more reach and a heavier
  discharge than a Corvette, paid for on the cycle — sustained damage lands at 26.7/s against
  the Corvette's 27.8. Inside [systems-combat.md](systems-combat.md) §9's bands on all four
  counts, and `ttkBands.test.ts` holds them
- **Crystal-locked: no. Faction-locked: yes — and it is the roster's first.** See the design
  note below; the short version is that a cone figure is unreadable without the term, and the
  term is one navy's
- Notes: The hull the directional term was written for, and the one the Order's missions have
  been short of since [mission-aptitude.md](mission-aptitude.md). A Clarion travelling at a
  listener is the loudest thing that listener will hear all match; a Clarion travelling away
  is quieter than a Corvette running silent. *Never travel at a listener* is a rule about
  routes rather than about a button (§8), and this is the hull that makes it expensive to
  forget. It does not change the seven Order mission literals, which still field generic
  hulls Knight-rigged and still say so — switching one is a document's decision before it is
  a literal's

Harvester

- Role: Resource production (economy)
- SIG: 18 (idle) / mining follows the throttle — 12 / 25 / 45 / 68 (see economy.md §3)
- HYD: 30 (dredge gear deafens its own hydrophones — deliberately below the HYD-40 floor
  for reading Echo Marks, systems-echo.md §7: a harvester cannot even read the residue
  of a fight, so escorting the economy is a real job)
- PR: 1–2 (variant)
- Cost: 80
- Build time: 20s
- Berths: 1 (economy.md §10)
- Production: 50-nodule cargo per trip at Standard throttle, cut at a flat 10/s on the node;
  the throttle scales the load, not the cut, so Overburden hauls 70 and stands there longer
  for it (economy.md §3). Income is the round trip, so route length is part of the price
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
- Berths granted: 16 (economy.md §10)
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
- Berths granted: +8 each while commissioned, to the ceiling of 40 (economy.md §10)
- Notes: A producing base is audibly producing. Also the only thing that raises the berth
  ceiling, which is why a base that *could* field forty hulls hums before it does.

Sentinel Turret (Structure — all factions)

- Role: Static defence
- SIG: 12 idle / +30 firing burst
- HYD: 55
- HP: 1000
- Cost: 250
- Build time: 30s
- Damage: 50 at 700 m, 2.25 s cycle — solved from [systems-combat.md](systems-combat.md)
  §9's band: a Corvette in ~18 s. It deters and punishes; it does not delete
- Notes: An ambush predator — near-silent until it fires, then it tells the region.

Construction rules (prototype): sites must rise within 1,500 m of an existing own
structure — the same 1,500 m a Standing Wave pairs across, so a Spire chained off its partner
always pairs (#372) — broadcast at SIG 70 for the whole build time, and start at 10% hull. See
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
  load-bearing (some allied unit under the aura is genuinely below its own PR) **or an
  interval is held**: a Spire paired into a Standing Wave corridor sings at 80 from both
  ends for as long as the corridor stands, whatever is under it
  ([mission-standing-wave.md](mission-standing-wave.md) §4 — a hazard nobody can hear is
  confusion, not dread). Deep play under a spire is never quiet; that is the price of
  rented depth, and a kill-line announces itself for the same reason.
- PR: 2
- Cost: 750
- Build time: 150s
- Effect: Grants PR+1 to allied units within 600 m and can form Standing Wave corridors when two nodes pair.
- Notes: High-cost strategic structure; transforms local depth economics.

The rung, and two hulls a navy (#436, transcribed in #461)

Status: **transcribed.** Every entry below is in `packages/shared/src/units.ts` and
`structures.ts`, each SPEC comment citing its stat block here, and `unitAvailableTo` returns
true for exactly the navy each hull is written for. Every entry was written to the roster's own
rules — a stat line that is an argument about sound or depth, a berth figure, a weapon inside
[systems-combat.md](systems-combat.md) §9's bands, and a faction lock only where the entry
cannot be read outside the navy — so that transcribing one was a literal's job and not a design
decision. The effect hulls run in `packages/backend/src/sim/systems/hullEffects.ts` and the
auras system; their figures are `HULL_EFFECTS` in `constants.ts`.

Why this exists: three of the four navies field an identical combat roster, one hull in the
game carries a faction lock, and Resonance Crystal — "the tech gate for every faction"
([economy.md](economy.md) §2) — gates four structures and one hull. That is a one-rung tree
with the rung at the top. [factions.md](factions.md) promises four armies (*few, heavy,
tough · many, fast, fragile · very many, cheap, slow · very few, elite, precise*) and the
roster delivers one army in four colours. The shape below is: **one more yard**, crystal-locked,
and **two hulls a navy** — the first at the Foundry, so it is an opening; the second behind the
rung, so the crystal is a decision about *what* to field and not only about where.

Slipway (Structure — all factions) — the rung

- Role: The second yard. Produces each navy's second exclusive hull, and nothing the Foundry
  already builds
- SIG: 30 idle / **70 while the line runs** — louder than a Foundry's 55, and the loudest line
  in the base. A navy building its upper tier is audibly building it, which is the whole of
  [economy.md](economy.md) §1 applied to tech: the ambition is heard before the hull is
- HP: 2500
- Cost: 600 — **Nodules only**, which is a correction rather than a discount. It carried a
  signature structure's 120 Crystal on the reasoning that it was "the same kind of decision:
  the deep, spent on a building", and the decision it actually made was the opposite one.
  [economy.md](economy.md) §8 names the crystal-locked producibles exactly — the four
  signature structures and the Abyssal Submersible — and this yard is in neither group: it
  is shared, and the price was added past what the doc specifies. The consequence was a
  circle. Crystal is Abyssal, so working it needs PR-3; of the three sources of a rented PR
  in the game the Commune's is a hull *this yard builds*, and the Consortium has none at all
  — so two navies needed the rung to reach the crystal that bought the rung, and neither
  ever built one (#467, #491). The crystal stays where §8 puts it: on what the yard lets you
  **field**
- Build time: 120s
- Berths granted: +8 while commissioned, to the ceiling of 40 ([economy.md](economy.md) §10) —
  so the ceiling is a Bastion, two Foundries and a Slipway, and a navy that wants forty berths
  has to want the rung
- Notes: One per navy is enough and two are allowed; the second buys a line, not a tier. A
  Slipway lost mid-match takes its eight berths and its line with it — the hulls it launched
  stay afloat
- The refit line: every one of the five fleet-wide refits in
  [systems-progression.md](systems-progression.md) §2 is produced here, at the same 70, and
  occupies the line a hull would. A navy refitting is a navy not launching its second hull,
  and a second Slipway is how it does both

Bathyarch Consortium — *few, heavy, tough*

Tender (Foundry)

- Role: The repair hull. The Consortium's identity is *best repair* and nothing in the
  roster repairs; this is the hull that makes attrition a doctrine rather than a word
- SIG: 48 / 55 / — (no weapon). **+12 while working**: a floating workshop is pumps,
  welding and hull plate, and a force that is healing is a force that is heard. A Consortium
  push repairs *behind* the Baffle Barge or it repairs in the open
- HYD: 40
- PR: 2
- Cost: 320
- Build time: 50s
- Berths: 2
- Speed: 45
- HP: 900
- Effect: Restores 15 HP/s to one allied hull within 300 m, nearest first. Never touches
  unhealable damage ([systems-depth.md](systems-depth.md) §2): crush and sour stay crushed and
  sour, which is what keeps depth a commitment even for the navy with the tenders
- Faction-locked: yes. The repair rate is the Klaxon's other half — a navy built to survive
  being heard needs the thing that makes surviving cumulative — and a Commune Tender would be
  the quietest repair in the game bolted onto the navy that never stands still to use it

Bulwark (Slipway)

- Role: The heavy. Line-breaker, torpedo-eater, and the hull built to stand in front of a
  Bastion and stay there
- SIG: **70 / 75 / +30** — the loudest hull in the game, and the Klaxon is never off it:
  +12% damage while SIG > 60 is a Bulwark's resting state, not a choice
- HYD: 35
- PR: 2
- Cost: 700
- Build time: 120s
- Berths: 4 — a Cruiser and a third, in tonnage, which is what makes a Bulwark line the
  Consortium's whole grant
- Speed: 30 — the slowest hull in the roster
- HP: **2400**. §9: *survives three torpedoes, dies to four* is the Cruiser's band; a
  Bulwark survives six. "Armour that makes surviving the torpedo the plan"
  ([systems-combat.md](systems-combat.md) §11) is this hull's stat line
- Weapon: 220 damage at **800 m**, 6.0 s cycle (36.7/s). Outranges a Sentinel Turret's
  700 m, which is the point: a Bulwark shoots the static defence from outside it, and the
  Bastion behind it from inside its own hull's tolerance. Bands to hold on transcription:
  kills a Corvette in ≥ 12 s (two cycles), a Bastion alone in ~135 s, and dies to Corvette
  guns in ≥ 82 s — an anchor that does not fall to chip damage, §9's rule for the Cruiser
  applied twice over
- Faction-locked: yes — "few, heavy, tough" is the navy, and a hull that is loud by
  construction in a navy that is punished for being loud would be a Corvette with a worse
  price

Pelagia Commune — *many, fast, fragile*

Spinner (Foundry)

- Role: The mine-layer. The Commune is the mine navy ([systems-combat.md](systems-combat.md)
  §11 — grown, living mines, cheaper and more of them) and no hull in the roster lays them at
  more than one
- SIG: **8 / 14 / —** — no weapon; a Spinner is quieter running than a Light Scout idling
- HYD: 55
- PR: 1
- Cost: 150
- Build time: 25s
- Berths: 1
- Speed: 80
- HP: 260
- Effect: Carries **4 mines** against the roster's one, and regrows one every 40 s while
  inside a Spore Veil or within 300 m of a Bastion. Laying is silent; the mine's own trigger
  bar is §6's and unchanged
- Faction-locked: yes. The Commune's mine cap (18 against 12) is the doctrine and this hull
  is the way to reach it; the Consortium with Spinners would be the loud navy laying the quiet
  navy's wall

Sower (Slipway)

- Role: The terraformer. *Deepbloom structures slowly convert Abyssal tiles into habitable
  ones* ([factions.md](factions.md)) has been the Commune's headline for as long as the
  document has existed and nothing in the game does it. This is the first thing that does,
  in the one form the simulation can already carry: rented depth ([systems-depth.md](systems-depth.md)
  §3, the Sounding Spire's grant)
- SIG: 20 / 26 / — (no weapon). **45 while seeding** — the bloom is a chemical roar, and a
  Commune force that has made the deep habitable has told the map where
- HYD: 60
- PR: **2** — the only Commune hull above PR-1, grown for the water it plants
- Cost: 380 — **Nodules only**. It was crystal-locked "like the Submersible, for the same
  reason: it is the hull built to live where the crystal is", but the Submersible *works*
  the crystal and this hull is what makes the crystal workable, so the same reason points
  the other way: a key priced in the thing it unlocks is not a price, it is a wall. Symmetry
  with the Order settles it — the Cantus grants the same +1 PR by standing still, is built at
  the Foundry, and costs 400 Nodules and no crystal, so the Knights open the deep whenever
  they choose to pay for it. This is the Commune's answer to the same water, priced the same
  way (#467, #491)
- Build time: 70s
- Berths: 2
- Speed: 55
- HP: 500
- Effect: After 20 s stationary it is *seeded*, and grants **+1 PR within 400 m** to allied
  hulls for as long as it stands there. A PR-1 Corvette under a Sower works Mid-Water; under a
  Sower and a second Sower it does not go deeper — the grant does not stack, exactly as the
  Spire's does not
- Faction-locked: yes — the entry is a bloom, and the Directorate would use it to be somewhere
  it was already born to be

Abyssal Directorate — *very many, cheap, slow*

Precentor (Foundry)

- Role: The ears on the move. The Cantor's dome does not travel; a swarm that arrives in
  numbers has to know first *where it is going*
- SIG: 12 / 18 / — (no weapon)
- HYD: **95** — the cap, mobile. The best ears in the game, on a hull that is only ears
- PR: 3 (PR-2 on the hull, the Directorate's baseline lifting it — the Chorister's rule)
- Cost: 200, plus 30 Biomass
- Build time: 30s
- Berths: 1
- Speed: 50
- HP: 220
- Effect: Grants **+10 HYD within 500 m** to allied hulls, capped at 95 — a Cantor's dome at a
  third of the radius, moving at the swarm's pace. Under a Cantor as well it adds nothing: the
  cap is the cap
- Faction-locked: yes. A 95-HYD hull is the Listening made a ship; the Consortium with
  Precentors would hear what its doctrine says it does not need to

Dredge (Slipway)

- Role: The hull for the floor of the map. The crystal field sits at 2,400 m and every navy
  raids it; the Directorate is meant to *hold* it, and a PR-3 hull under crush at 2,400 m
  ([systems-depth.md](systems-depth.md) §3) holds it on a clock
- SIG: 40 / 52 / +25 — loud for a Directorate hull, on purpose: a Dredge at the field is the
  tell that the field is held
- HYD: 70
- PR: **4** — the only PR-4 entry in the roster. Nothing below the Abyssal floor crushes it
- Cost: 450, plus 60 Biomass and 40 Resonance Crystal — three accounts, the first hull priced
  in all of them
- Build time: 80s
- Berths: 3
- Speed: 35
- HP: 1400
- Weapon: 120 damage at 650 m, 3.0 s cycle (40/s). Bands to hold: kills a Corvette in ~12 s
  and a Cruiser in ~30 s; dies to Corvette guns in ~50 s
- Faction-locked: yes — a PR-4 hull sold to any navy with a rendering contract would sell the
  bottom of the map, and [economy.md](economy.md) §7 makes the deep a thing somebody pays for

Hadron Knights — *very few, elite, precise*

Cantus (Foundry) — the early tempo tool

- Role: Projected depth, mobile and cheap. The Order's win condition "is meant to be early"
  ([economy.md](economy.md) §9) and its cheapest way down was a 750-nodule, 120-crystal Spire on
  a 150 s build. This is a Spire's grant on a hull, at a third of the price and none of the
  crystal, so two Clarions and a Cantus can raid the field in the opening
- SIG: **10 / 10 / —** moving; **80 while singing** — the Spire's figure, for the Spire's
  reason: rented depth is never quiet
- HYD: 50
- PR: 2
- Cost: 400
- Build time: 60s
- Berths: 2
- Speed: 55
- HP: 600
- Effect: Stationary for 10 s it *sings*: **+1 PR within 300 m**, and SIG 80 in every quarter —
  the one Knight hull the directional term does not apply to, because a resonance node is
  omnidirectional by construction ([systems-echo.md](systems-echo.md) §8, the ping's exemption).
  Moving, it is silent and grants nothing. Does not pair into a Standing Wave; the corridor is
  the Spire's
- Faction-locked: yes — the entry is the Spire's term on a hull, and the Spire's term is one
  navy's crystal

Reciter (Slipway)

- Role: The precise one. A glass cannon whose whole existence is the quarter it is loud in
- SIG: **90 / 90 / +10** — cone figures, like the Clarion's: 90 ahead, 31.5 on the beam, 9
  astern, **40.5 over the compass** — louder than a Corvette and quieter than a Cruiser on
  average, and the loudest thing on the map from the front. A Reciter travelling at a
  listener is classified from ~2,000 m; travelling across it, from ~700
- HYD: 50
- PR: 2
- Cost: 260
- Build time: 45s
- Berths: 2
- Speed: 70
- HP: 300
- Weapon: 140 damage at **1,000 m**, 4.5 s cycle (31.1/s) — outranges the Cruiser's 900.
  Bands to hold: kills a Corvette in ~14 s and a Light Scout in two cycles (the stat line is
  the spec, and 140 does not reach a Scout's 180; an earlier draft claimed one); dies to a
  Corvette in ~11 s if the Corvette gets there. The trade is the whole hull: it wins every
  fight it arranged and loses every one it did not, which is [factions.md](factions.md)'s
  sentence about the navy
- Faction-locked: yes, for the Clarion's reason exactly: a cone figure is unreadable without
  the term, and another navy's Reciter would emit 90 in every direction

The transports — one a navy (roster-plan.md wave 1, #495, #501)

A transport carries hulls, and what a hold does to the acoustic picture is one rule,
[systems-echo.md](systems-echo.md) §3, "A hull in a hold": a carried hull is not in the water
— no position, no SIG, no ears, unresolvable at any tier, still counted against the berths,
taking the carrier's depth and Pressure Rating and dying with it — and the load is heard as
**+3 SIG per berth carried**, at every posture, Silent Running included, and as nothing else.
Every SIG figure below is the *empty* figure; a full hold adds three times its capacity, and
the full figures are written beside them. Embarking is an order given to the hull, which
closes on its carrier and boards within 150 m of it and 100 m of its depth; disembarking is an
order given to the carrier, which lands its whole hold in a ring around itself, at its own
depth. None of the four carries a weapon, and none can be carried: a hold is not a berth for
another hold. Each is the fourth line of its navy's argument, and each is that navy's way of
*arriving*.

Freighter (Foundry)

- Role: The armoured hold. Six berths of hull moved in one slow, loud, very tough hull — the
  Klaxon's transport is the one that is heard coming and arrives anyway
- SIG: 30 / 50 / — (no weapon), empty; **48 / 68 full**. A loaded Freighter at cruise is as
  loud as a Cruiser at flank, and it stays that loud under Silent Running: a hold cannot be
  hushed
- HYD: 35
- PR: 2 — the Consortium baseline, and the rating everything aboard takes for the trip, which
  is what makes the hull a *depth* argument: a hold of PR-1 scouts crosses the Shelf line
  aboard a Freighter and comes out of it below
- Cost: 260
- Build time: 60s
- Berths: 3
- Hold: **6** berths — three Corvettes, or two Cruisers, or a Bulwark and two scouts
- Speed: 30
- HP: 1800 — the Bulwark's plate on a hull with nothing to shoot back with. What a Freighter
  buys is that being found is not the same as being sunk
- Faction-locked: yes. Eighteen SIG of load on a hull that runs at 68 is only readable inside
  a doctrine that plans to be heard; a Commune Freighter would be a hull the Veil could never
  sail quietly and never afford to lose

Drifter (Foundry)

- Role: The quiet way in. Two berths of hull moved at 90 m/s and SIG 10 — a Corvette, or a
  pair of scouts, arriving somewhere nobody was listening
- SIG: 4 / 10 / — (no weapon), empty; **10 / 16 full**. A full Drifter at cruise is a Light
  Scout at idle: the quietest way the roster moves a Corvette anywhere
- HYD: 45
- PR: 1 — the Commune baseline, and the hull's own. A Drifter is a horizontal argument, not a
  vertical one; a Commune that wants its Drifters under the Shelf line buys the Pressure Refit
  like every other Commune hull
- Cost: 90
- Build time: 30s
- Berths: 1
- Hold: **2** berths — one Corvette, or two scouts
- Speed: 90 — faster than anything it can carry
- HP: 300 — a Corvette's. Found is sunk, which is the Veil's bargain on every hull it fields
- Faction-locked: yes. SIG 10 at 90 m/s is the Veil's floor written onto a drive, and a
  Klaxon Drifter would be the quietest hull on a navy whose doctrine is to be heard

Verger (Foundry)

- Role: The cohort's way down. Four berths of hull taken below the Shelf line at PR-3 without
  paying four descents: the Listening does not dive its cohort, it carries it
- SIG: 14 / 26 / — (no weapon), empty; **26 / 38 full**
- HYD: 60
- PR: 3 — on the hull, not lent by the baseline. A cohort of Choristers, or two Corvettes,
  crosses the layer at the Verger's rating and lands at the Verger's depth, and the one descent
  the trip pays for is the Verger's own
- Cost: 140, plus 30 Biomass — the Precentor's price shape, the cohort programme's account
- Build time: 45s
- Berths: 2
- Hold: **4** berths — four Choristers, or two Corvettes
- Speed: 40
- HP: 800
- Faction-locked: no. The Biomass is the lock, as the Chorister's is: a four-berth PR-3
  transport reads the same under any flag, and the rendering contracts price it for everyone
  else at a third of the rate ([economy.md](economy.md) §6)

Antiphon (Slipway)

- Role: The Order's way of arriving somewhere it has not built a Spire. Three berths of hull,
  and what it lands, lands with **+1 PR for 20 s** — a Standing Wave's grant at a hull's
  scale, for exactly as long as it takes a landing to become a raid or a mistake
- SIG: **12 / 35 / —** (no weapon), empty; **21 / 44 full** — and the figures are **cone**
  figures, as every Order hull's are ([systems-echo.md](systems-echo.md) §8): 35 ahead, 12.3
  on the beam, 3.5 astern, 15.8 over the compass. An Antiphon runs quiet by running away and
  lands loud by turning to
- HYD: 50
- PR: 2 — the Hadron baseline. The grant is what it carries, not what it is: an Antiphon rated
  2 lands a hull rated 3, for twenty seconds
- Cost: 300, plus 40 Resonance Crystal — a Slipway hull, so a decision the crystal buys
- Build time: 70s
- Berths: 2
- Hold: **3** berths — a Clarion and a scout, or three scouts
- Speed: 60
- HP: 700
- Effect: Every hull it disembarks carries **+1 PR for 20 s**, the Spire's grant on a clock.
  It does not stack with a Spire, a Cantus or a Sower — one band rented, never two — and it
  does not renew: what is landed below its own rating has twenty seconds to win, retreat, or
  start to crush
- Faction-locked: yes — the cone figure fails the Clarion test the way the Clarion does, and
  the grant is the Spire's, which is the Order's

The scouts — one a navy, and two ways of not being heard

The Light Scout is nobody's, and it is the hull three navies out of four still find things
with. These four are how each navy finds things *itself*. None of them carries a gun: the
Light Scout is the scout that also shoots, and each of these spends its tonnage on one
sensor argument instead. Two of them are the wave's mechanisms made into hulls — the Beacon
is a ping on a cadence, the Glider is a drive that can be switched off
([systems-echo.md](systems-echo.md) §5, §6) — and the other two are the two ways a hull can
listen: by sitting still, and by being pointed the right way.

Beacon (Foundry)

- Role: The picket that shouts. A cheap active sonar fired every 20 s without an order, and
  nothing else — the Klaxon does not sneak, it pings and reads the return
- SIG: 30 / 42 / — (no weapon), and **80 on every ping**, against the 95 a commander's button
  costs. Loud at rest for a scout, which is the point: this hull was never going to hide
- HYD: 55 — deliberately mediocre. A Beacon that could listen its way to a contact would not
  need the cadence, and the hull would stop meaning anything
- PR: 1
- Cost: 110
- Build time: 22s
- Berths: 1
- Speed: 60
- HP: 260
- Effect: A ping every **20 s** while the hull is alive, at SIG 80 — **808 m** of Tier-4
  reveal and **2,156 m** of self-reveal, both falling out of the propagation model at that
  loudness rather than authored beside it ([systems-echo.md](systems-echo.md) §5). A cadence
  is a rhythm and a rhythm can be read: a Beacon buys its navy continuous coverage and sells
  its enemy a schedule
- Faction-locked: yes. A picket that reveals its owner on a clock is only legible inside a
  doctrine that plans to be heard; anywhere else it is the Clarion test failed the same way

Glider (Foundry)

- Role: The quiet way out. A hull that cuts its drive and coasts, still under way at an
  acoustic floor nothing else in the roster reaches while moving
- SIG: 8 / 16 / — (no weapon), and **1.8 gliding** — half its Silent Running figure, which is
  what engine off is for every hull ([systems-echo.md](systems-echo.md) §6). A Light Scout
  with its engine off is quieter still and is a rock; the Glider is the only thing that is
  quiet *and going somewhere*
- HYD: 45 — the worst ears of the four, and not an oversight. The Veil's scout is built to be
  *not heard* rather than to hear: it finds things by being able to go and look
- PR: 1 — the Commune baseline, and the hull's own
- Cost: 70
- Build time: 16s
- Berths: 1
- Speed: 105, and **35 gliding** — a third, kept when every other hull would be stopped dead
- HP: 200
- Faction-locked: yes. A hull that spends half its life switched off is a floor no other
  economy could stand behind: the Commune fields many of everything, and a navy of few heavy
  hulls cannot buy a scout that is not always scouting

Acolyte (Foundry)

- Role: The ears that sit still. The Listening's hydrophones made into a hull that holds a
  chokepoint rather than one that drives past it
- SIG: 10 / 20 / — (no weapon)
- HYD: 60 under way, **85 stationary**. The gap between the two figures is the whole hull:
  worth about a resolution tier at the ranges a chokepoint watch is set at, and paid for by
  being the slowest scout in the game
- PR: 2 — on the hull, the Directorate baseline lifting it to 3, which is the Chorister's rule
- Cost: 90, plus 15 Biomass — the cohort programme's account, at a scout's scale
- Build time: 20s
- Berths: 1
- Speed: 40
- HP: 200
- Faction-locked: no. The Biomass is the lock, as the Chorister's is: a stationary listening
  step reads the same under any flag, and the rendering contracts price it for everyone else
  ([economy.md](economy.md) §6)

Herald (Foundry)

- Role: The scout that scouts by leaving. 100 m/s, and a signature that is loudest exactly
  where the enemy usually is not
- SIG: **14 / 45 / —** (no weapon), and the figures are **cone** figures as every Order hull's
  are ([systems-echo.md](systems-echo.md) §8): 45 ahead, 15.8 on the beam, 4.5 astern. A
  Herald running away is the quietest fast hull on the map; a Herald facing you is the
  loudest scout in the game
- HYD: 55
- PR: 1 — the Hadron baseline
- Cost: 100
- Build time: 20s
- Berths: 1
- Speed: 100
- HP: 240
- Faction-locked: yes. The cone term is one navy's doctrine and not physics
  ([systems-echo.md](systems-echo.md) §8), so another navy's Herald would emit 45 in every
  direction: a scout as loud at cruise as a Cruiser, with nothing bought for it. The lock is
  the stat line being readable at all

The ordnance hulls — one a navy, and one corner of the triangle each

[systems-combat.md](systems-combat.md) §2 puts three weapon classes in a cycle: guns beat
torpedoes, torpedoes beat loud heavies, mines beat committed pushes. Until now every navy
fought that triangle with the same tubes. These four are how each navy *argues* it — the
Consortium spends everything at once, the Commune lies, the Directorate bombs upward out of
water it already owns, and the Order fires once, at something it is looking at.

Broadside (Slipway)

- Role: The alpha strike. Four tubes and a magazine of four, and no gun at all — twelve
  seconds of ordnance, then ninety of sailing home empty
- SIG: 42 / 58 / — (no gun). The figure that matters is not listed: four launches at +25
  apiece put a hull already in the high fifties into ping territory, which is the Klaxon
  paying for its own doctrine
- HYD: 45
- PR: 2 — the Consortium baseline
- Cost: 400
- Build time: 70s
- Berths: 3
- Speed: 40
- HP: 700
- Effect: a **magazine of four** against the roster's two ([systems-combat.md](systems-combat.md)
  §5). Rearm is unchanged — a Bastion or a Foundry, 15 s a torpedo — so a spent Broadside is
  out of the fight for a minute, which is the cost the four tubes are bought with
- Faction-locked: yes. A navy that plans to be quiet cannot spend everything in twelve
  seconds and be useless for ninety; the Consortium is the only one whose doctrine already
  pays that bill

Weaver (Foundry)

- Role: The lie. Three noisemakers in a magazine, laid on the move ahead of an approach —
  the Veil's other silent weapon, and the only hull in the roster that wins by making noise
- SIG: 12 / 22 / — (no weapon). The hull is quiet and the things it leaves behind are not
- HYD: 50
- PR: 1 — the Commune baseline
- Cost: 150
- Build time: 32s
- Berths: 2
- Speed: 75
- HP: 320
- Effect: **three laid decoys**, one every 3 s, at SIG 45 for 25 s each
  ([systems-combat.md](systems-combat.md) §5, "A screen, laid") — quieter and longer than
  the countermeasure every combat hull carries, because a countermeasure has to out-shout
  one hull for a few seconds and a laid decoy has to be mistaken for a hull for as long as
  an approach takes. They break seekers too: it is the same emitter, and the loudest thing
  now still wins
- Faction-locked: yes. Only the Veil prices its decoys against a Veil. A navy that is
  already the loudest thing in the water gains nothing by adding three contacts to its own
  picture; a navy that is normally four quiet hulls gains an army that is not there

Thurible (Slipway)

- Role: The censer. A PR-3 hull that fights *upward* — depth charges fused above itself,
  into water the Listening does not own. The deep is a sanctuary from guns; this is how the
  navy that lives there reaches out of it
- SIG: 16 / 28 / — from the hull, and **85 at every detonation**, a band away
  ([systems-combat.md](systems-combat.md) §8)
- HYD: 65
- PR: 3 — on the hull, and it is the weapon's precondition rather than a bonus: a hull that
  bombs upward has to be under something first
- Cost: 300, plus 40 Biomass — the cohort programme's account
- Build time: 60s
- Berths: 3
- Speed: 42
- HP: 620
- Effect: a **charge rack on 6 s**, half the general cooldown, plus a 45-damage gun at 500 m
  — short and slow, so the hull is not helpless between racks and is not mistaken for a line
  hull either. A floated charge rises at the *ascent* rate, a third
  of the descent, so the shallow attack is slow where the deep one is fast — the defender
  above gets three times the warning a defender below does, and that asymmetry is
  [systems-depth.md](systems-depth.md) §2 arriving in the weapon
- Faction-locked: no. The Biomass is the lock, as the Chorister's and the Acolyte's are.
  Every navy may drop a charge; only this one lives deep enough for *up* to be where the
  enemy is

Lance (Slipway)

- Role: The committed shot. One torpedo, a magazine of one, and a tube that refuses any
  bearing outside the hull's own cone — you can only fire at what you are facing, and a
  hull facing you is at its loudest
- SIG: **20 / 50 / —**, and the figures are **cone** figures as every Order hull's are
  ([systems-echo.md](systems-echo.md) §8): 50 ahead, 17.5 on the beam, 5 astern. The hull is
  loudest in exactly the arc it can shoot through, which is the whole trade written as one
  stat line
- HYD: 50
- PR: 2 — the Hadron baseline
- Cost: 320, plus 40 Resonance Crystal — a Slipway hull, so a decision the crystal buys
- Build time: 60s
- Berths: 2
- Speed: 65
- HP: 380
- Effect: the torpedo it launches **holds the solution it was fired with** and never
  re-acquires. That is the triangle's missing edge
  ([systems-combat.md](systems-combat.md) §2, §5): a decoy works by being the loudest thing
  *now*, and this is the one weapon that is not listening. A screen does not turn it, a
  countermeasure does not break it, and a Chorus Call does not either
- Faction-locked: yes. The cone term is one navy's doctrine and not physics, so under any
  other flag the gate would be a tube refusing shots for no reason its own signature could
  explain

What this does to the summary table. [factions.md](factions.md)'s *Army* row becomes true in
the roster: the Consortium fields the heaviest hull and the only repair; the Commune the most
mines and the only terraformer; the Directorate the best ears and the only PR-4; the Knights
the longest gun and a cheap way down. Each navy's Foundry hull is an opening and each Slipway
hull is a decision the crystal buys — and every one of the eight is a sentence about sound or
depth, per the editing rules, or it would not be here.

Transcription order, as it was done (#461): the Slipway first (a structure and a `PRODUCIBLE`
row); then the four Foundry hulls, whose effects the simulation already had mechanisms for
(the Precentor's aura is the Cantor's, the Cantus's and the Sower's grant is the Spire's, the
Spinner's magazine is the mine cap's); then the four Slipway hulls, whose weapons
`ttkBands.test.ts` holds to the figures above — in *cycles*, each shot with its cooldown behind
it, which is how the bands above are counted (every cycle in the roster is 1.5× what it was
when the eight were transcribed, per #463, and the seconds above moved with it — the cycle
counts did not); and the Tender last, because repair was the one
mechanism the simulation did not have. Three readings the code had to make where the entries
were silent: a stationary hull under Silent Running is not singing, seeding or welding — quiet
is the off switch, so a Cantus can be stopped without moving it; a Tender welds other hulls and
never its own plate; and a Spinner's grown mine still spends the arming interval per drop, so a
magazine is not a volley. Hull lengths are TUNABLE and not authored here; the Freighter's 160 m is
the roster's longest, and the Bulwark's 150 m was until it.

Design notes

- Numbers are prototyping intent. Exact costs and timings are tuneable.
- **HYD is a flat hull property.** Silent Running changes what a unit *emits* (SIG), never
  what it *hears* — throttling engines does not unplug the hydrophones. Anything that
  modifies listening does so as an explicit HYD modifier (the Cantor's dome, and the
  Acolyte's own second figure, which is keyed on the hull being stationary and not on any
  posture it has chosen — a silent Acolyte under way still hears 60), so the
  detection formula keeps exactly two listening-side inputs: distance and HYD.
- **The Knights have a hull now, and it is solved from the multiplier rather than beside it
  (issue #401).** Directional signature is spec'd in systems-echo.md §8: a Knight hull's listed
  SIG is its **cone** figure, and the compass average of the term is 0.45, so a Knight entry
  runs roughly 2.2× a comparable hull's SIG for the two to balance. The Clarion is that entry —
  62 against a Corvette's 28, which the term returns to 27.9 over the circle — and the figure
  is derived in code from `DIRECTIONAL_COMPASS_AVERAGE` rather than transcribed, so a sector
  table that ever moved would take the roster with it instead of leaving the faction quietly
  mistuned. **Anything else flying Knight colours is still a generic hull with the term
  applied**, and its cone figure is therefore *low* for the faction; the seven Order mission
  literals field exactly that and say so, and each is its own decision to make later.
- **The Directorate's listening doctrine is carried by numbers, not a special case.** Their
  native hull owns the highest mobile HYD (85) and their Cantor raises allied HYD in an
  area. The "passively detect one tier higher" phrasing in systems-echo.md §8 is realised
  through these HYD values — a separate tier bonus would be a second lever for the same
  effect and harder to balance.
- Every unit lists SIG and PR so designers can simulate detection interactions without needing full gameplay code.
- **Hull length is a stat, not a drawing detail.** `hullLengthM` lives in
  `packages/shared/src/units.ts` because both sides need to agree on it: the renderer draws
  the silhouette at that length, and the simulation keeps hulls from occupying the same
  water using half of it as a radius. A hull that looked one size and collided at another
  would be a bug nobody could see. Formation matters acoustically — a stack of hulls at one
  coordinate would be a single acoustic position, and the Echo Layer would report it as one.
- Combat hulls carry prototype weapon stats in `packages/shared/src/units.ts` (damage,
  range, cooldown) so the scaffold's combat loop can run; the doc-authored number is the
  firing-burst SIG, which is the design-relevant one. Damage figures are TUNABLE within
  the time-to-kill bands of [systems-combat.md](systems-combat.md) §9, which is the combat
  spec of record; the current numbers predate it and are due a retune.
- **A price is three accounts, and the roster says which a hull uses.** `cost` is Nodules;
  `crystalCost` and `biomassCost` are the other two, present only where a hull is locked to
  them, and `packages/shared/src/economy.ts` is the one place they become a sum and the one
  rule for spending it — the server, the commander AI and the command bar all read that sum
  and never the columns (economy.md §8). Biomass is the cohort programme's account
  (economy.md §6): the Chorister and the Verger are priced in it and locked by nothing else,
  and the Precentor and the Dredge are priced in it and locked besides. The Abyssal
  Submersible is not — it is the crystal-locked deep hull and stays priced as one.
- **The cohort hull is the Chorister, and the decision is recorded here so it can be
  overruled in one place (issue #352).** economy.md §6 called the Directorate "cheapest per
  unit" while the Submersible, at 260 and 80 Crystal, was the faction's only hull and the
  second most expensive in the game. Both sentences were true about different hulls, and the
  roster lacked one of them; the alternative — reading §6 as *cheapest per point of value* —
  would have left factions.md's "very many, cheap, slow" and campaign.md §6's "cheap
  expendable units" describing a navy with nothing cheap in it. Three calls inside that one:
  - **Nobody's by lock.** The four signature structures carry a faction lock; this hull does
    not. The rendering-contract rate (30%) already makes it the Directorate's — a Draymaw pays
    them a Chorister and pays anyone else a third of one — so a lock would be a second lever
    for an effect the rate carries, exactly as a tier bonus would be for HYD (above). **The
    Clarion is the one hull that does carry a lock, and the two cases are different in kind
    rather than in degree** (issue #401): a Chorister's price is legible to anyone who reads
    it, while a Clarion's stat line *cannot be read at all* outside the Order. Its 62 is a
    cone figure, and §8's first exclusion makes the cone "one navy's doctrine, not physics" —
    so another navy's Clarion would emit 62 in every direction and be the loudest hull in the
    game with nothing bought for it. The lock is not protecting a balance number; it is
    refusing to sell an entry that means nothing once it leaves the faction it was solved
    for. `Match.produce` enforces it server-side, exactly as `Match.build` enforces the
    structures', and the command bar mirrors it rather than owning it.
  - **PR-2 on the hull, not 3.** A PR-3 hull at 30 Nodules would sell the Abyssal band to any
    navy with a rendering contract, and economy.md §7 makes going deep a decision somebody
    pays for. The Directorate's baseline lifts it to 3 for free, which is what "born to it"
    is supposed to buy them and nobody else.
  - **Priced at one Draymaw, not one Hollow.** Twenty Biomass is the mid-water grazer the
    skirmish Drift seeds fifteen of; at thirty-five, a healthy map would carry perhaps a
    dozen renderings' worth of hull at a time, which is not "very many". Under a strained
    region a Draymaw pays 16.5 and falls short, so the guard-rail bites at the first hull
    rather than the tenth.

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

- Done (#461): the rung and the eight faction hulls above are transcribed — the Slipway, the
  four Foundry hulls, the four Slipway hulls, the Tender last
- Done (#501): the four transports above and the hold they carry, the first wave of
  roster-plan.md (#495), which sketches a full line per navy; the scouts are the second
- Transcribe the refits and rank of systems-progression.md (#462): the five refits as
  producibles on the Slipway's line, which #461 built, then rank, which needs the TTK band
  test to grow a rank-3 row
- Done: per-unit HYD values are authored in the stat blocks above and transcribed into
  `packages/shared/src/units.ts`
- Done: `tools/echo-sim` runs these stats through the shared detection model
  (`@echoes/shared`) for fast threshold iteration

Related

- systems-echo.md — detection math and Echo Marks
- systems-depth.md — PR and depth behaviour
- systems-progression.md — refits bought on the Slipway's line, and the rank a hull earns
- roster-plan.md — the second expansion: a role matrix per navy, in six waves
- glossary.md — authoritative definitions
