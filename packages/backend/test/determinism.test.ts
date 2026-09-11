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

import { readFileSync } from 'node:fs';

import {
  Biome,
  DRIFT,
  ECONOMY_ACCOUNTS,
  EchoMarkKind,
  Faction,
  HarvestThrottle,
  ResolutionTier,
  SIM,
  StructureKind,
  UnitKind,
  statsFor,
} from '@echoes/shared';
import { hasComponent } from 'bitecs';
import { Match } from '../src/sim/match.ts';
import { Fauna, Owner, Structure, Unit } from '../src/sim/components.ts';
import { economyFor, type SimWorld } from '../src/sim/world.ts';
import { Rng } from '../src/sim/rng.ts';
import { hashWorld } from '../src/sim/stateHash.ts';
import { REPLAY_COMMAND_TYPES, playReplay, type Replay } from '../src/sim/replay.ts';

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

  it('hands back one stream per key rather than a fresh one per call', () => {
    // Re-deriving on every call gave the second caller a stream rewound to the
    // start, so two subsystems sharing a key drew the identical sequence and
    // neither looked wrong from the call site. It is also what made a fork
    // unhashable: a stream nothing holds has no position to fingerprint.
    const root = new Rng(99);
    const first = root.fork('fauna');
    const drawn = [first.next(), first.next()];
    const second = root.fork('fauna');

    assert.equal(second, first, 'one key is one stream');
    assert.notDeepEqual([second.next(), second.next()], drawn, 'and it kept its position');
    assert.deepEqual([...root.streams.keys()], ['fauna'], 'the root knows what it forked');
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

  it('notices a forked stream that has moved on its own', () => {
    // The root's position says nothing about where a fork has got to, and a
    // fork is exactly what a subsystem reaches for when it wants draws that do
    // not shift everybody else's. Hashing the root alone reported two matches
    // that had drawn a different number of fauna dice as identical.
    const match = twoPlayers(new Match(undefined, { fauna: false, seed: SEED }));
    const rootBefore = match.world.rng.snapshot();
    const before = hashWorld(match.world);
    match.world.rng.fork('a-subsystem').next();

    assert.notEqual(
      hashWorld(match.world),
      before,
      'the hash must follow every stream, not only the root'
    );
    assert.equal(match.world.rng.snapshot(), rootBefore, 'and the root really was left alone');
  });

  it('notices acoustic residue the two runs do not share', () => {
    // A mark is read back by the simulation — a scavenger picks one by id and
    // strips it — so residue that disagrees puts the Drift somewhere else a
    // minute later. Unhashed, that divergence stayed invisible until it had
    // moved a hull.
    const match = twoPlayers(new Match(undefined, { fauna: false, seed: SEED }));
    const before = hashWorld(match.world);
    match.world.marks.add(EchoMarkKind.Battle, 4000, 4000, 900);
    const laid = hashWorld(match.world);
    assert.notEqual(laid, before, 'the hash ignored a mark being laid');

    // And its decay, which is state that keeps moving after the tick that
    // wrote it: a checkpoint taken a second later must not agree with this one.
    match.world.marks.tick(1);
    assert.notEqual(hashWorld(match.world), laid, 'the hash ignored residue decaying');
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

describe('a recorded torpedo launch replays', () => {
  it('reproduces a launch that is gated on a contact', () => {
    // The command that could not round-trip, and the reason is worth keeping.
    // A launch needs Tier 2 on the target (§7), which means it needs the Echo
    // Layer to have run. The pass used to be driven by an accumulator of
    // wall-clock `deltaMs` fed by `update`, and `playReplay` drives `stepOnce`
    // — so playback resolved detection exactly zero times and refused every
    // recorded launch. Nothing caught it: the divergence fell between two
    // 300-tick checkpoints, so the replay reported a clean run on a match it
    // had failed to reproduce.
    //
    // This is the test that would have. It asserts on the final hash rather
    // than on the checkpoints for the same reason.
    const live = twoPlayers(new Match(undefined, { seed: SEED, fauna: false, record: true }));
    matchWorld = live.world;

    // Everything here has to be a *recorded command*, or the replay starts from
    // a different world and diverges at tick 0 for reasons that have nothing to
    // do with the launch. So: the opening escort, driven together with
    // orderMove. Asked for by the property the test needs — a hull that carries
    // torpedoes — rather than by name, because since #509 the kit is each
    // navy's own line hull and both of these used to be Corvettes.
    const shooter = ownedUnit(0, (kind) => statsFor(kind).carriesTorpedoes);
    const target = ownedUnit(1, (kind) => statsFor(kind).carriesTorpedoes);
    assert.notEqual(shooter, 0, 'slot 0 should open with a hull that carries torpedoes');
    assert.notEqual(target, 0, 'and so should slot 1');

    const midX = live.map.widthM / 2;
    const midY = live.map.heightM / 2;
    live.orderMove(0, shooter, midX, midY);
    live.orderMove(1, target, midX + 400, midY);

    let launched = 0;
    for (let tick = 0; tick < 5400; tick++) {
      const snapshots = live.update(1000 / SIM.TICK_HZ);
      if (launched !== 0) continue;
      const view = snapshots?.get(0);
      if (view === undefined) continue;
      const contact = view.contacts.find((c) => c.tier >= ResolutionTier.Bearing);
      if (contact === undefined) continue;
      launched = live.orderLaunchTorpedo(0, shooter, contact.id);
    }

    assert.notEqual(launched, 0, 'the live match should have got a torpedo into the water');
    const liveHash = hashWorld(live.world);
    const replay = live.replay()!;
    assert.ok(
      replay.commands.some((c) => c.type === 'torpedo'),
      'and the launch should have been recorded'
    );

    const played = playReplay(replay);
    assert.equal(played.divergedAtTick, null, 'no checkpoint should disagree');
    assert.equal(
      played.finalHash,
      liveHash,
      'and the replayed world must end up identical — a refused launch shows up here'
    );
  });
});

/**
 * What the fingerprint actually covers — #620.
 *
 * `hashWorld` is the whole evidence for the determinism claim above, and the
 * tests before this block never asked it what it covered. They asked whether
 * two runs agreed, which a hash of nothing at all answers perfectly. That gap
 * was not theoretical: the economy block could be replaced with a no-op and
 * this file stayed green, while Biomass, every hazard timer, the whole Drift
 * Health grid and all of fauna behaviour were outside the hash entirely.
 *
 * So these are residue tests, shaped like the acoustic-residue case above:
 * perturb one thing, assert the hash moves. Each one is the failure a deleted
 * or forgotten block produces, which is the only property that generalises —
 * a hash is evidence exactly to the extent that no-oping part of it breaks a
 * test.
 */
describe('the fingerprint covers what it certifies', () => {
  /**
   * Perturb, hash, restore — and report whether the hash noticed.
   *
   * Restoring matters because these run against one match: a mutation left
   * behind would be carried into the next assertion, where a hash that moved
   * for the *previous* reason reads as a pass.
   */
  function moved(match: Match, mutate: () => void, restore: () => void): boolean {
    const before = hashWorld(match.world);
    mutate();
    const after = hashWorld(match.world);
    restore();
    assert.equal(hashWorld(match.world), before, 'the probe must leave the world as it found it');
    return after !== before;
  }

  it('follows every banked account, by iterating them rather than naming them', () => {
    // Written over ECONOMY_ACCOUNTS on purpose. Naming the accounts here would
    // reproduce the bug in the test: `crystal` and `nodules` were hashed and
    // `biomass` was not, and a test that listed the two hashed ones would have
    // agreed with the hash about which accounts exist. A fourth account added
    // to `Stockpile` is covered by this assertion the day it is added.
    const match = twoPlayers(new Match(undefined, { fauna: false, seed: SEED }));
    assert.ok(ECONOMY_ACCOUNTS.length >= 3, 'the roster banks at least the documented three');

    for (const account of ECONOMY_ACCOUNTS) {
      const economy = economyFor(match.world, 0);
      const held = economy[account];
      assert.ok(
        moved(
          match,
          () => {
            economy[account] = held + 100;
          },
          () => {
            economy[account] = held;
          }
        ),
        `a slot quietly richer in ${account} must not hash as one that is not`
      );
    }
  });

  it('follows every mutable field of a hazard, not the site it sits on', () => {
    // The seven that move. A hazard's site comes from the map and never
    // changes; its phase and its timers are the match's, and `crop` and
    // `sownRemaining` in particular are what the sow command writes — the
    // thing REPLAY_FORMAT_VERSION 24 was bumped for and the checker could not
    // see. Listed by key so a new mutable field arriving with a new hazard
    // kind fails the length assertion rather than slipping past unhashed.
    const match = twoPlayers(new Match(undefined, { fauna: false, seed: SEED }));
    const hazard = match.world.hazards[0];
    assert.ok(hazard !== undefined, 'the default map has to author a hazard at all');

    const mutable = [
      'phase',
      'elapsedS',
      'suppressedS',
      'burnedS',
      'crop',
      'sownRemaining',
      'stabilisedS',
    ] as const;
    assert.equal(mutable.length, 7, 'seven fields of a Hazard are simulation state');

    for (const field of mutable) {
      const held = hazard[field];
      assert.ok(
        moved(
          match,
          () => {
            hazard[field] = held + 7;
          },
          () => {
            hazard[field] = held;
          }
        ),
        `a bed whose ${field} differs is not the same bed`
      );
    }
  });

  it('follows every region of the Drift Health grid', () => {
    // Sixteen cells, and the hash must read all sixteen rather than the first
    // or the ones a kill happened to touch. These are the same values
    // `MatchRoom.driftResult()` carries into the campaign record, where they
    // seed the next mission on this map — so a divergence here outlives the
    // match it happened in, which no other state in the fingerprint does.
    const match = twoPlayers(new Match(undefined, { fauna: false, seed: SEED }));
    const grid = match.world.drift.snapshot();
    assert.equal(
      grid.length,
      DRIFT.HEALTH_REGIONS * DRIFT.HEALTH_REGIONS,
      'the carried grid is the region grid, squared'
    );

    const widthM = match.map.widthM;
    const heightM = match.map.heightM;
    for (let index = 0; index < grid.length; index++) {
      const col = index % DRIFT.HEALTH_REGIONS;
      const row = Math.floor(index / DRIFT.HEALTH_REGIONS);
      // The centre of the region, so `index()`'s clamping cannot land the
      // probe in a neighbour and make a covered cell look covered twice.
      const x = ((col + 0.5) / DRIFT.HEALTH_REGIONS) * widthM;
      const y = ((row + 0.5) / DRIFT.HEALTH_REGIONS) * heightM;

      const before = hashWorld(match.world);
      match.world.drift.recordKill(x, y);
      assert.notEqual(
        hashWorld(match.world),
        before,
        `region ${index} was worn down and the hash did not notice`
      );
    }
  });

  it('follows what a creature is doing, not only that one is there', () => {
    // Position, Health and Acoustic already said a creature was here and how
    // loud it was. Nothing said whether it was grazing or committed, what it
    // was answering, or who is owed its Biomass — and the Drift is the sim's
    // only source of dice, so a divergence confined to fauna behaviour was
    // both the likeliest to exist and the certain one to report a clean replay.
    const match = twoPlayers(new Match(undefined, { seed: SEED }));
    matchWorld = match.world;
    for (let i = 0; i < 120; i++) match.stepOnce();

    let creature = 0;
    for (let eid = 0; eid <= match.world.maxEid; eid++) {
      if (hasComponent(match.world, Fauna, eid)) {
        creature = eid;
        break;
      }
    }
    assert.notEqual(creature, 0, 'a populated Drift has to hold a creature');

    const fields = ['stage', 'interestS', 'quietS', 'interestedS', 'coolingS'] as const;
    for (const field of fields) {
      const held = Fauna[field][creature]!;
      assert.ok(
        moved(
          match,
          () => {
            Fauna[field][creature] = held + 3;
          },
          () => {
            Fauna[field][creature] = held;
          }
        ),
        `a creature whose ${field} differs is doing something else`
      );
    }

    // The two that decide where Biomass goes and what the creature answers.
    const owed = Fauna.renderedBySlot[creature]!;
    assert.ok(
      moved(
        match,
        () => {
          Fauna.renderedBySlot[creature] = owed === 1 ? 0 : 1;
        },
        () => {
          Fauna.renderedBySlot[creature] = owed;
        }
      ),
      'a creature owed to the other commander pays the other commander'
    );

    const target = Fauna.targetEid[creature]!;
    const other = firstUnit(match, 0);
    assert.notEqual(other, 0, 'need a hull for the creature to be answering');
    assert.ok(
      moved(
        match,
        () => {
          Fauna.targetEid[creature] = target === other ? 0 : other;
        },
        () => {
          Fauna.targetEid[creature] = target;
        }
      ),
      'a creature answering a different hull swims somewhere else'
    );
  });

  it('follows the tick and the root stream position', () => {
    // Both were unfalsifiable: no-op either and every test in this file still
    // passed, because the assertions above compare two runs that agree about
    // the tick by construction. A checkpoint is a promise about a *tick*, so a
    // hash that ignores which tick it was taken at cannot keep it.
    const match = twoPlayers(new Match(undefined, { fauna: false, seed: SEED }));

    const tick = match.world.tick;
    assert.ok(
      moved(
        match,
        () => {
          match.world.tick = tick + 1;
        },
        () => {
          match.world.tick = tick;
        }
      ),
      'two worlds at different ticks are not the same world'
    );

    // The root, beside the fork case above. A draw nobody has consumed yet is
    // still a divergence: the next system to ask for a number gets a different
    // one, and the tick that exposes it is minutes away.
    const before = hashWorld(match.world);
    const mark = match.world.rng.snapshot();
    match.world.rng.next();
    assert.notEqual(hashWorld(match.world), before, 'the hash ignored the root stream advancing');
    match.world.rng.restore(mark);
    assert.equal(hashWorld(match.world), before, 'and the probe put it back');
  });

  it('follows ground a mission wrote mid-match', () => {
    // The digest is kept by the terrain as it writes, so this probe has to be
    // a real write rather than a poked field — which is the honest test
    // anyway, since what must agree is *what a beat wrote*, not a number.
    const match = twoPlayers(new Match(undefined, { fauna: false, seed: SEED }));
    const before = hashWorld(match.world);
    const revision = match.world.terrain.revision;

    match.world.terrain.fillGround(1000, 1000, 400, 400, { biome: Biome.AbyssalTrench });
    assert.ok(match.world.terrain.revision > revision, 'the write has to have changed a cell');
    assert.notEqual(
      hashWorld(match.world),
      before,
      'a match whose ground came down on a different tick is a different match'
    );
  });

  it('follows the production line and the rally point it walks off to', () => {
    // Both blocks were unfalsifiable for the same reason as the economies:
    // nothing perturbed them. Same hulls on the map and different things
    // coming off the line is a divergence that surfaces minutes later as an
    // army that should not exist.
    const match = twoPlayers(new Match(undefined, { fauna: false, seed: SEED }));
    matchWorld = match.world;
    const foundry = firstFoundry(match, 0);
    assert.notEqual(foundry, 0, 'slot 0 opens with a Foundry');

    // Paid for outright: what is under test is the queue, not whether the
    // opening economy can afford a hull sixty ticks in.
    const economy = economyFor(match.world, 0);
    for (const account of ECONOMY_ACCOUNTS) economy[account] = 100_000;
    match.produce(0, foundry, UnitKind.Corvette);
    const line = match.world.production.get(foundry);
    assert.ok(line !== undefined, 'the order has to have opened a line');

    const remaining = line.remainingS;
    assert.ok(
      moved(
        match,
        () => {
          line.remainingS = remaining + 5;
        },
        () => {
          line.remainingS = remaining;
        }
      ),
      'two yards at different points in the same build are not the same yard'
    );

    match.setRally(0, foundry, 2500, 2500);
    const rally = match.world.rallies.get(foundry);
    assert.ok(rally !== undefined, 'the rally point was set');
    const x = rally.x;
    assert.ok(
      moved(
        match,
        () => {
          rally.x = x + 100;
        },
        () => {
          rally.x = x;
        }
      ),
      'hulls walking off to a different place are an army in a different place'
    );
  });
});

describe('every mutating entry point is in the replay stream', () => {
  it('records a command for every member of the command union', () => {
    // Reads the source, deliberately, and the alternative is what this test is
    // about. `ReplayCommand` and `applyCommand` are now held together at
    // compile time — the `Exact<>` check beside REPLAY_COMMAND_TYPES and the
    // `never` at the foot of the dispatcher — so a command declared and not
    // dispatched is a build error. The third leg is the one types cannot
    // reach: that something on `Match` actually *records* it. `resign` failed
    // exactly there for the life of the replay system, declared nowhere and
    // recorded nowhere while the room called it on every walk-out.
    //
    // A round-trip of all twenty-eight in one recorded match would be the
    // stronger form and is not what this is: half of them need a particular
    // navy's hull to exist first. This holds the property the next command
    // needs held — that it cannot be added on one side only.
    const source = readFileSync(new URL('../src/sim/match.ts', import.meta.url), 'utf8');

    const missing = REPLAY_COMMAND_TYPES.filter((type) => !source.includes(`type: '${type}'`));
    assert.deepEqual(missing, [], 'these command types are declared but never recorded');

    const recorded = [...source.matchAll(/recordCommand\(\{[^}]*type: '(\w+)'/g)].map((m) => m[1]);
    const unknown = recorded.filter(
      (type) => !(REPLAY_COMMAND_TYPES as readonly string[]).includes(type!)
    );
    assert.deepEqual(
      unknown,
      [],
      'these commands are recorded under a type the union has no case for'
    );
  });

  it('replays a match that was resigned', () => {
    // The trap, reproduced and then closed. The room resigns a slot on every
    // consented walk-out and every out-of-grace disconnect, and the balance
    // harness resigns too — so before this, the majority of real matches would
    // have replayed as `divergedAtTick`, a determinism-failure report whose
    // real fault was an unrecorded command.
    const live = twoPlayers(new Match(undefined, { fauna: false, seed: SEED, record: true }));
    runScripted(live, 400);
    live.resign(1);
    for (let i = 0; i < 200; i++) live.stepOnce();

    const hash = hashWorld(live.world);
    const replay = live.replay()!;
    assert.ok(
      replay.commands.some((c) => c.type === 'resign' && c.slot === 1),
      'the resignation was recorded'
    );

    const played = playReplay(replay);
    assert.equal(played.divergedAtTick, null, 'no checkpoint disagreed');
    assert.equal(played.finalHash, hash, 'and the replayed world ends where the live one did');
  });
});

describe('the stochastic half of the simulation is certified, not skipped', () => {
  // Every Match in this file before these two passes `fauna: false`, and so do
  // carrying.test.ts, pathfinding.test.ts and missionRuntime.test.ts. No
  // same-seed assertion and no replay assertion in the repository has ever run
  // with the Drift populated — which is to say the sim's only source of dice
  // was outside the only tests that could catch it drifting. Both cases pass
  // today; the point is that they are now asserted rather than assumed.
  //
  // Run past DRIFT.RESPAWN_INTERVAL_S so repopulation actually draws: the
  // Drift replaces its losses on that interval, and a run that stops short of
  // it certifies the seeding and nothing else.
  const TICKS = Math.ceil(DRIFT.RESPAWN_INTERVAL_S * 1.5) * SIM.TICK_HZ;

  it('runs the same populated match twice from one seed', () => {
    const first = twoPlayers(new Match(undefined, { seed: SEED }));
    const second = twoPlayers(new Match(undefined, { seed: SEED }));

    for (let i = 0; i < TICKS; i++) first.stepOnce();
    for (let i = 0; i < TICKS; i++) second.stepOnce();

    assert.ok(
      first.world.rng.streams.has('drift'),
      'the Drift has to have been populated for this to be worth asserting'
    );
    assert.equal(
      hashWorld(first.world),
      hashWorld(second.world),
      'one seed must produce one Drift'
    );
  });

  it('replays a populated match past the respawn interval', () => {
    const live = twoPlayers(new Match(undefined, { seed: SEED, record: true }));
    runScripted(live, TICKS);

    const hash = hashWorld(live.world);
    const played = playReplay(live.replay()!);

    assert.equal(played.divergedAtTick, null, 'no checkpoint disagreed');
    assert.equal(played.finalHash, hash, 'and a match with the Drift running still reproduces');
  });
});
