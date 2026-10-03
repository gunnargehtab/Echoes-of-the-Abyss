/**
 * The lamp halo's frames, read against "What it must show" in
 * docs/art-direction.md's "Lamp halo — SPEC", as a run-game `--steps` module.
 *
 *   REDUCED_MOTION=1 node .claude/skills/run-game/scripts/drive.mjs --headed \
 *     --channel msedge --url 'http://localhost:5173/?map=ventfront-divide' \
 *     --out <dir> --steps tools/render-stack/halo-frames.mjs
 *
 * `VIEW_DPR=1.5` takes the second ratio and `?mission=prologue-sorrowgate` the
 * second map. Reduced motion holds the sway, the snow and the collar's crackle,
 * so a shot with the HUD canvas and one without it frame the same water; the
 * SPEC keeps the halo under reduced motion. Headed, on a GPU.
 *
 * Exact pairs come from the view's development hook `__perspectiveHaloFrame`:
 * one frame's conn canvas read after the canvas pass, after the halo, and then
 * a mask white wherever an own lamp marked the stencil. `__perspectiveHaloOnly`
 * draws one entity's halo alone, so its light and the area it lifts are its
 * own and never a neighbour's. At capture.mjs's four cameras it reads:
 *
 * - **Darkness**: the conn canvas's share under 10 % encoded luma, before and
 *   after the halo, and the composited frame with the HUD beside it;
 * - **The lamp**: of the pixels the mask covers whole, the share whose every
 *   channel the halo moved by at most one level;
 * - **Loudness order**, at the home and close cameras: each own entity's halo
 *   alone, its light summed in CSS px² of relative luminance, beside its live
 *   SIG and its lamp pixels on screen, since a halo is hidden where its lamp is;
 * - **The collar**, at the home and close cameras: the collar's core pixels,
 *   found with the halo off as the ink the HUD canvas adds, against the water
 *   under them with the HUD canvas hidden, as WCAG contrast, halo off and on;
 *
 * Then, on Ventfront at the close camera, each own hull kind pings in turn:
 * the area its halo alone lifts past 10 % luma at rest and at SIG 95, and the
 * WCAG 2.3.1 flash between the rest and ping frames with every halo on, beside
 * the same pair without the halo. Writes halo-frames.json and a composited
 * shot of every camera with the halo off and on. Not a gate.
 */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { decode } from './lamps.mjs';

const CAMERAS = [
  ['home', 6000, 55],
  ['close', 1800, 55],
  ['low', 3500, 12],
  ['survey', 18000, 88],
];
const COLLAR_CAMERAS = new Set(['home', 'close']);
const SETTLE_MS = 800;

/** Page-side readers over the frames the hook hands back, kept in the page. */
function install() {
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const LUT = Float32Array.from({ length: 256 }, (_, i) => lin(i / 255));
  const rel = (px, i) => 0.2126 * LUT[px[i]] + 0.7152 * LUT[px[i + 1]] + 0.0722 * LUT[px[i + 2]];
  const luma = (px, i) => (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
  const darkShare = (px) => {
    let under = 0;
    for (let i = 0; i < px.length; i += 4) if (luma(px, i) < 0.1) under++;
    return under / (px.length / 4);
  };
  window.__haloRead = {
    frames: {},
    async take(name) {
      const frame = await window.__perspectiveHaloFrame();
      if (frame === null) return null;
      this.frames[name] = frame;
      return { width: frame.width, height: frame.height, state: frame.state };
    },
    darkness(name) {
      const f = this.frames[name];
      return { before: darkShare(f.before), after: darkShare(f.after) };
    },
    /** Pixels the lamp mask touches at all. */
    lampPixels(name) {
      const { mask } = this.frames[name];
      let n = 0;
      for (let i = 0; i < mask.length; i += 4) if (mask[i] > 0) n++;
      return n;
    },
    lamps(name) {
      const { before, after, mask } = this.frames[name];
      let whole = 0;
      let same = 0;
      let edge = 0;
      for (let i = 0; i < mask.length; i += 4) {
        if (mask[i] === 255 && mask[i + 1] === 255 && mask[i + 2] === 255) {
          whole++;
          const moved = Math.max(
            Math.abs(after[i] - before[i]),
            Math.abs(after[i + 1] - before[i + 1]),
            Math.abs(after[i + 2] - before[i + 2])
          );
          if (moved <= 1) same++;
        } else if (mask[i] > 0) {
          edge++;
        }
      }
      return { wholeLampPixels: whole, unchangedShare: whole === 0 ? null : same / whole, edgePixels: edge };
    },
    /** The halo's light and the pixels it lifts past 10 % luma, whole frame. */
    light(name) {
      const { before, after } = this.frames[name];
      let light = 0;
      let lifted = 0;
      for (let i = 0; i < after.length; i += 4) {
        if (after[i] === before[i] && after[i + 1] === before[i + 1] && after[i + 2] === before[i + 2])
          continue;
        light += rel(after, i) - rel(before, i);
        if (luma(before, i) < 0.1 && luma(after, i) >= 0.1) lifted++;
      }
      return { light, lifted };
    },
    /** WCAG 2.3.1's general-flash pair between two frames' same layer. */
    flash(nameA, nameB, layer) {
      const a = this.frames[nameA][layer];
      const b = this.frames[nameB][layer];
      const { width: w, height: h } = this.frames[nameA];
      const hit = new Uint8Array(w * h);
      let total = 0;
      for (let p = 0; p < w * h; p++) {
        const la = rel(a, p * 4);
        const lb = rel(b, p * 4);
        if (Math.abs(la - lb) >= 0.1 && Math.min(la, lb) < 0.8) {
          hit[p] = 1;
          total++;
        }
      }
      const ww = Math.floor(w / 3);
      const wh = Math.floor(h / 3);
      const sat = new Uint32Array((w + 1) * (h + 1));
      for (let y = 0; y < h; y++) {
        let row = 0;
        for (let x = 0; x < w; x++) {
          row += hit[y * w + x];
          sat[(y + 1) * (w + 1) + x + 1] = sat[y * (w + 1) + x + 1] + row;
        }
      }
      let worst = 0;
      for (let y = 0; y + wh <= h; y += 4) {
        for (let x = 0; x + ww <= w; x += 4) {
          const s =
            sat[(y + wh) * (w + 1) + x + ww] -
            sat[y * (w + 1) + x + ww] -
            sat[(y + wh) * (w + 1) + x] +
            sat[y * (w + 1) + x];
          if (s > worst) worst = s;
        }
      }
      return { frameShare: total / (w * h), worstWindowShare: worst / (ww * wh) };
    },
    drop() {
      this.frames = {};
    },
  };
}

const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const relOf = (px, i) =>
  0.2126 * lin(px[i] / 255) + 0.7152 * lin(px[i + 1] / 255) + 0.0722 * lin(px[i + 2] / 255);
const lumaOf = (px, i) => (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
const round = (v, d = 4) => (v === null ? null : Number(v.toFixed(d)));

/** The composited page, as RGBA rows top-down. */
async function screen(page) {
  const img = decode(await page.screenshot());
  if (img.bpp === 4) return img;
  const px = Buffer.alloc(img.w * img.h * 4);
  for (let i = 0, j = 0; i < img.px.length; i += img.bpp, j += 4) {
    px[j] = img.px[i];
    px[j + 1] = img.px[i + 1];
    px[j + 2] = img.px[i + 2];
    px[j + 3] = 255;
  }
  return { w: img.w, h: img.h, px };
}

function darkShare({ px }) {
  let under = 0;
  for (let i = 0; i < px.length; i += 4) if (lumaOf(px, i) < 0.1) under++;
  return under / (px.length / 4);
}

const hud = (page, shown) =>
  page.evaluate((shown) => {
    document.querySelector('.game-host canvas').style.visibility = shown ? '' : 'hidden';
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, shown);

/** The page with the HUD canvas and without it: the collars, and the water under them. */
async function hudPair(page) {
  const withHud = await screen(page);
  await hud(page, false);
  const water = await screen(page);
  await hud(page, true);
  return { withHud, water };
}

/**
 * Each entity's collar core, found in a pair taken with the halo off: the
 * pixels the HUD canvas changes near an entity that match the ink of its SIG
 * (palette.ts `sigColor`, which the lamp reading reports), at full opacity.
 * Found with the halo off because over a bright halo the collar's own glow
 * layers can blend to near that ink; reduced motion holds every pixel still,
 * so the same positions are the core in a pair with the halo on.
 */
function collarCores({ withHud, water }, entities, dpr, tolerance = 28) {
  const { w, h } = withHud;
  const a = withHud.px;
  const b = water.px;
  const centres = entities.map((e) => [e.cx * dpr, e.cy * dpr, e.reach * dpr]);
  const groups = entities.map(() => []);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const moved = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      if (moved < 24) continue;
      let best = -1;
      let bestD = Infinity;
      centres.forEach(([cx, cy, reach], k) => {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d <= reach && d < bestD) {
          bestD = d;
          best = k;
        }
      });
      if (best >= 0) groups[best].push(i);
    }
  }
  return entities.map((e, k) => {
    const ink = [1, 3, 5].map((o) => parseInt(e.ink.slice(o, o + 2), 16));
    return groups[k].filter(
      (i) =>
        Math.max(Math.abs(a[i] - ink[0]), Math.abs(a[i + 1] - ink[1]), Math.abs(a[i + 2] - ink[2])) <=
        tolerance
    );
  });
}

/** WCAG contrast, either way round, of each entity's core against the water under it. */
function collarContrast({ withHud, water }, entities, cores) {
  const a = withHud.px;
  const b = water.px;
  return entities.map((e, k) => {
    const contrasts = cores[k]
      .map((i) => {
        const la = relOf(a, i);
        const lb = relOf(b, i);
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
      })
      .sort((p, q) => p - q);
    const atLeast3 = contrasts.filter((c) => c >= 3).length;
    return {
      key: e.key,
      name: e.name,
      sig: e.sig,
      ink: e.ink,
      corePixels: contrasts.length,
      ...(cores[k].method ? { method: cores[k].method } : {}),
      atLeast3Share: contrasts.length === 0 ? null : round(atLeast3 / contrasts.length),
      p5: round(contrasts[Math.floor(contrasts.length * 0.05)] ?? null, 2),
      min: round(contrasts[0] ?? null, 2),
    };
  });
}

/**
 * Cores found in one pair, moved onto another: a working hull travels between
 * the two, so each entity's cores shift by whatever offset, within 12 px, lands
 * most of them on its ink in the other pair. Its ink is only drawn by its
 * collar there at full opacity, so the best shift is the collar's own.
 */
function alignCores(cores, from, to, entities) {
  const { w, h } = from.withHud;
  const a = to.withHud.px;
  const b = to.water.px;
  return entities.map((e, k) => {
    const ink = [1, 3, 5].map((o) => parseInt(e.ink.slice(o, o + 2), 16));
    const at = cores[k].map((i) => [(i / 4) % w, Math.floor(i / 4 / w)]);
    let best = [0, 0];
    let bestHits = -1;
    for (let dy = -12; dy <= 12; dy++) {
      for (let dx = -12; dx <= 12; dx++) {
        let hits = 0;
        for (const [x, y] of at) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const i = (yy * w + xx) * 4;
          const inked =
            Math.max(Math.abs(a[i] - ink[0]), Math.abs(a[i + 1] - ink[1]), Math.abs(a[i + 2] - ink[2])) <= 28;
          const drawn =
            Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) >= 24;
          if (inked && drawn) hits++;
        }
        if (hits > bestHits || (hits === bestHits && Math.abs(dx) + Math.abs(dy) < Math.abs(best[0]) + Math.abs(best[1]))) {
          bestHits = hits;
          best = [dx, dy];
        }
      }
    }
    const moved = at
      .map(([x, y]) => [x + best[0], y + best[1]])
      .filter(([x, y]) => x >= 0 && y >= 0 && x < w && y < h)
      .map(([x, y]) => (y * w + x) * 4);
    return Object.assign(moved, { shift: best, inked: bestHits });
  });
}

/** The collars with the halo on, and off, at cores found with it off. */
async function collars(page, entities, dpr) {
  const on = await hudPair(page);
  await page.evaluate(() => window.__perspectiveHalo(false));
  await page.waitForTimeout(200);
  const off = await hudPair(page);
  await page.evaluate(() => window.__perspectiveHalo(true));
  await page.waitForTimeout(200);
  const cores = collarCores(off, entities, dpr);
  // A hull that travelled between the pairs, so that no shift lands most of
  // its cores on its ink, is read in the halo-on pair alone, from the pixels
  // that match its ink exactly enough to be the core and not a blended glow.
  const aligned = alignCores(cores, off, on, entities);
  const direct = collarCores(on, entities, dpr, 10);
  const onCores = aligned.map((moved, k) =>
    moved.inked >= 0.8 * cores[k].length ? moved : Object.assign(direct[k], { method: 'moved' })
  );
  return { on: collarContrast(on, entities, onCores), off: collarContrast(off, entities, cores) };
}

/** Own entities on screen, as CSS centres, with a reach for their collar. */
async function ownEntities(page) {
  const lamps = await page.evaluate(() => window.__perspectiveLamps());
  return [
    ...lamps.units.map((u) => ({ ...u, key: `unit:${u.id}` })),
    ...lamps.structures.map((s) => ({ ...s, key: `structure:${s.id}` })),
  ]
    .filter((e) => e.screen !== null)
    .map((e) => {
      const { x0, y0, x1, y1 } = e.screen;
      return {
        key: e.key,
        kind: e.kind,
        name: e.name,
        sig: e.sig,
        ink: e.ink,
        cx: (x0 + x1) / 2,
        cy: (y0 + y1) / 2,
        // The collar sits outside the figure and its selection ring; a reach
        // of the figure's half-diagonal plus 40 px holds it and its glow.
        reach: Math.hypot(x1 - x0, y1 - y0) / 2 + 40,
      };
    });
}

async function camera(page, centre, [, distance, pitchDeg]) {
  await page.evaluate(
    ({ centre, distance, pitchDeg }) =>
      window.__perspectiveCamera(centre.x, centre.z, distance, { yawDeg: 0, pitchDeg, focusDepthM: null }),
    { centre, distance, pitchDeg }
  );
  await page.waitForTimeout(SETTLE_MS);
}

/**
 * The frame with one entity's halo and lamp mask alone, or every one with
 * null; `sites` is what that frame drew.
 */
async function take(page, name, only = null) {
  await page.evaluate((only) => window.__perspectiveHaloOnly(only), only);
  // A frame for the stencil marks to follow the switch, then the capture.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const frame = await page.evaluate((name) => window.__haloRead.take(name), name);
  const sites = await page.evaluate(() => window.__perspectiveProbe().haloSites);
  await page.evaluate(() => window.__perspectiveHaloOnly(null));
  assert.ok(frame, `${name}: the halo is off`);
  return { ...frame, sites };
}

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.waitForTimeout(6000);
  const { renderer, viewport, reduced } = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return {
      renderer,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    };
  });
  assert.ok(!/swiftshader|llvmpipe|software|basic render/i.test(renderer), `software: ${renderer}`);
  assert.ok(
    await page.evaluate(() => typeof window.__perspectiveHaloFrame === 'function'),
    'this client predates the frame hook'
  );
  if (!reduced) console.log('NOTE: without REDUCED_MOTION=1 the sway moves between paired shots.');
  await page.evaluate(install);
  const dpr = viewport.dpr;
  const map = page.url().includes('sorrowgate') ? 'sorrowgate' : 'ventfront';
  const centre = await page.evaluate(() => window.__perspectiveProbe().ownCentre);
  assert.ok(['idle', 'drawn'].includes(await page.evaluate(() => window.__perspectiveHalo(true))));

  const cameras = [];
  let dir;
  for (const cam of CAMERAS) {
    const [name] = cam;
    await camera(page, centre, cam);
    const entities = await ownEntities(page);
    const all = await take(page, `${name}:all`);
    const reading = {
      name,
      state: all.state,
      sites: await page.evaluate(() => window.__perspectiveProbe().haloSites),
      darkness: await page.evaluate((n) => window.__haloRead.darkness(n), `${name}:all`),
      lamps: await page.evaluate((n) => window.__haloRead.lamps(n), `${name}:all`),
    };
    if (COLLAR_CAMERAS.has(name)) {
      // Each entity's halo alone, and its lamps alone in the mask: its light,
      // the pixels it lifts, and how much of its lamp is on screen at all.
      reading.entities = [];
      for (const e of entities) {
        const { sites } = await take(page, `${name}:${e.key}`, e.key);
        const { light, lifted } = await page.evaluate((n) => window.__haloRead.light(n), `${name}:${e.key}`);
        const lampPx = await page.evaluate((n) => window.__haloRead.lampPixels(n), `${name}:${e.key}`);
        reading.entities.push({
          key: e.key,
          name: e.name,
          sig: e.sig,
          sites,
          lampCssPx: round(lampPx / dpr ** 2, 1),
          lightCssPx2: round(light / dpr ** 2, 2),
          liftedCssPx: round(lifted / dpr ** 2, 1),
        });
      }
    }
    const onShot = await screen(page);
    dir = dirname(await shot(`${name}-on`));
    if (COLLAR_CAMERAS.has(name)) {
      const { on, off } = await collars(page, entities, dpr);
      reading.collarOn = on;
      reading.collarOff = off;
    }
    await page.evaluate(() => window.__perspectiveHalo(false));
    await page.waitForTimeout(400);
    const offShot = await screen(page);
    await shot(`${name}-off`);
    await page.evaluate(() => window.__perspectiveHalo(true));
    await page.waitForTimeout(400);
    reading.darknessWithHud = { off: round(darkShare(offShot)), on: round(darkShare(onShot)) };
    reading.darkness = {
      before: round(reading.darkness.before),
      after: round(reading.darkness.after),
      lossPoints: round(100 * (reading.darkness.before - reading.darkness.after), 2),
    };
    reading.lamps.unchangedShare = round(reading.lamps.unchangedShare);
    await page.evaluate(() => window.__haloRead.drop());
    cameras.push(reading);
    console.log(JSON.stringify(reading));
  }

  // One hull kind at a time pings at the close camera (Ventfront only).
  const pings = [];
  if (map === 'ventfront') {
    await camera(page, centre, CAMERAS[1]);
    const units = (await ownEntities(page)).filter((e) => e.key.startsWith('unit:'));
    const kinds = new Map();
    for (const u of units) if (!kinds.has(u.kind)) kinds.set(u.kind, u);
    for (const u of kinds.values()) {
      await page.mouse.click(u.cx, u.cy);
      await page.waitForTimeout(500);
      await take(page, 'rest:all');
      await take(page, 'rest:one', u.key);
      const rest = await page.evaluate(() => window.__haloRead.light('rest:one'));
      const restSig = (await ownEntities(page)).find((e) => e.key === u.key)?.sig;
      await page.keyboard.press('KeyP');
      const pinged = await page
        .waitForFunction(
          (key) => {
            const l = window.__perspectiveLamps();
            const unit = l.units.find((x) => `unit:${x.id}` === key);
            return unit !== undefined && unit.sig >= 90;
          },
          u.key,
          { timeout: 3000 }
        )
        .then(() => true)
        .catch(() => false);
      if (!pinged) {
        pings.push({ key: u.key, name: u.name, pinged: false });
        continue;
      }
      await take(page, 'ping:all');
      await take(page, 'ping:one', u.key);
      const ping = await page.evaluate(() => window.__haloRead.light('ping:one'));
      const flashOn = await page.evaluate(() => window.__haloRead.flash('rest:all', 'ping:all', 'after'));
      const flashOff = await page.evaluate(() => window.__haloRead.flash('rest:all', 'ping:all', 'before'));
      const entities = await ownEntities(page);
      // With the halo off beside it: what the ping's own marks cost the collar.
      const atPing = await collars(page, entities, dpr);
      const collarPing = atPing.on.find((c) => c.key === u.key);
      const collarPingOff = atPing.off.find((c) => c.key === u.key);
      await shot(`ping-${u.name.toLowerCase().replace(/\s+/g, '-')}`);
      await page.evaluate(() => window.__haloRead.drop());
      const reading = {
        key: u.key,
        name: u.name,
        restSig,
        pinged: true,
        liftedCssPx: { rest: round(rest.lifted / dpr ** 2, 1), ping: round(ping.lifted / dpr ** 2, 1) },
        liftRatio: rest.lifted === 0 ? null : round(ping.lifted / rest.lifted, 2),
        flashWithHalo: { frame: round(flashOn.frameShare), window: round(flashOn.worstWindowShare) },
        flashWithoutHalo: { frame: round(flashOff.frameShare), window: round(flashOff.worstWindowShare) },
        collarAtPing: collarPing ?? null,
        collarAtPingHaloOff: collarPingOff ?? null,
      };
      pings.push(reading);
      console.log(JSON.stringify(reading));
      // A ping holds SIG 95 for 3 s; the next hull starts from rest.
      await page.waitForTimeout(4000);
    }
  }

  const record = { renderer, viewport, reducedMotion: reduced, map, cameras, pings };
  writeFileSync(join(dir, 'halo-frames.json'), JSON.stringify(record, null, 2) + '\n');
};
