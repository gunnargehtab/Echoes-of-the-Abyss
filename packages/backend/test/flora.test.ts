/**
 * Standing crop (#549) — docs/systems-flora.md §1, wave 1 of #547.
 *
 * A kelp field gains one number, and the whole flora economy is built on what
 * that number means: **the crop is the cover**. A bed's standing crop *is* its
 * canopy, so it is read as masking, as grip and — from wave 3 — as income,
 * and it can never be bookkept twice.
 *
 * What is pinned here is the half that exists now: thinning a bed un-hides the
 * water it stands in and loosens its grip in the same act, and a bed stripped
 * to nothing is bare ground rather than a weak hazard. Nothing consumes crop
 * yet, so the other property worth holding is that a match where nobody
 * harvests is exactly the match it was before beds had a crop at all.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Biome,
  Faction,
  FLORA,
  HAZARDS,
  HazardPhase,
  PROPAGATION_FACTOR,
  SIM,
  UnitKind,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { Velocity } from '../src/sim/components.ts';
import {
  kelpModifiers,
  rebuildPropagation,
  setKelpCrop,
  type Hazard,
} from '../src/sim/systems/hazards.ts';
import { terrainFor, VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const BED_X = 4000;
const BED_Y = 4000;
const BED_RADIUS_M = 1500;

/**
 * A bed on its own plateau. The kelp region matters: crop is specified as a
 * ramp between the biome's own figure and a bare plateau, so a field authored
 * over open water would be measuring the ramp against the wrong end.
 */
function bedMap(): MapDefinition {
  return {
    ...VENTFRONT_DIVIDE,
    id: 'test-flora',
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

function match(map: MapDefinition = bedMap(), seed = 51): Match {
  // The map's own terrain, painted from its regions — unlike kelp.test.ts,
  // which hands `Match` a blank grid because it is measuring drag and does not
  // care what the ground is. Here the ground is half the measurement: the crop
  // ramp starts at the biome's figure.
  return new Match(map, { fauna: false, seed, terrain: terrainFor(map) });
}

function advance(m: Match, seconds: number): void {
  for (let i = 0; i < seconds * SIM.TICK_HZ; i++) m.update(STEP_MS);
}

function bed(m: Match): Hazard {
  const field = m.world.hazards.find((h) => h.kind === 'kelp-entanglement');
  assert.ok(field !== undefined, 'the map must carry a bed, or this tests nothing');
  return field;
}

/** PF at the middle of the bed. */
function maskingAtBed(m: Match): number {
  return m.world.terrain.propagationAt(BED_X, BED_Y);
}

/** What the field costs a hull standing at its centre, pushing east. */
function grip(
  m: Match,
  faction: Faction,
  kind = UnitKind.Corvette
): { speed: number; sig: number } {
  const eid = spawnUnit(m.world, { kind, slot: 0, faction, x: BED_X, y: BED_Y });
  // kelpModifiers charges drag-SIG for *moving*, and reads Velocity to decide.
  // Written rather than ordered, so the reading is of one canopy at one crop
  // rather than of wherever a hull got to while the test advanced.
  Velocity.x[eid] = 1;
  Velocity.y[eid] = 0;
  return kelpModifiers(m.world, eid);
}

describe('a bed carries a standing crop', () => {
  it('starts with its canopy whole', () => {
    const m = match();
    assert.equal(bed(m).crop, 1);
  });

  it('masks at the biome figure while it stands full, exactly as it always did', () => {
    // The no-op case, and the one worth being strict about: full crop lists no
    // modifier at all, so a map nobody harvests is the map it was before crop
    // existed. A stored baseline moving on this wave would be a bug.
    const m = match();
    advance(m, 2);
    assert.equal(maskingAtBed(m), Math.fround(PROPAGATION_FACTOR[Biome.KelpForest]));
  });

  it('un-hides the water as the canopy comes off', () => {
    const m = match();
    setKelpCrop(m.world, bed(m), 0);
    assert.equal(maskingAtBed(m), Math.fround(FLORA.BARE_CROP_PF), 'a bare plateau is bare');

    setKelpCrop(m.world, bed(m), 1);
    assert.equal(
      maskingAtBed(m),
      Math.fround(FLORA.FULL_CROP_PF),
      'and it masks again if it grows'
    );
  });

  it('ramps linearly between the two ends', () => {
    const m = match();
    const midpoint = (FLORA.FULL_CROP_PF + FLORA.BARE_CROP_PF) / 2;
    setKelpCrop(m.world, bed(m), 0.5);
    assert.ok(
      Math.abs(maskingAtBed(m) - midpoint) < 0.01,
      `half a canopy masks halfway: ${maskingAtBed(m)} against ${midpoint}`
    );

    setKelpCrop(m.world, bed(m), 0.25);
    const quarter = FLORA.FULL_CROP_PF + (FLORA.BARE_CROP_PF - FLORA.FULL_CROP_PF) * 0.75;
    assert.ok(
      Math.abs(maskingAtBed(m) - quarter) < 0.01,
      `and a quarter three-quarters of the way: ${maskingAtBed(m)} against ${quarter}`
    );
  });

  it('thins only the water it stands in', () => {
    const m = match();
    const outside = m.world.terrain.propagationAt(BED_X + BED_RADIUS_M * 2, BED_Y);
    setKelpCrop(m.world, bed(m), 0);
    assert.equal(
      m.world.terrain.propagationAt(BED_X + BED_RADIUS_M * 2, BED_Y),
      outside,
      'cutting a bed does not open the water beside it'
    );
  });

  it('clamps rather than trusting a caller', () => {
    // The setter is the only way crop moves, and from wave 2 its callers are a
    // regrowth rate and a harvest rate that both accumulate.
    const m = match();
    setKelpCrop(m.world, bed(m), -3);
    assert.equal(bed(m).crop, 0);
    setKelpCrop(m.world, bed(m), 4);
    assert.equal(bed(m).crop, 1);
  });
});

describe('the crop is the grip', () => {
  it('grips half as hard on half a canopy', () => {
    const full = grip(match(), Faction.Hadron);
    const m = match();
    setKelpCrop(m.world, bed(m), 0.5);
    const half = grip(m, Faction.Hadron);

    // Speed and SIG are one lever: the drag-SIG is a function of how hard the
    // field pulls, so half the drag is half the noise without a second number.
    assert.ok(
      Math.abs(1 - half.speed - (1 - full.speed) / 2) < 1e-6,
      `half the drag: ${half.speed} against ${full.speed}`
    );
    assert.ok(
      Math.abs(half.sig - full.sig / 2) < 1e-6,
      `and half the drag-SIG: ${half.sig} against ${full.sig}`
    );
    assert.ok(full.sig > 0, 'the full field must actually cost noise, or this tests nothing');
  });

  it('thins a large hull grip and a small one alike', () => {
    // Applied after the large-hull floor, so a Cruiser in a half-cut bed is
    // half as stuck rather than stuck at the floor regardless.
    const full = grip(match(), Faction.Hadron, UnitKind.Cruiser);
    const m = match();
    setKelpCrop(m.world, bed(m), 0.5);
    const half = grip(m, Faction.Hadron, UnitKind.Cruiser);
    assert.ok(
      Math.abs(1 - half.speed - (1 - full.speed) / 2) < 1e-6,
      `the floor thins too: ${half.speed} against ${full.speed}`
    );
  });

  it('charges Pelagia nothing at any crop, because nothing was dragging on them', () => {
    const m = match();
    setKelpCrop(m.world, bed(m), 0.4);
    const free = grip(m, Faction.Pelagia);
    assert.equal(free.speed, 1);
    assert.equal(free.sig, 0);
  });
});

describe('a stripped bed is not a hazard', () => {
  it('grips nothing at all once the canopy is gone', () => {
    const m = match();
    setKelpCrop(m.world, bed(m), 0);
    const nothing = grip(m, Faction.Hadron);
    assert.equal(nothing.speed, 1, 'bare ground is bare');
    assert.equal(nothing.sig, 0);
  });

  it('charges no cutter SIG for cutting a canopy that is gone', () => {
    // The Consortium pay CUTTER_SIG for running thermal cutters in a field
    // whether they move or not. On bare ground there is nothing to cut, and
    // the charge is tested from the crop rather than the phase so that a bed
    // stripped this tick is silent this tick.
    const cutting = grip(match(), Faction.Bathyarch);
    assert.equal(cutting.sig >= HAZARDS.KELP.CUTTER_SIG, true, 'cutters are loud in a live bed');

    const m = match();
    setKelpCrop(m.world, bed(m), 0);
    assert.equal(grip(m, Faction.Bathyarch).sig, 0, 'and silent on a plateau they already cut');
  });

  it('stops standing as an active field', () => {
    const m = match();
    assert.equal(bed(m).phase, HazardPhase.Active);
    setKelpCrop(m.world, bed(m), 0);
    advance(m, 1);
    assert.equal(bed(m).phase, HazardPhase.Dormant, 'a bare site is visible, and does nothing');
  });

  it('grips again when the bed comes back', () => {
    const m = match();
    setKelpCrop(m.world, bed(m), 0);
    advance(m, 1);
    setKelpCrop(m.world, bed(m), 1);
    advance(m, 1);
    assert.equal(bed(m).phase, HazardPhase.Active);
    assert.ok(grip(m, Faction.Hadron).speed < 1);
  });
});

describe('the grid is not rebuilt for a leaf at a time', () => {
  it('rebuilds propagation a bounded number of times as a bed is cut away', () => {
    // Counted work, not a stopwatch: PF is a whole-grid recompute on the 60 Hz
    // path, and from wave 3 a reactor eats crop every tick. What keeps that off
    // the step budget is that crop is quantised before it reaches the grid, so
    // this is the property to hold rather than the milliseconds it costs today.
    const m = match();
    const terrain = m.world.terrain;
    let rebuilds = 0;
    const real = terrain.applyPropagationModifiers.bind(terrain);
    terrain.applyPropagationModifiers = (mods) => {
      rebuilds++;
      real(mods);
    };

    const field = bed(m);
    const cuts = 400;
    for (let i = 1; i <= cuts; i++) setKelpCrop(m.world, field, 1 - i / cuts);

    assert.equal(field.crop, 0, 'the bed really is stripped');
    assert.ok(
      rebuilds <= FLORA.CROP_PF_STEPS,
      `${cuts} cuts must not be ${cuts} grid walks: ${rebuilds} rebuilds`
    );
    assert.ok(rebuilds > 1, 'and the grid must still follow the canopy down');
  });

  it('writes the same masking however the rebuild was triggered', () => {
    // The grid is written from the *quantised* crop, and a rebuild has three
    // other callers — a storm boundary, a jelly death, a corridor coming down.
    // A bed whose crop sits between two steps must not read one PF after its
    // own cut and another after somebody else's rebuild.
    const m = match();
    setKelpCrop(m.world, bed(m), 0.53);
    const afterCut = maskingAtBed(m);
    rebuildPropagation(m.world);
    assert.equal(maskingAtBed(m), afterCut);
  });
});
