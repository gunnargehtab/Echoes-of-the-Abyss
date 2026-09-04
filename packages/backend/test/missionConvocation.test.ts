/**
 * The walk, the restart, the Holdfast and the bell — docs/mission-convocation.md
 * §4 and §8, against a live match, plus the literal against the document.
 *
 * `missions.test.ts` holds the format's conventions; this file drives the three
 * mechanisms the document asked for and the campaign did not have. The claims
 * worth a simulated run are the ones neither a literal nor a pure function can
 * make:
 *
 * - **A row turns for a quiet hull and not for a loud one.** §4's whole
 *   argument is a ceiling of 26 sitting two above a moving tender and two below
 *   a Corvette, and the only proof of it is a Corvette standing on a row that
 *   then does not turn — with nothing else about the run changed.
 * - **A hull that is not the plateau's stalls the row by standing there.** It
 *   does not have to fire. It has to be there, and the counter has to stop.
 * - **The walk returns altered, and the bells ring.** The first mechanic in this
 *   game that takes progress back: the counter falls from one to none, and the
 *   row that had turned is audibly loud at the authored figure while it does.
 *   A bell that did not sound would make the mission's central reversal silent.
 * - **The act is one act.** It hastens the player's own hulls inside its radius,
 *   lifts Silent Running's speed penalty and not its floor, rings every bell,
 *   collapses the remaining circuit — and is refused the second time it is
 *   asked for, which is the whole of "usable once per match".
 * - **The Holdfast is taken by standing in it.** Sixty continuous seconds in the
 *   authored region fails the keystone and closes the mission on the count as it
 *   stands, and a hull that is merely nearby does nothing at all.
 *
 * Synthetic missions on `marr-plateau`, in the idiom `missionSoundings.test.ts`
 * sets: the authored figures are the document's shape with the clocks shortened,
 * because what is under test is what the rules *do* rather than how long the
 * real ones are. The authored mission's own numbers are asserted separately, at
 * the bottom, against the prose that states them.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { defineQuery } from 'bitecs';
import {
  COMMANDER_ABILITY,
  Faction,
  MISSION,
  MissionOutcome,
  ObjectiveStatus,
  SIM,
  UnitKind,
  type EchoSnapshot,
  type MissionView,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { Acoustic, Owner, Position, StaticEmitter, Unit } from '../src/sim/components.ts';
import { SEEDING_CONVOCATION, SEEDING_TEND } from '../src/sim/missions/index.ts';
import type { MissionDefinition } from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const SEED = 47;
const PLAYER = 0;
const CONCERN = 2;

/** §4's ceiling, and the two hulls the document picks it to sit between. */
const CEILING_SIG = 26;
/** The bell's authored figure — §4.4's SIG 70. */
const BELL_SIG = 70;
/** Shortened clocks. The rule under test is what turns and what does not. */
const HOLD_S = 2;
const STALL_S = 4;
const BELL_S = 4;
const ACT_S = 4;

/** Two rows in the plateau's own water, far enough apart to drive between. */
const ROW_A = { x: 2600, y: 400 };
const ROW_B = { x: 2600, y: 1000 };
const ROW_RADIUS_M = 200;
/** Off both rows by more than the radius, and out of everybody's way. */
const OFF_ROW = { x: 3600, y: 400 };
/** The far corner: outside every row, and out of everybody's way. */
const FAR = { x: 200, y: 200 };
const PLATEAU_DEPTH_M = 240;

const staticEmitters = defineQuery([StaticEmitter, Acoustic, Position]);
const movers = defineQuery([Unit, Owner, Position]);

/**
 * The walk and the act, with nothing else in the mission.
 *
 * Every hull is weapons-cold, including the concern's: what is under test is a
 * hull *standing* somewhere, and a firefight would end the run before the rule
 * did. §6's assertion is armed in the authored literal for its own reason.
 */
const WALK_MISSION: MissionDefinition = {
  ...SEEDING_TEND,
  id: 'test-walk-mission',
  doc: 'docs/mission-convocation.md §4 — the test authoring',
  playerSlot: PLAYER,
  courtSlot: 1,
  fauna: false,
  sigBudget: CEILING_SIG,
  silenceCeilingSig: 100,
  debtCapS: 0,
  escortRadiusM: 0,
  regions: [],
  lifts: [],
  sweep: undefined,
  walk: {
    holdTicks: HOLD_S * SIM.TICK_HZ,
    ceilingSig: CEILING_SIG,
    stallTicks: STALL_S * SIM.TICK_HZ,
    bell: { sig: BELL_SIG, ticks: BELL_S * SIM.TICK_HZ, depthM: PLATEAU_DEPTH_M },
    note: 'Two rows, in order',
    rows: [
      { id: 'a', x: ROW_A.x, y: ROW_A.y, radiusM: ROW_RADIUS_M, note: 'The first row' },
      { id: 'b', x: ROW_B.x, y: ROW_B.y, radiusM: ROW_RADIUS_M, note: 'The second' },
    ],
  },
  commanderAbility: {
    id: 'convocation',
    label: 'ring every bell',
    description: 'Every row at once.',
    x: ROW_A.x,
    y: ROW_A.y,
    depthM: PLATEAU_DEPTH_M,
    radiusM: 1200,
    durationTicks: ACT_S * SIM.TICK_HZ,
    speedMultiplier: COMMANDER_ABILITY.CONVOCATION_SPEED_MULTIPLIER,
    silentRunningImmunity: true,
    sig: BELL_SIG,
    collapsesWalk: true,
    note: 'Both halves',
  },
  markers: [],
  parties: [
    {
      slot: PLAYER,
      faction: Faction.Pelagia,
      note: 'One quiet hull and one loud one',
      units: [
        {
          tag: 'quiet',
          kind: UnitKind.Harvester,
          x: ROW_A.x,
          y: ROW_A.y,
          depthM: PLATEAU_DEPTH_M,
          role: 'tender',
          pressureRating: 1,
          note: 'Under the ceiling standing still and moving alike',
        },
        {
          tag: 'loud',
          kind: UnitKind.Corvette,
          x: OFF_ROW.x,
          y: OFF_ROW.y,
          depthM: PLATEAU_DEPTH_M,
          role: 'guns',
          pressureRating: 1,
          note: 'Two over the ceiling by itself, which is the mission',
        },
      ],
    },
    {
      slot: CONCERN,
      faction: Faction.Bathyarch,
      note: 'The assertion, standing off until it is asked to stand on something',
      units: [
        {
          tag: 'foreign',
          kind: UnitKind.Corvette,
          x: FAR.x,
          y: FAR.y,
          depthM: PLATEAU_DEPTH_M,
          note: 'It does not have to fire',
        },
      ],
    },
  ],
  locks: [],
  objectives: [
    {
      id: 'walk',
      text: 'The walk wants somebody standing on it, and it wants it quiet.',
      stallText: "That's still turning.",
      initial: ObjectiveStatus.Pending,
      terminal: true,
      predicate: { kind: 'walk', count: 2 },
    },
  ],
  beats: [],
  epilogue: {
    [MissionOutcome.Complete]: 'It came back with nothing new in it.',
    [MissionOutcome.Partial]: "We're still turning it.",
    [MissionOutcome.Lost]: 'Nothing turned.',
  },
};

/** The Holdfast, and one hull of somebody else's that walks into it. */
const HOLD_MISSION: MissionDefinition = {
  ...WALK_MISSION,
  id: 'test-hold-mission',
  doc: 'docs/mission-convocation.md §8 — the test authoring',
  walk: undefined,
  commanderAbility: undefined,
  runsItsLength: true,
  regions: [
    {
      id: 'home',
      x: 2250,
      y: 250,
      widthM: 750,
      heightM: 500,
      note: "Home, and the mission's stake",
    },
  ],
  holds: [
    {
      id: 'held',
      region: 'home',
      ticks: HOLD_S * SIM.TICK_HZ,
      objectiveId: 'holdfast',
      closes: true,
      note: 'Standing on the ground is the attack',
    },
  ],
  objectives: [
    {
      id: 'holdfast',
      text: 'Home is behind you.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      keystone: true,
      predicate: { kind: 'endure', ticks: 60 * SIM.TICK_HZ },
    },
  ],
};

interface Harness {
  match: Match;
  step(): void;
  settle(seconds: number): void;
  view(): MissionView | null;
  own(): EchoSnapshot | null;
  progress(id: string): number;
  status(id: string): ObjectiveStatus | undefined;
  eidOf(tag: 'quiet' | 'loud'): number;
  bellSigAt(x: number, y: number): number;
  driveTo(tag: 'quiet' | 'loud', x: number, y: number, seconds: number): void;
}

function harness(mission: MissionDefinition): Harness {
  const map = missionMapById(mission.mapId)!;
  const match = new Match(map, { mission, fauna: false, seed: SEED });
  let last: EchoSnapshot | null = null;
  let view: MissionView | null = null;

  const step = (): void => {
    const own = match.update(STEP_MS)?.get(PLAYER);
    if (own !== undefined) last = own;
    const next = match.takeMissionView();
    if (next !== null) view = next;
  };

  // The player's own hulls, in authored order — the same order the party
  // lists them, which is how a test names one without a tag registry.
  const eidOf = (tag: 'quiet' | 'loud'): number => {
    const units = last?.units ?? [];
    const index = tag === 'quiet' ? 0 : 1;
    return units[index]?.id ?? 0;
  };

  return {
    match,
    step,
    settle: (seconds) => {
      for (let tick = 0; tick < SIM.TICK_HZ * seconds; tick++) step();
    },
    view: () => view,
    own: () => last,
    progress: (id) => view?.objectives.find((o) => o.id === id)?.progress?.done ?? -1,
    status: (id) => view?.objectives.find((o) => o.id === id)?.status,
    eidOf,
    // The bells are entities this runtime placed for itself, so a test finds
    // one the way the water does: by where it is and how loud it is.
    // The loudest of them, because the commander's act hangs its own emitter
    // at an authored point that a row may share — this test's does.
    bellSigAt: (x, y) => {
      let sig = 0;
      for (const eid of staticEmitters(match.world)) {
        if (Math.hypot(Position.x[eid]! - x, Position.y[eid]! - y) > 1) continue;
        if (Acoustic.sig[eid]! > sig) sig = Acoustic.sig[eid]!;
      }
      return sig;
    },
    driveTo: (tag, x, y, seconds) => {
      for (let tick = 0; tick < SIM.TICK_HZ * seconds; tick++) {
        if (tick % 60 === 0) match.orderMove(PLAYER, eidOf(tag), x, y, false);
        step();
      }
    },
  };
}

/** Both hulls standing on the first row: the ceiling, with nothing else changed. */
const CEILING_MISSION: MissionDefinition = {
  ...WALK_MISSION,
  id: 'test-ceiling-mission',
  walk: { ...WALK_MISSION.walk!, rows: [WALK_MISSION.walk!.rows[0]!] },
  objectives: [{ ...WALK_MISSION.objectives[0]!, predicate: { kind: 'walk', count: 1 } }],
  parties: WALK_MISSION.parties.map((party) =>
    party.slot !== PLAYER
      ? party
      : {
          ...party,
          units: party.units.map((unit) =>
            unit.tag === 'loud' ? { ...unit, x: ROW_A.x + 60, y: ROW_A.y } : unit
          ),
        }
  ),
};

/** The concern's hull standing on the second row from the first tick. */
const STALL_MISSION: MissionDefinition = {
  ...WALK_MISSION,
  id: 'test-stall-mission',
  parties: WALK_MISSION.parties.map((party) =>
    party.slot === PLAYER
      ? party
      : {
          ...party,
          units: party.units.map((unit) => ({ ...unit, x: ROW_B.x + 80, y: ROW_B.y })),
        }
  ),
};

describe('the walk, as docs/mission-convocation.md §4 states it', () => {
  it('turns a row for a quiet hull, and does not turn one for a Corvette standing on it', () => {
    const h = harness(CEILING_MISSION);
    // Both hulls on the row. The tender alone would turn it; a Corvette at 28
    // breaks the ceiling by itself, silent or not, and that is §4's entire
    // argument rendered as a rule the player's hands find in ninety seconds.
    h.settle(HOLD_S + 1);
    assert.equal(h.progress('walk'), 0, 'the row turned with a Corvette standing on it');
    assert.equal(
      h.view()?.objectives.find((o) => o.id === 'walk')?.text,
      "That's still turning.",
      'the panel did not read the stall back to the player'
    );

    // One fact changed: the guns leave, and the row turns around the hull that
    // was standing there all along.
    h.driveTo('loud', OFF_ROW.x, OFF_ROW.y, 30);
    h.settle(HOLD_S + 2);
    assert.equal(
      h.match.missionOver?.outcome,
      MissionOutcome.Complete,
      'the row would not turn once the water was quiet'
    );
  });

  it('stalls a row for a hull that is not the plateau’s, and rings the bells on the restart', () => {
    const h = harness(STALL_MISSION);
    // The first row turns around the tender standing on it. The second is
    // already occupied by somebody who is not the plateau's, and who does not
    // fire and is not asked to.
    h.settle(HOLD_S + 1);
    assert.equal(h.progress('walk'), 1, 'the first row did not turn');
    assert.equal(h.bellSigAt(ROW_A.x, ROW_A.y), 0, 'a bell rang with nothing to ring about');

    // Ninety seconds of stall, here four: the circuit returns altered. Sampled
    // on the pass it happens, because a bell is a ring and not a state.
    let rangAtRestart = 0;
    for (let tick = 0; tick < SIM.TICK_HZ * (STALL_S + 3); tick++) {
      h.step();
      if (h.progress('walk') === 0) {
        rangAtRestart = h.bellSigAt(ROW_A.x, ROW_A.y);
        if (rangAtRestart > 0) break;
      }
    }
    assert.equal(h.progress('walk'), 0, 'the walk did not return altered');
    assert.ok(
      rangAtRestart > 0,
      'the walk restarted in silence — the restart is entirely made of bells'
    );
  });

  it('rings every bell, hastens the plateau and collapses the circuit, exactly once', () => {
    const h = harness(WALK_MISSION);
    h.settle(HOLD_S + 1);
    assert.equal(h.progress('walk'), 1, 'the first row did not turn');
    assert.equal(h.view()?.ability?.available, true, 'the act was not offered');

    assert.equal(h.match.commanderAbility(PLAYER), true, 'the act was refused the first time');
    assert.equal(
      h.match.commanderAbility(PLAYER),
      false,
      'the act was granted twice — there is one of these'
    );
    h.settle(1);

    // Every bell, not every unwalked one: a plateau does not announce half of
    // itself.
    assert.ok(h.bellSigAt(ROW_A.x, ROW_A.y) > 0, 'the first row did not ring');
    assert.ok(h.bellSigAt(ROW_B.x, ROW_B.y) > 0, 'the second row did not ring');

    // The fifteen seconds, on the player's own hulls inside the radius.
    const quiet = h.eidOf('quiet');
    assert.equal(
      h.match.world.commanderHaste.get(quiet),
      COMMANDER_ABILITY.CONVOCATION_SPEED_MULTIPLIER,
      'a hull inside the radius is not carrying the act'
    );
    assert.ok(
      h.match.world.commanderSilentImmune.has(quiet),
      "Silent Running's speed penalty was not lifted"
    );
    assert.equal(h.view()?.ability?.spent, true, 'the panel still offers the act');

    // It expires: fifteen seconds, not a standing condition.
    h.settle(ACT_S + 1);
    assert.equal(
      h.match.world.commanderHaste.size,
      0,
      'the act outlived its duration — a bonus that never ends is not a decision'
    );

    // And the circuit has stopped being a queue: the second row turns without
    // the walk having had to arrive at it in sequence.
    h.driveTo('quiet', ROW_B.x, ROW_B.y, 40);
    h.settle(HOLD_S + 2);
    assert.equal(
      h.match.missionOver?.outcome,
      MissionOutcome.Complete,
      'the remaining row did not turn'
    );
  });

  it('grants no act in a mission that authors none', () => {
    const h = harness(HOLD_MISSION);
    h.settle(1);
    assert.equal(h.view()?.ability, undefined, 'a mission with no act shipped one');
    assert.equal(h.match.commanderAbility(PLAYER), false, 'an act nobody authored was granted');
  });
});

describe('the Holdfast, as docs/mission-convocation.md §8 states it', () => {
  it('is taken by standing in it, and not by standing near it', () => {
    const h = harness(HOLD_MISSION);
    // The concern's hull opens in the far corner. Long enough for the hold to
    // have completed twice over if proximity counted.
    h.settle(HOLD_S + 3);
    assert.equal(h.status('holdfast'), ObjectiveStatus.Pending, 'the plateau was held from afar');
    const early = h.match.missionOver;
    assert.equal(early, null, 'the mission closed with nobody on the Holdfast');

    // Into it, and stood in it. Nothing is fired.
    for (let tick = 0; tick < SIM.TICK_HZ * 120; tick++) {
      if (tick % 60 === 0) h.match.orderMove(CONCERN, concernEid(h), 2625, 500, false);
      h.step();
      if (h.match.missionOver !== null) break;
    }
    assert.equal(h.status('holdfast'), ObjectiveStatus.Failed, 'the Holdfast was not taken');
    assert.equal(
      h.match.missionOver?.outcome,
      MissionOutcome.Lost,
      'an unmet keystone did not read the count as Lost'
    );
  });
});

/**
 * The concern's one hull, by entity id.
 *
 * Found through the world rather than through a snapshot, because there is no
 * snapshot for a scripted party — that is the whole point of `observe`. A test
 * may look; the mission may not, and `foreignPresence` is the only thing in the
 * runtime that does.
 */
function concernEid(h: Harness): number {
  for (const eid of movers(h.match.world)) {
    if (Owner.slot[eid] === CONCERN) return eid;
  }
  return 0;
}

describe('the Convocation literal, against its document', () => {
  const walk = SEEDING_CONVOCATION.walk!;

  it("walks §11's seven rows, in the document's order and at its coordinates", () => {
    assert.deepEqual(
      walk.rows.map((row) => [row.x, row.y]),
      [
        [1625, 500],
        [750, 875],
        [500, 1125],
        [1125, 1625],
        [1875, 1250],
        [2625, 625],
        [3375, 1000],
      ]
    );
    for (const row of walk.rows) assert.equal(row.radiusM, 400, `${row.id}: §11 authors 400 m`);
  });

  it('holds a row for sixty seconds under a ceiling of 26, and waits ninety before it restarts', () => {
    // §4: the ceiling is two above a moving tender's 18 and two below a
    // Corvette's 28, and it is the mission.
    assert.equal(walk.ceilingSig, 26);
    assert.equal(walk.holdTicks, 60 * SIM.TICK_HZ);
    assert.equal(walk.stallTicks, 90 * SIM.TICK_HZ);
    // §9 states the budget as the same ceiling, measured at the turning row —
    // the first budget in the campaign that is a place rather than a force.
    assert.equal(SEEDING_CONVOCATION.sigBudget, walk.ceilingSig);
  });

  it('rings at SIG 70 — the figure construction broadcasts at (§4.4)', () => {
    assert.equal(walk.bell.sig, 70);
    assert.equal(SEEDING_CONVOCATION.commanderAbility?.sig, 70);
  });

  it("carries characters.md's Convocation, both halves", () => {
    const act = SEEDING_CONVOCATION.commanderAbility!;
    assert.equal(act.radiusM, COMMANDER_ABILITY.CONVOCATION_RADIUS_M);
    assert.equal(act.speedMultiplier, COMMANDER_ABILITY.CONVOCATION_SPEED_MULTIPLIER);
    assert.equal(act.durationTicks, COMMANDER_ABILITY.CONVOCATION_DURATION_S * SIM.TICK_HZ);
    assert.equal(act.silentRunningImmunity, true, 'the immunity half is missing');
    // §13: "Build both halves or neither — a Convocation that made hulls fast
    // and did nothing to the vote is a speed buff in a mission about a vote."
    assert.equal(act.collapsesWalk, true, 'the bell does not collapse the circuit');
  });

  it('loses the plateau to sixty continuous seconds in the Holdfast, and closes there', () => {
    const hold = SEEDING_CONVOCATION.holds?.[0];
    assert.equal(hold?.region, 'holdfast');
    assert.equal(hold?.ticks, MISSION.FAILURE_TELEGRAPH_S * SIM.TICK_HZ);
    assert.equal(hold?.closes, true, '§9 resolves the mission at 14:00 if the Holdfast is held');
    const keystone = SEEDING_CONVOCATION.objectives.find((o) => o.id === hold?.objectiveId);
    assert.equal(keystone?.keystone, true, 'the one real failure is not the count’s keystone');
  });

  it('hands over active sonar and withholds only construction (§3, §4)', () => {
    const locked = SEEDING_CONVOCATION.locks.map((lock) => lock.ability);
    assert.deepEqual(locked, ['construction']);
  });

  it('reuses Tend’s map literal unchanged, which §11 chose it for', () => {
    assert.equal(SEEDING_CONVOCATION.mapId, SEEDING_TEND.mapId);
  });

  it('closes at 19:00 as a conclusion — a tide turning is not a timer', () => {
    const resolve = SEEDING_CONVOCATION.beats.find((beat) => beat.kind === 'resolve');
    assert.equal(resolve?.atTick, 19 * 60 * SIM.TICK_HZ);
    assert.equal(resolve?.kind === 'resolve' && resolve.conclusion, true);
  });
});
