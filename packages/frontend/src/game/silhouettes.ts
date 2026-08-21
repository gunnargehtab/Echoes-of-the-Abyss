/**
 * Procedural hull and structure silhouettes. Own units now render as baked,
 * lit sprites (see hullTextures.ts), but this module remains load-bearing in
 * two places, both mandated by the Asymmetric Fidelity Law:
 *   - detail: false — a Tier-4 TRACK of an enemy: the resolved outline alone,
 *     flat, in whatever colour the tier styling dictates. A track earns the
 *     shape, never the livery — and NEVER the textured sprite.
 *   - detail: true  — the fallback for the player's own force while the hull
 *     art is still decoding: body + faction accent marks in the faction's
 *     shape language.
 *
 * HULL_OUTLINE is also the geometric source of truth for the sprite baker, so
 * the fallback, the track, and the textured sprite all share one hull shape.
 */

import type { Graphics } from 'pixi.js';
import { Faction, StructureKind, UnitKind } from '@echoes/shared';

export interface SilhouetteStyle {
  color: number;
  /** Accent marks colour; unused when detail is false. */
  accent: number;
  alpha: number;
  /** Own force renders accents; a track renders the outline alone. */
  detail: boolean;
}

/** Hull length overall in metres, per kind. TUNABLE for readability. */
export const HULL_LENGTH_M: Record<UnitKind, number> = {
  [UnitKind.LightScout]: 60,
  [UnitKind.Corvette]: 80,
  [UnitKind.Cruiser]: 130,
  [UnitKind.AbyssalSubmersible]: 95,
  [UnitKind.Harvester]: 75,
};

/**
 * Hull outlines in unit space: length 1 along +X (bow at +0.5), beam on Y.
 * Silhouette-first, per docs/art-direction.md: each kind must read at a
 * glance from shape alone.
 */
export const HULL_OUTLINE: Record<UnitKind, number[][]> = {
  // A dart: all bow, no belly. The scout is speed wearing a hull.
  [UnitKind.LightScout]: [
    [0.5, 0],
    [-0.3, 0.26],
    [-0.14, 0],
    [-0.3, -0.26],
  ],
  // A skirmisher's wedge: fine entry, workmanlike stern.
  [UnitKind.Corvette]: [
    [0.5, 0],
    [0.12, 0.2],
    [-0.38, 0.16],
    [-0.5, 0],
    [-0.38, -0.16],
    [0.12, -0.2],
  ],
  // The fleet anchor: long, heavy amidships, blunt everywhere.
  [UnitKind.Cruiser]: [
    [0.5, 0.06],
    [0.34, 0.17],
    [-0.2, 0.21],
    [-0.48, 0.13],
    [-0.48, -0.13],
    [-0.2, -0.21],
    [0.34, -0.17],
    [0.5, -0.06],
  ],
  // A deep hull: teardrop body, the classic pressure shape.
  [UnitKind.AbyssalSubmersible]: [
    [0.5, 0],
    [0.28, 0.19],
    [-0.1, 0.22],
    [-0.42, 0.14],
    [-0.5, 0],
    [-0.42, -0.14],
    [-0.1, -0.22],
    [0.28, -0.19],
  ],
  // A barge with a mouth: wide scoop bow, box body. Built to carry, not fight.
  [UnitKind.Harvester]: [
    [0.5, 0.28],
    [0.28, 0.16],
    [-0.42, 0.22],
    [-0.5, 0],
    [-0.42, -0.22],
    [0.28, -0.16],
    [0.5, -0.28],
    [0.38, 0],
  ],
};

/** Rotate + scale + translate an outline into world coordinates, flattened. */
function placeOutline(
  outline: number[][],
  x: number,
  y: number,
  heading: number,
  length: number
): number[] {
  const cos = Math.cos(heading);
  const sin = Math.sin(heading);
  const out: number[] = [];
  for (const [px, py] of outline) {
    const sx = px! * length;
    const sy = py! * length;
    out.push(x + sx * cos - sy * sin, y + sx * sin + sy * cos);
  }
  return out;
}

/** A point on the hull's centreline (t: -0.5 stern .. +0.5 bow), world space. */
function alongHull(
  x: number,
  y: number,
  heading: number,
  length: number,
  t: number
): { x: number; y: number } {
  return { x: x + Math.cos(heading) * length * t, y: y + Math.sin(heading) * length * t };
}

export function drawUnitSilhouette(
  g: Graphics,
  kind: UnitKind,
  faction: Faction,
  x: number,
  y: number,
  heading: number,
  style: SilhouetteStyle,
  strokeWidth: number
): void {
  const length = HULL_LENGTH_M[kind];
  g.poly(placeOutline(HULL_OUTLINE[kind], x, y, heading, length)).fill({
    color: style.color,
    alpha: style.alpha,
  });
  g.poly(placeOutline(HULL_OUTLINE[kind], x, y, heading, length)).stroke({
    width: strokeWidth,
    color: style.accent,
    alpha: style.alpha,
  });

  if (!style.detail) return;

  // Faction accent marks, from the shape-language table in docs/art-direction.md.
  switch (faction) {
    case Faction.Bathyarch: {
      // Rivets down the spine: over-engineered, visibly assembled.
      for (const t of [-0.25, 0, 0.25]) {
        const p = alongHull(x, y, heading, length, t);
        g.circle(p.x, p.y, length * 0.04).fill({ color: style.accent, alpha: style.alpha });
      }
      break;
    }
    case Faction.Pelagia: {
      // A bioluminescent wake pulse at the stern.
      const p = alongHull(x, y, heading, length, -0.38);
      g.circle(p.x, p.y, length * 0.12).fill({ color: style.accent, alpha: style.alpha * 0.45 });
      break;
    }
    case Faction.Directorate: {
      // Dorsal spines: chitinous, segmented, many-limbed.
      for (const t of [-0.2, 0.05, 0.3]) {
        const base = alongHull(x, y, heading, length, t);
        const side = heading - Math.PI / 2;
        const tipLength = length * 0.16;
        g.poly([
          base.x + Math.cos(heading) * length * 0.05,
          base.y + Math.sin(heading) * length * 0.05,
          base.x + Math.cos(side) * tipLength,
          base.y + Math.sin(side) * tipLength,
          base.x - Math.cos(heading) * length * 0.05,
          base.y - Math.sin(heading) * length * 0.05,
        ]).fill({ color: style.accent, alpha: style.alpha * 0.8 });
      }
      break;
    }
    case Faction.Hadron: {
      // One blade line, bow to stern: the only true bilateral symmetry.
      const bow = alongHull(x, y, heading, length, 0.5);
      const stern = alongHull(x, y, heading, length, -0.45);
      g.moveTo(stern.x, stern.y)
        .lineTo(bow.x, bow.y)
        .stroke({ width: strokeWidth * 1.5, color: style.accent, alpha: style.alpha });
      break;
    }
  }
}

export function drawStructureSilhouette(
  g: Graphics,
  kind: StructureKind,
  x: number,
  y: number,
  radiusM: number,
  style: SilhouetteStyle,
  strokeWidth: number
): void {
  const body = { color: style.color, alpha: style.alpha * (style.detail ? 0.55 : 0.9) };
  const edge = {
    width: strokeWidth,
    color: style.accent,
    alpha: style.alpha,
  };

  switch (kind) {
    case StructureKind.Bastion: {
      // Pressure dome on an octagonal foundation: the settlement itself.
      const points: number[] = [];
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
        points.push(x + Math.cos(angle) * radiusM, y + Math.sin(angle) * radiusM);
      }
      g.poly(points).fill(body);
      g.poly(points).stroke(edge);
      if (style.detail) {
        g.circle(x, y, radiusM * 0.5).fill({ color: style.color, alpha: style.alpha * 0.9 });
        g.circle(x, y, radiusM * 0.5).stroke(edge);
        g.circle(x, y, radiusM * 0.18).fill({ color: style.accent, alpha: style.alpha });
      }
      break;
    }
    case StructureKind.Refinery: {
      // A processing block with a rank of pressure silos: audibly industrial.
      const w = radiusM * 1.7;
      const h = radiusM * 1.15;
      g.rect(x - w / 2, y - h / 2, w, h).fill(body);
      g.rect(x - w / 2, y - h / 2, w, h).stroke(edge);
      if (style.detail) {
        for (const t of [-0.3, 0, 0.3]) {
          g.circle(x + w * t, y - h * 0.18, radiusM * 0.26).fill({
            color: style.color,
            alpha: style.alpha,
          });
          g.circle(x + w * t, y - h * 0.18, radiusM * 0.26).stroke(edge);
        }
        g.rect(x - w * 0.4, y + h * 0.14, w * 0.8, h * 0.16).fill({
          color: style.accent,
          alpha: style.alpha * 0.5,
        });
      }
      break;
    }
    case StructureKind.Foundry: {
      // Assembly hall with an open launch bay cut into the floor.
      const w = radiusM * 1.8;
      const h = radiusM * 1.25;
      g.rect(x - w / 2, y - h / 2, w, h).fill(body);
      g.rect(x - w / 2, y - h / 2, w, h).stroke(edge);
      if (style.detail) {
        g.rect(x - w * 0.28, y - h * 0.22, w * 0.56, h * 0.44).fill({
          color: 0x000000,
          alpha: style.alpha * 0.55,
        });
        g.rect(x - w * 0.28, y - h * 0.22, w * 0.56, h * 0.44).stroke(edge);
      }
      break;
    }
    case StructureKind.SentinelTurret: {
      // A mount and a barrel. Near-silent until the barrel matters.
      g.circle(x, y, radiusM).fill(body);
      g.circle(x, y, radiusM).stroke(edge);
      if (style.detail) {
        // Fixed 45° watch angle until turrets track targets client-side.
        const angle = Math.PI / 4;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const halfWidth = radiusM * 0.16;
        const barrelLength = radiusM * 1.7;
        g.poly([
          x - sin * halfWidth,
          y + cos * halfWidth,
          x + cos * barrelLength - sin * halfWidth,
          y + sin * barrelLength + cos * halfWidth,
          x + cos * barrelLength + sin * halfWidth,
          y + sin * barrelLength - cos * halfWidth,
          x + sin * halfWidth,
          y - cos * halfWidth,
        ]).fill({ color: style.color, alpha: style.alpha });
        g.circle(x, y, radiusM * 0.45).fill({ color: style.accent, alpha: style.alpha * 0.8 });
      }
      break;
    }
  }
}
