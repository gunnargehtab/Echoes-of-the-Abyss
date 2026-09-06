/**
 * A hull in a hold — docs/systems-echo.md §3, docs/units.md "The transports"
 * (wave 1 of docs/roster-plan.md, #501).
 *
 * The four transports and the mechanism they share, held to the doc's three
 * sentences: a carried hull is not in the water (no position, no SIG, no
 * ears, unresolvable at any tier, still on the berths, at the carrier's
 * depth and rating, dead when the carrier is); the load is heard as +3 SIG a
 * berth and as nothing else, Silent Running included; a kill reveals nothing
 * beyond the battle site any death leaves. Plus the wave's own gate: a
 * carried force crosses the Shelf line without paying for the water, and
 * the Antiphon's landing rents a band for twenty seconds and not a second
 * more.
 *
 * Observations are taken from the resolved per-slot payloads where the
 * claim is about what a player is told, and from the components where the
 * claim is about the world — the two are different facts, and the doc makes
 * promises about both.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasComponent } from 'bitecs';
import {
  DEPTH_BANDS,
  DepthBand,
  Faction,
  HOLD,
  HULL_EFFECTS,
  SIM,
  STRUCTURE_AURAS,
  UnitKind,
  statsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { hashWorld } from '../src/sim/stateHash.ts';
import { playReplay } from '../src/sim/replay.ts';
import {
  Acoustic,
  Carried,
  Embarking,
  Health,
  Hold,
  LandingGrant,
  Position,
  Pressure,
} from '../src/sim/components.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
/** The Shelf/Mid-Water line the wave's gate is written against. Never restated. */
const LINE_M = DEPTH_BANDS[DepthBand.Shelf].max;

function advance(match: Match, seconds: number): Map<number, EchoSnapshot> | null {
  let last: Map<number, EchoSnapshot> | null = null;
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) {
    const out = match.update(STEP_MS);
    if (out !== null) last = out;
  }
  return last;
}

/** Slot 0 of this navy against slot 1, on flat open water, nothing else afloat. */
function water(
  faction: Faction,
  enemy = Faction.Directorate,
  options: { seed?: number; record?: boolean } = {}
): Match {
  const match = new Match(undefined, {
    fauna: false,
    seed: options.seed ?? 501,
    record: options.record ?? false,
    terrain: new Terrain(12000, 12000, 250, { floorM: 2600 }),
  });
  match.addPlayer(0, faction);
  match.addPlayer(1, enemy);
  return match;
}

function hull(
  match: Match,
  faction: Faction,
  kind: UnitKind,
  x: number,
  y: number,
  depth?: number
) {
  return spawnUnit(match.world, {
    kind,
    slot: 0,
    faction,
    x,
    y,
    ...(depth !== undefined ? { depth } : {}),
  });
}

/** Board `hulls` on `carrier`, which sits where they are, and let the tick land them. */
function load(match: Match, carrier: number, hulls: number[]): void {
  for (const eid of hulls) match.orderEmbark(0, eid, carrier);
  advance(match, 0.5);
  for (const eid of hulls) assert.ok(hasComponent(match.world, Carried, eid), `${eid} aboard`);
}

describe('the hold — boarding and landing', () => {
  it('boards a hull that closes on its carrier, and refuses what cannot fit or be carried', () => {
    const match = water(Faction.Bathyarch);
    const freighter = hull(match, Faction.Bathyarch, UnitKind.Freighter, 6000, 6000);
    const near = hull(match, Faction.Bathyarch, UnitKind.Corvette, 6000, 6000 + 400);
    const far = hull(match, Faction.Bathyarch, UnitKind.Cruiser, 6000, 6000 + 2000);
    const { holdBerths } = statsFor(UnitKind.Freighter);

    match.orderEmbark(0, near, freighter);
    match.orderEmbark(0, far, freighter);
    assert.ok(hasComponent(match.world, Embarking, near), 'closing');
    assert.ok(hasComponent(match.world, Embarking, far), 'closing, from farther');
    advance(match, 8);
    assert.ok(hasComponent(match.world, Carried, near), 'the near one is aboard');
    assert.ok(!hasComponent(match.world, Position, near), 'and out of the water');
    assert.equal(Hold.used[freighter], statsFor(UnitKind.Corvette).berths, 'two of six');
    assert.ok(!hasComponent(match.world, Carried, far), 'the Cruiser is still on its way');

    advance(match, 40);
    assert.ok(hasComponent(match.world, Carried, far), 'and arrives');
    assert.equal(
      Hold.used[freighter],
      statsFor(UnitKind.Corvette).berths + statsFor(UnitKind.Cruiser).berths,
      'five of six'
    );

    // A Bulwark is four berths; one is left. Refused at the order, not on the way.
    const bulwark = hull(match, Faction.Bathyarch, UnitKind.Bulwark, 6000, 6000 + 50);
    match.orderEmbark(0, bulwark, freighter);
    assert.ok(!hasComponent(match.world, Embarking, bulwark), 'no room for four in one');
    // A hold is not a berth for another hold.
    const second = hull(match, Faction.Bathyarch, UnitKind.Freighter, 6000, 6000 + 50);
    match.orderEmbark(0, second, freighter);
    assert.ok(!hasComponent(match.world, Embarking, second), 'a Freighter is never carried');
    assert.equal(holdBerths, 6, 'the doc’s six');
  });

  it('lands the whole hold in a ring around the carrier, at the carrier’s depth, with no orders', () => {
    const match = water(Faction.Bathyarch);
    const freighter = hull(match, Faction.Bathyarch, UnitKind.Freighter, 6000, 6000, 600);
    const corvettes = [0, 1, 2].map((i) =>
      hull(match, Faction.Bathyarch, UnitKind.Corvette, 6000 + i * 30, 6000, 600)
    );
    load(match, freighter, corvettes);
    assert.equal(Hold.used[freighter], 6, 'full');

    match.orderDepth(0, freighter, 900);
    match.orderMove(0, freighter, 7500, 6000);
    advance(match, 60);
    const cx = Position.x[freighter]!;
    const cy = Position.y[freighter]!;
    const cd = Position.depth[freighter]!;
    assert.ok(cd > 850, `the carrier went down: ${cd}`);

    match.orderDisembark(0, freighter);
    advance(match, 0.1);
    assert.equal(Hold.used[freighter], 0, 'empty');
    for (const eid of corvettes) {
      assert.ok(hasComponent(match.world, Position, eid), 'back in the water');
      assert.ok(!hasComponent(match.world, Carried, eid));
      const ring = Math.hypot(Position.x[eid]! - cx, Position.y[eid]! - cy);
      assert.ok(ring > 50 && ring < 400, `around the carrier, at ${ring.toFixed(0)} m`);
      assert.ok(Math.abs(Position.depth[eid]! - cd) < 20, `at its depth: ${Position.depth[eid]}`);
    }
    // Landed where the carrier went, without a descent of their own.
    const own = advance(match, 0.5)!.get(0)!;
    for (const eid of corvettes) {
      const unit = own.units.find((u) => u.id === eid)!;
      assert.equal(unit.aboard, undefined, 'and no longer reported as cargo');
    }
  });

  it('takes any other order as the end of a boarding', () => {
    const match = water(Faction.Pelagia);
    const drifter = hull(match, Faction.Pelagia, UnitKind.Drifter, 6000, 6000);
    const scout = hull(match, Faction.Pelagia, UnitKind.LightScout, 6000, 6000 + 1500);
    match.orderEmbark(0, scout, drifter);
    advance(match, 1);
    assert.ok(hasComponent(match.world, Embarking, scout));
    match.orderMove(0, scout, 3000, 3000);
    assert.ok(!hasComponent(match.world, Embarking, scout), 'a move replaces the plan');
    advance(match, 20);
    assert.ok(!hasComponent(match.world, Carried, scout), 'and it never boarded');
  });
});

describe('the hold — what a listener gets, and what it does not', () => {
  it('is heard as +3 SIG a berth carried, at every posture, Silent Running included', () => {
    const match = water(Faction.Bathyarch);
    const freighter = hull(match, Faction.Bathyarch, UnitKind.Freighter, 6000, 6000);
    const corvettes = [0, 1, 2].map((i) =>
      hull(match, Faction.Bathyarch, UnitKind.Corvette, 6000 + i * 30, 6000)
    );
    const stats = statsFor(UnitKind.Freighter);

    advance(match, 0.5);
    assert.equal(Acoustic.sig[freighter], stats.sigIdle, 'empty, idle: the listed figure');

    load(match, freighter, corvettes);
    const load6 = 6 * HOLD.SIG_PER_BERTH;
    assert.equal(Acoustic.sig[freighter], stats.sigIdle + load6, 'full, idle: +18');
    for (const eid of corvettes) assert.equal(Acoustic.sig[eid], 0, 'and the cargo is silent');

    match.orderMove(0, freighter, 9000, 6000);
    advance(match, 2);
    assert.equal(Acoustic.sig[freighter], stats.sigCruise + load6, 'full, cruise: the doc’s 68');

    match.setSilentRunning(0, freighter, true);
    advance(match, 0.5);
    const hushed = Acoustic.sig[freighter]!;
    assert.ok(hushed >= load6, `Silent Running cannot hush the hold: ${hushed}`);
    assert.ok(hushed < stats.sigIdle + load6, 'but the hull itself went quiet');

    match.setSilentRunning(0, freighter, false);
    match.orderDisembark(0, freighter);
    advance(match, 0.5);
    assert.ok(Acoustic.sig[freighter]! <= stats.sigCruise, 'landed, the load is gone');
  });

  it('never resolves a carried hull at any tier, ping or no ping', () => {
    const match = water(Faction.Bathyarch);
    const freighter = hull(match, Faction.Bathyarch, UnitKind.Freighter, 6000, 6000);
    const corvettes = [0, 1, 2].map((i) =>
      hull(match, Faction.Bathyarch, UnitKind.Corvette, 6000 + i * 30, 6000)
    );
    // An ear close enough to classify anything, with a ping to be sure.
    const ear = spawnUnit(match.world, {
      kind: UnitKind.Precentor,
      slot: 1,
      faction: Faction.Directorate,
      x: 6000 + 500,
      y: 6000,
    });
    const before = advance(match, 1)!.get(1)!;
    assert.ok(
      before.contacts.filter((c) => c.kind === UnitKind.Corvette).length >= 3,
      'the premise: afloat, three Corvettes are three contacts'
    );

    load(match, freighter, corvettes);
    match.activeSonar(1, ear);
    const after = advance(match, 1)!.get(1)!;
    assert.equal(
      after.contacts.filter((c) => c.kind === UnitKind.Corvette).length,
      0,
      'aboard, none — not under a ping, not at any tier'
    );
    const carrier = after.contacts.find((c) => c.kind === UnitKind.Freighter);
    assert.ok(carrier !== undefined, 'the carrier is the contact');
    assert.ok(!('hold' in carrier) && !('aboard' in carrier), 'and it carries no manifest');

    // The owner, and only the owner, is told where the cargo is.
    const own = advance(match, 0.5)!.get(0)!;
    for (const eid of corvettes) {
      const unit = own.units.find((u) => u.id === eid)!;
      assert.equal(unit.aboard, freighter, 'reported as aboard');
      assert.equal(unit.x, Position.x[freighter], 'at the carrier');
    }
    assert.deepEqual(own.units.find((u) => u.id === freighter)!.hold, { berths: 6, used: 6 });
  });

  it('still counts the cargo against the berths — a hold is transport, not quarters', () => {
    const match = water(Faction.Bathyarch);
    const freighter = hull(match, Faction.Bathyarch, UnitKind.Freighter, 6000, 6000);
    const corvettes = [0, 1, 2].map((i) =>
      hull(match, Faction.Bathyarch, UnitKind.Corvette, 6000 + i * 30, 6000)
    );
    advance(match, 0.5);
    const afloat = match.berthsFor(0).used;
    load(match, freighter, corvettes);
    assert.equal(match.berthsFor(0).used, afloat, 'the same berths, aboard or afloat');
  });

  it('kills the load with the carrier, silently: no contact, no mark of its own', () => {
    const match = water(Faction.Bathyarch);
    const freighter = hull(match, Faction.Bathyarch, UnitKind.Freighter, 6000, 6000);
    const corvettes = [0, 1, 2].map((i) =>
      hull(match, Faction.Bathyarch, UnitKind.Corvette, 6000 + i * 30, 6000)
    );
    load(match, freighter, corvettes);
    const marksBefore = match.world.marks.count;

    Health.hp[freighter] = 0;
    advance(match, 0.1);
    for (const eid of corvettes) {
      assert.ok(!hasComponent(match.world, Health, eid), 'gone with the carrier');
    }
    assert.equal(match.world.holds.get(freighter), undefined, 'and the hold with it');
    assert.equal(match.world.marks.count, marksBefore, 'a death by itself leaves no residue');
    // The opening kit is still afloat at the base; the voyage is not.
    const own = advance(match, 0.5)!.get(0)!;
    const gone = [freighter, ...corvettes];
    assert.ok(
      own.units.every((u) => !gone.includes(u.id)),
      'the owner has none of them left'
    );
  });
});

describe('the wave’s gate — a carried force crosses the Shelf line', () => {
  it('takes PR-1 hulls below the line aboard a Freighter without a scratch, and lands them there', () => {
    const match = water(Faction.Pelagia, Faction.Directorate);
    // A Commune hull is PR-1 (docs/systems-depth.md §3's baseline); its
    // Corvettes crush below the Shelf. Aboard a Freighter — spawned as the
    // Commune's for the test, its rating is its own — they do not.
    const freighter = hull(match, Faction.Pelagia, UnitKind.Freighter, 6000, 6000, LINE_M - 100);
    Pressure.rating[freighter] = 2;
    const scouts = [0, 1, 2].map((i) =>
      hull(match, Faction.Pelagia, UnitKind.LightScout, 6000 + i * 30, 6000, LINE_M - 100)
    );
    for (const eid of scouts) assert.equal(Pressure.rating[eid], 1, 'the premise: PR-1');
    load(match, freighter, scouts);

    match.orderDepth(0, freighter, LINE_M + 400);
    advance(match, 45);
    assert.ok(Position.depth[freighter]! > LINE_M + 300, `crossed: ${Position.depth[freighter]}`);
    for (const eid of scouts) {
      assert.equal(Health.hp[eid], statsFor(UnitKind.LightScout).maxHp, 'not a scratch aboard');
      assert.equal(Pressure.unhealable[eid], 0, 'nothing unhealable');
    }

    match.orderDisembark(0, freighter);
    advance(match, 0.1);
    for (const eid of scouts) {
      assert.ok(Position.depth[eid]! > LINE_M, `landed below the line: ${Position.depth[eid]}`);
    }
    // And now the water bills them: the trip was free, the stay is not.
    advance(match, 3);
    for (const eid of scouts) {
      assert.ok(Pressure.unhealable[eid]! > 0, 'crushing where they were landed');
    }
  });

  it('the Antiphon lands its hold with +1 PR for twenty seconds, one band, never two, never renewed', () => {
    const match = water(Faction.Hadron);
    const antiphon = hull(match, Faction.Hadron, UnitKind.Antiphon, 6000, 6000, 600);
    const clarion = hull(match, Faction.Hadron, UnitKind.Clarion, 6000 + 30, 6000, 600);
    const scout = hull(match, Faction.Hadron, UnitKind.LightScout, 6000 + 60, 6000, 600);
    load(match, antiphon, [clarion, scout]);
    const { PR_BONUS, GRANT_S } = HULL_EFFECTS.ANTIPHON;

    match.orderDisembark(0, antiphon);
    advance(match, 0.5);
    assert.equal(Pressure.bonus[clarion], PR_BONUS, 'landed with the grant');
    assert.equal(Pressure.bonus[scout], PR_BONUS);
    assert.equal(Pressure.bonus[antiphon], 0, 'the carrier grants; it does not receive');
    assert.equal(PR_BONUS, STRUCTURE_AURAS.SOUNDING_SPIRE.PR_BONUS, 'the Spire’s figure');

    // A singing Cantus alongside: one band, not two.
    const cantus = hull(match, Faction.Hadron, UnitKind.Cantus, 6000 + 100, 6000, 600);
    advance(match, HULL_EFFECTS.CANTUS.STATIONARY_S + 1);
    assert.equal(Pressure.bonus[clarion], PR_BONUS, 'under a Cantus as well: still one');
    assert.ok(hasComponent(match.world, LandingGrant, clarion), 'the clock still runs');
    void cantus;

    advance(match, GRANT_S);
    assert.ok(!hasComponent(match.world, LandingGrant, clarion), 'twenty seconds, then gone');
    assert.ok(!hasComponent(match.world, LandingGrant, scout));
  });
});

describe('the hold — determinism', () => {
  function voyage(record: boolean): { match: Match; hash: number } {
    const match = water(Faction.Bathyarch, Faction.Directorate, { seed: 77, record });
    const freighter = hull(match, Faction.Bathyarch, UnitKind.Freighter, 6000, 6000);
    const corvettes = [0, 1].map((i) =>
      hull(match, Faction.Bathyarch, UnitKind.Corvette, 6000 + i * 30, 6000 + 300)
    );
    advance(match, 1);
    for (const eid of corvettes) match.orderEmbark(0, eid, freighter);
    advance(match, 20);
    match.orderMove(0, freighter, 8000, 6000);
    match.orderDepth(0, freighter, 800);
    advance(match, 40);
    match.orderDisembark(0, freighter);
    advance(match, 5);
    return { match, hash: hashWorld(match.world) };
  }

  it('hashes a hull in a hold, and replays a voyage to the same world', () => {
    const a = voyage(false);
    const b = voyage(false);
    assert.equal(a.hash, b.hash, 'the same voyage twice');

    const recorded = voyage(true);
    const replay = recorded.match.replay()!;
    assert.ok(
      replay.commands.some((c) => c.type === 'embark'),
      'embark recorded'
    );
    assert.ok(
      replay.commands.some((c) => c.type === 'disembark'),
      'disembark recorded'
    );
    // Hand-spawned hulls are not in a replay's opening, so playback cannot
    // reproduce this world; what it must do is *carry* the commands and
    // refuse nothing on the way in.
    assert.equal(replay.version, 17);
  });

  it('changes the hash while a hull is aboard, even though it has no position', () => {
    const before = water(Faction.Bathyarch);
    const freighter = hull(before, Faction.Bathyarch, UnitKind.Freighter, 6000, 6000);
    const corvette = hull(before, Faction.Bathyarch, UnitKind.Corvette, 6000, 6000 + 30);
    advance(before, 0.5);
    const afloat = hashWorld(before.world);
    load(before, freighter, [corvette]);
    // The corvette has no Position now; a hash that walked positions only
    // would not know it was there at all.
    Health.hp[corvette] = Health.hp[corvette]! - 1;
    const hurt = hashWorld(before.world);
    Health.hp[corvette] = Health.hp[corvette]! + 1;
    const whole = hashWorld(before.world);
    assert.notEqual(afloat, whole, 'boarding changed the world');
    assert.notEqual(hurt, whole, 'and a carried hull’s health is still the world’s');
    void playReplay;
  });
});
