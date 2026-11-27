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
 * - **Emissive keeps its intake strength and hue.** A prop's light was licensed
 *   (or refused) at intake against the world-light families; the runtime is not a
 *   second review, so the glow is added after tone mapping like a hull's
 *   (art-direction.md). Gate 3's SIG modulation never applies — a prop has no SIG.
 * - **Transforms are baked into the geometry.** Instancing wants metre-true
 *   geometry under simple TRS instance matrices, so canonicalisation (scale
 *   to `footprintM`, centre XZ, base at Y=0 — props *stand*, hulls float)
 *   is applied to the vertices once at template build. The scale is read
 *   before the merge, by the measure intake reviews (`propFootprint`, #876).
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
  NormalBlending,
  Vector3,
  type Object3D,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HIGH_GRAPHICS } from '@echoes/shared';
import { mergeByMaterial } from './rosterModels.ts';
import { swayWeight } from './environment.ts';
import { installPropSurface, type WorldLook } from './tutorialLook.ts';
import { keepGlowOutsideToneMapping } from './modelLighting.ts';
import { installPropVeil } from './veilShading.ts';
import { ARCH_STUDY_ON } from './archStudy.ts';
import { installDistanceGrade } from './distanceGrade.ts';
import { installLifeLight } from './lifeLight.ts';
import {
  installMantaWing,
  mantaUniforms,
  smoothSkin,
  wingThickness,
  type MantaUniforms,
} from './mantaWing.ts';
import { combMembrane, combRowLine, combUniforms, type CombUniforms } from './combLight.ts';
import {
  jellyMembrane,
  jellyShape,
  jellyUniforms,
  smoothMembrane,
  type JellyShape,
  type JellyUniforms,
} from './jellyLight.ts';

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

/** The comb rows a comb jelly's file marks, `comb_01`..`comb_08` (asset-prompts-3d.md Block 4). */
const COMB_ROWS = 8;
/** The node its file names for the mouth, a dark band under the body. */
const COMB_MOUTH = 'mouth';

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
  /** Its height at canonical scale, base to top: what a seated stone sinks a share of. */
  heightM: number;
  /** Named public-life seats, transformed exactly like the baked vertices. */
  photophores?: readonly Vector3[];
  /**
   * The way each of those seats faces, a unit vector in the template's
   * frame: its facet's own normal in the file. A seat's light at High is lit
   * by it (lifeGlow.ts, #1876).
   */
  photophoreFacings?: readonly Vector3[];
  /** Present only on a jelly's High template: what its membrane reads, and where its lip is. */
  jelly?: { uniforms: JellyUniforms; shape: JellyShape };
  /** Present only on the manta's High template: what its wings' stroke reads. */
  manta?: { uniforms: MantaUniforms };
  /**
   * The comb rows a file marks as nodes `comb_01`..`comb_08`, each the line
   * of points its light stands on, upper pole first, in the template's frame
   * (combLight.ts `combRowLine`, #1858). Empty for every file but the comb
   * jelly's.
   */
  combRows?: readonly (readonly Vector3[])[];
  /** Present only on the comb jelly's High template: what its membranes read. */
  comb?: { uniforms: CombUniforms };
}

const loader = new GLTFLoader();
/** Templates per slug; null marks "still loading" (or failed — see below). */
const templates = new Map<string, EnvTemplate | null>();
const waiting = new Map<string, Set<() => void>>();
let generation = 0;

/**
 * The committed file for an `env-*` slug, parsed: what a template is built
 * from, and what the arch study's landmark loader (landmarkModels.ts) reads
 * through the same glob, so one list of models serves both. Null when no
 * file matches the slug.
 */
export function loadEnvModel(slug: string): Promise<Group> | null {
  const load = ENV_MODEL_BY_FILE.get(`${slug}.glb`);
  if (load === undefined) return null;
  return load()
    .then((url) => loader.loadAsync(url))
    .then((gltf) => gltf.scene);
}

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
export function normaliseLuminance(
  materials: Iterable<Material>,
  ceiling = ENV_LUMINANCE_CEILING
): void {
  const standard = [...materials].filter(
    (material): material is MeshStandardMaterial => material instanceof MeshStandardMaterial
  );
  const brightest = Math.max(0, ...standard.map(luminance));
  if (brightest <= 0) return;
  const gain = ceiling / brightest;
  for (const material of standard) material.color.multiplyScalar(gain);
}

/**
 * Lay a world-light token on a template's licensed emissive
 * (docs/style-neon-noir.md "Rule 5 in the colour-vision palettes"). A prop's
 * file carries its family's standard token, which is what intake checks, and
 * a family's token is a palette's own, so the layer that stands the prop lays
 * the active palette's over it (environmentLayer.ts). Only the colour moves:
 * every palette's token keeps the standard one's luminance, so the strength
 * the file was exported at still gives the level the doc names. The emission
 * is the material's own uniform, so no program is rebuilt.
 */
export function wearWorldLight(parts: readonly { material: Material }[], token: number): void {
  for (const { material } of parts) {
    if (material instanceof MeshStandardMaterial && material.emissive.getHex() !== 0) {
      material.emissive.setHex(token);
    }
  }
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

/**
 * A prop's footprint by the measure `PropSpec.footprintM` names: three's
 * loose `Box3.setFromObject` over the parts as the file delivers them, the
 * larger of X and Z. It must be taken before `mergeByMaterial`, which bakes
 * each part's transform into its vertices and so turns this into the vertex
 * extent — the measure the runtime held until #876, under which the
 * boulder drew 1.23× the size intake reviewed.
 */
export function propFootprint(root: Object3D): number {
  root.updateMatrixWorld(true);
  const size = new Box3().setFromObject(root).getSize(new Vector3());
  return Math.max(size.x, size.z);
}

/** Which High template a body draws from; false is Low's, and every standing prop's. */
export type WorldLit = boolean | 'lantern' | 'wing' | 'comb';

/**
 * The way a seat's facet faces: the normal of its triangles, each weighed by
 * its area, in the scene's frame. A seat is a flat lozenge laid on the skin
 * and wound to face off it (tools/hull-models/seabed.mjs `seat`), so this is
 * the skin's own outward normal there, read off the file.
 */
function facetFacing(node: Object3D): Vector3 {
  const facing = new Vector3();
  const [a, b, c, normal] = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  node.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const at = child.geometry.getAttribute('position');
    const index = child.geometry.getIndex();
    const corner = (i: number, into: Vector3): Vector3 =>
      into
        .fromBufferAttribute(at, index === null ? i : index.getX(i))
        .applyMatrix4(child.matrixWorld);
    const count = index === null ? at.count : index.count;
    for (let i = 0; i < count; i += 3) {
      corner(i, a);
      corner(i + 1, b);
      corner(i + 2, c);
      // Half the cross product is the triangle's area along its normal.
      facing.add(normal.subVectors(b, a).cross(c.sub(a)));
    }
  });
  return facing.normalize();
}

/**
 * One prop's template from its parsed file; exported for the test that holds
 * it to intake. `worldLit` builds the High graphics quality's template for a
 * decorative body (docs/art-direction.md, "Life in the world's light",
 * #1837): its register is a body's own and it takes the world's light
 * (lifeLight.ts). Low's template is built without it, as it always was.
 * `'lantern'` is the drifting jelly's High template instead: every part a
 * lit membrane and none of it stone (jellyLight.ts). `'wing'` is the
 * manta's: a body in the world's light whose skin is smoothed and whose
 * wings stroke (mantaWing.ts, #1867). `'comb'` is the comb jelly's: a fainter
 * membrane whose eight marked comb rows are the light (combLight.ts, #1858).
 */
export function buildTemplate(
  scene: Group,
  footprintM: number,
  swayM: number,
  look: WorldLook = 'standard',
  worldLit: WorldLit = false
): EnvTemplate {
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
  // A comb jelly's mouth is a dark band in its rows' material, and light
  // cannot draw dark: on a membrane it would be a ninth lit thing. It takes a
  // material of its own here, so it merges apart from the rows, keeps its
  // place in the template's box and is left undrawn below.
  if (worldLit === 'comb') {
    copy.getObjectByName(COMB_MOUTH)?.traverse((child) => {
      if (!(child instanceof Mesh) || Array.isArray(child.material)) return;
      child.material = child.material.clone();
      child.material.name = COMB_MOUTH;
    });
  }
  normaliseLuminance(
    materialClones.values(),
    // The manta's belly is the one skin of the crater's life over a body's
    // register (mantaWing.ts): its back and its marks keep the file's ratio.
    worldLit === 'wing'
      ? HIGH_GRAPHICS.LIFE.MANTA.BELLY.ALBEDO
      : worldLit
        ? HIGH_GRAPHICS.LIFE.ALBEDO
        : ENV_LUMINANCE_CEILING
  );

  // Scale first, on the parts as delivered: the larger horizontal axis to
  // footprintM (no length-on-X — a prop stands at a random yaw).
  const footprint = propFootprint(copy);
  const scale = footprint > 0 ? footprintM / footprint : 1;

  const merged = mergeByMaterial(copy);

  // Then place on the merged vertices — centre XZ, base at Y=0 — baked in
  // so instance matrices stay plain TRS. The base is the lowest vertex, not
  // the floor of the parts' boxes: a prop stands on its rock, not on a box
  // a leaning part overhangs (0.21 m under the coral tower's, in game).
  const box = new Box3().setFromObject(merged);
  const size = box.getSize(new Vector3());
  const centre = box.getCenter(new Vector3());
  merged.updateMatrixWorld(true);
  const heightM = size.y * scale;
  const photophores: Vector3[] = [];
  const photophoreFacings: Vector3[] = [];
  copy.updateMatrixWorld(true);
  for (let i = 1; i <= 6; i++) {
    const node = copy.getObjectByName(`photophore_${String(i).padStart(2, '0')}`);
    if (node !== undefined) {
      photophores.push(
        // These seats bake their placement into vertices, not node translations.
        new Box3()
          .setFromObject(node)
          .getCenter(new Vector3())
          .sub(new Vector3(centre.x, box.min.y, centre.z))
          .multiplyScalar(scale)
      );
      photophoreFacings.push(facetFacing(node));
    }
  }

  // A comb row is a ridge its file names, read as the seats are: off the
  // node's own vertices, moved and scaled as the baked parts are.
  const combRows: Vector3[][] = [];
  for (let i = 1; i <= COMB_ROWS; i++) {
    const node = copy.getObjectByName(`comb_${String(i).padStart(2, '0')}`);
    if (node === undefined) continue;
    const vertices: Vector3[] = [];
    node.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const at = child.geometry.getAttribute('position');
      for (let v = 0; v < at.count; v++) {
        vertices.push(
          new Vector3()
            .fromBufferAttribute(at, v)
            .applyMatrix4(child.matrixWorld)
            .sub(new Vector3(centre.x, box.min.y, centre.z))
            .multiplyScalar(scale)
        );
      }
    });
    const line = combRowLine(vertices);
    if (line.length > 0) combRows.push(line);
  }

  const sway: SwayUniforms | null =
    swayM > 0 ? { uSwayTime: { value: 0 }, uSwayAmpM: { value: swayM } } : null;

  // A lantern needs its lip, which its seats ring: a file with no seat is
  // drawn as a body in the world's light, and never as a membrane with no lip.
  const shape = worldLit === 'lantern' ? jellyShape({ heightM, photophores }) : null;
  const jelly = shape === null ? undefined : { uniforms: jellyUniforms(shape), shape };
  // The footprint is a manta's span, so half of it is where a tip stands.
  const manta = worldLit === 'wing' ? { uniforms: mantaUniforms(footprintM / 2) } : undefined;
  // A comb jelly needs its rows: a file that marks none is drawn as a body
  // in the world's light, and never as a membrane with no seam.
  const comb =
    worldLit === 'comb' && combRows.length > 0 ? { uniforms: combUniforms(heightM) } : undefined;

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
    if (jelly !== undefined) {
      // The bell is the part in the swimmers' flank; the lobes under it and
      // the seats are the darker material, and a plainer light.
      const part = (child.material as Material).name === 'fish_flank' ? 'bell' : 'core';
      parts.push({
        geometry: smoothMembrane(geometry),
        material: jellyMembrane(part, jelly.uniforms),
      });
      geometry.dispose();
      return;
    }
    if (comb !== undefined) {
      // The mouth stays dark: undrawn, and no triangle of the instance's count.
      if ((child.material as Material).name === COMB_MOUTH) {
        triangles -= Math.floor((geometry.index?.count ?? position.count) / 3);
        geometry.dispose();
        return;
      }
      // The skin is the part in the swimmers' flank; the comb rows' ridges
      // are the darker material, and the light.
      const part = (child.material as Material).name === 'fish_flank' ? 'skin' : 'rows';
      parts.push({
        geometry: smoothMembrane(geometry),
        material: combMembrane(part, comb.uniforms),
      });
      geometry.dispose();
      return;
    }
    const material = child.material as Material;
    if (sway !== null) {
      const weights = new Float32Array(position.count);
      for (let i = 0; i < position.count; i++) weights[i] = swayWeight(position.getY(i), heightM);
      geometry.setAttribute('swayWeight', new Float32BufferAttribute(weights, 1));
      patchSway(material, sway);
    }
    if (look === 'sorrowgate') installPropSurface(material);
    // After patchSway, which replaces onBeforeCompile rather than chaining it.
    if (material instanceof MeshStandardMaterial && material.emissive.getHex() !== 0) {
      keepGlowOutsideToneMapping(material);
    }
    // A body in the world's light: opaque and standard, as a hull's cladding
    // is told (rosterModels.ts `isCladding`). A blended part stays the
    // canvas's, where the world pass never draws it.
    if (
      worldLit &&
      material instanceof MeshStandardMaterial &&
      !material.transparent &&
      material.blending === NormalBlending
    ) {
      installLifeLight(material);
      // After the light, so the light reads where the stroke lifted the wing.
      if (manta !== undefined) installMantaWing(material, manta.uniforms);
    }
    // Last: it wraps the glow's surface term (veilShading.ts).
    installPropVeil(material);
    // The arch study's distance grade (§11) on the prologue's props, after
    // the fog it extends; the landmark's templates never come through here.
    if (look === 'sorrowgate' && ARCH_STUDY_ON) installDistanceGrade(material);
    parts.push({ geometry, material });
  });
  // Belly and back are two parts and one skin: smoothed together.
  if (manta !== undefined) {
    const skins = parts.map((part) => part.geometry);
    smoothSkin(skins);
    wingThickness(skins);
  }
  return {
    parts,
    trianglesPerInstance: triangles,
    sway,
    heightM,
    photophores,
    photophoreFacings,
    jelly,
    manta,
    combRows,
    comb,
  };
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
  onReady: () => void,
  look: WorldLook = 'standard',
  worldLit: WorldLit = false
): EnvTemplate | null {
  // The High template of a body is another object under another key, so
  // Low's is never patched and a view at either quality finds its own.
  const key = `${slug}:${look}${worldLit !== false ? ':high' : ''}`;
  const cached = templates.get(key);
  if (cached !== undefined) {
    waiting.get(key)?.add(onReady);
    return cached;
  }
  const load = loadEnvModel(slug);
  if (load === null) {
    templates.set(key, null);
    return null;
  }
  templates.set(key, null);
  const listeners = new Set([onReady]);
  waiting.set(key, listeners);
  const started = generation;
  load
    .then((scene) => buildTemplate(scene, footprintM, swayM, look, worldLit))
    .then(
      (template) => {
        if (started !== generation) return;
        templates.set(key, template);
        waiting.delete(key);
        for (const notify of listeners) notify();
        settle(key);
      },
      (error: unknown) => {
        if (started !== generation) return;
        waiting.delete(key);
        console.warn(`Environment model ${slug} failed; retaining terrain-only fallback.`, error);
        // Not the layer's news — it keeps its terrain-only fallback with no
        // rebuild — but a launch preparing the model stops waiting on it.
        settle(key);
      }
    );
  return null;
}

/**
 * Who is waiting for a load to end either way, by template key: a launch's
 * preparation (`whenEnvTemplatesReady`). Apart from `waiting`, whose
 * listeners hear only a template that loaded, so a failure still rebuilds no
 * layer.
 */
const settling = new Map<string, Set<() => void>>();

function settle(key: string): void {
  const waiters = settling.get(key);
  settling.delete(key);
  for (const done of waiters ?? []) done();
}

/**
 * Settles once every named prop's template has loaded or failed, in `look`:
 * a launch's preparation (docs/world-map.md §7.6, `prepareRegion`). One the
 * page already holds, or has no model for, is ready at once.
 */
export function whenEnvTemplatesReady(
  props: readonly { slug: string; footprintM: number; swayM: number }[],
  look: WorldLook
): Promise<void> {
  return Promise.all(
    props.map(
      (prop) =>
        new Promise<void>((resolve) => {
          const key = `${prop.slug}:${look}`;
          envTemplate(prop.slug, prop.footprintM, prop.swayM, () => {}, look);
          if (!waiting.has(key)) {
            resolve();
            return;
          }
          const waiters = settling.get(key) ?? new Set();
          waiters.add(resolve);
          settling.set(key, waiters);
        })
    )
  ).then(() => undefined);
}

/** For tests: hand the cache a template built from a parsed file, as Low's of `look`. */
export function primeEnvTemplate(
  slug: string,
  template: EnvTemplate,
  look: WorldLook = 'standard'
): void {
  templates.set(`${slug}:${look}`, template);
}

/** For tests and teardown: forget every cached template. */
export function resetEnvironmentModels(): void {
  generation++;
  templates.clear();
  waiting.clear();
  // A load forgotten here never reports; nobody may wait on it for good.
  for (const key of [...settling.keys()]) settle(key);
}
