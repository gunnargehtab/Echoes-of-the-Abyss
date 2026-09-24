/**
 * The loudness ladder — docs/map-visuals.md §5.
 *
 * Every mark on the map sits on one rung, and each rung is quieter than every
 * rung above it — **floor against floor**, as the owner ruled on #866. A
 * rung's floor is its quietest steady outline, at its quietest alpha, in its
 * quietest colour, and it lifts the ground more than the floor of the rung
 * below, over the darkest and the palest ground, in all four palettes. A live
 * hazard's rim may out-shout a detection ring; what may not happen is that the
 * quietest thing on a rung is quieter than the quietest thing under it.
 *
 * This module holds the part of that which can be measured without a GPU:
 * every outline rung 5 (map furniture) and rung 6 (instruments) draws, and the
 * outlines rung 7 (agents) draws on the chart. Four of the rung-5 outlines are
 * its floor, and the lesser of that floor and the unselected detection ring is
 * the ceiling of rung 4 (survey ink). Residue's arc is the one rung-5 outline
 * that can fall under them, depending on which peak it is weighed at
 * (`RESIDUE_PEAK`). The draw sites import their alphas from here, so the
 * number the tests weigh is the number the mark is drawn at — a rim or ring
 * made quieter moves the ceiling with it, and the ink tests fail until the ink
 * follows it down.
 *
 * Four measurement rules ride with it, each the owner's (§5):
 *
 * - **A mark is weighed by its outline, never by its interior** (#865).
 * - **An edgeless haze is not weighed per pixel against a line** (#865): a
 *   Tier-1 or Tier-2 contact is its column and nothing else.
 * - **A fading mark is weighed at its steady peak** (#866): the moment it is
 *   fully present. A contact at its fresh alpha; the lock brackets, the
 *   break-silence ring and an order's acknowledgement at their peak alpha.
 * - **A rimless mark is weighed by its loudest crisp element** (#866) — a
 *   dot, a hatch line, a dash — at its peak, as if it were an outline. Soft
 *   fills stay unweighed.
 *
 * Measured the way a screenshot is: Rec. 709 luminance on encoded bytes, and
 * a stroke's weight as how far it lifts the pixel under it. Both the mark
 * layer and the survey ink blend in encoded space, so two strokes over the
 * same ground compare exactly. So do the conn view's lines — the canvas is
 * sRGB and nothing renders through a linear target — except that the water's
 * fog fades a far one, and the ground under it, toward the water colour, which
 * scales its lift down. They are weighed unfogged, near the eye. That is their
 * loudest, so it is the right end to hold under the rung above; it is the
 * wrong end for rung 5's floor, which the overlay's unfogged rims set, and a
 * far route or rim lifts less than that floor. The floor test does not reach
 * the far end.
 *
 * The palest ground is the palest biome fill, which is where the owner's 0.266
 * for the ring was measured. The water ramp's shallowest stop is paler, and
 * the fog carries a far shallow floor toward it; the tests do not reach that
 * ground either (docs/map-visuals.md §10).
 *
 * Two blends are modelled, because the map draws with two (`Blend`).
 */

import { ECHO_MARKS, Faction, ResolutionTier, ResourceKind } from '@echoes/shared';
import { MARK_STYLE } from './echoMarks.ts';
import { TIER_SHAPE, type Palette } from './palette.ts';

/**
 * The alpha of every outline rung 5 draws, by draw site.
 *
 * The first four are the rung's floor: the quietest outline it draws in each
 * of its three quiet colours — accent, fauna, threat — and the inert hazard
 * site's rim (`furnitureFloorLift`, below). Which of them is quietest depends
 * on the palette — the dormant eruption rim in three of the four, the
 * Tetherjelly rim in protanopia, whose threat red is brighter — so the floor
 * is the least of them. Every other outline here lifts more than that floor
 * in every palette, which ladder.test.ts holds, near the eye (see the fog,
 * above) — all but residue's arc at a faint mark's own peak, which it records.
 *
 * A mark is weighed by its outline, never by its interior. A field's faint
 * fill, an inert site's hatching, a live hazard's two inner rings, a current's
 * streaks, a nodule field's grains and residue's three soft rings are texture
 * inside a mark whose rim already speaks for it, and a ladder that weighed
 * them would be ranking the grain of a mark rather than the mark
 * (docs/map-visuals.md §5). A live hazard's third ring is drawn on the rim
 * itself, so it is weighed with it.
 */
export const FURNITURE_OUTLINE_ALPHA = {
  /** A kelp field's rim while it is not gripping (EchoRenderer `drawHazards`). */
  kelpRimIdle: 0.14,
  /** A Tetherjelly field's rim (EchoRenderer `drawJellies`). */
  jellyRim: 0.18,
  /**
   * A simulated hazard's rim while dormant (EchoRenderer `HAZARD_STYLE`).
   * Weighed in `UI.threat`, the eruption's colour, because it is the quieter
   * of the two the rim is drawn in.
   */
  hazardRimDormant: 0.22,
  /**
   * An inert hazard site's rim (EchoRenderer `drawStaticHazardSites`), the
   * outline around its hatching. Held here because the outline rule leans on
   * it: the hatching goes unweighed only while this rim speaks for the mark.
   */
  inertSiteRim: 0.28,
  /** A kelp field's rim while it grips (EchoRenderer `drawHazards`). */
  kelpRimGripping: 0.3,
  /** A simulated hazard's rim in its warning phase (EchoRenderer `HAZARD_STYLE`). */
  hazardRimWarning: 0.7,
  /** A simulated hazard's rim while it fires (EchoRenderer `HAZARD_STYLE`). */
  hazardRimActive: 0.95,
  /** A simulated hazard's rim as it dies down (EchoRenderer `HAZARD_STYLE`). */
  hazardRimDecay: 0.5,
  /**
   * A live hazard's three rings at full heat, fading with it (EchoRenderer
   * `drawHazards`). Every hazard but a current and kelp draws them. The two
   * inside are interior; the third falls on the rim and stacks on it, so the
   * active and decay rims are weighed with it at their loudest.
   */
  hazardInnerRing: 0.3,
  /**
   * The warning's countdown ring as it opens (EchoRenderer `drawHazards`). It
   * gains `hazardCountdownGain` as it closes on the rim, so it meets the rim
   * at 0.85, the loudest it gets, and stacks on it there: the warning rim is
   * weighed with it at its loudest.
   */
  hazardCountdownStart: 0.35,
  hazardCountdownGain: 0.5,
  /** A resource field's rim, nodule or crystal (EchoRenderer `drawNodes`). */
  resourceRim: 0.3,
  /** The dashed ring that says a crystal field is at depth (EchoRenderer `drawNodes`). */
  crystalDepthRing: 0.55,
  /** A roofed passage's route line (PerspectiveView `buildTerrainDressing`). */
  tunnelRoute: 0.3,
  /** The map's border (PerspectiveView `buildTerrainDressing`). */
  mapRim: 0.5,
  /** A scattered Lampfry shoal's 300 m trigger ring (EchoRenderer `drawShoals`). */
  shoalScatterRing: 0.4,
  /**
   * Acoustic residue's dashed arc, per unit of intensity (EchoRenderer
   * `drawEchoMarks`). Residue is rung 5, your own heard residue beside the
   * public furniture (#866), and the arc is its outline. Its intensity decays
   * by design, so it is weighed at its peak, and `RESIDUE_PEAK` says why that
   * is two numbers rather than one.
   */
  residueArc: 0.5,
} as const;

/**
 * Residue's intensity at its peak, read two ways: the scale's ceiling, or a
 * mark's own peak. The owner has not chosen between them (docs/map-visuals.md
 * §10).
 *
 * The owner ruled residue weighed at its peak (#866), and the server gives it
 * no single one. A mark is born at its event's intensity, a merge adds the
 * next event's, and `EchoMarkLayer.add` caps the sum at 1: a lone torpedo wake
 * is born at 0.05 (`ORDNANCE.TORPEDO.WAKE_MARK_INTENSITY`), a lone shot's
 * battle site at 0.09 (combat.ts), a detonation's at 0.35 (ordnance.ts), a
 * Standard hold's hum at 0.5, and a destroyed structure at 1. A hum is born at
 * what arrived, so a sliver of a partial load is fainter still, down to the
 * level at which the server drops a mark before any client sees it.
 *
 * `FURNITURE_OUTLINES.residueArc` carries both: its loudest alpha is the
 * ceiling's, and its quietest the least peak's.
 */
export const RESIDUE_PEAK = {
  /** The scale's ceiling, the most any mark holds. */
  ceiling: 1,
  /** A mark's own peak, at its least. No mark reaches a client below it. */
  least: ECHO_MARKS.MIN_AUDIBLE_INTENSITY,
} as const;

/**
 * The stipple's dot brightness (faunaStipple.ts), the rimless marks of rung 5.
 *
 * A Tetherjelly field's bells are a mark of their own, not the rim's interior,
 * and so is a Lampfry shoal's mote cloud, formed or scattered (#866). Each is
 * weighed by its loudest dot at its peak: the seed at the top of its spread,
 * the contraction's height (`jellyBeatLift`), the twinkle's crest, unfogged —
 * the brightest the shader can draw a dot of that kind (`FURNITURE_DOT_PEAK`).
 * A field has 270 body dots and a shoal 72, so each lands within a few
 * percent of it.
 *
 * These are gains, not alphas: the dots blend additively, and each multiplies
 * the fauna colour in linear light before it is encoded and added.
 */
export const FURNITURE_DOT_GAIN = {
  /** A bell's body dot at rest; tentacle dots fade toward their tips. */
  jelly: 0.5,
  /** How much a contraction brightens a bell, at its peak. */
  jellyBeatLift: 0.3,
  /** A formed shoal's brightest mote. */
  shoalFormed: 0.9,
  /** A scattered shoal's, dimmed. */
  shoalScattered: 0.6,
} as const;

/** Each stipple mark's loudest dot, at its peak. */
export const FURNITURE_DOT_PEAK = {
  jellyBells: FURNITURE_DOT_GAIN.jelly * (1 + FURNITURE_DOT_GAIN.jellyBeatLift),
  shoalFormed: FURNITURE_DOT_GAIN.shoalFormed,
  shoalScattered: FURNITURE_DOT_GAIN.shoalScattered,
} as const;

/**
 * The alpha of every outline rung 6 draws, by draw site: the interface's
 * instruments, and the ink about the player's own hulls, structures and
 * ordnance (docs/map-visuals.md §5, §10).
 *
 * The rung's floor is the unselected detection ring in the standard and
 * tritanopia palettes, and blocked ground's hatch in the two red-green ones,
 * whose mid-SIG ring is amber. The ring came up from 0.18 to 0.27 on #866:
 * tritanopia's mid-SIG ring needs more than 0.266 to clear rung 5's floor
 * over the palest ground, and docs/ui-ux.md §3.5 keeps it under the selected
 * ring's 0.35. It is also the player's own exposure, so the ink sits under it
 * in both colours it is drawn in.
 *
 * The `…Peak` alphas belong to marks that fade to nothing by design, weighed
 * at the moment they are fully present (#866). The draw site scales each by
 * what is left of its fade.
 */
export const INSTRUMENT_OUTLINE_ALPHA = {
  /** A hull's detection ring the player has not selected (EchoRenderer `drawRings`). */
  unselectedRing: 0.27,
  /** And a selected hull's (EchoRenderer `drawRings`). */
  selectedRing: 0.35,
  /** The ping preview's reveal radius, while the key is held (EchoRenderer `drawRings`). */
  pingReveal: 0.5,
  /** And its self-reveal radius. */
  pingSelfReveal: 0.8,
  /**
   * Blocked ground's hatch lines (EchoRenderer `drawBlockedGround`). A rimless
   * mark, weighed by its hatch (#866); its faint fill is a soft fill and is
   * not weighed. The hatch is weighed over the ground, as every rim is,
   * rather than over its own fill.
   */
  blockedHatch: 0.16,
  /** The selection ring round an own hull or structure (EchoRenderer `drawUnits`, `drawStructures`). */
  selectionRing: 0.8,
  /**
   * The loudness collar's dial (EchoRenderer `drawLoudnessCollar`), drawn
   * round every own emitter. Its sweep's core is drawn at `collarCore`. The
   * two halo layers under the core are that core's glow (docs/style-neon-noir.md,
   * "The glow recipe") and are not weighed as outlines of their own.
   */
  collarTrack: 0.16,
  collarCore: 1,
  /** The ring an own hull wears while the deep crushes it (EchoRenderer `drawUnits`). */
  crushRing: 0.9,
  /** The ring an own hull wears as it breaks silence, at its peak (EchoRenderer `drawUnits`). */
  breakSilencePeak: 0.8,
  /** The Tier-4 lock brackets, at their peak (EchoRenderer `drawLockFlash`). */
  lockBracketsPeak: 1,
  /** An order's route on the ground (EchoRenderer `drawOrderPlans`). */
  orderRoute: 0.45,
  /** The marker at each of an order's waypoints (EchoRenderer `drawOrderPlans`). */
  orderMarker: 0.8,
  /** The click's acknowledgement, at its peak (EchoRenderer `drawOrderPlans`). */
  orderAckPeak: 0.9,
  /** A yard's rally course (EchoRenderer `drawStructures`). */
  rallyCourse: 0.35,
  /** And the glyph at its rally point. */
  rallyMarker: 0.8,
  /**
   * A reading bar's value: an own hull's health, a structure's build,
   * production or health (EchoRenderer `drawUnits`, `drawStructures`). A
   * rimless mark weighed by its loudest element; the black track under it
   * darkens rather than lifts.
   */
  readingBar: 1,
  /** The run-left dial round an own torpedo (EchoRenderer `drawUnits`). */
  torpedoDial: 0.3,
  /** And the arc of run it has left. */
  torpedoRun: 0.85,
  /** An own mine's diamond, and an own depth charge's triangle. */
  ordnanceMark: 0.7,
  /**
   * An own noisemaker's ring, which breathes from this alpha to this plus
   * `noisemakerSwing` for the eight seconds it lives. A pulse, not a fade:
   * its floor is the trough.
   */
  noisemakerTrough: 0.4,
  noisemakerSwing: 0.5,
} as const;

/**
 * The shares rung 7's chart outlines take of the alpha their contact is drawn
 * at (EchoRenderer `drawContacts`, `drawFaunaSilhouette`), and the alpha of a
 * construction site's scaffold (EchoRenderer `drawStructures`).
 *
 * A contact's own alpha is its tier's (`Palette.tier`), weighed fresh — the
 * moment it is fully present, neither fading in nor fading out as a ghost.
 */
export const AGENT_OUTLINE_ALPHA = {
  /** A Tier-3 contact's ring at 1.6 radii, round its disc. */
  countRingShare: 0.6,
  /** A classified animal's body fill. Interior to its edge, except a Lampfry's rimless motes. */
  faunaBodyShare: 0.75,
  /** The Sounder's resonance halo, round its body. */
  sounderHaloShare: 0.4,
  /** A Tetherjelly contact's trailing tethers. */
  tetherShare: 0.6,
  /** The ring round a Rasp swarm's motes. */
  raspRingShare: 0.5,
  /** A construction site's scaffold: the dashed vectors over the conn view's ghost. */
  scaffold: 0.35,
} as const;

/**
 * How a mark lands on the pixel under it.
 *
 * - `normal` — the mark layer's strokes and the survey ink: `alpha` of the
 *   colour over `1 − alpha` of the ground, in encoded space.
 * - `additive` — the stipple (three.js `AdditiveBlending` with the fragment's
 *   alpha at 1): the colour, decoded to linear light by three's colour
 *   management, times `alpha`, encoded to sRGB by the fragment's
 *   `colorspace_fragment`, and **added** to the encoded pixel. It lifts every
 *   ground by the same amount until a channel clips.
 */
export type Blend = 'normal' | 'additive';

/** One colour at one alpha, blended one way. Normal unless it says otherwise. */
export interface Stroke {
  readonly color: number;
  readonly alpha: number;
  readonly blend?: Blend;
}

/**
 * One outline as the ladder weighs it: its alpha at its quietest and at its
 * loudest, every colour it is drawn in, and how it blends. The floor asks
 * about the quietest alpha in the quietest colour; the rung above asks about
 * the loudest alpha in the loudest.
 */
export interface WeighedOutline {
  readonly quietest: number;
  readonly loudest: number;
  readonly colors: (palette: Palette) => readonly number[];
  readonly blend?: Blend;
}

/** An outline drawn at one alpha. */
export function steady(
  alpha: number,
  colors: WeighedOutline['colors'],
  blend: Blend = 'normal'
): WeighedOutline {
  return { quietest: alpha, loudest: alpha, colors, blend };
}

/**
 * A mark that fades, pulses or twinkles, weighed at its peak as one steady
 * outline (#866). For a rimless mark, pass its loudest crisp element — a dot,
 * a hatch line, a dash — at its peak.
 */
export const atPeak = steady;

/**
 * A stipple dot as the ladder weighs it: additive, at its peak gain, in the
 * colours it is drawn in. The rimless rule's unit for a cloud of dots, public
 * or classified.
 */
export function stippleDot(peakGain: number, colors: WeighedOutline['colors']): WeighedOutline {
  return steady(peakGain, colors, 'additive');
}

/**
 * Two strokes of one colour, one over the other, as the single alpha the
 * pixel ends up at. Exact in encoded space, where both layers blend.
 */
function stacked(below: number, above: number): number {
  return 1 - (1 - below) * (1 - above);
}

const F = FURNITURE_OUTLINE_ALPHA;
const I = INSTRUMENT_OUTLINE_ALPHA;
const A = AGENT_OUTLINE_ALPHA;
/** Red warns and cyan tells: an eruption is drawn in threat, every other hazard in accent. */
const hazardColors = (p: Palette) => [p.ui.threat, p.ui.accent];
const FACTIONS = Object.values(Faction).filter((f): f is Faction => typeof f === 'number');

/** Every outline rung 5 draws, weighed. */
export const FURNITURE_OUTLINES: Readonly<Record<string, WeighedOutline>> = {
  kelpRimIdle: steady(F.kelpRimIdle, (p) => [p.ui.accent]),
  kelpRimGripping: steady(F.kelpRimGripping, (p) => [p.ui.accent]),
  jellyRim: steady(F.jellyRim, (p) => [p.fauna]),
  hazardRimDormant: steady(F.hazardRimDormant, hazardColors),
  // The countdown ring closes onto the warning rim at its loudest.
  hazardRimWarning: {
    quietest: F.hazardRimWarning,
    loudest: stacked(F.hazardRimWarning, F.hazardCountdownStart + F.hazardCountdownGain),
    colors: hazardColors,
  },
  // A current draws no rings, so its rim is the quietest; the rest carry the
  // third ring on theirs, at full heat when the phase begins.
  hazardRimActive: {
    quietest: F.hazardRimActive,
    loudest: stacked(F.hazardRimActive, F.hazardInnerRing),
    colors: hazardColors,
  },
  hazardRimDecay: {
    quietest: F.hazardRimDecay,
    loudest: stacked(F.hazardRimDecay, F.hazardInnerRing),
    colors: hazardColors,
  },
  hazardCountdown: {
    quietest: F.hazardCountdownStart,
    loudest: F.hazardCountdownStart + F.hazardCountdownGain,
    colors: hazardColors,
  },
  inertSiteRim: steady(F.inertSiteRim, (p) => [p.ui.threat]),
  resourceRim: steady(F.resourceRim, (p) => [
    p.resource[ResourceKind.Nodule],
    p.resource[ResourceKind.ResonanceCrystal],
  ]),
  crystalDepthRing: steady(F.crystalDepthRing, (p) => [p.resource[ResourceKind.ResonanceCrystal]]),
  tunnelRoute: steady(F.tunnelRoute, (p) => [p.ui.accent]),
  mapRim: steady(F.mapRim, (p) => [p.ui.glassStroke]),
  shoalScatterRing: steady(F.shoalScatterRing, (p) => [p.fauna]),
  // At its peak, both readings at once (`RESIDUE_PEAK`): a faint mark's own
  // peak at its quietest, the scale's ceiling at its loudest. Its colours are
  // its own, in every palette (echoMarks.ts).
  residueArc: {
    quietest: F.residueArc * RESIDUE_PEAK.least,
    loudest: F.residueArc * RESIDUE_PEAK.ceiling,
    colors: () => Object.values(MARK_STYLE).map((s) => s.color),
  },
  jellyBells: stippleDot(FURNITURE_DOT_PEAK.jellyBells, (p) => [p.fauna]),
  shoalMotesFormed: stippleDot(FURNITURE_DOT_PEAK.shoalFormed, (p) => [p.fauna]),
  shoalMotesScattered: stippleDot(FURNITURE_DOT_PEAK.shoalScattered, (p) => [p.fauna]),
};

/** Every outline rung 6 draws, weighed. */
export const INSTRUMENT_OUTLINES: Readonly<Record<string, WeighedOutline>> = {
  // §3.5's gate draws an unselected ring only at SIG at or above the amber
  // stop, so it is never in `sigLow`; a selected hull draws its ring at any
  // SIG, so the selected ring can wear all three.
  unselectedRing: steady(I.unselectedRing, (p) => [p.ui.sigMid, p.ui.sigHigh]),
  selectedRing: steady(I.selectedRing, (p) => [p.ui.sigLow, p.ui.sigMid, p.ui.sigHigh]),
  pingReveal: steady(I.pingReveal, (p) => [p.ui.friendly]),
  pingSelfReveal: steady(I.pingSelfReveal, (p) => [p.ui.threat]),
  blockedHatch: atPeak(I.blockedHatch, (p) => [p.ui.accent]),
  selectionRing: steady(I.selectionRing, (p) => [p.ui.text]),
  collarTrack: steady(I.collarTrack, (p) => [p.ui.text]),
  collarCore: steady(I.collarCore, (p) => [p.ui.sigLow, p.ui.sigMid, p.ui.sigHigh]),
  crushRing: steady(I.crushRing, (p) => [p.ui.threat]),
  breakSilenceRing: atPeak(I.breakSilencePeak, (p) => [p.ui.threat]),
  lockBrackets: atPeak(I.lockBracketsPeak, (p) => [p.ui.threat]),
  orderRoute: steady(I.orderRoute, (p) => [p.ui.accent]),
  orderMarker: steady(I.orderMarker, (p) => [p.ui.accent, p.ui.threat]),
  orderAck: atPeak(I.orderAckPeak, (p) => [p.ui.accent, p.ui.threat]),
  rallyCourse: steady(I.rallyCourse, (p) => [p.ui.accent]),
  rallyMarker: steady(I.rallyMarker, (p) => [p.ui.accent]),
  readingBar: atPeak(I.readingBar, (p) => [p.ui.friendly, p.ui.sigMid]),
  torpedoDial: steady(I.torpedoDial, (p) => [p.ui.accent]),
  torpedoRun: steady(I.torpedoRun, (p) => [p.ui.accent]),
  ordnanceMark: steady(I.ordnanceMark, (p) => [p.ui.accent]),
  noisemakerRing: {
    quietest: I.noisemakerTrough,
    loudest: I.noisemakerTrough + I.noisemakerSwing,
    colors: (p) => [p.ui.accent],
  },
};

/** A contact's alpha at its fresh peak: its tier's, identical in every palette. */
const T3 = TIER_SHAPE[ResolutionTier.Classification].alpha;
const T4 = TIER_SHAPE[ResolutionTier.Track].alpha;
type ChartTier = ResolutionTier.Classification | ResolutionTier.Track;
const primaries = (p: Palette) => FACTIONS.map((f) => p.faction[f].primary);
/** A contact's colour: its navy's once the tier has earned one, else the tier's. */
const contactColors = (tier: ChartTier) => (p: Palette) => [p.tier[tier].color, ...primaries(p)];
const fauna = (p: Palette) => [p.fauna];

/**
 * A contact's chart outlines at one tier, at its fresh alpha. Each outline is
 * weighed on its own, as rung 5's crystal depth ring is weighed beside its
 * rim. The disc inside a Tier-3 ring, a Tier-4 hull's fill and its sprite,
 * and an animal's body inside its edge are interior. A glyph and a health bar
 * are drawn in the contact's colour and fade with it, so they are weighed as
 * its outlines too; the bar is rimless and weighed by its value fill.
 */
function contactTier(tier: ChartTier, alpha: number, label: string) {
  const own: Record<string, WeighedOutline> = {
    // An animal's edge: every species but the Lampfry draws one.
    [`faunaEdge${label}`]: steady(alpha, fauna),
    [`sounderHalo${label}`]: steady(alpha * A.sounderHaloShare, fauna),
    [`tethers${label}`]: steady(alpha * A.tetherShare, fauna),
    [`raspRing${label}`]: steady(alpha * A.raspRingShare, fauna),
    // The Lampfry is motes and no closed body: rimless, weighed by a mote.
    [`lampfryMote${label}`]: atPeak(alpha * A.faunaBodyShare, fauna),
    [`glyph${label}`]: steady(alpha, primaries),
  };
  if (tier === ResolutionTier.Classification) {
    own[`countRing${label}`] = steady(alpha * A.countRingShare, contactColors(tier));
  } else {
    // The threat-red edge every Tier-4 hull and structure is drawn with.
    own[`edge${label}`] = steady(alpha, (p) => [p.ui.threat]);
    own[`healthBar${label}`] = atPeak(alpha, contactColors(tier));
    // A track with no hull, structure or animal to draw — ordnance — is a
    // disc, in the tier's colour: the server names no navy for ordnance.
    own[`disc${label}`] = atPeak(alpha, (p) => [p.tier[tier].color]);
  }
  return own;
}

/**
 * Every outline rung 7 draws on the chart, weighed at its peak — a contact
 * fresh. Tier 1 and Tier 2 draw only the column, an edgeless haze, and are
 * not weighed (#865).
 *
 * What the conn view draws on rung 7 is not here. An own hull or structure
 * is a lit model, or its baked sprite until the model loads, and own ordnance
 * is a lit body with a lamp: what lands on a pixel depends on the lights, the
 * texture and the view, and no number for it can be taken without a GPU. The
 * chart draws an own hull no stroke of its own — its ink about one is rung 6 —
 * so of the player's own agents only a construction site's scaffold is
 * weighed here.
 */
export const AGENT_OUTLINES: Readonly<Record<string, WeighedOutline>> = {
  ...contactTier(ResolutionTier.Classification, T3, 'Tier3'),
  ...contactTier(ResolutionTier.Track, T4, 'Tier4'),
  scaffold: steady(A.scaffold, (p) => FACTIONS.map((f) => p.faction[f].accent)),
};

// ------------------------------------------------------------- weighing

/** Rec. 709 on the encoded bytes — how the palette tests and a screenshot measure. */
export function encodedLuminance(color: number): number {
  return (
    (0.2126 * ((color >> 16) & 0xff) + 0.7152 * ((color >> 8) & 0xff) + 0.0722 * (color & 0xff)) /
    255
  );
}

/**
 * How far a stroke of `color` at `alpha` lifts a pixel of `ground`, in
 * encoded luminance, blended normally. Linear in the ground's luminance, so
 * checking the darkest and the palest ground checks every ground between.
 */
export function strokeLift(color: number, alpha: number, ground: number): number {
  return alpha * (encodedLuminance(color) - encodedLuminance(ground));
}

/** three.js's sRGB decode (`ColorManagement`), which `new Color(hex)` applies. */
function decode(channel: number): number {
  const c = channel / 255;
  return c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4);
}

/** The fragment's `sRGBTransferOETF`, constants as the shader writes them. */
function encode(linear: number): number {
  return linear <= 0.0031308 ? linear * 12.92 : Math.pow(linear, 0.41666) * 1.055 - 0.055;
}

/**
 * What an additive dot of `color` at `gain` adds to each encoded channel,
 * 0–1: the colour decoded, scaled in linear light, and encoded again.
 */
export function additiveChannels(color: number, gain: number): [number, number, number] {
  return [16, 8, 0].map((shift) => encode(decode((color >> shift) & 0xff) * gain)) as [
    number,
    number,
    number,
  ];
}

/**
 * How far an additive dot of `color` at `gain` lifts a pixel of `ground`, in
 * encoded luminance. Each channel adds, and clips at white. Until one clips
 * the lift is the same over every ground, which ladder.test.ts holds for every
 * ground the map draws.
 */
export function additiveLift(color: number, gain: number, ground: number): number {
  const add = additiveChannels(color, gain);
  const weights = [0.2126, 0.7152, 0.0722];
  let lift = 0;
  [16, 8, 0].forEach((shift, i) => {
    const g = ((ground >> shift) & 0xff) / 255;
    lift += weights[i]! * (Math.min(1, g + add[i]!) - g);
  });
  return lift;
}

/** How far one stroke lifts `ground`, by its own blend. */
export function liftOf(stroke: Stroke, ground: number): number {
  return stroke.blend === 'additive'
    ? additiveLift(stroke.color, stroke.alpha, ground)
    : strokeLift(stroke.color, stroke.alpha, ground);
}

/** An outline's strokes at its quietest or its loudest alpha, one per colour. */
export function strokesOf(
  outline: WeighedOutline,
  palette: Palette,
  at: 'quietest' | 'loudest'
): Stroke[] {
  return outline
    .colors(palette)
    .map((color) => ({ color, alpha: outline[at], blend: outline.blend ?? 'normal' }));
}

/** The least an outline lifts `ground`: its quietest alpha, in its quietest colour. */
export function quietestLift(outline: WeighedOutline, palette: Palette, ground: number): number {
  return Math.min(...strokesOf(outline, palette, 'quietest').map((s) => liftOf(s, ground)));
}

/** The most an outline lifts `ground`: its loudest alpha, in its loudest colour. */
export function loudestLift(outline: WeighedOutline, palette: Palette, ground: number): number {
  return Math.max(...strokesOf(outline, palette, 'loudest').map((s) => liftOf(s, ground)));
}

/** A rung's floor over one ground: the least lift any of its outlines gives. */
export function floorLift(
  outlines: Readonly<Record<string, WeighedOutline>>,
  palette: Palette,
  ground: number
): number {
  return Math.min(
    ...Object.values(outlines).map((outline) => quietestLift(outline, palette, ground))
  );
}

/**
 * The unselected detection ring's least lift over one ground, across the two
 * colours it is drawn in.
 */
export function unselectedRingLift(palette: Palette, ground: number): number {
  return quietestLift(INSTRUMENT_OUTLINES.unselectedRing!, palette, ground);
}

/** Rung 6's floor over one ground: the least lift any of its outlines gives. */
export function instrumentFloorLift(palette: Palette, ground: number): number {
  return floorLift(INSTRUMENT_OUTLINES, palette, ground);
}

/** Rung 7's floor on the chart over one ground. */
export function agentFloorLift(palette: Palette, ground: number): number {
  return floorLift(AGENT_OUTLINES, palette, ground);
}

/**
 * The four strokes rung 5's floor is taken from: its quiet rims. The floor the
 * ink is held under, and the one rung 6 clears. Residue's arc at a faint
 * mark's own peak lifts less, and ladder.test.ts records it rather than
 * lowering this floor (docs/map-visuals.md §10).
 */
export function furnitureFloorStrokes(palette: Palette): Stroke[] {
  return [
    { color: palette.ui.accent, alpha: FURNITURE_OUTLINE_ALPHA.kelpRimIdle },
    { color: palette.fauna, alpha: FURNITURE_OUTLINE_ALPHA.jellyRim },
    { color: palette.ui.threat, alpha: FURNITURE_OUTLINE_ALPHA.hazardRimDormant },
    { color: palette.ui.threat, alpha: FURNITURE_OUTLINE_ALPHA.inertSiteRim },
  ];
}

/** Rung 5's floor over one ground: the least lift any of its four quiet outlines gives. */
export function furnitureFloorLift(palette: Palette, ground: number): number {
  return Math.min(...furnitureFloorStrokes(palette).map((s) => liftOf(s, ground)));
}
