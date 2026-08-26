/**
 * Own-force alerts (#206, #209) — docs/ui-ux.md §5.
 *
 * Two server-sent facts: `Damaged`, a blow of violence landing on your own
 * force, and `HarvesterIdle`, a hull that ran out of work. Both exist because
 * the alternative is the client inferring them, and every inference available
 * to it is sometimes wrong — a falling hp number cannot tell a shell from
 * crush attrition, and §8 keeps those on different channels on purpose.
 *
 * What this file pins is the *edges*: who is told, what is never told, how
 * many times, and that a quiet the player chose raises nothing.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Faction,
  HarvestIdleReason,
  SIM,
  SelfEventKind,
  UnitKind,
  type EchoSnapshot,
} from '@echoes/shared';
import { defineQuery } from 'bitecs';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { raiseSelfEvent, spawnUnit } from '../src/sim/world.ts';
import { launchTorpedo } from '../src/sim/systems/ordnance.ts';
import { Harvester, Health, Position, ResourceNode } from '../src/sim/components.ts';
import { VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const MAP_M = 8000;

/** Open water, no regions, no hazards: nothing else may touch these numbers. */
const PLAIN: MapDefinition = { ...VENTFRONT_DIVIDE, id: 'test-alerts', regions: [], hazards: [] };

function plainMatch(seed = 206): Match {
  return new Match(PLAIN, { fauna: false, seed, terrain: new Terrain(MAP_M, MAP_M, 250) });
}

function advance(match: Match, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * SIM.TICK_HZ); i++) match.update(STEP_MS);
}

/** Advance until the next Echo snapshot lands, and return it. */
function nextSnapshot(match: Match): Map<number, EchoSnapshot> {
  for (let i = 0; i < SIM.TICK_HZ; i++) {
    const snapshots = match.update(STEP_MS);
    if (snapshots !== null) return snapshots;
  }
  throw new Error('no Echo snapshot within a second of simulation');
}

/** Collect every snapshot over the next `seconds` of simulation. */
function snapshotsOver(match: Match, seconds: number): Map<number, EchoSnapshot>[] {
  const out: Map<number, EchoSnapshot>[] = [];
  for (let i = 0; i < Math.round(seconds * SIM.TICK_HZ); i++) {
    const snapshots = match.update(STEP_MS);
    if (snapshots !== null) out.push(snapshots);
  }
  return out;
}

const eventsOf = (snapshot: EchoSnapshot | undefined, kind: SelfEventKind) =>
  (snapshot?.selfEvents ?? []).filter((event) => event.kind === kind);

describe('the damaged event', () => {
  it('tells the victim, and only the victim', () => {
    const match = plainMatch();
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);
    // An armed hull against an unarmed one, far from either base, so every
    // blow in the water has one author and one victim.
    spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    const victim = spawnUnit(match.world, {
      kind: UnitKind.Harvester,
      slot: 1,
      faction: Faction.Pelagia,
      x: 4300,
      y: 4000,
    });

    let told = false;
    for (const snapshots of snapshotsOver(match, 5)) {
      for (const event of eventsOf(snapshots.get(1), SelfEventKind.Damaged)) {
        if (event.unitId === victim) told = true;
      }
      assert.equal(
        eventsOf(snapshots.get(0), SelfEventKind.Damaged).length,
        0,
        'the shooter is never told about blows it dealt'
      );
      if (told && Health.hp[victim]! <= 0) break;
    }
    assert.ok(told, 'the victim was told a blow landed');
  });

  it('collapses a burst into one event per snapshot', () => {
    const match = plainMatch();
    match.addPlayer(0, Faction.Bathyarch);
    const hull = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    // A sustained bite raises Damaged on every sim tick between snapshots;
    // all of them mean one fact, and the drain says it once.
    raiseSelfEvent(match.world, { kind: SelfEventKind.Damaged, eid: hull });
    raiseSelfEvent(match.world, { kind: SelfEventKind.Damaged, eid: hull });
    raiseSelfEvent(match.world, { kind: SelfEventKind.Damaged, eid: hull });

    const snapshot = nextSnapshot(match).get(0);
    assert.equal(eventsOf(snapshot, SelfEventKind.Damaged).length, 1);
  });

  it('delivers the killing blow, which is the one that matters most', () => {
    // The event is addressed when it is raised, not when it is drained: the
    // hull is reaped at 60 Hz and the snapshot is built at 5, so resolving
    // ownership at the drain dropped exactly the blow that ended a fight.
    const match = plainMatch();
    match.addPlayer(0, Faction.Bathyarch);
    const doomed = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    match.update(STEP_MS);
    // A blow the hull does not survive, raised and reaped inside one echo tick.
    Health.hp[doomed] = 1;
    raiseSelfEvent(match.world, { kind: SelfEventKind.Damaged, eid: doomed });
    Health.hp[doomed] = 0;

    const snapshot = nextSnapshot(match).get(0);
    const events = eventsOf(snapshot, SelfEventKind.Damaged);
    assert.equal(events.length, 1, 'the owner is told, though the hull is gone');
    assert.equal(events[0]!.unitId, doomed);
    assert.equal(
      snapshot?.units.some((unit) => unit.id === doomed),
      false,
      'and the hull really is gone from the roster reporting it'
    );
  });

  it('says nothing to a gunner whose point defence chewed a torpedo', () => {
    // Point defence shoots ordnance, and a torpedo is not one of your units:
    // its owner must not hear their own plating struck.
    const match = plainMatch();
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);
    const gunner = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 4000,
      y: 4000,
    });
    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000 + 900,
      y: 4000,
    });
    advance(match, 0.5);
    launchTorpedo(match.world, launcher, Position.x[gunner]!, Position.y[gunner]!);

    for (const snapshots of snapshotsOver(match, 6)) {
      assert.equal(
        eventsOf(snapshots.get(0), SelfEventKind.Damaged).length,
        0,
        'the torpedo taking fire is not a blow on its owner'
      );
    }
  });

  it('never fires for the shallow bleed — attrition is not an attack', () => {
    const match = plainMatch();
    match.addPlayer(0, Faction.Directorate);
    const hull = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Directorate,
      x: 4000,
      y: 4000,
      depth: 200,
    });

    let bled = false;
    for (const snapshots of snapshotsOver(match, 3)) {
      const own = snapshots.get(0)?.units.find((unit) => unit.id === hull);
      if (own !== undefined && own.unhealableDamage > 0) bled = true;
      assert.equal(
        eventsOf(snapshots.get(0), SelfEventKind.Damaged).length,
        0,
        'the hull the shallows take goes to §8, never to the alert'
      );
    }
    assert.ok(bled, 'the bleed actually bit, so the assertion above tested something');
  });
});

describe('the harvester idle report', () => {
  const nodesQuery = defineQuery([ResourceNode]);
  const harvestersQuery = defineQuery([Harvester]);

  it('reports a mined-out water once, with the reason, and keeps the state', () => {
    const match = plainMatch();
    match.addPlayer(0, Faction.Bathyarch);
    // Empty every field before the starting harvester reaches one: its next
    // retarget finds nothing, which is the MinedOut starvation.
    for (const node of nodesQuery(match.world)) ResourceNode.remaining[node] = 0;
    const harvester = harvestersQuery(match.world)[0]!;

    const first = nextSnapshot(match).get(0);
    const events = eventsOf(first, SelfEventKind.HarvesterIdle);
    assert.equal(events.length, 1, 'the stall is news exactly once');
    assert.equal(events[0]!.unitId, harvester);
    assert.equal(events[0]!.idleReason, HarvestIdleReason.MinedOut);

    for (const snapshots of snapshotsOver(match, 1)) {
      assert.equal(
        eventsOf(snapshots.get(0), SelfEventKind.HarvesterIdle).length,
        0,
        'a continuing stall raises nothing new'
      );
      const own = snapshots.get(0)?.units.find((unit) => unit.id === harvester);
      assert.equal(own?.idle, HarvestIdleReason.MinedOut, 'but the state keeps saying it');
    }
  });

  it('says nothing for a harvester the player parked', () => {
    const match = plainMatch();
    match.addPlayer(0, Faction.Bathyarch);
    const harvester = harvestersQuery(match.world)[0]!;
    // A move order is the player choosing quiet: mode goes Idle, no reason.
    match.orderMove(0, harvester, 4000, 4000);

    for (const snapshots of snapshotsOver(match, 1)) {
      assert.equal(eventsOf(snapshots.get(0), SelfEventKind.HarvesterIdle).length, 0);
      const own = snapshots.get(0)?.units.find((unit) => unit.id === harvester);
      assert.equal(own?.idle, undefined, 'a chosen quiet is not a stall');
    }
  });
});
