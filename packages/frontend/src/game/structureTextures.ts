/**
 * Baked 3D structure sprites for the player's OWN base — the same treatment
 * hullTextures.ts gives units, applied to the four structure footprints.
 *
 * How a structure sprite is made, once, at load time:
 *   1. The footprint from silhouettes.ts (octagon / block / hall / mount) is
 *      rasterised to a mask, so the sprite, the scaffold fallback, and the
 *      enemy track all share one shape.
 *   2. A heightfield is composed from architecture rather than a hull section:
 *      a bevelled slab for the footprint, with a pressure dome on the Bastion,
 *      silo domes on the Refinery, a recessed launch bay in the Foundry, and a
 *      dome-and-barrel on the turret.
 *   3. The shared lighting model (bake.ts) lights it over concept-art plating,
 *      tinted toward the faction palette, and industrial glow marks go on top.
 *
 * Construction sites deliberately stay on the flat scaffold rendering — a
 * half-built structure is schematic, not architecture — and the Asymmetric
 * Fidelity Law is enforced by who calls this: only the own-force draw path
 * requests baked sprites. Enemy tracks stay on silhouettes.ts.
 */

import { Texture } from 'pixi.js';
import { Faction, StructureKind, structureStatsFor } from '@echoes/shared';
import { FACTION_PALETTE } from './palette.ts';
import { cssColor, distanceTransform, glowDot, lightAndCompose } from './bake.ts';

import cruiserUrl from '../assets/hulls/cruiser.png';
import siegeUrl from '../assets/hulls/siege.png';
import corvetteUrl from '../assets/hulls/corvette.png';
import raiderUrl from '../assets/hulls/raider.png';

/**
 * Which plating patch clads which structure. The same five crops the hulls
 * wear — a settlement is built from the same steel as its navy, and reusing
 * the proven patches keeps the two bakes reading as one world.
 */
const STRUCT_ART_URL: Record<StructureKind, string> = {
  [StructureKind.Bastion]: cruiserUrl,
  [StructureKind.Refinery]: siegeUrl,
  [StructureKind.Foundry]: corvetteUrl,
  [StructureKind.SentinelTurret]: raiderUrl,
};

/**
 * Sprite resolution. Structures are an order of magnitude larger than hulls,
 * so half the texel density still out-resolves any sane zoom while keeping
 * the Bastion's bake under a megapixel.
 */
const PX_PER_M = 1.5;
/** Canvas padding so rim light and window glow are not clipped. */
const MARGIN_PX = 10;

const artImages = new Map<StructureKind, HTMLImageElement>();
let artLoaded = false;

const baked = new Map<string, Texture>();

/** Decode the plating patches. Failure is non-fatal: scaffolding stays up. */
export async function loadStructureArt(): Promise<void> {
  await Promise.all(
    Object.entries(STRUCT_ART_URL).map(async ([kind, url]) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      artImages.set(Number(kind) as StructureKind, img);
    })
  );
  artLoaded = true;
}

/** Canvas half-extents in world metres, per footprint (before margin). */
function halfExtentsM(kind: StructureKind): { hx: number; hy: number } {
  const r = structureStatsFor(kind).radiusM;
  switch (kind) {
    case StructureKind.Bastion:
      return { hx: r, hy: r };
    case StructureKind.Refinery:
      return { hx: r * 0.85, hy: r * 0.575 };
    case StructureKind.Foundry:
      return { hx: r * 0.9, hy: r * 0.625 };
    case StructureKind.SentinelTurret:
      // The 45° barrel reaches 1.7r; keep the canvas square around it.
      return { hx: r * 1.35, hy: r * 1.35 };
  }
}

/** World-metre size of the baked canvas, so the renderer can scale the sprite. */
export function structureSpriteSizeM(kind: StructureKind): { widthM: number; heightM: number } {
  const { hx, hy } = halfExtentsM(kind);
  return {
    widthM: (2 * hx * PX_PER_M + 2 * MARGIN_PX) / PX_PER_M,
    heightM: (2 * hy * PX_PER_M + 2 * MARGIN_PX) / PX_PER_M,
  };
}

/**
 * The baked texture for a kind + faction, or null while the art is decoding.
 * Bakes lazily and caches: a match only ever touches one faction's four.
 */
export function structureTexture(kind: StructureKind, faction: Faction): Texture | null {
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
export function destroyStructureTextures(): void {
  for (const texture of baked.values()) texture.destroy(true);
  baked.clear();
}

/** A spherical-cap dome profile added onto the base height, clamped to 0..1. */
function addDome(
  height: Float32Array,
  w: number,
  h: number,
  cx: number,
  cy: number,
  radiusPx: number,
  amplitude: number
): void {
  const x0 = Math.max(0, Math.floor(cx - radiusPx));
  const x1 = Math.min(w - 1, Math.ceil(cx + radiusPx));
  const y0 = Math.max(0, Math.floor(cy - radiusPx));
  const y1 = Math.min(h - 1, Math.ceil(cy + radiusPx));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d >= radiusPx) continue;
      const dome = Math.sqrt(1 - (d / radiusPx) ** 2) * amplitude;
      const i = y * w + x;
      height[i] = Math.max(height[i]!, dome);
    }
  }
}

function bake(kind: StructureKind, faction: Faction): Texture {
  const r = structureStatsFor(kind).radiusM * PX_PER_M;
  const { hx, hy } = halfExtentsM(kind);
  const w = Math.ceil(2 * hx * PX_PER_M + 2 * MARGIN_PX);
  const h = Math.ceil(2 * hy * PX_PER_M + 2 * MARGIN_PX);
  const cx = w / 2;
  const cy = h / 2;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  // 1. Footprint mask, exactly the geometry drawStructureSilhouette draws.
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  switch (kind) {
    case StructureKind.Bastion: {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      break;
    }
    case StructureKind.Refinery:
      ctx.rect(cx - r * 0.85, cy - r * 0.575, r * 1.7, r * 1.15);
      break;
    case StructureKind.Foundry:
      ctx.rect(cx - r * 0.9, cy - r * 0.625, r * 1.8, r * 1.25);
      break;
    case StructureKind.SentinelTurret: {
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      // The 45° barrel, as a rotated slab welded onto the mount.
      const angle = Math.PI / 4;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const half = r * 0.16;
      const len = r * 1.7;
      ctx.moveTo(cx - sin * half, cy + cos * half);
      ctx.lineTo(cx + cos * len - sin * half, cy + sin * len + cos * half);
      ctx.lineTo(cx + cos * len + sin * half, cy + sin * len - cos * half);
      ctx.lineTo(cx + sin * half, cy - cos * half);
      break;
    }
  }
  ctx.closePath();
  ctx.fill();
  const maskData = ctx.getImageData(0, 0, w, h);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = maskData.data[i * 4 + 3]!;

  // 2. Albedo: plating stretched over the footprint's bounding box, skipping
  //    the crop's weather-contaminated outer band exactly like the hull bake.
  const art = artImages.get(kind)!;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(
    art,
    0,
    art.naturalHeight * 0.18,
    art.naturalWidth,
    art.naturalHeight * 0.64,
    0,
    0,
    w,
    h
  );
  const albedo = ctx.getImageData(0, 0, w, h).data;
  // Architecture reads calmer than a hull: damp the plating so the lighting
  // and the glow marks carry the drama, and kill the crops' blown-out flares.
  for (let i = 0; i < albedo.length; i += 4) {
    const peak = Math.max(albedo[i]!, albedo[i + 1]!, albedo[i + 2]!);
    const damp = peak > 170 ? 0.45 : 0.72;
    albedo[i] = albedo[i]! * damp;
    albedo[i + 1] = albedo[i + 1]! * damp;
    albedo[i + 2] = albedo[i + 2]! * damp;
  }

  // 3. Heightfield: architecture, not a hull section. Every footprint is a
  //    bevelled slab; kinds add their landmark volume on top.
  const dt = distanceTransform(mask, w, h);
  const bevel = Math.max(3, r * 0.14);
  const height = new Float32Array(w * h);
  const slabTop = 0.45;
  for (let i = 0; i < height.length; i++) {
    if (mask[i] === 0) continue;
    const d = Math.min(dt[i]!, bevel);
    height[i] = (Math.sqrt(d * (2 * bevel - d)) / bevel) * slabTop;
  }

  switch (kind) {
    case StructureKind.Bastion:
      // The pressure dome, and the command core atop it.
      addDome(height, w, h, cx, cy, r * 0.62, 1);
      addDome(height, w, h, cx, cy, r * 0.2, 1);
      break;
    case StructureKind.Refinery:
      // The rank of pressure silos.
      for (const t of [-0.3, 0, 0.3]) {
        addDome(height, w, h, cx + r * 1.7 * t, cy - r * 1.15 * 0.18, r * 0.26, 0.95);
      }
      break;
    case StructureKind.Foundry: {
      // The launch bay is a pit cut into the slab; the hall rim stays high,
      // and the pit's albedo drops to interior shadow so the glow reads.
      const bw = r * 1.8 * 0.28;
      const bh = r * 1.25 * 0.22;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (Math.abs(x - cx) < bw && Math.abs(y - cy) < bh) {
            const i = y * w + x;
            height[i] = Math.min(height[i]!, 0.12);
            albedo[i * 4] = albedo[i * 4]! * 0.35;
            albedo[i * 4 + 1] = albedo[i * 4 + 1]! * 0.35;
            albedo[i * 4 + 2] = albedo[i * 4 + 2]! * 0.35;
          }
        }
      }
      break;
    }
    case StructureKind.SentinelTurret:
      addDome(height, w, h, cx, cy, r * 0.5, 1);
      break;
  }

  lightAndCompose(ctx, w, h, mask, albedo, height, faction, bevel * 2.2);

  drawGlow(ctx, kind, faction, cx, cy, r);

  return Texture.from(canvas);
}

/**
 * Industrial glow marks, baked over the lit architecture — the structure
 * cousins of the hulls' running lights, in the same additive language.
 */
function drawGlow(
  ctx: CanvasRenderingContext2D,
  kind: StructureKind,
  faction: Faction,
  cx: number,
  cy: number,
  r: number
): void {
  const accent = cssColor(FACTION_PALETTE[faction].accent);
  ctx.globalCompositeOperation = 'lighter';

  switch (kind) {
    case StructureKind.Bastion: {
      // The command core burns at the dome's crown; perimeter beacons mark
      // the octagon's cardinal faces.
      glowDot(ctx, cx, cy, r * 0.16, accent, 0.9);
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        glowDot(
          ctx,
          cx + Math.cos(angle) * r * 0.82,
          cy + Math.sin(angle) * r * 0.82,
          r * 0.06,
          accent,
          0.6
        );
      }
      break;
    }
    case StructureKind.Refinery:
      // Silo crown floods, hazard-amber: the loudest building glows loudest.
      for (const t of [-0.3, 0, 0.3]) {
        glowDot(ctx, cx + r * 1.7 * t, cy - r * 1.15 * 0.18, r * 0.1, '#f2b233', 0.85);
      }
      glowDot(ctx, cx, cy + r * 0.32, r * 0.14, accent, 0.5);
      break;
    case StructureKind.Foundry:
      // The bay interior burns with work light.
      glowDot(ctx, cx, cy, r * 0.3, accent, 0.55);
      glowDot(ctx, cx - r * 0.7, cy - r * 0.45, r * 0.07, '#f2b233', 0.6);
      glowDot(ctx, cx + r * 0.7, cy - r * 0.45, r * 0.07, '#f2b233', 0.6);
      break;
    case StructureKind.SentinelTurret: {
      // Muzzle lamp at the barrel tip; targeting eye on the dome.
      const angle = Math.PI / 4;
      glowDot(
        ctx,
        cx + Math.cos(angle) * r * 1.6,
        cy + Math.sin(angle) * r * 1.6,
        r * 0.14,
        '#ff5a48',
        0.85
      );
      glowDot(ctx, cx, cy, r * 0.18, accent, 0.8);
      break;
    }
  }

  ctx.globalCompositeOperation = 'source-over';
}
