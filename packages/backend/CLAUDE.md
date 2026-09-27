# packages/backend/CLAUDE.md

What is true only inside the match server. It loads for a session working here; the root
`CLAUDE.md` keeps what binds two or more packages — the wire, the per-package import
extensions, where constants live, and the server-authoritative rule this package is the
one that enforces.

The shape of the package: `src/sim/match.ts` is the fixed step and the Echo pass,
`src/rooms/MatchRoom.ts` is the network boundary, and the rules live in `src/sim/` rather
than in the room. `src/sim/maps/` holds the authored map archetypes — data literals, never
generated — and `Terrain.demo()` is a test fixture, not a map. Built as a Node + esbuild
bundle.

## Two clocks

`packages/backend/src/sim/match.ts` runs a fixed 60 Hz simulation step (`SIM.TICK_HZ`) so
behaviour does not vary with server load, and resolves the Echo Layer at 5 Hz
(`SIM.ECHO_HZ`) against a hard 2 ms budget (`SIM.ECHO_BUDGET_MS`). Detection is the
expensive pass, and players cannot perceive 60 Hz changes in a sonar contact.

Anything you add to the per-tick path is on the 60 Hz budget. Anything touching detection
is on the 2 ms one — `Match` tracks the rolling worst-case cost, so a regression here is
observable rather than theoretical.

Both budgets are asserted on **counted work**, never on a stopwatch: the Echo pass by its
path integrals (`Match.contactPathWalksLastPass`), the 60 Hz step by its pair tests and
cell probes (`Match.worstStepWork`, defined in `packages/backend/src/sim/stepWork.ts`).
A maximum of a wall-clock sample is the noisiest statistic available on a shared runner —
identical work has spread eightfold between runs in one process and failed CI on the spread
alone — while a count is a property of the algorithm and is the same everywhere. The
milliseconds are still tracked and still worth printing; they are not what a test fails on.

## Colyseus

The backend runs Colyseus **0.18**: `@colyseus/core`, `@colyseus/ws-transport` and
`@colyseus/schema` 5, with `@colyseus/sdk` on the client. Import from `@colyseus/core`. The
`colyseus` meta-package is not a dependency, and was avoided before it was dropped: under
0.15 it re-exported via `__exportStar`, which Node's static CJS export detection cannot see,
so `import { Room } from 'colyseus'` failed at runtime under the unbundled ESM dev server
while working fine once bundled.

`MatchState` declares its fields with `@type()` decorators, not the `schema()` builder, and
the decorators need legacy semantics. That is why `useDefineForClassFields` stays `false`
in the backend tsconfig — flipping it silently wipes the `@type()` metadata.

The vendored `colyseus` skill documents 0.18, so it describes this backend: load it before
writing Room or Schema code. Translate two things. Its first step reads the version from
`colyseus`, which is absent here, so read `@colyseus/core` instead — finding nothing is not
"nothing installed". And its examples import from `'colyseus'`, which here is
`'@colyseus/core'`.

Related: `CLAUDE.md` (the root file — the wire, import extensions, constants, CI) ·
`docs/invariants.md` (the rows that hold both budgets above) ·
`.claude/VENDORED-SKILLS.md` (why the `colyseus` skill is carried at all)
