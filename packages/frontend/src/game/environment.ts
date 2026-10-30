/**
 * The environment prop registry and its deterministic scatter —
 * docs/graphics-standards.md "The environment branch", docs/art-direction.md
 * "Environmental Shapes".
 *
 * Pure data, like perspectiveTerrain.ts: no three.js in here, so placement is
 * testable under node and the scene layer (environmentLayer.ts) stays a dumb
 * consumer. A prop is dressing for what a cell already declares — a kelp
 * cluster stands only in kelp, a crag only on rock — so placement reads the
 * published terrain grid and nothing else.
 *
 * The hard boundaries, restated because props are the most tempting place to
 * break them:
 *
 * - **Render-only.** The simulation never reads where a prop stands. A prop
 *   never blocks, hides, or reveals anything; the cell grid stays what the
 *   game plays on.
 * - **Deterministic, per cell.** Placement is a pure hash of one cell's own
 *   published values — never `seabedSeed()`, which mixes every floor on the
 *   map and would shuffle every prop map-wide the moment one CoralRuins span
 *   collapses. With the per-cell hash, a ground delta moves only the props
 *   standing on (or beside) the changed cells, identically on every client —
 *   the same argument `ventEmbers` already makes.
 * - **Budgeted by construction.** `placeProps` stops at the instance and
 *   triangle reservations (graphics-standards gate 6) rather than trusting a
 *   review to notice, so no future map or density tune can exceed them.
 */

import {
  Biome,
  ECONOMY,
  landmarkState,
  PLACED_GROUND,
  paintGround,
  ResourceKind,
} from '@echoes/shared';
import type { LandmarkState, PublicLandmark, ResourceNodeInfo } from '@echoes/shared';
import type { WorldLook } from './tutorialLook.ts';

/**
 * The published grid, as placement reads it — the shape of the client's
 * `TerrainPayload` restated here so this module depends on nothing but
 * shared: the backend's environmentBudget test imports it beside the maps.
 */
export interface TerrainGrid {
  cols: number;
  rows: number;
  cellM: number;
  biomes: readonly number[];
  floor: readonly number[];
  ceiling: readonly number[];
}

export interface PropSpec {
  /** `env-<biome-word>-<thing>` — resolves `<slug>.glb` in the models dir. */
  slug: string;
  /** Canonical scale: the model's larger footprint axis is held to this,
   * exactly as hulls are held to HULL_LENGTH_M (`--footprint-m` at intake).
   * One measure, everywhere: three's loose `Box3.setFromObject` over the
   * parts as the file delivers them — each part's own box through its
   * transform — the larger of X and Z. Intake (page.html), the prop
   * scripts (seabed.mjs `stand`), the renders and the runtime
   * (environmentModels.ts `propFootprint`) all take it. A leaning part's
   * box overhangs its vertices, so the vertex extent is smaller: 9.77 m on
   * the boulder's 12 (#876). */
  footprintM: number;
  /** Triangles one instance costs — the count hull-intake reported for the
   * committed model, spent against the gate-6 reservation below. A heavier
   * replacement export must raise this row, and the backend's budget test
   * says whether the maps can afford it. */
  triBudget: number;
  /** Expected instances per eligible cell. Fractions are resolved by hash, so
   * 0.4 means roughly two cells in five carry one. */
  density: number;
  /** Where the prop stands: open water cells of these biomes, or rock. */
  stands: 'rock' | readonly Biome[];
  /** For open-ground props: whether a rock neighbour is required (crags at a
   * mesa base), forbidden (kelp keeps clear of walls), or irrelevant. */
  nearRock: 'require' | 'exclude' | 'any';
  /** Max authored-floor step to any open 4-neighbour, metres — tall props
   * avoid ground that is visibly mid-cliff. Infinity for don't-care. */
  maxSlopeM: number;
  /** Tall props skip roofed cells: kelp standing where the mesh cannot show
   * a roof would fight the route-line language. */
  excludeRoofed: boolean;
  /** Uniform scale jitter range; yaw is always randomised. */
  scaleJitter: readonly [number, number];
  /** The licensed world-light family (docs/style-neon-noir.md "World light").
   * 'none' means intake fails the model if it carries any emissive. 'civic'
   * is the arch study's licence (asset-prompts-3d.md Block 4b) and is
   * admitted for its one landmark, `env-ruin-transit-arch`, alone: intake
   * refuses the flag on any other slug, and no scattered row below takes it. */
  worldLight: 'none' | 'vent' | 'flora' | 'crystal' | 'ore' | 'civic';
  /** Current sway, metres of lateral displacement at the prop's top (0 for
   * everything that is stone). Vertex-only: the instance matrix never moves,
   * so placement, the probe and the budget are untouched by it. */
  swayM: number;
  /**
   * SPEC — the share of its own height a seated stone stands sunk in the
   * silt (docs/art-direction.md "Silt detail and seated stones — SPEC"): never
   * more than half, so the approved silhouette still stands. Absent for
   * everything that is not loose stone on open ground. Drawn only where the
   * silt detail is (seabedDetail.ts), with the scour the bake gives it.
   */
  buryFraction?: number;
  /**
   * Breathes steam from its mouth: docs/environments.md §1's Thermal Vein
   * plumes, drawn by ventPlume.ts in the vent world-light family. Absent on
   * everything that is not a stack — a basalt boulder has no mouth.
   */
  plume?: true;
}

/**
 * The registry — one row per `env-*.glb` in docs/concept-art/models/, the
 * contract rows of docs/asset-prompts-3d.md Block 4 with the triangle count
 * intake reported for each committed model (all well inside the table's
 * per-row caps; a replacement export is held to the same cap by intake).
 *
 * Densities are the one number the docs do not pin. They are set against the
 * gate-6 reservation summed over the shipped maps (the backend's
 * environmentBudget test): a density that would make `placeProps` cut is a
 * density that dresses the north of a map and not the south, because the
 * spend order is row-major. Tall props keep off cliffs and out of roofed
 * passages; low ones stand anywhere their biome does.
 */
export const ENVIRONMENT_PROPS: readonly PropSpec[] = [
  // Thermal Veins — basalt and magma glass, the chimney ember-lit at the mouth.
  {
    slug: 'env-vent-chimney',
    footprintM: 12,
    triBudget: 434,
    density: 0.22,
    stands: [Biome.ThermalVein],
    nearRock: 'any',
    maxSlopeM: 250,
    excludeRoofed: true,
    scaleJitter: [0.8, 1.25],
    worldLight: 'vent',
    swayM: 0,
    plume: true,
  },
  {
    slug: 'env-vent-basalt',
    footprintM: 15,
    triBudget: 270,
    density: 0.3,
    stands: [Biome.ThermalVein],
    nearRock: 'any',
    maxSlopeM: Number.POSITIVE_INFINITY,
    excludeRoofed: false,
    scaleJitter: [0.7, 1.3],
    worldLight: 'none',
    swayM: 0,
    buryFraction: 0.15,
  },
  // Kelp Forest — the forty-metre columns, and living coral stone between them.
  {
    slug: 'env-kelp-cluster',
    footprintM: 18,
    triBudget: 388,
    density: 0.55,
    stands: [Biome.KelpForest],
    nearRock: 'exclude',
    maxSlopeM: 300,
    excludeRoofed: true,
    scaleJitter: [0.75, 1.25],
    worldLight: 'flora',
    swayM: 4,
  },
  {
    slug: 'env-coral-tower',
    footprintM: 15,
    triBudget: 588,
    density: 0.12,
    stands: [Biome.KelpForest],
    nearRock: 'any',
    maxSlopeM: 250,
    excludeRoofed: true,
    scaleJitter: [0.8, 1.2],
    worldLight: 'none',
    swayM: 0,
  },
  // Abyssal Trench — blackened, pressure-eroded, knife-edged.
  {
    slug: 'env-trench-spire',
    footprintM: 20,
    triBudget: 146,
    density: 0.18,
    stands: [Biome.AbyssalTrench],
    nearRock: 'any',
    maxSlopeM: 400,
    excludeRoofed: true,
    scaleJitter: [0.7, 1.3],
    worldLight: 'none',
    swayM: 0,
  },
  {
    slug: 'env-trench-slab',
    footprintM: 25,
    triBudget: 72,
    density: 0.25,
    stands: [Biome.AbyssalTrench],
    nearRock: 'any',
    maxSlopeM: Number.POSITIVE_INFINITY,
    excludeRoofed: false,
    scaleJitter: [0.7, 1.3],
    worldLight: 'none',
    swayM: 0,
    buryFraction: 0.3,
  },
  // Resonance Field — faceted crystal, and the toppled remains of instruments.
  {
    slug: 'env-resonance-crystal',
    footprintM: 12,
    triBudget: 330,
    density: 0.3,
    stands: [Biome.ResonanceField],
    nearRock: 'any',
    maxSlopeM: 300,
    excludeRoofed: true,
    scaleJitter: [0.7, 1.35],
    worldLight: 'crystal',
    swayM: 0,
  },
  {
    slug: 'env-resonance-pylon',
    footprintM: 10,
    triBudget: 484,
    density: 0.1,
    stands: [Biome.ResonanceField],
    nearRock: 'any',
    maxSlopeM: 250,
    excludeRoofed: true,
    scaleJitter: [0.85, 1.15],
    worldLight: 'none',
    swayM: 0,
  },
  // Coral Ruins — right angles and terraces under a civilisation's worth of
  // coral. The ruins ring is the largest biome on two of the three skirmish
  // maps, so these densities are the low ones.
  {
    slug: 'env-ruin-block',
    footprintM: 25,
    triBudget: 376,
    density: 0.08,
    stands: [Biome.CoralRuins],
    nearRock: 'any',
    maxSlopeM: 300,
    excludeRoofed: true,
    scaleJitter: [0.8, 1.2],
    worldLight: 'none',
    swayM: 0,
  },
  {
    slug: 'env-ruin-dome-shard',
    footprintM: 40,
    triBudget: 508,
    density: 0.03,
    stands: [Biome.CoralRuins],
    nearRock: 'any',
    maxSlopeM: 200,
    excludeRoofed: true,
    scaleJitter: [0.85, 1.15],
    worldLight: 'none',
    swayM: 0,
  },
  {
    slug: 'env-coral-growth',
    footprintM: 12,
    triBudget: 196,
    density: 0.12,
    stands: [Biome.CoralRuins, Biome.KelpForest],
    nearRock: 'any',
    maxSlopeM: Number.POSITIVE_INFINITY,
    excludeRoofed: false,
    scaleJitter: [0.7, 1.3],
    worldLight: 'flora',
    swayM: 0,
  },
  // Rock, any biome — the jagged-rock vocabulary for mesa edges.
  {
    slug: 'env-rock-crag-a',
    footprintM: 30,
    triBudget: 228,
    density: 0.25,
    stands: 'rock',
    nearRock: 'any',
    maxSlopeM: Number.POSITIVE_INFINITY,
    excludeRoofed: false,
    scaleJitter: [0.8, 1.2],
    worldLight: 'none',
    swayM: 0,
  },
  {
    slug: 'env-rock-crag-b',
    footprintM: 30,
    triBudget: 148,
    density: 0.25,
    stands: 'rock',
    nearRock: 'any',
    maxSlopeM: Number.POSITIVE_INFINITY,
    excludeRoofed: false,
    scaleJitter: [0.8, 1.2],
    worldLight: 'none',
    swayM: 0,
  },
  // Open Water — a boulder now and then, so the plain is not a void.
  {
    slug: 'env-open-boulder',
    footprintM: 12,
    triBudget: 160,
    density: 0.1,
    stands: [Biome.OpenWater],
    nearRock: 'any',
    maxSlopeM: 300,
    excludeRoofed: false,
    scaleJitter: [0.7, 1.3],
    worldLight: 'none',
    swayM: 0,
    buryFraction: 0.3,
  },
  // Resource field, any biome — the ore a nodule field is made of (#1555).
  // Stood by `scatterFields` at the fields the room publishes, never by the
  // biome scatter: `stands` names no biome and the density is zero, so the
  // row is a template and a triangle price, and a field is its only caller.
  {
    slug: 'env-nodule-bed',
    footprintM: 12,
    triBudget: 230,
    density: 0,
    stands: [],
    nearRock: 'any',
    maxSlopeM: Number.POSITIVE_INFINITY,
    excludeRoofed: false,
    scaleJitter: [0.8, 1.25],
    worldLight: 'ore',
    swayM: 0,
  },
];

/** Gate-6 reservation, both halves (docs/graphics-standards.md): instancing
 * keeps draw calls flat per slug×material, so the caps that need enforcing
 * are bodies and triangles. `placeProps` spends against both and stops.
 *
 * SPEC — graphics-standards.md gate 6, re-baselined at 105 k once the Block 4
 * Claude Design batch (#321) replaced the generated props: the densities above
 * were tuned to the generator's triangle counts, the design models run heavier
 * per instance, and the batch cut eight densities to stay under the original
 * 80 k. That figure restored those densities, and the tightest shipped map
 * (Ventfront Divide) dressed at ~101 k of it. Raised to 120 k on #1555, when
 * the resource fields' ore joined the layer: seven fields on Ventfront stand
 * about 14.8 k more, and the whole layer still sits well inside the conn view's
 * 400 k on-screen budget. */
export const PROP_INSTANCE_CAP = 600;

/**
 * TUNABLE — a look's density over the registry's, per biome: docs/visual-reboot.md
 * §4. The registry's Coral Ruins rows are the low ones because the ruins ring is
 * the largest biome on two of the three skirmish maps; on Sorrowgate they left
 * the court two props and the Concourse one, so the most human ground in the
 * setting read as the barest (#1532). The look raises them, and the Commit's
 * trench kit with them, on the prologue's ground alone: no skirmish map and no
 * other mission is drawn in this look. Dressing only — a prop reads the cells
 * and never writes one — and spent inside the same reservation below.
 */
export const LOOK_DENSITY: Record<WorldLook, Partial<Record<Biome, number>>> = {
  standard: {},
  sorrowgate: { [Biome.CoralRuins]: 3, [Biome.AbyssalTrench]: 2 },
};
export const PROP_TRI_RESERVATION = 120_000;

export interface PropPlacement {
  slug: string;
  xM: number;
  yM: number;
  yawRad: number;
  /** Uniform scale on top of the template's canonical footprint. */
  scale: number;
  /** The cell the placement belongs to — the delta-locality unit. */
  cellIndex: number;
}

/** Registry lookup for the scene layer. */
export function propSpec(slug: string): PropSpec | undefined {
  return ENVIRONMENT_PROPS.find((spec) => spec.slug === slug);
}

/**
 * FNV-1a over the given words, avalanched to [0, 1). The inputs are one
 * cell's own published values plus per-use salts — nothing map-global, which
 * is the whole delta-locality argument above.
 */
export function propHash(values: readonly number[]): number {
  let h = 0x811c9dc5;
  for (const value of values) {
    const v = value | 0;
    h ^= v & 0xff;
    h = Math.imul(h, 0x01000193);
    h ^= (v >>> 8) & 0xff;
    h = Math.imul(h, 0x01000193);
    h ^= (v >>> 16) & 0xff;
    h = Math.imul(h, 0x01000193);
    h ^= (v >>> 24) & 0xff;
    h = Math.imul(h, 0x01000193);
  }
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 0x100000000;
}

/**
 * Every prop placement for a terrain, deterministic and budget-capped.
 *
 * The fields first, then row-major cells in registry-order specs — a fixed
 * spend order, so the caps cut identically on every client, and a cut, should
 * one ever come, falls on the biome scatter and never on a field (below).
 * Normal play always passes the registry.
 */
export function placeProps(
  terrain: TerrainGrid,
  specs: readonly PropSpec[] = ENVIRONMENT_PROPS,
  look: WorldLook = 'standard',
  fields: readonly ResourceNodeInfo[] = [],
  landmarks: readonly PublicLandmark[] = []
): PropPlacement[] {
  return placeAll(terrain, specs, look, fields, landmarks).placements;
}

/**
 * Every placement and every public landmark a terrain stands, through one
 * spend: the fields first, then each landmark in the state its cells give
 * (gate 1, rule 3: one instance from the reservation, after the fields and
 * before the scatter, at its row's triangles for the state drawn), then the
 * scatter, which keeps off the plan of each landmark admitted (rule 4).
 * A landmark the caps refuse is not stood — `landmarks` lists the admitted
 * ones alone — so the layer never draws past the reservation. Normal play
 * never reaches a refusal: the fields and the arch together stand about a
 * twentieth of it.
 */
export function placeAll(
  terrain: TerrainGrid,
  specs: readonly PropSpec[] = ENVIRONMENT_PROPS,
  look: WorldLook = 'standard',
  fields: readonly ResourceNodeInfo[] = [],
  landmarks: readonly PublicLandmark[] = []
): { placements: PropPlacement[]; landmarks: LandmarkStand[] } {
  const placements: PropPlacement[] = [];
  const admitted: LandmarkStand[] = [];
  let trisSpent = 0;
  let instances = 0;
  const admit = (tris: number): boolean => {
    if (instances >= PROP_INSTANCE_CAP) return false;
    if (trisSpent + tris > PROP_TRI_RESERVATION) return false;
    trisSpent += tris;
    instances++;
    return true;
  };
  const spend = (placement: PropPlacement, spec: PropSpec): boolean => {
    if (!admit(spec.triBudget)) return false;
    placements.push(placement);
    return true;
  };
  for (const { placement, spec } of scatterFields(terrain, fields, specs)) {
    if (!spend(placement, spec)) return { placements, landmarks: admitted };
  }
  for (const stand of standLandmarks(terrain, landmarks)) {
    if (admit(stand.spec.triBudget[stand.state])) admitted.push(stand);
  }
  for (const { placement, spec } of scatterProps(terrain, specs, look)) {
    // The scatter makes room (gate 1, rule 4): nothing on open ground whose
    // footprint meets the plan of the state drawn. A prop that stands on rock
    // is not on open ground, so a crag on the wall's top keeps its place
    // (study §7, "Scatter").
    if (
      spec.stands !== 'rock' &&
      admitted.some((stand) => meetsPlan(placement, spec, stand.plan))
    ) {
      continue;
    }
    if (!spend(placement, spec)) break;
  }
  return { placements, landmarks: admitted };
}

// ----------------------------------------------------------- public landmarks

/**
 * A public landmark's registry row — docs/asset-prompts-3d.md Block 4b, and
 * docs/graphics-standards.md gate 1, "Public landmarks". The table of where
 * one stands is the shared `PUBLIC_LANDMARKS` (public map data); this row is
 * what it costs and what it covers, which the client alone needs.
 */
export interface LandmarkSpec {
  slug: string;
  /** Canonical scale: the model's larger horizontal axis, held as a prop's is. */
  footprintM: number;
  /** Draw calls standing: one a material (gate 6's study line). */
  calls: number;
  /**
   * Triangles standing in each state — the count hull-intake reported for
   * the committed model's state groups, spent against the prop reservation.
   * Block 4b caps either at `LANDMARK_TRI_CAP`.
   */
  triBudget: Record<LandmarkState, number>;
  /**
   * Each state's plan in model metres (X along the span, Z toward +Z), the
   * study's §6: what the scatter keeps clear of.
   */
  plan: Record<LandmarkState, { x: readonly [number, number]; z: readonly [number, number] }>;
  /**
   * Where the ruined state's wall meets the floor, model metres along +Z:
   * the study's §6 face foot, which the collapse's cloud rises from.
   */
  faceFootZ: number;
}

/** Block 4b's row: at most 12,000 triangles a state. */
export const LANDMARK_TRI_CAP = 12_000;

/**
 * Block 4b's one row, the Sorrowgate transit arch: 570 m along X, four
 * materials, 2,624 triangles intact and 732 ruined by intake's count, its
 * plans the study's §6 (intact X ±285, Z ±80; ruined X ±285, Z +115 to +150).
 */
export const PUBLIC_LANDMARK_SPECS: readonly LandmarkSpec[] = [
  {
    slug: 'env-ruin-transit-arch',
    footprintM: 570,
    calls: 4,
    triBudget: { intact: 2624, ruined: 732 },
    plan: {
      intact: { x: [-285, 285], z: [-80, 80] },
      ruined: { x: [-285, 285], z: [115, 150] },
    },
    faceFootZ: 125,
  },
];

export function landmarkSpec(slug: string): LandmarkSpec | undefined {
  return PUBLIC_LANDMARK_SPECS.find((spec) => spec.slug === slug);
}

/** A landmark as a terrain stands it: which state, and the plan it covers in map metres. */
export interface LandmarkStand {
  landmark: PublicLandmark;
  spec: LandmarkSpec;
  state: LandmarkState;
  /** The drawn state's plan on the map, metres: `x0..x1` east, `y0..y1` south. */
  plan: { x0: number; x1: number; y0: number; y1: number };
}

/**
 * Every landmark a terrain stands, in the state its own cells give it (gate 1,
 * rule 1): a pure function of the published grid and the shared table, so
 * every client and every layer stands the same thing, and a grid that already
 * holds the collapse stands the ruin from its first frame. A landmark with no
 * registry row stands nothing.
 *
 * The plan is the model's plan turned by the anchor's yaw and boxed: exact at
 * yaw 0, which is the one landmark there is, and the box of the turned
 * rectangle otherwise, so the scatter keeps clear of all of it.
 */
export function standLandmarks(
  terrain: TerrainGrid,
  landmarks: readonly PublicLandmark[],
  specs: readonly LandmarkSpec[] = PUBLIC_LANDMARK_SPECS
): LandmarkStand[] {
  const stands: LandmarkStand[] = [];
  for (const landmark of landmarks) {
    const spec = specs.find((candidate) => candidate.slug === landmark.slug);
    if (spec === undefined) continue;
    const state = landmarkState(landmark, terrain);
    const { x, z } = spec.plan[state];
    const cos = Math.cos(landmark.yawRad);
    const sin = Math.sin(landmark.yawRad);
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const cx of x) {
      for (const cz of z) {
        // Model +X east and +Z south turn about +Y as three.js turns them.
        const px = landmark.anchorXM + cx * cos + cz * sin;
        const py = landmark.anchorYM - cx * sin + cz * cos;
        x0 = Math.min(x0, px);
        x1 = Math.max(x1, px);
        y0 = Math.min(y0, py);
        y1 = Math.max(y1, py);
      }
    }
    stands.push({ landmark, spec, state, plan: { x0, x1, y0, y1 } });
  }
  return stands;
}

/** Whether a placement's footprint circle meets a plan rectangle. */
function meetsPlan(placement: PropPlacement, spec: PropSpec, plan: LandmarkStand['plan']): boolean {
  const radius = (spec.footprintM * placement.scale) / 2;
  const dx = Math.max(plan.x0 - placement.xM, 0, placement.xM - plan.x1);
  const dy = Math.max(plan.y0 - placement.yM, 0, placement.yM - plan.y1);
  return dx * dx + dy * dy < radius * radius;
}

// ------------------------------------------------------------ resource fields

/**
 * A resource field's bed on the ground (#1555) — docs/graphics-standards.md
 * "The environment branch", docs/map-visuals.md §5.
 *
 * Node positions are map data, published once per match and never updated,
 * exactly as the terrain is (`ResourceNodeInfo`), so a field can stand on the seabed the way a vent or
 * a kelp bed does, under the same rules: deterministic from what every client
 * holds, render-only, spent inside the gate-6 reservation. What is *not* map
 * data is depletion — how much a field has left is heard, never shown — and a
 * bed reads nothing the field does not publish: its position, its kind and
 * its starting stock, which also sets its radius on the chart. A field looks
 * the same full and mined out, by construction.
 */

/**
 * What a field stands. A nodule field is beds of the ore itself; the crystal
 * field stands the Resonance Field's own shard, since the field and the biome
 * are one substance and a second model would say otherwise.
 */
export const FIELD_PROP_SLUG: Record<ResourceKind, string> = {
  [ResourceKind.Nodule]: 'env-nodule-bed',
  [ResourceKind.ResonanceCrystal]: 'env-resonance-crystal',
};

/**
 * TUNABLE — what stands in one field: how many, the band of the field's
 * radius they stand in (a share of `fieldRadiusM`, so the ore keeps inside
 * the rim the chart draws) and their scale jitter. Beds enough that a field
 * reads as a patch of ore from the survey dolly rather than a boulder or two
 * (ten, up to 1.45× their 12 m, since the owner asked for more field after
 * #1563's eight at 1.25); shards few, since each is 27 m tall and the field
 * is one place on the map.
 */
export const FIELD_STAND: Record<
  ResourceKind,
  { count: number; band: readonly [number, number]; scale: readonly [number, number] }
> = {
  [ResourceKind.Nodule]: { count: 10, band: [0.1, 0.8], scale: [0.95, 1.45] },
  [ResourceKind.ResonanceCrystal]: { count: 3, band: [0.15, 0.55], scale: [0.7, 1] },
};

/**
 * A field's radius, metres, on the chart and on the ground alike: 60 m, and
 * 40 m more for every starting stock the size of a home field's. Starting
 * stock is published once with the field; nothing that happens to the field
 * afterwards moves it.
 */
export function fieldRadiusM(field: Pick<ResourceNodeInfo, 'initialAmount'>): number {
  return 60 + (field.initialAmount / ECONOMY.NODE_STARTING_AMOUNT) * 40;
}

/**
 * Every field's instances, deterministic from the field's own published
 * values — position, kind, stock — and nothing map-global, so a field
 * stands the same on every client, in every match on the map, and a ground
 * delta elsewhere never moves it. Not its id: that is the match's entity
 * number, which depends on what the server spawned before it, and a bed
 * keyed on it would rearrange from one match to the next. An instance that would land on rock or off the map is skipped: a field
 * seated in a wall is a map bug, and ore drawn inside one would be a second.
 */
export function* scatterFields(
  terrain: TerrainGrid,
  fields: readonly ResourceNodeInfo[],
  specs: readonly PropSpec[] = ENVIRONMENT_PROPS
): Generator<{ placement: PropPlacement; spec: PropSpec }> {
  const { cols, rows, cellM } = terrain;
  for (const field of fields) {
    const slug = FIELD_PROP_SLUG[field.kind];
    const spec = specs.find((candidate) => candidate.slug === slug);
    if (spec === undefined) continue;
    const stand = FIELD_STAND[field.kind];
    const radius = fieldRadiusM(field);
    // The field's identity, as the hash sees it: integers, since propHash
    // reads its words as such.
    const seed = [
      Math.round(field.x),
      Math.round(field.y),
      field.kind,
      Math.round(field.initialAmount),
    ];
    for (let k = 0; k < stand.count; k++) {
      const angle = propHash([...seed, k, 0x1b873593]) * Math.PI * 2;
      const [near, far] = stand.band;
      const r = radius * (near + (far - near) * propHash([...seed, k, 0x85ebca6b]));
      const xM = field.x + Math.cos(angle) * r;
      const yM = field.y + Math.sin(angle) * r;
      const col = Math.floor(xM / cellM);
      const row = Math.floor(yM / cellM);
      if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
      const index = row * cols + col;
      if (terrain.ceiling[index]! > terrain.floor[index]!) continue;
      const [lo, hi] = stand.scale;
      yield {
        placement: {
          slug,
          xM,
          yM,
          yawRad: propHash([...seed, k, 0x27d4eb2d]) * Math.PI * 2,
          scale: lo + (hi - lo) * propHash([...seed, k, 0x9e3779b9]),
          cellIndex: index,
        },
        spec,
      };
    }
  }
}

/**
 * The props a placed region's map ground stands at its baseline, in the map's
 * own metres (docs/world-map.md §7.6): the models a travel loads, and what the
 * region's baseline detail stands (#1488). The scatter reads the map's cells
 * alone, so these are the placements the session's layer stands on the room's
 * first ground, and the join and the return's swap trade like for like.
 */
export function mapProps(
  mapId: string,
  look: WorldLook = 'standard',
  landmarks: readonly PublicLandmark[] = []
): PropPlacement[] {
  return mapPlacements(mapId, look, landmarks).placements;
}

/**
 * `mapProps` and the landmarks it admitted, together: what a region's
 * baseline detail stands (PerspectiveView.ts `loadRegionDetail`).
 */
export function mapPlacements(
  mapId: string,
  look: WorldLook = 'standard',
  landmarks: readonly PublicLandmark[] = []
): { placements: PropPlacement[]; landmarks: LandmarkStand[] } {
  const ground = PLACED_GROUND[mapId];
  if (ground === undefined) return { placements: [], landmarks: [] };
  const cells = paintGround(ground);
  const terrain = {
    cols: cells.cols,
    rows: cells.rows,
    cellM: cells.cellM,
    biomes: Array.from(cells.biomes),
    floor: Array.from(cells.floor),
    ceiling: Array.from(cells.ceiling),
  };
  return placeAll(terrain, ENVIRONMENT_PROPS, look, [], landmarks);
}

/** Unbudgeted candidates, shared with the opt-in view-bounded material study.
 * Consumers must apply both reservations before creating instances. */
export function* scatterProps(
  terrain: TerrainGrid,
  specs: readonly PropSpec[] = ENVIRONMENT_PROPS,
  look: WorldLook = 'standard'
): Generator<{ placement: PropPlacement; spec: PropSpec }> {
  const { cols, rows, cellM } = terrain;
  if (specs.length === 0) return;
  const lookDensity = LOOK_DENSITY[look];

  const isRock = (i: number) => terrain.ceiling[i]! > terrain.floor[i]!;
  const isRoofed = (i: number) => terrain.ceiling[i]! !== 0 && !isRock(i);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      const rock = isRock(index);

      // Neighbour facts, computed once per cell: adjacency for nearRock, and
      // the worst open-to-open floor step for maxSlopeM.
      let hasRockNeighbour = false;
      let worstSlopeM = 0;
      for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
          if ((r === row && c === col) || r < 0 || r >= rows || c < 0 || c >= cols) continue;
          const n = r * cols + c;
          if (isRock(n)) {
            hasRockNeighbour = true;
          } else if (!rock && (r === row || c === col)) {
            worstSlopeM = Math.max(
              worstSlopeM,
              Math.abs(terrain.floor[n]! - terrain.floor[index]!)
            );
          }
        }
      }

      for (let s = 0; s < specs.length; s++) {
        const spec = specs[s]!;
        if (spec.stands === 'rock') {
          if (!rock) continue;
        } else {
          if (rock) continue;
          if (!spec.stands.includes(terrain.biomes[index] as Biome)) continue;
          if (spec.nearRock === 'require' && !hasRockNeighbour) continue;
          if (spec.nearRock === 'exclude' && hasRockNeighbour) continue;
          if (worstSlopeM > spec.maxSlopeM) continue;
        }
        if (spec.excludeRoofed && isRoofed(index)) continue;

        // The cell's identity, as the hash sees it. Includes ceiling so a
        // collapse (rock <-> water) moves this cell's props even when the
        // floor number survives it.
        const cell = [
          col,
          row,
          cols,
          rows,
          terrain.biomes[index]!,
          terrain.floor[index]!,
          terrain.ceiling[index]!,
          s,
        ];
        const density = spec.density * (lookDensity[terrain.biomes[index] as Biome] ?? 1);
        const whole = Math.floor(density);
        const count = whole + (propHash([...cell, 0x1b873593]) < density - whole ? 1 : 0);

        for (let k = 0; k < count; k++) {
          // Inside its own cell, like an ember: a prop that leaned over a
          // boundary would dress ground of a different identity.
          const margin = Math.min(0.45, spec.footprintM / 2 / cellM);
          const fx = margin + (1 - 2 * margin) * propHash([...cell, k, 0x85ebca6b]);
          const fy = margin + (1 - 2 * margin) * propHash([...cell, k, 0xc2b2ae35]);
          const [lo, hi] = spec.scaleJitter;
          yield {
            placement: {
              slug: spec.slug,
              xM: (col + fx) * cellM,
              yM: (row + fy) * cellM,
              yawRad: propHash([...cell, k, 0x27d4eb2d]) * Math.PI * 2,
              scale: lo + (hi - lo) * propHash([...cell, k, 0x9e3779b9]),
              cellIndex: index,
            },
            spec,
          };
        }
      }
    }
  }
}

/** A seated stone, as the bake's scour reads it. World metres. */
export interface StoneSeat {
  xM: number;
  yM: number;
  /** Half its footprint at its own scale. */
  radiusM: number;
  /** Its own cell: the scour never leaves it. */
  cellIndex: number;
  /**
   * Which way the current runs past it, a unit vector, map x east and y
   * south: away from the map's current source (#1573), so its scour trails
   * down-current as the dunes' lee faces do.
   */
  flow: readonly [number, number];
}

/**
 * Every seated stone on the map, from the registry's own scatter, each with
 * the current from `source` (seabedDetail.ts `duneSource`) — the same
 * placements the prop layer stands, since the shipped maps dress without a
 * cut (the backend's environmentBudget test). The scatter runs over the whole
 * registry and is filtered after, because a spec's index is in its hash.
 *
 * Local like the scatter: a stone reads its own cell and the eight around it,
 * so a ground delta moves only the seats a rebake of the touched cells and
 * their ring redraws.
 */
export function stoneSeats(terrain: TerrainGrid, source: readonly [number, number]): StoneSeat[] {
  const seats: StoneSeat[] = [];
  for (const { placement, spec } of scatterProps(terrain)) {
    if ((spec.buryFraction ?? 0) <= 0) continue;
    // The source stands off the map, so no stone sits on it.
    const fx = placement.xM - source[0];
    const fy = placement.yM - source[1];
    const length = Math.hypot(fx, fy);
    seats.push({
      xM: placement.xM,
      yM: placement.yM,
      radiusM: (spec.footprintM * placement.scale) / 2,
      cellIndex: placement.cellIndex,
      flow: [fx / length, fy / length],
    });
  }
  return seats;
}

/**
 * How much of a prop's sway a vertex at `yM` takes, for a prop `heightM`
 * tall: zero at the holdfast, all of it at the tip, quadratic between so the
 * base stays rooted and the column bends rather than leans (kelp sway,
 * epic #308 PR-3). Pure, so the shader's weight attribute is testable here.
 */
export function swayWeight(yM: number, heightM: number): number {
  if (heightM <= 0) return 0;
  const t = Math.min(1, Math.max(0, yM / heightM));
  return t * t;
}
