/**
 * The Ledger 5 — Tolerance. docs/mission-tolerance.md, transcribed.
 *
 * A data literal in `sorrowgate.ts`'s idiom: no logic, no loader, and the
 * document owns every number. Where this file and that document disagree, one
 * of them is wrong and the fix says which.
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **One casting.** A single lift, poured at the yard over ninety held
 *   seconds, and the only load the mission authors (§6).
 * - **Two apertures, exclusive by authorship.** Each delivery fires a
 *   conditional that fails the other objective, speaks the Chair's line, and
 *   retires its mirror (`cancels`) — the choice is a rule, not a hope (§6).
 * - **The ledger is terrain.** The Underworks roof at 1,900 m over a floor at
 *   2,100 means the root aperture's 2D region admits nothing that has not
 *   crossed the line at 1,800 and started the crush ledger (§4, §11).
 * - **The close is a count.** The water stops at 17:00 and the register reads
 *   which order was signed, in the assembled-readings arrangement, with the
 *   packs' last press ninety seconds ahead of the whistle (§8, §9).
 */

import {
  Faction,
  FaunaSpecies,
  LEDGER_TOLERANCE_HEADER,
  MissionOutcome,
  ObjectiveStatus,
  SIM,
  UnitKind,
} from '@echoes/shared';

import type { MissionDefinition } from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/** Reserved with no party in it, exactly as the other Ledger missions reserve it. */
const COURT = 1;
/** The Holding — whose assets in the water are an alarm and a complaint. */
const HOLDING = 2;

/** §9 — the pour: ninety seconds of held presence at the pour's own loudness. */
const POUR_TICKS = 90 * SIM.TICK_HZ;
const POUR_SIG = 70;

export const LEDGER_TOLERANCE: MissionDefinition = {
  ...LEDGER_TOLERANCE_HEADER,
  doc: 'docs/mission-tolerance.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Bathyarch,
  courtSlot: COURT,
  /** §7 — the packs are authored; a mission owns its own Drift. */
  fauna: false,
  /** §4 — 70: the writ prices seconds, not noise. */
  sigBudget: 70,
  silenceCeilingSig: 100,
  debtCapS: 0,
  /** The column moves on the writ's orders; at a breach, deafness is the least of it. */
  escortRadiusM: 0,

  regions: [
    {
      id: 'the-yard',
      x: 1500,
      y: 750,
      widthM: 1000,
      heightM: 500,
      note: 'The works yard — where the tungsten pours, once',
    },
    {
      id: 'section-frame',
      x: 500,
      y: 250,
      widthM: 750,
      heightM: 500,
      note: "Sector Vayle's bulkhead frame — eleven hundred berths, two hundred and forty still inside",
    },
    {
      id: 'root-aperture',
      x: 1750,
      y: 1750,
      widthM: 500,
      heightM: 250,
      note: 'The root aperture, under the overhang — nothing stands in its water above the line',
    },
  ],

  markers: [
    {
      id: 'yard',
      label: 'The casting yard. Tungsten pours for exactly one seal.',
      x: 2000,
      y: 1000,
      radiusM: 400,
    },
    {
      id: 'root',
      label: 'The root aperture, under the overhang. Below the line, the ledger runs.',
      x: 2000,
      y: 1875,
      radiusM: 300,
    },
    {
      id: 'section',
      label: "Sector Vayle's frame. The breach alarm is louder inside.",
      x: 875,
      y: 500,
      radiusM: 400,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Bathyarch,
      note: "The breach writ's column — an armed escort, the casting barge, one pour (§2)",
      units: [
        {
          tag: 'flagship',
          kind: UnitKind.Cruiser,
          x: 2000,
          y: 900,
          depthM: 1100,
          role: 'escort',
          armed: true,
          note: "The Klaxon anchor — holding the yard and the packs' attention, in that order",
        },
        {
          tag: 'corvette-1',
          kind: UnitKind.Corvette,
          x: 1880,
          y: 950,
          depthM: 1100,
          role: 'escort',
          armed: true,
          note: 'The working escort',
        },
        {
          tag: 'corvette-2',
          kind: UnitKind.Corvette,
          x: 2120,
          y: 950,
          depthM: 1100,
          role: 'escort',
          armed: true,
          note: '',
        },
        {
          tag: 'casting-barge',
          kind: UnitKind.Harvester,
          x: 2000,
          y: 1080,
          depthM: 1100,
          role: 'seal',
          note: 'The mission: it pours the casting, carries it, and pays the ledger to deliver it',
        },
      ],
    },
    {
      slot: HOLDING,
      faction: Faction.Bathyarch,
      note: 'The Holding — an alarm and a complaint, and everything the mission is about between them (§5)',
      units: [],
      emitters: [
        {
          tag: 'breach-alarm',
          x: 875,
          y: 500,
          depthM: 1000,
          sig: 45,
          periodTicks: 4 * SIM.TICK_HZ,
          onTicks: 1 * SIM.TICK_HZ,
          hp: 800,
          note: "Vayle's breach alarm — the last one the section carries",
        },
        {
          tag: 'root-complaint',
          x: 2000,
          y: 1700,
          depthM: 2050,
          sig: 38,
          periodTicks: 10 * SIM.TICK_HZ,
          onTicks: 4 * SIM.TICK_HZ,
          hp: 2000,
          note: "The root's complaint, up the throat — a casting poured before year zero, failing",
        },
      ],
    },
  ],

  /** §3 — the writ funds a pour and a delivery, not a works order. */
  locks: [
    {
      ability: 'construction',
      reason: 'the writ funds one pour and one delivery, not a works order',
    },
  ],

  /** §12's "Objective readings, in play", verbatim. */
  objectives: [
    {
      id: 'the-casting',
      text: 'Pour the casting. The gauge fits both apertures; the arithmetic does not.',
      initial: ObjectiveStatus.Pending,
      markerId: 'yard',
      predicate: {
        kind: 'extract',
        role: 'seal',
        region: 'the-yard',
        count: 1,
        loaded: 'the-casting',
      },
    },
    {
      id: 'the-root',
      text: 'The root is the habitat. What it costs to reach is on the ledger, per second, and does not heal.',
      initial: ObjectiveStatus.Pending,
      markerId: 'root',
      terminal: true,
      predicate: {
        kind: 'extract',
        role: 'seal',
        region: 'root-aperture',
        count: 1,
        loaded: 'the-casting',
      },
      reading: {
        met: 'The root is sealed. The Holding stands on it, as it has stood on it since before the count began, and the register charges the barge’s spent hull to the column marked structural, where it will never be read again.',
        unmet:
          'The root is written down. The cascade takes the Underworks in the third tide, the lower berths begin controlled abandonment, and the projection moves eleven years closer by a figure the Board will hear at the next bell.',
      },
    },
    {
      id: 'the-section',
      text: 'The section is the people still in it. The frame takes the same gauge.',
      initial: ObjectiveStatus.Pending,
      markerId: 'section',
      terminal: true,
      predicate: {
        kind: 'extract',
        role: 'seal',
        region: 'section-frame',
        count: 1,
        loaded: 'the-casting',
      },
      reading: {
        met: 'The frame is sealed. Two hundred and forty berths hold their air, the evacuation completes at its own pace, and the register enters the count under recovered — a column it has not used for a sector since it was built.',
        unmet:
          'The section is written down. The water finishes what the evacuation could not, the count is taken when it stops, and the register keeps the number, as it kept the last one.',
      },
    },
  ],

  /** §9's beat table, in its order. Seventeen minutes; the water stops at the whistle. */
  beats: [
    // 00:00 — the first pack, on the wall, interested (§7).
    {
      atTick: 0,
      kind: 'creature',
      tag: 'pack-one-a',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 3100, y: 1350, depthM: 1150 },
      driveTo: { x: 3000, y: 1300 },
      untilTick: T(0, 20),
      loud: false,
      note: 'The breach’s first audience — the staple predator, answering the wall’s loudest event in seventeen years',
    },
    {
      atTick: 0,
      kind: 'creature',
      tag: 'pack-one-b',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 3250, y: 1450, depthM: 1150 },
      driveTo: { x: 3150, y: 1400 },
      untilTick: T(0, 20),
      loud: false,
      note: '',
    },
    {
      atTick: 0,
      kind: 'creature',
      tag: 'pack-one-c',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 3000, y: 1500, depthM: 1150 },
      driveTo: { x: 2900, y: 1450 },
      untilTick: T(0, 20),
      loud: false,
      note: '',
    },

    // 00:45 — the Chair, on the channel, ordering nothing (§12).
    {
      atTick: T(0, 45),
      kind: 'say',
      speaker: 'Executor Odile Varr-Kest',
      text: 'This is the Chair. I am on the channel and I am not in your chain of command for the next seventeen minutes; the writ put the casting in your yard, not in mine. I have run this table once. I will not describe it. Proceed.',
      note: 'Hailed and read — the say channel since #381',
    },

    // 02:30 — the arithmetic, stated once (§12).
    {
      atTick: T(2, 30),
      kind: 'say',
      speaker: 'Underworks Warden Cass Ohlen',
      text: 'Below the line your hulls spend what does not heal, at four a second, and the casting does not care which aperture it seals. That is the whole of my advice. I have been asked twice what I would do and I have declined twice, and I am declining now for the third and last time.',
      note: '',
    },

    // 07:30 — the second pack arrives up the wall, loud (§7, §9).
    {
      atTick: T(7, 30),
      kind: 'creature',
      tag: 'pack-two-a',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 3400, y: 1600, depthM: 1200 },
      driveTo: { x: 2700, y: 1300 },
      untilTick: T(8, 30),
      loud: true,
      note: 'The second pack — the escort’s real work begins',
    },
    {
      atTick: T(7, 30),
      kind: 'creature',
      tag: 'pack-two-b',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 3550, y: 1500, depthM: 1200 },
      driveTo: { x: 2850, y: 1350 },
      untilTick: T(8, 30),
      loud: true,
      note: '',
    },
    {
      atTick: T(7, 30),
      kind: 'creature',
      tag: 'pack-two-c',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 3450, y: 1700, depthM: 1200 },
      driveTo: { x: 2750, y: 1450 },
      untilTick: T(8, 30),
      loud: true,
      note: '',
    },

    // 11:00 — stage two is in the frame (§12).
    {
      atTick: T(11),
      kind: 'say',
      speaker: 'Underworks Warden Cass Ohlen',
      text: 'Stage two is in the frame. The alarm you are hearing is the last one the section carries.',
      note: '',
    },

    // 15:30 — the packs' last press, loud: ninety seconds ahead of the
    // whistle (§8; campaign.md §10).
    {
      atTick: T(15, 30),
      kind: 'creature',
      tag: 'pack-one-a',
      driveTo: { x: 2200, y: 1100 },
      untilTick: T(16, 30),
      loud: true,
      note: 'The last press — the pressure invoices to the end',
    },
    {
      atTick: T(15, 30),
      kind: 'creature',
      tag: 'pack-two-a',
      driveTo: { x: 1800, y: 1150 },
      untilTick: T(16, 30),
      loud: true,
      note: '',
    },

    // 17:00 — the water stops where it has reached (§8).
    { atTick: T(17), kind: 'resolve', note: 'The writ closes at the count' },
  ],

  /**
   * §6 — the choice, authored as exclusivity: each delivery fails the other
   * objective, speaks the Chair's entry, and — through the choice group —
   * retires the mirror's rows for good. Fired by the delivery, not the clock,
   * and the two rows per aperture share their condition, so they fire
   * together before the group closes behind them (types.ts, `choiceGroup`).
   */
  conditionalBeats: [
    {
      kind: 'objective',
      id: 'the-section',
      status: ObjectiveStatus.Failed,
      note: 'The section is written down',
      when: {
        kind: 'extract',
        role: 'seal',
        region: 'root-aperture',
        count: 1,
        loaded: 'the-casting',
      },
      choiceGroup: 'the-choice',
    },
    {
      kind: 'say',
      speaker: 'Executor Odile Varr-Kest',
      text: 'Entered. The section is written down. The count will be taken when the water stops, and I will read it on the first tide, with the others.',
      note: 'The root sealed — the other order, unsigned, fails on the beat',
      when: {
        kind: 'extract',
        role: 'seal',
        region: 'root-aperture',
        count: 1,
        loaded: 'the-casting',
      },
      choiceGroup: 'the-choice',
    },
    {
      kind: 'objective',
      id: 'the-root',
      status: ObjectiveStatus.Failed,
      note: 'The root is written down',
      when: {
        kind: 'extract',
        role: 'seal',
        region: 'section-frame',
        count: 1,
        loaded: 'the-casting',
      },
      choiceGroup: 'the-choice',
    },
    {
      kind: 'say',
      speaker: 'Executor Odile Varr-Kest',
      text: 'Entered. The root is written down. I signed the other version of this order seventeen years ago; the register will note the difference and draw no conclusion. Neither will I, in your hearing.',
      note: 'The section sealed — the mirror entry',
      when: {
        kind: 'extract',
        role: 'seal',
        region: 'section-frame',
        count: 1,
        loaded: 'the-casting',
      },
      choiceGroup: 'the-choice',
    },
  ],

  /**
   * §6 — one casting: poured over ninety held seconds at the yard, then
   * carried. The only load the mission authors, which is the choice.
   */
  lifts: [
    {
      id: 'the-casting',
      tag: 'casting-barge',
      region: 'the-yard',
      cutTicks: POUR_TICKS,
      cutSig: POUR_SIG,
      note: 'Tungsten, poured once, to the standard gauge — the mercy and the cruelty at once',
    },
  ],

  /** §8's Results, verbatim. */
  epilogue: {
    [MissionOutcome.Complete]:
      'Both apertures read sealed. The registry notes that the writ funded one casting, and files the report for review rather than for reading.',
    [MissionOutcome.Partial]:
      'One order was signed. The water stops where it has reached, and the count is taken. The Board convenes at the next bell; the reading below is the whole of the minutes.',
    [MissionOutcome.Lost]:
      'No seal was set. The root goes in the third tide and the section in the first, and the register, which does not strike assets, begins its longest entry since Kell.',
  },
};
