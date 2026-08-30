# Project Roadmap — Echoes of the Abyss

The repo-side companion to the development epic on GitHub
(<https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/97>). The epic carries the
live checkboxes; this document carries the reasoning.

---

## Where the build stands

Every issue in Phases 1 through 5 is closed. The scaffold in `packages/` is no longer a
vertical slice — it is a game you can sit down and play alone:

- the **Echo Layer** resolving per player at 5 Hz inside its 2 ms budget, with
  PropagationFactor integrated along the emitter-to-listener path;
- **depth as an order** — descent fast and deafening, ascent slow and silent, crush
  attrition that no repair undoes, and Resonance Crystal at the bottom of it;
- **the mix** — a bus graph, contacts sonified by resolution tier, and the player's own
  loudness as a bed the exposure cue cuts through;
- **a map that argues back** — three authored archetypes, vent eruptions and resonance
  storms, Echo Marks as acoustic residue, and Thermal Draw as a rate rather than a pile;
- **the Drift** — fauna that listen, answer the loudest thing, and are indistinguishable
  from a warship until Tier 3;
- **a lobby, a skirmish AI, reconnection and a rematch**, so a solo player can reach a win
  or a loss;
- **a balance harness** that runs ten matches headless and reports every guard-rail in
  [economy.md](economy.md) §9 and [bestiary.md](bestiary.md) §8 against a number;
- **a mission runtime and its first mission** — authored parties, a beat schedule and
  objectives the server resolves, so the Prologue *reaches an outcome*: a count the court
  reads into the record, where a skirmish would have a win or a loss
  ([mission-sorrowgate.md](mission-sorrowgate.md));
- **the conn view** — the August 2026 presentation revision landed whole
  ([three-layer-ocean.md](three-layer-ocean.md)): a WC3-lineage perspective camera over a
  sculpted seabed, the approved roster models sailing at true depth, the HUD and every
  chart mark composited over the world through one shared camera, band verbs and
  floor-following on the command surface, and the Lid pricing the top of the column.

What is *not* done is the long tail the harness has started to surface, the other
twenty-eight missions of the campaign, and everything in [world.md](world.md) that is
still only prose.

---

## The two pillars, honestly assessed

`CLAUDE.md` states the design axis: every mechanic in this game is an argument about
**sound** or **depth**. Both pillars now stand.

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

## Phase 1 — Make the second pillar playable

Depth becomes an order, with the asymmetry the doc specs: descent fast and deafening,
ascent slow and silent. Then the HUD can show it, and the Abyssal band gets a reason to
exist.

| Work | Issue |
| --- | --- |
| Depth orders — descent SIG, silent ascent, server-side validation | [#98](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/98) |
| Depth HUD — depth ribbon, PR badge, crush hatching ([ui-ux.md](ui-ux.md) §8) | [#99](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/99) |
| Resonance Crystal in the Abyssal band, and a tech gate on it | [#100](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/100) |

**Why first.** Everything downstream — deep raids, the Directorate's birthright, the
Consortium's paid refits, [economy.md](economy.md) §7 in its entirety — is inert until a
unit can change depth.

---

## Phase 2 — The game about sound makes sound

The bus architecture from [audio-direction.md](audio-direction.md) §12, contact
sonification by tier, and the player's own loudness in the mix.

| Work | Issue |
| --- | --- |
| Audio engine — bus graph, 24-voice budget, tick-aligned scheduling | [#101](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/101) |
| Contact sonification — tier timbre, panning as information, biome filtering | [#102](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/102) |
| Own loudness — self bus, the exposure cue, active sonar, silent running | [#103](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/103) |

**Two rules hold across the phase.** Audio is presentation only: no audio state may feed
back into the simulation, and the mix must never be why two clients disagree. And
accessibility is a gate rather than a follow-up — audio-only information is a bug
([audio-direction.md](audio-direction.md) §11), so every cue ships with its visual
equivalent.

---

## Phase 3 — The map becomes an opponent

| Work | Issue |
| --- | --- |
| The Drift — fauna as listeners and as contacts, plus Biomass and Drift Health | [#104](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/104) |
| Hazard framework, proven by vent eruptions and resonance storms | [#105](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/105) |
| Echo Marks — the persistent acoustic residue layer, and industrial hum | [#106](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/106) |
| Authored map archetypes from [maps.md](maps.md), replacing `Terrain.demo()` | [#107](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/107) |
| Thermal Draw — the resource that is a rate, not a stockpile | [#108](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/108) |

**Why this phase matters more than it looks.** Fauna make every Tier-1 smear ambiguous,
which is the difference between hidden information and merely absent information. Echo
Marks make the past legible and give HYD something to be worth. And with one map, there is
exactly one PF landscape — so faction balance cannot be assessed at all until there are
several.

---

## Phase 4 — A game you can sit down and play

| Work | Issue |
| --- | --- |
| Skirmish AI — restricted to the same `EchoSnapshot` a human receives | [#109](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/109) |
| Match lifecycle — lobby, faction choice, reconnection, result, rematch | [#110](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/110) |
| Control surface — box select, control groups, order queue | [#111](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/111) |
| Sonar-scope minimap and contact log | [#112](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/112) |
| Unit separation, structure obstacles, terrain passability | [#113](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/113) |

**The AI's information restriction is a design test, not an implementation detail.** An
opponent that reads world state is playing a different game from the one the player is
playing. If an AI restricted to resolved contacts can play competently, the information
model works.

---

## Phase 5 — Hold the line

| Work | Issue |
| --- | --- |
| Echo pass scaling beyond ~150 entities | [#90](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/90) |
| Seeded RNG, replay capture, determinism test | [#114](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/114) |
| Headless balance harness and match telemetry | [#115](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/115) |

---

## Phase 6 — What the harness found

The balance harness ([#115](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/115))
exists to turn design claims into numbers, and the first numbers it produced were about
mechanics the docs specify and the code does not have.

| Work | Issue |
| --- | --- |
| Industrial hum lives 5 s, so a working economy does not hum ([economy.md](economy.md) §5) | [#136](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/136) |
| The Hadron tithe is specified in [economy.md](economy.md) §6 and implemented nowhere | [#140](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/140) |

**Both were found the same way**, and it is the way this phase is meant to work: a
guard-rail read as breached, the number underneath it pointed at a specific doc section,
and that section turned out to describe something nobody had built. The Knights lose every
long game because the mitigation §9 names for exactly that risk — the tithe — does not
exist. A scout sweeping a depot hears nothing four times in five because a hum's lifetime
is its intensity times its decay, and one delivery buys 5.4 seconds against a forty-second
round trip.

Neither is a balance tuning question. Both are "the doc says this and the code does not".

---

## Phase 7 — What the physics audit found

Epic [#121](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/121) asked whether to
adopt a third-party physics engine. The answer is no, and the reasoning is on the issue: the
simulation's whole physics is a few hundred lines of deliberate steering, determinism here is
load-bearing for replays, the state hash and the balance harness, and an impulse solver would
inject energy into a game where position *is* information. What the question exposed is that
nobody had audited those few hundred lines.

| Work | Issue |
| --- | --- |
| Separation correctness, world-bounds authority, derived constants, 60 Hz instrumentation | [#149](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/149) |
| Terrain passability — the unshipped third of [#113](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/113) | [#150](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/150) |
| Cold shock currents ([hazards.md](hazards.md) §8), the first simulated current | [#151](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/151) |
| Kelp entanglement fields ([hazards.md](hazards.md) §4) | [#152](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/152) |
| Sounder transit collision ([bestiary.md](bestiary.md), [hazards.md](hazards.md) §6) | [#153](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/153) |
| Directorate shallow-water penalty ([factions.md](factions.md), [systems-depth.md](systems-depth.md) §6) | [#154](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/154) |

The first row is different in kind from the other five. #149 is defects — a hull overlapping
three neighbours separated from one of them, a stacked-hull tie-break seeded from
process-global entity ids in a codebase that has already been bitten by exactly that twice,
and a vent eruption at the map edge throwing hulls off the map, where they stayed simulated,
stayed audible, and could not be ordered back. None of that was reachable by the tests,
because there was no movement test at all.

The other five are Phase 6's pattern again: the doc says this and the code does not. Every
force named in [hazards.md](hazards.md) except vent knockback is an authored site with no
behaviour — currents that push, kelp that entangles, a megafauna that is supposed to destroy
structures by transit and instead stops and gnaws at attack range.

Two known gaps are deliberately not on this list. **Travelling munitions** are the largest
physics commitment the docs gesture at — [tech-stack.md](tech-stack.md) promises an ECS for
projectiles and combat is hit-scan — but [units.md](units.md) admits its weapon numbers are
placeholders "until a combat design doc exists", and that doc does not exist yet. Filing the
implementation before the design would be building on sand, and munitions are also the one
thing that could genuinely reopen the engine question. **Fauna separation** is a design
question rather than a defect: creatures currently overlap hulls, structures and each other
freely, which may well be right, but nobody has decided it in writing.

---

## Phase 8 — Missions

[campaign.md](campaign.md) describes twenty-nine missions and the scaffold could run none of
them. A skirmish ends when one side has no Bastion left; a mission ends when the thing it is
about has happened, and nothing in the match loop knew how to ask that question. This phase
built the machinery that asks it — authored parties seated outside the lobby, a schedule of
beats that fire at the times the design doc says they fire, and objective predicates the
server evaluates — and proved it against one mission specified down to the briefing text.

| Work | Issue |
| --- | --- |
| Mission runtime — seated parties, beat schedule, objective predicates — proven by the Prologue, *Sorrowgate* ([mission-sorrowgate.md](mission-sorrowgate.md)) | [#190](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/190) |

**Two things are deliberately outside it.** The other twenty-eight missions are authoring
rather than runtime, and one mission taken all the way to its text is what tells you whether
the runtime can carry them; twenty-eight written against machinery nobody has played would be
twenty-eight rewrites. And there is no progression persistence — the Prologue is replayable
and remembers nothing, so nothing records that it was played, and the briefing variation
[campaign.md](campaign.md) intends for a scene you have already witnessed from the other side
has no history to read.

---

## Phase 9 — What the switch left owed

The presentation revision ([three-layer-ocean.md](three-layer-ocean.md)) landed in five
phases, and each phase's record names the debts it chose to carry rather than hide. With
the switch merged (#281), those debts are the open work — none of them discovered late;
every one written into the record of the phase that created it, which is the record
system doing its job.

| Work | Issue |
| --- | --- |
| The honest column glyph — contacts below Tier 3 hover at a 600 m reference nobody earned | [#283](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/283) |
| A far-zoom readability scale — hulls at true metre scale vanish at survey zoom (gate 7) | [#284](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/284) |
| An audio cue for sour exposure — [audio-direction.md](audio-direction.md) decides the channel first | [#285](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/285) |
| Wall-clock validation of the composited frame on a real GPU and the Termux floor | [#286](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/286) |

**Three kinds of debt, worth keeping distinct.** The first two are honesty of
presentation: a mark that implies a depth the tier never carried, and a readability rule
([graphics-standards.md](graphics-standards.md) gate 7) the true-scale models currently
fail at survey zoom. The third is the parity rule — the Lid bleeds unrecoverable hull in
silence, and [audio-direction.md](audio-direction.md) §11 makes a visible fact with no
audible equivalent a bug in a game whose primary channel is the mix. The fourth is
measurement: every frame-time number in the phase records prices SwiftShader in a
container, and the budgets stay container-shaped until the composited two-canvas frame is
timed on the hardware the game actually promises to run on.

---

## Sequencing notes

Three dependencies survive any reordering of the phases:

1. **Seeded RNG ([#114](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/114))
   should land before fauna, hazards and the AI.** Those three are the natural homes for
   `Math.random()`; retrofitting determinism across all of them later is strictly more work.
2. **Echo pass scaling ([#90](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/90))
   gates fauna.** Fauna are entities in the detection pass, and the pass already misses its
   budget past ~150 entities.
3. **Depth orders ([#98](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/98))
   gate the depth HUD and Resonance Crystal**, and are what make `pressureSystem` reachable
   in a normal match.

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

---

## Completed — Sprint 2 (August 2026)

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

## Completed — Sprint 1 (August 2026)

The first sprint established the design bible, the CI gates, and the engineering scaffold.
Its epic and all of its issues are closed:
<https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/13>.

Delivered: `CONTRIBUTING.md` and the contributor quickstart, GitHub labels and issue/PR
templates, the glossary and its cross-links, the expanded unit roster and playtest
checklist, the client scene and input handling, echo-sim scenarios and its module form,
ESLint and Prettier in CI, and both markdown gates on `docs/`.

---

## Related

- **[README.md](README.md)** — the documentation index
- **[systems-echo.md](systems-echo.md)** · **[systems-depth.md](systems-depth.md)** — the
  two systems everything else descends from
- **[DEVELOPER_QUICKSTART.md](DEVELOPER_QUICKSTART.md)** — how to run the thing
- **[playtest-checklist.md](playtest-checklist.md)** — what to watch for when you do
