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
import {
  Embarking,
  MoveOrder,
  Owner,
  Position,
  Posture,
  ResourceNode,
  Weapon,
} from '../src/sim/components.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import {
  CHORD_SECOND_CHORD,
  LEDGER_SHIFT_CHANGE,
  PROLOGUE_SORROWGATE,
  type MissionDefinition,
  type MissionUnit,
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
/** Read rather than transcribed, so a berth that moves takes the fixture with it. */
const TENDER_2 = PLAYER_PARTY.units.find((unit) => unit.tag === 'tender-2')!;

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
  /**
   * *The Second Chord* five seconds in, and the held hull in it that can shoot.
   *
   * `escort-b` is an armed Corvette held by `releaseTick` (secondChord.ts), in a
   * mission whose only lock is `construction` — so this is the shipped literal,
   * unmodified, and it is the strongest fixture in this file for any verb that
   * needs guns. The Cruiser beside it carries no weapon, so an attack order on
   * that one is refused a line earlier for a reason these tests are not about.
   */
  const chord = (): {
    match: Match;
    own: EchoSnapshot;
    armed: number;
  } => {
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
    const armed = view.held
      .map((hold) => hold.unitId)
      .find((eid) => hasComponent(match.world, Weapon, eid));
    assert.ok(armed !== undefined, 'no held hull in this mission is armed');
    return { match, own, armed };
  };

  it('leaves an armed held hull where it stands, with the contact resolved', () => {
    const { match, own, armed } = chord();
    assert.ok(own.contacts.length > 0, 'nothing is resolved to attack');

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

  /**
   * Attack-move, refused, against the configuration that ships.
   *
   * The pair below in `ARMED_MISSION` needs a fixture for its *control* leg —
   * `escort-b` releases at 15:30 and no shipped mission holds an armed hull on
   * a clock a test can wait out — but the refusal itself needs nothing added
   * and nothing unlocked, so it is held here where the hull, its guns and its
   * hold are all the literal's own.
   *
   * Binary components read with no step between the order and the read, so
   * nothing races the clamp: `Posture.engage` is written by `orderAttackMove`
   * itself and by nothing else on this path.
   */
  it('refuses an attack-move from that same hull, with nothing added and nothing unlocked', () => {
    const { match, armed } = chord();
    match.orderAttackMove(Owner.slot[armed]!, armed, Position.x[armed]! + 2000, Position.y[armed]!);
    assert.equal(Posture.engage[armed], 0, 'a held hull was put into engage posture');
    assert.equal(MoveOrder.active[armed], 0, 'a held hull was given somewhere to be');
  });
});

/**
 * `HOLD_MISSION` with one hull alongside — the only fixtures in this file that
 * *add* a hull, and the narrowest claim that justifies doing so.
 *
 * Not "no shipped mission can exercise these verbs". *The Second Chord* holds
 * an armed Corvette and the case above drives an attack-move refusal against
 * it, unmodified. What no shipped mission offers is a **control leg**: the
 * refusal is only worth asserting beside the same call going through, and
 * `escort-b` releases at 15:30 — 55,800 ticks, which is not a test. Embark is
 * the stronger case and needs no such qualification: no definition in the tree
 * fields a hull with a hold at all, so there is nothing to board at any tick.
 *
 * Both added hulls take their berth from tender-2's, read off the definition
 * rather than transcribed: water this mission already puts a PR 2 hull in, and
 * both are PR 2, so a fixture cannot crush the thing it is testing with — and a
 * berth that moves takes the fixture with it instead of leaving a comment
 * asserting a fact the literal no longer carries.
 *
 * Each is given a `role` that is neither `escort` nor `tender`, and both halves
 * matter: an escort alongside would satisfy the escort hold the moment it came
 * inside 400 m, and a tender would be held by that hold rather than by the
 * clock under test. `MissionRole` is a free string (types.ts), so a third word
 * costs nothing.
 */
function alongside(id: string, extra: MissionUnit): MissionDefinition {
  return {
    ...HOLD_MISSION,
    id,
    parties: [
      {
        ...PLAYER_PARTY,
        units: [ESCORT, { ...TENDER, releaseTick: RELEASE_TICK }, extra],
      },
    ],
  };
}

interface Alongside {
  match: Match;
  /** The added hull, resolved off the player's own snapshot by class. */
  extra: number;
  /** The Prologue's tender, for the case whose subject is the tender. */
  tender: number;
  settle(seconds: number, close?: boolean): void;
  heldOf(eid: number): MovementHoldReason | null;
  at(eid: number): { x: number; y: number };
}

function alongsideHarness(mission: MissionDefinition, added: UnitKind): Alongside {
  const map = missionMapById(mission.mapId)!;
  const match = new Match(map, { mission, fauna: false, seed: SEED });
  let last: EchoSnapshot | null = null;
  let view: MissionView | null = null;

  const step = (close?: boolean): void => {
    const own = match.update(STEP_MS)?.get(PLAYER);
    if (own !== undefined) last = own;
    const next = match.takeMissionView();
    if (next !== null) view = next;
    if (close !== true || match.tick % 12 !== 0) return;
    const escort = last?.units.find((unit) => unit.kind === UnitKind.LightScout);
    const tender = last?.units.find((unit) => unit.kind === UnitKind.Harvester);
    if (escort === undefined || tender === undefined) return;
    match.orderMove(PLAYER, escort.id, tender.x + STATION_OFFSET_M, tender.y);
  };

  const self: Alongside = {
    match,
    get extra() {
      return last?.units.find((unit) => unit.kind === added)?.id ?? 0;
    },
    get tender() {
      return last?.units.find((unit) => unit.kind === UnitKind.Harvester)?.id ?? 0;
    },
    settle: (seconds, close) => {
      for (let tick = 0; tick < SIM.TICK_HZ * seconds; tick++) step(close);
    },
    heldOf: (eid) => {
      assert.ok(view !== null, 'the mission sent no view at all');
      return view.held.find((hold) => hold.unitId === eid)?.reason ?? null;
    },
    at: (eid) => ({ x: Position.x[eid]!, y: Position.y[eid]! }),
  };
  self.settle(1);
  return self;
}

/**
 * A hull with guns, held by the clock exactly as the tender is.
 *
 * The `weapons` lock comes off with it, and the reason is narrower than "it
 * would hide the defect" — measured, it does not. The hold guard runs *before*
 * the lock (`match.ts`: guard, then `missionDenies`, then `applyMove` four
 * lines down), so the **held** leg is lock-independent and would pass either
 * way. What the lock does is make the *control* leg impossible: a locked slot
 * returns through `applyMove` without touching `Posture.engage`, so with the
 * lock in place the control fails outright — `expected 1, actual 0`. It comes
 * off so the pair can exist at all, which is the same trade `HOLD_MISSION`
 * makes when it opens the silence ceiling to 100: a rule this file is not
 * testing, set aside where it would otherwise decide the outcome.
 *
 * `armed: true` is the other half and neither substitutes for the other: a
 * mission hull is spawned `weaponsCold` unless its literal arms it
 * (`runtime.ts`), so with the lock lifted alone the Corvette still has no
 * `Weapon` and the order still lands as a plain move.
 */
const ARMED_MISSION: MissionDefinition = {
  ...alongside('test-movement-hold-armed', {
    tag: 'gun',
    kind: UnitKind.Corvette,
    x: TENDER_2.x,
    y: TENDER_2.y,
    depthM: TENDER_2.depthM,
    role: 'gun',
    releaseTick: RELEASE_TICK,
    // See the block above: without this the hull is `weaponsCold` and the
    // control leg lands as a plain move rather than an attack-move.
    armed: true,
    note: 'A hull with a Weapon, so an attack-move is one rather than a move in its clothes',
  }),
  locks: PROLOGUE_SORROWGATE.locks.filter((lock) => lock.ability !== 'weapons'),
};

/**
 * The three verbs both invariant rows named and no mission test ever reached — #722.
 *
 * `docs/invariants.md` rows 16 and 17 each list seven orders. Across the whole
 * backend suite `orderAttackMove`, `orderEmbark` and `orderFollowFloor` were
 * reached only by files that run no mission at all — `ai.test.ts`,
 * `posture.test.ts`, `followFloor.test.ts`, `echoDelta.test.ts`,
 * `carrying.test.ts` — so three sevenths of both rows were prose. That is the
 * drift `invariants.md`'s own admission rule exists to stop, *"It is held by a
 * test, not by a convention. A rule nobody checks is a comment"*, and
 * `check:invariants` cannot see it: it is a liveness check, and a holder that
 * still resolves tells it nothing about how many clauses the holder asserts.
 *
 * Every case here is a **pair** — the refusal while the hull is held, then the
 * same call going through once it is free. The second half is not politeness:
 * `orderFollowFloor` returns `false` for an unowned hull and for one with no
 * `DepthOrder` too, so a lone `false` would read as the hold's answer whatever
 * produced it. That is the vacuous guard #722 found in the row-14 holder, and
 * it is the failure mode a refusal test is most prone to.
 */
describe('the hold refuses the three verbs the rows claim and nothing asserted', () => {
  it('refuses follow-floor, because a hold that let a hull drift down a slope is not one', () => {
    const h = harness();
    assert.equal(h.heldReason(), UNRELEASED);
    assert.equal(
      h.match.orderFollowFloor(PLAYER, h.tenderId(), true),
      false,
      'a held hull took a standing order to hug the seabed'
    );

    // The control. Same call, same hull, once the clock has run out and the
    // ears are in range: a `true` here is what makes the `false` above the
    // hold's answer rather than the ownership check's.
    h.settle(4, 'close');
    assert.equal(h.heldReason(), null, 'the tender has its ears back before the control');
    assert.equal(h.match.orderFollowFloor(PLAYER, h.tenderId(), true), true);
  });

  it('refuses attack-move, and a hull with guns takes the same order once it is free', () => {
    const h = alongsideHarness(ARMED_MISSION, UnitKind.Corvette);
    const gun = h.extra;
    assert.notEqual(gun, 0, 'the fixture fielded no armed hull');
    assert.equal(h.heldOf(gun), UNRELEASED);
    const before = h.at(gun);
    h.match.orderAttackMove(PLAYER, gun, NORTH.x, NORTH.y);

    // Read immediately, before a single step: `Posture.engage` and
    // `MoveOrder.active` are written by `orderAttackMove` itself and are binary,
    // so the refusal is asserted without racing the clamp. A distance check
    // here would be the weaker instrument — `applyMovementHolds` suspends a
    // held hull every Echo pass, so the 60 Hz mover can creep a few metres
    // before the 5 Hz clamp catches it and any margin is a bet on the tick
    // rates rather than on the guard.
    assert.equal(Posture.engage[gun], 0, 'a held hull was put into engage posture');
    assert.equal(MoveOrder.active[gun], 0, 'a held hull was given somewhere to be');

    // The control, and it is what makes this case about attack-move at all.
    // `orderAttackMove` falls through to a plain `applyMove` for a hull with no
    // `Weapon` (match.ts), so driving it with the Prologue's tender — a
    // Harvester, `attackDamage` 0 — would exercise the move path and prove
    // nothing about the verb row 17 names. The Corvette has guns, so the free
    // leg reaches the attack-move body and `Posture.engage` says so.
    h.settle(4);
    assert.equal(h.heldOf(gun), null, 'the clock has run out before the control');
    h.match.orderAttackMove(PLAYER, gun, NORTH.x, NORTH.y);
    assert.equal(Posture.engage[gun], 1, 'a free hull did not reach the attack-move body');
    assert.equal(MoveOrder.active[gun], 1);
    assert.equal(Math.round(Posture.engageX[gun]!), NORTH.x);

    h.settle(4);
    assert.ok(
      h.at(gun).y < before.y - 10,
      `and advances on it (y ${h.at(gun).y.toFixed(0)}, was ${before.y.toFixed(0)})`
    );
  });
});

/**
 * Embark, which is a movement order and which no shipped mission can exercise.
 *
 * The guard is real — `orderEmbark` asks `holdsMovement` before it asks
 * `canBoard` — but **no mission definition in the tree fields a hull with a
 * hold.** `Freighter`, `Drifter`, `Verger` and `Antiphon` are the four kinds
 * that carry `holdBerths`, and not one of the twenty-nine definitions spawns
 * any of them. So there is nothing in the shipped configuration to board, and
 * a test driven against one would assert that a hull which could not have
 * boarded anyway did not board: a guard that passes with the bug in, which is
 * exactly what #722 found in the row-14 holder and exactly what this file's
 * harvest case takes such care to avoid.
 *
 * Hence the one fixture here that *adds* a hull rather than removing one, and
 * hence this being the only case in the file not driven against a shipped
 * literal. #722 offers the alternative of cutting embark out of both rows
 * instead; that is the worse half of the choice, because the guard exists, the
 * rows are the checklist the next author reads before adding an order, and the
 * first mission to field a transport should find the property already held
 * rather than have to discover it.
 */
describe('the hold refuses a boarding, which no shipped mission has a hold to show', () => {
  const BOARDING_MISSION = alongside('test-movement-hold-boarding', {
    tag: 'lighter',
    kind: UnitKind.Freighter,
    x: TENDER_2.x,
    y: TENDER_2.y,
    depthM: TENDER_2.depthM,
    role: 'lighter',
    note: 'A transport, so the boarding both rows claim has something to refuse',
  });

  it('leaves a held hull in the water, and lets the same hull board once it is free', () => {
    const h = alongsideHarness(BOARDING_MISSION, UnitKind.Freighter);
    const carrier = h.extra;
    assert.notEqual(carrier, 0, 'the fixture fielded no transport to board');
    assert.equal(h.heldOf(h.tender), UNRELEASED);

    const boarding = (): boolean => hasComponent(h.match.world, Embarking, h.tender);
    h.match.orderEmbark(PLAYER, h.tender, carrier);
    assert.equal(boarding(), false, 'a held hull was sent to close on a transport');

    // The control, and the whole reason this fixture exists: the same order,
    // the same two hulls, once the hold is off. Without it the assertion above
    // is satisfied by every hull in every mission that ships, none of which
    // has anything to board.
    h.settle(4, true);
    assert.equal(h.heldOf(h.tender), null, 'the tender has its ears back before the control');
    h.match.orderEmbark(PLAYER, h.tender, carrier);
    assert.equal(boarding(), true, 'a free hull takes the same order');
  });
});
