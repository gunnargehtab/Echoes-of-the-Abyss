/**
 * Shared domain types for Echoes of the Abyss.
 *
 * These describe the wire contract between the authoritative simulation
 * (packages/backend) and the renderer (packages/frontend).
 */

import type { FaunaSpecies } from './fauna.js';

/** The four powers. See docs/factions.md. */
export enum Faction {
  Bathyarch = 0,
  Pelagia = 1,
  Directorate = 2,
  Hadron = 3,
}

/**
 * Detection is graded, not binary. See docs/systems-echo.md §4.
 *
 * Tiers run 0-4, ending at Track: it reveals everything the Echo Layer
 * models, so there is nothing above it. The glossary agrees since the
 * tier-count resolution (issue #34); an earlier draft listed a fifth tier.
 */
export enum ResolutionTier {
  /** Not detected. Nothing is shown. */
  Silent = 0,
  /** "Something is out there." Directionless smudge on the minimap. */
  Contact = 1,
  /** Direction and rough distance, blurred to +/-15% of true position. */
  Bearing = 2,
  /** Unit type and count estimate. */
  Classification = 3,
  /** Full resolution: exact unit, health, facing. */
  Track = 4,
}

/** Terrain biomes, which set the PropagationFactor. See docs/environments.md. */
export enum Biome {
  OpenWater = 0,
  ThermalVein = 1,
  KelpForest = 2,
  AbyssalTrench = 3,
  ResonanceField = 4,
  CoralRuins = 5,
}

/** Vertical bands. Value increases with depth, so does cost. docs/systems-depth.md §1. */
export enum DepthBand {
  Shelf = 0,
  MidWater = 1,
  Abyssal = 2,
}

/**
 * Which side of the thermocline a depth sits on — docs/systems-echo.md §3.
 *
 * Contiguous 0/1/2 on purpose: it indexes the pair-factor table, and a gap or
 * a reorder there silently reads the wrong multiplier.
 */
export enum ThermoclineZone {
  Above = 0,
  Duct = 1,
  Below = 2,
}

/**
 * Extractable resources. docs/economy.md §2 lists four; two are modelled.
 *
 * The pair here is deliberate: Nodule is the bulk resource that funds the
 * ordinary game, and Resonance Crystal is "the reason anybody goes deep at
 * all" (§2) — the tech gate, and almost entirely Abyssal (§7). Thermal Draw
 * is a rate rather than a stockpile and Biomass needs the Drift, so both wait
 * for their own systems.
 */
export enum ResourceKind {
  Nodule = 0,
  ResonanceCrystal = 1,
}

/** Prototype unit roster. Stats live in units.ts. See docs/units.md. */
export enum UnitKind {
  LightScout = 0,
  Corvette = 1,
  Cruiser = 2,
  AbyssalSubmersible = 3,
  Harvester = 4,
}

/** Prototype structure roster. Stats live in structures.ts. See docs/units.md. */
export enum StructureKind {
  /**
   * The command bastion — HQ. Commissions new structures, accepts harvester
   * deposits, and is the match's stake: lose it and you are eliminated.
   */
  Bastion = 0,
  /** Deposit point for harvesters. Loudest permanent thing you own. */
  Refinery = 1,
  /** Unit production. Loud while the line is running. */
  Foundry = 2,
  /** Static defence. Quiet listener until it fires. */
  SentinelTurret = 3,
  /** Consortium only: noise-masking support — a PF bubble for loud armies. */
  BaffleBarge = 4,
  /** Directorate only: listening dome — raises allied HYD under it. */
  Cantor = 5,
  /** Hadron only: resonance node — projects depth access (PR+1) around it. */
  SoundingSpire = 6,
  /** Pelagia only: living spore cloud — quiets and deafens everything inside. */
  SporeVeil = 7,
  /**
   * Vent tap — Thermal Draw capacity, buildable only on Thermal Vein terrain.
   *
   * The structure that gives the game's best masking terrain (PF 0.45) a
   * reason to be contested. It is loud precisely where the ground is quiet:
   * a tap turns your best hiding place into a beacon, which is the tension
   * the whole resource exists to create (docs/economy.md §2).
   */
  VentTap = 8,
}

/**
 * Ordnance — things a weapon puts in the water rather than damage it applies.
 * docs/systems-combat.md §2, the weapon triangle.
 *
 * Deliberately *not* UnitKind. Ordnance carries Position, Acoustic, Owner and
 * Health like a hull, so the Echo Layer resolves it with no special case — a
 * running torpedo is a contact because nothing marks it out as anything else,
 * and the defender hears it coming (§1, rule 2). What separates it from a hull
 * is that nobody steers it: it has no MoveOrder, and its seeker is its own.
 */
export enum OrdnanceKind {
  /** §5 — physical, homing, scarce. Emits SIG 60 its whole run. */
  Torpedo = 0,
  /** §6 — silent, patient, positional. A listener that waits for you to be loud. */
  Mine = 1,
  /** §5 — a decoy that saves the hull by being louder than it. */
  Noisemaker = 2,
  /** §8 — the weapon that crosses depth bands. */
  DepthCharge = 3,
}

/**
 * Harvester throttle — the economy's central decision surface: how loud am I
 * willing to be paid. docs/economy.md §3.
 */
export enum HarvestThrottle {
  Idle = 0,
  Trickle = 1,
  Standard = 2,
  Overburden = 3,
}

/**
 * One resolved enemy contact, as delivered to a single player.
 *
 * The server sends only what the listener earned at their tier: low tiers
 * deliberately omit fields rather than sending them for the client to hide.
 * A client that never receives the data cannot maphack it.
 */
export interface Contact {
  /** Stable per-match id for this contact, so the client can track/decay it. */
  id: number;
  tier: ResolutionTier;
  /** World position in metres. Blurred at Tier 2, exact at Tier 3+. */
  x: number;
  y: number;
  /** Depth in metres. Only present at Tier 3+. */
  depth?: number;
  /** Only known at Tier 3+ (classification). Exactly one of kind/structure. */
  kind?: UnitKind;
  structure?: StructureKind;
  faction?: Faction;
  /**
   * Fauna species, at Tier 3+ only.
   *
   * docs/bestiary.md §3: "At Tier 1 and Tier 2 there is no marker, colour, or
   * sound that distinguishes fauna from an army. Classification at Tier 3 is
   * the moment you find out, and it is a genuine relief or a genuine problem."
   *
   * So this field appears at exactly the tier that names a *unit*, and never
   * before. A creature and a cruiser are the same smudge until then, which is
   * the whole reason fauna are worth having.
   */
  fauna?: FaunaSpecies;
  /**
   * Ordnance kind, at Tier 3+ only — the same wall `kind` and `fauna` sit
   * behind, for the same reason.
   *
   * docs/systems-combat.md §1 requires that a torpedo be audible its whole
   * run, not that it be *identifiable*: at Tier 1 a closing contact could be a
   * torpedo or a scout, and the seconds spent deciding which are the mechanic.
   * Classification is the moment you find out, and by then it is close.
   */
  ordnance?: OrdnanceKind;
  /** Only known at Tier 4 (track). */
  hp?: number;
  maxHp?: number;
  heading?: number;
  /** Server tick this contact was resolved on, for ghost-marker decay. */
  tick: number;
}

/**
 * Kinds of acoustic residue — docs/systems-echo.md §7.
 *
 * Deliberately coarse. A mark reports that this water was recently violent,
 * or that someone has been working here; it never reports whose, or what was
 * lost. The scouting economy is built on the player doing that inference,
 * and a mark that named its owner would do the interesting half for them.
 */
export enum EchoMarkKind {
  /** A fight happened here. ~90 s. */
  Battle = 0,
  /** Something was destroyed here. ~3 minutes. */
  DestroyedStructure = 1,
  /** Someone is working here. Intensity tracks throughput. */
  IndustrialHum = 2,
  /**
   * A torpedo ran through here — docs/systems-combat.md §12.
   *
   * The faintest and shortest-lived residue in the game, and the most
   * *directional* information any of it carries: a line of wake marks says
   * which way ordnance flew, and therefore roughly where it was launched from
   * and what it was aimed at. A scout that arrives late reads the geometry of
   * a fight it did not see.
   */
  TorpedoWake = 3,
}

/**
 * One piece of residue, as the player who read it receives it.
 *
 * Resolved server-side against the listener's HYD, so a client only ever
 * holds marks its own units could actually hear — the same rule as contacts,
 * for the same reason.
 */
export interface EchoMarkInfo {
  /** Stable per-match id, so a client can watch one mark decay. */
  id: number;
  x: number;
  y: number;
  kind: EchoMarkKind;
  /** 0-1. For the hum this is the thing worth reading: it tracks throughput. */
  intensity: number;
}

/**
 * Environmental hazards — docs/hazards.md.
 *
 * Eight are specified; two are implemented. The rest are listed in the doc
 * with a status marker so the next contributor knows what exists.
 */
export type HazardKind =
  | 'geothermal-eruption'
  | 'toxic-brine'
  | 'kelp-entanglement'
  | 'cold-shock'
  | 'pressure-zone'
  | 'resonance-storm';

/**
 * Where a hazard is in its cycle.
 *
 * The **warning** phase is not decoration and not optional. `CLAUDE.md` fixes
 * the target emotion as "dread, not confusion", and an unannounced instant
 * kill is confusion: the player learns that the map is arbitrary rather than
 * that the map is dangerous. Every hazard therefore telegraphs before it acts,
 * and the telegraph is long enough to leave.
 */
export enum HazardPhase {
  /** Quiet. Visible as a site, doing nothing. */
  Dormant = 0,
  /** Telegraphing. Nothing is damaged yet. */
  Warning = 1,
  /** Acting. */
  Active = 2,
  /** Subsiding — effects taper rather than stop dead. */
  Decay = 3,
}

/**
 * A hazard, as every client sees it.
 *
 * Deliberately **public**, unlike almost everything else in this game.
 * docs/maps.md's core principles require hazard telegraphing — "players must
 * see danger before entering" — and a telegraph only one player can read is
 * not a telegraph. Hazards are terrain that moves, and terrain is public.
 */
export interface HazardState {
  id: number;
  kind: HazardKind;
  x: number;
  y: number;
  radiusM: number;
  phase: HazardPhase;
  /** 0-1 through the current phase, so the client can animate a countdown. */
  progress: number;
  /** Seconds left in the current phase — the number the HUD can show. */
  remainingS: number;
  /**
   * Which way a current flows, in radians, for `cold-shock` hazards.
   *
   * Public, like everything else on a hazard: docs/hazards.md §8 makes the
   * direction a learnable property of the map rather than something a player
   * discovers by losing their line to it. Absent for every other kind.
   */
  flowRad?: number;
}

/**
 * Thermal Draw — a rate, never a stockpile. docs/economy.md §2.
 *
 * "Consumed continuously rather than stockpiled." That is the whole point and
 * it is why this is a report rather than a balance: a stockpile lets a player
 * save up and spend at a moment of their choosing, while a rate means capacity
 * is a standing commitment tied to a place on the map — a vent tap you have to
 * hold, that is loud the entire time it is producing.
 *
 * Surplus is simply lost. Anything that banked it would turn this back into a
 * stockpile with extra steps.
 */
export interface DrawReport {
  /** Units of draw your taps are producing. */
  capacity: number;
  /** Units your structures are asking for. */
  demand: number;
  /**
   * 0-1: how much of demand capacity covers.
   *
   * Below 1 everything that needs power runs slower. Recoverable by building a
   * tap or losing a consumer — a deficit is a setback, never a spiral.
   */
  satisfaction: number;
}

/**
 * Where a room is in its life — docs/tech-stack.md.
 *
 * The room used to have no phases at all: it began simulating the moment it
 * was created and handed out identity by arrival order. That meant the first
 * player got a head start proportional to how long their friend took to load,
 * and nobody chose their navy — in a game whose four factions are its entire
 * asymmetry axis.
 */
export enum MatchPhase {
  /** Choosing factions and readying up. The simulation is not running. */
  Lobby = 0,
  /** Simulating. */
  Playing = 1,
  /** Resolved. A result stands, and a rematch can be called. */
  Ended = 2,
}

/**
 * How well an AI opponent is being commanded.
 *
 * **Decision quality, and nothing else.** A harder commander reacts sooner,
 * masses before it commits, and manages its own loudness; it never hears
 * anything a weaker one did not. Lives in shared rather than beside the AI
 * because it is a lobby-level fact — the other commander is entitled to know
 * what they agreed to play against.
 */
export enum AiDifficulty {
  /** Slow to react, fights with what it has, ignores its own exposure. */
  Recruit = 0,
  /** Reacts on the tick, masses before committing, manages loudness. */
  Veteran = 1,
}

/** Lobby-level facts a client needs, all of them public by nature. */
export interface LobbyPlayerView {
  sessionId: string;
  name: string;
  slot: number;
  faction: Faction;
  ready: boolean;
  connected: boolean;
  /** True for a seat driven by the skirmish AI rather than by a person. */
  isAi: boolean;
  /** Meaningful only when `isAi`. */
  difficulty: AiDifficulty;
}

/**
 * What a room tells the world about itself, before anyone is in it.
 *
 * The water and the seat count, and nothing else — not who is in there, not
 * which navies they hold, not their names. The ready room negotiates factions
 * among the people already in it; a public listing that named them would let a
 * fourth player counter-pick a match before joining, and one that named
 * commanders would let anyone choose who to avoid or who to hunt. This is a
 * game about hidden information, and a lobby list is the easiest place to give
 * it away by accident (docs/tech-stack.md, "Finding a match").
 *
 * Lives in shared because the room writes it and the browser reads it, and a
 * listing whose two halves disagreed would be a browser sending players at
 * rooms that are not there.
 */
export interface MatchListingMetadata {
  mapId: string;
  mapName: string;
  seats: number;
  /**
   * Seats taken, counting AI. Colyseus's own client count reports only
   * sockets, so a room holding one commander and two AI seats would advertise
   * three free chairs and refuse two of them on arrival.
   */
  filled: number;
}

/** One row of the match browser: a listing, plus the id needed to join it. */
export interface MatchListing extends MatchListingMetadata {
  roomId: string;
}

/** A unit the player owns. Always full detail — it is theirs. */
export interface OwnUnit {
  id: number;
  kind: UnitKind;
  x: number;
  y: number;
  depth: number;
  hp: number;
  maxHp: number;
  heading: number;
  /** Live acoustic signature, 0-100. Drives the HUD meter. */
  sig: number;
  silentRunning: boolean;
  /**
   * Depth the unit has been ordered to, when a depth change is in progress.
   * Absent once it arrives. The player's own order coming back to them, so
   * the HUD can draw where a hull is headed as well as where it is.
   */
  depthOrder?: number;
  /**
   * True while the hull is under the floor-following standing order
   * (docs/systems-depth.md §2). The player's own mode coming back to them:
   * the ribbon marker reports where the hull is, this explains why that
   * keeps changing.
   */
  followFloor?: boolean;
  /**
   * Seconds of sour exposure accrued in the Lid, present while any is
   * (docs/systems-depth.md §2). Up to LID.GRACE_S the card counts the grace
   * down; at the cap the hull is bleeding. Own information only — it says
   * nothing about anyone else's water.
   */
  sourS?: number;
  /**
   * Pressure Rating currently granted by an aura, on top of the hull's own
   * (docs/systems-depth.md §3, the Sounding Spire). Sent so the HUD can show
   * a rented rating as rented — it vanishes the moment the unit leaves.
   */
  pressureBonus: number;
  /**
   * Hull permanently lost to depth, in HP — crush attrition below the hull's
   * Pressure Rating, and, for the Directorate, shallow water above the Shelf
   * line (docs/systems-depth.md §2, §3). Distinct from ordinary damage because
   * no repair may ever refill it (docs/ui-ux.md §8), so the health bar has to
   * draw it differently.
   */
  unhealableDamage: number;
  /**
   * Orders waiting behind the current one, oldest first.
   *
   * Each carries the position it was issued at rather than a live one. For a
   * queued attack that matters: the player is entitled to where they saw the
   * contact when they gave the order, not to where it is now.
   */
  queuedOrders?: QueuedOrderView[];
  /** Harvesters only: cargo aboard, what it is, and the throttle setting. */
  cargo?: number;
  cargoKind?: ResourceKind;
  throttle?: HarvestThrottle;
  /**
   * Harvesters only: present while the hull has run out of work, and why
   * (docs/ui-ux.md §5). The `HarvesterIdle` event marks the moment it
   * happened; this is the state that lets the scope keep a marker on the
   * hull until it works again. Absent for a harvester the player throttled
   * to Idle — a chosen quiet is not a stall.
   */
  idle?: HarvestIdleReason;
  /**
   * Torpedoes aboard, for hulls that carry them.
   *
   * Sent because scarcity is the class identity (docs/systems-combat.md §5):
   * the gun never runs dry and the torpedo always might, and a player who
   * cannot see the count cannot make the decision that fact exists to force.
   */
  torpedoes?: number;
  /** Seconds until the next torpedo is aboard, while rearming at a depot. */
  rearmRemainingS?: number;
  /**
   * Seconds until the decoy suite can fire again. Absent when it is ready.
   *
   * Sent for the same reason the magazine is: a countermeasure the player
   * cannot see the state of is one they will reach for at the moment it is
   * not there (docs/systems-combat.md §5).
   */
  decoyCooldownS?: number;
}

/**
 * A piece of the player's own ordnance in the water.
 *
 * Sent in full, like `OwnUnit`, and for the same reason: it is theirs, so
 * sending it leaks nothing. The enemy's view of the same torpedo is a
 * `Contact`, resolved by the Echo Layer exactly as a hull is — which is what
 * makes "you always hear it coming" a fact about the simulation rather than a
 * promise the renderer keeps.
 */
export interface OwnOrdnance {
  id: number;
  kind: OrdnanceKind;
  x: number;
  y: number;
  depth: number;
  /** Radians. Where it is pointing, which for a seeker is where it is going. */
  heading: number;
  /** Live acoustic signature, 0-100 — a running torpedo is loud. */
  sig: number;
  /** Seconds of run, lifetime or decoy life left. */
  remainingS: number;
}

/** One pending order, as much of it as the client needs to draw the plan. */
export interface QueuedOrderView {
  kind: 'move' | 'attack' | 'harvest';
  /** Where the order pointed when it was given. */
  x: number;
  y: number;
}

/** A structure the player owns. Always full detail — it is theirs. */
export interface OwnStructure {
  id: number;
  kind: StructureKind;
  x: number;
  y: number;
  depth: number;
  hp: number;
  maxHp: number;
  /** Live acoustic signature, 0-100. */
  sig: number;
  /** 0-1. Below 1 the structure is still being commissioned — loudly. */
  buildProgress: number;
  /** Unit kinds queued at this structure; index 0 is in production. */
  queue: UnitKind[];
  /** 0-1 progress of queue[0]. Meaningless when the queue is empty. */
  queueProgress: number;
}

/**
 * A nodule field, sent once on join. Node *positions* are map data, exactly
 * like terrain — every commander has the same survey charts. What is NOT
 * broadcast is depletion: how much a node has left changes only through
 * someone mining it, and mining is information you earn by hearing it.
 */
export interface ResourceNodeInfo {
  id: number;
  x: number;
  y: number;
  kind: ResourceKind;
  /**
   * Depth of the field in metres. Crystal sits in the Abyssal band, so this is
   * what tells a commander a field cannot be worked without committing to the
   * descent (docs/economy.md §7).
   */
  depth: number;
  /** Units of the field's resource at match start. */
  initialAmount: number;
}

/** Payload pushed to each client on every Echo Layer tick. */
/**
 * Something that happened to *your own* force, which the mix must react to.
 *
 * These exist because the alternative is the client inferring them, and every
 * inference available to it is sometimes wrong. A SIG jump could be a broken
 * silence, a weapon discharge or a descent; "am I being pinged" cannot be read
 * off own-SIG at all. docs/audio-direction.md §5 makes the exposure cue the
 * loudest event in the game, and a cue that loud must never fire on a guess.
 *
 * Everything here is resolved information about the player's own units, so
 * sending it leaks nothing — the same reason `OwnUnit` is sent in full.
 */
export enum SelfEventKind {
  /** One of your units transmitted on active sonar. */
  Ping = 0,
  /** One of your units broke Silent Running to fire. */
  BreakSilence = 1,
  /** An enemy active sonar resolved one of your units. */
  Exposed = 2,
  /**
   * Violence landed on one of your units — a gun, ordnance, or fauna.
   *
   * Never crush attrition, the Directorate's shallow bleed, or the Lid's:
   * docs/ui-ux.md §8 gives permanence its own channel (the hatched health
   * bar), and an attrition tick is a cost being paid, not an attack being
   * made. Hazards are likewise excluded — a hazard announces itself with its
   * warning phase. Sour exposure gets `SourBleed` below rather than a share
   * of this one, and for the reason stated there: what it announces is the
   * moment the ledger opens, not the hull coming off it.
   */
  Damaged = 3,
  /**
   * A harvester ran out of work — docs/ui-ux.md §5, the idle notice.
   *
   * Only ever the two starvations the simulation can actually reach: every
   * field mined out, or no yard left to land the load. A harvester the player
   * *throttled* to Idle raises nothing, because a chosen quiet is not a
   * stall.
   */
  HarvesterIdle = 4,
  /**
   * A hull's sour grace ran out and the Lid began to bleed it —
   * docs/systems-depth.md §2, docs/audio-direction.md §4 "The Lid".
   *
   * The one exception to `Damaged`'s exclusion of attrition, and it is an
   * exception about *timing* rather than about violence. The exclusion holds
   * because attrition is a cost being paid rather than an attack being made,
   * and a per-tick cost has no moment to announce. Sour exposure has exactly
   * one: the instant the grace is spent, the hull crosses from paying nothing
   * to paying unhealable hull, and it does so on a clock the player started.
   * That edge is news; the bleeding either side of it is state, which the
   * card and the ribbon already carry.
   *
   * Raised on the crossing edge only, so a hull bleeding for a minute raises
   * this once. Recovering below the grace re-arms it, because a hull that
   * dived, recovered and climbed back has spent its grace twice.
   */
  SourBleed = 5,
}

export interface SelfEvent {
  kind: SelfEventKind;
  /** The entity of yours this happened to. */
  unitId: number;
  /**
   * `Exposed` only: bearing in radians from your unit toward the emitter that
   * lit it.
   *
   * A bearing and not a position, deliberately. docs/audio-direction.md §11
   * asks for a screen-edge flash "on the bearing of the pinging emitter", and
   * a bearing carries no range — so this hands over a direction, not a
   * location. That distinction matters: a ping resolves by hard radius while
   * the pinger's own self-reveal travels by propagation, so in a masking biome
   * you can be lit by someone you cannot hear back. Sending their position
   * would be the server closing a gap the design left open on purpose.
   */
  bearing?: number;
  /**
   * `HarvesterIdle` only: why the harvester has nothing to do. The reason is
   * the server's to give — the client could see the mode but never the cause,
   * and every inference available to it is sometimes wrong (see above).
   */
  idleReason?: HarvestIdleReason;
}

/**
 * Why a harvester went idle without being told to (docs/ui-ux.md §5).
 *
 * These are the only two starvations `harvestSystem` can reach: there is no
 * "unreachable" — the simulation has no pathfinding to be defeated by, and
 * depth is a cost rather than a wall.
 */
export enum HarvestIdleReason {
  /** No live resource node anywhere on the map. */
  MinedOut = 0,
  /** No completed own depot accepts deposits — the yards are gone. */
  NoDepot = 1,
}

/**
 * What other players currently know about you.
 *
 * The continuous half of the same idea as `SelfEvent`: not an event, a state.
 * Deliberately says nothing about *who* holds the resolution or where they
 * are — only how well you are being seen.
 */
export interface ExposureReport {
  /** Best tier any other player currently holds on any entity of yours. */
  tier: ResolutionTier;
  /** How many of your entities are resolved at Bearing or better. */
  trackedCount: number;
}

export interface EchoSnapshot {
  tick: number;
  units: OwnUnit[];
  structures: OwnStructure[];
  /** The player's own ordnance in the water — torpedoes, mines, decoys. */
  ordnance: OwnOrdnance[];
  contacts: Contact[];
  /** Loudest SIG across the player's units — the headline HUD number. */
  peakSig: number;
  /** The player's nodule stockpile — the C&C-style spendable pool. */
  nodules: number;
  /** Resonance Crystal stockpile. Everything crystal-locked is bought here. */
  crystal: number;
  /**
   * Biomass — rendered fauna (docs/economy.md §2).
   *
   * The Directorate's channel at full rate; everyone else sells remains
   * through Consortium rendering contracts at a fraction.
   */
  biomass: number;
  /** What the rest of the map currently knows about you. */
  exposure: ExposureReport;
  /** Discrete things that happened to your own force on this tick. */
  selfEvents: SelfEvent[];
  /** Thermal Draw, as a rate. Never accumulates — see DrawReport. */
  draw: DrawReport;
  /**
   * Drift Health per region, 0-100, row-major over a DRIFT.HEALTH_REGIONS grid.
   *
   * Public, like terrain and hazards: docs/bestiary.md §6 makes killing a
   * region a strategic act available to everyone, and an act nobody can see is
   * not one. A dead region is quieter, more legible and worth less — which
   * helps exactly one faction.
   */
  driftHealth: number[];
  /** Every hazard on the map, in whatever phase it is in. Public. */
  hazards: HazardState[];
  /**
   * Acoustic residue this player's units can currently read.
   *
   * Empty for a force with no listener at HYD >= 40, which is the point: the
   * past is a stat you buy, and it is the only thing HYD is a hard wall for.
   */
  marks: EchoMarkInfo[];
  /**
   * Every Lampfry shoal on the map, and whether it is scattered. Public, like
   * hazards and Drift Health: a shoal's glow is light, not sound, and the
   * scatter tell is the one disclosure the design *wants* every commander to
   * read (docs/bestiary.md §4). It says something is within 300 m of the glow
   * — never what, whose, or exactly where.
   */
  shoals: ShoalTell[];
}

/**
 * One Lampfry shoal, as every player sees it.
 *
 * Deliberately not a `Contact`: a contact is the resolved product of
 * listening, per player, and a shoal is a public landmark. The id is the
 * creature's match-local id — stable for the shoal's life, and it names
 * nothing the Echo Layer would withhold.
 */
export interface ShoalTell {
  id: number;
  x: number;
  y: number;
  depth: number;
  /** True while dispersed — the tell itself. */
  scattered: boolean;
}

/** Broadcast once when the match resolves. Elimination is public. */
export interface GameOverPayload {
  winnerSlot: number;
}
