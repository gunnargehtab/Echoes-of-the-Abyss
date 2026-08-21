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

/** Decoded offline-baked maps for one 3D model (see tools/hull-maps). */
export interface ModelMaps {
  /** Alpha is the silhouette mask; RGB is the model's own one-faction livery. */
  albedo: HTMLImageElement;
  /** Depth from directly above, bright = high. */
  height: HTMLImageElement;
  /** Where the model's lights are; black means unlit. */
  emissive: HTMLImageElement;
  widthPx: number;
  heightPx: number;
}

/**
 * Bake a sprite from a model's offline maps — the shared model-backed path for
 * units (hullTextures.ts) and structures (structureTextures.ts), kept here for
 * the same reason as the lighting model: one implementation, one look.
 *
 * Mask and relief are the designed geometry's own. The cladding is the model
 * albedo's *luminance* recoloured in the faction primary: models are dressed
 * in one faction's palette, so their hue is not shareable, but their value is
 * the panel/ridge shading of this specific shape. Lights come from the
 * emissive map, recoloured to the faction glow and bloomed, so each design's
 * approved light budget survives into the sprite (glow encodes loudness).
 *
 * Returns the canvas; callers wrap it in a texture and may add their own
 * marks (the hulls' bow light) on top.
 */
export function bakeModelSprite(
  faction: Faction,
  map: ModelMaps,
  marginPx: number
): HTMLCanvasElement {
  const mw = map.widthPx;
  const mh = map.heightPx;
  const w = mw + 2 * marginPx;
  const h = mh + 2 * marginPx;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  // 1. Mask from the albedo pass's alpha.
  ctx.drawImage(map.albedo, marginPx, marginPx);
  const modelAlbedo = ctx.getImageData(0, 0, w, h).data;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = modelAlbedo[i * 4 + 3]!;

  // 2. Heightfield, renormalised across the shape's own range: the map stores
  //    absolute camera depth, but the lighting model wants 0 at the silhouette
  //    edge and 1 at the highest point, and only the masked pixels say where
  //    those actually fall.
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(map.height, marginPx, marginPx);
  const depth = ctx.getImageData(0, 0, w, h).data;
  let lo = 255;
  let hi = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 0) continue;
    const v = depth[i * 4]!;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = Math.max(1, hi - lo);
  const height = new Float32Array(w * h);
  for (let i = 0; i < height.length; i++) {
    if (mask[i] === 0) continue;
    height[i] = (depth[i * 4]! - lo) / span;
  }

  // 3. Cladding: luminance recoloured in the faction primary, lifted off the
  //    floor (dark liveries would otherwise bury the faction colour) but kept
  //    low overall — lightAndCompose lifts by ×1.5, and a mid-grey base here
  //    clips to white the moment specular lands.
  const palette = FACTION_PALETTE[faction];
  const primaryR = channel(palette.primary, 16);
  const primaryG = channel(palette.primary, 8);
  const primaryB = channel(palette.primary, 0);
  const albedo = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 0) continue;
    const j = i * 4;
    const luma =
      (0.299 * modelAlbedo[j]! + 0.587 * modelAlbedo[j + 1]! + 0.114 * modelAlbedo[j + 2]!) / 255;
    const v = 0.22 + 0.3 * luma;
    albedo[j] = v * primaryR;
    albedo[j + 1] = v * primaryG;
    albedo[j + 2] = v * primaryB;
    albedo[j + 3] = 255;
  }

  // Half the minor extent keeps relief curvature proportional to the shape's
  // size, matching what the procedural bakes use.
  lightAndCompose(ctx, w, h, mask, albedo, height, faction, Math.min(mw, mh) / 2);

  drawModelLights(ctx, map, faction, marginPx);

  return canvas;
}

/**
 * The model's lights, recoloured to the faction glow colour and bloomed.
 * Placement and budget are the model's — approved at intake against the
 * design's SIG band, never a hardcoded per-faction dot pattern here.
 */
function drawModelLights(
  ctx: CanvasRenderingContext2D,
  map: ModelMaps,
  faction: Faction,
  marginPx: number
): void {
  const glow = FACTION_PALETTE[faction].glow;
  const r = channel(glow, 16);
  const g = channel(glow, 8);
  const b = channel(glow, 0);

  const lights = document.createElement('canvas');
  lights.width = map.widthPx;
  lights.height = map.heightPx;
  const lctx = lights.getContext('2d', { willReadFrequently: true })!;
  lctx.drawImage(map.emissive, 0, 0);

  const data = lctx.getImageData(0, 0, lights.width, lights.height);
  for (let i = 0; i < data.data.length; i += 4) {
    // The emissive pass renders on black, so brightness alone says "lit here".
    const luma = Math.max(data.data[i]!, data.data[i + 1]!, data.data[i + 2]!) / 255;
    data.data[i] = r;
    data.data[i + 1] = g;
    data.data[i + 2] = b;
    data.data[i + 3] = Math.min(255, luma * 320);
  }
  lctx.putImageData(data, 0, 0);

  ctx.globalCompositeOperation = 'lighter';
  // Bloom first, then the sharp marks on top: a light in black water is a
  // halo with a hot centre, never a flat sticker.
  ctx.filter = 'blur(3px)';
  ctx.globalAlpha = 0.85;
  ctx.drawImage(lights, marginPx, marginPx);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.drawImage(lights, marginPx, marginPx);
  ctx.globalCompositeOperation = 'source-over';
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
