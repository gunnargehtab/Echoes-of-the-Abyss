/**
 * The perspective viewport — Phases 1–2 of docs/three-layer-ocean.md.
 *
 * A three.js scene beside the Pixi chart, behind a toggle: the authored ground
 * as a real heightfield (perspectiveTerrain.ts) wearing the seabed bake as its
 * skin, and the player's own force as the *approved roster models*
 * (rosterModels.ts) at their true depth — the flat baked sprites remain the
 * fallback while a model loads and for kinds without one. Contacts stay
 * tier-capped smudges. A WC3-lineage camera looks down and along at a fixed
 * pitch; yaw is locked, per the no-rotation rule the revision kept.
 *
 * What this deliberately is NOT yet: an order surface. Clicking a hull
 * highlights it — resolved through its outline volume, never its fins — but
 * the verbs and the HUD stay on the chart until Phase 3; this view pans,
 * zooms, and shows the water as a place.
 *
 * Rules carried over intact from the chart, because a renderer change must
 * never be a rules change:
 *
 * - **Server-authoritative fidelity.** This view draws the same resolved
 *   payloads the chart draws. A contact renders as a smudge scaled to its
 *   tier and never as a hull; there is nothing else here to draw it from.
 * - **Texture, not information.** The heightfield's detail relief is the
 *   render-only field from seabed.ts; nothing here reads it back as gameplay.
 * - **Glow is loudness.** Model lamps carry their intake-approved resting
 *   strength and swing with live SIG on the gate-3 curve (rosterModels.ts);
 *   the fallback sprites baked the same curve in.
 */

import {
  AdditiveBlending,
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Fog,
  Group,
  Line,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Raycaster,
  Scene,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import {
  Faction,
  ResolutionTier,
  statsFor,
  structureStatsFor,
  type Contact,
  type EchoSnapshot,
  type OwnStructure,
  type OwnUnit,
  type ResourceNodeInfo,
} from '@echoes/shared';
import type { TerrainPayload } from '../net/GameClient.ts';
import { ACTIVE_PALETTE, RESOURCE_COLOR, UI, VENT_EMBER } from './palette.ts';
import { bakeSeabed, emberFlicker, seabedSeed, ventEmbers } from './seabed.ts';
import {
  buildHeightGrid,
  depthToWorldY,
  rockTopDepthM,
  seabedDepthAtM,
} from './perspectiveTerrain.ts';
import { hullSpriteCanvas, hullSpriteSizeM } from './hullTextures.ts';
import { structureSpriteCanvas, structureSpriteSizeM } from './structureTextures.ts';
import { HULL_LENGTH_M, HULL_OUTLINE } from './silhouettes.ts';
import {
  applyLiveGlow,
  rosterModelInstance,
  type RosterModelInstance,
  type RosterModelKey,
} from './rosterModels.ts';

/** TUNABLE — camera pitch below horizontal, degrees. The WC3-lineage band the
 * revision names is 50–60°; Phase-1 screenshots settle the number. */
export const DEFAULT_PITCH_DEG = 55;

/** TUNABLE — vertical camera field of view, degrees. Narrow keeps the range-
 * ring foreshortening gentle; wide reads fisheye at RTS distance. */
const FOV_DEG = 40;

/** Pixel-ratio cap. The chart renders at native DPR; the 3D view trades a
 * little sharpness for headroom on the low-spec floor (gate 6's concern). */
const MAX_PIXEL_RATIO = 1.5;

/**
 * Where a contact with no earned depth hovers, in metres. Below Tier 3 the
 * server sends no depth, and a 3D scene cannot draw "somewhere in this
 * column" without picking a height — the chart never had to. This reference
 * depth is a stable, deliberately arbitrary choice; the honest treatment (a
 * column glyph, or nothing) is Phase 2/3's presentation question.
 */
const UNRESOLVED_CONTACT_DEPTH_M = 600;

/** World-metre diameter of a contact smudge per tier — diffuse when little is
 * known, tighter as resolution rises. Never a hull at any tier. */
const CONTACT_SIZE_M: Record<number, number> = {
  [ResolutionTier.Contact]: 320,
  [ResolutionTier.Bearing]: 220,
  [ResolutionTier.Classification]: 150,
  [ResolutionTier.Track]: 110,
};

interface EntityHandle {
  mesh: Mesh;
  /** The depth line and ground shadow that make band membership readable. */
  plumb: Line;
  shadow: Mesh;
  /** Cache key of the sprite canvas currently on the mesh. */
  spriteKey: string;
  widthM: number;
  heightM: number;
  /** The approved model, once loaded — Phase 2. Sprite hides while it shows. */
  model: RosterModelInstance | null;
  modelKey: string;
  /**
   * The pick volume: HULL_OUTLINE's extents extruded, invisible, and the only
   * thing a click may resolve through — never fins, frills or glow (the
   * footprint law, docs/three-layer-ocean.md §4).
   */
  pick: Mesh;
  /** Chart-parity selection ring radius. */
  ringRadiusM: number;
}

/** Everything one entity's sync needs, sprite path and model path alike. */
interface EntitySpec {
  spriteKey: string;
  canvas: HTMLCanvasElement | null;
  sizeM: { widthM: number; heightM: number };
  x: number;
  z: number;
  depthM: number;
  yaw: number;
  dimmed: boolean;
  /** null keeps the entity on the sprite path (construction sites, VentTap). */
  modelDesc: RosterModelKey | null;
  modelCacheKey: string;
  liveSig: number;
  restSig: number;
  pickLengthM: number;
  pickBeamM: number;
}

/** Half-beam of a hull outline, as a fraction of hull length. */
function outlineHalfBeam(outline: readonly (readonly number[])[]): number {
  let max = 0;
  for (const [, py] of outline) max = Math.max(max, Math.abs(py!));
  return max;
}

export class PerspectiveView {
  private renderer: WebGLRenderer | null = null;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(FOV_DEG, 1, 10, 60_000);
  private host: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;

  /** Camera rig: a ground target, a dolly distance, a fixed pitch, no yaw. */
  private readonly target = new Vector3();
  private distance = 4000;
  private pitchDeg = DEFAULT_PITCH_DEG;

  private terrain: TerrainPayload | null = null;
  private terrainMesh: Mesh | null = null;
  private embers: Points | null = null;
  private emberPhases: number[] = [];
  private emberBucket = -1;

  private readonly nodeGroup = new Group();
  private readonly unitGroup = new Group();
  private readonly structureGroup = new Group();
  private readonly contactGroup = new Group();

  private faction: Faction = Faction.Bathyarch;
  private units: OwnUnit[] = [];
  private structures: OwnStructure[] = [];
  private contacts: Contact[] = [];
  private nodes: ResourceNodeInfo[] = [];
  private readonly headings = new Map<number, number>();
  private readonly lastPositions = new Map<number, { x: number; y: number }>();

  private readonly unitHandles = new Map<number, EntityHandle>();
  private readonly structureHandles = new Map<number, EntityHandle>();
  private readonly contactSprites = new Map<number, Sprite>();
  private readonly spriteTextures = new Map<string, CanvasTexture>();
  private readonly smudgeTextures = new Map<number, CanvasTexture>();

  /**
   * View-local selection — a highlight, not an order channel. Clicking a hull
   * here answers "which one is that"; commanding it stays on the chart until
   * Phase 3 wires the verbs into this view.
   */
  private selected: { kind: 'unit' | 'structure'; id: number } | null = null;
  private readonly selectionRing: LineLoop;

  private active = false;
  private frameHandle = 0;
  private lastFrameAt = 0;
  /** Rolling frame-cost telemetry for the gate-6 measurement. */
  private frameCostMs: number[] = [];
  private worstFrameMs = 0;

  constructor() {
    this.scene.add(this.nodeGroup, this.unitGroup, this.structureGroup, this.contactGroup);
    this.scene.background = new Color(UI.background);

    // Lights exist for the roster models alone: the terrain, sprites and
    // smudges are unlit materials with their shading baked in, so these
    // touch nothing else. The rig transcribes the sprite bake's (bake.ts):
    // a cold ambient so black water never crushes to nothing, an oblique key
    // from high north-west, and a hard cyan rim from the north — the same
    // rim the prompt kit poses every model against.
    this.scene.add(new AmbientLight(0x5a6b80, 0.65));
    const key = new DirectionalLight(0xdfe8f0, 1.35);
    key.position.set(-1400, 2600, -900);
    this.scene.add(key, key.target);
    const rim = new DirectionalLight(0x9fd8ff, 1.0);
    rim.position.set(0, 900, -3000);
    this.scene.add(rim, rim.target);

    // The selection ring, chart-parity: UI.text, a circle around the hull.
    const ringPoints: Vector3[] = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      ringPoints.push(new Vector3(Math.cos(a), 0, Math.sin(a)));
    }
    this.selectionRing = new LineLoop(
      new BufferGeometry().setFromPoints(ringPoints),
      new LineBasicMaterial({ color: UI.text, transparent: true, opacity: 0.8 })
    );
    this.selectionRing.visible = false;
    this.scene.add(this.selectionRing);
  }

  /** Create the GL surface. Returns false when WebGL is unavailable. */
  mount(host: HTMLElement): boolean {
    if (this.renderer !== null) return true;
    try {
      this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      return false;
    }
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    host.appendChild(this.renderer.domElement);
    this.host = host;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.attachInput(this.renderer.domElement);
    this.rebuildTerrain();
    this.exposeProbe();
    return true;
  }

  setActive(active: boolean): void {
    if (active === this.active) return;
    this.active = active;
    if (active) {
      this.lastFrameAt = performance.now();
      const loop = () => {
        if (!this.active) return;
        this.frameHandle = requestAnimationFrame(loop);
        this.renderFrame();
      };
      this.frameHandle = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(this.frameHandle);
    }
  }

  /** Pitch below horizontal, clamped to something that still reads as RTS. */
  setPitchDeg(deg: number): void {
    this.pitchDeg = Math.min(85, Math.max(35, deg));
  }

  setIdentity(_slot: number, faction: Faction): void {
    this.faction = faction;
  }

  setTerrain(terrain: TerrainPayload): void {
    // A defensive copy: the chart mutates its payload in place on ground
    // deltas, and two views double-applying deltas to one shared object is
    // the bug this copy exists to make impossible.
    this.terrain = {
      ...terrain,
      biomes: [...terrain.biomes],
      floor: [...terrain.floor],
      ceiling: [...terrain.ceiling],
    };
    const widthM = terrain.cols * terrain.cellM;
    const heightM = terrain.rows * terrain.cellM;
    this.target.set(widthM / 2, 0, heightM / 2);
    this.distance = Math.max(widthM, heightM) * 1.05;
    this.rebuildTerrain();
  }

  applyGround(
    cells: readonly { index: number; floorM: number; ceilingM: number; biome: number }[]
  ): void {
    const terrain = this.terrain;
    if (terrain === null || cells.length === 0) return;
    for (const cell of cells) {
      if (cell.index < 0 || cell.index >= terrain.floor.length) continue;
      terrain.floor[cell.index] = cell.floorM;
      terrain.ceiling[cell.index] = cell.ceilingM;
      terrain.biomes[cell.index] = cell.biome;
    }
    this.rebuildTerrain();
  }

  setNodes(nodes: ResourceNodeInfo[]): void {
    this.nodes = nodes;
    this.rebuildNodes();
  }

  applySnapshot(snapshot: EchoSnapshot): void {
    this.units = snapshot.units;
    this.structures = snapshot.structures;
    this.contacts = snapshot.contacts;
    // Headings from motion, exactly as the chart derives them: the server
    // sends none for own units, and a hull snapping to 0° when it stops
    // would read as broken here too.
    for (const unit of snapshot.units) {
      const prev = this.lastPositions.get(unit.id);
      if (prev !== undefined) {
        const dx = unit.x - prev.x;
        const dy = unit.y - prev.y;
        if (Math.hypot(dx, dy) > 1) this.headings.set(unit.id, Math.atan2(dy, dx));
        prev.x = unit.x;
        prev.y = unit.y;
      } else {
        this.lastPositions.set(unit.id, { x: unit.x, y: unit.y });
      }
    }
    if (this.renderer !== null) this.syncEntities();
  }

  resetForNewMatch(): void {
    this.units = [];
    this.structures = [];
    this.contacts = [];
    this.headings.clear();
    this.lastPositions.clear();
    this.selected = null;
    if (this.renderer !== null) this.syncEntities();
  }

  destroy(): void {
    this.setActive(false);
    this.resizeObserver?.disconnect();
    for (const texture of this.spriteTextures.values()) texture.dispose();
    for (const texture of this.smudgeTextures.values()) texture.dispose();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.renderer = null;
    delete (window as unknown as { __perspectiveProbe?: unknown }).__perspectiveProbe;
    delete (window as unknown as { __perspectiveCamera?: unknown }).__perspectiveCamera;
  }

  // ------------------------------------------------------------------ scene

  private rebuildTerrain(): void {
    if (this.renderer === null || this.terrain === null) return;
    const terrain = this.terrain;

    if (this.terrainMesh !== null) {
      this.scene.remove(this.terrainMesh);
      this.terrainMesh.geometry.dispose();
      (this.terrainMesh.material as MeshBasicMaterial).map?.dispose();
      (this.terrainMesh.material as MeshBasicMaterial).dispose();
    }
    if (this.embers !== null) {
      this.scene.remove(this.embers);
      this.embers.geometry.dispose();
      (this.embers.material as PointsMaterial).dispose();
    }

    // The grid gives the ground its shape; the seabed bake gives it its skin.
    // One texture, one geometry, one draw call — the lighting is already in
    // the bake, so the material is deliberately unlit.
    const grid = buildHeightGrid(terrain);
    const positions = new Float32Array(grid.vertsX * grid.vertsZ * 3);
    const uvs = new Float32Array(grid.vertsX * grid.vertsZ * 2);
    for (let iz = 0; iz < grid.vertsZ; iz++) {
      for (let ix = 0; ix < grid.vertsX; ix++) {
        const i = iz * grid.vertsX + ix;
        positions[i * 3] = ix * grid.stepM;
        positions[i * 3 + 1] = grid.y[i]!;
        positions[i * 3 + 2] = iz * grid.stepM;
        uvs[i * 2] = (ix * grid.stepM) / grid.widthM;
        uvs[i * 2 + 1] = (iz * grid.stepM) / grid.heightM;
      }
    }
    const indices = new Uint32Array((grid.vertsX - 1) * (grid.vertsZ - 1) * 6);
    let k = 0;
    for (let iz = 0; iz < grid.vertsZ - 1; iz++) {
      for (let ix = 0; ix < grid.vertsX - 1; ix++) {
        const a = iz * grid.vertsX + ix;
        const b = a + 1;
        const c = a + grid.vertsX;
        const d = c + 1;
        indices[k++] = a;
        indices[k++] = c;
        indices[k++] = b;
        indices[k++] = b;
        indices[k++] = c;
        indices[k++] = d;
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
    geometry.setIndex(new BufferAttribute(indices, 1));

    const texture = new CanvasTexture(bakeSeabed(terrain));
    // The bake's row 0 is the map's north edge, and so is the grid's iz 0;
    // an unflipped texture keeps the two aligned without inverting the v axis.
    texture.flipY = false;
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    this.terrainMesh = new Mesh(geometry, new MeshBasicMaterial({ map: texture }));
    this.scene.add(this.terrainMesh);

    // Depth haze: the fog is the water. Scaled to the map so a small arena
    // and a large one both fade at their own horizon, in the same abyss hue
    // as the background — distance and depth read as one darkness. The near
    // plane sits past the fitted camera's own distance, so the whole-map view
    // is hazed rather than swallowed; only the far half of a map fades hard.
    const diagonal = Math.hypot(grid.widthM, grid.heightM);
    this.scene.fog = new Fog(UI.background, diagonal * 0.55, diagonal * 2.1);

    // Vent embers as one Points cloud: per-ember flicker rides the colour
    // attribute under additive blending, so 400 embers stay one draw call.
    // The 5 Hz step and the SPEC ember hue are seabed.ts's, unchanged.
    const embers = ventEmbers(terrain, seabedSeed(terrain));
    this.emberPhases = embers.map((e) => e.phase);
    if (embers.length > 0) {
      const emberPositions = new Float32Array(embers.length * 3);
      const emberColors = new Float32Array(embers.length * 3);
      const seed = seabedSeed(terrain);
      const rockTop = rockTopDepthM(terrain);
      embers.forEach((ember, i) => {
        emberPositions[i * 3] = ember.xM;
        emberPositions[i * 3 + 1] =
          depthToWorldY(seabedDepthAtM(terrain, seed, rockTop, ember.xM, ember.yM)) + 6;
        emberPositions[i * 3 + 2] = ember.yM;
      });
      const emberGeometry = new BufferGeometry();
      emberGeometry.setAttribute('position', new BufferAttribute(emberPositions, 3));
      emberGeometry.setAttribute('color', new BufferAttribute(emberColors, 3));
      this.embers = new Points(
        emberGeometry,
        new PointsMaterial({
          size: 55,
          sizeAttenuation: true,
          vertexColors: true,
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
          // A point without a map rasterises as a square; an ember is a glow.
          map: this.emberSpriteTexture(),
        })
      );
      this.embers.renderOrder = 1;
      this.scene.add(this.embers);
      this.emberBucket = -1;
    } else {
      this.embers = null;
    }

    this.rebuildNodes();
    this.syncEntities();
  }

  private rebuildNodes(): void {
    if (this.renderer === null || this.terrain === null) return;
    this.nodeGroup.clear();
    for (const node of this.nodes) {
      const radius = 60 + (node.initialAmount / 3000) * 40;
      const disc = new Mesh(
        new CircleGeometry(radius, 24),
        // Quiet on purpose: chart data may never outshine a contact, and the
        // first cut of this disc did.
        new MeshBasicMaterial({
          color: RESOURCE_COLOR[node.kind],
          transparent: true,
          opacity: 0.14,
          depthWrite: false,
        })
      );
      disc.rotation.x = -Math.PI / 2;
      // The field sits at its own authored depth, not on the local seabed:
      // a Crystal field's depth is the commitment it prices (economy.md §7).
      disc.position.set(node.x, depthToWorldY(node.depth) + 3, node.y);
      this.nodeGroup.add(disc);
    }
  }

  private groundYAt(xM: number, zM: number): number {
    const terrain = this.terrain;
    if (terrain === null) return 0;
    return depthToWorldY(
      seabedDepthAtM(terrain, seabedSeed(terrain), rockTopDepthM(terrain), xM, zM)
    );
  }

  private spriteTexture(key: string, canvas: HTMLCanvasElement): CanvasTexture {
    let texture = this.spriteTextures.get(key);
    if (texture === undefined) {
      texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      this.spriteTextures.set(key, texture);
    }
    return texture;
  }

  /**
   * One tier's smudge: a soft radial blot in the tier's ink. Tier is the only
   * thing it can say, which is the Asymmetric Fidelity Law doing its job.
   */
  private smudgeTexture(tier: ResolutionTier): CanvasTexture {
    let texture = this.smudgeTextures.get(tier);
    if (texture !== undefined) return texture;
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    // A Silent contact is not a contact — the server never sends one — so the
    // palette's tier table rightly has no row for it; UI.text is the null ink.
    const color =
      tier === ResolutionTier.Silent
        ? UI.text
        : ACTIVE_PALETTE.tier[tier as Exclude<ResolutionTier, ResolutionTier.Silent>].color;
    const css = `#${color.toString(16).padStart(6, '0')}`;
    const sharp = tier >= ResolutionTier.Classification;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, css);
    gradient.addColorStop(sharp ? 0.45 : 0.2, css);
    gradient.addColorStop(1, `${css}00`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    this.smudgeTextures.set(tier, texture);
    return texture;
  }

  /** The ember point's shape: a white radial glow the colour attribute tints. */
  private emberSprite: CanvasTexture | null = null;

  private emberSpriteTexture(): CanvasTexture {
    if (this.emberSprite !== null) return this.emberSprite;
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, '#ffffffb0');
    gradient.addColorStop(1, '#ffffff00');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    this.emberSprite = new CanvasTexture(canvas);
    return this.emberSprite;
  }

  /** Remove everything one entity put in the scene. */
  private dropHandle(group: Group, handle: EntityHandle): void {
    group.remove(handle.mesh, handle.plumb, handle.shadow, handle.pick);
    if (handle.model !== null) group.remove(handle.model.root);
  }

  /**
   * Build or update one own entity: the approved model once it is loaded, the
   * Phase-1 flat sprite until then (and for kinds that have none), plus the
   * plumb, shadow and pick volume either way.
   */
  private syncEntity(
    handles: Map<number, EntityHandle>,
    group: Group,
    id: number,
    spec: EntitySpec
  ): void {
    if (spec.canvas === null && spec.modelDesc === null) return;
    let handle = handles.get(id);
    if (handle === undefined) {
      const mesh = new Mesh(
        new PlaneGeometry(1, 1),
        new MeshBasicMaterial({
          transparent: true,
          side: DoubleSide,
          depthWrite: false,
        })
      );
      mesh.rotation.order = 'YXZ';
      mesh.rotation.x = -Math.PI / 2;
      const plumb = new Line(
        new BufferGeometry().setFromPoints([new Vector3(), new Vector3()]),
        new LineBasicMaterial({ color: UI.accent, transparent: true, opacity: 0.22 })
      );
      const shadow = new Mesh(
        new CircleGeometry(1, 20),
        new MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
        })
      );
      shadow.rotation.x = -Math.PI / 2;
      // The pick volume renders nothing (colorWrite off) but stays visible to
      // the raycaster. Its extents are the outline's, not the model's: what
      // you click is what the simulation collides.
      const pick = new Mesh(
        new BoxGeometry(1, 1, 1),
        new MeshBasicMaterial({ colorWrite: false, depthWrite: false })
      );
      pick.scale.set(
        spec.pickLengthM,
        Math.max(8, spec.pickBeamM * 0.7),
        Math.max(spec.pickBeamM, 4)
      );
      group.add(mesh, plumb, shadow, pick);
      handle = {
        mesh,
        plumb,
        shadow,
        pick,
        spriteKey: '',
        widthM: 0,
        heightM: 0,
        model: null,
        modelKey: '',
        ringRadiusM: spec.pickLengthM / 2 + 8,
      };
      handles.set(id, handle);
    }

    // The model path: swap in the approved mesh the moment its template is
    // ready. A construction site passes modelDesc null and stays schematic
    // (gate 1's scaffold register) until commissioned.
    if (spec.modelDesc !== null && handle.modelKey !== spec.modelCacheKey) {
      const instance = rosterModelInstance(spec.modelDesc);
      if (instance !== null) {
        if (handle.model !== null) group.remove(handle.model.root);
        handle.model = instance;
        handle.modelKey = spec.modelCacheKey;
        group.add(instance.root);
      }
    } else if (spec.modelDesc === null && handle.model !== null) {
      group.remove(handle.model.root);
      handle.model = null;
      handle.modelKey = '';
    }
    const model = spec.modelDesc === null ? null : handle.model;
    handle.mesh.visible = model === null;

    if (handle.spriteKey !== spec.spriteKey && spec.canvas !== null) {
      const material = handle.mesh.material as MeshBasicMaterial;
      material.map = this.spriteTexture(spec.spriteKey, spec.canvas);
      material.needsUpdate = true;
      handle.mesh.scale.set(spec.sizeM.widthM, spec.sizeM.heightM, 1);
      handle.spriteKey = spec.spriteKey;
      handle.widthM = spec.sizeM.widthM;
      handle.heightM = spec.sizeM.heightM;
    }

    const y = depthToWorldY(spec.depthM);
    const groundY = this.groundYAt(spec.x, spec.z);
    const hullY = Math.max(y, groundY + 4);
    if (model !== null) {
      model.root.position.set(spec.x, hullY, spec.z);
      model.root.rotation.y = -spec.yaw;
      // Loudness is the lights, not the paint: live SIG swings the lamps
      // around the intake-approved resting strength (gate 3), so a hull
      // running silent goes dark instead of translucent.
      applyLiveGlow(model, spec.liveSig, spec.restSig);
    } else {
      handle.mesh.position.set(spec.x, hullY, spec.z);
      handle.mesh.rotation.y = -spec.yaw;
      (handle.mesh.material as MeshBasicMaterial).opacity = spec.dimmed ? 0.45 : 1;
    }
    handle.pick.position.set(spec.x, hullY, spec.z);
    handle.pick.rotation.y = -spec.yaw;
    handle.pick.userData.id = id;

    // The plumb line and ground shadow are what make the water column
    // readable: a hull's height above its own shadow *is* its depth. The
    // interface voice (cyan), because depth here is information, not threat.
    const positions = handle.plumb.geometry.getAttribute('position') as BufferAttribute;
    positions.setXYZ(0, spec.x, y, spec.z);
    positions.setXYZ(1, spec.x, groundY + 1, spec.z);
    positions.needsUpdate = true;
    const shadowRadius =
      model !== null
        ? Math.max(model.lengthM, model.beamM) * 0.4
        : Math.max(handle.widthM, handle.heightM) * 0.35;
    handle.shadow.scale.set(shadowRadius, shadowRadius, 1);
    handle.shadow.position.set(spec.x, groundY + 2, spec.z);
  }

  private syncEntities(): void {
    if (this.terrain === null) return;

    for (const [id, handle] of this.unitHandles) {
      if (!this.units.some((u) => u.id === id)) {
        this.dropHandle(this.unitGroup, handle);
        this.unitHandles.delete(id);
      }
    }
    for (const unit of this.units) {
      const lengthM = HULL_LENGTH_M[unit.kind];
      this.syncEntity(this.unitHandles, this.unitGroup, unit.id, {
        spriteKey: `unit:${unit.kind}:${this.faction}:${ACTIVE_PALETTE.name}`,
        canvas: hullSpriteCanvas(unit.kind, this.faction),
        sizeM: hullSpriteSizeM(unit.kind, this.faction),
        x: unit.x,
        z: unit.y,
        depthM: unit.depth,
        yaw: this.headings.get(unit.id) ?? 0,
        dimmed: unit.silentRunning,
        modelDesc: { unit: unit.kind, faction: this.faction },
        modelCacheKey: `unit:${unit.kind}:${this.faction}:${ACTIVE_PALETTE.name}`,
        liveSig: unit.sig,
        restSig: statsFor(unit.kind).sigIdle,
        pickLengthM: lengthM,
        pickBeamM: 2 * outlineHalfBeam(HULL_OUTLINE[unit.kind]) * lengthM,
      });
    }

    for (const [id, handle] of this.structureHandles) {
      if (!this.structures.some((s) => s.id === id)) {
        this.dropHandle(this.structureGroup, handle);
        this.structureHandles.delete(id);
      }
    }
    for (const structure of this.structures) {
      // A construction site keeps the schematic sprite until commissioned —
      // gate 1's scaffold register — and takes its approved model only at
      // buildProgress 1, exactly when the chart swaps in its baked sprite.
      const commissioned = structure.buildProgress >= 1;
      const footprintM = structureStatsFor(structure.kind).radiusM * 2;
      this.syncEntity(this.structureHandles, this.structureGroup, structure.id, {
        spriteKey: `structure:${structure.kind}:${this.faction}:${ACTIVE_PALETTE.name}`,
        canvas: structureSpriteCanvas(structure.kind, this.faction),
        sizeM: structureSpriteSizeM(structure.kind, this.faction),
        x: structure.x,
        z: structure.y,
        depthM: structure.depth,
        yaw: 0,
        dimmed: !commissioned,
        modelDesc: commissioned ? { structure: structure.kind, faction: this.faction } : null,
        modelCacheKey: commissioned
          ? `structure:${structure.kind}:${this.faction}:${ACTIVE_PALETTE.name}`
          : '',
        liveSig: structure.sig,
        restSig: structureStatsFor(structure.kind).sigIdle,
        pickLengthM: footprintM,
        pickBeamM: footprintM,
      });
    }

    this.updateSelectionRing();

    const liveContacts = new Set(this.contacts.map((c) => c.id));
    for (const [id, sprite] of this.contactSprites) {
      if (!liveContacts.has(id)) {
        this.contactGroup.remove(sprite);
        sprite.material.dispose();
        this.contactSprites.delete(id);
      }
    }
    for (const contact of this.contacts) {
      let sprite = this.contactSprites.get(contact.id);
      if (sprite === undefined) {
        sprite = new Sprite(
          new SpriteMaterial({ transparent: true, depthWrite: false, opacity: 0.85 })
        );
        this.contactGroup.add(sprite);
        this.contactSprites.set(contact.id, sprite);
      }
      sprite.material.map = this.smudgeTexture(contact.tier);
      sprite.material.needsUpdate = true;
      const sizeM = CONTACT_SIZE_M[contact.tier] ?? CONTACT_SIZE_M[ResolutionTier.Contact]!;
      sprite.scale.set(sizeM, sizeM, 1);
      sprite.position.set(
        contact.x,
        depthToWorldY(contact.depth ?? UNRESOLVED_CONTACT_DEPTH_M),
        contact.y
      );
    }
  }

  // ----------------------------------------------------------------- camera

  private applyCamera(): void {
    const pitch = (this.pitchDeg * Math.PI) / 180;
    const groundY = this.groundYAt(this.target.x, this.target.z);
    const look = new Vector3(this.target.x, groundY, this.target.z);
    this.camera.position.set(
      look.x,
      look.y + Math.sin(pitch) * this.distance,
      // South of the target, looking north: the viewport and the sonar scope
      // must agree on north, which is the yaw lock's whole argument.
      look.z + Math.cos(pitch) * this.distance
    );
    this.camera.lookAt(look);
  }

  private attachInput(canvas: HTMLCanvasElement): void {
    let panning = false;
    /** True once the pointer has travelled past tap slop — then it is a pan,
     * and releasing it must not also pick. */
    let dragged = false;
    let lastX = 0;
    let lastY = 0;
    const TAP_SLOP_PX = 5;

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      panning = true;
      dragged = false;
      lastX = e.clientX;
      lastY = e.clientY;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already gone — the drag just will not survive the edge */
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!panning) return;
      if (!dragged && Math.hypot(e.clientX - lastX, e.clientY - lastY) < TAP_SLOP_PX) return;
      dragged = true;
      const pitch = (this.pitchDeg * Math.PI) / 180;
      const height = canvas.clientHeight || 1;
      const worldPerPx = (2 * this.distance * Math.tan(((FOV_DEG / 2) * Math.PI) / 180)) / height;
      this.target.x -= (e.clientX - lastX) * worldPerPx;
      // Screen-vertical motion maps onto the ground plane through the pitch:
      // at 90° they are equal; shallower pitches cover more ground per pixel.
      this.target.z -= ((e.clientY - lastY) * worldPerPx) / Math.max(0.2, Math.sin(pitch));
      lastX = e.clientX;
      lastY = e.clientY;
      this.clampTarget();
    });
    canvas.addEventListener('pointerup', (e) => {
      if (panning && !dragged) this.pickAt(e.clientX, e.clientY, canvas);
      panning = false;
    });
    canvas.addEventListener('pointercancel', () => {
      panning = false;
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const factor = Math.pow(1.15, e.deltaY / 100);
        const diagonal = this.mapDiagonal();
        const next = Math.min(diagonal * 2.2, Math.max(250, this.distance * factor));
        // Zoom about the cursor, as the chart does: the ground point under
        // the pointer stays under it while the dolly moves.
        const cursor = this.groundPointAt(e.clientX, e.clientY, canvas);
        if (cursor !== null) {
          this.target.lerp(cursor, 1 - next / this.distance);
          this.clampTarget();
        }
        this.distance = next;
      },
      { passive: false }
    );
  }

  /**
   * Resolve a click through the pick volumes — outline extents only, so a fin
   * or a glow halo never catches a click its hull would not (the footprint
   * law). A miss clears the highlight, as it does on the chart.
   */
  private pickAt(clientX: number, clientY: number, canvas: HTMLCanvasElement): void {
    const rect = canvas.getBoundingClientRect();
    const ndc = new Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new Raycaster();
    raycaster.setFromCamera(ndc, this.camera);
    const unitPicks = [...this.unitHandles.values()].map((h) => h.pick);
    const structurePicks = [...this.structureHandles.values()].map((h) => h.pick);
    const hits = raycaster.intersectObjects([...unitPicks, ...structurePicks], false);
    const first = hits[0]?.object;
    if (first === undefined) {
      this.selected = null;
    } else {
      this.selected = {
        kind: unitPicks.includes(first as Mesh) ? 'unit' : 'structure',
        id: first.userData.id as number,
      };
    }
    this.updateSelectionRing();
  }

  /** Keep the highlight on its hull, and drop it the moment the hull is gone. */
  private updateSelectionRing(): void {
    const selected = this.selected;
    if (selected === null) {
      this.selectionRing.visible = false;
      return;
    }
    const handles = selected.kind === 'unit' ? this.unitHandles : this.structureHandles;
    const handle = handles.get(selected.id);
    if (handle === undefined) {
      this.selected = null;
      this.selectionRing.visible = false;
      return;
    }
    this.selectionRing.position.copy(handle.pick.position);
    this.selectionRing.scale.setScalar(handle.ringRadiusM);
    this.selectionRing.visible = true;
  }

  private mapDiagonal(): number {
    const terrain = this.terrain;
    if (terrain === null) return 8000;
    return Math.hypot(terrain.cols * terrain.cellM, terrain.rows * terrain.cellM);
  }

  private clampTarget(): void {
    const terrain = this.terrain;
    if (terrain === null) return;
    this.target.x = Math.min(terrain.cols * terrain.cellM, Math.max(0, this.target.x));
    this.target.z = Math.min(terrain.rows * terrain.cellM, Math.max(0, this.target.z));
  }

  /** The point on the camera-target ground plane under a client position. */
  private groundPointAt(
    clientX: number,
    clientY: number,
    canvas: HTMLCanvasElement
  ): Vector3 | null {
    const rect = canvas.getBoundingClientRect();
    const ndc = new Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new Raycaster();
    raycaster.setFromCamera(ndc, this.camera);
    const groundY = this.groundYAt(this.target.x, this.target.z);
    const direction = raycaster.ray.direction;
    if (Math.abs(direction.y) < 1e-6) return null;
    const t = (groundY - raycaster.ray.origin.y) / direction.y;
    if (t <= 0) return null;
    return raycaster.ray.origin.clone().addScaledVector(direction, t);
  }

  // ------------------------------------------------------------------ frame

  private resize(): void {
    if (this.renderer === null || this.host === null) return;
    const width = this.host.clientWidth || 1;
    const height = this.host.clientHeight || 1;
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private renderFrame(): void {
    const renderer = this.renderer;
    if (renderer === null) return;
    const now = performance.now();
    const frameMs = now - this.lastFrameAt;
    this.lastFrameAt = now;
    if (frameMs < 500) {
      // Ignore tab-hidden gaps; a 4-second "frame" is not a frame.
      this.frameCostMs.push(frameMs);
      if (this.frameCostMs.length > 240) this.frameCostMs.shift();
      if (frameMs > this.worstFrameMs) this.worstFrameMs = frameMs;
    }

    // Ember flicker steps on the 5 Hz sonar bucket, never smoothly — the
    // seabed's one light keeps the register (docs/art-direction.md).
    if (this.embers !== null) {
      const bucket = Math.floor(now / 200);
      if (bucket !== this.emberBucket) {
        this.emberBucket = bucket;
        const colors = this.embers.geometry.getAttribute('color') as BufferAttribute;
        const ember = new Color(VENT_EMBER);
        for (let i = 0; i < this.emberPhases.length; i++) {
          const level = 0.55 * emberFlicker(i, bucket, this.emberPhases[i]!);
          colors.setXYZ(i, ember.r * level, ember.g * level, ember.b * level);
        }
        colors.needsUpdate = true;
      }
    }

    this.applyCamera();
    renderer.render(this.scene, this.camera);
  }

  /** Read-only telemetry for the harness, like the audio and hazard probes. */
  private exposeProbe(): void {
    (window as unknown as { __perspectiveProbe?: () => unknown }).__perspectiveProbe = () => {
      const info = this.renderer?.info;
      const frames = this.frameCostMs;
      const average = frames.length === 0 ? 0 : frames.reduce((a, b) => a + b, 0) / frames.length;
      return {
        active: this.active,
        pitchDeg: this.pitchDeg,
        distance: Math.round(this.distance),
        drawCalls: info?.render.calls ?? 0,
        triangles: info?.render.triangles ?? 0,
        avgFrameMs: Number(average.toFixed(2)),
        worstFrameMs: Number(this.worstFrameMs.toFixed(2)),
        units: this.unitHandles.size,
        structures: this.structureHandles.size,
        contacts: this.contactSprites.size,
        modelBacked:
          [...this.unitHandles.values()].filter((h) => h.model !== null).length +
          [...this.structureHandles.values()].filter((h) => h.model !== null).length,
        selected: this.selected,
        ownCentre: this.ownCentre(),
      };
    };
    // The harness's tripod: point the camera, nothing else. It moves only
    // the view over the player's own resolved data — the same pan and zoom
    // the pointer already commands — and can neither read nor order anything.
    (
      window as unknown as {
        __perspectiveCamera?: (x: number, z: number, distance?: number) => void;
      }
    ).__perspectiveCamera = (x: number, z: number, distance?: number) => {
      this.target.x = x;
      this.target.z = z;
      this.clampTarget();
      if (distance !== undefined) {
        this.distance = Math.min(this.mapDiagonal() * 2.2, Math.max(250, distance));
      }
    };
  }

  /** Centroid of the player's own force — their own information, screenshot
   * framing only. */
  private ownCentre(): { x: number; z: number } | null {
    let x = 0;
    let z = 0;
    let count = 0;
    for (const unit of this.units) {
      x += unit.x;
      z += unit.y;
      count += 1;
    }
    for (const structure of this.structures) {
      x += structure.x;
      z += structure.y;
      count += 1;
    }
    if (count === 0) return null;
    return { x: x / count, z: z / count };
  }
}
