/**
 * Colour language, transcribed from docs/art-direction.md.
 *
 * Kept in one module so the renderer never hardcodes a hex value: the art
 * direction is a design document, and the code should be diffable against it.
 */

import { Biome, Faction, ResolutionTier, ResourceKind } from '@echoes/shared';

/**
 * Faction palettes — docs/art-direction.md "Faction Art Styles".
 *
 * `glow` is the colour a faction's lights burn: bioluminescence, deck lamps,
 * crystal shine. It equals `accent` except for Bathyarch, whose accent is
 * iron grey — cladding, not light. Their lamps are hazard amber (factions.md);
 * a grey glow would read as dirt on the hull.
 */
export const FACTION_PALETTE: Record<Faction, { primary: number; accent: number; glow: number }> = {
  [Faction.Bathyarch]: { primary: 0xf2b233, accent: 0x8c8378, glow: 0xf2b233 },
  [Faction.Pelagia]: { primary: 0x1fa67a, accent: 0x8fe36b, glow: 0x8fe36b },
  [Faction.Directorate]: { primary: 0x7a1b2e, accent: 0xc2465e, glow: 0xc2465e },
  [Faction.Hadron]: { primary: 0x8b5cf6, accent: 0xc9a6ff, glow: 0xc9a6ff },
};

/**
 * Biome fills. Deliberately low-contrast and desaturated: terrain must read as
 * depth and fog, and never compete with contacts for attention. "RTS
 * readability > realism."
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

/**
 * How each resolution tier renders.
 *
 * Fidelity is the whole point: the visual precision of a contact must match the
 * informational precision the player actually earned. A crisp dot for a Tier-1
 * smudge would be a lie the UI tells on the server's behalf.
 */
export const TIER_STYLE: Record<
  Exclude<ResolutionTier, ResolutionTier.Silent>,
  { color: number; alpha: number; radius: number; label: string }
> = {
  [ResolutionTier.Contact]: { color: 0x4a7a8c, alpha: 0.18, radius: 90, label: 'contact' },
  [ResolutionTier.Bearing]: { color: 0x6fa8bf, alpha: 0.32, radius: 46, label: 'bearing' },
  [ResolutionTier.Classification]: {
    color: 0xa8d0e0,
    alpha: 0.55,
    radius: 26,
    label: 'classified',
  },
  [ResolutionTier.Track]: { color: 0xff6b5b, alpha: 0.9, radius: 16, label: 'track' },
};

/**
 * Resource field colours.
 *
 * Nodules take the amber of ordinary industry; Resonance Crystal takes the
 * Hadron violet the art direction reserves for resonance itself. They must be
 * distinguishable at scope size, because "can I even reach that field" is a
 * different question from "is that field worth the trip" (docs/economy.md §7).
 */
export const RESOURCE_COLOR: Record<ResourceKind, number> = {
  [ResourceKind.Nodule]: 0xf2b233,
  [ResourceKind.ResonanceCrystal]: 0xb98cff,
};

/**
 * HUD chrome — neon-noir, transcribed from docs/style-neon-noir.md.
 * Cyan tells you, magenta asks you, red warns you.
 */
export const UI = {
  background: 0x03080e,
  glass: 0x0d1c28,
  /** Panel bevel: the "chrome voice". An edge colour, never a fill. */
  glassStroke: 0xff3da6,
  /** Interface voice: headers, holographic linework, readout names. */
  accent: 0x35e0ff,
  text: 0xd6e6f0,
  textDim: 0x6f8a9c,
  /** Own units. */
  friendly: 0x5fd0c0,
  /** The SIG meter shifts amber -> red as you get louder. */
  sigLow: 0x3fa86a,
  sigMid: 0xf2b233,
  sigHigh: 0xe0452f,
  /** Ping preview and other "you are about to be seen" warnings. */
  threat: 0xff3b30,
} as const;

/** Interpolate the SIG meter colour. docs/art-direction.md UI requirements. */
export function sigColor(sig: number): number {
  if (sig < 30) return UI.sigLow;
  if (sig < 65) return UI.sigMid;
  return UI.sigHigh;
}
