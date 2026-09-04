/**
 * The Attending 6 — Conclave. docs/mission-conclave-attending.md, transcribed.
 *
 * A data literal in `intake.ts`' idiom, on `attendance.ts`' rite: the document
 * owns the forces, the water, the beats, the numbers and the text. Where this
 * file and that document disagree, one of them is wrong and the fix says which
 * — and on the day this was written every number in it reproduced against the
 * shipped model, which is stated below with the arithmetic that establishes it.
 *
 * **One sentence of it does not, and it is prose rather than a number.** §4
 * says the cells "can be entered only by a hull that has crossed more than
 * three quarters of that water"; `attend` counts what the observer's *slot*
 * resolved, and the dome is on that slot. Played out with nobody ordered
 * anywhere, two of the six rows are entered on the first mission pass, so §8's
 * count of three asks for one crossing rather than three. §8 owns the count
 * and this literal transcribes it unchanged; `missionConclaveAttending.test.ts`
 * pins the measured behaviour with both rows named, so the day the count or
 * the dome's seat moves it is a failing test rather than a surprise in a
 * playthrough.
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **The water changes under it** (§11, §13). Two `ground` beats at 11:00,
 *   one per gallery bench, to floor 2,900 and Abyssal Trench: the first
 *   shipped mission to spend the repaint #197 and #259 built, and the answer
 *   to campaign.md §10's standing sentence about what brings a dome down. The
 *   axis strip between the benches is named by neither beat and keeps its
 *   3,400 m floor, because it is the door the return comes through and the
 *   door the column leaves by, and one event should do one thing.
 * - **The half the player does not have is authored as sound** (§4, §5). Six
 *   emitters at SIG 3 on the Cantorate's terrace, each carrying its own
 *   `reading` pair so the close can enter six rows by name. A friendly
 *   scripted party carrying hulls would be a force the player's own guns
 *   auto-acquire — hostility is `Owner.slot` — so the cohorts that were called
 *   and not assigned are a sound in a room, which is also the truer reading of
 *   habitats.md §6.
 * - **The roster is the rule** (§2, §6). Sixteen hulls, one role, and a
 *   written ceiling of 25: a Chorister cruises at 24 and crosses under it, a
 *   Submersible cruises at 28 and shoves, and the ledger measures the peak over
 *   the whole role — so one Submersible under way puts all sixteen in debt.
 *   Nothing forbids the shove. The record is the sanction.
 * - **The calling runs its length** (§9, §13). `runsItsLength`, for Intake's
 *   reason spent a second time: `the-muster` is met from tick zero (sixteen
 *   being at least twelve), so a column already standing in the axis when
 *   `the-calling` is revealed at 17:00 meets both terminal rows on one pass,
 *   and the court's default rule would resolve there — costing 19:00, 20:00,
 *   and the line the whole campaign has been walking toward.
 *
 * **The transit was checked against the engine rather than reasoned about, and
 * it crosses.** A review of §9 and §11 read the two arrivals as stalling —
 * both lines run due north, `Terrain.resolveStep` retries a blocked step on
 * the x axis first, and with `dx` zero that retry is a no-op that always
 * admits, so a colossus that cannot enter the water ahead of it holds station
 * forever. That is a real trap and it is the reason §13's own row exists; it
 * is not this mission's, because the depth §9 authors is 2,800 m and the
 * Cantorate terrace's floor is 2,800 m, and `Terrain.admits` is inclusive of
 * the floor. Driven from (2025, 3875) to (2025, 2000) at 2,800 m the first
 * arrival reaches its point 61.2 s after the beat — 11:41.2, which §9 rounds
 * up to 11:42 — and the second reaches its own 52.8 s after 16:00, which §9
 * rounds up to 16:54. Both roundings are the document's and neither is load
 * bearing: §8's dependent sentence, that the second holds before Korrin closes
 * the calling, is true by 7.2 s rather than by six.
 * The 3,000 m line §13 rejects is the one that stalls, into ground exactly
 * 200 m shallower than itself. Both are therefore authored as one `creature`
 * beat each, as §9 writes them.
 *
 * The dome's fall was checked the same way, because §9 states it as geometry
 * rather than as a beat and asks a reviewer to check it: the line is 75 m off
 * a Cantor of radius 80, a Sounder's body is 37.5, and 117.5 m of reach against
 * a 75 m offset is a 181 m chord — six seconds at 30 m/s, 1,327 damage against
 * 1,200 hit points, and 100 m of depth difference against the same 117.5 m
 * vertically. Run, the dome is first touched 12.8 s into the transit and is
 * gone at 18.3 — 10:52.8 and 10:58.3 against the document's ~10:53 and ~10:58.
 * Moving either coordinate moves the fall, which is why neither is a constant.
 *
 * Three things the document names and this literal deliberately does not build:
 * a commander's ability (§13 — the button exists and this mission is better
 * without it), a predicate over a breach that happened (§8, §13 — the debt
 * carries the history, imperfectly, and the document would rather it did), and
 * a predicate over another party's stillness, which is not expressible by
 * construction and correctly so. The Cantorate's refusal is authored as the
 * absence of any beat that would move a cantor.
 */

import {
  ATTENDING_CONCLAVE_HEADER,
  Biome,
  Faction,
  FaunaSpecies,
  MissionOutcome,
  ObjectiveStatus,
  SIM,
  StructureKind,
  UnitKind,
} from '@echoes/shared';

import type { MissionDefinition, MissionEmitter, MissionUnit } from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/**
 * Reserved and empty, as every Directorate mission reserves it — and here it
 * has a job the others' does not: it is where the dome goes while the debt
 * stands, and §2 says so in as many words ("nothing on slot 1, which is the
 * court's and stays empty so the silence ledger has somewhere to put the
 * dome").
 */
const COURT = 1;
/**
 * The second cohort's slot — six sounds and no hulls (§5).
 *
 * A slot is not a party: the Echo Layer resolves by `Owner.slot` and a hull
 * cannot hear its own side, so cells seated with the called would be inaudible
 * to the called, which is the one thing this mission cannot have. Attendance's
 * arrangement, with the return's nine passages replaced by six rows that never
 * stop.
 */
const CELLS = 2;

/** §3 — the seat: 2,700 m over the Undermarshalcy's 2,750 m floor. */
const SEAT_DEPTH_M = 2700;
/** §3, §11 — the dome, a hundred metres off the western bench's own floor. */
const DOME_DEPTH_M = 2900;
/**
 * §5, §11 — the cells, and the line both arrivals run.
 *
 * One figure, and it is the Cantorate terrace's own floor: the deepest line
 * that gets from the sill to the crossing at all (§13). The cells sit at it
 * because that is where the terrace is, and the arrivals cross their row at
 * their exact depth without touching them, because a transit reads structures
 * and hulls of 95 m and over and an emitter is neither.
 */
const TERRACE_FLOOR_M = 2800;
/** §4, §9, §12 — the order the galleries keep, and the budget, and one number. */
const SILENCE_CEILING_SIG = 25;
/** §5 — the cells' row, on the Cantorate's terrace. */
const CELL_ROW_Y = 2875;
/** §5 — sustained: twenty seconds on, twenty seconds to the next. */
const CELL_PERIOD = T(0, 20);

/**
 * One of the called — a Chorister, seated on the Undermarshalcy's terrace and
 * refit to the band it is seated in.
 *
 * `pressureRating: 3` is authored on every one of them and is the mission's
 * fact rather than the roster's: units.ts rates the hull PR-2 and the
 * Directorate's baseline lifts it for nothing, but `missions.test.ts` reads
 * `unit.pressureRating ?? statsFor(kind).pressureRating` and a PR-2 hull
 * authored at 2,700 m fails it. §3 states the refit for exactly that reason.
 */
const called = (ordinal: string, x: number, note: string): MissionUnit => ({
  tag: `called-${ordinal}`,
  kind: UnitKind.Chorister,
  x,
  y: 375,
  depthM: SEAT_DEPTH_M,
  role: 'called',
  armed: true,
  pressureRating: 3,
  note,
});

/**
 * One of the standing cohort — an Abyssal Submersible, behind the row.
 *
 * PR-3 on the roster and needing no refit (§3), which is why this helper
 * authors none: the refit above is a fact about the cheap hull, and stating it
 * here as well would make the two look like one rule.
 */
const standing = (ordinal: string, x: number, note: string): MissionUnit => ({
  tag: `standing-${ordinal}`,
  kind: UnitKind.AbyssalSubmersible,
  x,
  y: 525,
  depthM: SEAT_DEPTH_M,
  role: 'called',
  armed: true,
  note,
});

/**
 * One row of the second cohort, in its cells — §5's table, and the pair of
 * readings that makes the count a count.
 *
 * Parameterised by ordinal in the form docs/mission-shallow.md §6 sets for
 * Marr's six outer rows: six emitters sharing one string would append the same
 * two sentences up to six times and read as one row heard three times rather
 * than as three rows entered by name. Five thousand hit points because a
 * player who has crossed far enough to hear the second cohort can spend shells
 * on it — a gun never auto-acquires an emitter, but an ordered shot at a
 * resolved contact does land (§13).
 */
const cell = (cardinal: string, ordinal: string, x: number, note: string): MissionEmitter => ({
  tag: `cell-${cardinal}`,
  x,
  y: CELL_ROW_Y,
  depthM: TERRACE_FLOOR_M,
  // §4, §5 — the return's own figure, spent on breathing.
  sig: 3,
  // Sustained: the pattern and the period are the same length, which is what
  // "always" is in a format whose only sound is a pattern.
  periodTicks: CELL_PERIOD,
  onTicks: CELL_PERIOD,
  hp: 5000,
  reading: {
    entered: `Entered: the ${ordinal} row of the second cohort, in its cells. Called; not assigned; breathing.`,
    gap: `Not entered: the ${ordinal} row. The record notes that the First Cantor was present.`,
  },
  note,
});

export const ATTENDING_CONCLAVE: MissionDefinition = {
  ...ATTENDING_CONCLAVE_HEADER,
  doc: 'docs/mission-conclave-attending.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Directorate,
  courtSlot: COURT,
  /** §11 — both colossi are authored `creature` beats; nothing else is alive. */
  fauna: false,
  /** §9 — the cycle ends at 20:00 whatever the count stands at (§13). */
  runsItsLength: true,
  /**
   * §4, §9 — twenty-five, a ceiling, and the same number as the silence order.
   * The second time in the bible the budget and the order are one figure
   * (docs/mission-sorrowgate.md §4), and for the same reason: a mission whose
   * subject is who is heard crossing cannot advertise a loudness the rite would
   * call a shove. It fails nothing and costs no hull. It is written down.
   */
  sigBudget: SILENCE_CEILING_SIG,
  /** §3, §5 — the galleries' Cantor, lent up to the calling. */
  arrayTag: 'dome',
  /** §4, §12 — "The order the galleries keep reaches this water, and it is twenty-five." */
  silenceCeilingSig: SILENCE_CEILING_SIG,
  /**
   * The order binds the called, all sixteen of them, and the ledger measures
   * the peak over the role — so one Submersible under way puts the whole
   * roster in debt (§4). That is the rite's own arithmetic and not a
   * punishment invented for a game.
   */
  silenceRole: 'called',
  /** §4, §5 — unchanged from Attendance, because the galleries did not amend it. */
  debtCapS: 45,
  /** No held freight: sixteen hulls that move on their own orders. */
  escortRadiusM: 0,

  /**
   * §11's second table — the three rectangles a predicate or a beat addresses.
   * The map paints six regions; these are the two benches the ground beats
   * name and the channel the calling is counted in.
   */
  regions: [
    {
      id: 'galleries-west',
      x: 1250,
      y: 3250,
      widthM: 750,
      heightM: 500,
      note: "The western bench — the dome's own ground, and the half of the stalls the arrival passes. Cut structure until 11:00 and trench afterwards",
    },
    {
      id: 'galleries-east',
      x: 3000,
      y: 3250,
      widthM: 750,
      heightM: 500,
      note: 'The eastern bench. Nothing crosses it and it comes down anyway, at the same tick and by the same beat, because a dome is one building',
    },
    {
      id: 'the-axis',
      x: 2000,
      y: 3250,
      widthM: 1000,
      heightM: 750,
      note: "The Ninth's channel, leaving south between the benches. Named by neither ground beat and still 3,400 m at the close (§11); where the column is counted when the cycle ends",
    },
  ],

  /**
   * One marker, and it is revealed with the calling at 17:00 — a marker ships
   * only while an objective naming it is shown (`projectMissionView`), so the
   * axis is pointed at for the last three minutes and never before. Nothing
   * points at the cells, and nothing points at either arrival.
   */
  markers: [
    {
      id: 'axis',
      label: 'The axis. What is assigned descends through it.',
      x: 2500,
      y: 3625,
      radiusM: 500,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Directorate,
      note: "The called — sixteen hulls on the Undermarshalcy's terrace and the galleries' dome lent up to the calling (§2). One role, and the hull's own SIG decides who can cross under the order",
      units: [
        // §3 — twelve Choristers at y 375, x 1500 to 3700 in steps of 200. The
        // cohort row: the half that can cross, and the half a colossus cannot
        // bite (50 m against `DRIFT.TRANSIT_MIN_HULL_M`'s 95).
        called(
          'one',
          1500,
          'The cohort row, seated silent at 00:30. Nothing marks one of them, and the mission never does'
        ),
        called('two', 1700, ''),
        called('three', 1900, ''),
        called('four', 2100, ''),
        called('five', 2300, ''),
        called('six', 2500, ''),
        called('seven', 2700, ''),
        called('eight', 2900, ''),
        called('nine', 3100, ''),
        called('ten', 3300, ''),
        called('eleven', 3500, ''),
        called(
          'twelve',
          3700,
          'The twelfth, and identical to the other eleven. Eight of these in the axis is a column, and twelve of the sixteen alive is a muster'
        ),
        // §3 — four Abyssal Submersibles at y 525, behind the row. Three over
        // the ceiling at cruise, and the only hull on the map long enough to
        // be ground by what comes up the Ninth.
        standing(
          'one',
          1800,
          'The standing cohort. It may cross, and the whole upper city will hear that it did'
        ),
        standing('two', 2266, ''),
        standing('three', 2732, ''),
        standing(
          'four',
          3198,
          'Ninety-five metres exactly, which is the one length in the roster a Sounder’s transit is written against'
        ),
      ],
      structures: [
        // §3, §11 — the dome, standing where the galleries stand, at 2,900 m
        // over the western bench's 3,000 m floor. The hundred metres is not
        // decoration: a transit's reach is vertical as well as horizontal, and
        // it is what keeps the dome inside the 117.5 m a line at 2,800 reaches
        // down through. Its 1,200 m disc covers the bench, the axis and two
        // thirds of the Cantorate's terrace, and reaches the crossing only as
        // a lens on the line x 1,950 — so the called, seated 2,875 and 3,025 m
        // away, get nothing at all until they have crossed to the Cantorate.
        {
          tag: 'dome',
          kind: StructureKind.Cantor,
          x: 1950,
          y: 3400,
          depthM: DOME_DEPTH_M,
          note: "The Cantorate's instrument, lent down for the length of the calling — and the one thing the silence ledger can withdraw. Worth sixteen per cent of range to a Chorister and seven to a Submersible, which nobody says out loud",
        },
      ],
    },
    {
      slot: CELLS,
      faction: Faction.Directorate,
      note: 'The cells — the second cohort, called and not assigned, breathing on the south terrace. No hulls: a friendly scripted party carrying hulls is auto-acquired by the player’s own guns, and these are the half of the army the player does not have (§5)',
      units: [],
      emitters: [
        cell(
          'one',
          'first',
          1500,
          "The west end of the row, and the furthest thing on the map from the Undermarshalcy's own edge"
        ),
        cell('two', 'second', 1900, ''),
        cell(
          'three',
          'third',
          2300,
          'On the line the dome reaches, which is what buys the third row at y 2,200 rather than at y 2,325'
        ),
        cell('four', 'fourth', 2700, ''),
        cell('five', 'fifth', 3100, ''),
        cell(
          'six',
          'sixth',
          3500,
          'The sixth. Six rows, six readings, and the count asks for three of them'
        ),
      ],
    },
  ],

  /**
   * §2 — what the called do not carry, with the doctrine's own reasons shown.
   * Weapons, torpedoes and noisemakers are live and are not mentioned again:
   * the mission does not lock what it has already priced.
   */
  locks: [
    {
      ability: 'activeSonar',
      reason: 'aboard, live, and not used — the head of the Ninth is not asked',
    },
    { ability: 'construction', reason: 'nothing is built during a calling' },
    { ability: 'mines', reason: 'nothing is left in the water the cohorts sleep over' },
    { ability: 'depthCharges', reason: 'nothing is left in the water the cohorts sleep over' },
  ],

  /**
   * §8's four rows, in §8's order — which is also the order the close reads
   * them in: `objectiveReadings` walks this list, so the cells' reading prints
   * before the crossing's, and the six cells' own entered-and-gap lines print
   * beneath both.
   *
   * The two terminal rows carry no reading of their own, deliberately: §8's
   * three Results are Korrin's whole reading of the count, and a fifth and
   * sixth sentence restating them would be the register talking twice.
   */
  objectives: [
    {
      id: 'the-calling',
      text: 'The calling closes at the cycle. What is assigned descends. Eight of sixteen is a column, and the Undermarshalcy does not round up.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      // §8, §9 — revealed on Korrin's own beat at 17:00, for Intake §9's
      // reason: `extract` is not standing, the runtime never re-derives a Met
      // non-standing row, and a column that stood in the axis at 05:00 and
      // left would otherwise have met a calling that had not yet closed.
      revealAtTick: T(17),
      markerId: 'axis',
      predicate: { kind: 'extract', role: 'called', region: 'the-axis', count: 8 },
    },
    {
      id: 'the-muster',
      text: 'Twelve of sixteen. The Undermarshalcy does not round up.',
      initial: ObjectiveStatus.Pending,
      terminal: true,
      // §8 — standing, and re-derived every tick (`isStanding`), so a hull the
      // second arrival took at 16:30 is a hull the muster is short at 20:00.
      // Met from tick zero, which is what `runsItsLength` above is for.
      predicate: { kind: 'survive', role: 'called', count: 12 },
    },
    {
      id: 'the-cells',
      text: 'The calling is put. Who attends it is entered, and who does not.',
      initial: ObjectiveStatus.Pending,
      // §8 — read out, never ranked. Three rows of the second cohort resolved
      // at Bearing or better, which needs a hull more than three quarters of
      // the way across the crossing: from the north terrace's own edge the
      // ratio is 0.33 and there is nothing there at all (§4).
      predicate: { kind: 'attend', count: 3 },
      reading: {
        met: 'Entered: the second cohort, in its cells, three rows or more, breathing. Not assigned. The First Cantor was present.',
        unmet:
          'Not entered: the cells. The calling was put and the north terrace did not go far enough across to hear who did not answer it.',
      },
    },
    {
      id: 'the-crossing',
      text: 'The stalls are under the terraces. A hull under way between them is the only sound there is.',
      // §8, §12 — the same rule as the stalls state it while the debt stands.
      // It replaces the line above and does not add a row: the ask has not
      // changed, only who is currently owed.
      debtText: 'The called owe the stalls a silence.',
      initial: ObjectiveStatus.Pending,
      // §8 — standing, and read out rather than ranked. `quiet` reads the
      // water at the tick it is asked, so what carries the history of a shove
      // is the debt, which repays a second for a second; §13 names the
      // monotone sibling that would carry it properly and declines it.
      predicate: { kind: 'quiet', role: 'called', ceilingSig: SILENCE_CEILING_SIG },
      reading: {
        met: 'The crossing was made under the order.',
        unmet: 'The crossing was heard the length of the trench, and the debt is written.',
      },
    },
  ],

  /**
   * §9's beat table, in its order. Twenty minutes, closing as a conclusion:
   * the cycle ends, the calling closes, and the count is read as it stands —
   * docs/mission-tend.md §8's argument and glossary.md's, and the third
   * Directorate mission to make it.
   *
   * The telegraph is paid four times over and is measured off the second
   * arrival: 16:00 against a close at 20:00 is 240 s against §10's 60, and
   * the `conclusion` flag buys this mission nothing it had not already bought.
   */
  beats: [
    // 00:00 — the watch's formula, unchanged and unabridged, spoken over a
    // calling. There is no version of it for a conclave and he does not make
    // one (§12).
    {
      atTick: 0,
      kind: 'say',
      speaker: 'First Cantor Vehl Ossary',
      text: 'The stalls are open. The cohorts are seated. Nothing is expected of the watch but sufficiency, and sufficiency is not a small thing to be expected of.',
      note: 'Hailed and read — the say channel since #381',
    },

    // 00:30 — the calling is put, and the sixteen go silent with it. The
    // terraces going quiet for a conclave is the rite's own behaviour rather
    // than a favour to the player, and the toggle is in the player's hands
    // from the first tick.
    {
      atTick: T(0, 30),
      kind: 'say',
      speaker: 'Undermarshal Setha Korrin',
      text: 'A calling is put at the head of the Ninth. It is put because something is happening to the thing the cohorts attend. Sixteen hulls are given to the calling, and the order the galleries keep reaches this water, and it is twenty-five. A calling is answered by who crosses. The Cantorate is asked whether it will attend the calling of the assignment, and it is not asked for a reason.',
      note: '§12, in the log. The whole of the calling is the briefing; this is what is said in the water when the cycle opens',
    },
    {
      atTick: T(0, 30),
      kind: 'silent',
      tag: 'called-one',
      active: true,
      note: 'The sixteen go silent. A silent Chorister emits 4.3 and holds its fire',
    },
    { atTick: T(0, 30), kind: 'silent', tag: 'called-two', active: true, note: '' },
    { atTick: T(0, 30), kind: 'silent', tag: 'called-three', active: true, note: '' },
    { atTick: T(0, 30), kind: 'silent', tag: 'called-four', active: true, note: '' },
    { atTick: T(0, 30), kind: 'silent', tag: 'called-five', active: true, note: '' },
    { atTick: T(0, 30), kind: 'silent', tag: 'called-six', active: true, note: '' },
    { atTick: T(0, 30), kind: 'silent', tag: 'called-seven', active: true, note: '' },
    { atTick: T(0, 30), kind: 'silent', tag: 'called-eight', active: true, note: '' },
    { atTick: T(0, 30), kind: 'silent', tag: 'called-nine', active: true, note: '' },
    { atTick: T(0, 30), kind: 'silent', tag: 'called-ten', active: true, note: '' },
    { atTick: T(0, 30), kind: 'silent', tag: 'called-eleven', active: true, note: '' },
    { atTick: T(0, 30), kind: 'silent', tag: 'called-twelve', active: true, note: '' },
    {
      atTick: T(0, 30),
      kind: 'silent',
      tag: 'standing-one',
      active: true,
      note: 'A silent Submersible emits 4.8, which is the only figure at which it is quieter than the order',
    },
    { atTick: T(0, 30), kind: 'silent', tag: 'standing-two', active: true, note: '' },
    { atTick: T(0, 30), kind: 'silent', tag: 'standing-three', active: true, note: '' },
    { atTick: T(0, 30), kind: 'silent', tag: 'standing-four', active: true, note: '' },

    // 02:00, 05:00 — the first two of the three sentences that get shorter.
    {
      atTick: T(2),
      kind: 'say',
      speaker: 'The stalls',
      text: 'The calling stands. The cells are seated. Nothing crosses.',
      note: 'The sound this mission is actually made of (§7)',
    },
    {
      atTick: T(5),
      kind: 'say',
      speaker: 'The stalls',
      text: 'Nothing crosses.',
      note: 'The second of three, and two clauses shorter than the first',
    },

    // 07:00 — the floor's channel. The 9th is assigned already and does not
    // need a calling, and states its own slowness as a fact about equipment
    // (§12).
    {
      atTick: T(7),
      kind: 'say',
      speaker: "Cohort-Prime Adze, on the floor's channel",
      text: 'The floor hears a calling. The floor is assigned already and does not need one, and will be at the sill when what crosses gets there, and will be slower than it likes.',
      note: 'Availability as a fact about ground, which the Commune could not say without apologising for it',
    },

    // 09:40 — the rite's own sixty seconds, spent on something that is not the
    // return and named by what it is not; and Korrin's one permitted lapse,
    // stopping one clause short of the sentence she believes (§12).
    {
      atTick: T(9, 40),
      kind: 'say',
      speaker: 'The stalls',
      text: 'Nine-four calls it. The sill, and coming up. It is not the return.',
      note: 'Sixty seconds, in the rite’s own form. Where it came from is not said then or later, by anybody',
    },
    {
      atTick: T(9, 40),
      kind: 'say',
      speaker: 'Undermarshal Setha Korrin',
      text: 'Something is coming up the Ninth that does not attend, and the cohorts are called to the place it is coming from, and the Cantorate is asked whether it will attend the calling. It is not asked what it thinks the thing is. Nobody is.',
      note: 'A question about a question. Mission 7 is the silence where the rest of it would have gone',
    },

    // 10:40 — the arrival, at the sill's western side and driven up the axis at
    // the Cantorate terrace's own floor. `loud: true`, and SIG 100: a Chorister
    // holds it at contact from 10,187 m against a map five kilometres wide, so
    // there is no station on this chart where it is faint. It takes the dome
    // down at about 10:58 on its way past, by the geometry §9 states rather
    // than by a `lose` beat.
    {
      atTick: T(10, 40),
      kind: 'creature',
      tag: 'the-arrival',
      species: FaunaSpecies.Sounder,
      spawnAt: { x: 2025, y: 3875, depthM: TERRACE_FLOOR_M },
      driveTo: { x: 2025, y: 2000, depthM: TERRACE_FLOOR_M },
      untilTick: T(12),
      loud: true,
      note: 'Twenty-five metres inside the axis strip’s western edge and seventy-five off the dome. Nobody orders it and nobody in the water is responsible for it',
    },

    // 11:00 — the ground. Both benches to floor 2,900 and Abyssal Trench, one
    // beat each at one tick: the cut structure's shadows go, 0.80 becomes 1.60,
    // and a hundred metres of rubble stands where the stalls were. The axis
    // strip between them is named by neither and keeps its 3,400 (§11, §13).
    {
      atTick: T(11),
      kind: 'ground',
      region: 'galleries-west',
      floorM: 2900,
      biome: Biome.AbyssalTrench,
      note: 'The western bench comes down. The dome is not lifted, because the dome is not there: it came apart a second and a half earlier and the beat finds the bench with nothing on it but rubble to raise',
    },
    {
      atTick: T(11),
      kind: 'ground',
      region: 'galleries-east',
      floorM: 2900,
      biome: Biome.AbyssalTrench,
      note: 'The eastern bench, at the same tick and by a second beat, because a mission region is a rectangle and the strip between them must not move',
    },
    {
      atTick: T(11),
      kind: 'say',
      speaker: 'First Cantor Vehl Ossary',
      text: 'The dome is down. The stalls are seated. Nothing is expected of the stalls but sufficiency.',
      note: 'A building coming down on his own congregation, answered with the liturgical formula and one substituted noun (§12)',
    },

    // 12:00 — the commitment lapses on the `untilTick` above. The arrival is
    // the Drift's own again: deaf no longer, killable again, and rising eight
    // hundred metres out of the cohorts' band toward its species' 2,000 m.
    {
      atTick: T(12),
      kind: 'say',
      speaker: 'The stalls',
      text: 'It is in the head. It is not attending anything.',
      note: 'Named twice by what it is not, and never once by what it is',
    },

    // 14:00 — the third of three, and the mission's actual thesis.
    {
      atTick: T(14),
      kind: 'say',
      speaker: 'The stalls',
      text: 'Nothing has crossed from the south terrace. The record notes it.',
      note: 'The shortest of the three sentences, and the only one that says whose silence it is',
    },

    // 16:00 — the second, at the same sill and up the axis's middle. No say
    // beat, from anybody: the mission's loudest event is the one nobody
    // comments on. This is the beat the telegraph is measured from.
    {
      atTick: T(16),
      kind: 'creature',
      tag: 'the-second',
      species: FaunaSpecies.Sounder,
      spawnAt: { x: 2500, y: 3875, depthM: TERRACE_FLOOR_M },
      driveTo: { x: 2500, y: 2250, depthM: TERRACE_FLOOR_M },
      untilTick: T(18),
      loud: true,
      note: 'It reaches the crossing’s southern edge and holds, before Korrin closes the calling and three minutes before the count is read. Whatever is going to be in the column’s way is in it, audibly, before the column is asked to leave',
    },

    // 17:00 — Korrin closes the calling, and the calling is revealed with her
    // own beat. Eight hulls in the axis when the cycle ends is the count.
    {
      atTick: T(17),
      kind: 'say',
      speaker: 'Undermarshal Setha Korrin',
      text: 'The calling closes. What is assigned descends. Eight of sixteen is a column.',
      note: 'The reveal tick of `the-calling`, and the marker arrives with it',
    },

    // 19:00 — the column is counted at the axis. The second's commitment
    // lapsed at 18:00 where it stood, on the `untilTick` the 16:00 beat
    // carried, and it is rising out of the column's water as the column
    // arrives in it.
    {
      atTick: T(19),
      kind: 'say',
      speaker: 'The stalls',
      text: 'The column is counted at the axis.',
      note: 'A statement of procedure, in the passive, addressed to nobody',
    },

    // 20:00 — Ossary says nothing, and it is entered. One beat before the
    // resolve on the same tick, so the log carries it after every one of the
    // three readings (§8).
    {
      atTick: T(20),
      kind: 'say',
      speaker: 'First Cantor Vehl Ossary',
      text: 'Nothing. The record notes that the First Cantor was present.',
      note: 'A silence entered as a presence — the single most Directorate sentence in the document, and the only one the Knights would understand immediately and could not have said',
    },
    {
      atTick: T(20),
      kind: 'resolve',
      conclusion: true,
      note: 'The cycle ends, the calling closes, and the count is read as it stands. Not a timer: a conclusion (glossary.md, Mission Outcome)',
    },
  ],

  /**
   * §9's one conditional beat, fired by the tally rather than by the clock —
   * the first row entered, which is the first moment a hull has gone far
   * enough across the crossing to hear who did not answer.
   */
  conditionalBeats: [
    {
      kind: 'say',
      speaker: 'The stalls',
      text: 'Entered: the cells, breathing. The calling is heard from the south terrace and is not answered.',
      note: 'One row is enough to say it. The objective asks for three',
      when: { kind: 'attend', count: 1 },
    },
  ],

  /**
   * §8's Results, verbatim — Korrin's three readings, with `the-cells`' and
   * `the-crossing`'s own readings printing beneath whichever row the count
   * earned, and the six cells' entered-and-gap lines beneath those.
   *
   * Neither terminal objective is a keystone, deliberately (§8): a column that
   * arrived short and a muster that came home whole are read as the same
   * sentence, because the Directorate does not price bodies against ground and
   * would be caught doing it the first time it tried.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      "The column is at the axis and the muster is twelve. The calling was attended by nobody and the assigned descend anyway, which is what an assignment is. The dome is down and the stalls are seated under what is left of it, and that is entered too, under the Cantorate's name, because it was the Cantorate's.",
    [MissionOutcome.Partial]:
      'You were sufficient. The column is at the axis or the muster is twelve, and the other is short. Half an army went down the Ninth because half was assigned; the half that was not is in its cells, and the record has it breathing.',
    [MissionOutcome.Lost]:
      'No column and no muster. What came up the Ninth is in the head of it, and the calling stands open with nobody crossing in either direction. It is not a failure of the called; it is a calling put at the wrong cycle, and the next one will be put anyway.',
  },
};
