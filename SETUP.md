# Echoes of the Abyss — Development Setup

A monorepo built on the stack defined in [docs/tech-stack.md](docs/tech-stack.md):
TypeScript, PixiJS v8, bitecs, Colyseus, Vite.

## Project Structure

```text
packages/
├── shared/            # Simulation rules shared by client and server
│   ├── src/
│   │   ├── constants.ts   # SIG, PropagationFactor, tiers, depth, economy
│   │   ├── echo.ts        # Echo Layer detection math (pure)
│   │   ├── units.ts       # Prototype roster from docs/units.md
│   │   ├── structures.ts  # Structure roster, costs, PRODUCIBLE tech split
│   │   └── types.ts       # Wire contract (Contact, OwnUnit, EchoSnapshot)
│   └── test/              # Detection math tests
├── frontend/          # Web client (PixiJS + React + TypeScript)
│   ├── src/
│   │   ├── game/          # EchoRenderer, silhouettes, palette, React mount
│   │   └── net/           # Colyseus client
│   └── vite.config.ts
└── backend/           # Game server (Node.js + Colyseus)
    ├── src/
    │   ├── sim/           # ECS world, terrain, systems
    │   │   └── systems/   # movement, acoustics, pressure, echoLayer,
    │   │                  # harvest, production, construction, combat
    │   ├── rooms/         # MatchRoom — the network boundary
    │   └── schema/        # Colyseus room state (lobby data only)
    └── test/              # Simulation integration tests
```

### Why a shared package

`@echoes/shared` exists so the numbers in the design docs are transcribed
**once**. Both sides need them — the server to resolve detection authoritatively,
the client to draw its own SIG meter and ping-cost preview — and a constant
duplicated across two packages will eventually disagree with itself.

It is compiled ahead of the other two, so `build:shared` runs first in every
root script that depends on it.

## Installation

Requires Node.js 22+ (24 recommended) and npm 10+.

```bash
npm install
```

**Run it again after every pull.** Dependencies move — `three` arrived with the
conn view, and anyone who pulled that branch without reinstalling got a Vite
`Failed to resolve import "three"` overlay instead of a game. `npm run dev`,
`npm run build` and `npm test` now check first and say so:

```text
Preflight failed — the workspace is not ready to run.

  1 declared dependency is not installed:
    - three  (@echoes/frontend)

  → Run `npm install` from the repository root, then try again.
```

The same check catches too old a Node. Run it on its own with `npm run preflight`.

## Development

```bash
npm run dev
```

Builds `shared`, then runs the backend (`:3000`) and frontend (`:5173`) together
via `concurrently`. Individually:

```bash
npm run build:shared            # required once before either package runs
npm -w packages/backend run dev  # Colyseus server, tsx watch
npm -w packages/frontend run dev # Vite dev server
```

Point the client at a non-default server with `VITE_SERVER_URL`. To reach the
dev server from another device on the same network, add `--host` to the Vite
script — the client derives its WebSocket endpoint from whatever host served
the page, so no further configuration is needed. See
[SETUP-ANDROID.md](SETUP-ANDROID.md) for playing on a phone.

## Controls

A match is the classic RTS loop — harvest, build, produce, destroy the enemy
Bastion — so the client speaks both mouse-and-keyboard and touch. Every command
reachable by keyboard is also on the bottom command panel, which is what makes
the game playable on a phone.

### Mouse and keyboard

| Input | Action |
| --- | --- |
| Left click | Select own unit or structure (shift to add) |
| Right click | Context order — nodule field harvests, heard contact attacks, open water moves |
| Middle drag | Pan |
| Wheel | Zoom at cursor |
| `1`–`5` | Queue Scout / Corvette / Cruiser / Submersible / Harvester |
| `R` / `F` / `T` | Build Refinery / Foundry / Sentinel Turret, then click a site |
| `Esc` | Cancel a pending build |
| `Space` | Toggle Silent Running |
| `V` | Cycle harvest throttle — idle, trickle, standard, overburden |
| `P` | Active sonar ping |
| Hold `Shift` | Preview ping cost — 900 m reveal, 2,400 m self-reveal |

### Touch

| Gesture | Action |
| --- | --- |
| Tap | Select; with a selection, tap the map to issue the context order |
| Drag / pinch | Pan / zoom |
| Tap the sonar scope | Jump the camera; drag to scrub |
| BUILD / UNITS / SQUAD tabs | Structures, production, and per-unit commands |
| `✕` | Clear the selection — tapping open water is a move order, not a deselect |

## Build, test, lint

```bash
npm run build       # shared -> frontend -> backend
npm test            # 42 tests across shared + backend
npm run type-check
npm run lint
```

## Architecture Notes

### The match is a classic RTS loop with the Echo Layer underneath

`Match.step()` runs the systems in a fixed order every tick: harvest, combat,
movement, construction, production, acoustics, pressure, then a single reap.
Deaths from every source land in one list so the win condition sees them
together — destroying a player's Bastion eliminates them, and the last
commander with a Bastion standing wins.

What makes it this game rather than any RTS is that every step of the loop is
audible. Mining loudness follows the harvester's throttle, a construction site
broadcasts at SIG 70 for its whole build time, a refinery hums at 65 forever,
and a Foundry is loud exactly while its line runs. Economy is not a safe rear
area; it is the largest continuous noise source a player owns
([docs/economy.md](docs/economy.md)).

Costs and the structure tech split live in `packages/shared/src/structures.ts`
as `PRODUCIBLE`, shared because the server validates production against it and
the client's command panel renders from it.

### The Echo Layer is server-authoritative

Detection runs only on the server, per player, and **only resolved results are
sent to each client** (docs/glossary.md, "Acoustic Fog of War"). This is not a
performance decision — in a game whose core system is hidden information, a
client holding unresolved world state is a maphack no matter what it draws.

Two consequences show up in the code:

- The Colyseus room schema deliberately contains **no** entity data. Schema
  state is broadcast to everyone in the room, which makes it the wrong channel
  for anything secret. Units travel over per-client messages instead.
- Contact payloads **omit** fields below the tier that earns them. A Tier-2
  contact has no `kind`, `hp` or `faction` at all, rather than sending them with
  a "don't render this" flag.

### Two clocks

The simulation steps at a fixed 60 Hz so behaviour never varies with server
load. The Echo Layer resolves at 5 Hz against a 2 ms budget
(docs/tech-stack.md), because detection is the expensive pass and no player can
perceive 60 Hz changes in a sonar return. `Match.update()` converts wall-clock
time into fixed steps and caps catch-up to avoid a spiral of death.

### The propagation model is calibrated, not guessed

docs/systems-echo.md gives the detection *relationship*
(`SIG × PF ≥ Threshold(distance, HYD)`) and the tier multipliers, but never
defines `Threshold()`. The implementation derives its one free parameter from a
figure the docs *do* pin down: a ping reveals the pinger at Tier 4 to listeners
exactly 2,400 m away. A test asserts this holds, so retuning the attenuation
curve cannot silently break the spec'd ping radii.

## Known gaps and inconsistencies

Things a future change should address, recorded here so they are not mistaken
for finished work:

- **[#34](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/34) —
  Resolution tiers disagree across docs.** docs/systems-echo.md §4 defines tiers
  0–4; docs/glossary.md and `tools/echo-sim` describe 0–5 (adding a "Full Lock"
  tier). The code implements **0–4**, following the detailed system doc.
- **[#35](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/35) —
  Per-unit HYD is invented.** docs/units.md lists SIG, PR, cost and speed, and
  its own "Next steps" notes that HYD values are not yet authored. The values in
  `packages/shared/src/units.ts` are prototype guesses and are the least
  trustworthy numbers in the codebase.
- **[#36](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/36) —
  `tools/echo-sim` uses a different formula** from `@echoes/shared`. It predates
  the shared package and is now a second, diverging source of truth for
  detection — with no HYD input at all.
- **[#37](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/37) —
  PropagationFactor is sampled at the emitter**, not integrated along the path
  to the listener. A unit therefore gains no cover from a kelp bed it is merely
  hiding behind, and the trench's "carries far down the axis" behaviour has no
  axis. Path integration is the natural upgrade once the Echo pass has headroom
  against its budget.
- **Rendering is procedural placeholder art.** Hulls and structures are drawn
  as faction-shaped silhouettes in `packages/frontend/src/game/silhouettes.ts`,
  not loaded as sprites. That module is the seam:
  [docs/art-direction.md](docs/art-direction.md) targets detailed sprite art,
  and swapping it in is a per-shape replacement inside one file.
- **One resource of four.** Only Nodules are implemented. Thermal Draw, Biomass
  and Resonance Crystal — and the industrial hum that makes economies audible
  from range — are still unbuilt ([docs/economy.md](docs/economy.md) §8).
- **Factions are cosmetic so far.** All four share one roster and one economy;
  the doctrinal asymmetry described in [docs/factions.md](docs/factions.md) is
  not yet mechanical, beyond Pelagia's cheaper Silent Running.
- **No fauna, Echo Marks, upgrades, or abilities.** The Drift, acoustic residue
  on the terrain layer, and per-unit special abilities are unbuilt scope rather
  than defects. A supply/berth cap is deliberately deferred pending playtesting
  (recorded in [docs/README.md](docs/README.md)).

## Related

- [SETUP-ANDROID.md](SETUP-ANDROID.md) — running the whole game on a phone
- [docs/systems-echo.md](docs/systems-echo.md) — the Echo Layer design
- [docs/systems-depth.md](docs/systems-depth.md) — depth and Pressure Rating
- [docs/economy.md](docs/economy.md) — the harvest loop and why income is loud
- [docs/art-direction.md](docs/art-direction.md) — HUD layout and the sprite target
- [docs/tech-stack.md](docs/tech-stack.md) — stack rationale
- [.github/copilot-instructions.md](.github/copilot-instructions.md) — conventions
