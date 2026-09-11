/**
 * Node module hooks that supply the two Vite features `node --test` lacks
 * (#443), so the renderer's own modules can be imported by the headless smoke
 * test without a bundler.
 *
 * The client is authored for Vite, and two of its idioms are compile-time
 * transforms rather than runtime APIs:
 *
 *   * `import url from '../assets/hulls/corvette.png'` — Vite emits a URL
 *     string. Node refuses the extension outright.
 *   * `import.meta.glob('.../*.glb', { eager: true })` — Vite expands the call
 *     at build time. Under Node it is a call to a property that does not exist,
 *     and the module throws while evaluating. `import.meta.env` is the same
 *     shape of problem one step earlier: `GameClient.ts` reads
 *     `import.meta.env.VITE_SERVER_URL` at module scope, and a property read on
 *     `undefined` throws before any test body runs.
 *
 * Both are answered here rather than by mocking the modules that use them:
 * the point of the smoke test is that it boots the *real* renderer, and a
 * renderer whose art pipeline has been swapped out is a different renderer.
 * What the shims produce is exactly the state the client is already written to
 * survive — an asset URL that will never decode, and an empty model manifest —
 * which is the vector-fallback path every session runs through for its first
 * frames anyway (see `hullSpriteCanvas`, "every ask until it lands draws
 * vectors").
 *
 * Registered by ./viteAssets.mjs, which package.json's frontend test script
 * passes to node with --import.
 */

/** Everything Vite would hand back as a URL rather than as a module. */
const ASSET =
  /\.(?:png|jpe?g|gif|svg|webp|avif|woff2?|ttf|otf|glb|gltf|mp3|ogg|wav|css)(?:\?.*)?$/i;

/**
 * The two `import.meta` extensions, assigned from inside the module — the only
 * place `import.meta` is writable.
 *
 * `glob` returns nothing, so no roster or environment model is ever offered and
 * every hull draws as its vector shape.
 *
 * `env` is a live view of `process.env`, restricted to the `VITE_` prefix Vite
 * itself exposes. A plain empty object would only ever reproduce one of the
 * three states a build variable can be in, and the other two are where the bugs
 * were: `VITE_SERVER_URL` *set* is what every image does, and set to the *empty
 * string* is what a Dockerfile's `ENV VAR=$ARG` bakes when the argument is not
 * passed — which `??` does not treat as absent (#624). Reading through on every
 * access rather than snapshotting means a test can move the variable between
 * two calls, which is the only way to reach all three from one module instance.
 */
const META_SHIM =
  'import.meta.glob ??= () => ({});' +
  'import.meta.env ??= new Proxy({}, {' +
  '  get: (_t, key) => (typeof key === "string" && key.startsWith("VITE_")' +
  '    ? process.env[key]' +
  '    : undefined),' +
  '  has: (_t, key) => typeof key === "string" && key.startsWith("VITE_") && key in process.env,' +
  '});';

/** Cheap test for whether a module needs the shim at all. */
const USES_META = /import\.meta\.(?:glob|env)/;

export async function resolve(specifier, context, nextResolve) {
  if (!ASSET.test(specifier)) return nextResolve(specifier, context);
  return {
    url: new URL(specifier, context.parentURL).href,
    format: 'module',
    shortCircuit: true,
  };
}

export async function load(url, context, nextLoad) {
  if (ASSET.test(url)) {
    return {
      format: 'module',
      shortCircuit: true,
      source: `export default ${JSON.stringify(url)};`,
    };
  }

  const loaded = await nextLoad(url, context);
  // Only this repository's own TypeScript can contain a Vite transform, and
  // checking the URL first keeps the scan off every dependency's source.
  if (!/\.tsx?$/.test(url)) return loaded;
  if (loaded.source === undefined || loaded.source === null) return loaded;
  const source =
    typeof loaded.source === 'string' ? loaded.source : Buffer.from(loaded.source).toString('utf8');
  if (!USES_META.test(source)) return loaded;

  // Prepended without a newline on purpose: the shim is whole statements, so
  // JS does not care, and every line of the real module keeps the number it
  // has in the file. A stack trace off by one is a bad trade for a newline.
  return { ...loaded, source: META_SHIM + source };
}
