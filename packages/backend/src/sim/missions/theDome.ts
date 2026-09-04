/**
 * The Attending 3 — The Dome. docs/mission-the-dome.md, transcribed.
 *
 * A data literal in `intake.ts`'s idiom: the document owns the forces, the
 * water, the beats, the numbers and the text. Where this file and that
 * document disagree, one of them is wrong and the fix says which.
 *
 * Five things make this mission the shape it is, and all five are data:
 *
 * - **It is *Baffle*'s tide from the counting side, and the seam is meant to
 *   be invisible.** Every convoy seat, both stations, the plant and the pack
 *   are `baffle.ts`'s, unchanged (§5, §13). The one thing that moves is which
 *   party they are on: the convoy is scripted here, so its legs are authored
 *   to *Baffle* §9's clock and carry `depthM`, and the picket that was
 *   scripted there is the player's.
 * - **Ten hulls, armed, and seated silent.** Ten `silent` beats at tick zero —
 *   Sorrowgate's idiom for Kalliso's approach, used on the player's own force.
 *   The auto-acquire path refuses a silent hull, so §3's "armed and quiet" is
 *   honest rather than a promise: a picket that never drops silence never
 *   fires, and it opens at 4.8 and 4.3 rather than at the eight the band's
 *   ceiling would suggest (§13).
 * - **The Call is the world's, not the player's.** Six `MissionEmitter`s on
 *   their own slot, SIG 16, six periods, from 13:00 to 15:00 — §13's stated
 *   approximation of the Chorus Call, which is a sentence in
 *   docs/systems-echo.md §8 and nothing in `packages/`. The player does not
 *   fire it, does not choose the point and cannot decline it; the decision the
 *   mission asks for is whether to *enter* it.
 * - **The silence ledger points at a role that is not the one being helped.**
 *   `silenceRole: 'watch'` at ceiling 30, cap 30 s, with `arrayTag: 'dome'` —
 *   so the guns that owe the debt are four kilometres from the six hulls that
 *   lose the ears (§4.2). Attendance's mechanism, aimed sideways.
 * - **The count is taken at the whistle and not during the gate.** `the-mouth`
 *   is revealed at 19:00 — Intake's roll idiom — because `extract` is not a
 *   standing predicate and latches Met on the first pass it is true
 *   (`predicates.ts`, `isStanding`). Revealed at 00:00 it would be met at
 *   00:00 by the second watch sitting in its own seat, and the mouth would be
 *   "attended" by two hulls the flagship destroyed at 14:00 (§8).
 *
 * And three authoring findings against the document, stated here rather than
 * discovered, in the manner `intake.ts` states its own:
 *
 * 1. **The tide runs its length, and §13's row says it does not.** §13 lists
 *    "no `runsItsLength`" among the definition's fields. Both terminal rows
 *    can be Met on the very pass `the-mouth` is revealed: `the-picket` is
 *    `survive` at three of four and is trivially true from tick zero, and
 *    `the-mouth` latches the moment the second watch is found in its own seat
 *    at 19:00 — which is exactly where §11 seats `watch-three` and
 *    `watch-four`, inside the region's north half. Without the flag
 *    `deriveObjectives` resolves at T(19) and the mission closes a minute
 *    early, taking the pack's last sixty seconds, Korrin's line and the
 *    document's own "the close at 20:00 is not a conclusion" with it. The flag
 *    is authored; §13's row is the thing that is wrong.
 * 2. **The basin does not hold 2,300 m, and the document's own §13 is why.**
 *    §7 puts the Sounder at (2000, 5875) at 2,300 m and prices the dome's 35
 *    at 625 m off it; §13 asks for Intake's idiom — `driveTo` at its own spawn
 *    with `untilTick: 0` — which expires on the first pass and hands the
 *    animal back to its own trigger model, `homeDepth` and all. A released
 *    creature homes to its species' working depth, and a Sounder's is 2,000 m
 *    (`fauna.ts`, `holdCommitments`), so it climbs three hundred metres at the
 *    Drift's 12 m/s over the first half-minute. It is authored as §13 asks,
 *    because a live commitment would deafen the one animal §4's fourth
 *    movement needs awake, and the drift is recorded rather than corrected
 *    here.
 * 3. **The ten `silent` beats make §7's and §11's Drift-side arithmetic
 *    unreachable, and the literal keeps the beats.** Both `listen` and
 *    `driftTick` read `Acoustic.sig`, which is 4.33 for a silent Chorister
 *    rather than the roster's 16. So §7's "six idling Choristers read 4.3 to
 *    9.0" is 1.2 to 2.4 here, and §11's ledger under the foot does not add up
 *    as written: three silent Choristers west of x = 1,500 sum 13 and not 48,
 *    and the three east of it plus the dome's own 35 sum 48 and not 83 —
 *    twelve *under* the threshold of 60, so the Cantorate's instrument wears
 *    nothing. What takes that cell over is the yard's failing plant, which
 *    stands in the same cell and strikes at 35 for two seconds of every eight:
 *    13 + 35 + 35 is §11's own 83 and 0.46 a second, reached from the
 *    concern's side rather than the Cantorate's. §3 and §10 are emphatic that
 *    the tide opens with the button pressed, and §11 reads no cell and tells
 *    nobody, so the beats stand and the discrepancy is recorded — and
 *    asserted, both ways, in `missionTheDome.test.ts`.
 */

import {
  ATTENDING_THE_DOME_HEADER,
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
 * Reserved and empty, as the other two Attending missions reserve it — and
 * here it is also the slot the ledger hands the dome's grant to while the
 * picket owes a silence (§2). A party in it would break the format's own rule.
 */
const COURT = 1;
/** The relief convoy — *Baffle*'s player, scripted (§5). */
const CONVOY = 2;
/** The Deep Yard — forty-one souls, whose only asset in the water is a sound. */
const YARD = 3;
/**
 * The Call — six sounds and nothing else (§2).
 *
 * It carries a faction because a party must, and the faction is the
 * Directorate's, so the six voices are heard by the Drift at ×0.4 like
 * everything else this faction emits. It carries no hulls, and §13 says why:
 * hostility is `Owner.slot`, so a friendly scripted Directorate party with
 * hulls in it would be auto-acquired by the picket's own guns.
 */
const CALL = 4;

/** §3, §11 — the two standing watches, across the trench at 1,600 m. */
const WATCH_DEPTH_M = 1600;
/** §11 — the array and the dome on the last bench, over a 2,400 m floor. */
const FOOT_DEPTH_M = 2300;
/** §4, §11 — the Call stands in the Fan, 350 m above the array that is under it. */
const CALL_DEPTH_M = 1950;
/** §4 — the loudness of a Chorister at rest, which is what the lie is shaped from. */
const CALL_SIG = 16;
/** §4 — five seconds on, whatever the period. */
const CALL_ON = 5 * SIM.TICK_HZ;

/**
 * One of the picket — *Baffle*'s four, in *Baffle*'s seats (§3, §5).
 *
 * PR-3 is the roster's and no refit is needed at 1,600 m; the trench floor
 * stops at 1,700, which is Mid-Water's last hundred metres. Armed, because
 * this is the first Directorate mission with another navy at the other end of
 * the guns — and seated silent by a beat, which is what makes "armed and
 * quiet" true rather than merely stated (§3).
 */
const watch = (ordinal: string, x: number, y: number, note: string): MissionUnit => ({
  tag: `watch-${ordinal}`,
  kind: UnitKind.AbyssalSubmersible,
  x,
  y,
  depthM: WATCH_DEPTH_M,
  role: 'watch',
  armed: true,
  note,
});

/**
 * One of the array — the cohort hull, fielded at last (§3).
 *
 * `pressureRating: 3` on every one of the six, and it is not decoration:
 * `missions.test.ts` reads the *hull's* rating rather than
 * `effectivePressureRating`, so the Directorate's PR-3 faction baseline does
 * not rescue a PR-2 Chorister authored at 2,300 m. §13 records the finding and
 * says every Directorate document that fields Choristers below the Abyssal
 * line will write the same six words.
 */
const chorister = (ordinal: string, x: number, note: string): MissionUnit => ({
  tag: `array-${ordinal}`,
  kind: UnitKind.Chorister,
  x,
  y: 5450,
  depthM: FOOT_DEPTH_M,
  role: 'array',
  armed: true,
  // The refit, written on the hull because the mission stands it here.
  pressureRating: 3,
  note,
});

/** Silent Running on, at tick zero, on a hull of the player's own force (§3). */
const seatedSilent = (tag: string, note: string): MissionBeat => ({
  atTick: 0,
  kind: 'silent',
  tag,
  active: true,
  note,
});

/**
 * One voice of the Call — an emitter with a window and a period of its own
 * (§4.3).
 *
 * Six different periods, five seconds on: the beat frequencies are what makes
 * a smudge with a rhythm rather than six copies of one sound, and they are the
 * half of this mission that exists only in prose until the mix does
 * (docs/audio-direction.md; §13).
 *
 * 5,000 hp is not durability, it is the whole of what stands between a lie and
 * a Cruiser that decided to argue with it: auto-acquire skips a
 * `StaticEmitter` for the mine's reason, but an *ordered* shot at a resolved
 * emitter still lands, and eighty-three seconds of a Cruiser's 60 a second is
 * against a two-minute window in water the convoy never enters (§13).
 */
const voice = (
  ordinal: string,
  x: number,
  y: number,
  periodS: number,
  note: string,
  reading?: { entered: string; gap: string }
): MissionEmitter => ({
  tag: `call-${ordinal}`,
  x,
  y,
  depthM: CALL_DEPTH_M,
  sig: CALL_SIG,
  periodTicks: periodS * SIM.TICK_HZ,
  onTicks: CALL_ON,
  hp: 5000,
  fromTick: T(13),
  untilTick: T(15),
  // Only `call-a` carries one: the other five are countable by nothing, so
  // the count cannot be padded by hearing the same lie six times (§6).
  reading,
  note,
});

/**
 * One leg of the convoy, in formation — §5, so the literal has it and nobody
 * invents it.
 *
 * §9 gives the flagship's seat at every leg after the muster; the escorts hold
 * a hundred metres either side of it and fifty ahead, the barge trails a
 * hundred and fifty astern, and all four carry the flagship's authored depth.
 * The two pockets are the exception — a pocket is 250 m square and the
 * formation is 300 m wide — so those two legs are authored seat by seat below
 * rather than through this helper.
 */
const leg = (atTick: number, x: number, y: number, depthM: number, note: string): MissionBeat[] => [
  { atTick, kind: 'move', tag: 'flagship', x, y, depthM, note },
  { atTick, kind: 'move', tag: 'corvette-1', x: x - 100, y: y - 50, depthM, note: '' },
  { atTick, kind: 'move', tag: 'corvette-2', x: x + 100, y: y - 50, depthM, note: '' },
  { atTick, kind: 'move', tag: 'plant-barge', x, y: y + 150, depthM, note: '' },
];

export const ATTENDING_THE_DOME: MissionDefinition = {
  ...ATTENDING_THE_DOME_HEADER,
  doc: 'docs/mission-the-dome.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Directorate,
  courtSlot: COURT,
  /** §3, §11 — every animal on this map is a beat. */
  fauna: false,
  /**
   * §8, §9 — the count is taken at the whistle, not the moment it is asked
   * for. Both terminal rows can be Met on the pass `the-mouth` is revealed at
   * 19:00, so without this the tide closes a minute early. The file header
   * records that §13's own row says otherwise, and why the row is wrong.
   */
  runsItsLength: true,
  /**
   * §4 — twenty-eight, an Abyssal Submersible's cruise. The first budget in
   * this campaign pitched *against* a sanction rather than well clear of one:
   * two below the thirty that costs the array its dome. Metadata, never a live
   * threshold.
   */
  sigBudget: 28,
  /** §3, §4 — the Cantorate's instrument, lent to the picket and withdrawn on debt. */
  arrayTag: 'dome',
  /**
   * §4 — thirty per hull. A submersible idles at 22 and cruises at 28, so a
   * picket that walks its water all tide is under it; one that fires is at 42
   * idle and 48 cruising, and one that drops Silent Running spikes +40 for two
   * seconds. Either is over.
   */
  silenceCeilingSig: 30,
  /**
   * §4 — and this is the first mission whose ledger measures a role that is
   * not the one being helped: the guns that owe the debt are the picket, and
   * the ears withdrawn are the array's, four kilometres away.
   */
  silenceRole: 'watch',
  /** §4 — thirty seconds, so one exchange cannot black out the rest of the tide. */
  debtCapS: 30,
  /** §3 — nothing here is freight. */
  escortRadiusM: 0,

  /**
   * §11 — one mission region. The map paints eleven; this is the only one a
   * predicate or a marker addresses, and its geometry is the whole objective:
   * a hull at (1500, 3550) is 950 m from the berth and outside a Cruiser's
   * gun, and one on the southern edge is 500 m from it and inside.
   */
  regions: [
    {
      id: 'the-mouth',
      x: 1250,
      y: 3500,
      widthM: 500,
      heightM: 500,
      note: "The mouth — the trench's last half-kilometre above the yard. The count is taken in the north half or it is taken under fire",
    },
  ],

  /**
   * One marker, shipped only while `the-mouth` is revealed — so the mouth is
   * pointed at for the last minute and never before, which is Intake's
   * arrangement and the same withholding.
   */
  markers: [
    {
      id: 'mouth',
      label: 'The mouth. The trench is closed while the inquiry is open.',
      x: 1500,
      y: 3625,
      radiusM: 375,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Directorate,
      note: "The Fourth Trench picket, with the Cantorate's array — four Abyssal Submersibles in two standing watches, six Choristers under a dome, and the dome (§2, §3)",
      units: [
        // §3, §11 — the first watch, across the trench's first bend. Baffle's
        // `picket-one-a` and `picket-one-b`, seat for seat.
        watch(
          'one',
          1400,
          1150,
          "The first watch, at the trench's first bend — 224 m from where the flagship berths at 05:00, and inside every gun it carries"
        ),
        watch('two', 1600, 1200, ''),
        // The second watch, across the mouth between the convoy and the yard —
        // and already standing inside `the-mouth` at tick zero, which is what
        // makes the reveal at 19:00 load-bearing rather than decorative (§8).
        watch(
          'three',
          1400,
          3750,
          'The second watch, across the mouth between the convoy and the yard — 112 m from the flagship at 14:00'
        ),
        watch('four', 1600, 3780, ''),
        // §3, §11 — the array, at the foot: (1300…1700 step 80, 5450) at
        // 2,300 m, inside the dome's 1,200 m and 950 m from the yard's berth,
        // which is fifty metres outside a Cruiser's reach from it.
        chorister(
          'one',
          1300,
          'The west end of the array. Straddling the Drift Health cell boundary at x = 1,500 with the rest, which nobody is told (§11)'
        ),
        chorister('two', 1380, ''),
        chorister('three', 1460, ''),
        chorister('four', 1540, ''),
        chorister('five', 1620, ''),
        chorister(
          'six',
          1700,
          'The east end, and the nearest hull on the map to the basin — 520 m'
        ),
      ],
      structures: [
        // §3 — the Cantorate's instrument, standing on the last bench. Called
        // by its own name for the second time in the campaign. Structure, not
        // hull; placed, never moved; and a thousand metres outside every gun
        // in the water, which is why §10 can promise that a dome cannot be
        // lost here.
        {
          tag: 'dome',
          kind: StructureKind.Cantor,
          x: 1500,
          y: 5500,
          depthM: FOOT_DEPTH_M,
          note: 'The dome — +25 HYD capped at 95 within 1,200 m, worth ×1.16 of range to a Chorister and ×1.07 to the hull the Undermarshalcy paid most for (§4)',
        },
      ],
    },
    {
      slot: CONVOY,
      faction: Faction.Bathyarch,
      note: "The relief convoy — under writ, unfiled, armed except the barge, on *Baffle*'s clock and in `baffle.ts`'s seats (§5)",
      units: [
        {
          tag: 'flagship',
          kind: UnitKind.Cruiser,
          x: 1500,
          y: 300,
          depthM: 1000,
          armed: true,
          note: 'The Klaxon anchor — 150 every 2.5 s to 900 m, auto-acquiring the nearest live enemy in range as soon as it stops moving. The sweep listens through it at both gates',
        },
        {
          tag: 'corvette-1',
          kind: UnitKind.Corvette,
          x: 1380,
          y: 250,
          depthM: 1000,
          armed: true,
          note: 'The working escort — 50 every 1.2 s to 550 m',
        },
        {
          tag: 'corvette-2',
          kind: UnitKind.Corvette,
          x: 1620,
          y: 250,
          depthM: 1000,
          armed: true,
          note: '',
        },
        {
          tag: 'plant-barge',
          kind: UnitKind.Harvester,
          x: 1500,
          y: 420,
          depthM: 1000,
          note: 'The compressor barge, unarmed. No role: a role on a scripted hull would put another party inside a counter the picket is shown',
        },
      ],
      structures: [
        // §5 — the two moored stations, prebuilt, each bending the convoy's own
        // emissions through PF × 0.6 within 400 m. The northern one is taken
        // off the chart at 13:00 by the picket, which is the sentence §6 is
        // built to earn.
        {
          tag: 'baffle-north',
          kind: StructureKind.BaffleBarge,
          x: 1125,
          y: 1875,
          depthM: 1650,
          note: 'The northern station, moored in Lay-by One — corrected at 13:00 (§9)',
        },
        {
          tag: 'baffle-south',
          kind: StructureKind.BaffleBarge,
          x: 1875,
          y: 3125,
          depthM: 1650,
          note: 'The southern station, Lay-by Two — the last quiet water in the mission, and the concern owns both halves of it',
        },
      ],
    },
    {
      slot: YARD,
      faction: Faction.Bathyarch,
      note: "The Deep Yard — forty-one souls and a failing plant, on the channel by the only voice it has left (§5). Not the inquiry's",
      units: [],
      emitters: [
        // §5 — *Baffle*'s plant, literally: the same position, depth, SIG,
        // period, hp and close. What is new is that it is *attendable* here,
        // which it was not there. The second watch holds it at Track from
        // 757 m from the first tick, and §6 says so rather than pretending the
        // count is difficult.
        {
          tag: 'yard-plant',
          x: 1500,
          y: 4500,
          depthM: 1640,
          sig: 35,
          periodTicks: 8 * SIM.TICK_HZ,
          onTicks: 2 * SIM.TICK_HZ,
          hp: 900,
          untilTick: T(20),
          reading: {
            entered:
              "Entered: the yard's plant, missing its beat. Forty-one are on its complement and none of them is counted; the yard is not the inquiry's.",
            gap: "Not entered: the plant. The yard is not the inquiry's and was not listened for.",
          },
          note: "Forty-one people's plant, asking where the convoy is. Entering it is a decision to write down a thing that is none of the Undermarshalcy's business",
        },
      ],
    },
    {
      slot: CALL,
      faction: Faction.Directorate,
      note: 'The Call — six emitters at the foot from 13:00 to 15:00. The Cantorate, sounding. Not a cohort, and not a party: a slot, and six sounds (§2, §4)',
      units: [],
      emitters: [
        // §4.3 — the spread a cohort at rest would keep, on periods of 7, 9,
        // 11, 13, 15 and 17 seconds. Only `call-a` carries a reading, so the
        // count cannot be padded by hearing the same lie six times (§6).
        voice(
          'a',
          1300,
          5050,
          7,
          "The one that carries a reading — 400 m from the array's west end, and the first line the six thousand pages have acquired since 88 PC that was written before it was heard",
          {
            entered:
              "Entered: a cohort at the foot, six, bearing and depth. Nothing stood where they were heard. The Call is entered as what it was, in the Cantorate's hand.",
            gap: 'Not entered: the Call. The stalls heard their own voice as nothing, which is correct and is also entered.',
          }
        ),
        voice('b', 1450, 5000, 9, ''),
        voice('c', 1600, 5100, 11, ''),
        voice('d', 1750, 5050, 13, ''),
        voice('e', 1900, 5150, 15, ''),
        voice('f', 1400, 5150, 17, ''),
      ],
    },
  ],

  /**
   * §3 — what the picket does not carry, with the closure's own reasons shown.
   *
   * `activeSonar` is *not* on this list, and its absence is the mission:
   * campaign.md §10 withholds the ping until mission 3 and this is mission 3.
   * Attendance's doctrine — "pinging it is not scouting, it is asking, and the
   * Directorate does not ask" — is about the Mouth, and the Fourth is not the
   * Mouth. Weapons, torpedoes and noisemakers are live for the first time
   * against another navy.
   */
  locks: [
    {
      ability: 'construction',
      reason: "the inquiry's water is not re-rigged, by anyone",
    },
    { ability: 'mines', reason: 'nothing is left in closed water' },
    { ability: 'depthCharges', reason: 'nothing is left in closed water' },
  ],

  /**
   * §8's four rows, in §8's order — two terminal, two read out and never
   * ranked. Neither terminal row is a keystone, and the omission is the
   * argument: a picket that held the mouth and lost two hulls and a picket
   * that kept four and left the mouth open are read as the same sentence,
   * because the Directorate does not price bodies against ground.
   *
   * The readings hang on the two non-terminal rows and are appended in this
   * order beneath whichever outcome the run earned, with the sweep's filed
   * line above them and the two emitters' own lines beneath — which is exactly
   * what `resolve()` assembles, and exactly the order §8 states.
   */
  objectives: [
    {
      id: 'the-mouth',
      text: 'The trench is closed while the inquiry is open. The mouth is attended at the whistle.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      markerId: 'mouth',
      // §9 — revealed with the stalls' beat at 19:00. `extract` is not a
      // standing predicate, so it latches Met the first pass it is true and
      // never un-latches: revealed at 00:00 it would be met at 00:00 by the
      // second watch sitting in its own seat, and the mouth would be
      // "attended" by two hulls that were destroyed at 14:00 (§8).
      revealAtTick: T(19),
      predicate: { kind: 'extract', role: 'watch', region: 'the-mouth', count: 2 },
    },
    {
      id: 'the-picket',
      text: 'Three of four attend. The Undermarshalcy does not round up.',
      // §12 — the second reading of the same rule, while the ledger stands.
      debtText: 'The picket owes the stalls a silence.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      // §8 — `survive` and therefore standing, re-derived every tick: it reads
      // what is true now rather than what was true at tick zero, which is the
      // correction Intake made to the runtime.
      predicate: { kind: 'survive', role: 'watch', count: 3 },
    },
    {
      id: 'the-count',
      text: 'What enters is counted. What is heard is entered.',
      initial: ObjectiveStatus.Pending,
      // §6 — two emitters carry a reading and are therefore countable: the
      // yard's plant and `call-a`, at Track from 757 m and 400 m. This mission
      // makes attending free on purpose, because the difficulty was never the
      // hearing.
      predicate: { kind: 'attend', count: 2 },
      reading: {
        met: 'The count is entered: the plant, and the Call.',
        unmet: 'The count is short. The stalls heard the trench and wrote less than it said.',
      },
    },
    {
      id: 'the-record',
      text: 'What is heard of the picket is entered elsewhere.',
      initial: ObjectiveStatus.Pending,
      // §8 — 180 sim ticks at Track, which is three seconds: the exact length
      // of an active-sonar reveal. Meeting it is not success and it is not
      // failure either; it is a fact about somebody else's registry, and the
      // Directorate enters facts.
      predicate: { kind: 'tolerance', ticks: 180, tier: ResolutionTier.Track },
      reading: {
        met: 'The concern had the picket at Track — exact hull, hull state, facing — for the length of a transmission or a volley, which is the count it came for, and the count is now in a registry that does not publish either.',
        unmet:
          'The concern never had the picket at Track. Whatever it braced against, it did not resolve it, and the registry has a bearing and a closed trench.',
      },
    },
  ],

  /**
   * §13, §8 — the sweep over the concern's flagship, in the two gate windows.
   *
   * It files at a ratio of 1 — hearing at all, not a tier — so the reading's
   * *classified* is prose the geometry has to earn, and does: the flagship
   * holds a silent watch hull at 18.8 from 224 m at the first gate and 57 from
   * 112 m at the second, both Track. Filing also bends the flagship's course
   * once per window toward what it heard, which its next authored leg
   * restores, so §6's distances are the leg's rather than the window's.
   */
  sweep: {
    tags: ['flagship'],
    windows: [
      { fromTick: T(5), untilTick: T(8) },
      { fromTick: T(14), untilTick: T(17) },
    ],
    filedReading:
      "The concern's flagship classified the picket at a gate, and the concern's registry now carries the picket's water under an asset number the picket did not give it.",
    note: 'What its instruments hear, its ledgers keep — and a picket that stands in a gate is closed on as well as written down',
  },

  /**
   * §9's beat table, in its order. Twenty minutes, closing at the whistle and
   * **not** as a conclusion: the trench is still closed and the plant still
   * fails, but a picket can lose this mission, and a mission that can be lost
   * is resolved rather than concluded (§8).
   *
   * The pack at 18:30 is the telegraph — ninety seconds of loud, rising
   * arrival on the exact line the count is taken across, on top of a plant
   * that has been missing beats since the first tick and two gates that have
   * already arrived.
   */
  beats: [
    // 00:00 — the two voices at the opening, in the order the rite fixes.
    {
      atTick: 0,
      kind: 'say',
      speaker: 'First Cantor Vehl Ossary',
      text: 'The dome is open. The trench is attended. Nothing is expected of the picket but sufficiency, and sufficiency is not a small thing to be expected of.',
      note: 'Hailed and read — the say channel since #381',
    },
    {
      atTick: 0,
      kind: 'say',
      speaker: 'Undermarshal Setha Korrin',
      text: 'Four hulls stand the two watches. They are seated where the watches have always been seated, and they are not required to move. Six of the cohort are at the foot, under the dome, and are not the picket. Three of four attend. The Undermarshalcy does not round up.',
      note: 'The assignment, from §12. The whole of it is the briefing; these are the sentences that seat the picket',
    },

    // 00:00 — ten hulls under Silent Running, before anything in the water
    // asks for it. This is the campaign's introduction of the toggle (§3, §10):
    // the tide opens with the button already pressed, at 4.8 and 4.3.
    seatedSilent('watch-one', 'The tide opens with the button already pressed — 4.8, not 8 (§13)'),
    seatedSilent('watch-two', ''),
    seatedSilent('watch-three', ''),
    seatedSilent('watch-four', ''),
    seatedSilent(
      'array-one',
      'The array at 4.3, and inaudible to the concern at any range it reaches this tide'
    ),
    seatedSilent('array-two', ''),
    seatedSilent('array-three', ''),
    seatedSilent('array-four', ''),
    seatedSilent('array-five', ''),
    seatedSilent('array-six', ''),

    // 00:00 — the basin. Placed and not driven, by Intake's idiom: committed
    // to its own spawn until tick zero, so the first pass finds the commitment
    // expired and hands the animal straight to its trigger model. Ambient all
    // tide — the dome's 35 through 1.6 at 625 m reads 14.6 against an Interest
    // of 55 — and only silent because nobody has asked it anything (§7, §13).
    {
      atTick: 0,
      kind: 'creature',
      tag: 'the-basin',
      species: FaunaSpecies.Sounder,
      spawnAt: { x: 2000, y: 5875, depthM: FOOT_DEPTH_M },
      driveTo: { x: 2000, y: 5875 },
      untilTick: 0,
      loud: false,
      note: 'What deep basins hold. The loudest silence on the map, and the answer to a ping the mission never once asks for',
    },

    // 01:30 — Vail, on the concern's open channel, heard down the trench
    // because the picket hears everything (§12). *Baffle*'s line, from the
    // other side of it.
    {
      atTick: T(1, 30),
      kind: 'say',
      speaker: 'Lift Foreman Dessa Vail, on the concern’s open channel',
      voice: 'concern',
      text: "Hear that beat missing? That's forty-one people's plant asking where we are. I've rigged lifts for this concern for nineteen years and that is the first cargo that ever wrote back.",
      note: '',
    },

    // 02:30 — the convoy dives into the trench. The layer stops applying, and
    // the array 4,350 m south reads it at 3.08 — Classification — from the
    // moment it enters. At the Chorister's own 75 the same path is 2.4, which
    // is Bearing: the dome is what makes that sentence true (§7, §10).
    ...leg(
      T(2, 30),
      1500,
      1100,
      WATCH_DEPTH_M,
      'The convoy dives. Fast and loud, and the first thing the array has ever heard from four kilometres away'
    ),

    // 04:00 — the law, once, in the passive. Nothing moves toward the convoy
    // (§6, §12).
    {
      atTick: T(4),
      kind: 'say',
      speaker: 'Picket-Speaker, Fourth Trench Cohort',
      text: 'The trench is closed while the inquiry is open. What enters it is not being threatened. It is being counted.',
      note: 'Counting has begun',
    },

    // 05:00 — the first gate. The flagship berths 224 m from `watch-one`, and
    // a stationary hull auto-acquires: the convoy fires first, and it fires
    // whether or not the picket does (§6, §13).
    ...leg(
      T(5),
      1500,
      1350,
      WATCH_DEPTH_M,
      "The convoy stands at the first bend — 224 m from `watch-one`, inside a Cruiser's gun and both Corvettes'"
    ),

    // 08:30 — into Lay-by One. A pocket is 250 m square and the formation is
    // 300 m wide, so this leg is authored seat by seat (§5).
    {
      atTick: T(8, 30),
      kind: 'move',
      tag: 'flagship',
      x: 1150,
      y: 1900,
      depthM: 1650,
      note: "Into Lay-by One — the concern's first quiet chamber, and one of the only two on the map",
    },
    {
      atTick: T(8, 30),
      kind: 'move',
      tag: 'corvette-1',
      x: 1300,
      y: 1850,
      depthM: 1650,
      note: 'On the axis side, because the pocket will not hold the formation',
    },
    { atTick: T(8, 30), kind: 'move', tag: 'corvette-2', x: 1300, y: 1950, depthM: 1650, note: '' },
    {
      atTick: T(8, 30),
      kind: 'move',
      tag: 'plant-barge',
      x: 1100,
      y: 1950,
      depthM: 1650,
      note: '',
    },

    // 10:00 — the second leg, tracked the whole way.
    ...leg(
      T(10),
      1500,
      2900,
      WATCH_DEPTH_M,
      'The second leg — the long one, tracked the whole way'
    ),

    // 12:00 — the stalls, sixty seconds ahead of the sounding (§12).
    {
      atTick: T(12),
      kind: 'say',
      speaker: 'The stalls',
      text: 'The trench is to be sounded. It will be heard as a cohort at the foot. The picket is not asked to move.',
      note: 'Sixty seconds. Attendance called every arrival the same way, and this is the first thing the stalls have ever called that they were about to make',
    },

    // 13:00 — the Call opens. The emitters carry their own window; this is the
    // First Cantor entering the lie as a lie in the same breath as sounding it
    // (§4.3, §12).
    {
      atTick: T(13),
      kind: 'say',
      speaker: 'First Cantor Vehl Ossary',
      text: 'It will be heard as a cohort. It is not one, and the record will say so, later, in the Cantorate’s hand.',
      note: 'The six voices open on this tick, on their own periods, for two minutes',
    },

    // 13:00 — the northern station goes off the chart. *Baffle* §7 from the
    // hand that made it: the `lose` beat is the correction the picket makes,
    // and the picket is the player (§9, §13).
    {
      atTick: T(13),
      kind: 'lose',
      tag: 'baffle-north',
      note: 'A cutter cohort corrects the mooring. In *Baffle* this is a cost; here it is a sentence the player writes',
    },
    {
      atTick: T(13),
      kind: 'say',
      speaker: 'Picket-Speaker, Fourth Trench Cohort',
      text: 'A mooring was found in closed water. It was not in any charter. It has been corrected.',
      note: '',
    },

    // 13:30 — into Lay-by Two, the same seats mirrored about the axis (§5).
    // From here the Call reads 1.33 to 1.66 at about two kilometres: three at
    // Contact, three barely at Bearing, a smudge with a rhythm (§7).
    {
      atTick: T(13, 30),
      kind: 'move',
      tag: 'flagship',
      x: 1850,
      y: 3150,
      depthM: 1650,
      note: 'Into Lay-by Two — the last quiet water in the mission',
    },
    {
      atTick: T(13, 30),
      kind: 'move',
      tag: 'corvette-1',
      x: 1700,
      y: 3100,
      depthM: 1650,
      note: '',
    },
    {
      atTick: T(13, 30),
      kind: 'move',
      tag: 'corvette-2',
      x: 1700,
      y: 3200,
      depthM: 1650,
      note: '',
    },
    {
      atTick: T(13, 30),
      kind: 'move',
      tag: 'plant-barge',
      x: 1900,
      y: 3200,
      depthM: 1650,
      note: '',
    },

    // 14:00 — the second gate. 112 m from `watch-three`, and the Call at
    // Classification for the first time: six positioned contacts with a depth
    // and no kind, arriving at exactly the moment the convoy is deciding
    // whether the water south of the yard is empty (§6, §7).
    ...leg(
      T(14),
      1500,
      3700,
      WATCH_DEPTH_M,
      'The convoy stands at the mouth — 112 m from `watch-three`, and 1,301 to 1,504 m from six voices that are not there'
    ),

    // 14:30 — the concern's one transmission. SIG 95 for three seconds, down
    // the same validated path a player's ping takes. Self-reveal 3,219 m at
    // HYD 50 and 4,486 to the picket's 85: the whole trench south of the first
    // bend is lit, and anything of the picket inside 900 m is at Track and in
    // the concern's registry. `baffle.ts` authors no ping at all — this is the
    // writ's own advice placed on the world's clock (§9, §13).
    {
      atTick: T(14, 30),
      kind: 'ping',
      tag: 'flagship',
      note: 'Transmit once, late, and commit on what it returns. The array reads it at 18 from 1,750 m and is not asked to do anything about it',
    },

    // 15:00 — the Call's window closes, on the emitters' own `untilTick`. Two
    // minutes before the convoy's leg to the berth would have put it inside
    // Track of a lie (§9).

    // 17:00 — the convoy makes the yard. The mouth is free, and the array
    // 950 m south is fifty metres outside the Cruiser's gun (§9, §11).
    {
      atTick: T(17),
      kind: 'move',
      tag: 'flagship',
      x: 1500,
      y: 4500,
      depthM: 1650,
      note: "The berth, and the yard's floor at 1,650 m is the one place in the mission where a hull is seated on the bottom rather than over it — `terrain.admits` is inclusive at the floor",
    },
    { atTick: T(17), kind: 'move', tag: 'corvette-1', x: 1400, y: 4450, depthM: 1650, note: '' },
    { atTick: T(17), kind: 'move', tag: 'corvette-2', x: 1600, y: 4450, depthM: 1650, note: '' },
    {
      atTick: T(17),
      kind: 'move',
      tag: 'plant-barge',
      x: 1500,
      y: 4550,
      depthM: 1650,
      note: 'The barge closes to the berth (§5)',
    },

    // 17:30 — the concern prices its own noise as the plan working, and the
    // cohort answers it with a Directorate sentence that concedes nothing
    // (§12).
    {
      atTick: T(17, 30),
      kind: 'say',
      speaker: 'Yardmaster Brann Holt, on the yard channel',
      voice: 'concern',
      text: 'Yard to convoy: we can hear you. We have been able to hear you for ten minutes. Nobody down here is calling that a defect in the plan.',
      note: '',
    },
    {
      atTick: T(17, 30),
      kind: 'say',
      speaker: 'Mara Tessen, 4th Trench Cohort, from the freight galleries',
      text: 'The yard can hear us. It has always been able to. Nobody down here calls that a defect either.',
      note: 'Born at 2,900 m, in the galleries cut into the fan’s east wall (habitats.md §6)',
    },

    // 18:30 — the pack. *Baffle*'s three beats, inherited whole, wart and all:
    // `driveTo` with no `depthM` leaves a driven Draymaw climbing toward its
    // species' 900 m as it runs the axis. That is *Baffle*'s literal as it
    // stands, and a document that quietly fixed another mission's water would
    // break the seam it exists to keep (§13).
    {
      atTick: T(18, 30),
      kind: 'creature',
      tag: 'pack-a',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 1450, y: 4000, depthM: WATCH_DEPTH_M },
      driveTo: { x: 1450, y: 2500 },
      untilTick: T(19, 30),
      loud: true,
      note: 'The telegraph — ninety seconds in front of the close, on the exact line the count is taken across',
    },
    {
      atTick: T(18, 30),
      kind: 'creature',
      tag: 'pack-b',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 1550, y: 3950, depthM: WATCH_DEPTH_M },
      driveTo: { x: 1500, y: 2600 },
      untilTick: T(19, 30),
      loud: true,
      note: '',
    },
    {
      atTick: T(18, 30),
      kind: 'creature',
      tag: 'pack-c',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 1500, y: 4050, depthM: WATCH_DEPTH_M },
      driveTo: { x: 1550, y: 2550 },
      untilTick: T(19, 30),
      loud: true,
      note: '',
    },

    // 19:00 — the stalls call the count, and `the-mouth` is revealed on this
    // tick. Two minutes after the convoy berthed and five after the decision
    // that mattered, which is the only place anything ever says where the
    // count is taken from (§11, §12).
    {
      atTick: T(19),
      kind: 'say',
      speaker: 'The stalls',
      text: 'The count is taken at the whistle. The mouth is attended from its north lip, and the plant is entered as it is.',
      note: 'Said once. `the-mouth` and its marker appear with this line',
    },

    // 20:00 — the whistle. Korrin reads the count, and then says one sentence
    // to nobody. The First Cantor is present the whole time, opened the dome,
    // sounded the Call, and does not speak (§12).
    {
      atTick: T(20),
      kind: 'say',
      speaker: 'Undermarshal Setha Korrin',
      text: 'The first thing those below have ever put into the water was a lie. I would have preferred it were a question.',
      note: 'The third of the campaign’s one-sentence-per-mission civil war, and the first spoken about a transmission she did not make. Ossary says nothing',
    },
    {
      atTick: T(20),
      kind: 'resolve',
      note: 'The plant fails, the trench remains closed, and the count is read. Not a conclusion: a picket can lose this, and a mission that can be lost is resolved (§8)',
    },
  ],

  /**
   * §9 — the one conditional beat, fired by the tally rather than by the
   * clock: one second at Track, in anybody's ears.
   *
   * It fires at whichever of three things the picket stood into first — the
   * first gate at 05:00, the second at 14:00, or the concern's transmission at
   * 14:30 — and it cannot be fired by the picket's *own* ping, because no
   * predicate reads the player's own transmissions (§13). Korrin's text is
   * therefore authored to be true of a gate fight and of a transmission and of
   * nothing else.
   */
  conditionalBeats: [
    {
      kind: 'say',
      speaker: 'Undermarshal Setha Korrin',
      text: 'The picket is in the concern’s record at Track. Whether it was asked or shot at is not a distinction the registry keeps, and it is entered here as one.',
      note: 'Once, on the first tick the tally reaches a second — and the registry keeps no column for which of the three it was',
      when: { kind: 'tolerance', ticks: 60, tier: ResolutionTier.Track },
    },
  ],

  /**
   * §8's Results, verbatim — Korrin's three readings from Sufficiency, with
   * the sweep's filed line, `the-count`'s reading, `the-record`'s and the two
   * emitters' lines assembling beneath whichever row the run earned.
   *
   * Neither terminal row is a keystone, so Partial is reachable both ways and
   * means the same thing either way: "A closure is not a count of hulls, and
   * the trench is closed either way."
   */
  epilogue: {
    [MissionOutcome.Complete]:
      'The mouth was attended at the whistle and the picket is mustered. The trench remains closed. What the concern’s plant did in closed water is entered, and what the stalls sounded is entered beside it, and the second entry is the first line since 88 PC that was written before it was heard.',
    [MissionOutcome.Partial]:
      'Sufficient. The mouth was attended or the picket is mustered, and the other is entered as short. A closure is not a count of hulls, and the trench is closed either way.',
    [MissionOutcome.Lost]:
      'The mouth was not attended and the picket is not mustered. The trench is open until the next watch stands, and the inquiry enters the gap. It is not a failure of yours; it is a convoy against a law, and the convoy was louder.',
  },
};
