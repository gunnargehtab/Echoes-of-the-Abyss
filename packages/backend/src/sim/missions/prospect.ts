/**
 * The Ledger 6 — Prospect. docs/mission-prospect.md, transcribed.
 *
 * A data literal in `sorrowgate.ts`'s idiom: no logic, no loader, and the
 * document owns every number. Where this file and that document disagree, one
 * of them is wrong and the fix says which.
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **The refit is bought.** Every expedition hull carries `pressureRating: 3`
 *   — the court refit of Sorrowgate, purchased instead of imposed (§2).
 * - **The survey is soundings.** Six faces, two calibrated readers, the trade
 *   standard figures both sides of the quarrel quote: four hundred metres,
 *   twenty seconds, SIG eighty (§6).
 * - **Nobody is armed.** Four navies on one rim, all weapons-cold, and the
 *   convergence is played in contacts and registers, not fire (§5).
 * - **The close is the ascent.** The basin's riser lifts off at 20:30, loud,
 *   ninety seconds ahead of the turn — the round trip's last lesson (§7).
 */

import {
  Faction,
  FaunaSpecies,
  LEDGER_PROSPECT_HEADER,
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  SIM,
  UnitKind,
} from '@echoes/shared';

import type { MissionDefinition, MissionSounding } from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/** Reserved with no party in it, exactly as the other Ledger missions reserve it. */
const COURT = 1;
const PLATEAUS = 2;
const WATCH = 3;
const ORDER = 4;
/** The rim's attendants — a party whose only assets in the water are sounds. */
const ATTENDANTS = 5;

/**
 * §6 — the survey trade's standard figures, the same numbers
 * docs/mission-aptitude.md §4 quotes from the Knights' side: the standard is
 * older than the quarrel. One mission's authored figures, not constants.
 */
const READ_RADIUS_M = 400;
const READ_HOLD_TICKS = 20 * SIM.TICK_HZ;
const READ_SIG = 80;

/** One charted face, assigned to its calibrated reader (§6). */
const face = (id: string, tag: string, x: number, y: number, note: string): MissionSounding => ({
  id,
  tag,
  x,
  y,
  radiusM: READ_RADIUS_M,
  holdTicks: READ_HOLD_TICKS,
  sig: READ_SIG,
  note,
});

export const LEDGER_PROSPECT: MissionDefinition = {
  ...LEDGER_PROSPECT_HEADER,
  doc: 'docs/mission-prospect.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Bathyarch,
  courtSlot: COURT,
  /** §7 — what rises at the end is authored; a mission owns its own Drift. */
  fauna: false,
  /** §4 — 72: the descent's own floor. The budget is the trip. */
  sigBudget: 72,
  silenceCeilingSig: 100,
  debtCapS: 0,
  escortRadiusM: 0,

  regions: [
    {
      id: 'staging',
      x: 0,
      y: 0,
      widthM: 6000,
      heightM: 1000,
      note: 'The staging water — where a survey becomes a survey by coming back to it',
    },
  ],

  markers: [
    {
      id: 'terraces',
      label: 'The terraces. Six faces are charted; enough, read by hand, proves the field.',
      x: 3000,
      y: 2500,
      radiusM: 2500,
    },
    {
      id: 'return',
      label: 'The staging. The ascent begins no later than the turn.',
      x: 3000,
      y: 500,
      radiusM: 1000,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Bathyarch,
      note: 'The prospect expedition — four hulls, refit to the third rating, unarmed (§2)',
      units: [
        {
          tag: 'flagship',
          kind: UnitKind.Cruiser,
          x: 3000,
          y: 420,
          depthM: 1400,
          role: 'column',
          pressureRating: 3,
          note: "Osk's hull: the ears, the anchor, and the thing the basin notices",
        },
        {
          tag: 'reader-west',
          kind: UnitKind.Corvette,
          x: 2850,
          y: 350,
          depthM: 1400,
          role: 'column',
          pressureRating: 3,
          note: 'Calibrated to the western bank at the yards — the procedure names hulls (§6)',
        },
        {
          tag: 'reader-east',
          kind: UnitKind.Corvette,
          x: 3150,
          y: 350,
          depthM: 1400,
          role: 'column',
          pressureRating: 3,
          note: 'Calibrated to the eastern bank',
        },
        {
          tag: 'bunkerage',
          kind: UnitKind.Harvester,
          x: 3000,
          y: 550,
          depthM: 1400,
          role: 'column',
          pressureRating: 3,
          note: 'Air, draw and margin — a deep survey is a supply problem wearing a chart',
        },
      ],
    },
    {
      slot: PLATEAUS,
      faction: Faction.Pelagia,
      note: 'The charting pair — reading the rim for seeding ground. They arrived first and mention it to nobody (§5)',
      units: [
        // The pressure-lab prototypes: a PR-1 navy has no roster hull that
        // survives this address, and the pair is here anyway — Anholt's
        // eleven years in a pressure lab, spent as a rating the roster does
        // not sell. A refit is a mission fact, never a roster one.
        {
          tag: 'chart-a',
          kind: UnitKind.LightScout,
          x: 900,
          y: 2100,
          depthM: 2100,
          pressureRating: 3,
          note: "The Deepbloom programme's own hulls — the proof of concept, charting the proof's ground",
        },
        {
          tag: 'chart-b',
          kind: UnitKind.LightScout,
          x: 1050,
          y: 2150,
          depthM: 2100,
          pressureRating: 3,
          note: '',
        },
      ],
    },
    {
      slot: WATCH,
      faction: Faction.Directorate,
      note: 'The watch — attending, as it has never not done (§5)',
      units: [
        {
          tag: 'watch-a',
          kind: UnitKind.AbyssalSubmersible,
          x: 4600,
          y: 3300,
          depthM: 3000,
          note: '',
        },
        {
          tag: 'watch-b',
          kind: UnitKind.AbyssalSubmersible,
          x: 4750,
          y: 3350,
          depthM: 3000,
          note: '',
        },
      ],
    },
    {
      slot: ORDER,
      faction: Faction.Hadron,
      note: 'The reconnaissance — one hull in Order colours, loud in exactly one quarter of the compass. No Knight hull exists in the roster, so its cone figure is low for the faction and units.md says so (§5)',
      units: [
        {
          tag: 'recon',
          kind: UnitKind.Corvette,
          x: 5200,
          y: 1600,
          // On the slopes at its own rating: the Order rents depth from
          // Sounding Spires and brought none — a reconnaissance measures
          // from the water it is rated for, courteously.
          depthM: 1750,
          note: '',
        },
      ],
    },
    {
      slot: ATTENDANTS,
      // A party must carry a faction value for the engine's spawn path; the
      // attendants' contacts report none, per the emitter contract — a
      // Tier-3 return with position and depth, no kind and no faction, which
      // is the mechanical definition of a thing the registry can only file
      // as equipment fault (§5, types.ts `MissionEmitter`).
      faction: Faction.Directorate,
      note: 'The attendants — two returns on the lip, periodic, structured, unclassifiable (§5)',
      units: [],
      emitters: [
        {
          tag: 'attendant-a',
          x: 2800,
          y: 3400,
          depthM: 3050,
          sig: 24,
          periodTicks: 7 * SIM.TICK_HZ,
          onTicks: 1 * SIM.TICK_HZ,
          hp: 5000,
          reading: {
            entered:
              'One attendant return was resolved to bearing and period, and is filed, per standing practice, as equipment fault. The file notes this is its third filing, and does not note anything else.',
            gap: "The western return was not resolved. The file it belongs to is not shorter for that, and the survey's instruments are not better for it.",
          },
          note: 'Periodic, structured, and matching no biological signature the Rift has recorded',
        },
        {
          tag: 'attendant-b',
          x: 4100,
          y: 3500,
          depthM: 3050,
          sig: 24,
          periodTicks: 11 * SIM.TICK_HZ,
          onTicks: 2 * SIM.TICK_HZ,
          hp: 5000,
          reading: {
            entered:
              "The eastern return was resolved, and its period is entered beside the survey's own machinery schedule, where the resemblance is noted by the instrument and not by the surveyor.",
            gap: 'The eastern return was not resolved. Nothing on the lip answered the survey, which the file does not believe.',
          },
          note: '',
        },
      ],
    },
  ],

  /** §3 — struck at the writ, with the Board's pricing shown. */
  locks: [
    {
      ability: 'weapons',
      reason:
        'struck — the writ surveys, the rim is crowded, and an incident is priced above a field',
    },
    {
      ability: 'torpedoes',
      reason:
        'struck — the writ surveys, the rim is crowded, and an incident is priced above a field',
    },
    {
      ability: 'construction',
      reason: "the works order is the next Board's to sign — this writ proves the field",
    },
  ],

  /** §12's "Objective readings, in play", verbatim. */
  objectives: [
    {
      id: 'the-field',
      text: 'Prove the field. Read the faces by hand; enough closes the survey.',
      initial: ObjectiveStatus.Pending,
      markerId: 'terraces',
      terminal: true,
      predicate: { kind: 'sound', count: 4 },
    },
    {
      id: 'the-ascent',
      text: 'Bring the column off the rim at the turn. A survey that stays is not a survey.',
      initial: ObjectiveStatus.Pending,
      markerId: 'return',
      terminal: true,
      // The keystone: the record rides the readers and the readers ride the
      // column; a survey the rim keeps proves nothing the Board can bank (§8).
      keystone: true,
      predicate: { kind: 'extract', role: 'column', region: 'staging', count: 3 },
    },
    {
      id: 'the-ledger',
      text: 'The rim is crowded and the trade is loud. What is heard of you is entered, and read later, elsewhere.',
      initial: ObjectiveStatus.Pending,
      predicate: {
        kind: 'tolerance',
        ticks: 60 * SIM.TICK_HZ,
        tier: ResolutionTier.Classification,
      },
      reading: {
        met: "The survey was classified, at length, by ears that keep records. Three navies now carry an account of the concern's visit, and the Board will learn at its next table which asset it actually bought: a field, or a field everyone watched it find.",
        unmet:
          "The survey was heard arriving — everything is — and classified by nobody for long. The concern's visit remains the concern's to declassify, which is a sentence whose value the next mission will state exactly.",
      },
    },
  ],

  /**
   * §6 — six faces, two calibrated readers, three per bank. The counter is
   * the objective; the trade-standard figures are this literal's own.
   */
  soundings: [
    face('face-one', 'reader-west', 900, 2400, 'The western bank, first face'),
    face('face-two', 'reader-west', 1700, 2650, ''),
    face('face-three', 'reader-west', 2500, 2300, ''),
    face('face-four', 'reader-east', 3500, 2600, 'The eastern bank, first face'),
    face('face-five', 'reader-east', 4300, 2350, ''),
    face('face-six', 'reader-east', 5100, 2700, 'The last face, nearest the lip'),
  ],

  /**
   * §9's beat table, in its order. Twenty-two minutes; the writ turns north
   * at the close, with the basin's riser ninety seconds in front of it.
   */
  beats: [
    // 01:00 — Osk, on the shift (§12).
    {
      atTick: T(1),
      kind: 'say',
      speaker: 'Foreman Corwin Osk',
      text: 'Works order for the shift: go down loud, read four faces clean, come up slow, and be counted at the staging. Twenty-nine years I have run shifts on ground that was dying. This is the first one on ground that is not born yet. I find I do not care for the difference, and the shift does not care what I care for. Descend.',
      note: 'Hailed and read — the say channel since #381',
    },

    // The visitors' transits — authored legs, weapons-cold, each navy about
    // its own stated business (§5).
    {
      atTick: T(3),
      kind: 'move',
      tag: 'chart-a',
      x: 1800,
      y: 2150,
      note: 'The pair charts eastward',
    },
    { atTick: T(3), kind: 'move', tag: 'chart-b', x: 1950, y: 2200, note: '' },
    {
      atTick: T(4),
      kind: 'move',
      tag: 'watch-a',
      x: 3600,
      y: 3300,
      note: 'The watch walks the lip',
    },
    { atTick: T(4), kind: 'move', tag: 'watch-b', x: 3750, y: 3350, note: '' },
    {
      atTick: T(4, 30),
      kind: 'move',
      tag: 'recon',
      x: 4600,
      y: 2100,
      note: 'The reconnaissance takes its measure',
    },

    // 05:30 — the plateaus (§12).
    {
      atTick: T(5, 30),
      kind: 'say',
      speaker: 'The charting pair, for the plateaus',
      voice: 'plateaus',
      text: "We're here too — we thought you'd rather hear it from us than from your instruments. We're reading the rim for what could live on it. You're reading it for what can be taken out of it. The rim doesn't mind either of us yet. We'd ask you to notice the *yet*.",
      note: '',
    },

    { atTick: T(7), kind: 'move', tag: 'chart-a', x: 2700, y: 2100, note: '' },
    { atTick: T(7), kind: 'move', tag: 'chart-b', x: 2850, y: 2150, note: '' },

    // 08:00 — those below (§12).
    {
      atTick: T(8),
      kind: 'say',
      speaker: 'Watch-Speaker, for those below',
      voice: 'cohorts',
      text: 'The rim is attended. It was attended before the concern had a registry and it will be attended after. What is done on it this week is entered — in an account that is not yours, against a debt that is not stated.',
      note: '',
    },

    { atTick: T(9), kind: 'move', tag: 'watch-a', x: 2400, y: 3400, note: '' },
    { atTick: T(9), kind: 'move', tag: 'watch-b', x: 2550, y: 3450, note: '' },
    { atTick: T(10), kind: 'move', tag: 'recon', x: 3800, y: 2050, note: '' },

    // 11:00 — the Order (§12).
    {
      atTick: T(11),
      kind: 'say',
      speaker: 'Voice of the reconnaissance, for the Order',
      voice: 'order',
      text: "The Order notes the concern's instruments are in tune, and returns the compliment of assuming it was meant. What the crystal is for, we will not discuss on an open channel. It would be discourteous to the crystal.",
      note: '',
    },

    {
      atTick: T(13),
      kind: 'move',
      tag: 'chart-a',
      x: 1200,
      y: 2050,
      note: 'The pair turns for home water',
    },
    { atTick: T(13), kind: 'move', tag: 'chart-b', x: 1350, y: 2100, note: '' },
    {
      atTick: T(14),
      kind: 'move',
      tag: 'watch-a',
      x: 4600,
      y: 3300,
      note: 'The watch resumes its station',
    },
    { atTick: T(14), kind: 'move', tag: 'watch-b', x: 4750, y: 3350, note: '' },

    // 15:00 — Osk, on the lip's returns (§12).
    {
      atTick: T(15),
      kind: 'say',
      speaker: 'Foreman Corwin Osk',
      text: 'That is the lip talking back on its own schedule. Log it as equipment fault. That is not a joke; it is the name of the file, and the file is older than your opinion of it.',
      note: '',
    },

    {
      atTick: T(17),
      kind: 'move',
      tag: 'recon',
      x: 5200,
      y: 1600,
      note: 'The reconnaissance withdraws, flank-quiet',
    },

    // 20:30 — the basin's riser lifts off, loud: the ascent's starting gun,
    // ninety seconds ahead of the close (§7; campaign.md §10).
    {
      atTick: T(20, 30),
      kind: 'creature',
      tag: 'the-riser',
      species: FaunaSpecies.Sounder,
      spawnAt: { x: 3000, y: 3600, depthM: 3050 },
      driveTo: { x: 3000, y: 2400 },
      untilTick: T(21, 30),
      loud: true,
      note: "The week's ledger of noise, come due — rising toward the terraces, unavailable to classification",
    },

    // 20:45 — the last order of the shift (§12).
    {
      atTick: T(20, 45),
      kind: 'say',
      speaker: 'Foreman Corwin Osk',
      text: "Basin's awake. The shift is over when we are north of the slopes and counted, and not one reading sooner. Up. Slow is the fast way. Go.",
      note: '',
    },

    // 22:00 — the writ turns north (§8).
    {
      atTick: T(22),
      kind: 'resolve',
      note: "Whatever is off the rim is the survey; whatever is not is the registry's problem now",
    },
  ],

  /**
   * §8's Results, verbatim. Beneath whichever reading the run earns, the
   * ledger's line and the attendants' entries or gaps assemble the rest.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      'The field is proven. Four faces read to survey standard, the cores of the readings in duplicate, the column returned. The registry opens the page it has kept blank for eleven years, and the projection acquires a floor. Item Nine acquires an appendix.',
    [MissionOutcome.Partial]:
      'The survey returns short of standard. What was read is real and insufficient; the Board is asked to authorise a second descent, and the actuarial note attached to the request is one sentence long.',
    [MissionOutcome.Lost]:
      'The rim keeps the survey. The registry enters four hulls and their certificates against a field it can now neither prove nor forget, and the projection continues, minus everything, as projections do.',
  },
};
