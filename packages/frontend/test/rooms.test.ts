/**
 * The match browser's two rules (#193) — docs/tech-stack.md, "Finding a match".
 *
 * Both fail silently when they fail, which is why they are pure functions with
 * a test rather than three lines inside a JSX callback:
 *
 * - Invert the door rule by one keystroke and solo games become joinable by
 *   strangers. Nothing throws, nothing looks wrong, and the first anyone hears
 *   of it is somebody else's fleet appearing in a game they started alone.
 * - Trust a room's metadata to be there and the browser draws rows that cannot
 *   say which water they are on, then sends players at them.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { doorFor, toListings, type AvailableRoom, type SetupMode } from '../src/net/rooms.ts';

describe('which door a match is opened through', () => {
  it('never lets a solo game be found by anyone else', () => {
    // The rule this whole issue exists for. Until private rooms, Solo shared
    // `joinOrCreate` with multiplayer, so choosing Solo could drop you into a
    // stranger's lobby on the same water and a stranger into yours.
    // `listed` is not a question solo is asked, so both answers must agree.
    for (const listed of [true, false]) {
      assert.deepEqual(doorFor('solo', listed), { create: 'private' }, `listed=${listed}`);
    }
  });

  it('lets a host decide, and defaults toward being found', () => {
    assert.deepEqual(doorFor('host', true), { create: 'public' });
    assert.deepEqual(doorFor('host', false), { create: 'private' });
  });

  it('creates nothing for a quick match', () => {
    // Looking for a room and opening one are opposite requests. A quick match
    // that created a room would put the player in an empty lobby and call it
    // matchmaking.
    for (const listed of [true, false]) {
      assert.deepEqual(doorFor('quick', listed), {}, `listed=${listed}`);
    }
  });

  it('answers for every mode there is', () => {
    const modes: SetupMode[] = ['solo', 'host', 'quick'];
    for (const mode of modes) {
      const door = doorFor(mode, true);
      assert.ok(
        door.create === undefined || door.create === 'public' || door.create === 'private',
        `${mode} produced ${String(door.create)}`
      );
    }
  });
});

describe('turning the matchmaker’s answer into rows', () => {
  const good: AvailableRoom = {
    roomId: 'abc123',
    metadata: { mapId: 'ventfront-divide', mapName: 'The Ventfront Divide', seats: 4, filled: 1 },
  };

  it('keeps a complete listing intact', () => {
    assert.deepEqual(toListings([good]), [
      {
        roomId: 'abc123',
        mapId: 'ventfront-divide',
        mapName: 'The Ventfront Divide',
        seats: 4,
        filled: 1,
      },
    ]);
  });

  it('drops a room that cannot say where it is', () => {
    // Guessed-at rows are worse than absent ones: this is a game where finding
    // out costs something, and a row that made the player click to learn which
    // water it was on would be charging them for the browser's uncertainty.
    const broken: AvailableRoom[] = [
      { roomId: 'a' },
      { roomId: 'b', metadata: {} },
      { roomId: 'c', metadata: { mapId: 'x', seats: 4, filled: 0 } },
      { roomId: 'd', metadata: { mapId: 'x', mapName: 'X', filled: 0 } },
      { roomId: 'e', metadata: { mapId: 'x', mapName: 'X', seats: 4 } },
    ];
    assert.deepEqual(toListings(broken), []);
    // …and one good row among bad ones still gets through.
    assert.equal(toListings([...broken, good]).length, 1);
  });

  it('clamps a count it cannot render', () => {
    // These arrive from another process. "-1 / 4 commanders" is not a thing a
    // browser whose whole job is being readable at a glance may print.
    const [row] = toListings([
      { roomId: 'z', metadata: { mapId: 'x', mapName: 'X', seats: 4, filled: -3 } },
    ]);
    assert.equal(row?.filled, 0);

    const [over] = toListings([
      { roomId: 'z', metadata: { mapId: 'x', mapName: 'X', seats: 4, filled: 99 } },
    ]);
    assert.equal(over?.filled, 4, 'a room cannot hold more commanders than it has chairs');
  });

  it('carries nothing a listing is not allowed to carry', () => {
    // The hidden-information rule, enforced on the way in rather than trusted
    // on the way out: a future server that put commander names or factions in
    // its metadata would not get them onto a row through this function.
    const [row] = toListings([
      {
        roomId: 'z',
        metadata: {
          mapId: 'x',
          mapName: 'X',
          seats: 4,
          filled: 2,
          // Not part of MatchListingMetadata, and must not survive the mapping.
          ...({ players: ['Ahab'], factions: [0, 1] } as object),
        },
      },
    ]);
    assert.deepEqual(Object.keys(row ?? {}).sort(), [
      'filled',
      'mapId',
      'mapName',
      'roomId',
      'seats',
    ]);
  });
});
