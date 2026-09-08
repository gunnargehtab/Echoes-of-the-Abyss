/**
 * The cutter's 40% (#565) — docs/systems-flora.md §2, docs/hazards.md §4.
 * Wave 5 of #547.
 *
 * The Consortium's answer to kelp has always been to destroy it rather than
 * swim better through it, and the burn that does it has always been a
 * commitment: six seconds of standing in the quietest biome on the map being
 * loud. What it never did was *take* anything. After wave 1 there is a crop to
 * take, so the same act now pays — badly, on purpose.
 *
 * What is pinned here is the gap between the two numbers. A cutter banks 40%
 * of what it cuts and the region is charged for **all** of it, which is the
 * difference between harvesting a bed and destroying one. Every clause §2
 * gives the cutter falls out of that: fastest at eating a field, worst paid
 * for it, and worth doing for the hole rather than for the account.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Biome, DRIFT, Faction, FLORA, SIM, StructureKind, UnitKind } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnStructure, spawnUnit } from '../src/sim/world.ts';
import { SilentRunning } from '../src/sim/components.ts';
import { type Hazard } from '../src/sim/systems/hazards.ts';
import { terrainFor, VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const BED_X = 4000;
const BED_Y = 4000;
const BED_RADIUS_M = 1200;

/** One bed on its own plateau, so a reading has one explanation. */
function bedMap(): MapDefinition {
  return {
    ...VENTFRONT_DIVIDE,
    id: 'test-cutter',
    regions: [
      {
        x: BED_X - BED_RADIUS_M,
        y: BED_Y - BED_RADIUS_M,
        widthM: BED_RADIUS_M * 2,
        heightM: BED_RADIUS_M * 2,
        biome: Biome.KelpForest,
      },
    ],
    hazards: [{ x: BED_X, y: BED_Y, radiusM: BED_RADIUS_M, kind: 'kelp-entanglement' }],
  };
}

function match(): Match {
  const map = bedMap();
  return new Match(map, { fauna: false, seed: 51, terrain: terrainFor(map) });
}

function advance(m: Match, seconds: number): void {
  for (let i = 0; i < seconds * SIM.TICK_HZ; i++) m.update(STEP_MS);
}

function bed(m: Match): Hazard {
  const field = m.world.hazards.find((h) => h.kind === 'kelp-entanglement');
  assert.ok(field !== undefined, 'the map must carry a bed, or this tests nothing');
  return field;
}

function biomass(m: Match, slot = 0): number {
  return m.world.economies.get(slot)?.biomass ?? 0;
}

/** A hull standing in the middle of the bed. */
function inTheBed(m: Match, faction = Faction.Bathyarch, slot = 0): number {
  return spawnUnit(m.world, {
    kind: UnitKind.Corvette,
    slot,
    faction,
    x: BED_X,
    y: BED_Y,
    depth: 300,
  });
}

describe('a thermal cutter banks what it cuts', () => {
  it('takes crop out of the bed at the doc rate', () => {
    const m = match();
    inTheBed(m);
    advance(m, 60);
    // Regrowth is pushing the other way at 9.6 a minute, so what the bed
    // actually loses in a minute is the difference — which is the honest
    // reading of a cut in healthy water, and the same arithmetic wave 3 had
    // to record for the reactor.
    const takenNet = (1 - bed(m).crop) * FLORA.FULL_CROP_BIOMASS;
    const expected = FLORA.CUTTER_CROP_PER_MIN - FLORA.REGROWTH_PER_MIN * FLORA.FULL_CROP_BIOMASS;
    assert.ok(
      Math.abs(takenNet - expected) < 1,
      `a minute of cutting against a minute of growth: ${takenNet} for ${expected}`
    );
  });

  it('pays the cutter 40% of what came off', () => {
    const m = match();
    inTheBed(m);
    advance(m, 60);
    // Against the gross cut, not the net: the bed grew back under the cutter
    // and the cutter was paid for every gram it took either way.
    const gross = FLORA.CUTTER_CROP_PER_MIN;
    assert.ok(
      Math.abs(biomass(m) - gross * FLORA.CUTTER_YIELD) < 0.5,
      `40% of what it cut: ${biomass(m)} against ${gross * FLORA.CUTTER_YIELD}`
    );
  });

  it('eats a bed faster than a reactor and earns less doing it', () => {
    // §2's three clauses, which between them are what pin the rate: "eats it
    // quickest", "worst-paid", and "the point is rarely the money".
    assert.ok(
      FLORA.CUTTER_CROP_PER_MIN > FLORA.REACTOR_BIOMASS_PER_MIN,
      'the cutter must be the fastest way to empty a field'
    );
    assert.ok(
      FLORA.CUTTER_CROP_PER_MIN * FLORA.CUTTER_YIELD < FLORA.REACTOR_BIOMASS_PER_MIN,
      'and the worst-paid way to do it'
    );

    // And measured, against a reactor on the same bed for the same minute.
    const cutting = match();
    inTheBed(cutting);
    advance(cutting, 60);

    const rendering = match();
    spawnStructure(rendering.world, {
      kind: StructureKind.BioReactor,
      slot: 0,
      faction: Faction.Bathyarch,
      x: BED_X,
      y: BED_Y,
      prebuilt: true,
    });
    advance(rendering, 60);

    assert.ok(
      bed(cutting).crop < bed(rendering).crop,
      `the cutter eats faster: ${bed(cutting).crop} against ${bed(rendering).crop}`
    );
    assert.ok(
      biomass(cutting) < biomass(rendering),
      `and is paid less for it: ${biomass(cutting)} against ${biomass(rendering)}`
    );
  });

  it('charges the region for the whole cut, not for the banked share', () => {
    // §3 charges Drift Health for "Biomass of crop taken out of a field", and
    // a cutter takes two and a half times what it banks. That gap is what
    // makes it wasteful rather than merely cheap.
    const m = match();
    const before = m.world.drift.at(BED_X, BED_Y);
    inTheBed(m);
    advance(m, 60);
    const spent = before - m.world.drift.at(BED_X, BED_Y);
    const onTheCut = FLORA.CUTTER_CROP_PER_MIN * FLORA.HEALTH_PER_BIOMASS;
    const onTheBank = onTheCut * FLORA.CUTTER_YIELD;
    // A cutter is loud but not loud enough to wear a region by noise, so the
    // water is also healing the whole minute. The charge is the difference.
    const healed = DRIFT.HEALTH_RECOVERY_PER_S * 60;
    assert.ok(
      Math.abs(spent - (onTheCut - healed)) < 0.5,
      `charged for the cut: ${spent} against ${onTheCut} less ${healed} healed`
    );
    assert.ok(spent > onTheBank, `and for more than the banked share of ${onTheBank}`);
  });
});

describe('and who may do it', () => {
  it('pays nobody but the Consortium', () => {
    // Every navy has an opinion about kelp and only one of them is "destroy
    // it" (docs/hazards.md §4). A Commune hull in a bed is at home, not at
    // work.
    for (const faction of [Faction.Pelagia, Faction.Directorate, Faction.Hadron]) {
      const m = match();
      inTheBed(m, faction);
      advance(m, 60);
      assert.equal(biomass(m), 0, `${faction} does not cut`);
      assert.equal(bed(m).crop, 1, 'and the canopy is untouched');
    }
  });

  it('stops the moment the hull goes quiet', () => {
    // Bloom-share's rule and the same argument: thermal cutters are
    // industrial machinery, and a hull that has shut its systems down is not
    // running them.
    const m = match();
    const eid = inTheBed(m);
    advance(m, 30);
    const banked = biomass(m);
    const cut = bed(m).crop;
    assert.ok(banked > 0, 'it was cutting');

    SilentRunning.active[eid] = 1;
    advance(m, 30);
    assert.equal(biomass(m), banked, 'silence banks nothing');
    assert.ok(bed(m).crop > cut, 'and the canopy grows back over a hull that has gone quiet');
  });

  it('pays one share per field however many hulls stand in it', () => {
    // A garden pays for being tended, not per gardener (#243). Massing
    // cutters on one bed buys nothing but a louder cluster of targets.
    const one = match();
    inTheBed(one);
    advance(one, 30);

    const many = match();
    for (let i = 0; i < 4; i++) {
      spawnUnit(many.world, {
        kind: UnitKind.Corvette,
        slot: 0,
        faction: Faction.Bathyarch,
        x: BED_X + i * 50,
        y: BED_Y,
        depth: 300,
      });
    }
    advance(many, 30);

    assert.ok(
      Math.abs(biomass(many) - biomass(one)) < 0.5,
      `four cutters bank what one does: ${biomass(many)} against ${biomass(one)}`
    );
  });

  it('stops when the bed is bare, and takes what grows back after', () => {
    const m = match();
    inTheBed(m);
    // Long enough to strip it: 20 a minute out against 9.6 back is a bed in
    // about twenty-three minutes, and the water fails long before that, which
    // stops the regrowth and lets the cut finish the job.
    advance(m, 1500);
    assert.ok(bed(m).crop < 0.05, `the bed is spent: ${bed(m).crop}`);
    const banked = biomass(m);
    advance(m, 60);
    assert.ok(
      biomass(m) - banked < FLORA.CUTTER_CROP_PER_MIN * FLORA.CUTTER_YIELD,
      'and pays little from bare ground'
    );
  });
});
