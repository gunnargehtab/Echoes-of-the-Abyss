/**
 * The Second Seeding 2 — Thin Water. docs/mission-thin-water.md, transcribed.
 *
 * A data literal in `tend.ts`'s idiom: the document owns the regions, the beat
 * times, the souls, the windows and the water. Where this file and that
 * document disagree, one of them is wrong and the fix says which.
 *
 * §13 predicted that this mission would ask the format for nothing new, and it
 * holds: `escortRadiusM`, `souls`, `MissionEmitter.untilTick`, the `tolerance`
 * conditional beat, `extract`, `survive` and the `creature` beat all shipped
 * before it. What is new is only what the mission spends them on.
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **The water is the antagonist, and it is a region and not a script.** The
 *   Shoulder is Open Water at PF 1.0 (`kellShoulder.ts`), so the 18 the
 *   Commune's economy is built around arrives at a listener as 18 rather than
 *   as 9.9. Nothing here raises the column's SIG. §1's whole argument is that
 *   the water stopped subtracting.
 * - **Leaving costs, because the escort hold makes it cost.** Ten hulls carry
 *   the `tender` role and two carry `escort`, and `escortRadiusM` is what
 *   turns "cover the withdrawal" into "the column stops moving while you do"
 *   (§4). None of §4's four decisions is scripted; all four fall out of that
 *   one rule and the roster below.
 * - **The clock is made of sounds stopping.** Seven pump housings sound from
 *   00:00 and go out one at a time from the east, and the sixty-second
 *   telegraph campaign.md §10 requires is the last of them going quiet at
 *   12:00 against the closure at 13:00 (§7, §8). Nothing announces it, which
 *   is why it is authored as seven `untilTick`s rather than as a `say`.
 * - **The count is hulls and the reading is people.** Ten `souls` figures,
 *   authored unevenly, against a terminal count that does not look at them
 *   (§8). Six hulls out is thirty-one people or fifty, and the count is the
 *   same in both runs.
 *
 * Three authoring decisions this file made that the document leaves open, all
 * of them stated here so a reviewer can overrule them rather than discover
 * them:
 *
 * 1. **The outcome ladder is two terminal rows, not one.** §8 names the
 *    terminal objective as a single `extract` at six and then tabulates three
 *    results — six or more, one to five, none. `runtime.ts` reads the ladder
 *    off the *count* of met terminal objectives, so one terminal row can only
 *    ever produce Complete or Lost and §8's middle rung would be unreachable.
 *    Sorrowgate authors the same shape for the same reason — two `extract`
 *    rows at one and two, "one of the two met is 'nine are out'" — so this
 *    mission authors `crossing` (one home) beneath `column` (six home). The
 *    ask the player is given is still six; the second row is the rung §8's
 *    Results table already describes.
 * 2. **Four of §12's five objective readings are objective texts and the
 *    fifth is a beat.** "That's the third one gone quiet" is a fact about a
 *    tick rather than about a status, so it is the watch's `say` at 10:00,
 *    when the third housing actually stops. The other four are the four
 *    objectives, in §12's order.
 * 3. **The escorts' *met* reading is authored here.** §8 gives that
 *    objective's unmet line — the one the campaign is actually about — and
 *    not its met line, and `reading` is a pair. The line below is written to
 *    §12's register and is the one sentence in this file the document does
 *    not contain.
 *
 * And one correction the document has already taken: §13 used to say the
 * `tolerance` challenge was honest "only because the corridor's escort is the
 * only listener authored on this map". It never could have been — §5 puts two
 * Sentinel Turrets on the tension frame, `spawnStructure` grants `Acoustic`,
 * and `echoLayer.ts`'s listener query is `[Position, Acoustic, Owner, Health]`,
 * so structures listen. Measured against this roster, through PF 1.0, a loaded
 * tender at 18 comes up Bearing at 1,846 m to the Cruiser, 1,663 m to a
 * turret and 1,566 m to a Corvette, so the turrets on the frame out-hear the
 * Corvettes standing off it. What makes the literal honest is not that there
 * is one listener but that every listener on this map is the corridor's — the
 * works party, the escort and the second element are one closure under one
 * order — and §13 now says that instead. `missionThinWater.test.ts` holds it.
 */

import {
  Faction,
  FaunaSpecies,
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  SEEDING_THIN_WATER_HEADER,
  SIM,
  StructureKind,
  UnitKind,
} from '@echoes/shared';

import type { MissionDefinition, MissionBeat, MissionEmitter } from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/** Reserved and empty, as Tend reserves it: no court, no ledger, no array. */
const COURT = 1;
/** The works party — the tension frame, its turrets and the spur's housings (§5). */
const WORKS = 2;
/** The corridor escort — Rell's, standing off the frame in Klaxon posture (§5). */
const CORRIDOR = 3;
/** The second element — the closure, west along the spur (§5, §7). */
const ELEMENT = 4;

/**
 * The challenge's condition, in ticks of cumulative Bearing (§9, §6).
 *
 * §9 fires this beat by exposure rather than by the clock and gives no figure,
 * so the figure is authored here as `cutTicks` and `cutSig` are. Four minutes,
 * for the mission's own reason: four minutes is what the Klaxon telegraph
 * gives the column (§7) and what the watch bought the gardens in Tend, and
 * this is the same four minutes spent from the other side — Rell's procedure
 * running at the book's pace while the column is inside a posted closure.
 *
 * Cumulative rather than continuous, per `tolerance`: a column that goes quiet
 * and moves again has not reset the log, because the log is added up at the
 * end of a shift rather than watched.
 */
const CHALLENGE_TICKS = T(4);

/** Tier 2, and §6 is precise about it: a bearing, blurred, with no unit type. */
const CHALLENGE_TIER = ResolutionTier.Bearing;

/**
 * A pump housing — §7's working machine, struck on its own schedule.
 *
 * The seven differ in period rather than in loudness, which is what "on its
 * own schedule" buys: emitters have no per-emitter phase (`StaticEmitter`
 * strikes on `world.tick % periodTicks`), so seven housings on one period
 * would sound as one machine struck seven times over. Seven periods make a
 * rhythm that drifts, which is what a line of pumps sounds like.
 *
 * Thirty is the taps' figure from docs/mission-asset-recovery.md §6 and it
 * carries here: through PF 1.0 it reaches the watch at 3,427 m and a tender's
 * own HYD 30 at 2,018 m, so the column hears the corridor from 00:00 across
 * most of the shoulder and hears it best through the hulls that are for
 * hearing.
 */
function housing(
  tag: string,
  x: number,
  periodTicks: number,
  untilTick: number,
  note: string
): MissionEmitter {
  return {
    tag,
    x,
    y: 1500,
    depthM: 400,
    sig: 30,
    periodTicks,
    onTicks: 1 * SIM.TICK_HZ,
    untilTick,
    // Hull enough that a stray shell is not the countdown. Nothing in the
    // mission asks the player to shoot a pump and nothing stops them.
    hp: 200,
    note,
  };
}

/**
 * The second element's walk west, as a pair of `move` beats.
 *
 * §7's countdown is the housings' `untilTick`s and nothing else — the sim does
 * not mask an emitter with a hull — so these beats exist to put the element
 * where the silence says it is. A Corvette covers 600 m in seven seconds and
 * then waits, which is why the walk is authored as one beat per housing rather
 * than as one long transit: the pace the player hears is the schedule's, and
 * the hulls keep station with it.
 */
function walkWest(atTick: number, x: number, note: string): MissionBeat[] {
  return [
    { atTick, kind: 'move', tag: 'element-one', x, y: 1400, note },
    { atTick, kind: 'move', tag: 'element-two', x, y: 1550, note: '' },
  ];
}

export const SEEDING_THIN_WATER: MissionDefinition = {
  ...SEEDING_THIN_WATER_HEADER,
  doc: 'docs/mission-thin-water.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Pelagia,
  courtSlot: COURT,
  /**
   * §11 — the map has no weather but other people. The pack on the Kell slope
   * is the mission's one creature and it arrives by authored beat at 13:30.
   */
  fauna: false,
  /** §4 and §9 — 30, a ceiling. Exceeding it costs no hull and fails nothing. */
  sigBudget: 30,
  // No arrayTag and no silence order: nobody lends this column anything, and
  // §3 leaves Silent Running present and unfenced on purpose — the mission's
  // argument is that a tool has a domain, and fencing the button would make
  // the point on the player's behalf.
  silenceCeilingSig: 100,
  debtCapS: 0,
  /**
   * §4 — a tender moves only while an escort is inside this radius, and that
   * one rule is the whole teaching load.
   *
   * The document prices the rule and not the metres, so the figure is Baffle's
   * (450) rather than Sorrowgate's tighter 400, and it is chosen to be about
   * the column's own length: one escort holds one column, and a column split
   * in two needs both escorts, which is §4's second decision made expensive
   * rather than made forbidden.
   */
  escortRadiusM: 450,

  /**
   * §11's table, as the places the mission needs to name. The map paints all
   * seven; these are the ones a predicate, a marker or a reader addresses.
   */
  regions: [
    {
      id: 'kell-face',
      x: 3750,
      y: 1750,
      widthM: 1250,
      heightM: 750,
      note: "Kell Face — the replanted terrace's working face. The spawn, and the last water in which the column's own numbers are true",
    },
    {
      id: 'grid-spur',
      x: 0,
      y: 1250,
      widthM: 5000,
      heightM: 500,
      note: 'The Grid Spur — the closed corridor. It crosses the map east to west and getting across it is the mission',
    },
    {
      id: 'vent-under-run',
      x: 1750,
      y: 1750,
      widthM: 1000,
      heightM: 750,
      note: "The Vent Under-run — the map's one mask, at PF 0.45, lying below the corridor rather than beside it. The quiet way is the deep way and it is longer",
    },
    {
      id: 'kell-slope',
      x: 0,
      y: 2500,
      widthM: 5000,
      heightM: 500,
      note: "The Kell Slope — the shoulder's southern edge. Trench paint at Shelf's edge, and where the pack comes up from",
    },
    {
      id: 'marr-approach',
      x: 0,
      y: 250,
      widthM: 2000,
      heightM: 750,
      note: 'The Marr Approach — the first kelp on the west side, and the first water where 18 means 18 again',
    },
    {
      id: 'holdfast-gate',
      x: 250,
      y: 0,
      widthM: 1000,
      heightM: 250,
      note: 'The Holdfast Gate — the extraction region. The count is taken here',
    },
  ],

  /**
   * §11 — two markers, and no more. §8 declines to grade the watch, so
   * nothing points east.
   */
  markers: [
    {
      id: 'holdfast-gate',
      label: 'The Holdfast Gate. The count is taken here.',
      x: 750,
      y: 125,
      radiusM: 400,
    },
    {
      id: 'crossing',
      label: 'The short way home crosses the corridor.',
      x: 750,
      y: 1250,
      radiusM: 500,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Pelagia,
      note: 'The column Marr sent to Kell for the early bloom: ten loaded tenders, the watch, and the whole of what the Commune fields as armament (§2, §3)',
      units: [
        /**
         * §3's souls, in the document's order: 4, 6, 9, 5, 7, 3, 11, 6, 8, 9 —
         * sixty-eight people in ten uneven parcels, crewed by household rather
         * than by berth. Nothing in the HUD ranks them and nothing sorts them,
         * and §8's whole argument rests on that: six hulls out is thirty-one
         * people or it is fifty, and which it is, is the order of march.
         *
         * PR-1 against the roster's 2, as Tend authors it: §3 rates the
         * Commune's freight for the Shelf and nowhere below it, which is what
         * makes the vent under-run at 620 m a route with a price rather than a
         * free mask.
         */
        {
          tag: 'tender-one',
          kind: UnitKind.Harvester,
          x: 4300,
          y: 2050,
          depthM: 260,
          role: 'tender',
          pressureRating: 1,
          souls: 4,
          note: 'The bloom aboard — seed stock for a turning the count has not closed on',
        },
        {
          tag: 'tender-two',
          kind: UnitKind.Harvester,
          x: 4400,
          y: 2050,
          depthM: 260,
          role: 'tender',
          pressureRating: 1,
          souls: 6,
          note: '',
        },
        {
          tag: 'tender-three',
          kind: UnitKind.Harvester,
          x: 4500,
          y: 2050,
          depthM: 260,
          role: 'tender',
          pressureRating: 1,
          souls: 9,
          note: '',
        },
        {
          tag: 'tender-four',
          kind: UnitKind.Harvester,
          x: 4600,
          y: 2050,
          depthM: 260,
          role: 'tender',
          pressureRating: 1,
          souls: 5,
          note: '',
        },
        {
          tag: 'tender-five',
          kind: UnitKind.Harvester,
          x: 4700,
          y: 2050,
          depthM: 260,
          role: 'tender',
          pressureRating: 1,
          souls: 7,
          note: '',
        },
        {
          tag: 'tender-six',
          kind: UnitKind.Harvester,
          x: 4300,
          y: 2200,
          depthM: 260,
          role: 'tender',
          pressureRating: 1,
          souls: 3,
          note: 'The smallest crew in the column, and nothing says so anywhere the player can read it',
        },
        {
          tag: 'tender-seven',
          kind: UnitKind.Harvester,
          x: 4400,
          y: 2200,
          depthM: 260,
          role: 'tender',
          pressureRating: 1,
          souls: 11,
          note: 'Eleven. A player who wants to know which hull this is has to have read the load-out (§3)',
        },
        {
          tag: 'tender-eight',
          kind: UnitKind.Harvester,
          x: 4500,
          y: 2200,
          depthM: 260,
          role: 'tender',
          pressureRating: 1,
          souls: 6,
          note: '',
        },
        {
          tag: 'tender-nine',
          kind: UnitKind.Harvester,
          x: 4600,
          y: 2200,
          depthM: 260,
          role: 'tender',
          pressureRating: 1,
          souls: 8,
          note: '',
        },
        {
          tag: 'tender-ten',
          kind: UnitKind.Harvester,
          x: 4700,
          y: 2200,
          depthM: 260,
          role: 'tender',
          pressureRating: 1,
          souls: 9,
          note: '',
        },
        /**
         * The watch — HYD 70, and no role at all.
         *
         * §3 gives this mission two role words, `tender` and `escort`, and the
         * watch is neither: giving it `escort` would let two Light Scouts
         * satisfy the hold and delete §4, and giving it `tender` would put it
         * in the count. §8 declines to grade it in either direction, so it
         * appears in no objective — two hulls that can be somewhere loud
         * without being the reason it is loud, and nothing suggests spending
         * them.
         */
        {
          tag: 'watch-one',
          kind: UnitKind.LightScout,
          x: 4425,
          y: 1900,
          depthM: 260,
          pressureRating: 1,
          souls: 2,
          note: "The plateau's ears, doing the one job they have never had to do at speed",
        },
        {
          tag: 'watch-two',
          kind: UnitKind.LightScout,
          x: 4425,
          y: 2350,
          depthM: 260,
          pressureRating: 1,
          souls: 2,
          note: '',
        },
        /**
         * The two Commune-grown escorts (§3). Armed, and the only hulls in the
         * campaign so far that the Commune has grown a weapon onto — §6's
         * arithmetic is why they are not enough, and it is the roster's
         * arithmetic rather than a scripted invulnerability.
         *
         * Placed with the column rather than forward of it: §4's first
         * decision is how far forward to put them, and a literal that had
         * already made it would have answered the mission's own question.
         */
        {
          tag: 'escort-one',
          kind: UnitKind.Corvette,
          x: 4150,
          y: 2050,
          depthM: 260,
          role: 'escort',
          armed: true,
          pressureRating: 2,
          souls: 4,
          note: "The Veil's whole answer to a fight it did not choose",
        },
        {
          tag: 'escort-two',
          kind: UnitKind.Corvette,
          x: 4150,
          y: 2200,
          depthM: 260,
          role: 'escort',
          armed: true,
          pressureRating: 2,
          souls: 4,
          note: '',
        },
      ],
    },

    {
      slot: WORKS,
      faction: Faction.Bathyarch,
      note: 'The works party — a line re-tensioning under a filed order, the least interesting document the concern produces in a year (§6). Loud, stationary, and not hunting anybody',
      units: [
        {
          tag: 'frame-rig',
          kind: UnitKind.Harvester,
          x: 2000,
          y: 1500,
          depthM: 380,
          note: 'The tender rig on the tension frame. Weapons cold: the works party does not fight and an armed hull in this simulation defends itself',
        },
      ],
      /**
       * The two Sentinel Turrets §5 stands on the frame — and the reason §13's
       * caveat needed correcting. A turret carries HYD 55 and `spawnStructure`
       * grants it `Acoustic`, so it is a listener, and at PF 1.0 it holds a
       * loaded tender at Bearing out to 1,663 m against a Corvette's 1,566 m.
       * The frame hears the column before the hulls standing off it do.
       */
      structures: [
        {
          tag: 'frame-turret-east',
          kind: StructureKind.SentinelTurret,
          x: 2150,
          y: 1500,
          depthM: 380,
          note: 'Posted with the closure, as a closure is posted. It listens all mission and fires only at what comes to it',
        },
        {
          tag: 'frame-turret-west',
          kind: StructureKind.SentinelTurret,
          x: 1850,
          y: 1500,
          depthM: 380,
          note: '',
        },
      ],
      /**
       * §7's seven pump housings, east to west along the spur at 600 m
       * intervals, going quiet from 09:00 at thirty-second steps.
       *
       * The last one — `housing-seven`, at 1,200 m, the last before the
       * crossing — stops at 12:00 against the closure at 13:00, which is
       * campaign.md §10's sixty seconds paid by subtraction rather than by an
       * alarm. Nothing announces it and nothing labels it.
       */
      emitters: [
        housing(
          'housing-one',
          4800,
          4 * SIM.TICK_HZ,
          T(9),
          'The eastmost housing, nearest the face. The first thing the column stops hearing'
        ),
        housing('housing-two', 4200, 5 * SIM.TICK_HZ, T(9, 30), ''),
        housing(
          'housing-three',
          3600,
          6 * SIM.TICK_HZ,
          T(10),
          'The third. The watch says this one out loud, once, and says nothing about the four after it'
        ),
        housing('housing-four', 3000, 4 * SIM.TICK_HZ, T(10, 30), ''),
        housing('housing-five', 2400, 5 * SIM.TICK_HZ, T(11), ''),
        housing('housing-six', 1800, 7 * SIM.TICK_HZ, T(11, 30), ''),
        housing(
          'housing-seven',
          1200,
          6 * SIM.TICK_HZ,
          T(12),
          'The last housing before the crossing. Sixty seconds, and that is the whole warning'
        ),
      ],
    },

    {
      slot: CORRIDOR,
      faction: Faction.Bathyarch,
      note: "Corridor Warden Anse Rell's escort, standing off the frame in Klaxon posture — audible for four minutes before it is anywhere, which is the Consortium's stated weakness handed to the player whole (§5, §7)",
      units: [
        {
          tag: 'corridor-cruiser',
          kind: UnitKind.Cruiser,
          x: 2100,
          y: 450,
          depthM: 300,
          armed: true,
          note: 'Twelve hundred hull and heavy sensors, at 55 idle and 65 under way. §6: nothing about it is survivable and nothing about it is scripted',
        },
        {
          tag: 'corridor-corvette-one',
          kind: UnitKind.Corvette,
          x: 2300,
          y: 500,
          depthM: 300,
          armed: true,
          note: 'One of the two that commit at 06:30, by the book, at the book’s pace',
        },
        {
          tag: 'corridor-corvette-two',
          kind: UnitKind.Corvette,
          x: 2500,
          y: 450,
          depthM: 300,
          armed: true,
          note: '',
        },
      ],
    },

    {
      slot: ELEMENT,
      faction: Faction.Bathyarch,
      note: 'The second element — never engaged, and the reason the mission ends (§5). It is heard only as the housings it passes going quiet',
      /**
       * Standing north of the spur, mid-map, and the position is measured
       * rather than placed: the element used to wait at the north-east corner,
       * 1,945 m from the muster's western Corvette, and an idle Corvette at 28
       * stands at Bearing to another Corvette's HYD 50 out to 2,065 m through
       * PF 1.0 — so once the Echo pass resolved *for* this party (#323) it held
       * the column at Tier 2 from the first pass, and §9's "a column that
       * never moves is never challenged" was false at rest. From here every
       * hull of the column is 2,250 m or further off, the muster reads Contact
       * to the corridor and nothing better to anybody, and the 07:30 drop onto
       * the spur's east end is a 2,350 m transit — twenty-eight seconds for a
       * Corvette, against the ninety before the first housing goes quiet.
       */
      units: [
        {
          tag: 'element-one',
          kind: UnitKind.Corvette,
          x: 2800,
          y: 250,
          depthM: 300,
          armed: true,
          note: 'Standing north of the spur until the closure is called, out of the column’s water and out of its hearing',
        },
        {
          tag: 'element-two',
          kind: UnitKind.Corvette,
          x: 2650,
          y: 200,
          depthM: 300,
          armed: true,
          note: '',
        },
      ],
    },
  ],

  /**
   * §3's "What the column does not carry", as dead affordances with the
   * column's own reasons shown.
   *
   * Silent Running is deliberately absent from this list. §3 is emphatic:
   * the button works, it works perfectly, and it is simply not what is being
   * asked — a column that goes silent on the shoulder is a column that is
   * still on the shoulder four minutes later. Locking it would make the
   * mission's point on the player's behalf.
   */
  locks: [
    {
      ability: 'activeSonar',
      reason: 'never owned — and today it is the button that would end the mission it is about',
    },
    { ability: 'construction', reason: 'nothing to build with, and nothing to build it on' },
  ],

  /**
   * §12's "Objective readings, in play", verbatim and in its order. The
   * Commune cannot command, so its objectives arrive as statements of what has
   * already been agreed, and the number is in the text from tick zero.
   */
  objectives: [
    {
      id: 'column',
      text: 'Six of you home would be the column. We agreed that at the load-out.',
      initial: ObjectiveStatus.Pending,
      markerId: 'holdfast-gate',
      // §8 — no `loaded` flag and no `deliver` row. A tender that arrives
      // empty is a tender that arrived, and what the column banked is a fact
      // the close may state and is never a rung on the ladder.
      terminal: true,
      predicate: { kind: 'extract', role: 'tender', region: 'holdfast-gate', count: 6 },
    },
    {
      id: 'crossing',
      text: "The line above Kell is closed and we don't have the paper they want.",
      initial: ObjectiveStatus.Pending,
      markerId: 'crossing',
      // The floor of §8's Results table — "Some of the column: one to five" —
      // and terminal for the reason the file comment gives: the runtime reads
      // the ladder off how many terminal rows were met, so the middle rung
      // needs a row of its own. Met the moment one hull is through a corridor
      // the column has no answer for.
      terminal: true,
      predicate: { kind: 'extract', role: 'tender', region: 'holdfast-gate', count: 1 },
    },
    {
      id: 'all-ten',
      text: "We'd like all ten. We're saying it because it's true, not because it's the number.",
      initial: ObjectiveStatus.Pending,
      markerId: 'holdfast-gate',
      // §8 — revealed at 00:00 and unmet in almost every run. Non-terminal:
      // it prints beneath whichever row the count earned and never decides it.
      predicate: { kind: 'extract', role: 'tender', region: 'holdfast-gate', count: 10 },
      reading: {
        met: "Ten went and ten came back and that has not happened to a column in thin water in living memory. We'd like you not to conclude anything from it.",
        unmet:
          'The gate counted what it counted. The rest of the count is a list of names and the list is read at the tide, not here.',
      },
    },
    {
      id: 'escorts',
      text: "The escorts are yours to spend. We'd rather you had to.",
      initial: ObjectiveStatus.Pending,
      predicate: { kind: 'survive', role: 'escort', count: 2 },
      reading: {
        // Authored here rather than transcribed — §8 gives this objective its
        // unmet line only, and states plainly that the unmet one is the one the
        // campaign is actually about.
        met: 'Both of them came home and we are not going to make a thing of it tonight. Somebody will want to know how, and the honest answer is that you did not have to find out.',
        unmet:
          'We grew two hulls that could shoot and we spent them both in eleven minutes buying a crossing. Sefa is going to say what that means and he’s going to be right, and we would like a night before he says it.',
      },
    },
  ],

  /**
   * §9's beat table, in its order. Fourteen minutes, at the short end of
   * campaign.md §10's band because the mission is one continuous withdrawal.
   *
   * The corridor's movements are authored transits rather than patrol AI, for
   * the standing reason (mission-sorrowgate.md §9): a mission's beats happen at
   * the time the document says they happen. The works order is why; these are
   * when.
   */
  beats: [
    // 01:30 — the only time the number is said before the close, and it is
    // said as a fact about people rather than as a target.
    {
      atTick: T(1, 30),
      kind: 'say',
      speaker: 'Bloomwright Idris Kell',
      text: "Ten hulls. Sixty-eight aboard, and I've got them by household, not by berth, so if anybody asks you later how many that is you say sixty-eight and you don't round it.",
      note: 'Read, not heard — the standing status of the say channel',
    },

    // 02:30 — the column clears the last kelp, and the exposure readout says
    // the same thing in a number a beat later (systems-echo.md §9).
    {
      atTick: T(2, 30),
      kind: 'say',
      speaker: 'The watch',
      text: "That's the last of the green. You'll want to know that the number on your hull just went up without you doing anything. It didn't. The water did.",
      note: 'The mission, in two sentences, four minutes before anything happens',
    },

    // 04:00 — the works order. The corridor closes on the frame and arrives as
    // noise: a Cruiser under way is 65 SIG, which the watch holds at bearing
    // from four kilometres, and that is the whole of the Klaxon telegraph.
    {
      atTick: T(4),
      kind: 'move',
      tag: 'corridor-cruiser',
      x: 2000,
      y: 1050,
      note: 'The escort takes station off the tension frame. Nothing about this is aimed at the column yet',
    },
    { atTick: T(4), kind: 'move', tag: 'corridor-corvette-one', x: 1850, y: 1100, note: '' },
    { atTick: T(4), kind: 'move', tag: 'corridor-corvette-two', x: 2150, y: 1100, note: '' },

    // 06:30 — the first pass. Two Corvettes cross the spur southward, and the
    // lesson lands as a UI event: the escorts answer and ten tenders stop
    // moving, because that is what the escort hold does (§4).
    {
      atTick: T(6, 30),
      kind: 'move',
      tag: 'corridor-corvette-one',
      x: 2400,
      y: 1950,
      note: 'The first pass — a procedure, not a hunt, and indistinguishable from one at this range',
    },
    { atTick: T(6, 30), kind: 'move', tag: 'corridor-corvette-two', x: 2700, y: 2050, note: '' },

    // 07:00 — Rell, once, after the first pass (§12). Three of his four
    // speeches are procedure and this is the coldest of them.
    {
      atTick: T(7),
      kind: 'say',
      speaker: 'Corridor Warden Anse Rell',
      text: 'Log it as an unidentified transit that declined to identify. I want the time on it. I want the tape.',
      note: 'Nobody is stupid and nobody is cruel: this is the sentence that kills them',
    },

    // 07:30 — the second element drops onto the spur's east end, ninety
    // seconds before the first housing goes quiet behind it.
    ...walkWest(
      T(7, 30),
      4850,
      'Onto the pipe at the east end. From here it walks, and the walking is all the player ever hears of it'
    ),

    // 08:00 — the Cruiser comes up the spur. §6's arithmetic, arriving.
    {
      atTick: T(8),
      kind: 'move',
      tag: 'corridor-cruiser',
      x: 1800,
      y: 1500,
      note: 'Eleven hundred metres of hull between the column and the short way home',
    },

    // 09:00–12:00 — the countdown. The housings' own `untilTick`s are the
    // event; these beats keep the element where the silence says it is.
    ...walkWest(T(9), 4200, 'The first housing has just stopped. Nothing announces it'),
    ...walkWest(T(9, 30), 3600, ''),
    ...walkWest(T(10), 3000, ''),
    {
      atTick: T(10),
      kind: 'say',
      speaker: 'The watch',
      text: "That's the third one gone quiet. Somebody's walking west along the pipe.",
      note: '§12 — the watch says the third one and says nothing about the four after it. A player who spent Tend learning that quiet is a signal has already worked out the rest',
    },
    ...walkWest(T(10, 30), 2400, ''),
    ...walkWest(T(11), 1800, ''),
    ...walkWest(T(11, 30), 1200, ''),
    ...walkWest(T(12), 600, 'Past the last housing. Sixty seconds'),

    // 13:00 — the corridor closes. Any tender still south of the spur is cut
    // off, and its share of the terminal count fails by simply not arriving:
    // §8 needs no predicate for this, because a hull that cannot reach the
    // gate does not reach the gate.
    {
      atTick: T(13),
      kind: 'say',
      speaker: 'Corridor Warden Anse Rell',
      text: 'The corridor is closed and the order is discharged. Whatever entered it is a matter for the registry now, and the registry is patient.',
      note: "Rell's fourth speech and his last. He never learns what he closed the line on",
    },
    { atTick: T(13), kind: 'move', tag: 'element-one', x: 300, y: 1400, note: 'The west end' },
    { atTick: T(13), kind: 'move', tag: 'element-two', x: 300, y: 1550, note: '' },
    {
      atTick: T(13),
      kind: 'move',
      tag: 'corridor-cruiser',
      x: 2600,
      y: 1500,
      note: 'The east end. A corridor with a heavy at each end is what §8 means by cut off',
    },

    // 13:30 — the pack comes up the Kell slope for the noise, and stays for
    // what the noise left (bestiary.md §4).
    //
    // `loud: false` on purpose. The flag exists to be the left-hand side of
    // §10's telegraph measurement, and this beat is not a precursor to
    // anything: the failure this mission telegraphs is the closure at 13:00,
    // and its warning is `housing-seven` going quiet at 12:00. The pack is
    // what the shoulder sounds like afterwards.
    {
      atTick: T(13, 30),
      kind: 'creature',
      tag: 'pack-a',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 1000, y: 2750, depthM: 880 },
      driveTo: { x: 1000, y: 2550 },
      untilTick: T(14),
      loud: false,
      note: 'The audience. Drawn up the slope by the exchange, arriving after it',
    },
    {
      atTick: T(13, 30),
      kind: 'creature',
      tag: 'pack-b',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 850, y: 2800, depthM: 880 },
      driveTo: { x: 900, y: 2600 },
      untilTick: T(14),
      loud: false,
      note: '',
    },

    // 14:00 — the count. Marr reads it as the epilogue; Anholt is already
    // speaking, and it is the first time in the campaign he is right (§12).
    {
      atTick: T(14),
      kind: 'say',
      speaker: 'Bloomwright Sefa Anholt',
      text: "I asked for ten. I'd like that in the record, because Ysolde will try to put it in hers. Here's what I'm going to say at the turning and I'm saying it here first, once, quietly, out of respect for the count. We were thin out there. We're thin everywhere. We have been thin for two hundred years and we've called it an arrangement, and today it cost us people in open water because we had nothing to put between them and a man doing his job by the book. I'm not asking anybody to agree tonight. I'm saying I'll ask.",
      note: 'A future imposition, flagged in advance — as close to the imperative mood as the register can come, and it costs him saying it in front of the dead',
    },
    /**
     * A conclusion, not a timer. §8: "The mission is not failed on a timer and
     * does not end on one" — the closure happens at 13:00 and is audible from
     * 12:00, and 14:00 is the count being read out. All three of §8's Results
     * are readings, the empty one included, so there is no failure state here
     * for campaign.md §10's telegraph to be measured against.
     *
     * §10 is still paid, and `missionThinWater.test.ts` measures it where this
     * mission actually spends it: `housing-seven` falls silent sixty seconds
     * before the closure the player is being warned about.
     */
    { atTick: T(14), kind: 'resolve', conclusion: true, note: 'The count is read as it stands' },
  ],

  /**
   * The challenge — §9's one beat fired by exposure rather than by the clock.
   *
   * §6: Rell has a bearing inside a posted closure and no idea what it is, and
   * procedure for an unidentified transit is to ask for an asset number that a
   * plateau's freight has never had. The condition is the column's own
   * exposure tally and not a trigger volume, so a column that stays outside
   * the corridor's ears is never challenged and one that crosses early is
   * challenged early.
   */
  conditionalBeats: [
    {
      kind: 'say',
      speaker: 'Corridor Warden Anse Rell, on the open channel',
      text: 'Bearing zero-four-one is inside a posted closure. Transit will state an asset number and a charter reference. This is not a threat and it is not a negotiation; it is the second time of asking, and there is a third.',
      note: 'Four minutes of standing at Bearing in the corridor’s ears. The answer the column gives is a Commune answer, and Rell receives it as a non-answer because in his register it is one',
      when: { kind: 'tolerance', ticks: CHALLENGE_TICKS, tier: CHALLENGE_TIER },
    },
  ],

  /**
   * §8's Results, verbatim — Marr's three readings, with the two objective
   * readings above printing beneath whichever row the run earned.
   *
   * `Partial` is a rung and not a soft failure: "This is a result. We're not
   * going to let anybody call it a failure and we're not going to let anybody
   * call it enough."
   */
  epilogue: {
    [MissionOutcome.Complete]:
      "Six was the number and you brought us more than the number. We're going to say the count out loud tonight, all of it, the ones who came back and the ones who didn't, because a plateau that only reads the good half of a count has started owning things.",
    [MissionOutcome.Partial]:
      "Fewer than we agreed. We agreed the number in daylight so that nobody had to be the one who said it out here, and it still fell to somebody, and we're sorry it was you. This is a result. We're not going to let anybody call it a failure and we're not going to let anybody call it enough.",
    [MissionOutcome.Lost]:
      "The count is nobody. We're not turning that tonight. We'd like somebody to sit with the names until morning and then we'll begin.",
  },
};
