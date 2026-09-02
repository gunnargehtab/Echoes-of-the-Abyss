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

import { Biome } from '@echoes/shared';

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
   * exactly as hulls are held to HULL_LENGTH_M (`--footprint-m` at intake). */
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
   * 'none' means intake fails the model if it carries any emissive. */
  worldLight: 'none' | 'vent' | 'flora' | 'crystal';
  /** Current sway, metres of lateral displacement at the prop's top (0 for
   * everything that is stone). Vertex-only: the instance matrix never moves,
   * so placement, the probe and the budget are untouched by it. */
  swayM: number;
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
  },
  {
    slug: 'env-vent-basalt',
    footprintM: 15,
    triBudget: 270,
    density: 0.2,
    stands: [Biome.ThermalVein],
    nearRock: 'any',
    maxSlopeM: Number.POSITIVE_INFINITY,
    excludeRoofed: false,
    scaleJitter: [0.7, 1.3],
    worldLight: 'none',
    swayM: 0,
  },
  // Kelp Forest — the forty-metre columns, and living coral stone between them.
  {
    slug: 'env-kelp-cluster',
    footprintM: 18,
    triBudget: 388,
    density: 0.45,
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
    density: 0.06,
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
    density: 0.14,
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
    density: 0.18,
    stands: [Biome.AbyssalTrench],
    nearRock: 'any',
    maxSlopeM: Number.POSITIVE_INFINITY,
    excludeRoofed: false,
    scaleJitter: [0.7, 1.3],
    worldLight: 'none',
    swayM: 0,
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
    density: 0.06,
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
    triBudget: 544,
    density: 0.02,
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
    triBudget: 184,
    density: 0.1,
    stands: [Biome.CoralRuins, Biome.KelpForest],
    nearRock: 'any',
    maxSlopeM: Number.POSITIVE_INFINITY,
    excludeRoofed: false,
    scaleJitter: [0.7, 1.3],
    worldLight: 'none',
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
  },
];

/** Gate-6 reservation, both halves (docs/graphics-standards.md): instancing
 * keeps draw calls flat per slug×material, so the caps that need enforcing
 * are bodies and triangles. `placeProps` spends against both and stops. */
export const PROP_INSTANCE_CAP = 600;
export const PROP_TRI_RESERVATION = 80_000;

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
function hash01(values: readonly number[]): number {
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
 * Row-major cells, registry-order specs — a fixed spend order, so the caps
 * cut identically on every client. `specs` is injectable for tests only; the
 * renderer always passes the registry.
 */
export function placeProps(
  terrain: TerrainGrid,
  specs: readonly PropSpec[] = ENVIRONMENT_PROPS
): PropPlacement[] {
  const { cols, rows, cellM } = terrain;
  const placements: PropPlacement[] = [];
  if (specs.length === 0) return placements;

  const isRock = (i: number) => terrain.ceiling[i]! > terrain.floor[i]!;
  const isRoofed = (i: number) => terrain.ceiling[i]! !== 0 && !isRock(i);

  let trisSpent = 0;
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
        const whole = Math.floor(spec.density);
        const count = whole + (hash01([...cell, 0x1b873593]) < spec.density - whole ? 1 : 0);

        for (let k = 0; k < count; k++) {
          if (placements.length >= PROP_INSTANCE_CAP) return placements;
          if (trisSpent + spec.triBudget > PROP_TRI_RESERVATION) return placements;
          trisSpent += spec.triBudget;
          // Inside its own cell, like an ember: a prop that leaned over a
          // boundary would dress ground of a different identity.
          const margin = Math.min(0.45, spec.footprintM / 2 / cellM);
          const fx = margin + (1 - 2 * margin) * hash01([...cell, k, 0x85ebca6b]);
          const fy = margin + (1 - 2 * margin) * hash01([...cell, k, 0xc2b2ae35]);
          const [lo, hi] = spec.scaleJitter;
          placements.push({
            slug: spec.slug,
            xM: (col + fx) * cellM,
            yM: (row + fy) * cellM,
            yawRad: hash01([...cell, k, 0x27d4eb2d]) * Math.PI * 2,
            scale: lo + (hi - lo) * hash01([...cell, k, 0x9e3779b9]),
            cellIndex: index,
          });
        }
      }
    }
  }
  return placements;
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
