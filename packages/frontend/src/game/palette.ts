/**
 * Colour language, transcribed from docs/art-direction.md and the four palette
 * tables in docs/style-neon-noir.md.
 *
 * Kept in one module so the renderer never hardcodes a hex value: the art
 * direction is a design document, and the code should be diffable against it.
 *
 * ## Why the exported tables are mutable
 *
 * docs/ui-ux.md §11 ships three colour-vision palettes beside the standard
 * one, and a palette is a *global rendering choice* rather than a per-call
 * argument: every hex on screen belongs to exactly one of the four tables at
 * any moment, and there is exactly one renderer alive per page (GameCanvas
 * mounts one and tears it down on exit). So `setActivePalette` swaps the
 * bindings and every importer follows, rather than threading a palette
 * parameter through the renderer, both bakes, the silhouettes and the lobby.
 *
 * Two things this costs, and how each is paid:
 *
 * - **Values captured at import time go stale.** Nothing here may be copied
 *   into a module constant elsewhere; read `UI.threat` at draw time, never
 *   `const THREAT = UI.threat`.
 * - **Baked textures go stale.** `hullTextures.ts` and `structureTextures.ts`
 *   cache by faction, so their keys carry `ACTIVE_PALETTE.name` too — a
 *   palette change bakes a new sprite instead of showing the old ink.
 */

import { Biome, Faction, ResolutionTier, ResourceKind } from '@echoes/shared';

/** The four palettes of docs/ui-ux.md §11. */
export type PaletteName = 'standard' | 'deuteranopia' | 'protanopia' | 'tritanopia';

export const PALETTE_NAMES: readonly PaletteName[] = [
  'standard',
  'deuteranopia',
  'protanopia',
  'tritanopia',
];

/** What the settings screen calls each one. */
export const PALETTE_LABEL: Record<PaletteName, string> = {
  standard: 'Standard',
  deuteranopia: 'Deuteranopia',
  protanopia: 'Protanopia',
  tritanopia: 'Tritanopia',
};

export interface FactionInk {
  primary: number;
  accent: number;
  glow: number;
}

/** Only the colours that carry information. Chrome is shared — see `CHROME`. */
export interface UiInk {
  background: number;
  glass: number;
  glassStroke: number;
  accent: number;
  text: number;
  textDim: number;
  friendly: number;
  sigLow: number;
  sigMid: number;
  sigHigh: number;
  threat: number;
}

type ContactTier = Exclude<ResolutionTier, ResolutionTier.Silent>;

export interface TierStyle {
  color: number;
  alpha: number;
  radius: number;
  label: string;
}

export interface Palette {
  name: PaletteName;
  faction: Record<Faction, FactionInk>;
  tier: Record<ContactTier, TierStyle>;
  resource: Record<ResourceKind, number>;
  /**
   * A classified creature. Only ever drawn from Tier 3, and always as an
   * organic silhouette — the colour makes it findable, the shape identifies it.
   */
  fauna: number;
  ui: UiInk;
}

/**
 * The fidelity encoding, identical in every palette.
 *
 * Size, alpha and edge hardness are how a tier is read *before* colour is
 * consulted at all (docs/ui-ux.md §11), which is what lets the palettes below
 * move hue so freely. A palette that touched these numbers would be re-encoding
 * the Asymmetric Fidelity Law rather than recolouring it, so they live here,
 * once, and the tables supply only ink.
 */
const TIER_SHAPE: Record<ContactTier, Omit<TierStyle, 'color'>> = {
  [ResolutionTier.Contact]: { alpha: 0.18, radius: 90, label: 'contact' },
  [ResolutionTier.Bearing]: { alpha: 0.32, radius: 46, label: 'bearing' },
  [ResolutionTier.Classification]: { alpha: 0.55, radius: 26, label: 'classified' },
  [ResolutionTier.Track]: { alpha: 0.9, radius: 16, label: 'track' },
};

function tiers(ink: Record<ContactTier, number>): Record<ContactTier, TierStyle> {
  return {
    [ResolutionTier.Contact]: {
      color: ink[ResolutionTier.Contact],
      ...TIER_SHAPE[ResolutionTier.Contact],
    },
    [ResolutionTier.Bearing]: {
      color: ink[ResolutionTier.Bearing],
      ...TIER_SHAPE[ResolutionTier.Bearing],
    },
    [ResolutionTier.Classification]: {
      color: ink[ResolutionTier.Classification],
      ...TIER_SHAPE[ResolutionTier.Classification],
    },
    [ResolutionTier.Track]: {
      color: ink[ResolutionTier.Track],
      ...TIER_SHAPE[ResolutionTier.Track],
    },
  };
}

/**
 * Chrome — the panel voice, shared by all four palettes.
 *
 * "Cyan tells you, magenta asks you" survives every deficiency §11 names: under
 * the red-green palettes both sit on the preserved blue axis, and under
 * tritanopia cyan reads cool while magenta reads warm. A bevel is not
 * information, so it does not move (docs/style-neon-noir.md).
 */
const CHROME = {
  background: 0x03080e,
  glass: 0x0d1c28,
  /** Panel bevel: the "chrome voice". An edge colour, never a fill. */
  glassStroke: 0xff3da6,
  /** Interface voice: headers, holographic linework, readout names. */
  accent: 0x35e0ff,
  text: 0xd6e6f0,
  textDim: 0x6f8a9c,
} as const;

/**
 * Standard — docs/art-direction.md "Faction Art Styles" and
 * docs/style-neon-noir.md "Core palette".
 *
 * `glow` is the colour a faction's lights burn: bioluminescence, deck lamps,
 * crystal shine. It equals `accent` except for Bathyarch, whose accent is
 * iron grey — cladding, not light. Their lamps are hazard amber (factions.md);
 * a grey glow would read as dirt on the hull.
 */
const STANDARD: Palette = {
  name: 'standard',
  faction: {
    [Faction.Bathyarch]: { primary: 0xf2b233, accent: 0x8c8378, glow: 0xf2b233 },
    [Faction.Pelagia]: { primary: 0x1fa67a, accent: 0x8fe36b, glow: 0x8fe36b },
    [Faction.Directorate]: { primary: 0x7a1b2e, accent: 0xc2465e, glow: 0xc2465e },
    [Faction.Hadron]: { primary: 0x8b5cf6, accent: 0xc9a6ff, glow: 0xc9a6ff },
  },
  tier: tiers({
    [ResolutionTier.Contact]: 0x4a7a8c,
    [ResolutionTier.Bearing]: 0x6fa8bf,
    [ResolutionTier.Classification]: 0xa8d0e0,
    [ResolutionTier.Track]: 0xff6b5b,
  }),
  resource: {
    [ResourceKind.Nodule]: 0xf2b233,
    [ResourceKind.ResonanceCrystal]: 0xb98cff,
  },
  fauna: 0x5fa88a,
  ui: {
    ...CHROME,
    friendly: 0x5fd0c0,
    sigLow: 0x3fa86a,
    sigMid: 0xf2b233,
    sigHigh: 0xe0452f,
    threat: 0xff3b30,
  },
};

/**
 * Deuteranopia — blue and amber; nothing is green, nothing is red.
 *
 * The SIG ramp runs cool -> warm rather than green -> red, so the meter still
 * reads as a temperature; its band label and its number sit beside it either
 * way, which is why colour is free to move this far on that one element.
 * Pelagia's biolight becomes a sky blue, the Directorate takes the dark end of
 * the amber axis, and fauna goes neutral rather than claiming a fifth hue this
 * deficiency does not have.
 */
const DEUTERANOPIA: Palette = {
  name: 'deuteranopia',
  faction: {
    [Faction.Bathyarch]: { primary: 0xf5c542, accent: 0x8c8378, glow: 0xf5c542 },
    [Faction.Pelagia]: { primary: 0x2e9bd6, accent: 0x9be0ff, glow: 0x9be0ff },
    [Faction.Directorate]: { primary: 0x5e3a0f, accent: 0xa8701c, glow: 0xa8701c },
    [Faction.Hadron]: { primary: 0x2323a0, accent: 0x6660d8, glow: 0x6660d8 },
  },
  tier: tiers({
    [ResolutionTier.Contact]: 0x3e6e8a,
    [ResolutionTier.Bearing]: 0x63a2c6,
    [ResolutionTier.Classification]: 0xafd6ec,
    [ResolutionTier.Track]: 0xff8c26,
  }),
  resource: {
    [ResourceKind.Nodule]: 0xf5c542,
    [ResourceKind.ResonanceCrystal]: 0x7fa0f5,
  },
  fauna: 0x6e8c84,
  ui: {
    ...CHROME,
    friendly: 0x5fd0c0,
    sigLow: 0x2f8fd6,
    sigMid: 0xb87e1a,
    sigHigh: 0xffd94a,
    threat: 0xd94010,
  },
};

/**
 * Protanopia — the same axis as deuteranopia, with every hot colour lifted.
 *
 * Deliberately near-identical to the table above: both are red-green
 * deficiencies and both are solved on the blue-amber axis. They diverge only
 * where red was carrying luminance — protanopia dims long wavelengths outright,
 * so the track ink, the SIG high band, the threat colour and the Directorate's
 * ochre all rise. Inventing more difference than that would be decoration.
 */
const PROTANOPIA: Palette = {
  name: 'protanopia',
  faction: {
    [Faction.Bathyarch]: { primary: 0xffcf5c, accent: 0x8c8378, glow: 0xffcf5c },
    [Faction.Pelagia]: { primary: 0x2e9bd6, accent: 0x9be0ff, glow: 0x9be0ff },
    [Faction.Directorate]: { primary: 0x7a5218, accent: 0xc98a2e, glow: 0xc98a2e },
    [Faction.Hadron]: { primary: 0x2323a0, accent: 0x6660d8, glow: 0x6660d8 },
  },
  tier: tiers({
    [ResolutionTier.Contact]: 0x3e6e8a,
    [ResolutionTier.Bearing]: 0x63a2c6,
    [ResolutionTier.Classification]: 0xafd6ec,
    [ResolutionTier.Track]: 0xffb84d,
  }),
  resource: {
    [ResourceKind.Nodule]: 0xffcf5c,
    [ResourceKind.ResonanceCrystal]: 0x7fa0f5,
  },
  fauna: 0x6e8c84,
  ui: {
    ...CHROME,
    friendly: 0x5fd0c0,
    sigLow: 0x2f8fd6,
    sigMid: 0xb87e1a,
    sigHigh: 0xffd94a,
    threat: 0xe06a00,
  },
};

/**
 * Tritanopia — red and green, no yellow, no violet.
 *
 * Nearly the inverse of the two above: this deficiency confuses blue with green
 * and yellow with pink while leaving the red-green axis intact, so crimson and
 * algae teal are already correct and do not move. Bathyarch's sodium lamps go
 * pale rather than saturated (a saturated amber reads pink and would collide
 * with the Directorate), and Hadron's resonance violet becomes a dark
 * instrument teal, with Resonance Crystal following it into cold cyan — the
 * resource and the faction made of it should read as the same substance.
 */
const TRITANOPIA: Palette = {
  name: 'tritanopia',
  faction: {
    [Faction.Bathyarch]: { primary: 0xf0e0c8, accent: 0x8c8378, glow: 0xf0e0c8 },
    [Faction.Pelagia]: { primary: 0x1fa67a, accent: 0x8fe36b, glow: 0x8fe36b },
    [Faction.Directorate]: { primary: 0xa02030, accent: 0xe0566b, glow: 0xe0566b },
    [Faction.Hadron]: { primary: 0x0a3348, accent: 0x1f6ea0, glow: 0x1f6ea0 },
  },
  tier: tiers({
    [ResolutionTier.Contact]: 0x2e6a72,
    [ResolutionTier.Bearing]: 0x4fa6a8,
    [ResolutionTier.Classification]: 0xa6e0e4,
    [ResolutionTier.Track]: 0xff4a4a,
  }),
  resource: {
    [ResourceKind.Nodule]: 0xf0e0c8,
    [ResourceKind.ResonanceCrystal]: 0x7fb8ff,
  },
  fauna: 0x7a7a88,
  ui: {
    ...CHROME,
    friendly: 0x5fd0c0,
    sigLow: 0x3fa8a0,
    sigMid: 0x9c4634,
    sigHigh: 0xff3b30,
    threat: 0xff3b30,
  },
};

export const PALETTES: Record<PaletteName, Palette> = {
  standard: STANDARD,
  deuteranopia: DEUTERANOPIA,
  protanopia: PROTANOPIA,
  tritanopia: TRITANOPIA,
};

/** Coerce anything (a stored setting, a query string) to a palette. */
export function paletteFor(name: unknown): Palette {
  return typeof name === 'string' && name in PALETTES
    ? PALETTES[name as PaletteName]
    : PALETTES.standard;
}

// --- The active palette ------------------------------------------------------
//
// Live bindings, reassigned together. See the module header for why these are
// mutable and what that costs.

export let ACTIVE_PALETTE: Palette = STANDARD;

/** Faction palettes — docs/art-direction.md "Faction Art Styles". */
export let FACTION_PALETTE: Record<Faction, FactionInk> = STANDARD.faction;

/**
 * How each resolution tier renders.
 *
 * Fidelity is the whole point: the visual precision of a contact must match the
 * informational precision the player actually earned. A crisp dot for a Tier-1
 * smudge would be a lie the UI tells on the server's behalf.
 */
export let TIER_STYLE: Record<ContactTier, TierStyle> = STANDARD.tier;

/**
 * Resource field colours.
 *
 * Nodules take the amber of ordinary industry; Resonance Crystal takes the
 * Hadron violet the art direction reserves for resonance itself. They must be
 * distinguishable at scope size, because "can I even reach that field" is a
 * different question from "is that field worth the trip" (docs/economy.md §7).
 */
export let RESOURCE_COLOR: Record<ResourceKind, number> = STANDARD.resource;

/**
 * Fauna get a colour of their own, but only from Tier 3.
 *
 * Distinct from every faction palette and from the threat red a track wears:
 * once you know it is an animal, you should know instantly, and you should
 * never mistake it for someone's navy.
 */
export let FAUNA_COLOR: number = STANDARD.fauna;

/**
 * HUD chrome — neon-noir, transcribed from docs/style-neon-noir.md.
 * Cyan tells you, magenta asks you, red warns you.
 */
export let UI: UiInk = STANDARD.ui;

/**
 * Swap every ink at once. Returns the palette now in force.
 *
 * Applied from the settings store at match mount and again whenever the store
 * changes, so a palette can be judged from inside the water rather than from a
 * menu — the same rule the rebinder follows.
 */
export function setActivePalette(name: unknown): Palette {
  const palette = paletteFor(name);
  ACTIVE_PALETTE = palette;
  FACTION_PALETTE = palette.faction;
  TIER_STYLE = palette.tier;
  RESOURCE_COLOR = palette.resource;
  FAUNA_COLOR = palette.fauna;
  UI = palette.ui;
  return palette;
}

/**
 * Biome fills. Deliberately low-contrast and desaturated: terrain must read as
 * depth and fog, and never compete with contacts for attention. "RTS
 * readability > realism."
 *
 * Shared by all four palettes on purpose (docs/style-neon-noir.md): these sit
 * at 5–10% luminance and carry no hue-only meaning — propagation is read from
 * the overlay and the numbers, never from the tint.
 */
export const BIOME_COLOR: Record<Biome, number> = {
  [Biome.OpenWater]: 0x0a1a2a,
  [Biome.ThermalVein]: 0x3d1a0e,
  [Biome.KelpForest]: 0x0e2a22,
  [Biome.AbyssalTrench]: 0x05080d,
  [Biome.ResonanceField]: 0x241b3a,
  [Biome.CoralRuins]: 0x17242a,
};

/**
 * Shade a biome fill by how deep the water is over it.
 *
 * docs/art-direction.md: "use gradients to show depth: dark -> darker -> pitch
 * black", and the sea floor section applies that to the map itself. The biome
 * keeps its hue — a plateau in kelp is still kelp-green, only paler — because
 * hue belongs to the biome and the biome is what sound is priced by. Only the
 * luminance moves, which is the same trick the hull bake uses to keep a shared
 * shape asset out of any one faction's palette.
 *
 * `shallowest` and `deepest` bracket the map's own range rather than the
 * ruleset's, so a shallow map still reads as terrain instead of as one flat
 * wash of near-black.
 */
export function depthShade(color: number, floorM: number, shallowest: number, deepest: number) {
  const span = deepest - shallowest;
  // A flat map has nothing to say about depth, so it says nothing.
  if (span <= 0) return color;
  const t = Math.min(1, Math.max(0, (floorM - shallowest) / span));
  // Darkens only. The authored biome fill is the *shallow* end and nothing is
  // ever drawn brighter than it: those fills are deliberately low-contrast and
  // desaturated so terrain never competes with a contact, and a shading pass
  // that lifted them would be quietly overruling that decision — which it did,
  // in the first version of this, turning a kelp plateau into the loudest thing
  // on screen. Deep ground is pushed down toward black without reaching it,
  // because pure black reads as a hole in the map rather than as deep water.
  const gain = 1 - t * 0.45;
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * gain));
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * gain));
  const b = Math.min(255, Math.round((color & 0xff) * gain));
  return (r << 16) | (g << 8) | b;
}

/** Interpolate the SIG meter colour. docs/art-direction.md UI requirements. */
export function sigColor(sig: number): number {
  if (sig < 30) return UI.sigLow;
  if (sig < 65) return UI.sigMid;
  return UI.sigHigh;
}
