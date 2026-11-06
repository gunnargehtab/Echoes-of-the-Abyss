import { Biome, FREE_WATER_LIFE } from '@echoes/shared';
import { propHash, propSpec, type PropPlacement, type TerrainGrid } from './environment.ts';
import { DEPTH_VISUAL_M_PER_M, depthToWorldY } from './perspectiveTerrain.ts';

/**
 * docs/free-water-slice.md §5. Slots, not scatter: neither hidden state nor the
 * camera is an input. Every closed path's entire envelope stays in its patch.
 */
export function freeWaterPlacements(terrain: TerrainGrid, retainInvalid = false): PropPlacement[] {
  const slots: PropPlacement[] = [];
  const add = (slug: string, xM: number, yM: number, motion?: PropPlacement['motion']) => {
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
    // Test the whole swept plan envelope, including neighbouring cells.
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
        yawRad: 0,
        scale: 1,
        cellIndex,
        ...(valid ? {} : { disabled: true }),
        ...(motion === undefined ? {} : { motion }),
      });
  };
  // Stands sit only where the rendered floor is the garden's 400 m tread: the
  // view interpolates between cell centres, so a plan envelope that reaches
  // past the last tread centre, toward the rim, the bowl or the pocket, would
  // hang over the ramp. That bounds the rows to y=685..1,315 and the columns
  // to x=1,185..2,815, and with the clearing's row bare, inner rows 5 m from
  // its edges so a 4 m sway never crosses them, it admits three rows north of
  // the clearing and one south, 14 stands each (#1751).
  for (const [y, dy] of [
    [500, 187.5],
    [750, 62.5],
    [750, 185],
    [1250, 65],
  ] as const) {
    for (const x of [1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750]) {
      for (const dx of [62.5, 187.5]) {
        if ((x === 1000 && dx === 62.5) || (x === 2750 && dx === 187.5)) continue;
        add('env-kelp-stand', x + dx, y + dy);
      }
    }
  }
  // The retained clusters are the forest's fringe along the garden's north
  // edge, on the gentle ramp up to the rim behind the outermost stands.
  for (const x of [1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750]) {
    for (const dx of [62.5, 187.5]) add('env-kelp-cluster', x + dx, 500 + 62.5);
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
  const { CRAB, FRY, OUTER, GARDEN_OUTER, DEEP, FRY_SCHOOL, OUTER_SCHOOL } = FREE_WATER_LIFE;
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
  // outer fish crossing 185 to 385 m out, where a 4 m body still reads.
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
