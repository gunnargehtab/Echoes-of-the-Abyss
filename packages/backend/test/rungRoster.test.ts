/**
 * The rung, and two hulls a navy (#461) — docs/units.md, "The rung, and two
 * hulls a navy".
 *
 * The Slipway and the eight faction hulls, transcribed. Each block holds one
 * entry to the sentence its stat block makes about sound or depth: the rung
 * grants berths and is loud while its line runs; the Precentor is a Cantor's
 * dome on the move; a Cantus sings and a Sower seeds only standing still, and
 * the grant is the Spire's and never stacks with it; a Spinner lays four,
 * silently, and regrows only at a nursery; a Tender welds the nearest hull and
 * never the part the deep took.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVE_SONAR,
  BERTHS,
  CADENCE_PING,
  DEPTH,
  DIRECTIONAL_SIGNATURE,
  ENGINE_OFF,
  Faction,
  HULL_EFFECTS,
  ORDNANCE,
  SIM,
  STRUCTURE_AURAS,
  StructureKind,
  UnitKind,
  statsFor,
  structureStatsFor,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnStructure, spawnUnit } from '../src/sim/world.ts';
import { directionalFactorFor } from '../src/sim/directional.ts';
import { launchTorpedo } from '../src/sim/systems/ordnance.ts';
import { Terrain } from '../src/sim/terrain.ts';
import {
  Acoustic,
  Health,
  HullEffect,
  Heading,
  Magazine,
  MineMagazine,
  Ordnance,
  Position,
  Pressure,
  Velocity,
} from '../src/sim/components.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): void {
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) match.update(STEP_MS);
}

/** A commander of this navy on flat open water, with a full purse. */
function skirmish(
  faction: Faction,
  seed = 461
): { match: Match; bastion: number; foundry: number } {
  const match = new Match(undefined, {
    fauna: false,
    seed,
    terrain: new Terrain(12000, 12000, 250, { floorM: 2600 }),
  });
  match.addPlayer(0, faction);
  match.addPlayer(1, faction === Faction.Pelagia ? Faction.Directorate : Faction.Pelagia);
  advance(match, 0.5);
  const own = match.update(STEP_MS)?.get(0) ?? snapshotOf(match);
  const bastion = own.structures.find((s) => s.kind === StructureKind.Bastion)!.id;
  const foundry = own.structures.find((s) => s.kind === StructureKind.Foundry)!.id;
  const purse = match.world.economies.get(0)!;
  purse.nodules = 20000;
  purse.crystal = 2000;
  purse.biomass = 2000;
  return { match, bastion, foundry };
}

function snapshotOf(match: Match) {
  for (let i = 0; i < 2 * SIM.TICK_HZ; i++) {
    const own = match.update(STEP_MS)?.get(0);
    if (own !== undefined) return own;
  }
  throw new Error('no Echo pass in two seconds');
}

/** Spawn an own hull of this kind for slot 0, at a position and depth. */
function hull(
  match: Match,
  faction: Faction,
  kind: UnitKind,
  x: number,
  y: number,
  depth?: number
): number {
  return spawnUnit(match.world, {
    kind,
    slot: 0,
    faction,
    x,
    y,
    ...(depth !== undefined ? { depth } : {}),
  });
}

describe('the Slipway — the rung', () => {
  it('is every navy’s, is crystal-locked, and grants the Foundry’s eight berths once it stands', () => {
    for (const faction of [
      Faction.Bathyarch,
      Faction.Pelagia,
      Faction.Directorate,
      Faction.Hadron,
    ]) {
      const { match, bastion } = skirmish(faction);
      const purse = match.world.economies.get(0)!;
      const x = Position.x[bastion]! + 900;
      const y = Position.y[bastion]!;
      const before = match.berthsFor(0).granted;

      purse.crystal = structureStatsFor(StructureKind.Slipway).crystalCost! - 1;
      assert.equal(match.build(0, StructureKind.Slipway, x, y), false, 'refused short of crystal');
      purse.crystal = 2000;
      assert.equal(
        match.build(0, StructureKind.Slipway, x, y),
        true,
        `${Faction[faction]} builds it`
      );

      // A site under construction grants nothing; a commissioned yard grants
      // eight. The doc's ceiling: a Bastion, two Foundries and a Slipway.
      advance(match, 1);
      assert.equal(match.berthsFor(0).granted, before, 'a site grants nothing');
      advance(match, structureStatsFor(StructureKind.Slipway).buildTimeS + 1);
      assert.equal(match.berthsFor(0).granted, before + BERTHS.SLIPWAY, 'commissioned: +8');
    }
  });

  it('reaches the ceiling with a Bastion, two Foundries and a Slipway, and not past it', () => {
    const { match, bastion } = skirmish(Faction.Bathyarch);
    const at = (dx: number): { x: number; y: number } => ({
      x: Position.x[bastion]! + dx,
      y: Position.y[bastion]! + 900,
    });
    spawnStructure(match.world, {
      kind: StructureKind.Foundry,
      slot: 0,
      faction: Faction.Bathyarch,
      ...at(-800),
      prebuilt: true,
    });
    spawnStructure(match.world, {
      kind: StructureKind.Slipway,
      slot: 0,
      faction: Faction.Bathyarch,
      ...at(0),
      prebuilt: true,
    });
    advance(match, 0.1);
    assert.equal(match.berthsFor(0).granted, BERTHS.CEILING, 'exactly forty');
    assert.equal(BERTHS.BASTION + 2 * BERTHS.FOUNDRY + BERTHS.SLIPWAY, BERTHS.CEILING);
    spawnStructure(match.world, {
      kind: StructureKind.Slipway,
      slot: 0,
      faction: Faction.Bathyarch,
      ...at(800),
      prebuilt: true,
    });
    advance(match, 0.1);
    assert.equal(
      match.berthsFor(0).granted,
      BERTHS.CEILING,
      'a second Slipway buys a line, not a tier'
    );
  });

  it('builds each navy’s second hull and nothing the Foundry builds, and the Foundry refuses it back', () => {
    const second: Record<Faction, UnitKind> = {
      [Faction.Bathyarch]: UnitKind.Bulwark,
      [Faction.Pelagia]: UnitKind.Sower,
      [Faction.Directorate]: UnitKind.Dredge,
      [Faction.Hadron]: UnitKind.Reciter,
    };
    const first: Record<Faction, UnitKind> = {
      [Faction.Bathyarch]: UnitKind.Tender,
      [Faction.Pelagia]: UnitKind.Spinner,
      [Faction.Directorate]: UnitKind.Precentor,
      [Faction.Hadron]: UnitKind.Cantus,
    };
    for (const faction of [
      Faction.Bathyarch,
      Faction.Pelagia,
      Faction.Directorate,
      Faction.Hadron,
    ]) {
      const { match, bastion, foundry } = skirmish(faction);
      const slipway = spawnStructure(match.world, {
        kind: StructureKind.Slipway,
        slot: 0,
        faction,
        x: Position.x[bastion]! + 900,
        y: Position.y[bastion]!,
        prebuilt: true,
      });
      advance(match, 0.1);
      const name = Faction[faction];
      assert.equal(match.produce(0, slipway, second[faction]), true, `${name}'s Slipway hull`);
      assert.equal(match.produce(0, foundry, second[faction]), false, 'not at the Foundry');
      assert.equal(match.produce(0, foundry, first[faction]), true, `${name}'s Foundry hull`);
      assert.equal(match.produce(0, slipway, first[faction]), false, 'not at the Slipway');
      assert.equal(
        match.produce(0, slipway, UnitKind.Corvette),
        false,
        'nothing the Foundry builds'
      );
      // ...and another navy's second hull is refused at the yard that could
      // build it, server-side, exactly as the Clarion is.
      for (const other of [
        Faction.Bathyarch,
        Faction.Pelagia,
        Faction.Directorate,
        Faction.Hadron,
      ]) {
        if (other === faction) continue;
        assert.equal(
          match.produce(0, slipway, second[other]),
          false,
          `${name} cannot build ${Faction[other]}'s`
        );
        assert.equal(match.produce(0, foundry, first[other]), false);
      }

      // The loudest line in the base: 70 while it runs, against a Foundry's 55.
      advance(match, 0.1);
      assert.equal(Acoustic.sig[slipway], structureStatsFor(StructureKind.Slipway).sigActive);
      assert.ok(Acoustic.sig[slipway]! > structureStatsFor(StructureKind.Foundry).sigActive);
    }
  });
});

describe('the Precentor — the ears on the move', () => {
  it('lends +10 HYD within 500 m to allied hulls, to the Cantor’s cap and no further', () => {
    const { match, bastion } = skirmish(Faction.Directorate);
    const x = Position.x[bastion]! + 3000;
    const y = Position.y[bastion]!;
    const precentor = hull(match, Faction.Directorate, UnitKind.Precentor, x, y);
    const near = hull(match, Faction.Directorate, UnitKind.Corvette, x + 400, y);
    const far = hull(match, Faction.Directorate, UnitKind.Corvette, x + 700, y);
    const cohort = hull(match, Faction.Directorate, UnitKind.Chorister, x, y + 300);
    advance(match, 0.1);

    const corvette = statsFor(UnitKind.Corvette).hyd;
    assert.equal(Acoustic.hyd[near], corvette + HULL_EFFECTS.PRECENTOR.HYD_BONUS, 'under the dome');
    assert.equal(Acoustic.hyd[far], corvette, 'outside it');
    assert.equal(Acoustic.hyd[precentor], STRUCTURE_AURAS.CANTOR.HYD_CAP, 'the cap, mobile');
    // Under a Cantor as well it adds nothing: the cap is the cap. A Chorister
    // is 75; the dome's +25 already reaches 95, and the Precentor's +10 on top
    // stays there.
    spawnStructure(match.world, {
      kind: StructureKind.Cantor,
      slot: 0,
      faction: Faction.Directorate,
      x,
      y: y + 500,
      prebuilt: true,
    });
    advance(match, 0.1);
    assert.equal(Acoustic.hyd[cohort], STRUCTURE_AURAS.CANTOR.HYD_CAP);
    assert.equal(
      Acoustic.hyd[near],
      Math.min(
        STRUCTURE_AURAS.CANTOR.HYD_CAP,
        corvette + STRUCTURE_AURAS.CANTOR.HYD_BONUS + HULL_EFFECTS.PRECENTOR.HYD_BONUS
      ),
      'the two domes sum, under the one cap'
    );
  });
});

describe('the Cantus — the Spire’s grant on a hull', () => {
  it('sings after 10 s stationary: +1 PR within 300 m, SIG 80 in every quarter; moving, nothing', () => {
    const { match, bastion } = skirmish(Faction.Hadron);
    const x = Position.x[bastion]! + 3000;
    const y = Position.y[bastion]!;
    const cantus = hull(match, Faction.Hadron, UnitKind.Cantus, x, y);
    const near = hull(match, Faction.Hadron, UnitKind.Corvette, x + 250, y);
    const far = hull(match, Faction.Hadron, UnitKind.Corvette, x + 350, y);
    const { STATIONARY_S, PR_BONUS } = HULL_EFFECTS.CANTUS;

    advance(match, STATIONARY_S - 1);
    assert.equal(Pressure.bonus[near], 0, 'not yet');
    assert.equal(Acoustic.sig[cantus], statsFor(UnitKind.Cantus).sigIdle, 'and quiet');
    // A Knight hull that is not singing is a Knight hull: the term applies.
    const beam = directionalFactorFor(match.world, cantus, x, y + 1000);
    assert.equal(beam, DIRECTIONAL_SIGNATURE.FLANK, 'beam-on, the term is on');

    advance(match, 2);
    assert.equal(HullEffect.active[cantus], 1, 'singing');
    assert.equal(Pressure.bonus[near], PR_BONUS, 'within 300 m');
    assert.equal(Pressure.bonus[far], 0, 'not at 350');
    assert.equal(Pressure.bonus[cantus], PR_BONUS, 'and under its own song');
    assert.equal(Acoustic.sig[cantus], statsFor(UnitKind.Cantus).sigWorking, 'the Spire’s figure');
    assert.equal(directionalFactorFor(match.world, cantus, x, y + 1000), 1, 'in every quarter');

    // Moving, it is silent and grants nothing — on the tick it moves.
    match.orderMove(0, cantus, x + 2000, y);
    advance(match, 0.1);
    assert.equal(HullEffect.active[cantus], 0);
    assert.equal(Pressure.bonus[near], 0, 'the grant left with the hull');
    assert.equal(Acoustic.sig[cantus], statsFor(UnitKind.Cantus).sigCruise);
  });

  it('is the Spire’s grant and never a second one on top of it', () => {
    const { match, bastion } = skirmish(Faction.Hadron);
    const x = Position.x[bastion]! + 3000;
    const y = Position.y[bastion]!;
    spawnStructure(match.world, {
      kind: StructureKind.SoundingSpire,
      slot: 0,
      faction: Faction.Hadron,
      x,
      y: y - 200,
      prebuilt: true,
    });
    hull(match, Faction.Hadron, UnitKind.Cantus, x, y);
    const corvette = hull(match, Faction.Hadron, UnitKind.Corvette, x + 100, y);
    advance(match, HULL_EFFECTS.CANTUS.STATIONARY_S + 1);
    assert.equal(
      Pressure.bonus[corvette],
      STRUCTURE_AURAS.SOUNDING_SPIRE.PR_BONUS,
      'one band, not two'
    );
  });

  it('can be told to stop singing without moving: Silent Running is the off switch', () => {
    const { match, bastion } = skirmish(Faction.Hadron);
    const x = Position.x[bastion]! + 3000;
    const y = Position.y[bastion]!;
    const cantus = hull(match, Faction.Hadron, UnitKind.Cantus, x, y);
    advance(match, HULL_EFFECTS.CANTUS.STATIONARY_S + 1);
    assert.equal(HullEffect.active[cantus], 1);
    match.setSilentRunning(0, cantus, true);
    advance(match, 0.1);
    assert.equal(HullEffect.active[cantus], 0, 'quiet means quiet');
    assert.ok(Acoustic.sig[cantus]! < 10, 'and it is');
    match.setSilentRunning(0, cantus, false);
    advance(match, 0.1);
    assert.equal(HullEffect.active[cantus], 1, 'the clock did not reset: it never moved');
  });
});

describe('the Sower — the terraformer', () => {
  it('seeds after 20 s stationary: +1 PR within 400 m at SIG 45, and does not stack', () => {
    const { match, bastion } = skirmish(Faction.Pelagia);
    const x = Position.x[bastion]! + 3000;
    const y = Position.y[bastion]!;
    const sower = hull(match, Faction.Pelagia, UnitKind.Sower, x, y);
    const second = hull(match, Faction.Pelagia, UnitKind.Sower, x - 100, y);
    const near = hull(match, Faction.Pelagia, UnitKind.Corvette, x + 380, y);
    const far = hull(match, Faction.Pelagia, UnitKind.Corvette, x + 420, y);
    const { STATIONARY_S, PR_BONUS } = HULL_EFFECTS.SOWER;

    advance(match, STATIONARY_S - 1);
    assert.equal(Pressure.bonus[near], 0, 'not yet');
    advance(match, 2);
    assert.equal(
      Pressure.bonus[near],
      PR_BONUS,
      'seeded: a PR-1 Corvette under a Sower works Mid-Water'
    );
    assert.equal(Pressure.bonus[far], 0, 'not at 420');
    assert.equal(Acoustic.sig[sower], statsFor(UnitKind.Sower).sigWorking, 'the bloom is a roar');
    assert.equal(HullEffect.active[second], 1, 'two Sowers, both seeded');
    assert.equal(Pressure.bonus[near], PR_BONUS, '...and under both it does not go deeper');
  });
});

describe('the Spinner — the mine-layer', () => {
  it('lays four, silently, refuses a fifth, and regrows one per 40 s by a Bastion', () => {
    const { match, bastion } = skirmish(Faction.Pelagia);
    const bx = Position.x[bastion]!;
    const by = Position.y[bastion]!;
    // In the field: well past the Bastion's 300 m nursery.
    const spinner = hull(match, Faction.Pelagia, UnitKind.Spinner, bx + 3000, by);
    advance(match, 0.1);
    assert.equal(MineMagazine.mines[spinner], HULL_EFFECTS.SPINNER.MAGAZINE, 'full at launch');

    let laid = 0;
    for (let i = 0; i < HULL_EFFECTS.SPINNER.MAGAZINE + 2; i++) {
      if (match.layMine(0, spinner) !== 0) laid++;
      advance(match, 0.1);
      // Laying is silent: no construction floor on a grown mine.
      assert.equal(Acoustic.sig[spinner], statsFor(UnitKind.Spinner).sigIdle, 'silent laying');
      advance(match, ORDNANCE.MINE.ARMING_S + 0.2);
    }
    assert.equal(laid, HULL_EFFECTS.SPINNER.MAGAZINE, 'four and no fifth');
    assert.equal(MineMagazine.mines[spinner], 0);

    // In the field the magazine stays empty however long it waits.
    advance(match, HULL_EFFECTS.SPINNER.REGROW_S + 5);
    assert.equal(MineMagazine.mines[spinner], 0, 'no nursery, no regrowth');

    // Home to the Bastion: one per interval.
    Position.x[spinner] = bx + 250;
    Position.y[spinner] = by;
    advance(match, HULL_EFFECTS.SPINNER.REGROW_S - 1);
    assert.equal(MineMagazine.mines[spinner], 0, 'not yet');
    advance(match, 2);
    assert.equal(MineMagazine.mines[spinner], 1, 'regrown');
    assert.notEqual(match.layMine(0, spinner), 0, 'and it can lay again');
  });

  it('leaves the roster’s one-mine layer exactly as it was', () => {
    const { match, bastion } = skirmish(Faction.Pelagia);
    const corvette = hull(
      match,
      Faction.Pelagia,
      UnitKind.Corvette,
      Position.x[bastion]! + 3000,
      Position.y[bastion]!
    );
    advance(match, 0.1);
    assert.notEqual(match.layMine(0, corvette), 0, 'an armed hull still lays');
    advance(match, 0.1);
    assert.equal(Acoustic.sig[corvette], ORDNANCE.MINE.SIG_LAYING, 'and is heard building it');
  });
});

describe('the Tender — the repair hull', () => {
  it('welds the nearest damaged allied hull within 300 m at 15 HP/s, loudly, and stops when there is nothing to weld', () => {
    const { match, bastion } = skirmish(Faction.Bathyarch);
    const x = Position.x[bastion]! + 3000;
    const y = Position.y[bastion]!;
    const tender = hull(match, Faction.Bathyarch, UnitKind.Tender, x, y);
    const near = hull(match, Faction.Bathyarch, UnitKind.Corvette, x + 100, y);
    const farther = hull(match, Faction.Bathyarch, UnitKind.Corvette, x + 200, y);
    const out = hull(match, Faction.Bathyarch, UnitKind.Corvette, x + 400, y);
    const { REPAIR_HP_PER_S } = HULL_EFFECTS.TENDER;
    const max = statsFor(UnitKind.Corvette).maxHp;

    advance(match, 0.1);
    assert.equal(HullEffect.active[tender], 0, 'nothing to weld');
    assert.equal(Acoustic.sig[tender], statsFor(UnitKind.Tender).sigIdle);

    Health.hp[near] = max - 60;
    Health.hp[farther] = max - 60;
    Health.hp[out] = max - 60;
    advance(match, 2);
    assert.equal(HullEffect.active[tender], 1, 'working');
    assert.equal(Acoustic.sig[tender], statsFor(UnitKind.Tender).sigWorking, '+12 while working');
    assert.ok(Math.abs(Health.hp[near]! - (max - 60 + 2 * REPAIR_HP_PER_S)) < 1, 'nearest first');
    assert.equal(Health.hp[farther], max - 60, 'one hull at a time');
    assert.equal(Health.hp[out], max - 60, 'and none at 400 m');

    advance(match, 3);
    assert.equal(Health.hp[near], max, 'whole, and no more');
    assert.ok(Health.hp[farther]! > max - 60, 'then the next');
  });

  it('never touches the hull the deep took', () => {
    const { match, bastion } = skirmish(Faction.Bathyarch);
    const x = Position.x[bastion]! + 3000;
    const y = Position.y[bastion]!;
    hull(match, Faction.Bathyarch, UnitKind.Tender, x, y);
    const crushed = hull(match, Faction.Bathyarch, UnitKind.Corvette, x + 100, y);
    const max = statsFor(UnitKind.Corvette).maxHp;
    Health.hp[crushed] = 100;
    Pressure.unhealable[crushed] = 200;
    advance(match, 30);
    assert.equal(Health.hp[crushed], max - 200, 'crush stays crushed');
  });

  it('does not weld its own plate, and cannot weld quietly', () => {
    const { match, bastion } = skirmish(Faction.Bathyarch);
    const x = Position.x[bastion]! + 3000;
    const y = Position.y[bastion]!;
    const tender = hull(match, Faction.Bathyarch, UnitKind.Tender, x, y);
    Health.hp[tender] = 100;
    advance(match, 2);
    assert.equal(Health.hp[tender], 100, 'a workshop welds other hulls');

    const patient = hull(match, Faction.Bathyarch, UnitKind.Corvette, x + 100, y);
    Health.hp[patient] = 100;
    match.setSilentRunning(0, tender, true);
    advance(match, 2);
    assert.equal(Health.hp[patient], 100, 'silent is not working');
    assert.equal(HullEffect.active[tender], 0);
  });
});

/**
 * The scouts (#506) — docs/units.md, "The scouts"; docs/systems-echo.md §5, §6.
 *
 * Four hulls and the two mechanisms the wave built for them. Each block holds
 * one entry to the sentence its stat block makes: engine off is below silence
 * for every hull and the Glider is the only one still moving there; the
 * Acolyte's ears are its posture; a Beacon transmits on its own clock at a
 * figure the propagation model, not the wave, chose.
 */
describe('engine off — the state below silence', () => {
  it('is quieter than Silent Running, for every hull in the roster', () => {
    // The claim ENGINE_OFF.SIG_FACTOR exists to make structural rather than
    // lucky. A factor on idle would have put a Cruiser above its own silence.
    const { match } = skirmish(Faction.Pelagia);
    for (const kind of Object.values(UnitKind).filter((k) => typeof k === 'number')) {
      const stats = statsFor(kind as UnitKind);
      const eid = hull(match, Faction.Pelagia, kind as UnitKind, 3000, 3000);
      match.setSilentRunning(0, eid, true);
      advance(match, 0.1);
      const silent = Acoustic.sig[eid]!;
      match.setEngineOff(0, eid, true);
      advance(match, 0.1);
      const off = Acoustic.sig[eid]!;
      assert.ok(
        off < silent,
        `${stats.name}: engine off ${off.toFixed(2)} is not below silent ${silent.toFixed(2)}`
      );
      assert.ok(off >= ENGINE_OFF.SIG_FLOOR, `${stats.name} fell through the floor at ${off}`);
    }
  });

  it('stops a hull dead — unless it is the one built to coast', () => {
    const { match } = skirmish(Faction.Pelagia);
    const scout = hull(match, Faction.Pelagia, UnitKind.LightScout, 3000, 3000);
    const glider = hull(match, Faction.Pelagia, UnitKind.Glider, 3000, 3200);
    for (const eid of [scout, glider]) {
      match.orderMove(0, eid, 9000, 3000);
      match.setEngineOff(0, eid, true);
    }
    const scoutFrom = Position.x[scout]!;
    const gliderFrom = Position.x[glider]!;
    advance(match, 6);

    assert.equal(
      Math.round(Position.x[scout]! - scoutFrom),
      0,
      'a Light Scout with its drive cut is a rock'
    );
    // A third of 105 m/s over six seconds, less whatever the order cost it.
    assert.ok(
      Position.x[glider]! - gliderFrom > 100,
      `the Glider coasted only ${(Position.x[glider]! - gliderFrom).toFixed(0)} m`
    );
  });

  it('is the quietest thing in the roster that is still under way', () => {
    // "Nothing else under way is quieter" (docs/units.md, Glider). A Light
    // Scout is quieter with its engine off and is not going anywhere, which is
    // the distinction the doc draws and the one worth holding.
    const { match } = skirmish(Faction.Pelagia);
    const glider = hull(match, Faction.Pelagia, UnitKind.Glider, 3000, 3000);
    match.orderMove(0, glider, 9000, 3000);
    match.setEngineOff(0, glider, true);
    advance(match, 2);
    const gliding = Acoustic.sig[glider]!;
    assert.ok(gliding > 0, 'a gliding hull still emits something');

    for (const kind of Object.values(UnitKind).filter((k) => typeof k === 'number')) {
      const other = hull(match, Faction.Pelagia, kind as UnitKind, 5000, 5000);
      match.orderMove(0, other, 9000, 5000);
      match.setSilentRunning(0, other, true);
      advance(match, 1);
      if (Math.hypot(Velocity.x[other]!, Velocity.y[other]!) < 0.01) continue;
      assert.ok(
        Acoustic.sig[other]! >= gliding,
        `${statsFor(kind as UnitKind).name} moves at ${Acoustic.sig[other]!.toFixed(2)}, ` +
          `under the Glider's ${gliding.toFixed(2)}`
      );
    }
  });

  it('cannot hush a hull that is diving', () => {
    // Descent is a floor over the whole posture chain (docs/systems-depth.md
    // §2): there is no quiet way down, and a third posture does not add one.
    const { match } = skirmish(Faction.Pelagia);
    const glider = hull(match, Faction.Pelagia, UnitKind.Glider, 3000, 3000, 100);
    match.setEngineOff(0, glider, true);
    match.orderDepth(0, glider, 1200);
    advance(match, 1);
    assert.ok(
      Acoustic.sig[glider]! >= DEPTH.DESCENT_SIG,
      `a diving Glider was heard at ${Acoustic.sig[glider]!.toFixed(1)}`
    );
  });
});

describe('the Acolyte — the ears that sit still', () => {
  it('hears at its stationary figure only while it is stopped', () => {
    const { match } = skirmish(Faction.Directorate);
    const stats = statsFor(UnitKind.Acolyte);
    const acolyte = hull(match, Faction.Directorate, UnitKind.Acolyte, 3000, 3000);
    advance(match, 0.5);
    assert.equal(Acoustic.hyd[acolyte], stats.hydStationary);

    match.orderMove(0, acolyte, 9000, 3000);
    advance(match, 1);
    assert.equal(Acoustic.hyd[acolyte], stats.hyd, 'an Acolyte under way hears like any hull');
  });

  it('keeps hearing 60 under way even when it is running silent', () => {
    // docs/units.md design notes: "Silent Running changes what a unit emits,
    // never what it hears." The step is keyed on the hull being still, not on
    // a posture — a moving silent Acolyte is still moving.
    const { match } = skirmish(Faction.Directorate);
    const acolyte = hull(match, Faction.Directorate, UnitKind.Acolyte, 3000, 3000);
    match.orderMove(0, acolyte, 9000, 3000);
    match.setSilentRunning(0, acolyte, true);
    advance(match, 1);
    assert.equal(Acoustic.hyd[acolyte], statsFor(UnitKind.Acolyte).hyd);
  });
});

describe('the Beacon — the picket that shouts', () => {
  it('pings on its own clock, with nobody ordering it', () => {
    const { match } = skirmish(Faction.Bathyarch);
    const beacon = hull(match, Faction.Bathyarch, UnitKind.Beacon, 3000, 3000);
    const cadenceS = statsFor(UnitKind.Beacon).pingCadenceS!;

    // Nothing yet: the clock starts at a full interval so a Beacon does not
    // announce its navy's build order the instant it leaves the yard.
    advance(match, cadenceS - 2);
    assert.equal(Acoustic.sig[beacon]! > CADENCE_PING.EMITTER_SIG - 1, false, 'pinged early');

    advance(match, 3);
    assert.ok(
      Math.abs(Acoustic.sig[beacon]! - CADENCE_PING.EMITTER_SIG) < 1,
      `the Beacon was heard at ${Acoustic.sig[beacon]!.toFixed(1)}, not its cadence figure`
    );
  });

  it('transmits at the figures the propagation model chose, not at the button’s', () => {
    // The whole point of deriving the cheap ping: it is the same mechanism at
    // a lower emitter figure, and both radii fall out of that one number.
    assert.equal(CADENCE_PING.EMITTER_SIG, 80);
    assert.ok(CADENCE_PING.REVEAL_RADIUS_M < ACTIVE_SONAR.REVEAL_RADIUS_M);
    assert.ok(CADENCE_PING.SELF_REVEAL_RADIUS_M < ACTIVE_SONAR.SELF_REVEAL_RADIUS_M);
    // Both scale by the same factor, because both come from the same curve.
    const reveal = CADENCE_PING.REVEAL_RADIUS_M / ACTIVE_SONAR.REVEAL_RADIUS_M;
    const self = CADENCE_PING.SELF_REVEAL_RADIUS_M / ACTIVE_SONAR.SELF_REVEAL_RADIUS_M;
    assert.ok(Math.abs(reveal - self) < 1e-9, 'the two radii came off different curves');
    // The figures docs/units.md and docs/systems-echo.md §5 quote.
    assert.equal(Math.round(CADENCE_PING.REVEAL_RADIUS_M), 808);
    assert.equal(Math.round(CADENCE_PING.SELF_REVEAL_RADIUS_M), 2156);
  });

  it('stops transmitting when its owner tells it to be quiet', () => {
    // The hull's only counter-play for its own side: a picket that could not
    // be shut up is a hull you can never move past your own map quietly.
    const { match } = skirmish(Faction.Bathyarch);
    const beacon = hull(match, Faction.Bathyarch, UnitKind.Beacon, 3000, 3000);
    match.setSilentRunning(0, beacon, true);
    advance(match, statsFor(UnitKind.Beacon).pingCadenceS! + 3);
    assert.ok(
      Acoustic.sig[beacon]! < 20,
      `a silenced Beacon was heard at ${Acoustic.sig[beacon]!.toFixed(1)}`
    );
  });
});

/**
 * The ordnance hulls (#507) — docs/units.md, "The ordnance hulls";
 * docs/systems-combat.md §5, §8.
 *
 * Three mechanisms and one thing that was already true and had never been
 * proven: a screen laid from a magazine, a torpedo that keeps its solution, a
 * charge that goes up, and the arming rules reading the same when it does.
 */
describe('the Weaver — a screen, laid', () => {
  it('lays from its magazine, spaced, and empties', () => {
    const { match } = skirmish(Faction.Pelagia);
    const weaver = hull(match, Faction.Pelagia, UnitKind.Weaver, 3000, 3000);
    const magazine = statsFor(UnitKind.Weaver).decoyMagazine!;

    const first = match.layDecoy(0, weaver);
    assert.ok(first > 0, 'the first lay should come out');
    // Spaced: the second is refused until the interval has run.
    assert.equal(match.layDecoy(0, weaver), 0, 'a magazine must not empty in one tick');

    let laid = 1;
    for (let i = 0; i < magazine * 3; i++) {
      advance(match, ORDNANCE.LAID_DECOY.INTERVAL_S + 0.1);
      if (match.layDecoy(0, weaver) > 0) laid++;
    }
    assert.equal(laid, magazine, `the magazine is ${magazine} and no more, got ${laid}`);
  });

  it('lays a decoy that is quieter and longer-lived than a countermeasure', () => {
    // The two lies are asked for different things (docs/systems-combat.md §5):
    // a countermeasure out-shouts one hull for a moment, a laid decoy has to
    // be mistaken for a hull for as long as an approach takes.
    const { match } = skirmish(Faction.Pelagia);
    const weaver = hull(match, Faction.Pelagia, UnitKind.Weaver, 3000, 3000);
    const corvette = hull(match, Faction.Pelagia, UnitKind.Corvette, 5000, 5000);

    const screen = match.layDecoy(0, weaver);
    const reflex = match.deployNoisemaker(0, corvette);
    assert.ok(screen > 0 && reflex > 0);

    assert.equal(Acoustic.sig[screen], ORDNANCE.LAID_DECOY.SIG);
    assert.equal(Acoustic.sig[reflex], ORDNANCE.NOISEMAKER.SIG);
    assert.ok(Acoustic.sig[screen]! < Acoustic.sig[reflex]!, 'quieter');
    assert.ok(Ordnance.remainingS[screen]! > Ordnance.remainingS[reflex]!, 'and longer-lived');
    // Still the same kind, and it has to be: a seeker that could tell them
    // apart could tell a decoy from a hull.
    assert.equal(Ordnance.kind[screen], Ordnance.kind[reflex]);
  });
});

describe('the Lance — one shot, and only at what it faces', () => {
  it('refuses a bearing outside the hull’s own cone', () => {
    const { match } = skirmish(Faction.Hadron);
    const lance = hull(match, Faction.Hadron, UnitKind.Lance, 3000, 3000);
    Heading.rad[lance] = 0; // pointing up +X

    // Dead astern: the one bearing the hull is quietest in, and cannot shoot.
    assert.equal(launchTorpedo(match.world, lance, 1000, 3000), 0, 'astern is refused');
    assert.equal(
      Magazine.torpedoes[lance],
      statsFor(UnitKind.Lance).torpedoMagazine,
      'and a refused shot stays in the tube'
    );

    // Dead ahead: allowed, and it is the only torpedo aboard.
    const fired = launchTorpedo(match.world, lance, 6000, 3000);
    assert.ok(fired > 0, 'ahead is allowed');
    assert.equal(Magazine.torpedoes[lance], 0, 'a magazine of one is now empty');
    assert.equal(Ordnance.locked[fired], 1, 'and the shot is committed');
  });

  it('holds its solution where an ordinary torpedo would be decoyed', () => {
    // The triangle's missing edge (docs/systems-combat.md §2, §5): a decoy
    // works by being the loudest thing *now*, and this is the one weapon that
    // is not listening.
    const { match } = skirmish(Faction.Hadron);
    const lance = hull(match, Faction.Hadron, UnitKind.Lance, 3000, 3000);
    const corvette = hull(match, Faction.Hadron, UnitKind.Corvette, 3000, 3200);
    Heading.rad[lance] = 0;

    const locked = launchTorpedo(match.world, lance, 6000, 3000);
    const loose = launchTorpedo(match.world, corvette, 6000, 3200);
    assert.ok(locked > 0 && loose > 0);
    assert.equal(Ordnance.locked[locked], 1);
    assert.equal(Ordnance.locked[loose], 0, 'an ordinary tube commits to nothing');
  });
});

describe('the Thurible — the charge that goes up', () => {
  it('floats a charge into the band above, at the ascent rate', () => {
    const { match } = skirmish(Faction.Directorate);
    // Abyssal, which is the water the Listening owns and the only place "up"
    // is a different band: the Shelf ends at 400 m and MidWater at 1,800.
    const thurible = hull(match, Faction.Directorate, UnitKind.Thurible, 3000, 3000, 2000);
    const charge = match.orderDepthCharge(0, thurible, 900);
    assert.ok(charge > 0, 'a charge set above should be accepted');

    const from = Position.depth[charge]!;
    advance(match, 1);
    const travelled = from - Position.depth[charge]!;
    assert.ok(travelled > 0, 'it should be rising');
    // The slow direction, and that asymmetry is the point: a defender above
    // gets three times the warning a defender below does.
    assert.ok(
      travelled <= DEPTH.ASCENT_RATE_MPS * 1.1,
      `rose ${travelled.toFixed(0)} m in a second, faster than the ascent rate`
    );
    assert.ok(
      DEPTH.ASCENT_RATE_MPS < DEPTH.DESCENT_RATE_MPS,
      'and up is slower than down, which is what makes it a different weapon'
    );
  });

  it('still refuses a charge that does not cross a band, in either direction', () => {
    const { match } = skirmish(Faction.Directorate);
    const thurible = hull(match, Faction.Directorate, UnitKind.Thurible, 3000, 3000, 2000);
    assert.equal(match.orderDepthCharge(0, thurible, 2200), 0, 'its own band is refused');
  });

  it('cycles its rack twice as fast as a hull that is not built for it', () => {
    const { match } = skirmish(Faction.Directorate);
    // Both in MidWater, bombing up into the Shelf, so the Corvette is not
    // being crushed while the comparison runs.
    const thurible = hull(match, Faction.Directorate, UnitKind.Thurible, 3000, 3000, 1000);
    const corvette = hull(match, Faction.Directorate, UnitKind.Corvette, 3200, 3000, 1000);

    assert.ok(match.orderDepthCharge(0, thurible, 200) > 0);
    assert.ok(match.orderDepthCharge(0, corvette, 200) > 0);

    // Between the two cooldowns: the Thurible is ready and the Corvette is not.
    advance(match, statsFor(UnitKind.Thurible).depthChargeCooldownS! + 0.5);
    assert.ok(match.orderDepthCharge(0, thurible, 200) > 0, 'the rack should be back');
    assert.equal(match.orderDepthCharge(0, corvette, 200), 0, 'and everyone else waits');
  });
});

describe('the Broadside — twelve seconds of ordnance', () => {
  it('carries four and rearms only at a depot', () => {
    const { match } = skirmish(Faction.Bathyarch);
    const broadside = hull(match, Faction.Bathyarch, UnitKind.Broadside, 6000, 6000);
    assert.equal(Magazine.torpedoes[broadside], 4, 'four tubes, four fish');

    for (let i = 0; i < 4; i++) {
      assert.ok(launchTorpedo(match.world, broadside, 9000, 6000) > 0, `launch ${i + 1}`);
    }
    assert.equal(launchTorpedo(match.world, broadside, 9000, 6000), 0, 'and then nothing');

    // Far from home: the field never refills a magazine (§5, "Ammunition").
    advance(match, ORDNANCE.TORPEDO.REARM_TIME_S * 2);
    assert.equal(Magazine.torpedoes[broadside], 0, 'a spent Broadside stays spent out here');
  });
});
