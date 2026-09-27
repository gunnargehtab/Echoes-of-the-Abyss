/**
 * #967's opt-in ground-cover study. The same approved props and cell-local
 * scatter, but the reservation is spent inside the view, not across the map.
 */
import { Frustum, Matrix4, Sphere, Vector3, type PerspectiveCamera } from 'three';
import {
  ENVIRONMENT_PROPS,
  PROP_INSTANCE_CAP,
  PROP_TRI_RESERVATION,
  scatterProps,
  type PropPlacement,
  type PropSpec,
  type TerrainGrid,
} from './environment.ts';

const STUDY_PROPS: readonly PropSpec[] = ENVIRONMENT_PROPS.map((spec) => {
  if (spec.slug === 'env-kelp-cluster') {
    return { ...spec, density: 18, scaleJitter: [0.55, 0.9] };
  }
  if (spec.slug === 'env-coral-growth') {
    return { ...spec, density: 2, scaleJitter: [1, 1.8] };
  }
  return spec;
});

interface Candidate {
  placement: PropPlacement;
  triangles: number;
  bounds: Sphere;
}

export class DreamGroundCover {
  private candidates: Candidate[] = [];
  private readonly view = new Matrix4();
  private readonly previousView = new Matrix4();
  private readonly frustum = new Frustum();
  private dirty = true;

  setTerrain(terrain: TerrainGrid, groundY: (xM: number, yM: number) => number): void {
    this.candidates = [];
    for (const { placement, spec } of scatterProps(terrain, STUDY_PROPS)) {
      // Quiet gaps between drifts, rather than one uniformly planted lawn.
      if (
        spec.worldLight === 'flora' &&
        Math.sin(placement.xM / 90 + Math.cos(placement.yM / 230)) +
          Math.cos(placement.yM / 130 - placement.xM / 600) <
          -0.6
      ) {
        continue;
      }
      const radius = Math.max(30, spec.footprintM * placement.scale * 2);
      this.candidates.push({
        placement,
        triangles: spec.triBudget,
        bounds: new Sphere(
          new Vector3(placement.xM, groundY(placement.xM, placement.yM) + radius / 2, placement.yM),
          radius
        ),
      });
    }
    // Stable, spatially distributed priority: a capped survey view must not
    // dress only the northern rows or only the ground closest to the camera.
    this.candidates.sort(
      (a, b) =>
        a.placement.yawRad - b.placement.yawRad || a.placement.cellIndex - b.placement.cellIndex
    );
    this.dirty = true;
  }

  /** A still view does no scatter, sorting, allocation or instance rebuild. */
  update(camera: PerspectiveCamera): PropPlacement[] | null {
    this.view.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    if (!this.dirty && this.view.equals(this.previousView)) return null;
    this.previousView.copy(this.view);
    this.dirty = false;
    this.frustum.setFromProjectionMatrix(this.view);

    const placements: PropPlacement[] = [];
    let triangles = 0;
    for (const candidate of this.candidates) {
      if (!this.frustum.intersectsSphere(candidate.bounds)) continue;
      if (placements.length >= PROP_INSTANCE_CAP) break;
      if (triangles + candidate.triangles > PROP_TRI_RESERVATION) continue;
      placements.push(candidate.placement);
      triangles += candidate.triangles;
    }
    return placements;
  }
}
