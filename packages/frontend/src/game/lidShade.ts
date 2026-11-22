/**
 * The Lid's glow a wall hides: the lit ground's shade at the crater's own
 * scale (docs/art-direction.md, "The crater from above"; #1891).
 *
 * The Lid's glow is light from the whole water above, from no quarter
 * (litGround.ts). Step 1 shades it a pixel at a time: by the slope under the
 * pixel, and by ground within 45 m of it (highChain.ts). So the foot of a
 * 900 m wall took the glow level ground takes, and from the survey dolly the
 * free-water crater's floors drew as flat panels with their scarps as
 * outlines. A point under a wall sees less of the water above than a point
 * on open ground, and by more the taller the wall and the nearer it stands.
 * This module reads that off the drawn heights.
 *
 * Pure data, no three.js, so it runs under node. Render-only, like every
 * heightfield here: the simulation never reads it, and it reads nothing but
 * the ground a client already draws. Deterministic from the grid alone.
 * Every number is TUNABLE in `HIGH_GRAPHICS.CRATER` until a frame of it is
 * accepted.
 */

import { HIGH_GRAPHICS } from '@echoes/shared';
import { DEPTH_VISUAL_M_PER_M, type HeightGrid } from './perspectiveTerrain.ts';

/** The grid's world Y at a fractional vertex, bilinear, clamped onto the grid. */
function heightAt(grid: HeightGrid, gx: number, gz: number): number {
  const { vertsX, vertsZ, y } = grid;
  const x0 = Math.min(vertsX - 2, Math.max(0, Math.floor(gx)));
  const z0 = Math.min(vertsZ - 2, Math.max(0, Math.floor(gz)));
  const fx = Math.min(1, Math.max(0, gx - x0));
  const fz = Math.min(1, Math.max(0, gz - z0));
  const a = y[z0 * vertsX + x0]!;
  const b = y[z0 * vertsX + x0 + 1]!;
  const c = y[(z0 + 1) * vertsX + x0]!;
  const d = y[(z0 + 1) * vertsX + x0 + 1]!;
  return (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz;
}

/**
 * How much of the Lid's glow the ground round each vertex leaves it, 0 to 1:
 * 1 on open ground and on a crest, less under a wall.
 *
 * Along each of `SHADE_RAYS` bearings the ground's horizon is the steepest
 * rise within `SHADE_REACH_M`, at the true scale: the heights are drawn at
 * `DEPTH_VISUAL_M_PER_M`, and light does not know that, so a rise is read
 * back into metres of depth first. Level ground under an even glow takes
 * cos² of the horizon's elevation from a bearing, which is 1 / (1 + tan²),
 * and the mean over the bearings is the vertex's share. A ray that leaves the
 * map sees open water from there on.
 */
export function lidVisibility(grid: HeightGrid): Float32Array {
  const { vertsX, vertsZ, stepM, y } = grid;
  const { SHADE_REACH_M, SHADE_RAYS } = HIGH_GRAPHICS.CRATER;
  const steps = Math.max(1, Math.round(SHADE_REACH_M / stepM));
  const bearings: [number, number][] = [];
  for (let ray = 0; ray < SHADE_RAYS; ray++) {
    const angle = (ray / SHADE_RAYS) * Math.PI * 2;
    bearings.push([Math.cos(angle), Math.sin(angle)]);
  }
  const visible = new Float32Array(vertsX * vertsZ);
  for (let iz = 0; iz < vertsZ; iz++) {
    for (let ix = 0; ix < vertsX; ix++) {
      const here = y[iz * vertsX + ix]!;
      let sum = 0;
      for (const [dx, dz] of bearings) {
        let tan = 0;
        for (let k = 1; k <= steps; k++) {
          const gx = ix + dx * k;
          const gz = iz + dz * k;
          if (gx < 0 || gz < 0 || gx > vertsX - 1 || gz > vertsZ - 1) break;
          const riseM = (heightAt(grid, gx, gz) - here) / DEPTH_VISUAL_M_PER_M;
          const slope = riseM / (k * stepM);
          if (slope > tan) tan = slope;
        }
        sum += 1 / (1 + tan * tan);
      }
      visible[iz * vertsX + ix] = sum / SHADE_RAYS;
    }
  }
  return visible;
}

/**
 * Write the shade into a lit ground's relief texture, in its alpha, which
 * the lit ground takes the Lid's glow by (litGround.ts `LIT_GROUND_GLSL`).
 * `relief` is `widthPx × heightPx` RGBA over the whole grid, row 0 the north
 * edge, as the bake lays it out. Every pixel's alpha is written whole, so a
 * second write after a bake that touched some of them leaves the same bytes
 * a first would. `SHADE` is the share of what the walls hide that is taken:
 * at 0 every alpha is 255, which is the bake's own and shades nothing.
 */
export function writeLidShade(
  relief: Uint8Array,
  widthPx: number,
  heightPx: number,
  grid: HeightGrid,
  visible: Float32Array
): void {
  const { vertsX, vertsZ } = grid;
  const share = HIGH_GRAPHICS.CRATER.SHADE;
  for (let py = 0; py < heightPx; py++) {
    // A pixel's centre, in vertices: the texture spans the grid edge to edge.
    const gz = ((py + 0.5) / heightPx) * (vertsZ - 1);
    const z0 = Math.min(vertsZ - 2, Math.floor(gz));
    const fz = gz - z0;
    for (let px = 0; px < widthPx; px++) {
      const gx = ((px + 0.5) / widthPx) * (vertsX - 1);
      const x0 = Math.min(vertsX - 2, Math.floor(gx));
      const fx = gx - x0;
      const a = visible[z0 * vertsX + x0]!;
      const b = visible[z0 * vertsX + x0 + 1]!;
      const c = visible[(z0 + 1) * vertsX + x0]!;
      const d = visible[(z0 + 1) * vertsX + x0 + 1]!;
      const open = (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz;
      relief[(py * widthPx + px) * 4 + 3] = Math.round(255 * (1 - share + share * open));
    }
  }
}
