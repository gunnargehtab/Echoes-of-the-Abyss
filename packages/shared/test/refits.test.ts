/**
 * The refit roster against the doc that authored it — docs/systems-progression.md
 * §2, and #517, which is the issue that says an unbuilt §2 leaves one navy in
 * four with no route to the Abyssal band at all, and #1785, which built the
 * other four.
 *
 * What is asserted here is the *table*, because the table is the doctrine: the
 * Consortium's discount is its whole depth line, the Commune's ceiling is why
 * the Sower exists, the Directorate's absence is what "born to it" means, and
 * the Order's instant-and-sounded row is the one carve-out §1's rule 1 would
 * otherwise forbid. Everything the simulation does with these numbers is held
 * in `packages/backend/test/refit.test.ts`; what is held here is that the
 * numbers are the doc's.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CRYSTAL,
  Faction,
  FACTION_PRESSURE_BASELINE,
  ORDNANCE,
  PRESSURE_REFIT_TERMS,
  REFIT_KINDS,
  REFIT_STATS,
  REFIT_TERMS,
  RefitKind,
  StructureKind,
  UNIT_STATS,
  UnitKind,
  effectivePressureRating,
  priceOf,
  refitHoldFactor,
  refitHullFactor,
  refitLineTimeS,
  refitOfferedTo,
  refitPriceFor,
  refitSigBonus,
  refitSpeedFactor,
  refitTermsFor,
  refittedPressureRating,
  requiredPressureRating,
  statsFor,
  structureStatsFor,
  torpedoMagazineFor,
} from '../dist/index.js';

const FACTIONS = [Faction.Bathyarch, Faction.Pelagia, Faction.Directorate, Faction.Hadron];

describe('the refits', () => {
  it('transcribes §2’s five rows, each moving the one stat it names', () => {
    // The table, row by row: price, line time, the effect and the acoustic
    // side. Every other stat column is asserted neutral, so a row cannot buy
    // a second thing by a typo.
    const NEUTRAL = {
      pressureBonus: 0,
      hullFactor: 1,
      speedFactor: 1,
      magazineBonus: 0,
      holdFactor: 1,
      sigIdleBonus: 0,
      sigCruiseBonus: 0,
    };
    const ROWS: Array<[RefitKind, number, number, number, Partial<typeof NEUTRAL>]> = [
      // +1 PR, and "+2 SIG idle and cruise".
      [RefitKind.Pressure, 400, 120, 120, { pressureBonus: 1, sigIdleBonus: 2, sigCruiseBonus: 2 }],
      // +15% max hull, and "+3 SIG cruise — more mass pushes more water".
      [RefitKind.Plate, 250, 60, 90, { hullFactor: 1.15, sigCruiseBonus: 3 }],
      // +10% speed, and "+4 SIG idle and cruise".
      [RefitKind.Drive, 250, 60, 90, { speedFactor: 1.1, sigIdleBonus: 4, sigCruiseBonus: 4 }],
      // Magazines 2 → 3, and "None on the hull".
      [RefitKind.Magazine, 200, 60, 90, { magazineBonus: 1 }],
      // Holds +20%, and its noise is the hum rather than the hull.
      [RefitKind.Hold, 200, 40, 60, { holdFactor: 1.2 }],
    ];
    for (const [kind, nodules, crystal, seconds, moves] of ROWS) {
      const row = REFIT_STATS[kind];
      const name = RefitKind[kind];
      assert.equal(row.cost, nodules, `${name}: Nodules`);
      assert.equal(row.crystalCost, crystal, `${name}: Crystal`);
      assert.equal(row.buildTimeS, seconds, `${name}: seconds on the line`);
      for (const [stat, neutral] of Object.entries(NEUTRAL)) {
        const expected = (moves as Record<string, number>)[stat] ?? neutral;
        assert.equal(row[stat as keyof typeof NEUTRAL], expected, `${name}: ${stat}`);
      }
    }
  });

  it('never sells quiet, and never sells less of anything', () => {
    // §1's rule 2: "No refit and no rank lowers a hull's SIG or raises its
    // HYD", and its acoustic side "only ever goes up or stays where it was".
    // There is no HYD column to raise; every SIG column is non-negative, and
    // every effect is a step up or nothing.
    for (const kind of REFIT_KINDS) {
      const row = REFIT_STATS[kind];
      assert.ok(row.sigIdleBonus >= 0 && row.sigCruiseBonus >= 0, `${RefitKind[kind]}: no quiet`);
      assert.ok(!('hyd' in row) && !('hydBonus' in row), `${RefitKind[kind]}: no ears`);
      assert.ok(row.hullFactor >= 1 && row.speedFactor >= 1 && row.holdFactor >= 1);
      assert.ok(row.magazineBonus >= 0 && row.pressureBonus >= 0);
    }
  });

  it('prices the Pressure Refit as a signature structure, because it is the same decision', () => {
    // §2 says so in as many words: "the same 120 Crystal as a Baffle Barge, a
    // Cantor, a Sounding Spire or a Spore Veil — because it is the same kind
    // of decision: the deep, spent on something you cannot un-spend." Read off
    // the structures rather than restated, so re-pricing the tier moves both.
    const signature = priceOf(structureStatsFor(StructureKind.BaffleBarge)).crystal;
    assert.equal(REFIT_STATS[RefitKind.Pressure].crystalCost, signature);
  });

  it('gives each navy the terms its depth line already promised', () => {
    // The Consortium *buys* access, so its refit is the cheapest crystal in the
    // game — and the discount is crystal-only, because the Nodules and the two
    // minutes at SIG 70 are the currency the Klaxon always pays in.
    assert.equal(refitPriceFor(RefitKind.Pressure, Faction.Bathyarch).crystal, 84, '×0.7');
    assert.equal(refitPriceFor(RefitKind.Pressure, Faction.Bathyarch).nodules, 400);
    assert.equal(refitLineTimeS(RefitKind.Pressure, Faction.Bathyarch), 120);

    // The Commune's are poor: half again in crystal and half again on the line.
    assert.equal(refitPriceFor(RefitKind.Pressure, Faction.Pelagia).crystal, 180, '×1.5');
    assert.equal(refitLineTimeS(RefitKind.Pressure, Faction.Pelagia), 180, '×1.5 line time');

    // The Order's is instant, priced in Resonance alone, and sounded.
    const order = refitPriceFor(RefitKind.Pressure, Faction.Hadron);
    assert.equal(order.crystal, 180, 'Crystal alone at ×1.5');
    assert.equal(order.nodules, 0, 'no Nodules');
    assert.equal(refitLineTimeS(RefitKind.Pressure, Faction.Hadron), 0, 'no line time');
    const chord = refitTermsFor(RefitKind.Pressure, Faction.Hadron);
    assert.deepEqual(chord.sounding, { sig: 80, seconds: 15 });
    assert.equal(chord.boughtAt, StructureKind.Bastion);
  });

  it('sells the other four on each navy’s standing terms, the Order’s on the line', () => {
    // §2's per-faction table has two columns, and the code had one: the
    // Order's row reads "Standard on the line — except the one below", so its
    // instant chord is the Pressure Refit's alone and the other four are
    // bought on a Slipway like anyone's.
    const OTHERS = [RefitKind.Plate, RefitKind.Drive, RefitKind.Magazine, RefitKind.Hold];
    for (const kind of OTHERS) {
      const row = REFIT_STATS[kind];
      const name = RefitKind[kind];
      for (const faction of FACTIONS) {
        assert.equal(refitOfferedTo(kind, faction), true, `${Faction[faction]} is offered ${name}`);
        const terms = refitTermsFor(kind, faction);
        assert.equal(terms, REFIT_TERMS[faction], `${Faction[faction]}'s ${name}: standing terms`);
        assert.equal(terms.boughtAt, StructureKind.Slipway, `${name} is bought on the line`);
        assert.equal(terms.sounding, undefined, `${name} is heard on the line, not struck`);
        assert.equal(
          refitPriceFor(kind, faction).nodules,
          row.cost,
          'Nodules are never discounted'
        );
      }
      // The Consortium's discount is crystal-only; the Commune's poor refits
      // are half again in crystal and on the line; the Order and the
      // Directorate pay the row.
      assert.equal(
        refitPriceFor(kind, Faction.Bathyarch).crystal,
        Math.round(row.crystalCost * 0.7)
      );
      assert.equal(refitPriceFor(kind, Faction.Pelagia).crystal, Math.round(row.crystalCost * 1.5));
      assert.equal(refitLineTimeS(kind, Faction.Pelagia), row.buildTimeS * 1.5);
      for (const faction of [Faction.Directorate, Faction.Hadron, Faction.Bathyarch]) {
        assert.equal(refitLineTimeS(kind, faction), row.buildTimeS, `${Faction[faction]}'s line`);
      }
      for (const faction of [Faction.Directorate, Faction.Hadron]) {
        assert.equal(refitPriceFor(kind, faction).crystal, row.crystalCost);
      }
    }
  });

  it('offers the Pressure Refit to everyone except the navy that starts with it', () => {
    for (const faction of FACTIONS) {
      const offered = refitOfferedTo(RefitKind.Pressure, faction);
      assert.equal(
        offered,
        faction !== Faction.Directorate,
        `${Faction[faction]}: §2's per-faction table`
      );
      // And the reason, stated as arithmetic rather than as a comment: the one
      // navy not offered it is the one already at the ceiling everyone else is
      // buying toward.
      if (!offered) assert.equal(FACTION_PRESSURE_BASELINE[faction], 3);
    }
  });

  it('sells the Consortium and the Order the band the crystal field needs, and the Commune not', () => {
    // The whole of #517 in four numbers. Crystal sits in the Abyssal band on
    // every map, so a navy's route to it is exactly whether its hauler ends up
    // rated for `CRYSTAL.FIELD_DEPTH_M` once the refit is bought.
    const needed = requiredPressureRating(CRYSTAL.FIELD_DEPTH_M);
    const reaches = (faction: Faction): boolean =>
      refittedPressureRating(effectivePressureRating(UnitKind.Harvester, faction), faction) >=
      needed;

    assert.ok(reaches(Faction.Bathyarch), 'Buys access — and now there is something to buy');
    assert.ok(reaches(Faction.Hadron), 'Projects access, and may also purchase it outright');
    assert.ok(
      !reaches(Faction.Pelagia),
      'Terraforms access: PR-1 → PR-2 only, so the Sower stays their answer to the deep'
    );
    // The Directorate is not offered one, and does not need one.
    assert.ok(effectivePressureRating(UnitKind.Harvester, Faction.Directorate) >= needed);
  });

  it('never carries a hull past its navy’s ceiling, however deep the hull already is', () => {
    // The Abyssal Submersible is PR-3 for everyone. A refit that stepped it to
    // 4 would invent water no depth band asks for, which is why the terms carry
    // a ceiling rather than a flat +1.
    for (const faction of FACTIONS) {
      const ceiling = PRESSURE_REFIT_TERMS[faction].pressureCeiling;
      const sub = effectivePressureRating(UnitKind.AbyssalSubmersible, faction);
      assert.ok(refittedPressureRating(sub, faction) <= Math.max(ceiling, sub));
      assert.ok(refittedPressureRating(sub, faction) <= 3, `${Faction[faction]}: no PR-4 by refit`);
    }
    // And the navy that is not offered one gets nothing from the function
    // either, so a caller that forgot to ask `refitOfferedTo` cannot smuggle a
    // band past the table.
    const born = effectivePressureRating(UnitKind.Harvester, Faction.Directorate);
    assert.equal(refittedPressureRating(born, Faction.Directorate), born);
  });

  it('never lowers a hull’s rating: the ceiling caps the gain, it takes nothing (#1221)', () => {
    // §2 sells a step up. The Commune's ceiling is 2, and the Submersible, the
    // Verger, the Thurible and the Lure are born PR-3 for it; a bare
    // `min(ceiling, rating + 1)` handed all four crush at 2,400 m.
    for (const faction of FACTIONS) {
      for (const kind of Object.keys(UNIT_STATS).map(Number) as UnitKind[]) {
        const rating = effectivePressureRating(kind, faction);
        assert.ok(
          refittedPressureRating(rating, faction) >= rating,
          `${Faction[faction]}'s refit lowers the ${UnitKind[kind]} from PR-${rating}`
        );
      }
    }
  });

  it('keeps the list at the five §2 wrote, and no more', () => {
    // "Five refits is the list. A sixth is a design change to this document,
    // not a constant." What this holds is that the enum and the roster table
    // cannot drift apart, so a sixth cannot be offered by one reader and
    // missed by the other.
    assert.deepEqual(
      [...REFIT_KINDS],
      [RefitKind.Pressure, RefitKind.Plate, RefitKind.Drive, RefitKind.Magazine, RefitKind.Hold]
    );
    assert.equal(Object.keys(REFIT_STATS).length, REFIT_KINDS.length);
    for (const kind of REFIT_KINDS) assert.equal(REFIT_STATS[kind].kind, kind);
  });
});

describe('what a navy’s refits add up to', () => {
  // Both sides hold the purchases differently — the server a set, the snapshot
  // a sorted list — and every reader goes through these, so they are asserted
  // over both shapes and over nothing bought at all.
  const shapes = (kinds: RefitKind[]) => [new Set(kinds), [...kinds]];

  it('moves nothing for a navy that has bought nothing', () => {
    for (const owned of [undefined, new Set<RefitKind>(), []]) {
      assert.equal(refitHullFactor(owned), 1);
      assert.equal(refitSpeedFactor(owned), 1);
      assert.equal(refitHoldFactor(owned), 1);
      assert.equal(refitSigBonus(owned, false), 0);
      assert.equal(refitSigBonus(owned, true), 0);
    }
  });

  it('moves each stat by its own refit and by no other', () => {
    for (const owned of shapes([RefitKind.Plate])) {
      assert.equal(refitHullFactor(owned), 1.15);
      assert.equal(refitSpeedFactor(owned), 1);
      assert.equal(refitHoldFactor(owned), 1);
    }
    for (const owned of shapes([RefitKind.Drive])) assert.equal(refitSpeedFactor(owned), 1.1);
    for (const owned of shapes([RefitKind.Hold])) assert.equal(refitHoldFactor(owned), 1.2);
  });

  it('sums the noise of every refit, stopped and under way', () => {
    // Pressure +2/+2, Plate 0/+3, Drive +4/+4: two refits that each cost noise
    // are two pieces of machinery running.
    for (const owned of shapes([...REFIT_KINDS])) {
      assert.equal(refitSigBonus(owned, false), 2 + 0 + 4, 'stopped: the pumps and the drive');
      assert.equal(refitSigBonus(owned, true), 2 + 3 + 4, 'under way: the plate as well');
    }
    for (const owned of shapes([RefitKind.Plate])) {
      assert.equal(refitSigBonus(owned, false), 0, 'plate is silent until it is pushed');
    }
  });

  it('grows the standard magazine to three, and no hull with a number of its own', () => {
    // The ruling §2 records (#1785): the Broadside's four and the Lance's one
    // are each that hull's argument, and the refit leaves both.
    const corvette = UnitKind.Corvette;
    assert.equal(statsFor(corvette).torpedoMagazine, undefined, 'the Corvette is on the standard');
    assert.equal(torpedoMagazineFor(corvette, undefined), ORDNANCE.TORPEDO.MAGAZINE);
    assert.equal(ORDNANCE.TORPEDO.MAGAZINE, 2, 'the roster’s two');
    for (const owned of shapes([RefitKind.Magazine])) {
      assert.equal(torpedoMagazineFor(corvette, owned), 3, '2 → 3');
      assert.equal(torpedoMagazineFor(UnitKind.Broadside, owned), 4, 'the alpha strike keeps four');
      assert.equal(torpedoMagazineFor(UnitKind.Lance, owned), 1, 'the committed shot keeps one');
    }
    for (const owned of shapes([RefitKind.Pressure, RefitKind.Plate, RefitKind.Drive])) {
      assert.equal(torpedoMagazineFor(corvette, owned), 2, 'only the Magazine Refit moves it');
    }
  });
});
