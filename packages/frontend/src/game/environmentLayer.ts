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
  placeAll,
  propSpec,
  type LandmarkStand,
  type PropPlacement,
} from './environment.ts';
import { envTemplate, type SwayUniforms } from './environmentModels.ts';
import {
  lampCentres,
  landmarkTemplate,
  siftSites,
  type LandmarkStateTemplate,
  type LandmarkTemplate,
} from './landmarkModels.ts';
import { depthToWorldY } from './perspectiveTerrain.ts';
import { FALL_SECONDS, LAMP_COUNT, lampLevels, LIGHT_BUCKET_MS } from './landmarkLight.ts';
import { CollapseCloud, LandmarkSift, SIFT_SITE_CAP, type SiftSite } from './landmarkSift.ts';
import type { LandmarkState } from '@echoes/shared';
import type { WorldLook } from './tutorialLook.ts';
import type { MaskLandmarkPart } from './archMask.ts';
import { VentPlume, plumeSites } from './ventPlume.ts';
import { FieldHaze, hazeSites } from './fieldHaze.ts';

const TMP_MATRIX = new Matrix4();
const TMP_QUAT = new Quaternion();
const TMP_POS = new Vector3();
const TMP_SCALE = new Vector3();
const Y_AXIS = new Vector3(0, 1, 0);
const TMP_COLOR = new Color();

/** How many lamps a state carries: the intact state's four, the ruined state's none. */
function lampCount(state: LandmarkStateTemplate): number {
  return lampCentres(state).length;
}

/** A model-space plan offset turned by a landmark's yaw, as the instance matrix turns it. */
function turned(x: number, z: number, yawRad: number): [number, number] {
  const cos = Math.cos(yawRad);
  const sin = Math.sin(yawRad);
  return [x * cos + z * sin, -x * sin + z * cos];
}

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
  /** The arch study's silt sift, one draw; in the group while a landmark stands under the study (#1637). */
  readonly sift = new LandmarkSift();
  /** The collapse's cloud, one draw, alive for the 14 s after the ground change. */
  readonly cloud = new CollapseCloud();

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
   * terrain each default rebuild, in the state its own cells give, so a ground delta
   * that turns the anchor cells to rock stands the ruin on the same rebuild
   * that re-shades them, and a session whose first ground already holds the
   * collapse stands it from its first frame.
   */
  private landmarks: readonly PublicLandmark[] = [];
  /** The templates standing in this build whose light and motion this layer drives. */
  private lit: LandmarkTemplate[] = [];
  /**
   * The state each landmark last stood in here, across rebuilds: the collapse
   * sequence starts only on a rebuild that turns an intact landmark ruined in
   * this same layer (the received ground change), never on a layer whose
   * first ground already holds the ruin (a reload after 10:40), which stands
   * it from its first frame and plays nothing. Cleared with `reset`, not
   * `clear`, since a rebuild is exactly the moment it is read.
   */
  private lastStates = new Map<string, LandmarkState>();
  /** The sonar bucket the lamps were last stepped on. */
  private lampBucket = -1;
  /**
   * The study's development switches (§9: "Read C's GPU time with the pools
   * on and off", and the lamp-glass and lit-stone readings, which need each
   * alone): pools off zeroes every pool, lamps off darkens the glass. Both on
   * is the study; the harness flips them through the view's probe hook.
   */
  private switches = { pools: true, lamps: true };
  /**
   * Every landmark part this layer stands, with its stand and its pools'
   * uniforms: the study's per-material mask (archMask.ts) and the model-space
   * windows the §11 readings project (#1683).
   */
  private landmarkParts: (MaskLandmarkPart & { stand: LandmarkStand })[] = [];
  /** The lit landmarks standing, with their stands, for the lamp positions the probe projects. */
  private litStands: { template: LandmarkTemplate; stand: LandmarkStand }[] = [];
  /** The collapse's clock, milliseconds on the bucket, while the debris falls; null at rest. */
  private fallStartedMs: number | null = null;
  private falling = false;
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
    placements?: readonly PropPlacement[],
    stands?: readonly LandmarkStand[]
  ): void {
    const generation = ++this.generation;
    this.clear();
    // Only the default placement stands the fields, so only it hazes them: the
    // opt-in study hands in its own budgeted list and stands no field. A
    // caller that hands in placements hands in the landmarks admitted beside
    // them (environment.ts `placeAll`), or none.
    const standsFields = placements === undefined;
    if (placements === undefined) {
      const all = placeAll(terrain, ENVIRONMENT_PROPS, this.look, this.fields, this.landmarks);
      placements = all.placements;
      stands = all.landmarks;
    }
    // The study's light and motion ride the default rebuild alone: the
    // session's layer, on the received ground. A layer handed its placements
    // (the region's baseline detail, drawn on the board without its session)
    // stands the landmark from a still template of its own, with no pool, no
    // guttering, no sway and no sift, the glass at its steady level, so the
    // session's clocks never reach the board's arch and the session's state
    // never switches the board's pools.
    const sifts: SiftSite[] = [];
    for (const stand of stands ?? []) {
      const template = this.standLandmark(stand, terrain, !standsFields, () => {
        if (generation === this.generation) {
          this.rebuild(terrain, groundY, standsFields ? undefined : placements, stands);
        }
      });
      if (template === null || !standsFields) continue;
      const prior = this.lastStates.get(stand.landmark.slug);
      this.lastStates.set(stand.landmark.slug, stand.state);
      if (template.uniforms === null) continue;
      this.lit.push(template);
      this.litStands.push({ template, stand });
      const state = template.states[stand.state];
      const { landmark } = stand;
      const originY = depthToWorldY(landmark.originFloorM);
      // The pools are the intact state's lamps': none on the ruined state
      // (§8), whose stone shares the intact state's materials, so the count
      // is switched with the state and the lamps go dark on this rebuild —
      // the first bucket after the cells turned to rock.
      template.uniforms.uPoolCount.value =
        stand.state === 'intact' && this.switches.pools
          ? Math.min(state.nodes.size, LAMP_COUNT, lampCount(state))
          : 0;
      for (const at of siftSites(state, stand.state).slice(0, SIFT_SITE_CAP[stand.state])) {
        const [x, z] = turned(at.x, at.z, landmark.yawRad);
        sifts.push({
          x: landmark.anchorXM + x,
          y: originY + at.y,
          z: landmark.anchorYM + z,
          xM: landmark.anchorXM,
          yM: landmark.anchorYM,
        });
      }
      // The collapse: this layer stood it intact and now stands it ruined,
      // on the ground change it just received. Reduced motion cuts to the
      // ruin with no sequence and no cloud (§8).
      if (prior === 'intact' && stand.state === 'ruined' && !this.reducedMotion) {
        this.falling = true;
        this.fallStartedMs = null;
        template.uniforms.uFallT.value = 0;
        // Along the wall's foot, where the face meets the floor (§6), from
        // the plan's west end to its east.
        const plan = stand.spec.plan.ruined;
        const foot = stand.spec.faceFootZ;
        const [wx, wz] = turned(plan.x[0], foot, landmark.yawRad);
        const [ex, ez] = turned(plan.x[1], foot, landmark.yawRad);
        const [sx, sz] = turned(0, 1, landmark.yawRad);
        this.cloud.build(
          [
            new Vector3(landmark.anchorXM + wx, originY, landmark.anchorYM + wz),
            new Vector3(landmark.anchorXM + ex, originY, landmark.anchorYM + ez),
          ],
          new Vector3(sx, 0, sz)
        );
        this.group.add(this.cloud.points);
      }
    }
    this.sift.build(sifts, this.shade);
    if (sifts.length > 0) this.group.add(this.sift.points);

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
  private standLandmark(
    stand: LandmarkStand,
    terrain: TerrainPayload,
    still: boolean,
    onReady: () => void
  ): LandmarkTemplate | null {
    const template = landmarkTemplate(stand.spec, onReady, this.look, still);
    if (template === null) return null;
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
      this.landmarkParts.push({
        mesh,
        material: part.material.name,
        uniforms: template.uniforms,
        stand,
      });
    }
    this.landmarksStanding++;
    this.landmarkTris += state.triangles;
    return template;
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
    this.tickLandmarks(nowMs);
    if (this.swaying.length === 0) return;
    const time = this.reducedMotion ? SWAY_HOLD_S : nowMs / 1000;
    for (const sway of this.swaying) sway.uSwayTime.value = time;
  }

  /**
   * The study's clocks, each on the 5 Hz bucket (rule 3): the four lamps'
   * levels and their pools with them, held at 1 under reduced motion; the
   * hung fittings' clock, held still; the debris's progress over
   * `FALL_SECONDS` from the first tick after the change, and the cloud's
   * over its 14 s, after which the cloud leaves the group.
   */
  private tickLandmarks(nowMs: number): void {
    this.sift.tick(nowMs);
    if (this.lit.length === 0) return;
    const stepped = Math.floor(nowMs / LIGHT_BUCKET_MS) * LIGHT_BUCKET_MS;
    const bucket = stepped / LIGHT_BUCKET_MS;
    const bucketChanged = bucket !== this.lampBucket;
    this.lampBucket = bucket;
    if (this.falling && this.fallStartedMs === null) this.fallStartedMs = stepped;
    const fallT =
      this.falling && this.fallStartedMs !== null
        ? Math.min(1, (stepped - this.fallStartedMs) / 1000 / FALL_SECONDS)
        : 1;
    if (fallT >= 1) this.falling = false;
    for (const { uniforms } of this.lit) {
      if (uniforms === null) continue;
      if (bucketChanged) {
        if (this.reducedMotion) uniforms.uLampLevel.value.fill(1);
        else lampLevels(bucket, uniforms.uLampLevel.value.length, uniforms.uLampLevel.value);
        for (let i = 0; i < uniforms.uPoolCount.value; i++) {
          uniforms.uPool.value[i * 4 + 3] = uniforms.uLampLevel.value[i]!;
        }
        // The harness's switch: the glass dark, so the lit stone can be read alone.
        if (!this.switches.lamps) uniforms.uLampLevel.value.fill(0);
      }
      uniforms.uHangTime.value = this.reducedMotion ? SWAY_HOLD_S : stepped / 1000;
      uniforms.uFallT.value = fallT;
    }
    if (this.cloud.motes > 0 && this.cloud.tick(nowMs)) this.group.remove(this.cloud.points);
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    this.plume.setReducedMotion(reduced);
    this.haze.setReducedMotion(reduced);
    this.sift.setReducedMotion(reduced);
    if (reduced) {
      // A sequence under way cuts to the ruin (§8), and the lamps settle on
      // the next bucket.
      this.falling = false;
      this.fallStartedMs = null;
      if (this.cloud.motes > 0) {
        this.cloud.clear();
        this.group.remove(this.cloud.points);
      }
      this.lampBucket = -1;
    }
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
    this.sift.setShade(shade);
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
    siftMotes: number;
    cloudMotes: number;
  } {
    return {
      props: this.props,
      propTris: this.propTris,
      ventPlumes: this.plume.plumes,
      fieldHazes: this.haze.fields,
      landmarks: this.landmarksStanding,
      landmarkTris: this.landmarkTris,
      siftMotes: this.sift.motes,
      cloudMotes: this.cloud.motes,
    };
  }

  /** Whether the collapse's debris is still coming down, for the tests and the probe. */
  get collapsing(): boolean {
    return this.falling;
  }

  /**
   * Flip the study's development switches (above); the pools take effect on
   * this call, the glass on the next bucket. Returns the switches as they
   * stand, so a harness can read them too.
   */
  setStudySwitches(switches: Partial<{ pools: boolean; lamps: boolean }>): {
    pools: boolean;
    lamps: boolean;
  } {
    this.switches = { ...this.switches, ...switches };
    for (const { template, stand } of this.litStands) {
      if (template.uniforms === null) continue;
      template.uniforms.uPoolCount.value =
        stand.state === 'intact' && this.switches.pools ? lampCount(template.states.intact) : 0;
    }
    this.lampBucket = -1;
    return { ...this.switches };
  }

  /** Where the lit landmarks' lamps stand, world units, for the probe to project. */
  lampPositions(): Vector3[] {
    const out: Vector3[] = [];
    for (const { template, stand } of this.litStands) {
      if (stand.state !== 'intact') continue;
      const { landmark } = stand;
      const originY = depthToWorldY(landmark.originFloorM);
      for (const at of lampCentres(template.states.intact)) {
        const [x, z] = turned(at.x, at.z, landmark.yawRad);
        out.push(new Vector3(landmark.anchorXM + x, originY + at.y, landmark.anchorYM + z));
      }
    }
    return out;
  }

  /** The landmark parts standing, for the study's per-material mask (archMask.ts). */
  maskParts(): readonly MaskLandmarkPart[] {
    return this.landmarkParts;
  }

  /**
   * Model-space points of the first landmark standing, in world units, for
   * the probe to project: §11's windows are named in the model's metres.
   * Null while no landmark stands.
   */
  landmarkPoints(points: readonly (readonly [number, number, number])[]): Vector3[] | null {
    const first = this.landmarkParts[0];
    if (first === undefined) return null;
    const { landmark } = first.stand;
    const originY = depthToWorldY(landmark.originFloorM);
    return points.map(([mx, my, mz]) => {
      const [x, z] = turned(mx, mz, landmark.yawRad);
      return new Vector3(landmark.anchorXM + x, originY + my, landmark.anchorYM + z);
    });
  }

  /**
   * Stand nothing, and let no template still loading stand anything again: a
   * session's ground let go (`PerspectiveView.clearTerrain`, #1460). The next
   * `rebuild` starts the layer afresh.
   */
  reset(): void {
    this.generation++;
    this.clear();
    this.lastStates.clear();
    this.falling = false;
    this.fallStartedMs = null;
    this.cloud.clear();
  }

  destroy(): void {
    this.reset();
    this.plume.dispose();
    this.haze.dispose();
    this.sift.dispose();
    this.cloud.dispose();
  }

  private clear(): void {
    for (const child of [...this.group.children]) {
      this.group.remove(child);
      // Instance attributes are this layer's own; geometry and material
      // belong to the template cache and must survive the rebuild.
      if (child instanceof InstancedMesh) child.dispose();
    }
    // Emptied, not disposed: their materials outlive the rebuild. The cloud
    // is not emptied here: a rebuild mid-sequence (a second delta in the 14 s)
    // leaves it settling, and the group it is re-added to is this one.
    this.plume.clear();
    this.haze.clear();
    this.sift.clear();
    this.lit = [];
    this.litStands = [];
    this.landmarkParts = [];
    this.props = 0;
    this.propTris = 0;
    this.landmarksStanding = 0;
    this.landmarkTris = 0;
    this.swaying = [];
    this.shaded = [];
  }
}
