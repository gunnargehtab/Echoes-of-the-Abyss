/**
 * The player's own ordnance in the conn view — torpedoes, mines, noisemakers
 * and depth charges as geometry, at own-force fidelity (docs/art-direction.md
 * "Own ordnance is geometry too", docs/graphics-standards.md gate 6).
 *
 * Own ordnance is own force: the server sends it in full (`OwnOrdnance`), so
 * drawing it leaks nothing, and the Asymmetric Fidelity Law is untouched —
 * the enemy's torpedo is a contact, resolved by the Echo Layer and drawn by
 * the chart at the tier it earned. What this layer adds is the missing half
 * of "you always hear it coming" (docs/systems-combat.md §5): the player sees
 * their own shot run.
 *
 * Instanced, like the depth cues and the props: one body mesh and one lamp
 * mesh per kind, and one LineSegments for every torpedo's cavitation trail —
 * nine objects for any amount of ordnance, and a kind with no instances is
 * hidden rather than drawn empty. Glow encodes loudness (gate 3): each lamp's
 * colour is the faction glow scaled by the live SIG on the spec curve, so a
 * running torpedo (60) burns, a noisemaker (70) burns brighter, and an armed
 * mine (2) is the near-black §6 asks for — a listener, not an emitter.
 */

import {
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ORDNANCE, OrdnanceKind, type OwnOrdnance } from '@echoes/shared';
import { SIG_GLOW_EFOLD } from './glow.ts';
import type { DepthCues } from './depthCues.ts';

/**
 * SPEC — gate 3's curve E(SIG) = 0.45·e^(SIG/14), read as a ratio against the
 * loudest thing this layer draws: a noisemaker's 70 (docs/systems-combat.md
 * §3) burns at full strength, and everything quieter sits below it on the
 * same e-folding the hull lamps use.
 */
export const LAMP_REFERENCE_SIG = ORDNANCE.NOISEMAKER.SIG;
/** TUNABLE — the floor keeps an armed mine's lamp a mark rather than nothing. */
export const LAMP_FLOOR = 0.04;

/** A lamp's strength, 0–1, for a piece of ordnance at this live SIG. */
export function lampBrightness(sig: number): number {
  return Math.min(1, Math.max(LAMP_FLOOR, Math.exp((sig - LAMP_REFERENCE_SIG) / SIG_GLOW_EFOLD)));
}

/** TUNABLE — the cavitation trail: segments per torpedo, metres each, and
 * the rise per segment (bubbles climb). Sized so a trail at true scale is a
 * third of a second of run. */
export const TRAIL_SEGMENTS = 6;
export const TRAIL_SEGMENT_M = 7;
export const TRAIL_RISE_M = 1.2;

/** Every kind the layer draws, in a fixed order so the probe and tests can
 * count them. */
export const ORDNANCE_KINDS: readonly OrdnanceKind[] = [
  OrdnanceKind.Torpedo,
  OrdnanceKind.Mine,
  OrdnanceKind.Noisemaker,
  OrdnanceKind.DepthCharge,
];

/** TUNABLE — the ground shadow's radius per kind, metres, before the draw scale. */
const SHADOW_M: Record<OrdnanceKind, number> = {
  [OrdnanceKind.Torpedo]: 4,
  [OrdnanceKind.Mine]: 3,
  [OrdnanceKind.Noisemaker]: 2.5,
  [OrdnanceKind.DepthCharge]: 2.5,
};

/** Where one piece of ordnance is drawn this frame, in world units. */
export interface OrdnancePlacement {
  x: number;
  z: number;
  /** The depth as a world Y, before the seabed clearance. */
  worldY: number;
  groundY: number;
}

/**
 * The shapes, in metres, bow on +X where a kind has one. A body and a lamp
 * per kind: the lamp is a separate mesh because an instanced mesh has one
 * material, and the lamp is the one part whose colour is per instance.
 */
function shapes(kind: OrdnanceKind): { body: BufferGeometry; lamp: BufferGeometry } {
  switch (kind) {
    case OrdnanceKind.Torpedo: {
      // A spindle: a tube and a nose cone, the drive glow at the tail.
      const tube = new CylinderGeometry(0.9, 0.9, 7, 8).rotateZ(-Math.PI / 2);
      const nose = new ConeGeometry(0.9, 2.5, 8).rotateZ(-Math.PI / 2).translate(4.75, 0, 0);
      const body = mergeGeometries([tube, nose]) ?? tube;
      return { body, lamp: new SphereGeometry(0.75, 8, 6).translate(-3.8, 0, 0) };
    }
    case OrdnanceKind.Mine:
      // A faceted sphere, the arming light on top — the one part that shows
      // from above, and barely.
      return {
        body: new IcosahedronGeometry(2.6, 0),
        lamp: new SphereGeometry(0.5, 6, 4).translate(0, 2.9, 0),
      };
    case OrdnanceKind.Noisemaker:
      // A canister with a lit band: the whole thing is a lamp by design.
      return {
        body: new CylinderGeometry(1.2, 1.2, 4, 10),
        lamp: new CylinderGeometry(1.4, 1.4, 0.9, 10),
      };
    case OrdnanceKind.DepthCharge:
      // A can, falling; a fuse light on top.
      return {
        body: new CylinderGeometry(1.6, 1.6, 4.5, 10),
        lamp: new SphereGeometry(0.45, 6, 4).translate(0, 2.6, 0),
      };
  }
}

const TMP_OBJECT = new Object3D();
const TMP_COLOR = new Color();
const HIDDEN = new Matrix4().makeScale(0, 0, 0);

export class OrdnanceLayer {
  /** Added to the scene once by the view. */
  readonly group = new Group();

  private capacity: number;
  private readonly bodies = new Map<OrdnanceKind, InstancedMesh>();
  private readonly lamps = new Map<OrdnanceKind, InstancedMesh>();
  private trail!: LineSegments;
  private trailPositions!: Float32BufferAttribute;
  private trailColors!: Float32BufferAttribute;

  private readonly bodyMaterial: MeshStandardMaterial;
  private readonly lampMaterial: MeshBasicMaterial;
  private readonly trailMaterial: LineBasicMaterial;
  private readonly glow = new Color(0xffffff);

  /** The depth-cue slot each live piece holds, by ordnance id. */
  private readonly slots = new Map<number, number>();
  private readonly counts = new Map<OrdnanceKind, number>();
  private live = 0;

  constructor(
    private readonly cues: DepthCues,
    capacity = 16
  ) {
    this.capacity = Math.max(1, capacity);
    // The hull's own rig lights the body (cold ambient, oblique key, cyan
    // rim); the lamp is unlit and carries its colour per instance.
    this.bodyMaterial = new MeshStandardMaterial({
      color: 0x808080,
      metalness: 0.35,
      roughness: 0.55,
    });
    this.lampMaterial = new MeshBasicMaterial({ color: 0xffffff });
    this.trailMaterial = new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.build();
  }

  /** Gate 4: the body wears the faction primary at hull value, the lamps its glow. */
  setPalette(primary: number, glow: number): void {
    // The same dark-livery lift the models get (rosterModels.ts): the primary
    // at half value, so the shot reads as the navy's without out-inking a hull.
    this.bodyMaterial.color.set(primary).multiplyScalar(0.55);
    this.glow.set(glow);
  }

  /** How many pieces of ordnance the layer is drawing. */
  get count(): number {
    return this.live;
  }

  /** Instances per kind, for the probe and the tests. */
  countOf(kind: OrdnanceKind): number {
    return this.counts.get(kind) ?? 0;
  }

  /** The drawn position of the i-th instance of a kind, for tests. */
  positionOf(kind: OrdnanceKind, index: number): { x: number; y: number; z: number } {
    const mesh = this.bodies.get(kind)!;
    mesh.getMatrixAt(index, TMP_OBJECT.matrix);
    TMP_OBJECT.matrix.decompose(TMP_OBJECT.position, TMP_OBJECT.quaternion, TMP_OBJECT.scale);
    return { x: TMP_OBJECT.position.x, y: TMP_OBJECT.position.y, z: TMP_OBJECT.position.z };
  }

  /** The vertices the trail draws this frame. */
  get trailVertexCount(): number {
    return this.trail.geometry.drawRange.count;
  }

  /**
   * Draw this snapshot's ordnance where `place` puts each piece. Rebuilds
   * every instance each call — the count is tens at most, and a torpedo moves
   * every frame anyway — so there is nothing to recycle but the cue slots.
   */
  sync(
    items: readonly OwnOrdnance[],
    place: (item: OwnOrdnance) => OrdnancePlacement,
    draw: number
  ): void {
    if (items.length > this.capacity) {
      while (this.capacity < items.length) this.capacity *= 2;
      this.build();
    }
    this.counts.clear();
    let trailVertex = 0;
    const seen = new Set<number>();
    for (const item of items) {
      const kind = item.kind;
      const index = this.counts.get(kind) ?? 0;
      this.counts.set(kind, index + 1);
      seen.add(item.id);

      const at = place(item);
      // The seabed clearance rides the scale, as a hull's does.
      const y = Math.max(at.worldY, at.groundY + 2 * draw);
      TMP_OBJECT.position.set(at.x, y, at.z);
      TMP_OBJECT.rotation.set(0, -item.heading, 0);
      TMP_OBJECT.scale.setScalar(draw);
      TMP_OBJECT.updateMatrix();
      const body = this.bodies.get(kind)!;
      const lamp = this.lamps.get(kind)!;
      body.setMatrixAt(index, TMP_OBJECT.matrix);
      lamp.setMatrixAt(index, TMP_OBJECT.matrix);
      lamp.setColorAt(index, TMP_COLOR.copy(this.glow).multiplyScalar(lampBrightness(item.sig)));

      // The plumb and shadow every own entity carries: a shot's height above
      // its shadow is its depth, exactly as a hull's is.
      let slot = this.slots.get(item.id);
      if (slot === undefined) {
        slot = this.cues.allocate();
        this.slots.set(item.id, slot);
      }
      this.cues.setPlumb(slot, at.x, y, at.groundY + 1, at.z);
      this.cues.setShadow(slot, at.x, at.groundY + 2, at.z, SHADOW_M[kind] * draw);

      if (kind === OrdnanceKind.Torpedo) {
        // Cavitation behind the run, fading with distance and climbing as
        // bubbles do. Trail geometry scales with the draw factor so it stays
        // a trail at survey zoom rather than a dot.
        const dx = -Math.cos(item.heading);
        const dz = -Math.sin(item.heading);
        for (let s = 0; s < TRAIL_SEGMENTS; s++) {
          for (let end = 0; end < 2; end++) {
            const k = s + end;
            const reach = k * TRAIL_SEGMENT_M * draw;
            this.trailPositions.setXYZ(
              trailVertex,
              at.x + dx * reach,
              y + k * TRAIL_RISE_M * draw,
              at.z + dz * reach
            );
            const fade = (1 - k / TRAIL_SEGMENTS) * lampBrightness(item.sig);
            this.trailColors.setXYZ(
              trailVertex,
              this.glow.r * fade,
              this.glow.g * fade,
              this.glow.b * fade
            );
            trailVertex++;
          }
        }
      }
    }

    for (const [id, slot] of this.slots) {
      if (!seen.has(id)) {
        this.cues.release(slot);
        this.slots.delete(id);
      }
    }
    this.live = items.length;

    for (const kind of ORDNANCE_KINDS) {
      const n = this.counts.get(kind) ?? 0;
      const body = this.bodies.get(kind)!;
      const lamp = this.lamps.get(kind)!;
      body.count = n;
      lamp.count = n;
      body.visible = n > 0;
      lamp.visible = n > 0;
      body.instanceMatrix.needsUpdate = true;
      lamp.instanceMatrix.needsUpdate = true;
      if (lamp.instanceColor !== null) lamp.instanceColor.needsUpdate = true;
    }
    this.trail.geometry.setDrawRange(0, trailVertex);
    this.trail.visible = trailVertex > 0;
    this.trailPositions.needsUpdate = true;
    this.trailColors.needsUpdate = true;
  }

  dispose(): void {
    for (const slot of this.slots.values()) this.cues.release(slot);
    this.slots.clear();
    this.group.clear();
    for (const mesh of this.bodies.values()) mesh.geometry.dispose();
    for (const mesh of this.lamps.values()) mesh.geometry.dispose();
    this.trail.geometry.dispose();
    this.bodyMaterial.dispose();
    this.lampMaterial.dispose();
    this.trailMaterial.dispose();
  }

  /** (Re)build the instanced meshes at the current capacity. */
  private build(): void {
    this.group.clear();
    for (const kind of ORDNANCE_KINDS) {
      const old = this.bodies.get(kind);
      const { body, lamp } =
        old === undefined
          ? shapes(kind)
          : { body: old.geometry, lamp: this.lamps.get(kind)!.geometry };
      const bodyMesh = new InstancedMesh(body, this.bodyMaterial, this.capacity);
      const lampMesh = new InstancedMesh(lamp, this.lampMaterial, this.capacity);
      bodyMesh.instanceMatrix.setUsage(DynamicDrawUsage);
      lampMesh.instanceMatrix.setUsage(DynamicDrawUsage);
      for (let i = 0; i < this.capacity; i++) {
        bodyMesh.setMatrixAt(i, HIDDEN);
        lampMesh.setMatrixAt(i, HIDDEN);
        lampMesh.setColorAt(i, TMP_COLOR.set(0x000000));
      }
      bodyMesh.count = 0;
      lampMesh.count = 0;
      bodyMesh.visible = false;
      lampMesh.visible = false;
      // An instanced mesh's bounding sphere is computed once from wherever
      // its instances were then; a shot laid across the map from there would
      // be culled the moment the camera left the first one. The cues and the
      // props opt out for the same reason.
      bodyMesh.frustumCulled = false;
      lampMesh.frustumCulled = false;
      bodyMesh.name = `ordnance_${kind}_body`;
      lampMesh.name = `ordnance_${kind}_lamp`;
      this.bodies.set(kind, bodyMesh);
      this.lamps.set(kind, lampMesh);
      this.group.add(bodyMesh, lampMesh);
    }
    const vertices = this.capacity * TRAIL_SEGMENTS * 2;
    this.trailPositions = new Float32BufferAttribute(new Float32Array(vertices * 3), 3);
    this.trailColors = new Float32BufferAttribute(new Float32Array(vertices * 3), 3);
    this.trailPositions.setUsage(DynamicDrawUsage);
    this.trailColors.setUsage(DynamicDrawUsage);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', this.trailPositions);
    geometry.setAttribute('color', this.trailColors);
    geometry.setDrawRange(0, 0);
    this.trail = new LineSegments(geometry, this.trailMaterial);
    this.trail.name = 'ordnance_trails';
    this.trail.visible = false;
    this.trail.frustumCulled = false;
    this.group.add(this.trail);
  }
}
