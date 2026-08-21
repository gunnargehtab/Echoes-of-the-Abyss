# Echoes of the Abyss
**Atmospheric · Industrial · Abyssal · RTS**

> **An RTS where you cannot see — only listen — and every action you take tells the enemy where you are.**

*Echoes of the Abyss* is a browser-native real-time strategy game set in the **Pelagion Rift**, a collapsing underwater world of geothermal vents, abyssal trenches, bioluminescent forests, and pressure-scarred industrial ruins. Four factions fight across hostile biomes for the last habitable water on the planet.

This repository holds the game's documentation, worldbuilding, art direction, and technical foundations.

**📁 [Full documentation index →](docs/README.md)**

---

## 🌊 The Two Systems

Everything in this design descends from two mechanics. Read these first.

### 1. The Echo Layer — acoustic fog of war
There is no line-of-sight vision. Every unit emits an **Acoustic Signature (SIG, 0–100)** and listens passively. Detection is **graded across five resolution tiers**, from "something is out there" to full track. Terrain sets how sound travels — vent roar masks you at 0.45, trench walls carry you at 1.6, thermoclines hide you at 0.30.

**Active sonar** reveals everything within 900 m — and reveals *you* to everything within 2,400 m. You learn everything. Everyone learns where you are, twice as far.

Everything that makes you strong makes you loud. Economy is loud. Construction is loud. Alpha strikes are loud.

→ **[systems-echo.md](docs/systems-echo.md)**

### 2. Depth — the axis of commitment
Maps are stacks: **Shelf** (0–400 m), **Mid-Water** (400–1,800 m), **Abyssal** (1,800 m+). Value increases with depth; so does the cost of being there. Units below their **Pressure Rating** take unhealable crush attrition.

**Resonance Crystal** — the tech gate — is almost entirely Abyssal. Everyone must eventually descend, and each faction has a different expensive answer to how. Descent is fast and deafening. Ascent is slow and silent.

→ **[systems-depth.md](docs/systems-depth.md)**

---

## ⚔️ Four Factions, One Argument

Each faction is a different answer to the same problem — **noise** — and their politics, technology, and economics are restatements of that same argument.

| | Relationship to sound | Wins by | Fears |
|---|---|---|---|
| **⛏ Bathyarch Consortium** | Loudest in the game. Doesn't care | Attrition | Insolvency |
| **🌿 Pelagia Commune** | Quietest. Fragile | Map control | Being made to fight |
| **🦑 Abyssal Directorate** | Listens better than anyone | Information + numbers | Being wrong about the Choir |
| **🔷 Hadron Knights** | Weaponises it, directionally | Positioning + burst | Extinction by arithmetic |

No faction is written as the villain. All four campaign endings are coherent, costly, and irreconcilable.

→ **[factions.md](docs/factions.md)** · **[characters.md](docs/characters.md)** · **[units.md](docs/units.md)**

---

## 🌐 The World

Two centuries ago the **Salinity Collapse** poisoned the surface ocean. Humanity fled downward. The Rift is the last place with heat, chemistry, and shelter together — and every war here is over those three nouns.

Status runs downward: *"shallow"* is a universal insult. Water is free but **dry** is a luxury. Nobody says *look* — the verb of attention is *listen*.

At **4,410 m** sits **the Mouth**: an eleven-kilometre depression that returns sonar pings **before they should arrive**, on a cycle that shortened from 43 hours to 39 in 213 PC. The Consortium files for mineral rights. The Commune calls it a wound. The Directorate worships it. The Knights are building something to answer it.

→ **[world.md](docs/world.md)** · **[timeline.md](docs/timeline.md)** · **[culture.md](docs/culture.md)**

---

## 🗺️ Biomes & Ecosystem

Five biomes, each defined by look, sound, mechanics, and inhabitants:

- **Thermal Veins** — PF 0.45. Vent roar masks you. The Consortium's weakness disappears here
- **Kelp Forest Plateaus** — PF 0.55. The stealth biome and the larder
- **Abyssal Trenches** — PF 1.60 axial. Sound carries impossibly far. No secrets, only distances
- **Resonance Fields** — PF 0.70 scattered. Bearings lie. Pings return false contacts
- **Coral Ruins** — PF 0.80 occluded. The human biome, and the only one that changes during a match

The map is **alive**. A simulated ecosystem responds to noise, hunger, and over-extraction — and can be permanently killed. The winner of a long match inherits a corpse.

→ **[environments.md](docs/environments.md)** · **[bestiary.md](docs/bestiary.md)** · **[hazards.md](docs/hazards.md)** · **[maps.md](docs/maps.md)**

---

## 🎨 Concept Art

Four survey plates in the **Pressure Cartography** visual language — the discipline of measuring things that resist measurement.

| Plate | Subject |
|---|---|
| **[I — Depth Strata](docs/concept-art/plate-01-depth-strata.png)** | Vertical cross-section, propagation field, the Mouth |
| **[II — Four Powers](docs/concept-art/plate-02-four-powers.png)** | Shape language, palettes, silhouettes, signature doctrine |
| **[III — The Echo Layer](docs/concept-art/plate-03-echo-layer.png)** | Resolution tiers and the cost of the ping |
| **[IV — The Mouth](docs/concept-art/plate-04-the-mouth.png)** | Concentric banding, return anomaly, unresolved |

→ **[art-direction.md](docs/art-direction.md)** · **[DESIGN-PHILOSOPHY.md](docs/concept-art/DESIGN-PHILOSOPHY.md)**

---

## 🧱 Tech Stack

**Frontend:** TypeScript · PixiJS (WebGL) · bitecs (ECS) · Howler.js + raw Web Audio · React (menus only)
**Backend:** Node.js · Colyseus · Redis · PostgreSQL
**Build:** Vite · ESBuild · Vercel (frontend) · Hetzner Cloud (game servers)

Detection is **server-authoritative and per-player** — in a game about hidden information, maphack is the whole threat model. The Echo Layer runs on a spatial hash at 5 Hz with a hard **2 ms/tick budget**.

→ **[tech-stack.md](docs/tech-stack.md)**

---

## Design Pillars

1. **Listening, not looking** — partial information is the normal state; the target emotion is dread, not confusion
2. **Every advantage has a noise cost** — you cannot be strong and quiet for free
3. **Depth is commitment** — raids go in loud and come out slow
4. **The map is alive and can be killed**
5. **Asymmetry that means something** — mechanics *are* worldview
6. **No villains** — every faction is correct from inside

---

## Getting started (developer)

Prerequisites
- Node.js 22+ (24 recommended), npm 10+, Git

Quick setup
1. Clone: git clone https://github.com/gunnargehtab/Echoes-of-the-Abyss.git
2. Install deps: npm ci

Common commands (root workspace)
- Start development (frontend + backend): npm run dev
- Build all: npm run build
- Run tests: npm run test
- Lint (workspace): npm run lint
- Check formatting: npx prettier --check .

Workspace tips
- Frontend: packages/frontend
- Backend: packages/backend
- To run a single workspace: npm -w packages/frontend run dev

Contribution workflow
- The conventions — branches, commits, PRs, labels, code and docs rules — live in [CONTRIBUTING.md](CONTRIBUTING.md)
- Create a topic branch (e.g., feat/short-description or ci/add-...)
- Make small, focused commits and reference related issues in the commit or PR
- Open a PR against main and request review
- CI runs lint, formatting, and docs checks; update docs in /docs and link related design notes

More
- Developer-focused quickstart: docs/DEVELOPER_QUICKSTART.md
- Playing on Android, entirely on-device: SETUP-ANDROID.md
- CI workflow: .github/workflows/ci.yml

