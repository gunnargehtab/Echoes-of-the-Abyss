/**
 * Model-derived structure maps — the structure counterpart of hullMaps.ts,
 * feeding the shared model bake in bake.ts. Rendered offline from the
 * approved models in docs/concept-art/models by `node tools/hull-maps/
 * build.mjs`; see hullMaps.ts for what each map carries.
 *
 * A structure with no entry here keeps the procedural architecture bake in
 * structureTextures.ts. All four current structures are model-backed; the
 * fallback remains for future structures and for decode failures.
 *
 * Lookup mirrors hullMaps.ts exactly: faction variant -> canonical model ->
 * procedural. The canonical models are Bathyarch-styled (they were built
 * first), so until a navy's variant lands its settlements are Consortium
 * architecture recoloured — which is the fallback working, not the goal.
 */

import { Faction, StructureKind } from '@echoes/shared';
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
import bastionPelAlbedo from '../assets/structures/maps/bastion-pelagia-albedo.png';
import bastionPelHeight from '../assets/structures/maps/bastion-pelagia-height.png';
import bastionPelEmissive from '../assets/structures/maps/bastion-pelagia-emissive.png';
import refineryPelAlbedo from '../assets/structures/maps/refinery-pelagia-albedo.png';
import refineryPelHeight from '../assets/structures/maps/refinery-pelagia-height.png';
import refineryPelEmissive from '../assets/structures/maps/refinery-pelagia-emissive.png';
import foundryPelAlbedo from '../assets/structures/maps/foundry-pelagia-albedo.png';
import foundryPelHeight from '../assets/structures/maps/foundry-pelagia-height.png';
import foundryPelEmissive from '../assets/structures/maps/foundry-pelagia-emissive.png';
import turretPelAlbedo from '../assets/structures/maps/sentinel-turret-pelagia-albedo.png';
import turretPelHeight from '../assets/structures/maps/sentinel-turret-pelagia-height.png';
import turretPelEmissive from '../assets/structures/maps/sentinel-turret-pelagia-emissive.png';

/**
 * Pixels per world metre the structure maps were baked at — the contract with
 * STRUCT_PPM in tools/hull-maps/build.mjs. Lower than the units' 4 px/m:
 * structures are an order of magnitude larger, and this keeps the Bastion's
 * maps in the same memory class as its procedural bake.
 */
export const STRUCT_MAP_PPM = 1.5;

interface MapUrls {
  albedo: string;
  height: string;
  emissive: string;
}

/** Canonical model per kind — serves every faction until a variant lands. */
const MAP_URL: Partial<Record<StructureKind, MapUrls>> = {
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

/**
 * Faction-specific variant models: a settlement re-designed in another
 * navy's architecture, not just recoloured. Added per approved model,
 * exactly like the unit variants in hullMaps.ts; slugs in build.mjs carry
 * the faction suffix (e.g. bastion-pelagia). Bathyarch needs no entries —
 * the canonical models are already its architecture.
 */
const VARIANT_MAP_URL: Partial<Record<Faction, Partial<Record<StructureKind, MapUrls>>>> = {
  [Faction.Pelagia]: {
    [StructureKind.Bastion]: {
      albedo: bastionPelAlbedo,
      height: bastionPelHeight,
      emissive: bastionPelEmissive,
    },
    [StructureKind.Refinery]: {
      albedo: refineryPelAlbedo,
      height: refineryPelHeight,
      emissive: refineryPelEmissive,
    },
    [StructureKind.Foundry]: {
      albedo: foundryPelAlbedo,
      height: foundryPelHeight,
      emissive: foundryPelEmissive,
    },
    [StructureKind.SentinelTurret]: {
      albedo: turretPelAlbedo,
      height: turretPelHeight,
      emissive: turretPelEmissive,
    },
  },
};

/** Keyed 'kind' for canonical models, 'faction:kind' for variants. */
const maps = new Map<string, ModelMaps>();

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

/** Decode every structure map; a failed decode drops that lookup down the
 * variant -> canonical -> procedural chain rather than breaking the renderer. */
export async function loadStructureMaps(): Promise<void> {
  const jobs: Promise<void>[] = [];
  for (const [kind, urls] of Object.entries(MAP_URL)) {
    jobs.push(decodeInto(kind, urls));
  }
  for (const [faction, byKind] of Object.entries(VARIANT_MAP_URL)) {
    for (const [kind, urls] of Object.entries(byKind)) {
      jobs.push(decodeInto(`${faction}:${kind}`, urls));
    }
  }
  await Promise.all(jobs);
}

/** The decoded maps for a structure as this faction builds it, or null when
 * it has none (or none yet). */
export function structureMap(kind: StructureKind, faction: Faction): ModelMaps | null {
  return maps.get(`${faction}:${kind}`) ?? maps.get(String(kind)) ?? null;
}
