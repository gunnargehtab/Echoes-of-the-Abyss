/**
 * The sounding, played — docs/mission-aptitude.md §4, against a live match.
 *
 * `missions.test.ts` states the geometry against the prose and checks the
 * table's conventions; this file drives the mechanism. The claims worth a
 * simulated run are the ones neither a literal nor a pure function can make:
 *
 * - **The hold aims the hull.** A hull standing well inside the radius with its
 *   bow pointed away holds nothing, for as long as you like, and is never made
 *   loud. That is the mission: a sounding aimed at the survey is heard from
 *   most of the map, and the same sounding aimed away is heard from six hundred
 *   metres, which is only a decision if pointing it the short way *fails*.
 * - **The sounding is loud, and only while it runs.** A hull taking one reads
 *   the authored 80 on its own meter — the floor, not a stat — and reads its
 *   ordinary self the moment it turns away or the moment the formation is read.
 * - **A broken hold resets.** This is the one place the sounding and
 *   `MissionLift` deliberately disagree, and the reason this file exists beside
 *   `missionLifts.test.ts` rather than inside it: a cut is work done to rock
 *   and resumes where it stood; a sounding is a *held* tone and starts again.
 *   The run below holds three seconds of a five-second sounding, turns away,
 *   turns back and holds three more. A lift would have finished. This does not.
 * - **Silence stops it outright.** §4's whole argument arrives as a rule here:
 *   a hull that runs silent to take a sounding quietly loses the sounding.
 *
 * The bow is steered the way a player steers it — by ordering a short leg and
 * letting the hull arrive. `Heading` carries the *ordered* course and is never
 * cleared (#269), so a hull that has stopped is still pointed where it was told
 * to go, which is what makes a twenty-second hold a thing a stationary hull can
 * be doing at all.
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
const SEED = 23;
const PLAYER = 0;

/**
 * §4's own figures, with one shortened: the radius and the SIG are the
 * document's 400 m and 80, and the hold is five seconds rather than twenty
 * because the rule under test is what a broken hold does, not how long an
 * unbroken one is. Every window below is stated in seconds against this.
 */
const SOUND_SIG = 80;
const SOUND_RADIUS_M = 400;
const HOLD_S = 5;

/**
 * Inside Sorrowgate's Gate region (x 2000-3250, y 2250-3250, floor 1,500 m), so
 * a hull at 1,470 m moves freely and the map authors no hazard that could touch
 * a meter — `missionLifts.test.ts`'s water, for its reason.
 *
 * Two formations on one line, and the spacing is load-bearing: the hull opens
 * 300 m west of the first (inside its radius) and 800 m west of the second
 * (outside it), so the whole first half of the run cannot touch the second
 * sounding by accident.
 */
const FIRST = { x: 2600, y: 2800 };
const SECOND = { x: 3100, y: 2800 };
const START = { x: 2300, y: 2800 };
/** A short leg, purely to set the bow: far enough to order, near enough to be quick. */
const LEG_M = 40;
/** Close enough to count an ordered leg arrived. */
const ARRIVED_M = 12;
/** Orders are re-issued on this cadence, as a player holding a course would. */
const REISSUE_TICKS = 60;

/**
 * A synthetic mission rather than a catalogue one, because no authored mission
 * carries soundings yet — this file is the mechanism's proof, ahead of the
 * Aptitude literal specified against it (docs/mission-aptitude.md §13). Spread
 * from the Prologue so the header and the incidental fields stay legal;
 * everything the sounding touches is overridden.
 */
const SOUNDING_MISSION: MissionDefinition = {
  ...PROLOGUE_SORROWGATE,
  id: 'test-sounding-mission',
  doc: 'docs/mission-aptitude.md §4 — the test authoring',
  playerSlot: PLAYER,
  courtSlot: 1,
  fauna: false,
  sigBudget: SOUND_SIG,
  arrayTag: 'no-array',
  silenceCeilingSig: 100,
  debtCapS: 60,
  escortRadiusM: 400,
  regions: [],
  lifts: [],
  soundings: [
    {
      id: 'first',
      tag: 'sounder',
      x: FIRST.x,
      y: FIRST.y,
      radiusM: SOUND_RADIUS_M,
      holdTicks: HOLD_S * SIM.TICK_HZ,
      sig: SOUND_SIG,
      note: 'The near formation — five seconds held at 80, within 400 m',
    },
    {
      id: 'second',
      tag: 'sounder',
      x: SECOND.x,
      y: SECOND.y,
      radiusM: SOUND_RADIUS_M,
      holdTicks: HOLD_S * SIM.TICK_HZ,
      sig: SOUND_SIG,
      note: 'The far formation — out of reach until the hull crosses to it',
    },
  ],
  markers: [],
  parties: [
    {
      slot: PLAYER,
      faction: Faction.Bathyarch,
      note: 'One hull and nothing else in the water',
      units: [
        {
          tag: 'sounder',
          kind: UnitKind.Harvester,
          x: START.x,
          y: START.y,
          depthM: 1470,
          role: 'escort',
          note: 'The sounding hull, opening inside the first formation’s radius',
        },
      ],
    },
  ],
  locks: [],
  objectives: [
    {
      id: 'soundings',
      text: 'Both formations are read.',
      initial: ObjectiveStatus.Pending,
      predicate: { kind: 'sound', count: 2 },
      terminal: true,
    },
  ],
  beats: [],
  epilogue: {
    [MissionOutcome.Complete]: 'Both formations are entered.',
    [MissionOutcome.Partial]: 'The remainder is unread.',
    [MissionOutcome.Lost]: 'Nothing was read.',
  },
};

interface Sample {
  sig: number;
  done: number;
}

interface Run {
  /** Bow pointed away, inside the radius, held longer than the sounding needs. */
  awayFromIt: Sample;
  /** Bow on it, three seconds into a five-second hold. */
  midHold: Sample;
  /** Turned away mid-hold: the floor must lift. */
  broken: Sample;
  /** Three more seconds bow-on after the break — six in total, none of them five. */
  afterResume: Sample;
  /** Bow-on throughout, past the five seconds. */
  sounded: Sample;
  /** Standing bow-on at a formation already read: no floor, no second count. */
  afterFirst: Sample;
  /** Bow on the far formation, running silent for longer than the hold. */
  silentAtSecond: Sample;
  outcome: MissionOutcome | null;
  epilogue: string | null;
  finalDone: number;
}

let memo: Run | null = null;

function run(): Run {
  if (memo !== null) return memo;
  const map = missionMapById(PROLOGUE_SORROWGATE.mapId)!;
  const match = new Match(map, { mission: SOUNDING_MISSION, fauna: false, seed: SEED });

  let last: EchoSnapshot | null = null;
  let view: MissionView | null = null;
  let hull = 0;

  const step = (): void => {
    const own = match.update(STEP_MS)?.get(PLAYER);
    if (own !== undefined) {
      last = own;
      if (hull === 0) hull = own.units[0]?.id ?? 0;
    }
    const next = match.takeMissionView();
    if (next !== null) view = next;
  };

  const unit = () => last?.units.find((u) => u.id === hull);

  const sample = (): Sample => ({
    sig: unit()?.sig ?? 0,
    done:
      (view as MissionView | null)?.objectives.find((o) => o.id === 'soundings')?.progress?.done ??
      -1,
  });

  const settle = (seconds: number): void => {
    for (let tick = 0; tick < SIM.TICK_HZ * seconds; tick++) step();
  };

  /**
   * Point the hull, by ordering a short leg and letting it arrive. The bow is
   * the ordered course, so the hull ends the leg stopped and still aimed —
   * which is the only way a stationary hull can be holding a sounding at all.
   */
  const face = (dx: number, dy: number): void => {
    const from = unit();
    assert.ok(from !== undefined, 'the sounding hull is not in its own snapshot');
    const to = { x: from.x + dx, y: from.y + dy };
    for (let tick = 0; tick < SIM.TICK_HZ * 60; tick++) {
      if (tick % REISSUE_TICKS === 0) match.orderMove(PLAYER, hull, to.x, to.y);
      step();
      const now = unit();
      if (now !== undefined && Math.hypot(now.x - to.x, now.y - to.y) <= ARRIVED_M) return;
    }
    assert.fail(`the hull never reached (${to.x}, ${to.y})`);
  };

  // Bring the hull up to speed on the mission before sampling anything: one
  // Echo interval has to have run for a view to exist at all.
  settle(1);

  // Phase 1 — pointed away, and standing 300 m from a formation whose radius is
  // 400. Eight seconds is longer than the whole sounding.
  face(-LEG_M, 0);
  settle(8);
  const awayFromIt = sample();

  // Phase 2 — turned onto it. Three seconds of a five-second hold.
  face(LEG_M, 0);
  settle(3);
  const midHold = sample();

  // Phase 3 — the hold breaks. Turning away is enough; the hull has not left
  // the radius and never does in this run.
  face(-LEG_M, 0);
  settle(2);
  const broken = sample();

  // Phase 4 — back on it for three more. Six seconds bow-on in total against a
  // five-second sounding: a paused ledger would have finished, a reset one has
  // three seconds banked and nothing read.
  face(LEG_M, 0);
  settle(3);
  const afterResume = sample();

  // Phase 5 — held out. Three more unbroken seconds carry the same hold past
  // five without the hull moving or turning.
  settle(3);
  const sounded = sample();

  // Phase 6 — still standing bow-on at a formation that has been read. The
  // floor must be gone, and the count must not have grown a second entry.
  settle(2);
  const afterFirst = sample();

  // Phase 7 — across to the far formation, and read it with the button down.
  // Silence stops the work: eight seconds bow-on, well inside the radius,
  // reading nothing. The hull turns the last leg *before* going silent, so
  // what is under test is the button rather than the bow.
  face(LEG_M * 12, 0);
  face(LEG_M, 0);
  match.setSilentRunning(PLAYER, hull, true);
  settle(8);
  const silentAtSecond = sample();

  // And with it up again, the same standing reads the formation.
  match.setSilentRunning(PLAYER, hull, false);
  settle(HOLD_S + 2);
  const finalDone = sample().done;

  memo = {
    awayFromIt,
    midHold,
    broken,
    afterResume,
    sounded,
    afterFirst,
    silentAtSecond,
    outcome: match.missionOver?.outcome ?? null,
    epilogue: match.missionOver?.epilogue ?? null,
    finalDone,
  };
  return memo;
}

describe('the sounding aims the hull', () => {
  it('reads nothing, and stays quiet, with the bow pointed away inside the radius', () => {
    // The mechanism. Eight seconds is longer than the sounding; the hull is
    // 300 m from a formation whose radius is 400; and it holds nothing,
    // because it is pointed the wrong way.
    assert.equal(run().awayFromIt.done, 0, 'a sounding was read with the bow pointed away');
    assert.ok(
      run().awayFromIt.sig < SOUND_SIG,
      `pointed away the hull read ${run().awayFromIt.sig} — a sounding it was not taking ` +
        'made it loud'
    );
  });

  it('floors the hull at the authored loudness while the hold runs', () => {
    // Idle is 18 and cruise is 40; only the floor reads 80. At-least rather
    // than exactly, because floors never make a louder hull quieter.
    assert.ok(
      run().midHold.sig >= SOUND_SIG,
      `mid-hold the hull read ${run().midHold.sig}, under the authored ${SOUND_SIG}`
    );
  });

  it('lifts the floor the moment the bow comes off the formation', () => {
    assert.ok(
      run().broken.sig < SOUND_SIG,
      `turned away the hull still read ${run().broken.sig} — a floor outlived its hold`
    );
  });
});

describe('a broken hold resets, where a cut would have paused', () => {
  it('reads nothing after three seconds, a break, and three more', () => {
    // Six bow-on seconds against a five-second sounding. `missionLifts.test.ts`
    // asserts the opposite of this about the cut, deliberately: that one banks
    // what it did, and this one does not. §4 says a sounding is *held*.
    assert.equal(run().afterResume.done, 0, 'a sounding was assembled out of two broken fragments');
  });

  it('reads the formation once the same hold runs out unbroken', () => {
    assert.equal(run().sounded.done, 1, 'an unbroken hold past the authored span read nothing');
  });

  it('goes quiet once the formation is read, and counts it once', () => {
    assert.ok(
      run().afterFirst.sig < SOUND_SIG,
      `read and still standing on it the hull reads ${run().afterFirst.sig} — a floor ` +
        'outlived its sounding'
    );
    assert.equal(run().afterFirst.done, 1, 'one formation was counted twice');
  });
});

describe('silence stops the work', () => {
  it('reads nothing from a hull running silent, however well aimed', () => {
    // docs/mission-aptitude.md §4's argument as a rule: a Knight that runs
    // silent to take a sounding quietly loses the sounding, and turning around
    // was always the cheaper number.
    assert.equal(run().silentAtSecond.done, 1, 'a sounding was taken with the button down');
  });

  it('closes the mission once both formations are read', () => {
    assert.equal(run().finalDone, 2, 'the second formation never read');
    assert.equal(run().outcome, MissionOutcome.Complete);
    assert.equal(run().epilogue, SOUNDING_MISSION.epilogue[MissionOutcome.Complete]);
  });
});
