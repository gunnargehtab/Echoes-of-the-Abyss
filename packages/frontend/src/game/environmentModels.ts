/**
 * The approved environment models, loaded for instancing —
 * docs/graphics-standards.md "The environment branch".
 *
 * Same door as rosterModels.ts: Vite serves the `env-*.glb` files straight
 * from docs/concept-art/models/, one copy, no drift. What differs is the law
 * applied at material level, because a prop is terrain, not an agent:
 *
 * - **No faction recolour.** Props belong to nobody. Instead the diffuse
 *   luminance is *clamped* to the seafloor register — scenery in a lightless
 *   ocean must read darker and quieter than any vessel
 *   (docs/asset-prompts-3d.md, ENV STYLE) — while hue stays the model's own
 *   desaturated stone/coral/crystal.
 * - **Emissive passes through untouched.** A prop's light was licensed (or
 *   refused) at intake against the world-light families; the runtime is not a
 *   second review. Gate 3's SIG modulation never applies — a prop has no SIG.
 * - **Transforms are baked into the geometry.** Instancing wants metre-true
 *   geometry under simple TRS instance matrices, so canonicalisation (scale
 *   to `footprintM`, centre XZ, base at Y=0 — props *stand*, hulls float)
 *   is applied to the vertices once at template build.
 */

import { Box3, BufferGeometry, Group, Material, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeByMaterial } from './rosterModels.ts';

/**
 * TUNABLE — the diffuse luminance ceiling for prop materials, under the
 * shared light rig. Approximates the "darker and quieter than any vessel"
 * register the style docs pin for the seafloor; expected to be retuned by
 * screenshot when the first env-assets batch lands.
 */
const ENV_LUMINANCE_CEILING = 0.16;

const ENV_MODEL_URLS = import.meta.glob<string>('../../../../docs/concept-art/models/env-*.glb', {
  query: '?url',
  import: 'default',
});

const ENV_MODEL_BY_FILE = new Map<string, () => Promise<string>>(
  Object.entries(ENV_MODEL_URLS).map(([path, load]) => [
    path.slice(path.lastIndexOf('/') + 1),
    load,
  ])
);

/** A template ready to instance: metre-true parts, one per material. */
export interface EnvTemplate {
  parts: { geometry: BufferGeometry; material: Material }[];
  /** Triangles one instance costs, for the probe and the budget check. */
  trianglesPerInstance: number;
}

const loader = new GLTFLoader();
/** Templates per slug; null marks "still loading" (or failed — see below). */
const templates = new Map<string, EnvTemplate | null>();

function clampLuminance(material: Material): void {
  if (!(material instanceof MeshStandardMaterial)) return;
  const luminance =
    0.2126 * material.color.r + 0.7152 * material.color.g + 0.0722 * material.color.b;
  if (luminance > ENV_LUMINANCE_CEILING) {
    material.color.multiplyScalar(ENV_LUMINANCE_CEILING / luminance);
  }
}

function buildTemplate(scene: Group, footprintM: number): EnvTemplate {
  // Clone materials through an identity map (rosterModels' argument: shared
  // materials must keep sharing their clone or the merge silently fails).
  const materialClones = new Map<Material, Material>();
  const cloneOf = (material: Material): Material => {
    let clone = materialClones.get(material);
    if (clone === undefined) {
      clone = material.clone();
      clampLuminance(clone);
      materialClones.set(material, clone);
    }
    return clone;
  };
  const copy = scene.clone(true);
  copy.traverse((child) => {
    if (child instanceof Mesh) {
      child.material = Array.isArray(child.material)
        ? child.material.map(cloneOf)
        : cloneOf(child.material);
    }
  });

  const merged = mergeByMaterial(copy);

  // Canonicalise: larger footprint axis to footprintM (no length-on-X — a
  // prop stands at a random yaw), centre XZ, base at Y=0, baked into the
  // vertices so instance matrices stay plain TRS.
  const box = new Box3().setFromObject(merged);
  const size = box.getSize(new Vector3());
  const footprint = Math.max(size.x, size.z);
  const scale = footprint > 0 ? footprintM / footprint : 1;
  const centre = box.getCenter(new Vector3());
  merged.updateMatrixWorld(true);

  const parts: EnvTemplate['parts'] = [];
  let triangles = 0;
  merged.traverse((child) => {
    if (!(child instanceof Mesh) || Array.isArray(child.material)) return;
    const geometry = (child.geometry as BufferGeometry).clone();
    geometry.applyMatrix4(child.matrixWorld);
    geometry.translate(-centre.x, -box.min.y, -centre.z);
    geometry.scale(scale, scale, scale);
    geometry.computeBoundingSphere();
    const position = geometry.getAttribute('position');
    triangles += Math.floor((geometry.index?.count ?? position.count) / 3);
    parts.push({ geometry, material: child.material as Material });
  });
  return { parts, trianglesPerInstance: triangles };
}

/**
 * The template for a prop slug, or null while it loads. `onReady` fires once
 * when a load completes, so the environment layer can rebuild — props enter
 * on the terrain cadence, not per frame, and a template that fails to decode
 * stays null forever: the biome simply reads through relief and mottle alone,
 * which is the documented fallback (graphics-standards gate 1).
 */
export function envTemplate(
  slug: string,
  footprintM: number,
  onReady: () => void
): EnvTemplate | null {
  const cached = templates.get(slug);
  if (cached !== undefined) return cached;
  const load = ENV_MODEL_BY_FILE.get(`${slug}.glb`);
  if (load === undefined) {
    templates.set(slug, null);
    return null;
  }
  templates.set(slug, null);
  load()
    .then((url) => loader.loadAsync(url))
    .then((gltf) => {
      templates.set(slug, buildTemplate(gltf.scene, footprintM));
      onReady();
    })
    .catch(() => {
      // Stays null: a broken export is a missing prop, never a retry loop.
    });
  return null;
}

/** For tests and teardown: forget every cached template. */
export function resetEnvironmentModels(): void {
  templates.clear();
}
