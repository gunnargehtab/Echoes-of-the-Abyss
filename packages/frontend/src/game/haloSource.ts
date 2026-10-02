/**
 * What the lamp halo's source draws this frame — docs/art-direction.md, "Lamp
 * halo — SPEC". Every own entity with its model showing and a live SIG over
 * 15 carries one energy (lampHalo.ts), shared among its lamp sites by area
 * times resting luminance after the lamp core; an entity whose whole light,
 * gathered at one pixel, would stay under the toe draws none; sites outside
 * the view are culled, and the brightest on screen are kept under the cap.
 *
 * Kept apart from PerspectiveView so a test can hold it over real roster
 * templates. Read after the canvas render, so every matrix is this frame's.
 */
import { Frustum, Matrix4, Mesh, Sphere, Vector3, type PerspectiveCamera } from 'three';
import type { HaloSplat } from './lampHaloPass.ts';
import { capSites, entityHaloEnergy, LAMP_HALO, peakField, siteShares } from './lampHalo.ts';
import { lampSiteParts } from './lampSites.ts';
import type { RosterModelInstance } from './rosterModels.ts';

/** A splat, and which of the input entities it belongs to. */
export type SourceSplat = HaloSplat & { readonly entity: number };

export interface HaloSourceInput {
  /** Own entities with their model showing, and each one's live SIG. */
  entities: readonly { sig: number; model: RosterModelInstance }[];
  camera: PerspectiveCamera;
  bufferWidth: number;
  bufferHeight: number;
  drawScale: number;
  fogDensity: number;
  pixelRatio: number;
}

const FRUSTUM = new Frustum();
const MATRIX = new Matrix4();
const SPHERE = new Sphere();
const POINT = new Vector3();
const SIZE = new Vector3();
const VIEW = new Vector3();
const RAY = new Vector3();

export function gatherHaloSplats(input: HaloSourceInput): {
  splats: SourceSplat[];
  dropped: number;
} {
  const { camera } = input;
  const fx = camera.projectionMatrix.elements[0]! * input.bufferWidth * 0.5;
  const fy = camera.projectionMatrix.elements[5]! * input.bufferHeight * 0.5;
  FRUSTUM.setFromProjectionMatrix(
    MATRIX.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
  );
  const candidates: (SourceSplat & { light: number })[] = [];
  input.entities.forEach(({ sig, model }, entity) => {
    const energy = entityHaloEnergy(sig, input.drawScale);
    if (energy <= 0) return;
    const parts: (Omit<SourceSplat, 'energy'> & {
      area: number;
      luminance: number;
      light: number;
    })[] = [];
    for (const { material, restIntensity } of model.emissives) {
      const { r, g, b } = material.emissive;
      const peak = Math.max(r, g, b);
      if (peak <= 0) continue;
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) * restIntensity;
      const ink = material.emissive.clone().multiplyScalar(1 / peak);
      model.root.traverse((child) => {
        if (!(child instanceof Mesh) || !child.visible) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        if (!materials.includes(material)) return;
        const m = child.matrixWorld.elements;
        for (const site of lampSiteParts(child.geometry)) {
          site.box.getCenter(POINT).applyMatrix4(child.matrixWorld);
          site.box.getSize(SIZE).multiplyScalar(0.5);
          // A box as a Gaussian: σ = half-extent ÷ √3 on each local axis,
          // carried into world space by the mesh's matrix (yaw and scale).
          const cov: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
          let diagonal2 = 0;
          // The box's extent along the ray from the eye: how far its nearest
          // point lies in front of its centre (SPEC, Occlusion).
          RAY.copy(POINT).sub(camera.position).normalize();
          let nearOffset = 0;
          for (let axis = 0; axis < 3; axis++) {
            const half = SIZE.getComponent(axis);
            const cx = m[axis * 4]!;
            const cy = m[axis * 4 + 1]!;
            const cz = m[axis * 4 + 2]!;
            const w = (half * half) / 3;
            cov[0] += w * cx * cx;
            cov[1] += w * cx * cy;
            cov[2] += w * cx * cz;
            cov[3] += w * cy * cy;
            cov[4] += w * cy * cz;
            cov[5] += w * cz * cz;
            diagonal2 += half * half * (cx * cx + cy * cy + cz * cz);
            nearOffset += half * Math.abs(RAY.x * cx + RAY.y * cy + RAY.z * cz);
          }
          const depth = -VIEW.copy(POINT).applyMatrix4(camera.matrixWorldInverse).z;
          const tau = Math.exp(-((input.fogDensity * depth) ** 2));
          parts.push({
            entity,
            x: POINT.x,
            y: POINT.y,
            z: POINT.z,
            cov,
            ink,
            halfDiagonal: Math.sqrt(diagonal2),
            nearOffset,
            area: site.area,
            luminance,
            light: depth > 0 ? ((fx * fy) / (depth * depth)) * tau ** 2.2 : 0,
          });
        }
      });
    }
    const shares = siteShares(parts);
    const light = parts.reduce((sum, p, i) => sum + energy * shares[i]! * p.light, 0);
    if (peakField(light, input.pixelRatio) < LAMP_HALO.TOE) return;
    parts.forEach((p, i) => {
      if (shares[i]! <= 0 || p.light <= 0) return;
      SPHERE.center.set(p.x, p.y, p.z);
      SPHERE.radius = p.halfDiagonal;
      if (!FRUSTUM.intersectsSphere(SPHERE)) return;
      candidates.push({
        entity: p.entity,
        x: p.x,
        y: p.y,
        z: p.z,
        cov: p.cov,
        ink: p.ink,
        halfDiagonal: p.halfDiagonal,
        nearOffset: p.nearOffset,
        energy: energy * shares[i]!,
        light: energy * shares[i]! * p.light,
      });
    });
  });
  const { kept, dropped } = capSites(candidates.map((c) => ({ energy: c.light, splat: c })));
  return { splats: kept.map((k) => k.splat), dropped };
}
