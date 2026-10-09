/**
 * What every spawn owes a recycled entity id (#1273): docs/invariants.md's "A spawn
 * writes every field of its component".
 *
 * `ordnanceSpawn.test.ts` holds the row for `spawnOrdnance`, where it was first
 * paid for (#617). The other spawns owed the same, and two were short:
 * `spawnUnit` left five fields to whatever last held the id and `spawnFauna`
 * two. The five were not idle bytes. A yard hull handed the id of a hull that
 * died following the floor came out of the yard still following it: it dived
 * unordered at the descent's SIG, with the dead hull's Lid exposure and both of
 * its order points.
 *
 * So the row is held here the way that file holds it, as a property of the
 * components rather than a list somebody has to remember to extend: every
 * component a spawn adds, over every kind it can be asked for, fails on the
 * next field to be missed.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasComponent, setRemovedRecycleThreshold } from 'bitecs';
import {
  DEPTH,
  Faction,
  FaunaSpecies,
  ResourceKind,
  SIM,
  StructureKind,
  UnitKind,
} from '@echoes/shared';
import * as components from '../src/sim/components.ts';
import {
  Acoustic,
  DepthOrder,
  Health,
  MoveOrder,
  Position,
  Posture,
  Pressure,
} from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import {
  createSimWorld,
  spawnEmitter,
  spawnFauna,
  spawnResourceNode,
  spawnStructure,
  spawnUnit,
  type SimWorld,
} from '../src/sim/world.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

/** bitecs' own default, restored after the one test that moves it. */
const BITECS_REUSE_THRESHOLD = 0.01;

type Store = Record<string, ArrayLike<number> & { fill(value: number): unknown }>;

/** Every component in components.ts, by name, as bitecs stores of typed arrays. */
const STORES = Object.entries(components as Record<string, unknown>).filter(
  (entry): entry is [string, Store] => {
    const fields = Object.values(entry[1] as object);
    return fields.length > 0 && fields.every((field) => ArrayBuffer.isView(field));
  }
);

/** What a typed array actually holds once `value` is written into it. */
function held(array: ArrayLike<number>, value: number): number {
  const one = new (array.constructor as new (length: number) => number[])(1);
  one[0] = value;
  return one[0]!;
}

/**
 * Spawn under two poisons and name every field still reading its poison.
 *
 * Two rather than one, the reason `ordnanceSpawn.test.ts` gives: a field that is
 * written reads the same value under both fills, so only a field reading
 * whatever it was poisoned with, both times, is evidence of a missed write.
 */
function missedFields(spawn: (world: SimWorld) => number): string[] {
  const readings = [199, 87].map((poison) => {
    for (const [, store] of STORES) for (const array of Object.values(store)) array.fill(poison);
    const world = createSimWorld(new Terrain(12000, 12000, 200), 1 / SIM.TICK_HZ, 3);
    const eid = spawn(world);
    const poisoned = new Set<string>();
    for (const [name, store] of STORES) {
      if (!hasComponent(world, store as never, eid)) continue;
      for (const [field, array] of Object.entries(store)) {
        if (array[eid] === held(array, poison)) poisoned.add(`${name}.${field}`);
      }
    }
    return poisoned;
  });
  // Back to what a fresh process holds, so the next spawn reads zeroes.
  for (const [, store] of STORES) for (const array of Object.values(store)) array.fill(0);
  return [...readings[0]!].filter((field) => readings[1]!.has(field));
}

const numbers = (values: object): number[] =>
  Object.values(values).filter((value): value is number => typeof value === 'number');

describe('a yard hull handed a dead hull’s id (#1273)', () => {
  it('leaves the dead hull’s floor, exposure and orders behind', () => {
    // The reproduction, with the real queue rather than a poisoned store, so it
    // runs first: nothing is removed in this process before the dead hull is.
    // Every id is held back while the scene is set, then the next spawn is
    // handed the newest removal, which is the dead hull's.
    setRemovedRecycleThreshold(1e9);
    try {
      const match = new Match(undefined, {
        fauna: false,
        seed: 7,
        terrain: new Terrain(12000, 12000, 250, { floorM: 900 }),
      });
      match.addPlayer(0, Faction.Bathyarch);
      match.addPlayer(1, Faction.Pelagia);
      const world = match.world;
      const corvette = { kind: UnitKind.Corvette, slot: 0, faction: Faction.Bathyarch } as const;
      const dead = spawnUnit(world, { ...corvette, x: 6000, y: 6000 });
      // An attack-move, then a click on the floor itself, which follows it
      // (docs/systems-depth.md §2), and a spell in the Lid's ledger.
      match.orderAttackMove(0, dead, 7000, 7000);
      match.orderMove(0, dead, 6300, 6300, false, world.terrain.floorAt(6300, 6300));
      Pressure.sourS[dead] = 25;
      for (let tick = 0; tick < 30; tick++) match.update(STEP_MS);
      assert.equal(DepthOrder.follow[dead], 1, 'the premise: the dead hull follows the floor');
      Health.hp[dead] = 0;
      match.update(STEP_MS);

      setRemovedRecycleThreshold(0);
      // A yard launch, as `productionSystem` makes one: a spawn and no order.
      const born = spawnUnit(world, { ...corvette, x: 5000, y: 5000 });
      assert.equal(born, dead, 'the premise: the yard hull is handed the dead hull’s id');
      setRemovedRecycleThreshold(BITECS_REUSE_THRESHOLD);

      assert.equal(DepthOrder.follow[born], 0, 'born following nothing');
      assert.equal(Pressure.sourS[born], 0, 'with none of the dead hull’s Lid exposure');
      assert.deepEqual([MoveOrder.x[born], MoveOrder.y[born]], [0, 0], 'nor its move point');
      assert.deepEqual([Posture.engageX[born], Posture.engageY[born]], [0, 0], 'nor its course');

      const launched = Position.depth[born]!;
      let loudest = 0;
      for (let tick = 0; tick < 10 * SIM.TICK_HZ; tick++) {
        match.update(STEP_MS);
        loudest = Math.max(loudest, Acoustic.sig[born]!);
      }
      assert.equal(Position.depth[born], launched, 'and, unordered, it keeps its depth');
      assert.ok(loudest < DEPTH.DESCENT_SIG, `it never blew ballast (SIG ${loudest})`);
    } finally {
      setRemovedRecycleThreshold(BITECS_REUSE_THRESHOLD);
    }
  });
});

describe('every spawn against a recycled id', () => {
  it('spawnUnit writes every field it adds, for every kind', () => {
    for (const kind of numbers(UnitKind)) {
      const missed = missedFields((world) =>
        spawnUnit(world, { kind, slot: 0, faction: Faction.Bathyarch, x: 3000, y: 3000 })
      );
      assert.deepEqual(missed, [], `spawnUnit(${UnitKind[kind]}) left ${missed.join(', ')}`);
    }
  });

  it('spawnStructure writes every field it adds, built or rising', () => {
    for (const kind of numbers(StructureKind)) {
      for (const prebuilt of [true, false]) {
        const missed = missedFields((world) =>
          spawnStructure(world, {
            kind,
            slot: 0,
            faction: Faction.Bathyarch,
            x: 3000,
            y: 3000,
            prebuilt,
          })
        );
        assert.deepEqual(
          missed,
          [],
          `spawnStructure(${StructureKind[kind]}, prebuilt ${prebuilt}) left ${missed.join(', ')}`
        );
      }
    }
  });

  it('spawnFauna writes every field it adds, for every species', () => {
    for (const species of numbers(FaunaSpecies)) {
      const missed = missedFields((world) => spawnFauna(world, { species, x: 3000, y: 3000 }));
      assert.deepEqual(
        missed,
        [],
        `spawnFauna(${FaunaSpecies[species]}) left ${missed.join(', ')}`
      );
    }
  });

  it('spawnEmitter and spawnResourceNode write every field they add', () => {
    const emitter = missedFields((world) =>
      spawnEmitter(world, {
        slot: 2,
        faction: Faction.Bathyarch,
        x: 3000,
        y: 3000,
        depth: 900,
        sig: 60,
        periodTicks: 120,
        onTicks: 30,
        hp: 400,
      })
    );
    assert.deepEqual(emitter, [], `spawnEmitter left ${emitter.join(', ')}`);
    for (const kind of numbers(ResourceKind)) {
      const node = missedFields((world) => spawnResourceNode(world, 3000, 3000, 500, kind));
      assert.deepEqual(
        node,
        [],
        `spawnResourceNode(${ResourceKind[kind]}) left ${node.join(', ')}`
      );
    }
  });
});
