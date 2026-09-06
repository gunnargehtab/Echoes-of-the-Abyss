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
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { PROLOGUE_SORROWGATE, type MissionDefinition } from '../src/sim/missions/index.ts';

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
