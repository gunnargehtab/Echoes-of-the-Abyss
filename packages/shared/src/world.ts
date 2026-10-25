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
import { PLACED_GROUND, paintGround, type GroundCells, type MapGround } from './ground.js';
import { MAP_HEADERS, mapHeaderById } from './maps.js';
import {
  ATTENDING_FIRST_ARRIVAL_HEADER,
  ATTENDING_INTAKE_HEADER,
  ATTENDING_THE_DOME_HEADER,
  ATTENDING_TRENCH_AWAKENING_HEADER,
  LEDGER_ASSET_RECOVERY_HEADER,
  CHORD_RIM_DEPOSITS_HEADER,
  CHORD_SECOND_CHORD_HEADER,
  LEDGER_EXPOSURE_HEADER,
  LEDGER_ITEM_NINE_HEADER,
  LEDGER_PROSPECT_HEADER,
  LEDGER_SHIFT_CHANGE_HEADER,
  LEDGER_TOLERANCE_HEADER,
  MISSION_HEADERS,
  ATTENDING_SHALLOW_HEADER,
  PROLOGUE_SORROWGATE_HEADER,
  SEEDING_CONVOCATION_HEADER,
  SEEDING_DEEP_FURROW_HEADER,
  SEEDING_IN_WRITING_HEADER,
  SEEDING_SECOND_SEEDING_HEADER,
  SEEDING_TEND_HEADER,
  SEEDING_THIN_WATER_HEADER,
} from './missions.js';

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
 * A map placed in the atlas, a mission's or a skirmish's (#1529). `mapId` names
 * the map whose ground this is; `x`/`y` is that map's north-west corner in
 * atlas metres, and the size is the map's own. Several missions may stand on
 * one region — Radicals plays on Sorrowgate's — and the region does not know
 * which.
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

/**
 * The Banding Ground, *Intake*'s map (§7.9, #1598): its centre on §7.2's
 * banding ground anchor, (23,000, 64,000), so its north edge lies on the
 * Ninth's head, where the Ascent leaves it, and its throat opens south toward
 * Sufficiency.
 */
export const BANDING_GROUND_REGION: WorldRegion = {
  id: 'banding-ground',
  mapId: 'banding-ground',
  x: 20_500,
  y: 62_000,
  widthM: 5_000,
  heightM: 4_000,
};

/**
 * The Western Margin, *Exposure*'s map (§7.9, #1612): its centre on §7.2's
 * Western Margin anchor, (6,000, 49,500), so it stands edge to edge north of
 * the Shallow Band, its worked ground meeting the band's rim at 1,750 m.
 */
export const WESTERN_MARGIN_REGION: WorldRegion = {
  id: 'first-trench-margin',
  mapId: 'first-trench-margin',
  x: 3_500,
  y: 48_000,
  widthM: 5_000,
  heightM: 3_000,
};

/**
 * The Shallow Band, *Trench Awakening*'s map (§7.9, #1615): its centre on
 * §7.2's First Trench anchor, (6,000, 53,000), so its north edge is the
 * Western Margin's south edge and the band's rim runs on from the margin's
 * worked ground. The two share no cell.
 */
export const SHALLOW_BAND_REGION: WorldRegion = {
  id: 'shallow-band',
  mapId: 'shallow-band',
  x: 3_500,
  y: 51_000,
  widthM: 5_000,
  heightM: 4_000,
};

/**
 * The Upper Workings, *Shift Change*'s map (§7.9, #1626): its rail head on
 * §7.2's Fivewell anchor, (5,500, 22,000), so it clears Face Six's map by one
 * row and the two share no cell.
 */
export const UPPER_WORKINGS_REGION: WorldRegion = {
  id: 'ninefold-workings',
  mapId: 'ninefold-workings',
  x: 3_500,
  y: 21_750,
  widthM: 4_000,
  heightM: 3_000,
};

/**
 * Face Six, *Asset Recovery*'s map (§7.9, #1626): its centre on §7.2's
 * Ninefold Vein anchor, (5,000, 26,500), a row south of the Upper Workings.
 */
export const FACE_SIX_REGION: WorldRegion = {
  id: 'ninefold-face-six',
  mapId: 'ninefold-face-six',
  x: 3_000,
  y: 25_000,
  widthM: 4_000,
  heightM: 3_000,
};

/**
 * The Fourth's Foot, *The Dome*'s map (§7.9, #1628): its Deep Yard, cells
 * (750–2,250, 4,250–4,750), on §7.2's Deep Yard anchor, (11,500, 58,500), so
 * the Foot's own anchor lies 2 km south of the map. *Baffle*'s Fourth Trench,
 * one ground in a second literal, is not placed (the owner's call on #1505).
 */
export const FOURTH_FOOT_REGION: WorldRegion = {
  id: 'fourth-foot',
  mapId: 'fourth-foot',
  x: 10_000,
  y: 54_000,
  widthM: 3_000,
  heightM: 6_000,
};

/**
 * Marr Plateau, *Tend*'s and *Convocation*'s map (§7.9, #1630): centred on
 * §7.2's Marr Plateau anchor, (8,000, 3,750), at the origin its anchor moved
 * for (#1566). Teel's Landing at its east edge looks across to Teel Plateau.
 */
export const MARR_PLATEAU_REGION: WorldRegion = {
  id: 'marr-plateau',
  mapId: 'marr-plateau',
  x: 6_000,
  y: 2_500,
  widthM: 4_000,
  heightM: 2_500,
};

/**
 * The Kell Shoulder, *Thin Water*'s and *Shallow*'s map (§7.9, #1633):
 * centred on §7.2's Kell Shoulder anchor, (9,000, 7,500). Its north edge lies a
 * kilometre south of Marr Plateau's map, across Marr's Drop.
 */
export const KELL_SHOULDER_REGION: WorldRegion = {
  id: 'kell-shoulder',
  mapId: 'kell-shoulder',
  x: 6_500,
  y: 6_000,
  widthM: 5_000,
  heightM: 3_000,
};

/**
 * The Furrow, *Deep Furrow*'s and *In Writing*'s map (§7.9, #1638): centred on
 * §7.2's Furrow anchor, (24,000, 19,000), under Anholt's lower terraces where
 * the scar branches.
 */
export const ANHOLT_FURROW_REGION: WorldRegion = {
  id: 'anholt-furrow',
  mapId: 'anholt-furrow',
  x: 22_000,
  y: 17_500,
  widthM: 4_000,
  heightM: 3_000,
};

/**
 * The Rim, the convergence's map (§7.9, #1640): its four bands on §7.2's band
 * anchors, the Staging, the Slopes and the Terraces each centred at x 20,000
 * and the Lip on its row, whose anchor lies 500 m east of the map where the
 * Ninth comes out. Its spawn is the Staging's anchor.
 */
export const MOUTH_RIM_REGION: WorldRegion = {
  id: 'mouth-rim',
  mapId: 'mouth-rim',
  x: 17_000,
  y: 79_000,
  widthM: 6_000,
  heightM: 4_000,
};

/**
 * Board Country, *Item Nine*'s map (§7.9, #1623): centred on §7.2's Underway
 * anchor, (5,500, 16,750), which moved 1,750 m north so the map meets the
 * Underworks' edge to edge rather than over it (the owner's call).
 */
export const HOLDING_BOARD_REGION: WorldRegion = {
  id: 'holding-board',
  mapId: 'holding-board',
  x: 4_000,
  y: 15_500,
  widthM: 3_000,
  heightM: 2_500,
};

/**
 * The Underworks, *Tolerance*'s map (§7.9, #1623): centred on §7.2's
 * Underworks anchor, (6,000, 19,500), Board Country's map along its north edge
 * and the Upper Workings' three-quarters of a kilometre south.
 */
export const HOLDING_UNDERWORKS_REGION: WorldRegion = {
  id: 'holding-underworks',
  mapId: 'holding-underworks',
  x: 4_000,
  y: 18_000,
  widthM: 4_000,
  heightM: 3_000,
};

/** Every placed region. Other maps keep their own grids until migrated (§7.1). */
export const WORLD_REGIONS: readonly WorldRegion[] = [
  SORROWGATE_REGION,
  BANDING_GROUND_REGION,
  WESTERN_MARGIN_REGION,
  SHALLOW_BAND_REGION,
  UPPER_WORKINGS_REGION,
  FACE_SIX_REGION,
  FOURTH_FOOT_REGION,
  MARR_PLATEAU_REGION,
  KELL_SHOULDER_REGION,
  ANHOLT_FURROW_REGION,
  MOUTH_RIM_REGION,
  HOLDING_BOARD_REGION,
  HOLDING_UNDERWORKS_REGION,
];

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

/**
 * Which drawn region's detail draws the 250 m cell under an atlas point, by
 * place (§7.3, #1528, the owner's call): of the regions whose detail rectangle
 * holds the cell's centre, the one whose map rectangle lies nearest it, by
 * §7.4's *d*. A mission patch is at *d* = 0, so it beats any surround; two
 * patches tie only where their cells agree (§7.2), and a tie goes to the region
 * listed first: the view lists the session's first, and the rest by id. A
 * property of the place, never of travel order, as the fade is; undefined
 * where none of them draws.
 */
export function detailOwner(
  drawn: readonly WorldRegion[],
  point: PlanPoint
): WorldRegion | undefined {
  const cell = WORLD.DETAIL_CELL_M;
  const centre = {
    x: Math.floor(point.x / cell) * cell + cell / 2,
    y: Math.floor(point.y / cell) * cell + cell / 2,
  };
  let owner: WorldRegion | undefined;
  let nearest = Number.POSITIVE_INFINITY;
  for (const region of drawn) {
    if (!regionContains(detailRect(region), centre)) continue;
    const d = exteriorDistanceM(region, centre);
    if (d < nearest) {
      owner = region;
      nearest = d;
    }
  }
  return owner;
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
 * The rules §7.2 states: ids unique; each region names a map some mission plays
 * on, or a skirmish map, which a `?map=` boot places by its id (#1529); corners
 * and sizes whole 250 m cells, so a mission's cells sit on the atlas grid
 * exactly; every region inside the frame with room for §7.3's whole surround
 * (`detailRect`); and two regions overlap only where every shared cell has one
 * biome, floor and ceiling in both maps' ground, since a heightfield holds one
 * floor a cell (#1527). An overlap whose ground is not in `grounds` cannot be
 * shown to agree, so it is refused too.
 */
export function worldRegionProblems(
  regions: readonly WorldRegion[],
  knownMapIds: ReadonlySet<string> = new Set([
    ...MISSION_HEADERS.map((header) => header.mapId),
    ...MAP_HEADERS.map((header) => header.id),
  ]),
  grounds: Readonly<Record<string, MapGround>> = PLACED_GROUND
): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  const cell = WORLD.DETAIL_CELL_M;
  for (const region of regions) {
    if (seen.has(region.id)) problems.push(`${region.id}: id used twice`);
    seen.add(region.id);
    if (!knownMapIds.has(region.mapId)) {
      problems.push(`${region.id}: no mission or skirmish plays on map '${region.mapId}'`);
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
  const painted = new Map<string, GroundCells>();
  const cellsOf = (mapId: string): GroundCells | undefined => {
    const ground = grounds[mapId];
    if (ground === undefined) return undefined;
    let cells = painted.get(mapId);
    if (cells === undefined) painted.set(mapId, (cells = paintGround(ground)));
    return cells;
  };
  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      const problem = overlapProblem(regions[i]!, regions[j]!, cellsOf);
      if (problem !== undefined) problems.push(problem);
    }
  }
  return problems;
}

/**
 * Why two regions may not overlap as placed, or undefined when they may:
 * they do not overlap, or every 250 m cell they share agrees. A shared edge is
 * not an overlap, since a region is half-open (`regionContains`).
 */
function overlapProblem(
  a: WorldRegion,
  b: WorldRegion,
  cellsOf: (mapId: string) => GroundCells | undefined
): string | undefined {
  const west = Math.max(a.x, b.x);
  const east = Math.min(a.x + a.widthM, b.x + b.widthM);
  const north = Math.max(a.y, b.y);
  const south = Math.min(a.y + a.heightM, b.y + b.heightM);
  if (east <= west || south <= north) return undefined;
  const pair = `${a.id} and ${b.id}`;
  const cellsA = cellsOf(a.mapId);
  const cellsB = cellsOf(b.mapId);
  if (cellsA === undefined || cellsB === undefined) {
    const missing = cellsA === undefined ? a : b;
    return `${pair}: overlap, and ${missing.id}'s ground is not placed to compare`;
  }
  const cell = WORLD.DETAIL_CELL_M;
  let disagree = 0;
  let first: PlanPoint | undefined;
  for (let y = north + cell / 2; y < south; y += cell) {
    for (let x = west + cell / 2; x < east; x += cell) {
      if (groundAgrees(a, cellsA, b, cellsB, x, y)) continue;
      disagree++;
      first ??= { x: x - cell / 2, y: y - cell / 2 };
    }
  }
  if (disagree === 0) return undefined;
  return `${pair}: overlap, and ${disagree} shared cells disagree, the first at (${first!.x}, ${first!.y})`;
}

/**
 * Do two placed maps paint the same biome, floor and ceiling under an atlas
 * point? A point off either map's painted grid never agrees: there is nothing
 * there to share.
 */
function groundAgrees(
  a: WorldRegion,
  cellsA: GroundCells,
  b: WorldRegion,
  cellsB: GroundCells,
  x: number,
  y: number
): boolean {
  const ia = cellIndex(cellsA, atlasToLocal(a, { x, y }));
  const ib = cellIndex(cellsB, atlasToLocal(b, { x, y }));
  return (
    ia >= 0 &&
    ib >= 0 &&
    cellsA.biomes[ia] === cellsB.biomes[ib] &&
    cellsA.floor[ia] === cellsB.floor[ib] &&
    cellsA.ceiling[ia] === cellsB.ceiling[ib]
  );
}

function cellIndex(cells: GroundCells, local: PlanPoint): number {
  const col = Math.floor(local.x / cells.cellM);
  const row = Math.floor(local.y / cells.cellM);
  if (col < 0 || row < 0 || col >= cells.cols || row >= cells.rows) return -1;
  return row * cells.cols + col;
}

/**
 * The missions drawn in the world, each on its region: the prologue on the
 * pilot's, *Intake* on the Banding Ground (§7.9, #1598), *Exposure* on the
 * Western Margin (#1612), *Trench Awakening* on the Shallow Band (#1615), and
 * *Shift Change* and *Asset Recovery* on the two Ninefold maps (#1626), *The
 * Dome* on the Fourth's Foot (#1628), *Tend* and *Convocation* on Marr Plateau
 * (#1630), *Thin Water* and *Shallow* on the Kell Shoulder (#1633), *Deep
 * Furrow* and *In Writing* on the Furrow (#1638), the Rim's five on the Rim
 * (#1640), and *Item Nine* and *Tolerance* on Board Country and the Underworks
 * (#1623). A
 * mission on a placed map is not placed until it is named here, so placing one
 * is a line here. On a placed shared map every mission is
 * named (the owner's call on #1505), Radicals excepted.
 */
const MISSION_REGIONS: ReadonlyMap<string, WorldRegion> = new Map([
  [PROLOGUE_SORROWGATE_HEADER.id, SORROWGATE_REGION],
  [ATTENDING_INTAKE_HEADER.id, BANDING_GROUND_REGION],
  [LEDGER_EXPOSURE_HEADER.id, WESTERN_MARGIN_REGION],
  [ATTENDING_TRENCH_AWAKENING_HEADER.id, SHALLOW_BAND_REGION],
  [LEDGER_SHIFT_CHANGE_HEADER.id, UPPER_WORKINGS_REGION],
  [LEDGER_ASSET_RECOVERY_HEADER.id, FACE_SIX_REGION],
  [ATTENDING_THE_DOME_HEADER.id, FOURTH_FOOT_REGION],
  [SEEDING_TEND_HEADER.id, MARR_PLATEAU_REGION],
  [SEEDING_CONVOCATION_HEADER.id, MARR_PLATEAU_REGION],
  [SEEDING_THIN_WATER_HEADER.id, KELL_SHOULDER_REGION],
  [ATTENDING_SHALLOW_HEADER.id, KELL_SHOULDER_REGION],
  [SEEDING_DEEP_FURROW_HEADER.id, ANHOLT_FURROW_REGION],
  [SEEDING_IN_WRITING_HEADER.id, ANHOLT_FURROW_REGION],
  [LEDGER_PROSPECT_HEADER.id, MOUTH_RIM_REGION],
  [SEEDING_SECOND_SEEDING_HEADER.id, MOUTH_RIM_REGION],
  [ATTENDING_FIRST_ARRIVAL_HEADER.id, MOUTH_RIM_REGION],
  [CHORD_RIM_DEPOSITS_HEADER.id, MOUTH_RIM_REGION],
  [CHORD_SECOND_CHORD_HEADER.id, MOUTH_RIM_REGION],
  [LEDGER_ITEM_NINE_HEADER.id, HOLDING_BOARD_REGION],
  [LEDGER_TOLERANCE_HEADER.id, HOLDING_UNDERWORKS_REGION],
]);

/**
 * The world region a mission is drawn in, or `undefined` for a mission that
 * keeps today's presentation.
 *
 * **Keyed on mission identity, never on the map** (§7.1), as the surface
 * profile is (`lookForMission`): Radicals plays on Sorrowgate's map and keeps
 * its own presentation. A session with no mission asks `worldRegionForSession`.
 * Every path into a placed mission — the board, the prologue's Tutorial door,
 * a `?mission=` link, Resume — passes the same id, so one predicate answers
 * for all of them.
 * The one the persistent view (#1458), the regional snapshot (#1460) and the
 * border fade (#1461) all ask; none of them keeps a flag.
 */
export function worldRegionForMission(missionId: string | undefined): WorldRegion | undefined {
  return missionId === undefined ? undefined : MISSION_REGIONS.get(missionId);
}

/**
 * The world region a session is drawn in, or `undefined` for one that keeps
 * today's presentation (§7.1, #1529). A session with a mission is placed by its
 * mission alone, as `worldRegionForMission` says. One without — a `?map=`
 * skirmish boot — is placed by its map id, when that map is a skirmish map with
 * a placement: the mission maps resolve by mission and by nothing else, as the
 * server's catalogues do, so `?map=sorrowgate` is never the pilot's region. No
 * skirmish map is placed yet, so today every one resolves none and the
 * Ventfront Divide stays §7.7's control. `regions` is the placed set, a
 * parameter so a test can place one.
 */
export function worldRegionForSession(
  missionId: string | undefined,
  mapId: string | undefined,
  regions: readonly WorldRegion[] = WORLD_REGIONS
): WorldRegion | undefined {
  if (missionId !== undefined && missionId !== '') return worldRegionForMission(missionId);
  if (mapId === undefined || mapHeaderById(mapId) === undefined) return undefined;
  return regions.find((region) => region.mapId === mapId);
}
