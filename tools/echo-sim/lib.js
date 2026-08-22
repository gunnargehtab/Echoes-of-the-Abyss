// Echo-sim library API — a thin CommonJS wrapper over @echoes/shared.
//
// There is exactly ONE detection implementation in this repository, and it
// lives in packages/shared/src/echo.ts. This tool exists so designers can run
// scenarios against it without booting the game; it must never grow its own
// physics, because a balance tool that models different math from the
// shipping game produces conclusions that do not transfer (issue #36 — the
// previous local formula had no HYD input, 1/d falloff, and tiers 1-5).
//
// Node 22+ can require() the shared package's ESM build directly. The dist
// must exist first: `npm run build:shared` from the repo root.

const path = require('path');

const sharedDist = path.join(__dirname, '../../packages/shared/dist/index.js');
let shared;
try {
  shared = require(sharedDist);
} catch (e) {
  throw new Error(
    `Could not load @echoes/shared from ${sharedDist} — run \`npm run build:shared\` ` +
      `from the repo root first (Node 22+ required). Original error: ${e.message}`
  );
}

const { resolveTier, detectionRatio, ResolutionTier, PROPAGATION_MODEL, UNIT_STATS } = shared;

const TIER_NAME = Object.fromEntries(
  Object.entries(ResolutionTier)
    .filter(([, v]) => typeof v === 'number')
    .map(([name, v]) => [v, name])
);

/**
 * What a listener of Hydrophone Rating `hyd` learns about an emitter of `sig`
 * at `distance` metres through terrain of propagation factor `pf`.
 * Returns an integer ResolutionTier, 0 (Silent) .. 4 (Track).
 */
function detect(sig, distance, pf, hyd = PROPAGATION_MODEL.BASELINE_HYD) {
  return resolveTier(sig, pf, distance, hyd);
}

/**
 * Run a scenario object and return a deterministic result object.
 * Scenario shape:
 * {
 *   name, propagationFactor,
 *   hyd,        // listener HYD applied to every run (default BASELINE_HYD)
 *   distances,  // default distance sweep
 *   actors: [{ name, sig, hyd?, distances? }]
 * }
 * An actor's `hyd` is the listening ear evaluating that actor — it overrides
 * the scenario-level `hyd` for that run.
 */
function runScenario(scenario) {
  const pf = scenario.propagationFactor || scenario.pf || 1.0;
  const scenarioHyd = scenario.hyd || PROPAGATION_MODEL.BASELINE_HYD;
  const results = {
    name: scenario.name || 'unnamed',
    pf,
    hyd: scenarioHyd,
    runs: [],
  };

  for (const a of scenario.actors || []) {
    const hyd = a.hyd || scenarioHyd;
    const actorResult = { name: a.name, sig: a.sig, hyd, detections: [] };
    const distances = a.distances || scenario.distances || [100, 500, 1200, 2500];
    for (const d of distances) {
      const tier = detect(a.sig, d, pf, hyd);
      actorResult.detections.push({
        distance: d,
        tier,
        tierName: TIER_NAME[tier],
        // Rounded so the fixture stays stable against float noise.
        ratio: Number(detectionRatio(a.sig, pf, d, hyd).toFixed(3)),
      });
    }
    results.runs.push(actorResult);
  }
  return results;
}

/**
 * The prototype roster as scenario actors (emitters), straight from
 * UNIT_STATS — so `node sim.js` with no arguments answers "at what range does
 * a listener resolve each shipped hull" using the same numbers the game runs.
 * The listening ear is the scenario's `hyd` (default: the baseline Corvette's
 * 50); pass an actor-level `hyd` to model a specific listener instead.
 */
function rosterActors(sigField = 'sigCruise') {
  return Object.values(UNIT_STATS).map((u) => ({ name: u.name, sig: u[sigField] }));
}

module.exports = { detect, runScenario, rosterActors, TIER_NAME };
