/**
 * The approved environment models, loaded for instancing —
 * docs/graphics-standards.md "The environment branch".
 *
 * Same door as rosterModels.ts: Vite serves the `env-*.glb` files straight
 * from docs/concept-art/models/, one copy, no drift. What differs is the law
 * applied at material level, because a prop is terrain, not an agent:
 *
 * - **No faction recolour.** Props belong to nobody. Instead the diffuse
 *   luminance is *normalised* to the seafloor register — scenery in a
 *   lightless ocean must read darker and quieter than any vessel
 *   (docs/asset-prompts-3d.md, ENV STYLE), and must still read — while hue
 *   stays the model's own desaturated stone/coral/crystal.
 * - **Emissive passes through untouched.** A prop's light was licensed (or
 *   refused) at intake against the world-light families; the runtime is not a
 *   second review. Gate 3's SIG modulation never applies — a prop has no SIG.
 * - **Transforms are baked into the geometry.** Instancing wants metre-true
 *   geometry under simple TRS instance matrices, so canonicalisation (scale
 *   to `footprintM`, centre XZ, base at Y=0 — props *stand*, hulls float)
 *   is applied to the vertices once at template build.
 * - **Sway is a vertex shader, never a matrix.** A prop with `swayM > 0`
 *   (kelp) bends in the current through a per-vertex weight and a time
 *   uniform patched into its materials; the instance matrices, the
 *   placements, the probe numbers and the budget are exactly those of a
 *   still prop. Under reduced motion the time is held, so the same shader
 *   draws a fixed lean — the rigid fallback the epic asked for, for free.
 */

import {
  Box3,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeByMaterial } from './rosterModels.ts';
import { swayWeight } from './environment.ts';

/**
 * TUNABLE — the diffuse luminance a prop's brightest material is set to,
 * under the shared light rig; the model's other materials keep their ratio
 * to it. Retuned by screenshot when the Block 4 batch landed (#342): the
 * design exports honour the ENV STYLE brief's "dark, low-luminance" so
 * literally (base luminance 0.002–0.03 linear) that a clamp never engaged and
 * every prop rendered at or below the seabed's own value. Normalising instead
 * makes the register the runtime's, as hue is for hulls — an export's
 * absolute darkness is irrelevant, only the ratio between its materials.
 * The value sits above the seafloor fill and below the darkest faction's
 * lifted cladding (rosterModels.ts LUMINANCE_LIFT), so a prop reads as a
 * shape at survey zoom and never as a contact.
 */
const ENV_LUMINANCE_CEILING = 0.06;

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

/** The sway uniforms one template's materials share; the layer drives time. */
export interface SwayUniforms {
  uSwayTime: { value: number };
  uSwayAmpM: { value: number };
}

/** A template ready to instance: metre-true parts, one per material. */
export interface EnvTemplate {
  parts: { geometry: BufferGeometry; material: Material }[];
  /** Triangles one instance costs, for the probe and the budget check. */
  trianglesPerInstance: number;
  /** Present only on props that bend — the handle the layer ticks. */
  sway: SwayUniforms | null;
}

const loader = new GLTFLoader();
/** Templates per slug; null marks "still loading" (or failed — see below). */
const templates = new Map<string, EnvTemplate | null>();

function luminance(material: MeshStandardMaterial): number {
  return 0.2126 * material.color.r + 0.7152 * material.color.g + 0.0722 * material.color.b;
}

/**
 * Set one template's diffuse register: scale every material's colour by the
 * one gain that puts the brightest of them at the ceiling. Hue and the
 * ratio between a model's materials (stone under coral growth) are the
 * export's; the absolute value is ours. Emissive is left alone — a prop's
 * light was licensed at intake and is not a diffuse property.
 */
function normaliseLuminance(materials: Iterable<Material>): void {
  const standard = [...materials].filter(
    (material): material is MeshStandardMaterial => material instanceof MeshStandardMaterial
  );
  const brightest = Math.max(0, ...standard.map(luminance));
  if (brightest <= 0) return;
  const gain = ENV_LUMINANCE_CEILING / brightest;
  for (const material of standard) material.color.multiplyScalar(gain);
}

/**
 * The sway patch. The displacement is object-space, before the instance
 * matrix, so each instance's random yaw turns one current into as many
 * directions as there are clusters — a forest moving, not a chorus line.
 * The phase comes from the instance's own translation, read straight from
 * `instanceMatrix`, so no extra attribute crosses to the GPU; two sines at
 * incommensurate rates keep the motion from reading as a metronome.
 */
function patchSway(material: Material, uniforms: SwayUniforms): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSwayTime = uniforms.uSwayTime;
    shader.uniforms.uSwayAmpM = uniforms.uSwayAmpM;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        [
          '#include <common>',
          'attribute float swayWeight;',
          'uniform float uSwayTime;',
          'uniform float uSwayAmpM;',
        ].join('\n')
      )
      .replace(
        '#include <begin_vertex>',
        [
          '#include <begin_vertex>',
          '#ifdef USE_INSTANCING',
          '{',
          '  float phase = dot(vec2(instanceMatrix[3][0], instanceMatrix[3][2]), vec2(0.031, 0.047));',
          '  float along = sin(uSwayTime * 0.9 + phase) + 0.35 * sin(uSwayTime * 2.3 + phase * 1.7);',
          '  float across = 0.4 * cos(uSwayTime * 0.7 + phase);',
          '  transformed.x += uSwayAmpM * swayWeight * along;',
          '  transformed.z += uSwayAmpM * swayWeight * across;',
          '}',
          '#endif',
        ].join('\n')
      );
  };
  // A patched material must not share a compiled program with the unpatched
  // MeshStandardMaterials on the same scene — three keys programs by type.
  material.customProgramCacheKey = () => 'env-sway';
  material.needsUpdate = true;
}

function buildTemplate(scene: Group, footprintM: number, swayM: number): EnvTemplate {
  // Clone materials through an identity map (rosterModels' argument: shared
  // materials must keep sharing their clone or the merge silently fails).
  const materialClones = new Map<Material, Material>();
  const cloneOf = (material: Material): Material => {
    let clone = materialClones.get(material);
    if (clone === undefined) {
      clone = material.clone();
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
  normaliseLuminance(materialClones.values());

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
  const heightM = size.y * scale;

  const sway: SwayUniforms | null =
    swayM > 0 ? { uSwayTime: { value: 0 }, uSwayAmpM: { value: swayM } } : null;

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
    const material = child.material as Material;
    if (sway !== null) {
      const weights = new Float32Array(position.count);
      for (let i = 0; i < position.count; i++) weights[i] = swayWeight(position.getY(i), heightM);
      geometry.setAttribute('swayWeight', new Float32BufferAttribute(weights, 1));
      patchSway(material, sway);
    }
    parts.push({ geometry, material });
  });
  return { parts, trianglesPerInstance: triangles, sway };
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
  swayM: number,
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
      templates.set(slug, buildTemplate(gltf.scene, footprintM, swayM));
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
