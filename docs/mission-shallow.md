# The Attending 4 — Shallow

> The fourth mission of the Directorate campaign ([campaign.md](campaign.md) §6), specified. One
> of the fourteen documents that complete the bible's campaign, written to the pattern
> [mission-sorrowgate.md](mission-sorrowgate.md) sets and the Directorate documents continue:
> everything here is authored — the forces, the water, the beats, the numbers and the text —
> and code transcribes this document.

**Setting:** the Kell Shoulder — four kilometres of bare scoured rock in the Shelf band between
Kell Plateau and Marr, the Consortium's posted corridor across it, and the Kell slope falling
away to 900 m at its southern edge — 214 PC, the tide after Marr rang its bell off-tide
([world-map.md](world-map.md); [mission-thin-water.md](mission-thin-water.md) §1, §11;
[mission-convocation.md](mission-convocation.md) §1, §7; [timeline.md](timeline.md), 205 PC).

**Mission id:** `attending-shallow` — namespaced by campaign after `attending-the-dome`, per
[campaign.md](campaign.md) §1.

**Premise, for the entry that offers it:** *Marr has rung. The plateaus are turning a second
seeding, garden by garden, and a cohort is on the Kell shoulder at three hundred and forty
metres to hear which of them rings next.*

**This is the first mission the Directorate fights on somebody else's ground, and the first in
which the water itself is the opponent.** Every previous Directorate mission was fought in water
the faction was built for — the galleries at 3,000 m, the banding ground at 1,900, the Fourth's
foot at 2,300. This one is fought at three hundred and forty, above the line their physiology
stops at, and its whole argument is that the most feared army in the Rift arrives there at four
fifths and eighty-five per cent and cannot hear the thing it climbed for from anywhere it is
safe. It is also the first Directorate mission built on ground another campaign has already
used — `kell-shoulder`, unchanged, from [mission-thin-water.md](mission-thin-water.md) §11.

---

## 1. What the Shoulder Is

Two garden terraces, four kilometres of scoured rock between them, and a stair down to Mid-Water
at its southern edge. [mission-thin-water.md](mission-thin-water.md) §1 wrote this ground from
the plateau's side: a bare rise too shallow for the trench country's cold and too swept for kelp,
with the Consortium's grid spur crossing it east to west under a posted closure. All of that
still holds. What changes is who is standing on it.

Three facts about this water decide the mission, and none of them is a fence.

**The shoulder is the only Shelf ground in the Rift with no plateau on it.** North of the
corridor is Marr's approach and the Holdfast gate; east is Kell's replanted face; south the rock
falls away to 900 m and keeps falling. So it is the one stair the Directorate can climb without
standing in a garden — which is the entire reason a cohort is up here rather than anywhere else
above four hundred metres, and the entire reason the 205 PC letter is served a second time by
presence rather than by paper ([timeline.md](timeline.md)).

**Eighteen carries eighteen here, and so does everything else.** Thin Water's argument was that a
Commune tender's 18 SIG means 9.9 at home in kelp and 18 on this rock, because the shoulder is
Open Water at PF 1.00 and nothing is taken back ([environments.md](environments.md)). That
argument is now turned on a navy that idles at 16 and cruises at 24. A Chorister under way is
classified by a Corvette at 1,363 m and by a Cruiser at 1,605; a Chorister under Silent Running
is a contact at 829 and nothing at all past it. **Every silent figure here is the hull's own, not
the band's ceiling**: `silentRunningSig` places a hull in the 3–8 band by its idle SIG, so a
Chorister runs silent at **4.3**, a submersible at 4.8, a Cruiser at 7.6 and a Corvette at 5.3,
and only a hull idling at 60 reaches the eight. The column does not get quieter by being
Directorate. It gets quieter by being still.

**The thing the column came for sits in kelp north of the corridor, and the only water on this
map below the four-hundred-metre line is the slope.** The Marr Approach's floor is 280 m and the
Holdfast Gate's 260; the corridor's is 420 and the slope's 900. Every metre a Directorate hull
can stand on below the line is either inside a posted closure or six hundred metres south of the
last water a garden can be heard from. That is the mission, stated as terrain, and §7 does the
arithmetic.

Nobody on the shoulder says any of this. It is the ground the mission stands on.

---

## 2. Whose Hulls the Player Commands

**The player commands a cohort of the 4th Trench Cohort that came up the Kell slope in the
tide's dark and is lying quiet on the shoulder: one Cruiser hull, two Abyssal Submersibles and
eight Choristers, eleven hulls, all of them already above the line when the stalls open.**

Undermarshal Setha Korrin assigns from Sufficiency and is not present, and the briefing says so
in the passive: born at 2,780 m, she cannot survive above 400 m without a pressure suit
([characters.md](characters.md)), and the water this mission is fought in would kill her in it.
The fact is stated once, by the register's habit of describing a person by the water they came
from, and never explained. **Mara Tessen, 4th Trench Cohort, born 2,900 m**
([habitats.md](habitats.md) §6), is the column's voice on the shoulder and does not command.
Ossary is absent and unmentioned — the Cantorate does not attend a shoulder, and there is no
formula at 00:00 for the second time in the campaign ([mission-intake.md](mission-intake.md) §2).
Adze is at the floor, where the campaign keeps them.

**Engine bound, stated so nobody corrects it into a bug.** Six parties and a court slot: the
column on slot 0 (`Faction.Directorate`); the court on slot 1, reserved and empty; the spur's
frame, the corridor escort, the second element and the Holding's column on slots 2 to 5, all
`Faction.Bathyarch` and all separately owned so the escort's guns and the closure's guns answer
to different beats; the Shelf's voices on slot 6, `Faction.Pelagia`, carrying sounds and no
hulls. The Drift is not a party. There is no silence order and no lent array: the Commune's hush
at the watch-edge is courtesy rather than an order ([habitats.md](habitats.md) §8), and a
mission that enforced it here would be pricing somebody else's manners as the Directorate's law.

---

## 3. The Column

| Hull | Count | Stats | Why |
| --- | --- | --- | --- |
| Cruiser hull, in Directorate colours — role `ears` | 1 | **SIG 55 idle / 65 under way / +30 firing · HYD 65 · PR-2 · 1,200 HP · 150 at 900 m every 2.5 s · 45 m/s · 130 m** ([units.md](units.md)) | The column's command ears and the only hull it has that reaches past 650 m. Directorate Cruisers are Adze's precedent, not a new roster row ([mission-standing-wave.md](mission-standing-wave.md) §5). It is also the loudest thing the column owns: 55 while merely sitting, against a SIG budget of 24 |
| Abyssal Submersible — role `ears` | 2 | **SIG 22 / 28 / +20 · HYD 85 · PR-3 · 520 HP · 80 at 650 m every 1.8 s · 60 m/s · 95 m** | The best mobile ears in the game, and the only hulls on the map that can hold **five** of Marr's six rows at Bearing from one place on the strip — a Chorister standing in the same water holds three (§7). Every row this mission counts is counted by one of these two or by a Chorister standing closer than a Chorister should |
| Chorister — role `cohort` | 8 | **SIG 16 / 24 / +15 · HYD 75 · PR-2 · 200 HP · 20 at 450 m every 1.0 s · 40 m/s · 50 m** | The cohort hull, fielded for the first time in the campaign ([mission-intake.md](mission-intake.md) §13 put it in the roster and did not field it). Slowest combat hull in the game before the shallows take a fifth of it |

All eleven are armed and seated **already above the line**, on the shoulder at 340 m between the
frame and the Kell face: Choristers at (3350, 2200) to (3700, 2200) in fifty-metre steps,
submersibles at (3400, 2350) and (3650, 2350), the Cruiser at (3525, 2325). Eleven `silent` beats
at tick 0 put every hull under Silent Running, so the mission's first decision is *whether to
stop being quiet* rather than *whether to start*.

**The seat is 1,070 m from the escort's nearest Corvette, and while the column holds still the
corridor does not have it at all.** A silent Chorister there reads 0.66 against that Corvette's
threshold and 0.74 against the escort Cruiser's; the silent Cruiser hull, loudest of the eleven
at 7.6, reads 0.87 and 0.99 — nothing, in every ear on the map, which is what *lying quiet* means
in the model rather than in the prose. The same Chorister merely idle, at 16, reads 2.45 and 2.73
— Bearing and Classification; the Cruiser hull idle at 55 reads 6.29 and 7.17, which is Track,
exact hull and facing. The column that wakes up loud has opened the corridor warden's book on
itself before it has moved a metre, and §9 and §12 are what the book says.

No structures, no production, no reinforcement, no repair. Whatever comes down the slope at the
close is what came up it, minus fifteen per cent.

### What the column does not carry

1. **Active sonar is carried, live, and unlocked** — mission 3 handed it over
   ([mission-the-dome.md](mission-the-dome.md) §3). The mission refuses nothing here and states
   the price instead: SIG 95, a 900 m Tier-4 reveal, and a self-reveal at 2,400 m to HYD 50 and
   3,344 m to HYD 85 ([systems-echo.md](systems-echo.md) §5). No water on this map is below the
   layer's duct — the deepest floor is the slope's 900 m — so the ×0.3 protects nobody and every
   ear on the Shelf hears it, while the column's own ears already hold the escort's Cruiser at
   Track from 2,376 m. The button buys nothing and costs the mission.
2. **Construction is locked** — *nothing is built on somebody else's shoulder.*
3. **Mines and depth charges are locked** — *nothing is left in water the plateaus tend.*
4. **Weapons, torpedoes and noisemakers are live**; §8 prices what firing them costs rather than
   fencing it.

**Silent Running is present, and this is the mission where it is the right button** — which is
the exact inverse of [mission-thin-water.md](mission-thin-water.md) §3, on the same rock, one
campaign over. It costs 45% of a speed that has already lost 20%: a Chorister walks at 40, at 32
above the line, and at 17.6 above the line and silent. That is the mission's whole tempo problem
in one multiplication, and the player is never told which of the two multipliers is which.

---

## 4. Altitude, as a Cost

The system this mission teaches, per [campaign.md](campaign.md) §2: one system, introduced in
the first three minutes, load-bearing by the last five. The system is the **Directorate's
shallow-water penalty** — the faction's own weakness, handed to the player as arithmetic — and
it lands in four movements.

**1. The line is at four hundred, and it is the same line the depth bands are drawn on.** The
penalty tests `depthBandFor() === Shelf` rather than a hard 400, so moving the band moves the
penalty with it (`constants.ts`, `DIRECTORATE_SHALLOW`; `echo.ts`, `inDirectorateShallows`). The
Shoulder's floor is 340 m, the Marr Approach's 280, the Holdfast Gate's 260. Only the corridor
at 420 m and the slope at 900 are under it. **A Directorate hull that drops to the posted
closure's floor is not shallow any more: a Chorister in it walks at forty again, against
thirty-two on the rock above** — the mission's most uncomfortable single fact, and it belongs to
the concern. What the corridor gives back is the speed and only the speed, the bleed being
finished by 00:20 and not refunded on leaving: eight metres a second, bought with a descent at
SIG 72 ([systems-depth.md](systems-depth.md) §2) and with the second asking.

**2. Speed × 0.8, and it follows the hull rather than the map** (`movement.ts`). It stacks
multiplicatively with Silent Running, so the roster reads:

| Hull | Rated | Above the line | Above the line, silent |
| --- | --- | --- | --- |
| Chorister | 40 m/s | **32** | **17.6** |
| Abyssal Submersible | 60 m/s | **48** | **26.4** |
| Cruiser hull | 45 m/s | **36** | 19.8 |

A Consortium Corvette crosses the shoulder at eighty-five and pays nothing while a Chorister
crosses it at thirty-two, and no order the player can give closes that gap.

**3. Fifteen in a hundred, once, and it is running before the player has done anything.** The
hull half is a bleed with a floor, not a debuff: 0.75% of maximum hull per second — derived as
`(1 − 0.85) / 20`, so retuning the twenty seconds retunes the rate and nothing else — clamped at
85%, unhealable, and not refunded on leaving (`pressure.ts`). Every hull is above the line at
tick zero, so:

| Hull | Full | At 00:20, and thereafter |
| --- | --- | --- |
| Chorister | 200 | **170** |
| Abyssal Submersible | 520 | **442** |
| Cruiser hull | 1,200 | **1,020** |
| The column entire | 3,840 | **3,264** |

Twenty seconds after the stalls open, every bar in the panel has a segment that will not come
back and the player has given no order. That is the mission's introduction, and it takes no beat
to deliver.

**4. And the line is also an acoustic fact.** From the Kell Slope, the only ground on this map
below four hundred metres, the nearest row at SIG 12 reads **1.02 to a submersible and 0.90 to a
Chorister** — Contact and nothing, against 1.50 for Bearing (§7). The column cannot go down and
listen. It has to stay up and pay, which is why the withdrawal in §8 is a separate objective from
the transcript.

### The SIG budget

**SIG budget: 24 — one Chorister under way, and the figure is the hull's own cruise number.** A
ceiling ([campaign.md](campaign.md) §10), and the tightest the campaign has authored since
Attendance's 8. It says something exact about the column: **the Cruiser hull idles at 55**, more
than twice the budget, so the budget is the mission saying that the ears travel silent and the
loudest the column may be is one cohort hull moving. A column that crosses at cruise is not
breaking a rule; it is standing at Classification in front of a corridor warden with a book, and
§9 tables the book. The mission is playtested against the player who exceeds it, which here means
one who walks west at 32 instead of 17.6 because the clock is short. From the seat that hull is
already Classification to the escort Cruiser, so the second asking is thirty seconds behind the
first order rather than five minutes behind it.

---

## 5. The Parties

| Party | Force | Posture |
| --- | --- | --- |
| **The column, 4th Trench Cohort** — the player | 8 Choristers (`cohort`), 2 Abyssal Submersibles and 1 Cruiser hull (`ears`) | Already above the line, silent, listening. Not asked to be anywhere in particular and asked to come back under it |
| The court | Nothing. Slot 1, reserved and empty | The ledger's other end (`types.ts`, `courtSlot`), unused: this mission has no silence order |
| The spur's frame | 2 Sentinel Turrets, prebuilt | Thin Water's tension frame, left armed on a tensioned spur. Loud at nothing, listening at everything |
| The corridor escort | 1 Cruiser, 2 Corvettes | Corridor Warden Anse Rell's, Klaxon posture, walking the closure. Not hunting, and audible for four minutes before it is anywhere |
| The second element | 2 Corvettes | The closure, on its own clock. Idling at the corridor's western gate, sweeping east from 14:00 |
| The Holding's column | 2 Cruisers, 3 Corvettes | At the wall's gate under Silent Running, a smudge all tide, and moved by nothing but the third asking |
| The Shelf's voices | Ten attendable emitters and two bells | Gardens turning a question, and two plateaus ringing off-tide. Nobody's asset |
| The Drift | 2 Draymaws up the slope's west end from 17:30 | Thin Water's own pack, at Thin Water's own points |

**The frame is Thin Water's frame, seated where `thinWater.ts` seats it**: `frame-turret-west` at
(1850, 1500) and `frame-turret-east` at (2150, 1500), both at 380 m over the spur's 420 — SIG 12
idle and +30 firing, HYD 55, 1,000 HP, 50 damage at 700 m every 1.5 s. A Sentinel Turret
*listens*: it holds a cruising Chorister at Bearing out to 1,990 m and a silent one out to 683,
and guns fire at Tier 2 or better ([systems-combat.md](systems-combat.md) §7), so **seven hundred
metres either side of the frame is a turret's water.** Nobody has taken them down, because nobody
takes a closure down.

**The escort is Rell's escort**, standing off the frame's east, two hundred metres short of
where Thin Water's Cruiser ended its tide at (2600, 1500): `corridor-cruiser` (2400, 1500),
`corridor-corvette-one` (2300, 1450), `corridor-corvette-two` (2500, 1550), all at 400 m, with
authored legs west to x 1,200 at 05:00, back at 09:00, east to x 2,800 at 13:00 and back at
16:00. **It never goes below y 1,750** — Rell
discharges a closure at the closure's edge and does not hunt anybody down a slope, which is the
restraint [mission-thin-water.md](mission-thin-water.md) §5 gave him and the reason §8's
withdrawal is survivable. **The second element idles at the corridor's western gate** —
`element-one` (300, 1400) and `element-two` (300, 1550) at 400 m, Thin Water's own west-end
coordinates — and moves east to x 2,500 at 14:00 and x 4,500 at 16:30. It is not hunting; it is
closing a corridor at the end of a tide, exactly as it did the last time this rock was fought
over, and it is why the column's clock ends when it does.

**The Holding's column stands at the wall's gate**, in the shoulder's north-west strip between
Marr's outer rows and the spur: `holding-cruiser-a` (125, 1050), `holding-cruiser-b` (125, 1200),
`holding-corvette-a` (250, 1100), `holding-corvette-b` (375, 1050), `holding-corvette-c`
(375, 1200), all at 340 m and all seated under Silent Running at 00:00. A Cruiser silent at 7.6
is Contact to a submersible on the strip from 1,638 m and a smudge all tide. **It is moved by exactly one
thing, and that thing is the third asking** (§9).

**Naming follows [culture.md](culture.md) §4.** Setha Korrin and Mara Tessen carry
given-plus-cohort-line. **Corridor Warden Anse Rell** has no hyphen — he has not been elevated
and will not be — and speaks three times, all three procedure. The watch at Kell's edge and the
stalls have functions rather than names, which is the register.

**Nobody is stupid and nobody is cruel** ([campaign.md](campaign.md) §2, rule 1). Rell is running
a posted closure with an unidentified formation inside it and a book written for salvage poachers;
the plateaus are turning a question and would rather the water were told; and the Directorate has
come to hear a decision about itself and has no way to ask for it, because asking is the one thing
this faction does not do.

---

## 6. The Rows, and the Bells

**Ten sounds are attendable and two are not, and which is which is the whole design.**

Marr rang off-tide last tide ([mission-convocation.md](mission-convocation.md) §1, §9). This tide
the question is travelling: the rows are being walked, garden by garden, and a walked row is a
low, plural, moving sound at **SIG 12** — Convocation's own figure, and the one the concern's own
Corvettes could hear and could not read ([mission-convocation.md](mission-convocation.md) §7).
Ten of those are authored here, all at 12, all sustained (`periodTicks === onTicks`, 20 s), all
`hp: 5000`, all on the Shelf's voices' party.

| Sound | Where | Depth | SIG | Window | Attendable |
| --- | --- | --- | --- | --- | --- |
| `marr-row-one` … `marr-row-six` | (250, 500) (575, 500) (900, 500) (1225, 500) (1550, 500) (1875, 500) | 260 m | 12 | 01:00 → 16:00 | **Yes** |
| `gate-row-one` … `gate-row-four` | (375, 125) (625, 125) (875, 125) (1125, 125) | 250 m | 12 | 10:00 → 13:00 | **Yes** |
| `bell-kell` | (4400, 2000), in the Kell face | 290 m | 70 | 06:00 → 06:20 | No |
| `bell-teel` | (2875, 125), the shoulder's north edge | 280 m | 70 | 11:00 → 11:20 | No |

**The readings.** Marr's six enter as *"Entered: Marr's [first…sixth] outer row, at twelve, at the
pace of a turning. Whether it is Marr's own question or a neighbour's carried in is not entered,
because the sound does not say."*, and gap as *"Not entered: the [ordinal] row."* The Holdfast's
four enter as *"Entered: the Holdfast, turning it, at twelve. The plateau's own gate, and the
stalls had to stand in the concern's corridor to hear it."*, and gap as *"Not entered: the
Holdfast. The corridor was not stood in, or not long enough."*

Every one of those sentences is worded to be true under all three of Convocation's outcomes: a
plateau that closed its count is turning a neighbour's question, a plateau still turning is
turning its own, and a plateau that was held is being asked again. **The sound does not say
which, and neither does the record** — the register doing the work the continuity needs, rather
than this mission choosing an outcome for somebody else's campaign.

**The bells are not attendable, and the withholding is the mechanism.** An emitter with no
`reading` cannot be counted by `attend` (`types.ts`, `MissionEmitter.reading`;
`missions.test.ts`, the attend bound), so the two loudest things on the map are worth exactly
nothing to the count. At SIG 70 through the real paths, Kell's bell is Bearing to a Chorister on
the strip (3,503 m, ratio 1.84) and Track to a submersible over the slope's middle (2,043 m,
6.81), falling to Classification at the slope's western end (3,482 m, 2.87); Teel's is
Classification on the strip (2,622 m, 3.68) and Classification over the slope's middle (2,652 m,
3.86). **They are heard everywhere and entered nowhere, by design**: a bell is punctuation the
count does not need, and a transcript that could be filled by standing still under a bell would
not be a transcript.

Kell's bell is rung by a plateau that lost two hundred people to somebody else's containment
order in 197 PC ([world-map.md](world-map.md); [timeline.md](timeline.md)). The stalls enter it
as not entered, in one sentence, and move on.

---

## 7. What Is Heard

**A question, at twelve, from the wrong side of a closure.** The shoulder is the quietest ground
the campaign has put a Directorate hull on and the least forgiving, because at PF 1.00 the
arithmetic is unhedged in both directions.

Detection is `SIG × PF × HYD ÷ 7.35 × (100/d)^1.6` against the tier multipliers, PF being the
path mean over the terrain grid (`echo.ts`; `terrain.ts`, `pathPropagation`; `constants.ts`,
`PROPAGATION_MODEL`). The whole map lies above the thermocline's duct — the deepest floor is the
slope's 900 m against a duct top of 1,100 — so the pair factor is 1.00 everywhere and the layer
is not a lever here.

**What the column hears.**

- **The escort, from the first tick.** The Cruiser idling at the frame at 55 reads **10.34** to a
  submersible at the seat, 1,312 m off — Track, exact hull and facing; in open water a submersible
  holds that Cruiser at Contact from 5,652 m and Track from 2,376. The column knows exactly what
  is in the corridor before it moves, which is why this mission can be about a decision.
- **The frame and the gate.** The turrets idle at 12 and are Bearing to a submersible at the seat
  (1,512 m, 1.66); the closure's two Corvettes read 1.03 and 1.05 from 3,200 m. The column hears
  every gun it must not walk into.
- **The rows.** From the seat, nothing: the nearest of Marr's six reads 0.82 to a submersible
  2,398 m away, under the 1.00 that is Contact. **The transcript has to be walked to**, Intake's
  lesson on a different axis ([mission-intake.md](mission-intake.md) §3).

**What the concern hears, and where the listening ground therefore is.** A row is at Bearing to a
Chorister from y ≤ 1,900 and to a submersible from y ≤ 2,050 — a hundred and fifty metres of
usable water south of a corridor whose southern edge is y 1,750, and three hundred for the ears.
That sliver is `the-strip`, and it is overlooked from both ends:

| A silent Chorister at 4.3, on y 1,850 | The closure's gate | The western turret | The escort at the frame |
| --- | --- | --- | --- |
| x 375 | **Classification** (2.60), 456 m | nothing (0.42) | nothing (0.30) |
| x 650 | Bearing (1.82), 570 m | nothing (0.57) | nothing (0.38) |
| x 900 | Contact (1.17), 750 m | nothing (0.80), 1,012 m | nothing (0.48) |
| x 1,225 | nothing (0.71) | Contact (1.39), **716 m** | nothing (0.69) |
| x 1,550 | nothing (0.47) | **Classification** (2.81), 461 m — inside the gun | Contact (1.10) |

**The band that is quiet in both directions runs from x 426 to x 1,244, and it is eight hundred
metres wide.** West of x 426 the closure's gate holds a silent hull at Classification, and thirty
cumulative seconds of that is the second asking. East of x 1,244 the western turret has it inside
seven hundred metres, which is a firing solution rather than a hearing. Between those two lines a
silent hull is Bearing to the gate out to x 760, Contact out to x 996 and heard by nothing at all
from there to the turret's own x 1,043 — and nothing to the escort at the frame anywhere in it, and
outside every gun.

**And two stations inside that band each hold five rows at once.** From (900, 1850) a submersible
holds rows one to five at Bearing — 1.55, 1.75, 1.83, 1.75, 1.55, the outer two at 1,498 m each —
and from (1225, 1850) it holds rows two to six at the same five figures, the geometry being
symmetric about whichever row it stands under. Either station is `the-transcript`'s five on its
own; both, 325 m and eighteen silent seconds apart, are six. A Chorister in the same water holds
three, which is the argument for bringing the ears up the slope.

**And the sixth row is the one that costs.** A Chorister directly beneath `marr-row-six`, at
(1875, 1850), holds it at 1.62 — and stands 351 m from the western turret, at Classification,
inside a 700 m gun that fires at Tier 2. The mission never says not to. It prints the distance.

**The under-run is a route, not a hide.** Thermal Vein at PF 0.45 and 620 m of floor, lying
*below* the corridor's middle: a silent Chorister at (2250, 2400) reads **0.53** to the Corvette
886 m away at the frame's east — nothing, through a path mean of 0.59. It is Thin Water's *the
quiet way is the deep way* inherited by the navy that sentence was written against, and it is
1,277 m and seventy-three silent seconds off the Cruiser's seat.

**And the slope carries at 1.6**, so the column is heard arriving and heard leaving. No hazard
event, no second Drift species, no Sounder: the discipline is Attendance's, kept on noisier
ground, and nothing is in this water that is not the corridor's, the gardens', or the column's
own.

---

## 8. The Objective

**Listen to the Shelf from above the line, and be under it when the tide turns.**

Five objective rows, three of them terminal, stated as the format carries them (`types.ts`):

| Objective | Text | Predicate | Terminal |
| --- | --- | --- | --- |
| `the-transcript` | *The Shelf is listened to. Five of ten is sufficiency. The Undermarshalcy does not round up.* | `{ kind: 'attend', count: 5 }` | **Yes.** Monotone; revealed from 00:00 |
| `the-slope` | *The column is under the line at the tide's turn. Six of eight on the slope is a column.* | `{ kind: 'extract', role: 'cohort', region: 'kell-slope', count: 6 }` | **Yes.** `revealAtTick` T(18), `markerId: 'slope'` |
| `the-ears` | *Two of three ears on the slope.* | `{ kind: 'extract', role: 'ears', region: 'kell-slope', count: 2 }` | **Yes.** `revealAtTick` T(18), `markerId: 'slope'` |
| `the-record` | *What is heard of the column is entered by the concern, and read later, elsewhere.* | `{ kind: 'tolerance', ticks: 3600, tier: ResolutionTier.Classification }` | No. Read out, never ranked |
| `the-whole` | *Eight of ten, and the Holdfast among them.* | `{ kind: 'attend', count: 8 }` | No. Read out, never ranked |

**`the-transcript` is five of ten and §7's submersible holds all five from one standing.**
`attend` is monotone — an emitter resolved at Tier 2 while sounding is banked for the rest of the
match (`runtime.ts`) — so the transcript is a *walk*, not a vigil: 2,302 m from the seat, a
hundred and thirty-one seconds silent, a few seconds standing, and back. The mission is tuned
against a player who does not know that yet.

**`the-slope` and `the-ears` are two rows because `MissionUnit.role` is singular** — a role is one
string per hull, so *the column came down* over eleven hulls of two kinds is two predicates and
not one. That is a finding in Intake's manner rather than a request (§13).

**Both are revealed at T(18), and the late reveal is load-bearing.** An `extract` latches Met the
first pass it is true and never un-latches (`predicates.ts`, `isStanding`; `runtime.ts`,
`deriveObjectives`), so revealed at 00:00 it would latch the first pass six Choristers stood on
the slope — a column that dipped three hundred metres south at 05:00 to be out of the escort's
water and walked back would have satisfied *under the line at the tide's turn* at five minutes
past the hour, and the row would be a sentence about the past. The stalls' beat at 18:00 shares
the tick — Intake's roll idiom ([mission-intake.md](mission-intake.md) §8).

**The slope is a rectangle and not a depth, and the document says so rather than fencing it.** No
predicate reads a hull's depth (§13). `kell-slope` is ground, not water, so a hull that reaches
it and hovers at 340 m over a 900 m floor has come south for nothing the objective can measure
and is still at four fifths. The fiction and the predicate agree about where the column has to be
and disagree about why, and the honest thing is to print the disagreement.

**`the-record` is sixty seconds of Classification, cumulative, in anybody's ears.** Meeting it is
neither good nor bad: it is a fact about somebody else's registry, and the Directorate enters
facts.

### Results

| Result | Condition | Korrin's reading |
| --- | --- | --- |
| **The Shelf is listened to** | `the-transcript`, `the-slope` and `the-ears` | "The Shelf was listened to and the column is under the line. Both are entered. Fifteen in a hundred was paid on every hull that went up and it does not come back; that is entered too, against the shoulder, which does not keep accounts." |
| **Sufficient** | One or two of the three | "You were sufficient. The Shelf was entered, or the column came down, and the other is short. A hull left on the shoulder is not a failure of the column; it is the water, and the water was written down before anybody went into it." |
| **Nobody's** | None of the three | "The Shelf was not entered and the column did not come down. The bells rang for a plateau's decision and the Undermarshalcy has it from nobody, which was the arrangement before and is the arrangement again." |

Beneath whichever reading the run earns, the close appends in order: `the-record`'s pair —
*"The column was classified for a minute of the tide by ears that write things down. The
corridor's book was opened on it, and the book has a third page."* / *"The column was heard and
not held. The corridor's book was opened and closed on a bearing."*; `the-whole`'s — *"Eight of
ten. The Holdfast was heard from inside the concern's corridor, which is entered against the
column and not against the plateau."* / *"Fewer than eight. Gaps are entered as gaps."*; then the
ten rows' own `entered`/`gap` lines in authored order.

**No keystone, and the omission is the argument.** A column that entered ten rows and left three
hulls on the shoulder and a column that came down whole with four rows read as the same sentence,
because the Directorate does not price bodies against a record ([mission-intake.md](mission-intake.md)
§8). Two shapes reach *Sufficient* from opposite directions and both are honest: one that never
leaves the shoulder's southern strip meets the slope and the ears on a walk of three hundred
metres and enters nothing; one that went for the Holdfast enters eight and is still on the strip
at the whistle.

### The fight, priced and not asked

**The escort, the closure and the Holding's column are three Cruisers and seven Corvettes, and
the frame is two turret mounts.** Against a column whose entire hull is 3,264 at eighty-five per
cent:

| Gun | Damage per second | Reach |
| --- | --- | --- |
| Consortium Cruiser × 3 | 60 each, **67 in the Klaxon band** (SIG > 60) | 900 m |
| Consortium Corvette × 7 | 41.7 each | 550 m |
| Sentinel Turret × 2 | 33.3 each | 700 m |
| **Everything the concern has, together** | **560 a second** | — |
| The column's eleven together | 309 a second | 450–900 m |

Five hundred and sixty a second against three thousand two hundred and sixty-four is **five and
four fifths seconds** of everything the column has; the ten hulls without the frame are 494 and
six and a half seconds; and a Chorister at 170 dies to one Corvette in 4.1 s instead of 4.8. This
is not [campaign.md](campaign.md) §2 rule 4's third mission — that slot is the Knights'
*Conclave* — because the fight here is not the frame and is not compulsory.
It is a **consequence**: ninety cumulative seconds at Classification inside a posted closure
brings the third asking, and the third asking brings the Holding's column out of the gate. The
arithmetic that avoids it is already in §4 and §7. The mission is won as a listening and a
withdrawal and lost as a fight, and the document says both.

### The failure, and the sounds that precede it

[campaign.md](campaign.md) §10 asks that no mission fail on a timer and that every failure be
audible sixty seconds out. Three failures, all audible for minutes:

- **The closure walks east from 14:00.** Two Corvettes at 85 m/s to x 2,500 by 14:26 and x 4,500
  by 16:54, at Track from the strip long before they are near it (5.20 at 1,322 m). The crossing
  to the slope is 650 m — twenty seconds cruising, thirty-seven silent — against eight for the
  thing chasing.
- **The Holding's column, if it comes, is four minutes of Cruisers.** Silent at the gate it is a
  smudge; un-silenced at 65 a Cruiser is Track to a submersible out to 2,638 m and Bearing out to
  4,869, so it is Track to anything on the strip from the moment it moves and Bearing at the
  column's own seat, 3,631 m away, at 2.15 through the real path. It arrives at 45 m/s at a
  column that walks at 32.
- **The pack comes up the slope's west end at 17:30**, loud, ninety seconds before the turn, onto
  exactly the ground a column coming off the western strip comes down onto. A Draymaw hears a
  Directorate hull at ×0.4 ([bestiary.md](bestiary.md) §2) and commits to a cruising Chorister
  inside 199 m, a silent one inside 68, a cruising submersible inside 220, a firing Chorister
  inside 270 — and to a **descending** hull, at the dive's SIG floor of 72, inside **396 m**. The
  order that gets a hull under the line fastest is the order that calls the animals.

The close at 19:00 is **not** a conclusion. The tide turns and the count is read; but this
mission can be lost, and a mission that can be lost is resolved rather than concluded.

---

## 9. Length, SIG Budget, and the Beats

**Length: nineteen minutes.** Inside [campaign.md](campaign.md) §10's 12–25, on the length band
[1080, 1200] s. Nineteen is Convocation's own length, one tide earlier, and it is chosen against
§7's walk: the strip is 2,302 m from the seat, 131 s silent each way, and the Holdfast's window
is three minutes in the middle of the tide — the only span in which a column that wants eight of
ten has to be inside the corridor.

**SIG budget: 24** — §4. **No silence order**: `silenceCeilingSig: 100`, `debtCapS: 0`, no
`arrayTag`, which is Asset Recovery's and Intake's posture and means the ledger never runs.

| Time | Beat |
| --- | --- |
| **00:00** | **Korrin assigns, from Sufficiency** (§12). Sixteen `silent` beats seat the eleven hulls of the column and the five of the Holding's column quiet. The bleed is already running |
| **00:20** | **The stalls**: *"Fifteen in a hundred. It has stopped, and it does not come back."* Every bar in the panel now has a segment that will not heal, and no order has been given |
| 01:00 | **Mara Tessen, from the shoulder** (§12). **Marr's six outer rows begin** (`fromTick`), at twelve, until 16:00 |
| 03:00 | The stalls: *"The line is at four hundred. What is above it is not attended and is not asked; it is listened to. The rows are at twelve and north of the corridor, and none of them is heard from the slope."* |
| **05:00** | **The escort walks its corridor west** — Cruiser to (1200, 1500), Corvettes to (1100, 1450) and (1300, 1550), twenty-seven seconds of transit. It stands over the strip's middle: a silent hull between x 1,000 and x 1,400 is Track under its keel, Classification from x 800, Bearing at x 650 and Contact at either end. Both of §7's five-row stations are inside that, so the escort's western leg is four minutes in which the transcript costs what it is worth |
| 06:00 | **`bell-kell` opens**, until 06:20. The stalls: *"Kell's bell, off-tide. Two hundred of that plateau did not get out in 197 PC and the bell is theirs too. It is not entered; a bell does not need entering."* |
| 06:30 | **The watch at Kell's edge, for the plateaus** (§12) |
| **09:00** | The escort returns east to x 2,400. The strip's quiet band is open again, x 426 to x 1,244 |
| **10:00** | **The Holdfast's four rows begin**, until 13:00. The stalls: *"The Holdfast is turning it. It is heard from inside the corridor and from nowhere south of it."* |
| 11:00 | **`bell-teel` opens**, until 11:20. The stalls: *"Teel's bell, off-tide. Two."* |
| **13:00** | The escort walks east to x 2,800 — 890 m from the nearest Chorister's seat, Contact to a silent hull still sitting in it and Track to a loud one. **The Holdfast's rows stop** (`untilTick`) |
| **14:00** | **The closure walks.** `element-one` and `element-two` east along the spur to x 2,500, arriving 14:26 |
| 16:00 | The escort returns to x 2,400. **Marr's rows stop** (`untilTick`). The transcript is closed whatever it holds |
| 16:30 | The closure continues east to x 4,500, over the seat the column started in |
| **17:30** | **The pack.** Two Draymaws from (1000, 2750) and (850, 2800) at 880 m, driven to (1000, 2550) and (900, 2600) until 18:30, `loud: true` — Thin Water's own points, and the telegraph |
| **18:00** | The stalls: *"The slope is called. The line is at four hundred and the column is asked to be under it."* — **`the-slope` and `the-ears` are revealed at this tick** |
| **19:00** | **The tide turns.** Korrin reads the count. `resolve`, and not a conclusion (§8) |

**Conditional beats**, fired by a predicate rather than by the clock (`types.ts`,
`MissionConditionalBeat`; #282). Two choice groups:

| Group | Condition | Effect |
| --- | --- | --- |
| `first` | `{ kind: 'extract', role: 'cohort', region: 'grid-spur', count: 1 }` | **Rell, the first asking** (§12) |
| `first` | `{ kind: 'extract', role: 'ears', region: 'grid-spur', count: 1 }` | **Rell, the first asking** |
| `first` | `{ kind: 'tolerance', ticks: 1200, tier: ResolutionTier.Bearing }` — 20 s cumulative | **Rell, the first asking** |
| — | `{ kind: 'tolerance', ticks: 1800, tier: ResolutionTier.Classification }` — 30 s | **Rell, the second asking** |
| `third` | `{ kind: 'tolerance', ticks: 5400, tier: ResolutionTier.Classification }` — 90 s | **Rell, the third asking**; `move` the escort Cruiser to (1200, 1450); `silent` *inactive* on all five of the Holding's column; `move` all five east along y 1,100 to (2500, 1100) |

The three first-asking beats share a group so whichever fires retires the other two
(`runtime.ts`, the choice-group sweep): a column that stands into the closure and one merely
heard for twenty seconds are asked the same question once. The third asking's five effects share
one condition and one group, which is legal because the group is swept after everything due on
the pass has fired.

**The twenty seconds is arithmetic, not taste.** `tolerance` counts ticks at its tier *or better*
(`types.ts`), so a force's Bearing clock always reads at least as high as its Classification
clock: thirty seconds of Classification is thirty seconds of Bearing as well. Author the first
asking at two minutes of Bearing against the second's thirty at Classification and a column that
wakes up beside the escort hears *"it is the second time of asking, and there is a third"* with
no first time of asking behind it. Twenty sits under thirty by ten, so the first is due strictly
before the second on every route into the corridor and the third at ninety after both. The
tolerance form is also the loose one — the column's own exposure tally, not a trigger volume
([mission-thin-water.md](mission-thin-water.md) §13) — so the two `extract` forms are the ones
literally inside the closure, and every ear that can hold the column at Bearing belongs to it.

**The corridor's transits are authored, not patrol AI**, for the standing reason
([mission-sorrowgate.md](mission-sorrowgate.md) §9): a mission's beats happen at the time the
document says they happen. The closure is why; the beats are when.

**The mission runs its length** (`MissionDefinition.runsItsLength`): without the flag a column
already on the slope at 18:00 with five rows banked would meet all three terminal rows on the
reveal's own pass and close the tide ninety seconds early, deleting the telegraph
([mission-intake.md](mission-intake.md) §13).

---

## 10. What It Teaches

One system, per [campaign.md](campaign.md) §10: **the shallow-water penalty** — the Directorate's
own weakness, taught by making the player spend a mission inside it. It lands in order across the
beat table: the bleed at 00:00 before an order is given, the speed as a number on the first order
(32 against 40), the line as an acoustic fact at 03:00, and the last five minutes in which a
column that walks at thirty-two has to be six hundred and fifty metres south of where it was
listening before two Corvettes at eighty-five arrive over it.

Underneath it, the campaign's subject continued. **Attendance taught that doing nothing is
sufficient; Intake that the living is loud and has to be walked to; The Dome what a transmission
costs. Shallow teaches that the faction's whole advantage is a property of one band of water, and
that the one thing it cannot hear from home is whether the people above it have decided something
about it.** The Directorate goes shallow for a question it is not allowed to ask, hears it, is
heard hearing it, and comes back down — the 205 PC letter served a second time, by presence, with
nobody in the water saying the word.

What this mission deliberately does not teach:

- **Fauna aggro, Biomass and a call that summons** — mission 5,
  [*Trench Awakening*](mission-trench-awakening.md). The pack here is two authored points on a
  slope, nothing is rendered, and the fifteen per cent goes forward in prose only (§13).
- **Fighting with half an army** — mission 6, [*Conclave*](mission-conclave-attending.md); **the
  rim, and information turned into tempo** — mission 7,
  [*First Arrival*](mission-first-arrival.md), where a column that learned to move at thirty-two
  on somebody else's ground does it at forty on its own.
- **Winning a fight against Consortium heavies.** Nothing here is a combat tutorial, and §8
  prices the fight so a player can decline it.

---

## 11. The Map

`kell-shoulder` · **The Kell Shoulder** · one seat · 5,000 × 3,000 m · cell 250 m · base floor
340 m. **Reused unchanged**, literal for literal, from
[mission-thin-water.md](mission-thin-water.md) §11 (`kellShoulder.ts`).

| Region | Rect (x, y, w, h) | Biome | Floor | What it is |
| --- | --- | --- | --- | --- |
| The Shoulder | 0, 0, 5000, 3000 | Open Water | 340 | The bare rise. Painted first; everything else is cut into it. PF 1.00 — the thin water, and now the column's own |
| The Grid Spur | 0, 1250, 5000, 500 | Open Water | 420 | The posted closure, east to west. **The one Mid-Water ribbon on the map**: a Directorate hull that dives to its floor runs at forty again, and standing in it is the offence |
| The Kell Slope | 0, 2500, 5000, 500 | Abyssal Trench | 900 | The southern edge falling away. PF 1.60 — the column is heard arriving and heard leaving. **The withdrawal region** |
| The Vent Under-run | 1750, 1750, 1000, 750 | Thermal Vein | 620 | PF 0.45, the map's one mask, lying below the corridor's middle. The quiet way is the deep way |
| Kell Face | 3750, 1750, 1250, 750 | Kelp Forest | 300 | The replanted terrace's working face. Kell's bell is rung here |
| The Marr Approach | 0, 250, 2000, 750 | Kelp Forest | 280 | Home terrace's outer rows. Six of the ten sounds stand in it |
| The Holdfast Gate | 250, 0, 1000, 250 | Kelp Forest | 260 | The plateau's own gate. Four of the ten, and heard from nowhere south of the corridor |

One spawn, at 4375, 2125, and irrelevant: every party is seated directly. No resources, no hazard
sites, `fauna: false`. Every rectangle lands on the 250 m cell grid and paints exactly the metres
it reads ([maps.md](maps.md), "How a map is written").

**Mission regions**, restating only what a predicate or a reader addresses:

| Region | Rect | What it is |
| --- | --- | --- |
| `grid-spur` | 0, 1250, 5000, 500 | The posted closure. The first asking keys on it |
| `kell-slope` | 0, 2500, 5000, 500 | The withdrawal. `the-slope` and `the-ears` count into it |
| `the-strip` | 0, 1750, 2000, 250 | The shoulder's water directly beneath Marr's outer rows, between the closure's southern edge and the last metre from which a row is at Bearing. **Named for the reader and addressed by no predicate** |

One marker: `slope`, at 2500, 2750, radius 1,000, named by `the-slope` and `the-ears` and shipped
only once they are revealed.

**Depth, party by party**, against `requiredPressureRating` — Shelf PR-1, Mid-Water PR-2
([systems-depth.md](systems-depth.md) §1):

| Seated at | Depth | Floor there | Needs | Has |
| --- | --- | --- | --- | --- |
| The column, x 3,350–3,700, y 2,200–2,350 | 340 m | 340 (Shoulder) | PR-1 | Chorister 2, Submersible 3, Cruiser 2 |
| The frame's two turrets | 380 m | 420 (Spur) | — | Structures do not crush |
| The corridor escort | 400 m | 420 (Spur) | PR-2 | Corvette 2, Cruiser 2 |
| The second element | 400 m | 420 (Spur) | PR-2 | Corvette 2 |
| The Holding's column | 340 m | 340 (Shoulder) | PR-1 | Corvette 2, Cruiser 2 |
| Marr's rows / the Holdfast's | 260 / 250 m | 280 / 260 | — | Emitters |
| `bell-kell` / `bell-teel` | 290 / 280 m | 300 / 340 | — | Emitters |
| The pack, spawned | 880 m | 900 (Slope) | — | Draymaw band 500–1,300 m |

**Why the reuse is the argument.** [campaign.md](campaign.md) §2 rule 5 says the map persists,
and §8 says the convergence is "the same terrain four times and never the same mission". This is
the first time either sentence is applied *across campaigns*: the shoulder Thin Water's column
crossed westward losing tenders is the shoulder the Directorate climbs northward losing fifteen
per cent — same rock, same closure, same warden, same turrets, same pack. Nothing is repainted
and nothing is added, and **the carrying rule 5 actually asks for is unbuilt everywhere** (§13),
so this is a decision about authoring rather than a claim about state.

**The Kell Shoulder is a mission map and is not in the public catalogue.** One seat, no
resources, not balanced, resolved by mission id and nothing else ([maps.md](maps.md)).

---

## 12. The Briefing

Spoken by Undermarshal Setha Korrin from Sufficiency, to a column she cannot join. There is no
formula at the opening: the Cantorate does not attend a shoulder. The Directorate's register is
defined in [culture.md](culture.md) §3 — passive, impersonal, structurally humble, and it does
not shorten its sentences.

**Undermarshal Setha Korrin, assigning from Sufficiency — 00:00**

> A cohort of the Fourth is on the Kell shoulder at three hundred and forty metres. It went up
> the slope in the tide's dark and it is lying quiet, and it is above the line, and it has been
> above the line since before this was said.
>
> The shallows take a fifth of the way a hull moves and fifteen in a hundred of what it is made
> of. The fifteen is taken once, it is taken in twenty seconds, and it is not given back when
> the hull comes down. That is written where it has always been written and it is stated here
> so that nobody performs the arithmetic for the first time while being asked for an asset
> number.
>
> Marr rang off-tide. The plateaus are turning a second seeding, garden by garden, and what a
> garden decides about the deep is not sent to those below and never has been. It is heard, or
> it is not heard. It is at twelve, it is in kelp, and it is north of a corridor that is closed
> to everyone including the people who posted it.
>
> The Undermarshalcy is not present. It cannot be. What is entered will be entered by the stalls
> and read at the turn, and the reading will not be improved by anybody's having been there. Five
> of ten is sufficiency. The Undermarshalcy does not round up.
>
> The column is asked to be under the line at the tide's turn. It is not asked to be anywhere
> else.

### Objective readings, in play

The Directorate states conditions rather than issuing tasks, and every reading is in the passive
or the impersonal:

- *The Shelf is listened to. Five of ten is sufficiency.*
- *Entered: Marr's third outer row, at twelve, at the pace of a turning.*
- *Not entered: the fifth row.*
- *The line is at four hundred. Six of eight on the slope is a column.*
- *Two of three ears on the slope.*
- *What is heard of the column is entered by the concern, and read later, elsewhere.*

### The voices in the water

**Mara Tessen, 4th Trench Cohort, on the shoulder — 01:00**

> Three hundred and forty. Nobody in the cohort has been this shallow. The hull bled for twenty
> seconds and has stopped at fifteen, and the water is lit from the wrong side.

**Corridor Warden Anse Rell, three askings** — *(fired by the tally or the closure, not the
clock: the first on a hull standing in the closure or on twenty cumulative seconds at Bearing,
the second on thirty at Classification, the third on ninety — and the Holding's column comes out
of the gate on the third line)*

> Bearing inside a posted closure is asked for an asset number and a charter reference. This is
> the first time of asking.
>
> This is not a threat and it is not a negotiation; it is the second time of asking, and there is
> a third.
>
> The corridor is closed and the order is enforced. Whatever is in it is a matter for the
> registry now, and the registry is patient.

**The watch at Kell's edge, for the plateaus — 06:30**

> We can hear you. We'd rather you knew that we can, so that nobody has to pretend afterwards.
> Nothing out here means you harm, and we'd like to keep saying that.

**Undermarshal Setha Korrin, at the close — 19:00**

> The reading of the count, per §8 — and then one sentence she should not say aloud, and does:
> "The shallows take fifteen and stop. That is written. It was written by people who had never
> lost the fifteen."

Each line fails [culture.md](culture.md) §3 for the other three factions, which is that
document's own test (§6). Korrin states a printed number as a thing read rather than a thing paid
and the Undermarshalcy's absence as a property of the water — the Consortium would cost the
fifteen per cent and the Commune would offer it. Tessen reports her own hull's physiology as a
fact about light and claims nothing, which the Knights could not do without courtesy and the
Consortium would file rather than say. Rell prices a stranger's presence inside a procedure with
three named stages and no adjectives, which is the language of instruments and nothing else. The
watch offers a warning as an offer, in the collective first person, closing on what it would
*like* — the one register in the Rift that cannot use the imperative even to say *leave*. And
Korrin's last is a statement about who wrote a rule, made to nobody, by the person the rule now
belongs to.

**It is the fourth consecutive Directorate mission that ends with Korrin saying one sentence she
should not say aloud** ([mission-attendance.md](mission-attendance.md) §12;
[mission-intake.md](mission-intake.md) §12; [mission-the-dome.md](mission-the-dome.md) §12) — one
on the record, one on the eight per cent, one on a lie, and one on the shallows. The campaign
stops one clause short of the real one in *Conclave* and says nothing at all at the rim.

---

## 13. Scaffold Status

What exists against this document and what does not, continuing the list
[mission-asset-recovery.md](mission-asset-recovery.md) §13 started. **This mission is specified
and not built**, and its headline row is unusual for the queue: the system it teaches is
**already built and never yet fired**, so the work is authoring rather than engineering. The rows
below are mostly *Built*, with four findings — two of them about how a document derives a shipped
number rather than about a missing mechanism — and one open question the document names and
declines to settle.

| Requirement | Status |
| --- | --- |
| The mission format — beats, predicates, registry, private rooms | **Built** (#190). `attend`, `extract`, `tolerance`, and the `say`, `move`, `silent`, `creature` and `resolve` beats cover §8 and §9 entire |
| **The Directorate's shallow-water penalty** | **Built, and this is the first mission to fire it.** `inDirectorateShallows` tests the Shelf band rather than a hard 400 m (`echo.ts`); the speed half is `DIRECTORATE_SHALLOW.SPEED_MULTIPLIER` 0.8, composed multiplicatively with Silent Running in `movement.ts`; the hull half is `DIRECTORATE_SHALLOW_BLEED_PER_S`, derived as `(1 − 0.85) / 20`, clamped so a hull lands *on* the floor rather than stepping through it (`pressure.ts`). Nothing here is a request. [mission-intake.md](mission-intake.md) §13 recorded it as "built and deliberately untouched"; this document is where it is touched |
| **Seating the column already above the line** | **A decision, stated so it can be overruled.** The bleed is a twenty-second event, and a mission that started the column below the line would spend its first three minutes on a dive nobody would enjoy watching and would hand the player the system as a punishment for an order. Seated at 340 m at tick zero, the system fires whatever the player does, the panel shows it by 00:20, and the first order the player gives shows the other half as a number. The cost of the decision: the column never *chooses* to go shallow, which is a real loss of agency and the reason §4's third movement is a table rather than a sentence |
| **Map reuse across campaigns** | **A decision, not a build.** `kell-shoulder` is transcribed unchanged from `kellShoulder.ts` and the literal imports the same map. What [campaign.md](campaign.md) §2 rule 5 actually asks for — Drift Health carried from `seeding-thin-water` to `attending-shallow` on the same ground — is **Absent**, everywhere, for every pair of missions ([mission-convocation.md](mission-convocation.md) §13, which is the other pair). This document does not ask for it either; it notes only that the shoulder now carries a mission from each of two campaigns, which is the case rule 5's carry would have to survive |
| Ten attendable emitters in windows, and two that cannot be counted | **Built.** `MissionEmitter` carries `fromTick`/`untilTick` and an optional `reading`, and `attend` counts only emitters that carry one, so the two bells are windowed sounds worth nothing to the count without a single new field. `attend.count` is bounded by the number of attendable emitters, which is ten against §8's five and eight |
| The three askings, on conditions, in two choice groups | **Built** (#282; `choiceGroup`). The three first-asking beats share a group so whichever fires retires the other two; the third asking's five effects share one condition and one group, which the runtime sweeps after everything due on the pass has fired |
| **A scripted party un-silenced and moved by a condition** | **Built**, and this document is the first to use it. A conditional beat is any effect but `resolve`, so `silent: false` on the Holding's five hulls and five `move` beats hang off one `tolerance` predicate. Nothing about the Holding's column is a new mechanism; what is new is that a mission's largest reserve is *authored as a consequence of the player's exposure* rather than of the clock |
| A pursuit that stops at the closure's edge | **Built** — authored legs, nothing new. The escort never goes below y 1,750 because the document says so, not because the runtime stops it |
| Guns that fire at Tier 2, and turrets that listen | **Built** (`combat.ts`; `thinWater.ts` is the precedent for Sentinel Turrets on a scripted party). §7's seven-hundred-metre figure is the turret's gun, not its ears, and §5 states both |
| **None of the ten rows at Tier 2 from the slope** | **Arithmetic over the shipped model, not a proposal.** Measured through `pathPropagation`: the best any hull on the Kell Slope can do against the nearest Marr row is **1.02** with a submersible at the slope's north edge and 0.90 with a Chorister, against 1.50 for Bearing; the Holdfast's rows read 0.72. The mission's central claim is therefore a property of the terrain grid and the propagation model rather than of a rule, and `missionShallow.test.ts` should assert it by re-deriving it rather than by copying these numbers |
| **Silent Running's SIG is the hull's, not the band's** | **Built, and the one place a reader is most likely to mis-derive this document.** `silentRunningSig` places a hull inside `SILENT_RUNNING`'s 3–8 band by its idle figure — `3 + 5 x min(1, sigIdle / 60)` (`acoustics.ts`) — so a Chorister runs silent at **4.3**, a submersible at 4.8, a Cruiser at 7.6 and a Corvette at 5.3, and only a hull idling at 60 or more ever reads the eight. Every silent figure in §1, §3, §5, §7 and §8 is computed at the hull's own value; the eight would inflate a Chorister's silent ranges by a factor of 1.85 and would put the seat at Contact when the model says nothing. [mission-radicals.md](mission-radicals.md) §13 records the same trap from the Commune's side |
| **The three askings' thresholds are ordered by arithmetic** | **A finding about `tolerance`, and the reason for §9's twenty seconds.** The predicate counts ticks at its tier *or better* (`types.ts`), so a force's Bearing tally is always at least its Classification tally, and a first asking authored above the second's threshold can fire after it — Rell saying *"it is the second time of asking"* with no first behind it. Nothing in the format orders conditional beats by anything but their own predicates, and `choiceGroup` retires siblings rather than sequencing them (#282), so the ordering has to be bought in the numbers: 20 s at Bearing, 30 s at Classification, 90 s at Classification. Named here rather than asked for, because a sequenced conditional — *fire only after beat X has fired* — is a second kind of state in a table that deliberately has none |
| **Two roles for one withdrawal count** | **A finding, not a request.** `MissionUnit.role` is one string (`types.ts`), so a mission cannot both tally eight Choristers under `cohort` and three ears under `ears` and then ask one question about all eleven. This document wants the two counts separately anyway — six of eight and two of three read better than eight of eleven, and the Undermarshalcy does not round up — so the constraint improves the design and the row is recorded rather than filed. A mission that genuinely needed the union would want a `tags` argument on `extract`, as [mission-intake.md](mission-intake.md) §13 named it |
| **A withdrawal region that is a rectangle and not a depth** | **A finding, and the one place this document is uncomfortable.** No predicate in the union reads a hull's depth: `extract` names a region, and a region is a rectangle on the floor plan. So "under the line" is authored as *standing over the slope*, and a hull that reaches `kell-slope` at 340 m has satisfied a mission about the four-hundred-metre line without going below it. §8 prints the disagreement rather than hiding it. The shape a genuine need would take is a `depthM` ceiling on `extract` — `{ kind: 'extract'; role; region; count; belowDepthM?: number }` — which is the same query over the observer's own force that the union already permits and would cost one comparison. **This document names it and does not ask for it**, because the mission is honest without it and one mission's convenience is a poor reason to widen a union |
| Unwinnable as a fight | **Not nominated.** [campaign.md](campaign.md) §2 rule 4's three missions are *Sorrowgate*'s evacuation, *Thin Water*'s retreat and the Knights' *Conclave*'s refusal. The fight here is priced in §8 at 560 a second against 3,264 of hull, is a consequence of ninety cumulative seconds of Classification inside a posted closure, and is avoidable by arithmetic the mission has already shown the player |
| `runsItsLength` | **Built for [mission-intake.md](mission-intake.md) and needed here for a different reason.** All three terminal rows can be true on the reveal's own pass at 18:00, which would close the tide ninety seconds early and delete the pack's whole purpose. With the flag only `resolve` closes it |
| `fauna: false` with two authored creatures | **Built** — the flag is Attendance's, the beats are Thin Water's own points, and the reason is Intake's: the default seeder is a skirmish roster and cannot put animals in named places |
| Progression — the fifteen per cent carried forward | **The record is built; the carry is not** (#371, #374). `packages/frontend/src/progression/store.ts` keeps a per-mission history and the campaign board reads it, so it is no longer true that nothing remembers a mission was played — its `MissionRecord` comment names cross-mission Drift Health and permanent attrition as the systems queued behind it. What is still absent is a hull that arrives at mission 5 carrying what mission 4 took out of it, so §10's sentence about the column reaching *Trench Awakening* at eighty-five per cent is **prose only**, and deliberately not asked for here ([mission-item-nine.md](mission-item-nine.md) §13, the row every campaign leans on and none owns) |
| A silence order | **Not authored, and the absence is a claim.** [habitats.md](habitats.md) §8: the Directorate's hush is written, the court's is enforced, and everybody else's is courtesy — "a mission on a plateau or in the Holding should price them as such". The plateaus' hush at the watch-edge is the loudest example of that in the bible and this mission declines to enforce it, which is the difference between attending somebody's ground and policing it |
| In-mission character speech, heard | Text only, the standing status ([mission-sorrowgate.md](mission-sorrowgate.md) §13) |
| The mix — a garden heard from a bare rock, and two bells nobody counts | Not started ([audio-direction.md](audio-direction.md)). §6's whole argument — that the loudest things on the map are worth nothing and the quietest are worth everything — exists in prose and in a detection table and in no sound yet |

### One question this document does not settle

**Whether a mission may state a depth its predicates cannot read.** §8's `the-slope` says *under
the line* and counts *over the slope*. The two coincide for every route a player would take, the
slope being the only ground on this map below four hundred metres — but they are not the same
sentence, and a later mission on ground where they diverge (a shelf with a deep pocket, a
corridor that dips) would find the objective saying one thing and scoring another. The two ways
out are the `belowDepthM` row above and a discipline that a withdrawal region is authored only
where its floor and the fiction's line agree. **This document takes the second and records that
it did**, so the first can be argued for by whoever needs it rather than half-taken here.

---

## Related

- **[campaign.md](campaign.md)** — §6, whose fourth row this specifies; §2 rule 5, applied across campaigns for the first time; §2 and §10, whose rules it is written under
- **[mission-thin-water.md](mission-thin-water.md)** — the same rock from the other side: the map literal, Rell's book, the frame's turrets, the closure's west-end seats and the pack's own points
- **[mission-convocation.md](mission-convocation.md)** — the tide before: the bell rung off-tide, the rows turning at twelve, and the count read at the watch's edge
- **[mission-attendance.md](mission-attendance.md)** — the attend instrument, aimed at the Shelf; "what is above the Lid is not attended", and the line this mission stands on
- **[mission-intake.md](mission-intake.md)** — the Chorister put in the roster and not fielded, the ×0.4 the Drift hears this faction at, the late reveal, and `runsItsLength`
- **[mission-the-dome.md](mission-the-dome.md)** — The Attending 3, which handed the column the ping this mission carries and cannot spend
- **[mission-trench-awakening.md](mission-trench-awakening.md)** — The Attending 5, where the Directorate's own shallow band is 1,800 m and the Rift's is 340
- **[mission-conclave-attending.md](mission-conclave-attending.md)** and **[mission-first-arrival.md](mission-first-arrival.md)** — The Attending 6 and 7: the Chorister sent where a submersible cannot go for a written reason instead of a physiological one, and a column that learned tempo at thirty-two spending it at forty
- **[systems-depth.md](systems-depth.md)** — §1, the bands and the line; §2, the fast loud descent and the slow silent climb; §3, the penalty this mission is made of
- **[systems-echo.md](systems-echo.md)** — §3, PF 1.00 and the layer that is not a lever here; §4, the tier a row is entered at; §5, the button that buys nothing above the line
- **[systems-combat.md](systems-combat.md)** — §7, the Tier-2 firing solution that makes seven hundred metres of the spur a turret's water
- **[bestiary.md](bestiary.md)** — §2, the aggro ladder and the ×0.4 a diving hull loses; §4, the Draymaw's band and its pursuit
- **[units.md](units.md)** — the Chorister, the Abyssal Submersible, the Cruiser hull and the Sentinel Turret on the other side of the water
- **[habitats.md](habitats.md)** — §6, Mara Tessen and the Fourth's freight galleries; §8, the hush that is courtesy and is priced as such
- **[world-map.md](world-map.md)** — the Kell Shoulder, Kell Plateau's two hundred, and the corridor that runs the air
- **[culture.md](culture.md)** — §1, asking as the thing this faction does not do; §3, the four registers §12 is tested against
- **[characters.md](characters.md)** — Korrin, who cannot come, and the sentence she says anyway
- **[timeline.md](timeline.md)** — 197 PC and the bell that is still theirs; 205 PC, the letter this mission serves a second time
- **[maps.md](maps.md)** — how a mission map is written, and why this one is not in the catalogue
- **[glossary.md](glossary.md)** — mission outcome, the partial that is a result, and the silence order this mission does not impose
