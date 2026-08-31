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
import type { TerrainPayload } from '../net/GameClient.ts';

export interface PropSpec {
  /** `env-<biome-word>-<thing>` — resolves `<slug>.glb` in the models dir. */
  slug: string;
  /** Canonical scale: the model's larger footprint axis is held to this,
   * exactly as hulls are held to HULL_LENGTH_M (`--footprint-m` at intake). */
  footprintM: number;
  /** Per-instance triangle cap, checked against the intake report and spent
   * against the gate-6 reservation below. */
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
}

/**
 * The registry. Empty on purpose: this module ships ahead of its assets, and
 * each env-assets PR (epic #308, PR-2c…) adds rows beside the `env-*.glb` it
 * commits. The contract rows live in docs/asset-prompts-3d.md Block 4.
 */
export const ENVIRONMENT_PROPS: readonly PropSpec[] = [];

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
  terrain: Pick<TerrainPayload, 'cols' | 'rows' | 'cellM' | 'biomes' | 'floor' | 'ceiling'>,
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
