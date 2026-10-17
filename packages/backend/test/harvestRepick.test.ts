/**
 * A harvester re-picks its depot every trip (#1434).
 *
 * It used to keep the first depot it found for life, so a hauler that banked
 * at the Bastion never used a forward Refinery built later beside its field,
 * and that Refinery never hummed. docs/economy.md §8: "Forward refineries are
 * real: any deposit structure works".
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Faction, ResourceKind, SIM, StructureKind } from '@echoes/shared';
import { hasComponent } from 'bitecs';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { Harvester, HarvestMode, Owner, Position, Structure } from '../src/sim/components.ts';
import { economyFor, spawnResourceNode, spawnStructure } from '../src/sim/world.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function first(test: (eid: number) => boolean): number {
  for (let eid = 0; eid < Owner.slot.length; eid++) if (test(eid)) return eid;
  assert.fail('no such entity');
}

describe('the depot a harvester hauls to (#1434)', () => {
  it('banks at a forward Refinery built after its first trip home', () => {
    const match = new Match(undefined, {
      fauna: false,
      seed: 1434,
      terrain: new Terrain(8000, 8000, 250),
    });
    match.addPlayer(0, Faction.Bathyarch);
    match.update(STEP_MS);
    const world = match.world;
    const bastion = first(
      (eid) =>
        hasComponent(world, Structure, eid) &&
        Owner.slot[eid] === 0 &&
        Structure.kind[eid] === StructureKind.Bastion
    );
    const hauler = first((eid) => hasComponent(world, Harvester, eid) && Owner.slot[eid] === 0);

    // A field far from home, with a finished Refinery beside it.
    const fieldX = Position.x[bastion]! + 2000;
    const fieldY = Position.y[bastion]!;
    const node = spawnResourceNode(world, fieldX, fieldY);
    const refinery = spawnStructure(world, {
      kind: StructureKind.Refinery,
      slot: 0,
      faction: Faction.Bathyarch,
      x: fieldX,
      y: fieldY + 200,
      prebuilt: true,
    });

    // Docked at the Bastion with a load, as after the first trip home.
    Position.x[hauler] = Position.x[bastion]!;
    Position.y[hauler] = Position.y[bastion]!;
    Position.depth[hauler] = Position.depth[bastion]!;
    Harvester.cargoKind[hauler] = ResourceKind.Nodule;
    Harvester.cargo[hauler] = 10;
    Harvester.nodeEid[hauler] = node;
    Harvester.mode[hauler] = HarvestMode.ToDepot;
    Harvester.depotEid[hauler] = bastion;

    const before = economyFor(world, 0).nodules;
    match.update(STEP_MS);
    // The positive control: the first load lands at the Bastion it is over.
    assert.ok(economyFor(world, 0).nodules > before, 'the Bastion delivery did not land');

    let hauledTo = 0;
    for (let i = 0; i < 300 * SIM.TICK_HZ && hauledTo === 0; i++) {
      match.update(STEP_MS);
      if (Harvester.mode[hauler] === HarvestMode.ToDepot) hauledTo = Harvester.depotEid[hauler]!;
    }
    assert.equal(hauledTo, refinery, 'the second load did not head for the Refinery');
  });
});
