/**
 * The continuous Rift world — docs/world-map.md §7.
 *
 * One metric frame for the whole Rift, and the mission maps placed in it.
 * Continuous to the eye and simulated only where the mission is (§7.1): the
 * atlas is public ground, identical for every player, and nothing in this file
 * is read by the simulation. A mission keeps its own local metres, which are
 * atlas metres minus its region's origin (§7.2), so the server never learns
 * the atlas exists and no command coordinate changes.
 *
 * The contract is deliberately small: axis-aligned regions with whole-cell
 * origins, the two transforms, and the one predicate that says whether a
 * mission is drawn in the world. Live ground stays the session's — the atlas
 * is a baseline nobody edits (§7.1), and there is no API here for cutting an
 * arbitrary rectangle out of it.
 */

import { WORLD } from './constants.js';
import { MISSION_HEADERS, PROLOGUE_SORROWGATE_HEADER } from './missions.js';

/** A point or a rectangle corner, in metres. */
export interface PlanPoint {
  x: number;
  y: number;
}

/** An axis-aligned rectangle in metres: a corner and a size. */
export interface PlanRect {
  x: number;
  y: number;
  widthM: number;
  heightM: number;
}

/**
 * The atlas frame (§7.2): 40 km west to east by 90 km north to south, origin
 * at the north-west corner, *x* east and *y* south as on every map.
 */
export const RIFT_ATLAS: PlanRect = {
  x: 0,
  y: 0,
  widthM: WORLD.ATLAS_WIDTH_M,
  heightM: WORLD.ATLAS_HEIGHT_M,
};

/**
 * A mission map placed in the atlas. `mapId` names the map whose ground this
 * is; `x`/`y` is that map's north-west corner in atlas metres, and the size is
 * the map's own. Several missions may stand on one region — Radicals plays on
 * Sorrowgate's — and the region does not know which.
 */
export interface WorldRegion extends PlanRect {
  /** Unique within `WORLD_REGIONS`. */
  id: string;
  mapId: string;
}

/**
 * Sorrowgate, the pilot (§7.2's anchor table): origin (17,500, 40,500),
 * mid-Rift and mid-width, its 5,000 × 4,000 m unchanged.
 */
export const SORROWGATE_REGION: WorldRegion = {
  id: 'sorrowgate',
  mapId: 'sorrowgate',
  x: 17_500,
  y: 40_500,
  widthM: 5_000,
  heightM: 4_000,
};

/** Every placed region. Other maps keep their own grids until migrated (§7.1). */
export const WORLD_REGIONS: readonly WorldRegion[] = [SORROWGATE_REGION];

export function worldRegionById(id: string): WorldRegion | undefined {
  return WORLD_REGIONS.find((region) => region.id === id);
}

/** A map's local metres to atlas metres. */
export function localToAtlas(region: PlanRect, local: PlanPoint): PlanPoint {
  return { x: local.x + region.x, y: local.y + region.y };
}

/** Atlas metres to a map's local metres. Outside the map is negative or past its size. */
export function atlasToLocal(region: PlanRect, atlas: PlanPoint): PlanPoint {
  return { x: atlas.x - region.x, y: atlas.y - region.y };
}

/**
 * Is an atlas point on the region's ground? Half-open, west and north edges
 * in, as a map's rectangle is (#157), so two regions sharing an edge never
 * both claim a point.
 */
export function regionContains(region: PlanRect, atlas: PlanPoint): boolean {
  return (
    atlas.x >= region.x &&
    atlas.x < region.x + region.widthM &&
    atlas.y >= region.y &&
    atlas.y < region.y + region.heightM
  );
}

/**
 * How far a point lies outside a rectangle, in metres — §7.4's *d*. Zero on
 * the rectangle or inside it; outside, the Euclidean distance to its nearest
 * edge, so off a corner it is the distance to the corner and the fade's
 * contours round off there rather than meeting in a mitre.
 */
export function exteriorDistanceM(rect: PlanRect, point: PlanPoint): number {
  const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.widthM));
  const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.heightM));
  return Math.hypot(dx, dy);
}

/**
 * §7.4's exterior factor, *f*(*d*) = 1 − smoothstep(0, W, *d*): exactly 1 on
 * and inside the mission, so nothing there changes, and 0 from W on, where
 * the exterior has met the backdrop's darkness. The renderer's shader states
 * the same curve (`worldBorder.ts`), and a test holds the two together.
 */
export function exteriorFade(distanceM: number, widthM: number = WORLD.FADE_M): number {
  if (distanceM <= 0) return 1;
  if (distanceM >= widthM) return 0;
  const t = distanceM / widthM;
  return 1 - t * t * (3 - 2 * t);
}

/**
 * The nearest point on or inside a rectangle — §7.4 rule 1, the focus clamp.
 * Closed, unlike `regionContains`: a focus may stand on the far edge, which is
 * still the mission's ground to look at.
 */
export function clampToRect(rect: PlanRect, point: PlanPoint): PlanPoint {
  return {
    x: Math.min(rect.x + rect.widthM, Math.max(rect.x, point.x)),
    y: Math.min(rect.y + rect.heightM, Math.max(rect.y, point.y)),
  };
}

/**
 * The region's mission-detail rectangle (§7.3): the map plus
 * `WORLD.DETAIL_SURROUND_M` on every side, grown outward to the next overview
 * line so detail and overview meet on the overview grid. Sorrowgate's is
 * 15–25 km by 38–47 km and needs no rounding.
 *
 * Never clipped at the frame: §7.3 promises the surround on every side, so a
 * placed map too near the atlas edge to have it is refused instead
 * (`worldRegionProblems`), the owner's call on #1456.
 */
export function detailRect(region: PlanRect): PlanRect {
  const cell = WORLD.ATLAS_CELL_M;
  const surround = WORLD.DETAIL_SURROUND_M;
  const west = Math.floor((region.x - surround) / cell) * cell;
  const north = Math.floor((region.y - surround) / cell) * cell;
  const east = Math.ceil((region.x + region.widthM + surround) / cell) * cell;
  const south = Math.ceil((region.y + region.heightM + surround) / cell) * cell;
  return { x: west, y: north, widthM: east - west, heightM: south - north };
}

function rectWithin(inner: PlanRect, outer: PlanRect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.widthM <= outer.x + outer.widthM &&
    inner.y + inner.heightM <= outer.y + outer.heightM
  );
}

/**
 * What is wrong with a region list, as sentences; empty when nothing is.
 *
 * The rules §7.2 states: ids unique; each region names a map some mission
 * plays on; corners and sizes whole 250 m cells, so a mission's cells sit on
 * the atlas grid exactly; and every region inside the frame with room for
 * §7.3's whole surround (`detailRect`). Overlap is not
 * checked here: two placed maps may not overlap, but that is the ground's
 * authoring (#1457) to prove once there are two.
 */
export function worldRegionProblems(
  regions: readonly WorldRegion[],
  knownMapIds: ReadonlySet<string> = new Set(MISSION_HEADERS.map((header) => header.mapId))
): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  const cell = WORLD.DETAIL_CELL_M;
  for (const region of regions) {
    if (seen.has(region.id)) problems.push(`${region.id}: id used twice`);
    seen.add(region.id);
    if (!knownMapIds.has(region.mapId)) {
      problems.push(`${region.id}: no mission plays on map '${region.mapId}'`);
    }
    for (const [name, value] of [
      ['x', region.x],
      ['y', region.y],
      ['widthM', region.widthM],
      ['heightM', region.heightM],
    ] as const) {
      if (!Number.isInteger(value / cell)) {
        problems.push(`${region.id}: ${name} ${value} is not a whole ${cell} m cell`);
      }
    }
    if (region.widthM <= 0 || region.heightM <= 0) problems.push(`${region.id}: empty`);
    if (
      region.x < RIFT_ATLAS.x ||
      region.y < RIFT_ATLAS.y ||
      region.x + region.widthM > RIFT_ATLAS.x + RIFT_ATLAS.widthM ||
      region.y + region.heightM > RIFT_ATLAS.y + RIFT_ATLAS.heightM
    ) {
      problems.push(`${region.id}: outside the atlas`);
    } else if (!rectWithin(detailRect(region), RIFT_ATLAS)) {
      problems.push(`${region.id}: its detail surround leaves the atlas`);
    }
  }
  return problems;
}

/**
 * The world region a mission is drawn in, or `undefined` for a mission that
 * keeps today's presentation.
 *
 * **Keyed on mission identity, never on the map** (§7.1), as the surface
 * profile is (`lookForMission`): Radicals plays on Sorrowgate's map and keeps
 * its own presentation, and a `?map=` boot on Sorrowgate's map is not the
 * prologue. Every path into the prologue — the board, the Tutorial door, a
 * `?mission=` link, Resume — passes the same id, so one predicate answers for
 * all of them. The one the persistent view (#1458), the regional snapshot
 * (#1460) and the border fade (#1461) all ask; none of them keeps a flag.
 */
export function worldRegionForMission(missionId: string | undefined): WorldRegion | undefined {
  return missionId === PROLOGUE_SORROWGATE_HEADER.id ? SORROWGATE_REGION : undefined;
}
