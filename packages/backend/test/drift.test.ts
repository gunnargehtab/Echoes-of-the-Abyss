/**
 * Drift noise accumulation and Drift Health — docs/bestiary.md §6.
 *
 * This file exists under the name of the system it tests. The Drift Health
 * cases lived in `fauna.test.ts` until #304, where someone editing `drift.ts`
 * grepped for `drift.test.ts`, found nothing, and concluded the code was
 * untested. It was not — but a test nobody can find is very nearly the same
 * thing.
 *
 * **The assertions here are quantitative on purpose.** The coverage this file
 * replaces asserted that health falls under noise and comes back when the
 * noise moves on, which is true of a great many wrong implementations. Two
 * mutations to `Match.driftTick` passed the entire 742-case suite (#304):
 *
 * 1. dropping the `DRIFT_SLOT` guard, so every creature in the Rift wears down
 *    the Drift it lives in — a self-extinction loop, since `spawnsAllowed`
 *    gates new spawns on that health;
 * 2. doubling each contribution, so the map decays at twice the authored rate.
 *
 * Both survive a directional test and neither survives an exact one. §6 makes
 * the wear an argument about noise — economy is loud, loud kills the map, and
 * the map is what pays you — so the *rate* is the mechanic, and a silent 2×
 * error in it is a balance change that would surface weeks later as playtest
 * feedback with the cause buried in a summation loop.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DRIFT, Faction, FaunaSpecies, SIM, UnitKind } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnFauna, spawnUnit } from '../src/sim/world.ts';
import { Acoustic, Position } from '../src/sim/components.ts';
import { VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

/** Regions are a square grid over the terrain, so 8000 m / 4 = 2000 m a side. */
const REGION_M = 8000 / DRIFT.HEALTH_REGIONS;

/**
 * Region (2,2) of the grid — x and y both in [4000, 6000).
 *
 * Every test below sites its emitters here because the starting base does not:
 * slot 0 spawns at (1200, 1200) and its harvester rolls to a home field at
 * (1900, 1450), all of which is region (0,0). That is what lets these tests
 * assert an *exact* regional sum rather than a lower bound — the region holds
 * precisely what the test puts in it.
 */
const MIDDLE_X = 5000;
const MIDDLE_Y = 5000;

function bareMap(): MapDefinition {
  return { ...VENTFRONT_DIVIDE, id: 'test-drift-noise', regions: [], hazards: [] };
}

/** A quiet match with no fauna seeded, so a test places exactly what it wants. */
function emptyMatch(seed: number): Match {
  const match = new Match(bareMap(), {
    fauna: false,
    seed,
    terrain: new Terrain(8000, 8000, 250),
  });
  match.addPlayer(0, Faction.Bathyarch);
  return match;
}

function advance(match: Match, seconds: number) {
  let last = null;
  for (let i = 0; i < seconds * SIM.TICK_HZ; i++) {
    const snapshots = match.update(STEP_MS);
    if (snapshots !== null) last = snapshots;
  }
  return last;
}

/**
 * Sum SIG the way `driftTick` sums it: into a `Float32Array`, in ascending
 * entity order, so every intermediate rounds exactly where the simulation's
 * does. Adding these in float64 and comparing against the stored float32 would
 * need a tolerance, and a tolerance is the looseness this file exists to
 * remove — a 2× error is loud, but so is the next one, and only exactness
 * catches a subtler one.
 */
function accumulatedSig(eids: number[]): number {
  const acc = new Float32Array(1);
  for (const eid of eids) acc[0] = acc[0]! + Acoustic.sig[eid]!;
  return acc[0]!;
}

function regionOf(match: Match, eid: number): number {
  return match.world.drift.regionIndex(Position.x[eid]!, Position.y[eid]!);
}

describe('drift noise is accumulated per region', () => {
  it('sums exactly the SIG of the hulls standing in a region', () => {
    // The assertion mutation 2 fails: doubling each contribution leaves the
    // health curve the right shape and this number twice what it should be.
    const match = emptyMatch(91);
    const column = [
      spawnUnit(match.world, {
        kind: UnitKind.Harvester,
        slot: 0,
        faction: Faction.Bathyarch,
        x: MIDDLE_X - 400,
        y: MIDDLE_Y - 400,
      }),
      spawnUnit(match.world, {
        kind: UnitKind.Cruiser,
        slot: 0,
        faction: Faction.Bathyarch,
        x: MIDDLE_X,
        y: MIDDLE_Y,
      }),
      spawnUnit(match.world, {
        kind: UnitKind.LightScout,
        slot: 0,
        faction: Faction.Bathyarch,
        x: MIDDLE_X + 400,
        y: MIDDLE_Y + 400,
      }),
    ];

    const region = match.world.drift.regionIndex(MIDDLE_X, MIDDLE_Y);
    advance(match, 1);

    // Three different hulls, so a sum that happened to be right for one of
    // them would still be wrong here.
    assert.ok(accumulatedSig(column) > 0, 'idle hulls emit something');
    assert.equal(
      match.world.driftNoise[region],
      accumulatedSig(column),
      'the region carries the SIG of what stands in it — no more, no less'
    );
  });

  it("keeps one region's noise out of its neighbours", () => {
    const match = emptyMatch(92);
    const here = [
      spawnUnit(match.world, {
        kind: UnitKind.Cruiser,
        slot: 0,
        faction: Faction.Bathyarch,
        x: MIDDLE_X,
        y: MIDDLE_Y,
      }),
    ];
    const there = [
      spawnUnit(match.world, {
        kind: UnitKind.Cruiser,
        slot: 0,
        faction: Faction.Bathyarch,
        x: MIDDLE_X + REGION_M,
        y: MIDDLE_Y + REGION_M,
      }),
    ];

    advance(match, 1);

    assert.equal(match.world.driftNoise[regionOf(match, here[0]!)], accumulatedSig(here));
    assert.equal(match.world.driftNoise[regionOf(match, there[0]!)], accumulatedSig(there));
    // §6's whole point is that health happens to *places*: a region with
    // nothing in it is untouched by a fight two kilometres away.
    assert.equal(
      match.world.driftNoise[
        match.world.drift.regionIndex(MIDDLE_X - REGION_M, MIDDLE_Y + REGION_M)
      ],
      0,
      'an empty region hears nothing'
    );
  });

  it("leaves the Drift's own creatures out of it", () => {
    // The assertion mutation 1 fails. Fauna are what the Drift *is*; counting
    // them against it makes every creature in the Rift damage the map it
    // depends on, and `spawnsAllowed` then closes the region to the next
    // generation. Nothing in the old suite stood in the way of that.
    const match = emptyMatch(93);
    const school = [0, 1, 2].map((i) =>
      spawnFauna(match.world, {
        species: FaunaSpecies.Sounder,
        x: MIDDLE_X + i * 120,
        y: MIDDLE_Y,
      })
    );

    advance(match, 1);

    // The test means nothing unless the school is loud enough that counting it
    // would actually show: below the threshold the drain is zero either way.
    // If the roster is ever retuned quieter, this fails rather than going
    // quietly vacuous.
    const schoolSig = accumulatedSig(school);
    assert.ok(
      schoolSig > DRIFT.HEALTH_SIG_THRESHOLD,
      `a school of ${school.length} Sounders is ${schoolSig} SIG, which must exceed the ` +
        `${DRIFT.HEALTH_SIG_THRESHOLD} threshold for this test to be evidence of anything`
    );

    const before = match.world.drift.at(MIDDLE_X, MIDDLE_Y);
    for (let i = 0; i < 20 * SIM.TICK_HZ; i++) {
      match.update(STEP_MS);
      // Read the region from where each creature actually is, so a school that
      // wanders is still being asserted about rather than quietly escaping.
      for (const eid of school) {
        assert.equal(
          match.world.driftNoise[regionOf(match, eid)],
          0,
          'a creature contributes nothing to the wear on the Drift it lives in'
        );
      }
    }

    assert.ok(
      match.world.drift.at(MIDDLE_X, MIDDLE_Y) > before,
      'and a region holding nothing but fauna recovers, rather than being eaten by them'
    );
  });
});

describe('Drift Health', () => {
  it('starts every region healthy and reports it to the client', () => {
    const drift = advance(emptyMatch(80), 1)!.get(0)!.driftHealth;
    assert.equal(drift.length, DRIFT.HEALTH_REGIONS * DRIFT.HEALTH_REGIONS);
    assert.ok(
      drift.every((h) => h > DRIFT.HEALTH_STRAINED),
      'a fresh map is healthy'
    );
  });

  it('degrades a region under sustained noise and recovers when it stops', () => {
    // §6: "It falls with sustained high SIG... and recovers slowly."
    //
    // Sited well away from the player's own base, which is itself loud enough
    // to hold its region down — a nice consequence of the rule, and a poor
    // place to measure recovery.
    const match = emptyMatch(81);
    const loud: number[] = [];
    for (let i = 0; i < 6; i++) {
      loud.push(
        spawnUnit(match.world, {
          kind: UnitKind.Harvester,
          slot: 0,
          faction: Faction.Bathyarch,
          x: MIDDLE_X + i * 60,
          y: MIDDLE_Y,
        })
      );
    }

    const region = match.world.drift.regionIndex(MIDDLE_X, MIDDLE_Y);
    const before = match.world.drift.at(MIDDLE_X, MIDDLE_Y);
    advance(match, 25);
    const after = match.world.drift.at(MIDDLE_X, MIDDLE_Y);
    assert.ok(after < before, `region ${region}: ${before} -> ${after} under sustained noise`);

    // Move the noise out of the region rather than zeroing SIG: `acousticsSystem`
    // recomputes SIG from stats every tick, so writing the component directly
    // is a no-op the next frame. (This test asserted on exactly that no-op
    // first time round, and failed for the right reason.)
    for (const eid of loud) {
      Position.x[eid] = 7400;
      Position.y[eid] = 7400;
    }
    advance(match, 25);
    assert.ok(
      match.world.drift.at(MIDDLE_X, MIDDLE_Y) > after,
      'and recovers once the noise moves on'
    );
  });

  it('pays less for a kill in a damaged region', () => {
    // The guard-rail against a Directorate snowball (docs/economy.md §9):
    // over-harvesting kills the region that pays them.
    const match = emptyMatch(82);
    const healthy = match.world.drift.yieldMultiplier(4000, 4000);
    for (let i = 0; i < 30; i++) match.world.drift.recordKill(4000, 4000);
    const stripped = match.world.drift.yieldMultiplier(4000, 4000);
    assert.ok(stripped < healthy, `yield ${healthy} -> ${stripped} as the region is stripped`);
  });

  it('stops admitting spawns in a failing region', () => {
    const match = emptyMatch(83);
    assert.ok(match.world.drift.spawnsAllowed(4000, 4000));
    for (let i = 0; i < 12; i++) match.world.drift.recordKill(4000, 4000);
    assert.equal(match.world.drift.spawnsAllowed(4000, 4000), false, '§6: no new spawns');
  });
});
