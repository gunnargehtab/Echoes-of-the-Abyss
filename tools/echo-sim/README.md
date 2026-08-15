Echo-sim

Small deterministic echo-layer simulation harness for scenarios.

Usage:
  node sim.js                          # run built-in sample (JSON printed)
  node sim.js scenarios/my-scenario.json  # run scenario and print JSON

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
