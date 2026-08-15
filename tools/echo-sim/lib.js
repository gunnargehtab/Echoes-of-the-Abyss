// Echo-sim library API
// Exports detect and runScenario for programmatic use (tests, integration).

/**
 * Compute detection tier from sig, distance and propagation factor.
 * Returns integer tier 1..5
 */
function detect(sig, distance, pf) {
  const effective = (sig * pf) / Math.max(distance, 1);
  if (effective > 75) return 5;
  if (effective > 40) return 4;
  if (effective > 20) return 3;
  if (effective > 8) return 2;
  return 1;
}

/**
 * Run a scenario object and return a deterministic result object.
 * Scenario shape:
 * { name, propagationFactor, distances, actors: [{name, sig, distances?}] }
 */
function runScenario(scenario) {
  const pf = scenario.propagationFactor || scenario.pf || 1.0;
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

module.exports = { detect, runScenario };
