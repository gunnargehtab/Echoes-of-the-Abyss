/**
 * The Echo pass, checked against the rules it implements.
 *
 * `EchoLayer` is heavily optimised: a spatial-hash broadphase, per-HYD lookup
 * tables, squared-distance pruning, aborting path walks, and (issue #90) a
 * skip that drops any pair which could not improve on what its own side
 * already resolved. Every one of those is a chance to be fast and wrong.
 *
 * So this test ignores all of it and computes the answer the slow, obvious
 * way: every emitter against every enemy listener, straight from the shared
 * propagation math, keeping the best tier per side. If the two disagree, the
 * optimisation has changed what players are told.
 *
 * Deliberately a reference implementation of the *rules* rather than a frozen
 * snapshot of the old code: it stays meaningful when detection legitimately
 * changes, because it changes with it.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasComponent } from 'bitecs';
import {
  ACTIVE_SONAR,
  Faction,
  HAZARDS,
  HYD_MAX,
  HazardPhase,
  PROPAGATION_MODEL,
  ResolutionTier,
  SIM,
  STRUCTURE_AURAS,
  THERMOCLINE,
  UNIT_STATS,
  UnitKind,
  detectionRatio,
  directionalFactor,
  statsFor,
  thermoclineFactor,
  thermoclineZone,
  tierFromRatio,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { VENTFRONT_DIVIDE } from '../src/sim/maps/index.ts';
import { Acoustic, ActivePing, Heading, Owner, Position } from '../src/sim/components.ts';
import type { SimWorld } from '../src/sim/world.ts';

/** Best tier each slot should resolve for each emitter, computed all-pairs. */
function bruteForce(world: SimWorld, slots: number[]): Map<string, ResolutionTier> {
  const best = new Map<string, ResolutionTier>();
  const live: number[] = [];
  for (let eid = 0; eid < Position.x.length; eid++) {
    if (hasComponent(world, Acoustic, eid) && hasComponent(world, Owner, eid)) live.push(eid);
  }

  const note = (slot: number, emitter: number, tier: ResolutionTier) => {
    if (tier === ResolutionTier.Silent) return;
    const key = `${slot}:${emitter}`;
    if ((best.get(key) ?? ResolutionTier.Silent) < tier) best.set(key, tier);
  };

  for (const emitter of live) {
    const sig = Acoustic.sig[emitter]!;
    const ex = Position.x[emitter]!;
    const ey = Position.y[emitter]!;
    const pfFactor = Acoustic.pfFactor[emitter]! || 1;

    for (const listener of live) {
      const slot = Owner.slot[listener]!;
      if (slot === Owner.slot[emitter]) continue;
      if (!slots.includes(slot)) continue;

      const lx = Position.x[listener]!;
      const ly = Position.y[listener]!;
      const distance = Math.hypot(ex - lx, ey - ly);
      if (sig > 0) {
        // The thermocline is part of the rules this reference states, so it is
        // computed here the obvious way — straight from the two depths, with
        // no row table and no hoisting — precisely so that the fast path's
        // bookkeeping has something independent to be wrong against.
        const pf =
          world.terrain.pathPropagation(ex, ey, lx, ly) *
          pfFactor *
          thermoclineFactor(Position.depth[emitter]!, Position.depth[listener]!);
        // Directional signature is part of the rules too (docs/systems-echo.md
        // §8), so it is stated here the obvious way as well — and the three
        // conditions are written out rather than taken from `hasBow`, which is
        // the thing under test. If the pass's predicate ever drifts from §8's
        // sentence, this is what notices.
        //
        // Emitter-side, unlike the thermocline directly above: the factor
        // multiplies the SIG, never the listener's threshold.
        const bow =
          Owner.faction[emitter] === Faction.Hadron &&
          hasComponent(world, Heading, emitter) &&
          !(hasComponent(world, ActivePing, emitter) && ActivePing.remainingS[emitter]! > 0)
            ? directionalFactor(Heading.rad[emitter]!, ex, ey, lx, ly)
            : 1;
        note(
          slot,
          emitter,
          tierFromRatio(detectionRatio(sig * bow, pf, distance, Acoustic.hyd[listener]!))
        );
      }
    }
  }

  // Active sonar is a hard radius rather than a propagation result.
  for (const pinger of live) {
    if (!hasComponent(world, ActivePing, pinger)) continue;
    if (ActivePing.remainingS[pinger]! <= 0) continue;
    const slot = Owner.slot[pinger]!;
    for (const target of live) {
      if (Owner.slot[target] === slot) continue;
      const d = Math.hypot(
        Position.x[pinger]! - Position.x[target]!,
        Position.y[pinger]! - Position.y[target]!
      );
      if (d <= ACTIVE_SONAR.REVEAL_RADIUS_M) note(slot, target, ResolutionTier.Track);
    }
  }

  return best;
}

/**
 * Spawn depths, cycled per unit so every scenario straddles the thermocline.
 *
 * Named off the constant rather than written as literals: the default spawn
 * depths are 300 m and 600 m, both above the layer, so a scenario that took
 * them would resolve every pair at a factor of exactly 1 and this test would
 * agree with the fast path about a rule neither of them ran.
 */
const DEPTHS_M = [
  THERMOCLINE.DEPTH_M - 700,
  THERMOCLINE.DEPTH_M,
  THERMOCLINE.DEPTH_M + 700,
  THERMOCLINE.DEPTH_M - 50,
];

function scenario(unitsPerSlot: number, seed: number): Match {
  const match = new Match(undefined, { fauna: false, seed });
  for (let slot = 0; slot < 4; slot++) match.addPlayer(slot, slot as Faction);
  for (let slot = 0; slot < 4; slot++) {
    for (let i = 0; i < unitsPerSlot; i++) {
      const n = slot * unitsPerSlot + i;
      spawnUnit(match.world, {
        kind: (n * 7 + seed) % 5,
        slot,
        faction: slot as Faction,
        x: 400 + ((n * 487 + seed * 131) % 7200),
        y: 400 + ((n * 911 + seed * 373) % 7200),
        depth: DEPTHS_M[(n + seed) % DEPTHS_M.length]!,
      });
    }
  }
  for (let i = 0; i < 120; i++) match.update(1000 / SIM.TICK_HZ);
  return match;
}

/** How many distinct thermocline zones the live units actually occupy. */
function zonesOccupied(world: SimWorld): number {
  const seen = new Set<number>();
  for (let eid = 0; eid < Position.x.length; eid++) {
    if (!hasComponent(world, Acoustic, eid) || !hasComponent(world, Owner, eid)) continue;
    seen.add(thermoclineZone(Position.depth[eid]!));
  }
  return seen.size;
}

describe('echo pass', () => {
  it('resolves exactly what an all-pairs reference resolves', () => {
    const slots = [0, 1, 2, 3];
    let compared = 0;

    for (const [units, seed] of [
      [15, 1],
      [35, 2],
      [35, 7],
      [75, 3],
    ] as Array<[number, number]>) {
      const match = scenario(units, seed);
      assert.equal(
        zonesOccupied(match.world),
        3,
        `seed ${seed} must put units on both sides of the layer and in the duct`
      );
      const expected = bruteForce(match.world, slots);
      const actual = match.echo.run(match.world, slots);

      for (const slot of slots) {
        const got = new Map<string, ResolutionTier>();
        for (const contact of actual.contactsBySlot.get(slot) ?? []) {
          // Handles are opaque to clients but reversible here, which is what
          // lets this compare emitter by emitter rather than in aggregate.
          const emitter = match.echo.entityForHandle(slot, contact.id);
          assert.ok(emitter !== undefined, 'every reported contact maps back to an emitter');
          got.set(`${slot}:${emitter}`, contact.tier);
        }

        const mine = [...expected.entries()].filter(([key]) => key.startsWith(`${slot}:`));
        assert.deepEqual(
          [...got.entries()].sort(),
          mine.sort(),
          `slot ${slot} at ${units} units/slot (seed ${seed}) must match the reference`
        );
        compared += mine.length;
      }
    }

    // Without this the test could pass by resolving nothing at all.
    assert.ok(compared > 200, `expected a substantial contact set, compared ${compared}`);
  });

  /**
   * #1222. The broadphase sizes each emitter's query for the sharpest ears it
   * expects, and a listener above that ceiling hears past the square: the
   * Precentor's HYD 95 against a ceiling of 90 lost the outer few percent of
   * its range wherever the cells fell short.
   *
   * The geometry is chosen so they do fall short. The listener sits on the
   * west edge of its hash cell, and idle Corvettes stand due west of it from
   * inside the HYD-90 radius (3,841 m at SIG 28) to past the HYD-95 range
   * (3,973 m). A Corvette between the two is heard by the rules, and a query
   * square sized for HYD 90 ends short of the listener's cell; the pass must
   * resolve the line as the all-pairs reference does. West, because a line due
   * south ends among slot 1's own base, which hears it whatever the Precentor
   * does.
   */
  it('and at the edge of the best ears in the game, HYD 95', () => {
    const ceiling = PROPAGATION_MODEL.MAX_EXPECTED_HYD;
    // Rated HYD, moving and stationary, and the dome cap. A Resonance Storm
    // lifts some Hadron hulls to this ceiling and no further: the case below
    // (#1240).
    for (const stats of Object.values(UNIT_STATS)) {
      const rated = Math.max(stats.hyd, stats.hydStationary ?? 0);
      assert.ok(rated <= ceiling, `${UnitKind[stats.kind]}'s rated HYD is above the ceiling`);
    }
    assert.ok(STRUCTURE_AURAS.CANTOR.HYD_CAP <= ceiling, 'a dome lifts ears above the ceiling');

    const match = new Match(undefined, {
      fauna: false,
      seed: 5,
      terrain: new Terrain(12000, 12000, 250, { floorM: 2600 }),
    });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Directorate);
    const ear = spawnUnit(match.world, {
      kind: UnitKind.Precentor,
      slot: 1,
      faction: Faction.Directorate,
      x: 6000,
      y: 6000,
      depth: 600,
    });
    assert.equal(6000 % SIM.SPATIAL_CELL_M, 0, 'the premise: the listener is on a cell edge');
    const line: number[] = [];
    for (const distance of [3800, 3860, 3900, 3940, 3960, 4000, 4040]) {
      line.push(
        spawnUnit(match.world, {
          kind: UnitKind.Corvette,
          slot: 0,
          faction: Faction.Bathyarch,
          x: 6000 - distance,
          y: 6000,
          depth: 600,
        })
      );
    }
    for (let i = 0; i < 120; i++) match.update(1000 / SIM.TICK_HZ);
    assert.equal(Acoustic.hyd[ear], 95, 'the premise: the listener hears at HYD 95');

    const expected = bruteForce(match.world, [1]);
    const actual = match.echo.run(match.world, [1]);
    const got = new Map<string, ResolutionTier>();
    for (const contact of actual.contactsBySlot.get(1) ?? []) {
      got.set(`1:${match.echo.entityForHandle(1, contact.id)}`, contact.tier);
    }
    const heard = line.filter((eid) => expected.has(`1:${eid}`)).length;
    assert.ok(
      heard > 0 && heard < line.length,
      `the premise: the line straddles the edge, ${heard} of ${line.length} heard`
    );
    assert.deepEqual([...got.entries()].sort(), [...expected.entries()].sort());
  });

  /**
   * #1240. A Resonance Storm adds 25 to a Hadron hull's HYD, and a parked
   * Acolyte's 85 became 110: past the top of the scale, where the pass's
   * per-HYD tables stop. The pass resolved it at 100 and the rules at 110, so
   * a Corvette between the two ranges was a contact to one and silence to the
   * other. Built HYD now meets `HYD_MAX`, and the two must agree in a live
   * storm.
   *
   * The line stands due west inside the storm, where PF is 0.35, from inside
   * the HYD-100 range to past where HYD 110 would reach, as #1222's line does.
   */
  it('and in a Resonance Storm, which lifts Hadron ears to the top of the scale', () => {
    const match = new Match(
      {
        ...VENTFRONT_DIVIDE,
        id: 'test-echo-storm',
        regions: [],
        // A bloom is a kelp bed seeded into `world.hazards`, so "one storm"
        // has to say so about both lists, as hazards.test.ts does.
        blooms: [],
        hazards: [{ x: 6000, y: 6000, radiusM: 3000, kind: 'resonance-storm' }],
      },
      { fauna: false, seed: 5, terrain: new Terrain(12000, 12000, 250, { floorM: 2600 }) }
    );
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Hadron);
    const ear = spawnUnit(match.world, {
      kind: UnitKind.Acolyte,
      slot: 1,
      faction: Faction.Hadron,
      x: 6000,
      y: 6000,
      depth: 600,
    });
    const line: number[] = [];
    for (const distance of [2050, 2100, 2150, 2200, 2250, 2300, 2350]) {
      line.push(
        spawnUnit(match.world, {
          kind: UnitKind.Corvette,
          slot: 0,
          faction: Faction.Bathyarch,
          x: 6000 - distance,
          y: 6000,
          depth: 600,
        })
      );
    }
    const storm = match.world.hazards[0]!;
    for (let i = 0; i < 200 * SIM.TICK_HZ && storm.phase !== HazardPhase.Active; i++) {
      match.update(1000 / SIM.TICK_HZ);
    }
    for (let i = 0; i < 5; i++) match.update(1000 / SIM.TICK_HZ);
    assert.equal(storm.phase, HazardPhase.Active, 'the premise: the storm is up');

    const lifted = statsFor(UnitKind.Acolyte).hydStationary! + HAZARDS.STORM.HADRON_HYD_BONUS;
    assert.ok(lifted > HYD_MAX, `the premise: the storm alone lifts a parked Acolyte to ${lifted}`);
    assert.equal(Acoustic.hyd[ear], HYD_MAX, 'and the Acolyte hears at the top of the scale');

    const expected = bruteForce(match.world, [1]);
    const actual = match.echo.run(match.world, [1]);
    const got = new Map<string, ResolutionTier>();
    for (const contact of actual.contactsBySlot.get(1) ?? []) {
      got.set(`1:${match.echo.entityForHandle(1, contact.id)}`, contact.tier);
    }
    const heard = line.filter((eid) => expected.has(`1:${eid}`)).length;
    assert.ok(
      heard > 0 && heard < line.length,
      `the premise: the line straddles the edge, ${heard} of ${line.length} heard`
    );
    assert.deepEqual([...got.entries()].sort(), [...expected.entries()].sort());
  });
});
