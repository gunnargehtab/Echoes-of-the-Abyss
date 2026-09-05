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
import {
  Faction,
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
import { spawnStructure, spawnUnit } from '../src/sim/world.ts';
import { Position, SilentRunning } from '../src/sim/components.ts';

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

  it('stays inside the 60 Hz per-tick budget with a crowd', () => {
    const match = new Match(undefined, { fauna: false, seed: 8 });
    for (let slot = 0; slot < 4; slot++) match.addPlayer(slot, slot as Faction);
    // 200 hulls, deliberately clustered so separation has real work to do.
    for (let i = 0; i < 200; i++) {
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

    // The whole 60 Hz step gets 16.6 ms; this asserts the entire sim stays
    // well inside it with a crowd, which is the number that actually matters.
    assert.ok(perTick < 8, `whole-sim tick averaged ${perTick.toFixed(3)} ms with 200 hulls`);
    console.log(`      separation crowd: whole sim ${perTick.toFixed(3)} ms/tick, 200 hulls`);
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
