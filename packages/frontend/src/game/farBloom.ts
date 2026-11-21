/**
 * The far bloom: a slow river of small lanterns far out over the free-water
 * crater's bowl, at the High graphics quality (docs/art-direction.md, "A far
 * bloom of lanterns"; docs/free-water-slice.md §5, "A far bloom over the
 * bowl"; #1859).
 *
 * From Home's eye the bowl beyond the fleet was empty water, and the five
 * lanterns hung over the fleet's start alone. A full lantern is 594
 * triangles of membrane and 331 points, and from a kilometre and a half its
 * beads are under a pixel. So a lantern of the bloom is no body: no file,
 * no membrane, no strands. It is two points of the lantern's own cloud
 * (lifeGlow.ts, jellyLight.ts), the soft disc that stands for its lit bell
 * and the glow in the water round it, in `jelly-lantern`. The cloud is the
 * one the five jellies' points already draw in, so the river adds no draw,
 * and the water takes each point with distance as it takes a bead.
 *
 * World-owned, so it tells nothing (limit 4): the river is an authored list
 * on an authored loop, drawn once from a fixed seed, the same for every
 * client, and it drifts on the shared match time alone. Nothing a hull, a
 * shot or the camera does moves, gathers or brightens it. A lantern keeps
 * one level: the near lanterns' stroke and wave are not carried out here,
 * where 260 points flashing each on its own beat would be a busy frame.
 * Reduced motion holds the river where the match's start stands it.
 *
 * TUNABLE until a frame of this step is accepted: `FREE_WATER_HIGH_LIFE.BLOOM`
 * and `HIGH_GRAPHICS.LIFE.JELLY.FAR` in packages/shared/src/constants.ts.
 */

import { Vector3 } from 'three';
import { FREE_WATER_HIGH_LIFE, FREE_WATER_LIFE, HIGH_GRAPHICS } from '@echoes/shared';
import { propHash, type TerrainGrid } from './environment.ts';
import { depthToWorldY } from './perspectiveTerrain.ts';

const { at, RADII_M, startDeg, SPAN_DEG, COUNT, periodS, depthM, STATION } =
  FREE_WATER_HIGH_LIFE.BLOOM;
const { FAR } = HIGH_GRAPHICS.LIFE.JELLY;

/** One lantern of the river: where it keeps station, and how wide it is drawn. */
export interface FarLantern {
  /** Where it stands on the loop when the match starts, radians: 0 east, a quarter turn south. */
  phase: number;
  /** How far outside the river's own line it keeps, metres; negative is inside it. */
  acrossM: number;
  /** The depth it hangs at, metres. */
  depthM: number;
  /** The width of the disc that stands for its bell, metres. */
  sizeM: number;
}

/**
 * The river's lanterns, drawn once from the fixture's seed. Where one stands
 * along the river is the sum of two draws, so the river is thickest at its
 * middle and thins to nothing at its head and its tail.
 */
export const FAR_BLOOM: readonly FarLantern[] = Array.from({ length: COUNT }, (_, i) => {
  const draw = (axis: number) => propHash([FREE_WATER_LIFE.SEED, at[0], at[1], i, axis]);
  const along = draw(1) + draw(2) - 1;
  return {
    phase: ((startDeg + (along * SPAN_DEG) / 2) * Math.PI) / 180,
    acrossM: (draw(3) * 2 - 1) * STATION.acrossM,
    depthM: depthM + (draw(4) * 2 - 1) * STATION.depthM,
    sizeM: FAR.SIZE_M * (FAR.SMALLEST + (1 - FAR.SMALLEST) * draw(5)),
  };
});

/** The loop's own phase at a match time: clockwise seen from above, as every loop here. */
const turned = (phase: number, timeS: number): number =>
  phase + (((timeS % periodS) + periodS) % periodS) * ((Math.PI * 2) / periodS);

/**
 * Where a point of the river stands in plan, map metres: `phase` round the
 * loop and `acrossM` outside its line.
 */
export function farBloomPlan(phase: number, acrossM: number): [number, number] {
  return [
    at[0] + (RADII_M[0] + acrossM) * Math.cos(phase),
    at[1] + (RADII_M[1] + acrossM) * Math.sin(phase),
  ];
}

/** Where a lantern hangs at a match time, in the scene's metres. */
export function farLanternAt(slot: FarLantern, timeS: number, out: Vector3): Vector3 {
  const [x, z] = farBloomPlan(turned(slot.phase, timeS), slot.acrossM);
  return out.set(x, depthToWorldY(slot.depthM), z);
}

/**
 * Whether the ground lets the river stand: open water under the whole band
 * it sweeps in a lap, deeper than its deepest lantern. The loop is walked a
 * degree at a time, 18 m at its longest step, on the band's two edges and
 * its middle, against cells 250 m across.
 */
export function farBloomAdmitted(terrain: TerrainGrid): boolean {
  for (let deg = 0; deg < 360; deg++) {
    for (const acrossM of [-STATION.acrossM, 0, STATION.acrossM]) {
      const [x, y] = farBloomPlan((deg * Math.PI) / 180, acrossM);
      const col = Math.floor(x / terrain.cellM);
      const row = Math.floor(y / terrain.cellM);
      if (col < 0 || row < 0 || col >= terrain.cols || row >= terrain.rows) return false;
      const i = row * terrain.cols + col;
      if (terrain.ceiling[i] !== 0 || terrain.floor[i]! <= depthM + STATION.depthM) return false;
    }
  }
  return true;
}

/** Points the river hangs in the lantern's cloud: a bell's disc and its glow, a lantern. */
export function farBloomLightCount(lanterns: number): number {
  return lanterns * 2;
}

const AT = new Vector3();

/**
 * The river's points of light at a match time, each handed to `light` with
 * its width in metres and its level, as a jelly's are (jellyLight.ts): the
 * glow in the water round a lantern, then the disc that stands for its bell.
 * A smaller lantern's glow is narrower by the same share.
 */
export function writeFarBloom(
  slots: readonly FarLantern[],
  timeS: number,
  light: (at: Vector3, sizeM: number, level: number) => void
): void {
  for (const slot of slots) {
    farLanternAt(slot, timeS, AT);
    light(AT, (FAR.HALO.SIZE_M * slot.sizeM) / FAR.SIZE_M, FAR.HALO.LEVEL);
    light(AT, slot.sizeM, FAR.LEVEL);
  }
}
