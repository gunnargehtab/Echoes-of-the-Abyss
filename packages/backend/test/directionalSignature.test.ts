/**
 * Directional signature — docs/systems-echo.md §8, worked in
 * docs/mission-aptitude.md §4.
 *
 * The Knights' doctrine as a term in the detection formula: a Knight hull's SIG
 * is multiplied by where the listener stands relative to that hull's own bow,
 * and the circle divides into quarters. What is worth testing is not the
 * arithmetic — that is four lines — but the four ways it can be wrong and look
 * right:
 *
 * - **The sectors have to be the documented ones**, boundaries included. §8
 *   says "within 45° either side" and means it; a listener at exactly 45° is in
 *   the cone, which floating point does not give you for free.
 * - **It belongs to the emitter, not the pair.** `thermoclineFactor` next door
 *   is symmetric because a path is a property of both ends, and copying that
 *   here would be the natural mistake: a Knight showing its wake is quiet to
 *   that listener and hears it exactly as well as before.
 * - **The bow has to survive a stop.** A sounding is twenty seconds of a
 *   stationary hull (docs/mission-aptitude.md §4), and before this the only
 *   heading in the simulation was `atan2` of a velocity that is zero.
 * - **The exclusions are three and no more** — the ping, residue, and anything
 *   without a front.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIRECTIONAL_COMPASS_AVERAGE,
  DIRECTIONAL_CONE_COS,
  DIRECTIONAL_SIGNATURE,
  DIRECTIONAL_WAKE_COS,
  Faction,
  MOVEMENT,
  ResolutionTier,
  StructureKind,
  SIM,
  UnitKind,
  detectionRatio,
  statsFor,
  directionalFactor,
  directionalSectorFactor,
} from '@echoes/shared';
import { hasComponent } from 'bitecs';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnStructure, spawnUnit } from '../src/sim/world.ts';
import { Heading, Position } from '../src/sim/components.ts';
import { hasBow } from '../src/sim/directional.ts';
import { VENTFRONT_DIVIDE } from '../src/sim/maps/index.ts';
import { Biome } from '@echoes/shared';

const S = DIRECTIONAL_SIGNATURE;
const STEP_MS = 1000 / SIM.TICK_HZ;

/** The factor for a listener `deg` off a bow pointing at zero. */
const atDegrees = (deg: number): number => {
  const r = (deg * Math.PI) / 180;
  return directionalFactor(0, 0, 0, Math.cos(r) * 1000, Math.sin(r) * 1000);
};

describe('the quartered circle — §8', () => {
  it('is the documented three sectors, with the boundaries where the document puts them', () => {
    // "Within 45° either side" is inclusive, and so is the wake's 135°.
    assert.equal(atDegrees(0), S.CONE);
    assert.equal(atDegrees(44.9), S.CONE);
    assert.equal(atDegrees(45), S.CONE, 'exactly 45° is inside the cone');
    assert.equal(atDegrees(45.1), S.FLANK);
    assert.equal(atDegrees(90), S.FLANK);
    assert.equal(atDegrees(134.9), S.FLANK);
    assert.equal(atDegrees(135), S.WAKE, 'exactly 135° is in the wake');
    assert.equal(atDegrees(180), S.WAKE);
    // Symmetric about the bow: a beam is a beam on either side.
    for (const deg of [30, 60, 120, 170]) assert.equal(atDegrees(-deg), atDegrees(deg));
  });

  it('reads the mix, exactly — 0 dB, −9 dB, −20 dB', () => {
    // §8 derives WAKE from audio-direction.md's "up to −20 dB" rather than
    // picking it. If someone rounds this to a friendlier number the mix stops
    // being a rendering of the model and starts being a decoration on one.
    assert.equal(20 * Math.log10(S.CONE), 0);
    assert.equal(Math.round(20 * Math.log10(S.WAKE)), -20);
    assert.equal(Math.round(20 * Math.log10(S.FLANK)), -9);
  });

  it('averages 0.45 over the compass, which is the balance clause', () => {
    // One quarter at 1.00, two at 0.35, one at 0.10. A Knight is an ordinary
    // hull with its loudness moved, not a quiet one.
    assert.equal((S.CONE + 2 * S.FLANK + S.WAKE) / 4, 0.45);
    // And the constant the roster is solved from is that same average rather
    // than a second copy of 0.45 — the Clarion's cone figure is 1/this, so a
    // sector-table edit that moved the average has to move the hull with it
    // (docs/units.md, `units.test.ts`).
    assert.equal(DIRECTIONAL_COMPASS_AVERAGE, 0.45);
  });

  it('puts a listener at the emitter’s own position in the cone', () => {
    // Point blank is point blank. Falls out of `dot = 0` against a boundary of
    // `0` rather than needing a branch, so it is worth pinning.
    assert.equal(directionalSectorFactor(0, 0), S.CONE);
  });

  it('derives its cosines from its degrees', () => {
    assert.equal(DIRECTIONAL_CONE_COS, Math.cos((S.CONE_HALF_ANGLE_DEG * Math.PI) / 180));
    assert.equal(DIRECTIONAL_WAKE_COS, Math.cos((S.WAKE_HALF_ANGLE_DEG * Math.PI) / 180));
  });
});

/** Where `sig` stops resolving to Classification, in PF 0.70 water, to HYD 65. */
const classificationRangeM = (sig: number): number => {
  let lo = 1;
  let hi = 20000;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (detectionRatio(sig, 0.7, mid, 65) >= 2.5) lo = mid;
    else hi = mid;
  }
  return lo;
};

describe('the ranges docs/mission-aptitude.md §4 quotes', () => {
  it('classifies a corvette at 1,414 m bow-on, 734 m beam-on and 335 m stern-on', () => {
    // The table §4 prints. A factor of four in distance, decided by nothing but
    // where the hull is pointed — this is the mission's whole lesson and it is
    // the number a reader will check first.
    assert.ok(Math.abs(classificationRangeM(28 * S.CONE) - 1414) <= 1);
    assert.ok(Math.abs(classificationRangeM(28 * S.FLANK) - 734) <= 1);
    assert.ok(Math.abs(classificationRangeM(28 * S.WAKE) - 335) <= 1);
  });

  it('classifies a sounding at 2,726 m, 1,414 m and 646 m', () => {
    assert.ok(Math.abs(classificationRangeM(80 * S.CONE) - 2726) <= 1);
    assert.ok(Math.abs(classificationRangeM(80 * S.FLANK) - 1414) <= 1);
    assert.ok(Math.abs(classificationRangeM(80 * S.WAKE) - 646) <= 1);
  });

  it('lands the sounding’s off-axis sectors on two figures a player already knows', () => {
    // §4: a sounding's flank is a corvette at cruise, and its wake is a hull
    // running silent. Both exact, which is a property of the table worth
    // keeping rather than a coincidence worth admiring.
    assert.equal(80 * S.FLANK, 28);
    assert.equal(80 * S.WAKE, 8);
  });

  it('makes a cruising hull pointed away quieter than a silent one pointed at you', () => {
    // §4's closing argument, and the reason the Order does not run silent: a
    // Knight at cruise showing its wake reads 2.8, and Silent Running's own
    // floor-to-ceiling band bottoms out at 3. Turning is a better deal than the
    // button, with the guns still live and at full speed.
    assert.ok(28 * S.WAKE < 3);
    assert.ok(classificationRangeM(28 * S.WAKE) < classificationRangeM(8 * S.CONE));
  });
});

/**
 * One emitter and one listener, `deg` off the emitter's bow.
 *
 * The emitter is a Knight Corvette unless told otherwise; `kind` and `faction`
 * exist so the Order's own hull can be compared against the generic one it is
 * scaled against (#401), which is a comparison rather than a single reading.
 */
function pair(options: {
  headingRad: number;
  distanceM: number;
  deg: number;
  kind?: UnitKind;
  faction?: Faction;
}): {
  tier: ResolutionTier;
  knightHearsBack: boolean;
} {
  const terrain = new Terrain(12000, 12000, 250);
  terrain.fillRect(0, 0, 12000, 12000, Biome.ResonanceField);
  const match = new Match(VENTFRONT_DIVIDE, { fauna: false, seed: 7, terrain });

  const ex = 6000;
  const ey = 6000;
  const knight = spawnUnit(match.world, {
    kind: options.kind ?? UnitKind.Corvette,
    slot: 0,
    faction: options.faction ?? Faction.Hadron,
    x: ex,
    y: ey,
    heading: options.headingRad,
  });
  const r = (options.deg * Math.PI) / 180;
  const listener = spawnUnit(match.world, {
    kind: UnitKind.Cruiser,
    slot: 1,
    faction: Faction.Bathyarch,
    x: ex + Math.cos(r) * options.distanceM,
    y: ey + Math.sin(r) * options.distanceM,
  });

  const result = match.echo.run(match.world, [0, 1]);
  const held = (result.contactsBySlot.get(1) ?? []).find(
    (contact) => match.echo.entityForHandle(1, contact.id) === knight
  );
  const back = (result.contactsBySlot.get(0) ?? []).some(
    (contact) => match.echo.entityForHandle(0, contact.id) === listener
  );
  return { tier: held?.tier ?? ResolutionTier.Silent, knightHearsBack: back };
}

describe('the Clarion — the hull the term was waiting for (#401)', () => {
  const clarion = statsFor(UnitKind.Clarion);
  const corvette = statsFor(UnitKind.Corvette);

  it('is heard further bow-on and less astern than the generic hull it replaces', () => {
    // The doctrine as two distances, in the same water §4 quotes: an Order
    // commander who builds the Order's hull buys reach in front and pays for
    // it nowhere, because the compass average is the Corvette's. What they
    // actually give up is the ability to be sloppy — the cone is now twice as
    // far as a generic Corvette's, and so is the price of showing it to the
    // wrong listener.
    const clarionBow = classificationRangeM(clarion.sigCruise * S.CONE);
    const clarionWake = classificationRangeM(clarion.sigCruise * S.WAKE);
    const generic = classificationRangeM(corvette.sigCruise);

    assert.ok(
      clarionBow > generic,
      `a Clarion bow-on (${clarionBow.toFixed(0)} m) should out-reach a generic ` +
        `Corvette (${generic.toFixed(0)} m)`
    );
    assert.ok(
      clarionWake < generic,
      `and a Clarion showing its wake (${clarionWake.toFixed(0)} m) should be the quieter of ` +
        'the two, or the hull is simply louder rather than aimed'
    );
  });

  it('resolves better bow-on than a Knight-rigged Corvette in the same water', () => {
    // In the water rather than in the arithmetic, and against the hull the
    // Order fields today: the Clarion is what those missions are short of.
    const clarionBow = pair({
      headingRad: 0,
      distanceM: 1400,
      deg: 0,
      kind: UnitKind.Clarion,
    });
    const riggedBow = pair({ headingRad: 0, distanceM: 1400, deg: 0 });
    assert.ok(
      clarionBow.tier > riggedBow.tier,
      `the Order's own hull should be the louder one in its own cone ` +
        `(${clarionBow.tier} vs ${riggedBow.tier})`
    );
  });
});

describe('in the Echo pass', () => {
  it('resolves a Knight better bow-on than beam-on, and beam-on than stern-on', () => {
    // 1,000 m is inside every one of the three envelopes at contact and inside
    // only some of them at higher tiers, which is what makes the comparison
    // meaningful rather than three identical Tier-4s.
    const bow = pair({ headingRad: 0, distanceM: 1000, deg: 0 });
    const beam = pair({ headingRad: 0, distanceM: 1000, deg: 90 });
    const stern = pair({ headingRad: 0, distanceM: 1000, deg: 180 });
    assert.ok(bow.tier > beam.tier, `bow ${bow.tier} should beat beam ${beam.tier}`);
    assert.ok(beam.tier > stern.tier, `beam ${beam.tier} should beat stern ${stern.tier}`);
  });

  it('turns the hull rather than moving it, and the resolution changes', () => {
    // The mechanic as a player meets it: nothing moved, nothing got quieter,
    // and the contact changed tier.
    const facing = pair({ headingRad: 0, distanceM: 1400, deg: 0 });
    const away = pair({ headingRad: Math.PI, distanceM: 1400, deg: 0 });
    assert.ok(facing.tier > away.tier);
  });

  it('does not change what the Knight hears — the term is the emitter’s', () => {
    // The trap `thermoclineFactor` sets next door: that one is symmetric
    // because a path belongs to the pair. This one is not. A Knight with its
    // wake to a listener is quiet to it and hears it exactly as well as before.
    const bow = pair({ headingRad: 0, distanceM: 1400, deg: 0 });
    const wake = pair({ headingRad: Math.PI, distanceM: 1400, deg: 0 });
    assert.equal(bow.knightHearsBack, wake.knightHearsBack);
    assert.equal(wake.knightHearsBack, true, 'the Cruiser is audible to the Knight either way');
  });

  it('leaves every other navy omnidirectional', () => {
    const terrain = new Terrain(12000, 12000, 250);
    terrain.fillRect(0, 0, 12000, 12000, Biome.ResonanceField);
    const match = new Match(VENTFRONT_DIVIDE, { fauna: false, seed: 9, terrain });
    const tierAt = (deg: number): ResolutionTier => {
      const consortium = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 0,
        faction: Faction.Bathyarch,
        x: 6000,
        y: 6000,
        heading: 0,
      });
      const r = (deg * Math.PI) / 180;
      spawnUnit(match.world, {
        kind: UnitKind.Cruiser,
        slot: 1,
        faction: Faction.Pelagia,
        x: 6000 + Math.cos(r) * 1400,
        y: 6000 + Math.sin(r) * 1400,
      });
      const result = match.echo.run(match.world, [0, 1]);
      const held = (result.contactsBySlot.get(1) ?? []).find(
        (c) => match.echo.entityForHandle(1, c.id) === consortium
      );
      return held?.tier ?? ResolutionTier.Silent;
    };
    assert.equal(tierAt(0), tierAt(180), 'a Consortium hull sounds the same from behind');
  });
});

describe('a bow that survives a stop', () => {
  it('keeps the last ordered course after the hull arrives', () => {
    // The half of this feature that is not the arithmetic. A sounding is twenty
    // seconds of a stationary hull, and `atan2(Velocity.y, Velocity.x)` on a
    // stopped hull is zero — due east — for every hull on the map.
    const match = new Match(VENTFRONT_DIVIDE, { fauna: false, seed: 11 });
    match.addPlayer(0, Faction.Hadron);
    const hull = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Hadron,
      x: 4000,
      y: 4000,
    });

    // Due north, in this simulation's convention: +y, so atan2(+1, 0) = +π/2.
    match.orderMove(0, hull, 4000, 5000);
    for (let i = 0; i < SIM.TICK_HZ * 40; i++) match.update(STEP_MS);

    // Within the movement system's own arrival epsilon rather than exactly on
    // the mark, and `Heading.rad` is an f32 like every other component field,
    // so ~1e-7 rad is the most it can carry. That is four decimal places of a
    // degree — finer than any sector boundary by six orders of magnitude.
    assert.ok(
      Math.abs(Position.y[hull]! - 5000) < MOVEMENT.ARRIVAL_EPSILON_M + 5,
      `the hull stopped at ${Position.y[hull]}`
    );
    assert.ok(
      Math.abs(Heading.rad[hull]! - Math.PI / 2) < 1e-5,
      `stopped hull kept ${Heading.rad[hull]} rather than the course it ran`
    );
  });

  it('starts at the heading a caller asked for', () => {
    const match = new Match(VENTFRONT_DIVIDE, { fauna: false, seed: 12 });
    const hull = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Hadron,
      x: 4000,
      y: 4000,
      heading: Math.PI,
    });
    assert.ok(Math.abs(Heading.rad[hull]! - Math.PI) < 1e-5);
  });
});

describe('the three exclusions — §8', () => {
  it('keeps the ping omnidirectional', () => {
    // §5 fixes active sonar at SIG 95 omnidirectional and `BASE_THRESHOLD` is
    // solved from its 2,400 m self-reveal. A Knight broadcasting 9.5 astern
    // would quietly unmake that from three quarters of the compass.
    const terrain = new Terrain(12000, 12000, 250);
    const match = new Match(VENTFRONT_DIVIDE, { fauna: false, seed: 13, terrain });
    const tierAstern = (ping: boolean): ResolutionTier => {
      const knight = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 0,
        faction: Faction.Hadron,
        x: 6000,
        y: 6000,
        heading: 0,
      });
      spawnUnit(match.world, {
        kind: UnitKind.Cruiser,
        slot: 1,
        faction: Faction.Bathyarch,
        x: 6000 - 2000,
        y: 6000,
      });
      if (ping) match.activeSonar(0, knight);
      match.update(STEP_MS);
      const result = match.echo.run(match.world, [0, 1]);
      const held = (result.contactsBySlot.get(1) ?? []).find(
        (c) => match.echo.entityForHandle(1, c.id) === knight
      );
      return held?.tier ?? ResolutionTier.Silent;
    };
    const quiet = tierAstern(false);
    const pinging = tierAstern(true);
    assert.ok(
      pinging > quiet,
      `a ping astern resolved ${pinging} against ${quiet} — the ping must ignore the bow`
    );
  });

  it('gives a structure no bow at all', () => {
    // A Bastion has no front. `spawnStructure` does not add `Heading`, so the
    // Echo pass's test for the component *is* the exclusion — and `hasBow`
    // answers for the whole simulation rather than for the pass alone.
    const match = new Match(VENTFRONT_DIVIDE, { fauna: false, seed: 14 });
    const bastion = spawnStructure(match.world, {
      kind: StructureKind.Bastion,
      slot: 0,
      faction: Faction.Hadron,
      x: 4000,
      y: 4000,
      prebuilt: true,
    });
    assert.equal(hasComponent(match.world, Heading, bastion), false);
    assert.equal(hasBow(match.world, bastion), false, 'a Bastion must stay omnidirectional');

    // ...and the same predicate says yes to a hull of the same navy, so the
    // test is about having a front rather than about the faction check alone.
    const hull = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Hadron,
      x: 4100,
      y: 4000,
    });
    assert.equal(hasBow(match.world, hull), true);
  });
});

describe('the Drift hears the bow too', () => {
  it('applies the term where fauna do their own detection walk', () => {
    // §8's exclusion list is closed at three and fauna are not on it. Asserted
    // through the shared helper rather than through a school's behaviour,
    // because what matters is that the two detection paths cannot disagree
    // about how loud one hull is.
    assert.equal(directionalFactor(0, 0, 0, 1000, 0), S.CONE);
    assert.equal(directionalFactor(0, 0, 0, -1000, 0), S.WAKE);
  });
});
