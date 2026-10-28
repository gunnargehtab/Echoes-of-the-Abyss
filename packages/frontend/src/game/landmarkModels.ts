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
  for (const material of clones.values()) {
    if (look === 'sorrowgate') installPropSurface(material);
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
  return { slug: spec.slug, states };
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
