# The Attending 3 — The Dome

> The third mission of the Directorate campaign ([campaign.md](campaign.md) §6), specified. One
> of the fourteen documents that complete the bible's campaign, written to the pattern
> [mission-sorrowgate.md](mission-sorrowgate.md) sets and the Directorate documents continue:
> everything here is authored — the forces, the water, the beats, the numbers and the text —
> and code transcribes this document.

**Setting:** the Fourth Trench and the Fourth's foot — the freight shortcut between the west
wall and the deep, closed to chartered freight while the exchange inquiry runs, and the ground
south of the Deep Yard where the shortcut stops being a corridor and becomes the deep: the 4th
Trench Cohort's freight galleries and the Cantorate's dome, 214 PC, the same tide as the
Ledger's *Baffle*, from the picket's side ([world-map.md](world-map.md);
[habitats.md](habitats.md) §6; [mission-baffle.md](mission-baffle.md) §1, §5).

**Mission id:** `attending-the-dome` — namespaced by campaign after `attending-intake`, per
[campaign.md](campaign.md) §1.

**Premise, for the entry that offers it:** *The Fourth is closed while the inquiry runs, and
what enters it is counted. At the trench's foot the stalls put a sound into the water instead
of taking one out.*

**This is the first mission in which the Directorate puts a sound into the water, and it puts
two.** The Cantorate sounds a Chorus Call at the trench's foot — six voices, a cohort that is
not there — and the same tide hands the picket the ping, per [campaign.md](campaign.md) §10's
mission-3 rule. In the Rift's grammar transmitting is lying and pinging is asking
([culture.md](culture.md) §1), and the faction that has collected six thousand pages since
88 PC without writing a question into any of them does both inside twenty minutes. §4 is the
longest section here because both transmissions have to be priced in the only currency this
faction keeps, which is the record.

---

## 1. What the Fourth's Foot Is

The Fourth Trench is the freight shortcut between the west wall and the deep, claimed by the
Consortium and the Directorate and patrolled alone by neither ([world-map.md](world-map.md))
— until three tides ago, when the Sorrowgate exchange went wrong in front of a Directorate
observer and the Undermarshalcy closed the shortcut to chartered freight while the inquiry
runs. Pickets on the axis, counting what enters
([mission-baffle.md](mission-baffle.md) §1). *Baffle* is that tide from the convoy's side. This
is the same tide, the same water, and the same clock, from the side that is counting.

South of the Deep Yard the chart runs out. *Baffle*'s map stops a thousand metres below the
yard's berths because a relief writ has no reason to go further; the water does not stop. The
last kilometre of it is **the Fan** and **the Foot**, where the pipe opens, falls from 1,700 m
to 2,400 m, and becomes the beginning of the deep the Ninth is the far end of. Mara Tessen's
freight galleries are cut into the fan's east wall and the Cantorate's listening dome stands on
the last bench ([habitats.md](habitats.md) §6).

Three facts about this water decide the whole mission, and none of them is a fence.

**The trench is a five-hundred-metre pipe that carries at 1.6.** No secrets down its length,
only distances ([systems-echo.md](systems-echo.md) §3). A picket in it hears the convoy enter,
transit and arrive; the convoy's Cruiser hears a cruising submersible from 4,204 m and holds it
at Track inside 1,768 m. Nothing in the Fourth is ever out of a Cruiser's nine-hundred-metre
gun while the convoy is passing it, which is what makes each gate a decision rather than a
wall.

**The only quiet water belongs to the concern.** Two vent pockets notch the walls at PF 0.45 —
the chartered lay-bys, with a Consortium Baffle station moored in each
([mission-baffle.md](mission-baffle.md) §1, §4). The picket has no cover anywhere on this map,
and the mission does not pretend it wants any.

**The foot is outside the Ledger's chart and outside the convoy's guns.** The dome stands at
(1500, 5500), a thousand metres south of the yard's berth; the array under it stands at 950 m —
fifty metres outside a Cruiser's reach from that berth, which in a chart the Cantorate drew is
not a coincidence and is never mentioned by anybody.

Nobody says any of this. It is the ground the mission stands on.

---

## 2. Whose Hulls the Player Commands

**The player commands the Fourth Trench picket — four Abyssal Submersibles in two standing
watches — and, for the first time, the Cantorate's array at the foot: six Choristers under a
listening dome.**

The picket is *Baffle*'s picket, seat for seat: the same four hulls, the same two gates, the
same law announced at 04:00 in the same words. The array is new. Attendance lent the watch a
dome and nothing else ([mission-attendance.md](mission-attendance.md) §3) and Intake fielded no
Chorister at all ([mission-intake.md](mission-intake.md) §13); here six sit at the foot under a
dome that lifts them to the listening cap, because what the stalls do at 13:00 needs an
instrument standing where it can hear itself lie.

Undermarshal Setha Korrin assigns from Sufficiency and reads the count. First Cantor Vehl
Ossary opens with the formula and speaks once more, at 13:00, and is present at the close and
says nothing. Cohort-Prime Adze is not here; the 9th is at the floor
([mission-attendance.md](mission-attendance.md) §12).

**Engine bound, stated so nobody corrects it into a bug.** Five parties and a court slot: the
picket with the dome (the player, slot 0); the court, empty (slot 1); the relief convoy
(slot 2); the Deep Yard, whose only asset in the water is a sound (slot 3); and the Call
(slot 4), which is six sounds and nothing else. The Drift is not a party. Slot 5 is not used.

**The Call carries a faction because a party must, and the faction is the Directorate's** — so
the six voices are heard by the Drift at ×0.4 like everything else the faction emits
([bestiary.md](bestiary.md) §2). It carries no hulls, and §13 records why: hostility is
`Owner.slot`, so a friendly scripted Directorate party with hulls in it would be auto-acquired
by the picket's own guns.

---

## 3. The Picket

| Hull | Count | Stats | Why |
| --- | --- | --- | --- |
| Abyssal Submersible — the picket, role `watch` | 4 | **SIG 22 idle / 28 cruise / +20 firing · HYD 85 · PR-3 · 520 HP · 80 dmg at 650 m every 1.8 s · 60 m/s (33 silent) · 95 m** ([units.md](units.md)) | *Baffle*'s four, in *Baffle*'s seats. Armed, and the first Directorate hulls another navy shoots at. Ninety-five metres is the shortest hull a colossus grinds ([mission-intake.md](mission-intake.md) §6), which matters at the foot and not in the pipe |
| Chorister — the array, role `array` | 6 | **SIG 16 / 24 / +15 · HYD 75, 95 under the dome · 200 HP · 20 dmg at 450 m · 40 m/s (22 silent) · 50 m · PR-2 on the hull, `pressureRating: 3` authored** ([units.md](units.md)) | The cohort hull, fielded at last. It is not here to fight: 20 a second at 450 m against a Klaxon escort is arithmetic nobody runs twice. It is here because the dome is worth more to it than to anything else in the Rift (§4) |
| Cantor — the dome, `arrayTag: 'dome'` | 1 | SIG 35 idle · HYD 80 · 1,200 HP · **+25 HYD capped at 95 within 1,200 m** ([units.md](units.md)) | The Cantorate's instrument, standing on the last bench at 2,300 m. Structure, not hull; placed, never moved. Called by its own name for the second time in the campaign |

The picket's seats are *Baffle*'s literally: the first watch `watch-one` at (1400, 1150) and
`watch-two` at (1600, 1200) at 1,600 m, across the trench's first bend; the second watch
`watch-three` at (1400, 3750) and `watch-four` at (1600, 3780) at 1,600 m, across the mouth
between the convoy and the yard. The array sits at the foot at (1300…1700 step 80, 5450) at
2,300 m — inside the dome's 1,200 m, 950 m from the yard's berth.

**Every hull is armed, and every hull is seated silent.** Ten `silent` beats at tick zero: a
watch at rest is quiet, and a silent hull holds its fire ([systems-combat.md](systems-combat.md)
§5, and the auto-acquire path that reads it). Silent Running puts an Abyssal Submersible at
**4.8** and a Chorister at **4.3** — the 3–8 band is entered by idle SIG, not by faction
([systems-echo.md](systems-echo.md) §6) — so the picket opens the mission at a loudness the
convoy's Cruiser cannot resolve from 856 m and is under the silence ceiling by twenty-five.

### What the picket does not carry

1. **Active sonar is aboard, live, and handed over.** [campaign.md](campaign.md) §10 withholds
   the ping until mission 3, and this is mission 3. Attendance stated the doctrine —
   "pinging it is not scouting, it is asking, and the Directorate does not ask"
   ([mission-attendance.md](mission-attendance.md) §3) — and the doctrine is about the Mouth.
   The Fourth is not the Mouth. The lock is simply absent: *the Directorate does not ask; the
   picket may, and will be heard asking.*
2. **No construction.** Reason string: *the inquiry's water is not re-rigged, by anyone.* The
   picket removes a mooring at 13:00 for exactly that sentence and does not get to lay one.
3. **No mines and no depth charges.** Reason string: *nothing is left in closed water.* A
   closure that leaves ordnance behind it is a seizure, and the whole Directorate case is that
   it is not one.
4. **Noisemakers, weapons and torpedoes are live** — the Directorate's seekers listen at HYD 70
   ([systems-combat.md](systems-combat.md) §5) — and this is the first Directorate mission in
   which the guns are not decoration.

`escortRadiusM` is 0 — nothing here is freight. There are no starting nodules, nothing to build
and nothing to render; `fauna: false`, and every animal on the map is a beat.

---

## 4. The Dome, and the Call

The system this mission teaches, per [campaign.md](campaign.md) §2: one system, introduced in
the first three minutes and load-bearing by the last five. The system is **the Cantorate's
instruments** — the dome, the Call, and the ping handed over beside them — and it lands in four
movements.

**1. The dome is worth most to the hull that costs least.** The Cantor grants +25 HYD capped at
95 within 1,200 m ([units.md](units.md)). Range scales as hearing raised to one over the
attenuation exponent of 1.6, so the grant is worth **×1.16 of range to a Chorister** (75 → 95), **×1.07 to an Abyssal
Submersible** (85 → 95, and Attendance already said so at seven per cent), and **×1.29 to a
Corvette** (50 → 75). The Cantorate's standing rests on an instrument that is nearly wasted on
the Directorate's own deep hull and transforms its cheapest one. Under the dome a Chorister
holds a Cruiser at contact from 9,022 m and the yard's plant from 6,127 m. Nothing in the
mission remarks on it. Korrin has read the number
([mission-attendance.md](mission-attendance.md) §5).

**2. The instrument is withdrawn from the Cantorate's array by the picket's own guns.** The
silence ledger runs on `silenceRole: 'watch'` at `silenceCeilingSig: 30`, `debtCapS: 30`. A
submersible idles at 22 and cruises at 28 — under. One that fires is at 42 idle and 48
cruising; one that drops Silent Running spikes +40 for two seconds
([systems-echo.md](systems-echo.md) §6). Either is over, debt accrues a second for a second up
to thirty, and while the shift is in debt the dome's grant goes to the court's slot and every
Chorister at the foot drops from 95 to 75 — sixteen per cent of range, gone, four kilometres
from the hull that spent it. **Engaging costs hearing**: the Directorate's price, written down
rather than felt. The joke — the Cantorate's instrument withdrawn from the Cantorate's own
array by a picket doing its job — is one nobody in the water makes.

**3. The Call is a lie, and it is entered as one.** At 13:00 the stalls sound a Chorus Call at
the foot: six emitters at SIG 16, the loudness of a Chorister at rest, on periods of 7, 9, 11,
13, 15 and 17 seconds, five seconds on, for two minutes. To the concern it reads as six
positioned contacts with a bearing and a depth and **no kind and no faction**, because that is
what a mission emitter is at Tier 3 ([mission-attendance.md](mission-attendance.md) §4) — and a
cohort at rest is exactly what the registry has a column for. What the Call costs the stalls is
not the sounding but that **`call-a` carries a reading**: the six thousand pages acquire their
first line since 88 PC that was written before it was heard.

**4. The ping is a question, and the deep answers it.** Active sonar is SIG 95 for three
seconds, Tier-4 inside 900 m, self-revealing at 2,400 m in open water at HYD 50
([systems-echo.md](systems-echo.md) §5). In trench water that self-reveal is **3,219 m** at
HYD 50 and **4,486 m** to another submersible's 85 — a picket that asks at the foot is heard
asking from most of the map. And fauna hear a ping at ×3 ([bestiary.md](bestiary.md) §2), which
against the Directorate's ×0.4 leaves a net ×1.2 on the aggro ladder: a Sounder holding station
in the Foot grows interested inside **1,012 m** and commits inside **834 m**. The array's six
seats stand 520 to 819 m from it. **A picket that asks at the foot is answered; a picket that
asks at the mouth, 2,133 m out, is not.** Nobody tells the player which.

### The SIG budget

**SIG budget: 28** — an Abyssal Submersible's cruise, and a working level rather than a ceiling
([campaign.md](campaign.md) §10). It is the third figure this campaign has given the same rule
— Attendance's 8 and Intake's 50 were both descriptions — and the first that sits *under* a
sanction rather than beside one: the silence ledger's ceiling
is 30, so the budget is two below the loudness that costs the array its dome. A picket that
walks its water all tide is inside both. A picket that fires is outside both, and the panel
says so in the Cantorate's own words.

Playtested, per §10, against a player who exceeds it — which here means a player who fights
both gates, because both gates are fights the convoy brings.

---

## 5. The Parties

| Party | Force | Standing |
| --- | --- | --- |
| **The Fourth Trench picket, with the Cantorate's array** — the player | 4 Abyssal Submersibles (`watch`), 6 Choristers (`array`), 1 Cantor | Attending a closed trench under a claim two centuries old. Counting |
| The court | Nothing. Slot 1, reserved and empty | The ledger's other end (`types.ts`, `courtSlot`) |
| The relief convoy | 1 Cruiser, 2 Corvettes, 1 compressor barge, 2 moored Baffle stations | Under writ, unfiled, armed except the barge. Klaxon posture, on *Baffle*'s clock |
| The Deep Yard | Forty-one souls and a failing plant | On the channel by the only voice it has left. Not the inquiry's |
| The Call | Six emitters at the foot, from 13:00 to 15:00 | The Cantorate, sounding. Not a cohort |
| The Drift | 3 Draymaws up the axis at 18:30; 1 Sounder holding in the Foot all tide | *Baffle*'s pack, and what deep basins hold |

**The convoy is *Baffle*'s convoy, seated where `baffle.ts` seats it**: `flagship` (Cruiser) at
(1500, 300), `corvette-1` at (1380, 250), `corvette-2` at (1620, 250) and `plant-barge`
(Harvester, unarmed) at (1500, 420), all at 1,000 m in the staging above the layer's duct; the
stations `baffle-north` at (1125, 1875) and `baffle-south` at (1875, 3125) at 1,650 m,
prebuilt, each bending the convoy's own emissions through PF × 0.6 within 400 m. Its legs are
authored to *Baffle* §9's clock and carry `depthM`, so the scripted convoy dives into the
trench at 02:30 exactly as *Baffle*'s player does. Its guns are the Klaxon bill from the other
side: **a Cruiser at 150 every 2.5 s to 900 m (60 a second, 67 inside the Klaxon band) and two
Corvettes at 50 every 1.2 s to 550 m (41.7 each)**, auto-acquiring the nearest live enemy in
range and stopping for nothing while under way.

**The Deep Yard is *Baffle*'s plant, literally** — an emitter at (1500, 4500) at 1,640 m, SIG 35,
eight-second period, two seconds on, 900 hp, until 20:00 — and it is made *attendable* here,
which it was not there. Its entry is trivial: the second watch holds it at Track from 757 m
from the first tick, and §6 says so rather than pretending the count is difficult.

**Naming follows [culture.md](culture.md) §4.** Setha Korrin and Vehl Ossary carry
given-plus-cohort-line; Adze, the most modified, carries one name and is absent. Mara Tessen is
4th Trench Cohort, born 2,900 m ([habitats.md](habitats.md) §6). Dessa Vail and Brann Holt are
unhyphenated because neither is Board, which is most of what anyone needs to know about the
concern. The Picket-Speaker and the stalls have functions rather than names, which is the
register.

**Nobody is stupid and nobody is cruel** ([campaign.md](campaign.md) §2, rule 1). The convoy is
moving a compressor to forty-one people whose air arithmetic closes at 20:00 and has priced the
exposure honestly. The picket is attending closed water under a claim two centuries old. The
Cantorate is sounding a lie into water where a lie has never been sounded, and entering it as a
lie, in its own hand, before anybody asks.

---

## 6. The Count

**What enters is counted. What is heard is entered. And the picket's law — engage what stands
into a watch, or yield the water and count — is a choice made twice, once at each gate.**

*Baffle* §6 states the law from outside: the watches hold their water, announce themselves once
in the passive, and engage what stands into them. What that document could not say, because its
player never stood on this side of it, is the arithmetic. Here it is, and it is the mission:

- **The convoy fires first, and it fires whether or not the picket does.** Auto-acquire takes
  the nearest live enemy in range as soon as a hull stops moving. At 05:00 the flagship berths
  at (1500, 1350), **224 m from `watch-one`**; at 14:00 it stands at (1500, 3700), **112 m from
  `watch-three`**. A watch hull left in its seat is inside a Cruiser's gun and both Corvettes'.
- **A submersible under all three lives 3.6 seconds** — 520 HP against 143.3 a second, or 3.5
  against the 150.5 the flagship's Klaxon band buys it. Two watch hulls die in about seven.
- **Four watch hulls take the flagship in 6.7 seconds** — 177.8 a second against 1,200 HP — and
  spend the array's dome for thirty seconds doing it, and are two hulls fewer at the end.
- **A watch that yields is not heard at all.** Silent at 4.8 in trench water, the second watch
  reads 2.4 and 2.8 to the Cruiser in Lay-by Two at 750 and 678 m: Bearing and Classification,
  not Track. Four hundred metres further north it is nothing.

The law is therefore a law and not a lever. Standing is legal, correct in its own register, and
expensive; yielding is legal, correct in the same register, and free. The mission counts the
mouth at the whistle rather than during the gate, so a picket that withdraws at 14:00 and
re-forms across it after 17:00 has obeyed the law twice and lost nothing.

**The attend instrument, spent on two sounds that cost nothing to hear.** Two emitters carry a
`reading` and are therefore countable (`types.ts`, `MissionEmitter.reading`): the yard's plant
and `call-a`, at Track from 757 m and 400 m respectively. Attendance made attending hard by
putting the sound 4,100 m down an axis ([mission-attendance.md](mission-attendance.md) §6);
this mission makes it free, on purpose, because the difficulty was never the hearing:

- The plant is the concern's, the yard is not the inquiry's, and nobody asked the stalls to
  listen for it. Entering it is a decision to write down a thing that is none of the
  Undermarshalcy's business, and the gap line says so.
- The Call is the stalls' own voice. Entering it costs nothing acoustically and everything
  else: it is a line in the transcript that was written before it was heard, which in 126 years
  of collection has never happened, and the entry says in the Cantorate's own hand that there
  was no cohort at the foot.

The two `reading` pairs, authored, appended to the close in this order:

| Emitter | Entered | Gap |
| --- | --- | --- |
| `yard-plant` | "Entered: the yard's plant, missing its beat. Forty-one are on its complement and none of them is counted; the yard is not the inquiry's." | "Not entered: the plant. The yard is not the inquiry's and was not listened for." |
| `call-a` | "Entered: a cohort at the foot, six, bearing and depth. There was no cohort at the foot. The Call is entered as what it was, in the Cantorate's hand." | "Not entered: the Call. The stalls heard their own voice as nothing, which is correct and is also entered." |

The other five Call emitters carry no reading, so the count cannot be padded by hearing the
same lie six times.

**Nobody is wrong.** Ossary sounds a lie and makes it a liturgical fact in the same breath,
because the Cantorate's doctrine is that a society which thinks it has the answer starts
killing people and one that keeps a scrupulous record does not
([characters.md](characters.md)). Korrin would have preferred a question. She is right, and
says so to nobody.

---

## 7. What Is Heard

**Everything, from two ends of the same trench, and the two ends do not hear the same tide.**

- **The muster, through the layer.** The convoy idles at (1500, 300) at 1,000 m — above the
  duct's 1,100 m top — while the picket sits at 1,600 m, below its 1,300 m bottom, so the pair
  factor is 0.3 ([systems-echo.md](systems-echo.md) §3) and the staging is Thermal Vein at
  0.45. The path mean from the flagship to `watch-one` is **0.307** over 856 m and the first
  watch still holds an idling Cruiser at **Track** (ratio 6.3); through the same layer the
  second watch reads 0.95 and the array 0.56, which is **nothing at all**. The picket knows the
  convoy is coming and the Cantorate does not.
- **The dive, at 02:30.** The convoy drops to 1,600 m and the layer stops applying. `watch-one`
  reads it from 112 m. The array, 4,350 m south through a path averaging 1.53, reads it at
  **3.08 — Classification** — from the moment it enters. The dome is what makes that sentence
  true: at the Chorister's own 75 the same path is 2.4, which is Bearing.
- **The trench, clean, at PF 1.6.** An Abyssal Submersible at 85 hears a Cruiser cruising at 65
  from 8,416 m (Classification 4,747, Track 3,538), a Cruiser idling at 55 from 7,581, a
  Corvette at 28 from 4,972 (Classification 2,804) and the barge under way at 40 from 6,213.
  A Chorister at 95 hears the Cruiser from 9,022 and the plant at 35 from 6,127.
- **The concern's ears, pointed back.** A Cruiser at 65 hears a cruising submersible from
  4,204 m (Bearing 3,263, Classification 2,371, Track 1,768), an idle one from 3,616, a
  **silent one from only 1,402 m** and a firing one from 5,888 (Track 2,476). Silence is worth
  two and a half kilometres of the pipe.
- **The Call, from the concern's side.** From Lay-by Two at 13:30 the six read **1.33 to 1.66**
  at about two kilometres — three at Contact, three barely at Bearing, a smudge with a rhythm.
  From the mouth at 14:00, 1,301 to 1,504 m out, all six read **2.64 to 3.27: Classification**
  — six positioned contacts with a depth and no kind, arriving at exactly the moment the convoy
  is deciding whether the water south of the yard is empty. The window closes at 15:00, two
  minutes before the convoy's leg to the berth would have put it inside Track of a lie.
- **The plant, missing beats, since the first tick.** *Baffle*'s own clock, heard from the
  other side: the second watch has it at Track from 757 m, the array at Track from 950 m, and
  it stops at 20:00 because that is what failing means.
- **The concern's one transmission, at 14:30.** SIG 95 for three seconds. The array reads it at
  18 from 1,750 m; the second watch, if it is still in its seat, reads it at a ratio in four
  figures and is itself inside the 900 m Tier-4 reveal.
- **The pack, at 18:30.** Three Draymaws up the axis from the mouth, loud, ninety seconds in
  front of the whistle — *Baffle*'s three beats, inherited whole.
- **The basin, all tide, saying nothing.** The Sounder holds station at (2000, 5875) at 2,300 m
  and is ambient: the dome's 35 through 1.6 at 625 m reads **14.6** against an Interest of 55,
  and six idling Choristers read 4.3 to 9.0. It is the loudest silence on the map, and it is
  only silent because nobody has asked it anything.

No hazard sites, no seeded fauna, no weather. The corridor's weather is the convoy, and the
foot's weather is a decision the player has not made yet.

---

## 8. The Objective

**Attend the trench: stand across its mouth at the whistle, keep the picket, and enter what was
heard.**

Four objective rows, two of them terminal, stated as the format carries them (`types.ts`):

| Objective | Text | Predicate | Terminal |
| --- | --- | --- | --- |
| `the-mouth` | *The trench is closed while the inquiry is open. The mouth is attended at the whistle.* | `{ kind: 'extract', role: 'watch', region: 'the-mouth', count: 2 }` | **Yes.** Not a keystone. `revealAtTick` T(19), `markerId: 'mouth'` |
| `the-picket` | *Three of four attend. The Undermarshalcy does not round up.* — `debtText` *The picket owes the stalls a silence.* | `{ kind: 'survive', role: 'watch', count: 3 }` | **Yes.** Standing, re-derived every tick |
| `the-count` | *What enters is counted. What is heard is entered.* | `{ kind: 'attend', count: 2 }` | No. Read out, never ranked |
| `the-record` | *What is heard of the picket is entered elsewhere.* | `{ kind: 'tolerance', ticks: 180, tier: ResolutionTier.Track }` | No. Read out, never ranked |

`the-mouth` is revealed late, at T(19), with the stalls' beat sharing the tick. That is
Intake's roll idiom and it is load-bearing rather than decorative: an `extract` is not a
standing predicate, so it latches Met the first pass it is true and never un-latches
(`predicates.ts`, `isStanding`; `runtime.ts`, `deriveObjectives`). Revealed at 00:00 it would
be met at 00:00 by the second watch sitting in its own seat, and the mouth would be "attended"
by two hulls that were destroyed at 14:00. Revealed at 19:00 it asks the question the mission
means: *is the mouth attended at the whistle?*

`the-picket` is `survive` and therefore standing, which is the correction Intake made to the
runtime ([mission-intake.md](mission-intake.md) §13): it reads what is true now rather than
what was true at tick zero.

`the-record` is met when the concern has held the picket at Track for **180 sim ticks — three
seconds, the exact length of an active-sonar reveal** ([systems-echo.md](systems-echo.md) §5).
Meeting it is not success. It is the one place in the format where meeting a predicate is bad
news, and here it is neither good nor bad: it is a fact about somebody else's registry, and the
Directorate enters facts.

### Results

| Result | Condition | Korrin's reading |
| --- | --- | --- |
| **The mouth is attended** | `the-mouth` and `the-picket` | "The mouth was attended at the whistle and the picket is mustered. The trench remains closed. What the concern's plant did in closed water is entered, and what the stalls sounded is entered beside it, and the second entry is the first line since 88 PC that was written before it was heard." |
| **Sufficient** | One of the two | "Sufficient. The mouth was attended or the picket is mustered, and the other is entered as short. A closure is not a count of hulls, and the trench is closed either way." |
| **The trench is open** | Neither | "The mouth was not attended and the picket is not mustered. The trench is open until the next watch stands, and the inquiry enters the gap. It is not a failure of yours; it is a convoy against a law, and the convoy was louder." |

**Neither terminal row is a keystone, and the omission is the argument.** A picket that held the
mouth and lost two hulls and a picket that kept four and left the mouth open are read as the
same sentence, because the Directorate does not price bodies against ground and it would be the
first thing they were ever caught doing if it did
([mission-intake.md](mission-intake.md) §8).

Beneath whichever reading the run earns, the close appends, in this order: the sweep's
`filedReading`, if the concern's flagship classified the picket at a gate — *"The concern's
flagship classified the picket at a gate, and the concern's registry now carries the picket's
water under an asset number the picket did not give it."*; then `the-count`'s pair —
*"The count is entered: the plant, and the Call."* / *"The count is short. The stalls heard the
trench and wrote less than it said."*; then `the-record`'s — *"The concern had the picket at
Track — exact hull, hull state, facing — for the length of a transmission or a volley, which is
the count it came for, and the count is now in a registry that does not publish either."* /
*"The concern never had the picket at Track. Whatever it braced against, it did not resolve it,
and the registry has a bearing and a closed trench."*; then the two attendable emitters' own
lines, the plant's before the Call's.

### The failure, and the sounds that precede it

[campaign.md](campaign.md) §10 asks that no mission fail on a timer and that every failure be
audible sixty seconds out. All three failures here are audible for minutes:

- **The plant has been missing beats since the first tick** — *Baffle*'s clock, heard from the
  other side, at Track from the second watch's seat.
- **The convoy's guns are the loudest warning in the mission and they arrive twice.** A watch
  that stood into the second gate at 14:00 has been hearing its own hull come apart since
  14:00, at 143 a second, for a hundred and eighty seconds before the count is even revealed.
- **The pack rises through the mouth at 18:30**, loud, ninety seconds before the whistle, on
  the exact line the count is taken across.

The close at 20:00 is **not** a conclusion. The trench is still closed, the plant still fails,
and the count is read; but a picket can lose this mission, and a mission that can be lost is
resolved rather than concluded.

---

## 9. Length, SIG Budget, and the Beats

**Length: twenty minutes.** Inside [campaign.md](campaign.md) §10's 12–25, on the length band
[1140, 1260] s. It is *Baffle*'s twenty minutes, to the second, because it is the same tide.

**SIG budget: 28** — §4. **Silence ceiling 30 on `watch`, debt cap 30 s** — §4.

| Time | Beat |
| --- | --- |
| **00:00** | **Ossary opens with the formula; Korrin assigns the picket** (§12). Ten `silent` beats seat the four watch hulls and the six Choristers quiet, and the basin is placed at (2000, 5875) at 2,300 m — driven to its own spawn, `untilTick: 0`, so it is handed straight to its trigger model |
| 01:30 | Lift Foreman Dessa Vail, on the concern's open channel, heard down the trench because the picket hears everything (§12) |
| **02:30** | **The convoy dives into the trench.** Flagship to (1500, 1100) at 1,600 m, escorts flanking, barge trailing. The layer stops applying and the array at the foot has it at Classification from 4,350 m |
| **04:00** | **The Picket-Speaker states the law, once, in the passive** (§12). Nothing moves toward the convoy. Counting has begun |
| **05:00** | **The convoy stands at the first bend** (1500, 1350) — 224 m from `watch-one`. The first gate, 05:00–08:00, on the first watch's seat, and the sweep's first window |
| 08:30 | Into Lay-by One (1150, 1900) at 1,650 m — the concern's first quiet chamber |
| 10:00 | The second leg, (1500, 2900), tracked the whole way |
| 12:00 | **The stalls, sixty seconds ahead** (§12): the trench is to be sounded |
| **13:00** | **The Call opens.** Six emitters at the foot, `fromTick`, until 15:00. **Ossary speaks** (§12) |
| 13:00 | **The northern station goes off the chart** — a `lose` beat on `baffle-north`, and the Picket-Speaker's correction (§12). *Baffle* §7 from the hand that made it |
| 13:30 | Into Lay-by Two (1850, 3150) at 1,650 m. The Call reads as a smudge with a rhythm — three at Contact, three at Bearing |
| **14:00** | **The convoy stands at the mouth** (1500, 3700) — 112 m from `watch-three`. The second gate, 14:00–17:00, the sweep's second window, and the Call at Classification for the first time |
| **14:30** | **The flagship transmits.** One ping, SIG 95, three seconds — the writ's *"transmit once, late, and commit on what it returns"* ([mission-baffle.md](mission-baffle.md) §12), placed here rather than there (§13). Self-reveal 3,219 m at HYD 50 and 4,486 to the picket's 85: the whole trench south of the first bend is lit, and anything of the picket inside 900 m is at Track and in the concern's registry |
| 15:00 | The Call's window closes. Two minutes before the convoy's leg to the berth would have put it inside Track of it |
| **17:00** | **The convoy makes the yard** (1500, 4500) at 1,650 m. The mouth is free. The array, 950 m south, is fifty metres outside the Cruiser's gun |
| 17:30 | Yardmaster Brann Holt, on the yard channel (§12); Mara Tessen answers him from the freight galleries |
| **18:30** | **The pack.** Three Draymaws from (1450, 4000), (1550, 3950) and (1500, 4050) at 1,600 m, driven north up the axis to y 2,500–2,600 until 19:30, `loud: true` — the telegraph, ninety seconds in front of the close |
| **19:00** | **The stalls call the count** (§12) — and `the-mouth` is revealed at this tick |
| **20:00** | **The whistle.** The plant fails, the trench remains closed, the count is read. `resolve`, and not a conclusion (§8) |

**Conditional beats**, fired by a predicate rather than by the clock
(`types.ts`, `MissionConditionalBeat`; #282):

| Condition | Effect |
| --- | --- |
| `{ kind: 'tolerance', ticks: 60, tier: ResolutionTier.Track }` — one second at Track, in anybody's ears | **Korrin, once**: "The picket is in the concern's record at Track. Whether it was asked or shot at is not a distinction the registry keeps, and it is entered here as one." |

That line fires at whichever of three things the picket stood into first: the first gate at
05:00, the second at 14:00, or the concern's transmission at 14:30. It cannot be fired by the
*picket's own* ping — no predicate reads the player's own transmissions (§13) — so it is
authored to be true of a gate fight and of a transmission and of nothing else. The convoy's
transits are authored, not AI, for the standing reason
([mission-sorrowgate.md](mission-sorrowgate.md) §9): a mission's beats happen at the time the
document says they happen. The Call is why; the beats are when.

---

## 10. What It Teaches

One system, per [campaign.md](campaign.md) §10: **the Cantorate's instruments** — the dome, the
Call, and the ping — landing in order across the beat table. The dome is audibly worth
something inside the first three minutes: the array holds the convoy at Classification from
4,350 m at 02:30 and would hold it at Bearing without it. Its price arrives the first time a
watch hull fires. The Call is sounded at 13:00 and read by the concern at 13:30 and 14:00. The
ping is in the panel from tick zero and the mission never once asks for it.

Underneath it, the campaign's subject continued. Attendance taught that doing nothing is
sufficient. Intake taught that the living is loud and has to be walked to. **The Dome teaches
that a listener is worth exactly the honesty of the water it listens to** — and hands the
faction its two ways of making water dishonest on the same tide, one of which it calls a lie
and one of which it calls a question. Same detection maths, fourth life
([campaign.md](campaign.md) §2, rule 2): Attendance spent it on a god, Intake on a pay slip,
and this mission on a lie.

What this mission deliberately does not teach:

- **The shallow-water penalty** — mission 4, *Shallow*. The shallowest floor this map authors
  is the staging's 1,100 m, seven hundred metres under the Shelf line, and no hull the player
  owns leaves 1,600.
- **Fauna aggro and Biomass as an economy** — mission 5, *Trench Awakening*. One Sounder holds
  station here and one pack crosses; nothing is rendered, no cell is read out, and the Call's
  older cousin — a sound that summons rather than spoofs — is that mission's.
- **A dome that can be lost** — mission 6, *Conclave*. The Cantor here has 1,200 HP and stands
  a thousand metres outside every gun in the water; it is withdrawn by the ledger and never
  destroyed.
- **The ping as a thing the Directorate refuses** — mission 7, *First Arrival*, where it is
  locked at the rim with the reason *the rim is attended, not asked*. That lock costs nothing
  unless the player has already used the button, which is why it is handed over here.

---

## 11. The Map

`fourth-foot` · **The Fourth's Foot** · one seat · 3,000 × 6,000 m · cell 250 m · base floor
1,450 m.

**A new map, and it is *Baffle*'s chart a thousand metres longer.** Rows 2–8 of the table below
are `fourth-trench`'s regions to the metre ([mission-baffle.md](mission-baffle.md) §11;
`fourthTrench.ts`) — the same rectangles, biomes and floors — and row 1, the Margin, is the
same rectangle run a thousand metres further south. The last three rows paint the ground
*Baffle* never had a reason to draw: its margin's last 250 m becomes the head of the Fan, where
that chart ran out of paper rather than water. North is shallow and south is deep, as
everywhere in the Rift ([world-map.md](world-map.md)).

| Region | Rect (x, y, w, h) | Biome | Floor | What it is |
| --- | --- | --- | --- | --- |
| The Margin | 0, 0, 3000, 6000 | Open Water | 1,450 | The base water. Painted first; everything else is cut into it |
| The Staging | 0, 0, 3000, 750 | Thermal Vein | 1,100 | The north mouth — the grid's masked apron, above the layer's duct. The concern's muster |
| The West Wall | 0, 750, 1250, 3500 | Open Water | rock | Solid. The trench is the only road |
| The East Wall | 1750, 750, 1250, 3500 | Open Water | rock | Solid |
| The Trench | 1250, 750, 500, 3500 | Abyssal Trench | 1,700 | The shortcut. PF 1.6, no secrets down its length, only distances |
| Lay-by One | 1000, 1750, 250, 250 | Thermal Vein | 1,700 | The northern chartered pocket. `baffle-north` moors here |
| Lay-by Two | 1750, 3000, 250, 250 | Thermal Vein | 1,700 | The southern pocket. `baffle-south` |
| The Deep Yard | 750, 4250, 1500, 500 | Open Water | 1,650 | Berths, a failing plant, forty-one souls. The concern's, and not the inquiry's |
| The Fan | 0, 4750, 3000, 1250 | Abyssal Trench | 2,000 | Where the shortcut meets the deep: the trench opens and falls away. The Call is sounded here |
| The Foot | 750, 5250, 1500, 750 | Abyssal Trench | 2,400 | The last bench — the dome, the array, and what deep basins hold |
| The Freight Galleries | 2250, 5000, 750, 1000 | Coral Ruins | 2,900 | The 4th Trench Cohort's berths, cut into the fan's east wall. Tessen's water ([habitats.md](habitats.md) §6) |

One spawn, at the mouth: 1500, 4000 — irrelevant, since every party is seated directly, and
authored because a map needs one seat. **No resources, no hazard sites, and `fauna: false`**: a
closure mines nothing, and every animal here is a `creature` beat. Every rectangle lands on the
250 m cell grid and paints exactly the metres it reads ([maps.md](maps.md), "How a map is
written").

**Mission regions and markers.** One mission region, `the-mouth` — 1250, 3500, 500, 500, the
trench's last half-kilometre above the yard — and one marker, `mouth` at (1500, 3625) with a
375 m radius, shipped only while `the-mouth` is revealed. Its geometry is the whole objective:
a hull at (1500, 3550) is **950 m** from the berth and outside a Cruiser's gun, and one on the
region's southern edge is **500 m** from it and inside. The count is taken in the north half or
it is taken under fire, and the mission never says which half.

**Every seated hull's depth, checked against the floor it stands over and its own rating**
(Shelf 0–400 m is PR-1, Mid-Water 400–1,800 m PR-2, Abyssal 1,800 m and below PR-3):

| What | Where | Depth | Floor | Rating |
| --- | --- | --- | --- | --- |
| 4 Abyssal Submersibles | the trench, y 1,150–3,780 | 1,600 m | 1,700 | PR-3 against a required 2 |
| 6 Choristers | the Foot, (1300…1700, 5450) | 2,300 m | 2,400 | required 3; `pressureRating: 3` authored on the hull |
| 1 Cantor | the Foot, (1500, 5500) | 2,300 m | 2,400 | structures do not crush |
| Convoy, at the muster | the Staging | 1,000 m | 1,100 | PR-2 |
| Convoy, in the trench | the trench and the lay-bys | 1,600–1,650 m | 1,700 | PR-2 |
| 2 Baffle stations | the two lay-bys | 1,650 m | 1,700 | structures |
| `yard-plant` | the Deep Yard | 1,640 m | 1,650 | emitter |
| 6 Call emitters | the Fan, y 5,000–5,150 | 1,950 m | 2,000 | emitters |
| `the-basin`, a Sounder | the Foot, (2000, 5875) | 2,300 m | 2,400 | band 1,300–2,700 m ([bestiary.md](bestiary.md) §4) |
| 3 Draymaws | the trench, y 3,950–4,050 | 1,600 m spawn | 1,700 | *Baffle*'s literal (§13) |

**Why this ground argues the mission.** The trench is a pipe that carries at 1.6, so nothing in
it is ever out of a Cruiser's reach while the convoy passes, and each gate is a decision. The
two pockets at 0.45 are the only quiet water and both are the concern's. The yard is five
hundred metres of open water the convoy is going to. And the foot is the one place a dome can
stand outside the Ledger's chart *and* outside the convoy's guns, where a ping brings up the
deep's own answer and a lie can be sounded without anybody being able to shoot it.

**The ledger under the foot, stated because a reader will do the arithmetic.** Drift Health
cells are 750 × 1,500 m on a map this size, and the array straddles the boundary at x = 1,500:
three Choristers idling west of it sum 48 and wear nothing, while three east of it plus the
Cantor's own 35 sum **83** against a threshold of 60 and wear that cell at 0.46 a second
([bestiary.md](bestiary.md) §6). The one thing at the foot that damages the ground is the
Cantorate's instrument. The mission pays no Biomass and reads no cell, so it is a fact rather
than a price, and nobody is told.

**The Fourth's Foot is a mission map and is not in the public catalogue.** One seat, no
resources, not balanced, resolved by mission id and nothing else ([maps.md](maps.md)).

---

## 12. The Briefing

Two voices at the opening, in the order the rite fixes: the First Cantor's formula, then the
Undermarshal's assignment. The Directorate's register is defined in
[culture.md](culture.md) §3: passive, impersonal, structurally humble, and it does not shorten
its sentences.

**First Cantor Vehl Ossary, opening the dome — 00:00**

> The dome is open. The trench is attended. Nothing is expected of the picket but sufficiency,
> and sufficiency is not a small thing to be expected of.

**Undermarshal Setha Korrin, assigning the picket — 00:00**

> The Fourth is closed while the exchange inquiry is open, and has been closed for three tides.
> A relief convoy is at the north staging under a writ that has not been filed. It will enter
> the trench. What enters the trench is counted.
>
> Four hulls stand the two watches. They are seated where the watches have always been seated,
> and they are not required to move. A watch that is stood into may engage. A watch that yields
> the water and counts has also attended, and the record does not grade the two.
>
> Six of the cohort are at the foot, under the dome, and are not the picket. The array is
> lent — the Cantorate lends its ears and its ears are worth more to a Chorister than to
> anything the Undermarshalcy has ever built — and it is withdrawn while the picket is loud.
> That is written down. It has always been written down.
>
> The survey array is aboard and it is live. It is not sealed and it is not recommended. A
> transmission at the foot is a question put to water that has not been asked one, and what is
> in that water is not the Undermarshalcy's to describe.
>
> What is heard is entered. What is not heard is not entered, and the gap is entered too.
>
> Three of four attend. The Undermarshalcy does not round up.

### Objective readings, in play

The Directorate states conditions rather than issuing tasks, and every reading is in the
passive or the impersonal:

- *The trench is closed while the inquiry is open. The mouth is attended at the whistle.*
- *Three of four attend. The Undermarshalcy does not round up.*
- *The picket owes the stalls a silence.* (the `debtText` on `the-picket`, while debt stands)
- *What enters is counted. What is heard is entered.*
- *Entered: the yard's plant, missing its beat.*
- *Not entered: the Call. The stalls heard their own voice as nothing.*
- *What is heard of the picket is entered elsewhere.*

### The voices in the water

**Lift Foreman Dessa Vail, on the concern's open channel — 01:30**

> Hear that beat missing? That's forty-one people's plant asking where we are. I've rigged
> lifts for this concern for nineteen years and that is the first cargo that ever wrote back.

**Picket-Speaker, Fourth Trench Cohort — 04:00**

> The trench is closed while the inquiry is open. What enters it is not being threatened. It is
> being counted.

**The stalls, calling the sounding — 12:00**

> The trench is to be sounded. It will be heard as a cohort at the foot. The picket is not
> asked to move.

**First Cantor Vehl Ossary, as the Call opens — 13:00**

> It will be heard as a cohort. It is not one, and the record will say so, later, in the
> Cantorate's hand.

**Picket-Speaker, after the northern station — 13:00**

> A mooring was found in closed water. It was not in any charter. It has been corrected.

**Yardmaster Brann Holt, on the yard channel — 17:30**

> Yard to convoy: we can hear you. We have been able to hear you for ten minutes. Nobody down
> here is calling that a defect in the plan.

**Mara Tessen, 4th Trench Cohort, from the freight galleries — 17:30**

> The yard can hear us. It has always been able to. Nobody down here calls that a defect
> either.

**The stalls, calling the count — 19:00**

> The count is taken at the whistle. The mouth is attended from its north lip, and the plant is
> entered as it is.

**Undermarshal Setha Korrin, if the concern resolves the picket — on the tally, not the clock**

> The picket is in the concern's record at Track. Whether it was asked or shot at is not a
> distinction the registry keeps, and it is entered here as one.

**Undermarshal Setha Korrin, at the close — 20:00**

> The reading of the count, per §8, and then one sentence she should not say aloud and does:
> "The first thing those below have ever put into the water was a lie. I would have preferred
> it were a question."

**First Cantor Vehl Ossary, at the close — 20:00**

> *Nothing.* He is present the whole time, he opened the dome, he sounded the Call, and he does
> not speak at the count.

### The reading at the whistle

The close reads one of three, verbatim from §8, in Korrin's voice from Sufficiency, with the
sweep's filed line beneath it if the concern's flagship classified the picket at a gate, then
`the-count`'s reading and `the-record`'s, then the plant's entered-or-gap and the Call's.

| Outcome | Korrin's reading |
| --- | --- |
| **Complete** | "The mouth was attended at the whistle and the picket is mustered. The trench remains closed. What the concern's plant did in closed water is entered, and what the stalls sounded is entered beside it, and the second entry is the first line since 88 PC that was written before it was heard." |
| **Partial** | "Sufficient. The mouth was attended or the picket is mustered, and the other is entered as short. A closure is not a count of hulls, and the trench is closed either way." |
| **Lost** | "The mouth was not attended and the picket is not mustered. The trench is open until the next watch stands, and the inquiry enters the gap. It is not a failure of yours; it is a convoy against a law, and the convoy was louder." |

Each line fails [culture.md](culture.md) §3 for the other three factions, which is that
document's own test (§6). Ossary states that a thing is not what it will be heard as and makes
the correction a liturgical fact in the same breath, with no apology and no defence, which the
Knights could not do without courtesy and the Consortium would have to cost. Korrin's briefing
tells the picket it may fight and may decline and declines to prefer either, which the Commune
would phrase as an offer and the Consortium would call unfunded. The Picket-Speaker enforces a
closure in two sentences without once claiming agency. Tessen answers a Consortium reassurance
with a Directorate one that concedes nothing — the concern says *we can hear you and that is
the plan working*, and she says *we can hear you and that is what a band is*. Vail and Holt are
the concern pricing its own noise as the plan working, with nineteen years and forty-one berths
in the same breath and no sentiment in either.

**And Korrin's last is the third of them.** Attendance ended with "six thousand pages, and not
one of them a question"; Intake ended with "I have signed three of these; I know where all of
them are"; this one ends with a preference she is not entitled to have, spoken to nobody, about
a transmission the Cantorate made and she did not
([mission-attendance.md](mission-attendance.md) §12;
[mission-intake.md](mission-intake.md) §12). One sentence per mission, and the campaign spends
the fourth in *Shallow* and stops one clause short of the real one in *Conclave*.

---

## 13. Scaffold Status

What exists against this document and what does not, continuing the list
[mission-asset-recovery.md](mission-asset-recovery.md) §13 started. **This mission is specified
and not built.** It is the first Directorate document past the line
[mission-intake.md](mission-intake.md) drew, and its headline row is one of the four
superweapons: the Chorus Call is a sentence in [systems-echo.md](systems-echo.md) §8 and
nothing in `packages/`. The mission is fully playable without it, by the approximation the row
below states, and the row is written so a reviewer can tell the approximation from a request.

| Requirement | Status |
| --- | --- |
| The mission format — beats, predicates, registry, private rooms | **Built** (#190). `extract`, `survive`, `attend`, `tolerance`, and the `say`, `move`, `silent`, `ping`, `lose`, `creature` and `resolve` beats cover §8 and §9 entire; the conditional `say` on `tolerance` is Aptitude's and Exposure's row (#282) |
| **Chorus Call — a phantom army at a chosen point** | **Not built, and this document is the first to need it.** [systems-echo.md](systems-echo.md) §8 gives it one sentence — "emits a false SIG signature at a chosen map point, spoofing an entire phantom army; costs nothing but cooldown" — and there is no symbol for it anywhere in `packages/`. **The cheapest honest approximation is what §4 authors**: six `MissionEmitter`s on their own slot, SIG 16, six different periods, `fromTick` T(13) and `untilTick` T(15), sounded by the Cantorate on the world's clock. The player does not fire it, does not choose the point, and cannot decline it. What the format lacks is the same row [mission-convocation.md](mission-convocation.md) §13 asks for and this document does not ask for a second time: **one authored, once-per-match, player-fired effect with a point, a radius, a duration and a SIG cost.** Chorus Call's first honest realisation on that row is *N emitters at a chosen point for D seconds* — an `emit` effect a beat or a condition could fire, not a lock, since `MissionAbility` withholds and nothing in the format grants. Until it lands, the Call is the world's and not the player's, and §4 says so rather than implying otherwise |
| The ping, handed over | **Built** — `activeSonar` is simply not on the lock list, exactly as [mission-baffle.md](mission-baffle.md) §13 records for the Ledger's mission 3. Its self-reveal, its Tier-4 window and its tripled fauna aggro are core systems; this mission is the first Directorate one that does not lock the button |
| **A `say` fired by the player's own transmission** | **Not expressible, and not asked for.** No predicate reads what the player's own force has emitted: the union asks about position, hulls alive, emitters attended, soundings completed, the loudest hull, elapsed ticks, exposure, and the stockpile. §9's conditional line is therefore keyed on `tolerance` at Track — which fires on the first Track whoever caused it — and Korrin's text is authored to be true of a gate fight and of the concern's transmission alike. A genuine need would want a `transmit` predicate over the player's own pings, which is one row and is not this mission's to request |
| The convoy's one transmission, at 14:30 | **Built as a mechanism, authored here as a placement.** The `ping` beat sends a scripted hull through the same validated path a player's ping takes (SIG 95, 900 m reveal, 2,400 m self-reveal in open water). **`baffle.ts` authors no ping at all** — that document's writ hands the ping to the *Ledger's player* ("transmit once, late, and commit on what it returns", [mission-baffle.md](mission-baffle.md) §12) — so 14:30 is this document placing the writ's own advice on the world's clock, and it is stated rather than presented as *Baffle*'s time |
| The armed scripted convoy that shoots the picket | **Built and load-bearing.** Hostility is `Owner.slot`, both sides are authored `armed`, and auto-acquire takes the nearest live enemy in range as soon as a hull stops moving — a silent hull holds its fire and is shot at anyway. §6's whole argument is that arithmetic. What §6 also needs is that a *stationary* hull acquires and a travelling one does not, which is why the gate fights begin when the convoy berths at 05:00 and 14:00 rather than as it passes |
| Guns and emitters | **Built, and worth stating exactly.** Auto-acquire skips a `StaticEmitter` for the mine's reason — between strikes it sits at SIG 0 and a gun swinging onto it would be shooting something it never heard — but an *ordered* shot at a resolved emitter still lands. So the Call is not unshootable; it is 5,000 hp of it, which at a Cruiser's 60 a second is eighty-three seconds against a two-minute window, in water the convoy never enters. The plant's 900 hp is *Baffle*'s and is likewise only safe from auto-acquire |
| The dome's aura, and the silence ledger that withdraws it | **Built.** `STRUCTURE_AURAS.CANTOR` is +25 HYD capped at 95 within 1,200 m; `arrayTag` names a Cantor on the player's party and the ledger points its `grantSlot` at `courtSlot` while `debtS > 0`. `silenceRole: 'watch'` at ceiling 30 with a 30 s cap is Attendance's mechanism with a different number and, for the first time, a role that is not the one being helped: the guns that owe the debt are not the hulls that lose the ears |
| Ten hulls seated under Silent Running | **Built** — `silent` beats at `atTick: 0`, which is Sorrowgate's idiom for Kalliso's approach used on the player's own force. It is also what makes §3's "armed and quiet" honest: the auto-acquire path refuses a silent hull, so a picket that never drops silence never fires |
| Choristers below 1,800 m carrying `pressureRating: 3` | **Built, and a finding to record.** `missions.test.ts` reads `unit.pressureRating ?? statsFor(kind).pressureRating` against `requiredPressureRating(depthM)` — the *hull's* rating, not `effectivePressureRating` — so the Directorate's PR-3 faction baseline does not rescue a PR-2 Chorister authored at 2,300 m and the refit must be written on every one of the six. Correct as a test (a literal should not lean on a baseline it never states) and worth naming, because every Directorate document that fields Choristers below the Abyssal line will write the same six words |
| A friendly scripted Directorate party with hulls | **Not built, and correctly so.** Hostility is `Owner.slot` and auto-acquire fires on any other slot in range, so a second Directorate party with hulls in it would be shot by the picket. The Call's slot therefore holds sounds and nothing else, which is also the truer reading: a Chorus Call is not a cohort |
| The thermocline between the muster and the trench | **Built** — `THERMOCLINE_PAIR_FACTOR` is 0.3 across the layer, applied per emitter–listener pair from the two depths. The convoy is seated at 1,000 m over the staging's 1,100 m floor — above the duct's top — and the picket at 1,600 m in the trench, below its bottom, so §7's 0.307 path mean and the first watch's Track at 856 m are the shipped model and not a special case |
| Silent Running's actual loudness | **Built, and a figure this document corrects.** `silentRunningSig` places a hull in the 3–8 band by its idle SIG: an Abyssal Submersible at idle 22 is **4.83**, a Chorister at idle 16 is **4.33**. Eight is `SILENT_RUNNING.SIG_MAX` and the curve reaches it only at an idle of 60, so §6 and §7 price a silent picket at 4.8 rather than 8, which costs it about five hundred metres of the Cruiser's contact range and is the difference between Classification and Track at Lay-by Two ([mission-radicals.md](mission-radicals.md) §13 records the same finding for the Commune's hulls) |
| *Baffle*'s seats, plant, pack and clock, inherited literally | **A decision, not a build.** Every position, period, hp and tick in §5 and §9 that *Baffle* authors is `baffle.ts`'s, unchanged, so a reader can hold the two documents side by side and find no seam. The one place that inheritance carries a wart is the pack: `driveTo` with no `depthM` leaves a driven creature climbing toward its species' 900 m at the Drift's vertical speed, so *Baffle*'s Draymaws spawned at 1,600 m rise as they run the axis. That is *Baffle*'s literal as it stands. It is inherited and not corrected, because a document that quietly fixed another mission's water would break the seam it exists to keep |
| The sweep over the concern's flagship | **Built** — `MissionSweep` resolves scripted-party hearing over the player's hulls inside authored windows, with the directional term, the layer and the path integral, and appends one latched `filedReading` to whatever epilogue the count earned. Two windows, 05:00–08:00 and 14:00–17:00, which are the two gates |
| The `lose` beat on a scripted party's structure | **Built.** `lose` zeroes the tagged entity's hull whoever owns it; *Baffle* spends it on the same station from the player's side. Here it is the correction the picket makes, and the picket is the player, which is the sentence §6 is built to earn |
| The placed-and-not-driven Sounder | **Built, by Intake's idiom** — `driveTo` at the creature's own spawn with `untilTick: 0`, so the first pass finds the commitment expired and hands the animal to its own trigger model. It has never been used on a Sounder before; the ladder answers ratios rather than raw loudness, so the ambient reading of 14.6 against an Interest of 55 in §7 is the shipped model and not an authored quiet |
| `move` beats carrying a depth | **Built** — the `move` effect's optional `depthM` issues a depth order alongside the move, which is what lets the scripted convoy dive into the trench at 02:30 rather than skating over it at 1,000 m |
| `attend` over exactly two attendable emitters | **Built** — `attend` counts emitters carrying a `reading` that this observer resolved at Bearing or better *while they were sounding*, and the test bounds `count` by the number of emitters that carry one. Two carry one here and the count is two, which means the row is met by a picket that hears both and by nobody else |
| The map, eleven regions, seven of them another mission's to the metre | **Not built.** `fourth-foot` is one row of the literal per row of §11's table, in the document's paint order; rows 2–8 are `fourthTrench.ts`'s unchanged and row 1 is its Margin run a thousand metres south. No new region shape, no new biome, no hazard site and no resource node |
| The mission definition `attending-the-dome` | **Not built.** Five parties and a court slot; ten player hulls in two roles plus one structure; `sigBudget: 28`, `arrayTag: 'dome'`, `silenceRole: 'watch'`, `silenceCeilingSig: 30`, `debtCapS: 30`, `escortRadiusM: 0`, `fauna: false`, no `startingNodules` and no `runsItsLength`; §9's beats in its order, closing at 20:00 with the loud pack ninety seconds ahead of it; §8's three readings verbatim |
| Cross-mission Drift Health | **Not built** — nothing carries a map's damage to the next mission on it, which is [campaign.md](campaign.md) §2 rule 5 unspent everywhere. §11 states what this mission would leave behind and reads no cell |
| Campaign progression | **Not built** — the standing row every campaign document leans on and none owns ([mission-item-nine.md](mission-item-nine.md) §13). Nothing records that the picket has been handed the ping, so *First Arrival*'s lock at the rim is a sentence rather than a memory |
| In-mission character speech, heard | Text only, the standing status ([mission-sorrowgate.md](mission-sorrowgate.md) §13) |
| The mix — a pipe from the counting end, and six voices that are not there | Not started ([audio-direction.md](audio-direction.md)). §7's two-ended trench and the Call's six periods beating against each other are the half of this mission that exists only in prose |

### One question this document does not settle

**Whether the Call should ever be the player's.** This document makes it the world's, on the
world's clock, and gets a good mission out of it: the stalls sound it, the player hears their
own side lie, and the only decision left is whether to write it down. The alternative —
Chorus Call as a once-per-match button with a point, a radius, a duration and a SIG cost — is
the row [mission-convocation.md](mission-convocation.md) §13 opened for Marr's Convocation, and
whoever builds it will have two missions asking for the same mechanism with different
consequences hung off it. The call belongs to that pull request and not to this document, which
is why §4 prices the Call as a thing that happens rather than as a thing that is spent.

---

## Related

- **[campaign.md](campaign.md)** — §6, whose third row this specifies; §2 and §10, whose rules it is written under, including the mission-3 ping
- **[mission-baffle.md](mission-baffle.md)** — the same tide from the convoy's side: every seat, both stations, the plant, the pack, the two gates, and the writ whose one transmission this document places
- **[mission-attendance.md](mission-attendance.md)** — the dome by its own name, the written silence-debt, the return at SIG 3 the phantom's 16 is shaped from, and Ossary's formula
- **[mission-intake.md](mission-intake.md)** — the Chorister in the roster and not fielded, the ×0.4 the Drift hears this faction at, and the roll's late reveal this mission's count borrows
- **[mission-sorrowgate.md](mission-sorrowgate.md)** — the pattern, and the one emission that went wrong in front of the observer who closed this trench
- **[mission-shallow.md](mission-shallow.md)** — The Attending 4, where the Chorister is fielded above the line and the ping is useless
- **[mission-trench-awakening.md](mission-trench-awakening.md)** — The Attending 5, where a sound summons instead of spoofing, and the Sounder at the foot is its older cousin
- **[mission-conclave-attending.md](mission-conclave-attending.md)** — The Attending 6, where Ossary speaks once and says nothing at the close, and a dome can be lost
- **[mission-first-arrival.md](mission-first-arrival.md)** — The Attending 7, where the ping is locked at the lip and this mission is what the lock costs
- **[systems-echo.md](systems-echo.md)** — §3, the trench and the layer; §4, the tier a transcript is written at; §5, the button handed over here; §8, the Chorus Call this document approximates
- **[systems-depth.md](systems-depth.md)** — §2, the fast loud descent the convoy makes at 02:30 and the slow silent climb the pack makes at 18:30
- **[bestiary.md](bestiary.md)** — §2, the aggro ladder, the ×0.4 and the ping's ×3; §4, the Sounder's band and the Draymaw's; §6, the ledger under the foot
- **[units.md](units.md)** — the Abyssal Submersible, the Chorister, the Cantor, and the Baffle Barge on the other side of the water
- **[factions.md](factions.md)** — the Listeners, the Klaxon, and the doctrine the Chorus Call belongs to
- **[habitats.md](habitats.md)** — §6, Sufficiency, the shallow band, and Mara Tessen's freight galleries where the Fourth meets the deep
- **[world-map.md](world-map.md)** — the Fourth Trench, claimed twice and patrolled once, and the deep it runs into
- **[culture.md](culture.md)** — §1, transmitting as lying and asking as a thing this faction does not do; §3, the register that may not explain; §5, the written silence-debt
- **[characters.md](characters.md)** — Korrin, Ossary, and the civil war conducted entirely in polite liturgical language
- **[timeline.md](timeline.md)** — 88 PC, where the collection began, and the tide three tides ago that closed this trench
- **[maps.md](maps.md)** — how a mission map is written, and why this one is not in the catalogue
- **[glossary.md](glossary.md)** — mission outcome, silence order, and active sonar
