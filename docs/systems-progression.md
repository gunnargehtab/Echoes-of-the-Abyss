# Core System — Progression

> The rung is the only tree. Everything a navy buys after the opening is bought on a line you
> can hear, with the resource that lives at 2,400 m; everything a hull earns, it earns by being
> shot at and not dying.

**Glossary:** See [Glossary](glossary.md) for authoritative term definitions (SIG, PF, HYD,
PR, Resolution Tiers, Refit, Rank).

---

## 1. Premise

Every RTS this game measures itself against carries some combination of three progression
systems, and they do three different jobs. *Upgrades* let a fixed roster scale into the late
game without new hulls. *Research* gates and paces the mid-game. *Veterancy* rewards keeping
a hull alive. The bible carried none of them and never said whether that was a decision
(#462). This document is the decision.

The game keeps two and refuses one:

| System | Decision | Paid in | Heard as |
| --- | --- | --- | --- |
| **Upgrades** — *refits* | **In.** Fleet-wide, bought once each, on the Slipway's line | Nodules and **Resonance Crystal** | The Slipway at **SIG 70** for the whole refit, the same as a hull on the line |
| **Research** — a tree | **Out.** There is one rung and it is a building | — | — |
| **Veterancy** — *rank* | **In.** Per hull, three ranks, costs nothing, dies with the hull | Exposure: shots fired and hits survived | Nothing new. Every point of it was already a discharge someone heard |

Three rules keep it honest, in the register [systems-combat.md](systems-combat.md) §1 uses
to rule out armour classes:

1. **Nothing gets stronger silently for money.** There is no research building, because a
   structure that made a navy stronger while emitting nothing would be the only quiet way
   to get stronger in a game where everything that makes you strong makes you loud
   ([economy.md](economy.md) §1, [game-identity.md](game-identity.md) Pillar 2). A
   purchased strength is bought on a production line, and a production line is audibly
   running ([game-identity.md](game-identity.md), *Match Structure*). The tech-up is a
   scoutable event, not a timer.
2. **Nothing gets quieter by getting stronger.** No refit and no rank lowers a hull's SIG
   or raises its HYD. The quiet is bought at the roster, once, when you pick a navy; the
   ears are a faction ([systems-echo.md](systems-echo.md) §8). Progression trades in hull,
   damage, speed, depth and cargo, and its acoustic side only ever goes up or stays where it
   was.
3. **Experience is paid in exposure.** A rank costs no Nodules because it has already cost
   shots fired at +25 SIG at the shooter's own position, with battle-site residue laid at
   the target ([systems-combat.md](systems-combat.md) §12), and hits taken inside somebody's
   gun range, which is mutual audibility ([systems-combat.md](systems-combat.md) §4). A
   veteran is a hull the map has heard a great deal of. It is not stronger and quiet; it is
   stronger *because* it was loud and lived.

Why the rung is enough of a tree: Resonance Crystal is "the reason anybody goes deep at all"
and "the clock every match runs on" ([economy.md](economy.md) §2). A research tree paced by a
clock would compete with that clock and win, because a timer is more predictable than a
raid to 2,400 m. So the mid-game is paced by the deep and nothing else: the crystal you
raid for at PR-2, taking crush attrition on a clock, buys the refit that lets you stop
raiding and start mining. That is what "depth-gated upgrades" means here, and it is the
whole of §2.

---

## 2. Refits — the upgrades

A **refit** is a fleet-wide upgrade, bought once, applying to every hull of the navy that is
afloat and every hull it launches afterwards. The word is the bible's own — economy.md §7's
"standard refits", factions.md's "cheapest refits" and "instant refits paid in Resonance" —
and until now it named a thing nobody had specified. The Pressure Refit below is that thing;
the other four are the same mechanism pointed at the other stats a hull has.

### Where they are bought

**On the Slipway's line** ([units.md](units.md), *The rung*), and nowhere else. The Slipway
is the second yard, 600 Nodules, SIG 30 idle and **70 while
the line runs** — louder than a Foundry and the loudest line in the base. A refit occupies
that line exactly as a hull does: for its build time the Slipway runs at 70 and launches
nothing. A navy refitting is audibly refitting, and a navy refitting is a navy *not* building
its second hull. The refit and the Slipway hull compete for the same yard-time, which is the
decision surface: the crystal was already "a decision about *what* to field" (units.md), and
this makes it a decision about *when*.

A second Slipway buys a second line, not a discount; two refits may run at once on two
Slipways, at 70 each.

### The five refits

Stat blocks are prototype intent, in the manner of [units.md](units.md); prices are written
in the roster's own three accounts ([economy.md](economy.md) §8) and are TUNABLE until a
constant cites this section. What is SPEC is the shape: five, fleet-wide, once each, on the
line, and each one's acoustic side.

| Refit | What it does | Acoustic side | Cost | On the line |
| --- | --- | --- | --- | --- |
| **Pressure Refit** | **+1 PR**, fleet-wide. The depth gate, bought | **+2 SIG idle and cruise** — a thicker pressure hull is quiet; the pumps that keep it trimmed are not | 400 Nodules, **120 Crystal** | 120 s |
| **Plate Refit** | +15% max hull | **+3 SIG cruise** — more mass pushes more water | 250 Nodules, 60 Crystal | 90 s |
| **Drive Refit** | +10% speed, descent and ascent rates included | **+4 SIG idle and cruise** — a bigger drive is a louder drive, and it is louder standing still | 250 Nodules, 60 Crystal | 90 s |
| **Magazine Refit** | Torpedo magazines **2 → 3** ([systems-combat.md](systems-combat.md) §5, *Ammunition*) | None on the hull. The torpedo is loud for its whole run already; this is a third of the loudest thing you own | 200 Nodules, 60 Crystal | 90 s |
| **Hold Refit** | Harvester and crystal holds **+20%** at every throttle | **The hum** — more per delivery is a louder economy ([economy.md](economy.md) §5), and the heavier load holds the hauler on the node longer at the throttle's SIG | 200 Nodules, 40 Crystal | 60 s |

**The Pressure Refit is priced as a signature structure** — the same 120 Crystal as a Baffle
Barge, a Cantor, a Sounding Spire or a Spore Veil — because it is the same kind of decision:
the deep, spent on something you cannot un-spend. And it is bought with crystal a PR-2 navy
had to raid for, at a field 2,400 m down, taking crush attrition on every trip
([systems-depth.md](systems-depth.md) §2). The first hundred and twenty crystal of any
non-Directorate match are the hardest, and what they buy is the end of that hardness. That is
the mid-game, and the deep paces it.

**Two refits meet a hull already afloat**, and the table gives each one's stat rather than
what it does to a hull mid-match. Both rulings are SPEC (#1785):

- **Plate keeps a hull's condition.** Current hull scales with the maximum, so a full hull
  stays full and a half-sunk one stays half-sunk, its permanently lost share included. A
  refit is bought, not earned, and a fleet-wide heal for money would make §3's rank-up
  something other than the one heal a hull can earn under fire. An enemy that resolves a
  plated hull to Track reads that condition against the kind's own maximum, never the plate
  ([systems-echo.md](systems-echo.md) §4): the plate is a purchase, and a purchase is not told.
- **Magazine grows the roster's standard magazine, and only it.** Two becomes three
  ([systems-combat.md](systems-combat.md) §5). The Broadside's four and the Lance's one are
  each that hull's own argument ([units.md](units.md)), and the refit leaves both. A hull
  afloat when it lands loads its third torpedo at its next rearm, because the field never
  refills a magazine; a hull launched after it leaves the yard with three.

**What a refit cannot buy**, by rule 2 and by the rules of the docs it would otherwise break:

- **Quiet.** No refit lowers SIG at any state. The Baffle Barge is the one purchasable
  quiet in the game and it is a hull, defended and slow ([factions.md](factions.md)).
- **Ears.** No HYD refit. "Best HYD by a wide margin" is the Directorate's identity
  ([systems-echo.md](systems-echo.md) §8), and a purchasable +10 would sell it to everyone.
- **A weapon class you do not have**, or a damage type. One damage number per weapon, no
  armour classes ([systems-combat.md](systems-combat.md) §1). The Plate Refit is more hull,
  not a different hull.
- **A rung above the rung.** Five refits is the list. A sixth is a design change to this
  document, not a constant.

### Per faction

The mechanism is faction-blind, the way every price in the roster is; the doctrine is
carried by the rate and by what each navy's depth story already says
([systems-depth.md](systems-depth.md) §2, [factions.md](factions.md)).

| Navy | Refits | The Pressure Refit | Why |
| --- | --- | --- | --- |
| **Bathyarch Consortium** | Standard, at **×0.7 Crystal** | PR-2 → PR-3, one purchase | "Buys access — cheapest refits in the game, but pays for every metre." The discount is crystal-only: the Nodules and the 120 s at SIG 70 are paid in full, which is the Klaxon paying in the currency it always pays in |
| **Pelagia Commune** | Standard, at **×1.5 Crystal** and **×1.5 line time** | PR-1 → PR-2 **only**. There is no Commune refit to PR-3 | "Terraforms access — poor refits." The Abyssal is Deepbloom's, which converts tiles rather than hulls; a Commune fleet in Abyssal water is on ground it changed, never on hulls it hardened. The one refit they can buy takes them out of the Shelf and no further |
| **Abyssal Directorate** | Standard | **Not offered.** PR-3 is the baseline | "Born to it — no refit needed." The refit everyone else's mid-game is about is the one the Directorate started with; their four other refits are priced like anyone's, and their sickness above 400 m is untouched by any of them |
| **Hadron Knights** | Standard on the line — except the one below | PR-2 → PR-3, **instant**, priced in **Crystal alone at ×1.5** (180), no Nodules, no line time — and **sounded**: the Bastion strikes **SIG 80 for 15 s** at the purchase | "Instant refits paid in Resonance." An instant refit that emitted nothing would be the quiet tech-up rule 1 forbids, so it is announced instead, the way everything the Order does is: the conclave is *sounded* ([glossary.md](glossary.md), *The Order's conclave*). A Knight refit is a chord the whole map hears once, against a Slipway everyone else runs for two minutes. Louder, shorter, and the whole of *The Score* |

---

## 3. Rank — the veterancy

A **rank** is earned per hull, costs nothing in any account, and makes that one hull
stronger. Three ranks, and the third is the ceiling.

### Earning it

Experience is **damage dealt, plus half the damage taken and survived**, in hull points.
Thresholds are written against the hull's *own* maximum hull, so a Light Scout and a Cruiser
rank at proportionate effort and a Chorister at 30 Nodules can carry three chevrons as
legitimately as a Cruiser at 420:

| Rank | Experience, in multiples of own max hull | Max hull | Gun damage |
| --- | --- | --- | --- |
| **0** | — | — | — |
| **1** | 1.0× | +10% | +5% |
| **2** | 3.0× | +20% | +10% |
| **3** | 6.0× | +30% | +15% |

The added hull arrives as *current* hull too, so a rank-up is the one heal a hull can earn
under fire. That is the reward for surviving, paid at the moment surviving was the hard
thing.

Three things about the accounting are SPEC:

- **Rank dies with the hull.** No transfer, no salvage, no rebuying. A rank-3 Cruiser lost is
  a rank-3 Cruiser lost; the replacement is rank 0. This is the whole reason the system
  exists: it makes *keeping a hull alive* a thing the arithmetic rewards, which is what
  "attrition as doctrine" needs and did not have.
- **Repair preserves it.** A hull repaired to full is a rank-3 hull at full. The Consortium's
  Tender ([units.md](units.md)) is therefore the veterancy engine, exactly as "best repair"
  should be — and a Tender working at +12 SIG behind a Baffle Barge is keeping veterans alive
  audibly.
- **Damage to structures and fauna counts; damage to mines and ordnance does not.** Shooting
  down a torpedo is point defence doing its job, not experience. Killing a Draymaw
  ([bestiary.md](bestiary.md)) is exactly as dangerous as it sounds and counts in full.

Four rulings say what the table leaves open. All four are SPEC (#1785):

- **Dealt is the hull's own gun, in the hull it removes.** A last shot into a wreck with 5
  hull left earns 5. A torpedo, a mine or a depth charge earns its launcher nothing: when it
  lands the launcher has moved on, or the layer was never there, and rule 3 prices the
  exposure of a shooter at its own position when the blow lands.
- **Taken is any hit the hull lives through**, from an enemy weapon or a creature: a gun, a
  torpedo, a mine, a depth charge, a bite. Survived means survived the *fight*: half of each
  hit is banked, and paid once the hull has gone 10 s without another, the engagement the
  under-fire alert already counts ([ui-ux.md](ui-ux.md) §5). A hull sunk first is paid
  nothing. Crush, hazards and the Lid are the water, not a fight, and earn nothing. Any hull
  ranks, armed or not: a Harvester repaired under fire earns its rank from half of what it
  lived through.
- **"Own max hull" is the listed one**, the stat block's figure. A Plate Refit does not slow a
  hull's ranking, and a rank's own hull does not raise the next threshold.
- **A rank and the Plate multiply.** A rank's share is of the hull's maximum with the plate in
  it, so a plated Corvette at rank 1 carries 126.5 (100 × 1.15 × 1.10), whichever came first.

### What a rank does not do

- **Nothing to SIG, at any state, in either direction.** Rule 2. A veteran is exactly as loud
  as the day it launched. The issue that opened this question proposed the opposite trade —
  a *worse* SIG floor for a hull "whose signature the enemy knows" — and the decision went
  against it, because a penalty for fighting well would punish the behaviour the system is
  there to reward. The SIG contract is kept by rule 3 instead: the strength was paid for in
  exposure before it arrived.
- **Nothing to HYD, PR or speed.** Those are refits (§2) or the roster. Experience makes a
  crew better at the fight it is in; it does not grow them ears or a thicker hull.
- **Torpedo damage is untouched.** One hit is one hit ([systems-combat.md](systems-combat.md)
  §9); a rank multiplies the endless weapon and not the decisive one, so a rank-3 hull does
  not become a torpedo that kills a Cruiser in one.
- **No faction multiplier.** A trait that is not an argument about sound or depth is
  arbitrary ([README.md](README.md), editing rule 4), and an experience rate is neither. The
  factions come out different anyway, because the rule meets four different rosters:
  see below.

### Per faction

| Navy | What rank does to the doctrine |
| --- | --- |
| **Bathyarch Consortium** | *Attrition* finally has a ledger. The Klaxon's +12% while SIG > 60 and a rank's +15% multiply, so the loudest hull on the map is also the one whose survival compounds — and the Tender is what makes it survive |
| **Pelagia Commune** | *Many, fast, fragile* rarely ranks, and that is the doctrine stated as a result rather than a rule. The exception is the mine-and-vanish ambusher that lives: a Commune Corvette at rank 3 is a hull that has broken silence three times and got away, and it is the only thing on their side of the table the enemy has heard more than once |
| **Abyssal Directorate** | *Very many, cheap, slow* is the swarm veterancy was not invented for, and the Chorister proves the rule from the other side: at 30 Nodules and 20 Biomass a rank-3 Chorister has out-earned its price several times over, and it is still one hull the Directorate will spend. The doctrine does not want veterans; it wants sufficiency, and a cohort that ranks is a cohort that has been sufficient |
| **Hadron Knights** | The faction veterancy was invented for. "Every Knight loss is permanent — units cost lives the Order cannot replace" ([economy.md](economy.md) §6), and the campaign's roster attrition ([campaign.md](campaign.md) §11) already spends named hulls a mission at a time. Rank is the same sentence in a match: a Clarion that has survived three engagements is worth more than a new one in every sense the Order counts, and losing it costs a rank the tithe cannot buy back |

### Reading it

Rank is own-force information — chevrons beside the health bar the world view already
carries ([ui-ux.md](ui-ux.md)). To an enemy it is **Tier 4** information and nothing lower:
Track already reveals "exact unit, health, facing" ([systems-echo.md](systems-echo.md) §4),
and a veteran's extra hull is part of that health. Tier 3 gives class and count, and a rank-3
Corvette classifies as a Corvette. A listener who wants to know *which* Corvette has to get
close enough to know everything.

A plated veteran is told its rank and not its plate: it reads against its kind's maximum
times its rank's, never the Plate's (§2). A phantom claims no rank, so a ranked return is
plainly a hull, as a hurt one is ([systems-echo.md](systems-echo.md) §3). Both were earned
under fire, and fire is what the map already heard.

---

## 4. Balance Guard-Rails

| Risk | Mitigation |
| --- | --- |
| Refits stall the Slipway and nobody builds the second hull | That is the decision, not a failure of it: one line, two things to put on it. A second Slipway is a second line at full price, and the ceiling of forty berths already asks for one ([economy.md](economy.md) §10) |
| The Pressure Refit makes the deep free | It costs a signature structure's crystal, bought with crystal a PR-2 fleet raided for under crush attrition; the Commune cannot buy it to PR-3 at all; the Directorate never needed it and gains nothing here. Depth stays a commitment for exactly the navies whose doctrine says so |
| Knight instant refits are a silent tech-up | Sounded: SIG 80 for 15 s from the Bastion, the loudest single event a Knight base makes short of a ping. Everyone hears the Order harden its hulls, and where from |
| Refits erode the asymmetry | No SIG refit, no HYD refit, no weapon class, no damage type. The four things the factions differ on are exactly the four things the list cannot buy |
| Veterancy snowballs | Three ranks and a hard ceiling; the ranks die with the hull; experience is hull points, so a rank-3 hull has been *hit* for three times its own hull and lived, which is not a state a snowball is in |
| Rank breaks the TTK bands | The bands in [systems-combat.md](systems-combat.md) §9 are rank-0 figures, and a fight between fresh hulls stays one: a survived hit is paid when the fight ends (§3), so a duel's winner ranks on its killing shot and the loser never does. Paid as each hit landed, two fresh Corvettes both ranked on their sixth exchange and the duel ran 16.2 s. At rank 3 against rank 0, a Corvette kills a Corvette in about 10 s and dies to one in about 20, both inside the row's neighbours; the per-rank figures are sized so no band moves by more than a third, and the test that holds the bands should hold that too |
| Rank bonuses make a hull quiet-strong | Rule 2 and rule 3 together: nothing quieter, and nothing that was not paid for in exposure the map already heard — the hull's own discharges, or the ones that hit it (§3). A hull that is never in a fight never ranks |
| Progression becomes a chore | Five refits, once each; three ranks, earned by playing. A commander who ignores this document entirely plays a coherent rank-0, refit-0 game and loses to arithmetic in the late game, which is what progression is for |

---

## 5. Prototype Mapping

**All five refits and rank are built (#1785); rank's guard-rail row is not.** Constants land
only after this section exists ([CLAUDE.md](../CLAUDE.md), *Constants live in exactly one
place*). Every refit is bought on the Slipway's line, transcribed in #461
(`StructureKind.Slipway` in `packages/shared/src/structures.ts`), so it takes a yard that
already runs at 70 rather than a new yard. The one exception is the Knights' Pressure Refit,
struck at the Bastion.

| Doc concept | Prototype today | Where it would land |
| --- | --- | --- |
| Refits (§2) | **Built** — all five | `REFIT_STATS` and `refitPriceFor` in `packages/shared/src/refits.ts`, priced through the same `priceOf`, `affords` and `charge` as a hull (economy.md §8). `Match.refit` takes a refit onto the Slipway's line, and `world.refits`, a per-player set, is what every system reads. `grantRefit` in `packages/backend/src/sim/systems/refit.ts` writes the two that a hull carries, a Pressure Refit's rating and a Plate's hull, to every hull afloat, and `spawnUnit` gives both and a Magazine's three torpedoes to each later launch. The movement, depth, rearm and harvest systems read the Drive, the Magazine and the Hold live, and the acoustics pass adds each refit's SIG. `test/refit.test.ts` covers them |
| Each navy's terms (§2) | **Built** | `REFIT_TERMS` in `packages/shared/src/refits.ts` is the table's *Refits* column, each navy's rates for every refit; `PRESSURE_REFIT_TERMS` is its *Pressure Refit* column, with the Commune's PR-2 cap, the Directorate's refusal and the Knights' own terms. `refittedPressureRating` applies the cap. The Knights' instant, sounded Pressure Refit is struck at the Bastion by `Match.refit`, at SIG 80 for 15 s, and their other four are bought on the line |
| Rank (§3) | **Built** | `RANK` in `packages/shared/src/constants.ts` is §3's table, and `packages/shared/src/rank.ts` reads it. `Veterancy` is the component on each hull, and `sim/systems/rank.ts` credits it where damage lands: `combat.ts` both halves, `ordnance.ts` and `fauna.ts` a hit survived, which `rankSystem` banks until the fight ends. A rank-up writes the hull, and `profileFor` in `combat.ts` reads the rank into the gun. Rank crosses the wire as `OwnUnit.rank` and as `Contact.rank` at Track only, which `echoLayer.ts` writes with the plate left out of the hull. `test/rank.test.ts` covers it |
| Guard-rails (§4) | **Not built** | `test/ttkBands.test.ts` grows a rank-3 row per band |

---

## Related

- **[economy.md](economy.md)** — the four resources, and why Resonance Crystal is the one
  that prices a refit
- **[units.md](units.md)** — the Slipway, the rung refits are bought on, and the hulls that
  rank
- **[systems-combat.md](systems-combat.md)** — the TTK bands rank must stay inside, and the
  discharges that pay for it
- **[systems-depth.md](systems-depth.md)** — PR, and the four depth stories the Pressure
  Refit follows
- **[systems-echo.md](systems-echo.md)** — why nothing here may lower SIG or raise HYD
- **[factions.md](factions.md)** — the doctrines each refit rate and each rank story serve
- **[glossary.md](glossary.md)** — *Refit* and *Rank*, defined
