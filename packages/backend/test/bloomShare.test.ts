/**
 * Bloom-share, re-founded on the crop (#568) — docs/systems-flora.md §2,
 * docs/economy.md §6. Wave 6 of #547.
 *
 * The anchoring claims are #243's and they still hold: a garden pays while it
 * is tended and stops the tick it is not, per node and never per gardener,
 * and to nobody but the Commune. What is new is what it pays *out of*.
 * Bloom-share used to be a flat rate of nodules attached to a position on the
 * map with no supply behind it — the tithe wearing the wrong name. §2 makes
 * it a bed:
 *
 *   **A bloom node is a bed**, and what it yields is Biomass — the
 *   **interest, never the principal**. A tended bed pays up to what it
 *   regrows and no more, so it never depletes and never thins its own cover.
 *
 * So the tests that matter now are the ones about the principal: the crop is
 * never touched by tending, the region is never charged for it, and the
 * payout falls with the canopy — because §2's promise is that a raid on a
 * Commune plateau takes their income and their concealment in the same act,
 * and that is only true if those are one object.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  BLOOM_SHARE,
  DEPTH_BANDS,
  DRIFT,
  DepthBand,
  FLORA,
  Faction,
  HazardPhase,
  SIM,
  UnitKind,
  depthBandFor,
} from '@echoes/shared';
import { hasComponent } from 'bitecs';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { Harvester, Health, Owner, Position, SilentRunning } from '../src/sim/components.ts';
import { setKelpCrop, type Hazard } from '../src/sim/systems/hazards.ts';
import { economyFor, spawnUnit } from '../src/sim/world.ts';
import { MARR_PLATEAU, VENTFRONT_DIVIDE, terrainFor } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const PLAYER = 0;

/** Far from the spawn corner, so the starting base is out of the story. */
const GARDEN = { x: 7000, y: 7000 };

/**
 * What one whole bed in Healthy water is worth per second: its regrowth, and
 * §2 says a tended bed pays that and no more. Written from the two constants
 * rather than as 0.16 so the suite moves when either does — the doc's figure
 * is 9.6 Biomass a minute.
 */
const HEALTHY_SHARE_PER_S = (FLORA.REGROWTH_PER_MIN / 60) * FLORA.FULL_CROP_BIOMASS;

function quietMatch(seed = 37): Match {
  // The tithe suite's fixture, for its reason: this is arithmetic, and a
  // creature eating the gardener mid-measurement is noise in both senses.
  return new Match(undefined, {
    fauna: false,
    seed,
    terrain: new Terrain(8000, 8000, 250),
  });
}

function advance(match: Match, seconds: number): void {
  for (let i = 0; i < seconds * SIM.TICK_HZ; i++) match.update(STEP_MS);
}

/** Stop every harvester this slot owns, so nothing but the bloom pays. */
function idleHarvesters(match: Match, slot: number): void {
  for (let eid = 0; eid < Owner.slot.length; eid++) {
    if (!hasComponent(match.world, Harvester, eid) || Owner.slot[eid] !== slot) continue;
    Health.hp[eid] = 0;
    Harvester.mode[eid] = 0;
    Harvester.cargo[eid] = 0;
  }
}

/**
 * A garden, as `Match.seedBlooms` builds one: a full kelp bed at the tend
 * radius, standing in `hazards` and referenced by `blooms`. Built here rather
 * than authored onto the fixture map because these tests want one bed in
 * known water; `MARR_PLATEAU` covers the seeding itself, below.
 */
function garden(match: Match, x = GARDEN.x, y = GARDEN.y): Hazard {
  const bed: Hazard = {
    id: match.world.hazards.length + 1,
    kind: 'kelp-entanglement',
    x,
    y,
    radiusM: BLOOM_SHARE.TEND_RADIUS_M,
    phase: HazardPhase.Active,
    crop: 1,
    elapsedS: 0,
    flowRad: 0,
    stabilisedS: 0,
    suppressedS: 0,
    burnedS: 0,
    sownRemaining: 0,
  };
  match.world.hazards.push(bed);
  match.world.blooms.push(bed);
  return bed;
}

/** A hull parked on the garden — the tender of docs/mission-tend.md §4. */
function tender(match: Match, faction: Faction, x = GARDEN.x, y = GARDEN.y): number {
  const eid = spawnUnit(match.world, {
    kind: UnitKind.LightScout,
    slot: PLAYER,
    faction,
    x,
    y,
    depth: 200,
    weaponsCold: true,
  });
  assert.notEqual(eid, 0);
  return eid;
}

/** Biomass earned over `seconds` with everything else idled. */
function earned(match: Match, seconds: number): number {
  const before = economyFor(match.world, PLAYER).biomass;
  advance(match, seconds);
  return economyFor(match.world, PLAYER).biomass - before;
}

/** A Commune match with one full garden and one tender standing in it. */
function tendedGarden(faction = Faction.Pelagia): { match: Match; bed: Hazard; eid: number } {
  const match = quietMatch();
  match.addPlayer(PLAYER, faction);
  advance(match, 1);
  idleHarvesters(match, PLAYER);
  const bed = garden(match);
  const eid = tender(match, faction);
  return { match, bed, eid };
}

describe('the share accrues while the bed is tended', () => {
  it('pays what the bed regrows, and that is the doc figure', () => {
    const { match } = tendedGarden();
    const got = earned(match, 30);
    assert.ok(
      Math.abs(got - HEALTHY_SHARE_PER_S * 30) < 0.1,
      `a tended bed paid ${got} over 30 s against its regrowth of ${HEALTHY_SHARE_PER_S * 30}`
    );
    // §7's row, stated once in the numbers the doc states it in.
    assert.ok(
      Math.abs(HEALTHY_SHARE_PER_S * 60 - 9.6) < 1e-6,
      'a healthy bed is 9.6 Biomass a minute'
    );
  });

  it('pays Biomass and not nodules, because a bloom is a crop', () => {
    // The fold itself (docs/economy.md §6): "what they yield is Biomass,
    // because a bloom is a crop. Their Nodules come from ordinary extraction,
    // quietly."
    const { match } = tendedGarden();
    // Against the opening grant, not against zero: a slot starts a match with
    // an account in it.
    const nodules = economyFor(match.world, PLAYER).nodules;
    assert.ok(earned(match, 30) > 0, 'the garden paid no Biomass');
    assert.equal(economyFor(match.world, PLAYER).nodules, nodules, 'and paid nodules as well');
  });

  it('pays per bed, never per gardener', () => {
    // "One share per node": a garden pays for being tended, so massing hulls
    // on one bed buys nothing — while one hull inside two beds' radii tends
    // both, because the anchor is the ground and not the unit.
    const match = quietMatch();
    match.addPlayer(PLAYER, Faction.Pelagia);
    advance(match, 1);
    idleHarvesters(match, PLAYER);
    garden(match, GARDEN.x - 100, GARDEN.y);
    garden(match, GARDEN.x + 100, GARDEN.y);
    tender(match, Faction.Pelagia);
    tender(match, Faction.Pelagia);
    tender(match, Faction.Pelagia);

    const got = earned(match, 30);
    assert.ok(
      Math.abs(got - 2 * HEALTHY_SHARE_PER_S * 30) < 0.1,
      `two beds under three gardeners paid ${got} over 30 s — the share is per bed`
    );
  });
});

describe('the share is the interest and never the principal', () => {
  it('leaves the plateau exactly as green as it found it', () => {
    // The sentence the whole fold turns on. Five minutes of tending is 48
    // Biomass off a bed that is worth 240, and the canopy has not moved: a
    // reactor or a cutter taking that much would have taken a fifth of the
    // field with it.
    const { match, bed } = tendedGarden();
    advance(match, 300);
    assert.ok(economyFor(match.world, PLAYER).biomass > 40, 'the day was worked');
    assert.equal(bed.crop, 1, 'and the bed is untouched');
  });

  it('costs the region no Drift Health at all', () => {
    // §3 charges Drift Health per Biomass of crop *taken out of a field*, and
    // bloom-share takes none: it is paid out of growth the bed could not keep
    // anyway. So tending is the one economy in the game that leaves its water
    // better than it found it — quiet water heals, and nothing here spends.
    const { match } = tendedGarden();
    const before = match.world.drift.at(GARDEN.x, GARDEN.y);
    advance(match, 120);
    assert.ok(
      match.world.drift.at(GARDEN.x, GARDEN.y) >= before,
      'tending wore the water it was paid by'
    );
  });

  it('pays half a canopy half a share, and bare ground nothing', () => {
    // The one reading §2 does not spell out and §2's promise requires. A
    // stripped bed still regrows at the flat rate, so an unscaled payout
    // would leave a raided plateau earning what an intact one does — and §2
    // says a raid takes the income and the concealment in the same act.
    const half = tendedGarden();
    setKelpCrop(half.match.world, half.bed, 0.5);
    const halfPaid = earned(half.match, 30);
    assert.ok(
      Math.abs(halfPaid - HEALTHY_SHARE_PER_S * 0.5 * 30) < 0.2,
      `half a canopy paid ${halfPaid} against half of ${HEALTHY_SHARE_PER_S * 30}`
    );

    const bare = tendedGarden();
    setKelpCrop(bare.match.world, bare.bed, 0);
    assert.equal(earned(bare.match, 30), 0, 'bare ground paid a share');
  });

  it('pays nothing in water that has stopped growing anything', () => {
    // Wave 2's band ladder, arriving through the one number both readings
    // share: Failing water regrows no crop, so there is no interest to take
    // and a whole standing bed pays nothing. A Commune plateau whose water
    // has been wrecked is a Commune plateau with no income, whatever is
    // still growing on it.
    const { match, bed } = tendedGarden();
    while (match.world.drift.at(GARDEN.x, GARDEN.y) > DRIFT.HEALTH_FAILING - 5) {
      match.world.drift.recordKill(GARDEN.x, GARDEN.y);
    }
    assert.equal(bed.crop, 1, 'the canopy is whole');
    assert.equal(earned(match, 30), 0, 'and dead water paid a share anyway');
  });
});

describe('the share stops when the bed is not held', () => {
  it('stops the tick the tender leaves, and resumes when it returns', () => {
    const { match, eid } = tendedGarden();
    assert.ok(earned(match, 10) > 0, 'the tended garden paid nothing');

    Position.x[eid] = GARDEN.x - BLOOM_SHARE.TEND_RADIUS_M * 3;
    assert.equal(earned(match, 10), 0, 'an untended garden kept paying');

    Position.x[eid] = GARDEN.x;
    assert.ok(earned(match, 10) > 0, 'a re-tended garden stayed dry');
  });

  it('stops under Silent Running, because silence stops the work', () => {
    // docs/systems-echo.md §6 as docs/mission-tend.md §3 reads it: "SIG falls
    // to single digits, the share stops accruing". Going quiet spends the day.
    const { match, eid } = tendedGarden();
    SilentRunning.active[eid] = 1;
    assert.equal(earned(match, 10), 0, 'a silent tender kept earning the share');

    SilentRunning.active[eid] = 0;
    assert.ok(earned(match, 10) > 0, 'the share did not resume when silence ended');
  });
});

describe('the share is paid for exposure, so it reads the column too', () => {
  // #577. The tend circle is horizontal, and used to be the whole test on the
  // reasoning that the Shelf is 400 m of water at most. A bed is 400 m of
  // *radius*, though, and a plateau is whatever the map authored: the
  // Ventfront Divide's gardens are 500 m shelves in a 2,600 m transit gap, so
  // half of every bed's ground is the gap. What the share buys is a gardener
  // standing where it can be reached — docs/economy.md §6, "safe from being
  // heard and permanently vulnerable to being reached" — and a hull hanging
  // 2 km under the rim was buying that at no price at all.
  //
  // The Sower throughout, because it is the hull the rule is about: "the only
  // Commune hull above PR-1", so it is the one that can sit in Mid-Water long
  // enough to be asked whether it is paid there. A Light Scout would answer
  // with crush attrition instead.

  /** A Commune hull that can hold a Mid-Water station, parked at `depth`. */
  function sower(match: Match, x: number, y: number, depth: number): number {
    const eid = spawnUnit(match.world, {
      kind: UnitKind.Sower,
      slot: PLAYER,
      faction: Faction.Pelagia,
      x,
      y,
      depth,
      weaponsCold: true,
    });
    assert.notEqual(eid, 0);
    return eid;
  }

  it('pays a tender in the Shelf band and nothing to one below it', () => {
    const match = quietMatch();
    match.addPlayer(PLAYER, Faction.Pelagia);
    advance(match, 1);
    idleHarvesters(match, PLAYER);
    garden(match);
    // The fixture terrain is flat at DEPTH.MAX_M, so nothing here is the
    // seabed's doing: same bed, same crop, same distance on the plan, and
    // only the depth moves — across the band line and back.
    const eid = sower(match, GARDEN.x, GARDEN.y, 200);

    assert.ok(earned(match, 10) > 0, 'a Shelf-band tender was not paid');

    Position.depth[eid] = DEPTH_BANDS[DepthBand.Shelf].max + 100;
    assert.equal(earned(match, 10), 0, 'a Mid-Water tender kept earning the share');
    assert.ok(Health.hp[eid]! > 0, 'the tender died, so this measured the wrong thing');

    Position.depth[eid] = DEPTH_BANDS[DepthBand.Shelf].max - 100;
    assert.ok(earned(match, 10) > 0, 'the share did not resume when the tender rose');
  });

  it('pays nothing at a Ventfront bed’s rim, where the plateau has run out', () => {
    // The bug as the map actually shipped it. The rim is 400 m from the node
    // and stands over 2,600 m of water, so a hull there may sit at any depth
    // its Pressure Rating allows — and used to be paid the full share for it.
    const match = new Match(VENTFRONT_DIVIDE, {
      fauna: false,
      seed: 51,
      terrain: terrainFor(VENTFRONT_DIVIDE),
    });
    const bed = match.world.blooms[0]!;
    const rimX = bed.x + BLOOM_SHARE.TEND_RADIUS_M - 1;
    assert.ok(
      match.world.terrain.floorAt(rimX, bed.y) > DEPTH_BANDS[DepthBand.Shelf].max,
      'this test wants a rim that overhangs; the garden now covers its own bed'
    );
    const eid = sower(match, rimX, bed.y, 900);

    const before = economyFor(match.world, PLAYER).biomass;
    advance(match, 30);
    assert.equal(
      economyFor(match.world, PLAYER).biomass - before,
      0,
      'the garden paid a hull hanging under its rim in Mid-Water'
    );
    assert.ok(Health.hp[eid]! > 0, 'the rim killed the tender, so this proved nothing');
    assert.ok(
      Math.hypot(Position.x[eid]! - bed.x, Position.y[eid]! - bed.y) <= BLOOM_SHARE.TEND_RADIUS_M,
      'and it drifted out of the bed, so this proved nothing'
    );
  });

  it('still pays anywhere the plateau itself reaches, because the ground lifts', () => {
    // The half of the change that has to be a no-op, and the reason this is a
    // fix rather than a nerf. Over a plateau a hull cannot be below the band
    // at all — the seabed holds it above itself (docs/systems-depth.md §2) —
    // so a tender ordered deep and parked on the garden is lifted onto the
    // Shelf and earns exactly what it always did.
    const match = new Match(VENTFRONT_DIVIDE, {
      fauna: false,
      seed: 51,
      terrain: terrainFor(VENTFRONT_DIVIDE),
    });
    const bed = match.world.blooms[0]!;
    const eid = sower(match, bed.x, bed.y, 900);

    const before = economyFor(match.world, PLAYER).biomass;
    advance(match, 60);
    assert.ok(
      Position.depth[eid]! <= DEPTH_BANDS[DepthBand.Shelf].max,
      `the plateau did not lift the tender: ${Position.depth[eid]} m`
    );
    assert.ok(
      economyFor(match.world, PLAYER).biomass - before > 0,
      'a tender standing on the plateau was not paid'
    );
  });

  it('is the same Shelf line the rest of the game uses', () => {
    // Not a second definition of the band. `bloomShare.ts` tests
    // `depthBandFor(...) === Shelf`, the way the Directorate's shallow-water
    // penalty does, so moving DEPTH_BANDS moves both together.
    assert.equal(depthBandFor(DEPTH_BANDS[DepthBand.Shelf].max - 1), DepthBand.Shelf);
    assert.notEqual(depthBandFor(DEPTH_BANDS[DepthBand.Shelf].max), DepthBand.Shelf);
  });
});

describe('the share is the Commune’s economy and nobody else’s', () => {
  it('pays nothing to another faction standing in the same garden', () => {
    // docs/economy.md §6 gives each navy exactly one income identity, and
    // bloom-share is Pelagia's — somebody else's hull on the plateau is an
    // occupation, not a harvest.
    //
    // A Hadron hull rather than the Consortium one this test used to stand
    // here: since #565 a Consortium hull in a bed is *cutting* it, so it
    // banks Biomass on that plateau and would answer a different question.
    // The Knights are the navy §6 says is least interested in a bed, which
    // makes them the clean case.
    const { match } = tendedGarden(Faction.Hadron);
    assert.equal(earned(match, 15), 0, 'the bloom paid a faction it does not belong to');
  });

  it('takes a plateau’s income and its cover in the same act', () => {
    // §2's promise, measured. A Consortium hull in a Commune garden is
    // already cutting it (#565) — so the raid banks 40% of what comes off,
    // and what the Commune is paid falls with the canopy it is paid by.
    // Nothing else in the game is both of those at once.
    const { match, bed } = tendedGarden();
    const opening = earned(match, 30) / 30;
    spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Bathyarch,
      x: GARDEN.x,
      y: GARDEN.y,
      depth: 200,
      // Cold, so what this measures is the canopy and not a dead gardener.
      weaponsCold: true,
    });
    advance(match, 600);
    assert.ok(bed.crop < 0.9, `the raider opened the canopy: ${bed.crop}`);
    assert.ok(economyFor(match.world, 1).biomass > 0, 'and was paid for the wreckage');
    const raided = earned(match, 30) / 30;
    assert.ok(raided < opening, `the share fell with the cover: ${raided} against ${opening}`);
  });
});

describe('and the gardens a map authors really are beds', () => {
  it('seeds every bloom node as a full kelp field', () => {
    // The fold, at the only place a player meets it: Marr Plateau's three
    // garden rows (docs/mission-tend.md §11). The literal authors three
    // positions and no hazard sites at all; what stands there is three beds.
    const match = new Match(MARR_PLATEAU, {
      fauna: false,
      seed: 11,
      terrain: terrainFor(MARR_PLATEAU),
    });
    assert.equal(MARR_PLATEAU.hazards.length, 0, 'the plateau authors no hazard sites');
    assert.equal(match.world.blooms.length, MARR_PLATEAU.blooms?.length);
    for (const bed of match.world.blooms) {
      assert.equal(bed.kind, 'kelp-entanglement');
      assert.equal(bed.crop, 1);
      assert.equal(bed.radiusM, BLOOM_SHARE.TEND_RADIUS_M);
      assert.ok(match.world.hazards.includes(bed), 'a garden that is not in the water');
    }
    // Ids stay unique across the two seedings, because the hazard layer the
    // client draws is keyed by them.
    const ids = new Set(match.world.hazards.map((h) => h.id));
    assert.equal(ids.size, match.world.hazards.length);
  });

  it('pays a Commune player standing in a Ventfront garden', () => {
    // The whole point of #573, at the only scale that proves it: a skirmish
    // map, its own authored gardens, a hull standing in one, and Biomass in
    // the account. Until that map had gardens, `bloomShareSystem` early-
    // returned in every skirmish and every balance-harness match, and the
    // Commune's economy existed only inside `mission-tend`.
    const match = new Match(VENTFRONT_DIVIDE, {
      fauna: false,
      seed: 51,
      terrain: terrainFor(VENTFRONT_DIVIDE),
    });
    assert.ok(match.world.blooms.length >= 1, 'the Ventfront must author a garden');
    const bed = match.world.blooms[0]!;
    spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: PLAYER,
      faction: Faction.Pelagia,
      // The garden is Shelf ground, so the tender stands in Shelf water.
      x: bed.x,
      y: bed.y,
      depth: 300,
      weaponsCold: true,
    });
    const before = economyFor(match.world, PLAYER).biomass;
    advance(match, 60);
    const earnedThere = economyFor(match.world, PLAYER).biomass - before;
    assert.ok(
      Math.abs(earnedThere - HEALTHY_SHARE_PER_S * 60) < 0.5,
      `a tended Ventfront garden paid ${earnedThere} against its regrowth of ${HEALTHY_SHARE_PER_S * 60}`
    );
    assert.equal(bed.crop, 1, 'and took nothing off the canopy doing it');
  });

  it('costs the tenders working there nothing to stand in', () => {
    // The mission this fold has to survive. A full bed lists no PF modifier,
    // so the sweep hears exactly what docs/mission-tend.md says it hears; and
    // kelp does not drag on the Commune, so the tenders are still at their 18
    // and still under the mission's SIG-20 ceiling. "Moves freely, unheard"
    // is both halves, and this is the mission where that matters most.
    const terrain = terrainFor(MARR_PLATEAU);
    const before = terrain.propagationAt(750, 500);
    const match = new Match(MARR_PLATEAU, { fauna: false, seed: 11, terrain });
    advance(match, 5);
    assert.equal(match.world.terrain.propagationAt(750, 500), before, 'the gardens got louder');
  });
});
