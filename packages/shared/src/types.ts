/**
 * Shared domain types for Echoes of the Abyss.
 *
 * These describe the wire contract between the authoritative simulation
 * (packages/backend) and the renderer (packages/frontend).
 */

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
   * Pressure Rating currently granted by an aura, on top of the hull's own
   * (docs/systems-depth.md §3, the Sounding Spire). Sent so the HUD can show
   * a rented rating as rented — it vanishes the moment the unit leaves.
   */
  pressureBonus: number;
  /**
   * Hull permanently lost to crush attrition, in HP. Distinct from ordinary
   * damage because no repair may ever refill it (docs/ui-ux.md §8), so the
   * health bar has to draw it differently.
   */
  crushDamage: number;
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
  contacts: Contact[];
  /** Loudest SIG across the player's units — the headline HUD number. */
  peakSig: number;
  /** The player's nodule stockpile — the C&C-style spendable pool. */
  nodules: number;
  /** Resonance Crystal stockpile. Everything crystal-locked is bought here. */
  crystal: number;
  /** What the rest of the map currently knows about you. */
  exposure: ExposureReport;
  /** Discrete things that happened to your own force on this tick. */
  selfEvents: SelfEvent[];
  /**
   * Acoustic residue this player's units can currently read.
   *
   * Empty for a force with no listener at HYD >= 40, which is the point: the
   * past is a stat you buy, and it is the only thing HYD is a hard wall for.
   */
  marks: EchoMarkInfo[];
}

/** Broadcast once when the match resolves. Elimination is public. */
export interface GameOverPayload {
  winnerSlot: number;
}
