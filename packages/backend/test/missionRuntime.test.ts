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

import {
  Faction,
  MissionOutcome,
  ObjectiveStatus,
  SIM,
  UnitKind,
  type EchoSnapshot,
  type MissionView,
} from '@echoes/shared';
import { hasComponent } from 'bitecs';
import { MoveOrder } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import { REPLAY_FORMAT_VERSION, playReplay } from '../src/sim/replay.ts';
import { PROLOGUE_SORROWGATE } from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const SEED = 7;
const PLAYER = PROLOGUE_SORROWGATE.playerSlot;

/** §11's extraction point, in the middle of the Upper Concourse. */
const CONCOURSE = { x: 2500, y: 350 };
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
  const sampled = new Map<number, EchoSnapshot>();
  const wanted = new Set(options.sampleAtS ?? []);
  let last: EchoSnapshot | null = null;
  let peakTenderSig = 0;
  let peakEscortSig = 0;
  let refusedWhileHeld = false;

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
        match.orderMove(PLAYER, tender.id, CONCOURSE.x, CONCOURSE.y);
        if (options.climb) match.orderDepth(PLAYER, tender.id, CLIMB_TO_M);
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
          if (options.climb) match.orderDepth(PLAYER, escort.id, CLIMB_TO_M);
        }
      }
    }

    const view = match.takeMissionView();
    if (view !== null) views.push(view);
    if (match.missionOver !== null) break;
  }

  assert.ok(last !== null, 'the mission produced no snapshot at all');
  return { match, views, last, sampled, peakTenderSig, peakEscortSig, refusedWhileHeld };
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
});

describe('the run north is a climb', () => {
  it('stalls the freight against the Descent when the ascent is never ordered', () => {
    // §11: the Descent's floor is 900 m and the tenders sit at 1,470 m, so the
    // step north is refused by the ground itself — `resolveStep` will not put a
    // hull in water that does not admit it, and terrain lifts a hull only once
    // it is already over shallower ground. §9's "the run north and the climb"
    // is therefore two instructions and not one, and a player who gives only
    // the first watches the freight press against the step and stop.
    //
    // This is the mission's floor working in the other direction from §3's: the
    // basin below cannot be entered because the hulls are not rated for it, and
    // the concourse above cannot be reached without choosing to rise.
    const run = unclimbedRun();
    assert.equal(run.match.missionOver, null, 'nothing should have resolved by 15:30');

    const terrain = terrainFor(missionMapById(PROLOGUE_SORROWGATE.mapId)!);
    const tenders = tendersIn(run.last);
    assert.equal(tenders.length, 2, 'both tenders are still in the water');
    for (const tender of tenders) {
      assert.ok(
        tender.y > CONCOURSE.y,
        `a tender reached ${tender.y.toFixed(0)} without ever being told to climb`
      );
      assert.ok(
        !terrain.admits(tender.x, tender.y - 250, tender.depth),
        `the tender at ${tender.x.toFixed(0)},${tender.y.toFixed(0)} at ${tender.depth}m is not ` +
          'pressed against ground that refuses it — something else stopped it, and this test ' +
          'is then measuring the wrong thing'
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
    // are one number. This test is what stops them separating again — and note
    // it has to be taken from the *first* view, because the statuses are
    // monotone: a reading that latches at 10:40 and one that was true from the
    // first tick are indistinguishable by the end.
    const run = passiveRun();
    const first = run.views[0]!;
    const silence = first.objectives.find((objective) => objective.id === 'silence');
    assert.ok(silence !== undefined, 'the silence order is stated from the first view');
    assert.equal(
      silence.status,
      ObjectiveStatus.Met,
      'a flight idling at SIG 6 under a ceiling of 20 is compliant, and the court says so'
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
