/**
 * Classified animals as stipple — docs/map-visuals.md §8, Phase 4 of §10 (#868).
 *
 * At Tier 3 a fauna contact is drawn as its species' shape in dots, and Tier 4
 * draws the same shape denser, so more dots means more knowledge. The shapes
 * are the ones the bestiary's silhouettes drew before this module — the same
 * parts, at the same `lengthM / 2` — sampled as dots instead of filled.
 *
 * **One template per species, and Tier 3 is its prefix.** Each species has one
 * ordered list of dots. Tier 3 draws the first half and Tier 4 all of it, and
 * the half is every part's first dots, so a Tier-3 creature is the whole
 * shape, sparse, never half a shape. The count is fixed per species and tier:
 * nothing hidden moves it, so a Rasp's dots can never be read as a count of
 * the swarm, and no hp can thin a creature.
 *
 * **Nothing below Tier 3.** `agentStippleCount` is zero there, and the one
 * caller (`EchoRenderer.drawFaunaStipple`) returns first. A Tier-1 or Tier-2
 * fauna contact is the same haze and column as a hull (docs/bestiary.md §3):
 * "no marker, colour, or sound that distinguishes fauna from an army".
 *
 * **Rung 7, and never rung 5's look.** Public life is stipple too
 * (`faunaStipple.ts`), in the same `FAUNA_COLOR`, and a pinged Tetherjelly is a
 * Tier-4 contact sitting on its own field. §5 says the two must never share a
 * look, and hue cannot hold them apart, so form does. A furniture dot is soft,
 * additive, at most `DOT_MAX_PX` wide, pulsing, faded by the water and hidden
 * behind ridges. An agent dot is hard, drawn over the ground with normal
 * blending, `AGENT_DOT_DIAMETER_PX` wide, still, and never faded or hidden: it
 * is a mark the player earned (#836). And the shapes are small beside a
 * field's 22 m bells and a shoal's 40 m cloud.
 *
 * **Overlay ink, not conn geometry.** Gate 5 keeps the enemy out of the conn
 * scene at every tier, so these dots are Pixi, in the overlay's contact
 * symbols, projected through the same camera. They spend none of gate 6's
 * counted calls or triangles; the overlay is priced in milliseconds. A dot
 * pattern is built once per species, density and zoom bucket, as a shared
 * `GraphicsContext`, and a frame only picks one and writes a tint and an
 * alpha. Nothing is tessellated per frame.
 */

import { Graphics, GraphicsContext } from 'pixi.js';
import { FaunaSpecies, faunaStatsFor, ResolutionTier } from '@echoes/shared';
import { FAUNA_COLOR } from './palette.ts';

/**
 * TUNABLE, render-only — an agent dot's width on screen, in CSS pixels. Wider
 * than the widest furniture dot (`DOT_MAX_PX`, 2.4) on purpose: size is one of
 * the axes that keeps rung 7 from reading as rung 5.
 */
export const AGENT_DOT_DIAMETER_PX = 3;

/** TUNABLE — sides of a dot. At three pixels a hexagon is a disc, at six
 * vertices rather than a circle's dozens. */
const AGENT_DOT_SIDES = 6;

/**
 * Zoom buckets per doubling of pixels-per-metre. A dot's radius is baked into
 * its context in metres, so a context holds one dot size; bucketing keeps that
 * size within about 9% of `AGENT_DOT_DIAMETER_PX` at every zoom while a
 * dolly builds a handful of contexts rather than one a frame.
 */
export const AGENT_ZOOM_BUCKETS_PER_OCTAVE = 4;
/**
 * The buckets a context is built for: 2^-7 to 2^5 px per metre. Past the far
 * end a Sounder is under a pixel; past the near end the eye is inside the
 * animal. Clamped, so the cache is bounded by construction.
 */
export const AGENT_ZOOM_BUCKET_MIN = -28;
export const AGENT_ZOOM_BUCKET_MAX = 20;

/** The label on a contact's pooled stipple body, for the smoke test to find. */
export const AGENT_STIPPLE_LABEL = 'fauna-stipple';

// ------------------------------------------------------------ the shapes

/** A part of a shape: its Tier-3 dots, and the extra dots Tier 4 adds. */
interface Part {
  classified: number[];
  extra: number[];
}

type Point = readonly [number, number];

/** The plastic number's R2 steps: a 2-D sequence every prefix of which is
 * spread evenly, so a fill's first dots cover the whole region. */
const PLASTIC = 1.324717957244746;
const R2_X = 1 / PLASTIC;
const R2_Y = 1 / (PLASTIC * PLASTIC);

const frac = (value: number): number => value - Math.floor(value);

/**
 * `perTier` dots along a path at Tier 3 and twice that at Tier 4, at equal
 * arc length. Tier 3 takes every other position, so it spans the whole path
 * and Tier 4 fills the gaps. A closed path starts its first dot on its first
 * point — the Draymaw's snout, the rim's widest point.
 */
function along(path: readonly Point[], closed: boolean, perTier: number): Part {
  const points = closed ? [...path, path[0]!] : [...path];
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1]!;
    const [bx, by] = points[i]!;
    cumulative.push(cumulative[i - 1]! + Math.hypot(bx - ax, by - ay));
  }
  const length = cumulative[cumulative.length - 1]!;
  const dots = perTier * 2;
  const part: Part = { classified: [], extra: [] };
  let segment = 1;
  for (let k = 0; k < dots; k++) {
    const s = ((closed ? k : k + 0.5) / dots) * length;
    while (segment < points.length - 1 && cumulative[segment]! < s) segment++;
    const [ax, ay] = points[segment - 1]!;
    const [bx, by] = points[segment]!;
    const span = cumulative[segment]! - cumulative[segment - 1]!;
    const t = span > 0 ? (s - cumulative[segment - 1]!) / span : 0;
    (k % 2 === 0 ? part.classified : part.extra).push(ax + (bx - ax) * t, ay + (by - ay) * t);
  }
  return part;
}

/**
 * `perTier` dots inside a region at Tier 3 and twice that at Tier 4: the
 * first points of an R2 sequence over the box that land inside. Every prefix
 * of the sequence is spread, so Tier 3 already covers the region. `seed`
 * offsets the sequence per species and part, never per contact, so every
 * creature of a kind is the same figure and can share one context.
 */
function inside(
  contains: (x: number, y: number) => boolean,
  box: readonly [number, number, number, number],
  perTier: number,
  seed: number
): Part {
  const [x0, y0, x1, y1] = box;
  const found: number[] = [];
  for (let k = 0; found.length < perTier * 4 && k < 20_000; k++) {
    const x = x0 + frac(seed + k * R2_X) * (x1 - x0);
    const y = y0 + frac(seed + k * R2_Y) * (y1 - y0);
    if (contains(x, y)) found.push(x, y);
  }
  return { classified: found.slice(0, perTier * 2), extra: found.slice(perTier * 2) };
}

function ellipse(cx: number, cy: number, rx: number, ry: number, steps = 96): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
}

const inEllipse =
  (cx: number, cy: number, rx: number, ry: number) =>
  (x: number, y: number): boolean =>
    ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

function disc(cx: number, cy: number, radius: number, perTier: number, seed: number): Part {
  return inside(
    inEllipse(cx, cy, radius, radius),
    [cx - radius, cy - radius, cx + radius, cy + radius],
    perTier,
    seed
  );
}

/** A quadratic curve, sampled for `along`. */
function quad(from: Point, control: Point, to: Point, steps = 48): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push([
      u * u * from[0] + 2 * u * t * control[0] + t * t * to[0],
      u * u * from[1] + 2 * u * t * control[1] + t * t * to[1],
    ]);
  }
  return out;
}

/**
 * One species' parts, in units of its half-length and in the billboard's
 * frame: +x right on screen, +y down. Each is a part of the silhouette the
 * bestiary drew before, at the same place. The Draymaw's wedge and the
 * Hollow's gape point screen-right as those did. A fauna contact carries no
 * heading at any tier, so nothing here may turn toward one, and nothing
 * depicts a behaviour the wire does not carry: a strike, a stampede, a scatter.
 */
function partsOf(species: FaunaSpecies): Part[] {
  const seed = 0.5 + species * 0.173;
  switch (species) {
    case FaunaSpecies.Ashgrazer:
      // Broad and armoured: a flattened shell, its rim and its plates.
      return [
        along(ellipse(0, 0, 1, 0.6), true, 12),
        inside(inEllipse(0, 0, 0.78, 0.42), [-0.78, -0.42, 0.78, 0.42], 8, seed),
      ];
    case FaunaSpecies.Draymaw: {
      // A lean wedge, pack-shaped, snout first.
      const wedge: Point[] = [
        [1, 0],
        [-1, 0.5],
        [-1, -0.5],
      ];
      // Inset from the edge so the body does not crowd the outline.
      const inWedge = (x: number, y: number): boolean =>
        x >= -0.8 && x <= 0.7 && Math.abs(y) <= 0.5 * ((0.7 - x) / 1.7) * 0.8;
      return [along(wedge, true, 6), inside(inWedge, [-0.8, -0.4, 0.7, 0.4], 6, seed)];
    }
    case FaunaSpecies.Sounder:
      // The colossus: a long body and its resonance halo. Finding one at
      // Tier 3 should be unmistakably a different kind of news.
      return [
        along(ellipse(0, 0, 1, 0.35), true, 12),
        inside(inEllipse(0, 0, 0.85, 0.24), [-0.85, -0.24, 0.85, 0.24], 12, seed),
        along(ellipse(0, 0, 1.4, 1.4), true, 12),
      ];
    case FaunaSpecies.Rasp:
      // A swarm is a cloud, not a body: three clumps inside a loose ring. The
      // dots are fixed per tier and are never a count of anything.
      return [
        disc(-0.6, -0.3, 0.45, 4, seed),
        disc(0.5, -0.4, 0.35, 3, seed + 0.31),
        disc(0, 0.5, 0.4, 3, seed + 0.57),
        along(ellipse(0, 0, 1.1, 1.1), true, 6),
      ];
    case FaunaSpecies.Lampfry:
      // Small motes and no closed body — the public shoal's language, at a
      // creature's size rather than a cloud's.
      return [
        disc(-0.5, 0, 0.3, 4, seed),
        disc(0.4, -0.35, 0.3, 4, seed + 0.31),
        disc(0.2, 0.45, 0.3, 4, seed + 0.57),
      ];
    case FaunaSpecies.Tetherjelly:
      // A bell over three tethers: closed above, strands below.
      return [
        along(ellipse(0, -0.3, 0.7, 0.45), true, 10),
        along(
          [
            [-0.4, 0],
            [-0.5, 0.8],
          ],
          false,
          2
        ),
        along(
          [
            [0, 0],
            [0, 0.9],
          ],
          false,
          2
        ),
        along(
          [
            [0.4, 0],
            [0.5, 0.8],
          ],
          false,
          2
        ),
      ];
    case FaunaSpecies.Hollow: {
      // A gape: an open crescent, because what was classified is mostly mouth.
      // Its outer curve, and the band between it and the inner one.
      const outer = quad([0.8, -0.7], [-1, 0], [0.8, 0.7]);
      // Both curves share their ends, so one `t` per row of the band: the
      // outer curve's x at `t` is the band's left edge and the inner's its right.
      const inGape = (x: number, y: number): boolean => {
        const t = (y / 0.7 + 1) / 2;
        if (t < 0 || t > 1) return false;
        const ends = 0.8 * ((1 - t) ** 2 + t ** 2);
        const bend = 2 * t * (1 - t);
        return x >= ends - bend && x <= ends - 0.2 * bend;
      };
      return [along(outer, false, 10), inside(inGape, [-0.1, -0.7, 0.8, 0.7], 6, seed)];
    }
    default:
      // A species the wire names and this client does not know draws nothing
      // rather than someone else's shape. The Attendants have no member.
      return [];
  }
}

const templates = new Map<FaunaSpecies, Float32Array>();

/**
 * Build one species' template: every part's Tier-3 dots, then every part's
 * extra Tier-4 dots, as x, y pairs in metres about the contact. Exported for
 * the test that holds it deterministic; draw through `agentStippleDots`.
 */
export function buildAgentStippleDots(species: FaunaSpecies): Float32Array {
  const stats = faunaStatsFor(species);
  if (stats === undefined) return new Float32Array(0);
  const r = stats.lengthM / 2;
  const parts = partsOf(species);
  const ordered = [
    ...parts.flatMap((part) => part.classified),
    ...parts.flatMap((part) => part.extra),
  ];
  return Float32Array.from(ordered, (unit) => unit * r);
}

/**
 * One species' dots, Tier 4's whole template, as x, y pairs in metres about
 * the contact with +y down the screen. Tier 3 is the first half. Built once
 * per species and shared; never write to it.
 */
export function agentStippleDots(species: FaunaSpecies): Float32Array {
  let dots = templates.get(species);
  if (dots === undefined) {
    dots = buildAgentStippleDots(species);
    templates.set(species, dots);
  }
  return dots;
}

/**
 * How many dots a fauna contact of `species` is drawn with at `tier`: none
 * below Tier 3, the template's first half at Tier 3, and all of it at Tier 4.
 */
export function agentStippleCount(species: FaunaSpecies, tier: ResolutionTier): number {
  if (tier < ResolutionTier.Classification) return 0;
  const pairs = agentStippleDots(species).length / 2;
  return tier >= ResolutionTier.Track ? pairs : pairs / 2;
}

// ------------------------------------------------------------ the contexts

/** Which bucket a pixels-per-metre scale draws in, clamped to the built range. */
export function agentZoomBucket(pxPerM: number): number {
  const raw = Math.round(AGENT_ZOOM_BUCKETS_PER_OCTAVE * Math.log2(Math.max(pxPerM, 1e-9)));
  return Math.min(AGENT_ZOOM_BUCKET_MAX, Math.max(AGENT_ZOOM_BUCKET_MIN, raw));
}

/** A dot's radius in metres for a bucket: `AGENT_DOT_DIAMETER_PX` on screen. */
export function agentDotRadiusM(bucket: number): number {
  return AGENT_DOT_DIAMETER_PX / 2 / 2 ** (bucket / AGENT_ZOOM_BUCKETS_PER_OCTAVE);
}

const contexts = new Map<number, GraphicsContext>();

/**
 * The shared dot pattern for a fauna contact of `species` at `tier`, drawn at
 * `pxPerM`: null below Tier 3, or for a species with no shape.
 *
 * Built on first ask in white and tinted by the caller, so a palette change
 * costs no rebuild. Hard, solid dots, all of them in one fill. Batched, so a
 * creature adds vertices to the overlay's batch rather than a draw of its own
 * and a break in everyone else's.
 */
export function agentStippleContext(
  species: FaunaSpecies,
  tier: ResolutionTier,
  pxPerM: number
): GraphicsContext | null {
  const count = agentStippleCount(species, tier);
  if (count === 0) return null;
  const dense = tier >= ResolutionTier.Track;
  const bucket = agentZoomBucket(pxPerM);
  const key = ((bucket - AGENT_ZOOM_BUCKET_MIN) * 16 + species) * 2 + (dense ? 1 : 0);
  let context = contexts.get(key);
  if (context === undefined) {
    context = new GraphicsContext();
    context.batchMode = 'batch';
    const dots = agentStippleDots(species);
    const radius = agentDotRadiusM(bucket);
    for (let i = 0; i < count; i++) {
      context.regularPoly(dots[i * 2]!, dots[i * 2 + 1]!, radius, AGENT_DOT_SIDES);
    }
    context.fill({ color: 0xffffff, alpha: 1 });
    contexts.set(key, context);
  }
  return context;
}

/** How many dot patterns are built — the bound the stipple test holds. */
export function agentStippleContextCount(): number {
  return contexts.size;
}

/**
 * A contact's stipple body: a Graphics that draws a shared context and never
 * owns it, so destroying the body leaves the pattern for every other creature.
 * Normal blending, stated rather than inherited, because it is one of the
 * axes that keeps an agent from reading as furniture's additive glow.
 */
export function agentStippleGraphics(context: GraphicsContext): Graphics {
  const dots = new Graphics(context);
  dots.label = AGENT_STIPPLE_LABEL;
  dots.blendMode = 'normal';
  return dots;
}

/**
 * Colour a stipple body for this frame: `FAUNA_COLOR`, read now rather than
 * captured, because the palette is a live binding and §8 keeps fauna in the
 * palette's colour in all four. `alpha` is the contact's own — tier, ghost
 * freshness and arrival — so the dots fade exactly as every other contact
 * mark does. Density follows the tier and brightness follows the clock: a
 * ghosted Tier-4 creature keeps its Tier-4 dots and dims. The ladder weighs
 * one dot at that alpha fresh, blended normally (ladder.ts `faunaDotTier3`,
 * `faunaDotTier4`).
 */
export function paintAgentStipple(dots: Graphics, alpha: number): void {
  dots.tint = FAUNA_COLOR;
  dots.alpha = alpha;
}

/**
 * Free every dot pattern. Called at renderer teardown, after the stage is
 * gone, the way the bake caches are dropped, so a remount rebuilds rather than
 * drawing contexts the GPU no longer holds.
 */
export function destroyAgentStippleContexts(): void {
  for (const context of contexts.values()) context.destroy();
  contexts.clear();
}
