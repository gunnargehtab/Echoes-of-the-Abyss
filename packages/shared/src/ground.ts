/**
 * Public ground — the static half of a map both sides may hold.
 *
 * A map definition is authoring data and lives server-side
 * (`packages/backend/src/sim/maps/`): spawns, forces, resource fields and
 * scripts are information a client has not earned before a match. Its
 * *ground* is not. Every region is public map data already — the server sends
 * the painted cells to every player on join — and the continuous world
 * (docs/world-map.md §7) has to draw a mission's ground before any room
 * exists, so the camera can travel to it.
 *
 * So the ground of a placed map is authored here, once, and its backend
 * literal spreads it: the world renderer and the simulation read one source,
 * and a visual copy cannot drift from the ground the server paints. Only the
 * ground moves here. The backend keeps its painter (`terrainFor`), and a
 * terrain change during a match stays the session's own ground delta, never
 * an edit to this data.
 */

import { Biome } from './types.js';

/**
 * A shape on the grid, in world metres: what a map region paints
 * (docs/maps.md, "How a map is written").
 *
 * Three, since #1106 found a map drawn only in rectangles reading as a
 * checkerboard. A rectangle is a corner and a size. An ellipse is the one
 * inscribed in those same four numbers, so rounding a box off is one word. A
 * polygon is its corners in order.
 */
export interface RectShape {
  shape?: undefined;
  x: number;
  y: number;
  widthM: number;
  heightM: number;
}

export interface EllipseShape {
  shape: 'ellipse';
  /** The rectangle the ellipse is inscribed in, touching each side at its midpoint. */
  x: number;
  y: number;
  widthM: number;
  heightM: number;
}

export interface PolygonShape {
  shape: 'polygon';
  /**
   * The corners in order, as [x, y] in metres. The last joins back to the
   * first. An outline that crosses itself paints by even-odd parity, which is
   * a shape nobody drew, so the map tests refuse one.
   */
  points: readonly (readonly [number, number])[];
}

export type Shape = RectShape | EllipseShape | PolygonShape;

/** What a region paints into the cells it claims, whatever its shape. */
export interface RegionGround {
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
 * A painted region. Painted in array order, so a later region overwrites an
 * earlier one where they overlap, and a cell belongs to the region whose
 * shape holds the cell's *centre* (#157) — the two rules every map's ground
 * is read by, on either side of the wire.
 */
export type GroundRegion =
  (RectShape & RegionGround) | (EllipseShape & RegionGround) | (PolygonShape & RegionGround);

/**
 * A map's ground: its extent, its grid, its base seabed and its regions.
 * Nothing else — no spawn, no force, no field — which is the boundary this
 * file exists to hold.
 */
export interface MapGround {
  widthM: number;
  heightM: number;
  cellM: number;
  /** The seabed before any region carves into it. */
  floorM: number;
  regions: readonly GroundRegion[];
}

/**
 * Sorrowgate's ground — docs/mission-sorrowgate.md §11; docs/maps.md, "Mission
 * maps". The continuous world's pilot (docs/world-map.md §7.1).
 *
 * The terminus of a pre-collapse civic transit line, and the line ran out over
 * a deep basin. Two facts about the water decide the whole mission and both are
 * ground rather than script: the chamber sits at 1,500 m and the thermocline
 * sits at 1,200 m, so nothing said in the court carries upward; and the basin
 * underneath is Abyssal Trench at PF 1.6, which is how a ping fired in the
 * chamber reaches something living in it.
 */
export const SORROWGATE_GROUND: MapGround = {
  widthM: 5000,
  heightM: 4000,
  cellM: 250,
  floorM: 1600,
  // One row per row of §11's table, in the document's order, so the two can be
  // read side by side. Later regions overwrite earlier ones where they overlap,
  // which is what lets the districts be painted whole and everything else cut
  // into them.
  //
  // Drawn in shapes since #1140: the Descent is a ramp, the West Approach a
  // vein and the Gate a dome. Every number is a whole 250 m cell, and a cell is
  // a region's when its shape holds the cell's centre (issue #157). The
  // reshape is new content, never a lever: fourteen cells moved, none under a
  // place either mission seats or orders, and every spawn, hull, order,
  // creature and mission region stands on the ground it stood on. The
  // radicals test pins those points against §11's regions.
  regions: [
    // A box because it is the whole map, painted first.
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 4000,
      biome: Biome.CoralRuins,
      floorM: 1600,
      note: 'The Districts — the drowned city. Painted first; everything else is cut into it',
    },
    // A box because it was built: a terminus. Every one of its cell centres also
    // lies in the mission's `concourse` region, where the tenders are counted.
    {
      x: 1500,
      y: 0,
      widthM: 2000,
      heightM: 750,
      biome: Biome.CoralRuins,
      // Above the 1,200 m layer, which is the whole reason this is where the
      // tenders are going: the layer is a wall, and nothing follows you up.
      floorM: 340,
      note: 'The Upper Concourse — the passenger terminus. The extraction point',
    },
    // A ramp, narrowing from under the Concourse to its foot at the lock's
    // mouth. Its west edge stays on x 2,000, so the one deep cell beside the
    // lock's mouth is still the Districts' (docs/mission-radicals.md §5, leg 4).
    {
      shape: 'polygon',
      points: [
        [2000, 500],
        [3250, 500],
        [3250, 750],
        [2750, 1750],
        [2000, 1750],
      ],
      biome: Biome.CoralRuins,
      // A 900 m floor is what makes "where 1,200 m is crossed" a fact about the
      // ground rather than an instruction: a hull cannot be in the Descent at
      // all without having climbed above the thermocline to get there.
      floorM: 900,
      note: 'The Descent — the step between the Concourse and the city',
    },
    // A vein widening from the west edge to the arch's row. The cells it gave
    // back to the city are at its western end. No line from a place either
    // mission seats or orders the flight to another party crosses them, but a
    // flight that strays into the vein's western end is now heard by Kalliso's
    // seat through city water.
    {
      shape: 'polygon',
      points: [
        [0, 2000],
        [1000, 1250],
        [1500, 1250],
        [1500, 2500],
        [500, 2500],
        [0, 2250],
      ],
      biome: Biome.ThermalVein,
      // Stated rather than inherited, so this file reads row for row against
      // §11's table: the approach is city floor, and only its water is quiet.
      floorM: 1600,
      note: 'The West Approach. PF 0.45 — the one road where the flight can be loud and get away with it. Nothing tells the player this',
    },
    // A box because it was built, and because the missions restate it as a
    // rectangle to cut it back through the fallen span.
    {
      x: 1750,
      y: 1750,
      widthM: 500,
      heightM: 750,
      biome: Biome.CoralRuins,
      floorM: 1500,
      // The only roofed water on the map, and after the arch goes it is the
      // only way out of the chamber. Two 250 m columns, which is as narrow as
      // this grid can hold a passage and still leave one: what has to survive
      // the grid is that it is covered, and a route nobody can be watched
      // taking.
      ceilingM: 1300,
      note: 'The Service Lock — roofed water joining the chamber to the districts',
    },
    // The dome, round on the three rows the basin leaves it (2,250-3,000 m),
    // with the delegations' opening stations just outside it either side. The
    // Commit, painted next, cuts away its southern quarter.
    {
      shape: 'ellipse',
      x: 1750,
      y: 2250,
      widthM: 1500,
      heightM: 1000,
      biome: Biome.CoralRuins,
      floorM: 1500,
      note: 'The Gate — the dome and the chamber. The court',
    },
    // A box because every side of it is held: the far water along its whole
    // southern row, a Hollow near either end of its northern row, the colossus
    // 250 m inside its western edge, and its 12:00 drive ending in its eastern
    // column (docs/mission-radicals.md §6, §11).
    {
      x: 1500,
      y: 3000,
      widthM: 2000,
      heightM: 1000,
      biome: Biome.AbyssalTrench,
      // PF 1.6 and 2,400 m: sound runs a long way along this basin's axis, and
      // nothing the player owns is rated to follow it down. The mission's floor
      // is authored here, in the terrain, rather than enforced anywhere.
      floorM: 2400,
      note: 'The Commit — the basin the city committed its dead into. Needs PR-3',
    },
  ],
};
