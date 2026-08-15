/**
 * Colour language, transcribed from docs/art-direction.md.
 *
 * Kept in one module so the renderer never hardcodes a hex value: the art
 * direction is a design document, and the code should be diffable against it.
 */

import { Biome, Faction, ResolutionTier } from '@echoes/shared';

/** Faction palettes — docs/art-direction.md "Faction Art Styles". */
export const FACTION_PALETTE: Record<Faction, { primary: number; accent: number }> = {
  [Faction.Bathyarch]: { primary: 0xf2b233, accent: 0x8c8378 },
  [Faction.Pelagia]: { primary: 0x1fa67a, accent: 0x8fe36b },
  [Faction.Directorate]: { primary: 0x7a1b2e, accent: 0xc2465e },
  [Faction.Hadron]: { primary: 0x8b5cf6, accent: 0xc9a6ff },
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

/** HUD chrome — "transparent glass panels, soft blue holographic overlays". */
export const UI = {
  background: 0x03080e,
  glass: 0x0d1c28,
  glassStroke: 0x2b5568,
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
