/**
 * The Second Seeding 6 — Radicals. docs/mission-radicals.md, transcribed.
 *
 * A data literal in `inWriting.ts`' idiom, on the prologue's map: the document
 * owns the forces, the water, the beats, the numbers and the text. Where this
 * file and that document disagree, one of them is wrong and the fix says which.
 *
 * §13 predicted that this mission would need no row the format does not have,
 * and the literal found that true — no new predicate, no new beat kind, no new
 * field. What it spends instead is one thing the format has always carried and
 * no shipped literal had ever used, and four things worth stating here so a
 * reviewer can overrule them rather than discover them:
 *
 * 1. **Eighty-eight `move` beats addressed to the player's own hulls** (§4,
 *    §13). `runtime.ts`' `fire` applies a `move` on whatever slot owns the tag
 *    — `sink.applyMove(Owner.slot[eid], …)`, then `applyDepth` if the beat
 *    carries one — and nothing in the format or its tests forbids a
 *    player-party tag. That is the mission: the Bloomwright's orders are
 *    ordinary orders, the player may countermand them, and the next one lands
 *    thirty seconds later.
 * 2. **Every leg carries its depth, and that is the price of a hold** (§4.2).
 *    `match.ts`' `applyDepth` clears Silent Running only for a target *deeper*
 *    than the hull ("diving is not something you do quietly"), so re-ordering a
 *    column already at 1,475 m to 1,475 m costs a silent column nothing, and a
 *    column the player brought up is dived again at the half, at
 *    `DEPTH.DESCENT_SIG`. Dropping the depth off the re-order would delete the
 *    system; carrying it on the first order of each leg only would delete half
 *    of it.
 * 3. **`releaseTick` binds by tag and the escort half is off** (§9, §13). The
 *    four seed hulls carry the role `tender` — the Commune's own word, and the
 *    role every predicate in §8 counts — and with `escortRadiusM: 0` the
 *    continuous escort hold reads every tender as escorted while the
 *    `releaseTick` half keeps its own force to 01:00. Nothing in this column
 *    waits for a gun.
 * 4. **No `runsItsLength`, deliberately** (§8). The pass on which four seed
 *    hulls stand in the far water meets both terminal rows and closes the
 *    mission there, with Anholt's conditional line on the same pass. A column
 *    that is through is through; a partial column runs to 15:00 through the
 *    basin rising at 12:00 and is read from the Concourse. Stated because
 *    *Deep Furrow* and *In Writing* both set the flag and a reviewer will ask.
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **The lane is drawn under everything in the water, by four or five
 *   points** (§6). Nothing the column does on the Bloomwright's clock is over
 *   the colossus's Interest of 55: the barge with its systems live reads 50.7
 *   beside it at 750 m and the third dive reads 49.9 at the crossing. A dive
 *   taken at the tenth waypoint — a column the player brought up and the
 *   half-minute put back down — reads 56.1, and that is the whole margin.
 * - **The basin is placed, not driven, until 12:00** (§6, and `intake.ts`'
 *   row). Every creature is committed to its own spawn until tick zero, which
 *   hands it straight back to its trigger model; the one drive is the crossing
 *   at 12:00, `loud`, with its own `depthM` so the colossus climbs the 300 m
 *   from where it lies to the lane's own 2,300 m.
 * - **Every creature is authored at its species' own working depth.** Read off
 *   the roster rather than retyped, because a placed creature holds
 *   `workingDepthM` whatever a beat spawns it at unless a live commitment says
 *   otherwise (`holdCommitments`) — so a literal that disagreed with the
 *   roster would be silently overruled by it. The shoals' 250, the pack's 900,
 *   the Hollows' 1,700 and the Sounder's 2,000 are §11's figures and the
 *   roster's at once.
 * - **The refit is on the hulls and not on the water** (§3, §11). Four seed
 *   hulls carry `pressureRating: 3` over the roster's 2, because
 *   `requiredPressureRating(2300)` is 3. No region carries a `pressureBonus`
 *   and no `ground` beat sows one: nothing manufactures habitable water in a
 *   place that fell, and the Commit is PR-3 water that stays PR-3.
 *
 * And one finding this literal makes against the format as built, stated here
 * rather than discovered: **a pack is one entity.** `spawnFauna` places one
 * creature per `creature` beat, and §9 authors `creature` × 7 — so the five
 * Draymaws §6 prices are one authored animal carrying the roster's Draymaw
 * figures, exactly as `inWriting.ts`' `lanes-pack` is. The arithmetic §6 does
 * with them is per-animal and unaffected; what a player meets is one.
 */

import {
  Faction,
  FaunaSpecies,
  MissionOutcome,
  ObjectiveStatus,
  SEEDING_RADICALS_HEADER,
  SIM,
  UnitKind,
  faunaStatsFor,
} from '@echoes/shared';

import { SOLID } from '../terrain.ts';
import type { MissionBeat, MissionDefinition, MissionUnit } from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/**
 * Reserved and empty, as every Commune literal reserves it — and empty in the
 * fiction too, for the first time: the chamber fell in the spring and the
 * record went up to the Concourse with whoever went up (§2).
 */
const COURT = 1;

/** §11 — the seat, on the Concourse's 340 m floor, above the layer. */
const SEAT_DEPTH_M = 330;
/** §11 — the watch, at the same table and a little higher. The Shelf is its water. */
const WATCH_DEPTH_M = 300;

/**
 * §5's four ordered depths — the stack of dives, each into a hunter's band and
 * out under it: 330 at the Concourse, 850 in the Descent (Draymaw water),
 * 1,475 through the lock and the Gate (Hollow water, 175 m under the pack's
 * floor), 2,300 across the basin (150 m under the Hollows').
 */
const CONCOURSE_M = 330;
const DESCENT_M = 850;
const LOCK_M = 1475;
const BASIN_M = 2300;

/** §11 — the creatures, at their species' own working depths (see the note above). */
const SHOAL_DEPTH_M = faunaStatsFor(FaunaSpecies.Lampfry).workingDepthM;
const PACK_DEPTH_M = faunaStatsFor(FaunaSpecies.Draymaw).workingDepthM;
const HOLLOW_DEPTH_M = faunaStatsFor(FaunaSpecies.Hollow).workingDepthM;
const COLOSSUS_DEPTH_M = faunaStatsFor(FaunaSpecies.Sounder).workingDepthM;

/** §9 — the four seed hulls, held to 01:00 and ordered by the barge thereafter. */
const COLUMN = ['the-barge', 'seed-one', 'seed-two', 'seed-three'];

/**
 * One leg of the column, on the Bloomwright's clock — four `move` beats at one
 * tick, all four hulls to one waypoint, each carrying the leg's depth.
 *
 * The depth is on every order and not only on the three that change it, which
 * is §4.2's whole mechanic: a re-order to a depth already reached costs a
 * silent column nothing, and a column the player has brought up is dived again
 * at seventy-two for the difference.
 */
const leg = (atTick: number, x: number, y: number, depthM: number, note: string): MissionBeat[] =>
  COLUMN.map((tag, i) => ({
    atTick,
    kind: 'move',
    tag,
    x,
    y,
    depthM,
    note: i === 0 ? note : '',
  }));

/** One of the seed column — refit to PR-3 for the Commit, and held to 01:00 (§3). */
const seed = (tag: string, x: number, y: number, souls: number, note: string): MissionUnit => ({
  tag,
  kind: UnitKind.Harvester,
  x,
  y,
  depthM: SEAT_DEPTH_M,
  role: 'tender',
  // The roster's Harvester is PR-2 and the basin is PR-3 water: the refit is a
  // mission fact, and the roster's hull is what everybody else fields.
  pressureRating: 3,
  releaseTick: T(1),
  souls,
  note,
});

/**
 * A creature placed and not driven (§6, and `intake.ts`' row).
 *
 * The `creature` beat's `driveTo` is required, so an animal that must not be
 * driven is committed to its own spawn until tick zero: the first pass finds
 * the commitment already expired, hands the creature its ears back, and leaves
 * it to the trigger model. `loud: false`, because nothing about the water the
 * spring left behind is a precursor to anything.
 */
const placed = (
  tag: string,
  species: FaunaSpecies,
  x: number,
  y: number,
  depthM: number,
  note: string
): MissionBeat => ({
  atTick: 0,
  kind: 'creature',
  tag,
  species,
  spawnAt: { x, y, depthM },
  driveTo: { x, y },
  untilTick: 0,
  loud: false,
  note,
});

export const SEEDING_RADICALS: MissionDefinition = {
  ...SEEDING_RADICALS_HEADER,
  doc: 'docs/mission-radicals.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Pelagia,
  courtSlot: COURT,
  /** §11 — every creature on this map is authored; the seeder cannot place a colossus. */
  fauna: false,
  /**
   * §4, §9 — sixty-five, the barge with its systems live: the momentum's own
   * figure, and the first budget in the campaign the player is meant to exceed
   * on purpose. Metadata, never a threshold.
   */
  sigBudget: 65,
  // §9 — no silence order and no array: the ledger does not run. Silence on
  // this column is the player's to set and the Bloomwright's clock is what
  // takes it away, which is a rule about depth rather than about a ceiling.
  silenceCeilingSig: 100,
  debtCapS: 0,
  /**
   * §9 — *Thin Water*'s hold, deliberately absent. Nothing in this column waits
   * for an escort; the only hold on the seed hulls is the `releaseTick` at
   * 01:00, which `holdsMovement` enforces by tag whatever the radius says.
   */
  escortRadiusM: 0,

  /**
   * §11 — the three places this mission names. The map paints all seven of its
   * own; these are the ones a beat or a predicate addresses, and the plan's
   * `the-concourse` and `the-crossing` are dropped because nothing addresses
   * either.
   */
  regions: [
    {
      id: 'arch-span',
      x: 0,
      y: 2000,
      widthM: 5000,
      heightM: 250,
      note: 'The arch — the span the city carried over the chamber district. Copied from sorrowgate.ts, because a ground beat must name a region of this literal',
    },
    {
      id: 'service-lock',
      x: 1750,
      y: 1750,
      widthM: 500,
      heightM: 750,
      note: 'The Service Lock, restated from the map so the collapse can be cut back through it — the way the fourteen came out, and the way in',
    },
    {
      id: 'the-far-water',
      x: 1500,
      y: 3750,
      widthM: 2000,
      heightM: 250,
      note: "The far water — the basin's southern strip, and the way south. Both terminal rows count hulls standing here",
    },
  ],

  /** §11 — one marker, named by both terminal rows. Nothing points at an animal. */
  markers: [
    {
      id: 'the-far-water',
      label: "The far water. The basin's behind it, and the way south is past it.",
      x: 2500,
      y: 3875,
      radiusM: 500,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Pelagia,
      note: "The column, the escort and the watch — one party and thirty-three people aboard four hulls the player does not give the orders to (§2). No second navy is in the water; the court's slot is reserved and empty in the fiction as well as in the data",
      units: [
        {
          tag: 'the-barge',
          // The first hull in the roster's largest class the plateaus have ever
          // grown: SIG 55 idle / 65 with systems live, HYD 65, 1,200 HP, and —
          // at 130 m against DRIFT.TRANSIT_MIN_HULL_M's 95 — the first thing
          // they have grown that a Sounder grinds. Unarmed.
          kind: UnitKind.Cruiser,
          x: 2500,
          y: 400,
          depthM: SEAT_DEPTH_M,
          role: 'tender',
          pressureRating: 3,
          releaseTick: T(1),
          souls: 14,
          note: 'The barge. Fourteen aboard, Anholt among them, and she orders the column from it',
        },
        seed('seed-one', 2350, 300, 6, 'A tender, deaf at HYD 30: the escort hears for it'),
        seed('seed-two', 2650, 300, 5, ''),
        seed('seed-three', 2500, 225, 8, 'Eight aboard. Six, five and eight is nineteen'),
        {
          tag: 'escort-one',
          kind: UnitKind.Corvette,
          x: 2250,
          y: 150,
          depthM: SEAT_DEPTH_M,
          role: 'escort',
          // §3 — live, and not struck for the first time since the furrow.
          // Everything loud the roster gives a corvette, and the button.
          armed: true,
          souls: 4,
          note: "Juno's first. PR-2 stands anywhere to 1,800 m and pays four a second below it: 105 s of hull in the basin",
        },
        {
          tag: 'escort-two',
          kind: UnitKind.Corvette,
          x: 2500,
          y: 100,
          depthM: SEAT_DEPTH_M,
          role: 'escort',
          armed: true,
          souls: 4,
          note: '',
        },
        {
          tag: 'escort-three',
          kind: UnitKind.Corvette,
          x: 2750,
          y: 150,
          depthM: SEAT_DEPTH_M,
          role: 'escort',
          armed: true,
          souls: 4,
          note: '',
        },
        {
          tag: 'watch-one',
          kind: UnitKind.LightScout,
          x: 2000,
          y: 250,
          depthM: WATCH_DEPTH_M,
          // A role no predicate names and no rule binds: the watch is counted
          // by nobody and calls what it hears (§8).
          role: 'watch',
          souls: 2,
          note: "The plateau's ordinary pair, PR-1. The span goes solid at 00:00 and the lock is roofed at 1,300, so there is no route south for either of them at any depth they own",
        },
        {
          tag: 'watch-two',
          kind: UnitKind.LightScout,
          x: 3000,
          y: 250,
          depthM: WATCH_DEPTH_M,
          role: 'watch',
          souls: 2,
          note: '',
        },
      ],
    },
  ],

  /**
   * §3 — what the column does not carry, with the reasons in register. The four
   * loud tools are not here: weapons, torpedoes, noisemakers and the ping are
   * all live, and §4 prices them.
   */
  locks: [
    {
      ability: 'mines',
      reason: 'not grown — a mine is a thing that waits, and the column does not',
    },
    { ability: 'depthCharges', reason: 'not grown' },
    { ability: 'construction', reason: 'nothing is built in a place that fell' },
  ],

  /**
   * §8's four rows, in §12's order. The first two are terminal and the count is
   * decided by them alone; the last two are standing, read at the close, and
   * touch the ladder not at all — Intake's neutrality guard, spent here so the
   * count of people never becomes a score.
   *
   * No keystone: a column that got two hulls south of the basin is a result,
   * not a failure, and the Commune closes nothing.
   */
  objectives: [
    {
      id: 'the-column',
      text: "Thirty-three are going south in four hulls, and we didn't turn it, and they're ours. We'd like four in the far water.",
      initial: ObjectiveStatus.Pending,
      markerId: 'the-far-water',
      terminal: true,
      // §8 — extract at reveal, latching Met, and right here (§13): nobody is
      // in the far water at tick zero, a hull that reaches it has crossed, and
      // the residual — a barge that crossed and was then ground on the way back
      // north — is read by `the-households`' unmet line beneath a `the-column`
      // that stays met. No `revealAtTick`, and no `loaded` flag: the seed rides
      // the tenders as fiction, and a tender that arrives is a tender that
      // arrived.
      predicate: { kind: 'extract', role: 'tender', region: 'the-far-water', count: 4 },
      reading: {
        met: 'Four through. Thirty-three, by household, and one of them is Sefa.',
        unmet:
          "Fewer than four in the far water. The rest are wherever the basin left them, and the basin doesn't count.",
      },
    },
    {
      id: 'the-seed',
      text: 'Two hulls in the far water is a seeding that still has seed in it. We agreed two at the Concourse, the way we agreed six at Kell.',
      initial: ObjectiveStatus.Pending,
      markerId: 'the-far-water',
      // §8 — the middle rung, in Thin Water's and Sorrowgate's arrangement: the
      // ladder reads how many terminal rows were met, so a three-row Results
      // table needs two, and the ask is still four.
      terminal: true,
      predicate: { kind: 'extract', role: 'tender', region: 'the-far-water', count: 2 },
      reading: {
        met: "Two at the least. That's a seeding.",
        unmet: "Fewer than two. That isn't.",
      },
    },
    {
      id: 'the-escorts',
      text: "Juno's three are yours to spend, and so, this time, is the noise.",
      initial: ObjectiveStatus.Pending,
      // §8 — non-terminal and standing, re-derived every pass (`isStanding`),
      // read at the close. The met reading cannot say *came home*: `survive`
      // counts hulls alive wherever they are, and a corvette alive over the
      // basin at 15:00 is three and not home.
      predicate: { kind: 'survive', role: 'escort', count: 3 },
      reading: {
        met: 'Three guns are still three. The basin never heard them as anything but weather.',
        unmet:
          "We spent a gun in the drowned city to be the loudest thing in it. Nobody's ever been able to say that about us before.",
      },
    },
    {
      id: 'the-households',
      text: "Four went down. We'd like four read, wherever they're read.",
      initial: ObjectiveStatus.Pending,
      // §8 — non-terminal with a reading: it prints beneath whichever outcome
      // the crossing earned and ranks nothing. The count the ladder reads is
      // hulls; the reading is people; the seed is not counted at all.
      predicate: { kind: 'survive', role: 'tender', count: 4 },
      reading: {
        met: 'All four hulls. Thirty-three.',
        unmet: "Not all four. The list is read at the tide, not here, and it's read in names.",
      },
    },
  ],

  /**
   * §9's beat table, in its order. Fifteen minutes, closing on a `resolve` that
   * is not a conclusion: the telegraph is the basin rising at 12:00 against the
   * close at 15:00, which is 180 s against campaign.md §10's sixty.
   *
   * Twenty-two orders to each of four hulls, from 01:00 to 11:30. Eighty-eight
   * `move` beats is the honest shape of a schedule the format already carries
   * (§13); a `MissionUnit.schedule` would be a second way of saying one thing.
   */
  beats: [
    // 00:00 — the prologue's two ground beats, restated as the spring left
    // them (§11). Two writes, in this order, exactly as the map literal paints
    // later regions over earlier ones: the span goes solid across the whole
    // width, and the service lock is immediately cut back through it. No biome
    // is written, so nothing is spent: the fallen dome is more rubble, not
    // less, and the shadows are the mission's cover.
    {
      atTick: 0,
      kind: 'ground',
      region: 'arch-span',
      ...SOLID,
      note: 'The arch is down. The span north of the chamber is rock, at every depth, which is what confines the watch to the north of it',
    },
    {
      atTick: 0,
      kind: 'ground',
      region: 'service-lock',
      floorM: 1500,
      ceilingM: 1300,
      note: 'The lock, cut back through it. Roofed water at 1,300-1,500 m, and the one door into the chamber',
    },

    // 00:00 — the three shoals across the Concourse's southern edge, whole at
    // tick zero: every seat is more than the scatter's 300 m from every shoal
    // in three dimensions, so the first metre the barge moves south is the
    // tell. Light, not sound, public to everyone, and the one thing in the Rift
    // a silent hull cannot suppress (§6).
    placed(
      'shoal-west',
      FaunaSpecies.Lampfry,
      2250,
      725,
      SHOAL_DEPTH_M,
      "The Concourse's southern edge. A shoal scatters from anything inside 300 m and reforms twenty-five seconds after the last intruder leaves"
    ),
    placed(
      'shoal-middle',
      FaunaSpecies.Lampfry,
      2500,
      725,
      SHOAL_DEPTH_M,
      'The middle one, 335 m from the barge in three dimensions and out by 01:01'
    ),
    placed('shoal-east', FaunaSpecies.Lampfry, 2750, 725, SHOAL_DEPTH_M, ''),

    // 00:00 — the pack, in the Districts just east of the Descent's edge. The
    // lane passes 791 m from it at the first dive and 783 at the third
    // waypoint, and nothing the column does from the lane is over its Interest
    // of 22 — by five points for the barge. The exception is the ping (§6).
    placed(
      'the-descent-pack',
      FaunaSpecies.Draymaw,
      3375,
      1375,
      PACK_DEPTH_M,
      "The Descent's schedule, working the leavings. The Districts' 1,600 m floor admits it; the Descent's rectangle ends at x 3,250"
    ),

    // 00:00 — the doorway, 1,500 m apart across the way into the basin. A
    // Hollow coils at Interest and strikes only at Commit *and* within 500 m in
    // three dimensions: the third dive coils both and is struck by neither,
    // because the nearest approach is 633 m (§6).
    placed(
      'gate-hollow-west',
      FaunaSpecies.Hollow,
      1750,
      3100,
      HOLLOW_DEPTH_M,
      "The western doorway, 550 m north of the colossus — the one a fight at is heard by the basin. The Gate's 1,500 m floor does not admit it; the Commit's 2,400 does"
    ),
    placed(
      'gate-hollow-east',
      FaunaSpecies.Hollow,
      3250,
      3100,
      HOLLOW_DEPTH_M,
      'The eastern doorway, 1,600 m from the colossus. A fight here is heard everywhere and wakes nothing in the basin'
    ),

    // 00:00 — the prologue's colossus, lying where the spring left it, 750 m
    // west of a lane drawn beside it. Placed and not driven until 12:00: it is
    // the Drift's from tick zero, and it idles at 45 through the basin's 1.6,
    // which is Track to the barge from 2,378 m and never lost after the lock.
    placed(
      'the-colossus',
      FaunaSpecies.Sounder,
      1750,
      3650,
      COLOSSUS_DEPTH_M,
      "The basin. 250 m from the Commit's western edge and 350 m from its southern one, so a decoy buys target rather than distance"
    ),

    {
      atTick: 0,
      kind: 'say',
      speaker: 'The watch, at the Concourse',
      text: "The arch is down and the lock's the way in. Fourteen came out through it in the spring, or fewer — the court read the count and we never had it. There's five off the Descent's edge at nine hundred, and we've got them at a name from here. We can't hear the basin from the seat. From the arch's row we could, at a third, and we'd rather that were us than nobody.",
      note: "A fact, a number and a guess, with which is which marked — the register's whole method (§12)",
    },

    // 00:30 — Anholt, aboard the barge, to nobody who can stop her.
    {
      atTick: T(0, 30),
      kind: 'say',
      speaker: 'Bloomwright Sefa Anholt, aboard the barge',
      text: "We're going now. We said at the count that we would, and a plateau that says a thing and then waits for every garden has said nothing. I'm aboard, and fourteen with me, and nineteen in the tenders, and none of them is being told what to do. They're being told when. That's the difference we've found between us and everybody else, and it's smaller than we'd like.",
      note: "Told when, not told what — the mission's whole system, said out loud before it is played",
    },

    // 01:00 — the column is released and the first leg lands on the same tick,
    // release beats first. From here the table owns the column and the player
    // owns thirty seconds at a time.
    {
      atTick: T(1),
      kind: 'release',
      tag: 'the-barge',
      note: 'The hold ends. Anholt has her clock',
    },
    { atTick: T(1), kind: 'release', tag: 'seed-one', note: '' },
    { atTick: T(1), kind: 'release', tag: 'seed-two', note: '' },
    { atTick: T(1), kind: 'release', tag: 'seed-three', note: '' },
    ...leg(
      T(1),
      2500,
      700,
      CONCOURSE_M,
      "Leg 1 — the Concourse's southern edge. No dive, and the first metre south puts out the middle shoal"
    ),
    ...leg(T(1, 30), 2500, 700, CONCOURSE_M, 'Leg 1, stood again at the half'),

    // 02:00 — the first dive, ordered by the table whether or not the escort is
    // ready: 330 to 850 is 520 m at 45 m/s, 11.6 s at 72, taken on the move and
    // 791 m from the pack, which reads 18.6 of it against an Interest of 22.
    ...leg(
      T(2),
      2625,
      1125,
      DESCENT_M,
      'Leg 2 — the Descent, floor 900. The first dive, 11.6 s at 72'
    ),
    ...leg(
      T(2, 30),
      2625,
      1125,
      DESCENT_M,
      'Leg 2, stood again: a column ordered up is dived again here, and one already at 850 is not touched'
    ),
    {
      atTick: T(2, 30),
      kind: 'say',
      speaker: 'Warden Juno Teel, on the escort',
      text: "The corridor at Kell had a man in it doing his job. The basin's got nothing in it doing anything but hearing, and it hears the loudest thing there is, and today that had better be us. The guns are live. There's nothing down there to strike first at, and I'd like it noticed that I went and checked.",
      note: 'The imperative mood not arriving for the second time in two missions (§12)',
    },

    ...leg(T(3), 2625, 1600, DESCENT_M, 'Leg 3 — the closest the lane comes to the pack, 783 m'),
    ...leg(T(3, 30), 2625, 1600, DESCENT_M, 'Leg 3, stood again'),

    // 04:00 — the second dive. Held at the Descent's 900 m floor until the hull
    // is over Districts water, then 900 to 1,475: 12.8 s at 72 at the lock's
    // mouth, and 1,475 is 175 m under the floor of anything a Draymaw will
    // chase, fifteen further than a bite reaches (§13).
    ...leg(
      T(4),
      1875,
      1625,
      LOCK_M,
      "Leg 4 — the Districts west of the Descent's foot, floor 1,600: the only water beside the lock's mouth deep enough to go under its roof. The second dive"
    ),
    ...leg(T(4, 30), 1875, 1625, LOCK_M, 'Leg 4, stood again'),
    {
      atTick: T(4, 30),
      kind: 'say',
      speaker: 'The watch, on the pack',
      text: "Five off the Descent's edge to the east. They heard the dive and they didn't turn. They'd hear a ping — for three seconds, and three isn't four, and the fourth is whatever you do next. The next dive takes the column under them: fourteen seventy-five is a hundred and seventy-five under the floor of anything they'll chase, and a bite reaches a hundred and sixty.",
      note: 'The ping priced as three seconds of a four-second dwell, before the basin teaches it',
    },

    ...leg(T(5), 2000, 1875, LOCK_M, "Leg 5 — the lock's mouth, under the roof at 1,300"),
    ...leg(T(5, 30), 2000, 1875, LOCK_M, 'Leg 5, stood again'),

    ...leg(
      T(6),
      2000,
      2375,
      LOCK_M,
      'Leg 6 — the lock, where the span was cut back. The colossus at Track from here, 1,299 m off, and never lost after it'
    ),
    ...leg(T(6, 30), 2000, 2375, LOCK_M, 'Leg 6, stood again'),

    ...leg(T(7), 2375, 2625, LOCK_M, "Leg 7 — the Gate, floor 1,500: the chamber's floor"),
    ...leg(T(7, 30), 2375, 2625, LOCK_M, 'Leg 7, stood again'),

    // 08:00 — the arch's foot, where the chamber's floor gives way to the
    // basin's: the point stands on the Commit's first row, over trench paint,
    // 633 m from the eastern Hollow and 881 from the western.
    ...leg(
      T(8),
      2625,
      3000,
      LOCK_M,
      "Leg 8 — the arch's foot, and the last water the escort's PR-2 hulls stand in for nothing"
    ),
    ...leg(T(8, 30), 2625, 3000, LOCK_M, 'Leg 8, stood again'),
    {
      atTick: T(8, 30),
      kind: 'say',
      speaker: "Bloomwright Sefa Anholt, at the arch's foot",
      text: "That's the arch. Fourteen came out through the lock in the spring and we've come in through it, and we'd have come this way whatever it cost, and we'd like that heard before the next part. The next part's the basin. Nobody's ever asked the basin anything on purpose.",
      note: '',
    },

    // 09:00 — the third dive, 1,475 to 2,300: 18.3 s at 72 down the middle of
    // the doorway. Both Hollows coil — 65.5 at the start and 45.9 at the end
    // against a coil at 45 — and neither strikes, because the strike also needs
    // 500 m and the nearest approach is 633. The colossus hears 49.9.
    ...leg(
      T(9),
      2500,
      3350,
      BASIN_M,
      'Leg 9 — the Commit, floor 2,400. The third dive, between the Hollows'
    ),
    ...leg(T(9, 30), 2500, 3350, BASIN_M, 'Leg 9, stood again'),

    ...leg(
      T(10),
      2500,
      3650,
      BASIN_M,
      'Leg 10 — 750 m east of the colossus, beside it and never over it. The barge live reads 50.7 in its ears; Interest is 55'
    ),
    ...leg(T(10, 30), 2500, 3650, BASIN_M, 'Leg 10, stood again'),

    ...leg(T(11), 2500, 3900, BASIN_M, "Leg 11 — the far water, the basin's southern strip"),
    ...leg(
      T(11, 30),
      2500,
      3900,
      BASIN_M,
      'Leg 11, and the last order. After this the column is where it is, and if all four are in the far water the mission has already closed'
    ),

    // 12:00 — the basin rises off the floor west of the lane and crosses it
    // along the tenth waypoint's row, at the crossing's depth, whatever the
    // register stands at. 1,500 m in fifty seconds at 30 m/s, climbing the
    // 300 m at 12 m/s in the first twenty-five, so it is at 2,300 m as it
    // crosses x 2,500 at about 12:25. Driven, it is deaf, unhurt by anything
    // the player owns, and Committed at 100. The loud beat the close is
    // measured from: 180 s ahead of 15:00.
    {
      atTick: T(12),
      kind: 'creature',
      tag: 'the-colossus',
      driveTo: { x: 3250, y: 3650, depthM: BASIN_M },
      untilTick: T(13, 30),
      loud: true,
      note: 'The basin moves on its clock, and a column that waited is where it is when it does. No noise anywhere changes where it goes',
    },
    {
      atTick: T(12, 15),
      kind: 'say',
      speaker: "The watch, at the span's edge",
      text: "It's up. It's crossing at twenty-three hundred, west to east, along the row the column was told to stand on at ten, and it's crossing where the lane is. We've got it at a track from here, calling, and there's nothing on the plateau that's ever had that at a track before.",
      note: "Track at 1,718 m across the layer — the watch hears the mistake from the arch's row",
    },

    // 13:30 — the drive expires and no second `creature` beat is authored:
    // `holdCommitments` restores homeDepth, senseS and driven and does not
    // restore homeX/homeY, so it is released where it stands and cools there,
    // 783 m from the far water (§13).
    {
      atTick: T(13, 30),
      kind: 'say',
      speaker: 'The watch',
      text: "It's stopped, east of the lane. It's the basin's again — it'll cool where it is and then it'll listen, and where it is, is seven hundred and eighty metres from the far water. Anything that arrives loud arrives in its hearing, and for the next minute it doesn't need four seconds.",
      note: 'Cooling re-commits on any Commit-loud sound with no dwell at all, for forty-five seconds',
    },

    // 15:00 — the count is read from the Concourse. Not a conclusion: this
    // mission has a failure and it is audible for three minutes.
    {
      atTick: T(15),
      kind: 'resolve',
      note: 'The count is read at the far water, or it is read from the Concourse',
    },
  ],

  /**
   * §9's two conditional rows, in §12's order — the watch first, so that
   * Anholt's line stands last in the log on the pass all four arrive together
   * and the mission closes.
   *
   * `the-escorts` and `the-households` fire nothing: `survive` is standing, met
   * at tick zero, and read at the close.
   */
  conditionalBeats: [
    {
      kind: 'say',
      speaker: 'The watch, on the first hull in the far water',
      text: "One's in the far water. We've got it at a bearing from the arch's row, and it hasn't got us at anything, and that's the right way round for once.",
      note: 'Fired by the tally, on the pass the first seed hull crosses',
      when: { kind: 'extract', role: 'tender', region: 'the-far-water', count: 1 },
    },
    {
      kind: 'say',
      speaker: 'Bloomwright Sefa Anholt, in the far water',
      text: "We're through. However it's said at home, we'll be saying it at the rim.",
      note: 'Fires on the pass `the-column` is met, which is the pass the mission closes on',
      when: { kind: 'extract', role: 'tender', region: 'the-far-water', count: 4 },
    },
  ],

  /**
   * §8's Results, verbatim — Marr's three readings, with the four objective
   * readings printing beneath whichever row the run earned, in authored order
   * and all four of them.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      "We asked you to take them where we said they shouldn't go, and you took them, and you were louder than they were the whole way. We're not going to call that a contradiction. We're going to call it a tide, and the next one's at the rim, and we can't hear the rim from here.",
    [MissionOutcome.Partial]:
      "Some of the seed's in the basin and some of it's south of it, and we agreed nothing about which, because we agreed nothing about any of this. This is a result. Sefa will say it's the price of waiting; Juno will say it's the price of not having guns; and we're saying it's thirty-three people by household and some of them are on the list.",
    [MissionOutcome.Lost]:
      "The basin has the column. We never turned it and it went anyway and it didn't get there, and nobody on this plateau is going to be able to say which of those three things they're sorriest about.",
  },
};
