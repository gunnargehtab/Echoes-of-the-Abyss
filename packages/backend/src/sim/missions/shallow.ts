/**
 * The Attending 4 — Shallow. docs/mission-shallow.md, transcribed.
 *
 * A data literal in `intake.ts`'s idiom: the document owns the forces, the
 * water, the beats, the numbers and the text. Where this file and that
 * document disagree, one of them is wrong and the fix says which.
 *
 * §13 predicted that this mission would ask the format for nothing new, and it
 * holds: `attend`, `extract`, `tolerance`, the `say`, `move`, `silent`,
 * `creature` and `resolve` beats, `MissionEmitter`'s window and optional
 * `reading`, `choiceGroup` and `runsItsLength` all shipped before it. What is
 * new is only what the mission spends them on — and the one thing it spends
 * that nothing has: **a scripted party un-silenced and moved by a condition**,
 * five `silent: false` beats and five `move` beats hung off one `tolerance`
 * predicate (§13).
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **The system fires whatever the player does.** Every hull is seated at
 *   340 m at tick zero, which is Shelf, which is `inDirectorateShallows`
 *   (`echo.ts`). Nothing here is scripted: the speed is ×0.8 in `movement.ts`
 *   and the hull bleeds `DIRECTORATE_SHALLOW_BLEED_PER_S` in `pressure.ts`
 *   until every bar in the panel is at eighty-five per cent, twenty seconds in,
 *   before an order has been given (§4, §13).
 * - **Silence is the opening posture, not an option.** Sixteen `silent` beats
 *   at tick zero — the column's eleven and the Holding's five — so the
 *   mission's first decision is *whether to stop being quiet* (§3, §5). And
 *   every silent figure in the document is the hull's own: `silentRunningSig`
 *   sits a hull in `SILENT_RUNNING`'s 3–8 band by its idle SIG, so a Chorister
 *   runs at 4.3 and a Cruiser hull at 7.6, and the seat reads as nothing in
 *   every ear on the map (§13, and `missionShallow.test.ts` re-derives it).
 * - **Ten sounds are attendable and two are not.** The bells carry no
 *   `reading`, so `attend` cannot count them (`runtime.ts`,
 *   `applyAttendance`): the two loudest things on the map are worth exactly
 *   nothing to the transcript, which is §6's whole argument as a missing
 *   field rather than as a rule.
 * - **The transcript has to be walked to and the slope is called late.** The
 *   rows are 2.3 km north of the seat and read nothing from it; `the-slope`
 *   and `the-ears` are revealed at 18:00 because an `extract` latches Met on
 *   the first pass it is true, and revealed at 00:00 the withdrawal would be
 *   a sentence about a dip somebody took at five past the hour (§8).
 *
 * Two authoring decisions this file made that the document leaves open or
 * gets wrong, stated here so a reviewer can overrule them rather than
 * discover them:
 *
 * 1. **The concern is one slot, not four.** §2 seats the spur's frame, the
 *    corridor escort, the second element and the Holding's column on slots 2
 *    to 5, "all separately owned so the escort's guns and the closure's guns
 *    answer to different beats". Beats address *tags*, so that reason is paid
 *    in full on one slot — and four slots cannot be paid at all. Hostility in
 *    this simulation is `Owner.slot` and nothing else (`combat.ts`), and a
 *    prebuilt Sentinel Turret is spawned armed (`world.ts`, `spawnStructure`):
 *    `frame-turret-east` at (2150, 1500) stands 159 m from
 *    `corridor-corvette-one`, 251 m from `corridor-cruiser` and 354 m from
 *    `corridor-corvette-two`, all inside its 700 m gun, so four slots would
 *    have the closure shoot its own escort on tick zero. The frame, the
 *    escort, the closure and the Holding are one concern under one order (§5),
 *    and this file seats them that way. Slots 3 to 5 stand empty where §2 put
 *    them, so a later split has its numbering waiting.
 * 2. **The escort's eastern leg stands off at x 2,750, not §9's x 2,800.**
 *    §9 measures that leg at "890 m from the nearest Chorister's seat" and
 *    reads it acoustically — Contact to a silent hull, Track to a loud one.
 *    Both readings survive the metre it is moved (1.10 and 4.05 against 1.16
 *    and 4.28); what does not survive x 2,800 is §3's "while the column holds
 *    still the corridor does not have it at all" and §8's "the fight here is
 *    not compulsory". A Consortium Cruiser's gun is 900 m (`units.ts`) and
 *    `engagementRangeM` measures through the water column, so from (2800, 1500)
 *    at 400 m the seat at (3350, 2200) at 340 m is 892 m away — inside the
 *    gun, and a column that never moved and never made a sound is fired on at
 *    13:00. At x 2,750 it is 924 m and outside. Reported against the document
 *    rather than fixed there.
 *
 * And one thing the document is wrong about that costs this file nothing,
 * recorded because the test re-derives it: §7's strip table and its "band that
 * is quiet in both directions runs from x 426 to x 1,244" are measured to
 * `element-one` at (300, 1400) alone. §5 seats `element-two` 150 m south at
 * (300, 1550), nearer to every metre of y 1,850 — so a silent Chorister at
 * x 375 reads 4.84 at 309 m rather than 2.60 at 456, and the gate holds it
 * above Contact out to x 1,073 rather than x 426. The band is 171 m wide, not
 * eight hundred. Both of §7's five-row stations still work, which is why this
 * is a note and not a move: (1225, 1850) is inside the corrected band, and
 * (900, 1850) is at Contact to the closure and 121 m outside its gun.
 */

import {
  ATTENDING_SHALLOW_HEADER,
  Faction,
  FaunaSpecies,
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  SIM,
  StructureKind,
  UnitKind,
} from '@echoes/shared';

import type {
  MissionBeat,
  MissionConditionalBeat,
  MissionDefinition,
  MissionEmitter,
  MissionUnit,
} from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/** Reserved and empty, as the three Directorate missions before it reserve it. */
const COURT = 1;
/**
 * The concern — the spur's frame, the corridor escort, the second element and
 * the Holding's column, on one slot. §2 numbers them 2 to 5; the file header
 * says why they are one, and why 3 to 5 are left standing empty.
 */
const CONCERN = 2;
/**
 * The Shelf's voices — §2's slot 6, carrying sounds and no hulls.
 *
 * A slot rather than a party, for Attendance's reason: the Echo Layer resolves
 * by `Owner.slot` and a hull cannot hear its own side, so a row seated with the
 * column would be inaudible to the column, which is the one thing this mission
 * cannot have.
 */
const VOICES = 6;

/** §1, §6, §7 — a walked row is low, plural and moving, at twelve. */
const ROW_SIG = 12;
/** §6 — a bell, off-tide. The loudest thing on the map and worth nothing. */
const BELL_SIG = 70;
/**
 * §6 — "all sustained (`periodTicks === onTicks`, 20 s)".
 *
 * The pattern and the window are the same length, which is what a turning is:
 * not a rhythm, one continuous sound for as long as the garden is walking it.
 * The window says when that is, and the pattern says what it does while it is.
 */
const SUSTAIN = 20 * SIM.TICK_HZ;
/** §6 — authored durability. Nothing in the mission asks the player to shoot a garden. */
const ROW_HP = 5000;

/** §3, §11 — the column's water: 340 m over the Shoulder's own 340 m floor. */
const SEAT_DEPTH_M = 340;
/** §5, §11 — the corridor's, over the spur's 420 m. */
const CORRIDOR_DEPTH_M = 400;
/** §5, §11 — the frame's turrets, over the spur's 420 m. */
const FRAME_DEPTH_M = 380;
/** §9, §11 — the pack's own water on the slope, under a 900 m floor. */
const PACK_DEPTH_M = 880;

/**
 * One of the eight, seated on the rock at 340 m and already above the line.
 *
 * PR-2 is the roster's, no refit: the Shoulder needs PR-1 and nothing this
 * mission authors crushes anybody. The role is `cohort` and the mission never
 * marks one, which is why `the-slope` counts six of eight rather than naming
 * any (§3, §8).
 */
const chorister = (ordinal: string, x: number, note: string): MissionUnit => ({
  tag: `chorister-${ordinal}`,
  kind: UnitKind.Chorister,
  x,
  y: 2200,
  depthM: SEAT_DEPTH_M,
  role: 'cohort',
  armed: true,
  note,
});

/**
 * A walked row of Marr's — §6's six, at twelve, at the pace of a turning.
 *
 * The reading is worded to be true under all three of Convocation's outcomes,
 * which is the register doing the work the continuity needs rather than this
 * mission choosing an outcome for somebody else's campaign (§6).
 */
const marrRow = (ordinal: string, x: number, note: string): MissionEmitter => ({
  tag: `marr-row-${ordinal}`,
  x,
  y: 500,
  depthM: 260,
  sig: ROW_SIG,
  periodTicks: SUSTAIN,
  onTicks: SUSTAIN,
  hp: ROW_HP,
  fromTick: T(1),
  untilTick: T(16),
  reading: {
    entered:
      `Entered: Marr's ${ordinal} outer row, at twelve, at the pace of a turning. ` +
      "Whether it is Marr's own question or a neighbour's carried in is not entered, " +
      'because the sound does not say.',
    gap: `Not entered: the ${ordinal} row.`,
  },
  note,
});

/**
 * One of the Holdfast's four — §6, heard from inside the concern's corridor
 * and from nowhere south of it, for three minutes in the middle of the tide.
 *
 * All four carry the same pair, and the document authors it that way: the gate
 * is one plateau turning one question, so the close enters the Holdfast as
 * many times as it was heard rather than naming which quarter of it was.
 */
const gateRow = (ordinal: string, x: number, note: string): MissionEmitter => ({
  tag: `gate-row-${ordinal}`,
  x,
  y: 125,
  depthM: 250,
  sig: ROW_SIG,
  periodTicks: SUSTAIN,
  onTicks: SUSTAIN,
  hp: ROW_HP,
  fromTick: T(10),
  untilTick: T(13),
  reading: {
    entered:
      "Entered: the Holdfast, turning it, at twelve. The plateau's own gate, and the " +
      "stalls had to stand in the concern's corridor to hear it.",
    gap: 'Not entered: the Holdfast. The corridor was not stood in, or not long enough.',
  },
  note,
});

/**
 * A bell, rung off-tide — and **not attendable**, which is the mechanism.
 *
 * No `reading`, so `attend` cannot count it (`runtime.ts`, `applyAttendance`;
 * `missions.test.ts`, the attend bound). At SIG 70 through the real paths it
 * is Bearing to a Chorister on the strip and Track to a submersible over the
 * slope's middle: heard everywhere, entered nowhere. A transcript that could
 * be filled by standing still under a bell would not be a transcript (§6).
 */
const bell = (
  tag: string,
  x: number,
  y: number,
  depthM: number,
  atTick: number,
  note: string
): MissionEmitter => ({
  tag,
  x,
  y,
  depthM,
  sig: BELL_SIG,
  periodTicks: SUSTAIN,
  onTicks: SUSTAIN,
  hp: ROW_HP,
  fromTick: atTick,
  untilTick: atTick + SUSTAIN,
  note,
});

/** The stalls, reading into the water — §9's beat table, §12's register. */
const stalls = (atTick: number, text: string, note: string): MissionBeat => ({
  atTick,
  kind: 'say',
  speaker: 'The stalls',
  text,
  note,
});

/**
 * Silent Running on, at tick zero — §3's eleven and §5's five.
 *
 * Sixteen beats rather than a flag, because `silent` is a beat and the posture
 * is a thing that happens at a tick: the column is lying quiet when the stalls
 * open, and the Holding is a smudge at the wall's gate all tide.
 */
const goesQuiet = (tag: string, note: string): MissionBeat => ({
  atTick: 0,
  kind: 'silent',
  tag,
  active: true,
  note,
});

/**
 * The escort's walk, as three `move` beats — Rell's authored legs (§5, §9).
 *
 * The corvettes keep the station they were seated in relative to the Cruiser,
 * a hundred metres either side and fifty either way across the corridor, so
 * the formation the player heard at 00:00 is the formation that arrives. It
 * never goes below y 1,750: Rell discharges a closure at the closure's edge
 * and does not hunt anybody down a slope (§5).
 */
const escortTo = (atTick: number, x: number, note: string): MissionBeat[] => [
  { atTick, kind: 'move', tag: 'corridor-cruiser', x, y: 1500, note },
  { atTick, kind: 'move', tag: 'corridor-corvette-one', x: x - 100, y: 1450, note: '' },
  { atTick, kind: 'move', tag: 'corridor-corvette-two', x: x + 100, y: 1550, note: '' },
];

/** The closure's walk east, as a pair of `move` beats — Thin Water's own idiom. */
const closureTo = (atTick: number, x: number, note: string): MissionBeat[] => [
  { atTick, kind: 'move', tag: 'element-one', x, y: 1400, note },
  { atTick, kind: 'move', tag: 'element-two', x, y: 1550, note: '' },
];

/**
 * §9's three askings, as the one line each of them is (§12).
 *
 * The thresholds are ordered by arithmetic and not by the table: `tolerance`
 * counts ticks at its tier *or better*, so a force's Bearing tally is always
 * at least its Classification tally. Twenty at Bearing sits under thirty at
 * Classification by ten on every route into the corridor, and ninety at
 * Classification is behind both — which is what stops Rell saying "it is the
 * second time of asking" with no first time behind it (§9, §13).
 */
const RELL = 'Corridor Warden Anse Rell';
const FIRST_ASKING_TICKS = 20 * SIM.TICK_HZ;
const SECOND_ASKING_TICKS = 30 * SIM.TICK_HZ;
const THIRD_ASKING_TICKS = 90 * SIM.TICK_HZ;
/** §8 — sixty seconds of Classification, cumulative, in anybody's ears. */
const RECORD_TICKS = 60 * SIM.TICK_HZ;

/** The first asking, whichever of §9's three conditions brings it. */
const firstAsking = (
  when: MissionConditionalBeat['when'],
  note: string
): MissionConditionalBeat => ({
  kind: 'say',
  speaker: RELL,
  text:
    'Bearing inside a posted closure is asked for an asset number and a charter reference. ' +
    'This is the first time of asking.',
  note,
  when,
  // The three share a group so whichever fires retires the other two
  // (`runtime.ts`, the choice-group sweep): a column that stands into the
  // closure and one merely heard for twenty seconds are asked the same
  // question once (§9).
  choiceGroup: 'first',
});

/**
 * The Holding's column, out of the gate on the third asking — §9's five
 * `silent: false` beats and five `move` beats, hung off one predicate.
 *
 * They share a condition *and* a group, which is legal because the group is
 * swept after everything due on the pass has fired (`types.ts`, `choiceGroup`).
 * Nothing here is a new mechanism; what is new is that the mission's largest
 * reserve is authored as a consequence of the player's own exposure rather
 * than of the clock (§13).
 */
const HOLDING = ['cruiser-a', 'cruiser-b', 'corvette-a', 'corvette-b', 'corvette-c'] as const;

const holdingUnsilenced = (ordinal: string): MissionConditionalBeat => ({
  kind: 'silent',
  tag: `holding-${ordinal}`,
  active: false,
  note: '',
  when: { kind: 'tolerance', ticks: THIRD_ASKING_TICKS, tier: ResolutionTier.Classification },
  choiceGroup: 'third',
});

const holdingMoves = (ordinal: string): MissionConditionalBeat => ({
  kind: 'move',
  tag: `holding-${ordinal}`,
  x: 2500,
  y: 1100,
  note: '',
  when: { kind: 'tolerance', ticks: THIRD_ASKING_TICKS, tier: ResolutionTier.Classification },
  choiceGroup: 'third',
});

export const ATTENDING_SHALLOW: MissionDefinition = {
  ...ATTENDING_SHALLOW_HEADER,
  doc: 'docs/mission-shallow.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Directorate,
  courtSlot: COURT,
  /** §10, §13 — the pack is two authored points on a slope and nothing else. */
  fauna: false,
  /**
   * §9, §13 — all three terminal rows can be true on the reveal's own pass at
   * 18:00, which without the flag would close the tide ninety seconds early
   * and delete the pack's whole purpose. With it, only `resolve` closes it.
   */
  runsItsLength: true,
  /**
   * §4, §9 — twenty-four, one Chorister under way, and the tightest budget the
   * campaign has authored since Attendance's eight. A ceiling shown in the
   * panel and never a live threshold: the Cruiser hull idles at 55, more than
   * twice it, so the budget is the mission saying that the ears travel silent.
   */
  sigBudget: 24,
  // No arrayTag and no silence order — Asset Recovery's and Intake's posture
  // (§9). The ledger never runs: the plateaus' hush at the watch-edge is
  // courtesy rather than an order (habitats.md §8), and a mission that
  // enforced it here would be pricing somebody else's manners as the
  // Directorate's law (§2, §13).
  silenceCeilingSig: 100,
  debtCapS: 0,
  /** No held freight: eleven hulls that move on their own orders. */
  escortRadiusM: 0,

  /**
   * §11's mission regions — only what a predicate, a marker or a reader
   * addresses. The map paints all seven and is reused unchanged.
   */
  regions: [
    {
      id: 'grid-spur',
      x: 0,
      y: 1250,
      widthM: 5000,
      heightM: 500,
      note: 'The Grid Spur — the posted closure, east to west. The one Mid-Water ribbon on the map: a Directorate hull that dives to its floor runs at forty again, and standing in it is the offence. The first asking keys on it',
    },
    {
      id: 'kell-slope',
      x: 0,
      y: 2500,
      widthM: 5000,
      heightM: 500,
      note: 'The Kell Slope — the southern edge falling away to 900 m. PF 1.60: the column is heard arriving and heard leaving. The withdrawal region, and `the-slope` and `the-ears` count into it',
    },
    {
      id: 'the-strip',
      x: 0,
      y: 1750,
      widthM: 2000,
      heightM: 250,
      note: "The strip — the shoulder's water directly beneath Marr's outer rows, between the closure's southern edge and the last metre from which a row is at Bearing. Named for the reader and addressed by no predicate (§11)",
    },
  ],

  /**
   * §11 — one marker, and it ships only once `the-slope` and `the-ears` are
   * revealed at 18:00. A marker reaches the client while an objective naming
   * it is shown (`projectMissionView`), so the slope is pointed at for the
   * last minute and never before.
   */
  markers: [
    {
      id: 'slope',
      label: 'The Kell Slope. The line is at four hundred, and the column is asked to be under it.',
      x: 2500,
      y: 2750,
      radiusM: 1000,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Directorate,
      note: "A cohort of the 4th Trench Cohort, up the Kell slope in the tide's dark and lying quiet on the shoulder: one Cruiser hull, two Abyssal Submersibles and eight Choristers, all eleven armed and all eleven already above the line (§2, §3). No structures, no production, no reinforcement and no repair",
      units: [
        chorister(
          'one',
          3350,
          'The westmost of the eight, and the seat the corridor comes nearest to. 1,070 m from the escort’s nearest Corvette, and at 4.3 it is nothing to it'
        ),
        chorister('two', 3400, ''),
        chorister('three', 3450, ''),
        chorister('four', 3500, ''),
        chorister('five', 3550, ''),
        chorister('six', 3600, ''),
        chorister('seven', 3650, ''),
        chorister(
          'eight',
          3700,
          'The eighth. Six of these are a column at the close and the mission never says which six (§8)'
        ),
        {
          tag: 'submersible-west',
          kind: UnitKind.AbyssalSubmersible,
          x: 3400,
          y: 2350,
          depthM: SEAT_DEPTH_M,
          role: 'ears',
          armed: true,
          note: 'The best mobile ears in the game, and one of the only two hulls on the map that hold five of Marr’s six rows at Bearing from one standing (§3, §7)',
        },
        {
          tag: 'submersible-east',
          kind: UnitKind.AbyssalSubmersible,
          x: 3650,
          y: 2350,
          depthM: SEAT_DEPTH_M,
          role: 'ears',
          armed: true,
          note: '',
        },
        {
          tag: 'cruiser-hull',
          kind: UnitKind.Cruiser,
          x: 3525,
          y: 2325,
          depthM: SEAT_DEPTH_M,
          role: 'ears',
          armed: true,
          note: "The column's command ears and the only hull it has that reaches past 650 m — and the loudest thing it owns: 55 while merely sitting, against a budget of 24. Silent it is 7.6, which is still nothing to anybody on this map (§3)",
        },
      ],
    },

    {
      slot: CONCERN,
      faction: Faction.Bathyarch,
      note: "The concern, whole: Thin Water's frame on a tensioned spur, Rell's escort walking the closure in Klaxon posture, the second element idling at the corridor's western gate, and the Holding's column at the wall's gate under Silent Running. Four formations, four sets of beats, one order — and one slot, because hostility here is ownership and a closure that shot its own escort would be nobody's idea of a posted corridor (§5, and the file header)",
      units: [
        {
          tag: 'corridor-cruiser',
          kind: UnitKind.Cruiser,
          x: 2400,
          y: 1500,
          depthM: CORRIDOR_DEPTH_M,
          armed: true,
          note: 'Two hundred metres short of where Thin Water’s Cruiser ended its tide. At 55 idle it reads 10.34 to a submersible at the seat — Track, exact hull and facing, from the first tick — which is why this mission can be about a decision (§7)',
        },
        {
          tag: 'corridor-corvette-one',
          kind: UnitKind.Corvette,
          x: 2300,
          y: 1450,
          depthM: CORRIDOR_DEPTH_M,
          armed: true,
          note: 'Klaxon posture, walking the closure. Not hunting, and audible for four minutes before it is anywhere',
        },
        {
          tag: 'corridor-corvette-two',
          kind: UnitKind.Corvette,
          x: 2500,
          y: 1550,
          depthM: CORRIDOR_DEPTH_M,
          armed: true,
          note: 'The escort’s nearest hull to the seat, 1,070 m off',
        },
        {
          tag: 'element-one',
          kind: UnitKind.Corvette,
          x: 300,
          y: 1400,
          depthM: CORRIDOR_DEPTH_M,
          armed: true,
          note: "The closure, on its own clock, at Thin Water's own west-end coordinates. It is not hunting; it is closing a corridor at the end of a tide, and it is why the column's clock ends when it does (§5)",
        },
        {
          tag: 'element-two',
          kind: UnitKind.Corvette,
          x: 300,
          y: 1550,
          depthM: CORRIDOR_DEPTH_M,
          armed: true,
          note: 'The nearer of the two to everything on the strip, which §7’s table does not measure to and this file’s header does',
        },
        {
          tag: 'holding-cruiser-a',
          kind: UnitKind.Cruiser,
          x: 125,
          y: 1050,
          depthM: SEAT_DEPTH_M,
          armed: true,
          note: "At the wall's gate under Silent Running: a Cruiser at 7.6 is Contact to a submersible on the strip from 1,638 m and a smudge all tide. It is moved by exactly one thing, and that thing is the third asking (§5, §9)",
        },
        {
          tag: 'holding-cruiser-b',
          kind: UnitKind.Cruiser,
          x: 125,
          y: 1200,
          depthM: SEAT_DEPTH_M,
          armed: true,
          note: '',
        },
        {
          tag: 'holding-corvette-a',
          kind: UnitKind.Corvette,
          x: 250,
          y: 1100,
          depthM: SEAT_DEPTH_M,
          armed: true,
          note: '',
        },
        {
          tag: 'holding-corvette-b',
          kind: UnitKind.Corvette,
          x: 375,
          y: 1050,
          depthM: SEAT_DEPTH_M,
          armed: true,
          note: '',
        },
        {
          tag: 'holding-corvette-c',
          kind: UnitKind.Corvette,
          x: 375,
          y: 1200,
          depthM: SEAT_DEPTH_M,
          armed: true,
          note: '',
        },
      ],
      /**
       * §5 — Thin Water's frame, left armed on a tensioned spur, seated where
       * `thinWater.ts` seats it. A Sentinel Turret *listens*: HYD 55 holds a
       * cruising Chorister at Bearing out to 1,990 m and a silent one out to
       * 683, and guns fire at Tier 2 or better — so seven hundred metres
       * either side of the frame is a turret's water. Nobody has taken them
       * down, because nobody takes a closure down.
       */
      structures: [
        {
          tag: 'frame-turret-west',
          kind: StructureKind.SentinelTurret,
          x: 1850,
          y: 1500,
          depthM: FRAME_DEPTH_M,
          note: "The one 351 m from a Chorister standing under Marr's sixth row. The mission never says not to; it prints the distance (§7)",
        },
        {
          tag: 'frame-turret-east',
          kind: StructureKind.SentinelTurret,
          x: 2150,
          y: 1500,
          depthM: FRAME_DEPTH_M,
          note: '',
        },
      ],
    },

    {
      slot: VOICES,
      faction: Faction.Pelagia,
      note: "The Shelf's voices — gardens turning a question and two plateaus ringing off-tide. Nobody's asset: a slot, ten attendable sounds and two that are not (§5, §6)",
      units: [],
      emitters: [
        marrRow(
          'one',
          250,
          "Marr's westmost outer row. The two outer rows of either five-row station are 1,498 m out and read 1.55 — Bearing, and only just"
        ),
        marrRow('two', 575, ''),
        marrRow(
          'three',
          900,
          'The row a submersible stands under at (900, 1850) and holds five from'
        ),
        marrRow(
          'four',
          1225,
          'The row a submersible stands under at (1225, 1850) and holds the other five from — 325 m and eighteen silent seconds away (§7)'
        ),
        marrRow('five', 1550, ''),
        marrRow(
          'six',
          1875,
          'The sixth, and the one that costs: a Chorister directly beneath it holds it at 1.62 and stands 351 m from the western turret, at Classification, inside a 700 m gun (§7)'
        ),
        gateRow(
          'one',
          375,
          "The Holdfast's westmost. Three minutes in the middle of the tide, and heard from nowhere south of the corridor"
        ),
        gateRow('two', 625, ''),
        gateRow('three', 875, ''),
        gateRow(
          'four',
          1125,
          'The fourth. Eight of ten needs the Holdfast, and the Holdfast needs the corridor stood in (§8)'
        ),
        bell(
          'bell-kell',
          4400,
          2000,
          290,
          T(6),
          "Kell's bell, in the replanted face, rung by a plateau that lost two hundred people to somebody else's containment order in 197 PC. No reading: it is heard everywhere and entered nowhere"
        ),
        bell(
          'bell-teel',
          2875,
          125,
          280,
          T(11),
          "Teel's bell, on the shoulder's north edge. Two. Also not entered"
        ),
      ],
    },
  ],

  /**
   * §3's "What the column does not carry", as dead affordances with the
   * column's own reasons shown.
   *
   * **Active sonar is deliberately absent from this list.** Mission 3 handed
   * it over and this mission refuses nothing: it states the price instead —
   * SIG 95, a 900 m reveal and a self-reveal at 2,400 m to HYD 50, with no
   * water on this map below the layer's duct to take the ×0.3 back, against
   * ears that already hold the escort's Cruiser at Track from 2,376 m. The
   * button buys nothing and costs the mission, and fencing it would make the
   * point on the player's behalf.
   */
  locks: [
    { ability: 'construction', reason: "nothing is built on somebody else's shoulder" },
    { ability: 'mines', reason: 'nothing is left in water the plateaus tend' },
    { ability: 'depthCharges', reason: 'nothing is left in water the plateaus tend' },
  ],

  /**
   * §8's five rows, in the document's order. Three are terminal and the count
   * is decided by them alone; the last two are read out at the close and never
   * ranked — and they are authored after the three so `objectiveReadings`
   * appends `the-record`'s pair and then `the-whole`'s, which is the order §8
   * states.
   *
   * **No keystone, and the omission is the argument** (§8): a column that
   * entered ten rows and left three hulls on the shoulder and a column that
   * came down whole with four rows read as the same sentence, because the
   * Directorate does not price bodies against a record.
   */
  objectives: [
    {
      id: 'the-transcript',
      text: 'The Shelf is listened to. Five of ten is sufficiency. The Undermarshalcy does not round up.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      // §8 — monotone, and revealed from 00:00. An emitter resolved at Tier 2
      // while sounding is banked for the rest of the match (`runtime.ts`), so
      // the transcript is a walk and not a vigil: 2.3 km from the seat, a few
      // seconds standing, and back.
      predicate: { kind: 'attend', count: 5 },
    },
    {
      id: 'the-slope',
      text: "The column is under the line at the tide's turn. Six of eight on the slope is a column.",
      initial: ObjectiveStatus.Pending,
      terminal: true,
      // §8 — revealed at 18:00, and the late reveal is load-bearing: an
      // `extract` latches Met the first pass it is true and never un-latches
      // (`predicates.ts`, `isStanding`), so revealed at 00:00 a column that
      // dipped south at 05:00 and walked back would have satisfied *under the
      // line at the tide's turn* at five minutes past the hour.
      revealAtTick: T(18),
      markerId: 'slope',
      predicate: { kind: 'extract', role: 'cohort', region: 'kell-slope', count: 6 },
    },
    {
      id: 'the-ears',
      text: 'Two of three ears on the slope.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      revealAtTick: T(18),
      markerId: 'slope',
      // Two rows and not one, because `MissionUnit.role` is one string per
      // hull (§8, §13). The mission wants the counts separately anyway — six
      // of eight and two of three read better than eight of eleven, and the
      // Undermarshalcy does not round up.
      predicate: { kind: 'extract', role: 'ears', region: 'kell-slope', count: 2 },
    },
    {
      id: 'the-record',
      text: 'What is heard of the column is entered by the concern, and read later, elsewhere.',
      initial: ObjectiveStatus.Pending,
      // §8 — sixty seconds of Classification, cumulative, in anybody's ears.
      // Non-terminal: meeting it is neither good nor bad, it is a fact about
      // somebody else's registry, and the Directorate enters facts.
      predicate: { kind: 'tolerance', ticks: RECORD_TICKS, tier: ResolutionTier.Classification },
      reading: {
        met: "The column was classified for a minute of the tide by ears that write things down. The corridor's book was opened on it, and the book has a third page.",
        unmet:
          "The column was heard and not held. The corridor's book was opened and closed on a bearing.",
      },
    },
    {
      id: 'the-whole',
      text: 'Eight of ten, and the Holdfast among them.',
      initial: ObjectiveStatus.Pending,
      // §8 — read out, never ranked. Eight of ten cannot be reached without
      // standing inside the concern's corridor for the Holdfast's three
      // minutes, which is entered against the column and not against the
      // plateau.
      predicate: { kind: 'attend', count: 8 },
      reading: {
        met: "Eight of ten. The Holdfast was heard from inside the concern's corridor, which is entered against the column and not against the plateau.",
        unmet: 'Fewer than eight. Gaps are entered as gaps.',
      },
    },
  ],

  /**
   * §9's beat table, in its order. Nineteen minutes, closing as a resolve and
   * **not** a conclusion: the tide turns and the count is read, but this
   * mission can be lost, and a mission that can be lost is resolved rather
   * than concluded (§8).
   *
   * The corridor's transits are authored, not patrol AI, for the standing
   * reason (mission-sorrowgate.md §9): a mission's beats happen at the time
   * the document says they happen. The closure is why; these are when.
   */
  beats: [
    // 00:00 — Korrin assigns, from Sufficiency, to a column she cannot join.
    // §12's first paragraph; the rest of it is the public briefing.
    {
      atTick: 0,
      kind: 'say',
      speaker: 'Undermarshal Setha Korrin',
      text: "A cohort of the Fourth is on the Kell shoulder at three hundred and forty metres. It went up the slope in the tide's dark and it is lying quiet, and it is above the line, and it has been above the line since before this was said.",
      note: 'Read, not heard — the standing status of the say channel. She is born at 2,780 m and cannot survive above 400 m without a suit; the water this mission is fought in would kill her in it, and nobody says so',
    },
    // 00:00 — sixteen `silent` beats. The bleed is already running: every hull
    // is above the line at tick zero and `pressure.ts` is charging it whatever
    // anybody orders (§4).
    goesQuiet(
      'chorister-one',
      'The column, lying quiet. The first decision this mission asks for is whether to stop'
    ),
    goesQuiet('chorister-two', ''),
    goesQuiet('chorister-three', ''),
    goesQuiet('chorister-four', ''),
    goesQuiet('chorister-five', ''),
    goesQuiet('chorister-six', ''),
    goesQuiet('chorister-seven', ''),
    goesQuiet('chorister-eight', ''),
    goesQuiet('submersible-west', ''),
    goesQuiet('submersible-east', ''),
    goesQuiet('cruiser-hull', ''),
    goesQuiet(
      'holding-cruiser-a',
      "The Holding's column at the wall's gate, a smudge all tide, and moved by nothing but the third asking"
    ),
    goesQuiet('holding-cruiser-b', ''),
    goesQuiet('holding-corvette-a', ''),
    goesQuiet('holding-corvette-b', ''),
    goesQuiet('holding-corvette-c', ''),

    // 00:20 — the bleed has finished. Every bar in the panel now has a segment
    // that will not heal, and no order has been given. The mission's
    // introduction, and it takes no beat to deliver — this one only says so.
    stalls(
      T(0, 20),
      'Fifteen in a hundred. It has stopped, and it does not come back.',
      '§4: 0.75% of maximum hull per second, derived as (1 − 0.85) / 20, clamped at 85% and unhealable. The Chorister is at 170, the submersible at 442, the Cruiser hull at 1,020, the column at 3,264'
    ),

    // 01:00 — Tessen, from the shoulder, and Marr's six outer rows begin
    // (`fromTick`). She reports her own hull's physiology as a fact about
    // light and claims nothing (§12).
    {
      atTick: T(1),
      kind: 'say',
      speaker: 'Mara Tessen, 4th Trench Cohort',
      text: 'Three hundred and forty. Nobody in the cohort has been this shallow. The hull bled for twenty seconds and has stopped at fifteen, and the water is lit from the wrong side.',
      note: 'Born at 2,900 m, the column’s voice on the shoulder, and she does not command',
    },

    // 03:00 — the line, stated as an acoustic fact rather than as a hazard.
    stalls(
      T(3),
      'The line is at four hundred. What is above it is not attended and is not asked; it is listened to. The rows are at twelve and north of the corridor, and none of them is heard from the slope.',
      '§4, §7: from the slope the nearest row reads 1.02 to a submersible and 0.90 to a Chorister, against 1.50 for Bearing. The column cannot go down and listen'
    ),

    // 05:00 — the escort walks its corridor west and stands over the strip's
    // middle. Both of §7's five-row stations are under its keel, so the
    // western leg is four minutes in which the transcript costs what it is
    // worth (§9).
    ...escortTo(
      T(5),
      1200,
      "Twenty-seven seconds of transit. A silent hull between x 1,000 and x 1,400 is Track under the escort's keel, Classification from x 800 and Bearing at x 650"
    ),

    // 06:00 — Kell's bell opens (`fromTick`), for twenty seconds, and is
    // entered as not entered.
    stalls(
      T(6),
      "Kell's bell, off-tide. Two hundred of that plateau did not get out in 197 PC and the bell is theirs too. It is not entered; a bell does not need entering.",
      '§6: the loudest thing on the map and worth exactly nothing to the count, because it carries no reading'
    ),

    // 06:30 — the watch at Kell's edge, for the plateaus. The one register in
    // the Rift that cannot use the imperative even to say *leave* (§12).
    {
      atTick: T(6, 30),
      kind: 'say',
      speaker: "The watch at Kell's edge",
      text: "We can hear you. We'd rather you knew that we can, so that nobody has to pretend afterwards. Nothing out here means you harm, and we'd like to keep saying that.",
      note: 'A warning offered as an offer, in the collective first person, closing on what it would *like*',
    },

    // 09:00 — the escort returns east and the strip's quiet band is open again.
    ...escortTo(T(9), 2400, "Back to the frame's east. The strip is the column's again"),

    // 10:00 — the Holdfast's four rows begin (`fromTick`), until 13:00. Three
    // minutes, and the only span in which a column that wants eight of ten
    // has to be inside the corridor (§9).
    stalls(
      T(10),
      'The Holdfast is turning it. It is heard from inside the corridor and from nowhere south of it.',
      "§7: the gate's four read 0.72 from the slope's north edge and nothing at all from the strip"
    ),

    // 11:00 — Teel's bell opens. Two, and the stalls spend one word on it.
    stalls(T(11), "Teel's bell, off-tide. Two.", '§6: also not entered'),

    // 13:00 — the escort walks east, and the Holdfast's rows stop
    // (`untilTick`).
    //
    // **x 2,750 and not §9's x 2,800**, and the file header argues it: at
    // 2,800 the seat at (3350, 2200) is 892 m from the Cruiser through the
    // water column, inside a 900 m gun, and §3's "while the column holds
    // still the corridor does not have it at all" would be false at 13:00 for
    // a column that had done nothing. Both of §9's acoustic readings survive
    // the fifty metres: a silent hull still sitting in the seat is Contact
    // (1.10) and a loud one is Track (4.05).
    ...escortTo(
      T(13),
      2750,
      'Nine hundred and twenty-four metres from the nearest Chorister’s seat — Contact to a silent hull still sitting in it, Track to a loud one, and outside the gun by twenty-four'
    ),

    // 14:00 — the closure walks. Two Corvettes at 85 m/s, arriving 14:26, at
    // Track from the strip long before they are near it (§8).
    ...closureTo(T(14), 2500, 'East along the spur. This is the failure the mission telegraphs'),

    // 16:00 — the escort returns, and Marr's rows stop (`untilTick`). The
    // transcript is closed whatever it holds.
    ...escortTo(T(16), 2400, "The corridor's own station again, for the last three minutes"),

    // 16:30 — the closure continues east, over the seat the column started in.
    ...closureTo(T(16, 30), 4500, 'Over the seat the column started in. The tide is being closed'),

    // 17:30 — the pack, up the slope's west end, ninety seconds before the
    // turn and onto exactly the ground a column coming off the western strip
    // comes down onto. Thin Water's own points, and the telegraph campaign.md
    // §10 measures the close against.
    //
    // `driveTo` carries the depth, because a driven creature otherwise holds
    // its species' working depth — a Draymaw's is 900 m — and §11 authors the
    // pack at 880 (`types.ts`, `driveTo.depthM`; docs/mission-intake.md §6).
    {
      atTick: T(17, 30),
      kind: 'creature',
      tag: 'pack-a',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 1000, y: 2750, depthM: PACK_DEPTH_M },
      driveTo: { x: 1000, y: 2550, depthM: PACK_DEPTH_M },
      untilTick: T(18, 30),
      loud: true,
      note: 'A Draymaw hears a Directorate hull at ×0.4 and commits to a cruising Chorister inside 199 m, a silent one inside 68, and a *descending* one inside 396 — so the order that gets a hull under the line fastest is the order that calls the animals (§8)',
    },
    {
      atTick: T(17, 30),
      kind: 'creature',
      tag: 'pack-b',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 850, y: 2800, depthM: PACK_DEPTH_M },
      driveTo: { x: 900, y: 2600, depthM: PACK_DEPTH_M },
      untilTick: T(18, 30),
      loud: true,
      note: '',
    },

    // 18:00 — the slope is called, and `the-slope` and `the-ears` are revealed
    // at this tick. Intake's roll idiom: the beat and the reveal share a tick.
    stalls(
      T(18),
      'The slope is called. The line is at four hundred and the column is asked to be under it.',
      '§8, §9: the two withdrawal rows and their marker appear with this line. Ninety seconds, against a column that walks at 32 and 650 m of crossing — twenty seconds cruising, thirty-seven silent'
    ),

    // 19:00 — the tide turns. Korrin reads the count, and then says one
    // sentence she should not say aloud, for the fourth consecutive mission.
    {
      atTick: T(19),
      kind: 'say',
      speaker: 'Undermarshal Setha Korrin',
      text: 'The shallows take fifteen and stop. That is written. It was written by people who had never lost the fifteen.',
      note: 'Made to nobody, by the person the rule now belongs to. Nobody responds to it',
    },
    {
      atTick: T(19),
      kind: 'resolve',
      // Not a conclusion (§8): the tide turns and the count is read, but this
      // mission can be lost, and a mission that can be lost is resolved. The
      // telegraph campaign.md §10 asks for is the pack at 17:30, ninety
      // seconds out against a sixty-second rule.
      note: 'The tide turns. Korrin reads the count as it stands',
    },
  ],

  /**
   * §9's conditional beats — Rell's three askings, fired by the tally or the
   * closure rather than by the clock, in two choice groups.
   *
   * The `tolerance` form is the loose one: the column's own exposure tally
   * rather than a trigger volume, so every ear that can hold the column at
   * Bearing belongs to the concern and a column that stays out of them is
   * never asked. The two `extract` forms are the ones literally inside the
   * closure (§9, §13).
   */
  conditionalBeats: [
    firstAsking(
      { kind: 'extract', role: 'cohort', region: 'grid-spur', count: 1 },
      'A cohort hull standing in the posted closure. Down there it walks at forty again, which is the mission’s most uncomfortable single fact and belongs to the concern (§4)'
    ),
    firstAsking(
      { kind: 'extract', role: 'ears', region: 'grid-spur', count: 1 },
      'Or an ear. Rell does not distinguish, and could not: he has a bearing and no idea what it is'
    ),
    firstAsking(
      { kind: 'tolerance', ticks: FIRST_ASKING_TICKS, tier: ResolutionTier.Bearing },
      'Or twenty cumulative seconds at Bearing — under the second asking’s thirty at Classification by ten, so the first is due strictly before the second on every route into the corridor (§9, §13)'
    ),
    {
      kind: 'say',
      speaker: RELL,
      text: 'This is not a threat and it is not a negotiation; it is the second time of asking, and there is a third.',
      note: 'Thirty cumulative seconds at Classification. No group: the second asking retires nothing and is retired by nothing',
      when: { kind: 'tolerance', ticks: SECOND_ASKING_TICKS, tier: ResolutionTier.Classification },
    },
    {
      kind: 'say',
      speaker: RELL,
      text: 'The corridor is closed and the order is enforced. Whatever is in it is a matter for the registry now, and the registry is patient.',
      note: "Ninety cumulative seconds at Classification, and the only thing that moves the Holding's column. Rell's third and last, all three procedure",
      when: { kind: 'tolerance', ticks: THIRD_ASKING_TICKS, tier: ResolutionTier.Classification },
      choiceGroup: 'third',
    },
    {
      kind: 'move',
      tag: 'corridor-cruiser',
      x: 1200,
      y: 1450,
      note: "The escort onto the strip's middle, where the transcript is read. It still never goes below y 1,750",
      when: { kind: 'tolerance', ticks: THIRD_ASKING_TICKS, tier: ResolutionTier.Classification },
      choiceGroup: 'third',
    },
    ...HOLDING.map(holdingUnsilenced),
    ...HOLDING.map(holdingMoves),
  ],

  /**
   * §8's Results, verbatim — Korrin's three readings, with `the-record`'s pair
   * and `the-whole`'s printing beneath whichever row the run earned, and the
   * ten rows' own entered/gap lines under those, in authored order.
   *
   * "You were sufficient" is the middle reading and the highest praise the
   * register has, spent on a partial for the third time in four missions.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      'The Shelf was listened to and the column is under the line. Both are entered. Fifteen in a hundred was paid on every hull that went up and it does not come back; that is entered too, against the shoulder, which does not keep accounts.',
    [MissionOutcome.Partial]:
      'You were sufficient. The Shelf was entered, or the column came down, and the other is short. A hull left on the shoulder is not a failure of the column; it is the water, and the water was written down before anybody went into it.',
    [MissionOutcome.Lost]:
      "The Shelf was not entered and the column did not come down. The bells rang for a plateau's decision and the Undermarshalcy has it from nobody, which was the arrangement before and is the arrangement again.",
  },
};
