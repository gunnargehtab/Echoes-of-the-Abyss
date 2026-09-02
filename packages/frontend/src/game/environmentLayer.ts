/**
 * The environment prop layer of the conn view: one `InstancedMesh` per prop
 * part, standing on the seabed — docs/graphics-standards.md "The environment
 * branch", gate 6.
 *
 * Kept out of PerspectiveView so the 1,000-line view stays the camera's file:
 * the view owns *when* (the terrain rebuild cadence, which ground deltas
 * already trigger — CoralRuins collapse reactivity comes free) and this class
 * owns *what*. Instancing is the whole budget argument: a slug costs as many
 * draw calls as its template has materials (≤ 2 by intake), however many
 * instances stand on the map. Frustum culling is off per instance mesh — one
 * mesh spans the whole map, so per-instance culling never happens anyway and
 * a wrong bounding sphere would flicker the lot; within the gate-6
 * reservation it is not needed. Region chunking is the future option if the
 * probe ever says otherwise.
 *
 * Sway (epic #308 PR-3) is the one thing here that runs per frame, and it is
 * one uniform write per bending template — the displacement itself is in the
 * vertex shader (environmentModels.ts), so the 60 Hz path carries no
 * geometry work and the instance matrices never change.
 */

/**
 * TUNABLE — the current's phase under reduced motion. The sway shader is
 * evaluated at this one fixed time, so kelp holds a still, per-instance lean
 * instead of moving: the rigid fallback, drawn by the same code path.
 */
const SWAY_HOLD_S = 1.7;

import { Group, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import type { TerrainPayload } from '../net/GameClient.ts';
import { placeProps, propSpec, type PropPlacement } from './environment.ts';
import { envTemplate, type SwayUniforms } from './environmentModels.ts';

const TMP_MATRIX = new Matrix4();
const TMP_QUAT = new Quaternion();
const TMP_POS = new Vector3();
const TMP_SCALE = new Vector3();
const Y_AXIS = new Vector3(0, 1, 0);

export class EnvironmentLayer {
  /** Added to the scene once by the view; rebuilt in place. */
  readonly group = new Group();

  /** Guards late template loads: a load that finishes after another rebuild
   * (new terrain, teardown) must not resurrect stale placements. */
  private generation = 0;
  private props = 0;
  private propTris = 0;
  /** Sway handles of the templates standing in this build, ticked per frame. */
  private swaying: SwayUniforms[] = [];
  private reducedMotion = false;

  /**
   * Rebuild the layer for a terrain. `groundY` is the view's own seabed
   * function — the same heights the terrain mesh stands on, so props sit on
   * the drawn ground, crag and all, rather than on the authored floor.
   */
  rebuild(terrain: TerrainPayload, groundY: (xM: number, yM: number) => number): void {
    const generation = ++this.generation;
    this.clear();

    const placements = placeProps(terrain);
    if (placements.length === 0) return;

    const bySlug = new Map<string, PropPlacement[]>();
    for (const placement of placements) {
      const list = bySlug.get(placement.slug);
      if (list === undefined) bySlug.set(placement.slug, [placement]);
      else list.push(placement);
    }

    for (const [slug, list] of bySlug) {
      const spec = propSpec(slug);
      if (spec === undefined) continue;
      const template = envTemplate(slug, spec.footprintM, spec.swayM, () => {
        // Loaded after this pass: rebuild once, on the same terrain, unless a
        // newer rebuild has already superseded these placements.
        if (generation === this.generation) this.rebuild(terrain, groundY);
      });
      if (template === null) continue;

      for (const part of template.parts) {
        const mesh = new InstancedMesh(part.geometry, part.material, list.length);
        mesh.frustumCulled = false;
        list.forEach((placement, i) => {
          TMP_POS.set(placement.xM, groundY(placement.xM, placement.yM), placement.yM);
          TMP_QUAT.setFromAxisAngle(Y_AXIS, placement.yawRad);
          TMP_SCALE.setScalar(placement.scale);
          mesh.setMatrixAt(i, TMP_MATRIX.compose(TMP_POS, TMP_QUAT, TMP_SCALE));
        });
        mesh.instanceMatrix.needsUpdate = true;
        this.group.add(mesh);
      }
      this.props += list.length;
      this.propTris += list.length * template.trianglesPerInstance;
      if (template.sway !== null) this.swaying.push(template.sway);
    }
  }

  /**
   * Per frame: advance the current. Under reduced motion the time is held,
   * and the write still happens so a toggle mid-match takes effect on the
   * next frame rather than on the next terrain rebuild.
   */
  tick(nowMs: number): void {
    if (this.swaying.length === 0) return;
    const time = this.reducedMotion ? SWAY_HOLD_S : nowMs / 1000;
    for (const sway of this.swaying) sway.uSwayTime.value = time;
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  /** Probe telemetry (gate 6): bodies standing and triangles they cost. */
  stats(): { props: number; propTris: number } {
    return { props: this.props, propTris: this.propTris };
  }

  destroy(): void {
    this.generation++;
    this.clear();
  }

  private clear(): void {
    for (const child of [...this.group.children]) {
      this.group.remove(child);
      // Instance attributes are this layer's own; geometry and material
      // belong to the template cache and must survive the rebuild.
      if (child instanceof InstancedMesh) child.dispose();
    }
    this.props = 0;
    this.propTris = 0;
    this.swaying = [];
  }
}
