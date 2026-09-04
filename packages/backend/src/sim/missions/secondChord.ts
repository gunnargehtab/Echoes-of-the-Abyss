/**
 * The Second Chord 7 — The Second Chord. docs/mission-second-chord.md, transcribed.
 *
 * A data literal in `rimDeposits.ts`' and `firstArrival.ts`' idiom, on
 * `prospect.ts`' ground: the document owns the forces, the water, the beats,
 * the numbers and the text. Where this file and that document disagree, one of
 * them is wrong and the fix says which.
 *
 * The last of the fourteen, and the one whose §13 is mostly a list of things
 * the format cannot do. **Every acoustic figure in §4, §6 and §7 recomputes to
 * the metre against `detectionRatio` and every constant it cites is the shipped
 * one** — the Spire's 600 m and PR+1, the Cantor's 1,200 m and its 95 cap,
 * `STANDING_WAVE.PAIR_RANGE_M` 1,500, `ECHO_MARKS.DESTROYED_STRUCTURE_SIG` 18
 * over `PERSISTENCE.DESTROYED_STRUCTURE_S` 180, the 4 HP/s of a single band's
 * overreach, 45 m/s down and 15 m/s up, and `DEPTH.MAX_M` 3,000. Nothing moved.
 * What the literal found on the day is eight things, each stated here so a
 * reviewer can overrule them rather than discover them:
 *
 * 1. **The rim is authored weapons-cold, and the measurement is why** (§4, §5,
 *    §13's "a hull that answers hulls and leaves a structure alone"). The
 *    format has no target class and no rule of engagement: `combatSystem`
 *    auto-acquires the nearest live thing carrying `Position`, `Owner` and
 *    `Health` that is not on its own slot, and a structure carries all three.
 *    So the watch, inherited at Prospect's 4600, 3300 and 4750, 3350, stands
 *    250 m and 206 m from a node this document raised a tide after those
 *    coordinates were written, against a 650 m gun at 44.4 damage a second,
 *    and takes the Chord's 1,800 HP down in twenty seconds from tick zero —
 *    measured, hp −40 at 20.0 s of an untouched run. Disarming the watch alone
 *    does not save it: §9's first correction stands six Choristers 255 to
 *    412 m away at 03:36, inside their own 450 m, and finishes it by 03:56.
 *    **And the node is not optional** — every point of `chord-water` is inside
 *    its six hundred, and a PR-2 carrier is only rated for the 3,000 m the
 *    crystal is set at because the node says so. An armed rim therefore
 *    contradicts §1's "it was entered by the watch while it was still rising,
 *    and it was not corrected", the Watch-Speaker's own line at 08:00, and the
 *    keystone, inside the first minute of the tide all three are spoken in. So
 *    the six submersibles and the twelve Choristers carry no `armed`, which is
 *    `prospect.ts`' own posture of four navies cold in one water. The document
 *    carries the row and §4 now says it out loud.
 * 2. **`escort-b` is genuinely held today, and §13's row is stale.**
 *    That row says `releaseTick` "binds only a hull whose role is `'tender'`"
 *    and that the hold on `escort-b` is therefore documentation. It is not, any
 *    more: `holdsMovement` now resolves `tagOfHeld` *before* `tagOfTender` and
 *    refuses an order to any held hull whatever its role, which is exactly the
 *    fix the row asks for. What is still tender-only is the continuous half,
 *    `applyEscortHold`, and that half has nothing to do here — a hull the
 *    runtime has never let take an order has no order to clear. So the hold
 *    bites, the escort cannot be walked onto the lip before 15:30, and §13's
 *    row and its "until it lands" clause both want deleting.
 * 3. **The refit is the twelve's and not the six's.** `missions.test.ts` reads
 *    the authored rating or the hull's own, never `effectivePressureRating`,
 *    so a PR-2 Chorister seated at 3,000 m fails the suite — and an Abyssal
 *    Submersible is PR-3 on the roster and needs nothing. The twelve
 *    Choristers carry `pressureRating: 3` and so do the plateaus' two Light
 *    Scouts at 2,100 m; the watch's two and the 9th's four carry none. §13's
 *    row always said it this way and §5's summary line now does too.
 * 4. **§9's 00:00 row is a state and not a beat.** It reads "Sull, aboard, at
 *    the Staging (§12)", and §12 authors nine lines of which none is at 00:00 —
 *    the reference is to §12's framing sentence, which is the briefing. So the
 *    beat table opens at 01:00 and the tick-zero row is the seating: two loads
 *    rigged on the first pass, three nodes at 30, the cohort on its seats and
 *    the attendants sounding.
 * 5. **§8 authors three regions and two of them are addressed.** `staging` is
 *    named by no predicate, no lift and no marker, and it is kept because the
 *    document authors it and because the close speaks of it — "The Choirmaster
 *    is above the line, or under the Chord". It reaches nothing at runtime.
 * 6. **The Choirmaster's 3,413 m is measured to 4800, 3200, and §11 does not
 *    tabulate that point.** §6 gives three figures about her arrival — 3,413 m
 *    from the Staging, 350 m short of the sounding point, and 32° off the
 *    bearing she came in on — and exactly one round point inside `chord-water`
 *    satisfies all three: 4800, 3200, fifty metres south of the node.
 *    (3000, 300) to it is 3,413 m; it is 350 m due north of 4800, 3550; and
 *    58.2° of arrival against 90.0° of aim is 31.8°, inside the cone's
 *    forty-five with thirteen degrees to spare. That point is the player's to
 *    reach and not a beat, so it appears here only in the notes — but it is
 *    where §6's "the only margin in the mission nobody had to author" is.
 * 7. **§2's 112 m belongs to the first correction and not the second.** §2
 *    argues the one-Directorate-party finding by naming what twelve Choristers
 *    on a slot of their own would shoot: "the watch, which their corrections
 *    stop 304 m from — and on the dome, which the second one stops 112 m
 *    from". Both figures are authored below and both are on `cohort-3`, which
 *    is in the *first* wave. They cannot be anywhere else: §11 bounds every
 *    stop to 5000–5200 × 3050–3350, and every point of that box within 112 m
 *    of a dome at 5000, 3400 lies at y ≥ 3288 — the southern end, which is the
 *    water §9 sends the first correction to. §9 sends the second to the
 *    Chord's *northern* water, whose nearest stop to the dome is 250 m. The
 *    beat table and the bounding boxes win, because they are what this file
 *    transcribes; §2's "the second one" is the loose word.
 * 8. **§13's ordinal for the Chorister refit is stale, and this file does not
 *    restate it as its own.** §13 calls this "sixth mission to field the hull,
 *    sixth document to say so"; `rimDeposits.ts` reads its own §13 as "the
 *    sixth mission to field the hull and the fifth to author the refit", and
 *    that document's row says *fifth*. Counted off the shipped literals
 *    instead: eight of them seat a `UnitKind.Chorister` and seven of those
 *    author `pressureRating: 3` on it, this one included. The refit itself is
 *    not in doubt — `missions.test.ts` reads the authored rating and a PR-2
 *    Chorister at 3,000 m fails it — so the `chorister` helper attributes the
 *    ordinal to §13 rather than asserting one of its own. Four documents carry
 *    this row and no two of them count the same way.
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **The Collapse is on the world's clock, because there is no player-fired
 *   effect to hang it on** (§13, the headline row). Resonance Collapse is not
 *   built and `MissionCommanderAbility` cannot carry it — its effects are a
 *   speed multiplier and a Silent Running immunity. So the imitation §13 asks
 *   for is what ships: two `lose` beats at 16:00 spend the lattice and leave
 *   two marks at SIG 18 for three minutes, and twenty-four `move` beats walk
 *   every Chorister 480 m east at 16:00 and back at 16:15. Twelve seconds out,
 *   twelve back, and from 680 to 886 m every one of them is outside the 450 m
 *   the correction is stated at — which, the rim being weapons-cold (finding
 *   1), is twelve seconds of nobody attending anything rather than twelve
 *   seconds of nobody shooting. It is an imitation of a stun and the document
 *   calls it one.
 * - **The tone is one fifth of the ability it stands in for, and it is
 *   directional** (§3, §13). A `MissionSounding` on the Choirmaster's hull —
 *   400 m, thirty seconds held, SIG floor 100 — and nothing else:
 *   docs/characters.md's node also grants global Tier-2 vision and +20 %
 *   damage, and neither is approximated, faked or hinted at here. 100 down the
 *   lip's 1.60 is Contact at 11,809 m to a dome-lifted ear and 7,907 m to a
 *   Corvette; 35 on the flank is 6,127 and 4,102. The rim hears the flank and
 *   the trenches hear the cone.
 * - **One Directorate party, for the engine's reason** (§2, §13, and
 *   `rimDeposits.ts`' own finding). Hostility is `Owner.slot`, so the watch,
 *   the 9th, the dome and the twelve Choristers are one party or the mission
 *   opens with a civil war 250 m from the Chord. The attendants and the lip
 *   are two *further* Directorate-faction parties and are safe there, because
 *   `combat.ts` refuses to auto-acquire a `StaticEmitter`.
 * - **`runsItsLength`, and this is the one place the court's rule would have
 *   been wrong** (§9). All four terminal rows can be met by about 03:00 — the
 *   keystone the moment both carriers stand loaded in the Chord's water, and
 *   the three `survive` rows from the first pass, six hulls being six. Omitted,
 *   the runtime would close the campaign's ending fifteen minutes before its
 *   own ending, with the crystal set and nothing said.
 *
 * And three facts the document states that this file deliberately does not
 * encode, because nothing in `packages/backend/src` reads them:
 *
 * - **A sounding has no depth and a region has no depth** (§6, §8, §13).
 *   `soundingHolds` is a hypot on x and y plus a cone test, and `inRegion` is a
 *   plan-view rectangle, so the literal can require neither that the tone be
 *   played from 3,000 m under the instrument nor that the crystal be set at the
 *   node rather than 1,600 m above it. §6 asks for the dive in register and §8
 *   prices it; `depthMaxM?` on both types is the shape, and this mission is the
 *   bible's loudest customer for it.
 * - **Nothing asks whether the Chord still stands** (§8, §13, third customer).
 *   There is no predicate over what the player holds standing, so a node
 *   corrected at 00:20 — see finding 1 — with the crystal set into it later
 *   still reads Met, and the ladder never notices. What the water does instead
 *   is charge for it: after 16:00 the Chord's six hundred metres are the only
 *   rated water on the map, and a party that let the node fall plays the tone
 *   bleeding.
 * - **The three nodes are three grants and not a corridor** (§4).
 *   `node-one` to `node-two` is 1,154 m, `node-two` to `the-chord` 559 m and
 *   `node-one` to `the-chord` 1,235 m — all three inside
 *   `STANDING_WAVE.PAIR_RANGE_M` — and none of them is a pair: the rule fires
 *   when a node *completes*, all three are prebuilt, and the pass that would
 *   decide it is unbuilt in any case. So there is no `STANDING_WAVE.CORRIDOR_PF`
 *   anywhere on this water, and the Order's instrument never turns its weapon
 *   inward.
 */

import {
  CHORD_SECOND_CHORD_HEADER,
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
/** §2 — reserved and empty, exactly as the other four rim missions reserve it. */
const COURT = 1;
/** §5 — the plateaus: the charting pair where First Arrival left them, and the bed. */
const PLATEAUS = 2;
/** §2, §5, §13 — the watch, the 9th, the dome and the twelve, on one slot. */
const DIRECTORATE = 3;
/** §5 — the rim's attendants: a party whose only assets in the water are sounds. */
const ATTENDANTS = 4;
/** §2, §5 — the lip: a second soundless party, holding one return and one time. */
const LIP = 5;

/** §11 — the Order's seats over the Staging's 1,500 floor. Mid-Water, PR-2, no refit. */
const STAGING_DEPTH_M = 1400;
/** §11 — the terrace nodes, on the terrace floor. A structure carries no `crushable`. */
const NODE_DEPTH_M = 2600;
/** §11 — the charting pair's seat over the terraces, Prospect's own and First Arrival's. */
const PAIR_DEPTH_M = 2100;
/**
 * §11 — the lip, and the deepest order `match.ts` accepts. The lip's floor is
 * 3,100, so **no hull on this map is ordered below 3,000 m because none can
 * be**, and the Chord itself is raised at the last orderable metre.
 */
const LIP_DEPTH_M = DEPTH.MAX_M;
/**
 * §11 — the attendants, the lip's return and the basin's spawn: an emitter or a
 * creature may sit at 3,050 over a floor of 3,100 where a hull may not.
 */
const ATTENDANT_DEPTH_M = 3050;

/** §7, §11 — the attendants' own durability, Prospect's figure unchanged. */
const RETURN_HP = 5000;

/** §8, §9 — thirty cumulative seconds at Classification or better. */
const COUNT_TICKS = 30 * SIM.TICK_HZ;

/**
 * §3, §4 — thirty seconds at the hundredth, held, bow to the Mouth.
 *
 * A hundred is the scale's ceiling and the loudest sustained thing the bible
 * has ever authored, and thirty seconds is thirty seconds: `accrueSounding`
 * resets a broken hold to zero, so a tone you interrupt is a tone you have not
 * played. Silent Running stops it outright (`holdingSounding`), which is why §3
 * says a player who reaches for the button in the last minute starts again.
 */
const TONE_TICKS = 30 * SIM.TICK_HZ;
const TONE_SIG = 100;

/** §6, §9 — the Choirmaster and her one hull for ears come down at half past fifteen. */
const RELEASE_TICK = T(15, 30);
/** §4, §6, §9 — the lattice, spent on the world's clock and not the player's. */
const COLLAPSE_TICK = T(16);
/** §9, §13 — twelve seconds east at a Chorister's 40 m/s, and twelve back. */
const WALK_M = 480;

/** §1, §8 — the node the tide is for: 559 m from node-two, 320 from the dome. */
const CHORD = { x: 4800, y: 3150 };

/**
 * One of the Order's four Corvette hulls — Knight-rigged, PR-2, no refit, armed.
 *
 * Armed, and on this rim that means the Order carries every gun in the water
 * (finding 1). Nothing answers them, and §10 never claimed combat as a thing
 * this mission teaches: the danger here is the crush clock, the interval, and a
 * lattice spent at sixteen.
 *
 * SIG 28 in the cone, 9.8 on the flank, 2.8 in the wake; HYD 50; five souls
 * each. The roster still has no Knight hull in it (§3): the party flies Order
 * colours on generic hulls and the directional figures are Aptitude's. Two
 * torpedoes apiece at 700 damage, which is the arithmetic §3 states rather than
 * pretends nobody did — the dome is 1,200 HP and dies to two of them.
 *
 * `cadre` is the hull's name in Nineteen's roster (`nineteen.ts`, `hull`), and
 * only the escort pair carries one: `escort-a` and `escort-b` are the raid's
 * escort under the raid's own tags (`rimDeposits.ts`), so they are the Fourth
 * and the Fifth there and here. The two carriers carry none. §3 gives them a
 * load each and no name, and a hull the document does not identify with one of
 * the six is not a hull the record can have spent — so they are seated
 * whatever the Rest kept, the way the Choirmaster's own hull is.
 */
const corvette = (
  tag: string,
  role: string,
  cadre: string | undefined,
  x: number,
  y: number,
  note: string,
  releaseTick?: number
): MissionUnit => ({
  tag,
  kind: UnitKind.Corvette,
  x,
  y,
  depthM: STAGING_DEPTH_M,
  role,
  ...(cadre === undefined ? {} : { cadre }),
  armed: true,
  ...(releaseTick === undefined ? {} : { releaseTick }),
  souls: 5,
  note,
});

/**
 * One of the twelve — a Chorister on the eastern lip, at First Arrival's seat.
 *
 * `pressureRating: 3` is the mission's fact and never the roster's: `units.ts`
 * rates the hull PR-2, the Directorate's baseline lifts it for nothing at
 * runtime, and `missions.test.ts` reads the *authored* rating — so a PR-2
 * Chorister seated at 3,000 m fails the suite. §13 records this as the sixth
 * mission to field the hull and the sixth document to say so; the count is the
 * document's rather than this file's, because eight shipped literals field the
 * hull and seven of them author the refit (finding 8 in the file header).
 *
 * **Weapons-cold, and that is finding 1 rather than a softening** (§4, §5,
 * §13). A Chorister reaches 450 m and §9 stands six of them 255 to 412 m from
 * the node; armed, `combat.ts` would auto-acquire the mission's own keystone
 * and correct it before four minutes. The format has no hull that answers
 * hulls and spares structures, so the rim is authored the way §1 describes it
 * — entered, written down, and not corrected. What the correction applies is
 * acoustic and geometric: six hulls at 24 standing between the Order and its
 * own instrument, inside the dome's 1,200 m, entered and filed.
 */
const chorister = (ordinal: number, x: number, y: number, note: string): MissionUnit => ({
  tag: `cohort-${ordinal}`,
  kind: UnitKind.Chorister,
  x,
  y,
  depthM: LIP_DEPTH_M,
  pressureRating: 3,
  note,
});

/**
 * One of the six Abyssal Submersibles — the watch's two and the 9th's four.
 *
 * PR-3 on the roster and needing no refit, which is why this helper authors
 * none: §13 names the twelve Choristers and the plateaus' two scouts, and
 * stating a refit here as well would make two different rules look like one
 * (see finding 3 in the file header).
 *
 * Weapons-cold, with the twelve, for finding 1's reason: the watch's station is
 * 206 m from the Chord and its gun reaches 650, and a rim that is attended
 * rather than policed cannot be written any other way.
 */
const submersible = (tag: string, x: number, y: number, note: string): MissionUnit => ({
  tag,
  kind: UnitKind.AbyssalSubmersible,
  x,
  y,
  depthM: LIP_DEPTH_M,
  note,
});

/**
 * One of the two returns on the lip — Prospect's §5 and First Arrival's §11,
 * unchanged in place, loudness and rhythm, on the third tide of the week.
 *
 * The readings are the pair the close enters for it, in the Order's own form
 * rather than the concern's: the Order does not keep a gap (§8). Seven housings
 * would need seven periods because `acoustics.ts` carries no per-emitter phase;
 * two need two, and these are the two Prospect authored.
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
  // Order are exactly as loud as each other and neither remarks on it.
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
 * One of the twelve, with its whole tide in one row — §9's and §11's tables
 * read across rather than down.
 *
 * The seat is First Arrival's, inherited to the metre. The muster and the stop
 * are this document's, authored inside §11's two bounding boxes and against
 * §9's four leg ranges, and the walk is the stop plus §9's 480 m east.
 */
interface CohortHull {
  ordinal: number;
  seat: { x: number; y: number };
  muster: { x: number; y: number };
  stop: { x: number; y: number };
  note: string;
}

/**
 * §9, §11 — the first correction: `cohort-1`…`cohort-6`, the northern row.
 *
 * Mustering at 02:30 over legs of 180 to 559 m at 40 m/s, so the rank is
 * standing between 02:35 and 02:44 — §9's minute of a cohort forming up before
 * it walks, which is Contact to the Voice from 3,818 m and campaign.md §10's
 * sixty seconds paid out as sound. Correcting at 03:30 over legs of 224 to
 * 430 m, standing between 03:36 and 03:41, and stopping 255 to 412 m from the
 * node — well inside a Chorister's 450 m, which is the distance the correction
 * is *stated* at and, weapons-cold, the distance it is only heard at (§4).
 */
const WAVE_ONE: readonly CohortHull[] = [
  {
    ordinal: 1,
    seat: { x: 5400, y: 3200 },
    muster: { x: 5300, y: 3350 },
    stop: { x: 5100, y: 3200 },
    note: 'The western end of the northern row, and the shortest muster of the wave at 180 m — `cohort-7` walks the shortest of the twelve. 304 m from the node when it stands',
  },
  {
    ordinal: 2,
    seat: { x: 5500, y: 3200 },
    muster: { x: 5300, y: 3450 },
    stop: { x: 5200, y: 3250 },
    note: 'The shortest correction at 224 m, and the furthest stop from the node at 412 — so the first hull standing is also the one the Collapse walks furthest out, to 5680, 3250 (§11)',
  },
  {
    ordinal: 3,
    seat: { x: 5600, y: 3200 },
    muster: { x: 5300, y: 3400 },
    stop: { x: 5050, y: 3300 },
    note: '291 m from the node, on the water between it and the dome',
  },
  {
    ordinal: 4,
    seat: { x: 5700, y: 3200 },
    muster: { x: 5400, y: 3350 },
    stop: { x: 5150, y: 3250 },
    note: '364 m from the node',
  },
  {
    ordinal: 5,
    seat: { x: 5800, y: 3200 },
    muster: { x: 5400, y: 3400 },
    stop: { x: 5100, y: 3350 },
    note: '361 m from the node, and the southernmost stop of the twelve',
  },
  {
    ordinal: 6,
    seat: { x: 5900, y: 3200 },
    muster: { x: 5400, y: 3450 },
    stop: { x: 5050, y: 3200 },
    note: 'The longest muster at 559 m and the longest correction at 430 m — the last hull standing, at 03:41, and the nearest to the node at 255 m',
  },
];

/**
 * §9, §11 — the second correction: `cohort-7`…`cohort-12`, the southern row.
 *
 * Mustering at 08:30 over legs of 141 to 539 m, standing by 08:44; correcting
 * at 09:30 over legs of 538 to 640 m to the Chord's *northern* water, standing
 * between 09:43 and 09:46 and stopping 200 to 403 m from the node. The wave
 * that arrives on the water a carrier climbs out through.
 */
const WAVE_TWO: readonly CohortHull[] = [
  {
    ordinal: 7,
    seat: { x: 5400, y: 3450 },
    muster: { x: 5300, y: 3550 },
    stop: { x: 5050, y: 3050 },
    note: 'The shortest muster of the twelve at 141 m. 269 m from the node',
  },
  {
    ordinal: 8,
    seat: { x: 5500, y: 3450 },
    muster: { x: 5300, y: 3600 },
    stop: { x: 5100, y: 3100 },
    note: '539 m of correction, and 304 m from the node when it stands',
  },
  {
    ordinal: 9,
    seat: { x: 5600, y: 3450 },
    muster: { x: 5400, y: 3550 },
    stop: { x: 5000, y: 3050 },
    note: 'The longest correction of the wave at 640 m — the last hull standing, at 09:46. 224 m from the node',
  },
  {
    ordinal: 10,
    seat: { x: 5700, y: 3450 },
    muster: { x: 5400, y: 3510 },
    stop: { x: 5000, y: 3150 },
    note: 'Due east of the node at 200 m, the nearest stop of the twelve, and the shortest correction of the wave at 538 m — the first hull standing, at 09:43',
  },
  {
    ordinal: 11,
    seat: { x: 5800, y: 3450 },
    muster: { x: 5400, y: 3700 },
    stop: { x: 5200, y: 3100 },
    note: 'The furthest stop of the wave at 403 m, and still 47 m inside the 450 the correction is stated at',
  },
  {
    ordinal: 12,
    seat: { x: 5900, y: 3450 },
    muster: { x: 5400, y: 3650 },
    stop: { x: 5150, y: 3150 },
    note: 'The longest muster of the wave at 539 m. 350 m from the node, due east of it',
  },
];

const COHORT: readonly CohortHull[] = [...WAVE_ONE, ...WAVE_TWO];

/** One hull's muster — in step, on the lip, at the depth it is already at. */
const musterBeat = (hull: CohortHull, atTick: number, note: string): MissionBeat => ({
  atTick,
  kind: 'move',
  tag: `cohort-${hull.ordinal}`,
  x: hull.muster.x,
  y: hull.muster.y,
  depthM: LIP_DEPTH_M,
  note,
});

/**
 * One hull's correction — onto the Chord's water at 3,000 m.
 *
 * Weapons-cold, so what stands there is a correction filed rather than a
 * correction fired (finding 1, and §9's own row). What the rank does to the
 * mission is acoustic and positional: six hulls at 24 in the Chord's own
 * water, inside the dome's 1,200 m, standing between the node and everything
 * the Order does above it. Nothing here fires a gun, and nothing on this party
 * can.
 */
const correctionBeat = (hull: CohortHull, atTick: number): MissionBeat => ({
  atTick,
  kind: 'move',
  tag: `cohort-${hull.ordinal}`,
  x: hull.stop.x,
  y: hull.stop.y,
  depthM: LIP_DEPTH_M,
  note: hull.note,
});

/**
 * The Collapse's twelve seconds, out and back — the imitation of a stun that
 * §13 asks for and calls one.
 *
 * No `depthM`: the depth order from the correction stands, and the walk is
 * twelve seconds of ground and nothing else. Out at 16:00 to 480 m east, back
 * at 16:15 to the stop it left — and from every one of the twelve walked
 * positions the node is between 680 and 886 m away, which is outside a
 * Chorister's 450 m by a clear margin — the reach the doctrine is stated at,
 * kept honest in the geometry even though no gun on that party is live.
 * Nothing on the rim is attending anything for twelve seconds, and nothing in
 * the water knows why.
 */
const walkBeat = (hull: CohortHull, atTick: number, dx: number, note: string): MissionBeat => ({
  atTick,
  kind: 'move',
  tag: `cohort-${hull.ordinal}`,
  x: hull.stop.x + dx,
  y: hull.stop.y,
  note,
});

export const CHORD_SECOND_CHORD: MissionDefinition = {
  ...CHORD_SECOND_CHORD_HEADER,
  doc: 'docs/mission-second-chord.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Hadron,
  courtSlot: COURT,
  /** §11 — fauna are off; the one creature is the basin, and it is a beat. */
  fauna: false,
  /**
   * §9, §13 — and this is the one place the court's rule would have been
   * wrong. All four terminal rows can be met by about 03:00: the keystone the
   * pass both carriers stand loaded in the Chord's water, and the three
   * `survive` rows from the first pass, six hulls being six. Omitted, the
   * runtime closes on that pass and the campaign's ending ends fifteen minutes
   * before its own ending, with the crystal set and nothing said.
   */
  runsItsLength: true,
  /**
   * §4, §9 — a hundred: the transmission's own figure, and the first budget in
   * the bible at the scale's ceiling. Metadata and never a live threshold,
   * which is the only reason 100 can be the number the mission *is* without
   * becoming a rule a player is failed against. There is nothing above it.
   */
  sigBudget: 100,
  // No arrayTag and no silence order (§3, §4). There is no aura to lend and
  // nothing to withdraw, and the loudest thing on this rim is the Order's own
  // instrument. Silent Running is present, unlocked, and worth something
  // exactly once: on the climb out it is redundant, under a node it buys
  // nothing — what sings is the grant being load-bearing, not the engines —
  // and it stops a sounding outright, so a player who reaches for it in the
  // last minute loses the thirty seconds and starts again from zero.
  silenceCeilingSig: 100,
  debtCapS: 0,
  /**
   * §3 — "a tender with no escort inside 600 m does not move".
   *
   * The one rule in this mission that can strand it. `the-choirmaster` is the
   * `tender` and both her escort hulls open 335 m away, so the hold is
   * satisfied at the seating and stays satisfied while somebody stays with
   * her; a player who walks every escort onto the lip and leaves her at the
   * Staging has an instrument, a node, and nobody to play it, which §4
   * playtests and §13 calls a legitimate and audible way to reach the unstruck
   * record.
   */
  escortRadiusM: 600,

  /**
   * §8's three rectangles. The map paints five bands; these are the places a
   * predicate, a lift or a reading addresses — and `staging` is the third,
   * addressed by nothing (finding 5 in the file header).
   *
   * No `pressureBonus` anywhere: every metre of habitable water below 1,800 m
   * in this mission is rented from an instrument the Order paid for, so the
   * grant is the Spire's aura and the ground is left exactly as `mouth-rim`
   * paints it.
   */
  regions: [
    {
      id: 'staging',
      x: 0,
      y: 0,
      widthM: 6000,
      heightM: 1000,
      note: "The Staging — Prospect's return line, and the line the readings mean by *above the line*. Floor 1,500 m. Named by no predicate: the count this tide takes is of hulls and of crystal set, and neither is a place",
    },
    {
      id: 'the-cache',
      x: 2750,
      y: 250,
      widthM: 500,
      heightM: 500,
      note: "The rim's crystal, above the line, waiting — yesterday's outcome made into cargo rather than into a briefing sentence. Both carriers are seated inside it, so both loads rig on the first pass (§3)",
    },
    {
      id: 'chord-water',
      x: 4500,
      y: 2900,
      widthM: 500,
      heightM: 500,
      note: "The node's own water: every point of it within 391 m of the Chord and therefore inside the grant. It straddles two floors on purpose — its northern hundred metres lie over the Terraces' 2,600 and its southern four hundred over the Lip's 3,100 — so the strip that will hold a hull at 3,000 m is everything south of y 3000, and a hull that means to be under the instrument and to hear the lip's return at Bearing stands in the southern half rather than the middle (§8)",
    },
  ],

  /**
   * §3 — two loads, both `cutTicks: 0`: Tend's gift-run form, for a cut that
   * happened yesterday. `applyLifts` rigs a zero-tick load the first pass its
   * carrier stands in the region and never touches the meter, and `cutSig` is 0
   * because nothing is being cut — the crystal is aboard, and freight is not a
   * work site. They cannot be unrigged, and a carrier that dies takes its load
   * down with it.
   */
  lifts: [
    {
      id: 'load-one',
      tag: 'carrier-a',
      region: 'the-cache',
      cutTicks: 0,
      cutSig: 0,
      note: "The first load of rim crystal, rigged on the first pass. The raid's, carried down through a lattice that will be spent at sixteen",
    },
    {
      id: 'load-two',
      tag: 'carrier-b',
      region: 'the-cache',
      cutTicks: 0,
      cutSig: 0,
      note: 'The second load. Without both of them a tone over the node is a tone',
    },
  ],

  /**
   * §3 — one sounding, and the campaign's first verb is its last.
   *
   * 400 m of radius, 1,800 sim ticks of hold and a SIG floor of 100, tagged to
   * `the-choirmaster` and to nothing else: a ping from any hull is a ping and
   * not the Chord, and the sounding is the only thing that feeds `sound`. The
   * figure is Sull's own commander ability quoted at the one number the format
   * can carry — SIG 100 for the full duration — and the four fifths that are
   * not carried are §13's row rather than this file's approximation.
   *
   * **Horizontal, and that is the gap.** `soundingHolds` tests a hypot and a
   * cone and has no depth term, so this cannot ask her to be at 3,000 m under
   * the instrument. §6 asks it in register and prices the dive instead; the
   * water does the rest, because after 16:00 the six hundred metres around the
   * Chord are the only place on the map a Knight hull is not paying 4 HP/s.
   */
  soundings: [
    {
      id: 'the-second-chord',
      tag: 'the-choirmaster',
      x: 4800,
      y: 3550,
      radiusM: 400,
      holdTicks: TONE_TICKS,
      sig: TONE_SIG,
      note: 'Four hundred and fifty metres north of the map’s southern edge, three hundred and fifty south of the node, and aimed at water the chart declines to author. A hull that has come 3.4 km south from the Staging and stopped over the Chord is already inside the cone at 32° — the Order does not have to turn to face the Mouth, it arrives facing it (§6)',
    },
  ],

  /** §8 — two markers, both public from the tick the row that names them is. */
  markers: [
    {
      id: 'the-chord',
      label: 'The Chord. Two loads go into it and nowhere else.',
      x: 4800,
      y: 3150,
      radiusM: 500,
    },
    {
      id: 'the-mouth',
      label: 'The interval. Thirty seconds at the hundredth, bow to the south, held.',
      x: 4800,
      y: 3550,
      radiusM: 400,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Hadron,
      note: "The Order's last works party — six hulls in Order colours, PR-2, no refit, and three Sounding Spires the Order paid for with everything it had. Forty-one souls. Three roles: the tender the tone is tagged to, the three of the escort, and the two carriers the crystal rides",
      units: [
        {
          tag: 'the-choirmaster',
          kind: UnitKind.Cruiser,
          x: 3000,
          y: 300,
          depthM: STAGING_DEPTH_M,
          // §3 — `tender` is the hold's word, and the document says *the
          // Choirmaster's hull* throughout. She is the only hull the sounding
          // is tagged to and the only one that can play it, which is why §8's
          // third failure is the one that also takes the tone with it.
          role: 'tender',
          // §3 — unarmed, and the only hull on the party that is. She carries
          // the sounding and nothing else.
          releaseTick: RELEASE_TICK,
          souls: 9,
          note: "Choirmaster Ivane Sull's own hull, held at the Staging until 15:30 by the mission (§2). SIG 55 idle and 65 live in the cone, 19.25 and 22.75 on the flank, 5.5 and 6.5 astern; HYD 65; PR-2. From here the sounding point is 3,715 m and the Chord's water 3,413 — 75.8 s at 45 m/s, so she is at the Chord at 16:46 and under it at 17:14, and the interval at seventeen is the distance divided by forty-five (§11)",
        },
        {
          tag: 'the-voice',
          kind: UnitKind.Cruiser,
          x: 2850,
          y: 450,
          depthM: STAGING_DEPTH_M,
          role: 'escort',
          cadre: 'voice',
          armed: true,
          souls: 12,
          note: "Voice Ren Kalliso's hull: the ears at HYD 65, the 900 m gun at 60 damage a second, and — the rim being weapons-cold (finding 1) — one of only five guns in this water, all five of them the Order's and none of them aimed at anything. Nothing on this rim answers them, which is the shape §1 describes: the rank corrects by standing there and filing it",
        },
        corvette(
          'carrier-a',
          'carrier',
          undefined,
          2900,
          600,
          "The first carrier, seated inside `the-cache`: `load-one` rigs on the first pass. 2,802 m from the nearest corner of the Chord's water — `carrier-b` is §13's round 2,700 at 2,693 — which is why the keystone cannot latch at tick zero (§13)"
        ),
        corvette(
          'carrier-b',
          'carrier',
          undefined,
          3100,
          600,
          'The second carrier, carrying `load-two`'
        ),
        corvette(
          'escort-a',
          'escort',
          'fourth',
          2700,
          450,
          '335 m from the Choirmaster, and free from the first tick. The hull that holds the lip'
        ),
        corvette(
          'escort-b',
          'escort',
          'fifth',
          3300,
          450,
          '335 m from the Choirmaster on the other side, and held to 15:30 beside her — a tender with no escort inside 600 m does not move, so this is the hull that brings her down. Held by tag rather than by role, which the runtime now honours (finding 2 in the file header)',
          RELEASE_TICK
        ),
      ],
      structures: [
        {
          tag: 'node-one',
          kind: StructureKind.SoundingSpire,
          x: 3750,
          y: 2500,
          depthM: NODE_DEPTH_M,
          note: "The western terrace node, the raid's, unchanged and prebuilt at the terrace floor. PR+1 to allied hulls within 600 m, horizontal, same slot only; SIG 30 idle and 80 for exactly as long as a hull inside it is genuinely below its own rating. Lost at 16:00, and it leaves a mark at 18 for three minutes",
        },
        {
          tag: 'node-two',
          kind: StructureKind.SoundingSpire,
          x: 4900,
          y: 2600,
          depthM: NODE_DEPTH_M,
          note: "The eastern terrace node, 1,154 m from the first and 559 from the Chord, so a hull passing from the raid's water to the Chord's is never uncovered. 806 m from the dome, which is why its mark at 16:00 is Contact to a dome-lifted ear with sixteen hundred metres to spare. Lost at 16:00",
        },
        {
          tag: 'the-chord',
          kind: StructureKind.SoundingSpire,
          x: CHORD.x,
          y: CHORD.y,
          depthM: LIP_DEPTH_M,
          note: 'The last Spire the Order will ever raise, up in the tide between under node-two’s cover and paid for with the last 120 crystal on the Ninth’s ledger (§1). 320 m from the listening dome and 602 m from the nearest Chorister’s seat: the Order raising its instrument inside the Directorate’s hearing, and the Directorate writing it down. Prebuilt, because a player-raised structure sits at CONSTRUCTION.WORKING_DEPTH_M wherever the floor is (§10)',
        },
      ],
    },
    {
      slot: PLATEAUS,
      faction: Faction.Pelagia,
      note: 'The plateaus — the charting pair at the seats First Arrival left them on, weapons-cold, and the bed on the western lip from D onward (§5). Home water, and a garden. Two hulls that have asked nothing of anyone',
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
          note: "The bed, on the western lip since the concern's day. SIG 20 idle and 8 inside its own symmetric cloud: a Voice holds an 8 through the lip's 1.60 at Bearing only inside 1,491 m, and the Chord is 3,551 m off — so the bed is heard by nobody who stays east, and the Order's whole policy toward a garden is one sentence at 06:00 about a thing most players will never resolve (§7)",
        },
      ],
    },
    {
      slot: DIRECTORATE,
      faction: Faction.Directorate,
      note: "Those below — the watch, the 9th Trench Cohort, the dome and the twelve Choristers, on one slot for the engine's reason (§2, §13). Attending, and not policing (§4, §13), and weapons-cold to the last hull: the correction this rank files is a position and a sentence, because the format has no way to author a hull that answers hulls and leaves a node alone (finding 1)",
      units: [
        // §11 — the twelve at First Arrival's seats, inherited to the metre:
        // x 5400-5900 in steps of a hundred, on y 3,200 and y 3,450. The
        // northern row musters at 02:30 and corrects at 03:30; the southern row
        // musters at 08:30 and corrects at 09:30; all twelve are walked 480 m
        // east at 16:00 and back at 16:15.
        ...COHORT.map((hull) =>
          chorister(
            hull.ordinal,
            hull.seat.x,
            hull.seat.y,
            hull.ordinal === 1
              ? 'The northern row, western end, and the nearest Chorister seat to the Chord at 602 m — 152 m outside the reach the doctrine is stated at, so the twelve enter the node when it rises and correct nothing from where they sit (§1)'
              : hull.ordinal === 7
                ? 'The southern row, western end, and 403 m from the dome — the nearest seat of the twelve to it, against 922 m for the furthest: every hull of the twelve listens at the 95 cap from where it sits'
                : ''
          )
        ),
        // §11 — the 9th's four at y 3,650, at the sill, and never moved. 860 m
        // and more from the Chord, and cold in any case: the 9th attends this
        // tide and is the best set of ears on the map while it does.
        submersible(
          'ninth-one',
          5500,
          3650,
          "The 9th Trench Cohort, at the sill where First Arrival left them. The best mobile ears in the game, and 95 m of hull — `DRIFT.TRANSIT_MIN_HULL_M` to the metre, and 2,500 m off the basin's line"
        ),
        submersible('ninth-two', 5600, 3650, ''),
        submersible('ninth-three', 5700, 3650, ''),
        submersible('ninth-four', 5800, 3650, ''),
        // §11 — the rim's own two, at Prospect's coordinates exactly. They walk
        // Prospect's legs, because the tide before is where the last tide left
        // them — and see finding 1 in the file header for what those
        // coordinates do to a node that was not on this rim when they were
        // written.
        submersible(
          'watch-a',
          4600,
          3300,
          "Prospect's western station, to the metre, and the pair that have been on the lip since before anyone had ears here. 250 m from the Chord at one depth, against a gun that reaches 650 — which is why this hull is cold and where finding 1 was measured"
        ),
        submersible(
          'watch-b',
          4750,
          3350,
          "Prospect's eastern station, to the metre. 206 m from the Chord, and cold for the same twenty seconds of arithmetic"
        ),
      ],
      structures: [
        {
          tag: 'dome',
          kind: StructureKind.Cantor,
          x: 5000,
          y: 3400,
          depthM: LIP_DEPTH_M,
          note: "The Cantorate's dome, where First Arrival stood it. +25 HYD to the 95 cap inside 1,200 m, which is the Chord's whole water and every seat of the twelve: 30 through the lip's 1.60 is Track to a lifted ear inside 2,340 m, and the Chord stands 320 m away — so §8's count was running before the party was ordered to dive. 1,200 HP, and two torpedoes at 700 would take it, which §8 prices rather than pretending nobody thought of it",
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
    {
      slot: LIP,
      // A third Directorate-faction party, for the attendants' reason and no
      // other: the engine wants a faction value and this one has no navy in it
      // at all. Separate from the attendants because the document separates
      // them, and it separates them because they are not the same kind of
      // thing — two of them keep a period, and this one keeps a time.
      faction: Faction.Directorate,
      note: 'The lip — not a party in any sense a person would use. It is a time, and the Order keeps it (§5)',
      units: [],
      emitters: [
        {
          tag: 'the-return',
          x: 4800,
          y: 3900,
          depthM: ATTENDANT_DEPTH_M,
          // §1, §6 — Attendance's figures exactly: SIG 3 for twenty seconds,
          // sounding at the sixteenth minute and forty seconds. Sustained
          // rather than pulsed — `periodTicks === onTicks` — inside a window
          // the same length as the pattern, which is Attendance's arrival
          // idiom. Bearing to the Voice from 808 m and to a Corvette from 686.
          sig: 3,
          periodTicks: 20 * SIM.TICK_HZ,
          onTicks: 20 * SIM.TICK_HZ,
          fromTick: T(16, 40),
          untilTick: T(17),
          hp: RETURN_HP,
          reading: {
            entered:
              'Entered: the return on the lip, at the sixteenth minute and forty seconds, for twenty seconds. The Order keeps the time and does not say what keeps it. The interval was read off it and was not the same fact.',
            gap: 'Not entered: the return on the lip. The interval was appointed anyway, and was kept anyway, and the Order has a time in its record that it did not hear arrive.',
          },
          note: "The lip's own return, 350 m south of the sounding point and 100 m north of the map's southern edge. Its window closes fourteen seconds before the Order answers it: the lip speaks for twenty seconds and the Order replies fourteen after it has finished, and nobody in this mission says the two facts are the same fact (§6)",
        },
      ],
    },
  ],

  /**
   * §3, §13 — the seven locks, of which one is authored and the six that are
   * not are the point. `activeSonar` has been in the Order's hands since
   * mission 3 and is priced rather than fenced: a ping is SIG 95
   * omnidirectional, Track to a dome-lifted ear from 4,808 m through the lip's
   * water and Commit-loud to a Sounder from 1,479 m. `weapons` and `torpedoes`
   * are live because the lip has to be held — and, the rim being weapons-cold
   * (finding 1), every gun in this water is the Order's and there is nothing
   * for them to answer. **A ping from any hull is a ping and not the Chord**:
   * the sounding is the only thing that feeds `sound`. Silent Running cannot
   * be locked at all, and here it is worth nothing all tide and stops a
   * sounding outright.
   */
  locks: [
    {
      ability: 'construction',
      reason: 'three nodes stand; the ledger is empty',
    },
  ],

  /**
   * §8's seven rows, in §8's order — the keystone, the three counts of hulls,
   * the transmission, the lip and the record.
   *
   * **Four terminal rows and one keystone.** An unmet keystone is Lost whatever
   * else answered; all four met is Complete, the Chord whole and the Order
   * answering whole; the keystone met with any hull entered is Partial. The
   * middle rung is the Order short and never the Order silent, which is the
   * whole reason `the-transmission` is not on the ladder: `objectiveReadings()`
   * appends the reading pair of *every* objective that carries one and only
   * terminal rows enter the count, so the transmitted line and the unstruck
   * line are priced identically by the runtime rather than by anybody's
   * restraint. A tone over an empty node is Lost with *Transmitted* printed
   * beneath it, and the register says so out loud.
   */
  objectives: [
    {
      id: 'the-lattice',
      text: 'Two loads are set into the node on the lip. Without them a tone over it is a tone.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      keystone: true,
      markerId: 'the-chord',
      // §8 — `extract ... loaded: true` counts carriers, and both loads rig at
      // the seating, so the row is purely about where the two hulls stand. It
      // cannot latch at tick zero: `chord-water` is 2,700 m from the cache.
      // And a rectangle is not a room — the test is two-dimensional, so a
      // player who holds 1,750 m over the water latches this with the Chord
      // idle at 30 and never enters Abyssal water at all (§8, §13).
      predicate: {
        kind: 'extract',
        role: 'carrier',
        region: 'chord-water',
        count: 2,
        loaded: true,
      },
      reading: {
        met: 'The crystal is set. The Chord is whole.',
        unmet:
          'The crystal is not set. The Chord is a node on a lip, and the Order spent its lattice to reach a node.',
      },
    },
    {
      id: 'the-choirmaster',
      text: 'The Choirmaster answers the count.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      // §8 — standing, and re-derived every tick (`isStanding`), so a hull lost
      // at 16:30 reads *entered* at 18:00 rather than *answering*.
      predicate: { kind: 'survive', role: 'tender', count: 1 },
      reading: {
        met: 'The Choirmaster is above the line, or under the Chord, and answers.',
        unmet: 'The Choirmaster is entered. There is nobody left to say the name to the house.',
      },
    },
    {
      id: 'the-escort',
      text: 'Three of the escort answer the count.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      predicate: { kind: 'survive', role: 'escort', count: 3 },
      reading: {
        met: 'The escort answers.',
        unmet: 'A hull of the escort is entered. Say the name to the house yourself.',
      },
    },
    {
      id: 'the-carriers',
      text: 'Two carriers answer the count.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      predicate: { kind: 'survive', role: 'carrier', count: 2 },
      reading: {
        met: 'The carriers answer.',
        unmet: 'A carrier is entered. Say the name to the house yourself.',
      },
    },
    {
      id: 'the-transmission',
      text: 'Thirty seconds at the hundredth, bow to the Mouth, from the Chord. A tone you interrupt is a tone you have not played.',
      initial: ObjectiveStatus.Pending,
      // §8 — **non-terminal**, and that is the ending. It cannot touch
      // Complete, Partial or Lost, and it prints beneath whatever the count
      // earned, ranked by nobody.
      markerId: 'the-mouth',
      // §9, §13 — revealed at the Collapse, which is a beat, so the reveal has
      // one under it. What actually windows the row is physical rather than the
      // reveal: the tally is monotone and runs from zero, and the only hull
      // that can feed it is held to 15:30 and sitting 3,715 m from the point.
      revealAtTick: COLLAPSE_TICK,
      predicate: { kind: 'sound', count: 1 },
      reading: {
        met: 'Transmitted. The reply is not entered here.',
        unmet:
          'The Chord stood, whole, and was not struck. The Voice did not refuse; the interval passed, which is the same thing said courteously.',
      },
    },
    {
      id: 'the-lip',
      text: 'Three returns sound on this lip. What is heard is entered as a time.',
      initial: ObjectiveStatus.Pending,
      // §8, §13 — `attend` counts attendable emitters and names none, so the
      // row is worded in threes rather than pretending to point at the lip's
      // own. Three are authored and all three carry a reading; the return's
      // entered-and-gap lines print at the close whatever this row says, which
      // is where the sixteenth minute is actually entered.
      predicate: { kind: 'attend', count: 3 },
      reading: {
        met: 'Three returns were heard on this lip and all three are entered as times.',
        unmet: 'Fewer were heard than sounded. The Order does not keep a gap.',
      },
    },
    {
      id: 'the-count',
      text: 'The rim is attended. Three nodes are entered, and the count is not yours.',
      initial: ObjectiveStatus.Pending,
      // §8, §13 — Met by about 00:30 and that is the design, as it was on D+2.
      // `ExposureReport.tier` is the best tier anybody holds on any entity of
      // the player's, structures included, so three Spires idling at 30 — one
      // of them 320 m from a Cantor — spend thirty cumulative seconds at
      // Classification or better before the party has finished descending. The
      // row is a record, not a rule.
      predicate: {
        kind: 'tolerance',
        ticks: COUNT_TICKS,
        tier: ResolutionTier.Classification,
      },
      reading: {
        met: 'The Order stood on the lip, at length, under a node, with something set into it, and the Directorate wrote all of that down.',
        unmet:
          'The Order was on the lip and was classified by nobody for long, which on this rim means the dome was struck before it could.',
      },
    },
  ],

  /**
   * §9's beat table, in its order. Eighteen minutes, closing on a `resolve`
   * that is **not** a conclusion: this mission can be lost, in three specific
   * audible ways (§8), and the last of them also takes the tone with it.
   *
   * The telegraph is paid by the basin: `loud: true` at 16:30 against a resolve
   * at 18:00, which is ninety seconds against campaign.md §10's sixty. And the
   * correction has been walking since 02:30, and the Collapse is named in the
   * briefing by the tick it happens on, said twice.
   *
   * These transits are authored, not steered, for the standing reason: a
   * mission's beats happen at the time the document says they happen. The
   * cohort's tempo is why; the beats are when.
   */
  beats: [
    // 01:00 — the order to descend (§12). The tick-zero row of §9's table is
    // the seating and the briefing, not a line: §12 authors nine voices and
    // none of them is at 00:00 (finding 4 in the file header).
    {
      atTick: T(1),
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull, the order to descend',
      text: 'The interval is at seventeen. The lattice comes down at sixteen; I come down at half past fifteen and I am over the slopes when it goes. Set the crystal and hold the lip. Descend.',
      note: '1,250 m at 45 m/s is 27.8 seconds at a SIG floor of 72, and each node goes to 80 the tick a hull is under it below its own rating. Read, not heard — the standing status of the say channel',
    },

    // 02:30 — the northern row musters in step on the lip. Six Choristers
    // cruising at 24 are Contact to the Voice from 3,818 m: a full minute of a
    // cohort forming up before it walks (§7, §8).
    ...WAVE_ONE.map((hull) =>
      musterBeat(
        hull,
        T(2, 30),
        'Mustering in step on the lip, and standing between 02:35 and 02:44'
      )
    ),

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

    // 03:30 — the first correction. Onto the Chord's water at 3,000 m, where
    // it stands, files, and is heard: 255 to 412 m from the node, inside the
    // 450 m the doctrine is stated at, and weapons-cold (§4, §9).
    ...WAVE_ONE.map((hull) => correctionBeat(hull, T(3, 30))),

    // 04:00 — the watch's first leg, Prospect's. Ten minutes of the lip walked
    // west and back, which is the tide's one long absence from the Chord's
    // water and the only quiet the node's own listeners give it.
    {
      atTick: T(4),
      kind: 'move',
      tag: 'watch-a',
      x: 3600,
      y: 3300,
      note: "The watch walks the lip, on Prospect's own legs",
    },
    { atTick: T(4), kind: 'move', tag: 'watch-b', x: 3750, y: 3350, note: '' },

    // 04:30 — the correction, filed as a correction (§12).
    {
      atTick: T(4, 30),
      kind: 'say',
      speaker: 'Cohort-Prime Adze, 9th Trench Cohort',
      text: 'Correction is filed against the node on the lip. It was entered when it rose and stood into nothing; it stands into the watch now. What was set into it is counted. What is under it is corrected at what leaves.',
      note: 'Filed in the passive, and it never says who is being corrected. Adze is correct in every word of it, and the debt the transmission is entered against is not stated (§5)',
    },

    // 06:00 — the plateaus, who do not ask (§12).
    {
      atTick: T(6),
      kind: 'say',
      speaker: 'The charting pair, for the plateaus',
      text: "We're still here, on the terraces. We'd like it in somebody's record that we asked nothing of the rim and it asked nothing of us. We think you're about to ask it something.",
      note: 'Refuses the imperative twice and offers a distinction where anybody else would put a request',
    },

    // 08:00 — those below (§12).
    {
      atTick: T(8),
      kind: 'say',
      speaker: 'Watch-Speaker, for those below',
      text: 'The rim is attended. Three nodes are entered. The third was entered when it was raised and was not corrected, because a node with nothing under it is a silence, and silence is attended too.',
      note: '',
    },

    // 08:30 — the southern row musters, 141 to 539 m, standing by 08:44.
    ...WAVE_TWO.map((hull) =>
      musterBeat(hull, T(8, 30), 'Mustering in step on the lip, and standing by 08:44')
    ),

    // 09:00 — the watch's second leg, Prospect's.
    { atTick: T(9), kind: 'move', tag: 'watch-a', x: 2400, y: 3400, note: '' },
    { atTick: T(9), kind: 'move', tag: 'watch-b', x: 2550, y: 3450, note: '' },

    // 09:30 — the second correction, to the Chord's northern water: the water a
    // loaded carrier climbs out through (§9).
    ...WAVE_TWO.map((hull) => correctionBeat(hull, T(9, 30))),

    // 12:00 — the only line in the mission that counts two kinds of number in
    // one breath, which is why she says it to nobody (§12).
    {
      atTick: T(12),
      kind: 'say',
      speaker: 'Voice Ren Kalliso, once, to nobody',
      text: 'Nineteen were the cadre. Twenty-two years are mine, since nine. Thirty seconds are the Order’s. I would like it entered that I counted, and that the numbers are not the same kind of number.',
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

    // 14:00 — the watch resumes Prospect's station, 206 and 250 m from the
    // Chord, two minutes before the Order has to hold it.
    { atTick: T(14), kind: 'move', tag: 'watch-a', x: 4600, y: 3300, note: '' },
    { atTick: T(14), kind: 'move', tag: 'watch-b', x: 4750, y: 3350, note: '' },

    // 15:30 — the release. Both hulls at once, and the escort is what brings
    // the Choirmaster down: `escortRadiusM` is 600, so a party that walked
    // every escort onto the lip has stranded her (§4, §13).
    {
      atTick: RELEASE_TICK,
      kind: 'release',
      tag: 'the-choirmaster',
      note: '3,413 m at 45 m/s is 75.8 seconds over water she is rated for, so she is at the Chord at 16:46 and, if she takes the dive, under it at 17:14',
    },
    {
      atTick: RELEASE_TICK,
      kind: 'release',
      tag: 'escort-b',
      note: 'One hull for ears, and the only thing that lets the tender move',
    },
    {
      atTick: RELEASE_TICK,
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull, at the release',
      text: 'I am coming down, with ears. Half a minute of slopes and the lattice goes under me.',
      note: '',
    },

    // 16:00 — the Collapse. Two `lose` beats spend the lattice; from this tick
    // every Knight hull at 1,800 m or deeper and outside the Chord's 600 m
    // takes 4 HP/s, unhealable — 105 seconds for a Corvette, 300 for a Cruiser.
    // The two destroyed structures lay marks at SIG 18 for 180 seconds, so the
    // rim hears the Order spend its lattice and nothing in the water knows why.
    {
      atTick: COLLAPSE_TICK,
      kind: 'lose',
      tag: 'node-one',
      note: 'The lattice, spent. `lose` zeroes the hull and `reap` tears it down, and `reap` is also where the mark is laid — which is the only way the format has of making the Collapse a thing that happened rather than an absence',
    },
    {
      atTick: COLLAPSE_TICK,
      kind: 'lose',
      tag: 'node-two',
      note: '806 m from the dome: Contact to a dome-lifted ear from 2,412 m through the terraces’ 0.70, with sixteen hundred metres to spare',
    },

    // 16:00 — and the twelve seconds the Collapse buys, imitated: every
    // Chorister ordered 480 m east, because a moving scripted hull holds its
    // fire (§13). It is an imitation of a stun and the document calls it one.
    ...COHORT.map((hull) =>
      walkBeat(
        hull,
        COLLAPSE_TICK,
        WALK_M,
        'Twelve seconds east at 40 m/s, and out of its own stated 450 m of the node'
      )
    ),

    {
      atTick: COLLAPSE_TICK,
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull, at the Collapse',
      text: 'The lattice is spent. Everything below the line and outside the Chord’s six hundred is bleeding from this tick. Hold the lip.',
      note: '',
    },
    {
      atTick: COLLAPSE_TICK,
      kind: 'say',
      speaker: 'Chapter-Master Halden Vrey, on the lattice from the Third',
      text: 'I hear it. Enter that I said nothing else.',
      note: 'Six words: a Chapter-Master watching the lattice he built with his own hands come down on somebody else’s rim and declining, formally, to say anything about it — a refusal that only means something in a register where silence is written down and played (§12)',
    },

    // 16:15 — the cohort turns back, twelve seconds more.
    ...COHORT.map((hull) =>
      walkBeat(hull, T(16, 15), 0, 'Twelve seconds back, to the stop it left at sixteen')
    ),

    // 16:30 — the basin lifts off: Prospect's own point and Prospect's own
    // line, on the tide the week's noise came due for the third time, ninety
    // seconds ahead of the close. The loud beat campaign.md §10's telegraph is
    // measured from, and it is never mistaken for the reply — it is heard a
    // full minute before the tone, it comes from the wrong bearing, and it has
    // finished arriving by about 17:10.
    //
    // **`driveTo.depthM` 2,000**, unlike Prospect's and First Arrival's beats,
    // because §9 and §11 both give the transit a depth. The species' own
    // working depth is the same 2,000, so what the field buys here is that the
    // document said it rather than inherited it.
    {
      atTick: T(16, 30),
      kind: 'creature',
      tag: 'the-basin',
      species: FaunaSpecies.Sounder,
      spawnAt: { x: 3000, y: 3600, depthM: ATTENDANT_DEPTH_M },
      driveTo: { x: 3000, y: 2400, depthM: 2000 },
      untilTick: T(18),
      loud: true,
      note: "The week's ledger of noise, come due for the third time. It rises 1,800 m west of the Chord and stands off it at 1,950 — the far side of the rim entirely. It grinds hulls of 95 m and up and the two Cruisers are the only such hulls on the party, and neither is on its line. Against the tone it is deaf and unkillable by weapons (#349); the arithmetic is worth stating anyway, because the player does not know it is driven — the cone at 100 would interest a Sounder from 933 m and commit it from 768, the flank at 35 from 484 and 399, and 1,950 m is outside every one of those (§7)",
    },

    // 17:00 — two words, on the way down (§12).
    {
      atTick: T(17),
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull, on the way down',
      text: 'The interval.',
      note: 'The seventeenth minute began the tick the lip stopped speaking, and the tone is held inside it from about 17:14 to about 17:44',
    },

    // 18:00 — the count is read. **Not** a conclusion: this mission can be
    // lost, so campaign.md §10's sixty seconds apply and are answered by the
    // basin's ninety. And the last forty seconds are the reply not being shown.
    {
      atTick: T(18),
      kind: 'resolve',
      note: 'The count is read. What was played over the Chord, or not, is entered beneath it, and the reply is not entered here',
    },
  ],

  /**
   * §9's three conditional beats, printed in the document rather than on the
   * clock because a condition has no tick.
   *
   * No `choiceGroup`: these three are not a choice. None can fire at tick zero
   * — the tolerance needs thirty cumulative seconds, the keystone needs two
   * carriers 2,700 m from where they are sitting, and the tone needs a hull
   * that is held for fifteen and a half minutes.
   */
  conditionalBeats: [
    {
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull',
      text: 'The crystal is set. The Chord is whole and silent, which is the state the Third would prefer it stayed in.',
      note: 'In practice about 03:00, on the pass both carriers stand loaded in the Chord’s water',
      when: { kind: 'extract', role: 'carrier', region: 'chord-water', count: 2, loaded: true },
    },
    {
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull',
      text: 'Transmitted. — I have nothing to add and the Order has nothing left to add it with.',
      note: 'On the pass the sounding completes, which is the only thing in the mission that can fire it — one sounding is authored and `sound` names none, so the two happen to coincide (§8)',
      when: { kind: 'sound', count: 1 },
    },
    {
      kind: 'say',
      speaker: 'Watch-Speaker, for those below',
      text: 'Entered: the Order on the lip, at length, under a node, with something set into it.',
      note: 'In practice about 00:30, before the party has finished descending: three structures at SIG 30, one of them 320 m from a Cantor, spend thirty cumulative seconds of Classification before anything of the Order’s is in Abyssal water (§8)',
      when: { kind: 'tolerance', ticks: COUNT_TICKS, tier: ResolutionTier.Classification },
    },
  ],

  /**
   * §8's Results, verbatim — Sull's three readings, with the seven objective
   * readings and then the three emitters' entered-and-gap lines printing
   * beneath whichever row the run earned, in that order (`runtime.ts` appends
   * `objectiveReadings()` and then `transcript()`).
   *
   * The Complete reading does not say *Transmitted* and the Partial does not
   * say it was not. All three keep campaign.md §9 to the letter: no reply, no
   * description, and a cost of thirty thousand people stated as *nothing with
   * which to do it twice*.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      'The crystal is set and every hull answers the count. The lattice is spent, the nodes are spent, and what is below the line will come up or not. The Order has done the one thing it was founded to do and has nothing with which to do it twice, which Halden will say was the point. What was played over the Chord, or not, is entered beneath this, and the reply is not entered here.',
    [MissionOutcome.Partial]:
      'The crystal is set and the Order is short. A name is to be said to a house tonight and it is not mine to say; the Order has an instrument on the Mouth’s edge and fewer people than it had this morning, and thirty thousand who will argue for a century about the trade. It is not canon that they are wrong, either way.',
    [MissionOutcome.Lost]:
      'Nothing is set. The lattice was spent to reach a node with nothing in it, and the Order is below the line at four points a second with a rating it lent itself and has now taken back. The plan was mine. Enter that, and enter nothing about the Mouth, because nothing was said to it.',
  },
};
