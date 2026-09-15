/**
 * The mission, running — docs/mission-sorrowgate.md, against a live match (#190).
 *
 * `missions.test.ts` reads the literal; this file plays it. The claims worth
 * paying a twenty-minute simulation for are the ones no amount of reading the
 * table can establish, and they are all in §4 and §8:
 *
 * - **The court adjourns at 20:00 on whatever count the player earned** (§8's
 *   Results table). A mission that never resolves is not a mission, and one
 *   that resolves early on the wrong reading closes the record on people who
 *   were out.
 * - **A tender does not move without ears, and does not move before it is
 *   loaded** (§8). This is the whole escort, and it is made of listening and
 *   position rather than of anything being shot at.
 * - **The climb is the route** (§9's 16:00–19:00, §11's Descent). The Descent's
 *   floor is 900 m and a tender sits at 1,470 m, so "the run north and the
 *   climb" is a fact about the ground: a player who never orders the ascent
 *   watches the freight stall against water it cannot enter.
 * - **The order binds the flight and not the tenders** (§4). The sharpest test
 *   in this file: the tenders run at SIG 40, far over the ceiling, for minutes
 *   at a stretch, and the flight never owes the court a second. A ledger that
 *   measured the whole force would black out the array for the court's own
 *   freight being what it is.
 *
 * **On wall-clock.** Three of these run the mission out at 60 Hz, which is
 * about ninety seconds each, so each scenario is driven exactly once and its
 * observations are shared by the assertions that read them. That is the whole
 * reason for the memoised `…Run()` helpers below: one drive, many claims.
 *
 * Everything is read from `match.update(...)`'s return value — the same
 * resolved payload the room sends — except two deliberate ECS reads, marked
 * where they happen and argued for there.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DRIFT,
  Faction,
  FaunaSpecies,
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  SIM,
  UNIT_STATS,
  UnitKind,
  type EchoSnapshot,
  type MissionView,
} from '@echoes/shared';
import { defineQuery, hasComponent } from 'bitecs';
import { Acoustic, Fauna, MoveOrder } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { REPLAY_FORMAT_VERSION, playReplay } from '../src/sim/replay.ts';
import { PROLOGUE_SORROWGATE, type MissionLine } from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const SEED = 7;

/** Every creature in the water, for the commitment guard at the foot of this file. */
const faunaQuery = defineQuery([Fauna]);
const PLAYER = PROLOGUE_SORROWGATE.playerSlot;

/** §11's extraction point, in the middle of the Upper Concourse. */
const CONCOURSE = { x: 2500, y: 350 };
/**
 * The route out, since the arch closed behind the transit (#197).
 *
 * §9's "the service lock is now the only way out" is ground now, so the run
 * north is no longer a straight line and this test can no longer drive one.
 * Movement has no pathfinder — `resolveStep` slides a hull along an obstacle
 * and never searches — so a player heading for the Concourse steers through
 * the lock themselves, and so does this.
 *
 * Two waypoints and then the Concourse: into the lock's own column, north
 * through it, and out the far side. The second is deliberately at x 1,950 —
 * the lock is columns 7 and 8 and only column 7 opens onto districts water
 * north of it, because column 8 above the lock is the Descent's 900 m floor.
 */
const ROUTE = [{ x: 1980, y: 2120 }, { x: 1950, y: 1700 }, CONCOURSE] as const;
/** How close is close enough to count a waypoint reached. */
const WAYPOINT_M = 220;
/** Above the thermocline, and above every floor on the route north. */
const CLIMB_TO_M = 300;
/**
 * Where each escort is stationed relative to its tender.
 *
 * Not the tender's own position: two hulls ordered onto one point are an
 * overlap, and separation resolves an overlap by shoving — which walks the
 * whole clump somewhere neither was sent. An offset well inside the 400 m
 * escort radius keeps the ears in range and the shoving out of the result.
 */
const STATION = [
  { x: -260, y: 0 },
  { x: 260, y: 0 },
];
/** Orders are re-issued on this cadence, as a player holding a formation would. */
const REISSUE_TICKS = 60;

function missionMatch(): Match {
  const map = missionMapById(PROLOGUE_SORROWGATE.mapId);
  assert.ok(map !== undefined, 'the mission map resolves by mission id and by nothing else');
  return new Match(map, { mission: PROLOGUE_SORROWGATE, fauna: false, seed: SEED });
}

/** The player's own freight and the player's own flight, from their own snapshot. */
const tendersIn = (own: EchoSnapshot) => own.units.filter((u) => u.kind === UnitKind.Harvester);
const escortsIn = (own: EchoSnapshot) => own.units.filter((u) => u.kind === UnitKind.LightScout);

interface Run {
  match: Match;
  /** Every mission view the room would have sent, in order. */
  views: MissionView[];
  /** The last snapshot the player was sent. */
  last: EchoSnapshot;
  /** Every line the room would have sent, in the order the beats spoke them. */
  lines: MissionLine[];
  /** Snapshots at the sampled ticks, keyed by the second they landed on. */
  sampled: Map<number, EchoSnapshot>;
  /** The loudest a tender and the loudest an escort ever were, over the run. */
  peakTenderSig: number;
  peakEscortSig: number;
  /** True if any order to a tender was refused while the tender was still held. */
  refusedWhileHeld: boolean;
}

interface DriveOptions {
  /** Ticks to run for, unless the mission resolves first. */
  ticks: number;
  /** Order the tenders north, and the flight onto station around them. */
  escort: boolean;
  /** Order the ascent as well. False plays §9's run north without the climb. */
  climb: boolean;
  /** Seconds at which to keep a copy of the player's own snapshot. */
  sampleAtS?: readonly number[];
}

/**
 * Play the mission, driving it the way a player would and recording what the
 * room would have been given.
 *
 * The mission is stepped by `match.update`, and every observation is taken from
 * its return value — the resolved per-slot payload — rather than from the world
 * behind it. A test that read the ECS to decide whether the player had won
 * would be testing a different game from the one the client is playing.
 */
function drive(options: DriveOptions): Run {
  const match = missionMatch();
  const views: MissionView[] = [];
  const lines: MissionLine[] = [];
  const sampled = new Map<number, EchoSnapshot>();
  const wanted = new Set(options.sampleAtS ?? []);
  let last: EchoSnapshot | null = null;
  let peakTenderSig = 0;
  let peakEscortSig = 0;
  let refusedWhileHeld = false;
  /** Which waypoint each tender is currently steering for. */
  const leg = new Map<number, number>();

  for (let tick = 0; tick < options.ticks; tick++) {
    const own = match.update(STEP_MS)?.get(PLAYER);
    if (own !== undefined) {
      last = own;
      for (const tender of tendersIn(own)) peakTenderSig = Math.max(peakTenderSig, tender.sig);
      for (const escort of escortsIn(own)) peakEscortSig = Math.max(peakEscortSig, escort.sig);
      const second = Math.round(own.tick / SIM.TICK_HZ);
      if (wanted.has(second) && !sampled.has(second)) sampled.set(second, own);
    }

    if (options.escort && last !== null && tick % REISSUE_TICKS === 0) {
      const escorts = escortsIn(last);
      for (const [index, tender] of tendersIn(last).entries()) {
        // Advance along the route as each waypoint is reached, exactly as a
        // player clicking their way through the lock would.
        let at = leg.get(tender.id) ?? 0;
        while (
          at < ROUTE.length - 1 &&
          Math.hypot(tender.x - ROUTE[at]!.x, tender.y - ROUTE[at]!.y) < WAYPOINT_M
        ) {
          at++;
        }
        leg.set(tender.id, at);
        const heading = ROUTE[at]!;
        match.orderMove(PLAYER, tender.id, heading.x, heading.y);
        // The climb is ordered only on the last leg. Rising inside the lock
        // would put a hull against its 1,300 m roof, which is the one piece of
        // ground on this map that is above a hull rather than below it.
        if (options.climb && at === ROUTE.length - 1) {
          match.orderDepth(PLAYER, tender.id, CLIMB_TO_M);
        }
        // The refusal, observed directly. `holdsMovement` runs at order time
        // rather than only on the mission's own 5 Hz pass, because movement is
        // 60 Hz and a re-issued order would otherwise walk a held tender twelve
        // ticks before the next clamp caught it — so "held" has to mean the
        // order never lands, and this is where that is visible.
        if (
          hasComponent(match.world, MoveOrder, tender.id) &&
          MoveOrder.active[tender.id] === 0 &&
          match.tick < releaseTickOf(index)
        ) {
          refusedWhileHeld = true;
        }
        for (const [offset, station] of STATION.entries()) {
          const escort = escorts[index * STATION.length + offset];
          if (escort === undefined) continue;
          match.orderMove(PLAYER, escort.id, tender.x + station.x, tender.y + station.y);
          if (options.climb && at === ROUTE.length - 1) {
            match.orderDepth(PLAYER, escort.id, CLIMB_TO_M);
          }
        }
      }
    }

    const view = match.takeMissionView();
    if (view !== null) views.push(view);
    lines.push(...match.takeMissionLines());
    if (match.missionOver !== null) break;
  }

  assert.ok(last !== null, 'the mission produced no snapshot at all');
  return { match, views, last, lines, sampled, peakTenderSig, peakEscortSig, refusedWhileHeld };
}

/** The authored load time for the nth tender, in ticks. */
function releaseTickOf(index: number): number {
  const tenders = PROLOGUE_SORROWGATE.parties
    .find((party) => party.slot === PLAYER)!
    .units.filter((unit) => unit.role === 'tender');
  return tenders[index]?.releaseTick ?? 0;
}

// One drive per scenario, memoised: the run is the expensive part and the
// assertions below are free.
let passive: Run | null = null;
const passiveRun = (): Run =>
  (passive ??= drive({ ticks: SIM.TICK_HZ * 21 * 60, escort: false, climb: false }));

let escorted: Run | null = null;
const escortedRun = (): Run =>
  (escorted ??= drive({
    ticks: SIM.TICK_HZ * 21 * 60,
    escort: true,
    climb: true,
    sampleAtS: [600],
  }));

let unclimbed: Run | null = null;
const unclimbedRun = (): Run =>
  (unclimbed ??= drive({
    ticks: SIM.TICK_HZ * 15 * 60 + SIM.TICK_HZ * 30,
    escort: true,
    climb: false,
  }));

describe('the court adjourns, and reads the count it was left with', () => {
  it('closes at 20:00 with the gate shut when nobody is moved', () => {
    // §8's third row, and §9's last beat. Nothing in the mission is a timer in
    // the sense §10 forbids — the dome comes down because the colossus came
    // back through it — but the beat is what makes it happen at the minute the
    // document says, and this is the assertion that the beat is reached at all.
    const run = passiveRun();
    const over = run.match.missionOver;
    assert.ok(over !== null, 'the mission never resolved');
    assert.equal(over.outcome, MissionOutcome.Lost);
    assert.equal(run.match.tick, 20 * 60 * SIM.TICK_HZ, 'the court adjourns at 20:00');
    // §8, verbatim. The court's reading of a count, and not a score.
    assert.match(over.epilogue, /^The gate is closed\. Fourteen are behind it\./);
    const tenders = over.objectives.filter((objective) => objective.id.startsWith('tender'));
    assert.equal(tenders.length, 2);
    assert.ok(
      tenders.every((objective) => objective.status === ObjectiveStatus.Pending),
      'neither tender was moved, so neither reading is met'
    );
  });

  it('reads fourteen out when the flight escorts both loads up the climb', () => {
    // §8's first row, and the mission's single decision made the easy way: four
    // escorts split two and two, each pair holding station inside the 400 m the
    // freight needs to hear through. The count in the epilogue is the whole
    // outcome — §8 is explicit that this is where the game teaches that a
    // number it read out loud is the result.
    const run = escortedRun();
    const over = run.match.missionOver;
    assert.ok(over !== null, 'the escorted run never resolved');
    assert.equal(over.outcome, MissionOutcome.Complete, over.epilogue);
    assert.match(over.epilogue, /^Fourteen out\./);
    // And it closes early, because the court does not keep sitting once
    // everybody is out — before 20:00, which is the passive run's ending.
    assert.ok(
      run.match.tick < 20 * 60 * SIM.TICK_HZ,
      `the record closed at ${run.match.tick}, not before the adjournment`
    );
    assert.ok(
      over.objectives
        .filter((objective) => objective.id.startsWith('tender'))
        .every((objective) => objective.status === ObjectiveStatus.Met),
      'both readings are met when both tenders are on the Concourse'
    );
  });

  it('holds the reading rather than handing it out once', () => {
    // What `MatchRoom` re-sends to a player who was not there to hear it.
    //
    // `endMission` announces the court's reading to whoever is connected on the
    // tick it adjourns. A player inside the reconnection grace window at that
    // moment is not one of them — they dropped at 19:50, the mission closed at
    // 20:00 without them, and they come back to a phase of Ended with nothing
    // to show for twenty minutes of escorting. The room can only re-send it
    // because `Match` *keeps* it, and this is the assertion that it does.
    //
    // Worth its own test because the sibling channel is the opposite: the
    // mission view is drained on read (`takeMissionView`), and that drain is
    // exactly what left the orders panel empty on a reload until the room
    // learned to re-send it. A result that acquired the same behaviour would
    // break the same way, silently, in a window nobody plays through twice.
    const run = passiveRun();
    const first = run.match.missionOver;
    assert.ok(first !== null, 'the mission never resolved');
    const second = run.match.missionOver;
    assert.ok(second !== null, 'the reading was drained by being read');
    assert.equal(second.outcome, first.outcome);
    assert.equal(second.epilogue, first.epilogue);
    assert.deepEqual(second.objectives, first.objectives);
  });
});

describe('a tender does not move until it is loaded', () => {
  it('refuses the order while the hull is held, whatever the player clicks', () => {
    // §9: Tender One is loaded at 11:20 and Tender Two at 13:40. Before then
    // the freight is not freight yet, and the mission holds it — the escorted
    // run orders both of them to the Concourse from tick zero and every one of
    // those orders is refused. `Match.orderMove` records the command and then
    // declines to apply it, which is the same shape the ability locks have: the
    // server says no, and the panel has already said why.
    const run = escortedRun();
    assert.ok(run.refusedWhileHeld, 'no order to a held tender was ever refused');

    const held = run.sampled.get(600);
    assert.ok(held !== undefined, 'no snapshot at t=600s, ten minutes in');
    assert.ok(
      held.tick < releaseTickOf(0),
      'the sample has to land before the first load, or it proves nothing'
    );
    const authored = PROLOGUE_SORROWGATE.parties
      .find((party) => party.slot === PLAYER)!
      .units.filter((unit) => unit.role === 'tender');
    for (const tender of tendersIn(held)) {
      const nearest = Math.min(
        ...authored.map((unit) => Math.hypot(tender.x - unit.x, tender.y - unit.y))
      );
      // Not "has not moved at all": the flight closing onto station shoves the
      // freight a little, because separation writes positions whether or not
      // anything was ordered. What is being asserted is that ten minutes of
      // orders to a point 2,500 m north bought no ground at all — the tender is
      // still in the chamber, beside where the court parked it.
      assert.ok(
        nearest < 250,
        `a held tender drifted ${nearest.toFixed(0)}m from the chamber it was parked in`
      );
      assert.ok(tender.y > 2500, 'and it is still south of the service lock');
    }
  });

  it('stops the climb too when the flight leaves, not only the run', () => {
    // §8's rule is that a tender moves only while an escort is in range, and
    // §9 gives 16:00–19:00 to "the run north *and the climb*". The climb is
    // 1,150 m of the way out, so a hold enforced on the horizontal alone is the
    // rule enforced on a minority of the journey.
    //
    // `Match.orderDepth` refuses the order while a tender is held; this is the
    // other half — an order that was legal when it was given, on a tender the
    // flight has since flown away from. Before the fix the tender rose the full
    // distance with no ears while frozen horizontally: stopped dead, and
    // ascending.
    const match = missionMatch();
    let own: EchoSnapshot | null = null;
    // Past the second release at 13:40, so both tenders are free to move.
    const CLOSE_AT = SIM.TICK_HZ * (13 * 60 + 45);
    // Time for the flight to actually reach the tender. `orderDepth` refuses
    // the climb outright while nothing is in range — which is the *other* half
    // of this rule, already covered — so the order has to be legal when given
    // or this test would pass for the wrong reason.
    const ORDER_AT = CLOSE_AT + SIM.TICK_HZ * 40;
    const ABANDON_AT = ORDER_AT + SIM.TICK_HZ * 15;
    let depthWhenAbandoned = 0;
    let tenderId = 0;
    let ordered = false;

    for (let tick = 0; tick < SIM.TICK_HZ * 16 * 60; tick++) {
      const next = match.update(STEP_MS)?.get(PLAYER);
      if (next !== undefined) own = next;
      if (own === null) continue;

      if (tick === CLOSE_AT) {
        const tender = tendersIn(own)[0];
        assert.ok(tender !== undefined, 'a tender survived to be escorted');
        tenderId = tender.id;
      }
      // Hold the flight on station until the moment it is sent away.
      if (tick >= CLOSE_AT && tick < ABANDON_AT && tick % REISSUE_TICKS === 0) {
        const tender = own.units.find((unit) => unit.id === tenderId);
        if (tender !== undefined) {
          for (const [offset, station] of STATION.entries()) {
            const escort = escortsIn(own)[offset];
            if (escort === undefined) continue;
            match.orderMove(PLAYER, escort.id, tender.x + station.x, tender.y + station.y);
          }
        }
      }
      if (tick === ORDER_AT) ordered = match.orderDepth(PLAYER, tenderId, CLIMB_TO_M);
      if (tick === ABANDON_AT) {
        const rising = own.units.find((unit) => unit.id === tenderId);
        assert.ok(rising !== undefined, 'the tender is still there');
        depthWhenAbandoned = rising.depth;
        for (const escort of escortsIn(own)) match.orderMove(PLAYER, escort.id, 4500, 3500);
      }
    }
    assert.ok(ordered, 'the climb was refused outright, so the continuous half is untested');

    const abandoned = own?.units.find((unit) => unit.id === tenderId);
    assert.ok(abandoned !== undefined, 'the tender is still in the water at the end');
    assert.ok(
      depthWhenAbandoned < 1470,
      `the tender never started climbing (${depthWhenAbandoned} m), so the hold is untested`
    );
    // It may still drift a little on the tick the escorts cross the radius;
    // what it must not do is complete the ascent unescorted.
    assert.ok(
      abandoned.depth > depthWhenAbandoned - 120,
      `the tender climbed from ${Math.round(depthWhenAbandoned)} m to ` +
        `${Math.round(abandoned.depth)} m with no escort in range`
    );
  });
});

describe('the run north is a climb', () => {
  it('stalls the freight below the Concourse when the ascent is never ordered', () => {
    // §9's "the run north and the climb" is two instructions and not one, and
    // this is the half a player can skip.
    //
    // The ground does some of the climbing for them, and deliberately: a hull
    // pressed against shallower water is lifted until it fits, so a plateau
    // costs a fleet time and a detour rather than stopping it dead
    // (`systems/movement.ts`). That carries the freight up the Descent's 900 m
    // step in the end. What it cannot do is put a hull on the Concourse: the
    // lift fits a hull to the water it is *in*, and `resolveStep` refuses the
    // step onto a 340 m floor before there is anything to fit it to. So the
    // freight ends the run pressed against the terminus it was sent to, at a
    // depth that cannot enter it.
    //
    // This is the mission's floor working in the other direction from §3's: the
    // basin below cannot be entered because the hulls are not rated for it, and
    // the concourse above cannot be reached without choosing to rise.
    const run = unclimbedRun();
    assert.equal(run.match.missionOver, null, 'nothing should have resolved by 15:30');

    // The *played* ground, not the authored map. Terrain is writable now
    // (#197) and the arch closed at 10:40, so a terrain rebuilt from the
    // literal disagrees with the one the freight is pressed against.
    const terrain = run.match.world.terrain;
    const tenders = tendersIn(run.last);
    assert.equal(tenders.length, 2, 'both tenders are still in the water');
    for (const tender of tenders) {
      assert.ok(
        tender.y > CONCOURSE.y,
        `a tender reached ${tender.y.toFixed(0)} without ever being told to climb`
      );
      assert.ok(
        !terrain.admits(tender.x, CONCOURSE.y, tender.depth),
        `the tender at ${tender.x.toFixed(0)},${tender.y.toFixed(0)} sits at ${tender.depth}m, ` +
          'which the Concourse admits — it could have finished the run without ever climbing, ' +
          'and this test is then measuring the wrong thing'
      );
    }

    // And the reading the player is shown says so: nobody is on the Concourse.
    const last = run.views[run.views.length - 1]!;
    for (const objective of last.objectives) {
      if (objective.progress === undefined) continue;
      assert.equal(
        objective.progress.done,
        0,
        `${objective.id} counted a tender that never got up`
      );
    }
  });
});

describe('the silence ledger binds the flight and not the tenders', () => {
  it('runs the freight far over the ceiling without the flight owing a second', () => {
    // §4, stated flatly: "The order binds the flight and not the tenders. The
    // order is a condition of admission, and the court cannot admit itself."
    // The tenders are Harvesters — 18 idle, 40 under way, the Harvester's own
    // cruise figure — so from 11:20 onward the loudest thing the player owns is
    // twice the ceiling and stays there for minutes.
    //
    // If the ledger measured the whole force it would run up its 60 s cap
    // almost immediately and withdraw the array for a rule nobody broke. It
    // measures the escorts, so the flight owes nothing, and this run is the
    // proof: the freight is loud, the flight is quiet, and the debt is zero on
    // every view the room would have sent.
    const run = escortedRun();
    const ceiling = PROLOGUE_SORROWGATE.silenceCeilingSig;
    assert.ok(
      run.peakTenderSig > ceiling,
      `the tenders never exceeded the ceiling (${run.peakTenderSig}), so this proves nothing`
    );
    assert.ok(
      run.peakEscortSig <= ceiling,
      `the flight itself broke the order (${run.peakEscortSig}), so the debt would be honest`
    );
    for (const view of run.views) {
      assert.equal(
        view.debtS,
        0,
        `debt ${view.debtS}s at tick ${view.tick} for the court's freight`
      );
    }
    // The court's other reading of the same rule never appears either. §12
    // authors two readings of one objective and marks the second *while in
    // debt*; a flight that never owes a silence is never told it does.
    const inDebt = PROLOGUE_SORROWGATE.objectives.find(
      (objective) => objective.debtText !== undefined
    );
    assert.ok(inDebt !== undefined, '§12 authors a debt reading, and it should still exist');
    for (const view of run.views) {
      for (const objective of view.objectives) {
        assert.notEqual(
          objective.text,
          inDebt.debtText,
          'the court asked for a silence it is owed'
        );
      }
    }
  });

  it("measures the ceiling against hulls, not against the court's own array", () => {
    // A regression test, and it is here because it went red first.
    //
    // §4 makes the order "a ceiling of SIG 20 **per hull**", and §12 gives the
    // court's reading of it as "The flight stays under twenty." The flight
    // idles at SIG 6 and cruises at 12, so from the first tick the hulls the
    // order binds are compliant and the court should say so.
    //
    // The `quiet` predicate used to read `own.peakSig`, which `Match` computes
    // across the player's units *and structures* — and the loudest thing on
    // that list is the court's own array, a Cantor at SIG 35 that the flight is
    // lent and that no clause of §4 binds. The reading therefore sat at "open"
    // through a faultless first ten minutes and turned "met" at 10:40,
    // announced by the panel's live region, at the instant the colossus
    // destroyed the array. Nothing the player did moved it either way, which is
    // the worst shape a status can have: it looks like feedback.
    //
    // The predicate now names the role it measures and shares `peakSigOf` with
    // the ledger, so the number the court enforces and the number it reads out
    // are one number. This test is what stops them separating again.
    //
    // The silence order is a *standing* predicate, so unlike every other
    // objective it is re-derived rather than latched (`isStanding`) — which is
    // what lets this assert the whole run rather than only the first view. A
    // passive flight never leaves the arch and never exceeds SIG 12, so the
    // court should say "met" on every view it sends and never once take it
    // back.
    const run = passiveRun();
    assert.ok(run.views.length > 1, 'the run sent more than one view');
    for (const view of run.views) {
      const silence = view.objectives.find((objective) => objective.id === 'silence');
      assert.ok(silence !== undefined, `tick ${view.tick}: the silence order stopped being stated`);
      assert.equal(
        silence.status,
        ObjectiveStatus.Met,
        `tick ${view.tick}: a flight idling at SIG 6 under a ceiling of 20 is compliant`
      );
    }
  });

  it('takes the reading back while the flight is in breach', () => {
    // The other side of `isStanding`, and the defect it was written for.
    //
    // Statuses are monotone everywhere else, on purpose: reaching the Concourse
    // is a thing that happened. A silence order is not — it is in force or it
    // is not. Latched, it went Met on the first tick (a flight idling at SIG 6
    // is trivially under 20) and stayed Met through every breach, so the panel
    // read the word "met" beside the court's own sentence "The flight owes the
    // court a silence", while the array was being withdrawn over that breach.
    // Keyed on the breach itself — the flight actually over the ceiling — and
    // not on `debtS`, which stays positive through the repayment that follows.
    // A flight that has come back under the ceiling and is working the debt off
    // is complying, and "met" is the honest reading of it; the defect is the
    // reading while the hulls are loud.
    const match = missionMatch();
    const ceiling = PROLOGUE_SORROWGATE.silenceCeilingSig;
    let own: EchoSnapshot | null = null;
    let status = ObjectiveStatus.Pending;
    let metWhileQuiet = false;
    let openWhileLoud = false;
    let metWhileLoud = false;
    for (let tick = 0; tick < SIM.TICK_HZ * 25; tick++) {
      const next = match.update(STEP_MS)?.get(PLAYER);
      if (next !== undefined) own = next;
      if (tick === SIM.TICK_HZ * 10 && own !== null) {
        for (const unit of escortsIn(own)) match.orderDepth(PLAYER, unit.id, 1700);
      }
      const view = match.takeMissionView();
      const silence = view?.objectives.find((objective) => objective.id === 'silence');
      if (silence !== undefined) status = silence.status;
      if (own === null || own.tick !== match.world.tick) continue;
      const peak = Math.max(0, ...escortsIn(own).map((unit) => unit.sig));
      const met = status === ObjectiveStatus.Met;
      if (peak > ceiling) {
        if (met) metWhileLoud = true;
        else openWhileLoud = true;
      } else if (met) metWhileQuiet = true;
    }
    assert.ok(metWhileQuiet, 'the court never read the order as met, so this proves nothing');
    assert.ok(openWhileLoud, 'the flight was never loud, or the court never noticed');
    assert.ok(!metWhileLoud, 'the court read "met" while the flight was over the ceiling it set');
  });

  it('withdraws the array without the array changing hands', () => {
    // §4's withdrawal, and the shape of the write that performs it.
    //
    // It used to be `Owner.slot`, which is three things at once: the aura grant
    // key, the Echo Layer's friend/foe test, and the filter that sorts a hull
    // into your own force or into your contact list. So the moment the flight
    // went over the ceiling, the Cantor the player was standing on dropped out
    // of `own.structures` and reappeared in the same payload as a Tier-4
    // *foreign* structure at chamber centre, carrying hp and a faction, while
    // the SIG meter jumped 35 → 72 → 18 for a reason the player had not caused.
    // Both of the mission's teaching instruments lying, at the moment it is
    // teaching, in response to a breach the mission is designed to provoke.
    //
    // Both halves are asserted, because fixing the visible half by simply not
    // withdrawing anything would pass a weaker test: the grant must still go.
    const match = new Match(missionMapById(PROLOGUE_SORROWGATE.mapId)!, {
      mission: PROLOGUE_SORROWGATE,
      fauna: false,
      seed: SEED,
    });
    let own: EchoSnapshot | null = null;
    const hydWhileQuiet: number[] = [];
    const hydWhileOwing: number[] = [];
    let debtS = 0;
    // How many mission ticks the debt has been owed for without a break. The
    // aura is rewritten by `aurasSystem`, which runs earlier in the same step
    // than the mission pass that records the debt, so the withdrawal lands one
    // Echo tick after the breach. That lag is 0.2 s and inherent to the order
    // of the step; sampling from the second tick onward asserts the withdrawal
    // without asserting a tick ordering the ledger does not control.
    let owedFor = 0;
    let sawDebt = false;
    for (let tick = 0; tick < SIM.TICK_HZ * 25; tick++) {
      const next = match.update(STEP_MS)?.get(PLAYER);
      if (next !== undefined) own = next;
      // Ten seconds in, dive the flight: SIG 72 against a ceiling of 20.
      if (tick === SIM.TICK_HZ * 10 && own !== null) {
        for (const unit of own.units) {
          if (unit.kind === UnitKind.LightScout) match.orderDepth(PLAYER, unit.id, 1700);
        }
      }
      const view = match.takeMissionView();
      if (view !== null) debtS = view.debtS;
      if (own === null || own.tick !== match.world.tick) continue;
      owedFor = debtS > 0 ? owedFor + 1 : 0;
      sawDebt ||= debtS > 0;

      assert.equal(
        own.structures.length,
        1,
        `tick ${own.tick}: the court's array left the player's own force`
      );
      for (const contact of own.contacts) {
        assert.equal(
          contact.structure,
          undefined,
          `tick ${own.tick}: the player's own array came back as a contact`
        );
      }
      const escorts = own.units.filter((unit) => unit.kind === UnitKind.LightScout);
      const hyd = Math.max(...escorts.map((unit) => Acoustic.hyd[unit.id]!));
      if (owedFor > 1) hydWhileOwing.push(hyd);
      else if (debtS === 0 && own.tick < SIM.TICK_HZ * 9) hydWhileQuiet.push(hyd);
    }

    assert.ok(sawDebt, 'the flight never ran up a debt, so the withdrawal was never exercised');
    assert.ok(hydWhileOwing.length > 0, 'the debt never lasted long enough to observe');
    assert.ok(
      hydWhileQuiet.every((hyd) => hyd > 70),
      `the grant was never in force: HYD ${[...new Set(hydWhileQuiet)].join(', ')}`
    );
    assert.ok(
      hydWhileOwing.every((hyd) => hyd <= 70),
      `the array was still listening for a flight that owes a silence: ` +
        `HYD ${[...new Set(hydWhileOwing)].join(', ')}`
    );
  });
});

describe('a mission is not a fight somebody wins', () => {
  it('never names a winner, whatever the count was', () => {
    // `resolveVictory` needs two rosters standing and a mission seats one, so
    // the two-roster rule is untouched and simply stops being the only way a
    // match can end. Folding an evacuation into a payload whose only field is
    // `winnerSlot` would make both client consumers — which derive win and loss
    // from slot equality — say something untrue about "nine are out".
    const run = passiveRun();
    assert.ok(run.match.missionOver !== null, 'the mission resolved');
    assert.equal(run.match.result, null, 'a mission has no winner to name');
  });

  it('leaves a skirmish with no mission to be over', () => {
    // The other direction, and the regression guard on installing a runtime in
    // the constructor: an ordinary match must carry none of this. No mission,
    // no view to send, no resolution — and the victory rule still the only way
    // it can end.
    const match = new Match(undefined, { fauna: false, seed: SEED });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);
    for (let tick = 0; tick < SIM.TICK_HZ * 5; tick++) match.update(STEP_MS);
    assert.equal(match.missionOver, null);
    assert.equal(match.takeMissionView(), null);
    assert.deepEqual(match.takeMissionLines(), []);
    assert.equal(match.worstMissionMsCost, 0, 'a skirmish spends nothing on a mission pass');
  });
});

describe('the four voices in the water', () => {
  it('arrive at the minutes §12 gives, each in its own register', () => {
    // docs/culture.md §6's register test, made mechanical: "take any line and
    // ask which faction could not have said it" — §12 answers that each of
    // the four fails §3 for the other three. The mix keys a hail on the
    // register (docs/audio-direction.md §13), so four voices that resolved to
    // one would be the failure #381 names — a channel whose speakers sound
    // like one narrator — and this is where that would show. Sorrowgate's
    // player is the court's flight rather than a faction's fleet, so every
    // voice here is authored; the assertion is that the union, the literal
    // and the runtime's default agree on four different answers.
    //
    // Filtered to the water since #726, because the court now speaks in the
    // opening window as well and it is not one of the four — §12 keeps the
    // two lists apart and so does this. The filter is on the register rather
    // than on the minute, so a fifth voice arriving in the water at 03:00
    // would fail here rather than be quietly counted as the court's.
    const run = passiveRun();
    const spoken = run.lines.map((line) => ({
      atS: Math.round(line.tick / SIM.TICK_HZ),
      speaker: line.speaker,
      voice: line.voice,
      speakerId: line.speakerId,
    }));
    const inWater = spoken.filter((line) => line.voice !== 'court');
    // Four registers, and since #403 four speakers: Kalliso and Teel are
    // signed, and Drenn and Sende — who have no entry in docs/characters.md —
    // are the grid and those below, which is the register's plain hail.
    assert.deepEqual(inWater, [
      { atS: 6 * 60 + 20, speaker: 'Voice Ren Kalliso', voice: 'order', speakerId: 'kalliso' },
      { atS: 9 * 60, speaker: 'Underwriter Sela Drenn', voice: 'concern', speakerId: 'the-grid' },
      { atS: 9 * 60 + 20, speaker: 'Sende', voice: 'cohorts', speakerId: 'those-below' },
      { atS: 10 * 60 + 40, speaker: 'Warden Juno Teel', voice: 'plateaus', speakerId: 'teel' },
    ]);
    assert.equal(new Set(inWater.map((line) => line.voice)).size, 4, 'four voices, four registers');
  });
});

describe('the court, in the opening window', () => {
  it('reads four lines into the record between 00:20 and 02:40', () => {
    // §9's guidance beats and §12's authored text for them. The window is
    // §10's first lesson — a ceiling, a meter and a flight — and #720 is the
    // report that a player handed a meter does not work out that it is theirs.
    //
    // The minutes are the assertion, because a guidance line is only guidance
    // while the thing it is about is still in front of the player: all four
    // land inside the empty approach, before the delegations take station at
    // 04:00 and give the player something else to look at.
    const run = passiveRun();
    const court = run.lines
      .filter((line) => line.voice === 'court')
      .map((line) => ({
        atS: Math.round(line.tick / SIM.TICK_HZ),
        speaker: line.speaker,
        voice: line.voice,
        speakerId: line.speakerId,
      }));
    const halloran = {
      speaker: 'Arbiter Mosk Halloran',
      voice: 'court' as const,
      speakerId: 'halloran' as const,
    };
    assert.deepEqual(court, [
      { atS: 20, ...halloran },
      { atS: 60, ...halloran },
      { atS: 110, ...halloran },
      { atS: 160, ...halloran },
    ]);
  });

  it('binds every figure the window says aloud to the constant it comes from', () => {
    // §12's claim: six and twelve are the Light Scout's own figures, twenty is
    // §4's ceiling, the minute is the debt cap and the flight is four hulls.
    //
    // **Three earlier versions of this test each asserted less than its name.**
    // The first matched the three words the authored text hard-codes — true by
    // construction. The second derived the values from the constants but matched
    // them against all four lines joined into one string, so authoring 01:50
    // backwards stayed green. The third still joined, and left "entered at six"
    // and the cap bound to nothing, so "entered at nine" and "stops counting at
    // five minutes" both passed. The shape was the fault rather than any of the
    // three patches: a claim about a sentence has to be matched against *that
    // sentence*, and every figure the window speaks has to come from the
    // constant it is the figure for. Hence lookup by tick, and no joined string
    // anywhere below.
    const scout = UNIT_STATS[UnitKind.LightScout];
    const flight = PROLOGUE_SORROWGATE.parties
      .find((party) => party.slot === PROLOGUE_SORROWGATE.playerSlot)!
      .units.filter((unit) => unit.kind === UnitKind.LightScout).length;
    const spell = new Map([
      [4, 'Four'],
      [6, 'six'],
      [12, 'twelve'],
      [20, 'twenty'],
      [60, 'a minute'],
    ]);
    const word = (value: number) => {
      const spelled = spell.get(value);
      assert.ok(spelled !== undefined, `the court has no word for ${value} — the literal moved`);
      return spelled;
    };
    const court = passiveRun().lines.filter((line) => line.voice === 'court');
    const at = (second: number) => {
      const line = court.find((spoken) => Math.round(spoken.tick / SIM.TICK_HZ) === second);
      assert.ok(line !== undefined, `the court says nothing at ${second}s`);
      return line.text;
    };

    // **Nothing numeric is left over.** The clause matches below say the
    // figures that must be there; on their own they say nothing about a figure
    // the court speaks that comes from nowhere. Round 5 held that with a
    // whitelist of number-words, and a whitelist is open by construction: "for
    // a second **and a half** afterwards" and "a hull descending reads
    // **fifteen**" both went straight through it.
    //
    // So the check is inverted. Every clause of every line that carries a
    // numeral is accounted for below — struck out of the text, each one bound
    // to the constant it comes from — and whatever survives is then held to
    // carry no figure at all.
    //
    // **Two checks, and only one of them is total, which is worth stating
    // rather than implying.** Digits are closed absolutely: no line and no
    // accounted clause contains one, so the remainder may contain no digit
    // anywhere, in any form. An earlier version put the digit branch inside
    // the word alternation's word boundary, which let every digit touching a
    // letter through — "reaches 400m", "falls 20dB" and "SIG20" all passed.
    // Spelled numbers are a named lexicon and so are open by construction;
    // `score` is in it because it spells this mission's own ceiling. A word
    // nobody listed can still escape, and that is the honest limit of this
    // half rather than something the comment above should paper over.
    const NUMERALS =
      /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|half|quarter|third|once|twice|thrice|dozen|pair|first|fourth|fifth|sixth|seventh|eighth|ninth|tenth|second|seconds|minute|minutes|hour|hours|score)\b/gi;
    const accounted: ReadonlyArray<readonly [number, readonly string[]]> = [
      // 00:20 — the flight, numbered from one to the roster's size.
      [20, [`Escort One through ${word(flight)}`]],
      // 01:00 — the idle figure and the ceiling, each entered into the record.
      [
        60,
        [
          `entered at ${word(scout.sigIdle)} when`,
          `the ceiling at ${word(PROLOGUE_SORROWGATE.silenceCeilingSig)}`,
        ],
      ],
      // 01:50 — the two states, and one clause carrying no simulation figure:
      // "twice" counts the court's own explanations, and is struck here rather
      // than quietly omitted from the lexicon.
      [
        110,
        [
          `standing in this water reads ${word(scout.sigIdle)}`,
          `under way reads ${word(scout.sigCruise)}`,
          'has never yet had to explain it twice',
        ],
      ],
      // 02:40 — the ceiling, the ledger's one-for-one rate (+/-TICK_DT_S in
      // `applySilenceLedger`), the whole flight rather than the offending hull,
      // and the cap.
      [
        160,
        [
          `above ${word(PROLOGUE_SORROWGATE.silenceCeilingSig)} is shoving`,
          'for every second it shoves',
          `withdrawn from all ${word(flight).toLowerCase()} hulls`,
          'for a second afterwards',
          `stops counting at ${word(PROLOGUE_SORROWGATE.debtCapS)}`,
        ],
      ],
    ];
    for (const [second, clauses] of accounted) {
      let remainder = at(second);
      for (const clause of clauses) {
        assert.ok(
          remainder.includes(clause),
          `the line at ${second}s no longer carries "${clause}"`
        );
        remainder = remainder.replace(clause, ' ');
      }
      // Digits: closed, and unconditional.
      assert.ok(
        !/\d/.test(remainder),
        `the line at ${second}s speaks a digit no constant accounts for: "${remainder.trim()}"`
      );
      const loose = remainder.match(NUMERALS) ?? [];
      assert.deepEqual(
        loose,
        [],
        `the line at ${second}s speaks ${loose.join(', ')}, which no constant accounts for`
      );
    }

    // 00:20 — the flight, counted, against the roster the party actually seats.
    assert.match(
      at(20),
      new RegExp(`Escort One through ${word(flight)} are admitted`),
      'the court names a flight of a different size from the one it was given'
    );

    // 01:00 — the two numbers entered into the record.
    assert.match(
      at(60),
      new RegExp(`entered at ${word(scout.sigIdle)} when`),
      'the count is not the hull\u2019s own idle figure'
    );
    assert.match(
      at(60),
      new RegExp(`the ceiling at ${word(PROLOGUE_SORROWGATE.silenceCeilingSig)}`),
      'the count is not the ceiling the ledger enforces'
    );

    // 01:50 — each figure against the state it is the figure for. This is the
    // pairing, and inverting it is the mutation that has to fail.
    assert.match(
      at(110),
      new RegExp(`standing in this water reads ${word(scout.sigIdle)}`),
      'the idle figure is no longer read against standing still'
    );
    assert.match(
      at(110),
      new RegExp(`under way reads ${word(scout.sigCruise)}`),
      'the cruise figure is no longer read against being under way'
    );

    // 02:40 — the ceiling, whose array is withdrawn, and the cap.
    assert.match(
      at(160),
      new RegExp(`above ${word(PROLOGUE_SORROWGATE.silenceCeilingSig)} is shoving`),
      'the breach is not stated against the ceiling'
    );
    assert.match(
      at(160),
      new RegExp(`withdrawn from all ${word(flight).toLowerCase()} hulls`),
      '\u00a74 clause 3 withdraws the array from the party, not from the offending hull'
    );
    assert.match(
      at(160),
      new RegExp(`stops counting at ${word(PROLOGUE_SORROWGATE.debtCapS)}`),
      'the cap the court reads aloud is not debtCapS'
    );
  });

  it('is true of the flight at both ends of the difference it describes', () => {
    // The 01:50 line is the window's whole lesson — "standing reads six, under
    // way reads twelve" — and it is the one claim here a drive can falsify.
    // Both legs, off runs this file already pays for: the passive run never
    // orders the flight anywhere, and the escorted run moves it for minutes.
    const scout = UNIT_STATS[UnitKind.LightScout];
    assert.equal(
      passiveRun().peakEscortSig,
      scout.sigIdle,
      'a flight nobody ordered anywhere was not at its idle figure'
    );
    assert.equal(
      escortedRun().peakEscortSig,
      scout.sigCruise,
      'a flight under way for minutes never reached its cruise figure'
    );
    // And the court's ceiling is above both, which is what §9 records the
    // beats as stopping short of: nothing the flight does while moving
    // reaches twenty.
    assert.ok(scout.sigCruise < PROLOGUE_SORROWGATE.silenceCeilingSig);
  });

  it('is §12’s text, and not a paraphrase of it', () => {
    // Criterion 1: "the literal transcribes the doc, not the other way round."
    // Every round of this change has spent its effort on the numbers inside the
    // lines while the stronger and cheaper property — that the lines *are* the
    // document's — was held by nothing at all. A later edit to either side is
    // exactly how doc-first quietly inverts, and no gate would say a word.
    //
    // Reading the doc from a test is an idiom this suite already has
    // (`missionSafety.test.ts` does it with `readFileSync`). The four block
    // quotes under §12's "The court, in the opening window" are pulled in
    // order and held to the four court beats' `text`, character for character.
    const doc = readFileSync(
      new URL('../../../docs/mission-sorrowgate.md', import.meta.url),
      'utf8'
    );
    // Bounded at the next `##`, so a blockquote in §13 cannot drift in.
    const section = doc.split('### The court, in the opening window')[2]?.split('\n## ')[0];
    assert.ok(section !== undefined, '§12 no longer has the subsection this reads');
    // Each authored line is one blockquote: consecutive `> ` lines, unwrapped.
    const quoted = [...section.matchAll(/(?:^> .*\n)+/gm)].map((match) =>
      match[0]
        .split('\n')
        .filter((line) => line.startsWith('> '))
        .map((line) => line.slice(2).trim())
        .join(' ')
    );
    const authored = PROLOGUE_SORROWGATE.beats
      .filter((beat) => beat.kind === 'say' && beat.voice === 'court')
      .map((beat) => (beat as { text: string }).text);
    assert.equal(authored.length, 4, 'the literal no longer carries four court lines');
    // No slice: a fifth line authored in §12 with no beat behind it is the
    // drift the doc-first rule makes *likely*, and slicing to the literal's
    // length is precisely the blindness that would hide it.
    assert.deepEqual(
      quoted,
      authored,
      '§12 and the literal have drifted — the doc is the source, so the literal is wrong'
    );
  });

  it('is not a gate — stripping all four changes nothing but the log', () => {
    // §9: "Guidance that can be failed is a tutorial, and this is not one",
    // and the issue's seventh criterion. Asserting that the beats are `say`
    // would only restate the literal; this drives the mission twice, once
    // against a derivative with every court line removed, and holds the two
    // resolutions to each other.
    //
    // Both sides here are *passive* runs, so what this holds is that guidance
    // has no simulation effect. The other half of the criterion — that a
    // player who ignores every line can still **finish** — is held by "reads
    // fourteen out when the flight escorts both loads up the climb" above,
    // which completes with all four lines present and obeys none of them. If any objective, the outcome, the minute it
    // closed on or the epilogue moved, guidance would be load-bearing.
    const stripped = {
      ...PROLOGUE_SORROWGATE,
      beats: PROLOGUE_SORROWGATE.beats.filter(
        (beat) => !(beat.kind === 'say' && beat.voice === 'court')
      ),
    };
    assert.equal(
      PROLOGUE_SORROWGATE.beats.length - stripped.beats.length,
      4,
      'the derivative did not remove the four lines it exists to remove'
    );
    const map = missionMapById(PROLOGUE_SORROWGATE.mapId)!;
    const match = new Match(map, { mission: stripped, fauna: false, seed: SEED });
    let spoke = 0;
    for (let tick = 0; tick < SIM.TICK_HZ * 21 * 60; tick++) {
      match.update(STEP_MS);
      spoke += match.takeMissionLines().length;
      if (match.missionOver !== null) break;
    }
    const over = match.missionOver;
    const withGuidance = passiveRun().match.missionOver;
    assert.ok(over !== null && withGuidance !== null, 'a run did not resolve');
    assert.equal(spoke, 4, 'the four in the water are all that is left to say');
    assert.equal(over.outcome, withGuidance.outcome);
    assert.equal(match.tick, passiveRun().match.tick, 'the court adjourned on a different tick');
    assert.equal(over.epilogue, withGuidance.epilogue);
    assert.deepEqual(
      over.objectives.map((objective) => [objective.id, objective.status]),
      withGuidance.objectives.map((objective) => [objective.id, objective.status])
    );
  });
});

describe('the mission view is sent on change', () => {
  it('says nothing for twenty minutes rather than six thousand times', () => {
    // The view is rebuilt on every Echo tick and handed on only when it
    // differs from the last one drained. A twenty-minute mission resolves the
    // Echo Layer six thousand times and the panel changes perhaps a dozen: the
    // statuses, the two reveals, and the debt in whole seconds. Sending it
    // unconditionally would be a message every 200 ms to say nothing, which is
    // the same mistake `GameClient` avoids on the lobby schema.
    //
    // A bound rather than an exact count, deliberately: the exact number is a
    // property of this mission's beats and would be rewritten by any edit to
    // them, while the property worth defending — that this is a handful and not
    // a stream — survives every such edit.
    const run = passiveRun();
    const echoTicks = Math.floor(run.match.tick / Math.round(SIM.TICK_HZ / SIM.ECHO_HZ));
    assert.ok(run.views.length > 0, 'the panel was never given anything at all');
    assert.ok(
      run.views.length < 30,
      `${run.views.length} views over ${echoTicks} Echo ticks — the change filter is not filtering`
    );
    // Each one is genuinely different from the one before it, tick aside.
    for (let i = 1; i < run.views.length; i++) {
      assert.notDeepEqual(
        { ...run.views[i]!, tick: 0 },
        { ...run.views[i - 1]!, tick: 0 },
        'two consecutive views said the same thing'
      );
    }
  });

  it('reveals an objective only once the beat that hands it over has fired', () => {
    // §9: Tender One is loaded at 11:20 and Tender Two at 13:40. An objective
    // the player has not been given is an absence rather than a status, so the
    // court says nothing about Tender Two until there is something to say.
    const run = passiveRun();
    for (const objective of PROLOGUE_SORROWGATE.objectives) {
      if (objective.revealAtTick === undefined) continue;
      for (const view of run.views) {
        if (view.tick >= objective.revealAtTick) continue;
        assert.ok(
          view.objectives.every((shown) => shown.id !== objective.id),
          `"${objective.id}" was shown at tick ${view.tick}, before ${objective.revealAtTick}`
        );
      }
    }
    const last = run.views[run.views.length - 1]!;
    assert.equal(
      last.objectives.length,
      PROLOGUE_SORROWGATE.objectives.length,
      'by the close every reading has been handed over'
    );
  });
});

describe('a mission replays', () => {
  it('reproduces its own beats with no divergence', () => {
    // The load-bearing claim of the whole design, and the reason the runtime
    // is ticked from inside `Match.step()` rather than from the room: playback
    // drives `stepOnce`, so a mission installed by the constructor and beats
    // keyed on `world.tick` are reproduced with no new command types and no
    // new hash inputs. Driven room-side this would replay as an empty map —
    // which is exactly the failure the comment above ECHO_TICK_INTERVAL
    // records for the Echo pass itself.
    //
    // Run long enough to cross the two beats that mutate the world hardest:
    // Drenn's ping at 09:00 (SIG 95, a Tier-4 reveal, the player lit) and the
    // transit at 10:40, which destroys the court's array.
    const match = new Match(missionMapById(PROLOGUE_SORROWGATE.mapId)!, {
      mission: PROLOGUE_SORROWGATE,
      fauna: false,
      seed: 21,
      record: true,
    });
    for (let tick = 0; tick < SIM.TICK_HZ * 660; tick++) match.update(STEP_MS);

    const replay = match.replay();
    assert.ok(replay !== null, 'the match recorded');
    assert.equal(replay.version, REPLAY_FORMAT_VERSION);
    assert.equal(replay.missionId, PROLOGUE_SORROWGATE.id, 'the mission id is the setup');
    // A mission seats itself in the constructor, so the recorder never wrote a
    // roster for one. An empty `players` array here is correct, not a bug —
    // and `playReplay`'s seating loop is simply empty.
    assert.equal(replay.players.length, 0);
    assert.ok(replay.checkpoints.length > 0, 'something was checkpointed');

    const result = playReplay(replay);
    assert.equal(
      result.divergedAtTick,
      null,
      `a mission replay diverged at tick ${String(result.divergedAtTick)}`
    );
  });
});

describe('the Knight nobody invited stays unresolved', () => {
  it('never climbs past a tier that names her', () => {
    // The mission's third teaching beat (docs/mission-sorrowgate.md §10) and
    // the whole motive for the ping (§6): a contact the flight cannot grade.
    // It is fragile in a way prose cannot protect — she is positioned against
    // a measured detection curve, and a hundred metres the wrong way turns her
    // into a classified hostile parked off the bow. She was exactly that once:
    // an authored "flicker" ordered her to the arch, where she sat at Tier 4
    // for the rest of the mission while the doc promised a contact that would
    // not resolve.
    //
    // Faction is earned at Tier 3, so "never named" is the assertion: any
    // sample carrying a faction is a sample where the flight graded her.
    const match = new Match(missionMapById(PROLOGUE_SORROWGATE.mapId)!, {
      mission: PROLOGUE_SORROWGATE,
      fauna: false,
      seed: SEED,
    });
    const nw: number[] = [];
    // To just before the ping at 09:00, which resolves the whole chamber and
    // is a different event entirely.
    for (let tick = 0; tick < SIM.TICK_HZ * 535; tick++) {
      const own = match.update(STEP_MS)?.get(PLAYER);
      if (own === undefined) continue;
      // She is the only party north-west of the arch.
      for (const contact of own.contacts) {
        if (contact.x < 1600 && contact.y < 1700) nw.push(contact.tier);
      }
    }
    assert.ok(nw.length > 0, 'she is heard at least once, or there is no lesson');
    assert.ok(
      nw.every((tier) => tier <= ResolutionTier.Bearing),
      `the Knight was graded: tiers ${[...new Set(nw)].join(', ')}`
    );
  });
});

describe('a creature under a commitment never notices the flight', () => {
  it('holds no target through the approach, on every tick and not every twelfth', () => {
    // docs/mission-sorrowgate.md §7: the colossus answers Drenn's emission and
    // never notices the flight at all. The runtime holds it on course from the
    // Echo tick, at 5 Hz, and `faunaSystem` runs at 60 — so a target acquired
    // between two mission passes is live for up to twelve simulation ticks, and
    // a Sounder with a target does not stop at weapons range. It steers at the
    // hull, matches its depth and grinds through it, against a flight under a
    // silence order that cannot shoot back.
    //
    // Sampled every tick rather than every Echo tick, because every-Echo-tick
    // sampling is exactly the blind spot the bug lived in: the runtime always
    // left `targetEid` at zero on the ticks it ran.
    const match = new Match(missionMapById(PROLOGUE_SORROWGATE.mapId)!, {
      mission: PROLOGUE_SORROWGATE,
      fauna: false,
      seed: SEED,
    });
    const world = match.world;
    const targeted: number[] = [];
    // Through the calling voice at 09:20, the transit at 10:40 and the second
    // calling voice at 14:30 — every tick the colossus is under commitment.
    for (let tick = 0; tick < SIM.TICK_HZ * 16 * 60; tick++) {
      match.update(STEP_MS);
      for (const eid of faunaQuery(world)) {
        if (Fauna.targetEid[eid] !== 0) targeted.push(world.tick);
      }
    }
    assert.deepEqual(
      targeted.slice(0, 5),
      [],
      `the colossus acquired a target on ${targeted.length} ticks, first at ${targeted[0]}`
    );
  });

  it('gives the creature its ears back when the commitment expires', () => {
    // The other end of the deafening, and unreachable in Sorrowgate's own beat
    // list: every commitment there is either replaced by the next beat or runs
    // to the resolve, so nothing ever expires with the creature still in the
    // water. Left untested it would be exactly the kind of thing that works
    // until the second mission — a released creature deaf for the rest of the
    // match, drifting home and hearing nothing.
    //
    // A fixture rather than the Prologue, because the property is about a beat
    // list the Prologue does not have. Everything else is the Prologue's, so
    // the world it runs in is the authored one.
    const RELEASE_AT = SIM.TICK_HZ * 20;
    const fixture = {
      ...PROLOGUE_SORROWGATE,
      beats: [
        {
          atTick: SIM.TICK_HZ * 2,
          kind: 'creature',
          tag: 'sounder',
          species: FaunaSpecies.Sounder,
          spawnAt: { x: 2600, y: 3600, depthM: 2200 },
          driveTo: { x: 2550, y: 2750 },
          untilTick: RELEASE_AT,
          loud: true,
          note: 'a commitment that ends with the creature still alive',
        },
      ],
    } as unknown as typeof PROLOGUE_SORROWGATE;

    const match = new Match(missionMapById(PROLOGUE_SORROWGATE.mapId)!, {
      mission: fixture,
      fauna: false,
      seed: SEED,
    });
    const world = match.world;
    const senseWhileHeld: number[] = [];
    let senseAfter = Number.NaN;
    for (let tick = 0; tick < RELEASE_AT + SIM.TICK_HZ * 3; tick++) {
      match.update(STEP_MS);
      const [eid] = faunaQuery(world);
      if (eid === undefined) continue;
      if (world.tick < RELEASE_AT) senseWhileHeld.push(Fauna.senseS[eid]!);
      else senseAfter = Fauna.senseS[eid]!;
    }

    assert.ok(
      senseWhileHeld.some((s) => s > DRIFT.SENSE_INTERVAL_S),
      'the creature was never deafened, so this proves nothing about undoing it'
    );
    assert.ok(
      senseAfter <= DRIFT.SENSE_INTERVAL_S,
      `the released creature is still deaf: senseS ${senseAfter}s against an ` +
        `interval of ${DRIFT.SENSE_INTERVAL_S}s`
    );
  });
});
