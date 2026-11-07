import { Matrix4, Quaternion, Vector3 } from 'three';
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
 * time; the decoration test holds every rule on it. The south flank's 125 m
 * of tread holds one band of stands, so four of #1751's fourteen there moved
 * north, 46 against 10, and the band opens four gaps instead of reading as
 * one line.
 */
const KELP_STANDS = [
  [1898.2, 661.2, 0],
  [2518.2, 661.2, 1],
  [2192.2, 663.6, 3],
  [1613.7, 664.9, -1],
  [2807.9, 670.1, -10],
  [1343.6, 670.4, 6],
  [1191.2, 671.4, -8],
  [2061.1, 679, 19],
  [1760.2, 680.8, -17],
  [2368.9, 681.2, 22],
  [2656.7, 687.4, 27],
  [1480.5, 702.1, 43],
  [2527.5, 741.5, -9],
  [1922.5, 745, 15],
  [2735.4, 746.5, 8],
  [2207, 747.7, -12],
  [1588.4, 756.7, 21],
  [2077.7, 762.6, 4],
  [2382.2, 765.6, 7],
  [1214.7, 768.1, 20],
  [1733.5, 773.6, -37],
  [1360, 787.4, -38],
  [2594.5, 823, 43],
  [2791.1, 826.3, 24],
  [1886.1, 839.9, -23],
  [2162.4, 846.8, 38],
  [1505.1, 851.1, 1],
  [1187.1, 857.8, 2],
  [2021, 861.9, 21],
  [1658.5, 862.3, -4],
  [2462.8, 862.4, 28],
  [1323.9, 871, -16],
  [2323.1, 872.9, -15],
  [2688.2, 885.2, -39],
  [1765, 916.7, 35],
  [2806.3, 925.1, 45],
  [2183.7, 933.6, 18],
  [1486.2, 940.4, -19],
  [1210.4, 940.5, 17],
  [2479.4, 946.9, 15],
  [1634.9, 949.1, 12],
  [1924.4, 956.3, 5],
  [2053.1, 960.2, -2],
  [2337.6, 961.2, 0],
  [1343.7, 962.2, 0],
  [2613.4, 962.6, 0],
  [2409.2, 1295.2, 2],
  [2785.8, 1302.1, 6],
  [2085.1, 1306.1, 6],
  [1337.2, 1310.4, -14],
  [1735.4, 1311.2, -8],
  [2609.8, 1319.1, -13],
  [2271.8, 1320.4, 18],
  [1199.3, 1327, 5],
  [1955.2, 1327.7, -11],
  [1550.4, 1328.9, 0],
] as const;

/**
 * The retained clusters' fringe, on the ramp up to the rim north of every
 * stand, drawn with them and held to the same rules.
 */
const KELP_CLUSTERS = [
  [2935.2, 515, -36],
  [2227.3, 531.6, 8],
  [1642.4, 532.5, -43],
  [1289.7, 537.2, 29],
  [2514.2, 542.8, -9],
  [1794.9, 543.5, -13],
  [2918.2, 552.8, 28],
  [1131.9, 556.1, -30],
  [2149.5, 559.4, -39],
  [2452.4, 576.1, 41],
  [1883.4, 591.4, -12],
  [1377.8, 594.3, 10],
  [2497.1, 598.2, -13],
  [2166.9, 598.6, -41],
  [2203.1, 607.3, 38],
  [2741.5, 611.5, -6],
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
  // lower right between the corvette and the legend. Level, it showed that
  // eye a third of its plan and drew as a sliver where its loop turned it
  // edge-on (#1780), so its phase is authored rather than seeded: it starts
  // where its bank turns its back to the eye, over the dark water beyond the
  // shelf's edge, for the opening's first minute.
  const { startDeg, ...ray } = RAY;
  add('env-rim-ray', 735, 2210, { ...ray, phase: (startDeg * Math.PI) / 180 });
  return slots;
}

/** Where a decorative body stands at one match time: its level origin, heading and bank. */
export interface DecorationPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  roll: number;
}

export function decorationPose(
  placement: PropPlacement,
  matchMs: number,
  groundY: (xM: number, yM: number) => number
): DecorationPose {
  const motion = placement.motion;
  if (motion === undefined) {
    return {
      x: placement.xM,
      y: groundY(placement.xM, placement.yM),
      z: placement.yM,
      yaw: placement.yawRad,
      roll: 0,
    };
  }
  const phase = motion.phase + (((matchMs / 1000) % motion.periodS) / motion.periodS) * Math.PI * 2;
  const x = placement.xM + Math.cos(phase) * motion.radiusM;
  const z = placement.yM + Math.sin(phase) * motion.radiusM;
  const y =
    motion.depthM === null
      ? groundY(x, z)
      : depthToWorldY(motion.depthM + Math.sin(phase) * motion.depthSwingM) - motion.axisM;
  // Models swim along +X; three's positive yaw turns it toward -Z. Every loop
  // runs clockwise seen from above, so its centre lies to starboard, +Z, and a
  // positive roll about +X lowers the starboard wing into the turn.
  return { x, y, z, yaw: -phase - Math.PI / 2, roll: ((motion.bankDeg ?? 0) * Math.PI) / 180 };
}

const Y_AXIS = new Vector3(0, 1, 0);
const X_AXIS = new Vector3(1, 0, 0);
const TURN = new Quaternion();
const BANK = new Quaternion();
const ORIGIN = new Vector3();
const AXIS = new Vector3();
const SCALE = new Vector3();

/**
 * A pose's instance matrix: the heading about +y, then the bank about the
 * body's own axis, `axisM` over its origin (§5), so a banked body's axis keeps
 * the path and depth `decorationPose` gives it and only the wings move. A
 * roll about the origin would carry the axis 0.38 m sideways at the ray's 30
 * degrees. Bodies draw at scale 1, or 0 for a disabled slot.
 */
export function decorationMatrix(
  pose: DecorationPose,
  axisM: number,
  scale: number,
  out: Matrix4
): Matrix4 {
  TURN.setFromAxisAngle(Y_AXIS, pose.yaw);
  if (pose.roll !== 0) TURN.multiply(BANK.setFromAxisAngle(X_AXIS, pose.roll));
  ORIGIN.set(0, -axisM, 0)
    .applyQuaternion(TURN)
    .add(AXIS.set(pose.x, pose.y + axisM, pose.z));
  return out.compose(ORIGIN, TURN, SCALE.setScalar(scale));
}
