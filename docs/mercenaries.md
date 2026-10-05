# The Unflagged — the Moorages and Their Hire

A party in the water that is not a power: the crews who sail the three common hulls under no
colours, from a moorage on the map, for whoever pays. **Designed, and nothing here is
built.** It is work for after release ([ROADMAP.md](ROADMAP.md), Later), it plays in
skirmish rooms and never in the campaign, and **no player commands it**. The owner's decision
on #543 is that the moorages are game-controlled: a party a commander can buy hulls from and
be attacked by, never a seat. Every figure below is design intent
([README.md](README.md), editing rule 2), and each that becomes a constant arrives TUNABLE.

One rule binds it, and it is the rule everything else here already lives by: **nothing a
moorage does may tell anybody what the Echo Layer did not resolve for them.** Its whole
argument fits inside that rule — a hull whose flag is honest, and whose employer is never on
the wire.

**Unflagged** is the moorages' flag and **moorage** is their site; [glossary.md](glossary.md)
defines both. *Yard* is not used for either, because [units.md](units.md) already calls the
Slipway the second yard.

---

## 1. What exists today

Read off the code at the commit this document landed in, because every section below is a
change to one of these rows.

| Piece | Today |
| --- | --- |
| The commons | The Light Scout, the Corvette and the Cruiser are on all four bars at one price. Wave 6 kept them as the floor a production cycle falls through to, and left one question open: who sells them ([roster-plan.md](roster-plan.md) §8) |
| What Tier 3 names | The hull and its flag, together. The Echo pass sets a contact's `kind` and `faction` from the same entity at Classification, so a Consortium Corvette classifies as a Consortium Corvette. The commons hide nothing a navy's own hull does not |
| Whose a hull is | `Owner` carries two fields, `slot` and `faction`, and the systems ask them different questions. Orders, berths, refits and auras ask the slot. The Klaxon (`combat.ts`), the Veil's silent running and the Directorate's shallows (`movement.ts`, `pressure.ts`), the signature (`acoustics.ts`) and the pressure baseline (`pressureRatingFor` in `units.ts`) ask the flag. A seated commander's hulls all carry the seat's navy, so the two never disagree |
| Game-controlled parties | One: the Drift, owned by `DRIFT_SLOT`, which is no player, and capped at 48 creatures (`DRIFT.MAX_POPULATION`) for the Echo pass's sake ([bestiary.md](bestiary.md)) |
| Phantoms | A false return claims a hull of a navy on the map that is not the pinger's, and skips every slot above the seats, which today means the Drift (`conjurePhantoms`, [systems-echo.md](systems-echo.md) §3) |
| Seats | Four at most, one navy each (`canChooseFaction`); AI seats are added in the ready room ([competitive.md](competitive.md) §1) |
| The ceiling | Forty berths a commander, so a four-seat match is at most 160 hulls. That is the count the pass is budgeted at, and it already crosses 2 ms there ([tech-stack.md](tech-stack.md), "What keeps the pass inside 2 ms") |

The second row corrects the premise #543 was filed on. The commons were thought to be
unidentifiable by their silhouette; they are not, because the flag rides with the class. What
can be made unidentifiable is something else, and §4 is that.

---

## 2. Who they are

**"Signed for the tide. Paid for the tide. Quit at the tide."**

### Identity

The moorages are crews without a power: hulls sailed by people who belong to none of the four,
for a fee, in water none of the four will fight in. They own the commons and nothing else.
The Light Scout, the Corvette and the Cruiser are the oldest patterns in the Rift, laid down
when every navy was rebuilt around listening in 41 PC ([timeline.md](timeline.md)), and every
navy's Foundry still builds them because nobody owns the drawings. A moorage owns the crews.

They came out of the Long Arrangement. Seventy-seven years in which four powers held still is
seventy-seven years of paying off crews, and the crews kept the hulls. They escorted freight on
the Consortium's corridors and surveyed for whoever filed the claim. The present crisis has
put them back to work that is nearly war, for all four sides, often on the same tide.

The Rift tolerates them for two reasons. Every navy has bought from them. And a moorage's water
is one of the few waters in the Rift where hulls of all four navies can hold within a
kilometre of each other and nobody fires, because a moorage strikes from its book anyone who
does.

### Governance

None above the moorage. Each is a company of crews with a **Keeper**, who keeps the book: the
hires open, the hands owed, the commanders struck. A moorage answers to no other moorage, and
the four powers have each tried to charter them and been quoted a price.

### The crisis

**The war might end.** The four crises of 214 PC are the best market the moorages have had in
two centuries, and every one of them is heading somewhere final. The Consortium models a short
war as cheaper than a slow collapse ([timeline.md](timeline.md)). A short war has a winner, and
a winner is one buyer, and one buyer sets the price. The moorages need four.

### Doctrine — *The Likeness*

Every unflagged hull sounds like every other. The Klaxon endures being heard, the Veil avoids
it, the Listening hears first and the Score aims it; the Likeness is heard and never
*attributed*. A listener who classifies an unflagged Corvette knows its class and its flag,
exactly as for any hull. What no tier tells them is who is paying it (§4).

- **Sound:** no doctrine of their own on the hull — no Klaxon, no Veil, no cone — so an
  unflagged hull is as loud as the roster table says, from every bearing.
- **Depth:** **rents the middle.** Every unflagged hull is PR-2, exactly: the moorage floor
  lifts the Light Scout to it and nothing takes any of the three past it (§4). The moorages
  refuse the deep, because nobody pays enough to crush.
- **Weakness:** no doctrine is also no strength. An unflagged hull does what its stat block
  says and nothing more, on every navy's side.

### Visual identity

Bare hulls. A moorage strips the colours off a hull it takes in and never paints another, so
an unflagged hull is primer and old plate, with the scar of a previous navy's palette where the
paint came off. The silhouettes are the commons' own and do not change. The ink a listener
reads an unflagged contact in is not chosen here: it is a fifth ink beside four palettes and
three colour-blind substitutions, and [art-direction.md](art-direction.md) and
[ui-ux.md](ui-ux.md) §11 own that call.

There is no superweapon. A superweapon is a hazard a *commander* fires
([factions.md](factions.md), "What a superweapon is"), and a moorage is not one.

### What they'd never admit

The book is not neutral. In the Long Arrangement the moorages' only steady work was escorting
Consortium freight, and no Consortium hull has ever been struck from a moorage's book. In a
match the book is exact (§3). In the Rift it has a client.

---

## 3. The moorage

**One site a map, authored, and only on a map that authors one.** It is a structure the map
seats at the start, at the working depth every structure stands at — 600 m, in the Mid-Water
(`CONSTRUCTION.WORKING_DEPTH_M`). It sits where every spawn the map seats is the same distance
from it, so no seat is born nearer the hire. Its position is drawn for every player from the
first tick, like a vent's.

- **It sounds like a Foundry:** **SIG 25** idle and **55 while its line runs**
  ([units.md](units.md)). A hire being filled is heard by everyone in earshot of the moorage,
  and at that loudness nobody can tell by ear whether a moorage is filling a hire or a
  commander's Foundry nearby is building. The place tells them; the sound does not.
- **It takes no damage**, as a vent takes none. A moorage that could be sunk would be sunk by
  whichever commander needed its hires least, and the rest of the match would have lost a
  third party to one commander's convenience.
- **Its water** is everything within **600 m** of it. Nothing is built there.
- **Its guard** is three hulls of its own: one Light Scout, one Corvette, one Cruiser. They
  hold the moorage's water and never leave it. They are the stock a hire is filled from
  (§4), and they are its only weapon.
- **Its book.** A commander whose hull fires a weapon from or into the moorage's water is
  **struck** for the rest of the match. A struck commander signs nothing, and the guard treats
  that commander's hulls inside the water as hostile. Hulls the commander already hired keep
  serving: they were paid for. Being struck is the moorage's whole power over a commander,
  and it matters exactly as much as that commander needed it.

A ping inside the water is not violence and strikes nobody. A creature is not a commander
and is struck from nothing; a guard hull a creature kills is replaced like any other.

**The moorage hears as a side.** The Echo pass resolves for its slot as it resolves for a
mission's scripted party, and the guard acts on what that slot resolved. So it is deceived as a
commander is: a struck hull silent at the edge of the water is a hull the guard has not heard.
The skirmish AI's rule, that it observes the same snapshot a player does
([systems-echo.md](systems-echo.md) §3), is the guard's rule too.

---

## 4. The hire

**A commander buys a hull at the moorage, in person.** One of their hulls inside the moorage's
water signs, which takes **10 s** with the hull still inside. Signing makes no sound; the hull
doing it makes whatever sound it makes, in the one water on the map every commander knows the
position of.

- **What is sold:** the commons, and nothing else. Not the Abyssal Submersible, which is the
  crystal and the deep the moorages refuse; not the Harvester, because a moorage works no
  ground; not the Chorister, which is a cohort's.
- **The price** is the roster's: 50, 120 and 420 Nodules ([units.md](units.md)). The moorage
  charges what a Foundry costs, because the commons are priced the same for everyone and
  [roster-plan.md](roster-plan.md) §8 found no premium to charge. Nodules only, since the
  accounts are never exchanged ([economy.md](economy.md) §8).
- **The berths** are the buyer's, against the buyer's forty, from the moment of signing. A
  commander at the ceiling cannot hire, exactly as they cannot queue.
- **The hull** is the guard's hull of that kind, at once, if it stands at its post. It passes
  to the buyer where it floats, and the moorage lays down its replacement on its line at the
  roster's build time — 12, 30 or 90 s, at SIG 55. If the guard's hull of that kind is not at
  its post, the hire waits on the line, first signed, first filled.
- **For the match.** A hire does not expire and does not go home. It serves until it dies,
  and if its buyer is eliminated it scuttles with the buyer's force
  ([game-identity.md](game-identity.md), "Scuttling").

So a hire is a second line outside a commander's base, heard by everyone near the moorage,
and the hull it delivers flies the moorage's flag and none of the buyer's doctrine.

### The flag and the orders

A hired hull answers `Owner`'s two questions differently, and that split is the whole design.

**Its slot is the buyer's.** It takes the buyer's orders, occupies the buyer's berths, listens
for the buyer's side, sits on the buyer's team, takes the buyer's auras
("nothing lends a hull's aura away", `auras.ts`), and is hostile to everyone the buyer is.

**Its flag is the moorage's.** Every system that asks the flag gets *unflagged*: no Klaxon, no
Veil, no cone, no Listening, no shallow-water penalty. And its rating is the moorage's —
PR-2, lifted to it by the moorage's floor and held there by a cap that a refit, a Spire's grant
or anything else that raises a rating does not pass. The Commune's refit is capped at PR-2 the
same way ([systems-progression.md](systems-progression.md) §2).

That is what makes the hire an argument about depth for each navy, and a different one for
each:

| Navy | What a hire is to it |
| --- | --- |
| Consortium | The Consortium's own rating, and no Klaxon: a hired Cruiser cruises at SIG 65, over the Klaxon's 60, and is paid nothing for it. The price of a hull its Foundry did not have to build |
| Commune | A hull in the Mid-Water from the moment it is signed, without the refit the Commune could only buy to PR-2 anyway. Paid for in the Veil: it runs silent at the common −45% speed, not the Commune's −20% |
| Directorate | A hull that can work the Shelf without the poison above 400 m — and that cannot follow a cohort below 1,800 m. The Directorate hires for the water it hates |
| Knights | A hull with no cone, loud from every bearing, and the one hull the Order can lose without losing a Knight |

### What a listener hears

**An unflagged contact names its class and its flag at Tier 3, as every contact does, and its
employer at no tier.** The guard's own Corvette and a Corvette hired by any commander are the
same row in a contact log. Track adds health and facing, as it does for anyone. Who signed
for it is never resolved, so it is never sent.

That is the Likeness, and it is bounded the way the Fields' lie is bounded
([systems-echo.md](systems-echo.md) §10): **the guard never leaves the moorage's water.** An
unflagged hull outside it is working for somebody. In a duel that somebody is the other
commander, or yourself. In a free-for-all it is one of three, and nothing but what the hull
does next will say which. Near the moorage, an unflagged hull might be the guard — harmless
unless you fire — or a hire that is not; firing to find out gets you struck. That is dread
with an answer: wait, or pay.

**Phantoms claim the flag too.** A ping from scattered water may return an unflagged hull
whenever the moorage is on the map. Otherwise every unflagged return from crystal would be
known true, which is the tell the phantom rule exists to deny ([systems-echo.md](systems-echo.md)
§3).

**The Chorus Call survives beside it.** The Call lies about *whether*: six Choristers that are
not there, seen through at Tier 4 ([systems-echo.md](systems-echo.md) §8). The Likeness never
lies about whether; an unflagged hull is a hull, and a second ear confirms it. It hides *whose*,
which no tier answers. The two questions do not overlap, so neither doctrine spends the other.

---

## 5. Where it plays

- **Skirmish rooms only, never a mission.** The twenty-nine missions and the record do not
  change ([campaign.md](campaign.md)), and no mission literal seats a moorage. The campaign's
  silence about the moorages is deliberate: the campaign is four powers' stories, and the
  moorages are in none of them.
- **A ready-room switch, off by default**, beside the AI seats, and only on a map that authors
  a moorage. Off by default keeps every match that exists today the match it is.
- **Never in a rated room.** The duel pool is admitted by a measurement taken without one
  ([competitive.md](competitive.md) §2), and a ladder measures what it admitted.
- **Teams.** A hire sits on its buyer's team. The book strikes a commander, not a team: an ally
  who fires in the moorage's water is struck alone ([competitive.md](competitive.md) §5).

---

## 6. What it costs the pass

**One structure and three hulls.** Every hire is a hull inside its buyer's forty, so the
ceiling of 160 hulls at four seats does not move for it; the guard is the only addition. That
makes 164 hulls against a pass already over 2 ms at about 160
([tech-stack.md](tech-stack.md)). The pass's cost grows roughly with the square of what it
hears, so three hulls is about 5% more pairs. The moorage's side adds three listeners.

That is small, and it is not free. The build is gated on the bench measured at four seats
with a guard, beside whatever [tech-stack.md](tech-stack.md) then records against the
population cap (#437). It is the number to argue with ([economy.md](economy.md) §10), not a new
one.

---

## 7. Decisions

The three questions #543 left open, and one this document met on the way, each with the
options it did not take. The owner answered the first before this document was written.

**1. A navy or a third party?** A third party, game-controlled. The owner's decision on #543,
4 October.

**2. Does it hold ground?**

- **One moorage a map, which takes no damage; no Bastion, no economy, no win condition**
  **(recommended, taken).** It holds a place to be heard at, which is what a sound argument
  needs, and adds three hulls to the pass.
- **A full fifth commander under AI control.** A navy with no player is a seat by another
  name: forty berths, a fifth slot's force in the pass, and a win condition nobody holds.
- **No ground at all — hires arrive from the map's edge.** Cheapest in entities, but then
  hiring is a menu, and nothing about it is heard.

**3. What does it do with the commons' one asset, and does the Chorus Call survive?** §1 found
the asset was never there: the flag rides with the class at Tier 3.

- **A hired hull flies the moorage's flag and carries none of the buyer's doctrine**
  **(recommended, taken).** It uses the split `Owner` already has. It also makes the hire an
  argument about depth per navy (§4).
- **A hired hull flies its buyer's flag.** Hiring is then a second Foundry at a known place,
  and the issue's sound argument is gone.
- **Withhold the flag of unflagged hulls until Track.** A new tier rule for one party, and a
  Tier-3 hull with its flag missing would name the moorage by the gap.

**4. Do the commons leave the four bars?**

- **They stay on every bar, unpriced and unchanged** **(recommended, taken).** Wave 6 found
  them load-bearing and the balance freeze holds the bars (`CLAUDE.md`).
- **They are sold only at the moorage.** That deletes the floor
  [roster-plan.md](roster-plan.md) §8 measured, and moves every navy's production cycle, which
  is inside the freeze.

---

## 8. What building it changes

In order, because each step can be played before the next exists:

1. **A fifth `Faction` value, appended**, never renumbered, and never offered to a seat:
   `canChooseFaction` refuses it, and no `PlayerState.faction` holds it. Every table keyed by
   faction gains a row, `FACTION_PRESSURE_BASELINE` among them, at PR-2, with the cap beside it.
2. **The slot and the flag, audited.** Every reader of `Owner.faction` is asked whether it means
   *whose* or *what doctrine*, and every reader of a rating whether it passes the cap. The
   phantom pool counts the moorage's own slot, which `conjurePhantoms` skips today as it skips
   the Drift's.
3. **The moorage as a map literal** ([maps.md](maps.md)), on each archetype that can seat one
   at an equal distance from every spawn, and the ready-room switch.
4. **The guard's brain and the book**, beside the Drift's, on the moorage's own slot.
5. **The hire**, as a client message declared in `wire.ts`, with its shape. It is an in-match
   verb, so the commander either learns to say it or `AiUnbuilt` names it, and
   `aiVocabulary.test.ts` holds the count ([roster-plan.md](roster-plan.md) §2: the opponent
   has to know how to use it).
6. **The ink and the HUD**: the fifth ink, and how a buyer's own screen marks a hull it hired
   ([ui-ux.md](ui-ux.md)).

Nothing in this list moves a price, a yield or a build list.

---

## 9. Considered and set aside

- **A playable fifth navy.** The owner's decision on #543. The issue's title says *navy*;
  the moorages are a party to the war rather than one of its sides.
- **Trading between accounts at the moorage.** The owner offered trade as an example; the
  accounts are checked together and never exchanged ([economy.md](economy.md) §8), and a
  commander who could turn Nodules into Biomass would be wearing another navy's economy. The
  hire is the trade.
- **A raid contract** — paying the moorage to send hulls at a point. It is a hire and an
  attack-move ([ui-ux.md](ui-ux.md)), which the buyer can already give.
- **The moorage raiding on its own account.** The Drift is already the party that punishes
  noise without being asked ([world.md](world.md), "The Drift"). A second would compete for the
  same job, with hulls outside every ceiling.
- **A hire for a term**, after which the hull goes home. A timer to watch, a departure to hear,
  and a hull that was paid for at a Foundry's price and then left. One that serves until it
  dies is simpler, and a term can be added if a match wants one.
- **A moorage that can be sunk.** §3.
- **A sixth register.** The moorages have a manner of speech (§2) and no voice on the speech
  bus: no mission speaks in it, so [culture.md](culture.md) §3 stays at five.

---

## Asymmetry, in factions.md's terms

| | The moorages |
| --- | --- |
| **Sound** | Heard, never attributed |
| **Depth** | Rents the middle, and refuses the rest |
| **Economy** | None of their own; they sell |
| **Army** | Three hulls, and whatever anyone has bought |
| **Wins by** | Nothing. They do not win |
| **Loses to** | Peace, or a winner |
| **Fears** | One buyer |

---

## Related

[factions.md](factions.md) (the four powers, and the shape this document copies) ·
[roster-plan.md](roster-plan.md) §8 (the commons, kept, and the question this answers) ·
[units.md](units.md) (the commons' stat blocks) · [systems-echo.md](systems-echo.md) (§3 the
phantom rule, §4 the tiers, §8 the Chorus Call) · [systems-depth.md](systems-depth.md) (the
bands and the baselines) · [economy.md](economy.md) (§8 the accounts, §10 the berths) ·
[competitive.md](competitive.md) (seats, teams, and the rated room this stays out of) ·
[tech-stack.md](tech-stack.md) (the pass's budget) · [world.md](world.md) and
[culture.md](culture.md) (the setting it sits in) · [ROADMAP.md](ROADMAP.md) (Later, "After
the game ships")
