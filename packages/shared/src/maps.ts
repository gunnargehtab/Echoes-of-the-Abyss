/**
 * The public face of the map catalogue.
 *
 * The full map definitions — regions, spawns, resources, hazard sites — are
 * authoring data and live server-side (`packages/backend/src/sim/maps/`),
 * because a client holding spawn positions before a match would hold
 * information it has not earned. But the shell needs a map *list* before any
 * room exists: a setup screen cannot ask the server which maps there are
 * without already being the thing it is trying to build.
 *
 * So the header — the subset every player may know before joining, and the
 * subset the server already repeats in its `map` message after joining — lives
 * here, per the rule in CLAUDE.md: a constant needed in two packages belongs
 * in shared. The backend literals spread these headers so the two can never
 * drift, and a backend test holds `seats` to its ground truth, the spawn list
 * ("a map's spawn list is its player count").
 */

export interface MapHeader {
  /** Stable identifier, used to select the map. */
  id: string;
  /** Display name, exactly as docs/maps.md titles it. */
  name: string;
  /** One line on what the map is for, from the doc's "Ideal Use". */
  idealUse: string;
  /** Player count. Authored here, asserted against the spawn list server-side. */
  seats: number;
  widthM: number;
  heightM: number;
}

export const VENTFRONT_DIVIDE_HEADER: MapHeader = {
  id: 'ventfront-divide',
  name: 'The Ventfront Divide',
  idealUse: 'Competitive 1v1 or 2v2; high-pressure mid-control gameplay.',
  seats: 4,
  widthM: 8000,
  heightM: 8000,
};

export const ABYSSAL_RIFT_CORRIDOR_HEADER: MapHeader = {
  id: 'abyssal-rift-corridor',
  name: 'Abyssal Rift Corridor',
  idealUse: '1v1 competitive; high-skill micro + positioning.',
  seats: 2,
  widthM: 10000,
  heightM: 6000,
};

export const KELP_LABYRINTH_HEADER: MapHeader = {
  id: 'kelp-labyrinth',
  name: 'Kelp Labyrinth',
  idealUse: 'Asymmetric campaign missions; stealth-heavy gameplay.',
  seats: 4,
  widthM: 8000,
  heightM: 8000,
};

/** In catalogue order: the default map first, as the setup screen lists them. */
export const MAP_HEADERS: readonly MapHeader[] = [
  VENTFRONT_DIVIDE_HEADER,
  ABYSSAL_RIFT_CORRIDOR_HEADER,
  KELP_LABYRINTH_HEADER,
];

export const DEFAULT_MAP_ID = VENTFRONT_DIVIDE_HEADER.id;

export function mapHeaderById(id: string): MapHeader | undefined {
  return MAP_HEADERS.find((header) => header.id === id);
}
