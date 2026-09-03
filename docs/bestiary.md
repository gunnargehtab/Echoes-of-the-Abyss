# Bestiary — The Drift

> [systems-echo.md](systems-echo.md) §2 lists fauna attraction as one of the four things SIG drives: *"the Drift responds to noise."* This document is the Drift.

**Glossary:** See [Glossary](glossary.md) for authoritative term definitions (SIG, PF, HYD, PR, Resolution Tiers, Active Sonar, Silent Running, Echo Marks).

---

## 1. What the Drift Is

**The Drift** is the Rift's living layer, and the Rift's word for it. Crews do not say *the fauna* or *the wildlife*; they say *the Drift is up tonight* the way surface people once talked about weather.

Mechanically it is a **fifth participant** in every match: server-simulated, owned by nobody, hostile to nobody in particular, and driven by exactly the same input the players are — noise. It exists to do three jobs the four factions cannot do for each other:

1. **Punish loudness impersonally.** A player can out-position an opponent. Nobody out-positions a Sounder that heard them mine for six minutes.
2. **Populate Tier 1 with honest ambiguity.** Fauna emit SIG and resolve as contacts. *"Something is out there"* is true far more often than *"an enemy is out there"*, which is what makes the tier dreadful rather than merely informative.
3. **Be killable.** The map is alive and can be killed (§6). The Drift is the part that dies.

---

## 2. How Fauna Hear You

Fauna are **listeners**, evaluated by the same detection maths as units ([systems-echo.md](systems-echo.md) §3). Each species has a HYD rating and two thresholds, expressed as perceived loudness at the creature's position — so terrain protects you from fauna exactly as it protects you from players.

| Stage | Trigger | Behaviour |
| --- | --- | --- |
| **Ambient** | Below Interest | Feeds, drifts, ignores everything |
| **Interested** | Interest threshold met for 4 s | Turns toward the source, closes to ~1,200 m, emits more (its own SIG rises) |
| **Committed** | Commit threshold met, or Interested for 20 s | Attacks the loudest entity in range, not the nearest |
| **Cooling** | Source below Interest for 30 s | Disengages over ~45 s and drifts back toward its home region |

Modifiers, additive to perceived loudness:

| Source | Modifier |
| --- | --- |
| Active sonar ping | **×3** — the ping's SIG contribution to aggro is tripled ([systems-echo.md](systems-echo.md) §5) |
| Sustained mining or refining in one place | ×1.5 after 60 s |
| Fresh kill or wreck within 800 m | +15 flat, decaying over 90 s |
| Breaking Silent Running to fire | +40 spike, as the SIG spike itself |
| Target is a Directorate unit | ×0.4 — the Directorate smell wrong and taste worse |

**Fauna attack the loudest thing, not the nearest.** This single rule is what makes the Drift a strategic object: a Consortium column can pull a swarm off a Commune harvester simply by existing nearby, and both players know it.

---

## 3. Fauna Are Contacts

Every creature emits SIG and resolves through the same tiers you do. At Tier 1 and Tier 2 there is **no marker, colour, or sound that distinguishes fauna from an army** — see [audio-direction.md](audio-direction.md) §7. Classification at Tier 3 is the moment you find out, and it is a genuine relief or a genuine problem.

Consequences the design wants:

- Tier 1 can be generous without being decisive, because a generous stream of contacts is mostly *animals*.
- Scouting has a real cost: resolving a smudge to Tier 3 means getting closer, and getting closer means being louder.
- The Directorate's **Chorus Call** ([factions.md](factions.md)) lies in exactly the same register the Drift does, which is why it works.

---

## 4. The Roster

Stat blocks are prototype intent, in the manner of [units.md](units.md). Interest and Commit are perceived-loudness thresholds; Biomass is the Directorate harvest yield ([economy.md](economy.md)).

### Ambient

**Lampfry** — schooling bioluminescent fry. Kelp Forest, Coral Ruins, Bioluminescent Caverns.

| SIG | HYD | Interest | Commit | Biomass | HP |
| --- | --- | --- | --- | --- | --- |
| 4 | 60 | — | never | 0 | 5 |

Harmless, and the most tactically important animal in the game. Lampfry **scatter** from any entity within 300 m regardless of SIG, including a silent-running scout. A scattering shoal is a purely *visual* tell — the one piece of information in the Rift that a silent unit cannot suppress, and the reason the Commune's stealth has an answer at all. Scattered shoals reform 25 s after the last intruder leaves.

The tell is **public**, the way hazards and Drift Health are public: a shoal's glow is light in the darkest water on Earth, not sound, so every commander sees every shoal and sees the moment one scatters. That is a deliberate disclosure with a hard edge — a scatter says *something is within 300 m of this glow* and never what, whose, how many, or exactly where. Routing it through the Echo Layer would be wrong twice over: a SIG-4 shoal would be inaudible (a tell nobody can read), and the trigger is proximity precisely so that silence cannot suppress it. Guns never auto-engage the ambient species for the same inaudibility reason mines are never auto-engaged — killing a shoal is always a deliberate order, and §6 prices what burning a region's tells costs.

**Tetherjelly** — colonial drifting absorber. Kelp Forest, thermocline boundaries.

| SIG | HYD | Interest | Commit | Biomass | HP |
| --- | --- | --- | --- | --- | --- |
| 1 | 20 | — | never | 2 | 40 |

Living terrain. A Tetherjelly cluster lowers local PF by **0.10** in a 250 m radius. The Commune farms them; everyone else finds them useful and takes them for granted. They are killed by any AoE and they do not come back within a match: burning a lane through a jelly field permanently raises the PF of that lane, which is the cleanest small example of the map being consumable.

The 0.10 is **additive and absolute**, not a percentage — resolved that way deliberately (#306). PF is the lever that decides which factions thrive where, and a proportional discount would make the same jellies mask a sixth of a kelp bed but a sixteenth of a trench, quietly turning one species into seven different ones by address. A cell's PF composes as *biome baseline, times any hazard multipliers, minus any jelly deltas*, floored at 0.05 — sound never stops entirely — and still capped at the trench ceiling. Overlapping clusters stack: a dense field is a better mask than a thin one, which is exactly what farming them should buy.

Clusters are **chart data**, public like biomes and hazards: a mask you cannot see is confusion, not dread, and "takes them for granted" requires being able to see what you are taking for granted. In Failing water (§6) clusters wither and die one by one — an environmental death that pays nobody — so a dying region's jelly fields thin and its PF climbs back toward the biome baseline, which is the Commune losing their concealment exactly as §6 promises.

### Grazers

**Ashgrazer** — armoured vent-field grazer, moves in herds of 6–12. Thermal Veins.

| SIG | HYD | Interest | Commit | Biomass | HP |
| --- | --- | --- | --- | --- | --- |
| 14 | 35 | 30 | 65 | 12 | 220 |

Slow, tough, and reluctant. A committed herd is a stampede that does structure damage and knocks units off station. Consortium mining sits directly on top of their feeding grounds, which is a joke the Consortium has stopped finding funny.

### Scavengers

**Rasp** — swarm scavenger, 20–40 individuals treated as one entity. Coral Ruins, Industrial Scrap Fields, anywhere with wrecks.

| SIG | HYD | Interest | Commit | Biomass | HP |
| --- | --- | --- | --- | --- | --- |
| 20 swarm | 55 | 25 | 40 | 18 | 300 swarm |

Rasps are drawn to **Echo Marks**, not to live units — they arrive at battle sites roughly 40 s after the battle. A swarm feeding on a wreck is a loud, unmissable Tier-3 announcement that something died here, and they strip salvage while they do it. They are how the Rift admits that scavengers are also witnesses.

Stripping salvage is an **acoustic act, not an economic one**: a feeding swarm consumes the residue it stands on, so the battle-site or wreck mark it feeds at decays roughly four times faster than it would alone — the quiet evidence is eaten, and the swarm's own feeding SIG stands in its place. Nothing changes hands; there is no wreck-salvage yield for it to remove ([systems-echo.md](systems-echo.md) §7 prices marks, not cargo). The trade a scout cares about: arrive inside 40 s and the residue tells you what happened, arrive later and all that is left is the announcement that scavengers got there first.

### Predators

**Hollow** — solitary ambush predator, trench walls and abyssal overhangs.

| SIG | HYD | Interest | Commit | Biomass | HP |
| --- | --- | --- | --- | --- | --- |
| 3 idle / 60 striking | 80 | 45 | 70 | 35 | 640 |

The Drift's own Silent Running. A Hollow at rest is functionally Tier 0, listens better than most units, and does not move until something loud passes within 500 m. Its strike is one of the largest single SIG events on the map, which means **every Hollow kill tells the whole region where it happened.** Trench routes are fast, they carry sound 1.6×, and they are full of these.

The Hollow is a **trigger model, not a dwell model** — the one creature the aggro ladder does not describe. Interest (45) makes it coil: it tracks the source and does not move, does not close, and does not get louder, because an ambush that announced itself would be a different animal. The strike fires when something it hears at Commit (70) is within 500 m in three dimensions — no 4 s dwell, no 20 s of watching, no approach. It is therefore the deliberate exception to §8's "every commit is preceded by 4 s of Interested behaviour with an audible tell": the Hollow's tell is *positional* rather than temporal — the doc names its ground, trench walls and abyssal overhangs, and a route that carries sound at 1.6× is priced by what lives in it. Striking is the only loud state; a Hollow disengaging drops straight back to SIG 3, and each kill lays full-intensity battle residue, so the strike's announcement outlives the seconds it took.

**Damage is a sound.** A Hollow that takes weapon fire is sprung exactly as if something loud had passed it: it strikes, now, at strike loudness, at the loudest thing it can hear — which is almost always the gun that just fired, and is the gun's own problem when it is not. The trigger model is otherwise untouched: quiet past the ambush is still quiet, loud far away is still only watched. The rule exists because a trigger model can be shot at from outside its trigger — most guns in the roster reach past 500 m, and against the Directorate's ×0.4 a cruising Abyssal Submersible is not heard at Commit until 190 m, which every gun in the roster outranges — so a hull that kept its distance rendered every Hollow on a map for nothing, which [mission-intake.md](mission-intake.md) §4 found and its §13 records (#353). What a wound buys is the lunge and nothing more: a Hollow shot from 650 m has 573 m to cover at 75 m/s, which is 7.6 seconds, and a pair of Submersibles kills it in 5.4. Standing off is not fenced; it is priced, and priced by count — a hull that renders alone from any range is bitten, a pair inside the trigger range is bitten once, an array of three is not, and every one of them is announced from the first shell. A driven creature (#349) gives no hull to a shell and is not woken by one; the map's own violence — crush, storms, an eruption — is not a shooter and wakes nothing.

**Draymaw** — pack predator, 4–6 individuals. Mid-water, follows industry.

| SIG | HYD | Interest | Commit | Biomass | HP |
| --- | --- | --- | --- | --- | --- |
| 26 | 65 | 22 | 45 | 22 | 380 |

The staple. Draymaw packs shadow harvesting operations at the edge of hearing and commit when yield noise peaks, which makes them a soft tax on greed and the Directorate's reliable income. Low commit threshold: they are the animal most likely to answer a careless economy.

### Megafauna

**Sounder** — solitary migratory colossus, 60–90 m. Follows fixed migration corridors ([hazards.md](hazards.md) §6) between deep basins.

**Transit is the weapon.** It does not attack a building; it swims through the space the building is in, and the building loses. Damage is dealt for as long as the colossus is inside the structure's footprint, which means **how badly a building fares is how big you built it** — a Sentinel Turret is gone in seconds, a Refinery and a Foundry are destroyed outright, and a Bastion takes roughly three quarters of its hull and is still standing. An animal nobody steers should not end a match in one crossing; that is the line between dread and a coin nobody flipped. Hulls large enough to be in the way are hit the same; small ones are ignored, exactly as the line says, because a Sounder does not notice them.

| SIG | HYD | Interest | Commit | Biomass | HP |
| --- | --- | --- | --- | --- | --- |
| 45 cruise / 100 calling | 90 | 55 | 75 | 260 | 9,000 |

The Sounder **answers pings.** An active sonar emission inside its migration corridor is read as a challenge call, and it will alter course toward the emitter and hold that course for two minutes. It destroys structures by transit, ignores small units, and cannot be reliably killed by any single player before the twenty-minute mark. The Directorate's **Trench Awakening** superweapon summons one and does not steer it ([factions.md](factions.md)).

Design intent: the button that lets you see everything also calls the largest thing on the map. Nobody needs to explain the ping's cost twice.

**An authored transit cannot be brought down.** The 9,000 HP is the skirmish figure, and what protects it there is depth rather than plating: the colossus lives at 1,300–2,700 m, below anything but a pressure-rated navy, and "cannot be reliably killed before the twenty-minute mark" is a sentence about who can reach it by then. A Sounder a mission *drives* is a different object. It is a beat, and a mission's beats happen when the document says they happen ([mission-sorrowgate.md](mission-sorrowgate.md) §9) — so a driven creature takes **no weapon damage** for exactly the length of its commitment. Guns, torpedoes and blasts land on it, are as loud as ever, lay residue where they struck, and take nothing off it; the moment the beat ends it is the Drift's again, and a placed ambusher whose commitment expires on the first pass is rendered like any other. Settled this way (#349) after twelve Abyssal Submersibles idling at [mission-intake.md](mission-intake.md)'s muster brought its colossus down in seventeen seconds of auto-fire, before it reached the line, and were paid the mission's band for doing nothing. Retuning the hit points would only have set a different formation's stopwatch; a transit guns cannot end is what *transit is the weapon* already half-said.

### Where the Drift lives, and what it can reach

Every entry above names a habitat, and until now none of them meant anything: creatures were seeded at one depth and stayed there for the whole match, so a Draymaw documented as mid-water hunted from the Shelf and the Tetherjelly could never reach the boundary it is named for. Worse, a creature bit in **two dimensions** — a pack at 300 m took a hull at 2,400 m from full health to nothing without ever descending, because the attack test measured only the distance across the sea floor.

Both are now wrong in the same way and fixed together. **A creature has a working depth and a band it will pursue within, and it bites in three dimensions.**

| Species | Working depth | Seeded across | Pursues within | Reaches |
| --- | --- | --- | --- | --- |
| **Lampfry** | 250 m | ±100 m | never — does not commit | 150–350 m — the Shelf, floored by the Lid and going no deeper |
| **Ashgrazer** | 600 m | at depth | ±250 m | 350–850 m — the vent field it feeds on, and little else |
| **Rasp** | 800 m | at depth | ±500 m | 300–1,300 m — no habitat, only the working ocean where things die |
| **Draymaw** | 900 m | at depth | ±400 m | 500–1,300 m — nodule fields, the shipping lanes, the thermocline duct |
| **Tetherjelly** | 1,200 m | ±100 m | never — does not commit | 1,100–1,300 m — the duct itself, the boundary it is named for |
| **Hollow** | 1,700 m | at depth | ±450 m | 1,250–2,150 m — trench walls, and the descent that arrives at them |
| **Sounder** | 2,000 m | at depth | ±700 m | 1,300–2,700 m — the deep basins, and the Resonance Crystal at 2,400 m |

**Two columns, because a creature's depth has two independent answers.** *Seeded across* is where the population sits when the map is built; *pursues within* is how far one will leave that to chase something. They are not the same question, and for two species only one of them has an answer at all: Lampfry and Tetherjelly never commit, so they have no pursuit band, and their vertical extent is entirely a property of how they are seeded. Collapsing both into one number would make that column mean two things depending on the row, which is how a table starts lying.

*Seeded across* reads **at depth** for the five hunters because a pack chases immediately, so where it starts barely matters — every hunter is placed at exactly its working depth, a horizontal scatter and a vertical line. The two ambient species are seeded **across their band**: each shoal or cluster takes a deterministic offset within ±100 m of the working depth, evenly spread rather than randomly bunched, because their "reaches" column describes that spread and not a chase. Without it a Lampfry shoal would sit at a single depth and the Shelf-wide tell below would not be true.

Read the last column as the mechanic. **Depth is cover from some of the Drift and exposure to the rest.** A harvester working a nodule field at 600 m is in Draymaw country; take the same harvester down to the crystal and the packs cannot follow — but something far larger is already there. Nothing in the Drift covers the whole water column, and that is deliberate: a creature that could reach anything would make depth meaningless against the one part of the map that does not negotiate.

The pursuit band is not a leash on where a creature *is* — it is a limit on how far it will chase. A herd is tied to its feeding ground; a migratory colossus is not, and its band is nearly three times the grazer's.

**Two stretches of water hold nothing at all, and both are load-bearing.** Above 150 m is the Lid, and the Drift declines it for the same reason hulls do — a scatter tell in water nothing can loiter in is a tell nobody is there to read. Below 2,700 m the column is empty of animals entirely: the deepest water in the Rift is the one place the bestiary has no entry for, which is the Mouth's business and not the Drift's.

**The duct is the busiest water in the game.** Four species reach 1,100–1,300 m — Rasp and Draymaw from above, Hollow and Sounder from below, with the Tetherjelly living in it — and it is also where sound carries at 1.2× and where the Commune's masking fields grow. That crowding is deliberate. The thermocline is already the map's most contested surface for acoustic reasons; the Drift should agree with the Echo Layer about where the interesting water is, rather than nominate somewhere else.

Three consequences worth stating plainly, because each is a design decision and not a rounding of the habitat lines in §4:

- **The Lampfry tell is a Shelf mechanic.** At 150–350 m the shoals sit in the shallowest water a hull can hold and no deeper, so the one tell a silent unit cannot suppress exists only in the top band. That is not a hole in Commune stealth, it is where the answer belongs: the Kelp Forest is the stealth biome and the Commune's home, so the counter-tell is co-located with the doctrine it answers. Deep stealth is already answered by crush attrition and by the Hollow.
- **The Hollow guards the doorway, not the basement.** Its band straddles the 1,800 m line between Mid-Water and Abyssal rather than sitting in the trench floor, so what it threatens is the *descent* — the moment a raid commits past the duct. An ambush whose strike is one of the loudest events on the map belongs exactly where the map most wants to know that somebody just committed.
- **The Rasp has no habitat, and its row says so.** Wrecks are wherever fighting was, so its ±500 m is the widest non-megafauna band in the table: it is the only creature whose reach is drawn from a verb rather than a place.

One open question this table does not settle, flagged rather than quietly decided:

- §4 gives the Tetherjelly two homes, "Kelp Forest, thermocline boundaries", and a species carries one working depth. The row above chooses the thermocline, because it is the boundary the species is named for and the one this section already noted it "could never reach". A Kelp Forest population needs either a second seeding depth per map or a second entry, and is not in this table.

*The four newest bands above were authored ahead of their species*; see Implementation Status for which are now simulated.

*Creatures do not yet migrate vertically on their own.* They hold their working depth until something worth chasing pulls them off it. Seeded migration along the corridors [hazards.md](hazards.md) §6 describes is still unwritten.

### Fauna do not collide with anything, except when they do

Creatures pass through hulls freely and always have — fauna are not in the separation pass, and this is intended rather than pending. Separation exists so a player's own formation does not pile up on itself; a creature swimming over a submarine is not a formation problem, and adding fauna to it would spend the 60 Hz budget making animals shove hulls around for no mechanical gain.

The **Sounder** is the exception, because §4 says it is: it "destroys structures by transit". A colossus that stops politely at weapons range and gnaws is not what that sentence describes. It alone is tested for overlap along the path it actually swept this tick, and what it finds, it grinds through.

### Not classified

**Attendants** — organisms found only within 400 m of the Mouth's rim.

They do not respond to noise. They do not feed, breed, migrate, or flee. Their emissions are periodic, structured, and do not match any biological signature the Rift has recorded, and Consortium survey teams have twice filed them as equipment fault. The Directorate does not call them animals. The Knights do not call them anything.

**This entry has no stat block, and that is the entry.** Nothing in the bestiary explains the Mouth ([world.md](world.md)).

---

## 5. Biomass and the Directorate

Fauna kills yield **Biomass** ([economy.md](economy.md) §2), and only the Abyssal Directorate can process it at scale — everyone else can sell remains for a fraction through Consortium rendering contracts.

The structural consequence is the most elegant thing in the faction design: **fauna are drawn to your noise, and the Directorate is paid for what your noise attracts.** A Directorate player near a healthy Drift does not need to force an engagement. They need you to be loud near their animals, which you will be, because everything that makes you strong makes you loud.

Their counter-pressure is that harvesting is itself loud (SIG 45–60 sustained) and that over-harvesting kills the region that pays them — see below.

---

## 6. Drift Health — The Map Can Be Killed

Every map region carries a **Drift Health** value, 0–100, starting between 70 and 95 by biome. It falls with sustained high SIG, fauna kills, over-extraction, and hazard damage, and recovers slowly — far more slowly than a match lasts.

| Drift Health | State | Effects |
| --- | --- | --- |
| 100–75 | Healthy | Full spawns, Lampfry tells everywhere, Tetherjelly PF bonus intact |
| 74–50 | Strained | Spawn rate −40%, megafauna avoid the region, Biomass yield −25% |
| 49–25 | Failing | No new spawns, Lampfry gone (**scatter tells stop working**), Tetherjelly fields thinning: local PF rises toward baseline |
| 24–1 | Collapsing | Scavengers only, Biomass yield −75%, ambient audio bed audibly emptied |
| 0 | Dead | No fauna, no masking bonus, no Biomass, permanent for the match |

A dead region is quieter, more legible, and worth less to everyone — which means **the Commune loses their concealment, the Directorate loses their income, and the Consortium barely notices.** That asymmetry is deliberate: environmental collapse in this game is not a moral event with a lecture attached, it is a strategic act that helps exactly one faction and is available to all four.

In campaign play, Drift Health persists between missions on the same map ([campaign.md](campaign.md)).

---

## 7. Faction Interactions

| Faction | Relationship to the Drift |
| --- | --- |
| **Bathyarch Consortium** | Harvest remains for rare compounds. Stabilised vents displace Ashgrazer herds. Loudest faction in the game and therefore the most-attacked — the Klaxon Doctrine tacitly includes *being bitten* |
| **Pelagia Commune** | Pacify rather than kill: bloom-scent lowers Interest thresholds by 30% in a radius. Farm Tetherjelly. Take a reputational and mechanical hit from any Drift Health they cause to fall |
| **Abyssal Directorate** | Harvest for Biomass, and can hold one megafauna at Interested state without commitment for 45 s. Fauna aggro against Directorate units is ×0.4 |
| **Hadron Knights** | Repel with directional pulses — a 90° cone that pushes Committed fauna back to Interested. Precise, expensive, and useless against a Sounder already in transit |

---

## 8. Balance Guard-Rails

| Risk | Mitigation |
| --- | --- |
| Fauna decide matches | Fauna target the loudest entity, which is a player choice; they never spawn on top of a base, and megafauna follow published corridors visible from the first second |
| Directorate free income snowballs | Biomass requires the kill *and* a harvest cycle at SIG 45–60, at a corpse whose location the whole region just heard |
| Drift Health becomes a mandatory chore | It is never a resource the player spends deliberately; it degrades from things players already want to do, and only one faction profits from ruining it |
| Tier-1 ambiguity reads as noise, not dread | Fauna density is regionally bounded and species-typed, so an experienced player learns *which* ambiguity a region produces |
| Fauna aggro feels random | Every threshold is deterministic against perceived loudness, and every commit is preceded by 4 s of Interested behaviour with an audible tell — except the Hollow, deliberately (§4): its tell is positional, not temporal, and a wounded one's tell is the shell that woke it |
| The Drift cannot threaten a hull that outranges it | Damage is a sound (§4): a Hollow shot from outside its trigger lunges at strike loudness, so range buys a free rendering only in numbers — a lone hull is bitten from 650 m — and every rendering is announced from the first shell |

---

## Related

- **[systems-echo.md](systems-echo.md)** — SIG, detection, and why fauna hear you at all
- **[audio-direction.md](audio-direction.md)** — fauna share the Tier-1 sound space deliberately
- **[economy.md](economy.md)** — Biomass, harvest cycles, and the cost of a loud income
- **[hazards.md](hazards.md)** — migration corridors as a map hazard
- **[environments.md](environments.md)** — which biome carries which population
- **[factions.md](factions.md)** — Trench Awakening, and the Directorate's fauna doctrine

---

## Implementation Status

All seven species are simulated (#306). The framework was the deliverable; the roster is now the proof it held — four behaviour shapes (dwell ladder, scavenger, ambient, trigger model) on one substrate, with §6's Failing row finally observable end to end.

| Species | Class | Status |
| --- | --- | --- |
| Ashgrazer | Grazer | **Implemented** — herd, full aggro ladder, stampede SIG, Biomass |
| Draymaw | Predator | **Implemented** — the staple pack, and the animal most likely to answer a careless economy |
| Sounder | Megafauna | **Implemented** — answers pings, destroys structures by transit, ignores small units, and takes no weapon damage while a mission beat drives it (#349). Migration along fixed corridors is still unwritten ([hazards.md](hazards.md) §6) |
| Lampfry | Ambient | **Implemented** — shoals seed across the Shelf band, scatter on proximity regardless of SIG, and reform 25 s after the last intruder leaves. The glow and the scatter are public (light, not sound); a Failing region's shoals die off, which is §6's "scatter tells stop working" |
| Tetherjelly | Ambient | **Implemented** — clusters seed across the duct band and subtract 0.10 from local PF in 250 m (the hazard hook grew an additive mode; see §4). Killed clusters never return, and Failing water withers them, so PF genuinely rises toward baseline |
| Rasp | Scavenger | **Implemented** — drifts to the strongest battle residue in smelling range ([systems-echo.md](systems-echo.md) §7), feeds loudly, and eats the mark roughly four times faster than it would fade alone. The aggro ladder outranks scavenging, so a swarm is still a creature you can pull off a wreck by being loud |
| Hollow | Predator | **Implemented** — the trigger model: coils at Interest without moving or getting louder, strikes on Commit within 500 m in three dimensions, is loud only while striking, and lays full-intensity battle residue on every kill. Since #353 it also answers a wound: a weapon hit from any range springs the strike, at the loudest thing it hears, so a gun that outranges the trigger pays for a rendering in hull unless it brings numbers |

### How fauna are contacts

They carry Position, Acoustic, Owner and Health like anything else and are owned by a slot no player can hold, so the Echo Layer's "different slot" test admits them for everybody. **Nothing in the detection pass knows fauna exist** — not the broadphase, not the pair loop, not the tier maths. The only place in the whole pass that mentions them is the classification step at Tier 3, which is exactly where §3 says a player finds out.

That is what makes a Tier-1 smudge genuinely ambiguous rather than ambiguous-looking. A creature and a cruiser take the same code path until the moment one of them is named.

### How the thresholds are read

§2's Interest and Commit are compared against the **detection ratio** — how many times over the creature can hear a thing at all. That scale is what makes the doc's numbers behave like the animals it describes: a Draymaw (22 / 45) grows interested in a working harvester at about 800 m and commits at about 500 m, which is "shadow harvesting operations at the edge of hearing and commit when yield noise peaks". An Ashgrazer (30 / 65, and much deafer) stays reluctant until something is nearly on its feeding ground.

Two other readings were tried and measured first. Scaling the ratio by a constant had Draymaws hearing a Bastion from two kilometres and eating the opening base of every match. Using raw perceived loudness went the other way — the propagation model's reference distance is 100 m and its exponent 1.6, so a SIG-70 harvester reads 12 at 300 m and fauna went deaf to anything not touching them.

No creature is seeded within 2,600 m of a starting position. A creature that begins the match on top of a base was not *drawn* to anything; §5's proposition is that fauna answer your noise, which needs them to start somewhere else and come to you.

### How the ledger reads noise

§6's "sustained high SIG" is read as a **total**: every tick, `Match.driftTick` sums the raw SIG of everything a player owns in each cell of a 4 × 4 grid over the map, and the cell drains at 0.02 a second for every point the sum stands over 60, recovers at 0.02 a second, and loses 4 flat for each kill in it. Fauna are left out, or the Drift would eat itself. Because it is a sum, a formation wears a cell that no one of its hulls would — three Abyssal Submersibles cruising are 84 — and a base holds its own region down for as long as it runs, which is the consequence `drift.test.ts` pins exactly rather than directionally. The first mission that consequence priced was [mission-intake.md](mission-intake.md), whose §13 records the decision to leave the ledger as it is and say so in the document (#350).

**Recovery is set by this section's own sentence rather than chosen.** "Far more slowly than a match lasts" and campaign.md §2 rule 5 both need damage to outlive the match that caused it, and a mission is 12–25 minutes. At 0.02 a second a cell stripped to nothing is still Failing 42 minutes later; the prototype's 0.06 had it Healthy again in 21, inside a long mission, so a map "carried between missions" arrived at the next one fully healed whatever was done to it (#365). Because drain and recovery are applied in the same pass, recovery also sets the *effective* threshold: a cell only wears once its sum stands more than 0.02 / 0.02 = 1 point over 60, so the figure that bites is 61.

**Dead is the one state, not the lowest rate.** The table's "permanent for the match" cannot be expressed as a slow recovery — any positive rate lifts a cell off zero on the next tick — so `DriftHealth.tick` skips a cell at 0 outright. A region a player strips to nothing stays stripped: no spawns, no Biomass, no masking, for the rest of the match and, in campaign play, into the next mission on that map.

### Population and cost

Capped at 48 live creatures. Fauna are entities in the Echo pass, which owns a 2 ms budget, so the cap turns "should be fine" into a guarantee. Measured with a full population on the Ventfront Divide and four players: **0.7–1.0 ms worst case**, against 2 ms.

Related: [economy.md](economy.md) · [systems-echo.md](systems-echo.md) · [audio-direction.md](audio-direction.md)
