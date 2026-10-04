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
  /**
   * Past this live SIG the energy stops rising, so a ping (95) carries what SIG
   * 85 does: 35 times SIG 35, not 73. Uncapped, a pinging hull's halo reached
   * its own collar, which kept 3:1 on 86 % of its core against the SPEC's 90.
   */
  ENERGY_SIG_CAP: 85,
} as const;

/** TUNABLE — whether "default" in Settings means on. Lands off (SPEC). */
export const LAMP_HALOS_DEFAULT = false;

/**
 * An entity's halo energy at its live SIG and the view's draw scale, in m² of
 * lamp at full ink. Its lamp area is no input.
 */
export function entityHaloEnergy(liveSig: number, drawScale: number): number {
  const sig = Math.min(liveSig, LAMP_HALO.ENERGY_SIG_CAP);
  return LAMP_HALO.ENERGY_M2 * haloGain(sig) * drawScale * drawScale;
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

/**
 * The blur's half-kernel at a pixel ratio: σ = KERNEL_SIGMA_TEXELS × ratio in a
 * level's texels, taps one texel apart out to at least 2.3σ, normalised over
 * both sides. Stepping taps by the ratio instead would comb a level that is
 * not yet blurred, so σ scales and the taps do not.
 */
export function blurWeights(pixelRatio: number): number[] {
  const sigma = LAMP_HALO.KERNEL_SIGMA_TEXELS * pixelRatio;
  const taps = Math.ceil(2.3 * sigma);
  const raw = Array.from({ length: taps + 1 }, (_, i) => Math.exp(-(i * i) / (2 * sigma * sigma)));
  const total = raw[0]! + 2 * raw.slice(1).reduce((a, b) => a + b, 0);
  return raw.map((w) => w / total);
}

/**
 * Each spread level's width as σ in drawing-buffer pixels: every level is a
 * 2 × 2 box downsample of the one before it, then a blur at its own texel, so
 * the widths compound, the box's variance included. At ratio 1 that is 3.42,
 * 7.64 and 15.66 px, within 0.1 px of the SPEC's figures; derived here and
 * stored nowhere.
 */
export function levelSigmasPx(pixelRatio: number): number[] {
  const sigmas: number[] = [];
  let variance = 0;
  for (let level = 1; level <= LAMP_HALO.LEVEL_WEIGHTS.length; level++) {
    const texel = 2 ** level;
    // The box averages two texels of the level above, half this one apart.
    variance += (texel / 4) ** 2 + (LAMP_HALO.KERNEL_SIGMA_TEXELS * pixelRatio * texel) ** 2;
    sigmas.push(Math.sqrt(variance));
  }
  return sigmas;
}

/**
 * The brightest the composited field could get from `lightPx2` (an entity's
 * whole light in drawing-buffer px² of full ink) gathered at one pixel. Below
 * the toe the entity draws no splat: it would composite to nothing.
 */
export function peakField(lightPx2: number, pixelRatio: number): number {
  const sigmas = levelSigmasPx(pixelRatio);
  return LAMP_HALO.LEVEL_WEIGHTS.reduce(
    (sum, weight, k) => sum + (lightPx2 * weight) / (2 * Math.PI * sigmas[k]! ** 2),
    0
  );
}
