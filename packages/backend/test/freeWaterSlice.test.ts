import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CLIENT_MSG,
  Faction,
  FREE_WATER_DUEL_MAP_ID,
  FREE_WATER_MAP_ID,
  MAP_HEADERS,
  MatchPhase,
  SIM,
  StructureKind,
  UnitKind,
} from '@echoes/shared';
import type { Client } from '@colyseus/core';
import { FREE_WATER_DUEL, FREE_WATER_SLICE, freeWaterMap } from '../src/sim/maps/freeWaterSlice.ts';
import { mapById, missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import { Pathfinder } from '../src/sim/pathfinding.ts';
import { Match } from '../src/sim/match.ts';
import { bootRoom, deliver, fakeClient, shutdown } from './support/room.ts';

describe('free-water fixture contract', () => {
  it('paints the documented water intervals and both route choices', () => {
    const terrain = terrainFor(FREE_WATER_SLICE);
    for (const [x, y, floor, ceiling] of [
      [625, 1875, 600, 0],
      [1125, 1125, 400, 0],
      [2125, 1125, 400, 0],
      [3125, 1125, 600, 0],
      [2125, 2125, 2400, 0],
      [2125, 2875, 2400, 0],
      [2125, 3125, 1500, 800],
      [2125, 3625, 1500, 0],
      [1125, 3125, 200, 3000],
    ]) {
      assert.equal(terrain.floorAt(x!, y!), floor);
      assert.equal(terrain.ceilingAt(x!, y!), ceiling);
    }
    const path = new Pathfinder(16, 16);
    const out: number[] = [];
    for (const [x0, y0, x1, y1, depth] of [
      [625, 1875, 1125, 1125, 300],
      [1125, 1125, 3125, 1125, 300],
      [625, 1875, 875, 2875, 300],
      [875, 2875, 875, 3625, 300],
      [875, 3625, 2125, 3625, 300],
      [2125, 2125, 2125, 2875, 1000],
      [2125, 2875, 2125, 3125, 1000],
      [2125, 3125, 2125, 3625, 1000],
    ])
      assert.ok(path.findPath(terrain, x0!, y0!, x1!, y1!, depth!, out));
    assert.equal(terrain.admitsCell(8, 12, 300), false);
    assert.equal(terrain.admitsCell(8, 12, 1000), true);
    assert.equal(path.findPath(terrain, 2125, 2875, 2125, 3125, 300, out), false);
  });

  it('seats exactly the authored fleet and keeps a direct dive on its existing course', () => {
    const match = new Match(FREE_WATER_SLICE, { fauna: false, seed: 1713 });
    try {
      match.addPlayer(0, Faction.Pelagia);
      let next = match.update(1000 / SIM.TICK_HZ);
      while (next === null) next = match.update(1000 / SIM.TICK_HZ);
      let snapshot = next.get(0)!;
      assert.equal(snapshot.structures.length, 0);
      assert.equal(snapshot.units.length, 3);
      assert.equal(snapshot.jellies.length + snapshot.shoals.length, 0);
      const scout = snapshot.units.find((u) => u.kind === UnitKind.LightScout)!;
      const corvette = snapshot.units.find((u) => u.kind === UnitKind.Corvette)!;
      const harvester = snapshot.units.find((u) => u.kind === UnitKind.Harvester)!;
      assert.deepEqual([scout.x, scout.y, scout.depth], [625, 1875, 300]);
      assert.deepEqual([corvette.x, corvette.y, corvette.depth], [625, 2125, 300]);
      assert.deepEqual([harvester.x, harvester.y, harvester.depth], [375, 1875, 300]);
      match.orderMoves(0, [corvette.id], 2125, 2125, false, 300, true);
      for (let i = 0; i < 10 * SIM.TICK_HZ; i++) match.update(1000 / SIM.TICK_HZ);
      match.offsetDepth(0, corvette.id, 150);
      for (let i = 0; i < SIM.TICK_HZ; i++) {
        const next = match.update(1000 / SIM.TICK_HZ);
        if (next !== null) snapshot = next.get(0)!;
      }
      const moving = snapshot.units.find((u) => u.id === corvette.id)!;
      assert.ok(moving.x > corvette.x && moving.x < 2125, 'still on the horizontal course');
      assert.ok(moving.depth > 300, 'genuine on-course descent');
      assert.equal(snapshot.units.find((u) => u.id === scout.id)!.depth, 300);
    } finally {
      match.dispose();
    }
  });

  it('keeps the fixture out of production catalogues and refuses a production request', () => {
    assert.equal(mapById(FREE_WATER_MAP_ID), undefined);
    assert.equal(missionMapById(FREE_WATER_MAP_ID), undefined);
    assert.ok(!MAP_HEADERS.some((map) => map.id === FREE_WATER_MAP_ID));
    assert.throws(() => freeWaterMap(FREE_WATER_MAP_ID, 'production'), /only in development/);
    assert.equal(freeWaterMap(FREE_WATER_MAP_ID, 'development'), FREE_WATER_SLICE);
  });

  it('starts a private one-seat study as Pelagia without offering a faction or AI lobby', async () => {
    const room = await bootRoom({ mapId: FREE_WATER_MAP_ID });
    try {
      const client = fakeClient('study');
      room.onJoin(client as unknown as Client);
      assert.equal(room.state.phase, MatchPhase.Playing);
      assert.equal(room.maxClients, 1);
      assert.equal(room.state.players.get('study')!.faction, Faction.Pelagia);
      assert.equal(room.state.mapId, FREE_WATER_MAP_ID);
    } finally {
      await shutdown(room);
    }
  });
});

describe('free-water duel (docs/free-water-slice.md §9, #1754)', () => {
  it('seats each player on a floor Bastion with its own fleet on its rim', () => {
    const match = new Match(FREE_WATER_DUEL, { fauna: false, seed: 1754 });
    try {
      assert.equal(match.world.volumetric, true);
      match.addPlayer(0, Faction.Pelagia);
      match.addPlayer(1, Faction.Hadron);
      let next = match.update(1000 / SIM.TICK_HZ);
      while (next === null) next = match.update(1000 / SIM.TICK_HZ);
      const frames = next;
      for (const [slot, rimX, bastionX] of [
        [0, 625, 1250],
        [1, 3875, 3250],
      ] as const) {
        const own = frames.get(slot)!;
        assert.deepEqual(
          own.units.map((u) => [u.kind, u.x, u.depth]).sort(),
          [
            [UnitKind.LightScout, rimX, 300],
            [UnitKind.Corvette, rimX, 300],
            [UnitKind.Cruiser, rimX, 300],
            [UnitKind.AbyssalSubmersible, rimX, 300],
          ].sort()
        );
        assert.equal(own.structures.length, 1);
        const bastion = own.structures[0]!;
        assert.equal(bastion.kind, StructureKind.Bastion);
        assert.deepEqual([bastion.x, bastion.y, bastion.depth], [bastionX, 2250, 1500]);
      }
    } finally {
      match.dispose();
    }
  });

  it('is development-only, out of every catalogue, like the study', () => {
    assert.equal(mapById(FREE_WATER_DUEL_MAP_ID), undefined);
    assert.ok(!MAP_HEADERS.some((map) => map.id === FREE_WATER_DUEL_MAP_ID));
    assert.throws(() => freeWaterMap(FREE_WATER_DUEL_MAP_ID, 'production'), /only in development/);
    assert.equal(freeWaterMap(FREE_WATER_DUEL_MAP_ID, 'development'), FREE_WATER_DUEL);
  });

  it('opens a private two-seat lobby that refuses AI and starts with both seats ready', async () => {
    const room = await bootRoom({ mapId: FREE_WATER_DUEL_MAP_ID });
    try {
      assert.equal(room.maxClients, 2);
      const first = fakeClient('first');
      room.onJoin(first as unknown as Client);
      assert.equal(room.state.phase, MatchPhase.Lobby, "a lobby, not the study's straight start");
      deliver(room, CLIENT_MSG.addAi, first, {});
      assert.equal(room.state.players.size, 1, 'no AI seat');
      deliver(room, CLIENT_MSG.ready, first, { ready: true });
      assert.equal(room.state.phase, MatchPhase.Lobby, 'one commander does not start it');
      const second = fakeClient('second');
      room.onJoin(second as unknown as Client);
      deliver(room, CLIENT_MSG.ready, second, { ready: true });
      assert.equal(room.state.phase, MatchPhase.Playing);
      assert.equal(room.state.mapId, FREE_WATER_DUEL_MAP_ID);
    } finally {
      await shutdown(room);
    }
  });
});
