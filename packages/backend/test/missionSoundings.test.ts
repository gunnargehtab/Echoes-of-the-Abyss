/**
 * The sounding, played — docs/mission-aptitude.md §4, against a live match.
 *
 * `missions.test.ts` reads the sounding table's conventions; this file drives
 * one. The claims worth a simulated run are the ones the literal cannot state,
 * and the first of them is the whole mission:
 *
 * - **Range is not enough.** A hull parked well inside the radius, pointed away
 *   from the formation, accrues nothing at all — for longer than the hold
 *   needs. §4's argument is that a Knight's one lever is where the bow is
 *   pointing, and a sounding that could be taken over the shoulder would hand
 *   that lever back.
 * - **The hold is loud, and only the hold.** A hull taking a sounding reads the
 *   authored 80 on its own meter — the Sounding Spire's active figure, floored
 *   rather than granted — and reads its ordinary 28 the moment the hold breaks.
 * - **A broken hold resets.** Unlike the lift's cut, which is work done to rock
 *   and banks what it did. Twelve seconds, a break, and twelve more do not add
 *   up to a twenty-second sounding: a held tone assembled out of fragments is
 *   the opposite of the lesson.
 * - **Silence breaks it**, the way it stops a cut — and this is the mission
 *   where that price is barely a price, because the Order turns rather than
 *   goes quiet.
 *
 * One choreographed run, memoised, many claims — `missionLifts.test.ts`'s
 * arrangement, for its reason: the drive is the expensive part.
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
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { PROLOGUE_SORROWGATE } from '../src/sim/missions/index.ts';
import type { MissionDefinition } from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const SEED = 17;
const PLAYER = 0;

/** §4's figures: within 400 m, held twenty seconds, at the Spire's 80. */
const SOUNDING_SIG = 80;
const HOLD_TICKS = 20 * SIM.TICK_HZ;
const RADIUS_M = 400;

/**
 * Inside Sorrowgate's Gate region (x 2000–3250, y 2250–3250, floor 1,500 m), so
 * a hull at 1,470 m moves freely and the map authors no hazard that could touch
 * a meter — `missionLifts.test.ts`'s water, for its reason.
 *
 * The formation is **west** of where the corvette opens, and `spawnUnit` gives
 * every hull a bow of zero — due east. So the mission starts with the hull two
 * hundred metres from the formation and pointed directly away from it, which is
 * the state the first claim is about, with no orders needed to reach it.
 */
const FORMATION = { x: 2500, y: 2800 };
const SPAWN = { x: 2700, y: 2800 };
/** Sixty metres short of the formation: bow on it, at a real bearing. */
const ON_STATION = { x: 2560, y: 2800 };

/** Close enough to count an ordered leg arrived. */
const ARRIVED_M = 25;
/** Orders are re-issued on this cadence, as a player holding a course would. */
const REISSUE_TICKS = 60;

/**
 * A synthetic mission rather than a catalogue one, because no authored mission
 * carries soundings yet — this file is the mechanism's proof, ahead of the
 * Aptitude literal specified against it. Spread from the Prologue so the header
 * and the incidental fields stay legal; everything the sounding touches is
 * overridden.
 *
 * The hull takes the `escort` role deliberately: the escort hold binds
 * `tender`-role hulls to an escort's presence, and this mission is about the
 * bearing, not the hold.
 */
const SOUNDING_MISSION: MissionDefinition = {
  ...PROLOGUE_SORROWGATE,
  id: 'test-sounding-mission',
  doc: 'docs/mission-aptitude.md §4 — the test authoring',
  playerSlot: PLAYER,
  courtSlot: 1,
  fauna: false,
  sigBudget: 28,
  arrayTag: 'no-array',
  silenceCeilingSig: 100,
  debtCapS: 60,
  escortRadiusM: 400,
  regions: [{ id: 'fields', x: 2000, y: 2250, widthM: 1250, heightM: 1000, note: 'The water' }],
  lifts: [],
  soundings: [
    {
      id: 'first-formation',
      tag: 'sounder',
      x: FORMATION.x,
      y: FORMATION.y,
      radiusM: RADIUS_M,
      holdTicks: HOLD_TICKS,
      sig: SOUNDING_SIG,
      note: 'Four hundred metres, twenty seconds, eighty — the Spire by hand',
    },
  ],
  markers: [],
  parties: [
    {
      slot: PLAYER,
      faction: Faction.Hadron,
      note: 'One corvette and nothing else in the water',
      units: [
        {
          tag: 'sounder',
          kind: UnitKind.Corvette,
          x: SPAWN.x,
          y: SPAWN.y,
          depthM: 1470,
          role: 'escort',
          note: 'Opens inside the radius and pointed away from the formation',
        },
      ],
    },
  ],
  locks: [],
  objectives: [
    {
      id: 'sounding',
      text: 'Take the sounding.',
      initial: ObjectiveStatus.Pending,
      predicate: { kind: 'sound', count: 1 },
      terminal: true,
    },
  ],
  beats: [],
  epilogue: {
    [MissionOutcome.Complete]: 'The formation is sounded.',
    [MissionOutcome.Partial]: 'The bearing is entered as taken in part.',
    [MissionOutcome.Lost]: 'Nothing was sounded.',
  },
};

interface Run {
  /** Sounded, and the hull's SIG, after 25 s inside the radius pointed away. */
  awayProgress: number | undefined;
  awaySig: number;
  /** Its SIG twelve seconds into an aimed hold, and the count then. */
  holdingSig: number;
  holdingProgress: number | undefined;
  /** Its SIG while silent mid-hold. */
  silentSig: number;
  /** The count twelve seconds after the break — twenty-four aimed in total. */
  afterBreakProgress: number | undefined;
  /** The last view before resolution, and the resolution itself. */
  finalProgress: number | undefined;
  outcome: MissionOutcome | null;
  epilogue: string | null;
}

let memo: Run | null = null;

/**
 * The whole story, once: idle pointed away, turn and hold, break the hold, hold
 * again from nothing, and finish it.
 */
function run(): Run {
  if (memo !== null) return memo;
  const map = missionMapById(PROLOGUE_SORROWGATE.mapId)!;
  const match = new Match(map, { mission: SOUNDING_MISSION, fauna: false, seed: SEED });

  let last: EchoSnapshot | null = null;
  let view: MissionView | null = null;
  let sounder = 0;

  const step = (): void => {
    const own = match.update(STEP_MS)?.get(PLAYER);
    if (own !== undefined) {
      last = own;
      if (sounder === 0) sounder = own.units[0]?.id ?? 0;
    }
    const next = match.takeMissionView();
    if (next !== null) view = next;
  };

  const sig = (): number => last?.units.find((u) => u.id === sounder)?.sig ?? 0;
  const sounded = (): number | undefined =>
    (view as MissionView | null)?.objectives.find((o) => o.id === 'sounding')?.progress?.done;

  const settle = (seconds: number): void => {
    for (let tick = 0; tick < SIM.TICK_HZ * seconds; tick++) step();
  };

  /** Drive the hull to a point, re-issuing as a player would, until it arrives. */
  const drive = (to: { x: number; y: number }): void => {
    for (let tick = 0; tick < SIM.TICK_HZ * 60; tick++) {
      if (tick % REISSUE_TICKS === 0) match.orderMove(PLAYER, sounder, to.x, to.y);
      step();
      const u = last?.units.find((unit) => unit.id === sounder);
      if (u !== undefined && Math.hypot(u.x - to.x, u.y - to.y) <= ARRIVED_M) return;
    }
    assert.fail(`the corvette never reached (${to.x}, ${to.y})`);
  };

  // Phase 1 — in range, pointed away, for longer than the hold needs. The
  // corvette opens 200 m from the formation with a bow of due east and is
  // given no orders at all, so nothing but the bearing is being tested.
  settle(25);
  const awayProgress = sounded();
  const awaySig = sig();

  // Phase 2 — turned onto it. The leg west is short and the hull is bow-on the
  // whole way, so twelve seconds is twelve seconds of hold against a twenty
  // second sounding: loud, and not yet taken.
  drive(ON_STATION);
  settle(12);
  const holdingSig = sig();
  const holdingProgress = sounded();

  // Phase 3 — the break. Silent Running stops the work the way it stops a cut,
  // and the floor lifts with it.
  match.setSilentRunning(PLAYER, sounder, true);
  settle(5);
  const silentSig = sig();
  match.setSilentRunning(PLAYER, sounder, false);

  // Phase 4 — held again, from nothing. Twelve more aimed seconds is
  // twenty-four in total: enough for a ledger that banked the first twelve, and
  // short of a hold that has to be held.
  settle(12);
  const afterBreakProgress = sounded();

  // Phase 5 — and the remainder. Twenty-two continuous seconds takes it.
  settle(10);
  const finalProgress = sounded();

  memo = {
    awayProgress,
    awaySig,
    holdingSig,
    holdingProgress,
    silentSig,
    afterBreakProgress,
    finalProgress,
    outcome: match.missionOver?.outcome ?? null,
    epilogue: match.missionOver?.epilogue ?? null,
  };
  return memo;
}

describe('the sounding, aimed', () => {
  it('accrues nothing for a hull inside the radius and pointed away', () => {
    // The mechanism, stated as the one claim the mission cannot be built
    // without: twenty-five seconds at two hundred metres, against a hold of
    // twenty, and the count does not move.
    assert.equal(run().awayProgress, 0, 'a sounding was taken over the hull’s shoulder');
  });

  it('leaves a hull pointed away at its own loudness', () => {
    // A corvette reads 28 idle. Only the hold reads 80, so a floor on a hull
    // that is not sounding would be visible here as the loudness of a sounding
    // nobody was taking.
    assert.ok(
      run().awaySig < SOUNDING_SIG,
      `pointed away the corvette read ${run().awaySig}, at or above the sounding’s ` +
        `${SOUNDING_SIG}`
    );
  });
});

describe('the hold', () => {
  it('floors the hull at the Spire’s figure while the sounding runs', () => {
    // At-least rather than exactly, because floors never make a louder hull
    // quieter.
    assert.ok(
      run().holdingSig >= SOUNDING_SIG,
      `mid-sounding the corvette read ${run().holdingSig}, under the authored ${SOUNDING_SIG}`
    );
    assert.equal(run().holdingProgress, 0, 'a twelve-second hold took a twenty-second sounding');
  });

  it('goes quiet, and stops, when the hull runs silent', () => {
    assert.ok(
      run().silentSig < SOUNDING_SIG,
      `running silent the corvette still read ${run().silentSig} — a floor outlived its hold`
    );
  });

  it('resets on a broken hold rather than banking it', () => {
    // Twelve aimed seconds, a break, twelve more: twenty-four in total against
    // a hold of twenty. A ledger that banked the first twelve would have taken
    // this sounding, and a tone assembled out of fragments is not a tone.
    assert.equal(
      run().afterBreakProgress,
      0,
      'two broken twelve-second holds added up to a twenty-second sounding'
    );
  });
});

describe('the sounding taken', () => {
  it('closes the mission on one held bearing', () => {
    assert.equal(run().finalProgress, 1, 'the sounding never completed');
    assert.equal(run().outcome, MissionOutcome.Complete);
    assert.equal(run().epilogue, SOUNDING_MISSION.epilogue[MissionOutcome.Complete]);
  });
});
