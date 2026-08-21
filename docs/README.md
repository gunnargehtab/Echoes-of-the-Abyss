# Documentation Index

The design bible for **Echoes of the Abyss**. Start with the two system docs — everything else is downstream of them.

---

## Start here

| Doc | What it covers |
| --- | --- |
| **[game-identity.md](game-identity.md)** | Pitch, pillars, target experience |
| **[systems-echo.md](systems-echo.md)** | ⭐ The acoustic fog of war. The game's central system |
| **[systems-depth.md](systems-depth.md)** | ⭐ Pressure ratings, depth bands, crush attrition |

## World & narrative

| Doc | What it covers |
| --- | --- |
| **[world.md](world.md)** | The Pelagion Rift, the Salinity Collapse, the Mouth, culture and language |
| **[timeline.md](timeline.md)** | Two centuries, from the Collapse to 214 PC, and the Mouth's anomaly log |
| **[factions.md](factions.md)** | The four powers — doctrine, politics, weakness |
| **[characters.md](characters.md)** | Twelve commanders and the neutrals |
| **[culture.md](culture.md)** | How the Rift speaks — four registers, names, rituals, writing guide |
| **[campaign.md](campaign.md)** | 29 missions, four campaigns, four irreconcilable endings |

## Gameplay

| Doc | What it covers |
| --- | --- |
| **[environments.md](environments.md)** | Five biomes: look, sound (PropagationFactor), mechanics, inhabitants |
| **[bestiary.md](bestiary.md)** | The Drift — fauna as listeners, Biomass, and Drift Health |
| **[hazards.md](hazards.md)** | Eight hazards with faction interactions |
| **[maps.md](maps.md)** | Six map archetypes |
| **[economy.md](economy.md)** | Four resources, the noise curve, and four faction economies |
| **[units.md](units.md)** | Prototype roster, SIG/PR stats, playtest plan |

## Presentation

| Doc | What it covers |
| --- | --- |
| **[art-direction.md](art-direction.md)** | Palettes, shape language, silhouette law, Echo Layer UI requirements |
| **[audio-direction.md](audio-direction.md)** | The mix as the primary information channel; tier sonification |
| **[ui-ux.md](ui-ux.md)** | The Echo Layer HUD, sonar scope, ping preview, accessibility |
| **[style-neon-noir.md](style-neon-noir.md)** | Neon-noir presentation register: palette tokens, glow rules, UI chrome |
| **[asset-prompts-3d.md](asset-prompts-3d.md)** | Copy-paste prompt kit for style-consistent 3D roster models (Claude Design) |
| **[naming.md](naming.md)** | Title, taglines, logo direction |
| **[concept-art/](concept-art/)** | Four survey plates in the Pressure Cartography language, plus two neon-noir presentation plates |

## Technical

| Doc | What it covers |
| --- | --- |
| **[tech-stack.md](tech-stack.md)** | Stack, rationale, Echo Layer performance budget |

---

## Editing rules

1. **The glossary is authoritative** once one exists. If a term appears in two docs with two meanings, fix the glossary first.
2. **Numbers are design intent, not balance-final.** They exist so the systems can be prototyped against something real.
3. **Cross-link.** Every doc should end with a Related section. Keep it current.
4. **Don't add a faction trait that isn't an argument about sound or depth.** That's the asymmetry axis (see [systems-echo.md](systems-echo.md) and [systems-depth.md](systems-depth.md)); traits outside it make the roster arbitrary.

## Planned / Not Yet Written

One forward reference remains: `concept-art/DESIGN-PHILOSOPHY.md`, linked from the root README, which would set out the Pressure Cartography visual language behind the four survey plates.

Deferred design questions, parked here as plain text until decided:

- **Supply / berth capacity** — a population cap (berth tonnage granted by structures)
  in the classic RTS mould. Deliberately deferred until the current economy loop has
  been playtested; nodule cost and build time are the only production limiters for now.

**Links in `docs/` are checked in CI and the check is blocking** — a link to a document that does not exist will fail the build. If you want to mark future work, add it to this section as plain text rather than as a link.
