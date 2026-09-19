# Copilot Instructions — Echoes of the Abyss

This repository holds two things for Echoes of the Abyss, a browser-native underwater RTS, and they must stay in agreement:

1. **The design bible** (`docs/`) — worldbuilding, mechanics, art and audio direction. It came first and remains canonical: it is the source of the numbers.
2. **A playable scaffold** (`packages/`) — a TypeScript monorepo implementing the Echo Layer simulation, a Colyseus match server, and a two-canvas client: a three.js world under a transparent PixiJS HUD.

Code transcribes the docs. When the two disagree, that is a bug in one of them — say which one you are changing and why.

For engineering conventions, build order, and the runtime gotchas that cost the most time, read **[CLAUDE.md](../CLAUDE.md)** at the repository root. This file covers the design side.

**Write short on GitHub.** Issues, pull requests, reviews, comments and commit messages use clear, simple, short sentences. A PR body stays under 300 words, an issue under 200, a comment under 100. Lead with what changed or what is wrong. Link to a doc or a test instead of quoting it. This applies to GitHub text only — `docs/` is a design bible and stays prose. The full rule is in [CLAUDE.md](../CLAUDE.md#write-short-on-github).

---

## High-Level Architecture

**Echoes of the Abyss** is built on **two interdependent core systems** that all game design descends from:

### 1. The Echo Layer — Acoustic Fog of War
- **No line-of-sight vision.** Instead, every unit and structure continuously emits an **Acoustic Signature (SIG, 0–100)** based on idle state, movement speed, construction, firing weapons, etc.
- Detection is **not binary.** Enemies resolve you across **five resolution tiers** — from "something is out there" (Tier 1) to a full track with velocity (Tier 5).
- **Key mechanic:** Active sonar reveals everything within 900 m — but reveals *you* to everything within 2,400 m. Alpha strikes are loud. Economy is loud. Stealth and power are in direct tension.
- **Server-authoritative.** Detection is computed server-side per-player (Colyseus + spatial hash at 5 Hz, 2 ms/tick budget) and only the resolved result is sent to each client. Maphack prevention is the entire threat model. The rule and the budget are stated in full at the root: [server-authoritative](../CLAUDE.md#server-authoritative-is-a-hard-rule-not-a-preference), [two clocks](../CLAUDE.md#two-clocks).
- Read: **[systems-echo.md](../docs/systems-echo.md)**

### 2. Depth — The Axis of Commitment
- Maps are vertical stacks: **Shelf (0–400 m)**, **Mid-Water (400–1,800 m)**, **Abyssal (1,800+ m).**
- **Value increases with depth; cost increases with depth.** Units below their **Pressure Rating (PR)** take unhealable crush attrition.
- Descent is fast and loud (SIG burst). Ascent is slow and silent. Deep raids are a real bet: you cannot both hit the richest ground and retreat quickly.
- Each faction has a different expensive answer to depth access (buy refits, terraform terrain, born to it, instant tech-refits via Resonance).
- Read: **[systems-depth.md](../docs/systems-depth.md)**

### Factions as Arguments
All four factions are coherent answers to the same problem — **noise** — and their mechanics *are* their worldview:

| Faction | Noise Doctrine | Wins By | Depth Strategy |
|---|---|---|---|
| **Bathyarch Consortium** | Loudest in the game | Attrition | Buys access (PR-2) |
| **Pelagia Commune** | Quietest, fragile | Map control + evasion | Terraforms (PR-1, converts terrain) |
| **Abyssal Directorate** | Listens better than anyone | Information + numbers | Born to depth (PR-3, no refits needed) |
| **Hadron Knights** | Weaponises it directionally | Positioning + burst | Projects access (PR-2, Sounding Spires grant +1 PR) |

No faction is written as the villain. Read: **[factions.md](../docs/factions.md)**

---

## Tech Stack & Implementation

- **Frontend:** TypeScript · three.js (the conn-view world) · PixiJS (HUD and chart marks over it) · raw Web Audio · React (menus only)
- **Backend:** Node.js · Colyseus (multiplayer state sync) · bitecs (ECS) · Redis (real-time caching) and PostgreSQL (accounts/saves), both planned rather than built
- **Build:** Vite · ESBuild · npm workspaces
- **Deployment:** container images (`packages/*/Dockerfile`, root `docker-compose.yml`) targeting Vercel (frontend) · Hetzner Cloud (game servers, low latency in EU); no platform project is configured yet

**Node 22+ is required** ([CLAUDE.md § Commands](../CLAUDE.md#commands)), and `@echoes/shared` is imported by its build output rather than its source, which is the thing that breaks first ([CLAUDE.md § Build order](../CLAUDE.md#build-order--the-thing-that-breaks-first)).

### What is implemented today

The scaffold is playable end to end, not a stub: a fixed-step simulation, per-player acoustic detection, and a client that renders only what the server resolved for it.

The package-by-package tour — what each workspace owns, which file holds the fixed step, where the network boundary is, and what every directory under `tools/` is for — is [CLAUDE.md § Architecture](../CLAUDE.md#architecture).

Redis and PostgreSQL are the intended shape for accounts and caching, and neither exists — there is no auth or persistence code, and the match server holds everything in memory for the life of a room. They were once declared as backend dependencies and imported nowhere; that was removed, because an installed driver reads as persistence already there.

Three engineering rules constrain design work, and each is stated in full in exactly one place — `CLAUDE.md`, with the reasoning that makes it a rule rather than a preference:

- **[Constants live in exactly one place](../CLAUDE.md#constants-live-in-exactly-one-place)** — `packages/shared/src/constants.ts`, and the tag on a constant says what changing it obliges you to do first. Editing convention 1 below sends you there.
- **[Server-authoritative detection](../CLAUDE.md#server-authoritative-is-a-hard-rule-not-a-preference)** — the threat model §1 names, and the reason a mechanic may not show the player anything the server has not resolved for them.
- **[Two clocks](../CLAUDE.md#two-clocks)** — the 60 Hz step and the 5 Hz Echo pass on its 2 ms budget. That budget is the ceiling a new detection mechanic is designed under.

Read: **[tech-stack.md](../docs/tech-stack.md)** · **[CLAUDE.md](../CLAUDE.md)**

---

## Documentation Structure & Editing Rules

### Start Here
1. **[game-identity.md](../docs/game-identity.md)** — Pitch, pillars, target emotion
2. **[systems-echo.md](../docs/systems-echo.md)** — The acoustic fog of war
3. **[systems-depth.md](../docs/systems-depth.md)** — Depth and commitment

### Narrative & World
- **[world.md](../docs/world.md)** — The Pelagion Rift, the Salinity Collapse, the Mouth, culture
- **[timeline.md](../docs/timeline.md)** — Two centuries of history; the present is 214 PC
- **[habitats.md](../docs/habitats.md)** — Inside the cities: berths, light, air, the hush, and what each culture calls beautiful
- **[factions.md](../docs/factions.md)** — Four factions, their doctrines and politics
- **[characters.md](../docs/characters.md)** — Twelve commanders, neutrals, and the campaign's secondary cast
- **[culture.md](../docs/culture.md)** — Four registers, naming conventions, and the dialogue writing guide
- **[campaign.md](../docs/campaign.md)** — 29 missions and four irreconcilable endings

### Gameplay
- **[environments.md](../docs/environments.md)** — Five biomes with propagation factors and mechanical effects
- **[bestiary.md](../docs/bestiary.md)** — The Drift: fauna as listeners, Biomass, Drift Health
- **[hazards.md](../docs/hazards.md)** — Eight hazards and faction interactions
- **[maps.md](../docs/maps.md)** — Six map archetypes
- **[economy.md](../docs/economy.md)** — Four resources and the noise curve
- **[units.md](../docs/units.md)** — Prototype roster and playtest plan

### Presentation
- **[art-direction.md](../docs/art-direction.md)** — Palettes, shape language, silhouette law, UI requirements
- **[habitats-art-brief.md](../docs/habitats-art-brief.md)** — The Rift's beauty as an art brief per habitat, inside the gates
- **[audio-direction.md](../docs/audio-direction.md)** — The mix as primary information channel; tier sonification
- **[ui-ux.md](../docs/ui-ux.md)** — Echo Layer HUD, sonar scope, ping preview, accessibility
- **[naming.md](../docs/naming.md)** — Title direction and taglines
- **[concept-art/](../docs/concept-art/)** — Four visual survey plates in the Pressure Cartography language

### Editing Conventions
1. **Numbers are design intent, not balance-final.** They exist to prototype the systems against something real. When iterating, update the numbers in-place and document the change — and if the number is marked SPEC in `packages/shared/src/constants.ts`, update that constant in the same change so code and docs do not drift.
2. **All major mechanics must be an argument about sound or depth** (see systems-echo.md and systems-depth.md). If a faction trait or unit ability is not anchored to one of these two axes, it's arbitrary and should be reconsidered.
3. **Cross-link generously.** Every doc should end with a "Related" section. Keep links current as docs change.
4. **The glossary is authoritative.** If a term appears in two docs with two meanings, resolve it in [glossary.md](../docs/glossary.md) first, then update all instances.
5. **Don't link a document that doesn't exist.** Link checking on `docs/` is blocking in CI. Planned work goes in the "Planned / Not Yet Written" section of [docs/README.md](../docs/README.md) as plain text, not as a link.

---

## Key Conventions

### Acoustic Signature (SIG) as a Design Axis
- Every source of SIG is a design choice. If you add a unit ability, consider: *Is it loud? How loud? Does the noise fit the faction's doctrine?*
- The Consortium embraces loudness. The Commune hides. The Directorate listens. The Knights weaponise precision. Every choice should map back to sound.

### Propagation Factor (PF)
- Biomes are defined by how sound travels through them:
  - **Thermal Veins (PF 0.45):** Vent roar masks you — the Consortium is quieter here
  - **Kelp Forest (PF 0.55):** The stealth biome
  - **Trenches (PF 1.60 axial):** Sound carries impossibly far — no secrets, only distances
  - **Resonance Fields (PF 0.70 scattered):** Bearings lie. False pings.
  - **Coral Ruins (PF 0.80 occluded):** The human biome, changes during matches

- When designing gameplay, PF is a **lever**: changing terrain PF changes which factions thrive where.

### Depth Band Mechanics
- **Shelf (0–400 m):** Low value, exposed, where the Pelagia Commune is strong
- **Mid-Water (400–1,800 m):** The contested middle
- **Abyssal (1,800+ m):** Highest value, Resonance Crystal lives here, highest pressure risk

- Depth is not just a vertical hazard. It's a **commitment timer**. Deep raids must succeed, retreat, or die.

---

## When Writing or Extending Docs

1. **Introduce concepts via the two core systems first.** If a new mechanic is unrelated to sound or depth, reconsider whether it belongs.
2. **Use concrete numbers.** Say "takes 45 SIG while idle with systems live" not "takes moderate SIG while idle."
3. **Explain faction interactions with each biome.** Every faction behaves differently in each biome (due to PF and PR). When you add a biome variant or hazard, say how each faction experiences it.
4. **Mention the player's emotional intent.** The target emotion is dread (partial information, always listening), not confusion. If a rule is confusing rather than dreadful, simplify it.
5. **Link to related systems.** Avoid repeating explanations; cross-link to the canonical source.

---

## Roadmap & Not-Yet-Written Docs

The design bible is now complete for the docs listed above. One planned document remains unwritten:

- **concept-art/DESIGN-PHILOSOPHY.md** — Pressure Cartography visual language philosophy, behind the four survey plates

It is referenced from the root README. Until it is authored, do not add further links to it — link checking on `docs/` is blocking in CI, and a link to a missing file fails the build.

---

## Getting Help

- **Need to understand the core loop?** Start with [systems-echo.md](../docs/systems-echo.md) + [systems-depth.md](../docs/systems-depth.md).
- **Adding a unit or ability?** Check [factions.md](../docs/factions.md) and [systems-echo.md](../docs/systems-echo.md) — does your addition fit the faction's noise doctrine?
- **Designing a biome variant?** See [environments.md](../docs/environments.md) and [tech-stack.md](../docs/tech-stack.md) (propagation factors).
- **Stuck on lore/character consistency?** Check [world.md](../docs/world.md), [characters.md](../docs/characters.md), and [factions.md](../docs/factions.md).
- **Writing or changing code?** Read [CLAUDE.md](../CLAUDE.md) first — build order, per-package import conventions, and the Colyseus import rule are all places where the obvious approach fails at runtime.
- **Setting up locally?** [DEVELOPER_QUICKSTART.md](../docs/DEVELOPER_QUICKSTART.md) and [SETUP.md](../SETUP.md).
