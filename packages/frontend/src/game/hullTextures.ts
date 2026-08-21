/**
 * Baked 3D hull sprites for the player's OWN units — the "detailed sprite art"
 * rendering target from docs/art-direction.md.
 *
 * There are two bakes here, and which one a hull gets depends on whether an
 * approved 3D model exists for it (see hullMaps.ts):
 *
 *   MODEL-BACKED — the mask, the heightfield and the light placement are
 *   rendered offline from the model in docs/concept-art/models. Real geometry:
 *   fins, growth ridges and sensor frills stand off the hull because they
 *   actually do, and a hull's lights sit where its design puts them.
 *
 *   PROCEDURAL — the original stand-in for hulls with no model yet. The unit's
 *   HULL_OUTLINE is rasterised to a mask and a distance transform *guesses* a
 *   rounded cylindrical cross-section from it.
 *
 * Both then light the heightfield through the same model (bake.ts), so the two
 * paths cannot drift into different-looking navies. They differ in where the
 * cladding underneath comes from: the procedural bake stretches a crop of
 * docs/concept-art/plate-05-submarine-classes.png over the hull, while a
 * model-backed bake takes the *luminance* of the model's own albedo — this
 * hull's panel, ridge and frill shading — and recolours it in the faction's
 * primary. The models are dressed in one faction's palette, so their hue is
 * not shareable; their shape and shading are.
 *
 * A model-backed sprite no longer shares its exact outline with the flat
 * silhouette and the enemy track, which keep HULL_OUTLINE. That is the correct
 * asymmetry rather than a drift: a track is a sonar return the player earned,
 * and it was never meant to carry the fins.
 *
 * The Asymmetric Fidelity Law is enforced by who calls this: only the own-force
 * draw path ever requests a baked sprite. Enemy tracks stay on silhouettes.ts.
 */

import { Texture } from 'pixi.js';
import { Faction, UnitKind } from '@echoes/shared';
import { FACTION_PALETTE } from './palette.ts';
import { HULL_LENGTH_M, HULL_OUTLINE } from './silhouettes.ts';
import { channel, cssColor, distanceTransform, glowDot, lightAndCompose } from './bake.ts';
import { hullMap, loadHullMaps, MAP_PPM, type HullMap } from './hullMaps.ts';

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
  await Promise.all([
    ...Object.entries(HULL_ART_URL).map(async ([kind, url]) => {
      const img = new Image();
      img.src = url;
      await img.decode();
      // Object.entries stringifies the numeric enum key; restore it.
      artImages.set(Number(kind) as UnitKind, img);
    }),
    // Model maps decode alongside the plates; a hull whose maps fail simply
    // bakes procedurally, so this never blocks the art from loading.
    loadHullMaps(),
  ]);
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
  // A model-backed hull is as wide as its model, not as its outline: the maps
  // include fins and tendrils the schematic outline never had, and clipping
  // them to the outline's beam would squash the sprite.
  const map = hullMap(kind);
  if (map !== null) {
    return {
      widthM: (map.widthPx + 2 * MARGIN_PX) / MAP_PPM,
      heightM: (map.heightPx + 2 * MARGIN_PX) / MAP_PPM,
    };
  }
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

function bake(kind: UnitKind, faction: Faction): Texture {
  const map = hullMap(kind);
  if (map !== null) return bakeFromModel(faction, map);
  return bakeProcedural(kind, faction);
}

/**
 * Bake a hull whose geometry is known: mask and relief come from the model's
 * maps, so the lighting pass is describing the hull that was designed rather
 * than a cylinder inferred from an outline.
 */
function bakeFromModel(faction: Faction, map: HullMap): Texture {
  const mw = map.widthPx;
  const mh = map.heightPx;
  const w = mw + 2 * MARGIN_PX;
  const h = mh + 2 * MARGIN_PX;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  // 1. Mask and cladding, both from the model's albedo pass: alpha is the
  //    silhouette, and the colour is reduced to luminance before being
  //    recoloured in the faction's primary below. The models are dressed in
  //    one faction's palette, so their hue is not shareable — but their
  //    *value* is the panel, ridge and frill shading of this specific hull,
  //    which is exactly the detail the stretched plate crop never had.
  ctx.drawImage(map.albedo, MARGIN_PX, MARGIN_PX);
  const modelAlbedo = ctx.getImageData(0, 0, w, h).data;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) mask[i] = modelAlbedo[i * 4 + 3]!;

  // 2. Heightfield: depth from above, renormalised across the hull's own
  //    range. The map stores absolute camera depth, but the lighting model
  //    wants 0 at the silhouette edge and 1 along the spine, and only the
  //    masked pixels say where those actually fall.
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(map.height, MARGIN_PX, MARGIN_PX);
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

  // 3. Cladding: the model's shading in the faction's colours. Luminance is
  //    lifted off the floor first — a Pelagia hull is deep chlorophyll, near
  //    black, and multiplying that raw would bury the livery the faction is
  //    supposed to be recognised by at RTS zoom.
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
    // Kept deliberately low: bake.ts lifts the albedo by ×1.5 before lighting
    // it, so a mid-grey base here clips to white the moment specular lands.
    const v = 0.22 + 0.3 * luma;
    albedo[j] = v * primaryR;
    albedo[j + 1] = v * primaryG;
    albedo[j + 2] = v * primaryB;
    albedo[j + 3] = 255;
  }

  // Half the beam is the same relief scale the procedural bake uses, so both
  // paths curve by the same amount relative to the hull's size.
  lightAndCompose(ctx, w, h, mask, albedo, height, faction, mh / 2);

  drawModelLights(ctx, map, faction);
  drawBowLight(ctx, w / 2 + 0.44 * mw, h / 2);

  return Texture.from(canvas);
}

/**
 * The model's lights, recoloured to the faction glow colour and bloomed.
 *
 * Placement is the model's — a Cruiser's lit vein lattice and a Light Scout's
 * five navigation marks encode their SIG bands (docs/style-neon-noir.md, glow
 * encodes loudness), and that budget should come from the design rather than
 * from a dot pattern hardcoded per faction here.
 */
function drawModelLights(ctx: CanvasRenderingContext2D, map: HullMap, faction: Faction): void {
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
  ctx.drawImage(lights, MARGIN_PX, MARGIN_PX);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.drawImage(lights, MARGIN_PX, MARGIN_PX);
  ctx.globalCompositeOperation = 'source-over';
}

/** The bow running light every navy carries: heading, readable at a glance. */
function drawBowLight(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.globalCompositeOperation = 'lighter';
  glowDot(ctx, x, y, 7, '#ff5a48', 0.9);
  ctx.globalCompositeOperation = 'source-over';
}

function bakeProcedural(kind: UnitKind, faction: Faction): Texture {
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

  lightAndCompose(ctx, w, h, mask, albedo, height, faction, r);

  drawAccents(ctx, kind, faction, cx, cy, lengthPx);

  return Texture.from(canvas);
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
  // Glow, not accent: these marks are lights (rivet lamps, biolight, the
  // blade line's shine), and Bathyarch's accent grey is plating, not lamplight.
  const accent = cssColor(FACTION_PALETTE[faction].glow);
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
