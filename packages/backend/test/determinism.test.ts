/**
 * Determinism and replay.
 *
 * The simulation has always been *written* to be deterministic — fixed steps,
 * no wall-clock in the step path, hand-placed terrain chosen over a seeded
 * generator. Nothing checked it, which meant the property was one PR away
 * from being lost silently. These tests are that check.
 *
 * The last test in the file is the one that matters most: it deliberately
 * breaks a replay and asserts the machinery notices. A determinism test that
 * cannot fail is worse than no determinism test, because it reads like
 * evidence.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Faction,
  HarvestThrottle,
  ResolutionTier,
  SIM,
  StructureKind,
  UnitKind,
} from '@echoes/shared';
import { hasComponent } from 'bitecs';
import { Match } from '../src/sim/match.ts';
import { Owner, Structure, Unit } from '../src/sim/components.ts';
import type { SimWorld } from '../src/sim/world.ts';
import { Rng } from '../src/sim/rng.ts';
import { hashWorld } from '../src/sim/stateHash.ts';
import { playReplay, type Replay } from '../src/sim/replay.ts';

const SEED = 0x5eed;

/**
 * A scripted match: the same commands at the same ticks, every time.
 *
 * Deliberately varied — movement, economy, construction, production, the
 * acoustic toggles and a depth order — so that a divergence anywhere in the
 * system has a route into the hash.
 */
function runScripted(match: Match, ticks: number): void {
  matchWorld = match.world;
  const orders: Array<[number, (m: Match) => void]> = [
    [10, (m) => m.orderMove(0, firstUnit(m, 0), 3000, 3000)],
    [10, (m) => m.setThrottle(0, firstHarvester(m, 0), HarvestThrottle.Overburden)],
    [30, (m) => m.orderDepth(0, firstUnit(m, 0), 1400)],
    [45, (m) => m.activeSonar(0, firstUnit(m, 0))],
    [60, (m) => m.setSilentRunning(1, firstUnit(m, 1), true)],
    [75, (m) => m.orderMove(1, firstUnit(m, 1), 4200, 4200)],
    [90, (m) => m.build(0, StructureKind.Refinery, 2000, 1100)],
    [120, (m) => m.produce(0, firstFoundry(m, 0), UnitKind.Corvette)],
    [150, (m) => m.orderDepth(1, firstUnit(m, 1), 300)],
    [200, (m) => m.produce(0, firstFoundry(m, 0), UnitKind.LightScout)],
  ];

  for (let tick = 0; tick < ticks; tick++) {
    for (const [at, order] of orders) {
      if (at === tick) order(match);
    }
    match.stepOnce();
  }
}

/**
 * Script helpers, reading the ECS directly.
 *
 * Deliberate: they exist to drive a fixed script, not to model what a
 * commander can see, so routing them through a fogged snapshot would add
 * uncertainty for no benefit. Entity ids are stable for a given seed, which
 * is the property under test.
 */
function ownedUnit(slot: number, predicate: (kind: UnitKind) => boolean): number {
  for (let eid = 0; eid < Owner.slot.length; eid++) {
    if (Owner.slot[eid] !== slot) continue;
    if (!hasComponent(matchWorld!, Unit, eid)) continue;
    if (predicate(Unit.kind[eid] as UnitKind)) return eid;
  }
  return 0;
}

/** Set by runScripted so the helpers can reach the world under test. */
let matchWorld: SimWorld | null = null;

function firstUnit(_match: Match, slot: number): number {
  return ownedUnit(slot, (kind) => kind !== UnitKind.Harvester);
}

function firstHarvester(_match: Match, slot: number): number {
  return ownedUnit(slot, (kind) => kind === UnitKind.Harvester);
}

function firstFoundry(_match: Match, slot: number): number {
  for (let eid = 0; eid < Owner.slot.length; eid++) {
    if (Owner.slot[eid] !== slot) continue;
    if (!hasComponent(matchWorld!, Structure, eid)) continue;
    if (Structure.kind[eid] === StructureKind.Foundry) return eid;
  }
  return 0;
}

function twoPlayers(match: Match): Match {
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, Faction.Pelagia);
  return match;
}

describe('seeded RNG', () => {
  it('produces the same stream from the same seed, and a different one otherwise', () => {
    const a = new Rng(1234);
    const b = new Rng(1234);
    const c = new Rng(1235);

    const drawA = Array.from({ length: 32 }, () => a.next());
    const drawB = Array.from({ length: 32 }, () => b.next());
    const drawC = Array.from({ length: 32 }, () => c.next());

    assert.deepEqual(drawA, drawB, 'one seed, one stream');
    assert.notDeepEqual(drawA, drawC, 'a different seed must not shadow the first');
    assert.ok(
      drawA.every((v) => v >= 0 && v < 1),
      'draws stay in [0, 1)'
    );
  });

  it('forks named sub-streams that do not disturb each other', () => {
    const root = new Rng(99);
    const fauna = root.fork('fauna');
    const hazards = root.fork('hazards');

    // The point of forking: adding a draw to one subsystem must not shift
    // every subsequent draw in another and invalidate recorded replays.
    const faunaFirst = Array.from({ length: 8 }, () => fauna.next());
    const hazardsFirst = Array.from({ length: 8 }, () => hazards.next());
    assert.notDeepEqual(faunaFirst, hazardsFirst, 'named streams are independent');

    const again = new Rng(99).fork('fauna');
    assert.deepEqual(
      Array.from({ length: 8 }, () => again.next()),
      faunaFirst,
      'and each fork is itself reproducible'
    );
  });

  it('restores an exact stream position', () => {
    const rng = new Rng(7);
    rng.next();
    rng.next();
    const mark = rng.snapshot();
    const expected = [rng.next(), rng.next(), rng.next()];

    rng.restore(mark);
    assert.deepEqual([rng.next(), rng.next(), rng.next()], expected);
  });
});

describe('determinism', () => {
  it('runs the same match twice from one seed', () => {
    const first = twoPlayers(new Match(undefined, { fauna: false, seed: SEED }));
    const second = twoPlayers(new Match(undefined, { fauna: false, seed: SEED }));

    runScripted(first, 400);
    runScripted(second, 400);

    assert.equal(
      hashWorld(first.world),
      hashWorld(second.world),
      'identical seed and commands must produce an identical world'
    );
  });

  it('notices when the two runs are not the same match', () => {
    // The guard on the test above: if hashWorld ignored the thing that
    // changed, the equality assertion would pass for the wrong reason.
    const first = twoPlayers(new Match(undefined, { fauna: false, seed: SEED }));
    const second = twoPlayers(new Match(undefined, { fauna: false, seed: SEED }));

    runScripted(first, 400);
    runScripted(second, 400);
    // One extra order in the second run, and nothing else different.
    second.orderMove(0, firstUnit(second, 0), 100, 100);
    for (let i = 0; i < 60; i++) second.stepOnce();
    for (let i = 0; i < 60; i++) first.stepOnce();

    assert.notEqual(
      hashWorld(first.world),
      hashWorld(second.world),
      'the hash must be sensitive to the commands actually issued'
    );
  });

  it('is not sensitive to how wall-clock is chopped into steps', () => {
    const steady = twoPlayers(new Match(undefined, { fauna: false, seed: SEED }));
    const jerky = twoPlayers(new Match(undefined, { fauna: false, seed: SEED }));

    const stepMs = 1000 / SIM.TICK_HZ;
    for (let i = 0; i < 300; i++) steady.update(stepMs);
    // The same simulated time, delivered in lumpy real-world updates.
    for (let i = 0; i < 60; i++) jerky.update(stepMs * 5);

    assert.equal(steady.tick, jerky.tick, 'both consumed the same simulated time');
    assert.equal(
      hashWorld(steady.world),
      hashWorld(jerky.world),
      'a laggy server must not produce a different match'
    );
  });
});

describe('the Tier-2 blur is stable across matches', () => {
  it('blurs the same contact to the same place in two identical matches', () => {
    // bitecs allocates entity ids from a counter global to the *process*, so
    // the second match in a test run holds identical values under different
    // ids. Anything keyed on a raw entity id therefore differs between two
    // runs of the same seed — the trap this file's header already describes
    // for the state hash and for replays.
    //
    // The blur was the third instance and the last to be found, because it
    // took an actor that *reads* a blurred position to expose it. A human
    // client draws the blob and never acts on it, so nothing diverged; the
    // skirmish AI walks an army to it, and two runs of one seed ended thirty-
    // nine ticks apart. The balance harness caught it.
    const positions = [0, 1].map(() => {
      const match = twoPlayers(new Match(undefined, { fauna: false, seed: SEED }));
      matchWorld = match.world;
      // Walk both forces at the middle of the map so somebody resolves at
      // Bearing: the spawns are kilometres apart and nothing is audible from
      // there, which is the whole point of the map.
      const centre = { x: match.map.widthM / 2, y: match.map.heightM / 2 };
      for (let eid = 0; eid < Owner.slot.length; eid++) {
        if (!hasComponent(match.world, Unit, eid)) continue;
        const slot = Owner.slot[eid]!;
        if (slot !== 0 && slot !== 1) continue;
        match.orderMove(slot, eid, centre.x, centre.y);
      }

      const contacts: string[] = [];
      for (let tick = 0; tick < 120 * SIM.TICK_HZ; tick++) {
        const snapshots = match.update(1000 / SIM.TICK_HZ);
        if (snapshots === null) continue;
        for (const [slot, snapshot] of snapshots) {
          for (const contact of snapshot.contacts) {
            if (contact.tier !== ResolutionTier.Bearing) continue;
            contacts.push(`${slot}:${contact.x.toFixed(3)},${contact.y.toFixed(3)}`);
          }
        }
      }
      return contacts;
    });

    assert.ok(positions[0]!.length > 0, 'the scenario has to produce a Tier-2 contact at all');
    assert.deepEqual(positions[0], positions[1], 'the same seed must blur to the same place');
  });
});

describe('replay', () => {
  function record(ticks: number): { replay: Replay; hash: number } {
    const match = twoPlayers(new Match(undefined, { fauna: false, seed: SEED, record: true }));
    runScripted(match, ticks);
    return { replay: match.replay()!, hash: hashWorld(match.world) };
  }

  it('captures the seed, the roster and every command attempt', () => {
    const { replay } = record(250);

    assert.equal(replay.seed, SEED);
    assert.deepEqual(
      replay.players.map((p) => p.slot),
      [0, 1],
      'the roster is recorded, sorted by slot'
    );
    assert.ok(replay.commands.length >= 8, 'the scripted orders were captured');
    assert.ok(
      replay.commands.every((c, i) => i === 0 || c.tick >= replay.commands[i - 1]!.tick),
      'commands come out in tick order'
    );
    assert.ok(replay.checkpoints.length > 0, 'and periodic hashes were taken');
  });

  it('replays to the same world it recorded', () => {
    const { replay, hash } = record(400);
    const result = playReplay(replay);

    assert.equal(result.divergedAtTick, null, 'no checkpoint disagreed');
    assert.equal(result.finalHash, hash, 'and the final world matches the recording');
  });

  it('reports the tick a divergence happened, not just that one did', () => {
    // Break the replay on purpose: drop the commands after the first
    // checkpoint. Playback must notice, and must notice at a checkpoint
    // rather than only at the end — that is the whole reason checkpoints
    // exist. If this test ever passes with divergedAtTick === null, the
    // determinism suite above is no longer evidence of anything.
    const { replay, hash } = record(400);
    assert.ok(replay.checkpoints.length >= 2, 'need a checkpoint to diverge at');

    const tampered: Replay = {
      ...replay,
      commands: replay.commands.filter((c) => c.tick < 40),
    };

    const result = playReplay(tampered);
    assert.notEqual(result.finalHash, hash, 'dropping commands changes the match');
    assert.notEqual(result.divergedAtTick, null, 'and the divergence is detected');
    assert.ok(
      result.divergedAtTick! < replay.finalTick,
      'at a checkpoint during the match, not only at the end'
    );
  });

  it('refuses a replay from a different format version', () => {
    const { replay } = record(60);
    assert.throws(
      () => playReplay({ ...replay, version: replay.version + 1 }),
      /format/,
      'a stale replay must fail loudly rather than replay wrongly'
    );
  });
});
