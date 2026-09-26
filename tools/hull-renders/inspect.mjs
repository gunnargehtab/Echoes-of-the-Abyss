/**
 * Photograph a model on a lit table, before and after, from the same cameras.
 *
 * render.mjs makes key art: black water, noir plate, a coloured rim. That rig
 * hides geometry on purpose, which is why #907's Derrick before-and-after
 * came back as two identical dark frames around a change that moved a rail
 * 70 m and a house 5.5 m. A shape review needs the opposite: authored
 * materials under a neutral key, fill and rim, a floor to catch a contact
 * shadow, and cameras that do not move between the two files.
 *
 *   node tools/hull-renders/inspect.mjs refinery-directorate --before c8b56a1
 *   node tools/hull-renders/inspect.mjs derrick --before HEAD~3 \
 *     --view hero:38:24 --view rail:90:40:0.6:cradle_rail --out derrick.png
 *
 * The model is docs/concept-art/models/<slug>.glb in the working tree, or a
 * path. `--before <rev>` adds the same file as it stood at a git revision,
 * read with `git show`, as the left column. `--view id:az:el[:zoom][:parts]`
 * adds a camera: bearing and elevation in degrees, bearing 0 on +X (the bow)
 * and 90 on +Z (starboard); `zoom` multiplies the fitted distance; `parts`
 * is a `+`-joined list of node names (a name also matches its `_n`
 * children) whose union box the camera frames instead of the whole model.
 * The box is the union across every model on the sheet, so the cameras do
 * not move between them; `--own` frames each model on its own parts
 * instead, for a close-up of a part that moved.
 * With no --view the sheet is a bow three-quarter, the conn camera's home
 * view — 55° of pitch from +Z, which is where yaw 0 puts the eye
 * (PerspectiveView.ts `applyCamera`) — a stern three-quarter, and a plan
 * with +Z at the foot of the frame, as the conn view has it.
 *
 * Not a gate, like render.mjs: a picture informs a review and never passes
 * one. hull-intake and check.mjs measure; this shows.
 */

import { createRequire } from 'node:module';
import { execFileSync, execSync, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const MODELS = join(repo, 'docs/concept-art/models');

// --- args --------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const all = (name) => args.flatMap((a, i) => (a === name && args[i + 1] ? [args[i + 1]] : []));
const BOOLEAN = new Set(['--own']);
const target = args.find(
  (a, i) => !a.startsWith('--') && !(args[i - 1]?.startsWith('--') && !BOOLEAN.has(args[i - 1]))
);
if (!target) {
  console.error('usage: inspect.mjs <slug|file.glb> [--before <rev>] [--view id:az:el[:zoom][:parts]]');
  process.exit(1);
}
const file = target.endsWith('.glb') ? resolve(target) : join(MODELS, `${target}.glb`);
const slug = basename(file, '.glb');
if (!existsSync(file)) {
  console.error(`no model at ${relative(repo, file)}`);
  process.exit(1);
}
const [tileW, tileH] = flag('--size', '960x600').split('x').map(Number);
const before = flag('--before', null);
const out = resolve(flag('--out', `${slug}-inspect.png`));
const title = flag('--title', before ? `${slug}: ${before} → working tree` : slug);
const exposure = Number(flag('--exposure', 1.15));
const floorGap = Number(flag('--floor-gap', 0));
const own = args.includes('--own');

const parseView = (s) => {
  const [id, az, el, zoom, parts] = s.split(':');
  return {
    id,
    az: Number(az),
    el: Number(el),
    zoom: zoom ? Number(zoom) : 0.62,
    focus: parts ? parts.split('+') : [],
  };
};
const views = all('--view').map(parseView);
if (views.length === 0)
  views.push(
    parseView('bow three-quarter:38:24'),
    parseView('conn, 55° pitch:90:55'),
    parseView('stern three-quarter:215:20'),
    parseView('plan:90:89.5')
  );

// --- the files ---------------------------------------------------------------
const scratch = mkdtempSync(join(tmpdir(), 'hull-inspect-'));
const models = [];
if (before) {
  const path = relative(repo, file).split('\\').join('/');
  const blob = execFileSync('git', ['show', `${before}:${path}`], { cwd: repo, maxBuffer: 1 << 28 });
  const at = join(scratch, `before.glb`);
  writeFileSync(at, blob);
  models.push({ id: 'before', label: `before — ${before}`, file: at });
}
models.push({ id: 'after', label: before ? 'after — this tree' : slug, file });
// `--with a,b` adds other models as further columns, for a family read.
for (const other of (flag('--with', '') || '').split(',').filter(Boolean)) {
  const at = other.endsWith('.glb') ? resolve(other) : join(MODELS, `${other}.glb`);
  models.push({ id: basename(at, '.glb'), label: basename(at, '.glb'), file: at });
}

// --- three.js and Playwright, as render.mjs finds them -----------------------
const THREE_VERSION = '0.169.0';
const depsDir = join(tmpdir(), 'hull-intake-deps');
if (!existsSync(join(depsDir, 'node_modules', 'three', 'package.json'))) {
  console.log(`installing three@${THREE_VERSION} into ${depsDir} (first run only)...`);
  mkdirSync(depsDir, { recursive: true });
  const r = spawnSync('npm', ['install', '--no-audit', '--no-fund', `three@${THREE_VERSION}`], {
    cwd: depsDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) process.exit(1);
}
function loadPlaywright() {
  const candidates = ['playwright', 'playwright-core'];
  try {
    const root = execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    if (root.trim()) candidates.push(`${root.trim()}/playwright/index.js`);
  } catch {
    // npm missing; the bare specifiers may still resolve.
  }
  for (const c of candidates) {
    try {
      return require(c);
    } catch {
      continue;
    }
  }
  throw new Error('Could not load Playwright (`npm i -g playwright`).');
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let path = null;
  if (url.pathname === '/inspect.html') path = join(here, 'inspect.html');
  else if (url.pathname.startsWith('/model/')) {
    const m = models.find((x) => `/model/${x.id}.glb` === url.pathname);
    path = m?.file ?? null;
  } else if (url.pathname.startsWith('/deps/')) {
    const candidate = resolve(depsDir, '.' + url.pathname.slice('/deps'.length));
    if (candidate.startsWith(depsDir)) path = candidate;
  }
  if (!path || !existsSync(path)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
  res.end(readFileSync(path));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const port = server.address().port;

const { chromium } = loadPlaywright();
const browser = await chromium.launch({
  // SwiftShader by name, or three gets no WebGL2 context (render.mjs).
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'],
});
try {
  const page = await browser.newPage({ viewport: { width: tileW, height: tileH } });
  page.on('pageerror', (e) => console.error(`page error: ${e.message}`));
  await page.addInitScript((job) => {
    window.__job = job;
  }, {
    width: tileW,
    height: tileH,
    exposure,
    floorGap,
    own,
    views,
    models: models.map((m) => ({ id: m.id, url: `/model/${m.id}.glb` })),
  });
  await page.goto(`http://127.0.0.1:${port}/inspect.html`);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 300000 });
  const error = await page.evaluate(() => window.__error);
  if (error) throw new Error(error);
  const shots = await page.evaluate(() => window.__shots);
  await page.close();

  // The sheet: one row a view, one column a model, labelled, as a page
  // screenshot so the labels are real type rather than pixels drawn by hand.
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const html = `<!doctype html><html><body style="margin:0;background:#0d1117;color:#c9d1d9;
    font:15px/1.4 system-ui,sans-serif;padding:16px;display:inline-block">
    <div style="font-size:19px;font-weight:600;margin-bottom:10px">${esc(title)}</div>
    <table style="border-spacing:8px 6px">
    <tr><td></td>${models.map((m) => `<td style="color:#8b949e">${esc(m.label)}</td>`).join('')}</tr>
    ${views
      .map(
        (v) => `<tr><td style="vertical-align:top;width:130px;color:#8b949e">${esc(v.id)}</td>${models
          .map((m) => `<td><img width="${tileW}" height="${tileH}" src="${shots[`${m.id}/${v.id}`]}"></td>`)
          .join('')}</tr>`
      )
      .join('')}
    </table></body></html>`;
  const sheet = await browser.newPage({ viewport: { width: 400, height: 300 } });
  await sheet.setContent(html);
  await sheet.waitForFunction(() => [...document.images].every((i) => i.complete));
  mkdirSync(dirname(out), { recursive: true });
  const el = await sheet.$('body');
  await el.screenshot({ path: out });
  console.log(`${models.length} model(s) × ${views.length} view(s) → ${relative(process.cwd(), out)}`);
} finally {
  await browser.close();
  server.close();
}
