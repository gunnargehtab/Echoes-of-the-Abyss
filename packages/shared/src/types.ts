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
  /** Harvesters only: cargo aboard, what it is, and the throttle setting. */
  cargo?: number;
  cargoKind?: ResourceKind;
  throttle?: HarvestThrottle;
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
}

/** Broadcast once when the match resolves. Elimination is public. */
export interface GameOverPayload {
  winnerSlot: number;
}
