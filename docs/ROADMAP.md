# Project Roadmap — Echoes of the Abyss

The repo-side companion to the current backlog on GitHub: the September 2026 audit epic
(<https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/428>). The epic carries the live
checkboxes; this document carries the reasoning. The first development epic
(<https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/97>) is closed, and its phases
are kept below as the record of how the build got here.

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

- **What the audit still owes** — the audit epic itself, and the findings under it that
  have not landed. It is the only kind that shrinks by being worked rather than by being
  re-read.
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
| Does a skirmish finish? | **29 of 30** baseline matches — four AI seats, Veteran, the Ventfront Divide, seeds 4000–4029, a 25-minute cap — now decide, at a median 1,003 s against the 1,500 s cap, and all five guard-rails read for the first time. From one decided match before the commander's construction livelock, its uncommitted full-strength army, its walk at smudges and its chase after Tier-1 contacts inside a gun's reach were found (#452, #453). What the harness can now see is the balance: the Knights win 83% of decided matches | [#440](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/440) |
| Does the Echo pass hold its budget? | The 2 ms budget (`SIM.ECHO_BUDGET_MS`) breaks at about 160 entities: a median 0.99 ms at ~84, 2.44 ms at ~164, 7.16 ms at ~324 on a CI-class container. The worst case is tracked (`Match.worstEchoPassMs`) and never enforced or degraded | [#430](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/430) |
| Is the frame time real? | Every conn-view frame-time number on record prices SwiftShader in a container. Nothing has been timed on a real GPU or on the Termux floor the game promises | [#286](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/286) |

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
  through one shared camera.

The engineering around it is in good order — server-authoritative hidden information,
deterministic replays with a state hash, a benchmarked Echo pass, a test suite past 1,900
cases, and a green CI in about two minutes. The audit's headline was that the discipline is
production-grade and the *game* around the core mechanic is still a prototype: a six-hull
roster shared across factions, no pathfinding, no competitive mode, matches that do not end,
and nothing about shipping in place. Phase 10 is that list.

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
| [glossary.md](glossary.md) — the authoritative terms, written before the systems that use them | [#6](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/6) |
| The glossary reviewed and finalised, which is what made it authoritative rather than a draft | [#20](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/20) |
| Glossary cross-links, so a term defined once is linked from every document that uses it | [#21](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/21) |
| [units.md](units.md) — the first roster | [#7](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/7) |
| The roster expanded with per-unit stats and a playtest plan | [#22](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/22) |
| A unit playtest checklist and the data capture behind it ([playtest-checklist.md](playtest-checklist.md)) | [#23](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/23) |
| This document, in its first form | [#8](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/8) |

**The scaffold**

| Work | Issue |
| --- | --- |
| The frontend starter — a client that builds and runs | [#9](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/9) |
| The Echo Layer prototype: the detection model as runnable code before there was a game around it | [#10](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/10) |
| An example scene and input handling in the client | [#24](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/24) |
| `tools/echo-sim` scenarios and datasets — deterministic Echo cases outside the game | [#26](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/26) |
| echo-sim documented and converted to a module, so tests can require it | [#27](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/27) |

**The gates**

| Work | Issue |
| --- | --- |
| CI and linting, from the first week | [#11](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/11) |
| The client build in CI, so a client that does not build fails the build | [#25](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/25) |
| ESLint and Prettier, enforced rather than suggested | [#28](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/28) |
| markdownlint and the link check over `docs/` | [#29](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/29) |
| The README's developer quickstart | [#12](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/12) |
| The quickstart refined against somebody actually following it | [#30](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/30) |
| `CONTRIBUTING.md` and the contributor quickstart | [#16](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/16) |
| GitHub labels, and the issue and pull-request templates | [#17](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/17) |
| Branch and commit conventions | [#18](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/18) |

**How the project runs**

| Work | Issue |
| --- | --- |
| Owners and roles | [#14](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/14) |
| The project board | [#15](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/15) |
| A channel to talk in, and the kickoff | [#19](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/19) |
| Graphics standards, repo conventions and an Android smoke test — the first version of the acceptance bar in [graphics-standards.md](graphics-standards.md) | [#57](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/57) |

**What the first read-through found**

| Work | Issue |
| --- | --- |
| The resolution tiers contradicted themselves across the docs and the tools — 0–4 in one place, 0–5 in another | [#34](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/34) |
| Per-unit HYD values were invented by the code; [units.md](units.md) had never authored them | [#35](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/35) |
| `tools/echo-sim` implemented a different detection formula from `@echoes/shared` | [#36](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/36) |
| PropagationFactor was sampled at the emitter instead of integrated along the path — the model the whole game rests on, wrong in the one place it is computed | [#37](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/37) |
| markdownlint reported about 270 issues in `docs/`, and the gate was reporting-only | [#38](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/38) |
| Seven documents were linked and never written, and that gate was reporting-only too | [#39](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/39) |

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
| Depth orders — descent SIG, silent ascent, server-side validation | [#98](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/98) |
| Depth HUD — depth ribbon, PR badge, crush hatching ([ui-ux.md](ui-ux.md) §8) | [#99](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/99) |
| Resonance Crystal in the Abyssal band, and a tech gate on it | [#100](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/100) |

**Why it went first.** Everything downstream — deep raids, the Directorate's birthright, the
Consortium's paid refits, [economy.md](economy.md) §7 in its entirety — was inert until a
unit could change depth.

---

## Phase 2 — The game about sound makes sound

**Closed.** The bus architecture from [audio-direction.md](audio-direction.md) §12, contact
sonification by tier, and the player's own loudness in the mix.

| Work | Issue |
| --- | --- |
| Audio engine — bus graph, 24-voice budget, tick-aligned scheduling | [#101](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/101) |
| Contact sonification — tier timbre, panning as information, biome filtering | [#102](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/102) |
| Own loudness — self bus, the exposure cue, active sonar, silent running | [#103](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/103) |

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
| The Drift — fauna as listeners and as contacts, plus Biomass and Drift Health | [#104](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/104) |
| Hazard framework, proven by vent eruptions and resonance storms | [#105](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/105) |
| Echo Marks — the persistent acoustic residue layer, and industrial hum | [#106](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/106) |
| Authored map archetypes from [maps.md](maps.md), replacing `Terrain.demo()` | [#107](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/107) |
| Thermal Draw — the resource that is a rate, not a stockpile | [#108](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/108) |

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
| Skirmish AI — restricted to the same `EchoSnapshot` a human receives | [#109](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/109) |
| Match lifecycle — lobby, faction choice, reconnection, result, rematch | [#110](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/110) |
| Control surface — box select, control groups, order queue | [#111](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/111) |
| Sonar-scope minimap and contact log | [#112](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/112) |
| Unit separation, structure obstacles, terrain passability | [#113](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/113) |

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
| Echo pass scaling beyond ~150 entities | [#90](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/90) |
| Seeded RNG, replay capture, determinism test | [#114](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/114) |
| Headless balance harness and match telemetry | [#115](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/115) |

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
| Industrial hum lives 5 s, so a working economy does not hum ([economy.md](economy.md) §5) | [#136](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/136) |
| The Hadron tithe is specified in [economy.md](economy.md) §6 and implemented nowhere | [#140](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/140) |

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
| Separation correctness, world-bounds authority, derived constants, 60 Hz instrumentation | [#149](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/149) |
| Terrain passability — the unshipped third of [#113](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/113) | [#150](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/150) |
| Cold shock currents ([hazards.md](hazards.md) §8), the first simulated current | [#151](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/151) |
| Kelp entanglement fields ([hazards.md](hazards.md) §4) | [#152](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/152) |
| Sounder transit collision ([bestiary.md](bestiary.md), [hazards.md](hazards.md) §6) | [#153](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/153) |
| Directorate shallow-water penalty ([factions.md](factions.md), [systems-depth.md](systems-depth.md) §6) | [#154](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/154) |

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
| Mission runtime — seated parties, beat schedule, objective predicates — proven by the Prologue, *Sorrowgate* ([mission-sorrowgate.md](mission-sorrowgate.md)) | [#190](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/190) |

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

**Three of four closed.** The presentation revision
([three-layer-ocean.md](three-layer-ocean.md)) landed in five phases, and each phase's record
named the debts it chose to carry rather than hide. With the switch merged (#281), those
debts were the open work — none discovered late; every one written into the record of the
phase that created it.

| Work | Issue |
| --- | --- |
| The honest column glyph — contacts below Tier 3 hovered at a 600 m reference nobody earned; the mark is the water column now | [#283](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/283) |
| A far-zoom readability scale — hulls at true metre scale vanished at survey zoom (gate 7); settled in [art-direction.md](art-direction.md) | [#284](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/284) |
| An audio cue for sour exposure — [audio-direction.md](audio-direction.md) decided the channel first | [#285](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/285) |
| Wall-clock validation of the composited frame on a real GPU and the Termux floor | [#286](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/286) |

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

The September 2026 audit (epic
[#428](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/428)) read the backend
simulation, the frontend renderer and netcode, the design bible against the RTS genre, and
the engineering around all of it. Each finding is one issue with the evidence behind it and
a concrete change, so an unattended run can take them one at a time. The epic ranks them by
impact; this table groups them by what they are, and the ranking is on the issue.

Two groups below are not the audit's. **The opponent** is where the harness's own findings
went once matches started ending, and **filed since the audit** holds what has been opened
since — a bug found by playing, and two design calls. They sit in this phase because it is
the phase the build is in, not because the audit found them.

**The match that does not end**

| Work | Issue |
| --- | --- |
| Match resolution — done: 29 of 30 baseline skirmishes decide, and every guard-rail reads. The number the harness surfaced next is the Knights' 83% win rate among decided matches, which is a balance issue and not a resolution one | [#440](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/440) |

**The opponent**

| Work | Issue |
| --- | --- |
| The Consortium beats the Directorate 90 in 10 in duels. Parked with the evidence: no doctrine knob moves it, and thirty matches at even trades and even incomes still read 87/13, so what remains is the shallows poison on every Directorate attack, a Biomass income the commander never spends, and a line that arrives piecemeal | [#458](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/458) |
| The Commune's own hulls in the commander's hands — the mine command and a Spinner doctrine landed; the Sower half waits on whether the Commune is meant to reach crystal at all | [#467](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/467) |

**Performance and netcode**

| Work | Issue |
| --- | --- |
| Echo pass scaling — replace the full entity-id walks in `Match` with queries, share the public payloads across slots, re-run the bench | [#430](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/430) |
| Interpolate own-force positions between Echo snapshots and echo orders locally — own hulls only; [ui-ux.md](ui-ux.md) §4 forbids it for contacts | [#429](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/429) |
| The Pixi overlay repaints everything at display rate from 5 Hz data | [#432](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/432) |
| Delta-encode the per-player Echo snapshot | [#433](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/433) |
| Draw calls — batch plumb lines and shadow discs; rebuild terrain partially on ground change | [#434](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/434) |
| Backend hot spots — structure separation broadphase, handle reverse index, terrain-history hashing, replay changelog | [#444](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/444) |

**Controls**

| Work | Issue |
| --- | --- |
| Pathfinding — navigate hulls around blocked ground instead of steering straight and sliding | [#431](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/431) |
| RTS control conventions — attack-move, rally points, stop and hold, edge scroll, a production queue | [#435](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/435) |
| Mouse and keyboard on a PC — what the input surface owes a desk that the touch surface does not | [#294](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/294) |

**Design**

| Work | Issue |
| --- | --- |
| Two exclusive hulls per faction, and one tech rung above crystal | [#436](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/436) |
| A full line per navy — sixteen hulls across a role matrix in six waves, planned in [roster-plan.md](roster-plan.md); follows #436. Wave 0 (the ground), wave 1 (the four transports, and a hull in a hold) and wave 2 (the four scouts, engine off and the cadence ping) wave 3 (the four ordnance hulls, a laid screen and a committed shot) and wave 4 (the four siege hulls, and damage that reads its target) have landed | [#495](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/495) |
| Wave 1 of that line — done: the four transports and carrying, the first of the five mechanisms the matrix asks for; follows wave 0 | [#501](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/501) |
| A population cap, resolved against the Echo budget and the Directorate swarm doctrine | [#437](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/437) |
| Bound scattered water so it is learnable, and redesign the superweapons before they are built | [#438](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/438) |
| A competitive-mode document — map pool, ladder, accounts, observer mode | [#439](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/439) |
| Combat depth — how many Echo snapshots a decided fight spans and what the losing side can still do inside one; answered by lengthening the TTK bands and giving the defender a mine astern | [#463](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/463) |

**Shipping and hygiene**

| Work | Issue |
| --- | --- |
| Deployment config, origin lock, and the unused pg and redis dependencies | [#441](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/441) |
| Frontend housekeeping — dead dependencies, code splitting, on-demand art loading, production sourcemaps | [#442](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/442) |
| Test gaps — an untested renderer and client, no counted-work budget for the 60 Hz step, unhashed Echo Marks | [#443](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/443) |
| This document — it cited closed issues as live work and omitted the balance finding | [#445](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/445) |

**Filed since the audit**

| Work | Issue |
| --- | --- |
| A fog of war for the chart — the world going vague where no hull of yours is listening, which is the Echo Layer's own rule drawn on the map | [#472](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/472) |
| Harvesters that would not move in the Prologue, found by playing it | [#478](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/478) |
| The Tetherjelly's second home — settled in [bestiary.md](bestiary.md) §4 as **one animal re-homed per map** rather than a second species: a canopy cluster is the same SIG 1 and the same −0.10 PF as a duct one, so the only thing that differs is depth, and depth is a property of the ground. `marr-plateau` names the Kelp Forest band in its `ambientBands`, and *Tend* seeds its own lane | [#480](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/480) |
| The crystal tier no navy can reach — the round trip is longer than the match, the field sits 500 m inside two eruption plumes, and only the Directorate can work it without paying crush. Found by teaching the commander to raid for it (#467) | [#491](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/491) |
| Test gaps, part three — the screens implement [ui-ux.md](ui-ux.md) §11's accessibility commitments, which that document calls a correctness requirement rather than a feature tier, and nothing checks them | [#494](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/494) |

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
