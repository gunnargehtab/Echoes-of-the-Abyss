/**
 * The conn view — the world half of the shipped renderer, Phases 1–5 of
 * docs/three-layer-ocean.md.
 *
 * Since Phase 5 this is not a toggle beside the chart; it IS the world. The
 * authored ground renders as a real heightfield (perspectiveTerrain.ts)
 * wearing the seabed bake as its skin, roofed passages as route lines, the map
 * edge as a rim and a dark skirt; the player's own force sails as the approved
 * roster models (rosterModels.ts) at true depth, with the flat baked sprites
 * as the loading fallback. A WC3-lineage camera looks down and along at a
 * fixed 55° pitch; yaw is locked, per the no-rotation rule the revision kept.
 *
 * Everything else on screen — contacts, rings, hazards, marks, bars, the whole
 * HUD — is drawn by EchoRenderer on the transparent Pixi canvas composited
 * above this one, *through* this class's camera: `resolveGround` turns a
 * pointer into water, `projectPoint` turns water into pixels, and the pan /
 * zoom / focus verbs move the one camera both canvases share. One projection,
 * two painters, no second opinion about where anything is.
 *
 * Rules carried over intact, because a renderer change must never be a rules
 * change: server-authoritative fidelity (this class draws only own-force
 * payloads; it holds nothing about the enemy to leak), texture-not-information
 * (the detail relief is render-only), and glow-is-loudness (model lamps swing
 * with live SIG on the gate-3 curve).
 */

import {
  AdditiveBlending,
  AmbientLight,
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
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import {
  DEPTH,
  Faction,
  statsFor,
  structureStatsFor,
  type EchoSnapshot,
  type OwnStructure,
  type OwnUnit,
} from '@echoes/shared';
import type { TerrainPayload } from '../net/GameClient.ts';
import { UI, VENT_EMBER } from './palette.ts';
import { bakeSeabed, emberFlicker, seabedSeed, ventEmbers } from './seabed.ts';
import {
  buildHeightGrid,
  depthToWorldY,
  rockTopDepthM,
  seabedDepthAtM,
} from './perspectiveTerrain.ts';
import { groundPxPerM, hullReadabilityScale } from './readability.ts';
import { hullSpriteCanvas, hullSpriteSizeM } from './hullTextures.ts';
import { structureSpriteCanvas, structureSpriteSizeM } from './structureTextures.ts';
import { ACTIVE_PALETTE } from './palette.ts';
import {
  applyLiveGlow,
  rosterModelInstance,
  type RosterModelInstance,
  type RosterModelKey,
} from './rosterModels.ts';

/**
 * SPEC — docs/art-direction.md "Camera & Projection", settled by the Phase-1
 * screenshot comparison and pinned at Phase 5: 55° below horizontal.
 */
export const PITCH_DEG = 55;

/** TUNABLE — vertical camera field of view, degrees. Narrow keeps the range-
 * ring foreshortening gentle; wide reads fisheye at RTS distance. */
const FOV_DEG = 40;

/** Pixel-ratio cap: a little sharpness traded for headroom on the low-spec
 * floor (graphics-standards.md gate 6). */
const MAX_PIXEL_RATIO = 1.5;

/** What `projectPoint` hands the overlay painter: a screen position, the
 * local scale (for symbol sizing and stroke parity), and visibility. */
export interface ProjectedPoint {
  x: number;
  y: number;
  /** Screen pixels per world metre at this point's distance. */
  pxPerM: number;
  /** False when the point is behind the camera; skip drawing. */
  visible: boolean;
}

/**
 * Scratch for `projectPoint`. The overlay painter projects every vertex of
 * every ring through here each frame; a fresh Vector3 per call would make the
 * GC part of the frame budget.
 */
const PROJECT_TMP = new Vector3();

interface EntityHandle {
  mesh: Mesh;
  /** The depth line and ground shadow that make band membership readable. */
  plumb: Line;
  shadow: Mesh;
  /** Cache key of the sprite canvas currently on the mesh. */
  spriteKey: string;
  widthM: number;
  heightM: number;
  /** The approved model, once loaded. Sprite hides while it shows. */
  model: RosterModelInstance | null;
  modelKey: string;
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
  /**
   * How much larger than true metre scale the fleet is currently drawn
   * (readability.ts). 1 at close zoom, and re-applied only when it actually
   * moves — a wheel tick is cheap, a per-frame walk of every handle is not.
   */
  private drawScale = 1;

  private terrain: TerrainPayload | null = null;
  /**
   * The two whole-map scans `seabedDepthAtM` needs, cached per terrain.
   *
   * Both are O(cells), and `projectPoint` reaches the ground on every
   * null-depth vertex — every range-ring segment, every hazard site, and now
   * every unresolved contact's column. Recomputing them per vertex put a
   * full terrain scan inside the 60 Hz path; they only change when the ground
   * does, which is `setTerrain` and `applyGround` and nowhere else.
   */
  private groundSeed = 0;
  private groundRockTopM = 0;
  private terrainMesh: Mesh | null = null;
  private readonly terrainDressing = new Group();
  private embers: Points | null = null;
  private emberPhases: number[] = [];
  private emberBucket = -1;

  private readonly unitGroup = new Group();
  private readonly structureGroup = new Group();

  private faction: Faction = Faction.Bathyarch;
  private units: OwnUnit[] = [];
  private structures: OwnStructure[] = [];
  private readonly headings = new Map<number, number>();
  private readonly lastPositions = new Map<number, { x: number; y: number }>();

  private readonly unitHandles = new Map<number, EntityHandle>();
  private readonly structureHandles = new Map<number, EntityHandle>();
  private readonly spriteTextures = new Map<string, CanvasTexture>();

  /** Canvas CSS size, cached in resize(): projectPoint runs too hot to ask
   * the DOM for a rect on every vertex. */
  private viewWidth = 1;
  private viewHeight = 1;

  private active = false;
  private frameHandle = 0;
  private lastFrameAt = 0;
  /** Rolling frame-cost telemetry for the gate-6 measurement. */
  private frameCostMs: number[] = [];
  private worstFrameMs = 0;

  constructor() {
    this.scene.add(this.terrainDressing, this.unitGroup, this.structureGroup);
    this.scene.background = new Color(UI.background);

    // Lights exist for the roster models alone: the terrain and fallback
    // sprites are unlit materials with their shading baked in, so these touch
    // nothing else. The rig transcribes the sprite bake's (bake.ts): a cold
    // ambient so black water never crushes to nothing, an oblique key from
    // high north-west, and a hard cyan rim from the north — the same rim the
    // prompt kit poses every model against.
    this.scene.add(new AmbientLight(0x5a6b80, 0.65));
    const key = new DirectionalLight(0xdfe8f0, 1.35);
    key.position.set(-1400, 2600, -900);
    this.scene.add(key, key.target);
    const rim = new DirectionalLight(0x9fd8ff, 1.0);
    rim.position.set(0, 900, -3000);
    this.scene.add(rim, rim.target);
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

  setIdentity(_slot: number, faction: Faction): void {
    this.faction = faction;
  }

  setTerrain(terrain: TerrainPayload): void {
    // A defensive copy: the chart-side handlers mutate their payload in place
    // on ground deltas, and two consumers double-applying deltas to one
    // shared object is the bug this copy exists to make impossible.
    this.terrain = {
      ...terrain,
      biomes: [...terrain.biomes],
      floor: [...terrain.floor],
      ceiling: [...terrain.ceiling],
    };
    this.refreshGroundCache();
    this.fitToMap();
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
    this.refreshGroundCache();
    this.rebuildTerrain();
  }

  applySnapshot(snapshot: EchoSnapshot): void {
    this.units = snapshot.units;
    this.structures = snapshot.structures;
    // Headings from motion, exactly as the chart derived them: the server
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
    this.headings.clear();
    this.lastPositions.clear();
    if (this.renderer !== null) this.syncEntities();
  }

  destroy(): void {
    this.setActive(false);
    this.resizeObserver?.disconnect();
    for (const texture of this.spriteTextures.values()) texture.dispose();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.renderer = null;
    delete (window as unknown as { __perspectiveProbe?: unknown }).__perspectiveProbe;
    delete (window as unknown as { __perspectiveCamera?: unknown }).__perspectiveCamera;
  }

  // ---------------------------------------------------------------- camera
  //
  // The one camera both canvases share. The overlay painter above asks these
  // five questions and nothing else, which is what keeps the two renderers
  // from ever disagreeing about where the water is.

  /**
   * The water under a pointer. Raycast against the real terrain mesh, so a
   * click on a ridge face lands on the ridge; a ray that misses the mesh
   * (over the void past the map edge) falls back to the target's ground
   * plane. Always answers, clamped onto the map — a click is an intent, and
   * "nowhere" is not an answer an order can use.
   */
  resolveGround(clientX: number, clientY: number): { x: number; y: number } {
    const terrain = this.terrain;
    const canvas = this.renderer?.domElement;
    if (terrain === null || canvas === undefined || canvas === null) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const ndc = new Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new Raycaster();
    raycaster.setFromCamera(ndc, this.camera);
    if (this.terrainMesh !== null) {
      const hit = raycaster.intersectObject(this.terrainMesh, false)[0];
      if (hit !== undefined) {
        return {
          x: Math.min(terrain.cols * terrain.cellM, Math.max(0, hit.point.x)),
          y: Math.min(terrain.rows * terrain.cellM, Math.max(0, hit.point.z)),
        };
      }
    }
    const groundY = this.groundYAt(this.target.x, this.target.z);
    const direction = raycaster.ray.direction;
    const t = Math.abs(direction.y) < 1e-6 ? 1e6 : (groundY - raycaster.ray.origin.y) / direction.y;
    const point = raycaster.ray.origin.clone().addScaledVector(direction, Math.max(1, t));
    return {
      x: Math.min(terrain.cols * terrain.cellM, Math.max(0, point.x)),
      y: Math.min(terrain.rows * terrain.cellM, Math.max(0, point.z)),
    };
  }

  /**
   * Water to pixels. `depthM` places the point in the column; null means "on
   * the seabed here", which is what chart-flat geometry (blocked cells, node
   * fields, hazard sites) projects through. `pxPerM` is the local scale, so
   * a symbol drawn at this point can size itself the way the old chart's
   * zoom did.
   */
  projectPoint(xM: number, yM: number, depthM: number | null): ProjectedPoint {
    if (this.renderer === null) return { x: 0, y: 0, pxPerM: 1, visible: false };
    const y = depthM === null ? this.groundYAt(xM, yM) : depthToWorldY(depthM);
    const point = PROJECT_TMP.set(xM, y, yM);
    const viewDistance = point.distanceTo(this.camera.position);
    point.project(this.camera);
    const pxPerM =
      this.viewHeight / 2 / (Math.tan(((FOV_DEG / 2) * Math.PI) / 180) * Math.max(1, viewDistance));
    return {
      x: ((point.x + 1) / 2) * this.viewWidth,
      y: ((1 - point.y) / 2) * this.viewHeight,
      pxPerM,
      visible: point.z < 1 && point.z > -1,
    };
  }

  /**
   * How much larger than true metre scale own hulls and structures are being
   * drawn right now (docs/art-direction.md "Far-zoom readability scale").
   *
   * For the overlay painter only, and only for ink drawn *about* a hull —
   * selection ring, loudness ring, bars — which has to track the figure it
   * captions. Nothing that measures water may read this: range rings, aim
   * reach, the simulation and collision all stay on true metres.
   */
  hullDrawScale(): number {
    return this.drawScale;
  }

  /** Pan by a screen delta, WC3-hand: the ground follows the pointer. */
  panBy(dxPx: number, dyPx: number): void {
    const canvas = this.renderer?.domElement;
    const height = canvas?.clientHeight ?? 900;
    const pitch = (PITCH_DEG * Math.PI) / 180;
    const worldPerPx = (2 * this.distance * Math.tan(((FOV_DEG / 2) * Math.PI) / 180)) / height;
    this.target.x -= dxPx * worldPerPx;
    // Screen-vertical motion maps onto the ground plane through the pitch.
    this.target.z -= (dyPx * worldPerPx) / Math.max(0.2, Math.sin(pitch));
    this.clampTarget();
    // Applied now, not at the next frame: the overlay painter projects
    // through this camera on its own ticker, and a camera that moved between
    // the two draws would smear the HUD marks off the hulls they annotate.
    this.applyCamera();
  }

  /** Dolly about the cursor: the water under the pointer stays under it. */
  zoomAt(clientX: number, clientY: number, factor: number): void {
    const diagonal = this.mapDiagonal();
    const next = Math.min(diagonal * 2.2, Math.max(250, this.distance / factor));
    const cursor = this.resolveGround(clientX, clientY);
    const k = 1 - next / this.distance;
    this.target.x += (cursor.x - this.target.x) * k;
    this.target.z += (cursor.y - this.target.z) * k;
    this.clampTarget();
    this.distance = next;
    this.applyCamera();
  }

  /** Centre the camera on a world point; optionally set the dolly too. */
  focusWorld(xM: number, yM: number, distanceM?: number): void {
    this.target.x = xM;
    this.target.z = yM;
    this.clampTarget();
    if (distanceM !== undefined) {
      this.distance = Math.min(this.mapDiagonal() * 2.2, Math.max(250, distanceM));
    }
    this.applyCamera();
  }

  /** Frame the whole map — the opening shot, and the scope's double-tap out. */
  fitToMap(): void {
    const terrain = this.terrain;
    if (terrain === null) return;
    const widthM = terrain.cols * terrain.cellM;
    const heightM = terrain.rows * terrain.cellM;
    this.target.set(widthM / 2, 0, heightM / 2);
    this.distance = Math.max(widthM, heightM) * 1.05;
    this.applyCamera();
  }

  /**
   * The view's footprint on the ground, for the sonar scope's camera box and
   * the overlay painter's culling bounds: the four screen corners dropped
   * onto the target's ground plane. A trapezoid, not a rect — that is what a
   * tilted camera honestly sees. Analytic on purpose: this runs every frame,
   * and four terrain-mesh raycasts per frame would spend real budget buying
   * ridge-accurate corners a 170 px scope box cannot show. Pointer intents
   * keep the precise `resolveGround`.
   */
  groundQuad(): Array<{ x: number; y: number }> {
    const terrain = this.terrain;
    if (terrain === null || this.renderer === null) return [];
    const groundY = this.groundYAt(this.target.x, this.target.z);
    const corners: Array<[number, number]> = [
      [-1, 1],
      [1, 1],
      [1, -1],
      [-1, -1],
    ];
    const out: Array<{ x: number; y: number }> = [];
    for (const [nx, ny] of corners) {
      const ray = new Raycaster();
      ray.setFromCamera(new Vector2(nx, ny), this.camera);
      const direction = ray.ray.direction;
      const t = Math.abs(direction.y) < 1e-6 ? 1e6 : (groundY - ray.ray.origin.y) / direction.y;
      const point = ray.ray.origin.clone().addScaledVector(direction, Math.max(1, t));
      out.push({
        x: Math.min(terrain.cols * terrain.cellM, Math.max(0, point.x)),
        y: Math.min(terrain.rows * terrain.cellM, Math.max(0, point.z)),
      });
    }
    return out;
  }

  // ----------------------------------------------------------------- scene

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
    this.terrainDressing.clear();

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
    // as the background — distance and depth read as one darkness.
    const diagonal = Math.hypot(grid.widthM, grid.heightM);
    this.scene.fog = new Fog(UI.background, diagonal * 0.55, diagonal * 2.1);

    this.buildTerrainDressing(terrain);
    this.buildEmbers(terrain);
    this.syncEntities();
  }

  /**
   * The chart register the ground itself carries: roofed passages drawn as
   * routes (public map data — everyone sees the passage, nobody sees who is
   * in it), the map border as a rim line, and a dark skirt falling away from
   * the edge so the world ends in deep water rather than in a void the fog
   * never explains.
   */
  private buildTerrainDressing(terrain: TerrainPayload): void {
    const seed = seabedSeed(terrain);
    const rockTop = rockTopDepthM(terrain);
    const groundY = (xM: number, yM: number) =>
      depthToWorldY(seabedDepthAtM(terrain, seed, rockTop, xM, yM));
    const isRock = (i: number) => terrain.ceiling[i]! > terrain.floor[i]!;

    // Tunnel routes: a line across each roofed cell, lifted just off the
    // ground. The mouth is invisible from above by construction; the line is
    // what a player needs (docs/art-direction.md, "Reading the Sea Floor").
    const routePoints: number[] = [];
    for (let row = 0; row < terrain.rows; row++) {
      for (let col = 0; col < terrain.cols; col++) {
        const index = row * terrain.cols + col;
        if (terrain.ceiling[index]! === 0 || isRock(index)) continue;
        const y = (row + 0.5) * terrain.cellM;
        const x0 = col * terrain.cellM;
        const x1 = (col + 1) * terrain.cellM;
        routePoints.push(x0, groundY(x0, y) + 10, y, x1, groundY(x1, y) + 10, y);
      }
    }
    if (routePoints.length > 0) {
      const routeGeometry = new BufferGeometry();
      routeGeometry.setAttribute('position', new BufferAttribute(new Float32Array(routePoints), 3));
      this.terrainDressing.add(
        new LineSegments(
          routeGeometry,
          new LineBasicMaterial({ color: UI.accent, transparent: true, opacity: 0.3 })
        )
      );
    }

    // The rim and the skirt share one perimeter walk.
    const widthM = terrain.cols * terrain.cellM;
    const heightM = terrain.rows * terrain.cellM;
    const step = terrain.cellM;
    const perimeter: Array<{ x: number; y: number }> = [];
    for (let x = 0; x <= widthM; x += step) perimeter.push({ x, y: 0 });
    for (let y = step; y <= heightM; y += step) perimeter.push({ x: widthM, y });
    for (let x = widthM - step; x >= 0; x -= step) perimeter.push({ x, y: heightM });
    for (let y = heightM - step; y >= step; y -= step) perimeter.push({ x: 0, y });

    const rim = perimeter.map((p) => new Vector3(p.x, groundY(p.x, p.y) + 4, p.y));
    this.terrainDressing.add(
      new LineLoop(
        new BufferGeometry().setFromPoints(rim),
        new LineBasicMaterial({ color: UI.glassStroke, transparent: true, opacity: 0.5 })
      )
    );

    const skirtBottom = depthToWorldY(DEPTH.MAX_M) - 250;
    const skirtPositions: number[] = [];
    const skirtIndices: number[] = [];
    for (let i = 0; i < perimeter.length; i++) {
      const p = perimeter[i]!;
      const top = groundY(p.x, p.y);
      skirtPositions.push(p.x, top, p.y, p.x, skirtBottom, p.y);
      const j = (i + 1) % perimeter.length;
      skirtIndices.push(i * 2, j * 2, i * 2 + 1, j * 2, j * 2 + 1, i * 2 + 1);
    }
    const skirtGeometry = new BufferGeometry();
    skirtGeometry.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(skirtPositions), 3)
    );
    skirtGeometry.setIndex(skirtIndices);
    this.terrainDressing.add(
      new Mesh(
        skirtGeometry,
        new MeshBasicMaterial({ color: 0x040a12, side: DoubleSide, fog: false })
      )
    );
  }

  /** Vent embers as one Points cloud: per-ember flicker rides the colour
   * attribute under additive blending, so 400 embers stay one draw call.
   * The 5 Hz step and the SPEC ember hue are seabed.ts's, unchanged. */
  private buildEmbers(terrain: TerrainPayload): void {
    const embers = ventEmbers(terrain, seabedSeed(terrain));
    this.emberPhases = embers.map((e) => e.phase);
    if (embers.length === 0) {
      this.embers = null;
      return;
    }
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
  }

  private refreshGroundCache(): void {
    const terrain = this.terrain;
    if (terrain === null) return;
    this.groundSeed = seabedSeed(terrain);
    this.groundRockTopM = rockTopDepthM(terrain);
  }

  /**
   * How much water stands over this patch of ground, in metres.
   *
   * The conn view owns the ground, so the overlay painter asks it rather than
   * running the heightfield a second time — the same rule `projectPoint` and
   * `resolveGround` follow. 0 before a terrain arrives, which reads as "no
   * column here" to the one caller that needs it.
   */
  seabedDepthAt(xM: number, yM: number): number {
    const terrain = this.terrain;
    if (terrain === null) return 0;
    return seabedDepthAtM(terrain, this.groundSeed, this.groundRockTopM, xM, yM);
  }

  private groundYAt(xM: number, zM: number): number {
    if (this.terrain === null) return 0;
    return depthToWorldY(this.seabedDepthAt(xM, zM));
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
    group.remove(handle.mesh, handle.plumb, handle.shadow);
    if (handle.model !== null) group.remove(handle.model.root);
  }

  /**
   * Build or update one own entity: the approved model once it is loaded, the
   * flat baked sprite until then (and for kinds that have none), plus the
   * plumb line and ground shadow either way.
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
      group.add(mesh, plumb, shadow);
      handle = {
        mesh,
        plumb,
        shadow,
        spriteKey: '',
        widthM: 0,
        heightM: 0,
        model: null,
        modelKey: '',
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
      handle.spriteKey = spec.spriteKey;
      handle.widthM = spec.sizeM.widthM;
      handle.heightM = spec.sizeM.heightM;
    }

    // The far-zoom readability scale (readability.ts, docs/art-direction.md).
    // Render-only: it multiplies what draws the hull and nothing that measures
    // it. Applied here rather than at texture-swap time because it moves with
    // the dolly, not with the entity.
    const draw = this.drawScale;
    handle.mesh.scale.set(handle.widthM * draw, handle.heightM * draw, 1);

    const y = depthToWorldY(spec.depthM);
    const groundY = this.groundYAt(spec.x, spec.z);
    // The clearance rides the scale: a bottomed hull drawn four times over
    // would otherwise bury half its own height in the seabed at survey zoom.
    const hullY = Math.max(y, groundY + 4 * draw);
    if (model !== null) {
      model.root.position.set(spec.x, hullY, spec.z);
      model.root.rotation.y = -spec.yaw;
      model.root.scale.setScalar(model.baseScale * draw);
      // Loudness is the lights, not the paint: live SIG swings the lamps
      // around the intake-approved resting strength (gate 3), so a hull
      // running silent goes dark instead of translucent.
      applyLiveGlow(model, spec.liveSig, spec.restSig);
    } else {
      handle.mesh.position.set(spec.x, hullY, spec.z);
      handle.mesh.rotation.y = -spec.yaw;
      (handle.mesh.material as MeshBasicMaterial).opacity = spec.dimmed ? 0.45 : 1;
    }

    // The plumb line and ground shadow are what make the water column
    // readable: a hull's height above its own shadow *is* its depth. The
    // interface voice (cyan), because depth here is information, not threat.
    // The plumb is never scaled — its length is the depth, and a scaled plumb
    // would be the one place this factor told a lie. The shadow is, because a
    // true-scale shadow under an exaggerated hull reads as the wrong depth.
    const positions = handle.plumb.geometry.getAttribute('position') as BufferAttribute;
    positions.setXYZ(0, spec.x, y, spec.z);
    positions.setXYZ(1, spec.x, groundY + 1, spec.z);
    positions.needsUpdate = true;
    const shadowRadius =
      draw *
      (model !== null
        ? Math.max(model.lengthM, model.beamM) * 0.4
        : Math.max(handle.widthM, handle.heightM) * 0.35);
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
      // buildProgress 1, exactly when the chart swapped in its baked sprite.
      const commissioned = structure.buildProgress >= 1;
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
      });
    }
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

  // ----------------------------------------------------------------- frame

  private applyCamera(): void {
    const pitch = (PITCH_DEG * Math.PI) / 180;
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
    this.camera.updateMatrixWorld();
  }

  private resize(): void {
    if (this.renderer === null || this.host === null) return;
    const width = this.host.clientWidth || 1;
    const height = this.host.clientHeight || 1;
    this.viewWidth = width;
    this.viewHeight = height;
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.applyCamera();
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
    // The readability factor follows the dolly, so it is recomputed on the
    // frame rather than on the 5 Hz snapshot: a wheel zoom must not wait up to
    // 200 ms for the fleet to reach its drawn size. Re-syncing only on an
    // actual change keeps a still camera free.
    const scale = hullReadabilityScale(groundPxPerM(this.viewHeight, FOV_DEG, this.distance));
    if (Math.abs(scale - this.drawScale) > 1e-3) {
      this.drawScale = scale;
      this.syncEntities();
    }
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
        pitchDeg: PITCH_DEG,
        distance: Math.round(this.distance),
        hullScale: Number(this.drawScale.toFixed(2)),
        drawCalls: info?.render.calls ?? 0,
        triangles: info?.render.triangles ?? 0,
        avgFrameMs: Number(average.toFixed(2)),
        worstFrameMs: Number(this.worstFrameMs.toFixed(2)),
        units: this.unitHandles.size,
        structures: this.structureHandles.size,
        modelBacked:
          [...this.unitHandles.values()].filter((h) => h.model !== null).length +
          [...this.structureHandles.values()].filter((h) => h.model !== null).length,
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
      this.focusWorld(x, z, distance);
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
