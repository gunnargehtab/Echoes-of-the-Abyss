# The Attending 5 — Trench Awakening

> The fifth mission of the Directorate campaign ([campaign.md](campaign.md) §6), specified.
> Fifteen mission documents stood in the bible before this batch; this is one of the fourteen
> documents that complete the bible's campaign, written to the pattern
> [mission-sorrowgate.md](mission-sorrowgate.md) sets: everything here is authored — the forces,
> the water, the beats, the numbers and the text — and code transcribes this document.

**Setting:** the shallow band, the First Trench at 1,800 m, 214 PC, the tide the yard sounds the
trench ([world-map.md](world-map.md); [habitats.md](habitats.md) §6; [factions.md](factions.md)).

**Mission id:** `attending-trench-awakening` — namespaced by campaign after `attending-shallow`,
per [campaign.md](campaign.md) §1.

**This is the first mission in the bible where the player's own force grows.** Every mission
before it opens with the hulls it will close with, minus losses. This one opens with eight and a
yard, and the yard is the argument: production means the construction lock is open, an open
construction lock means a site at six hundred metres over an eighteen-hundred-metre floor, a
Foundry runs at a quarter rate without a plant beside it, and a hull grown at six hundred metres
has to dive a kilometre and two hundred to reach the band it was grown for — loudly, at
seventy-two, past everything on the walls. Two of those four are findings this document made
against the engine as it stands rather than things it asks for; §13 carries them and two more.

---

## 1. What the Shallow Band Is

The **shallow band** is the First Trench at 1,800 m: the Directorate's shallowest holding, and
the posting the roughly eight per cent of each intake who cannot hold their band are reassigned
to ([factions.md](factions.md); [habitats.md](habitats.md) §6). Nobody dies. It is labour, it is
the one job in the Directorate that resembles the debt-berth they despise, and **Korrin visits**
— which is the third time the campaign has stood on those three words and the first time it puts
the player in the water they describe ([mission-intake.md](mission-intake.md) §1).

What the band does is render. The trench brings things down its length and the row takes them
apart: the rendering row cut into the north wall, the draw plant at its west end, the intake stalls
at its east, the listening dome between them. All four are already in the bible, heard from outside
— four of the six points a Consortium survey reads off this margin in
[mission-exposure.md](mission-exposure.md) §6. This is that water from inside it, with one
difference: nobody else's navy is here.

Three facts about this water decide the whole mission.

**The Directorate is alone with its own economy.** There is no second navy on this map, and the
faction's whole doctrine is *let other people be loud near our animals*
([factions.md](factions.md)) — the argument [mission-intake.md](mission-intake.md) §3 makes at the
scale of a search, made here at the scale of a yard. Alone in its own water the loudest things the
Drift can hear are the Directorate's own: a grower at 55, a plant at 35, a dome at 35, a cohort
massed.

**The trench carries at 1.60 and there is nothing down its length but distance**
([habitats.md](habitats.md) §6). Every rendering announces itself across the whole map; a
colossus calling at the sill is at Contact to a Chorister from 10,187 m and to an Abyssal
Submersible from 11,016 m, which is twice the map. The only shadow on the chart is the yard's own
cut structure at 0.80, and it is 750 m wide.

**The band is the doorway, and the Hollow guards doorways.** 1,800 m is the first metre of the
Abyssal band ([systems-depth.md](systems-depth.md) §3), the overhangs either side of the axis stand
at 2,150 m, and the Hollow works 1,700 m in a band of 1,250–2,150 ([bestiary.md](bestiary.md) §4).
The animals that pay this row live on its walls, a kilometre and a half out, and the row starts the
tide unable to hear one of them. Nobody in the water says any of this; it is the ground the mission
stands on.

---

## 2. Whose Hulls the Player Commands

**The player commands the rendering row: two Abyssal Submersibles, six Choristers, a draw plant, a
listening dome and a grower.**

| Hull | Count | Stats | Why |
| --- | --- | --- | --- |
| Abyssal Submersible — the row | 2 | **SIG 22 idle / 28 cruise · HYD 85 · PR-3 · 520 HP · 80 dmg at 650 m / 1.8 s** ([units.md](units.md)) | The band's own two heavy hulls, and the only two things on the map a colossus can grind at 95 m of hull ([bestiary.md](bestiary.md) §4) |
| Chorister — the row | 6 | **SIG 16 idle / 24 cruise / +15 firing · HYD 75 (95 under the dome) · PR-2 on the hull, refit to 3 · 200 HP · 20 dmg at 450 m / 1.0 s · 40 m/s · 50 m** ([units.md](units.md)) | The cohort hull, fielded at last. At 50 m it is under `DRIFT.TRANSIT_MIN_HULL_M`'s 95 and a colossus cannot touch it, which is why it is the only hull in the game that renders one |

The Choristers carry `pressureRating: 3` as an authored refit: the Directorate's baseline lifts the
hull's PR-2 to 3 for free, but the literal test reads the hull's own rating, so it must be written
down (§13).

**Engine bound, stated so nobody corrects it into a bug.** Two parties and a court slot: the row on
slot 0, the intake stalls on slot 2 — a sound and nothing else — and slot 1 held empty as the court
the ledger would withdraw an array to, which this mission never uses. **The Drift is not a party**:
eight animals are authored by `creature` beats and `fauna` is off.

### What the row does not carry

1. **Active sonar is aboard, live, and unlocked**, and this is the mission where that sentence is
   the point. [campaign.md](campaign.md) §10 hands the ping over at mission 3
   ([mission-the-dome.md](mission-the-dome.md) §3); mission 5 is where the bill arrives. A ping is
   SIG 95, fauna hear an active emission at three times its weight
   ([bestiary.md](bestiary.md) §2), and against the Directorate's own ×0.4 that reads 114: a
   colossus grows interested from 1,012 m and commits from 834 m, **toward the emitter**. The
   superweapon is a call the Directorate does not steer ([factions.md](factions.md)), and the ping
   is the half of it the engine already has.
2. **Construction is unlocked, because production needs it.** `Match.produce` is refused by the
   same `'construction'` lock as `Match.build`, so a mission that wants a Foundry to run cannot
   take the lock. The consequence is that a site the row raises sits at
   `CONSTRUCTION.WORKING_DEPTH_M`'s 600 m over an 1,850 m floor — the standing gap
   [mission-standing-wave.md](mission-standing-wave.md) §13 records, stated and not fenced (§13).
3. **No mines and no depth charges** — *nothing is left in the water the band renders*. Both are
   ordnance that keeps working after the hull that laid it has gone home, and a row whose income
   walks onto its own ground is the one navy that cannot afford that.
4. **Weapons, torpedoes and noisemakers are live.** The noisemaker is worth naming once: SIG 70
   for eight seconds ([systems-combat.md](systems-combat.md) §5) reads 28 to the Drift — louder
   than any hull the row owns — and pulls a released colossus from 421 m of Interest and 347 m of
   Commit. It is the only lever here that moves an animal without a ping.
5. **No silence order.** No `arrayTag`, `silenceCeilingSig: 100`, `debtCapS: 0` — the ledger does
   not run, as it did not in [mission-intake.md](mission-intake.md) §2. Everything that makes you
   strong makes you loud ([economy.md](economy.md) §1), and here the Directorate is strong and is
   charged for it by the ground rather than by the Cantorate.

Silent Running is present, and on a row whose whole income is a gun it is a trade: a silent
Chorister sits at 4.3 in the 3–8 band and a Hollow commits to it only inside 59 m, but a silent hull
does not shoot.

---

## 3. The Row

The band is three structures, standing in three different Drift cells on purpose.

| Structure | Where | Stats | What it is for |
| --- | --- | --- | --- |
| `draw-plant` — Bastion | 1000, 1000 · 1,800 m | **SIG 35 · HYD 60 · 5,000 HP · radius 220 · draw capacity 6** ([units.md](units.md), Faction structures) | The band's own plant. Six of capacity against the grower's demand of four, so production runs at satisfaction 1.0 |
| `dome` — Cantor | 1500, 1000 · 1,800 m | **SIG 35 · HYD 80 · 1,200 HP · radius 80 · +25 HYD capped at 95 within 1,200 m** | The listening dome [mission-exposure.md](mission-exposure.md) §6 hears from outside as *a Cantor's idle hum* |
| `grower` — Foundry | 2750, 1000 · 1,800 m | **SIG 25 idle / 55 producing · HYD 30 · 2,000 HP · radius 160 · draw demand 4** | The yard. `PRODUCIBLE` lists the Chorister; 30 nodules and 20 Biomass, ten seconds |

**The plant is the difference between a ten-second hull and a forty-second one.** Thermal Draw's
only consequence is that a starved line runs slower, and the floor is
`THERMAL_DRAW.MIN_SATISFACTION`'s 0.25 — never zero, because a frozen line is a spiral
([economy.md](economy.md) §2). The plant stands 1,750 m west of the grower and covers it, because a
mission-placed structure sums its capacity like any other; without it a Chorister takes forty
seconds and this is a different mission.

**The dome covers five of the eight.** At (1500, 1000) with a 1,200 m radius it reaches `row-one` at
510 m and the Choristers seated at x 2,200 through 2,680; the easternmost Chorister at 1,301 m and
`row-two` at 1,703 m are outside it. HYD 75 to 95 is sixteen per cent more range on a Chorister and
nothing at all on a hull east of the grower. It is not a fence — the row can walk into it — which is
the whole of what a dome standing where a dome stands is worth.

**The row's floor plan is its ledger.** Drift Health is a 4 × 4 grid — 1,250 × 1,000 m cells here —
wearing at 0.02 a second per point of summed own-SIG over 60 in the cell, losing 4 per fauna kill,
and paying Biomass at three quarters under 75, a quarter under 25 and nothing at 0
([bestiary.md](bestiary.md) §6):

| Cell | What stands in it at 00:00 | Summed SIG | What the ground does |
| --- | --- | --- | --- |
| x 0–1,250 | the plant | 35 | Under the threshold. Recovers at 0.02/s all tide |
| x 1,250–2,500 | the dome, `row-one`, three Choristers | 105 | Wears at 0.90/s — Strained at 00:14, Dead at 01:38 |
| x 2,500–3,750 | the grower, `row-two`, three Choristers | 95 idle, **125 producing** | Wears at 0.70/s idle and **1.30/s producing** — Strained at 00:10, Dead at 01:08 |
| x 3,750–5,000 | the stalls' berths | 12 | Under the threshold |

All four rows are the shipped ledger's arithmetic and none of it is authored. A row that sits where
the yard seats it has killed two of its own four cells inside two minutes, and every hull it grows
stands in the grower's cell at 16 idle until it dives. The mission never says so in text (§10). It
says it in the pay slip: a Hollow rendered over Strained ground pays 26.25 instead of 35, over
Collapsing ground 8.75, over Dead ground nothing — and a colossus, at 260, pays 195, 65 or nothing.

---

## 4. The Call, and What Answers

The system this mission teaches, per [campaign.md](campaign.md) §2: one system, introduced in the
first three minutes, load-bearing by the last five. It is **the Drift's aggro ladder read as an
economy** — [campaign.md](campaign.md) §6 row 5's three words — and it lands in four movements.

**1. The loudest thing, not the nearest.** Fauna commit to the loudest thing they hear
([bestiary.md](bestiary.md) §2) and the Directorate is heard at ×0.4. Against a Hollow's HYD 80 and
its 45 / 70, in trench water:

| The row is | Interest | Commit |
| --- | --- | --- |
| A Chorister, idle at 16 | 176 m | 134 m |
| A Chorister, cruising at 24 | 227 m | 172 m |
| A Chorister, firing at 39 | 308 m | 233 m |
| A Submersible, cruising at 28 | 250 m | 190 m |
| A hull diving at 72 | 451 m | 342 m |
| A ping, at 95 × 3 | 1,066 m | 809 m |

Damage is a sound: the first shell springs the strike from any range and the animal comes at the gun
([bestiary.md](bestiary.md) §4, #353). From 450 m a Hollow has 340 m to cover to its 110 m bite at
75 m/s — 4.53 s. **Eight Choristers at 20/s are 160/s and have its 640 HP in 4.0 s; six are 120/s,
take 5.33 s, and are bitten for 0.8 s at 55/s — 44 HP off one 200-HP hull.** The row's six
Choristers render a Hollow and lose a fifth of a hull doing it; the six and both submersibles render
one for nothing. That is the count the whole economy is priced in.

**2. The Directorate's own works are the exception nobody discounts.** ×0.4 applies to structures
and hulls alike, and it does not save the yard, because the yard is louder than any hull it owns.
To a Sounder's HYD 90 and its 55 / 75, in trench water:

| What the row owns | Read at | Interest | Commit |
| --- | --- | --- | --- |
| The grower, producing (55) | 22 | 362 m | 298 m |
| The plant or the dome (35) | 14 | 273 m | 225 m |
| A Chorister, firing (39) | 15.6 | 292 m | 241 m |
| Three Choristers firing in one cell | 46.8 | 580 m | 478 m |
| A hull diving at 72 | 28.8 | 428 m | 353 m |
| A Directorate ping | 114 | 1,012 m | **834 m** |

**3. The Call.** At 10:00 the yard sounds the trench, and what comes up the axis goes for the
loudest thing it hears — which, alone in the Directorate's own water, is the grower. It cannot see
the hull it was called to feed: a Sounder ignores anything under 95 m of hull and a Chorister is 50.
So the colossus takes the yard apart, the cohort renders the colossus for nothing, and the proceeds
are thirteen more Choristers — if there is still a grower to grow them in. **There is not**, which
is the mission's joke and nobody laughs.

**4. The ground.** Drift Health is public on every snapshot and no predicate reads it, so the
mission makes a pay slip of it rather than an objective. The band that lives from the Drift is the
only navy whose income another player can kill without firing a shot, and this is the mission where
the Directorate finds that out by doing it to itself.

### The SIG budget

**SIG budget: 55** — the grower's own producing figure, and the loudest single thing the row owns.
A description, not a ceiling ([campaign.md](campaign.md) §10), and the first in this campaign whose
breach has a price that is neither a silence-debt nor a navy: the ground collects it, at 0.02 a
second per point over 60, in the cell the noise was made in. Attendance's 8 described stillness and
Intake's 50 a harvest; 55 describes a yard at work, and it is the last figure in the campaign that
goes up.

---

## 5. The Parties

| Party | Force | Posture |
| --- | --- | --- |
| **The row, shallow band** — the player | 2 Abyssal Submersibles, 6 Choristers, a Bastion, a Cantor, a Foundry — armed, 600 nodules, 0 Biomass | Directorate. Working |
| The intake stalls | One emitter at 12, sustained | Directorate. Sounds only — the reassigned's berths, heard as maintenance |
| The Drift | 6 Hollows, 2 Sounders | Not a party. Authored, by `creature` beat |

There is no court in the water and no second navy. Slot 1 is reserved and empty, as every literal
reserves it.

**The stalls.** One emitter at (4250, 1000), 1,850 m, SIG 12, period 30 s on 30 s — sustained, 5,000
HP, carrying **no reading**, so it cannot be attended and cannot count. It is
[mission-exposure.md](mission-exposure.md) §6's *intake stalls, cohort induction, heard as
maintenance*, and it is here because the eight per cent are. Nobody remarks on it.

**The Drift, by creature beat.** Six Hollows placed and not driven — `driveTo` at the spawn,
`untilTick: 0` — which hands each straight to its own trigger model, coiled at SIG 3:

| | West overhang | East overhang |
| --- | --- | --- |
| At 1,700 m | 500, 1500 · 750, 2250 · 500, 2500 | 4750, 1750 · 4250, 2250 · 4500, 2500 |

The nearest of the six to the row is `hollow-one` at 1,552 m from `row-one`, against a
submersible's 1,231 m of Contact. **The row opens the tide unable to hear anything it is there to
earn** — Intake's opening arithmetic, the same numbers, its second life.

**`the-first`.** A Sounder, spawned at the sill at 10:00 and driven up the axis to (2500, 2000) at
2,000 m, where it holds — deaf, unkillable and calling at 100 — until 13:00. Then a second beat for
the same tag replaces the commitment and drives it to (2750, 800) at 1,850 m: a line of 1,226 m
passing 41 m from the grower's centre. It enters the Foundry's 197.5 m of reach 27.9 s into the walk
and grinds at 220/s, and 2,000 HP is 9.09 s, so **the grower comes apart about 13:37**, spiking to
SIG 70 as it goes. Nothing else is on the line — `row-two` is 502 m off it, `row-one` 673 m, and
every Chorister is invisible to it — and it stops 161 m north of where the grower stood. At 14:30
the commitment lapses and it is the Drift's own: hearing again, killable again, committed to
nothing.

**`the-second`.** A Sounder, spawned at the same sill at 16:30, driven to (2500, 1750) at 1,900 m —
the head of the axis, 700 m south of the row — arriving at 17:40 and released at 18:30 with no line
from anybody. Nothing there reads over its Interest of 55: the row's Choristers idle read 5.6 and
firing 13.6, the dome 4.8, the plant 3.0, `row-two` 4.7. **It stands until the row makes it move**,
and the only things that will are a ping at 834 m, a noisemaker at 347 m, or a hull inside 196 m.

No pack. A Draymaw works 900 m in a band that reaches 1,300 at most, and the band is at 1,800.

**Nobody is wrong; there is nobody here to be wrong.** The animals answer noise exactly as
[bestiary.md](bestiary.md) §2 says they do, and the row makes the noise because that is what being
paid sounds like.

---

## 6. The Rendering

**The yard grows the cohort that renders what the yard called.** Six hundred nodules is twenty
Choristers and twenty Choristers want four hundred Biomass; Biomass is zeroed at install —
`startingNodules` is the only opening stock a mission can author — so the row cannot grow a hull
until it has rendered something. The tide's whole supply, at full rate over unworn ground:

| Source | Biomass | When |
| --- | --- | --- |
| Six Hollows | 6 × 35 = **210** | From about 01:00, at walking pace: 1,552 m at 40 m/s is 39 s from the row |
| `the-first`, rendered after 14:30 | **260** | Twelve Choristers at 240/s take its 9,000 HP in 37.5 s; eight in 56; six in 75 |
| `the-second`, rendered after 18:30 | **260** | If the row can reach it, and if it dies over ground that still pays |

**A hull is born at six hundred metres.** `production.ts` delivers off the structure's apron biased
toward the map's centre — (2696.6, 1213.4) here — and deliberately omits a depth, so
`spawnUnit` seats the hull at the deepest band its rating tolerates, capped at Mid-Water: **600 m**,
1,200 m above the row and 600 m above the thermocline. Every hull the yard grows must dive that
1,200 m at 45 m/s — 26.7 s at a SIG floor of 72 ([systems-depth.md](systems-depth.md) §2).

The dive is the loudest thing the row does short of a ping, and the layer pays for most of it:
across the thermocline the pair factor is 0.3, which is 0.47 on range, so above 1,300 m a Hollow's
Commit shrinks from 342 m to 161 and a Sounder's from 353 to 166. The nearest Hollow to the spawn
point is 2,122 m off and hears nothing at all. **The last five hundred metres of the dive are the
loud part**, and by then the hull is over the row.

Two more properties of a grown hull, both engine facts rather than authorings. It is **armed** —
`spawnUnit` adds a Weapon to anything with `attackDamage > 0` unless `weaponsCold` is set, and
production sets nothing — and it carries **no role**, because roles are recorded at install for
authored player hulls only, so *the cohort you grew* is not a thing any predicate can count (§13).
The muster in §8 is over the eight the mission seated.

---

## 7. What Is Heard

**A yard at work, two calls, and an axis full of what answered.** Attendance put nothing in the
water and Intake only what the year was paid for; this mission puts in the Directorate's own
industry and lets the Drift price it ([audio-direction.md](audio-direction.md)).

- **The plant and the dome.** SIG 35 each, sustained, all tide — Contact to a Chorister from
  5,286 m, which is the map. One pays for the yard's speed; one is the expense the Directorate wears
  openly ([mission-exposure.md](mission-exposure.md) §6), heard from underneath it this time.
- **The stalls.** SIG 12, thirty on and thirty off — Classification from `row-two` at 1,055 m. The
  eight per cent, working, and the only sound on this map that is a person.
- **The grower, producing.** SIG 25 to 55 the moment a hull is queued: Contact to a Chorister from
  7,011 m in trench water and 4,546 m in the yard's own cut structure. Being paid is audible from
  outside the map.
- **A Hollow, striking.** SIG 3 until it is 60 — Contact to a Chorister from 7,403 m, so every
  rendering is announced the length of the trench.
- **A hull, born.** Twenty-seven seconds at 72, once per hull, above the layer down to the band.
- **A colossus, calling.** SIG 100 from the sill at 10:00 and again at 16:30 — a ratio of 8.6 at
  `row-one`, twice Track, the loudest authored sound in the bible, twice in one tide. Then, at about
  13:37, **the grower coming apart**: SIG 70 on a 2,000-HP structure, for nine seconds.

Deliberately absent: no second navy, no hazard sites, no pack, no return, no mention of the Mouth.

---

## 8. The Objective

**Answer the band, and muster the row.** Two terminal objectives decide the count, and a third is
read out and never ranked.

| Objective | Text | Predicate | Terminal |
| --- | --- | --- | --- |
| `the-band` | *The band is two hundred and sixty. It is rendered from what the trench brings, and this tide the trench is sounded.* | `{ kind: 'deliver', account: 'biomass', amount: 260 }` | **Yes** |
| `the-row` | *Six of eight muster. The Undermarshalcy does not round up.* | `{ kind: 'survive', role: 'yard', count: 6 }` | **Yes** |
| `the-second` | *Nobody said how many would answer.* | `{ kind: 'deliver', account: 'biomass', amount: 400 }` | No — read out, never ranked |

No reveal ticks and no markers: nothing on this map is a place the row is sent to, so the mission
authors no `MissionRegion` and no `MissionMarker`. `the-second` shows from 00:00, because a row that
reads *nobody said how many would answer* at the start of a tide and finds out at 16:30 has been
told something.

**`the-band` is a floor that latches.** An objective is monotone unless it is standing and only
`quiet` and `survive` are standing, so the first pass on which the stockpile reaches 260 sets Met.
A row that banks the first colossus may spend it afterwards; a row that spends as it goes must still
hold 260 at once, and six Hollows at full rate are 210. **The band is the called thing, rendered** —
it cannot be answered by the walls alone, which is the mission's thesis made true by arithmetic
rather than by fiat.

**`the-row` is a standing count over the eight hulls the mission seated.** Grown hulls carry no
role and are counted by nothing, which is a property of the format and not a decision (§13).

**`the-second` cannot say what it means, and the document says so.** Every predicate is a query over
the observer's own force — there is no `party`, `slot` or `group` field in the union — so *the
second colossus was rendered* is not discouraged, it is inexpressible. Four hundred banked at once
is the closest honest shadow: more than one colossus and four animals, less than two colossi.

**`the-grower` is not an objective.** What the player has built or lost is not a predicate
([mission-standing-wave.md](mission-standing-wave.md) §13), so the grower is read in the epilogue by
hand and touches nothing.

### Results

| Result | Condition | Korrin's reading |
| --- | --- | --- |
| **The band is answered** | 260 banked and six mustered | "The band is answered and the row is mustered. What was called came, went to the loudest thing in the water, which was ours, and was rendered by the hulls it could not hear. Both are entered. So is the grower, which is the part people forget is also a record." |
| **Sufficient** | One of the two | "You were sufficient. The band is answered or the row is mustered, and the other is short. A row that fed a colossus its own grower and rendered it anyway has done the whole of what a shallow band is for." |
| **The trench was sounded** | Neither | "No band and no muster. The trench was sounded and what came was not rendered, and it is in the axis still. It is not a failure of the row; it is a call that was answered twice, and the Undermarshalcy will not sound it a third time from this band." |

Beneath whichever reading the count earns, `the-second`:

- **Met** — *Four hundred against the band. Two were called and the record is heavy enough for
  two. It is not entered that both were taken, because the record counts what is banked and not
  what is left in the axis.*
- **Unmet** — *Four hundred is not against the band. Two were called; one is in the record, or
  neither, and the gap is entered.*

**Neither terminal objective is a keystone.** A row that banked the band and lost its grower and one
that kept everything and banked short read as the same sentence, because the Directorate does not
price bodies against income ([mission-intake.md](mission-intake.md) §8).

### The failure, and the sounds that precede it

[campaign.md](campaign.md) §10 asks that no mission fail on a timer and that every failure be
audible sixty seconds out. Both hold, five times over:

| When | What the row hears |
| --- | --- |
| 10:00 | **A colossus calls from the sill at SIG 100**, at a ratio of 8.6 — twice Track, from 2,820 m. Ten minutes before the close |
| 12:00 | The ground files its line. One is coming up the First and its line is the axis |
| ~13:37 | **The grower comes apart** — nine seconds of SIG 70 on a 2,000-HP structure, and the yard stops |
| 16:30 | **The same call again**, and nobody said there would be a second. 210 seconds before the close, against §10's sixty |
| 17:40 | The second holds at the head of the axis, 700 m from the row, for eighty seconds before the muster is called |

The close at 20:00 is **not** a conclusion: the tide does not end here and the row is not owed the
courtesy. A row that spent the tide poorly watches the shortfall arrive on the instrument for the
last five minutes of it.

---

## 9. Length, SIG Budget, and the Beats

**Length: twenty minutes.** Inside [campaign.md](campaign.md) §10's 12–25; the advertised band is
1,140–1,260 s and the `resolve` lands at 1,200.

**SIG budget: 55** — §4. **No silence order** — §2.

| Time | Beat |
| --- | --- |
| 00:00 | **The row is seated.** Korrin assigns the band, at the band (§12). Eight hulls at 1,800 m, weapons live; 600 nodules, 0 Biomass; the plant, the dome and the grower standing |
| 00:00 | Six Hollows placed and not driven, `untilTick: 0`, coiled at SIG 3 on the two overhangs |
| 00:00–01:00 | **Nothing is audible.** The nearest coiled Hollow is 1,552 m out against 1,231 m of Contact. The row opens on a walk |
| 01:00 | **The ground**, on the row's channel: the nearest living is on the west wall, and it is not coming (§12) |
| *~02:00* | *[player-paced]* **The first rendering.** Fired by the tally at 35 banked, not by the clock; printed here because a row that leaves at 00:00 covers the 1,552 m to the west wall in 39 s and takes its first animal inside the first two minutes |
| 05:00 | **The yard**, stating its procedure: it delivers at six hundred metres, above the layer, and what it grows comes down at seventy-two (§12) |
| **07:00** | **Korrin, on the stalls' channel.** The one paragraph in the campaign about the eight per cent that is neither an assignment nor a finding (§12) |
| **10:00** | **The Call.** Korrin sounds the trench (§12) — and `the-first` spawns at the sill (2500, 3875) at 2,300 m, `loud: true`, driven up the axis to (2500, 2000) at 2,000 m. SIG 100, heard by everything |
| 11:01 | It arrives at the head of the axis and holds there, deaf and unkillable, calling |
| 12:00 | **The ground**: one is coming up the First and it is not attending anything (§12) |
| **13:00** | **The commitment is replaced.** `the-first` is driven to (2750, 800) at 1,850 m — the grower — a line of 1,226 m at 30 m/s |
| ~13:28 | It enters the Foundry's 197.5 m of reach and begins grinding at 220/s |
| **~13:37** | **The grower is spent.** 2,000 HP in 9.09 s, at SIG 70. The yard stops |
| **14:30** | **The commitment lapses.** The colossus stands 161 m north of where the grower was, hearing again, killable again, committed to nothing (§12 — the ground's line) |
| **16:30** | **`the-second` spawns at the sill**, `loud: true`, driven to (2500, 1750) at 1,900 m. Nobody said one. The telegraph the close is measured from |
| 17:00 | **The stalls**: a second is coming up the First (§12) |
| 17:40 | It arrives at the head of the axis, 700 m south of the row |
| 18:30 | The commitment lapses. It stands where it was left, and only the row can move it (§5) |
| **19:00** | **The muster is called.** Korrin: the band is read as it stands |
| **20:00** | **The close.** Korrin reads the band and the muster, and then says one sentence she should not (§12) |

Condition-fired beats, apart because they have no time of their own:

| Condition | Beat |
| --- | --- |
| `deliver` biomass 35 | **The Cohort-Prime of the row**, on the first rendering (§12). Keyed on the band's own account, in [mission-intake.md](mission-intake.md) §12's idiom |
| `deliver` biomass 260 | **The ground**: the band is answered, and what answered it is entered too (§12) |

Every transit is authored rather than simulated, for the standing reason
([mission-sorrowgate.md](mission-sorrowgate.md) §9): a mission's beats happen at the time the
document says they happen. The Call is why; the beats are when.

**`runsItsLength` is set, and the mission is unplayable without it.** `the-row` is met at tick zero
— eight is at least six — so a row that banks 260 at 14:40 would meet both terminal rows and close
the mission before `the-second` spawned ([mission-intake.md](mission-intake.md) §13).

---

## 10. What It Teaches

One system, per [campaign.md](campaign.md) §10: **megafauna, fauna aggro and Biomass — the Drift's
ladder read as an economy.** It lands in order across the beat table: the walk to the walls and the
×0.4 that makes it necessary (00:00–01:00); what a Hollow costs by count (~02:00); what a grown hull
costs in depth and noise (05:00); the Call, and the fact that a call is not a target order (10:00);
the grower spent by the thing it summoned (13:37); and the last five minutes, in which a colossus
stands in the row's water and nothing but the row's own noise will move it (16:30–20:00).

Underneath it, the campaign's subject continued. Attendance taught that doing nothing is sufficient;
Intake, that the Directorate's living is loud and its animals are deaf to it. **Trench Awakening
teaches that the Directorate is paid by things that come to noise, and that alone in its own water
the only noise is its own.** The superweapon in [factions.md](factions.md) is a call that summons
the Rift's megafauna and does not control what arrives, and the mission's argument is that *you call
something and you do not steer it* is not a drawback bolted onto an ability — it is the aggro ladder
working exactly as written.

What this mission deliberately does not teach:

- **The ledger the ground keeps, in words.** Drift Health prices every rendering here and no voice
  names it: a row paid 26 for an animal it was paid 35 for has been told something by the ground and
  not by the text, which is the register ([culture.md](culture.md) §3).
- **The Chorus Call and the dome as an instrument** — mission 3,
  [mission-the-dome.md](mission-the-dome.md). The dome stands here and hums and is worth sixteen
  per cent of range to five hulls, and nobody sounds anything through it.
- **The shallow-water penalty** — mission 4, [mission-shallow.md](mission-shallow.md). The
  Directorate's *shallow* is 1,800 m and the Rift's is 340, and the shallowest metre this mission
  authors is a grown hull's 600 m, which is Mid-Water. The penalty never fires.
- **Fighting with half an army** — mission 6, [mission-conclave-attending.md](mission-conclave-attending.md).
  Every hull the row has is a hull the row may use.
- **The rim** — mission 7, [mission-first-arrival.md](mission-first-arrival.md), where the cohort
  grown in this yard is the column that walks the lip, and where the ping is locked with a reason
  this mission has already paid for.

---

## 11. The Map

`shallow-band` · **The Shallow Band** · one seat · 5,000 × 4,000 m · cell 250 m · base floor
2,400 m.

The First Trench, under the Directorate's own name for it ([habitats.md](habitats.md) §6). North is
shallow and south is deep, as everywhere in the Rift ([world-map.md](world-map.md)): the worked rim
at 1,750 m, the yards cut into the north wall under it at 1,850 m, and the axis falling to 2,400 m.

| Region | Rect (x, y, w, h) | Biome | Floor | What it is |
| --- | --- | --- | --- | --- |
| The First | 0, 0, 5000, 4000 | Abyssal Trench | 2,400 | The trench. PF 1.60, painted first; everything else is cut into it |
| The Rim | 0, 0, 5000, 750 | Coral Ruins | 1,750 | The worked rim — [mission-exposure.md](mission-exposure.md)'s worked ground, continuing east. Cut structure and hard acoustic shadow |
| The Rendering Row | 750, 750, 3000, 500 | Coral Ruins | 1,850 | The yards, cut into the north wall under the rim: the plant, the dome and the grower, west to east, and the apron a grown hull is delivered onto |
| The Stalls | 3750, 750, 1000, 500 | Coral Ruins | 1,900 | The reassigned's berths, heard as maintenance |
| The West Overhang | 0, 1250, 1250, 1500 | Abyssal Trench | 2,150 | Trench wall and overhang — Hollow country, and half the band's income |
| The East Overhang | 3750, 1250, 1250, 1500 | Abyssal Trench | 2,150 | The other half, four kilometres from the first |
| The Axis | 1250, 1250, 2500, 2750 | Abyssal Trench | 2,400 | The channel: freight water, and the colossus's corridor |
| The Sill | 2000, 3750, 1000, 250 | Abyssal Trench | 2,400 | Where the First leaves the map southward toward the Second. What is called comes through it |

The Sill carries the axis's own biome and floor and repaints nothing; it is on the chart so the
door has a name. Every rectangle lands on the 250 m cell grid and paints exactly the metres it reads
([maps.md](maps.md), "How a map is written").

One spawn, at the row: 2,500, 1,000 — a formality, since every party is seated directly. **No
resources, no hazard sites, and `fauna` off**: the Directorate mines nodules poorly and the band
renders ([economy.md](economy.md) §2), so the 600 opening nodules are the yard's own stock and all
eight animals are authored.

Where everything stands, and what admits it:

| What | Where | Floor there | Rating |
| --- | --- | --- | --- |
| `row-one`, `row-two` | 2000, 1100 · 3200, 1100 · 1,800 m | 1,850 | PR-3 required at 1,800 m; the Submersible is PR-3 |
| `row-three`…`row-eight` | 2200 … 2800 step 120, 1050 · 1,800 m | 1,850 | PR-3 required; the Chorister is refit to 3 explicitly (§2) |
| `draw-plant`, `dome`, `grower` | 1000, 1000 · 1500, 1000 · 2750, 1000 · 1,800 m | 1,850 | `MissionStructure.depthM` is authored and admitted; structures do not crush |
| `stalls` | 4250, 1000 · 1,850 m | 1,900 | An emitter, off the player's party |
| Six Hollows | 1,700 m, per §5 | 2,150 | Band 1,250–2,150 |
| `the-first`, `the-second` | spawn 2500, 3875 · 2,300 m | 2,400 | Band 1,300–2,700; driven at 2,000, 1,850 and 1,900 m |
| A grown Chorister | 2696.6, 1213.4 · **600 m** | 1,850 | PR-2 tolerates it; it is 600 m above the layer and 1,200 m above its band (§6) |

**Why the ground argues the mission.** Four things, none of them a fence. The band is the doorway
and the doorway is what a Hollow guards ([bestiary.md](bestiary.md) §4), so the row's income is
1,552 m out on either wall and has to be walked to, twice. The trench carries at 1.60, so every
rendering is heard the length of the map and a colossus calling from the sill is heard from outside
it. The yard's cut structure at 0.80 is the only quiet water on the chart and it is exactly the shape
of the row — which is why the grower producing reads 7,011 m in trench water and 4,546 m in its own
yard. And the three structures stand in three different cells of the Drift ledger, so the yard's
floor plan is its own pay slip (§3).

**The Shallow Band is a mission map and is not in the public catalogue.** One seat, no resources,
not balanced, resolved by mission id and nothing else ([maps.md](maps.md)).

---

## 12. The Briefing

Spoken by Undermarshal Setha Korrin, at the band. There is no Cantorate formula — the Cantorate does
not attend a rendering row, and First Cantor Ossary is absent and unmentioned for the second time in
the campaign ([mission-intake.md](mission-intake.md) §2). The register is
[culture.md](culture.md) §3's: passive, impersonal, structurally humble, and unshortened. The one
line the entry screen carries, which is never the win condition: *The shallow band renders what the
trench brings. This tide the trench is sounded, and what answers is the Drift's to decide.*

**Undermarshal Setha Korrin, assigning the band — 00:00**

> The shallow band is at work. The First is sounded on this tide, and what the trench brings is
> rendered here, as it is rendered here on every tide, by the people who are posted here.
>
> Eight hulls are given to the row, and a plant, and a dome, and a grower. The band is two hundred
> and sixty. It is not rendered from the walls alone; the walls are two hundred and ten and the
> Undermarshalcy can add. What is short of it is what the trench answers with.
>
> Six of eight muster. The Undermarshalcy does not round up.
>
> What answers a sounding is not chosen. It is entered as what came.

### Objective readings, in play

The Directorate states conditions rather than issuing tasks, and every reading is in the passive
or the impersonal:

- *The band is two hundred and sixty. Rendered: thirty-five.*
- *The band is answered.*
- *Eight are mustered.*
- *Six are mustered. The muster is met.*
- *Nobody said how many would answer.*

### The voices in the water

**The ground, on the row's channel — 01:00**

> The nearest of the row's living is on the west wall, and it is not coming. Nothing on this map
> comes to the row. The row goes out to the wall, and the wall is a kilometre and a half, and that
> is the shift.

**The yard, on its own procedure — 05:00**

> The yard delivers at six hundred metres. That is above the layer and it is a kilometre and two
> hundred above the band, and what is grown comes down at seventy-two. The band will hear every
> hull it is given arrive, which is what a band is.

**The Cohort-Prime of the row, on the first rendering — fired by the tally at thirty-five**

> Rendered. Thirty-five against the band, and the animal is entered too. The row is not being
> tested. It is a shift, and it will be one afterwards, and it was one before anybody was posted
> to it.

**Undermarshal Setha Korrin, on the stalls' channel — 07:00**

> The shallow band is attended. It is not a posting anybody asked for and it is not one anybody is
> ashamed of, and the Undermarshal is here because it was said she would be.

**Undermarshal Setha Korrin, the Call — 10:00**

> The trench is sounded. What answers is not chosen and is not steered. It is rendered, or it is
> entered as having passed.

**The ground, on the axis — 12:00**

> One is coming up the First and it is not attending anything. Its line is the axis. The row is
> not asked to hold the axis.

**The ground, after the grower — 14:30**

> What was called went to the grower, and the grower is entered as spent. The animal is in the row
> and is not steered.

**The stalls — 17:00**

> A second is coming up the First. Nobody said one.

**Undermarshal Setha Korrin, calling the muster — 19:00**

> The muster is called. The band is read as it stands.

**Undermarshal Setha Korrin, at the close — 20:00**

> The reading of the band and the muster, per §8, and then one sentence she should not say aloud
> and does: "I called it. Enter it under my name and not the row's. It is the first thing the
> Undermarshalcy has ever asked for, and two came."

Each line fails [culture.md](culture.md) §3 for the other three factions, which is that document's
own test (§6). Korrin's briefing states the band as an arithmetic fact about the ocean and declines
to say where the shortfall will come from, which the Consortium would cost and the Commune would
phrase as an offer. The ground files an animal's approach as a fact about water and a piece of
ground the row is not asked to hold; the Knights would call it an interval and be courteous about
it. The yard files a birth as a depth. The Cohort-Prime restates the dignity of a year that did not
hold its band without once claiming it, which is [mission-intake.md](mission-intake.md) §12's line
given to the people it was about. Korrin's 07:00 states her own visit in the passive, as a thing
said about her, which is the only way this register can say *and she visits*
([characters.md](characters.md)). And the last is the third consecutive Directorate mission to close
on one sentence she should not say aloud — and the first in which the sentence is *I*. The campaign
spends the fourth in [mission-conclave-attending.md](mission-conclave-attending.md), one clause
short.

---

## 13. Scaffold Status

What exists against this document and what does not, continuing the list
[mission-asset-recovery.md](mission-asset-recovery.md) §13 started. **This mission is specified and
not built.** Most of what it needs is shipped and named below; four rows are findings this document
made against the engine rather than requests, and one — the faction's own superweapon — is absent
and approximated on purpose.

| Requirement | Status |
| --- | --- |
| The mission format — beats, predicates, registry, private rooms | **Built** (#190). `deliver`, `survive`, `creature`, `say`, `resolve` and `conditionalBeats` cover §8 and §9 entire |
| **Trench Awakening, the ability** | **Not built** ([factions.md](factions.md); nothing in `packages/`). The Sounder answers a ping — `ACTIVE_SONAR.FAUNA_AGGRO_MULTIPLIER` is read and the ladder commits toward the emitter — but nothing *summons*, and a mission may not claim otherwise. The cheapest honest approximation, used here: the summons is two authored `creature` beats (up the axis, then across the grower, then released) plus the player's own ping, which the ladder already answers at ×3. The difference is the whole difference — **a ping summons to the pinger and the ability summons to a point** — and it is why §4's fourth movement is about the ladder rather than about a button. The shape a real one would take is [mission-convocation.md](mission-convocation.md) §13's: one authored, once-per-match, player-fired effect with a point, a radius, a duration and a SIG cost (100 for its length), realised as *a `creature` beat whose `driveTo` the player chooses*. This document builds on that row's shape and does not propose a second grant mechanism. **The mission is playable without it** — that is what the two beats are for — and it is a poorer mission, because the one thing the player never does is the thing the mission is named after |
| Production from a mission-placed Foundry | **Built.** `Match.produce`, `PRODUCIBLE` (which lists the Chorister off a Foundry), and affordability summed over the economy record's three accounts (#351). `MissionStructure` spawns it `prebuilt`, so the line runs from tick zero |
| A Bastion on the player's party as the band's plant | **Built.** `thermal.ts` sums `drawCapacity` per owned structure with no special case for mission-placed ones, so the Bastion's 6 covers the Foundry's demand of 4 and `powerRate` is 1.0. Stated because the alternative is authored in the same table: without the plant, satisfaction is `THERMAL_DRAW.MIN_SATISFACTION`'s 0.25 and a ten-second Chorister takes forty. §3 states the floor as the price a row without a plant pays |
| **A grown hull is born at 600 m** | **Built, and a FINDING.** `productionSystem` delivers off the structure's apron and deliberately omits a depth; `spawnUnit` then seats the hull at "the deepest band the hull is rated for (capped at Mid-Water)", which is 600 m for anything PR-2 or better. So a yard on an 1,850 m floor delivers its hulls 1,200 m above itself and 600 m above the thermocline. **This document does not ask for a fix** — it makes the dive the hull's own announcement (§6: 26.7 s at a SIG floor of 72, heard by the Drift at 28.8 effective, and the layer's 0.3 paying for the first seven hundred metres of it) — but it names the shape one would take, so the choice is a choice: either a production depth on the structure, or spawning at the factory's own depth when the ground admits it. A mission on a Shelf map would find the same line delivering into the Directorate's own shallow-water penalty, which is the reason this row is worth writing down. The same path also arms the hull: `spawnUnit` adds a Weapon to anything with `attackDamage > 0` unless `weaponsCold` is set, and production sets nothing, so a row that grows twelve Choristers gets twelve live guns and no order to hold fire |
| **A grown hull carries no `MissionRole`** | **Not built, and named rather than asked for.** Roles are recorded at install and only for player-party hulls, so *the cohort you grew* is not countable by `survive` or `extract`: §8's muster is over the eight authored hulls and the document says so instead of letting a player discover it at the close. The shape a genuine need would take is a per-kind default on the definition — `producedRole?: Partial<Record<UnitKind, MissionRole>>` — and this mission does not need it, because a muster of what the tide was given is the truer count for a shallow band |
| **A driven creature that has arrived grinds nothing** | **Not built, and a FINDING this document is the first to hit.** `transit()` is called only inside the branch that moves the creature — `if (distance > stopAtM)` — so a colossus parked inside a structure's reach does no damage at all, and a driven creature's `stopAtM` is the default 40 m because the runtime clears its target. The plan this document was written from had `the-first` *held* on the grower's apron for a minute; that would have ground nothing. **The geometry is authored around it instead**: the 13:00 beat drives the colossus *through* the yard to (2750, 800), 41 m off the Foundry's centre, so 349 m of the swept line lies inside the 197.5 m reach — 11.6 s at 30 m/s against the 9.09 s that 2,000 HP at 220/s needs. Whether a stationary colossus *should* grind is a design question this document leaves open; it is arguable either way (a colossus that camps a structure is exactly what `disengageAfterPass` was written against), and every number in §5 and §9 is measured against the engine as it stands |
| A colossus that grinds while driven and is rendered after release | **Built** (#349). A driven creature takes no weapon damage and hears nothing; the bite path returns early for every non-structure, so only the transit kills, and only hulls of 95 m or more; on release the runtime hands back `senseS`, restores `homeDepth` to the species' 2,000 m — clamped by `terrain.floorAt` to the row's 1,850 — and clears `driven`, so the animal becomes 9,000 HP of Biomass that twelve Choristers take in 37.5 s |
| **`deliver` as a monotone latch** | **Built**, cited, and authored against. `isStanding` is true only for `quiet` and `survive`, and `deriveObjectives` never re-derives a Met non-standing row, so `the-band` latches on the first pass the stockpile touches 260. §8 authors the band knowing it: a row that banks the first colossus may spend it afterwards, and a row that spends as it goes must still hold 260 at once |
| **An objective about another party's state** | **Not built, and inexpressible by design.** Every predicate is a query over the observer's own force; there is no `party`, `slot` or `group` field in the union. *Both colossi were rendered* therefore has no row, and `the-second` is a `deliver` at 400 — the closest honest shadow — with a reading worded to be true of every way of reaching it (§8). This is not a request: the wall is the reason a Directorate mission cannot accidentally hand the player a maphack, and [mission-standing-wave.md](mission-standing-wave.md) §13 already carries the one exception worth arguing about |
| **A predicate over what the player has built or lost** | **Not built** — the union's proposed ninth row, `{ kind: 'build'; structure: StructureKind; count: number }` ([mission-standing-wave.md](mission-standing-wave.md) §13). The grower's loss is the emotional centre of this mission and cannot be scored, so §8 reads it in the epilogue by hand and the outcome ladder never sees it. This mission is not the one to land that row: it would make the grower defensible, and the grower is not |
| A player-raised site at 600 m over an 1,850 m floor | **Not built, and the reason `construction` is unlocked is stated rather than fenced.** `CONSTRUCTION.WORKING_DEPTH_M` is 600 wherever the floor is, and the `'construction'` lock gates `Match.produce` as well as `Match.build`, so a mission that wants a working yard cannot take the lock and therefore cannot stop a player raising a second grower a kilometre and a quarter above the first one. Six hundred nodules is twenty Choristers or one more grower and six, and the trade is real; the depth it is raised at is the standing gap and the same one [mission-standing-wave.md](mission-standing-wave.md) §13 records |
| Drift Health, read as an economy | **Built and public** — `DriftHealth` on a 4 × 4 grid, `HEALTH_START` 88, `HEALTH_SIG_THRESHOLD` 60, `HEALTH_SIG_DRAIN_PER_S` 0.02, `HEALTH_PER_KILL` 4, `HEALTH_RECOVERY_PER_S` 0.02, and `yieldMultiplier` paying 0.75 under Strained, 0.25 under Collapsing and nothing at Dead. Every figure in §3's table is the shipped ledger's own arithmetic over the seats in §11 and none of it is authored. **No predicate reads it**, which is why §4's fourth movement is a pay slip rather than an objective, and the HUD readout that would let a player see a cell die is worth a check against [ui-ux.md](ui-ux.md) before this mission is built |
| **Biomass is banked by the nearest owner of any slot** | **Built, and a FINDING that moved a coordinate.** `payBiomass` attributes a kill to the nearest entity with an `Owner` off the Drift slot — which includes *scripted parties' emitters*, since `spawnEmitter` gives them `Owner` and `Position`. The stalls are a Directorate party on slot 2, so a Hollow rendered nearer to the berths than to the hull that killed it would be banked by the berths and the row would be paid nothing. `hollow-four` is authored at (4750, 1750), 901 m from the stalls, so that no rendering on this map can be closer to an emitter than to the 650 m hull that made it. Named rather than requested: attributing by *damage dealt* would be a second bookkeeping system, and the current rule is right in every case except one a document can author around |
| `fauna: false` with eight authored creatures | **Built.** The flag is Attendance's and the beat is Asset Recovery's; the reason is [mission-intake.md](mission-intake.md) §13's — `seedFauna` is a skirmish roster that cannot put animals in named places, and this mission needs six on two named walls and two arriving through a named door. Six carry the placed-and-not-driven idiom, with the same seam Intake recorded: `driveTo` is required, so an ambusher that must not be driven is authored with `driveTo` at its own spawn and `untilTick: 0` |
| `runsItsLength` | **Built** ([mission-intake.md](mission-intake.md) §13), and load-bearing here for a new reason: `the-row` is met at tick zero, so without the flag a row that banked the band at 14:40 would close the mission before the second colossus existed (§9). Alongside it, Choristers below 1,800 m carry an authored `pressureRating: 3`, because `missions.test.ts` item 9 reads `statsFor(kind).pressureRating` rather than `effectivePressureRating` — a finding against the test, not the runtime, and [mission-the-dome.md](mission-the-dome.md) §13 records the same row |
| The map, its eight regions, no resources and no hazards | **Not built** — `shallow-band`, one row of the literal per row of §11's table, in its order, cut into a base Abyssal Trench floor of 2,400 m. It asks for nothing new: no new region shape, no new biome, no `SOLID` walls, and the Sill repaints the axis with the axis's own numbers so the chart names the door |
| Cross-mission Drift Health, and progression | **Not built** ([campaign.md](campaign.md) §2 rule 5). A row that kills its own cells here should find them dead the next time this map is played, and nothing carries a map's damage forward — the one campaign row where the absence is a lost lesson rather than a lost convenience, and it is not asked for here. Nor does anything carry a roster: the cohort grown in this yard is [mission-first-arrival.md](mission-first-arrival.md)'s column in prose only. `regions` and `markers` are both `[]` on this mission, since no predicate here addresses a rectangle |
| In-mission character speech, heard | Text only, the standing status ([mission-sorrowgate.md](mission-sorrowgate.md) §13) |
| The mix — a yard at work, two calls, and an axis full of what answered | Not started ([audio-direction.md](audio-direction.md)). §7's inversion — the first Directorate mission whose bed is industry rather than hush — exists only in prose |

---

## Related

- **[campaign.md](campaign.md)** — §6, whose fifth row this specifies; §2 and §10, whose rules it is written under
- **[mission-intake.md](mission-intake.md)** — The Attending 2, whose ranges, whose ×0.4 and whose colossus this mission spends, and which named this as the mission that would ask for Biomass to be spent
- **[mission-sorrowgate.md](mission-sorrowgate.md)** — the pattern, and the authored-beat rule §9 inherits
- **[mission-the-dome.md](mission-the-dome.md)** — The Attending 3, where the ping is handed over, and the Sounder at the foot that answered one
- **[mission-shallow.md](mission-shallow.md)** — The Attending 4, and the two meanings of *shallow*: the Rift's 340 m and the Directorate's 1,800
- **[mission-conclave-attending.md](mission-conclave-attending.md)** — The Attending 6, where a thing comes up a trench uncalled and the Chorister is again the half that can fight it
- **[mission-first-arrival.md](mission-first-arrival.md)** — The Attending 7, where the cohort grown here walks the lip and the ping is locked at the price this mission paid for it
- **[mission-exposure.md](mission-exposure.md)** — §6, this water heard from outside: the rendering row, the intake stalls, the draw plant and the listening dome
- **[mission-standing-wave.md](mission-standing-wave.md)** — §13, the predicate over what the player built and the depth a raised structure sits at, both of which this mission stands on the near side of
- **[factions.md](factions.md)** — Trench Awakening, and the income that is drawn to somebody else's noise when there is nobody else
- **[bestiary.md](bestiary.md)** — §2, the aggro ladder, the ×0.4 and the ping's triple; §4, the Hollow's trigger model and the Sounder's transit; §6, the ledger the ground keeps
- **[economy.md](economy.md)** — §1, everything that makes you strong makes you loud; §2, Thermal Draw and the starved line; §9, the guard-rail this mission is priced by
- **[units.md](units.md)** — the Chorister, fielded at last, and the 95 metres that decide which of the row a colossus can touch
- **[systems-echo.md](systems-echo.md)** — §3, the trench that carries; §5, the button this mission unlocks and the Drift's answer to it
- **[systems-depth.md](systems-depth.md)** — §2, the fast loud descent every grown hull pays; §3, the band 1,800 m is the first metre of
- **[habitats.md](habitats.md)** — §6, the shallow band, the eight per cent, and *Korrin visits*
- **[culture.md](culture.md)** — §3, the register that may not explain; §6, the test §12 is run against
- **[characters.md](characters.md)** — Korrin, the three intake years she has signed, and the sentence she says at the close
- **[maps.md](maps.md)** — how a mission map is written, and why this one is not in the catalogue
- **[glossary.md](glossary.md)** — mission outcome, and the partial that is a result
