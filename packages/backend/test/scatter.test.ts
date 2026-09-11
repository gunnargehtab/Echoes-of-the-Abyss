/**
 * Scattered water — docs/systems-echo.md §3 "Scattered water", §5.
 *
 * The Resonance Field is the one row of the PF table that is not a scalar.
 * The 0.70 prices loudness like any other biome's factor and has since the
 * table was transcribed; the *scattered* half — bearings lie, pings return
 * phantoms — is what this file holds the pass to.
 *
 * Three things about it are easy to get wrong and invisible when you do:
 *
 * - **It must never move a tier.** Scatter is a rule about *where*, not *how
 *   loud*. Every distance the Order's mission documents quote is a range to a
 *   tier, and all of them stand to the metre.
 * - **The lie has to be a wall to one ear and a door to two.** Deterministic
 *   per replay, different per seed, moving over time, and never shorter than
 *   the truth in range — each of those is a property a program with one
 *   listener could otherwise exploit. Two listeners on a cross bearing are
 *   told the truth, and that is the rule that makes the Fields learnable
 *   rather than dice (§3, "Two ears").
 * - **A phantom has to be indistinguishable on the wire and takeable by every
 *   order.** A Tier-4 return with a handle from the same counter, a kind, a
 *   faction, health and a heading, and no entity behind it — and an order at
 *   one has to leave the ordering player's own hull looking exactly as an
 *   order at a true return does, because that payload is the one thing they
 *   read for free. Refusing at the order was the leak (#616).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ACTIVE_SONAR,
  Biome,
  Faction,
  ResolutionTier,
  SCATTER,
  SIM,
  STANDING_WAVE,
  UnitKind,
  unitAvailableTo,
  type Contact,
  type OwnUnit,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnUnit } from '../src/sim/world.ts';
import {
  ActivePing,
  Magazine,
  MoveOrder,
  Ordnance,
  Position,
  Weapon,
} from '../src/sim/components.ts';
import { VENTFRONT_DIVIDE } from '../src/sim/maps/index.ts';
import { hasComponent } from 'bitecs';

const STEP_MS = 1000 / SIM.TICK_HZ;
const MAP_M = 8000;

/** Close enough for a Corvette at idle to be classified by a Cruiser's ears. */
const CLASSIFIED_AT_M = 300;

function fieldsMap(): Terrain {
  const terrain = new Terrain(MAP_M, MAP_M, 250);
  terrain.fillRect(0, 0, MAP_M, MAP_M, Biome.ResonanceField);
  return terrain;
}

/**
 * One emitter, one listener, nothing else in the water — the thermocline
 * file's fixture, in whatever water the caller paints.
 */
function pair(options: { terrain?: Terrain; seed?: number; distanceM?: number }): {
  match: Match;
  emitter: number;
  listener: number;
} {
  const terrain = options.terrain ?? new Terrain(MAP_M, MAP_M, 250);
  const match = new Match(VENTFRONT_DIVIDE, { fauna: false, seed: options.seed ?? 31, terrain });
  const emitter = spawnUnit(match.world, {
    kind: UnitKind.Corvette,
    slot: 0,
    faction: Faction.Bathyarch,
    x: 2000,
    y: 4000,
  });
  const listener = spawnUnit(match.world, {
    kind: UnitKind.Cruiser,
    slot: 1,
    faction: Faction.Pelagia,
    x: 2000 + (options.distanceM ?? CLASSIFIED_AT_M),
    y: 4000,
  });
  return { match, emitter, listener };
}

/** What slot 1 was told about the emitter on one pass, or undefined if nothing. */
function heard(match: Match, emitter: number): Contact | undefined {
  const result = match.echo.run(match.world, [0, 1]);
  return (result.contactsBySlot.get(1) ?? []).find(
    (contact) => match.echo.entityForHandle(1, contact.id) === emitter
  );
}

/** Bearing and range of a point from a listener. */
function polar(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return { bearing: Math.atan2(dy, dx), range: Math.hypot(dx, dy) };
}

/** Smallest signed difference between two bearings, radians. */
function turn(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

describe('bearings lie in scattered water — docs/systems-echo.md §3', () => {
  it('reports a hull in the Fields off its true bearing, and the same hull in open water on it', () => {
    const open = pair({});
    const openContact = heard(open.match, open.emitter);
    assert.ok(openContact !== undefined, 'the premise: the pair resolves at all');
    assert.ok(
      openContact.tier >= ResolutionTier.Classification,
      'and at a tier that discloses the true position'
    );
    assert.equal(openContact.x, Position.x[open.emitter]!, 'open water: the truth, exactly');
    assert.equal(openContact.y, Position.y[open.emitter]!);

    const fields = pair({ terrain: fieldsMap() });
    const contact = heard(fields.match, fields.emitter);
    assert.ok(contact !== undefined);
    // Scatter never moves a tier: PF 0.70 is still applied as the scalar it
    // always was, and the classification distance the Order's briefings
    // quote is unchanged by the lie.
    assert.equal(contact.tier, openContact.tier, "the tier is the biome's 0.70, untouched");

    const listener = { x: Position.x[fields.listener]!, y: Position.y[fields.listener]! };
    const truth = { x: Position.x[fields.emitter]!, y: Position.y[fields.emitter]! };
    const told = polar(listener, contact);
    const real = polar(listener, truth);
    const error = turn(real.bearing, told.bearing);
    assert.notEqual(error, 0, 'the Fields: reported somewhere it is not');
    assert.ok(
      Math.abs(error) <= SCATTER.MAX_BEARING_ERROR_RAD + 1e-9,
      `the bearing lies by at most ±30°, was ${((error * 180) / Math.PI).toFixed(1)}°`
    );
    assert.ok(told.range >= real.range - 1e-9, 'range reads long, never short');
    assert.ok(
      told.range <= real.range * (1 + SCATTER.MAX_RANGE_STRETCH) + 1e-9,
      'and by no more than the stretch'
    );
  });

  it("lies at every tier that carries a bearing, the ping's own returns included", () => {
    // A ping resolves to Track outright and its returns are rotated about the
    // pinger — docs/audio-direction.md §5, "the returns arrive from wrong
    // bearings". Far enough apart that passive listening cannot classify, so
    // Track here is the ping's and nobody else's.
    const { match, emitter, listener } = pair({ terrain: fieldsMap(), distanceM: 700 });
    match.activeSonar(1, listener);
    const contact = heard(match, emitter);
    assert.ok(contact !== undefined);
    assert.equal(contact.tier, ResolutionTier.Track, 'lit to Track by the ping');
    assert.ok(contact.kind !== undefined, 'with its kind, as a Track has');
    const truth = { x: Position.x[emitter]!, y: Position.y[emitter]! };
    assert.notDeepEqual({ x: contact.x, y: contact.y }, truth, 'and still in the wrong place');
  });

  it('is deterministic per seed — a replay and both clients agree', () => {
    // Keyed on the match-local id, so two matches in one process — whose
    // entity ids differ, bitecs allocating from a process-global counter —
    // still lie the same way.
    const run = (seed: number) => {
      const { match, emitter } = pair({ terrain: fieldsMap(), seed });
      return heard(match, emitter);
    };
    const a = run(31);
    const b = run(31);
    assert.ok(a !== undefined && b !== undefined);
    assert.deepEqual({ x: a.x, y: a.y }, { x: b.x, y: b.y }, 'the same seed lies the same way');

    const c = run(32);
    assert.ok(c !== undefined);
    assert.notDeepEqual(
      { x: a.x, y: a.y },
      { x: c.x, y: c.y },
      'a different seed lies differently'
    );
  });

  it('is not a fixed offset: the lie moves over time, and slides rather than jumps', () => {
    const { match, emitter, listener } = pair({ terrain: fieldsMap() });
    const at = (tick: number) => {
      match.world.tick = tick;
      const contact = heard(match, emitter)!;
      return { x: contact.x, y: contact.y };
    };
    const period = SCATTER.DRIFT_PERIOD_S * SIM.TICK_HZ;
    const first = at(0);
    const later = at(period);
    const latest = at(period * 2);
    assert.notDeepEqual(first, later, 'one drift period on, the lie has moved');
    assert.notDeepEqual(later, latest, 'and again');

    // Consecutive simulation ticks move the reported point by a sliver of the
    // range: the drift eases between lattice values rather than re-rolling.
    const range = Math.hypot(
      Position.x[emitter]! - Position.x[listener]!,
      Position.y[emitter]! - Position.y[listener]!
    );
    let worstStep = 0;
    let previous = at(0);
    for (let tick = 1; tick <= period * 3; tick++) {
      const now = at(tick);
      worstStep = Math.max(worstStep, Math.hypot(now.x - previous.x, now.y - previous.y));
      previous = now;
    }
    assert.ok(
      worstStep < range * 0.05,
      `a contact in the Fields slides, it does not jump: worst step ${worstStep.toFixed(1)} m`
    );
  });

  it('never reads a range short, at any tick', () => {
    const { match, emitter, listener } = pair({ terrain: fieldsMap(), seed: 7 });
    const listenerAt = { x: Position.x[listener]!, y: Position.y[listener]! };
    const truth = polar(listenerAt, { x: Position.x[emitter]!, y: Position.y[emitter]! });
    for (let tick = 0; tick < SCATTER.DRIFT_PERIOD_S * SIM.TICK_HZ * 4; tick += 7) {
      match.world.tick = tick;
      const contact = heard(match, emitter)!;
      const told = polar(listenerAt, contact);
      assert.ok(told.range >= truth.range - 1e-9, `tick ${tick}: ${told.range} < ${truth.range}`);
    }
  });

  it('scales with how much of the path is crystal', () => {
    const terrain = new Terrain(MAP_M, MAP_M, 250);
    assert.equal(terrain.hasScatter, false, 'open water: nothing scatters');
    assert.equal(terrain.scatteredFraction(0, 0, MAP_M, MAP_M), 0);

    terrain.fillRect(0, 0, MAP_M / 2, MAP_M, Biome.ResonanceField);
    assert.equal(terrain.hasScatter, true);
    assert.equal(terrain.scatteredFraction(100, 4000, MAP_M / 2 - 100, 4000), 1, 'all crystal');
    assert.equal(terrain.scatteredFraction(MAP_M / 2 + 100, 4000, MAP_M - 100, 4000), 0, 'none');
    const half = terrain.scatteredFraction(1000, 4000, MAP_M - 1000, 4000);
    assert.ok(half > 0.4 && half < 0.6, `half of the path: ${half}`);
  });
});

describe('two ears solve the Fields — docs/systems-echo.md §3, "Two ears"', () => {
  /**
   * The `pair` fixture plus more of slot 1's hulls, each placed on a bearing
   * *from the emitter* and a range from it. The emitter sits at (2000, 4000).
   */
  function ears(
    hulls: readonly { bearingDeg: number; rangeM?: number }[],
    options: { seed?: number } = {}
  ) {
    const fixture = pair({ terrain: fieldsMap(), seed: options.seed });
    // The fixture's own listener is at bearing 0°, CLASSIFIED_AT_M away.
    const listeners = [fixture.listener];
    for (const hull of hulls) {
      const rad = (hull.bearingDeg * Math.PI) / 180;
      const range = hull.rangeM ?? CLASSIFIED_AT_M;
      listeners.push(
        spawnUnit(fixture.match.world, {
          kind: UnitKind.Cruiser,
          slot: 1,
          faction: Faction.Pelagia,
          x: 2000 + Math.cos(rad) * range,
          y: 4000 + Math.sin(rad) * range,
        })
      );
    }
    return { ...fixture, listeners };
  }

  function truthOf(emitter: number) {
    return { x: Position.x[emitter]!, y: Position.y[emitter]! };
  }

  it('reports the truth to a player holding the emitter from two hulls on a cross bearing', () => {
    const { match, emitter } = ears([{ bearingDeg: 90 }]);
    const contact = heard(match, emitter);
    assert.ok(contact !== undefined);
    assert.ok(contact.tier >= ResolutionTier.Classification, 'both ears classify it');
    assert.deepEqual(
      { x: contact.x, y: contact.y },
      truthOf(emitter),
      'two ears: the truth, exactly'
    );
  });

  it('still lies to two hulls in convoy — a second ear is a second bearing, not a second hull', () => {
    // 10° apart seen from the emitter, well inside the 30° the rule asks for.
    const { match, emitter } = ears([{ bearingDeg: 10 }]);
    const contact = heard(match, emitter);
    assert.ok(contact !== undefined);
    assert.notDeepEqual(
      { x: contact.x, y: contact.y },
      truthOf(emitter),
      'one bearing twice is one ear'
    );
  });

  it('crosses at exactly the documented spread, and not a degree under', () => {
    const under = ears([{ bearingDeg: 29 }]);
    const underContact = heard(under.match, under.emitter)!;
    assert.notDeepEqual(
      { x: underContact.x, y: underContact.y },
      truthOf(under.emitter),
      '29°: lied to'
    );

    const at = ears([{ bearingDeg: 30.5 }]);
    const atContact = heard(at.match, at.emitter)!;
    assert.deepEqual({ x: atContact.x, y: atContact.y }, truthOf(at.emitter), '30°: told');
  });

  it('counts a cross between two later ears, not only against the first one heard', () => {
    // The first ear sits between the other two: neither is 30° from it, but
    // they are 40° from each other. Which hull the pass visits first must not
    // decide whether the player is told the truth.
    const { match, emitter } = ears([{ bearingDeg: 20 }, { bearingDeg: -20 }]);
    const contact = heard(match, emitter)!;
    assert.deepEqual(
      { x: contact.x, y: contact.y },
      truthOf(emitter),
      '±20° about the first ear is a 40° cross'
    );
  });

  it('accepts a second ear that holds only a bearing, and refuses one that holds only a contact', () => {
    // Find where a lone Cruiser resolves this Corvette at exactly Bearing in
    // the Fields, then at exactly Contact, by walking a lone listener out.
    let bearingAt: number | undefined;
    let contactAt: number | undefined;
    for (
      let distance = CLASSIFIED_AT_M;
      distance <= 3000 && contactAt === undefined;
      distance += 25
    ) {
      const probe = pair({ terrain: fieldsMap(), distanceM: distance });
      const tier = heard(probe.match, probe.emitter)?.tier ?? ResolutionTier.Silent;
      if (tier === ResolutionTier.Bearing && bearingAt === undefined) bearingAt = distance;
      if (tier === ResolutionTier.Contact) contactAt = distance;
    }
    assert.ok(
      bearingAt !== undefined && contactAt !== undefined,
      'the premise: both tiers are reachable'
    );

    const bearing = ears([{ bearingDeg: 90, rangeM: bearingAt }]);
    const told = heard(bearing.match, bearing.emitter)!;
    assert.ok(told.tier >= ResolutionTier.Classification, 'the near ear still sets the tier');
    assert.deepEqual(
      { x: told.x, y: told.y },
      truthOf(bearing.emitter),
      'a Tier-2 ear on a cross bearing is an ear'
    );

    const contact = ears([{ bearingDeg: 90, rangeM: contactAt }]);
    const lied = heard(contact.match, contact.emitter)!;
    assert.notDeepEqual(
      { x: lied.x, y: lied.y },
      truthOf(contact.emitter),
      'a Tier-1 smudge has no bearing to cross with'
    );
  });

  it("does not move the tier, and a cross never leaks a contact the player's ears did not earn", () => {
    const alone = pair({ terrain: fieldsMap() });
    const aloneContact = heard(alone.match, alone.emitter)!;
    const crossed = ears([{ bearingDeg: 90 }]);
    const crossedContact = heard(crossed.match, crossed.emitter)!;
    assert.equal(
      crossedContact.tier,
      aloneContact.tier,
      'scatter never moved a tier; neither does solving it'
    );
    const result = crossed.match.echo.run(crossed.match.world, [0, 1]);
    assert.equal((result.contactsBySlot.get(1) ?? []).length, 1, 'one emitter, one contact');
  });

  it('a pinger in the Fields is an ear, and a phantom is never confirmed by one', () => {
    // The pinger's own return lies (§3), unless a second hull holds a cross
    // bearing on the same emitter — then the true return is true and the
    // phantoms, which no second ear can ever hear, go on being lied about.
    // That asymmetry is §3's own tell and the whole of it: what separates a
    // phantom is that no second ear ever confirms it, which is a thing the
    // player earns rather than a thing the snapshot hands over.
    const match = new Match(VENTFRONT_DIVIDE, { fauna: false, seed: 31, terrain: fieldsMap() });
    const pinger = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    const enemy = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 1,
      faction: Faction.Pelagia,
      x: 4700,
      y: 4000,
    });
    // A second ear of the pinger's, 90° round from the pinger as the enemy sees
    // it, close enough to classify it passively.
    spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4700,
      y: 4000 + CLASSIFIED_AT_M,
    });
    match.activeSonar(0, pinger);
    const result = match.echo.run(match.world, [0, 1]);
    const contacts = result.contactsBySlot.get(0) ?? [];
    const real = contacts.find((c) => match.echo.entityForHandle(0, c.id) === enemy);
    const phantoms = contacts.filter((c) => match.echo.entityForHandle(0, c.id) === undefined);
    assert.ok(real !== undefined);
    assert.equal(real.tier, ResolutionTier.Track, 'lit by the ping');
    assert.deepEqual({ x: real.x, y: real.y }, truthOf(enemy), 'the true return, crossed, is true');
    assert.ok(phantoms.length >= SCATTER.PHANTOMS_MIN, 'the phantoms are still returned');
  });
});

describe('phantoms on a ping — docs/systems-echo.md §3, docs/audio-direction.md §5', () => {
  /** A pinger in the water the caller paints, and one enemy hull far off. */
  function ping(terrain: Terrain, seed = 31) {
    const match = new Match(VENTFRONT_DIVIDE, { fauna: false, seed, terrain });
    const pinger = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    // Inside the reveal, so the transmission has one true return to keep the
    // phantoms clear of; far enough that passive listening never classifies.
    const enemy = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 1,
      faction: Faction.Pelagia,
      x: 4000 + 700,
      y: 4000,
    });
    match.activeSonar(0, pinger);
    const result = match.echo.run(match.world, [0, 1]);
    const contacts = result.contactsBySlot.get(0) ?? [];
    const phantoms = contacts.filter((c) => match.echo.entityForHandle(0, c.id) === undefined);
    const real = contacts.filter((c) => match.echo.entityForHandle(0, c.id) === enemy);
    return { match, pinger, enemy, contacts, phantoms, real };
  }

  /**
   * Drive the clock to the next Echo snapshot and hand back slot 0's own hull.
   *
   * The own-unit payload rather than the world: what a cheating client can
   * read for free is exactly this, and a tell that never reaches it is not a
   * tell at all.
   */
  function nextOwnUnit(match: Match, eid: number): OwnUnit {
    for (let i = 0; i < SIM.TICK_HZ; i++) {
      const unit = match
        .update(STEP_MS)
        ?.get(0)
        ?.units.find((u) => u.id === eid);
      if (unit !== undefined) return unit;
    }
    assert.fail('no snapshot for the ordering hull inside a second');
  }

  it('returns one to three phantoms from inside the Fields, and none from open water', () => {
    const open = ping(new Terrain(MAP_M, MAP_M, 250));
    assert.equal(open.real.length, 1, 'the premise: the ping lights the enemy');
    assert.equal(open.phantoms.length, 0, 'open water: every return is a hull');

    const fields = ping(fieldsMap());
    assert.equal(fields.real.length, 1);
    assert.ok(
      fields.phantoms.length >= SCATTER.PHANTOMS_MIN &&
        fields.phantoms.length <= SCATTER.PHANTOMS_MAX,
      `one to three, was ${fields.phantoms.length}`
    );
  });

  it('makes a phantom identical to a true return on the wire', () => {
    const { match, pinger, phantoms, real } = ping(fieldsMap());
    const truth = real[0]!;
    for (const phantom of phantoms) {
      assert.equal(phantom.tier, ResolutionTier.Track, 'a ping resolves everything to Track');
      assert.ok(phantom.kind !== undefined, 'a hull kind');
      assert.equal(phantom.faction, Faction.Pelagia, 'the enemy navy, never our own');
      assert.ok(phantom.depth !== undefined, 'a depth');
      assert.ok(phantom.hp !== undefined && phantom.maxHp !== undefined, 'health');
      assert.ok(phantom.heading !== undefined, 'a heading');
      assert.deepEqual(
        Object.keys(phantom).sort(),
        Object.keys(truth).sort(),
        'the same fields as the true return — nothing on the wire tells them apart'
      );
      // Bounded where a *reported* point can be bounded, which since the
      // freeze came off is not quite where the anchor is. `conjurePhantoms`
      // places the anchor 200–900 m out and 150 m clear of anything real, and
      // then the same lie every contact in crystal carries is told about it:
      // range stretches outward by up to `MAX_RANGE_STRETCH` and bearing turns
      // by up to `MAX_BEARING_ERROR_RAD`. So the floor survives untouched — the
      // stretch is one-sided and a rotation keeps range — and the ceiling is
      // the reveal plus that stretch. The clearance does not survive at all,
      // and must not be asserted here: two contacts lied about independently
      // can be reported anywhere relative to each other, which is already true
      // of two true returns and is the price of the lie being uniform.
      const range = Math.hypot(phantom.x - Position.x[pinger]!, phantom.y - Position.y[pinger]!);
      assert.ok(range >= SCATTER.PHANTOM_MIN_RANGE_M, 'a plausible range from the pinger');
      assert.ok(
        range <= ACTIVE_SONAR.REVEAL_RADIUS_M * (1 + SCATTER.MAX_RANGE_STRETCH),
        'inside the reveal, as the reveal is reported'
      );
    }
    // One counter issues them all, and `contactHandle` is a permutation of it,
    // so distinctness is a property of the construction rather than luck. What
    // the counter must *not* publish is its order — held below.
    const handles = match.echo
      .run(match.world, [0, 1])
      .contactsBySlot.get(0)!
      .map((c) => c.id);
    assert.equal(new Set(handles).size, handles.length, 'every handle distinct');
  });

  /**
   * Six enemy hulls inside the reveal, so a pass has enough true returns for
   * "where the phantoms sit" to be a question worth asking. One real contact
   * and one phantom would put the phantom at an end of the list half the time
   * by arithmetic, and prove nothing either way.
   */
  const CROWD = [
    [600, 0],
    [-650, 120],
    [200, 700],
    [-300, -750],
    [900, -400],
    [-850, -500],
  ] as const;

  function pingCrowd(seed: number) {
    const match = new Match(VENTFRONT_DIVIDE, { fauna: false, seed, terrain: fieldsMap() });
    const pinger = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    for (const [dx, dy] of CROWD) {
      spawnUnit(match.world, {
        kind: UnitKind.Cruiser,
        slot: 1,
        faction: Faction.Pelagia,
        x: 4000 + dx,
        y: 4000 + dy,
      });
    }
    match.activeSonar(0, pinger);
    const contacts = match.echo.run(match.world, [0, 1]).contactsBySlot.get(0) ?? [];
    const phantom = contacts.map((c) => match.echo.entityForHandle(0, c.id) === undefined);
    return { contacts, phantom };
  }

  /**
   * Acceptance criterion 2 of #616: no field of the contact payload may
   * partition a pass into the lies and the truth.
   *
   * Two channels did, and both were free — no order given, no ordnance spent,
   * nothing but the snapshot a stock client already receives:
   *
   * - **The handle.** Phantoms are minted in the active-sonar loop and the
   *   pass's real handles in the materialisation loop that runs after it, so
   *   against a monotonic counter every phantom handle sat below every real
   *   handle first minted on the same pass. 40 seeds out of 40.
   * - **The array.** Phantoms were appended after the whole real loop, so
   *   they were the list's tail. Again 40 out of 40.
   *
   * Asserted over a fixed seed range because neither is a per-seed property:
   * a phantom is allowed to land at the front of one pass's list, and with
   * three phantoms and six returns it sometimes will. What is not allowed is
   * for it to happen *systematically*, which is what a count over many seeds
   * is able to say and a single pass is not. Both counts stood at 40/40 before
   * this landed and the assertions below fail on that code.
   */
  it('does not sort the lies to one end of the pass, by handle or by position', () => {
    const SEEDS = 40;
    const LIMIT = 10;
    let allBelow = 0;
    let allAbove = 0;
    let prefix = 0;
    let suffix = 0;
    let sampled = 0;

    for (let seed = 1; seed <= SEEDS; seed++) {
      const { contacts, phantom } = pingCrowd(seed);
      const lies = contacts.filter((_, i) => phantom[i]).map((c) => c.id);
      const truths = contacts.filter((_, i) => !phantom[i]).map((c) => c.id);
      if (lies.length === 0 || truths.length === 0) continue;
      sampled++;

      if (Math.max(...lies) < Math.min(...truths)) allBelow++;
      if (Math.min(...lies) > Math.max(...truths)) allAbove++;

      const at = contacts.map((_, i) => i).filter((i) => phantom[i]);
      const run = at[at.length - 1]! - at[0]! === at.length - 1;
      if (run && at[0] === 0) prefix++;
      if (run && at[at.length - 1] === contacts.length - 1) suffix++;
    }

    assert.equal(sampled, SEEDS, 'the premise: every seed returned both a phantom and a truth');
    assert.ok(allBelow <= LIMIT, `phantom handles wholly below the truth in ${allBelow}/${SEEDS}`);
    assert.ok(allAbove <= LIMIT, `phantom handles wholly above the truth in ${allAbove}/${SEEDS}`);
    assert.ok(prefix <= LIMIT, `phantoms a contiguous prefix in ${prefix}/${SEEDS}`);
    assert.ok(suffix <= LIMIT, `phantoms a contiguous suffix in ${suffix}/${SEEDS}`);
  });

  it('publishes a slot in handle order, so position adds nothing to the handles', () => {
    // The reason position is safe rather than merely scrambled. A shuffle
    // would hide the tail; this makes the index a function of handles the
    // client is already holding, which is a stronger thing to be able to say.
    for (let seed = 1; seed <= 8; seed++) {
      const { contacts } = pingCrowd(seed);
      const handles = contacts.map((c) => c.id);
      assert.deepEqual(
        handles,
        [...handles].sort((a, b) => a - b),
        `seed ${seed}`
      );
    }
  });

  /**
   * Every `Match` method that turns a contact handle into something to act on.
   *
   * The enumeration is the mechanism rather than the decoration. A phantom is
   * only indistinguishable while *every* handle-consuming path treats it as
   * one, and the way that stops being true is a fourth path arriving without
   * anyone thinking about phantoms — so the guard below reads match.ts and
   * fails if this list stops naming all of them.
   */
  const HANDLE_PATHS = ['orderAttackContact', 'orderLaunchTorpedo', 'seedSpore'];

  it('names every order path that resolves a contact handle', () => {
    const source = readFileSync(fileURLToPath(new URL('../src/sim/match.ts', import.meta.url)), {
      encoding: 'utf-8',
    }).split('\n');
    const found = new Set<string>();
    for (let i = 0; i < source.length; i++) {
      if (!source[i]!.includes('this.echo.entityForHandle(')) continue;
      let method: string | undefined;
      for (let j = i; j >= 0 && method === undefined; j--) {
        // A member declaration at the class's own indent, and nothing else is.
        const decl = /^ {2}(?:private |protected |public )?(?:async )?(\w+)\(/.exec(source[j]!);
        if (decl !== null) method = decl[1];
      }
      assert.ok(method !== undefined, `no enclosing method for match.ts:${i + 1}`);
      found.add(method);
    }
    assert.deepEqual(
      [...found].sort(),
      [...HANDLE_PATHS].sort(),
      'a handle-consuming path was added or renamed — decide what it does with a phantom, then name it here'
    );
  });

  it('takes an attack on a phantom exactly as it takes one on a true return', () => {
    // Both probes read the one field the ordering player can read for free:
    // their own hull's published plan, on the next snapshot. Before the fix
    // the phantom answered `undefined` here and the true return answered with
    // an anchored order, which is a certain sort of the lies from the truth
    // for the price of one click (docs/systems-echo.md §3).
    const probe = (pick: 'phantom' | 'real'): OwnUnit => {
      const { match, pinger, phantoms, real } = ping(fieldsMap());
      // Seated, because the own-unit payload only exists for a slot the match
      // knows about. Both probes are seated identically, so whatever the two
      // bases add they add to both.
      match.addPlayer(0, Faction.Bathyarch);
      match.addPlayer(1, Faction.Pelagia);
      // A long leg first, so the attack is still *queued* when the snapshot
      // goes out rather than begun and drained. That is the state the tell
      // was read from: a plan with something in it, published back.
      match.orderMove(0, pinger, 7500, 7500);
      const handle = pick === 'phantom' ? phantoms[0]!.id : real[0]!.id;
      match.orderAttackContact(0, pinger, handle, true);
      return nextOwnUnit(match, pinger);
    };

    const lie = probe('phantom');
    const truth = probe('real');
    assert.equal(lie.queuedOrders?.length, 1, 'the phantom order is planned, not refused');
    assert.deepEqual(
      lie.queuedOrders?.map((o) => o.kind),
      truth.queuedOrders?.map((o) => o.kind),
      'the same plan, of the same kind, for both'
    );
    assert.deepEqual(
      Object.keys(lie).sort(),
      Object.keys(truth).sort(),
      'and the same own-unit payload — no field of it partitions the two'
    );
  });

  it('sends the hull to where the phantom was reported, rather than nowhere', () => {
    // An unqueued attack on a real target is a chase: combat.ts republishes
    // the target's position into MoveOrder for as long as it is out of range.
    // A hull that simply stood still would be the same tell in the position
    // field, so the order goes to the point the player was shown.
    const { match, pinger, phantoms } = ping(fieldsMap());
    const phantom = phantoms[0]!;
    match.orderAttackContact(0, pinger, phantom.id);

    assert.equal(Weapon.orderedTargetEid[pinger], 0, 'nothing is behind it to engage');
    assert.equal(MoveOrder.active[pinger], 1, 'but the hull is under way');
    // `MoveOrder` is a Float32 store, so the round trip is the comparison.
    assert.equal(MoveOrder.x[pinger], Math.fround(phantom.x), 'to the reported point');
    assert.equal(MoveOrder.y[pinger], Math.fround(phantom.y));
  });

  it('forgets a phantom handle with the transmission that minted it', () => {
    // The index that makes the order takeable must die with the returns it
    // describes, or it answers for lies the client can no longer see — the
    // stale-handle hole `EchoLayer.forget` closes, in the one handle space
    // with no entity to hang a death on.
    const { match, pinger, phantoms } = ping(fieldsMap());
    const phantom = phantoms[0]!;
    assert.ok(match.echo.resolvePhantom(0, phantom.id) !== undefined, 'live while it is lit');

    while (ActivePing.remainingS[pinger]! > 0) {
      match.update(STEP_MS);
    }
    match.echo.run(match.world, [0, 1]);
    assert.equal(match.echo.resolvePhantom(0, phantom.id), undefined, 'and gone with the ping');

    const before = match.world.orderQueues.get(pinger)?.length ?? 0;
    match.orderAttackContact(0, pinger, phantom.id, true);
    assert.equal(
      match.world.orderQueues.get(pinger)?.length ?? 0,
      before,
      'a handle nobody holds plans nothing, phantom or not'
    );
  });

  it('spends a torpedo on a phantom exactly as it spends one on a true return', () => {
    // docs/systems-echo.md §3, and the last of the three free tells of #616.
    // The refusal was readable in `Magazine.torpedoes`, which is published to
    // its owner in the own-unit payload: a count that moved on the truth and
    // not on the lie sorted the two with certainty for one fish per return
    // probed. Both probes below read the magazine, because that is the field
    // the cheating client reads.
    const probe = (pick: 'phantom' | 'real') => {
      const { match, pinger, phantoms, real } = ping(fieldsMap());
      const handle = pick === 'phantom' ? phantoms[0]!.id : real[0]!.id;
      const ordnanceBefore = countOrdnance(match);
      const magazineBefore = Magazine.torpedoes[pinger]!;
      const fish = match.orderLaunchTorpedo(0, pinger, handle);
      return {
        launched: fish !== 0,
        ordnance: countOrdnance(match) - ordnanceBefore,
        magazine: magazineBefore - Magazine.torpedoes[pinger]!,
      };
    };

    const lie = probe('phantom');
    const truth = probe('real');
    assert.ok(lie.launched, 'the round leaves the tube at a phantom');
    assert.deepEqual(lie, truth, 'and every observable of the launch matches the true return');
    assert.equal(lie.magazine, 1, 'one fish, spent');
  });

  it('aims a torpedo at a phantom where the phantom was reported', () => {
    // The shot has to go somewhere, and the only honest somewhere is the point
    // the player was shown — the seeker swims there and finds water. Aiming it
    // at the anchor instead would send it to a place no snapshot ever drew.
    const { match, pinger, phantoms } = ping(fieldsMap());
    const phantom = phantoms[0]!;
    const fish = match.orderLaunchTorpedo(0, pinger, phantom.id);
    assert.notEqual(fish, 0, 'launched');
    // The round is born at the tube and steers at what it was aimed at, so the
    // aim point is `Ordnance.aimX/aimY` rather than where it starts. Float32
    // stores, so the round trip is the comparison.
    assert.equal(Ordnance.aimX[fish], Math.fround(phantom.x), 'to the reported point');
    assert.equal(Ordnance.aimY[fish], Math.fround(phantom.y));
  });

  it('spends no spore on a phantom, and none on a true return either', () => {
    const { match, phantoms, real } = ping(fieldsMap());
    const phantom = phantoms[0]!;

    // The spore needed nothing and still needs nothing: `seedSpore` refuses
    // every non-Structure target at the same line, and a phantom is always a
    // hull — so the lie and the truth are declined for the same reason and
    // read the same way. A Blight to ask with, since nothing else may.
    const blight = spawnUnit(match.world, {
      kind: UnitKind.Blight,
      slot: 0,
      faction: Faction.Pelagia,
      x: 4100,
      y: 4100,
    });
    assert.equal(match.seedSpore(0, blight, phantom.id), false, 'no spore at the phantom');
    assert.equal(match.seedSpore(0, blight, real[0]!.id), false, 'and none at the true return');
  });

  /**
   * Acceptance criterion 2 of #616, its cross-pass half — the third and last
   * of the free tells.
   *
   * A phantom's reported point used to be written once by `conjurePhantoms`
   * and never rewritten, while a true return in crystal is re-lied every pass
   * because `scatterContact` takes the tick. Two consecutive snapshots then
   * separated the lies from the truth with an equality test: no threshold, no
   * seed, no order given and nothing spent, off a stock client's own log. The
   * fix is the lie told again rather than the truth settling down
   * (docs/systems-echo.md §3), so what is asserted is that no contact in the
   * pass holds still while another moves.
   *
   * Driven with the world frozen and only the clock advancing, which is the
   * measurement the issue reported: any movement seen here is the lie's and
   * nothing else's.
   */
  it('re-lies every phantom each pass, so cross-pass equality sorts nothing', () => {
    const PASSES = 6;
    const { match, pinger } = ping(fieldsMap());
    const seen = new Map<number, Set<string>>();
    const lies = new Set<number>();

    for (let pass = 0; pass < PASSES; pass++) {
      match.world.tick += SIM.TICK_HZ / SIM.ECHO_HZ;
      for (const contact of match.echo.run(match.world, [0, 1]).contactsBySlot.get(0) ?? []) {
        if (match.echo.entityForHandle(0, contact.id) === undefined) lies.add(contact.id);
        let places = seen.get(contact.id);
        if (places === undefined) {
          places = new Set();
          seen.set(contact.id, places);
        }
        places.add(`${contact.x},${contact.y}`);
      }
      // The transmission has to outlast the passes, or the phantoms fade
      // part way through and the counts below compare different lifetimes.
      assert.ok(ActivePing.remainingS[pinger]! > 0, `still transmitting, pass ${pass}`);
    }

    assert.ok(lies.size > 0, 'the premise: the ping returned phantoms');
    assert.ok(seen.size > lies.size, 'and a true return to hold them against');
    for (const [handle, places] of seen) {
      assert.equal(
        places.size,
        PASSES,
        `${lies.has(handle) ? 'a phantom' : 'a true return'} reported at ${places.size} places over ${PASSES} passes`
      );
    }
  });

  it('holds the phantoms for the transmission and drops them with it, so they decay', () => {
    const { match, pinger, phantoms } = ping(fieldsMap());
    const ids = new Set(phantoms.map((p) => p.id));
    assert.ok(ids.size > 0);

    // The transmission's clock, run down by hand the way acoustics.ts runs
    // it at 60 Hz, with the Echo pass asked at its own 5 Hz in between.
    const echoDt = 1 / SIM.ECHO_HZ;
    const held = () =>
      match.echo
        .run(match.world, [0, 1])
        .contactsBySlot.get(0)!
        .filter((c) => ids.has(c.id)).length;
    let passes = 0;
    while (ActivePing.remainingS[pinger]! > 0) {
      match.world.tick += SIM.TICK_HZ / SIM.ECHO_HZ;
      assert.equal(
        held(),
        ids.size,
        `every phantom still returned, under its handle, pass ${passes}`
      );
      ActivePing.remainingS[pinger] = Math.max(0, ActivePing.remainingS[pinger]! - echoDt);
      passes++;
    }
    assert.ok(passes >= SIM.ECHO_HZ * ACTIVE_SONAR.REVEAL_DURATION_S - 1, 'for three seconds');
    assert.equal(held(), 0, 'and not one pass longer: from here the client lets them fade');
  });

  it('conjures the same phantoms on the same seed', () => {
    const a = ping(fieldsMap(), 5).phantoms.map((p) => [p.x, p.y, p.kind, p.heading]);
    const b = ping(fieldsMap(), 5).phantoms.map((p) => [p.x, p.y, p.kind, p.heading]);
    assert.deepEqual(a, b);
  });

  it('claims only hulls the enemy on the map could field — its own included', () => {
    // The kind is derived from the roster, not listed beside it
    // (docs/roster-plan.md §4, wave 0): a return that reads as a hull the
    // enemy could never build is the one phantom a player dismisses by
    // reading the roster, and a Spinner against the Commune is as plausible
    // as a Corvette. Thirty transmissions is enough draws that the Commune's
    // own two hulls appear, and that a hull of any other navy never does.
    const seen = new Set<UnitKind>();
    for (let seed = 1; seed <= 30; seed++) {
      for (const phantom of ping(fieldsMap(), seed).phantoms) {
        assert.ok(
          unitAvailableTo(phantom.kind!, Faction.Pelagia),
          `${UnitKind[phantom.kind!]} is not a hull the Commune could field`
        );
        seen.add(phantom.kind!);
      }
    }
    assert.ok(
      seen.has(UnitKind.Spinner) || seen.has(UnitKind.Sower),
      `the Commune's own hulls are claimed too; saw ${[...seen].map((k) => UnitKind[k])}`
    );
    assert.ok(!seen.has(UnitKind.Tender) && !seen.has(UnitKind.Clarion), 'and nobody else’s');
  });

  it('impersonates every enemy on the map, and no navy that is not there', () => {
    // Three seats: the pinger, and an enemy each from two navies. Each phantom
    // picks one of the two and a hull that navy builds, so a Reciter is only
    // ever flagged as the Order's and a Sower only ever as the Commune's; the
    // Directorate has nothing on the map and is never impersonated.
    const factions = new Set<Faction>();
    for (let seed = 1; seed <= 30; seed++) {
      const match = new Match(VENTFRONT_DIVIDE, { fauna: false, seed, terrain: fieldsMap() });
      const pinger = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 0,
        faction: Faction.Bathyarch,
        x: 4000,
        y: 4000,
      });
      spawnUnit(match.world, {
        kind: UnitKind.Cruiser,
        slot: 1,
        faction: Faction.Pelagia,
        x: 4700,
        y: 4000,
      });
      spawnUnit(match.world, {
        kind: UnitKind.Cruiser,
        slot: 2,
        faction: Faction.Hadron,
        x: 4000,
        y: 4700,
      });
      match.activeSonar(0, pinger);
      const contacts = match.echo.run(match.world, [0, 1, 2]).contactsBySlot.get(0) ?? [];
      for (const c of contacts) {
        if (match.echo.entityForHandle(0, c.id) !== undefined) continue;
        assert.ok(
          c.faction === Faction.Pelagia || c.faction === Faction.Hadron,
          'an enemy present'
        );
        assert.ok(
          unitAvailableTo(c.kind!, c.faction!),
          `${UnitKind[c.kind!]} under ${Faction[c.faction!]}'s flag is a hull that navy builds`
        );
        factions.add(c.faction!);
      }
    }
    assert.deepEqual([...factions].sort(), [Faction.Pelagia, Faction.Hadron], 'both, over time');
  });

  function countOrdnance(match: Match): number {
    let n = 0;
    for (let eid = 0; eid <= match.world.maxEid; eid++) {
      if (hasComponent(match.world, Ordnance, eid)) n++;
    }
    return n;
  }
});

describe('a Standing Wave corridor un-scatters its cells — docs/mission-standing-wave.md §7', () => {
  /** The corridor as `standingWave.ts` writes it: a capsule set to CORRIDOR_PF. */
  function corridorOver(terrain: Terrain, y: number) {
    terrain.applyPropagationModifiers([
      {
        x: 1000,
        y,
        x2: 7000,
        y2: y,
        radiusM: STANDING_WAVE.CORRIDOR_HALF_WIDTH_M,
        set: STANDING_WAVE.CORRIDOR_PF,
      },
    ]);
  }

  it('reports the truth along a corridor and lies again when it comes down', () => {
    const terrain = fieldsMap();
    corridorOver(terrain, 4000);
    assert.equal(terrain.scatterAt(4000, 4000), false, 'inside the line: tuned water');
    assert.equal(terrain.scatterAt(4000, 2000), true, 'beside it: still the Fields');

    const { match, emitter } = pair({ terrain });
    const contact = heard(match, emitter)!;
    assert.equal(contact.x, Position.x[emitter]!, 'bearings are true inside the line');
    assert.equal(contact.y, Position.y[emitter]!);

    terrain.applyPropagationModifiers([]);
    assert.equal(terrain.scatterAt(4000, 4000), true, 'the corridor down, the crystal is back');
    const again = heard(match, emitter)!;
    assert.notEqual(again.x, Position.x[emitter]!, 'and so is the lie');
  });

  it('gives a ping from inside the line a straight answer', () => {
    const terrain = fieldsMap();
    corridorOver(terrain, 4000);
    const match = new Match(VENTFRONT_DIVIDE, { fauna: false, seed: 31, terrain });
    const pinger = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 1,
      faction: Faction.Pelagia,
      x: 4700,
      y: 4000,
    });
    match.activeSonar(0, pinger);
    const contacts = match.echo.run(match.world, [0, 1]).contactsBySlot.get(0)!;
    const phantoms = contacts.filter((c) => match.echo.entityForHandle(0, c.id) === undefined);
    assert.equal(phantoms.length, 0, 'no phantoms from tuned water');
  });

  it('leaves a storm-lowered cell scattered: only an absolute write tunes the water', () => {
    const terrain = fieldsMap();
    terrain.applyPropagationModifiers([{ x: 4000, y: 4000, radiusM: 1000, scale: 0.5 }]);
    assert.equal(terrain.scatterAt(4000, 4000), true);
  });
});

describe('the budget — docs/systems-echo.md, the 2 ms pass', () => {
  it('reports its cost on an all-crystal map with two fleets in contact', () => {
    // The shape of match.test.ts's budget scenario, in the Fields. Scatter
    // adds one short walk per resolved contact per observer and nothing to
    // the pair loop, so the path-integral count is the one the open-water
    // scenario already holds; the clock is printed for the record.
    const match = new Match(VENTFRONT_DIVIDE, { fauna: false, seed: 3, terrain: fieldsMap() });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);
    for (let i = 0; i < 12; i++) {
      spawnUnit(match.world, {
        kind: (i % 5) as UnitKind,
        slot: 0,
        faction: Faction.Bathyarch,
        x: 3000 + (i % 4) * 120,
        y: 4000 + Math.floor(i / 4) * 120,
      });
      spawnUnit(match.world, {
        kind: (i % 5) as UnitKind,
        slot: 1,
        faction: Faction.Pelagia,
        x: 3600 + (i % 4) * 120,
        y: 4000 + Math.floor(i / 4) * 120,
      });
    }
    let worstWalks = 0;
    let contacts = 0;
    for (let i = 0; i < SIM.TICK_HZ * 3; i++) {
      const result = match.update(STEP_MS);
      if (result === null) continue;
      worstWalks = Math.max(worstWalks, match.contactPathWalksLastPass);
      contacts = Math.max(contacts, result.get(1)!.contacts.length);
    }
    assert.ok(contacts > 0, 'the fleets hear each other');
    assert.ok(worstWalks <= 160, `Echo pass did ${worstWalks} path integrals, budget 160`);
    console.log(
      `echo pass, small match in contact in the Fields: ${worstWalks} path integrals, ` +
        `${contacts} contacts scattered, ${match.worstEchoPassMs.toFixed(3)} ms ` +
        `(budget ${SIM.ECHO_BUDGET_MS} ms)`
    );
  });
});
