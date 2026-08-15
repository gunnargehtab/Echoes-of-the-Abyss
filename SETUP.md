# Echoes of the Abyss — Development Setup

A monorepo built on the stack defined in [docs/tech-stack.md](docs/tech-stack.md):
TypeScript, PixiJS v8, bitecs, Colyseus, Vite.

## Project Structure

```
packages/
├── shared/            # Simulation rules shared by client and server
│   ├── src/
│   │   ├── constants.ts   # SIG, PropagationFactor, tiers, depth bands
│   │   ├── echo.ts        # Echo Layer detection math (pure)
│   │   ├── units.ts       # Prototype roster from docs/units.md
│   │   └── types.ts       # Wire contract (Contact, OwnUnit, EchoSnapshot)
│   └── test/              # Detection math tests
├── frontend/          # Web client (PixiJS + React + TypeScript)
│   ├── src/
│   │   ├── game/          # EchoRenderer, palette, React mount
│   │   └── net/           # Colyseus client
│   └── vite.config.ts
└── backend/           # Game server (Node.js + Colyseus)
    ├── src/
    │   ├── sim/           # ECS world, terrain, systems
    │   │   └── systems/   # movement, acoustics, pressure, echoLayer
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

Point the client at a non-default server with `VITE_SERVER_URL`.

## Controls

| Input | Action |
|---|---|
| Left click | Select own unit (shift to add) |
| Right click | Move order for selection |
| Middle drag | Pan |
| Wheel | Zoom at cursor |
| `Space` | Toggle Silent Running |
| `P` | Active sonar ping |
| Hold `Shift` | Preview ping cost — 900 m reveal, 2,400 m self-reveal |

## Build, test, lint

```bash
npm run build       # shared -> frontend -> backend
npm test            # 31 tests across shared + backend
npm run type-check
npm run lint
```

## Architecture Notes

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
- **[#38](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/38) and
  [#39](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/39) — the two
  documentation CI gates are reporting-only.** markdownlint finds ~270
  structural issues in docs/, and seven linked documents were never written.
  Both steps go back to blocking once those are resolved.
- **No combat, economy, production, fauna, or Echo Marks yet.** Weapons exist
  only as `applyFiringSpike`; the roster spawns as a fixed opening force. This
  is unbuilt scope rather than a defect.

## Related

- [docs/systems-echo.md](docs/systems-echo.md) — the Echo Layer design
- [docs/systems-depth.md](docs/systems-depth.md) — depth and Pressure Rating
- [docs/tech-stack.md](docs/tech-stack.md) — stack rationale
- [.github/copilot-instructions.md](.github/copilot-instructions.md) — conventions
