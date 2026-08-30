/**
 * The Ledger 2 — Shift Change. docs/mission-shift-change.md, transcribed.
 *
 * A data literal in `sorrowgate.ts`'s idiom: no logic, no loader, and the
 * document owns every number — the regions, the beat times, the quota, the
 * berthing lists. Where this file and that document disagree, one of them is
 * wrong and the fix says which.
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **The number is real.** The map authors two nodule fields and this file
 *   seats the refinery, so the cover story is a working economy because the
 *   economy is working. The quota is the `deliver` predicate's first authored
 *   figure (§8).
 * - **The audit is a sweep with a filed plan.** Two road passes are its
 *   windows, its legs are `move` beats the briefing announces at muster, and
 *   the docked interval is simply not a window (§6). Filed is a minute
 *   appended to whatever the shift earned, never a failure.
 * - **The watches are held to the shift's clock.** Three barges, three
 *   `releaseTick` holds, three release beats — the watches stand down on the
 *   bell whatever the audit's road schedule is doing, which is the thread the
 *   mission is made of (§9).
 * - **The close assembles.** Two objectives, each with a met and an unmet
 *   reading, so "half the business" says which half (§8; types.ts,
 *   `reading`).
 */

import {
  Faction,
  FaunaSpecies,
  LEDGER_SHIFT_CHANGE_HEADER,
  MissionOutcome,
  ObjectiveStatus,
  SIM,
  StructureKind,
  UnitKind,
} from '@echoes/shared';

import type { MissionDefinition } from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/** Reserved with no party in it, exactly as Asset Recovery reserves it. */
const COURT = 1;
/** The Board's audit pair — Risk & Actuarial, on a filed transit plan. */
const AUDIT = 2;

/** §8 — four harvesters' standard tide with weather in it. */
const QUOTA = 3600;

export const LEDGER_SHIFT_CHANGE: MissionDefinition = {
  ...LEDGER_SHIFT_CHANGE_HEADER,
  doc: 'docs/mission-shift-change.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Bathyarch,
  courtSlot: COURT,
  /** §7 — the pack is authored; ambient seeding would add weather the document did not place. */
  fauna: false,
  /**
   * §4 — 50, as a working level: the Standard-throttle band a producing face
   * holds. The playtest adversary is the player who creeps.
   */
  sigBudget: 50,
  // No arrayTag: no silence order, no ledger. The audit is not a court.
  silenceCeilingSig: 100,
  debtCapS: 0,
  /** The barges move on the shift's orders; their escort is a schedule, not ears. */
  escortRadiusM: 0,

  regions: [
    {
      id: 'railhead',
      x: 1500,
      y: 0,
      widthM: 1000,
      heightM: 500,
      note: 'The Fivewell rail transfer — berths, registry office, where a watch transfers at grade',
    },
  ],

  markers: [
    {
      id: 'railhead',
      label: 'The Fivewell rail transfer. Berths are held for the watches.',
      x: 2000,
      y: 250,
      radiusM: 500,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Bathyarch,
      note: "Face Two's working shift — four harvesters, three crew barges, and the number to make (§2)",
      units: [
        // The face crews' hulls. No roles: nothing in the mission counts a
        // harvester, and the throttle needs no counter to be the lesson.
        {
          tag: 'harvester-one',
          kind: UnitKind.Harvester,
          x: 800,
          y: 2150,
          depthM: 1300,
          note: "Face Two's first pair, on the last seam",
        },
        {
          tag: 'harvester-two',
          kind: UnitKind.Harvester,
          x: 950,
          y: 2150,
          depthM: 1300,
          note: '',
        },
        {
          tag: 'harvester-three',
          kind: UnitKind.Harvester,
          x: 800,
          y: 2350,
          depthM: 1300,
          note: 'The second pair, for Face Five — the quota leans on the rich field (§11)',
        },
        {
          tag: 'harvester-four',
          kind: UnitKind.Harvester,
          x: 950,
          y: 2350,
          depthM: 1300,
          note: '',
        },
        // The watches. Deaf, slow, and carrying everything this mission is
        // actually about (§3). Held to the shift's clock, released in order.
        {
          tag: 'barge-one',
          kind: UnitKind.Harvester,
          x: 700,
          y: 2250,
          depthM: 1300,
          role: 'crew',
          releaseTick: T(3),
          souls: 26,
          note: 'First watch — twenty-six names, standing down at the first bell',
        },
        {
          tag: 'barge-two',
          kind: UnitKind.Harvester,
          x: 700,
          y: 2350,
          depthM: 1300,
          role: 'crew',
          releaseTick: T(8),
          souls: 25,
          note: 'Second watch — twenty-five names',
        },
        {
          tag: 'barge-three',
          kind: UnitKind.Harvester,
          x: 700,
          y: 2150,
          depthM: 1300,
          role: 'crew',
          releaseTick: T(11),
          souls: 20,
          note: 'Third watch — twenty names, the watch that works to the whistle',
        },
      ],
      structures: [
        // The deposit point, below the layer, so the hum and its residue live
        // in the masked half of the map (§11).
        {
          tag: 'refinery',
          kind: StructureKind.Refinery,
          x: 2000,
          y: 1750,
          depthM: 1300,
          note: 'The Downworks refinery — the loudest permanent thing the shift owns, and expected',
        },
      ],
    },
    {
      slot: AUDIT,
      faction: Faction.Bathyarch,
      note: 'The audit pair — Risk & Actuarial, Underwriter Baen Tull on the lead hull. On a filed plan; hunting nobody (§6)',
      units: [
        {
          tag: 'audit-a',
          kind: UnitKind.Corvette,
          x: 125,
          y: 700,
          depthM: 700,
          note: "The lead hull, Tull's",
        },
        {
          tag: 'audit-b',
          kind: UnitKind.Corvette,
          x: 125,
          y: 800,
          depthM: 700,
          note: '',
        },
      ],
    },
  ],

  /**
   * §6 — the audit's ears, as Tend's sweep reused whole: two road passes are
   * the windows, and the docked interval between them is simply not one. The
   * minute is appended to whatever the shift earned; filed and unfiled cross
   * with the work freely.
   */
  sweep: {
    tags: ['audit-a', 'audit-b'],
    windows: [
      { fromTick: T(4), untilTick: T(6, 30) },
      { fromTick: T(10), untilTick: T(13) },
    ],
    filedReading:
      "The audit's minute is appended. A hull was resolved on the road during a filed pass and did not reconcile against the transit plan; the irregularity is referred upward. Grades named in a referred minute transfer at pool rate until the referral closes, and the Division notes that no referral of this class has closed in under a year.",
    note: 'Two passes on the High Road, docked at the rail between — the plan is on the board at muster',
  },

  /**
   * §3 — what the shift does not carry, as dead affordances with the works
   * order's reasons shown.
   */
  locks: [
    {
      ability: 'weapons',
      reason: 'not fielded — the shift is a works order, not a writ',
    },
    {
      ability: 'activeSonar',
      reason: 'not carried — a survey array is not shift equipment',
    },
    {
      ability: 'construction',
      reason: 'the face is under closure review, not expansion',
    },
  ],

  /**
   * §12's "Objective readings, in play", verbatim, with §8's close readings
   * authored per objective — the first mission to use `reading`, because
   * "half the business" is one outcome with two possible columns filled.
   */
  objectives: [
    {
      id: 'the-number',
      text: 'Make the number. The face reports what it always reports.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      predicate: { kind: 'deliver', nodules: QUOTA },
      reading: {
        met: 'The number is entered. Three thousand six hundred, of quota. Nothing in the column invites a second reading.',
        unmet:
          'The shortfall is entered. Shortfalls on a face under review are read twice, and the second reading is not about the face.',
      },
    },
    {
      id: 'the-watches',
      text: 'Stand the watches down in order. Berth them at the rail, at grade.',
      initial: ObjectiveStatus.Pending,
      markerId: 'railhead',
      terminal: true,
      predicate: { kind: 'extract', role: 'crew', region: 'railhead', count: 3 },
      reading: {
        met: 'Three barges berthed. Seventy-one names transfer at grade under standing works orders, and the orders were, throughout, correct.',
        unmet:
          'The berthing lists are short. What berthed transferred at grade; what did not reverts to pool with the closure, and the register does not call that a tragedy either.',
      },
    },
  ],

  /**
   * §9's beat table, in its order. Sixteen minutes, closing at the whistle.
   *
   * The audit's passes are authored as legs with loiters between them — an
   * auditor pauses and listens, and a corvette that sprinted the road in one
   * order would cross it in under a minute. The player's own hulls are never
   * ordered anywhere; the watches stand down and the rest is the shift's.
   */
  beats: [
    // 00:00 — the pack on the Downworks, at rest. Present, audible at the
    // edge of hearing, and uninterested in a field that is merely working
    // (§7). It commits to nothing; it is here so the player's ears learn what
    // a pack at rest sounds like.
    {
      atTick: 0,
      kind: 'creature',
      tag: 'pack-a',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 2300, y: 1700, depthM: 1250 },
      driveTo: { x: 2400, y: 1650 },
      untilTick: T(0, 20),
      loud: false,
      note: 'The pack that shadows every producing face on the Vein — the weather, at rest',
    },
    {
      atTick: 0,
      kind: 'creature',
      tag: 'pack-b',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 2450, y: 1800, depthM: 1250 },
      driveTo: { x: 2500, y: 1750 },
      untilTick: T(0, 20),
      loud: false,
      note: '',
    },
    {
      atTick: 0,
      kind: 'creature',
      tag: 'pack-c',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 2200, y: 1850, depthM: 1250 },
      driveTo: { x: 2250, y: 1800 },
      untilTick: T(0, 20),
      loud: false,
      note: '',
    },

    // 01:00 — the shift briefing that is not in the minutes (§12).
    {
      atTick: T(1),
      kind: 'say',
      speaker: 'Foreman Corwin Osk',
      text: 'The review will read this shift twice, so we run it clean twice over. Number on the board, watches on the bell, and the road hears a working face. It is not a performance. It is the face working. There is a difference, and the difference is what an auditor is paid to hear.',
      note: 'Read, not heard — the standing status of the say channel',
    },

    // 03:00 — first watch stands down (§9).
    { atTick: T(3), kind: 'release', tag: 'barge-one', note: 'First watch stands down' },

    // 04:00–06:15 — pass one: the pair walks the road west to east, in legs,
    // listening the whole way. The sweep's first window covers it.
    { atTick: T(4), kind: 'move', tag: 'audit-a', x: 1000, y: 700, note: 'Pass one opens' },
    { atTick: T(4), kind: 'move', tag: 'audit-b', x: 1000, y: 800, note: '' },
    { atTick: T(4, 45), kind: 'move', tag: 'audit-a', x: 2000, y: 700, note: '' },
    { atTick: T(4, 45), kind: 'move', tag: 'audit-b', x: 2000, y: 800, note: '' },
    { atTick: T(5, 30), kind: 'move', tag: 'audit-a', x: 3000, y: 700, note: '' },
    { atTick: T(5, 30), kind: 'move', tag: 'audit-b', x: 3000, y: 800, note: '' },
    { atTick: T(6, 15), kind: 'move', tag: 'audit-a', x: 3875, y: 700, note: 'Pass one closes' },
    { atTick: T(6, 15), kind: 'move', tag: 'audit-b', x: 3875, y: 800, note: '' },

    // 06:30 — the pair docks at the rail and reads the registry. The window
    // is closed; the water in front of the dock is not an instrument (§6).
    { atTick: T(6, 30), kind: 'move', tag: 'audit-a', x: 2450, y: 200, note: 'Docked at the rail' },
    { atTick: T(6, 30), kind: 'move', tag: 'audit-b', x: 2450, y: 300, note: '' },
    {
      atTick: T(6, 30),
      kind: 'say',
      speaker: 'Underwriter Baen Tull',
      text: 'Registry current. Throughput within band of projection. Note for the file: the projection is the terminal one, and the face is meeting it. Meeting a terminal projection is not an anomaly. It is the only compliance this face has left.',
      note: 'The audit channel, docked',
    },

    // 08:00 — second watch stands down, into the docked interval or into pass
    // two, depending on how well the player read the board (§9).
    { atTick: T(8), kind: 'release', tag: 'barge-two', note: 'Second watch stands down' },

    // 10:00–12:45 — pass two: the road back, east to west, the same ears the
    // other way, on the road's southern half.
    { atTick: T(10), kind: 'move', tag: 'audit-a', x: 3000, y: 875, note: 'Pass two opens' },
    { atTick: T(10), kind: 'move', tag: 'audit-b', x: 3000, y: 775, note: '' },
    { atTick: T(10, 45), kind: 'move', tag: 'audit-a', x: 2000, y: 875, note: '' },
    { atTick: T(10, 45), kind: 'move', tag: 'audit-b', x: 2000, y: 775, note: '' },

    // 11:00 — third watch stands down with the pass still on the road: the
    // mission's one genuinely tight thread (§9).
    { atTick: T(11), kind: 'release', tag: 'barge-three', note: 'Third watch stands down' },
    {
      atTick: T(11),
      kind: 'say',
      speaker: 'Foreman Corwin Osk',
      text: "Three's away when Three is clear, not when Three is due. The rail has kept berths empty for two hundred years; it can keep them one more pass.",
      note: '',
    },

    { atTick: T(11, 30), kind: 'move', tag: 'audit-a', x: 1000, y: 875, note: '' },
    { atTick: T(11, 30), kind: 'move', tag: 'audit-b', x: 1000, y: 775, note: '' },
    { atTick: T(12, 45), kind: 'move', tag: 'audit-a', x: 125, y: 875, note: 'Pass two closes' },
    { atTick: T(12, 45), kind: 'move', tag: 'audit-b', x: 125, y: 775, note: '' },

    // 13:00 — the pair departs for the Holding. Free water to the whistle.
    { atTick: T(13), kind: 'move', tag: 'audit-a', x: 250, y: 125, note: 'The audit departs' },
    { atTick: T(13), kind: 'move', tag: 'audit-b', x: 350, y: 125, note: '' },

    // 13:30 — loaded (§12).
    {
      atTick: T(13, 30),
      kind: 'say',
      speaker: 'Lift Foreman Dessa Vail',
      text: 'Berthing lists closed and under way. Twenty souls and their grades aboard, and the grades are the cargo.',
      note: '',
    },

    // 16:00 — the whistle. A conclusion, not a timer: the shift ends, the
    // announcement arrives one bell behind the report, and the close reads
    // what the shift did with the window it never knew it had (§7, §8).
    {
      atTick: T(16),
      kind: 'resolve',
      conclusion: true,
      note: 'The whistle, and the announcement one bell behind it',
    },
  ],

  /**
   * §8's Results table, verbatim — the review's three readings. The watch and
   * quota readings are assembled beneath whichever of these the run earned,
   * and a filed audit minute is appended to any of them.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      "Face Two reports three thousand six hundred, of quota, on schedule. Seventy-one berths transfer at grade under standing works orders. The closure review will find the face orderly, current, and empty. The Board's announcement follows this report by one bell.",
    [MissionOutcome.Partial]:
      'The shift closes on half its business. What was made is entered. What was moved is entered. What was neither is entered too, and the review will read all three columns.',
    [MissionOutcome.Lost]:
      'Face Two reports a failed shift in its final tide. The review notes that the face was neither productive nor orderly, and prices the closure accordingly. The berthing lists revert to pool.',
  },
};
