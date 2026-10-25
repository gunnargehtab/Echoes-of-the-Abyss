/**
 * The Rift's public geography — docs/world-map.md §7.2–§7.3 (#1457).
 *
 * The whole Pelagion Rift at overview detail, its named places, and the
 * mission-detail surround each placed map is drawn inside. Public ground, the
 * same for every player and read by no simulation (§7.1): the atlas carries
 * no unit, structure, creature or state, and live ground — the arch after it
 * falls — reaches a client only through its own session's map data, pasted
 * over the baseline `detailGround` returns and never written back into it.
 *
 * Authored like every map (docs/maps.md, "How a map is written"): shapes
 * painted in order, a cell the region's whose shape holds its centre, every
 * number a shape states a whole cell. Nothing here is generated from Plate
 * VII or from noise. The overview is drawn in 1,000 m cells and the detail in
 * the mission's 250 m.
 */

import { WORLD } from './constants.js';
import {
  PLACED_GROUND,
  paintGround,
  paintRegions,
  type GroundCells,
  type GroundRegion,
  type MapGround,
} from './ground.js';
import { Biome } from './types.js';
import { RIFT_ATLAS, detailRect, type PlanRect, type WorldRegion } from './world.js';

/** §3's six regions, north to south. */
export type RiftRegionId =
  'plateaus' | 'west-wall' | 'drowned-city' | 'resonance-fields' | 'trench-country' | 'mouth';

/**
 * §7.2's coarse allocations: the rectangle each region's ground is authored
 * inside. Bounds on authoring, overlapping where §3's regions meet, never
 * shapes.
 */
export const RIFT_REGIONS: Readonly<Record<RiftRegionId, PlanRect>> = {
  plateaus: { x: 6_000, y: 0, widthM: 28_000, heightM: 22_000 },
  'west-wall': { x: 0, y: 12_000, widthM: 10_000, heightM: 38_000 },
  'drowned-city': { x: 12_000, y: 32_000, widthM: 16_000, heightM: 18_000 },
  'resonance-fields': { x: 26_000, y: 30_000, widthM: 14_000, heightM: 32_000 },
  // North to 48 km so the Western Margin, the top step's west end, fits (#1565).
  'trench-country': { x: 0, y: 48_000, widthM: 40_000, heightM: 31_000 },
  mouth: { x: 0, y: 79_000, widthM: 40_000, heightM: 11_000 },
};

/**
 * A named place, placed: one row of §7.2's anchor table. `depthM` is the
 * place's depth as §3 gives it — an address, never a floor a mission plays
 * on, and never a reason for the ruleset's 3,000 m limit to move (§7.2).
 */
export interface RiftPlace {
  id: string;
  name: string;
  region: RiftRegionId;
  /** Atlas metres. */
  x: number;
  y: number;
  /** Omitted where §3 gives the place no depth: a mission map's floor is not one. */
  depthM?: number;
  /** The deepest of a place §3 gives as a range, Holding One's berths or the Rest's trench. */
  toDepthM?: number;
}

/**
 * Every named place of §3 that this atlas places, north to south, in §7.2's
 * anchor table's order. Sorrowgate's court is the table's derived anchor; the
 * rest are placed inside their region's rectangle at the distances §1–§4
 * give, and the table changes before any of them moves. Two rows anchor a
 * map §3 names no place for, the Western Margin and the Third's outer
 * formations, at the map's centre (§7.9, #1565).
 */
export const RIFT_PLACES: readonly RiftPlace[] = [
  // The Plateaus.
  // Half a kilometre east and a quarter south of #1457's placing, so the map fits (#1566).
  { id: 'marr', name: 'Marr Plateau', region: 'plateaus', x: 8_000, y: 3_750, depthM: 320 },
  { id: 'teel', name: 'Teel Plateau', region: 'plateaus', x: 12_000, y: 4_000, depthM: 380 },
  { id: 'anholt', name: 'Anholt Plateau', region: 'plateaus', x: 20_000, y: 5_500, depthM: 210 },
  {
    id: 'kell-shoulder',
    name: 'The Kell Shoulder',
    region: 'plateaus',
    x: 9_000,
    y: 7_500,
    depthM: 340,
  },
  { id: 'the-enclosure', name: 'The Enclosure', region: 'plateaus', x: 16_000, y: 9_500 },
  { id: 'kell-plateau', name: 'Kell Plateau', region: 'plateaus', x: 11_000, y: 10_500 },
  {
    id: 'the-furrow',
    name: 'The Furrow',
    region: 'plateaus',
    x: 24_000,
    y: 19_000,
    depthM: 900,
    toDepthM: 2_600,
  },
  // The West Wall.
  { id: 'sector-kell', name: 'Sector Kell', region: 'west-wall', x: 8_500, y: 12_500, depthM: 350 },
  {
    id: 'holding-one',
    name: 'Holding One',
    region: 'west-wall',
    x: 6_000,
    y: 16_000,
    depthM: 350,
    toDepthM: 1_300,
  },
  {
    id: 'sector-vayle',
    name: 'Sector Vayle',
    region: 'west-wall',
    x: 5_000,
    y: 17_000,
    depthM: 1_050,
  },
  { id: 'the-underway', name: 'The Underway', region: 'west-wall', x: 5_500, y: 18_500 },
  {
    id: 'the-underworks',
    name: 'The Underworks',
    region: 'west-wall',
    x: 6_000,
    y: 19_500,
    depthM: 1_900,
    toDepthM: 2_100,
  },
  { id: 'fivewell', name: 'Fivewell', region: 'west-wall', x: 5_500, y: 22_000 },
  // Derived: the Upper Workings' origin plus its spawn at Face Two's muster,
  // so a travel to *Shift Change* ends there (§7.6, #1626).
  { id: 'face-two', name: "Face Two's muster", region: 'west-wall', x: 4_375, y: 24_000 },
  {
    id: 'ninefold-vein',
    name: 'Ninefold Vein',
    region: 'west-wall',
    x: 5_000,
    y: 26_500,
    depthM: 900,
    toDepthM: 1_400,
  },
  // Derived: Face Six's origin plus its spawn at the Rail Head, so a travel to
  // *Asset Recovery* ends there (§7.6, #1626).
  {
    id: 'face-six-rail-head',
    name: "Face Six's rail head",
    region: 'west-wall',
    x: 5_000,
    y: 25_250,
  },
  { id: 'halvard', name: 'Halvard', region: 'west-wall', x: 7_000, y: 36_000, depthM: 1_600 },
  // The Drowned City. The court is §7.2's derived anchor, the spawn at the arch.
  {
    id: 'upper-concourse',
    name: 'The Upper Concourse',
    region: 'drowned-city',
    x: 20_000,
    y: 40_875,
    depthM: 340,
  },
  {
    id: 'sorrowgate',
    name: 'Sorrowgate',
    region: 'drowned-city',
    x: 20_050,
    y: 42_650,
    depthM: 1_500,
  },
  {
    id: 'the-commit',
    name: 'The Commit',
    region: 'drowned-city',
    x: 20_000,
    y: 44_000,
    depthM: 2_400,
  },
  // The Resonance Fields.
  {
    id: 'ninth-chapter-house',
    name: 'The Ninth Chapter-House',
    region: 'resonance-fields',
    x: 31_000,
    y: 50_000,
    depthM: 1_900,
  },
  {
    id: 'third-chapter-house',
    name: 'The Third Chapter-House',
    region: 'resonance-fields',
    x: 36_500,
    y: 54_500,
    depthM: 1_450,
  },
  {
    id: 'first-chapter-house',
    name: 'The First Chapter-House',
    region: 'resonance-fields',
    x: 27_500,
    y: 57_500,
    depthM: 2_900,
  },
  {
    id: 'the-fifth',
    name: 'The Fifth',
    region: 'resonance-fields',
    x: 32_500,
    y: 57_500,
    depthM: 1_450,
    toDepthM: 1_780,
  },
  {
    id: 'outer-formations',
    name: "The Third's outer formations",
    region: 'resonance-fields',
    x: 34_750,
    y: 57_500,
  },
  {
    id: 'the-rest',
    name: 'The Rest',
    region: 'resonance-fields',
    x: 30_000,
    y: 59_500,
    depthM: 1_600,
    toDepthM: 2_400,
  },
  {
    id: 'the-seam',
    name: 'The Seam',
    region: 'resonance-fields',
    x: 34_000,
    y: 59_500,
    depthM: 1_750,
    toDepthM: 1_780,
  },
  // The Trench Country.
  {
    id: 'western-margin',
    name: 'The Western Margin',
    region: 'trench-country',
    x: 6_000,
    y: 49_500,
  },
  // Derived, as the court and the muster are: the Western Margin's origin plus
  // its spawn on the shelf lane, so a travel to *Exposure* ends there (§7.6, #1612).
  { id: 'the-shelf-lane', name: 'The shelf lane', region: 'trench-country', x: 6_000, y: 48_375 },
  {
    id: 'fourth-trench',
    name: 'The Fourth Trench',
    region: 'trench-country',
    x: 11_500,
    y: 56_000,
    depthM: 1_700,
  },
  {
    id: 'first-trench',
    name: 'The First Trench',
    region: 'trench-country',
    x: 6_000,
    y: 53_000,
    depthM: 1_800,
    toDepthM: 2_400,
  },
  // Derived: the Shallow Band's origin plus its spawn at the row, so a travel
  // to *Trench Awakening* ends there (§7.6, #1615).
  { id: 'the-row', name: 'The rendering row', region: 'trench-country', x: 6_000, y: 52_000 },
  {
    id: 'deep-yard',
    name: 'The Deep Yard',
    region: 'trench-country',
    x: 11_500,
    y: 58_500,
    depthM: 1_650,
  },
  {
    id: 'fourths-foot',
    name: "The Fourth's foot",
    region: 'trench-country',
    x: 11_500,
    y: 62_000,
    depthM: 2_000,
    toDepthM: 2_900,
  },
  {
    id: 'banding-ground',
    name: 'The banding ground',
    region: 'trench-country',
    x: 23_000,
    y: 64_000,
    depthM: 1_500,
    toDepthM: 2_400,
  },
  // Derived, as the court is: the Banding Ground's origin plus its spawn, so
  // a travel to *Intake* ends on the intake's spawn (§7.6, #1598).
  { id: 'the-muster', name: 'The muster', region: 'trench-country', x: 23_000, y: 62_750 },
  {
    id: 'sufficiency',
    name: 'Sufficiency',
    region: 'trench-country',
    x: 25_000,
    y: 69_000,
    depthM: 2_750,
    toDepthM: 3_400,
  },
  {
    id: 'attending-galleries',
    name: 'The attending galleries',
    region: 'trench-country',
    x: 24_500,
    y: 71_500,
    depthM: 3_000,
  },
  {
    id: 'the-sill',
    name: "The Ninth's sill",
    region: 'trench-country',
    x: 24_000,
    y: 74_500,
    depthM: 4_100,
  },
  // The Mouth.
  { id: 'the-staging', name: 'The Staging', region: 'mouth', x: 20_000, y: 79_500, depthM: 1_500 },
  {
    id: 'the-slopes',
    name: 'The Slopes',
    region: 'mouth',
    x: 20_000,
    y: 80_500,
    depthM: 1_500,
    toDepthM: 2_200,
  },
  {
    id: 'the-terraces',
    name: 'The Terraces',
    region: 'mouth',
    x: 20_000,
    y: 81_500,
    depthM: 2_600,
  },
  { id: 'the-lip', name: 'The Lip', region: 'mouth', x: 23_500, y: 82_500, depthM: 3_100 },
  { id: 'the-mouth', name: 'The Mouth', region: 'mouth', x: 20_500, y: 86_500, depthM: 4_410 },
];

/** Kilometres to metres: the overview is authored on its 1,000 m grid, every corner a whole cell. */
const KM = 1_000;

function box(
  xKm: number,
  yKm: number,
  wKm: number,
  hKm: number,
  biome: Biome,
  floorM: number,
  note: string
): GroundRegion {
  return { x: xKm * KM, y: yKm * KM, widthM: wKm * KM, heightM: hKm * KM, biome, floorM, note };
}

function oval(
  xKm: number,
  yKm: number,
  wKm: number,
  hKm: number,
  biome: Biome,
  floorM: number,
  note: string
): GroundRegion {
  return {
    shape: 'ellipse',
    x: xKm * KM,
    y: yKm * KM,
    widthM: wKm * KM,
    heightM: hKm * KM,
    biome,
    floorM,
    note,
  };
}

function outline(
  cornersKm: readonly (readonly [number, number])[],
  biome: Biome,
  floorM: number,
  note: string
): GroundRegion {
  return {
    shape: 'polygon',
    points: cornersKm.map(([x, y]) => [x * KM, y * KM] as const),
    biome,
    floorM,
    note,
  };
}

const { OpenWater, ThermalVein, KelpForest, AbyssalTrench, ResonanceField, CoralRuins } = Biome;

/**
 * The whole Rift at overview detail (§7.3): 40 × 90 cells of 1,000 m, north
 * shallow and south deep (§1). Painted in order, north to south, the ground
 * first and what was cut into it after, as every map reads.
 */
export const RIFT_GROUND: MapGround = {
  widthM: RIFT_ATLAS.widthM,
  heightM: RIFT_ATLAS.heightM,
  cellM: WORLD.ATLAS_CELL_M,
  floorM: 1_800,
  regions: [
    box(0, 0, 40, 90, OpenWater, 1_800, 'The mid-Rift floor, below the layer. Painted first'),

    // The north shoulder: the Rift rising to meet the Shelf (§1). Bare rock at
    // the Shelf break, then the mid-water lanes stepping down to the floor.
    box(0, 0, 40, 22, OpenWater, 420, 'The north shoulder — bare rock at the Shelf break'),
    box(0, 22, 40, 3, OpenWater, 700, 'The mid-water lanes, falling south off the shoulder'),
    box(0, 25, 40, 3, OpenWater, 1_100, 'The mid-water lanes, above the layer'),
    box(0, 28, 40, 3, OpenWater, 1_500, 'The shoulder’s foot, below the layer'),
    box(0, 0, 6, 12, OpenWater, 240, 'The north-west rim, under the Lid’s first clear water'),
    box(34, 0, 6, 22, OpenWater, 300, 'The north-east rim'),

    // The Plateaus (§3): kelp terraces in the Shelf band, stepped down the
    // northern rise. Each named terrace at its people's depth of birth.
    outline(
      [
        [14, 2],
        [26, 2],
        [28, 5],
        [26, 9],
        [15, 9],
        [13, 5],
      ],
      KelpForest,
      210,
      'Anholt’s terraces — the highest gardens, b. 210 m'
    ),
    box(26, 2, 8, 9, KelpForest, 300, 'The eastern terraces'),
    outline(
      [
        [11, 11],
        [33, 11],
        [33, 20],
        [12, 20],
      ],
      KelpForest,
      380,
      'The lower terraces, at the Shelf break'
    ),
    // Anholt's terraces step down south to the Furrow's Foot, which lies under
    // them (§3; docs/mission-deep-furrow.md §1).
    box(19, 9, 9, 4, KelpForest, 300, 'Anholt’s middle terraces'),
    box(20, 13, 8, 4, KelpForest, 380, 'Anholt’s lower terraces — down to the Furrow’s Foot'),
    oval(6, 1, 3, 5, KelpForest, 320, 'Marr Plateau — Tidespeaker Marr’s terrace, b. 320 m'),
    oval(10, 2, 4, 4, KelpForest, 380, 'Teel Plateau — Warden Teel’s, east of Marr, b. 380 m'),
    outline(
      [
        [7, 6],
        [11, 6],
        [11, 9],
        [7, 9],
      ],
      OpenWater,
      340,
      'The Kell Shoulder — a four-kilometre crossing between Marr and Kell, two kilometres of it bare rock, PF 1.00'
    ),
    oval(
      9,
      9,
      4,
      3,
      KelpForest,
      300,
      'Kell Plateau — replanted, never renamed; Sector Kell’s fence'
    ),
    oval(14, 8, 4, 3, KelpForest, 360, 'The Enclosure — the densest kelp stand in the Rift'),
    // The Furrow: the one Abyssal water under the plateaus, the scar's
    // northern branch. Foot, cleft, the seeded garden and the sill, north to
    // south, as its map runs (docs/mission-deep-furrow.md §11).
    box(23, 17, 2, 1, OpenWater, 900, 'The Furrow’s Foot — where the plateau’s lane comes down'),
    box(23, 18, 2, 1, AbyssalTrench, 1_800, 'The Furrow’s cleft, under the layer'),
    box(23, 19, 2, 1, KelpForest, 2_200, 'The seeded furrow — a garden on trench floor'),
    box(23, 20, 2, 2, AbyssalTrench, 2_600, 'The Furrow’s sill, where the cleft opens to the deep'),

    // The West Wall (§3): the Rift's western face, stepping down east to its
    // foot, veined with vent fields and strung with the grid.
    box(0, 20, 2, 30, OpenWater, 600, 'The wall’s crest'),
    box(2, 20, 2, 30, OpenWater, 900, 'The wall’s upper face'),
    box(4, 20, 2, 30, OpenWater, 1_200, 'The wall’s face'),
    box(6, 20, 2, 30, OpenWater, 1_500, 'The wall’s lower face'),
    box(8, 20, 2, 30, OpenWater, 1_700, 'The wall’s foot'),
    // Holding One, built down the face at the wall's north end where it
    // shares a fence with the plateaus (§4): berths from 350 m to 1,300 m.
    box(2, 12, 8, 2, ThermalVein, 400, 'Holding One’s top berths — Sector Kell, 350 m'),
    box(2, 14, 8, 2, ThermalVein, 700, 'Holding One — the middle berths'),
    box(2, 16, 8, 2, ThermalVein, 1_050, 'Holding One — Sector Vayle’s grade, 1,050 m'),
    box(2, 18, 8, 2, ThermalVein, 1_300, 'Holding One — Board country, the Underway at its foot'),
    box(
      4,
      21,
      3,
      2,
      ThermalVein,
      800,
      'Fivewell — shallower and smaller, the grid’s second pillar'
    ),
    box(4, 23, 2, 3, ThermalVein, 1_000, 'Ninefold Vein — the founding field’s upper faces'),
    box(4, 26, 2, 4, ThermalVein, 1_300, 'Ninefold Vein — the deep faces, 1,400 m at the last'),
    box(2, 32, 3, 10, ThermalVein, 1_000, 'Vent fields along the face'),

    // The Resonance Fields (§3): crystal country on the east slope, below the
    // layer, 1,400 m at the rim down to 2,900 m at the southern edge.
    box(26, 30, 14, 29, ResonanceField, 1_700, 'The Resonance Fields — the east slope'),
    box(28, 30, 9, 10, ResonanceField, 1_500, 'The northern fields'),
    box(37, 30, 3, 29, ResonanceField, 1_400, 'The fields’ eastern rim'),
    box(26, 30, 2, 16, ResonanceField, 2_200, 'The fields’ western foot, falling to the scar'),
    oval(30, 40, 6, 7, ResonanceField, 1_600, 'The central formations'),
    box(30, 49, 2, 2, ResonanceField, 1_900, 'The Ninth’s formation — the Order’s centre'),
    box(34, 52, 5, 5, ResonanceField, 1_450, 'The Third’s country'),
    box(31, 55, 3, 4, ResonanceField, 1_450, 'The Fifth’s rim'),
    box(
      32,
      56,
      1,
      3,
      ResonanceField,
      1_700,
      'The Fifth — the covered road, a kilometre wall to wall'
    ),
    box(29, 57, 2, 2, ResonanceField, 1_600, 'The Rest’s Head — the shallowest ground'),
    box(28, 59, 12, 1, AbyssalTrench, 1_780, 'The Seam — the fields’ southern boundary, PF 1.60'),

    // The Drowned City (§3): mid-Rift, where the Shelf breaks toward deep
    // water. The city on its platform, its front door at the end of a tongue
    // of the shoulder, and the basin below.
    outline(
      [
        [15, 35],
        [23, 35],
        [24, 37],
        [24, 48],
        [22, 50],
        [15, 50],
        [13, 47],
        [13, 38],
      ],
      CoralRuins,
      1_600,
      'The drowned city — its districts, PF 0.80'
    ),
    box(
      19,
      20,
      2,
      20,
      OpenWater,
      400,
      'The Concourse ridge — the shoulder’s tongue the transit line came down'
    ),
    box(
      19,
      40,
      2,
      1,
      CoralRuins,
      340,
      'The Upper Concourse — the city’s front door, above the layer'
    ),
    outline(
      [
        [19, 44],
        [21, 44],
        [21, 45],
        [24, 46],
        [24, 48],
        [19, 48],
        [18, 46],
      ],
      AbyssalTrench,
      2_400,
      'The Commit — the basin below the city, opening on the scar'
    ),

    box(
      8,
      42,
      9,
      1,
      ThermalVein,
      1_600,
      'The vein the West Approach runs in, from the wall’s vents to the city'
    ),

    // The scar: the Rift's own deep, from the Furrow's sill south past the
    // city's east to the First Chapter-House, where crystal country breaks
    // toward the trenches (§1, §3).
    outline(
      [
        [23, 22],
        [25, 22],
        [26, 32],
        [24, 32],
      ],
      AbyssalTrench,
      2_600,
      'The scar, below the Furrow'
    ),
    box(24, 32, 2, 14, AbyssalTrench, 2_700, 'The scar, under the city’s east'),
    outline(
      [
        [24, 46],
        [26, 46],
        [28, 56],
        [26, 56],
      ],
      AbyssalTrench,
      2_800,
      'The scar, under the fields’ foot'
    ),
    box(
      26,
      56,
      3,
      3,
      ResonanceField,
      2_900,
      'The First’s formation — the oldest house, nearest the Mouth'
    ),

    // The Trench Country (§3): the floor stops sloping and starts stepping.
    // Nine trenches, each entered high and falling south, counted by their floors.
    box(0, 50, 16, 16, OpenWater, 1_450, 'The trench country’s top step, under the wall'),
    box(2, 51, 8, 1, OpenWater, 1_750, 'The First’s worked rim'),
    box(20, 60, 6, 19, OpenWater, 2_000, 'The Ninth’s western shoulder'),
    box(26, 60, 14, 19, OpenWater, 2_300, 'The trench country below the Seam'),
    box(0, 66, 16, 13, OpenWater, 2_000, 'The lower steps'),
    box(0, 79, 40, 11, OpenWater, 2_800, 'The far south'),
    outline(
      [
        [15, 50],
        [19, 50],
        [20, 60],
        [20, 79],
        [17, 79],
        [16, 60],
      ],
      OpenWater,
      1_500,
      'The road south — the high ground from the drowned city to the Rim'
    ),
    box(
      2,
      52,
      8,
      2,
      AbyssalTrench,
      1_800,
      'The First Trench — the shallow band, under its worked rim'
    ),
    outline(
      [
        [5, 54],
        [11, 54],
        [11, 56],
        [6, 56],
      ],
      AbyssalTrench,
      2_400,
      'The First Trench’s deep end, its sill toward the Second'
    ),
    outline(
      [
        [2, 57],
        [9, 57],
        [10, 61],
        [3, 61],
      ],
      AbyssalTrench,
      1_950,
      'The Second Trench'
    ),
    outline(
      [
        [4, 61],
        [10, 61],
        [9, 63],
        [5, 63],
      ],
      AbyssalTrench,
      2_500,
      'The Second Trench’s deep end'
    ),
    outline(
      [
        [3, 64],
        [10, 64],
        [11, 69],
        [4, 69],
      ],
      AbyssalTrench,
      2_450,
      'A trench of the nine'
    ),
    outline(
      [
        [5, 69],
        [11, 69],
        [10, 72],
        [6, 72],
      ],
      AbyssalTrench,
      2_700,
      'Its deep end'
    ),
    box(10, 53, 2, 1, ThermalVein, 1_100, 'The grid’s masked apron, at the Fourth’s north mouth'),
    box(11, 54, 1, 4, AbyssalTrench, 1_700, 'The Fourth Trench — the freight pipe, 500 m wide'),
    box(11, 58, 1, 1, AbyssalTrench, 1_650, 'The Deep Yard — the pipe’s southern mouth'),
    outline(
      [
        [10, 59],
        [13, 59],
        [14, 61],
        [10, 61],
      ],
      AbyssalTrench,
      2_000,
      'The Fan'
    ),
    outline(
      [
        [10, 61],
        [14, 61],
        [13, 64],
        [10, 64],
      ],
      AbyssalTrench,
      2_400,
      'The Foot — the Fourth’s last bench, where the Cantorate listens'
    ),
    box(33, 60, 2, 8, AbyssalTrench, 2_400, 'The Rest’s trench, falling east and south'),
    outline(
      [
        [32, 68],
        [35, 68],
        [34, 73],
        [32, 73],
      ],
      AbyssalTrench,
      2_900,
      'Its deep end'
    ),
    box(29, 60, 4, 1, AbyssalTrench, 2_150, 'The Rest — the trench floor under the Order’s bench'),
    box(36, 62, 3, 10, AbyssalTrench, 2_800, 'A trench of the nine'),
    outline(
      [
        [36, 72],
        [39, 72],
        [38, 77],
        [36, 77],
      ],
      AbyssalTrench,
      3_100,
      'Its deep end'
    ),
    box(29, 66, 2, 5, AbyssalTrench, 2_900, 'A trench of the nine'),
    outline(
      [
        [28, 71],
        [31, 71],
        [31, 76],
        [28, 76],
      ],
      AbyssalTrench,
      3_200,
      'Its deep end'
    ),
    box(32, 74, 4, 2, AbyssalTrench, 3_000, 'A trench of the nine'),
    outline(
      [
        [32, 76],
        [36, 76],
        [35, 79],
        [31, 79],
      ],
      AbyssalTrench,
      3_300,
      'Its deep end'
    ),

    // The Rim (§3): the Mouth's northern edge, stepping down in four bands.
    box(17, 79, 6, 1, OpenWater, 1_500, 'The Staging — the approach and the way home'),
    box(17, 80, 6, 1, OpenWater, 2_200, 'The Slopes'),
    box(17, 81, 6, 1, ResonanceField, 2_600, 'The Terraces — crystal at the rim'),

    // The Ninth, head to Mouth (§3): the spine the scar becomes. The First's
    // axis runs down from the oldest house to Sufficiency; the banding ground
    // stairs down from the head; the axis leaves the galleries south.
    outline(
      [
        [27, 59],
        [29, 59],
        [27, 67],
        [25, 67],
      ],
      AbyssalTrench,
      3_100,
      'The First’s axis — the line the Chord was aimed down'
    ),
    box(22, 62, 2, 1, OpenWater, 1_500, 'The Ninth’s head, under the duct'),
    box(
      22,
      63,
      3,
      3,
      AbyssalTrench,
      1_900,
      'The banding ground — the cohort halls down the north wall'
    ),
    box(23, 66, 2, 1, AbyssalTrench, 2_400, 'The banding ground’s throat'),
    box(23, 67, 4, 1, CoralRuins, 2_750, 'Sufficiency — the Undermarshalcy’s terrace'),
    box(23, 68, 4, 2, AbyssalTrench, 3_400, 'Sufficiency — the crossing'),
    box(23, 70, 4, 1, CoralRuins, 2_800, 'Sufficiency — the Cantorate’s terrace'),
    box(23, 71, 3, 1, CoralRuins, 3_000, 'The attending galleries — the ruleset’s ceiling'),
    box(23, 72, 3, 2, AbyssalTrench, 3_400, 'The Ninth’s axis, below the galleries'),
    box(23, 74, 2, 1, AbyssalTrench, 4_100, 'The sill — three kilometres on'),
    box(23, 75, 2, 3, AbyssalTrench, 3_800, 'The Ninth rising'),
    box(23, 78, 2, 2, AbyssalTrench, 3_500, 'The Ninth rising'),
    box(23, 80, 2, 2, AbyssalTrench, 3_300, 'The Ninth rising to the Lip'),

    // The Mouth (§3): the Rim's four bands on its northern edge, and the
    // depression below everything.
    oval(14, 82, 13, 8, AbyssalTrench, 3_100, 'The Lip — the edge that carries like a trench'),
    oval(15, 83, 11, 7, AbyssalTrench, 4_410, 'The Mouth — the floor of the setting'),
  ],
};

/**
 * What each placed region's surround is cut into, in atlas metres, over the
 * overview's own ground (§7.3). Painted after the overview and before the
 * map, so the mission's cells are its own and the detail's last 500 m are the
 * overview's.
 */
const SURROUNDS: Readonly<Record<string, readonly GroundRegion[]>> = {
  // Sorrowgate's 2,000 m, at its own 250 m: each edge of the patch carried on.
  // The districts all round; the Concourse north onto its ridge; the West
  // Approach's vein west toward the wall's vents; the Commit south and east
  // into its basin and on to the scar, whose bank stands a kilometre and a
  // half east of the map. The ring touching the map takes the edge cell it
  // touches, and nothing here reaches the detail's last 500 m.
  sorrowgate: [
    {
      x: 15_500,
      y: 38_500,
      widthM: 9_000,
      heightM: 8_000,
      biome: CoralRuins,
      floorM: 1_600,
      note: 'The districts, continued all round',
    },
    {
      x: 19_000,
      y: 38_500,
      widthM: 2_000,
      heightM: 1_250,
      biome: OpenWater,
      floorM: 400,
      note: 'The Concourse ridge',
    },
    {
      x: 19_000,
      y: 39_750,
      widthM: 2_000,
      heightM: 750,
      biome: CoralRuins,
      floorM: 340,
      note: 'The Upper Concourse, continued north to its ridge',
    },
    {
      shape: 'polygon',
      points: [
        [15_500, 42_000],
        [17_500, 42_500],
        [17_500, 42_750],
        [15_500, 43_000],
      ],
      biome: ThermalVein,
      floorM: 1_600,
      note: 'The West Approach’s vein, widening west',
    },
    {
      shape: 'polygon',
      points: [
        [19_000, 44_500],
        [21_000, 44_500],
        [21_000, 44_750],
        [22_500, 45_250],
        [24_500, 45_750],
        [24_500, 46_500],
        [18_500, 46_500],
        [18_500, 45_500],
        [19_000, 44_750],
      ],
      biome: AbyssalTrench,
      floorM: 2_400,
      note: 'The Commit, opening south and east',
    },
    {
      x: 23_750,
      y: 38_500,
      widthM: 250,
      heightM: 7_250,
      biome: OpenWater,
      floorM: 2_000,
      note: 'The scar’s lip',
    },
    {
      x: 24_000,
      y: 38_500,
      widthM: 500,
      heightM: 7_250,
      biome: AbyssalTrench,
      floorM: 2_700,
      note: 'The scar’s west bank',
    },
  ],
  // The Banding Ground's 2,000 m (#1598). Less is cut here than round
  // Sorrowgate, since the overview already draws this water: the shoulders
  // west and east, the First's axis coming down past the map's south-east
  // corner, the throat and Sufficiency's terrace south. What the surround adds
  // is the map's own edges carried on: the trench a ring round the map, the
  // halls along the north wall, the Ascent north under the duct toward the
  // shallows, and the map's Throat joined to the overview's.
  'banding-ground': [
    {
      x: 20_250,
      y: 61_750,
      widthM: 5_500,
      heightM: 4_500,
      biome: AbyssalTrench,
      floorM: 2_400,
      note: 'The upper Ninth, carried round the map',
    },
    {
      x: 22_000,
      y: 61_750,
      widthM: 2_000,
      heightM: 250,
      biome: CoralRuins,
      floorM: 1_750,
      note: 'The Cohort Halls, continued along the north wall',
    },
    {
      x: 22_750,
      y: 59_500,
      widthM: 500,
      heightM: 2_500,
      biome: CoralRuins,
      floorM: 1_500,
      note: 'The Ascent, carried north under the duct toward the shallows',
    },
    {
      x: 22_500,
      y: 66_250,
      widthM: 2_500,
      heightM: 750,
      biome: AbyssalTrench,
      floorM: 2_400,
      note: 'The Throat, carried south to Sufficiency’s terrace',
    },
  ],
  // The Western Margin's 2,500 m (#1612). The map is five bands, west to
  // east, stepping down south from the shelf lane to the worked rim, and the
  // surround carries each band on, a kilometre west and a kilometre and a
  // quarter east: the shelf lane, the slope and the bench under the wall,
  // between its upper face and its foot, and the listening ground's edge
  // across the top step. The worked ground goes half a kilometre further each
  // way and a row further south, onto the overview's own worked rim, which
  // runs at the same 1,750 m down to the First's shallow band.
  'first-trench-margin': [
    {
      x: 2_500,
      y: 47_750,
      widthM: 7_250,
      heightM: 1_000,
      biome: OpenWater,
      floorM: 1_050,
      note: 'The Shelf Lane, carried along the wall above the layer',
    },
    {
      x: 2_500,
      y: 48_750,
      widthM: 7_250,
      heightM: 750,
      biome: OpenWater,
      floorM: 1_450,
      note: 'The Slope, carried on through the layer',
    },
    {
      x: 2_500,
      y: 49_500,
      widthM: 7_250,
      heightM: 500,
      biome: OpenWater,
      floorM: 1_500,
      note: 'The bench at the slope’s foot, carried on',
    },
    {
      x: 2_500,
      y: 50_000,
      widthM: 7_250,
      heightM: 250,
      biome: OpenWater,
      floorM: 1_600,
      note: 'The Listening Ground’s southern edge, carried on',
    },
    {
      x: 2_000,
      y: 50_250,
      widthM: 8_250,
      heightM: 1_000,
      biome: AbyssalTrench,
      floorM: 1_750,
      note: 'The Worked Ground, carried along the First’s rim',
    },
  ],
  // The Shallow Band's 2,500 m (#1615). The map is the First Trench across
  // its middle, and the overview draws the trench between the same two walls,
  // 2 and 10 km. The surround carries the map's trench out to them: the rim
  // along the north wall, each overhang to its own wall, and the axis's water
  // under them a row past the map's south edge. The Sill goes on south into
  // the First's deep end, toward the Second. The rim's row north of the map
  // lies on the Western Margin's ground, so where both are drawn the margin's
  // region takes it (§7.3): its patch above the map, and its worked ground
  // either side.
  'shallow-band': [
    {
      x: 2_000,
      y: 51_000,
      widthM: 8_000,
      heightM: 4_250,
      biome: AbyssalTrench,
      floorM: 2_400,
      note: 'The First, carried on to its walls',
    },
    {
      x: 2_000,
      y: 50_750,
      widthM: 8_000,
      heightM: 1_000,
      biome: CoralRuins,
      floorM: 1_750,
      note: 'The Rim, carried along the north wall',
    },
    {
      x: 2_000,
      y: 51_750,
      widthM: 1_500,
      heightM: 2_000,
      biome: AbyssalTrench,
      floorM: 2_150,
      note: 'The West Overhang, carried on to the west wall',
    },
    {
      x: 8_500,
      y: 52_000,
      widthM: 1_500,
      heightM: 1_750,
      biome: AbyssalTrench,
      floorM: 2_150,
      note: 'The East Overhang, carried on to the east wall',
    },
    {
      x: 5_500,
      y: 55_000,
      widthM: 1_000,
      heightM: 1_000,
      biome: AbyssalTrench,
      floorM: 2_400,
      note: 'The Sill, carried south into the deep end',
    },
  ],
  // The Upper Workings' 2,500 m (#1626). The map is the Vein's field in
  // west–east bands, straddling the layer: the rail head and the High Road
  // above it, the Downworks below. The surround carries each band a
  // kilometre west and east across the wall's faces, and the rail head north
  // onto Fivewell's pillar. Face Six's map lies a row south, and its patch
  // takes its own cells where both are drawn (§7.3).
  'ninefold-workings': [
    {
      x: 2_500,
      y: 21_500,
      widthM: 6_000,
      heightM: 3_500,
      biome: ThermalVein,
      floorM: 1_100,
      note: 'The Field, carried a kilometre west and east',
    },
    {
      x: 5_000,
      y: 21_000,
      widthM: 1_000,
      heightM: 750,
      biome: ThermalVein,
      floorM: 850,
      note: 'The Rail Head, carried north onto Fivewell',
    },
    {
      x: 2_500,
      y: 22_250,
      widthM: 6_000,
      heightM: 500,
      biome: ThermalVein,
      floorM: 950,
      note: 'The High Road, carried along the shoulder',
    },
    {
      x: 2_500,
      y: 23_250,
      widthM: 6_000,
      heightM: 500,
      biome: ThermalVein,
      floorM: 1_300,
      note: 'The Downworks, carried on below the layer',
    },
  ],
  // Face Six's 2,500 m (#1626). The map is the Vein's field with the Terrace
  // across it and the Scar torn down to its south edge. The surround carries
  // the Field and the Terrace a kilometre west and east, and the Field half a
  // kilometre south across the wall's faces, its middle onto the overview's
  // deep faces, with the Scar torn on a kilometre into them. The Upper Workings' map lies a row north, and its
  // patch takes its own cells where both are drawn (§7.3).
  'ninefold-face-six': [
    {
      x: 2_000,
      y: 24_750,
      widthM: 6_000,
      heightM: 3_750,
      biome: ThermalVein,
      floorM: 1_000,
      note: 'The Field, carried a kilometre west and east and half a kilometre south',
    },
    {
      x: 4_500,
      y: 24_750,
      widthM: 1_000,
      heightM: 250,
      biome: ThermalVein,
      floorM: 700,
      note: 'The Rail Head, carried a row north',
    },
    {
      x: 2_000,
      y: 25_500,
      widthM: 6_000,
      heightM: 500,
      biome: ThermalVein,
      floorM: 850,
      note: 'The Terrace, carried along the face',
    },
    {
      x: 4_750,
      y: 28_000,
      widthM: 500,
      heightM: 1_000,
      biome: AbyssalTrench,
      floorM: 1_150,
      note: 'The Scar, torn on south into the deep faces',
    },
  ],
};

/** The surround a placed region has authored, or undefined for none. */
export function surroundFor(region: WorldRegion): readonly GroundRegion[] | undefined {
  return SURROUNDS[region.id];
}

/**
 * A placed region's mission-detail ground (§7.3): `detailRect` in 250 m
 * cells, from its north-west corner. Three layers, in order: the overview's
 * cell under each detail cell's centre, the region's surround, and the map's
 * own ground pasted whole at its offset, so the mission's cells are exactly
 * the server's baseline. Undefined for a region with no map ground or no
 * surround here.
 */
export function detailGround(region: WorldRegion): GroundCells | undefined {
  const ground = PLACED_GROUND[region.mapId];
  const surround = SURROUNDS[region.id];
  if (ground === undefined || surround === undefined) return undefined;
  const rect = detailRect(region);
  const cellM = ground.cellM;
  const cols = rect.widthM / cellM;
  const rows = rect.heightM / cellM;
  const cells: GroundCells = {
    cols,
    rows,
    cellM,
    biomes: new Uint8Array(cols * rows),
    floor: new Uint16Array(cols * rows),
    ceiling: new Uint16Array(cols * rows),
  };
  const overview = paintGround(RIFT_GROUND);
  for (let row = 0; row < rows; row++) {
    const oy = Math.floor((rect.y + (row + 0.5) * cellM) / overview.cellM);
    for (let col = 0; col < cols; col++) {
      const ox = Math.floor((rect.x + (col + 0.5) * cellM) / overview.cellM);
      const from = oy * overview.cols + ox;
      const to = row * cols + col;
      cells.biomes[to] = overview.biomes[from]!;
      cells.floor[to] = overview.floor[from]!;
      cells.ceiling[to] = overview.ceiling[from]!;
    }
  }
  paintRegions(cells, surround, rect);
  const map = paintGround(ground);
  const west = (region.x - rect.x) / cellM;
  const north = (region.y - rect.y) / cellM;
  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.cols; col++) {
      const from = row * map.cols + col;
      const to = (row + north) * cols + col + west;
      cells.biomes[to] = map.biomes[from]!;
      cells.floor[to] = map.floor[from]!;
      cells.ceiling[to] = map.ceiling[from]!;
    }
  }
  return cells;
}
