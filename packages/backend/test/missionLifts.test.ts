/**
 * The lift, played — the hold-and-cut of docs/mission-asset-recovery.md §8 and
 * the cut-time-zero gift of docs/mission-tend.md §13, against a live match.
 *
 * `missions.test.ts` reads the lift table's conventions; this file drives one.
 * The claims worth a simulated run are the ones the literal cannot state:
 *
 * - **The cut is loud, and only the cut.** A carrier holding inside its lift's
 *   region reads the authored 68 on its own meter — the floor, not a stat —
 *   and reads its ordinary self the moment it leaves or the moment the load
 *   rigs. There is no quiet way to do a salvage, and no loud way to have
 *   finished one.
 * - **Progress pauses; it does not reset.** A cut is work done to rock.
 *   Leaving mid-cut and coming back finishes the remainder, not the whole.
 * - **An empty barge is not a delivery.** The `loaded` extract counts hulls
 *   carrying a rigged load, so parking an uncut barge on the Rail Head reads
 *   zero — the cheese docs/mission-asset-recovery.md §8's objective exists to
 *   be immune to.
 * - **The gift never touches the meter.** Cut time zero rigs on arrival: the
 *   load is carried point to point without the carrier ever being made loud,
 *   which is the whole of Tend's use of the mechanism.
 *
 * One choreographed run, memoised, many claims — `missionRuntime.test.ts`'s
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
const SEED = 11;
const PLAYER = 0;

/** The authored loudness of the cut, and the length of it: ten seconds held. */
const CUT_SIG = 68;
const CUT_TICKS = 10 * SIM.TICK_HZ;

/**
 * Everything below sits inside Sorrowgate's Gate region (x 2000–3250,
 * y 2250–3250, floor 1,500 m), so a hull at 1,470 m moves freely between the
 * three rectangles and the map authors no hazard that could touch a meter.
 */
const FALL = { x: 2300, y: 2800, widthM: 250, heightM: 250 };
const PICKUP = { x: 2550, y: 2850, widthM: 150, heightM: 150 };
const RAILHEAD = { x: 2350, y: 2350, widthM: 400, heightM: 250 };
const AT_FALL = { x: 2420, y: 2900 };
const AT_PICKUP = { x: 2600, y: 2900 };
const AT_RAILHEAD = { x: 2550, y: 2450 };
/** Close enough to count an ordered leg arrived. */
const ARRIVED_M = 60;
/** Orders are re-issued on this cadence, as a player holding a course would. */
const REISSUE_TICKS = 60;

/**
 * A synthetic mission rather than a catalogue one, because no authored mission
 * carries lifts yet — this file is the mechanism's proof, ahead of the two
 * missions specified against it. Spread from the Prologue so the header and
 * the incidental fields stay legal; everything the lift touches is overridden.
 *
 * Both carriers take the `escort` role deliberately: the escort hold binds
 * `tender`-role hulls to an escort's presence, and this mission is about the
 * lift, not the hold. Asset Recovery will author both together.
 */
const LIFT_MISSION: MissionDefinition = {
  ...PROLOGUE_SORROWGATE,
  id: 'test-lift-mission',
  doc: 'docs/mission-asset-recovery.md §8; docs/mission-tend.md §13 — the test authoring',
  playerSlot: PLAYER,
  courtSlot: 1,
  fauna: false,
  sigBudget: CUT_SIG,
  arrayTag: 'no-array',
  silenceCeilingSig: 100,
  debtCapS: 60,
  escortRadiusM: 400,
  regions: [
    { id: 'fall', ...FALL, note: 'The fall — where the cut runs' },
    { id: 'pickup', ...PICKUP, note: 'The landing — where the gift waits, cut time zero' },
    { id: 'railhead', ...RAILHEAD, note: 'The Rail Head — where a delivery is counted' },
  ],
  lifts: [
    {
      id: 'asset',
      tag: 'lift-one',
      region: 'fall',
      cutTicks: CUT_TICKS,
      cutSig: CUT_SIG,
      note: 'The hold-and-cut: ten seconds held at 68',
    },
    {
      id: 'gift',
      tag: 'gift-tender',
      region: 'pickup',
      cutTicks: 0,
      cutSig: 0,
      note: 'The gift: rigged on arrival, never loud',
    },
  ],
  markers: [],
  parties: [
    {
      slot: PLAYER,
      faction: Faction.Bathyarch,
      note: 'Two carriers and nothing else in the water',
      units: [
        {
          tag: 'lift-one',
          kind: UnitKind.Harvester,
          x: AT_FALL.x,
          y: AT_FALL.y,
          depthM: 1470,
          role: 'escort',
          note: 'The cutting barge, opening inside the fall',
        },
        {
          tag: 'gift-tender',
          kind: UnitKind.Harvester,
          x: AT_PICKUP.x,
          y: AT_PICKUP.y,
          depthM: 1470,
          role: 'escort',
          note: 'The gift carrier, opening inside the pickup',
        },
      ],
    },
  ],
  locks: [],
  objectives: [
    {
      id: 'manifest',
      text: 'Two loads reach the Rail Head.',
      initial: ObjectiveStatus.Pending,
      predicate: { kind: 'extract', role: 'escort', region: 'railhead', count: 2, loaded: true },
      terminal: true,
    },
  ],
  beats: [],
  epilogue: {
    [MissionOutcome.Complete]: 'Both loads returned to the registry.',
    [MissionOutcome.Partial]: 'The remainder is written down.',
    [MissionOutcome.Lost]: 'The registry keeps the numbers.',
  },
};

interface Run {
  /** The cutting barge's SIG while it held the fall, sampled mid-cut. */
  cutSig: number;
  /** Its SIG once it had left the fall mid-cut and settled at the railhead. */
  pausedSig: number;
  /** The `manifest` progress while the uncut barge sat on the railhead. */
  progressWhileUnloaded: { done: number; of: number } | undefined;
  /** Its SIG after the resumed cut finished, still standing in the fall. */
  riggedSig: number;
  /** The loudest the gift carrier ever was, over the whole run. */
  peakGiftSig: number;
  /** The final view before resolution, and the resolution itself. */
  finalProgress: { done: number; of: number } | undefined;
  outcome: MissionOutcome | null;
  epilogue: string | null;
}

let memo: Run | null = null;

/**
 * The whole story, once: cut, interrupt, park unloaded on the railhead, come
 * back, finish the cut, deliver both. Each phase runs until its condition or a
 * generous timeout, so nothing here depends on a hull's exact cruise speed.
 */
function run(): Run {
  if (memo !== null) return memo;
  const map = missionMapById(PROLOGUE_SORROWGATE.mapId)!;
  const match = new Match(map, { mission: LIFT_MISSION, fauna: false, seed: SEED });

  let last: EchoSnapshot | null = null;
  let view: MissionView | null = null;
  let peakGiftSig = 0;
  let barge = 0;
  let gift = 0;

  const step = (): void => {
    const own = match.update(STEP_MS)?.get(PLAYER);
    if (own !== undefined) {
      last = own;
      if (barge === 0) {
        // Two Harvesters; told apart by where they open.
        barge = own.units.find((u) => u.x < 2500)?.id ?? 0;
        gift = own.units.find((u) => u.x >= 2500)?.id ?? 0;
      }
      const g = own.units.find((u) => u.id === gift);
      if (g !== undefined && g.sig > peakGiftSig) peakGiftSig = g.sig;
    }
    const next = match.takeMissionView();
    if (next !== null) view = next;
  };

  const unit = (id: number) => last?.units.find((u) => u.id === id);

  /** Drive a hull to a point, re-issuing as a player would, until it arrives. */
  const drive = (id: number, to: { x: number; y: number }): void => {
    for (let tick = 0; tick < SIM.TICK_HZ * 90; tick++) {
      if (tick % REISSUE_TICKS === 0) match.orderMove(PLAYER, id, to.x, to.y);
      step();
      const u = unit(id);
      if (u !== undefined && Math.hypot(u.x - to.x, u.y - to.y) <= ARRIVED_M) return;
    }
    assert.fail(`a carrier never reached (${to.x}, ${to.y})`);
  };

  const settle = (seconds: number): void => {
    for (let tick = 0; tick < SIM.TICK_HZ * seconds; tick++) step();
  };

  // Phase 1 — the cut runs. Four seconds held is well short of the ten the cut
  // needs, so the barge is mid-cut when sampled: loud at the authored figure.
  settle(4);
  const cutSig = unit(barge)?.sig ?? 0;

  // Phase 2 — interrupted. The barge is pulled off the fall and parked on the
  // railhead, unloaded: the floor must lift, and the counter must not move.
  drive(barge, AT_RAILHEAD);
  settle(3);
  const pausedSig = unit(barge)?.sig ?? 100;
  const progressWhileUnloaded = (view as MissionView | null)?.objectives.find(
    (o) => o.id === 'manifest'
  )?.progress;

  // Phase 3 — resumed. Four seconds are already banked, so eight held more
  // than finishes the remaining six; then two settled seconds for the floor to
  // lift once the load rigs.
  drive(barge, AT_FALL);
  settle(8);
  settle(2);
  const riggedSig = unit(barge)?.sig ?? 100;

  // Phase 4 — both carriers deliver, and the mission closes on the count.
  drive(gift, { x: AT_RAILHEAD.x, y: AT_RAILHEAD.y + 60 });
  drive(barge, AT_RAILHEAD);
  settle(2);
  const finalProgress = (view as MissionView | null)?.objectives.find(
    (o) => o.id === 'manifest'
  )?.progress;

  memo = {
    cutSig,
    pausedSig,
    progressWhileUnloaded,
    riggedSig,
    peakGiftSig,
    finalProgress,
    outcome: match.missionOver?.outcome ?? null,
    epilogue: match.missionOver?.epilogue ?? null,
  };
  return memo;
}

describe('the hold-and-cut, at the fall', () => {
  it('floors the carrier at the authored loudness while the cut runs', () => {
    // Idle is 18 and cruise is 40; only the floor reads 68. At-least rather
    // than exactly, because floors never make a louder hull quieter.
    assert.ok(
      run().cutSig >= CUT_SIG,
      `mid-cut the barge read ${run().cutSig}, under the authored ${CUT_SIG}`
    );
  });

  it('lifts the floor the moment the barge leaves the cut', () => {
    assert.ok(
      run().pausedSig < CUT_SIG,
      `off the fall the barge still read ${run().pausedSig} — a floor outlived its cut`
    );
  });

  it('counts no delivery for an empty barge parked on the railhead', () => {
    const progress = run().progressWhileUnloaded;
    assert.ok(progress !== undefined, 'the manifest objective shows no counter');
    assert.equal(progress.done, 0, 'an uncut barge was counted as a delivery');
  });

  it('resumes a paused cut rather than restarting it, then goes quiet rigged', () => {
    // Phase 3 holds the fall for eight seconds against a ten-second cut. Only
    // a ledger that kept the first four banked can finish in that window — and
    // once the load rigs, the floor lifts: no loud way to have finished.
    assert.ok(
      run().riggedSig < CUT_SIG,
      `rigged and standing in the fall the barge read ${run().riggedSig} — either the cut ` +
        'restarted from zero or the floor outlived it'
    );
  });
});

describe('the gift, at cut time zero', () => {
  it('rigs on arrival and never touches the meter', () => {
    // The carrier opens inside the pickup and is driven across the chamber:
    // idle, then cruise, never a cut. 60 clears cruise-plus-modifiers by a
    // wide margin while sitting far under the 68 a floor would have forced.
    assert.ok(
      run().peakGiftSig < 60,
      `the gift carrier peaked at ${run().peakGiftSig} — the zero-tick cut made noise`
    );
  });
});

describe('the delivery', () => {
  it('closes the mission on two loaded carriers reaching the railhead', () => {
    assert.equal(run().finalProgress?.done, 2, 'the manifest never filled');
    assert.equal(run().outcome, MissionOutcome.Complete);
    assert.equal(run().epilogue, LIFT_MISSION.epilogue[MissionOutcome.Complete]);
  });
});
