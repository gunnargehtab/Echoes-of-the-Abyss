/**
 * Hull separation (#113).
 *
 * The headline requirement is that a fleet under one move order arrives as a
 * formation rather than as a point — but the reason it matters is acoustic: a
 * stack of hulls at one coordinate is one acoustic position, and the Echo
 * Layer would report it as such.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { defineQuery } from 'bitecs';
import {
  Faction,
  OrdnanceKind,
  SEPARATION,
  SIM,
  StructureKind,
  UnitKind,
  statsFor,
  structureStatsFor,
  unitRadiusM,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnOrdnance, spawnStructure, spawnUnit } from '../src/sim/world.ts';
import {
  Health,
  MoveOrder,
  Ordnance,
  Position,
  Posture,
  SilentRunning,
  Velocity,
  Weapon,
} from '../src/sim/components.ts';

const liveOrdnance = defineQuery([Ordnance, Health]);

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): void {
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) match.update(STEP_MS);
}

function spread(eids: number[]): number {
  let worst = 0;
  for (let i = 0; i < eids.length; i++) {
    for (let j = i + 1; j < eids.length; j++) {
      const d = Math.hypot(
        Position.x[eids[i]!]! - Position.x[eids[j]!]!,
        Position.y[eids[i]!]! - Position.y[eids[j]!]!
      );
      if (worst === 0 || d < worst) worst = d;
    }
  }
  return worst;
}

describe('separation', () => {
  it('spreads a fleet given one move order instead of stacking it', () => {
    const match = new Match(undefined, { fauna: false, seed: 4 });
    match.addPlayer(0, Faction.Bathyarch);
    advance(match, 0.5);

    const fleet: number[] = [];
    for (let i = 0; i < 6; i++) {
      fleet.push(
        spawnUnit(match.world, {
          kind: UnitKind.Corvette,
          slot: 0,
          faction: Faction.Bathyarch,
          // Deliberately near-coincident: the worst case for a solver.
          x: 3000 + i * 2,
          y: 3000,
        })
      );
    }

    for (const eid of fleet) match.orderMove(0, eid, 3400, 3400);
    advance(match, 12);

    const closest = spread(fleet);
    const minimum = unitRadiusM(UnitKind.Corvette) * 2;
    assert.ok(
      closest >= minimum * 0.9,
      `hulls must keep station, closest pair ${closest.toFixed(1)}m vs ${minimum}m`
    );
  });

  it('corrects a hull against every neighbour it overlaps, not just the last one', () => {
    // A hull wedged between two others is the ordinary case in any formation,
    // and it is the case the pass used to get wrong: it read the hull's
    // position once per visit and then wrote an *absolute* correction per
    // overlapping pair, so every push but the last was silently overwritten.
    // The symptom was a hull that separated cleanly along one axis and stayed
    // buried along the other — still sharing an acoustic position with a
    // neighbour, which is the one thing this system exists to prevent.
    //
    // On open ground, and that has to be said: a push is a step now (#431),
    // and on the Ventfront Divide the cell west of this spot is a 380 m
    // plateau a 600 m hull cannot be pushed onto — which would read here as
    // the solver ignoring a neighbour when it is the ground refusing one.
    const match = new Match(undefined, {
      fauna: false,
      seed: 21,
      terrain: new Terrain(8000, 8000, 250, { floorM: 2600 }),
    });

    const radius = unitRadiusM(UnitKind.Corvette);
    // Comfortably inside a hull diameter, so both pairs genuinely overlap.
    const gap = 30;
    assert.ok(gap < radius * 2, 'the scenario only means anything if the hulls overlap');

    const originX = 3000;
    const originY = 3000;
    const hull = (x: number, y: number): number =>
      spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 0,
        faction: Faction.Bathyarch,
        x,
        y,
      });

    // Spawned first, so it holds the lowest id. Each pair is resolved from the
    // lower id, which is what puts *both* of this hull's corrections inside one
    // visit — and one visit is where they used to collide.
    const wedged = hull(originX, originY);
    const eastward = hull(originX + gap, originY);
    const southward = hull(originX, originY + gap);
    assert.ok(
      wedged < eastward && wedged < southward,
      'the wedged hull must own both pairs, or this never reaches the multi-neighbour path'
    );

    // One tick, deliberately: given a second the solver gets there either way,
    // and the claim under test is that a single pass answers both neighbours.
    advance(match, 1 / SIM.TICK_HZ);

    assert.ok(
      Position.x[wedged]! < originX - 1,
      `wedged hull ignored the neighbour on its x axis: x=${Position.x[wedged]!.toFixed(2)}, ` +
        `spawned at ${originX}`
    );
    assert.ok(
      Position.y[wedged]! < originY - 1,
      `wedged hull ignored the neighbour on its y axis: y=${Position.y[wedged]!.toFixed(2)}, ` +
        `spawned at ${originY}`
    );
  });

  it('separates hulls stacked at exactly the same point', () => {
    const match = new Match(undefined, { fauna: false, seed: 5 });
    match.addPlayer(0, Faction.Bathyarch);
    advance(match, 0.5);

    const a = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 2000,
      y: 2000,
    });
    const b = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 2000,
      y: 2000,
    });
    advance(match, 6);

    const d = Math.hypot(Position.x[a]! - Position.x[b]!, Position.y[a]! - Position.y[b]!);
    assert.ok(d > 0, 'exactly-coincident hulls must find an axis to separate along');
    assert.ok(d >= unitRadiusM(UnitKind.Cruiser) * 2 * 0.9, `pushed to ${d.toFixed(1)}m`);
  });

  it('keeps a corner-stacked pair in the water instead of throwing one off the map', () => {
    // Two hulls on one coordinate have no axis to separate along, so the pass
    // invents one — and an invented axis knows nothing about where the map
    // ends. Rallied into the north-west corner, that bearing is a coin flip
    // that always loses: each hull is displaced a full hull radius from the
    // shared spawn, and the walls here are 5 m away, so whatever bearing comes
    // out, one of the pair is pushed through one of them.
    //
    // Off the map is not a cosmetic state in this game. The hull is still
    // simulated and still radiating, so it goes on feeding the Echo Layer
    // contacts from water no order can reach and no torpedo can answer — an
    // emitter the player can hear and never silence. That is why every
    // position write now goes through terrain.clampXM/clampYM; this is the
    // separation write-back's half of that bargain.
    const match = new Match(undefined, { fauna: false, seed: 25 });
    const { widthM, heightM } = match.world.terrain;

    const radius = unitRadiusM(UnitKind.Cruiser);
    // Hard into the corner: nearer both walls than the distance the tie-break
    // is about to move each hull, so no bearing exists that keeps them both in
    // the water on its own.
    const x = 5;
    const y = 5;
    assert.ok(
      x < radius && y < radius,
      'the spawn must be tighter into the corner than the push it is about to take'
    );

    const pair = Array.from({ length: 2 }, () =>
      spawnUnit(match.world, {
        kind: UnitKind.Cruiser,
        slot: 0,
        faction: Faction.Bathyarch,
        x,
        y,
      })
    );
    advance(match, 4);

    for (const eid of pair) {
      const px = Position.x[eid]!;
      const py = Position.y[eid]!;
      assert.ok(
        px >= 0 && px <= widthM && py >= 0 && py <= heightM,
        `hull ${eid} was pushed out of the map to ${px.toFixed(2)},${py.toFixed(2)}`
      );
    }

    // The clamp must not buy that by leaving them stacked. A hull pinned
    // against the wall is still a separate acoustic position from the one
    // beside it, which is the entire point of the pass.
    const closest = spread(pair);
    assert.ok(
      closest >= radius * 2 * 0.9,
      `corner-pinned hulls stayed on top of one another, ${closest.toFixed(1)}m apart`
    );
  });

  it('unstacks a nine-hull crowd rather than jittering in place', () => {
    // A whole production run rallied onto one coordinate is the pathological
    // input for a steering solver: no axis to separate along, and every
    // correction feeding the next one. It has to actually converge — a crowd
    // that oscillates forever reads as a contact that pulses, and a pulsing
    // contact teaches the player nothing about how large the force is.
    //
    // A smoke test, and only that: it pins none of the #149 write-back fixes.
    // Ten seconds is 600 passes, and the last-write-wins bug cost the solver
    // iterations rather than the lattice it converged on, so this crowd came
    // apart the same way before the fix as after it. The single-pass claim is
    // the wedged-hull test above; the map-bounds claim is the corner test.
    const match = new Match(undefined, { fauna: false, seed: 22 });

    const x = 2800;
    const y = 5600;
    const crowd = Array.from({ length: 9 }, () =>
      spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 0,
        faction: Faction.Bathyarch,
        x,
        y,
      })
    );
    advance(match, 10);

    const closest = spread(crowd);
    const minimum = unitRadiusM(UnitKind.Corvette) * 2;
    assert.ok(
      closest >= minimum * 0.85,
      `the stack must come apart, closest pair ${closest.toFixed(1)}m vs ${minimum}m`
    );

    // Finiteness, because a crowd is where a division by a distance of zero
    // would surface if the coincident branch ever stopped catching a stacked
    // pair — one NaN position and the hull is nowhere, undrawable and
    // undetectable. The map-bounds check that used to sit here has moved to
    // the corner test above: this crowd settles some 2,200 m from the nearest
    // edge, so asserting it stayed on an 8,000 m map proved nothing.
    for (const eid of crowd) {
      const px = Position.x[eid]!;
      const py = Position.y[eid]!;
      assert.ok(Number.isFinite(px) && Number.isFinite(py), `hull ${eid} ended up at ${px},${py}`);
    }
  });

  it('keeps hulls out of structure footprints', () => {
    const match = new Match(undefined, { fauna: false, seed: 6 });
    match.addPlayer(0, Faction.Bathyarch);
    advance(match, 0.5);

    const refinery = spawnStructure(match.world, {
      kind: StructureKind.Refinery,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 5000,
      y: 5000,
      prebuilt: true,
    });
    const intruder = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 5000,
      y: 5000,
    });

    // Ordered straight at the middle of the building; it must not get there.
    match.orderMove(0, intruder, 5000, 5000);
    advance(match, 6);

    const d = Math.hypot(
      Position.x[intruder]! - Position.x[refinery]!,
      Position.y[intruder]! - Position.y[refinery]!
    );
    const clear =
      unitRadiusM(UnitKind.LightScout) + structureStatsFor(StructureKind.Refinery).radiusM;
    assert.ok(d > 0, 'the hull left the centre of the footprint');
    assert.ok(
      d >= clear * 0.85,
      `hull sits ${d.toFixed(1)}m out, needs about ${clear.toFixed(0)}m`
    );
  });

  it('pushes a hull out of a structure even when it is the only hull left', () => {
    // The test above with the fleet taken away. The pair guard used to sit on
    // the whole system rather than on the pair pass, so a commander down to
    // their last hull got no structure correction at all: order it onto your
    // own refinery and it parked inside the footprint until you built a second
    // hull. Losing a rule because you are losing the match is the worst
    // possible time for the rule to go.
    //
    // No addPlayer here on purpose — a starting base ships three escorts, and
    // three escorts are exactly what kept the pair guard satisfied.
    const match = new Match(undefined, { fauna: false, seed: 24 });

    const refinery = spawnStructure(match.world, {
      kind: StructureKind.Refinery,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 5000,
      y: 5000,
      prebuilt: true,
    });
    const lone = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 5000,
      y: 5000,
    });

    match.orderMove(0, lone, 5000, 5000);
    advance(match, 6);

    const d = Math.hypot(
      Position.x[lone]! - Position.x[refinery]!,
      Position.y[lone]! - Position.y[refinery]!
    );
    const clear =
      unitRadiusM(UnitKind.LightScout) + structureStatsFor(StructureKind.Refinery).radiusM;
    assert.ok(d > 0, 'a solitary hull is still evicted from the middle of a footprint');
    assert.ok(
      d >= clear * 0.85,
      `lone hull sits ${d.toFixed(1)}m out, needs about ${clear.toFixed(0)}m`
    );
  });

  describe('a move whose point lies inside a footprint (#1214)', () => {
    // A structure holds a hull out at any depth: separation reads plan distance
    // alone. So a point over a footprint is water the hull cannot reach, and a
    // move to it used to steer in and be pushed back out every tick, never
    // within `ARRIVAL_EPSILON_M`, holding every leg queued behind it. In open
    // water, since the default ground refuses the north of (5000, 5000) at the
    // depths used here.
    const SITE = { x: 2500, y: 6500 };

    function setup(seed: number, kind: UnitKind = UnitKind.LightScout) {
      const match = new Match(undefined, { fauna: false, seed });
      match.addPlayer(0, Faction.Bathyarch);
      advance(match, 0.5);
      const refinery = spawnStructure(match.world, {
        kind: StructureKind.Refinery,
        slot: 0,
        faction: Faction.Bathyarch,
        x: SITE.x,
        y: SITE.y,
        prebuilt: true,
      });
      const hull = spawnUnit(match.world, {
        kind,
        slot: 0,
        faction: Faction.Bathyarch,
        x: SITE.x - 1200,
        y: SITE.y,
      });
      const clear = unitRadiusM(kind) + structureStatsFor(StructureKind.Refinery).radiusM;
      return { match, refinery, hull, clear };
    }

    /** Put the hull 1,200 m south of the site, 40 m off its axis. */
    function fromTheSouth(hull: number): void {
      Position.x[hull] = SITE.x + 40;
      Position.y[hull] = SITE.y + 1200;
    }

    function outFrom(hull: number, refinery: number): number {
      return Math.hypot(
        Position.x[hull]! - Position.x[refinery]!,
        Position.y[hull]! - Position.y[refinery]!
      );
    }

    it('ends at the footprint edge, at whatever depth the point was ordered', () => {
      const { match, refinery, hull, clear } = setup(31);
      // 494 m is not the refinery's 600 m, which is the point: the edge is
      // the same at every depth, so the order is not one that reaches.
      match.orderMove(0, hull, SITE.x, SITE.y, false, 494);
      advance(match, 60);

      assert.equal(MoveOrder.active[hull], 0, 'the move ended rather than circling the footprint');
      const d = outFrom(hull, refinery);
      assert.ok(
        d >= clear * 0.85 && d <= clear + 15,
        `hull stopped ${d.toFixed(1)}m out, at the edge, which is about ${clear.toFixed(0)}m`
      );
      assert.ok(Position.x[hull]! < SITE.x, 'on the side it came from');
    });

    it('goes round to the edge nearest the point, not the one it met first', () => {
      // The Fifth's "home" point lies inside the works' Bastion, and the six
      // are counted on the far side of it: a hull stopped at first contact
      // would be on the wrong one. Off the axis by 40 m, so the slide round
      // the footprint has a side to take.
      const { match, refinery, hull, clear } = setup(34);
      fromTheSouth(hull);
      match.orderMove(0, hull, SITE.x, SITE.y - 100);
      advance(match, 40);

      assert.equal(MoveOrder.active[hull], 0, 'the move ended');
      const d = outFrom(hull, refinery);
      assert.ok(
        d >= clear * 0.85 && d <= clear + 15,
        `hull stopped ${d.toFixed(1)}m out, at the edge, which is about ${clear.toFixed(0)}m`
      );
      assert.ok(
        Position.y[hull]! < SITE.y - clear * 0.8,
        `on the side the point is on, not the side it came from (y=${Position.y[hull]!.toFixed(0)})`
      );
    });

    it('goes round when its course runs dead through the centre to the point', () => {
      // Straight through the middle: the push out and the course cancel, and
      // the hull sat pinned at the near edge with its move active. `setup`
      // puts the hull exactly on the axis, so there is no side to slide to
      // until the tie is broken (`SEPARATION.OPPOSITE_TIE_RAD`).
      const { match, refinery, hull, clear } = setup(35);
      match.orderMove(0, hull, SITE.x + 60, SITE.y);
      advance(match, 60);

      assert.equal(MoveOrder.active[hull], 0, 'the move ended');
      assert.ok(
        Position.x[hull]! > SITE.x + clear * 0.8,
        `on the far side, where the point is (x=${Position.x[hull]!.toFixed(0)})`
      );
      const d = outFrom(hull, refinery);
      assert.ok(d >= clear * 0.85 && d <= clear + 15, `at the edge, ${d.toFixed(1)}m out`);
    });

    it('begins the leg queued behind it', () => {
      const { match, hull } = setup(32);
      const next = { x: SITE.x + 1200, y: SITE.y + 200 };
      fromTheSouth(hull);
      match.orderMove(0, hull, SITE.x, SITE.y - 100, false, 494);
      match.orderMove(0, hull, next.x, next.y, true);
      // About 2.7 km at 120 m/s is 23 s. Not much longer: a parked hull drifts
      // after a minute or two of standing, which is no part of this test.
      advance(match, 45);

      const left = Math.hypot(Position.x[hull]! - next.x, Position.y[hull]! - next.y);
      assert.ok(left < 10, `the queued leg ran to its point, ${left.toFixed(0)}m short`);
    });

    it('carries an attack-move to the edge as well, and begins the leg behind it', () => {
      // Combat sends an attack-moving hull back to its destination whenever
      // the move is idle, and `busy()` holds the queue until it is reached: a
      // move rewritten and a destination left inside the footprint was the
      // same fault again, one order over.
      const { match, hull } = setup(36, UnitKind.Corvette);
      const next = { x: SITE.x + 1000, y: SITE.y + 200 };
      fromTheSouth(hull);
      match.orderAttackMove(0, hull, SITE.x, SITE.y - 100);
      match.orderMove(0, hull, next.x, next.y, true);
      advance(match, 90);

      assert.equal(Posture.engage[hull], 0, 'the attack-move was spent');
      const left = Math.hypot(Position.x[hull]! - next.x, Position.y[hull]! - next.y);
      assert.ok(left < 10, `the queued leg ran to its point, ${left.toFixed(0)}m short`);
    });

    it('leaves an order a system keeps re-asserting steering as it did', () => {
      // A harvester's run to its depot points at the depot's exact centre,
      // every tick, from `harvestSystem`. Nothing here may end it or zero the
      // hull's velocity: the acoustics pass reads that velocity, and a hauler
      // pinned at its depot's edge must read as under way, not as idle.
      const { match, hull, clear } = setup(37);
      Position.x[hull] = SITE.x - clear - 5;
      Position.y[hull] = SITE.y;
      for (let tick = 0; tick < 3 * SIM.TICK_HZ; tick++) {
        MoveOrder.x[hull] = SITE.x;
        MoveOrder.y[hull] = SITE.y;
        MoveOrder.active[hull] = 1;
        match.update(STEP_MS);
        assert.equal(MoveOrder.active[hull], 1, `tick ${tick}: the order was ended`);
        assert.ok(
          Math.hypot(Velocity.x[hull]!, Velocity.y[hull]!) > 0,
          `tick ${tick}: the hull's velocity was zeroed`
        );
      }
    });

    it('still reaches a point just outside the footprint', () => {
      // The control: the rule moves only points the footprint makes
      // unreachable, so a point a hull's width clear of it is still arrived at.
      const { match, hull, clear } = setup(33);
      const point = { x: SITE.x - clear - 40, y: SITE.y };
      match.orderMove(0, hull, point.x, point.y);
      advance(match, 60);

      const left = Math.hypot(Position.x[hull]! - point.x, Position.y[hull]! - point.y);
      assert.ok(left < 10, `the hull arrived, ${left.toFixed(1)}m from its point`);
    });
  });

  it('does not change what movement was already for', () => {
    // Separation is a correction, not a replacement: a lone unit must still
    // arrive exactly where it was sent, and silent running must still be slow.
    const match = new Match(undefined, { fauna: false, seed: 7 });
    match.addPlayer(0, Faction.Bathyarch);
    advance(match, 0.5);

    const lone = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 1500,
      y: 6500,
    });
    match.orderMove(0, lone, 2500, 6500);
    advance(match, 20);
    assert.ok(
      Math.hypot(Position.x[lone]! - 2500, Position.y[lone]! - 6500) < 10,
      'an unobstructed hull still arrives where it was sent'
    );

    const quiet = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 1500,
      y: 500,
    });
    SilentRunning.active[quiet] = 1;
    match.orderMove(0, quiet, 7000, 500);
    advance(match, 5);
    const travelled = Position.x[quiet]! - 1500;
    const full = statsFor(UnitKind.Corvette).speed * 5;
    assert.ok(travelled < full * 0.7, 'silent running still costs speed');
  });

  it('stays inside the 60 Hz per-tick work budget with a crowd', () => {
    // Counted work, not wall clock — and this assertion used to be the second
    // kind. It read `perTick < 8` over 300 steps, which is the exact pattern
    // the Echo pass's budget in match.test.ts abandoned after an eightfold
    // spread on identical work failed CI once. A crowd of 200 hulls on a
    // shared runner is the noisiest place in the suite to take that sample,
    // and a stopwatch cannot tell a busy runner from a broadphase that quietly
    // stopped pruning. The second is the failure worth catching, and the
    // counters in sim/stepWork.ts are what catch it.
    const HULLS = 200;
    const match = new Match(undefined, { fauna: false, seed: 8 });
    for (let slot = 0; slot < 4; slot++) match.addPlayer(slot, slot as Faction);
    // Deliberately clustered so separation has real work to do.
    for (let i = 0; i < HULLS; i++) {
      spawnUnit(match.world, {
        kind: (i % 5) as UnitKind,
        slot: i % 4,
        faction: (i % 4) as Faction,
        x: 3600 + ((i * 37) % 800),
        y: 3600 + ((i * 53) % 800),
      });
    }
    for (let i = 0; i < 120; i++) match.update(STEP_MS);

    const started = performance.now();
    const steps = 300;
    for (let i = 0; i < steps; i++) match.update(STEP_MS);
    const perTick = (performance.now() - started) / steps;
    const work = match.worstStepWork;

    // Every hull against every other is 19,900 pairs a tick before a single
    // structure is counted. Measured worst tick: 4,349. The budget is headroom
    // over that for ordinary tuning of SEPARATION.CELL_M, and nowhere near
    // enough to hide the grid going away.
    const PAIR_BUDGET = 8_000;
    assert.ok(
      work.separationPairs <= PAIR_BUDGET,
      `separation did ${work.separationPairs} pair tests in its worst tick, ` +
        `budget ${PAIR_BUDGET} (all-pairs would be ${(HULLS * (HULLS - 1)) / 2})`
    );
    assert.ok(
      work.separationPairs < (HULLS * (HULLS - 1)) / 2,
      'the broadphase must prune something — this is all-pairs or worse'
    );

    // The cheap half, and the one that catches a cell size that has drifted
    // away from the radii it is queried at: a grid too fine walks a rectangle
    // of empty water per hull, and neither failure moves the pair count.
    // Measured worst tick: 2,768.
    const CELL_BUDGET = 6_000;
    assert.ok(
      work.separationCells <= CELL_BUDGET,
      `separation probed ${work.separationCells} cells in its worst tick, budget ${CELL_BUDGET}`
    );

    // Target acquisition genuinely *is* all-pairs today — every shooter walks
    // every targetable entity — so this budget pins the current design rather
    // than proving a broadphase. That is still worth asserting: it is by far
    // the largest counted number in a crowded step (measured worst tick:
    // 38,528, against 8,619 for the whole of separation), so it is where the
    // 60 Hz step will run out of room first, and a change that walks the
    // candidates more than once per shooter fails here instead of arriving as
    // a frame-rate report.
    const ACQUISITION_BUDGET = 45_000;
    assert.ok(
      work.acquisitionPairs <= ACQUISITION_BUDGET,
      `combat considered ${work.acquisitionPairs} candidates in its worst tick, ` +
        `budget ${ACQUISITION_BUDGET}`
    );

    // The clock is still worth seeing, and still not worth failing on.
    console.log(
      `      separation crowd, ${HULLS} hulls: ${work.separationPairs} pair tests, ` +
        `${work.separationCells} cell probes, ${work.acquisitionPairs} acquisition candidates, ` +
        `worst tick ${match.worstStepMsCost.toFixed(3)} ms (${perTick.toFixed(3)} ms/tick mean)`
    );
  });

  it('does not raise the acquisition worst case by giving ordered guns point defence', () => {
    // #617 hoisted the point-defence scan above the ordered branch, so every
    // armed hull now walks the inbound list where only idle ones used to. The
    // owner's decision asked for that cost to be measured against the budget
    // above — "a saturation volley is the case to measure, not a quiet board".
    //
    // Measured here, 200 hulls with a 48-round volley fired into them from
    // standoff (44 alive at the peak), worst tick inside the volley window:
    //
    // | Hulls under an attack order | before #617 | after |
    // | --- | --- | --- |
    // | none | 49,557 | 49,557 |
    // | half | 27,538 | 30,810 |
    // | all  |  3,840 | 11,520 |
    //
    // The shape of that table is the argument, and it is not a coincidence of
    // this board. Acquisition work is *monotone decreasing* in the number of
    // hulls under an order, before and after alike, because an ordered shooter
    // skips the auto-acquire walk over every targetable entity on the map —
    // two hundred candidates here — and the inbound list it now walks instead
    // is a few dozen. So the maximum over every mix of orders is the all-idle
    // arm, and this change leaves that arm byte-identical. Hoisting the scan
    // cannot raise the worst case; it can only fill in the cheap end.
    //
    // The all-idle figure is over the 45,000 budget, and that is a finding
    // rather than a regression: it is the same 49,557 on `main`, it is the
    // idle scan that has always been there, and it is all-pairs against
    // ordnance exactly as the hull walk is all-pairs against hulls. It is not
    // asserted here, because pinning it would be recording a known overrun as
    // acceptable, and it is not #617's to fix. What is asserted is the part
    // this change is answerable for: the arm it adds cost to fits, and no arm
    // costs more than the idle one it is bounded by.
    const HULLS = 200;
    const VOLLEY = 48;

    const worstOverVolley = (orderedFraction: number): { work: number; live: number } => {
      const match = new Match(undefined, { fauna: false, seed: 8 });
      for (let slot = 0; slot < 4; slot++) match.addPlayer(slot, slot as Faction);
      const hulls: number[] = [];
      for (let i = 0; i < HULLS; i++) {
        hulls.push(
          spawnUnit(match.world, {
            kind: (i % 5) as UnitKind,
            slot: i % 4,
            faction: (i % 4) as Faction,
            x: 3600 + ((i * 37) % 800),
            y: 3600 + ((i * 53) % 800),
          })
        );
      }
      for (let i = 0; i < 120; i++) match.update(STEP_MS);

      // Standoff, and deliberately not seeking: a seeker inside a crowd this
      // dense detonates within a tick or two, which measures a board with
      // three rounds in the water rather than a saturation volley. Pointed
      // outward for the same reason. What is under test is the cost of the
      // scan, and the scan does not care why the round is where it is.
      const depth = Position.depth[hulls[0]!]!;
      for (let i = 0; i < VOLLEY; i++) {
        const bearing = (i * 2 * Math.PI) / VOLLEY;
        spawnOrdnance(match.world, {
          kind: OrdnanceKind.Torpedo,
          slot: 0,
          faction: Faction.Bathyarch,
          x: 4000 + 760 * Math.cos(bearing),
          y: 4000 + 760 * Math.sin(bearing),
          depth,
          heading: bearing,
          pressureRating: 2000,
          seekerHyd: 0,
        });
      }

      let work = 0;
      let live = 0;
      for (let t = 0; t < 120; t++) {
        // Re-applied every tick, and written to the field rather than ordered
        // through `Match`, for the reason countermeasures.test.ts gives: what
        // is under test is the state `combatSystem` reads. Re-applied because
        // hulls die in a crowd this dense and a lapsed order would quietly
        // turn an ordered arm back into an idle one.
        for (let i = 0; i < Math.round(HULLS * orderedFraction); i++) {
          const eid = hulls[i]!;
          const foe = hulls[(i + 1) % HULLS]!;
          if (Health.hp[eid]! > 0 && Health.hp[foe]! > 0) Weapon.orderedTargetEid[eid] = foe;
        }
        match.update(STEP_MS);
        work = Math.max(work, match.stepWorkLastTick.acquisitionPairs);
        let alive = 0;
        const inWater = liveOrdnance(match.world);
        for (let j = 0; j < inWater.length; j++) if (Health.hp[inWater[j]!]! > 0) alive++;
        live = Math.max(live, alive);
      }
      return { work, live };
    };

    const idle = worstOverVolley(0);
    const half = worstOverVolley(0.5);
    const ordered = worstOverVolley(1);

    const ACQUISITION_BUDGET = 45_000;
    assert.ok(
      ordered.work <= ACQUISITION_BUDGET,
      `every hull under an order considered ${ordered.work} candidates in its worst tick ` +
        `with ${ordered.live} rounds in the water, budget ${ACQUISITION_BUDGET}`
    );
    // The bound, and the reason the worst case cannot move: whatever an ordered
    // gun now spends on the inbound list, it was already saving on a candidate
    // walk that is longer. If this ever inverts, the scan has stopped being
    // bounded by the thing it replaced and the budget conversation is real.
    assert.ok(
      ordered.work <= half.work && half.work <= idle.work,
      `acquisition work must fall as orders are added, not rise: ` +
        `idle ${idle.work}, half ${half.work}, ordered ${ordered.work}`
    );

    console.log(
      `      saturation volley, ${HULLS} hulls, ${idle.live} rounds in the water: ` +
        `${idle.work} acquisition candidates idle, ${half.work} half-ordered, ` +
        `${ordered.work} all ordered (budget ${ACQUISITION_BUDGET}; the idle arm is the ` +
        `pre-existing all-pairs scan and is unchanged by #617)`
    );
  });

  it('counts the same work twice from one seed', () => {
    // The counters are only a budget if they are a property of the algorithm
    // rather than of the run. Two identical matches must agree exactly —
    // otherwise a threshold set from one machine's figure means nothing on
    // another, which is the whole complaint against the stopwatch above.
    const run = (): string => {
      const match = new Match(undefined, { fauna: false, seed: 21 });
      for (let slot = 0; slot < 2; slot++) match.addPlayer(slot, slot as Faction);
      for (let i = 0; i < 24; i++) {
        spawnUnit(match.world, {
          kind: (i % 5) as UnitKind,
          slot: i % 2,
          faction: (i % 2) as Faction,
          x: 3600 + ((i * 37) % 400),
          y: 3600 + ((i * 53) % 400),
        });
      }
      for (let i = 0; i < 180; i++) match.update(STEP_MS);
      return JSON.stringify(match.worstStepWork);
    };

    assert.equal(run(), run(), 'counted work must not depend on the run');
  });

  it('is deterministic', () => {
    const run = () => {
      const match = new Match(undefined, { fauna: false, seed: 9 });
      match.addPlayer(0, Faction.Bathyarch);
      advance(match, 0.5);
      const fleet = Array.from({ length: 8 }, (_, i) =>
        spawnUnit(match.world, {
          kind: UnitKind.Corvette,
          slot: 0,
          faction: Faction.Bathyarch,
          x: 4000,
          y: 4000 + i,
        })
      );
      advance(match, 5);
      return fleet.map((e) => `${Position.x[e]!.toFixed(6)},${Position.y[e]!.toFixed(6)}`);
    };
    assert.deepEqual(run(), run(), 'the coincident-hull tie-break must not vary between runs');
  });

  it('picks the same tie-break axis for a second match in the same process', () => {
    // The test above proves one match replays itself; this one proves a match
    // does not depend on what the *process* did before it. Two hulls on exactly
    // the same coordinate have no axis to separate along, so the pass invents
    // one — and it has to invent it from match-local ids. bitecs hands out
    // entity ids from a counter that keeps climbing for the life of the server,
    // so seeding the angle from those meant the fiftieth match of the day
    // unstacked a rally point differently from the first, and a replay taken
    // from one refused to reproduce in the other.
    const stackedPair = () => {
      const match = new Match(undefined, { fauna: false, seed: 23 });
      const x = 2200;
      const y = 2600;
      // Exactly the same coordinate, or the coincident branch never runs and
      // this test quietly stops testing anything.
      const pair = Array.from({ length: 2 }, () =>
        spawnUnit(match.world, {
          kind: UnitKind.Cruiser,
          slot: 0,
          faction: Faction.Bathyarch,
          x,
          y,
        })
      );
      advance(match, 4);
      // Relative to the shared spawn, so the comparison is about the axis the
      // tie-break chose and nothing else.
      return pair.map((eid) => ({ dx: Position.x[eid]! - x, dy: Position.y[eid]! - y }));
    };

    const first = stackedPair();
    const second = stackedPair();
    assert.ok(
      Math.hypot(first[0]!.dx, first[0]!.dy) > 0,
      'the pair must actually be separated for there to be an axis to compare'
    );
    assert.deepEqual(second, first, 'the tie-break must not notice how many matches preceded it');
  });

  it('leaves SEPARATION.STIFFNESS in a range that settles rather than oscillates', () => {
    assert.ok(SEPARATION.STIFFNESS > 0 && SEPARATION.STIFFNESS < 1);
  });
});
