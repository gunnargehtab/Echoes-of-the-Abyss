Echo-sim

Small deterministic echo-layer scenario harness — a thin CLI over the ONE
detection implementation in `@echoes/shared` (`packages/shared/src/echo.ts`).
This tool has no physics of its own: it exists so designers can iterate on
SIG/HYD/PF thresholds without booting the game, and its conclusions transfer
because it runs the shipping model (issue #36 replaced the previous local
formula, which had no HYD input, 1/d falloff, and a 1-5 tier scale).

Prerequisite: `npm run build:shared` from the repo root (Node 22+ — the tool
requires the shared package's ESM build via require(esm)).

CLI usage:
  node sim.js                             # shipped roster (UNIT_STATS) vs a HYD-50 listener
  node sim.js scenarios/my-scenario.json  # run scenario and print JSON

Combat scenarios (docs/systems-combat.md):
  scenarios/combat-ordnance.json     # every ordnance signature vs a baseline ear
  scenarios/combat-torpedo-run.json  # SIG 60 across a torpedo's 3,200 m run, per hull

The second is the one that keeps §1's rule honest — "nothing lethal is
inaudible" is a detection claim, and this is what checking it looks like. It is
also how §6's description of an armed mine got corrected: the sweep showed a
mine reads as a smudge at 400 m, where the doc had claimed it was invisible.

Module usage (for tests/integration):
  const { runScenario, detect, rosterActors, ordnanceActors } = require('./lib');
  detect(sig, distanceM, pf, hyd)   // -> ResolutionTier 0 (Silent) .. 4 (Track)
  const result = runScenario(require('./scenarios/simple-scenario.json'));
  // assert against the matching .expected.json

Scenario format (example in scenarios/):
{
  "name": "simple",
  "propagationFactor": 1.0,
  "hyd": 50,                    // listener HYD for every run (default: BASELINE_HYD 50)
  "distances": [100, 500, 1200, 2500],
  "actors": [
    { "name": "Scout", "sig": 6 },
    { "name": "Cruiser vs sub ears", "sig": 55, "hyd": 85 }   // per-run listener override
  ]
}

Each actor is an EMITTER; `hyd` names the listening ear evaluating it. Output
rows carry the resolved tier (0-4 per docs/systems-echo.md §4), its name, and
the detection ratio against the listener's threshold — 1.0 is exactly
detectable, and the tier table keys off multiples of it.

Regenerating a fixture after a tuning change in `@echoes/shared`:
  node sim.js scenarios/simple-scenario.json > scenarios/simple-scenario.expected.json
Review the diff like a test: the fixture pins the shipped model's output.
