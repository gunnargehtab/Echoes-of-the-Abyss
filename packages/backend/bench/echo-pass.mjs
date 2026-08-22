/**
 * Echo pass benchmark — the instrument issue #37 asked for before path
 * integration landed. Times EchoLayer.run() in isolation (no network, no
 * renderer) at growing army sizes on the demo map, reporting median / p90 /
 * max over 60 passes after a 300-tick warmup so JIT noise stays out of the
 * numbers. Compare against SIM.ECHO_BUDGET_MS.
 *
 * Run from the backend workspace:
 *   npm -w packages/backend run bench
 */

import { SIM } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';

function makeMatch(unitsPerSlot) {
  const match = new Match();
  for (let slot = 0; slot < 4; slot++) match.addPlayer(slot, slot);
  // Deterministic scatter across the map — no RNG, so runs are comparable.
  for (let slot = 0; slot < 4; slot++) {
    for (let i = 0; i < unitsPerSlot; i++) {
      const n = slot * unitsPerSlot + i;
      spawnUnit(match.world, {
        kind: i % 5,
        slot,
        faction: slot,
        x: 500 + (n * 487) % 7000,
        y: 500 + (n * 911) % 7000,
      });
    }
  }
  return match;
}

function bench(unitsPerSlot) {
  const match = makeMatch(unitsPerSlot);
  const stepMs = 1000 / SIM.TICK_HZ;
  for (let i = 0; i < 300; i++) match.update(stepMs);
  const echo = match.echo;
  const times = [];
  for (let i = 0; i < 60; i++) times.push(echo.run(match.world, [0, 1, 2, 3]).elapsedMs);
  times.sort((a, b) => a - b);
  const entities = 4 * (unitsPerSlot + 6); // starting base adds ~6 per slot
  return { entities, median: times[30], p90: times[54], max: times[59] };
}

bench(15); // warmup run — first-pass JIT costs land here, discarded
console.log(`echo pass vs ${SIM.ECHO_BUDGET_MS} ms budget (4 players, demo map):`);
for (const perSlot of [15, 35, 75]) {
  const r = bench(perSlot);
  console.log(
    `  ~${String(r.entities).padStart(3)} entities: ` +
      `median ${r.median.toFixed(3)} ms · p90 ${r.p90.toFixed(3)} ms · max ${r.max.toFixed(3)} ms`
  );
}
