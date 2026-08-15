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
 * NOTE: docs/glossary.md describes tiers 0-5 (adding a "Full Lock" tier 5),
 * while systems-echo.md — the detailed system doc — defines 0-4. We implement
 * 0-4 as canonical; see docs/README or the scaffold notes for the discrepancy.
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

/** Prototype unit roster. Stats live in units.ts. See docs/units.md. */
export enum UnitKind {
  LightScout = 0,
  Corvette = 1,
  Cruiser = 2,
  AbyssalSubmersible = 3,
  Harvester = 4,
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
  /** Only known at Tier 3+ (classification). */
  kind?: UnitKind;
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
}

/** Payload pushed to each client on every Echo Layer tick. */
export interface EchoSnapshot {
  tick: number;
  units: OwnUnit[];
  contacts: Contact[];
  /** Loudest SIG across the player's units — the headline HUD number. */
  peakSig: number;
}
