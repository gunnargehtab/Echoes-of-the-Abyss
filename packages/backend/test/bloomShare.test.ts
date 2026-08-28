/**
 * Bloom-share — docs/economy.md §6, against a live match.
 *
 * `tithe.test.ts`'s shape claims, pointed at ground. The tithe is "independent
 * of extraction"; bloom-share is the same continuous income *anchored*: §6
 * says it yields "without a harvester loop, provided the plateau is theirs",
 * and docs/mission-tend.md §13 sharpens "theirs" into "accrues while the
 * nodes are held and stops when they are not". So the tests that matter are
 * the anchoring ones — pays while tended, stops the tick the tender leaves or
 * goes silent, scales with nodes and never with gardeners, and pays nobody
 * whose economy it is not. A bloom-share that kept paying an empty plateau
 * would be the tithe wearing the wrong name.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { BLOOM_SHARE, Faction, SIM, UnitKind } from '@echoes/shared';
import { hasComponent } from 'bitecs';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { Harvester, Health, Owner, Position, SilentRunning } from '../src/sim/components.ts';
import { economyFor, spawnUnit } from '../src/sim/world.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const PLAYER = 0;

/** Far from the spawn corner, so the starting base is out of the story. */
const GARDEN = { x: 7000, y: 7000 };

function quietMatch(seed = 37): Match {
  // The tithe suite's fixture, for its reason: this is arithmetic, and a
  // creature eating the gardener mid-measurement is noise in both senses.
  return new Match(undefined, {
    fauna: false,
    seed,
    terrain: new Terrain(8000, 8000, 250),
  });
}

function advance(match: Match, seconds: number): void {
  for (let i = 0; i < seconds * SIM.TICK_HZ; i++) match.update(STEP_MS);
}

/** Stop every harvester this slot owns, so nothing but the bloom pays. */
function idleHarvesters(match: Match, slot: number): void {
  for (let eid = 0; eid < Owner.slot.length; eid++) {
    if (!hasComponent(match.world, Harvester, eid) || Owner.slot[eid] !== slot) continue;
    Health.hp[eid] = 0;
    Harvester.mode[eid] = 0;
    Harvester.cargo[eid] = 0;
  }
}

/** A hull parked on the garden — the tender of docs/mission-tend.md §4. */
function tender(match: Match, faction: Faction, x = GARDEN.x, y = GARDEN.y): number {
  const eid = spawnUnit(match.world, {
    kind: UnitKind.LightScout,
    slot: PLAYER,
    faction,
    x,
    y,
    depth: 200,
    weaponsCold: true,
  });
  assert.notEqual(eid, 0);
  return eid;
}

/** Nodules earned over `seconds` with everything else idled. */
function earned(match: Match, seconds: number): number {
  const before = economyFor(match.world, PLAYER).nodules;
  advance(match, seconds);
  return economyFor(match.world, PLAYER).nodules - before;
}

describe('the share accrues while the node is tended', () => {
  it('pays the authored rate for a hull standing in the garden, mining nothing', () => {
    const match = quietMatch();
    match.addPlayer(PLAYER, Faction.Pelagia);
    advance(match, 1);
    idleHarvesters(match, PLAYER);
    match.world.blooms.push({ ...GARDEN });
    tender(match, Faction.Pelagia);

    const got = earned(match, 30);
    assert.ok(
      Math.abs(got - BLOOM_SHARE.PER_NODE_PER_S * 30) < 1,
      `a tended node paid ${got} over 30 s against a rate of ${BLOOM_SHARE.PER_NODE_PER_S}/s`
    );
  });

  it('pays per node, never per gardener', () => {
    // "One share per node": a garden pays for being tended, so massing hulls
    // on one node buys nothing — while one hull inside two gardens' radii
    // tends both, because the anchor is the ground and not the unit.
    const match = quietMatch();
    match.addPlayer(PLAYER, Faction.Pelagia);
    advance(match, 1);
    idleHarvesters(match, PLAYER);
    match.world.blooms.push({ x: GARDEN.x - 100, y: GARDEN.y }, { x: GARDEN.x + 100, y: GARDEN.y });
    tender(match, Faction.Pelagia);
    tender(match, Faction.Pelagia);
    tender(match, Faction.Pelagia);

    const got = earned(match, 30);
    assert.ok(
      Math.abs(got - 2 * BLOOM_SHARE.PER_NODE_PER_S * 30) < 1,
      `two nodes under three gardeners paid ${got} over 30 s — the share is per node`
    );
  });
});

describe('the share stops when the node is not held', () => {
  it('stops the tick the tender leaves, and resumes when it returns', () => {
    const match = quietMatch();
    match.addPlayer(PLAYER, Faction.Pelagia);
    advance(match, 1);
    idleHarvesters(match, PLAYER);
    match.world.blooms.push({ ...GARDEN });
    const eid = tender(match, Faction.Pelagia);

    assert.ok(earned(match, 10) > 0, 'the tended garden paid nothing');

    Position.x[eid] = GARDEN.x - BLOOM_SHARE.TEND_RADIUS_M * 3;
    assert.equal(earned(match, 10), 0, 'an untended garden kept paying');

    Position.x[eid] = GARDEN.x;
    assert.ok(earned(match, 10) > 0, 'a re-tended garden stayed dry');
  });

  it('stops under Silent Running, because silence stops the work', () => {
    // docs/systems-echo.md §6 as docs/mission-tend.md §3 reads it: "SIG falls
    // to single digits, the share stops accruing". Going quiet spends the day.
    const match = quietMatch();
    match.addPlayer(PLAYER, Faction.Pelagia);
    advance(match, 1);
    idleHarvesters(match, PLAYER);
    match.world.blooms.push({ ...GARDEN });
    const eid = tender(match, Faction.Pelagia);

    SilentRunning.active[eid] = 1;
    assert.equal(earned(match, 10), 0, 'a silent tender kept earning the share');

    SilentRunning.active[eid] = 0;
    assert.ok(earned(match, 10) > 0, 'the share did not resume when silence ended');
  });
});

describe('the share is the Commune’s economy and nobody else’s', () => {
  it('pays nothing to another faction standing in the same garden', () => {
    // docs/economy.md §6 gives each navy exactly one income identity, and
    // bloom-share is Pelagia's — a Consortium hull on the plateau is an
    // occupation, not a harvest.
    const match = quietMatch();
    match.addPlayer(PLAYER, Faction.Bathyarch);
    advance(match, 1);
    idleHarvesters(match, PLAYER);
    match.world.blooms.push({ ...GARDEN });
    tender(match, Faction.Bathyarch);

    assert.equal(earned(match, 15), 0, 'the bloom paid a faction it does not belong to');
  });
});
