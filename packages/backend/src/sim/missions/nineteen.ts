/**
 * The Second Chord 3 — Nineteen. docs/mission-nineteen.md, transcribed.
 *
 * A data literal in `aptitude.ts`' idiom, on the map that mission's document
 * could not have asked for: the document owns the forces, the water, the beats,
 * the numbers and the text. Where this file and that document disagree, one of
 * them is wrong and the fix says which.
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **Six hulls, six names, six rows** (§4.1, §8). Six roles, one hull each,
 *   six `survive` rows at count 1, and six authored met/unmet pairs. This is
 *   the first document to want `MissionUnit.role`'s singular half six times
 *   over, and the price is stated rather than worked around: no predicate here
 *   can address a *set* of the six, and none needs to. They are `survive` and
 *   not `extract` because only `quiet` and `survive` are standing
 *   (`predicates.ts`, `isStanding`) — an `extract` row over the Head, which
 *   the party is seated in, would latch Met on the first pass and read *home*
 *   beside a wreck at 18:00.
 * - **The walls are placed and not driven** (§9, §13). Seven Hollows and one
 *   Sounder, each committed to its own spawn point until tick zero, which the
 *   first pass finds already expired: the animal gets its ears back and its
 *   own trigger model, and `holdCommitments` sets its home depth to the
 *   species' `workingDepthM`. That is the *only* depth a placed animal keeps,
 *   which is why the coils are at 1,700 m and the basin at 2,000 m and not at
 *   any figure this file would have preferred. `fauna: false`.
 * - **An interval is played by the hull it was given to** (§4.4, §6).
 *   Nineteen `MissionSounding` rows with authored carriers — the Voice one,
 *   the Corvettes four, four, four, three and three — and `applySoundings`
 *   treats a missing carrier as the ultimate broken hold. So a hull the walls
 *   took at 09:00 takes its intervals down with it, and the count at 18:00 is
 *   what the Order has left rather than what it attempted.
 * - **The close is a failure the player can hear coming, and is therefore not
 *   a conclusion** (§8, §9). The basin lifts off the Deep End at 16:30 with
 *   `loud: true` and walks the axis west under the bench; the `resolve` is at
 *   18:00. Ninety seconds against campaign.md §10's sixty, paid by the one
 *   animal on this map that can take a hull the walls cannot.
 *
 * **The court's rule is in force and `runsItsLength` is omitted** (§9), which
 * is safe for a reason worth stating rather than discovering: six standing
 * rows read Met at tick zero, so the only thing standing between this literal
 * and a mission that closes on its first pass is `the-nineteen`, which is
 * terminal and cannot be met before a single twenty-second hold has run. That
 * is the document's design — "nineteen entered with six hulls answering closes
 * the committal on that pass" — and not an accident of the ordering.
 *
 * **Two places this file departs from the document, both recorded in §13
 * rather than invented here**, and neither costs the mission a beat:
 *
 * - **A sounding has no depth.** `MissionSounding` is a point, a radius and a
 *   bow; it says nothing about how deep the hull holding the tone is. So the
 *   bench at 1,750 m is where the briefing puts the party and not where this
 *   literal keeps it. §13 declines to ask for a `depthMinM`, on the grounds
 *   that a mission which fences a player out of a legal depth is teaching the
 *   fence, and §4's arithmetic survives the Head's own 1,600 m anyway.
 * - **`sound` counts and names no sounding.** The close can say "nineteen or
 *   fewer" and cannot say which nineteen, which §13 states is exactly the
 *   sentence the Order would say.
 *
 * And four corrections this literal makes against its own document, so that a
 * reviewer sees them here rather than deriving them under a wall. The first
 * three are §13's own row and cost the mission nothing; the fourth is a
 * coordinate, and it is the only place this literal does not transcribe §11:
 *
 * - §6's row 2 says the coil beyond Ilar Orme's point reaches "eighty-three
 *   metres" past it. Eighty-three is 433 − 350: the reach the document carried
 *   while its coils were seated at 2,000 m. At the coils' actual 1,700 m the
 *   horizontal reach is √(500² − 50²) = 497.5 m, so the coil reaches **147 m**
 *   beyond the point. §6's row 4 — "inside by sixty-seven metres", which is
 *   497.5 − 430.1 — is already on the re-cut figure, which is what makes row 2
 *   the stale one. Nothing in the geometry moves: the nine are still nine.
 * - §6's row 3 calls the coil at x 1,375 "the fourth coil of the north wall".
 *   §11 lists that wall's four at 750, 1,375, 2,000 and 3,250, so it is the
 *   second. The rest of the row is right — it is the one coil on the map no
 *   second interval shares.
 * - §6's closing paragraph measures the drift off a free point to the edge of
 *   its own disc — "610 m off its coil, which is two hundred and ten metres of
 *   drift" — rather than to the reach. The number that decides anything is
 *   610.3 − 497.5, which is **113 m**, so the quiet cruelty is nearly twice
 *   what the sentence claims. The test re-derives it.
 * - **§11 seats the basin at (4,700, 2,000) and this literal does not**, for
 *   the reason written on `BASIN` below: that point is 141 m in three
 *   dimensions from the watch's station and sits on the line the watch walks
 *   at 01:00, and a released Sounder eats both watch hulls inside twelve
 *   seconds of every run — which takes the legs, the Watch-Speaker, the sweep
 *   and `the-count` with them. It is seated at (4,700, 2,700) instead: same
 *   rectangle, same depth, same x, and out of a Submersible's reach.
 */

import {
  CHORD_NINETEEN_HEADER,
  Faction,
  FaunaSpecies,
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  SIM,
  UnitKind,
  faunaStatsFor,
} from '@echoes/shared';

import type {
  MissionBeat,
  MissionDefinition,
  MissionObjective,
  MissionRole,
  MissionSounding,
  MissionUnit,
} from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/** Reserved and empty, as every campaign mission reserves it (§2). */
const COURT = 1;
/**
 * The watch — the trench cohort's western pair, walking a filed patrol of
 * water that is theirs (§5). A party, weapons-cold, that never fires, never
 * closes and never names the Order.
 */
const WATCH = 2;

/**
 * §6 — a sounding is taken from within 400 m of its point, with the point in
 * the hull's own 45° cone, held twenty seconds at SIG 80. Aptitude's figures,
 * unchanged, because the committal uses the same instrument the tuning does;
 * and they live in the literal for `MissionSounding`'s stated reason — one
 * mission's authored numbers, not a rule of the world.
 */
const SOUND_RADIUS_M = 400;
const SOUND_HOLD_TICKS = 20 * SIM.TICK_HZ;
const SOUND_SIG = 80;

/** §8, §9 — sixty seconds at Classification, cumulative, read out and never ranked. */
const TOLERANCE_TICKS = 60 * SIM.TICK_HZ;

/** §11 — the Head, and the only ground on the map shallower than the trench. */
const HEAD_DEPTH_M = 1600;
/** §5, §11 — the watch's water, on station and on every leg. */
const WATCH_DEPTH_M = 2100;
/** §9, §11 — the axis the watch walks and the basin comes up. */
const AXIS_Y = 2000;
/**
 * §1, §13 — the coils' depth, and the only depth a placed animal keeps: a
 * released commitment sets `Fauna.homeDepth` to the species' own working
 * figure, so a document that seated them anywhere else would be describing a
 * mission the engine does not run.
 */
const COIL_DEPTH_M = faunaStatsFor(FaunaSpecies.Hollow).workingDepthM;
/** §5, §9 — the basin's, for the same reason, in the Deep End until 16:30. */
const BASIN_DEPTH_M = faunaStatsFor(FaunaSpecies.Sounder).workingDepthM;
/**
 * §8, §9 — and the transit's, which is a driven creature's own and therefore
 * authorable: fifty metres under the bench, which is what puts the Voice
 * inside a footprint of 102 m and leaves every Corvette outside
 * `DRIFT.TRANSIT_MIN_HULL_M`.
 */
const BASIN_TRANSIT_DEPTH_M = 1800;

/** §5, §11 — the watch's station at the eastern end, and the leg it returns to. */
const STATION = { one: { x: 4800, y: AXIS_Y }, two: { x: 4850, y: 2080 } };

/**
 * The basin's own water — **the one coordinate in this literal that is not
 * §11's, and the reason is that §11's cannot be run.**
 *
 * §11 seats the basin at (4,700, 2,000): a hundred metres in plan and a
 * hundred in depth from the watch's station, and directly on the line the
 * watch walks west at 01:00. A placed Sounder is released to its own trigger
 * model on the first mission pass (§9, §13), and `fauna.ts` gives it HYD 90
 * against `interest` 55 and `commit` 75, with an `attackRangeM` of 260 and 220
 * damage a second — so a Submersible idle at 22 interests it from 362 m and
 * commits it from 298 m. Seated where §11 puts it, the basin hears the watch
 * on the first pass and has eaten both hulls by 00:12 of every run: the six
 * `move` legs then address a dead tag, the Watch-Speaker's 04:00 line is read
 * by a hull that has not been in the water for three and a half minutes, the
 * sweep can never file — §8's "the sweep files on every run" becomes never —
 * and `the-count` can never be met, because the watch is the only observer on
 * the map that could classify anybody.
 *
 * So the basin is seated at the southern end of the same rectangle instead:
 * still the Deep End, still 2,000 m, still x 4,700 so the transit still stands
 * under the Head at 18:00 (x ≈ 2,032). It is 646 m from the nearer of the two
 * station seats in three dimensions and never nearer than 628 m to any point
 * of any authored leg, which is half as loud again as a Submersible under way
 * can reach (421 m at Interest, 347 at Commit).
 *
 * The cost is stated rather than hidden: the 16:30 transit now converges on
 * the axis instead of running down it, so §8's "it takes the Voice only if the
 * Voice is on the axis" is, in this literal, "only if the Voice is south of
 * the southern row" — the swept line stays 100–420 m south of that row for the
 * whole ninety seconds and finishes 47 m off Emris Kalliso's point, and the
 * northern row is out of it entirely. The other correction — moving the watch
 * — would cost §6's row 19, §9's six leg coordinates and §11's own table row,
 * so the choice is the document's and this is the cheaper half of it.
 */
const BASIN = { x: 4700, y: 2700 };

/**
 * One of the nineteen — §6's table, as a point with a radius and a carrier.
 *
 * The carrier is fixed at authoring because `MissionSounding` requires one, and
 * §4.4 spends that requirement rather than regretting it: a hull the mission
 * has lost takes its intervals with it, and they are unplayable for the rest of
 * the tide.
 */
const interval = (
  id: string,
  tag: string,
  x: number,
  y: number,
  note: string
): MissionSounding => ({
  id,
  tag,
  x,
  y,
  radiusM: SOUND_RADIUS_M,
  holdTicks: SOUND_HOLD_TICKS,
  sig: SOUND_SIG,
  note,
});

/**
 * One hull of the committal party — §3's two rows, with the roster's own stats
 * and no refit. PR-2 is what `units.ts` fields and nothing on this map crushes
 * anybody at any depth the mission authors (§11).
 *
 * Armed, all six: unlike Aptitude's tuning party this one is not asked to avoid
 * a fight it did not arrange — the Order arranged this one, with an animal,
 * three years late (§3).
 */
const hull = (
  tag: string,
  kind: UnitKind,
  role: MissionRole,
  x: number,
  y: number,
  souls: number,
  note: string
): MissionUnit => ({
  tag,
  kind,
  x,
  y,
  depthM: HEAD_DEPTH_M,
  role,
  armed: true,
  souls,
  note,
});

/**
 * One of §8's six named rows.
 *
 * Not a template in campaign.md §10's sense, and the distinction is the
 * document's own: §8 authors these as *one* sentence printed once per hull —
 * "**The Third** is entered. Say the name to the house yourself; it is not mine
 * to enter" is called "the mission's standard sentence", promoted out of
 * Aptitude §8's fourth Results row on purpose. Six copies of a sentence the
 * chapter says six times is what the register asks for; assembling a sentence
 * out of a status and a noun is what §10 forbids, and this does not do that.
 *
 * `initial` is **Met**, which no mission before this one has authored and which
 * §4.1 asks for in as many words: the player is shown all six at 00:00, all six
 * reading Met, and shown that they are the kind of row that can stop. Safe
 * because `survive` is standing and re-derived every pass, and because
 * `the-nineteen` is terminal and Pending, so the close cannot fire on the first
 * one.
 */
const answers = (id: string, role: MissionRole, name: string): MissionObjective => ({
  id,
  text: `${name} answers the count.`,
  initial: ObjectiveStatus.Met,
  terminal: true,
  predicate: { kind: 'survive', role, count: 1 },
  reading: {
    met: `**${name}** is home.`,
    unmet: `**${name}** is entered. Say the name to the house yourself; it is not mine to enter.`,
  },
});

/**
 * A coil, placed and not driven (§9, §13; docs/mission-intake.md §13).
 *
 * The `creature` beat's `driveTo` is required, so an ambusher that must not be
 * driven is committed to its own spawn until tick zero: the first pass finds
 * the commitment expired, hands the animal its ears and its species' working
 * depth back, and leaves it to its own trigger model — SIG 3 at rest, and a
 * strike only inside `DRIFT.HOLLOW_TRIGGER_RANGE_M` at Commit. `loud: false`,
 * because nothing about a coiled animal is a precursor to anything.
 */
const coil = (tag: string, x: number, y: number, note: string): MissionBeat => ({
  atTick: 0,
  kind: 'creature',
  tag,
  species: FaunaSpecies.Hollow,
  spawnAt: { x, y, depthM: COIL_DEPTH_M },
  driveTo: { x, y },
  untilTick: 0,
  loud: false,
  note,
});

/**
 * One leg of the watch — §9's six, at 60 m/s, both hulls ordered on the same
 * tick and the second keeping its fifty metres of offset.
 *
 * No depth on the order: the pair is seated at 2,100 m and every leg is flown
 * at 2,100 m (§11), so a depth order here would be a change where the document
 * asks for none. And the interaction §13 names is exactly this arrangement —
 * the sweep bends the pair's course once per window toward what it heard, and
 * the next authored leg restores the chart.
 */
const leg = (minute: number, x: number, note: string): MissionBeat[] => [
  { atTick: T(minute), kind: 'move', tag: 'watch-one', x, y: AXIS_Y, note },
  { atTick: T(minute), kind: 'move', tag: 'watch-two', x: x + 50, y: 2080, note: '' },
];

export const CHORD_NINETEEN: MissionDefinition = {
  ...CHORD_NINETEEN_HEADER,
  doc: 'docs/mission-nineteen.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Hadron,
  courtSlot: COURT,
  /** §2, §11 — the Drift is not a party, and every animal here is authored. */
  fauna: false,
  /**
   * §4, §9 — eighty, and the qualifier is that it is the thing the mission is
   * *for*: a sounding held at 80 for twenty seconds, nineteen times, with no
   * quieter version of the committal available. Metadata and never a threshold
   * (types.ts, `sigBudget`), which is what lets the loudest figure in the
   * campaign be the one the mission asks for.
   */
  sigBudget: 80,
  /**
   * §9 — no silence order. A committal is not a courtesy the Order owes
   * anybody in this water, so the ceiling is off, the ledger never runs, and
   * there is no array to lend or withdraw.
   */
  silenceCeilingSig: 100,
  debtCapS: 0,
  /** No held freight: six hulls that move on their own orders. */
  escortRadiusM: 0,
  /** §3 — there is nothing to buy and nothing to spend. */
  startingNodules: 0,

  /**
   * §11 — **this mission authors no regions.** A mission restates only the
   * places a predicate, a lift, a ground beat or a reader addresses, and
   * nothing here addresses a place: no extraction, no cut, no ground beat, no
   * grant. The only place in the mission is the one the party cannot reach,
   * and it is a marker rather than a rectangle.
   */
  regions: [],

  /**
   * §8's one marker, and the first in the bible that points at ground the
   * party is forbidden: it covers the whole trench because the whole trench is
   * the objective and none of it can be entered.
   */
  markers: [
    {
      id: 'the-rest',
      label: 'The Rest. Nineteen are here, and none is entered.',
      x: 2500,
      y: 2000,
      radiusM: 2250,
    },
  ],

  /**
   * §6 — nineteen soundings, nineteen names, two rows over a floor the party
   * may not enter. Ten at y 1,750 from x 250 in steps of 500, nine at y 2,250
   * from x 500 in steps of 500; neighbours 500 m apart along a row and 559 m
   * across them.
   *
   * **The order is the document's and the mission enforces none of it.** The
   * nineteen are the player's acts, taken in whatever order the party finds,
   * and §9's beat table is the world's clock rather than theirs. What *is*
   * authored is the carrier, and the distribution is the mission's argument
   * stated as a roster: the Third carries four and every one has a coil inside
   * its own metre, the Fifth carries three and none does, the Voice carries one
   * and it is free.
   */
  soundings: [
    interval(
      'sera-tessaly',
      'the-first',
      250,
      1750,
      'Sera Tessaly. Free at the point — 610 m off the nearest coil — and the western end, which is the longest transit on the map'
    ),
    interval(
      'ilar-orme',
      'the-first',
      750,
      1750,
      'Ilar Orme. Inside: a coil 350 m north of the point, reaching 147 m past it. Held from the southern part of its disc, bow north'
    ),
    interval(
      'wen-brannock',
      'the-second',
      1250,
      1750,
      "Wen Brannock. Inside, at 372 m. The north wall's second coil, west to east, and the one coil on the map no second interval shares — clearing it buys this name and nothing else"
    ),
    interval(
      'marek-vale',
      'the-second',
      1750,
      1750,
      'Marek Vale. Inside by sixty-seven metres — the widest of the nine, and the one that reads as free'
    ),
    interval(
      'fen-tessaly',
      'the-third',
      2250,
      1750,
      'Fen Tessaly. Inside, on the same coil as Marek Vale, which means clearing it buys two names'
    ),
    interval(
      'ando-kalliso',
      'the-voice',
      2750,
      1750,
      "Ando Kalliso. Free at the point, and the nearest free metre to the Head — Fen Tessaly's is exactly as close and is contested. The first interval a competent party plays, and the Voice's only one"
    ),
    interval('ottiline-orme', 'the-third', 3250, 1750, 'Ottiline Orme. Inside, at 350 m'),
    interval('hale-brannock', 'the-fourth', 3750, 1750, 'Hale Brannock. Free at the point'),
    interval(
      'ise-vale',
      'the-fifth',
      4250,
      1750,
      "Ise Vale. Free — the nearest coil is the south wall's, 886 m across the trench — over the Deep End's shoulder, where the floor is 2,400"
    ),
    interval(
      'perrin-tessaly',
      'the-fifth',
      4750,
      1750,
      'Perrin Tessaly. Free, and the furthest metre from any coil on the map'
    ),
    interval(
      'corin-orme',
      'the-first',
      500,
      2250,
      "Corin Orme. Free, and the nearest coil is the north wall's, across the trench"
    ),
    interval('neve-brannock', 'the-first', 1000, 2250, 'Neve Brannock. Free at the point'),
    interval('talin-vale', 'the-second', 1500, 2250, 'Talin Vale. Inside, at 350 m'),
    interval(
      'emris-kalliso',
      'the-second',
      2000,
      2250,
      'Emris Kalliso. Free at the point, between two coils that each reach part of its disc'
    ),
    interval('yorrick-tessaly', 'the-third', 2500, 2250, 'Yorrick Tessaly. Inside, at 430 m'),
    interval(
      'aled-orme',
      'the-third',
      3000,
      2250,
      'Aled Orme. Inside, on the same coil as Yorrick Tessaly'
    ),
    interval('sunniva-brannock', 'the-fourth', 3500, 2250, 'Sunniva Brannock. Free at the point'),
    interval('roelle-vale', 'the-fourth', 4000, 2250, 'Roelle Vale. Inside, at 350 m'),
    interval(
      'deri-kalliso',
      'the-fifth',
      4500,
      2250,
      "Deri Kalliso. Free at the point, and 390 m from the watch's own station"
    ),
  ],

  /**
   * §5, §8 — the watch, listening. Two windows totalling eleven minutes, and
   * the document is emphatic that this files on **every** run rather than
   * pretending it is a risk: two Submersibles at HYD 85 on a PF 1.60 axis
   * against a party holding tones at 80 hear a working hull at Contact from
   * 9,582 m. It is not a stealth check; it is the Directorate being what it is,
   * made into a sentence at the close.
   *
   * No scene: nothing later in the campaign reads this as a thing witnessed,
   * because the Order is never shown the record it is entered in.
   *
   * **This mission is where the bend was found to be a re-aim, and the
   * runtime is the side that moved.** `MissionRuntime.file` used to answer a
   * filing by ordering the sweeping hulls *to* the position they heard. The
   * first window opens at 01:00, the pair hears the party from anywhere on
   * this map, and both hulls then flew 2,800 m at 60 m/s toward the Head — off
   * the axis, through the north wall's coils, and into six armed Knight hulls
   * that auto-engage because hostility is `Owner.slot`. In a run where the
   * player gave no order at all, both were dead by about 02:30, which unmade
   * §5's "it never fires, never closes and never names the Order", §7's "the
   * watch, walking", four of §9's six legs, the Watch-Speaker's 04:00 line and
   * `the-count` itself, since the watch is this map's only observer.
   *
   * Nothing in the data could have fixed it: §3 needs the party's weapons live
   * for the walls, `weaponsCold` removes the `Weapon` component outright
   * rather than only the auto-acquire, and §8 and §9 own the sweep and the
   * legs. But docs/mission-tend.md §6 had said all along that the course
   * "bends a few degrees toward what it heard", so the re-aim was never the
   * specified behaviour. `file` now turns the leg by `MISSION.SWEEP_BEND_DEG`
   * and keeps its range, and the next authored beat restores the chart.
   * A sweep reports; it does not intercept.
   */
  sweep: {
    tags: ['watch-one', 'watch-two'],
    windows: [
      { fromTick: T(1), untilTick: T(7) },
      { fromTick: T(10), untilTick: T(15) },
    ],
    filedReading:
      'Intervals were heard entered over the axis, at the eightieth, from the bench above it. The Order was heard entering its dead. The count is entered against the trench, which is not the Order’s, in a record the Order will not be shown.',
    note: 'What it hears it enters, at length, in a book nobody in this water will read',
  },

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Hadron,
      note: "The Ninth's committal party — the same six hulls, under the same officer, with an order the Order has owed for three years (§2, §3). Thirty-seven aboard",
      units: [
        hull(
          'the-voice',
          UnitKind.Cruiser,
          'voice',
          2500,
          375,
          12,
          "The Voice — Kalliso's hull and the party's ears. 55 idle / 65 live in the cone, HYD 65, and the only hull on this map long enough for the basin to notice"
        ),
        hull(
          'the-first',
          UnitKind.Corvette,
          'first',
          2260,
          480,
          5,
          'The working hulls — 28 in the cone, 9.8 on the flank, 2.8 in the wake, and 38 firing, because the Knight energy term replaces the hull’s burst rather than scaling it (§3)'
        ),
        hull('the-second', UnitKind.Corvette, 'second', 2380, 520, 5, ''),
        hull(
          'the-third',
          UnitKind.Corvette,
          'third',
          2500,
          540,
          5,
          'Carries four intervals and every one of them has a coil inside its own metre. A player who loses this hull loses four names and the four hardest stands on the map at once (§6)'
        ),
        hull('the-fourth', UnitKind.Corvette, 'fourth', 2620, 520, 5, ''),
        hull(
          'the-fifth',
          UnitKind.Corvette,
          'fifth',
          2740,
          480,
          5,
          'Carries three, and none of them has anything coiled inside its metre. The distribution is not even, and that is the argument (§6)'
        ),
      ],
    },
    {
      slot: WATCH,
      faction: Faction.Directorate,
      note: "The trench cohort's western watch — two hulls on a filed patrol of water that is theirs, weapons-cold, announcing the law once in the passive and entering what they hear (§5)",
      units: [
        {
          tag: 'watch-one',
          kind: UnitKind.AbyssalSubmersible,
          x: STATION.one.x,
          y: STATION.one.y,
          depthM: WATCH_DEPTH_M,
          note: 'On station in the Deep End at 2,100 m. 22 idle and 28 under way, which is a Contact to the Voice from 3,616 m and a Classification from 2,039 — audible from the first tick and classified from the first minute (§7)',
        },
        {
          tag: 'watch-two',
          kind: UnitKind.AbyssalSubmersible,
          x: STATION.two.x,
          y: STATION.two.y,
          depthM: WATCH_DEPTH_M,
          note: 'Fifty metres off its partner, and it keeps that offset on every leg. Weapons-cold: it never fires, never closes and never names the Order',
        },
      ],
    },
  ],

  /**
   * §3, §13 — the seven locks, of which one is authored and the six that are
   * not are the point.
   *
   * **`activeSonar` is unlocked, and that is the handover** (campaign.md §10's
   * mission-3 rule): the Order's own reading of the button does not change on
   * being handed it, and §12 spends a paragraph teaching the party what it
   * *means* before allowing them to press it. `weapons`, `torpedoes`, `mines`,
   * `depthCharges` and `noisemakers` are simply not struck, as Aptitude left
   * them.
   */
  locks: [{ ability: 'construction', reason: 'a committal builds nothing' }],

  /**
   * §8's eight rows, in the document's order: the count, the six hulls, and
   * the record the Order is not shown.
   *
   * **Seven terminal and none a keystone**, which is a refusal rather than an
   * omission — the Order does not rank a rest against a hull, and a ladder that
   * made either the gate would be pricing the other. The middle rung is wide on
   * purpose: *Partial* covers everything from nineteen names and five hulls
   * home to no names and one hull home, and the chapter does not grade inside
   * it.
   */
  objectives: [
    {
      id: 'the-nineteen',
      text: 'Nineteen intervals stand over the Rest. Each is held twenty seconds at the eightieth, bow to the ground the name resolves to. A tone you interrupt is a tone you have not played.',
      initial: ObjectiveStatus.Pending,
      markerId: 'the-rest',
      terminal: true,
      // `sound` counts and names no sounding (§13). "Nineteen or fewer" is
      // exactly the sentence the Order would say, and *which* nineteen is a
      // distinction the count deliberately does not draw.
      predicate: { kind: 'sound', count: 19 },
      reading: {
        met: 'Nineteen are entered. The Order has not said their names in three years and has now played them, which is the only way the Order says anything.',
        unmet:
          'Entered short. What was played is played and what was not is a rest, and the Order does not pretend a rest is on purpose.',
      },
    },
    answers('the-voice-answers', 'voice', 'The Voice'),
    answers('first-answers', 'first', 'The First'),
    answers('second-answers', 'second', 'The Second'),
    answers('third-answers', 'third', 'The Third'),
    answers('fourth-answers', 'fourth', 'The Fourth'),
    answers('fifth-answers', 'fifth', 'The Fifth'),
    {
      id: 'the-count',
      text: 'Those below are on the axis. What is classified of the committal is entered in a record that is not ours.',
      initial: ObjectiveStatus.Pending,
      // Non-terminal, deliberately (§8): read out at the close and unable to
      // touch Complete, Partial or Lost. Nothing else keys on the tolerance —
      // it is a record the player is not shown, and the only mechanism
      // attached to it is a sentence.
      predicate: {
        kind: 'tolerance',
        ticks: TOLERANCE_TICKS,
        tier: ResolutionTier.Classification,
      },
      reading: {
        met: "The watch classified the committal at length and entered it. The Order's dead are in the Directorate's record, which the Order would find discourteous if it were told, and it will not be told.",
        unmet:
          'The watch heard intervals and entered a count it could not attribute. The Order is a bearing in somebody else’s record and nothing more.',
      },
    },
  ],

  /**
   * §9's beat table — the **world's** clock, not the player's. The nineteen
   * intervals are the party's acts and are taken in whatever order it finds;
   * what is scheduled here is the watch, the Ninth and the Drift.
   *
   * Eighteen minutes, and the close is **not** a conclusion: §8 has two
   * failures, and the second of them — the count short while the basin walks
   * under the bench — is the one campaign.md §10's telegraph is measured
   * against. Ninety seconds, from a `loud` creature beat at 16:30 to the
   * `resolve` at 18:00.
   */
  beats: [
    {
      atTick: 0,
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull',
      text: 'The Order has nineteen unentered. It has had nineteen unentered for three years and I have signed the reason twice, in the same words both times: nobody could go down and get them, and a committal is played over the body. The words were true. I am not signing them again.',
      note: '§12, the committal order, read to the party at the Head. Hailed and read — the say channel since #381',
    },

    // 00:00 — the walls. Four coil on the north wall at y 1,400 and three on
    // the south at y 2,600, all seven at 1,700 m, which is fifty metres above
    // the water the party has to work in (§1, §11). Nothing here is loud, and
    // the party will cross this map hearing any of them only when it is
    // already inside a Classification of it (§7).
    coil(
      'coil-north-one',
      750,
      1400,
      "The north wall's first, west to east. Ilar Orme's own coil, 350 m off his metre"
    ),
    coil(
      'coil-north-two',
      1375,
      1400,
      'The second, and the only coil on the map no second interval shares: clearing it buys Wen Brannock and nothing else'
    ),
    coil('coil-north-three', 2000, 1400, 'The third. Marek Vale and Fen Tessaly, at 430 m each'),
    coil(
      'coil-north-four',
      3250,
      1400,
      "The fourth. Ottiline Orme's at 350 m, with Ando Kalliso and Hale Brannock free at 610 either side of it"
    ),
    coil('coil-south-one', 1500, 2600, "The south wall's first. Talin Vale, at 350 m"),
    coil('coil-south-two', 2750, 2600, 'The second. Yorrick Tessaly and Aled Orme, at 430 m each'),
    coil(
      'coil-south-three',
      4000,
      2600,
      'The third, and the last animal on the walls. Roelle Vale at 350 m, and the nearest coil to the three easternmost names on the far row'
    ),

    // 00:00 — the basin, in the Deep End, placed and not driven like the
    // walls. Left alone until 16:30, when it is the close's own telegraph.
    {
      atTick: 0,
      kind: 'creature',
      tag: 'the-basin',
      species: FaunaSpecies.Sounder,
      spawnAt: { x: BASIN.x, y: BASIN.y, depthM: BASIN_DEPTH_M },
      driveTo: { x: BASIN.x, y: BASIN.y },
      untilTick: 0,
      loud: false,
      note: "Cruising at 45 in the Deep End — a Contact to the Voice from 5,655 m, which is the whole eastern half of the map, and nothing anybody has to answer. Seated at the southern end of the Deep End rather than on the axis, for the reason written on BASIN: released to its own trigger model, it eats the watch inside twelve seconds from §11's own coordinate",
    },

    // 01:00 — the watch walks west, 1,300 m in twenty-two seconds at 60 m/s,
    // then two and a half minutes of standing. Its first window opens here.
    ...leg(1, 3500, 'West off station — the first leg, and the first window opens with it'),

    // 04:00 — the Watch-Speaker, once, in the passive and the impersonal
    // (§12), and the pair moves under the middle of the bench: 250 m from the
    // north row in plan and 350 m below it.
    {
      atTick: T(4),
      kind: 'say',
      speaker: 'Watch-Speaker, for those below',
      voice: 'cohorts',
      text: 'The trench is attended. What is played over it is counted. It is not being threatened.',
      note: '§12 — it is not being threatened, it is being counted. The Undermarshalcy states the law once and does not repeat it',
    },
    ...leg(4, 2000, 'The axis under the middle of the bench — the closest the watch comes'),

    // 07:00 — the western end of the patrol, and the first window closes.
    ...leg(7, 1000, 'The western end of the leg. Whatever it heard in six minutes, it has filed'),

    // 09:00 — Kalliso, once, to nobody. The nineteen are said aloud, in the
    // campaign, for the first time and the last (§2, §12).
    {
      atTick: T(9),
      kind: 'say',
      speaker: 'Voice Ren Kalliso, once, to nobody in particular',
      text: 'Nineteen. We can replace the hulls in a season and the Knights in never.',
      note: "§12 — culture.md §3's Knight line, given a mouth at last, at the ninth minute and never again",
    },

    // 10:00 — the watch turns back east. Second window opens.
    ...leg(10, 2000, 'East again — the second window opens'),

    // 12:00 — Sull, on the chapter channel (§12).
    {
      atTick: T(12),
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull, on the chapter channel',
      text: 'The interval does not wait for the count. Enter what is entered.',
      note: '§12 — a liturgical rule stated as a filing convention, which is the Knights’ whole voice in one clause',
    },

    ...leg(13, 3500, ''),
    ...leg(
      15,
      STATION.one.x,
      'Station resumed. The second window closes; whatever it heard, it has filed'
    ),

    // 16:30 — the basin lifts off the Deep End and walks the axis west at
    // 1,800 m, calling at 100 and audible from 9,316 m. The loud beat the
    // close's telegraph is measured from: ninety seconds against §10's sixty,
    // and the only animal on the map that can take a hull the walls cannot.
    {
      atTick: T(16, 30),
      kind: 'creature',
      tag: 'the-basin',
      driveTo: { x: 200, y: AXIS_Y, depthM: BASIN_TRANSIT_DEPTH_M },
      untilTick: T(18),
      loud: true,
      note: 'West along the axis at the roster’s 30 m/s, fifty metres under the bench: at x ≈ 2,000 by 18:00, which is under the Head. Driven, so the guns cannot end it and the last ninety seconds are a decision about the Voice rather than a fight',
    },

    // 16:45 — Sull, on what the basin has answered (§12).
    {
      atTick: T(16, 45),
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull',
      text: 'The basin has answered the eightieth. Whatever is entered is entered. Bring the rest home.',
      note: '§12 — fifteen seconds after the animal, and seventy-five before the close',
    },

    // 18:00 — the close. Sull reads the count, hull by hull, because that is
    // the count she actually has (§8, §12).
    {
      atTick: T(18),
      kind: 'resolve',
      note: 'The committal ends. Not a conclusion: §8 has a failure, it is the count short under a basin the player has heard for ninety seconds, and §10 is paid out of that beat',
    },
  ],

  /**
   * §9's three standing rules, in no order at all, because a standing rule has
   * none. **No conditional beat touches the walls**: the Hollows and the basin
   * answer the intervals, the guns and the ping by their own thresholds and by
   * nothing this mission scripts.
   */
  conditionalBeats: [
    {
      kind: 'say',
      speaker: 'Voice Ren Kalliso, to nobody in particular',
      text: 'That is one of them. The interval comes first and the name arrives after it, and nobody explains that to you at nine.',
      note: '§12 — on the first interval, whenever the party plays it. On the tally rather than the clock',
      when: { kind: 'sound', count: 1 },
    },
    {
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull',
      text: 'Nineteen. Entered.',
      note: '§12 — on the nineteenth. Two words, and the shortest line in the campaign',
      when: { kind: 'sound', count: 19 },
    },
    {
      kind: 'say',
      speaker: 'Watch-Speaker, for those below',
      voice: 'cohorts',
      text: 'Entered: the Order, at the eightieth, over the trench, nineteen times or fewer. The count will say which.',
      note: '§12 — on sixty seconds at Classification. It enters a number it declines to complete, because the Undermarshalcy does not round and does not guess',
      when: {
        kind: 'tolerance',
        ticks: TOLERANCE_TICKS,
        tier: ResolutionTier.Classification,
      },
    },
  ],

  /**
   * §8's Results, verbatim — Sull's three readings, with the eight objective
   * readings printing beneath whichever row the count earned, in authored
   * order, and the sweep's filed line appended to the same paragraph.
   *
   * "Go and be dry" closes the first ending and no other. §12 summarises the
   * close as carrying it "in every ending but the last"; §8's Partial reading
   * is quoted verbatim there and does not, and §8's Results table is the row
   * that authors the text. Transcribed as §8 has it, and the disagreement is
   * named in this file's header rather than resolved by inventing a sentence.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      'Nineteen. Entered, and six on the bench. It has taken the Order three years to play this, and the Order will not need to play it again, which is the only sentence about the nineteen I intend to say aloud. Go and be dry.',
    [MissionOutcome.Partial]:
      'What was played is entered. What was not is a rest and it is not on purpose. Where there is a name to be said to a house tonight, it is not mine to say.',
    [MissionOutcome.Lost]:
      'The trench has kept a count it was not owed. The Order came to enter nineteen and has left the trench more than nineteen to enter, and I authorised it, and the chapter may be courteous about that at its leisure.',
  },
};
