/**
 * The Attending 2 — Intake. docs/mission-intake.md, transcribed.
 *
 * A data literal in `attendance.ts`'s idiom: the document owns the forces, the
 * water, the beats, the numbers and the text. Where this file and that
 * document disagree, one of them is wrong and the fix says which.
 *
 * §13 predicted that this mission would want one thing the format lacked — a
 * predicate over Biomass — and it got it before the literal was written
 * (#330). What the literal found on the day is that the format was wrong for
 * this mission in three smaller places, each a runtime rule rather than a
 * union row, and each stated below so a reviewer can overrule it rather than
 * discover it:
 *
 * 1. **The shift runs its length** (`runsItsLength`). The runtime closes a
 *    mission the moment every terminal objective is met — right for a court
 *    that stops sitting once everybody is out, and wrong for a shift whose
 *    band may be answered at 13:40 while the Sounder still crosses at 16:00
 *    and the roll is filed in the last minute (§8, §9). The muster is met at
 *    tick zero — twelve is at least nine — so without the flag the seventh
 *    rendering would have closed the mission, and a player who searched well
 *    would have been robbed of exactly the five minutes §9 says are the
 *    reward for it.
 * 2. **A muster is a standing count.** `survive` used to latch Met on the
 *    first pass and stay Met through every loss after it, which would have
 *    read "the muster is met" beside eight hulls at the close. It is now
 *    re-derived every tick, as the silence order is (`isStanding`).
 * 3. **An objective is not scored before it is shown.** The finding is
 *    revealed at 19:00 — "the last minute is the only one in which the
 *    finding can be filed" (§9) — and the runtime used to derive hidden
 *    objectives anyway, so a hull that wandered onto the ascent at 05:00
 *    would have filed a finding the ground had not yet asked for.
 * 4. **A transit has a depth** (`driveTo.depthM`). A driven creature held
 *    its species' working depth, and a Sounder's is 2,000 m: below the
 *    muster's 1,900 m floor, which it therefore could not enter, and a
 *    hundred metres under a year holding station at 1,900, which its
 *    85-metre reach therefore never touched. §6's line crosses the muster
 *    through the intake, so the beat now says how deep it runs, and the
 *    colossus runs it at the year's own depth.
 * 5. **A beat the guns cannot end** (`Fauna.driven`, #349). Twelve idle
 *    Abyssal Submersibles at the muster auto-acquired the colossus inside
 *    650 m and had its 9,000 HP down in seventeen seconds, before it reached
 *    the line, and were paid the band for it. A driven creature now takes no
 *    weapon damage for the length of its commitment: the transit is a beat,
 *    and a beat happens when the document says it does.
 *
 * And two authoring decisions the document leaves open or gets wrong:
 *
 * - **No choice group.** §13 proposed the finding as a `choiceGroup` over two
 *    conditional beats, one on `extract` into the ascent and one "on the
 *    whole intake mustering". The second is true at 00:00 — the twelve are
 *    seated at the muster — so a conditional keyed on it would fire on the
 *    first pass and retire the roll before the year had moved. The exclusivity
 *    the group was for is a property the finding already has: one objective,
 *    one `reading` pair, met or unmet at the close. The one condition-fired
 *    beat this file authors is the ground's line on the first rendering,
 *    keyed on the band's own account.
 * - **The Sounder's line is authored in two legs.** §6 says it "crosses the
 *    bench and the muster on a straight line" and does not say where it goes
 *    after. At the roster's 30 m/s the throat is 112 seconds from the muster's
 *    north edge, so the colossus that enters at 16:00 is across the muster by
 *    17:52 — §9's 18:00, to the minute the document rounds to — and at 18:00 it
 *    turns and goes back down the same line to the throat. The same straight
 *    line, both ways, and the bench stays its line until the close; the muster
 *    it is called back to at 19:00 is fifteen hundred metres behind it by then.
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **The money is eight animals, and they are placed.** Eight Hollows on the
 *   two overhangs, authored at tick zero and *not driven*: each is committed
 *   to its own spawn for no ticks at all, which hands it straight back to its
 *   trigger model (§13). `fauna: false`, because the default seeder is a
 *   skirmish roster.
 * - **The band is seven of eight** (§3). 245 against 280 available, the eighth
 *   authored as slack, and the number belongs to this literal and not to
 *   `constants.ts`. Seven of eight is the roster's arithmetic: the region
 *   ledger discounts a rendering over ground the year has worn, so a column
 *   that works a wall together needs the eighth and an array does not. §13
 *   settled that as the document's to state and not this literal's to move
 *   (#350), which is why the band is still 245 and still the roster's.
 * - **The intake is twelve identical hulls with one role**, `cohort`, and the
 *   mission never marks one (§5). The survival count and the roll address
 *   the same role, and `MissionUnit.role` being singular is why the roll
 *   deliberately never asks which hull.
 * - **The one lethal thing is an hour of warning early.** The call at 15:00,
 *   the transit at 16:00, the close at 20:00: sixty seconds against a
 *   sixty-second rule, sixty times over (§6).
 *
 * And two findings this literal made against the engine as built, stated
 * here rather than discovered, in the manner of §3's own note, and both
 * since settled — one on each side:
 *
 * - **Twelve live guns at the muster brought the colossus down before it
 *   reached them.** The bestiary rates a Sounder at 9,000 HP and 260 Biomass
 *   and says it "cannot be reliably killed by any single player before the
 *   twenty-minute mark"; twelve of the intake's 29.6/s are 356 a second, the
 *   transit is inside 650 m of the muster for forty seconds, and the roster
 *   paid the full 260 for it — the band, answered by an intake that never
 *   moved. Settled in the engine (#349), as item 5 above: a driven creature
 *   takes no weapon damage, so the guns still fire and still announce the
 *   year, and the colossus crosses at every point it arrived with.
 * - **The region ledger prices a rendering.** A column that works a wall
 *   together wears the cell and is paid three quarters there, so seven of
 *   eight is slack only spread. Settled in the document (#350), as the
 *   `BAND` comment below records: the band stays 245 and the roster's.
 *
 * The test states both so the day either is reopened is noticed.
 */

import {
  ATTENDING_INTAKE_HEADER,
  Faction,
  FaunaSpecies,
  MissionOutcome,
  ObjectiveStatus,
  SIM,
  UnitKind,
  faunaStatsFor,
} from '@echoes/shared';

import type { MissionBeat, MissionDefinition, MissionUnit } from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/** Reserved and empty, as the other Directorate mission reserves it. */
const COURT = 1;

/**
 * §3, §8 — the band: seven of the eight renderings the map carries, and the
 * eighth authored as slack so that a band met exactly would not make the
 * mission a checklist. An authored number belonging to this literal, and the
 * roster's figure: the region ledger may take the eighth from a column that
 * worked the walls together, and §13 leaves it there (#350).
 */
const BAND = 245;
/** §8, §12 — "Nine of twelve is a muster. The Undermarshalcy does not round up." */
const MUSTER = 9;
/** §11 — the year's working depth at the muster, and the hulls' own. */
const MUSTER_DEPTH_M = 1900;
/** §6, §11 — the Sounder's line: the throat, the bench and the muster share this x. */
const LINE_X = 2500;
/** Where the Ninth leaves the map southward, and where the colossus arrives through. */
const THROAT = { x: LINE_X, y: 3875 };
/** The muster's north edge — the far end of the transit before it turns. */
const MUSTER_NORTH = { x: LINE_X, y: 500 };
/** §11 — the eight Hollows, at the species' working depth, 200 m above the muster. */
const HOLLOW_DEPTH_M = faunaStatsFor(FaunaSpecies.Hollow).workingDepthM;

/**
 * One of Intake 11 — an Abyssal Submersible with live fire control and the
 * role every hull on this map carries. PR-3 is the roster's, no refit, and
 * nothing on this map crushes anybody at any depth it authors (§2).
 *
 * Seated in three rows of four across the muster. Six of the twelve stand
 * within a hull's width of the Sounder's line — the two middle columns — which
 * is what §9's "everything on the line is ground through" costs a player who
 * moved nothing: a muster of six, and the count reads Lost.
 */
const cohort = (ordinal: string, x: number, y: number, note: string): MissionUnit => ({
  tag: `cohort-${ordinal}`,
  kind: UnitKind.AbyssalSubmersible,
  x,
  y,
  depthM: MUSTER_DEPTH_M,
  role: 'cohort',
  armed: true,
  note,
});

/**
 * A Hollow, placed and not driven (§13).
 *
 * The `creature` beat's `driveTo` is required, so an ambusher that must not be
 * driven is committed to its own spawn until tick zero — the first pass finds
 * the commitment already expired, hands the creature its ears back, and leaves
 * it to the trigger model: SIG 3 at rest, coiled at Interest, and a strike only
 * inside 500 m at Commit (docs/bestiary.md §4). `loud: false`, because nothing
 * about a coiled animal is a precursor to anything.
 */
const hollow = (ordinal: string, x: number, y: number, note: string): MissionBeat => ({
  atTick: 0,
  kind: 'creature',
  tag: `hollow-${ordinal}`,
  species: FaunaSpecies.Hollow,
  spawnAt: { x, y, depthM: HOLLOW_DEPTH_M },
  driveTo: { x, y },
  untilTick: 0,
  loud: false,
  note,
});

export const ATTENDING_INTAKE: MissionDefinition = {
  ...ATTENDING_INTAKE_HEADER,
  doc: 'docs/mission-intake.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Directorate,
  courtSlot: COURT,
  /** §11 — every creature on this map is authored. */
  fauna: false,
  /** §8, §9 — the close at 20:00 is the shift ending, whatever the register stands at. */
  runsItsLength: true,
  /**
   * §3 — fifty, the middle of a harvest cycle's 45–60 and the loudest the
   * campaign has authored. A description, not a ceiling: this mission has no
   * silence order and nothing on the map that would sanction a breach.
   */
  sigBudget: 50,
  // No arrayTag and no silence order: Asset Recovery's posture (§2). The
  // ledger simply does not run, because this is the mission where the
  // Directorate is strong, and everything that makes you strong makes you
  // loud.
  silenceCeilingSig: 100,
  debtCapS: 0,
  /** No held freight: twelve hulls that move on their own orders. */
  escortRadiusM: 0,

  /**
   * §11's table, as the places the mission needs to name. The map paints all
   * eight; these are the ones a predicate, a marker or a reader addresses.
   */
  regions: [
    {
      id: 'the-ascent',
      x: 2250,
      y: 0,
      widthM: 500,
      heightM: 250,
      note: "The Ascent — the stair north out of the map, toward the shallows. The roll's region: a hull standing here at the close is the ground's finding",
    },
    {
      id: 'the-muster',
      x: 1750,
      y: 500,
      widthM: 1500,
      heightM: 500,
      note: 'The Muster — the banding ground proper. Where the year is seated, and where it is called back to at 19:00',
    },
    {
      id: 'the-bench',
      x: 1500,
      y: 1250,
      widthM: 2000,
      heightM: 1500,
      note: "The Bench — the open middle between the overhangs, and the Sounder's line",
    },
  ],

  /**
   * One marker, and it is revealed with the finding at 19:00 — a marker ships
   * only while an objective naming it is shown, so the ascent is pointed at
   * for the last minute and never before. Nothing points at an animal.
   */
  markers: [
    {
      id: 'the-ascent',
      label: 'The ascent. The stair north, toward the shallows.',
      x: 2500,
      y: 125,
      radiusM: 250,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Directorate,
      note: 'Intake 11 — twelve Abyssal Submersibles, crewed by the year, and nothing else (§2). No Cantor, no structures, no reinforcement and no repair',
      units: [
        cohort('one', 2350, 650, 'Seated at the muster with the rest. Nothing marks it'),
        cohort('two', 2450, 650, ''),
        cohort('three', 2550, 650, ''),
        cohort('four', 2650, 650, ''),
        cohort('five', 2350, 750, ''),
        cohort('six', 2450, 750, ''),
        cohort('seven', 2550, 750, ''),
        cohort('eight', 2650, 750, ''),
        cohort('nine', 2350, 850, ''),
        cohort('ten', 2450, 850, ''),
        cohort('eleven', 2550, 850, ''),
        cohort(
          'twelve',
          2650,
          850,
          'The twelfth, and identical to the other eleven in every stat. If the arithmetic could answer the question, the game would have answered it (§5)'
        ),
      ],
    },
  ],

  /**
   * §2 — what the intake does not carry, as dead affordances with the ground's
   * own reasons shown. Weapons are live: this is the campaign's first mission
   * with combat in it.
   */
  locks: [
    {
      ability: 'activeSonar',
      reason:
        'aboard, live, and not used — and today it is the button that would call what is coming up the Ninth',
    },
    {
      ability: 'construction',
      reason: 'the intake is twelve hulls, and there is nothing to build',
    },
  ],

  /**
   * §8's three rows, in §12's order: the band, the muster, and the finding.
   * The first two are terminal and the count is decided by them alone; the
   * third is read out and never ranked (§5).
   */
  objectives: [
    {
      id: 'the-band',
      text: 'The band is two hundred and forty-five. It is rendered from what lives on the walls, and it will not come to you.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      // §8 — Biomass banked, read off the player's own economy record. The
      // figure is the one their own readout carries, so the shortfall at the
      // half-hour mark is arithmetic they can do.
      predicate: { kind: 'deliver', account: 'biomass', amount: BAND },
      reading: {
        met: 'The band is answered.',
        unmet: 'The band is short. A short column is entered as a short column.',
      },
    },
    {
      id: 'the-muster',
      text: 'Nine of twelve is a muster. The Undermarshalcy does not round up.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      // §8 — nine of twelve at the close. A standing count, re-derived every
      // tick, so a hull the Sounder took at 18:00 is a hull the muster is
      // short at 20:00.
      predicate: { kind: 'survive', role: 'cohort', count: MUSTER },
      reading: {
        met: 'Nine are mustered. The muster is met.',
        unmet: 'Fewer than nine are mustered. The muster is short, and it is entered as short.',
      },
    },
    {
      id: 'the-finding',
      text: 'At the close the ground files what it saw. It is not asked for a number. It is asked what it saw.',
      initial: ObjectiveStatus.Pending,
      // §9 — revealed when the muster is called, because the last minute is
      // the only one in which the finding can be filed, and the mission does
      // not say so twice.
      revealAtTick: T(19),
      markerId: 'the-ascent',
      // §5 — non-terminal, deliberately: read out at the close and unable to
      // touch Complete, Partial or Lost. Neither reading is scored, neither
      // is worth a point of anything, and the mission never says one is
      // better. `extract` rather than anything richer, because the roll
      // deliberately never asks which hull.
      predicate: { kind: 'extract', role: 'cohort', region: 'the-ascent', count: 1 },
      reading: {
        met: "The ground's finding is entered. It will be attended to personally. It always is.",
        unmet: "The ground's finding is entered. None. That is also entered.",
      },
    },
  ],

  /**
   * §9's beat table, in its order. Twenty minutes, closing as a conclusion:
   * the shift ends and the ground files what it has (§8).
   *
   * The renderings are not here. §9 places them at 03:20, 05:40 and so on
   * because the Hollows are placed where §11 places them and a player who
   * works efficiently arrives at about that rate; they are not scripted
   * kills, and a player who finds them faster banks earlier.
   */
  beats: [
    {
      atTick: 0,
      kind: 'say',
      speaker: 'Undermarshal Setha Korrin',
      text: 'Intake 11 is mustered. Twelve hulls are given to the ground. The band is two hundred and forty-five, and it is rendered from what lives on the walls.',
      note: 'Hailed and read — the say channel since #381',
    },
    // 00:00 — the eight Hollows, at working depth 1,700 m, on the two
    // overhangs (§11). The nearest to the muster is 1,601 m out against 1,231
    // m of contact, so the mission opens on a search rather than on a sound.
    hollow(
      'west-one',
      500,
      1500,
      "West overhang — the far wall. Half the year's income is over here"
    ),
    hollow('west-two', 750, 2250, ''),
    hollow(
      'west-three',
      1250,
      1750,
      'The nearest animal to the muster, and still out of hearing from it'
    ),
    hollow('west-four', 500, 2500, ''),
    hollow(
      'east-one',
      4500,
      1500,
      'East overhang — the other half, four kilometres from the first'
    ),
    hollow('east-two', 4250, 2250, ''),
    hollow('east-three', 3750, 1750, ''),
    hollow(
      'east-four',
      4500,
      2500,
      'The eighth. Slack: a player who finds seven has done the whole job, and a player who finds eight is told nothing'
    ),

    // 07:00 — the Cohort-Prime, on the halls' channel. One sentence about the
    // year, and nothing about the roll (§12).
    {
      atTick: T(7),
      kind: 'say',
      speaker: 'Cohort-Prime of Intake 11, on the halls’ channel',
      text: 'The year is working. It is not being tested, whatever it has been told by people who were tested and remember it that way. It is a shift. It will be a shift at the end of it as well.',
      note: 'Corrects a misapprehension about the year’s own dignity without once claiming it',
    },

    // 15:00 — the Sounder calls. SIG 100, heard everywhere, once: the loud
    // beat the close's telegraph is measured from, sixty seconds before the
    // transit and three hundred before the close (§6, §8).
    {
      atTick: T(15),
      kind: 'say',
      speaker: 'The ground',
      text: 'One is coming up the Ninth and it is not attending anything. Its line is the bench. The ground is not asked to hold the bench.',
      note: 'The call. An Abyssal Submersible holds SIG 100 at contact from three times the width of the map, and there is no place to stand where it is faint',
    },

    // 16:00 — the transit begins, from the throat, northbound across the
    // bench. Deafened and driven, the way every authored colossus is: it is
    // not hunting the year and never notices it, and the Directorate's only
    // hull is exactly the length a Sounder grinds (§6, §13).
    {
      atTick: T(16),
      kind: 'creature',
      tag: 'sounder',
      species: FaunaSpecies.Sounder,
      spawnAt: { x: THROAT.x, y: THROAT.y, depthM: MUSTER_DEPTH_M },
      driveTo: { ...MUSTER_NORTH, depthM: MUSTER_DEPTH_M },
      untilTick: T(18),
      loud: true,
      note: 'Up the Ninth at the roster’s 30 m/s, at the year’s own depth: across the bench, across the muster, and at its north edge by 17:52',
    },

    // 18:00 — the transit has crossed the muster. Everything on the line is
    // ground through; everything that moved is not (§9). It turns and goes
    // back down the line it came up, and the bench stays its line until the
    // close.
    {
      atTick: T(18),
      kind: 'creature',
      tag: 'sounder',
      driveTo: { ...THROAT, depthM: MUSTER_DEPTH_M },
      untilTick: T(20),
      loud: false,
      note: 'The same straight line, the other way. Not a second pass — the same transit, leaving',
    },

    // 19:00 — the muster is called. The last minute is the only one in which
    // the finding can be filed, and the mission does not say so twice (§9).
    // The finding is revealed at this tick.
    {
      atTick: T(19),
      kind: 'say',
      speaker: 'The ground',
      text: 'The muster is called. At the close the ground files what it saw.',
      note: 'Said once. The finding and its marker appear with this line',
    },

    // 20:00 — the shift ends. Korrin reads the band, the muster and the
    // finding, in that order and no other — that is the epilogue and the
    // objective readings beneath it — and then says one sentence to nobody.
    {
      atTick: T(20),
      kind: 'say',
      speaker: 'Undermarshal Setha Korrin',
      text: 'I have signed three of these. I know where all of them are.',
      note: 'And she visits. Not explained, and nobody responds to it — the civil war being kept, one sentence per mission',
    },
    {
      atTick: T(20),
      kind: 'resolve',
      conclusion: true,
      note: 'The shift ends. The ground files what it has, and nobody is asked to replay it',
    },
  ],

  /**
   * The ground, on the first rendering — §12's line, and §9's 03:20 beat,
   * fired by the thing it is about rather than by the clock: the band's own
   * account reaching one rendering's worth. A player who finds the first
   * animal at 02:30 hears it at 02:30.
   */
  conditionalBeats: [
    {
      kind: 'say',
      speaker: 'The ground',
      text: 'Rendered. Thirty-five is entered against the band. The animal is entered too, which is the part people forget is also a record.',
      note: 'Thirty-five is the roster’s figure for a Hollow, and the condition reads it from the roster',
      when: {
        kind: 'deliver',
        account: 'biomass',
        amount: faunaStatsFor(FaunaSpecies.Hollow).biomass,
      },
    },
  ],

  /**
   * §8's Results, verbatim — Korrin's three readings, with the three objective
   * readings printing beneath whichever row the run earned.
   *
   * "You were sufficient" is the middle reading and the highest praise the
   * register has, spent on a partial for the second time in two missions.
   * Neither terminal objective is a keystone: a year that came home poor and
   * a year that paid and lost three are the same result, because the
   * Directorate does not price bodies against income.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      'The band is answered and the intake is mustered. Both are entered. The year is placed, and the placing is the year’s, not the ground’s.',
    [MissionOutcome.Partial]:
      'You were sufficient. One column is filled and one is short, and a short column is entered as a short column. The Undermarshalcy has never asked a ground for two.',
    [MissionOutcome.Lost]:
      'No band and no muster. That is not a failure of yours; it is a ground that was worked and did not answer, and it is entered as one. The year is re-shifted and attends again.',
  },
};
