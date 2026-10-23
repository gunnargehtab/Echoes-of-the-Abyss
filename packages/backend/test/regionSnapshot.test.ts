/**
 * The room names the region its ground stands in — docs/world-map.md §7.1
 * (#1460).
 *
 * The continuous world draws a placed mission's live ground inside its region,
 * and the client must never be the one choosing where a room's ground goes.
 * So the room says so, on the ground's own message: these hold that the
 * prologue names Sorrowgate at join and again on a reconnection after its
 * ground has changed, with writes that replay to the live cells and the live
 * revision, and that every other room — Radicals on the same map included —
 * names nothing.
 */

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { Client } from '@colyseus/core';
import {
  PROLOGUE_SORROWGATE_HEADER,
  SEEDING_RADICALS_HEADER,
  SERVER_MSG,
  SORROWGATE_REGION,
  type TerrainMessage,
} from '@echoes/shared';

import type { MatchRoom } from '../src/rooms/MatchRoom.ts';
import type { Terrain } from '../src/sim/terrain.ts';
import { bootRoom, fakeClient, internals, shutdown, type FakeClient } from './support/room.ts';

const rooms: MatchRoom[] = [];

async function room(options: Parameters<MatchRoom['onCreate']>[0]): Promise<MatchRoom> {
  const booted = await bootRoom(options);
  rooms.push(booted);
  return booted;
}

afterEach(async () => {
  for (const booted of rooms.splice(0)) await shutdown(booted);
});

/** The last `terrain` a client was sent. */
function lastTerrain(client: FakeClient): TerrainMessage {
  const sent = client.sent.filter((message) => message.type === SERVER_MSG.terrain);
  assert.ok(sent.length > 0, 'no terrain was sent');
  return sent.at(-1)!.payload as TerrainMessage;
}

/** The room's live ground, as a beat writes it. */
const liveGround = (booted: MatchRoom): Terrain =>
  (internals(booted).match as unknown as { world: { terrain: Terrain } }).world.terrain;

describe('the region a room names (#1460)', () => {
  it("names Sorrowgate on the prologue's ground at join", async () => {
    const prologue = await room({ missionId: PROLOGUE_SORROWGATE_HEADER.id });
    const client = fakeClient('pilot');
    prologue.onJoin(client as unknown as Client);
    const terrain = lastTerrain(client);
    assert.equal(terrain.region, SORROWGATE_REGION.id);
    assert.equal(terrain.cols * terrain.cellM, SORROWGATE_REGION.widthM, 'the region is this map');
    assert.equal(terrain.rows * terrain.cellM, SORROWGATE_REGION.heightM);
  });

  it('names it again on a reconnection, with the ground as it now is', async () => {
    const prologue = await room({ missionId: PROLOGUE_SORROWGATE_HEADER.id });
    const client = fakeClient('pilot');
    prologue.onJoin(client as unknown as Client);
    const joined = lastTerrain(client);

    // The arch's row, gone to rock, through the same write a beat makes.
    const ground = liveGround(prologue);
    ground.fillGround(0, 2_000, 5_000, 250, { floorM: 1_000, ceilingM: 1_001 });
    assert.ok(ground.revision > joined.revision, 'the write moved the ground');

    // The seat redeemed. Its drop is left out: all it does that matters here
    // is open a 90 s grace timer, and what is under test is what the room
    // sends the client that comes back.
    prologue.onReconnect(client as unknown as Client);
    const back = lastTerrain(client);
    assert.equal(back.region, SORROWGATE_REGION.id);
    assert.equal(back.revision, ground.revision, "the client's cursor is the live one");
    // The opening ground and its writes (#1496), which replay to the live cells.
    assert.deepEqual(back.floor, joined.floor, 'the ground the match opened on');
    const replayed = [...back.floor];
    for (const cell of back.changes ?? []) replayed[cell.index] = cell.floorM;
    const archRow = 8 * back.cols;
    for (let col = 0; col < back.cols; col++) {
      assert.equal(replayed[archRow + col], 1_000, `column ${col} replays to the live cell`);
      assert.notEqual(joined.floor[archRow + col], 1_000, 'and was not at join');
    }
  });

  it('names nothing for Radicals, though it plays on the same map', async () => {
    assert.equal(SEEDING_RADICALS_HEADER.mapId, SORROWGATE_REGION.mapId);
    const radicals = await room({ missionId: SEEDING_RADICALS_HEADER.id });
    const client = fakeClient('escort');
    radicals.onJoin(client as unknown as Client);
    assert.equal('region' in lastTerrain(client), false);
  });

  it('names nothing for a skirmish, its terrain the shape it always was', async () => {
    const skirmish = await room({});
    const client = fakeClient('one');
    skirmish.onJoin(client as unknown as Client);
    const terrain = lastTerrain(client);
    assert.deepEqual(Object.keys(terrain).sort(), [
      'biomes',
      'ceiling',
      'cellM',
      'cols',
      'floor',
      'revision',
      'rows',
    ]);
  });
});

describe('the order a room names its ground in (#1573)', () => {
  // The client bakes the ground the moment it lands, and the bake's stone
  // scours trail away from the current source the map's id names
  // (docs/art-direction.md "Silt detail and seated stones — SPEC").
  it('sends the map before the terrain', async () => {
    const skirmish = await room({});
    const client = fakeClient('pilot');
    skirmish.onJoin(client as unknown as Client);
    const order = client.sent.map((message) => message.type);
    const map = order.indexOf(SERVER_MSG.map);
    assert.ok(map >= 0, 'no map was sent');
    assert.ok(map < order.indexOf(SERVER_MSG.terrain), `sent in the order ${order.join(', ')}`);
  });
});
