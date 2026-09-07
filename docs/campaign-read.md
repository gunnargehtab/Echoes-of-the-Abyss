# Reading the Campaign in Play Order

> [#224](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/224) checked that the world's
> facts agree with each other. This document checks something else: whether they **arrive**.
> Internal consistency is a property of the documents read side by side. A player reads them one
> at a time, in an order they choose, and never sees two at once. Only the first test had been run.

---

## 1. What this is, and what it is not

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

## Related

- **[campaign.md](campaign.md)** — the campaign this read is of: §1 the free order, §2 the five
  design rules each finding was checked against, §8 the convergence, §11 what is built
- **[culture.md](culture.md)** — the five registers, and §6's register test, which every briefing
  applies to itself
- **[timeline.md](timeline.md)** — 88, 141, 178, 197, 204, 211, 213 PC, and the anomaly log the
  record's six pages are transcribed from
- **[world.md](world.md)** — the setting the record's first three pages carry
- **[ui-ux.md](ui-ux.md)** §14 — the board, the attributed briefing screen and the record: the
  three surfaces this document read
- **[world-map.md](world-map.md)** §5 — every campaign block placed on the Rift's geography
- **[glossary.md](glossary.md)** — mission, objective and briefing, which mean one thing each
