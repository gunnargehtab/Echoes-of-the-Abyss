/**
 * A harvester banks only at a structure that accepts deposits (#1435).
 *
 * `nearestDepot` always checked `acceptsDeposits`; the cached-depot check did
 * not. bitecs recycles entity ids, so a harvester whose Refinery died could
 * find that id back as its owner's completed turret, dock there and bank. The
 * fixture writes that inherited state directly — a cached depot id that names
 * a turret — since forcing bitecs to hand one exact id back is a fixture about
 * bitecs' queue rather than about the harvest loop.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Faction, ResourceKind, SIM, StructureKind } from '@echoes/shared';
import { hasComponent } from 'bitecs';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { Harvester, HarvestMode, Owner, Position, Structure } from '../src/sim/components.ts';
import { economyFor, spawnStructure } from '../src/sim/world.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): void {
  for (let i = 0; i < seconds * SIM.TICK_HZ; i++) match.update(STEP_MS);
}

function first(match: Match, test: (eid: number) => boolean): number {
  for (let eid = 0; eid < Owner.slot.length; eid++) if (test(eid)) return eid;
  assert.fail('no such entity');
}

/**
 * A full nodule hold parked on a structure of `kind`, cached as its depot.
 * Returns what the slot banked over two seconds and the depot it ends on.
 */
function dockAt(kind: StructureKind): { banked: number; depot: number; bastion: number } {
  const match = new Match(undefined, {
    fauna: false,
    seed: 1435,
    terrain: new Terrain(8000, 8000, 250),
  });
  match.addPlayer(0, Faction.Bathyarch);
  advance(match, 1);
  const world = match.world;
  const bastion = first(
    match,
    (eid) =>
      hasComponent(world, Structure, eid) &&
      Owner.slot[eid] === 0 &&
      Structure.kind[eid] === StructureKind.Bastion
  );
  const hauler = first(
    match,
    (eid) => hasComponent(world, Harvester, eid) && Owner.slot[eid] === 0
  );
  // Far enough from the Bastion that two seconds cannot reach it.
  const x = Position.x[bastion]! + 2000;
  const y = Position.y[bastion]!;
  const site = spawnStructure(world, {
    kind,
    slot: 0,
    faction: Faction.Bathyarch,
    x,
    y,
    prebuilt: true,
  });
  Position.x[hauler] = x;
  Position.y[hauler] = y;
  Position.depth[hauler] = Position.depth[site]!;
  Harvester.cargoKind[hauler] = ResourceKind.Nodule;
  Harvester.cargo[hauler] = 10;
  Harvester.mode[hauler] = HarvestMode.ToDepot;
  Harvester.depotEid[hauler] = site;

  const before = economyFor(world, 0).nodules;
  advance(match, 2);
  return {
    banked: economyFor(world, 0).nodules - before,
    depot: Harvester.depotEid[hauler]!,
    bastion,
  };
}

describe('the cached depot (#1435)', () => {
  it('banks at a Refinery it is docked at', () => {
    // The positive control: the same fixture lands when the site is a depot.
    assert.ok(dockAt(StructureKind.Refinery).banked > 0, 'the Refinery delivery did not land');
  });

  it('does not bank at a turret holding the dead depot’s id, and heads for a real one', () => {
    const run = dockAt(StructureKind.SentinelTurret);
    assert.equal(run.banked, 0, 'the load banked at a turret');
    assert.equal(run.depot, run.bastion, 'the harvester did not retarget the Bastion');
  });
});
