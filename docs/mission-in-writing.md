# The Second Seeding 5 — In Writing

> The fifth mission of the Commune campaign ([campaign.md](campaign.md) §5), specified and
> built. One of the fourteen documents that complete the bible's campaign, written to the
> pattern [mission-sorrowgate.md](mission-sorrowgate.md) sets and the Commune documents
> continue: everything here is authored — the forces, the water, the beats, the numbers and
> the text — and code transcribes this document.

**Setting:** the Furrow, the cleft under Anholt's terrace where the scar branches beneath the
north shoulder, 214 PC, three tides after *Deep Furrow*
([mission-deep-furrow.md](mission-deep-furrow.md) §1; [world-map.md](world-map.md);
[timeline.md](timeline.md)).

**Mission id:** `seeding-in-writing` — namespaced by campaign after `seeding-deep-furrow`, per
[campaign.md](campaign.md) §1.

**This is the first mission in which the Commune's own structure stands in the water, and the
first in the campaign in which the player's guns are struck by the player's own side.** The
Spore Veil has been a sentence in [factions.md](factions.md) and a row of `STRUCTURE_AURAS`
since the auras were built; nobody has fielded one. Three stand here, grown over two furrows
in the tides since the last mission, with the households under them. Teel's three corvettes
are under the eastern one with their guns locked by her own word — the court struck the
prologue's hardpoints, and nobody has struck the Commune's own before. §3 prices both.

---

## 1. What the Letter Is

In 205 PC the Undermarshalcy stated, in writing, that a second seeding constitutes an act of
war ([timeline.md](timeline.md)). The same entry says the Commune filed the letter, and a
plateau keeps no files, because nothing on a plateau stays dry ([habitats.md](habitats.md)
§2). The letter is in the seed-store at Anholt, the one dry room on the terrace, nine years
beside the thing it is about. The Directorate wrote it down so that it would be kept
somewhere. It was.

Three tides ago the programme sowed a second furrow at 2,200 m under a Directorate observer
that had attended the cleft since the letter, heard the sowing at Track from 884 m, and went
below to say so ([mission-deep-furrow.md](mission-deep-furrow.md) §6). The tide after, a
listening dome was raised at the first furrow's north edge. Nobody on the plateau heard it
commissioned — the furrow is under the layer, and *Deep Furrow*'s thesis holds in both
documents ([systems-echo.md](systems-echo.md) §3). What heard it was the watch at the cleft's
mouth, above the layer, 1,500 m off: a site broadcasts at 70 ([units.md](units.md)), and 70
through that line's own path mean — five cells of cleft and one of the Foot the mouth opens
into, 1.5, not the
cleft's 1.6 (§7) — and the layer's 0.3 is Classification to a scout's 70 out to 1,993 m. The
plateau knew what a building is for before the cohort it was for arrived.

Three facts about that water decide the mission, and none of them is a fence.

**The dome's ears cover the whole garden, and a bed is a hole in them 350 m across.** A
Cantor lends every allied hull within 1,200 m its own listening — HYD +25, capped at 95 —
and the dome at 2000, 1750 covers everything from the throat to the sill's head
([units.md](units.md); `STRUCTURE_AURAS.CANTOR`). Under a Spore Veil everything within 350 m
emits at ×0.4 and hears at HYD 5, friend and foe alike, applied after the dome's grant so
that inside it even a Listener's ears are moss (`auras.ts`). The mission is the arithmetic
of a garden deaf and quiet in patches, under a roof that hears everything else.

**The layer is the way out, and the doorway is held at the layer.** The thermocline sits at
1,200 m across the cleft's upper water. A hull that climbs past the throat and through the
duct is across the layer from everything in the garden, and above it is the first water the
plateau can hear again. The cohort knows this as well as the plateau does, which is why its
two Submersibles hold the throat *in the duct*, where the layer hides nothing from them (§6).

**The cleft is the only road, and it is 1,500 m wide.** The furrows are kelp-quiet at 0.55
and the cleft is trench-loud at 1.6, so a hull is three times as audible the metre it leaves
the garden. A Hollow sits on each wall. The middle is 650 m from either.

Nobody in the furrow says any of this. It is the ground the mission stands on.

---

## 2. Whose Hulls the Player Commands

**The player commands the furrow's people: three tenders with sixteen aboard, the programme's
two deep-rated scouts, and Warden Juno Teel's three corvettes, struck.**

The households that stayed below in *Deep Furrow* are the ones here — the sixteen, by
household, in the same three hulls ([mission-deep-furrow.md](mission-deep-furrow.md) §3). They
came up off the garden floor to the top of the furrow's water when the site was heard,
because a hull that may have to leave should not start its climb from 2,200 m, and the beds
were grown over them there. The watch is the two prototype scouts refit in 204 PC for the
proof — the pair *Prospect* seats on the rim ([mission-prospect.md](mission-prospect.md) §5).
Teel's element is present because Juno brought it down with the families when the dome was
heard, and nobody voted; it is struck because nothing is struck under a bed, and she has
never struck first ([characters.md](characters.md)).

Tidespeaker Ysolde Marr speaks the briefing on the lane at the cleft's mouth, to the watch
going down to carry it, because the furrow cannot hear her. She reads the count at the close
when the watch brings it up. She orders nobody to do anything.

**Engine bound, stated so nobody corrects it into a bug.** Two parties and a court slot:
the furrow's people carry the Commune faction value, the Second Trench Cohort carries the
Directorate's, and the court slot is reserved and empty, as every literal reserves it. The
Drift is not a party. The map literal is `anholt-furrow`, *Deep Furrow*'s, unchanged (§11).

---

## 3. The Furrow's People

| Hull | Count | Stats | Why |
| --- | --- | --- | --- |
| Tender — the households | 3 | Harvester hull, Commune-grown · SIG 18 idle / 40 cruise, **4.5 silent** · HYD 30 · PR-2 · 300 HP · speed 40, 32 silent ([units.md](units.md); `SILENT_RUNNING`) | The count. Souls **5, 7 and 4** — sixteen, the households that stayed at 2,200 m three tides ago, seated now at 1,790 m under the beds. Deaf below the mark-reading floor, so the watch is their ears |
| Light Scout — the watch | 2 | SIG 6 idle / 12 cruise, 3.5 silent · **HYD 70** · **PR-3 by refit** · 180 HP · speed 120 | The proof hulls of 204 PC. Inside a bed they hear at 5; outside one they are the best ears the plateau owns, and the only ones on the map not under a cloud. Souls 2 apiece |
| Corvette — Teel's element | 3 | SIG 28 idle and cruise, 5.3 silent · HYD 50 · PR-2 · 420 HP · gun 550 m, **locked** | Present because Juno brought them and nobody voted; struck because nothing is struck under a bed. The loudest hulls in the garden by a factor of six if they forget to be silent (§7). Souls 4 apiece |
| Spore Veil — the beds | 3 | SIG 20 idle, **8 veiled by its own cloud** · HYD 30, 5 inside · 900 HP · radius 350 m: everything inside emits ×0.4 and hears at HYD 5, symmetric ([units.md](units.md); `STRUCTURE_AURAS.SPORE_VEIL`) | `bed-west` 1500, 2125 · `bed-mid` 2000, 2200 · `bed-east` 2500, 2125, all at 1,790 m — three clouds 500 m apart whose radii overlap into one band across the furrows' 1,500 m. Grown in the tides between, placed at their true depth, and lost on the clock (§6, §9) |

**The seat is 1,790 m, and the number is chosen against the ruleset.** `requiredPressureRating`
turns over at the 1,800 m band line, so a PR-2 hull owns 1,790 m for nothing: no refit, no
crush, and no zone under it. The veil's cloud is horizontal — `auras.ts` tests `Math.hypot`
on x and y — so a hull at 1,790 m within 350 m of a bed's centre is veiled exactly as one on
the 2,200 m floor would be. §13 states what it drops: both Spire-kind approximations *Deep
Furrow* had to carry, which a hiding mission cannot, because a Sounding Spire hums at SIG 80
whenever a hull under it is below its rating.

### What the force does not carry

1. **Weapons, struck — by the player's own side.** Every corvette's fire control is locked,
   with the reason in register: *struck — nothing is struck under a bed, and Juno has never
   struck first*. Torpedoes, mines, depth charges and noisemakers are locked with the one
   word *struck*. *Thin Water* grew two guns and spent them
   ([mission-thin-water.md](mission-thin-water.md) §3); this is Teel's line held from the
   inside, and §12 gives her one sentence about it.
2. **No construction.** *Nothing is built under a dome.* A site broadcasts at 70 for its
   whole build ([units.md](units.md)), the one thing the dome could not fail to hear.
3. **No throttle, no harvest, no economy.** Nothing accrues, and nothing is counted but
   people.

**Active sonar is available, and it is a button with exactly one use.** A ping under a bed is
95 × 0.4 = 38 through kelp, Bearing to the dome-lent 95 out to 2,568 m — from every bed to
every ear on the map — and the one thing it does is tell the dome which bed the pinger is
under. There is nothing here the player needs Tier 4 on: the dome is audible from every
metre of the garden a hull is not veiled in, and the Choristers announce themselves by
walking.

**Silent Running is present, and this is the mission where it is the whole posture.** The
veil multiplies; it does not replace. A tender idling at the roster's 18 reads 7.2 under a
bed; one running silent at 4.5 reads 1.8; and the dome — a listener at 80 in its own right,
450 m from the middle bed's centre — has the first at Classification and the second at
nothing at all, ratio 0.97 (§7).
Every hull is authored silent at 00:00, silence stops no work because there is none, and it
costs the Commune the difference between 40 m/s and 32. What the player does with the toggle
is the mission's whole account of them.

---

## 4. The Bed

The system this mission teaches, per [campaign.md](campaign.md) §2: one system, introduced
in the first three minutes, load-bearing by the last five. The system is **the Spore Veil
against the best listeners in the game**, and it lands in four movements.

**1. A bed is a hole in a dome's ears, and it is horizontal.** At 00:00 the dome is audible
from every metre of the furrow a hull is not veiled in — 35 through kelp is Tier 1 to a
scout's 70 from 2,597 m and to a tender's 30 from 1,529, and to ears blinded to 5 inside a
cloud only from 499 — and the player's hulls are inside three clouds the dome's ears do not
reach. A bed's own hum is 20, veiled by its own cloud to 8, and every ear in the cohort has
it: the dome, 450 m from the middle bed and 625 m from the other two through the garden's own
0.55, has the middle bed at Track (ratio 4.32) and the outer pair at Classification (2.55);
the doorway, 1,125 m from the outer beds through a path mean of 1.18 and 1,300 m from the
middle through 1.25, has the outer pair at Classification (2.54) and the middle at Bearing
(2.13) (§7). What none of them has is anything silent under any of them. The cloud covers a
column of water 350 m across from the surface to the floor, which is why nothing under a bed
can be found by looking down.

**2. Inside the cloud everyone is deaf and quiet, and it is the same everyone.** The veil is
the one symmetric aura the game has ([systems-echo.md](systems-echo.md) §8). At 03:00 the
cohort's line of eight walks north across the beds, and inside a cloud a Chorister with the
dome's 95 hears at 5: nothing at all on a silent tender, whose 1.8 does not reach Contact
even at the reference distance, Contact on a tender idling at 18 inside 186 m and Bearing
inside 144, nothing beyond. The Commune's
doctrine is that it already works silent and blind ([units.md](units.md)); this is the
mission where the other side has to.

**3. The veil is a multiplier, so silence is still the posture.** 7.2 against 1.8 (§3). A
corvette that forgets to be silent under a bed is 28 × 0.4 = 11.2 — Classification to the
throat's 95 at 1,125 m through the bed-to-duct path mean of 1.18 (ratio 3.55), and
Classification to the dome's own 80 through the garden's 0.55 from where the eastern bed
stands (ratio 3.57 at 625 m). The bed hides a hull that is already hiding. It does not hide
one that is not.

**4. Hiding is a schedule.** The dome has the beds — the middle one at Track, the outer two
at Classification — the line finds each one by walking into it, and the beds are corrected
as a mooring was corrected in closed water
([mission-baffle.md](mission-baffle.md) §7) — the west at 09:00, the middle at 12:00, the
east at 15:00. What is under a dead bed is at its own figure: a silent tender at 4.5 through
kelp is Bearing to 95 at 677 m and Classification at 492; one idling at 18 is Bearing at 1,610
and Classification at 1,170. The doorway is held from 00:00 to 12:00 and from 15:00, and
between those the Submersibles are in the garden's dead water with their guns. Everything
moved in the beds' gaps, timed to the sweep, and got over the layer before 15:00 is the
count. Everything still under the last bed at 15:00 is in the cohort's water at 16:00.

### The SIG budget

**SIG budget: 8** — `SILENT_RUNNING.SIG_MAX`, the loudest a hull running silent can be. A
description of the posture rather than a ceiling: a silent tender is 4.5, a silent corvette
5.3, a silent scout 3.5, and every hull is authored under it at 00:00. It is playtested, per
[campaign.md](campaign.md) §10, against the player who exceeds it — by moving at 40 instead
of 32 with a Chorister inside 144 m, by running a corvette at 28 under a bed the dome can
hear, or by pinging — and the price is never a hull directly. It is a name in a letter, and
then a gun.

---

## 5. The Parties

| Party | Force | Posture |
| --- | --- | --- |
| **The furrow's people** — the player | 3 tenders, 2 watch scouts, 3 corvettes struck, 3 beds | Under the beds at 1,790 m, silent |
| **The Second Trench Cohort** — those below | 1 Cantor, 2 Abyssal Submersibles armed, 8 Choristers cold | Attending the furrow. The dome at the garden's north edge, the Submersibles in the duct at the throat, the line seated silent in the sill |
| **Warden Juno Teel** | Three corvettes nobody voted for | Under the eastern bed, with the families, struck by her own word |
| **The Drift** | Two wall Hollows, three jelly clusters in the duct, a Draymaw pack in the lanes; one Sounder from 14:30 | The water *Deep Furrow* placed, in the same places, and one thing that answers a cohort's noise the way it answers everyone's |

Naming follows [culture.md](culture.md) §4. Marr, Anholt and Teel are plateau names carried
by the people who tend them. The cohort is written the way *Baffle*'s picket and *Standing
Wave*'s column were written: it speaks through a **Band-Speaker** and no person is named,
because a cohort is named for its band and the band is the Second's — 2,200 m — a claim
about depth of birth and not about where the Second Trench is. The trenches are southern
places counted downward from the First at 1,800 m ([world-map.md](world-map.md) §3), and this
cohort has been posted north of any of them since the letter of 205, to attend what the
letter named. No Directorate document has yet fielded it. The watch is *the watch*, as in
every Commune document. The letter is quoted in the briefing in the Undermarshalcy's own
register, and nobody in the mission answers it in kind.

---

## 6. The Cohort

**The letter arrives as hulls: a dome that hears the garden, a doorway held at the layer,
and a line that walks the beds and counts. Nothing pursues, and nobody in the cohort has to
be cruel for the furrow to be lost.**

| Element | Seat | Numbers | What it does |
| --- | --- | --- | --- |
| `the-dome` — a Cantor | 2000, 1750 at 2,000 m, the first furrow's north edge | SIG 35 · HYD 80 · 1,200 HP · +25 HYD to the cohort within 1,200 m, cap 95 ([units.md](units.md)) | Stands. 450 m from the middle bed and 625 from the others — outside every cloud, so its ears are its own. Its radius covers y 550–2,950: the throat, both furrows, the sill's head. It has the middle bed at Track by its own 8 (ratio 4.32 at 450 m) and the outer two at Classification (2.55 at 625 m), and has since it was commissioned |
| `throat-west`, `throat-east` — Abyssal Submersibles | 1500, 1000 and 2500, 1000 **at 1,200 m, in the duct** | SIG 22 idle / 28 cruise · HYD 85, **95 under the dome** · PR-3 · 520 HP · gun 80 at 650 m, 1.8 s · **armed** | Hold the doorway from 00:00. From the duct a Listener hears both halves of the water at 1.0 and the duct itself at 1.2 ([systems-echo.md](systems-echo.md) §3): a silent tender in the cleft at 4.5 × 1.6 is Track to 95 inside 715 m and Classification inside 959, so the throat's middle (500 m from either) and its walls (250 m from one) are Track at every depth a hull can pass at. At 12:00 they leave for the garden's dead water; at 15:00 they come back |
| `cohort-1` … `cohort-8` — Choristers | The sill, y 2,700, x 1,350 to 2,650 at 186 m spacing, at 2,400 m | SIG 16 idle / 24 cruise, 4.3 silent · HYD 75, **95 under the dome** · PR-2 hull, **`pressureRating: 3` authored** · 200 HP · 50 m hulls a Sounder ignores · **weapons-cold** | Seated silent. Rise silent at 02:00; walk the garden from 03:00 on the legs of §9. Inside a cloud each hears at 5; outside one, at 95. They count. They do not fire, and the reason is a finding rather than mercy |

**Why the Choristers are cold, stated so nobody arms them.** The roster's fire control is
tier-blind: a gun auto-acquires the nearest live enemy inside its range in three dimensions,
heard or not (`combat.ts`, "in range implies heard") — and a structure is a live enemy. A
Chorister standing inside a bed's cloud 90 m from its centre has the bed 270 m inside its
450 m reach at the 360 m depth difference, and an armed line would have every bed on this
map down on its first stationary pass at about 04:55, at 20 hull a second per gun against
900. The beds' schedule would belong to the guns, and the veil would be no cover from the one
thing it is fielded against. So the line walks cold, the beds die by the clock, and every gun
in the cohort is at the doorway. The plan for this mission armed the line; §13 records it.

**The doorway, priced by the gun rather than by the ear.** A gun at 1,200 m reaches 650 m in
three dimensions: at the throat's middle, 500 m from either hull, that is depths 785–1,615 m;
at a wall, 250 m from one, 600–1,800. A hull crossing at 1,790 m down the middle is 773 m
from either gun and is not shot; it is Track. A hull that climbs first and crosses at 500 m
is not shot; it is Track. A hull that climbs *while* it crosses, through the duct, is inside
a sphere for the whole climb. Two guns cannot close a doorway 1,500 m wide and 1,650 m tall,
and this document does not claim they do. What they close is the layer, and what the layer
closes is being unheard: from the duct every crossing is entered (§8), and the only unentered
crossing is the one made while the duct is empty.

**The dead water.** At 12:00 both Submersibles dive from the duct to 2,100 m — 900 m at
45 m/s, twenty seconds at a SIG floor of 72, which every hull in the cleft hears — and take
station under the two beds that have gone dark: `throat-west` at 1500, 2000, `throat-east` at
2000, 2000. On a hull at 1,790 m a gun at 2,100 reaches 571 m horizontally, and between them
that is every metre of the furrows west of x ≈ 2,557 at the beds' row: the whole garden but
the eastern bed's far side, a strip some 200 m wide against the east wall. A hull still under
the west or middle bed at 12:20 is inside a sphere, veiled or not, silent or not, and a tender
at 300 hull against 80 every 1.8 s has seven seconds. At 15:00 the guns are ordered back to the
duct — a silent climb of sixty seconds — and the doorway closes from the floor up.

**The law, stated once.** At 02:00 the Band-Speaker restates the sentence of 205 in the band
and the cohort's procedure in the passive: the beds are corrected as a mooring was corrected
in closed water; what stands into the doorway is engaged; nothing pursues. The transits are
authored per [mission-sorrowgate.md](mission-sorrowgate.md) §9 and the guns are the roster's
fire control on what comes inside their reach, so nobody in the cohort decides anything
after 02:00. They wrote a sentence in 205 and they are people who keep sentences.

**The Drift, placed and not driven.** `fauna: false`, and every creature is *Deep Furrow*'s in
*Deep Furrow*'s places: `hollow-west` at 1350, 1000 and `hollow-east` at 2650, 1000 at 1,700 m
on the walls; three Tetherjelly clusters at 1500, 900 / 2000, 700 / 2500, 900 at 1,200 m in
the duct, −0.10 PF each within 250 m; the Draymaw pack `lanes-pack` at 500, 250 at 900 m. A
Hollow coils at Interest and strikes at Commit only within 500 m in three dimensions
([bestiary.md](bestiary.md) §4): against a silent tender at 4.5 through 1.6 it strikes inside
107 m and coils from 141, against one idling at 18 inside 255 m, against a Chorister at 24 ×
0.4 inside 172. A tender at 1,790 m hugging a wall passes a Hollow at 1,700 m inside both
figures; one down the middle, 650 m from either, passes nothing.

**The Sounder.** At 14:30 `the-sill-riser` spawns at 2000, 2900 at 2,200 m and is driven up
the cleft's centre to 2000, 900 at 1,750 m until 16:00, loud: SIG 100 the whole way, the
sound of the deep answering a cohort's noise the way it answers everyone's. It ignores every
Commune hull — transit grinds hulls of 95 m and up, and the plateaus' largest is an 80 m
corvette — and clears both Submersibles (`fauna.ts`): from 15:00 they stand 500 m off its
line against a reach of 85, and in the half-minute before that `throat-east` is standing on
the line itself at 2000, 2000 and is clear only by depth — the riser is at 1,840 m as it
passes, 260 m above a gun at 2,100. It is
spawned at the garden's depth rather than the sill floor's because a driven creature climbs
at 12 m/s from wherever it was placed: one placed at 2,450 m would pass the dome at 1,990 m,
inside a transit reach of 117.5 m. Placed at 2,200 m it clears the dome by 250 (§13).

**Nobody is stupid and nobody is cruel** ([campaign.md](campaign.md) §2 rule 1). The cohort
came to enter a hull, because the letter said it would. The Directorate does not
editorialise, and neither does this document.

---

## 7. What Is Heard

**A dome, from every metre of the garden. And then the garden going dark, bed by bed, from the
west.**

Every figure is arithmetic over the shipped model (`PROPAGATION_MODEL`, `BASE_THRESHOLD`
0.147) and the roster ([units.md](units.md)), with each pair's PF taken as
`pathPropagation`'s mean over the 250 m cells between the two ends rather than as the biome
either end stands in — *The Second Seeding*'s rule, on the same engine
([mission-second-seeding.md](mission-second-seeding.md) §7). Inside the garden every pair is
kelp and the mean is 0.55, so there the distinction costs nothing. Every pair that crosses the
garden's edge is priced at its own mean, and the cross-region rows carry it.

**Inside the garden, at 0.55:**

- **The dome** — 35: Tier 1 to the watch from 2,597 m, to a tender from 1,529, from every hull
  not inside a cloud. Inside one, where the ears are 5, nothing past 499 m — which is why the
  watch has to leave a bed to hear the building it is hiding from.
- **The line sweeping** — 03:00, 24 at cruise: Tier 1 from 2,052 m outside a cloud and 222
  inside one.
- **The west bed going dark** — 09:00. A structure lost lays a mark at 18 for three minutes
  ([systems-echo.md](systems-echo.md) §7), and the cloud on the chart is simply gone. Then the
  middle at 12:00 and the east at 15:00 — *Thin Water*'s housings going quiet from the east,
  turned round ([mission-thin-water.md](mission-thin-water.md) §7).

**Across the garden's edge, each pair at the mean of the cells between its two ends:**

| Sound | SIG | The line it is heard along | PF | Tier 1 from |
| --- | --- | --- | --- | --- |
| The Submersibles in the duct, idle, duct-to-below at 1.0 | 22 | the throat to the watch's posts, every cell cleft | **1.60** | a scout outside a cloud, 3,787 m; the posts stand 838 and 825 m off |
| The same, to the garden | 22 | the throat to the beds' row, three cells of cleft and two of kelp | **1.18** | a tender outside a cloud, 1,844 m; the beds' row is 1,125 m off |
| The line rising silent, 02:00 | 4.333 | `cohort-1`'s seat in the sill to the western post, one cell of sill and three of kelp | **0.813** | a scout outside a cloud, 899 m, against a seat 906 m away — and 704 m at the garden's own 0.55, against the 658 m the line has closed to by 02:30. The watch hears the rise as it arrives, not as it starts |
| The throat emptying, 12:00 | 72 | the throat to the watch's posts | **1.60** | a scout, 7,946 m |
| The same, to the garden | 72 | the throat to the beds' row | **1.18** | a tender, 3,868 m |
| The same, over the layer | 72 | the throat to the Foot, three cells of cleft and one of open water, ×0.3 across the layer | **1.45** | a tender in the Foot, 2,073 m |
| The riser, 14:30 | 100 | the cleft's centre to the garden's corners — sill cells while it is still low, kelp once it is level with the beds | **0.55–0.90** | a scout, 5,006 m at the quieter of the two, against a map whose own diagonal is 5,000; a tender, 2,948 m |
| The same, over the layer | 100 | the cleft's centre to the Foot, ×0.3, the mean rising as the animal climbs | **1.26–1.50** | a tender in the Foot, 2,331 m at the spawn and 2,600 m by the time it is level with the garden's north edge |
| The pack in the lanes, all mission | 26 | the lanes to the garden's western post, every cell open water | **1.00** | a scout, 3,134 m: the sound of home water, which cannot climb and will not come |

The loudest thing the doorway does all mission is leave it, and the riser is the whole map to
the watch, both sides of the layer, for ninety seconds.

**What the cohort hears of the player**, priced against the dome-lent 95 through the garden's own 0.55 — every pair in this table has both ends inside the garden:

| The player's hull | Emits | Contact | Bearing | Classification | Track |
| --- | --- | --- | --- | --- | --- |
| Silent tender under a bed | 4.5 × 0.4 = 1.8 | 492 m | 382 | 277 | 207 |
| Idle tender under a bed | 18 × 0.4 = 7.2 | 1,170 | 908 | 660 | 492 |
| Silent tender, bed dead | 4.5 | 872 | 677 | 492 | 367 |
| Idle tender, bed dead | 18 | 2,075 | 1,610 | 1,170 | 872 |
| Tender at cruise, bed dead | 40 | 3,417 | 2,652 | 1,927 | 1,437 |
| Silent corvette under a bed | 5.3 × 0.4 = 2.1 | 547 | 425 | 309 | 230 |
| Un-silent corvette under a bed | 28 × 0.4 = 11.2 | 1,542 | 1,197 | 870 | 648 |
| Silent scout outside a cloud | 3.5 | 745 | 579 | 420 | 313 |
| A bed's own hum | 20 × 0.4 = 8 | 1,250 | 970 | 705 | 525 |
| A ping under a bed | 95 × 0.4 = 38 | 3,309 | 2,568 | 1,866 | 1,391 |

Inside a cloud a Chorister hears at 5, and the same rows read: a silent tender not at all, at
any range, because 1.8 is under threshold even at the reference distance; an idle tender
Contact inside 186 m and Bearing inside 144; a corvette that is not silent Bearing inside
190; a bed's own hum Bearing inside 154. In the cleft, to a
Submersible in the duct at 95, a silent tender at 4.5 × 1.6 is Contact from 1,700 m, Bearing
from 1,320, Classification from 959 and Track from 715 — the throat's middle is Track at ratio
7.1, its walls at 21.5. A tender idling at 18 in the Foot is Track to the same ears from
1,599 m, the Foot-to-throat mean being 1.45 and the duct hearing the water above it at 1.0:
the first water the plateau can hear again is, from the duct, the first water the cohort can
hear the plateau from.

No hazard event, no second navy, no new species. What arrives instead of an attack is a
building's ears, eight hulls walking, and a schedule.

---

## 8. The Objective

**Sixteen over the layer. Three tenders in the Foot, and the count is read in people.**

The row shapes are the format's own, and every one is a query over the player's own force
([mission-thin-water.md](mission-thin-water.md) §8; `types.ts`, `MissionPredicate`):

**`the-people`** — *Sixteen are under the beds. We'd like sixteen over the layer, and we're
saying it the way we said six at Kell: so nobody down there has to say it first.* —
`{ kind: 'extract'; role: 'tender'; region: 'the-foot'; count: 3 }` — **terminal**, not
keystone — revealed 00:00 — marker `the-foot` (2000, 250, r 500). Right as an
extract-at-reveal: nobody is in the Foot at tick zero, and a tender that reaches it is home.
Reading met: *Three over the layer. Sixteen, by household.* Unmet: *Fewer than three over the
layer. The rest are in the cohort's water, and the Directorate has never yet rounded anybody
up.*

**`the-crossing`** — *One of ours over the layer is a plateau that still has people in it.* —
`{ kind: 'extract'; role: 'tender'; region: 'the-foot'; count: 1 }` — **terminal**, revealed
00:00, marker `the-foot`, the same circle. The middle rung, in *Thin Water*'s and
*Sorrowgate*'s arrangement: the ladder reads how many terminal rows were met, so a
three-row Results table needs two, and the ask is still three.

**`the-letter`** — *What they hear of us they'll enter, and this time they came to enter it in
person.* — `{ kind: 'tolerance'; ticks: 30 * SIM.TICK_HZ; tier: ResolutionTier.Classification }`
— **non-terminal**, revealed 00:00 — thirty seconds cumulative of the force at Classification
or better in anybody else's ears: the dome's own 80, the line's 95, the doorway's 95. Met means
the cohort has a hull in the letter (`types.ts`). Reading met: *They had us at a name for half
a minute. The letter has a hull in it now.* Unmet: *They walked two gardens and named nobody.
The letter is still a letter, and there is still nobody in it.*

**`the-escorts`** — *Juno's people are under the east bed with their guns struck. They're ours
to move, not to spend, and we've never had to say that before.* —
`{ kind: 'survive'; role: 'escort'; count: 3 }` — **non-terminal**, standing, read at the
close. Reading met: *Three struck guns are still three, and still struck. We'd like that heard
as what it cost and not as what it saved.* Unmet: *We lost a hull with a gun on it to a sweep
it never fired at, under a bed at seventeen hundred and ninety metres, and Juno was there,
and she didn't strike first.* The met reading cannot say *came home*: `survive` counts hulls
alive wherever they are, and a corvette alive under the last bed at 16:00 is not home.

**The count is hulls; the reading is people; nothing else is counted.** No `loaded` flag, no
`deliver` row, and the watch is in no objective. The furrow is in no row either, and cannot
be — no predicate asks where another party stands (`types.ts`) — and need not be: the dome
stands and the line stays in every outcome, so the furrow is the Directorate's at the close
whatever the count, and Marr says so in the first sentence of the Complete reading.

**The mission runs its length.** `runsItsLength: true`, *Intake*'s row
([mission-intake.md](mission-intake.md) §13): the tide turns at 16:00 whatever the register
stands at. The court's rule would read Juno's three as alive and struck at 13:45 while they
were still under a bed with a line walking toward it. The close is the tide.

### Results

| Result | Condition | Marr's reading |
| --- | --- | --- |
| **Sixteen over the layer** | Three tenders in the Foot at the tide | "Sixteen over the layer and the furrow's theirs. We'd like you to hear the order of those two things. The garden's got a cohort standing in it tonight and nobody fired on a berth and nobody fired at all, and by the next tide the letter will say that a seeding was attended and found empty, which is the truest thing anyone's written about us since 205." |
| **Some of them** | One or two | "Some of them. The rest are under a dome, with a cohort that says it's counting and means it. We agreed a number at the top of the cleft and it fell to somebody at the bottom, again, and we're sorry it was you, again." |
| **Nobody came up** | None | "Nobody came up. The furrow's attended. That's their word and we're using it because we haven't got one." |

Beneath whichever row the run earned, in authored order: *the-letter*'s reading, then
*the-escorts*', in the arrangement [mission-shift-change.md](mission-shift-change.md) §8
built. Marr reads the count when the watch brings it up the lanes; then Anholt speaks once,
on the lane, and it is the sentence *Radicals* is built on
([mission-radicals.md](mission-radicals.md)). Rule 4 is not claimed: the judge assigned the
campaign's third unwinnable fight to *Conclave* ([campaign.md](campaign.md) §7), and this is
a hiding-and-evacuation with every gun struck rather than a lost fight.

### The shape of a clean run, so the ladder is not a mystery

The plateau's ask is sixteen over the layer *unentered*, and §6 and §7 price it. A tender
leaving the eastern bed's cloud at its north edge at 12:00 is a silent 4.5 to a dome at 80
that has Classification inside 860 m through the cleft's 1.6 — so it leaves along x ≈ 2,450,
200 m off the eastern wall's Hollow, and is inside that circle for twenty-five seconds at
32 m/s. Three tenders that leave together spend those seconds once; three that leave in turn
spend them three times, and the letter counts seconds, not hulls. Then down the throat's
middle with the duct empty, climbing from the mouth, and in the Foot, silent, by about 13:15.
A tender that leaves at 14:00 meets the guns climbing back through the throat at 15:17. A
tender that leaves at 00:30 down the middle, or climbs in place to 500 m and cruises over
the top, is not shot by anything, is Track to the duct from wall to wall, and the letter has
it. Every one of those runs is the count. Only one of them is the plateau's.

### The failure, and the sounds that precede it

**The mission does not fail on a timer and does not end on one.** Its one terminal absence —
no tender in the Foot at 16:00 — is preceded by a garden going dark on a schedule the player
can hear: the west bed at 09:00, the throat emptying at 72 and the middle bed at 12:00, the
riser at 14:30 for ninety seconds before the tide against [campaign.md](campaign.md) §10's
sixty, and the last bed at 15:00. What kills a hull is a gun inside 650 m or a Hollow inside
107, and both are audible before they are anywhere: the Submersibles at 22 from 1,844 m to
the deafest hull the player owns, through the throat-to-garden mean of 1.18 (§7), and a
Hollow's strike at 60 from 7,090. Nothing in this
mission is lost to a thing that was quiet.

---

## 9. Length, SIG Budget, and the Beats

**Length: sixteen minutes.** Inside [campaign.md](campaign.md) §10's 12–25, and chosen
against the schedule: three beds at three-minute intervals from 09:00, a window of three
minutes, and one minute for the tide to turn on whatever stands.

**SIG budget: 8**, a description of the silent posture — §4. **No silence order:**
`silenceCeilingSig: 100`, `debtCapS: 0`, no `arrayTag`; the ledger does not run.
`escortRadiusM: 0` — the hold is *Thin Water*'s, and here nobody waits for a gun.

| Time | Beat |
| --- | --- |
| **00:00** | `ground` — region `second-furrow`, biome Kelp Forest: the sown furrow restated as *Deep Furrow* left it (§11). `silent`, active, on all eight player hulls — the households lie up silent. `silent`, active, on `cohort-1` … `cohort-8`. `creature` × 6: the two Hollows, the three jelly clusters and the lanes pack placed where *Deep Furrow* placed them, `untilTick: 0`, not loud. The dome audible from every metre of the furrow; the beds on the chart; the doorway held |
| 00:00 | `say` — the watch: a dome in the garden, and Juno's guns struck (§12) |
| **02:00** | `move` × 8 — the line to y 2,450, `depthM` 2,150: a silent ascent of 250 m, seventeen seconds, and 250 m north. `say` — the Band-Speaker: the sentence of 205 stated again in the band, and the law once (§12) |
| 03:00 | `silent`, inactive, × 8. `move` × 8 — y 2,350: the sweep at cruise, 24 through kelp, 2,052 m to a scout outside a cloud |
| **04:00** | `say` — Warden Juno Teel, one sentence (§12) |
| 04:30 | `move` × 8 — y 2,150: the line stands on the beds' row, inside the clouds, hearing at 5 |
| 06:00 | `move` × 8 — y 1,900: the line north of the beds, at the dome's foot. `say` — the Band-Speaker, from the doorway: the doorway is held at the layer (§12) |
| 07:30 | `move` × 8 — y 2,100: the line turns south and stands on the row again |
| **09:00** | `lose` `bed-west`. `move` × 8 — y 2,350. `say` — the watch: the west bed's gone; everything under it is at its own figure |
| 10:30 | `move` × 8 — y 2,450: the line at the garden's south edge |
| **12:00** | `lose` `bed-mid`. `move` `throat-west` → 1500, 2000, `depthM` 2,100; `move` `throat-east` → 2000, 2000, `depthM` 2,100 — the doorway empties into the dead water, at 72, and everything in the cleft hears it. **The window opens** |
| 12:30 | `say` — the watch: the throat's empty; three minutes, we'd guess; down the middle, not the walls |
| 13:30 | `move` × 8 — y 2,200: the line stands on the beds' row a third time, on the dead ones at its own 95 and inside the east one at 5 |
| **14:30** | `creature` `the-sill-riser` — Sounder, `spawnAt` 2000, 2900 at 2,200 m, `driveTo` 2000, 900 at 1,750 m, `untilTick` 16:00, **loud**: SIG 100 up the cleft's centre, ignoring every hull the plateaus own and clearing both guns — `throat-east` is on its line until 15:00 and 260 m above it, and from 15:00 both are 500 m off it (§6). The beat the close's telegraph is measured from |
| **15:00** | `lose` `bed-east`. `move` `throat-west` → 1500, 1000, `depthM` 1,200; `move` `throat-east` → 2500, 1000, `depthM` 1,200 — the guns climb back to the duct over sixty seconds, and the doorway closes from the floor up. `say` — the Band-Speaker: the furrow is attended; what is in it is counted |
| **16:00** | `resolve` — the tide. Whatever is over the layer is the column; whatever is under the dome is in the cohort's water. Not a conclusion: the telegraph is 14:30 against 16:00, ninety seconds |

**Conditional beats**, in no order, checked every mission tick (`types.ts`,
`MissionConditionalBeat`):

- `{ kind: 'tolerance'; ticks: 30 * SIM.TICK_HZ; tier: Classification }` → `say` — the
  Band-Speaker: *Entered: a hull, and a count.* Fires once, on the tick *the-letter* is met.
- `{ kind: 'extract'; role: 'tender'; region: 'the-foot'; count: 1 }` → `say` — the watch:
  *One's over the layer. It's the first water they can't hear us in.*
- *the-escorts* fires nothing: `survive` is standing, and the row is read at the close.

The line's legs, the Submersibles' two moves and the riser's transit are authored, not AI,
for the standing reason ([mission-sorrowgate.md](mission-sorrowgate.md) §9): a mission's
beats happen at the time the document says they happen. The letter is why; the beats are
when. A hull with a live move order holds its fire (`combat.ts`), so the guns in the dead
water fire from about 12:20 and the guns climbing back from about 15:17.

---

## 10. What It Teaches

One system, per [campaign.md](campaign.md) §10: **the Spore Veil against the best listeners
in the game** — the hole in a dome's ears, its symmetry, the silence it multiplies rather
than replaces, and the schedule hiding turns out to be — in the four movements of §4,
landing in order across the beat table: the dome heard and the beds not (00:00), the line
walking into the clouds and going deaf in them (03:00–04:30), the west bed going dark
(09:00), the throat emptying and the dead water filling (12:00), and the last bed at 15:00,
which is where the system is load-bearing.

Underneath it, the campaign's subject continued: *Tend* taught that quiet is a livelihood,
*Thin Water* that the water can stop protecting it, and *Deep Furrow* that a garden can be
safe by depth. **In Writing teaches that a plateau can grow a silence other people are deaf
inside, and that the deaf people know it, and have a clock.**

What this mission deliberately does not teach:

- **Fighting** — nothing. Every gun the player owns is struck; this is a fight the Commune
  declines, priced in people entered rather than people dead.
- **The zone** — *Deep Furrow*'s system; every hull here is seated above the line it would
  need it at (§3).
- **Fighting your own faction's momentum** — mission 6, *Radicals*
  ([mission-radicals.md](mission-radicals.md)), where the column Anholt sends south after
  tonight's sentence goes without a vote.
- **The bed as a thing to plant under** — mission 7, *The Second Seeding*
  ([mission-second-seeding.md](mission-second-seeding.md)), the same bed on the lip of the
  Mouth with the same people under it.
- **Active sonar as an answer** — §3. Its only effect here is to tell the dome which bed to
  walk to.

---

## 11. The Map

`anholt-furrow` · **The Furrow** · one seat · 4,000 × 3,000 m · cell 250 m · base floor
1,100 m.

**The same map literal as [mission-deep-furrow.md](mission-deep-furrow.md) §11, unchanged**,
region for region — [campaign.md](campaign.md) §2 rule 5's second concrete pair, after Marr
Plateau under *Tend* and *Convocation* ([mission-convocation.md](mission-convocation.md) §11),
and for the same reason: a garden the player has not planted is not one they will hide under.
What this mission adds is markers, structures, a `ground` beat at 00:00 and parties. Never
geometry. North is shallow and home; south is the sill and the Directorate's water.

| Region | Rect (x, y, w, h) | Biome | Floor | What it is |
| --- | --- | --- | --- | --- |
| The Lanes | 0, 0, 4000, 3000 | Open Water | 1,100 | The Mid-Water lanes below the plateaus' drop. Painted first; everything else is cut into it. The floor is the duct's top |
| The Foot | 1500, 0, 1000, 500 | Open Water | 900 | The drop's foot where the plateau's lane comes down. Above the layer. **The extract region: home** |
| The West Wall | 0, 500, 1250, 2500 | Open Water | rock | Solid. The cleft is the only road |
| The East Wall | 2750, 500, 1250, 2500 | Open Water | rock | Solid |
| The Cleft | 1250, 500, 1500, 1250 | Abyssal Trench | 1,800 | The descent and the doorway. PF 1.6; Hollow country on the walls; the duct at 1,200 m across its upper water, with the farmed jellies in it. 1,500 m wide |
| The Furrow | 1250, 1750, 1000, 750 | Kelp Forest | 2,200 | The 204 PC ground, ten years grown; trench floor painted kelp because seeded ground absorbs |
| The Second Furrow | 2250, 1750, 500, 750 | Abyssal Trench | 2,200 | Bare rock in the literal, sown three tides ago: **repainted Kelp Forest by this mission's `ground` beat at 00:00** |
| The Sill | 1250, 2500, 1500, 500 | Abyssal Trench | 2,600 | Where the cleft opens to the deep. The line's seat; Sounder water |

One spawn at the Foot: 2000, 250. No resources, no hazard sites, `fauna: false`.

**The sown furrow is restated, not spent.** *Deep Furrow*'s ground beat turned the Second
Furrow to Kelp Forest when the sowing completed, a mission fact the map literal cannot carry.
This mission fires the same beat on the same region at 00:00 — a restatement, as *Radicals*
restates the prologue's collapse ([mission-radicals.md](mission-radicals.md) §11), and not a
third biome spend: the judge caps the repaint at *Deep Furrow* and *Attending* 6, and this
water was turned once, three tides ago, whatever tick the literal turns it on.

**Mission regions**, restated for predicates and beats: `the-foot` (1500, 0, 1000, 500 —
home, over the layer) and `second-furrow` (2250, 1750, 500, 750 — the restating beat's
region). A mission restates only the places a predicate, a lift or a beat addresses
([mission-intake.md](mission-intake.md) §11), so the garden and the throat are prose here and
not regions: the plan's `the-furrows` and `the-throat` are named by no row, no marker and no
beat, and *Radicals* §11 and *The Second Seeding* §11 drop their own unaddressed rectangles
for the same reason. One marker, `the-foot`, at 2000, 250, r 500, named by both terminal
rows.

**Seats, checked against the floor and the band.** The households, the watch and the escorts
at 1,790 m over the furrows' 2,200 — `tender-1` 1400, 2100 under the west bed; `tender-2`
2000, 2300, `watch-1` 1850, 2300 and `watch-2` 2150, 2300 under the middle; `tender-3`
2700, 2150, `escort-1` 2600, 2000, `escort-2` 2650, 2100 and `escort-3` 2600, 2250 under the
east — every seat inside 350 m of its bed's centre, PR-2 owns 1,790, and every one of the
eight is more than 499 m from the dome, so no hull opens the mission able to hear it. The
beds at 1,790 over 2,200; the dome at 2,000 m over 2,200; the Submersibles at 1,200 m over
the cleft's 1,800; the line at 2,400 m over the sill's 2,600 with `pressureRating: 3`
authored on a PR-2 hull (§13); the riser spawned at 2,200 m over 2,600 and driven at 1,750 m
over 1,800, inside its 1,300–2,700 band.

**Two posts the watch can stand at, computed rather than hoped.** The garden's northern
corners at 1250, 1800 and 2700, 1800 are outside every cloud — 410 and 382 m from the nearest
bed's centre — and 752 and 702 m from the dome, where a silent scout at 3.5 through kelp is
nothing to a listener at 80 past 670 m. The eastern post is 2700 and not 2750 because the
cell whose centre is 2875 belongs to the East Wall and is rock: the garden's last water is the
cell that ends there. A scout at either hears at 70: the near Submersible from 838 and 825 m,
the line from 2,052, the dome from 2,597. It is the only water in the garden where a
hull can have its ears and keep its name.

**Why this ground argues the mission.** The cleft is the only road out, 1,500 m wide, with
the two best ears in the Rift standing 1,000 m apart across it in the one water the layer
does not hide from. The furrows are kelp-quiet and the cleft is trench-loud, so a hull is
three times as audible the moment it leaves the garden; the Foot at 900 m is the first water
the plateau can hear again. Drift Health carried from *Deep Furrow* (rule 5) is not built,
and this document names the pair and stops (§13).

**The Furrow is a mission map and is not in the public catalogue.** One seat, no resources,
not balanced, resolved by mission id and nothing else ([maps.md](maps.md)) — and, once *Deep
Furrow*'s literal lands, resolved by two.

---

## 12. The Briefing

Spoken by Tidespeaker Ysolde Marr on the lane at the cleft's mouth, at 900 m, the tide the
dome was heard — to the watch going down to carry it, because the furrow cannot hear the
plateau and she cannot go where the households are. The Commune's register is defined in
[culture.md](culture.md) §3; it cannot command, and this is the first Commune briefing that
quotes another register inside itself and declines to answer it in kind.

> We're not going to tell you what to do down there. We couldn't be heard if we tried, and
> we'd rather that stayed the arrangement even now.
>
> Nine years ago the Undermarshalcy wrote to us. We've had it read out once, so everyone's
> heard it, and we'll say it again here the way they said it, because it's theirs. *"What was
> proved at twenty-two hundred metres in the year 204 has been heard, and it is entered. A
> second seeding of the band will be attended as what it is, and answered as what it is. This
> is stated in writing because the plateaus keep none, so that it is kept somewhere."* It's
> in Sefa's seed-store, on the dry shelf, next to the seed. That's the only answer we ever
> gave it, and we're not giving another today.
>
> There's a dome in the garden. The watch heard it built. It listens at the furrow the way
> the galleries listen at the Mouth, and the furrow is us. Three beds are grown over the
> households, and under a bed nobody hears anything and nobody is heard — theirs or ours,
> it's the same cloud. The beds won't last. We'd guess they'll go from the west, one at a
> time, on somebody's clock and not ours, and what's under a bed that's gone is at its own
> figure again.
>
> The cleft's the only road and the doorway's held. There's a stretch in the tide when it
> isn't. We'd like sixteen over the layer, and we're saying sixteen here, at the top, so that
> nobody at the bottom has to be the one who says a smaller number first.
>
> Juno went down with the families when the dome was heard. She brought three guns and
> they're struck, and that's hers, not a vote. Nothing is struck under a bed. We'd like that
> heard once, down there, so it's been said.

### Objective readings, in play

The Commune cannot command, so its objectives arrive as statements of what is under the
beds and what the plateau agreed at the top of the cleft:

- *Sixteen are under the beds. We'd like sixteen over the layer, and we're saying it the way
  we said six at Kell: so nobody down there has to say it first.*
- *One of ours over the layer is a plateau that still has people in it.*
- *What they hear of us they'll enter, and this time they came to enter it in person.*
- *Juno's people are under the east bed with their guns struck. They're ours to move, not to
  spend, and we've never had to say that before.*
- *The west bed's gone. Everything under it is at its own figure.*
- *The throat's empty. Three minutes, we'd guess, and we're guessing.*

### The voices on the water

**The watch, under the middle bed — 00:00**

> There's a dome in the garden. Thirty-five, steady, since the tide before last, and it
> listens at the furrow the way the galleries listen at the Mouth — we've heard that said
> about the galleries and we're saying it about us. We can't hear it from under here. Out at
> the corners we can. Juno's guns are under the east bed and they're struck, and we'd like
> that heard once.

**The Band-Speaker, Second Trench Cohort — 02:00**

> What was stated in the year 205 was stated in writing because the plateaus keep none. It
> is stated again now, in the band, and it is attended rather than entered. Three beds have
> been grown over an attended furrow. They are corrected as a mooring was corrected in
> closed water. The doorway is held; what stands into it is engaged. Nothing pursues.

**Warden Juno Teel, under the eastern bed — 04:00**

> I brought the guns down and I'm not using them. Those are two things I decided, not one,
> and I'd like the young ones to hear there were two — at Kell there was one, and I've had
> seventeen years to want the other.

**The Band-Speaker, from the doorway — 06:00**

> The doorway is held at the layer. What passes it is counted, on whichever side of the layer
> it passes.

**The watch — 09:00**

> The west bed's gone. You'll have heard it go and you'll have heard where. Everything that
> was under it is at its own figure now, and the line's two hundred metres off it.

**The watch — 12:30**

> The throat's empty. They went down loud and they went down into the garden, so they're not
> at the door and they are here. Three minutes, we'd guess, and we're guessing. Down the
> middle, not the walls — the walls have what they've always had.

**The Band-Speaker, entering a hull — fired by the tally**

> Entered: a hull, and a count.

**The watch, on the first tender over the layer — fired by the tally**

> One's over the layer. It's the first water they can't hear us in.

**The Band-Speaker — 15:00**

> The furrow is attended. What is in it is counted.

**Tidespeaker Ysolde Marr, at the tide's turn — 16:00**

> The reading of the count, per §8, when the watch has brought it up, and then one sentence
> she should not say aloud and does: "We keep nothing, and keeping nothing has been the whole
> of our protection for two hundred years. Theirs has been on Sefa's shelf for nine of them.
> Tonight I'd like there to be one sentence of ours somebody could read out in nine years."

**Bloomwright Sefa Anholt, on the lane, after the count**

> I'll ask tonight, and I'm not waiting for every garden.

Each line fails [culture.md](culture.md) §3 for the other three factions, which is that
document's own test (§6). The letter's sentence claims no agent in four clauses, which is the
language of liturgy and nothing else; Marr quotes it without conceding its frame — *it's
theirs* — and gives nobody an order where a writ would have given six. The Band-Speaker's law
is a threat with no threatening word in it, which no register that claims agency could
sustain. Teel's sentence is the imperative mood not arriving: she says what she decided and
not what anyone else should. The watch hands the player a fact and a guess and marks which is
which, and the Directorate would have entered the guess. Anholt's is a future imposition
flagged in advance, the register at its limit for the second time
([mission-thin-water.md](mission-thin-water.md) §12). And Marr's last is a woman who spent
thirty years on the plateau's one protection wanting, for one sentence, the other side's.

She is *she* throughout, as [characters.md](characters.md) writes her;
[mission-thin-water.md](mission-thin-water.md) §8 and §12 are the side that moves.

---

## 13. Scaffold Status

What exists against this document and what does not, continuing the list
[mission-asset-recovery.md](mission-asset-recovery.md) §13 started. **This mission is built.**
The literal is `inWriting.ts` (#394), on the map literal
[mission-deep-furrow.md](mission-deep-furrow.md) §11 owns (#392, registered in #393), and
`missionInWriting.test.ts` reads it. The queue argument this section opened with is spent:
the literal this document stood behind landed in the same pull request, and the reuse §11
asked for happened, region for region. The prediction held too — the mission asked the format
for nothing it did not already have. What the transcription found instead is arithmetic: two
ranges in §7, and one description of the line they are measured along, were this document's
and not the engine's. §7 now carries the engine's on all three, and the rows below say why.
Three things remain a design agenda and all three are still here — the grant this mission
declines, the carry between tides that nobody has started, and the mix.

| Requirement | Status |
| --- | --- |
| The mission format — beats, predicates, registry, private rooms | **Built** (#190). `extract`, `survive`, `tolerance`, `ground`, `silent`, `move`, `lose`, `creature`, `say` and `resolve` cover §8 and §9; a conditional `say` on `tolerance` and on `extract` is Aptitude's and Thin Water's row (#282) |
| **The map** — `anholt-furrow`, eight regions, reused unchanged | **Built** (#392; registered in `MISSION_MAPS` by #393), **and the reuse happened.** [mission-deep-furrow.md](mission-deep-furrow.md) §11 owns the literal; this mission adds two mission regions, one marker, three structures, two parties and one `ground` beat, and no geometry at all. `missionInWriting.test.ts` holds the eight rectangles to §11's own table to the metre, and holds the map to being a mission map from both ends — `mapById('anholt-furrow')` is undefined and `missionMapById` resolves it. [campaign.md](campaign.md) §2 rule 5's second concrete pair is a fact rather than a plan, and the literal names *Deep Furrow* the owner and this mission the reuse in its own header, so a future disagreement has a side that loses |
| **The Spore Veil, fielded** | **Built** (`STRUCTURE_AURAS.SPORE_VEIL`; `auras.ts`), symmetric, applied after the Cantor so a lent 95 is 5 inside a cloud — **and fielded here** (#394): three `MissionStructure` rows at 1,790 m, the first Spore Veils placed on any party in the game. A *player-built* Veil would sit at `CONSTRUCTION.WORKING_DEPTH_M`, 600 m, wherever the floor is — the finding [mission-standing-wave.md](mission-standing-wave.md) §13 carries — which is one more reason the beds are grown before the tide and not during it. **The cloud is horizontal** (`Math.hypot` on x and y), which this document leans on twice: the seat at 1,790 m is veiled exactly as the floor would be, and a scout cannot leave a cloud by climbing. The test measures both ends of that — every one of the eight hulls is inside 350 m of its own bed on x and y, the three clouds overlap into a band 1,700 m wide across furrows 1,500 m wide, and no hull opens the mission inside the 499 m at which the dome's 35 reaches ears blinded to 5 |
| **The Cantor on a scripted party, granting its own slot** | **Built** — auras grant by `Structure.grantSlot`, the owner unless a mission lends it away. The dome lifts the line's 75 and the Submersibles' 85 to the 95 cap within 1,200 m; its own ears stay at 80, because the roster loop grants units and structures keep their spawned rating. **Placed** (#394): the test holds every cohort hull inside the dome's 1,200 m, so the lent 95 §7 prices everything against is resolved rather than assumed |
| **The guns are tier-blind, and it moved the plan** | **Built, and a finding this document spends.** `combat.ts` auto-acquires the nearest live enemy inside weapon range in three dimensions, heard or not, on the licence that weapon ranges sit inside audibility; structures are targetables; a silent hull and a hull with a live move order hold fire. Three consequences, all in §6: the Choristers walk cold, because an armed line standing inside a cloud would have the bed itself inside 270 m and every bed down on the first stationary pass; a bed is no cover from a gun in range, so the dead-water spheres of 12:00 are priced by distance and not by the veil; and the doorway is priced by what two 650 m spheres cover, which is the duct band and not the water column. The plan armed the line and priced the doorway by Bearing at 1,024 m; the engine prices it by reach, and the bible's sentence is [systems-combat.md](systems-combat.md) §7's *in range implies heard*, read in the direction the roster reads it. **Spent** (#394): no `armed` flag on any of the eight, and the test computes the counterfactual off the 04:30 leg rather than restating it — three of the eight seats cover each outer bed and two cover the middle, so 900 HP at 20 hull a second per gun puts the slowest bed down 22.5 s into the leg, at 04:52, which is §6's *about 04:55* |
| **The Submersibles in the duct, not on the floor** | **A design call, made here and stated so it can be reversed.** The plan seated the doorway at 1,750 m. Ascent is silent, keeps Silent Running, and adds no SIG (`DEPTH`; `match.ts` clears silence only for an order deeper than the hull), and the cloud is horizontal, so a tender under a bed could climb in place to 500 m in eighty-six seconds and cross the throat across the layer at 0.3 — neither shot nor entered by a gun at 1,750 m. Seated at 1,200 m the same gun hears both halves of the water at 1.0 and the duct at 1.2 (`THERMOCLINE_PAIR_FACTOR`), and every crossing of the throat at any depth is Track to it (§7). That is what a Listener would choose and what makes the window the only unentered exit. The cost is that "the throat is closed" becomes "the throat is heard, and shot in the band a hull has to climb through", and §6 says so. **Made** (#394): both seated at 1,200 m, and the test re-derives all four of §6's figures from `engagementRangeM` — 785–1,615 m at the throat's middle, 600–1,800 at a wall, 273 m across the throat against a hull at 1,790 and 577 against one at 900 |
| **`lose` beats on the player's own structures** | **Built** — Sorrowgate loses the court's array at 10:40 the same way. The beds die on the clock and never to a gun; the line is authored transits per [mission-sorrowgate.md](mission-sorrowgate.md) §9, and the correction is the document's, not the roster's. Authored (#394) at 09:00, 12:00 and 15:00, three minutes apart, which is the whole of §4.4 and the only clock the player is given |
| **`silent` beats on scripted hulls, and on the player's own** | **Built** — `applySilent` acts on the tag's own slot whoever owns it. The line is seated silent and dropped at 03:00; the player's eight hulls are authored silent at 00:00 and the player may drop it, which is the mission |
| **Armed scripted hulls with live fire control** | **Built** — Thin Water's corridor. Two Submersibles carry it here and nothing else does. Authored (#394): `armed: true` on `throat-west` and `throat-east`, and the test asserts it is on nothing else on the map — the eight Choristers included |
| **A Sounder driven at an authored depth** | **Built** (#349; [mission-intake.md](mission-intake.md) §13), with a finding about where it starts: a driven creature climbs toward `driveTo.depthM` at `DRIFT.VERTICAL_SPEED_MPS`, 12 m/s, from wherever it was spawned, and the transit grinds any structure whose depth is within a body plus its radius (`fauna.ts`, `transit`). Spawned at the sill floor's 2,450 m, as planned, the riser would pass the dome at 1,990 m against the dome's 2,000 and a reach of 117.5, and stand inside that reach for 7.8 s, which at 220/s is 1,716 points against a 1,200 HP Cantor — the kill takes 5.5 of those seconds and it has 7.8. Spawned at 2,200 m it is at 1,750 by y 1,775 and clears the dome by 250 m; §6 authors that and says why. **Authored** (#394) at 2000, 2900 at 2,200 m, and the test re-derives both spawns from `fauna.ts` rather than trusting either figure — the counterfactual as well as the one the literal ships |
| **The `ground` beat as a restatement** | **Built** (#259), authored (#394), and the conditional the old row ended on is answered. `pressureBonus` did land as a `ground` field (#391) and *Deep Furrow*'s sowing beat carries it — **this beat deliberately does not.** It restates the second furrow's paint and nothing else: the grant it would have restated sits on *Deep Furrow*'s `standing-furrow`, a rectangle this mission does not address, and no hull here is under its own rating anywhere. The transcription also found that the beat is not decoration. The eastern bed stands in the Second Furrow, which the map literal paints Abyssal Trench, so before the beat `pathPropagation` prices the dome-to-eastern-bed pair at **1.25** and the dome holds the outer beds at **Track**; §4's *625 m through the garden's own 0.55* and the 2.55 beside it are true only on the far side of tick zero, and a literal that forgot the beat would seat four hulls over PF 1.60 where §11 reasons at 0.55. The test builds its terrain from the map plus this beat for exactly that reason |
| **The region pressure grant** — *Deep Furrow*'s headline row | **Built** (#391), **and still not leaned on.** The engine moved further than this row asked: `MissionRegion.pressureBonus` is a rectangle of water, not a structure — `auras.ts` resolves it into `Pressure.bonus` as the **max** of it and a Sounding Spire's, and it emits nothing — so the Spire-kind approximation this row used to price is gone rather than declined, and the garden that would have hummed at 80 was never built. What has not changed is the reason not to spend it: every player hull is seated at 1,790 m, where `requiredPressureRating` returns 2 and a PR-2 hull owns the water for nothing. Neither mission region carries a bonus, the test asserts `undefined` on both, and a grant here would be bought and never spent. See the open question below for what the seat costs the fiction |
| **The Chorister's rating, authored** | **A finding, not a request.** The Chorister is PR-2 on the hull and PR-3 in Directorate hands by `effectivePressureRating` ([units.md](units.md)), and the seat test reads `unit.pressureRating ?? statsFor(kind).pressureRating` — the hull, not the faction. Eight Choristers seated at 2,400 m therefore carry `pressureRating: 3` in the literal so the test does not report them dead of crush where they stand. The test is the side that should move: a seat check that read `effectivePressureRating` would let a Directorate literal author its cohort hull without restating the faction's baseline on every row. **Neither side moved** (#394): the literal restates `pressureRating: 3` on all eight Choristers, `missions.test.ts` still reads `unit.pressureRating ?? statsFor(unit.kind).pressureRating`, and the request stands exactly as written — eight rows of restated faction baseline is what it costs to leave the seat check where it is |
| **The tender's figures** | **A roster gap, still open, and the code is now on the roster's side of it.** *Tend* §3, *Thin Water* §3 and *Convocation* §3 author the Commune tender at 8 idle and 18 under way; the roster's Harvester idles at 18 and cruises at 40, and `tend.ts` names the gap in its header rather than reaching into hull stats. `inWriting.ts` (#394) prices the three tenders at the roster's — 18 idle, 40 at cruise, 4.5 running silent by `silentRunningSig` — and the test asserts the 4.5 and the 40 dropping to 32 under `PELAGIA_SPEED_MULTIPLIER`, so §7's table is what the engine resolves. The plan's *idle at 8* is the roster's silent ceiling and its *under way at 18* the roster's idle: every figure the plan gave is one state over. All four of the campaign's new documents — this one, *Deep Furrow*, *Radicals* and *The Second Seeding* — are priced at the roster's, and this row is where the other three point, so [units.md](units.md) moving would now move three older documents and no literal |
| **The path mean** — every cross-region figure | **Built, and the finding this document's own §7 pays for.** `Terrain.pathPropagation` returns the mean PF over the 250 m cells between the two ends, so a pair with one end in the garden and one in the cleft is priced between 0.55 and 1.6 and never at either. Inside the garden every pair is kelp and nothing moves; every pair that crosses the garden's edge does — the dome's commissioning heard from the Foot is a mean of 1.50 and not the cleft's 1.6, so §1's Classification circle is 1,993 m rather than 2,075, and the doorway hears a bed's hum through 1.18 rather than the garden's 0.55. §7 carries the mean on every cross-region row and the test re-derives every one of them from `pathPropagation` over the literal's own grid *with the 00:00 beat applied*, so a repaint of the second furrow moves this document's ranges instead of falsifying them (*The Second Seeding*'s row, on the same engine, [mission-second-seeding.md](mission-second-seeding.md) §13). Two of §7's own numbers did not survive that, and **the document is the side that moved on both.** The *line rising silent* row priced a Chorister at 4.3, which is a rounded input rather than a rounded display: `SILENT_RUNNING`'s own band gives 4.333, and the engine answers **899 m and 704 m** where the row printed 894 and 700. The row now carries the band's own figure and both ranges, because the rounding was in the input; the same table's corvette row rounds only what it shows, printing 2.1 and computing at 5.333 × 0.4 = 2.133. Both of the row's claims survived the correction: 899 against a seat 906 m away, and 704 against the 658 m the line has closed to by 02:30. And that row called its line *two cells of sill and two of kelp*, which would be a mean of 1.075; `pathPropagation` samples four cells over the 906 m and finds **one of sill and three of kelp**, which the row now says, and whose mean is the 0.813 its PF column printed throughout. The number was right and the sentence beside it was not |
| **Detection horizontal, guns three-dimensional** | **Built, both, and stated together because the pair decides §6.** The Echo pass prices a pair by horizontal distance and the thermocline factor; `engagementRangeM` includes depth. So a gun at 2,100 m reaches 571 m across the beds' row against hulls at 1,790, and a gun at 1,200 reaches 273 m across the throat against a hull at 1,790 and 577 against one at 900, while its ears reach 715 m at Track whichever depth the hull is at. Every distance in §6 is that arithmetic. Transcribed whole (#394): the test re-derives every one of them from `engagementRangeM` and `Math.hypot` rather than restating them, including the x ≈ 2,557 that leaves a strip 193 m wide against the east wall |
| **The middle rung as a second terminal row** | **Built** — Thin Water's `crossing` at one beneath `column` at six. `the-crossing` at one beneath `the-people` at three |
| **The tolerance as a reading, and as a condition** | **Built** (#272 for the reading; #282 for the beat). Read at Classification over thirty cumulative seconds off the force's own exposure, which since #323 is resolved for scripted parties and their structures — the dome's 80 counts, and Thin Water's turrets are the precedent |
| **A survive count as standing, and an extract latched at reveal** | **Built** (*Intake*'s correction; `predicates.ts`, `isStanding`). Both terminal rows are extracts revealed at 00:00, which the judge's rule permits because nobody is in the Foot at tick zero; nothing here wants an extract scored from a late reveal, so no `revealAtTick` is authored |
| **A mission that runs its length** | **Built** (*Intake*, `runsItsLength`), and authored here — §8 says why the court's rule is wrong for a tide |
| **Six locks with a reason in register** | **Built** — `AbilityLock` is continuous state the HUD greys out with the reason attached ([ui-ux.md](ui-ux.md) §7). `weapons`, `torpedoes`, `mines`, `depthCharges`, `noisemakers`, `construction`; `activeSonar` is deliberately not in the list. Authored in that order (#394), each with its reason, and the first reads *nothing is struck under a bed* |
| **`souls`, per hull** | **Built** as a field the tests read and the runtime does not; the epilogue carries sixteen by hand, and the readings say *by household* because that is how the plateau counts. Authored 5, 7 and 4 (#394), and the test adds them up: sixteen |
| **Bloom Surge** — the Commune's superweapon, and the row the format brief owes this title | **Absent, and deliberately not asked for.** [factions.md](factions.md) describes a detonating spore mass that blinds hydrophones across a vast radius for 25 s; nothing in `packages/` carries it, and no commander-ability or superweapon layer exists ([mission-convocation.md](mission-convocation.md) §13). This mission's system is the Veil as a *structure* — a bed that stays, under which hiding is a schedule — and a detonation that blinds the dome for twenty-five seconds would be an answer to the letter in the letter's own grammar, which the Commune declines to give. The mission is playable without it and would be worse with it. `inWriting.ts` authors no `commanderAbility` and the test asserts the absence, so the refusal is in the literal and not only in this document |
| **A predicate over another party's state** — *the furrow is theirs* | **Not expressible, and not needed.** The union asks nothing about where another party stands (`types.ts`); the furrow is lost by authorship — the dome stands and the line stays in every outcome — and Marr reads it as a fact in every epilogue rather than as a row |
| **Progression** — *Deep Furrow*'s count and the sown furrow into this tide | **The record is built, its first sibling key has landed, and this is still not**; [mission-deep-furrow.md](mission-deep-furrow.md) §13 states the split first. A per-mission history shipped with the campaign board (#371, `packages/frontend/src/progression/store.ts`): written once from the `missionOver` payload, keeping the best reading a mission has ever returned. What it keeps is an *outcome*. It was shaped to receive three sibling keys beside `missions`, and the first of them shipped with the briefing variants (#395) — `scenes`, a seen-scene set. Neither of the other two is what this row wants, and what it wants is mission-scoped: whether the second furrow was sown, and which sixteen came up off the garden floor. So the answer is unchanged and is now a choice rather than a wait — the `ground` beat at 00:00 is the honest restatement, the households are authored as the sixteen that stayed below, and `inWriting.ts` says in its own comments which run of *Deep Furrow* it assumes |
| **Cross-mission Drift Health** — rule 5's second concrete pair | **Not built**, named here and not asked for, as [mission-convocation.md](mission-convocation.md) §13 named the first pair. A furrow the last mission dived through loudly is a quieter garden this tide, and nobody tells the player why. The record now names it — per-map Drift Health is the second of the three sibling keys `store.ts` was shaped for — and naming is the whole of what has happened to it |
| **Briefing variants** — an alternate text for a scene already witnessed | **Built** (#378, shipped in #395): `MissionHeader.briefingVariants` is an ordered list of `{ scene, briefing }`, first match wins, selected client-side off the progression record's seen-scene set, so the room is never told which text was read — [campaign.md](campaign.md) §1's rule that a witnessed scene changes the text and never the mission. **This mission authors none, and the reason is that there is no scene to key on.** The only latch the format has is `MissionDefinition.sweep.scene`, which is *Tend*'s and latches `marr-plateau-filed`; this mission's natural pair is *Deep Furrow* three tides earlier, and *Deep Furrow* authors no sweep and therefore no scene. This document does not invent one. If the sowing is ever latched, the variant lands in the briefing's second paragraph: Marr quotes the letter of 205 to a watch that may have stood on the rock while the observer quoted it back |
| **The 205 PC letter, as a document** | **Text only** — the letter is speech in the briefing and in the Band-Speaker's mouth, not an artefact the format carries |
| In-mission character speech, heard | **Heard** (#381) — the channel [mission-sorrowgate.md](mission-sorrowgate.md) §13 records, and the [audio-direction.md](audio-direction.md) §13 hail under every line |
| The mix — a dome that is always there, a line that walks, and three clouds going out from the west | Not started ([audio-direction.md](audio-direction.md)). The one sound this document most needs the mix to own is a bed dying: a structure lost, at 18 for three minutes, in water the player has learned to hear as silence |

### One question this document does not settle

**Where the households sleep.** This document seats them at 1,790 m so that no row *Deep
Furrow* asks for has to land before this mission can be built, and gives the fiction a
reason. That scaffolding is gone: the row landed (#391), *Deep Furrow* spends it, and this
mission was built at 1,790 m anyway — so the seat is a design choice made rather than a
dependency dodged, and it should now be defended or moved on its own merits. A hiding
mission on the garden floor, at 2,200 m under beds grown at 2,200 m, is the version the
campaign's thesis describes: safe by depth, and then hunted there. It is cheap to try —
`pressureBonus: 1` on a rectangle over the furrows, and one depth per seat — and every figure
in §7 survives it, because the cloud is horizontal and detection is. What does not survive it
is §9's window. The climb becomes eighty-seven seconds instead of fifty-nine, twenty-seven
seconds more on every hull, against three minutes of empty throat that §8's clean run already
spends on a crossing and a climb. Whoever moves the seat re-prices the window in the same
edit, and that, rather than the grant, is why it did not move here.

---

## Related

- **[campaign.md](campaign.md)** — §5 row 5, whose mission this specifies; §2 rule 5, whose second concrete pair §11 makes; §10, whose telegraph and objective-text rules it is written under
- **[mission-deep-furrow.md](mission-deep-furrow.md)** — The Second Seeding 4: the furrow, the map literal this mission reuses unchanged, the observer that went below, and the households that stayed
- **[mission-radicals.md](mission-radicals.md)** — The Second Seeding 6: the column Anholt's sentence sends south, and the guns that came up struck
- **[mission-second-seeding.md](mission-second-seeding.md)** — The Second Seeding 7: the same bed on the lip, the same people under it, on the concern's day
- **[mission-convocation.md](mission-convocation.md)** — The Second Seeding 3: Teel's guns that nobody voted for, the ping handed over and priced, and the first reused map
- **[mission-thin-water.md](mission-thin-water.md)** — the count agreed in daylight, the two terminal rows, and the housings going quiet from the east
- **[mission-sorrowgate.md](mission-sorrowgate.md)** — the pattern; the array lost to a beat; *nothing follows you up*, which the doorway is seated against
- **[mission-baffle.md](mission-baffle.md)** — §7, a mooring corrected in closed water, which is the shape the beds' correction is written in
- **[mission-intake.md](mission-intake.md)** — a mission that runs its length, a standing count, and a Sounder driven at a depth
- **[mission-standing-wave.md](mission-standing-wave.md)** — §13, the player-built structure at 600 m this document's beds are grown early to avoid
- **[factions.md](factions.md)** — the Veil, the Listeners, and the letter of 205 as each side reads it
- **[units.md](units.md)** — the four signature structures, the Chorister's two ratings, and the roster this mission is priced in
- **[systems-echo.md](systems-echo.md)** — §3, the layer and the duct the doorway is seated in; §8, the one symmetric aura
- **[systems-depth.md](systems-depth.md)** — §2, the silent climb that is the way out, and the band line ten metres below the seat
- **[systems-combat.md](systems-combat.md)** — §4 and §7, range in three dimensions and *in range implies heard*, which decide §6
- **[bestiary.md](bestiary.md)** — the Hollow's trigger model on the walls, and the colossus that grinds nothing the plateaus own
- **[habitats.md](habitats.md)** — §2, the one dry room, where the letter has been for nine years
- **[culture.md](culture.md)** — §3, the register that cannot command, quoting the one that cannot claim agency
- **[characters.md](characters.md)** — Marr, Anholt and Teel, and the line Teel holds from the inside
- **[maps.md](maps.md)** — how a mission map is written, and why this one is not in the catalogue
- **[glossary.md](glossary.md)** — mission outcome, and why a tide turning is not a timer
