// Echo-sim CLI — scenario-driven runs of the ONE detection model.
// All math lives in @echoes/shared (via ./lib); this file only does I/O.
const fs = require('fs');
const { runScenario, rosterActors } = require('./lib');

// If a scenario file path is provided, load it and output JSON; otherwise run
// the shipped roster through a baseline listener.
const arg = process.argv[2];
if (arg) {
  try {
    const text = fs.readFileSync(arg, 'utf8');
    const scenario = JSON.parse(text);
    const out = runScenario(scenario);
    console.log(JSON.stringify(out, null, 2));
  } catch (e) {
    console.error('Failed to read/parse scenario:', e.message);
    process.exit(2);
  }
} else {
  const sample = {
    name: 'builtin-roster-sample',
    propagationFactor: 1.0,
    actors: rosterActors('sigCruise'),
  };
  console.error('Echo-sim: shipped roster at cruise SIG vs a baseline (HYD 50) listener');
  console.log(JSON.stringify(runScenario(sample), null, 2));
}
