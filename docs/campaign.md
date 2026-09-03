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

**29 missions.** The order is free after the prologue. The design intends the game to track what you have already seen — replaying a scene you witnessed from the other side would change the briefing text, never the mission — and none of that tracking is built (§11).

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
| 1 | **[Tend](mission-tend.md)** | Quiet economy, bloom-share, Silent Running | A working day. Nothing attacks you. You learn what quiet is worth by having it. Specified in full in [mission-tend.md](mission-tend.md) |
| 2 | **[Thin Water](mission-thin-water.md)** | Losing a fight you did not choose | Consortium heavies catch a harvest column in the open. Objective: get 60% out — six of ten tenders, counted as hulls and read out in people. Specified in full in [mission-thin-water.md](mission-thin-water.md) |
| 3 | **[Convocation](mission-convocation.md)** | Marr's once-per-match ability, mass mobility | A plateau votes while it is being attacked, which takes exactly as long as it takes. Specified in full in [mission-convocation.md](mission-convocation.md) |
| 4 | **Deep Furrow** | Seeding, terraforming, +1 PR zones | You make a piece of the Abyssal habitable. It is genuinely beautiful and it is genuinely a provocation |
| 5 | **In Writing** | Spore Veil against the best listeners in the game | The Directorate's 205 PC letter stops being a document |
| 6 | **Radicals** | Fighting your own faction's momentum | Anholt's people move without consensus. Marr will not stop them. You are asked to escort what you voted against |
| 7 | **The Second Seeding** | Everything at once | The rim. Gardening, at the site four armies are converging on |

---

## 6. Abyssal Directorate — *The Attending*

*Undermarshal Setha Korrin believes the Choir is literal and cannot say so.*

| # | Mission | Teaches | Beat |
| --- | --- | --- | --- |
| 1 | **[Attendance](mission-attendance.md)** | HYD, passive listening, patience | No combat. You listen to the Mouth for one full cycle and record what the cohorts dream. Specified in full in [mission-attendance.md](mission-attendance.md) |
| 2 | **[Intake](mission-intake.md)** | Cohort economy, cheap expendable units | The 8% who cannot adapt are reassigned. Korrin does it herself. The mission does not editorialise. Specified in full in [mission-intake.md](mission-intake.md) |
| 3 | **The Dome** | Cantors, listening domes, Chorus Call | You spoof an army. It works perfectly and teaches you what your own ears are worth |
| 4 | **Shallow** | Your own weakness | Above 400 m: −20% speed, −15% HP. The most feared army in the Rift, losing to altitude |
| 5 | **Trench Awakening** | Megafauna, fauna aggro, Biomass | You call something and you do not steer it ([bestiary.md](bestiary.md)) |
| 6 | **Conclave** | Fighting with half an army | First Cantor Ossary does not move against Korrin directly. He simply does not move |
| 7 | **First Arrival** | Information into tempo | Arrive at the rim before anyone. Hold it with the slowest units in the game |

---

## 7. Hadron Knights — *The Second Chord*

*Choirmaster Ivane Sull has a window, a raid plan on her desk, and thirty-six years of writing she has shown nobody.*

| # | Mission | Teaches | Beat |
| --- | --- | --- | --- |
| 1 | **[Aptitude](mission-aptitude.md)** | Directional SIG — loud in the cone, quiet on the flank | Six units, no reinforcements, and the first lesson in facing. Specified in full in [mission-aptitude.md](mission-aptitude.md), and built as `chord-aptitude` |
| 2 | **[Standing Wave](mission-standing-wave.md)** | Paired nodes, corridors, PF 2.0 | You turn a canyon into a megaphone that hurts you too. Specified in full in [mission-standing-wave.md](mission-standing-wave.md) |
| 3 | **Nineteen** | Permanent loss | The 211 PC cadre. Every unit lost in this mission is gone for the rest of the campaign |
| 4 | **Conclave** | Nothing new — a defensive mission you are meant to almost lose | Chapter-Master Vrey has the standing to call a vote. He does not. He wants Sull to hear him not do it |
| 5 | **The Three** | Nothing at all | A quiet mission at 2,900 m. You escort Sull to the mute technicians. Twelve minutes, no combat, and the transcripts |
| 6 | **The Rim Deposits** | Raiding, extraction under fire | The crystal exists in exactly one place. Sull authorises the plan |
| 7 | **The Second Chord** | Resonance Collapse, and a 30 s SIG 100 emission | You transmit. The reply is not shown |

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
- **Coral Ruins for narrative missions.** It is the human biome, and the argument for it — a map that visibly degrades under a conversation is worth more than a cutscene — rests on mid-match biome change, which is **specified and built** ([environments.md](environments.md)): a mission beat names a region and the biome its water becomes, and may collapse the geometry at the same tick. The prologue is Coral Ruins and static; what degrades in it is a structure, not the ground. No shipped mission changes a biome yet — what brings a dome down, and in which mission, is authoring rather than plumbing.
- **Briefings are in-register.** Each campaign's mission text obeys its faction's voice rules in [culture.md](culture.md) §3, including the Commune's refusal of the imperative mood, which makes their briefings genuinely harder to parse. That is the point.
- **Objective text is in-register too.** A mission's goals are stated in the voice of whoever is setting them, never from a shared template. "Escort the convoy" is a sentence no faction in this setting speaks, and the four that do speak would each phrase it differently enough that a template would break three of them.

---

## 11. Scaffold Status

What is built of the campaign, so nobody re-implements what exists or assumes what does not. Everything above this line is design; the table below says which of it is also code, mission by mission, and each mission document's §13 carries the row-by-row account.

| Part | Status |
| --- | --- |
| **Prologue — Sorrowgate** | Implemented (#190). [mission-sorrowgate.md](mission-sorrowgate.md) §13 is the row-by-row account of what inside it is built |
| **The Ledger** — all seven missions | **Specified and built, end to end** (#212): [mission-asset-recovery.md](mission-asset-recovery.md), [mission-shift-change.md](mission-shift-change.md), [mission-baffle.md](mission-baffle.md), [mission-exposure.md](mission-exposure.md), [mission-tolerance.md](mission-tolerance.md), [mission-prospect.md](mission-prospect.md), [mission-item-nine.md](mission-item-nine.md) — each a document of record with its literal, map and tests in the registry. The format moved the way its own comment predicted — once, early: the `deliver` predicate, readings per objective, and the condition-fired beat's choice group all landed against Ledger documents, and each §13 says which |
| **The other three campaigns** — 21 missions | **First missions specified and built** ([mission-tend.md](mission-tend.md), [mission-attendance.md](mission-attendance.md), [mission-aptitude.md](mission-aptitude.md)) — Aptitude last, and with it every mission the bible had specified had a literal behind it. **[Thin Water](mission-thin-water.md) was the first document past that line and is now built as well** — `kell-shoulder` and `seeding-thin-water`, with tests — and its §13's prediction held: the escort hold, `souls`, the emitter window and the condition-fired beat all already shipped, and the one thing the literal wanted that the document had not anticipated was a second terminal row, because the outcome ladder is read off how many terminal objectives were met and its §8 Results table has three rows. **[Intake](mission-intake.md) followed, and is built as well** — `banding-ground` and `attending-intake`, with tests — and it broke Thin Water's streak twice: its §13 had already found the first thing a specified mission wanted and did not have since the Ledger's three additions, a predicate over Biomass, which landed ahead of the literal (#330) as `deliver` generalised over the economy record's three accounts; and the literal then found four more, each a rule that was right for a court and wrong for a shift — a mission that runs its length whatever the register stands at, `survive` as a standing count, an objective not scored before it is revealed, and a transit with a depth. Its §13 also carries two findings against the roster it does not settle: twelve live guns bring the colossus down, and the region ledger discounts a rendering. **[Standing Wave](mission-standing-wave.md) is the queue behind it: specified and not built.** Standing Wave asks for a great deal more: its §13 was the first that is a design agenda rather than a build list, headed by a docs-versus-code disagreement it deliberately did not settle — the corridor's PF 2.0 against `MAX_PROPAGATION_FACTOR`, which is 1.60 and derived. **That call and the build-radius one beside it are now made** (#372): the corridor keeps 2.0, carried by a ceiling the map reports about itself so only a standing corridor pays for it, and the build radius is 1,500 m — the pairing range — for every structure. What the literal still wants is a predicate over what the player has built, which the objective union has never carried, and its §13's other rows. **[Convocation](mission-convocation.md)** is the queue behind that: specified and not built, and the second document whose §13 is partly a design agenda. It is the first mission written on ground another mission already uses — `marr-plateau`, unchanged from [mission-tend.md](mission-tend.md) — so §2 rule 5 finally has a concrete pair to be built against, and it is the first document to need a **commander ability at all**: `MissionAbility` is a lock list and nothing in the format grants one. Its §13 also records one question it deliberately does not settle — whether the count read at the watch's edge and the active ping should be the same act. The other 14 rows of §5–§7 remain titles, teaching targets and beats, and each needs a document of its own before it needs code |
| **Convergence — The Rim** | **One of four built** — the Ledger's, as [mission-prospect.md](mission-prospect.md): the same eleven kilometres the other three campaigns will reach from their own directions, per §8's rule that it is never the same mission |
| **The four endings** | **One of four built** — the Ledger's, as [mission-item-nine.md](mission-item-nine.md): one conclusion outcome, two unranked records, which is §9 kept mechanically |
| Progression — recording what you have played, and the briefing variants that depend on it (§1) | Not started. The prologue is replayable and remembers nothing, so the Tutorial and campaign doors are currently the same door |

---

## Related

- **[mission-sorrowgate.md](mission-sorrowgate.md)** — the prologue, specified: the court, the flight, the silence order and what answers the ping
- **[mission-asset-recovery.md](mission-asset-recovery.md)** — The Ledger 1, and the six documents behind it: [mission-shift-change.md](mission-shift-change.md), [mission-baffle.md](mission-baffle.md), [mission-exposure.md](mission-exposure.md), [mission-tolerance.md](mission-tolerance.md), [mission-prospect.md](mission-prospect.md), [mission-item-nine.md](mission-item-nine.md) — the one campaign specified and built whole
- **[mission-convocation.md](mission-convocation.md)** — The Second Seeding 3, specified: a walked vote, a row that cannot hear itself, and the bell nobody has rung
- **[mission-attendance.md](mission-attendance.md)** — The Attending 1, specified: one watch of a cycle, the return, and what a transcript is written at
- **[mission-aptitude.md](mission-aptitude.md)** — The Second Chord 1, specified: six hulls, six formations, and the quarter of the compass a Knight is loud in
- **[characters.md](characters.md)** — the twelve commanders and what each has not yet crossed
- **[factions.md](factions.md)** — the four crises, in institutional detail
- **[timeline.md](timeline.md)** — how 214 PC was arrived at
- **[culture.md](culture.md)** — the five registers the briefings are written in
- **[maps.md](maps.md)** — archetypes the campaign missions are built from
- **[bestiary.md](bestiary.md)** — Drift Health, which the campaign carries between missions
- **[glossary.md](glossary.md)** — mission, objective and briefing, which mean one thing each
