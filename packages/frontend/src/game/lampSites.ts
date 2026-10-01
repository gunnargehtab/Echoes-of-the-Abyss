/**
 * A lamp mesh's sites: each connected bulb or strip it holds.
 *
 * Merged lamp meshes still have disconnected bulbs (mergeByMaterial puts every
 * lamp of one material into one mesh), so a reading of where the light is has
 * to find the pieces rather than light the bucket's centre. Position seams are
 * welded, then the connected components are the sites. Each keeps its box,
 * its bounding sphere and its surface area, all in the geometry's own space.
 *
 * The lamp halo shares an entity's energy among its sites by area
 * (docs/art-direction.md, "Lamp halo — SPEC"); lampScreen.ts reads their size
 * on screen; the Dream Loop study's halos sit on them. Cached per geometry,
 * since instances share their template's.
 */
import { Box3, BufferGeometry, Sphere, Vector3 } from 'three';

export interface LampSite {
  readonly box: Box3;
  readonly sphere: Sphere;
  /** Summed triangle area, in the geometry's own units squared. */
  readonly area: number;
}

const sitesByGeometry = new WeakMap<BufferGeometry, readonly LampSite[]>();
const A = new Vector3();
const B = new Vector3();
const C = new Vector3();

export function lampSiteParts(geometry: BufferGeometry): readonly LampSite[] {
  const cached = sitesByGeometry.get(geometry);
  if (cached !== undefined) return cached;
  const position = geometry.getAttribute('position');
  const vertices: number[] = [];
  const parents: number[] = [];
  const welded = new Map<string, number>();
  for (let i = 0; i < position.count; i++) {
    const key = `${position.getX(i).toFixed(5)},${position.getY(i).toFixed(5)},${position.getZ(i).toFixed(5)}`;
    let id = welded.get(key);
    if (id === undefined) {
      id = parents.length;
      parents.push(id);
      welded.set(key, id);
    }
    vertices.push(id);
  }
  const root = (id: number): number => {
    while (parents[id] !== id) {
      parents[id] = parents[parents[id]!]!;
      id = parents[id]!;
    }
    return id;
  };
  const index = geometry.index;
  const count = index?.count ?? position.count;
  const corner = (i: number) => index?.getX(i) ?? i;
  for (let i = 0; i < count; i += 3) {
    const a = root(vertices[corner(i)]!);
    const b = root(vertices[corner(i + 1)]!);
    const c = root(vertices[corner(i + 2)]!);
    parents[b] = a;
    parents[c] = a;
  }
  const boxes = new Map<number, Box3>();
  const point = new Vector3();
  for (let i = 0; i < position.count; i++) {
    const id = root(vertices[i]!);
    let box = boxes.get(id);
    if (box === undefined) {
      box = new Box3();
      boxes.set(id, box);
    }
    box.expandByPoint(point.fromBufferAttribute(position, i));
  }
  const areas = new Map<number, number>();
  for (let i = 0; i < count; i += 3) {
    A.fromBufferAttribute(position, corner(i));
    B.fromBufferAttribute(position, corner(i + 1)).sub(A);
    C.fromBufferAttribute(position, corner(i + 2)).sub(A);
    const id = root(vertices[corner(i)]!);
    areas.set(id, (areas.get(id) ?? 0) + B.cross(C).length() / 2);
  }
  const sites = [...boxes.entries()].map(([id, box]) => ({
    box,
    sphere: box.getBoundingSphere(new Sphere()),
    area: areas.get(id) ?? 0,
  }));
  sitesByGeometry.set(geometry, sites);
  return sites;
}

/** The sites' bounding spheres alone, for readers that need only where and how big. */
const spheresByGeometry = new WeakMap<BufferGeometry, readonly Sphere[]>();
export function lampSites(geometry: BufferGeometry): readonly Sphere[] {
  const cached = spheresByGeometry.get(geometry);
  if (cached !== undefined) return cached;
  const spheres = lampSiteParts(geometry).map((site) => site.sphere);
  spheresByGeometry.set(geometry, spheres);
  return spheres;
}
