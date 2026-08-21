/**
 * Baked 3D hull sprites for the player's OWN units — the "detailed sprite art"
 * rendering target from docs/art-direction.md, built from the concept art that
 * already lives in this repo rather than a separate asset pipeline.
 *
 * How a hull sprite is made, once, at load time:
 *   1. The unit's HULL_OUTLINE (silhouettes.ts) is rasterised to a mask, so the
 *      sprite, the fallback silhouette, and the enemy track all share one shape.
 *   2. A distance transform turns the mask into a pressure-hull heightfield —
 *      a rounded cylindrical cross-section, highest along the spine.
 *   3. Per-pixel normals light the hull (key light + specular + rim light) over
 *      an albedo sampled from docs/concept-art/plate-05-submarine-classes.png,
 *      tinted toward the faction's palette.
 *   4. Faction accent marks and running lights are glowed on top, in the same
 *      shape language the flat silhouettes use.
 *
 * The Asymmetric Fidelity Law is enforced by who calls this: only the own-force
 * draw path ever requests a baked sprite. Enemy tracks stay on silhouettes.ts.
 */

import { Texture } from 'pixi.js';
import { Faction, UnitKind } from '@echoes/shared';
import { FACTION_PALETTE } from './palette.ts';
import { HULL_LENGTH_M, HULL_OUTLINE } from './silhouettes.ts';

import raiderUrl from '../assets/hulls/raider.png';
import corvetteUrl from '../assets/hulls/corvette.png';
import cruiserUrl from '../assets/hulls/cruiser.png';
import shadowUrl from '../assets/hulls/shadow.png';
import siegeUrl from '../assets/hulls/siege.png';

/**
 * Which plate-05 hull patch clads which unit. The plate names four classes
 * (raider / cruiser / shadow / siege); the scout and corvette both wear raider
 * plating, cropped from different parts of the hull so they still read apart.
 */
const HULL_ART_URL: Record<UnitKind, string> = {
  [UnitKind.LightScout]: raiderUrl,
  [UnitKind.Corvette]: corvetteUrl,
  [UnitKind.Cruiser]: cruiserUrl,
  [UnitKind.AbyssalSubmersible]: shadowUrl,
  [UnitKind.Harvester]: siegeUrl,
};

/** Sprite resolution. 3 px per world metre keeps even the scout's hull crisp. */
const PX_PER_M = 3;
/** Canvas padding so rim light and running-light glow are not clipped. */
const MARGIN_PX = 10;

const artImages = new Map<UnitKind, HTMLImageElement>();
let artLoaded = false;

const baked = new Map<string, Texture>();

/** Decode every hull patch. Failure is non-fatal: units fall back to vectors. */
export async function loadHullArt(): Promise<void> {
  await Promise.all(
    Object.entries(HULL_ART_URL).map(async ([kind, url]) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      // Object.entries stringifies the numeric enum key; restore it.
      artImages.set(Number(kind) as UnitKind, img);
    })
  );
  artLoaded = true;
}

/** Half-beam of a hull outline, as a fraction of hull length. */
function halfBeamFraction(kind: UnitKind): number {
  let max = 0;
  for (const [, py] of HULL_OUTLINE[kind]) max = Math.max(max, Math.abs(py!));
  return max;
}

/** World-metre size of the baked canvas, so the renderer can scale the sprite. */
export function hullSpriteSizeM(kind: UnitKind): { widthM: number; heightM: number } {
  const lengthPx = HULL_LENGTH_M[kind] * PX_PER_M;
  const beamPx = 2 * halfBeamFraction(kind) * lengthPx;
  return {
    widthM: (lengthPx + 2 * MARGIN_PX) / PX_PER_M,
    heightM: (beamPx + 2 * MARGIN_PX) / PX_PER_M,
  };
}

/**
 * The baked texture for a kind + faction, or null while the art is decoding.
 * Bakes lazily and caches: a match only ever touches one faction's five hulls.
 */
export function hullTexture(kind: UnitKind, faction: Faction): Texture | null {
  if (!artLoaded) return null;
  const key = `${kind}:${faction}`;
  let texture = baked.get(key);
  if (texture === undefined) {
    texture = bake(kind, faction);
    baked.set(key, texture);
  }
  return texture;
}

/** Free the baked textures; safe to call once at renderer teardown. */
export function destroyHullTextures(): void {
  for (const texture of baked.values()) texture.destroy(true);
  baked.clear();
}

/**
 * Two-pass 3/4 chamfer distance transform: distance (px) to the nearest
 * outside pixel, for every pixel inside the mask. Cheap and plenty accurate
 * for a lighting bake this size.
 */
function distanceTransform(mask: Uint8Array, w: number, h: number): Float32Array {
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

function channel(color: number, shift: number): number {
  return (color >> shift) & 0xff;
}

function bake(kind: UnitKind, faction: Faction): Texture {
  const lengthPx = HULL_LENGTH_M[kind] * PX_PER_M;
  const halfBeamPx = halfBeamFraction(kind) * lengthPx;
  const w = Math.ceil(lengthPx + 2 * MARGIN_PX);
  const h = Math.ceil(2 * halfBeamPx + 2 * MARGIN_PX);
  const cx = w / 2;
  const cy = h / 2;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  // 1. Hull mask from the shared outline (bow at +X, matching sprite rotation).
  ctx.beginPath();
  HULL_OUTLINE[kind].forEach(([px, py], i) => {
    const x = cx + px! * lengthPx;
    const y = cy + py! * lengthPx;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = '#fff';
  ctx.fill();
  const maskData = ctx.getImageData(0, 0, w, h);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = maskData.data[i * 4 + 3]!;

  // 2. Albedo: the concept-art patch stretched over the hull's bounding box.
  //    The source rect skips the patch's outer 18% vertically — the crops keep
  //    slivers of sky at their edges and the hull must never wear the weather.
  const art = artImages.get(kind)!;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(
    art,
    0,
    art.naturalHeight * 0.18,
    art.naturalWidth,
    art.naturalHeight * 0.64,
    cx - lengthPx / 2,
    cy - halfBeamPx,
    lengthPx,
    2 * halfBeamPx
  );
  const albedo = ctx.getImageData(0, 0, w, h).data;

  // 3. Heightfield: a cylindrical pressure hull. At distance d from the edge,
  //    a circular section of radius r stands sqrt(d(2r - d))/r high.
  const dt = distanceTransform(mask, w, h);
  const r = Math.max(2, halfBeamPx * 0.95);
  const height = new Float32Array(w * h);
  for (let i = 0; i < height.length; i++) {
    const d = Math.min(dt[i]!, r);
    height[i] = Math.sqrt(d * (2 * r - d)) / r;
  }

  const palette = FACTION_PALETTE[faction];
  const tintR = channel(palette.primary, 16);
  const tintG = channel(palette.primary, 8);
  const tintB = channel(palette.primary, 0);
  const rimR = channel(palette.accent, 16);
  const rimG = channel(palette.accent, 8);
  const rimB = channel(palette.accent, 0);

  // Key light from upper-left, viewer straight above (top-down camera).
  const lx = -0.45;
  const ly = -0.6;
  const lz = 0.66;
  // Blinn half-vector with view (0, 0, 1).
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

      // Normal from the height gradient; z-scale r converts the 0..1 height
      // back to px so the curvature is physically proportioned.
      const hL = height[i - (x > 0 ? 1 : 0)]!;
      const hR = height[i + (x < w - 1 ? 1 : 0)]!;
      const hU = height[i - (y > 0 ? w : 0)]!;
      const hD = height[i + (y < h - 1 ? w : 0)]!;
      let nx = ((hL - hR) / 2) * r;
      let ny = ((hU - hD) / 2) * r;
      let nz = 1;
      const nl = Math.hypot(nx, ny, nz);
      nx /= nl;
      ny /= nl;
      nz /= nl;

      const diffuse = Math.max(0, nx * lx + ny * ly + nz * lz);
      const specular = Math.pow(Math.max(0, nx * hx + ny * hy + nz * hz), 26) * 0.6;
      // Rim light where the hull curves away from the camera — the doc's
      // "rendered hulls with rim light", in the faction's accent colour.
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

  drawAccents(ctx, kind, faction, cx, cy, lengthPx);

  return Texture.from(canvas);
}

/** A soft additive glow dot — running lights and bioluminescence. */
function glowDot(
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

function cssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/**
 * Faction accent marks and running lights, baked over the lit hull. Same
 * shape language as silhouettes.ts (rivets / stern pulse / spines / blade), so
 * a faction's flat fallback and its textured hull read as the same navy.
 */
function drawAccents(
  ctx: CanvasRenderingContext2D,
  kind: UnitKind,
  faction: Faction,
  cx: number,
  cy: number,
  lengthPx: number
): void {
  const accent = cssColor(FACTION_PALETTE[faction].accent);
  ctx.globalCompositeOperation = 'lighter';

  switch (faction) {
    case Faction.Bathyarch:
      // Rivets down the spine, glowing hazard-amber under deck lights.
      for (const t of [-0.25, 0, 0.25]) {
        glowDot(ctx, cx + t * lengthPx, cy, lengthPx * 0.05, accent, 0.9);
      }
      break;
    case Faction.Pelagia:
      // The bioluminescent wake pulse at the stern.
      glowDot(ctx, cx - 0.38 * lengthPx, cy, lengthPx * 0.14, accent, 0.8);
      break;
    case Faction.Directorate: {
      // Dorsal spine ridge: three biolight nodes along the back.
      for (const t of [-0.2, 0.05, 0.3]) {
        glowDot(ctx, cx + t * lengthPx, cy, lengthPx * 0.055, accent, 0.85);
      }
      break;
    }
    case Faction.Hadron: {
      // The blade line, bow to stern.
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(1, lengthPx * 0.02);
      ctx.beginPath();
      ctx.moveTo(cx - 0.45 * lengthPx, cy);
      ctx.lineTo(cx + 0.5 * lengthPx, cy);
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
  }

  // Bow running light, every navy: the eye needs the heading at a glance.
  glowDot(ctx, cx + 0.44 * lengthPx, cy, lengthPx * 0.05, '#ff5a48', 0.9);
  // Harvesters carry loading-bay floods at the scoop.
  if (kind === UnitKind.Harvester) {
    glowDot(ctx, cx + 0.4 * lengthPx, cy - 0.18 * lengthPx, lengthPx * 0.06, '#f2b233', 0.7);
    glowDot(ctx, cx + 0.4 * lengthPx, cy + 0.18 * lengthPx, lengthPx * 0.06, '#f2b233', 0.7);
  }

  ctx.globalCompositeOperation = 'source-over';
}
