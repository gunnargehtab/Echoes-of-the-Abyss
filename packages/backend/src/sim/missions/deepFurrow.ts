/**
 * The Second Seeding 4 — Deep Furrow. docs/mission-deep-furrow.md, transcribed.
 *
 * A data literal in `convocation.ts`' idiom, on the map its own §11 owns: the
 * document owns the forces, the water, the beats, the numbers and the text.
 * Where this file and that document disagree, one of them is wrong and the fix
 * says which.
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **The garden is a region that rates the hulls standing in it** (§4). Three
 *   ordinary PR-2 tenders stand at 2,200 m — water that asks PR-3 and charges
 *   4 HP a second, unhealable, to anything short of it — and pay nothing,
 *   because `standing-furrow` carries `pressureBonus: 1`. That is the whole
 *   system, introduced by the ground doing it before anybody says a word.
 * - **The sowing writes the same grant onto bare rock** (§4.3). Sixty seconds
 *   inside 250 m of 2625, 2125, bow on, not silent, at SIG 45, on ground that
 *   costs four a second — and when the hold completes the `ground` beat turns
 *   the second furrow Kelp Forest *and* grants it the band. One beat, both
 *   halves, on one tick: the campaign's one biome spend, and the only repaint
 *   in the bible that makes ground better.
 * - **The layer is the other wall** (§4.4). The base floor is the duct's top,
 *   so home and the sill are on different maps until the day dives. Nothing in
 *   this literal enforces that; `THERMOCLINE` does, and §6 and §7's whole
 *   arithmetic falls out of `pathPropagation` walking a line that goes through
 *   the garden.
 * - **The day runs its length** (§8). Both terminal rows can be met on the
 *   15:30 pass — a day that sowed by 09:00 and is in the garden when *tended*
 *   is revealed meets both there — and the court's rule would close the tide
 *   three minutes early, with two Hollows still loud in the doorway.
 *
 * **One thing this literal does not seat, and the document's own §13 is why.**
 * §3, §5 and §11 place a bloom-bed — a `SoundingSpire`-kind structure at
 * 1700, 2125 — and every one of those rows calls it an approximation held
 * "until the row lands". The row has landed (`MissionRegion.pressureBonus`),
 * and §6 says in as many words that "the row that replaces it (§13) has no
 * hum, because a furrow is not a machine": a Spire whose grant is load-bearing
 * sings at 80 and hands the sill a Track on the garden at ratio 37.6, which is
 * §6's own account of what the sill would be hearing *of the format* rather
 * than of the water. So the garden is the region grant and nothing stands in
 * it, and §6's table is what the sill hears.
 *
 * Two more things the document names and this literal deliberately does not
 * build, because §13 assigns them elsewhere: Anholt's Seeding ability, which
 * §10 and §13 both decline to ask for, and cross-mission Drift Health, which
 * is *In Writing*'s row and not this one's.
 */

import {
  Biome,
  Faction,
  FaunaSpecies,
  MissionOutcome,
  ObjectiveStatus,
  SEEDING_DEEP_FURROW_HEADER,
  SIM,
  UnitKind,
  faunaStatsFor,
} from '@echoes/shared';

import type { MissionBeat, MissionDefinition, MissionUnit } from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/** Reserved and empty, as every Commune literal reserves it (§2). */
const COURT = 1;
/** Those below — one hull, posted at the sill since the letter of 205 (§6). */
const OBSERVER = 2;

/** §11 — the Foot's floor, the seat, and the last water above the layer. */
const FOOT_DEPTH_M = 900;
/** §6, §11 — the observer's station, over a sill whose floor is 2,600. */
const SILL_DEPTH_M = 2400;
/**
 * §11 — the Hollows' water, and the species' own: a creature placed without a
 * live commitment holds `workingDepthM`, so the authored figure and the
 * roster's have to be the same number or the walls are not where §4 prices
 * them (docs/mission-intake.md §13).
 */
const WALL_DEPTH_M = faunaStatsFor(FaunaSpecies.Hollow).workingDepthM;
/** §11 — the duct, where the programme's crop has been farmed since 204 PC. */
const DUCT_DEPTH_M = faunaStatsFor(FaunaSpecies.Tetherjelly).workingDepthM;
/** §11 — the lanes, on the Foot's side of the layer. */
const LANES_DEPTH_M = faunaStatsFor(FaunaSpecies.Draymaw).workingDepthM;

/**
 * §4.3 — the sowing's own figures, authored here rather than in
 * `constants.ts` for the rule `MissionSounding` states about Aptitude's
 * 400 / 20 / 80: these are one mission's arithmetic against one piece of rock,
 * not a rule of the world. Forty-five is the working figure of a Standard cut
 * (economy.md §3) and the figure the jelly lift was authored at in
 * docs/mission-tend.md §9.
 */
const SOWING_POINT = { x: 2625, y: 2125 };
const SOWING_RADIUS_M = 250;
const SOWING_HOLD = T(1);
const SOWING_SIG = 45;

/**
 * §4.1 — one band, and never two.
 *
 * The Deepbloom conversion of docs/systems-depth.md §3 written down as a rule:
 * a hull standing in seeded ground operates at PR + 1, which at 2,200 m is
 * exactly what the water asks and not a metre more. Resolved against a
 * Sounding Spire's aura as a max (`aurasSystem`), so nothing here can quietly
 * rent a second band and un-crush water the design means to be lethal.
 */
const FURROW_GRANT = 1;

/**
 * A tender of the working day — the plateau's ordinary hull, unrefit, PR-2 on
 * the roster and left there deliberately (§2, §3).
 *
 * A `pressureRating` here would refit the hull and leave the garden nothing to
 * do, and the whole of Anholt's claim is that an ordinary tender lives at
 * 2,200 m *because the ground holds it*. Souls are authored per hull and read
 * at the close; nothing in the runtime ranks them (§3; §13).
 */
const tender = (tag: string, x: number, y: number, souls: number, note: string): MissionUnit => ({
  tag,
  kind: UnitKind.Harvester,
  x,
  y,
  depthM: FOOT_DEPTH_M,
  role: 'tender',
  souls,
  note,
});

/**
 * A creature placed and not driven — docs/mission-intake.md §13's idiom.
 *
 * The `creature` beat's `driveTo` is required, so an animal that must be left
 * to its own trigger model is committed to its own spawn until tick zero: the
 * first pass finds the commitment already expired and hands the creature its
 * ears back. `loud: false`, because nothing about a coiled Hollow, a moored
 * jelly or a pack working the lane traffic is a precursor to anything.
 */
const placed = (
  tag: string,
  species: FaunaSpecies,
  x: number,
  y: number,
  depthM: number,
  note: string
): MissionBeat => ({
  atTick: 0,
  kind: 'creature',
  tag,
  species,
  spawnAt: { x, y, depthM },
  driveTo: { x, y },
  untilTick: 0,
  loud: false,
  note,
});

export const SEEDING_DEEP_FURROW: MissionDefinition = {
  ...SEEDING_DEEP_FURROW_HEADER,
  doc: 'docs/mission-deep-furrow.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Pelagia,
  courtSlot: COURT,
  /** §5, §11 — two Hollows, three clusters and a pack, every one authored. */
  fauna: false,
  /**
   * §8 — both terminal rows can be met on the 15:30 pass and the court's rule
   * would close the tide there: before the Hollows have gone quiet, before the
   * watch has said there is room, and three minutes before the tide.
   */
  runsItsLength: true,
  /**
   * §4, §9 — forty-five, the sowing's own figure and the loudest the Commune
   * campaign has authored. A working level rather than a ceiling: Tend's
   * twenty and Convocation's twenty-six were ceilings, and this is the number
   * the day is *for*.
   */
  sigBudget: SOWING_SIG,
  // No arrayTag and no silence order — Asset Recovery's posture, as §9 states
  // it. The plateau lends nothing under the layer because it cannot hear the
  // water it would be lending into.
  silenceCeilingSig: 100,
  debtCapS: 0,
  /** §9 — zero, because nothing in this day waits for a gun. */
  escortRadiusM: 0,

  /**
   * §11's second table — the places a predicate, a lift or a ground beat
   * addresses, separate from the map's own eight.
   */
  regions: [
    {
      id: 'the-foot',
      x: 1500,
      y: 0,
      widthM: 1000,
      heightM: 500,
      note: "The drop's foot, at 900 m and above the layer. The seat, the region home means, and where the Kell seed is rigged at cut time zero",
    },
    {
      id: 'the-furrows',
      x: 1250,
      y: 1750,
      widthM: 1500,
      heightM: 750,
      note: "Both furrows, one answer: a day that sleeps in the old one and a day that has moved into the new one are the same reading (§8). *tended*'s region, and it carries no grant",
    },
    {
      id: 'standing-furrow',
      x: 1250,
      y: 1750,
      widthM: 1000,
      heightM: 750,
      // §4.1, §11 — the ten-year ground alone, and deliberately not
      // `the-furrows`: a grant across both would rate the second furrow before
      // it is sown and take the four a second out of the sowing, which is the
      // mission.
      pressureBonus: FURROW_GRANT,
      note: 'The 204 PC ground, ten years grown. Every hull standing here operates at PR + 1, which is why three PR-2 tenders do not crush at 2,200 m',
    },
    {
      id: 'second-furrow',
      x: 2250,
      y: 1750,
      widthM: 500,
      heightM: 750,
      note: "Bare rock at 00:00 — Abyssal Trench, PR-3 water, four points of hull a second. The ground beat's region, the seed's first step onto the rock, and the grant the sowing writes",
    },
  ],

  /**
   * §11 — the Kell seed as a lift with its cut time at zero, the gift run's
   * shape from docs/mission-tend.md §13: rigged on the first pass in the Foot,
   * before the day has moved.
   *
   * Its id is also how the format addresses the sower without a second role.
   * `MissionUnit.role` is singular, and a `role: 'sower'` would take the sower
   * out of the count of three that *the-day* reads — so the beat that fires
   * when the seed goes out onto the bare rock is an `extract` naming the load
   * (§13).
   */
  lifts: [
    {
      id: 'kell-seed',
      tag: 'sower',
      region: 'the-foot',
      cutTicks: 0,
      cutSig: 0,
      note: "The seed stock Thin Water's column was sent to Kell for. Rigged the moment the day is seated, and never loud — a seeding is not a work site",
    },
  ],

  /**
   * §4.3 — the sowing. Sixty seconds inside 250 m of the point, bow on it, not
   * silent, at 45, on rock that costs four a second.
   *
   * The point is chosen so the hold's whole radius lies outside the standing
   * furrow's grant: the sower stands at x ≥ 2,375 and the grant ends at
   * x 2,250. Every second of the sowing is paid for on unseeded ground, which
   * is what makes the arithmetic in §4 a decision rather than a formality —
   * sixty seconds and two walks is 255 of a tender's 300, and a hold broken
   * once is a hull that does not have another sixty seconds in it.
   */
  soundings: [
    {
      id: 'the-sowing',
      tag: 'sower',
      x: SOWING_POINT.x,
      y: SOWING_POINT.y,
      radiusM: SOWING_RADIUS_M,
      holdTicks: SOWING_HOLD,
      sig: SOWING_SIG,
      note: 'A broken hold resets to zero (`accrueSounding`) and the hull does not. Silence stops it outright, which is §3’s price: a sower that goes quiet on the rock loses the hold and keeps paying for the rock',
    },
  ],

  /**
   * Two, and neither points at an animal. §8 names both; the second is shipped
   * only from 15:30, because a marker reaches the client only while an
   * objective naming it is revealed.
   */
  markers: [
    {
      id: 'the-second-furrow',
      label: 'The second furrow. Bare rock, and the seed is aboard.',
      x: SOWING_POINT.x,
      y: SOWING_POINT.y,
      radiusM: 400,
    },
    {
      id: 'the-furrows',
      label: 'The furrows. Ten years of one, and room in both tonight.',
      x: 2000,
      y: 2125,
      radiusM: 750,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Pelagia,
      note: "The working day the plateaus send down: three tenders, one of them carrying the Kell seed, and the programme's two proof scouts. No Bastion, no economy, no draw — the day earns nothing, because the work today is being somewhere (§2, §3)",
      units: [
        tender(
          'sower',
          2000,
          250,
          5,
          'The sower, on the spawn. Ottilie Marr is among the five, and she crews it because the seed is Kell seed (§5)'
        ),
        tender('tender-two', 1850, 300, 7, ''),
        tender(
          'tender-three',
          2150,
          300,
          4,
          'Sixteen aboard the three, by household, the way a plateau crews its freight (§3)'
        ),
        // The watch: the programme's two proof hulls, refit in 204 PC for this
        // water and nothing else. PR-3 by refit is a mission fact and never a
        // roster fact — the Light Scout everybody else fields is PR-1 — and it
        // is what lets them be anywhere in the cleft without the ground's help.
        {
          tag: 'watch-one',
          kind: UnitKind.LightScout,
          x: 1750,
          y: 400,
          depthM: FOOT_DEPTH_M,
          role: 'watch',
          pressureRating: 3,
          souls: 2,
          note: 'The charting pair that arrived first at the rim (docs/mission-prospect.md §5). Their ears are the only ears the day has under the layer',
        },
        {
          tag: 'watch-two',
          kind: UnitKind.LightScout,
          x: 2250,
          y: 400,
          depthM: FOOT_DEPTH_M,
          role: 'watch',
          pressureRating: 3,
          souls: 2,
          note: '',
        },
      ],
    },
    {
      slot: OBSERVER,
      faction: Faction.Directorate,
      note: 'Those below — a detachment posted north of any trench since 205 PC to attend the one piece of Abyssal water the letter was about. It does not close, challenge or pursue (§6)',
      units: [
        {
          tag: 'observer',
          kind: UnitKind.AbyssalSubmersible,
          x: 2000,
          y: 2750,
          depthM: SILL_DEPTH_M,
          // Weapons-cold, and the register will not let it be otherwise: it
          // carries no fire control, and nothing scripted on this map ever
          // approaches the day (§6).
          note: 'Motionless until 13:00, speaks twice in the passive, and then goes below to say so instead of coming up to. PR-3 is the roster’s, no refit',
        },
      ],
    },
  ],

  /**
   * §3 — what the day does not carry, as dead affordances with the ground's
   * own reasons shown (docs/ui-ux.md §7).
   *
   * Active sonar is deliberately absent from this list: the button arrived in
   * mission 3 and this is mission 4. It is priced instead — 95 × 3 through the
   * cleft's 1.6 is Commit-loud to a Hollow from 1,434 m, and the walls stand
   * 1,300 m apart, so a ping between them answers to both at once (§3).
   */
  locks: [
    {
      ability: 'weapons',
      reason: "not grown — a garden's watch is ears, and a garden's freight is seed",
    },
    {
      ability: 'torpedoes',
      reason: "not grown — a garden's watch is ears, and a garden's freight is seed",
    },
    {
      ability: 'mines',
      reason: "not grown — a garden's watch is ears, and a garden's freight is seed",
    },
    {
      ability: 'depthCharges',
      reason: "not grown — a garden's watch is ears, and a garden's freight is seed",
    },
    {
      ability: 'noisemakers',
      reason: "not grown — a garden's watch is ears, and a garden's freight is seed",
    },
    {
      ability: 'construction',
      reason: 'nothing is built on a furrow; it is sown',
    },
  ],

  /**
   * §8's three rows, in §8's order: the sowing, the night, and the count of
   * people. The first two are terminal and the ladder falls out of them alone;
   * the third is read out beneath whichever outcome the day earned and touches
   * the ladder not at all.
   *
   * **No keystone, deliberately** (§8). A plateau that plants nothing and
   * sleeps in the garden it has is a result, not a failure, and a keystone on
   * *sown* would be the mission telling the player what a garden is for.
   */
  objectives: [
    {
      id: 'sown',
      text: "The second furrow wants sowing. Sixty seconds on the bare rock at the working figure, and the sower's hull is seventy-five. We're saying both numbers here so nobody has to do the sum down there.",
      initial: ObjectiveStatus.Pending,
      terminal: true,
      markerId: 'the-second-furrow',
      // The one authored sounding of §4.3. Monotone, it names no hull, and it
      // is met the tick the hold completes.
      predicate: { kind: 'sound', count: 1 },
      reading: {
        met: 'Two furrows. The second one sounds like the first one now, which is to say like home.',
        unmet:
          "One furrow, the way it was this morning. The seed's still aboard or it's on the rock, and we're not going to say which is worse.",
      },
    },
    {
      id: 'tended',
      text: "The furrow is home tonight, for anyone who'd rather. We're not saying stay. We're saying it holds.",
      initial: ObjectiveStatus.Pending,
      terminal: true,
      markerId: 'the-furrows',
      /**
       * §8's whole honesty, stated rather than tidied. `extract` is not a
       * standing predicate (`isStanding` lists `quiet` and `survive` and
       * nothing else) and the runtime never re-derives a Met non-standing row,
       * so a *tended* revealed at 00:00 would latch Met at about 02:00 — the
       * moment two tenders first entered the garden — and would read "it's a
       * garden" at the tide over a day that went home at 15:30.
       *
       * So it is revealed on the beat that releases the Hollows into the
       * throat and scored from that tick to the tide, the roll idiom
       * docs/mission-intake.md §9 built. The residual is real and measured:
       * twenty-four seconds in which a plateau can be read as having stayed
       * and be gone. Every other reading of the row is worse, and §13 prices
       * both alternatives.
       */
      revealAtTick: T(15, 30),
      predicate: { kind: 'extract', role: 'tender', region: 'the-furrows', count: 2 },
      reading: {
        met: "Two of ours were still at twenty-two hundred metres when the doorway woke, and it's a garden.",
        unmet: 'Nobody slept below. The doorway was open both ways and we came up through it.',
      },
    },
    {
      id: 'the-day',
      text: "Three went down. We'd like three read, whichever water they're read in.",
      initial: ObjectiveStatus.Pending,
      // §8 — non-terminal, with a reading: it prints beneath whichever outcome
      // the day earned and touches the ladder not at all. Intake's neutrality
      // guard, spent here so the count of people never becomes a score. A
      // standing count, re-derived every tick, so a tender lost on a wall at
      // 15:00 is a tender the day is short at the tide.
      predicate: { kind: 'survive', role: 'tender', count: 3 },
      reading: {
        met: 'Three. Sixteen aboard, by household.',
        unmet:
          'Fewer than three. The cleft has walls and the walls have a schedule, and one of ours found it.',
      },
    },
  ],

  /**
   * §9's beat table, in its order. Eighteen minutes, closing as a conclusion:
   * the tide turns and the day is read where it stands (glossary.md, *Mission
   * Outcome*), and a conclusion is owed no telegraph. It is paid anyway — the
   * cleft waking at 15:00 is three minutes ahead of the tide, because the
   * doorway closing is what the day sounds like at its end (§8).
   *
   * Four beats fire on a condition rather than a tick and sit below as what
   * they are: standing rules, in no order.
   */
  beats: [
    // 00:00 — the walls, the crop and the lanes, placed and not driven. The
    // Hollows are 650 m from the throat's middle and 1,300 m from each other;
    // the clusters are the programme's own, farmed since 204 PC and worth
    // -0.10 PF each within 250 m; the pack is 1,500 m west of the seat, on the
    // Foot's side of the layer, and interested in nothing the day does (§7).
    placed(
      'hollow-west',
      FaunaSpecies.Hollow,
      1350,
      1000,
      WALL_DEPTH_M,
      'The west wall. A Hollow coils at Interest and strikes only at Commit *and* inside 500 m in three dimensions, so the sphere is the whole strike (§4)'
    ),
    placed(
      'hollow-east',
      FaunaSpecies.Hollow,
      2650,
      1000,
      WALL_DEPTH_M,
      'The east wall, 1,300 m across the road from the first'
    ),
    placed(
      'jelly-west',
      FaunaSpecies.Tetherjelly,
      1500,
      900,
      DUCT_DEPTH_M,
      "The programme's crop, in the duct where the layer is. Chart data, and priced by the path walk rather than by this document"
    ),
    placed('jelly-mid', FaunaSpecies.Tetherjelly, 2000, 700, DUCT_DEPTH_M, ''),
    placed('jelly-east', FaunaSpecies.Tetherjelly, 2500, 900, DUCT_DEPTH_M, ''),
    placed(
      'lanes-pack',
      FaunaSpecies.Draymaw,
      500,
      250,
      LANES_DEPTH_M,
      'Five, working the lane traffic’s leavings at 900 m. Classification to the watch all day — the sound of home, and it stops in the duct'
    ),
    {
      atTick: 0,
      kind: 'say',
      speaker: 'The watch',
      text: "The furrow's under the layer. Home can't hear it and it can't hear home, and we can't hear whatever's at the sill either — not from here. We'll have it when we're under. It'll have had us since the dive.",
      note: 'The two maps, said once at the top of the day (§7)',
    },

    // 00:30 — the last sentence before the layer. Marr is at the mouth, at
    // 900 m, and orders nobody to do anything because she cannot (§2, §12).
    {
      atTick: T(0, 30),
      kind: 'say',
      speaker: 'Tidespeaker Ysolde Marr',
      text: "That's the mouth. Past it we can't hear you and you can't hear us, and whatever's at the sill has been hearing this cleft since before any of you were crew. Nobody has to answer it. We'd like three read at the tide, in whichever water they're read in, and we'd like one more row than there was this morning. We're saying *like*.",
      note: 'The coda. A preference stated and no instruction given on it',
    },

    // 03:00 — Anholt, in the garden, once the day is sitting on it. The one
    // imperative mood in the document, and §12 prices it rather than tidying
    // it: she is the one person on this water who has the votes, and the one
    // moment she reaches for an order is the moment the thing she was right
    // about is under her hull.
    {
      atTick: T(3),
      kind: 'say',
      speaker: 'Bloomwright Sefa Anholt',
      text: "Ten years, one furrow, and you're sitting on it. Nothing's holding your hull but the ground. Hear it a minute before anybody says anything about it — the water over you is taking the sound the way the rows at home take it, and there's no kelp down here. There's what we grew.",
      note: 'The water absorbing, heard before anybody says so (§10)',
    },

    // 05:00 — the sill enters what it has had since the dive began. Passive,
    // counting, and never threatening in a threatening word (§6).
    {
      atTick: T(5),
      kind: 'say',
      speaker: 'The observer, for those below',
      voice: 'cohorts',
      text: "Three and two, at the band's depth, at the plateaus' figure. It is heard. It has been heard since 205, and it is entered as it has been entered.",
      note: 'A sentence kept for nine years without being acted on, which no other register in the setting can do',
    },

    // 13:00 — it moves, down the sill and not up it. It has heard everything
    // it came for. The one hull with the ears to find the day leaves, and the
    // watch says what that means, once (§6, §12).
    {
      atTick: T(13),
      kind: 'move',
      tag: 'observer',
      x: 2000,
      y: 2950,
      depthM: SILL_DEPTH_M,
      note: 'Two hundred metres further into the deep the cleft opens onto. Nothing scripted on this map ever approaches the day',
    },
    {
      atTick: T(13),
      kind: 'say',
      speaker: 'The watch',
      text: "It's moving. Down the sill, not up it. It's going below, and it didn't need to hear any more first.",
      note: 'The hook the next mission hangs from (docs/mission-in-writing.md)',
    },

    // 15:00 — the cleft wakes. Both Hollows driven off the walls to the
    // throat's centre, at 1,700 m, Committed at 60 for thirty seconds: heard
    // under the layer from 7,090 m and from home water at Track. The loudest
    // thing the map carries all day, and the loud beat the close is measured
    // from — three minutes, against §10's sixty seconds.
    //
    // The depth is on the beat rather than left to the species, because a
    // driven creature holds the commitment's depth and not its own
    // (docs/mission-intake.md §13) — and here the two agree, which is the
    // point: the drive moves the animals across the road and not up it.
    {
      atTick: T(15),
      kind: 'creature',
      tag: 'hollow-west',
      driveTo: { x: 1900, y: 900, depthM: WALL_DEPTH_M },
      untilTick: T(15, 30),
      loud: true,
      note: 'Off the west wall and into the middle, and the corridor turns inside out: the walls become the quiet way up and the middle is theirs',
    },
    {
      atTick: T(15),
      kind: 'creature',
      tag: 'hollow-east',
      driveTo: { x: 2100, y: 900, depthM: WALL_DEPTH_M },
      untilTick: T(15, 30),
      loud: true,
      note: 'Off the east wall. A hundred metres either side of the road’s centre, and 650 m from the Foot’s seat, which is why home hears the doorway close',
    },

    // 15:30 — released where they stand. The drive expires with no beat of its
    // own, leaving both animals the Drift's again at SIG 3, in the middle of
    // the doorway. *tended* is revealed on this beat and scored from it (§8).
    {
      atTick: T(15, 30),
      kind: 'say',
      speaker: 'The watch',
      text: "They've gone quiet where they are, and where they are is the middle. There's room past them along either wall if you're quiet, and there's room under them if you stay. We're not saying which. We're saying both are room.",
      note: 'The hardest sentence in the document: it names a place to sleep at 2,200 m and declines in the same breath to say whether anybody should (§12)',
    },

    // 18:00 — the tide turns. Marr reads the day where it stands, carried up
    // the cleft by the watch because the mouth cannot hear the furrow, and
    // then says the one sentence she should not say aloud (§8, §12).
    {
      atTick: T(18),
      kind: 'say',
      speaker: 'Tidespeaker Ysolde Marr',
      text: "I opposed it. It's the most beautiful thing anybody on the plateaus has grown. We'd like both of those heard in the same breath, because they were.",
      note: 'Sentiment stated beside opposition as one fact, by the person who will be charged for both halves',
    },
    {
      atTick: T(18),
      kind: 'resolve',
      conclusion: true,
      note: 'The tide turns and the day is read where it stands. Deep Furrow cannot be failed on a clock',
    },
  ],

  /**
   * §9's second table — the four beats that fire on a condition rather than a
   * tick, in no order at all.
   *
   * The last three share one condition and share nothing else: no choice
   * group, because none of them retires another. They are one event heard
   * three ways, and they fire in authored order on the same pass.
   */
  conditionalBeats: [
    {
      kind: 'say',
      speaker: 'Ottilie Marr, on the sower',
      text: "That's the rock. Four a second, and seventy-five of them, and sixty are the sowing; the rest are the walk out from under the bed and the walk back, and I've done that sum, and I'm not doing it twice. It's Kell seed. My mother would have wanted it planted by somebody who could count.",
      note: 'Fired by the seed rather than by the clock: the loaded hull stepping onto the bare rock (§9)',
      // The load, not the hull — `role` is singular, so the lift's id is how
      // the format addresses the sower without taking it out of the count of
      // three (§13).
      when: {
        kind: 'extract',
        role: 'tender',
        region: 'second-furrow',
        count: 1,
        loaded: 'kell-seed',
      },
    },
    {
      kind: 'ground',
      region: 'second-furrow',
      // §4.3, and the campaign's one biome spend: the water over the sown
      // ground goes from carrying at 1.6 to absorbing at 0.55 on one tick, and
      // the observer's Track on it falls from 25.5 to 6.85 in the same second.
      biome: Biome.KelpForest,
      // And the half that is not the water: the rock the sowing paid four a
      // second for now rates the hull standing on it, exactly as the ten-year
      // furrow beside it does. One beat, both halves, one tick.
      pressureBonus: FURROW_GRANT,
      note: 'The ground turns. Without this the night is a crush ledger and the last five minutes are arithmetic instead of a decision (§13)',
      when: { kind: 'sound', count: 1 },
    },
    {
      kind: 'say',
      speaker: 'Bloomwright Sefa Anholt',
      text: "There. The water's gone quiet over it. That's what ground sounds like when it's anybody's, and it's the second time in the Rift that's been true of ground at that depth, and both times it was us.",
      note: 'A scientist’s pride in a plural grammar, which the Directorate could not say at all (§12)',
      when: { kind: 'sound', count: 1 },
    },
    {
      kind: 'say',
      speaker: 'The observer, for those below',
      voice: 'cohorts',
      text: "It is entered. The band is the Second's. What was stated in 205 was stated in writing because the plateaus keep none, and it is stated again now, in the band, so that it is kept somewhere.",
      note: 'The same event, in the only register that can hear a garden as a claim. Nobody is wrong (campaign.md §2, rule 1)',
      when: { kind: 'sound', count: 1 },
    },
  ],

  /**
   * §8's Results, verbatim — Marr's three readings, carried up the cleft by
   * the watch because the mouth cannot hear the furrow. The objectives' own
   * readings print beneath in authored order, so *the-day*'s count of people
   * lands under all three and is never one of them.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      "It's two furrows and there are people in both. We'd like you to hear what the observer heard, because it's the same sound, and we'd like you to notice that it went below to say so instead of coming up to.",
    [MissionOutcome.Partial]:
      "One of the two. Either it's planted and nobody stayed, or it isn't and everyone did, and we've been both of those things before at three hundred metres. This is the first time we've been either at two thousand two hundred.",
    [MissionOutcome.Lost]:
      "The rock's still bare and the garden's empty tonight. If anybody paid for that, they paid it on the ledger that doesn't heal. We agreed the number in daylight. The number was seventy-five and it's still seventy-five.",
  },
};
