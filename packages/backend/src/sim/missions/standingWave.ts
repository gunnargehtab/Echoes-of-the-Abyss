/**
 * The Second Chord 2 — Standing Wave. docs/mission-standing-wave.md, transcribed.
 *
 * A data literal in `aptitude.ts`'s idiom: the document owns the forces, the
 * water, the beats, the numbers and the text. It shipped further ahead of its
 * literal than any document before it — §13 was a design agenda rather than a
 * build list — and this file is what that agenda came to. Four things make the
 * mission the shape it is, and all four are data:
 *
 * - **The corridor is the mission, and two numbers already in the code make
 *   its geometry.** `CONSTRUCTION.BUILD_RADIUS_M` and `STANDING_WAVE.PAIR_RANGE_M`
 *   are the same 1,500 m by decision (#372), so against a Bastion at (2500,
 *   400) and a defile a kilometre wide the buildable band is the northern
 *   thirteen hundred metres of the Fifth, a wall-to-wall line is 900–1,000 m,
 *   and reaching south of the narrows costs a third structure (§11). Nothing
 *   below scripts any of that.
 * - **The economy is a clock the player reads, not a system they operate.**
 *   1,530 nodules and a tithe of one a second against a node at 750: two nodes
 *   are paid for at 00:00 and a third costs twelve and a half minutes (§4).
 *   `startingNodules` carries the first figure, `titheSystem` the second, and
 *   `startingCrystal` is the row §13 said the mission could not be built
 *   without.
 * - **The withdrawal is terminal, and it is standing.** §8 substitutes
 *   `extract` for `survive` on purpose — six hulls alive inside their own
 *   kill-line is the mission being ignored — and the six are seated in the
 *   Gallery, so the row is authored `standing` and read at the close rather
 *   than latched before anybody has left (types.ts, `MissionObjective.standing`).
 * - **Adze decides by a condition and not by the clock.** The column's walk is
 *   one `transit` beat per hull, and the turn is a conditional transit south
 *   that replaces it the moment a corridor stands (§6, §9). A schedule cannot
 *   be cancelled by a condition; a route can be replaced by one.
 *
 * Three findings the transcription made, all recorded in §13 rather than
 * worked around here: the engine has no builder hull, so a site needs the
 * works beside it (`works.hullRadiusM`) or the withdrawal costs nothing; a
 * player-built structure sits at 600 m and this map is all below the
 * thermocline, so the works sit on the floor (`works.onFloor`); and the
 * roster's Cantor is a structure and does not move, so the column's dome is a
 * fifth Abyssal Submersible with the best mobile ears in the game.
 */

import {
  CHORD_STANDING_WAVE_HEADER,
  Faction,
  MissionOutcome,
  ObjectiveStatus,
  SIM,
  StructureKind,
  UnitKind,
} from '@echoes/shared';

import type {
  MissionBeat,
  MissionConditionalBeat,
  MissionDefinition,
  MissionLeg,
  MissionPredicate,
  MissionUnit,
} from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/** Reserved and empty, as every campaign mission reserves it. */
const COURT = 1;
/**
 * The column's slot — a party seated by the mission rather than by the map
 * (§2). A Directorate transit on a route order filed before the works order
 * existed, and it is not a delegation: it has hulls, a route and a position
 * it is right about.
 */
const COLUMN = 2;

/** §11 — the Gallery's floor, where the works are seated; the defile's, where the column walks. */
const GALLERY_DEPTH_M = 1450;
const DEFILE_DEPTH_M = 1700;

/** §11 — the Bastion, every build radius's origin, and the tithe's seat. */
const BASTION_X = 2500;
const BASTION_Y = 400;

/**
 * §11 — the defile's axis, and the three points the column's walk is measured
 * to: the top of the Mouth at 06:00, the narrows at 16:30, and the Gallery at
 * 17:30. The column is seated at the bottom of the Mouth and walks from 00:40.
 */
const AXIS_X = 2500;
const MOUTH_Y = 3900;
const FIFTH_Y = 3500;
const NARROWS_Y = 2300;
const GALLERY_Y = 500;

/**
 * §8 — a site needs the works beside it. The sounding radius of
 * docs/mission-aptitude.md §4, borrowed: the distance at which a Knight hull
 * is doing a thing to the water by hand.
 */
const WORKS_RADIUS_M = 400;

/**
 * "A corridor stands" — two nodes holding an interval (types.ts, `build`).
 * Named once, because three beats and an objective key on the same sentence
 * and the mission must not be able to disagree with itself about what it is.
 */
const CORRIDOR_STANDS: MissionPredicate = {
  kind: 'build',
  structure: StructureKind.SoundingSpire,
  count: 2,
  paired: true,
};

/**
 * One hull of the column — §5's table. Cruisers and Submersibles both at the
 * defile's floor, all armed: the column is competent, and a Knight that fires
 * on it will be fired on. Seven, in a block, in the order §5 lists them.
 *
 * The dome is the seventh, and it is a Submersible: the roster's Cantor is a
 * structure (units.md) and a structure does not move, so the "1,200 m Tier-3
 * listening dome travelling up a canyon" of §5 is transcribed as the hull
 * with the best mobile ears in the game — HYD 85, within five of a Cruiser
 * under the dome. §13 carries the substitution.
 */
const COLUMN_HULLS: readonly {
  tag: string;
  kind: UnitKind;
  dx: number;
  dy: number;
  note: string;
}[] = [
  {
    tag: 'the-cohort-prime',
    kind: UnitKind.Cruiser,
    dx: -60,
    dy: -40,
    note: "Cohort-Prime Adze's hull. Fifty-five idle, sixty-five in transit, and the voice on the cohort's open channel",
  },
  {
    tag: 'the-second',
    kind: UnitKind.Cruiser,
    dx: 60,
    dy: -40,
    note: 'The second Cruiser. The column is numbers before it is anything else',
  },
  {
    tag: 'the-dome',
    kind: UnitKind.AbyssalSubmersible,
    dx: 0,
    dy: -100,
    note: "The column's ears, leading. HYD 85 — the Cantor's stand-in, since a dome does not travel (§13)",
  },
  {
    tag: 'sub-one',
    kind: UnitKind.AbyssalSubmersible,
    dx: -100,
    dy: 20,
    note: 'Four Abyssal Submersibles, crewed by the year and rated for water this map never reaches',
  },
  { tag: 'sub-two', kind: UnitKind.AbyssalSubmersible, dx: -30, dy: 40, note: '' },
  { tag: 'sub-three', kind: UnitKind.AbyssalSubmersible, dx: 30, dy: 40, note: '' },
  { tag: 'sub-four', kind: UnitKind.AbyssalSubmersible, dx: 100, dy: 20, note: '' },
];

/**
 * §6 — the column's walk, as legs and windows.
 *
 * Slow on purpose: a cohort in transit moves at the speed of its slowest
 * doctrine and does not spread out. Four hundred metres of trench water in
 * five minutes twenty (the last time the column is easy to hear), twelve
 * hundred metres of the defile in ten and a half (getting quieter as it gets
 * closer — 1.60 water to 0.70), and then the last leg in step: eighteen
 * hundred metres in one minute, at the narrows, 1,800 m out, which is §8's
 * sixty seconds and the only warning the mission gives. Each hull walks the
 * axis at its own offset, so the block arrives as a block.
 */
function walkNorth(dx: number, dy: number): MissionLeg[] {
  return [
    { x: AXIS_X + dx, y: FIFTH_Y + dy, ticks: T(5, 20) },
    { x: AXIS_X + dx, y: NARROWS_Y + dy, ticks: T(10, 30) },
    { x: AXIS_X + dx, y: GALLERY_Y + dy, ticks: T(1) },
  ];
}

/**
 * §9's 09:00 — the turn. "We turn at the Mouth and file the ground as
 * closed." One leg back to where the column came in, three minutes for it
 * from wherever the corridor caught the column, and the walk north is
 * replaced by this the tick it fires (types.ts, `transit`).
 */
function turnForTheSeam(dx: number, dy: number): MissionLeg[] {
  return [{ x: AXIS_X + dx, y: MOUTH_Y + dy, ticks: T(3) }];
}

/**
 * One hull of the works — §3's two rows, with the roster's own stats and no
 * refit: PR-2 covers every metre of this map. Armed, all six, because §8's
 * only failure is a fight the Order did not arrange and the column is armed
 * too; the doctrine is priced in the objective rather than fenced in the
 * locks.
 */
const hull = (tag: string, kind: UnitKind, x: number, y: number, note: string): MissionUnit => ({
  tag,
  kind,
  x,
  y,
  depthM: GALLERY_DEPTH_M,
  role: 'works',
  armed: true,
  note,
});

/** The column, seated at the bottom of the Mouth at 00:00 and walking from 00:40. */
const columnAt = (
  dx: number,
  dy: number,
  kind: UnitKind,
  tag: string,
  note: string
): MissionUnit => ({
  tag,
  kind,
  x: AXIS_X + dx,
  y: MOUTH_Y + dy,
  depthM: DEFILE_DEPTH_M,
  armed: true,
  note,
});

const walk: MissionBeat[] = COLUMN_HULLS.map((h) => ({
  atTick: T(0, 40),
  kind: 'transit',
  tag: h.tag,
  legs: walkNorth(h.dx, h.dy),
  note:
    h.tag === 'the-dome'
      ? '§9, 00:40 — the column crosses the South Mouth: trench water, PF 1.60, and the last time it is easy to hear'
      : '',
}));

const turn: MissionConditionalBeat[] = COLUMN_HULLS.map((h) => ({
  kind: 'transit',
  tag: h.tag,
  legs: turnForTheSeam(h.dx, h.dy),
  note:
    h.tag === 'the-dome'
      ? '§9, 09:00 — the column turns for the Seam. Decided by the corridor, not the clock'
      : '',
  when: CORRIDOR_STANDS,
}));

export const CHORD_STANDING_WAVE: MissionDefinition = {
  ...CHORD_STANDING_WAVE_HEADER,
  doc: 'docs/mission-standing-wave.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Hadron,
  courtSlot: COURT,
  /** §10 — the Drift is not populated: a megaphone in a canyon would teach fauna by accident. */
  fauna: false,
  /**
   * §4 — seventy, **emitted**: the construction site, sustained for 150 s, the
   * loudest thing the player owns and not throttleable. The second figure §4
   * states — 140, carried, inside the thing the player built — is not an
   * emission and the budget does not report it; §7 is the table.
   */
  sigBudget: 70,
  /**
   * No silence order and no array to lend: §3 leaves Silent Running present
   * and wrong for a new reason — it throttles hulls, and the two loudest
   * things in this mission are a site and a structure, neither of which has a
   * throttle to pull.
   */
  silenceCeilingSig: 100,
  debtCapS: 0,
  /** No held freight: the works move on their own orders. */
  escortRadiusM: 0,
  /** §4 — two nodes and thirty over. The third is the stipend's. */
  startingNodules: 1530,
  /** §3, §13 — three Spires' worth of crystal, since no field on this map cuts any. */
  startingCrystal: 360,
  /**
   * The two findings of §13 that are rules rather than rows — see
   * `MissionWorks`. A site needs a hull within 400 m of it, and the works sit
   * on the floor where they are placed.
   */
  works: { hullRadiusM: WORKS_RADIUS_M, onFloor: true },

  /** §11's four regions, restated as the mission's own. */
  regions: [
    {
      id: 'shoulders',
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 4000,
      note: 'The southern shoulders — crystal country, and off the defile nobody has a reason to be on it',
    },
    {
      id: 'the-fifth',
      x: 2000,
      y: 500,
      widthM: 1000,
      heightM: 3000,
      note: 'The Fifth — the defile, a kilometre wall to wall. Where the line is laid, and the ground the works come back through',
    },
    {
      id: 'north-gallery',
      x: 1750,
      y: 0,
      widthM: 1500,
      heightM: 500,
      note: "The North Gallery — the spawn, the Bastion, and the region §8 extracts to. Above the corridor, in the sentence's sense",
    },
    {
      id: 'south-mouth',
      x: 1750,
      y: 3500,
      widthM: 1500,
      heightM: 500,
      note: "The South Mouth — trench water, PF 1.60 axial. The column's entrance, and where it turns",
    },
  ],

  markers: [
    {
      id: 'the-fifth',
      label: 'The Fifth. Two nodes, either wall, and the interval between them.',
      x: AXIS_X,
      y: 1200,
      radiusM: 900,
    },
    {
      id: 'north-gallery',
      label: 'The North Gallery. North of the line, when it is laid.',
      x: AXIS_X,
      y: 250,
      radiusM: 700,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Hadron,
      note: 'The works — six hulls under Voice Ren Kalliso, a Bastion, and whatever the player builds (§5)',
      // Seated east of the Bastion rather than on its coordinates: a
      // Bastion's footprint is 220 m and `separationSystem` shoves a hull
      // clear of it on the first tick, which would put four of the six in
      // the defile before the works order had been read. Beside it, in the
      // Gallery, at 1,450 m — which is what §11 says.
      units: [
        hull(
          'the-voice',
          UnitKind.Cruiser,
          BASTION_X + 290,
          BASTION_Y - 20,
          "Kalliso's hull and the party's ears — 55 idle / 65 live in the cone, HYD 65, unchanged from mission 1"
        ),
        hull(
          'corvette-one',
          UnitKind.Corvette,
          BASTION_X + 370,
          BASTION_Y - 90,
          'The working hulls — 28 in the cone, 9.8 on the flank, 2.8 in the wake. The same five, and the mission never says so'
        ),
        hull('corvette-two', UnitKind.Corvette, BASTION_X + 370, BASTION_Y + 50, ''),
        hull('corvette-three', UnitKind.Corvette, BASTION_X + 450, BASTION_Y - 110, ''),
        hull('corvette-four', UnitKind.Corvette, BASTION_X + 450, BASTION_Y + 70, ''),
        hull('corvette-five', UnitKind.Corvette, BASTION_X + 530, BASTION_Y - 20, ''),
      ],
      structures: [
        /**
         * §3 — the works order made physical, and the thing the tithe is paid
         * against. Placed in the Gallery at 00:00, never attacked, and not a
         * defence objective: the column has no reason to come here except by
         * arriving, and arriving is the failure. Every build radius on this
         * map is measured from it.
         */
        {
          tag: 'the-bastion',
          kind: StructureKind.Bastion,
          x: BASTION_X,
          y: BASTION_Y,
          depthM: GALLERY_DEPTH_M,
          note: 'The head of the Fifth. SIG 35 sustained, HYD 60, and one nodule a second for as long as it stands',
        },
      ],
    },
    {
      slot: COLUMN,
      faction: Faction.Directorate,
      note: 'The column — a transit under Cohort-Prime Adze, on a route order filed before the works order existed (§5). Not an attack, and the mission never lets it become one',
      units: COLUMN_HULLS.map((h) => columnAt(h.dx, h.dy, h.kind, h.tag, h.note)),
    },
  ],

  /**
   * §3 — what the party does not carry. **Construction is not locked**, and
   * that is the entry that matters: this is the first Knight mission with
   * anything built in it, and `AbilityLock` is a list, so the whole change is
   * a row not written. Weapons are not locked either — §8's only failure is a
   * fight, and a fence would make the doctrine a rule instead of a choice.
   */
  locks: [
    {
      ability: 'activeSonar',
      reason: 'the one emission the Order owns that has no bow — discourteous, and withheld',
    },
  ],

  /**
   * §12's "Objective readings, in play" — the register that states intervals
   * and conditions and never tasks — and §8's two terminal rows and two
   * hanging readings.
   *
   * The interval is the keystone: unmet, the close reads "The Fifth is open"
   * whatever the six did. The withdrawal is standing, so the court's rule
   * closes the mission the moment both are true — "if the works came home
   * first, she read it then" (§9) — and never before the line is laid.
   */
  objectives: [
    {
      id: 'the-interval',
      text: 'The Fifth is open. No voice stands.',
      initial: ObjectiveStatus.Pending,
      markerId: 'the-fifth',
      terminal: true,
      keystone: true,
      predicate: CORRIDOR_STANDS,
      // In the order they win: a held interval going flat is going flat.
      states: [
        {
          when: {
            kind: 'build',
            structure: StructureKind.SoundingSpire,
            count: 1,
            paired: true,
            detuned: true,
          },
          text: 'The interval is sour.',
        },
        { when: CORRIDOR_STANDS, text: 'The interval is held. The Fifth carries at two.' },
        {
          when: { kind: 'build', structure: StructureKind.SoundingSpire, count: 1 },
          text: 'One voice. A voice is not an interval.',
        },
      ],
    },
    {
      id: 'the-withdrawal',
      text: 'Be north of it. All six, in the Gallery, when the interval is held.',
      initial: ObjectiveStatus.Pending,
      markerId: 'north-gallery',
      terminal: true,
      // Read at the close and not latched: the six are seated in the Gallery,
      // and a latched row would be met before anybody had left (§8).
      standing: true,
      predicate: { kind: 'extract', role: 'works', region: 'north-gallery', count: 6 },
    },
    {
      id: 'untouched',
      text: 'Six went. The instrument does not know whose hulls those are.',
      initial: ObjectiveStatus.Pending,
      predicate: { kind: 'survive', role: 'works', count: 6 },
      reading: {
        met: 'Six went and six are back and none of them was struck by anything we own. That is the standard. I am aware it will not be met again.',
        unmet:
          'The instrument does not know whose hulls those were. That is the property we asked it for.',
      },
    },
    {
      id: 'the-third-voice',
      text: 'A third voice is twelve and a half minutes of stipend, and nine hundred metres further south.',
      initial: ObjectiveStatus.Pending,
      predicate: { kind: 'build', structure: StructureKind.SoundingSpire, count: 3 },
      reading: {
        met: 'You waited for the stipend. Twelve minutes of the Order’s income, spent on being nine hundred metres further south than you could otherwise have been. I would like the chapter to notice that this is what our economy is for.',
        unmet: 'Two was the order and two is closed.',
      },
    },
  ],

  /**
   * §9's beat table — the world's clock, not the player's. The siting, the
   * building and the withdrawal are the player's acts; what is scheduled here
   * is the column, the Ninth, and the close.
   *
   * The close is a **reading**, marked as a conclusion for Thin Water's reason
   * and in Thin Water's arrangement: campaign.md §10's sixty seconds are the
   * column's own formation transit at 16:30 (§8), which is a leg of a transit
   * rather than a creature beat, and the generic telegraph test measures
   * creature beats. Nothing here fails on the timer: at 18:00 the corridor
   * stands or it does not, and the column has been audible since 00:40.
   */
  beats: [
    {
      atTick: 0,
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull, from the Ninth',
      text: 'Two nodes, either wall, and the interval between them. Build it, and then be north of it. Both halves.',
      note: '§9, 00:00 — the works order, set from the Ninth. The briefing is public; this is the one line of it repeated in the water',
    },

    ...walk,

    {
      atTick: T(3),
      kind: 'say',
      speaker: 'Cohort-Prime Adze, 9th Trench Cohort',
      text: 'Route is filed. Works are audible at bearing three-five-two, seventy, sustained, which is a commissioning and not a hull. The route does not change on account of a building. It changes on account of what the building is for, and we will know that in four minutes.',
      note: "§9, 03:00 — the column states what it has heard and what it intends, on the cohort's open channel. Nobody is talking to the Knights and the Knights are listening",
    },

    {
      atTick: T(18),
      kind: 'resolve',
      conclusion: true,
      note: '§9, 18:00 — the close. Sull reads the Fifth; if the works came home first, she read it then',
    },
  ],

  /**
   * The standing rules, in no order at all — §12's lines fired by facts rather
   * than by the clock, and §9's one decision.
   *
   * Kalliso's is `build` used for what §13 asked it for and then some: "on the
   * first node completing" is a sentence about the player's own act. Sull's
   * and Adze's key on the corridor standing, and so does the turn — seven
   * transits south that replace the walk north the tick they fire. A corridor
   * that stands at 04:00 turns the column at 04:00; one that stands at 15:00
   * turns it at the narrows; one that never stands never does, and the walk
   * arrives at 17:30 as filed.
   */
  conditionalBeats: [
    {
      kind: 'say',
      speaker: 'Voice Ren Kalliso, once, to nobody in particular',
      text: 'One of them does nothing. Of course it does nothing. Half a chord is not a quieter chord, it is a note, and a note is just a fact about a string.',
      note: '§12 — on the first node completing, alone and silent. The odd node is the teaching beat (§4)',
      when: { kind: 'build', structure: StructureKind.SoundingSpire, count: 1 },
    },
    {
      kind: 'say',
      speaker: 'Choirmaster Ivane Sull, at the pairing',
      text: 'There. That is the Fifth, and that is the last time anybody hears it the way it was. Somebody should write down what it sounded like before. I am aware nobody will.',
      note: '§12 — on the interval closing. Both Spires go to 80 and the PF write lands on the same tick',
      when: CORRIDOR_STANDS,
    },
    {
      kind: 'say',
      speaker: 'Cohort-Prime Adze, reading the corridor',
      text: 'Corridor stands at two. Transit cost through it exceeds the route’s value by a factor I am not going to argue with. We turn at the Mouth and file the ground as closed. Log it as closed by them, not against us — the distinction will matter to somebody who was not here.',
      note: '§12 — the decision. A road that costs more than it saves is not a road; nobody in the column is stupid and nobody in it is cruel',
      when: CORRIDOR_STANDS,
    },
    ...turn,
  ],

  /**
   * §8's Results, verbatim — Sull's reading of the Fifth — with the two
   * hanging readings assembling beneath whichever line the count earned.
   * "Go and be dry" closes every ending but the last, exactly as §12
   * withholds it.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      'It is closed. It is closed against them and it is closed against us, and I am told that the second half of that sentence is the part the chapter will argue about. Let them. An instrument you can only play in one direction is not an instrument, it is a grievance with a mounting bracket. Go and be dry.',
    [MissionOutcome.Partial]:
      'You built it and then you stood in it. I am not going to pretend that is a different mission from the one I set, because it is not — the Fifth is shut. I would only observe that we have four fewer people to be pleased about it with, and that the number of people we have is the only number the Order has ever been short of. Go and be dry.',
    [MissionOutcome.Lost]:
      'Then it is a canyon, and it was always a canyon, and we have spent a stipend finding out that we did not close it. Bring them home. The interval is still there; nobody has taken the interval.',
  },
};
