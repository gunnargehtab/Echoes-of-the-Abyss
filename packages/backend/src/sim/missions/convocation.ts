/**
 * The Second Seeding 3 — Convocation. docs/mission-convocation.md, transcribed.
 *
 * A data literal in `tend.ts`' idiom, on `tend.ts`' map: the document owns every
 * number — the rows, the ceiling, the patiences, the beat times, the transits.
 * Where this file and that document disagree, one of them is wrong and the fix
 * says which.
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **The walk is the mission** (§4). Seven rows in an order, a sixty-second
 *   hold, a ceiling of 26 measured at the row rather than a floor on the hull,
 *   and ninety seconds of stall that puts the circuit back at the first row.
 *   The ceiling sits two above a moving tender's 18 and two below a Corvette's
 *   28, which is why the guns hold the row *next door*.
 * - **The commander's one act exists now** (§4.4). Marr's Convocation, both
 *   halves: fifteen seconds of a quiet army at 1.25× within 2,000 m of the
 *   Holdfast, *and* every bell rung at once so the remaining rows turn
 *   together. §13 asks for both or neither.
 * - **The concern never fires first, and its hulls are armed anyway** (§6).
 *   The assertion's transits are authored beats rather than patrol AI, and what
 *   it will answer is obstruction — which is what an armed hull in this
 *   simulation does on its own. Cold weapons would have been the wrong lie
 *   here; Tend's sweep was cold because it files rather than fights.
 * - **The tide's end is a conclusion and the Holdfast is the failure** (§8).
 *   A count that does not close is a plateau that is still turning, which the
 *   Commune has been for two hundred years; the one real loss is sixty
 *   continuous seconds of somebody else standing in home water, at the loudest
 *   SIG on the map.
 *
 * **The map is `marr-plateau`, unchanged** (§11) — the first time two missions
 * resolve to one map literal, which this file confirms rather than adds. What
 * the mission adds is markers, not geometry.
 *
 * Two things the document names and this literal deliberately does not build,
 * because §13 assigns them elsewhere: cross-mission Drift Health, and the
 * briefing variant a *filed* Tend should produce.
 */

import {
  COMMANDER_ABILITY,
  Faction,
  FaunaSpecies,
  MissionOutcome,
  ObjectiveStatus,
  SEEDING_CONVOCATION_HEADER,
  SIM,
  UnitKind,
} from '@echoes/shared';

import type { MissionDefinition } from './types.ts';
import { WEST_LANE_CLUSTERS } from './tend.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/** Reserved and empty, as Tend reserves it: no court, no array, no ledger. */
const COURT = 1;
/** The assertion — the concern, serving an interest under grid law (§5, §6). */
const CONCERN = 2;

/**
 * §11's row radius, hold and ceiling. Authored here rather than in
 * `constants.ts` for the rule `MissionSounding` states about its own 400 m:
 * these are one mission's arithmetic against one terrace, not a rule of the
 * world. `COMMANDER_ABILITY`'s three figures are the other way round, and are
 * imported for it.
 */
const ROW_RADIUS_M = 400;
/** §4.1 — sixty seconds of a hull standing in a row's water, quiet. */
const ROW_HOLD = T(1);
/** §4.1 — two above a moving tender, two below a Corvette. The mission. */
const ROW_CEILING_SIG = 26;
/** §4.2 — ninety seconds of stall and the walk returns altered. */
const STALL_PATIENCE = T(1, 30);
/**
 * §4.4 — "Every bell at once is authored at SIG 70", the figure construction
 * broadcasts at and the loudest number this map has ever carried. One bell is
 * this loud; what the emergency convocation costs is that all seven ring.
 */
const BELL_SIG = 70;
/** A ring, not a pattern. Long enough to cross the terrace and be over. */
const BELL_TICKS = T(0, 6);
/**
 * The water the bells hang in, and the water the plateau works.
 *
 * One figure for the terrace: the shallowest row sits over the Gardens' 250 m
 * floor, so everything the plateau owns is authored above it, exactly as
 * `mission-tend.md`'s day is.
 */
const PLATEAU_DEPTH_M = 240;
/** The drop, where the concern waits and where it is heard from (§6). */
const DROP_DEPTH_M = 550;

export const SEEDING_CONVOCATION: MissionDefinition = {
  ...SEEDING_CONVOCATION_HEADER,
  doc: 'docs/mission-convocation.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Pelagia,
  courtSlot: COURT,
  /** §5 — the pack at the foot of the drop is authored; nothing else is. */
  fauna: false,
  /** §4, §9 — 26, a ceiling, and the first budget in the campaign measured at a place. */
  sigBudget: ROW_CEILING_SIG,
  // No arrayTag: the plateau lends nothing and keeps no ledger. The stillness
  // of Tend was custom rather than procedure and this tide has stopped even
  // that — the work is not happening at all (§2).
  silenceCeilingSig: 100,
  debtCapS: 0,
  /** Zero — a plateau that has stopped working moves on nobody's permission. */
  escortRadiusM: 0,
  /**
   * §9 — the tide turns at 19:00 whatever the count stands at, and Marr reads
   * it as it stands. "The circuit's length is the mission's clock, and it takes
   * exactly as long as it takes; a plateau under attack cannot vote faster"
   * (habitats.md §2), which is a sentence about a close that does not move
   * because the player was quick.
   */
  runsItsLength: true,

  regions: [
    {
      id: 'holdfast',
      x: 2250,
      y: 250,
      widthM: 750,
      heightM: 500,
      note: "Home, and the mission's stake. The plateau is held if somebody else stands here for a minute (§8)",
    },
    {
      id: 'watch-edge',
      x: 1750,
      y: 1750,
      widthM: 500,
      heightM: 375,
      note: "The watch's edge — trench paint, PF 1.6, and the only ground on a plateau that carries. The count is read here (§11; habitats.md §2)",
    },
  ],

  /**
   * §4 and §11 — the circuit, in the order the document walks it, at the
   * document's own coordinates. Seven rows, 400 m each, sixty seconds each,
   * and 6,579 m of holdfast line against a force of nine hulls.
   */
  walk: {
    holdTicks: ROW_HOLD,
    ceilingSig: ROW_CEILING_SIG,
    stallTicks: STALL_PATIENCE,
    bell: { sig: BELL_SIG, ticks: BELL_TICKS, depthM: PLATEAU_DEPTH_M },
    note: 'A convocation is walked. It opens at one row and passes along the holdfast lines (§1)',
    rows: [
      {
        id: 'row-one',
        x: 1625,
        y: 500,
        radiusM: ROW_RADIUS_M,
        markerId: 'row-one',
        note: "The Gardens' east end, where the walk opens. The bloom nodes Tend harvested, standing untended for a tide",
      },
      {
        id: 'row-two',
        x: 750,
        y: 875,
        radiusM: ROW_RADIUS_M,
        markerId: 'row-two',
        note: 'The west end, and the first row the assertion stands on',
      },
      {
        id: 'row-three',
        x: 500,
        y: 1125,
        radiusM: ROW_RADIUS_M,
        markerId: 'row-three',
        note: "The lane's head. The Tetherjelly clusters re-seated in Tend are here, and the -0.10 PF they bought is the one row that is quiet on its own",
      },
      {
        id: 'row-four',
        x: 1125,
        y: 1625,
        radiusM: ROW_RADIUS_M,
        markerId: 'row-four',
        note: "The lane's foot, closest to the drop, and the row the concern holds longest",
      },
      {
        id: 'row-five',
        x: 1875,
        y: 1250,
        radiusM: ROW_RADIUS_M,
        markerId: 'row-five',
        note: 'Mid-terrace, between the lane and the Holdfast. Open, and there is nothing here to hide behind',
      },
      {
        id: 'row-six',
        x: 2625,
        y: 625,
        radiusM: ROW_RADIUS_M,
        markerId: 'row-six',
        note: "Home's own row. If this row cannot turn, the Holdfast is contested",
      },
      {
        id: 'row-seven',
        x: 3375,
        y: 1000,
        radiusM: ROW_RADIUS_M,
        markerId: 'row-seven',
        note: "The east rows, toward Teel's landing. The furthest from everything",
      },
    ],
  },

  /**
   * §8's one failure state, and §13's prediction that it is the walk's stall
   * with the sign flipped. Sixty *continuous* seconds, which is also how
   * campaign.md §10's telegraph is paid: the hull that can do it is a Cruiser
   * with its systems live at 65 SIG, audible to a tender's deaf HYD 30 from
   * 2,252 m, for the whole minute it is doing it.
   */
  holds: [
    {
      id: 'held',
      region: 'holdfast',
      ticks: T(1),
      objectiveId: 'holdfast',
      closes: true,
      note: 'They are on the Holdfast. Nobody was hurt and nothing was taken, and by this evening the ground will have a number',
    },
  ],

  /**
   * §4.4 — Marr's Convocation, both halves, and the line she says if it is
   * rung. The three figures are docs/characters.md's and are imported rather
   * than retyped; SIG 70 is this document's and is not.
   */
  commanderAbility: {
    id: 'convocation',
    label: 'ring every bell',
    description:
      'Every row at once. The circuit stops being a queue, and everything on the drop learns what we sound like when we agree.',
    x: 2625,
    y: 375,
    depthM: PLATEAU_DEPTH_M,
    radiusM: COMMANDER_ABILITY.CONVOCATION_RADIUS_M,
    durationTicks: COMMANDER_ABILITY.CONVOCATION_DURATION_S * SIM.TICK_HZ,
    speedMultiplier: COMMANDER_ABILITY.CONVOCATION_SPEED_MULTIPLIER,
    // The half that is worth anything to this faction and nearly nothing to
    // anybody else: the Commune pay 0.8 for silence where the Rift pays 0.55,
    // so lifting the multiplier and adding the bonus reads 0.8 → 1.0 → 1.25
    // (§4.4). The SIG floor stays, and §4 is emphatic about why.
    silentRunningImmunity: true,
    sig: BELL_SIG,
    collapsesWalk: true,
    line: {
      speaker: 'Tidespeaker Ysolde Marr',
      text: 'All of them. Now, please. — and then, quietly, to nobody: "It was always going to be a tide like this one. I used to think that meant I’d know."',
    },
    note: 'She has never invoked it. It exists. It has never been used (characters.md)',
  },

  /**
   * The seven rows and the edge, as §11's table names them. Row markers are
   * shipped one at a time — whichever row the walk is on — so the circuit is
   * not on the wire at 01:00; the edge is named by its own objective and is
   * public ground either way.
   */
  markers: [
    { id: 'row-one', label: 'The walk opens on the east gardens.', x: 1625, y: 500, radiusM: 400 },
    { id: 'row-two', label: "The walk's on the west end.", x: 750, y: 875, radiusM: 400 },
    { id: 'row-three', label: "The walk's at the lane's head.", x: 500, y: 1125, radiusM: 400 },
    { id: 'row-four', label: "The walk's at the lane's foot.", x: 1125, y: 1625, radiusM: 400 },
    { id: 'row-five', label: "The walk's mid-terrace.", x: 1875, y: 1250, radiusM: 400 },
    { id: 'row-six', label: "The walk's on home's own row.", x: 2625, y: 625, radiusM: 400 },
    { id: 'row-seven', label: "The walk's on the east rows.", x: 3375, y: 1000, radiusM: 400 },
    {
      id: 'watch-edge',
      label: "The watch's edge. The bare slope is the only ground that carries.",
      x: 2000,
      y: 1875,
      radiusM: 350,
    },
    {
      id: 'holdfast',
      label: 'The Holdfast. Home — named for what anchors kelp.',
      x: 2625,
      y: 375,
      radiusM: 400,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Pelagia,
      note: "Marr Plateau with its work stopped: the rows, the watch, and — for the first time in this campaign — Warden Juno Teel's element, which has guns (§2)",
      units: [
        // The rows: four tenders, not tendering. They are not carrying share
        // today; they are carrying the question, and 8 idle against a ceiling
        // of 26 is what lets one hold a row while moving (§2, §3).
        {
          tag: 'tender-one',
          kind: UnitKind.Harvester,
          x: 2560,
          y: 420,
          depthM: PLATEAU_DEPTH_M,
          role: 'tender',
          pressureRating: 1,
          note: "The plateau's presence at a row. Slow, deaf, and the only thing on the map a row will turn around",
        },
        {
          tag: 'tender-two',
          kind: UnitKind.Harvester,
          x: 2690,
          y: 420,
          depthM: PLATEAU_DEPTH_M,
          role: 'tender',
          pressureRating: 1,
          note: '',
        },
        {
          tag: 'tender-three',
          kind: UnitKind.Harvester,
          x: 2625,
          y: 480,
          depthM: PLATEAU_DEPTH_M,
          role: 'tender',
          pressureRating: 1,
          note: '',
        },
        {
          tag: 'tender-four',
          kind: UnitKind.Harvester,
          x: 2500,
          y: 480,
          depthM: PLATEAU_DEPTH_M,
          role: 'tender',
          pressureRating: 1,
          note: 'Four of them against seven rows is the mission’s arithmetic, and it is short on purpose',
        },
        // The watch: the best mobile ears outside the Directorate, and the
        // fastest hull on the water. Unchanged from Tend, and today it is also
        // how a row gets a hull in time (§3).
        {
          tag: 'watch-one',
          kind: UnitKind.LightScout,
          x: 2560,
          y: 340,
          depthM: PLATEAU_DEPTH_M,
          role: 'escort',
          pressureRating: 1,
          note: 'The watch — listen down the drop, and carry the count to the edge when there is one',
        },
        {
          tag: 'watch-two',
          kind: UnitKind.LightScout,
          x: 2690,
          y: 340,
          depthM: PLATEAU_DEPTH_M,
          role: 'escort',
          pressureRating: 1,
          note: '',
        },
        // Teel's element. Armed, because §6's assertion answers obstruction
        // and an unarmed answer is not one — and seated east of home, off the
        // row line, because a Corvette at 28 is two rows of nothing (§4).
        {
          tag: 'gun-one',
          kind: UnitKind.Corvette,
          x: 3100,
          y: 300,
          depthM: PLATEAU_DEPTH_M,
          role: 'guns',
          armed: true,
          pressureRating: 1,
          note: 'Above the row ceiling by two, which is the mission. They hold the row next door or they hold nothing',
        },
        {
          tag: 'gun-two',
          kind: UnitKind.Corvette,
          x: 3200,
          y: 380,
          depthM: PLATEAU_DEPTH_M,
          role: 'guns',
          armed: true,
          pressureRating: 1,
          note: '',
        },
        {
          tag: 'gun-three',
          kind: UnitKind.Corvette,
          x: 3120,
          y: 460,
          depthM: PLATEAU_DEPTH_M,
          role: 'guns',
          armed: true,
          pressureRating: 1,
          note: 'Three Corvettes stand on Marr Plateau today because the Warden put them there and no vote was taken about it',
        },
      ],
    },
    {
      slot: CONCERN,
      faction: Faction.Bathyarch,
      note: 'The assertion — never given a commander’s name (§5). An instrument with a schedule, serving an interest under grid law and holding the ground it concerns until a decision is produced',
      units: [
        {
          tag: 'assert-one',
          kind: UnitKind.Corvette,
          x: 900,
          y: 2050,
          depthM: DROP_DEPTH_M,
          armed: true,
          note: 'Below the lip until 03:30. It does not have to fire. It has to be there (§4.2)',
        },
        {
          tag: 'assert-two',
          kind: UnitKind.Corvette,
          x: 1300,
          y: 2150,
          depthM: DROP_DEPTH_M,
          armed: true,
          note: 'Two Corvettes that never fight, moving row to row, are worth more to the assertion than two that win an engagement (§4.3)',
        },
        {
          tag: 'assert-heavy',
          kind: UnitKind.Cruiser,
          x: 2400,
          y: 2400,
          depthM: DROP_DEPTH_M,
          armed: true,
          note: '55 idle, 65 with systems live, audible from every row on the terrace. The player always knows where it is, and knowing buys nothing (§6)',
        },
      ],
    },
  ],

  /**
   * §3 — what the force does not carry. One lock, and the shortest list in the
   * campaign, because this is the mission that hands the last button over:
   * active sonar arrives here by campaign.md §10 and is deliberately *not*
   * locked (§4). It is priced instead, by there being nothing on this map it is
   * the answer to.
   */
  locks: [
    {
      ability: 'construction',
      reason: 'nothing is built during a turning',
    },
  ],

  /**
   * §12's "Objective readings, in play", verbatim. The Commune cannot command,
   * so its objectives arrive as statements of what the tide holds — and the
   * walk carries two of them, because a stalled row is the same ask read a
   * second way (types.ts, `stallText`).
   */
  objectives: [
    {
      id: 'walk',
      text: 'The walk wants somebody standing on it, and it wants it quiet.',
      stallText:
        "That's still turning. It'll come round again — we've lost the walk, not the question.",
      initial: ObjectiveStatus.Pending,
      terminal: true,
      predicate: { kind: 'walk', count: 7 },
    },
    {
      id: 'count',
      text: 'The count goes to the edge, and the edge carries — everything on the drop is about to know what we sound like when we agree.',
      initial: ObjectiveStatus.Pending,
      markerId: 'watch-edge',
      terminal: true,
      predicate: { kind: 'extract', role: 'escort', region: 'watch-edge', count: 1 },
      reading: {
        met: 'The count was read at the edge, in the open, the way it has always been read.',
        unmet:
          'Nobody carried it to the edge. There is nothing to read out and nothing to have heard.',
      },
    },
    {
      id: 'holdfast',
      text: 'Home is behind you. Nobody is asking you to defend it; we are saying it is behind you.',
      initial: ObjectiveStatus.Pending,
      // Terminal and the keystone, and the pairing is §8's: everything else is
      // an outcome rather than a failure, and this is the one that is not.
      // Met by simply lasting the tide — the hold is what fails it, at the
      // same tick the Holdfast is taken.
      terminal: true,
      keystone: true,
      markerId: 'holdfast',
      predicate: { kind: 'endure', ticks: T(18, 45) },
      reading: {
        met: 'They did not get to stand on it, and we did not have to shoot anybody to arrange that.',
        unmet:
          "They're on the Holdfast. We'd like you to notice that they did that without firing.",
      },
    },
  ],

  /**
   * §9's beat table, in its order. Nineteen minutes, closing as a conclusion:
   * the tide turning is not a timer (glossary.md, *Mission Outcome*), and this
   * mission's one real failure is a hold rather than a clock.
   */
  beats: [
    // 00:00 — the bell, once, rung by Marr. Every row at SIG 70, and every
    // neighbour hears it. The plateau has announced that it has stopped.
    {
      atTick: 0,
      kind: 'bell',
      note: 'A plateau that convenes says so, out loud, and stops working while it does',
    },
    {
      atTick: 0,
      kind: 'say',
      speaker: 'Tidespeaker Ysolde Marr',
      text: "We rang it off-tide. You'll have heard. Everyone will have heard. That's not a slip.",
      note: '',
    },
    // 00:00 — the pack at the foot of the drop, as Tend authors it and in the
    // same water: audible all mission, physically unable to climb (§5).
    {
      atTick: 0,
      kind: 'creature',
      tag: 'pack-a',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 900, y: 2300, depthM: 890 },
      driveTo: { x: 1000, y: 2250 },
      untilTick: T(0, 20),
      loud: false,
      note: 'Owned by nobody. Heard all mission. Out of reach by depth, exactly as in Tend',
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
    // 00:00 — the West Lane's clusters, the same three Tend re-seated and in
    // the same water (§11): the −0.10 PF the third row leans on is theirs,
    // and it is what makes row 3 the one row that is quiet on its own. The
    // lane's foot sits outside every cluster's 250 m, so row 4 gets none of
    // it (§13). Drift Health carries between the two missions on this map;
    // a player who worked Tend loudly finds the field thinner (§2 rule 5).
    ...WEST_LANE_CLUSTERS,

    // 01:00 — the walk opens at the first row. Nothing is on the map that
    // should not be.
    {
      atTick: T(1),
      kind: 'say',
      speaker: 'Tidespeaker Ysolde Marr',
      text: "It opens on the east gardens and it goes row to row, and it comes back when it comes back with nothing new in it. We can't make that faster.",
      note: 'The walk is live from tick zero; this is where the plateau says so',
    },

    // 02:00 — the watch calls the drop. Three on the lane, standing off, not
    // climbing: two light, one heavy behind them.
    {
      atTick: T(2),
      kind: 'say',
      speaker: 'The watch',
      text: 'Three on the lane, standing off. Two light and something heavy behind them, and none of them is climbing yet.',
      note: '',
    },

    // 03:30 — the assertion is read into the water, in the clear, and the
    // concern's two Corvettes come over the lip and stand on the second and
    // fourth rows (§6, §12).
    {
      atTick: T(3, 30),
      kind: 'say',
      speaker: 'The assertion, read into the water',
      text: 'Asset assessment, north shoulder terraces, this survey year. An interest is asserted in the ground and yield of this terrace pending production of a decision by the holding party. The concern will hold the ground concerned while the assertion stands. Nothing is being taken. Nothing will be fired upon. This reading is the notice and the notice is complete.',
      note: 'A procedure heard in its own register, so it does not become a villain by default (§5)',
    },
    {
      atTick: T(3, 30),
      kind: 'move',
      tag: 'assert-one',
      x: 750,
      y: 875,
      depthM: PLATEAU_DEPTH_M,
      note: 'The second row',
    },
    {
      atTick: T(3, 30),
      kind: 'move',
      tag: 'assert-two',
      x: 1125,
      y: 1625,
      depthM: 260,
      note: 'The fourth row — the one the concern holds longest (§11)',
    },

    // 06:00–09:00 — the circuit runs against two Corvettes that move row to
    // row and never fire. The player learns that the guns cannot stand where
    // the question is (§4).
    {
      atTick: T(6),
      kind: 'move',
      tag: 'assert-one',
      x: 500,
      y: 1125,
      depthM: 260,
      note: "The lane's head",
    },
    {
      atTick: T(7, 30),
      kind: 'move',
      tag: 'assert-two',
      x: 1875,
      y: 1250,
      depthM: 280,
      note: 'Mid-terrace, where there is nothing to hide behind',
    },

    // 09:00 — the Cruiser comes over the lip. The concern's patience acquires
    // a weight (§9).
    {
      atTick: T(9),
      kind: 'move',
      tag: 'assert-heavy',
      x: 1125,
      y: 1625,
      depthM: 260,
      note: 'Onto the row line. Audible from every row on the terrace',
    },
    {
      atTick: T(9),
      kind: 'say',
      speaker: 'The watch',
      text: "That's the big one over the lip. You'll not need us to tell you where it is. You'll not need us to tell you where it is at any point today.",
      note: 'A bearing refused on the grounds that a bearing would be redundant (§12)',
    },

    // 11:00 — the fifth and sixth rows, if the plateau has kept its circuit.
    // The concern reads the arithmetic correctly and plays it.
    {
      atTick: T(11),
      kind: 'move',
      tag: 'assert-one',
      x: 1875,
      y: 1250,
      depthM: 280,
      note: '',
    },
    {
      atTick: T(11),
      kind: 'move',
      tag: 'assert-two',
      x: 3375,
      y: 1000,
      depthM: 280,
      note: 'The east rows, and the furthest thing from everything',
    },

    // 13:00 — the Cruiser turns off the row line and stands toward the
    // Holdfast, systems live, at the loudest SIG on the map. §8's sixty
    // seconds start when it arrives, and the `holds` row above spends them.
    {
      atTick: T(13),
      kind: 'move',
      tag: 'assert-heavy',
      x: 2625,
      y: 375,
      depthM: PLATEAU_DEPTH_M,
      note: 'From anywhere on the terrace, to everything on it, for a full minute before it arrives',
    },
    {
      atTick: T(13),
      kind: 'say',
      speaker: 'The watch',
      text: "The heavy's off the row line. It's standing toward the Holdfast.",
      note: '',
    },

    // 15:00 — Teel says it. Not to the player, and not as an argument she
    // expects to win (§12).
    {
      atTick: T(15),
      kind: 'say',
      speaker: 'Warden Juno Teel',
      text: "I'm not going to argue with you, Ysolde. I've stopped. I'll just say the thing and then I'll go and stand where you'd rather I didn't. You can refuse to fight. You cannot refuse to be fought. They've been on our rows for eleven minutes and nobody has broken a rule, and we are losing. Ring it or don't. But stop telling the young ones that not having a way to do this is the same as having decided not to.",
      note: 'The imperative mood arriving in a Commune mouth and being apologised for in advance',
    },

    // 15:30 — the window in which emergency convocation is worth ringing. The
    // beat table does not ring it; the player does, and Marr's line rides the
    // act rather than the clock (`commanderAbility.line`).
    {
      atTick: T(15, 30),
      kind: 'say',
      speaker: 'Tidespeaker Ysolde Marr',
      text: "There's a bell for all of this. Every row at once. We'd rather come home without ringing it. We're saying rather.",
      note: 'The window §9 puts the decision in. The decision is not authored',
    },

    // 17:00 — the count is read at the watch's edge, at 30 SIG on trench
    // paint, audible to everything on the drop (§7, §9).
    {
      atTick: T(17),
      kind: 'say',
      speaker: 'Tidespeaker Ysolde Marr',
      text: "If it's come round with nothing new in it, somebody take it to the edge. Nobody speaks to the watch while the watch is at the edge; today is the exception we agreed to.",
      note: '',
    },

    // 19:00 — the tide turns. Marr reads the count as it stands, and then says
    // the one sentence she should not say aloud (§8, §12). A conclusion: the
    // mission's one failure is the hold, and the hold has its own minute.
    {
      atTick: T(19),
      kind: 'say',
      speaker: 'Tidespeaker Ysolde Marr',
      text: "We built a way of deciding things that can't be rushed, because nothing that mattered had ever needed to be. I'd like the record to show we were right for two hundred years. There isn't a record.",
      note: 'The Commune’s proudest fact and its epitaph in the same breath',
    },
    {
      atTick: T(19),
      kind: 'resolve',
      conclusion: true,
      note: 'The tide turns. The count is read as it stands',
    },
  ],

  /**
   * §8's Results, verbatim — Marr's three readings, and the closed count's is
   * deliberately the least comfortable of them. The objectives' own readings
   * are appended beneath, in authored order, so a run that closed the walk and
   * never carried it to the edge is read as the run it was.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      "It came back with nothing new in it. That's a count. Whatever we've just decided, we decided it — and there's no paper anywhere that will ever say so, which is the same protection it has always been and the first time I've heard it sound thin.",
    [MissionOutcome.Partial]:
      "We're not refusing. We're still turning it. We've said that sentence to four generations of people who wanted an answer today, and it has never once been a lie. It has also never once been said with somebody standing on the fourth row.",
    [MissionOutcome.Lost]:
      "They're on the Holdfast. Nobody was hurt and nothing was taken, and by this evening the ground we're standing on will have a number. We'd like you to notice that they did that without firing.",
  },
};
