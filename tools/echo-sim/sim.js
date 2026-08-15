// Minimal echo layer simulation prototype (scenario-driven)
const fs = require('fs');

const tiers = [1, 2, 3, 4, 5];

function detect(sig, distance, pf) {
  // Simplified detection: effective = sig * pf / distance
  const effective = (sig * pf) / Math.max(distance, 1);
  if (effective > 75) return 5;
  if (effective > 40) return 4;
  if (effective > 20) return 3;
  if (effective > 8) return 2;
  return 1;
}

function runScenario(scenario) {
  const pf = scenario.propagationFactor || 1.0;
  const results = {
    name: scenario.name || 'unnamed',
    pf,
    runs: [],
  };

  for (const a of scenario.actors || []) {
    const actorResult = { name: a.name, sig: a.sig, detections: [] };
    const distances = a.distances || scenario.distances || [100, 500, 1200, 2500];
    for (const d of distances) {
      const tier = detect(a.sig, d, pf);
      actorResult.detections.push({ distance: d, tier });
    }
    results.runs.push(actorResult);
  }
  return results;
}

// If a scenario file path is provided, load it and output JSON; otherwise run the built-in sample.
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
  // Backwards-compatible sample
  const actors = [
    { name: 'Scout', sig: 6 },
    { name: 'Corvette', sig: 28 },
    { name: 'Cruiser', sig: 55 },
  ];
  const sample = { name: 'builtin-sample', propagationFactor: 1.0, actors };
  const out = runScenario(sample);
  console.log('Echo-sim: running built-in sample detections');
  console.log(JSON.stringify(out, null, 2));
}
