/**
 * Sowing (#576) — docs/systems-flora.md §2. Wave 7 of #547, first half.
 *
 * Every other way of touching a bed takes crop out of it: a reactor renders
 * it, a cutter burns it, bloom-share lives on the interest and leaves the
 * principal alone. Sowing is the only act in the game that **puts cover
 * back**, and it belongs to the one navy whose doctrine is cover.
 *
 * So what is pinned here is the shape of the act rather than its arithmetic:
 * forty-five seconds on station or nothing at all, a quarter of a canopy laid
 * down over the two minutes *after* the hull is done, at a loudness a listener
 * cannot pick out — and the two limits §2 states in as many words, that
 * sowing restores a bed rather than creating one and that only the Commune
 * has it.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Biome, COMMUNE_ECONOMY, DRIFT, FLORA, Faction, SIM, UnitKind } from '@echoes/shared';
import { hasComponent } from 'bitecs';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { Acoustic, SilentRunning, Sowing } from '../src/sim/components.ts';
import { setKelpCrop, type Hazard } from '../src/sim/systems/hazards.ts';
import { terrainFor, VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const BED_X = 4000;
const BED_Y = 4000;
const BED_RADIUS_M = 1200;
const SLOT = 0;

/** One bed on its own plateau, so a reading has one explanation. */
function bedMap(): MapDefinition {
  return {
    ...VENTFRONT_DIVIDE,
    id: 'test-sowing',
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
    blooms: [],
  };
}

function match(map: MapDefinition = bedMap()): Match {
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

/** A hull standing in the bed, on ground that has been cut back to `crop`. */
function inTheBed(m: Match, faction = Faction.Pelagia, x = BED_X, y = BED_Y): number {
  return spawnUnit(m.world, {
    kind: UnitKind.LightScout,
    slot: SLOT,
    faction,
    x,
    y,
    depth: 300,
    weaponsCold: true,
  });
}

/** A half-cut bed and a Commune hull standing in it, ready to sow. */
function thinnedBed(faction = Faction.Pelagia): { m: Match; field: Hazard; eid: number } {
  const m = match();
  const field = bed(m);
  setKelpCrop(m.world, field, 0.5);
  const eid = inTheBed(m, faction);
  // One tick so the hull is seated and the world has a velocity for it.
  advance(m, 1);
  return { m, field, eid };
}

describe('a Commune hull sows the bed it stands in', () => {
  it('lays a quarter of a canopy down, over the two minutes after the work', () => {
    const { m, field, eid } = thinnedBed();
    const before = field.crop;
    assert.ok(m.sow(SLOT, eid), 'the order must take');

    // Nothing during the work: the seed has not gone in yet.
    advance(m, FLORA.SOW_TIME_S - 1);
    assert.ok(field.sownRemaining === 0, 'an unfinished sowing owes the bed nothing');

    advance(m, 2);
    assert.ok(
      Math.abs(field.sownRemaining - FLORA.SOW_RESTORE) < 0.01,
      `served, and the bed is owed a quarter: ${field.sownRemaining}`
    );

    // And it arrives over the two minutes that follow, on top of the bed's own
    // regrowth — which is why this is a floor rather than an equality.
    advance(m, FLORA.SOW_SPREAD_S);
    assert.ok(field.sownRemaining < 0.01, 'the debt is paid');
    assert.ok(
      field.crop - before >= FLORA.SOW_RESTORE,
      `a quarter of a field, at least: ${field.crop - before}`
    );
  });

  it('arrives after the hull that bought it has gone', () => {
    // The gap between the act and its effect is the mechanic: sowing is never
    // an escape and never a defence, because the cover is not there yet.
    const { m, field, eid } = thinnedBed();
    const atService = (): number => field.crop;
    assert.ok(m.sow(SLOT, eid));
    advance(m, FLORA.SOW_TIME_S + 1);
    const justServed = atService();
    advance(m, FLORA.SOW_SPREAD_S / 2);
    const halfway = atService();
    assert.ok(
      halfway > justServed && halfway < justServed + FLORA.SOW_RESTORE,
      `half the seed is down at halfway: ${justServed} then ${halfway}`
    );
  });

  it('works at the Commune’s own figure and no louder', () => {
    // §2: "45 seconds on station at SIG 18 — their harvest signature". Read
    // from the constant the harvest reads (#570), so the two cannot drift.
    const { m, eid } = thinnedBed();
    assert.ok(m.sow(SLOT, eid));
    advance(m, 2);
    assert.equal(Acoustic.sig[eid], COMMUNE_ECONOMY.HARVEST_SIG);
    // And quieter than every other way of touching a bed.
    assert.ok(COMMUNE_ECONOMY.HARVEST_SIG < 40, 'quieter than a thermal cutter');
    assert.ok(COMMUNE_ECONOMY.HARVEST_SIG < 50, 'and than a bio-reactor');
  });

  it('owes a bed twice as much when two hulls sow it', () => {
    // An accumulator rather than a timer: neither sowing clips the other, and
    // the bed simply takes twice as long to lay twice as much down.
    const { m, field, eid } = thinnedBed();
    const second = inTheBed(m, Faction.Pelagia, BED_X + 60, BED_Y);
    advance(m, 1);
    assert.ok(m.sow(SLOT, eid));
    assert.ok(m.sow(SLOT, second));
    advance(m, FLORA.SOW_TIME_S + 1);
    assert.ok(
      Math.abs(field.sownRemaining - FLORA.SOW_RESTORE * 2) < 0.02,
      `two sowings, half a canopy owed: ${field.sownRemaining}`
    );
  });

  it('recovers water that has stopped growing anything on its own', () => {
    // The whole point of carrying seed. Failing water regrows nothing (wave
    // 2), so a bed there is finished — unless somebody plants it.
    const { m, field, eid } = thinnedBed();
    while (m.world.drift.at(BED_X, BED_Y) > DRIFT.HEALTH_FAILING - 5) {
      m.world.drift.recordKill(BED_X, BED_Y);
    }
    const before = field.crop;
    assert.ok(m.sow(SLOT, eid));
    advance(m, FLORA.SOW_TIME_S + FLORA.SOW_SPREAD_S + 2);
    assert.ok(
      Math.abs(field.crop - before - FLORA.SOW_RESTORE) < 0.02,
      `dead water grew nothing and the seed grew everything: ${field.crop - before}`
    );
  });
});

describe('and the ways a sowing is broken', () => {
  it('credits nothing at all when the hull moves', () => {
    // "On station" is the load-bearing half. A sowing broken at forty-four
    // seconds is forty-four seconds spent for nothing, which is what makes it
    // a commitment to a piece of water rather than a button.
    const { m, field, eid } = thinnedBed();
    assert.ok(m.sow(SLOT, eid));
    advance(m, FLORA.SOW_TIME_S - 2);
    // A real order rather than a poked velocity: movement owns `Velocity` and
    // rewrites it every tick, so a hull told to go somewhere is the only hull
    // this pass can honestly see moving.
    m.orderMove(SLOT, eid, BED_X + 300, BED_Y);
    advance(m, 1);
    assert.ok(!hasComponent(m.world, Sowing, eid), 'the sowing is off');
    advance(m, FLORA.SOW_TIME_S);
    assert.equal(field.sownRemaining, 0, 'and the bed was owed nothing');
  });

  it('stops the moment the hull goes quiet', () => {
    // Silence stops the work (docs/systems-echo.md §6) — the clause that also
    // stops a bloom-share and a thermal cutter.
    const { m, field, eid } = thinnedBed();
    assert.ok(m.sow(SLOT, eid));
    advance(m, 5);
    SilentRunning.active[eid] = 1;
    advance(m, 1);
    assert.ok(!hasComponent(m.world, Sowing, eid));
    advance(m, FLORA.SOW_TIME_S);
    assert.equal(field.sownRemaining, 0);
  });

  it('does not restart a sowing already under way', () => {
    // A player leaning on the key would otherwise hold a hull at forty-four
    // seconds forever, paying SIG 18 the whole time and never finishing.
    const { m, field, eid } = thinnedBed();
    assert.ok(m.sow(SLOT, eid));
    for (let i = 0; i < FLORA.SOW_TIME_S; i++) {
      advance(m, 1);
      m.sow(SLOT, eid);
    }
    advance(m, 2);
    assert.ok(field.sownRemaining > 0, 'it finished in spite of the spam');
  });
});

describe('the two limits §2 states outright', () => {
  it('restores a bed and never creates one', () => {
    // "Ground becomes Kelp Forest only where a mission says so" — a skirmish
    // player who could grow cover on open water would be editing the map's
    // acoustics at will.
    const m = match();
    const outside = inTheBed(m, Faction.Pelagia, BED_X + BED_RADIUS_M + 800, BED_Y);
    advance(m, 1);
    assert.equal(m.sow(SLOT, outside), false, 'open water cannot be sown');
    assert.equal(m.world.hazards.length, 1, 'and no field appeared');
  });

  it('refuses bare ground, which is not a bed either', () => {
    // A stripped field is "not a hazard, it is bare ground" (§1), so it is not
    // something a sowing can restore — the same reading the grip and the
    // phase already take.
    const m = match();
    setKelpCrop(m.world, bed(m), 0);
    const eid = inTheBed(m);
    advance(m, 1);
    assert.equal(m.sow(SLOT, eid), false);
  });

  it('belongs to the Commune and to nobody else', () => {
    // §6's table: theirs is the only entry that puts something back.
    for (const faction of [Faction.Bathyarch, Faction.Directorate, Faction.Hadron]) {
      const { m, field, eid } = thinnedBed(faction);
      assert.equal(m.sow(SLOT, eid), false, `${Faction[faction]} does not sow`);
      advance(m, FLORA.SOW_TIME_S + 2);
      assert.equal(field.sownRemaining, 0);
    }
  });

  it('spends seed on a full canopy rather than banking it', () => {
    // A bed that is already whole cannot hold more, so sowing early is seed
    // spent on nothing. Forgiven rather than saved, because a debt a bed
    // carries for the rest of the match would make an early sowing strictly
    // better than a timely one.
    const m = match();
    const eid = inTheBed(m);
    advance(m, 1);
    assert.equal(bed(m).crop, 1, 'the bed is whole');
    assert.ok(m.sow(SLOT, eid));
    advance(m, FLORA.SOW_TIME_S + 2);
    advance(m, 1);
    assert.equal(bed(m).sownRemaining, 0, 'the seed went nowhere');
    assert.equal(bed(m).crop, 1);
  });
});
