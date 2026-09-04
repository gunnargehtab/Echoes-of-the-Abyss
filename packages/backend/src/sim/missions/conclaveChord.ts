/**
 * The Second Chord 4 — Conclave. docs/mission-conclave-chord.md, transcribed.
 *
 * A data literal in `aptitude.ts`' idiom, on `aptitude.ts`' map: the document
 * owns the forces, the water, the beats, the numbers and the text, and where
 * this file and that document disagree one of them is wrong and the fix says
 * which. It is the second mission to resolve `outer-formations`, which is §11's
 * argument rather than a saving — the lattice Aptitude tuned a year ago *is*
 * the standing Vrey has, and a second map would be a second Third.
 *
 * **The mission is a refusal with an objective table under it**, and four
 * things make it the shape it is. All four are data:
 *
 * - **The fight is lost in figures before anybody fires** (§4). Two Cruisers
 *   and five Corvettes is 4,500 hull points and 342.7 a second against the
 *   party's 3,300 and 268.3, over a 900 m gun against a 550 m one. Nothing
 *   here enforces that; it is the roster, seated. campaign.md §2 rule 4's
 *   third and last mission earns its label by arithmetic, so torpedoes are
 *   struck (§3) — twelve shots at 700 damage would make the label false.
 * - **The lattice is six structures on the player's own party** (§2, §3), at
 *   the Sounding Spire's roster line: SIG 30 idle, HYD 45, 1,800 hull points.
 *   That makes a formation shootable, makes it the player's to lose, and —
 *   because the auto-acquire loop takes the nearest live hostile and does not
 *   exclude structures (§13) — makes it the shield for the hull standing its
 *   voice. §6's best sentence is a consequence of the engine, not a script.
 * - **The interval is at 14:00 and the tide ends thirty seconds later.** The
 *   close carries `conclusion: true`: the interval passes at its appointed
 *   time whatever is standing (§8), and it was appointed before the concern
 *   filed anything.
 * - **`the-rest` is the mission**, and it is failed by a conditional beat
 *   rather than by a predicate, because no predicate can say *nothing has
 *   happened*. See `THE_REST_TICKS` for the twelve ticks that make it read.
 *
 * Three things the format cannot do that the document asks for, each authored
 * as §13's own closest honest approximation rather than invented around:
 *
 * 1. **There is no predicate over what the player holds standing** (§13). The
 *    intended terminal row is *four voices and the Drone stand at 14:30* —
 *    a `build`-shaped predicate with a `tag?` beside the count. What ships is
 *    §8's six `extract` rows over the party plus the keystone rest, which read
 *    the *hulls* and not the *lattice*: a formation the column cored at 05:00,
 *    with a Knight hull in its cell at 14:00, reads as stood. The mission's
 *    argument survives because §6's real defence is at the column's legs.
 * 2. **An `extract` latches** (`isStanding`), so each voice row reads *a hull
 *    of the party was inside this cell at some tick between 13:30 and the
 *    close* — sixty seconds of window, not sixty seconds of standing. The
 *    reveal at 13:30 is what makes even that honest: without it, every voice
 *    the party crossed during the tide would already be Met.
 * 3. **No predicate reads the player's own transmissions** (§13, off
 *    docs/mission-the-dome.md §9). `sound` counts the authored `soundings` and
 *    no other emission, so a ping — SIG 95 omnidirectional, at the one moment
 *    eight houses are listening for this house — cannot fail `the-rest`. It
 *    lands on `the-quiet`, which is authored non-terminal on purpose, so a
 *    player who presses it at 14:00 still scores Complete. The document says
 *    so rather than letting a reader assume the ceiling caught it.
 *
 * And one finding this transcription made against its own document, which §7
 * has since been corrected for and §13 records: §7 used to call 3,775 m the
 * cutters' *nearest* Bass stop, against 3,737 m of firing contact, and concluded
 * that a party which has not moved hears nothing at 02:40. 3,775 m is the
 * *farthest* of §5's three stops. From the seat at 4,500, 500 they are 3,590 m
 * (1,000, 1,300), 3,699 m (900, 1,350) and 3,775 m (800, 1,250), so two of the
 * three are inside the Voice's ear and the party does hear the Bass being cut
 * without moving. **§5's stops were the authored fact and are transcribed here
 * unchanged** — the repair belonged in §7's inference and not in the water, and
 * it ran toward a louder telegraph rather than a quieter one, so nothing in §8's
 * telegraph argument moved. The test pins all three distances so the correction
 * cannot be lost again.
 */

import {
  CHORD_CONCLAVE_HEADER,
  Faction,
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  SIM,
  StructureKind,
  UnitKind,
} from '@echoes/shared';

import type {
  MissionDefinition,
  MissionObjective,
  MissionRegion,
  MissionSounding,
  MissionStructure,
} from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

/**
 * Sim ticks per mission pass — the runtime runs at the Echo cadence
 * (`match.ts`), and this is the unit every clock below is quantised to.
 */
const MISSION_PASS_TICKS = Math.round(SIM.TICK_HZ / SIM.ECHO_HZ);

const PLAYER = 0;
/** Reserved and empty, as every campaign mission reserves it. */
const COURT = 1;
/**
 * The works' slot — a filed works order on filed ground, worked by the book
 * (§5). Nobody here is wrong (campaign.md §2 rule 1).
 */
const WORKS = 2;

/** §11 — the Fields' floor, and the Approach's. Every metre of it is Mid-Water. */
const FIELD_FLOOR_M = 1700;
const APPROACH_FLOOR_M = 1450;

/**
 * §3 and §6 — the tone on the Voice's hull: within 400 m of a formation, bow
 * on it, held for twenty seconds at SIG 80. Aptitude's figures, unchanged, and
 * they live in the literal for `MissionSounding`'s stated reason: one mission's
 * authored numbers rather than a rule of the world.
 *
 * **What has changed is what a tone means.** On an ordinary afternoon it is a
 * measurement; on the tide of an appointed interval it is a stroke on the
 * carriage, and §8 reads the first one completed as the conclave called in the
 * Chapter-Master's name.
 */
const SOUND_RADIUS_M = 400;
const SOUND_HOLD_TICKS = 20 * SIM.TICK_HZ;
const SOUND_SIG = 80;

/** §4 and §8 — the ceiling, read as a flat scalar and not in the cone. */
const CEILING_SIG = 28;

/** §8 — thirty seconds at Classification, cumulative, across the party. */
const TOLERANCE_TICKS = 30 * SIM.TICK_HZ;

/**
 * §8 and §13 — the keystone rest's clock, and **the twelve is not a rounding**.
 *
 * `endure` is measured from `startedAt`, which `deriveObjectives` stamps the
 * first time it derives the objective — and the runtime's first pass is one
 * Echo interval into the match, not tick zero (`match.ts` increments the tick
 * before it runs the mission). So the row's progress at the close is
 * `T(14, 30) − 12` and not `T(14, 30)`, and a rest authored at the round figure
 * would come due one pass *after* the tide it belongs to: unmet at every close
 * the mission can have, which is a Lost reading on a perfect defence, in the
 * mission whose whole subject is a refusal that was kept.
 *
 * Authored a pass short, it comes due on the close's own pass — which is
 * exactly where §8's tick-order argument needs it, because a tone completed on
 * that same pass fails the row before derivation reaches it.
 */
const THE_REST_TICKS = T(14, 30) - MISSION_PASS_TICKS;

/**
 * One of the six voices — §6's table, whole.
 *
 * The point is the formation, to the metre and unchanged from
 * docs/mission-aptitude.md §6, because these are the same six formations and a
 * document that moved them would be describing a different house. The cell is
 * §6's own 500 m square around it, on the 250 m grid, and it is deliberately
 * larger than the formation: the ask is a Corvette clipping a corner at 85 m/s,
 * not a hull parked in a gun's face.
 */
interface Voice {
  /** Shared by the region, the marker and the sounding — one voice, one id. */
  id: string;
  /** As the readings name it: "Descant", "The Drone". */
  name: string;
  x: number;
  y: number;
  /** The cell's south-west corner (§6). */
  cellX: number;
  cellY: number;
  note: string;
}

/** §6's table, in the document's order — increasing ask, not an enforced one. */
const VOICES: readonly Voice[] = [
  {
    id: 'descant',
    name: 'Descant',
    x: 4300,
    y: 1500,
    cellX: 4000,
    cellY: 1250,
    note: 'Descant — 1,020 m from the seat, 23 s for the Voice. Nothing on the writ goes near it, and the Cruiser takes it because it is already there',
  },
  {
    id: 'tenor',
    name: 'Tenor',
    x: 3200,
    y: 600,
    cellX: 3000,
    cellY: 250,
    note: 'Tenor — 1,304 m, 15 s. Not on the writ, north of everything',
  },
  {
    id: 'treble',
    name: 'Treble',
    x: 3600,
    y: 3100,
    cellX: 3250,
    cellY: 2750,
    note: "Treble — 2,751 m, 32 s. Free, unless the hull overshoots south into the Seam, where PF 1.60 classifies a Corvette's cone at 2,371 m",
  },
  {
    id: 'alto',
    name: 'Alto',
    x: 2300,
    y: 3300,
    cellX: 2000,
    cellY: 3000,
    note: 'Alto — 3,561 m, 42 s. The whole column stands on it from 10:45: every metre inside the escort’s 900 and one cutter’s 550, and over most of it all three bear at 192.2 a second',
  },
  {
    id: 'bass',
    name: 'Bass',
    x: 900,
    y: 1100,
    cellX: 750,
    cellY: 750,
    note: 'Bass — 3,650 m, 43 s. Free after 05:00, when the column leaves it and never returns. Before that it is the first thing cut',
  },
  {
    id: 'the-drone',
    name: 'The Drone',
    x: 1100,
    y: 3000,
    cellX: 750,
    cellY: 2750,
    note: 'The Drone — 4,220 m, 50 s. The relief stands over it from 09:27 and does not leave; the cheapest metre is the north-west corner at 652 m from relief-lead, one Cruiser and neither Corvette, 67.2 a second. KEYSTONE',
  },
];

const voiceBy = (id: string): Voice => VOICES.find((voice) => voice.id === id)!;

/** §6 — the cell, 500 m on a side, on the 250 m grid. */
const cell = (voice: Voice): MissionRegion => ({
  id: voice.id,
  x: voice.cellX,
  y: voice.cellY,
  widthM: 500,
  heightM: 500,
  note: voice.note,
});

/** §3 — every tone is rigged to the Voice's hull, and there are six of them. */
const tone = (voice: Voice): MissionSounding => ({
  id: voice.id,
  tag: 'the-voice',
  x: voice.x,
  y: voice.y,
  radiusM: SOUND_RADIUS_M,
  holdTicks: SOUND_HOLD_TICKS,
  sig: SOUND_SIG,
  note: `A tone at ${voice.name} on the tide of an interval is a stroke on the carriage — the one act that fails the rest`,
});

/** §3 — a formation carries the Spire's stat line and nothing else about it. */
const formation = (voice: Voice): MissionStructure => ({
  tag: voice.id,
  kind: StructureKind.SoundingSpire,
  x: voice.x,
  y: voice.y,
  depthM: FIELD_FLOOR_M,
  note: `${voice.name} — SIG 30 idle, HYD 45, 1,800 hull points. Nine and a half seconds of a works column`,
});

/**
 * One voice's terminal row — §8's table, region by region.
 *
 * The two readings are the document's own template, placeholder and all
 * ("*\<Voice\> was stood.*" · "*\<Voice\> was not stood. The interval passed it
 * as drift.*"), so assembling them from the name transcribes §8 rather than
 * inventing the kind of line campaign.md §10 forbids. The `text` is authored
 * per row instead, because Descant's carries the rule and the Drone's carries
 * the keystone.
 */
const stood = (id: string, text: string, keystone?: true): MissionObjective => {
  const voice = voiceBy(id);
  return {
    id: `${id}-stood`,
    text,
    initial: ObjectiveStatus.Pending,
    markerId: id,
    terminal: true,
    ...(keystone === true ? { keystone } : {}),
    // §8: withheld from the panel *and* from derivation until the interval is
    // thirty seconds out, which is the latch the whole row depends on — a hull
    // that happened to be at the Bass at 04:00 has not stood the Bass at the
    // interval.
    revealAtTick: T(13, 30),
    predicate: { kind: 'extract', role: 'party', region: id, count: 1 },
    reading: {
      met: `${voice.name} was stood.`,
      unmet: `${voice.name} was not stood. The interval passed it as drift.`,
    },
  };
};

export const CHORD_CONCLAVE: MissionDefinition = {
  ...CHORD_CONCLAVE_HEADER,
  doc: 'docs/mission-conclave-chord.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Hadron,
  courtSlot: COURT,
  /** §2 — the Drift is not populated: no fauna seeded and none authored. */
  fauna: false,
  /**
   * §4 — twenty-eight, and this time a **flat scalar**. Aptitude's twenty-eight
   * was in the cone, a figure with a bearing attached; the Order is not being
   * heard by somebody at a bearing here, it is being listened for at an
   * appointed moment by eight houses at once, and direction is no help against
   * the whole compass. Five hulls clear it standing still. The Voice does not
   * clear it at all, which is why the refusal is a button.
   */
  sigBudget: CEILING_SIG,
  /**
   * No silence order and no array to lend (§4): the ceiling is an objective the
   * party meets at the close or does not, read out rather than ranked, so the
   * ledger never runs and nothing is withdrawn. Silent Running is present and,
   * for the first time in this campaign, right — the mission asks for a scalar
   * and no angle fixes 55 against 28.
   */
  silenceCeilingSig: 100,
  debtCapS: 0,
  /** No held freight: a party told not to win moves on its own orders. */
  escortRadiusM: 0,

  /**
   * §11 — seven regions, and no new geometry: six 500 m cells around the six
   * voices and a restatement of the Approach. The map literal carries the
   * Fields, the Approach and the Seam and is not touched.
   *
   * **No `pressureBonus` anywhere**, and the absence is authored rather than
   * forgotten: every metre here is Mid-Water and every hull PR-2, so a grant
   * would rate water that is already habitable. §10 files that as the thing
   * this map cannot teach.
   */
  regions: [
    ...VOICES.map(cell),
    {
      id: 'approach',
      x: 3750,
      y: 0,
      widthM: 1250,
      heightM: 1000,
      note: "The Third's Approach — the chapter-house's own water, at 1,450 m. The party sets out from it, and the 250 m between it and the Fields is 490 m of a cutter's 550 and 865 m of the escort's 900",
    },
  ],

  /**
   * §3 — six tones on the Voice's hull, one at each voice, and the mission
   * asks the player to take none of them. The `sound` tally is monotone from
   * tick zero and has no window (§13), which the document prices rather than
   * patches: a formation sounded at 05:00 is a call at 05:00, and a stroke
   * nobody appointed is worse than one somebody did.
   */
  soundings: VOICES.map(tone),

  /**
   * §8 — six markers, one per voice, and they ship only from 13:30 because a
   * marker travels with the objective that names it (`projectMissionView`).
   * The radius is the cell's own half-width: the marker points at the voice,
   * and the region is what is measured.
   */
  markers: VOICES.map((voice) => ({
    id: voice.id,
    label:
      voice.id === 'the-drone'
        ? 'The Drone. The chord does not certify without it.'
        : `${voice.name}. A hull at the voice, under the ceiling, for the interval.`,
    x: voice.x,
    y: voice.y,
    radiusM: 250,
  })),

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Hadron,
      note: "The Third's party — the same six hulls under Voice Ren Kalliso that tuned this lattice a year ago, put back on the same ground for the opposite reason (§2, §3), and the six formations they are here not to call",
      units: [
        /**
         * Kalliso's hull, the party's ears, and the hull the six tones are
         * rigged to. It idles at 55 against a ceiling of 28 and no bearing
         * fixes that — §4's fourth movement, and the reason Silent Running is
         * finally the right button for this faction.
         *
         * Generic hulls flying Knight colours, unchanged from
         * docs/mission-aptitude.md §3 and restated because §4's arithmetic is
         * quoted off it: a louder roster moves every distance below outward
         * together without changing which side of the trade wins.
         */
        {
          tag: 'the-voice',
          kind: UnitKind.Cruiser,
          x: 4500,
          y: 500,
          depthM: APPROACH_FLOOR_M,
          role: 'party',
          armed: true,
          souls: 12,
          note: 'The Voice — 55 idle / 65 live, HYD 65, 1,200 hull points, 150 at 900 m. Twelve aboard',
        },
        {
          tag: 'first',
          kind: UnitKind.Corvette,
          x: 4300,
          y: 400,
          depthM: APPROACH_FLOOR_M,
          role: 'party',
          armed: true,
          souls: 5,
          note: "The working hulls — 28 at cruise, which is exactly the interval's ceiling and the one piece of luck the Third has. Five of them, and six voices, and this tide the two counts are one number",
        },
        {
          tag: 'second',
          kind: UnitKind.Corvette,
          x: 4700,
          y: 400,
          depthM: APPROACH_FLOOR_M,
          role: 'party',
          armed: true,
          souls: 5,
          note: '',
        },
        {
          tag: 'third',
          kind: UnitKind.Corvette,
          x: 4200,
          y: 600,
          depthM: APPROACH_FLOOR_M,
          role: 'party',
          armed: true,
          souls: 5,
          note: '',
        },
        {
          tag: 'fourth',
          kind: UnitKind.Corvette,
          x: 4800,
          y: 600,
          depthM: APPROACH_FLOOR_M,
          role: 'party',
          armed: true,
          souls: 5,
          note: '',
        },
        {
          tag: 'fifth',
          kind: UnitKind.Corvette,
          x: 4500,
          y: 700,
          depthM: APPROACH_FLOOR_M,
          role: 'party',
          armed: true,
          souls: 5,
          note: '',
        },
      ],
      /**
       * §3 — the lattice, prebuilt on the player's own party at the six voice
       * points. Structures and not emitters, which §13 calls the honest reason
       * they are structures at all: an emitter would be inaudible to a gun and
       * unshootable, which is exactly backwards here.
       *
       * **Nothing pairs.** docs/mission-standing-wave.md §4 offers a node the
       * nearest unpaired node of the same commander within 1,500 m *at the
       * moment it completes*, and nothing here completes: these six were cut
       * and corrected thirty years ago, and a prebuilt structure skips the
       * construction path it would have to finish to be offered one. Worth
       * stating rather than assuming, because Tenor to Descant is 1,421 m,
       * Treble to Alto 1,315 and Alto to the Drone 1,237 — a lattice that
       * paired would lay corridors of sonic damage and PF 2.00 across the exact
       * cells §6 asks six hulls to stand in at 14:00.
       *
       * The PR grant is live and inert: every metre is Mid-Water and every hull
       * PR-2, so no grant is load-bearing, the Spires never go to 80, and they
       * hum at 30 all tide, which is the Fields ringing.
       */
      structures: VOICES.map(formation),
    },
    {
      slot: WORKS,
      faction: Faction.Bathyarch,
      note: "The works — a filed works order on filed ground, worked by the book (§5). Every seat is deliberately outside its own gun's reach of a formation, because a column seated 600 m from a Spire would core the Bass before the writ was read",
      units: [
        {
          tag: 'the-hold',
          kind: UnitKind.Harvester,
          x: 150,
          y: 2000,
          depthM: FIELD_FLOOR_M,
          note: 'The coring barge — 18 idle / 40 under way, HYD 30, 300 hull points, unarmed, and the slow part of every leg at 40 m/s',
        },
        {
          tag: 'escort',
          kind: UnitKind.Cruiser,
          x: 300,
          y: 2100,
          depthM: FIELD_FLOOR_M,
          armed: true,
          note: "The column's ears and the listener every distance in §4 is quoted against — HYD 65, 150 at 900 m on a 2.5 s cycle. 1,166 m from the Bass at its seat, against a 900 m gun",
        },
        {
          tag: 'cutter-one',
          kind: UnitKind.Corvette,
          x: 250,
          y: 1900,
          depthM: FIELD_FLOOR_M,
          armed: true,
          note: 'Their guns are the cutters: 50 at 550 m on a 1.2 s cycle, 125 a second between the three of them, and a formation is cored by being fired on',
        },
        {
          tag: 'cutter-two',
          kind: UnitKind.Corvette,
          x: 250,
          y: 2100,
          depthM: FIELD_FLOOR_M,
          armed: true,
          note: '',
        },
        {
          tag: 'cutter-three',
          kind: UnitKind.Corvette,
          x: 400,
          y: 2000,
          depthM: FIELD_FLOOR_M,
          armed: true,
          note: 'The nearest seat to a formation on the map — 1,030 m from the Bass, against a 550 m gun',
        },
        {
          tag: 'relief-lead',
          kind: UnitKind.Cruiser,
          x: 100,
          y: 2900,
          depthM: FIELD_FLOOR_M,
          armed: true,
          note: "The second element out of the Holding, standing 1,005 m off the Drone. From 09:27 it is the only gun that reaches the Drone cell's north-west corner",
        },
        {
          tag: 'relief-one',
          kind: UnitKind.Corvette,
          x: 100,
          y: 3050,
          depthM: FIELD_FLOOR_M,
          armed: true,
          note: 'At 28, this hull reaches a Knight Corvette’s HYD 50 from 2,129 m — which is a party that has already gone west and nobody else',
        },
        {
          tag: 'relief-two',
          kind: UnitKind.Corvette,
          x: 250,
          y: 2950,
          depthM: FIELD_FLOOR_M,
          armed: true,
          note: '',
        },
      ],
    },
  ],

  /**
   * §3 — what the party does not carry, with the Order's own reasons attached
   * (docs/ui-ux.md §7 greys an affordance out *with the reason*).
   *
   * **Active sonar is not here, and that is the entry that matters.** It was
   * handed over in docs/mission-nineteen.md and is not taken back: it is priced
   * rather than fenced, at SIG 95 omnidirectional in front of eight listening
   * houses. §13 states plainly what that leaves unpriced — the ping costs a
   * reading and not a rung — and the Order carries the rest in its register.
   */
  locks: [
    {
      ability: 'torpedoes',
      reason: 'nothing is launched on the tide of an interval',
    },
    {
      ability: 'construction',
      reason: "nothing is raised in a house's water on the tide of an interval",
    },
  ],

  /**
   * §8's table, in authored order, because the readings print in that order
   * beneath whichever epilogue the count earned.
   *
   * Seven terminal rows and two keystones, which is exactly §8's ladder: all
   * seven met is Complete, some met with both keystones standing is Partial,
   * and either keystone unmet is Lost whatever else came home. `the-quiet` and
   * `the-count` are readings rather than rungs and close nothing — §13 defends
   * the first of those decisions at length and states what it costs.
   */
  objectives: [
    stood('descant', 'Descant is stood. A hull at the voice, under the ceiling, for the interval.'),
    stood('tenor', 'Tenor is stood.'),
    stood('treble', 'Treble is stood.'),
    stood('alto', 'Alto is stood.'),
    stood('bass', 'Bass is stood.'),
    stood('the-drone', 'The Drone is stood. The chord does not certify without it.', true),
    {
      id: 'the-rest',
      text: "The interval is the Third's. Nothing is struck. A rest is written down, it is played, and it is not an absence.",
      initial: ObjectiveStatus.Pending,
      terminal: true,
      keystone: true,
      /**
       * §8 — an `endure` run out over the mission's whole length, shown from
       * 00:00 and failed by a conditional beat rather than by a predicate,
       * because no predicate can say *nothing has happened*.
       *
       * The tick order holds it in both directions and the document states it
       * rather than assuming it: conditional beats fire after every tally and
       * immediately before derivation, derivation skips a `Failed` row for
       * good, and the `resolve` is deferred until after derivation on its own
       * tick. So a tone completed on the 14:30 pass fails the rest before the
       * endure could read Met, and an endure due on the resolve pass reads Met
       * beneath a conclusion. See `THE_REST_TICKS` for why it is due on the
       * pass and not on the tick.
       */
      predicate: { kind: 'endure', ticks: THE_REST_TICKS },
      reading: {
        met: 'Nothing was struck. The Third was heard not calling, at every interval where it could have.',
        unmet:
          'The Third called. The count is entered in an order the Chapter-Master did not choose.',
      },
    },
    {
      id: 'the-quiet',
      text: 'The Third is quiet at its own interval. Twenty-eight, and the Voice under silence.',
      initial: ObjectiveStatus.Pending,
      revealAtTick: T(13, 30),
      /**
       * Non-terminal on purpose (§13): `quiet` is standing and re-derived every
       * tick, so as a rung it would flip the whole outcome on one tick's SIG —
       * a Corvette firing at 38 in the last second would demote a Complete tide
       * to Partial. The Order reads a courtesy out; it does not rank one
       * against a voice.
       *
       * And it reads a **role**, never the player's whole slot, which is
       * load-bearing exactly here: six formations humming at 30 would otherwise
       * fail a ceiling of 28 from tick zero, in the one mission where that is
       * fatal to the subject.
       */
      predicate: { kind: 'quiet', role: 'party', ceilingSig: CEILING_SIG },
      reading: {
        met: 'The Third was quiet at the interval.',
        unmet:
          'The Third was heard at its own interval, and what is heard at an interval is a stroke.',
      },
    },
    {
      id: 'the-count',
      text: 'A concern is coring under a writ. What is classified of the party is filed, and the escort defines obstruction.',
      initial: ObjectiveStatus.Pending,
      // The concern's documented reflex, cumulative and capped, and meeting it
      // is not bad news — docs/mission-aptitude.md §5's tolerance, carried
      // forward to the same concern on the same ground a year later.
      predicate: {
        kind: 'tolerance',
        ticks: TOLERANCE_TICKS,
        tier: ResolutionTier.Classification,
      },
      reading: {
        met: 'The concern classified the party at length and filed it. The ground was filed first, which the register will say is the whole of the difference.',
        unmet:
          'Nothing was filed against the Third this tide. The writ is discharged on its own terms and the formations are entered as worked.',
      },
    },
  ],

  /**
   * §9's beat table — **the world's clock, not the player's**. The column's
   * legs and the chapter channel are scheduled; where the party is at any tick
   * is the player's business, and a party that intervenes moves every
   * consequence the document brackets.
   *
   * The legs are authored so the column is never walking whole (§4, §13): a
   * scripted hull under a move order holds its fire, so the escort's three
   * walks are covered by three standing cutters, the cutters' three by a
   * standing Cruiser, and from 09:27 the relief stands over the Drone and does
   * not move again. Each hull moves at its own roster speed — Corvette 85 m/s,
   * Cruiser 45, Harvester 40 — so one order to four hulls arrives spread over
   * seventeen seconds on the first leg and twenty-three on the second, which is
   * what a works column looks like when the barge is the slow part (§13).
   */
  beats: [
    {
      atTick: 0,
      kind: 'say',
      speaker: 'Chapter-Master Halden Vrey',
      text: 'Good. You have stood this ground before and you stood it quiet, and the only thing that has changed is what is standing on it. The interval is at fourteen. It is the Third’s, it is appointed, and the Order will be listening at it, because that is the whole of what an interval is. What the other eight houses will hear from this house at fourteen is nothing. I would like you to understand that the nothing is the instruction.',
      note: '§9, §12 — Vrey sets the interval. Read, not heard: the standing status of the say channel',
    },
    {
      atTick: T(0, 30),
      kind: 'say',
      speaker: 'Surveyor Ade Bramm, on the works channel',
      text: 'Works order for the shift: three formations, cored to the registry’s grade. The ground is filed. Nothing that does not obstruct will be fired upon, and the escort defines obstruction.',
      note: '§9 — the writ, filed and read out by the party that will execute it. A document rather than an alarm, and the mission’s telegraph eleven and a half minutes early',
    },

    // 02:30 — the first leg, and the writ's first formation. The cutters stand
    // at ~02:40, ~02:43 and ~02:40 (851, 1,097 and 820 m at 85 m/s) and the
    // hold at ~02:57 (1,061 m at 40). Unopposed the Bass comes apart at about
    // 02:55, on the player's own panel, with eleven and a half minutes to run.
    {
      atTick: T(2, 30),
      kind: 'move',
      tag: 'cutter-one',
      x: 800,
      y: 1250,
      note: '§5 — the cutters onto the Bass. 180–250 m off the formation, which is why the column shoots the formation and not the hull beside it',
    },
    { atTick: T(2, 30), kind: 'move', tag: 'cutter-two', x: 1000, y: 1300, note: '' },
    { atTick: T(2, 30), kind: 'move', tag: 'cutter-three', x: 900, y: 1350, note: '' },
    {
      atTick: T(2, 30),
      kind: 'move',
      tag: 'the-hold',
      x: 900,
      y: 1250,
      note: 'The barge, ordered with them and arriving seventeen seconds behind: 1,061 m at 40 m/s',
    },
    {
      atTick: T(3),
      kind: 'move',
      tag: 'escort',
      x: 700,
      y: 1400,
      note: "§5, §7 — half a minute behind three cutters that need 14.4 seconds, so unopposed it arrives twenty-three seconds after the Bass has gone and never fires. Its walk is the only thing that crosses the Voice's ear in the first five minutes: inside 4,245 m from about 03:07, and outside it again the moment it stands at 3,905 m",
    },

    // 05:00 — the second leg, onto the Drone. Cutters standing ~05:18–05:21,
    // the hold ~05:42, and the Drone cut at about 05:35 if nothing has stood in
    // front of it.
    {
      atTick: T(5),
      kind: 'move',
      tag: 'cutter-one',
      x: 1000,
      y: 2850,
      note: "§5 — the writ's second formation. From here the Bass is free and the column never returns to it",
    },
    { atTick: T(5), kind: 'move', tag: 'cutter-two', x: 1200, y: 2850, note: '' },
    { atTick: T(5), kind: 'move', tag: 'cutter-three', x: 1100, y: 3150, note: '' },
    { atTick: T(5), kind: 'move', tag: 'the-hold', x: 1100, y: 2900, note: '' },
    {
      atTick: T(5, 45),
      kind: 'move',
      tag: 'escort',
      x: 900,
      y: 2900,
      note: '§7 — twenty-nine seconds of the same smudge, ending outside the Voice’s ear at 4,327 m',
    },

    {
      atTick: T(8),
      kind: 'say',
      speaker: 'Chapter-Master Halden Vrey, on the chapter channel',
      text: 'The interval is at fourteen. I have the standing and I am telling you now, so that nobody is surprised at fourteen: I will not be using it. The Choirmaster is listening. I would like her to hear that. I will be in the chord, and you will not hear me there, which is the point of a chord.',
      note: '§12 — the mission, said out loud, eight minutes before the mission',
    },

    // 09:00 — the relief closes on the Drone's water and does not move again.
    // From here the column is two Cruisers and five Corvettes, which is the
    // arithmetic the briefing quoted at 00:00.
    {
      atTick: T(9),
      kind: 'move',
      tag: 'relief-lead',
      x: 1300,
      y: 3100,
      note: '§5, §6 — standing by ~09:27, 652 m from the Drone cell’s north-west corner, and it does not move again',
    },
    { atTick: T(9), kind: 'move', tag: 'relief-one', x: 1350, y: 3250, note: '' },
    { atTick: T(9), kind: 'move', tag: 'relief-two', x: 1250, y: 3300, note: '' },
    {
      atTick: T(9, 30),
      kind: 'say',
      speaker: 'Voice Ren Kalliso, to nobody in particular',
      text: 'That is a works order played in tune. Whoever set those cutters set them a fourth apart and will never know it, and I am the only person in this water who can hear it, and it is the least useful thing I have ever been able to do. They did not even hear that.',
      note: '§9, §13 — on the clock rather than on a condition, because every predicate is a query over the player’s own force and "the column has lost a cutter" is inexpressible. Written to be true whether or not the player has taken one',
    },

    // 10:30 — the third and last formation on the writ. Cutters standing
    // ~10:45 (1,237 m each), the hold ~11:01, the Alto cut at about 10:59.
    {
      atTick: T(10, 30),
      kind: 'move',
      tag: 'cutter-one',
      x: 2200,
      y: 3150,
      note: '§5 — onto the Alto, and every stop is on Fields ground at 1,700 m: the southernmost, 2,300, 3,450, is 50 m north of the Seam',
    },
    { atTick: T(10, 30), kind: 'move', tag: 'cutter-two', x: 2400, y: 3150, note: '' },
    { atTick: T(10, 30), kind: 'move', tag: 'cutter-three', x: 2300, y: 3450, note: '' },
    { atTick: T(10, 30), kind: 'move', tag: 'the-hold', x: 2300, y: 3200, note: '' },
    {
      atTick: T(11, 15),
      kind: 'move',
      tag: 'escort',
      x: 2100,
      y: 3200,
      note: '§9 — standing ~11:43. The column is on the Alto and the relief is on the Drone, and the two hardest voices are the two the player has left',
    },

    {
      atTick: T(13, 30),
      kind: 'say',
      speaker: 'Chapter-Master Halden Vrey',
      text: 'Thirty seconds. Six voices, and the ceiling is twenty-eight. Stand them. A tone at a voice is a stroke on the carriage and the houses will hear it as mine.',
      note: '§9, §12 — the tick the six voices and the quiet are revealed, and the beat that hands them over shares it, as the format requires',
    },
    {
      atTick: T(14),
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull, from the Ninth',
      text: 'Heard.',
      note: '§9, §12 — the interval, whatever is standing. One word, where the Directorate would have said "entered" and meant a record rather than a person',
    },
    {
      atTick: T(14, 30),
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull, at the close',
      text: 'Heard. — The window is what I wrote to the houses. It is shorter now.',
      note: '§12 — in every ending, and the sentence that sends the campaign to the First and then to the rim',
    },
    {
      atTick: T(14, 30),
      kind: 'resolve',
      conclusion: true,
      /**
       * §8 — the interval passes at its appointed time whatever is standing, so
       * the close is a conclusion and campaign.md §10's sixty-second telegraph
       * exempts it. **It clears the rule anyway, by eleven and a half minutes**,
       * and not by exemption: Bramm reads the writ at 00:30 naming how many
       * formations he intends to core, the Bass's own hull points fall on the
       * player's own panel from 02:40 and it is gone at 02:55, the escort's walk
       * crosses the Voice's 4,245 m at about 03:07, and the relief walks in at
       * 09:00.
       *
       * Vrey's reading of the count is the epilogue, delivered by this beat;
       * §9's "Vrey reads it, then Sull" is one tick in the format, and Sull's
       * line is the `say` above.
       */
      note: '§9 — the interval has passed. A conclusion, not a timer',
    },
  ],

  /**
   * The standing rules, in no order at all — §9's second table.
   *
   * **No `choiceGroup`**: nothing here is exclusive with anything, and all
   * three effects on the first condition are due on the same pass, which is
   * exactly the case the group's own contract carves out.
   */
  conditionalBeats: [
    {
      kind: 'objective',
      id: 'the-rest',
      status: ObjectiveStatus.Failed,
      note: '§8 — the first completed tone fails the rest, latched. No predicate can say "nothing has happened", so the row is an endure and this is the thing that stops it',
      when: { kind: 'sound', count: 1 },
    },
    {
      kind: 'say',
      speaker: 'The lattice',
      text: 'The Fifth answers. The Ninth answers. The Seventh —',
      note: '§9 — the lattice answers, which is the one line here nobody wants to hear: the other eight houses are named only if the call is struck',
      when: { kind: 'sound', count: 1 },
    },
    {
      kind: 'say',
      speaker: 'Chapter-Master Halden Vrey',
      text: 'That was struck in the Third’s name. It was not my hand, and the houses cannot know that, and I will not tell them, because a Chapter-Master whose Voice calls for him has already lost the vote he did not call.',
      note: '§12 — if the lattice is struck, on the first sounding. Third of three effects on one condition, in authored order',
      when: { kind: 'sound', count: 1 },
    },
    {
      kind: 'say',
      speaker: 'Surveyor Ade Bramm, on the works channel',
      text: 'Contact filed. Knight hulls at bearing — . The escort defines obstruction from here.',
      note: '§9 — the concern’s documented reflex at thirty seconds of Classification, and nothing else: the column’s legs are the clock, and the relief is scheduled rather than conditional because the works order was written before anybody heard the Order',
      when: { kind: 'tolerance', ticks: TOLERANCE_TICKS, tier: ResolutionTier.Classification },
    },
  ],

  /**
   * §8's Results, verbatim — four rows on three rungs, which `epilogue`'s three
   * strings make a constraint rather than a want.
   *
   * The two ways of losing are *Drift* (the Drone not stood) and *Called* (the
   * lattice struck), and the Lost line is Vrey holding both at once while the
   * two keystones' own unmet readings print beneath it and say which happened.
   * docs/mission-aptitude.md §8 has the same shape for the same reason and this
   * copies it deliberately.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      'Six stood, nothing struck. The Third was heard not calling, and the Choirmaster has heard it, which is all I asked of the interval. Enter it, and go and be dry.',
    [MissionOutcome.Partial]:
      'The interval passed with the Third short a voice. A rest is played on purpose and I will not pretend that one was. The houses heard the Third not call, and heard that it could not have called whole, and the second half is the concern’s, and I will be courteous about it.',
    [MissionOutcome.Lost]:
      'The interval passed and there was nothing in it to hear. A rest is a thing you play; drift is a thing that happens to you, and the houses can tell them apart, which is the entire reason a house keeps a lattice. What was stood and what was struck is entered beneath this, in the order it happened.',
  },
};
