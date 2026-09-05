import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Which vendor chunk a module belongs in, by its resolved id; undefined leaves it to Rollup. */
function vendorChunk(id: string): string | undefined {
  if (id.includes('/node_modules/three/')) return 'three';
  if (/\/node_modules\/(pixi\.js|@pixi)\//.test(id)) return 'pixi';
  if (/\/node_modules\/(react|react-dom|scheduler|colyseus\.js|@colyseus)\//.test(id)) {
    return 'vendor';
  }
  // The bundler's own helpers — CommonJS interop, the preload shim — are
  // virtual modules, and Rollup folds a manual chunk's unclaimed static
  // dependencies into that chunk. Left alone they land in `pixi`, whose
  // dependencies need them, and the entry then preloads all of Pixi to
  // reach a few lines React needs too. Claimed here, they sit with React,
  // which the entry loads anyway. The null byte is Rollup's mark for "no
  // file behind this id".
  if (id.startsWith('\0')) return 'vendor';
  return undefined;
}

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    // The dev server always serves maps; this is the `vite build` output
    // alone. A production bundle ships without them because a map is the
    // source, and the client is a terminal whose only secret is its own
    // shape (#442). `vite build --mode development` keeps them for a build
    // that needs debugging as built.
    sourcemap: mode !== 'production',
    rollupOptions: {
      output: {
        // The two renderers are the bulk of the bundle and only the match
        // screen needs them (App.tsx loads that screen on demand). Naming
        // them as chunks keeps each one one file, cached on its own
        // fingerprint, rather than sharded across whatever imports it first.
        //
        //
        // The framework the menus stand on is a chunk of its own for the same
        // reason, and `vendorChunk` says why it has to claim one more module.
        manualChunks: vendorChunk,
      },
    },
  },
}));
