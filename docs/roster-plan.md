# Roster — The Second Expansion

> Four armies, not one army in four colours. The first expansion gave every navy two hulls of
> its own; this one gives every navy a whole line — a scout, a line hull, a heavy, its ordnance,
> its siege, its transport — and each of them is an argument about sound or depth, or it does
> not get built.

**Glossary:** See [Glossary](glossary.md) for SIG, PF, HYD, PR, Resolution Tier, Refit and
Berth definitions.

**Status:** planned. Nothing below is transcribed; every stat here is a direction, not a
number, and the stat blocks land in [units.md](units.md) wave by wave, doc first. The tracking
issue is #495, linked from [ROADMAP.md](ROADMAP.md) Phase 10.

---

## 1. Where the roster stands

The audit that opened epic #428 read the roster as *six combat hulls, three of them shared
by all four factions, one faction-locked unit in the entire game*. That was true then. Since
the transcription of #436 in #461 the roster is fifteen hulls: the seven of the prototype,
the Slipway, and two hulls a navy — one at the Foundry, one behind the rung. What a commander
can actually build today:

| Navy | Its own | Shared with everyone | Hulls on its bar |
| --- | --- | --- | --- |
| Consortium | Tender, Bulwark | Light Scout, Corvette, Cruiser, Abyssal Submersible, Chorister, Harvester | 8 |
| Commune | Spinner, Sower | the same six | 8 |
| Directorate | Precentor, Dredge, and the Chorister by price | the same six | 8 |
| Knights | Clarion, Cantus, Reciter | the same six | 9 |

Two hulls in three, then, are the same hull whichever flag they fly, and the three that
decide most fights — the scout, the line hull and the heavy — are shared by three navies out
of four. The Knights are the exception because the Clarion *is* their Corvette, solved from
the cone rather than copied from the table, and it is the model for everything below.

For scale: a StarCraft II race fields fifteen to eighteen units, nearly all of them its own.
This game does not need that many — every hull here has to be an argument, and forty berths a
commander is the whole budget — but *nine* of its own, out of twelve on the bar, is the
number this plan aims at. The difference between eight hulls with two of them yours and
twelve with nine of them yours is the difference between choosing a colour and choosing an
army.

## 2. What the bible already fixes

The plan is bounded by decisions that are already made, and it is shorter for it.

- **Sound or depth, or nothing.** [README.md](README.md) editing rule 4: a faction trait that
  is not an argument about sound or depth makes the roster arbitrary. Every cell of the matrix
  below carries its argument in one line, and a cell that cannot be argued stays empty.
- **One rung, and it is a building.** [systems-progression.md](systems-progression.md) §1
  decided there is no research tree. New hulls sit at the Foundry (an opening) or behind the
  Slipway (a crystal decision), and nowhere else. The Slipway's line is shared with the five
  refits, which is a tension the plan uses rather than avoids: a navy that is building its
  heavy is not refitting its fleet.
- **The lock is the exception.** [units.md](units.md) design notes: a hull carries
  `faction` only when its stat line cannot be read outside the navy — the Clarion test. Where
  a price does the work, the price is the lock, as the Chorister's Biomass is. Most of what
  follows fails the Clarion test honestly and is locked; the cells that do not are marked.
- **The berths are the budget.** [economy.md](economy.md) §10 caps a commander at forty
  berths whatever the roster holds, so a richer roster costs the Echo pass nothing. Kinds are
  free; entities are not. This is what makes the expansion possible at all after
  [ROADMAP.md](ROADMAP.md)'s sequencing note gated #436 on the pass.
- **The bands are the law.** Every gun lands inside [systems-combat.md](systems-combat.md)
  §9's TTK bands as stretched by #463, and `ttkBands.test.ts` holds each armed hull to them
  in cycles. A hull that wants to kill faster than the band allows is asking for a band, and
  that is a design change made in that doc first.
- **Art through the gate, fallback allowed.** [graphics-standards.md](graphics-standards.md)
  gate 1 lets a hull ship on the procedural bake until its model clears `hull-intake`; gate 2
  makes intake the gate. A wave does not wait for its models.
- **The opponent has to know how to use it.** A hull the commander in
  `packages/backend/src/ai/` never buys or never uses well does not exist in the baseline, and
  the baseline is how a wave is judged. Each wave ships its doctrine and its behaviour with
  its hulls.

## 3. The role matrix

Eight roles, four navies. A filled cell is a hull that exists; a sketched cell is a hull this
plan proposes, with its argument. Names follow the register the existing hulls set — the
Consortium's are industrial (Tender, Bulwark), the Commune's are gardening (Spinner, Sower),
the Directorate's are the offices of a choir (Precentor, Dredge), the Knights' are the parts
of a service (Cantus, Reciter).

| Role | Consortium — *few, heavy, tough* | Commune — *many, fast, fragile* | Directorate — *very many, cheap, slow* | Knights — *very few, elite, precise* |
| --- | --- | --- | --- | --- |
| **Scout** | *Beacon* — hears by shouting | *Glider* — engine off, the quietest hull | *Acolyte* — a listener that stays | *Herald* — a cone that runs away quiet |
| **Line** | *Caisson* — armoured, loud, Klaxon-fed | *Reed* — fast, fragile, silent at flank | Chorister (exists, by price) | Clarion (exists) |
| **Mid** | *Derrick* — the gun that aims by ear | none, on the Bower's reasoning | Precentor (exists) | *Responsory* — the gun paid by its target |
| **Heavy** | Bulwark (exists) | *Bower* — a swarm's anchor, not a hull's | Dredge (exists) | Reciter (exists) |
| **Support** | Tender (exists) | Sower (exists), Spinner (exists) | Precentor (exists) | Cantus (exists) |
| **Ordnance** | *Broadside* — the torpedo salvo | *Weaver* — decoys, not mines | *Thurible* — depth charges from below | *Lance* — one torpedo, aimed by the cone |
| **Siege** | *Furnace* — thermal cutters on a hull | *Blight* — a spore that eats plate | *Lure* — brings the Drift to a wall | *Tocsin* — the long gun that stands still |
| **Transport** | *Freighter* — armoured, loud, six berths | *Drifter* — two berths, nearly silent | *Verger* — carries cohorts down | *Antiphon* — carries three, projects depth |
| **Deep** | Abyssal Submersible (shared) | Abyssal Submersible (shared) | Abyssal Submersible (shared) | Abyssal Submersible (shared) |

Eighteen sketched hulls — sixteen, and the two the mid-tier row added in the seventh wave
(#531), which is the only row that is not four wide because only two navies have the gap. With
the fifteen that exist that is thirty-three, and the Consortium's bar and the Order's each read
one more than the other two's. Otherwise each navy's bar
reads twelve: its nine (or eight, with the Chorister and the Clarion counting where they
fall), the Submersible, the Harvester, and the common trio — which the last wave decided to
keep (§8, #510), so twelve it is.

### The arguments, cell by cell

Every sketch is one paragraph: what it does, what it sounds like, where it lives, and why it
is this navy's and not another's. Numbers are directions until the wave writes the block.

**Scouts.** The Light Scout is nobody's; each navy's own scout is how *it* finds things.

- *Beacon* (Consortium, Foundry). A picket that carries a cheap active sonar on a short
  cycle — a ping every 20 s at SIG 80 rather than the 95 a hull pays — and nothing else. The
  Klaxon does not sneak; it shouts and reads the echo. Locked: a picket that pings on a
  cadence is unreadable outside a navy whose doctrine is being heard.
- *Glider* (Commune, Foundry). A hull that can stop its drive and coast on a set current or
  trim — SIG 3 while gliding, the quietest thing in the roster, at a third of its speed and
  with no gun at all. It hears little (HYD 45) because it is built to be *not heard*.
  Locked: the Veil's scout is an argument about a floor nobody else's economy could stand.
- *Acolyte* (Directorate, Foundry). A scout that hears one tier better than it should for its
  HYD while stationary — the Listening's ears, made into a hull that sits at a chokepoint
  rather than one that drives past it. Slow, cheap, priced partly in Biomass. Not locked:
  the Biomass is the lock, as the Chorister's is.
- *Herald* (Knights, Foundry). A cone hull with a 100 m/s drive whose listed SIG is loud but
  whose wake is the quietest in the game — ×0.10, [systems-echo.md](systems-echo.md) §8 — so
  the way to scout with it is to turn and run, and the way to be caught is to face the enemy.
  Locked: the cone term is the Order's alone.

**Line hulls.** The Corvette is nobody's. The Knights already have theirs; the Directorate's
is the Chorister by doctrine and by price. Two navies are missing theirs.

- *Caisson* (Consortium, Foundry). A Corvette with a third more plate, a third more SIG, and
  the Klaxon's +12% always lit because it never drops below 60. Slower. The Consortium's line
  hull is the one that cannot hide and has stopped trying. Locked: the Clarion test fails
  the same way the Clarion does — it is a hull built for one damage rule.
- *Reed* (Commune, Foundry). A Corvette that is faster, thinner, and quieter at flank (SIG 20
  at 100 m/s, against the Corvette's 28 at 85) with a shorter gun; the fight it wins is the
  one it chose, and the fight it loses is any other. Locked: the SIG line is the Veil's
  argument written out.

**The mid-tier.** The step between the line hull and the rung's, and the only row here that is
not four wide. The Directorate's is the Precentor and the Commune's is nothing, on the Bower's
own reasoning — *many, fast, fragile* does not have a middle. The other two named the common
**Cruiser** for it, four times between them, and built it 0.0 times in every measured scenario
(#531). Both replacements are guns that read SIG, which no gun in the roster did before them.

- *Derrick* (Consortium, Foundry). Auto-acquires the **loudest** live enemy in range rather
  than the nearest — a torpedo seeker's rule and a committed creature's, on a hull a player
  builds. Its shell goes to whoever just fired, broke silence, crossed the layer or is mining,
  and never to the scout standing closest. Locked: on any other navy it is a targeting
  convenience; on the one whose fights "happen next to the Consortium, on purpose" it is the
  hull that chooses which fight that is.
- *Responsory* (Knights, Foundry). Damage ×1.5 against a target whose *perceived* loudness is
  over 60 — the Klaxon's own threshold, read from the other side of the water, and the first
  rule in the game paid by the target's SIG rather than the shooter's. Perceived is the
  counter-play: a Veil, the layer and terrain PF are all defences against it. Locked: any navy
  could carry a gun that reads a number, and only the Order has a doctrine that says it must.

**The Commune's heavy.** The doctrine is *many, fast, fragile*, so the Commune's heavy is not
a heavy. *Bower* (Commune, Slipway) is a slow, quiet hull with no gun that regrows Spinner
magazines within 300 m, welds nothing, and carries a Spore Veil's suppression at half
radius while stationary for 30 s — the anchor a swarm forms around, and the one hull the
swarm cannot afford to lose. Locked: it is a Spore Veil with a drive, and only the Commune
has a Spore Veil.

**Ordnance.** [systems-combat.md](systems-combat.md) §2's triangle, one hull a navy, each on
its doctrine's corner.

- *Broadside* (Consortium, Slipway). Four tubes and a magazine of four, loud on every
  launch, a hull that spends its whole ordnance in twelve seconds and goes home to rearm.
  The Klaxon's alpha strike, made of the one weapon that is louder than the launcher.
- *Weaver* (Commune, Foundry). Carries three noisemakers and lays them on the move, so an
  approach reads as three contacts and a retreat reads as none. Not mines — the Spinner is
  the mine hull — but the other silent weapon: deception. Locked: only the Veil prices its
  decoys against a Veil.
- *Thurible* (Directorate, Slipway). A PR-3 hull that fights *upward*: depth charges set to
  detonate at a depth above it, [systems-combat.md](systems-combat.md) §8, at 85 SIG each.
  The Listening owns the deep; this is how it reaches the water it does not.
- *Lance* (Knights, Slipway). One heavy torpedo, magazine of one, seeker cone matched to the
  hull's own cone so it can only be fired at something the hull is facing — and the hull
  facing it is at its loudest. Precise, expensive, and a commitment.

**Siege.** Nothing in the roster kills a structure well, and the superweapons are sites, not
hulls ([factions.md](factions.md)). Each navy's siege hull is its way of taking a wall down.

- *Furnace* (Consortium, Slipway). Thermal cutters — the same tool that opens kelp,
  [hazards.md](hazards.md) — turned on plate: high structure damage at 200 m, almost none
  against hulls, SIG 75 while cutting. A Bulwark keeps the line off it while it works.
- *Blight* (Commune, Slipway). Seeds a spore on a structure that eats 1% of its hull a
  second for 60 s and is silent doing it; the structure's own SIG never changes, so the first
  sign is the hull ticking down. Priced in crystal because the spore is a Deepbloom strain.
- *Lure* (Directorate, Slipway). Carries the Chorus Call's mechanism at a hull's scale: a
  60 s song at SIG 55 that weights fauna aggro ×2 toward a point within 500 m. The
  Directorate does not knock the wall down; it invites the Drift to. Priced in Biomass.
- *Tocsin* (Knights, Slipway). An energy gun with 1,400 m of reach that fires only while
  stationary, and stationary it is the loudest thing on the map after a ping — the bell that
  tells everyone where the Order is. Outranged by nothing; caught by anything that reaches it.

**Transports.** The one gap [units.md](units.md) names in words. A transport carries hulls:
what it carries is silent and unresolvable while carried, and inherits the transport's PR
and speed, which is what makes it a *depth* argument — a Freighter takes PR-1 hulls into
water that would crush them, and if the Freighter dies they die with it. What a hold does to
the acoustic picture is settled in [systems-echo.md](systems-echo.md) §3, "A hull in a hold":
the load is audible as +3 SIG per berth carried and as nothing else, a carried hull neither
emits nor hears, and a kill reveals nothing beyond the battle site. The SIG figures below are
*empty* figures. Embark and disembark are the new mechanism the wave builds (§5).

- *Freighter* (Consortium, Foundry). Six berths carried, 1,800 hull, 30 m/s, SIG 65 —
  the slow, loud way to move a heavy force and survive being heard doing it.
- *Drifter* (Commune, Foundry). Two berths carried, SIG 10, 90 m/s, 300 hull: the way a
  Reed pair arrives somewhere nobody was listening.
- *Verger* (Directorate, Foundry). Four berths carried, PR-3, priced in Biomass: the hull
  that takes a cohort of Choristers below the Shelf without paying four descents.
- *Antiphon* (Knights, Slipway). Three berths carried, and what it carries lands with +1 PR
  for 20 s — a Standing Wave's grant at a hull's scale, and the Order's way of arriving
  somewhere it has not built a Spire.

**The Deep row stays shared.** The Abyssal Submersible is the crystal-locked hull, and
[economy.md](economy.md) §8 makes the crystal the gate, not the flag. Nothing in the matrix
replaces it.

## 4. The waves

One role across four navies at a time, so the balance harness measures four comparable
changes against one baseline, and so a wave's new mechanism (if it has one) lands once and
is used four ways. Each wave is one pull request and one row in
[units.md](units.md)'s stat blocks, doc first.

| Wave | Hulls | New mechanism | Gate to pass |
| --- | --- | --- | --- |
| 0 — the ground | none | tests generalised, harness extended, kit keyed | every existing test green; the baseline unchanged |
| 1 — transports (done, #501) | Freighter, Drifter, Verger, Antiphon | embark / disembark, carried hulls unresolvable | a carried force crosses the Shelf line in a mission test; the AI uses a transport in ≥ 1 of 4 doctrines |
| 2 — scouts (done, #506) | Beacon, Glider, Acolyte, Herald | engine-off glide; cheap cadence ping | first-classified-enemy time per navy moves, and differently per navy |
| 3 — ordnance (done, #507) | Broadside, Weaver, Thurible, Lance | noisemakers laid from a hull; upward depth charge | the weapon triangle reads in duels: torpedo navy beats heavy pushes, decoy navy survives them |
| 4 — siege (done, #508) | Furnace, Blight, Lure, Tocsin | structure-only damage; spore over time; fauna weighting from a hull | match length falls without the win rates spreading — read in the four-faction baseline, not a duel (#518) |
| 5 — line and anchor (done, #509) | Caisson, Reed, Bower | none | the Consortium and Commune doctrines stop buying Corvettes; the Bower is judged where the Slipway is reached (#518) |
| 6 — the commons (done, #510) | none | none | a decision, from the harness: retire the Light Scout, Corvette and Cruiser from the bars, or keep them as the surplus market — **kept**, see §8 |
| 7 — the mid-tier (#531) | Derrick, Responsory | guns that read SIG: acquire-by-loudness, and damage paid by the target's | the Cruiser's four dead entries become two hulls that are built, without the win rates spreading further than the composition bid already moved them |

**Wave 0** is the part that is not glamorous and cannot be skipped. It is issue #498, and it
settled four things:

- `packages/shared/test/units.test.ts` used to encode *exactly two hulls a navy* as a
  `Record<Faction, [UnitKind, UnitKind]>`, pin the Dredge as the only PR-4 hull, and hold
  the `sigWorking` and `mineMagazine` sets by exact list. It now holds one per-navy table
  that a wave appends to, and invariants a wave may not break: every locked hull sits in its
  navy's row and at exactly one yard, every navy has a hull at each rung, the Directorate
  owns every PR-4 hull, and the commons clock nothing.
- The balance report used to sum `lossesByKind` into one number. It now carries a per-hull
  table under the per-faction one, because a wave is judged on whether its hulls fought and
  died in proportion, and #458 showed what a kind-blind loss column hides.
- The opening kit in `Match.spawnStartingBase` was faction-blind. It now reads
  `OPENING_ESCORT`, keyed per navy and holding the same scout and two Corvettes for all four,
  so the baseline did not move and so wave 2 and wave 5 can put a navy's own hulls in its
  opening without touching the spawn again.
- `PHANTOM_HULLS` in the Echo Layer was a hand list of the commons plus the Directorate's
  Chorister. The rule is now derived: a false return may claim any hull one of its
  *observer's enemies on the map* could field, from `unitAvailableTo`, and each phantom
  picks a navy among those present. A Tender is only ever faked against the Consortium and a
  Clarion only against the Order; the Chorister, whose lock is a price, is faked against
  anyone ([economy.md](economy.md) §6). [systems-echo.md](systems-echo.md) §3 says the same
  in words.

**Wave 1** landed the four transports and the hold ([units.md](units.md), "The transports"),
with the mechanism [systems-echo.md](systems-echo.md) §3 had already fixed the rule for. Two
things it decided that the sketches had not: boarding is an order to the *hull*, which
closes on its carrier and boards within 150 m and 100 m of its depth, so a transport loads
while it moves and a hull that cannot reach it never pretends to; and landing is an order to
the *carrier*, which puts its whole hold in a ring around itself at its own depth, with no
orders — where the hull is and how deep it is are the carrier's, and the rest is the
player's next order. The commander uses two of the four, the Freighter and the Verger
([tech-stack.md](tech-stack.md), "it moves a force in a hold"); the Drifter and the Antiphon
are a human's until the harness can judge a raid.

**Wave 2** landed the four scouts and both of its mechanisms
([units.md](units.md), "The scouts"; [systems-echo.md](systems-echo.md) §5, §6). Three things
it decided that the sketches had not. Engine off is derived from the *Silent Running* figure
and not from idle — half of it, floored at 1 — because a factor on idle put a Cruiser above
its own silence, so "the state below silence" is now true of every hull by construction; the
Glider glides at 1.8 rather than the 3 §3 sketched, and the claim that survives is the
sharper one, that nothing else *under way* is quieter. The cadence ping chooses exactly one
number, the emitter's 80, and both radii fall out of the propagation curve at that loudness
— 808 m of reveal, 2,156 m of self-reveal — so the cheap ping recalibrates with the
expensive one instead of quietly becoming the better button. And a navy's own scout is
declared in the commander's `OWN_SCOUT` table rather than on its `composition`: the
composition cycle indexes on `army.length` modulo its own length, so adding an unarmed hull
to it re-phases every selection that navy makes, which is a balance change dressed as a
roster edit.

The opening kit still sends a Light Scout. Moving it to each navy's own hull is wave 6's
call, where the commons' fate is decided; wave 2 buys the scout as a want of its own on the
first affordable observation instead, which is what makes the gate's column move.

**Wave 3** landed the four ordnance hulls and found the wave's real cost exactly where §7
said it would be — the opponent. The commander had never launched a torpedo at all: the AI
command set had no such order, so every torpedo fired in every baseline to date was fired by
a player and none by a doctrine. A wave gated on "the triangle reads in the duels" cannot be
judged by a commander that cannot use two of the triangle's three corners, so `torpedo` and
`depthCharge` joined `layDecoy` as orders the AI can give, and each navy's ordnance hull got
a branch that spends it.

Two things it decided that the sketches had not. The laid decoy is **quieter and longer**
than the countermeasure it reuses — 45 for 25 s against 70 for 8 — which reads backwards
until you ask what each lie is for: one out-shouts a hull for a moment to break a lock, the
other has to be mistaken for a hull for as long as an approach takes. And the Lance's cone
gate carries a second behaviour that makes the first worth paying for: a torpedo that keeps
the solution it launched with. That is the edge §2's triangle was missing — a decoy wins by
being the loudest thing *now*, and this is the one weapon that is not listening — and it is
what a magazine of one buys.

The upward charge needed no sign change: `tickDepthCharge` already chose the ascent rate for
a negative delta, and `DEPTH_CHARGE.LIFETIME_S` was already derived against the float rather
than the fall. What the wave added there was the hull, the rack that cycles for it, and the
tests that had never been written.

**Wave 3's gate is not met, and the reason is not wave 3's.** "The triangle reads in the
duels" cannot be read: no Slipway hull is built in any duel — not the Broadside, the
Thurible or the Lance, and not the Bulwark, the Dredge or the Reciter either. Three of this
wave's four hulls are invisible to the one measurement that was supposed to judge them, and
the same is true of waves 4 and 5, whose hulls are Slipway hulls too. Filed as #518.

What *is* measured: the Weaver is built and lost (0.2 a match for the Commune in the
four-faction baseline), so the one Foundry hull of the four is a behaviour and not just a
row. Every mechanism is held by a test instead — the magazine's spacing and burn-down, the
laid decoy's figures against the countermeasure's, the cone gate refusing a bearing astern
and keeping the shot in the tube, the committed solution, the charge that floats and the
rack that cycles for it. That is a weaker gate than the duels honestly, and it is the gate
this wave actually passed.

**Wave 4** landed the four siege hulls and both remaining mechanisms, and found two bugs
that had been sitting in the simulation rather than in the wave.

The first: **`sigWorking` used to imply a stationary clock.** `spawnUnit` attached a
`HullEffect` to any hull with a working figure, and `stationaryNeededS` returns 0 for
anything it does not name — so such a hull read as *working* the instant it stopped moving.
That was harmless while every hull with a working figure worked by standing still (the
Tender, the Sower, the Cantus) and became a bug the moment three hulls arrived whose work is
cutting, firing and singing: a Furnace halted in open water sat at SIG 75 for the rest of the
match. The clock is now gated on the three hulls it was written for, and the siege hulls
carry their figure through a per-tick map written by the system that knows they are engaged.

The second: **a 200 m siege weapon could not reach anything.** Hulls are held off a
structure's footprint by the separation system — measured, a Refinery holds one at 198 m, a
Foundry at 218 and a **Bastion at 278**. The Furnace's sketched 200 m reach meant it walked
to the ring, sat outside its own range and cut air, forever. Its reach is 320 m for that
reason and no other, and every siege weapon added after this has to clear 278 or it does not
work. `ttkBands.test.ts` holds that as a rule rather than as four numbers.

Two things the sketches did not decide. The spore takes **60% of a wall and never the last of
it** — a percentage of *maximum* hull, so it is linear and finite; a percentage of current
hull decays asymptotically, reads as the same sentence and is a different weapon, one that
can be left running instead of followed up. And a Furnace ordered to run silent does not stop
cutting: the next cycle *breaks* the silence (§6), so the trade is real but arrives from the
other side — you may have the wall or the silence, never both.

### What #518 found, and where these hulls are judged from now on

The reading above was inferred from hulls that *died*, because losses were the only per-kind
column the report had — and a hull that is never built never dies. The report now counts
what a navy **built** beside what it lost, and what it **commissioned** beside neither, and
with those two columns the diagnosis is not the one the issue assumed.

**The rung is reached.** A Slipway is commissioned up to 0.6 times a match across the six
duels and 0.3–1.0 in the four-faction baseline — most often by the Directorate, which raises
one in nearly every match it plays. `commandConstruction`'s saving rule (#491) works. What
never happens is the hull, and there are three separate reasons for that.

- **Nobody saved for a hull behind the rung.** The composition cycle spends every purse it
  is handed on the next 150 nodule Corvette, so a 700 nodule Bulwark is never a moment away
  from being affordable — the argument the Sower's gate already makes one deck down. In the
  Consortium/Knights duel, the pairing where it raises the rung most often, its bank after
  the yard rose peaked at 600 against that 700 and spent most of the time under 300. The
  rung's hulls now save on the transport's **duty cycle**: an observation that cannot pay
  for one buys nothing, for a window, and then the cycle gets a turn. Not the Sower's
  unconditional hold — a duel is decided in exactly the minutes the yard finishes in, and a
  commander that stops building outright has traded the Bulwark for the fight the Bulwark
  was for. And not from any bank at all: below half the price it keeps buying its line,
  because a hold that cannot close is a standing tax on a hull the navy was not going to
  reach.
- **A duel ends before the yard is worth having, and no flag fixes that.** The Slipway rises
  around 420 s. A duel's median length is 272–650 s — against a 25 minute cap, because duels
  do not end on the clock but when one commander concedes — so the yard gets somewhere
  between fifty seconds and four minutes of use, and a raised `--max-minutes` adds none of
  it. The long-form duel #518 proposed therefore does not exist to be built. **The
  four-faction baseline is where a Slipway hull is measurable**: the yard rises at the same
  420 s into a median just over 1,000 s, which is about ten minutes of yard rather than two, and it is
  the scenario waves 4 and 5 are judged in.
- **The Directorate cannot pay for either of its rung hulls, anywhere.** The Dredge is 40
  crystal and 60 Biomass, the Thurible 40 Biomass — against a measured 0.0 crystal and 10.0
  Biomass a match. That is not a saving problem and no window closes it; it is a navy whose
  two rung hulls are priced in accounts its commander barely fills, and it is the navy that
  reaches the rung most. The report now carries a Crystal/min column beside Biomass/min so
  the next reader sees it in the table rather than inferring it from a row of zeros. Filed
  as #520.

What the fix moves, measured on a paired thirty-match baseline run before and after on the
same seeds: the Knights build **ten** Reciters where they built two, and the Consortium
builds its first Broadside — one navy's heavy and one corner of §2's triangle, where before
there was nothing to read at all. The Lance is unchanged at one in thirty. The win rates
move less than the noise on twenty-odd decided matches, and in both directions on different
seed sets. The Bulwark, the Dredge and the Thurible are still never built, for the second
and third reasons above.

**Wave 4 read the same columns and found a fourth cause, which is the queue itself.** Its
four siege hulls are still never built, and #518's first cause does not explain it: giving
the siege want the same duty-cycle hold the rung hulls now use changes nothing except the
win rates, and for the worse — the Knights fall seven points and the Directorate gain seven,
on a hull that never arrives either way. The hold is spent and never closed.

The reason, as the code then stood, was that `commandProduction` was a queue of separate
wants that each `return`, and the siege hull was fourth in it: scout, ordnance, heavy, siege,
wall, seeder, transport, then the composition cycle. A navy holding its purse for a Broadside
never started holding for a Furnace, because the saving state named one kind at a time and
the ordnance want claimed it first. So the fix was not another hold — it is that a navy can
only be saving for one thing, and the roster now asks it to want five. That change belonged
with #518's rather than inside a wave; it has since landed, and the section below is what it
measured.

Wave 3's gate stays unmet and its hulls stay held by tests. What has changed is that the
gate is now *readable*: what it reads is a list of named causes rather than a column of
zeros, and two of the three are now somebody's issue rather than an absence nobody could
see.

**Wave 5** landed the two line hulls and the anchor, and the thing it actually had to decide
was not a hull. Every stat block followed its sketch — the Reed and the Bower as written, the
Caisson with the one correction its sketch needed, because "a third more SIG" and "the
Klaxon's +12% always lit" are two different hulls (a third more than 28 is 37, and 37 never
lights anything). The claim that is an argument survived: the floor sits four above the line
at every posture, so the noise is not a third more but two and a third times more, and the
hull is priced for it. The Bower's clock covers only its cloud — the nursery runs whether the
hull is moving or not, because an anchor a swarm could only rearm at once it had parked would
be a second thing to protect rather than the thing the swarm forms around.

**The opening kit is where the wave was decided, and the first answer was wrong.** §5 has
always named the kit as this wave's, and wave 0 keyed `OPENING_ESCORT` per navy so the swap
would cost nothing structural. What it did not settle is what "the same opening" means once
the hulls differ, and the two candidates are not close:

- **Equal tonnage** — four berths of escort each, against [economy.md](economy.md) §10's
  grant of forty. The Directorate's line hull is a one-berth Chorister, so it opens with
  *four* of them. On paper that is its doctrine, "very many, cheap, slow", stated in the
  first three seconds of a match.
- **Equal shape** — a scout and a pair, for everybody, which is the shape the kit has always
  had. What a navy's pair is worth is then its doctrine: two Clarions cost three times two
  Choristers.

Measured on the stored baseline's own command (30 matches, seeds 4000–4029, 25 minute cap):

| Navy | before | equal tonnage | equal shape |
| --- | --- | --- | --- |
| Consortium | 0% | 0% | 0% |
| Commune | 8% | 0% | 0% |
| Directorate | 56% | **77%** | 64% |
| Knights | 36% | **23%** | 36% |

Nothing else in the Directorate's row moved under either kit — income, mean SIG, tracked
seconds and losses are all within a point or two of before — so the twenty-one points are the
two extra Choristers and nothing else. In a game whose whole subject is hidden information,
four sets of the best ears in the roster at tick zero is not a tonnage change; it is a
different opening. The same finding shows up in the Echo pass, which is paid per
observer-emitter pair: 129 path integrals before the wave, 174 under the shape rule, 206
under tonnage. **The opening is a starting picture rather than a budget**, and the shape rule
is what shipped. The Knights return to exactly their 36%, and the Directorate's remaining
eight points sit inside the ten this document already says a win rate over twenty-odd decided
matches carries.

**The gate, half met, and the unmet half is not this wave's.** Neither the Consortium nor the
Commune buys a Corvette any more — 0.0 against 2.8 and 0.3 — and they field 2.0 Caissons and
0.2 Reeds a match instead. The Bower is never built: the Commune commissions 0.3 Slipways a
match and the Sower's hold claims the purse first, which is the fourth cause recorded above
and filed as #518. It is held by tests until that lands, exactly as the siege hulls are.

One thing the wave read and did not act on, because it is wave 6's question rather than this
one's: the Directorate still buys **Corvettes**, 4.5 a match, while §3 calls the Chorister its
line hull "by doctrine and by price". The price half is true and the doctrine half is not —
`doctrine.ts` names Corvettes on that navy's composition — and which of the two is wrong is
exactly the decision the commons wave is for.

### The queue was a cause, and it was not the binding one

The fourth cause above is fixed (#518): `commandProduction`'s wants no longer each `return`
the moment they decide to save. Every want that is wanted, has a yard and cannot be paid for
now **bids**, and one arbitrator picks the nearest bid — the cheapest reachable one, because
that is the hold that closes soonest, and a hold that closes stops bidding so the next want
takes the slot. The old order was the order the waves were implemented in, and it starved its
own tail: a Consortium held for a Broadside it never reached while the cheaper Furnace three
lines below was never read at all. A test holds that directly — the same commander, the same
bank, buys nothing before the change and a Furnace after it.

**And it moves the baseline by almost nothing.** On the stored thirty seeds the win rates,
losses and incomes are identical to the digit; the one row that moves is the Commune's, which
now builds 0.1 Bowers where it built 0.1 Sowers — the arbitration choosing the nearer of two
unconditional bids, exactly as described. Every siege hull is still 0.0, and so is every
ordnance hull behind the rung.

That is worth stating plainly rather than dressing up: **the queue was a real bug and it was
not what is keeping these hulls out of the water.** What the numbers now say is holding them
there:

- **The two navies whose rung hulls are priced in nodules barely raise the rung.** The
  Consortium commissions 0.2 Slipways a match and the Commune 0.3, against the Directorate's
  1.0 and the Knights' 0.9. A want that arbitrates perfectly still needs a yard.
- **The two navies that do raise it cannot pay in the accounts their hulls are priced in.**
  The Dredge is 40 crystal and 60 Biomass, the Thurible 40 Biomass, the Lure 50; measured
  Directorate income is 0.0 crystal and 0.2 Biomass a minute. That is #520, and no saving rule
  reaches it.

So the honest reading is that this fix is **necessary and not sufficient**, and the next thing
worth doing for #518 is #520 rather than another change to the commander's spending.

### #520, and the reason no Biomass had ever been earned

The Directorate's two rung hulls are priced at 40 crystal and 60 Biomass, and it had never built
either. #520 asked three questions in order — is its crystal field ever worked, is Biomass earned
as designed, and only then are the prices wrong — and the answers turned out to be *no*, *no*, and
*the prices were never the problem*.

**The crystal field was never assigned.** `commandCrystal` declines a field that costs no crush,
rightly: a raid is not a shift. It hands the field to `pickNode`, which scores nodes at distance
plus a kilometre per hauler already there — and on *Ventfront Divide* a Directorate spawn sits
743 m from its first nodule field and 3,960 m from the crystal, so the crystal only wins once
seven haulers are stacked on the near ones against a doctrine that fields five. Measured: a
Directorate hauler spent **zero seconds** on the crystal field across a whole match and never went
below 600 m, while the two navies that have to *raid* the same water banked 78 and 15 a match from
it. One hauler now works it as a shift, on the raid branch's own gates.

**And the Drift was dead before the first hull was built.** Health drains where a region's summed
SIG is over 60, at a rate that had never been calibrated against a *sum*: a spawn carrying a
Bastion, a Foundry, a Refinery and its haulers reads about 280, which at the old rate is 4.4
health a second. Measured, all four spawn regions died between **20 and 27 seconds** into the
match, and every region on the map was dead by 997 s — permanently, because dead is permanent.
`yieldMultiplier` is zero at zero health, so **no skirmish had ever paid anybody any Biomass at
all**, and every Biomass price in the roster was unpayable by construction. The drain is now
0.00025, which takes a base's own ground to Strained at 03:51 and Failing at 11:16 — worn over a
match rather than lost before it starts — and the Directorate earns 84 Biomass in a match where it
used to earn nine.

Both were found by asking the issue's questions in the order it wrote them, and neither is a
pricing question. The prices stand.

**What it moved, on the stored thirty seeds.** Drift Health at the close is **75 (72–79)** against
16 (9–25) — the map ends worn rather than dead. Biomass per minute is 2.8 for the Directorate
against 0.2, and 2.3, 1.0 and 0.4 for the other three, so §9's "Directorate Biomass snowballs"
guard-rail is measuring something for the first time instead of reading zero. Crystal is 2.2 for
the Directorate against 0.0. And three hulls that had never been built in any baseline are:
**the Thurible at 0.1 a match, the Verger at 0.3 and the Acolyte at 0.8** — every one of them
priced in the accounts that had never paid. The Dredge is still 0.0, being the dearest of them at
40 crystal *and* 60 Biomass.

The win rates go 0 / 0 / 64 / 36 to **9 / 9 / 61 / 22**: the spread narrows from 64 points to 52,
two navies come off zero, and the Knights lose fourteen — the one move outside the ten points a
win rate over twenty-odd decided matches carries, and the one to watch. All five guard-rails
held.

### #520 again, and the Dredge — which turns out to be a nodule question

The hull the issue is named after outlasted the account fix above, and the reason is not its
price in either of the accounts the issue is about. This is the measurement that establishes
that, and it is recorded here rather than acted on: the change it argued for was built, measured
twice, and **withdrawn**, because after #596 it buys nothing and costs decided matches.

**Both named accounts are now abundant.** Over the stored thirty seeds with the Ventfront's kelp
beds running, the Directorate earns **3.5 crystal and 13.1 Biomass a minute** against a Dredge
priced at 40 and 60 — about a quarter of a minute's crystal and five minutes' Biomass. Its purse
carries a median of 53 Biomass and 20 crystal at the moment its production branch looks. So the
answer to this issue's third question is the answer its own ladder reached twice before: **the
prices were never the problem.**

**The blocker is nodules, and only nodules.** Instrumented over three matches on seeds 4000–4002:

| | Reading |
| --- | --- |
| Observations at which the Directorate bid for its Dredge | **820**, with a Slipway standing and no heavy in the water |
| ... at which it cleared `RUNG.SAVE_FROM`'s floor | **0** |
| The account it failed on | **nodules, at all 820** |
| Its nodule purse | median **10**, p90 **110**, peak **300** across three whole matches — against a 450 price |

Half a Dredge is 225 nodules and this navy's bank does not reach it, so the hold that would let
it climb can never open. That is not a rule this commander can fix from the inside; it is §8's
pricing question, and it is where the hull now sits.

**What was tried, and why it is not here.** Before #596 the same instrumentation found a
different picture — Biomass at a median of 16 against the 60 the hull is priced at — and three
faults in the arbitration that followed from it: `holdPurse` struck out any bid short of crystal
or Biomass entirely, a hold in a narrow account leaked to the wants ahead of it, and nearest-first
starved the one want the yard was bought for. Fixing all three produced **0.1 Dredges a match**,
the first time the hull had appeared in any baseline.

Then #596 gave the map beds a reactor can stand on, Biomass went from 6.1 a minute to 13.1, and
the same three fixes were re-measured against it. Two paired thirty-match sets, each against main
at that commit:

| | seeds 4000–4029 | | seeds 5000–5029 | |
| --- | --- | --- | --- | --- |
| | main | with the fix | main | with the fix |
| Decided, of 30 | 17 | 16 | 22 | 17 |
| Dredge built | 0.0 | **0.0** | 0.0 | **0.0** |
| Directorate win rate | 82% | 63% | 73% | 82% |
| Guard-rails held | 5 | 5 | 5 | 5 |

**No hull, on either set.** The win rate moves nineteen points down on one seed set and nine up
on the other, which is noise either side of the ten points a win rate over twenty-odd decided
matches carries. What is *consistent* is the cost: 33 decided matches of 60 against main's 39,
because a rule that can now save in narrow accounts means navies hold for the Lure, the Thurible
and the Verger as well, and hold longer. The full three-fault version was worse again — 14
decided and the "Knights starve" rail losing its reading for want of a long match.

So the arbitration rule **is** wrong — a hull priced in a narrow account cannot be saved for in
any account at all — and it is currently harmless, because nothing in the roster is short of a
narrow account any more. Fixing it costs matches and buys nothing today. It is worth doing on
the day something makes crystal or Biomass scarce again, and the measurement above is what to
re-read then.

### #529, and the Corvette the Order had no reason to name

The first of wave 6's four leanings to be acted on, and the only one that was simply **stale**.
Wave 5's gate named the Consortium and the Commune, so the Order was never asked — and
`DOCTRINE[Faction.Hadron].composition` went on naming a `Corvette` in a navy that has had its
own line hull since #461. Measured before the change: **5.9 Corvettes a match**, the heaviest
common-hull use by anybody other than the Light Scout.

`UnitKind.Clarion` now stands in that slot. **In place**, which is the whole of the care this
needed: the cycle indexes on `army.length` modulo the list's own length, so a sixth entry would
re-phase every selection the Order makes — the trap the Caisson's swap avoided and the Bower's
addition deliberately paid for. One for one at the yard as well, both being Foundry hulls priced
in nodules alone, and `OPENING_ESCORT` has opened the Order with two Clarions since #509, so the
doctrine has only caught up with its own opening.

**The substitution is clean.** Over the stored thirty seeds the Order builds 144 Clarions where
it built 177 Corvettes — 4.8 a match against 5.9, the shortfall being the Clarion's 180 nodules
against the Corvette's 120 — and **nothing falls through to anything cheaper**. Its Light Scout
column stays at 0.0, which is what separates this finding from the Directorate's Chorister
(#530), where the cycle does fall through and the substitution therefore is not clean.

| | Corvette named | Clarion named |
| --- | --- | --- |
| Knights' Corvettes built per match | 5.9 | **0.0** |
| Knights' Clarions built per match | 0.0 | **4.8** |
| Knights' Light Scouts built per match | 0.0 | 0.0 |
| Knights' Reciters built per match | 0.3 | 0.5 |

**Two things it moved, neither smoothed over.** The Knights go **22% to 36%**, which is the
fourteen points #520's re-run took off them and the figure this document has recorded for them
twice before — they return to exactly their 36% again. And the spread widens rather than
narrowing: 9 / 9 / 61 / 22 becomes **5 / 0 / 59 / 36**, 52 points to 59, with the Commune at
**0 of 22 decided**. The Commune's nine points are inside the ten a win rate over twenty-odd
decided matches carries and the Knights' fourteen are not, so the honest reading is that this
change moved one navy and the rest is noise — but a navy sitting on zero is worth watching
whatever the arithmetic says, and no guard-rail catches it: §9's Commune rail asks whether a
quiet economy *wins*, never whether it is losing everything.

All five guard-rails held. One incidental: a Cruiser was built for the first time in a measured
baseline — once, in thirty matches, by the Consortium — so #531's "zero, by everybody, in every
scenario" is now zero to three decimal places rather than absolutely. It does not change that
issue's reading.

### #531, and the two hulls the Cruiser was standing in for

Wave 7, and the only wave that is two hulls rather than four: the mid-tier gap is the
Consortium's and the Order's, because the Directorate's step up is the Precentor and the
Commune's is nothing at all.

**What the issue asked and what was measured first.** The Cruiser was named four times across
two compositions and built 0.0 by everybody in every scenario. #536 found why, and it was not
the Cruiser: the composition cycle had no way to save, so *every* entry above a navy's working
capital was decorative. Instrumented over three matches, the Knights' Cruiser was the cycle's
first choice **986 times** against a bank averaging 143–199. With the cycle taught to save, the
four dead entries stopped being free — the Order lost thirty points of win rate holding a purse
for a hull it could never reach — which is this issue's own finding measured as a win rate
rather than as a zero in a table.

**The rule the wave is built on.** SIG decides detection, resolution, aggro and lock speed, and
no gun in the roster was aimed by it: a torpedo seeker and a committed creature were the only
two things in the game that took the loudest rather than the nearest. The **Derrick** puts that
on a hull a player builds; the **Responsory** does the other half, setting damage by how loud
the target is. Both replace a Cruiser entry in place, so neither cycle re-phases.

**The gate, and it is met.** Thirty matches on the stored seeds, against #536's head:

| | stored (pre-#536) | #536 | wave 7 |
| --- | --- | --- | --- |
| Derrick built (Consortium) | — | — | **0.2** |
| Responsory built (Knights) | — | — | **1.8** |
| Cruiser built | 0.0 | 0.3 / 0.1 | **not named by anyone** |
| Win rates (Con/Com/Dir/Kni) | 5 / 0 / 59 / 36 | 0 / 0 / 67 / 33 | **5 / 5 / 67 / 24** |
| Spread, points | 59 | 67 | **62** |
| Decided, of 30 | 22 | 18 | **21** |

Both hulls are built, the spread is **narrower** than the composition bid left it rather than
wider, three more matches reach a decision, and both navies that had been sitting on zero are
off it. All five guard-rails held — and since #536 the Biomass one can actually breach when it
says so.

**What it moved, recorded rather than smoothed over.** The Knights go 36% to 24%, which is
twelve points and therefore outside the ten a win rate over twenty-odd decided matches carries.
The mechanism is visible in the hull table rather than mysterious: the Order builds 1.8
Responsories and 0.7 Clarions where it built 3.8 Clarions, so a 230-nodule hull is displacing
more than one 180-nodule hull's worth of purse and the navy fields fewer hulls in total. That
is on-doctrine for *very few, elite, precise* and it is still a cost. It is left as measured
rather than tuned away, because tuning a twelve-point move on twenty-one decided matches is
fitting the noise — the figure to watch is whether it persists over the next wave's re-run.

The Consortium's Derrick at 0.2 a match is the thinner of the two results and is the same
shape: at 330 nodules it displaces Caissons (3.1 to 1.4) and the navy's losses fall with them.
Better than the Cruiser's flat zero, and not yet a hull the Klaxon leans on.

Both models landed with the wave rather than lagging it (§5): authored as three.js scenes from
their prompts and intaken like any other export, with no warnings and glow on the curve.

### The purse is arbitrated by price, and the rung's own hull is the dearest thing on the list

Five causes have been named on #518 and four of them have been fixed. This is what the
sixth candidate turned out to be, and what the measurement found instead.

**The hauler guard is not a cause.** `commandConstruction` returns before either of its two
saved-for builds whenever `harvesters + queued < harvesterTarget`, and the last reading of
this issue proposed that guard as the thing keeping the Commune off the rung: it has the
largest target in the game at six, it builds twelve haulers a match and loses thirteen, so
it is under that target permanently and therefore never saves for anything. The arithmetic
is right and the conclusion is wrong. Turning the guard from a veto into a floor — the hold
leaves a hauler's price in the purse rather than abandoning the save — reproduces the stored
thirty-seed baseline **byte for byte**, because the branch the guard is protecting returns
too: a navy under its hauler target buys a hauler and stops, so the guard never had a bank
to hand away.

**The hauler want does leak, and closing it does not help either.** "Harvesters first,
always" was true only of a navy that could afford one; below the price the want fell through
in silence and the composition cycle caught the money. Traced on seed 4003, that is the
Commune's whole middle game: from 02:25 to 03:30 it holds four to five haulers against a
target of six, never rises above 120 nodules, and buys six Light Scouts and nothing else
while its hauler count falls from five to three. Two repairs were measured on the stored
seeds — a hold of the want's own, and a bid into `holdPurse` — and both do what they say:

| | stored | its own hold | a bid |
| --- | --- | --- | --- |
| Slipways commissioned (Con/Com/Dir/Kni) | 0.5 / 0.3 / 1.0 / 0.9 | 0.8 / 0.5 / 1.0 / 0.7 | 0.7 / 0.5 / 1.0 / 0.5 |
| Rung hulls built a match, all four navies | 1.4 | 1.2 | 1.0 |
| Win rates (Con/Com/Dir/Kni) | 0 / 0 / 95 / 5 | 0 / 0 / 94 / 6 | 0 / 0 / 89 / 11 |

Two navies raise the yard more often, one raises it less, and **fewer hulls come off it than
before**. Neither shipped, on the rule #521 set when it reverted the siege hold: a change to
how this commander spends nodules that moves the win rates and builds none of the hulls the
issue is about is a change that buys nothing.

**The yard is no longer the constraint.** Over seeds 4000–4009 the Directorate places a
Slipway in ten matches of ten, the Knights in ten, the Consortium in six and the Commune in
three, and seventeen of those nineteen sites rise. Placement refusals do happen — every one
recorded was clearance against a structure already standing — and the spiral in `nearHome`
recovers from them on the next observation rather than costing a saving cycle.

**What is binding is the arbitration itself.** `holdPurse` takes the cheapest reachable bid,
and that rule has no way to ever serve the dearest one. Counted over the same ten seeds, from
the moment each navy's yard is standing:

| Navy | Its heavy | Price | Hold opens at | Bids | Wins the purse | Built a match |
| --- | --- | --- | --- | --- | --- | --- |
| Consortium | Bulwark | 700 | 350 | 4,822 | **0** | 0.0 |
| Commune | Bower | 360 | 180 | 728 | 700 | 0.1 |
| Directorate | Dredge | 450 + 40 crystal + 60 Biomass | 225 | 19,228 | **0** | 0.0 |
| Knights | Reciter | 260 | 130 | 11,526 | 1,624 | 0.6 |

**The Bulwark is the clean case**, being the only heavy in the game priced in nodules alone:
it bid 4,822 times, won nothing, and the two cheaper wants standing beside it — the Caisson on
the line and the Derrick in the mid-tier — took 947 purses between them. Nearest-first is fair
between wants that are bought *once*, because a hold that closes stops bidding and the next
want takes the slot. It is not fair against a want that never closes, and the composition
cycle's is exactly that: it bids while the army is below target, and a navy losing eighteen
hulls a match is below target nearly always. The Knights are the exception for the reason the
table gives rather than for a better commander — their heavy is the cheapest in the game, so
nearest-first serves it, and they are the one navy that fields one.

The Dredge's zero is not this finding and should not be read as it: priced in crystal and
Biomass, it is skipped by the account gate in `holdPurse` before price is compared at all,
which is #520's case rather than the arbitration's.

The bank says the same thing from the other side. With a yard standing the Consortium's bank
averages **70** nodules and tops out at 390 across ten matches — it clears the Bulwark's 350
gate on 3.7% of observations and the Bulwark's own price on none of them — and the
Directorate's tops out at 360 against a 450 hull. The Knights' averages 192 and clears 600 on
543 observations.

**Anti-starvation was the obvious repair, and it was measured and does not work.** The rule
is the one the paragraph above asked for: every want keeps a clock of how long it has been
losing the arbitration, a want that has lost for ninety seconds takes the slot regardless of
what is cheaper, and winning spends the clock so the line gets it back. Built three ways —
with the hold bounded by `RUNG.SAVE_S` and with it unconditional, with `RUNG.SAVE_FROM` kept
and with it waived for a starved bid — and instrumented at the arbitration itself over seeds
4000–4009, where it does exactly what it was written to do: **the Consortium's Bulwark, which
won none of the 4,822 purses it bid for above, wins 3,041 of the 3,865 it bids for now.**

Not one extra hull is built by any of the three. What moves instead is the win rates, by up
to seven points, and the one rung hull a navy did field — the Knights' Reciter — comes off
the slip *less* often. On #521's own rule none of them ships: a change to how this commander
spends nodules that moves the win rates and builds none of the hulls this issue is about is a
change that buys nothing.

**What the instrumentation found instead is that the money is not there, and it is not close.**
The bank a navy holds is a maximum rather than a rate, no column in the report was reading it,
and it is now the `The bank against the rung` table. Peak bank *after the yard is standing*,
over seeds 4000–4009, against the price of the hull the yard was bought for:

| Navy | Its heavy | Price | Matches with a yard | Peak once the yard is up, median / best |
| --- | --- | --- | --- | --- |
| Consortium | Bulwark | 700 | 18 of 30 | 140 / 440 |
| Commune | Bower | 360 | 0 of 30 | — |
| Directorate | Dredge | 450 + 40 crystal + 60 Biomass | 9 of 30 | 240 / 380 |
| Knights | Reciter | 260 | 20 of 30 | 282 / 766 |

Not one Consortium or Directorate match ever holds its heavy's price, in thirty matches with
the yard standing in twenty-seven of them. **The Knights are the only navy whose peak with a
yard up clears its own heavy, and the only navy that fields one** — 0.6 Reciters a match, on
the cheapest heavy in the game. No arbitration between wants reaches a price the navy never
holds, which is why all three versions of the rule read the same.

**And the peak is not savings at all — it is the opening stockpile.** The paragraph that
stood here read the 600 as a yard being saved for and spent, which was the wrong reading of
the right number. `ECONOMY.STARTING_NODULES` is **600**, every commander is handed it at
second zero, and a Slipway costs exactly that. So a peak of 600 is the *gift*. On the stored
thirty seeds the Commune's peak is exactly 600 in all thirty matches and the Consortium's in
thirteen. The best any navy ever banks *on top of* the gift, over thirty matches, is 90
nodules for the Consortium, 40 for the Directorate and **zero for the Commune** — and 166 for
the Knights, whose tithe pays them every tick and who are for that reason the only navy here
whose bank behaves like an income at all. The report prints this directly now, as `Best peak
above the opening 600`, so the column cannot be misread the way this paragraph misread it.

**What that leaves is arithmetic against the map.** Ventfront Divide is symmetric to the
metre: each spawn has a 3,000 nodule home field 743 m away, and the next nearest field is
3,384 m off and contested by all four. Gross income per navy per match runs 2,300 to 3,150
— about one home field. Against that, the rung is a 600 nodule yard plus a 260 to 700 nodule
hull: **29% to 43% of everything a navy earns in a match**, on top of an army that costs it
1,500 to 2,600. The books reconcile to within a hundred nodules, so nothing is leaking; the
rung is simply a large fraction of the money that exists.

That is a claim about prices against a map's authored resources, which is what the freeze in
`CLAUDE.md` covers, and it is not this issue's to settle. What is left here is #520's case
for two navies — a price in an account the navy does not earn — and, for the other two, a
question for whoever lifts the freeze: whether a 600 nodule yard and a 700 nodule hull are
reachable in the same match at all. The honest gate for waves 4 and 5 meanwhile is the one
the issue's own fourth option named — a longer scenario, judged on whether the bank ever
holds the price, which the report can now say.

## 5. What each wave touches

The touch list for one hull, from the code as it stands. A wave is four of these plus its
mechanism.

**Required, or it does not compile.** The `UnitKind` enum (append, never renumber — the
value crosses the wire and sits in replays), the `UNIT_STATS` row, `HULL_LENGTH_M` and a
hand-drawn `HULL_OUTLINE` in `silhouettes.ts`, a plate class in `hullTextures.ts`, a slug in
`rosterModels.ts`, a three-letter code in `EchoRenderer.ts`.

**Required, or it does not exist.** A `PRODUCIBLE` row at its yard — the bar derives itself
from that; the stat block in [units.md](units.md) in the doc's own format, with the
*Faction-locked* line carrying its argument; the navy's `composition` in `doctrine.ts`, and
the commander's role logic for it (the `WANTED_SEPARATELY` gate for a support hull, a grant
entry for an aura hull, a new branch for a transport or a siege hull).

**Required when it does something.** A `HULL_EFFECTS` block for a working SIG or a grown
magazine; a branch in `hullEffects.ts`, `auras.ts` or the ordnance system; a new component in
`spawnUnit` only when no stat field implies it. The replay format does not bump for an
additive hull, and does bump the moment a wave changes an existing hull, the opening kit or a
shared system — wave 2 will. Wave 0 did not: it keyed the kit without changing it, and a
phantom's class decides nothing a recording can see.

**Required to be judged.** A `ttkBands.test.ts` block for every armed hull; a behaviour test
in the `rungRoster.test.ts` register for every effect hull; the four-faction baseline and the
six duels re-run and read, with the guard-rails in [economy.md](economy.md) §9 held.

**Allowed to lag.** The model. `tools/hull-maps/build.mjs` gets a `UNITS` entry and
`hullMaps.ts` its three imports once a GLB clears `hull-intake`; until then the procedural
bake is gate 1's sanctioned state. [asset-prompts-3d.md](asset-prompts-3d.md) gets the
hull's prompt with its authored length in the same PR as its stat block, so the art can start
the day the numbers land.

**Needs no work.** Audio — a hull inherits the mix through its SIG, and §3 of
[audio-direction.md](audio-direction.md) forbids class in a Tier 2 timbre anyway. Price
display, the inspector, the wire, the balance telemetry and `tools/echo-sim` all read the
roster rather than list it.

## 6. The mechanisms the matrix asks for

Five things the simulation cannot do today, in the order the waves need them. Each is an
argument to have once and reuse.

1. **Carrying** (wave 1). A hull with a hold of berths; `embark` and `disembark` orders; a
   carried hull has no `Position` of its own, is never resolved by the Echo pass, moves at
   the carrier's speed and depth, and dies with the carrier. The Harvester's `cargo` is the
   nearest thing the sim has and it is not this.
2. **Engine off** (wave 2). A movement state below Silent Running: no thrust, drift on the
   current if one runs, SIG at the hull's floor. Silent Running trades weapons for quiet;
   this trades *movement* for it.
3. **A cheap cadence ping** (wave 2). Active sonar at a lower SIG and shorter reveal than the
   ping a commander orders, fired by a hull on its own cycle. The existing ping is the
   mechanism; the change is a second set of figures in `ACTIVE_SONAR` and a hull that fires
   without an order.
4. **Damage that reads the target** (wave 4). One weapon, two numbers: against structures,
   against hulls. The triangle's *one damage number per weapon* stays true per target class,
   and `ttkBands.test.ts` grows a structure column.
5. **A song from a hull** (wave 4). The Chorus Call's fauna weighting, emitted from a
   `HullEffect` rather than a Cantor. The Cantus already sings for PR; the Lure sings for
   the Drift.

Noisemakers, depth charges, torpedoes with a magazine, stationary-to-work effects and PR
grants from a hull all exist and are reused, which is most of the matrix.

## 7. What it costs, honestly

- **Sixteen stat blocks, sixteen arguments.** The design work is the doc, and the doc is the
  gate: a cell that cannot be written as one honest paragraph about sound or depth is cut,
  and the matrix has empty cells rather than arbitrary ones.
- **Sixteen models, eventually.** One each — a locked hull is one navy's — through
  `hull-intake`. None blocks a wave.
- **The opponent.** Every hull the commander cannot use is a hull the baseline never sees.
  Transports, decoys and siege are behaviours, not compositions, and wave 1, 3 and 4 are
  mostly AI work. This is the real cost, and it is why the waves are roles and not navies.
- **Balance churn.** Every wave moves the baseline, and #454 and #458 showed how far one
  economy lever moves four win rates. Each wave re-runs the baseline and the duels, and the
  guard-rails in [economy.md](economy.md) §9 are the floor a wave may not break.
- **Nothing on the Echo pass.** Forty berths a commander is forty berths whatever fills them.

## 8. Open questions

Three that were, one of them by wave 6 itself:

- **Retire the commons? No — and the harness said so in three different ways** (#510). The
  wave's own rule is that a navy still leaning on a common hull is *a finding about the
  roster, not about the commons*, and the reading found four leanings, of which exactly one
  is the commons doing a job nothing else could. Read over the four-faction baseline and all
  six duels:

  | Common hull | Named by | Built per match | What the reading says |
  | --- | --- | --- | --- |
  | Light Scout | Commune, Directorate | 11.7–30.3 | Load-bearing, as the cheapest hull the cycle can fall through to — and both navies buy their *own* scout separately, so this entry is not the scout slot |
  | Corvette | Knights | 5.9–7.1 | **Stale, and acted on (#529).** The Clarion stands in that slot now and the Order builds 4.8 of them a match over the stored thirty — the 5.6 here was a twenty-match probe, and the gap between the two is a useful calibration on how far a probe sits from a baseline. See §4 |
  | Corvette | Directorate | 0.4–2.4 | **Real.** Named the Chorister instead and it manages 1.1 a match — its 20 Biomass against about 55 a match — while Light Scout production *rose* to 30.3 to cover the gap |
  | Cruiser | Consortium ×2, Knights ×2 | **0.0, everywhere** | Named four times across two compositions, and zero to three decimal places rather than absolutely — one Cruiser in thirty matches, by the Consortium, since #529 (§4). A dead entry for the one role neither navy has a hull of its own for |

  So the commons are neither dead weight nor a surplus market: they are one hull holding a
  gap open (the Cruiser's mid-tier, which nothing fills), one hull the Directorate needs
  because its own line hull is priced in an account that yields two of them a match, one
  stale entry, and one genuinely useful floor under a production cycle that must always be
  able to afford *something*. **Retiring them would delete a floor and two findings and fix
  nothing.** They stay, unpriced and unchanged — not a surplus market either, since nothing
  is priced at a premium and no yard sells them. The findings are filed as #529 (the Knights'
  stale Corvette, and the Clarion that replaces it one for one), #530 (the Chorister's 20
  Biomass against 55 a match) and #531 (the Cruiser, and the mid-tier gap it is holding open
  for two navies).

  **Who sells them is answered later, and outside this plan.** The one thing the harness
  could not read is the fiction — four navies at war building the same three hulls from
  nobody — and the owner's answer is a fifth navy of mercenaries, with its own roster and
  storyline, in multiplayer and never in the campaign. It is filed as #543 and placed after
  release ([ROADMAP.md](ROADMAP.md) Phase 12), so nothing in this plan waits on it and no
  price here moves for it.

And one the second half of #520 leaves open:

- **Is the top of the roster priced for an economy that never banks it?** The two dearest
  hulls in the game are the Consortium's 700-nodule Bulwark and the Directorate's 450-nodule
  Dredge, and they are the only two heavies never built. Every navy's *heavy* under 300 is
  fielded — the Knights' 260-nodule Reciter at 0.5 a match — and everything from 330 to 400
  lands between 0.1 and 0.5. Against that, a Directorate nodule purse with a **median of 10**,
  a p90 of 110 and a peak of 300 across three whole matches: 450 is more than twice the largest
  bank that navy has ever been measured holding, and half of it is more than its p90. The
  composition bid (#531) and the arbitration work recorded in §4 have each taken a turn at this
  from the commander's side, and the second one measured the reason neither can finish it —
  `RUNG.SAVE_FROM`'s floor is half the price, and a navy that never reaches half can never open
  the hold that would take it there. Nothing reaches the Bulwark at all, because nothing was
  ever wrong with how a nodule price was saved for. So the remaining question is a pricing one
  and belongs to [economy.md](economy.md) §8 before it belongs to a commander: either the top of
  the roster is deliberately a hull only a long match reaches, in which case these two should be
  the only never-built heavies and that is the design working, or they are priced against a bank
  no navy in this simulation has ever held.

And two others, both on #495:

- **Twelve a navy stays the target** (with wave 0). *Very many* is an argument about roster
  width too, and the Commune could end at seven and the Directorate at eleven — but that is
  a finding for a wave to make, not a shape to draw in advance. The matrix keeps even
  columns, and a cell that cannot be argued stays empty rather than being filled to reach the
  number.
- **Carried hulls are heard, never listed** (before wave 1). A Freighter that dies with six
  berths aboard could have told its killer what it carried the moment they were not there.
  It does not: the load is audible only as +3 SIG per berth carried, a carried hull neither
  emits nor hears, and a kill reveals nothing beyond the battle site any hull's death leaves.
  [systems-echo.md](systems-echo.md) §3, "A hull in a hold", is the rule.

---

## Related

- **[units.md](units.md)** — the roster as it stands, the stat block format, and the design
  notes every sketch above answers to
- **[factions.md](factions.md)** — the four doctrines the matrix's columns are
- **[systems-combat.md](systems-combat.md)** — the weapon triangle and the TTK bands every
  gun lands inside
- **[systems-depth.md](systems-depth.md)** — Pressure Ratings, the bands, and why a transport
  is a depth argument
- **[systems-echo.md](systems-echo.md)** — SIG, HYD, the directional term, and the phantom rule
- **[systems-progression.md](systems-progression.md)** — the one rung, and the refits that
  share the Slipway's line
- **[economy.md](economy.md)** — berths, the three accounts, and the guard-rails
- **[graphics-standards.md](graphics-standards.md)** — gate 1's procedural fallback and gate
  2's intake
- **[asset-prompts-3d.md](asset-prompts-3d.md)** — where each new hull's prompt goes
- **[ROADMAP.md](ROADMAP.md)** — the phase this sits in and the issue that tracks it
