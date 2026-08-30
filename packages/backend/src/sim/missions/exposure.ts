/**
 * The Ledger 4 — Exposure. docs/mission-exposure.md, transcribed.
 *
 * A data literal in `sorrowgate.ts`'s idiom: no logic, no loader, and the
 * document owns every number. Where this file and that document disagree, one
 * of them is wrong and the fix says which.
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **The survey is unarmed and the extraction is made of speed** (§3). The
 *   locks strike the guns and seal the array the campaign just handed over;
 *   what is left is silence, hearing, and a two-to-one speed advantage.
 * - **The budget is the tolerance** (§4): thirty seconds of Classification,
 *   cumulative, across the charter, with its own reading at the close.
 * - **The consequences key on the tally, not the clock** — the warning at
 *   twenty and the recall at thirty are the format's first conditional beats
 *   (types.ts, `MissionConditionalBeat`; docs/mission-aptitude.md §13's row,
 *   built here first because the Ledger reached it first).
 * - **The readings assemble the close** (§6, §8): six authored points, each
 *   with an entered and a gap line, the transcript arrangement aimed outward
 *   for the first time. The sixth is the campaign turning, and it turns in a
 *   ledger entry.
 */

import {
  Faction,
  FaunaSpecies,
  LEDGER_EXPOSURE_HEADER,
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  SIM,
  UnitKind,
} from '@echoes/shared';

import type { MissionDefinition } from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/** Reserved with no party in it, exactly as the other Ledger missions reserve it. */
const COURT = 1;
/** The First Trench's standing western watch. */
const WATCH = 2;
/** The worked ground — whose assets in the water are sounds. */
const GROUND = 3;

/** §4 — the charter's budget: thirty seconds, cumulative, and the warning at twenty. */
const WARNING_TICKS = 20 * SIM.TICK_HZ;
const TOLERANCE_TICKS = 30 * SIM.TICK_HZ;

export const LEDGER_EXPOSURE: MissionDefinition = {
  ...LEDGER_EXPOSURE_HEADER,
  doc: 'docs/mission-exposure.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Bathyarch,
  courtSlot: COURT,
  /** §5 — the rim pack is authored; a mission owns its own Drift. */
  fauna: false,
  /**
   * §4 — 20: the first genuinely quiet budget in the Ledger. The playtest
   * adversary is the player who runs loud.
   */
  sigBudget: 20,
  // No arrayTag: the Division keeps its ledger in the tolerance, not in debt.
  silenceCeilingSig: 100,
  debtCapS: 0,
  escortRadiusM: 0,

  regions: [
    {
      id: 'shelf-lane',
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 750,
      note: 'The shelf lane, above the layer — where the record is home',
    },
  ],

  markers: [
    {
      id: 'worked-ground',
      label: "The worked ground. Three days of somebody else's economy, standing in the water.",
      x: 2500,
      y: 2500,
      radiusM: 2000,
    },
    {
      id: 'return-line',
      label: 'The shelf lane. The record crosses the layer here, in duplicate.',
      x: 2500,
      y: 375,
      radiusM: 750,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Bathyarch,
      note: "The Division's field survey — three corvettes, stripped, silent-fitted, unarmed (§2)",
      units: [
        {
          tag: 'survey-1',
          kind: UnitKind.Corvette,
          x: 2400,
          y: 350,
          depthM: 900,
          role: 'survey',
          note: "The lead hull — Tull's, and his father's water two trenches west",
        },
        {
          tag: 'survey-2',
          kind: UnitKind.Corvette,
          x: 2500,
          y: 300,
          depthM: 900,
          role: 'survey',
          note: '',
        },
        {
          tag: 'survey-3',
          kind: UnitKind.Corvette,
          x: 2600,
          y: 350,
          depthM: 900,
          role: 'survey',
          note: '',
        },
      ],
    },
    {
      slot: WATCH,
      faction: Faction.Directorate,
      note: "The First Trench's standing western watch — two hulls, one beat, on its own clock (§7)",
      units: [
        {
          tag: 'watch-a',
          kind: UnitKind.AbyssalSubmersible,
          x: 1300,
          y: 2400,
          depthM: 1700,
          armed: true,
          note: 'A cohort watch is armed, and slow, and does not need to be otherwise',
        },
        {
          tag: 'watch-b',
          kind: UnitKind.AbyssalSubmersible,
          x: 1500,
          y: 2450,
          depthM: 1700,
          armed: true,
          note: '',
        },
      ],
    },
    {
      slot: GROUND,
      faction: Faction.Directorate,
      note: "The worked ground — the margin's three days of industrial breath, standing in the water (§6)",
      units: [],
      emitters: [
        {
          tag: 'rendering-row',
          x: 700,
          y: 2500,
          depthM: 1700,
          sig: 40,
          periodTicks: 12 * SIM.TICK_HZ,
          onTicks: 6 * SIM.TICK_HZ,
          hp: 600,
          reading: {
            entered:
              "The rendering row is read: three shifts, unbroken. The cohorts' protein floor prices at self-sufficiency, and the model's supply-shock column zeroes out.",
            gap: 'The rendering row was not read. The protein floor stays an assumption, and the model carries it as one, flagged.',
          },
          note: 'Biomass works on the rim, three shifts',
        },
        {
          tag: 'freight-screws',
          x: 1600,
          y: 2400,
          depthM: 1700,
          sig: 35,
          periodTicks: 6 * SIM.TICK_HZ,
          onTicks: 2 * SIM.TICK_HZ,
          hp: 600,
          reading: {
            entered:
              'The freight axis is read: haulage on a fixed tempo, no surge capacity held back. The pulse is entered, and it is slower than the Board has been pricing it.',
            gap: 'The freight axis was not read. The tempo column inherits the projection, and the projection inherits its author.',
          },
          note: "The axis's haulage tempo — the number Tull calls the pulse",
        },
        {
          tag: 'intake-stalls',
          x: 2400,
          y: 2550,
          depthM: 1700,
          sig: 30,
          periodTicks: 10 * SIM.TICK_HZ,
          onTicks: 3 * SIM.TICK_HZ,
          hp: 600,
          reading: {
            entered:
              'The intake stalls are read, heard as maintenance because that is what they sound like. Replacement rate is entered. The register prices it and does not name it, per standing practice.',
            gap: 'The intake stalls were not read. Replacement rate stays unpriced, which the Division notes is also what the Directorate prefers.',
          },
          note: 'Cohort induction, heard as maintenance',
        },
        {
          tag: 'draw-plant',
          x: 3200,
          y: 2450,
          depthM: 1700,
          sig: 38,
          periodTicks: 8 * SIM.TICK_HZ,
          onTicks: 4 * SIM.TICK_HZ,
          hp: 600,
          reading: {
            entered:
              'The draw plant is read: the energy budget of attendance itself, running level, no reserve spinning. They are not preparing for anything. That is entered too.',
            gap: 'The draw plant was not read. The energy column stays open, and an open energy column is the model asking to be lied to.',
          },
          note: "The margin's power breath",
        },
        {
          tag: 'listening-dome',
          x: 4000,
          y: 2500,
          depthM: 1700,
          sig: 32,
          periodTicks: 15 * SIM.TICK_HZ,
          onTicks: 5 * SIM.TICK_HZ,
          hp: 600,
          reading: {
            entered:
              'The dome is read: the one expense the Directorate wears openly, idling at full draw. What it costs to hear everything is now a figure, and the figure is most of what the margin earns.',
            gap: 'The dome was not read, which the Division records without irony as the dome having been the thing doing the reading.',
          },
          note: "A Cantor's idle hum — what it costs to hear everything",
        },
        {
          tag: 'point-six',
          x: 4600,
          y: 2650,
          depthM: 1700,
          sig: 26,
          periodTicks: 9 * SIM.TICK_HZ,
          onTicks: 2 * SIM.TICK_HZ,
          hp: 600,
          reading: {
            entered:
              'Point six returns the survey’s own machinery noise, shifted, on a period the model has no column for. It is entered. The model can be embarrassed later; the record cannot be taken twice. — B.T.',
            gap: 'Point six was not read. The chart carries a mark the Division cannot gloss, and the interval closes around a silence the model will inherit.',
          },
          note: 'Not in the model (§6). The campaign turning, in a ledger entry',
        },
      ],
    },
  ],

  /** §3 — struck, sealed, and stated on the panel. */
  locks: [
    {
      ability: 'weapons',
      reason: 'struck — a deniable survey is an unarmed one',
    },
    {
      ability: 'torpedoes',
      reason: 'struck — a deniable survey is an unarmed one',
    },
    {
      ability: 'activeSonar',
      reason: 'sealed under charter — a transmission is a signature',
    },
    {
      ability: 'construction',
      reason: "nothing is built in somebody else's country",
    },
  ],

  /** §12's "Objective readings, in play", verbatim. */
  objectives: [
    {
      id: 'the-readings',
      text: 'Take the readings. What is heard is entered, and enough closes the interval.',
      initial: ObjectiveStatus.Pending,
      markerId: 'worked-ground',
      terminal: true,
      predicate: { kind: 'attend', count: 4 },
    },
    {
      id: 'the-return',
      text: 'Return over the layer in duplicate. A reading unreturned is a reading unpriced.',
      initial: ObjectiveStatus.Pending,
      markerId: 'return-line',
      terminal: true,
      // The keystone: a survey that never comes back is exactly what the file
      // would call it, whatever it heard on the way down (§8).
      keystone: true,
      predicate: { kind: 'extract', role: 'survey', region: 'shelf-lane', count: 2 },
    },
    {
      id: 'the-tolerance',
      text: 'Spend Classification like the consumable it is. The ledger runs from the first entry, and the Division does not round down.',
      initial: ObjectiveStatus.Pending,
      predicate: { kind: 'tolerance', ticks: TOLERANCE_TICKS, tier: ResolutionTier.Classification },
      reading: {
        met: 'The tolerance was spent and the charter recalled by the book. The Directorate holds a contact it cannot price; the Division holds a file it cannot close. Both are entered.',
        unmet:
          'The survey was never classified. What the trench heard, it heard as weather, and the record crosses the layer unaccompanied by any record of its taking.',
      },
    },
  ],

  /**
   * §9's beat table, in its order — the watch's beat on its own clock, and
   * the telegraph in front of the change. The two condition-fired rows live
   * in `conditionalBeats` below, because the tick at which a tally crosses
   * twenty seconds is a fact about how the player played.
   */
  beats: [
    // 01:00 — Tull, on the charter (§12).
    {
      atTick: T(1),
      kind: 'say',
      speaker: 'Underwriter Baen Tull',
      text: 'The Board prices three navies and a hole. I am not down here because I like the water. I am down here because a model with a hole in it is a comfort, and the concern can no longer afford comfort at Board rates.',
      note: 'Read, not heard — the standing status of the say channel',
    },

    // The watch walks the worked ground's length, pausing where cohort
    // procedure pauses (§7).
    { atTick: T(2), kind: 'move', tag: 'watch-a', x: 800, y: 2400, note: 'The beat, westward' },
    { atTick: T(2), kind: 'move', tag: 'watch-b', x: 1000, y: 2450, note: '' },
    { atTick: T(5), kind: 'move', tag: 'watch-a', x: 2000, y: 2500, note: '' },
    { atTick: T(5), kind: 'move', tag: 'watch-b', x: 2200, y: 2450, note: '' },
    { atTick: T(8), kind: 'move', tag: 'watch-a', x: 3200, y: 2400, note: '' },
    { atTick: T(8), kind: 'move', tag: 'watch-b', x: 3400, y: 2500, note: '' },
    { atTick: T(11), kind: 'move', tag: 'watch-a', x: 4200, y: 2500, note: 'The east end' },
    { atTick: T(11), kind: 'move', tag: 'watch-b', x: 4000, y: 2400, note: '' },
    { atTick: T(14), kind: 'move', tag: 'watch-a', x: 2600, y: 2450, note: 'The beat, returning' },
    { atTick: T(14), kind: 'move', tag: 'watch-b', x: 2800, y: 2500, note: '' },

    // 16:45 — the rim pack rises, loud, on the relief's wake: seventy-five
    // seconds of warning in front of the change (§8; campaign.md §10).
    {
      atTick: T(16, 45),
      kind: 'creature',
      tag: 'pack-a',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 4500, y: 2800, depthM: 1700 },
      driveTo: { x: 2500, y: 2700 },
      untilTick: T(17, 45),
      loud: true,
      note: "The relief's wake, arriving ahead of it",
    },
    {
      atTick: T(16, 45),
      kind: 'creature',
      tag: 'pack-b',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 4650, y: 2700, depthM: 1700 },
      driveTo: { x: 2700, y: 2650 },
      untilTick: T(17, 45),
      loud: true,
      note: '',
    },
    {
      atTick: T(16, 45),
      kind: 'creature',
      tag: 'pack-c',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 4400, y: 2900, depthM: 1700 },
      driveTo: { x: 2300, y: 2750 },
      untilTick: T(17, 45),
      loud: true,
      note: '',
    },

    // 18:00 — the watch change. Whatever is over the layer is the survey;
    // whatever is not is in the next watch's water (§8).
    { atTick: T(18), kind: 'resolve', note: 'The Division reads the file it received' },
  ],

  /**
   * §4 — what spends at twenty, and what at thirty. The format's first
   * conditional beats: fired by the tally, once, through the ordinary beat
   * path (types.ts, `MissionConditionalBeat`).
   */
  conditionalBeats: [
    {
      id: 'the-warning',
      when: { kind: 'tolerance', ticks: WARNING_TICKS, tier: ResolutionTier.Classification },
      beats: [
        {
          kind: 'say',
          speaker: "The Division's guidance",
          text: 'Twenty seconds of Classification are entered against the charter. Ten remain. The Division reminds the survey that the remainder is not a reserve; it is a margin, and margins are for arithmetic, not for spending.',
          note: 'Fired by the tally, not the clock (§4)',
        },
      ],
      note: 'The warning at twenty — the first ten seconds the Division ever gave anyone back',
    },
    {
      id: 'the-recall',
      when: { kind: 'tolerance', ticks: TOLERANCE_TICKS, tier: ResolutionTier.Classification },
      beats: [
        {
          kind: 'say',
          speaker: 'Underwriter Baen Tull',
          text: 'Thirty. The charter is spent and I am recalling it, which the record will show I did by the book and without editorial. Survey: home, in duplicate, at your best speed. The book has nothing further to say down here and neither do I.',
          note: '',
        },
        // The watch turns onto the survey's last classified water — the
        // listening ground, which is the only water the survey can have been
        // classified in (§7). Not a pursuit: an arrival.
        { kind: 'move', tag: 'watch-a', x: 2500, y: 1800, note: 'The watch turns' },
        { kind: 'move', tag: 'watch-b', x: 2200, y: 1850, note: '' },
      ],
      note: 'The recall at thirty — not a failure; a partial outcome is an outcome',
    },
  ],

  /**
   * §8's Results, verbatim. Beneath whichever reading the run earns, the six
   * points and the tolerance's own line assemble the rest of the page.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      "The model is bounded. Four columns close, the Division initials the interval, and the Board's arithmetic acquires the one property it has lacked, which is a floor. The sixth entry is filed under review. It will stay there.",
    [MissionOutcome.Partial]:
      "The record returns. The interval does not close. What was read is priced; what was not is carried as assumption, flagged, and the flag is the Division's way of saying the word the register does not have.",
    [MissionOutcome.Lost]:
      'No record returns. The charter is written down, the water is marked unpriceable, and the Division notes that the two previous surveys of this class to return no record are both still carried as open files.',
  },
};
