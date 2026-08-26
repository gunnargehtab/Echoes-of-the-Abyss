/**
 * Prologue — Sorrowgate. docs/mission-sorrowgate.md, transcribed.
 *
 * A data literal, in the idiom of `sim/maps/`: no logic, no loader, no schema
 * validator, so a mistyped tag or an objective that names a region nobody
 * authored fails at build time. The document owns every number here — the
 * regions, the beat times, the ceiling, the radius, the counts — and where this
 * file and that document disagree, one of them is wrong and the fix says which.
 *
 * Four things make this mission the shape it is, and all four are data:
 *
 * - **The flight cannot shoot, cannot transmit, and cannot be shot at.** Every
 *   hull admitted to the chamber is admitted weapons-cold, which is the court's
 *   procedure applied evenly and also the only honest way to stage five parties
 *   around one exchange: hostility in this simulation is `Owner.slot` and there
 *   is no neutrality in it (§3).
 * - **The court's array is a Cantor the player owns on loan.** It is authored
 *   into the player's own party so `aurasSystem` grants it with no engine
 *   change, and the runtime withdraws it by moving it to `courtSlot` while the
 *   flight is in silence-debt (§4).
 * - **The mission is decided by where four hulls are, not by what they do.** A
 *   tender moves only while an escort is inside `escortRadiusM`, there are two
 *   tenders and one flight, and the player cannot be in both places (§8).
 * - **Nothing on this map is coming for the player.** The colossus comes for
 *   the emitter and never notices a Light Scout. The player is safe and useless,
 *   and the stake is fourteen other people (§7).
 */

import {
  Faction,
  FaunaSpecies,
  MissionOutcome,
  ObjectiveStatus,
  PROLOGUE_SORROWGATE_HEADER,
  SIM,
  StructureKind,
  UnitKind,
} from '@echoes/shared';

import type { MissionDefinition } from './types.ts';

/**
 * §9's beat table is written in mm:ss and the simulation counts ticks. Written
 * as the conversion rather than as the products, so the schedule below can be
 * read against the document a line at a time.
 */
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

/**
 * Slots, all below `MAX_SLOTS` and none of them the Drift's.
 *
 * Only `PLAYER` is ever seated: the Echo Layer resolves listeners and pingers
 * by `Owner.slot` rather than by the seated roster, so a scripted party still
 * hears, still emits, and — the beat this whole mission turns on — still lights
 * the player when it transmits.
 */
const PLAYER = 0;
/**
 * The court holds a slot and no navy. Its one asset is the gate, and the gate
 * belongs to nobody, which is why it is given no faction anywhere in this file:
 * the enumeration has four members and none of them is neutral (§2). The slot
 * exists so that withdrawing the array has somewhere to withdraw it to.
 */
const COURT = 1;
const CONSORTIUM = 2;
const COMMUNE = 3;
const OBSERVER = 4;
const KNIGHTS = 5;

/** The dome, and what the colossus is steering at. */
const GATE = { x: 2550, y: 2750 };
/** Where it is when the ping reaches it, and where it turns. */
const BASIN_EAST = { x: 3250, y: 3700 };
const BASIN_WEST = { x: 1900, y: 3700 };

export const PROLOGUE_SORROWGATE: MissionDefinition = {
  ...PROLOGUE_SORROWGATE_HEADER,
  doc: 'docs/mission-sorrowgate.md',
  playerSlot: PLAYER,
  /**
   * The court has no navy. It has four hulls that were given to it, and every
   * party in the chamber can hear whose engines they are — the Commune is the
   * only faction whose gift of warcraft nobody reads as a fleet posture (§2).
   * So the flight carries the Commune's faction value and so does the Commune
   * delegation standing across the chamber from it. Two parties, one faction,
   * which is legal because a mission seats its own parties and never goes
   * through the lobby's uniqueness check. That is the mission's opening tension
   * rather than a workaround for one.
   */
  playerFaction: Faction.Pelagia,
  courtSlot: COURT,
  /**
   * No Drift. The one creature on this map is authored, arrives on a beat, and
   * is the mission; a populated Drift would put ambient contacts in the water
   * during the four minutes §10 sets aside for the player to learn what a
   * quiet meter looks like.
   */
  fauna: false,
  /**
   * §9 — the budget and the silence order are the same number, and that is the
   * point. This is the one mission where the SIG budget is a rule the player
   * can feel rather than a note in the margin.
   */
  sigBudget: 20,
  arrayTag: 'array',
  silenceCeilingSig: 20,
  /**
   * §4 — debt repays a second for a second and caps here, so one catastrophic
   * breach cannot black out the rest of the mission. Dread, not confusion.
   */
  debtCapS: 60,
  /**
   * §8 — the tenders are deaf at HYD 30 and the route out is Coral Ruins with
   * hard acoustic shadows. A deaf hull in a drowned district does not move
   * without ears, so this radius is the escort: it is made entirely of
   * listening and position, and nothing is ever shot at.
   */
  escortRadiusM: 400,

  regions: [
    {
      id: 'concourse',
      x: 1600,
      y: 0,
      widthM: 1800,
      heightM: 700,
      note: 'The Upper Concourse — the passenger terminus, above the layer. Where the count is measured',
    },
  ],
  markers: [
    {
      id: 'concourse',
      label: 'The Concourse is above the layer. Nothing follows you up.',
      x: 2500,
      y: 350,
      radiusM: 900,
    },
  ],

  parties: [
    {
      slot: PLAYER,
      faction: Faction.Pelagia,
      note: "The court's escort flight, the two tenders it is escorting, and the array it is lent while it is quiet",
      units: [
        // Four Light Scouts, court-refitted, hardpoints struck. HYD 70 is the
        // best mobile ears outside the Directorate and this is a mission about
        // hearing; SIG 6 idle / 12 cruise is the widest swing off the lowest
        // floor in the roster, which is what a ceiling needs before moving is
        // audibly a decision (§3).
        //
        // PR 1 covers the Shelf only and the court sits at 1,500 m, so the
        // refit rates them for Mid-Water and stops there. They cannot enter the
        // basin, which needs PR 3. That floor is the mission's, and it is
        // authored rather than incidental.
        {
          tag: 'escort-1',
          kind: UnitKind.LightScout,
          x: 2400,
          y: 2200,
          depthM: 1450,
          role: 'escort',
          pressureRating: 2,
          note: 'Escort One, west of the arch',
        },
        {
          tag: 'escort-2',
          kind: UnitKind.LightScout,
          x: 2550,
          y: 2150,
          depthM: 1450,
          role: 'escort',
          pressureRating: 2,
          note: 'Escort Two, on the arch',
        },
        {
          tag: 'escort-3',
          kind: UnitKind.LightScout,
          x: 2700,
          y: 2200,
          depthM: 1450,
          role: 'escort',
          pressureRating: 2,
          note: 'Escort Three, east of the arch',
        },
        {
          tag: 'escort-4',
          kind: UnitKind.LightScout,
          x: 2550,
          y: 2330,
          depthM: 1450,
          role: 'escort',
          pressureRating: 2,
          note: 'Escort Four, inside the chamber',
        },
        // Harvester hulls with the dredge gear stripped — a poor court's
        // freight, which is what Halloran has. No refit: the Harvester is
        // already PR 2 in the roster, and restating a number the roster owns is
        // how the two of them start disagreeing. HYD 30 is below the floor for
        // reading even a battle's residue, so these are the loudest deaf things
        // on the map and that is exactly why they need ears (§4, §8).
        {
          tag: 'tender-1',
          kind: UnitKind.Harvester,
          x: 2420,
          y: 2900,
          depthM: 1470,
          role: 'tender',
          releaseTick: T(11, 20),
          souls: 9,
          note: 'Tender One. Nine plateau-hands, taken off a face two parties have called theirs',
        },
        {
          tag: 'tender-2',
          kind: UnitKind.Harvester,
          x: 2680,
          y: 2900,
          depthM: 1470,
          role: 'tender',
          releaseTick: T(13, 40),
          souls: 5,
          note: 'Tender Two. Five survey crew who went into plateau water and did not come out',
        },
      ],
      structures: [
        // The transit line's civic hydrophone array, larger than anything any
        // faction has built since, because the Rift lost things. A Cantor and
        // not a second kind of instrument: "listening dome — raises allied HYD
        // under it" is the same technology, and §4 is explicit that the grant,
        // the radius and the cap are the Cantor's unchanged. A Light Scout
        // therefore hears at 95 under the dome and 70 outside it.
        //
        // Owned by the player because that is the only way `aurasSystem` grants
        // it — the aura filters on `Owner.slot`. Which is also what makes
        // silence-debt free: the runtime moves it to `courtSlot` and the grant
        // stops on the next tick, with no engine change and no new constant.
        {
          tag: 'array',
          kind: StructureKind.Cantor,
          x: GATE.x,
          y: GATE.y,
          depthM: 1450,
          note: "The court's array, on the arch. Shared with every admitted party, which is the only reason anybody trusts the place",
        },
      ],
    },
    {
      slot: CONSORTIUM,
      faction: Faction.Bathyarch,
      note: 'Underwriter Sela Drenn, holding the east. Being asked to sign for fourteen people with an unresolved contact on her approach',
      units: [
        {
          tag: 'drenn',
          kind: UnitKind.Cruiser,
          x: 3350,
          y: 2700,
          depthM: 1450,
          note: 'Drenn. Fires the one emission at 09:00, and is large enough to be in the arch when the arch goes',
        },
        {
          tag: 'consortium-1',
          kind: UnitKind.Corvette,
          x: 3400,
          y: 2920,
          depthM: 1450,
          note: 'Escort, south',
        },
        {
          tag: 'consortium-2',
          kind: UnitKind.Corvette,
          x: 3400,
          y: 2480,
          depthM: 1450,
          note: 'Escort, north',
        },
      ],
    },
    {
      slot: COMMUNE,
      faction: Faction.Pelagia,
      note: 'Warden Juno Teel, holding the west. Sorrowgate is the second chamber in her life where the boats are not big enough',
      // Refitted to PR 2, for the same reason the flight is and stated here
      // because it is easy to miss: the Light Scout is the only hull in this
      // chamber that is PR 1 by roster, and the court sits at 1,500 m. Without
      // the refit these three take unhealable crush from tick zero and are
      // dead inside a minute — with every Commune beat after that silently
      // no-opping on a missing tag, and Teel delivering her line at 10:40 from
      // a delegation that is not there. `missions.test.ts` asserts every
      // authored hull's rating admits the depth it is authored at.
      units: [
        {
          tag: 'commune-1',
          kind: UnitKind.LightScout,
          x: 1700,
          y: 2600,
          depthM: 1450,
          pressureRating: 2,
          note: '',
        },
        {
          tag: 'commune-2',
          kind: UnitKind.LightScout,
          x: 1700,
          y: 2820,
          depthM: 1450,
          pressureRating: 2,
          note: '',
        },
        {
          tag: 'commune-3',
          kind: UnitKind.LightScout,
          x: 1700,
          y: 2400,
          depthM: 1450,
          pressureRating: 2,
          note: '',
        },
      ],
    },
    {
      slot: OBSERVER,
      faction: Faction.Directorate,
      note: 'Sende, who carries one name and regards that as an honour. Was already here at 00:00 and has no beat in the schedule, because the observer does not move',
      units: [
        {
          tag: 'sende',
          kind: UnitKind.AbyssalSubmersible,
          x: 2550,
          y: 2950,
          depthM: 1490,
          note: 'The one hull in the chamber rated for the water underneath it, sitting still',
        },
      ],
    },
    {
      slot: KNIGHTS,
      faction: Faction.Hadron,
      // Parked in the Thermal Vein rather than spawned on the beat: PF 0.45
      // masks her until she comes in, which is how a party can be present from
      // tick zero and still *arrive* at 06:20. She is also the reason the West
      // Approach is on the map at all, and nothing tells the player either
      // thing (§11).
      note: 'Voice Ren Kalliso, neither invited nor refused. Waiting out on the West Approach until she states her position',
      units: [
        {
          tag: 'kalliso-1',
          kind: UnitKind.Corvette,
          // She waits just outside the interval, not halfway across the map:
          // her flickers are timed against the beat table, and a long silent
          // transit would still be under way when the first one fires — which
          // is what put her out at 2,400 m, inaudible, through both of them.
          // The few ticks before her silence order lands cost a single Tier-2
          // sample from here, which is a hull heard once and never again.
          x: 745,
          y: 745,
          depthM: 1450,
          note: 'Kalliso',
        },
        {
          tag: 'kalliso-2',
          kind: UnitKind.Corvette,
          x: 835,
          y: 830,
          depthM: 1450,
          note: 'Her second',
        },
      ],
    },
  ],

  // §3 reads the prohibition as three clauses and so does this: no weapon, no
  // countermeasure, no transmit. The reasons are shown verbatim beside the dead
  // affordance, so the player is told before they reach for it rather than
  // refused after — the court does not disable a thing quietly, it strikes the
  // hardpoints in front of everybody and leaves the tools on the table.
  locks: [
    { ability: 'weapons', reason: 'weapons cold — the hardpoints are on the table' },
    { ability: 'torpedoes', reason: 'weapons cold — the hardpoints are on the table' },
    { ability: 'mines', reason: "weapons cold — nothing of yours is left in the court's water" },
    {
      ability: 'depthCharges',
      reason: "weapons cold — nothing of yours is left in the court's water",
    },
    { ability: 'noisemakers', reason: 'disabled — silence order' },
    { ability: 'activeSonar', reason: 'disabled — the array was pulled with the hardpoints' },
  ],

  /**
   * §12's "Objective readings, in play", verbatim. The court states facts about
   * the room and they function as instructions, which is a thing no other
   * register in this setting can do: the Commune cannot command, the Consortium
   * would price it, the Directorate would put it in the passive, and the
   * Knights would be courteous about it.
   */
  objectives: [
    {
      id: 'station',
      text: 'The flight holds at the arch.',
      initial: ObjectiveStatus.Pending,
      // The station ends when the arch does. Nothing else about the first ten
      // minutes is a task, on purpose: §10 gives them to SIG, to the array, and
      // to a contact that will not resolve.
      predicate: { kind: 'endure', ticks: T(10, 40) },
    },
    {
      id: 'silence',
      text: 'The flight stays under twenty.',
      debtText: 'The flight owes the court a silence.',
      initial: ObjectiveStatus.Pending,
      // The simulation does not clamp loudness; it notices it. Breaching this
      // costs the flight the array and never the mission, which is §4 stated
      // flatly so it stays true.
      predicate: { kind: 'quiet', role: 'escort', ceilingSig: 20 },
    },
    {
      id: 'tender-one',
      text: 'Tender One is loaded. Tender One does not move without ears.',
      initial: ObjectiveStatus.Pending,
      revealAtTick: T(11, 20),
      markerId: 'concourse',
      // Terminal, like the objective below it, because §8's table is a count
      // and the runtime reads the count off the terminal objectives: one of the
      // two met is "nine are out", both is "fourteen out", neither is a closed
      // gate. A partial is a result the court reads aloud, not a soft failure
      // and not a mission the player is asked to replay.
      terminal: true,
      predicate: { kind: 'extract', role: 'tender', region: 'concourse', count: 1 },
    },
    {
      id: 'tender-two',
      text: 'Tender Two is loaded. The gate is open, and it will not be open twice.',
      initial: ObjectiveStatus.Pending,
      revealAtTick: T(13, 40),
      markerId: 'concourse',
      // The second half of the count. Both met is the only thing that means
      // fourteen out, and the mission closes the moment it is — the court does
      // not keep sitting once everybody is out.
      terminal: true,
      predicate: { kind: 'extract', role: 'tender', region: 'concourse', count: 2 },
    },
  ],

  /**
   * §9's beat table, in its order. Twenty minutes, inside §10's 12–25.
   *
   * The array is lost to an authored beat rather than to the colossus's
   * pathing, because a mission's beats have to happen at the time the document
   * says they happen. The colossus is why; the beat is when.
   */
  beats: [
    // 00:00 — the Knight is already out there, and already quiet.
    //
    // Silenced on the first tick rather than on arrival, because she spawns
    // 1,650 m out and a Knight running open at that range is a solid Tier 3
    // from the opening second — which tells the player, before anything has
    // happened, exactly what §6 spends three minutes refusing to tell them.
    // Quiet from the start she is simply not there until she comes to the
    // interval, which is what "arrives" means (§9).
    { atTick: 0, kind: 'silent', tag: 'kalliso-1', active: true, note: 'Quiet on approach' },
    { atTick: 0, kind: 'silent', tag: 'kalliso-2', active: true, note: '' },

    // 04:00 — the delegations take station. Consortium east, Commune west. The
    // Directorate observer was already here and has no beat.
    {
      atTick: T(4),
      kind: 'move',
      tag: 'drenn',
      x: 2880,
      y: 2620,
      note: 'The Consortium takes the east of the chamber',
    },
    { atTick: T(4), kind: 'move', tag: 'consortium-1', x: 2900, y: 2860, note: '' },
    { atTick: T(4), kind: 'move', tag: 'consortium-2', x: 2900, y: 2400, note: '' },
    {
      atTick: T(4),
      kind: 'move',
      tag: 'commune-1',
      x: 2220,
      y: 2600,
      note: 'The Commune takes the west',
    },
    { atTick: T(4), kind: 'move', tag: 'commune-2', x: 2220, y: 2840, note: '' },
    { atTick: T(4), kind: 'move', tag: 'commune-3', x: 2220, y: 2420, note: '' },

    // 06:20 — Kalliso arrives from the north-west, states her position, holds.
    //
    // **The interval is a measured distance, not a manner.** Measured on this
    // map, against the court's array, an open Corvette reads Tier 4 at 1,300 m,
    // Tier 3 from 1,500 to 1,900 m, and Tier 2 at 2,100 m; silent, she is
    // simply not there at any of them. So she holds at about 2,150 m and runs
    // silent, and the two flickers below drop the order for a few seconds
    // each — which is the only way to produce §9's sentence with this Echo
    // model: nothing, briefly Tier 2 as she turns, nothing.
    // She has to sit in
    // the narrow band where a silent Knight is a contact that will not resolve:
    // measured against this map and the court's array, a silent Corvette reads
    // Tier 4 at 280 m, Tier 2 at 870 m, is still heard at 1,100 m and is gone
    // by 1,300 m. Anywhere inside a kilometre and the player simply watches
    // her, which deletes the mission's third teaching beat (§10) and leaves
    // Drenn pinging to grade a contact everyone can already see (§6). She holds
    // at roughly 1,200 m — inside the band, close enough to its far edge that
    // she flickers exactly as §9 describes: present, gone, briefly higher as
    // she turns, gone again.
    {
      atTick: T(6, 20),
      kind: 'move',
      tag: 'kalliso-1',
      x: 823,
      y: 817,
      note: 'She holds the interval at the arch and takes no part',
    },
    { atTick: T(6, 20), kind: 'move', tag: 'kalliso-2', x: 910, y: 900, note: '' },
    {
      atTick: T(6, 20),
      kind: 'say',
      speaker: 'Voice Ren Kalliso',
      text: 'I have not been invited and I have not been refused. I will hold the interval at the arch and take no part. If the court would rather I were elsewhere, the court has only to say so, and I am elsewhere within the tide.',
      // §13: the `say` channel carries these to the mission log beside the
      // orders panel. What does not exist is any *sound* — nobody is heard, so
      // a player with their eyes on the water misses all four.
      note: 'Read, not heard',
    },

    // 06:20–09:00 — she flickers: nothing, then Tier 2 for a few seconds as
    // she turns, then nothing again. This is where the player learns what a
    // tier is, by failing to raise one (§10). The document gives the window and
    // the behaviour; the instants are the only part of these beats it does not
    // state. Measured, she never climbs past Tier 2 and is therefore never
    // factioned — `missionRuntime.test.ts` is what holds her there.
    // A turn in place, and it has to stay one. These targets were briefly a
    // pair of positions at the arch, which is not a flicker but an approach:
    // she crossed the interval, parked 330 m off the flight and read a solid
    // Tier 4 from there for the rest of the mission. Sixty metres is a hull
    // coming round; the loudness is the point, not the distance.
    //
    // She stays silent through it, too. Dropping the order to make her audible
    // put a Knight at cruise inside the array's circle, which does not flicker
    // — it classifies her outright, and a graded contact is the one thing §6
    // needs Drenn not to have. A silent hull under way is louder than a silent
    // hull holding, and that difference is the whole of the flicker.
    { atTick: T(7, 30), kind: 'silent', tag: 'kalliso-1', active: false, note: '' },
    {
      atTick: T(7, 30),
      kind: 'move',
      tag: 'kalliso-1',
      x: 870,
      y: 860,
      note: 'A second of Tier 2 as she comes round, without closing',
    },
    { atTick: T(7, 45), kind: 'silent', tag: 'kalliso-1', active: true, note: '' },
    { atTick: T(8, 20), kind: 'silent', tag: 'kalliso-2', active: false, note: '' },
    { atTick: T(8, 20), kind: 'move', tag: 'kalliso-2', x: 960, y: 945, note: '' },
    { atTick: T(8, 35), kind: 'silent', tag: 'kalliso-2', active: true, note: '' },

    // 09:00 — Drenn pings. Nobody in this chamber is wrong: the Knight causes
    // the disaster by being quiet and polite, the Underwriter by being
    // procedurally correct, and the court by having built its neutrality
    // directly over the thing it depends on not being disturbed (§6).
    {
      atTick: T(9),
      kind: 'say',
      speaker: 'Underwriter Sela Drenn',
      text: 'There is an unquantified contact on my approach and I am being asked to sign for fourteen people. I do not sign for an exposure I cannot grade. One emission. Log it as taken on my authority.',
      note: '',
    },
    // SIG 95, omnidirectional, and three seconds in which everything in the
    // chamber is exact. The player is lit for the first time in the game and
    // has no button to answer with, because the active array was pulled with
    // the hardpoints. That is the design working.
    {
      atTick: T(9),
      kind: 'ping',
      tag: 'drenn',
      note: 'The one emission. Everything downstream of it is the simulation, not the script',
    },

    // 09:20 — the calling voice. A Sounder reads an active emission inside its
    // corridor as a challenge call and alters course toward the emitter. It is
    // not coming for the player and never notices the player at all.
    {
      atTick: T(9, 20),
      kind: 'creature',
      tag: 'sounder',
      species: FaunaSpecies.Sounder,
      spawnAt: { x: BASIN_EAST.x, y: BASIN_EAST.y, depthM: 2200 },
      driveTo: GATE,
      untilTick: T(10, 40),
      loud: true,
      note: 'It has been in this basin for forty-nine years and has never had a reason to move',
    },
    {
      atTick: T(9, 20),
      kind: 'say',
      speaker: 'Sende',
      text: 'It has been answered. Nothing further is required of anyone here. It will pass, and then it will pass again.',
      note: '',
    },

    // 10:40 — the transit. The arch goes and the court's array goes with it.
    // The dome holds. The service lock is now the only way out, and the flight
    // is on its own ears from here: the last phase runs deaf, against ghost
    // markers twenty seconds stale, which is what §10 says it teaches.
    {
      atTick: T(10, 40),
      kind: 'lose',
      tag: 'array',
      note: 'The array. The order does not lift with it — Halloran does not lift it, because the order is what keeps the flight quiet enough to hear anything at all',
    },
    {
      atTick: T(10, 40),
      kind: 'lose',
      tag: 'drenn',
      // §7 — it takes whatever is large enough to be in the arch when it goes
      // through. A Cruiser is; a tender is not. The emitter is the one thing on
      // this map the colossus was steering at.
      note: 'The emitter, which was standing in the middle of the exchange',
    },
    // The delegations scatter. Not one of them engages, because nothing can.
    { atTick: T(10, 40), kind: 'move', tag: 'consortium-1', x: 3900, y: 2900, note: '' },
    { atTick: T(10, 40), kind: 'move', tag: 'consortium-2', x: 3900, y: 2450, note: '' },
    {
      atTick: T(10, 40),
      kind: 'move',
      tag: 'commune-1',
      x: 1150,
      y: 2000,
      note: 'The Commune withdraws onto the vein it came in over',
    },
    { atTick: T(10, 40), kind: 'move', tag: 'commune-2', x: 1050, y: 2150, note: '' },
    { atTick: T(10, 40), kind: 'move', tag: 'commune-3', x: 1200, y: 1800, note: '' },
    { atTick: T(10, 40), kind: 'move', tag: 'kalliso-1', x: 1600, y: 1350, note: '' },
    { atTick: T(10, 40), kind: 'move', tag: 'kalliso-2', x: 1680, y: 1280, note: '' },
    {
      atTick: T(10, 40),
      kind: 'say',
      speaker: 'Warden Juno Teel',
      text: "We're not asking anybody to move. We're saying the water has changed and we'd rather everyone were somewhere else while we finish turning it.",
      note: '',
    },
    {
      atTick: T(10, 40),
      kind: 'creature',
      tag: 'sounder',
      driveTo: BASIN_WEST,
      untilTick: T(14, 30),
      loud: false,
      note: 'It holds the course through the arch and out along the basin, because that is what the corridor is',
    },

    // 11:20 and 13:40 — the loads. Two, because the chamber has two ways out
    // and only one of them is wide, and after the transit the wide one is gone.
    { atTick: T(11, 20), kind: 'release', tag: 'tender-1', note: 'Tender One is loaded' },
    { atTick: T(13, 40), kind: 'release', tag: 'tender-2', note: 'Tender Two is loaded' },

    // 14:30 — the second calling voice, from the far end of the basin. SIG 100,
    // non-directional: the only sound in the game that means you have made a
    // mistake that is now coming, and the player has already been taught what
    // it means. Five and a half minutes of warning against §10's sixty-second
    // requirement, and the wounded dome is complaining underneath it the whole
    // way in.
    {
      atTick: T(14, 30),
      kind: 'creature',
      tag: 'sounder',
      driveTo: GATE,
      untilTick: T(20),
      loud: true,
      note: 'The colossus has turned',
    },

    // 20:00 — the court adjourns. The dome comes down on whatever is still
    // inside it and the record closes on whatever count the player earned.
    // Authored rather than emergent: a Sounder cannot damage a Harvester at
    // all, so the creature is why the chamber stops existing and the beat is
    // when (§8).
    { atTick: T(20), kind: 'resolve', note: 'The second transit. The gate goes' },
  ],

  /**
   * §8's Results table, verbatim. A partial result ends the mission and *is* a
   * result — not a soft failure, and the player is not asked to replay it. This
   * is where the game teaches that a number it read out loud is the whole
   * outcome.
   */
  epilogue: {
    [MissionOutcome.Complete]:
      'Fourteen out. Nothing about this is finished, and the court has no part in the rest of it. The record is closed. The court adjourns.',
    // Either tender may be the one that gets through, so this reading names no
    // number: the objectives are a count ladder rather than two identities, and
    // a court that said "nine are out" would be reading a count it had not
    // taken (§8).
    [MissionOutcome.Partial]:
      'One tender is through. The rest are in the record. The count will be read in this chamber when there is a chamber, and until then it stands as read.',
    [MissionOutcome.Lost]:
      'The gate is closed. Fourteen are behind it. The record will be read, and then the court will adjourn, and this court will not open again.',
  },
};
