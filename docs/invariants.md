# Invariants

Properties this simulation must hold, where each one comes from, and the test that
holds it.

None of these are new. Every row below was already enforced before this document
existed — as an assertion in a suite, usually with a long comment above it saying what
the fault was and why the shape of the test is what it is. What was missing is a list:
somewhere a person, or an agent, can read what "correct" means here without first
knowing which of 182 test files to open.

## What belongs here, and what does not

An invariant is a property that must hold **over every input**, not an expected value
for one. "No entity exists above `world.maxEid`" is an invariant. "The Clarion costs 90
Alloy" is a number, and it lives in `packages/shared/src/constants.ts` with a SPEC tag
and a doc citation.

Three tests of whether a row belongs:

- **Breaking it is a bug, not a balance change.** A repriced hull breaks nothing; an
  entity above the bound is invisible to the Echo pass and to the Drift, silently.
- **It is held by a test, not by a convention.** A rule nobody checks is a comment.
  A row whose holder does not exist fails `npm run check:invariants` — that gate is
  what stops this document becoming the second description that drifts.
- **It states what must be true, not how.** The holder may be rewritten freely; the row
  survives it.

**This list is not complete and does not claim to be.** It states the invariants that
were written down as invariants by the tests that hold them. Adding a row is a normal
part of fixing a bug whose failure mode was silent — that is exactly the kind this
document is for.

## The invariants

Each row names the property, the doc section or issue it descends from, and the file
and test that hold it. `npm run check:invariants` verifies that every holder still
exists, by file and by test name.

| # | Invariant | Source | Held by |
| --- | --- | --- | --- |
| 1 | Every spawn path registers its entity, so a pass walking ids ascending under `world.maxEid` sees every entity that exists | bitECS sizes stores to capacity; the bound is only correct while this holds | `packages/backend/test/world.test.ts` — `entity id high-water mark` |
| 2 | Ordnance does not listen. A torpedo or mine never resolves as an observer for the player who fired it | [systems-combat.md](systems-combat.md) §6 — a mine waits to hear you, it does not report | `packages/backend/test/ordnanceFog.test.ts` — `ordnance and the fog of war` |
| 3 | The own-ordnance payload carries no detection the player has not made — no `locked` flag, no target identity | Server-authoritative (`CLAUDE.md`) | `packages/backend/test/ordnanceFog.test.ts` — `ordnance and the fog of war` |
| 4 | A spawn writes **every** field of its component, because bitECS hands entity ids back with the old bytes still under them | #617; [systems-combat.md](systems-combat.md) §5 — a decoy a committed seeker ignores | `packages/backend/test/ordnanceSpawn.test.ts` — `spawnOrdnance against a recycled id (#617)` |
| 5 | Every structure, resource field and spawn on every map sits inside an authored region, in water deep enough to hold it | [maps.md](maps.md), "How a map is written"; #622 | `packages/backend/test/maps.test.ts` — `every map has water where it seats things` |
| 6 | A mission beat never fails an objective the player has already met — objective status is monotonic | [mission-tolerance.md](mission-tolerance.md) §4, §11; [mission-aptitude.md](mission-aptitude.md) | `packages/backend/test/missionUnderworks.test.ts` — `the choice, as rules` |
| 7 | An objective's progress is computed **only** from the observer's own knowledge, never from world truth | [ui-ux.md](ui-ux.md) §10.5; the `INVARIANT:` comment in `packages/shared/src/missions.ts` | `packages/frontend/test/missionPanel.test.ts` — `shows the counters the server sent and does no arithmetic of its own` |
| 8 | The Echo pass stays inside its work budget, counted as path integrals rather than timed | `CLAUDE.md`, "Two clocks"; `SIM.ECHO_BUDGET_MS` | `packages/backend/test/match.test.ts` — `stays inside its work budget for a small match in contact` |
| 9 | The 60 Hz step stays inside its work budget, counted as pair tests and cell probes rather than timed | `CLAUDE.md`, "Two clocks"; `sim/stepWork.ts` | `packages/backend/test/separation.test.ts` — `stays inside the 60 Hz per-tick work budget with a crowd` |
| 10 | `MAX_UNIT_RADIUS_M` bounds every hull in the roster, so the broadphase cannot miss a pair | Derived from the longest hull in `UNIT_STATS`; #149, #461 | `packages/shared/test/units.test.ts` — `roster invariants` |
| 11 | Every navy has a hull at every rung, so no commander is left with nothing to save for | [roster-plan.md](roster-plan.md) §3; #518 | `packages/backend/test/aiRung.test.ts` — `has a rung hull for every navy, so no navy is left with nothing to save for` |
| 12 | No propagation cell exceeds the grid's reported peak, and that peak never exceeds the loudest PF anything is specified to produce | [environments.md](environments.md); #372 — a storm ×10 is a modifier like any other | `packages/backend/test/hazards.test.ts` — `resonance storms`; `packages/backend/test/terrainChange.test.ts` — `the water a beat rewrites` |
| 13 | The seabed relief pass shades against the light model, over every cell of every map, without darkening a cell out of its biome | [graphics-standards.md](graphics-standards.md); [style-neon-noir.md](style-neon-noir.md) | `packages/frontend/test/palette.test.ts` — `reliefShade` |

## Why a gate, and what it does not do

`npm run check:invariants` reads the table above and asserts that every holder resolves:
the file exists, and the test name appears in it. A row naming a test somebody renamed
or deleted fails loudly, in the same idiom as `npm run check:models` and the roadmap's
drift report.

That is a **liveness** check, not a correctness one, and the distinction matters. The
gate cannot tell you the test still asserts what the row claims — only that something by
that name is still there. What it buys is the failure mode this document would otherwise
have: a list that reads as authoritative while quietly describing a suite that has moved
on. Prose that repeats what code does drifts; a script makes the drift loud.

The tests themselves are what hold the invariants, and they run in `npm test` like
everything else. This gate only holds the *list*.

## Related

- `CLAUDE.md` — the two clocks, constants in one place, server-authoritative
- [maps.md](maps.md) — how a map is written, and the three authoring faults its tests caught
- [systems-combat.md](systems-combat.md) — ordnance, decoys, and what a mine does
- [systems-echo.md](systems-echo.md) — detection, the pass the budget in row 8 bounds
- [ui-ux.md](ui-ux.md) — §10.5's status region, and the anti-reveal rules row 7 serves
- [README.md](README.md) — the rest of the design bible
