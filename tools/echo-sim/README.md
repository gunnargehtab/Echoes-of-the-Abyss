Echo-sim

Small deterministic echo-layer simulation harness for scenarios.

CLI usage:
  node sim.js                          # run built-in sample (JSON printed)
  node sim.js scenarios/my-scenario.json  # run scenario and print JSON

Module usage (for tests/integration):
  const { runScenario, detect } = require('./lib');
  const scenario = require('./scenarios/simple-scenario.json');
  const result = runScenario(scenario);
  // assert against expected output

Scenario format (example in scenarios/):
{
  "name": "simple",
  "propagationFactor": 1.0,
  "actors": [
    { "name": "Scout", "sig": 6, "distances": [100,500,1200,2500] }
  ]
}

Acceptance criteria (for issue #26):
- scenarios/ contains at least one scenario JSON and a corresponding expected output file.
- sim.js accepts a scenario path and prints deterministic JSON suitable for tests.

Acceptance criteria (for issue #27):
- tools/echo-sim exposes an API for test harnesses: lib.js exports detect and runScenario.
- package.json points to the main entry for programmatic requires (main: lib.js).
- README documents both CLI and module usage with an example.
