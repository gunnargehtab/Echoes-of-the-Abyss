/**
 * Kelp Labyrinth — docs/maps.md, Map Type 2.
 *
 * "A dense maze of kelp forests with hidden paths and stealth zones."
 *
 * The third argument, and the reason these three were chosen: this map is
 * neither a masked middle nor an exposed one, it is **broken sightlines**.
 * Kelp is PF 0.55 and, per docs/environments.md, everything in it "sounds
 * close and dead" — so the maze does not hide an army so much as destroy the
 * player's ability to tell how far away one is. A contact at Tier 2 in here is
 * far less useful than the same contact in open water.
 *
 * The maze is built from kelp blocks with open-water corridors between them,
 * which is what "multiple winding routes" is when written as data: the routes
 * are the gaps.
 */

import { Biome, KELP_LABYRINTH_HEADER, ResourceKind } from '@echoes/shared';
import type { MapDefinition } from './types.ts';

const W = KELP_LABYRINTH_HEADER.widthM;
const H = KELP_LABYRINTH_HEADER.heightM;

/**
 * The maze, authored as **one quadrant**. The other three are its mirror
 * images, generated below rather than written down (#631).
 *
 * The map is 8,000 m square and declares four seats, so every chair has to be
 * the same chair. #626 equalised everything a match turns on — the beds, the
 * cold-shock sites, the corner pockets, the crystal approach — and left the
 * maze itself, which was ten hand-placed rectangles with not one of them
 * carrying its own rotated image. The corridors that fell out of that were a
 * 6.7% spread in the approach to the far expansion depending on which corner
 * you woke up in, and nothing in the data kept the next edit from widening it.
 *
 * Writing the quadrant is the fix, rather than nudging ten rectangles until
 * the counts fall to zero: symmetry becomes a property of *how the map is
 * written* instead of a property of its numbers, so the next edit cannot
 * reintroduce the drift without deleting the mechanism that generates it.
 * That is the same argument the repository makes about a constant living in
 * one place.
 *
 * ## What the quadrant says
 *
 * Two concentric kelp walls around the central pocket, each with one gate per
 * side, **staggered**: the outer wall opens on the centre lines, the inner
 * wall on the diagonals. A run at the crystal therefore cannot be a straight
 * one — through the outer gate you face the inner wall broadside and have to
 * travel a quarter turn along a 250 m corridor to find its door. That is what
 * "multiple winding routes" is when written as data, and it is what the old
 * blob of kelp with two slits in it never actually did.
 *
 * The four corner pressure pockets are the other four doors. Each one is
 * painted over the outer wall's corner further down this file, so the diagonal
 * approach is open — and it drops a raider one step from the inner wall's own
 * gate. The shortcut through the maze really is the fast way in, and it is
 * still the one that costs hull.
 *
 * Stated on the 250 m cell grid, as everything in this file is: a block that
 * paints wider than it reads narrows a corridor somewhere, and the corridors
 * are the map.
 */
const QUADRANT: Array<[number, number, number, number]> = [
  // Outer wall, north arm. It runs from the corner to x 3,750 and stops there,
  // so the arm and its own mirror leave a 500 m gate on the centre line.
  [1750, 1750, 2000, 750],
  // Outer wall, west arm — the same gate on the other axis, but starting at
  // y 2,500 rather than at the corner, because the corner belongs to the arm
  // above. That is what gives each quadrant a handedness: the two faces of the
  // same wall are not interchangeable, so the maze reads as a maze rather than
  // as a ring with four notches cut in it.
  [1750, 2500, 750, 1250],
  // Inner wall, north arm. It starts at x 3,250, well clear of the corner, and
  // reaches the centre line — so with its mirror it is one 1,500 m slab
  // squarely across the outer wall's gate. Come through the gate and the wall
  // is in front of you, not a corridor.
  [3250, 2750, 750, 500],
  // Inner wall, west arm — two cells, hung below the corner rather than from
  // it, which leaves y 3,250-3,500 open at x 2,750-3,250. That gap is the
  // inner wall's door, and it is on the diagonal from the gate you came in by.
  [2750, 3500, 500, 500],
];

/**
 * The quadrant reflected into the other three. Reflection rather than
 * rotation: a quarter-turn about the centre gives a pinwheel, four identical
 * approaches that spiral the same way, and this map's centre is already a
 * pressure pocket with one prize in it. Reflected, the four approaches are
 * mirror images and the middle reads as a chamber rather than a turbine.
 *
 * A block whose far edge lands exactly on a centre line abuts its own mirror
 * and the pair paint as one wall; a block that stops short of one leaves a
 * gate twice the gap. Both are used above.
 */
const MAZE: Array<[number, number, number, number]> = QUADRANT.flatMap(
  ([x, y, widthM, heightM]) => [
    [x, y, widthM, heightM],
    [W - x - widthM, y, widthM, heightM],
    [x, H - y - heightM, widthM, heightM],
    [W - x - widthM, H - y - heightM, widthM, heightM],
  ]
);

type Point = readonly [number, number];

/** An outline reflected across the north-south centre line, or the east-west one. */
const mirrorX = (path: readonly Point[]): Point[] => path.map(([x, y]) => [W - x, y]);
const mirrorY = (path: readonly Point[]): Point[] => path.map(([x, y]) => [x, H - y]);

/**
 * The lagoon's rim through the north-west quarter, from the north centre line
 * to the west centre line. Drawn in shapes since #1137: in rectangles the
 * open ring was a square frame inside a square frame, and from the survey
 * dolly the map read as a checkerboard.
 *
 * The coral bows in between the seats, the way a reef rim does, and leaves
 * the lagoon's corners where they were:
 *
 * - **North and south, it shoulders the vent field**: a row of coral 1,000 m
 *   long either side of each vent, and a second cell against each of its
 *   ends. The vents stand in a coral bay rather than on a ruled line, and the
 *   shared expansion beside each keeps the open water it is worked in.
 * - **East and west, it reaches toward the outer gate**, inboard of the wall
 *   tunnel: a cell in from y 2,500 to y 5,500, and a second over the 1,000 m
 *   facing the gate. Coral is where ambushes start (the ring's own comment
 *   below), so the shadow now stands a cell from the door into the maze, and
 *   the ring road past it is the 250 m of open water between the two.
 *
 * What it could not move is what the seats stand on and look along. The
 * corner of the lagoon in front of each seat holds the Foundry and the home
 * field, and the line from a seat to each neighbour runs down the coral's
 * last row and column before the lagoon. So the rim only advances, never
 * recedes, and every straight line between two spawns crosses the cells it
 * always did; `maps.test.ts` pins what each one crosses.
 *
 * The 45° steps are corners on the grid, and a centre on a slanted edge is
 * inside the outline, so each slant keeps the cell it runs through in the
 * lagoon.
 */
const RIM: readonly Point[] = [
  [W / 2, 1500],
  [2750, 1500],
  [2500, 1250],
  [2000, 1250],
  [1750, 1000],
  [1000, 1000],
  [1000, 2250],
  [1250, 2500],
  [1250, 3250],
  [1500, 3500],
  [1500, H / 2],
];

/**
 * The rim all the way round, as one outline: each quarter is the north-west
 * one reflected, and joins the next on a centre line, so the lagoon is
 * symmetric for the same reason the maze is.
 */
const LAGOON: readonly Point[] = [
  ...RIM,
  ...mirrorY(RIM).reverse().slice(1),
  ...mirrorX(mirrorY(RIM)).slice(1),
  ...mirrorX(RIM).reverse().slice(1, -1),
];

/**
 * The north-west corner pocket, drawn as a pit rather than a square (#1137).
 *
 * It was the three-cell square over the outer wall's corner, and three of its
 * cells are on the diagonal from this seat to the far one, so they stay. Its
 * two inner sides meet the wall's arms, which stay too: eating them would
 * widen the door the pocket is. So it spreads the only way left, out into
 * the lagoon: a cell pair north and west, cut on the slant facing the seat,
 * which leaves the diagonal's own lagoon cell open. Thirteen cells where the
 * square held nine.
 */
const POCKET: readonly Point[] = [
  [2000, 1500],
  [2250, 1500],
  [2250, 1750],
  [2500, 1750],
  [2500, 2500],
  [1750, 2500],
  [1750, 2250],
  [1500, 2250],
  [1500, 2000],
];

const POCKETS: readonly (readonly Point[])[] = [
  POCKET,
  mirrorX(POCKET),
  mirrorY(POCKET),
  mirrorX(mirrorY(POCKET)),
];

/**
 * Every number a region states in this file is a whole 250 m cell (issue
 * #157, docs/maps.md "How a map is written"): a rectangle's corner and size,
 * an outline's corners. The rectangles were re-stated that way when the
 * centre rule landed, and the cells the maze paints are the cells it has
 * always played on: on a maze map the paint *is* the design, and a block
 * quietly a column wider than its literal is a corridor quietly a column
 * narrower.
 *
 * The lagoon and the corner pockets moved cells when they became shapes
 * (#1137): 52 of open water to coral and 16 to trench, all outside the maze.
 * The maze and the central pocket kept every cell. The maze's corridors are
 * the map, and the central pocket's corners stand on both diagonals.
 */
export const KELP_LABYRINTH: MapDefinition = {
  ...KELP_LABYRINTH_HEADER,
  doc: 'docs/maps.md — Map Type 2',
  cellM: 250,
  // Mid-Water throughout. This map's argument is broken sightlines, not
  // pressure, so the ground is mostly level and the maze does the work.
  floorM: 1800,
  regions: [
    // "Outer ring: Coral Ruins" — painted first, as the ground everything
    // else sits on. Hard shadows, so the ring is where ambushes start.
    { x: 0, y: 0, widthM: W, heightM: H, biome: Biome.CoralRuins, note: 'Outer ring' },
    // The open expansion ring, cut out of the coral: the lagoon, whose rim
    // `RIM` draws.
    {
      shape: 'polygon',
      points: LAGOON,
      biome: Biome.OpenWater,
      note: '"Open outer ring for expansions" — the coral ring is what is left outside it',
    },
    // "Center: Kelp Forest Plateaus" — the maze itself.
    ...MAZE.map(([x, y, widthM, heightM]) => ({
      x,
      y,
      widthM,
      heightM,
      biome: Biome.KelpForest,
    })),
    // "Deep pockets: Abyssal pressure zones" — the shortcut through the maze
    // is also the one that costs hull.
    {
      x: 3500,
      y: 3500,
      widthM: 1000,
      heightM: 1000,
      biome: Biome.AbyssalTrench,
      // Deep enough for the crystal field seated at 2,400 m. "Behind the maze"
      // is now also "below it".
      floorM: 2600,
      note: 'Central pocket — the fast way across, and the loud one',
    },
    // Thermal vents on the ring. The doc's biome list for this map does not
    // include them, but Thermal Draw is tapped from veins and a map with none
    // would put its players permanently on the Bastion's own plant with no way
    // to scale. Sited on the open ring rather than in the maze, so taking one
    // is exposed — which is the trade the resource is supposed to create.
    { x: 3000, y: 750, widthM: 2000, heightM: 750, biome: Biome.ThermalVein },
    { x: 3000, y: H - 1500, widthM: 2000, heightM: 750, biome: Biome.ThermalVein },
    // "Hidden tunnels connecting corners" — clear of the spawns. They sat *on*
    // the corner spawns in the first draft, which would have started two
    // players in the deepest, loudest biome on the map.
    //
    // Four of them, one per corner. Two corners had none, so two seats reached
    // their nearest pocket at 4,384 m against 1,732 m, and approached the
    // centre crystal through quieter water for it — PF 0.9139 against 1.1222,
    // because the pocket a seat crosses is PF 1.6 (#626).
    //
    // 4,384 m is the *central* pocket, which is what the seats without a
    // corner one fell back to. Their nearest corner pocket was 5,124 m, and
    // that is the number to quote only if the metric is narrowed to corners —
    // the test measures every AbyssalTrench region, so it reads 4,384.
    //
    // This equalises upward rather than down: every seat had a pocket at
    // 1,732 m, and every crystal approach reads the same PF. Removing the two
    // would have equalised just as well and quieter, and would have deleted
    // the doc's own Layout Logic bullet to do it — it says corners, plural,
    // and now every corner has one.
    //
    // Pits since #1137, each `POCKET` reflected, so the middle of a pocket's
    // box is 1,556 m from its seat and the nearest of its cells 1,215 m.
    ...POCKETS.map((points) => ({
      shape: 'polygon' as const,
      points,
      biome: Biome.AbyssalTrench,
      floorM: 2600,
    })),
    // "Hidden tunnels connecting corners" — the Layout Logic bullet this map
    // has carried since it was written, with no way to express it until ground
    // could have a roof.
    //
    // One under each side wall, joining that side's two corners beneath the
    // coral ring. The ceiling sits below the 600 m that structures and nodule
    // fields are seated at, so nothing can be built in one: it is a road, not
    // ground. Entering costs a dive, and a maze whose walls you can pass under
    // is a different maze to a scout who thought of it.
    //
    // Centred on the map's east-west axis. They ran y 2,000 to 6,250, whose
    // midpoint is 4,125 — half a cell north of centre, worth twelve cells of
    // north-south disagreement on its own, which is the cheapest asymmetry
    // this map had and the least visible (#626).
    {
      x: 250,
      y: 2000,
      widthM: 750,
      heightM: 4000,
      biome: Biome.CoralRuins,
      ceilingM: 700,
      floorM: 1800,
      note: 'West wall tunnel — joins the two western corners, out of sight',
    },
    {
      x: W - 1000,
      y: 2000,
      widthM: 750,
      heightM: 4000,
      biome: Biome.CoralRuins,
      ceilingM: 700,
      floorM: 1800,
      note: 'East wall tunnel',
    },
  ],
  // Four corners, listed NW-SE first because the doc's "hidden tunnels
  // connecting corners" makes the diagonal the interesting axis. The header
  // says four seats, so all four corners have to be the same chair — which
  // they were not until #626: the content sat on one diagonal and the other
  // two seats played a measurably different map.
  spawns: [
    { x: 900, y: 900, foundryOffsetX: 500, foundryOffsetY: 200 },
    { x: W - 900, y: H - 900, foundryOffsetX: -500, foundryOffsetY: -200 },
    { x: W - 900, y: 900, foundryOffsetX: -500, foundryOffsetY: 200 },
    { x: 900, y: H - 900, foundryOffsetX: 500, foundryOffsetY: -200 },
  ],
  resources: [
    { x: 1700, y: 1100, kind: ResourceKind.Nodule, note: 'Home field, NW' },
    { x: W - 1700, y: H - 1100, kind: ResourceKind.Nodule },
    { x: W - 1700, y: 1100, kind: ResourceKind.Nodule },
    { x: 1700, y: H - 1100, kind: ResourceKind.Nodule },
    // Expansions on the open ring: safe to reach, impossible to defend
    // quietly, because holding them means standing outside the kelp.
    //
    // On cell centres, and that is the whole of why these are 1,625 and 6,375
    // rather than the 1,500 and 6,500 they read as. A cell takes the biome of
    // the region containing its *centre*, the two thermal veins are y 750-1500
    // and y 6500-7250, and those two numbers sit on opposite sides of that
    // rule: y 1,500 falls in the row centred 1,625, outside the north vein,
    // while y 6,500 falls in the row centred 6,625, inside the south one. So
    // the north expansion was worked at PF 1.000 and the south at PF 0.450 —
    // the loudest and the quietest ground on the map, on the one pair of
    // fields every seat shares. Mirror-symmetric coordinates, asymmetric
    // ground, and nothing that reads the literal could see it.
    //
    // Both are open water now, because that is what the line above asks for:
    // an expansion here is meant to be impossible to defend quietly, and a
    // vent would have masked one of them.
    { x: W / 2, y: 1625, kind: ResourceKind.Nodule, amount: 5500 },
    { x: W / 2, y: H - 1625, kind: ResourceKind.Nodule, amount: 5500 },
    {
      x: W / 2,
      y: H / 2,
      kind: ResourceKind.ResonanceCrystal,
      note: 'In the central pocket — deep, loud, and behind the maze',
    },
  ],
  hazards: [
    // The maze core beds, and the only legal bio-reactor ground on this map:
    // it authors no `blooms`, so these two fields are all there is, and
    // `reactorSite` (ai/commander.ts) picks between them by distance from
    // home.
    //
    // On the map's vertical centre line rather than on the NW-SE diagonal,
    // where they sat. From the diagonal they were 3,536 m from two seats and
    // 4,465 m from the other two, so two navies funded a reactor 929 m nearer
    // than their opposite numbers, on a map that declares four seats (#626).
    // At x = 4,000, ±850 m about the centre, every seat's nearer bed is
    // 3,830 m away and its farther one 5,021 m — the same pair of distances
    // from all four chairs, rather than the same distance to each bed, which
    // no two-bed placement can give four corners. That is the arithmetic the
    // seats needed, without adding a third and a fourth and doubling what the
    // map grows.
    //
    // ±850 and not ±600, because how far apart they sit is a mechanic and not
    // a layout detail: `bedsInReach` gives a reactor every bed within
    // FLORA.REACTOR_RADIUS_M of its rim, so the water that reaches both is
    // worth more than the water that reaches one. On the diagonal they were
    // 1,697 m apart; ±850 keeps them 1,700 m apart, which is the same map to
    // within the 3 m a round number costs. ±600 would have closed them to
    // 1,200 m and widened the reaches-both lens by a third without saying so.
    { x: W / 2, y: 3150, radiusM: 1200, kind: 'kelp-entanglement', note: 'Maze core' },
    { x: W / 2, y: 4850, radiusM: 1200, kind: 'kelp-entanglement' },
    // "Cold shock currents in deeper pockets" (doc). Two currents, one per
    // diagonal, each sampled twice, plus the one over the crystal.
    //
    // They were three, all on the NW-SE diagonal, and the argument for that
    // was a real one: one current sampled three times, running 45 degrees, so
    // the north-west player attacked with the water and withdrew against it
    // while the south-east player did the reverse. The depth bargain — fast
    // in, slow out — rotated into the horizontal plane, handed to one side and
    // reversed for the other.
    //
    // That argument is kept. What broke it is the seat count: it describes two
    // players, and this map declares four. The other two seats had no outer
    // site within 4,384 m of a spawn, against 1,697 m for the pair on the
    // diagonal (#626). A trade handed to one side and reversed for the other
    // is a bargain; the same trade handed to two seats and withheld from two
    // is a handicap.
    //
    // So the NE-SW pair runs 135 degrees, which is the identical rotation seen
    // from the other diagonal: `flowX = cos`, `flowY = sin`, so 45 pushes
    // toward +x +y and 135 toward -x +y, which is NE to SW.
    //
    // The bargain survives intact rather than being flattened. Two seats still
    // find the water running out of their corner and two find it running in —
    // seats NW and NE get the outward half, SE and SW the inward — and every
    // seat now has an outer site at 1,697 m to have it at. That is the same
    // trade the original argument describes, dealt to four chairs instead of
    // two. The file's own stated alternative, "turn the outer two to flow
    // inward and leave the centre alone", moves the flow and not the distance,
    // so it could never have answered this.
    {
      x: W / 2,
      y: H / 2,
      radiusM: 600,
      kind: 'cold-shock',
      flowDeg: 45,
      note: 'Cold shock currents in the deeper pockets (doc) — over the crystal',
    },
    { x: 2100, y: 2100, radiusM: 400, kind: 'cold-shock', flowDeg: 45 },
    { x: W - 2100, y: H - 2100, radiusM: 400, kind: 'cold-shock', flowDeg: 45 },
    { x: W - 2100, y: 2100, radiusM: 400, kind: 'cold-shock', flowDeg: 135 },
    { x: 2100, y: H - 2100, radiusM: 400, kind: 'cold-shock', flowDeg: 135 },
  ],
};
