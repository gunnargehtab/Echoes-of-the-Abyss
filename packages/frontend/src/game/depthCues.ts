/**
 * The depth cues of the conn view — every own hull's plumb line to the seabed
 * and its ground shadow — as two draw calls instead of two per hull (#434).
 *
 * A hull's height above its own shadow *is* its depth (docs/ui-ux.md §12),
 * so every own entity carries a plumb and a shadow, and each used to be its
 * own `Line` and `Mesh`: two unbatched draw calls per hull, ninety-six at the
 * berth ceiling, against the ≤150 whole-frame budget docs/graphics-standards.md
 * sets with thirty already reserved for the prop layer. All the plumbs are
 * one `LineSegments` here and all the shadows one `InstancedMesh`, each
 * entity holding a slot in both, updated in place from wherever the view
 * puts the hull — the same instancing argument the environment layer makes,
 * applied to the fleet.
 *
 * Slots are recycled rather than compacted: a released slot is zeroed (a
 * zero-length segment and a zero-scale disc draw nothing) and handed to the
 * next entity, so the buffers never shuffle and a handle's slot is stable for
 * the life of the entity. The draw range and instance count cover the
 * high-water mark, which is bounded by the most entities alive at once.
 */

import {
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  MeshBasicMaterial,
} from 'three';

const TMP_MATRIX = new Matrix4();
const HIDDEN = new Matrix4().makeScale(0, 0, 0);

export class DepthCues {
  /** Added to the scene once by the view; its two children are replaced on growth. */
  readonly group = new Group();

  private capacity: number;
  private plumbs!: LineSegments;
  private plumbPositions!: BufferAttribute;
  private shadows!: InstancedMesh;
  /** One past the highest slot ever handed out — what the draw covers. */
  private highWater = 0;
  private readonly free: number[] = [];
  private live = 0;

  private readonly plumbMaterial: LineBasicMaterial;
  private readonly shadowMaterial: MeshBasicMaterial;
  /** Lying flat: the instance matrix then only translates and scales in plane. */
  private readonly disc = new CircleGeometry(1, 20).rotateX(-Math.PI / 2);

  constructor(accent: number, capacity = 64) {
    this.capacity = Math.max(1, capacity);
    // The interface voice for the plumb, because depth here is information,
    // not threat; a soft black disc for the shadow. Both exactly what the
    // per-hull objects carried, so the register does not move.
    this.plumbMaterial = new LineBasicMaterial({ color: accent, transparent: true, opacity: 0.22 });
    this.shadowMaterial = new MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });
    this.build();
  }

  /** How many entities currently hold a slot. */
  get count(): number {
    return this.live;
  }

  /** Slots the buffers can hold before the next growth. */
  get slotCapacity(): number {
    return this.capacity;
  }

  /** Claim a slot. Grows the buffers when every slot is taken. */
  allocate(): number {
    this.live++;
    const recycled = this.free.pop();
    if (recycled !== undefined) return recycled;
    if (this.highWater === this.capacity) this.grow(this.capacity * 2);
    const slot = this.highWater++;
    this.plumbs.geometry.setDrawRange(0, this.highWater * 2);
    this.shadows.count = this.highWater;
    return slot;
  }

  /** Give a slot back: its cues vanish and the slot is reused next. */
  release(slot: number): void {
    this.live--;
    this.plumbPositions.setXYZ(slot * 2, 0, 0, 0);
    this.plumbPositions.setXYZ(slot * 2 + 1, 0, 0, 0);
    this.plumbPositions.needsUpdate = true;
    this.shadows.setMatrixAt(slot, HIDDEN);
    this.shadows.instanceMatrix.needsUpdate = true;
    this.free.push(slot);
  }

  /**
   * The plumb from the hull down to the ground. Never scaled — its length is
   * the depth, and a scaled plumb would be the one place the readability
   * factor told a lie.
   */
  setPlumb(slot: number, x: number, hullY: number, groundY: number, z: number): void {
    this.plumbPositions.setXYZ(slot * 2, x, hullY, z);
    this.plumbPositions.setXYZ(slot * 2 + 1, x, groundY, z);
    this.plumbPositions.needsUpdate = true;
  }

  /** The shadow disc on the ground under the hull, at the drawn radius. */
  setShadow(slot: number, x: number, groundY: number, z: number, radius: number): void {
    TMP_MATRIX.makeScale(radius, 1, radius);
    TMP_MATRIX.setPosition(x, groundY, z);
    this.shadows.setMatrixAt(slot, TMP_MATRIX);
    this.shadows.instanceMatrix.needsUpdate = true;
  }

  /** Read back a plumb's two ends, for the harness and the tests. */
  plumbAt(slot: number): { x: number; hullY: number; groundY: number; z: number } {
    const p = this.plumbPositions;
    return {
      x: p.getX(slot * 2),
      hullY: p.getY(slot * 2),
      groundY: p.getY(slot * 2 + 1),
      z: p.getZ(slot * 2),
    };
  }

  /** Read back a shadow's placement and radius, for the harness and the tests. */
  shadowAt(slot: number): { x: number; groundY: number; z: number; radius: number } {
    this.shadows.getMatrixAt(slot, TMP_MATRIX);
    const e = TMP_MATRIX.elements;
    return { x: e[12]!, groundY: e[13]!, z: e[14]!, radius: e[0]! };
  }

  dispose(): void {
    this.group.remove(this.plumbs, this.shadows);
    this.plumbs.geometry.dispose();
    this.shadows.dispose();
    this.disc.dispose();
    this.plumbMaterial.dispose();
    this.shadowMaterial.dispose();
  }

  private build(): void {
    const positions = new BufferAttribute(new Float32Array(this.capacity * 2 * 3), 3);
    positions.setUsage(DynamicDrawUsage);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', positions);
    geometry.setDrawRange(0, this.highWater * 2);
    this.plumbs = new LineSegments(geometry, this.plumbMaterial);
    this.plumbPositions = positions;

    this.shadows = new InstancedMesh(this.disc, this.shadowMaterial, this.capacity);
    this.shadows.instanceMatrix.setUsage(DynamicDrawUsage);
    this.shadows.count = this.highWater;
    for (let i = 0; i < this.capacity; i++) this.shadows.setMatrixAt(i, HIDDEN);

    // One mesh spans the whole map, so per-object culling would only ever
    // flicker the lot off at the edge of the frustum — the environment layer
    // makes the same call for the same reason.
    this.plumbs.frustumCulled = false;
    this.shadows.frustumCulled = false;
    this.group.add(this.plumbs, this.shadows);
  }

  /** Double the buffers, carrying every live slot across. Rare: it happens
   * only when more entities are alive at once than ever before. */
  private grow(capacity: number): void {
    const oldPlumbs = this.plumbs;
    const oldPositions = this.plumbPositions;
    const oldShadows = this.shadows;
    const highWater = this.highWater;

    this.capacity = capacity;
    this.build();
    (this.plumbPositions.array as Float32Array).set(
      (oldPositions.array as Float32Array).subarray(0, highWater * 2 * 3)
    );
    for (let i = 0; i < highWater; i++) {
      oldShadows.getMatrixAt(i, TMP_MATRIX);
      this.shadows.setMatrixAt(i, TMP_MATRIX);
    }
    this.plumbPositions.needsUpdate = true;
    this.shadows.instanceMatrix.needsUpdate = true;

    this.group.remove(oldPlumbs, oldShadows);
    oldPlumbs.geometry.dispose();
    oldShadows.dispose();
  }
}
