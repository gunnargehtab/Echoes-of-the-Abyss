# The Second Seeding 2 — Thin Water

> The second mission of the Commune campaign ([campaign.md](campaign.md) §5), specified. The
> twelfth mission document the bible carries, to the pattern
> [mission-sorrowgate.md](mission-sorrowgate.md) sets: everything here is authored — the
> forces, the water, the beats, the numbers and the text — and code transcribes this document.

**Setting:** the Kell Shoulder, the bare ground between Kell Plateau and Marr, 214 PC
([world-map.md](world-map.md); [characters.md](characters.md)).

**Mission id:** `seeding-thin-water` — namespaced by campaign after `seeding-tend`, per
[campaign.md](campaign.md) §1.

**This is the campaign's first stated loss.** [campaign.md](campaign.md) §2 rule 4 — "Three
missions across the campaign are *unwinnable as fights* and winnable as evacuations, retreats
or refusals" — has been a design rule since the epic opened and has never had a document under
it. Sorrowgate has no combat you can win, but it is the prologue and it is not an evacuation.
Whatever this document decides about how a mission is lost as a fight and won anyway, the other
two rule-4 missions inherit, which is why §8 is the longest section here and says its reasoning
out loud.

---

## 1. What the Kell Shoulder Is

Two garden terraces, and four kilometres of nothing between them.

Kell Plateau is the terrace that shared a name and a fate with the Consortium sector above it:
the 197 PC flood front crossed it, four thousand farmers got out, two hundred did not, and the
Commune has never renamed it and never will ([world-map.md](world-map.md);
[timeline.md](timeline.md)). It was replanted. The kelp grows. Its bloom came early this tide,
which is the whole reason anybody is out here.

Between Kell and Marr the rise is bare — scoured rock in the Shelf band, too shallow for the
trench country's cold and too swept for kelp to take. It is the shortest way between the two
plateaus and it is the only ground in the Commune's own country that the Commune's numbers do
not describe.

**Eighteen is a kelp number.** The Commune's entire acoustic identity is a single figure — a
working plateau harvests at 18 SIG where everyone else harvests at 50 ([economy.md](economy.md)
§3; [factions.md](factions.md)) — and that figure has always been quoted inside Kelp Forest,
where absorption takes 45% of it back before it reaches anybody
([environments.md](environments.md)). The shoulder is Open Water. PF 1.0. Nothing is taken
back.

| Water | PF | What a loaded tender at 18 carries as |
| --- | --- | --- |
| The gardens, either terrace | 0.55 | 9.9 — the number the Commune's whole economy is built around |
| **The shoulder** | **1.00** | **18 — the same hull, twice as far** |
| The vent under-run, below the corridor | 0.45 | 8.1 — quieter than home, and 300 m deeper |
| The Kell slope, off the southern edge | 1.60 axial | 28.8, down the axis, to anything listening in the deep |

The column does not get louder in this mission. The water stops protecting it, which the
player experiences as the same thing and is not. That distinction is the mission.

**Thin water.** [culture.md](culture.md) §3 lists *thin* in the Commune's vocabulary as a word
said **of a person** — brittle, over-extended — and the title means that first: a column of ten
tenders sent four kilometres past the last kelp, because the bloom was early and the turning
needs seed stock, is thin in exactly the sense the Commune uses the word about someone it is
worried about. It happens to also be literally true of the water, which has nothing in it to
stop a sound. The Commune did not name the ground twice by accident. Neither does this
document.

---

## 2. Whose Hulls the Player Commands

**The player commands the column Marr Plateau sent to Kell for the early bloom: ten loaded
tenders, two watch scouts, and two escorts — the whole of what the Commune fields as
armament.**

The escorts are new. [mission-tend.md](mission-tend.md) §2 put no weapon on any hull in the
player's force, "not struck ceremonially, as the court struck them, but simply not grown", and
this mission grows two, once, because the player has to find out what they are worth. They are
worth something. They are not worth enough, and the arithmetic of why is in §6 rather than in a
scripted invulnerability.

**Why the column is out here at all is the Commune's own doing.** Tend closed on the turning —
*the plateaus are asked to turn a second seeding* ([mission-tend.md](mission-tend.md) §9,
15:00) — and a second seeding needs seed stock before the count that authorises it has
finished. Kell's bloom came early. Ten tenders went, which is more than Marr would have sent
and exactly what Anholt asked for, and the count has not closed on whether they should have.
[campaign.md](campaign.md) §2 rule 1 forbids villains, and it does not exempt the player's own
faction: nobody put this column in thin water except the Commune, and Anholt says so at the
close (§12).

**Engine bound, stated so nobody corrects it into a bug.** The column carries the Commune
faction value; the corridor's works party and its escort carry the Consortium's. Two factions,
one mission, no lobby — a mission seats its own parties
([mission-sorrowgate.md](mission-sorrowgate.md) §2 established the pattern).

---

## 3. The Column

| Hull | Count | Stats | Why |
| --- | --- | --- | --- |
| Tender | 10 | Harvester hull, Commune-grown · **SIG 18 loaded** / 8 idle · HYD 30 · PR-1 ([units.md](units.md)) | The count. Ten is more than the plateau would ordinarily risk and precisely what the early bloom asked for. HYD 30 is below the mark-reading floor ([systems-echo.md](systems-echo.md) §7): a tender cannot hear for itself, which is why the watch exists and why losing the watch is worse than it looks |
| Light Scout — the watch | 2 | SIG 6 idle / 12 cruise · **HYD 70** · PR-1 | The plateau's ears, doing the one job they have never had to do at speed. In Tend the watch bought the gardens four minutes of warning; here it buys the column the same four minutes and there is nowhere to spend them |
| Escort | 2 | Corvette hull, Commune-grown · SIG 28 / 28 / +25 firing · HYD 50 · PR-2 · **armed** | The Veil's whole answer to a fight it did not choose. Two hulls, both of which the player will probably spend, neither of which is in the count (§8) |

**Souls, authored per hull.** `MissionUnit.souls` exists to be "read out at the close. 'Nine
are out.'", and this is the mission it was carrying that comment for. The ten tenders carry
**4, 6, 9, 5, 7, 3, 11, 6, 8 and 9** — sixty-eight people, unevenly, the way a plateau crews
its freight by household rather than by berth count. The watch carries two apiece and the
escorts four. Nothing in the HUD ranks them and nothing sorts them; a player who wants to know
which tender holds eleven has to have read the load-out.

### What the column does not carry

1. **No active sonar.** [campaign.md](campaign.md) §10 withholds the ping until mission 3, and
   this is the mission where the withholding is a mercy rather than a rule: for a column
   trying to leave without being followed, an instrument whose entire function is to be heard
   would end the mission it is about ([systems-echo.md](systems-echo.md) §5).
2. **No throttle.** As Tend: the Commune's working figure is bred into the equipment, not set
   by a lever ([mission-tend.md](mission-tend.md) §3).
3. **No construction, no reinforcement, no base.** There is nothing to build with and nothing
   to build it on. The ten hulls at 00:00 are the ten hulls at 14:00, minus whatever the
   corridor takes.

**Silent Running is present, and this is the mission where it is the wrong button.** Tend
taught it as the answer: stop the work, drop to single digits, let the sweep pass, pay for it
in share ([mission-tend.md](mission-tend.md) §4). Here the price is the other one in the same
sentence — Silent Running costs a Commune hull −20% speed ([factions.md](factions.md);
[systems-echo.md](systems-echo.md) §6) — and a column that goes silent on the shoulder is a
column that is still on the shoulder four minutes later, with the corridor closing at a rate
that is not affected by how quiet it is. The button works. It works perfectly. It is simply
not what is being asked, and a player who reaches for it because it saved the last mission
will lose tenders learning that a tool has a domain.

That inversion is the whole of this mission's relationship to the last one, and it is done with
no new mechanism at all.

---

## 4. Withdrawal Under Contact

The system this mission teaches, per [campaign.md](campaign.md) §2 rule 2: one system,
introduced in the first three minutes and load-bearing by the last five. The system is
**leaving** — and it is a system rather than a mood because the format already contains the
rule that makes it cost something.

**A tender moves only while an escort is within `escortRadiusM`.** The mission format's escort
hold, authored in [mission-sorrowgate.md](mission-sorrowgate.md) §3 for deaf freight in a
drowned district and priced differently in [mission-asset-recovery.md](mission-asset-recovery.md)
§3, does its third and hardest job here. Every second the escorts spend facing the corridor is
a second the tenders behind them are not moving. There is no way to fight and withdraw at the
same time, and the player discovers this not from a briefing line but from ten hulls quietly
stopping.

That single rule produces the mission's four decisions, none of which is scripted:

1. **How far forward to put the escorts.** Forward buys the column bearing-quality
   uncertainty; forward is also where the escorts die, and a dead escort strands whatever it
   was holding.
2. **Whether to run the crossing as one column or as two.** Two crossings are two chances to
   be under a listener's threshold and two sets of tenders that have to be held by one escort
   each.
3. **Which tenders lead.** The column is not interchangeable — it is sixty-eight people in ten
   uneven parcels (§3), and the order of march is who gets across first.
4. **Whether to spend the watch.** Two Light Scouts at 6 SIG are the only hulls that can be
   somewhere loud without being the reason it is loud. Sent east to be heard, they buy the
   column its crossing and they do not come back. Nothing in the mission suggests this and
   nothing forbids it.

### The SIG budget

**SIG budget: 30**, a ceiling — the loaded column moving, escorts at cruise, nobody firing.

The figure is chosen to be almost exactly what the same column would read at 55 in its own
gardens, and the document states the arithmetic rather than the vibe: 30 through PF 1.0
delivers what 55 delivers through 0.55. **The Commune's safety margin was never a property of
its hulls.** A player who exceeds the budget does so by firing, and firing is what raises the
column from a bearing to a classification (§6). The budget is therefore not a scolding — it is
the trigger, and it is the player's hand on it.

---

## 5. The Parties

| Party | Force | Posture |
| --- | --- | --- |
| **The column** (player) | 10 tenders, 2 watch, 2 escorts | Loaded, crossing west, in water that does not hide it |
| **The works party** | 1 Harvester-class tender rig, 2 Sentinel Turrets on the tension frame, structures | Re-tensioning a grid spur under a posted order. Loud, stationary, and not hunting anybody |
| **The corridor escort** | 2 Corvettes, 1 Cruiser | Standing off the frame. Klaxon posture: SIG 60+ sustained, audible for four minutes before it is anywhere ([factions.md](factions.md)) |
| **The second element** | 2 Corvettes, west along the spur | The closure. Never engaged, and the reason the mission ends |
| **The Drift** | 1 Draymaw pack, on the Kell slope | The audience. Drawn up the slope by the exchange, arriving after it, and a fact about what the shoulder sounds like afterwards ([bestiary.md](bestiary.md) §4) |

Naming follows [culture.md](culture.md) §4. **Corridor Warden Anse Rell** — no hyphen; he has
not been elevated and will not be — commands the escort and speaks four times, three of them
procedure. **Bloomwright Idris Kell** is aboard the column, named for the plateau in the
Commune's ordinary way, which means named for two hundred people who did not get out of it in
197 PC. Nobody in the mission remarks on this. Tidespeaker Ysolde Marr speaks from home and
orders nobody to do anything; Bloomwright Sefa Anholt speaks once, at the end, and it is the
first time in the campaign he is right.

---

## 6. The Corridor

**The Consortium is not hunting the column, and the mission has to make that legible in the
first ninety seconds or it becomes a mission about villains.**

The grid spur above Kell is under a works order: a line re-tensioning, scheduled, filed, and
posted as a closed corridor for the tide. This is ordinary — [world-map.md](world-map.md) has
the thermal grid running the west wall and "whoever runs the grid runs the air", and a closure
notice against a tensioning job is the least interesting document the Consortium produces in a
year. The corridor crosses the shoulder east to west. The short way home crosses the corridor.

**What Rell has, and what he does not.** The escort's listeners resolve the column the way the
Echo Layer resolves everything, per observer, at whatever the propagation model gives them
([systems-echo.md](systems-echo.md) §3–§4). A loaded tender at 18, through PF 1.0, at corridor
range, comes up **Tier 2 — Bearing**: direction and rough distance, blurred to ±15%, and *no
unit type*. Classification is 2.5× threshold, which on this water means close. So:

- Rell has a bearing inside a closed corridor and no idea what it is.
- Procedure for an unidentified transit inside a posted closure is to challenge it and require
  an asset number and a charter reference.
- **A Commune tender has no asset number.** There is no such thing. A plateau's freight is
  grown by the plateau and belongs to the bloom ([factions.md](factions.md)), and the concern's
  form has no field for that.
- The answer the column gives is a Commune answer — collective, an opening position, no number,
  and phrased as an offer ([culture.md](culture.md) §3). Rell receives it as a non-answer,
  because in his register it is one.

He escalates by the book, at the book's pace, and the book was written for salvage poachers on
the west wall. By the time anything in the corridor is at Tier 3 and somebody can see that the
contacts are unarmed freight, two Corvettes have committed and the column is running, and a
running unidentified transit is, procedurally, the thing he was posted here to stop.

**Nobody is stupid and nobody is cruel.** The resolution tier system — the game's oldest and
most central mechanic — is what kills these people, and it does it by working exactly as
specified. That is [campaign.md](campaign.md) §2 rule 1 satisfied at its hardest, and it is
also the reason the mission is anchored to sound rather than to plot: the atrocity is a
propagation calculation.

**And the fight is unwinnable for reasons the player can hear and count.** No hull in this
mission is invulnerable and no beat is unlosable. The arithmetic is simply the roster
([units.md](units.md)):

- Two Commune Corvettes, 28 SIG, PR-2, against two Consortium Corvettes and a Cruiser — 1,200
  HP, heavy sensors, and **+12% damage while SIG > 60**, which the Klaxon posture guarantees is
  true of them for the entire engagement ([factions.md](factions.md)).
- The escort is repaired and reinforced from a works party two kilometres away. The column is
  not reinforced at all.
- The Commune's own doctrine document says the outcome in a sentence: "A Commune army caught in
  the open by Consortium heavies simply dies." This mission is that sentence, played.

A player who fights well kills a Corvette and loses both escorts, which is a real and
worthwhile thing to have done and does not change the shape of the mission by one tender. The
document is explicit about this so that no later balance pass reads the loss as a difficulty
bug.

---

## 7. What Is Heard

The mission's clock is made of sounds the player already knows how to read, which is the
dividend Tend paid for.

**The spur sounds.** Seven pump housings stand along the corridor at intervals, and each is a
periodic emitter — a working machine, struck on its own schedule, audible, locatable, not a
unit ([mission-asset-recovery.md](mission-asset-recovery.md) §6 established the shape). From
00:00 the player hears the corridor before seeing anything of it, as a rhythm running east to
west across the map.

**The heavies arrive as noise, four minutes early.** The Klaxon telegraph is not a courtesy the
mission extends; it is the Consortium's stated weakness ([factions.md](factions.md)) and the
player gets the whole of it. There is enough warning here to cross ahead of the escort. Losing
tenders is what happens to a column that spends that warning on anything else.

**And the second element arrives as silence.** This is the mission's own contribution, and it
is the sixty-second telegraph [campaign.md](campaign.md) §10 requires. A heavy running west
along the spur passes each pump housing in turn and masks it. So from 09:00 the player hears
the housings go out one at a time, from the east, at a walking pace — a countdown made
entirely of things stopping. Nothing announces it. Nothing labels it. A player who spent
mission 1 learning that quiet is a signal reads it immediately; a player who did not hears
seven machines and then six.

**At 12:00 the last housing before the crossing goes quiet.** Sixty seconds. That is the whole
warning, it is diegetic, it is subtraction, and it is the campaign's second-mission answer to
the question of what the first mission was for.

---

## 8. The Objective

**Get the column home. Six of ten is what the plateau agreed to call the column, and it agreed
to it at the load-out, before anyone had to say it under fire.**

### Sixty per cent of what

[campaign.md](campaign.md) §5 row 2 says "get 60% out" and does not say sixty per cent of the
hulls, the crews or the harvest. Those are three different missions and the format expresses
all three, so this document chooses rather than discovers, and states the choice where a
reviewer can find it.

**The count is hulls. The reading is people. The harvest is not counted at all.**

The terminal objective is one `extract`-shaped row — `{ kind: 'extract'; role: 'tender';
region: 'holdfast-gate'; count: 6 }` — and three things follow from what it does *not* carry:

- **No `loaded` flag.** The predicate's optional `loaded` counts only hulls carrying a
  completed lift, and authoring it here would make the harvest the mission. A tender that
  arrives empty is a tender that arrived.
- **No `deliver` row.** The nodule predicate exists and is not used. What the column banked is
  a fact the close may state and is never a rung on the ladder.
- **`souls` on every tender, and the close speaks in them.** Sixty-eight people ride ten hulls
  in parcels of 4, 6, 9, 5, 7, 3, 11, 6, 8 and 9 (§3). Six hulls out is **thirty-one people or
  it is fifty**, and which it is, is entirely the player's order of march. The count is the
  same in both runs. Nothing else is.

That last line is the argument for the whole arrangement, and it is worth stating plainly:
counting hulls and reading souls is what makes the sixty per cent a *choice* rather than a
score. If the objective counted people directly, the mission would sort itself — save the
eleven, save the nine, save the eight — and the player would be doing arithmetic. Counting
hulls and pricing them unevenly in lives is a mission about which tenders you turn back for,
which is the Commune's own question, asked in the Commune's own units. The Commune counts
people; it does not rank them; and it has no vocabulary at all for ranking freight.

**The alternative reading, recorded rather than dismissed.** Sixty per cent could as honestly
have meant the harvest — `loaded`, or a `deliver` row, in a faction whose economy is
bloom-share and whose losses are eaten next season — and that mission's middle five minutes
would be about jettison rather than triage: drop the load, run faster, arrive with people and
nothing else. It is a good mission. It is not this one, for two reasons that are stated here
so the trade is visible: the format has no jettison, so the choice would have to be authored as
something else (§13); and a mission about dropping cargo asks the player to give up a *thing*,
where this one asks them to give up a *hull with people in it*, and rule 4's first document
should ask the harder question, because the other two rule-4 missions will inherit whichever
one it asks.

**Terminal at six, and the outcome ladder falls out.** `MissionOutcome.Partial` already carries
the rung this mission needs — "Some of it. Not a failure — a result, and the mission says so
out loud" — so no new predicate and no new outcome is required, and this document reports that
it agrees with the format rather than asking it to move.

### Results

| Result | Condition | Marr's reading |
| --- | --- | --- |
| **The column is home** | Six or more tenders through the gate | "Six was the number and you brought us more than the number. We're going to say the count out loud tonight, all of it, the ones who came back and the ones who didn't, because a plateau that only reads the good half of a count has started owning things." |
| **Some of the column** | One to five | "Fewer than we agreed. We agreed the number in daylight so that nobody had to be the one who said it out here, and it still fell to somebody, and we're sorry it was you. This is a result. We're not going to let anybody call it a failure and we're not going to let anybody call it enough." |
| **Nothing came back** | No tender at the gate | "The count is nobody. We're not turning that tonight. We'd like somebody to sit with the names until morning and then we'll begin." |

Two further readings hang off their own objectives and print beneath whichever row the run
earned, in the arrangement [mission-shift-change.md](mission-shift-change.md) §8 built:

- **All ten** — a non-terminal objective, revealed at 00:00 and unmet in almost every run. Met:
  "Ten went and ten came back and that has not happened to a column in thin water in living
  memory. We'd like you not to conclude anything from it." Unmet: "The gate counted what it
  counted. The rest of the count is a list of names and the list is read at the tide, not
  here."
- **The escorts** — `{ kind: 'survive'; role: 'escort'; count: 2 }`, and the unmet reading is
  the one the campaign is actually about: "We grew two hulls that could shoot and we spent them
  both in eleven minutes buying a crossing. Sefa is going to say what that means and he's going
  to be right, and we would like a night before he says it."

The watch is in no objective at all. Two Light Scouts sent east to be heard is a legitimate and
unhinted solution (§4), and the mission declines to grade it in either direction.

### The failure, and the sounds that precede it

**The mission is not failed on a timer and does not end on one.** The corridor closes at 13:00
because the second element arrives, and the second element has been audible since 09:00 as the
pump housings go dark from the east (§7). The last housing before the crossing goes quiet at
12:00, sixty seconds out, which is [campaign.md](campaign.md) §10's requirement met by
subtraction rather than by an alarm.

At the closure, any tender still south of the spur is cut off: its route home is inside a
corridor with a Cruiser at each end, and its share of the terminal count fails on the beat.
The mission then runs one more minute — the count is read at 14:00 with the shoulder quiet
again except for the pack coming up the slope, which arrived for the noise and stayed for what
the noise left.

---

## 9. Length, SIG Budget, and the Beats

**Length: fourteen minutes.** Inside [campaign.md](campaign.md) §10's 12–25, and at the short
end deliberately: the mission is one continuous withdrawal and a longer one would be the same
decision taken four more times.

**SIG budget: 30**, a ceiling — §4.

| Time | Beat |
| --- | --- |
| 00:00 | The load-out at the Kell face, last kelp, the bloom aboard. The spur already sounding, seven housings east to west. Marr speaks the briefing from home and agrees the number (§12) |
| 01:30 | **Idris Kell reads the count: ten hulls, sixty-eight aboard.** The only time the number is said before the close, and it is said as a fact about people, not as a target |
| 02:30 | **The column clears the last kelp.** The watch says what that means, once, in one sentence, and the player's own exposure readout says it again in a number ([systems-echo.md](systems-echo.md) §9) |
| 04:00 | **The works order.** The corridor arrives as noise — the tension frame, the escort standing off it at 60-plus, four minutes of Klaxon telegraph in front of anything at all |
| *(fired by exposure, not the clock)* | **The challenge.** Rell asks a bearing for an asset number. The condition is the column standing at Tier 2 in the corridor's ears — the player's own exposure tally, not a trigger volume (§13) |
| 06:30 | **The first pass.** Two Corvettes commit. The escorts answer, and ten tenders stop moving, because that is what the escort hold does (§4). The lesson lands here and it lands as a UI event, not as a line of dialogue |
| 08:00 | **The Cruiser comes up the spur.** The arithmetic of §6, arriving. Nothing about it is scripted and nothing about it is survivable |
| 09:00 | **The first housing goes quiet.** Nothing announces it |
| 09:00–11:30 | The housings go out from the east, one at a time, at a walking pace |
| **12:00** | **The last housing before the crossing goes quiet.** Sixty seconds |
| **13:00** | **The corridor closes.** Anything still south of the spur is cut off, and its share of the count fails on the beat |
| 13:30 | The pack comes up the Kell slope for the noise ([bestiary.md](bestiary.md) §4) |
| 14:00 | **The count.** Marr reads it (§8). Anholt is already speaking (§12) |

The corridor escort's movements are authored transits, not patrol AI, for the standing reason
([mission-sorrowgate.md](mission-sorrowgate.md) §9): a mission's beats happen at the time the
document says they happen. The works order is why; the beats are when.

---

## 10. What It Teaches

One system, per [campaign.md](campaign.md) §10: **withdrawal under contact** — that leaving is
an action with a cost, that the cost is paid in the thing you are leaving with, and that a
faction which loses every fight it did not choose has to be *good at this* or it has nothing.

It lands in four places across §9: the escort hold discovered at 06:30, the order of march
priced from 01:30 onward, the wrong button available and useless the whole way (§3), and the
crossing itself, where the system is load-bearing.

**And it teaches the last mission again, backwards.** Tend's dividend is spent here in three
places, none of them explained: quiet as a signal (the housings), the watch's four minutes (the
telegraph), and the 18-SIG figure the player learned to trust in water that returns 45% of it.
A player who has not played Tend can complete this mission. A player who has, understands it.

What this mission deliberately does not teach:

- **Convocation and mass mobility** — mission 3, Marr's own ability, in the one situation her
  office exists for, and pointedly the mission *after* the one where consensus could not be
  convened in time.
- **Seeding and the bloom as an instrument** — missions 4 and 5. The seed stock this column was
  sent for is what mission 4 plants, and the campaign wants the player to have carried it
  before they plant it.
- **Fighting well.** Nothing here is a combat tutorial and the mission would be worse if it
  were. The escorts exist to be spent.
- **The ping** — [campaign.md](campaign.md) §10, and §3's reason: it is the button that would
  end this mission fastest.

---

## 11. The Map

`kell-shoulder` · **The Kell Shoulder** · one seat · 5,000 × 3,000 m · cell 250 m · base floor
340 m.

Open Water ground on the Rift's north shoulder, between two Commune terraces, with the Lid's
pale glow still overhead and no kelp under it. North is shallow and home; south is the drop, as
everywhere in the Rift.

| Region | Rect (x, y, w, h) | Biome | Floor | What it is |
| --- | --- | --- | --- | --- |
| The Shoulder | 0, 0, 5000, 3000 | Open Water | 340 | The bare rise. Painted first; everything else is cut into it. **PF 1.0 — the thin water, and the mission's whole argument** |
| The Grid Spur | 0, 1250, 5000, 500 | Open Water | 420 | The closed corridor: pipe, cable, tension frame, seven pump housings. It crosses the map east to west and getting across it is the mission |
| The Kell Slope | 0, 2500, 5000, 500 | Abyssal Trench | 900 | The shoulder's southern edge falling away. Trench paint at Shelf's edge — biome is acoustics, not band ([mission-asset-recovery.md](mission-asset-recovery.md) §11): nothing the column wants is down there, and everything that hears it is |
| The Vent Under-run | 1750, 1750, 1000, 750 | Thermal Vein | 620 | The geothermal field the spur draws from. PF 0.45, the map's one mask, and it lies *below* the corridor: the quiet way is the deep way, it is 280 m down, and it is longer than the time the housings are counting out |
| Kell Face | 3750, 1750, 1250, 750 | Kelp Forest | 300 | The replanted terrace's working face and the early bloom. **The spawn.** The last water in which the column's own numbers are true |
| The Marr Approach | 0, 250, 2000, 750 | Kelp Forest | 280 | Home terrace's outer rows. The first kelp on the west side, and the first water where 18 means 18 again |
| The Holdfast Gate | 250, 0, 1000, 250 | Kelp Forest | 260 | **The extraction region.** The count is taken here |

One spawn, at the Kell face: 4375, 2125. No nodule fields, no crystal, nothing to build, no
hazard sites — the load is already aboard and the weather is other people. Two markers: the
gate, and the crossing.

The regions are painted in the order the table reads, per [maps.md](maps.md)'s "How a map is
written", and every rectangle lands on the 250 m cell grid and paints exactly the metres it
reads. The Draymaw pack enters by authored `creature` beat at 13:30 on the slope; the pump
housings are authored emitters with staggered end-ticks (§7, §13).

**The Kell Shoulder is a mission map and is not in the public catalogue.** One seat, not
balanced, resolved by mission id and nothing else ([maps.md](maps.md)).

---

## 12. The Briefing

Spoken by Tidespeaker Ysolde Marr at the load-out, from Marr, on the plateau channel. She is
not aboard and could not order the column if she were. [campaign.md](campaign.md) §10 says the
Commune's refusal of the imperative mood makes their briefings genuinely harder to parse and
that this is the point; this is the mission where it costs the most, and the briefing's job is
to pay that cost in advance instead of under fire.

> We're not going to tell you what to do out there. That hasn't changed and we're not going to
> change it today of all days, because today is the day somebody will wish we had.
>
> The bloom at Kell came early and the turning wants seed. Ten went. We think ten was more than
> the shoulder is owed and the count didn't finish before the tide did, so ten is what's out
> there, and that's ours, not yours.
>
> Here's the thing we're saying now while it's daylight and nobody's frightened. We'd like six
> of you home at the least. We're saying the number here so that nobody has to say it out there
> — so that when it's loud, it's already been agreed, and no one aboard has to be the person
> who decides that six is enough. Six isn't enough. It's what we agreed.
>
> The concern has a line closed above Kell. They'll have posted it. They post everything. If
> they ask you what you are, you won't have the answer they're asking for, and we'd rather you
> spent that second moving.
>
> There's no kelp between Kell and here. You know that. We're saying it anyway, because the
> number on your hull was measured somewhere with kelp in it.

### Objective readings, in play

The Commune cannot command, so its objectives arrive as statements of what has already been
agreed, and the player hears the ask inside them. The number is in the text from tick zero,
which is the point:

- *Six of you home would be the column. We agreed that at the load-out.*
- *We'd like all ten. We're saying it because it's true, not because it's the number.*
- *The line above Kell is closed and we don't have the paper they want.*
- *The escorts are yours to spend. We'd rather you had to.*
- *That's the third one gone quiet. Somebody's walking west along the pipe.*

The fourth line is the hardest sentence in the document and it is the one that makes this
briefing work. It is not an order to sacrifice the escorts and it is not permission — it is the
Commune saying what is true about a resource and declining to tell anyone what to do with it,
which is the register doing its job at the moment it is most inconvenient.

### The voices on the water

**Bloomwright Idris Kell, reading the count — 01:30**

> Ten hulls. Sixty-eight aboard, and I've got them by household, not by berth, so if anybody
> asks you later how many that is you say sixty-eight and you don't round it.

**The watch, clearing the last kelp — 02:30**

> That's the last of the green. You'll want to know that the number on your hull just went up
> without you doing anything. It didn't. The water did.

**Corridor Warden Anse Rell, on the open channel — the challenge**

> Bearing zero-four-one is inside a posted closure. Transit will state an asset number and a
> charter reference. This is not a threat and it is not a negotiation; it is the second time of
> asking, and there is a third.

**Rell, once, after the first pass**

> Log it as an unidentified transit that declined to identify. I want the time on it. I want
> the tape.

**Rell, at the closure — 13:00**

> The corridor is closed and the order is discharged. Whatever entered it is a matter for the
> registry now, and the registry is patient.

**Bloomwright Sefa Anholt, at the count — 14:00**

> I asked for ten. I'd like that in the record, because Ysolde will try to put it in hers.
>
> Here's what I'm going to say at the turning and I'm saying it here first, once, quietly, out
> of respect for the count. We were thin out there. We're thin everywhere. We have been thin
> for two hundred years and we've called it an arrangement, and today it cost us people in
> open water because we had nothing to put between them and a man doing his job by the book.
>
> I'm not asking anybody to agree tonight. I'm saying I'll ask.

Each line fails [culture.md](culture.md) §3 for the other three factions, which is that
document's own test (§6). Kell's refusal to let a number be rounded is the Commune counting
people in a grammar the Consortium has no field for; the watch's line hands the player a fact
and declines to say what to do with it, which the Directorate would formalise into a rite and
the Knights into a courtesy; Rell's challenge states a cost without pricing it and threatens
nobody while being entirely a threat, which is the language of instruments at its most exact;
and Anholt's speech is the only one in the campaign so far where a Commune speaker announces
that he will ask — a future imposition, flagged in advance, which is as close to the imperative
mood as the register can come and which the register makes him pay for by saying it out loud in
front of the dead.

---

## 13. Scaffold Status

What exists against this document and what does not, continuing the list
[mission-asset-recovery.md](mission-asset-recovery.md) §13 started. **This document is built**:
`kell-shoulder` and `seeding-thin-water` ship with tests, and the prediction the table below
made held — the format was asked for nothing new. [campaign.md](campaign.md) §11's "other three
campaigns" row carries where the queue stands now.

| Requirement | Status |
| --- | --- |
| The mission format — beats, predicates, registry, private rooms | **Built** (#190). `extract` carries the count; `survive` carries the escorts; `creature`, `say`, `objective`, `move` and `resolve` cover §9's schedule |
| **The escort hold** — a tender that moves only while an escort is near | **Built** — `MissionDefinition.escortRadiusM`, authored for Sorrowgate's deaf freight and priced again in [mission-asset-recovery.md](mission-asset-recovery.md) §3. This mission asks nothing new of it and hangs its whole teaching load on it (§4) |
| **`souls`, authored per hull and read at the close** | **Built** — the field and its comment ("read out at the close. 'Nine are out.'") predate this mission by three documents. §8 is the first document to make the close's arithmetic depend on which hulls carried whom |
| **The pump housings** — a countdown made of sounds stopping | **Built** — `MissionEmitter` with `untilTick`, the window [mission-attendance.md](mission-attendance.md) §13 asked for, used here for seven emitters with staggered ends rather than for one arrival. The sixty-second telegraph is an emitter going quiet, which is [campaign.md](campaign.md) §10 satisfied without a new mechanism |
| **The challenge, fired by being heard** | **Built and authored** — a conditional beat on `{ kind: 'tolerance'; ticks; tier }` at four minutes of Tier 2, the exposure tally of [mission-aptitude.md](mission-aptitude.md) §5 and the condition-fired beat of its §13. **The caveat this table used to carry was wrong and is corrected here.** It read that the literal is honest "only because the corridor's escort is the only listener authored on this map", and it never could have been: §5 stands two Sentinel Turrets on the tension frame, structures are granted an acoustic component when they are placed, and the Echo Layer's listener set is every owned thing with one — so structures listen. Measured through PF 1.0, a loaded tender at 18 stands at Tier 2 to a turret's HYD 55 out to 1,663 m against a Corvette's 1,566 m and the Cruiser's 1,846 m, which means the frame hears the column *before* the hulls standing off it do. What makes the literal honest is not that there is one listener but that **every listener authored on this map is the corridor's** — the works party, the escort and the second element are one closure under one order, so "heard" and "heard by the corridor" are the same fact, and the mission's tests hold the map to that. A mission that wanted "heard **by this party**" would still be asking for a predicate that does not exist and, per the union's own information-safety note, probably should not |
| **The exposure the challenge reads, in a live match** | **Built** (#323), and it was a runtime gap rather than a gap in this document. A mission seated only the player's slot, and the Echo Layer materialised exposure for seated slots alone, so it never resolved *for* a scripted party and `EchoSnapshot.exposure` stayed at Tier 0 however close the corridor got — which held every `tolerance` conditional in [mission-aptitude.md](mission-aptitude.md) and [mission-tolerance.md](mission-tolerance.md) shut as well. `Match` now hands the Echo pass an observer list — the seated roster plus the mission's scripted parties — while `slots` keeps meaning seated commanders for victory, elimination and snapshot production. **Closing it moved one hull of this literal.** The second element waited at the north-east corner, 1,945 m from the muster's western Corvette, and an idle Corvette at 28 is Bearing to HYD 50 out to 2,065 m through PF 1.0, so the moment its ears were real it held the column at Tier 2 from the first pass and §9's "a column that never moves is never challenged" was false at rest. It now waits north of the spur mid-map, 2,250 m and further off every hull of the column; §5 pins neither position, and the 07:30 drop onto the spur's east end is a twenty-eight-second transit against the ninety before the first housing goes quiet. At rest the muster reads Tier 1 to the corridor's Cruiser from 2,600 m, which §6 prices as free, and `missionThinWater.test.ts` now holds both halves: the tally's tick arithmetic at the runtime, and the challenge fired off the frame's own ears in a live match |
| Open Water at PF 1.0 as a mission's central fact | **Built** — `PROPAGATION_FACTOR[Biome.OpenWater]` is 1.0 and has been since the model was written. §1's table is arithmetic over shipped constants, not a proposal |
| The map, its seven regions, trench paint on the slope and a vent under the corridor | **Built** — `kell-shoulder`, one row of the literal per row of §11's table, painted in the table's order and every rectangle on the 250 m cell grid. No new region shape, no new biome, no hazard sites, and not in the public catalogue |
| The mission definition `seeding-thin-water` | **Built** — and it needed one thing this document did not anticipate: §8's Results table has three rows and the runtime reads the outcome ladder off *how many* terminal objectives were met, so the middle rung needs a terminal row of its own. The literal authors `column` at six and `crossing` at one, which is the arrangement [mission-sorrowgate.md](mission-sorrowgate.md) §8 already uses for its count of fourteen. The ask the player is given is still six |
| **Jettison** — a load a hull can drop to move faster | **Not built, and deliberately not asked for.** `MissionLift` is hold-and-cut and rides its carrier to the end; there is no drop. §8's alternative reading is the mission that would need it, and this document chose the other reading partly so that a design question would not arrive disguised as a missing mechanism |
| Filed → this mission's briefing variant | **Not built** — [mission-tend.md](mission-tend.md) §8 promises that a *filed* Tend changes this briefing (the concern moves on charted water) and never its mission. That is [campaign.md](campaign.md) §11's progression row, still the same row, now with its second concrete case |
| Commune escorts as a distinct hull | Not needed — the Corvette in [units.md](units.md) with the Commune's faction values is what §3 fields. Nothing here asks for a new roster entry |
| In-mission character speech, heard | Text only, the standing status ([mission-sorrowgate.md](mission-sorrowgate.md) §13) |

---

## Related

- **[campaign.md](campaign.md)** — §5, whose second row this specifies; §2 rule 4, whose first document it is; §10, whose objective-text and telegraph rules it is written under
- **[mission-tend.md](mission-tend.md)** — The Second Seeding 1: the day this column is the price of, the quiet whose absence is this map, and the button that is wrong here
- **[mission-convocation.md](mission-convocation.md)** — The Second Seeding 3: the tide Teel walks into out of this one, still armed and still right
- **[mission-sorrowgate.md](mission-sorrowgate.md)** — the pattern, and the escort hold in its original form
- **[mission-asset-recovery.md](mission-asset-recovery.md)** — the Klaxon posture from inside, and the party on the other side of this corridor written as it sees itself
- **[mission-baffle.md](mission-baffle.md)** — the other mission about getting a slow thing across water somebody else has closed
- **[factions.md](factions.md)** — the Veil, and the sentence this mission is: a Commune army caught in the open by Consortium heavies simply dies
- **[systems-echo.md](systems-echo.md)** — §3, propagation; §4, the tiers that do the killing; §6, Silent Running's speed price
- **[environments.md](environments.md)** — the PF table §1 does arithmetic over, and Open Water as the water that takes nothing back
- **[economy.md](economy.md)** — §3, the 18-SIG harvest and the kelp it was measured in
- **[culture.md](culture.md)** — §3, the register that cannot command and the word *thin*; §4, the names
- **[characters.md](characters.md)** — Marr, Anholt, and the argument this mission hands him
- **[world-map.md](world-map.md)** — Kell Plateau, the two hundred, and the grid that runs the air
- **[bestiary.md](bestiary.md)** — the pack that comes up the slope for the noise
- **[units.md](units.md)** — the roster the unwinnable fight is unwinnable in
- **[glossary.md](glossary.md)** — mission outcome, and why a partial count is a result
