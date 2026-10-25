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
 * ground moves here. The backend keeps its terrain (`terrainFor`); the
 * shape test both sides claim cells by is here, with `paintGround` for ground
 * no server holds, the Rift's atlas among it (`rift.ts`). A terrain change
 * during a match stays the session's own ground delta, never an edit to this
 * data.
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
 * Is (x, y) inside the shape? The grid asks it of each cell's centre, and that
 * is what a region paints. Asked of any other point it answers for the
 * outline, not the ground: a point inside an ellipse can stand in a corner
 * cell the ellipse does not claim, so a test about the ground under a point
 * asks it of that cell's centre.
 *
 * A rectangle is half-open: its west and north edges are in, and its east and
 * south edges belong to the next rectangle along, which is what lets adjacent
 * rectangles tile (#157). An ellipse or a polygon is **closed**: a point on
 * its outline is inside it. The half-open rule hands a point on a slanted edge
 * to the shape east of it, so the mirror image of that shape loses the mirror
 * image of that point, and a symmetric map stops being symmetric along every
 * 45° edge. A rectangle on the grid never meets the question, since no cell
 * centre lies on a cell boundary.
 */
export function shapeContains(shape: Shape, x: number, y: number): boolean {
  switch (shape.shape) {
    case 'ellipse':
      return ellipseContains(shape, x, y);
    case 'polygon':
      return polygonContains(shape.points, x, y);
    default:
      return (
        x >= shape.x && x < shape.x + shape.widthM && y >= shape.y && y < shape.y + shape.heightM
      );
  }
}

function ellipseContains(e: EllipseShape, x: number, y: number): boolean {
  if (x < e.x || x > e.x + e.widthM || y < e.y || y > e.y + e.heightM) return false;
  // Twice the offset from the centre, so a frame in whole metres keeps every
  // term whole: (dx/w)² + (dy/h)² <= 1, multiplied through by w²h². Exact for
  // any frame under 67 km², which is larger than every map, so a centre on the
  // outline is on it rather than a rounding error to either side.
  const w = e.widthM;
  const h = e.heightM;
  const dx = 2 * (x - e.x) - w;
  const dy = 2 * (y - e.y) - h;
  return dx * dx * h * h + dy * dy * w * w <= w * w * h * h;
}

function polygonContains(points: PolygonShape['points'], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[j]!;
    const [bx, by] = points[i]!;
    // Twice the signed area of the triangle a, b, p: zero when p is on the
    // line through the edge, and exact in whole metres, so a point on the
    // outline is caught here rather than left to round either way below.
    const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (
      cross === 0 &&
      x >= Math.min(ax, bx) &&
      x <= Math.max(ax, bx) &&
      y >= Math.min(ay, by) &&
      y <= Math.max(ay, by)
    ) {
      return true;
    }
    // Even-odd: a ray from p toward +x crosses this edge when the edge spans
    // p's row and passes east of p.
    if (ay > y !== by > y && (by > ay ? cross > 0 : cross < 0)) inside = !inside;
  }
  return inside;
}

/**
 * A ground painted onto its grid: one value per cell, row-major from the
 * north-west corner, as the server's terrain and the join payload hold it.
 */
export interface GroundCells {
  cols: number;
  rows: number;
  cellM: number;
  biomes: Uint8Array;
  floor: Uint16Array;
  ceiling: Uint16Array;
}

/**
 * Paint a ground's regions onto its grid, by the backend's rules
 * (`terrainFor`): open water at the base floor, then each region in order,
 * claiming the cells whose centres its shape holds. A region writes its biome
 * always and its floor and ceiling only where it states them, so one that
 * says nothing about the water column leaves what an earlier region put
 * there. The world renderer paints with this; a backend test holds it to
 * `terrainFor` cell for cell on every map.
 */
export function paintGround(ground: MapGround): GroundCells {
  const cols = Math.ceil(ground.widthM / ground.cellM);
  const rows = Math.ceil(ground.heightM / ground.cellM);
  const cells: GroundCells = {
    cols,
    rows,
    cellM: ground.cellM,
    biomes: new Uint8Array(cols * rows).fill(Biome.OpenWater),
    floor: new Uint16Array(cols * rows).fill(ground.floorM),
    ceiling: new Uint16Array(cols * rows),
  };
  paintRegions(cells, ground.regions);
  return cells;
}

/**
 * Paint regions over cells that already hold ground, by the same rules.
 * `origin` is the grid's north-west corner in the regions' own frame, so a
 * surround authored in atlas metres paints onto a grid that starts anywhere
 * in the atlas.
 */
export function paintRegions(
  cells: GroundCells,
  regions: readonly GroundRegion[],
  origin: { x: number; y: number } = { x: 0, y: 0 }
): void {
  for (const region of regions) {
    for (let row = 0; row < cells.rows; row++) {
      const y = origin.y + (row + 0.5) * cells.cellM;
      for (let col = 0; col < cells.cols; col++) {
        if (!shapeContains(region, origin.x + (col + 0.5) * cells.cellM, y)) continue;
        const index = row * cells.cols + col;
        cells.biomes[index] = region.biome;
        if (region.floorM !== undefined) cells.floor[index] = region.floorM;
        if (region.ceilingM !== undefined) cells.ceiling[index] = region.ceilingM;
      }
    }
  }
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

/**
 * The Banding Ground's ground — docs/mission-intake.md §11; docs/maps.md,
 * "Mission maps". The second map placed in the Rift (docs/world-map.md §7.9,
 * #1598), at the banding ground's anchor.
 *
 * The upper Ninth above Sufficiency and below the duct: the doorway between
 * Mid-Water and the Abyssal, 1,500 m at the ascent's foot to 2,400 m in the
 * throat. The overhangs are the map's one piece of gameplay geometry, a
 * hundred metres of lift over the bench and not a fence, and every useful
 * move on it is upward.
 */
export const BANDING_GROUND_GROUND: MapGround = {
  widthM: 5000,
  heightM: 4000,
  cellM: 250,
  floorM: 2400,
  // One row per row of §11's table, in the document's order. Later regions
  // overwrite earlier ones, which is what lets the trench be painted whole and
  // the halls, the ascent and the muster cut into its north wall. Every
  // number a shape states is a whole 250 m cell, and a cell is its region's
  // when the shape holds its centre (#1152). Only the two overhangs are
  // shapes, and they trade cells between 2,150 and 2,400 m of Abyssal Trench
  // and nothing else; every hull, every Hollow, both ends of the Sounder's
  // line and all three mission regions stand on the ground they stood on when
  // these were all rectangles, and `missionIntake.test.ts` pins it.
  regions: [
    // A box, because it is the whole map's base.
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 4000,
      biome: Biome.AbyssalTrench,
      floorM: 2400,
      note: 'The Upper Ninth — the trench. PF 1.60, painted first; everything else is cut into it',
    },
    // A box, because it is built: the berths, cut to a line.
    {
      x: 1500,
      y: 0,
      widthM: 2000,
      heightM: 500,
      biome: Biome.CoralRuins,
      floorM: 1750,
      note: "The Cohort Halls — the year's berths, cut into the north wall. Structure and hard acoustic shadow, for a place that is not ruined",
    },
    // A box, because the mission's `the-ascent` region is this same
    // rectangle: the roll is filed on the stair drawn.
    {
      x: 2250,
      y: 0,
      widthM: 500,
      heightM: 250,
      biome: Biome.CoralRuins,
      floorM: 1500,
      note: "The Ascent — the stair north out of the map, toward the shallows. The roll's region. Its floor is the shallowest metre this mission authors, and it is 1,100 m below mission 4's line",
    },
    // A box, because the mission's `the-muster` region is this same rectangle.
    {
      x: 1750,
      y: 500,
      widthM: 1500,
      heightM: 500,
      biome: Biome.CoralRuins,
      floorM: 1900,
      note: 'The Muster — the banding ground proper. The spawn',
    },
    // A box, because the mission's `the-bench` region is this same rectangle,
    // and the Sounder's line runs down it at x 2,500.
    {
      x: 1500,
      y: 1250,
      widthM: 2000,
      heightM: 1500,
      biome: Biome.AbyssalTrench,
      floorM: 2250,
      note: "The Bench — the open middle, and the Sounder's line",
    },
    // Its two corners on the bench side are cut on a slant, so it narrows
    // toward the bench and meets it across the middle 500 m of the bench's
    // edge, and the Ninth's 2,400 m runs along the bench's edge for the 500 m
    // at each end. Every Hollow on it stands on a cell the cut leaves.
    {
      shape: 'polygon',
      points: [
        [250, 1250],
        [750, 1250],
        [1500, 2000],
        [750, 2750],
        [250, 2750],
      ],
      biome: Biome.AbyssalTrench,
      floorM: 2150,
      note: "The West Overhang — trench wall and overhang. Hollow country, and half the year's income",
    },
    // The West Overhang's mirror image across x 2,500.
    {
      shape: 'polygon',
      points: [
        [4250, 1250],
        [4750, 1250],
        [4750, 2750],
        [4250, 2750],
        [3500, 2000],
      ],
      biome: Biome.AbyssalTrench,
      floorM: 2150,
      note: 'The East Overhang — the other half, four kilometres from the first',
    },
    // A box: it paints the Upper Ninth's own biome and floor, so any shape
    // would paint the same ground. It is on the chart so the door has a name.
    {
      x: 2000,
      y: 3250,
      widthM: 1000,
      heightM: 750,
      biome: Biome.AbyssalTrench,
      floorM: 2400,
      note: 'The Throat — where the Ninth leaves the map southward toward Sufficiency. The Sounder arrives through it',
    },
  ],
};

/**
 * The Western Margin's ground — docs/mission-exposure.md §11; docs/maps.md,
 * "Mission maps". The third map placed in the Rift (docs/world-map.md §7.9,
 * #1612), its centre on the Western Margin's anchor, edge to edge north of
 * the Shallow Band.
 *
 * The top step of the trench country, west end: a shelf lane above the layer,
 * a long slope through it, and the worked ground along the First Trench's rim
 * painted with the trench's own carrying acoustics. The worked ground stops at
 * 1,750 m, fifty metres above the Abyssal band.
 */
export const WESTERN_MARGIN_GROUND: MapGround = {
  widthM: 5000,
  heightM: 3000,
  cellM: 250,
  floorM: 1500,
  // One row per row of §11's table, in the document's order. Later regions
  // overwrite earlier ones; every number a shape states is a whole 250 m cell,
  // and a cell is its region's when the shape holds its centre (#1144). Every
  // spawn, hull, emitter, beat point and leg the mission authors, and every
  // cell of its shelf-lane region, stands on the ground it stood on when these
  // were all rectangles, and `missionExposure.test.ts` pins it.
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 3000,
      biome: Biome.OpenWater,
      floorM: 1500,
      note: "The Margin — the base water. Painted first; everything else is cut into it. A bench at the slope's foot at either end",
    },
    // A box, because the mission's `shelf-lane` region is this same
    // rectangle: the water the record comes home to is the water drawn.
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 750,
      biome: Biome.OpenWater,
      floorM: 1050,
      note: "The Shelf Lane — the muster and the way home, above the layer's duct: the return line",
    },
    // Its top row runs the map's whole width, so every way down from the
    // shelf lane crosses it. Its foot is ragged: a spur runs down south of the
    // muster, between the two canyons the listening ground cuts into it.
    {
      shape: 'polygon',
      points: [
        [0, 750],
        [5000, 750],
        [5000, 1500],
        [4500, 1750],
        [2500, 1750],
        [2250, 1500],
        [0, 1500],
      ],
      biome: Biome.OpenWater,
      floorM: 1450,
      note: 'The Slope — the crossing: the layer passes through this band, and so does everything that matters',
    },
    // A basin rather than a band: it reaches up the slope in two canyons, the
    // western one opening beside the Hollow, and pulls back from the map's
    // edges at the slope's foot. Its southern edge is the rim, straight,
    // because the worked ground below it is.
    {
      shape: 'polygon',
      points: [
        [0, 2250],
        [0, 2000],
        [500, 2000],
        [750, 1500],
        [1250, 1500],
        [1500, 1000],
        [2000, 1000],
        [2500, 1750],
        [3500, 1750],
        [3750, 1250],
        [4250, 1250],
        [4500, 1750],
        [5000, 2000],
        [5000, 2250],
      ],
      biome: Biome.OpenWater,
      floorM: 1600,
      note: "The Listening Ground — below the layer: the survey's working water, open and honest about it",
    },
    // A box, because it is one cell: any shape drawn in this frame paints the
    // cell or nothing, and a larger one would widen the only cover on this
    // side of the door.
    {
      x: 750,
      y: 1500,
      widthM: 250,
      heightM: 250,
      biome: Biome.ThermalVein,
      floorM: 1600,
      note: "The Hollow — one vent pocket on the listening ground's edge: the survey's cover, and the only masked water on this side of the door",
    },
    // A box, because its northern row is held: the watch's beat, and the turn
    // the recall sends it on from anywhere along that beat, cross 14 of the
    // row's 20 cells, and moving the edge anywhere moves PF 1.6 water — the
    // acoustics the mission is about.
    {
      x: 0,
      y: 2250,
      widthM: 5000,
      heightM: 750,
      biome: Biome.AbyssalTrench,
      floorM: 1750,
      note: "The Worked Ground — the rim: rendering row, freight axis, the six points, and the watch's beat. Trench paint at Mid-Water depth",
    },
  ],
};

/**
 * The Shallow Band's ground — docs/mission-trench-awakening.md §11;
 * docs/maps.md, "Mission maps". The fourth map placed in the Rift
 * (docs/world-map.md §7.9, #1615), centred on the First Trench's anchor, edge
 * to edge south of the Western Margin.
 *
 * The First Trench at 1,800 m: north is shallow and south is deep — the worked
 * rim at 1,750 m, the yards cut into the north wall under it at 1,850, the
 * overhangs either side of the axis at 2,150, and the axis falling away to
 * 2,400.
 */
export const SHALLOW_BAND_GROUND: MapGround = {
  widthM: 5000,
  heightM: 4000,
  cellM: 250,
  floorM: 2400,
  // One row per row of §11's table, in the document's order. Later regions
  // overwrite earlier ones, which is what lets the trench be painted whole and
  // the rim, the yards and the stalls cut into its north wall afterwards.
  // Every number a shape states is a whole 250 m cell, and a cell is its
  // region's when the shape holds its centre (#1155). Only the two overhangs
  // are shapes, and they trade cells between 2,150 and 2,400 m of Abyssal
  // Trench and nothing else; every hull, structure, emitter, Hollow and
  // colossus point stands on the ground it stood on when these were all
  // rectangles, and `missionTrenchAwakening.test.ts` pins it.
  regions: [
    // A box, because it is the whole map's base.
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 4000,
      biome: Biome.AbyssalTrench,
      floorM: 2400,
      note: 'The First — the trench. PF 1.60, painted first; everything else is cut into it',
    },
    // A box, because it is worked ground, cut to a line.
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 750,
      biome: Biome.CoralRuins,
      floorM: 1750,
      note: "The Rim — the worked rim, docs/mission-exposure.md's worked ground continuing east. Cut structure and hard acoustic shadow, for ground that is worked rather than ruined",
    },
    // A box, because it is built.
    {
      x: 750,
      y: 750,
      widthM: 3000,
      heightM: 500,
      biome: Biome.CoralRuins,
      floorM: 1850,
      note: 'The Rendering Row — the yards cut into the north wall under the rim: the plant, the dome and the grower, west to east, and the apron a grown hull is delivered onto',
    },
    // A box, because it is built.
    {
      x: 3750,
      y: 750,
      widthM: 1000,
      heightM: 500,
      biome: Biome.CoralRuins,
      floorM: 1900,
      note: "The Stalls — the reassigned's berths, heard as maintenance. The emitter stands here, off the player's party",
    },
    // Its north end reaches north on a slant to meet the rim at the map's west
    // edge, rather than leaving a box of the First's water beside the row's
    // end; its inner south corner is cut on a slant toward the axis. Every
    // Hollow on it stands on 2,150 m as before.
    {
      shape: 'polygon',
      points: [
        [0, 750],
        [750, 1250],
        [1250, 1250],
        [1250, 1750],
        [750, 2750],
        [0, 2750],
      ],
      biome: Biome.AbyssalTrench,
      floorM: 2150,
      note: "The West Overhang — trench wall and overhang. Hollow country, and half the band's income",
    },
    // The West Overhang's south corner mirrored across x 2,500. Its north end
    // reaches north into one of the two cells beside the stalls, leaving the
    // other, against the rim, to the First: the stalls are built and reach to
    // x 4,750, so the slant has one column to run in.
    {
      shape: 'polygon',
      points: [
        [3750, 1250],
        [4750, 1250],
        [5000, 750],
        [5000, 2750],
        [4250, 2750],
        [3750, 1750],
      ],
      biome: Biome.AbyssalTrench,
      floorM: 2150,
      note: 'The East Overhang — the other half, four kilometres from the first',
    },
    // A box: it paints the First's own biome and floor, clear of both
    // overhangs, so its outline changes no cell and is a name.
    {
      x: 1250,
      y: 1250,
      widthM: 2500,
      heightM: 2750,
      biome: Biome.AbyssalTrench,
      floorM: 2400,
      note: "The Axis — the channel: freight water, and the colossus's corridor",
    },
    // A box, for the Axis's reason.
    {
      x: 2000,
      y: 3750,
      widthM: 1000,
      heightM: 250,
      biome: Biome.AbyssalTrench,
      floorM: 2400,
      note: "The Sill — where the First leaves the map southward toward the Second. It carries the axis's own biome and floor and repaints nothing; it is on the chart so the door has a name",
    },
  ],
};

/**
 * Face Six's ground — docs/mission-asset-recovery.md §11; docs/maps.md,
 * "Mission maps". Placed in the Rift (docs/world-map.md §7.9, #1626),
 * centred on the Ninefold Vein's anchor, a row south of the Upper Workings.
 *
 * The Vein's sixth face, fallen: the Field is Thermal Vein at PF 0.45 and the
 * blowout channel through it raw rock at PF 1.6, so the one place the column
 * must work is the one place the whole field hears it.
 */
export const FACE_SIX_GROUND: MapGround = {
  widthM: 4000,
  heightM: 3000,
  cellM: 250,
  floorM: 1000,
  // One row per row of §11's table, in the document's order. Later regions
  // overwrite earlier ones, which is what lets the Field be painted whole and
  // the wound cut into it — and the fall cut into the wound. Every number a
  // shape states is a whole 250 m cell, and a cell is its region's when the
  // shape holds its centre (docs/maps.md, "How a map is written").
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 4000,
      heightM: 3000,
      biome: Biome.ThermalVein,
      floorM: 1000,
      note: "The Field — the Vein's masked working ground. Painted first; everything else is cut into it. A box because it is the whole map",
    },
    {
      x: 1500,
      y: 0,
      widthM: 1000,
      heightM: 500,
      biome: Biome.ThermalVein,
      floorM: 700,
      note: "The Rail Head — staging, the writ's delivery point, the extraction point. A built yard, so a box, and the same box the writ counts deliveries in",
    },
    {
      shape: 'polygon',
      points: [
        [0, 750],
        [250, 500],
        [500, 500],
        [750, 250],
        [1250, 250],
        [1500, 500],
        [2500, 500],
        [2750, 250],
        [3250, 250],
        [3500, 500],
        [3750, 500],
        [4000, 750],
        [4000, 1000],
        [3750, 1000],
        [3250, 1500],
        [750, 1500],
        [250, 1000],
        [0, 1000],
      ],
      biome: Biome.ThermalVein,
      floorM: 850,
      note: "The Terrace — the herd's feeding ground and the road's shallow shoulder. It rises about each of the vent line's two eruption sites, sags into an apron below each, and thins to the map's edges",
    },
    {
      shape: 'polygon',
      points: [
        [1500, 1250],
        [2500, 1250],
        [2750, 1750],
        [2750, 2000],
        [1000, 2000],
      ],
      biome: Biome.ThermalVein,
      floorM: 1100,
      note: "The Works — the descent road, leaving the Terrace's lip under the Rail Head and fanning west into the old workings where it meets the Scar. PF 0.45: the column's own ground protects it here, and nothing tells the player this",
    },
    {
      shape: 'polygon',
      points: [
        [1000, 2000],
        [2500, 2000],
        [3000, 2500],
        [2500, 2750],
        [2250, 2750],
        [2250, 3000],
        [1750, 3000],
        [1750, 2750],
        [1000, 2750],
      ],
      biome: Biome.AbyssalTrench,
      floorM: 1150,
      note: "The Scar — the blowout channel, torn east to a point and down past the fall to the field's south edge, where the vent line under the face blew out. Raw rock, PF 1.6, the wound that carries. Trench paint at Mid-Water depth: biome is acoustics, not band",
    },
    {
      x: 1750,
      y: 2250,
      widthM: 500,
      heightM: 500,
      biome: Biome.CoralRuins,
      floorM: 1150,
      note: 'Face Six — the fall itself: collapsed structure, hard acoustic shadows, the chamber inside. Cut into the Scar, painted after it. A box because the mission closes the fall as this rectangle (§8), and on four cells an ellipse paints the same four',
    },
  ],
};

/**
 * The Upper Workings' ground — docs/mission-shift-change.md §11; docs/maps.md,
 * "Mission maps". Placed in the Rift (docs/world-map.md §7.9, #1626), its
 * rail head on Fivewell, a row north of Face Six.
 *
 * The producing Vein, straddling the layer: floors above the thermocline
 * north of the workings, floors below it south, and no region whose water
 * spans it, so every crossing is a climb somebody ordered.
 */
export const UPPER_WORKINGS_GROUND: MapGround = {
  widthM: 4000,
  heightM: 3000,
  cellM: 250,
  floorM: 1100,
  // One row per row of §11's table, in the document's order. Later regions
  // overwrite earlier ones; every number a shape states is a whole 250 m cell,
  // and a cell is its region's when the shape holds its centre (#1142). Every
  // spawn, field, hull and beat the mission places stands on the ground it
  // stood on when these were all rectangles, an idle shift walks the tracks it
  // walked on them (#1171), and `missionShiftChange.test.ts` pins both.
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 4000,
      heightM: 3000,
      biome: Biome.ThermalVein,
      floorM: 1100,
      note: "The Field — the Vein's masked working ground. Painted first; everything else is cut into it",
    },
    // A box, because it is built: and the mission's extract region is this same
    // rectangle, so the berths the watches are counted in are the berths drawn.
    {
      x: 1500,
      y: 0,
      widthM: 1000,
      heightM: 500,
      biome: Biome.ThermalVein,
      floorM: 850,
      note: 'The Rail Head — the Fivewell rail transfer: berths, registry office, the transfer point. Above the layer',
    },
    // A box, because it is built: a graded freight road, and both passes walk
    // its whole length on lines that cross every cell of it.
    {
      x: 0,
      y: 500,
      widthM: 4000,
      heightM: 500,
      biome: Biome.ThermalVein,
      floorM: 950,
      note: "The High Road — the audit's ground: the freight road along the workings' shoulder, above the layer",
    },
    // A basin rather than a band: its north edge draws back at both ends, and
    // never enters the shoulder row, so the climb to the road is as long as it
    // was. Its south edge is the rectangle's, straight along the faces' heads:
    // an ellipse there dipped into the Field between the faces and changed how
    // the packs reach the muster (#1171).
    {
      shape: 'polygon',
      points: [
        [0, 1500],
        [750, 1500],
        [1000, 1250],
        [3000, 1250],
        [3250, 1500],
        [4000, 1500],
        [4000, 2000],
        [0, 2000],
      ],
      biome: Biome.ThermalVein,
      floorM: 1300,
      note: 'The Downworks — the working level below the layer: the refinery and the roads between faces, with the pack above the layer over its east end',
    },
    // An old cut, worked down the slope past the last seam.
    {
      shape: 'polygon',
      points: [
        [250, 2000],
        [1250, 2000],
        [1250, 2500],
        [750, 2750],
        [500, 2500],
      ],
      biome: Biome.ThermalVein,
      floorM: 1350,
      note: 'Face Two — the dying face: the muster, the last seam, and the thin field',
    },
    // A fresh, round working opening off the Downworks' south edge.
    {
      shape: 'ellipse',
      x: 2500,
      y: 2000,
      widthM: 1250,
      heightM: 750,
      biome: Biome.ThermalVein,
      floorM: 1350,
      note: 'Face Five — the producing face the quota leans on: the rich field',
    },
  ],
};

/**
 * The public ground of each placed map, by map id. Here rather than beside
 * the atlas (`rift.ts`) because `worldRegionProblems` compares two placed
 * maps' cells, and `world.ts` cannot import the file that imports it.
 */
export const PLACED_GROUND: Readonly<Record<string, MapGround>> = {
  sorrowgate: SORROWGATE_GROUND,
  'banding-ground': BANDING_GROUND_GROUND,
  'first-trench-margin': WESTERN_MARGIN_GROUND,
  'shallow-band': SHALLOW_BAND_GROUND,
  'ninefold-face-six': FACE_SIX_GROUND,
  'ninefold-workings': UPPER_WORKINGS_GROUND,
};
