# The Attending 2 — Intake

> The second mission of the Directorate campaign ([campaign.md](campaign.md) §6), specified. The
> thirteenth mission document the bible carries, to the pattern
> [mission-sorrowgate.md](mission-sorrowgate.md) sets: everything here is authored — the forces,
> the water, the beats, the numbers and the text — and code transcribes this document.

**Setting:** the banding ground, the upper Ninth above Sufficiency, 214 PC
([world-map.md](world-map.md); [characters.md](characters.md)).

**Mission id:** `attending-intake` — namespaced by campaign after `attending-attendance`, per
[campaign.md](campaign.md) §1.

**This is the campaign's first mission with combat in it, and the Directorate's first with an
economy.** Attendance had neither: `fauna: false`, nothing attacked the player, and no channel
banked anything ([mission-attendance.md](mission-attendance.md) §3). So this document is where
the Directorate stops being a listening posture and becomes a faction that fields an army — a
larger step than its position in §6 suggests, and the reason §3 and §4 are the longest sections
here.

It is also the mission whose subject is a thing the game must not have an opinion about. §5 is
where that is decided, and it says its reasoning out loud so that the decision is reviewable
rather than merely made.

---

## 1. What an Intake Is

A **cohort** is assigned at birth, modified for a depth band, and belongs to it
([factions.md](factions.md)). The **intake** is the shift on which a year finds out whether the
band it was made for is the band it can hold. It is not a test the Directorate administers to
people; it is a shift of ordinary work, done in the water the year was built for, and watched.

**Roughly eight per cent of each generation cannot adapt and are reassigned to shallow-band
labour** — "the one job in the Directorate that resembles the debt-berth they despise"
([factions.md](factions.md)). Undermarshal Korrin has signed off three intake years at that rate,
reassigned them personally rather than let the Cantorate handle it, **and she visits**
([characters.md](characters.md)).

Two facts about that sentence shape the whole mission, and neither is negotiable:

**Nobody dies.** Reassignment is a posting, not a sentence. A mission in which the eight per cent
are killed — by the player, by the Drift, or by an authored beat — would be a different and much
worse game, and it would break [campaign.md](campaign.md) §2 rule 1 in the one place the campaign
can least afford it. §5 is built so that the act has no casualty and no cost, and the mission's
one lethal thing (§6) is deliberately placed where it cannot be mistaken for it.

**The eight per cent is a finding, not a quota.** The Directorate does not hand a ground a number
of people to reassign. It reads what the grounds file and the number falls out. This distinction
is the entire neutrality argument: a mission that told the player *reassign one* would be a
mission that had taken a side, because it would have made the act mandatory and therefore
correct. The mission asks for nothing and records what happened.

**Where this ground is, and why it is not Sufficiency.** The attending galleries stand at
2,750–3,400 m and the Ninth's axis falls past 4,000 m — water no animal in the bible reaches
([bestiary.md](bestiary.md) §4; [mission-attendance.md](mission-attendance.md) §1). A cohort
economy is fauna, and fauna stop at 2,700 m. So the banding ground is *above* the city, on the
upper Ninth at 1,500–2,400 m, which is also exactly where the year's band is: the doorway between
Mid-Water and the Abyssal, the descent Sufficiency sits at the bottom of.

That is not a convenience. **The intake is held at the top of the water the year will spend its
life in, and it is the one place in the Rift where the Directorate's income lives.** The map's
depth choice and the mission's subject are the same choice.

---

## 2. Whose Hulls the Player Commands

**The player commands one intake: twelve Abyssal Submersibles, crewed by Intake 11, and nothing
else.**

| Hull | Count | Stats | Why |
| --- | --- | --- | --- |
| Abyssal Submersible — the intake | 12 | **SIG 22 idle / 28 cruise · HYD 85 · PR-3 · 520 HP · 80 dmg at 650 m** ([units.md](units.md)) | The faction's only hull, and the year's own. PR-3 covers every metre this map authors, so nothing here crushes anybody |

**No Cantor, and the absence is the point.** Attendance had the Cantorate's dome standing over it
as a lent instrument ([mission-attendance.md](mission-attendance.md) §5). The banding ground has
none: the Cantorate does not attend an intake. First Cantor Ossary is not present, is not
mentioned, and does not send anybody — and the mission never remarks on it. Mission 6 is
*Conclave*, where Ossary declines to move ([campaign.md](campaign.md) §6), and this is the first
time in the campaign he declines to be somewhere.

**No silence order.** The first Directorate mission without one, and the second reason this
mission is a step rather than a sequel. Attendance held the watch to SIG 25 and wrote the debt
down; the banding ground holds nobody to anything, because **everything that makes you strong
makes you loud** ([economy.md](economy.md) §1) and this is the mission where the Directorate is
strong. The literal carries `silenceCeilingSig: 100` and `debtCapS: 0` with no `arrayTag`, which
is Asset Recovery's posture ([mission-asset-recovery.md](mission-asset-recovery.md) §3): the
ledger simply does not run.

**No active sonar**, per [campaign.md](campaign.md) §10's mission-3 rule. Sharper here than
anywhere, for two reasons rather than one. The Directorate already has the best ears in the game
and must still not have the button — that is Attendance's argument, restated. The new one is that
**the ping's third consequence is that it wakes the map up**: an active emission triples a
creature's hearing of you ([bestiary.md](bestiary.md) §2) and a Sounder inside its corridor reads
it as a challenge call and alters course toward the emitter for two minutes. In a mission whose
one lethal thing is a colossus, the withheld button is the button that would summon it. The
campaign's oldest rule and this mission's only real threat happen to be the same sentence.

### What the intake does not carry

1. **No structures and nothing to build.** There is no Bastion, no Foundry, no refinery and no
   throttle. The intake arrives with twelve hulls and ends with however many it still has. The
   base-building loop is not this mission's system and would be a second one.
2. **No reinforcement.** Twelve is the year. A cohort economy that could replace what it spent
   would teach a different lesson than the one §6 row 2 names, and the roster could not price
   the replacement anyway (§13).
3. **No repair.** Nothing on this map heals, so damage taken is damage carried to the close.
   That is what makes a hull that has been in the water once different from a hull that has not
   — which is the fact §5 rests on, and the only fact it rests on.

---

## 3. The Cohort Economy

The system this mission teaches, per [campaign.md](campaign.md) §2: one system, load-bearing by
the last five minutes. The system is **the Directorate's income** — Biomass, and what it costs to
go and get it — and it lands in four movements.

**1. Your money is an animal that cannot be heard.** The Directorate's channel is rendered fauna
([economy.md](economy.md) §2; [bestiary.md](bestiary.md) §5), and the only animal that lives in
this water is the **Hollow** — the Drift's own Silent Running, **SIG 3 at rest**, a listener rated
80, which does not move until something loud passes within 500 m ([bestiary.md](bestiary.md) §4).

SIG 3 is not a small number chosen for flavour. It is the same three the Mouth's return carries up
the Ninth ([mission-attendance.md](mission-attendance.md) §4), which means **the arithmetic of
this mission's economy is character-for-character the arithmetic of the previous mission's
liturgy.** Against an Abyssal Submersible's 85, down trench water at PF 1.60:

| What the intake gets | Range |
| --- | --- |
| Contact — something is there | **1,231 m** |
| Bearing — where it is | **955 m** |
| Classification | 694 m |
| Track | 518 m |

The campaign taught those four numbers by having a player sit still for eighteen minutes and use
them on a god. It now hands them back as a pay slip. Same detection maths, third life
([campaign.md](campaign.md) §2, rule 2).

**2. The map is eight square kilometres and the money is eight animals.** The banding ground is
5,000 × 4,000 m, and a hull hears a coiled Hollow at 1,231 m in the best water on the map. Twelve
hulls listening from one place cover a disc; twelve hulls spread across the benches cover the
ground. **The intake is not a fleet, it is an array**, and that is what "cheap expendable units"
means before it means anything about losses: the Directorate's answer to a search problem is to
have enough bodies to be in twelve places.

The opening states it without a word. The muster stands at 2500, 750 and the nearest coiled Hollow
is at 1250, 1750 — **1,601 m away, against 1,231 m of contact.** The intake begins the mission
unable to hear a single thing it is there to earn.

**3. Loudness is the lever, and for this faction it is a poor one.** Fauna are drawn to noise, and
the Directorate is structurally rewarded for other people being loud near their animals
([factions.md](factions.md)). Alone on a map, they have only their own noise, and their own noise
is the one noise the Drift discounts: **a Directorate hull is heard at ×0.4** — "the Directorate
smell wrong and taste worse" ([bestiary.md](bestiary.md) §2). Against a Hollow's Interest 45 and
Commit 70, in trench water:

| The intake is | A Hollow grows interested at | A Hollow strikes at | The same, for anybody else |
| --- | --- | --- | --- |
| Idle, 22 | 215 m | **163 m** | 381 / 289 m |
| Cruising, 28 | 250 m | **190 m** | 443 / 336 m |
| Firing, ~48 | 352 m | **268 m** | 626 / 475 m |

Read the last column against the third. **Everyone else in the Rift can call this animal from
nearly twice as far as the Directorate can**, and the Directorate is the only faction it pays.
That is the faction's doctrine turned exactly inside out by being alone with it: their whole
economic design is *let other people be loud near our animals*, and an intake has no other people.
So the year has to walk to its income, and walking is the lesson.

**4. The eighth movement of the search is the expensive one.** Eight Hollows, 35 Biomass each, and
a band of **245** — seven of the eight. The eighth is slack, and it is authored as slack because a
band met exactly would make the mission a checklist and the last animal a formality. A player who
finds seven has done the whole job. A player who finds eight has been thorough and is told
nothing.

**The eighth is slack in the roster's arithmetic, and in the ground's only for a year that
spreads.** A rendering pays the roster's figure over ground the year has not worn, and the ground
is worn by noise ([bestiary.md](bestiary.md) §6): a column of three cruising together is 84 of SIG
in a cell whose threshold is 60, so it wears every cell it works and is paid three quarters for
what it renders there — **26.25, not 35**. Measured, a three-hull column that works the walls in
order banks 227.5 from seven and answers the band from the eighth; twelve hulls in twelve places
are never more than 56 in any cell and wear nothing by moving, and what a kill takes the ground
has back inside two minutes. That is the price under "the intake is not a fleet, it is an array",
and it is the one number in this movement the mission does not say: the ground rewards the spread
and does not explain why (§10). §13 carries the decision to leave it unsaid, and what the
alternatives cost.

> **Against the engine as built, stated here rather than discovered — and since answered.** These
> ranges are exact and were measured against the shipped propagation model, and until #353 they
> did not add up to a *fight*. An Abyssal Submersible's gun reaches 650 m; a Hollow coils at
> Interest rather than closing and struck only inside 190 m of a cruising Directorate hull, so a
> hull that kept its distance rendered every Hollow on this map without ever being touched. Now
> damage is a sound ([bestiary.md](bestiary.md) §4): the first shell springs the strike from any
> range, and §4 below prices what a stand-off costs, by count. §13 carries the finding and its
> settlement, and §6 is still where this document puts the mission's teeth.

### The SIG budget

**SIG budget: 50** — the loudest the campaign has authored, and by a wide margin: Attendance's was
8 ([mission-attendance.md](mission-attendance.md) §4). Fifty is the middle of a harvest cycle's
45–60 ([economy.md](economy.md) §2, §9), which is what the Directorate sounds like while it is
being paid.

It is a description, not a ceiling — [campaign.md](campaign.md) §10 — and this mission has neither
a silence order nor anything on the map that would sanction a breach. Exceeding it costs nothing
and is heard by nothing that has an opinion. That is the whole distance the campaign has travelled
in one mission, and the document does not point at it.

---

## 4. What a Hollow Costs

A rendering is one exchange and it is over in seconds. The numbers are the roster's:

- A Hollow has **640 HP**, deals **55/s** inside 110 m, and lunges at 75 m/s — faster than the
  intake's 60.
- An Abyssal Submersible has **520 HP** and deals **80 every 1.8 s** — 44.4/s — out to 650 m.
- **Damage is a sound** ([bestiary.md](bestiary.md) §4, #353). The first shell springs the strike
  from any range: the Hollow commits at strike loudness toward the loudest thing it hears, which
  here is the gun, and has the whole stand-off to cover at 75 m/s before it bites.

Measured against the engine, with the hulls holding station and firing on their own — a hull that
is travelling holds its fire, so backing away from a lunge is the other way of not shooting:

| How it is done | What it costs |
| --- | --- |
| **Three hulls at 400 m** | Nothing. 640 HP at 133/s is three volleys and 3.6 seconds; the lunge needs 4.3 and lands on a corpse |
| **Two hulls at 650 m** | Nothing. Four volleys and 5.4 seconds against a 7.6-second lunge — the pair renders for free, and it is the last formation that does |
| **Two hulls at 400 m** | One hull at **433 of 520**. The animal arrives with a volley still to come and bites for it |
| **One hull at 650 m** | **216 of 520**. Eight shells over 12.6 seconds, and the Hollow is on the hull for the last five and a half |
| **One hull at 400 m** | **32 of 520**. The same eight shells, and nine seconds of being bitten for them |
| **One hull inside 190 m, two more shooting** | The bitten hull is at **124 of 520** when the animal dies, and a hull at 124 cannot survive a second strike — 2.3 seconds of one |
| **One hull alone, inside** | It loses. 640 HP at 44.4/s is 14.4 seconds and 520 HP at 55/s is 9.5 |

**A cohort hull is good for exactly one strike**, and it is now a sentence the player is made to
hear: a hull that renders alone, from any range, comes back with a strike's worth of hull gone,
and cannot render twice. That is the mission's whole account of "expendable", and it is arithmetic
rather than a claim. Standing off is still not fenced. It is priced, and priced **by count**, which
is the cohort economy in one table — an array of three renders anything for nothing; a pair
renders for nothing only at the gun's full reach; a lone hull pays in hull for every animal it
takes.

The document takes that trade knowingly rather than papering over it. What the close-range reading
buys is **speed** — a Hollow held at 190 m dies in the same seconds whether or not it bit anybody,
and a Hollow shot at from 650 m has to be reached first — and speed against a twenty-minute clock
with eight animals to find is the currency the mission prices. What the lunge adds is that every
rendering is **announced**: a Hollow is loud only while striking, and a shot one strikes, so the
region hears each animal the intake takes from the moment the first shell lands
([bestiary.md](bestiary.md) §4). A player who never closes will bank the band and will bank it
late, which is the shape §6 is built to punish; a player who spreads to one hull a wall to bank it
early is bitten for it, which is the shape §3's ledger rewards and this table charges for.

---

## 5. The Roll

**The mission's one act is a finding, filed once, worth nothing, and read out.**

At the close the ground files what it saw. It has two things it can file, and the player decides
which by where they put their hulls in the last minute:

- **One of Intake 11 is entered on the shallow-band roll.** A hull is taken to the foot of the
  ascent, the stair that leaves the map northward toward the shallows. Nothing happens to it. It
  stands there for the rest of the mission, it is not removed, it is not harmed, it still counts
  in every number the mission keeps, and the record has a line in it.
- **The ground returns none.** All twelve muster, the finding is entered as *none*, and that is
  also a line.

Neither is scored. Neither is an objective the outcome ladder can see. Neither is worth a single
point of anything, and the mission never says one is better.

**How this reading was chosen, and what the alternatives cost.** [campaign.md](campaign.md) §6
row 2 says only that "the 8% who cannot adapt are reassigned" and that "Korrin does it herself",
and the mission format expresses at least three readings of that sentence:

| Reading | What it buys | What it costs |
| --- | --- | --- |
| A `lose` beat at an authored tick | Truest to *Korrin does it herself* — the player is not Korrin — and cheapest to author | The mission's central act has no verb, which for a mission about that act is a real loss. And `lose` is death (§13): it would state something the fiction does not |
| **A choice group on a condition-fired beat** | The act has a verb, the player performs it, and the exclusivity is authored rather than guessed | It is the reading most able to editorialise, because a choice the game asks for is a choice the game seems to want something felt about |
| An `extract`-shaped row over a shallow region | The euphemism becomes a physical act | *Shallow* is §6's mission 4 and owns the above-400 m penalties as its one system. Taking the climb here risks taking mission 4's lesson |

**This document takes the second, narrowly**, and pays the third's mechanism to do it: the choice
is expressed by an `extract` predicate over a region, and the region is the *foot* of the ascent
at 1,500 m rather than the shallows themselves, so no hull on this map is ever above 400 m and
mission 4's system is untouched (§11).

**How "Korrin does it herself" survives a player doing it.** The player does not reassign anybody.
The player files what the ground saw; Korrin signs it, and Korrin goes. The distinction is not a
dodge — it is what the Directorate is, an institution in which the observation and the act are
different people's work and both are written down. The close is hers, and so is the last line of
§12.

### What would breach the neutrality, named so it can be checked

[campaign.md](campaign.md) §2 rule 1 and the Adze question ([characters.md](characters.md) — "is a
life you didn't choose, but genuinely love, a life that was taken from you? The game does not
answer") are constraints on the *mechanics*, not only on the prose. Six things would breach them,
and none is in the mission:

1. **Paying for it.** No Biomass, no hull, no time and no objective progress is granted for
   entering the roll. Filing costs nothing and earns nothing.
2. **Penalising it.** The entered hull is not removed, not disarmed and not deducted. It keeps its
   role and is still counted by the survival objective at the close. A player who files and a
   player who does not end with the same twelve.
3. **Making the eight per cent worse units.** There are no marked hulls. All twelve are identical
   in every stat, and the mission never suggests which one the ground has a finding on. If the
   arithmetic could answer the question, the game would have answered it.
4. **Making it mandatory.** There is no quota. Eight per cent of twelve is 0.96, and the
   Undermarshalcy does not round up ([mission-attendance.md](mission-attendance.md) §12) — so this
   ground owes nobody. The year's figure is what the grounds produce, not what they are handed.
5. **Ranking it in the close.** The finding is a non-terminal objective with a `reading` pair. It
   is read out and it does not touch the outcome (§13). Complete, Partial and Lost are decided by
   the band and the muster and by nothing else.
6. **Explaining it.** Nobody in the water argues about the roll, defends it, or regrets it aloud.
   Korrin says what she says in §12 and it is not an argument.

**The one editorial risk the document accepts, stated rather than hidden.** §6 puts a Sounder
across the ground in the last five minutes, and a player will lose hulls to it and will choose
which ones by moving some and not others. That is a second act of selection in the same twenty
minutes, and the rhyme is deliberate. It is also the place where this mission could be read as
having an opinion — *the game made me do it twice* — and it is the judgement in this document a
reviewer should look at first. The mitigation is that the two are mechanically opposite: the
Sounder's selection is lethal, unavoidable and not filed, and the roll is harmless, optional and
the only one written down. If that separation is not felt in play, the Sounder is the half to
move, not the roll.

---

## 6. The Sounder

**One colossus, one transit, in the mission's last five minutes.**

The Sounder is the only thing on this map that can take a cohort hull, and the way it does it is
the reason it is here rather than a second predator: **it does not fight.** It swims through the
space something is in, and the something loses ([bestiary.md](bestiary.md) §4). It cannot be
killed — not for its 9,000 HP, which twelve intakes at 44.4/s each would have through in seventeen
seconds, but because the transit is a beat and a driven creature takes no weapon damage
([bestiary.md](bestiary.md) §4; #349) — it cannot be reasoned with, and the Directorate's own
superweapon summons one and does not steer it ([factions.md](factions.md)).

**And the Abyssal Submersible is the shortest hull it notices, by exactly nothing.** A Sounder
ignores small units; the roster's threshold is a 95 m hull, and the Abyssal Submersible is 95 m —
against a Corvette's 80 and a Light Scout's 60. The Directorate's only hull is the smallest thing
in the game a colossus grinds through, and it is the one on this map. Nothing had to be added for
the mission to have a lethal threat; the roster already had one, aimed at exactly this faction.

The transit is authored, not simulated, for the standing reason
([mission-sorrowgate.md](mission-sorrowgate.md) §9): a mission's beats happen when the document
says they happen. It enters from the throat at 16:00 and crosses the bench and the muster on a
straight line, and it is announced by the loudest sound in the bible.

| | |
| --- | --- |
| **The call** | SIG 100. An Abyssal Submersible holds it at contact from **11,016 m** — three times the width of the map. There is no hull on this map that does not hear it, and no place to stand where it is faint |
| **The warning** | 15:00, against a transit at 16:00 and a close at 20:00. [campaign.md](campaign.md) §10 asks for sixty seconds; this is sixty times sixty |
| **The answer** | Move. Ascent is 15 m/s and silent ([systems-depth.md](systems-depth.md) §2), the line is known from the call, and a hull that is somewhere else is a hull that is fine |

**The mission's last five minutes are the previous mission's lesson, spent.** Attendance's whole
argument was that where a listener stands is the only lever it has. Here the player is told where
something is going to be, an hour of warning early, and every hull that dies is a hull the player
did not move. The mission is not hard. It is *attended* — and a player who spent the first fifteen
minutes with all twelve hulls scattered across two overhangs earning a living has the hardest
version of an easy problem, which is the trade §3 sold them.

---

## 7. What Is Heard

The banding ground is loud where Attendance was silent, and the mix inverts with it
([audio-direction.md](audio-direction.md)):

- **Sufficiency, below and behind.** The city's hush, further off than it was — the intake is
  above its own capital, and the ordered red rows are under the floor rather than over the
  shoulder ([world-map.md](world-map.md); [art-direction.md](art-direction.md)).
- **The cohort halls.** Not dreaming, this time. A year that is awake, going to work, in a berth
  cut into rock — the same Coral Ruins authoring the galleries use, for a structure that is not
  ruined.
- **The intake, working.** Twelve hulls at 28, spread over four kilometres, which is the loudest
  the player has been allowed to be since the prologue. The mix should let them enjoy it.
- **A Hollow, at rest.** SIG 3, and it does not sound like an animal until it is one. The strike
  is 60 and is one of the largest single SIG events on the map — every rendering announces itself
  across the whole ground, and there is nobody to hear it but the rest of the Drift.
- **The Sounder, calling.** SIG 100, once, at 15:00. It is the loudest authored thing in the
  bible and everything else in the mix should get out of its way.

No second party, no hazard sites, no fauna the document did not place. The discipline is the
opposite of Attendance's: that mission refused to put anything in the water, and this one refuses
to put anything in the water **except what the year is paid for and the one thing that is not
about them at all.**

---

## 8. The Objective

**Band the intake: render the year's assignment, and muster what is left.**

Two terminal objectives, and the count is decided by them alone:

| Objective | Predicate | Terminal |
| --- | --- | --- |
| *The band is answered* — 245 Biomass rendered | `deliver`, account `biomass`, amount 245 (§13 — the predicate this mission needed and the format learned) | Yes |
| *The intake musters* — nine of twelve at the close | `survive`, role `cohort`, count 9 | Yes |
| *The ground's finding* — entered, or none | `extract`, role `cohort`, region `the-ascent`, count 1 | **No.** Read out, never ranked (§5) |

### Results

| Result | Condition | The reading |
| --- | --- | --- |
| **The band is answered** | 245 rendered and nine mustered | Korrin: "The band is answered and the intake is mustered. Both are entered. The year is placed, and the placing is the year's, not the ground's." |
| **Sufficient** | One of the two | Korrin: "**You were sufficient.** One column is filled and one is short, and a short column is entered as a short column. The Undermarshalcy has never asked a ground for two." |
| **The ground files nothing** | Neither | Korrin: "No band and no muster. That is not a failure of yours; it is a ground that was worked and did not answer, and it is entered as one. The year is re-shifted and attends again." |

**"You were sufficient" is the middle reading and it is the highest praise the register has**
([culture.md](culture.md) §3) — the same sentence Attendance gives a player who filed seven of
nine, deliberately, and this is the second time in two missions the campaign's strongest words
are spent on a partial. A partial outcome is an outcome ([glossary.md](glossary.md), *Mission
Outcome*).

**Neither terminal objective is a keystone.** Asset Recovery hangs its ladder on one asset
([mission-asset-recovery.md](mission-asset-recovery.md) §8) and this mission deliberately hangs
its on neither: a year that came home poor and a year that paid and lost three are the same
result, read out as the same sentence, because the Directorate does not price bodies against
income and it would be the first thing they were ever caught doing if it did.

### The failure, and the sounds that precede it

[campaign.md](campaign.md) §10 asks that no mission fail on a timer and that every failure state
be audible sixty seconds out. Both hold, and neither by exemption:

- **The band is on the instrument from the first rendering.** A player at 70 banked at the
  half-hour mark is watching the shortfall arrive, and the shortfall is arithmetic they can do.
- **The muster's failure is a colossus, announced at 15:00 by the loudest sound in the game**
  (§6), three hundred seconds before the transit and six hundred before the close.
- **The close at 20:00 is a conclusion, not a timer.** The shift ends and the ground files what
  it has, which is the argument [mission-tend.md](mission-tend.md) §8 makes and
  [glossary.md](glossary.md) makes about outcomes. Nobody is asked to replay it.

**Nothing in this mission can be lost that the Directorate counts as a loss except the year's
placing.** No hull crushes at any depth this map authors, no water on it is shallow enough to
poison anybody, and the only thing that kills is one animal on one line, an hour of warning early.

---

## 9. Length, SIG Budget, and the Beats

**Length: twenty minutes.** Inside [campaign.md](campaign.md) §10's 12–25.

**SIG budget: 50**, a description rather than a ceiling — §3. **No silence order** — §2.

| Time | Beat |
| --- | --- |
| 00:00 | The intake musters. Korrin assigns the band. Twelve hulls at the muster, 1,900 m, weapons live |
| 00:00–02:00 | **Nothing is audible.** The nearest coiled Hollow is 1,601 m out against 1,231 m of contact, and the mission opens on a search rather than on a sound — the prologue's empty first movement, inherited a fourth time and put to work |
| 02:00 | **First contact**, west overhang. A player who spread out at 00:00 has it; a player who did not is two minutes behind and knows it |
| 03:20 | **The first rendering.** 35 banked, and the strike or the guns announce it at SIG 60 across the whole ground |
| 05:40 | Second. The player now knows what one costs and can price the remaining eighteen minutes |
| **07:00** | **The Cohort-Prime, on the halls' channel** (§12). One sentence about the year, and nothing about the roll |
| 08:20 | Third |
| 11:00 | Fourth and fifth, if the intake split. The mission's widest moment: twelve hulls, four kilometres, two overhangs |
| 13:40 | Sixth. The band is reachable from here and not before |
| **15:00** | **The Sounder calls.** SIG 100, heard everywhere, once. The loud beat the close's telegraph is measured from |
| 16:00 | **The transit begins**, from the throat, northbound across the bench |
| 18:00 | **The transit crosses the muster.** Everything on the line is ground through; everything that moved is not |
| 19:00 | **The muster is called.** The last minute is the only one in which the finding can be filed, and the mission does not say so twice |
| **20:00** | **The shift ends.** Korrin reads the band, the muster, and the finding, in that order and no other (§12) |

The renderings are placed at those times because the Hollows are placed where §11 places them and
a player who works efficiently arrives at about that rate. They are not scripted kills: a player
who finds them faster banks earlier and gets a longer last five minutes, which is the reward for
having searched well and is the only reward in the mission. The figures are the roster's: a column
that works a wall as one formation is paid the ground's discount on some of them (§3) and reaches
the band from the eighth rather than the seventh, which is the same reward stated the other way
round.

---

## 10. What It Teaches

One system, per [campaign.md](campaign.md) §10: **the cohort economy** — Biomass, what it costs to
reach it, and why a faction whose income is animals fields twelve of everything. It lands in order
across the beat table: the search (00:00, taught by having nothing), the first contact and what
the four ranges are worth (02:00), the price of a rendering (03:20), the arithmetic of the band
(05:40), the spread that the ground rewards (11:00), and the last five minutes in which every hull
is somewhere the player put it (16:00).

Underneath it, the campaign's subject continued: **Attendance taught that doing nothing is
sufficient; Intake teaches that the Directorate's living is loud and their animals are deaf to
them.** The faction that hears everything is paid by things that will not listen, and has to walk.

What this mission deliberately does not teach:

- **Cantors, domes and Chorus Call** — mission 3. The dome is not lent here and is not mentioned
  (§2).
- **The shallow-water penalty** — mission 4, *Shallow*. No water on this map is above 1,500 m, the
  ascent's foot included, and the penalty never fires (§11).
- **Fauna aggro and Drift Health** — mission 5, *Trench Awakening*. The Drift is authored rather
  than seeded, no region's health is read out, and the player is never told that harvesting costs
  the map anything. That mission is where the Directorate finds out their income degrades what
  pays them ([bestiary.md](bestiary.md) §6), and it is a second system wearing this one's name.
  It prices this mission anyway — a rendering over ground the year has worn pays three quarters
  (§3) — and the decision to leave that unsaid here is §13's: the ground rewards the spread, and
  the ground does not explain.
- **Active sonar** — §2, mission 3's rule, and the button that would call the thing in §6.
- **Building and the base loop.** Twelve hulls, no Bastion, no Foundry (§2).

---

## 11. The Map

`banding-ground` · **The Banding Ground** · one seat · 5,000 × 4,000 m · cell 250 m · base floor
2,400 m.

The upper Ninth, above Sufficiency and below the duct. North is shallow and south is deep, as
everywhere in the Rift ([world-map.md](world-map.md)), and here the whole map sits in the doorway:
1,500 m at the ascent's foot to 2,400 m in the throat, which is the descent the Hollow guards
rather than the basement it does not ([bestiary.md](bestiary.md) §4).

| Region | Rect (x, y, w, h) | Biome | Floor | What it is |
| --- | --- | --- | --- | --- |
| The Upper Ninth | 0, 0, 5000, 4000 | Abyssal Trench | 2,400 | The trench. PF 1.60, painted first; everything else is cut into it |
| The Cohort Halls | 1500, 0, 2000, 500 | Coral Ruins | 1,750 | The year's berths, cut into the north wall. Structure and hard acoustic shadow, for a place that is not ruined |
| The Ascent | 2250, 0, 500, 250 | Coral Ruins | 1,500 | The stair north out of the map, toward the shallows. **The roll's region.** Its floor is the shallowest metre this mission authors and it is 1,100 m below mission 4's line |
| The Muster | 1750, 500, 1500, 500 | Coral Ruins | 1,900 | The banding ground proper. **The spawn** |
| The Bench | 1500, 1250, 2000, 1500 | Abyssal Trench | 2,250 | The open middle, and the Sounder's line |
| The West Overhang | 250, 1250, 1250, 1500 | Abyssal Trench | 2,150 | Trench wall and overhang — Hollow country, and half the year's income |
| The East Overhang | 3500, 1250, 1250, 1500 | Abyssal Trench | 2,150 | The other half, four kilometres from the first |
| The Throat | 2000, 3250, 1000, 750 | Abyssal Trench | 2,400 | Where the Ninth leaves the map southward toward Sufficiency. The Sounder arrives through it |

One spawn, at the muster: 2500, 750, depth 1,900 m. **No resources, no hazard sites, no second
spawn, and `fauna` off** — every creature on this map is authored, for Attendance's reason and one
of its own (§13).

The eight Hollows, at working depth 1,700 m:

| | West overhang | East overhang |
| --- | --- | --- |
| | 500, 1500 · 750, 2250 · 1250, 1750 · 500, 2500 | 4500, 1500 · 4250, 2250 · 3750, 1750 · 4500, 2500 |

Every rectangle lands on the 250 m cell grid and paints exactly the metres it reads
([maps.md](maps.md), "How a map is written").

**The overhangs are the map's one piece of gameplay geometry and they are not a fence.** They
stand at 2,150 m against a bench floor of 2,250 — a hundred metres of lift, which is nothing, and
that is the point: nothing on this map stops the intake going anywhere. What separates the two
overhangs is four kilometres of open bench, and four kilometres is the whole problem. Terrain may
raise a hull and may never lower one ([systems-depth.md](systems-depth.md) §2), and here it barely
raises one. The map is not difficult. It is *large*, and the intake is twelve.

**And the direction of the expense is reversed from Attendance's.** That mission's decision was a
dive — 45 m/s at a SIG floor of 72, the loudest thing its water had heard in a century. Here every
useful move is *upward*: the Hollows sit 200 m above the muster, the ascent is 400 m above that,
and ascent is 15 m/s and silent. **The intake's whole mission is free to move and costly to
find**, which is the exact inverse of the watch's, in the same campaign, one mission later.

**The Banding Ground is a mission map and is not in the public catalogue.** One seat, no resources,
not balanced, resolved by mission id and nothing else ([maps.md](maps.md)).

---

## 12. The Briefing

Spoken by Undermarshal Setha Korrin at the muster. The Directorate's register is defined in
[culture.md](culture.md) §3: passive, impersonal, structurally humble, and it does not shorten its
sentences.

**Undermarshal Setha Korrin, assigning the band — 00:00**

> Intake 11 is mustered. The year is at the top of the water it was made for, which is the
> customary place to find out whether that is true.
>
> Twelve hulls are given to the ground. The band is two hundred and forty-five, and it is rendered
> from what lives on the walls. What lives on the walls is quieter than the year is and hears
> better than the year does, and it will not come to you. The Directorate is not brought its
> living. The Directorate goes and gets it.
>
> Nine of twelve is a muster. The Undermarshalcy does not round up.
>
> At the close the ground files what it saw. It is not asked for a number. It is asked what it
> saw.

### Objective readings, in play

The Directorate states conditions rather than issuing tasks, and every reading is in the passive
or the impersonal:

- *The band is two hundred and forty-five. Rendered: thirty-five.*
- *The band is answered.*
- *Twelve are mustered.*
- *Nine are mustered. The muster is met.*
- *The ground's finding is not yet entered.*
- *Entered: one of Intake 11, on the shallow-band roll.*
- *Entered: none.*

### The voices in the water

**Cohort-Prime of Intake 11, on the halls' channel — 07:00**

> The year is working. It is not being tested, whatever it has been told by people who were tested
> and remember it that way. It is a shift. It will be a shift at the end of it as well.

**The ground, on the first rendering — 03:20**

> Rendered. Thirty-five is entered against the band. The animal is entered too, which is the part
> people forget is also a record.

**The Sounder, and the ground under it — 15:00**

> One is coming up the Ninth and it is not attending anything. Its line is the bench. The ground
> is not asked to hold the bench.

**Undermarshal Setha Korrin, at the close — 20:00**

> The reading of the band and the muster, per §8, and then the finding, in the flattest sentence
> in the document: "The ground's finding is entered." *If one was entered:* "It will be attended
> to personally. It always is." *If none was:* "None. That is also entered."

**Undermarshal Setha Korrin, one sentence later, to nobody — 20:00**

> I have signed three of these. I know where all of them are.

Each line fails [culture.md](culture.md) §3 for the other three factions, which is that document's
own test (§6): Korrin's briefing states the ground's obligation as a fact about the ocean rather
than as an order, which the Commune would phrase as an offer and the Consortium would cost; the
Cohort-Prime corrects a misapprehension about the year's own dignity without once claiming it,
which the Knights could not do without courtesy and the Consortium would not think worth saying;
the ground's rendering line files an animal into a record for no reason anybody can use, which is
the single most Directorate sentence in this document; and Korrin's last is a statement about her
own memory, offered to no one, by the person who signed the thing she is remembering — and the
Knights, who would call it an interval, could not have left it as flat as she does.

**And she visits.** The last line is the whole of what the mission does with those three words
([characters.md](characters.md)). It is not explained, nobody responds to it, and it is the second
consecutive Directorate mission that ends with Korrin saying one sentence she should not say
aloud ([mission-attendance.md](mission-attendance.md) §12). That is the civil war being kept, one
sentence per mission, and the campaign will not spend it until *Conclave*.

---

## 13. Scaffold Status

What exists against this document and what does not, continuing the list
[mission-asset-recovery.md](mission-asset-recovery.md) §13 started. **This mission is built** —
`attending-intake` and the `banding-ground` map, with tests — and unlike
[mission-thin-water.md](mission-thin-water.md)'s, its literal did **not** answer "nothing new"
twice over. The first thing it wanted was the predicate this table asked for, and that landed
ahead of it (#330). The next four it found on the day: three runtime rules that were right for a
court and wrong for a shift, and a transit that had no depth. Each is a row below, each is stated
in the literal's own header so a reviewer can overrule it, and none is a new tuning constant. The
table also carries two findings the literal made against the engine as built, in the manner of
§3's note, and both are since settled — the colossus in the engine (#349), the region ledger in
this document rather than in the engine (#350) — as is §3's note itself, the stand-off, in the
engine (#353).

| Requirement | Status |
| --- | --- |
| The mission format — beats, predicates, registry, private rooms | **Built** (#190). `survive`, `extract`, `creature`, `say`, `objective` and `resolve` cover §9's schedule |
| **The finding, as a choice** | **Built, and not as a choice group.** This row used to propose a `choiceGroup` over two conditional beats — one on `extract` into `the-ascent`, one "on the whole intake mustering". The second is true at 00:00: the twelve are seated at the muster, so a beat keyed on it would fire on the first pass and retire the roll before the year had moved. The exclusivity the group was for is a property the finding already has — one non-terminal objective, one `reading` pair, met or unmet at the close — so the literal authors that and no group, and the one condition-fired beat it carries is the ground's line on the first rendering, keyed on the band's own account (`deliver`, `biomass`, thirty-five). What survives unchanged: **the roll deliberately never asks which hull.** A predicate that named one would need a hull to carry both a counted role and a named one, and `MissionUnit.role` is singular — see the row below |
| **The finding, as an unranked reading** | **Built**, and this is the first document to use it for something the mission refuses to score: `objectiveReadings()` appends the `reading` pair of *every* objective that carries one, and only `terminal` objectives enter the outcome ladder. So a non-terminal objective with a reading is read out at the close and cannot touch Complete/Partial/Lost. §5's fifth neutrality guard is a property of the runtime rather than of anybody's restraint |
| **A hull that is both counted and named** | **Not built, and deliberately not asked for.** `MissionUnit.role` is one string, so a mission cannot both tally a set with `survive` and address one member of it with `extract`. Intake wants both over the same twelve hulls and resolves it by not wanting the second — the design in §5 is better for the constraint, so this row is a finding rather than a request. A mission that genuinely needed it would want a `tags` argument on `extract`, not a second role field |
| **Biomass as an objective — the predicate this mission needs** | **Built** (#330), as the shape this row asked for: `deliver` is generalised over the economy record's own three accounts — `{ kind: 'deliver'; account: 'nodules' \| 'crystal' \| 'biomass'; amount: number }` — rather than grown a `biomass` sibling, because a sibling would be the second of three near-identical rows and the third is already visible in the Knights' campaign. It keys on the **economy record**, not on `ResourceKind`: that enum names field nodes (Nodule, ResonanceCrystal) and Biomass has no node — it is paid on a kill. **The income itself already shipped**, which is the correction this document made to its own issue: `world.ts` carries `economy = { nodules, crystal, biomass }`, `payBiomass` credits a fauna kill to the nearest owner at full rate for the Directorate and `DRIFT.RENDERING_CONTRACT_RATE` (0.3) for everyone else, and the snapshot already carried all three accounts to the observer — so only the *query* was missing, and the wire did not move. [mission-shift-change.md](mission-shift-change.md)'s quota migrated to `account: 'nodules'` with the same figure and no behaviour change; a mistyped account fails `type-check`, per the format's standing rule; and the counter beside a `deliver` objective is shown whatever the account, because the number is still the objective. §8's *The band is answered* — 245 rendered — is now one row of the literal |
| **Biomass as something to spend** | **Built** (issue #351), as the other half of §6 row 2: `UnitStats` and `StructureStats` carry `biomassCost` beside `cost` and `crystalCost`, and `Match.build`, `Match.produce`, the commander AI and the command bar all answer affordability from one shared sum over the three accounts (`economy.ts`), so a hull short in Biomass alone is refused server-side exactly as one short in Nodules is, and the button that showed it greyed names the account it fell short in ([economy.md](economy.md) §8). What is *not* built is anything to spend it on: the roster's Biomass column is empty, because which hull carries a cohort price is the row below's decision. This mission still needs neither — the intake is twelve hulls and there is nothing to build (§2), and its `construction` lock stays — and mission 5 is the one that will ask |
| **A cheap cohort hull** | **Not in the roster**, and this is a docs-to-docs disagreement rather than a missing mechanism, so it is flagged rather than decided. [economy.md](economy.md) §6 says the Directorate is "cheapest per unit" and that "Directorate cohorts are inexpensive"; [units.md](units.md) prices their only hull at **260 Nodules and 80 Resonance Crystal**, against a Corvette's 120 and a Light Scout's 50 — the second most expensive hull in the game and the only crystal-locked one. Both cannot be true. Either the roster needs a cheap cohort entry beneath the Submersible, or `economy.md` §6's sentence means *cheapest per point of value* and should say so. **That is a design call and not an unattended one**; this document fields the Submersible because it is what exists, and §4's arithmetic is honest about what twelve of them cost. Filed as issue #352, and the row above is now where its price goes |
| **The Drift cannot threaten a hull that outranges it** | **Settled in the engine (#353) — damage is a sound.** This row was a finding: a Hollow *coils* at Interest rather than closing — the trigger model of [bestiary.md](bestiary.md) §4, and the deliberate exception to the aggro ladder — and struck only inside `DRIFT.HOLLOW_TRIGGER_RANGE_M` (500 m) at Commit. Against a Directorate hull the ×0.4 taste modifier puts Commit at **190 m cruising**, an Abyssal Submersible's gun reaches **650 m**, and fauna carried no retaliation path, so every Hollow on this map could be rendered for free and "expendable" was a word the mission could not make the player feel. Of the three things that would change it, the first was taken: **a weapon hit is a wound, and a wound springs the strike.** The guns, torpedoes and blasts report what they landed on (`wound`), the Hollow's ladder answers the report as it answers a loud hull passing the ambush — Committed, now, at SIG 60, toward the loudest thing it hears, from any range — and the trigger model is otherwise untouched: quiet past the ambush is still quiet, loud far away is still only watched. What the lunge does not do is fence standing off: it has the stand-off to cover at 75 m/s, so an array of three, or a pair at the gun's full reach, still renders before it lands, and §4's table prices that by count rather than pretending otherwise — a lone hull is bitten from 650 m, a pair is bitten inside the trigger, three are not. Not taken: dropping the ×0.4 for the mission, a `MissionDefinition` field that would spend the faction's doctrine on one mission; and accepting it, which would have left the teaching target of [campaign.md](campaign.md) §6 row 2 a word the mission could not earn. A driven creature (#349) gives no hull to a shell and is not woken by one, and the rule is a report the weapons make rather than a species the weapons know about, so the day another animal is given an answer to being shot, the guns will not change. `hollow.test.ts` states the rule — the first shell springs the strike at strike loudness toward the gun, toward the louder thing when there is one, and not while a beat drives it — and `missionIntake.test.ts`'s column of three at 400 m still renders its seven, as §4's first row says it does |
| **The Sounder as the mission's threat** | **Built, and aimed at exactly this faction by accident — in length.** `DRIFT.TRANSIT_MIN_HULL_M` is 95 and the Abyssal Submersible's `hullLengthM` is 95, so the strict `<` test means the Directorate's only hull is the shortest one a colossus grinds — a Corvette at 80 and a Light Scout at 60 are ignored. The bite path returns early for every non-structure, so a Sounder that *stops* is harmless; it is the swept transit that kills, which is why §6 authors a line across the map rather than an engagement. **In depth it was not built, and the row below is what built it**: the transit's vertical reach is a body, not a column — 85 m against a 95 m hull — and a driven creature held its species' working depth, which for a Sounder is 2,000 m. Run against this map that colossus could neither enter the muster, whose floor is 1,900 m, nor grind a hull holding station at 1,900 m over the bench a hundred metres above it. It stopped at the muster's edge and ground nothing |
| **A transit with a depth** | **Built for this mission.** The `creature` beat's `driveTo` may carry `depthM`, held every pass the way its `x` and `y` are, and `Fauna.homeDepth` is what the fauna system climbs or sinks toward when nothing pulls a creature off — the species' working depth unless a mission says otherwise, and restored to it when the commitment ends. The literal runs the transit at 1,900 m, the year's own depth, from the throat to the muster's north edge and back down the same line, and a year that stays on the line at that depth is ground exactly as §6 and §9 describe: six of the twelve seats stand within a hull's width of x = 2,500, and a run that goes quiet and does not move ends with six mustered, no band, and Korrin's third reading. Sorrowgate's colossus asks for nothing and gets its own 2,000 m, as before |
| **The colossus, killed** | **Settled (#349) — a beat the guns cannot end.** This row was a finding: [bestiary.md](bestiary.md) §4 rates a Sounder at 9,000 HP and 260 Biomass and says it "cannot be reliably killed by any single player before the twenty-minute mark", §6 says "it cannot be killed", and twelve of the intake's 44.4/s are 533 a second. Guns auto-acquire anything with a finite commit inside 650 m, the transit is inside 650 m of the muster for some forty seconds, and an intake that never moved and never went quiet brought the colossus down before it reached the line — seventeen seconds of fire — and was paid the roster's 260 for it, which is the band. Of the three things that would change it, the middle one was taken: **a driven creature takes no weapon damage** for the length of its commitment (`Fauna.driven`, raised and lowered by the runtime with the commitment itself). The transit is a beat, and a mission's beats happen when the document says they happen, which is the rule [mission-sorrowgate.md](mission-sorrowgate.md) §9 already lost its array under. Not taken: hit points that hold against a formation, because any figure only sets a different formation's stopwatch — the Sounder carries no retaliation and hulls move, so plating buys time and never safety; and accepting it, which would have made §6's teeth a choice. What the guns still do: fire, spike, and lay residue on the line — the intake that shoots at a colossus is loud for nothing, which is the mission's lesson in one gesture. The skirmish Sounder, never driven, keeps its 9,000 and its 260, and what protects it there is depth. `missionIntake.test.ts` now states the settlement: the idle intake's peak SIG rises over the transit, the colossus crosses at every point it arrived with, and the six seats on the line are ground exactly as they are for a year that went quiet |
| **The region ledger under a rendering** | **Settled in the document, not the engine (#350).** §10 says Drift Health is mission 5's system and this mission never reads it out — true, and the ledger prices the mission anyway. `Match.driftTick` sums the raw SIG of everything a player owns in each Drift cell (`HEALTH_REGIONS` 4 × 4 over the map — 1,250 × 1,000 m here) against `DRIFT.HEALTH_SIG_THRESHOLD`'s 60, so three hulls cruising together are 84 and wear the cell they cross; a kill takes `HEALTH_PER_KILL` more; a rendering in a cell under `HEALTH_STRAINED` pays three quarters — 26.25, not 35 — and the ground recovers at 0.06 a second. Measured: a three-hull column that works the walls in order is paid 26.25 for the first and third rendering and 35 for the rest, banks 227.5 from seven, and answers the band from the eighth. Twelve hulls idling at the muster stand six either side of x = 2,500 — 132 of SIG in each of the muster's two cells, 72 over the threshold, 1.44 a second — and both cells are at 47 by 0:30, 5 by 1:00 and nothing by 1:05 — which, while the row above was open, is why the colossus killed there paid nothing. **The decision is to say so and move nothing.** §3 and §9 now state that the band is seven of eight *spread*, and that a rendering is paid the roster's figure over ground the year has not worn. The ledger is the mechanism under a lesson §10 already lists — *the spread that the ground rewards* — and a mission whose thesis is that the intake is an array rather than a fleet is better priced by it than protected from it. The player is not told, per §10: mission 5 names the system, and a column paid 26 for a Hollow it was paid 35 for last time has been told something by the ground and not by the text, which is the register ([culture.md](culture.md) §3). What the other three would have cost, so the decision can be overruled: **authoring the band against the ledger** moves an authored number to fit a discount that depends on the route, so no band is right and the seven-of-eight sentence goes with it; **a `MissionDefinition` flag that pins Drift Health** would be the first format row to switch a simulation off rather than author what is in it, and campaign play carries Drift Health between missions on a map ([campaign.md](campaign.md) §2, rule 5), which a pinned mission would have to be excused from; **retuning the threshold** finds no figure a formation sits under that a base does not — twelve idle hulls are 264 and a base is more — and `drift.test.ts` pins the sum on purpose. While the row above was open, the last two would also have paid the colossus its 260 over the muster — the dead ground under the muster was, for a while, the only thing keeping that exploit from paying the band — and #349 has since closed that door from the other side, so the ledger no longer has to. `missionIntake.test.ts` states each figure — the discount, the seven that fall short, the eighth that answers, both muster cells dead inside the first minute under an intake that never moved — so a retune is noticed rather than discovered |
| **The Hollows, placed and not driven** | **Built, with one seam.** `MissionBeatEffect`'s `creature` row carries a required `driveTo`, so an ambusher that must not be driven is authored with `driveTo` at its own spawn and `untilTick: 0` — the first pass finds the commitment already expired, hands the creature its ears back, and leaves it to its trigger model, coiled at SIG 3. That works and is the idiom the literal uses eight times; it is also the one place the format shows that it was written for creatures that arrive |
| **`fauna: false` with eight authored creatures** | **Built** — the flag is Attendance's and the beat is Asset Recovery's. Stated because the reason differs: Attendance authored none, and this mission authors all of them **because the default seeder is a skirmish roster** — `match.ts`'s `seedFauna` places 2 Hollows, last, after 16 Ashgrazers and 15 Draymaws have taken most of `DRIFT.MAX_POPULATION` (48), and it gates on `floorAt >= workingDepthM` rather than on the species' band, so an all-Abyssal map would also carry mid-water species over deep ground. A mission that needs eight ambushers in named places cannot ask the Drift for them |
| The map, its eight regions, the overhangs that barely lift | **Built** — `banding-ground`, one row of the literal per row of §11's table, in its order. No new region shape, no new biome, no hazard sites, no resource nodes; `missionIntake.test.ts` holds it to the table, to the 100 m lift, and to the ascent being the shallowest metre and 1,100 m under the Shelf line |
| The mission definition `attending-intake` | **Built**, with the three runtime rows below that this mission was the first to need, and the transit row above. Twelve hulls in one role, armed; the band, the muster and the finding in §12's order; §9's beats in its order, closing as a conclusion at 20:00 with the loud transit at 16:00 four times §10's sixty seconds ahead of it; §8's three readings verbatim. The literal's header states every authoring decision the document left open, including the transit's return leg — the same straight line, back down to the throat — which §6 does not describe |
| **A shift that runs its length** | **Built for this mission** — `MissionDefinition.runsItsLength`. The runtime closes a mission the moment every terminal objective is met, which is right for a court that stops sitting once everybody is out and wrong here: the muster is met at tick zero, twelve being at least nine, so the seventh rendering would have closed the shift at 13:40 and robbed a year that searched well of exactly the five minutes §9 calls its reward. With the flag only the `resolve` beat closes the mission. Omitted is the court's rule, and every other literal omits it |
| **A muster as a standing count** | **Corrected in the runtime** — `survive` is now a standing predicate (`isStanding`), re-derived every tick as the silence order is. It used to latch Met on the first pass, when twelve is trivially at least nine, and stay Met through every loss after it: the muster would have read "met" at the close beside six hulls. Aptitude's six voices and Thin Water's two escorts carry the same row and now read the same way, which is the reading their documents wanted |
| **A finding not filed before it is asked for** | **Corrected in the runtime** — an objective is not derived before its `revealAtTick`. `types.ts` already said an unrevealed objective is an absence rather than a status; the runtime scored it anyway, so a hull that wandered onto the ascent at 05:00 would have latched a finding the ground did not ask for until 19:00, on a rule the player had never been shown. The `endure` clock still counts from the mission's start under a reveal — Tend's turning is revealed at 15:00 and met at 15:50 "whatever the day did" — and Asset Recovery's column, revealed at 12:30, is now met by a column that returns rather than by one that has not left |
| PR-3 across this map, with no floor under it | **Built** — `requiredPressureRating` is band-derived and the deepest metre here is 2,400 m, so nothing crushes a Directorate hull anywhere on the map. Stated because a reader will ask, and because it is why §8 can say the mission has nothing to lose but the placing |
| The shallow penalty, never fired | **Built and deliberately untouched** — `inDirectorateShallows` tests the Shelf band, and the shallowest floor this map authors is the ascent's 1,500 m. Mission 4 owns that system and this document does not borrow a metre of it (§11) |
| In-mission character speech, heard | Text only, the standing status ([mission-sorrowgate.md](mission-sorrowgate.md) §13) |
| The mix — a city underfoot, a year at work, and one call at 15:00 | Not started ([audio-direction.md](audio-direction.md)). §7's inversion of Attendance's mix is the half of this mission that only exists in prose |

---

## Related

- **[campaign.md](campaign.md)** — §6, whose second row this specifies; §2 and §10, whose rules it is written under
- **[mission-attendance.md](mission-attendance.md)** — The Attending 1, whose ranges this mission spends on an economy and whose silence it takes away
- **[mission-sorrowgate.md](mission-sorrowgate.md)** — the pattern, and the authored-beat rule §9 inherits
- **[mission-shift-change.md](mission-shift-change.md)** — the other economy mission, and the `deliver` predicate the two now share
- **[mission-tolerance.md](mission-tolerance.md)** — §6, the choice group §5 is built on
- **[mission-thin-water.md](mission-thin-water.md)** — the other document specified ahead of its literal, and the one that could report nothing new was needed
- **[factions.md](factions.md)** — the cohort programme, the eight per cent, and the income that is drawn to somebody else's noise
- **[economy.md](economy.md)** — §2 and §6, Biomass and what a harvest sounds like; §9, the guard-rail this mission is the first to stand on
- **[bestiary.md](bestiary.md)** — §2, the aggro ladder and the ×0.4; §4, the Hollow's trigger model and the Sounder's transit
- **[systems-depth.md](systems-depth.md)** — §2, the slow silent climb this mission is priced in and the fast loud descent it never asks for
- **[units.md](units.md)** — the Abyssal Submersible, its 95 metres, and the cheap cohort hull that is not there
- **[culture.md](culture.md)** — §3, the register that may not explain
- **[characters.md](characters.md)** — Korrin, the three years she has signed, and the three words this mission is built around
- **[world-map.md](world-map.md)** — Sufficiency, the Ninth, and the doorway above it
- **[glossary.md](glossary.md)** — mission outcome, and the partial that is a result
