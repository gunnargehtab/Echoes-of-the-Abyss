/**
 * Sour exposure under the Lid — docs/systems-depth.md §2 "The other end of the
 * column", docs/world.md "The Lid", adopted via docs/three-layer-ocean.md §7.
 *
 * What this file pins is the shape, not the size: a grace before the water
 * bites, a bleed that is a fraction of max hull on the unhealable ledger, the
 * same price for every navy, a recovery slower than the spending so the
 * boundary cannot be straddled for free — and, unlike the Directorate's
 * shallows, no floor. Sour water is allowed to kill.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasComponent } from 'bitecs';
import {
  Faction,
  LID,
  SIM,
  SelfEventKind,
  StructureKind,
  UnitKind,
  type EchoSnapshot,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnStructure, spawnUnit } from '../src/sim/world.ts';
import { Health, Position, Pressure, Unit } from '../src/sim/components.ts';
import { VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const MAP_M = 8000;
const SOUR_M = LID.DEPTH_M - 50;
const CLEAN_M = LID.DEPTH_M + 150;

/** Open water, no regions, no hazards: nothing else may touch these numbers. */
const PLAIN: MapDefinition = { ...VENTFRONT_DIVIDE, id: 'test-lid', regions: [], hazards: [] };

function match(): Match {
  return new Match(PLAIN, { fauna: false, seed: 150, terrain: new Terrain(MAP_M, MAP_M, 250) });
}

function advance(m: Match, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * SIM.TICK_HZ); i++) m.update(STEP_MS);
}

function seat(m: Match, depth: number, faction: Faction = Faction.Bathyarch): number {
  return spawnUnit(m.world, { kind: UnitKind.Corvette, slot: 0, faction, x: 1000, y: 4000, depth });
}

/** Fraction of max hull lost after `seconds` at `depth`, from a clean start. */
function lostFraction(depth: number, seconds: number, faction?: Faction): number {
  const m = match();
  const eid = seat(m, depth, faction);
  advance(m, seconds);
  return (Health.max[eid]! - Health.hp[eid]!) / Health.max[eid]!;
}

describe('the Lid bleeds what loiters in it', () => {
  it('grants the grace in full before taking anything', () => {
    assert.equal(lostFraction(SOUR_M, LID.GRACE_S - 1), 0);
  });

  it('then bleeds a fraction of max hull per second, on the unhealable ledger', () => {
    const m = match();
    const eid = seat(m, SOUR_M);
    advance(m, LID.GRACE_S + 10);
    const lost = Health.max[eid]! - Health.hp[eid]!;
    const expected = Health.max[eid]! * LID.BLEED_FRACTION_PER_S * 10;
    assert.ok(Math.abs(lost - expected) < Health.max[eid]! * 0.015, `lost ${lost} vs ${expected}`);
    // f32 accumulation drifts a little between the two ledgers over 600 ticks;
    // what is pinned is that the loss is recorded as unrecoverable, not the
    // last decimal of the rounding.
    assert.ok(
      Math.abs(Pressure.unhealable[eid]! - lost) < 0.02 * lost + 1e-3,
      'every drop is unrecoverable'
    );
  });

  it('prices every navy the same — the Lid predates all of them', () => {
    const seconds = LID.GRACE_S + 8;
    const bathyarch = lostFraction(SOUR_M, seconds, Faction.Bathyarch);
    const pelagia = lostFraction(SOUR_M, seconds, Faction.Pelagia);
    assert.ok(bathyarch > 0);
    assert.ok(Math.abs(bathyarch - pelagia) < 1e-6);
  });

  it('takes nothing below the boundary', () => {
    assert.equal(lostFraction(CLEAN_M, LID.GRACE_S + 30), 0);
  });

  it('recovers grace slower than the Lid spends it, so bobbing loses', () => {
    // Depth is *placed* between phases rather than ordered, so the sour clock
    // is measured alone — travel time at 15 m/s up and 45 m/s down would
    // otherwise dominate the arithmetic this test exists to pin.
    const m = match();
    const eid = seat(m, SOUR_M);
    advance(m, LID.GRACE_S - 5); // 15 s sour on the clock
    Position.depth[eid] = CLEAN_M;
    advance(m, 15); // clean water buys back 15 × (GRACE/RECOVERY) = 10 → 5 left
    Position.depth[eid] = SOUR_M;
    advance(m, 10); // resumes at 5, so 10 more is still inside the grace
    assert.equal(Health.max[eid]! - Health.hp[eid]!, 0, 'still inside the recovered grace');
    advance(m, 7); // and past it
    assert.ok(Health.hp[eid]! < Health.max[eid]!, 'the resumed clock ran out');
  });

  it('has no floor: sour water kills what stays', () => {
    const m = match();
    const eid = seat(m, SOUR_M);
    advance(m, LID.GRACE_S + 1 / LID.BLEED_FRACTION_PER_S + 10);
    assert.ok(
      !hasComponent(m.world, Unit, eid) || Health.hp[eid]! <= 0,
      'the Salinity Collapse was not a tax'
    );
  });

  it('is a fact about hulls, not about everything that floats', () => {
    // Forced shallow here because placement would normally refuse the ground.
    const m = match();
    const base = spawnStructure(m.world, {
      kind: StructureKind.Refinery,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 2000,
      y: 4000,
      depth: SOUR_M,
      prebuilt: true,
    });
    advance(m, LID.GRACE_S + 30);
    assert.equal(Health.hp[base]!, Health.max[base]!, 'the Lid does not eat buildings');
  });
});

/**
 * The bite — the moment the grace runs out (#285).
 *
 * docs/audio-direction.md §4, "The Lid" makes this the one thing about sour
 * exposure the mix may announce: the states either side of it are carried by
 * the ribbon and the card, and only the crossing is news. So what matters here
 * is that it is an *edge* — raised once where a sustained bleed would raise it
 * on all twelve hundred ticks, and re-armed only by a hull that actually
 * recovered and spent its grace again.
 */
describe('the sour bleed event', () => {
  function bites(snapshots: Map<number, EchoSnapshot>[]): number {
    let count = 0;
    for (const byPlayer of snapshots) {
      for (const snapshot of byPlayer.values()) {
        count += snapshot.selfEvents.filter((e) => e.kind === SelfEventKind.SourBleed).length;
      }
    }
    return count;
  }

  function snapshotsOver(m: Match, seconds: number): Map<number, EchoSnapshot>[] {
    const out: Map<number, EchoSnapshot>[] = [];
    for (let i = 0; i < Math.round(seconds * SIM.TICK_HZ); i++) {
      const snapshots = m.update(STEP_MS);
      if (snapshots !== null) out.push(snapshots);
    }
    return out;
  }

  it('says nothing while the grace is still running', () => {
    const m = match();
    m.addPlayer(0, Faction.Bathyarch);
    seat(m, SOUR_M);
    assert.equal(bites(snapshotsOver(m, LID.GRACE_S - 2)), 0);
  });

  it('fires once when the grace runs out, and not again while it bleeds', () => {
    const m = match();
    m.addPlayer(0, Faction.Bathyarch);
    seat(m, SOUR_M);
    // Well past the crossing: a per-tick event would raise this hundreds of
    // times, and a per-snapshot one dozens.
    assert.equal(bites(snapshotsOver(m, LID.GRACE_S + 20)), 1);
  });

  it('says nothing at all below the boundary', () => {
    const m = match();
    m.addPlayer(0, Faction.Bathyarch);
    seat(m, CLEAN_M);
    assert.equal(bites(snapshotsOver(m, LID.GRACE_S + 30)), 0);
  });

  it('fires again for a hull that dived, recovered and climbed back', () => {
    // Two crossings is two pieces of news: the player spent the grace twice.
    const m = match();
    m.addPlayer(0, Faction.Bathyarch);
    const eid = seat(m, SOUR_M);
    assert.equal(bites(snapshotsOver(m, LID.GRACE_S + 2)), 1);
    // Placed rather than ordered, like the recovery test above: this measures
    // the sour clock, not the ascent rate.
    Position.depth[eid] = CLEAN_M;
    snapshotsOver(m, LID.RECOVERY_S + 2); // full grace bought back
    Position.depth[eid] = SOUR_M;
    assert.equal(bites(snapshotsOver(m, LID.GRACE_S + 2)), 1, 'the second crossing is told too');
  });

  it('tells the hull owner and nobody else', () => {
    const m = match();
    m.addPlayer(0, Faction.Bathyarch);
    m.addPlayer(1, Faction.Pelagia);
    seat(m, SOUR_M);
    let mine = 0;
    let theirs = 0;
    for (const byPlayer of snapshotsOver(m, LID.GRACE_S + 2)) {
      for (const [slot, snapshot] of byPlayer) {
        const count = snapshot.selfEvents.filter((e) => e.kind === SelfEventKind.SourBleed).length;
        if (slot === 0) mine += count;
        else theirs += count;
      }
    }
    assert.equal(mine, 1);
    assert.equal(theirs, 0, 'where the other navy is bleeding is not your information');
  });
});
