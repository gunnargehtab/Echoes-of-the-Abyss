# Documentation Index

The design bible for **Echoes of the Abyss**. Start with the two system docs — everything else is downstream of them.

---

## Start here

| Doc | What it covers |
| --- | --- |
| **[game-identity.md](game-identity.md)** | Pitch, pillars, target experience |
| **[systems-echo.md](systems-echo.md)** | ⭐ The acoustic fog of war. The game's central system |
| **[systems-depth.md](systems-depth.md)** | ⭐ Pressure ratings, depth bands, crush attrition |
| **[glossary.md](glossary.md)** | The authoritative definitions. A term that means two things in two docs is resolved here first |

## World & narrative

| Doc | What it covers |
| --- | --- |
| **[world.md](world.md)** | The Pelagion Rift, the Salinity Collapse, the Mouth, culture and language |
| **[timeline.md](timeline.md)** | Two centuries, from the Collapse to 214 PC, and the Mouth's anomaly log |
| **[world-map.md](world-map.md)** | The Rift's geography: regions, the vertical order, every named place, and where the campaign happens |
| **[factions.md](factions.md)** | The four powers — doctrine, politics, weakness |
| **[characters.md](characters.md)** | Twelve commanders and the neutrals |
| **[culture.md](culture.md)** | How the Rift speaks — five registers, names, rituals, writing guide |
| **[campaign.md](campaign.md)** | 29 missions designed, four campaigns, four irreconcilable endings — one of the 29 is built |
| **[mission-sorrowgate.md](mission-sorrowgate.md)** | The prologue, specified: the court, the flight, the silence order, the ping, and what answers it |
| **[mission-asset-recovery.md](mission-asset-recovery.md)** | The Ledger 1, specified: Face Six, the manifest, the taps, and the Klaxon posture |
| **[mission-tend.md](mission-tend.md)** | The Second Seeding 1, specified: a working day, the sweep, the stillness, and what *unfiled* is worth |
| **[mission-attendance.md](mission-attendance.md)** | The Attending 1, specified: one watch of the Mouth's cycle, the nine arrivals, and the silence a rite is owed |
| **[mission-aptitude.md](mission-aptitude.md)** | The Second Chord 1, specified: six hulls, six formations, and the quarter of the compass a Knight is loud in |

## Gameplay

| Doc | What it covers |
| --- | --- |
| **[environments.md](environments.md)** | Five biomes: look, sound (PropagationFactor), mechanics, inhabitants |
| **[bestiary.md](bestiary.md)** | The Drift — fauna as listeners, Biomass, and Drift Health |
| **[hazards.md](hazards.md)** | Eight hazards with faction interactions |
| **[maps.md](maps.md)** | Six map archetypes |
| **[economy.md](economy.md)** | Four resources, the noise curve, and four faction economies |
| **[systems-combat.md](systems-combat.md)** | The weapon triangle: guns, torpedoes, mines, firing solutions, TTK bands |
| **[units.md](units.md)** | Prototype roster, SIG/PR stats, playtest plan |

## Presentation

| Doc | What it covers |
| --- | --- |
| **[art-direction.md](art-direction.md)** | Palettes, shape language, silhouette law, Echo Layer UI requirements |
| **[graphics-standards.md](graphics-standards.md)** | The acceptance bar: pipeline of record, seven shipping gates, art PR checklist |
| **[audio-direction.md](audio-direction.md)** | The mix as the primary information channel; tier sonification |
| **[ui-ux.md](ui-ux.md)** | The Echo Layer HUD, sonar scope, ping preview, esc menu, accessibility |
| **[style-neon-noir.md](style-neon-noir.md)** | Neon-noir presentation register: palette tokens, glow rules, UI chrome |
| **[asset-prompts-3d.md](asset-prompts-3d.md)** | Copy-paste prompt kit for style-consistent 3D roster models (Claude Design) |
| **[naming.md](naming.md)** | Title, taglines, logo direction |
| **[concept-art/](concept-art/)** | Five survey plates in the Pressure Cartography language, plus two neon-noir presentation plates |

## Technical

| Doc | What it covers |
| --- | --- |
| **[tech-stack.md](tech-stack.md)** | Stack, rationale, Echo Layer performance budget |
| **[ROADMAP.md](ROADMAP.md)** | Where the build stands against the bible, and what is planned next |

---

## Editing rules

1. **The glossary is authoritative.** If a term appears in two docs with two meanings, fix the glossary first.
2. **Numbers are design intent, not balance-final.** They exist so the systems can be prototyped against something real.
3. **Cross-link.** Every doc should end with a Related section. Keep it current.
4. **Don't add a faction trait that isn't an argument about sound or depth.** That's the asymmetry axis (see [systems-echo.md](systems-echo.md) and [systems-depth.md](systems-depth.md)); traits outside it make the roster arbitrary.

## Planned / Not Yet Written

One forward reference remains: `concept-art/DESIGN-PHILOSOPHY.md`, linked from the root README, which would set out the Pressure Cartography visual language behind the four survey plates.

The prologue is built and the campaign around it is not. What follows is designed, or already
stated in a doc that ships, and unbuilt — named in plain text because none of it has a document
to point at yet:

- **The remaining 24 missions.** campaign.md §4–§7 gives them titles, teaching targets and
  beats, which is not a specification. Each needs a document of its own — one doc per mission,
  the pattern mission-sorrowgate.md sets and mission-asset-recovery.md, mission-tend.md,
  mission-attendance.md and mission-aptitude.md continue — before it needs code. Every
  campaign's *first* mission is now specified and none is built; their scaffold-status sections
  list what the mission format still needs. That list is shorter than it was: the Klaxon band,
  the authored static emitter, the lift/cargo hold-and-cut, bloom-share, the windowed emitter and
  the tally over the observer's own resolution of one have all shipped, and the sweep's
  filed/unfiled fact landed as a latched flag on the runtime rather than as a predicate. What the
  four documents still ask for is a beat that fires on a **condition** rather than a tick, a
  predicate over the player's own **exposure**, and a hold that **aims** the hull taking it.
- **Directional signature, in the simulation.** systems-echo.md §8 now spec's the Knights'
  doctrine as numbers — ×1.00 in the cone, ×0.35 on the flank, ×0.10 in the wake — and nothing
  reads them. SIG is a scalar in the detection pass, and a stopped hull has no heading at all,
  because heading exists only as a derivative of velocity. mission-aptitude.md §13 is the
  row-by-row account. It is a system gap rather than a mission one, which is why it is listed
  here separately.
- **Campaign progression and unlock state.** Nothing records that a mission was played, so the
  prologue is replayable, remembers nothing, and the Tutorial and campaign doors are the same
  door.
- **Cross-mission Drift Health.** campaign.md §2 rule 5 has a map carry its damage forward to
  the next mission played on it. There is no forward while there is one mission.
- **Permanent roster attrition.** Knights mission 3, *Nineteen*, spends units for the rest of a
  campaign. Today nothing outlives the match it was built in.
- **"Already seen" briefing variants.** campaign.md §1 intends a scene you witnessed from the
  other side to change its briefing text and never its mission. Nothing tracks what you have
  seen.
- **In-mission character speech.** No channel carries a character's line while a mission is
  running, which is why Sorrowgate's four voices in the water are written and not heard.

Deferred design questions, parked here as plain text until decided:

- **Supply / berth capacity** — a population cap (berth tonnage granted by structures)
  in the classic RTS mould. Deliberately deferred until the current economy loop has
  been playtested; nodule cost and build time are the only production limiters for now.

**Links in `docs/` are checked in CI and the check is blocking** — a link to a document that does not exist will fail the build. If you want to mark future work, add it to this section as plain text rather than as a link.
