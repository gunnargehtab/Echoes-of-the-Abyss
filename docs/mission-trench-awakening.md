# The Attending 5 — Trench Awakening

> The fifth mission of the Directorate campaign ([campaign.md](campaign.md) §6), specified and
> built. Fifteen mission documents stood in the bible before this batch; this is one of the
> fourteen documents that complete the bible's campaign, written to the pattern
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
Drift can hear are the Directorate's own: a grower at 55, a plant at 35, a dome at 35, a Chorister
firing at 39.

**The trench carries at 1.60 and there is nothing down its length but distance**
([habitats.md](habitats.md) §6). Every rendering announces itself across the whole map; a
colossus calling at the sill is at Contact to a Chorister from 10,187 m and to an Abyssal
Submersible from 11,016 m, which is twice the map. The only shadow on the chart is the worked
ground at 0.80 — the rim, and the yards and the stalls cut under it — which is the map's northern
1,250 m and nothing below it.

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
| Abyssal Submersible — the row, role `yard` | 2 | **SIG 22 idle / 28 cruise · HYD 85 · PR-3 · 520 HP · 80 dmg at 650 m / 1.8 s** ([units.md](units.md)) | The band's own two heavy hulls, and the only two things on the map a colossus can grind at 95 m of hull ([bestiary.md](bestiary.md) §4) |
| Chorister — the row, role `yard` | 6 | **SIG 16 idle / 24 cruise / +15 firing · HYD 75 (95 under the dome) · PR-2 on the hull, refit to 3 · 200 HP · 20 dmg at 450 m / 1.0 s · 40 m/s · 50 m** ([units.md](units.md)) | The cohort hull, in Directorate hands for the third mission running ([mission-the-dome.md](mission-the-dome.md) §3). At 50 m it is under `DRIFT.TRANSIT_MIN_HULL_M`'s 95 and a colossus cannot touch it, which is why it is the only hull in the game that renders one |

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
   [mission-standing-wave.md](mission-standing-wave.md) §13 records, stated and not fenced (§10, §13).
3. **No mines and no depth charges** — *nothing is left in the water the band renders*. Both are
   ordnance that keeps working after the hull that laid it has gone home, and a row whose income
   walks onto its own ground is the one navy that cannot afford that.
4. **Weapons, torpedoes and noisemakers are live.** The noisemaker is worth naming once: SIG 70
   for eight seconds ([systems-combat.md](systems-combat.md) §5) reads 28 to the Drift — louder
   than anything the row owns short of a hull under way downward — and pulls a released colossus
   from 421 m of Interest and 347 m of Commit. It is the only lever here that moves an animal without a ping.
5. **No silence order.** No `arrayTag`, `silenceCeilingSig: 100`, `debtCapS: 0` — the ledger does
   not run, as it did not in [mission-intake.md](mission-intake.md) §2. Everything that makes you
   strong makes you loud ([economy.md](economy.md) §1), and here the Directorate is strong and is
   charged for it by the ground rather than by the Cantorate.

Silent Running is present, and on a row whose whole income is a gun it is a trade: a silent
Chorister sits at 4.3 in the 3–8 band, and `perceivedLoudness` stops attenuating at the model's
100 m reference distance, so the loudest a silent Chorister ever reads to a Hollow is a ratio of 30
against an Interest of 45 — it is not merely hard to hear, it is inaudible at any range. A silent
hull also does not shoot.

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
([economy.md](economy.md) §2). The plant stands 1,750 m west of the grower and pays for it, because draw
is a slot's sum and not a radius: a mission-placed structure counts its capacity like any other.
Without it a Chorister takes forty seconds and this is a different mission. **And it is the row's
stake, which nothing else on this map is** — `reap` eliminates the slot whose Bastion falls, and
elimination removes every entity that slot owns, so a plant lost is not a plant lost, it is the row
gone. Nothing here is aimed at it: a released colossus reads a structure at 14 and commits only
inside 225 m, and one centre-line pass costs a Bastion 3,777 of its 5,000. It takes two, which
takes a row that spent ninety seconds making noise beside its own plant (§13).

**The dome covers six of the eight.** At (1500, 1000) with a 1,200 m radius it reaches `row-one` at
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
| The same, with a fresh rendering inside 800 m | 15.6 + 15 | 356 m | 277 m |
| A hull diving at 72 | 28.8 | 428 m | 353 m |
| A Directorate ping | 114 | 1,012 m | **834 m** |

A creature hears the **loudest single thing** in the water, never the sum of a cell: `listen` keeps
the best of what it can hear and nothing else, so six Choristers massed on one animal are six
readings of 15.6 and not one of 93.6. The one term that adds is the wreck bonus — a fresh kill
within 800 m is +15 flat on whatever a creature is already hearing, decaying over ninety seconds
([bestiary.md](bestiary.md) §2) — which is the row's own renderings pulling the next animal in,
and the only way this yard makes itself louder by being paid.

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

**Naming follows [culture.md](culture.md) §4.** Setha Korrin is given-plus-cohort-line, as every
Directorate name in the campaign is, and she is addressed by her office because getting a title
wrong is a real error in all four cultures. The Cohort-Prime of the row is a rank and not a name:
the reassigned keep their cohort-lines and this document does not spend one, for
[mission-intake.md](mission-intake.md) §5's reason — the eight per cent are counted here and not
editorialised. The ground, the yard and the stalls are channels rather than people, which is the
register's own habit: the agent is the record, the water and the assignment.

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
2,000 m — where it stops forty metres short, at (2500, 2040), because a driven creature with no
target parks at `stopAtM` (§13) — and holds there, deaf, unkillable and calling at 100, until
13:00. Then a second beat for the same tag replaces the commitment and drives it to (2750, 800) at
1,850 m: a line of 1,265 m from where it stood, walked to within forty of its far end, passing
39.5 m from the grower's centre. It enters the Foundry's 197.5 m of reach 29.2 s into the walk and
grinds at 220/s, and 2,000 HP is 9.09 s, so **the grower comes apart about 13:38**, spiking to
SIG 70 as it goes. Nothing else is on the line — `row-two` is 500 m off it, `row-one` 676 m, and
every Chorister is invisible to it — and it stops 161 m north of where the grower stood. At 14:30
the commitment lapses and it is the Drift's own: hearing again, killable again, committed to
nothing.

**`the-second`.** A Sounder, spawned at the same sill at 16:30, driven to (2500, 1750) at 1,900 m —
the head of the axis, 700 m south of the row — and parking forty short of it at (2500, 1790), 740 m
south, arriving at 17:40 and released at 18:30 with no line from anybody. Nothing there reads over
its Interest of 55: the row's Choristers idle read 5.6 and firing 13.6, the dome 4.8, the plant 3.0,
`row-two` 4.7. **It stands until the row makes it move**, and the only things that will are a ping
at 834 m, a noisemaker at 347 m, or a hull inside 196 m.

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

The dive is the loudest thing the row does short of a ping, and the layer pays for the top of it:
across the thermocline the pair factor is 0.3, which is 0.47 on range, so above the duct's top at
1,100 m a Hollow's Commit shrinks from 342 m to 161 and a Sounder's from 353 to 166. Duct to
outside is 1.0, not 0.3, so the discount stops one hundred metres above the layer rather than at
it: `THERMOCLINE.DUCT_HALF_WIDTH_M` is 100, and it is the same hundred that puts the duct's top at
1,100 m. The nearest Hollow to the spawn point is `hollow-five`, 1,867 m off, and it hears nothing
at all. **The last seven hundred metres of the dive are the loud part**, and by then the hull is
over the row.

**Where a colossus dies decides what it is worth.** `payBiomass` reads the ledger at the animal's
own position, and the two are released in different cells. `the-first` stops at (2742.1, 839.2) —
north of the row, in the ledger's cell x 2,500–3,750 by y 0–1,000, which nothing of the row's
stands in at 00:00 and which pays 260. `the-second` is released at (2500, 1790), inside the
grower's own cell, the one §3's table has Strained at 00:10 and Dead at 01:08 — so the same animal
is 260, 195, 65 or nothing depending entirely on what the row was doing beside its yard for the
first two minutes of a tide that had not started yet. Nobody says so. The pay slip does.

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
  5,286 m in trench water and 3,427 m in the yard's own, which is the map either way. One pays for
  the yard's speed; one is the expense the Directorate wears openly
  ([mission-exposure.md](mission-exposure.md) §6), heard from underneath it this time.
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
  13:38, **the grower coming apart**: SIG 70 on a 2,000-HP structure, for nine seconds.

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
is the closest honest shadow: one colossus and four animals exactly, and a hundred and twenty short
of two colossi.

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
| ~13:38 | **The grower comes apart** — nine seconds of SIG 70 on a 2,000-HP structure, and the yard stops |
| 16:30 | **The same call again**, and nobody said there would be a second. 210 seconds before the close, against §10's sixty |
| 17:40 | The second holds forty short of the head of the axis, 740 m from the row, for eighty seconds before the muster is called |

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
| 11:01 | It stops forty metres short of the head of the axis and holds there, deaf and unkillable, calling |
| 12:00 | **The ground**: one is coming up the First and it is not attending anything (§12) |
| **13:00** | **The commitment is replaced.** `the-first` is driven to (2750, 800) at 1,850 m — the grower — a line of 1,265 m at 30 m/s |
| 13:29.2 | It enters the Foundry's 197.5 m of reach and begins grinding at 220/s |
| **13:38.3** | **The grower is spent.** 2,000 HP in 9.09 s, at SIG 70. The yard stops |
| **14:30** | **The commitment lapses.** The colossus stands 161 m north of where the grower was, hearing again, killable again, committed to nothing (§12 — the ground's line) |
| **16:30** | **`the-second` spawns at the sill**, `loud: true`, driven to (2500, 1750) at 1,900 m. Nobody said one. The telegraph the close is measured from |
| 17:00 | **The stalls**: a second is coming up the First (§12) |
| 17:40 | It stops forty short of the head of the axis, 740 m south of the row |
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
the grower spent by the thing it summoned (13:38); and the last five minutes, in which a colossus
stands in the row's water and nothing but the row's own noise will move it (16:30–20:00).

Underneath it, the campaign's subject continued. Attendance taught that doing nothing is sufficient;
Intake, that the Directorate's living is loud and its animals are deaf to it. **Trench Awakening
teaches that the Directorate is paid by things that come to noise, and that alone in its own water
the only noise is its own.** The superweapon in [factions.md](factions.md) is a call that summons
the Rift's megafauna and does not control what arrives, and the mission's argument is that *you call
something and you do not steer it* is not a drawback bolted onto an ability — it is the aggro ladder
working exactly as written.

**What this mission inherits rather than teaches.** The row is handed a Bastion, a Cantor and a
Foundry, and nothing before it in the campaign has taught any of the three:
[mission-intake.md](mission-intake.md) §10 withholds *building and the base loop* in those words —
*twelve hulls, no Bastion, no Foundry* — and missions 3, 4, 6 and 7 lock construction outright
([mission-the-dome.md](mission-the-dome.md) §3; [mission-shallow.md](mission-shallow.md) §3;
[mission-conclave-attending.md](mission-conclave-attending.md) §2;
[mission-first-arrival.md](mission-first-arrival.md) §3). [campaign.md](campaign.md) §6 row 5 names
three words and none of them is a structure. What keeps this one system is therefore not restraint
in the prose, it is the seating: **the plant, the dome and the grower are placed prebuilt** (§3,
§13), standing and paid for at tick zero, and the row raises none of them. **The only economic verb
the mission asks for is a production queue** — one order against one structure, in a currency the
row earns by rendering — which makes it the sink for the Biomass §4's ladder pays out and not a
second system. Thermal Draw is inherited the same way: six of capacity against a demand of four is
satisfaction 1.0 from tick zero, so the player never meets the mechanic as a decision, only as the
speed the line already runs at (§3). The `construction` lock is open **solely because
`Match.produce` is refused by the same lock as `Match.build`** (§2) — an engine fact rather than a
grant, and one the engine's own comment anticipates. And **nothing on this map is a build order the
outcome ladder can see**: `the-band` is a stockpile that a second line would spend down faster,
`the-row` counts the eight hulls the mission seated, and `the-grower` — the one structure whose
fate the mission is about — is not an objective at all but a line read in the epilogue by hand
(§8). A row that works out that six hundred nodules is a second grower has found the seam and not
the lesson, and §13 carries it as a risk rather than a depth finding.

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
it. The worked ground at 0.80 — the rim, and the row and the stalls cut under it — is the only quiet
water on the chart, and the row's own strip of it is exactly the shape of the row — which is why
the grower producing reads 7,011 m in trench water and 4,546 m in its own yard. And the three
structures stand in three different cells of the Drift ledger, so the yard's floor plan is its own
pay slip (§3).

**The Shallow Band is a mission map and is not in the public catalogue.** One seat, no resources,
not balanced, resolved by mission id and nothing else ([maps.md](maps.md)).

---

## 12. The Briefing

Spoken by Undermarshal Setha Korrin, at the band. There is no Cantorate formula — the Cantorate does
not attend a rendering row, and First Cantor Ossary is absent and unmentioned for the third time in
the campaign ([mission-intake.md](mission-intake.md) §2;
[mission-shallow.md](mission-shallow.md) §2). The register is
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

**The ground, on the band — fired by the tally at two hundred and sixty**

> The band is answered. What answered it is entered too.

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
([characters.md](characters.md)). And the last is the fifth consecutive Directorate mission to close
on one sentence she should not say aloud ([mission-attendance.md](mission-attendance.md) §12;
[mission-intake.md](mission-intake.md) §12; [mission-the-dome.md](mission-the-dome.md) §12;
[mission-shallow.md](mission-shallow.md) §12) — and the first in which she claims the act. The four
before it are statements about a record, a memory, a lie and a rule; this one is *I called it*, in
the active, from the register that gives the agency to the water and the assignment. The campaign
spends the sixth in [mission-conclave-attending.md](mission-conclave-attending.md), one clause
short, and mission 7 is the silence.

---

## 13. Scaffold Status

What exists against this document and what does not, continuing the list
[mission-asset-recovery.md](mission-asset-recovery.md) §13 started. **This mission is built.** The
map is `shallow-band`, one region per row of §11 in §11's own order (#392, registered #393); the
literal is `trenchAwakening.ts`, which transcribes §2, §5, §8, §9 and §12 entire (#396); and
`missionTrenchAwakening.test.ts` holds the claims only this document makes — both of §4's ladders,
§3's four ledger rows, the two transits as `act` and `transit` will actually run them, and the tide
itself, played out with no orders given at all. What is left below is a design agenda rather than a
scaffold: four rows are findings this document made against the engine rather than requests, one —
the faction's own superweapon — is absent and approximated on purpose, and four more arrived with
the transcription, one of them a row of its own.

**What the transcription moved, and the sections have since taken.** Everything §3, §4, §6, §7 and
§11 assert is the shipped engine's own arithmetic to the metre, with one class of exception, and
that class has one cause: `act` parks a targetless driven creature forty metres short of the point
its beat names, so both transits start and stop a little off the point they are sent to. `the-first`
holds at (2500, 2040) rather than at the axis head it is driven to; the line it draws at 13:00
passes **39.5 m** from the grower's centre, not the 41 m measured from that head; §9's two derived
seconds are 13:29.2 and 13:38.3, 1.3 s later than the ~13:28 and ~13:37 first printed; and §5's two
clearances are 676 m and 500 m rather than 673 and 502. Nothing the document concludes moved with
them — the line gains at the near end what it loses at the far one, so the swept 349 m inside the
Foundry's reach is within half a metre of itself from either start, and the stop at (2742, 839) and
the 161 m north of where the grower stood are unmoved. The engine is the side that is right in every
one of these, and §5, §6, §8, §9 and §10 now print its figures. Four figures elsewhere were the
document's own arithmetic rather than the engine's, all four small, none of them load-bearing, and
all four now corrected in place: a centre-line pass costs the plant **3,777** of its 5,000 and not
the 3,784 §3 carried, which rounded the Sounder's 75 m of hull up to 76; §7's worked-ground contact
is 3,427.30, printed 3,427 and formerly 3,428; §6's duct discount stops **one** hundred metres above
the layer and not two, `THERMOCLINE.DUCT_HALF_WIDTH_M` being 100, which is also where §6's own 1,100
m and its seven hundred loud metres come from; and the nearest Hollow to the apron a hull is born on
is `hollow-five` at 1,867 m, not the `hollow-four` at 2,122 §6 named — the wrong animal, and one
that hears nothing either way. The document was the side that moved on all four.

| Requirement | Status |
| --- | --- |
| The mission format — beats, predicates, registry, private rooms | **Built** (#190), and spent entire (#396). `deliver`, `survive`, `creature`, `say`, `resolve` and `conditionalBeats` cover §8 and §9 with nothing left over and nothing new asked for: ten `say` beats, nine `creature` beats, one `resolve` and two conditionals, resolved by mission id out of `MISSIONS` against `shallow-band` in `MISSION_MAPS` |
| **Trench Awakening, the ability** | **Not built — and nearer than this document knew.** ([factions.md](factions.md); nothing in `packages/` summons.) The Sounder answers a ping — `ACTIVE_SONAR.FAUNA_AGGRO_MULTIPLIER` is read and the ladder commits toward the emitter — but nothing calls, and a mission may not claim otherwise. What this row proposed as the shape a real one would take — [mission-convocation.md](mission-convocation.md) §13's *one authored, once-per-match, player-fired effect with a point, a radius, a duration and a SIG cost* — **has since been built** (#373): `MissionCommanderAbility` is a grant beside the lock list rather than an eighth member of it, `Match.commanderAbility` records and replays it like any order, and once-per-match is a stamp the server keeps. **Two things separate that carrier from this mission's summons, and both are small and neither is written.** Its consequences are `speedMultiplier`, `silentRunningImmunity` and `collapsesWalk`, three flags of which none moves an animal; and `fireAbility(slot)` takes no coordinate, because Marr's act is measured from the Holdfast and the Holdfast is a place. A summons is a fourth flag and one new argument — the `driveTo` of a `creature` beat, chosen at the moment of firing — against a carrier that already broadcasts an authored SIG from the point for the act's duration, which is exactly the 100 §7 prices. **The cheapest honest approximation stands in the meantime, proposed by this row and built as proposed** (#396): two authored `creature` beats (up the axis, then across the grower, then released) plus the player's own ping, which the ladder already answers at ×3, and the suite pins `commanderAbility` at `undefined` so the stand-in cannot be read as the thing. The half the engine does have is exact: 95 × 3 against the Directorate's ×0.4 is 114, and a colossus commits **toward the emitter** from 834 m. The difference is still the whole difference — **a ping summons to the pinger and the ability summons to a point** — and it is why §4's fourth movement is about the ladder rather than about a button. **The mission is playable without it** — the played tide proves it — and it is a poorer mission, because the one thing the player never does is the thing the mission is named after |
| Production from a mission-placed Foundry | **Built** (#351), **and untouched by this mission's own suite** — a finding the transcription made against itself. `Match.produce`, `PRODUCIBLE` (which lists the Chorister off a Foundry) and affordability summed over the economy record's three accounts all ship, and `MissionStructure` spawns the grower `prebuilt`, so the line runs from tick zero. But the played tide gives no orders at all — which is what makes it deterministic — and a production queue is an order, so what these tests hold is the arithmetic around the verb rather than the verb: 30 nodules and 20 Biomass a hull, ten seconds at satisfaction 1.0, six hundred nodules being twenty Choristers and the four hundred Biomass `the-second` reads for. The queue itself is covered by #351 and nowhere in this mission. Named rather than fixed, because a fixture that issues a build order is a fixture that is no longer §4's third movement |
| A Bastion on the player's party as the band's plant | **Built.** `thermal.ts` sums `drawCapacity` per owned structure with no special case for mission-placed ones, so the Bastion's 6 covers the Foundry's demand of 4 and `powerRate` is 1.0 — the install snapshot of the played tide reads `{ capacity: 6, demand: 4, satisfaction: 1 }` with nothing authored to make it so. Stated because the alternative is authored in the same table: without the plant, satisfaction is `THERMAL_DRAW.MIN_SATISFACTION`'s 0.25 and a ten-second Chorister takes forty. §3 states the floor as the price a row without a plant pays |
| **A Bastion on the player's party is the player's stake** | **Built, and a FINDING worth stating before somebody discovers it.** `reap` collects any destroyed Bastion and calls `eliminate` on its owner's slot, and `eliminate` removes *every* entity that slot owns — so on a mission that places one, losing it does not lose a structure, it ends the row. The seated-slot rules do not save it: a mission seats one commander, so `checkConcessions` returns early, but the Bastion branch does not read `slots.length` at all. [mission-standing-wave.md](mission-standing-wave.md) §13 called its own Bastion "the mission's stake by accident" and priced the tithe stopping; this is the harder half of the same accident, and it is named here rather than requested, because the fix is either a mission flag that exempts the player's slot from elimination or a document that keeps the colossus off the plant. This one keeps the colossus off the plant (§3), and the transcription measured the margin: the plant stands **1,676 m** off the line the 13:00 beat draws, against a transit reach of 257.5 m, and the played tide ends with the plant and the dome standing and only the grower gone. The arithmetic behind "it takes two" holds and its first figure did not — a centre-line pass is 515 m of swept footprint at 220/s and 30 m/s, which is 3,777 of the Bastion's 5,000 and not the 3,784 §3 carried until this row moved it |
| **A grown hull is born at 600 m** | **Built, and a FINDING.** `productionSystem` delivers off the structure's apron and deliberately omits a depth; `spawnUnit` then seats the hull at "the deepest band the hull is rated for (capped at Mid-Water)", which is 600 m for anything PR-2 or better. So a yard on an 1,850 m floor delivers its hulls 1,200 m above itself and 600 m above the thermocline, and the apron is (2696.6, 1213.4) to the tenth of a metre, which the ground admits at 600 m. **This document does not ask for a fix** — it makes the dive the hull's own announcement (§6: 1,200 m at 45 m/s is 26.7 s at a SIG floor of 72, heard by the Drift at 28.8 effective, and the layer's 0.3 paying for the first seven hundred metres of it) — but it names the shape one would take, so the choice is a choice: either a production depth on the structure, or spawning at the factory's own depth when the ground admits it. A mission on a Shelf map would find the same line delivering into the Directorate's own shallow-water penalty, which is the reason this row is worth writing down. The same path also arms the hull: `spawnUnit` adds a Weapon to anything with `attackDamage > 0` unless `weaponsCold` is set, and production sets nothing, so a row that grows twelve Choristers gets twelve live guns and no order to hold fire |
| **A grown hull carries no `MissionRole`** | **Not built, and named rather than asked for.** Roles are recorded at install and only for player-party hulls, so *the cohort you grew* is not countable by `survive` or `extract`: §8's muster is over the eight authored hulls, the suite holds it to those eight and holds every scripted hull role-free, and the document says so instead of letting a player discover it at the close. The shape a genuine need would take is a per-kind default on the definition — `producedRole?: Partial<Record<UnitKind, MissionRole>>` — and this mission does not need it, because a muster of what the tide was given is the truer count for a shallow band |
| **A driven creature that has arrived grinds nothing** | **Not built, and a FINDING this document is the first to hit — still true, and the transcription found the second half of it.** `transit()` is called only inside the branch that moves the creature — `if (distance > stopAtM)` — so a colossus parked inside a structure's reach does no damage at all, and a driven creature's `stopAtM` is the default 40 m because the runtime clears its target. The plan this document was written from had `the-first` *held* on the grower's apron for a minute; that would have ground nothing. **The geometry is authored around it instead**: the 13:00 beat drives the colossus *through* the yard to (2750, 800), which the runtime resolves to 39.5 m off the Foundry's centre — §5's figure now, in place of the 41 m it measured from the point the beat names — so 349 m of the swept line lies inside the 197.5 m reach — 11.6 s at 30 m/s against the 9.09 s that 2,000 HP at 220/s needs, from either start. **And the same reach is vertical.** `transit` skips anything whose depth differs by more than `lengthM / 2 + radiusM`, and a released Sounder holds the species' own 2,000 m: against a Foundry at 1,800 m that is 200 m of separation against 197.5 m of reach, so the yard survives by two and a half metres unless the commitment carries a depth. `driveTo.depthM` of 1,850 on the 13:00 beat is therefore not a nicety, it is the mission — §9 authors it and the runtime writes it to `Fauna.homeDepth` every pass. Whether a stationary colossus *should* grind is a design question this document still leaves open; it is arguable either way (a colossus that camps a structure is exactly what `disengageAfterPass` was written against), and every number in §5 and §9 is measured against the engine as it stands |
| A colossus that grinds while driven and is rendered after release | **Built** (#349), and played. A driven creature takes no weapon damage and hears nothing; the bite path returns early for every non-structure, so only the transit kills, and only hulls of 95 m or more; on release the runtime hands back `senseS`, restores `homeDepth` to the species' 2,000 m — clamped by `terrain.floorAt` to the row's 1,850 — and clears `driven`, so the animal becomes 9,000 HP of Biomass. In the played tide the grower comes apart at about 13:38, the commitment lapses at 14:30, and a row that has given no orders whatever renders the colossus by about 15:43 |
| **`deliver` as a monotone latch** | **Built**, cited, and authored against. `isStanding` is true only for `quiet` and `survive`, and `deriveObjectives` never re-derives a Met non-standing row, so `the-band` latches on the first pass the stockpile touches 260. §8 authors the band knowing it: a row that banks the first colossus may spend it afterwards, and a row that spends as it goes must still hold 260 at once. The played tide is the extreme case of the latch and not an edge of it — the stockpile goes from nothing to 260 in one payment, so the objective and both tally lines land on the same pass |
| **An objective about another party's state** | **Not built, and inexpressible by design.** Every predicate is a query over the observer's own force; there is no `party`, `slot` or `group` field in the union, and the suite holds all three of §8's rows to `deliver` or `survive` and admits no third kind. *Both colossi were rendered* therefore has no row, and `the-second` is a `deliver` at 400 — the closest honest shadow — with a reading worded to be true of every way of reaching it (§8). This is not a request: the wall is the reason a Directorate mission cannot accidentally hand the player a maphack, and [mission-standing-wave.md](mission-standing-wave.md) §13 already carries the one exception worth arguing about |
| **A predicate over what the player has built or lost** | **Not built** — the union's proposed ninth row, `{ kind: 'build'; structure: StructureKind; count: number }` ([mission-standing-wave.md](mission-standing-wave.md) §13). The grower's loss is the emotional centre of this mission and cannot be scored, so §8 reads it in the epilogue by hand and the outcome ladder never sees it — which the played tide states more plainly than the prose does: the yard is spent at 13:38 and the close still reads Complete, because nothing in the ladder was ever pointed at it. This mission is not the one to land that row: it would make the grower defensible, and the grower is not |
| **A player-raised site at 600 m over an 1,850 m floor — and the base loop that comes with it** | **Not built, and the reason `construction` is unlocked is stated rather than fenced.** `CONSTRUCTION.WORKING_DEPTH_M` is 600 wherever the floor is, and the `'construction'` lock gates `Match.produce` as well as `Match.build`, so a mission that wants a working yard cannot take the lock and therefore cannot stop a player raising a second grower a kilometre and a quarter above the first one. The literal locks mines and depth charges and nothing else, and the suite asserts the two absences that are the mission — the ping and construction — rather than letting either look like an oversight. Six hundred nodules is twenty Choristers or one more grower and six, and the trade is real; the depth it is raised at is the standing gap and the same one [mission-standing-wave.md](mission-standing-wave.md) §13 records. **The depth is the smaller half of this row.** The larger half is that the open lock hands the player `Match.build` entire — the whole base loop, in the one Attending mission that has an economy, and the campaign has taught none of it: [mission-intake.md](mission-intake.md) §10 withholds building in as many words and missions 3, 4, 6 and 7 lock it ([mission-the-dome.md](mission-the-dome.md) §3; [mission-shallow.md](mission-shallow.md) §3; [mission-conclave-attending.md](mission-conclave-attending.md) §2; [mission-first-arrival.md](mission-first-arrival.md) §3). This document's answer is authoring rather than plumbing, and §10 states it as such: everything the row is given stands prebuilt, the only verb asked for is a production queue, and nothing a player raises is visible to the outcome ladder — `the-band` is a stockpile a second line spends down faster, `the-row` is a count of the eight hulls the mission seated, and `the-grower` is read by hand (§8). The ground does charge for the seam even so, which is the one thing that keeps it in register: a site is `CONSTRUCTION.SITE_SIG`'s 70 for the sixty seconds a Foundry takes, `DriftHealth` indexes on x and y and never on depth, and 70 is over the ledger's threshold of 60 by itself — so a second grower raised within `CONSTRUCTION.BUILD_RADIUS_M`'s 1,500 m of the first puts whichever of §3's four cells it stands in into wear for the whole of its build, including the two the row is otherwise letting recover. Named as a risk rather than a request: if the door is ever worth closing, the shape is a lock narrower than `'construction'` — a `'build'` that `Match.produce` does not share — and until there is one, every future mission with a working yard inherits this same paragraph |
| **A region that rates a hull over its own PR** | **Built** (#391) — `MissionRegion.pressureBonus`, a static grant applied as `Pressure.bonus` and max-and-not-sum against a Sounding Spire's — **and deliberately unused here.** `regions` and `markers` are both `[]`, and now for two reasons rather than the one §8 gives: no predicate on this mission addresses a rectangle, and no hull on it needs water it is not rated for. Every seat is at 1,800 m, where `requiredPressureRating` returns 3; the two Submersibles are PR-3 on the roster and the six Choristers carry the authored refit. A rectangle over the row carrying `pressureBonus: 1` would not have replaced that refit in any case — the seat test reads `unit.pressureRating ?? statsFor(kind).pressureRating` against the depth and knows nothing about a grant, so a mission cannot *seat* a hull on granted water, only send one into it, which is why [mission-deep-furrow.md](mission-deep-furrow.md) seats its tenders at 900 m and spends the grant on where they walk. Nothing on this map is manufactured water: the band is 1,800 m of ordinary Abyssal rock and the row is rated for it by refit and by baseline |
| Drift Health, read as an economy | **Built and public**, and the readout this row asked for exists. `DriftHealth` on a 4 × 4 grid, `HEALTH_START` 88, `HEALTH_SIG_THRESHOLD` 60, `HEALTH_SIG_DRAIN_PER_S` 0.02, `HEALTH_PER_KILL` 4, `HEALTH_RECOVERY_PER_S` 0.02, and `yieldMultiplier` paying 0.75 under Strained, 0.25 under Collapsing and nothing at Dead. Every figure in §3's table is the shipped ledger's own arithmetic over the seats in §11 and none of it is authored — the suite reads all four rows, every wear rate and all four crossing times straight off the constants. **No predicate reads it**, which is why §4's fourth movement is a pay slip rather than an objective; but `EchoRenderer` shades any cell under 75 on the scope, so the dome's cell darkening at 00:14 and the grower's at 00:10 are things a player can see happen ([ui-ux.md](ui-ux.md)). The played tide closes with those two cells at 0, the plant's at 100 and the band answered anyway, because the colossus died in a fourth cell the row never stood in. One small finding against the renderer while this was checked: it hard-codes the 75 twice instead of reading `DRIFT.HEALTH_STRAINED`, which is one constant in two places (`CLAUDE.md`) |
| **Biomass is banked by the nearest owner of any slot** | **Built, and a FINDING that moved a coordinate.** `payBiomass` attributes a kill to the nearest entity with an `Owner` off the Drift slot — which includes *scripted parties' emitters*, since `spawnEmitter` gives them `Owner` and `Position`. The stalls are a Directorate party on slot 2, so a Hollow rendered nearer to the berths than to the hull that killed it would be banked by the berths and the row would be paid nothing. `hollow-four` is authored at (4750, 1750), 901 m from the stalls, so that no rendering on this map can be closer to an emitter than to the 650 m hull that made it; the suite holds all six Hollows outside that gun's reach of the berths and holds `hollow-four` at 901 m exactly, which is the assertion that would fail if somebody tidied the coordinate. Named rather than requested: attributing by *damage dealt* would be a second bookkeeping system, and the current rule is right in every case except one a document can author around |
| `fauna: false` with eight authored creatures | **Built.** The flag is Attendance's and the beat is Asset Recovery's; the reason is [mission-intake.md](mission-intake.md) §13's — `seedFauna` is a skirmish roster that cannot put animals in named places, and this mission needs six on two named walls and two arriving through a named door. Six carry the placed-and-not-driven idiom, with the same seam Intake recorded: `driveTo` is required, so an ambusher that must not be driven is authored with `driveTo` at its own spawn and `untilTick: 0`. The tide reads the same on every seed, which is what the flag buys |
| `runsItsLength` | **Built** ([mission-intake.md](mission-intake.md) §13), and load-bearing here for a new reason: `the-row` is met at tick zero, so without the flag a row that banked the band at 14:40 would close the mission before the second colossus existed (§9). The played tide banks the band at about 15:43 and still closes at 1,200. Alongside it, Choristers below 1,800 m carry an authored `pressureRating: 3`, because the seat test in `missions.test.ts` reads `unit.pressureRating ?? statsFor(kind).pressureRating` rather than `effectivePressureRating` — a finding against the test, not the runtime, and [mission-the-dome.md](mission-the-dome.md) §13 records the same row |
| **A tide that answers the band with no orders given** | **A finding, not a request.** Played out with the row left in its seats, this mission closes **Complete**: `the-row` is met at tick zero, the mission itself delivers 9,000 HP of Biomass into the middle of the row at 14:30, and eight armed hulls render it where it stands for the roster's whole 260. That is §4's third movement working exactly as written — *the colossus takes the yard apart, the cohort renders the colossus for nothing* — and it is also the plainest statement of what the outcome ladder can and cannot see here: the only thing a passive row loses is the grower, and the grower is not an objective. Recorded rather than fixed, because every candidate fix is worse: a keystone on the grower would make the grower defensible (§8), and a band above 260 could only be met from `the-second`, which is released at 18:30 with ninety seconds left and moves for nobody — a band answered on the clock rather than in the water. If the door is ever worth closing, the honest lever is the walls, whose 210 is the only Biomass on this map a row has to leave its seats for |
| The map, its eight regions, no resources and no hazards | **Built** (#392), registered in `MISSION_MAPS` (#393). `shallow-band` is one region per row of §11's table, in its order, cut into a base Abyssal Trench floor of 2,400 m; the suite reads all eight rectangles, their biomes and their floors back against §11 and checks every edge onto the 250 m cell grid. It asked for nothing new: no new region shape, no new biome, no `SOLID` walls, and the Sill repaints the axis with the axis's own numbers so the chart names the door. **Two things the transcription had to settle about the name.** §10's *the penalty never fires* is a fact about what this mission **seats**, not about what the ground forbids: no map can forbid shallow water, since `DEPTH.MIN_M` is the surface and a ceiling of 0 admits every depth above the floor, and the shallowest metre this mission authors is a grown hull's 600 m, which is Mid-Water. And the word itself is now fixed in [glossary.md](glossary.md), "The Shallow Band": the place — the First Trench at 1,800 m, the first metre of the Abyssal — kept distinct from the Shelf depth band at 0–400 m and from the Directorate's shallow-water penalty above 400 m, which is [mission-shallow.md](mission-shallow.md), one mission earlier. A glossary entry and not a rename, because *the shallow band* is what this place is called in [habitats.md](habitats.md) §6 and [factions.md](factions.md), and the name is older than the collision |
| Cross-mission Drift Health, and the roster | **Both built** (#379, #380), and both by the shape this row predicted. A row that kills its own cells here finds them dead the next time this map is played: the record keeps the grid per map id and the room seeds from it, so the lost lesson is a lesson again. The roster carries too, by opt-in — `MissionDefinition.attrition` and `MissionUnit.cadre` — and this document authors neither, so [mission-first-arrival.md](mission-first-arrival.md)'s twelve Choristers are still authored fresh from its own party table: the cohort grown in this yard is that column in prose, and a Directorate document that wanted the carry would author the flag and the names. `MissionRecord` was shaped to take these without a migration, and all three of the fields queued behind it have now landed under that shape |
| "Already seen" briefing variants | **Built** (#378, shipped in #395) — `MissionHeader.briefingVariants`, an ordered list of `{ scene, briefing }`, first match wins, chosen client-side off the progression record's seen-scene set so the room is never told which text was read, exactly as [campaign.md](campaign.md) §1 requires. **This mission authors none, and cannot yet.** A variant needs a *scene* two missions witness from either end, and the only pairing this mission has is the one above: the cohort it grows is [mission-first-arrival.md](mission-first-arrival.md)'s column, and neither mission latches a scene — nothing here is witnessed from anywhere else, because there is no second navy in this water and the only other party is a sound. The two headers that do carry variants are `seeding-thin-water` and `seeding-convocation`, both off *Tend*'s plateau |
| In-mission character speech, heard | **Heard** (#381) — the channel [mission-sorrowgate.md](mission-sorrowgate.md) §13 records, and the [audio-direction.md](audio-direction.md) §13 hail under every line. The ten scheduled lines land at §9's ticks and in §9's order and the two tally lines fire off the account rather than the clock, and every one of them is hailed in the cohorts' ticks and read |
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
- **[units.md](units.md)** — the Chorister, and the 95 metres that decide which of the row a colossus can touch
- **[systems-echo.md](systems-echo.md)** — §3, the trench that carries; §5, the button this mission unlocks and the Drift's answer to it
- **[systems-depth.md](systems-depth.md)** — §2, the fast loud descent every grown hull pays; §3, the band 1,800 m is the first metre of
- **[habitats.md](habitats.md)** — §6, the shallow band, the eight per cent, and *Korrin visits*
- **[culture.md](culture.md)** — §3, the register that may not explain; §6, the test §12 is run against
- **[characters.md](characters.md)** — Korrin, the three intake years she has signed, and the sentence she says at the close
- **[maps.md](maps.md)** — how a mission map is written, and why this one is not in the catalogue
- **[glossary.md](glossary.md)** — mission outcome, and the partial that is a result
