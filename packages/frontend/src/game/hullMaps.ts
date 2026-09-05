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
import lightScoutBathAlbedo from '../assets/hulls/maps/light-scout-bathyarch-albedo.png';
import lightScoutBathHeight from '../assets/hulls/maps/light-scout-bathyarch-height.png';
import lightScoutBathEmissive from '../assets/hulls/maps/light-scout-bathyarch-emissive.png';
import corvetteBathAlbedo from '../assets/hulls/maps/corvette-bathyarch-albedo.png';
import corvetteBathHeight from '../assets/hulls/maps/corvette-bathyarch-height.png';
import corvetteBathEmissive from '../assets/hulls/maps/corvette-bathyarch-emissive.png';
import harvesterBathAlbedo from '../assets/hulls/maps/harvester-bathyarch-albedo.png';
import harvesterBathHeight from '../assets/hulls/maps/harvester-bathyarch-height.png';
import harvesterBathEmissive from '../assets/hulls/maps/harvester-bathyarch-emissive.png';
import cruiserBathAlbedo from '../assets/hulls/maps/cruiser-bathyarch-albedo.png';
import cruiserBathHeight from '../assets/hulls/maps/cruiser-bathyarch-height.png';
import cruiserBathEmissive from '../assets/hulls/maps/cruiser-bathyarch-emissive.png';
import lightScoutDirAlbedo from '../assets/hulls/maps/light-scout-directorate-albedo.png';
import lightScoutDirHeight from '../assets/hulls/maps/light-scout-directorate-height.png';
import lightScoutDirEmissive from '../assets/hulls/maps/light-scout-directorate-emissive.png';
import abyssalPelAlbedo from '../assets/hulls/maps/abyssal-submersible-pelagia-albedo.png';
import abyssalPelHeight from '../assets/hulls/maps/abyssal-submersible-pelagia-height.png';
import abyssalPelEmissive from '../assets/hulls/maps/abyssal-submersible-pelagia-emissive.png';
import abyssalBathAlbedo from '../assets/hulls/maps/abyssal-submersible-bathyarch-albedo.png';
import abyssalBathHeight from '../assets/hulls/maps/abyssal-submersible-bathyarch-height.png';
import abyssalBathEmissive from '../assets/hulls/maps/abyssal-submersible-bathyarch-emissive.png';
import corvetteDirAlbedo from '../assets/hulls/maps/corvette-directorate-albedo.png';
import corvetteDirHeight from '../assets/hulls/maps/corvette-directorate-height.png';
import corvetteDirEmissive from '../assets/hulls/maps/corvette-directorate-emissive.png';
import harvesterDirAlbedo from '../assets/hulls/maps/harvester-directorate-albedo.png';
import harvesterDirHeight from '../assets/hulls/maps/harvester-directorate-height.png';
import harvesterDirEmissive from '../assets/hulls/maps/harvester-directorate-emissive.png';
import cruiserDirAlbedo from '../assets/hulls/maps/cruiser-directorate-albedo.png';
import cruiserDirHeight from '../assets/hulls/maps/cruiser-directorate-height.png';
import cruiserDirEmissive from '../assets/hulls/maps/cruiser-directorate-emissive.png';
import lightScoutHadAlbedo from '../assets/hulls/maps/light-scout-hadron-albedo.png';
import lightScoutHadHeight from '../assets/hulls/maps/light-scout-hadron-height.png';
import lightScoutHadEmissive from '../assets/hulls/maps/light-scout-hadron-emissive.png';
import corvetteHadAlbedo from '../assets/hulls/maps/corvette-hadron-albedo.png';
import corvetteHadHeight from '../assets/hulls/maps/corvette-hadron-height.png';
import corvetteHadEmissive from '../assets/hulls/maps/corvette-hadron-emissive.png';
import cruiserHadAlbedo from '../assets/hulls/maps/cruiser-hadron-albedo.png';
import cruiserHadHeight from '../assets/hulls/maps/cruiser-hadron-height.png';
import cruiserHadEmissive from '../assets/hulls/maps/cruiser-hadron-emissive.png';
import harvesterHadAlbedo from '../assets/hulls/maps/harvester-hadron-albedo.png';
import harvesterHadHeight from '../assets/hulls/maps/harvester-hadron-height.png';
import harvesterHadEmissive from '../assets/hulls/maps/harvester-hadron-emissive.png';
import abyssalHadAlbedo from '../assets/hulls/maps/abyssal-submersible-hadron-albedo.png';
import abyssalHadHeight from '../assets/hulls/maps/abyssal-submersible-hadron-height.png';
import abyssalHadEmissive from '../assets/hulls/maps/abyssal-submersible-hadron-emissive.png';
import choristerBathAlbedo from '../assets/hulls/maps/chorister-bathyarch-albedo.png';
import choristerBathHeight from '../assets/hulls/maps/chorister-bathyarch-height.png';
import choristerBathEmissive from '../assets/hulls/maps/chorister-bathyarch-emissive.png';
import choristerPelAlbedo from '../assets/hulls/maps/chorister-pelagia-albedo.png';
import choristerPelHeight from '../assets/hulls/maps/chorister-pelagia-height.png';
import choristerPelEmissive from '../assets/hulls/maps/chorister-pelagia-emissive.png';
import choristerHadAlbedo from '../assets/hulls/maps/chorister-hadron-albedo.png';
import choristerHadHeight from '../assets/hulls/maps/chorister-hadron-height.png';
import choristerHadEmissive from '../assets/hulls/maps/chorister-hadron-emissive.png';
import choristerAlbedo from '../assets/hulls/maps/chorister-albedo.png';
import choristerHeight from '../assets/hulls/maps/chorister-height.png';
import choristerEmissive from '../assets/hulls/maps/chorister-emissive.png';
import clarionAlbedo from '../assets/hulls/maps/clarion-albedo.png';
import clarionHeight from '../assets/hulls/maps/clarion-height.png';
import clarionEmissive from '../assets/hulls/maps/clarion-emissive.png';
import tenderAlbedo from '../assets/hulls/maps/tender-albedo.png';
import tenderHeight from '../assets/hulls/maps/tender-height.png';
import tenderEmissive from '../assets/hulls/maps/tender-emissive.png';
import bulwarkAlbedo from '../assets/hulls/maps/bulwark-albedo.png';
import bulwarkHeight from '../assets/hulls/maps/bulwark-height.png';
import bulwarkEmissive from '../assets/hulls/maps/bulwark-emissive.png';
import spinnerAlbedo from '../assets/hulls/maps/spinner-albedo.png';
import spinnerHeight from '../assets/hulls/maps/spinner-height.png';
import spinnerEmissive from '../assets/hulls/maps/spinner-emissive.png';
import sowerAlbedo from '../assets/hulls/maps/sower-albedo.png';
import sowerHeight from '../assets/hulls/maps/sower-height.png';
import sowerEmissive from '../assets/hulls/maps/sower-emissive.png';
import precentorAlbedo from '../assets/hulls/maps/precentor-albedo.png';
import precentorHeight from '../assets/hulls/maps/precentor-height.png';
import precentorEmissive from '../assets/hulls/maps/precentor-emissive.png';
import dredgeAlbedo from '../assets/hulls/maps/dredge-albedo.png';
import dredgeHeight from '../assets/hulls/maps/dredge-height.png';
import dredgeEmissive from '../assets/hulls/maps/dredge-emissive.png';
import cantusAlbedo from '../assets/hulls/maps/cantus-albedo.png';
import cantusHeight from '../assets/hulls/maps/cantus-height.png';
import cantusEmissive from '../assets/hulls/maps/cantus-emissive.png';
import reciterAlbedo from '../assets/hulls/maps/reciter-albedo.png';
import reciterHeight from '../assets/hulls/maps/reciter-height.png';
import reciterEmissive from '../assets/hulls/maps/reciter-emissive.png';

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
  // The cohort hull and the Order's line hull: the Chorister's canonical
  // model is the Directorate's (it carries no lock, like the Submersible);
  // the Clarion is the Knights' alone.
  [UnitKind.Chorister]: {
    albedo: choristerAlbedo,
    height: choristerHeight,
    emissive: choristerEmissive,
  },
  [UnitKind.Clarion]: {
    albedo: clarionAlbedo,
    height: clarionHeight,
    emissive: clarionEmissive,
  },
  // The rung's roster (#466): each hull is one navy's, so its model is the
  // kind's canonical one and no variant dimension exists — the signature
  // structures' rule in structureMaps.ts, applied to hulls.
  [UnitKind.Tender]: {
    albedo: tenderAlbedo,
    height: tenderHeight,
    emissive: tenderEmissive,
  },
  [UnitKind.Bulwark]: {
    albedo: bulwarkAlbedo,
    height: bulwarkHeight,
    emissive: bulwarkEmissive,
  },
  [UnitKind.Spinner]: {
    albedo: spinnerAlbedo,
    height: spinnerHeight,
    emissive: spinnerEmissive,
  },
  [UnitKind.Sower]: {
    albedo: sowerAlbedo,
    height: sowerHeight,
    emissive: sowerEmissive,
  },
  [UnitKind.Precentor]: {
    albedo: precentorAlbedo,
    height: precentorHeight,
    emissive: precentorEmissive,
  },
  [UnitKind.Dredge]: {
    albedo: dredgeAlbedo,
    height: dredgeHeight,
    emissive: dredgeEmissive,
  },
  [UnitKind.Cantus]: {
    albedo: cantusAlbedo,
    height: cantusHeight,
    emissive: cantusEmissive,
  },
  [UnitKind.Reciter]: {
    albedo: reciterAlbedo,
    height: reciterHeight,
    emissive: reciterEmissive,
  },
};

/**
 * Faction-specific variant models: a hull re-designed in another faction's
 * shape language, not just recoloured. Added per approved model, exactly like
 * KIND_MAP_URL entries; slugs in build.mjs carry the faction suffix
 * (e.g. corvette-bathyarch).
 */
const VARIANT_MAP_URL: Partial<Record<Faction, Partial<Record<UnitKind, MapUrls>>>> = {
  // Pelagia is the canonical navy for most hulls, so its variants are the
  // kinds whose canonical model belongs to another faction.
  [Faction.Pelagia]: {
    [UnitKind.AbyssalSubmersible]: {
      albedo: abyssalPelAlbedo,
      height: abyssalPelHeight,
      emissive: abyssalPelEmissive,
    },
    [UnitKind.Chorister]: {
      albedo: choristerPelAlbedo,
      height: choristerPelHeight,
      emissive: choristerPelEmissive,
    },
  },
  [Faction.Bathyarch]: {
    [UnitKind.LightScout]: {
      albedo: lightScoutBathAlbedo,
      height: lightScoutBathHeight,
      emissive: lightScoutBathEmissive,
    },
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
    [UnitKind.AbyssalSubmersible]: {
      albedo: abyssalBathAlbedo,
      height: abyssalBathHeight,
      emissive: abyssalBathEmissive,
    },
    [UnitKind.Chorister]: {
      albedo: choristerBathAlbedo,
      height: choristerBathHeight,
      emissive: choristerBathEmissive,
    },
  },
  [Faction.Directorate]: {
    [UnitKind.LightScout]: {
      albedo: lightScoutDirAlbedo,
      height: lightScoutDirHeight,
      emissive: lightScoutDirEmissive,
    },
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
    [UnitKind.LightScout]: {
      albedo: lightScoutHadAlbedo,
      height: lightScoutHadHeight,
      emissive: lightScoutHadEmissive,
    },
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
    [UnitKind.AbyssalSubmersible]: {
      albedo: abyssalHadAlbedo,
      height: abyssalHadHeight,
      emissive: abyssalHadEmissive,
    },
    [UnitKind.Chorister]: {
      albedo: choristerHadAlbedo,
      height: choristerHadHeight,
      emissive: choristerHadEmissive,
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
/**
 * One decode per key, however many hulls ask. A canonical model serves every
 * faction, so two navies asking for the same kind must share the job rather
 * than decode it twice; and a key that failed stays failed — its lookup drops
 * a level, and a retry per frame would only repeat the miss.
 */
const decodes = new Map<string, Promise<void>>();

function decodeInto(key: string, urls: MapUrls): Promise<void> {
  let job = decodes.get(key);
  if (job === undefined) {
    job = (async () => {
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
    })();
    decodes.set(key, job);
  }
  return job;
}

/**
 * Decode the maps one hull needs as one faction fields it — and only those
 * (#442). A match touches one navy's hulls, so decoding every model on the
 * disk at match start spent most of its work on navies not in the water.
 *
 * The lookup chain `hullMap` reads is built here in the same order: the
 * faction's variant when one is approved, falling to the kind's canonical
 * model if the variant is absent or fails to decode, and to nothing — the
 * procedural bake in hullTextures.ts — when the kind has no model at all.
 * A map that fails to decode is simply absent rather than an error, the same
 * failure posture as the concept-art plates.
 */
export async function loadHullMap(kind: UnitKind, faction: Faction): Promise<void> {
  const variant = VARIANT_MAP_URL[faction]?.[kind];
  if (variant !== undefined) {
    const key = `${faction}:${kind}`;
    await decodeInto(key, variant);
    if (maps.has(key)) return;
  }
  const canonical = KIND_MAP_URL[kind];
  if (canonical !== undefined) await decodeInto(`${kind}`, canonical);
}

/**
 * The decoded maps for a hull as a faction fields it: the faction's own
 * variant when one is approved, the kind's canonical model otherwise, null
 * when the kind has no model at all — or none decoded yet; `loadHullMap` is
 * what makes this answer.
 */
export function hullMap(kind: UnitKind, faction: Faction): HullMap | null {
  return maps.get(`${faction}:${kind}`) ?? maps.get(`${kind}`) ?? null;
}
