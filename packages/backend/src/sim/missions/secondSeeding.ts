/**
 * The Second Seeding 7 — The Second Seeding. docs/mission-second-seeding.md,
 * transcribed.
 *
 * A data literal in `deepFurrow.ts`' idiom, on `prospect.ts`' map: the document
 * owns the forces, the water, the beats, the numbers and the text. Where this
 * file and that document disagree, one of them is wrong and the fix says which.
 *
 * The campaign's convergence and its ending in one mission, and four things
 * make it the shape it is — all four data:
 *
 * - **The sown lip rates the hulls standing in it, and nothing else changes**
 *   (§4.3). `the-rim-furrow` carries no grant at 00:00 and gains
 *   `pressureBonus: 1` on the tick the sowing completes, by a `ground` beat
 *   that writes neither floor nor biome: the lip stays Abyssal Trench at 1.6
 *   both sides of it, every figure in §6 and §7 is priced at 1.6 after the
 *   sowing as before it, and *holds a hull the deep never rated* is the zone's
 *   sentence rather than a PF write. This is the one mission of the fourteen
 *   that could not be authored at all before the grant landed: without it
 *   Teel's element crosses 1,800 m about fifteen seconds after its release and
 *   is dead at about 22:30, before the tide (§4, §13).
 * - **The bed is the economy** (§4.1). One prebuilt Spore Veil over the column,
 *   grown the tide before last — everything inside it emits ×0.4 and hears at
 *   HYD 5, symmetric — so the whole day is played by a column that is a smudge
 *   to the best ears on the rim and deaf to all of them. A *player-built* Veil
 *   would sit at `CONSTRUCTION.WORKING_DEPTH_M`, which is why the bed is grown
 *   before the mission opens and construction is locked (§13).
 * - **Nobody fires, and the guns come down anyway** (§5). Four navies
 *   weapons-cold on D, the plateaus' three Corvettes struck at the staging and
 *   held by `releaseTick` until the riser lifts off, and the convergence played
 *   in contacts and registers. The one thing on this map that can hurt a hull
 *   is the water.
 * - **The tide runs its length** (§8). Both terminal rows can be met on the
 *   riser's tick — the column is seated inside `the-rim-furrow` from 00:00, so
 *   a day that sowed at 15:00 meets *the-furrow* the moment it is revealed —
 *   and the court's rule would close the tide two and a half minutes early,
 *   before Teel's element had left the staging. `runsItsLength` is authored.
 *
 * **The map is `mouth-rim`, unchanged** (§11) — the fourth mission the literal
 * resolves for and the second that is written, after `prospect.ts`. What this
 * mission adds is one region, one marker, one structure and four parties, and
 * no geometry: there is no `ground` beat here that writes ground.
 *
 * Four findings this literal carries against the engine as built, each stated
 * so a reviewer can overrule it in one place rather than discover it:
 *
 * - **The path mean, not the biome constant** (§13). `Terrain.pathPropagation`
 *   walks the 250 m cells between the two ends, so a lip-to-terraces pair is
 *   priced between 1.6 and 0.7 and never at the lip's figure. Every figure in
 *   §6 and §7 is read where the ear actually stands: the reader working
 *   face-two has the bed at 3.35 from its own station, the heavy on the
 *   terraces has a veiled sowing at a Bearing (1.76), and the reconnaissance
 *   has nothing (0.54). `missionSecondSeeding.test.ts` re-derives all of it
 *   from the walk rather than from `PROPAGATION_FACTOR`.
 * - **Silent Running is per hull** (§13). `silentRunningSig` sits a hull in the
 *   3–8 band by its idle, so the barge silent and veiled is 3.0 rather than
 *   1.2 and the watch has it at a Contact for five minutes of the concern's
 *   day. §6 enters that smudge; the plan did not.
 * - **Breaking silence is not firing** (§3, §13). `BREAK_SILENCE_SIG_SPIKE` is
 *   applied by `applyFiringSpike` alone, so a sower that stops being quiet to
 *   plant goes 1.8 → 7.2 → 18 under the bed and nothing louder. The plan
 *   priced a spike; there is none.
 * - **The tolerance reads at Track, not Classification** (§8, §13). The
 *   exposure walk takes every non-ordnance entity the player owns as a victim,
 *   structures included, so the bed's own 8 accrues exposure — a Classification
 *   (2.93) to the watch's western station for four minutes and forty seconds,
 *   and (3.35) to the concern's western reader for the two minutes and fifty it
 *   works face-two. A sixty-second Classification tolerance would be met in
 *   every run by a structure the player cannot move. At Track the bed never
 *   enters: 3.35 is its ceiling on this map against Track's 4.0.
 *
 * Three things the document names and this literal deliberately does not build,
 * because §13 assigns them elsewhere: Anholt's Seeding ability (a
 * `MissionCommanderAbility` carries speed and Silent Running immunity, not a
 * pressure grant, and the document does not want a new field), Bloom Surge, and
 * cross-mission progression beyond the outcome the record already keeps.
 */

import {
  DEPTH,
  Faction,
  FaunaSpecies,
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  SEEDING_SECOND_SEEDING_HEADER,
  SIM,
  StructureKind,
  UnitKind,
} from '@echoes/shared';

import type { MissionDefinition, MissionEmitter, MissionUnit } from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/** Reserved and empty, exactly as `prospect.ts` reserves it on this map (§2). */
const COURT = 1;
/** The concern's expedition — Prospect's four hulls, from the other side (§2). */
const CONCERN = 2;
/** Those below, attending, as they have never not done (§2, §5). */
const WATCH = 3;
/** The Order's reconnaissance, measuring its crystal courteously (§2, §5). */
const ORDER = 4;
/** The rim's attendants — a party whose only assets in the water are sounds (§2). */
const ATTENDANTS = 5;

/**
 * §11 — the column's water, and the deepest order `match.ts` accepts. The lip's
 * floor is 3,100, so the four seed hulls stand a hundred metres off the rock at
 * the bottom of the orderable column and no deeper.
 */
const COLUMN_DEPTH_M = DEPTH.MAX_M;
/** §11 — the pair's seat over the terraces' 2,600 floor. Prospect's own. */
const TERRACE_DEPTH_M = 2100;
/** §11 — the staging's floor is 1,500, and this is as deep as a Commune gun goes. */
const STAGING_DEPTH_M = 1450;
/** §11 — Prospect's seats for the concern, over the same staging floor. */
const CONCERN_DEPTH_M = 1400;
/** §6, §11 — the concern's terrace stations, over a 2,600 floor. */
const TERRACE_STATION_DEPTH_M = 2500;
/** §11 — the six faces, on the terraces' own floor. */
const FACE_DEPTH_M = 2600;
/** §11 — Prospect's watch, over the lip. */
const WATCH_DEPTH_M = 3000;
/** §11 — the reconnaissance over the slopes' 2,200: Mid-Water, and a Corvette is PR-2. */
const RECON_DEPTH_M = 1750;
/**
 * §11 — the attendants and the riser, verbatim from Prospect: an emitter may
 * sit at 3,050 over a floor of 3,100 where a hull the runtime orders may not.
 */
const LIP_FLOOR_DEPTH_M = 3050;

/**
 * §3, §4.3 — the sowing's own figures, authored here rather than in
 * `constants.ts` for the rule `MissionSounding` states about Aptitude's
 * 400 / 20 / 80: these are one mission's arithmetic against one piece of lip,
 * not a rule of the world. They are *Deep Furrow*'s figures one mission further
 * down — forty-five is the working figure of a Standard cut (economy.md §6) —
 * and the bed takes the 45 to 18, which is what the SIG budget is.
 */
const SOWING_POINT = { x: 1250, y: 3250 };
const SOWING_RADIUS_M = 250;
const SOWING_HOLD = T(1);
const SOWING_SIG = 45;

/**
 * §4.3 — one band, and never two.
 *
 * The Deepbloom conversion of docs/systems-depth.md §3: a hull standing in sown
 * ground operates at PR + 1, which on the lip is exactly what the water asks
 * and not a metre more. Resolved against a Sounding Spire's aura as a max
 * (`aurasSystem`), so nothing here can quietly rent a second band.
 */
const FURROW_GRANT = 1;

/** §6, §13 — the trade standard the six faces sound at, Prospect's own. */
const READ_SIG = 80;
const READ_WINDOW = T(0, 20);
/** §13 — the attendants' durability, and nothing on this water is armed to spend it. */
const RETURN_HP = 5000;
/** §7 — the returns, verbatim from Prospect in position, period, SIG and depth. */
const RETURN_SIG = 24;

/** §9 — the riser's minute, and the tick Teel's element is released into it. */
const RELEASE = T(20, 30);

/**
 * One of the four seed hulls — the column that came south through the drowned
 * city, refit to the third rating for this address (§3).
 *
 * `pressureRating: 3` is a mission fact and never a roster fact: the Cruiser
 * and the Harvester everybody else fields are PR-2, and the programme has six
 * deep-rated hulls and has never had a seventh. Souls are authored per hull and
 * read at the close by household; nothing in the runtime ranks them (§3, §13).
 */
const seed = (
  tag: string,
  kind: UnitKind,
  x: number,
  y: number,
  souls: number,
  note: string
): MissionUnit => ({
  tag,
  kind,
  x,
  y,
  depthM: COLUMN_DEPTH_M,
  role: 'seed',
  pressureRating: 3,
  souls,
  note,
});

/**
 * One of Teel's three, struck, at the staging's far west and held until the
 * basin wakes (§3, §9).
 *
 * PR-2 on the roster and left there deliberately: the whole of the last five
 * minutes is that an ordinary Commune gun lives at 3,000 m *because the ground
 * holds it*. `releaseTick` refuses move and depth orders until 20:30 whatever
 * the player asks, and the release beat is authored on the same tick.
 */
const escort = (tag: string, x: number, y: number, note: string): MissionUnit => ({
  tag,
  kind: UnitKind.Corvette,
  x,
  y,
  depthM: STAGING_DEPTH_M,
  role: 'escort',
  souls: 4,
  releaseTick: RELEASE,
  note,
});

/**
 * One charted face, sounding on the concern's schedule (§13).
 *
 * Prospect's player-paced instrument seen from the other side: from outside,
 * a survey is a schedule and an emitter. The pattern and the window are the
 * same twenty seconds, which is what a sustained read is — not a rhythm, one
 * passage — and the emitter sits on the concern's party so the plateaus can
 * hear it. It carries no `reading`: the faces are not attendable, and *the-returns*
 * counts only what does.
 */
const face = (
  tag: string,
  x: number,
  y: number,
  fromTick: number,
  note: string
): MissionEmitter => ({
  tag,
  x,
  y,
  depthM: FACE_DEPTH_M,
  sig: READ_SIG,
  periodTicks: READ_WINDOW,
  onTicks: READ_WINDOW,
  hp: RETURN_HP,
  fromTick,
  untilTick: fromTick + READ_WINDOW,
  note,
});

export const SEEDING_SECOND_SEEDING: MissionDefinition = {
  ...SEEDING_SECOND_SEEDING_HEADER,
  doc: 'docs/mission-second-seeding.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Pelagia,
  courtSlot: COURT,
  /** §5, §11 — nothing lives below 2,700 m; the one creature is authored. */
  fauna: false,
  /** §8 — only the `resolve` at 23:00 closes the day, and the day is read where the column is. */
  runsItsLength: true,
  /**
   * §4 — eighteen: the sowing's 45 through the bed's 0.4, and the loudest the
   * Commune intends to be on the rim for exactly sixty seconds. A description
   * and a ceiling in the sense *Tend*'s twenty was, never a live threshold.
   */
  sigBudget: 18,
  // No arrayTag and no silence order: Asset Recovery's posture (§9). The ledger
  // does not run — there is no court on this water to lend an array and no debt
  // to keep — and what is heard of the column is read by *the-ledger* instead.
  silenceCeilingSig: 100,
  debtCapS: 0,
  /** §9 — Thin Water's hold is absent; Teel's element is held by `releaseTick`. */
  escortRadiusM: 0,

  /**
   * §11 — one mission region, because the format restates only what is
   * addressed. The plan authored a second for the staging, Prospect's return
   * line, and no predicate here names it.
   *
   * **No `pressureBonus` at 00:00, and that is the mission.** The lip is PR-3
   * water until it is sown; the grant arrives on the conditional `ground` beat
   * below, at the tick the hold completes.
   */
  regions: [
    {
      id: 'the-rim-furrow',
      x: 1000,
      y: 3000,
      widthM: 500,
      heightM: 500,
      note: "The western lip. Bare PR-3 rock at 00:00 and five hundred metres of ground that holds a hull the deep never rated once it is sown — *the-furrow*'s region, *the-escorts*', and the Kell seed's",
    },
  ],

  /**
   * §11 — one marker, at the sowing's point and its whole hold, named by
   * *the-seeding*, *the-furrow* and *the-escorts*. Nothing points at a return
   * and nothing points at the riser.
   */
  markers: [
    {
      id: 'the-rim-furrow',
      label: 'The lip. Sixty seconds, bow on, under the bed.',
      x: SOWING_POINT.x,
      y: SOWING_POINT.y,
      radiusM: SOWING_RADIUS_M,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Pelagia,
      note: "The whole of the Commune's deep navy on one water for the first time: the seed column under the bed, the charting pair on the terraces, and Warden Juno Teel's three corvettes at the staging, struck (§2)",
      units: [
        seed(
          'the-barge',
          UnitKind.Cruiser,
          1250,
          3300,
          14,
          'The momentum made a hull. Anholt is aboard and speaks the briefing. Silent and veiled it reads 3.0 — a smudge to the watch for five minutes; merely idle it reads 22, which is a Track from 1,798 m (§3, §6)'
        ),
        seed(
          'the-sower',
          UnitKind.Harvester,
          1150,
          3200,
          6,
          "Radicals' seed-one, the same hull and the same six. Ottilie Marr is among them, because the seed is Kell seed. It takes the sounding, and `holdingSounding` refuses a silent hull — so the sower drops silence to plant, and goes 1.8 → 7.2 → 18 and nothing louder (§3)"
        ),
        seed('seed-two', UnitKind.Harvester, 1350, 3200, 5, ''),
        seed(
          'seed-three',
          UnitKind.Harvester,
          1250,
          3400,
          8,
          'Thirty-three in the column, by household — fourteen, six, five and eight, authored whole because nothing carries a count between missions (§3, §13)'
        ),
        // The proof scouts of 204 PC, seated exactly where
        // docs/mission-prospect.md §5 seats them and walking Prospect's legs
        // on the table's own orders. No role: the pair is in no predicate, and
        // `MissionUnit.role` is singular. Their ears are the only ears the
        // column has outside the bed, because inside it a hull hears at 5.
        {
          tag: 'chart-a',
          kind: UnitKind.LightScout,
          x: 900,
          y: 2100,
          depthM: TERRACE_DEPTH_M,
          pressureRating: 3,
          souls: 2,
          note: 'They arrived first and mention it to nobody (docs/mission-prospect.md §5). PR-3 by refit, as the roster sells no Commune hull that survives this address',
        },
        {
          tag: 'chart-b',
          kind: UnitKind.LightScout,
          x: 1050,
          y: 2150,
          depthM: TERRACE_DEPTH_M,
          pressureRating: 3,
          souls: 2,
          note: '',
        },
        escort(
          'escort-one',
          500,
          300,
          "The staging's far west, silent, held until 20:30. Two and a half kilometres from the concern's flagship, which at 5.3 through open water is nothing to a Cruiser's 65 past 1,111 m (§3)"
        ),
        escort('escort-two', 350, 450, ''),
        escort(
          'escort-three',
          650,
          450,
          'Twelve aboard the three. The furrow is 2,864–3,044 m south of the element at 85 m/s, and between 1,800 m and its edge a Corvette pays four a second of what does not heal (§4)'
        ),
      ],
      structures: [
        {
          tag: 'the-rim-bed',
          kind: StructureKind.SporeVeil,
          x: SOWING_POINT.x,
          y: SOWING_POINT.y,
          depthM: COLUMN_DEPTH_M,
          note: "Grown over the column the tide before last, the way the furrow's beds were grown. Prebuilt, at its true depth: a player-built Veil sits at `CONSTRUCTION.WORKING_DEPTH_M` wherever the floor is (§13). The sowing point and its whole 250 m radius lie inside the cloud's 350, so the sowing is veiled — and the bed's own 8 is the loudest thing under the bed until the sowing, at a Classification to the watch's western station for four minutes and forty seconds of the concern's day (§6)",
        },
      ],
    },
    {
      slot: CONCERN,
      faction: Faction.Bathyarch,
      note: "The concern's expedition — Prospect's four hulls, from the other side: down loud at 02:00, six faces at eighty, up slow at 20:30, north at 22:00. Foreman Corwin Osk is aboard and unheard; the Commune cannot hear the concern's channel (§5, §6)",
      units: [
        {
          tag: 'flagship',
          kind: UnitKind.Cruiser,
          x: 3000,
          y: 420,
          depthM: CONCERN_DEPTH_M,
          pressureRating: 3,
          // §5, §13 — the one seat this document authors rather than inherits:
          // the terrace station at 3000, 2750 rather than the plan's 3000,
          // 2500, so that Prospect's fixed 07:00 leg idles `chart-b` 618 m off
          // at a Bearing (2.01) rather than 381 m off at a Track (4.37), and
          // the ledger reads the sowing rather than the chart.
          note: 'The heavy. Its terrace station is 1,820 m from the bed, which is a Bearing (1.76) on a veiled sowing and nothing (0.78) on the bed itself',
        },
        {
          tag: 'reader-west',
          kind: UnitKind.Corvette,
          x: 2850,
          y: 350,
          depthM: CONCERN_DEPTH_M,
          pressureRating: 3,
          note: 'The western bank, calibrated at the yards. It stands a hundred metres off each face it reads: 828 m from the bed at face-one, 673 at face-two — the closest a Consortium ear comes to the plateaus all week — and 1,512 at face-three, where it stays until the ascent (§6)',
        },
        {
          tag: 'reader-east',
          kind: UnitKind.Corvette,
          x: 3150,
          y: 350,
          depthM: CONCERN_DEPTH_M,
          pressureRating: 3,
          note: 'The eastern bank. Nothing of the plateaus reaches it above a smudge',
        },
        {
          tag: 'bunkerage',
          kind: UnitKind.Harvester,
          x: 3000,
          y: 550,
          depthM: CONCERN_DEPTH_M,
          pressureRating: 3,
          note: '',
        },
      ],
      /**
       * §6, §13 — the readers' schedule as windowed emitters: six faces at
       * Prospect's own positions, in Prospect's own order of reading. The
       * Commune's reading of the survey is that six were charted; what the
       * concern proved is the concern's file, and this document neither
       * carries nor contradicts it.
       */
      emitters: [
        face(
          'face-one',
          900,
          2400,
          T(6),
          'The first read: 300 m from the seat the pair left at 03:00 and 934 m from the leg it is standing on — a Track at 14.9, the loudest thing the pair has heard since the basin'
        ),
        face('face-four', 3500, 2600, T(7), 'The far side of the terraces'),
        face(
          'face-two',
          1700,
          2650,
          T(9),
          'The face beside the plateaus: 750 m from the bed through a path mean of 1.0, which is a Bearing (2.17) even to a hull hearing at 5. The column hears the concern working it (§7)'
        ),
        face('face-five', 4300, 2350, T(10, 30), ''),
        face(
          'face-three',
          2500,
          2300,
          T(12),
          "283 m from the pair on Prospect's second leg: a Track at 101, the nearest the concern's industry comes to the plateaus' own ears all day"
        ),
        face(
          'face-six',
          5100,
          2700,
          T(14),
          'The last read, nearest the lip and furthest from the bed — 3,954 m from home water, and the only read of the six the pair does not hold exactly'
        ),
      ],
    },
    {
      slot: WATCH,
      faction: Faction.Directorate,
      note: 'The watch — attending, as it has never not done. Prospect stations and legs: west along the lip in the morning, home in the afternoon. From the western station it has the bed at a name, and enters it (§5, §6)',
      units: [
        {
          tag: 'watch-a',
          kind: UnitKind.AbyssalSubmersible,
          x: 4600,
          y: 3300,
          depthM: WATCH_DEPTH_M,
          note: "1,160 m from the bed at its western station from about 09:20 to 14:00, all of it on the lip and every figure at 1.6: the bed's hum at Classification (2.93), the barge silent at Contact (1.11), a veiled sowing at Track (6.60). This is the fact D+1 and D+2 inherit (§6)",
        },
        {
          tag: 'watch-b',
          kind: UnitKind.AbyssalSubmersible,
          x: 4750,
          y: 3350,
          depthM: WATCH_DEPTH_M,
          note: '155 m further from the bed: the bed at Bearing (2.40) and the sowing at Track (5.40)',
        },
      ],
    },
    {
      slot: ORDER,
      faction: Faction.Hadron,
      note: "The reconnaissance — one hull in Order colours, loud in one quarter of the compass. It never has the bed or the column above 0.54 on D, and the one Commune sound in its day is Teel's element coming down at 20:30 (§5)",
      units: [
        {
          tag: 'recon',
          kind: UnitKind.Corvette,
          x: 5200,
          y: 1600,
          // Prospect's seat and Prospect's reason: the Order rents depth from
          // Sounding Spires and brought none, so a reconnaissance measures
          // from the water it is rated for, courteously.
          depthM: RECON_DEPTH_M,
          note: 'Measuring the crystal from the slopes, on Prospect’s legs. It withdraws at 17:00 to the seat it hears the descent from — 4,402 m off, a Contact at 1.15, and it says so by not saying so',
        },
      ],
    },
    {
      slot: ATTENDANTS,
      // A party must carry a faction value for the engine's spawn path; the
      // attendants' contacts report none, per the emitter contract — a Tier-3
      // return with position and depth, no kind and no faction (§2, §5).
      faction: Faction.Directorate,
      note: 'The attendants — two returns on the lip, periodic, structured, unclassifiable. Filed three times as equipment fault by a navy that files, and by the Commune as breathing on a count (§5, §8)',
      units: [],
      emitters: [
        {
          tag: 'attendant-a',
          x: 2800,
          y: 3400,
          depthM: LIP_FLOOR_DEPTH_M,
          sig: RETURN_SIG,
          periodTicks: 7 * SIM.TICK_HZ,
          onTicks: 1 * SIM.TICK_HZ,
          hp: RETURN_HP,
          reading: {
            entered:
              "Something on the lip was breathing on a count, and we heard it, and we're not going to say what it was because we don't know and neither does anybody.",
            gap: "We didn't hear the western one. It was there. We planted a garden a kilometre and a half from something we never heard and we'd like that on the list of things we did today.",
          },
          note: "The nearer return, 1,557 m from the bed. Under a Bearing from the pair's seat (1.47) and a Classification from Prospect's 07:00 leg (3.76): a pair that walks the table's legs meets *the-returns*, and a pair held at its seat all day does not (§8)",
        },
        {
          tag: 'attendant-b',
          x: 4100,
          y: 3500,
          depthM: LIP_FLOOR_DEPTH_M,
          sig: RETURN_SIG,
          periodTicks: 11 * SIM.TICK_HZ,
          onTicks: 2 * SIM.TICK_HZ,
          hp: RETURN_HP,
          reading: {
            entered:
              "The eastern one breathes on a longer count than the western, and we had it from the terraces, and we're not calling it anything. We don't file.",
            gap: "We didn't hear the eastern one. It's further off and it breathes slower, and the concern's instruments were between us and it all day.",
          },
          note: 'The eastern return, on an eleven-second count: nothing from the seat (0.79) and a Bearing from the second leg (2.00)',
        },
      ],
    },
  ],

  /**
   * §3 — what the column does not carry, as dead affordances with the reason in
   * register (docs/ui-ux.md §7). Six locks, and `activeSonar` deliberately not
   * among them: the button is on the panel, it is priced in §3, and nothing on
   * this rim is answered by a ping while everything on it hears one.
   */
  locks: [
    {
      ability: 'weapons',
      reason: 'struck — nobody strikes first, and not on this water',
    },
    { ability: 'torpedoes', reason: 'struck' },
    { ability: 'mines', reason: 'struck' },
    { ability: 'depthCharges', reason: 'struck' },
    { ability: 'noisemakers', reason: 'struck' },
    {
      ability: 'construction',
      reason: 'the bed is grown; nothing else is built on a wound',
    },
  ],

  /**
   * §11, §8 — the Kell seed as a lift with its cut time at zero and its cut SIG
   * at zero, the gift run's shape and the gift run's two zeroes
   * (docs/mission-tend.md §13).
   *
   * Rigged on the first pass the sower is not silent, because a lift accrues
   * nothing under Silent Running — which on this literal means the seed goes
   * aboard the moment the sower stops being quiet to plant. It is in no
   * predicate; it is how the document says the seed is aboard.
   */
  lifts: [
    {
      id: 'kell-seed',
      tag: 'the-sower',
      region: 'the-rim-furrow',
      cutTicks: 0,
      cutSig: 0,
      note: "The seed Thin Water's column went to Kell for and Radicals brought south. Never loud: a seeding is not a work site",
    },
  ],

  /**
   * §4.2, §8 — the sowing. Sixty seconds inside 250 m of 1250, 3250, bow on,
   * not silent, at 45, veiled to 18. A broken hold resets to zero
   * (`accrueSounding`) and `holdingSounding` refuses a silent hull, which is
   * why the sower must stop being quiet. A PR-3 hull on this rock pays nothing
   * for it but ears — and the ears walk.
   */
  soundings: [
    {
      id: 'the-sowing',
      tag: 'the-sower',
      x: SOWING_POINT.x,
      y: SOWING_POINT.y,
      radiusM: SOWING_RADIUS_M,
      holdTicks: SOWING_HOLD,
      sig: SOWING_SIG,
      note: 'The sower is seated 112 m from the point, inside the bed. Nothing fences the clock: §13 records that the lip is sowable from 00:00 and says which lever a reviewer would move',
    },
  ],

  /**
   * §8's five rows, in §8's order. Two are terminal and the ladder falls out of
   * them alone; *the-ledger* and *the-escorts* are read out and never ranked,
   * and *the-returns* carries no reading of its own because the attendants'
   * entered-or-gap lines are the reading (§8, §12).
   */
  objectives: [
    {
      id: 'the-seeding',
      text: "The lip wants sowing. Sixty seconds, bow on, at the working figure, under the bed — and there are three navies on this rim with ears, and we're not going to tell you when. We're saying they walk.",
      initial: ObjectiveStatus.Pending,
      markerId: 'the-rim-furrow',
      terminal: true,
      // §8 — the keystone: a rim that was not sown is not this campaign's
      // ending, whoever stayed on it, so the count reads Lost whatever else
      // came home.
      keystone: true,
      predicate: { kind: 'sound', count: 1 },
      reading: {
        met: "It's planted. Five hundred metres of the lip will hold a hull the deep never rated, and they'll hold it in the morning when they come to hear what it is.",
        unmet:
          "Nothing was planted. The rim is exactly what it was, which everybody else on it will be relieved to hear, and we'd like the record to show we noticed. There isn't a record.",
      },
    },
    {
      id: 'the-furrow',
      text: "A garden with nobody in it is a claim, and we said we'd never make one. We'd like three of ours in the furrow when the tide turns.",
      initial: ObjectiveStatus.Pending,
      markerId: 'the-rim-furrow',
      terminal: true,
      /**
       * §8 — revealed on the riser's beat and scored from it to the tide, and
       * the honesty of the row is stated rather than tidied.
       *
       * The whole column is seated inside `the-rim-furrow` at tick zero,
       * `extract` is not standing (`predicates.ts` lists `quiet` and `survive`
       * and nothing else), and `deriveObjectives` never re-derives a Met
       * non-standing row. Revealed at 00:00 this would latch Met on the first
       * pass, before the concern came down, whatever left or died afterwards,
       * and the Partial rung could never occur. The residual is real and
       * intended: a column still under the bed when the basin wakes is the
       * column that stayed, and a climb after 20:31 is the tide's business.
       */
      revealAtTick: RELEASE,
      predicate: { kind: 'extract', role: 'seed', region: 'the-rim-furrow', count: 3 },
      reading: {
        met: 'Three of the column were in it when the basin woke, at three thousand metres on the lip, and it holds them.',
        unmet:
          "It's planted and nobody stayed. We'll say the count at home and we'll say where they were when we said it.",
      },
    },
    {
      id: 'the-ledger',
      text: "What is heard of us today is in three accounts we'll never read.",
      initial: ObjectiveStatus.Pending,
      // §8, §13 — Track and not Classification, and the document says why: the
      // exposure walk counts the player's structures, and the bed's own 8 is a
      // Classification (3.35 at its ceiling) to ears the player cannot move. At
      // Track the bed never enters, and what does is the sowing, a forgotten
      // barge, a ping from the bed, or the escorts' last seconds over the lip.
      predicate: { kind: 'tolerance', ticks: T(1), tier: ResolutionTier.Track },
      reading: {
        met: 'Somebody had us exact for a minute — hull and heading, not a smudge. By the next tide three navies know what we sound like when we plant, and the arrangement is over the way it was always going to be over: out loud.',
        unmet:
          "Nobody had the column exact. The bed they had, at a name, for most of a tide; the bed is in the account already, and the account is patient. The arrangement is over anyway, quietly, which is the way we'd have chosen if anybody had asked.",
      },
    },
    {
      id: 'the-returns',
      text: "There's something on the lip that isn't ours and isn't theirs. We'd like to hear it once before we plant near it.",
      initial: ObjectiveStatus.Pending,
      // §8 — the attend instrument at its fourth table: a return resolved at
      // Bearing or better by the player's own hulls while it sounds, once. No
      // `reading` here on purpose: the attendants' own entered-or-gap lines
      // assemble beneath the close, in the Commune's grammar (§12).
      predicate: { kind: 'attend', count: 1 },
    },
    {
      id: 'the-escorts',
      text: "Juno's people are at the staging with their guns struck. The furrow will hold them once it's a furrow. We're not asking them down, and they're not coming until the basin's awake.",
      initial: ObjectiveStatus.Pending,
      markerId: 'the-rim-furrow',
      // §8 — non-terminal, with a reading, so that the ending is never decided
      // by whether a gun came down. Right as an extract-at-reveal without a
      // reveal: the element is held at the staging until 20:30 and cannot be in
      // the furrow before it, so the row latches only when it arrives.
      predicate: { kind: 'extract', role: 'escort', region: 'the-rim-furrow', count: 3 },
      reading: {
        met: "Three guns came down at seventy-two into the basin's noise and every navy on the rim heard the plateaus' army arrive, struck. That's the sentence the Directorate wrote in 205, and we've finished it for them.",
        unmet:
          'Juno’s people stayed up. The arrangement ends without a gun in the water, and it ends.',
      },
    },
  ],

  /**
   * §9's beat table, in its order. Twenty-three minutes: Prospect's day plus
   * one hour of the tide, so the Commune is still on the lip when the concern
   * leaves it and the tide turns an hour later on whatever stands.
   *
   * Every scripted transit is authored rather than AI, for the standing reason
   * (docs/mission-sorrowgate.md §9): a mission's beats happen at the time the
   * document says they happen. The pair's three legs are `move` beats to the
   * player's own hulls — an ordinary order the player may countermand, and a
   * pair held off the second leg keeps the concern's heavy at nothing and the
   * returns at a smudge.
   */
  beats: [
    // 00:00 — the column under the bed, silent, and Teel's element at the
    // staging, silent and held. Silence costs the Commune 40 m/s against 32
    // and there is nowhere to go, so it costs nothing until the sowing.
    {
      atTick: 0,
      kind: 'silent',
      tag: 'the-barge',
      active: true,
      note: 'Under the bed and silent: 3.0, a Contact to the watch from 1,239 m and nothing from anywhere it stands today',
    },
    { atTick: 0, kind: 'silent', tag: 'the-sower', active: true, note: '' },
    { atTick: 0, kind: 'silent', tag: 'seed-two', active: true, note: '' },
    { atTick: 0, kind: 'silent', tag: 'seed-three', active: true, note: '' },
    {
      atTick: 0,
      kind: 'silent',
      tag: 'escort-one',
      active: true,
      note: '5.3 through open water, which is nothing to a Cruiser two and a half kilometres away',
    },
    { atTick: 0, kind: 'silent', tag: 'escort-two', active: true, note: '' },
    { atTick: 0, kind: 'silent', tag: 'escort-three', active: true, note: '' },
    {
      atTick: 0,
      kind: 'say',
      speaker: 'The watch, on the terraces',
      text: "We're on the terraces, where we've been since before anybody. The column's under the bed on the western lip and we can't hear it from here, which is the bed working. There's two things on the lip breathing on a count — we've got the nearer one, just, and we're not saying what it is. The concern's at the staging and hasn't come down. When it does, nobody on this rim will need telling.",
      note: 'Read, not heard — the standing status of the say channel',
    },

    // 00:30 — Anholt's coda. The briefing's last sentence, from the barge.
    {
      atTick: T(0, 30),
      kind: 'say',
      speaker: 'Bloomwright Sefa Anholt',
      text: "That's the day. It's theirs, and the next one's somebody else's, and we're planting on this one. We'd like you to notice we said *planting*.",
      note: '',
    },

    // 02:00 — the descent. Four hulls, stepped down the floors at 72: a
    // Contact to the pair's 70 from 5,924 m and a Track from the slopes
    // (4.61). The column, at HYD 5, hears none of it — 0.54 at its closest.
    {
      atTick: T(2),
      kind: 'move',
      tag: 'flagship',
      x: 3000,
      y: 2750,
      depthM: TERRACE_STATION_DEPTH_M,
      note: "The heavy's terrace station, seated by about 02:52 — 250 m south of the plan's seat, and §5 says why",
    },
    {
      atTick: T(2),
      kind: 'move',
      tag: 'reader-west',
      x: 2700,
      y: 2450,
      depthM: TERRACE_STATION_DEPTH_M,
      note: 'Seated by about 02:30',
    },
    {
      atTick: T(2),
      kind: 'move',
      tag: 'reader-east',
      x: 3300,
      y: 2450,
      depthM: TERRACE_STATION_DEPTH_M,
      note: '',
    },
    {
      atTick: T(2),
      kind: 'move',
      tag: 'bunkerage',
      x: 3000,
      y: 2850,
      depthM: TERRACE_STATION_DEPTH_M,
      note: '',
    },

    // 02:30 — the watch, on the descent (§12).
    {
      atTick: T(2, 30),
      kind: 'say',
      speaker: 'The watch, on the descent',
      text: "That's the concern coming down. Seventy-two, four of them, and everything on this rim has it. We said they'd come loud. They've never once come any other way.",
      note: '',
    },

    // 03:00 — Prospect's first leg, ordered to the player's own hulls (§13).
    {
      atTick: T(3),
      kind: 'move',
      tag: 'chart-a',
      x: 1800,
      y: 2150,
      note: "The pair charts eastward. The runtime's order is an ordinary order the player may countermand",
    },
    { atTick: T(3), kind: 'move', tag: 'chart-b', x: 1950, y: 2200, note: '' },

    // 04:00 — the watch walks the lip, seventeen seconds.
    {
      atTick: T(4),
      kind: 'move',
      tag: 'watch-a',
      x: 3600,
      y: 3300,
      note: '2,351 m from the bed: the bed nothing (0.95), a sowing a Bearing (2.13)',
    },
    { atTick: T(4), kind: 'move', tag: 'watch-b', x: 3750, y: 3350, note: '' },

    // 04:30 — the reconnaissance takes its measure.
    { atTick: T(4, 30), kind: 'move', tag: 'recon', x: 4600, y: 2100, note: '' },

    // 05:00 — reader-west to the first face: twenty-one seconds from the
    // terrace seat, so its station is 828 m from the bed from about 05:21.
    {
      atTick: T(5),
      kind: 'move',
      tag: 'reader-west',
      x: 900,
      y: 2500,
      note: 'The bed at Bearing (1.71) in its ears; a sowing now would be a Classification (3.85)',
    },

    // 05:30 — the plateaus, on an open channel. Prospect's line, verbatim,
    // spoken now by the player's own hulls (§12, §13).
    {
      atTick: T(5, 30),
      kind: 'say',
      speaker: 'The charting pair, for the plateaus',
      text: "We're here too — we thought you'd rather hear it from us than from your instruments. We're reading the rim for what could live on it. You're reading it for what can be taken out of it. The rim doesn't mind either of us yet. We'd ask you to notice the *yet*.",
      note: "The ending's largest single debt to the mix: a player reading a log will take this for the concern's (§13)",
    },

    // 06:30 — reader-east to the fourth face.
    { atTick: T(6, 30), kind: 'move', tag: 'reader-east', x: 3500, y: 2700, note: '' },

    // 07:00 — Prospect's second leg: 618 m from the heavy, and inside
    // Classification of `attendant-a`.
    { atTick: T(7), kind: 'move', tag: 'chart-a', x: 2700, y: 2100, note: '' },
    {
      atTick: T(7),
      kind: 'move',
      tag: 'chart-b',
      x: 2850,
      y: 2150,
      note: 'A Bearing (2.01) at idle to the heavy at its authored seat, and a Track only at cruise inside 621 m — which the leg reaches for less than a second (§5)',
    },

    // 08:00 — those below (§12), verbatim from Prospect.
    {
      atTick: T(8),
      kind: 'say',
      speaker: 'Watch-Speaker, for those below',
      text: 'The rim is attended. It was attended before the concern had a registry and it will be attended after. What is done on it this week is entered — in an account that is not yours, against a debt that is not stated.',
      note: '',
    },

    // 08:30 — reader-west to face-two, ten seconds: 673 m from the bed from
    // about 08:40, and the face it reads is 750.
    {
      atTick: T(8, 30),
      kind: 'move',
      tag: 'reader-west',
      x: 1700,
      y: 2750,
      note: 'The closest a Consortium ear comes to the plateaus all week: the bed at Classification (3.35), a sowing at Track (7.54)',
    },

    // 09:00 — the watch walks west, twenty seconds, and from about 09:20 has
    // the bed at a name (2.93) and the barge at a smudge (1.11): entered.
    {
      atTick: T(9),
      kind: 'move',
      tag: 'watch-a',
      x: 2400,
      y: 3400,
      note: 'The fact D+1 and D+2 inherit, and the one row the predicate union cannot carry: what the watch entered is authorship, not an objective (§8)',
    },
    { atTick: T(9), kind: 'move', tag: 'watch-b', x: 2550, y: 3450, note: '' },

    // 10:00 — the reconnaissance to its inner station; reader-east to the fifth.
    {
      atTick: T(10),
      kind: 'move',
      tag: 'recon',
      x: 3800,
      y: 2050,
      note: '2,818 m from the bed: nothing (0.54), which is the Order all day',
    },
    { atTick: T(10), kind: 'move', tag: 'reader-east', x: 4300, y: 2450, note: '' },

    // 11:00 — the Order (§12), verbatim from Prospect.
    {
      atTick: T(11),
      kind: 'say',
      speaker: 'Voice of the reconnaissance, for the Order',
      text: "The Order notes the concern's instruments are in tune, and returns the compliment of assuming it was meant. What the crystal is for, we will not discuss on an open channel. It would be discourteous to the crystal.",
      note: '',
    },

    // 11:30 — reader-west to the third face, where it stays until the ascent.
    {
      atTick: T(11, 30),
      kind: 'move',
      tag: 'reader-west',
      x: 2500,
      y: 2400,
      note: 'The nearest Consortium ear for the rest of the day, 1,512 m from the bed: the bed nothing (0.68), a sowing a Bearing (1.52)',
    },

    // 13:00 — Prospect's third leg: the pair turns for home water, 1,201 m
    // from the bed.
    { atTick: T(13), kind: 'move', tag: 'chart-a', x: 1200, y: 2050, note: '' },
    { atTick: T(13), kind: 'move', tag: 'chart-b', x: 1350, y: 2100, note: '' },

    // 13:30 — reader-east to the sixth and last face.
    { atTick: T(13, 30), kind: 'move', tag: 'reader-east', x: 5100, y: 2800, note: '' },

    // 14:00 — the watch resumes its station, thirty-seven seconds east, and
    // the quiet window opens.
    {
      atTick: T(14),
      kind: 'move',
      tag: 'watch-a',
      x: 4600,
      y: 3300,
      note: 'Home, 3,350 m off: a sowing is a Contact (1.21) and nothing else reaches',
    },
    { atTick: T(14), kind: 'move', tag: 'watch-b', x: 4750, y: 3350, note: '' },
    {
      atTick: T(14),
      kind: 'say',
      speaker: 'The watch, as the quiet window opens',
      text: "They've walked back east, both of them, to where they sit. The nearest ears now are the reader on the third face and the heavy on the terraces, and neither of those has a name for us at this range. The watch had one for the bed. It's had the bed since the morning, and it's going to have had it whatever we do next.",
      note: '',
    },

    // 17:00 — the reconnaissance withdraws, flank-quiet.
    {
      atTick: T(17),
      kind: 'move',
      tag: 'recon',
      x: 5200,
      y: 1600,
      note: "The seat it hears Teel's element from at 20:30, and the only Commune sound in its day",
    },

    // 20:30 — the riser's minute. Prospect's beat, verbatim: a hundred through
    // 1.6, lifting off the lip's floor 1,785 m east of the bed and climbing
    // toward the terraces at 12 m/s. `driveTo` carries no depth, so the drive
    // expires at about 2,330 m and the animal goes on climbing toward its own
    // 2,000 — the Drift's again, 1,946 m from the bed, hearing nothing under
    // it above Interest. It grinds nothing the plateaus own: `transit` takes
    // structures and hulls of 95 m and up, and the barge at 130 m is 1,750 m
    // off its line (§13).
    {
      atTick: RELEASE,
      kind: 'creature',
      tag: 'the-riser',
      species: FaunaSpecies.Sounder,
      spawnAt: { x: 3000, y: 3600, depthM: LIP_FLOOR_DEPTH_M },
      driveTo: { x: 3000, y: 2400 },
      untilTick: T(21, 30),
      loud: true,
      note: "The week's ledger of noise, come due — a Contact to the deaf column and a Track to everything else, and the noise the plateaus' army comes down inside",
    },
    // 20:30 — the ascent: seventy-three seconds of silent climb from 2,500 m
    // to 1,400, at cruise, north. Ascent adds nothing to SIG at all.
    {
      atTick: RELEASE,
      kind: 'move',
      tag: 'flagship',
      x: 3000,
      y: 420,
      depthM: CONCERN_DEPTH_M,
      note: 'The concern goes home the slow way',
    },
    {
      atTick: RELEASE,
      kind: 'move',
      tag: 'reader-west',
      x: 2850,
      y: 350,
      depthM: CONCERN_DEPTH_M,
      note: '',
    },
    {
      atTick: RELEASE,
      kind: 'move',
      tag: 'reader-east',
      x: 3150,
      y: 350,
      depthM: CONCERN_DEPTH_M,
      note: '',
    },
    {
      atTick: RELEASE,
      kind: 'move',
      tag: 'bunkerage',
      x: 3000,
      y: 550,
      depthM: CONCERN_DEPTH_M,
      note: '',
    },
    // 20:30 — Teel's element released into the riser's minute. The release
    // beat's tick is the hulls' own `releaseTick`, which is what the format
    // requires and what makes the hold a rule rather than a note. *the-furrow*
    // is revealed on this tick and scored from it (§8).
    {
      atTick: RELEASE,
      kind: 'release',
      tag: 'escort-one',
      note: 'From here it is 2,864–3,044 m and thirty-four to thirty-six seconds, and the floors step down under them as they run south',
    },
    { atTick: RELEASE, kind: 'release', tag: 'escort-two', note: '' },
    { atTick: RELEASE, kind: 'release', tag: 'escort-three', note: '' },

    // 20:35 — Teel, at the release (§12).
    {
      atTick: T(20, 35),
      kind: 'say',
      speaker: 'Warden Juno Teel',
      text: "We're coming down now, into their noise, and we're coming down struck. Those are two things, not one, and I'd like both heard — the second one especially, by whoever's on the lip with their ears open.",
      note: '',
    },

    // 21:00 — the watch, on the riser (§12).
    {
      atTick: T(21),
      kind: 'say',
      speaker: 'The watch, on the riser',
      text: "The basin's up. You'll not need us for where. The concern's going home the slow way, and we're not going anywhere, which is the whole of what we came to say.",
      note: '',
    },

    // 23:00 — the tide turns. A conclusion and not a timer: the day is read
    // where the column is, and campaign.md §10's telegraph is not owed to a
    // conclusion. It is paid anyway — the riser is loud at 20:30, a hundred
    // and fifty seconds ahead of the close (§8).
    {
      atTick: T(23),
      kind: 'resolve',
      conclusion: true,
      note: 'The writ turned north an hour ago and nothing in the table marks it. Whatever stands on the lip is the ending, and none of the three is the good one',
    },
  ],

  /**
   * §9's second table — the beats that fire on a condition rather than a tick,
   * in no order at all. None shares a choice group; none retires another.
   *
   * The first two are one event heard twice and fire in authored order on the
   * same pass: the ground turning, and Anholt saying so.
   */
  conditionalBeats: [
    {
      kind: 'ground',
      region: 'the-rim-furrow',
      // §4.3 and §13's headline row, and the one thing this document adds to
      // it: `pressureBonus` with no `biome`, no `floorM` and no `ceilingM`.
      // The lip is not repainted. The judge caps the biome spend at *Deep
      // Furrow* and *The Attending* 6, every figure in §7 is priced at 1.6
      // after the sowing as before it, and *holds a hull the deep never rated*
      // is the zone's sentence and not a PF write.
      pressureBonus: FURROW_GRANT,
      note: "The lip is a furrow. Without this row Teel's element crosses 1,800 m about fifteen seconds after its release and is dead at about 22:30, before the tide (§4, §13)",
      when: { kind: 'sound', count: 1 },
    },
    {
      kind: 'say',
      speaker: 'Bloomwright Sefa Anholt, as the lip turns',
      text: "There. That's the second one. It's called that because they said it would be, in writing, nine years ago, and we're keeping their word for them.",
      note: 'Fired by the sowing rather than by the clock: §9 puts the sowing at about 15:00 and means it as the document’s clock, not the player’s',
      when: { kind: 'sound', count: 1 },
    },
    {
      kind: 'say',
      speaker: 'Warden Juno Teel, in the furrow',
      text: "We came down, and we didn't strike anybody. We'd like both of those beside each other when it's read, and we know who'll be reading.",
      note: 'The first of her hulls inside the rectangle — the imperative mood not arriving for the third time in the campaign (§12)',
      when: { kind: 'extract', role: 'escort', region: 'the-rim-furrow', count: 1 },
    },
    {
      kind: 'say',
      speaker: 'The watch, on the ledger',
      text: "Somebody's had us exact for a minute — hull and heading, not a smudge. We'd like to know whose ears, and we never will.",
      note: "The ledger's own condition, said by the player's own pair the moment *the-ledger* is met (§9, §12)",
      when: { kind: 'tolerance', ticks: T(1), tier: ResolutionTier.Track },
    },
  ],

  /**
   * §8's Results, verbatim — Marr's three readings, read at home when the count
   * comes up the lanes a tide later, because she cannot be heard from the rim.
   *
   * None of the three is the good ending and the register does not say which
   * was right: a sown furrow with people in it, a sown furrow with nobody in
   * it, and no furrow are each read as what they are. The sentence Marr should
   * not say aloud is inside the *Complete* reading, because that is the reading
   * it costs the most in.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      "The deep's seeded. Thirty-three are under a bed at three thousand metres on the lip and it holds them, and the concern went home the slow way, and the Order measured its crystal, and the watch heard the bed and entered it in an account that isn't ours, and by this time tomorrow the arrangement that kept those below from ever having to fight is over, and the people it's over for first are the ones in the furrow, by household, with two more tides of this week still to come down on them. I opposed it. I ordered nobody. Both of those are still true and I'd like the record to show they were the same thing. There isn't a record.",
    [MissionOutcome.Partial]:
      "It's planted and it's empty. A garden nobody tends is a claim, and we've made one, at the bottom of the Rift, on ground everybody else calls something, and the column's on its way up through three navies' ears to tell us. This is a result. Sefa will say it's the seeding; Juno will say it's where the guns weren't; and we're saying it's the first thing we've ever owned.",
    [MissionOutcome.Lost]:
      "Nothing was planted. The rim is what it was, and the column's under a bed on it with the Kell seed still aboard, and somebody down there decided that, and it wasn't us, because we can't hear them. We've said we're still turning it for two hundred years. This is the first time it's been said at the bottom.",
  },
};
