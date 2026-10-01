/**
 * The lamp halo's numbers and its pure arithmetic — docs/art-direction.md,
 * "Lamp halo — SPEC". Three-free, so node:test holds it without a context.
 *
 * Each own entity carries one halo energy, set by its live SIG and nothing
 * else, and its lamp sites share it by area times their resting luminance. A
 * model's size and lit area therefore never change its total: a source built
 * from the lamps' displayed light would order the halo by lit area instead,
 * and #1001's readings put the SIG-25 Foundry at 91 times a SIG-64 Caisson.
 */
import { haloGain } from './glow.ts';

/**
 * TUNABLE — the SPEC's halo numbers, approved on frames from the named GPU
 * before the default turns on. Frontend-only: no other package reads them.
 */
export const LAMP_HALO = {
  /** A SIG-35 entity's halo carries the light of this much lamp at full ink, m². */
  ENERGY_M2: 20,
  /** The composite's ceiling on the field's brightest channel, linear (54 % encoded). */
  CEILING: 0.25,
  /** Linear (5 % encoded): below this a halo ends rather than hazing the water. */
  TOE: 0.004,
  /** How the three spread levels sum in the composite, at 1/2, 1/4 and 1/8. */
  LEVEL_WEIGHTS: [0.6, 0.3, 0.1] as const,
  /** The blur's σ, in a level's texels at pixel ratio 1. */
  KERNEL_SIGMA_TEXELS: 1.69,
  /** No splat is narrower than this, in drawing-buffer pixels. */
  MIN_SIGMA_PX: 0.6,
  /** A splat sits this far in front of its site, times the draw scale, metres. */
  BIAS_M: 2,
  /** At most this many lamp sites are drawn; the faintest drop first. */
  SITE_CAP: 1024,
} as const;

/** TUNABLE — whether "default" in Settings means on. Lands off (SPEC). */
export const LAMP_HALOS_DEFAULT = false;

/**
 * An entity's halo energy at its live SIG and the view's draw scale, in m² of
 * lamp at full ink. Its lamp area is no input.
 */
export function entityHaloEnergy(liveSig: number, drawScale: number): number {
  return LAMP_HALO.ENERGY_M2 * haloGain(liveSig) * drawScale * drawScale;
}

/**
 * Each site's share of its entity's energy: area times resting luminance,
 * normalised to sum to 1. An entity whose sites carry no light shares nothing.
 */
export function siteShares(sites: readonly { area: number; luminance: number }[]): number[] {
  const weights = sites.map((s) => Math.max(0, s.area) * Math.max(0, s.luminance));
  const total = weights.reduce((a, b) => a + b, 0);
  return total > 0 ? weights.map((w) => w / total) : weights.map(() => 0);
}

/**
 * The sites a frame draws: at most `cap`, the brightest on screen kept and the
 * faintest dropped. Dropped light is lost, not redistributed.
 */
export function capSites<T extends { energy: number }>(
  sites: readonly T[],
  cap: number = LAMP_HALO.SITE_CAP
): { kept: T[]; dropped: number } {
  if (sites.length <= cap) return { kept: [...sites], dropped: 0 };
  const kept = [...sites].sort((a, b) => b.energy - a.energy).slice(0, cap);
  return { kept, dropped: sites.length - cap };
}
