// Bundles the prototype into one self-contained HTML file: three.js + scene modules
// inlined as a single minified module script (no network, no blob/importmap loader).
//
//   node tools/build-offline.mjs ["Output name.html"]
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const proto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendor = path.resolve(proto, 'vendor');
const map = {
  'three-core': `${vendor}/three.core.js`, 'three': `${vendor}/three.module.js`,
  'abyss-engine': `${proto}/src/engine.js`, 'abyss-tex': `${proto}/src/tex.js`, 'abyss-models': `${proto}/src/models.js`, 'abyss-life': `${proto}/src/life.js`,
};
const res = await build({
  entryPoints: [`${proto}/src/main.js`], bundle: true, format: 'esm', minify: true, write: false, target: 'es2022', legalComments: 'none',
  plugins: [{ name: 'importmap', setup(b) { b.onResolve({ filter: /^(three|three-core|abyss-[a-z]+)$/ }, a => ({ path: map[a.path] })); } }],
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = fs.readFileSync(`${proto}/index.html`, 'utf8')
  .replace(/<!-- Dev entry[\s\S]*?<\/script>\n/, '')
  .replace('<script type="module" src="./src/main.js"></script>', () => `<script type="module">${js}</script>`);
const dest = path.resolve(proto, process.argv[2] || 'Echoes of the Abyss 16x9 - Dream Loop.html');
fs.writeFileSync(dest, html);
console.log(path.relative(process.cwd(), dest), `${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
