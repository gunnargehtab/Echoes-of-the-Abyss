/**
 * The Attending 7 — First Arrival. docs/mission-first-arrival.md, transcribed.
 *
 * A data literal in `conclaveAttending.ts`' idiom, on `prospect.ts`' ground:
 * the document owns the forces, the water, the beats, the numbers and the
 * text. Where this file and that document disagree, one of them is wrong and
 * the fix says which — and the one place they do is recorded at the foot of
 * this comment rather than authored into the table.
 *
 * The campaign's ending, and the first mission in it that Korrin closes
 * without spending her one sentence. Four things make it the shape it is, and
 * all four are data:
 *
 * - **The tide runs its length** (§9, §13). `runsItsLength`, for Intake's and
 *   Conclave's reason spent a third time and with the arithmetic stated here
 *   because it is the row that would silently eat the ending: `the-watch` is
 *   `survive` at four of six and is therefore Met from tick zero, and
 *   `the-rim` is revealed at 19:00 over a cohort that has been standing on the
 *   terraces since 04:00. Both terminal rows land Met on that one pass, the
 *   court's default rule resolves there, and 19:30, 20:30 and 21:00 — the
 *   withdrawal, the count, and the silence the whole campaign has been walking
 *   toward — never happen. Omitted is the default, and most literals omit it.
 * - **The rim is held by standing on it, and the hold is read late** (§8).
 *   `extract` latches Met the first pass it is satisfied and the runtime never
 *   re-derives a Met non-standing row (`predicates.ts`, `isStanding`), so a
 *   hold read *at the tide's turn* has to be revealed at the tick the close
 *   asks the question. `the-rim` carries `revealAtTick` T(19) and the stalls'
 *   beat shares that tick, because a reveal needs a beat under it
 *   (`missions.test.ts`) — Intake's roll idiom, at its third spender.
 * - **The count is the lip's own, and the loudest sound on the rim cannot be
 *   banked** (§8, §13). `attend` counts emitters carrying a `reading`, so the
 *   Order's twenty seconds at SIG 80 is authored as an emitter *without* one:
 *   audible from 7,143 m in open water, and uncountable. The two attendants
 *   carry readings and nothing else does.
 * - **Twelve PR-2 hulls at 3,000 m** (§13). `missions.test.ts` reads
 *   `unit.pressureRating ?? statsFor(kind).pressureRating` rather than
 *   `effectivePressureRating`, so the Directorate's PR-3 baseline does not
 *   rescue a Chorister authored on the lip. Every one of the twelve carries
 *   `pressureRating: 3`, as The Dome, Shallow, Trench Awakening and Conclave
 *   each had to author it before this.
 *
 * Three things this literal deliberately does not build, each named by §13 as
 * a decision rather than an omission:
 *
 * - **The Order's read is a sound, not a sounding.** `MissionSounding` is
 *   player-party only (`missions.test.ts` holds its `tag` to a player hull),
 *   so a scripted hull's read cannot be authored as the act. It is authored as
 *   the sound the act makes: an emitter at the Cruiser's own station, SIG 80,
 *   sustained through a twenty-second `fromTick`/`untilTick` window. Every
 *   consequence the mission wants from it is acoustic; what is lost is that
 *   the engine does not know the Order read anything, and no predicate could
 *   ask.
 * - **The refusal at 18:00.** Nothing in the union reads what a player
 *   declined to do, and §13 declines to ask for it. Adze's `say` beat and the
 *   epilogue clause are where a refusal belongs anyway.
 * - **A depth on the hold.** §8 wants "on the terraces *and* under 2,600 m";
 *   `extract` reads a rectangle. The ground lifts every hull that crosses
 *   (`holdAgainstGround`), so the two populations differ only for a player who
 *   ordered depth on purpose — which is the one shove the mission is made of
 *   and is priced in the silence ledger instead.
 *
 * **The riser is Prospect's literal verbatim, and its `driveTo` carries no
 * `depthM` on purpose** (§13). With none, the runtime holds the species' own
 * working depth as home, so the Sounder climbs at `DRIFT.VERTICAL_SPEED_MPS`
 * as it travels: 1,200 m at 30 m/s is forty seconds, forty seconds at 12 m/s
 * is 480 m of lift, and 3,050 − 480 is the ~2,570 m §7 says it arrives over the
 * terraces at. Intake's beat needed a depth because its transit had to enter
 * water its species could not; this one is inherited rather than corrected.
 *
 * **Two errors of reading, found by the transcription, repaired in the document
 * since, and never authored here** — §13's own two rows.
 *
 * 1. §7 read the Order's party arriving as "contact to a submersible from
 *    6,274 m and Track from 3,538". 6,274 m is the Contact range for a
 *    Cruiser's 65 cone-on against HYD 85 through open water and was right;
 *    3,538 m is the *Classification* range at the same figures
 *    (`TIER_THRESHOLD_MULTIPLIER` 2.5), and Track — the 4× multiple — stands at
 *    2,638 m. The tier label was the error and the distance was not, so nothing
 *    in this literal ever moved: the beat table, the seats and the station are
 *    identical at either tier. §7 now reads a classification at 3,538 and Track
 *    only inside 2,638.
 * 2. §1 stood the terraces "400 m higher than the lip it walked in on, because
 *    the terrace floor is 2,600 m against the lip's 3,100", and §4 turns the
 *    four hundred into 26.7 free seconds of ascent. The four hundred was right
 *    and the *because* was not: those two floors differ by five hundred, and
 *    the climb is four hundred only because §11's own rule holds — `DEPTH.MAX_M`
 *    is 3,000, no hull is ever ordered onto the lip's last hundred metres, and
 *    3,000 to 2,600 is the distance a hull actually travels. §1 now derives the
 *    four hundred from `DEPTH.MAX_M` and the bench, and every second §4 takes
 *    off it is unchanged.
 *
 * `missionFirstArrival.test.ts` pins all four tier ranges, and the five hundred
 * and the four hundred side by side, so neither reading can drift back.
 */

import {
  ATTENDING_FIRST_ARRIVAL_HEADER,
  DEPTH,
  Faction,
  FaunaSpecies,
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  SIM,
  StructureKind,
  UnitKind,
} from '@echoes/shared';

import type { MissionBeat, MissionDefinition, MissionEmitter, MissionUnit } from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/**
 * Reserved and empty, exactly as `prospect.ts` and `secondSeeding.ts` reserve
 * it on this map — and here it has the job Conclave's does: it is where the
 * dome goes while the debt stands, which is the whole of how the silence order
 * withdraws an aura in one write (§6).
 */
const COURT = 1;
/** The plateaus — the charting pair and the bed they left on the western lip (§5). */
const PLATEAUS = 2;
/** The Order — the reconnaissance and the party, one navy and one slot (§2, §5). */
const ORDER = 3;
/** The rim's attendants — a party whose only assets in the water are sounds (§5). */
const ATTENDANTS = 4;

/**
 * §11 — the column's water, and the deepest order `match.ts` accepts. The
 * lip's floor is 3,100, so every Directorate hull on this rim stands a hundred
 * metres off rock at the bottom of the orderable column and no deeper: "the
 * Directorate stands at the edge of the thing it attends and does not go in".
 */
const LIP_DEPTH_M = DEPTH.MAX_M;
/** §11 — the pair's seat over the terraces' 2,600 floor. Prospect's own. */
const TERRACE_DEPTH_M = 2100;
/** §11 — the reconnaissance over the slopes' 2,200: Mid-Water, and a Corvette is PR-2. */
const RECON_DEPTH_M = 1750;
/** §11 — the Order's staging seats over the staging's 1,500 floor. */
const STAGING_DEPTH_M = 1400;
/**
 * §11 — the attendants, verbatim from Prospect: an emitter may sit at 3,050
 * over a floor of 3,100 where a hull the runtime orders may not, because
 * emitters are not hulls and `DEPTH.MAX_M` does not bind them.
 */
const ATTENDANT_DEPTH_M = 3050;

/** §4, §6, §9, §12 — the order the galleries wrote, carried to the rim. */
const SILENCE_CEILING_SIG = 25;
/** §8, §12 — "Eight of twelve is a hold. The Undermarshalcy does not round up." */
const HOLD = 8;
/** §8, §12 — "Six attend the lip. Four is a watch." */
const WATCH = 4;

/** §7, §9 — the Order's twenty seconds on the sixth face, as ticks. */
const SOUNDING_WINDOW = T(0, 20);
/** §7, §9 — the loudness of it. The trade standard, from the other side of the quarrel. */
const SOUNDING_SIG = 80;

/**
 * §7, §11 — the attendants' own durability, Prospect's figure unchanged.
 * Nothing on this rim fires and the column's guns are locked, so it is a
 * number that exists so the type has one.
 */
const RETURN_HP = 5000;

/**
 * One of the cohort — a Chorister on the eastern lip, and the hull the whole
 * mission is an argument about.
 *
 * `pressureRating: 3` is the mission's fact and never the roster's: `units.ts`
 * rates the hull PR-2 so that a PR-3 hull at 30 Nodules cannot sell the
 * Abyssal band to everybody, and the Directorate's baseline lifts it for
 * nothing at runtime — but `missions.test.ts` reads the authored rating, and a
 * PR-2 Chorister seated at 3,000 m fails it. §13 records this as the fifth
 * mission in the campaign to field the hull and the fourth to author the refit.
 *
 * No `armed` flag: every navy on this rim is weapons-cold and the column's
 * guns are locked besides (§2, §3).
 */
const chorister = (ordinal: string, x: number, y: number, note: string): MissionUnit => ({
  tag: `cohort-${ordinal}`,
  kind: UnitKind.Chorister,
  x,
  y,
  depthM: LIP_DEPTH_M,
  role: 'cohort',
  pressureRating: 3,
  note,
});

/**
 * One of the watch — an Abyssal Submersible on the lip.
 *
 * PR-3 on the roster and needing no refit (§3), which is why this helper
 * authors none: the refit above is a fact about the cheap hull, and stating it
 * here as well would make the two look like one rule. Ninety-five metres of
 * hull, which is `DRIFT.TRANSIT_MIN_HULL_M` exactly — the mission's one lethal
 * thing can take only the half of the force the second objective counts (§8).
 */
const watchHull = (tag: string, x: number, y: number, note: string): MissionUnit => ({
  tag,
  kind: UnitKind.AbyssalSubmersible,
  x,
  y,
  depthM: LIP_DEPTH_M,
  role: 'watch',
  note,
});

/**
 * §3, §9 — the column arrives quiet and is not handed the toggle. Eighteen of
 * these at tick zero, one per hull.
 *
 * A silent Chorister runs at 4.3 and a silent Submersible at 4.8, both of them
 * the hull's own figure through `SILENT_RUNNING`'s 3–8 band rather than the
 * band's ceiling — §13's most mis-derivable row, and the reason every silent
 * range in §1, §6 and §7 is what it is.
 */
const silent = (tag: string, note: string): MissionBeat => ({
  atTick: 0,
  kind: 'silent',
  tag,
  active: true,
  note,
});

/**
 * One of the two returns on the lip — Prospect's §5, unchanged in place,
 * loudness and rhythm, on the tide after.
 *
 * The readings are the pair the close enters for it. §12 authors one of each
 * form — the western *entered* and the eastern *gap* — and the format needs
 * two pairs, so the missing halves are written in the same two forms and no
 * others: nothing here says what a return is, and the gap is entered too.
 */
const attendant = (
  tag: string,
  bearing: string,
  x: number,
  y: number,
  periodS: number,
  onS: number,
  note: string
): MissionEmitter => ({
  tag,
  x,
  y,
  depthM: ATTENDANT_DEPTH_M,
  // §1, §7 — twenty-four, which is also a Chorister's cruise. The rim and the
  // column are exactly as loud as each other and neither remarks on it.
  sig: 24,
  periodTicks: periodS * SIM.TICK_HZ,
  onTicks: onS * SIM.TICK_HZ,
  hp: RETURN_HP,
  reading: {
    entered: `Entered: the ${bearing} return, bearing and period. It is not said what it is.`,
    gap: `Not entered: the ${bearing} return. The gap is entered too.`,
  },
  note,
});

export const ATTENDING_FIRST_ARRIVAL: MissionDefinition = {
  ...ATTENDING_FIRST_ARRIVAL_HEADER,
  doc: 'docs/mission-first-arrival.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Directorate,
  courtSlot: COURT,
  /** §11 — fauna are off; the one creature is the riser, and it is a beat. */
  fauna: false,
  /** §9, §13 — the tide turns at 21:00 whatever the count stands at. See the header. */
  runsItsLength: true,
  /**
   * §4 — twenty-four: a Chorister's cruise, and for the third time in this
   * campaign a description rather than a ceiling. It is what the column sounds
   * like doing the only thing it is asked to do, and it is one under the
   * silence order the galleries wrote for it, which is not an accident and is
   * not remarked on by anybody.
   */
  sigBudget: 24,
  /** §3, §6 — the Cantorate's dome, stood on the lip where the column stopped. */
  arrayTag: 'dome',
  /** §6, §12 — Attendance's order, carried to the rim: a ceiling of 25 per hull. */
  silenceCeilingSig: SILENCE_CEILING_SIG,
  /**
   * §6 — the order binds the twelve and not the watch. Read against the hull
   * it is unbreachable by any ordinary act: idle 16, cruise 24, silent 4.3,
   * and the +40 break-silence spike is a *firing* spike on a hull whose guns
   * are locked. This mission's ledger runs on exactly one manoeuvre, which is
   * changing your mind about a terrace.
   */
  silenceRole: 'cohort',
  /** §6 — unchanged from Attendance, because the galleries did not amend it. */
  debtCapS: 45,
  /** No held freight: eighteen hulls that move on their own orders. */
  escortRadiusM: 0,

  /**
   * §8, §11 — one rectangle, because the format restates only what a predicate,
   * a marker or a reader addresses, and only `the-rim` addresses one. It is the
   * map's Terraces row to the metre (`mouthRim.ts`): the mission adds no region
   * and moves no metre, which is §11's whole claim about reusing a chart.
   *
   * No `pressureBonus` anywhere on this map. The rim is not manufactured
   * water: the terraces are 2,600 m of ordinary Abyssal rock and the hulls
   * that stand on them are rated for it by refit and by baseline, not by a
   * grant somebody sowed.
   */
  regions: [
    {
      id: 'the-terraces',
      x: 0,
      y: 2000,
      widthM: 6000,
      heightM: 1000,
      note: 'The Terraces — Resonance Field at 0.70, four hundred metres above the lip, and the six charted faces. The hold: eight of twelve standing here when the tide turns. Bearings lie a little and it is the only quiet water on the chart',
    },
  ],

  /**
   * One marker, at Prospect's own coordinates over the same six faces, and it
   * is revealed with the count at 19:00 — a marker ships only while an
   * objective naming it is shown (`projectMissionView`), so the terraces are
   * pointed at for the last two minutes and never before. Nothing points at
   * the attendants, nothing points at the bed, and nothing points at the riser.
   */
  markers: [
    {
      id: 'terraces',
      label: 'The terraces. Six faces are charted, and the rim is held by standing on them.',
      x: 3000,
      y: 2500,
      radiusM: 2500,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Directorate,
      note: "The rim column — twelve Choristers, six Abyssal Submersibles and the Cantorate's dome on the eastern lip, weapons cold and silent at tick zero (§2). Two roles: the cohort the order binds and the hold counts, and the watch the riser's line prices",
      units: [
        // §11 — the cohort's twelve at x 5400–5900 in steps of a hundred, on
        // y 3,200 and y 3,450. The rim's fixed Directorate geometry for the
        // rest of the week, and the seats mission 8 and mission 9 copy.
        chorister(
          'one',
          5400,
          3200,
          'The northern row, western end. 583 m from the sixth face and 4,571 m from the first, which is the whole tempo of the mission in two distances'
        ),
        chorister('two', 5500, 3200, ''),
        chorister('three', 5600, 3200, ''),
        chorister('four', 5700, 3200, ''),
        chorister('five', 5800, 3200, ''),
        chorister(
          'six',
          5900,
          3200,
          'The furthest hull from the dome at 922 m, and still inside its 1,200 m disc — the aura reaches everything the Directorate has on this rim and the fifth face by sixty-two metres does not'
        ),
        chorister(
          'seven',
          5400,
          3450,
          'The southern row, and the nearest Chorister to the dome at 403 m. Attendant-b reads 6.46 from here before an order is given, and attendant-a 2.13, which the dome lifts to 2.70'
        ),
        chorister('eight', 5500, 3450, ''),
        chorister('nine', 5600, 3450, ''),
        chorister('ten', 5700, 3450, ''),
        chorister('eleven', 5800, 3450, ''),
        chorister(
          'twelve',
          5900,
          3450,
          'The twelfth, and identical to the other eleven. Two to a face over six faces is the hold, and eight of twelve is the count'
        ),
        // §11 — the 9th Trench Cohort's four at y 3,650, joining at the sill
        // exactly as Adze said they would.
        watchHull(
          'ninth-one',
          5500,
          3650,
          'The 9th Trench Cohort, at the sill. The best mobile ears in the game, and the shortest hull a Sounder grinds — 95 m, which is `DRIFT.TRANSIT_MIN_HULL_M` to the metre'
        ),
        watchHull('ninth-two', 5600, 3650, ''),
        watchHull('ninth-three', 5700, 3650, ''),
        watchHull('ninth-four', 5800, 3650, ''),
        // §11 — the rim's own two, at Prospect's coordinates exactly: the pair
        // that have been on the lip since before anyone had ears here.
        watchHull(
          'watch-a',
          4600,
          3300,
          "Prospect's western station, to the metre. It classified the plateaus' bed from here on the concern's day at 1,160 m and a ratio of 2.93, and entered it as a bed"
        ),
        watchHull('watch-b', 4750, 3350, "Prospect's eastern station, to the metre"),
      ],
      structures: [
        {
          tag: 'dome',
          kind: StructureKind.Cantor,
          x: 5000,
          y: 3400,
          depthM: LIP_DEPTH_M,
          note: "The Cantorate's instrument, stood where the column stopped, because a dome is not carried and there was nothing on the rim to carry it to (§3, §13). +25 HYD to 95 inside 1,200 m — 403 m to the nearest Chorister, 922 to the furthest, 559–838 to the 9th's four, 412 and 255 to the rim's own pair — and the one thing the silence ledger can withdraw. The cohort spends the mission walking out from under it",
        },
      ],
    },
    {
      slot: PLATEAUS,
      faction: Faction.Pelagia,
      note: "The plateaus — the charting pair at the seats Prospect left them on, and the bed on the western lip, entered on the concern's day and entered again (§5). Home water: they were here before the concern and they would like that not to matter",
      units: [
        // The pressure-lab prototypes, PR-3 by refit exactly as `prospect.ts`
        // authors them: a PR-1 navy has no roster hull that survives 2,100 m,
        // and a refit is a mission fact and never a roster one.
        {
          tag: 'chart-a',
          kind: UnitKind.LightScout,
          x: 1200,
          y: 2050,
          depthM: TERRACE_DEPTH_M,
          pressureRating: 3,
          note: "The Deepbloom programme's own hulls, reading the rim for what could live on it. At 12 in 0.70 water they are contact to a submersible at 1,746 m and a track to a Chorister standing on the first face at 461 m",
        },
        {
          tag: 'chart-b',
          kind: UnitKind.LightScout,
          x: 1350,
          y: 2100,
          depthM: TERRACE_DEPTH_M,
          pressureRating: 3,
          note: '',
        },
      ],
      structures: [
        {
          tag: 'the-bed',
          kind: StructureKind.SporeVeil,
          x: 1250,
          y: 3250,
          depthM: LIP_DEPTH_M,
          note: "The bed, grown on the western lip on the concern's day (§6). It emits 20 and sits inside its own symmetric cloud, so it carries 8 — contact to a Chorister from 2,101 m through the lip's 1.6 and bearing from 1,631, and 2,436 and 1,891 under the dome. A Chorister that walks within 350 m of it listens at HYD 5 and hears nothing at all, which the record enters as the bed's doing and not as a fault",
        },
      ],
    },
    {
      slot: ORDER,
      faction: Faction.Hadron,
      note: "The Order — the reconnaissance and the party, one navy on one slot (§2). PR-2 with no refit and no Spire on this tide, so nothing of the Order's is ever admitted into Abyssal water in this mission; that is D+2's business (§5, §13)",
      units: [
        {
          tag: 'recon',
          kind: UnitKind.Corvette,
          x: 5200,
          y: 1600,
          depthM: RECON_DEPTH_M,
          note: "Prospect's own station, measuring courteously from one quarter of the compass. Cone-on at 28 it is a classification to the 9th from 2,072 m; on the flank at 9.8 it is contact from 1,923 m and on the wake at 2.8 from 879. It appears and disappears by facing, which is the directional term working",
        },
        {
          tag: 'party-lead',
          kind: UnitKind.Cruiser,
          x: 5875,
          y: 450,
          depthM: STAGING_DEPTH_M,
          note: "The party, mustered at the staging's eastern end. A Cruiser hull at 65 cone-on, and nothing about its arrival is quiet or hidden",
        },
        {
          tag: 'party-two',
          kind: UnitKind.Corvette,
          x: 5900,
          y: 600,
          depthM: STAGING_DEPTH_M,
          note: '',
        },
        {
          tag: 'party-three',
          kind: UnitKind.Corvette,
          x: 5850,
          y: 300,
          depthM: STAGING_DEPTH_M,
          note: '',
        },
      ],
      emitters: [
        {
          tag: 'the-sounding',
          // §7, §9, §13 — the sound the act makes, at the Cruiser's own
          // 17:30 station. A `MissionSounding` is player-party only, so a
          // scripted hull's read cannot be authored as the act.
          x: 5150,
          y: 2450,
          depthM: RECON_DEPTH_M,
          sig: SOUNDING_SIG,
          // Sustained: the pattern and the period are the same length, which
          // is what "for twenty seconds" is in a format whose only sound is a
          // pattern. The window says when, the pattern says what.
          periodTicks: SOUNDING_WINDOW,
          onTicks: SOUNDING_WINDOW,
          hp: RETURN_HP,
          fromTick: T(18),
          untilTick: T(18) + SOUNDING_WINDOW,
          // **No `reading`, and the omission is the mechanism** (§8, §13).
          // `attend` counts only emitters that carry one, so the loudest thing
          // on the rim this tide is audible, loud and uncountable — which is
          // what keeps the count the lip's own.
          note: "The Order sounds the sixth face from above the line: 26.8 to the dome at 962 m, 24.2 to the rim's western watch hull at 1,012 m, 35.0 to the nearest cohort seat at 791 m, and contact to a submersible from 7,143 m in open water. It is the first hull of the week to stand into the watch, and the watch is not asked to answer it this tide",
        },
      ],
    },
    {
      slot: ATTENDANTS,
      // A party must carry a faction value for the engine's spawn path; the
      // attendants' contacts report none, per the emitter contract — a Tier-3
      // return with position and depth, no kind and no faction, which is the
      // mechanical definition of a thing the file can only call equipment
      // fault (§5; types.ts, `MissionEmitter`).
      faction: Faction.Directorate,
      note: "The attendants — two returns on the lip, periodic, structured, unclassifiable, and here since before anyone had ears (§5, §7). They were here first, and the file is older than the file's opinion",
      units: [],
      emitters: [
        attendant(
          'attendant-a',
          'western',
          2800,
          3400,
          7,
          1,
          "One second in seven, Prospect's rhythm unchanged. From the nearest cohort seat at 2,600 m it reads 2.13, which the dome lifts to 2.70 — a bearing before the column has moved, and a classification under the instrument"
        ),
        attendant(
          'attendant-b',
          'eastern',
          4100,
          3500,
          11,
          2,
          'Two seconds in eleven. From the nearest cohort seat at 1,301 m it reads 6.46, which is a track from the seat, on the first pass, before an order is given'
        ),
      ],
    },
  ],

  /**
   * §3 — what the column does not carry, with the ground's own reasons shown,
   * because docs/ui-ux.md §7 greys an affordance out *with the reason
   * attached*.
   *
   * Seven locks, which is every affordance the union has. Six are obvious on a
   * rim nobody fires on; the seventh is the noisemaker, and §13 argues it as
   * this document's own addition: a decoy is a transmission that lies, and the
   * ending's whole claim is that this faction does neither of the two things a
   * transmission can be.
   */
  locks: [
    {
      ability: 'weapons',
      reason: 'the law of these tides — nothing has stood into the watch',
    },
    {
      ability: 'torpedoes',
      reason: 'the law of these tides — nothing has stood into the watch',
    },
    { ability: 'mines', reason: 'nothing is left in water that is attended' },
    { ability: 'depthCharges', reason: 'nothing is left in water that is attended' },
    {
      ability: 'noisemakers',
      reason: 'a countermeasure is a sentence, and the rim is not lied to',
    },
    {
      ability: 'activeSonar',
      reason: 'aboard, live, and not used — the rim is attended, not asked',
    },
    { ability: 'construction', reason: 'the rim is not built on' },
  ],

  /**
   * §8's four rows, in §8's order — which is also the order the close reads
   * them in: `objectiveReadings` walks this list, so `the-attending` prints
   * before `the-record`, and the attendants' own entered-and-gap lines print
   * beneath both.
   *
   * The two terminal rows carry no `reading` pair, deliberately (§8): their met
   * and unmet *are* the ladder, and a fifth and sixth sentence restating
   * Korrin's three readings would be the register talking twice. Neither is a
   * keystone either — a rim held with a short watch and a whole watch with the
   * rim unheld are the same partial sentence, because the Directorate does not
   * rank ground against bodies.
   */
  objectives: [
    {
      id: 'the-rim',
      text: "The rim is held at the tide's turn. Eight of twelve on the terraces is a hold, and the Undermarshalcy does not round up.",
      initial: ObjectiveStatus.Pending,
      terminal: true,
      // §8, §9, §13 — revealed on the stalls' own beat at 19:00. `extract` is
      // not standing, the runtime never re-derives a Met non-standing row, and
      // a cohort that crossed the bench at 04:00 and walked back off it would
      // otherwise have latched a hold the tide had not yet asked about.
      revealAtTick: T(19),
      markerId: 'terraces',
      predicate: { kind: 'extract', role: 'cohort', region: 'the-terraces', count: HOLD },
    },
    {
      id: 'the-watch',
      text: 'Six attend the lip. Four is a watch.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      // §8 — standing, and re-derived every tick (`isStanding`), so a hull the
      // riser took at 18:30 is a hull the watch is short at 21:00. Met from
      // tick zero, six being at least four, which is what `runsItsLength`
      // above is for.
      predicate: { kind: 'survive', role: 'watch', count: WATCH },
    },
    {
      id: 'the-attending',
      text: 'The rim is attended. What is heard is entered, and the gap is entered too.',
      initial: ObjectiveStatus.Pending,
      // §4, §8, §13 — met from the seat on the first pass, and authored
      // **non-terminal** for exactly that reason: the attending is a condition
      // of the water rather than a task, it continues whatever the column
      // does, and a row that cannot be failed must not be allowed to grade
      // anything. This is the only mission in the bible that says so by making
      // a row unloseable. Both attendants are inside Bearing from the column's
      // seat and both are sounding at tick zero.
      predicate: { kind: 'attend', count: 2 },
      reading: {
        met: 'Entered: both returns. The attending continues.',
        unmet: 'Not entered: a return. The attending continues from the lip regardless.',
      },
    },
    {
      id: 'the-record',
      text: 'What is heard of the column is entered in accounts that are not ours.',
      initial: ObjectiveStatus.Pending,
      // §8 — sixty seconds, cumulative, at Classification or better. Read out
      // and never ranked: being heard is not a failure, it is an entry in
      // somebody else's file.
      predicate: {
        kind: 'tolerance',
        ticks: 60 * SIM.TICK_HZ,
        tier: ResolutionTier.Classification,
      },
      reading: {
        met: 'The column was classified for a minute of the tide by three navies’ ears. It was heard arriving; everything is. What it was doing on the terraces is in three registers and none of them is this one.',
        unmet:
          'The column was not held at classification for long. The slowest hulls in the Rift were on the rim before anybody had ears on them, which is what tempo is.',
      },
    },
  ],

  /**
   * §9's beat table, in its order. Twenty-one minutes, and the close is **not**
   * marked a conclusion: the tide's turn owes campaign.md §10's sixty-second
   * telegraph and pays it two and a half times over, with the riser at 18:30
   * against a resolve at 21:00 and the Order's sounding at 18:00 and its
   * descent at 16:00 in front of that.
   *
   * The visitors' transits are authored rather than AI, for the standing
   * reason: a mission's beats happen at the time the document says they
   * happen. The week is why; the beats are when.
   */
  beats: [
    // 00:00 — Korrin assigns the rim. §12's seven paragraphs are the briefing;
    // this is what is said on the channel when the tide opens, assembled from
    // her own clauses and inventing none.
    {
      atTick: 0,
      kind: 'say',
      speaker: 'Undermarshal Setha Korrin',
      text: 'The rim is assigned. It has been attended for two centuries from the water it is attended from, and this tide it is attended from the ground it is attended over, which is a difference of posture and not of doctrine. Eighteen hulls are given to the rim. The rim is held by standing on it. Nothing is raised and nothing is put into the water: the arrays are aboard, they are live, and they are not used. The rim is attended. It is not asked. Eight of twelve is a hold. The Undermarshalcy does not round up.',
      note: 'Read, not heard — the standing status of the say channel',
    },

    // 00:00 — the eighteen go silent. The column arrives quiet and is not
    // handed the toggle; the toggle is in the player's hands from the first
    // tick and there is nothing on this map that rewards reaching for it.
    silent(
      'cohort-one',
      'A silent Chorister emits 4.3 — the hull’s own figure through the 3–8 band, never the eight'
    ),
    silent('cohort-two', ''),
    silent('cohort-three', ''),
    silent('cohort-four', ''),
    silent('cohort-five', ''),
    silent('cohort-six', ''),
    silent('cohort-seven', ''),
    silent('cohort-eight', ''),
    silent('cohort-nine', ''),
    silent('cohort-ten', ''),
    silent('cohort-eleven', ''),
    silent('cohort-twelve', ''),
    silent(
      'ninth-one',
      'A silent Abyssal Submersible emits 4.8, and hears exactly as well as it did'
    ),
    silent('ninth-two', ''),
    silent('ninth-three', ''),
    silent('ninth-four', ''),
    silent('watch-a', ''),
    silent('watch-b', ''),

    // 00:30 — Adze, on the lip. The mission's one sentence about ground, and
    // the only register in the Rift that can state tempo as a fact about the
    // floor rather than as a claim about a cohort (§12).
    {
      atTick: T(0, 30),
      kind: 'say',
      speaker: 'Cohort-Prime Adze, on the lip',
      text: 'This is the lip. It is the floor of everything and the cohort is glad of it. The terraces are four hundred metres up and the cohort will be slower than it likes getting there, and it will be there before anybody who is faster.',
      note: 'Availability as a fact about ground, which no other faction could say without apologising for it',
    },

    // 03:00 — the pair walks Prospect's own first eastern leg, on the tide
    // after.
    {
      atTick: T(3),
      kind: 'move',
      tag: 'chart-a',
      x: 1800,
      y: 2150,
      note: "The plateaus chart eastward — Prospect's first eastern leg, walked again",
    },
    { atTick: T(3), kind: 'move', tag: 'chart-b', x: 1950, y: 2200, note: '' },

    // 05:00 — the plateaus (§12). A distinction offered as a question and a
    // presence offered as a message, and never once the imperative.
    {
      atTick: T(5),
      kind: 'say',
      speaker: 'The charting pair, for the plateaus',
      text: 'We’re here too — we were here before the concern, and we’d like that not to matter. We’re reading the rim for what could live on it, still. You’re standing on it. We’d ask you to notice that those aren’t the same thing yet.',
      note: '',
    },

    // 08:00 — the stalls enter the lip: the two returns at their periods and
    // the bed at its figure. §9 states the content of this beat and not its
    // words; the words are §12's two entry forms, used as §12 uses them.
    {
      atTick: T(8),
      kind: 'say',
      speaker: 'The stalls',
      text: 'The lip is entered. Two returns, at their periods, by bearing and period, and it is not said what they are. And a bed on the western lip, at eight, entered as a bed.',
      note: 'The record beside the concern’s transmissions and the plateaus’ sowing, which is where all three of them already are',
    },

    // 10:00 — the Order (§12). A courtesy paid to a rock face and a date
    // declined, which only a navy that thinks in intervals would take for an
    // answer.
    {
      atTick: T(10),
      kind: 'say',
      speaker: 'Voice of the reconnaissance, for the Order',
      text: 'The Order notes the cohorts have arrived and that the arrival was courteous, which is to say slow. The Order is measuring, from above the line, with nothing raised. What it raises, and when, is not for an open channel. It would be discourteous to the faces.',
      note: '',
    },

    // 11:00 — the reconnaissance takes its measure, at Prospect's own
    // waypoint, at its own rating and its own depth.
    {
      atTick: T(11),
      kind: 'move',
      tag: 'recon',
      x: 4600,
      y: 2100,
      note: 'The reconnaissance takes its measure. No depth on the beat: it measures from the water it is rated for',
    },

    // 12:00 — the pair turns for home water, back to the seats it opened on.
    {
      atTick: T(12),
      kind: 'move',
      tag: 'chart-a',
      x: 1200,
      y: 2050,
      note: 'The pair turns for home water',
    },
    { atTick: T(12), kind: 'move', tag: 'chart-b', x: 1350, y: 2100, note: '' },

    // 14:00 — the reconnaissance resumes Prospect's station.
    {
      atTick: T(14),
      kind: 'move',
      tag: 'recon',
      x: 5200,
      y: 1600,
      note: "Prospect's station, resumed. A silent Chorister at the seat is 1,612 m away and a ratio of 0.32 from here, which is nothing at all",
    },

    // 15:30 — the plateaus, from the western terraces (§12). Still here, and
    // that is the whole of the message.
    {
      atTick: T(15, 30),
      kind: 'say',
      speaker: 'The charting pair, for the plateaus',
      text: 'We’re still here. That’s the whole of the message, and we’d rather you had it from us than worked it out from the water. We’re on the western terraces, where we’ve been reading since before either of us had a reason to say so.',
      note: '',
    },

    // 16:00 — the Order's party comes down. Three hulls from the staging's
    // 1,400 m to 1,750 over the eastern slopes: 350 m of descent at SIG 72 for
    // 7.8 seconds, heard by everything. The first of the three sounds in front
    // of the close.
    {
      atTick: T(16),
      kind: 'move',
      tag: 'party-lead',
      x: 5400,
      y: 2100,
      depthM: RECON_DEPTH_M,
      note: 'A Cruiser hull cone-on from here is Track to the 9th from 1,553 m. Nothing about this arrival is quiet and nothing about it is hidden',
    },
    {
      atTick: T(16),
      kind: 'move',
      tag: 'party-two',
      x: 5450,
      y: 2250,
      depthM: RECON_DEPTH_M,
      note: '',
    },
    {
      atTick: T(16),
      kind: 'move',
      tag: 'party-three',
      x: 5350,
      y: 1950,
      depthM: RECON_DEPTH_M,
      note: '',
    },

    // 16:30 — the stalls, on the party. §9 gives the content: three hulls at
    // seventeen-fifty, projecting nothing.
    {
      atTick: T(16, 30),
      kind: 'say',
      speaker: 'The stalls',
      text: 'Three hulls at seventeen-fifty, over the eastern slopes. Nothing is raised and nothing is projected. It is entered.',
      note: 'The Order has no refit crystal after the Three and no Spire stands on this tide, and the record enters the absence rather than a reason for it',
    },

    // 17:30 — the party stands over the sixth face: 255 m from it horizontally
    // and 850 m above it. No depth on the beat, because it does not change.
    {
      atTick: T(17, 30),
      kind: 'move',
      tag: 'party-lead',
      x: 5150,
      y: 2450,
      note: 'Two hundred and fifty-five metres from the sixth face and eight hundred and fifty above it. The station the sounding is taken from',
    },
    { atTick: T(17, 30), kind: 'move', tag: 'party-two', x: 5200, y: 2550, note: '' },
    { atTick: T(17, 30), kind: 'move', tag: 'party-three', x: 5100, y: 2350, note: '' },

    // 18:00 — the sounding's window opens on the emitter above. The stalls
    // read it back against the law of these tides (§12), and Adze holds the
    // one order the campaign has been keeping for them.
    {
      atTick: T(18),
      kind: 'say',
      speaker: 'The stalls',
      text: 'The Order sounds the sixth face, from above the line. Eighty, twenty seconds. It is the first hull of these tides to stand into the watch.',
      note: 'The tick the law in the briefing stops being a statement of fact. The mission does not update it',
    },
    {
      atTick: T(18),
      kind: 'say',
      speaker: "Cohort-Prime Adze, on the Order's sounding",
      text: 'It has stood into the watch. The watch is not asked to answer it this tide. That is the order, and it is entered as the order, and the cohorts are attending it.',
      note: 'A refusal stated as an assignment being carried out — the order characters.md says the campaign puts in front of Adze that they might not obey, paid off by being held. Nothing in the union can read it (§8, §13)',
    },

    // 18:30 — the riser lifts off the lip. Prospect's literal, on the tide
    // after: SIG 100, the loudest authored sound in the bible, a hundred and
    // fifty seconds before the close, and the only thing on this map that
    // kills anything. No `depthM` on the `driveTo` — see the file header.
    {
      atTick: T(18, 30),
      kind: 'creature',
      tag: 'the-riser',
      species: FaunaSpecies.Sounder,
      spawnAt: { x: 3000, y: 3600, depthM: ATTENDANT_DEPTH_M },
      driveTo: { x: 3000, y: 2400 },
      untilTick: T(19, 30),
      loud: true,
      note: 'Prospect’s own line, risen again on the tide after: 1,200 m at 30 m/s in forty seconds, climbing at 12 toward its species’ working depth, so it arrives over the terraces at about 2,570 m. Contact to a submersible from 11,016 m and a track to the seat from 2,405. "It will pass, and then it will pass again"',
    },

    // 18:45 — Adze, at the riser (§12). The line is named, and the cohorts are
    // not asked to hold it.
    {
      atTick: T(18, 45),
      kind: 'say',
      speaker: 'Cohort-Prime Adze, at the riser',
      text: 'One is coming up off the lip and its line is the middle terraces. The cohorts are not asked to hold the line. The cohorts are asked to hold the rim, which is not the same water.',
      note: 'A submersible within 85 m of x = 3000 at the riser’s depth is ground at 220 a second and is gone in 2.4; a Chorister at 50 m is beneath the colossus’s notice entirely',
    },

    // 19:00 — the tide turns at the count, and `the-rim` is revealed on this
    // beat, because a reveal needs a beat under it (`missions.test.ts`).
    {
      atTick: T(19),
      kind: 'say',
      speaker: 'The stalls',
      text: 'The tide turns at the count. The rim is read as it stands: eight of twelve on the terraces is a hold, and the Undermarshalcy does not round up.',
      note: 'The reveal tick of `the-rim`, and the marker arrives with it',
    },

    // 19:30 — the party climbs back to the staging seats. An ascent, and
    // silent: the free half of the arithmetic §4 is made of, spent by the navy
    // that arrived faster and later.
    {
      atTick: T(19, 30),
      kind: 'move',
      tag: 'party-lead',
      x: 5875,
      y: 450,
      depthM: STAGING_DEPTH_M,
      note: 'The Order withdraws. No Spire was raised, nothing was cut, and no correction was made — what it raises is the next tide’s',
    },
    {
      atTick: T(19, 30),
      kind: 'move',
      tag: 'party-two',
      x: 5900,
      y: 600,
      depthM: STAGING_DEPTH_M,
      note: '',
    },
    {
      atTick: T(19, 30),
      kind: 'move',
      tag: 'party-three',
      x: 5850,
      y: 300,
      depthM: STAGING_DEPTH_M,
      note: '',
    },

    // 20:30 — Korrin reads the count, and then nothing, for the first time in
    // the campaign. The count itself is the epilogue and the objective
    // readings beneath it; what is authored here is the sentence she does not
    // say, which the record enters as a presence.
    {
      atTick: T(20, 30),
      kind: 'say',
      speaker: 'Undermarshal Setha Korrin',
      text: 'The record notes that the Undermarshal was present.',
      note: 'Six missions have spent one sentence apiece and the campaign has been saving the seventh since 88 PC. The ending is that she reads the count and stops, in front of the one person who would have had to act on it',
    },
    {
      atTick: T(20, 30),
      kind: 'say',
      speaker: 'First Cantor Vehl Ossary',
      text: 'Nothing. The record notes that the First Cantor was present.',
      note: 'Thirty seconds ahead of every close and unchanged by all three of them. He has closed every mission the campaign has put him in by saying nothing, and this time they mean the same thing by it',
    },

    // 21:00 — the tide turns. Not a conclusion: the telegraph applies and is
    // answered by a hundred and fifty seconds off the riser (§8, §9).
    {
      atTick: T(21),
      kind: 'resolve',
      note: 'The terraces are read as they stand and the ears are counted. The transcripts are sealed',
    },
  ],

  /**
   * §9's two conditional beats, printed in the document rather than on the
   * clock because a condition has no tick — and both of them fire off the two
   * rows the count never grades.
   *
   * The first fires on the *first pass*, from the seat, before the column has
   * moved, and the document says so rather than pretending it is earned: both
   * attendants are sounding at tick zero and both are inside Bearing from
   * where the column stands.
   */
  conditionalBeats: [
    {
      kind: 'say',
      speaker: 'The stalls',
      text: 'Entered: both returns, bearing and period. The attending continues.',
      note: '§4 — met from the seat on the first pass. The attending is a condition of the water, not a task',
      when: { kind: 'attend', count: 2 },
    },
    {
      kind: 'say',
      speaker: 'The stalls',
      text: 'The column has been held at classification by ears that keep records for a minute of the tide. It is entered elsewhere. Everything is.',
      note: 'Fired by the tally rather than by the clock, and it is not a warning: being heard is an entry in an account that is not ours',
      when: {
        kind: 'tolerance',
        ticks: 60 * SIM.TICK_HZ,
        tier: ResolutionTier.Classification,
      },
    },
  ],

  /**
   * §8's Results, verbatim — Korrin's three readings, with `the-attending`'s
   * and `the-record`'s own readings printing beneath whichever row the count
   * earned, and the two attendants' entered-and-gap lines beneath those.
   *
   * **One conclusion in three readings, and no fork.** campaign.md §9's
   * Directorate row is one sentence — the rim is held, the attending
   * continues, and Korrin never says what she believes — and all three clauses
   * appear under all three readings. The Ledger's ending forks because a chair
   * either transmits or does not; this one cannot, because the button that
   * made that fork is locked here by rule.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      'The rim is held and the ears are whole, and the rim is attended, and all three are entered, and it is not said what for. The returns are in the record beside the concern’s transmissions and the Order’s one, and the bed, and the stalls note the resemblance and nobody else does. The Cantorate is intact. The transcripts are sealed.',
    [MissionOutcome.Partial]:
      'You were sufficient. The rim is held or the ears are whole, and the other is short, and a short column is entered as a short column. The attending continues, which was never in the count.',
    [MissionOutcome.Lost]:
      'The rim is not held and the watch is short. The cohorts arrived before the armies and the terraces are the tide’s, and the lip took what stood on its line. It is not a failure of the cohorts; it is a rim that was attended for two centuries and held for none of them, and it is entered as one, and the attending continues from the lip.',
  },
};
