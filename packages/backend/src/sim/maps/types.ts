/**
 * The authored map format — docs/maps.md.
 *
 * Every match in this build until now has been played on `Terrain.demo()`, one
 * hand-placed grid. PF is the game's main lever — changing a biome's PF changes
 * which factions thrive there — so with one map there was exactly one PF
 * landscape, and faction balance could not meaningfully be assessed at all.
 *
 * **Authored, never generated.** `Terrain.demo()`'s own comment makes the case:
 * "an RTS simulation must be reproducible, and a seeded generator is one
 * refactor away from not being." A map here is a data literal — regions,
 * spawns, resources, hazard sites — with no procedural step anywhere in it.
 *
 * They are TypeScript modules rather than JSON files, which is a deliberate
 * reading of "data, not code": the requirement is that a map contains no
 * *logic*, and these contain none. What a typed literal buys over JSON is that
 * a mistyped biome or a spawn outside the map fails at build time rather than
 * at match start, and it costs no loader and no schema validator to get that.
 */

import type { Biome, HazardKind, ResourceKind } from '@echoes/shared';

/**
 * A painted region. Rectangles only, and deliberately so: every layout in
 * docs/maps.md is corridors, plateaus, bands and quadrants, all of which are
 * rectangles or unions of them. A richer shape vocabulary would be more
 * expressive than anything the doc actually asks for.
 *
 * Painted in array order, so a later region overwrites an earlier one where
 * they overlap. That is what makes a trench cutting *through* a vent line
 * expressible as two lines of data rather than four.
 */
export interface MapRegion {
  x: number;
  y: number;
  widthM: number;
  heightM: number;
  biome: Biome;
  /**
   * How deep the water goes here, in metres. Omitted inherits the map's
   * `floorM` — which is what almost every region wants, because a map is
   * mostly its own base seabed with a few things cut into it.
   */
  floorM?: number;
  /**
   * Rock above the water, in metres. Omitted means 0: open to the surface.
   *
   * Non-zero is a roofed passage — a tunnel, a cavern, an overhang — water
   * reachable only from below. A ceiling deeper than the region's floor is
   * solid ground and admits nothing at any depth (docs/systems-depth.md §1).
   */
  ceilingM?: number;
  /** Why this region exists, in the doc's terms. Kept with the data. */
  note?: string;
}

/**
 * Where a player starts.
 *
 * Slots take spawns in order, so a map's spawn list *is* its player count and
 * its symmetry. This replaces `Match.spawnStartingBase`'s corner arithmetic,
 * which assumed every map is a square with four usable corners — false for the
 * Rift Corridor the moment it exists.
 */
export interface MapSpawn {
  x: number;
  y: number;
  /**
   * Where the pre-built Foundry sits relative to the Bastion, in metres.
   * Authored because "toward the middle" is a different direction on a corridor
   * map than on a quadrant map.
   */
  foundryOffsetX: number;
  foundryOffsetY: number;
}

export interface MapResource {
  x: number;
  y: number;
  kind: ResourceKind;
  /** Omitted takes the default field size for the kind. */
  amount?: number;
  note?: string;
}

/**
 * Hazards in docs/maps.md, as sites.
 *
 * A site is where a hazard *lives*; its phase and timers are match state and
 * belong to the simulation. Two kinds are simulated — geothermal eruptions and
 * resonance storms — and the rest are sites only, drawn and telegraphed but
 * inert until their behaviour is written. `docs/hazards.md` carries the
 * status of all eight.
 */
export type { HazardKind } from '@echoes/shared';

export interface MapHazardSite {
  x: number;
  y: number;
  radiusM: number;
  kind: HazardKind;
  /**
   * Which way a current flows, in degrees, for `cold-shock` sites.
   *
   * Measured exactly as `Math.atan2(dy, dx)` measures — 0 is +X, 90 is +Y,
   * which is south on screen — so it matches `contact.heading` and every other
   * angle in the simulation. Authored rather than derived: docs/hazards.md §8
   * makes the direction a published, learnable property of the map, and a
   * bearing computed from the site's own coordinates would be stable but
   * arbitrary, which reads as the map being random rather than dangerous.
   *
   * Ignored by every other kind. A `cold-shock` site without one does not
   * flow, which is a map bug rather than a valid still current — `maps.test.ts`
   * refuses it.
   */
  flowDeg?: number;
  note?: string;
}

export interface MapDefinition {
  /** Stable identifier, used to select the map. */
  id: string;
  /** Display name, exactly as docs/maps.md titles it. */
  name: string;
  /** The docs/maps.md section this transcribes, cited so drift is findable. */
  doc: string;
  /** One line on what the map is for, from the doc's "Ideal Use". */
  idealUse: string;
  widthM: number;
  heightM: number;
  cellM: number;
  /**
   * The seabed this map starts at, before any region carves into it. Omitted
   * keeps the flat 3,000 m every map had before floors were authorable.
   */
  floorM?: number;
  regions: MapRegion[];
  spawns: MapSpawn[];
  resources: MapResource[];
  hazards: MapHazardSite[];
}
