/**
 * The Ledger 7 — Item Nine. docs/mission-item-nine.md, transcribed.
 *
 * A data literal in `sorrowgate.ts`'s idiom: no logic, no loader, and the
 * document owns every number. Where this file and that document disagree, one
 * of them is wrong and the fix says which.
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **The close is a conclusion.** The session runs its length whatever the
 *   chair does; the mission cannot be lost, only decided (§7, §8).
 * - **The decision is a latch, not a branch.** One outcome, two records: the
 *   ending is the tolerance objective's met or unmet reading beneath the
 *   close, so neither ending is graded — campaign.md §9, kept mechanically.
 * - **The chair's words fire on the record, not the clock** — a conditional
 *   on the two-second tolerance, the format's own arrangement for everything
 *   irreversible (§4, §9).
 * - **The minutes assemble.** Nine windowed items, each with an entered and a
 *   gap reading — the year, restated as an agenda, heard from the rail (§6).
 */

import {
  Faction,
  LEDGER_ITEM_NINE_HEADER,
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  SIM,
  UnitKind,
} from '@echoes/shared';

import type { MissionDefinition, MissionEmitter } from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/** Reserved with no party in it, exactly as the other Ledger missions reserve it. */
const COURT = 1;
/** The session — nine items, whose only assets in the water are sounds. */
const SESSION = 2;
/** The registry watch — what "the open record" physically means. */
const REGISTRY = 3;

/** §4 — any two seconds of Classification is the record. */
const RECORD_TICKS = 2 * SIM.TICK_HZ;

/** §6 — items are struck in sequence, roughly seventy seconds apiece from 01:00. */
const ITEM_S = 70;
const item = (
  ordinal: number,
  tag: string,
  x: number,
  reading: { entered: string; gap: string },
  note: string
): MissionEmitter => ({
  tag,
  x,
  y: 1650,
  depthM: 1300,
  sig: 30,
  periodTicks: 5 * SIM.TICK_HZ,
  onTicks: 1 * SIM.TICK_HZ,
  hp: 3000,
  fromTick: T(1) + (ordinal - 1) * ITEM_S * SIM.TICK_HZ,
  untilTick: T(1) + ordinal * ITEM_S * SIM.TICK_HZ,
  reading,
  note,
});

export const LEDGER_ITEM_NINE: MissionDefinition = {
  ...LEDGER_ITEM_NINE_HEADER,
  doc: 'docs/mission-item-nine.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Bathyarch,
  courtSlot: COURT,
  /** §7 — nothing answers. That is the ending. */
  fauna: false,
  /** §4 — 30: the rail's level. The mission is not tuned against the player. */
  sigBudget: 30,
  silenceCeilingSig: 100,
  debtCapS: 0,
  escortRadiusM: 0,

  regions: [],

  markers: [
    {
      id: 'the-rail',
      label: 'The rail of the chamber. The sitting is listened to from here.',
      x: 2000,
      y: 1900,
      radiusM: 400,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Bathyarch,
      note: "The chair's flight — her barge and two escorts, at the rail for the sitting (§2)",
      units: [
        {
          tag: 'the-seat',
          kind: UnitKind.Harvester,
          x: 2000,
          y: 1900,
          depthM: 1250,
          role: 'flight',
          note: 'The seat, the array, and the decision',
        },
        {
          tag: 'escort-1',
          kind: UnitKind.Corvette,
          x: 1880,
          y: 1950,
          depthM: 1250,
          role: 'flight',
          note: 'Ears for the barge, standing for the office',
        },
        {
          tag: 'escort-2',
          kind: UnitKind.Corvette,
          x: 2120,
          y: 1950,
          depthM: 1250,
          role: 'flight',
          note: '',
        },
      ],
    },
    {
      slot: SESSION,
      faction: Faction.Bathyarch,
      note: 'The session — nine items, struck in sequence on the old hull: the year, being entered (§6)',
      units: [],
      emitters: [
        item(
          1,
          'item-one',
          1950,
          {
            entered:
              "Item One is entered: the Vein's closure accounts. Nine faces, two centuries, one seal; the file closes balanced, which took some doing.",
            gap: 'Item One was not attended. The Vein closed anyway; the minutes hold its number only.',
          },
          "The year's first file"
        ),
        item(
          2,
          'item-two',
          2050,
          {
            entered:
              "Item Two: the Fivewell consolidation, ratified. The berthing schedules are annexed to the closure file, and the review's reading of them is its own.",
            gap: 'Item Two was not attended; the consolidation carried unheard.',
          },
          ''
        ),
        item(
          3,
          'item-three',
          1950,
          {
            entered:
              "Item Three: the Fourth Trench inquiry, fee schedule and standing. The concern's position is unchanged and is re-entered unchanged, which is what a position is.",
            gap: 'Item Three was not attended; the position stands regardless, as positions do.',
          },
          ''
        ),
        item(
          4,
          'item-four',
          2050,
          {
            entered:
              "Item Four: the Underworks file, read into record without discussion. The chamber is quiet for the length of the reading. The minutes note the quiet, per the chair's standing instruction.",
            gap: 'Item Four was not attended. The quiet was kept anyway.',
          },
          ''
        ),
        item(
          5,
          'item-five',
          1950,
          {
            entered:
              "Item Five: the Division's model, accepted under seal. One column is noted open. The note is sealed with it.",
            gap: 'Item Five was not attended; the seal does not mind.',
          },
          ''
        ),
        item(
          6,
          'item-six',
          2050,
          {
            entered:
              'Item Six: the rim field, entered on the registry. The page kept blank for eleven years is written, and the projection acquires the floor the Board has been sitting over since the ninth year of decline.',
            gap: 'Item Six was not attended. The field is on the registry all the same.',
          },
          ''
        ),
        item(
          7,
          'item-seven',
          1950,
          {
            entered:
              "Item Seven: the third-rating certificates, amortised across the field's first decade. The yards are thanked in the register's way, which is payment.",
            gap: 'Item Seven was not attended; the yards were paid regardless.',
          },
          ''
        ),
        item(
          8,
          'item-eight',
          2050,
          {
            entered:
              'Item Eight: the annual review of the berth rate. Held, again. The alternative is re-modelled, again, and the model says what it has said for two centuries, and the Board lives with it, again. Entered.',
            gap: 'Item Eight was not attended. It will be back next year; it always is.',
          },
          ''
        ),
        item(
          9,
          'item-nine',
          2000,
          {
            entered:
              "Item Nine. Classified by continuance one hundred and twenty-six years. What the minutes may hold of tonight's ninth item is above, in the record's own line, and nowhere else.",
            gap: 'Item Nine was called. The flight did not attend the call, which the minutes note without believing.',
          },
          'The ninth (§6)'
        ),
      ],
    },
    {
      slot: REGISTRY,
      faction: Faction.Bathyarch,
      note: 'The registry watch — the ears that hold a copy of whatever is said out loud (§5)',
      units: [
        {
          tag: 'registry-a',
          kind: UnitKind.Corvette,
          x: 750,
          y: 500,
          depthM: 1150,
          note: '',
        },
        {
          tag: 'registry-b',
          kind: UnitKind.Corvette,
          x: 650,
          y: 400,
          depthM: 1150,
          note: '',
        },
      ],
    },
  ],

  /** §3 — struck at the chamber door; the array, pointedly, is not on this list. */
  locks: [
    {
      ability: 'weapons',
      reason: 'struck — no weapon has entered the Underway since the concern was chartered',
    },
    {
      ability: 'torpedoes',
      reason: 'struck — no weapon has entered the Underway since the concern was chartered',
    },
    {
      ability: 'construction',
      reason: 'the Underway is not a works site',
    },
  ],

  /** §12's "Objective readings, in play", verbatim. */
  objectives: [
    {
      id: 'the-session',
      text: 'Hold the flight at the rail. A sitting is listened to, and the chamber knows a shove when it hears one.',
      initial: ObjectiveStatus.Pending,
      markerId: 'the-rail',
      terminal: true,
      predicate: { kind: 'endure', ticks: T(11, 30) },
    },
    {
      id: 'the-minutes',
      text: 'Attend the items. What is heard is entered; the minutes hold the gaps too.',
      initial: ObjectiveStatus.Pending,
      predicate: { kind: 'attend', count: 9 },
    },
    {
      id: 'the-record',
      text: "Item Nine is on the agenda. What the chair does with it is the chair's.",
      initial: ObjectiveStatus.Pending,
      predicate: { kind: 'tolerance', ticks: RECORD_TICKS, tier: ResolutionTier.Classification },
      // §8 — one outcome, two records: the ending is this reading, beneath a
      // close that grades neither. campaign.md §9, kept mechanically.
      reading: {
        met: 'Item Nine is unsealed. Every array in the Holding holds a copy, and a copy cannot be reclassified; the continuance dies of being moot. The Board will require a new chair by the first tide. The registry does not price what the seat bought, and the seat did not ask it to.',
        unmet:
          'The continuance carried. The chair reported the model complete. It is not, and she knows it, and the minutes do not — the first false sentence she has ever given the Board: priced, signed, and entered. Solvency is bought with the one thing she had never spent.',
      },
    },
  ],

  /** §9's beat table, in its order. Twelve minutes; the chamber empties at the close. */
  beats: [
    // 00:30 — the Clerk opens the session (§12).
    {
      atTick: T(0, 30),
      kind: 'say',
      speaker: 'The Clerk of the Ninth Board',
      text: 'The Board is in session. Nine items stand. The chamber is listening; the courtesy is old, and it is not a courtesy.',
      note: 'Read, not heard — the standing status of the say channel',
    },

    // 01:00 — the chair (§12). The items begin.
    {
      atTick: T(1),
      kind: 'say',
      speaker: 'Executor Odile Varr-Kest',
      text: 'This is the chair. The flight holds at the rail for the sitting. What this chamber hears, it hears from everyone at once. That is what the room was built for, before the count began, and the concern has never improved on it, and tonight I find I am glad of that, and the minutes may keep the sentence.',
      note: '',
    },

    // 06:00 — item five (§12).
    {
      atTick: T(6),
      kind: 'say',
      speaker: 'Underwriter Baen Tull',
      text: "The model is before the Board under seal. It is bounded, it is honest, and it carries one column I could not close from field data. The Division's note states where the data is. The note is also under seal. Filed, B.T.",
      note: '',
    },

    // 10:20 — the ninth item is called (§12).
    {
      atTick: T(10, 20),
      kind: 'say',
      speaker: 'The Clerk of the Ninth Board',
      text: 'Item Nine. Classified by continuance one hundred and twenty-six years. The chair is asked for the annual motion.',
      note: '',
    },

    // 12:00 — the chamber empties. A conclusion: this mission cannot be
    // lost, only decided (§7, §8; the Tend carve-out).
    {
      atTick: T(12),
      kind: 'resolve',
      conclusion: true,
      note: 'The session closed at its own length, whatever the chair had done',
    },
  ],

  /**
   * §9 — if the chair transmits, at any point in the sitting: the chair's
   * words, and the registry's answer, fired by the record rather than the
   * clock.
   */
  conditionalBeats: [
    {
      id: 'the-word',
      when: { kind: 'tolerance', ticks: RECORD_TICKS, tier: ResolutionTier.Classification },
      beats: [
        {
          kind: 'say',
          speaker: 'Executor Odile Varr-Kest',
          text: 'This is the chair. The motion before the Board is the continuance of Item Nine. The motion is not moved. The item is read into the open record, in full, beginning now — and the chair notes, for the minutes, that what is transmitted in this chamber cannot be untransmitted, which has been the entire question for one hundred and twenty-six years.',
          note: 'The only version of the item the campaign will ever quote (§12)',
        },
        {
          kind: 'say',
          speaker: 'The Registry',
          text: 'Entered.',
          note: '',
        },
      ],
      note: 'Fired by the record, not the clock',
    },
  ],

  /**
   * §8 — one reading frames the close; the record's own line beneath it
   * states the ending, and the nine items assemble the minutes. Partial and
   * Lost are unreachable — the session's endure is the only terminal and it
   * runs out by sitting — and are authored anyway, because an epilogue with
   * a hole in it is a close the runtime cannot read.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      "The session closes. The field is entered, the air keeps running, and the Board adjourns to the next tide's business — which, for the first time in eleven years, it is projected to have.",
    [MissionOutcome.Partial]:
      'The session closes short of its own procedure, which the minutes record and the registry queries. The reading below stands regardless.',
    [MissionOutcome.Lost]:
      'The session did not close. The Underway has held every sitting since the concern was chartered, and the registry opens a file on the first exception in two hundred and fourteen years.',
  },
};
