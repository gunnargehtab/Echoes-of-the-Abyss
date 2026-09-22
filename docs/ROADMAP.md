# Project Roadmap — Echoes of the Abyss

The repo-side companion to the backlog on GitHub. Two development epics are closed, and their
phases are kept below as the record of how the build got here: the first
(<https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/97>), and the September 2026
audit (<https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/428>), which closed with
twenty-eight of its thirty findings landed. The two it did not close outlived it: the duel
balance reading and competitive play. Both sit under Later below.

**How the phases work.** Phases 0 to 10 are history. Each is the batch one epic or audit
filed, and their dates show most of them ran at once, so their order is the order they were
written. From Phase 11 the order is a plan: one phase runs at a time (**Now**), one waits
behind it (**Next**), and each has a **Done when** line that says what closes it. When that
test passes, Next becomes Now. Anything nothing schedules sits under **Later**, undated. An
epic gets one row; its sub-issues do not.

This document is also what the roadmap site renders (`tools/roadmap/build.mjs`). The site
reads the phase tables, asks GitHub whether each issue is open, and draws that — so a table
row is a claim that the work is tracked, not a claim that it is live. The tracker is what
says which, and the site asks it on every build. The site also counts the open issues this
document places in no table, shows the
newest roster contact sheet an art PR committed under `docs/screenshots/`, and dates every
phase from the tracker — the day its first issue was filed to the day its last one closed —
so no phase date is typed anywhere. The first issue on this roadmap was filed on 15 August
2026, and Phase 0 below is that week.

---

## Where the build actually stands

What is open sorts into four kinds. Which issues are in each is deliberately not written
here, and neither is the count. Both were wrong twice inside a month — the phase tables
in #445, then the prose that replaced them in #502, twenty-three hours later — because
a sentence about what is open goes false on its own, with nobody touching the file. The
roadmap site reads every state live from the tracker on each build, which a paragraph
cannot; the kinds are the part that keeps.

- **What the audit still owes** — the findings it filed that have not landed. The epic
  itself is closed, and what is left of it no longer hangs under anything: one parked
  balance reading, and the mode that now sits under Later. It is the only kind that shrinks by
  being worked rather than by being re-read.
- **Older than the audit** — issues filed before it and not superseded by it: the world
  epic, and the debts a presentation or platform decision left behind rather than paid.
- **Parked** — issues labelled `wontfix`. The label means the investigation is written
  down and the next move is one the build cannot make yet, not that the finding stopped
  being true; the reading stands, and the rows below say so.
- **Filed since the audit** — everything opened after it, epics included. Most of it comes
  from working the audit's own findings, which is the shape of a healthy backlog rather
  than a symptom.

Every issue this document tracks belongs in a row below, closed ones included — a closed row
is the record of how the build got here, not clutter. The open issues that have no row are
counted on every build and named in the log, so the gap is measured rather than asserted
away here.

That is the issue tracker's account. The build's own account is less flattering, and the two
numbers below are the ones that decide whether the game is playable end to end — which is
the bar `CONTRIBUTING.md` sets for the first tag.

| Question | Reading | Tracked |
| --- | --- | --- |
| Does a skirmish finish? | **29 of 30** baseline matches decide, at a median 1,003 s | [#440](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/440) |
| Does the Echo pass hold its budget? | The 2 ms budget breaks at about 160 entities | [#430](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/430) |
| Is the frame time real? | Nothing timed on a real GPU or on Termux yet | [#286](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/286) |

The first row is the one that matters. A game "you can sit down and play alone" — the phrase
earlier revisions of this document used — is a game whose matches end, and the harness's own
README already warned that running more matches only buys more draws.

The baselines beside it narrow the question. The two-seat batches resolve — ten of ten
Consortium-versus-Commune matches ended, at a median 564 seconds — and the four-seat batch
still mostly does not, on the same map and the same cap. A four-seat win needs three
eliminations and the median match reaches two, so what #440 has to explain is why the third
commander survives twenty-five minutes.

Part of the answer is in, and it was not a balance question at all. The commander could ask
for a Vent Tap the server would always refuse — the search that chose the vent did not know
the placement rule the server enforces — and because the construction branch reserves a
site's price out of the same purse the production branch spends from, a commander that had
lost its harvesters spent its whole bank on that refusal on every observation and could never
queue the harvester that would have saved it. It could not concede either: the scuttling rule
([game-identity.md](game-identity.md)) reads a bank that could buy a harvester as a commander
who still has a move, which was true of every commander except that one. So a seat that was
finished by minute eight sat on its Bastion until the cap. That, a turret bought against a
grazer, a strong army that never opened the commitment its weaker self got, and a push whose
destination was re-chosen from the freshest contact every 200 ms are all fixed, and decided
matches went from one in thirty to eight.

What remains is the harder half, and it is what the issue named first: the commander plans no
build order, holds no economy-to-military ratio, and does not press an attack it has arrived
at. The armies now reach each other's bases and do not finish them. The scuttling rule looks
patient rather than wrong now that the position it was reading has stopped being a bug —
re-read it against a baseline where the AI plays, not before.

The second row is the reason the first cannot be fixed by adding units. Every hull the roster
grows and every seat a population cap admits is an entity in the detection pass, and the pass
is already over budget at the counts a four-player match reaches. The two design questions
that want more entities — the exclusive hulls (#436) and the population cap (#437) — are
gated on the budget, not on their own merits.

What *is* done is substantial, and all of it stands:

- the **Echo Layer** resolving per player at 5 Hz, with PropagationFactor integrated along
  the emitter-to-listener path and a thermocline the docs always specified;
- **depth as an order** — descent fast and deafening, ascent slow and silent, crush attrition
  no repair undoes, and Resonance Crystal at the bottom of it;
- **the mix** — a bus graph, contacts sonified by resolution tier, and the player's own
  loudness as a bed the exposure cue cuts through;
- **a map that argues back** — three authored archetypes, vent eruptions, resonance storms,
  cold-shock currents and kelp fields, Echo Marks as acoustic residue, and Thermal Draw as a
  rate rather than a pile;
- **the Drift** — fauna that listen, answer the loudest thing, and are indistinguishable from
  a warship until Tier 3;
- **combat with a design behind it** — [systems-combat.md](systems-combat.md), and every row
  of its §14 mapping implemented: guns, torpedoes as ordnance with their own SIG, mines,
  countermeasures, firing solutions gated at Tier 2, vertical combat;
- **a full line per navy** — seven waves in, sixteen hulls across the role matrix planned in
  [roster-plan.md](roster-plan.md): transports that carry a force in a hold, scouts that run
  engine-off, ordnance, siege, the line hulls, and a mid-tier whose two guns are the first in
  the game aimed by loudness rather than by range;
- **a lobby, a skirmish AI, reconnection and a rematch**, with the AI restricted to the same
  `EchoSnapshot` a human receives;
- **a balance harness** that reports every guard-rail in [economy.md](economy.md) §9 and
  [bestiary.md](bestiary.md) §8 against a number — which is how the first row above is known
  at all;
- **the campaign** — a mission runtime and all twenty-nine missions on it, the Prologue
  ([mission-sorrowgate.md](mission-sorrowgate.md)) through *Standing Wave*, with a record
  that remembers what was played and briefings that read it;
- **the conn view** — the August 2026 presentation revision landed whole
  ([three-layer-ocean.md](three-layer-ocean.md)): a perspective camera over a sculpted
  seabed, the roster models sailing at true depth, and the HUD composited over the world
  through one shared camera;
- **the acoustic veil** — the water goes cold where nothing of yours is listening
  ([ui-ux.md](ui-ux.md) §4.5). A drawing rule over data the room has always sent, drawn from
  the propagation model solved for loudness rather than from a listening radius, so the biome
  is visibly the lever.

The engineering around it is in good order — server-authoritative hidden information,
deterministic replays with a state hash, a benchmarked Echo pass, a test suite past 1,900
cases, and a green CI in about two minutes. The audit's headline was that the discipline is
production-grade and the *game* around the core mechanic is still a prototype: a six-hull
roster shared across factions, no pathfinding, no competitive mode, matches that do not end,
and nothing about shipping in place. Phase 10 was that list; Phase 11 is what is being worked
now.

---

## The two pillars, honestly assessed

`CLAUDE.md` states the design axis: every mechanic in this game is an argument about
**sound** or **depth**. Both pillars stand.

| Pillar | Status |
| --- | --- |
| Echo Layer — SIG, PF, resolution tiers, silent running, active sonar | Implemented and load-bearing |
| The mix — which [audio-direction.md](audio-direction.md) calls the *primary* information channel | Implemented: bus graph, tier sonification, self bus, exposure cue |
| Pressure ratings, crush attrition, the Sounding Spire's PR grant | Implemented |
| Depth as something a player can change | Implemented: depth orders, the ribbon, the crystal gate |

One asymmetry shaped everything that came after it: for a long time **depth had no acoustic
consequence.** The Echo Layer read `Position.depth` only to report it at Tier 3, so sitting at
1,500 m sounded exactly like sitting at 300 m to everyone listening, and depth cost *time* and
*noise while moving* and nothing else.

This entry used to call that "a design question [systems-echo.md](systems-echo.md) has not
answered", and that was wrong on the doc's own terms: §3's PropagationFactor table has carried
a thermocline row since it was written. The gap was in the code, not in the design — which is
worth remembering, because a doc read as silent for long enough starts to be treated as
undecided. The layer is implemented now (§3, "Where the layer sits").

The same lesson applies to the first row of the table above this one. A baseline that reads
"29 of 30 undecided" for long enough starts to be treated as the harness's problem rather
than the game's.

---

## Phase 0 — The bible, the scaffold, and the gates

**Closed.** The project's first day filed twenty-five issues and closed twenty-two of them:
a design bible, a repository that could build it, and the checks that stop the two from
drifting apart. The order is the point, and it is the order everything since has followed —
the documents first, the scaffold second, the gates third, and then a read of all three
against each other, which found six places where they already disagreed on the day they
were written.

**The design bible**

| Work | Issue |
| --- | --- |
| Glossary — the authoritative terms | [#6](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/6) |
| Glossary finalised | [#20](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/20) |
| Glossary cross-links | [#21](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/21) |
| `units.md` — the first roster | [#7](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/7) |
| Per-unit stats and a playtest plan | [#22](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/22) |
| Unit playtest checklist | [#23](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/23) |
| This roadmap, first form | [#8](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/8) |

**The scaffold**

| Work | Issue |
| --- | --- |
| Frontend starter | [#9](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/9) |
| Echo Layer prototype | [#10](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/10) |
| Example scene and input handling | [#24](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/24) |
| `echo-sim` scenarios and datasets | [#26](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/26) |
| `echo-sim` as a module | [#27](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/27) |

**The gates**

| Work | Issue |
| --- | --- |
| CI and linting | [#11](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/11) |
| Client build in CI | [#25](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/25) |
| ESLint and Prettier, enforced | [#28](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/28) |
| markdownlint and a link check over `docs/` | [#29](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/29) |
| Developer quickstart | [#12](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/12) |
| Quickstart refined | [#30](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/30) |
| `CONTRIBUTING.md` | [#16](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/16) |
| Labels and templates | [#17](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/17) |
| Branch and commit conventions | [#18](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/18) |

**How the project runs**

| Work | Issue |
| --- | --- |
| Owners and roles | [#14](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/14) |
| Project board | [#15](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/15) |
| A channel and the kickoff | [#19](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/19) |
| Graphics standards and an Android smoke test | [#57](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/57) |

**What the first read-through found**

| Work | Issue |
| --- | --- |
| Resolution tiers contradicted themselves: 0–4 vs 0–5 | [#34](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/34) |
| HYD values invented by the code | [#35](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/35) |
| `echo-sim` used a different detection formula | [#36](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/36) |
| PropagationFactor sampled at the emitter, not along the path | [#37](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/37) |
| About 270 markdownlint faults; the gate only reported | [#38](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/38) |
| Seven linked docs never written | [#39](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/39) |

**Six findings on a five-day-old repository is the whole argument for the rule this project
runs on.** Every one of them is the same shape — the documents say one thing and the code
does another — and #37 is the one worth remembering: the propagation model every mechanic in
the game descends from was being sampled at the emitter rather than integrated along the
path, so the docs described a game the code was not playing. "Docs are canonical, change the
doc first" is not a style preference here. It is what these six cost.

---

## Phase 1 — Make the second pillar playable

**Closed.** Depth became an order, with the asymmetry the doc specs: descent fast and
deafening, ascent slow and silent. Then the HUD could show it, and the Abyssal band got a
reason to exist.

| Work | Issue |
| --- | --- |
| Depth orders — loud descent, silent ascent | [#98](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/98) |
| Depth HUD — ribbon, PR badge, crush hatching | [#99](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/99) |
| Resonance Crystal and its tech gate | [#100](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/100) |

**Why it went first.** Everything downstream — deep raids, the Directorate's birthright, the
Consortium's paid refits, [economy.md](economy.md) §7 in its entirety — was inert until a
unit could change depth.

---

## Phase 2 — The game about sound makes sound

**Closed.** The bus architecture from [audio-direction.md](audio-direction.md) §12, contact
sonification by tier, and the player's own loudness in the mix.

| Work | Issue |
| --- | --- |
| Audio engine — bus graph, 24-voice budget | [#101](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/101) |
| Contacts sonified by tier | [#102](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/102) |
| Own loudness, exposure cue, sonar modes | [#103](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/103) |

**Two rules held across the phase and still hold.** Audio is presentation only: no audio
state may feed back into the simulation, and the mix must never be why two clients disagree.
And accessibility is a gate rather than a follow-up — audio-only information is a bug
([audio-direction.md](audio-direction.md) §11), so every cue ships with its visual
equivalent.

---

## Phase 3 — The map becomes an opponent

**Closed.**

| Work | Issue |
| --- | --- |
| The Drift — fauna as listeners and contacts | [#104](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/104) |
| Hazards — vent eruptions and resonance storms | [#105](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/105) |
| Echo Marks and industrial hum | [#106](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/106) |
| Authored map archetypes | [#107](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/107) |
| Thermal Draw — a rate, not a stockpile | [#108](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/108) |

**Why this phase mattered more than it looked.** Fauna make every Tier-1 smear ambiguous,
which is the difference between hidden information and merely absent information. Echo
Marks make the past legible and give HYD something to be worth. And with one map, there was
exactly one PF landscape — so faction balance could not be assessed at all until there were
several. There are three now, and the balance harness runs on one of them; the other two
have no baseline yet.

---

## Phase 4 — A game you can sit down and play

**Closed as filed.** The lobby, the AI, the control surface and the minimap all exist. What
the phase title promised — a match one person can play to a result — is what Phase 10's
first row is about, because the AI that was built to be beaten cannot yet beat anyone
either.

| Work | Issue |
| --- | --- |
| Skirmish AI on the same snapshot a player gets | [#109](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/109) |
| Match lifecycle — lobby to rematch | [#110](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/110) |
| Box select, control groups, order queue | [#111](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/111) |
| Sonar-scope minimap and contact log | [#112](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/112) |
| Unit separation and obstacles | [#113](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/113) |
| Epic — the combat design | [#161](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/161) |
| Epic — the game menu | [#186](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/186) |
| Epic — the in-game interface | [#187](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/187) |

**The AI's information restriction is a design test, not an implementation detail.** An
opponent that reads world state is playing a different game from the one the player is
playing. The restriction held: `AiTuning` has no vision multiplier and a test fails by name
if one is added. What the restriction did not test is whether a restricted opponent can
*finish* — it finds the enemy in 26 seconds and draws first blood in 51, and then the match
runs to the cap.

---

## Phase 5 — Hold the line

**Closed.** Seeded RNG, replay capture and the determinism test landed before fauna, hazards
and the AI, as the sequencing notes asked, and the balance harness turned the design bible's
guard-rail tables into a command you can run.

| Work | Issue |
| --- | --- |
| Echo pass scaling past ~150 entities | [#90](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/90) |
| Seeded RNG, replays, determinism test | [#114](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/114) |
| Headless balance harness | [#115](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/115) |

**The first row did not stay won.** #90 brought the pass inside 2 ms at the entity counts of
the day, and the detection kernel it pruned is still well pruned. What the September bench
found is the cost *around* the kernel — full entity-id walks per slot per pass, and public
payloads recomputed once per player — growing with a roster and a fauna cap the pass did
not have then. That is Phase 10's #430, and the budget it is against is the same one.

---

## Phase 6 — What the harness found

**Closed.** The balance harness
([#115](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/115)) exists to turn
design claims into numbers, and the first numbers it produced were about mechanics the docs
specified and the code did not have.

| Work | Issue |
| --- | --- |
| Industrial hum lasted 5 s, so economies were silent | [#136](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/136) |
| The Hadron tithe, specified but not built | [#140](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/140) |

**Both were found the same way**, and it is the way this phase was meant to work: a
guard-rail read as breached, the number underneath it pointed at a specific doc section, and
that section turned out to describe something nobody had built. Neither was a balance tuning
question. Both were "the doc says this and the code does not", and both are built.

The harness's second finding is the one it could not point at a doc section for, because no
section says a match must end: the 29 of 30 above. It sat in a committed baseline for a
month while this phase was recorded as closed.

---

## Phase 7 — What the physics audit found

**Closed.** Epic [#121](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/121) asked
whether to adopt a third-party physics engine. The answer was no, and the reasoning is on the
issue: the simulation's whole physics is a few hundred lines of deliberate steering,
determinism here is load-bearing for replays, the state hash and the balance harness, and an
impulse solver would inject energy into a game where position *is* information. What the
question exposed was that nobody had audited those few hundred lines.

| Work | Issue |
| --- | --- |
| Separation, world bounds, 60 Hz instrumentation | [#149](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/149) |
| Terrain passability | [#150](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/150) |
| Cold shock currents | [#151](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/151) |
| Kelp entanglement | [#152](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/152) |
| Sounder transit collision | [#153](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/153) |
| Directorate shallow-water penalty | [#154](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/154) |
| Epic — a solid physics engine | [#121](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/121) |

The first row was different in kind from the other five. #149 was defects — a hull
overlapping three neighbours separated from one of them, a stacked-hull tie-break seeded from
process-global entity ids in a codebase that had already been bitten by exactly that twice,
and a vent eruption at the map edge throwing hulls off the map. None of that was reachable by
the tests, because there was no movement test at all.

The other five were Phase 6's pattern again: the doc says this and the code does not. Every
force named in [hazards.md](hazards.md) except vent knockback was an authored site with no
behaviour.

Two gaps were deliberately kept off this list at the time, and both have since been settled
the right way round — design first. **Travelling munitions** waited on a combat design doc;
[systems-combat.md](systems-combat.md) is that doc, and torpedoes are ordnance entities with
their own SIG. **Fauna separation** was a design question rather than a defect, and
[bestiary.md](bestiary.md) has decided it: creatures pass through hulls freely, on purpose,
because separation exists so a formation does not pile up on itself and a creature over a
submarine is not a formation problem.

What the audit did not ask, because it was auditing the lines that exist, is whether a hull
should steer *around* ground rather than into it. It should, and does not: hulls steer
straight at the order and slide along whatever blocks them. That is Phase 10's #431.

---

## Phase 8 — Missions

**Closed.** [campaign.md](campaign.md) describes twenty-nine missions and the scaffold could
run none of them. A skirmish ends when one side has no Bastion left; a mission ends when the
thing it is about has happened, and nothing in the match loop knew how to ask that question.
This phase built the machinery that asks it — authored parties seated outside the lobby, a
schedule of beats that fire at the times the design doc says they fire, and objective
predicates the server evaluates — and proved it against one mission specified down to the
briefing text.

| Work | Issue |
| --- | --- |
| Mission runtime, proven on *Sorrowgate* | [#190](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/190) |
| Epic — the twenty-eight missions after the prologue | [#212](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/212) |
| Epic — the storyline and the game world | [#224](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/224) |

**Two things were deliberately outside it**, and the bet paid. The other twenty-eight
missions are all built on the machinery *Sorrowgate* proved, and between them they asked the
format for fourteen things rather than a rewrite — the last three from *Standing Wave*
(#382): a predicate over what the player has built, a beat that walks a route, and a rule
that a site needs the works beside it. The progression record is built (#371), the briefing
variation it was owed with it (#378), and the three systems that stood on the record behind
them — Drift Health carried between missions on one map, the roster a mission spends, and a
voice under every line ([campaign.md](campaign.md) §11).

The world the campaign lives in has its own epic (#224). Its six sub-issues are closed and
the missions have been audited against the world documents; what remains is a short list of
design calls and one undecided shape, recorded in plain text in the Planned section of
[README.md](README.md) rather than as issues, because none of them is work until somebody
chooses.

---

## Phase 9 — What the switch left owed

**Closed.** The presentation revision
([three-layer-ocean.md](three-layer-ocean.md)) landed in five phases, and each phase's record
named the debts it chose to carry rather than hide. With the switch merged (#281), those
debts were the open work — none discovered late; every one written into the record of the
phase that created it. The last, the frame-time measurement, moved to Phase 12.

| Work | Issue |
| --- | --- |
| Column glyph for contacts below Tier 3 | [#283](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/283) |
| Far-zoom readability scale | [#284](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/284) |
| Audio cue for sour exposure | [#285](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/285) |

**Three kinds of debt, worth keeping distinct.** The first two were honesty of presentation,
and both are settled. The third was the parity rule — the Lid bleeds unrecoverable hull, and
[audio-direction.md](audio-direction.md) §11 makes a visible fact with no audible equivalent a
bug in a game whose primary channel is the mix — and it is settled too. The fourth is
measurement, and it is the one this phase did not settle: every frame-time number in the
phase records
prices SwiftShader in a container, and the budgets stay container-shaped until the composited
two-canvas frame is timed on the hardware the game actually promises to run on. It needs a
desktop with a GPU and an Android device under Termux, which is why an unattended run cannot
take it.

---

## Phase 10 — What the audit found

**Closed.** The September 2026 audit (epic
[#428](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/428)) read the backend
simulation, the frontend renderer and netcode, the design bible against the RTS genre, and
the engineering around all of it. Each finding is one issue with the evidence behind it and
a concrete change, so an unattended run can take them one at a time. The epic ranked them by
impact; this table groups them by what they are, and the ranking is on the issue. The epic is
closed — twenty-eight of the thirty landed — and the rows below are what it leaves behind,
read live from the tracker rather than from its checkboxes. What was still open moved to
Phases 11 and 12, and to Later, when the roadmap was re-planned on 22 September.

Half the groups below are not the audit's, and that is the shape of a healthy backlog rather
than drift. **The opponent** is where the harness's own findings went once matches started
ending. **The roster, wave by wave** and **the fleet as buildable source** are the two halves
of what a navy is — the hulls it fields and where their shapes come from — and both were
opened by working the audit's own design rows. **The Biomass account** is one finding read
three times before anybody named it, which is why its rows point at each other. And **filed
since the audit** holds the rest of what was opened before the re-plan. They sit in this phase because
it is the phase the build is in, not because the audit found them.

**The match that does not end**

| Work | Issue |
| --- | --- |
| Match resolution — 29 of 30 skirmishes decide | [#440](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/440) |

**The opponent**

| Work | Issue |
| --- | --- |
| Consortium beat the Directorate 90–10 — superseded by #520, #530, #535 | [#458](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/458) |
| AI verb parity, enforced by type | [#621](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/621) |
| The escort gate starves the smallest navy of ordnance | [#698](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/698) |
| The Commune’s own hulls in the AI’s hands | [#467](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/467) |
| Knights won 83% of decided matches — fixed | [#454](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/454) |
| No commander built a Slipway in duels | [#518](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/518) |
| The Directorate cannot pay for its rung hulls | [#520](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/520) |

**Performance and netcode**

| Work | Issue |
| --- | --- |
| Echo pass scaling — queries and shared payloads | [#430](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/430) |
| Interpolate own hulls between snapshots | [#429](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/429) |
| The overlay repaints every frame from 5 Hz data | [#432](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/432) |
| Delta-encode the Echo snapshot | [#433](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/433) |
| Fewer draw calls; partial terrain rebuilds | [#434](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/434) |
| Backend hot spots | [#444](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/444) |

**Controls**

| Work | Issue |
| --- | --- |
| Pathfinding around blocked ground | [#431](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/431) |
| Attack-move, rally, stop and hold, edge scroll, a queue | [#435](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/435) |
| Mouse and keyboard on a PC — done | [#294](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/294) |

**Design**

| Work | Issue |
| --- | --- |
| Two exclusive hulls per navy, and a tech rung | [#436](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/436) |
| Upgrades and veterancy, and how loud each is | [#462](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/462) |
| A population cap | [#437](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/437) |
| Learnable scatter water; superweapons redesigned | [#438](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/438) |
| Combat depth — longer fights, a mine astern | [#463](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/463) |

**The roster, wave by wave**

| Work | Issue |
| --- | --- |
| A full line per navy — sixteen hulls | [#495](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/495) |
| The rung’s roster in code | [#461](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/461) |
| Models for the rung’s nine | [#466](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/466) |
| Wave 0 — harness and opening kit | [#498](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/498) |
| Wave 1 — transports | [#501](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/501) |
| Wave 2 — scouts | [#506](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/506) |
| Wave 3 — ordnance | [#507](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/507) |
| Wave 4 — siege | [#508](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/508) |
| Wave 5 — line hulls | [#509](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/509) |
| Wave 6 — the three common hulls kept | [#510](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/510) |
| The Knights’ build named a stale Corvette | [#529](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/529) |
| Wave 7 — mid-tier, guns aimed by loudness | [#531](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/531) |
| Pressure Refit — the Consortium’s route deep | [#517](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/517) |

**The fleet as buildable source**

| Work | Issue |
| --- | --- |
| The Sower and Spinner ported | [#546](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/546) |
| Sentinel Turret variants as scripts | [#553](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/553) |
| The Clarion’s horn seams spiral | [#640](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/640) |
| Known defects the ports reproduce | [#645](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/645) |
| Dredge and Precentor sides swapped in the docs | [#650](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/650) |
| The last twenty structures as scripts | [#652](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/652) |

**The Biomass account**

| Work | Issue |
| --- | --- |
| The Chorister unaffordable — folded into #535 | [#530](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/530) |
| Biomass is a stock, not an income | [#535](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/535) |
| The flora economy | [#547](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/547) |
| Flora wave 1 — the crop is the canopy | [#549](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/549) |
| Flora wave 2 — regrowth and repopulation | [#554](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/554) |
| Flora wave 3 — the bio-reactor | [#557](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/557) |
| Flora wave 4 — the windfall goes to the killer | [#560](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/560) |

**Shipping and hygiene**

| Work | Issue |
| --- | --- |
| Deployment config and unused dependencies | [#441](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/441) |
| Frontend housekeeping and code splitting | [#442](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/442) |
| Test gaps — renderer, client, step budget | [#443](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/443) |
| Test gaps — shell, wire, audio graph | [#487](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/487) |
| Wire messages declared once | [#489](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/489) |
| The esc menu’s focus rules | [#515](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/515) |
| Wire message shapes checked on arrival | [#628](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/628) |
| This roadmap cited closed work as live | [#445](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/445) |
| This roadmap asserted live state in prose | [#504](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/504) |
| Epic — `CLAUDE.md` cut down and deduplicated | [#790](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/790) |

**Filed since the audit**

| Work | Issue |
| --- | --- |
| The acoustic veil — fog of war for the chart | [#472](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/472) |
| Prologue harvesters would not move | [#478](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/478) |
| Tetherjelly re-homed per map | [#480](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/480) |
| No navy can reach the crystal tier | [#491](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/491) |
| Test gaps — screen accessibility | [#494](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/494) |
| The campaign read in play order | [#534](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/534) |
| The SIG meter counted structures, not the fleet | [#623](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/623) |
| The map containment guard is only syntactic | [#636](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/636) |
| Drift Health bands read non-monotone | [#655](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/655) |
| The mix is too loud on a phone | [#663](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/663) |
| Epic — the prologue, reworked after playing it | [#720](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/720) |

**Why match resolution stands alone at the top.** Every other row is an improvement to a
game; the first row is whether there is one. The balance guard-rails are the only instrument
this project has for reading its own design claims, and two of them refuse to rule below ten
decided matches. Until skirmishes end, "quiet economies simply win" and "loud economies are
unplayable" — the two risks [economy.md](economy.md) §9 names first — cannot be read at all,
and every tuning constant moved in the meantime is moved blind.

**The top three of the epic's ranking go together.** Interpolation (#429), the Echo pass
(#430) and pathfinding (#431) are being implemented in one PR, because they meet in the same
files: the pass that decides what a client may know, the client that draws it, and the
movement that both are about. The interpolation is for the player's *own* hulls only.
[ui-ux.md](ui-ux.md) §4 and §12 forbid smoothing a contact between snapshots, and that rule
is not on the table — a contact that glides is a contact the server never resolved.

**The design rows are documents before they are code.** Most of them ask for a decision in
`docs/` first, and [units.md](units.md)'s own "Next steps" has listed faction unit variants
as the next thing to author for as long as the roster has existed. The population cap in particular has
sat in the Planned section of [README.md](README.md) as a deferred question; it is an issue
now because the Echo budget puts a number on what a cap can be.

---

## Phase 11 — The carriers, and the fleet as source

**Now.** The one phase being worked. The eighth roster wave shipped the carriers and their
craft ([#838](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/838), [#840](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/840)); what is left is a commander that flies them, and the
craft's own bugs. The fleet's last models still need their scripts. The loop's defects ride
along, because most are found working these two.

**Done when:** the commander builds and flies a carrier in the baseline, every model under
`docs/concept-art/models/` is script output that `npm run check:models` rebuilds, and no row
below is open.

**The carriers**

| Work | Issue |
| --- | --- |
| Wave 8 — the commander flies its carriers | [#839](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/839) |
| A craft launched astern shoves its own carrier | [#863](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/863) |
| The AI ignores the berth cap | [#854](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/854) |
| `units.md` calls the Spark the “heaviest craft” | [#872](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/872) |

**The fleet as buildable source**

| Work | Issue |
| --- | --- |
| Every model built from a script | [#540](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/540) |
| The fourteen environment props as scripts | [#869](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/869) |
| Two Order hulls have faces wound inward | [#871](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/871) |
| Props render up to 1.23× their reviewed size | [#876](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/876) |
| Three props have faces wound inward | [#878](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/878) |
| Block 4 and the approved props disagree | [#879](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/879) |

**Defects the loop finds**

| Work | Issue |
| --- | --- |
| A hidden clock re-measured every second | [#857](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/857) |
| `headless.ts` names the wrong cause for a rebuild | [#858](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/858) |

---

## Phase 12 — An ocean you can read

**Next.** Starts when Phase 11's test passes. The map-visuals plan in its own order — the
loudness ladder, then public fauna as stipple, then classified fauna — and then the frame time
measured on the hardware the game promises, because the visual pass is what changes it.

**Done when:** every map layer names its loudness rung with a test holding it, public and
classified fauna draw as stipple, and the composited frame is timed on a real GPU and on
Termux.

| Work | Issue |
| --- | --- |
| A visual direction for the 3D ocean | [#807](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/807) |
| Ladder audit — every map layer names its rung | [#866](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/866) |
| Tetherjelly and Lampfry as stipple | [#867](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/867) |
| Classified fauna as stipple, denser at Tier 4 | [#868](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/868) |
| Frame time on a real GPU and on Termux | [#286](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/286) |

---

## Later — Parked and unscheduled

**Later.** Nothing here is scheduled, so nothing here is dated. A row moves up when a Next
phase is planned around it.

**Standing epics**

| Work | Issue |
| --- | --- |
| Epic — defects the loop finds | [#746](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/746) |
| Epic — feature and improvement ideas | [#833](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/833) |

Both stay open by design: each is where a new issue lands when it has no other home. Their
sub-issues get rows in the phase that schedules them.

**Parked under the balance freeze**

| Work | Issue |
| --- | --- |
| Directorate wins 75% — parked under the balance freeze | [#654](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/654) |
| The rung costs a third of a navy’s match income | [#706](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/706) |

`CLAUDE.md` freezes balance work while the systems still change shape. Both readings are
recorded and left.

**Held for a person**

| Work | Issue |
| --- | --- |
| An independent read of the story | [#469](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/469) |

A reading of the world is worth less done by the hands that wrote it, so no unattended run
takes this one.

**Built when a branch wants it**

| Work | Issue |
| --- | --- |
| Three verbs the commander still lacks — a vocabulary of 22 of 27 | [#703](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/703) |

A verb gets built when a commander branch needs it, not to round a count up.

**Competitive play**

| Work | Issue |
| --- | --- |
| A competitive-mode document | [#439](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/439) |

The audit filed this as one document, which undersold it. A ladder, ratings, accounts, team
rules and an observer are a whole mode the game does not have. The hard part is the observer:
a spectator handed unresolved state is a maphack, so a watcher's view has to be resolved the
way a player's is — delayed, per side, or from a designated listener set. It waits because a
ladder measures skill against a game whose matches decide and whose navies are balanced, and
three of the maps a pool would draw on are archetypes rather than built maps.

**After the game ships**

| Work | Issue |
| --- | --- |
| A fifth navy of mercenaries, after release | [#543](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/543) |

Wave 6 ([#510](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/510)) kept the three hulls every navy shares and left their fiction open: four
navies at war build the same three hulls from nobody. The answer is a fifth navy that sells
them — multiplayer only, with its own roster and storyline. It waits because it is a fifth
seat's worth of entities in a detection pass that already breaks its budget at about 160.

---

## Sequencing notes

The three dependencies the first epic named all held — seeded RNG landed before fauna,
hazards and the AI; Echo pass scaling landed before fauna; depth orders landed before the
depth HUD and the crystal. Three new ones survive any reordering of Phase 10:

1. **Match resolution ([#440](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/440))
   before any balance tuning.** The win-rate guard-rails cannot rule on one decided match,
   so a constant moved before skirmishes end is moved without the instrument that would
   show whether it helped.
2. **Echo pass scaling ([#430](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/430))
   before the population cap ([#437](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/437))
   and the exclusive hulls ([#436](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/436)).**
   Both add entities to the detection pass, and the pass breaks its budget at about 160
   already. A cap chosen against today's pass would be chosen against a budget that is
   already blown.
3. **Pathfinding ([#431](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/431))
   before the control conventions ([#435](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/435)).**
   Attack-move and rally points are promises about where a hull will go; a hull that slides
   along the first wall it meets cannot keep them.

---

## Ground rules

- **One phase at a time.** Now closes when its Done-when test passes, and Next takes its
  place. Later is undated. An epic gets a row; its sub-issues do not.
- **Docs are canonical.** Change the doc first, then the constant, and cite the section in
  the comment. See `CLAUDE.md`, "Constants live in exactly one place".
- **Server-authoritative is a hard rule.** Nothing unresolved crosses the wire — not
  temporarily, not behind a debug flag that ships.
- **A mission's script is hidden information too.** Objective predicates, beat schedules and
  scripted force composition never enter the Colyseus schema and never leave the server
  unresolved. A player who can read the schedule knows what arrives, and when, before it is
  audible — which is the same kind of knowing as reading an enemy's position off the wire.
- **Two clocks.** New per-tick work is on the 60 Hz budget; anything touching detection is
  on the 2 ms one. A PR that touches either should report the cost it measured.
- **Neither pillar, no feature.** A mechanic that is an argument about neither sound nor
  depth is arbitrary, and should be reconsidered before it is implemented.
- **A baseline is a finding.** A committed harness result that reads badly is work, not a
  footnote. This document went a month presenting the game as playable while its own
  baseline said matches do not end; a roadmap that does not carry the harness's numbers is
  not a roadmap of the game that exists.

---

## Completed — Sprint 4 (5–8 September 2026)

Phase 10's middle. The audit epic closed with twenty-eight of its thirty findings landed, and
the one that was never really a finding — competitive play — outlived it, and sits under
Later now. The
roster went from six hulls shared across four navies to a full line per navy in seven waves,
and the harness was taught to see the rung it had never once measured. The Consortium finally
got the thing its own doctrine line promises to sell it.

And three readings of the same account converged: a Chorister the Directorate builds about
once a match, a Directorate that cannot pay for either hull its rung exists to produce, and a
map that holds 916 Biomass exactly once. None of them was a price. Biomass is not an income at
all, and the answer is the flora economy — Biomass grown on kelp beds whose standing crop is
the map's own cover, so the account is paid in the concealment it costs you to spend.

The fleet also stopped being a folder of binaries: two more shape languages written, a
round-trip check that fails on any drift between a script and its committed GLB, and each
modelled hull's plan outline generated from the model rather than drawn a second time by hand.

## Completed — Sprint 3 (23 August – 5 September 2026)

Phases 6 through 9, and the campaign. The harness's first two findings were built; the
physics audit turned every authored force in [hazards.md](hazards.md) into behaviour and
found the movement defects no test could reach; the combat design was written and every row
of it implemented; the mission runtime carried all twenty-nine missions, a progression
record and a cast; and the conn view landed as a perspective camera over a sculpted seabed,
with three of the four debts it declared paid.

The world epic's six sub-issues closed with the missions audited against the world documents
and about forty small facts corrected.

## Completed — Sprint 2 (22–24 August 2026)

Phases 1 through 5, in order, each landing as its own pull request against a green `main`.
Depth became an order and the crystal gate opened; the game about sound started making
sound; the map grew fauna, hazards, residue, archetypes and a power rate; a lobby, an AI
and a rematch turned it into something one person can play; and a balance harness turned
the design bible's guard-rail tables into a command you can run.

Three bugs found along the way are worth remembering, because none of them failed a test
and all three were only reachable from the outside:

- **Every harvester in every match was dying of crush.** Nodule fields sit at 600 m, which
  needs PR-2; the Harvester was PR-1. Both economies collapsed around the two-minute mark
  of every match and nothing caught it, because no test ran an economy for longer than a
  minute.
- **Every commander pinged 0.4 s into the match**, at the local wildlife, announcing its
  base across 2,400 m before anything had happened.
- **The Tier-2 bearing blur was keyed on a process-global entity id**, so the same match
  run twice blurred differently. Latent from the day it was written; live from the day an
  AI started walking an army toward a blurred position.

## Completed — Sprint 1 (15–24 August 2026)

The first sprint established the design bible, the CI gates, and the engineering scaffold.
Its epic and all of its issues are closed:
<https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/13>.

Every issue of it is a row in Phase 0 above, and the six findings at the end of that phase
are why the first rule of this repository is that the documents win.

---

## Related

- **[README.md](README.md)** — the documentation index, and the Planned section where
  undecided design questions wait as plain text
- **[systems-echo.md](systems-echo.md)** · **[systems-depth.md](systems-depth.md)** — the
  two systems everything else descends from
- **[tech-stack.md](tech-stack.md)** — the Echo budget, determinism, the skirmish AI and
  the balance harness
- **[economy.md](economy.md)** §9 · **[bestiary.md](bestiary.md)** §8 — the guard-rails
  the baseline reads
- **[DEVELOPER_QUICKSTART.md](DEVELOPER_QUICKSTART.md)** — how to run the thing
- **[playtest-checklist.md](playtest-checklist.md)** — what to watch for when you do
