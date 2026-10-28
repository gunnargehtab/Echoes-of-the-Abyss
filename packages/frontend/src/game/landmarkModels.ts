/**
 * A public landmark's model, ready to stand — docs/asset-prompts-3d.md Block
 * 4b; docs/graphics-standards.md gate 1 "Public landmarks" and gate 6's study
 * line; docs/sorrowgate-arch-study.md §7 (#1637).
 *
 * A landmark is the one environment model the prop template path cannot
 * serve (environmentModels.ts `buildTemplate`): that path merges every node
 * of a file into one geometry a material, centres it and lifts its base to
 * y 0, which is right for a scattered prop and wrong for the arch three ways.
 * The arch holds two states on one origin and draws one at a time; its origin
 * is the anchor cell's floor and its foundations stand 30 m under it, so a
 * lift would float the piers; and the runtime reads named nodes off it — the
 * lamps' glass, where silt falls from, the hung fittings' pivots and the
 * debris's start heights — which a merge forgets.
 *
 * So each state is merged by material on its own, in model space with the
 * origin kept, into at most the row's draw calls (four: one a material, gate
 * 6), and what the nodes said is recorded beside the geometry: every named
 * node's position in model metres and the extras a node carries. The
 * materials take the same hooks a prop's do, since the runtime owns value
 * (style-neon-noir.md "The props"): the luminance ceiling, the look's stone
 * surface, glow outside the tone curve on the lamp glass, and the veil last.
 */
import {
  Box3,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { LandmarkState } from '@echoes/shared';
import type { LandmarkSpec } from './environment.ts';
import { loadEnvModel, normaliseLuminance, propFootprint } from './environmentModels.ts';
import { installPropSurface, type WorldLook } from './tutorialLook.ts';
import { keepGlowOutsideToneMapping } from './modelLighting.ts';
import { installPropVeil } from './veilShading.ts';
import { CIVIC_LAMP } from './palette.ts';
import {
  FALL_ATTRIBUTE,
  FALL_COUNT,
  HANG_ATTRIBUTE,
  HANG_PHASE_ATTRIBUTE,
  hangMotion,
  installFallDrop,
  installHangSway,
  installLampLevels,
  installLampPools,
  LAMP_INDEX_ATTRIBUTE,
  landmarkUniforms,
  type LandmarkUniforms,
} from './landmarkLight.ts';

/** The root group names Block 4b gives the two states. */
export const STATE_NODE: Record<LandmarkState, string> = {
  intact: 'state_intact',
  ruined: 'state_ruined',
};

/** One state, merged: a part a material, each in model metres about the origin. */
export interface LandmarkStateTemplate {
  parts: { geometry: BufferGeometry; material: Material }[];
  /** Triangles the state draws: gate 6's ledger, held to the row by a test. */
  triangles: number;
  /**
   * Every named node under the state, by name, at its position in model
   * metres: `lamp_0`'s glass centre, a `sift_*` site, a `hang_*` pivot, a
   * `fall_*` piece at rest. What the study's light and motion read.
   */
  nodes: Map<string, Vector3>;
  /** The extras a node carried: `fall_*`'s `startAboveRestM` (Block 4b). */
  extras: Map<string, Record<string, unknown>>;
}

export interface LandmarkTemplate {
  slug: string;
  states: Record<LandmarkState, LandmarkStateTemplate>;
  /**
   * The light and motion uniforms the template's materials share
   * (landmarkLight.ts), written by the layer that stands it. Present under
   * the prologue's look alone, where the study's licence holds; elsewhere the
   * materials carry no patch and the handle is null.
   */
  uniforms: LandmarkUniforms | null;
}

/** The lamps' glass centres in model metres, from the `lamp_*` nodes, in index order. */
export function lampCentres(state: LandmarkStateTemplate): Vector3[] {
  const out: Vector3[] = [];
  for (let i = 0; ; i++) {
    const at = state.nodes.get(`lamp_${i}`);
    if (at === undefined) return out;
    out.push(at);
  }
}

/** Where silt falls from, model metres: the `sift_*` (intact) or `sift_r*` (ruined) nodes. */
export function siftSites(state: LandmarkStateTemplate, which: LandmarkState): Vector3[] {
  const out: Vector3[] = [];
  const prefix = which === 'intact' ? 'sift_' : 'sift_r';
  for (let i = 0; ; i++) {
    const at = state.nodes.get(`${prefix}${i}`);
    if (at === undefined) return out;
    out.push(at);
  }
}

/**
 * The template from a parsed file: exported for the test that holds it to
 * Block 4b and to intake's counts. `look` picks the material hooks, as it
 * does for a prop's template.
 */
export function buildLandmarkTemplate(
  scene: Group,
  spec: LandmarkSpec,
  look: WorldLook = 'standard'
): LandmarkTemplate {
  // Clone materials through an identity map, so a material two states share
  // stays one material and one draw call's program.
  const clones = new Map<Material, Material>();
  const cloneOf = (material: Material): Material => {
    let clone = clones.get(material);
    if (clone === undefined) {
      clone = material.clone();
      clones.set(material, clone);
    }
    return clone;
  };
  const copy = scene.clone(true);
  copy.traverse((child) => {
    if (child instanceof Mesh && !Array.isArray(child.material)) {
      child.material = cloneOf(child.material);
    }
  });
  normaliseLuminance(clones.values());
  // The study's light and motion ride the prologue's look alone (§7
  // "Isolation"): under it the stone takes the lamp pools, the ribs the sway,
  // every ruined part the debris's drop, and the glass its lamp's level.
  // Installed before the glow and the veil, which wrap what the pools add.
  // A later patch's text lands before an earlier one's, so the pools go in
  // first and read the position after every displacement.
  const uniforms = look === 'sorrowgate' ? landmarkUniforms(lampHue()) : null;
  for (const material of clones.values()) {
    if (look === 'sorrowgate') installPropSurface(material);
    if (uniforms !== null) {
      if (material.name === 'civic_lamp') {
        installLampLevels(material, uniforms);
      } else {
        installLampPools(material, uniforms);
        installFallDrop(material, uniforms);
        if (material.name === 'structure_rib') installHangSway(material, uniforms);
      }
    }
    if (material instanceof MeshStandardMaterial && material.emissive.getHex() !== 0) {
      keepGlowOutsideToneMapping(material);
    }
    // Last: it wraps the glow's surface term (veilShading.ts).
    installPropVeil(material);
  }

  // Held to its footprint as a prop is (environmentModels.ts
  // `propFootprint`): the arch is metre-true, so this is ×1, and a file that
  // was not would draw at the size intake reviewed rather than its own.
  const footprint = propFootprint(copy);
  const scale = footprint > 0 ? spec.footprintM / footprint : 1;
  copy.updateMatrixWorld(true);
  // The origin is the file's, never the box's: model space is the contract.
  const rootInverse = copy.matrixWorld.clone().invert();

  const states = {} as Record<LandmarkState, LandmarkStateTemplate>;
  for (const state of ['intact', 'ruined'] as const) {
    const root = copy.getObjectByName(STATE_NODE[state]);
    states[state] = root === undefined ? emptyState() : mergeState(root, rootInverse, scale);
  }
  if (uniforms !== null) {
    // The pools' lamps: the intact state's glass centres, model metres, at
    // the steady level; the layer steps each level with its lamp.
    const lamps = lampCentres(states.intact);
    uniforms.uPoolCount.value = Math.min(lamps.length, uniforms.uLampLevel.value.length);
    lamps.forEach((at, i) => {
      if (i >= uniforms.uPoolCount.value) return;
      uniforms.uPool.value.set([at.x, at.y, at.z, 1], i * 4);
    });
  }
  return { slug: spec.slug, states, uniforms };
}

/** The civic lamp's hue, linear, for the stone under it (palette.ts `CIVIC_LAMP`). */
function lampHue(): [number, number, number] {
  const r = ((CIVIC_LAMP >> 16) & 0xff) / 255;
  const g = ((CIVIC_LAMP >> 8) & 0xff) / 255;
  const b = (CIVIC_LAMP & 0xff) / 255;
  const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return [linear(r), linear(g), linear(b)];
}

function emptyState(): LandmarkStateTemplate {
  return { parts: [], triangles: 0, nodes: new Map(), extras: new Map() };
}

function mergeState(root: Object3D, rootInverse: Object3D['matrixWorld'], scale: number) {
  const buckets = new Map<Material, BufferGeometry[]>();
  const nodes = new Map<string, Vector3>();
  const extras = new Map<string, Record<string, unknown>>();
  let triangles = 0;
  root.traverse((child) => {
    if (child === root) return;
    // In model space: the node's world matrix with the file's root divided out.
    const inModel = child.matrixWorld.clone().premultiply(rootInverse);
    if (child.name !== '') {
      nodes.set(child.name, new Vector3().setFromMatrixPosition(inModel).multiplyScalar(scale));
      if (Object.keys(child.userData).length > 0) extras.set(child.name, { ...child.userData });
    }
    if (!(child instanceof Mesh) || Array.isArray(child.material)) return;
    const geometry = (child.geometry as BufferGeometry).clone();
    // What the study's shaders read off a vertex, laid before the node's
    // transform is baked in, since a hung fitting's weight is its depth below
    // the node's own origin, the pivot (landmarkLight.ts).
    layMotionAttributes(geometry, child.name, child.userData);
    geometry.applyMatrix4(inModel);
    geometry.scale(scale, scale, scale);
    const position = geometry.getAttribute('position');
    triangles += Math.floor((geometry.index?.count ?? position.count) / 3);
    const bucket = buckets.get(child.material as Material);
    if (bucket === undefined) buckets.set(child.material as Material, [geometry]);
    else bucket.push(geometry);
  });
  const parts: LandmarkStateTemplate['parts'] = [];
  for (const [material, geometries] of buckets) {
    // Every arch part is non-indexed with position and normal alone
    // (ruin-transit-arch.mjs), so the merge never refuses a bucket; a file
    // that mixed the two would be flattened as rosterModels' merge does.
    if (geometries.some((g) => g.index !== null) && geometries.some((g) => g.index === null)) {
      for (let i = 0; i < geometries.length; i++) {
        if (geometries[i]!.index !== null) geometries[i] = geometries[i]!.toNonIndexed();
      }
    }
    const geometry = geometries.length === 1 ? geometries[0]! : mergeGeometries(geometries);
    if (geometry === null) throw new Error(`${root.name}: ${material.name} would not merge`);
    geometry.computeBoundingSphere();
    parts.push({ geometry, material });
  }
  return { parts, triangles, nodes, extras };
}

/**
 * Lay the study's per-vertex attributes on one node's geometry, every
 * geometry alike so a material's bucket merges: the lamp's index on a
 * `lamp_N`, the hung fitting's axis, period and weight on a `hang_N` (weight
 * zero at the pivot, one at its lowest point, quadratic between, as the
 * kelp's), the piece's start height and index on a `fall_N`, and zeros on
 * everything else, which the shaders read as "does not move".
 */
export function layMotionAttributes(
  geometry: BufferGeometry,
  name: string,
  userData: Record<string, unknown>
): void {
  const position = geometry.getAttribute('position');
  const n = position.count;
  const lamp = new Float32Array(n);
  const hang = new Float32Array(n * 4);
  const hangPhase = new Float32Array(n);
  const fall = new Float32Array(n * 2);
  let match = /^lamp_(\d+)$/.exec(name);
  if (match !== null) lamp.fill(Number(match[1]));
  match = /^hang_(\d+)$/.exec(name);
  if (match !== null) {
    const index = Number(match[1]);
    const { axis, periodS, phase } = hangMotion(index, HANG_SET);
    let lowest = 0;
    for (let i = 0; i < n; i++) lowest = Math.min(lowest, position.getY(i));
    for (let i = 0; i < n; i++) {
      const below = lowest < 0 ? Math.max(0, -position.getY(i)) / -lowest : 0;
      hang.set([axis[0], axis[1], periodS, below * below], i * 4);
      hangPhase[i] = phase;
    }
  }
  match = /^fall_(\d+)$/.exec(name);
  if (match !== null) {
    const start = userData['startAboveRestM'];
    const height = typeof start === 'number' && start > 0 ? start : 0;
    for (let i = 0; i < n; i++) fall.set([height, Number(match[1]) % FALL_COUNT], i * 2);
  }
  geometry.setAttribute(LAMP_INDEX_ATTRIBUTE, new Float32BufferAttribute(lamp, 1));
  geometry.setAttribute(HANG_ATTRIBUTE, new Float32BufferAttribute(hang, 4));
  geometry.setAttribute(HANG_PHASE_ATTRIBUTE, new Float32BufferAttribute(hangPhase, 1));
  geometry.setAttribute(FALL_ATTRIBUTE, new Float32BufferAttribute(fall, 2));
}

/** The hung fittings Block 4b gives the intact state, for spreading their axes. */
const HANG_SET = 6;

/** The bounds of a state's merged parts, model metres: for the tests and the probe. */
export function stateBounds(state: LandmarkStateTemplate): Box3 {
  const box = new Box3();
  for (const { geometry } of state.parts) {
    geometry.computeBoundingBox();
    box.union(geometry.boundingBox!);
  }
  return box;
}

/** Templates per slug and look; null marks "still loading" or failed. */
const templates = new Map<string, LandmarkTemplate | null>();
const waiting = new Map<string, Set<() => void>>();
let generation = 0;

/**
 * The template for a landmark, or null while it loads. `onReady` fires once
 * when the load completes, so the layer can rebuild and stand it — a landmark
 * enters on the terrain cadence, as a prop does — and a file that fails to
 * decode stays null: the ground stands without its landmark, which is the
 * prop layer's documented fallback (gate 1).
 */
export function landmarkTemplate(
  spec: LandmarkSpec,
  onReady: () => void,
  look: WorldLook = 'standard'
): LandmarkTemplate | null {
  const key = `${spec.slug}:${look}`;
  const cached = templates.get(key);
  if (cached !== undefined) {
    waiting.get(key)?.add(onReady);
    return cached;
  }
  const load = loadEnvModel(spec.slug);
  templates.set(key, null);
  if (load === null) return null;
  const listeners = new Set([onReady]);
  waiting.set(key, listeners);
  const started = generation;
  load.then(
    (scene) => {
      if (started !== generation) return;
      templates.set(key, buildLandmarkTemplate(scene, spec, look));
      waiting.delete(key);
      for (const notify of listeners) notify();
    },
    (error: unknown) => {
      if (started !== generation) return;
      waiting.delete(key);
      console.warn(`Landmark model ${spec.slug} failed; the ground stands without it.`, error);
    }
  );
  return null;
}

/** For tests: hand the cache a template built from a parsed file. */
export function primeLandmarkTemplate(template: LandmarkTemplate, look: WorldLook): void {
  templates.set(`${template.slug}:${look}`, template);
}

/** For tests and teardown: forget every cached template. */
export function resetLandmarkModels(): void {
  generation++;
  templates.clear();
  waiting.clear();
}
