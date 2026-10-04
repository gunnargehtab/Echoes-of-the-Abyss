/**
 * #967's opt-in ground-cover study. The same approved props and cell-local
 * scatter, but the reservation is spent inside the view, not across the map.
 */
import { Frustum, Matrix4, Sphere, Vector3, type PerspectiveCamera } from 'three';
import {
  ENVIRONMENT_PROPS,
  PROP_INSTANCE_CAP,
  PROP_TRI_RESERVATION,
  propHash,
  scatterProps,
  type PropPlacement,
  type PropSpec,
  type TerrainGrid,
} from './environment.ts';

const STUDY_PROPS: readonly PropSpec[] = ENVIRONMENT_PROPS.map((spec) => {
  if (spec.slug === 'env-kelp-cluster') {
    return { ...spec, density: 18, scaleJitter: [0.3, 0.65] };
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
  priority: number;
  /** A seated stone: the bake scours round it, so it is never the one dropped. */
  stone: boolean;
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
      if (spec.worldLight === 'flora') {
        const col = placement.cellIndex % terrain.cols;
        const row = Math.floor(placement.cellIndex / terrain.cols);
        const fx = placement.xM / terrain.cellM - col;
        const fy = placement.yM / terrain.cellM - row;
        const cluster = Math.floor(fx * 3);
        const seed = [
          col,
          row,
          terrain.cols,
          terrain.rows,
          terrain.floor[placement.cellIndex]!,
          terrain.ceiling[placement.cellIndex]!,
          cluster,
        ];
        placement.xM =
          (col + 0.2 + 0.6 * propHash([...seed, 0x25af]) + (fx * 3 - cluster - 0.5) * 0.18) *
          terrain.cellM;
        placement.yM =
          (row + 0.2 + 0.6 * propHash([...seed, 0x739b]) + (fy - 0.5) * 0.18) * terrain.cellM;
      }
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
        stone: (spec.buryFraction ?? 0) > 0,
        priority: propHash([
          placement.cellIndex,
          Math.round(placement.xM * 100),
          Math.round(placement.yM * 100),
          0x51ed270b,
        ]),
        bounds: new Sphere(
          new Vector3(placement.xM, groundY(placement.xM, placement.yM) + radius / 2, placement.yM),
          radius
        ),
      });
    }
    // Stable, spatially distributed priority: a capped survey view must not
    // dress only the northern rows or only the ground closest to the camera.
    // Seated stones first, whatever their hash: their scour is in the bake,
    // and a hollow left standing empty for a kelp frond would be a lie.
    this.candidates.sort(
      (a, b) =>
        Number(b.stone) - Number(a.stone) ||
        a.priority - b.priority ||
        a.placement.cellIndex - b.placement.cellIndex
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
