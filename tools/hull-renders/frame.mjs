/**
 * The game's frame, as scene.html draws a hull portrait with it (#1015,
 * docs/art-direction.md "Hull portraits"): the conn view's own lamp ink and
 * lamp core, its glow after the tone curve, and the lamp halo, imported from
 * packages/frontend rather than written a second time.
 *
 * render.mjs bundles this with esbuild for the page and serves it as
 * /frame.js. three stays external, so the page's importmap hands this bundle
 * and the page one three, the r169 the client ships; two would fail every
 * `instanceof Mesh` the halo's gather asks. @echoes/shared resolves to its
 * build output, so `npm run build:shared` runs before a render, as before any
 * workspace script.
 */
export { Faction, TRIM_SHEET } from '@echoes/shared';
export { PALETTES } from '../../packages/frontend/src/game/palette.ts';
export { inkLamp } from '../../packages/frontend/src/game/lampInk.ts';
export { keepGlowOutsideToneMapping } from '../../packages/frontend/src/game/modelLighting.ts';
export { LampHaloPass, markLamp } from '../../packages/frontend/src/game/lampHaloPass.ts';
export { gatherHaloSplats } from '../../packages/frontend/src/game/haloSource.ts';
export { LAMP_HALO } from '../../packages/frontend/src/game/lampHalo.ts';
export {
  CONN_FOV_DEG,
  groundPxPerM,
  hullReadabilityScale,
} from '../../packages/frontend/src/game/readability.ts';
