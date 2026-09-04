/**
 * The Attending 1 — Attendance. docs/mission-attendance.md, transcribed.
 *
 * A data literal in `sorrowgate.ts`'s idiom: the document owns the forces, the
 * water, the beats, the numbers and the text. Where this file and that
 * document disagree, one of them is wrong and the fix says which — and this
 * mission is the first where the answer was the document, in one place, for a
 * reason recorded in §4 and §13 rather than hidden here.
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **Nothing arrives that can be fought.** One party, one seat, no fauna, no
 *   authored creature, no hazard: the first mission in the bible with nothing
 *   alive on the map but the player. The stake is a page (§8).
 * - **The thing being attended is the faintest object in the game.** SIG 3,
 *   twenty seconds, nine times, and it classifies as nothing — the taps'
 *   emitter, given a window. The best ears in the Rift pointed at the one
 *   thing that does not resolve (§4, §6).
 * - **The count is the objective and the count is on the instrument from the
 *   first arrival.** Five of nine is sufficiency and nine is the whole cycle,
 *   authored as a two-rung ladder so §8's three readings fall out of the
 *   terminal count exactly (§8).
 * - **The silence order is the rite's own.** Twenty-five per hull against a
 *   hull that idles at twenty-two and cruises at twenty-eight, so the watch may
 *   listen and may not travel; the debt caps at forty-five seconds; and the
 *   dome is withdrawn while anything is owed, which costs the shift the band's
 *   outer hundred metres and therefore the arrivals standing in it (§5).
 *
 * **The one place the document moved, stated here and in §4 and §13.** §6
 * reasons about reach in *depth* — "850 m of depth against a 955 m band" — and
 * the Echo Layer resolves on horizontal distance alone, with the thermocline
 * as its only depth term. Every depth on this map is below the duct, so the
 * layer is uniform and depth is acoustically free: the arrivals' reach is the
 * distance down the axis, not the drop. The ranges §4 states are exact — 1,230
 * m to contact, 955 to bearing, and about 800 across the galleries' occluded
 * ground — so the transposition keeps every number the document measured and
 * changes only which axis carries them. What it costs is the dive: descending
 * is still the loudest thing this water hears, and it no longer buys hearing.
 * What replaces it is the going: the far two arrivals are two kilometres down
 * the channel, and a hull that goes for them is under way in a gallery of
 * sleeping people, which is the same invoice in the same currency.
 */

import {
  Faction,
  MissionOutcome,
  ObjectiveStatus,
  SIM,
  StructureKind,
  UnitKind,
  ATTENDING_ATTENDANCE_HEADER,
} from '@echoes/shared';

import type { MissionDefinition, MissionEmitter } from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/** Reserved and empty, as the other two campaign missions reserve it. */
const COURT = 1;
/**
 * The return's slot.
 *
 * §3's "no second party in the water at all" is a claim about *forces* — no
 * delegation, no survey, no column, nothing that acts or can be acted on. The
 * return still needs a slot of its own, because the Echo Layer resolves by
 * `Owner.slot` and a hull cannot hear its own side: an arrival seated with the
 * watch would be inaudible to the watch, which is the one thing this mission
 * cannot have. A slot is not a party, and this one holds nine sounds.
 */
const RETURN = 2;

/** §6 — the return carries SIG 3 by the time it reaches the Ninth's head. */
const RETURN_SIG = 3;
/** Twenty seconds, and then it is not there any more. */
const WINDOW = 20 * SIM.TICK_HZ;
/** The axis runs due south from the gallery face at this x. */
const AXIS_X = 2500;

/**
 * One arrival — an emitter with a window, and the two lines the close may
 * enter for it.
 *
 * `y` is the distance down the axis, and it is what decides who hears it: the
 * seated watch holds bearing to about nine hundred metres inside the dome and
 * eight hundred outside it, measured against this map's own path. The depth is
 * the document's, unchanged, and is what the arrival *is* rather than how far
 * away it is — see the header's note on the transposition.
 */
const arrival = (
  ordinal: string,
  atTick: number,
  y: number,
  depthM: number,
  note: string
): MissionEmitter => ({
  tag: `arrival-${ordinal}`,
  x: AXIS_X,
  y,
  depthM,
  sig: RETURN_SIG,
  // On for the whole window: the pattern and the window are the same length,
  // which is what an arrival is — not a rhythm, one passage.
  periodTicks: WINDOW,
  onTicks: WINDOW,
  // It has no hull and nothing can shoot it: weapons are locked and there is
  // no second party. One, because the Echo pass selects on Health.
  hp: 1,
  fromTick: atTick,
  untilTick: atTick + WINDOW,
  reading: {
    entered: `Entered: arrival ${ordinal}, bearing and depth.`,
    gap: `Not entered: arrival ${ordinal}. The gap is recorded.`,
  },
  note,
});

/**
 * The stalls call every approach sixty seconds out, and name a bearing and a
 * depth and nothing else — §12, and the mission's telegraph fired nine times
 * rather than bolted to the close.
 */
const call = (atTick: number, text: string) => ({
  atTick: atTick - T(1),
  kind: 'say' as const,
  speaker: 'The stalls',
  text,
  note: 'Sixty seconds. The watch is not asked to move',
});

export const ATTENDING_ATTENDANCE: MissionDefinition = {
  ...ATTENDING_ATTENDANCE_HEADER,
  doc: 'docs/mission-attendance.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Directorate,
  courtSlot: COURT,
  /** §11 — nothing alive on this map but the player. */
  fauna: false,
  /**
   * §4 — eight, and a description rather than a ceiling: it is the top of the
   * Silent Running band, which is what the watch emits while it is doing its
   * job. A shift that never decides anything sits under it all watch.
   */
  sigBudget: 8,
  /** §5 — the Cantorate's dome, lent to the watch and withdrawn on debt. */
  arrayTag: 'dome',
  /**
   * §5 — twenty-five per hull, chosen against the hull and not the fiction: an
   * Abyssal Submersible idles at twenty-two and cruises at twenty-eight, so
   * the watch may listen and may not travel.
   */
  silenceCeilingSig: 25,
  /** The order binds the watch. The dome is exempt, and idles ten over it. */
  silenceRole: 'shift',
  /** §5 — one dive cannot black out the rest of the watch. */
  debtCapS: 45,
  /** No held freight here: the watch moves on its own orders, and pays for it. */
  escortRadiusM: 0,

  regions: [
    {
      id: 'galleries',
      x: 1250,
      y: 750,
      widthM: 2500,
      heightM: 500,
      note: 'The stalls, open on the axis — where the shift is seated and the dome stands',
    },
    {
      id: 'axis',
      x: 2000,
      y: 1250,
      widthM: 1000,
      heightM: 2750,
      note: "The Ninth's channel, from the galleries' edge to the sill. Every arrival is on this line",
    },
  ],

  markers: [
    {
      id: 'axis',
      label: 'The axis. Everything arrives through the sill.',
      x: AXIS_X,
      y: 2600,
      radiusM: 500,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Directorate,
      note: "The watch of a single attendance shift, and the Cantorate's dome standing over it (§3)",
      units: [
        // Four Abyssal Submersibles, seated at the gallery face. Born to
        // depth: PR-3 is the roster's, no refit, and nothing on this map
        // crushes them at any depth it authors. HYD 85 is the doctrine — the
        // best mobile ears in the game, carried by the number rather than by a
        // special case.
        {
          tag: 'watch-one',
          kind: UnitKind.AbyssalSubmersible,
          x: 2400,
          y: 1000,
          depthM: 3000,
          role: 'shift',
          note: 'Seated at the face, and not required to do anything',
        },
        {
          tag: 'watch-two',
          kind: UnitKind.AbyssalSubmersible,
          x: 2470,
          y: 1000,
          depthM: 3000,
          role: 'shift',
          note: '',
        },
        {
          tag: 'watch-three',
          kind: UnitKind.AbyssalSubmersible,
          x: 2540,
          y: 1000,
          depthM: 3000,
          role: 'shift',
          note: '',
        },
        {
          tag: 'watch-four',
          kind: UnitKind.AbyssalSubmersible,
          x: 2610,
          y: 1000,
          depthM: 3000,
          role: 'shift',
          note: '',
        },
      ],
      structures: [
        // The dome. The prologue's civic array was a Cantor borrowed from this
        // faction's technology; here it belongs to the people who built it, and
        // this is the first mission to call it by its own name (§5). Its +25
        // runs into its own cap of 95 on a hull that already hears at 85 and
        // buys seven per cent of range — the number Korrin has read and nobody
        // says out loud.
        {
          tag: 'dome',
          kind: StructureKind.Cantor,
          x: AXIS_X,
          y: 1000,
          depthM: 3000,
          note: "The Cantorate's instrument, standing at the gallery face",
        },
      ],
    },
    {
      slot: RETURN,
      faction: Faction.Directorate,
      note: 'The return — nine passages up the Ninth. Not a party: a slot, and nine sounds (§6)',
      units: [],
      emitters: [
        arrival('one', T(1, 20), 1700, 2900, 'The head, in the dome. Everyone files it'),
        arrival('two', T(3), 1750, 3050, 'The head, and the player is starting to believe it'),
        arrival(
          'three',
          T(4, 40),
          1900,
          3250,
          "Upper channel — the band's outer edge, where the dome is doing the work and a shift in debt loses it"
        ),
        arrival('four', T(6, 20), 1800, 3550, 'Mid channel. Comfortably inside the seated band'),
        arrival('five', T(8), 1900, 3850, 'Lower channel — marginal, felt rather than read'),
        arrival(
          'six',
          T(9, 40),
          3400,
          4100,
          'The approach. Out of reach of a seated watch: the first of the two the last line costs'
        ),
        arrival('seven', T(11, 20), 1750, 3150, 'Mid channel — the return comes back up'),
        arrival(
          'eight',
          T(13),
          3875,
          4100,
          'The sill. Deepest, furthest, and two minutes before the last'
        ),
        arrival(
          'nine',
          T(15, 40),
          1650,
          2850,
          'The head, nearest the stalls. A watch that went south for the sill has to have come back'
        ),
      ],
    },
  ],

  /**
   * §3 — what the watch does not carry, as dead affordances with the rite's
   * own reasons shown. The weapons lock says *no party in this water*, which
   * is a plainer reason than the court's and a stranger one.
   */
  locks: [
    { ability: 'weapons', reason: 'no party in this water' },
    { ability: 'torpedoes', reason: 'no party in this water' },
    { ability: 'mines', reason: 'nothing is left in the water the cohorts sleep over' },
    { ability: 'depthCharges', reason: 'nothing is left in the water the cohorts sleep over' },
    {
      ability: 'activeSonar',
      reason: 'aboard, live, and not used — the Directorate does not ask',
    },
    { ability: 'construction', reason: 'a shift produces nothing' },
  ],

  /**
   * §12's objective readings, in the register that states conditions rather
   * than issuing tasks. The two rungs are the count ladder §8's Results table
   * is read off: both met is the whole cycle, sufficiency alone is
   * *sufficient*, neither is an absence.
   */
  objectives: [
    {
      id: 'sufficiency',
      text: 'The watch is seated. The stalls are attended. The Undermarshalcy does not round up.',
      initial: ObjectiveStatus.Pending,
      markerId: 'axis',
      terminal: true,
      predicate: { kind: 'attend', count: 5 },
    },
    {
      id: 'cycle',
      text: 'What is heard is entered. What is not heard is entered as a gap.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      predicate: { kind: 'attend', count: 9 },
    },
  ],

  /**
   * §9's beat table. Eighteen minutes, closing as a conclusion: the cycle does
   * not end, the watch does, and the next trench takes it (§8).
   *
   * Every arrival is called sixty seconds out, which is why this mission needs
   * no loud beat to satisfy the telegraph and would satisfy it nine times over
   * if it did.
   */
  beats: [
    {
      atTick: 0,
      kind: 'say',
      speaker: 'First Cantor Vehl Ossary',
      text: 'The stalls are open. The cohorts are seated. Nothing is expected of the watch but sufficiency, and sufficiency is not a small thing to be expected of.',
      note: 'Hailed and read — the say channel since #381',
    },
    call(
      T(1, 20),
      'Nine-four calls it. North of the step, and shallow. The watch is not asked to move.'
    ),
    call(
      T(3),
      'Nine-four calls it. The head again, and a little deeper. The watch is not asked to move.'
    ),
    call(
      T(4, 40),
      'Nine-four calls it. Upper channel, and going down. The watch is not asked to move.'
    ),
    call(T(6, 20), 'Nine-four calls it. Mid channel. The watch is not asked to move.'),
    // 07:00 — the call for the fifth arrival and Adze passing below land on the
    // same tick, which is §9's own table: the loudest friendly thing on the map
    // says its one sentence while the stalls are naming a bearing.
    call(
      T(8),
      'Nine-four calls it. Lower channel, and deeper than the last. The watch is not asked to move.'
    ),
    {
      atTick: T(7),
      kind: 'say',
      speaker: 'Cohort-Prime Adze',
      text: 'This is the floor. It is where I was made for and I am glad of it, which I am told is the part people find difficult. If the watch comes down here it will be welcome, and it will be slower than it likes, and it will not be able to go back up in time for anything.',
      note: 'The 9th Trench Cohort, passing below southbound. Not an offer of help. There is no help to offer',
    },
    // 08:40 — the axis tightens for the approach, and this is the mission's
    // decision: a depth, or a distance, that the watch cannot reach from where
    // it is standing. Made in silence, with nothing chasing the player.
    call(
      T(9, 40),
      'Nine-four calls it. South, and deeper than the last. The watch is not asked to move.'
    ),
    call(T(11, 20), 'Nine-four calls it. Mid channel. It is coming back up.'),
    call(T(13), 'Nine-four calls it. The sill. Furthest yet, and the watch is not asked to move.'),
    call(T(15, 40), 'Nine-four calls it. The head, nearest us. The last of the watch.'),
    // 17:00 — the stalls wake and the dreams are read into the record, without
    // interpretation, in the order they were dreamt. The last of them is the
    // sort of thing the transcripts have said before and been right about, and
    // nobody in the water points that out.
    {
      atTick: T(17),
      kind: 'say',
      speaker: 'The record, read from the stalls',
      text: 'Cohort 9-4, stall eleven: water going the wrong way up a stair, and counting, and the counting is somebody else\u2019s. Cohort 9-4, stall three: a room with the lights in rows, and the rows are breathing. Cohort 9-7, stall nineteen: nothing, and then being asked something in a language I do not have, and answering it correctly. Cohort 9-1, stall two: thirty-nine. Then thirty-eight.',
      note: 'Recorded as dreamt. Not evidence, and nobody in the mission treats it as any',
    },
    {
      atTick: T(18),
      kind: 'say',
      speaker: 'Undermarshal Setha Korrin',
      text: 'Six thousand pages, and not one of them a question. Somebody ought to have asked something by now.',
      note: 'The sentence she should not say aloud, and does. The First Cantor is present and says nothing, and the record notes that he was there',
    },
    {
      atTick: T(18),
      kind: 'resolve',
      conclusion: true,
      note: 'The watch ends. The shift is read as it stands, and the next trench takes the cycle',
    },
  ],

  /**
   * §8's Results, verbatim — the three readings, and the transcript the runtime
   * assembles under whichever of them the count earned.
   *
   * "You were sufficient" is the middle reading and the highest praise the
   * register has. It is not sarcastic and it is not a consolation.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      'Nine of nine. The watch went to it. That is recorded, and so is what it cost, and the First Cantor will have the second of those read first.',
    [MissionOutcome.Partial]:
      'You were sufficient. The gaps are entered as gaps. Nobody has ever attended a whole cycle and the record does not ask anyone to.',
    [MissionOutcome.Lost]:
      "Four lines and a watch's worth of travelling. The shift is not in the record. It is not a failure of yours; it is an absence of ours, and it is the first one since 88 PC.",
  },
};
