/**
 * Model-derived hull maps — the geometry half of the sprite bake.
 *
 * These PNGs are rendered offline from the approved 3D models in
 * docs/concept-art/models by `node tools/hull-maps/build.mjs`, which is also
 * where the maps' meaning is defined:
 *   - albedo:   unlit base colour on a transparent ground. Only its ALPHA is
 *               used here, as the hull mask — the colour a hull wears is the
 *               faction's business, not the model's (the models are dressed in
 *               one faction's palette; their shape is shared).
 *   - height:   depth from directly above, bright = high. Replaces the
 *               distance-transform guess that stood in before there was any
 *               geometry to ask.
 *   - emissive: where the hull's lights actually are, which is what makes the
 *               glow budget a property of the model rather than of a hardcoded
 *               dot pattern in the renderer.
 *
 * A unit with no entry here keeps the procedural fallback in hullTextures.ts.
 * That is the normal state for a hull whose model has not been approved yet,
 * not an error.
 */

import { UnitKind } from '@echoes/shared';

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

const MAP_URL: Partial<Record<UnitKind, MapUrls>> = {
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

const maps = new Map<UnitKind, HullMap>();

/**
 * Decode every hull map. A map that fails to decode is simply absent, which
 * drops that hull to the procedural bake rather than breaking the renderer —
 * the same failure posture as the concept-art plates.
 */
export async function loadHullMaps(): Promise<void> {
  await Promise.all(
    Object.entries(MAP_URL).map(async ([kind, urls]) => {
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
        maps.set(Number(kind) as UnitKind, {
          albedo,
          height,
          emissive,
          widthPx: albedo.naturalWidth,
          heightPx: albedo.naturalHeight,
        });
      } catch {
        // Absent map => procedural fallback. Not fatal.
      }
    })
  );
}

/** The decoded maps for a hull, or null when it has none (or none yet). */
export function hullMap(kind: UnitKind): HullMap | null {
  return maps.get(kind) ?? null;
}
