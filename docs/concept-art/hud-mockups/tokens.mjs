/**
 * The design tokens the mockups draw in, transcribed from the live client so a
 * mockup and the shipped HUD cannot drift into different inks.
 *
 * Sources, and the only sources: `packages/frontend/src/index.css` `:root` for
 * the CSS custom properties, `packages/frontend/src/game/palette.ts` `CHROME`
 * and `STANDARD` for the Pixi side of the same table, and the geometry
 * constants at the head of `packages/frontend/src/game/EchoRenderer.ts`.
 * Nothing here is invented; if a value looks wrong, the client is what to fix.
 */

/** docs/style-neon-noir.md "Core palette" — the blacks, the canvas. */
export const BLACK = {
  void: '#03080e',
  floor: '#070e1a',
  panel: '#0a1424',
  glass: '#0d1c28',
};

/** The neons: cyan tells you, magenta asks you, red warns you. */
export const NEON = {
  cyan: '#35e0ff',
  magenta: '#ff3da6',
  violet: '#8b5cf6',
  amber: '#f2b233',
  red: '#ff3b30',
  teal: '#5fd0c0',
  mouth: '#c9a6ff',
};

export const TEXT = {
  bright: '#d6e6f0',
  dim: '#6f8a9c',
  cyan: '#a8d0e0',
};

/** palette.ts `STANDARD.ui` — the inks that carry information rather than voice. */
export const SIG = { low: '#3fa86a', mid: '#f2b233', high: '#e0452f' };

/** palette.ts `STANDARD.tier` with the alphas and radii of `TIER_SHAPE`. */
export const TIER = {
  1: { ink: '#4a7a8c', alpha: 0.18, label: 'contact' },
  2: { ink: '#6fa8bf', alpha: 0.32, label: 'bearing' },
  3: { ink: '#a8d0e0', alpha: 0.55, label: 'classified' },
  4: { ink: '#ff6b5b', alpha: 0.9, label: 'track' },
};

/** palette.ts `STANDARD.faction` — primary / accent / glow per navy. */
export const FACTION = {
  bathyarch: { primary: '#f2b233', accent: '#8c8378', glow: '#f2b233' },
  pelagia: { primary: '#1fa67a', accent: '#8fe36b', glow: '#8fe36b' },
  directorate: { primary: '#7a1b2e', accent: '#c2465e', glow: '#c2465e' },
  hadron: { primary: '#8b5cf6', accent: '#c9a6ff', glow: '#c9a6ff' },
};

/** FactionGlyph.tsx `PATHS`, on the same 24-unit box. Shape identifies, not hue. */
export const GLYPH = {
  bathyarch: 'M -10 -6 h 20 v 12 h -20 Z',
  pelagia: 'M -10 0 Q 0 -9 10 0 Q 0 9 -10 0 Z',
  directorate: 'M -8 -2.5 L 0 -8 L 8 -2.5 M -8 3 L 0 -2.5 L 8 3 M -8 8.5 L 0 3 L 8 8.5',
  hadron: 'M 0 -11 L 4.5 0 L 0 11 L -4.5 0 Z',
};

export const RESOURCE = { nodule: '#f2b233', crystal: '#b98cff' };
export const BIOME = {
  openWater: '#07131e',
  thermalVein: '#2c130a',
  kelpForest: '#0a1e18',
  abyssalTrench: '#040609',
  resonanceField: '#1a132a',
  coralRuins: '#111a1e',
};
export const VENT_EMBER = '#e06a2b';
export const ROCK_FACE = '#0c1014';
export const ROCK_SHADOW = '#06090d';
export const FAUNA = '#5fa88a';

/** The two voices of docs/style-neon-noir.md "Typography", stacks and all. */
export const FONT = {
  display: "'Big Shoulders Display', 'Arial Narrow', 'Helvetica Neue', Impact, sans-serif",
  data: 'ui-monospace, Consolas, monospace',
};

/** Every artboard is one 1080p frame, the resolution docs/ui-ux.md sizes against. */
export const FRAME = { w: 1920, h: 1080 };
