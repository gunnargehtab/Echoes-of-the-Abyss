/**
 * A held hull says so, and gets its route back — #478.
 *
 * `missionRuntime.test.ts` already establishes that a tender moves when it is
 * escorted and stands still when it is not. What it could not establish, because
 * it drives the mission the way no player does — re-issuing every order once a
 * second — is what the rule feels like from the other side of the wire. Two
 * things were wrong there and both read as one bug:
 *
 * - **The refusal was silent.** `Match.orderMove` dropped the order and the
 *   player was told nothing, which docs/ui-ux.md §10.5 forbids by name: the lock
 *   is continuous state, "because a refusal delivered afterwards teaches
 *   nothing". So a tender that would not take an order read as a hull that did
 *   not work rather than as the mission's one rule.
 * - **The hold cancelled the route instead of pausing it.** Flying the flight
 *   ahead to scout cost the player their tender's whole plan, and bringing the
 *   ears back did not give it back. docs/mission-sorrowgate.md §8 says a tender
 *   "moves only while a hull of the flight is within 400 m of it" — *while* is a
 *   pause, and a hull that never moved again until re-ordered is not that.
 *
 * Both are tested against the resolved payload the room actually sends
 * (`MissionView.held`) and against where the hull ends up, never against the
 * runtime's own bookkeeping. The fixture is the Prologue with its clock pulled
 * in and everything not under test taken out — `missionConvocation.test.ts`'s
 * arrangement, and for its reason: the rule is what is slow to reach, not the
 * mission.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  MovementHoldReason,
  SIM,
  UnitKind,
  type EchoSnapshot,
  type MissionView,
} from '@echoes/shared';
import { defineQuery, hasComponent } from 'bitecs';
import { Match } from '../src/sim/match.ts';
import { Owner, Position, ResourceNode, Weapon } from '../src/sim/components.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import {
  CHORD_SECOND_CHORD,
  LEDGER_SHIFT_CHANGE,
  PROLOGUE_SORROWGATE,
  type MissionDefinition,
} from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const SEED = 11;
const PLAYER = PROLOGUE_SORROWGATE.playerSlot;

/**
 * The two rules, as the wire spells them.
 *
 * A code and not a sentence: the words are the shell's, and
 * `missionSafety.test.ts` holds the payload to carrying no string a mission did
 * not author. `movementHolds.test.ts` on the other side holds the codes to the
 * words.
 */
const UNRELEASED = MovementHoldReason.Unreleased;
const UNESCORTED = MovementHoldReason.Unescorted;

/** Pulled in from §9's 11:20, because what is under test is the rule, not the wait. */
const RELEASE_TICK = 2 * SIM.TICK_HZ;

const PLAYER_PARTY = PROLOGUE_SORROWGATE.parties.find((party) => party.slot === PLAYER)!;
const ESCORT = PLAYER_PARTY.units.find((unit) => unit.tag === 'escort-1')!;
const TENDER = PLAYER_PARTY.units.find((unit) => unit.tag === 'tender-1')!;

/**
 * One escort, one tender, and the court's array — the escort hold with nothing
 * else running.
 *
 * The other three escorts and the second tender are dropped so a test can say
 * "the flight" and mean one hull, the scripted parties are dropped because
 * nothing here is about them, and the silence ceiling is opened to 100 so the
 * array is never withdrawn mid-run for a rule this file is not testing. The
 * positions are the authored ones: the escort sits on the arch at 2,200 and the
 * tender in the chamber at 2,900, which is 700 m apart and so *outside* the
 * 400 m radius — the state the mission opens in.
 */
const HOLD_MISSION: MissionDefinition = {
  ...PROLOGUE_SORROWGATE,
  id: 'test-movement-hold',
  doc: 'docs/mission-sorrowgate.md §8 — the test authoring',
  fauna: false,
  silenceCeilingSig: 100,
  debtCapS: 0,
  parties: [
    {
      ...PLAYER_PARTY,
      units: [ESCORT, { ...TENDER, releaseTick: RELEASE_TICK }],
    },
  ],
  beats: [{ atTick: RELEASE_TICK, kind: 'release', tag: 'tender-1', note: '' }],
};

/**
 * Where the flight is while the clock runs.
 *
 * `close` keeps station 200 m off the tender's *current* position, which is
 * what a player escorting freight does and what a fixed point cannot be: the
 * tender moves, and an escort holding the water the tender started in falls out
 * of range on its own. `away` is a fixed corner of the basin, well clear of the
 * route north, so the hold under test is the flight leaving rather than the
 * geometry happening to work out.
 */
type Station = 'close' | 'away';

/** Far from the tender and far from anywhere it is sent in this file. */
const AWAY = { x: 3900, y: 3000 };
/** How far off the tender the flight keeps station — inside the 400 m radius. */
const STATION_OFFSET_M = 200;

interface Harness {
  match: Match;
  /** Run for this many seconds, holding the flight on the named station. */
  settle(seconds: number, station?: Station): void;
  view(): MissionView;
  own(): EchoSnapshot;
  tenderId(): number;
  escortId(): number;
  /** Which hold the mission has the tender under right now, or null when none. */
  heldReason(): MovementHoldReason | null;
}

function harness(): Harness {
  const map = missionMapById(HOLD_MISSION.mapId)!;
  const match = new Match(map, { mission: HOLD_MISSION, fauna: false, seed: SEED });
  let last: EchoSnapshot | null = null;
  let view: MissionView | null = null;

  // The player's own two hulls, told apart by class rather than by tag: a tag
  // registry is the runtime's, and this test reads only what the room sends.
  const unitOf = (kind: UnitKind): number =>
    last?.units.find((unit) => unit.kind === kind)?.id ?? 0;

  const step = (station?: Station): void => {
    const own = match.update(STEP_MS)?.get(PLAYER);
    if (own !== undefined) last = own;
    const next = match.takeMissionView();
    if (next !== null) view = next;
    // Re-issued on the Echo beat, as a player holding a station would: the
    // escort is not the hull under test and its own order must not expire.
    if (station === undefined || match.tick % 12 !== 0) return;
    const escort = last?.units.find((unit) => unit.kind === UnitKind.LightScout);
    const tender = last?.units.find((unit) => unit.kind === UnitKind.Harvester);
    if (escort === undefined || tender === undefined) return;
    const to = station === 'away' ? AWAY : { x: tender.x + STATION_OFFSET_M, y: tender.y };
    match.orderMove(PLAYER, escort.id, to.x, to.y);
  };

  const self: Harness = {
    match,
    settle: (seconds, station) => {
      for (let tick = 0; tick < SIM.TICK_HZ * seconds; tick++) step(station);
    },
    view: () => {
      assert.ok(view !== null, 'the mission sent no view at all');
      return view;
    },
    own: () => {
      assert.ok(last !== null, 'the mission produced no snapshot at all');
      return last;
    },
    tenderId: () => unitOf(UnitKind.Harvester),
    escortId: () => unitOf(UnitKind.LightScout),
    heldReason: () =>
      self.view().held.find((hold) => hold.unitId === self.tenderId())?.reason ?? null,
  };
  // One pass, so the harness has a snapshot to resolve ids against before any
  // test asks it a question.
  self.settle(1);
  return self;
}

/** Where the tender is, from the player's own resolved snapshot. */
function tenderAt(h: Harness): { x: number; y: number } {
  const tender = h.own().units.find((unit) => unit.id === h.tenderId())!;
  return { x: tender.x, y: tender.y };
}

/** Somewhere north the tender can be sent, well short of the collapsed arch. */
const NORTH = { x: 2420, y: 2500 };

describe('a mission that holds a hull still says which hold, and to whom', () => {
  it('names the schedule while the hull is still on the clock', () => {
    const h = harness();
    assert.equal(h.heldReason(), UNRELEASED);
    // And the reason is about the player's own hull and nothing else: the
    // payload carries an id from their own snapshot, never a contact handle.
    assert.ok(h.own().units.some((unit) => unit.id === h.view().held[0]?.unitId));
  });

  it('names the escort once the clock has run out and the ears have not arrived', () => {
    const h = harness();
    h.settle(3);
    assert.equal(h.heldReason(), UNESCORTED);
  });

  it('says nothing at all once a hull of the flight is in range', () => {
    const h = harness();
    h.settle(30, 'close');
    assert.equal(h.heldReason(), null, 'an escorted tender is not held');
    // Empty rather than reporting the force with no reason attached: `held` is
    // on every view, and a mission holding nobody has to cost the wire nothing.
    assert.deepEqual(h.view().held, []);
  });
});

describe('the escort hold pauses a route rather than cancelling it', () => {
  it('gives the order back when the ears return, with nothing re-issued', () => {
    const h = harness();
    // Ears in range, then one order north — issued exactly once, which is the
    // whole point of the test.
    h.settle(3, 'close');
    assert.equal(h.heldReason(), null, 'the tender is escorted before it is ordered');
    h.match.orderMove(PLAYER, h.tenderId(), NORTH.x, NORTH.y);
    h.settle(4, 'close');
    assert.ok(tenderAt(h).y < TENDER.y - 10, 'the tender left on its order');

    // The flight flies off to scout. The tender stops, and says why.
    h.settle(4, 'away');
    const stopped = tenderAt(h);
    assert.equal(h.heldReason(), UNESCORTED);
    h.settle(4, 'away');
    assert.ok(
      Math.hypot(tenderAt(h).x - stopped.x, tenderAt(h).y - stopped.y) < 5,
      'a tender with no ears in range does not drift on'
    );

    // The flight comes back. The order it was given is still the order it has.
    h.settle(20, 'close');
    assert.equal(h.heldReason(), null);
    const resumed = tenderAt(h);
    assert.ok(
      resumed.y < stopped.y - 10,
      `the tender resumed its route without being re-ordered (was ${stopped.y.toFixed(0)}, now ${resumed.y.toFixed(0)})`
    );
  });

  it('forgets the route it gave back, so a later order is not overruled', () => {
    const h = harness();
    h.settle(3, 'close');
    h.match.orderMove(PLAYER, h.tenderId(), NORTH.x, NORTH.y);
    h.settle(3, 'close');

    // Off and back: the northward route is suspended and then resumed, which
    // is the case above. What matters here is what the runtime is still
    // holding afterwards — nothing.
    h.settle(4, 'away');
    h.settle(4, 'close');
    assert.equal(h.heldReason(), null, 'the tender has its ears back');
    const resumed = tenderAt(h);

    // A new order, given to a hull the mission is not holding. The suspended
    // route must be gone rather than merely dormant: a resume that fired again
    // on the next pass would be the hold arguing with the player.
    h.match.orderMove(PLAYER, h.tenderId(), resumed.x, resumed.y + 400);
    h.settle(12, 'close');
    assert.ok(
      tenderAt(h).y > resumed.y + 50,
      `the tender took the order it was last given (y ${tenderAt(h).y.toFixed(0)}, was ${resumed.y.toFixed(0)})`
    );
  });
});

describe('the order path and the wire agree about what is held', () => {
  it('refuses the move it is telling the player it refuses', () => {
    const h = harness();
    assert.equal(h.heldReason(), UNRELEASED);
    const before = tenderAt(h);
    h.match.orderMove(PLAYER, h.tenderId(), NORTH.x, NORTH.y);
    h.settle(1);
    assert.ok(
      Math.hypot(tenderAt(h).x - before.x, tenderAt(h).y - before.y) < 5,
      'an order refused on the wire is an order refused in the water'
    );
  });

  it('refuses the dive as well, which is most of the route out', () => {
    const h = harness();
    assert.equal(h.match.orderDepth(PLAYER, h.tenderId(), 900), false);
    assert.equal(h.heldReason(), UNRELEASED);
  });
});

/**
 * The harvest order, which is a movement order and was the one that did not know it.
 *
 * Every other path into the water — move, attack-move, embark, dive,
 * follow-floor — asks `holdsMovement` before it writes. `orderHarvest` did
 * not, and the omission was worse than a missed refusal because of the two
 * clocks: `harvestSystem` re-asserts `MoveOrder` at 60 Hz while
 * `applyMovementHolds` clamps at 5, so the clamp never caught up and a held
 * hull simply left. Measured at 659 m in twenty seconds before the guard.
 *
 * Driven against *Shift Change* rather than the Prologue fixture above because
 * that is where it actually bites: the Prologue has no fields to send anybody
 * to, and every held hull in *Shift Change* is a Harvester with a watch aboard
 * (shiftChange.ts §3), so the bells were optional for anyone who right-clicked
 * a nodule field. The shipped literal, unmodified — the point is the
 * configuration that ships, not one arranged to fail.
 */
describe('a harvest order is a movement order, and the hold refuses it too', () => {
  const shiftHarness = (): {
    match: Match;
    eid: number;
    slot: number;
    node: number;
    /** The view the boot consumed — `takeMissionView` yields only on a change. */
    view: MissionView;
    at: () => { x: number; y: number };
  } => {
    const map = missionMapById(LEDGER_SHIFT_CHANGE.mapId)!;
    const match = new Match(map, { mission: LEDGER_SHIFT_CHANGE, fauna: false, seed: 17 });
    for (let tick = 0; tick < SIM.TICK_HZ; tick++) match.update(STEP_MS);

    // A hull the mission says it is holding, taken from the payload the room
    // sends rather than from the runtime's own bookkeeping.
    const view = match.takeMissionView();
    assert.ok(view !== null && view.held.length > 0, 'the mission is holding nobody to test with');
    const eid = view.held[0]!.unitId;
    const slot = Owner.slot[eid]!;

    // The furthest field, so any travel at all is unambiguous rather than drift.
    const fields = defineQuery([ResourceNode, Position])(match.world);
    assert.ok(fields.length > 0, 'the map has no field to be sent to');
    let node = fields[0]!;
    let far = -1;
    for (const candidate of fields) {
      const d = Math.hypot(
        Position.x[candidate]! - Position.x[eid]!,
        Position.y[candidate]! - Position.y[eid]!
      );
      if (d > far) {
        far = d;
        node = candidate;
      }
    }
    return {
      match,
      eid,
      slot,
      node,
      view,
      at: () => ({ x: Position.x[eid]!, y: Position.y[eid]! }),
    };
  };

  it('leaves a held hull where it stands, as a move order already did', () => {
    const h = shiftHarness();
    const before = h.at();
    h.match.orderHarvest(h.slot, h.eid, h.node);
    for (let tick = 0; tick < SIM.TICK_HZ * 20; tick++) h.match.update(STEP_MS);
    const moved = Math.hypot(h.at().x - before.x, h.at().y - before.y);
    assert.ok(
      moved < 5,
      `a held hull given a harvest order stayed put (moved ${moved.toFixed(0)} m in 20 s)`
    );
  });

  it('is still telling the player it is held, twenty seconds later', () => {
    // The regression was not that the hull twitched; it was that it kept
    // going, because the order outlived every clamp — twenty seconds is a
    // hundred Echo passes. Read off the payload the room sends, like the rest
    // of this file, so what the player is told and what the water does are the
    // same assertion.
    const h = shiftHarness();
    h.match.orderHarvest(h.slot, h.eid, h.node);
    // Seeded from the boot's own view rather than null: the payload is sent on
    // a change, so a hold that simply persists produces no second view and a
    // null start would assert on nothing having happened.
    let view: MissionView = h.view;
    for (let tick = 0; tick < SIM.TICK_HZ * 20; tick++) {
      h.match.update(STEP_MS);
      const next = h.match.takeMissionView();
      if (next !== null) view = next;
    }
    assert.ok(
      view.held.some((hold) => hold.unitId === h.eid),
      'the hull the mission walked was still being reported as held'
    );
  });
});

/**
 * The ordered target, which is the seventh way to move a hull and the last found.
 *
 * `orderAttackContact` writes `Weapon.orderedTargetEid`, and combat.ts chases
 * an *ordered* target — "only an explicit order chases; auto-acquired targets
 * were in range by construction". So an attack order is a movement order, on
 * the same 60 Hz-against-5 Hz footing as the harvest loop above, and it was the
 * one path that never asked the hold.
 *
 * Refused rather than clamped in the chase, because the chase is on the 60 Hz
 * budget and the command path is not — and refusing the *order* leaves the
 * auto-acquire alone, so a held hull still answers what comes into range and
 * simply never goes looking. That is the right reading of a hold: it is a
 * movement rule, and a mission that wants the guns cold says so with
 * `denies(slot, 'weapons')` instead.
 *
 * Driven against *The Second Chord*, which is where it bites: `escort-b` is an
 * armed Corvette held by `releaseTick`, with the raid's targets resolved and
 * four kilometres off. Before the guard it walked 1,699.9 m in twenty seconds
 * while the wire went on reporting it as held.
 */
describe('an ordered target is a movement order, and the hold refuses it too', () => {
  it('leaves an armed held hull where it stands, with the contact resolved', () => {
    const map = missionMapById(CHORD_SECOND_CHORD.mapId)!;
    const match = new Match(map, { mission: CHORD_SECOND_CHORD, fauna: false, seed: 5 });
    let own: EchoSnapshot | null = null;
    let view: MissionView | null = null;
    for (let tick = 0; tick < SIM.TICK_HZ * 5; tick++) {
      const next = match.update(STEP_MS)?.get(CHORD_SECOND_CHORD.playerSlot);
      if (next !== undefined) own = next;
      const sent = match.takeMissionView();
      if (sent !== null) view = sent;
    }
    assert.ok(own !== null && view !== null, 'the mission produced neither a snapshot nor a view');
    assert.ok(own.contacts.length > 0, 'nothing is resolved to attack');

    // The held hull that can actually shoot — the Cruiser beside it carries no
    // weapon, so an attack order on it is refused a line earlier for a reason
    // this test is not about.
    const armed = view.held
      .map((hold) => hold.unitId)
      .find((eid) => hasComponent(match.world, Weapon, eid));
    assert.ok(armed !== undefined, 'no held hull in this mission is armed');

    // The furthest contact, so a chase would be unmistakable.
    let far = -1;
    let target = own.contacts[0]!;
    for (const contact of own.contacts) {
      const d = Math.hypot(contact.x - Position.x[armed]!, contact.y - Position.y[armed]!);
      if (d > far) {
        far = d;
        target = contact;
      }
    }
    assert.ok(far > 1000, `the contact to chase is only ${far.toFixed(0)} m off`);

    const before = { x: Position.x[armed]!, y: Position.y[armed]! };
    match.orderAttackContact(Owner.slot[armed]!, armed, target.id);
    for (let tick = 0; tick < SIM.TICK_HZ * 20; tick++) match.update(STEP_MS);

    const moved = Math.hypot(Position.x[armed]! - before.x, Position.y[armed]! - before.y);
    assert.ok(
      moved < 5,
      `a held hull chased a contact ${far.toFixed(0)} m off (moved ${moved.toFixed(0)} m)`
    );
  });
});
