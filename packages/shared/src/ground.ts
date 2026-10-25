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
 *
 * `Region` narrows what the regions may be, as the backend's `MapDefinition`
 * does: a map drawn only in rectangles keeps saying so once its ground is
 * here (#1633).
 */
export interface MapGround<Region extends GroundRegion = GroundRegion> {
  widthM: number;
  heightM: number;
  cellM: number;
  /** The seabed before any region carves into it. */
  floorM: number;
  regions: readonly Region[];
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

/** Solid rock, as a region: no depth satisfies ceiling <= D <= floor. */
const ROCK = { floorM: 0, ceilingM: 1 } as const;

/**
 * The Fourth's Foot's ground — docs/mission-the-dome.md §11; docs/maps.md,
 * "Mission maps". Placed in the Rift (docs/world-map.md §7.9, #1628) with its
 * Deep Yard on §7.2's Deep Yard anchor. *Baffle*'s Fourth Trench draws this
 * map's Staging, walls, Trench, lay-bys and Deep Yard in its own literal and is
 * not placed: at one origin the two differ in 8 cells, its last row against
 * this map's Fan, so the Foot stands alone (the owner's call on #1505).
 *
 * The Fourth Trench and the kilometre past it: the freight pipe between two
 * solid walls, the Deep Yard at its southern mouth, and south of it the Fan,
 * the Foot and the cohort galleries cut into the fan's east wall.
 */
export const FOURTH_FOOT_GROUND: MapGround = {
  widthM: 3000,
  heightM: 6000,
  cellM: 250,
  floorM: 1450,
  // One row per row of §11's table, in the document's order. The lay-bys are
  // painted after the walls they notch and the Foot after the Fan it stands
  // at the bottom of, which is what carves water back out of rock and the last
  // bench out of the slope — the same order-of-paint argument as everywhere
  // else.
  //
  // Drawn in shapes since #1154, with rows 2–8 drawn once for both maps in
  // #1143: the walls end on a slant to the margin, the Fan spreads from the
  // yard's mouth, and the Foot is a bench whose northern corners fall to the
  // Fan. Every number is a whole 250 m cell, and a cell is a region's when its
  // shape holds the cell's centre (#157). Every hull, structure, emitter,
  // order, creature and mission region stands on the ground it stood on, and
  // `missionTheDome.test.ts` pins it.
  //
  // A pocket states `ceilingM: 0`, which clears the 1 m rock ceiling the wall
  // painted over it (#1105) — `fourth-trench`'s ground exactly.
  regions: [
    // A box because it is the whole map, painted first: `fourth-trench`'s
    // Margin, a thousand metres taller.
    {
      x: 0,
      y: 0,
      widthM: 3000,
      heightM: 6000,
      biome: Biome.OpenWater,
      floorM: 1450,
      note: "The Margin — the base water. Painted first; everything else is cut into it. Baffle's margin, run a thousand metres south",
    },
    // Rows 2–8 are `fourthTrench.ts`'s, to the metre; that file says why each
    // is the shape it is.
    {
      x: 0,
      y: 0,
      widthM: 3000,
      heightM: 750,
      biome: Biome.ThermalVein,
      floorM: 1100,
      note: "The Staging — the north mouth: the grid's masked apron, above the layer's duct. The concern's muster, and the reason entering the trench is also a crossing",
    },
    {
      shape: 'polygon',
      points: [
        [0, 750],
        [1250, 750],
        [1250, 4250],
        [1000, 4250],
        [0, 3250],
      ],
      biome: Biome.OpenWater,
      ...ROCK,
      note: 'The West Wall — solid. The trench is the only road',
    },
    {
      shape: 'polygon',
      points: [
        [1750, 750],
        [3000, 750],
        [3000, 3250],
        [2000, 4250],
        [1750, 4250],
      ],
      biome: Biome.OpenWater,
      ...ROCK,
      note: 'The East Wall — solid',
    },
    {
      x: 1250,
      y: 750,
      widthM: 500,
      heightM: 3500,
      biome: Biome.AbyssalTrench,
      floorM: 1700,
      note: 'The Trench — the shortcut: PF 1.6, no secrets down its length, only distances. Trench paint at Mid-Water depth, so a PR-2 convoy transits it whole',
    },
    {
      x: 1000,
      y: 1750,
      widthM: 250,
      heightM: 250,
      biome: Biome.ThermalVein,
      // Cut into the wall's rock, whose ceiling (1 m) would otherwise survive
      // under the new floor and roof the pocket over: §11 gives a floor only
      // (#1105).
      floorM: 1700,
      ceilingM: 0,
      note: 'Lay-by One — the northern chartered pocket, notched into the west wall. `baffle-north` moors here, and the picket takes it off the chart at 13:00',
    },
    {
      x: 1750,
      y: 3000,
      widthM: 250,
      heightM: 250,
      biome: Biome.ThermalVein,
      floorM: 1700,
      ceilingM: 0,
      note: 'Lay-by Two — the southern pocket, east wall. `baffle-south`. Half the quiet water on the map, and the other half is the first one',
    },
    {
      x: 750,
      y: 4250,
      widthM: 1500,
      heightM: 500,
      biome: Biome.OpenWater,
      floorM: 1650,
      note: "The Deep Yard — berths, a failing plant, forty-one souls. The concern's, and not the inquiry's. Its floor is the one place a hull is seated on the bottom rather than over it",
    },
    // A fan, spreading from the yard's mouth to the map's width by its third
    // row. The corners it leaves at its head stay the margin's shelf at
    // 1,450 m, which runs on from the walls' feet down both flanks of the yard.
    {
      shape: 'polygon',
      points: [
        [750, 4750],
        [2250, 4750],
        [3000, 5250],
        [3000, 6000],
        [0, 6000],
        [0, 5250],
      ],
      biome: Biome.AbyssalTrench,
      floorM: 2000,
      note: 'The Fan — where the shortcut meets the deep: the trench opens and falls away. The walls have stopped, so this is the first water with no road in it. The Call is sounded here',
    },
    // A bench whose northern corners fall to the Fan. Its north edge stays on
    // y 5,250, so the bench comes no nearer the yard's berth than it did.
    {
      shape: 'polygon',
      points: [
        [1000, 5250],
        [2000, 5250],
        [2250, 5750],
        [2250, 6000],
        [750, 6000],
        [750, 5750],
      ],
      biome: Biome.AbyssalTrench,
      floorM: 2400,
      note: 'The Foot — the last bench: the dome, the array, and what deep basins hold. Painted over the Fan because it is the bottom of it',
    },
    // A box because it is built: the cohort's berths, cut square into the
    // rock.
    {
      x: 2250,
      y: 5000,
      widthM: 750,
      heightM: 1000,
      biome: Biome.CoralRuins,
      floorM: 2900,
      note: "The Freight Galleries — the 4th Trench Cohort's berths, cut into the fan's east wall. Tessen's water: structure, and hard acoustic shadow at PF 0.80",
    },
  ],
};

/**
 * Marr Plateau's ground — docs/mission-tend.md §11; docs/maps.md, "Mission
 * maps". Placed in the Rift (docs/world-map.md §7.9, #1630) centred on §7.2's
 * Marr Plateau anchor. *Tend* and *Convocation* both play it, and both are
 * drawn here (the owner's call on #1505).
 *
 * A garden terrace on the Rift's north shoulder, the shallowest map the
 * campaign plays: the Gardens, the Holdfast and the West Lane on the Terrace,
 * and south of them the Drop, its Face, and Teel's Landing at the east edge.
 */
export const MARR_PLATEAU_GROUND: MapGround = {
  widthM: 4000,
  heightM: 2500,
  cellM: 250,
  floorM: 320,
  // One row per row of §11's table, in the document's order. Later regions
  // overwrite earlier ones; every number a shape states is a whole 250 m cell,
  // and a cell is its region's when the shape holds its centre (#1148). The
  // reshape is new content, never a lever: three cells moved, none under a
  // place either mission seats, orders or bounds, and two of them went from
  // trench to kelp. `missionTend.test.ts` pins both missions' ground.
  regions: [
    // A box because it is the whole map, painted first.
    {
      x: 0,
      y: 0,
      widthM: 4000,
      heightM: 2500,
      biome: Biome.KelpForest,
      floorM: 320,
      note: 'The Terrace — the plateau. Painted first; everything else is cut into it',
    },
    // A box because Tend restates it as the `gardens` region the share's
    // loads are worked in: a shape that painted other cells would draw garden
    // the mission does not count.
    {
      x: 500,
      y: 250,
      widthM: 1250,
      heightM: 750,
      biome: Biome.KelpForest,
      floorM: 250,
      note: "The Gardens — the bloom nodes and the farm rows. The share's source",
    },
    // A box because Convocation restates it as the `holdfast` region a
    // foreign hull holds, and Tend's `holdfast` and `ovens` lie inside it.
    {
      x: 2250,
      y: 250,
      widthM: 750,
      heightM: 500,
      biome: Biome.KelpForest,
      floorM: 280,
      note: "The Holdfast — home, named for what anchors kelp. The spawn, and the share's delivery point",
    },
    // A box because Tend restates it as the `west-lane` region the re-seat
    // is counted in.
    {
      x: 250,
      y: 1000,
      widthM: 1000,
      heightM: 750,
      biome: Biome.KelpForest,
      floorM: 300,
      note: 'The West Lane — the jelly lane. The clusters have walked; the re-seat happens here',
    },
    // The lip runs on a slant to the west edge, so the terrace reaches two
    // rows further south in the edge column. No line from a place either
    // mission seats, sends or holds the player to another party's authored
    // position crosses those two cells, but a hull that strays into them is
    // now heard through kelp rather than trench, and water deeper than 320 m
    // no longer reaches them.
    {
      shape: 'polygon',
      points: [
        [0, 2500],
        [250, 2000],
        [500, 1750],
        [4000, 1750],
        [4000, 2500],
      ],
      biome: Biome.AbyssalTrench,
      floorM: 900,
      note: "The Drop — the bare slope and the survey lane. Trench paint at the Shelf's edge: the drop carries",
    },
    // The bench's east end runs on a slant, so its north-east cell is the
    // Drop's 900 m, trench like the bench, and open to water deeper than
    // 600 m. Every other cell is held: the watch's edge in its north row, the
    // sweep's lane along its south row, and the heavy's climb across its
    // north-west corner.
    {
      shape: 'polygon',
      points: [
        [1500, 1750],
        [2250, 1750],
        [2500, 2250],
        [1500, 2250],
      ],
      biome: Biome.AbyssalTrench,
      floorM: 600,
      note: 'The Face — a nodule bench on the slope that two parties call theirs. The Rift has more than one, which is the problem',
    },
    // A box because Tend restates it as the `landing` region the gift is
    // delivered to.
    {
      x: 3500,
      y: 1750,
      widthM: 500,
      heightM: 500,
      biome: Biome.KelpForest,
      floorM: 400,
      note: "Teel's Landing — the neighbouring terrace's storm-bitten edge. The gift's destination",
    },
  ],
};

/**
 * The Kell Shoulder's ground — docs/mission-thin-water.md §11; docs/maps.md,
 * "Mission maps". Placed in the Rift (docs/world-map.md §7.9, #1633) centred
 * on §7.2's Kell Shoulder anchor. *Thin Water* and *Shallow* both play it, and
 * both are drawn here (the owner's call on #1505).
 *
 * The bare rise between Marr's terraces and Kell's: the Grid Spur across it,
 * the Vent Under-run below the spur, Kell Face at its east end and the Kell
 * Slope falling away along its south. Rectangles only, as the backend map
 * says it is (#1150).
 */
export const KELL_SHOULDER_GROUND: MapGround<RectShape & RegionGround> = {
  widthM: 5000,
  heightM: 3000,
  cellM: 250,
  floorM: 340,
  // One row per row of §11's table, in the document's order. Every rectangle
  // lands on the 250 m cell grid and paints exactly the metres it reads.
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 3000,
      biome: Biome.OpenWater,
      floorM: 340,
      note: "The Shoulder — the bare rise. Painted first; everything else is cut into it. PF 1.0, the thin water, and the mission's whole argument",
    },
    {
      x: 0,
      y: 1250,
      widthM: 5000,
      heightM: 500,
      biome: Biome.OpenWater,
      floorM: 420,
      note: 'The Grid Spur — the closed corridor: pipe, cable, tension frame, seven pump housings. It crosses the map east to west and getting across it is the mission',
    },
    {
      x: 0,
      y: 2500,
      widthM: 5000,
      heightM: 500,
      biome: Biome.AbyssalTrench,
      floorM: 900,
      note: "The Kell Slope — the shoulder's southern edge falling away. Trench paint at Shelf's edge: nothing the column wants is down there, and everything that hears it is",
    },
    {
      x: 1750,
      y: 1750,
      widthM: 1000,
      heightM: 750,
      biome: Biome.ThermalVein,
      floorM: 620,
      note: "The Vent Under-run — the geothermal field the spur draws from. PF 0.45, the map's one mask, and it lies below the corridor: the quiet way is the deep way",
    },
    {
      x: 3750,
      y: 1750,
      widthM: 1250,
      heightM: 750,
      biome: Biome.KelpForest,
      floorM: 300,
      note: "Kell Face — the replanted terrace's working face and the early bloom. The spawn, and the last water in which the column's own numbers are true",
    },
    {
      x: 0,
      y: 250,
      widthM: 2000,
      heightM: 750,
      biome: Biome.KelpForest,
      floorM: 280,
      note: "The Marr Approach — home terrace's outer rows. The first water where 18 means 18 again",
    },
    {
      x: 250,
      y: 0,
      widthM: 1000,
      heightM: 250,
      biome: Biome.KelpForest,
      floorM: 260,
      note: 'The Holdfast Gate — the extraction region. The count is taken here',
    },
  ],
};

/**
 * The Furrow's ground — docs/mission-deep-furrow.md §11; docs/maps.md,
 * "Mission maps". Placed in the Rift (docs/world-map.md §7.9, #1638) centred
 * on §7.2's Furrow anchor. *Deep Furrow* and *In Writing* both play it, and
 * both are drawn here (the owner's call on #1505).
 *
 * A cleft under Anholt's terrace: the Mid-Water lanes and the Foot across its
 * north, two solid walls, and the one road between them falling through the
 * Cleft to the furrows and the Sill. The Second Furrow is trench here, the
 * ground before anyone sowed it; both missions repaint it as live ground.
 */
export const ANHOLT_FURROW_GROUND: MapGround = {
  widthM: 4000,
  heightM: 3000,
  cellM: 250,
  floorM: 1100,
  // One row per row of §11's table, in the document's order. Later regions
  // overwrite earlier ones, which is what lets the lanes be painted whole and
  // the Foot, the walls, the cleft, the furrows and the sill cut into them.
  // Every number a shape states is a whole 250 m cell, and a cell is its
  // region's when the shape holds its centre (#1153). Only the walls and the
  // sill are shapes, and they open twelve cells that were rock and close none.
  // Every authored point and mission region of both missions stands on the
  // ground it stood on when these were all rectangles, every scripted leg
  // routes as it did, and `missionDeepFurrow.test.ts` pins both.
  regions: [
    // A box, because it is the whole map's base.
    {
      x: 0,
      y: 0,
      widthM: 4000,
      heightM: 3000,
      biome: Biome.OpenWater,
      floorM: 1100,
      note: "The Lanes — the freight lanes Tend heard from above. Painted first; everything else is cut into them. The floor is the duct's top, so the lanes end where the layer begins",
    },
    // A box, because both missions' `the-foot` is this same rectangle: home is
    // the water drawn as home.
    {
      x: 1500,
      y: 0,
      widthM: 1000,
      heightM: 500,
      biome: Biome.OpenWater,
      floorM: 900,
      note: "The Foot — the drop's foot, where the plateau's lane comes down. The seat, at 900 m, above the layer, and the region home means",
    },
    // The face on the road is straight at x 1,250 from the mouth to the sill,
    // so the road is 1,500 m wide the whole way and the Hollow is 100 m off it.
    // The outer north corner is cut on a slant, letting the lanes reach south
    // along the map's edge, and the foot gives way on a slant to the sill. The
    // East Wall is its mirror image across x 2,000.
    {
      shape: 'polygon',
      points: [
        [0, 1000],
        [750, 500],
        [1250, 500],
        [1250, 2500],
        [500, 3000],
        [0, 3000],
      ],
      biome: Biome.OpenWater,
      ...ROCK,
      note: 'The West Wall — solid. The cleft is the only road',
    },
    {
      shape: 'polygon',
      points: [
        [2750, 500],
        [3250, 500],
        [4000, 1000],
        [4000, 3000],
        [3500, 3000],
        [2750, 2500],
      ],
      biome: Biome.OpenWater,
      ...ROCK,
      note: 'The East Wall — solid',
    },
    // A box, because its sides are the walls' straight faces.
    {
      x: 1250,
      y: 500,
      widthM: 1500,
      heightM: 1250,
      biome: Biome.AbyssalTrench,
      floorM: 1800,
      note: 'The Cleft — the descent and the doorway. PF 1.6: it carries like a trench because it is one. Hollow country, with the duct at 1,200 across its upper water. 1,500 m wide, so the middle is 750 m from either wall and 650 from either Hollow',
    },
    // A box, because the mission's `standing-furrow` is this same rectangle:
    // the grant lands on the ground drawn.
    {
      x: 1250,
      y: 1750,
      widthM: 1000,
      heightM: 750,
      biome: Biome.KelpForest,
      floorM: 2200,
      note: "The Furrow — the 204 PC ground, ten years grown: a trench floor painted kelp, because seeded ground absorbs. Deep Furrow's zone: `standing-furrow` is the grant that makes it one. The map seats nothing in it, and what stands in it is a mission's to seat",
    },
    // A box, because `second-furrow`, which the ground beat repaints, is this
    // same rectangle.
    {
      x: 2250,
      y: 1750,
      widthM: 500,
      heightM: 750,
      biome: Biome.AbyssalTrench,
      floorM: 2200,
      note: "Second Furrow — bare rock at 00:00, and the sowing's ground. Repainted Kelp Forest by a mission ground beat, which is why it is trench paint here",
    },
    // Where the cleft opens to the deep: its sides run out on a slant from the
    // furrows' corners, so it is 2,000 m of water across its north row and
    // 2,500 m across its south row. The six cells it opens at the walls' feet
    // carry at 1.6 where the rock's paint was 1.0, and no line between two
    // authored positions of either mission crosses one.
    {
      shape: 'polygon',
      points: [
        [1250, 2500],
        [2750, 2500],
        [3500, 3000],
        [500, 3000],
      ],
      biome: Biome.AbyssalTrench,
      floorM: 2600,
      note: "The Sill — where the cleft opens to the deep. The observer's station, and the line's seat. Nothing the plateaus own is rated for it",
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
  'fourth-foot': FOURTH_FOOT_GROUND,
  'marr-plateau': MARR_PLATEAU_GROUND,
  'kell-shoulder': KELL_SHOULDER_GROUND,
  'anholt-furrow': ANHOLT_FURROW_GROUND,
};
