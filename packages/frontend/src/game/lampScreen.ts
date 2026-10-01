/**
 * How big a lamp is on screen — #1001's halo readings (docs/graphics-standards.md
 * gate 6, "Abyss Render Stack increment"). A halo is sized from its lamp, and
 * a halo source built from the emissive term carries each lamp's lit area, so
 * the halo call needs both in CSS pixels at the dollies the game is played at.
 *
 * Two numbers per lamp mesh, for the development-only lamp reading:
 * - `sitesPx`: each lamp site's radius. A site is one connected bulb or strip
 *   (`lampSites.ts`), so a merged lamp mesh still
 *   reads as the separate lights a player sees.
 * - `areaPx`: the area of its camera-facing triangles. Occlusion is not
 *   counted: a hull in front of a lamp still counts its area, which makes this
 *   the area a source without a depth test would carry.
 *
 * Read on demand, never per frame; it walks every triangle of the mesh.
 */
import { Camera, Mesh, Vector3 } from 'three';
import { lampSites } from './lampSites.ts';

const A = new Vector3();
const B = new Vector3();
const C = new Vector3();
const EDGE = new Vector3();

/** A CSS-pixel rectangle: where the canvas sits on the page. */
export interface ScreenRect {
  width: number;
  height: number;
}

export function lampScreen(
  mesh: Mesh,
  camera: Camera,
  rect: ScreenRect
): { sitesPx: number[]; areaPx: number } {
  mesh.updateWorldMatrix(true, false);
  camera.updateMatrixWorld();
  const toPx = (v: Vector3) => {
    v.applyMatrix4(mesh.matrixWorld).project(camera);
    v.set(((v.x + 1) / 2) * rect.width, ((1 - v.y) / 2) * rect.height, v.z);
    return v;
  };

  const scale = mesh.matrixWorld.getMaxScaleOnAxis();
  const right = EDGE.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  const sitesPx = lampSites(mesh.geometry).map((site) => {
    const centre = A.copy(site.center).applyMatrix4(mesh.matrixWorld);
    const edge = B.copy(centre).addScaledVector(right, site.radius * scale);
    centre.project(camera);
    edge.project(camera);
    return Math.hypot(
      ((edge.x - centre.x) / 2) * rect.width,
      ((edge.y - centre.y) / 2) * rect.height
    );
  });

  const position = mesh.geometry.getAttribute('position');
  const index = mesh.geometry.index;
  const count = index?.count ?? position.count;
  let areaPx = 0;
  for (let i = 0; i < count; i += 3) {
    const a = toPx(A.fromBufferAttribute(position, index?.getX(i) ?? i));
    const b = toPx(B.fromBufferAttribute(position, index?.getX(i + 1) ?? i + 1));
    const c = toPx(C.fromBufferAttribute(position, index?.getX(i + 2) ?? i + 2));
    // Behind the eye, or past the far plane: not on screen.
    if (Math.max(Math.abs(a.z), Math.abs(b.z), Math.abs(c.z)) > 1) continue;
    // Counter-clockwise in NDC is front-facing in three; y flips to CSS, so
    // a front face has a negative signed area here.
    const signed = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
    if (signed < 0) areaPx -= signed / 2;
  }
  return { sitesPx, areaPx };
}
