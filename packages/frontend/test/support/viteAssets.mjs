/**
 * --import entry for the Vite-asset module hooks. See ./viteAssetHooks.mjs for
 * what they do and why the smoke test needs them (#443).
 *
 * Registered after tsx (package.json passes `--import tsx` first), so this
 * chain link is the outer one: it short-circuits asset specifiers before tsx
 * sees them, and post-processes tsx's TypeScript output on the way back.
 */
import { register } from 'node:module';

register('./viteAssetHooks.mjs', import.meta.url);
