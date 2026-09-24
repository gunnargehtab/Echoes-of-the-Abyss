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
  Color,
  DataTexture,
  DirectionalLight,
  DoubleSide,
  FogExp2,
  Group,
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
  type OwnOrdnance,
  type OwnUnit,
} from '@echoes/shared';
import type { TerrainPayload } from '../net/GameClient.ts';
import { FACTION_PALETTE, UI, VENT_EMBER } from './palette.ts';
import { DepthCues } from './depthCues.ts';
import {
  bakeSeabed,
  emberFlicker,
  rebakeSeabedCells,
  seabedRange,
  seabedSeed,
  ventEmbers,
  type CellRect,
  type SeabedRange,
} from './seabed.ts';
import {
  buildHeightGrid,
  patchHeightGrid,
  type HeightGrid,
  DEPTH_VISUAL_M_PER_M,
  depthToWorldY,
  rockTopDepthM,
  seabedDepthAtM,
} from './perspectiveTerrain.ts';
import { groundPxPerM, hullReadabilityScale } from './readability.ts';
import { hullSpriteCanvas, hullSpriteSizeM, primeHullArt } from './hullTextures.ts';
import {
  primeStructureArt,
  structureSpriteCanvas,
  structureSpriteSizeM,
} from './structureTextures.ts';
import { ACTIVE_PALETTE } from './palette.ts';
import {
  applyLiveGlow,
  rosterModelInstance,
  type RosterModelInstance,
  type RosterModelKey,
} from './rosterModels.ts';
import { OwnMotion } from './ownMotion.ts';
import { OrdnanceLayer } from './ordnanceLayer.ts';
import { EnvironmentLayer } from './environmentLayer.ts';
import { VeilField, veilShade, type VeilListener } from './acousticVeil.ts';
import {
  installSurveyInk,
  patchSurveyCellClasses,
  surveyCellClasses,
  surveyCellTexture,
} from './surveyInk.ts';
import {
  installWaterFog,
  MarineSnow,
  waterColorAt,
  WaterBackdrop,
  fogDensityFor,
  waterReachM,
  waterTransmittance,
} from './water.ts';
import { FrameCost, ms } from './frameCost.ts';
import { FURNITURE_OUTLINE_ALPHA } from './ladder.ts';
import { FaunaStipple } from './faunaStipple.ts';

/**
 * Steps in the veil's shade table. 64 is finer than an 8-bit colour channel
 * can resolve over the range the veil actually spans, so the table costs
 * nothing in banding and saves a `pow` per vertex per Echo tick.
 */
const VEIL_STEPS = 64;

/**
 * The veil's linear-space shade, tabulated over the veil amount 0-1.
 *
 * Built once. `Color.setRGB(..., SRGBColorSpace)` is what does the
 * conversion, so three owns the transfer function rather than this file
 * carrying a hand-rolled gamma that would drift from it.
 */
const VEIL_TABLE = ((): Float32Array => {
  const table = new Float32Array((VEIL_STEPS + 1) * 3);
  const color = new Color();
  for (let i = 0; i <= VEIL_STEPS; i++) {
    const shade = veilShade(1 - i / VEIL_STEPS, 1);
    color.setRGB(shade.r, shade.g, shade.b, SRGBColorSpace);
    table[i * 3] = color.r;
    table[i * 3 + 1] = color.g;
    table[i * 3 + 2] = color.b;
  }
  return table;
})();

/**
 * SPEC — docs/art-direction.md "Camera & Projection": 55° below horizontal,
 * settled by the Phase-1 screenshot comparison and pinned at Phase 5.
 *
 * Since docs/free-camera.md this is where the camera *opens* and what `home()`
 * restores, not where it is held. The distinction is the whole revision: the
 * frame the old no-rotation rule made permanent is still one press away, which
 * is what lets the rest of the rig be free without stranding anyone.
 */
export const HOME_PITCH_DEG = 55;

/**
 * SPEC — docs/free-camera.md §4: the band the player may pitch within.
 *
 * Neither end is taste. Below the floor the ground plane stops being a ground
 * plane and the camera is simply in the water looking along it — the shot the
 * revision exists to buy, and also where a range ring is most nearly edge-on,
 * so the band stops where rings stop being *readable* rather than where they
 * stop being correct. At exactly 90° the up vector degenerates and takes the
 * yaw with it, so the ceiling stops short: two degrees of plan view is a
 * cheaper thing to lose than the heading.
 */
const PITCH_MIN_DEG = 10;
const PITCH_MAX_DEG = 88;

/**
 * SPEC — docs/free-camera.md §4, the one hard clamp on the rig: metres of
 * water the eye keeps above the local floor. A camera below the seabed renders
 * the inside of the terrain shell, which reads as a bug in every case and a
 * feature in none. TUNABLE.
 */
const EYE_CLEARANCE_M = 25;

/**
 * TUNABLE — docs/free-camera.md §4: metres of column one focus notch moves.
 * Exported so the input layer and the doc's table cannot drift apart.
 */
export const FOCUS_STEP_M = 150;

/** Radians per pixel of orbit drag. TUNABLE — a full turn in about 640 px of
 * yaw, and the pitch band crossed in about 280 px. */
const ORBIT_YAW_PER_PX = (Math.PI * 2) / 640;
const ORBIT_PITCH_PER_PX = ((PITCH_MAX_DEG - PITCH_MIN_DEG) * Math.PI) / 180 / 280;

/** TUNABLE — vertical camera field of view, degrees. Narrow keeps the range-
 * ring foreshortening gentle; wide reads fisheye at RTS distance. */
const FOV_DEG = 40;

/**
 * TUNABLE — the gain the flat baked sprite is drawn through, so the fallback
 * and the modelled roster share one register.
 *
 * A sprite is an unlit `MeshBasicMaterial` showing the bake's own composite,
 * and that composite is already lit: `lightAndCompose` gives it a diffuse
 * term, a specular of up to 235 and a rim, because on the 2D chart nothing
 * else ever will. Drawn unlit in a scene that *does* light its meshes, it
 * simply arrives brighter than everything around it — measured over a mid
 * zoom, a Caisson's sprite ran a mean of 0.299 against a modelled hull's
 * 0.165, and clipped to pure white, which the style guide reserves for
 * one-frame cores (ping front, commit flash) and denies any steady element.
 *
 * Gate 1 sanctions the procedural fallback for a hull with no approved model
 * — the Caisson, the transports, three navies' Choristers. It does not
 * sanction that hull outshining the modelled roster, which under gate 3 reads
 * as the loudest thing on the field rather than as the quietest.
 *
 * The gain is what closes that gap, and it is a *linear* one — a
 * `MeshBasicMaterial`'s colour multiplies the decoded map in working space,
 * so the 0.55 ratio those encoded means describe is this number, not 0.55.
 * It lives here, on the conn view's own material, rather than in `bake.ts`:
 * the chart is a scope and keeps the register it was drawn for. Measured back
 * over the same frame, the sprite lands at 0.145 against the two modelled
 * hulls beside it at 0.107 and 0.175, and peaks at 0.525 rather than clipping.
 */
const SPRITE_REGISTER = 0.24;

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
/**
 * More scratch, for the same reason (#432): `resolveGround` runs per pointer
 * event, `groundQuad` and `applyCamera` per frame, and each used to allocate
 * a Raycaster, a Vector2 and a cloned Vector3 or four on the way.
 */
const RAY_TMP = new Raycaster();
const NDC_TMP = new Vector2();
const LOOK_TMP = new Vector3();
const DIR_TMP = new Vector3();
const EMBER_COLOR = new Color(VENT_EMBER);
/** Screen corners in NDC, the order `groundQuad` has always returned them in. */
const QUAD_CORNERS: ReadonlyArray<readonly [number, number]> = [
  [-1, 1],
  [1, 1],
  [1, -1],
  [-1, -1],
];

/**
 * How far along a ray the ground plane is — or, when it is not there at all,
 * far enough that the caller's own map clamp answers instead.
 *
 * A freely pitched camera can point a corner ray *above* the horizon, where
 * the ground plane lies behind the eye and the intersection is negative. The
 * honest answer is "this corner sees past the map", and the honest way to say
 * it is a point far out along the ray's own heading, which every caller here
 * clamps to the map edge. Answering with the eye's own position instead —
 * what `Math.max(1, t)` used to do — drew a scope box collapsed to a dot at
 * exactly the moment the player most needed to know where they were looking.
 */
function groundPlaneT(originY: number, directionY: number, groundY: number): number {
  if (Math.abs(directionY) < 1e-6) return HORIZON_T;
  const t = (groundY - originY) / directionY;
  return t > 1 ? t : HORIZON_T;
}

/** Far enough to leave any map, near enough to stay in single precision. */
const HORIZON_T = 1e6;

interface EntityHandle {
  mesh: Mesh;
  /** Its slot in the batched depth cues — the plumb line and ground shadow
   * that make band membership readable (depthCues.ts). */
  cue: number;
  /** The shadow's drawn radius, recomputed by the sync and applied per place. */
  shadowRadius: number;
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

/**
 * The real rasteriser. A named function only so `mount` has a default to
 * declare — production has no other renderer, and this is the whole of it.
 */
function glRenderer(): WebGLRenderer {
  return new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
}

export class PerspectiveView {
  private renderer: WebGLRenderer | null = null;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(FOV_DEG, 1, 10, 60_000);
  private host: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;

  /**
   * Camera rig — docs/free-camera.md §4: a focus in the water, a yaw, a pitch
   * and a dolly distance.
   *
   * Only `x` and `z` of `target` are the focus's; its height is `focusY()`,
   * because "on the seabed" has to keep meaning that as the focus pans over
   * ground that changes under it.
   */
  private readonly target = new Vector3();
  private distance = 4000;
  /** Radians. 0 puts the eye south of the focus looking north — the home
   * frame, and the only one the rig had before the camera was freed. */
  private yaw = 0;
  /** Radians below horizontal, always inside the spec'd band. */
  private pitch = (HOME_PITCH_DEG * Math.PI) / 180;
  /**
   * Where the focus sits in the column, metres, or `null` for "the seabed
   * here" — the home state, and the one that has to track the ground rather
   * than sample it once.
   */
  private focusDepthM: number | null = null;
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
  /** The bake's depth ramp, taken with the seed and held with it. */
  private seabedRange: SeabedRange = { shallowest: 0, deepest: 0 };
  private terrainMesh: Mesh | null = null;
  /**
   * What `rebuildTerrain` made, kept so `applyGround` can patch it (#434): the
   * vertex grid the mesh's positions came from, and the canvas its texture
   * is. A collapsed span used to rebuild all 16k vertices and re-bake every
   * pixel of the seabed; now it moves the vertices within a cell of the
   * change and re-shades those cells and a ring.
   */
  private terrainGrid: HeightGrid | null = null;
  private seabedCanvas: HTMLCanvasElement | null = null;
  private seabedTexture: CanvasTexture | null = null;
  /**
   * The survey ink's cell classes (surveyInk.ts): the bytes, and the texture
   * the terrain shader reads them through. Patched with the ground, like the
   * canvas above.
   */
  private surveyClasses: Uint8Array<ArrayBuffer> | null = null;
  private surveyCells: DataTexture | null = null;
  private readonly terrainDressing = new Group();
  /** Environment props (environmentLayer.ts) — rebuilt on the terrain cadence. */
  private readonly environment = new EnvironmentLayer();
  private embers: Points | null = null;
  private emberPhases: number[] = [];
  private emberBucket = -1;
  /** Where each ember stands, for the veil's reshade. */
  private emberPositions: Array<{ xM: number; yM: number }> = [];
  /** Per-ember veil factor, parallel to `emberPhases`; 1 with no veil. */
  private emberVeil: Float32Array = new Float32Array(0);

  /**
   * The acoustic veil (acousticVeil.ts, docs/ui-ux.md §4.5, issue #472): the
   * ground goes cold where no listener of the player's reaches.
   *
   * It lives on the conn view because it is a statement about the *world*,
   * not about the instrument: the scope stays unveiled, where §5's promise is
   * own force at full clarity and a mark's own size already carries how much
   * to trust it.
   */
  private readonly veil = new VeilField();
  private veilIntensity = 1;
  /** Whether anything on the ground currently carries a veil shade. */
  private veilDrawn = false;
  /** Scratch for the shade callbacks, consumed before the next call. */
  private readonly veilColor = new Color();
  /** Handed to the prop layer, which owns when its instances are re-coloured. */
  private readonly propShade = (xM: number, yM: number, out: Color): void => {
    this.linearShadeAt(xM, yM, out);
  };

  /**
   * The water itself (water.ts, docs/art-direction.md "Reading the Water",
   * issue #836) — two draw calls between them, and the fog they share is a
   * shader-chunk patch that costs none.
   *
   * `backdrop` draws the medium where there is no geometry, which is most of
   * a low-pitch frame and was flat void before it. `snow` is the particulate
   * that gives the medium something to parallax.
   */
  private readonly backdrop = new WaterBackdrop();
  private readonly snow = new MarineSnow();
  /**
   * Tetherjelly fields and Lampfry shoals as stipple in the water column
   * (faunaStipple.ts, docs/map-visuals.md §8): two draw calls, the pulse on
   * the GPU. Public chart data, so it takes the snapshot's public layers and
   * nothing the Echo Layer resolved.
   */
  private readonly life = new FaunaStipple();
  /** The player's setting, 0-1 (docs/ui-ux.md §11). Scales how far the water
   * hides, never what colour it is. */
  private waterDensity = 1;
  /** How far the water reaches this frame, in world units — one number, read
   * by the fog, the backdrop, the snow and the embers, so the four cannot
   * disagree about where the visible world ends. */
  private waterReach = waterReachM(4000);

  private readonly unitGroup = new Group();
  private readonly structureGroup = new Group();
  /** Every plumb and every shadow, two draw calls in all (#434). */
  private readonly cues = new DepthCues(UI.accent);
  /** The player's own ordnance, instanced (ordnanceLayer.ts); shares the cues. */
  private readonly ordnanceLayer = new OrdnanceLayer(this.cues);
  private ordnance: OwnOrdnance[] = [];
  /** Own ordnance glides between ticks as own hulls do (ownMotion.ts). */
  readonly ordnanceMotion = new OwnMotion();

  private faction: Faction = Faction.Bathyarch;
  private units: OwnUnit[] = [];
  private structures: OwnStructure[] = [];
  private readonly headings = new Map<number, number>();
  private readonly lastPositions = new Map<number, { x: number; y: number }>();
  /**
   * Where own hulls are drawn between Echo ticks (#429; docs/ui-ux.md §12).
   * Public so the chart's ink about a hull — its ring, its bar, its route —
   * reads the same answer and never drifts off the hull it captions.
   */
  readonly motion = new OwnMotion();
  /** Scratch for `motion.at`, consumed before the next call. */
  private readonly drawn = { x: 0, y: 0, depth: 0 };
  /** `groundQuad`'s four corners, rewritten in place per frame. */
  private readonly quadScratch = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];

  private readonly unitHandles = new Map<number, EntityHandle>();
  private readonly structureHandles = new Map<number, EntityHandle>();
  private readonly spriteTextures = new Map<string, CanvasTexture>();

  /** Canvas CSS size, cached in resize(): projectPoint runs too hot to ask
   * the DOM for a rect on every vertex. */
  private viewWidth = 1;
  private viewHeight = 1;

  /**
   * Bumped whenever the camera or the viewport changes (#432), so the chart
   * can tell a frame that moved the world from one that did not and leave
   * its static layers alone.
   */
  private cameraRevision = 0;
  private active = false;
  private frameHandle = 0;
  private lastFrameAt = 0;
  /**
   * Whether the page went hidden at any point since the last frame. A hidden
   * tab fires no `requestAnimationFrame`, so the interval spanning one is the
   * tab and not a frame; every other long interval *is* a frame, and is the
   * stall gate 6 exists to price.
   */
  private hiddenSinceFrame = false;
  private readonly onVisibility = (): void => {
    if (document.hidden) this.hiddenSinceFrame = true;
  };

  /**
   * Frame-cost telemetry for the gate-6 measurement drive, as three series
   * rather than one (#286).
   *
   * The shipped frame is composited from two painters on separate loops — this
   * view's `requestAnimationFrame` and the overlay's Pixi ticker — so the
   * interval between consecutive `renderFrame` calls already prices both
   * halves. What it cannot do is say *which* half spent the time, and every
   * remedy the drive might reach for (quantising ring redraws to the 5 Hz
   * sonar grid, dropping `CIRCLE_SEGMENTS` at far zoom, culling marks before
   * projecting) acts on the overlay half alone. A single number would be real
   * and still could not choose among them.
   */
  private readonly frameCost = new FrameCost();
  /** Time inside `renderFrame`: entity sync plus the GL submit. */
  private readonly connCost = new FrameCost();
  /** Time inside the overlay painter's `draw`, reported by `EchoRenderer`. */
  private readonly overlayCost = new FrameCost();
  /** The station these three are measuring, or null before one is named. */
  private stationLabel: string | null = null;
  /** Set at construction so a probe read before the first frame still divides
   * by an elapsed time that means something. */
  private stationStartedAt = performance.now();

  constructor() {
    // Before the first material compiles: the water's fog is a patch on
    // three's global shader chunks, so a material built ahead of it would
    // carry the old distance fog for the life of the scene (water.ts).
    installWaterFog();
    // Each group's rung on the loudness ladder (docs/map-visuals.md §5):
    // - the backdrop and the snow: rung 1, the water.
    // - the terrain dressing: rung 5's tunnel routes and map rim, and the
    //   skirt, which §5 does not name: placed on rung 1 because it is drawn
    //   as the deep water the map ends in.
    // - the environment props: rung 3, ground.
    // - the fauna stipple: rung 5, the public fields and shoals (§8).
    // - units, ordnance and structures: rung 7, the player's own agents.
    //   Their depth cues are not named in §5; they are placed with them,
    //   because a hull's plumb and shadow are how its figure says its depth
    //   (docs/art-direction.md, "Depth is drawn, not implied").
    // The seabed mesh (rungs 2 to 4) and the embers (world light, outside
    // the ladder) join the scene with the terrain.
    this.scene.add(
      this.backdrop.mesh,
      this.terrainDressing,
      this.environment.group,
      this.life.group,
      this.unitGroup,
      this.ordnanceLayer.group,
      this.structureGroup,
      this.cues.group,
      this.snow.points
    );
    // The clear colour under the backdrop, and the deepest water there is —
    // the ramp's bottom stop is `UI.background` exactly, so the abyss is the
    // colour it always was and the change is all in the water above it.
    const deepest = waterColorAt(DEPTH.MAX_M);
    this.scene.background = new Color().setRGB(deepest.r, deepest.g, deepest.b);

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

  /**
   * Create the GL surface. Returns false when WebGL is unavailable.
   *
   * `makeRenderer` is a seam with one non-default caller: the headless smoke
   * test (#443) hands in a stand-in that walks the scene and counts what a
   * frame asked for instead of rasterising it, so the terrain build, the
   * entity sync and the frame path are all verified on a runner with no GPU.
   * Production calls this with one argument.
   */
  mount(host: HTMLElement, makeRenderer: () => WebGLRenderer = glRenderer): boolean {
    if (this.renderer !== null) return true;
    try {
      this.renderer = makeRenderer();
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
    document.addEventListener('visibilitychange', this.onVisibility);
    return true;
  }

  setActive(active: boolean): void {
    if (active === this.active) return;
    this.active = active;
    if (active) {
      this.lastFrameAt = performance.now();
      // Nothing measured while the view was dark belongs to the station that
      // starts now.
      this.beginStation(this.stationLabel);
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

  /** ui-ux.md §11: the world's one animation is the kelp current; hold it. */
  setReducedMotion(reduced: boolean): void {
    this.environment.setReducedMotion(reduced);
    this.snow.setReducedMotion(reduced);
    this.life.setReducedMotion(reduced);
  }

  /**
   * How much the water hides, 0-1 (docs/ui-ux.md §11, docs/art-direction.md
   * "Reading the Water").
   *
   * A setting for the reason the acoustic veil is one: distance fog reduces
   * contrast, and §11 makes that a control rather than a preference. And it
   * can be one without argument for the same reason — turning it down can
   * only ever *reveal* more of the player's own force, never less, so a
   * player at 0 has every bit of information a player at 1 has. What it does
   * not touch is the ramp: the water is the same colour at the same depth at
   * every setting, because "depth is luminance" is a reading and not an
   * effect.
   */
  setWaterDensity(density: number): void {
    const clamped = density < 0 ? 0 : density > 1 ? 1 : density;
    if (clamped === this.waterDensity) return;
    this.waterDensity = clamped;
    if (this.scene.fog instanceof FogExp2) {
      this.scene.fog.density = fogDensityFor(this.distance, clamped);
    }
  }

  /**
   * The acoustic veil's strength, 0-1 (docs/ui-ux.md §4.5 and §11).
   *
   * A setting because the veil is a contrast-reduced overlay and §11 makes
   * accessibility a correctness requirement — and it can be one without
   * argument precisely because it is presentation only: the veil hides no
   * information, so turning it off costs the player nothing and gains them
   * nothing. Compare the colour-vision palettes, which change the ink and
   * never the encoding.
   */
  setVeilIntensity(intensity: number): void {
    const clamped = intensity < 0 ? 0 : intensity > 1 ? 1 : intensity;
    if (clamped === this.veilIntensity) return;
    this.veilIntensity = clamped;
    this.applyVeil();
  }

  setIdentity(_slot: number, faction: Faction): void {
    this.faction = faction;
    // The seat is the first moment the client knows which navy's art it will
    // draw, so this is where that navy's plates and maps start decoding —
    // and only that navy's (#442). A hull asked for before its art lands
    // draws as vectors and starts its own load, so a rematch in another seat
    // is covered either way; this is what keeps the first hull from popping.
    primeHullArt(faction);
    primeStructureArt(faction);
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
    this.refreshVeil();
  }

  applyGround(
    cells: readonly { index: number; floorM: number; ceilingM: number; biome: number }[]
  ): void {
    const terrain = this.terrain;
    if (terrain === null || cells.length === 0) return;
    let touched: CellRect | null = null;
    for (const cell of cells) {
      if (cell.index < 0 || cell.index >= terrain.floor.length) continue;
      terrain.floor[cell.index] = cell.floorM;
      terrain.ceiling[cell.index] = cell.ceilingM;
      terrain.biomes[cell.index] = cell.biome;
      const col = cell.index % terrain.cols;
      const row = Math.floor(cell.index / terrain.cols);
      if (touched === null) touched = { col0: col, row0: row, col1: col, row1: row };
      else {
        touched.col0 = Math.min(touched.col0, col);
        touched.row0 = Math.min(touched.row0, row);
        touched.col1 = Math.max(touched.col1, col);
        touched.row1 = Math.max(touched.row1, row);
      }
    }
    if (touched === null) return;
    // The seed, the rock top and the depth ramp stay what the join set them
    // to: a delta changes the cells it names, and re-deriving any of the
    // three from the new ground would move every cell on the map to change a
    // few (seabed.ts, `seabedSeed`).
    this.patchTerrain(touched);
  }

  applySnapshot(snapshot: EchoSnapshot): void {
    this.units = snapshot.units;
    this.structures = snapshot.structures;
    this.ordnance = snapshot.ordnance;
    // Rewritten only when a public layer changed: a field or shoal was born or
    // died, or a shoal scattered or reformed. A still sea costs nothing here.
    this.life.setLife(snapshot.jellies, snapshot.shoals);
    const arrivedAt = performance.now();
    this.motion.record(snapshot.units, arrivedAt);
    this.ordnanceMotion.record(snapshot.ordnance, arrivedAt);
    // Headings from motion, exactly as the chart derived them. Since #839 the
    // snapshot carries each own hull's ordered bow (`OwnUnit.heading`), but
    // this view keeps deriving its own from where the hull actually went.
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
    // The veil is a 5 Hz fact about where the fleet's ears are, so it moves
    // with the snapshot rather than with the frame (docs/ui-ux.md §4.5).
    this.refreshVeil();
  }

  resetForNewMatch(): void {
    this.units = [];
    this.structures = [];
    this.ordnance = [];
    this.life.setLife([], []);
    this.headings.clear();
    this.lastPositions.clear();
    this.motion.reset();
    this.ordnanceMotion.reset();
    // A force of nobody is not a dark map (acousticVeil.ts): the veil comes
    // off with the fleet rather than closing over the whole chart.
    this.veil.clear();
    this.applyVeil();
    if (this.renderer !== null) this.syncEntities();
  }

  destroy(): void {
    this.setActive(false);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.resizeObserver?.disconnect();
    this.environment.destroy();
    this.ordnanceLayer.dispose();
    this.cues.dispose();
    this.backdrop.dispose();
    this.snow.dispose();
    this.life.dispose();
    for (const texture of this.spriteTextures.values()) texture.dispose();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.renderer = null;
    delete (window as unknown as { __perspectiveProbe?: unknown }).__perspectiveProbe;
    delete (window as unknown as { __perspectiveStation?: unknown }).__perspectiveStation;
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
    const ndc = NDC_TMP.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = RAY_TMP;
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
    const point = DIR_TMP.copy(raycaster.ray.origin).addScaledVector(
      direction,
      groundPlaneT(raycaster.ray.origin.y, direction.y, groundY)
    );
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
  projectPoint(
    xM: number,
    yM: number,
    depthM: number | null,
    out: ProjectedPoint = { x: 0, y: 0, pxPerM: 1, visible: false }
  ): ProjectedPoint {
    // Written into `out` when the caller hands one over (#432): the chart
    // projects a few thousand points a frame at survey zoom, and an object
    // per point was most of the frame's garbage.
    if (this.renderer === null) {
      out.x = 0;
      out.y = 0;
      out.pxPerM = 1;
      out.visible = false;
      return out;
    }
    const y = depthM === null ? this.groundYAt(xM, yM) : depthToWorldY(depthM);
    const point = PROJECT_TMP.set(xM, y, yM);
    const viewDistance = point.distanceTo(this.camera.position);
    point.project(this.camera);
    const pxPerM =
      this.viewHeight / 2 / (Math.tan(((FOV_DEG / 2) * Math.PI) / 180) * Math.max(1, viewDistance));
    out.x = ((point.x + 1) / 2) * this.viewWidth;
    out.y = ((1 - point.y) / 2) * this.viewHeight;
    out.pxPerM = pxPerM;
    out.visible = point.z < 1 && point.z > -1;
    return out;
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

  /**
   * Pan by a screen delta, WC3-hand: the ground follows the pointer.
   *
   * Yaw-aware since docs/free-camera.md — the feel is unchanged and the maths
   * is not. A drag is resolved against the camera's own screen axes rather
   * than against world X and Z, so "drag right, the water goes right" stays
   * true at every heading. With yaw 0 the two are the same expression, which
   * is why the locked rig could get away with the simpler one.
   */
  panBy(dxPx: number, dyPx: number): void {
    const canvas = this.renderer?.domElement;
    const height = canvas?.clientHeight ?? 900;
    const worldPerPx = (2 * this.distance * Math.tan(((FOV_DEG / 2) * Math.PI) / 180)) / height;
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);
    // Screen-vertical motion maps onto the ground plane through the pitch, and
    // the floor on the divisor is what stops a near-horizontal drag from
    // flinging the focus across the map on a few pixels of travel.
    const intoScreen = dyPx / Math.max(0.2, Math.sin(this.pitch));
    // Screen right is (cos yaw, -sin yaw); screen "down the ground" is
    // (-sin yaw, -cos yaw). Both negated, because the ground follows the hand.
    this.target.x -= dxPx * cosYaw * worldPerPx + intoScreen * sinYaw * worldPerPx;
    this.target.z -= -dxPx * sinYaw * worldPerPx + intoScreen * cosYaw * worldPerPx;
    this.clampTarget();
    // Applied now, not at the next frame: the overlay painter projects
    // through this camera on its own ticker, and a camera that moved between
    // the two draws would smear the HUD marks off the hulls they annotate.
    this.applyCamera();
  }

  /**
   * Turn and tilt the camera about its focus — docs/free-camera.md §4.
   *
   * Horizontal drag yaws, vertical yaws nothing and pitches instead. Yaw wraps
   * because a heading has no ends; pitch clamps because its band has two, and
   * both of them are spec'd rather than chosen here.
   */
  orbitBy(dxPx: number, dyPx: number): void {
    this.yaw = (this.yaw + dxPx * ORBIT_YAW_PER_PX) % (Math.PI * 2);
    // setPitch re-applies, so the yaw above rides along and the camera moves
    // once per event rather than twice.
    this.setPitch(this.pitch + dyPx * ORBIT_PITCH_PER_PX);
  }

  /**
   * Turn the camera by an angle rather than by a drag — the touch twist,
   * which arrives as radians off two fingers and has no business knowing what
   * a pixel of orbit is worth.
   */
  yawBy(radians: number): void {
    this.yaw = (this.yaw + radians) % (Math.PI * 2);
    this.applyCamera();
  }

  /**
   * Raise or sink the focus through the water column — docs/free-camera.md §4.
   * Positive rises (toward the surface), because that is what a wheel pushed
   * away from the player should do to a thing in front of them.
   *
   * The first call is what takes the focus off the seabed: until then it is
   * `null`, and the step has to start from where the ground actually is or the
   * focus would jump to 0 m on the first notch.
   */
  raiseFocusBy(metres: number): void {
    const from = this.focusDepthM ?? this.seabedDepthAt(this.target.x, this.target.z);
    this.focusDepthM = from - metres;
    this.clampTarget();
    this.applyCamera();
  }

  /**
   * Home — docs/free-camera.md §4: north, 55°, focus back on the seabed.
   *
   * The dolly and the plan position are deliberately left alone. A player who
   * presses this is lost in *angle*, and throwing away the zoom and the place
   * they had navigated to would answer a question they did not ask.
   */
  home(): void {
    this.yaw = 0;
    this.pitch = (HOME_PITCH_DEG * Math.PI) / 180;
    this.focusDepthM = null;
    this.applyCamera();
  }

  /** The heading the camera is facing, radians clockwise from north. For the
   * scope's camera box, which is the compass now (§5). */
  get headingRad(): number {
    return this.yaw;
  }

  private setPitch(radians: number): void {
    const min = (PITCH_MIN_DEG * Math.PI) / 180;
    const max = (PITCH_MAX_DEG * Math.PI) / 180;
    this.pitch = Math.min(max, Math.max(min, radians));
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
    // Framing the map means framing the ground, so a focus the player had
    // lifted into the column comes back down. The angles are theirs and are
    // left alone — `home()` is the verb that takes those back.
    this.focusDepthM = null;
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
    // The same four objects every frame, rewritten in place (#432): the one
    // caller reads them and keeps nothing. A perspective camera's ray from a
    // screen corner is the unprojected corner minus the eye, which needs no
    // Raycaster to say.
    const out = this.quadScratch;
    const origin = this.camera.position;
    for (let i = 0; i < 4; i++) {
      const [nx, ny] = QUAD_CORNERS[i]!;
      const direction = DIR_TMP.set(nx, ny, 0.5).unproject(this.camera).sub(origin).normalize();
      const scale = groundPlaneT(origin.y, direction.y, groundY);
      const px = origin.x + direction.x * scale;
      const pz = origin.z + direction.z * scale;
      const corner = out[i]!;
      corner.x = Math.min(terrain.cols * terrain.cellM, Math.max(0, px));
      corner.y = Math.min(terrain.rows * terrain.cellM, Math.max(0, pz));
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
      this.surveyCells?.dispose();
      this.terrainGrid = null;
      this.seabedCanvas = null;
      this.seabedTexture = null;
      this.surveyClasses = null;
      this.surveyCells = null;
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
    //
    // Three rungs in one mesh (docs/map-visuals.md §5): the bake's rock faces
    // and cliff shadows are rung 2, its biome fills, relief and mottle rung
    // 3, and the survey ink its shader draws rung 4. The veil below is a
    // drain on this ground, not a mark on it.
    const grid = buildHeightGrid(terrain, this.groundSeed, this.groundRockTopM);
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
    // The acoustic veil rides the ground as a vertex colour, so it costs the
    // frame no draw call and no triangle (gate 6): the terrain is already one
    // unlit mesh with a baked map, and a vertex colour multiplies straight
    // into it. White until a field exists — a chart with nothing shading it
    // is a chart, not a black tile.
    const shades = new Float32Array(grid.vertsX * grid.vertsZ * 3).fill(1);
    geometry.setAttribute('color', new BufferAttribute(shades, 3));
    // The authored floor per vertex, for the survey ink's isobaths
    // (docs/map-visuals.md §4). Shared with the grid rather than copied, so a
    // ground delta that patches the grid has patched the attribute too.
    geometry.setAttribute('surveyFloor', new BufferAttribute(grid.floor, 1));
    geometry.setIndex(new BufferAttribute(indices, 1));

    const canvas = bakeSeabed(terrain, this.groundSeed, this.seabedRange);
    const texture = new CanvasTexture(canvas);
    // The bake's row 0 is the map's north edge, and so is the grid's iz 0;
    // an unflipped texture keeps the two aligned without inverting the v axis.
    texture.flipY = false;
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    const material = new MeshBasicMaterial({ map: texture, vertexColors: true });
    // The survey: isobaths and coastlines drawn in this material's own
    // fragment shader, so the ground's silhouette costs no draw call.
    const classes = surveyCellClasses(terrain);
    const cells = surveyCellTexture(terrain, classes);
    installSurveyInk(material, terrain, cells);
    this.terrainMesh = new Mesh(geometry, material);
    this.scene.add(this.terrainMesh);
    this.terrainGrid = grid;
    this.seabedCanvas = canvas;
    this.seabedTexture = texture;
    this.surveyClasses = classes;
    this.surveyCells = cells;

    // The fog is the water (water.ts). Exponential rather than linear, and
    // its density follows the dolly rather than the map: the colour is what
    // the depth ramp says and the reach is what the frame needs, which is the
    // split "Reading the Water" argues for. `colour` is unused by the patched
    // chunk — the ramp supersedes it — but a scene whose fog reports a colour
    // nothing draws would be a trap for the next reader, so it is the
    // deepest water rather than an arbitrary one.
    const deepest = waterColorAt(DEPTH.MAX_M);
    const fog = new FogExp2(0x000000, fogDensityFor(this.distance, this.waterDensity));
    fog.color.setRGB(deepest.r, deepest.g, deepest.b);
    this.scene.fog = fog;

    this.rebuildDressing();
    this.syncEntities();
  }

  /**
   * Everything that stands on the ground and reads its heights: the chart
   * register, the embers, the props. Cheap next to the mesh and the bake —
   * a few hundred instance matrices and a handful of lines — and every one
   * of them is placed by rules that look at the cells around a change
   * (environment.ts, the locality guard), so a delta rebuilds them whole and
   * they land exactly where a full rebuild would have put them.
   */
  private rebuildDressing(): void {
    const terrain = this.terrain;
    if (terrain === null) return;
    this.terrainDressing.clear();
    this.buildTerrainDressing(terrain);
    this.buildEmbers(terrain);
    // Props stand on the drawn ground — the same heights the mesh has, crag
    // included — and rebuild only here, never per frame (gate 6). Rung 3,
    // ground (docs/map-visuals.md §5).
    this.environment.rebuild(terrain, (xM, yM) => this.groundYAt(xM, yM));
  }

  /**
   * The ground delta path (#434): move the vertices within a cell of the
   * change, re-shade those cells and their ring on the existing canvas, and
   * leave the other sixteen thousand vertices and million pixels alone.
   */
  private patchTerrain(touched: CellRect): void {
    const terrain = this.terrain;
    const mesh = this.terrainMesh;
    const grid = this.terrainGrid;
    const canvas = this.seabedCanvas;
    const texture = this.seabedTexture;
    if (terrain === null || mesh === null || grid === null || canvas === null || texture === null) {
      this.rebuildTerrain();
      return;
    }
    const span = patchHeightGrid(grid, terrain, this.groundSeed, this.groundRockTopM, touched);
    const positions = mesh.geometry.getAttribute('position') as BufferAttribute;
    for (let i = span.first; i <= span.last; i++) positions.setY(i, grid.y[i]!);
    positions.needsUpdate = true;
    // The floor attribute is the grid's own array, already patched; it only
    // needs re-uploading. A delta can also turn water to rock or change a
    // biome, which moves a coastline.
    (mesh.geometry.getAttribute('surveyFloor') as BufferAttribute).needsUpdate = true;
    if (this.surveyClasses !== null && this.surveyCells !== null) {
      patchSurveyCellClasses(this.surveyClasses, terrain, touched);
      this.surveyCells.needsUpdate = true;
    }
    // The raycast `resolveGround` runs reads the mesh's bounds; a cut deeper
    // than the old floor would otherwise fall outside them.
    mesh.geometry.computeBoundingSphere();
    mesh.geometry.computeBoundingBox();

    rebakeSeabedCells(canvas, terrain, this.groundSeed, this.seabedRange, touched);
    texture.needsUpdate = true;

    this.rebuildDressing();
    // A ground delta can change a cell's biome, and the biome is the water's
    // propagation factor — so the field this shades from moved, not just the
    // heights it is written onto.
    this.refreshVeil();
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
    const groundY = (xM: number, yM: number) => this.groundYAt(xM, yM);
    const isRock = (i: number) => terrain.ceiling[i]! > terrain.floor[i]!;

    // Tunnel routes: a line across each roofed cell, lifted just off the
    // ground. The mouth is invisible from above by construction; the line is
    // what a player needs (docs/art-direction.md, "Reading the Sea Floor").
    // Rung 5, map furniture (docs/map-visuals.md §5), at the ladder's alpha.
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
          new LineBasicMaterial({
            color: UI.accent,
            transparent: true,
            opacity: FURNITURE_OUTLINE_ALPHA.tunnelRoute,
          })
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

    // The rim is rung 5 too, at the ladder's alpha. The skirt below it is
    // unnamed in §5 and placed on rung 1, the deep water the world ends in.
    const rim = perimeter.map((p) => new Vector3(p.x, groundY(p.x, p.y) + 4, p.y));
    this.terrainDressing.add(
      new LineLoop(
        new BufferGeometry().setFromPoints(rim),
        new LineBasicMaterial({
          color: UI.glassStroke,
          transparent: true,
          opacity: FURNITURE_OUTLINE_ALPHA.mapRim,
        })
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
    // Fogged, unlike before the water landed (#836): the skirt is the wall
    // the world ends at, and a wall that stays crisp while the seabed in
    // front of it dissolves is the hard edge this whole change exists to
    // remove. It falls away into the same water everything else does.
    this.terrainDressing.add(
      new Mesh(skirtGeometry, new MeshBasicMaterial({ color: 0x040a12, side: DoubleSide }))
    );
  }

  /** Vent embers as one Points cloud: per-ember flicker rides the colour
   * attribute under additive blending, so 400 embers stay one draw call.
   * The 5 Hz step and the SPEC ember hue are seabed.ts's, unchanged.
   *
   * World light, which stands outside the loudness ladder by design
   * (docs/map-visuals.md §5) and answers to its own five rules instead. */
  private buildEmbers(terrain: TerrainPayload): void {
    const embers = ventEmbers(terrain, this.groundSeed);
    this.emberPhases = embers.map((e) => e.phase);
    this.emberPositions = embers.map((e) => ({ xM: e.xM, yM: e.yM }));
    this.emberVeil = new Float32Array(embers.length).fill(1);
    if (embers.length === 0) {
      this.embers = null;
      return;
    }
    const emberPositions = new Float32Array(embers.length * 3);
    const emberColors = new Float32Array(embers.length * 3);
    embers.forEach((ember, i) => {
      emberPositions[i * 3] = ember.xM;
      emberPositions[i * 3 + 1] = this.groundYAt(ember.xM, ember.yM) + 6;
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
        // Out of the fog chunk on purpose: mixing an *additive* fragment
        // toward the water colour makes a distant vent brighter the murkier
        // the water gets. An emitter loses light to the swim and gains none,
        // so the 5 Hz flicker multiplies by `waterTransmittance` instead
        // (water.ts).
        fog: false,
        // A point without a map rasterises as a square; an ember is a glow.
        map: this.emberSpriteTexture(),
      })
    );
    this.embers.renderOrder = 1;
    this.scene.add(this.embers);
    this.emberBucket = -1;
  }

  /**
   * Rebuild the veil field from the fleet, then re-shade everything on the
   * ground with it.
   *
   * Everything the player *earned* is deliberately absent from this list.
   * Contacts, Echo Marks, acquisition brackets, the own force itself, its
   * depth cues, the hazard countdowns and every line of the HUD draw at full
   * strength over whatever the veil has done to the seabed. Dimming a mark
   * would price the same information twice, and §4 and §12 already forbid the
   * renderer editing what the server resolved.
   *
   * The chart register is absent for the other reason: the tunnel routes and
   * the map rim are public chart furniture and the skirt is the water the map
   * ends in, drawn on the water rather than standing in it, and a chart does
   * not go quiet because you stopped listening.
   */
  private refreshVeil(): void {
    const terrain = this.terrain;
    if (terrain === null) return;
    const listeners: VeilListener[] = [];
    // Silent Running and a cut drive are postures of the *emitter*: a hull
    // that has gone quiet still has its hydrophones, and holds its water.
    for (const unit of this.units) {
      listeners.push({ xM: unit.x, yM: unit.y, hyd: statsFor(unit.kind).hyd });
    }
    // Structures are anchored hydrophone arrays (shared/structures.ts), which
    // is why a base with nothing left in the water still hears its own yard.
    for (const structure of this.structures) {
      listeners.push({
        xM: structure.x,
        yM: structure.y,
        hyd: structureStatsFor(structure.kind).hyd,
      });
    }
    this.veil.build(terrain, listeners);
    this.applyVeil();
  }

  /**
   * Push the current field onto the ground, the embers and the props.
   *
   * With the veil off this runs exactly once — the pass that puts the colour
   * back — and then stops, so a player who turned it off is not paying for a
   * 16k-vertex write of white at 5 Hz for the rest of the match.
   */
  private applyVeil(): void {
    const wanted = this.veilIntensity > 0;
    if (!wanted && !this.veilDrawn) return;
    this.veilDrawn = wanted;
    this.shadeGround();
    this.shadeEmbers();
    this.environment.setShade(wanted ? this.propShade : null);
  }

  /**
   * The veil's multiplier at a point, written into `out` in the renderer's
   * **linear** working space.
   *
   * The conversion is the gotcha this method exists to hold in one place.
   * `veilShade` speaks in display terms — "a third of the chart's
   * brightness" — because that is the only space the number can be reviewed
   * in. Vertex colours and instance colours are consumed raw by the shader,
   * with colour management on and `outputColorSpace` sRGB, so a display
   * figure written straight into the buffer lands about twice as bright as it
   * reads. `VEIL_TABLE` is that conversion done once at construction, over
   * the veil amount rather than per vertex: three `pow`s in total instead of
   * three per vertex per Echo tick over a 16k-vertex grid.
   */
  private linearShadeAt(xM: number, yM: number, out: Color): void {
    const k = (1 - this.veil.at(xM, yM)) * this.veilIntensity;
    const i = Math.round((k < 0 ? 0 : k > 1 ? 1 : k) * VEIL_STEPS) * 3;
    out.setRGB(VEIL_TABLE[i]!, VEIL_TABLE[i + 1]!, VEIL_TABLE[i + 2]!);
  }

  private shadeGround(): void {
    const mesh = this.terrainMesh;
    const grid = this.terrainGrid;
    if (mesh === null || grid === null) return;
    const colors = mesh.geometry.getAttribute('color') as BufferAttribute | undefined;
    if (colors === undefined) return;
    const shade = this.veilColor;
    for (let iz = 0; iz < grid.vertsZ; iz++) {
      const z = iz * grid.stepM;
      const row = iz * grid.vertsX;
      for (let ix = 0; ix < grid.vertsX; ix++) {
        this.linearShadeAt(ix * grid.stepM, z, shade);
        colors.setXYZ(row + ix, shade.r, shade.g, shade.b);
      }
    }
    colors.needsUpdate = true;
  }

  /**
   * Embers take a plain drain rather than the cold tint the ground takes.
   * A vent is a light, and deafness is not a filter over a light — it dims
   * it. Recolouring the one warm thing on the seabed towards blue would be
   * inventing a hue nobody specified (gate 4).
   */
  private shadeEmbers(): void {
    if (this.emberVeil.length === 0) return;
    const shade = this.veilColor;
    for (let i = 0; i < this.emberPositions.length; i++) {
      const at = this.emberPositions[i]!;
      this.linearShadeAt(at.xM, at.yM, shade);
      this.emberVeil[i] = (shade.r + shade.g + shade.b) / 3;
    }
    // The flicker only writes on a bucket change, so force the next frame to
    // re-issue the colours the veil just moved.
    this.emberBucket = -1;
  }

  private refreshGroundCache(): void {
    const terrain = this.terrain;
    if (terrain === null) return;
    this.groundSeed = seabedSeed(terrain);
    this.groundRockTopM = rockTopDepthM(terrain);
    this.seabedRange = seabedRange(terrain);
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
    group.remove(handle.mesh);
    this.cues.release(handle.cue);
    if (handle.model !== null) group.remove(handle.model.root);
  }

  /**
   * Build or update one own entity: the approved model once it is loaded, the
   * flat baked sprite until then (and for kinds that have none), plus the
   * plumb line and ground shadow either way.
   *
   * Rung 7, agents (docs/map-visuals.md §5): own hulls and structures, with
   * the cues placed alongside them. The ladder does not weigh rung 7 yet, and
   * §10 says why.
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
          // Multiplies the baked map down onto the lit scene's register.
          color: new Color().setScalar(SPRITE_REGISTER),
        })
      );
      mesh.rotation.order = 'YXZ';
      mesh.rotation.x = -Math.PI / 2;
      group.add(mesh);
      handle = {
        mesh,
        cue: this.cues.allocate(),
        shadowRadius: 0,
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

    if (model !== null) {
      model.root.scale.setScalar(model.baseScale * draw);
      // Loudness is the lights, not the paint: live SIG swings the lamps
      // around the intake-approved resting strength (gate 3), so a hull
      // running silent goes dark instead of translucent.
      applyLiveGlow(model, spec.liveSig, spec.restSig);
    } else {
      (handle.mesh.material as MeshBasicMaterial).opacity = spec.dimmed ? 0.45 : 1;
    }
    handle.shadowRadius =
      draw *
      (model !== null
        ? Math.max(model.lengthM, model.beamM) * 0.4
        : Math.max(handle.widthM, handle.heightM) * 0.35);

    this.placeHandle(handle, spec.x, spec.z, spec.depthM, spec.yaw);
  }

  /**
   * Put an entity's hull, plumb and shadow where it is. Split from the sync
   * because own hulls move between snapshots (#429): this runs per frame for
   * a hull with ground still to cover, and it must cost only what a move costs
   * — no texture lookups, no glow, nothing allocated.
   */
  private placeHandle(
    handle: EntityHandle,
    x: number,
    z: number,
    depthM: number,
    yaw: number
  ): void {
    const draw = this.drawScale;
    // The sync hides the sprite exactly when the model is showing.
    const model = handle.mesh.visible ? null : handle.model;
    const y = depthToWorldY(depthM);
    const groundY = this.groundYAt(x, z);
    // The clearance rides the scale: a bottomed hull drawn four times over
    // would otherwise bury half its own height in the seabed at survey zoom.
    const hullY = Math.max(y, groundY + 4 * draw);
    if (model !== null) {
      model.root.position.set(x, hullY, z);
      model.root.rotation.y = -yaw;
    } else {
      handle.mesh.position.set(x, hullY, z);
      handle.mesh.rotation.y = -yaw;
    }

    // The plumb line and ground shadow are what make the water column
    // readable: a hull's height above its own shadow *is* its depth. The
    // interface voice (cyan), because depth here is information, not threat.
    // The plumb is never scaled — its length is the depth, and a scaled plumb
    // would be the one place this factor told a lie. The shadow is, because a
    // true-scale shadow under an exaggerated hull reads as the wrong depth.
    this.cues.setPlumb(handle.cue, x, y, groundY + 1, z);
    this.cues.setShadow(handle.cue, x, groundY + 2, z, handle.shadowRadius);
  }

  /**
   * The per-frame half of the sync: own hulls only, positions only. Runs
   * while any hull still has ground to cover before the next Echo tick.
   */
  private placeUnits(nowMs: number): void {
    for (const unit of this.units) {
      const handle = this.unitHandles.get(unit.id);
      if (handle === undefined) continue;
      const at = this.motion.at(unit, nowMs, this.drawn);
      this.placeHandle(handle, at.x, at.y, at.depth, this.headings.get(unit.id) ?? 0);
    }
  }

  private syncEntities(): void {
    if (this.terrain === null) return;

    // Liveness by set, not by scan (#432): `some` per handle was quadratic.
    const liveUnits = new Set(this.units.map((u) => u.id));
    for (const [id, handle] of this.unitHandles) {
      if (!liveUnits.has(id)) {
        this.dropHandle(this.unitGroup, handle);
        this.unitHandles.delete(id);
      }
    }
    const now = performance.now();
    for (const unit of this.units) {
      // Between ticks, not at the last one (#429): a sync that lands mid-glide
      // — a zoom, a snapshot — must not yank the hull to the newest sample
      // and back.
      const at = this.motion.at(unit, now, this.drawn);
      this.syncEntity(this.unitHandles, this.unitGroup, unit.id, {
        spriteKey: `unit:${unit.kind}:${this.faction}:${ACTIVE_PALETTE.name}`,
        canvas: hullSpriteCanvas(unit.kind, this.faction),
        sizeM: hullSpriteSizeM(unit.kind, this.faction),
        x: at.x,
        z: at.y,
        depthM: at.depth,
        yaw: this.headings.get(unit.id) ?? 0,
        dimmed: unit.silentRunning,
        modelDesc: { unit: unit.kind, faction: this.faction },
        modelCacheKey: `unit:${unit.kind}:${this.faction}:${ACTIVE_PALETTE.name}`,
        liveSig: unit.sig,
        restSig: statsFor(unit.kind).sigIdle,
      });
    }

    const liveStructures = new Set(this.structures.map((s) => s.id));
    for (const [id, handle] of this.structureHandles) {
      if (!liveStructures.has(id)) {
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
    this.syncOrdnance(now);
  }

  /**
   * The player's own ordnance, drawn where it is between ticks. Runs with
   * the entity sync (a zoom, a snapshot) and per frame while anything moves.
   * Rung 7, agents (docs/map-visuals.md §5).
   */
  private syncOrdnance(nowMs: number): void {
    const ink = FACTION_PALETTE[this.faction];
    this.ordnanceLayer.setPalette(ink.primary, ink.glow);
    this.ordnanceLayer.sync(
      this.ordnance,
      (item) => {
        const at = this.ordnanceMotion.at(item, nowMs, this.drawn);
        return {
          x: at.x,
          z: at.y,
          worldY: depthToWorldY(at.depth),
          groundY: this.groundYAt(at.x, at.y),
        };
      },
      this.drawScale
    );
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
    // The focus stays in water (docs/free-camera.md §4). Re-clamped on every
    // pan, not only when the player moves it: a focus held at 900 m that pans
    // onto a 400 m plateau is asking to sit inside rock, and the answer is the
    // same one terrain gives a hull — the ground raises it.
    if (this.focusDepthM !== null) {
      const seabed = this.seabedDepthAt(this.target.x, this.target.z);
      this.focusDepthM = Math.min(seabed, Math.max(0, this.focusDepthM));
    }
  }

  /**
   * The focus's world height: the seabed under it, or the depth it was moved
   * to. `null` means the ground, and has to be resolved per read rather than
   * cached, because the ground moves under a pan.
   */
  private focusY(): number {
    return this.focusDepthM === null
      ? this.groundYAt(this.target.x, this.target.z)
      : depthToWorldY(this.focusDepthM);
  }

  // ----------------------------------------------------------------- frame

  private applyCamera(): void {
    const look = LOOK_TMP.set(this.target.x, this.focusY(), this.target.z);
    const reach = Math.cos(this.pitch) * this.distance;
    // yaw 0 puts the eye south of the focus looking north. That was the whole
    // rig once (the viewport and the scope had to agree on north); it is now
    // just where the dial starts, and the scope's camera box carries the
    // agreement instead — docs/free-camera.md §5.
    const eyeX = look.x + Math.sin(this.yaw) * reach;
    const eyeZ = look.z + Math.cos(this.yaw) * reach;
    let eyeY = look.y + Math.sin(this.pitch) * this.distance;

    // The rig's one hard clamp (§4). The eye is raised rather than the dolly
    // shortened: the player keeps the framing they asked for, and the camera
    // keeps looking at the thing they pointed it at — a shortened dolly would
    // silently zoom them in every time they swung past a ridge.
    const floorY = this.groundYAt(eyeX, eyeZ) + EYE_CLEARANCE_M * DEPTH_VISUAL_M_PER_M;
    if (eyeY < floorY) eyeY = floorY;

    this.camera.position.set(eyeX, eyeY, eyeZ);
    this.camera.lookAt(look);
    this.camera.updateMatrixWorld();
    this.cameraRevision++;
  }

  /**
   * The two water layers that need to know where the camera ended up.
   *
   * Split from the reach at the top of the frame because these need the
   * *applied* camera — the backdrop unprojects through it and the snow wraps
   * its box around the eye — and the eye is not final until the floor clamp
   * in `applyCamera` has had its say.
   *
   * Rung 1, the water: the depth ramp and marine snow (docs/map-visuals.md §5).
   */
  private syncWater(now: number): void {
    // The focus, in metres of depth: the one anchor in the frame that is
    // always in water. `focusY` resolves "on the seabed" against the ground
    // under the focus, so this follows a pan across a trench the way the
    // camera does.
    const focusDepthM = -this.focusY() / DEPTH_VISUAL_M_PER_M;
    this.backdrop.update(this.camera, focusDepthM);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const projectionScalePx =
      (this.viewHeight * pixelRatio) / (2 * Math.tan(((FOV_DEG / 2) * Math.PI) / 180));
    this.snow.update(
      now,
      this.camera.position,
      this.target.x,
      this.target.z,
      this.waterReach,
      this.waterDensity,
      projectionScalePx,
      pixelRatio
    );
    // Not the water, but it swims in it: the stipple fades with the same
    // reach and sizes its dots on the same projection scale as the snow.
    this.life.update({
      now,
      eye: this.camera.position,
      reachM: this.waterReach,
      waterDensity: this.waterDensity,
      projectionScalePx,
      pixelRatio,
    });
  }

  /** See `cameraRevision`. */
  get viewRevision(): number {
    return this.cameraRevision;
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
    // Ignore tab-hidden gaps; a 4-second "frame" is not a frame. The guard
    // asks whether the page actually went hidden, never how long the gap was:
    // it used to drop anything past 500 ms, and on the first real-GPU drive
    // that swallowed a three-second stall in plain view and reported the
    // station's worst frame as 17.7 ms (#286). The two duration series below
    // are measured inside a call a hidden tab never makes, so they need none.
    const hidden = this.hiddenSinceFrame || document.hidden;
    this.hiddenSinceFrame = false;
    if (!hidden) this.frameCost.add(frameMs);

    // How far the water reaches, before anything asks. It follows the dolly
    // (water.ts), so a wheel notch moves it and it is cheapest to settle once
    // a frame rather than to recompute it in each of the four places that
    // read it.
    this.waterReach = waterReachM(this.distance);
    if (this.scene.fog instanceof FogExp2) {
      this.scene.fog.density = fogDensityFor(this.distance, this.waterDensity);
    }

    // Ember flicker steps on the 5 Hz sonar bucket, never smoothly — the
    // seabed's one light keeps the register (docs/art-direction.md).
    if (this.embers !== null) {
      const bucket = Math.floor(now / 200);
      if (bucket !== this.emberBucket) {
        this.emberBucket = bucket;
        const colors = this.embers.geometry.getAttribute('color') as BufferAttribute;
        const ember = EMBER_COLOR;
        const eye = this.camera.position;
        const reach = this.waterReach;
        for (let i = 0; i < this.emberPhases.length; i++) {
          // A vent seen through water nobody is listening to is still a vent,
          // and still the seabed's one light — it just goes as cold as the
          // ground it burns on. An unveiled ember over veiled ground would be
          // the layer that got forgotten (docs/ui-ux.md §4.5).
          //
          // Then the swim: the far vent field fades out with everything else
          // on the seabed rather than staying the one crisp thing at the map
          // edge. Priced here, at 5 Hz, because the ember material is the one
          // thing in the scene the fog chunk must not touch — see
          // `buildEmbers`. The camera moves between buckets and the level does
          // not, which is the same 200 ms the flicker already steps on.
          const at = this.emberPositions[i]!;
          const dx = at.xM - eye.x;
          const dz = at.yM - eye.z;
          const swim = waterTransmittance(Math.hypot(dx, dz), reach);
          const level =
            0.55 * emberFlicker(i, bucket, this.emberPhases[i]!) * (this.emberVeil[i] ?? 1) * swim;
          colors.setXYZ(i, ember.r * level, ember.g * level, ember.b * level);
        }
        colors.needsUpdate = true;
      }
    }

    // The kelp current: one uniform per bending template, nothing per prop.
    this.environment.tick(now);

    this.applyCamera();
    this.syncWater(now);
    // The readability factor follows the dolly, so it is recomputed on the
    // frame rather than on the 5 Hz snapshot: a wheel zoom must not wait up to
    // 200 ms for the fleet to reach its drawn size. Re-syncing only on an
    // actual change keeps a still camera free.
    const scale = hullReadabilityScale(groundPxPerM(this.viewHeight, FOV_DEG, this.distance));
    if (Math.abs(scale - this.drawScale) > 1e-3) {
      this.drawScale = scale;
      this.syncEntities();
    } else if (this.motion.animating(now) || this.ordnanceMotion.animating(now)) {
      // Own hulls and own ordnance glide between Echo ticks (docs/ui-ux.md
      // §12); contacts do not, and the chart owns those. A still fleet costs
      // the frame nothing.
      this.placeUnits(now);
      this.syncOrdnance(now);
    }
    renderer.render(this.scene, this.camera);
    this.connCost.add(performance.now() - now);
  }

  /**
   * The overlay painter's per-frame CPU cost, handed over by `EchoRenderer`
   * once per Pixi tick.
   *
   * It is the half of the composited frame that re-projects every ring vertex,
   * symbol and route through this view's camera, and it is timed here rather
   * than over there so the drive reads one probe and gets both halves of the
   * frame it is standing in front of. What it covers is the overlay's
   * scene-graph work — the projection and the re-issue of the draw
   * instructions — because that is what the gate-6 remedies would act on; Pixi
   * rasterises after its ticker callbacks return, and that cost lands in the
   * composited interval like any other GPU work.
   */
  recordOverlayCost(costMs: number): void {
    if (!this.active) return;
    this.overlayCost.add(costMs);
  }

  /**
   * Start a new measurement station, zeroing all three series.
   *
   * Gate 6's drive is five stations on one page load, and a worst case that
   * survives a station boundary reports the loading hitch at every one of
   * them.
   */
  private beginStation(label: string | null): void {
    this.stationLabel = label;
    this.stationStartedAt = performance.now();
    this.frameCost.reset();
    this.connCost.reset();
    this.overlayCost.reset();
  }

  /** Read-only telemetry for the harness, like the audio and hazard probes. */
  private exposeProbe(): void {
    (window as unknown as { __perspectiveProbe?: () => unknown }).__perspectiveProbe = () =>
      this.probeReading();

    // The station boundary gate 6's drive walks. It closes the station being
    // measured, hands back its reading, and opens the next one — one call
    // rather than a read and a reset, so the frames between the two cannot go
    // missing or, worse, land in the wrong station's average.
    (
      window as unknown as { __perspectiveStation?: (label?: string) => unknown }
    ).__perspectiveStation = (label?: string) => {
      const closed = this.probeReading();
      this.beginStation(label ?? null);
      return closed;
    };

    // The harness's tripod: point the camera, nothing else. It moves only
    // the view over the player's own resolved data — the same pan, zoom, orbit
    // and focus the pointer already commands — and can neither read nor order
    // anything. The aim went on it with the free camera (docs/free-camera.md
    // §8): gates 6 and 7 are now judged across the pitch band, and a band a
    // screenshot harness cannot reach is a band nobody reviews.
    (
      window as unknown as {
        __perspectiveCamera?: (
          x: number,
          z: number,
          distance?: number,
          aim?: { yawDeg?: number; pitchDeg?: number; focusDepthM?: number | null }
        ) => void;
      }
    ).__perspectiveCamera = (x, z, distance, aim) => {
      this.focusWorld(x, z, distance);
      if (aim === undefined) return;
      if (aim.yawDeg !== undefined) this.yaw = (aim.yawDeg * Math.PI) / 180;
      if (aim.focusDepthM !== undefined) this.focusDepthM = aim.focusDepthM;
      // Last, because it clamps and re-applies — and because the clamp has to
      // see the focus the other two just set.
      this.setPitch(aim.pitchDeg === undefined ? this.pitch : (aim.pitchDeg * Math.PI) / 180);
      this.clampTarget();
      this.applyCamera();
    };
  }

  /**
   * One reading of the probe: the geometry ledger gates 6 already counted, and
   * the composited frame as three numbers rather than one.
   *
   * `frameMs` is the interval between shipped frames — the thing a player
   * feels. `connMs` and `overlayMs` split it into the two painters that fill
   * it. They do not sum to it and are not meant to: the gap between them is
   * Pixi's own rasterisation, the browser's compositing, and whatever idle a
   * frame finished early enough to have. `fps` is counted over the whole
   * station rather than inverted from `avgFrameMs`, so on a station longer
   * than the average's window the two are different questions and may
   * legitimately disagree.
   */
  private probeReading() {
    const info = this.renderer?.info;
    const elapsed = performance.now() - this.stationStartedAt;
    return {
      active: this.active,
      // The rig's whole state (docs/free-camera.md §4). `pitchDeg` was a
      // constant when the camera was locked; a screenshot review that has to
      // judge gates 6 and 7 across the pitch band needs it to be a reading.
      pitchDeg: Number(((this.pitch * 180) / Math.PI).toFixed(1)),
      yawDeg: Number((((this.yaw * 180) / Math.PI + 360) % 360).toFixed(1)),
      // Where the camera is looking, and from where. A screenshot review
      // judging gates 6 and 7 across the pitch band has to be able to caption
      // the shot with the frame it was taken in; before the camera was freed
      // there was only one frame and nothing to say.
      focus: {
        xM: Math.round(this.target.x),
        zM: Math.round(this.target.z),
        depthM: this.focusDepthM === null ? null : Math.round(this.focusDepthM),
      },
      eye: {
        xM: Math.round(this.camera.position.x),
        zM: Math.round(this.camera.position.z),
        depthM: Math.round(-this.camera.position.y / DEPTH_VISUAL_M_PER_M),
      },
      distance: Math.round(this.distance),
      // The water this frame (#836). A gate-6 or gate-7 shot judged across
      // the pitch band has to be able to say how far the medium was reaching
      // when it was taken, because the reach follows the dolly and two shots
      // at different zooms are two different waters.
      waterReachM: Math.round(this.waterReach),
      waterDensity: Number(this.waterDensity.toFixed(2)),
      hullScale: Number(this.drawScale.toFixed(2)),
      drawCalls: info?.render.calls ?? 0,
      triangles: info?.render.triangles ?? 0,
      // The station these frame numbers belong to, and the two counts that say
      // whether to believe them: `stationFrames` is every frame since the
      // boundary, `avgFrames` the window the average actually covers. Equal
      // means the average blends nothing; `avgFrames` short of `stationFrames`
      // means the station outran the window, which is fine, and the reverse
      // never happens.
      station: this.stationLabel,
      stationMs: ms(elapsed),
      stationFrames: this.frameCost.count,
      avgFrames: this.frameCost.frames,
      fps: elapsed <= 0 ? 0 : Number(((this.frameCost.count * 1000) / elapsed).toFixed(1)),
      avgFrameMs: ms(this.frameCost.avg),
      worstFrameMs: ms(this.frameCost.worst),
      avgConnMs: ms(this.connCost.avg),
      worstConnMs: ms(this.connCost.worst),
      avgOverlayMs: ms(this.overlayCost.avg),
      worstOverlayMs: ms(this.overlayCost.worst),
      // Zero here means the overlay never reported, not that it was free —
      // the two painters run on separate loops and only one of them is this
      // class's.
      overlayFrames: this.overlayCost.count,
      units: this.unitHandles.size,
      structures: this.structureHandles.size,
      // Own ordnance in the water, drawn by the instanced layer (gate 6).
      ordnance: this.ordnanceLayer.count,
      // The prop layer's own ledger (gate 6): a prop regression is a
      // number, not an impression.
      ...this.environment.stats(),
      modelBacked:
        [...this.unitHandles.values()].filter((h) => h.model !== null).length +
        [...this.structureHandles.values()].filter((h) => h.model !== null).length,
      ownCentre: this.ownCentre(),
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
