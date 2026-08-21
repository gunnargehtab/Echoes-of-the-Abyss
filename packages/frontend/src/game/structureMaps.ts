/**
 * Model-derived structure maps — the structure counterpart of hullMaps.ts,
 * feeding the shared model bake in bake.ts. Rendered offline from the
 * approved models in docs/concept-art/models by `node tools/hull-maps/
 * build.mjs`; see hullMaps.ts for what each map carries.
 *
 * A structure with no entry here keeps the procedural architecture bake in
 * structureTextures.ts. All four current structures are model-backed; the
 * fallback remains for future structures and for decode failures.
 */

import { StructureKind } from '@echoes/shared';
import type { ModelMaps } from './bake.ts';

import bastionAlbedo from '../assets/structures/maps/bastion-albedo.png';
import bastionHeight from '../assets/structures/maps/bastion-height.png';
import bastionEmissive from '../assets/structures/maps/bastion-emissive.png';
import refineryAlbedo from '../assets/structures/maps/refinery-albedo.png';
import refineryHeight from '../assets/structures/maps/refinery-height.png';
import refineryEmissive from '../assets/structures/maps/refinery-emissive.png';
import foundryAlbedo from '../assets/structures/maps/foundry-albedo.png';
import foundryHeight from '../assets/structures/maps/foundry-height.png';
import foundryEmissive from '../assets/structures/maps/foundry-emissive.png';
import turretAlbedo from '../assets/structures/maps/sentinel-turret-albedo.png';
import turretHeight from '../assets/structures/maps/sentinel-turret-height.png';
import turretEmissive from '../assets/structures/maps/sentinel-turret-emissive.png';

/**
 * Pixels per world metre the structure maps were baked at — the contract with
 * STRUCT_PPM in tools/hull-maps/build.mjs. Lower than the units' 4 px/m:
 * structures are an order of magnitude larger, and this keeps the Bastion's
 * maps in the same memory class as its procedural bake.
 */
export const STRUCT_MAP_PPM = 1.5;

const MAP_URL: Partial<
  Record<StructureKind, { albedo: string; height: string; emissive: string }>
> = {
  [StructureKind.Bastion]: {
    albedo: bastionAlbedo,
    height: bastionHeight,
    emissive: bastionEmissive,
  },
  [StructureKind.Refinery]: {
    albedo: refineryAlbedo,
    height: refineryHeight,
    emissive: refineryEmissive,
  },
  [StructureKind.Foundry]: {
    albedo: foundryAlbedo,
    height: foundryHeight,
    emissive: foundryEmissive,
  },
  [StructureKind.SentinelTurret]: {
    albedo: turretAlbedo,
    height: turretHeight,
    emissive: turretEmissive,
  },
};

const maps = new Map<StructureKind, ModelMaps>();

/** Decode the structure maps; a failed decode drops that structure to the
 * procedural bake rather than breaking the renderer. */
export async function loadStructureMaps(): Promise<void> {
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
        maps.set(Number(kind) as StructureKind, {
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

/** The decoded maps for a structure, or null when it has none (or none yet). */
export function structureMap(kind: StructureKind): ModelMaps | null {
  return maps.get(kind) ?? null;
}
