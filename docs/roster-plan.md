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
| **Heavy** | Bulwark (exists) | *Bower* — a swarm's anchor, not a hull's | Dredge (exists) | Reciter (exists) |
| **Support** | Tender (exists) | Sower (exists), Spinner (exists) | Precentor (exists) | Cantus (exists) |
| **Ordnance** | *Broadside* — the torpedo salvo | *Weaver* — decoys, not mines | *Thurible* — depth charges from below | *Lance* — one torpedo, aimed by the cone |
| **Siege** | *Furnace* — thermal cutters on a hull | *Blight* — a spore that eats plate | *Lure* — brings the Drift to a wall | *Tocsin* — the long gun that stands still |
| **Transport** | *Freighter* — armoured, loud, six berths | *Drifter* — two berths, nearly silent | *Verger* — carries cohorts down | *Antiphon* — carries three, projects depth |
| **Deep** | Abyssal Submersible (shared) | Abyssal Submersible (shared) | Abyssal Submersible (shared) | Abyssal Submersible (shared) |

Sixteen sketched hulls. With the fifteen that exist that is thirty-one, and each navy's bar
reads twelve: its nine (or eight, with the Chorister and the Clarion counting where they
fall), the Submersible, the Harvester, and the common trio the last wave decides the fate of.

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
| 4 — siege | Furnace, Blight, Lure, Tocsin | structure-only damage; spore over time; fauna weighting from a hull | match length falls without the win rates spreading |
| 5 — line and anchor | Caisson, Reed, Bower | none | the Consortium and Commune doctrines stop buying Corvettes |
| 6 — the commons | none | none | a decision, from the harness: retire the Light Scout, Corvette and Cruiser from the bars, or keep them as the surplus market |

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
duels" cannot be read, because *no Slipway hull is built in any duel* — not the Broadside,
the Thurible or the Lance, and not the Bulwark, the Dredge or the Reciter either. The
commander reaches the rung occasionally in a four-way match (the Knights lose 0.1 Reciters a
match) and never in a duel, so three of this wave's four hulls are invisible to the one
measurement that was supposed to judge them. That is a pre-existing limit of
`commandConstruction` rather than anything this wave introduced, and it will block waves 4
and 5 identically: their hulls are Slipway hulls too. Filed as #518.

What *is* measured: the Weaver is built and lost (0.2 a match for the Commune in the
four-faction baseline), so the one Foundry hull of the four is a behaviour and not just a
row. Every mechanism is held by a test instead — the magazine's spacing and burn-down, the
laid decoy's figures against the countermeasure's, the cone gate refusing a bearing astern
and keeping the shot in the tube, the committed solution, the charge that floats and the
rack that cycles for it. That is a weaker gate than the duels honestly, and it is the gate
this wave actually passed.

**Wave 6** is a decision the harness makes, not this document. If after five waves every
doctrine builds its own line and the commons are dead weight on the bar, retire them from
`PRODUCIBLE` and keep them for missions and the campaign, where the prologue's hulls are
authored. If a navy still leans on a common hull for a role its own roster does not fill,
that is a finding about the roster, not about the commons.

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

One the plan does not settle, for the person who owns the design:

1. **Retire the commons?** Wave 6 says the harness decides. The alternative is a design
   decision now — the Light Scout, Corvette and Cruiser become the *surplus market*,
   buildable by everyone at a premium, and the fiction ([culture.md](culture.md)) gets a
   sentence about who sells them.

And two that were, both on #495:

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
