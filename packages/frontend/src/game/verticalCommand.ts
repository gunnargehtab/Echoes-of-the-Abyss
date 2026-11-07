/**
 * The free-water study's vertical command instruments (#1753):
 * docs/free-water-slice.md §9, "Vertical command". A three-dimensional order
 * is two two-dimensional readings. The north-up scope picks a plan position;
 * the section scope picks a depth; in the world, a foot ring marks each
 * hull's place on one command plane, with no line to the hull (#1772); and an
 * earned contact off the frame marks the screen edge with where it stands
 * against that plane.
 *
 * Everything here is arithmetic on what the client already holds: own state,
 * the public terrain, and contacts the server resolved for this player. A
 * Tier 2 contact carries no depth (`Contact`, packages/shared/src/types.ts)
 * and gets none inferred: it has no foot ring, a tick down the whole public
 * water column on the section, and a bearing alone at the edge.
 */
import { DEPTH, ResolutionTier } from '@echoes/shared';
import type { TerrainPayload } from '../net/GameClient.ts';

/**
 * The command plane, metres: the lead selected hull's depth, which MOVE 3D
 * arms with too (§6); with nothing selected, a raised focus's depth; with the
 * focus on the seabed, no plane at all (docs/free-camera.md §4: a seabed focus
 * makes no plane), so no foot rings and no ABOVE or BELOW.
 */
export function commandPlaneM(
  leadDepthM: number | undefined,
  raisedFocusDepthM: number | null
): number | null {
  if (leadDepthM !== undefined) return leadDepthM;
  return raisedFocusDepthM;
}

/** A screen rectangle, HUD px. */
export interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Where a point past the frame marks its edge: the frame's centre line toward
 * the point, cut at `inset` px inside the rectangle, and the angle it points
 * out at (0 is right, clockwise on screen). Null for a point inside the inset
 * rectangle, which needs no mark, and for a point on the centre itself. The
 * caller has already dropped anything behind the eye: a projection of a point
 * behind the camera lands mirrored, and mirroring is the lie this refuses.
 */
export function edgeMark(
  rect: ScreenRect,
  inset: number,
  px: number,
  py: number
): { x: number; y: number; angle: number } | null {
  const left = rect.x + inset;
  const top = rect.y + inset;
  const right = rect.x + rect.w - inset;
  const bottom = rect.y + rect.h - inset;
  if (px >= left && px <= right && py >= top && py <= bottom) return null;
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const dx = px - cx;
  const dy = py - cy;
  if (dx === 0 && dy === 0) return null;
  // Liang–Barsky's exit, from the centre outward.
  let t = Infinity;
  if (dx > 0) t = Math.min(t, (right - cx) / dx);
  else if (dx < 0) t = Math.min(t, (left - cx) / dx);
  if (dy > 0) t = Math.min(t, (bottom - cy) / dy);
  else if (dy < 0) t = Math.min(t, (top - cy) / dy);
  return { x: cx + dx * t, y: cy + dy * t, angle: Math.atan2(dy, dx) };
}

/**
 * What an edge mark says. §9: a Tier 3+ contact says ABOVE or BELOW with its
 * metres to the plane; with no plane it gives the depth it already carries,
 * rather than falling back to bearing only. A Tier 2 contact marks its
 * bearing only, so `text` is empty. A Tier 1 report carries the listener's
 * own position and marks nothing.
 */
export function edgeMarkText(
  tier: ResolutionTier,
  depthM: number | undefined,
  planeM: number | null
): { mark: boolean; text: string } {
  if (tier < ResolutionTier.Bearing) return { mark: false, text: '' };
  if (tier < ResolutionTier.Classification || depthM === undefined) return { mark: true, text: '' };
  if (planeM === null) return { mark: true, text: `${metres(depthM)}` };
  const delta = depthM - planeM;
  if (Math.abs(delta) <= DEPTH.ARRIVAL_EPSILON_M) return { mark: true, text: 'LEVEL' };
  return { mark: true, text: `${delta < 0 ? 'ABOVE' : 'BELOW'} ${metres(Math.abs(delta))}` };
}

function metres(m: number): string {
  return `${Math.round(m).toLocaleString('en-US')} m`;
}

/**
 * The section scope's frame: a vertical slice along the camera's horizontal
 * heading through the command focus, `spanM` wide in plan and the whole
 * column deep, drawn `size` px square with forward to the right.
 */
export interface SectionFrame {
  focusX: number;
  focusY: number;
  /** The orbit's yaw: at 0 the eye is south of the focus, looking north. */
  headingRad: number;
  spanM: number;
  size: number;
}

/** Forward along the heading, as a unit plan vector. */
export function sectionForward(headingRad: number): { x: number; y: number } {
  return { x: -Math.sin(headingRad), y: -Math.cos(headingRad) };
}

/** A plan point's signed distance along the slice, metres, forward positive. */
export function sectionAlongM(frame: SectionFrame, x: number, y: number): number {
  const f = sectionForward(frame.headingRad);
  return (x - frame.focusX) * f.x + (y - frame.focusY) * f.y;
}

/** The scope x of a distance along the slice, px, or null past either end. */
export function sectionX(frame: SectionFrame, alongM: number): number | null {
  const t = alongM / frame.spanM + 0.5;
  if (t < 0 || t > 1) return null;
  return t * frame.size;
}

/** The scope y of a depth: the surface at the top, `DEPTH.MAX_M` at the foot. */
export function sectionY(size: number, depthM: number): number {
  return (Math.max(0, Math.min(DEPTH.MAX_M, depthM)) / DEPTH.MAX_M) * size;
}

/** The depth a scope y picks, whole metres inside the column. */
export function sectionDepthAt(size: number, py: number): number {
  return Math.round(Math.max(0, Math.min(1, py / size)) * DEPTH.MAX_M);
}

/** One column of the slice's ground: the public floor and roof there. */
export interface SectionColumn {
  floorM: number;
  ceilingM: number;
  /** A solid cell: rock the whole column, as the scope draws it. */
  rock: boolean;
}

/**
 * The public floor and roof profile along the slice, one entry per scope
 * pixel column, null where the slice leaves the map. Read off the terrain
 * payload's cells rather than the drawn relief: the section is a chart, and
 * its ground is the authored floor survey ink already traces (§9, "Crater
 * walls": the override adds nothing at a cell centre, and the ink keeps the
 * authored floor).
 */
export function sectionProfile(
  terrain: TerrainPayload,
  frame: SectionFrame
): Array<SectionColumn | null> {
  const columns = Math.max(1, Math.round(frame.size));
  const f = sectionForward(frame.headingRad);
  const width = terrain.cols * terrain.cellM;
  const height = terrain.rows * terrain.cellM;
  const out: Array<SectionColumn | null> = new Array(columns);
  for (let i = 0; i < columns; i++) {
    const alongM = ((i + 0.5) / columns - 0.5) * frame.spanM;
    const x = frame.focusX + f.x * alongM;
    const y = frame.focusY + f.y * alongM;
    if (x < 0 || y < 0 || x >= width || y >= height) {
      out[i] = null;
      continue;
    }
    const cell = Math.floor(y / terrain.cellM) * terrain.cols + Math.floor(x / terrain.cellM);
    const floorM = terrain.floor[cell]!;
    const ceilingM = terrain.ceiling[cell]!;
    out[i] = { floorM, ceilingM, rock: ceilingM >= floorM };
  }
  return out;
}

/** The public water interval under a plan point, or null off the map or in rock. */
export function waterIntervalAt(
  terrain: TerrainPayload,
  x: number,
  y: number
): { ceilingM: number; floorM: number } | null {
  if (x < 0 || y < 0 || x >= terrain.cols * terrain.cellM || y >= terrain.rows * terrain.cellM) {
    return null;
  }
  const cell = Math.floor(y / terrain.cellM) * terrain.cols + Math.floor(x / terrain.cellM);
  const ceilingM = Math.max(DEPTH.MIN_M, terrain.ceiling[cell]!);
  const floorM = Math.min(DEPTH.MAX_M, terrain.floor[cell]!);
  return ceilingM >= floorM ? null : { ceilingM, floorM };
}
