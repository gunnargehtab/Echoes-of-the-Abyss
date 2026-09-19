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

Import from `@colyseus/core`, never the `colyseus` meta-package. The meta-package
re-exports via `__exportStar`, which Node's static CJS export detection cannot see, so
`import { Room } from 'colyseus'` fails at runtime under the unbundled ESM dev server while
working fine once bundled. `@colyseus/schema` needs legacy decorators, which is why
`useDefineForClassFields` stays `false` in the backend tsconfig — flipping it silently
wipes the `@type()` metadata.

The vendored `colyseus` skill documents **0.18**, four minors ahead of what is pinned here.
It checks the installed version first and will tell you to follow 0.15's own docs, which is
correct — it is carried as a guard against recall writing 0.17/0.18 API shapes into a 0.15
room, not as a description of this backend.

Related: `CLAUDE.md` (the root file — the wire, import extensions, constants, CI) ·
`docs/invariants.md` (the rows that hold both budgets above) ·
`.claude/VENDORED-SKILLS.md` (why the `colyseus` skill is carried at all)
