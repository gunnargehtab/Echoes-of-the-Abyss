/**
 * The Second Seeding 5 — In Writing. docs/mission-in-writing.md, transcribed.
 *
 * A data literal in `convocation.ts`' idiom, on `deep-furrow`'s map: the
 * document owns the forces, the water, the beats, the numbers and the text.
 * Where this file and that document disagree, one of them is wrong and the fix
 * says which.
 *
 * §13 predicted that this mission would ask the format for nothing new, and it
 * holds — `extract`, `survive`, `tolerance`, `ground`, `silent`, `move`,
 * `lose`, `creature`, `say`, `resolve`, `runsItsLength`, `souls` and a
 * conditional `say` all shipped before it. What is new is only what the
 * mission spends them on.
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **The Spore Veil is fielded, for the first time on any party.** Three
 *   `MissionStructure` rows at 1,790 m, which is a structure fully built —
 *   §13's `prebuilt`, and the reason the beds are *grown in the tides between*
 *   rather than raised during the tide: a player-built Veil would sit at
 *   `CONSTRUCTION.WORKING_DEPTH_M`, 600 m, wherever the floor is. The cloud is
 *   horizontal (`auras.ts` tests `Math.hypot` on x and y), which this literal
 *   leans on twice — the seat at 1,790 m is veiled exactly as the 2,200 m
 *   floor would be, and a scout cannot leave a cloud by climbing.
 * - **The line walks cold, and the beds die on the clock.** Fire control is
 *   tier-blind (`combat.ts`, "in range implies heard") and a structure is a
 *   live enemy, so an armed Chorister standing inside a cloud would have the
 *   bed itself 270 m inside its 450 m reach and every bed on this map down on
 *   the first stationary pass. §6 spends that finding: no `armed` flag on any
 *   of the eight, three `lose` beats at 09:00, 12:00 and 15:00, and every gun
 *   in the cohort at the doorway.
 * - **The player's own guns are struck by the player's own side.** Six locks
 *   with the reason in register, and `activeSonar` deliberately not among them
 *   (§3): the ping is priced by there being nothing here it is the answer to,
 *   and by 95 × 0.4 = 38 telling the dome which bed the pinger is under.
 * - **The tide is the close.** `runsItsLength: true` — the court's rule would
 *   read Juno's three as alive and struck at 13:45 while they were still under
 *   a bed with a line walking toward it (§8). Nothing here is met at tick zero
 *   either: both terminal rows are extracts into the Foot, and nobody is in
 *   the Foot at 00:00.
 *
 * **The map is `anholt-furrow`, unchanged** (§11) — docs/mission-deep-furrow.md
 * owns the literal and this mission reuses it region for region, adding
 * markers, structures, parties and one `ground` beat, never geometry. The
 * 00:00 repaint of the Second Furrow is a *restatement* of water that was
 * turned three tides ago, not a second spend, and it is load-bearing acoustics
 * rather than decoration: before it, `pathPropagation` prices the dome-to-
 * eastern-bed pair at 1.25 and §4's "625 m through the garden's own 0.55" is
 * false; after it, the pair is 0.55 and every figure in §7 is the engine's.
 *
 * Two authoring decisions the document leaves to the literal, stated here
 * rather than discovered:
 *
 * - **The line's eight seats are spaced 1,300 / 7.** §6 says "x 1,350 to
 *   2,650 at 186 m spacing", which is eight hulls across thirteen hundred
 *   metres — 185.71 m, rounded to the metre per seat. `cohort-1` lands at
 *   1350, 2700, which is the 906 m §7 measures its rise from.
 * - **The two closing voices are beats.** §9's 16:00 row carries only
 *   `resolve`, and §8 and §12 place Marr's own sentence and Anholt's after the
 *   count, on the lane. They are authored at the closing tick ahead of the
 *   resolve, exactly as `intake.ts` and `convocation.ts` author theirs; the
 *   count itself is the epilogue and the objective readings beneath it.
 *
 * And one thing the document names and this literal deliberately does not
 * build, because §13 assigns it elsewhere: `MissionRegion.pressureBonus`. Every
 * player hull is seated at 1,790 m, where `requiredPressureRating` returns 2
 * and a PR-2 hull owns the water for nothing — the grant exists now, and
 * leaning on it here would buy nothing and cost the mission a Sounding Spire
 * humming at SIG 80 over a garden whose whole subject is being quiet.
 */

import {
  Biome,
  Faction,
  FaunaSpecies,
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  SEEDING_IN_WRITING_HEADER,
  SILENT_RUNNING,
  SIM,
  StructureKind,
  UnitKind,
  faunaStatsFor,
} from '@echoes/shared';

import type { MissionBeat, MissionDefinition } from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/** Reserved and empty, as every Commune literal reserves it: no court, no array. */
const COURT = 1;
/** The Second Trench Cohort — the letter, arriving as hulls (§5, §6). */
const COHORT = 2;

/**
 * §3, §11 — the seat, and the number is chosen against the ruleset rather than
 * against the fiction: `requiredPressureRating` turns over at the 1,800 m band
 * line, so a PR-2 hull owns 1,790 m for nothing — no refit, no crush, and no
 * zone under it. The beds stand at the same depth, and because the cloud is
 * horizontal that costs the mission nothing at all.
 */
const SEAT_DEPTH_M = 1790;
/** §6 — the dome, at the first furrow's north edge, over the garden's 2,200. */
const DOME_DEPTH_M = 2000;
/** §6 — the duct, ±100 m of the layer, where a Listener hears both halves at 1.0. */
const DUCT_DEPTH_M = 1200;
/** §6 — the sill, where the line is seated. PR-3 water on a PR-2 hull (§13). */
const SILL_DEPTH_M = 2400;
/** §9 — the line's ascent at 02:00: 250 m up, seventeen seconds, silent. */
const LINE_DEPTH_M = 2150;
/** §6 — the dead water at 12:00: 900 m of descent at 45 m/s, twenty seconds at 72. */
const DEAD_WATER_DEPTH_M = 2100;

/**
 * §6 — the eight seats across the sill, x 1,350 to 2,650.
 *
 * "186 m spacing" is eight hulls across 1,300 m: 1300 / 7 = 185.71, rounded to
 * the metre. `cohort-1` at 1350, 2700 is the seat §7 measures the rise from —
 * 906 m from the western post, against 899 m of contact through the pair's
 * 0.813. (§7 prints 894, having rounded the Chorister's silent figure to 4.3;
 * the band's own arithmetic gives 4.333, exactly as §7's own corvette row uses
 * 2.133 rather than 2.1. §7 also describes the pair as "two cells of sill and
 * two of kelp", which would be a mean of 1.075: `pathPropagation` samples four
 * cells on that 906 m line and finds *one* of sill and three of kelp, whose
 * mean is the 0.813 §7's own PF column prints. The number is right and the
 * description is not, so this file follows the number and
 * `missionInWriting.test.ts` re-derives it from the grid.)
 */
const LINE_SEATS = [1350, 1536, 1721, 1907, 2093, 2279, 2464, 2650].map((x, i) => ({
  tag: `cohort-${i + 1}`,
  x,
}));

/**
 * §11 — the creatures are *Deep Furrow*'s, in *Deep Furrow*'s places, and each
 * one is at its species' own working depth: the Hollows' 1,700 on the walls,
 * the jellies' 1,200 in the duct, the pack's 900 in the lanes. Read off the
 * roster rather than retyped, because a placed creature holds `workingDepthM`
 * whatever a beat spawns it at unless a live commitment says otherwise — so a
 * literal that disagreed with the roster would be silently overruled by it.
 */
const HOLLOW_DEPTH_M = faunaStatsFor(FaunaSpecies.Hollow).workingDepthM;
const JELLY_DEPTH_M = faunaStatsFor(FaunaSpecies.Tetherjelly).workingDepthM;
const PACK_DEPTH_M = faunaStatsFor(FaunaSpecies.Draymaw).workingDepthM;

/**
 * A creature placed and not driven (§11, and `intake.ts`' row).
 *
 * The `creature` beat's `driveTo` is required, so an animal that must not be
 * driven is committed to its own spawn until tick zero: the first pass finds
 * the commitment already expired, hands the creature its ears back, and leaves
 * it to the trigger model. `loud: false`, because nothing about the water
 * *Deep Furrow* left behind is a precursor to anything.
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

/**
 * One leg of the line's walk — eight `move` beats at one tick, each hull
 * holding its own x and taking the leg's y.
 *
 * Authored transits rather than AI, for the standing reason
 * (docs/mission-sorrowgate.md §9): a mission's beats happen at the time the
 * document says they happen. `depthM` is carried only on the 02:00 rise, which
 * is the one leg §9 gives a depth: every later leg is a hull already standing
 * at 2,150 m, and a depth order that names the depth a hull is at is an order
 * that says nothing. It would also be the one order on this map worth being
 * careful with — `match.ts`' `applyDepth` clears Silent Running for an order
 * *deeper* than the hull, so a descent is the one thing here that can make a
 * silent hull loud, and the rise at 02:00 is deliberately the other direction.
 */
const leg = (atTick: number, y: number, note: string, depthM?: number): MissionBeat[] =>
  LINE_SEATS.map(({ tag, x }, i) =>
    depthM === undefined
      ? { atTick, kind: 'move', tag, x, y, note: i === 0 ? note : '' }
      : { atTick, kind: 'move', tag, x, y, depthM, note: i === 0 ? note : '' }
  );

/** §9 — `silent` on the eight seats of the line, on or off, at one tick. */
const lineSilent = (atTick: number, active: boolean, note: string): MissionBeat[] =>
  LINE_SEATS.map(({ tag }, i) => ({
    atTick,
    kind: 'silent',
    tag,
    active,
    note: i === 0 ? note : '',
  }));

/** §3 — the eight hulls the furrow's people are aboard, authored silent at 00:00. */
const PLAYER_TAGS = [
  'tender-1',
  'tender-2',
  'tender-3',
  'watch-1',
  'watch-2',
  'escort-1',
  'escort-2',
  'escort-3',
];

export const SEEDING_IN_WRITING: MissionDefinition = {
  ...SEEDING_IN_WRITING_HEADER,
  doc: 'docs/mission-in-writing.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Pelagia,
  courtSlot: COURT,
  /** §6, §11 — every creature on this map is authored, and all six are *Deep Furrow*'s. */
  fauna: false,
  /**
   * §8 — the tide turns at 16:00 whatever the register stands at. The court's
   * rule would close the mission the moment three tenders reached the Foot,
   * and read Juno's three as alive and struck at 13:45 while they were still
   * under a bed with a line walking toward it. The close is the tide.
   */
  runsItsLength: true,
  /**
   * §4, §9 — 8, `SILENT_RUNNING.SIG_MAX`: the loudest a hull running silent
   * can be. A description of the posture rather than a ceiling — a silent
   * tender is 4.5, a silent corvette 5.3, a silent scout 3.5, and every hull
   * is authored under it at 00:00.
   */
  sigBudget: SILENT_RUNNING.SIG_MAX,
  // §9 — no silence order. No arrayTag, so the ledger does not run: the
  // plateau lends nothing and keeps no debt, and what the player does with
  // the toggle is the mission's whole account of them rather than a rule
  // anybody enforces.
  silenceCeilingSig: 100,
  debtCapS: 0,
  /** §9 — zero: the hold is *Thin Water*'s, and here nobody waits for a gun. */
  escortRadiusM: 0,

  /**
   * §11 — a mission restates only the places a predicate, a lift or a beat
   * addresses. The garden and the throat are prose here and not regions,
   * because no row, marker or beat names them.
   *
   * No `pressureBonus` on either rectangle (§13): every player hull is seated
   * at 1,790 m, where a PR-2 hull owns the water, and a grant here would be
   * bought and never spent.
   */
  regions: [
    {
      id: 'the-foot',
      x: 1500,
      y: 0,
      widthM: 1000,
      heightM: 500,
      note: "The Foot — the drop's foot at 900 m, above the layer. Home, and the first water the plateau can hear again. Both terminal rows count hulls standing here",
    },
    {
      id: 'second-furrow',
      x: 2250,
      y: 1750,
      widthM: 500,
      heightM: 750,
      note: 'Second Furrow — bare rock in the map literal, sown three tides ago and repainted Kelp Forest by this mission’s 00:00 ground beat. A restatement, not a spend (§11)',
    },
  ],

  /**
   * One marker, named by both terminal rows and revealed with them at 00:00.
   * Nothing points at a bed, at the dome or at the line: the player is shown
   * where home is, and finds the rest by listening.
   */
  markers: [
    {
      id: 'the-foot',
      label: 'The Foot. Over the layer, and the first water they cannot hear us in.',
      x: 2000,
      y: 250,
      radiusM: 500,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Pelagia,
      note: "The furrow's people: three tenders with sixteen aboard, the programme's two deep-rated scouts, Warden Juno Teel's three corvettes struck, and the three beds grown over them (§2, §3)",
      units: [
        /**
         * §3 — the count. Souls 5, 7 and 4: sixteen, by household, the same
         * sixteen that stayed at 2,200 m three tides ago
         * (docs/mission-deep-furrow.md §3). They came up off the garden floor
         * to the top of the furrow's water when the site was heard, because a
         * hull that may have to leave should not start its climb from 2,200 m.
         *
         * The roster's Harvester, at the roster's figures — 18 idle, 40 at
         * cruise, 4.5 running silent — which is the gap §13 records against
         * *Tend*'s and *Convocation*'s "8 idle, 18 under way". Every figure in
         * §7 is priced at the roster's, so the table is what the engine
         * resolves; which side moves is docs/units.md's call.
         *
         * PR-2 is the roster's, no refit: 1,790 m needs PR-2 and nothing on
         * this map crushes them anywhere they are asked to go.
         */
        {
          tag: 'tender-1',
          kind: UnitKind.Harvester,
          x: 1400,
          y: 2100,
          depthM: SEAT_DEPTH_M,
          role: 'tender',
          souls: 5,
          note: 'Under the west bed — 103 m off its centre, and the first bed to go (§9)',
        },
        {
          tag: 'tender-2',
          kind: UnitKind.Harvester,
          x: 2000,
          y: 2300,
          depthM: SEAT_DEPTH_M,
          role: 'tender',
          souls: 7,
          note: 'Under the middle bed, the one the dome has at Track by its own hum',
        },
        {
          tag: 'tender-3',
          kind: UnitKind.Harvester,
          x: 2700,
          y: 2150,
          depthM: SEAT_DEPTH_M,
          role: 'tender',
          souls: 4,
          note: 'Under the east bed — the last cloud on the clock, and the one the window is measured from',
        },
        /**
         * §3 — the watch: the two prototype scouts refit in 204 PC for the
         * proof, the pair *Prospect* seats on the rim. HYD 70 is the best
         * mobile ears the plateau owns, and `pressureRating: 3` is the refit —
         * a mission fact and never a roster fact, exactly as *Sorrowgate*'s
         * re-rated four are.
         *
         * Seated under the middle bed with the households, where they hear at
         * 5 like everything else in a cloud. The corners are where they get
         * their ears back (§11), and that is the mission's one real trade.
         */
        {
          tag: 'watch-1',
          kind: UnitKind.LightScout,
          x: 1850,
          y: 2300,
          depthM: SEAT_DEPTH_M,
          role: 'watch',
          pressureRating: 3,
          souls: 2,
          note: 'In no objective, and the mission is unplayable without it: the only hull on the map that can leave a cloud and still be a hull nobody hears',
        },
        {
          tag: 'watch-2',
          kind: UnitKind.LightScout,
          x: 2150,
          y: 2300,
          depthM: SEAT_DEPTH_M,
          role: 'watch',
          pressureRating: 3,
          souls: 2,
          note: '',
        },
        /**
         * §3 — Teel's element, under the eastern bed with the families.
         * Present because Juno brought them down when the dome was heard and
         * nobody voted; struck because nothing is struck under a bed, and she
         * has never struck first.
         *
         * Not `armed`, and the six locks below are the player's half of the
         * same sentence: the guns are struck by the player's own side, which
         * has not happened before in this campaign. The loudest hulls in the
         * garden by a factor of six if they forget to be silent — 28 × 0.4 is
         * a Classification to the doorway at 1,125 m and to the dome at 625.
         */
        {
          tag: 'escort-1',
          kind: UnitKind.Corvette,
          x: 2600,
          y: 2000,
          depthM: SEAT_DEPTH_M,
          role: 'escort',
          souls: 4,
          note: 'Struck — nothing is struck under a bed, and Juno has never struck first',
        },
        {
          tag: 'escort-2',
          kind: UnitKind.Corvette,
          x: 2650,
          y: 2100,
          depthM: SEAT_DEPTH_M,
          role: 'escort',
          souls: 4,
          note: '',
        },
        {
          tag: 'escort-3',
          kind: UnitKind.Corvette,
          x: 2600,
          y: 2250,
          depthM: SEAT_DEPTH_M,
          role: 'escort',
          souls: 4,
          note: 'Twelve souls ride these three and not one of them is in the sixteen §8 counts, and §8 gives them a row anyway: they are ours to move, not to spend',
        },
      ],
      /**
       * §3, §13 — the beds. The Spore Veil has been a row of `STRUCTURE_AURAS`
       * since the auras were built and has never been placed on any party;
       * these are the first three in the water.
       *
       * Grown over two furrows in the tides since the last mission, which is
       * why they are `MissionStructure` rows and not a build order: a
       * player-built Veil sits at `CONSTRUCTION.WORKING_DEPTH_M`, 600 m,
       * wherever the floor is (docs/mission-standing-wave.md §13), and a bed
       * at 600 m over a garden at 2,200 would cover nothing.
       *
       * 500 m apart on the x, radius 350 each, so the clouds overlap into one
       * band across the furrows' 1,500 m — and each of the eight hulls above
       * is inside 350 m of its own bed's centre, measured horizontally,
       * because `auras.ts` tests `Math.hypot` on x and y and never on depth.
       */
      structures: [
        {
          tag: 'bed-west',
          kind: StructureKind.SporeVeil,
          x: 1500,
          y: 2125,
          depthM: SEAT_DEPTH_M,
          note: '625 m from the dome, which has it at Classification by its own veiled 8. Lost at 09:00',
        },
        {
          tag: 'bed-mid',
          kind: StructureKind.SporeVeil,
          x: 2000,
          y: 2200,
          depthM: SEAT_DEPTH_M,
          note: '450 m from the dome, which has it at Track — the loudest thing the player owns, and it is a hiding place. Lost at 12:00',
        },
        {
          tag: 'bed-east',
          kind: StructureKind.SporeVeil,
          x: 2500,
          y: 2125,
          depthM: SEAT_DEPTH_M,
          note: 'The last cloud, and the one the window is measured against. Lost at 15:00, sixty seconds before the tide',
        },
      ],
    },

    {
      slot: COHORT,
      faction: Faction.Directorate,
      note: 'The Second Trench Cohort — the letter of 205 arriving as hulls. It speaks through a Band-Speaker and no person is named, because a cohort is named for its band (§5)',
      units: [
        /**
         * §6 — the doorway, held at the layer and not on the floor. §13 states
         * the design call: ascent is silent and the cloud is horizontal, so a
         * gun seated at 1,750 m would let a tender climb in place to 500 m in
         * eighty-six seconds and cross the throat across the layer at 0.3,
         * neither shot nor entered. Seated in the duct the same hull hears both
         * halves of the water at 1.0 and the duct itself at 1.2, and every
         * crossing of the throat at any depth is Track to it.
         *
         * Armed, and the only armed hulls on the map. Two 650 m spheres cannot
         * close a doorway 1,500 m wide and 1,650 m tall, and §6 does not claim
         * they do: what they close is being unheard.
         */
        {
          tag: 'throat-west',
          kind: UnitKind.AbyssalSubmersible,
          x: 1500,
          y: 1000,
          depthM: DUCT_DEPTH_M,
          armed: true,
          note: 'HYD 85, and 95 under the dome. 838 m off the watch’s western post, which is what makes the doorway audible from the garden’s corner',
        },
        {
          tag: 'throat-east',
          kind: UnitKind.AbyssalSubmersible,
          x: 2500,
          y: 1000,
          depthM: DUCT_DEPTH_M,
          armed: true,
          note: 'The other half of the door. From 12:00 to 15:00 it stands on the riser’s own line at 2000, 2000 and is clear of it by depth alone',
        },
        /**
         * §6 — the line: eight Choristers, seated silent in the sill, walking
         * the garden from 03:00 on the legs of §9.
         *
         * **Weapons-cold, and the reason is a finding rather than mercy.**
         * `combat.ts` auto-acquires the nearest live enemy inside weapon range
         * in three dimensions, heard or not, and a structure is a live enemy.
         * A Chorister standing inside a cloud 90 m from its centre has the bed
         * 270 m inside its 450 m reach at the 360 m depth difference, and an
         * armed line would have had every bed on this map down on its first
         * stationary pass at about 05:04, at 13.3 hull a second per gun against
         * 900. The beds' schedule would belong to the guns, and the veil would
         * be no cover from the one thing it is fielded against.
         *
         * `pressureRating: 3` on a PR-2 hull (§13): the Chorister is PR-2 on
         * the roster and PR-3 in Directorate hands by `effectivePressureRating`,
         * and the seat test reads the hull rather than the faction. Eight hulls
         * seated at 2,400 m therefore restate the faction's baseline here, so
         * the test does not report them dead of crush where they stand.
         */
        ...LINE_SEATS.map(({ tag, x }, i) => ({
          tag,
          kind: UnitKind.Chorister,
          x,
          y: 2700,
          depthM: SILL_DEPTH_M,
          pressureRating: 3,
          note:
            i === 0
              ? 'The western end of the line, 906 m from the watch’s western post — which is the seat §7 prices the 02:00 rise against'
              : '',
        })),
      ],
      /**
       * §6 — the dome, at the first furrow's north edge. It stands, and that is
       * the whole of what it does.
       *
       * Its 1,200 m radius covers y 550–2,950: the throat, both furrows and the
       * sill's head, so the line's 75 and the Submersibles' 85 are lifted to
       * the 95 cap wherever they are asked to go. Its own ears stay at 80 —
       * `aurasSystem` grants units and structures keep their spawned rating —
       * and it is 450 m from the middle bed and 625 from the other two, which
       * is outside every cloud.
       */
      structures: [
        {
          tag: 'the-dome',
          kind: StructureKind.Cantor,
          x: 2000,
          y: 1750,
          depthM: DOME_DEPTH_M,
          note: 'Heard from every metre of the garden a hull is not veiled in: 35 through kelp is Tier 1 to the watch from 2,597 m and to a tender from 1,529, and nothing past 499 inside a cloud',
        },
      ],
    },
  ],

  /**
   * §3 — what the force does not carry, as dead affordances with the reason in
   * register (docs/ui-ux.md §7). Six locks, and this is the first mission in
   * the campaign where the reason is the player's own side.
   *
   * `activeSonar` is deliberately not in the list. It is available, it is a
   * button with exactly one use, and the one thing it does is tell the dome
   * which bed the pinger is under: 95 × 0.4 = 38 through kelp is Bearing to
   * the dome-lent 95 out to 2,568 m, from every bed to every ear on the map.
   */
  locks: [
    { ability: 'weapons', reason: 'struck — nothing is struck under a bed' },
    { ability: 'torpedoes', reason: 'struck' },
    { ability: 'mines', reason: 'struck' },
    { ability: 'depthCharges', reason: 'struck' },
    { ability: 'noisemakers', reason: 'struck' },
    {
      ability: 'construction',
      reason: 'nothing is built under a dome — a site broadcasts at seventy for its whole build',
    },
  ],

  /**
   * §8's four rows, in §12's order. The two terminal rows are extracts into the
   * Foot revealed at 00:00, which the judge's rule permits because nobody is in
   * the Foot at tick zero; the other two are read out and never ranked.
   *
   * The count is hulls and the reading is people. No `loaded` flag, no
   * `deliver` row, and the watch is in no objective — the furrow is in none
   * either, and cannot be: no predicate asks where another party stands.
   */
  objectives: [
    {
      id: 'the-people',
      text: "Sixteen are under the beds. We'd like sixteen over the layer, and we're saying it the way we said six at Kell: so nobody down there has to say it first.",
      initial: ObjectiveStatus.Pending,
      // Terminal and deliberately not a keystone: §8's ladder is a count of
      // how many terminal rows were met, and a run that brought one tender up
      // is a rung rather than a write-down.
      terminal: true,
      markerId: 'the-foot',
      predicate: { kind: 'extract', role: 'tender', region: 'the-foot', count: 3 },
      reading: {
        met: 'Three over the layer. Sixteen, by household.',
        unmet:
          'Fewer than three over the layer. The rest are in the cohort’s water, and the Directorate has never yet rounded anybody up.',
      },
    },
    {
      id: 'the-crossing',
      text: 'One of ours over the layer is a plateau that still has people in it.',
      initial: ObjectiveStatus.Pending,
      // The middle rung, in *Thin Water*'s and *Sorrowgate*'s arrangement: the
      // ladder reads how many terminal rows were met, so a three-row Results
      // table needs two, and the ask is still three. No reading of its own —
      // §8 gives it none, because what it says is said by the row above it.
      terminal: true,
      markerId: 'the-foot',
      predicate: { kind: 'extract', role: 'tender', region: 'the-foot', count: 1 },
    },
    {
      id: 'the-letter',
      text: "What they hear of us they'll enter, and this time they came to enter it in person.",
      initial: ObjectiveStatus.Pending,
      // Non-terminal, and the one row in this union where meeting a predicate
      // is not good news: thirty seconds cumulative of the force at
      // Classification or better in anybody else's ears — the dome's own 80,
      // the line's 95, the doorway's 95, all of which are resolved for
      // scripted parties and their structures.
      predicate: {
        kind: 'tolerance',
        ticks: 30 * SIM.TICK_HZ,
        tier: ResolutionTier.Classification,
      },
      reading: {
        met: 'They had us at a name for half a minute. The letter has a hull in it now.',
        unmet:
          'They walked two gardens and named nobody. The letter is still a letter, and there is still nobody in it.',
      },
    },
    {
      id: 'the-escorts',
      text: "Juno's people are under the east bed with their guns struck. They're ours to move, not to spend, and we've never had to say that before.",
      initial: ObjectiveStatus.Pending,
      // Standing (`predicates.ts`, `isStanding`), so it is re-derived every
      // tick and read at the close rather than latched on the first pass. The
      // met reading cannot say *came home*: `survive` counts hulls alive
      // wherever they are, and a corvette alive under the last bed at 16:00 is
      // not home.
      predicate: { kind: 'survive', role: 'escort', count: 3 },
      reading: {
        met: 'Three struck guns are still three, and still struck. We’d like that heard as what it cost and not as what it saved.',
        unmet:
          'We lost a hull with a gun on it to a sweep it never fired at, under a bed at seventeen hundred and ninety metres, and Juno was there, and she didn’t strike first.',
      },
    },
  ],

  /**
   * §9's beat table, in its order. Sixteen minutes: three beds at three-minute
   * intervals from 09:00, a window of three minutes, and one minute for the
   * tide to turn on whatever stands.
   *
   * Not a conclusion. The close is a real absence — no tender in the Foot at
   * 16:00 — so campaign.md §10's telegraph is paid out of the riser: SIG 100
   * up the cleft's centre from 14:30 against a resolve at 16:00, ninety
   * seconds against sixty.
   */
  beats: [
    // 00:00 — the sown furrow restated as *Deep Furrow* left it. Not a third
    // biome spend: this water was turned once, three tides ago, whatever tick
    // the literal turns it on (§11). It is also the beat that makes §4's
    // arithmetic true — before it the dome-to-eastern-bed pair is priced at
    // 1.25 through the trench paint, and after it at the garden's own 0.55.
    {
      atTick: 0,
      kind: 'ground',
      region: 'second-furrow',
      biome: Biome.KelpForest,
      note: 'Kelp over the second furrow: seeded ground absorbs, and this ground was seeded three tides ago',
    },
    // 00:00 — the households lie up silent. Every hull the player owns is
    // authored silent, silence stops no work because there is none, and it
    // costs the Commune the difference between 40 m/s and 32 (§3).
    ...PLAYER_TAGS.map((tag, i): MissionBeat => ({
      atTick: 0,
      kind: 'silent',
      tag,
      active: true,
      note:
        i === 0
          ? 'The posture the mission is about, handed over already on rather than asked for'
          : '',
    })),
    // 00:00 — the line is seated silent in the sill and stays silent through
    // its rise. `applySilent` acts on the tag's own slot whoever owns it.
    ...lineSilent(
      0,
      true,
      'Seated silent at the band’s own 4.333, which is 899 m of contact against a post 906 m away — §7 rounds the hull to 4.3 and prints 894'
    ),
    // 00:00 — the Drift, placed and not driven: *Deep Furrow*'s water, in
    // *Deep Furrow*'s places (§6). A Hollow strikes a silent tender inside
    // 107 m and coils from 141, so a hull down the cleft's middle — 650 m from
    // either wall — passes nothing, and one hugging a wall passes both.
    placed(
      'hollow-west',
      FaunaSpecies.Hollow,
      1350,
      1000,
      HOLLOW_DEPTH_M,
      'The west wall’s ambusher, 1,700 m over a cleft floor of 1,800. Not a fence: 100 m off the wall is inside its strike'
    ),
    placed('hollow-east', FaunaSpecies.Hollow, 2650, 1000, HOLLOW_DEPTH_M, 'The east wall’s'),
    placed(
      'jelly-west',
      FaunaSpecies.Tetherjelly,
      1500,
      900,
      JELLY_DEPTH_M,
      'The farmed clusters in the duct: −0.10 PF within 250 m each, which is the only subtraction on the road out'
    ),
    placed('jelly-mid', FaunaSpecies.Tetherjelly, 2000, 700, JELLY_DEPTH_M, ''),
    placed('jelly-east', FaunaSpecies.Tetherjelly, 2500, 900, JELLY_DEPTH_M, ''),
    placed(
      'lanes-pack',
      FaunaSpecies.Draymaw,
      500,
      250,
      PACK_DEPTH_M,
      'The pack in the lanes, at 26 through open water: a scout hears it from 3,134 m all mission. The sound of home water, which cannot climb and will not come'
    ),
    {
      atTick: 0,
      kind: 'say',
      speaker: 'The watch, under the middle bed',
      text: "There's a dome in the garden. Thirty-five, steady, since the tide before last, and it listens at the furrow the way the galleries listen at the Mouth — we've heard that said about the galleries and we're saying it about us. We can't hear it from under here. Out at the corners we can. Juno's guns are under the east bed and they're struck, and we'd like that heard once.",
      note: 'A fact and a guess, with which is which marked — the register’s whole method (§12)',
    },

    // 02:00 — the line rises 250 m and comes 250 m north, silent. Seventeen
    // seconds at DEPTH.ASCENT_RATE_MPS, and the watch hears the rise as it
    // arrives rather than as it starts: 4.3 through the pair's own 0.813 is
    // contact at 899 m against a seat 906 m away (§7 prints 894 off a
    // rounded 4.3; the band gives 4.333).
    ...leg(
      T(2),
      2450,
      'The rise: silent, 250 m up and 250 m north, into the garden’s southern edge',
      LINE_DEPTH_M
    ),
    {
      atTick: T(2),
      kind: 'say',
      speaker: 'The Band-Speaker, Second Trench Cohort',
      voice: 'cohorts',
      text: 'What was stated in the year 205 was stated in writing because the plateaus keep none. It is stated again now, in the band, and it is attended rather than entered. Three beds have been grown over an attended furrow. They are corrected as a mooring was corrected in closed water. The doorway is held; what stands into it is engaged. Nothing pursues.',
      note: 'The law, stated once. A threat with no threatening word in it, and nobody in the cohort decides anything after this',
    },

    // 03:00 — silence off, and the sweep begins. 24 at cruise is Tier 1 from
    // 2,052 m to a scout outside a cloud and 222 m to anything inside one,
    // which is the same 9.6 the cloud makes of the line itself.
    ...lineSilent(
      T(3),
      false,
      'The line drops silence and walks. The Choristers announce themselves by walking'
    ),
    ...leg(T(3), 2350, 'North across the garden’s southern furrows'),

    // 04:00 — Teel, one sentence, to the young ones and not to the player.
    {
      atTick: T(4),
      kind: 'say',
      speaker: 'Warden Juno Teel, under the eastern bed',
      text: "I brought the guns down and I'm not using them. Those are two things I decided, not one, and I'd like the young ones to hear there were two — at Kell there was one, and I've had seventeen years to want the other.",
      note: 'The imperative mood not arriving: she says what she decided and not what anyone else should',
    },

    // 04:30 — the line stands on the beds' row, inside the clouds, hearing at
    // 5. A silent tender's 1.8 does not reach Contact at any range from there;
    // an idle one is Contact inside 186 m and Bearing inside 144.
    ...leg(
      T(4, 30),
      2150,
      'Onto the beds’ row, and deaf on it. The veil is symmetric, and this is the tick that teaches it'
    ),

    // 06:00 — north of the beds, at the dome's foot.
    ...leg(T(6), 1900, 'Past the beds to the dome’s foot, where its ears are its own'),
    {
      atTick: T(6),
      kind: 'say',
      speaker: 'The Band-Speaker, from the doorway',
      voice: 'cohorts',
      text: 'The doorway is held at the layer. What passes it is counted, on whichever side of the layer it passes.',
      note: 'Not a claim that the door is closed. §6 is careful that it is not',
    },

    // 07:30 — the line turns south and stands on the row again.
    ...leg(
      T(7, 30),
      2100,
      'South again, onto the row. The second pass, and the beds are still three'
    ),

    // 09:00 — the west bed is corrected. A structure lost lays a mark at 18
    // for three minutes and the cloud on the chart is simply gone; what was
    // under it is at its own figure — a silent tender at 4.5 is Bearing to 95
    // at 677 m and Classification at 492.
    {
      atTick: T(9),
      kind: 'lose',
      tag: 'bed-west',
      note: 'Corrected as a mooring was corrected in closed water. The beds die on the clock and never to a gun',
    },
    ...leg(T(9), 2350, 'Two hundred metres off the bed it has just walked past'),
    {
      atTick: T(9),
      kind: 'say',
      speaker: 'The watch',
      text: "The west bed's gone. You'll have heard it go and you'll have heard where. Everything that was under it is at its own figure now, and the line's two hundred metres off it.",
      note: '',
    },

    // 10:30 — the line at the garden's south edge, and the furthest it gets
    // from the beds' row all mission.
    ...leg(T(10, 30), 2450, 'The southern edge. The last leg before the door opens'),

    // 12:00 — the middle bed is corrected, and the doorway empties into the
    // dead water: 900 m of descent at 45 m/s, twenty seconds at a SIG floor of
    // 72, which every hull in the cleft hears — 3,868 m to the deafest hull the
    // player owns. **The window opens.**
    {
      atTick: T(12),
      kind: 'lose',
      tag: 'bed-mid',
      note: 'The second cloud. Two beds down, one standing, and the throat empties on the same tick',
    },
    {
      atTick: T(12),
      kind: 'move',
      tag: 'throat-west',
      x: 1500,
      y: 2000,
      depthM: DEAD_WATER_DEPTH_M,
      note: 'Into the garden’s dead water under the west bed’s ashes. A gun at 2,100 m reaches 571 m across a row at 1,790',
    },
    {
      atTick: T(12),
      kind: 'move',
      tag: 'throat-east',
      x: 2000,
      y: 2000,
      depthM: DEAD_WATER_DEPTH_M,
      note: 'Under the middle bed’s. Between them that is every metre of the furrows west of x ≈ 2,557 — and the door is open behind them',
    },

    // 12:30 — the watch reads the door, and marks the guess as a guess.
    {
      atTick: T(12, 30),
      kind: 'say',
      speaker: 'The watch',
      text: "The throat's empty. They went down loud and they went down into the garden, so they're not at the door and they are here. Three minutes, we'd guess, and we're guessing. Down the middle, not the walls — the walls have what they've always had.",
      note: 'The one piece of tactical advice in the mission, and it is hedged in the sentence that gives it',
    },

    // 13:30 — the line stands on the row a third time: on the two dead beds at
    // its own 95, and inside the east one at 5.
    ...leg(T(13, 30), 2200, 'The third pass. Two thirds of the row is its own water now'),

    // 14:30 — the riser. SIG 100 up the cleft's centre, ignoring every hull the
    // plateaus own — transit grinds hulls of 95 m and up, and the largest thing
    // here is an 80 m corvette — and clearing both Submersibles: `throat-east`
    // stands on its line until 15:00 and is 260 m above it as it passes.
    //
    // Spawned at the garden's depth rather than the sill floor's because a
    // driven creature climbs at 12 m/s from wherever it was placed: one placed
    // at 2,450 m would pass the dome at 1,990 m, inside a transit reach of
    // 117.5 m and inside it for 7.8 s against a kill that takes 5.5. Placed at
    // 2,200 m it is at 1,750 by y 1,775 and clears the dome by 250 (§6, §13).
    //
    // The loud beat the close's telegraph is measured from.
    {
      atTick: T(14, 30),
      kind: 'creature',
      tag: 'the-sill-riser',
      species: FaunaSpecies.Sounder,
      spawnAt: { x: 2000, y: 2900, depthM: 2200 },
      driveTo: { x: 2000, y: 900, depthM: 1750 },
      untilTick: T(16),
      loud: true,
      note: 'The deep answering a cohort’s noise the way it answers everyone’s. The whole map to the watch, both sides of the layer, for ninety seconds',
    },

    // 15:00 — the last bed is corrected and the guns climb back to the duct
    // over sixty seconds. The doorway closes from the floor up, and a hull
    // that left at 14:00 meets them climbing at 15:17.
    {
      atTick: T(15),
      kind: 'lose',
      tag: 'bed-east',
      note: 'The last cloud. Everything still under it at 15:00 is in the cohort’s water at 16:00',
    },
    {
      atTick: T(15),
      kind: 'move',
      tag: 'throat-west',
      x: 1500,
      y: 1000,
      depthM: DUCT_DEPTH_M,
      note: 'A silent climb of sixty seconds, and 500 m off the riser’s line the whole way',
    },
    {
      atTick: T(15),
      kind: 'move',
      tag: 'throat-east',
      x: 2500,
      y: 1000,
      depthM: DUCT_DEPTH_M,
      note: 'Off the riser’s line at the same tick it stops being clear of it by depth',
    },
    {
      atTick: T(15),
      kind: 'say',
      speaker: 'The Band-Speaker',
      voice: 'cohorts',
      text: 'The furrow is attended. What is in it is counted.',
      note: 'The sentence of 205, delivered as a completed procedure',
    },

    // 16:00 — the tide turns. Marr reads the count when the watch brings it up
    // the lanes (that is the epilogue and the objective readings beneath it),
    // then says one sentence she should not say aloud and does; then Anholt
    // speaks once, on the lane, and it is the sentence *Radicals* is built on.
    {
      atTick: T(16),
      kind: 'say',
      speaker: 'Tidespeaker Ysolde Marr',
      text: "We keep nothing, and keeping nothing has been the whole of our protection for two hundred years. Theirs has been on Sefa's shelf for nine of them. Tonight I'd like there to be one sentence of ours somebody could read out in nine years.",
      note: 'A woman who spent thirty years on the plateau’s one protection wanting, for one sentence, the other side’s',
    },
    {
      atTick: T(16),
      kind: 'say',
      speaker: 'Bloomwright Sefa Anholt, on the lane',
      text: "I'll ask tonight, and I'm not waiting for every garden.",
      note: 'The register at its limit for the second time: a future imposition flagged in advance, and mission 6’s whole premise',
    },
    {
      atTick: T(16),
      kind: 'resolve',
      note: 'The tide. Whatever is over the layer is the column; whatever is under the dome is in the cohort’s water. Not a conclusion — the telegraph is 14:30 against 16:00, ninety seconds',
    },
  ],

  /**
   * §9's two standing rules, in no order, checked every mission tick. Both are
   * `say`, both fire once, and neither can close the mission.
   *
   * *the-escorts* fires nothing on purpose: `survive` is standing, and the row
   * is read at the close rather than announced when it stops being true.
   */
  conditionalBeats: [
    {
      kind: 'say',
      speaker: 'The Band-Speaker',
      voice: 'cohorts',
      text: 'Entered: a hull, and a count.',
      note: 'Fires on the tick *the-letter* is met — thirty cumulative seconds at Classification, off the force’s own exposure',
      when: { kind: 'tolerance', ticks: 30 * SIM.TICK_HZ, tier: ResolutionTier.Classification },
    },
    {
      kind: 'say',
      speaker: 'The watch',
      text: "One's over the layer. It's the first water they can't hear us in.",
      note: 'Fires on the first tender into the Foot, whenever that is — 00:30 down the middle or 13:15 through the window',
      when: { kind: 'extract', role: 'tender', region: 'the-foot', count: 1 },
    },
  ],

  /**
   * §8's Results, verbatim — Marr's three readings, with the objective readings
   * printing beneath whichever row the run earned, in authored order.
   *
   * The first sentence of the Complete reading states the thing no predicate
   * can: the furrow is the Directorate's at the close whatever the count,
   * because the dome stands and the line stays in every outcome. Rule 4 is not
   * claimed — this is a hiding-and-evacuation with every gun struck, not a lost
   * fight, and the campaign's third unwinnable fight is *Conclave*'s.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      "Sixteen over the layer and the furrow's theirs. We'd like you to hear the order of those two things. The garden's got a cohort standing in it tonight and nobody fired on a berth and nobody fired at all, and by the next tide the letter will say that a seeding was attended and found empty, which is the truest thing anyone's written about us since 205.",
    [MissionOutcome.Partial]:
      "Some of them. The rest are under a dome, with a cohort that says it's counting and means it. We agreed a number at the top of the cleft and it fell to somebody at the bottom, again, and we're sorry it was you, again.",
    [MissionOutcome.Lost]:
      "Nobody came up. The furrow's attended. That's their word and we're using it because we haven't got one.",
  },
};
