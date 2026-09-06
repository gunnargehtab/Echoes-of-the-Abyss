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
import { Faction, StructureKind, UnitKind, statsFor } from '@echoes/shared';

export interface SilhouetteStyle {
  color: number;
  /** Accent marks colour; unused when detail is false. */
  accent: number;
  alpha: number;
  /** Own force renders accents; a track renders the outline alone. */
  detail: boolean;
}

/** Hull length overall in metres, per kind. TUNABLE for readability. */
/**
 * Hull lengths, read from the shared roster rather than restated here.
 *
 * They used to live in this file, which meant the renderer and the simulation
 * each held their own idea of how big a hull is — and the simulation started
 * needing one when hulls stopped being allowed to overlap.
 */
export const HULL_LENGTH_M: Record<UnitKind, number> = {
  [UnitKind.LightScout]: statsFor(UnitKind.LightScout).hullLengthM,
  [UnitKind.Corvette]: statsFor(UnitKind.Corvette).hullLengthM,
  [UnitKind.Cruiser]: statsFor(UnitKind.Cruiser).hullLengthM,
  [UnitKind.AbyssalSubmersible]: statsFor(UnitKind.AbyssalSubmersible).hullLengthM,
  [UnitKind.Chorister]: statsFor(UnitKind.Chorister).hullLengthM,
  [UnitKind.Clarion]: statsFor(UnitKind.Clarion).hullLengthM,
  [UnitKind.Harvester]: statsFor(UnitKind.Harvester).hullLengthM,
  [UnitKind.Tender]: statsFor(UnitKind.Tender).hullLengthM,
  [UnitKind.Bulwark]: statsFor(UnitKind.Bulwark).hullLengthM,
  [UnitKind.Spinner]: statsFor(UnitKind.Spinner).hullLengthM,
  [UnitKind.Sower]: statsFor(UnitKind.Sower).hullLengthM,
  [UnitKind.Precentor]: statsFor(UnitKind.Precentor).hullLengthM,
  [UnitKind.Dredge]: statsFor(UnitKind.Dredge).hullLengthM,
  [UnitKind.Cantus]: statsFor(UnitKind.Cantus).hullLengthM,
  [UnitKind.Reciter]: statsFor(UnitKind.Reciter).hullLengthM,
  [UnitKind.Freighter]: statsFor(UnitKind.Freighter).hullLengthM,
  [UnitKind.Drifter]: statsFor(UnitKind.Drifter).hullLengthM,
  [UnitKind.Verger]: statsFor(UnitKind.Verger).hullLengthM,
  [UnitKind.Antiphon]: statsFor(UnitKind.Antiphon).hullLengthM,
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
  // A grown hull: segmented flanks, a crustacean's plates rather than a
  // pressure hull's curve. Reads apart from the Submersible's teardrop at a
  // glance, which is the whole job of an outline (art-direction.md).
  [UnitKind.Chorister]: [
    [0.5, 0],
    [0.3, 0.17],
    [0.18, 0.11],
    [0.0, 0.19],
    [-0.14, 0.12],
    [-0.32, 0.17],
    [-0.5, 0.05],
    [-0.5, -0.05],
    [-0.32, -0.17],
    [-0.14, -0.12],
    [0.0, -0.19],
    [0.18, -0.11],
    [0.3, -0.17],
  ],
  // The cone, drawn: a long forward spine flaring into a narrow bow array,
  // and a hull that falls away sharply behind it. The shape is the doctrine —
  // everything is in front, and there is almost nothing astern to hear
  // (systems-echo.md §8). Reads apart from the Corvette's wedge by being
  // longer, finer and asymmetric fore-and-aft.
  [UnitKind.Clarion]: [
    [0.5, 0.04],
    [0.42, 0.11],
    [0.1, 0.15],
    [-0.16, 0.2],
    [-0.36, 0.12],
    [-0.5, 0.06],
    [-0.5, -0.06],
    [-0.36, -0.12],
    [-0.16, -0.2],
    [0.1, -0.15],
    [0.42, -0.11],
    [0.5, -0.04],
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

  // --- The rung's roster (#461). Silhouette-first, as above: each must read
  // apart from the seven it is built beside, and from its own navy's other
  // hull, from shape alone.

  // A workshop: a box hull with a notched stern where the gantry reaches out
  // over the hull it is welding. Squarer than the Harvester, no mouth.
  [UnitKind.Tender]: [
    [0.5, 0.14],
    [0.3, 0.24],
    [-0.3, 0.24],
    [-0.5, 0.12],
    [-0.38, 0],
    [-0.5, -0.12],
    [-0.3, -0.24],
    [0.3, -0.24],
    [0.5, -0.14],
  ],
  // The heavy: a slab. Blunt bow, blunt stern, and the widest beam in the
  // roster — a wall that moves, and the Cruiser's outline stretched until it
  // stops looking like a Cruiser.
  [UnitKind.Bulwark]: [
    [0.5, 0.16],
    [0.36, 0.26],
    [-0.36, 0.26],
    [-0.5, 0.16],
    [-0.5, -0.16],
    [-0.36, -0.26],
    [0.36, -0.26],
    [0.5, -0.16],
  ],
  // The mine-layer: a spindle with a swollen waist — the magazine it carries —
  // and a fine bow either end. Reads as a seed pod, which is what it is.
  [UnitKind.Spinner]: [
    [0.5, 0],
    [0.2, 0.18],
    [0.0, 0.24],
    [-0.2, 0.18],
    [-0.5, 0],
    [-0.2, -0.18],
    [0.0, -0.24],
    [0.2, -0.18],
  ],
  // The terraformer: a broad flat bloom-bed forward and a narrow stem aft, a
  // leaf rather than a hull. Nothing else in the roster is wider at the bow
  // than at the waist.
  [UnitKind.Sower]: [
    [0.5, 0.1],
    [0.34, 0.28],
    [0.02, 0.24],
    [-0.2, 0.1],
    [-0.5, 0.06],
    [-0.5, -0.06],
    [-0.2, -0.1],
    [0.02, -0.24],
    [0.34, -0.28],
    [0.5, -0.1],
  ],
  // The ears: a short grown hull carrying a wide array athwartships, so the
  // outline is a cross — the one hull that is broader than it is long in the
  // middle. It is only ears, and the shape says so.
  [UnitKind.Precentor]: [
    [0.5, 0],
    [0.18, 0.12],
    [0.08, 0.3],
    [-0.08, 0.3],
    [-0.18, 0.12],
    [-0.5, 0],
    [-0.18, -0.12],
    [-0.08, -0.3],
    [0.08, -0.3],
    [0.18, -0.12],
  ],
  // The floor hull: a segmented deep body like the Chorister's, but heavy —
  // wide plates, a scoop bow. The Submersible's teardrop with the
  // Directorate's armour grown over it.
  [UnitKind.Dredge]: [
    [0.5, 0.1],
    [0.34, 0.22],
    [0.1, 0.18],
    [-0.1, 0.24],
    [-0.36, 0.18],
    [-0.5, 0.06],
    [-0.5, -0.06],
    [-0.36, -0.18],
    [-0.1, -0.24],
    [0.1, -0.18],
    [0.34, -0.22],
    [0.5, -0.1],
  ],
  // The node on a hull: a lozenge with a diamond amidships — the Spire's own
  // top-down mark carried by a hull, so a singing Cantus reads as the thing
  // it is doing the Spire's job.
  [UnitKind.Cantus]: [
    [0.5, 0],
    [0.3, 0.14],
    [0.12, 0.14],
    [0.0, 0.26],
    [-0.12, 0.14],
    [-0.3, 0.14],
    [-0.5, 0],
    [-0.3, -0.14],
    [-0.12, -0.14],
    [0.0, -0.26],
    [0.12, -0.14],
    [0.3, -0.14],
  ],
  // The lance: the Clarion's forward spine drawn out further still, with
  // almost no beam anywhere — a needle with a bow array. Longer and finer
  // than the Clarion, which is the whole difference between the two.
  [UnitKind.Reciter]: [
    [0.5, 0.03],
    [0.44, 0.09],
    [0.14, 0.1],
    [-0.1, 0.15],
    [-0.4, 0.09],
    [-0.5, 0.04],
    [-0.5, -0.04],
    [-0.4, -0.09],
    [-0.1, -0.15],
    [0.14, -0.1],
    [0.44, -0.09],
    [0.5, -0.03],
  ],

  // --- The transports (#501). A hold with a drive: what each silhouette has
  // to say at RTS distance is *volume*, sized to the berths it carries, and
  // each in its navy's register — the Consortium's slab, the Commune's pod,
  // the Directorate's pressure hull, the Order's blade.

  // A long slab-sided box, near-parallel flanks the whole length, a bluff
  // bow and a heavy squared stern: the fattest outline in the roster, and
  // the only one with no taper worth the name.
  [UnitKind.Freighter]: [
    [0.5, 0.16],
    [0.42, 0.24],
    [-0.4, 0.24],
    [-0.5, 0.2],
    [-0.5, -0.2],
    [-0.4, -0.24],
    [0.42, -0.24],
    [0.5, -0.16],
  ],
  // A seed pod: a slim lens with the two bays as a swelling amidships and a
  // single fin astern. Narrower than the Light Scout at the ends, wider at
  // the middle.
  [UnitKind.Drifter]: [
    [0.5, 0.02],
    [0.2, 0.12],
    [-0.1, 0.13],
    [-0.4, 0.06],
    [-0.5, 0.03],
    [-0.5, -0.03],
    [-0.4, -0.06],
    [-0.1, -0.13],
    [0.2, -0.12],
    [0.5, -0.02],
  ],
  // A pressure hull: a rounded, ribbed capsule with a listening dome forward
  // and a heavy keel — the Precentor's family, twice the beam, with the four
  // bays reading as a belly.
  [UnitKind.Verger]: [
    [0.5, 0.08],
    [0.38, 0.18],
    [0.1, 0.22],
    [-0.3, 0.22],
    [-0.46, 0.14],
    [-0.5, 0.06],
    [-0.5, -0.06],
    [-0.46, -0.14],
    [-0.3, -0.22],
    [0.1, -0.22],
    [0.38, -0.18],
    [0.5, -0.08],
  ],
  // The Clarion's blade with a landing deck let into its back: the faceted
  // bow, then the beam opening wide amidships for the three bays, and swept
  // guard wings aft.
  [UnitKind.Antiphon]: [
    [0.5, 0.03],
    [0.36, 0.1],
    [0.1, 0.2],
    [-0.2, 0.2],
    [-0.42, 0.14],
    [-0.5, 0.05],
    [-0.5, -0.05],
    [-0.42, -0.14],
    [-0.2, -0.2],
    [0.1, -0.2],
    [0.36, -0.1],
    [0.5, -0.03],
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

/**
 * The faction glyph — docs/ui-ux.md §11: faction colour is never the only
 * identifier, so a mark that earns a faction earns a shape beside the ink.
 * One glyph per navy, in the same shape language as the hull accents above
 * (docs/factions.md, "Visual identity"); the geometry never varies with the
 * colour-vision palette, because shape is what survives one.
 *
 * Drawn at Tier 3, where faction is first earned and the mark is otherwise a
 * dot in a colour. At Tier 4 no glyph is needed: the resolved silhouette is
 * the glyph.
 */
export function drawFactionGlyph(
  g: Graphics,
  faction: Faction,
  x: number,
  y: number,
  size: number,
  color: number,
  alpha: number,
  strokeWidth: number
): void {
  switch (faction) {
    case Faction.Bathyarch: {
      // A plate: rectangles and cylinders, visibly assembled.
      g.rect(x - size, y - size * 0.6, size * 2, size * 1.2).stroke({
        width: strokeWidth,
        color,
        alpha,
      });
      break;
    }
    case Faction.Pelagia: {
      // A leaf: two arcs meeting at their points.
      g.moveTo(x - size, y)
        .quadraticCurveTo(x, y - size * 0.9, x + size, y)
        .quadraticCurveTo(x, y + size * 0.9, x - size, y)
        .stroke({ width: strokeWidth, color, alpha });
      break;
    }
    case Faction.Directorate: {
      // Segments: three chevrons, stacked like plates of chitin.
      for (const row of [-1, 0, 1]) {
        const cy = y + row * size * 0.55;
        g.moveTo(x - size * 0.8, cy + size * 0.3)
          .lineTo(x, cy - size * 0.25)
          .lineTo(x + size * 0.8, cy + size * 0.3)
          .stroke({ width: strokeWidth, color, alpha });
      }
      break;
    }
    case Faction.Hadron: {
      // A blade, point down: an instrument before it is a weapon.
      g.poly([x, y - size * 1.1, x + size * 0.45, y, x, y + size * 1.1, x - size * 0.45, y]).stroke(
        { width: strokeWidth, color, alpha }
      );
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
    case StructureKind.Slipway: {
      // The second yard: a longer hall than the Foundry's, with the slip
      // itself cut through the whole length — a channel open at the bow end,
      // where the Foundry's bay is a pit. The hulls it launches are the
      // roster's heaviest, and the outline is built to say so.
      const w = radiusM * 2.0;
      const h = radiusM * 1.1;
      g.rect(x - w / 2, y - h / 2, w, h).fill(body);
      g.rect(x - w / 2, y - h / 2, w, h).stroke(edge);
      if (style.detail) {
        g.rect(x - w * 0.5, y - h * 0.16, w * 0.86, h * 0.32).fill({
          color: 0x000000,
          alpha: style.alpha * 0.55,
        });
        g.rect(x - w * 0.5, y - h * 0.16, w * 0.86, h * 0.32).stroke(edge);
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
    case StructureKind.BaffleBarge: {
      // A moored hull block ringed by baffle vanes: the masking ship.
      const w = radiusM * 2.2;
      const h = radiusM * 1.4;
      g.rect(x - w / 2, y - h / 2, w, h).fill(body);
      g.rect(x - w / 2, y - h / 2, w, h).stroke(edge);
      if (style.detail) {
        for (const t of [-0.3, 0, 0.3]) {
          g.rect(x + w * t - w * 0.04, y - h * 0.62, w * 0.08, h * 1.24).fill({
            color: style.color,
            alpha: style.alpha * 0.8,
          });
        }
      }
      break;
    }
    case StructureKind.Cantor: {
      // The listening dome, studded with hydrophone spines.
      g.circle(x, y, radiusM).fill(body);
      g.circle(x, y, radiusM).stroke(edge);
      if (style.detail) {
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + 0.4;
          const sx = x + Math.cos(angle) * radiusM;
          const sy = y + Math.sin(angle) * radiusM;
          g.moveTo(sx, sy)
            .lineTo(x + Math.cos(angle) * radiusM * 1.35, y + Math.sin(angle) * radiusM * 1.35)
            .stroke(edge);
        }
        g.circle(x, y, radiusM * 0.35).fill({ color: style.accent, alpha: style.alpha * 0.7 });
      }
      break;
    }
    case StructureKind.SoundingSpire: {
      // A spire from above: a diamond core inside its resonance ring.
      g.circle(x, y, radiusM).stroke(edge);
      const d = radiusM * 0.55;
      g.poly([x, y - d, x + d, y, x, y + d, x - d, y]).fill(body);
      g.poly([x, y - d, x + d, y, x, y + d, x - d, y]).stroke(edge);
      if (style.detail) {
        g.circle(x, y, radiusM * 0.18).fill({ color: style.accent, alpha: style.alpha });
      }
      break;
    }
    case StructureKind.SporeVeil: {
      // A low grown bed: soft irregular lobes rather than an engineered shape.
      const points: number[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const wobble = 1 + 0.18 * Math.sin(i * 2.7);
        points.push(x + Math.cos(angle) * radiusM * wobble, y + Math.sin(angle) * radiusM * wobble);
      }
      g.poly(points).fill(body);
      g.poly(points).stroke(edge);
      if (style.detail) {
        g.circle(x - radiusM * 0.35, y, radiusM * 0.2).fill({
          color: style.accent,
          alpha: style.alpha * 0.6,
        });
        g.circle(x + radiusM * 0.35, y, radiusM * 0.2).fill({
          color: style.accent,
          alpha: style.alpha * 0.6,
        });
      }
      break;
    }
    case StructureKind.VentTap: {
      // A collar clamped over a vent, with offtake pipes. Reads as machinery
      // sitting *on* something rather than as a building in its own right,
      // which is exactly what it is.
      g.circle(x, y, radiusM).stroke(edge);
      g.circle(x, y, radiusM * 0.45).fill(body);
      if (style.detail) {
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
          g.moveTo(x + Math.cos(angle) * radiusM * 0.45, y + Math.sin(angle) * radiusM * 0.45)
            .lineTo(x + Math.cos(angle) * radiusM, y + Math.sin(angle) * radiusM)
            .stroke(edge);
        }
        g.circle(x, y, radiusM * 0.18).fill({ color: style.accent, alpha: style.alpha });
      }
      break;
    }
  }
}
