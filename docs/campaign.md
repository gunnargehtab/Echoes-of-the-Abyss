# Campaign — Four Wars, One Question

> Four institutions each run out of time in the same decade, for reasons none of them chose ([timeline.md](timeline.md)). The campaign is what happens when all four solutions require the same eleven kilometres of seabed.

---

## 1. Shape

| Part | Missions | Purpose |
| --- | --- | --- |
| **Prologue — Sorrowgate** | 1 | Teaches listening. No base, no economy, no combat you can win |
| **Four faction campaigns** | 7 each | Each playable in any order; each retells events the others already showed you, from inside a different frame |
| **Convergence — The Rim** | 1 per faction | All four arrive at the Mouth's rim deposits in the same week, for four incompatible reasons |
| **Ending** | 1 per faction | Four endings. All coherent, all costly, none canon |

**29 missions.** The order is free after the prologue. The game tracks what you have already seen — replaying a scene you witnessed from the other side changes the briefing text, never the mission — and both halves are now built (§11): the record, and the variants that read it. What the record remembers is a **scene**, not a mission, because the rule is about an event two missions witness from either end; a *Tend* that came home unfiled witnessed nothing, however completely it was played.

**The unlock rule has exactly one rung, and this sentence is it: the prologue is finished before any faction slot opens, and after that nothing is locked.** It is the reading this section already had — "the order is free *after* the prologue" — written out so the record has a rule to enforce rather than an inference. A slot does not ask for the slot before it, because that would be the ordering the paragraph below refuses to have. §10's withholding of active sonar until each campaign's third mission is not a second rung: it shapes what a mission hands you once you are in it, never which door opens. Any of the three readings finishes the prologue — a mission that was lost was still played, and the campaign is not a gate a player can fail past.

The count is 1 + 4×7. Convergence and Ending are slots *inside* each campaign's seven rather than a fifth and sixth block appended to it, and they do not fall at the same index in all four: the Commune reaches the rim and its ending in one mission, the Knights take two. A global mission number would have to assert an ordering the campaign refuses to have, which is why mission ids are namespaced by campaign — the prologue is `prologue-sorrowgate`, and nothing in that id implies a mission 2.

---

## 2. Design Rules

1. **No villains.** Every campaign's antagonists are the other three player factions, written as they see themselves ([factions.md](factions.md)). If a mission requires an opponent to be stupid or cruel to make sense, the mission is wrong.
2. **Mechanics are the argument.** Each mission introduces at most one system, and the system is chosen to make the faction's worldview physically true under your hands. The Directorate campaign teaches patience because Directorate units are slow, and being told they are patient would not work.
3. **The Mouth is never explained.** Not in a cutscene, not in a codex entry, not in the final mission of any campaign ([culture.md](culture.md) §6).
4. **Losing is content.** Three missions across the campaign are *unwinnable as fights* and winnable as evacuations, retreats or refusals. The Rift is not a place where force resolves things cleanly.
5. **The map persists.** Drift Health carries between missions on the same map ([bestiary.md](bestiary.md) §6). A player who fights loudly through the Kelp Labyrinth returns later to a quieter, deader, more legible version of it, and nobody tells them why.

---

## 3. Prologue — Sorrowgate

*Arbiter Mosk Halloran's court, a collapsed transit dome, 214 PC. A prisoner exchange between the Consortium and the Commune, with a Directorate observer and a Knight nobody invited.*

You command four unarmed escort craft under a court-imposed silence order. Weapons are disabled for the entire mission. The exchange goes wrong; something loud arrives; you get people out.

**Teaches:** SIG, listening, resolution tiers, what hearing is worth, and the exact feeling the game is built on — knowing something is there, needing to know what, and having no safe way to find out. The ping is *shown* here, used by someone else, and its cost is the reason the mission goes wrong. (Ghost markers were the fourth lesson until the mission was measured: the colossus is loud enough to hold Tier 4 the whole way out, so nothing in the prologue ever decays into one — see [mission-sorrowgate.md](mission-sorrowgate.md) §13.)

Specified in full — map, forces, beats, numbers, register and text — in [mission-sorrowgate.md](mission-sorrowgate.md). The prologue is one mission behind two doors: the title screen's Tutorial entry and this campaign's first slot launch the same content, and only the campaign entry records it. A separate tutorial would be a second first mission teaching the same four systems, which is the rule in §10 arguing against itself.

---

## 4. Bathyarch Consortium — *The Ledger*

*Executor Odile Varr-Kest has eleven years and an actuary's conscience.*

| # | Mission | Teaches | Beat |
| --- | --- | --- | --- |
| 1 | **[Asset Recovery](mission-asset-recovery.md)** | Klaxon Doctrine: fight loud, survive it | Ninefold salvage under fauna pressure. You are the loudest thing on the map and it is fine. Specified in full in [mission-asset-recovery.md](mission-asset-recovery.md) |
| 2 | **[Shift Change](mission-shift-change.md)** | Economy, throttle, industrial hum | Osk quietly moves crews off a dying face before the announcement he is not authorised to make. Specified in full in [mission-shift-change.md](mission-shift-change.md) |
| 3 | **[Baffle](mission-baffle.md)** | Masking, Baffle Barge, escorting a slow thing | The first push that works. It costs more than it should. Specified in full in [mission-baffle.md](mission-baffle.md) |
| 4 | **[Exposure](mission-exposure.md)** | Echo Marks and scouting the past | Tull's model needs field data. You read three days of someone else's economy off the seabed. Specified in full in [mission-exposure.md](mission-exposure.md) |
| 5 | **[Tolerance](mission-tolerance.md)** | Depth, pressure, unhealable attrition | A containment failure. You can save the habitat or the section. The arithmetic is not hidden from you. Specified in full in [mission-tolerance.md](mission-tolerance.md) |
| 6 | **[Prospect](mission-prospect.md)** | Abyssal descent, PR, the round trip | The new field has to exist. The only candidate is the Mouth's rim — the Ledger's convergence slot (§8). Specified in full in [mission-prospect.md](mission-prospect.md) |
| 7 | **[Item Nine](mission-item-nine.md)** | Nothing new — a command mission with one decision | Varr-Kest can declassify or she can lie to the Board for the first time in her life — the Ledger's ending (§9). Specified in full in [mission-item-nine.md](mission-item-nine.md) |

---

## 5. Pelagia Commune — *The Second Seeding*

*Tidespeaker Ysolde Marr cannot order anyone to do anything, and Sefa Anholt has the votes.*

| # | Mission | Teaches | Beat |
| --- | --- | --- | --- |
| 1 | **[Tend](mission-tend.md)** | Quiet economy, bloom-share, Silent Running | A working day. Nothing attacks you. You learn what quiet is worth by having it. Specified in full in [mission-tend.md](mission-tend.md), and built as `seeding-tend` |
| 2 | **[Thin Water](mission-thin-water.md)** | Losing a fight you did not choose | Consortium heavies catch a harvest column in the open. Objective: get 60% out — six of ten tenders, counted as hulls and read out in people. Specified in full in [mission-thin-water.md](mission-thin-water.md), and built as `seeding-thin-water` |
| 3 | **[Convocation](mission-convocation.md)** | Marr's once-per-match ability, mass mobility | A plateau votes while it is being attacked, which takes exactly as long as it takes. Specified in full in [mission-convocation.md](mission-convocation.md), and built as `seeding-convocation` |
| 4 | **[Deep Furrow](mission-deep-furrow.md)** | Seeding, terraforming, +1 PR zones | You make a piece of the Abyssal habitable. It is genuinely beautiful and it is genuinely a provocation. Specified in full in [mission-deep-furrow.md](mission-deep-furrow.md), and built as `seeding-deep-furrow` on the `anholt-furrow` map |
| 5 | **[In Writing](mission-in-writing.md)** | Spore Veil against the best listeners in the game | The Directorate's 205 PC letter stops being a document. Specified in full in [mission-in-writing.md](mission-in-writing.md), and built as `seeding-in-writing` on *Deep Furrow*'s ground unchanged, which is what the document asked for |
| 6 | **[Radicals](mission-radicals.md)** | Fighting your own faction's momentum | Anholt's people move without consensus. Marr will not stop them. You are asked to escort what you voted against. Specified in full in [mission-radicals.md](mission-radicals.md), and built as `seeding-radicals` on the prologue’s ground unchanged |
| 7 | **[The Second Seeding](mission-second-seeding.md)** | Everything at once | The rim. Gardening, at the site four armies are converging on. Specified in full in [mission-second-seeding.md](mission-second-seeding.md), and built as `seeding-second-seeding` on *Prospect*'s `mouth-rim` unchanged — the Commune's convergence slot and its ending in one mission (§8, §9) |

---

## 6. Abyssal Directorate — *The Attending*

*Undermarshal Setha Korrin believes the Choir is literal and cannot say so.*

| # | Mission | Teaches | Beat |
| --- | --- | --- | --- |
| 1 | **[Attendance](mission-attendance.md)** | HYD, passive listening, patience | No combat. You listen to the Mouth for one full cycle and record what the cohorts dream. Specified in full in [mission-attendance.md](mission-attendance.md), and built as `attending-attendance` |
| 2 | **[Intake](mission-intake.md)** | Cohort economy, cheap expendable units | The 8% who cannot adapt are reassigned. Korrin does it herself. The mission does not editorialise. Specified in full in [mission-intake.md](mission-intake.md), and built as `attending-intake` |
| 3 | **[The Dome](mission-the-dome.md)** | Cantors, listening domes, Chorus Call | You spoof an army. It works perfectly and teaches you what your own ears are worth. Specified in full in [mission-the-dome.md](mission-the-dome.md), and built as `attending-the-dome` on the `fourth-foot` map |
| 4 | **[Shallow](mission-shallow.md)** | Your own weakness | Above 400 m: −20% speed, −15% HP. The most feared army in the Rift, losing to altitude. Specified in full in [mission-shallow.md](mission-shallow.md), and built as `attending-shallow` on *Thin Water*’s `kell-shoulder` unchanged |
| 5 | **[Trench Awakening](mission-trench-awakening.md)** | Megafauna, fauna aggro, Biomass | You call something and you do not steer it ([bestiary.md](bestiary.md)). Specified in full in [mission-trench-awakening.md](mission-trench-awakening.md), and built as `attending-trench-awakening` on the `shallow-band` map |
| 6 | **[Conclave](mission-conclave-attending.md)** | Fighting with half an army | First Cantor Ossary does not move against Korrin directly. He simply does not move. Specified in full in [mission-conclave-attending.md](mission-conclave-attending.md), and built as `attending-conclave` on the `upper-terraces` map, whose `attending-` prefix is the whole of what distinguishes it from the Order's *Conclave* in §7 (§1) |
| 7 | **[First Arrival](mission-first-arrival.md)** | Information into tempo | Arrive at the rim before anyone. Hold it with the slowest units in the game. Specified in full in [mission-first-arrival.md](mission-first-arrival.md), and built as `attending-first-arrival` on *Prospect*'s `mouth-rim` unchanged — the Directorate's convergence slot and its ending in one mission (§8, §9) |

---

## 7. Hadron Knights — *The Second Chord*

*Choirmaster Ivane Sull has a window, a raid plan on her desk, and thirty-six years of writing she has shown nobody.*

| # | Mission | Teaches | Beat |
| --- | --- | --- | --- |
| 1 | **[Aptitude](mission-aptitude.md)** | Directional SIG — loud in the cone, quiet on the flank | Six units, no reinforcements, and the first lesson in facing. Specified in full in [mission-aptitude.md](mission-aptitude.md), and built as `chord-aptitude` |
| 2 | **[Standing Wave](mission-standing-wave.md)** | Paired nodes, corridors, PF 2.0 | You turn a canyon into a megaphone that hurts you too. Specified in full in [mission-standing-wave.md](mission-standing-wave.md), and built as `chord-standing-wave` on the `the-fifth` map — the last of the twenty-nine to get its literal, and the one that gave the format its `build` predicate |
| 3 | **[Nineteen](mission-nineteen.md)** | Permanent loss | The 211 PC cadre. Every unit lost in this mission is gone for the rest of the campaign. Specified in full in [mission-nineteen.md](mission-nineteen.md), and built as `chord-nineteen` on the `the-rest` map, which is also where the carry it asks for is recorded as unbuilt |
| 4 | **[Conclave](mission-conclave-chord.md)** | Nothing new — a defensive mission you are meant to almost lose | Chapter-Master Vrey has the standing to call a vote. He does not. He wants Sull to hear him not do it. Specified in full in [mission-conclave-chord.md](mission-conclave-chord.md), and built as `chord-conclave` on *Aptitude*'s `outer-formations` unchanged, the Order's *Conclave* and not the Directorate's in §6, which the `chord-` prefix is the whole of what separates them by (§1) |
| 5 | **[The Three](mission-the-three.md)** | Nothing at all | A quiet mission at 2,900 m. You escort Sull to the mute technicians. Twelve minutes, no combat, and the transcripts. Specified in full in [mission-the-three.md](mission-the-three.md), and built as `chord-the-three` on the `the-first` map |
| 6 | **[The Rim Deposits](mission-rim-deposits.md)** | Raiding, extraction under fire | The crystal exists in exactly one place. Sull authorises the plan. Specified in full in [mission-rim-deposits.md](mission-rim-deposits.md), and built as `chord-rim-deposits` on *Prospect*'s `mouth-rim` unchanged — the Order's convergence slot (§8) |
| 7 | **[The Second Chord](mission-second-chord.md)** | Resonance Collapse, and a 30 s SIG 100 emission | You transmit. The reply is not shown — the Order's ending (§9), and the last row of §5–§7 to get a document of record. Specified in full in [mission-second-chord.md](mission-second-chord.md) |

---

## 8. Convergence — The Rim

Every campaign's final act arrives at the same eleven kilometres, within the same week of 214 PC, for four reasons that cannot be reconciled by anyone acting in good faith:

- The **Consortium** needs a producing field or it dissolves, and the rim is the only candidate left.
- The **Commune** needs to seed at depth to prove scarcity is a choice, and the rim is where the proof is largest.
- The **Directorate** must attend, and something is happening to the thing they attend.
- The **Knights** need the rim's crystal for the Second Chord, and the cycle is at 39 hours and shortening.

Whichever campaign you are playing, the other three arrive. The convergence mission is the same terrain four times and never the same mission — you have already played the other three sides' reasons, and the game declines to tell you which of them was wrong.

---

## 9. The Four Endings

| Campaign | Ending | The cost |
| --- | --- | --- |
| **Consortium** | The field is secured and the Rift's air keeps running. Varr-Kest lies to the Board, or declassifies Item 9 and loses the seat that could have used it | Solvency bought with the one thing she had never spent |
| **Commune** | The deep is seeded and habitable depth becomes manufacturable. The Directorate's monopoly ends, and so does the arrangement that kept the Directorate from having to fight | Marr's principle survives; the people who relied on it may not |
| **Directorate** | The rim is held, the attending continues, and Korrin never says what she believes | The Cantorate is intact, the transcripts stay sealed, and something is still asking |
| **Knights** | The Second Chord transmits. The Order spends the last of itself doing it | A reply, and thirty thousand people who cannot be replaced |

**None is canon.** The endings are not ranked, not merged, and not resolved by a true ending; the campaign's argument is that four correct people with incompatible obligations produce a war, and awarding one of them the last word would undo it.

---

## 10. Mission Conventions

- **One system per mission**, introduced in the first three minutes and load-bearing by the last five. **The prologue is the one stated exception** — it teaches four, in the order set out in [mission-sorrowgate.md](mission-sorrowgate.md) §10, because none of the four can be handed to a player separately: a tier means nothing without SIG, and knowing what a contact is worth means nothing without a tier.
- **Active sonar is withheld until mission 3** of each campaign. Players must be genuinely uncomfortable with partial information before they are handed the button that ends it, or the ping's cost never lands.
- **Every mission has a SIG budget** in its design notes: the loudness the mission is tuned to expect. Missions are playtested against a player who exceeds it, because most will.
- **Length** is 12–25 minutes. Two exceptions run to 40 and both are sieges.
- **Failure is specific.** No mission fails on a timer alone; every failure state is something the player can hear coming for at least sixty seconds.
- **Coral Ruins for narrative missions.** It is the human biome, and the argument for it — a map that visibly degrades under a conversation is worth more than a cutscene — rests on mid-match biome change, which is **specified and built** ([environments.md](environments.md)): a mission beat names a region and the biome its water becomes, and may collapse the geometry at the same tick. The prologue is Coral Ruins and static; what degrades in it is a structure, not the ground. **Three shipped missions now change a biome**, and the authoring question this bullet used to leave open is answered: `seeding-deep-furrow` and `seeding-in-writing` turn the second furrow to Kelp Forest when it is sown, which is the one repaint in the bible that makes ground better, and `attending-conclave` turns the galleries to Abyssal Trench when a dome comes down. The plumbing was never the constraint; deciding what a repaint is *for* was.
- **Briefings are in-register.** Each campaign's mission text obeys its faction's voice rules in [culture.md](culture.md) §3, including the Commune's refusal of the imperative mood, which makes their briefings genuinely harder to parse. That is the point.
- **Objective text is in-register too.** A mission's goals are stated in the voice of whoever is setting them, never from a shared template. "Escort the convoy" is a sentence no faction in this setting speaks, and the four that do speak would each phrase it differently enough that a template would break three of them.

---

## 11. Scaffold Status

What is built of the campaign, so nobody re-implements what exists or assumes what does not. Everything above this line is design; the table below says which of it is also code, mission by mission, and each mission document's §13 carries the row-by-row account.

| Part | Status |
| --- | --- |
| **Prologue — Sorrowgate** | Implemented (#190). [mission-sorrowgate.md](mission-sorrowgate.md) §13 is the row-by-row account of what inside it is built |
| **The Ledger** — all seven missions | **Specified and built, end to end** (#212): [mission-asset-recovery.md](mission-asset-recovery.md), [mission-shift-change.md](mission-shift-change.md), [mission-baffle.md](mission-baffle.md), [mission-exposure.md](mission-exposure.md), [mission-tolerance.md](mission-tolerance.md), [mission-prospect.md](mission-prospect.md), [mission-item-nine.md](mission-item-nine.md) — each a document of record with its literal, map and tests in the registry. The format moved the way its own comment predicted — once, early: the `deliver` predicate, readings per objective, and the condition-fired beat's choice group all landed against Ledger documents, and each §13 says which |
| **The other three campaigns** — 21 missions | **All twenty-one built, and the last to land was [Standing Wave](mission-standing-wave.md)** (#382), the hole in the middle of the Order's campaign for as long as the format had no predicate over what the player had built. The Commune's seven are built whole — [Tend](mission-tend.md), [Thin Water](mission-thin-water.md), [Convocation](mission-convocation.md), [Deep Furrow](mission-deep-furrow.md), [In Writing](mission-in-writing.md), [Radicals](mission-radicals.md), [The Second Seeding](mission-second-seeding.md) — and so are the Directorate's — [Attendance](mission-attendance.md), [Intake](mission-intake.md), [The Dome](mission-the-dome.md), [Shallow](mission-shallow.md), [Trench Awakening](mission-trench-awakening.md), [Conclave](mission-conclave-attending.md), [First Arrival](mission-first-arrival.md) — and the Order's: [Aptitude](mission-aptitude.md), [Standing Wave](mission-standing-wave.md), [Nineteen](mission-nineteen.md), [Conclave](mission-conclave-chord.md), [The Three](mission-the-three.md), [The Rim Deposits](mission-rim-deposits.md) and [The Second Chord](mission-second-chord.md). Each mission is a literal, a map and a test file that plays the tide rather than reading the literal, and each document's §13 is an account of what its own transcription found. **The format was asked for three things by the fourteen written ahead of their literals, all of them in #391** — `MissionRegion.pressureBonus`, the same field on the `ground` beat, and `holdsMovement` honouring a hull named by a `MissionHold` — and **for three more by Standing Wave** (#382), which was the one mission whose §13 was a design agenda before it was a build list: the `build` predicate, a query over the observer's own completed structures with `paired` and `detuned` narrowings for the Standing Wave, and with it `MissionObjective.standing` (a row the author says is a sentence about now) and `MissionObjective.states` (§12's readings in play, keyed on predicates); the `transit` beat, one hull walked along a route at the route's own pace, replaced outright by a later transit so a conditional turn can cancel a scheduled walk; and `MissionDefinition.works`, a site needing one of the player's hulls within reach and sited structures sitting on the floor, both of which the transcription found rather than the document asked for. The Standing Wave itself — the pairing pass, the corridor as a capsule written into the PF grid at 2.0, the kill-line, and both nodes singing at 80 — is `sim/systems/standingWave.ts`, in any water a Knight raises two Spires in, and holds to the reading [The Rim Deposits](mission-rim-deposits.md) §4 and the Order's [Conclave](mission-conclave-chord.md) §3 had already put their lattices on: a prebuilt node never completes, so it never pairs |
| **Convergence — The Rim** | **All four built.** [Prospect](mission-prospect.md) authored `mouth-rim`, and [The Second Seeding](mission-second-seeding.md), [First Arrival](mission-first-arrival.md) and [The Rim Deposits](mission-rim-deposits.md) reuse it region for region, as does the Order's ending. Five missions on one map, and §8's "the same terrain four times and never the same mission" turned out to need nothing from the registry: a mission's map is reached through its mission, so the same literal answering to five ids costs a line each. They reach the same eleven kilometres from their own directions and each names its tide of the rim week — *Prospect* and *The Second Seeding* on D, from opposite sides of the same day; *First Arrival* on D+1; *The Rim Deposits* on D+2; the Order's ending on D+3 — so no document shows another campaign's army on a tide that campaign does not put it there |
| **The four endings** | **All four built.** The Ledger's is [Item Nine](mission-item-nine.md): one conclusion outcome, two unranked records, which is §9 kept mechanically. The Commune's and the Directorate's are the same missions as their convergence slots ([The Second Seeding](mission-second-seeding.md), [First Arrival](mission-first-arrival.md)), each keeping §9's refusal to rank in its own faction's grammar, and the Order's is [The Second Chord](mission-second-chord.md) on the same rim, one tide later than the raid that bought its crystal. None of the four ranks the others, and none of them is a victory screen |
| Progression — recording what you have played (§1) | **The record is built** (#371): a per-mission history in `localStorage` under `echoes.progression`, written once from the `missionOver` payload at the result screen and readable by the shell before a room exists. It keeps the best reading a mission has ever returned, so a replay never un-completes one, and it enforces §1's one-rung unlock rule. It is a third key beside settings and the reconnection token rather than a field inside either, because a history is not a device preference and must not share their blast radius. The prologue is still replayable — it is meant to be — but the shell now knows whether it has been played |
| "Already seen" briefing variants (§1) — the first of the three systems standing on that record | **Built** (#378), with the two pairs the bible had already written: a *filed* [Tend](mission-tend.md) changes what Marr says at [Thin Water](mission-thin-water.md)'s load-out and at [Convocation](mission-convocation.md)'s bell, and changes neither mission. The record gained a **seen-scene set** — the first sibling key beside `missions`, and it needed no migration, exactly as the shape promised. A mission's alternates ship in its public header and the choice is made client-side, so nothing about which briefing a player read reaches the room: the mission cannot know, and §1 requires that it cannot. The one thing §1 refuses is worth stating, because a mission document asked for it: a variant may not change a line spoken *inside* the mission, only the text read before it |
| The two systems still standing on that record — cross-mission Drift Health (§2 rule 5), permanent roster attrition | Not started. Each is a sibling key beside `missions` in the same record, which is why it is a container of collections rather than a flat map: a key that does not exist yet reads as empty, and no first version needs a migration story |

---

## Related

- **[mission-sorrowgate.md](mission-sorrowgate.md)** — the prologue, specified: the court, the flight, the silence order and what answers the ping
- **[mission-asset-recovery.md](mission-asset-recovery.md)** — The Ledger 1, and the six documents behind it: [mission-shift-change.md](mission-shift-change.md), [mission-baffle.md](mission-baffle.md), [mission-exposure.md](mission-exposure.md), [mission-tolerance.md](mission-tolerance.md), [mission-prospect.md](mission-prospect.md), [mission-item-nine.md](mission-item-nine.md) — the one campaign specified and built whole
- **[mission-convocation.md](mission-convocation.md)** — The Second Seeding 3, specified: a walked vote, a row that cannot hear itself, and the bell nobody has rung
- **[mission-attendance.md](mission-attendance.md)** — The Attending 1, specified: one watch of a cycle, the return, and what a transcript is written at
- **[mission-aptitude.md](mission-aptitude.md)** — The Second Chord 1, specified: six hulls, six formations, and the quarter of the compass a Knight is loud in
- **[mission-deep-furrow.md](mission-deep-furrow.md)** — The Second Seeding 4, and the three documents behind it: [mission-in-writing.md](mission-in-writing.md), [mission-radicals.md](mission-radicals.md), [mission-second-seeding.md](mission-second-seeding.md) — a garden made at depth, the letter that stops being a document, the escort of what you voted against, and the rim reached by gardening
- **[mission-the-dome.md](mission-the-dome.md)** — The Attending 3, and the four documents behind it: [mission-shallow.md](mission-shallow.md), [mission-trench-awakening.md](mission-trench-awakening.md), [mission-conclave-attending.md](mission-conclave-attending.md), [mission-first-arrival.md](mission-first-arrival.md) — the ping handed over and what it costs a faction that had not needed it, the shallow band the Directorate loses to, the thing called and not steered, the First Cantor declining to move, and the rim held with the slowest hulls in the game
- **[mission-nineteen.md](mission-nineteen.md)** — The Second Chord 3, and the three documents behind it: [mission-conclave-chord.md](mission-conclave-chord.md), [mission-the-three.md](mission-the-three.md), [mission-rim-deposits.md](mission-rim-deposits.md) — the named hulls that do not come back, the vote Vrey does not call, the twelve quiet minutes at 2,900 m, and the raid the crystal makes unavoidable
- **[characters.md](characters.md)** — the twelve commanders and what each has not yet crossed
- **[factions.md](factions.md)** — the four crises, in institutional detail
- **[timeline.md](timeline.md)** — how 214 PC was arrived at
- **[culture.md](culture.md)** — the five registers the briefings are written in
- **[maps.md](maps.md)** — archetypes the campaign missions are built from
- **[bestiary.md](bestiary.md)** — Drift Health, which the campaign carries between missions
- **[glossary.md](glossary.md)** — mission, objective and briefing, which mean one thing each
