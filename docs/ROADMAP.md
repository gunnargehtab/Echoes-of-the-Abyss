# Project Roadmap — Echoes of the Abyss

The repo-side companion to the development epic on GitHub
(<https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/97>). The epic carries the
live checkboxes; this document carries the reasoning.

---

## Where the build stands

The scaffold in `packages/` is a working vertical slice:

- the Echo Layer resolving per player at 5 Hz inside its 2 ms budget, with
  PropagationFactor integrated along the emitter-to-listener path;
- the nodule economy — harvester cargo loop, all four throttle states, deposit structures;
- construction, production queues, direct-fire combat, and the Bastion win condition;
- the four faction signature structures and their auras;
- a PixiJS client that draws tier-graded contacts with ghost decay, ping previews, and a
  SIG meter.

Two commanders can connect and fight a match to a conclusion. That is roughly a fifth of
the game the design bible describes.

---

## The two pillars, honestly assessed

`CLAUDE.md` states the design axis: every mechanic in this game is an argument about
**sound** or **depth**. Measured against that, the build is lopsided.

| Pillar | Status |
| --- | --- |
| Echo Layer — SIG, PF, resolution tiers, silent running, active sonar | Implemented and load-bearing |
| The mix — which [audio-direction.md](audio-direction.md) calls the *primary* information channel | Not started; no audio code exists |
| Pressure ratings, crush attrition, the Sounding Spire's PR grant | Implemented |
| Depth as something a player can change | Not started; `Position.depth` is written at spawn and never again |

Those two gaps set the order of everything below. Depth is currently a spawn constant, so
"depth is the axis of commitment" ([systems-depth.md](systems-depth.md) §5) is a claim the
simulation cannot make — and `pressureSystem` is unreachable in a normal match, because the
spawn code is careful never to place a unit below its rating.

---

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
- **Two clocks.** New per-tick work is on the 60 Hz budget; anything touching detection is
  on the 2 ms one. A PR that touches either should report the cost it measured.
- **Neither pillar, no feature.** A mechanic that is an argument about neither sound nor
  depth is arbitrary, and should be reconsidered before it is implemented.

---

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
