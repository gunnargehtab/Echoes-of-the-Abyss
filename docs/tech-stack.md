# Echoes of the Abyss — Tech Stack

For a browser-based RTS (PC-first), the stack needs to give high performance for real-time simulation, smooth rendering for units/particles/UI, easy deployment (no installs), and long-term maintainability.

## Recommended Stack

### Frontend

- TypeScript
- PixiJS (rendering)
- bitecs (ECS)
- Howler.js (audio)
- Optional: React for menus/lobby

### Backend

- Node.js
- Colyseus (multiplayer)
- Redis (real-time caching)
- PostgreSQL (persistent data)

### Build Tools

- Vite
- ESBuild

### Deployment

- Vercel (frontend)
- Hetzner Cloud (game servers, low latency in Germany)

## Echo Layer Implementation Notes

Detection (see [systems-echo.md](systems-echo.md)) is **server-authoritative and per-player** — in a game about hidden information, a client-side maphack is the whole threat model, so acoustic resolution tiers must be computed server-side and only the resolved result sent to each client.

- The Echo Layer runs on a **spatial hash**, evaluated at **5 Hz**
- Hard budget: **2 ms/tick** for the full detection pass, to stay inside the simulation's frame budget under Colyseus
- Howler.js handles standard audio playback; raw Web Audio is layered on top for the mix requirements in [art-direction.md](art-direction.md) (Tier-1 contacts must be heard before they're seen)

### What keeps the pass inside 2 ms

The cost of detection is the number of emitter–listener pairs that survive pruning, which
grows roughly quadratically with army size. Measured with `npm -w packages/backend run bench`:

| Entities | Median | p90 |
| --- | --- | --- |
| ~84 | 0.37 ms | 0.43 ms |
| ~164 | 1.30 ms | 2.30 ms |
| ~324 | 3.30 ms | 4.10 ms |

Layers, cheapest first:

1. **Spatial hash broadphase** bounds each emitter by the range at which the sharpest ears
   in the game could hear it through the loudest water on the map.
2. **Per-HYD lookup tables** turn "this listener's real audible range" into a table read.
3. **One squared-distance test** then rejects most pairs before any square root, `pow` or
   path walk — see below.
4. **Aborting path walks**: `Terrain.pathPropagation` gives up as soon as even all-trench
   water for the remaining samples could not reach the bar it was given.

The third layer is the one worth understanding, because it is not obvious. Only the *best*
resolution per side ever ships — a player learns the most any one of their listeners
resolved. So a pair that cannot beat the tier that side already holds for that emitter
contributes nothing, and must not cost a path integral to discard. Because the propagation
model is invertible, "must beat tier T" converts into a distance, and the whole test folds
into one comparison in squared-distance space. A side already holding a Track rejects every
remaining listener outright.

This is lossless, and `test/echo-parity.test.ts` holds it to that: it recomputes detection
the slow all-pairs way, straight from the shared propagation math, and asserts the optimised
pass resolves exactly the same tier for every emitter and every side.

Two things measured and rejected along the way, recorded so nobody re-runs the experiment:
sorting candidates nearest-first made the pass **slower** (a comparator sort costs more than
the walks its ordering avoids), and so did approximating that ordering with a two-sweep split
at a distance cut.

## Rationale & Alternatives Considered

### Core Engine

- **PixiJS** (chosen) — fastest for UI-heavy RTS, great WebGL/2D rendering for isometric maps, fog of war, particle effects
- **Phaser** — easiest to start, great tooling, viable alternative
- **Unity WebGL** — full 3D engine, strong editor, but heavy on memory and slower on older machines; good if pursuing Command & Conquer 3-style 3D visuals
- **Godot Web Export** — lightweight, open source, great 2D engine, improving web export; good for a stylized 2D RTS

### Game Logic & Simulation

- **Language:** TypeScript, for type safety and fewer bugs in complex RTS logic
- **Architecture:** Entity Component System (ECS) for units/buildings/projectiles, fixed-step game loop (e.g. 60 ticks/sec), deterministic simulation for multiplayer
- **ECS libraries considered:** bitecs (fastest JS ECS, chosen), ecsy (Mozilla, very clean API)

### Networking

- **Colyseus** (chosen) — real-time multiplayer framework with built-in state sync, works well with TypeScript, ideal for RTS
- **Custom WebSocket server** (Node.js + ws) — full control, more work
- **WebRTC** — peer-to-peer, harder to make deterministic, not ideal for RTS unless already experienced with it

### Backend & Infrastructure

- **Server runtime:** Node.js (TypeScript)
- **Database:** PostgreSQL for player accounts/saves, Redis for matchmaking and real-time state caching
- **Hosting:** Vercel/Netlify for frontend; AWS/Hetzner for game servers

### Art & Asset Pipeline

- **Rendering style:** 2D isometric (like C&C, Warcraft II), 2.5D with WebGL shaders, or full 3D if using Unity/Godot
- **Tools:** Blender (submarine models, terrain), TexturePacker (spritesheets), Spine or DragonBones (unit animations)

This stack gives high performance, easy development, and long-term stability.

---

## Determinism and Replay

The simulation is deterministic by construction — fixed 60 Hz steps, no wall-clock inside
the step path, hand-authored terrain rather than a seeded generator — and that property is
now *tested* rather than assumed.

| Piece | Where | What it does |
| --- | --- | --- |
| Seeded RNG | `packages/backend/src/sim/rng.ts` | The simulation's only randomness. `world.rng`, seeded per match; `fork(name)` gives a subsystem its own stream, so adding a die roll to fauna cannot shift every later hazard roll |
| Lint gate | `.eslintrc.cjs` | `Math.random()` and `Date` are errors anywhere under `sim/`. `rng.ts` is the single exemption, because picking a seed is the one place entropy legitimately enters |
| State hash | `sim/stateHash.ts` | FNV-1a over positions, health, acoustics, orders, economies and production queues |
| Replay | `sim/replay.ts` | Seed, roster, and every command attempt with the tick it landed on, plus periodic checkpoints |

Two details are load-bearing and easy to get wrong, both for the same underlying reason:
**bitecs allocates entity ids from a counter global to the process, not to the world.** Two
matches constructed in one process hold identical values under different ids.

- The **state hash** mixes each entity's ordinal position within its own world rather than
  its raw id. Hashing raw ids reports a perfectly reproducible match as divergent, purely
  because of how many matches ran before it.
- **Replays** name entities by *match-local id* — a per-world counter assigned at spawn —
  not by entity id. A replay full of raw ids addresses entities that do not exist in the
  world it is replayed into, and silently no-ops its own commands.

Commands are recorded as attempts, including refused ones, so replay re-exercises the
validation path: a regression that starts accepting something it used to reject surfaces as
a divergence rather than as a subtly different match nobody notices.

Checkpoints are what make a divergence *findable*. `playReplay` reports the first tick whose
hash disagreed, so the answer is "it broke at tick 300", not "the twenty-minute match ended
differently".
