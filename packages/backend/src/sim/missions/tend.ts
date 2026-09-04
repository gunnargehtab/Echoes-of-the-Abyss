/**
 * The Second Seeding 1 — Tend. docs/mission-tend.md, transcribed.
 *
 * A data literal in `sorrowgate.ts`'s idiom: the document owns every number —
 * the regions, the beat times, the working figures, the windows. Where this
 * file and that document disagree, one of them is wrong and the fix says
 * which.
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **Nothing attacks the player, and it is ground rather than mercy.** The
 *   working water is above every pursuit band, the force is unarmed because a
 *   garden's watch is ears, and the sweep's corvettes never fire — their
 *   "weapons live and irrelevant" (§5) is rendered as hulls that do not
 *   engage, because in this simulation an armed hull defends itself and the
 *   survey is not here to fight. It is here to listen.
 * - **The work is lifts at the Commune's own figures.** The share cuts at 18 —
 *   the number everyone else harvests at 50 against — the jelly re-seat is the
 *   day's one loud job at Standard's 45, and the gift is the cut-time-zero
 *   carry (§3, §5; economy.md §3, §6). Silence stops all of it, which is the
 *   button's whole price.
 * - **The sweep's hearing is the stake.** Two authored passes, a latched
 *   *filed*, a course that bends toward what it heard, and a reading that
 *   arrives only with the tide (§6, §8).
 * - **The tide's end is a conclusion.** Tend cannot be failed: the close is
 *   marked as one, the turning's reading is the terminal line that always
 *   lands before it, and the count reads as one of Marr's three sentences —
 *   never as a loss (§8).
 *
 * One roster gap left standing rather than papered over: §3 authors the
 * Commune tender at 8 idle and the roster's Harvester idles at 18. Hull stats
 * are units.md's to vary per faction, and this literal does not reach into
 * them; the stillness ceiling of 20 is authored against the roster figure and
 * works as §4 intends.
 */

import {
  Faction,
  FaunaSpecies,
  MARR_PLATEAU_FILED,
  MissionOutcome,
  ObjectiveStatus,
  SEEDING_TEND_HEADER,
  SIM,
  UnitKind,
} from '@echoes/shared';

import type { MissionDefinition } from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/** Reserved and empty, as Asset Recovery reserves it: no court, no ledger. */
const COURT = 1;
/** The survey pair — the concern, charting under grid right-of-way (§5). */
const SURVEY = 2;

/** The share's working figure — the Commune's whole economic identity (§3). */
const SHARE_SIG = 18;
/** The jelly lift — ninety seconds at a Standard cut's 45 (§9; economy.md §3). */
const JELLY_SIG = 45;
/** A load is ninety seconds of held work, share and jellies alike (§9). */
const WORK_TICKS = T(1, 30);

export const SEEDING_TEND: MissionDefinition = {
  ...SEEDING_TEND_HEADER,
  doc: 'docs/mission-tend.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Pelagia,
  courtSlot: COURT,
  /**
   * §11 — a mission owns its own water. The pack at the foot of the drop is
   * authored; the Lampfry and the jelly clusters wait on their species
   * (bestiary.md, Implementation Status).
   */
  fauna: false,
  /** §9 — 20, a ceiling. Exceeding it costs no hull and fails nothing (§4). */
  sigBudget: 20,
  // No arrayTag: the stillness is the silence order's older, softer sibling —
  // custom, not procedure (§6) — so the ledger machinery is not authored.
  silenceCeilingSig: 100,
  debtCapS: 0,
  /** Zero — the day's freight moves on its own orders (types.ts). */
  escortRadiusM: 0,

  regions: [
    {
      id: 'gardens',
      x: 500,
      y: 250,
      widthM: 1250,
      heightM: 750,
      note: "The Gardens — the bloom nodes and the farm rows, where the share's loads are worked",
    },
    {
      id: 'holdfast',
      x: 2500,
      y: 250,
      widthM: 500,
      heightM: 500,
      note: "Home's east water — the share's delivery point. The ovens sit west of it, so a load counted home was carried home",
    },
    {
      id: 'ovens',
      x: 2250,
      y: 250,
      widthM: 250,
      heightM: 250,
      note: 'The ovens — where the gift waits: bread that remembers being grain',
    },
    {
      id: 'west-lane',
      x: 250,
      y: 1000,
      widthM: 1000,
      heightM: 750,
      note: 'The West Lane — where the jelly clusters have walked, and where the re-seat runs',
    },
    {
      id: 'landing',
      x: 3500,
      y: 1750,
      widthM: 500,
      heightM: 500,
      note: "Teel's Landing — the gift's destination, across the drop's shoulder",
    },
  ],

  /**
   * The day's work, as loads (§5): three share loads at the bloom's own pace,
   * the jelly re-seat as the one loud job, and the gift at cut time zero —
   * §13's "one mechanism serves both missions", from the other mission.
   */
  lifts: [
    {
      id: 'share-one',
      tag: 'tender-one',
      region: 'gardens',
      cutTicks: WORK_TICKS,
      cutSig: SHARE_SIG,
      note: 'The first load. Eighteen is the figure everyone else harvests at fifty against',
    },
    {
      id: 'share-two',
      tag: 'tender-two',
      region: 'gardens',
      cutTicks: WORK_TICKS,
      cutSig: SHARE_SIG,
      note: 'The second load',
    },
    {
      id: 'share-three',
      tag: 'tender-three',
      region: 'gardens',
      cutTicks: WORK_TICKS,
      cutSig: SHARE_SIG,
      note: 'The third load — the day, sized to the bloom',
    },
    // The one loud job, on the watch's hull. The document assigns the lift a
    // loudness and not a hull; the format counts loads by role, the tenders'
    // role is spoken for by the share, and the watch is the day's spare pair
    // of hands. The loudness is the lift's — authored at Standard's 45 —
    // whatever holds it (§9).
    {
      id: 'jellies',
      tag: 'watch-one',
      region: 'west-lane',
      cutTicks: WORK_TICKS,
      cutSig: JELLY_SIG,
      note: 'The re-seat: ninety seconds at a Standard cut, and the world goes away',
    },
    {
      id: 'gift',
      tag: 'tender-three',
      region: 'ovens',
      cutTicks: 0,
      cutSig: 0,
      note: 'Bread that remembers being grain. Rigged the moment somebody comes for it, never loud',
    },
  ],

  /**
   * §6 and §8 — the sweep. Two authored passes with ears, a latched *filed*,
   * and the reading appended to whatever the count earned.
   */
  sweep: {
    tags: ['sweep-one', 'sweep-two'],
    windows: [
      { fromTick: T(6), untilTick: T(9, 30) },
      { fromTick: T(11, 30), untilTick: T(14) },
    ],
    filedReading:
      "The sweep heard us. Nobody was hurt, and we'd rather you didn't learn to think of it that way. A ledger is patient. We will be meeting that entry again.",
    // §8's "we will be meeting that entry again", made a thing two later
    // missions can read — docs/campaign.md §1. Latched with the reading and
    // never before it, so the id the client stores is the sentence the player
    // has already been shown.
    scene: MARR_PLATEAU_FILED,
    note: 'What its instruments hear, its ledgers keep',
  },

  markers: [
    {
      id: 'holdfast',
      label: 'The Holdfast. Home — named for what anchors kelp.',
      x: 2625,
      y: 375,
      radiusM: 400,
    },
    {
      id: 'west-lane',
      label: 'The jellies would sit better off the lane.',
      x: 750,
      y: 1375,
      radiusM: 500,
    },
    {
      id: 'landing',
      label: "Teel's landing is short of bread.",
      x: 3750,
      y: 2000,
      radiusM: 350,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Pelagia,
      note: "Marr Plateau's working day: the bloom's freight and the plateau's ears (§2)",
      units: [
        {
          tag: 'tender-one',
          kind: UnitKind.Harvester,
          x: 2560,
          y: 420,
          depthM: 260,
          role: 'tender',
          pressureRating: 1,
          note: "The bloom's freight — chitin and pigment, dredge gear grown for lifting",
        },
        {
          tag: 'tender-two',
          kind: UnitKind.Harvester,
          x: 2690,
          y: 420,
          depthM: 260,
          role: 'tender',
          pressureRating: 1,
          note: '',
        },
        {
          tag: 'tender-three',
          kind: UnitKind.Harvester,
          x: 2625,
          y: 480,
          depthM: 260,
          role: 'tender',
          pressureRating: 1,
          note: 'The gift rides this hull when somebody takes it (§9)',
        },
        // The watch: unarmed because the day is — not struck, simply not
        // grown (§2). Ears for the whole plateau, and the drop's edge is
        // theirs to drift.
        {
          tag: 'watch-one',
          kind: UnitKind.LightScout,
          x: 2560,
          y: 340,
          depthM: 260,
          role: 'escort',
          pressureRating: 1,
          note: "The watch — the mission's verb is theirs: listen down the drop",
        },
        {
          tag: 'watch-two',
          kind: UnitKind.LightScout,
          x: 2690,
          y: 340,
          depthM: 260,
          role: 'escort',
          pressureRating: 1,
          note: '',
        },
      ],
    },
    {
      slot: SURVEY,
      faction: Faction.Bathyarch,
      note: 'The survey pair — the concern, charting the drop under grid right-of-way (§5). Never named; to the plateau it is the sweep, an instrument with a schedule',
      units: [
        // Unarmed in the data although §5 reads "weapons live and irrelevant":
        // in this simulation an armed hull returns fire on its own, and the
        // sweep does not shoot — it files. Cold weapons are how "irrelevant"
        // is spelled in the ECS, and the observable behaviour is the document's.
        {
          tag: 'sweep-one',
          kind: UnitKind.Corvette,
          x: 3300,
          y: 2200,
          depthM: 550,
          note: 'Hydrophones out, holding the east end of the lane until the chart says go',
        },
        {
          tag: 'sweep-two',
          kind: UnitKind.Corvette,
          x: 3350,
          y: 2350,
          depthM: 550,
          note: '',
        },
      ],
    },
  ],

  /**
   * What the force does not carry (§3), as dead affordances with the
   * plateau's reasons shown.
   */
  locks: [
    { ability: 'weapons', reason: "not grown — a garden's watch is ears" },
    { ability: 'torpedoes', reason: "not grown — a garden's watch is ears" },
    { ability: 'mines', reason: "not grown — nothing of ours waits in anybody's water" },
    { ability: 'depthCharges', reason: "not grown — a garden's watch is ears" },
    {
      ability: 'activeSonar',
      reason:
        'never owned — an instrument whose function is to be heard is not a thing a garden grows',
    },
    { ability: 'construction', reason: 'nothing to build — the plateau grows what it needs' },
  ],

  /**
   * §12's "Objective readings, in play", verbatim: the Commune cannot
   * command, so its objectives arrive as statements of what the day holds,
   * and the player learns to hear the ask inside them.
   */
  objectives: [
    {
      id: 'share',
      text: 'The share wants bringing in. We think three loads is a day.',
      initial: ObjectiveStatus.Pending,
      markerId: 'holdfast',
      terminal: true,
      predicate: { kind: 'extract', role: 'tender', region: 'holdfast', count: 3, loaded: true },
    },
    {
      id: 'jellies',
      text: "The jellies would sit better off the lane. It's loud work; the water's ours for another hour.",
      initial: ObjectiveStatus.Pending,
      markerId: 'west-lane',
      terminal: true,
      // The named load: seated means *this* lift landed, not that some loaded
      // hull wandered the lane.
      predicate: {
        kind: 'extract',
        role: 'escort',
        region: 'west-lane',
        count: 1,
        loaded: 'jellies',
      },
    },
    {
      id: 'gift',
      text: "Teel's landing is short of bread. We're not asking. We're saying it's short.",
      initial: ObjectiveStatus.Pending,
      markerId: 'landing',
      terminal: true,
      predicate: { kind: 'extract', role: 'tender', region: 'landing', count: 1, loaded: 'gift' },
    },
    {
      id: 'stillness',
      text: 'The sweep is on the drop. The plateaus are going still now.',
      initial: ObjectiveStatus.Pending,
      // Revealed when the watch calls the sweep — the reading exists because
      // the sweep does. Standing, like the court's silence: in force or not,
      // and never latched (§6).
      revealAtTick: T(6),
      predicate: { kind: 'quiet', role: 'tender', ceilingSig: 20 },
    },
    {
      id: 'turning',
      text: "That's the turning, arriving. Nobody has to answer tonight.",
      initial: ObjectiveStatus.Pending,
      revealAtTick: T(15),
      // Terminal and always met before the tide ends, which is what makes
      // Lost unreachable: Tend cannot be failed, and the count always reads
      // as one of Marr's three sentences (§8). Met at fifteen-fifty whatever
      // the day did, because the turning arrives for every garden.
      terminal: true,
      predicate: { kind: 'endure', ticks: T(15, 50) },
    },
  ],

  /**
   * §9's beat table, in its order. Sixteen minutes, closing at 16:00 as a
   * conclusion.
   */
  beats: [
    // 00:00 — the pack at the foot of the drop, already audible, physically
    // unable to climb: its pursuit band tops out above the plateau's water,
    // and the depth rules are the safety (§1). Released to its own doctrine
    // after placement; it holds its band all mission.
    {
      atTick: 0,
      kind: 'creature',
      tag: 'pack-a',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 900, y: 2300, depthM: 890 },
      driveTo: { x: 1000, y: 2250 },
      untilTick: T(0, 20),
      loud: false,
      note: 'The sound of safety: a predator you can always hear and never meet (§7)',
    },
    {
      atTick: 0,
      kind: 'creature',
      tag: 'pack-b',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 750, y: 2400, depthM: 890 },
      driveTo: { x: 850, y: 2350 },
      untilTick: T(0, 20),
      loud: false,
      note: '',
    },

    // 06:00 — the watch calls the sweep (§12), and the pair starts up the
    // lane, westward. The first pass's window opens with the call.
    {
      atTick: T(6),
      kind: 'say',
      speaker: 'The watch',
      text: "Two on the lane, coming up the chart. Four minutes, we'd say. Teel's people have gone quiet already — you can hear the hush walking.",
      note: 'Read, not heard — the standing status of the say channel',
    },
    {
      atTick: T(6),
      kind: 'move',
      tag: 'sweep-one',
      x: 500,
      y: 2100,
      note: 'The first pass, westward along the lane',
    },
    { atTick: T(6), kind: 'move', tag: 'sweep-two', x: 450, y: 2250, note: '' },

    // 11:30 — the second pass, early, opposite direction (§9). It meets the
    // gift run mid-lane, which is the mission's single decision.
    {
      atTick: T(11, 30),
      kind: 'move',
      tag: 'sweep-one',
      x: 3300,
      y: 2200,
      note: 'The second pass, eastward — early, and nobody on the plateau is told why',
    },
    { atTick: T(11, 30), kind: 'move', tag: 'sweep-two', x: 3350, y: 2350, note: '' },

    // 13:00 — the gift lands, and Teel says the thing she came into this
    // campaign to say (§12).
    {
      atTick: T(13),
      kind: 'say',
      speaker: 'Warden Juno Teel',
      text: "You tend well, and we'll eat well, and I'm grateful. Now hear me on one thing: the storm wasn't the only weather that's coming up that drop, and bread won't be what the next one is short of.",
      note: '',
    },

    // 15:00 — the turning arrives: a call carried plateau to plateau, low and
    // patient, the Commune's own voice travelling its own quiet (§9, §12).
    {
      atTick: T(15),
      kind: 'say',
      speaker: 'The turning',
      text: 'The plateaus are asked to turn a second seeding. Anholt asks it. The count will wait for every garden, and the water will not.',
      note: 'Nothing attacks the player in this mission. This is what arrives instead',
    },

    // 16:00 — the tide ends. Marr reads the day — the reading is the
    // epilogue — and then says the one sentence she should not say aloud
    // (§12). A conclusion, not a failure: the campaign has begun.
    {
      atTick: T(16),
      kind: 'say',
      speaker: 'Tidespeaker Ysolde Marr',
      text: 'We held a whole day, once, and nobody had to be brave in it. That used to be the ordinary kind.',
      note: 'The sentence she should not say aloud, and does',
    },
    {
      atTick: T(16),
      kind: 'resolve',
      conclusion: true,
      note: 'The tide ends. The day is read as it stands',
    },
  ],

  /**
   * §8's Results, verbatim — Marr's readings. Filed is not an outcome of its
   * own: the runtime appends the sweep's reading to whichever of these the
   * count earned, because filed and unfiled cross with the work freely and
   * the mission does not pretend one cancels the other.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      "The day came back the way we lent it — quiet, fed, unfiled. We'd like you to remember what that felt like. We think you're going to need it.",
    [MissionOutcome.Partial]:
      "Less came in than the bloom offered, and the quiet is where it went. We've paid that price on purpose for two hundred years. We're still not sure the concern understands it is a price.",
    // Unreachable — the turning's terminal reading always lands before the
    // tide ends — and authored identically to the spent day so that if the
    // ladder ever changes underneath this mission, the reading stays one of
    // Marr's and never becomes a defeat (§8: Tend cannot be failed).
    [MissionOutcome.Lost]:
      "Less came in than the bloom offered, and the quiet is where it went. We've paid that price on purpose for two hundred years. We're still not sure the concern understands it is a price.",
  },
};
