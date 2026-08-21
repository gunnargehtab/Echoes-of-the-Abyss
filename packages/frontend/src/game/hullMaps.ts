/**
 * Model-derived hull maps — the geometry half of the sprite bake.
 *
 * These PNGs are rendered offline from the approved 3D models in
 * docs/concept-art/models by `node tools/hull-maps/build.mjs`, which is also
 * where the maps' meaning is defined:
 *   - albedo:   unlit base colour on a transparent ground. Its ALPHA is the
 *               hull mask and its LUMINANCE is the cladding shading; the hue
 *               is discarded — the colour a hull wears is the faction's
 *               business, not the model's (the models are dressed in one
 *               faction's palette; their shape and shading are shared).
 *   - height:   depth from directly above, bright = high. Replaces the
 *               distance-transform guess that stood in before there was any
 *               geometry to ask.
 *   - emissive: where the hull's lights actually are, which is what makes the
 *               glow budget a property of the model rather than of a hardcoded
 *               dot pattern in the renderer.
 *
 * Lookup is two-level: a faction-specific variant model wins when one has
 * been approved for that faction; otherwise the kind's canonical model (the
 * one the hull was first designed in — Pelagia for the shared hulls, the
 * Directorate for the Abyssal Submersible) serves every faction, recoloured
 * by the bake. A unit with no entry at all keeps the procedural fallback in
 * hullTextures.ts. Both gaps are normal states for models not yet approved,
 * not errors.
 */

import { Faction, UnitKind } from '@echoes/shared';

import lightScoutAlbedo from '../assets/hulls/maps/light-scout-albedo.png';
import lightScoutHeight from '../assets/hulls/maps/light-scout-height.png';
import lightScoutEmissive from '../assets/hulls/maps/light-scout-emissive.png';
import corvetteAlbedo from '../assets/hulls/maps/corvette-albedo.png';
import corvetteHeight from '../assets/hulls/maps/corvette-height.png';
import corvetteEmissive from '../assets/hulls/maps/corvette-emissive.png';
import cruiserAlbedo from '../assets/hulls/maps/cruiser-albedo.png';
import cruiserHeight from '../assets/hulls/maps/cruiser-height.png';
import cruiserEmissive from '../assets/hulls/maps/cruiser-emissive.png';
import harvesterAlbedo from '../assets/hulls/maps/harvester-albedo.png';
import harvesterHeight from '../assets/hulls/maps/harvester-height.png';
import harvesterEmissive from '../assets/hulls/maps/harvester-emissive.png';
import abyssalAlbedo from '../assets/hulls/maps/abyssal-submersible-albedo.png';
import abyssalHeight from '../assets/hulls/maps/abyssal-submersible-height.png';
import abyssalEmissive from '../assets/hulls/maps/abyssal-submersible-emissive.png';
import corvetteBathAlbedo from '../assets/hulls/maps/corvette-bathyarch-albedo.png';
import corvetteBathHeight from '../assets/hulls/maps/corvette-bathyarch-height.png';
import corvetteBathEmissive from '../assets/hulls/maps/corvette-bathyarch-emissive.png';
import harvesterBathAlbedo from '../assets/hulls/maps/harvester-bathyarch-albedo.png';
import harvesterBathHeight from '../assets/hulls/maps/harvester-bathyarch-height.png';
import harvesterBathEmissive from '../assets/hulls/maps/harvester-bathyarch-emissive.png';
import cruiserBathAlbedo from '../assets/hulls/maps/cruiser-bathyarch-albedo.png';
import cruiserBathHeight from '../assets/hulls/maps/cruiser-bathyarch-height.png';
import cruiserBathEmissive from '../assets/hulls/maps/cruiser-bathyarch-emissive.png';
import corvetteDirAlbedo from '../assets/hulls/maps/corvette-directorate-albedo.png';
import corvetteDirHeight from '../assets/hulls/maps/corvette-directorate-height.png';
import corvetteDirEmissive from '../assets/hulls/maps/corvette-directorate-emissive.png';
import harvesterDirAlbedo from '../assets/hulls/maps/harvester-directorate-albedo.png';
import harvesterDirHeight from '../assets/hulls/maps/harvester-directorate-height.png';
import harvesterDirEmissive from '../assets/hulls/maps/harvester-directorate-emissive.png';
import cruiserDirAlbedo from '../assets/hulls/maps/cruiser-directorate-albedo.png';
import cruiserDirHeight from '../assets/hulls/maps/cruiser-directorate-height.png';
import cruiserDirEmissive from '../assets/hulls/maps/cruiser-directorate-emissive.png';
import corvetteHadAlbedo from '../assets/hulls/maps/corvette-hadron-albedo.png';
import corvetteHadHeight from '../assets/hulls/maps/corvette-hadron-height.png';
import corvetteHadEmissive from '../assets/hulls/maps/corvette-hadron-emissive.png';
import cruiserHadAlbedo from '../assets/hulls/maps/cruiser-hadron-albedo.png';
import cruiserHadHeight from '../assets/hulls/maps/cruiser-hadron-height.png';
import cruiserHadEmissive from '../assets/hulls/maps/cruiser-hadron-emissive.png';
import harvesterHadAlbedo from '../assets/hulls/maps/harvester-hadron-albedo.png';
import harvesterHadHeight from '../assets/hulls/maps/harvester-hadron-height.png';
import harvesterHadEmissive from '../assets/hulls/maps/harvester-hadron-emissive.png';

/**
 * Pixels per world metre the maps were baked at. The maps carry no metadata,
 * so their pixel dimensions divided by this ARE the hull's metre extents —
 * this constant is the contract with tools/hull-maps/build.mjs and must match
 * the MAP_PPM there.
 */
export const MAP_PPM = 4;

interface MapUrls {
  albedo: string;
  height: string;
  emissive: string;
}

/** Canonical model per kind — serves every faction until a variant lands. */
const KIND_MAP_URL: Partial<Record<UnitKind, MapUrls>> = {
  [UnitKind.LightScout]: {
    albedo: lightScoutAlbedo,
    height: lightScoutHeight,
    emissive: lightScoutEmissive,
  },
  [UnitKind.Corvette]: {
    albedo: corvetteAlbedo,
    height: corvetteHeight,
    emissive: corvetteEmissive,
  },
  [UnitKind.Cruiser]: {
    albedo: cruiserAlbedo,
    height: cruiserHeight,
    emissive: cruiserEmissive,
  },
  [UnitKind.Harvester]: {
    albedo: harvesterAlbedo,
    height: harvesterHeight,
    emissive: harvesterEmissive,
  },
  [UnitKind.AbyssalSubmersible]: {
    albedo: abyssalAlbedo,
    height: abyssalHeight,
    emissive: abyssalEmissive,
  },
};

/**
 * Faction-specific variant models: a hull re-designed in another faction's
 * shape language, not just recoloured. Added per approved model, exactly like
 * KIND_MAP_URL entries; slugs in build.mjs carry the faction suffix
 * (e.g. corvette-bathyarch).
 */
const VARIANT_MAP_URL: Partial<Record<Faction, Partial<Record<UnitKind, MapUrls>>>> = {
  [Faction.Bathyarch]: {
    [UnitKind.Corvette]: {
      albedo: corvetteBathAlbedo,
      height: corvetteBathHeight,
      emissive: corvetteBathEmissive,
    },
    [UnitKind.Harvester]: {
      albedo: harvesterBathAlbedo,
      height: harvesterBathHeight,
      emissive: harvesterBathEmissive,
    },
    [UnitKind.Cruiser]: {
      albedo: cruiserBathAlbedo,
      height: cruiserBathHeight,
      emissive: cruiserBathEmissive,
    },
  },
  [Faction.Directorate]: {
    [UnitKind.Corvette]: {
      albedo: corvetteDirAlbedo,
      height: corvetteDirHeight,
      emissive: corvetteDirEmissive,
    },
    [UnitKind.Harvester]: {
      albedo: harvesterDirAlbedo,
      height: harvesterDirHeight,
      emissive: harvesterDirEmissive,
    },
    [UnitKind.Cruiser]: {
      albedo: cruiserDirAlbedo,
      height: cruiserDirHeight,
      emissive: cruiserDirEmissive,
    },
  },
  [Faction.Hadron]: {
    [UnitKind.Corvette]: {
      albedo: corvetteHadAlbedo,
      height: corvetteHadHeight,
      emissive: corvetteHadEmissive,
    },
    [UnitKind.Cruiser]: {
      albedo: cruiserHadAlbedo,
      height: cruiserHadHeight,
      emissive: cruiserHadEmissive,
    },
    [UnitKind.Harvester]: {
      albedo: harvesterHadAlbedo,
      height: harvesterHadHeight,
      emissive: harvesterHadEmissive,
    },
  },
};

export interface HullMap {
  /** Alpha is the hull mask; RGB is the model's own (faction-specific) livery. */
  albedo: HTMLImageElement;
  height: HTMLImageElement;
  emissive: HTMLImageElement;
  /** Hull extents in pixels — metres × MAP_PPM. */
  widthPx: number;
  heightPx: number;
}

/** Keyed 'kind' for canonical models, 'faction:kind' for variants. */
const maps = new Map<string, HullMap>();

async function decodeInto(key: string, urls: MapUrls): Promise<void> {
  const decode = async (src: string): Promise<HTMLImageElement> => {
    const img = new Image();
    img.src = src;
    await img.decode();
    return img;
  };
  try {
    const [albedo, height, emissive] = await Promise.all([
      decode(urls.albedo),
      decode(urls.height),
      decode(urls.emissive),
    ]);
    maps.set(key, {
      albedo,
      height,
      emissive,
      widthPx: albedo.naturalWidth,
      heightPx: albedo.naturalHeight,
    });
  } catch {
    // Absent map => next fallback level. Not fatal.
  }
}

/**
 * Decode every hull map. A map that fails to decode is simply absent, which
 * drops that lookup to its fallback (variant -> canonical -> procedural)
 * rather than breaking the renderer — the same failure posture as the
 * concept-art plates.
 */
export async function loadHullMaps(): Promise<void> {
  await Promise.all([
    ...Object.entries(KIND_MAP_URL).map(([kind, urls]) => decodeInto(kind, urls)),
    ...Object.entries(VARIANT_MAP_URL).flatMap(([faction, byKind]) =>
      Object.entries(byKind).map(([kind, urls]) => decodeInto(`${faction}:${kind}`, urls))
    ),
  ]);
}

/**
 * The decoded maps for a hull as a faction fields it: the faction's own
 * variant when one is approved, the kind's canonical model otherwise, null
 * when the kind has no model at all.
 */
export function hullMap(kind: UnitKind, faction: Faction): HullMap | null {
  return maps.get(`${faction}:${kind}`) ?? maps.get(`${kind}`) ?? null;
}
