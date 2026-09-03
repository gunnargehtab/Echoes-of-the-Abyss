/**
 * Baseline Pressure Rating, per navy (#201) — docs/systems-depth.md §3.
 *
 * §3 has published a "Baseline PR" column since the document existed and no
 * code read it, which left four documented depth identities as prose. It also
 * left a hole: a Directorate Light Scout is a PR-1 hull, and since the
 * shallow-water penalty landed there was **no depth in the entire water
 * column** where it was neither crushing nor bleeding — below 400 m it is
 * under-rated, above 400 m its own faction's water poisons it. That is not a
 * trade-off; it is a unit with nowhere to stand.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEPTH,
  DEPTH_BANDS,
  DepthBand,
  FACTION_PRESSURE_BASELINE,
  Faction,
  UnitKind,
  crushAttritionPerSecond,
  effectivePressureRating,
  inDirectorateShallows,
  statsFor,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { Position, Pressure } from '../src/sim/components.ts';

const ROSTER = [
  UnitKind.LightScout,
  UnitKind.Corvette,
  UnitKind.Cruiser,
  UnitKind.AbyssalSubmersible,
  UnitKind.Chorister,
  UnitKind.Harvester,
] as const;

const FACTIONS = [Faction.Bathyarch, Faction.Pelagia, Faction.Directorate, Faction.Hadron] as const;

describe('the doc’s baseline table is the one that shipped', () => {
  it('carries §3’s four numbers', () => {
    assert.equal(FACTION_PRESSURE_BASELINE[Faction.Bathyarch], 2, 'Consortium buys access');
    assert.equal(FACTION_PRESSURE_BASELINE[Faction.Pelagia], 1, 'the Commune terraforms it');
    assert.equal(
      FACTION_PRESSURE_BASELINE[Faction.Directorate],
      3,
      'the Directorate is born to it'
    );
    assert.equal(FACTION_PRESSURE_BASELINE[Faction.Hadron], 2, 'the Knights project it');
  });

  it('is a floor and never a ceiling', () => {
    // A hull rated higher than its navy's baseline keeps its own rating. The
    // Abyssal Submersible is PR-3 in every navy, including the Commune's.
    for (const faction of FACTIONS) {
      for (const kind of ROSTER) {
        const own = statsFor(kind).pressureRating;
        assert.ok(
          effectivePressureRating(kind, faction) >= own,
          `${UnitKind[kind]} lost rating in ${Faction[faction]}`
        );
      }
      assert.equal(effectivePressureRating(UnitKind.AbyssalSubmersible, faction), 3);
    }
  });

  it('lifts the cohort hull to PR-3 for the Directorate and nobody else', () => {
    // docs/units.md (#352): PR-2 on the hull, so a Chorister bought through a
    // rendering contract is a Mid-Water hull and the Abyssal band stays
    // crystal-gated (docs/economy.md §7); the Directorate's baseline is what
    // "born to it" buys them.
    assert.equal(statsFor(UnitKind.Chorister).pressureRating, 2);
    assert.equal(effectivePressureRating(UnitKind.Chorister, Faction.Directorate), 3);
    for (const faction of [Faction.Bathyarch, Faction.Pelagia, Faction.Hadron]) {
      assert.ok(
        effectivePressureRating(UnitKind.Chorister, faction) < 3,
        `${Faction[faction]} bought the deep for 30 nodules`
      );
    }
  });
});

describe('every hull has somewhere to stand', () => {
  /** Depths at which this rating neither crushes nor sits in poisoned water. */
  function habitable(kind: UnitKind, faction: Faction): number[] {
    const rating = effectivePressureRating(kind, faction);
    const out: number[] = [];
    for (let depthM = 0; depthM <= DEPTH.MAX_M; depthM += 25) {
      if (crushAttritionPerSecond(rating, depthM) > 0) continue;
      if (inDirectorateShallows(faction, depthM)) continue;
      out.push(depthM);
    }
    return out;
  }

  it('including every Directorate hull, which before this had none', () => {
    // The collision, stated as a test. A PR-1 hull is safe from crush exactly
    // on the Shelf, and the Directorate is poisoned exactly on the Shelf, so
    // the two sets were complements and their intersection was empty.
    for (const kind of ROSTER) {
      const depths = habitable(kind, Faction.Directorate);
      assert.ok(
        depths.length > 0,
        `a Directorate ${UnitKind[kind]} has no depth that neither crushes nor poisons it`
      );
      assert.ok(
        depths[0]! >= DEPTH_BANDS[DepthBand.Shelf].max,
        `a Directorate ${UnitKind[kind]} is habitable at ${depths[0]} m, above the Shelf line`
      );
    }
  });

  it('and every hull of every other navy', () => {
    for (const faction of FACTIONS) {
      for (const kind of ROSTER) {
        assert.ok(habitable(kind, faction).length > 0, `${Faction[faction]} ${UnitKind[kind]}`);
      }
    }
  });
});

describe('a hull is seated where its navy can survive', () => {
  function seat(faction: Faction, kind: UnitKind): { depth: number; rating: number } {
    const match = new Match(undefined, { fauna: false, seed: 0x201 });
    match.addPlayer(0, faction);
    const eid = spawnUnit(match.world, { kind, slot: 0, faction, x: 1200, y: 1200 });
    return { depth: Position.depth[eid]!, rating: Pressure.rating[eid]! };
  }

  it('gives a Directorate scout its navy’s rating, not the roster’s', () => {
    const { rating } = seat(Faction.Directorate, UnitKind.LightScout);
    assert.equal(statsFor(UnitKind.LightScout).pressureRating, 1, 'the roster number is unchanged');
    assert.equal(rating, 3, 'and the hull in the water carries the baseline');
  });

  it('so it spawns below the Shelf line rather than inside its own weakness', () => {
    const { depth } = seat(Faction.Directorate, UnitKind.LightScout);
    assert.ok(
      !inDirectorateShallows(Faction.Directorate, depth),
      `seated at ${depth} m, which is water that poisons it`
    );
  });

  it('and a Commune scout still spawns shallow, because PR-1 is its baseline too', () => {
    // The mirror case. The Commune's baseline is 1, so nothing is lifted, and
    // a PR-1 hull seated at 600 m would crush from birth — which is the reason
    // the shallow default existed in the first place.
    const { depth, rating } = seat(Faction.Pelagia, UnitKind.LightScout);
    assert.equal(rating, 1);
    assert.equal(crushAttritionPerSecond(rating, depth), 0, `crushing at ${depth} m`);
  });

  it('never seats any hull of any navy where it would crush', () => {
    for (const faction of FACTIONS) {
      for (const kind of ROSTER) {
        const { depth, rating } = seat(faction, kind);
        assert.equal(
          crushAttritionPerSecond(rating, depth),
          0,
          `${Faction[faction]} ${UnitKind[kind]} seated at ${depth} m on PR-${rating}`
        );
      }
    }
  });
});
