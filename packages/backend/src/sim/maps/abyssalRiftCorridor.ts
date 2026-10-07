/**
 * Abyssal Rift Corridor — docs/maps.md, Map Type 3.
 *
 * "A long trench map with brutal choke points and vertical depth gameplay."
 *
 * The opposite argument to the Ventfront Divide, and the reason both exist:
 * this map has **no secrets**. The trench down the centre is PF 1.6, so sound
 * travels its whole length, and anything moving through the middle is heard
 * from end to end. Cover exists only on the side plateaus, which is what makes
 * the corridor a commitment rather than a route.
 *
 * A 1v1 map, so it has two spawns — the reason spawn counts are map data.
 */

import { ABYSSAL_RIFT_CORRIDOR_HEADER, Biome, ResourceKind } from '@echoes/shared';
import type { MapDefinition } from './types.ts';

// Long and narrow, because the doc's layout is "central trench corridor
// (long, narrow, deep)" and a square map cannot express that.
const W = ABYSSAL_RIFT_CORRIDOR_HEADER.widthM;
const H = ABYSSAL_RIFT_CORRIDOR_HEADER.heightM;

type Point = readonly [number, number];

/**
 * An outline turned half a turn about the map's centre: the symmetry that
 * makes this a fair 1v1 (`maps.test.ts`), so each outline below is written
 * once, for the western seat's side, and its partner is generated rather than
 * written down — the argument the Kelp Labyrinth makes for its quadrant.
 */
const turn = (path: readonly Point[]): Point[] => path.map(([x, y]) => [W - x, H - y]);
/** An outline reflected across the north-south centre line, for the corners. */
const mirrorX = (path: readonly Point[]): Point[] => path.map(([x, y]) => [W - x, y]);

/**
 * The rift's north wall, west to east (#1138). Its south wall is this one
 * turned, so the rift is symmetric by construction. In rectangles the rift
 * was a bar 2,000 m across from apron to apron, and from the survey dolly it
 * read as one; drawn as a canyon:
 *
 * - **It leaves each apron narrow**, 1,250 m across at the plateau's foot.
 * - **Each reach leans toward its vent field.** The west reach keeps the old
 *   north wall and gives up a row or two of its south one, so the north vents
 *   stand on its lip; the east reach, this one turned, leans south.
 * - **It closes to a throat at each choke**, 1,250 m between the walls where
 *   the coral shelf crosses it.
 * - **It opens into a basin about the crystal**, 3,000 m across at the
 *   middle, inside the pressure zone's radius. The loudest place on the map is
 *   now also the widest, so it reads as a place rather than a stretch of bar.
 *
 * What it could not move is the line between the two seats, which runs down
 * the trench by design: every cell on y 3,000 from one spawn to the other is
 * the ground it always was, and so is the row north of it, its half-turn
 * image. `maps.test.ts` pins what that line crosses.
 */
const RIFT_NORTH: readonly Point[] = [
  [2000, 2250],
  [2250, 2250],
  [2250, 2000],
  [3000, 2000],
  [3000, 2250],
  [4000, 2250],
  [4000, 2000],
  [4500, 2000],
  [4500, 1750],
  [4750, 1750],
  [4750, 1500],
  [5250, 1500],
  [5250, 1750],
  [5500, 1750],
  [5500, 2000],
  [6000, 2000],
  [6000, 2250],
  [6250, 2250],
  [6250, 2500],
  [7000, 2500],
  [7000, 2250],
  [7500, 2250],
  [7500, 2500],
  [8000, 2500],
];
const RIFT: readonly Point[] = [...RIFT_NORTH, ...turn(RIFT_NORTH)];

/**
 * The west apron, its shoulders rounded off (#1138). Its face is the rift's
 * mouth, and the cells either side of the mouth are open shelf, so the
 * plateau stands clear of the vents and the reef rather than running into
 * them as one mass of coral. It still holds the spawn, the Foundry and the
 * home field on 700 m ground.
 */
const APRON: readonly Point[] = [
  [0, 1750],
  [1250, 1750],
  [1250, 2000],
  [1750, 2000],
  [1750, 2250],
  [2000, 2250],
  [2000, 3750],
  [1750, 3750],
  [1750, 4000],
  [1250, 4000],
  [1250, 4250],
  [0, 4250],
];

/**
 * The north reef, a bank lying along the rift's rim rather than a box beside
 * it (#1138): narrow at its crown, broadest at its foot, and reaching down to
 * the lip where the east reach leans away from it, so the reach's north wall
 * is coral. It stops short of the east apron, so the plateau stays a place
 * of its own.
 */
const REEF: readonly Point[] = [
  [6500, 500],
  [7750, 500],
  [7750, 750],
  [8250, 750],
  [8250, 1750],
  [8000, 1750],
  [8000, 2000],
  [7500, 2000],
  [7500, 2250],
  [7000, 2250],
  [7000, 2500],
  [6250, 2500],
  [6250, 2250],
  [6000, 2250],
  [6000, 2000],
  [5500, 2000],
  [5500, 1500],
  [5750, 1500],
  [5750, 1000],
  [6000, 1000],
  [6000, 750],
  [6500, 750],
];

/**
 * The north-west corner field, spreading from the corner as a quarter round
 * rather than filling a square (#1138). Twenty-four cells where the square
 * held twenty-five, and the storm it carries is centred where it was.
 */
const CORNER: readonly Point[] = [
  [0, 0],
  [1500, 0],
  [1500, 250],
  [1250, 250],
  [1250, 750],
  [1000, 750],
  [1000, 1000],
  [750, 1000],
  [750, 1250],
  [250, 1250],
  [250, 1500],
  [0, 1500],
];

/**
 * Every number a region below states is a whole 250 m cell (issue #157,
 * docs/maps.md "How a map is written"). The rectangles were re-stated that
 * way when the centre rule landed: the cells this map painted were the cells
 * it had always played on, apart from the south vent band and the north coral
 * one, which had each grown a column their mirror image had not — a rectangle
 * ending exactly on a cell boundary used to claim the cell on the far side of
 * it.
 *
 * The rift, the aprons, the vents, the reefs and the corners moved cells when
 * they became shapes (#1138); the chokes kept every cell.
 */
export const ABYSSAL_RIFT_CORRIDOR: MapDefinition = {
  ...ABYSSAL_RIFT_CORRIDOR_HEADER,
  doc: 'docs/maps.md — Map Type 3',
  cellM: 250,
  // The shelf either side of the rift. "Vertical depth layers with fog
  // separation" is this map's third Layout Logic bullet, and it is the floors
  // that deliver it: the corridor is not just narrow, it is a step down.
  floorM: 1400,
  regions: [
    // "Center: Abyssal Trenches" — the corridor, running the long axis, as
    // `RIFT_NORTH` draws it.
    //
    // *Central*, not edge to edge: the first draft ran it the full width, which
    // put both starting bases inside the loudest biome in the game and made
    // the opening a permanent broadcast. The ends are base aprons instead, and
    // committing to the rift is now a thing a player does rather than a thing
    // they wake up in.
    {
      shape: 'polygon',
      points: RIFT,
      biome: Biome.AbyssalTrench,
      // "Long, narrow, deep", and deep enough for the crystal field seated at
      // 2,400 m in the middle of it. Dropping into the rift is a descent, which
      // is the loud direction — the map charges you to use its fast road twice.
      floorM: 2900,
      note: 'The rift. PF 1.6 for its whole length — nothing crosses it unheard.',
    },
    // Base aprons. Coral: hard acoustic shadows, so a base is defensible
    // without being silent.
    {
      shape: 'polygon',
      points: APRON,
      biome: Biome.CoralRuins,
      // "Side plateaus for expansions": 700 m clears the 600 m structures and
      // nodule fields sit at, and leaves no room to lurk deep over a base.
      floorM: 700,
      note: 'West apron',
    },
    {
      shape: 'polygon',
      points: turn(APRON),
      biome: Biome.CoralRuins,
      floorM: 700,
      note: 'East apron',
    },
    // "Side: Thermal Veins + Coral Ruins" — the only cover on the map. Each
    // vent field is round, the way a plume field spreads, and stands on the
    // lip of the reach that leans toward it.
    {
      shape: 'ellipse',
      x: 1500,
      y: 250,
      widthM: 2750,
      heightM: 1750,
      biome: Biome.ThermalVein,
      note: 'North vents',
    },
    {
      shape: 'ellipse',
      x: W - 4250,
      y: H - 2000,
      widthM: 2750,
      heightM: 1750,
      biome: Biome.ThermalVein,
      note: 'South vents',
    },
    { shape: 'polygon', points: REEF, biome: Biome.CoralRuins, note: 'North reef' },
    { shape: 'polygon', points: turn(REEF), biome: Biome.CoralRuins },
    // "Corners: Resonance Fields" — bearings lie there, which is the reward
    // for holding a corner and the risk of walking into one.
    { shape: 'polygon', points: CORNER, biome: Biome.ResonanceField },
    { shape: 'polygon', points: turn(CORNER), biome: Biome.ResonanceField },
    { shape: 'polygon', points: mirrorX(CORNER), biome: Biome.ResonanceField },
    { shape: 'polygon', points: turn(mirrorX(CORNER)), biome: Biome.ResonanceField },
    // "Brutal choke points": two coral shelves pinching the corridor.
    //
    // Still rectangles, and the same cells (#1138): a choke is a shelf laid
    // across the canyon, and these are the points the doc names. The rift now
    // closes to a throat at each, so the shelf stands proud of the canyon's
    // walls and runs from a vent field's edge to a reef.
    {
      x: 3250,
      y: 2000,
      widthM: 500,
      heightM: 2000,
      biome: Biome.CoralRuins,
      // Shelf ground, like the Ventfront dividers: a choke you rise over
      // rather than one you route around.
      floorM: 380,
      note: 'West choke',
    },
    { x: W - 3750, y: 2000, widthM: 500, heightM: 2000, biome: Biome.CoralRuins, floorM: 380 },
  ],
  spawns: [
    { x: 900, y: H / 2, foundryOffsetX: 0, foundryOffsetY: -450 },
    { x: W - 900, y: H / 2, foundryOffsetX: 0, foundryOffsetY: -450 },
  ],
  resources: [
    { x: 1600, y: H / 2 - 900, kind: ResourceKind.Nodule, note: 'West home field' },
    { x: W - 1600, y: H / 2 - 900, kind: ResourceKind.Nodule },
    // Expansions on the plateaus, away from the rift: taking one means leaving
    // the corridor, which is exactly the decision the map wants to force.
    { x: 2800, y: 1200, kind: ResourceKind.Nodule, amount: 5000 },
    { x: W - 2800, y: H - 1200, kind: ResourceKind.Nodule, amount: 5000 },
    {
      x: W / 2,
      y: H / 2,
      kind: ResourceKind.ResonanceCrystal,
      note: 'The middle of the rift — the loudest place on the map',
    },
  ],
  hazards: [
    {
      x: W / 2,
      y: H / 2,
      radiusM: 1400,
      kind: 'pressure-zone',
      note: 'Constant DoT (doc); the rift floor is below most hulls PR',
    },
    { x: 600, y: 600, radiusM: 900, kind: 'resonance-storm', note: 'Corner field' },
    { x: W - 600, y: 600, radiusM: 900, kind: 'resonance-storm' },
    { x: 600, y: H - 600, radiusM: 900, kind: 'resonance-storm' },
    { x: W - 600, y: H - 600, radiusM: 900, kind: 'resonance-storm' },
  ],
};
