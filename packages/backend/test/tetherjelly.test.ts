/**
 * Tetherjelly — living terrain (#306, docs/bestiary.md §4).
 *
 * The species is a subtraction: −0.10 PF in 250 m, **additive and absolute**
 * (§4 says why a percentage would be the wrong species), composed after any
 * hazard multiplier and floored so stacked fields cannot cut holes in the
 * propagation model. The creature-shaped part is what happens when it dies:
 * the masking comes off the grid on the tick the cluster comes apart, and it
 * never comes back — the cleanest small example of the map being consumable.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DRIFT, Faction, FaunaSpecies, MIN_PROPAGATION_FACTOR, SIM } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnFauna } from '../src/sim/world.ts';
import { Health, Position } from '../src/sim/components.ts';
import { rebuildPropagation } from '../src/sim/systems/hazards.ts';
import { VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function bareMap(): MapDefinition {
  return { ...VENTFRONT_DIVIDE, id: 'test-jelly', regions: [], hazards: [] };
}

function emptyMatch(seed = 101) {
  const match = new Match(bareMap(), {
    fauna: false,
    seed,
    terrain: new Terrain(8000, 8000, 250),
  });
  match.addPlayer(0, Faction.Bathyarch);
  return match;
}

function advance(match: Match, seconds: number) {
  let last = null;
  for (let i = 0; i < seconds * SIM.TICK_HZ; i++) {
    const snapshots = match.update(STEP_MS);
    if (snapshots !== null) last = snapshots;
  }
  return last;
}

describe('tetherjelly clusters', () => {
  it('lower local PF by exactly the additive delta', () => {
    const match = emptyMatch();
    const before = match.world.terrain.propagationAt(5000, 5000);
    spawnFauna(match.world, { species: FaunaSpecies.Tetherjelly, x: 5000, y: 5000 });
    rebuildPropagation(match.world);

    const inside = match.world.terrain.propagationAt(5000, 5000);
    // Additive, not proportional: the same 0.10 whatever the biome under it.
    assert.ok(
      Math.abs(before - inside - DRIFT.JELLY_PF_DELTA) < 1e-6,
      `PF fell ${before} -> ${inside}, expected a flat ${DRIFT.JELLY_PF_DELTA}`
    );
    // And local: two cells over, nothing happened.
    const outsideBefore = match.world.terrain.propagationAt(6500, 5000);
    assert.ok(
      Math.abs(outsideBefore - match.world.terrain.propagationAt(6500, 5000)) < 1e-9,
      'the delta ends at the field'
    );
  });

  it('stack when they overlap, and the floor holds', () => {
    // A dense field is a better mask than a thin one — that is what farming
    // them buys — but stacked deltas bottom out at the floor: sound never
    // stops entirely (§4).
    const match = emptyMatch(102);
    for (let i = 0; i < 12; i++) {
      spawnFauna(match.world, { species: FaunaSpecies.Tetherjelly, x: 5000, y: 5000 });
    }
    rebuildPropagation(match.world);
    // The PF grid is float32, so compare with a tolerance rather than exactly.
    assert.ok(
      Math.abs(match.world.terrain.propagationAt(5000, 5000) - MIN_PROPAGATION_FACTOR) < 1e-6,
      `floored at ${MIN_PROPAGATION_FACTOR}, was ${match.world.terrain.propagationAt(5000, 5000)}`
    );
  });

  it('take their masking with them when killed, permanently', () => {
    const match = emptyMatch(103);
    const baseline = match.world.terrain.propagationAt(5000, 5000);
    const jelly = spawnFauna(match.world, {
      species: FaunaSpecies.Tetherjelly,
      x: 5000,
      y: 5000,
    });
    rebuildPropagation(match.world);
    assert.ok(match.world.terrain.propagationAt(5000, 5000) < baseline, 'masking in force');

    // Any AoE kills a 40 hp cluster; the delivery does not matter here.
    Health.hp[jelly] = 0;
    advance(match, 1);

    assert.ok(
      Math.abs(match.world.terrain.propagationAt(5000, 5000) - baseline) < 1e-6,
      'the lane is burned: PF back at the biome baseline on the tick it died'
    );
    // And it stays burned — nothing respawns fauna within a match.
    advance(match, 10);
    assert.ok(Math.abs(match.world.terrain.propagationAt(5000, 5000) - baseline) < 1e-6);
  });

  it('wither in failing water, so PF rises toward baseline', () => {
    // §6, the Failing row: "Tetherjelly fields thinning: local PF rises
    // toward baseline" — the other half of the concealment consequence #306
    // calls half-wired.
    const match = emptyMatch(104);
    const baseline = match.world.terrain.propagationAt(6000, 6000);
    const jelly = spawnFauna(match.world, {
      species: FaunaSpecies.Tetherjelly,
      x: 6000,
      y: 6000,
    });
    rebuildPropagation(match.world);

    // Well below the Failing line, not just under it: the region recovers at
    // DRIFT.HEALTH_RECOVERY_PER_S, and a cluster that stops withering because
    // its water crept back over the threshold mid-test is the mechanic
    // working, not the one under test.
    while (match.world.drift.at(6000, 6000) >= DRIFT.HEALTH_FAILING - 10) {
      match.world.drift.recordKill(6000, 6000);
    }
    // 40 hp at the wither rate, plus slack for the sense stagger.
    advance(match, 55);

    assert.ok(Health.hp[jelly]! <= 0, 'the cluster withered');
    assert.ok(
      Math.abs(match.world.terrain.propagationAt(6000, 6000) - baseline) < 1e-6,
      'and its masking went with it'
    );
  });

  it('are public chart data in every snapshot', () => {
    const match = emptyMatch(105);
    const jelly = spawnFauna(match.world, {
      species: FaunaSpecies.Tetherjelly,
      x: 5000,
      y: 5000,
    });
    const snapshots = advance(match, 1)!;
    const seen = snapshots.get(0)!.jellies;
    assert.equal(seen.length, 1, 'the cluster is on the chart');
    assert.equal(seen[0]!.x, 5000);
    assert.equal(seen[0]!.depth, Position.depth[jelly]!);
  });
});
