# Reading the Campaign in Play Order

> [#224](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/224) checked that the world's
> facts agree with each other. This document checks something else: whether they **arrive**.
> Internal consistency is a property of the documents read side by side. A player reads them one
> at a time, in an order they choose, and never sees two at once. Only the first test had been run.

---

## 1. What this is, and what it is not

**Reading history.** Sections 2–7 preserve the September reading, including findings that later
changes superseded. [Section 8](#8-independent-delivery-audit--4-october-2026) is the independent
follow-up for [#469](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/469): all 29 missions
checked for faction register and habitat treatment, with a current disposition of F1–F8.

This is a read of the text a player actually meets — the 29 briefings, the board's slot lines,
and the record's six era pages — taken in one play order, at the three checkpoints
[campaign.md](campaign.md) §1's shape suggests, asking the same three questions at each: what does
this player now know about the Rift, about the Mouth, and about the other three navies?

**The output is findings, not fixes.** Nothing here rewrites a briefing. Section 6 lists what the
read found, with both readings of each and what acting on it would cost; §7 lists what it found
working, because several of those are constraints [campaign.md](campaign.md) §2 imposes on purpose
and a finding that contradicted one would be wrong rather than interesting.

**Nothing here is *the* order.** [campaign.md](campaign.md) §1 is explicit that the order is free
after the prologue and that a global mission number "would have to assert an ordering the campaign
refuses to have". The order this read took is one of many, chosen because it is the one the shipped
board makes easiest: the prologue, then the leftmost column whole, then the remaining three
left to right — *The Ledger*, then *The Second Seeding*, *The Attending*, *The Second Chord*
(`campaignBoard.ts`'s `COLUMN_SOURCES`, in that order). Where a finding is a fact about *this*
order it says so, and §6 gives the arithmetic for the other three.

---

## 2. Checkpoint one — after the prologue

[Sorrowgate](mission-sorrowgate.md) alone: one mission, no economy, no combat that can be won.

**The Rift.** Sharp and sufficient. A court in a collapsed transit dome; a count of fourteen that
is closed and does not reopen; a silence that is a debt and is paid back; something in deep water
that the city put there before the count started. The one thing the mission is for — knowing
something is there, needing to know what, and having no safe way to find out — arrives whole.

**The Mouth.** Absent, and correctly. The three record pages a finished prologue enters — the
Surface Age, Year 0, the Descent — do not mention it. The thing under the gate is the colossus,
not the Mouth, and nothing in the mission invites the confusion.

**The other three navies.** Four registers, four titles, four people: Kalliso, Drenn, Sende, Teel.
What the player does **not** get from the mission is four *names*. The words *Consortium*,
*Commune*, *Directorate* and *Knights* appear six times in
[mission-sorrowgate.md](mission-sorrowgate.md) §12 and all six are the document's commentary on
its own register test; no line the player hears contains any of them. The naming happens on two
other surfaces, and they disagree with each other about how much to say — see finding **F8**.

---

## 3. Checkpoint two — after one campaign, read whole

*The Ledger*, seven missions, convergence and ending included.

**The Rift.** The strongest of the three answers. Face Six closed, Face Two meeting a terminal
projection, forty-one berths at the Deep Yard, two hundred and forty in Vayle, a model with a hole
in it, eleven years to insolvency. The concern's crisis is legible as an institution's problem
rather than a villain's plan, which is what [campaign.md](campaign.md) §2 rule 1 asks for.

**The Mouth.** Three sounds and a filing convention: point six returning the survey's own machinery
noise on a period the model has no column for; two returns on the lip that are "on file as
equipment fault", and Osk's note that the file is older than your opinion of it; and Item Nine,
continued at every sitting for one hundred and twenty-six years. The player is never told what any
of the three is. They are told, twice, in a register that prices everything, that the concern has
decided not to find out — which is a stronger answer to *will this be explained* than an
explanation would be. Working as designed; see §7.

**The other three navies.** This is where the read found the most. Across the Ledger's seven
briefings, a voice from another navy speaks **five times**: the Fourth Trench's Picket-Speaker
twice in [Baffle](mission-baffle.md), and the charting pair, the Watch-Speaker and the Order's
reconnaissance once each in [Prospect](mission-prospect.md). The Commune speaks once. The Order
speaks once. The same count for the other three campaigns is twenty-one ([The Second
Seeding](mission-second-seeding.md)), twelve (*The Second Chord*) and eight (*The Attending*).

So the campaign the board puts first is, by a factor of four, the one that shows the player least
of the other three — and it is the one whose convergence mission arrives at slot six. See **F2**.

---

## 4. Checkpoint three — after all four

Every retelling seen from both ends.

**What the player has been told twice.** Nine quoted blocks appear verbatim in more than one
mission document. Two are the Directorate's own liturgy repeating inside its own campaign — the
stalls' formula and Ossary's *Nothing* — which is the rite working. The other seven are two scenes
told from both ends in **identical words**:

| Scene | Missions | Verbatim blocks |
| --- | --- | --- |
| The Fourth Trench convoy | [Baffle](mission-baffle.md) (Ledger 3) ↔ [The Dome](mission-the-dome.md) (Attending 3) | Vail's missing beat, the Picket-Speaker's *counted*, the corrected mooring, Holt's *we can hear you* |
| The rim, tide D | [Prospect](mission-prospect.md) (Ledger 6) ↔ [The Second Seeding](mission-second-seeding.md) (Seeding 7) | The charting pair's *yet*, the Watch-Speaker's account and debt, the reconnaissance's courtesy to a mineral |

Both are across a campaign boundary. Neither changes by a syllable for a player who has already
heard it from the other side. See **F1**.

**What nobody told them that they needed.** One thing, and it is dated: the First Chord of 178 PC,
the reply that arrived forty-one seconds early, and the three technicians who have written ever
since. It is on the record's *Long Arrangement* page, and that page cannot be entered during a
first campaign — see **F4**. A player whose first campaign is *The Second Chord* stands in the room
with those three at slot five and is never told what happened in it.

**Where a briefing assumes a scene the player may not have played.** Once, by name, in
twenty-nine: [Shallow](mission-shallow.md)'s "Marr rang off-tide. The plateaus are turning a second
seeding, garden by garden." Every other cross-campaign reference in the whole campaign glosses
itself in its own register. See **F6**, and **F3** for the mission that does this best.

---

## 5. The order the record enters in

The record's admissions are conditions on what the player has *finished*
(`record.ts`, `Admission`), and they interact with a free order in ways worth having written down:

| Page | Admission | Earliest, in any order |
| --- | --- | --- |
| The Surface Age · Year 0 · The Descent | `prologue` | The prologue |
| The Settlement | `one-party` | Slot 1 of the first campaign |
| The Long Arrangement | `two-parties` | Slot 1 of the **second** campaign |
| The Present Crisis | `the-rim` | Ledger 6 or Chord 6; Seeding 7 or Attending 7 |

Two consequences fall out of the third and fourth rows. A first campaign, however completely it is
played, reads at most five of six pages (**F4**). And the Present Crisis page — which dates the
Kell flood, the Enclosure, Anholt's proof, the 205 PC letter, the nineteen, and the cycle measured
at thirty-nine — enters one slot *after* two of the lines that depend on it (**F5**).

---

## 6. Findings

Ranked by weight. Each states the fact, the reading that makes it a problem, the reading that makes
it the design working, and what acting on it would cost. **None is a fix, and none should be acted
on from this document alone** — each is a separate issue if it is one at all.

### F1 · The variant system has one scene, and it is inside one campaign

**The fact.** There is exactly one scene id in the game: `MARR_PLATEAU_FILED`, written by
`seeding-tend` and read by `seeding-thin-water` and `seeding-convocation`. All three are Commune
missions. Meanwhile three maps are shared across campaign boundaries — `sorrowgate`
(prologue ↔ Seeding 6), `kell-shoulder` (Seeding 2 ↔ Attending 4) and `mouth-rim` (all four) —
and the two scenes told in verbatim-identical words (§4) are both across one.

**Why it is a problem.** [campaign.md](campaign.md) §1 introduces the mechanism as "replaying a
scene you witnessed from the other side changes the briefing text", and *the other side* is the
load-bearing phrase. The one shipped pair is the same side twice.

**Why it may be the design working.** [mission-thin-water.md](mission-thin-water.md) §12 argues,
persuasively, that a variant must not announce itself — "a briefing that announced itself as the
earned one would turn a consequence into a collectible". The more variants there are, the closer a
player comes to noticing the mechanism, and the mechanism's whole value is that it is invisible.
Two is a defensible number to stop at.

**What acting on it would cost.** Per scene: one id emitted at a mission's resolution, one
alternate briefing authored, and nothing on the wire — §11 records that the choice is made
client-side and the mission cannot know which briefing was read. §1's one hard rule is already
satisfied by construction, since the repeated lines are spoken *inside* the missions and a variant
would only change the text read before them.

### F2 · §8's convergence sentence is true of one campaign in four

**The fact.** [campaign.md](campaign.md) §8 says of the convergence: "you have already played the
other three sides' reasons, and the game declines to tell you which of them was wrong." In a free
order that sentence is true of the fourth campaign a player finishes and of none of the others.
It is least true of the Ledger, which shows the other three navies five times in seven briefings
(§3), and whose convergence is slot six.

**Why it is a problem.** The sentence is doing design work — it is the argument for why four
missions on one map are four missions and not one — and it is describing a player state the
campaign cannot produce on demand.

**Why it may be the design working.** Order-freedom means *no* sentence about what the player has
seen can be true, and §1 has already accepted that trade explicitly and at a higher price. The
convergence still works on a first campaign; it works differently, and "differently" is what
§1 chose.

**What acting on it would cost.** A sentence in [campaign.md](campaign.md) §8, saying which
reading of the convergence belongs to a first campaign and which to a fourth. A doc edit, no build.

### F3 · *First Arrival* is the campaign's own answer to F2, and it is used once

**The fact.** [First Arrival](mission-first-arrival.md)'s briefing hands the column the other three
campaigns' events as the Directorate's own record — "a descent at seventy-two for three minutes,
transmissions at eighty against six charted faces, in an account that is not theirs, and a bed on
the western lip, entered as a bed" — with Korrin's reason for doing so stated in register: "a
column that is not told what its own record holds is a column being asked to find it twice."

**Why it matters.** It is self-sufficient for a player who has not played
[Prospect](mission-prospect.md) or [The Second Seeding](mission-second-seeding.md), and a retelling
for a player who has, and it needs no variant to be both. [The Rim
Deposits](mission-rim-deposits.md) does a lighter version ("there is a garden on the western lip;
there is a Board somewhere this tide reading out the registration of the field you are cutting").
*Prospect* and *The Second Seeding*, the pair that repeats three lines verbatim, do not.

This is a positive finding and it is the cheapest template the campaign has: the fix for F1 and F2
may not be more variants at all, but more briefings that carry the other side's week in their own
register, which every faction here has the grammar for.

### F4 · The *Long Arrangement* page cannot be entered during a first campaign

**The fact.** `admission: 'two-parties'` resolves against the count of distinct campaigns with a
finished mission, so the page enters at slot 1 of the *second* campaign at the earliest. It carries
the Sounding of 141 PC, the founding of the Sorrowgate court in 165 PC — the room the player played
the prologue in — and the First Chord of 178 PC, the reply that arrived forty-one seconds early,
and the three technicians.

**Why it is a problem.** A player whose first campaign is *The Second Chord* reaches [The
Three](mission-the-three.md) at slot five, spends twelve minutes in the room with those three, and
has no entry anywhere for what happened to them; the mission's own text gives a date and a silence
and not a cause. [The Second Chord](mission-second-chord.md)'s "I am aware of what was said the
first time. I have read every page of it" is the same gap one slot later. The 178 PC reply is also
the middle of the three facts that rhyme — 88 PC's pings returning before they could have, and
213 PC's cycle at thirty-nine and shortening — and it is the only one of the three behind a second
campaign.

**Why it may be the design working.** `record.ts`'s own comment gives a coherent rule: "the Long
Arrangement was four powers each able to hear the other, so it enters when the player has stood on
two sides." That is a good rule and this is its cost, not its failure.

**What acting on it would cost.** Either a fifth `Admission` keyed to something the Order's
campaign does reach (a mission on `the-first`), or a second Settlement-page entry carrying 178 PC,
or nothing and a note in [ui-ux.md](ui-ux.md) §14 that the page is deliberately late.

### F5 · Two seventeen-year lines land one slot before the page that dates them

**The fact.** Varr-Kest at [Tolerance](mission-tolerance.md) (Ledger 5): "I signed the other
version of this order seventeen years ago." Teel at [In Writing](mission-in-writing.md)
(Seeding 5): "at Kell there was one, and I've had seventeen years to want the other." Both are
197 PC — the Kell flood, 1,900 dead, 4,000 evacuated and 200 left — which is on the Present Crisis
page, and that page enters at Ledger 6 and Seeding 7 respectively.

**Why it may be the design working.** The arithmetic is in the line (214 − 17), and *Tolerance* is
the same choice being made a second time by the same person, so the scene teaches itself without
the date. This is the weakest finding here and is recorded for completeness.

**What acting on it would cost.** Nothing, or the same admission change as F4.

### F6 · One briefing in twenty-nine names another campaign's person without glossing them

**The fact.** [Shallow](mission-shallow.md) (Attending 4): "Marr rang off-tide. The plateaus are
turning a second seeding, garden by garden, and what a garden decides about the deep is not sent to
those below and never has been." Marr's only record entry is 199 PC on the Present Crisis page,
which for an Attending-first player enters at slot seven. A scan of all twenty-nine briefings'
spoken text for the other three campaigns' named commanders and principals returns this line and
nothing else.

**Why it is a problem.** *Shallow* is the mission where the Commune is the reason the water is
occupied, and it is a player's fourth mission if they took the Directorate first.

**Why it may be the design working.** Korrin is briefing cohorts who know who Marr is; glossing her
would be the Directorate explaining the Rift to itself, which its register cannot do.

**What acting on it would cost.** One clause, stated as a condition rather than an introduction —
the shape the register already uses for the Fourth's closure in
[The Dome](mission-the-dome.md). Cheap, and the smallest thing in this document.

### F7 · The board's Attending line states the secret the campaign spends seven missions not saying

**The fact.** The board's commander line for *The Attending* is
[campaign.md](campaign.md) §6's head, transcribed verbatim as `campaignBoard.ts` says it must be:
"Undermarshal Setha Korrin believes the Choir is literal and cannot say so." It is on screen before
slot one. The campaign's shape is one sentence a mission that Korrin should not say aloud —
the record, a memory, a lie, a rule, *I called it* — stopping one clause short at
[Conclave](mission-conclave-attending.md) and saying nothing at all at the rim.

**Why it is a problem.** The other three commander lines are premises: eleven years and an
actuary's conscience, a Tidespeaker who cannot order anyone, a Choirmaster with a window and a
desk. This one is an interior, and it is the interior the seven silences are built to withhold.

**Why it may be the design working.** Knowing what Korrin cannot say may be exactly what makes the
seven near-misses legible rather than merely flat, and the campaign's dread is not a mystery about
her — it is a mystery about the Mouth, which the line does not touch.

**What acting on it would cost.** Either §6's head rewritten (the board transcribes it, so the
doc moves first, as it must), or a note in [ui-ux.md](ui-ux.md) §14 that the commander line is
the author's frame and is allowed to know more than the player.

### F8 · After the prologue, the record names two of the four navies

**The fact.** The Descent page is `prologue`-admitted and charters the Bathyarch Consortium
(19 PC) and constitutes the Pelagia Commune (33 PC). The Settlement page, which founds the Abyssal
Directorate (104 PC) and the Hadron Knights (118 PC), is `one-party`. The prologue's own spoken
text names no navy at all (§2). So the two the record withholds are exactly the two the prologue
introduced as strangers — the observer nobody addresses, and the Knight nobody invited.

**Why it may be the design working.** The board names all four columns, in their ink, with their
commanders, one screen away and before any mission is chosen. The player is not short of the names;
the record is simply not the surface that supplies them.

**What acting on it would cost.** Nothing, if the board is accepted as the naming surface — but it
is worth writing that down, because the record reads as though it were the naming surface and is
the only place that dates the four foundings.

---

## 7. What the read found working

Recorded deliberately, because [campaign.md](campaign.md) §2 makes each of these a rule and a
finding that contradicted one would be wrong rather than useful.

- **The Mouth is not explained, and the player is told so three times, in three registers.** The
  Directorate amends a log that says what it is and re-shifts the cohort that filed it
  ([Attendance](mission-attendance.md)); the court "enters the interval and not an interpretation"
  (`record.ts`, the Long Arrangement); Item 9 has been continued at every sitting for one hundred
  and twenty-six years ([Item Nine](mission-item-nine.md)). Three institutions independently
  refusing to say is a far better answer to *is this ever going to be explained* than a statement
  could be. §2 rule 3 holds, and the fair question the rule leaves open — whether the player
  understands it is not going to be explained — is answered yes.
- **No villains.** [Prospect](mission-prospect.md) runs the register test four ways in one channel:
  the charting pair's *yet*, the Watch-Speaker's unstated debt, the reconnaissance's courtesy to a
  mineral, and Osk's works order over water that is not born yet. Nobody concedes anybody's frame,
  and nobody is stupid or cruel to make the mission work.
- **Losing is content.** The three-reading closes carry it, and two of the Lost readings say it
  outright — "it is not a failure of yours" ([The Dome](mission-the-dome.md)), "it is not a failure
  of the cohorts" ([First Arrival](mission-first-arrival.md)). Both are Directorate, which is the
  register that can say it without either pricing it or apologising.
- **The variant that exists refuses to announce itself.** No marker, no second board entry. That is
  the right call and it is why F1 is a design question rather than a defect.
- **The endings are not ranked anywhere the player can reach.** Four campaigns, four last readings,
  no comparison — including inside *The Second Chord*'s Partial reading, which names the argument
  and declines to settle it: "thirty thousand who will argue for a century about the trade. It is
  not canon that they are wrong, either way."

---

## 8. Independent delivery audit — 4 October 2026

### Scope and verdict

**The world is stronger at conveying institutions than habitation.** The concern prices a rescue;
the plateaus negotiate a command; the cohorts make non-arrival a political act; the Order makes
a rest an instruction. Those distinctions survive the campaign's crises. Warmth, damp, and the
comfort purchased by depth arrive less reliably than obligations, numbers and procedure.

This is the independent reading requested by #469, against revision `17a35e7`, after
[#939](https://github.com/gunnargehtab/Echoes-of-the-Abyss/pull/939). The dialogue pass read all
29 mission dialogue sections, default and variant briefings, and corresponding script speech
and endings. The habitat pass read the same missions' settings, soundscapes, maps and dialogue
against [habitats.md](habitats.md) §10, with selective runtime checks. Neither pass accepts a
mission's own “register test” paragraph as proof that it passes.

**This completes a source-based register and habitat audit, not a live acceptance test.**
The briefing screen renders catalogue paragraphs, not a mission document's setting prose
([BriefingScreen](../packages/frontend/src/menu/BriefingScreen.tsx), lines 101–147).
Script `say` entries carry speaker and text, not their authorial notes
([runtime](../packages/backend/src/sim/missions/runtime.ts), lines 1058–1066).
The audio is a signature and nonverbal murmur, not recorded words
([speechVoice](../packages/frontend/src/audio/speechVoice.ts), lines 4–9).
An authored place, a reachable text and a place a player recognises are three different claims.

No story, rule, roster or rendering change is made here. Findings below propose follow-up,
not a silently chosen resolution of disagreements between canon and code. No sub-issues were
filed and none of the four deferred implementation boxes was worked.

### Coverage — every mission, in its own campaign order

The register column records the identifying argument or exception, not a blanket pass for
every utterance. **Interior**, **precinct** and **exterior** distinguish where the habitat test
applies: fighting outside somebody's city does not require seeing their bedroom. Each linked
mission supplies the setting and its §12 dialogue; findings below cite the runtime where the
distinction changes what a player receives.

| Campaign / slot | Mission | Register reading | Habitat reading |
| --- | --- | --- | --- |
| Prologue | [Sorrowgate](mission-sorrowgate.md) | Court closes an unpriced count; four visitors answer in incompatible frames | Interior: reused transit court, enforced hush, refuge and flight |
| Ledger 1 | [Asset Recovery](mission-asset-recovery.md) | Osk's humane rescue remains a dispute over an asset, not generic heroism | Industrial interior: struck iron, shoring, occupied refuge |
| Ledger 2 | [Shift Change](mission-shift-change.md) | Crew clearance overrides the scheduled departure in the concern's own terms | Workplace/precinct: hum, rail head, seventy-one berths transferred |
| Ledger 3 | [Baffle](mission-baffle.md) | Freight necessity and the picket's closure remain mutually intelligible, not reconciled | Exterior: compressor sustains forty-one unseen berths |
| Ledger 4 | [Exposure](mission-exposure.md) | Fear, deniability and observations are priced differently | Exterior: another institution's economy heard from outside |
| Ledger 5 | [Tolerance](mission-tolerance.md) | One seal and two obligations make the moral decision concrete | Interior boundary: inherited castings and occupied Vayle; domestic hierarchy thin |
| Ledger 6 | [Prospect](mission-prospect.md) | Four readings of one rim; repeated lines retain their faction frames | Exterior: industry laid over attended ground |
| Ledger 7 | [Item Nine](mission-item-nine.md) | Accounting cannot settle the decision to disclose | Interior: collective listening in a retrofitted vault; dryness absent |
| Seeding 1 | [Tend](mission-tend.md) | Bread, invitation and reciprocal work establish consent | Inhabited rows: bell and moving hush; domestic damp mostly indirect |
| Seeding 2 | [Thin Water](mission-thin-water.md) | Teel counts people through an evacuation nobody chose | Exterior: pumps and corridor, not a tour of Kell homes |
| Seeding 3 | [Convocation](mission-convocation.md) | Marr's brief imperative is an earned fracture; its aside overlaps in delivery | Civic landscape: rows become a voting room; hush deliberately broken |
| Seeding 4 | [Deep Furrow](mission-deep-furrow.md) | Anholt asks that a result be heard before it is argued over | New garden: old rock adapted, pigment light, habitable depth made |
| Seeding 5 | [In Writing](mission-in-writing.md) | Teel distinguishes carrying guns from using them | Garden/shelter: dry seed shelf reaches the briefing |
| Seeding 6 | [Radicals](mission-radicals.md) | “Told when” exposes Anholt's narrowing account of consent; watch text disagrees with prose | Ruined civic transit, not a resettled Sorrowgate; interval references disagree |
| Seeding 7 | [The Second Seeding](mission-second-seeding.md) | Anholt's plural and Marr's later refusal of a record close different arguments | Exterior: a new bed, not a capital interior |
| Attending 1 | [Attendance](mission-attendance.md) | Adze's belonging is sincere; the transcript refuses interpretation | Interior: rite and hush land; warm domestic life remains thin |
| Attending 2 | [Intake](mission-intake.md) | Reassignment is entered without treating it as death | Cohort halls/work ground: retrofit present, accommodation mostly background |
| Attending 3 | [The Dome](mission-the-dome.md) | The picket counts rather than threatens; reciprocal variant now exists | Gallery precinct: inhabited freight water, not an entered home |
| Attending 4 | [Shallow](mission-shallow.md) | Korrin gives costly arithmetic without making the cohorts miserable | Exterior shoulder: vulnerability to altitude, not a slum |
| Attending 5 | [Trench Awakening](mission-trench-awakening.md) | “I called it” makes Korrin accept responsibility personally | Rendering row/stalls: maintenance and reassignment, not a penal colony |
| Attending 6 | [Conclave](mission-conclave-attending.md) | A body not crossing is authority; Ossary's silence becomes attributed text | Civic terraces: depth/status, breathing cells and a consequential hush |
| Attending 7 | [First Arrival](mission-first-arrival.md) | Self-sufficient account of the other sides; culminating silence misattributed | Exterior rim: the column carries its silence order with it |
| Chord 1 | [Aptitude](mission-aptitude.md) | Vrey examines through courtesy and precise measurement | Instrument precinct: generations of tuning; chord off the played ground |
| Chord 2 | [Standing Wave](mission-standing-wave.md) | Technical exchanges are less exclusive than identity-bearing lines | Exterior canyon/works: the North Gallery is not a promised domestic room |
| Chord 3 | [Nineteen](mission-nineteen.md) | Names make loss permanent rather than interchangeable | Exterior committal ground: a memorial, not habitat capacity |
| Chord 4 | [Conclave](mission-conclave-chord.md) | Vrey authors an audible rest rather than mere inaction | Precinct: nine houses act through the lattice; no room is entered |
| Chord 5 | [The Three](mission-the-three.md) | Courtesy, care and withheld knowledge coexist; causal history remains gated | Interior: maintained instrument, hospice, dry archive; strongest domestic treatment |
| Chord 6 | [The Rim Deposits](mission-rim-deposits.md) | Crystal arithmetic gives the raid necessity; “Descend” is a deliberate borrowing | Exterior: extraction from somebody else's attended ground |
| Chord 7 | [The Second Chord](mission-second-chord.md) | Kalliso refuses to make lives, personal years and seconds equivalent | Exterior: the instrument and its cost brought to the rim |

### Applying the two tests

For [culture.md](culture.md) §6, asking **which faction could not say this** is more useful than
counting faction nouns. Tull's unaffordable fear ([exposure.ts](../packages/backend/src/sim/missions/exposure.ts),
line 331) would import the concern's frame into Marr's mouth. Adze's gladness at their assigned
floor ([attendance.ts](../packages/backend/src/sim/missions/attendance.ts), line 382) is not
Consortium indebtedness with different terminology. Kalliso's distinction between nineteen
lives, twenty-two years and thirty seconds
([secondChord.ts](../packages/backend/src/sim/missions/secondChord.ts), line 1235) challenges
interchangeability rather than merely counting. Halloran and Drenn's answers to the same fourteen
at Sorrowgate make the court's fifth register necessary.

Short acknowledgements, practical arithmetic and compassion are not automatically unwritten
characterisation. Osk's “So would you” can be shared in isolation; its asset-recovery context
does the distinguishing work. Marr's “All of them. Now, please” breaks her usual grammar because
the campaign has earned that break. Conversely, a speaker's faction key proves attribution,
not that the words pass the test.

Auditory attention, status, incompatible frames, the Mouth, calendar, the Surface Age, and
insider legitimacy were checked separately. No new authoritative explanation of the Mouth or
surface-restoration goal was identified in the reviewed dialogue. That is a source observation,
not proof that a new player understands the deliberate absence of an answer. The calendar
exception below prevents an unqualified claim of compliance.

For [habitats.md](habitats.md) §10, the seven rules produce this result:

| Criterion | Evidence that works | Limit or finding |
| --- | --- | --- |
| Sound first | Face Six's struck iron; the Third's chord; the plateaus' bell; Sufficiency's hush | Authored sequence is not verified mix precedence; bespoke ambience remains a separate obligation |
| Local light | Pigment-lit new garden; biolight rows; crystal-lit instrument vocabulary | Plateau map prose and the later key-art-only Lid decision need reconciliation, A6 |
| Wealth as dryness | Anholt's dry shelf in the public briefing; dry sealed cases in The Three's objective | Holding's comfort hierarchy rarely reaches the player, A5 |
| Retrofit | Castings, shoring, rock-cut cells, transit hall roofed into a vault | These often live in setting prose; no demand to replace canon with pristine city assets |
| Inhabitants find home right | Adze's contentment; households tending and voting; cared-for people in the First | Warm cells and ordinary damp berths are less concrete than institutional claims, A5 |
| Berths and metres | Shift Change's berth transfer; Vayle's capacity and depth; upper-terrace birth/seating depths | Troop counts, casualties and functional room counts are not measurements of habitat wealth |
| Keep the hush | Court's struck hardpoints; voting's deliberate breach; the Order's rest; the terraces' crossing | Exterior work yards need not invent a gallery hush; a log saying “Nothing” is not silence, A1 |

**Name-hidden reading:** the court, working Holding, voting rows and tuned First remain
recognisable through acts and materials without faction labels. Intake's halls and the
Fourth's freight galleries depend more heavily on the surrounding institutional voice.
This is an auditor's judgement of the text, not a blinded participant test. The latter
remains the right test for whether a player recognises a home rather than merely its employer.

### Findings and follow-up decisions

Priority means risk to intended understanding, not authority to implement a fix.

#### A1 · High — silence is attributed as speech, and an aside gets no separate interval

[firstArrival.ts](../packages/backend/src/sim/missions/firstArrival.ts), lines 950–962, gives
Korrin and Ossary ordinary `say` beats at 20:30: “The record notes that the Undermarshal was
present” and “Nothing. The record notes that the First Cantor was present.” The annotations
are assigned to the people whose silence [the mission](mission-first-arrival.md) §12 is saving.
This is not the absence of a recorded actor: the source itself opens their speech channels.

The related Marr concern is at **Convocation**, not The Second Seeding.
[convocation.ts](../packages/backend/src/sim/missions/convocation.ts), lines 253–261, emits the
command and “quietly, to nobody” aside together. [engine.ts](../packages/frontend/src/audio/engine.ts),
lines 667–686, explicitly overlaps same-tick hails rather than queueing them. Attribution
text alone does not give the aside a quieter, later delivery. This establishes overlap,
not inaudibility or loss of the log text.

**Other reading:** these are captions for silence and simultaneous thought, not literal speech.
**Recommendation:** decide the intended channel and temporal separation before adding a beat.
Keep the neutral record distinct from a named speaker. Verify both muted text and an audible
capture; preserving all rows is necessary but does not prove that the dramatic pause lands.

#### A2 · Medium — Radicals turns an inference into a counted pack

[mission-radicals.md](mission-radicals.md), lines 934–961, distinguishes one named Draymaw
from inferred companions. [radicals.ts](../packages/backend/src/sim/missions/radicals.ts),
lines 555–560 and 632–638, instead claims five at a name and then five off the edge.
The player receives a firmer observation than the prose intended.

**Other reading:** five describes a fictional pack represented by one simulation animal.
That does not preserve the written distinction between hearing and inference.
**Recommendation:** reconcile the watch's knowledge with the authored representation, retaining
the uncertainty rather than changing fauna for balance. Compare both delivered lines with §12;
this is a script/prose disagreement, not a demonstrated hidden-state leak.

#### A3 · Medium — permanent loss changes the force, not all the words about it

The Order's loss mechanic is built, not a missing feature.
[roster.ts](../packages/backend/src/sim/missions/roster.ts), lines 138–171, removes spent hulls
and adjusts `survive` predicates; it retains authored text and other requirements.
[The Three's briefing](../packages/shared/src/missions.ts), lines 1312–1319, still declares
four hulls and their certificates. [BriefingScreen](../packages/frontend/src/menu/BriefingScreen.tsx)
selects by seen scenes, not the remaining cadre.

**Other reading:** the commander is repeating the original order, and absence is the intended
lesson. Without an explicit distinction, a player can also read it as a continuity error.
**Recommendation:** test the post-Nineteen sequence with a full and a depleted roster, and
communicate what was assigned versus what answered. Do not erase loss or relax extraction
requirements to make the speech true. Success means the player can explain the missing hull
and the remaining obligation without consulting the design document.

#### A4 · Low–medium — the calendar rule is stricter than the dialogue

[culture.md](culture.md) §6 prohibits hours, days and weeks. The shipped Tend reading says
“another hour” ([tend.ts](../packages/backend/src/sim/missions/tend.ts), line 420);
Prospect uses “this week”; The Rim Deposits' briefing says “thirty-nine hours”
([missions.ts](../packages/shared/src/missions.ts), lines 554 and 1354).

**Other reading:** instrument durations and familiar chronology are intended exceptions.
**Recommendation:** decide and document that exception, or revise the affected dialogue and
its canonical prose together. Do not use a word scan to rewrite deliberate rejections such
as “listened to, not watched,” or to mistake a watch's name for a visual-attention verb.

#### A5 · Medium — homes risk being understood only as systems of work

Sufficiency's warm cells and equal dampness are concrete in [habitats.md](habitats.md) §6.
Attendance conveys sincere belonging, but its breathing light-rows are a dream transcript,
not an establishing description ([attendance.ts](../packages/backend/src/sim/missions/attendance.ts),
lines 399–404). The Holding's depth/dryness hierarchy (§3) is likewise less visible in
Tolerance and Item Nine than its industrial and political obligations.

**Other reading:** these are operational scenes, not domestic tours. Nothing requires every
room to illustrate every rule. Adze's contentment and the unassigned cohort “in its cells …
breathing” already resist the barracks reading
([conclaveAttending.ts](../packages/backend/src/sim/missions/conclaveAttending.ts), lines 195–209).
**Recommendation:** consider one ordinary, player-facing comfort detail at an appropriate
arrival, not an explanatory defence of the faction. Preserve The Three's dry-room objective
([theThree.ts](../packages/backend/src/sim/missions/theThree.ts), lines 494–500) and In Writing's
dry shelf as existing examples. Test whether a reader can describe why a resident stays.

#### A6 · Low–medium — habitat instructions still carry superseded or ambiguous staging

Tend's map description (lines 341–344) and Thin Water's (442–444) describe the Lid as overhead
light. [habitats-art-brief.md](habitats-art-brief.md) §9 explicitly keeps that glow in key art
and refuses it in the conn view. The missing overhead glow is therefore **not** a renderer defect.
Separately, [habitats.md](habitats.md) §9 places Radicals “two tides on,” while its mission's
§1 says “many tides later” and its dialogue remembers the spring.

**Other reading:** the first descriptions are diegetic, not implementation instructions;
the chapter-house entries index institutions rather than rooms the player physically enters.
**Recommendation:** label those boundaries and reconcile the Sorrowgate interval. Preserve
the existing light decision; do not invent a new effect or a domestic visit to make an index true.

### What remains of the September findings

| Earlier finding | Current disposition |
| --- | --- |
| F1 — one scene, no cross-campaign variant | **Partly superseded.** Three scene constants now exist: Marr's filing plus convoy/picket closure stamps. Baffle and The Dome read the opposite-side stamp ([missions.ts](../packages/shared/src/missions.ts), lines 273–292, 462–470, 940–950). The rim pair still has no equivalent variants; repetition there remains a judgement, not a broken mechanism. |
| F2 — convergence assumes three prior campaigns | **Open.** [campaign.md](campaign.md) §8 still says the player has played the other sides. Free order does not guarantee it. First- and fourth-campaign readings should be distinguished. |
| F3 — First Arrival is a good template | **Retained positive.** Its briefing supplies enough of the other sides' activity to make the rim comprehensible without requiring their playthroughs. |
| F4 — First Chord history gated behind two campaigns | **Open.** [record.ts](../packages/frontend/src/menu/record.ts), lines 112–121 and 170–174, still places 178 PC behind `two-parties`. The Three's public premise supplies the date and muteness, not the forty-one-second reply. Preserve the unexplained Mouth; missing event history is a different question. The Second Chord ending is slot seven, not slot six as F4's earlier wording suggests. |
| F5 — seventeen-year references before the dated page | **Retained, low priority.** Present Crisis still requires a finished rim mission. The local choices can work without the historical date; verify understanding before changing admission. |
| F6 — Shallow's unglossed Marr | **Open, with ambiguity.** [missions.ts](../packages/shared/src/missions.ts), lines 988 and 1016, still says “Marr has rung” / “Marr rang off-tide.” A new reader may hear a person or the plateau; neither is introduced there. The earlier absolute count of such references is not renewed by this audit. |
| F7 — board states Korrin's secret | **Resolved in the current source.** [campaignBoard.ts](../packages/frontend/src/menu/campaignBoard.ts), lines 150–154, now describes the call and the Cantorate's choice, matching [campaign.md](campaign.md) §6. Do not restore the spoiler to explain the silences. |
| F8 — record initially names only two navies | **Retained as a deliberate distribution of information.** The board supplies all four names; the record's unequal dating is not by itself a completeness defect. |

Witnessed conclusions are also now retained separately, including contradictory readings
([campaign.md](campaign.md) §9; [ui-ux.md](ui-ux.md#witnessed-conclusions)).
That addresses rereading, not whether a line was understood when it first arrived.
The existing [scene-witness tests](../packages/backend/test/missionSceneWitness.test.ts),
[briefing/record tests](../packages/frontend/test/briefingAndRecord.test.ts) and
[roster tests](../packages/backend/test/missionRoster.test.ts) are useful regression anchors;
their assertions are not evidence of comprehension, and they were not executed for this prose-only audit.

### Remaining verification and deferred work

The live attempt used the repository's run-game harness. After `npm ci`, both development
servers started. Browser inspection did not run: the browser tool's transport was closed,
and `drive.mjs --entry tutorial --steps .claude/skills/run-game/scripts/escFocus.mjs` could
not load Playwright. **No live frame, audio capture, completed playthrough or participant
comprehension result is claimed.** The following remain acceptance work, not boxes marked passed:

- **First-campaign reading:** take each faction first, then revisit the rim after all four.
  Ask the player what each navy needs, what the 178 PC event was, and what remains unknowable.
  Do not accept knowledge supplied by the auditor as knowledge delivered by the game.
- **Actionable briefings:** have a new player locate every named destination and explain the
  obligation in their own words, using only the briefing, revealed markers and objectives.
  The issue's remaining briefing-reference concern is not cleared by source transcription.
- **Stress and loss:** compare full/depleted Order rosters, successful/failed readings, and
  Marr's optional bell. Check log readability during orders and muted play, not only line presence.
- **Habitat delivery:** listen to each interior's arrival before judging its image. Compare
  hum, bell, chord and hush against the seven criteria above, then repeat with faction names
  hidden in a reading sample. A speaker hail alone cannot certify an inhabited soundscape.

The four named implementation items remain deferred: **Clarion mission-roster adoption**
is still absent from mission literals and is not permission for balance tuning;
**Korrin's silent transmission** is A1, not a hull's `silent` posture;
**recorded dialogue** still needs its size budget, loading plan and register direction;
**concept-art/DESIGN-PHILOSOPHY.md** remains unwritten. [README.md](README.md)'s
“Planned / Not Yet Written” section carries these without pretending they have shipped.
This audit supplies follow-up decisions; it does not certify the whole game's live delivery.

---

## Related

- **[campaign.md](campaign.md)** — the campaign this read is of: §1 the free order, §2 the five
  design rules each finding was checked against, §8 the convergence, §11 what is built
- **[culture.md](culture.md)** — the five registers, and §6's register test, which every briefing
  applies to itself
- **[habitats.md](habitats.md)** §9–10 · **[habitats-art-brief.md](habitats-art-brief.md)** — the
  interior coverage, habitat test and distinction between world description and runtime treatment
- **[timeline.md](timeline.md)** — 88, 141, 178, 197, 204, 211, 213 PC, and the anomaly log the
  record's six pages are transcribed from
- **[world.md](world.md)** — the setting the record's first three pages carry
- **[ui-ux.md](ui-ux.md)** §14 — the board, the attributed briefing screen and the record: the
  three surfaces this document read
- **[world-map.md](world-map.md)** §5 — every campaign block placed on the Rift's geography
- **[glossary.md](glossary.md)** — mission, objective and briefing, which mean one thing each
