/**
 * The map catalogue.
 *
 * Three archetypes to start, chosen to span the PF range rather than for
 * variety's sake — PF is the game's main lever, and the point of having more
 * than one map is having more than one PF landscape to test a faction on:
 *
 * - **Ventfront Divide** — a masked middle (PF 0.45) with loud flanks.
 * - **Abyssal Rift Corridor** — a PF 1.6 highway, and no secrets anywhere on it.
 * - **Kelp Labyrinth** — neither, and instead broken sightlines: kelp does not
 *   hide an army so much as destroy your sense of how far away one is.
 */

import { Terrain } from '../terrain.ts';
import { ABYSSAL_RIFT_CORRIDOR } from './abyssalRiftCorridor.ts';
import { KELP_LABYRINTH } from './kelpLabyrinth.ts';
import { VENTFRONT_DIVIDE } from './ventfrontDivide.ts';
import type { MapDefinition } from './types.ts';

export * from './types.ts';
export { ABYSSAL_RIFT_CORRIDOR, KELP_LABYRINTH, VENTFRONT_DIVIDE };

export const MAPS: readonly MapDefinition[] = [
  VENTFRONT_DIVIDE,
  ABYSSAL_RIFT_CORRIDOR,
  KELP_LABYRINTH,
];

// The default is declared with the public catalogue, beside the headers the
// shell lists; the full definitions here are the private half of the same maps.
export { DEFAULT_MAP_ID } from '@echoes/shared';

export function mapById(id: string): MapDefinition | undefined {
  return MAPS.find((map) => map.id === id);
}

/**
 * Paint a map's regions onto a terrain grid.
 *
 * In array order, so a later region overwrites an earlier one — which is what
 * lets the Kelp Labyrinth state "coral everywhere, then open water inside it,
 * then the maze on top" as three ideas rather than as a ring of rectangles.
 */
export function terrainFor(map: MapDefinition): Terrain {
  const terrain = new Terrain(map.widthM, map.heightM, map.cellM, { floorM: map.floorM });
  for (const region of map.regions) {
    terrain.fillRect(region.x, region.y, region.widthM, region.heightM, region.biome);
    // Ground is painted in the same pass and the same order as biome, so a
    // region that carves a trench through a vent line does both in one entry.
    // Regions that say nothing about the water column leave it as it was,
    // which is why a map can author one plateau without restating its seabed.
    terrain.fillGround(region.x, region.y, region.widthM, region.heightM, {
      floorM: region.floorM,
      ceilingM: region.ceilingM,
    });
  }
  return terrain;
}
