/**
 * Ground-lying chart ink broken behind the models the conn view draws (#1557,
 * docs/map-visuals.md §5, "A mark on the ground passes behind a model").
 *
 * The mark layer is a Pixi canvas over the GL one, so a ring crossing a
 * structure was painted across its roof. The conn view's depth buffer would
 * answer "is this point behind a model" exactly, but only by a read back from
 * the GPU every frame: a stall, or a frame of lag on a moving hull, for a
 * question the CPU can answer from the models' own geometry. So each model is
 * read once into columns over its plan, and the chart asks the columns.
 *
 * A column runs from the lowest to the highest of the geometry over its cell.
 * That fills a hull's interior, which no line can be seen through anyway, and
 * keeps the open water under a keel or a raised deck open. Nothing here is
 * allocated per frame (#432): the chart asks this a few thousand times a frame
 * at the home frame.
 */
import {
  Box3,
  Matrix4,
  Mesh,
  Vector3,
  type BufferGeometry,
  type Material,
  type Object3D,
  type PerspectiveCamera,
} from 'three';

/**
 * Cells along a model's longer plan side. A 300 m Bastion's cell is 9 m, under
 * a pixel at the survey dolly and a few at the home frame, which is the scale a
 * break in a line is read at.
 */
export const COLUMNS_LONG = 32;

/**
 * How far short of the point the ray stops, metres. A point on a model's own
 * skin — a ring meeting a structure's footing — is not behind that skin.
 */
const SKIN_M = 1;

/** A model's solid, in its root's own space (before the root's transform). */
export interface ModelColumns {
  /** The solid's bounds, in the root's space. */
  readonly box: Box3;
  readonly cols: number;
  readonly rows: number;
  readonly cellX: number;
  readonly cellZ: number;
  /** Each cell's lowest and highest geometry; +∞ and −∞ where it has none. */
  readonly low: Float32Array;
  readonly high: Float32Array;
}

const VERTEX = new Vector3();
const A = new Vector3();
const B = new Vector3();
const C = new Vector3();
const RELATIVE = new Matrix4();
const ROOT_INVERSE = new Matrix4();

/** A haze or a pane of glass hides nothing behind it. */
function opaque(material: Material | Material[]): boolean {
  const all = Array.isArray(material) ? material : [material];
  return all.every((m) => !m.transparent);
}

/** Every opaque mesh under `root`, with its transform into the root's space. */
function solidMeshes(root: Object3D): Array<{ geometry: BufferGeometry; matrix: Matrix4 }> {
  root.updateMatrixWorld(true);
  ROOT_INVERSE.copy(root.matrixWorld).invert();
  const found: Array<{ geometry: BufferGeometry; matrix: Matrix4 }> = [];
  root.traverse((child) => {
    if (!(child instanceof Mesh) || !opaque(child.material)) return;
    const geometry = child.geometry as BufferGeometry;
    if (geometry.getAttribute('position') === undefined) return;
    found.push({
      geometry,
      matrix: new Matrix4().multiplyMatrices(ROOT_INVERSE, child.matrixWorld),
    });
  });
  return found;
}

/** Calls `visit` with each triangle's corners, in the root's space. */
function eachTriangle(
  meshes: ReadonlyArray<{ geometry: BufferGeometry; matrix: Matrix4 }>,
  visit: (a: Vector3, b: Vector3, c: Vector3) => void
): void {
  for (const { geometry, matrix } of meshes) {
    const position = geometry.getAttribute('position');
    const index = geometry.getIndex();
    const count = index === null ? position.count : index.count;
    RELATIVE.copy(matrix);
    for (let i = 0; i + 2 < count; i += 3) {
      const ia = index === null ? i : index.getX(i);
      const ib = index === null ? i + 1 : index.getX(i + 1);
      const ic = index === null ? i + 2 : index.getX(i + 2);
      A.fromBufferAttribute(position, ia).applyMatrix4(RELATIVE);
      B.fromBufferAttribute(position, ib).applyMatrix4(RELATIVE);
      C.fromBufferAttribute(position, ic).applyMatrix4(RELATIVE);
      visit(A, B, C);
    }
  }
}

/**
 * Read a model into columns. Every triangle is sampled at half a cell, so a
 * roof of two triangles fills every cell it spans, not only its corners.
 */
export function modelColumns(root: Object3D): ModelColumns {
  const meshes = solidMeshes(root);
  const box = new Box3();
  eachTriangle(meshes, (a, b, c) => {
    box.expandByPoint(a).expandByPoint(b).expandByPoint(c);
  });
  if (box.isEmpty()) box.set(VERTEX.set(0, 0, 0), VERTEX.clone());
  const sizeX = box.max.x - box.min.x;
  const sizeZ = box.max.z - box.min.z;
  const cell = Math.max(sizeX, sizeZ, 1e-6) / COLUMNS_LONG;
  const cols = Math.max(1, Math.ceil(sizeX / cell - 1e-9));
  const rows = Math.max(1, Math.ceil(sizeZ / cell - 1e-9));
  const cellX = sizeX > 0 ? sizeX / cols : cell;
  const cellZ = sizeZ > 0 ? sizeZ / rows : cell;
  const low = new Float32Array(cols * rows).fill(Infinity);
  const high = new Float32Array(cols * rows).fill(-Infinity);
  const spacing = 0.5 * Math.min(cellX, cellZ);
  const mark = (x: number, y: number, z: number): void => {
    const i = Math.min(cols - 1, Math.max(0, Math.floor((x - box.min.x) / cellX)));
    const j = Math.min(rows - 1, Math.max(0, Math.floor((z - box.min.z) / cellZ)));
    const k = j * cols + i;
    if (y < low[k]!) low[k] = y;
    if (y > high[k]!) high[k] = y;
  };
  eachTriangle(meshes, (a, b, c) => {
    const edge = Math.max(
      Math.hypot(b.x - a.x, b.z - a.z),
      Math.hypot(c.x - b.x, c.z - b.z),
      Math.hypot(a.x - c.x, a.z - c.z)
    );
    const n = Math.min(256, Math.max(1, Math.ceil(edge / spacing)));
    for (let p = 0; p <= n; p++) {
      for (let q = 0; q <= n - p; q++) {
        const u = p / n;
        const v = q / n;
        const w = 1 - u - v;
        mark(a.x * w + b.x * u + c.x * v, a.y * w + b.y * u + c.y * v, a.z * w + b.z * u + c.z * v);
      }
    }
  });
  return { box, cols, rows, cellX, cellZ, low, high };
}

/** One model in this frame: its columns, where it stands and its screen box. */
interface Occluder {
  columns: ModelColumns;
  /** The entity the model stands for: a unit, structure or contact id. */
  id: number;
  /** World to the columns' space. */
  readonly inverse: Matrix4;
  /**
   * The eye in the columns' space. Fixed for the frame, so taken once in
   * `add` rather than once a test: the chart's occlusion walk asks `hides`
   * every 2 px along a line that crosses the model's screen box (#1692).
   */
  readonly eyeLocal: Vector3;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const CORNER = new Vector3();
const VIEW = new Vector3();
const POINT_LOCAL = new Vector3();

/**
 * This frame's models, as the chart's ground ink is tested against them. The
 * conn view fills it once a frame (`PerspectiveView.beginInk`) and the chart
 * asks it per vertex: first by screen box, which is all most points ever cost,
 * then along the ray through the one model whose box holds the point.
 */
export class InkOcclusion {
  private readonly slots: Occluder[] = [];
  private count = 0;
  /** How many of the first slots are the player's own models (`markOwn`). */
  private own = 0;
  private readonly eye = new Vector3();
  private camera: PerspectiveCamera | null = null;
  private width = 0;
  private height = 0;
  private print = 0;
  private lastPrint = NaN;
  /** Moves whenever a model moves, appears or goes, so a cached layer can redraw. */
  revision = 0;

  /** Start a frame from the camera both canvases draw through, in CSS pixels. */
  begin(camera: PerspectiveCamera, width: number, height: number): void {
    this.count = 0;
    this.own = 0;
    this.camera = camera;
    this.width = width;
    this.height = height;
    this.eye.copy(camera.position);
    this.print = 0;
  }

  /** One model, by its columns and its root's world matrix. */
  add(columns: ModelColumns, world: Matrix4, id = -1): void {
    const camera = this.camera;
    if (camera === null) return;
    let slot = this.slots[this.count];
    if (slot === undefined) {
      slot = {
        columns,
        id,
        inverse: new Matrix4(),
        eyeLocal: new Vector3(),
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
      };
      this.slots.push(slot);
    }
    this.count++;
    slot.columns = columns;
    slot.id = id;
    slot.inverse.copy(world).invert();
    slot.eyeLocal.copy(this.eye).applyMatrix4(slot.inverse);
    const e = world.elements;
    this.print += this.count * (e[12]! + 3 * e[13]! + 7 * e[14]! + 11 * e[0]! + 13 * e[2]!);
    // The screen box of the solid's eight corners. A corner short of the near
    // plane has no screen position, so that model is tested everywhere...
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let unbounded = false;
    let behind = 0;
    const { min, max } = columns.box;
    for (let c = 0; c < 8; c++) {
      CORNER.set(c & 1 ? max.x : min.x, c & 2 ? max.y : min.y, c & 4 ? max.z : min.z);
      CORNER.applyMatrix4(world);
      VIEW.copy(CORNER).applyMatrix4(camera.matrixWorldInverse);
      if (VIEW.z >= 0) behind++;
      if (VIEW.z > -camera.near) {
        unbounded = true;
        continue;
      }
      CORNER.project(camera);
      const sx = ((CORNER.x + 1) / 2) * this.width;
      const sy = ((1 - CORNER.y) / 2) * this.height;
      if (sx < minX) minX = sx;
      if (sx > maxX) maxX = sx;
      if (sy < minY) minY = sy;
      if (sy > maxY) maxY = sy;
    }
    // ...unless every corner is level with the eye or behind it. Then the
    // whole solid is, and the eye's ray to any point it can see runs the
    // other way, so the model hides nothing: an empty box, which no pixel or
    // segment meets. Tested everywhere instead, the hulls behind the camera
    // at the arch study's close C station were six of ten models, each tested
    // at every 2 px of the chart's occlusion walk (#1692).
    if (behind === 8) {
      slot.minX = Infinity;
      slot.minY = Infinity;
      slot.maxX = -Infinity;
      slot.maxY = -Infinity;
      return;
    }
    if (unbounded) {
      slot.minX = -Infinity;
      slot.minY = -Infinity;
      slot.maxX = Infinity;
      slot.maxY = Infinity;
      return;
    }
    // A pixel's grace, so a line grazing the box is still tested.
    slot.minX = minX - 1;
    slot.minY = minY - 1;
    slot.maxX = maxX + 1;
    slot.maxY = maxY + 1;
  }

  /** Close the frame; the revision moves if any model moved since the last. */
  end(): number {
    const print = this.count + this.print;
    if (print !== this.lastPrint) {
      this.lastPrint = print;
      this.revision++;
    }
    return this.revision;
  }

  /** Models this frame. */
  get size(): number {
    return this.count;
  }

  /** Whether any model's screen box holds this pixel. */
  covers(sx: number, sy: number): boolean {
    for (let i = 0; i < this.count; i++) {
      const s = this.slots[i]!;
      if (sx >= s.minX && sx <= s.maxX && sy >= s.minY && sy <= s.maxY) return true;
    }
    return false;
  }

  /**
   * The models added so far are the player's own; the rest of the frame's are
   * contacts' tracks. Called once, between the two (`PerspectiveView.beginInk`).
   */
  markOwn(): void {
    this.own = this.count;
  }

  /** Whether the screen segment from a to b passes over any model's screen box. */
  crosses(ax: number, ay: number, bx: number, by: number): boolean {
    const x0 = Math.min(ax, bx);
    const x1 = Math.max(ax, bx);
    const y0 = Math.min(ay, by);
    const y1 = Math.max(ay, by);
    for (let i = 0; i < this.count; i++) {
      const s = this.slots[i]!;
      if (x1 >= s.minX && x0 <= s.maxX && y1 >= s.minY && y0 <= s.maxY) return true;
    }
    return false;
  }

  /**
   * Whether the screen box from (x0, y0) to (x1, y1) meets an own model's, or
   * the model of a track in `tracks` — what a mission marker's name keeps off
   * (docs/ui-ux.md §10.5, #1662). Two kinds are left out. A model with a
   * corner behind the eye, whose box is the whole screen: right for a line
   * that must break behind it, and wrong for a name, which would find no place
   * at all. And any other track: a track's model shows the instant it is
   * resolved, and the name keeps off a contact only once its mark has arrived,
   * which `drawContacts` knows and this does not. A tall structure stands far
   * above its mark, so an arrived track is tested by its model as well as its
   * mark (`drawContacts`' footprint).
   */
  crossesHulls(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    tracks: ReadonlySet<number>
  ): boolean {
    for (let i = 0; i < this.count; i++) {
      const s = this.slots[i]!;
      if (s.minX === -Infinity || (i >= this.own && !tracks.has(s.id))) continue;
      if (x1 >= s.minX && x0 <= s.maxX && y1 >= s.minY && y0 <= s.maxY) return true;
    }
    return false;
  }

  /**
   * Whether a model stands between the eye and the world point (x, y, z),
   * whose projection is the pixel (sx, sy).
   */
  hides(sx: number, sy: number, x: number, y: number, z: number): boolean {
    const length = Math.hypot(x - this.eye.x, y - this.eye.y, z - this.eye.z);
    if (length <= SKIN_M) return false;
    const tMax = 1 - SKIN_M / length;
    for (let i = 0; i < this.count; i++) {
      const s = this.slots[i]!;
      if (sx < s.minX || sx > s.maxX || sy < s.minY || sy > s.maxY) continue;
      POINT_LOCAL.set(x, y, z).applyMatrix4(s.inverse);
      if (rayMeetsColumns(s.columns, s.eyeLocal, POINT_LOCAL, tMax)) return true;
    }
    return false;
  }
}

/**
 * Whether the segment from `from` towards `to`, up to `tMax` of the way, meets
 * a column. The box first (slabs), then a walk cell by cell across the plan
 * (Amanatides–Woo), comparing the height the ray spans in each cell with the
 * column there. Exported for its test.
 */
export function rayMeetsColumns(
  columns: ModelColumns,
  from: Vector3,
  to: Vector3,
  tMax: number
): boolean {
  const { box, cols, rows, cellX, cellZ, low, high } = columns;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  let t0 = 0;
  let t1 = tMax;
  // Slabs: x, y, z in turn.
  for (let axis = 0; axis < 3; axis++) {
    const o = axis === 0 ? from.x : axis === 1 ? from.y : from.z;
    const d = axis === 0 ? dx : axis === 1 ? dy : dz;
    const lo = axis === 0 ? box.min.x : axis === 1 ? box.min.y : box.min.z;
    const hi = axis === 0 ? box.max.x : axis === 1 ? box.max.y : box.max.z;
    if (d === 0) {
      if (o < lo || o > hi) return false;
      continue;
    }
    let ta = (lo - o) / d;
    let tb = (hi - o) / d;
    if (ta > tb) [ta, tb] = [tb, ta];
    if (ta > t0) t0 = ta;
    if (tb < t1) t1 = tb;
    if (t0 > t1) return false;
  }
  // The cell the ray enters the box in.
  const sx = from.x + dx * t0;
  const sz = from.z + dz * t0;
  let i = Math.min(cols - 1, Math.max(0, Math.floor((sx - box.min.x) / cellX)));
  let j = Math.min(rows - 1, Math.max(0, Math.floor((sz - box.min.z) / cellZ)));
  const stepI = dx > 0 ? 1 : -1;
  const stepJ = dz > 0 ? 1 : -1;
  let nextX = dx === 0 ? Infinity : (box.min.x + (dx > 0 ? i + 1 : i) * cellX - from.x) / dx;
  let nextZ = dz === 0 ? Infinity : (box.min.z + (dz > 0 ? j + 1 : j) * cellZ - from.z) / dz;
  const deltaX = dx === 0 ? Infinity : cellX / Math.abs(dx);
  const deltaZ = dz === 0 ? Infinity : cellZ / Math.abs(dz);
  let t = t0;
  for (let guard = cols + rows + 2; guard > 0; guard--) {
    const exit = Math.min(nextX, nextZ, t1);
    const ya = from.y + dy * t;
    const yb = from.y + dy * exit;
    const k = j * cols + i;
    if (Math.max(ya, yb) >= low[k]! && Math.min(ya, yb) <= high[k]!) return true;
    if (exit >= t1) return false;
    if (nextX < nextZ) {
      i += stepI;
      t = nextX;
      nextX += deltaX;
    } else {
      j += stepJ;
      t = nextZ;
      nextZ += deltaZ;
    }
    if (i < 0 || i >= cols || j < 0 || j >= rows) return false;
  }
  return false;
}

/** Each template's columns, read the first time a frame asks for them. */
const COLUMNS = new WeakMap<object, ModelColumns>();

/** The columns of the model a template draws, cached on the template. */
export function columnsFor(template: { root: Object3D }): ModelColumns {
  let columns = COLUMNS.get(template);
  if (columns === undefined) {
    columns = modelColumns(template.root);
    COLUMNS.set(template, columns);
  }
  return columns;
}
