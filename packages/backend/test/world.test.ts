/**
 * The `maxEid` invariant.
 *
 * bitecs sizes every component store to the world's capacity at creation, so
 * `Owner.slot.length` is 100,000 for the life of a match no matter how few
 * hulls are in the water. Several passes in `Match` walk entity ids ascending
 * rather than through a query — the right call for a small, per-slot filtered
 * read — and they are bounded by `world.maxEid` so they stop at the entities
 * that exist instead of scanning the whole store.
 *
 * That bound is only correct while every spawn path registers its entity. The
 * failure mode if one does not is silent rather than loud: the entity is fully
 * alive, it simply sits above the bound where the Drift and the Echo pass never
 * look at it. So this asserts the invariant directly against whatever entities
 * the world actually contains, which keeps it honest as spawn paths are added.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Faction, FaunaSpecies, OrdnanceKind, StructureKind, UnitKind } from '@echoes/shared';
import { getAllEntities } from 'bitecs';
import { Match } from '../src/sim/match.ts';
import {
  spawnFauna,
  spawnOrdnance,
  spawnResourceNode,
  spawnStructure,
  spawnUnit,
} from '../src/sim/world.ts';

describe('entity id high-water mark', () => {
  it('covers every entity the starting layout puts in the water', () => {
    const match = new Match();
    const live = getAllEntities(match.world) as number[];

    assert.ok(live.length > 0, 'a fresh match should have entities');
    for (const eid of live) {
      assert.ok(
        eid <= match.world.maxEid,
        `eid ${eid} is above maxEid ${match.world.maxEid} — a spawn path did not register it`
      );
    }
  });

  it('covers entities from every spawn path, including ones added mid-match', () => {
    const match = new Match();
    const world = match.world;

    spawnUnit(world, {
      kind: UnitKind.LightScout,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 900,
      y: 900,
    });
    spawnStructure(world, {
      kind: StructureKind.Refinery,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 1000,
      y: 1000,
    });
    spawnOrdnance(world, {
      kind: OrdnanceKind.Torpedo,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 1100,
      y: 1100,
      depth: 200,
      pressureRating: 600,
    });
    spawnResourceNode(world, 1200, 1200);
    spawnFauna(world, { species: FaunaSpecies.Draymaw, x: 1300, y: 1300 });

    for (const eid of getAllEntities(world) as number[]) {
      assert.ok(
        eid <= world.maxEid,
        `eid ${eid} is above maxEid ${world.maxEid} — a spawn path did not register it`
      );
    }
  });

  it('never decreases, so a recycled id after a death stays covered', () => {
    const match = new Match();
    const before = match.world.maxEid;
    for (let i = 0; i < 120; i++) match.update(1000 / 60);
    assert.ok(match.world.maxEid >= before, 'maxEid must be monotonic');
  });
});
