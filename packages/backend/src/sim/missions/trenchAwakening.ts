/**
 * The Attending 5 — Trench Awakening. docs/mission-trench-awakening.md,
 * transcribed.
 *
 * A data literal in `intake.ts`' idiom: the document owns the forces, the
 * water, the beats, the numbers and the text. Where this file and that document
 * disagree, one of them is wrong and the fix says which.
 *
 * **This is the first mission in the campaign where the player's own force
 * grows**, and every consequence of that sentence is authored rather than
 * plumbed (§10). The row is handed a plant, a dome and a grower standing and
 * paid for at tick zero; the only economic verb it is asked for is a production
 * queue; and nothing a player raises is visible to the outcome ladder. The
 * `construction` lock is open for one engine reason and no design one —
 * `Match.produce` is refused by the same lock as `Match.build` (§2, §13) — so
 * the whole base loop comes through the door with the queue. §13 carries that
 * as a risk rather than a request, and this file states it rather than fencing
 * it.
 *
 * Five things make this mission the shape it is, and all five are data:
 *
 * - **The summons is two `creature` beats and the player's own ping** (§13).
 *   Trench Awakening — the faction ability the mission is named after — is not
 *   built, and a mission may not claim otherwise. The cheapest honest
 *   approximation is the one §13 proposes and this file authors: two authored
 *   transits up the axis, plus the ping the ladder already answers at
 *   `ACTIVE_SONAR.FAUNA_AGGRO_MULTIPLIER`. The difference is the whole
 *   difference — a ping summons to the pinger, the ability summons to a point
 *   — and it is why §4's fourth movement is about the ladder rather than about
 *   a button.
 * - **The band is one colossus, exactly** (§8, §12). Six Hollows at the
 *   roster's 35 are 210 and the band is 260, so *the called thing, rendered*
 *   is arithmetic rather than fiat: the walls alone cannot answer it. And
 *   `deliver` latches on the first pass the stockpile touches the figure
 *   (`isStanding`), which §8 authors knowing — a row that banks the first
 *   colossus may spend it afterwards.
 * - **`runsItsLength`, and the mission is unplayable without it** (§9). The
 *   muster is met at tick zero — eight is at least six — so a row that banked
 *   260 at 14:40 would meet both terminal rows and close the mission before
 *   `the-second` existed.
 * - **The close is not a conclusion** (§8). The tide does not end here and the
 *   row is not owed the courtesy: a row that spent the tide poorly watches the
 *   shortfall arrive on the instrument for the last five minutes of it. The
 *   telegraph campaign.md §10 asks for is `the-second` at 16:30 — 210 seconds
 *   against a rule of sixty, and the fourth of five audible warnings §8 lists.
 * - **Six Hollows placed and not driven**, `driveTo` at their own spawn and
 *   `untilTick: 0`, which hands each straight to its trigger model (§5, §13).
 *   `fauna: false`, because the default seeder is a skirmish roster and this
 *   mission needs six animals on two named walls and two arriving through a
 *   named door.
 *
 * And four findings this literal confirmed against the engine as built, all of
 * them §13's rather than new, stated here so a reviewer can overrule them
 * rather than discover them:
 *
 * 1. **A driven creature stops forty metres short of where it is sent**, and
 *    the geometry of §5 and §9 is measured against that. `act` holds a
 *    targetless creature at `stopAtM` 40, so `the-first` reaches (2500, 2040)
 *    rather than the axis head it is driven to, and the 13:00 line runs from
 *    there. §13's 349 m of swept line inside the Foundry's reach survives the
 *    shift — the line gains forty metres at the near end and loses forty at the
 *    far one, so the entry and the stop move together and the two answers are
 *    half a metre apart — and the colossus stops at (2742, 839), the document's
 *    own coordinate. It stops *inside* the footprint, 161 m from the Foundry's
 *    centre against 197.5 of reach, which is the whole of why finding 2 below
 *    matters: what kills the yard is the eleven and a half seconds of swept
 *    line, and the parked animal that follows grinds nothing at all.
 *
 *    What does not survive the shift is every figure §5, §9 and §13 measure
 *    from the point the beat *names*: a line of 1,226 m, 41 m off the grower's
 *    centre and 27.9 s to the reach become 1,265, 39.5 and 29.2, and §9's
 *    tilde-marked ~13:28 and ~13:37 become 13:29.2 and 13:38.3. Every one of
 *    them is asserted at the engine's figure and named at the document's in
 *    `missionTrenchAwakening.test.ts`; none of them moves a conclusion.
 * 2. **A driven creature that has arrived grinds nothing** — `transit` is
 *    called only inside the branch that moves it. So the grower is not camped,
 *    it is *crossed*: the 13:00 beat drives the colossus through the yard to
 *    (2750, 800), 39.5 m off the Foundry's centre, and 349 m of the line lies
 *    inside the 197.5 m of `lengthM / 2 + radiusM`. 11.6 s at 30 m/s against
 *    the 9.09 s that 2,000 HP at 220/s needs.
 * 3. **A grown hull is born at 600 m, armed, and carries no role.**
 *    `productionSystem` omits a depth and `spawnUnit` seats the hull at the
 *    deepest band its rating tolerates capped at Mid-Water, so the yard
 *    delivers 1,200 m above itself and every hull it grows dives that at a SIG
 *    floor of 72. The muster in §8 is therefore over the eight hulls this file
 *    seats, and says so rather than letting a player discover it at the close.
 * 4. **A Bastion on the player's party is the player's stake.** `reap`
 *    eliminates the slot whose Bastion falls, and elimination removes every
 *    entity that slot owns. Nothing on this map is aimed at the plant, and
 *    that is the document's answer to it (§3): the colossus is kept off the
 *    plant by geometry rather than by a flag that does not exist.
 *
 * Two things the document names and this literal deliberately does not build,
 * because §13 assigns them elsewhere: cross-mission Drift Health, and a
 * predicate over what the player has built or lost. The grower's loss is the
 * emotional centre of this mission and is read in the epilogue by hand,
 * because a scorable grower would be a defensible one.
 */

import {
  ATTENDING_TRENCH_AWAKENING_HEADER,
  Faction,
  FaunaSpecies,
  MissionOutcome,
  ObjectiveStatus,
  SIM,
  StructureKind,
  UnitKind,
  faunaStatsFor,
} from '@echoes/shared';

import type { MissionBeat, MissionDefinition, MissionUnit } from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/** Reserved and empty, as every Directorate literal reserves it (§5). */
const COURT = 1;
/** The intake stalls — a Directorate party that is a sound and nothing else. */
const STALLS = 2;

/**
 * §8, §12 — the band: two hundred and sixty, which is one colossus exactly.
 *
 * An authored number belonging to this literal, and the reason it is this
 * number: six Hollows at the roster's 35 are 210, so *the band is the called
 * thing, rendered* is true by arithmetic rather than by assertion. The test
 * holds both halves of that sum to the roster.
 */
const BAND = 260;
/** §8, §12 — "Six of eight muster. The Undermarshalcy does not round up." */
const MUSTER = 6;
/**
 * §8 — the closest honest shadow of *both colossi were rendered*, which no
 * predicate in the union can express: every one is a query over the observer's
 * own force and there is no `party` field to name anybody else's (§13). Four
 * hundred banked at once is one colossus and four animals exactly, and a
 * hundred and twenty short of two.
 */
const SECOND_READING = 400;

/** §11 — the row's water, and the first metre of the Abyssal band. */
const ROW_DEPTH_M = 1800;
/** §11 — the stalls' berths, cut a little deeper than the row. */
const STALLS_DEPTH_M = 1850;
/** §5, §11 — the six on the overhangs, at the species' own working depth. */
const HOLLOW_DEPTH_M = faunaStatsFor(FaunaSpecies.Hollow).workingDepthM;

/** §11 — where the First leaves the map southward. What is called comes through it. */
const SILL = { x: 2500, y: 3875, depthM: 2300 };
/** §5, §9 — the head of the axis, where `the-first` holds and calls. */
const AXIS_HEAD = { x: 2500, y: 2000, depthM: 2000 };
/** §3, §11 — the yard. The line at 13:00 passes 40 m from this point. */
const GROWER = { x: 2750, y: 1000 };
/**
 * §5, §9, §13 — north of the yard, and the far end of the line that spends it.
 *
 * Not the grower's own coordinate, deliberately: a driven creature that has
 * arrived grinds nothing, so the colossus is sent *through* the Foundry rather
 * than *to* it. The document's plan had it held on the apron and §13 records
 * why that would have ground nothing at all.
 */
const THROUGH_THE_YARD = { x: 2750, y: 800, depthM: 1850 };
/** §5, §9 — the head of the axis, 700 m south of the row, where the second stands. */
const SECOND_HOLD = { x: 2500, y: 1750, depthM: 1900 };

/**
 * One of the row's two heavy hulls — an Abyssal Submersible with live fire
 * control and the role every hull on this map carries.
 *
 * PR-3 is the roster's, no refit: 1,800 m is the first metre of the Abyssal
 * band and the Submersible is rated for it. These two are also the only things
 * on the map a colossus can touch — 95 m of hull is exactly
 * `DRIFT.TRANSIT_MIN_HULL_M` — and neither of them is within 500 m of the line
 * the 13:00 beat draws (§6).
 */
const row = (ordinal: string, x: number, y: number, note: string): MissionUnit => ({
  tag: `row-${ordinal}`,
  kind: UnitKind.AbyssalSubmersible,
  x,
  y,
  depthM: ROW_DEPTH_M,
  role: 'yard',
  armed: true,
  note,
});

/**
 * One of the cohort — a Chorister, seated in the yard's own strip of worked
 * ground, armed, and refit to PR-3.
 *
 * **The refit is written down rather than derived** (§2, §13). The Directorate
 * baseline lifts the hull's PR-2 to 3 for nothing (`effectivePressureRating`),
 * but `missions.test.ts` reads `statsFor(kind).pressureRating` — so a Chorister
 * authored at 1,800 m without the field is a hull the suite reads as dying of
 * crush where it stands. A finding against the test rather than the runtime,
 * and docs/mission-the-dome.md §13 records the same row.
 *
 * At 50 m of hull a Chorister is 45 m under `DRIFT.TRANSIT_MIN_HULL_M`, so a
 * colossus cannot touch one — which is why it is the only hull in the game
 * that renders one (§2).
 */
const chorister = (ordinal: string, x: number, note: string): MissionUnit => ({
  tag: `row-${ordinal}`,
  kind: UnitKind.Chorister,
  x,
  y: 1050,
  depthM: ROW_DEPTH_M,
  role: 'yard',
  armed: true,
  pressureRating: 3,
  note,
});

/**
 * A Hollow, placed and not driven (§5, §13).
 *
 * The `creature` beat's `driveTo` is required, so an ambusher that must not be
 * driven is committed to its own spawn until tick zero — the first mission pass
 * finds the commitment already expired, hands the creature its ears and its
 * hull back, and leaves it to the trigger model: SIG 3 coiled, Interest at 45,
 * a strike only inside Commit. `loud: false`, because nothing about a coiled
 * animal is a precursor to anything.
 *
 * No `driveTo.depthM`: released on the first pass, the animal holds the
 * species' own working depth, which is the 1,700 m §11 seats it at. The two
 * colossi are the other way round and say so.
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

export const ATTENDING_TRENCH_AWAKENING: MissionDefinition = {
  ...ATTENDING_TRENCH_AWAKENING_HEADER,
  doc: 'docs/mission-trench-awakening.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Directorate,
  courtSlot: COURT,
  /** §5, §11 — all eight animals are authored; the seeder places none. */
  fauna: false,
  /**
   * §9 — and the flag this mission cannot be played without. `the-row` is met
   * at tick zero, so without it a row that banked the band at 14:40 would close
   * the mission before the second colossus existed.
   */
  runsItsLength: true,
  /**
   * §5, §11 — six hundred, the yard's own stock. Biomass opens at zero because
   * `startingNodules` is the only opening stock a mission can author, which is
   * exactly the shape §6 wants: the row cannot grow a hull until it has
   * rendered something.
   */
  startingNodules: 600,
  /**
   * §4 — fifty-five, the grower's own producing figure and the loudest single
   * thing the row owns. A description, not a ceiling (campaign.md §10), and the
   * first in this campaign whose breach has a price that is neither a
   * silence-debt nor a navy: the ground collects it, at 0.02 a second per point
   * over 60, in the cell the noise was made in.
   */
  sigBudget: 55,
  // §2 — no silence order. No arrayTag, so the ledger never runs: this is the
  // mission where the Directorate is strong and is charged for it by the ground
  // rather than by the Cantorate. Everything that makes you strong makes you
  // loud (docs/economy.md §1).
  silenceCeilingSig: 100,
  debtCapS: 0,
  /** §2 — no held freight: eight hulls that move on their own orders. */
  escortRadiusM: 0,

  /**
   * §13 — empty, and empty on purpose. No predicate here addresses a rectangle:
   * nothing on this map is a place the row is sent to, so the mission authors
   * no region and no marker. The map paints all eight of §11's; none of them is
   * a rule.
   */
  regions: [],
  markers: [],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Directorate,
      note: 'The row, shallow band — two Abyssal Submersibles, six Choristers, a draw plant, a listening dome and a grower. Armed, six hundred nodules, no Biomass (§2, §5)',
      units: [
        row(
          'one',
          2000,
          1100,
          "The western heavy hull, 510 m from the dome and inside its 1,200 m. 676 m off the line the colossus draws at 13:00, and the row's own opening ear: the nearest coiled Hollow is 1,552 m out against 1,231 m of Contact"
        ),
        row(
          'two',
          3200,
          1100,
          'The eastern heavy hull, 1,703 m from the dome and outside it. 500 m off the line. It has the stalls at Classification from 1,055 m, which is the only sound on this map that is a person'
        ),
        chorister(
          'three',
          2200,
          'The westernmost of the cohort, and the first of the five the dome covers'
        ),
        chorister('four', 2320, ''),
        chorister('five', 2440, ''),
        chorister('six', 2560, ''),
        chorister('seven', 2680, 'The last one inside the dome, at 1,181 m of its 1,200'),
        chorister(
          'eight',
          2800,
          'The easternmost, at 1,301 m from the dome and outside it. HYD 75 rather than 95 is sixteen per cent less range, and nobody says so'
        ),
      ],
      structures: [
        {
          tag: 'draw-plant',
          kind: StructureKind.Bastion,
          x: 1000,
          y: 1000,
          depthM: ROW_DEPTH_M,
          note: "The band's own plant, and the difference between a ten-second hull and a forty-second one: six of draw capacity against the grower's demand of four is satisfaction 1.0 from tick zero (§3). It is also the row's stake — `reap` eliminates the slot whose Bastion falls — and nothing on this map is aimed at it, which is the document's answer to that (§13)",
        },
        {
          tag: 'dome',
          kind: StructureKind.Cantor,
          x: 1500,
          y: 1000,
          depthM: ROW_DEPTH_M,
          note: "The listening dome docs/mission-exposure.md §6 hears from outside as a Cantor's idle hum, heard from underneath it this time. +25 HYD capped at 95 within 1,200 m, which reaches six of the eight and is not a fence — the row can walk into it",
        },
        {
          tag: 'grower',
          kind: StructureKind.Foundry,
          x: GROWER.x,
          y: GROWER.y,
          depthM: ROW_DEPTH_M,
          note: 'The yard. `PRODUCIBLE` lists the Chorister off a Foundry at 30 nodules, 20 Biomass and ten seconds, and producing takes the structure from SIG 25 to 55 — Contact to a Chorister from 7,011 m in trench water and 4,546 m in the yard’s own cut ground. It is what the colossus is sent through at 13:00, and it is not an objective (§8)',
        },
      ],
    },
    {
      slot: STALLS,
      faction: Faction.Directorate,
      note: "The intake stalls — the reassigned's berths, heard as maintenance. Not a navy: a slot and one sound, and nobody remarks on it (§5)",
      units: [],
      emitters: [
        {
          tag: 'stalls',
          x: 4250,
          y: 1000,
          depthM: STALLS_DEPTH_M,
          /** §5, §7 — twelve, and the eight per cent working. */
          sig: 12,
          // §7 — "thirty on and thirty off", for the whole tide: no window, so
          // the pattern runs from tick zero forever.
          periodTicks: T(1),
          onTicks: T(0, 30),
          hp: 5000,
          // No `reading`, deliberately (§5): the stalls cannot be attended and
          // cannot count. They are here because the eight per cent are.
          note: 'Classification from `row-two` at 1,055 m, through the worked ground both stand under. 901 m from `hollow-four`, which is the coordinate §13 moved: `payBiomass` attributes a kill to the nearest owned entity off the Drift slot, emitters included, so no rendering on this map may be closer to the berths than to the 650 m hull that made it',
        },
      ],
    },
  ],

  /**
   * §2 — what the row does not carry, as dead affordances with the reason
   * shown. Weapons, torpedoes and noisemakers are live; so is the ping, and so
   * is construction, and both of those absences are the mission.
   */
  locks: [
    {
      ability: 'mines',
      reason: 'nothing is left in the water the band renders',
    },
    {
      ability: 'depthCharges',
      reason: 'a row whose income walks onto its own ground does not seed it with ordnance',
    },
  ],

  /**
   * §8's three rows, in its order: the band and the muster decide the count,
   * and the third is read out and never ranked.
   */
  objectives: [
    {
      id: 'the-band',
      text: 'The band is two hundred and sixty. It is rendered from what the trench brings, and this tide the trench is sounded.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      // §8 — Biomass banked, read off the player's own economy record, and a
      // floor that latches: `deliver` is not standing, so the first pass the
      // stockpile touches 260 sets Met. A row that banks the first colossus may
      // spend it afterwards; a row that spends as it goes must still hold 260
      // at once, and six Hollows at full rate are 210.
      predicate: { kind: 'deliver', account: 'biomass', amount: BAND },
    },
    {
      id: 'the-row',
      text: 'Six of eight muster. The Undermarshalcy does not round up.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      // §8 — a standing count over the eight hulls the mission seated,
      // re-derived every pass (`isStanding`). Met at tick zero, which is why
      // `runsItsLength` is set. Grown hulls carry no role and are counted by
      // nothing, which is a property of the format and not a decision (§13).
      predicate: { kind: 'survive', role: 'yard', count: MUSTER },
    },
    {
      id: 'the-second',
      text: 'Nobody said how many would answer.',
      initial: ObjectiveStatus.Pending,
      // §8 — shown from 00:00, because a row that reads *nobody said how many
      // would answer* at the start of a tide and finds out at 16:30 has been
      // told something. Non-terminal: read out at the close and unable to touch
      // Complete, Partial or Lost.
      predicate: { kind: 'deliver', account: 'biomass', amount: SECOND_READING },
      reading: {
        met: 'Four hundred against the band. Two were called and the record is heavy enough for two. It is not entered that both were taken, because the record counts what is banked and not what is left in the axis.',
        unmet:
          'Four hundred is not against the band. Two were called; one is in the record, or neither, and the gap is entered.',
      },
    },
  ],

  /**
   * §9's beat table, in its order. Twenty minutes, and the close is **not** a
   * conclusion (§8): the tide does not end here and the row is not owed the
   * courtesy. campaign.md §10's telegraph is paid by `the-second` at 16:30 —
   * 210 seconds against a rule of sixty — and four more times over besides.
   *
   * The renderings are not here. §9 prints the first at about 02:00 because the
   * Hollows are where §11 places them and a row that leaves at 00:00 covers the
   * 1,552 m to the west wall in 39 s; they are not scripted kills, and the line
   * that marks one is fired by the tally instead.
   */
  beats: [
    {
      atTick: 0,
      kind: 'say',
      speaker: 'Undermarshal Setha Korrin',
      text: 'The shallow band is at work. Eight hulls are given to the row, and a plant, and a dome, and a grower. The band is two hundred and sixty. It is not rendered from the walls alone; the walls are two hundred and ten and the Undermarshalcy can add. What is short of it is what the trench answers with.',
      note: "Read, not heard — the standing status of the say channel. The whole assignment is the header's briefing; this is the part the water is told",
    },
    // 00:00 — the six on the two overhangs, at working depth 1,700 m over a
    // 2,150 m floor (§5, §11). The nearest is 1,552 m from `row-one` against
    // 1,231 m of Contact, so the row opens the tide unable to hear a single
    // thing it is there to earn — Intake's opening arithmetic, its second life.
    hollow('one', 500, 1500, 'West overhang — the nearest of the six, and still out of hearing'),
    hollow('two', 750, 2250, ''),
    hollow('three', 500, 2500, ''),
    hollow(
      'four',
      4750,
      1750,
      'East overhang. 901 m from the stalls, which is why it stands here rather than nearer: no rendering on this map may be banked by the berths (§13)'
    ),
    hollow('five', 4250, 2250, ''),
    hollow('six', 4500, 2500, 'The sixth. Four kilometres from the first, and the same shift'),

    // 01:00 — the ground, on the row's channel. The tide's first sound is a
    // statement that there is nothing to hear (§12).
    {
      atTick: T(1),
      kind: 'say',
      speaker: 'The ground',
      text: "The nearest of the row's living is on the west wall, and it is not coming. Nothing on this map comes to the row. The row goes out to the wall, and the wall is a kilometre and a half, and that is the shift.",
      note: 'The mission opens on a walk, and the ground files the walk as a fact about water',
    },

    // 05:00 — the yard, on its own procedure. A birth filed as a depth (§12).
    {
      atTick: T(5),
      kind: 'say',
      speaker: 'The yard',
      text: 'The yard delivers at six hundred metres. That is above the layer and it is a kilometre and two hundred above the band, and what is grown comes down at seventy-two. The band will hear every hull it is given arrive, which is what a band is.',
      note: "§6, §13 — `productionSystem` omits a depth and `spawnUnit` caps at Mid-Water, so this is the engine's behaviour read out as procedure rather than apologised for",
    },

    // 07:00 — Korrin, on the stalls' channel. The one paragraph in the campaign
    // about the eight per cent that is neither an assignment nor a finding, and
    // the only way this register can say *and she visits* (§12).
    {
      atTick: T(7),
      kind: 'say',
      speaker: "Undermarshal Setha Korrin, on the stalls' channel",
      text: 'The shallow band is attended. It is not a posting anybody asked for and it is not one anybody is ashamed of, and the Undermarshal is here because it was said she would be.',
      note: 'Her own visit stated in the passive, as a thing said about her',
    },

    // 10:00 — the Call. Korrin sounds the trench, and what answers is not
    // steered (§4, §12). The superweapon this mission is named after does not
    // exist, so the summons is this line, the beat below it, and the ping the
    // ladder already answers at three times weight (§13).
    {
      atTick: T(10),
      kind: 'say',
      speaker: 'Undermarshal Setha Korrin',
      text: 'The trench is sounded. What answers is not chosen and is not steered. It is rendered, or it is entered as having passed.',
      note: 'The Call, and the mission’s thesis said once and never again',
    },
    {
      atTick: T(10),
      kind: 'creature',
      tag: 'the-first',
      species: FaunaSpecies.Sounder,
      spawnAt: SILL,
      driveTo: AXIS_HEAD,
      untilTick: T(13),
      loud: true,
      note: 'Up the axis from the sill at the roster’s 30 m/s, at 2,000 m: 1,835 m of travel to a stop forty metres short of the head, so it arrives at 11:01 and holds there — deaf, unkillable and calling at 100. SIG 100 at 2,820 m is a ratio over twice Track at `row-one`, the loudest authored sound in the bible',
    },

    // 12:00 — the ground files the line. Ten minutes of warning against §10's
    // sixty, and the second of the five §8 counts (§12).
    {
      atTick: T(12),
      kind: 'say',
      speaker: 'The ground',
      text: 'One is coming up the First and it is not attending anything. Its line is the axis. The row is not asked to hold the axis.',
      note: 'A fact about water and a piece of ground the row is not asked to hold',
    },

    // 13:00 — the commitment is replaced, and the yard is spent. A second beat
    // for one tag *replaces* the first rather than joining it, so this is the
    // same transit turned rather than a second animal. Through the yard, not to
    // it: a driven creature that has arrived grinds nothing (§13).
    {
      atTick: T(13),
      kind: 'creature',
      tag: 'the-first',
      driveTo: THROUGH_THE_YARD,
      untilTick: T(14, 30),
      loud: false,
      note: 'A line of 1,265 m walked to within forty of its far end at 30 m/s, passing 39.5 m from the grower’s centre: 349 m of it lies inside the Foundry’s 197.5 m of reach — 11.6 s against the 9.09 s that 2,000 HP at 220/s needs — so the grower comes apart about 13:38, spiking to `DRIFT.TRANSIT_SIG`. Nothing else is on the line: `row-two` is 500 m off it, `row-one` 676 m, and every Chorister is 45 m under the length a colossus notices',
    },

    // 14:30 — the commitment lapses. The runtime hands back `senseS`, restores
    // `homeDepth` to the species' 2,000 m — clamped by the row's 1,850 floor —
    // and clears `driven`, so the animal becomes 9,000 HP of Biomass that
    // twelve Choristers take in 37.5 s (§12, §13).
    {
      atTick: T(14, 30),
      kind: 'say',
      speaker: 'The ground',
      text: 'What was called went to the grower, and the grower is entered as spent. The animal is in the row and is not steered.',
      note: 'It stands 161 m north of where the grower was: hearing again, killable again, committed to nothing',
    },

    // 16:30 — the second call, and nobody said there would be one. The
    // telegraph the close is measured from: 210 seconds against §10's sixty.
    {
      atTick: T(16, 30),
      kind: 'creature',
      tag: 'the-second',
      species: FaunaSpecies.Sounder,
      spawnAt: SILL,
      driveTo: SECOND_HOLD,
      untilTick: T(18, 30),
      loud: true,
      note: '2,085 m of travel to a stop forty metres short of the head of the axis, arriving 17:40 and released at 18:30 with no line from anybody. Nothing there reads over its Interest of 55, so it stands until the row makes it move — a ping at 834 m, a noisemaker at 347 m, or a hull inside 196 m',
    },

    // 17:00 — the stalls, and the only line the eight per cent are given (§12).
    {
      atTick: T(17),
      kind: 'say',
      speaker: 'The stalls',
      text: 'A second is coming up the First. Nobody said one.',
      note: 'Forty seconds before it arrives, and three minutes before the close',
    },

    // 19:00 — the muster is called, and the band is read as it stands (§12).
    // Nothing is revealed here: every objective has been showing since 00:00.
    {
      atTick: T(19),
      kind: 'say',
      speaker: 'Undermarshal Setha Korrin',
      text: 'The muster is called. The band is read as it stands.',
      note: 'Said once. A row that spent the tide poorly has watched the shortfall for five minutes by now',
    },

    // 20:00 — the close. Korrin reads the band and the muster — that is the
    // epilogue and `the-second`'s reading beneath it — and then says one
    // sentence she should not, in the active, claiming the act (§12).
    {
      atTick: T(20),
      kind: 'say',
      speaker: 'Undermarshal Setha Korrin',
      text: "I called it. Enter it under my name and not the row's. It is the first thing the Undermarshalcy has ever asked for, and two came.",
      note: 'The fifth consecutive Directorate mission to close on one sentence she should not say aloud, and the first in which she claims the act',
    },
    {
      atTick: T(20),
      kind: 'resolve',
      // Not a conclusion (§8): the tide does not end here and the row is not
      // owed the courtesy. The telegraph is `the-second` at 16:30, 210 seconds
      // against campaign.md §10's sixty.
      note: 'The close. The band and the muster are read as they stand, and the grower is read by hand',
    },
  ],

  /**
   * The two lines fired by the tally rather than by the clock — §9's own second
   * table, in docs/mission-intake.md §12's idiom: a row that finds the first
   * animal at 01:40 hears the Cohort-Prime at 01:40.
   *
   * No `choiceGroup`. The two are not a choice: 35 comes before 260 on every
   * run that reaches 260 at all, and a row that never renders hears neither.
   */
  conditionalBeats: [
    {
      kind: 'say',
      speaker: 'The Cohort-Prime of the row',
      text: 'Rendered. Thirty-five against the band, and the animal is entered too. The row is not being tested. It is a shift, and it will be one afterwards, and it was one before anybody was posted to it.',
      note: 'Thirty-five is the roster’s figure for a Hollow, and the condition reads it from the roster — docs/mission-intake.md §12’s line given to the people it was about',
      when: {
        kind: 'deliver',
        account: 'biomass',
        amount: faunaStatsFor(FaunaSpecies.Hollow).biomass,
      },
    },
    {
      kind: 'say',
      speaker: 'The ground',
      text: 'The band is answered. What answered it is entered too.',
      note: 'Keyed on the band’s own account and the same figure the objective carries, so the line and the counter cannot disagree by a rendering',
      when: { kind: 'deliver', account: 'biomass', amount: BAND },
    },
  ],

  /**
   * §8's Results, verbatim — Korrin's three readings, with `the-second`'s
   * reading printing beneath whichever row the run earned.
   *
   * Neither terminal objective is a keystone: a row that banked the band and
   * lost its grower and one that kept everything and banked short read as the
   * same sentence, because the Directorate does not price bodies against
   * income (docs/mission-intake.md §8).
   */
  epilogue: {
    [MissionOutcome.Complete]:
      'The band is answered and the row is mustered. What was called came, went to the loudest thing in the water, which was ours, and was rendered by the hulls it could not hear. Both are entered. So is the grower, which is the part people forget is also a record.',
    [MissionOutcome.Partial]:
      'You were sufficient. The band is answered or the row is mustered, and the other is short. A row that fed a colossus its own grower and rendered it anyway has done the whole of what a shallow band is for.',
    [MissionOutcome.Lost]:
      'No band and no muster. The trench was sounded and what came was not rendered, and it is in the axis still. It is not a failure of the row; it is a call that was answered twice, and the Undermarshalcy will not sound it a third time from this band.',
  },
};
