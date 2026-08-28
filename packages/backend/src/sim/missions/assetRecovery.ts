/**
 * The Ledger 1 — Asset Recovery. docs/mission-asset-recovery.md, transcribed.
 *
 * A data literal in `sorrowgate.ts`'s idiom: no logic, no loader, and the
 * document owns every number — the regions, the beat times, the lift figure,
 * the counts. Where this file and that document disagree, one of them is wrong
 * and the fix says which.
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **Loud is the plan.** The column is armed, the barges cut at the throttle
 *   table's loudest row, and the SIG budget is a level the mission expects
 *   rather than a ceiling anything enforces (§4). There is no silence order
 *   and no array: the ledger machinery is simply not authored.
 * - **The taps are a placed sound, not a unit.** The chamber transmits by
 *   struck iron on the interval from the first tick, and stops the moment
 *   Lift Three rigs it — `silencedByLift` is §6's own coupling (§6).
 * - **The outcome hangs on one asset.** §8's Results read off 9-06-200: the
 *   chamber's barge carries the `charge` role and its objective the `keystone`
 *   flag, so machinery home without the chamber reads "The number stays" and
 *   never a write-down.
 * - **The Drift is the pressure and the schedule is the failure.** Packs and
 *   herd arrive by authored beats and then live by their own doctrine —
 *   commit to the loudest hull in reach — and the fall closes at 18:00 on
 *   ground beats, with the last loud beat two minutes ahead of it (§7, §8).
 */

import {
  Faction,
  FaunaSpecies,
  LEDGER_ASSET_RECOVERY_HEADER,
  MissionOutcome,
  ObjectiveStatus,
  SIM,
  UnitKind,
} from '@echoes/shared';

import { SOLID } from '../terrain.ts';
import type { MissionDefinition } from './types.ts';

/** §9's beat table is mm:ss; the simulation counts ticks. */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const PLAYER = 0;
/**
 * The court's slot, held by nobody: this mission has no court, no array and no
 * silence order, but the runtime still needs a slot with no party in it, and
 * one is reserved here exactly as Sorrowgate reserves it.
 */
const COURT = 1;
/**
 * The chamber — §5 lists it as a party of its own ("Seventeen souls,
 * transmitting by struck iron"), and its one asset is a sound.
 */
const CHAMBER = 2;

/** The lift figure: two minutes at the throttle table's loudest row (§8). */
const CUT_TICKS = T(2);
const CUT_SIG = 68;

export const LEDGER_ASSET_RECOVERY: MissionDefinition = {
  ...LEDGER_ASSET_RECOVERY_HEADER,
  doc: 'docs/mission-asset-recovery.md',
  playerSlot: PLAYER,
  playerFaction: Faction.Bathyarch,
  courtSlot: COURT,
  /**
   * §11 — a mission owns its own water and its own Drift. The packs and the
   * herd arrive by authored beats; ambient seeding would put creatures on the
   * field the document did not place.
   */
  fauna: false,
  /**
   * §9 — 65, inverted: the budget is the level the mission *expects*, and the
   * playtest adversary is the player who creeps. Shown as a ceiling like any
   * budget, and never a rule (campaign.md §10).
   */
  sigBudget: 65,
  // No arrayTag: no court, no lent hearing, no silence ledger (§3). The
  // ceiling and cap below are inert without one and authored at the values
  // that say so.
  silenceCeilingSig: 100,
  debtCapS: 0,
  /**
   * Zero — the escort hold is off (types.ts). §3 prices the barges' deafness
   * differently from Sorrowgate's freight: at the Scar it does not matter,
   * because everything that comes for a lift barge announces itself. The
   * escort here is made of guns, not of permission.
   */
  escortRadiusM: 0,

  regions: [
    {
      id: 'railhead',
      x: 1500,
      y: 0,
      widthM: 1000,
      heightM: 500,
      note: "The Rail Head — staging, the writ's delivery point, where a delivery is counted",
    },
    {
      id: 'face-cut',
      x: 1750,
      y: 2250,
      widthM: 500,
      heightM: 250,
      note: "The fall's working edge — where a barge holds while its cut runs",
    },
    {
      id: 'fall-stage',
      x: 2000,
      y: 2500,
      widthM: 250,
      heightM: 250,
      note: 'The stage of Face Six that goes at eleven-thirty — §8, the fall is still falling',
    },
    {
      id: 'face',
      x: 1750,
      y: 2250,
      widthM: 500,
      heightM: 500,
      note: 'Face Six whole — the rectangle the last of the fall closes at eighteen minutes',
    },
  ],

  /**
   * §8 — three lifts, one shape: hold at the fall while the cut runs, two
   * minutes at 68, then carry. Lift Three's cut is the rigging survey, and
   * the taps stop the moment it lands (§6).
   */
  lifts: [
    {
      id: 'asset-114',
      tag: 'lift-one',
      region: 'face-cut',
      cutTicks: CUT_TICKS,
      cutSig: CUT_SIG,
      note: 'The cutter head — half-buried, recoverable',
    },
    {
      id: 'asset-181',
      tag: 'lift-two',
      region: 'face-cut',
      cutTicks: CUT_TICKS,
      cutSig: CUT_SIG,
      note: 'The walking frame — the shoring engine that held long enough',
    },
    {
      id: 'asset-200',
      tag: 'lift-three',
      region: 'face-cut',
      cutTicks: CUT_TICKS,
      cutSig: CUT_SIG,
      note: 'The refuge chamber — contents seventeen, condition transmitting',
    },
  ],

  markers: [
    {
      id: 'railhead',
      label: 'The Rail Head. The writ closes at the count.',
      x: 2000,
      y: 250,
      radiusM: 500,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Bathyarch,
      note: 'The salvage column, under a recovery writ signed for the Ninth Board (§2)',
      units: [
        // The flagship. §3: SIG 55 idle / 65 with systems live — the roster's
        // own split, and keeping way on is the deliberate act that holds it in
        // the Klaxon band. Armed, because §7's packs commit to the loudest
        // hull in reach and this is the hull built to be it.
        {
          tag: 'flagship',
          kind: UnitKind.Cruiser,
          x: 2000,
          y: 320,
          depthM: 650,
          role: 'escort',
          armed: true,
          note: "The mission's instrument — loudest mobile thing on the field, and built to survive it",
        },
        {
          tag: 'corvette-1',
          kind: UnitKind.Corvette,
          x: 1880,
          y: 260,
          depthM: 650,
          role: 'escort',
          armed: true,
          note: 'The working escort — enough gun to finish what commits',
        },
        {
          tag: 'corvette-2',
          kind: UnitKind.Corvette,
          x: 2120,
          y: 260,
          depthM: 650,
          role: 'escort',
          armed: true,
          note: '',
        },
        // The lift barges. Harvester hulls, dredge rigged for lift; deaf at
        // HYD 30, and at the Scar it does not matter (§3). Unarmed — a dredge
        // is not a gun — and unheld: the escort rule is off for this column.
        {
          tag: 'lift-one',
          kind: UnitKind.Harvester,
          x: 1900,
          y: 380,
          depthM: 650,
          role: 'tender',
          note: 'Lift One, for the cutter head',
        },
        {
          tag: 'lift-two',
          kind: UnitKind.Harvester,
          x: 2100,
          y: 380,
          depthM: 650,
          role: 'tender',
          note: 'Lift Two, for the walking frame',
        },
        // The chamber's barge carries its own role because §8's Results are
        // keyed on this one hull's return: "The number stays" is what the
        // Board reads whenever it does not come out, machinery notwithstanding.
        {
          tag: 'lift-three',
          kind: UnitKind.Harvester,
          x: 2000,
          y: 430,
          depthM: 650,
          role: 'charge',
          note: 'Lift Three, for the refuge chamber',
        },
      ],
    },
    {
      slot: CHAMBER,
      faction: Faction.Bathyarch,
      note: 'The chamber — seventeen souls, transmitting by struck iron. Not a unit until Lift Three rigs it (§5)',
      units: [],
      emitters: [
        // §6 — the beacon, the clock and the dread in one diegetic sound:
        // small, periodic, patterned, present from the first tick, audible to
        // the column from the channel and to everything else that listens.
        // Thirty is a lift barge's working half — locatable inside the Scar's
        // carrying water without out-shouting the work it schedules.
        {
          tag: 'taps',
          x: 1900,
          y: 2650,
          depthM: 1120,
          sig: 30,
          periodTicks: 5 * SIM.TICK_HZ,
          onTicks: 1 * SIM.TICK_HZ,
          // The chamber is rated for four tides, not for gunfire it will
          // never receive; hull enough that a stray shell is not the mission.
          hp: 400,
          silencedByLift: 'asset-200',
          note: 'Struck iron, in a worked pattern, on the interval. It has not stopped since the fall',
        },
      ],
    },
  ],

  /**
   * §3 — what the column does not carry, as dead affordances with the writ's
   * reasons shown. Weapons are pointedly absent from this list: the Klaxon fit
   * is the plan, and Silent Running is present, unfenced, and wrong (§3).
   */
  locks: [
    {
      ability: 'activeSonar',
      reason: 'not carried — an array on a salvage column is an unfunded line item',
    },
    {
      ability: 'construction',
      reason: 'the field is under a recovery writ, not a works order',
    },
  ],

  /**
   * §12's "Objective readings, in play", verbatim: the Consortium register
   * uses the imperative freely — theirs is the register that can — and prices
   * everything it names. The asset numbers are the register: everything the
   * Consortium owns carries one (docs/factions.md), and `missionSafety.test.ts`
   * carries the argued exception for exactly this pattern.
   */
  objectives: [
    {
      id: 'asset-114',
      text: 'Recover Asset 9-06-114. Log exceptions.',
      initial: ObjectiveStatus.Pending,
      markerId: 'railhead',
      // A count ladder over the two machinery barges, the Sorrowgate tender
      // arrangement: either may be the first one home, and the court reads
      // counts rather than identities. Terminal, because §8's table is read
      // off the terminal count.
      terminal: true,
      predicate: { kind: 'extract', role: 'tender', region: 'railhead', count: 1, loaded: true },
    },
    {
      id: 'asset-181',
      text: 'Recover Asset 9-06-181. The frame held; bring it home in the condition it earned.',
      initial: ObjectiveStatus.Pending,
      markerId: 'railhead',
      terminal: true,
      predicate: { kind: 'extract', role: 'tender', region: 'railhead', count: 2, loaded: true },
    },
    {
      id: 'asset-200',
      text: 'The chamber transmits. Treat the interval as schedule.',
      initial: ObjectiveStatus.Pending,
      markerId: 'railhead',
      terminal: true,
      // The keystone: unmet, the Board reads "The number stays" whatever else
      // came home (§8) — the registry keeps the number, and the count is Lost.
      keystone: true,
      predicate: { kind: 'extract', role: 'charge', region: 'railhead', count: 1, loaded: true },
    },
    {
      id: 'column',
      text: 'Return the column to the Rail Head. The writ closes at the count.',
      initial: ObjectiveStatus.Pending,
      markerId: 'railhead',
      // Revealed when the haul home begins — the column assembles *at* the
      // Rail Head, so a reading shown at 00:00 would open the mission already
      // met. Not terminal: the Board's Results price assets, not escorts.
      revealAtTick: T(12, 30),
      predicate: { kind: 'extract', role: 'escort', region: 'railhead', count: 3 },
    },
  ],

  /**
   * §9's beat table, in its order. Eighteen minutes, closing at 18:00 exactly.
   *
   * The column's own movement is the player's — nothing here orders a player
   * hull anywhere. The beats place the field's pressure and close the fall on
   * the document's clock: the stages are authored rather than simulated,
   * because a mission's beats have to happen at the time the document says
   * they happen. The blowout is why; the beat is when.
   */
  beats: [
    // 00:00 — the field is attending before the writ finishes being read.
    // Pack one is placed at the workings and released to its own doctrine:
    // shadow the industry, commit to the loudest hull in reach (§7). The
    // twenty-second commitments are placement, not approach — after them the
    // Drift's own ladder owns every creature here.
    {
      atTick: 0,
      kind: 'creature',
      tag: 'pack-one-a',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 1450, y: 1850, depthM: 900 },
      driveTo: { x: 1550, y: 1750 },
      untilTick: T(0, 20),
      loud: false,
      note: 'The first pack, shadowing the workings it has shadowed for two centuries',
    },
    {
      atTick: 0,
      kind: 'creature',
      tag: 'pack-one-b',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 1350, y: 1950, depthM: 900 },
      driveTo: { x: 1450, y: 1850 },
      untilTick: T(0, 20),
      loud: false,
      note: '',
    },
    {
      atTick: 0,
      kind: 'creature',
      tag: 'pack-one-c',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 1550, y: 1950, depthM: 900 },
      driveTo: { x: 1650, y: 1850 },
      untilTick: T(0, 20),
      loud: false,
      note: '',
    },
    // The herd, on the terrace it feeds on. Reluctant, deaf, and dangerous
    // only when something detonates near the ground it grazes (§7).
    {
      atTick: 0,
      kind: 'creature',
      tag: 'grazer-a',
      species: FaunaSpecies.Ashgrazer,
      spawnAt: { x: 700, y: 900, depthM: 600 },
      driveTo: { x: 750, y: 880 },
      untilTick: T(0, 20),
      loud: false,
      note: 'The herd — the joke the Consortium has stopped finding funny (§1)',
    },
    {
      atTick: 0,
      kind: 'creature',
      tag: 'grazer-b',
      species: FaunaSpecies.Ashgrazer,
      spawnAt: { x: 1300, y: 800, depthM: 600 },
      driveTo: { x: 1350, y: 820 },
      untilTick: T(0, 20),
      loud: false,
      note: '',
    },
    {
      atTick: 0,
      kind: 'creature',
      tag: 'grazer-c',
      species: FaunaSpecies.Ashgrazer,
      spawnAt: { x: 2600, y: 850, depthM: 600 },
      driveTo: { x: 2650, y: 870 },
      untilTick: T(0, 20),
      loud: false,
      note: '',
    },
    {
      atTick: 0,
      kind: 'creature',
      tag: 'grazer-d',
      species: FaunaSpecies.Ashgrazer,
      spawnAt: { x: 3200, y: 900, depthM: 600 },
      driveTo: { x: 3150, y: 880 },
      untilTick: T(0, 20),
      loud: false,
      note: '',
    },

    // 03:00 — the face, and the site chief on the channel (§12).
    {
      atTick: T(3),
      kind: 'say',
      speaker: 'Foreman Corwin Osk',
      text: "Shoring on Five held in '06 because the Board bought the time to do it right. Six got the other kind of time. Put that in the log with the rest of it.",
      note: 'Read, not heard — the standing status of the say channel',
    },
    {
      atTick: T(3, 10),
      kind: 'say',
      speaker: 'Foreman Corwin Osk',
      text: "That's the chamber. Struck iron carries. They know what listens for it and they're doing it anyway. So would you.",
      note: '',
    },

    // 07:30 — the eruption, on the vent line's published interval, and the
    // herd stampedes the terrace: station-breaking, road-closing, and not an
    // attack (§7). Loud, because forty seconds of herd at speed is the road
    // audibly closing.
    {
      atTick: T(7, 30),
      kind: 'say',
      speaker: 'Foreman Corwin Osk',
      text: "That's weather, not an attack. Hold the road and let it spend itself.",
      note: '',
    },
    {
      atTick: T(7, 30),
      kind: 'creature',
      tag: 'grazer-a',
      driveTo: { x: 2100, y: 950 },
      untilTick: T(8, 10),
      loud: true,
      note: 'The stampede — the road is weather for forty seconds',
    },
    {
      atTick: T(7, 30),
      kind: 'creature',
      tag: 'grazer-b',
      driveTo: { x: 2700, y: 850 },
      untilTick: T(8, 10),
      loud: true,
      note: '',
    },
    {
      atTick: T(7, 30),
      kind: 'creature',
      tag: 'grazer-c',
      driveTo: { x: 1200, y: 900 },
      untilTick: T(8, 10),
      loud: true,
      note: '',
    },
    {
      atTick: T(7, 30),
      kind: 'creature',
      tag: 'grazer-d',
      driveTo: { x: 1800, y: 800 },
      untilTick: T(8, 10),
      loud: true,
      note: '',
    },

    // 08:30 — the second pack is on the field (§9). It enters up the Scar —
    // the wound carries its approach to everything listening — and is then
    // released to the same doctrine as the first.
    {
      atTick: T(8, 30),
      kind: 'creature',
      tag: 'pack-two-a',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 1100, y: 2350, depthM: 900 },
      driveTo: { x: 1500, y: 2300 },
      untilTick: T(9, 30),
      loud: true,
      note: 'The second pack, up the channel the blowout cut',
    },
    {
      atTick: T(8, 30),
      kind: 'creature',
      tag: 'pack-two-b',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 1050, y: 2500, depthM: 900 },
      driveTo: { x: 1450, y: 2450 },
      untilTick: T(9, 30),
      loud: true,
      note: '',
    },
    {
      atTick: T(8, 30),
      kind: 'creature',
      tag: 'pack-two-c',
      species: FaunaSpecies.Draymaw,
      spawnAt: { x: 1150, y: 2200, depthM: 900 },
      driveTo: { x: 1550, y: 2150 },
      untilTick: T(9, 30),
      loud: true,
      note: '',
    },

    // 11:30 — the fall shifts. Part of Face Six closes; the complaint climbs
    // a register and stays there (§8). The chamber's bearing does not move
    // and the taps do not stop. §8 points at §12 for Osk naming the shift,
    // and §12 authors no line for it — the register climb is the mix's to
    // carry, and this file does not invent dialogue the document did not
    // write.
    {
      atTick: T(11, 30),
      kind: 'ground',
      region: 'fall-stage',
      ...SOLID,
      note: 'The fall shifts — a stage of Face Six goes, at every depth',
    },

    // 12:30 — loaded and under way (§12).
    {
      atTick: T(12, 30),
      kind: 'say',
      speaker: 'Lift Foreman Dessa Vail',
      text: "Loaded and under way. We are the loudest thing on this field, and I'd thank the escort to go on being louder.",
      note: '',
    },

    // 16:00 — the haul home, both packs attending (§9). The first pack is
    // pressed to the road, loud: this is the last loud beat, two minutes
    // ahead of the close, which is §10's sixty seconds paid twice over — on
    // top of the complaint the ground has been playing since the first tick.
    {
      atTick: T(16),
      kind: 'creature',
      tag: 'pack-one-a',
      driveTo: { x: 2000, y: 1500 },
      untilTick: T(17),
      loud: true,
      note: 'The pack presses the road home — the pressure invoices to the end',
    },

    // 18:00 — the last of the fall goes, and the writ closes at the count.
    // Ground first, resolve second, in beat order at the same tick: a chamber
    // still inside the fall when it closes is inside it (§8).
    {
      atTick: T(18),
      kind: 'ground',
      region: 'face',
      ...SOLID,
      note: 'The fall closes. Face Six is rock, at every depth',
    },
    { atTick: T(18), kind: 'resolve', note: 'Whatever the count is, the Board reads it' },
  ],

  /**
   * §8's Results table, verbatim — the Board's three readings. The keystone
   * flag above is what keeps the middle one honest: it is read only over a
   * recovered chamber.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      'Three assets returned to the registry. Contents of 9-06-200: seventeen, alive, reassigned. The face is closed. The ledger notes no exceptions, and notes the cost in the usual place.',
    [MissionOutcome.Partial]:
      'The chamber is recovered. The remainder is written down. A write-down is not a tragedy; log it as an exception and continue.',
    [MissionOutcome.Lost]:
      'The chamber did not come out. The registry keeps the number. The Board does not strike assets, and it will not strike this one.',
  },
};
