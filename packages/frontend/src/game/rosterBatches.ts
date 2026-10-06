/**
 * Own models drawn instanced — docs/graphics-standards.md gate 6, "The berth
 * ceiling" (#1027, #1079).
 *
 * A commander may hold forty berths, and `mergeByMaterial` leaves a model one
 * mesh per material, so a force drawn entity by entity spent a call per
 * material per hull: forty six-material Beacons were 240 calls of the frame's
 * 150. That cost was the CPU's, not the GPU's (gate 6 has the readings), so
 * every own entity of one template — kind, navy, look and palette — draws here
 * as one `InstancedMesh` per material, however many of it there are.
 *
 * An entity keeps its own `RosterModelInstance`. Its root is a transform the
 * view moves and this class reads, and its meshes, never drawn, stay where the
 * lamp halo, the lamp reading and the Dream Loop look for its lamps. What it no
 * longer owns is a lamp material: gate 3 still dims each hull's lamps by its
 * own live SIG, as the `instanceGlow` attribute (modelLighting.ts).
 *
 * A batch's bounds are recomputed after any of its slots moves, so a kind with
 * nothing on screen is still culled whole. The props and the ordnance turn
 * culling off instead (environmentLayer.ts, ordnanceLayer.ts); their instances
 * never move or are spent in seconds, and a hull's bounds are cheap to keep.
 */
import {
  BufferGeometry,
  DynamicDrawUsage,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  type Material,
  type MeshStandardMaterial,
  type Object3D,
} from 'three';
import { markLamp } from './lampHaloPass.ts';
import type { RosterModelInstance, Template } from './rosterModels.ts';

/** Slots a batch starts with; it doubles when a kind outgrows them. */
const FIRST_CAPACITY = 4;

const MATRIX = new Matrix4();

/** One template mesh, drawn for every instance of the batch. */
interface Part {
  readonly mesh: InstancedMesh;
  /** The slots it draws from, which it shares with every part at its transform. */
  readonly frame: Frame;
  /** Whether it draws a lamp, and so reads the batch's glow. */
  readonly lit: boolean;
}

/**
 * Every instance's matrix for the parts at one transform under the model's
 * root. `mergeByMaterial` leaves its merged parts at one transform, so a batch
 * usually holds a single frame however many materials it draws.
 */
interface Frame {
  /** The parts' transform under their model's root, the same for every instance. */
  readonly local: Matrix4;
  readonly matrices: InstancedBufferAttribute;
}

/** What `markLamps` marks in the canvas stencil (lampHaloPass.ts `markLamp`). */
export type LampMark = 'all' | 'none' | RosterModelInstance;

/**
 * Every instance of one template, one `InstancedMesh` a part. A solo batch
 * holds one instance with lamp materials of its own, so it can be marked
 * while its siblings are not (`RosterBatches.markLamps`).
 */
class Batch {
  readonly instances: RosterModelInstance[] = [];
  /** The materials this batch draws its lamps with, which the stencil marks. */
  readonly lamps: readonly MeshStandardMaterial[];
  private parts: Part[] = [];
  private frames: Frame[] = [];
  /** Each instance's gate-3 factor, which every lamp part reads; null without a lamp. */
  private glow: InstancedBufferAttribute | null = null;
  private capacity = FIRST_CAPACITY;
  private readonly materials: Map<Material, Material>;

  constructor(
    readonly template: Template,
    private readonly group: Group,
    readonly solo: boolean
  ) {
    // A solo copy takes the template lamp's shader hooks by reference, since
    // clone() drops them and they are pure string patches of the program.
    this.materials = new Map(
      template.emissives.map(({ material }) => {
        if (!solo) return [material, material];
        const own = material.clone();
        own.onBeforeCompile = material.onBeforeCompile;
        own.customProgramCacheKey = material.customProgramCacheKey;
        return [material, own];
      })
    );
    this.lamps = [...this.materials.values()] as MeshStandardMaterial[];
    this.build();
  }

  add(instance: RosterModelInstance): number {
    if (this.instances.length === this.capacity) {
      this.capacity *= 2;
      this.build();
    }
    this.instances.push(instance);
    this.setCount();
    return this.instances.length - 1;
  }

  /**
   * Take an instance out: the last one moves into its slot, so the drawn range
   * stays dense. Returns the instance that moved, if one did.
   */
  remove(index: number): RosterModelInstance | null {
    const last = this.instances.pop()!;
    let moved: RosterModelInstance | null = null;
    if (index < this.instances.length) {
      this.instances[index] = last;
      this.write(index);
      moved = last;
    }
    this.setCount();
    return moved;
  }

  /**
   * Write one slot from its instance's root and glow, uploading only what
   * changed. The view places every own hull every frame, and on the named GPU
   * the uploads are canvas-pass time (#1114): a whole buffer a part a hull,
   * every frame, read 0.13–0.20 ms over the per-entity frame at gate 6's close
   * camera. So a slot that holds its value is not written, a written one sends
   * its own bytes, and the parts at one transform share a buffer, so a hull
   * that moves is usually one upload a frame, not one a material.
   */
  write(index: number): void {
    const instance = this.instances[index]!;
    // The root has no parent, so this also brings its meshes' world matrices
    // up to date for the halo and the lamp reading, which read them after.
    instance.root.updateMatrixWorld(true);
    for (const frame of this.frames) {
      MATRIX.multiplyMatrices(instance.root.matrixWorld, frame.local);
      const { matrices } = frame;
      if (holds(matrices.array, index * 16, MATRIX.elements)) continue;
      MATRIX.toArray(matrices.array, index * 16);
      matrices.addUpdateRange(index * 16, 16);
      matrices.needsUpdate = true;
      for (const part of this.parts) if (part.frame === frame) part.mesh.boundingSphere = null;
    }
    const glow = this.glow;
    if (glow !== null && glow.getX(index) !== Math.fround(instance.glow)) {
      glow.setX(index, instance.glow);
      glow.addUpdateRange(index, 1);
      glow.needsUpdate = true;
    }
  }

  /** The gate-3 factor a slot's lamps draw at, or null without a lamp. */
  glowAt(index: number): number | null {
    return this.glow === null ? null : this.glow.getX(index);
  }

  dispose(): void {
    this.clear();
    // A shared batch's lamps are the template's and outlive it: they leave
    // unmarked, so a kind built again with the halo off writes no stencil.
    for (const lamp of this.lamps) markLamp(lamp, false);
    if (this.solo) for (const lamp of this.lamps) lamp.dispose();
  }

  /** (Re)build every part at the current capacity, and write what it holds. */
  private build(): void {
    this.clear();
    const root = this.template.root;
    root.updateMatrixWorld(true);
    root.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const source = child.material as Material | Material[];
      const materials = Array.isArray(source) ? source : [source];
      const drawn = materials.map((m) => this.materials.get(m) ?? m);
      const lit = materials.some((m) => this.materials.has(m));
      let geometry = child.geometry as BufferGeometry;
      if (lit) {
        // The template's buffers, shared, and this batch's glow beside them.
        geometry = shareBuffers(geometry);
        if (this.glow === null) {
          this.glow = new InstancedBufferAttribute(new Float32Array(this.capacity).fill(1), 1);
          this.glow.setUsage(DynamicDrawUsage);
        }
        geometry.setAttribute('instanceGlow', this.glow);
      }
      const mesh = new InstancedMesh(
        geometry,
        Array.isArray(source) ? drawn : drawn[0]!,
        this.capacity
      );
      const frame = this.frameAt(localMatrix(root, child));
      mesh.instanceMatrix = frame.matrices;
      mesh.name = `own_${child.name || 'part'}_${this.parts.length}`;
      this.parts.push({ mesh, frame, lit });
      this.group.add(mesh);
    });
    for (let i = 0; i < this.instances.length; i++) this.write(i);
    // New buffers go up whole on their first draw, so these writes need no
    // ranges of their own; left, they would ride along with the next upload.
    for (const { matrices } of this.frames) matrices.clearUpdateRanges();
    this.glow?.clearUpdateRanges();
    this.setCount();
  }

  /** The frame for parts at `local`, made the first time a part needs it. */
  private frameAt(local: Matrix4): Frame {
    let frame = this.frames.find((f) => f.local.equals(local));
    if (frame === undefined) {
      const matrices = new InstancedBufferAttribute(new Float32Array(this.capacity * 16), 16);
      matrices.setUsage(DynamicDrawUsage);
      frame = { local, matrices };
      this.frames.push(frame);
    }
    return frame;
  }

  private setCount(): void {
    const count = this.instances.length;
    for (const { mesh } of this.parts) {
      mesh.count = count;
      mesh.visible = count > 0;
      mesh.boundingSphere = null;
    }
  }

  private clear(): void {
    for (const { mesh, lit } of this.parts) {
      this.group.remove(mesh);
      mesh.dispose();
      if (lit) {
        // Only the glow is this batch's: let go of the shared buffers first,
        // or disposing the geometry would delete them under the template.
        const geometry = mesh.geometry;
        for (const name of Object.keys(geometry.attributes)) {
          if (name !== 'instanceGlow') geometry.deleteAttribute(name);
        }
        geometry.setIndex(null);
        geometry.dispose();
      }
    }
    this.parts = [];
    this.frames = [];
    this.glow = null;
  }
}

/** Whether `array` holds `matrix` at `offset`, compared as the buffer stores it. */
function holds(array: ArrayLike<number>, offset: number, matrix: ArrayLike<number>): boolean {
  for (let i = 0; i < 16; i++) if (array[offset + i] !== Math.fround(matrix[i]!)) return false;
  return true;
}

/** A geometry over another's index and attributes, for one more attribute. */
function shareBuffers(source: BufferGeometry): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setIndex(source.index);
  for (const [name, attribute] of Object.entries(source.attributes)) {
    geometry.setAttribute(name, attribute);
  }
  for (const { start, count, materialIndex } of source.groups) {
    geometry.addGroup(start, count, materialIndex);
  }
  geometry.boundingSphere = source.boundingSphere?.clone() ?? null;
  geometry.boundingBox = source.boundingBox?.clone() ?? null;
  return geometry;
}

/** A mesh's transform under `root`, root's own excluded. */
function localMatrix(root: Object3D, mesh: Object3D): Matrix4 {
  const local = mesh.matrix.clone();
  for (let node = mesh.parent; node !== null && node !== root; node = node.parent) {
    local.premultiply(node.matrix);
  }
  return local;
}

/**
 * The view's own models, batched by template. The view attaches an instance
 * when its model is ready, places it whenever it moves its root or its glow,
 * and detaches it when the entity goes.
 */
export class RosterBatches {
  /** Added to the scene once by the view. */
  readonly group = new Group();
  private readonly shared = new Map<Template, Batch>();
  private readonly slots = new Map<RosterModelInstance, { batch: Batch; index: number }>();
  private solo: Batch | null = null;

  attach(instance: RosterModelInstance): void {
    if (this.slots.has(instance)) return;
    let batch = this.shared.get(instance.template);
    if (batch === undefined) {
      batch = new Batch(instance.template, this.group, false);
      this.shared.set(instance.template, batch);
    }
    this.slots.set(instance, { batch, index: batch.add(instance) });
    this.place(instance);
  }

  detach(instance: RosterModelInstance): void {
    const slot = this.slots.get(instance);
    if (slot === undefined) return;
    this.slots.delete(instance);
    const moved = slot.batch.remove(slot.index);
    if (moved !== null) this.slots.get(moved)!.index = slot.index;
    if (slot.batch.instances.length > 0) return;
    // An empty batch is let go: a kind with nothing left keeps no meshes.
    slot.batch.dispose();
    if (slot.batch === this.solo) this.solo = null;
    else this.shared.delete(slot.batch.template);
  }

  /** Write an instance's slot from its root and its glow, after either changed. */
  place(instance: RosterModelInstance): void {
    const slot = this.slots.get(instance);
    if (slot !== undefined) slot.batch.write(slot.index);
  }

  /**
   * The gate-3 factor an instance's lamps are drawn at: what its slot holds,
   * which is its `glow` as of the last `place`. Null when it is not attached
   * or has no lamp. The lamp reading reports this, not the instance's own.
   */
  glowAt(instance: RosterModelInstance): number | null {
    const slot = this.slots.get(instance);
    return slot === undefined ? null : slot.batch.glowAt(slot.index);
  }

  /**
   * Mark lamps in the canvas stencil while the halo is on (lampHaloPass.ts):
   * every batch's, none, or one instance's alone. That one draws from a solo
   * batch with lamp materials of its own, so the same-kind siblings sharing
   * its batch stay unmarked (`__perspectiveHaloOnly`, development only).
   */
  markLamps(mark: LampMark): void {
    const alone = typeof mark === 'object' && this.slots.has(mark) ? mark : null;
    this.isolate(alone);
    for (const batch of this.batches()) {
      const on = mark === 'all' || (alone !== null && batch.solo);
      for (const lamp of batch.lamps) markLamp(lamp, on);
    }
  }

  /** Instances attached, and the meshes that draw them (gate 6's probe). */
  stats(): { instances: number; meshes: number } {
    let meshes = 0;
    for (const child of this.group.children) if (child.visible) meshes++;
    return { instances: this.slots.size, meshes };
  }

  dispose(): void {
    for (const batch of this.batches()) batch.dispose();
    this.shared.clear();
    this.slots.clear();
    this.solo = null;
  }

  private *batches(): Generator<Batch> {
    yield* this.shared.values();
    if (this.solo !== null) yield this.solo;
  }

  /** Draw one instance from a solo batch, or none; the rest from their own. */
  private isolate(instance: RosterModelInstance | null): void {
    const current = this.solo?.instances[0] ?? null;
    if (current === instance) return;
    if (current !== null) {
      this.detach(current);
      this.attach(current);
    }
    if (instance === null) return;
    this.detach(instance);
    this.solo = new Batch(instance.template, this.group, true);
    this.slots.set(instance, { batch: this.solo, index: this.solo.add(instance) });
    this.place(instance);
  }
}
