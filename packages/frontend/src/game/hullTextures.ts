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
import { Faction, unitAvailableTo, UnitKind } from '@echoes/shared';
import { ACTIVE_PALETTE, FACTION_PALETTE } from './palette.ts';
import { HULL_LENGTH_M, HULL_OUTLINE } from './silhouettes.ts';
import { bakeModelSprite, cssColor, distanceTransform, glowDot, lightAndCompose } from './bake.ts';
import { hullMap, loadHullMap, MAP_PPM, type HullMap } from './hullMaps.ts';

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
  // The Directorate's plate class, same as the Submersible; the outline is
  // what tells the two apart.
  [UnitKind.Chorister]: shadowUrl,
  // The heavy plate class on a 90 m hull: the Clarion is a premium strike
  // hull and should read as one beside a Corvette. Same plate as the Cruiser,
  // and the outline is again what tells the two apart.
  [UnitKind.Clarion]: cruiserUrl,
  [UnitKind.Harvester]: siegeUrl,
  // The rung's roster (#461), on the plate class each hull's tonnage puts it
  // in until a model passes intake. The outline is what tells each apart.
  [UnitKind.Tender]: siegeUrl,
  [UnitKind.Bulwark]: cruiserUrl,
  [UnitKind.Spinner]: raiderUrl,
  [UnitKind.Sower]: shadowUrl,
  [UnitKind.Precentor]: shadowUrl,
  [UnitKind.Dredge]: cruiserUrl,
  [UnitKind.Cantus]: corvetteUrl,
  [UnitKind.Reciter]: cruiserUrl,
  // The transports (#501), on the class their tonnage and their navy put
  // them in until a model passes intake: the Consortium's and the
  // Directorate's are working hulls, the Drifter is a raider's shell, the
  // Antiphon is the Order's.
  [UnitKind.Freighter]: siegeUrl,
  [UnitKind.Drifter]: raiderUrl,
  [UnitKind.Verger]: siegeUrl,
  [UnitKind.Antiphon]: cruiserUrl,
  // The scouts (#506), on the class each hull's tonnage and navy put it in
  // until a model passes intake: the Beacon is a Consortium working hull with
  // a set on it, the Glider a raider's shell, the Acolyte the Directorate's,
  // the Herald a small Order blade — the Cantus's class, not the Clarion's.
  [UnitKind.Beacon]: siegeUrl,
  [UnitKind.Glider]: raiderUrl,
  [UnitKind.Acolyte]: shadowUrl,
  [UnitKind.Herald]: corvetteUrl,
  // The ordnance hulls (#507), on the class each hull's tonnage and navy put
  // it in until a model passes intake: the Broadside is a Consortium warship
  // on the Bulwark's plate, the Weaver a raider's shell, the Thurible the
  // Directorate's, the Lance a premium Order strike hull — the Clarion's
  // class, not the Herald's.
  [UnitKind.Broadside]: cruiserUrl,
  [UnitKind.Weaver]: raiderUrl,
  [UnitKind.Thurible]: shadowUrl,
  [UnitKind.Lance]: cruiserUrl,
};

/** Sprite resolution. 3 px per world metre keeps even the scout's hull crisp. */
const PX_PER_M = 3;
/** Canvas padding so rim light and running-light glow are not clipped. */
const MARGIN_PX = 10;

const artImages = new Map<UnitKind, HTMLImageElement>();
/** One decode per plate: five patches clad twenty-seven hulls. */
const plateDecodes = new Map<string, Promise<HTMLImageElement>>();
/** Hulls whose plate and maps are both decoded, keyed `kind:faction`. */
const artReady = new Set<string>();
/** One job per hull and faction, shared by everything that asks. */
const artLoads = new Map<string, Promise<void>>();

/**
 * Two caches over one bake: the canvas is the artwork, the Texture is Pixi's
 * handle on it. The perspective viewport (PerspectiveView.ts) consumes the
 * canvas directly — same bake, same pixels, different renderer — which is what
 * keeps the chart and the 3D view from drifting into different-looking navies.
 */
const bakedCanvas = new Map<string, HTMLCanvasElement>();
const baked = new Map<string, Texture>();

function decodePlate(url: string): Promise<HTMLImageElement> {
  let job = plateDecodes.get(url);
  if (job === undefined) {
    job = (async () => {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    })();
    plateDecodes.set(url, job);
  }
  return job;
}

/**
 * Decode what one hull needs as one faction fields it: its plate-05 patch and
 * the maps of whichever model serves it. Per hull rather than all at once
 * (#442): the whole hull and structure library is some 130 maps and 2.4 MB,
 * and a match draws one navy's share of it. The first draw that asks for a
 * sprite starts its load — `hullSpriteCanvas` does that — and `primeHullArt`
 * starts the whole navy's the moment the seat is known, so the hulls are
 * baked before the first one surfaces.
 *
 * Failure is non-fatal and final: the hull draws as its vector silhouette,
 * and nothing retries a plate the network has already refused.
 */
export function loadHullArt(kind: UnitKind, faction: Faction): Promise<void> {
  const key = `${kind}:${faction}`;
  let job = artLoads.get(key);
  if (job === undefined) {
    job = (async () => {
      // Model maps decode alongside the plate; a hull whose maps fail simply
      // bakes procedurally, so this never blocks the art from loading.
      const [img] = await Promise.all([
        decodePlate(HULL_ART_URL[kind]),
        loadHullMap(kind, faction),
      ]);
      artImages.set(kind, img);
      artReady.add(key);
    })();
    artLoads.set(key, job);
  }
  return job;
}

/**
 * Start decoding every hull this faction can field. Called when the seat is
 * assigned, so a navy's sprites are ready by the time its first hull is in
 * the water rather than popping in from vectors a few frames after it.
 */
export function primeHullArt(faction: Faction): void {
  for (const kind of Object.keys(HULL_ART_URL)) {
    // Object.keys stringifies the numeric enum key; restore it.
    const unit = Number(kind) as UnitKind;
    if (unitAvailableTo(unit, faction)) loadHullArt(unit, faction).catch(() => {});
  }
}

/** Half-beam of a hull outline, as a fraction of hull length. */
function halfBeamFraction(kind: UnitKind): number {
  let max = 0;
  for (const [, py] of HULL_OUTLINE[kind]) max = Math.max(max, Math.abs(py!));
  return max;
}

/**
 * World-metre size of the baked canvas, so the renderer can scale the sprite.
 * Faction matters: a faction's variant model can have different proportions
 * than the kind's canonical one.
 */
export function hullSpriteSizeM(
  kind: UnitKind,
  faction: Faction
): { widthM: number; heightM: number } {
  // A model-backed hull is as wide as its model, not as its outline: the maps
  // include fins and tendrils the schematic outline never had, and clipping
  // them to the outline's beam would squash the sprite.
  const map = hullMap(kind, faction);
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
 * Bakes lazily and caches: a match only ever touches one faction's hulls.
 */
export function hullTexture(kind: UnitKind, faction: Faction): Texture | null {
  const canvas = hullSpriteCanvas(kind, faction);
  if (canvas === null) return null;
  const key = `${kind}:${faction}:${ACTIVE_PALETTE.name}`;
  let texture = baked.get(key);
  if (texture === undefined) {
    texture = Texture.from(canvas);
    baked.set(key, texture);
  }
  return texture;
}

/**
 * The baked artwork itself, for renderers that are not Pixi. Same cache
 * discipline as the texture: lazy, and keyed by palette because a
 * colour-vision palette recolours the faction's primary (docs/ui-ux.md §11) —
 * a cache that ignored it would keep serving the sprite baked in the ink the
 * player just switched away from. Four palettes x one faction x five hulls is
 * still a handful.
 */
export function hullSpriteCanvas(kind: UnitKind, faction: Faction): HTMLCanvasElement | null {
  if (!artReady.has(`${kind}:${faction}`)) {
    // The first ask starts the decode; every ask until it lands draws vectors.
    loadHullArt(kind, faction).catch(() => {});
    return null;
  }
  const key = `${kind}:${faction}:${ACTIVE_PALETTE.name}`;
  let canvas = bakedCanvas.get(key);
  if (canvas === undefined) {
    canvas = bake(kind, faction);
    bakedCanvas.set(key, canvas);
  }
  return canvas;
}

/** Free the baked textures; safe to call once at renderer teardown. */
export function destroyHullTextures(): void {
  for (const texture of baked.values()) texture.destroy(true);
  baked.clear();
  bakedCanvas.clear();
}

function bake(kind: UnitKind, faction: Faction): HTMLCanvasElement {
  const map = hullMap(kind, faction);
  if (map !== null) return bakeFromModel(faction, map);
  return bakeProcedural(kind, faction);
}

/**
 * Bake a hull whose geometry is known. The shared model path (bake.ts) does
 * the work; the one hull-specific mark is the red bow light, which structures
 * do not carry — a building has no heading.
 */
function bakeFromModel(faction: Faction, map: HullMap): HTMLCanvasElement {
  const canvas = bakeModelSprite(faction, map, MARGIN_PX);
  const ctx = canvas.getContext('2d')!;
  drawBowLight(ctx, canvas.width / 2 + 0.44 * map.widthPx, canvas.height / 2);
  return canvas;
}

/** The bow running light every navy carries: heading, readable at a glance. */
function drawBowLight(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.globalCompositeOperation = 'lighter';
  glowDot(ctx, x, y, 7, '#ff5a48', 0.9);
  ctx.globalCompositeOperation = 'source-over';
}

function bakeProcedural(kind: UnitKind, faction: Faction): HTMLCanvasElement {
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

  return canvas;
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
