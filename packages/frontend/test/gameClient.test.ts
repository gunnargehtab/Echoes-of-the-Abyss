/**
 * The message contract between this client and the match room (#487).
 *
 * `GameClient`'s whole job is translation — server messages into handler
 * calls, player intents into `room.send` — and neither direction had a test,
 * because reaching `attach` used to mean opening a WebSocket. A stub room
 * (test/support/colyseusStub.ts) is all it actually needs.
 *
 * What this protects is a class of bug nothing else here can see. A message
 * the server sends that this client silently drops, or an order sent under a
 * name the room does not listen for, produces no error anywhere: the socket
 * carries it, the room ignores it, and the player's click does nothing. The
 * last test in this file reads the room's own registrations out of
 * `packages/backend` and checks both directions against them, which is the
 * only assertion here that can catch a rename made on one side alone.
 *
 * That cross-package scan is a stopgap rather than the right answer. Per
 * CLAUDE.md, "if a constant would need to exist in two packages, it belongs in
 * shared" — these names are exactly that, and moving them into
 * `@echoes/shared` would turn this from a test into a type error. Doing that
 * is a change to both packages and belongs in its own PR.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  AiDifficulty,
  Faction,
  HarvestThrottle,
  MatchPhase,
  encodeEcho,
  StructureKind,
  UnitKind,
} from '@echoes/shared';
import './support/headless.ts';
import {
  installSessionStorage,
  StubClient,
  StubRoom,
  type SentMessage,
} from './support/colyseusStub.ts';
import {
  GameClient,
  hasStoredSession,
  storedMissionId,
  type ConnectionStatus,
  type GameClientHandlers,
} from '../src/net/GameClient.ts';
import { cannedMap, cannedSnapshot, cannedTerrain } from './support/cannedMatch.ts';

/** Everything the shell was told, in the order it was told. */
interface HandlerLog {
  calls: Array<{ name: string; args: unknown[] }>;
  names(): string[];
  argsOf(name: string): unknown[][];
  statuses(): ConnectionStatus[];
}

function recordingHandlers(): { handlers: GameClientHandlers; log: HandlerLog } {
  const calls: HandlerLog['calls'] = [];
  const handlers = new Proxy(
    {},
    {
      get:
        (_target, property) =>
        (...args: unknown[]): void => {
          calls.push({ name: String(property), args });
        },
    }
  ) as GameClientHandlers;
  return {
    handlers,
    log: {
      calls,
      names: () => calls.map((call) => call.name),
      argsOf: (name) => calls.filter((call) => call.name === name).map((call) => call.args),
      statuses: () =>
        calls
          .filter((call) => call.name === 'onStatus')
          .map((call) => call.args[0] as ConnectionStatus),
    },
  };
}

/**
 * Wait for a condition the client reaches on its own schedule.
 *
 * The reconnection backoff is a real timer, and a fixed sleep against it is a
 * race the runner gets to decide. Polling turns "wait long enough" into "wait
 * exactly as long as it takes", which is fast when it works and honest when it
 * does not.
 */
async function until(condition: () => boolean, what: string, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) assert.fail(`timed out waiting for: ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function connected(
  options: Parameters<GameClient['connect']>[0] = {}
): Promise<{ client: GameClient; room: StubRoom; net: StubClient; log: HandlerLog }> {
  const room = new StubRoom();
  const net = new StubClient(room);
  const { handlers, log } = recordingHandlers();
  const client = new GameClient(handlers, 'ws://test', net as unknown as never);
  await client.connect(options);
  return { client, room, net, log };
}

beforeEach(() => {
  installSessionStorage();
});

afterEach(() => {
  const g = globalThis as unknown as { window: Record<string, unknown> };
  delete g.window.sessionStorage;
});

/** Every intent, and the message the room is listening for. */
const ORDERS: Array<[string, (client: GameClient) => void, SentMessage]> = [
  [
    'chooseFaction',
    (c) => c.chooseFaction(Faction.Hadron),
    { type: 'faction', payload: { faction: Faction.Hadron } },
  ],
  ['setReady', (c) => c.setReady(true), { type: 'ready', payload: { ready: true } }],
  [
    'addAi',
    (c) => c.addAi(AiDifficulty.Veteran),
    { type: 'addAi', payload: { difficulty: AiDifficulty.Veteran } },
  ],
  ['removeAi', (c) => c.removeAi('seat-2'), { type: 'removeAi', payload: { sessionId: 'seat-2' } }],
  [
    'setAiDifficulty',
    (c) => c.setAiDifficulty('seat-2', AiDifficulty.Veteran),
    { type: 'aiDifficulty', payload: { sessionId: 'seat-2', difficulty: AiDifficulty.Veteran } },
  ],
  [
    'moveTo',
    (c) => c.moveTo([11], 100, 200, true),
    { type: 'move', payload: { unitIds: [11], x: 100, y: 200, queued: true } },
  ],
  [
    'attackMoveTo',
    (c) => c.attackMoveTo([11], 100, 200, false),
    { type: 'attackMove', payload: { unitIds: [11], x: 100, y: 200, queued: false } },
  ],
  ['stop', (c) => c.stop([11]), { type: 'stop', payload: { unitIds: [11] } }],
  [
    'setHoldPosition',
    (c) => c.setHoldPosition([11], true),
    { type: 'hold', payload: { unitIds: [11], active: true } },
  ],
  [
    'setRally',
    (c) => c.setRally([21], 300, 400),
    { type: 'rally', payload: { structureIds: [21], x: 300, y: 400 } },
  ],
  [
    'setSilentRunning',
    (c) => c.setSilentRunning([11], true),
    { type: 'silent', payload: { unitIds: [11], active: true } },
  ],
  [
    'setDepth',
    (c) => c.setDepth([11], 1800),
    { type: 'depth', payload: { unitIds: [11], depth: 1800 } },
  ],
  [
    'setFollowFloor',
    (c) => c.setFollowFloor([11], true),
    { type: 'followFloor', payload: { unitIds: [11], active: true } },
  ],
  ['activeSonar', (c) => c.activeSonar(11), { type: 'ping', payload: { unitId: 11 } }],
  ['commanderAbility', (c) => c.commanderAbility(), { type: 'ability', payload: {} }],
  [
    'launchTorpedo',
    (c) => c.launchTorpedo([11], 101),
    { type: 'torpedo', payload: { unitIds: [11], contactId: 101 } },
  ],
  [
    'deployNoisemaker',
    (c) => c.deployNoisemaker([11]),
    { type: 'noisemaker', payload: { unitIds: [11] } },
  ],
  ['layMine', (c) => c.layMine([11]), { type: 'mine', payload: { unitIds: [11] } }],
  [
    'dropDepthCharge',
    (c) => c.dropDepthCharge([11], 1200),
    { type: 'depthcharge', payload: { unitIds: [11], depth: 1200 } },
  ],
  [
    'attackContact',
    (c) => c.attackContact([11], 101, true),
    { type: 'attack', payload: { unitIds: [11], contactId: 101, queued: true } },
  ],
  [
    'harvest',
    (c) => c.harvest([13], 2, false),
    { type: 'harvest', payload: { unitIds: [13], nodeId: 2, queued: false } },
  ],
  [
    'setThrottle',
    (c) => c.setThrottle([13], HarvestThrottle.Trickle),
    { type: 'throttle', payload: { unitIds: [13], throttle: HarvestThrottle.Trickle } },
  ],
  [
    'build',
    (c) => c.build(StructureKind.Refinery, 500, 600),
    { type: 'build', payload: { kind: StructureKind.Refinery, x: 500, y: 600 } },
  ],
  [
    'produce',
    (c) => c.produce(21, UnitKind.Corvette),
    { type: 'produce', payload: { structureId: 21, kind: UnitKind.Corvette } },
  ],
];

describe('the match client: getting into a room', () => {
  it('takes the three doors in the documented order of specificity', async () => {
    // A room id names a room, and matchmaking cannot improve on that.
    const byId = await connected({ roomId: '  ABC123  ', name: 'Marr' });
    installSessionStorage();
    assert.equal(byId.net.callOf('joinById')?.target, 'ABC123', 'the code is trimmed');
    assert.deepEqual(byId.net.callOf('joinById')?.options, { name: 'Marr' });

    // `create` makes a room of its own rather than looking for one.
    const made = await connected({ create: 'private', mapId: 'smoke-basin' });
    const create = made.net.callOf('create');
    assert.equal(create?.target, 'match');
    assert.deepEqual(create?.options, {
      name: undefined,
      mapId: 'smoke-basin',
      missionId: '',
      private: true,
    });

    installSessionStorage();

    // Quick match keeps joinOrCreate: picking a map is picking a queue.
    const quick = await connected({ mapId: 'smoke-basin' });
    assert.equal(quick.net.callOf('joinOrCreate')?.target, 'match');
    assert.deepEqual(quick.net.callOf('joinOrCreate')?.options, {
      name: undefined,
      mapId: 'smoke-basin',
      missionId: '',
    });
  });

  it("sends '' for a skirmish rather than undefined — one matchmaking pool, not two", async () => {
    const skirmish = await connected({});
    const options = skirmish.net.callOf('joinOrCreate')?.options as { missionId?: unknown };
    assert.equal(options.missionId, '', 'Colyseus matches filter keys by equality');

    const mission = await connected({ missionId: 'prologue', spent: ['marr'] });
    assert.deepEqual(mission.net.callOf('joinOrCreate')?.options, {
      name: undefined,
      mapId: undefined,
      missionId: 'prologue',
      spent: ['marr'],
    });
  });

  it('only sends a roster to a mission room', async () => {
    const skirmish = await connected({ spent: ['marr'] });
    const options = skirmish.net.callOf('joinOrCreate')?.options as Record<string, unknown>;
    assert.equal('spent' in options, false, 'a skirmish has no roster to have spent');
  });

  it('redeems a held seat only for the room the caller asked for', async () => {
    // A first connection parks a token for the skirmish it joined.
    const first = await connected({});
    first.room.reconnectionToken = 'tok-skirmish';
    assert.equal(hasStoredSession(), true, 'the seat is held across a reload');
    assert.equal(storedMissionId(), '', 'and it knows it is a skirmish seat');

    // Asking for a mission must not redeem it: a token is opaque, so the
    // reconnect would succeed and hand back somebody else's water.
    const mission = await connected({ missionId: 'prologue' });
    assert.equal(mission.net.callOf('reconnect'), undefined, 'the mismatched seat was skipped');
    assert.ok(mission.net.callOf('joinOrCreate') !== undefined, 'and the ordinary door was used');
  });

  it('falls back to matchmaking when the held seat is gone', async () => {
    const first = await connected({});
    void first;

    const room = new StubRoom();
    const net = new StubClient(room);
    net.fail('reconnect');
    const { handlers, log } = recordingHandlers();
    const client = new GameClient(handlers, 'ws://test', net as unknown as never);
    await client.connect({});

    assert.ok(net.callOf('reconnect') !== undefined, 'the seat was tried');
    assert.ok(net.callOf('joinOrCreate') !== undefined, 'and the refusal cost one round trip');
    assert.deepEqual(log.statuses(), ['connecting', 'connected']);
  });

  it('redeems a held seat before creating, unless the caller abandons it first', async () => {
    // Worth pinning because it is surprising: `create` does not imply a fresh
    // match. A held seat for the same room kind is redeemed first, and the
    // shell's "Solo game" is only a new match because it passes `resume:
    // false`. A caller that forgets gets the old match back.
    await connected({});
    const greedy = await connected({ create: 'private' });
    assert.ok(greedy.net.callOf('reconnect') !== undefined, 'the held seat won');
    assert.equal(greedy.net.callOf('create'), undefined, 'and nothing was created');

    const fresh = await connected({ create: 'private', resume: false });
    assert.equal(fresh.net.callOf('reconnect'), undefined, 'resume:false abandons it');
    assert.ok(fresh.net.callOf('create') !== undefined, 'and a new room is made');
  });

  it('abandons the seat when the caller says this is a new match', async () => {
    await connected({});
    assert.equal(hasStoredSession(), true);

    const room = new StubRoom();
    const net = new StubClient(room);
    const { handlers } = recordingHandlers();
    await new GameClient(handlers, 'ws://test', net as unknown as never).connect({ resume: false });
    assert.equal(net.callOf('reconnect'), undefined, 'a solo game must not resurrect an old match');
  });

  it('reports a refused join as an error rather than throwing', async () => {
    const net = new StubClient();
    net.fail('joinOrCreate');
    const { handlers, log } = recordingHandlers();
    await new GameClient(handlers, 'ws://test', net as unknown as never).connect({});

    assert.deepEqual(log.statuses(), ['connecting', 'error']);
    assert.match(String(log.argsOf('onStatus').at(-1)?.[1]), /refused/);
  });
});

describe('the match client: what the room says', () => {
  it('lands every server message on its handler, payload intact', async () => {
    const { room, log } = await connected({});

    const terrain = cannedTerrain();
    const map = cannedMap();
    assert.ok(room.emit('terrain', terrain), 'terrain is handled');
    assert.ok(room.emit('map', map));
    assert.ok(room.emit('nodes', [{ id: 1 }]));
    assert.ok(room.emit('assigned', { slot: 0, faction: Faction.Bathyarch }));
    assert.ok(room.emit('gameOver', { winnerSlot: 0 }));
    assert.ok(room.emit('mission', { id: 'prologue' }));
    assert.ok(room.emit('missionLine', { text: 'Hold your depth.' }));
    assert.ok(room.emit('missionOver', { outcome: 0 }));

    assert.deepEqual(log.argsOf('onTerrain'), [[terrain]], 'handed over unchanged');
    assert.deepEqual(log.argsOf('onMap'), [[map]]);
    assert.deepEqual(log.argsOf('onNodes'), [[[{ id: 1 }]]]);
    assert.deepEqual(log.argsOf('onAssigned'), [[{ slot: 0, faction: Faction.Bathyarch }]]);
    assert.deepEqual(log.argsOf('onGameOver'), [[{ winnerSlot: 0 }]]);
    assert.deepEqual(log.argsOf('onMission'), [[{ id: 'prologue' }]]);
    assert.deepEqual(log.argsOf('onMissionLine'), [[{ text: 'Hold your depth.' }]]);
    assert.deepEqual(log.argsOf('onMissionOver'), [[{ outcome: 0 }]]);
  });

  it('normalises a ground delta with no cells to an empty list', async () => {
    const { room, log } = await connected({});
    room.emit('ground', { cells: [{ index: 3, floorM: 2900, ceilingM: 0, biome: 3 }] });
    room.emit('ground', {});
    assert.deepEqual(log.argsOf('onGround'), [
      [[{ index: 3, floorM: 2900, ceilingM: 0, biome: 3 }]],
      [[]],
    ]);
  });

  it('reconstructs the delta channel exactly, and refuses a patch with a gap', async () => {
    const { room, log } = await connected({});
    const first = cannedSnapshot(100);
    const second = cannedSnapshot(200);
    second.peakSig = 71;
    second.units = second.units.slice(1);
    const third = cannedSnapshot(300);

    // Encoded by the same function the room encodes with, so this is the real
    // wire format rather than a guess at it.
    room.emit('echo', encodeEcho(null, first, 0));
    assert.deepEqual(log.argsOf('onEcho').at(-1)?.[0], first, 'a keyframe is its own answer');

    room.emit('echo', encodeEcho(first, second, 1, false));
    assert.deepEqual(
      log.argsOf('onEcho').at(-1)?.[0],
      second,
      'and a patch rebuilds the snapshot the server actually had'
    );
    assert.equal(log.argsOf('onEcho').length, 2);

    // A patch against a snapshot this client never had is a gap, and a gap can
    // only be a bug. Nothing is guessed: it is dropped, and the picture on
    // screen stays the last one that was true.
    room.emit('echo', { ...encodeEcho(second, third, 9, false) });
    assert.equal(log.argsOf('onEcho').length, 2, 'the orphaned patch was dropped');

    room.emit('echo', encodeEcho(null, third, 10));
    assert.deepEqual(log.argsOf('onEcho').at(-1)?.[0], third, 'the next keyframe restored it');
  });

  it('starts a reconnection from a clean delta history', async () => {
    // A reconnection is a fresh client and the server sends it whole, so a
    // patch left over from the old socket must not be applied to the new one.
    const { room, net, log } = await connected({});
    room.emit('echo', encodeEcho(null, cannedSnapshot(100), 4));
    assert.equal(log.argsOf('onEcho').length, 1);

    room.drop();
    // Waited for rather than slept through: the backoff is 400 ms and a fixed
    // sleep would be a race the runner gets to decide. Polling for the retry
    // is the same assertion without the coin toss.
    await until(() => net.callOf('reconnect') !== undefined, 'the client retried the seat');
    assert.equal(log.statuses().includes('reconnecting'), true, 'and said so');

    // Seq 5 would follow the seq 4 above if the history had survived the
    // re-attach, and must not.
    room.emit('echo', encodeEcho(cannedSnapshot(100), cannedSnapshot(200), 5, false));
    assert.equal(log.argsOf('onEcho').length, 1, 'the stale patch found no history to apply to');
  });

  it('pushes the lobby on a real change and swallows the 5 Hz tick', async () => {
    const { room, log } = await connected({});
    const players = new Map([
      [
        'seat-1',
        {
          sessionId: 'seat-1',
          name: 'Marr',
          slot: 0,
          faction: Faction.Bathyarch,
          ready: false,
          connected: true,
          isAi: false,
          difficulty: 0,
        },
      ],
    ]);

    // `attach` pushes once on its own, so the room's phase is on screen before
    // the first state sync arrives.
    assert.equal(log.argsOf('onLobby').length, 1, 'joining is itself a lobby view');

    room.changeState({ phase: MatchPhase.Lobby, mapId: 'smoke-basin', winnerSlot: -1, players });
    assert.equal(log.argsOf('onLobby').length, 2, 'the roster went up');

    // The schema also carries `tick`, which moves five times a second. An
    // unfiltered onStateChange would re-render the lobby forever.
    room.changeState({ phase: MatchPhase.Lobby, mapId: 'smoke-basin', winnerSlot: -1, players });
    room.changeState({ phase: MatchPhase.Lobby, mapId: 'smoke-basin', winnerSlot: -1, players });
    assert.equal(log.argsOf('onLobby').length, 2, 'an unchanged view is not a change');

    room.changeState({ phase: MatchPhase.Playing, mapId: 'smoke-basin', winnerSlot: -1, players });
    assert.equal(log.argsOf('onLobby').length, 3, 'a real change is');
    const view = log.argsOf('onLobby').at(-1)?.[0] as { phase: MatchPhase; players: unknown[] };
    assert.equal(view.phase, MatchPhase.Playing);
    assert.equal(view.players.length, 1);
  });

  it('reports a room error as a readable status', async () => {
    const { room, log } = await connected({});
    room.raiseError(4212, 'room is locked');
    assert.equal(log.statuses().at(-1), 'error');
    assert.match(String(log.argsOf('onStatus').at(-1)?.[1]), /4212.*room is locked/);
  });

  it('exposes the seat and the room code the shell needs', async () => {
    const { client } = await connected({});
    assert.equal(client.sessionId, 'seat-1');
    assert.equal(client.roomId, 'room-1', 'the code a host hands somebody — ui-ux.md §14');
  });

  it('does not chase a seat the player deliberately left', async () => {
    const { client, room, log } = await connected({});
    client.disconnect();
    room.drop();
    assert.equal(
      log.statuses().includes('reconnecting'),
      false,
      'leaving is not the same event as being dropped'
    );
    assert.equal(room.left, true);
  });
});

describe('the match client: what the player asks for', () => {
  it('sends each intent under the name and shape the room reads', async () => {
    for (const [name, act, expected] of ORDERS) {
      const { client, room } = await connected({});
      act(client);
      assert.deepEqual(room.sent, [expected], `${name} sends one message, and this one`);
    }
  });

  it('sends nothing at all before there is a room', () => {
    const room = new StubRoom();
    const { handlers } = recordingHandlers();
    // Never connected: every intent must be a no-op rather than a throw. The
    // shell's buttons exist before the socket does.
    const client = new GameClient(handlers, 'ws://test', new StubClient(room) as unknown as never);
    for (const [, act] of ORDERS) act(client);
    assert.deepEqual(room.sent, [], 'an unconnected client is silent');
  });

  it('drops an order naming no units rather than sending an empty one', async () => {
    const { client, room } = await connected({});
    client.moveTo([], 100, 200);
    client.stop([]);
    client.attackContact([], 101);
    assert.deepEqual(room.sent, [], 'an order with no subject is not an order');
  });
});

describe('the match client: the contract with the room', () => {
  /**
   * The room's own registrations, read out of the backend source.
   *
   * A regex over another package is not how this should be checked forever —
   * see this file's header — but it is the only thing here that can catch a
   * rename made on one side alone, and that bug is silent in every other test.
   */
  function roomSource(): string {
    const here = fileURLToPath(new URL('.', import.meta.url));
    return readFileSync(`${here}../../backend/src/rooms/MatchRoom.ts`, 'utf8');
  }

  it('sends only messages the room is listening for', async () => {
    const source = roomSource();
    const listened = new Set([...source.matchAll(/onMessage\('([a-zA-Z]+)'/g)].map((m) => m[1]!));
    assert.ok(listened.size > 20, `found the room's registrations (${listened.size})`);

    // What the client *actually* puts on the wire, not what the table above
    // expects it to. Going through the real call closes the chain — client to
    // room — instead of checking the test's own expectation against the room
    // and leaving the client unexamined.
    for (const [name, act] of ORDERS) {
      const { client, room } = await connected({});
      act(client);
      for (const message of room.sent) {
        assert.ok(
          listened.has(message.type),
          `${name} sends '${message.type}', which MatchRoom does not listen for`
        );
      }
    }
  });

  it('handles every message the room sends', async () => {
    const source = roomSource();
    const spoken = new Set(
      [...source.matchAll(/(?:\.send|broadcast)\('([a-zA-Z]+)'/g)].map((m) => m[1]!)
    );
    assert.ok(spoken.size > 8, `found the room's outbound messages (${spoken.size})`);

    const { room } = await connected({});
    const handled = new Set(room.handled);
    for (const type of spoken) {
      assert.ok(handled.has(type), `MatchRoom sends '${type}', which this client would drop`);
    }
  });
});
