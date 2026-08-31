/**
 * The Second Chord 1 — Aptitude. docs/mission-aptitude.md, transcribed.
 *
 * A data literal in `sorrowgate.ts`'s idiom: the document owns the forces, the
 * water, the beats, the numbers and the text. It is the first Knight mission in
 * the bible and the first that could not be authored at all until the term it
 * is about existed — every distance below is quoted from the model rather than
 * invented, and `missionAptitude.test.ts` re-derives them so the literal and
 * §4's table cannot drift.
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **Facing is the only cover, and it is worth a factor of four.** The same
 *   corvette at 28 is classified at 1,414 m down its own bow, 734 m on the
 *   beam and 335 m astern (§4). Nothing else on this map hides anybody: three
 *   regions, no vent, no kelp, no ruin, no thermocline crossing.
 * - **The soundings are the mission's verb, and they aim the player.** Six
 *   formations, 400 m, twenty seconds, SIG 80 — the Sounding Spire's active
 *   figure, because a hull taking a sounding is doing the Spire's job by hand
 *   (§4, §6). A sounding's flank is 28 and its wake is 8, which are two
 *   numbers the player already knows.
 * - **The ceiling is not a number the player emits.** §5's tolerance is thirty
 *   seconds at Classification, cumulative, across the whole party — the first
 *   mission ceiling in the bible that is a fact about somebody else's log — and
 *   exhausting it is emphatically not a failure.
 * - **The gate breathes on a metronome.** Two picket corvettes on two legs in
 *   opposite phase, 400 m apart at the centre once every two minutes and
 *   2,400 m apart once every two minutes (§11). It is the only moving thing in
 *   the mission and it never varies, so the mission is a rhythm problem rather
 *   than a reaction test.
 *
 * **Two places the format reaches its edge, both recorded in §13 rather than
 * worked around here.** §8's ladder asks whether *the Drone* was sounded and
 * `sound` counts without naming, so the results below are read off the count
 * alone; and §5's barge falling silent at twenty seconds is authored as the
 * line it speaks, because an emitter's window is ticks and only a lift can
 * silence one. Neither costs the mission a beat the player hears — the warning
 * is still ten seconds ahead of the recall, and the recall is still two hundred
 * and forty ahead of anything else.
 */

import {
  CHORD_APTITUDE_HEADER,
  Faction,
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  SIM,
  UnitKind,
} from '@echoes/shared';

import type { MissionBeat, MissionDefinition, MissionSounding } from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/** Reserved and empty, as every campaign mission reserves it. */
const COURT = 1;
/**
 * The survey's slot — a party, seated by the mission rather than by the map
 * (§2). One other player-faction force is in this water and it is not a
 * delegation: it has hulls, a writ and a position it is right about.
 */
const SURVEY = 2;

/**
 * §4 and §6 — a sounding is taken from within 400 m of a formation, bow on it,
 * held for twenty seconds at SIG 80. The numbers live in the literal exactly as
 * `cutTicks` and `cutSig` do: they are one mission's authored figures, not a
 * rule of the world (types.ts, `MissionSounding`).
 */
const SOUND_RADIUS_M = 400;
const SOUND_HOLD_TICKS = 20 * SIM.TICK_HZ;
const SOUND_SIG = 80;

/** §5 — thirty seconds at Classification, cumulative, across the whole party. */
const TOLERANCE_TICKS = 30 * SIM.TICK_HZ;
/** §5 — and the barge stops coring at twenty, ten short of it. */
const WARNING_TICKS = 20 * SIM.TICK_HZ;

/** §11 — the survey sits in the middle of the map and never moves. */
const SURVEY_X = 1600;
const SURVEY_Y = 2000;

/**
 * §11 — the picket's two legs, both on x 2,500, walked in opposite phase.
 *
 * `IN` is the closed gate: north at 1,800 and south at 2,200 is 400 m apart at
 * the centre. `OUT` is the open one: 800 and 3,200 is 2,400 m apart, which is
 * the passage west.
 */
const PICKET_X = 2500;
const NORTH_OUT = 800;
const NORTH_IN = 1800;
const SOUTH_IN = 2200;
const SOUTH_OUT = 3200;

/** §11 — the Fields' floor, and the Approach's. Every metre of it is Mid-Water. */
const FIELD_FLOOR_M = 1700;
const APPROACH_FLOOR_M = 1450;

/** One voice of the six — §6's table, as a point with a radius (§11). */
const voice = (id: string, tag: string, x: number, y: number, note: string): MissionSounding => ({
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
 * One breath of the gate — §11, and the mission's only clock that is not a
 * line of dialogue.
 *
 * Both hulls are ordered on the same tick, in opposite directions, once a
 * minute for the whole mission. A corvette covers its 1,000 m leg at 85 m/s in
 * about twelve seconds and then stands for the remaining forty-eight, which is
 * §9's "about forty seconds" of opening arriving on §11's two-minute
 * metronome. A stopped corvette emits what a cruising one emits — 28, idle and
 * cruise alike — so the standing costs the picket nothing and the player hears
 * the same two hulls the whole time. **It asks what they are pointed at, not
 * where they are** (§7).
 */
const breath = (minute: number, open: boolean, note: string): MissionBeat[] => [
  {
    atTick: T(minute),
    kind: 'move',
    tag: 'picket-north',
    x: PICKET_X,
    y: open ? NORTH_OUT : NORTH_IN,
    note,
  },
  {
    atTick: T(minute),
    kind: 'move',
    tag: 'picket-south',
    x: PICKET_X,
    y: open ? SOUTH_OUT : SOUTH_IN,
    note: '',
  },
];

export const CHORD_APTITUDE: MissionDefinition = {
  ...CHORD_APTITUDE_HEADER,
  doc: 'docs/mission-aptitude.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Hadron,
  courtSlot: COURT,
  /** §2 — the Drift is not populated: no fauna seeded and none authored. */
  fauna: false,
  /**
   * §4 — twenty-eight, **in the cone**, and the qualifier is the point. This is
   * the campaign's fourth reading of the same rule and the first that could not
   * be stated without a direction attached: the same hull is emitting 2.8
   * astern in the same instant, and both are true.
   */
  sigBudget: 28,
  /**
   * No silence order, and no array to lend: §3 leaves Silent Running present,
   * unfenced and never struck, because §4 prices it out in arithmetic the
   * player can check. A Knight running silent emits 8 and is classified bow-on
   * at 646 m; the same hull at cruise showing its wake is classified at 335.
   * The button is a bad trade for one faction, and the mission says so by
   * being winnable without it rather than by removing it.
   */
  silenceCeilingSig: 100,
  debtCapS: 0,
  /** No held freight: a tuning party moves on its own orders. */
  escortRadiusM: 0,

  /**
   * §11's three regions, restated as the mission's own — the shortest table in
   * the bible, and §1 is the argument for it. Nothing counts hulls into any of
   * them: the mission's second count is hulls *standing*, not hulls parked
   * (§8, whose taboo row reads "not returned" as "lost").
   */
  regions: [
    {
      id: 'fields',
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 4000,
      note: 'The Fields — crystal country, PF 0.70, and no cover anywhere in it',
    },
    {
      id: 'approach',
      x: 3750,
      y: 0,
      widthM: 1250,
      heightM: 1000,
      note: "The Third's Approach — the spawn, and the water the party returns to",
    },
    {
      id: 'seam',
      x: 0,
      y: 3500,
      widthM: 5000,
      heightM: 500,
      note: 'The Seam — PF 1.60, and the one strip of ground on this map that carries',
    },
  ],

  /**
   * §6's six voices, in the document's order — which is the order of increasing
   * ask, not an order the mission enforces. **Nothing scripts which voice is
   * taken when**, and a party that goes for the Drone first is doing the
   * hardest thing while it still has all thirty seconds in hand.
   *
   * What *is* authored is which hull takes which, because `MissionSounding`
   * requires a carrier the way `MissionLift` does. The Cruiser draws Descant —
   * §6's "whichever voice it is already nearest", at 1,004 m from the spawn —
   * and the five corvettes draw the rest, which is the arithmetic of six made
   * once and in data rather than in the first two minutes. §13 carries what
   * that costs.
   */
  soundings: [
    voice(
      'descant',
      'the-voice',
      4300,
      1500,
      'Nothing behind it. Face south, hold twenty seconds — the sounding taught by having it, with 600 m of margin on the flank'
    ),
    voice(
      'tenor',
      'corvette-one',
      3200,
      600,
      "North of the picket's top leg. Reachable, and not on a westward bearing: the first formation whose route is the problem"
    ),
    voice(
      'treble',
      'corvette-two',
      3600,
      3100,
      "400 m north of the Seam. Aimed south the cone lands in PF 1.60 water, where a sounding's wake alone still classifies at 1,084 m"
    ),
    voice(
      'alto',
      'corvette-three',
      2300,
      3300,
      "Inside the south picket's leg. A timing problem rather than a geometry one — the first voice that has to be taken in an opening"
    ),
    voice(
      'bass',
      'corvette-four',
      900,
      1100,
      'Past everything, north-west. The passage, and the cadence that makes it: two bearings alternating, never one aimed'
    ),
    voice(
      'the-drone',
      'corvette-five',
      1100,
      3000,
      "Past everything, south-west, on the Seam's shoulder, with the survey between it and home. Route, aim and ground at once"
    ),
  ],

  markers: [
    {
      id: 'formations',
      label: 'Six voices stand off the house. Within four hundred metres, bow on, twenty seconds.',
      x: 2550,
      y: 2100,
      radiusM: 2500,
    },
    {
      id: 'approach',
      label: "The Third's approach. Six of you came out of it.",
      x: 4500,
      y: 500,
      radiusM: 800,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Hadron,
      note: "The Third's annual tuning party, six hulls under Voice Ren Kalliso (§2, §3)",
      units: [
        /**
         * Kalliso's hull and the party's ears. HYD 65 is what classifies the
         * survey from 2,157 m, which is the margin the whole mission is spent
         * out of — the player classifies the survey long before the survey
         * could classify them (§7).
         *
         * Generic hulls flying Knight colours, and §3 states the consequence
         * rather than hiding it: units.md has no Knight entry, a real Knight
         * cone figure is expected to run about 2.2× a comparable hull's, and
         * this party is therefore *quieter in the cone* than the faction should
         * be. Nothing in the geometry depends on 28 rather than 60 — a louder
         * roster moves every distance outward together.
         */
        {
          tag: 'the-voice',
          kind: UnitKind.Cruiser,
          x: 4500,
          y: 500,
          depthM: APPROACH_FLOOR_M,
          role: 'party',
          note: 'The Voice — 55 idle / 65 live in the cone, HYD 65. It sounds Descant because it is already there',
        },
        {
          tag: 'corvette-one',
          kind: UnitKind.Corvette,
          x: 4380,
          y: 560,
          depthM: APPROACH_FLOOR_M,
          role: 'party',
          note: 'The working hulls — 28 in the cone, 9.8 on the flank, 2.8 in the wake. Five of them, and six voices',
        },
        {
          tag: 'corvette-two',
          kind: UnitKind.Corvette,
          x: 4440,
          y: 620,
          depthM: APPROACH_FLOOR_M,
          role: 'party',
          note: '',
        },
        {
          tag: 'corvette-three',
          kind: UnitKind.Corvette,
          x: 4500,
          y: 680,
          depthM: APPROACH_FLOOR_M,
          role: 'party',
          note: '',
        },
        {
          tag: 'corvette-four',
          kind: UnitKind.Corvette,
          x: 4560,
          y: 620,
          depthM: APPROACH_FLOOR_M,
          role: 'party',
          note: '',
        },
        {
          tag: 'corvette-five',
          kind: UnitKind.Corvette,
          x: 4620,
          y: 560,
          depthM: APPROACH_FLOOR_M,
          role: 'party',
          note: '',
        },
      ],
    },
    {
      slot: SURVEY,
      faction: Faction.Bathyarch,
      note: 'The Consortium survey, coring the outer Fields under a Board writ (§5). Right inside its own frame, and it does not go looking',
      units: [
        // Stationary all mission. The barge cores; the Cruiser stands over it.
        // Weapons-cold, both of them: the survey does not want a fight and
        // would file one as an unbudgeted exposure (§8).
        {
          tag: 'the-barge',
          kind: UnitKind.Harvester,
          x: SURVEY_X,
          y: SURVEY_Y,
          depthM: FIELD_FLOOR_M,
          note: 'The survey barge — deaf at HYD 30 and loud on the economy noise curve. It is why the party can hear the survey from four kilometres',
        },
        {
          tag: 'the-escort',
          kind: UnitKind.Cruiser,
          x: SURVEY_X + 120,
          y: SURVEY_Y - 80,
          depthM: FIELD_FLOOR_M,
          note: "The survey's ears at HYD 65, and the listener every distance in §4 is quoted against",
        },
        // Two hulls walking two legs on a fixed metronome, and the only moving
        // things in the mission. Seated at the open gate, because §9 puts the
        // first closing at 01:00 rather than at 00:00.
        {
          tag: 'picket-north',
          kind: UnitKind.Corvette,
          x: PICKET_X,
          y: NORTH_OUT,
          depthM: FIELD_FLOOR_M,
          note: 'The north picket — 2,500, 800 to 2,500, 1,800, sixty seconds each way',
        },
        {
          tag: 'picket-south',
          kind: UnitKind.Corvette,
          x: PICKET_X,
          y: SOUTH_OUT,
          depthM: FIELD_FLOOR_M,
          note: 'The south picket — 2,500, 2,200 to 2,500, 3,200, sixty seconds each way, in opposite phase',
        },
      ],
      emitters: [
        /**
         * The coring — §5's "SIG 55 sustained", and §7's sound from the middle
         * of the map. Authored as an emitter rather than left to the barge's
         * own hull figure, because a stationary Harvester idles at 18 and §5 is
         * emphatic that the barge is the loud half of the survey.
         *
         * The pattern is the degenerate one: on for every tick of every period,
         * which is what "sustained" means when the format's unit is a strike
         * window. Against the party's Cruiser at HYD 65 in PF 0.70 water this
         * is contact at 3,824 m and classification at 2,157 — §7's figures,
         * exactly, and the mission's whole working capital.
         */
        {
          tag: 'the-coring',
          x: SURVEY_X,
          y: SURVEY_Y,
          depthM: FIELD_FLOOR_M,
          sig: 55,
          periodTicks: SIM.TICK_HZ,
          onTicks: SIM.TICK_HZ,
          // Nothing on this map can shoot it and the party has no reason to.
          // One, because the Echo pass selects on Health.
          hp: 1,
          note: 'The string, turning. Fifty-five, sustained, and audible from four kilometres',
        },
      ],
    },
  ],

  /**
   * §3 — what the party does not carry, as dead affordances with the Order's
   * own reasons shown.
   *
   * **Weapons are not locked**, and that is the entry that matters. §8:
   * combat here is elective, is never necessary, and is only reachable after
   * the mission has already told the party to leave. A weapons lock would
   * make that a rule instead of a choice, and the Order's whole tragedy is
   * that it keeps choosing.
   */
  locks: [
    {
      ability: 'activeSonar',
      reason: 'the one emission the Order owns that has no bow — discourteous, and withheld',
    },
    {
      ability: 'construction',
      reason: 'a tuning is maintenance, and maintenance is not a works order',
    },
  ],

  /**
   * §12's "Objective readings, in play" — the register that states intervals
   * and conditions and never tasks.
   *
   * Three terminal rungs, and §8's four results fall out of them: the chord and
   * the lattice are the count ladder, the party is the keystone, and an unmet
   * keystone reads the whole close as the taboo whatever else came home
   * (types.ts, `keystone`). The tolerance is authored fourth and is
   * deliberately **not** terminal — §5 is emphatic that exhausting it is a
   * partial outcome rather than a failure, so it earns a reading and closes
   * nothing.
   *
   * **Every reading below is worded to be true in each of the four closes it
   * can appear in**, because the runtime appends them all beneath whichever
   * line the outcome earned and has no way to withhold one. That is what keeps
   * §8's last row intact: Vrey's refusal is the epilogue and it stands alone as
   * his, and the lines under it are the *chapter's* entry rather than his
   * reading of it — which is the distinction §8 is drawing in the first place.
   */
  objectives: [
    {
      id: 'the-chord',
      text: 'The lattice stands at six voices. A tone you interrupt is a tone you have not played.',
      initial: ObjectiveStatus.Pending,
      markerId: 'formations',
      terminal: true,
      predicate: { kind: 'sound', count: 6 },
      reading: {
        met: 'The chord is whole. The Drone is entered, and everything above it has something to be tuned against.',
        unmet:
          'A rest is written down, it is played, and it is not an absence — it is the part of a chord that is silent on purpose. I will not pretend that these were on purpose.',
      },
    },
    {
      id: 'the-lattice',
      text: 'A chord certifies against four voices and its Drone. Below that there are measurements and nothing to measure them from.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      predicate: { kind: 'sound', count: 4 },
      reading: {
        met: 'The lattice is certified against what was entered, and the chapter-wrights have their year.',
        unmet:
          'The chapter has measurements and nothing to measure them from. That is not a failure of the party. It is a year, and the Order has more years than it has Knights.',
      },
    },
    {
      id: 'the-party',
      text: 'Six of you. Six voices. I would like both of those numbers to be the same at the end as they are now.',
      initial: ObjectiveStatus.Pending,
      markerId: 'approach',
      terminal: true,
      // The taboo (§8): a reading that priced a lost hull against a certified
      // lattice would be the Consortium's register, not this one. Vrey
      // declines to enter it, and the mission ends short.
      keystone: true,
      predicate: { kind: 'survive', role: 'party', count: 6 },
    },
    {
      id: 'the-tolerance',
      text: 'A concern is coring in the middle of it. What is classified of you is entered against their log, and a log is added up at the end of a shift.',
      initial: ObjectiveStatus.Pending,
      predicate: {
        kind: 'tolerance',
        ticks: TOLERANCE_TICKS,
        tier: ResolutionTier.Classification,
      },
      reading: {
        met: 'Thirty of thirty. The survey filed a contact rather than a fault, and somewhere in the concern a bearing on Knight hulls is now a line in a document that will be read at a table nobody in this water sits at.',
        unmet:
          'The survey heard weather, twice, and graded its array for replacement at the next refit. The chapter is not in anybody else’s record this year.',
      },
    },
  ],

  /**
   * §9's beat table — the *world's* clock, not the player's. The soundings are
   * the party's acts and are taken in whatever order it finds; what is
   * scheduled here is the picket, the survey and the chapter.
   *
   * Sixteen minutes, closing as a **conclusion**: §8 says so in as many words —
   * "Sixteen minutes is a conclusion, not a timer" — and the only failure the
   * mission has is a hull lost in a fight the Order did not arrange and could
   * hear coming.
   */
  beats: [
    {
      atTick: 0,
      kind: 'say',
      speaker: 'Chapter-Master Halden Vrey',
      text: 'Good. You have all done this before, at nine, with your ears, and the only thing that has changed is the size of the instrument. Six voices stand off the house. You will put a tone into each and read what comes back.',
      note: 'Read, not heard — the standing status of the say channel. §12, at the top of the exercise',
    },

    ...breath(1, false, 'The gate closes for the first time — 400 m at the centre'),
    ...breath(2, true, 'The gate opens — 2,400 m, and the passage west is taken on this one'),
    ...breath(3, false, ''),
    ...breath(4, true, ''),
    ...breath(5, false, ''),
    ...breath(6, true, ''),

    // 06:00 — the survey files its second instrument fault of the year, out
    // loud, in front of the party. Nobody is talking to the Knights and the
    // Knights are listening, which is the Rift's oldest way of being told
    // something: the player learns the tolerance from the people keeping it.
    {
      atTick: T(6),
      kind: 'say',
      speaker: 'Surveyor Ade Bramm, on the open channel',
      text: 'Log it as the second fault this year and grade the array for replacement at the next refit. It is not a hull. There is nothing out here to be a hull, and if there were, we would have costed the escort differently.',
      note: '§12 — the tolerance, explained by the people who keep it',
    },

    ...breath(7, false, ''),
    ...breath(8, true, ''),

    // 08:00 — the midpoint, and the only thing in the mission that is about the
    // campaign rather than the exercise. A man refusing to discuss a thing by
    // describing exactly the thing.
    {
      atTick: T(8),
      kind: 'say',
      speaker: 'Chapter-Master Halden Vrey, on the chapter channel',
      text: 'The Choirmaster has written to the houses about a window. I am not going to discuss it with a party in the water and I would not discuss it with you in the house either, so take this as nothing: an instrument is tuned so that it will be in tune later, and the word doing the work in that sentence is later. Carry on.',
      note: '§12 — the campaign, mentioned once and not explained',
    },

    ...breath(9, false, ''),
    ...breath(10, true, ''),
    ...breath(11, false, ''),
    ...breath(12, true, ''),
    ...breath(13, false, ''),
    ...breath(
      14,
      true,
      'The last opening a party can use and still be home. Nothing announces it; it is arithmetic the player can do'
    ),
    ...breath(15, false, ''),
    ...breath(16, true, 'The metronome does not stop because the exercise has'),

    {
      atTick: T(16),
      kind: 'say',
      speaker: 'Chapter-Master Halden Vrey',
      text: 'That is the year. Bring it in and I will read it.',
      note: '§9 — the tuning closes, and Vrey reads the chord',
    },
    {
      atTick: T(16),
      kind: 'resolve',
      conclusion: true,
      note: 'A conclusion, not a timer (§8) — the chapter has one measurement a year and it has taken it',
    },
  ],

  /**
   * The standing rules, in no order at all — §5's consequences and §12's one
   * line from Kalliso, each fired by a fact rather than by the clock.
   *
   * Kalliso's line is the mechanism used for what it was built for and then
   * some: "on the first sounding" is a sentence about the player's own act, and
   * `sound` is the predicate that states it. The other three are the tolerance
   * spending itself — the warning at twenty, and the filing, the recall and the
   * interposition at thirty. None of them can close the mission, which is the
   * point: §5 is emphatic that this is an extraction and not a failure, and the
   * close stays on the clock where §9 puts it.
   */
  conditionalBeats: [
    {
      kind: 'say',
      speaker: 'Voice Ren Kalliso, to nobody in particular',
      text: 'That is the same tone. Twenty-two years on and it is the same tone. They did not even change it.',
      note: '§12 — once, on the first sounding. A soldier noticing that an institution has not changed a note since she was nine',
      when: { kind: 'sound', count: 1 },
    },
    {
      kind: 'say',
      speaker: 'Surveyor Ade Bramm, on the open channel',
      text: 'Stop the string. I want the water quiet and I want the last four returns read back to me with the coring off them. If the array is faulty it will still be faulty in a minute; if it is not, I would rather find that out now than at the refit.',
      note: 'Twenty of thirty — the barge stops coring, and a thing going quiet is the loudest event this game has (§5)',
      when: { kind: 'tolerance', ticks: WARNING_TICKS, tier: ResolutionTier.Classification },
    },
    {
      kind: 'say',
      speaker: 'Surveyor Ade Bramm, on the open channel',
      text: 'Amend the log. It is not a fault and it is not weather; it is a contact, type and count, and the writ says I file it. Bring the column up out of the Holding — they will be four minutes and I would rather everybody heard them coming.',
      note: 'Thirty — a contact filed rather than a fault. The column is audible for four minutes and arrives after the tuning has closed (§5, §7)',
      when: { kind: 'tolerance', ticks: TOLERANCE_TICKS, tier: ResolutionTier.Classification },
    },
    {
      kind: 'say',
      speaker: 'Chapter-Master Halden Vrey',
      text: 'They have entered us. Come home — the chord is read as it stands, and what is not taken is not taken. You will not be asked to explain it and I will not be offering an explanation to anybody who does not ask.',
      note: 'The recall. Not a failure: a partial outcome is an outcome, and the epilogue does not treat it as one (§5)',
      when: { kind: 'tolerance', ticks: TOLERANCE_TICKS, tier: ResolutionTier.Classification },
    },
    // The escort turns onto the water between the survey and the party's own
    // approach — the only bearing the survey can have held them on, since that
    // is where they came from and where they must go back to. Not a pursuit:
    // an interposition, which is what a writ pays an escort for.
    {
      kind: 'move',
      tag: 'the-escort',
      x: 2400,
      y: 1600,
      note: 'The escort interposes between the survey and the last bearing it held (§5)',
      when: { kind: 'tolerance', ticks: TOLERANCE_TICKS, tier: ResolutionTier.Classification },
    },
  ],

  /**
   * §8's Results, verbatim, with the lattice's own two readings assembling the
   * rest of the page beneath whichever line the count earned.
   *
   * "In tune" is the compliment, it is the only one the Order gives, and it is
   * two words. And "Enter it, and go and be dry" closes every ending but the
   * last — §12's one extra sentence, withheld from the taboo exactly as §8
   * withholds it.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      'In tune. The lattice is certified for the year, and the year is the only thing anybody in this chapter is certain of. You will do this again when you are old, and it will be someone else’s first. Enter it, and go and be dry.',
    [MissionOutcome.Partial]:
      'The chord is read as it stands, which is what a chord is called when it is read short of itself. Enter it, and go and be dry.',
    [MissionOutcome.Lost]:
      'The lattice will keep. — Say the name to the house yourself. It is not mine to enter.',
  },
};
