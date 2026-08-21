/**
 * Shared machinery for baking lit sprites from concept-art albedo at load
 * time — used by hullTextures.ts (units) and structureTextures.ts
 * (structures). One implementation of the distance transform, the lighting
 * model, and the glow primitives, so the two bakes cannot drift into
 * different-looking navies.
 */

import type { Faction } from '@echoes/shared';
import { FACTION_PALETTE } from './palette.ts';

/**
 * Two-pass 3/4 chamfer distance transform: distance (px) to the nearest
 * outside pixel, for every pixel inside the mask. Cheap and plenty accurate
 * for a lighting bake this size.
 */
export function distanceTransform(mask: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e9;
  const dt = new Float32Array(w * h);
  for (let i = 0; i < dt.length; i++) dt[i] = mask[i]! > 0 ? INF : 0;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : dt[y * w + x]!);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (dt[i] === 0) continue;
      dt[i] = Math.min(
        dt[i]!,
        at(x - 1, y) + 3,
        at(x, y - 1) + 3,
        at(x - 1, y - 1) + 4,
        at(x + 1, y - 1) + 4
      );
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (dt[i] === 0) continue;
      dt[i] = Math.min(
        dt[i]!,
        at(x + 1, y) + 3,
        at(x, y + 1) + 3,
        at(x + 1, y + 1) + 4,
        at(x - 1, y + 1) + 4
      );
    }
  }
  // Chamfer weights are ×3 of true pixel distance.
  for (let i = 0; i < dt.length; i++) dt[i] = dt[i]! / 3;
  return dt;
}

export function channel(color: number, shift: number): number {
  return (color >> shift) & 0xff;
}

export function cssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/**
 * Light a heightfield over an albedo and write the result into `ctx`.
 *
 * The model matches the hull bake that set the game's look: key light from
 * upper-left with the viewer straight above (top-down camera), Blinn specular,
 * and rim light in the faction accent where the surface falls away from the
 * camera. `height` is 0..1; `zScalePx` converts it back to pixels so the
 * curvature is physically proportioned to the shape's size.
 */
export function lightAndCompose(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mask: Uint8Array,
  albedo: Uint8ClampedArray,
  height: Float32Array,
  faction: Faction,
  zScalePx: number
): void {
  const palette = FACTION_PALETTE[faction];
  const tintR = channel(palette.primary, 16);
  const tintG = channel(palette.primary, 8);
  const tintB = channel(palette.primary, 0);
  const rimR = channel(palette.accent, 16);
  const rimG = channel(palette.accent, 8);
  const rimB = channel(palette.accent, 0);

  const lx = -0.45;
  const ly = -0.6;
  const lz = 0.66;
  let hx = lx;
  let hy = ly;
  let hz = lz + 1;
  const hl = Math.hypot(hx, hy, hz);
  hx /= hl;
  hy /= hl;
  hz /= hl;

  const out = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const a = mask[i]!;
      if (a === 0) continue;

      const hL = height[i - (x > 0 ? 1 : 0)]!;
      const hR = height[i + (x < w - 1 ? 1 : 0)]!;
      const hU = height[i - (y > 0 ? w : 0)]!;
      const hD = height[i + (y < h - 1 ? w : 0)]!;
      let nx = ((hL - hR) / 2) * zScalePx;
      let ny = ((hU - hD) / 2) * zScalePx;
      let nz = 1;
      const nl = Math.hypot(nx, ny, nz);
      nx /= nl;
      ny /= nl;
      nz /= nl;

      const diffuse = Math.max(0, nx * lx + ny * ly + nz * lz);
      const specular = Math.pow(Math.max(0, nx * hx + ny * hy + nz * hz), 26) * 0.6;
      const rim = Math.pow(1 - height[i]!, 3) * 0.55;
      const lit = 0.34 + diffuse * 0.85;

      const j = i * 4;
      // The plate crops run dark (night scene): lift them, then pull ~22%
      // toward the faction primary so livery reads at RTS zoom.
      const baseR = Math.min(255, albedo[j]! * 1.5 + 14) * 0.78 + tintR * 0.22;
      const baseG = Math.min(255, albedo[j + 1]! * 1.5 + 14) * 0.78 + tintG * 0.22;
      const baseB = Math.min(255, albedo[j + 2]! * 1.5 + 14) * 0.78 + tintB * 0.22;

      out.data[j] = Math.min(255, baseR * lit + specular * 235 + rim * rimR);
      out.data[j + 1] = Math.min(255, baseG * lit + specular * 240 + rim * rimG);
      out.data[j + 2] = Math.min(255, baseB * lit + specular * 245 + rim * rimB);
      out.data[j + 3] = a;
    }
  }
  ctx.putImageData(out, 0, 0);
}

/** A soft additive glow dot — running lights, silo floods, bioluminescence. */
export function glowDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number
): void {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'transparent');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}
