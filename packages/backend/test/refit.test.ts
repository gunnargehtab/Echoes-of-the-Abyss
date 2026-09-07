/**
 * The Pressure Refit in the water — docs/systems-progression.md §2, #517.
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
  Faction,
  RefitKind,
  SILENT_RUNNING,
  SIM,
  StructureKind,
  UnitKind,
  refitLineTimeS,
  refitPriceFor,
  requiredPressureRating,
  statsFor,
  structureStatsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { Acoustic, Owner, Pressure, SilentRunning, Unit } from '../src/sim/components.ts';
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
    assert.equal(match.refit(0, yard, RefitKind.Pressure), true, 'they may buy one');
    advance(match, refitLineTimeS(RefitKind.Pressure, Faction.Pelagia) + 1);
    for (const eid of hulls) {
      assert.ok(
        Pressure.rating[eid]! <= 2,
        'no Commune refit reaches PR-3: the Abyssal is Deepbloom’s, not a thicker hull’s'
      );
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
