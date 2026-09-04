/**
 * The Second Chord 5 — The Three. docs/mission-the-three.md, transcribed.
 *
 * A data literal in `intake.ts`'s idiom: the document owns the forces, the
 * water, the beats, the numbers and the text. Where this file and that document
 * disagree, one of them is wrong and the fix says which.
 *
 * §13 calls this the cheapest literal in the bible and it is right — it asks
 * the format for nothing that was not already shipped, and the two things it
 * cannot say it declines to ask for. What is worth stating is why the cheap
 * literal is still not a mechanical one:
 *
 * - **`runsItsLength`, and this is the mission it was built for.** The room is
 *   met at about 04:30 and the hush is met a minute before it, and both are
 *   terminal — so the court's rule would close a twelve-minute mission at four
 *   and a half, before the Chord sounds at 07:40 and before the axis answers
 *   at 08:40 (§9, §13). Neither row latches at tick zero: the party is seated
 *   2,089 m from the marker, and the escort opens at 55 and 28 against a
 *   ceiling of 8. The flag is what keeps the last seven and a half minutes.
 * - **The hush's ceiling is a mode, not a discipline.** `HUSH_CEILING_SIG` is
 *   `SILENT_RUNNING.SIG_MAX` rather than a hard-coded eight, because §4's whole
 *   argument is that the button is the only thing on this map that gets under
 *   it: `silentRunningSig` sits a hull in the 3–8 band by its own idle figure
 *   (`acoustics.ts`), so the Voice runs silent at 7.583 and a Corvette at
 *   5.333, and the loudest hull the row measures clears the ceiling by four
 *   tenths of a point. A hull that simply stops emits 28.
 * - **The house is a second Knight party, and the consequence is stated rather
 *   than found.** An emitter on the player's own party is one the player can
 *   never hear (`missions.test.ts`), so the First needs a slot of its own;
 *   hostility in this engine is `Owner.slot`, so the house is formally the
 *   player's enemy. It has no hulls, the player's four carry no `armed` flag,
 *   and all seven abilities are locked. Nothing on this map can fire (§2, §13).
 * - **The First Chord grants nobody anything, and that is why the refit
 *   exists.** `aurasSystem` skips any spire whose `grantSlot` is not the unit's
 *   own slot, so the Spire's 600 m PR+1 reaches no hull at all — the house has
 *   none and the player is on another slot. `world.spireActive` is likewise
 *   never set, so the Chord hums at 30 for twelve minutes and never sings at 80
 *   (§5). The four `pressureRating` refits are what it costs to visit somebody
 *   else's deepest house, and **no `MissionRegion.pressureBonus` is authored
 *   anywhere**: this mission buys certificates per hull, it does not manufacture
 *   habitable water.
 * - **The crystal ledger is prose and is stated once.** Four certificates at
 *   sixty of Resonance, 240 of the Ninth's 600, 360 left, and 360 is three
 *   Spires (`STRUCTURE_STATS[SoundingSpire].crystalCost` is 120) and not a
 *   fourth (§3). Nothing in the runtime carries it: there is no
 *   `startingCrystal`, `startingNodules` is 0, construction is locked and the
 *   map has no resource field. docs/mission-rim-deposits.md and
 *   docs/mission-second-chord.md both cite that paragraph, so the figure in the
 *   header's briefing is load-bearing for two other literals.
 * - **The close is a conclusion and nothing here is loud.** No `creature` beat
 *   is authored and `fauna` is false, so there is no last loud beat for §10's
 *   sixty-second telegraph to be measured from — and none is owed, because
 *   `conclusion: true` is a tide ending rather than a failure state (§8, §13).
 *   The two emitter windows are the world's clock, not a warning.
 *
 * And one place the document asks for something the format has nowhere to put:
 *
 * - **§12 lists five "objective readings, in play" for three objectives.** The
 *   first three are the rows' own `text` and are authored below. The fourth
 *   ("The escort is at eight...") and the fifth ("One of two entered...") are
 *   live *state* readings, and the only two alternates an objective carries are
 *   `debtText`, which `view.ts` shows while `state.debtS > 0`, and `stallText`,
 *   which it shows while a walk is stalled. This mission runs no silence ledger
 *   (`arrayTag` is unset, §9) and no walk, so both fields would be authored
 *   text that could never be shown. They are dropped rather than smuggled into
 *   a mechanism that is not here — which is the call §13's own row now records
 *   ("A finding, not a request"), and it names the document as the side that
 *   moved: the last two are prose about what a panel would say if it could.
 *
 * §13's own open finding is left open on purpose: **`quiet` is a snapshot, not
 * an integral.** The hush is standing (`predicates.ts`, `isStanding`) and is
 * re-derived every tick, so what the close reads is the escort's peak SIG at
 * the resolve rather than over the eight minutes, and a party that shoved at
 * 06:00 and pressed the button at 11:59 reads Met. The shape that would fix it
 * is a `latchOnBreach` flag on the predicate; the unmet reading below is written
 * to be true of a shove at any moment, and Silent Running is a mode a hull is in
 * rather than a button pressed at the bell.
 */

import {
  CHORD_THE_THREE_HEADER,
  Faction,
  MissionOutcome,
  ObjectiveStatus,
  SILENT_RUNNING,
  SIM,
  StructureKind,
  UnitKind,
} from '@echoes/shared';

import type { MissionDefinition, MissionEmitter } from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/** Reserved and empty, as every campaign mission reserves it (§5). */
const COURT = 1;
/**
 * The First's own slot (§2, §5, §13).
 *
 * A second Hadron party, with no hulls, one structure and five emitters. It
 * exists because the Echo Layer's pair loop skips listener and emitter on one
 * slot, so a house seated with the escort would be a house the escort could
 * never hear — and the house has to be audible or the mission is twelve minutes
 * of nothing. Formally the player's enemy, and there is not a weapon on either
 * side of it.
 */
const HOUSE = 2;

/** §3, §11 — the escort crosses the foot at 2,300 m, 400 m over its 2,700 floor. */
const PARTY_DEPTH_M = 2300;
/** §11 — the house's own floor, and every metre of it that holds a sound. */
const HOUSE_DEPTH_M = 2900;
/** §5, §11 — the axis, fifty metres off the trench's 3,100 m floor. */
const AXIS_DEPTH_M = 3050;

/**
 * §3 — PR-3 by refit, authored per hull.
 *
 * The Hadron baseline is PR-2 and `requiredPressureRating` returns 3 from
 * 1,800 m down, so every metre of water this party occupies is Abyssal: without
 * the certificates the mission would be four hulls bleeding four points a second
 * in their own house. A refit is a mission fact and never a roster fact — the
 * Cruiser in `units.ts` is still what everybody else fields.
 */
const REFIT_PR = 3;

/**
 * §4, §8 — the hush's ceiling, and the reason it is derived rather than typed.
 *
 * Eight is `SILENT_RUNNING`'s band ceiling, which makes it a number no hull on
 * this map can reach any other way: a Knight Corvette that simply stops emits
 * 28 and the Voice idles at 55. Every previous ceiling in the bible was a
 * discipline a hull could hold at cruise; this one is the button.
 */
const HUSH_CEILING_SIG = SILENT_RUNNING.SIG_MAX;

/** §4, §13 — the hold, measured horizontally against the tender's own position. */
const ESCORT_RADIUS_M = 600;

/**
 * §5 — twenty seconds, for both of the things the water does.
 *
 * The pattern and the window are the same length, which is what *sustained*
 * means when the format's unit is a strike window: not a rhythm, one passage.
 */
const WINDOW = 20 * SIM.TICK_HZ;

/** §5, §6, §7 — the cells: SIG 4, two seconds in every six, unbounded. */
const CELL_SIG = 4;
const CELL_PERIOD = 6 * SIM.TICK_HZ;
const CELL_ON = 2 * SIM.TICK_HZ;

/**
 * §13 — 5,000 apiece, and no hull on this map can spend a point of it.
 *
 * Authored because the Echo pass selects on Health and every emitter needs
 * some; the figure is the document's for the two attendable ones, and the three
 * cells carry it too because there is nothing in this water that could shoot
 * anything.
 */
const EMITTER_HP = 5000;

/**
 * One cell of the hospice — §5's table, and §6's whole argument.
 *
 * **No `reading`, on purpose.** An emitter without one is not attendable, is in
 * no count and is in no epilogue, which is the format's own way of saying a
 * thing is heard and not read. At Tier 3 an emitter's contact carries a
 * position and a depth and no kind and no faction, so the strongest thing the
 * player can ever hold on a cell is a scratch at a place — which is exactly
 * what docs/habitats.md §5 asks for and the whole of what the format will give.
 */
const cell = (ordinal: string, x: number, y: number, note: string): MissionEmitter => ({
  tag: `cell-${ordinal}`,
  x,
  y,
  depthM: HOUSE_DEPTH_M,
  sig: CELL_SIG,
  periodTicks: CELL_PERIOD,
  onTicks: CELL_ON,
  hp: EMITTER_HP,
  note,
});

export const CHORD_THE_THREE: MissionDefinition = {
  ...CHORD_THE_THREE_HEADER,
  doc: 'docs/mission-the-three.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Hadron,
  courtSlot: COURT,
  /** §5, §11 — below 2,700 m the column is empty of animals entirely. */
  fauna: false,
  /**
   * §9, §13 — twelve minutes is the mission.
   *
   * The room is met at about 04:30 and the hush with it, and both are terminal;
   * without this the court's rule would close the tide at four and a half and
   * take the Chord, the axis and the reading with it.
   */
  runsItsLength: true,
  /**
   * §4's ledger is prose. Nothing is bought, construction is locked, and the
   * map carries no resource field (§13).
   */
  startingNodules: 0,
  /**
   * §4 — eight, and it is a description rather than a ceiling: the
   * Choirmaster's hull sits at 55 beside it all mission and is in breach of
   * nothing. It is what the *escort* emits once it is in the chord.
   */
  sigBudget: HUSH_CEILING_SIG,
  // §9 — no silence order. `arrayTag` is unset, so the ledger never runs and
  // the hush is an objective rather than a debt. The house lends nothing: the
  // First Chord is on the First's slot and grants nobody anything (§5).
  silenceCeilingSig: 100,
  debtCapS: 0,
  /**
   * §4 — six hundred metres, and the geometry does what no predicate can. The
   * sealed room is 500 m wide off the hall's east end, and an escort standing
   * at the mouth at (2500, 2250) holds every metre of it: the farthest corner
   * is 559 m. So the escort waits at the door and does not go in, not because a
   * rule forbids it but because there is nowhere else it needs to be.
   */
  escortRadiusM: ESCORT_RADIUS_M,

  /**
   * §8's four regions. The map paints five rooms and a trench; these are the
   * ones a predicate or a reader addresses.
   *
   * **No `pressureBonus` on any of them.** The party's depth access is four
   * authored certificates on four hulls (§3), not manufactured water — the
   * Order projects access by refit, and the one instrument on this map that
   * could rate a rectangle belongs to somebody else.
   */
  regions: [
    {
      id: 'sealed-room',
      x: 2500,
      y: 2000,
      widthM: 500,
      heightM: 500,
      note: 'The Sealed Room — thirty-six years of writing in three hands, a case a season, in a cut dry room off the chord’s east end. Roofed at 2,800: the deepest ceiling on the map, so it is the last dive',
    },
    {
      id: 'the-chord',
      x: 1500,
      y: 2000,
      widthM: 1000,
      heightM: 500,
      note: 'The Chord — the hall the instrument stands in, Coral Ruins at PF 0.80. The hush is here, and so is the escort for eight minutes',
    },
    {
      id: 'the-approach',
      x: 1500,
      y: 750,
      widthM: 1000,
      heightM: 1250,
      note: 'The Approach — roofed at 2,600, so it is entered on an order and by nothing else. The first of the four dives',
    },
    {
      id: 'the-foot',
      x: 0,
      y: 0,
      widthM: 4000,
      heightM: 750,
      note: "The Foot of the Fields — where the party is seated at 2,300 m, 2,089 m from the room and 1,950 m from the Chord. §4's 1,550 is the dive rather than the seat: the roofed approach opens 1,500 m out, and the house classifies a descent at 72 from 2,028",
    },
  ],

  /**
   * One marker, revealed with its objective at 00:00: the mission has one place
   * to go and says so from the first tick. Nothing points at the hospice, which
   * is heard and never entered (§6).
   */
  markers: [
    {
      id: 'the-room',
      label: 'The sealed room. The Choirmaster reads there alone.',
      x: 2750,
      y: 2250,
      radiusM: 250,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Hadron,
      note: "The Choirmaster's escort (§2, §3) — four hulls at the foot of the Fields, one of which is her. Thirty-one souls, PR-3 by refit, nothing armed and seven locks",
      units: [
        {
          tag: 'the-choirmaster',
          kind: UnitKind.Cruiser,
          x: 2000,
          y: 300,
          depthM: PARTY_DEPTH_M,
          role: 'tender',
          pressureRating: REFIT_PR,
          souls: 9,
          note: "Choirmaster Ivane Sull's hull, and the mission's tender: 55 idle / 65 live in the cone, HYD 65, unarmed. It does not move without ears and it does not run silent — it is the one thing in this water the house is entitled to hear (§4, §8)",
        },
        {
          tag: 'the-voice',
          kind: UnitKind.Cruiser,
          x: 1850,
          y: 450,
          depthM: PARTY_DEPTH_M,
          role: 'escort',
          pressureRating: REFIT_PR,
          souls: 12,
          note: "Voice Ren Kalliso's hull and the party's ears — the same figures, and the loudest hull the hush measures: silent at 7.583 against a ceiling of 8, which is four tenths of a point and no other way to buy it",
        },
        {
          tag: 'ear-first',
          kind: UnitKind.Corvette,
          x: 2150,
          y: 450,
          depthM: PARTY_DEPTH_M,
          role: 'escort',
          pressureRating: REFIT_PR,
          souls: 5,
          note: "§11's First — 28 in the cone, 9.8 on the flank, 2.8 in the wake, HYD 50, unarmed. Silent at 5.333",
        },
        {
          tag: 'ear-second',
          kind: UnitKind.Corvette,
          x: 2000,
          y: 600,
          depthM: PARTY_DEPTH_M,
          role: 'escort',
          pressureRating: REFIT_PR,
          souls: 5,
          note: "§11's Second. One of these two ends up at the hall's east end inside 600 m of the Choirmaster, and the room is 559 m across from there",
        },
      ],
    },
    {
      slot: HOUSE,
      faction: Faction.Hadron,
      note: 'The First (§5) — no hulls, one instrument and five sounds. A second Knight party so that the house is audible, formally the player’s enemy and unable to fire at anything, because it has nothing to fire with',
      units: [],
      structures: [
        {
          tag: 'the-first-chord',
          kind: StructureKind.SoundingSpire,
          x: 2000,
          y: 2250,
          depthM: HOUSE_DEPTH_M,
          note: 'The First Chord — raised in 178 PC and aimed down the trench axis, still standing, still aimed and still tuned. SIG 30 idle, HYD 45, 1,800 HP: the ears that hear the party’s dive from 3,596 m and classify it from 2,028. Its 600 m PR+1 is granted on the First’s own slot and therefore reaches nobody, and it never goes active — an instrument in working order that nobody is permitted to sound',
        },
      ],
      emitters: [
        /**
         * §4, §5, §7 — the Chord sounds, unstruck, at 07:40 for twenty seconds
         * at SIG 12. Bearing to the Voice from 1,246 m in the chord's own
         * water, which is further than any part of the house, so every hull in
         * the building has it whatever it is doing. Nobody struck it.
         */
        {
          tag: 'the-chord-ring',
          x: 2000,
          y: 2250,
          depthM: HOUSE_DEPTH_M,
          sig: 12,
          periodTicks: WINDOW,
          onTicks: WINDOW,
          hp: EMITTER_HP,
          fromTick: T(7, 40),
          untilTick: T(8),
          reading: {
            entered:
              'The Chord was heard, unstruck, at the seventh minute and forty seconds. The time is entered. Nothing else is.',
            gap: 'The Chord was not heard. The wrights say it sounded. The time is entered on their word.',
          },
          note: 'The Chord, sounding — the first of the two things the water does, and the one the house owns',
        },
        /**
         * §4, §5, §7 — the axis at 08:40, sixty seconds after the Chord, SIG 3
         * for twenty seconds, 400 m south of the hall and fifty metres off the
         * trench floor. The return's own figures, inherited whole from
         * docs/mission-attendance.md §6. The path from the hall crosses 250 m of
         * Coral Ruins and 150 m of Abyssal Trench — a mean PF of about 1.10,
         * which puts bearing at 639 m, so a hull in the hall's south half has it
         * and a hull at the room's mouth, 640 m out, is on the line.
         *
         * **Nothing in this document connects the two windows.** The Directorate
         * would enter the gap as well; the Order keeps no gaps.
         */
        {
          tag: 'the-axis',
          x: 2000,
          y: 2650,
          depthM: AXIS_DEPTH_M,
          sig: 3,
          periodTicks: WINDOW,
          onTicks: WINDOW,
          hp: EMITTER_HP,
          fromTick: T(8, 40),
          untilTick: T(9),
          reading: {
            entered:
              'The axis was heard at the eighth minute and forty seconds, sixty seconds after the Chord sounded. The house heard it. It is not entered as anything, and the Order does not keep a gap.',
            gap: 'The axis was not heard. The Order does not keep a gap, so nothing is entered.',
          },
          note: 'The axis — not entered as anything. It is entered as the time',
        },
        cell(
          'one',
          1100,
          2100,
          'The Three, in three cells off the chord. A Voice in the hall’s west end stands 350 m from the nearest of them against a contact at 808 m and a classification at 456 — well inside, and a classification on an emitter is a place and a depth and nothing else'
        ),
        cell('two', 1250, 2250, 'The nearest cell to the hall'),
        cell(
          'three',
          1100,
          2400,
          'The third. The player will hear the scratching for twelve minutes, will resolve it to three points, and will never be told a single thing about it'
        ),
      ],
    },
  ],

  /**
   * §3 — all seven of `MissionAbility`'s names, each with the house's own
   * reason attached for the HUD (docs/ui-ux.md §7). Three literals lock all
   * seven — `sorrowgate.ts`, `firstArrival.ts` and this one — so the count is
   * not the argument and §3 does not make it one: the pairing is. This mission
   * and the prologue are the same argument at opposite ends of the campaign, a
   * room where nothing is aimed, and the rim's seven are a different sentence
   * because the rim is attended rather than asked.
   *
   * The five weapon locks carry one sentence between them because §3 gives them
   * one reason, and the hulls carry no `armed` flag either — the lock is the
   * second half of a statement the spawn already makes.
   */
  locks: [
    {
      ability: 'weapons',
      reason: 'nothing in the First is armed, and nothing in it is aimed but the Chord',
    },
    {
      ability: 'torpedoes',
      reason: 'nothing in the First is armed, and nothing in it is aimed but the Chord',
    },
    {
      ability: 'mines',
      reason: 'nothing in the First is armed, and nothing in it is aimed but the Chord',
    },
    {
      ability: 'depthCharges',
      reason: 'nothing in the First is armed, and nothing in it is aimed but the Chord',
    },
    {
      ability: 'noisemakers',
      reason: 'nothing in the First is armed, and nothing in it is aimed but the Chord',
    },
    // The first Knight mission that takes the ping away after giving it
    // (docs/mission-nineteen.md put it in the player's hands), which is what
    // makes withholding it a courtesy rather than a rung.
    {
      ability: 'activeSonar',
      reason: 'a ping in the chord is a stroke, and nothing is struck in the chord',
    },
    { ability: 'construction', reason: 'the First is finished' },
  ],

  /**
   * §8's three rows, in §8's order — which is also the order they are read out
   * in beneath the close: the room's reading, the hush's, the attend line, and
   * then the two emitters' entered-or-gap lines.
   *
   * Two terminal rows and no keystone, so the ladder is the format's own: both
   * met is Complete, one is Partial, neither is Lost. The third row is read out
   * and cannot touch the count.
   */
  objectives: [
    {
      id: 'the-room',
      text: 'The Choirmaster reads alone. The room is dry and the cases are sealed a season at a time.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      markerId: 'the-room',
      // An `extract` latches Met and is never re-derived, which is why a row
      // read *at the close* needs a late reveal. This one is not that: reaching
      // the room is a thing that happened, and the party is seated 2,089 m away
      // at the foot, so nothing latches at tick zero.
      predicate: { kind: 'extract', role: 'tender', region: 'sealed-room', count: 1 },
      reading: {
        met: "The season's case was read. Nothing of it is entered.",
        unmet:
          'The case was not read this season. It will keep; it has kept thirty-six years. I will not.',
      },
    },
    {
      id: 'the-hush',
      text: 'The chord is where the house keeps its silence. The escort is silent in it: eight, and nothing struck.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      // `quiet` reads the peak emitted SIG over the named role and never
      // `own.peakSig` (`predicates.ts`), which is what lets the Choirmaster's
      // hull sit at 55 beside a ceiling of 8 without breaching it. That is not
      // a loophole; it is the objective. The house is entitled to hear the
      // Choirmaster and is not entitled to hear anybody else.
      //
      // Standing (`isStanding`), so it is re-derived every tick and read at the
      // resolve — the file header carries what that costs.
      predicate: { kind: 'quiet', role: 'escort', ceilingSig: HUSH_CEILING_SIG },
      reading: {
        met: 'The hush was kept. The house heard the Choirmaster and heard nothing else of the party, which is the whole of what an escort is for in this house.',
        unmet:
          'The escort was heard in the chord. A hull under way in the chord is a shove, and the house has entered the time.',
      },
    },
    {
      id: 'the-house-hears',
      text: 'The house hears what comes to it. What is heard is entered as the time.',
      initial: ObjectiveStatus.Pending,
      // Non-terminal, deliberately: read out at the close and unable to touch
      // the ladder (docs/mission-intake.md §5's neutrality guard). Two
      // attendable emitters exist, so the count is the whole of what is there
      // to attend — a placement rather than a risk.
      predicate: { kind: 'attend', count: 2 },
      reading: {
        met: 'Two things were heard in the house this tide and both are entered as times.',
        unmet: 'The house heard less than it heard. The Order keeps no gap.',
      },
    },
  ],

  /**
   * §9's beat table, in its order. Twelve minutes, closing as a conclusion: the
   * tide ends, and nothing in this mission can be lost.
   *
   * Nothing is authored at 00:00. The briefing is the header's and is read
   * before the socket opens, all three rows are revealed from the first tick
   * (no `revealAtTick` on any of them), and the house is already audible —
   * the Chord at 30 and three cells at 4 are placed rather than triggered.
   *
   * The dive at 02:10, the escort going silent at 03:30 and the Choirmaster
   * reaching the room between 04:00 and 05:00 are the bracketed rows of §9:
   * where a competent party tends to be, enforced by nothing.
   */
  beats: [
    {
      atTick: T(2),
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull, aboard',
      text: 'The approach is roofed at twenty-six hundred. I dive at two; dive when I do. Nobody enters the chord above twenty-seven.',
      note: 'The dive is an order somebody gave, and the house hears every one of them. 2,300 to 2,650 m in 7.8 s at SIG 72, heard from 3,596 m and classified from 2,028',
    },
    {
      atTick: T(3),
      kind: 'say',
      speaker: 'Chapter-wright Aldis Fenn, for the house',
      text: 'The Choirmaster is heard. The house is in tune and the Chord was corrected this season. Nothing is struck.',
      note: 'The house acknowledges an arrival it has already heard, which is the courtesy running the correct way round. The wrights corrected the lattice this season regardless of what the Chapter-Master who built it now wants, and Fenn says so without knowing or caring that it is an argument',
    },
    {
      atTick: T(6),
      kind: 'say',
      speaker: 'Voice Ren Kalliso, to nobody in particular',
      text: 'It is in tune. All of it is in tune. I had thought that would be the comfort.',
      note: 'She speaks once in every Chord mission, and this is the only one in which the room she says it in is the point',
    },
    {
      atTick: T(7, 40),
      kind: 'say',
      speaker: 'Chapter-wright Aldis Fenn, for the house',
      text: 'The Chord is sounding. Nobody struck it. The time is entered.',
      note: 'On the tick the window opens. The Order is the register at its most archaic: it enters times and refuses to enter meanings',
    },
    {
      atTick: T(9),
      kind: 'say',
      speaker: 'Chapter-wright Aldis Fenn, for the house',
      text: 'The axis is heard. It is entered as the time. It is not entered as anything.',
      note: 'On the tick the axis’s twenty seconds end. The Directorate would enter the gap as well, and that one-line difference between two liturgies is the only thing this mission says about it',
    },
    {
      atTick: T(10, 30),
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull, from the room',
      text: "I have read the season's case. It is the same hand. — The window is shorter than I wrote to the houses. Enter that I said so here, and enter nothing else from this room.",
      note: 'One sentence about the case, one about the window, and an instruction to enter nothing else. What the Three write is never read out — not here, not in a reading, not anywhere',
    },
    {
      atTick: T(12),
      kind: 'resolve',
      conclusion: true,
      note: 'The tide ends. A conclusion rather than a failure state, so §10’s sixty seconds are not owed — and no beat in this mission is loud, because there is nothing to warn about',
    },
  ],

  /**
   * §9's one conditional beat, and §12's one line that is not on the clock:
   * Fenn, on the first tick the Choirmaster is inside the room, once and
   * nothing else.
   *
   * Keyed on the room's own predicate rather than on a tick, because when she
   * gets there is a fact about how the mission was played. It fires on the
   * first mission pass the condition holds and never again — a beat is an
   * event, and this one cannot fire at tick zero because the tender is 2,089 m
   * from the room when the tide opens.
   */
  conditionalBeats: [
    {
      kind: 'say',
      speaker: 'Chapter-wright Aldis Fenn, for the house',
      text: 'The Choirmaster is in the room. The house keeps the hush.',
      note: 'Fired by the tally, not the clock. No choice group: there is one condition and one line',
      when: { kind: 'extract', role: 'tender', region: 'sealed-room', count: 1 },
    },
  ],

  /**
   * §8's Results and §12's reading at the close, verbatim — Sull's three forms,
   * with the three objective readings and then the two emitters' lines printing
   * beneath whichever one the tide earned.
   *
   * **The middle rung is two different tides and the format gives it one
   * sentence.** `epilogue` is three strings, so *Read, and heard* and *Kept, and
   * unread* share a line and the difference is carried beneath it by the rows'
   * own readings — the arrangement docs/mission-aptitude.md §8 and
   * docs/mission-conclave-chord.md §8 both use, copied deliberately.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      'The case is read and the house was quiet for it. Twelve minutes. You have stood in the First and nothing in it was broken and none of you was safe, and I am told the second half of that is the part that will keep you awake. Good. — You are dry. Stay so until the tide.',
    [MissionOutcome.Partial]:
      'One of the two, and the lines beneath this will say which. A shove in the chord is entered as the time, and the time is all the house enters, and it is enough; a case unread will keep, as it has kept thirty-six years. I am not going to rank a courtesy against a case in the First, of all the houses, and I notice I would like to.',
    [MissionOutcome.Lost]:
      'Twelve minutes in the First and nothing was read and the house was not quiet. I have been in this house before and it was quieter with three people losing their voices in it. — Enter the times. Enter nothing else. Go and be dry.',
  },
};
