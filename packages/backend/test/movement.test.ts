/**
 * Movement (#149).
 *
 * Movement had no suite of its own, which is odd for the system every other
 * system reads from: the Echo Layer resolves against positions movement wrote,
 * separation corrects them, and depth is only a commitment timer because a
 * hull spends real seconds getting somewhere. It was covered incidentally, by
 * tests that needed a hull to arrive before they could assert something else.
 *
 * The claims below are the ones movement actually owns, and they are not all
 * the same kind of test. Two are #149 regressions and fail against the code as
 * it stood: arrival, because the epsilon used to be a local const inside
 * movement.ts that no tuning could reach, and bounds, because an off-map move
 * order used to be followed off the map. The rest — Silent Running's speed tax,
 * Pelagia's discount, and the velocity acoustics reads — are new coverage
 * rather than regressions. That arithmetic is byte-for-byte what it was before
 * #149 and would pass against the old code unchanged. They are here because
 * movement's most doctrinally loaded behaviour had never been asserted
 * anywhere, and a doctrine claim deserves better than being held up by the
 * constant that states it.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Faction,
  HAZARDS,
  MOVEMENT,
  SILENT_RUNNING,
  SIM,
  UnitKind,
  statsFor,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { MoveOrder, Position, Velocity } from '../src/sim/components.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): void {
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) match.update(STEP_MS);
}

/** One tick of travel at full speed — the slack any arrival check has to allow. */
function tickTravelM(kind: UnitKind): number {
  return statsFor(kind).speed / SIM.TICK_HZ;
}

describe('movement', () => {
  it('arrives on the epsilon the tuning owns, not one of its own', () => {
    // Arrival is not "close enough to draw in the right place" — it is the
    // moment the order is spent. A hull that keeps its MoveOrder after landing
    // is a hull the order queue will never advance past.
    //
    // Measuring the miss against MOVEMENT.ARRIVAL_EPSILON_M would be circular:
    // the constant could read 500 and a tolerance quoting it back would still
    // hold. So the test moves the constant instead. `as const` is a
    // compile-time claim and not Object.freeze, so the value is writable at
    // runtime, and movement.ts reads the property per tick rather than copying
    // it at module load — verified, not assumed. Widen it to 400 m and a system
    // reading the shared tuning stops 400 m out; the local const this fix
    // removed stops at 5 m and cannot be reached from here at all.
    const WIDE_EPSILON_M = 400;
    const tuning = MOVEMENT as { ARRIVAL_EPSILON_M: number };
    const original = tuning.ARRIVAL_EPSILON_M;

    let miss = Number.NaN;
    let stillOrdered = true;
    try {
      tuning.ARRIVAL_EPSILON_M = WIDE_EPSILON_M;

      const match = new Match(undefined, { fauna: false, seed: 21 });
      match.addPlayer(0, Faction.Bathyarch);
      advance(match, 0.5);

      const hull = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 0,
        faction: Faction.Bathyarch,
        x: 5000,
        y: 5800,
      });
      match.orderMove(0, hull, 6000, 5800);

      // 1 km at 85 m/s is under 12 s even without the widened epsilon; 20 gives
      // it room to settle.
      advance(match, 20);

      miss = Math.hypot(Position.x[hull]! - 6000, Position.y[hull]! - 5800);
      stillOrdered = !!MoveOrder.active[hull];
    } finally {
      // Restored before anything can throw: an assertion failure that left the
      // epsilon at 400 m would corrupt every later test in this process, and
      // the report would blame the wrong system.
      tuning.ARRIVAL_EPSILON_M = original;
    }

    assert.ok(!stillOrdered, 'an arrived hull is no longer under orders');
    // The stop happens on the first tick that finds itself already inside the
    // epsilon, so the hull lands within one tick of travel of that ring —
    // never at the target, and never short of the ring by more than a step.
    const slack = tickTravelM(UnitKind.Corvette);
    assert.ok(
      miss <= WIDE_EPSILON_M + slack && miss >= WIDE_EPSILON_M - slack,
      `hull stopped ${miss.toFixed(2)}m out; a system reading the shared epsilon ` +
        `stops within one tick of ${WIDE_EPSILON_M}m`
    );
  });

  it('writes a velocity the Echo Layer can price', () => {
    // New coverage, not a #149 regression. Velocity is the one thing movement
    // writes that movement itself never reads: acousticsSystem measures it
    // against MOVING_EPSILON to decide whether a hull is priced at its cruise
    // SIG or its idle SIG. A hull that travelled without reporting a velocity
    // would cross the map at idle loudness — the quietest bug in the game, and
    // invisible to every test that only checks where hulls ended up.
    const match = new Match(undefined, { fauna: false, seed: 33 });
    match.addPlayer(0, Faction.Bathyarch);
    advance(match, 0.5);

    const hull = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    // Due north, so the sign of each axis is a claim and not an accident.
    match.orderMove(0, hull, 4000, 5000);
    advance(match, 1);

    const speed = statsFor(UnitKind.Corvette).speed;
    assert.ok(
      Math.abs(Math.hypot(Velocity.x[hull]!, Velocity.y[hull]!) - speed) < 0.01,
      `a hull under orders reports its cruise speed, not ${Math.hypot(
        Velocity.x[hull]!,
        Velocity.y[hull]!
      ).toFixed(2)}`
    );
    assert.ok(Velocity.y[hull]! > 0, 'a hull ordered north reports northward velocity');
    assert.ok(Math.abs(Velocity.x[hull]!) < 0.01, 'and no sideways component it was never given');

    advance(match, 20);
    assert.ok(!MoveOrder.active[hull], 'the hull arrived, so the rest is about a hull at rest');
    // Zeroed on arrival, and this is the half that matters acoustically: a
    // parked hull holding a stale velocity would keep announcing itself at
    // cruise SIG while sitting still.
    assert.equal(Velocity.x[hull], 0, 'an arrived hull stops reporting motion');
    assert.equal(Velocity.y[hull], 0, 'on both axes');
  });

  it('charges speed for silence', () => {
    // New coverage, not a #149 regression — the speed maths is unchanged by
    // that issue. It is worth pinning anyway: everything that makes you strong
    // makes you loud, and the inverse is the deal Silent Running offers, so
    // quiet is bought with time. Two identical hulls, same order, same window —
    // the only difference is the switch.
    const match = new Match(undefined, { fauna: false, seed: 22 });
    match.addPlayer(0, Faction.Bathyarch);
    advance(match, 0.5);

    const START_X = 600;
    const spawn = (y: number) =>
      spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 0,
        faction: Faction.Bathyarch,
        x: START_X,
        y,
      });
    // Lanes 400 m apart: far enough that separation never touches either hull,
    // so the only thing being measured is speed.
    const loud = spawn(2200);
    const quiet = spawn(2600);
    match.setSilentRunning(0, quiet, true);

    // 7 km away on purpose. Arrival would truncate the slower hull's distance
    // and quietly turn this into a test of the epsilon instead.
    match.orderMove(0, loud, 7600, 2200);
    match.orderMove(0, quiet, 7600, 2600);
    advance(match, 10);

    assert.ok(MoveOrder.active[loud], 'neither hull may arrive inside the window');
    assert.ok(MoveOrder.active[quiet], 'neither hull may arrive inside the window');

    const loudM = Position.x[loud]! - START_X;
    const quietM = Position.x[quiet]! - START_X;
    const ratio = quietM / loudM;
    assert.ok(
      Math.abs(ratio - SILENT_RUNNING.SPEED_MULTIPLIER) < 0.02,
      `silent hull covered ${ratio.toFixed(3)} of the loud one's ${loudM.toFixed(0)}m, ` +
        `spec says ${SILENT_RUNNING.SPEED_MULTIPLIER}`
    );
  });

  it('charges Pelagia less for the same silence', () => {
    // Also new coverage rather than a #149 regression. docs/systems-echo.md §6:
    // Pelagia lose 20% where everyone else loses 45%. This is the faction's
    // whole proposition — they can move while quiet — so it is asserted as a
    // doctrine claim rather than left to the constant that encodes it.
    const match = new Match(undefined, { fauna: false, seed: 23 });
    match.addPlayer(0, Faction.Pelagia);
    advance(match, 0.5);

    const START_X = 600;
    const spawn = (y: number) =>
      spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 0,
        faction: Faction.Pelagia,
        x: START_X,
        y,
      });
    const loud = spawn(2200);
    const quiet = spawn(2600);
    match.setSilentRunning(0, quiet, true);

    match.orderMove(0, loud, 7600, 2200);
    match.orderMove(0, quiet, 7600, 2600);
    advance(match, 10);

    assert.ok(MoveOrder.active[loud] && MoveOrder.active[quiet], 'neither hull arrived');

    const ratio = (Position.x[quiet]! - START_X) / (Position.x[loud]! - START_X);
    assert.ok(
      Math.abs(ratio - SILENT_RUNNING.PELAGIA_SPEED_MULTIPLIER) < 0.02,
      `Pelagia silent hull covered ${ratio.toFixed(3)}, doctrine says ` +
        `${SILENT_RUNNING.PELAGIA_SPEED_MULTIPLIER}`
    );
    assert.ok(
      ratio > SILENT_RUNNING.SPEED_MULTIPLIER,
      'Pelagia must pay strictly less for silence than everyone else'
    );
  });

  it('clamps an out-of-bounds order instead of rejecting it', () => {
    // A click past the edge of the map is a legible instruction — go as far
    // that way as the water goes — so the order is accepted and the target is
    // clamped. That is the distinction against orderDepth, which rejects: a
    // depth below the sea floor names a place that is not there, while a point
    // past the west wall names a direction. What must never happen is the hull
    // following the raw click off the map: still simulated, still audible, and
    // unreachable by any order the player could give afterwards.
    const match = new Match(undefined, { fauna: false, seed: 24 });
    match.addPlayer(0, Faction.Bathyarch);
    advance(match, 0.5);
    const { terrain } = match.world;

    // Parked one short diagonal from their corners. The claim is about where
    // the order lands, not about how far a scout can swim, so the leg is only
    // as long as it needs to be to prove the hull moved.
    const LEG_M = 600;
    const northwest = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 0,
      faction: Faction.Bathyarch,
      x: LEG_M,
      y: LEG_M,
    });
    const southeast = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 0,
      faction: Faction.Bathyarch,
      x: terrain.widthM - LEG_M,
      y: terrain.heightM - LEG_M,
    });

    match.orderMove(0, northwest, -9000, -9000);
    match.orderMove(0, southeast, terrain.widthM + 9000, terrain.heightM + 9000);

    assert.ok(MoveOrder.active[northwest], 'an off-map click is an order, not an error');
    assert.ok(MoveOrder.active[southeast], 'an off-map click is an order, not an error');
    assert.equal(MoveOrder.x[northwest], 0, 'negative target clamped to the west wall');
    assert.equal(MoveOrder.y[northwest], 0, 'negative target clamped to the north wall');
    assert.equal(MoveOrder.x[southeast], terrain.widthM, 'target clamped to the east wall');
    assert.equal(MoveOrder.y[southeast], terrain.heightM, 'target clamped to the south wall');

    // The window is derived rather than picked: one diagonal leg at scout
    // speed, and then at the 70% a resonance storm charges a Bathyarch hull
    // crossing it (docs/hazards.md §5). A speed tune or an unlucky storm then
    // costs the test time instead of surfacing as a phantom bounds failure.
    const crawlSpeed =
      statsFor(UnitKind.LightScout).speed * HAZARDS.STORM.BATHYARCH_SPEED_MULTIPLIER;
    advance(match, Math.hypot(LEG_M, LEG_M) / crawlSpeed + 1);

    // Each hull did go where it was pointed — clamping the target must not be a
    // dressed-up way of ignoring the order. They stop on the clamped target
    // under the same arrival rule as any other order, so the wall is a
    // destination like any other rather than a special case.
    const slack = MOVEMENT.ARRIVAL_EPSILON_M + tickTravelM(UnitKind.LightScout);
    assert.ok(
      Math.hypot(Position.x[northwest]!, Position.y[northwest]!) <= slack,
      'the hull sent off the northwest corner arrived at the corner'
    );
    assert.ok(
      Math.hypot(
        Position.x[southeast]! - terrain.widthM,
        Position.y[southeast]! - terrain.heightM
      ) <= slack,
      'the hull sent off the southeast corner arrived at the corner'
    );
    // Checked once, at rest, rather than swept every tick. Nothing in this
    // scenario is pushing these hulls: on this seed the nearest other unit
    // stays 850 m off — against a 60 m scout hull, so separation never looks
    // at them — and the nearest hazard edge is 3.7 km away. A per-tick sweep
    // would only re-detect the clamped order asserted above, several hundred
    // times over. The clamp's other two callers, separation's write-back and
    // eruption knockback, are pinned in their own suites, where something is
    // genuinely shoving.
    for (const eid of [northwest, southeast]) {
      const x = Position.x[eid]!;
      const y = Position.y[eid]!;
      assert.ok(
        x >= 0 && x <= terrain.widthM && y >= 0 && y <= terrain.heightM,
        `hull ${eid} came to rest off the map at ${x.toFixed(1)}, ${y.toFixed(1)}`
      );
    }
  });
});
