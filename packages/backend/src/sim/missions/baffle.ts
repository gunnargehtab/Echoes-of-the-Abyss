/**
 * The Ledger 3 — Baffle. docs/mission-baffle.md, transcribed.
 *
 * A data literal in `sorrowgate.ts`'s idiom: no logic, no loader, and the
 * document owns every number. Where this file and that document disagree, one
 * of them is wrong and the fix says which.
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **The stations are moored in advance.** Two pre-built player Baffle
 *   Barges at the lay-bys — masking as logistics, installed by riggers before
 *   the convoy sailed (§4). The aura does the rest; nothing here adds to it.
 * - **The picket holds its water.** Two standing watches on authored legs,
 *   armed, engaging what stands into range and hunting nothing (§6). Their
 *   law is one `say` beat in the passive voice.
 * - **The cost is authored.** At 13:00 the northern station goes off the
 *   chart — a `lose` beat on a player structure, the first in the campaign —
 *   and the road home has one quiet chamber instead of two (§7).
 * - **The failure is the plant, and it has been audible since the first
 *   tick.** The yard's failing plant is an authored emitter missing beats
 *   down the trench's own carrying water, and the pack at 18:30 is the older
 *   warning in front of the 20:00 close (§8; campaign.md §10).
 */

import {
  Faction,
  FaunaSpecies,
  LEDGER_BAFFLE_HEADER,
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
/** Reserved with no party in it, exactly as the other Ledger missions reserve it. */
const COURT = 1;
/** The Fourth Trench picket — two standing watches under their own law. */
const PICKET = 2;
/** The Deep Yard — forty-one souls, whose only asset in the water is a sound. */
const YARD = 3;

export const LEDGER_BAFFLE: MissionDefinition = {
  ...LEDGER_BAFFLE_HEADER,
  doc: 'docs/mission-baffle.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Bathyarch,
  courtSlot: COURT,
  /** §5 — the pack is authored; a mission owns its own Drift. */
  fauna: false,
  /** §4 — 65, the Klaxon working level, mission 1's figure aimed down a corridor. */
  sigBudget: 65,
  // No arrayTag: no silence order, no ledger. The picket is not a court either.
  silenceCeilingSig: 100,
  debtCapS: 0,
  /**
   * §8 — the barge is deaf freight again, and this corridor prices deafness:
   * Sorrowgate's hold, with guns outside it. Non-zero for the first time
   * since the prologue.
   */
  escortRadiusM: 450,

  regions: [
    {
      id: 'yard-berth',
      x: 750,
      y: 4250,
      widthM: 1500,
      heightM: 500,
      note: "The Deep Yard's berths — where the plant lands and the writ counts the column",
    },
  ],

  markers: [
    {
      id: 'yard',
      label: 'The Deep Yard. The arithmetic closes at the whistle.',
      x: 1500,
      y: 4500,
      radiusM: 500,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Bathyarch,
      note: 'The relief convoy, under writ, unfiled (§2)',
      units: [
        // The Klaxon escort — armed, because the gate fights are the bill and
        // the writ funds paying it (§3).
        {
          tag: 'flagship',
          kind: UnitKind.Cruiser,
          x: 1500,
          y: 300,
          depthM: 1000,
          role: 'escort',
          armed: true,
          note: 'The Klaxon anchor, third mission running — audible end to end, which is the doctrine',
        },
        {
          tag: 'corvette-1',
          kind: UnitKind.Corvette,
          x: 1380,
          y: 250,
          depthM: 1000,
          role: 'escort',
          armed: true,
          note: 'The working escort — the guns that finish what the corridor forces',
        },
        {
          tag: 'corvette-2',
          kind: UnitKind.Corvette,
          x: 1620,
          y: 250,
          depthM: 1000,
          role: 'escort',
          armed: true,
          note: '',
        },
        // The slow thing. Deaf, unarmed, and the entire mission — it moves
        // only with an escort in earshot (§3, §8).
        {
          tag: 'plant-barge',
          kind: UnitKind.Harvester,
          x: 1500,
          y: 420,
          depthM: 1000,
          role: 'tender',
          note: 'The compressor barge — Vail rides it, and forty-one berths ride the crate',
        },
      ],
      structures: [
        // §4 — quiet ground, made in advance, by riggers. Moored, charted,
        // and not required to be secret: what a station sells is not secrecy
        // but ground.
        {
          tag: 'baffle-north',
          kind: StructureKind.BaffleBarge,
          x: 1125,
          y: 1875,
          depthM: 1650,
          note: 'The northern station, moored in Lay-by One — off the chart at 13:00 (§7)',
        },
        {
          tag: 'baffle-south',
          kind: StructureKind.BaffleBarge,
          x: 1875,
          y: 3125,
          depthM: 1650,
          note: 'The southern station, Lay-by Two — the last quiet water in the mission',
        },
      ],
    },
    {
      slot: PICKET,
      faction: Faction.Directorate,
      note: 'The Fourth Trench picket — attending a closed trench under their own law. Counting, until counting is not enough (§5)',
      units: [
        {
          tag: 'picket-one-a',
          kind: UnitKind.AbyssalSubmersible,
          x: 1400,
          y: 1150,
          depthM: 1600,
          armed: true,
          note: "The first watch, at the trench's first bend",
        },
        {
          tag: 'picket-one-b',
          kind: UnitKind.AbyssalSubmersible,
          x: 1600,
          y: 1200,
          depthM: 1600,
          armed: true,
          note: '',
        },
        {
          tag: 'picket-two-a',
          kind: UnitKind.AbyssalSubmersible,
          x: 1400,
          y: 3750,
          depthM: 1600,
          armed: true,
          note: 'The far watch, across the trench mouth between the convoy and the yard',
        },
        {
          tag: 'picket-two-b',
          kind: UnitKind.AbyssalSubmersible,
          x: 1600,
          y: 3780,
          depthM: 1600,
          armed: true,
          note: '',
        },
      ],
    },
    {
      slot: YARD,
      faction: Faction.Bathyarch,
      note: 'The Deep Yard — on the channel by the only voice it has left (§5)',
      units: [],
      emitters: [
        // §8 — the mission's clock and its stakes in one diegetic sound: the
        // failing plant, periodic, missing beats, audible down the trench's
        // own carrying water from the first tick. It stops at the whistle
        // because that is what failing means.
        {
          tag: 'yard-plant',
          x: 1500,
          y: 4500,
          depthM: 1640,
          sig: 35,
          periodTicks: 8 * SIM.TICK_HZ,
          onTicks: 2 * SIM.TICK_HZ,
          hp: 900,
          untilTick: T(20),
          note: "Forty-one people's plant, asking where the convoy is",
        },
      ],
    },
  ],

  /**
   * §3 — the ping is handed over this mission, per campaign.md §10, so for
   * the first time in the campaign `activeSonar` is not on this list.
   */
  locks: [
    {
      ability: 'construction',
      reason: 'closed water under a standing claim — the writ moves one plant and builds nothing',
    },
  ],

  /** §12's "Objective readings, in play", verbatim. */
  objectives: [
    {
      id: 'the-plant',
      text: "Deliver the plant to the yard's berth. The arithmetic closes at the whistle.",
      initial: ObjectiveStatus.Pending,
      markerId: 'yard',
      terminal: true,
      // The keystone: machinery, escort and honour delivered without the
      // compressor read as "the yard goes dark" — forty-one people do not
      // breathe a moral victory (§8).
      keystone: true,
      predicate: { kind: 'extract', role: 'tender', region: 'yard-berth', count: 1 },
    },
    {
      id: 'the-column',
      text: 'Bring the column out of what the corridor costs. The exchange is entered either way.',
      initial: ObjectiveStatus.Pending,
      markerId: 'yard',
      // The writ counts the column at the berth: a straggler mid-trench when
      // the plant lands is not out of the corridor, and the count does not
      // wait for it.
      predicate: { kind: 'extract', role: 'escort', region: 'yard-berth', count: 3 },
      reading: {
        met: 'The column stands off the yard, whole. Three hulls entered the trench and three are at the berth, which the registry notes without comment because there is no column for the comment to go in.',
        unmet:
          'The exchange is entered at cost. The registry prices hulls to the nodule and does not price the rest, and the file notes, as it always notes, that the rest exists.',
      },
    },
  ],

  /**
   * §9's beat table, in its order. Twenty minutes, closing at the whistle.
   *
   * The watches' legs are authored transits on their own clock — a picket
   * holds its water and hunts nothing — and the convoy's movement is all the
   * player's. The pack at 18:30 is the telegraph: ninety seconds of loud,
   * rising arrival in front of the close, on top of a plant that has been
   * missing beats since the first tick.
   */
  beats: [
    // 01:30 — Vail, on the plant (§12).
    {
      atTick: T(1, 30),
      kind: 'say',
      speaker: 'Lift Foreman Dessa Vail',
      text: "Hear that beat missing? That's forty-one people's plant asking where we are. I've rigged lifts for this concern for nineteen years and that is the first cargo that ever wrote back.",
      note: 'Read, not heard — the standing status of the say channel',
    },

    // 04:00 — the first challenge: the law, once, in the passive voice (§6).
    {
      atTick: T(4),
      kind: 'say',
      speaker: 'Picket-Speaker, Fourth Trench Cohort',
      text: 'The trench is closed while the inquiry is open. What enters it is not being threatened. It is being counted.',
      note: '',
    },

    // 05:00–10:00 — the first watch walks its beat at the first bend, north
    // of Lay-by One, on its own clock (§6, §9).
    { atTick: T(5), kind: 'move', tag: 'picket-one-a', x: 1450, y: 1000, note: 'The first watch' },
    { atTick: T(5), kind: 'move', tag: 'picket-one-b', x: 1550, y: 1050, note: '' },
    { atTick: T(6, 30), kind: 'move', tag: 'picket-one-a', x: 1450, y: 1300, note: '' },
    { atTick: T(6, 30), kind: 'move', tag: 'picket-one-b', x: 1550, y: 1300, note: '' },
    { atTick: T(8), kind: 'move', tag: 'picket-one-a', x: 1450, y: 1050, note: '' },
    { atTick: T(8), kind: 'move', tag: 'picket-one-b', x: 1550, y: 1100, note: '' },
    {
      atTick: T(9, 30),
      kind: 'move',
      tag: 'picket-two-a',
      x: 1450,
      y: 3800,
      note: 'The far watch stirs',
    },
    { atTick: T(9, 30), kind: 'move', tag: 'picket-two-b', x: 1550, y: 3790, note: '' },
    { atTick: T(10), kind: 'move', tag: 'picket-one-a', x: 1450, y: 1250, note: '' },
    { atTick: T(10), kind: 'move', tag: 'picket-one-b', x: 1550, y: 1250, note: '' },
    { atTick: T(11, 30), kind: 'move', tag: 'picket-two-a', x: 1450, y: 3700, note: '' },
    { atTick: T(11, 30), kind: 'move', tag: 'picket-two-b', x: 1550, y: 3710, note: '' },

    // 13:00 — the cost, authored (§7): the northern station goes off the
    // chart at its mooring, and the road home has one quiet chamber left.
    {
      atTick: T(13),
      kind: 'lose',
      tag: 'baffle-north',
      note: 'A cutter cohort corrects the mooring. The convoy is past it; the way back is not',
    },
    {
      atTick: T(13),
      kind: 'say',
      speaker: 'Picket-Speaker, Fourth Trench Cohort',
      text: 'A mooring was found in closed water. It was not in any charter. It has been corrected.',
      note: '',
    },

    { atTick: T(14, 30), kind: 'move', tag: 'picket-two-a', x: 1450, y: 3780, note: '' },
    { atTick: T(14, 30), kind: 'move', tag: 'picket-two-b', x: 1550, y: 3800, note: '' },
    { atTick: T(16), kind: 'move', tag: 'picket-two-a', x: 1450, y: 3705, note: '' },
    { atTick: T(16), kind: 'move', tag: 'picket-two-b', x: 1550, y: 3700, note: '' },

    // 17:30 — the yard can hear the convoy coming, and calls that the plan
    // working (§12).
    {
      atTick: T(17, 30),
      kind: 'say',
      speaker: 'Yardmaster Brann Holt',
      text: 'Yard to convoy: we can hear you. We have been able to hear you for ten minutes. Nobody down here is calling that a defect in the plan.',
      note: '',
    },

    // 18:30 — the pack arrives up the axis, loud, drawn by everything the
    // last eighteen minutes were: the telegraph, ninety seconds in front of
    // the whistle (§8; campaign.md §10).
    {
      atTick: T(18, 30),
      kind: 'creature',
      tag: 'pack-a',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 1450, y: 4000, depthM: 1600 },
      driveTo: { x: 1450, y: 2500 },
      untilTick: T(19, 30),
      loud: true,
      note: 'The bill for twenty minutes of gunfire and transmission, arriving',
    },
    {
      atTick: T(18, 30),
      kind: 'creature',
      tag: 'pack-b',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 1550, y: 3950, depthM: 1600 },
      driveTo: { x: 1500, y: 2600 },
      untilTick: T(19, 30),
      loud: true,
      note: '',
    },
    {
      atTick: T(18, 30),
      kind: 'creature',
      tag: 'pack-c',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 1500, y: 4050, depthM: 1600 },
      driveTo: { x: 1550, y: 2550 },
      untilTick: T(19, 30),
      loud: true,
      note: '',
    },

    // 20:00 — the yard's plant fails. Whatever is berthed is the relief;
    // whatever is not is the file (§8).
    { atTick: T(20), kind: 'resolve', note: 'The writ closes at the count' },
  ],

  /**
   * §8's Results, verbatim. Partial is unreachable by the ladder — one
   * terminal objective, keystoned — and authored anyway, because an epilogue
   * with a hole in it is a close the runtime cannot read.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      "The plant is berthed and turning. The yard's air arithmetic closes in the black. The trench remains, formally, closed; the registry records a delivery it does not record a route for.",
    [MissionOutcome.Partial]:
      'Half a relief is not a reading the yard’s arithmetic recognises. The registry enters what berthed, and the file continues.',
    [MissionOutcome.Lost]:
      "The yard's plant fails on schedule. Evacuation under Directorate observation begins at the next tide, and the registry opens a file it has opened before. The Board is advised that the shortfall was not arithmetical.",
  },
};
