/**
 * What the server tells you about being seen (#103).
 *
 * docs/audio-direction.md §5 makes the exposure cue "deliberately the loudest
 * event in the game", and a cue that loud must never fire on a guess — which
 * is why "an enemy has resolved you" is server-sent rather than inferred from
 * the player's own SIG. That makes the report's *correctness* a server
 * concern, and these tests are it.
 *
 * The property that matters is that exposure is the exact mirror of the
 * contact payloads: nothing more, and nothing less. More would be the server
 * inventing dread; less would be the mix going quiet at the moment it should
 * be loudest.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Faction,
  OrdnanceKind,
  ResolutionTier,
  SelfEventKind,
  SIM,
  UnitKind,
  type SelfEvent,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnOrdnance, spawnUnit } from '../src/sim/world.ts';
import { Owner, Position } from '../src/sim/components.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

/** Run until the next Echo snapshot lands, and return it. */
function nextSnapshot(match: Match) {
  for (let i = 0; i < SIM.TICK_HZ; i++) {
    const snapshots = match.update(STEP_MS);
    if (snapshots !== null) return snapshots;
  }
  throw new Error('no Echo snapshot within a second of simulation');
}

function twoSides(gapM: number) {
  const match = new Match(undefined, { fauna: false, seed: 11 });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, Faction.Pelagia);
  const mine = spawnUnit(match.world, {
    kind: UnitKind.Corvette,
    slot: 0,
    faction: Faction.Bathyarch,
    x: 4000,
    y: 4000,
  });
  const theirs = spawnUnit(match.world, {
    kind: UnitKind.Corvette,
    slot: 1,
    faction: Faction.Pelagia,
    x: 4000 + gapM,
    y: 4000,
  });
  return { match, mine, theirs };
}

describe('exposure report', () => {
  it('mirrors exactly what the other side resolved', () => {
    const { match } = twoSides(600);
    const snapshots = nextSnapshot(match);

    for (const [slot, snapshot] of snapshots) {
      const other = slot === 0 ? 1 : 0;
      const theirContacts = snapshots.get(other)!.contacts;
      // Their best tier on anything of mine *is* my exposure tier. Computed
      // from the payload they actually receive, not from internal state, so
      // the two cannot drift apart without this failing.
      const best = theirContacts.reduce(
        (top, contact) => (contact.tier > top ? contact.tier : top),
        ResolutionTier.Silent
      );
      const tracked = theirContacts.filter(
        (contact) => contact.tier >= ResolutionTier.Bearing
      ).length;

      assert.equal(snapshot.exposure.tier, best, `slot ${slot} tier`);
      assert.equal(snapshot.exposure.trackedCount, tracked, `slot ${slot} tracked`);
    }
  });

  it('counts the hulls being watched, not the opponents watching them', () => {
    // Two commanders hid this: `trackedCount` was incremented once per
    // (observer, entity) pair, and with one opponent those are the same
    // number. With three commanders in the water they are not — the field is
    // documented as "how many of your entities are resolved at Bearing or
    // better", and the HUD prints it as `TRACKED xN`, so a single Cruiser two
    // opponents were holding read as two tracked hulls (#217).
    const match = new Match(undefined, { fauna: false, seed: 12 });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);
    match.addPlayer(2, Faction.Directorate);

    // Mid-map, far from every spawn, so the only thing of slot 0's that
    // anybody can hear is this one hull.
    spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 1,
      faction: Faction.Pelagia,
      x: 4200,
      y: 4000,
    });
    spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 2,
      faction: Faction.Directorate,
      x: 3800,
      y: 4000,
    });

    const snapshots = nextSnapshot(match);
    const mine = snapshots.get(0)!;

    // Both of them really are holding that hull, or this asserts nothing.
    for (const other of [1, 2]) {
      const onTheCruiser = snapshots
        .get(other)!
        .contacts.filter((c) => c.kind === UnitKind.Cruiser && c.tier >= ResolutionTier.Bearing);
      assert.equal(onTheCruiser.length, 1, `slot ${other} holds the Cruiser`);
    }

    assert.equal(mine.exposure.trackedCount, 1, 'one hull, two opponents holding it');
    assert.ok(
      mine.exposure.trackedCount <= mine.units.length + mine.structures.length,
      `tracked ${mine.exposure.trackedCount} of ${mine.units.length + mine.structures.length} own entities`
    );
  });

  it('reports silence when the two sides are out of earshot', () => {
    // Corner to corner on an 8 km map: far past anything a corvette radiates.
    const { match } = twoSides(7000);
    const snapshots = nextSnapshot(match);
    for (const snapshot of snapshots.values()) {
      assert.equal(snapshot.exposure.tier, ResolutionTier.Silent);
      assert.equal(snapshot.exposure.trackedCount, 0);
      assert.deepEqual(snapshot.selfEvents, []);
    }
  });

  it('tells the pinger it pinged, and the victim it was lit', () => {
    const { match, mine, theirs } = twoSides(500);
    match.activeSonar(0, mine);
    const snapshots = nextSnapshot(match);

    const pinger = snapshots.get(0)!.selfEvents;
    assert.ok(
      pinger.some((e) => e.kind === SelfEventKind.Ping && e.unitId === mine),
      'the pinger is told it transmitted'
    );

    const victim = snapshots.get(1)!.selfEvents;
    const lit = victim.find((e) => e.kind === SelfEventKind.Exposed);
    assert.ok(lit !== undefined, 'the victim is told it was lit');
    assert.equal(lit.unitId, theirs);
    // Bearing runs from the victim's hull toward the emitter. The pinger sits
    // due west of it, so the bearing must point that way.
    assert.ok(lit.bearing !== undefined);
    assert.ok(Math.abs(Math.abs(lit.bearing) - Math.PI) < 1e-6, `bearing ${lit.bearing}`);
  });

  it('sends a bearing and never a position', () => {
    const { match, mine } = twoSides(500);
    match.activeSonar(0, mine);
    const lit = nextSnapshot(match)
      .get(1)!
      .selfEvents.find((e) => e.kind === SelfEventKind.Exposed)!;

    // The gap this guards: a ping resolves by hard radius while the pinger's
    // own self-reveal travels by propagation, so in a masking biome you can be
    // lit by something you cannot hear back. Handing over coordinates would
    // close that gap on the victim's behalf.
    const keys = Object.keys(lit).sort();
    assert.deepEqual(keys, ['bearing', 'kind', 'unitId']);
  });

  it('does not report the pinger as exposing itself', () => {
    const { match, mine } = twoSides(500);
    match.activeSonar(0, mine);
    const own = nextSnapshot(match).get(0)!.selfEvents;
    assert.ok(
      own.every((e) => e.kind !== SelfEventKind.Exposed),
      'pinging is not being pinged'
    );
  });

  it('clears events between snapshots rather than repeating them', () => {
    const { match, mine } = twoSides(500);
    match.activeSonar(0, mine);
    assert.ok(nextSnapshot(match).get(0)!.selfEvents.length > 0);

    // A ping lasts three seconds; the *event* is the moment of transmission
    // and must fire once. Re-reporting it every tick would make the cue a
    // drone rather than a slammed door (§5).
    const later = nextSnapshot(match).get(0)!.selfEvents;
    assert.ok(
      later.every((e) => e.kind !== SelfEventKind.Ping),
      "transmission is reported once, not for the ping's whole duration"
    );
  });

  it('raises a break-silence event when a silent unit opens fire', () => {
    const match = new Match(undefined, { fauna: false, seed: 5 });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);
    const ambusher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 4200,
      y: 4000,
    });
    // Resolve the target first: an attack order takes an opaque contact
    // handle, and slot 0 can only be given one it has actually earned.
    const handle = contactHandleFor(match);
    match.setSilentRunning(0, ambusher, true);
    match.orderAttackContact(0, ambusher, handle);

    // Observe the whole run and record when it happened, rather than sampling
    // at a predicted instant — a silent unit holds fire until ordered, and the
    // order takes a tick or two to reach the weapon.
    let broke = false;
    for (let i = 0; i < SIM.TICK_HZ * 4 && !broke; i++) {
      const snapshots = match.update(STEP_MS);
      if (snapshots === null) continue;
      broke = snapshots
        .get(0)!
        .selfEvents.some((e) => e.kind === SelfEventKind.BreakSilence && e.unitId === ambusher);
    }
    assert.ok(broke, 'breaking silence to fire is reported as a discrete event');
    assert.ok(Owner.slot[ambusher] === 0 && Position.x[ambusher] !== undefined);
  });
});

/** The opaque handle slot 0 currently holds for `eid`, if it has one. */
function contactHandleFor(match: Match): number {
  // Attack orders take a contact handle. The ambusher can only fire at what it
  // has resolved, so drive the match until slot 0 holds a contact and use it.
  for (let i = 0; i < SIM.TICK_HZ * 2; i++) {
    const snapshots = match.update(STEP_MS);
    if (snapshots === null) continue;
    const contact = snapshots.get(0)!.contacts[0];
    if (contact !== undefined) return contact.id;
  }
  throw new Error('slot 0 never resolved a contact to attack');
}

describe('being lit is an event, not a state', () => {
  it('tells a hull it was lit once per transmission, not once per tick', () => {
    // A ping reveals for three seconds — fifteen Echo ticks. §5 makes exposure
    // "a hard, close, panned strike"; fifteen of them is a drone. Measured at
    // 42 strikes for a single ping before this was fixed.
    const { match, mine, theirs } = twoSides(500);
    match.activeSonar(0, mine);

    let strikes = 0;
    for (let i = 0; i < SIM.TICK_HZ * 5; i++) {
      const snapshots = match.update(STEP_MS);
      if (snapshots === null) continue;
      strikes += snapshots
        .get(1)!
        .selfEvents.filter((e) => e.kind === SelfEventKind.Exposed && e.unitId === theirs).length;
    }
    assert.equal(strikes, 1, `one strike per transmission, got ${strikes}`);
  });

  it('treats the next transmission as a new event', () => {
    const { match, mine, theirs } = twoSides(500);
    const litCount = () => {
      let n = 0;
      for (let i = 0; i < SIM.TICK_HZ * 5; i++) {
        const snapshots = match.update(STEP_MS);
        if (snapshots === null) continue;
        n += snapshots
          .get(1)!
          .selfEvents.filter((e) => e.kind === SelfEventKind.Exposed && e.unitId === theirs).length;
      }
      return n;
    };

    match.activeSonar(0, mine);
    assert.equal(litCount(), 1);
    // The reveal has lapsed by now, so this is a second transmission and the
    // victim is entitled to be told again.
    match.activeSonar(0, mine);
    assert.equal(litCount(), 1);
  });
});

describe('one bearing per ping, never a fix (#1290)', () => {
  /**
   * Every lit unit used to carry its own exact bearing to the pinger, and two
   * bearings are two rays that meet on it: two Light Scouts 670 m apart put
   * an enemy pinger within 0.1 m. `SelfEvent.bearing` is a direction and
   * never a location, so a side gets one bearing per ping, from its lit unit
   * nearest the pinger, and is told of the rest without one.
   */
  function lit(match: Match, slot: number): SelfEvent[] {
    const events: SelfEvent[] = [];
    for (let i = 0; i < SIM.TICK_HZ * 4; i++) {
      const snapshots = match.update(STEP_MS);
      if (snapshots === null) continue;
      events.push(
        ...snapshots.get(slot)!.selfEvents.filter((e) => e.kind === SelfEventKind.Exposed)
      );
    }
    return events;
  }

  it('gives a side one bearing, from its lit unit nearest the pinger', () => {
    const { match, mine, theirs } = twoSides(300);
    const farther = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 4000,
      y: 4600,
    });
    match.activeSonar(0, mine);
    const events = lit(match, 1);

    assert.deepEqual(
      events.map((e) => e.unitId).sort((a, b) => a - b),
      [theirs, farther].sort((a, b) => a - b),
      'both lit hulls are told they were lit'
    );
    const bearings = events.filter((e) => e.bearing !== undefined);
    assert.equal(bearings.length, 1, 'one bearing for the ping, so nothing to triangulate');
    assert.equal(bearings[0]!.unitId, theirs, 'and it is the nearer hull’s');
    // The pinger sits due west of the nearer hull.
    assert.ok(Math.abs(Math.abs(bearings[0]!.bearing!) - Math.PI) < 1e-6);
  });

  it('tells a mine or a decoy nothing: neither has ears', () => {
    const { match, mine, theirs } = twoSides(300);
    const field = spawnOrdnance(match.world, {
      kind: OrdnanceKind.Mine,
      slot: 1,
      faction: Faction.Pelagia,
      x: 4100,
      y: 4000,
      depth: 300,
      pressureRating: 3,
    });
    const decoy = spawnOrdnance(match.world, {
      kind: OrdnanceKind.Noisemaker,
      slot: 1,
      faction: Faction.Pelagia,
      x: 4000,
      y: 4100,
      depth: 300,
      pressureRating: 3,
      laid: true,
    });
    match.activeSonar(0, mine);
    const events = lit(match, 1);

    assert.ok(
      events.every((e) => e.unitId !== field && e.unitId !== decoy),
      'a mine or a decoy was told it was lit'
    );
    // The mine and the decoy are both nearer the pinger than the hull, and
    // the bearing is still the hull's.
    assert.deepEqual(
      events.map((e) => [e.unitId, e.bearing !== undefined]),
      [[theirs, true]]
    );
  });

  it('tells a unit lit later in the same ping without a bearing', () => {
    // The bearing is the ping's, not the pass's: a hull that comes into the
    // radius after its side was given one is told it was lit, and no more.
    const { match, mine, theirs } = twoSides(300);
    const late = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 4000,
      y: 6000,
    });
    match.activeSonar(0, mine);
    const first = nextSnapshot(match)
      .get(1)!
      .selfEvents.filter((e) => e.kind === SelfEventKind.Exposed);
    assert.deepEqual(
      first.map((e) => [e.unitId, e.bearing !== undefined]),
      [[theirs, true]]
    );
    Position.y[late] = 4500;
    const events = lit(match, 1);
    assert.deepEqual(
      events.map((e) => [e.unitId, e.bearing !== undefined]),
      [[late, false]]
    );
  });

  it('gives the next transmission its own bearing', () => {
    const { match, mine, theirs } = twoSides(300);
    match.activeSonar(0, mine);
    assert.equal(lit(match, 1).filter((e) => e.bearing !== undefined).length, 1);
    // The reveal has lapsed: a second ping is a second event, with its own.
    match.activeSonar(0, mine);
    const again = lit(match, 1);
    assert.deepEqual(
      again.map((e) => [e.unitId, e.bearing !== undefined]),
      [[theirs, true]]
    );
  });
});
