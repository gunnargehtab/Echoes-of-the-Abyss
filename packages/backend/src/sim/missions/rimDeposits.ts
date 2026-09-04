/**
 * The Second Chord 6 — The Rim Deposits. docs/mission-rim-deposits.md, transcribed.
 *
 * A data literal in `intake.ts`'s and `firstArrival.ts`'s idiom: the document
 * owns the forces, the water, the beats, the numbers and the text. Where this
 * file and that document disagree, one of them is wrong and the fix says which.
 *
 * §13 is the shortest scaffold list any of the fourteen carries, and it is
 * right: nothing here needed a format change. The one system the mission
 * teaches — a Sounding Spire that rents a band of depth and sings at eighty for
 * exactly as long as that grant is holding somebody up — has shipped in
 * `auras.ts` since the Spire did, and this is its first spender. What the
 * literal found on the day is four things, each stated here so a reviewer can
 * overrule them rather than discover them:
 *
 * 1. **Two loads on one hull in one region rig together, not in sequence.**
 *    `MissionRuntime.applyLifts` walks the lift table and accrues every lift
 *    whose carrier is standing in its region on that pass, independently. So
 *    `cutter-a` holding `face-four` accrues `load-one` and `load-two` at the
 *    same time and rigs both at four minutes. §6 and §9 read *eight* minutes on
 *    a face when this was found — "cut it twice", second cuts running 05:30 to
 *    09:30 — and the document is the side that moved (§13): §6 now says the two
 *    are not a sequence and prices the face at one four-minute hold, §9 rigs
 *    all five loads by about 05:30, and the tide's second half belongs to the
 *    raid that stayed. The five lifts are authored exactly as §6's table gives
 *    them, because the table is the mission, and serialising a pair would take
 *    a per-carrier mechanism the format does not have and §13 does not ask for.
 * 2. **`runsItsLength` is omitted and that is load-bearing** (§9, in as many
 *    words). Every terminal row is an `extract` gated on a load, and no load
 *    exists at tick zero, so the court's rule cannot close the tide on the
 *    first pass — it can only close it when all five loads are above the line,
 *    which is the Order leaving while leaving is still a choice.
 * 3. **The correction's stops are authored points, and the document gives
 *    bounding boxes.** §11 states where the two waves end as ranges — 3900–4050
 *    × 2600–2750 and 4750–4950 × 2350–2450 — and §6 and §9 state what must be
 *    true of them: 180–335 m from node-one and 150–269 m from node-two, 400 m
 *    or more from a cutter on the fourth face and 320–461 m from one on the
 *    sixth, one stop 150 m off the fourth face's eastern edge and one 100 m off
 *    the sixth's north-western corner. The twelve points below satisfy every
 *    one of those to the metre; see the notes on each.
 * 4. **The muster is a rank, and the document's leg range used to be a
 *    point's.** §9 measured the correction's transit as 1,521–1,724 m, which is
 *    the distance from (5400, 3450) — `cohort-7`'s own seat — to the nearest
 *    and furthest corner of §11's first-wave box, and six hulls need six
 *    reference points rather than one. The rank authored here stands clear of
 *    every seat on the lip, of the 9th's rank at y 3,650 and of the twelve's at
 *    y 3,200 and 3,450, and its six legs run 1,521–1,722 m, which is what §9
 *    now prints (§13); the window it was quoted for, 04:38 to 04:43, is
 *    unchanged. §9 and §11 say nothing about where the muster stands, so the
 *    six points are this literal's own and are stated here rather than hidden.
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **The nodes are prebuilt, at 2,600 m, and they are the mission.** A
 *   player-raised structure sits at `CONSTRUCTION.WORKING_DEPTH_M` wherever the
 *   floor is (§13), so construction is locked with a reason in register and the
 *   two Spires are `MissionStructure`s at the terrace floor. `STRUCTURE_AURAS.
 *   SOUNDING_SPIRE` does the rest: 600 m horizontal, PR+1, same slot only, and
 *   SIG 30 → 80 for exactly as long as a hull inside is genuinely below its own
 *   rating. The raid is loud in proportion to how many of its hulls are alive
 *   underneath, and it goes quiet the instant the last one climbs out.
 * - **One Directorate party, for the engine's reason** (§2, §13). `MissionParty`
 *   hostility is `Owner.slot` and every party is an enemy of every other, so
 *   twelve armed Choristers on a slot of their own would open fire on the 9th's
 *   submersibles standing 200 m away and on the dome at 447 m. The watch, the
 *   9th, the dome and the cohort are therefore one party. The attendants are a
 *   *second* Directorate-faction party and are safe there, because `combat.ts`
 *   refuses to auto-acquire a `StaticEmitter`.
 * - **Nothing pursues.** The correction is `move` beats and `combat.ts`'s own
 *   auto-acquire: a moving scripted hull holds its fire and a stationary one
 *   takes the nearest live enemy inside its range. Both waves are seated so the
 *   node is nearer than a cutter working its face, and a Knight hull that puts
 *   itself nearer is corrected instead (§6). That is emergent and not scripted,
 *   and it is why there is no beat here that fires a gun.
 * - **The close is not a conclusion.** A raid can fail (§8), so campaign.md
 *   §10's telegraph applies: the basin lifts at 14:30 with `loud: true` against
 *   a resolve at 16:00, which is ninety seconds against a sixty-second rule.
 *
 * And two facts about this water that the document states and the literal
 * deliberately does not encode, because nothing in `packages/backend/src`
 * reads them:
 *
 * - **The two nodes stand 1,154 m apart, inside `STANDING_WAVE.PAIR_RANGE_M`,
 *   and they are not a pair** (§4). The pairing rule fires at the moment a node
 *   *completes* and asks for a finished, unpaired node already standing beside
 *   it; these two were raised together at one turn, so neither had a partner to
 *   take. The pass that would decide it is unbuilt in any case, so this file
 *   says nothing about it and the water carries no corridor.
 * - **A `MissionRegion` is a plan-view rectangle** (§6, §13). `applyLifts` tests
 *   `Position.x` and `Position.y` and nothing else, so a cutter held at 1,750 m
 *   over the faces rigs all five loads with the nodes idle at 30 and the whole
 *   rented rating unspent. The descent is the fiction the beats and the
 *   briefing carry; the node's own silence is the tell that nobody is under it.
 */

import {
  CHORD_RIM_DEPOSITS_HEADER,
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

import type {
  MissionBeat,
  MissionDefinition,
  MissionEmitter,
  MissionLift,
  MissionObjective,
  MissionUnit,
} from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/** §2 — reserved and empty, exactly as the other three rim missions reserve it. */
const COURT = 1;
/** §5 — the plateaus: the charting pair at First Arrival's seats, and the bed. */
const PLATEAUS = 2;
/** §2, §5, §13 — the watch, the 9th, the dome and the twelve, on one slot. */
const DIRECTORATE = 3;
/** §5 — the rim's attendants: a party whose only assets in the water are sounds. */
const ATTENDANTS = 4;

/** §11 — the raid's seats over the Staging's 1,500 floor. Mid-Water, PR-2, no refit. */
const STAGING_DEPTH_M = 1400;
/** §11 — the nodes, on the terrace floor. A structure carries no `crushable`. */
const NODE_DEPTH_M = 2600;
/** §11 — the charting pair's seat over the terraces, Prospect's own and First Arrival's. */
const PAIR_DEPTH_M = 2100;
/**
 * §11 — the lip, and the deepest order `match.ts` accepts. The lip's floor is
 * 3,100, so no hull on this map is ordered below 3,000 m because none can be.
 */
const LIP_DEPTH_M = DEPTH.MAX_M;
/**
 * §11 — the attendants and the basin's spawn: an emitter or a creature may sit
 * at 3,050 over a floor of 3,100 where a hull the runtime orders may not.
 */
const ATTENDANT_DEPTH_M = 3050;
/** §9, §11 — where the correction stands, on the terraces the cutters work. */
const CORRECTION_DEPTH_M = 2600;

/**
 * §6 — four minutes of held presence a load, at a SIG floor of 65.
 *
 * Sixty-five is Standard throttle's 45 plus the crystal premium's 20
 * (`HARVEST_THROTTLE`, `RESOURCE`), which through the terraces' 0.70 is
 * Classification to a dome-lifted ear from 3,035 m. This literal's authored
 * figures, not `constants.ts` entries: they are one mission's arithmetic.
 */
const CUT_TICKS = T(4);
const CUT_SIG = 65;

/** §7, §11 — the attendants' own durability, Prospect's figure unchanged. */
const RETURN_HP = 5000;

/** §8, §12 — thirty cumulative seconds at Classification or better. */
const COUNT_TICKS = 30 * SIM.TICK_HZ;

/**
 * One of the raid's five Corvette hulls — Knight-rigged, PR-2, no refit, armed.
 *
 * `armed` on every hull of this party (§3, §13): this is the first Knight
 * mission that expects to be shot at, and `weapons` and `torpedoes` are live
 * rather than struck. Five souls each, and the roster still has no Knight hull
 * in it — the party flies Order colours on generic hulls and the directional
 * figures are Aptitude's (28 cone, 9.8 flank, 2.8 wake).
 */
const corvette = (tag: string, role: string, x: number, y: number, note: string): MissionUnit => ({
  tag,
  kind: UnitKind.Corvette,
  x,
  y,
  depthM: STAGING_DEPTH_M,
  role,
  armed: true,
  souls: 5,
  note,
});

/**
 * One of the twelve — a Chorister on the eastern lip, at First Arrival's seat.
 *
 * `pressureRating: 3` is the mission's fact and never the roster's: `units.ts`
 * rates the hull PR-2 so a PR-3 hull at 30 Nodules cannot sell the Abyssal band
 * to everybody, and the Directorate's baseline lifts it for nothing at runtime
 * — but `missions.test.ts` reads the authored rating, and a PR-2 Chorister
 * seated at 3,000 m fails it. §13 records this as the sixth mission to field
 * the hull and the fifth to author the refit.
 *
 * Armed, and the only guns on the rim that are not the player's (§5). 20 damage
 * a second at 450 m: six of them are 120 a second, and 1,800 HP of Sounding
 * Spire is fifteen seconds of that.
 */
const chorister = (ordinal: number, x: number, y: number, note: string): MissionUnit => ({
  tag: `cohort-${ordinal}`,
  kind: UnitKind.Chorister,
  x,
  y,
  depthM: LIP_DEPTH_M,
  armed: true,
  pressureRating: 3,
  note,
});

/**
 * One of the six Abyssal Submersibles — the watch's two and the 9th's four.
 *
 * PR-3 on the roster and needing no refit (§5), which is why this helper
 * authors none: the refit above is a fact about the cheap hull, and stating it
 * here as well would make the two look like one rule.
 */
const submersible = (tag: string, x: number, y: number, note: string): MissionUnit => ({
  tag,
  kind: UnitKind.AbyssalSubmersible,
  x,
  y,
  depthM: LIP_DEPTH_M,
  armed: true,
  note,
});

/**
 * One load — a `MissionLift` on its assigned cutter, cut inside its face's
 * rectangle (§6). Five of them across three hulls: two of the three stand on
 * their face and take two loads off it.
 */
const load = (id: string, tag: string, region: string, note: string): MissionLift => ({
  id,
  tag,
  region,
  cutTicks: CUT_TICKS,
  cutSig: CUT_SIG,
  note,
});

/**
 * One of the two returns on the lip — Prospect's §5 and First Arrival's §11,
 * unchanged in place, loudness and rhythm, on the tide after.
 *
 * The readings are the pair the close enters for it, and §8 states the one
 * respect in which the Order's differ from the concern's: **the Order does not
 * keep a gap.** The concern files an absence as a shorter file; the Order
 * enters that it did not hear and declines to say what it did not hear.
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
  // raid are exactly as loud as each other and neither remarks on it.
  sig: 24,
  periodTicks: periodS * SIM.TICK_HZ,
  onTicks: onS * SIM.TICK_HZ,
  hp: RETURN_HP,
  reading: {
    entered: `Entered: the ${bearing} return, by bearing and by period, and it is not said what it is. The Order replies to what speaks, and this is not the thing that is speaking.`,
    gap: `Not entered: the ${bearing} return. The Order does not keep a gap; it keeps that it was not listening, which is a different entry and a worse one.`,
  },
  note,
});

/**
 * One of the five per-load rows of §8 — a named `loaded` extract into the
 * staging, terminal, read out at the close in §8's own two forms.
 *
 * A named load counts the hull carrying *that* cut, so the count is always one
 * and the row is a fact about the load rather than about the hull being loaded
 * at all (types.ts, `MissionPredicate`).
 */
const loadHome = (
  id: string,
  lift: string,
  text: string,
  ordinal: string,
  face: string,
  markerId?: string
): MissionObjective => ({
  id,
  text,
  initial: ObjectiveStatus.Pending,
  terminal: true,
  markerId,
  predicate: { kind: 'extract', role: 'cutter', region: 'staging', count: 1, loaded: lift },
  reading: {
    met: `The ${ordinal} cut of the ${face} face is home.`,
    unmet: `The ${ordinal} cut of the ${face} face is on the rim, or in the rim.`,
  },
});

/**
 * One hull of the first wave, mustering at 03:00 and correcting at 04:00.
 *
 * Two beats and one hull, written together so the leg the document prices is
 * beside the stop it is priced to. The muster is on the lip at 3,000 m; the
 * stop is on the terraces at 2,600, which is 400 m of climb the cohort takes
 * forty seconds over and arrives anyway.
 */
const firstWave = (
  ordinal: number,
  muster: { x: number; y: number },
  stop: { x: number; y: number },
  note: string
): { muster: MissionBeat; correction: MissionBeat } => ({
  muster: {
    atTick: T(3),
    kind: 'move',
    tag: `cohort-${ordinal}`,
    x: muster.x,
    y: muster.y,
    depthM: LIP_DEPTH_M,
    note: 'Mustering in step on the lip, and standing by 03:14',
  },
  correction: {
    atTick: T(4),
    kind: 'move',
    tag: `cohort-${ordinal}`,
    x: stop.x,
    y: stop.y,
    depthM: CORRECTION_DEPTH_M,
    note,
  },
});

/** One hull of the second wave — no muster, straight off its seat at 07:00. */
const secondWave = (ordinal: number, x: number, y: number, note: string): MissionBeat => ({
  atTick: T(7),
  kind: 'move',
  tag: `cohort-${ordinal}`,
  x,
  y,
  depthM: CORRECTION_DEPTH_M,
  note,
});

/**
 * §9, §11 — the first wave: `cohort-1`…`cohort-6`, mustering at 03:00 and on
 * the terraces between 04:38 and 04:43.
 *
 * The six stops are 180, 246, 285, 292, 316 and 335 m from node-one, which is
 * §6's "180–335 m" to the metre, and 400, 427, 475, 481, 550 and 552 m from a
 * cutter standing on the fourth face at 3500, 2600 — §6's "400 m or more away
 * and the node is nearer", also to the metre. Their bounding box is §11's
 * 3900–4050 × 2600–2750 exactly. The legs run 1,521, 1,565, 1,588, 1,635,
 * 1,644 and 1,722 m at the Chorister's 40 m/s: 38.0 s to 43.0 s, so the wave is
 * standing between 04:38 and 04:43 (§9).
 */
const FIRST_WAVE = [
  firstWave(
    1,
    { x: 5450, y: 3350 },
    { x: 3900, y: 2600 },
    "The western stop, and the volunteer's edge: 180 m from node-one, 400 m from a cutter on the fourth face, and 150 m from that face's eastern edge. A cutter that works the eastern edge has put itself nearer than the node and is corrected instead (§6). 1,722 m of leg"
  ),
  firstWave(
    2,
    { x: 5400, y: 3300 },
    { x: 3975, y: 2600 },
    '246 m from node-one, 475 from the face. 1,588 m of leg'
  ),
  firstWave(
    3,
    { x: 5450, y: 3300 },
    { x: 4050, y: 2600 },
    '316 m from node-one, 550 from the face. 1,565 m of leg'
  ),
  firstWave(
    4,
    { x: 5400, y: 3400 },
    { x: 3900, y: 2750 },
    '292 m from node-one, 427 from the face. 1,635 m of leg'
  ),
  firstWave(
    5,
    { x: 5450, y: 3400 },
    { x: 3975, y: 2675 },
    '285 m from node-one, 481 from the face. 1,644 m of leg'
  ),
  firstWave(
    6,
    { x: 5400, y: 3350 },
    { x: 4050, y: 2650 },
    'The furthest stop from node-one at 335 m, and still inside a Chorister’s 450. 1,521 m of leg, and the first hull standing, at 04:38'
  ),
];

/**
 * §9, §11 — the second wave: `cohort-7`…`cohort-12`, straight off their seats
 * at 07:00 and standing between 07:30 and 07:37.
 *
 * The six stops are 150, 158, 206, 250, 255 and 269 m from node-two — §6's
 * "150–269 m" to the metre — and 320, 336, 354, 430, 461 and 461 m from a
 * cutter on the sixth face at 5100, 2700, which is §6's "320–461 m" to the
 * metre again. Their bounding box is §11's 4750–4950 × 2350–2450 exactly. The
 * legs run 1,185, 1,253, 1,312, 1,331, 1,414 and 1,485 m: 29.6 s to 37.1 s,
 * standing between 07:30 and 07:37 (§9).
 */
const SECOND_WAVE: readonly MissionBeat[] = [
  secondWave(
    7,
    4800,
    2350,
    'The furthest stop from node-two at 269 m, on the water a loaded cutter climbs out through. 1,253 m of leg'
  ),
  secondWave(8, 4950, 2400, '206 m from node-two. 1,185 m of leg, and the first hull standing'),
  secondWave(9, 4850, 2350, '255 m from node-two. 1,331 m of leg'),
  secondWave(10, 4850, 2450, '158 m from node-two. 1,312 m of leg'),
  secondWave(
    11,
    4750,
    2400,
    "The western stop: 250 m from node-two, 461 from a cutter on the sixth face, and 100 m from that face's north-western corner. The second corner a Knight hull can volunteer at (§6). 1,485 m of leg, and the last hull standing, at 07:37"
  ),
  secondWave(
    12,
    4900,
    2450,
    'Due north of node-two at 150 m, the nearest stop of the twelve. 1,414 m of leg'
  ),
];

export const CHORD_RIM_DEPOSITS: MissionDefinition = {
  ...CHORD_RIM_DEPOSITS_HEADER,
  doc: 'docs/mission-rim-deposits.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Hadron,
  courtSlot: COURT,
  /** §11 — fauna are off; the one creature is the basin, and it is a beat. */
  fauna: false,
  // §9 — `runsItsLength` is omitted, so the court's rule applies: five loads
  // above the line closes the raid on that pass, which is the Order leaving
  // while leaving is still a choice. Safe at tick zero because every terminal
  // row is gated on a load and no load exists yet (see the file header).
  /**
   * §4, §9 — eighty: the node's own active figure, and the instrument singing.
   * Metadata and never a live threshold — the Order cannot be under it while it
   * works, because the number is emitted by the party's own tool on the party's
   * behalf and there is no throttle on it.
   */
  sigBudget: 80,
  // No arrayTag and no silence order (§4): the loudest thing on this rim is the
  // raid's own instrument, and there is nothing to withdraw and no debt to
  // keep. Silent Running is present, unlocked, and wrong in a new way — under a
  // node it buys nothing, because what makes the node sing is the grant being
  // load-bearing rather than the hull's engines, and it stops a cut outright.
  silenceCeilingSig: 100,
  debtCapS: 0,
  /** §3 — six hulls that move on their own orders; no held freight. */
  escortRadiusM: 0,

  /**
   * §6, §8 — the return line and the three faces. The map paints five bands;
   * these are the four rectangles a predicate, a lift or a marker addresses.
   *
   * No `pressureBonus` anywhere: the habitable water in this mission is rented
   * from an instrument and not manufactured by anybody, so the grant is the
   * Spire's aura and the water is left exactly as `mouth-rim` paints it.
   */
  regions: [
    {
      id: 'staging',
      x: 0,
      y: 0,
      widthM: 6000,
      heightM: 1000,
      note: "The Staging — Prospect's return line, and the line the count is taken at. Floor 1,500 m: terrain raises and never lowers, so a hull crossing in at 1,750 is lifted by the ground itself",
    },
    {
      id: 'face-four',
      x: 3250,
      y: 2250,
      widthM: 500,
      heightM: 500,
      note: "The fourth face, at 3500, 2600 — the concern's own chart. 269 m from node-one, and the whole rectangle inside the grant: the far corners are 559 m out against six hundred",
    },
    {
      id: 'face-five',
      x: 4000,
      y: 2000,
      widthM: 500,
      heightM: 500,
      note: 'The fifth face, at 4300, 2350 — 570 m from node-one, thirty metres inside the grant. Its corners are 250, 559, 750 and 901 m out, and the north-eastern one is 721 m from node-two as well: a cutter that works it is outside both grants and bleeding',
    },
    {
      id: 'face-six',
      x: 4750,
      y: 2500,
      widthM: 500,
      heightM: 500,
      note: 'The sixth face, at 5100, 2700 — 224 m from node-two, corners 180 to 532 m, and 707 m from the dome. The loudest place on the map to do quiet work',
    },
  ],

  /** §8 — two markers, both revealed at 00:00: the raid hides nothing from itself. */
  markers: [
    {
      id: 'the-faces',
      label: 'The faces. Three of the six, and the only crystal the Order can reach.',
      x: 4300,
      y: 2500,
      radiusM: 1200,
    },
    {
      id: 'the-line',
      label: 'The Staging line. The count is taken here and nowhere lower.',
      x: 3000,
      y: 500,
      radiusM: 1000,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Hadron,
      note: 'The raid — six hulls in Order colours, PR-2, no refit, armed, working under two nodes the Order paid for with the last of its lattice money (§2, §3). Thirty-seven souls. Two roles: the three cutters the loads ride and the three of the escort, of which the Voice is one',
      units: [
        {
          tag: 'the-voice',
          kind: UnitKind.Cruiser,
          x: 3000,
          y: 420,
          depthM: STAGING_DEPTH_M,
          role: 'escort',
          armed: true,
          souls: 12,
          note: "Kalliso's hull: the ears at HYD 65, the 900 m gun, and the only thing on the party that out-ranges a Chorister by more than a hundred metres. SIG 55 idle and 65 live in the cone, 19.25 and 22.75 on the flank, 5.5 and 6.5 in the wake — Classification to a dome-lifted ear at 2,734 m bow-on and 648 m astern through the terraces' 0.70",
        },
        corvette(
          'cutter-a',
          'cutter',
          2850,
          350,
          "Prospect's western reader's seat. Cuts the fourth face twice: `load-one` and `load-two`"
        ),
        corvette(
          'cutter-b',
          'cutter',
          3150,
          350,
          "Prospect's eastern reader's seat. Cuts the fifth face twice — the face whose far corners are outside both grants"
        ),
        corvette(
          'cutter-c',
          'cutter',
          3000,
          550,
          "Prospect's bunkerage seat. One cut, on the sixth face, 707 m from the dome"
        ),
        corvette(
          'escort-a',
          'escort',
          2700,
          450,
          'Three escort hulls at 143.3 damage a second take a wave of six — 1,200 HP — in 8.4 seconds, from water the wave cannot answer from (§4)'
        ),
        corvette('escort-b', 'escort', 3300, 450, ''),
      ],
      structures: [
        {
          tag: 'node-one',
          kind: StructureKind.SoundingSpire,
          x: 3750,
          y: 2500,
          depthM: NODE_DEPTH_M,
          note: 'The western node, raised at the turn and prebuilt at the terrace floor. PR+1 to allied hulls within 600 m, horizontal, same slot only; SIG 30 idle and 80 for exactly as long as a hull inside it is genuinely below its own rating. 1,792 m from the nearest cohort seat, which is Classification with eighty metres to spare, so it has been in the dome-lifted ears since before the party was ordered to dive',
        },
        {
          tag: 'node-two',
          kind: StructureKind.SoundingSpire,
          x: 4900,
          y: 2600,
          depthM: NODE_DEPTH_M,
          note: 'The eastern node, 1,154 m from the first — inside STANDING_WAVE.PAIR_RANGE_M and not a pair, because the rule fires when a node completes and asks for a finished node already standing, and these two were raised together (§4). 781 m from the nearest cohort seat, which is Track from the first tick',
        },
      ],
    },
    {
      slot: PLATEAUS,
      faction: Faction.Pelagia,
      note: 'The plateaus — the charting pair at the seats First Arrival left them on, weapons-cold, and the bed on the western lip from D onward (§5). Home water. Reading the rim for what could live on it, and already planted',
      units: [
        {
          tag: 'chart-a',
          kind: UnitKind.LightScout,
          x: 1200,
          y: 2050,
          depthM: PAIR_DEPTH_M,
          pressureRating: 3,
          note: "The Deepbloom programme's own hulls, PR-3 by refit exactly as Prospect authors them: a PR-1 navy has no roster hull that survives 2,100 m, and a refit is a mission fact and never a roster one",
        },
        {
          tag: 'chart-b',
          kind: UnitKind.LightScout,
          x: 1350,
          y: 2100,
          depthM: PAIR_DEPTH_M,
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
          note: "The bed, on the western lip since the concern's day (§5). 900 HP, SIG 20 idle and 8 inside its own symmetric cloud: a Voice holds an 8 through the lip's 1.60 at Bearing inside 1,491 m and at Classification inside 1,084, and the fourth face is 2,342 m off — so nothing the raid does on the eastern terraces resolves the garden at all. Whether the Commune's column is still under it is the Commune's ending and this mission does not carry it",
        },
      ],
    },
    {
      slot: DIRECTORATE,
      faction: Faction.Directorate,
      note: "Those below — the watch, the 9th Trench Cohort, the dome and the twelve Choristers, on one slot for the engine's reason (§2, §13). Attending, and correcting. The only guns on the rim that are not the player's",
      units: [
        // §11 — the twelve at First Arrival's seats, inherited to the metre:
        // x 5400-5900 in steps of a hundred, on y 3,200 and y 3,450. The first
        // six are the northern row and muster at 03:00; the second six are the
        // southern row and go straight off their seats at 07:00.
        chorister(
          1,
          5400,
          3200,
          'The northern row, western end. 1,792 m from node-one and 781 from node-two: both nodes are resolved from here at tick zero, and neither is inside a Chorister’s 450 m gun'
        ),
        chorister(2, 5500, 3200, ''),
        chorister(3, 5600, 3200, ''),
        chorister(4, 5700, 3200, ''),
        chorister(5, 5800, 3200, ''),
        chorister(6, 5900, 3200, ''),
        chorister(
          7,
          5400,
          3450,
          'The southern row, and the nearest Chorister to the dome at 403 m. The second wave leaves from this rank without mustering'
        ),
        chorister(8, 5500, 3450, ''),
        chorister(9, 5600, 3450, ''),
        chorister(10, 5700, 3450, ''),
        chorister(11, 5800, 3450, ''),
        chorister(12, 5900, 3450, ''),
        // §11 — the 9th's four at y 3,650, at the sill, and never moved.
        submersible(
          'ninth-one',
          5500,
          3650,
          "The 9th Trench Cohort, at the sill where First Arrival left them. The best mobile ears in the game, and 95 m of hull — `DRIFT.TRANSIT_MIN_HULL_M` to the metre, and nowhere near the basin's line"
        ),
        submersible('ninth-two', 5600, 3650, ''),
        submersible('ninth-three', 5700, 3650, ''),
        submersible('ninth-four', 5800, 3650, ''),
        // §11 — the rim's own two, at Prospect's coordinates exactly. They walk
        // Prospect's legs, because the tide before is where the last tide left
        // them.
        submersible(
          'watch-a',
          4600,
          3300,
          "Prospect's western station, to the metre, and the pair that have been on the lip since before anyone had ears here"
        ),
        submersible('watch-b', 4750, 3350, "Prospect's eastern station, to the metre"),
      ],
      structures: [
        {
          tag: 'dome',
          kind: StructureKind.Cantor,
          x: 5000,
          y: 3400,
          depthM: LIP_DEPTH_M,
          note: "The Cantorate's dome, where First Arrival stood it. +25 HYD to the 95 cap inside 1,200 m, which is node-one's whole water: 30 through the terraces' 0.70 is Classification inside 1,872 m to a lifted ear and Track inside 1,396. 1,200 HP, and two torpedoes at 700 would take it — which moves node-two's Classification radius only from 1,872 m to 1,615 and leaves it standing 781 m from a seat. Silencing the count means silencing every ear on the lip, and that is not a raid (§8)",
        },
      ],
    },
    {
      slot: ATTENDANTS,
      // A party must carry a faction value for the engine's spawn path; the
      // attendants' contacts report none, per the emitter contract — a Tier-3
      // return with position and depth, no kind and no faction, which is the
      // mechanical definition of a thing the file can only call equipment
      // fault (§5; types.ts, `MissionEmitter`). Safe on a second Directorate
      // slot because `combat.ts` refuses to auto-acquire a `StaticEmitter`.
      faction: Faction.Directorate,
      note: 'The attendants — two returns on the lip, periodic, structured, unclassifiable, and filed three times as equipment fault by somebody else. The Order enters them and calls them nothing, which is a courtesy and the only one available (§5)',
      units: [],
      emitters: [
        attendant(
          'attendant-a',
          'western',
          2800,
          3400,
          7,
          1,
          "One second in seven, Prospect's rhythm unchanged. A Voice at HYD 65 holds a 24 through the lip's 1.60 at Contact from 3,818 m and Classification from 2,153"
        ),
        attendant('attendant-b', 'eastern', 4100, 3500, 11, 2, 'Two seconds in eleven'),
      ],
    },
  ],

  /**
   * §3, §13 — the seven locks, of which one is authored and the six that are
   * not are the point. `activeSonar` has been in the Order's hands since
   * mission 3 and is priced rather than fenced: a ping is SIG 95
   * omnidirectional, Track to a dome-lifted ear from 4,808 m through the lip's
   * water and Commit-loud to a Sounder from 1,479 m. `weapons` and `torpedoes`
   * are live because this is the first Knight mission that expects to be shot
   * at. Silent Running cannot be locked at all.
   */
  locks: [
    {
      ability: 'construction',
      reason: 'two nodes stand, and the ledger has one Spire left in it; it is not for this tide',
    },
  ],

  /**
   * §8's nine rows, in §8's order — the keystone, the five loads, the two
   * counts of hulls, and the record. Every row is revealed at 00:00.
   *
   * Six terminal rows and one keystone: an unmet keystone is Lost whatever else
   * came home, all six met is Complete, and any partial set beneath a met
   * keystone is Partial. The two `survive` rows are deliberately not terminal —
   * the Order reads its people out at the close and refuses to rank them
   * against crystal, which is why a raid that brings two loads home and loses
   * two cutters is Partial and not something worse.
   */
  objectives: [
    {
      id: 'the-chord',
      text: 'Two cutters above the line with the rim aboard are the Second Chord. Below that there is no Chord and no reason for the week.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      keystone: true,
      markerId: 'the-line',
      // §8 — `extract ... loaded: true` counts **carriers, not loads**: a
      // cutter home with two cuts aboard reads as one. The row is worded in
      // cutters for that reason, and §6's assignment is authored so the
      // shortest honest route to the Chord is two hulls rather than one.
      //
      // It cannot latch at tick zero: the three cutters are seated in the
      // staging rectangle carrying nothing, and no `loaded` form is met until
      // a cut has run (§8).
      predicate: { kind: 'extract', role: 'cutter', region: 'staging', count: 2, loaded: true },
      reading: {
        met: 'Two cutters are above the line with the rim aboard. The Chord exists.',
        unmet:
          'Fewer than two cutters came off the rim loaded. The Chord does not exist, and the Order raised two nodes on attended ground to learn that.',
      },
    },
    loadHome(
      'load-one-home',
      'load-one',
      'The first cut of the fourth face is above the line.',
      'first',
      'fourth',
      'the-faces'
    ),
    loadHome(
      'load-two-home',
      'load-two',
      'The second cut of the fourth face is above the line.',
      'second',
      'fourth'
    ),
    loadHome(
      'load-three-home',
      'load-three',
      'The first cut of the fifth face is above the line.',
      'first',
      'fifth'
    ),
    loadHome(
      'load-four-home',
      'load-four',
      'The second cut of the fifth face is above the line.',
      'second',
      'fifth'
    ),
    {
      id: 'load-five-home',
      text: 'The cut of the sixth face is above the line.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      predicate: {
        kind: 'extract',
        role: 'cutter',
        region: 'staging',
        count: 1,
        loaded: 'load-five',
      },
      reading: {
        met: 'The cut of the sixth face is home.',
        unmet: 'The cut of the sixth face is on the rim, or in the rim.',
      },
    },
    {
      id: 'the-cutters',
      text: 'Three cutters. Three is the number of hulls the Order can put under two nodes.',
      initial: ObjectiveStatus.Pending,
      // §8 — standing, and re-derived every tick (`isStanding`), so a cutter
      // lost at 09:00 reads *entered* at 16:00 rather than *home*. That is the
      // whole reason it is `survive` and not `extract`.
      predicate: { kind: 'survive', role: 'cutter', count: 3 },
      reading: {
        met: 'The cutters are home.',
        unmet: 'A cutter is entered. Say the name to the house yourself.',
      },
    },
    {
      id: 'the-escort',
      text: 'Three of the escort. The Order counts hulls at the close and the number is the argument.',
      initial: ObjectiveStatus.Pending,
      predicate: { kind: 'survive', role: 'escort', count: 3 },
      reading: {
        met: 'The escort is home.',
        unmet: 'A hull of the escort is entered. Say the name to the house yourself.',
      },
    },
    {
      id: 'the-count',
      text: 'The rim is attended. The nodes were counted when they were raised, and the count is not yours.',
      initial: ObjectiveStatus.Pending,
      // §8, §13 — met by about 00:30 and that is the design. `ExposureReport.
      // tier` is the best tier anybody holds on *any* entity of the player's,
      // structures included, so two nodes idling at 30 inside a dome-lifted
      // Chorister's 1,872 m put this at Met before the descent finishes. The
      // row is therefore non-terminal and read as a record, with one
      // conditional line on the tally and no mechanism hung off it.
      predicate: {
        kind: 'tolerance',
        ticks: COUNT_TICKS,
        tier: ResolutionTier.Classification,
      },
      reading: {
        met: "The raid is in the Directorate's record at length. So are the nodes, and the nodes were there first.",
        unmet:
          'The raid was heard and classified by nobody for long, which on this rim means the lip has stopped listening, and the Order is the reason.',
      },
    },
  ],

  /**
   * §6 — five loads across three cutters: two of the three stand on their face
   * and take two loads off it. Four minutes of held presence at a SIG floor of
   * 65,
   * progress paused while the hull is elsewhere and resumed when it returns,
   * stopped outright by Silent Running — which is why §3 says the button has no
   * use under a node.
   *
   * See item 1 of the file header: `applyLifts` accrues both of a cutter's own
   * loads on the same pass, so the fourth and fifth faces are one hold each
   * rather than two — which is what §6 says in as many words ("the two are not
   * a sequence") since §13's row moved the prose to meet the runtime.
   */
  lifts: [
    load(
      'load-one',
      'cutter-a',
      'face-four',
      "The fourth face's first cut. The whole rectangle is inside node-one's six hundred, far corners at 559 m"
    ),
    load('load-two', 'cutter-a', 'face-four', "The fourth face's second cut"),
    load(
      'load-three',
      'cutter-b',
      'face-five',
      "The fifth face's first cut. Node-one is 570 m from the face and 901 m from its far corner: a cutter that works the north-east is outside both grants and taking 4 HP/s"
    ),
    load('load-four', 'cutter-b', 'face-five', "The fifth face's second cut"),
    load(
      'load-five',
      'cutter-c',
      'face-six',
      "The sixth face's one cut, 224 m from node-two and 707 m from the dome"
    ),
  ],

  /**
   * §9's beat table, in its order. Sixteen minutes, closing on a `resolve` that
   * is **not** a conclusion: a raid can fail, and this one fails in three
   * specific audible ways (§8).
   *
   * These transits are authored, not steered, for the standing reason: a
   * mission's beats happen at the time the document says they happen. The
   * cohort's tempo is why; the beats are when. Its clock is a schedule rather
   * than a condition on purpose — the nodes were at Track in the dome's ears
   * from tick zero, so any count the Directorate could have been given would
   * have resolved to a schedule anyway.
   */
  beats: [
    // 00:00 — Sull authorises. The first sentence of the briefing, said once in
    // the water, and the line the whole campaign has been keeping (§2, §12).
    {
      atTick: 0,
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull, from the Ninth',
      text: 'The plan is authorised. It has been on my desk since the year opened, I have declined it four times, and what changed is that the nineteen are entered and the window is shorter than the one I wrote to the houses.',
      note: 'Hailed and read — the say channel since #381. The line she had not crossed, crossed',
    },

    // 01:00 — the order to dive. One word, and it is Osk's: the Order has been
    // using the concern's chart of this rim for two tides and may as well use
    // the concern's verb. The document notes the theft because nobody in the
    // mission will (§12).
    {
      atTick: T(1),
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull, the order to dive',
      text: 'Descend.',
      note: "Osk's word, in the Order's mouth. 1,200 m at 45 m/s is 26.7 seconds at a SIG floor of 72 — Track to a dome-lifted ear from 3,014 m through open water — and each node goes to 80 the tick a hull is under it below its own rating",
    },

    // 03:00 — the cohort musters in step on the lip, 3,000 m. Six Choristers
    // cruising at 24 are Contact to the Voice from 3,818 m down the lip's 1.60
    // water: campaign.md §10's sixty seconds paid out as a full minute of a
    // cohort forming up before it walks (§8).
    ...FIRST_WAVE.map((hull) => hull.muster),

    // 03:00 — the charting pair walks east, First Arrival's own leg.
    {
      atTick: T(3),
      kind: 'move',
      tag: 'chart-a',
      x: 1800,
      y: 2150,
      note: "The plateaus chart eastward — First Arrival's leg, walked again on the tide after",
    },
    { atTick: T(3), kind: 'move', tag: 'chart-b', x: 1950, y: 2200, note: '' },

    // 04:00 — the watch's first leg, Prospect's.
    {
      atTick: T(4),
      kind: 'move',
      tag: 'watch-a',
      x: 3600,
      y: 3300,
      note: "The watch walks the lip, on Prospect's own legs",
    },
    { atTick: T(4), kind: 'move', tag: 'watch-b', x: 3750, y: 3350, note: '' },

    // 04:00 — the correction. Onto the terraces at 2,600 m, to a stop 180-335 m
    // from node-one, and from the tick they stop they fire on the nearest
    // hostile within 450 m. From those six points a cutter on the fourth face
    // is 400 m or more away and the node is nearer, so the doctrine holds: the
    // Directorate corrects the node (§6).
    ...FIRST_WAVE.map((hull) => hull.correction),

    // 04:30 — the correction, filed as a correction (§12).
    {
      atTick: T(4, 30),
      kind: 'say',
      speaker: 'Cohort-Prime Adze, 9th Trench Cohort',
      voice: 'cohorts',
      text: 'Correction is filed. Two nodes stood into the watch at the turn and were entered as they rose; one is singing on the fourth face and there are hulls under it. The node is corrected. What is under it is counted at what leaves.',
      note: 'Filed in the passive, and it never says who is being corrected. The whole Directorate liturgy is in "counted at what leaves"',
    },

    // 05:30 — the plateaus, who do not ask (§12).
    {
      atTick: T(5, 30),
      kind: 'say',
      speaker: 'The charting pair, for the plateaus',
      voice: 'plateaus',
      text: "We can hear you cutting. We're not going to ask you to stop — we don't ask. We've been on these terraces since before the concern had ears here, and there's a bed of ours on the western lip, and we'd only say that the rim is what it is because nobody had, yet, and you're the third navy this week to make that a past tense.",
      note: 'Refuses the imperative twice in one sentence and offers a distinction instead of a demand',
    },

    // 06:00 — the garden. The Order's whole policy toward the bed, in one
    // sentence, read to a party that may never have heard it (§7, §12).
    {
      atTick: T(6),
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull, on the chapter channel',
      text: 'There is a garden on the western lip. The Order notes a garden and does not enter one. Cut.',
      note: "Said whether or not the descent's western limb ever took the one Bearing of it: the Order's policy toward a garden does not depend on having heard it (§7)",
    },

    // 07:00 — the second correction, to node-two's water, north of it and
    // between the sixth face and the line — the water a loaded cutter climbs
    // out through (§6, §9).
    ...SECOND_WAVE,

    // 08:00 — those below (§12).
    {
      atTick: T(8),
      kind: 'say',
      speaker: 'Watch-Speaker, for those below',
      voice: 'cohorts',
      text: 'The rim is attended. Two nodes were entered when they were raised. What is done under them this tide is corrected, and the correction is entered against an account that is not the Order’s.',
      note: '',
    },

    // 09:00 — the watch's second leg, Prospect's.
    { atTick: T(9), kind: 'move', tag: 'watch-a', x: 2400, y: 3400, note: '' },
    { atTick: T(9), kind: 'move', tag: 'watch-b', x: 2550, y: 3450, note: '' },

    // 11:00 — the only line in the mission that wants something from another
    // faction, and what it wants is a question. Which is why she says it to
    // nobody (§12).
    {
      atTick: T(11),
      kind: 'say',
      speaker: 'Voice Ren Kalliso, once, to nobody',
      text: 'They did not come up to ask what it was for. They counted it. I had thought the Directorate would at least ask.',
      note: '',
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

    // 14:00 — the watch resumes Prospect's station.
    { atTick: T(14), kind: 'move', tag: 'watch-a', x: 4600, y: 3300, note: '' },
    { atTick: T(14), kind: 'move', tag: 'watch-b', x: 4750, y: 3350, note: '' },

    // 14:30 — the basin lifts off: Prospect's own literal, on Prospect's own
    // point, ninety seconds ahead of the close and on the tide the week's noise
    // doubled. The loud beat campaign.md §10's telegraph is measured from.
    //
    // **No `depthM` on the `driveTo`**, which is Prospect's literal to the
    // metre and the whole of §7's arithmetic: with none, the runtime holds the
    // species' own working depth, 2,000 m, and the creature climbs toward it at
    // `DRIFT.VERTICAL_SPEED_MPS`. Spawned at 3,050 m it covers the 1,200 m at
    // `speed` 30 in forty seconds, by which time it has risen 480 m and stands
    // over the terraces at about 2,570 m; it does not reach 2,000 m until about
    // eighty-eight seconds in, two or three seconds before the close. It
    // arrives at the depth it is actually at, which is not the depth it is
    // going to.
    {
      atTick: T(14, 30),
      kind: 'creature',
      tag: 'the-basin',
      species: FaunaSpecies.Sounder,
      spawnAt: { x: 3000, y: 3600, depthM: ATTENDANT_DEPTH_M },
      driveTo: { x: 3000, y: 2400 },
      untilTick: T(16),
      loud: true,
      note: "The week's ledger of noise, come due for the second time. Its line passes 750 m west of node-one and grinds nothing on the terraces: transit reach is a 37.5 m body plus the target's own radius, so it takes a Spire only inside 107.5 m and ignores an 80 m Corvette outright. The one hull on this party it would grind is the Voice, at 102.5 m, and 2,570 m is the depth a Voice is at in the first seconds of its climb off the bench",
    },

    // 14:45 — the last order of the tide (§12).
    {
      atTick: T(14, 45),
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull, at the riser',
      text: 'Basin. The count is taken at the Staging and nowhere lower. Up.',
      note: '1,100 m of climb at 15 m/s is 73.3 seconds of silence, during which a loaded cutter is a bearing to a dome and nothing else can be done about it',
    },

    // 16:00 — the count is taken. **Not** a conclusion: a raid can fail (§8),
    // so the ninety seconds since the basin are campaign.md §10's sixty, paid
    // half as much again.
    {
      atTick: T(16),
      kind: 'resolve',
      note: "Whatever is above the line is the Chord; whatever is below it is the rim's",
    },
  ],

  /**
   * §9's conditional beats, printed in the document rather than on the clock
   * because a condition has no tick. Three of them, and none can fire at tick
   * zero: the tolerance needs thirty cumulative seconds and both extracts need
   * a load that does not exist until a cut has run.
   *
   * No `choiceGroup`: these three are not a choice. The count and the two
   * Chord announcements are three separate facts about the same tide, and a
   * raid that brings two loads home hears both of the latter, in order.
   */
  conditionalBeats: [
    {
      kind: 'say',
      speaker: 'Watch-Speaker, for those below',
      voice: 'cohorts',
      text: 'Entered: hulls under a node, classified. The count began when the node was raised; it is not begun again.',
      note: 'In practice this fires at about 00:30, before the party is at working depth: two structures at SIG 30 standing in dome-lifted ears from the first tick spend thirty cumulative seconds at Classification or better before the descent finishes (§8)',
      when: { kind: 'tolerance', ticks: COUNT_TICKS, tier: ResolutionTier.Classification },
    },
    {
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull',
      text: 'One load is above the line. The Chord is not yet.',
      note: 'One cutter above the line loaded — the ladder’s first rung, and the sentence that says it is not the top of it',
      when: { kind: 'extract', role: 'cutter', region: 'staging', count: 1, loaded: true },
    },
    {
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull',
      text: 'Two. The Chord has its crystal. What follows is margin, and the Order has never had margin.',
      note: 'The keystone, announced the moment it is met and not at the close',
      when: { kind: 'extract', role: 'cutter', region: 'staging', count: 2, loaded: true },
    },
  ],

  /**
   * §8's Results, verbatim — Sull's three readings, with the nine objective
   * readings and then the two attendants' entered-and-gap lines printing
   * beneath whichever row the run earned, in that order (`runtime.ts` appends
   * `objectiveReadings()` and then `transcript()`).
   */
  epilogue: {
    [MissionOutcome.Complete]:
      'Five. The Chord has its crystal and the Order has, for the first time in my life, more than it needs of something. Two nodes stand on attended ground singing at eighty with nothing under them, and the Directorate will correct them at its leisure and be right to. Go and be dry; there is one tide left.',
    [MissionOutcome.Partial]:
      'Two at least. The Chord exists. What is left on the rim is the Order’s, entered against it by people who count better than we do, and I will not ask for it back.',
    [MissionOutcome.Lost]:
      'Fewer than two. The Order raised two nodes on the Mouth’s edge, was counted doing it, and comes home with a rating and no reason. The plan was authorised. Enter that it was mine.',
  },
};
