/**
 * The refits in the water — docs/systems-progression.md §2: the Pressure Refit
 * (#517), and the Plate, the Drive, the Magazine and the Hold beside it (#1785).
 *
 * The roster half of this (who is offered what, at what price, to what
 * ceiling) is `packages/shared/test/refits.test.ts`. What is held here is
 * everything §2 says the *simulation* does with it, and each of these is a way
 * the mechanism would otherwise be a number in a table:
 *
 *   - it **takes the line**. "A navy refitting is a navy *not* building its
 *     second hull." A refit that ran beside the queue would be free yard-time,
 *     and free yard-time is the decision deleted.
 *   - it is **loud while it runs**, at the yard's own producing figure, because
 *     a purchased strength is bought on a production line and a production line
 *     is audibly running (§1's rule 1).
 *   - it reaches **every hull afloat and every hull launched afterwards**, which
 *     is what "fleet-wide" means and is the only part that closes #517: the
 *     Consortium's hauler is rated for the crystal field after it and was not
 *     before.
 *   - it **costs +2 SIG at idle and cruise and nowhere else**, because nothing
 *     gets quieter by getting stronger and nothing re-prices a state that is
 *     somebody else's number (§1's rule 2).
 *   - the **Order's is instant and sounded**, which is §2's one carve-out and
 *     the only reason an instant refit is allowed to exist at all.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasComponent } from 'bitecs';

import {
  CRYSTAL,
  DEPTH,
  ECHO_MARKS,
  ECONOMY,
  EchoMarkKind,
  Faction,
  HARVEST_THROTTLE,
  HarvestThrottle,
  ORDNANCE,
  RefitKind,
  ResourceKind,
  SILENT_RUNNING,
  SIM,
  StructureKind,
  UnitKind,
  effectivePressureRating,
  refitLineTimeS,
  refitPriceFor,
  refittedPressureRating,
  requiredPressureRating,
  statsFor,
  structureStatsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import {
  Acoustic,
  DepthOrder,
  Harvester,
  HarvestMode,
  Health,
  Magazine,
  MoveOrder,
  Owner,
  Position,
  Pressure,
  ResourceNode,
  SilentRunning,
  Unit,
  Velocity,
} from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { spawnStructure, spawnUnit } from '../src/sim/world.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): Map<number, EchoSnapshot> | null {
  let latest: Map<number, EchoSnapshot> | null = null;
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) {
    const result = match.update(STEP_MS);
    if (result !== null) latest = result;
  }
  return latest;
}

/**
 * A match with slot 0 seated as `faction`, one yard of the kind that navy buys
 * its refit at already standing, and both accounts full.
 *
 * The yard is seated pre-built rather than commissioned, because 120 s of
 * construction is not what any of these tests is about and the refusal on an
 * unfinished yard is asserted directly below.
 */
function withYard(faction: Faction, kind: StructureKind): { match: Match; yard: number } {
  const match = new Match(undefined, { fauna: false });
  match.addPlayer(0, faction);
  match.addPlayer(1, faction === Faction.Bathyarch ? Faction.Pelagia : Faction.Bathyarch);
  advance(match, 0.5);
  const home = bastionOf(match, 0);
  const yard =
    kind === StructureKind.Bastion
      ? home.eid
      : spawnStructure(match.world, {
          kind,
          slot: 0,
          faction,
          x: home.x + 400,
          y: home.y,
          prebuilt: true,
        });
  // And a tap, seated rather than built, so the yard's line runs at full rate.
  // A Slipway takes the Foundry's draw demand and the Bastion's own plant
  // covers exactly the opening kit, so a yard added to it starves — and a
  // starved line runs at the 25% floor, which would make every duration below
  // a number about Thermal Draw rather than about the refit.
  spawnStructure(match.world, {
    kind: StructureKind.VentTap,
    slot: 0,
    faction,
    x: home.x - 400,
    y: home.y,
    prebuilt: true,
  });
  const economy = match.world.economies.get(0)!;
  economy.nodules = 5000;
  economy.crystal = 500;
  return { match, yard };
}

function bastionOf(match: Match, slot: number): { eid: number; x: number; y: number } {
  const snapshot = advance(match, 0.4)!.get(slot)!;
  const bastion = snapshot.structures.find((s) => s.kind === StructureKind.Bastion)!;
  return { eid: bastion.id, x: bastion.x, y: bastion.y };
}

/** Every hull slot 0 owns, by entity. */
function hullsOf(match: Match, slot: number): number[] {
  const out: number[] = [];
  // Bounded by `maxEid` for the reason world.ts gives: the component stores
  // are sized to the world's capacity, not to what is in the water.
  for (let eid = 0; eid <= match.world.maxEid; eid++) {
    if (!hasComponent(match.world, Unit, eid)) continue;
    if (Owner.slot[eid] !== slot) continue;
    out.push(eid);
  }
  return out;
}

describe('the Pressure Refit', () => {
  it('takes the yard’s line, and the yard is loud for the whole of it', () => {
    const { match, yard } = withYard(Faction.Bathyarch, StructureKind.Slipway);
    const slipway = structureStatsFor(StructureKind.Slipway);

    assert.equal(match.refit(0, yard, RefitKind.Pressure), true);
    advance(match, 1);
    assert.equal(
      Acoustic.sig[yard],
      slipway.sigActive,
      'a yard running a refit is a yard running its line — SIG 70, not the idle 30'
    );

    // And it launches nothing while it does: a hull queued behind the refit
    // waits for the refit rather than beside it.
    assert.equal(match.produce(0, yard, UnitKind.Bulwark), true, 'the hull may be queued');
    const before = hullsOf(match, 0).length;
    advance(match, statsFor(UnitKind.Bulwark).buildTimeS + 5);
    assert.equal(hullsOf(match, 0).length, before, 'and does not launch while the refit runs');
  });

  it('reaches every hull afloat and every hull launched afterwards', () => {
    const { match, yard } = withYard(Faction.Bathyarch, StructureKind.Slipway);
    const afloat = hullsOf(match, 0);
    assert.ok(afloat.length > 0, 'the opening kit is in the water');
    const before = afloat.map((eid) => Pressure.rating[eid]!);

    assert.equal(match.refit(0, yard, RefitKind.Pressure), true);
    advance(match, refitLineTimeS(RefitKind.Pressure, Faction.Bathyarch) + 1);

    for (let i = 0; i < afloat.length; i++) {
      assert.equal(Pressure.rating[afloat[i]!], before[i]! + 1, 'every hull already in the water');
    }

    // And the keel of one laid after it. `spawnUnit` reads the navy's refits
    // rather than the roster alone, which is what "and every hull it launches
    // afterwards" means.
    const home = match.world;
    const fresh = spawnUnit(home, {
      kind: UnitKind.Harvester,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 1000,
      y: 1000,
    });
    assert.equal(Pressure.rating[fresh], 3, 'a hull launched after the refit is refitted');
  });

  it('is what makes the crystal field ordinary water for the navy that buys access', () => {
    // #517 in one assertion. The Consortium's hauler is PR-2, the field is at
    // 2,400 m, and PR-3 is what that depth asks for: before the refit the only
    // way down is a raid that costs 238 HP of a 300 HP hull, and after it the
    // field is ground.
    const { match, yard } = withYard(Faction.Bathyarch, StructureKind.Slipway);
    const needed = requiredPressureRating(CRYSTAL.FIELD_DEPTH_M);
    const hauler = hullsOf(match, 0).find((eid) => Unit.kind[eid] === UnitKind.Harvester)!;
    assert.ok(Pressure.rating[hauler]! < needed, 'and it could not, before');

    assert.equal(match.refit(0, yard, RefitKind.Pressure), true);
    advance(match, refitLineTimeS(RefitKind.Pressure, Faction.Bathyarch) + 1);
    assert.ok(Pressure.rating[hauler]! >= needed, 'the Consortium has a route to the deep');
  });

  it('costs +2 SIG at idle and cruise, and at no other state', () => {
    const { match, yard } = withYard(Faction.Bathyarch, StructureKind.Slipway);
    // A Corvette rather than one of the opening haulers: a harvester is at
    // work within a second of the match starting, and mining SIG is the
    // throttle's figure. What is being measured here is the state the refit
    // was sold against.
    const home = bastionOf(match, 0);
    const hull = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: home.x,
      y: home.y + 900,
    });
    advance(match, 0.2);
    const idleBefore = Acoustic.sig[hull]!;
    assert.equal(idleBefore, statsFor(UnitKind.Corvette).sigIdle, 'stopped, and doing nothing');

    assert.equal(match.refit(0, yard, RefitKind.Pressure), true);
    advance(match, refitLineTimeS(RefitKind.Pressure, Faction.Bathyarch) + 1);
    advance(match, 0.2);
    assert.equal(Acoustic.sig[hull], idleBefore + 2, 'the pumps that keep it trimmed');

    // Silent Running is the band's own figure, and a refit that added to it
    // would have re-priced a state it was never sold against — the exact
    // shape §1's rule 2 rules out.
    SilentRunning.active[hull] = 1;
    advance(match, 0.2);
    assert.ok(
      Acoustic.sig[hull]! <= SILENT_RUNNING.SIG_MAX,
      `silent running stays inside its band, not ${Acoustic.sig[hull]}`
    );
  });

  it('is bought once, at this navy’s own yard, and only with the crystal in hand', () => {
    const { match, yard } = withYard(Faction.Bathyarch, StructureKind.Slipway);
    const price = refitPriceFor(RefitKind.Pressure, Faction.Bathyarch);
    const economy = match.world.economies.get(0)!;

    // The Bastion is not where the Consortium buys it: §2 says the Slipway's
    // line "and nowhere else", and the Order is the only navy whose row says
    // otherwise.
    const bastion = advance(match, 0.4)!
      .get(0)!
      .structures.find((s) => s.kind === StructureKind.Bastion)!;
    assert.equal(match.refit(0, bastion.id, RefitKind.Pressure), false, 'not at a Bastion');

    economy.crystal = price.crystal - 1;
    assert.equal(match.refit(0, yard, RefitKind.Pressure), false, 'one crystal short is short');
    economy.crystal = price.crystal;
    economy.nodules = price.nodules;
    assert.equal(match.refit(0, yard, RefitKind.Pressure), true);
    assert.equal(economy.crystal, 0, 'and both accounts are charged');
    assert.equal(economy.nodules, 0);

    // A second refit on the same line is refused while the first runs, and a
    // second purchase is refused forever after it lands.
    economy.crystal = 500;
    economy.nodules = 5000;
    assert.equal(match.refit(0, yard, RefitKind.Pressure), false, 'one refit per line');
    advance(match, refitLineTimeS(RefitKind.Pressure, Faction.Bathyarch) + 1);
    assert.equal(match.refit(0, yard, RefitKind.Pressure), false, 'and one purchase per navy');
  });

  it('is refused outright to the navy that was born to it', () => {
    const { match, yard } = withYard(Faction.Directorate, StructureKind.Slipway);
    assert.equal(
      match.refit(0, yard, RefitKind.Pressure),
      false,
      'the Directorate starts at PR-3, so §2 offers it nothing'
    );
    assert.equal(match.world.refits.get(0), undefined);
  });

  it('stops the Commune at PR-2, which is why the Sower exists', () => {
    const { match, yard } = withYard(Faction.Pelagia, StructureKind.Slipway);
    const hulls = hullsOf(match, 0);
    const before = hulls.map((eid) => Pressure.rating[eid]!);
    assert.equal(match.refit(0, yard, RefitKind.Pressure), true, 'they may buy one');
    advance(match, refitLineTimeS(RefitKind.Pressure, Faction.Pelagia) + 1);
    for (let i = 0; i < hulls.length; i++) {
      const after = Pressure.rating[hulls[i]!]!;
      // The ceiling caps the gain and takes nothing (#1221): a hull born PR-3
      // keeps it, and no refit carries a lower one past PR-2.
      assert.ok(after >= before[i]!, `a Commune refit lowered a hull from PR-${before[i]}`);
      assert.ok(
        after <= Math.max(2, before[i]!),
        'no Commune refit reaches PR-3: the Abyssal is Deepbloom’s, not a thicker hull’s'
      );
    }
  });

  it('tells its owner the band each hull now owns, and rents it nothing (#1245)', () => {
    // The HUD's PR badge and crush warning read this number. The roster cannot
    // rebuild it: `effectivePressureRating` knows the hull and the navy, never
    // the purchase.
    const { match, yard } = withYard(Faction.Hadron, StructureKind.Bastion);
    const own = () => advance(match, 0.4)!.get(0)!.units;
    const before = own();
    assert.ok(before.length > 0, 'the opening kit is in the water');
    for (const unit of before) {
      assert.equal(unit.pressureRating, effectivePressureRating(unit.kind, Faction.Hadron));
    }

    assert.equal(match.refit(0, yard, RefitKind.Pressure), true);
    const after = own();
    assert.ok(
      after.some(
        (unit) => unit.pressureRating > effectivePressureRating(unit.kind, Faction.Hadron)
      ),
      'a hull of the kit reads a band the roster does not give it'
    );
    for (const unit of after) {
      assert.equal(unit.pressureRating, Pressure.rating[unit.id], 'the server’s own number');
      assert.equal(
        unit.pressureRating,
        refittedPressureRating(effectivePressureRating(unit.kind, Faction.Hadron), Faction.Hadron),
        `${UnitKind[unit.kind]} reads its refitted band`
      );
      assert.equal(unit.pressureBonus, 0, 'bought, not rented');
    }
  });

  it('lands instantly for the Order, and the Bastion says so', () => {
    const { match, yard } = withYard(Faction.Hadron, StructureKind.Bastion);
    const hulls = hullsOf(match, 0);
    const before = hulls.map((eid) => Pressure.rating[eid]!);

    assert.equal(match.refit(0, yard, RefitKind.Pressure), true);
    // No line: the fleet is refitted on the tick of the purchase, before a
    // single second of yard-time has passed.
    for (let i = 0; i < hulls.length; i++) {
      assert.equal(Pressure.rating[hulls[i]!], Math.min(3, before[i]! + 1));
    }
    assert.equal(match.world.production.get(yard)?.refit, undefined, 'and no line was taken');

    // And it is sounded, because an instant refit that emitted nothing would
    // be the quiet tech-up §1's rule 1 forbids.
    advance(match, 0.2);
    assert.equal(Acoustic.sig[yard], 80, 'the Bastion strikes SIG 80');
    advance(match, 16);
    assert.ok(Acoustic.sig[yard]! < 80, 'for 15 s, and then it is a Bastion again');
  });
});

/**
 * Buy a refit on slot 0's yard and run the line out, so each test below starts
 * from a navy that owns it and a fleet that was afloat when it landed.
 */
function fitted(match: Match, yard: number, kind: RefitKind, faction: Faction): void {
  assert.equal(match.refit(0, yard, kind), true, `${RefitKind[kind]} is bought`);
  advance(match, refitLineTimeS(kind, faction) + 1);
  assert.equal(match.world.refits.get(0)?.has(kind), true, `and the line delivers it`);
}

/** A Corvette of slot 0's at sea, stopped, well clear of every depot. */
function corvetteAt(match: Match, faction: Faction, x: number, y: number): number {
  return spawnUnit(match.world, { kind: UnitKind.Corvette, slot: 0, faction, x, y });
}

describe('the Plate Refit', () => {
  it('keeps every hull afloat at the condition it was in (#1785)', () => {
    const { match, yard } = withYard(Faction.Bathyarch, StructureKind.Slipway);
    const home = bastionOf(match, 0);
    const hurt = corvetteAt(match, Faction.Bathyarch, home.x, home.y + 900);

    // The line is run to a second before it lands and the fleet is read then,
    // so nothing between the reading and the grant has had time to move it.
    assert.equal(match.refit(0, yard, RefitKind.Plate), true);
    advance(match, refitLineTimeS(RefitKind.Plate, Faction.Bathyarch) - 1);
    const max = Health.max[hurt]!;
    Health.hp[hurt] = max / 2;
    Pressure.unhealable[hurt] = max / 4;
    const afloat = hullsOf(match, 0);
    const before = afloat.map((eid) => ({ hp: Health.hp[eid]!, max: Health.max[eid]! }));
    advance(match, 2);
    assert.equal(match.world.refits.get(0)?.has(RefitKind.Plate), true, 'it has landed');

    for (let i = 0; i < afloat.length; i++) {
      const eid = afloat[i]!;
      const was = before[i]!;
      const name = UnitKind[Unit.kind[eid]!];
      assert.ok(Math.abs(Health.max[eid]! / was.max - 1.15) < 1e-6, `${name}: +15% max hull`);
      assert.ok(
        Math.abs(Health.hp[eid]! / Health.max[eid]! - was.hp / was.max) < 1e-6,
        `${name} keeps its condition: ${was.hp}/${was.max} became ${Health.hp[eid]}/${Health.max[eid]}`
      );
    }
    // The hurt one, said plainly: half-sunk stays half-sunk, and the share
    // the deep took for good is still that share. A fleet-wide heal for money
    // is what the ruling rules out.
    assert.ok(Math.abs(Health.hp[hurt]! / Health.max[hurt]! - 0.5) < 1e-6);
    assert.ok(Math.abs(Pressure.unhealable[hurt]! / Health.max[hurt]! - 0.25) < 1e-6);
  });

  it('launches every later hull whole, at the bigger hull', () => {
    const { match, yard } = withYard(Faction.Bathyarch, StructureKind.Slipway);
    fitted(match, yard, RefitKind.Plate, Faction.Bathyarch);
    const home = bastionOf(match, 0);
    const fresh = corvetteAt(match, Faction.Bathyarch, home.x, home.y + 900);
    assert.equal(Health.max[fresh], Math.fround(statsFor(UnitKind.Corvette).maxHp * 1.15));
    assert.equal(Health.hp[fresh], Health.max[fresh], 'a new hull has no condition to keep');
  });

  it('costs +3 SIG under way, and nothing stopped', () => {
    const { match, yard } = withYard(Faction.Bathyarch, StructureKind.Slipway);
    fitted(match, yard, RefitKind.Plate, Faction.Bathyarch);
    const home = bastionOf(match, 0);
    const hull = corvetteAt(match, Faction.Bathyarch, home.x, home.y + 900);
    advance(match, 0.2);
    assert.equal(
      Acoustic.sig[hull],
      statsFor(UnitKind.Corvette).sigIdle,
      'plate is silent at rest'
    );
    MoveOrder.x[hull] = home.x + 3000;
    MoveOrder.y[hull] = home.y + 900;
    MoveOrder.active[hull] = 1;
    advance(match, 0.5);
    assert.equal(
      Acoustic.sig[hull],
      statsFor(UnitKind.Corvette).sigCruise + 3,
      'more mass pushes more water'
    );
  });
});

describe('the Drive Refit', () => {
  /** Slot 0's Corvette, sent east from one fixed point: its speed at cruise. */
  function cruise(match: Match, hull: number, x: number, y: number): number {
    Position.x[hull] = x;
    Position.y[hull] = y;
    MoveOrder.x[hull] = x + 3000;
    MoveOrder.y[hull] = y;
    MoveOrder.active[hull] = 1;
    advance(match, 0.3);
    const speed = Math.hypot(Velocity.x[hull]!, Velocity.y[hull]!);
    MoveOrder.active[hull] = 0;
    advance(match, 0.1);
    return speed;
  }

  /** Metres a hull covers in one second of a depth order from `fromM` to `toM`. */
  function verticalLeg(match: Match, hull: number, fromM: number, toM: number): number {
    Position.depth[hull] = fromM;
    DepthOrder.targetM[hull] = toM;
    DepthOrder.active[hull] = 1;
    advance(match, 1);
    const covered = Math.abs(Position.depth[hull]! - fromM);
    DepthOrder.active[hull] = 0;
    return covered;
  }

  it('makes every hull a tenth faster across, down and up', () => {
    const { match, yard } = withYard(Faction.Bathyarch, StructureKind.Slipway);
    const home = bastionOf(match, 0);
    const hull = corvetteAt(match, Faction.Bathyarch, home.x, home.y + 900);
    const x = home.x;
    const y = home.y + 900;

    const speed = cruise(match, hull, x, y);
    const down = verticalLeg(match, hull, 600, 1000);
    const up = verticalLeg(match, hull, 1000, 600);
    assert.ok(speed > 0, 'the hull was under way');
    assert.ok(Math.abs(down - DEPTH.DESCENT_RATE_MPS) < 0.5, `the roster's descent, not ${down}`);
    assert.ok(Math.abs(up - DEPTH.ASCENT_RATE_MPS) < 0.5, `the roster's ascent, not ${up}`);

    fitted(match, yard, RefitKind.Drive, Faction.Bathyarch);
    // The hull was afloat when the refit landed, and is faster on the next leg
    // without having been walked: speed is read live from the navy's refits.
    assert.ok(Math.abs(cruise(match, hull, x, y) / speed - 1.1) < 1e-4, '+10% speed');
    assert.ok(
      Math.abs(verticalLeg(match, hull, 600, 1000) / down - 1.1) < 1e-3,
      'descent included'
    );
    assert.ok(Math.abs(verticalLeg(match, hull, 1000, 600) / up - 1.1) < 1e-3, 'and ascent');
  });

  it('costs +4 SIG stopped and under way', () => {
    const { match, yard } = withYard(Faction.Bathyarch, StructureKind.Slipway);
    fitted(match, yard, RefitKind.Drive, Faction.Bathyarch);
    const home = bastionOf(match, 0);
    const hull = corvetteAt(match, Faction.Bathyarch, home.x, home.y + 900);
    advance(match, 0.2);
    assert.equal(
      Acoustic.sig[hull],
      statsFor(UnitKind.Corvette).sigIdle + 4,
      'a bigger drive is louder standing still'
    );
    MoveOrder.x[hull] = home.x + 3000;
    MoveOrder.y[hull] = home.y + 900;
    MoveOrder.active[hull] = 1;
    advance(match, 0.5);
    assert.equal(Acoustic.sig[hull], statsFor(UnitKind.Corvette).sigCruise + 4);
  });
});

describe('the Magazine Refit', () => {
  it('loads the third torpedo at a depot, never at sea (#1785)', () => {
    const { match, yard } = withYard(Faction.Bathyarch, StructureKind.Slipway);
    const home = bastionOf(match, 0);
    const hull = corvetteAt(match, Faction.Bathyarch, home.x, home.y + 1500);
    // Out of every depot's reach, so nothing below is a rearm by accident.
    for (const depot of advance(match, 0.2)!.get(0)!.structures) {
      if (depot.kind !== StructureKind.Bastion && depot.kind !== StructureKind.Foundry) continue;
      const d = Math.hypot(depot.x - Position.x[hull]!, depot.y - Position.y[hull]!);
      assert.ok(d > ORDNANCE.TORPEDO.REARM_RANGE_M, 'the test hull is at sea');
    }
    assert.equal(Magazine.torpedoes[hull], 2, 'the roster’s two');

    fitted(match, yard, RefitKind.Magazine, Faction.Bathyarch);
    assert.equal(Magazine.torpedoes[hull], 2, 'the field never refills a magazine');

    Position.x[hull] = home.x;
    Position.y[hull] = home.y + 250;
    advance(match, ORDNANCE.TORPEDO.REARM_TIME_S + 1);
    assert.equal(Magazine.torpedoes[hull], 3, 'and the next rearm loads the third tube');
    advance(match, ORDNANCE.TORPEDO.REARM_TIME_S + 1);
    assert.equal(Magazine.torpedoes[hull], 3, 'and stops there');
  });

  it('launches later hulls with three, and leaves the Broadside its own four', () => {
    const { match, yard } = withYard(Faction.Bathyarch, StructureKind.Slipway);
    fitted(match, yard, RefitKind.Magazine, Faction.Bathyarch);
    const home = bastionOf(match, 0);
    const fresh = corvetteAt(match, Faction.Bathyarch, home.x, home.y + 1500);
    assert.equal(
      Magazine.torpedoes[fresh],
      3,
      'a hull launched after it leaves the yard with three'
    );
    const broadside = spawnUnit(match.world, {
      kind: UnitKind.Broadside,
      slot: 0,
      faction: Faction.Bathyarch,
      x: home.x,
      y: home.y + 1800,
    });
    assert.equal(Magazine.torpedoes[broadside], 4, 'the alpha strike keeps the number it argues');
    // And nothing on the hull: "the torpedo is loud for its whole run already".
    advance(match, 0.2);
    assert.equal(Acoustic.sig[fresh], statsFor(UnitKind.Corvette).sigIdle);
  });
});

describe('the Hold Refit', () => {
  /** Every live resource node of one kind, by entity. */
  function nodeOf(match: Match, kind: ResourceKind): number {
    for (let eid = 0; eid <= match.world.maxEid; eid++) {
      if (!hasComponent(match.world, ResourceNode, eid)) continue;
      if (ResourceNode.kind[eid] === kind && ResourceNode.remaining[eid]! > 0) return eid;
    }
    throw new Error(`the map seeds a ${ResourceKind[kind]} field`);
  }

  it('fills a fifth more at every throttle, on both resources, and turns for home', () => {
    // Set on the cut directly rather than sailed there: the trip is not what
    // is being measured, the hold is. A Directorate hauler, because it is
    // rated for the crystal field and will not bleed while it works it.
    const { match } = withYard(Faction.Directorate, StructureKind.Slipway);
    match.world.refits.set(0, new Set([RefitKind.Hold]));
    const hauler = hullsOf(match, 0).find((eid) => Unit.kind[eid] === UnitKind.Harvester)!;
    const throttles = [
      HarvestThrottle.Trickle,
      HarvestThrottle.Standard,
      HarvestThrottle.Overburden,
    ];
    for (const resource of [ResourceKind.Nodule, ResourceKind.ResonanceCrystal]) {
      const standard =
        resource === ResourceKind.ResonanceCrystal
          ? CRYSTAL.CARGO_CAPACITY
          : ECONOMY.CARGO_CAPACITY_NODULES;
      for (const throttle of throttles) {
        const label = `${ResourceKind[resource]} at ${HarvestThrottle[throttle]}`;
        Harvester.throttle[hauler] = throttle;
        Harvester.cargo[hauler] = 0;
        Harvester.nodeEid[hauler] = nodeOf(match, resource);
        Harvester.mode[hauler] = HarvestMode.Mining;
        // A tick at a time, and stopped on the tick the cut ends: the hauler
        // is sitting by its own depot, so a coarser step lets it bank the load
        // and set off again before anything reads it. Thirty seconds is the
        // slowest cut there is — Overburden crystal, at 45% of the nodule
        // rate — with room to spare.
        for (let tick = 0; tick < 30 * SIM.TICK_HZ; tick++) {
          if (Harvester.mode[hauler] !== HarvestMode.Mining) break;
          match.update(STEP_MS);
        }
        assert.equal(
          Harvester.mode[hauler],
          HarvestMode.ToDepot,
          `${label}: the full hold turns home`
        );
        const hold = standard * HARVEST_THROTTLE[throttle].cargoMultiplier * 1.2;
        assert.ok(
          Math.abs(Harvester.cargo[hauler]! - hold) < 1e-4,
          `${label}: a hold of ${hold}, not ${Harvester.cargo[hauler]}`
        );
      }
    }
  });

  it('is bought on the line, and a Standard load is sixty, which hums louder', () => {
    const { match, yard } = withYard(Faction.Bathyarch, StructureKind.Slipway);
    const hauler = hullsOf(match, 0).find((eid) => Unit.kind[eid] === UnitKind.Harvester)!;
    // Every industrial hum laid, by what it weighed: the hum is measured in
    // Standard holds (docs/economy.md §5), so the refit's noise is a heavier
    // mark per delivery — "more per delivery is a louder economy" (§2).
    const hums: number[] = [];
    const marks = match.world.marks;
    const lay = marks.add.bind(marks);
    marks.add = (kind, x, y, depthM, intensity) => {
      if (kind === EchoMarkKind.IndustrialHum) hums.push(intensity ?? 1);
      lay(kind, x, y, depthM, intensity);
    };
    const heaviest = (seconds: number): number => {
      let most = 0;
      const steps = Math.ceil((seconds * 1000) / STEP_MS);
      for (let i = 0; i < steps; i++) {
        match.update(STEP_MS);
        most = Math.max(most, Harvester.cargo[hauler]!);
      }
      return most;
    };
    assert.equal(heaviest(90), ECONOMY.CARGO_CAPACITY_NODULES, 'fifty a load before');
    assert.ok(hums.includes(ECHO_MARKS.HUM_PER_DELIVERY), 'and a Standard delivery is one hold');
    fitted(match, yard, RefitKind.Hold, Faction.Bathyarch);
    hums.length = 0;
    assert.equal(heaviest(90), ECONOMY.CARGO_CAPACITY_NODULES * 1.2, 'and sixty after');
    assert.ok(
      hums.some((hum) => Math.abs(hum - ECHO_MARKS.HUM_PER_DELIVERY * 1.2) < 1e-9),
      `a refitted delivery hums at 1.2 holds, not ${hums.join(', ')}`
    );
  });
});

describe('one copy of a refit a navy', () => {
  it('refuses a second yard the refit another is already running (#1785)', () => {
    // §2: "five, fleet-wide, once each". A second Slipway buys a second line
    // for a different refit or a hull, never a second copy of the one running.
    const { match, yard } = withYard(Faction.Bathyarch, StructureKind.Slipway);
    const home = bastionOf(match, 0);
    const second = spawnStructure(match.world, {
      kind: StructureKind.Slipway,
      slot: 0,
      faction: Faction.Bathyarch,
      x: home.x,
      y: home.y + 600,
      prebuilt: true,
    });
    const economy = match.world.economies.get(0)!;
    assert.equal(match.refit(0, yard, RefitKind.Plate), true, 'the first yard takes it');
    const charged = { nodules: economy.nodules, crystal: economy.crystal };
    assert.equal(match.refit(0, second, RefitKind.Plate), false, 'the second may not run it too');
    assert.deepEqual({ nodules: economy.nodules, crystal: economy.crystal }, charged, 'nor charge');
    assert.equal(match.world.production.get(second)?.refit, undefined, 'nor take its line');
    assert.equal(match.refit(0, second, RefitKind.Drive), true, 'a different refit, it may');
  });
});

describe('the Order’s other four refits', () => {
  it('are bought on a Slipway’s line at the standard terms, not struck at the Bastion', () => {
    // §2's Knights row: "Standard on the line — except the one below". Only the
    // Pressure Refit is the instant, sounded chord.
    const { match, yard } = withYard(Faction.Hadron, StructureKind.Slipway);
    const home = bastionOf(match, 0);
    for (const kind of [RefitKind.Plate, RefitKind.Drive, RefitKind.Magazine, RefitKind.Hold]) {
      assert.equal(match.refit(0, home.eid, kind), false, `${RefitKind[kind]} is not struck`);
    }
    const economy = match.world.economies.get(0)!;
    const before = { nodules: economy.nodules, crystal: economy.crystal };
    assert.equal(match.refit(0, yard, RefitKind.Plate), true, 'it is bought on the line');
    const price = refitPriceFor(RefitKind.Plate, Faction.Hadron);
    assert.deepEqual(price, { nodules: 250, crystal: 60, biomass: 0 }, 'at the row’s price');
    assert.equal(economy.nodules, before.nodules - 250);
    assert.equal(economy.crystal, before.crystal - 60);
    assert.equal(match.world.production.get(yard)?.refit?.kind, RefitKind.Plate, 'taking the line');
    assert.equal(refitLineTimeS(RefitKind.Plate, Faction.Hadron), 90, 'for the row’s 90 s');
    advance(match, 1);
    assert.equal(Acoustic.sig[yard], structureStatsFor(StructureKind.Slipway).sigActive);
    assert.ok(Acoustic.sig[home.eid]! < 80, 'and the Bastion strikes nothing');
  });
});
