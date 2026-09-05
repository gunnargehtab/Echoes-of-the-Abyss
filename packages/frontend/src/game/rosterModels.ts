/**
 * The approved roster models, loaded for the conn view — Phase 2 of
 * docs/three-layer-ocean.md.
 *
 * The GLBs in docs/concept-art/models/ are the pipeline of record's approved
 * output (graphics-standards.md): hull-intake validated their metre scale and
 * length-on-X, and the offline map bake has been rendering the chart's sprites
 * from them all along. This module is the runtime door to the same files —
 * Vite serves them straight from the docs tree, so there is no second copy to
 * drift.
 *
 * Two gates are enforced here, at material level, because a mesh must obey the
 * same laws the sprite bake obeys:
 *
 * - **Gate 4 — hue belongs to the faction constant.** Models are dressed in a
 *   faction's palette for generation, so their hue is not shippable. Each
 *   material keeps only its *luminance* (this hull's panel and ridge value)
 *   and is recoloured in the owning faction's primary; lamps keep their
 *   placement and strength and are recoloured to the faction glow — the same
 *   law bake.ts applies to the 2D maps, so the chart and the conn view cannot
 *   drift into different-looking navies. Recolouring reads the active palette,
 *   so the colour-vision palettes (ui-ux.md §11) reach the meshes too.
 * - **Gate 3 — glow encodes loudness.** A model's resting light budget was
 *   approved at intake against its SIG band; at runtime that resting strength
 *   is modulated by the hull's *live* SIG along the spec curve's exponent
 *   (E(SIG) = 0.45·e^(SIG/14), graphics-standards.md — the ratio needs only
 *   the e-folding, so 0.45 cancels). A hull running silent goes dark; a hull
 *   firing flares. The renderer showing it is new; the rule is not.
 */

import {
  Box3,
  BufferGeometry,
  Color,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Faction, StructureKind, structureStatsFor, UnitKind } from '@echoes/shared';
import { ACTIVE_PALETTE, FACTION_PALETTE } from './palette.ts';
import { HULL_LENGTH_M } from './silhouettes.ts';
import { glowFactor } from './glow.ts';

/** TUNABLE — the bake's dark-livery lift, restated for materials: bake.ts
 * lifts cladding luminance ×1.5 so near-black hulls still carry their
 * faction's colour. Same number, same reason. */
const LUMINANCE_LIFT = 1.5;

/**
 * Every approved model, keyed by its docs filename. Lazy URLs: the build
 * carries all of them, a match fetches only the hulls it actually shows.
 * The pattern also matches the `env-*.glb` environment props, harmlessly —
 * lookup is by roster slug, so those files are simply never asked for here;
 * environmentModels.ts holds its own prefix-filtered glob.
 */
const MODEL_URLS = import.meta.glob<string>('../../../../docs/concept-art/models/*.glb', {
  query: '?url',
  import: 'default',
});

/** The glob keyed by filename, so lookup does not depend on how the bundler
 * spells the rest of the path. */
const MODEL_BY_FILE = new Map<string, () => Promise<string>>(
  Object.entries(MODEL_URLS).map(([path, load]) => [path.slice(path.lastIndexOf('/') + 1), load])
);

const UNIT_SLUG: Record<UnitKind, string> = {
  [UnitKind.LightScout]: 'light-scout',
  [UnitKind.Corvette]: 'corvette',
  [UnitKind.Cruiser]: 'cruiser',
  [UnitKind.AbyssalSubmersible]: 'abyssal-submersible',
  // No approved model yet: the slug resolves to no file, so the Chorister
  // stays on the procedural sprite (graphics-standards.md, gate 1) until one
  // passes intake.
  [UnitKind.Chorister]: 'chorister',
  // Nor the Clarion, for the same reason and on the same terms.
  [UnitKind.Clarion]: 'clarion',
  [UnitKind.Harvester]: 'harvester',
  // The rung's roster (#461), approved in #466 — one model per hull, since
  // each is one navy's and never another's.
  [UnitKind.Tender]: 'tender',
  [UnitKind.Bulwark]: 'bulwark',
  [UnitKind.Spinner]: 'spinner',
  [UnitKind.Sower]: 'sower',
  [UnitKind.Precentor]: 'precentor',
  [UnitKind.Dredge]: 'dredge',
  [UnitKind.Cantus]: 'cantus',
  [UnitKind.Reciter]: 'reciter',
};

/** VentTap has no approved model yet; it stays on the sprite fallback. */
const STRUCTURE_SLUG: Partial<Record<StructureKind, string>> = {
  [StructureKind.Bastion]: 'bastion',
  [StructureKind.Refinery]: 'refinery',
  [StructureKind.Foundry]: 'foundry',
  [StructureKind.SentinelTurret]: 'sentinel-turret',
  [StructureKind.BaffleBarge]: 'baffle-barge',
  [StructureKind.Cantor]: 'cantor',
  [StructureKind.SoundingSpire]: 'sounding-spire',
  [StructureKind.SporeVeil]: 'spore-veil',
  [StructureKind.Slipway]: 'slipway',
};

const FACTION_SLUG: Record<Faction, string> = {
  [Faction.Bathyarch]: 'bathyarch',
  [Faction.Pelagia]: 'pelagia',
  [Faction.Directorate]: 'directorate',
  [Faction.Hadron]: 'hadron',
};

export type RosterModelKey =
  { unit: UnitKind; faction: Faction } | { structure: StructureKind; faction: Faction };

function slugFor(key: RosterModelKey): string | null {
  const base = 'unit' in key ? UNIT_SLUG[key.unit] : STRUCTURE_SLUG[key.structure];
  if (base === undefined) return null;
  return `${base}-${FACTION_SLUG[key.faction]}`;
}

/** One entity's own copy of a model: a clone whose lamps it may dim alone. */
export interface RosterModelInstance {
  root: Group;
  /** Every lamp material, with the resting strength intake approved. */
  emissives: { material: MeshStandardMaterial; restIntensity: number }[];
  /** Extents of the recoloured template, metres, after centring. */
  lengthM: number;
  beamM: number;
  heightM: number;
  /**
   * The canonicalisation's own scale, already applied to `root`. A caller that
   * wants to draw the hull off true scale — the far-zoom readability factor
   * (readability.ts) is the only one — must multiply *this*, not read
   * `root.scale`, which it is itself about to overwrite.
   */
  baseScale: number;
}

interface Template {
  root: Group;
  lengthM: number;
  beamM: number;
  heightM: number;
  baseScale: number;
}

const loader = new GLTFLoader();
/** Parsed scenes per URL — fetched and decoded once, whatever the palette. */
const parsed = new Map<string, Promise<Group>>();
/** Recoloured templates per slug + palette; null marks "still loading". */
const templates = new Map<string, Template | null>();

function luminance(color: Color): number {
  return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

/**
 * Gate 4, applied in place: keep the material's value, replace its hue with
 * the faction's inks from the active palette. Metalness and roughness are the
 * designed surface and stay the model's own.
 */
function recolor(root: Group, faction: Faction): void {
  const ink = FACTION_PALETTE[faction];
  const primary = new Color(ink.primary);
  const glow = new Color(ink.glow);
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (!(material instanceof MeshStandardMaterial)) continue;
      const value = Math.min(1, luminance(material.color) * LUMINANCE_LIFT);
      material.color.copy(primary).multiplyScalar(value);
      if (luminance(material.emissive) > 0) {
        const strength = Math.min(1, luminance(material.emissive) * LUMINANCE_LIFT);
        material.emissive.copy(glow).multiplyScalar(strength);
      }
    }
  });
}

/**
 * Collapse a model's part tree into one mesh per material. The design exports
 * carry each greeble as its own node — the scout alone is 32 primitives over
 * five materials — and a per-part draw call across a whole navy is where the
 * frame budget would go. Bucketing by material keeps the recoloured look
 * identical while a hull costs as many draws as it has materials. A bucket
 * whose geometries refuse to merge (mismatched attributes) keeps its parts —
 * correctness over the draw count. Exported for environmentModels.ts, whose
 * props obey the same law before they are instanced.
 */
export function mergeByMaterial(root: Group): Group {
  root.updateMatrixWorld(true);
  const buckets = new Map<Material, BufferGeometry[]>();
  const unmergeable: Mesh[] = [];
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    if (Array.isArray(child.material)) {
      // Multi-material meshes use geometry groups the merge would discard.
      unmergeable.push(child);
      return;
    }
    const geometry = (child.geometry as BufferGeometry).clone();
    geometry.applyMatrix4(child.matrixWorld);
    const bucket = buckets.get(child.material);
    if (bucket === undefined) buckets.set(child.material, [geometry]);
    else bucket.push(geometry);
  });
  const merged = new Group();
  for (const [material, geometries] of buckets) {
    // Claude Design's exporter indexes the primitives it built from three's
    // parametric geometries and leaves the hand-built ones flat, and
    // mergeGeometries refuses a bucket that mixes the two. Flattening the
    // indexed minority costs a little vertex memory once per template;
    // keeping the parts would cost a draw call per part per instance batch.
    if (geometries.some((g) => g.index !== null) && geometries.some((g) => g.index === null)) {
      for (let i = 0; i < geometries.length; i++) {
        if (geometries[i]!.index !== null) geometries[i] = geometries[i]!.toNonIndexed();
      }
    }
    const geometry = geometries.length === 1 ? geometries[0]! : mergeGeometries(geometries);
    if (geometry === null) {
      for (const g of geometries) merged.add(new Mesh(g, material));
    } else {
      merged.add(new Mesh(geometry, material));
    }
  }
  for (const mesh of unmergeable) {
    const kept = new Mesh(mesh.geometry, mesh.material);
    kept.applyMatrix4(mesh.matrixWorld);
    merged.add(kept);
  }
  return merged;
}

/** The design length a model is held to, exactly as the offline bake holds
 * it (tools/hull-maps/build.mjs): hulls to HULL_LENGTH_M, structures to their
 * footprint diameter. */
function designLengthM(key: RosterModelKey): number {
  return 'unit' in key ? HULL_LENGTH_M[key.unit] : structureStatsFor(key.structure).radiusM * 2;
}

/**
 * The intake harness's canonicalisation, replicated exactly
 * (.claude/skills/hull-intake/scripts/page.html): length runs along X, and an
 * export whose Z footprint is longer gets yawed onto X; then the model is
 * scaled so its length IS the design length — the exports are not metre-true
 * (the Bastion arrives fifty times under scale), and the offline maps were
 * always rendered through this same correction, which is why the chart never
 * showed it. Centre last, so yaw and scale are inside the measurement.
 */
function normalise(scene: Group, key: RosterModelKey): Template {
  const raw = new Box3().setFromObject(scene).getSize(new Vector3());
  if (raw.z > raw.x) scene.rotation.y = Math.PI / 2;

  const root = new Group();
  root.add(scene);
  const yawedBox = new Box3().setFromObject(root);
  const yawedSize = yawedBox.getSize(new Vector3());
  scene.position.sub(yawedBox.getCenter(new Vector3()));

  const scale = yawedSize.x > 0 ? designLengthM(key) / yawedSize.x : 1;
  root.scale.setScalar(scale);
  return {
    root,
    lengthM: yawedSize.x * scale,
    beamM: yawedSize.z * scale,
    heightM: yawedSize.y * scale,
    baseScale: scale,
  };
}

function loadTemplate(
  templateKey: string,
  file: string,
  load: () => Promise<string>,
  key: RosterModelKey
): void {
  templates.set(templateKey, null);
  let scene = parsed.get(file);
  if (scene === undefined) {
    scene = load()
      .then((resolved) => loader.loadAsync(resolved))
      .then((gltf) => gltf.scene);
    parsed.set(file, scene);
  }
  scene
    .then((raw) => {
      // Clone before recolouring: the parse cache stays hue-neutral so a
      // palette switch can recolour fresh rather than compounding tints.
      const copy = raw.clone(true);
      // Clone materials through an identity map: parts sharing a glTF
      // material must keep sharing its clone, or mergeByMaterial sees one
      // bucket per part and the whole draw-call collapse silently fails.
      const materialClones = new Map<Material, Material>();
      const cloneOf = (material: Material): Material => {
        let clone = materialClones.get(material);
        if (clone === undefined) {
          clone = material.clone();
          materialClones.set(material, clone);
        }
        return clone;
      };
      copy.traverse((child) => {
        if (child instanceof Mesh) {
          child.material = Array.isArray(child.material)
            ? child.material.map(cloneOf)
            : cloneOf(child.material);
        }
      });
      recolor(copy, key.faction);
      templates.set(templateKey, normalise(mergeByMaterial(copy), key));
    })
    .catch(() => {
      // A model that fails to decode is a missing model: the entry stays
      // null, the sprite fallback carries the entity permanently, and no
      // snapshot-cadence retry loop hammers the failed fetch.
    });
}

/**
 * A per-entity instance of the approved model, or null while it loads (or
 * when none exists — VentTap, a failed decode). Callers fall back to the
 * Phase-1 sprite until this returns something, so a null is never a hole on
 * screen. Instances share geometry with their template; lamp materials are
 * cloned per instance so each hull's live SIG dims its own lights.
 */
export function rosterModelInstance(key: RosterModelKey): RosterModelInstance | null {
  const slug = slugFor(key);
  if (slug === null) return null;
  const load = MODEL_BY_FILE.get(`${slug}.glb`);
  if (load === undefined) return null;
  const templateKey = `${slug}:${ACTIVE_PALETTE.name}`;
  const template = templates.get(templateKey);
  if (template === undefined) {
    loadTemplate(templateKey, `${slug}.glb`, load, key);
    return null;
  }
  if (template === null) return null;

  const root = template.root.clone(true);
  const emissives: RosterModelInstance['emissives'] = [];
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    const cloned = materials.map((material) => {
      if (
        material instanceof MeshStandardMaterial &&
        (luminance(material.emissive) > 0 || material.emissiveIntensity > 0) &&
        material.emissive.getHex() !== 0
      ) {
        const own = material.clone();
        emissives.push({ material: own, restIntensity: own.emissiveIntensity });
        return own;
      }
      return material;
    });
    child.material = Array.isArray(child.material) ? cloned : cloned[0]!;
  });
  return {
    root,
    emissives,
    lengthM: template.lengthM,
    beamM: template.beamM,
    heightM: template.heightM,
    baseScale: template.baseScale,
  };
}

/**
 * Gate 3's live modulation: scale every lamp from its approved resting
 * strength by where the hull's live SIG sits against its resting SIG.
 */
export function applyLiveGlow(
  instance: RosterModelInstance,
  liveSig: number,
  restSig: number
): void {
  const factor = glowFactor(liveSig, restSig);
  for (const { material, restIntensity } of instance.emissives) {
    material.emissiveIntensity = restIntensity * factor;
  }
}

/** For tests and teardown: forget every cached parse and template. */
export function resetRosterModels(): void {
  parsed.clear();
  templates.clear();
}

/** Exported for the pick proxy: an Object3D's world-space box extents. */
export function objectExtents(object: Object3D): Vector3 {
  return new Box3().setFromObject(object).getSize(new Vector3());
}
