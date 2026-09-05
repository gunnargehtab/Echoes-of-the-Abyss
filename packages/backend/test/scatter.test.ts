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
 * - **A phantom has to be indistinguishable on the wire and refused by every
 *   order.** A Tier-4 return with a handle from the same counter, a kind, a
 *   faction, health and a heading, and no entity behind it.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVE_SONAR,
  Biome,
  Faction,
  ResolutionTier,
  SCATTER,
  SIM,
  STANDING_WAVE,
  UnitKind,
  type Contact,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { ActivePing, Ordnance, Position, Weapon } from '../src/sim/components.ts';
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
    // phantoms, which no second ear can ever hear, stay exactly where the
    // transmission put them.
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
    const { match, pinger, enemy, phantoms, real } = ping(fieldsMap());
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
      const range = Math.hypot(phantom.x - Position.x[pinger]!, phantom.y - Position.y[pinger]!);
      assert.ok(range >= SCATTER.PHANTOM_MIN_RANGE_M, 'a plausible range from the pinger');
      assert.ok(range <= ACTIVE_SONAR.REVEAL_RADIUS_M, 'inside the reveal');
      const fromEnemy = Math.hypot(phantom.x - Position.x[enemy]!, phantom.y - Position.y[enemy]!);
      assert.ok(fromEnemy >= SCATTER.PHANTOM_CLEARANCE_M, 'never on top of a real contact');
    }
    // Handles come from the one counter, so the client cannot sort them.
    const handles = match.echo
      .run(match.world, [0, 1])
      .contactsBySlot.get(0)!
      .map((c) => c.id);
    assert.equal(new Set(handles).size, handles.length, 'every handle distinct');
  });

  it('refuses every order that resolves a handle', () => {
    const { match, pinger, phantoms } = ping(fieldsMap());
    const phantom = phantoms[0]!;

    match.orderAttackContact(0, pinger, phantom.id);
    assert.equal(Weapon.orderedTargetEid[pinger], 0, 'an attack on a phantom orders nothing');
    match.orderAttackContact(0, pinger, phantom.id, true);
    assert.equal(match.world.orderQueues.get(pinger), undefined, 'queued, it is not even planned');

    const before = countOrdnance(match);
    assert.equal(match.orderLaunchTorpedo(0, pinger, phantom.id), 0, 'no torpedo launches at it');
    assert.equal(countOrdnance(match), before);
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
