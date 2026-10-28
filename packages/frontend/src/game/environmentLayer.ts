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
 * geometry work and the instance matrices never change. The chimneys' steam
 * (ventPlume.ts, #1514) is the same bargain: one `Points` written per rebuild,
 * and a clock uniform per frame.
 */

/**
 * TUNABLE — the current's phase under reduced motion. The sway shader is
 * evaluated at this one fixed time, so kelp holds a still, per-instance lean
 * instead of moving: the rigid fallback, drawn by the same code path.
 */
const SWAY_HOLD_S = 1.7;

import { Color, Group, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import type { PublicLandmark, ResourceNodeInfo } from '@echoes/shared';
import type { TerrainPayload } from '../net/GameClient.ts';
import {
  ENVIRONMENT_PROPS,
  placeProps,
  propSpec,
  standLandmarks,
  type LandmarkStand,
  type PropPlacement,
} from './environment.ts';
import { envTemplate, type SwayUniforms } from './environmentModels.ts';
import { landmarkTemplate } from './landmarkModels.ts';
import { depthToWorldY } from './perspectiveTerrain.ts';
import type { WorldLook } from './tutorialLook.ts';
import { VentPlume, plumeSites } from './ventPlume.ts';
import { FieldHaze, hazeSites } from './fieldHaze.ts';

const TMP_MATRIX = new Matrix4();
const TMP_QUAT = new Quaternion();
const TMP_POS = new Vector3();
const TMP_SCALE = new Vector3();
const Y_AXIS = new Vector3(0, 1, 0);
const TMP_COLOR = new Color();

export class EnvironmentLayer {
  /**
   * `seatStones` sinks each loose stone a share of its height into the silt
   * (`PropSpec.buryFraction`, docs/art-direction.md "Silt detail and seated
   * stones — SPEC"). It travels with the silt detail: a stone seated over
   * ground with no scour baked round it would read as a hole in the map.
   */
  constructor(
    private readonly look: WorldLook = 'standard',
    private readonly seatStones = false
  ) {}

  /** Added to the scene once by the view; rebuilt in place. */
  readonly group = new Group();
  /** Every standing chimney's steam, one draw; in the group while a column stands. */
  readonly plume = new VentPlume();
  /** Every field's sediment haze, one draw; in the group while a field stands (#1555). */
  readonly haze = new FieldHaze();

  /** Guards late template loads: a load that finishes after another rebuild
   * (new terrain, teardown) must not resurrect stale placements. */
  private generation = 0;
  private props = 0;
  private propTris = 0;
  /** Public landmarks standing, and the triangles their drawn states cost (gate 6). */
  private landmarksStanding = 0;
  private landmarkTris = 0;
  /**
   * The map's public landmarks this layer draws (docs/graphics-standards.md
   * gate 1): none, unless the view hands it the map's table — which it does
   * only under the arch study's flag, on the prologue's look. Stood from the
   * terrain each rebuild, in the state its own cells give, so a ground delta
   * that turns the anchor cells to rock stands the ruin on the same rebuild
   * that re-shades them, and a session whose first ground already holds the
   * collapse stands it from its first frame.
   */
  private landmarks: readonly PublicLandmark[] = [];
  /** Sway handles of the templates standing in this build, ticked per frame. */
  private swaying: SwayUniforms[] = [];
  private reducedMotion = false;
  /**
   * The room's resource fields, stood as ore by the default placement
   * (environment.ts `scatterFields`, #1555). Held here because they arrive
   * on their own message after the ground and outlive its rebuilds.
   */
  private fields: readonly ResourceNodeInfo[] = [];
  /**
   * The acoustic veil's ground shade (acousticVeil.ts, docs/ui-ux.md §4.5),
   * the view's display-space multiplier at a point, carried on each instance's
   * colour into the shader (veilShading.ts `installPropVeil`).
   *
   * Props take it because they stand *on* the ground: a kelp bed at full
   * colour over a chart that has gone cold reads as a renderer that forgot
   * one layer, not as water nobody is listening to. Held here rather than
   * passed per rebuild because the two cadences differ — the ground rebuilds
   * when it changes, the veil moves with the fleet — so a rebuild has to be
   * able to re-apply the shade it last had.
   */
  private shade: ((xM: number, yM: number, out: Color) => void) | null = null;
  /** What each instanced mesh in this build stands on, for a reshade. */
  private shaded: Array<{ mesh: InstancedMesh; list: PropPlacement[] }> = [];

  /**
   * Rebuild the layer for a terrain. `groundY` is the view's own seabed
   * function — the same heights the terrain mesh stands on, so props sit on
   * the drawn ground, crag and all, rather than on the authored floor.
   */
  rebuild(
    terrain: TerrainPayload,
    groundY: (xM: number, yM: number) => number,
    placements?: readonly PropPlacement[]
  ): void {
    const generation = ++this.generation;
    this.clear();
    // The landmarks first: spent from the reservation after the fields and
    // before the scatter (gate 1, rule 3), which `placeProps` does when it is
    // handed them, and stood here whatever list the caller passed.
    const stands = standLandmarks(terrain, this.landmarks);
    // Only the default placement stands the fields, so only it hazes them: the
    // opt-in study hands in its own budgeted list and stands no field.
    const standsFields = placements === undefined;
    placements ??= placeProps(terrain, ENVIRONMENT_PROPS, this.look, this.fields, stands);
    for (const stand of stands) {
      this.standLandmark(stand, terrain, () => {
        if (generation === this.generation) {
          this.rebuild(terrain, groundY, standsFields ? undefined : placements);
        }
      });
    }

    if (placements.length === 0) return;
    // Where each standing slug tops out, per unit scale: the chimneys' mouths.
    const topM = new Map<string, number>();

    const bySlug = new Map<string, PropPlacement[]>();
    for (const placement of placements) {
      const list = bySlug.get(placement.slug);
      if (list === undefined) bySlug.set(placement.slug, [placement]);
      else list.push(placement);
    }

    for (const [slug, list] of bySlug) {
      const spec = propSpec(slug);
      if (spec === undefined) continue;
      const template = envTemplate(
        slug,
        spec.footprintM,
        spec.swayM,
        () => {
          // A load belongs to the latest rebuild that subscribed to it, on
          // the path it took: the default one re-places, so the fields it
          // stood stand again.
          if (generation === this.generation) {
            this.rebuild(terrain, groundY, standsFields ? undefined : placements);
          }
        },
        this.look
      );
      if (template === null) continue;

      const sinkM = this.seatStones ? (spec.buryFraction ?? 0) * template.heightM : 0;
      for (const part of template.parts) {
        const mesh = new InstancedMesh(part.geometry, part.material, list.length);
        mesh.frustumCulled = false;
        list.forEach((placement, i) => {
          TMP_POS.set(
            placement.xM,
            groundY(placement.xM, placement.yM) - sinkM * placement.scale,
            placement.yM
          );
          TMP_QUAT.setFromAxisAngle(Y_AXIS, placement.yawRad);
          TMP_SCALE.setScalar(placement.scale);
          mesh.setMatrixAt(i, TMP_MATRIX.compose(TMP_POS, TMP_QUAT, TMP_SCALE));
        });
        mesh.instanceMatrix.needsUpdate = true;
        this.shaded.push({ mesh, list });
        this.applyShade(mesh, list);
        this.group.add(mesh);
      }
      this.props += list.length;
      this.propTris += list.length * template.trianglesPerInstance;
      if (template.sway !== null) this.swaying.push(template.sway);
      topM.set(slug, template.heightM - sinkM);
    }
    // A chimney whose model has not loaded stands nothing, so it breathes
    // nothing either: plumeSites skips any slug missing here.
    const sites = plumeSites(placements, (placement) => {
      const top = topM.get(placement.slug);
      if (top === undefined) return null;
      return groundY(placement.xM, placement.yM) + top * placement.scale;
    });
    this.plume.build(sites, this.shade);
    if (sites.length > 0) this.group.add(this.plume.points);
    const hazes = standsFields ? hazeSites(this.fields, terrain, groundY) : [];
    this.haze.build(hazes, this.shade);
    if (hazes.length > 0) this.group.add(this.haze.points);
  }

  /**
   * Stand one landmark in the state its cells give it: its state's parts, one
   * instanced mesh of one instance each, so the veil's shade reaches it the
   * way it reaches a prop (its instance colour), at the anchor, turned by the
   * anchor's yaw, at scale 1. Its origin stands at the literal's floor
   * through the same depth mapping the terrain mesh uses — never on
   * `groundY`, the drawn ground with its relief, which the received ground
   * moves: the wall that rises under the anchor at 10:40 would lift the ruin
   * onto its top (study §6, gate 1).
   */
  private standLandmark(stand: LandmarkStand, terrain: TerrainPayload, onReady: () => void): void {
    const template = landmarkTemplate(stand.spec, onReady, this.look);
    if (template === null) return;
    const state = template.states[stand.state];
    const { landmark } = stand;
    TMP_POS.set(landmark.anchorXM, depthToWorldY(landmark.originFloorM), landmark.anchorYM);
    TMP_QUAT.setFromAxisAngle(Y_AXIS, landmark.yawRad);
    TMP_SCALE.setScalar(1);
    TMP_MATRIX.compose(TMP_POS, TMP_QUAT, TMP_SCALE);
    const at: PropPlacement = {
      slug: landmark.slug,
      xM: landmark.anchorXM,
      yM: landmark.anchorYM,
      yawRad: landmark.yawRad,
      scale: 1,
      cellIndex: landmark.cells.row * terrain.cols + landmark.cells.col0,
    };
    for (const part of state.parts) {
      const mesh = new InstancedMesh(part.geometry, part.material, 1);
      mesh.frustumCulled = false;
      mesh.name = `${landmark.slug}:${stand.state}:${part.material.name}`;
      mesh.setMatrixAt(0, TMP_MATRIX);
      mesh.instanceMatrix.needsUpdate = true;
      this.shaded.push({ mesh, list: [at] });
      this.applyShade(mesh, [at]);
      this.group.add(mesh);
    }
    this.landmarksStanding++;
    this.landmarkTris += state.triangles;
  }

  /**
   * Take the map's public landmarks. The caller rebuilds, as for the fields:
   * the view owns *when*.
   */
  setLandmarks(landmarks: readonly PublicLandmark[]): void {
    this.landmarks = landmarks;
  }

  /**
   * Per frame: advance the current. Under reduced motion the time is held,
   * and the write still happens so a toggle mid-match takes effect on the
   * next frame rather than on the next terrain rebuild.
   */
  tick(nowMs: number, waterReachM?: number): void {
    this.plume.tick(nowMs, waterReachM);
    this.haze.tick(nowMs, waterReachM);
    if (this.swaying.length === 0) return;
    const time = this.reducedMotion ? SWAY_HOLD_S : nowMs / 1000;
    for (const sway of this.swaying) sway.uSwayTime.value = time;
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    this.plume.setReducedMotion(reduced);
    this.haze.setReducedMotion(reduced);
  }

  /**
   * Take the room's fields. The caller rebuilds: the view owns *when*, as
   * for every other change to what stands on the ground.
   */
  setFields(fields: readonly ResourceNodeInfo[]): void {
    this.fields = fields;
  }

  /**
   * Take the acoustic veil's shade, and re-apply it to everything standing.
   *
   * `null` restores full colour in one pass — the setting turned off, or a
   * view with no field yet. Cheap enough to call on the Echo tick: a colour
   * per instance, and the reservation caps the layer's instance count.
   */
  setShade(shade: ((xM: number, yM: number, out: Color) => void) | null): void {
    this.shade = shade;
    for (const { mesh, list } of this.shaded) this.applyShade(mesh, list);
    this.plume.setShade(shade);
    this.haze.setShade(shade);
  }

  private applyShade(mesh: InstancedMesh, list: readonly PropPlacement[]): void {
    const shade = this.shade;
    for (let i = 0; i < list.length; i++) {
      const placement = list[i]!;
      if (shade === null) TMP_COLOR.setRGB(1, 1, 1);
      else shade(placement.xM, placement.yM, TMP_COLOR);
      mesh.setColorAt(i, TMP_COLOR);
    }
    if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
  }

  /**
   * Probe telemetry (gate 6): bodies standing, triangles they cost, steam
   * columns and hazed fields, and the public landmarks on their own, as gate
   * 6's study line asks — a landmark is one instance, not a prop count.
   */
  stats(): {
    props: number;
    propTris: number;
    ventPlumes: number;
    fieldHazes: number;
    landmarks: number;
    landmarkTris: number;
  } {
    return {
      props: this.props,
      propTris: this.propTris,
      ventPlumes: this.plume.plumes,
      fieldHazes: this.haze.fields,
      landmarks: this.landmarksStanding,
      landmarkTris: this.landmarkTris,
    };
  }

  /**
   * Stand nothing, and let no template still loading stand anything again: a
   * session's ground let go (`PerspectiveView.clearTerrain`, #1460). The next
   * `rebuild` starts the layer afresh.
   */
  reset(): void {
    this.generation++;
    this.clear();
  }

  destroy(): void {
    this.reset();
    this.plume.dispose();
    this.haze.dispose();
  }

  private clear(): void {
    for (const child of [...this.group.children]) {
      this.group.remove(child);
      // Instance attributes are this layer's own; geometry and material
      // belong to the template cache and must survive the rebuild.
      if (child instanceof InstancedMesh) child.dispose();
    }
    // Emptied, not disposed: their materials outlive the rebuild.
    this.plume.clear();
    this.haze.clear();
    this.props = 0;
    this.propTris = 0;
    this.landmarksStanding = 0;
    this.landmarkTris = 0;
    this.swaying = [];
    this.shaded = [];
  }
}
