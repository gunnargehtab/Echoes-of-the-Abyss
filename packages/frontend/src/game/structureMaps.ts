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
import bastionDirAlbedo from '../assets/structures/maps/bastion-directorate-albedo.png';
import bastionDirHeight from '../assets/structures/maps/bastion-directorate-height.png';
import bastionDirEmissive from '../assets/structures/maps/bastion-directorate-emissive.png';
import refineryDirAlbedo from '../assets/structures/maps/refinery-directorate-albedo.png';
import refineryDirHeight from '../assets/structures/maps/refinery-directorate-height.png';
import refineryDirEmissive from '../assets/structures/maps/refinery-directorate-emissive.png';
import foundryDirAlbedo from '../assets/structures/maps/foundry-directorate-albedo.png';
import foundryDirHeight from '../assets/structures/maps/foundry-directorate-height.png';
import foundryDirEmissive from '../assets/structures/maps/foundry-directorate-emissive.png';
import turretDirAlbedo from '../assets/structures/maps/sentinel-turret-directorate-albedo.png';
import turretDirHeight from '../assets/structures/maps/sentinel-turret-directorate-height.png';
import turretDirEmissive from '../assets/structures/maps/sentinel-turret-directorate-emissive.png';
import bastionHadAlbedo from '../assets/structures/maps/bastion-hadron-albedo.png';
import bastionHadHeight from '../assets/structures/maps/bastion-hadron-height.png';
import bastionHadEmissive from '../assets/structures/maps/bastion-hadron-emissive.png';
import refineryHadAlbedo from '../assets/structures/maps/refinery-hadron-albedo.png';
import refineryHadHeight from '../assets/structures/maps/refinery-hadron-height.png';
import refineryHadEmissive from '../assets/structures/maps/refinery-hadron-emissive.png';
import foundryHadAlbedo from '../assets/structures/maps/foundry-hadron-albedo.png';
import foundryHadHeight from '../assets/structures/maps/foundry-hadron-height.png';
import foundryHadEmissive from '../assets/structures/maps/foundry-hadron-emissive.png';
import turretHadAlbedo from '../assets/structures/maps/sentinel-turret-hadron-albedo.png';
import turretHadHeight from '../assets/structures/maps/sentinel-turret-hadron-height.png';
import turretHadEmissive from '../assets/structures/maps/sentinel-turret-hadron-emissive.png';
import bargeAlbedo from '../assets/structures/maps/baffle-barge-albedo.png';
import bargeHeight from '../assets/structures/maps/baffle-barge-height.png';
import bargeEmissive from '../assets/structures/maps/baffle-barge-emissive.png';
import cantorAlbedo from '../assets/structures/maps/cantor-albedo.png';
import cantorHeight from '../assets/structures/maps/cantor-height.png';
import cantorEmissive from '../assets/structures/maps/cantor-emissive.png';
import spireAlbedo from '../assets/structures/maps/sounding-spire-albedo.png';
import spireHeight from '../assets/structures/maps/sounding-spire-height.png';
import spireEmissive from '../assets/structures/maps/sounding-spire-emissive.png';
import veilAlbedo from '../assets/structures/maps/spore-veil-albedo.png';
import veilHeight from '../assets/structures/maps/spore-veil-height.png';
import veilEmissive from '../assets/structures/maps/spore-veil-emissive.png';
import slipwayAlbedo from '../assets/structures/maps/slipway-albedo.png';
import slipwayHeight from '../assets/structures/maps/slipway-height.png';
import slipwayEmissive from '../assets/structures/maps/slipway-emissive.png';
import slipwayPelAlbedo from '../assets/structures/maps/slipway-pelagia-albedo.png';
import slipwayPelHeight from '../assets/structures/maps/slipway-pelagia-height.png';
import slipwayPelEmissive from '../assets/structures/maps/slipway-pelagia-emissive.png';
import slipwayDirAlbedo from '../assets/structures/maps/slipway-directorate-albedo.png';
import slipwayDirHeight from '../assets/structures/maps/slipway-directorate-height.png';
import slipwayDirEmissive from '../assets/structures/maps/slipway-directorate-emissive.png';
import slipwayHadAlbedo from '../assets/structures/maps/slipway-hadron-albedo.png';
import slipwayHadHeight from '../assets/structures/maps/slipway-hadron-height.png';
import slipwayHadEmissive from '../assets/structures/maps/slipway-hadron-emissive.png';

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
  // Faction signature structures are canonical, not variants: only one navy
  // ever builds each, so the kind-level entry IS the native model.
  [StructureKind.BaffleBarge]: {
    albedo: bargeAlbedo,
    height: bargeHeight,
    emissive: bargeEmissive,
  },
  [StructureKind.Cantor]: {
    albedo: cantorAlbedo,
    height: cantorHeight,
    emissive: cantorEmissive,
  },
  [StructureKind.SoundingSpire]: {
    albedo: spireAlbedo,
    height: spireHeight,
    emissive: spireEmissive,
  },
  [StructureKind.SporeVeil]: {
    albedo: veilAlbedo,
    height: veilHeight,
    emissive: veilEmissive,
  },
  // The Slipway (#466): every navy's, like the Foundry, so the Bathyarch
  // model is canonical and the other three navies carry variants below.
  [StructureKind.Slipway]: {
    albedo: slipwayAlbedo,
    height: slipwayHeight,
    emissive: slipwayEmissive,
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
    [StructureKind.Slipway]: {
      albedo: slipwayPelAlbedo,
      height: slipwayPelHeight,
      emissive: slipwayPelEmissive,
    },
  },
  [Faction.Directorate]: {
    [StructureKind.Bastion]: {
      albedo: bastionDirAlbedo,
      height: bastionDirHeight,
      emissive: bastionDirEmissive,
    },
    [StructureKind.Refinery]: {
      albedo: refineryDirAlbedo,
      height: refineryDirHeight,
      emissive: refineryDirEmissive,
    },
    [StructureKind.Foundry]: {
      albedo: foundryDirAlbedo,
      height: foundryDirHeight,
      emissive: foundryDirEmissive,
    },
    [StructureKind.SentinelTurret]: {
      albedo: turretDirAlbedo,
      height: turretDirHeight,
      emissive: turretDirEmissive,
    },
    [StructureKind.Slipway]: {
      albedo: slipwayDirAlbedo,
      height: slipwayDirHeight,
      emissive: slipwayDirEmissive,
    },
  },
  [Faction.Hadron]: {
    [StructureKind.Bastion]: {
      albedo: bastionHadAlbedo,
      height: bastionHadHeight,
      emissive: bastionHadEmissive,
    },
    [StructureKind.Refinery]: {
      albedo: refineryHadAlbedo,
      height: refineryHadHeight,
      emissive: refineryHadEmissive,
    },
    [StructureKind.Foundry]: {
      albedo: foundryHadAlbedo,
      height: foundryHadHeight,
      emissive: foundryHadEmissive,
    },
    [StructureKind.SentinelTurret]: {
      albedo: turretHadAlbedo,
      height: turretHadHeight,
      emissive: turretHadEmissive,
    },
    [StructureKind.Slipway]: {
      albedo: slipwayHadAlbedo,
      height: slipwayHadHeight,
      emissive: slipwayHadEmissive,
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
