import { Biome, FREE_WATER_LIFE } from '@echoes/shared';
import { propHash, propSpec, type PropPlacement, type TerrainGrid } from './environment.ts';
import { DEPTH_VISUAL_M_PER_M, depthToWorldY } from './perspectiveTerrain.ts';

/**
 * docs/free-water-slice.md §5, "No rows" (#1773): every plant as map metres
 * and a heading in degrees, +x down-current and positive turning toward
 * north, as the instance's yaw about +y does. #1751 stood the stands in four
 * rows of fourteen at one 125 m pitch, all facing down-current, and a stand
 * is 120 by 69 m, so the forest drew as strips with bare lanes between them.
 * docs/screenshots/issue-1773/layout.mjs drew this list once, by a seeded
 * anneal from those rows under §5's rules, and nothing redraws it at play
 * time; the decoration test holds every rule on it. The south flank's 121 m
 * of tread holds one band, so its stands wander and turn only within it.
 */
const KELP_STANDS = [
  [1464.8, 664.6, 4],
  [2603.2, 666, 3],
  [1904.3, 667.1, 4],
  [2196, 668.3, 6],
  [1199.9, 668.8, -3],
  [2789.6, 679.8, -18],
  [1659.1, 685, -14],
  [2392.3, 685.6, 0],
  [1337.8, 689.3, 19],
  [2065.4, 695.8, 39],
  [1775.7, 743, 24],
  [2649.4, 746.5, 28],
  [2478.6, 752.4, 25],
  [2186.2, 760.7, 23],
  [1463.7, 762.5, -13],
  [1628.7, 775.5, -42],
  [1941.8, 775.8, -27],
  [2813.4, 775.8, 1],
  [1238.7, 788.5, -25],
  [2351.6, 791.2, 45],
  [2063.3, 833.6, -1],
  [1767.8, 835.5, 4],
  [2657.8, 835.9, 13],
  [1345.2, 836.3, 45],
  [1901.5, 853.3, -42],
  [2508.7, 854.8, 10],
  [1525.6, 862.7, 27],
  [2786.9, 866.3, -17],
  [1201.2, 868.4, -7],
  [2241.7, 868.4, -11],
  [1790, 926.3, 24],
  [1644, 927.2, -23],
  [2356.6, 928.4, -27],
  [2094.1, 929.4, -18],
  [2626.5, 935.7, -27],
  [1377.7, 940.2, 23],
  [2493.8, 951.8, -7],
  [1224.7, 952.6, 8],
  [2225.5, 953.7, 6],
  [2809.8, 954, 3],
  [1925.5, 956.4, 2],
  [1509.1, 960.7, 0],
  [1555.1, 1289.1, 0],
  [2557.8, 1289.9, 0],
  [1185.5, 1290.4, 0],
  [2434.6, 1291.5, 0],
  [1678.4, 1293.1, -3],
  [2066.4, 1293.2, 1],
  [1940.4, 1295.4, -6],
  [1307.1, 1328.2, -10],
  [1810.2, 1329.1, 11],
  [2811.4, 1331.5, -2],
  [2680.5, 1332.3, -7],
  [1434.4, 1333.4, 2],
  [2313.8, 1335.8, 4],
  [2188.5, 1337.4, -2],
] as const;

/**
 * The retained clusters' fringe, on the ramp up to the rim north of every
 * stand, drawn with them and held to the same rules.
 */
const KELP_CLUSTERS = [
  [2875.1, 515.4, -17],
  [2936.4, 517.6, 21],
  [2250.5, 518.3, -41],
  [1052.4, 521.9, 18],
  [1530.6, 523.1, -1],
  [2618.8, 524.4, -3],
  [1167.2, 537.9, 41],
  [2609.4, 539.1, -6],
  [2908.3, 551.1, -3],
  [1110.1, 557.4, 34],
  [1913, 559.9, -29],
  [1637.8, 568.2, 36],
  [1514.3, 575.7, -37],
  [2543.6, 576.7, -41],
  [2181.8, 603.8, 19],
  [2584.7, 610.3, 16],
] as const;

/**
 * docs/free-water-slice.md §5. Slots, not scatter: neither hidden state nor the
 * camera is an input. Every closed path's entire envelope stays in its patch.
 */
export function freeWaterPlacements(terrain: TerrainGrid, retainInvalid = false): PropPlacement[] {
  const slots: PropPlacement[] = [];
  const add = (
    slug: string,
    xM: number,
    yM: number,
    motion?: PropPlacement['motion'],
    yawRad = 0
  ) => {
    const col = Math.floor(xM / terrain.cellM);
    const row = Math.floor(yM / terrain.cellM);
    const cellIndex = row * terrain.cols + col;
    const floor = terrain.floor[cellIndex]!;
    const ceiling = terrain.ceiling[cellIndex]!;
    const spec = propSpec(slug)!;
    let valid =
      col >= 0 &&
      row >= 0 &&
      col < terrain.cols &&
      row < terrain.rows &&
      ceiling === 0 &&
      floor > ceiling;
    const admits = (i: number) =>
      motion?.depthM != null
        ? terrain.ceiling[i] === 0 &&
          motion.depthM + motion.depthSwingM + spec.footprintM / DEPTH_VISUAL_M_PER_M <
            terrain.floor[i]! &&
          motion.depthM - motion.depthSwingM - spec.footprintM / DEPTH_VISUAL_M_PER_M >
            terrain.ceiling[i]!
        : terrain.biomes[i] === Biome.KelpForest &&
          terrain.floor[i] === 400 &&
          terrain.ceiling[i] === 0;
    valid &&= admits(cellIndex);
    // Test the whole swept plan envelope, including neighbouring cells. The
    // footprint's disc holds a turned stand whole: its script fences every
    // vertex within 60 m of its centre (tools/hull-models/props/kelp-stand.mjs).
    const radius = (motion?.radiusM ?? 0) + spec.footprintM / 2;
    for (
      let y = Math.floor((yM - radius) / terrain.cellM);
      y <= Math.floor((yM + radius) / terrain.cellM);
      y++
    ) {
      for (
        let x = Math.floor((xM - radius) / terrain.cellM);
        x <= Math.floor((xM + radius) / terrain.cellM);
        x++
      ) {
        const i = y * terrain.cols + x;
        if (x < 0 || y < 0 || x >= terrain.cols || y >= terrain.rows || !admits(i)) valid = false;
      }
    }
    if (valid || retainInvalid)
      slots.push({
        slug,
        xM,
        yM,
        yawRad,
        scale: 1,
        cellIndex,
        ...(valid ? {} : { disabled: true }),
        ...(motion === undefined ? {} : { motion }),
      });
  };
  for (const [x, y, yawDeg] of KELP_STANDS) {
    add('env-kelp-stand', x, y, undefined, (yawDeg * Math.PI) / 180);
  }
  for (const [x, y, yawDeg] of KELP_CLUSTERS) {
    add('env-kelp-cluster', x, y, undefined, (yawDeg * Math.PI) / 180);
  }
  const life = (
    slug: string,
    x: number,
    y: number,
    count: number,
    motion: Omit<NonNullable<PropPlacement['motion']>, 'phase'>
  ) => {
    const phase = propHash([FREE_WATER_LIFE.SEED, x, y]) * Math.PI * 2;
    const inner = FREE_WATER_LIFE.INNER_RADIUS_SHARE;
    for (let i = 0; i < count; i++) {
      add(slug, x, y, {
        ...motion,
        radiusM: motion.radiusM * (count === 1 ? 1 : inner + ((1 - inner) * (i + 1)) / count),
        phase: phase + (i * Math.PI * 2) / count,
      });
    }
  };
  // A school keeps station on one loop (#1771): each fish holds a fixed
  // seeded offset from the school's own point, along the loop, across it and
  // in depth, on the shared period, so the formation turns with the school and
  // reads as one knot of fish. `life` instead spreads a patch round its whole
  // loop at evenly spaced phases, which at canonical size reads as nothing.
  const school = (
    slug: string,
    x: number,
    y: number,
    count: number,
    motion: Omit<NonNullable<PropPlacement['motion']>, 'phase'>,
    station: { readonly alongM: number; readonly acrossM: number; readonly depthM: number }
  ) => {
    const phase = propHash([FREE_WATER_LIFE.SEED, x, y]) * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const offset = (axis: number) => propHash([FREE_WATER_LIFE.SEED, x, y, i, axis]) * 2 - 1;
      add(slug, x, y, {
        ...motion,
        radiusM: motion.radiusM + offset(1) * station.acrossM,
        phase: phase + (offset(2) * station.alongM) / motion.radiusM,
        depthM: motion.depthM === null ? null : motion.depthM + offset(3) * station.depthM,
      });
    }
  };
  const { CRAB, FRY, OUTER, GARDEN_OUTER, DEEP, RAY, FRY_SCHOOL, OUTER_SCHOOL } = FREE_WATER_LIFE;
  // #1713's patches: crabs among the south flank's stands, fry over the north
  // canopy, outer fish over the bowl and deep fish in the pocket.
  for (const x of [1625, 1875, 2125, 2375]) life('env-rim-crab', x, 1375, 4, CRAB);
  for (const x of [1375, 1875, 2375, 2875]) school('env-shoal-fry', x, 875, 24, FRY, FRY_SCHOOL);
  for (const x of [1750, 2000, 2250, 2500]) {
    for (const y of [1750, 2500]) life('env-outer-fish', x, y, 1, OUTER);
  }
  for (const x of [1875, 2125, 2375, 2625]) {
    for (const y of [2125, 2375]) life('env-deep-fish', x, y, 1, DEEP);
  }
  // #1771's, where §9's frames read a body of canonical size. Garden close
  // looks west along the clearing from 41 m deep: crabs on its floor from
  // about 220 m out, as near as the floor shows above the console; two fry
  // schools 65 to 140 m out, which only the shallower band reaches; and
  // outer fish crossing 185 to 385 m out, the nearer school within the
  // 300 m where a 4 m body reads as a fish.
  for (const [x, y] of [
    [1900, 1060],
    [1880, 1165],
    [1800, 1110],
    [1760, 1200],
  ] as const) {
    life('env-rim-crab', x, y, 4, CRAB);
  }
  for (const [x, y, depthM] of [
    [2035, 1120, 132],
    [2010, 1160, 145],
  ] as const) {
    school('env-shoal-fry', x, y, 24, { ...FRY, depthM }, FRY_SCHOOL);
  }
  for (const [x, y] of [
    [1900, 1150],
    [1780, 1080],
  ] as const) {
    school('env-outer-fish', x, y, 4, GARDEN_OUTER, OUTER_SCHOOL);
  }
  // The low pose looks into the pocket over the southern wall, and only its
  // northern part clears the console: three patches along the north edge,
  // read as photophores against its dark.
  for (const [x, y] of [
    [1950, 1640],
    [2150, 1630],
    [2350, 1650],
  ] as const) {
    life('env-deep-fish', x, y, 6, DEEP);
  }
  // #1777's: the opening's eye stands above the Lid, so no water in its frame
  // is nearer than about 550 m and no 4 m body reads there. The ray, 18 m
  // across, glides on one loop south-east of the fleet's start, 810 to 930 m
  // from the eye, where its span draws 26 to 30 px in the open water at the
  // lower right between the corvette and the legend.
  life('env-rim-ray', 735, 2210, 1, RAY);
  return slots;
}

export function decorationPose(
  placement: PropPlacement,
  matchMs: number,
  groundY: (xM: number, yM: number) => number
): { x: number; y: number; z: number; yaw: number } {
  const motion = placement.motion;
  if (motion === undefined) {
    return {
      x: placement.xM,
      y: groundY(placement.xM, placement.yM),
      z: placement.yM,
      yaw: placement.yawRad,
    };
  }
  const phase = motion.phase + (((matchMs / 1000) % motion.periodS) / motion.periodS) * Math.PI * 2;
  const x = placement.xM + Math.cos(phase) * motion.radiusM;
  const z = placement.yM + Math.sin(phase) * motion.radiusM;
  const y =
    motion.depthM === null
      ? groundY(x, z)
      : depthToWorldY(motion.depthM + Math.sin(phase) * motion.depthSwingM) - motion.axisM;
  // Models swim along +X; three's positive yaw turns it toward -Z.
  return { x, y, z, yaw: -phase - Math.PI / 2 };
}
