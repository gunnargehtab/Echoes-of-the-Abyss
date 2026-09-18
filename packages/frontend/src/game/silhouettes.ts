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
 * HULL_OUTLINE is drawn two ways. A kind with an approved model takes its plan
 * outline *from* the model (hullOutlines.generated.ts, written by
 * tools/hull-maps/outlines.mjs and held to the GLBs by
 * tools/hull-models/check.mjs), so the track is a return of the hull that is
 * actually there. A kind still waiting for art is hand-drawn below,
 * silhouette-first, and that outline is also what the procedural sprite baker
 * rasterises — so for those kinds the fallback, the track and the sprite share
 * one shape. Either way the runtime reads an array, never a GLB.
 */

import type { Graphics } from 'pixi.js';
import { Faction, StructureKind, UnitKind, statsFor } from '@echoes/shared';
import { GENERATED_HULL_OUTLINE, type ModelledUnitKind } from './hullOutlines.generated.ts';

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
  [UnitKind.Beacon]: statsFor(UnitKind.Beacon).hullLengthM,
  [UnitKind.Glider]: statsFor(UnitKind.Glider).hullLengthM,
  [UnitKind.Acolyte]: statsFor(UnitKind.Acolyte).hullLengthM,
  [UnitKind.Herald]: statsFor(UnitKind.Herald).hullLengthM,
  [UnitKind.Broadside]: statsFor(UnitKind.Broadside).hullLengthM,
  [UnitKind.Weaver]: statsFor(UnitKind.Weaver).hullLengthM,
  [UnitKind.Thurible]: statsFor(UnitKind.Thurible).hullLengthM,
  [UnitKind.Lance]: statsFor(UnitKind.Lance).hullLengthM,
  [UnitKind.Furnace]: statsFor(UnitKind.Furnace).hullLengthM,
  [UnitKind.Blight]: statsFor(UnitKind.Blight).hullLengthM,
  [UnitKind.Lure]: statsFor(UnitKind.Lure).hullLengthM,
  [UnitKind.Tocsin]: statsFor(UnitKind.Tocsin).hullLengthM,
  [UnitKind.Caisson]: statsFor(UnitKind.Caisson).hullLengthM,
  [UnitKind.Reed]: statsFor(UnitKind.Reed).hullLengthM,
  [UnitKind.Bower]: statsFor(UnitKind.Bower).hullLengthM,
  [UnitKind.Derrick]: statsFor(UnitKind.Derrick).hullLengthM,
  [UnitKind.Responsory]: statsFor(UnitKind.Responsory).hullLengthM,
};

/**
 * Hull outlines in unit space: length 1 along +X (bow at +0.5), beam on Y.
 * Silhouette-first, per docs/art-direction.md: each kind must read at a
 * glance from shape alone.
 *
 * Hand-drawn for the kinds without a model. The type is the completeness
 * check: a kind that gains a model moves to hullOutlines.generated.ts, and
 * its entry here becomes a compile error until it is deleted; a kind absent
 * from both fails HULL_OUTLINE below.
 */
const HAND_DRAWN_OUTLINE: Record<Exclude<UnitKind, ModelledUnitKind>, number[][]> = {
  // --- The line hulls, and the anchor (#509). What a line hull's silhouette
  // has to say at RTS distance is whose Corvette this is — the duel is the
  // Corvette's, and what differs is what the doctrine did to the hull around
  // the tubes — and the third is a state made into geometry, as the Glider
  // and the Lure are: the Bower is drawn grown out.

  // A pressure box: the Corvette's wedge made in plate and no longer
  // tapering — a blunt plough bow, flanks parallel from the shoulders for
  // two thirds of the length, then a step in to the bare drive hull and a
  // square stern. The step is the third more plate: the caisson bolted over
  // the forward two thirds stands proud of the hull behind it. Reads apart
  // from the Freighter's and the Bulwark's slabs, which never step, from the
  // Tender's box, whose notch is at the stern, and from the Beacon, the
  // Broadside and the Furnace, whose boxes carry something proud of the
  // flanks or the bow where this one carries its plant on its back.
  [UnitKind.Caisson]: [
    [0.5, 0.14],
    [0.44, 0.23],
    [-0.14, 0.23],
    [-0.18, 0.16],
    [-0.46, 0.16],
    [-0.5, 0.11],
    [-0.5, -0.11],
    [-0.46, -0.16],
    [-0.18, -0.16],
    [-0.14, -0.23],
    [0.44, -0.23],
    [0.5, -0.14],
  ],
  // A reed: a slim stem, the thinnest gun hull in the roster, swelling at
  // two nodes with a narrow leaf blade swept aft off each — starboard (+Y)
  // at the forward node, port at the after one, alternate as a reed's leaves
  // are — and a fluke astern. Not mirrored across its keel, as the Glider is
  // not, but balanced where the Glider is one-sided: what stands out to
  // starboard forward stands out to port aft. Reads apart from the Lance's
  // chevron, which is mirrored and amidships, from the Weaver's beads, which
  // swell three times where this barely swells at all, and from the Light
  // Scout's arrowhead, which is all bow.
  [UnitKind.Reed]: [
    [0.5, 0.0],
    [0.4, 0.04],
    [0.3, 0.06],
    [0.28, 0.08],
    [0.04, 0.19],
    [-0.02, 0.07],
    [-0.12, 0.07],
    [-0.3, 0.06],
    [-0.44, 0.04],
    [-0.5, 0.08],
    [-0.5, -0.08],
    [-0.44, -0.04],
    [-0.36, -0.06],
    [-0.3, -0.18],
    [-0.06, -0.08],
    [0.0, -0.07],
    [0.2, -0.07],
    [0.3, -0.06],
    [0.4, -0.04],
  ],
  // The Spore Veil's bed with a drive: a broad low oval, the widest Commune
  // plan, its edge scalloped by overlapping lobes that alternate a side at a
  // time, a blunt nose and a broad short fluke astern — drawn grown out,
  // which is the state it anchors in. Widest amidships and rounded at both
  // ends, so it reads apart from the Sower's leaf (wide at the bow, a stem
  // aft), the Thurible's shield over a tail, the Lure's fan at the stern and
  // the Verger's ribbed capsule, scalloped at its plate seams where these
  // bulge lobe by lobe. The scallops are the Veil's own outline
  // (drawStructureSilhouette, below) given a bow and a stern.
  [UnitKind.Bower]: [
    [0.5, 0.0],
    [0.45, 0.11],
    [0.36, 0.2],
    [0.3, 0.17],
    [0.18, 0.26],
    [0.1, 0.22],
    [-0.02, 0.28],
    [-0.12, 0.23],
    [-0.24, 0.24],
    [-0.34, 0.17],
    [-0.42, 0.09],
    [-0.45, 0.04],
    [-0.5, 0.11],
    [-0.5, -0.11],
    [-0.45, -0.04],
    [-0.4, -0.12],
    [-0.32, -0.22],
    [-0.24, -0.19],
    [-0.12, -0.27],
    [-0.04, -0.23],
    [0.08, -0.27],
    [0.16, -0.22],
    [0.28, -0.22],
    [0.38, -0.15],
    [0.46, -0.07],
  ],
};

export const HULL_OUTLINE: Record<UnitKind, number[][]> = {
  ...HAND_DRAWN_OUTLINE,
  ...GENERATED_HULL_OUTLINE,
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
    case StructureKind.BioReactor: {
      // A digester drum with intake booms reaching out into the canopy. Read
      // from above it is machinery *feeding* on the ground around it, which is
      // what it is: the booms point outward because the crop it eats is the
      // cover it stands in (docs/systems-flora.md §2).
      g.circle(x, y, radiusM * 0.6).fill(body);
      g.circle(x, y, radiusM * 0.6).stroke(edge);
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
        g.moveTo(x + Math.cos(angle) * radiusM * 0.6, y + Math.sin(angle) * radiusM * 0.6)
          .lineTo(x + Math.cos(angle) * radiusM, y + Math.sin(angle) * radiusM)
          .stroke(edge);
      }
      if (style.detail) {
        // The vent stack, off-centre: a reactor is not a symmetrical building.
        g.circle(x + radiusM * 0.22, y - radiusM * 0.22, radiusM * 0.16).fill({
          color: style.accent,
          alpha: style.alpha,
        });
      }
      break;
    }
  }
}
