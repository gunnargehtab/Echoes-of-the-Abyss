// Headless render harness for the dream loop.
// Serves the repo root, opens a page in Chromium with software WebGL (SwiftShader),
// waits for window.__rendered and saves the canvas pixels (no screenshot scaling).
//
//   node tools/render.mjs --page=prototypes/keyart-dream-loop/index.html --scale=0.5 --frames=16 --out=renders/x.jpg
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..'); // repo root
const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const target = args.page || 'prototypes/keyart-dream-loop/index.html';
const scale = args.scale || '0.5', frames = args.frames || '16';
const out = path.resolve(args.out || 'render.png');
const mime = out.endsWith('.jpg') ? 'image/jpeg' : 'image/png';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };

const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log(`[${m.type()}]`, m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));

const t0 = Date.now();
await page.goto(`http://127.0.0.1:${server.address().port}/${encodeURI(target)}?scale=${scale}&frames=${frames}`);
const progress = setInterval(() => page.evaluate(() => document.getElementById('prog')?.style.width)
  .then(w => console.log(`  ${((Date.now() - t0) / 1e3).toFixed(0)}s  ${w || '…'}`), () => {}), 60e3);
await page.waitForFunction(() => window.__rendered === true, null, { timeout: 60 * 60e3, polling: 500 });
clearInterval(progress);
const data = await page.evaluate(t => document.querySelector('canvas').toDataURL(t, 0.92), mime);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
console.log(`${path.relative(process.cwd(), out)}  scale=${scale} frames=${frames}  ${((Date.now() - t0) / 1e3).toFixed(1)}s`);
await browser.close();
server.close();
