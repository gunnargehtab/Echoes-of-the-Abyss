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
is the crystal-locked second yard, 600 Nodules and 120 Crystal, SIG 30 idle and **70 while
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

---

## 4. Balance Guard-Rails

| Risk | Mitigation |
| --- | --- |
| Refits stall the Slipway and nobody builds the second hull | That is the decision, not a failure of it: one line, two things to put on it. A second Slipway is a second line at full price, and the ceiling of forty berths already asks for one ([economy.md](economy.md) §10) |
| The Pressure Refit makes the deep free | It costs a signature structure's crystal, bought with crystal a PR-2 fleet raided for under crush attrition; the Commune cannot buy it to PR-3 at all; the Directorate never needed it and gains nothing here. Depth stays a commitment for exactly the navies whose doctrine says so |
| Knight instant refits are a silent tech-up | Sounded: SIG 80 for 15 s from the Bastion, the loudest single event a Knight base makes short of a ping. Everyone hears the Order harden its hulls, and where from |
| Refits erode the asymmetry | No SIG refit, no HYD refit, no weapon class, no damage type. The four things the factions differ on are exactly the four things the list cannot buy |
| Veterancy snowballs | Three ranks and a hard ceiling; the ranks die with the hull; experience is hull points, so a rank-3 hull has been *hit* for three times its own hull and lived, which is not a state a snowball is in |
| Rank breaks the TTK bands | The bands in [systems-combat.md](systems-combat.md) §9 are rank-0 figures. At rank 3 against rank 0, a Corvette kills a Corvette in about 7 s and dies to one in about 13, both inside the row's neighbours; the per-rank figures are sized so no band moves by more than a third, and the test that holds the bands should hold that too |
| Rank bonuses make a hull quiet-strong | Rule 2 and rule 3 together: nothing quieter, and nothing that was not paid for in discharges the map already heard. A hull that never fires never ranks |
| Progression becomes a chore | Five refits, once each; three ranks, earned by playing. A commander who ignores this document entirely plays a coherent rank-0, refit-0 game and loses to arithmetic in the late game, which is what progression is for |

---

## 5. Prototype Mapping

**Designed here; nothing below is implemented.** Constants land only after this section
exists ([CLAUDE.md](../CLAUDE.md), *Constants live in exactly one place*). The line the
refits need does exist: the Slipway and its four hulls were transcribed in #461
(`StructureKind.Slipway` in `packages/shared/src/structures.ts`, with the per-yard
`PRODUCIBLE` table that decides what its line may build), so a refit is a new kind of
producible on a yard that already runs at 70, not a new yard.

| Doc concept | Prototype today | Where it would land |
| --- | --- | --- |
| Refits (§2) | **Not built** | A `Priced` roster entry each, so `priceOf`, `affords` and `charge` in `packages/shared/src/economy.ts` refuse and debit them exactly as they do a hull — no new account, no new path (economy.md §8). Produced through `Match.produce` on the Slipway beside its `PRODUCIBLE` hulls, applied as a per-player set the stat readers consult |
| Pressure Refit's faction rules (§2) | **Not built** | The rate and the Commune's cap beside `FACTION_COMBAT` in `packages/shared/src/constants.ts`; the Knights' instant, sounded variant is a Bastion emission for 15 s at 80 |
| Rank (§3) | **Not built** | A component on the entity: experience and rank, written by `sim/systems/combat.ts` where damage is applied, read by the same file where damage is dealt. Rank crosses the wire as own-force hull data and inside a Tier-4 contact only |
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
