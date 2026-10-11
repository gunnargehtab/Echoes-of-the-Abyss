/**
 * A match seated on recycled entity ids is the same match (#1279).
 *
 * A disposed match (#1278) hands its ids back to bitecs' process-wide queue,
 * and the next match is seated on them in whatever order they were freed. So
 * raw id order stops being spawn order, and every read that ordered by id read
 * a different match: a query's first call, which admits the living in id
 * order; the snapshot's lists; separation's "lower id resolves the pair"; the
 * state hash's ordinals; the commander's "the same hull every time". Each now
 * orders by the match-local id instead, which counts spawns.
 *
 * Its own file: it fills bitecs' process-wide id queue on purpose, which every
 * other match built in the same process would then be seated on.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addEntity, createWorld, deleteWorld, removeEntity } from 'bitecs';
import {
  AiDifficulty,
  Faction,
  SIM,
  UnitKind,
  statsFor,
  type EchoSnapshot,
  type OwnUnit,
} from '@echoes/shared';
import { AiCommander } from '../src/ai/commander.ts';
import { AiSeat, briefingFor } from '../src/ai/seat.ts';
import type { AiBriefing, AiCommand } from '../src/ai/types.ts';
import { Match } from '../src/sim/match.ts';
import { DEFAULT_MAP_ID, mapById } from '../src/sim/maps/index.ts';
import { hashWorld } from '../src/sim/stateHash.ts';
import { localIdOf } from '../src/sim/world.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

/**
 * Two commanders, Consortium against Commune, with the Drift on: every
 * system has a route into the hash. Seventy-five seconds, because the last
 * fault to go was separation's, past tick 2,600 here; the rest went sooner.
 *
 * Two fingerprints a step. The state hash covers the world; the snapshots
 * cover the Echo Layer, which is resolved per observer and never hashed, and
 * where a query walked in id order first showed in a fully scrambled process. A snapshot names
 * own hulls by entity id, so each id is written as the order it was first
 * seen in, which is the same in two runs of one match on any ids.
 */
function played(seed: number, seconds: number): { steps: string[]; match: Match } {
  const match = new Match(mapById(DEFAULT_MAP_ID)!, { seed, fauna: true });
  const seats = [Faction.Bathyarch, Faction.Pelagia].map((faction, slot) => {
    match.addPlayer(slot, faction);
    return new AiSeat(match, briefingFor(match, slot, faction, AiDifficulty.Veteran));
  });
  const seen = new Map<number, number>();
  const named = (key: string, value: unknown): unknown => {
    if ((key !== 'id' && key !== 'unitId') || typeof value !== 'number') return value;
    if (!seen.has(value)) seen.set(value, seen.size);
    return `#${seen.get(value)}`;
  };
  const steps: string[] = [];
  for (let tick = 0; tick < seconds * SIM.TICK_HZ && match.result === null; tick++) {
    const snapshots = match.update(STEP_MS);
    let step = String(hashWorld(match.world));
    if (snapshots !== null) {
      seats.forEach((seat, slot) => {
        const own = snapshots.get(slot);
        if (own !== undefined) seat.observe(own);
      });
      step += JSON.stringify([...snapshots.values()], named);
    }
    steps.push(step);
  }
  return { steps, match };
}

/**
 * Queue two thousand freed ids in a scrambled order, past bitecs' reuse
 * threshold (1% of 100,000), so the next match is seated on them in an order
 * that is not ascending. A real server gets there by disposing matches.
 */
function scrambleTheIdQueue(): void {
  const world = createWorld();
  const ids: number[] = [];
  for (let i = 0; i < 2000; i++) ids.push(addEntity(world));
  let state = 7;
  for (let i = ids.length - 1; i > 0; i--) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const j = state % (i + 1);
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  for (const eid of ids) if (eid !== 0) removeEntity(world, eid);
  deleteWorld(world);
}

describe('a match on recycled entity ids (#1279)', () => {
  it('steps to the same world, tick by tick, as the same match on fresh ids', () => {
    const fresh = played(500, 75);
    fresh.match.dispose();
    scrambleTheIdQueue();
    // bitecs' queue is first in, first out, and the disposed match's ids went
    // in ahead of the scrambled ones, in nearly the order it spawned them. So
    // the next match is seated on those, near enough ascending to test little,
    // and the one after it on a scrambled slice.
    const reseated = played(500, 75);
    reseated.match.dispose();
    const recycled = played(500, 75);

    // The premise: the map itself is seated out of order. Among the first
    // thirty entities spawned, some holds a lower id than one spawned before.
    const world = recycled.match.world;
    const spawned = [...world.localOfEid.keys()]
      .sort((a, b) => localIdOf(world, a)! - localIdOf(world, b)!)
      .slice(0, 30);
    assert.ok(
      spawned.some((eid, i) => i > 0 && eid < spawned[i - 1]!),
      'the third match was seated on ascending ids, so it tests nothing'
    );

    for (const [name, run] of [
      ['reseated', reseated],
      ['recycled', recycled],
    ] as const) {
      assert.equal(run.steps.length, fresh.steps.length, `the ${name} match ran another length`);
      const diverged = fresh.steps.findIndex((step, tick) => step !== run.steps[tick]);
      assert.equal(diverged, -1, `the ${name} match diverged at step ${diverged}`);
    }
    recycled.match.dispose();
  });
});

describe('the commander on recycled ids (#1279)', () => {
  /** A hull as the snapshot sends it, at a place of its own. */
  function hull(id: number, kind: UnitKind, x: number): OwnUnit {
    const stats = statsFor(kind);
    return {
      id,
      kind,
      x,
      y: 1000,
      depth: 300,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      heading: 0,
      sig: stats.sigCruise,
      silentRunning: false,
      engineOff: false,
      pressureRating: stats.pressureRating,
      pressureBonus: 0,
      unhealableDamage: 0,
    };
  }

  /** One real match to brief both commanders and template their snapshots. */
  function rig(): { brief: AiBriefing; base: EchoSnapshot } {
    const match = new Match(undefined, { fauna: false, seed: 0x1279 });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);
    const brief = briefingFor(match, 1, Faction.Pelagia, AiDifficulty.Veteran);
    let base: EchoSnapshot | undefined;
    for (let i = 0; i < SIM.TICK_HZ && base === undefined; i++)
      base = match.update(STEP_MS)?.get(1);
    assert.ok(base !== undefined, 'the match produced no snapshot to work from');
    return { brief, base };
  }

  /** Forty observations of one force, every command a fresh commander gave. */
  function commands(
    { brief, base }: ReturnType<typeof rig>,
    scouts: [number, number]
  ): AiCommand[] {
    const commander = new AiCommander(brief);
    // Two scouts, listed in spawn order: the first at 1,000 m, the second at
    // 3,000 m. Only their ids change between the two calls.
    const units = [
      ...Array.from({ length: 6 }, (_, i) => hull(i + 1, UnitKind.Corvette, 1000)),
      hull(scouts[0], UnitKind.LightScout, 1000),
      hull(scouts[1], UnitKind.LightScout, 3000),
    ];
    const out: AiCommand[] = [];
    for (let i = 0; i < 40; i++) {
      out.push(...commander.observe({ ...base, tick: base.tick + i * 12, units, contacts: [] }));
    }
    return out;
  }

  it('picks its scout by spawn order, so swapping two hulls’ ids changes nothing', () => {
    const fixture = rig();
    const asSpawned = commands(fixture, [90, 91]);
    // The same force with the two scouts' ids swapped: the hull spawned first
    // now holds the higher id, as a recycled id can. Swapped back, every
    // command must be the one the first force was given.
    const swap = (id: number): number => (id === 90 ? 91 : id === 91 ? 90 : id);
    const swapped = commands(fixture, [91, 90]).map((command) =>
      JSON.parse(
        JSON.stringify(command, (key, value: unknown) =>
          key === 'unitIds' && Array.isArray(value) ? value.map(swap) : value
        )
      )
    );
    assert.ok(
      asSpawned.some((c) => 'unitIds' in c && c.unitIds.some((id) => id === 90 || id === 91)),
      'the premise: the commander ordered a scout at all'
    );
    assert.deepEqual(swapped, asSpawned);
  });
});
