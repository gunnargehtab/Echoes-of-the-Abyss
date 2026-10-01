/**
 * #1001's readings for the halo call, as a run-game `--steps` module: what a
 * lamp halo would have to work with in today's frame, read before any halo
 * exists (docs/graphics-standards.md gate 6, "Abyss Render Stack increment").
 *
 *   node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
 *     --url 'http://localhost:5173/?map=ventfront-divide' --out <dir> \
 *     --steps tools/render-stack/halo.mjs
 *
 * At capture.mjs's four cameras it reads:
 * - the near-black share: the conn canvas alone (readPixels inside the frame
 *   that drew it, as fog.mjs does) and the composited frame with the HUD,
 *   each as the share of pixels whose encoded luma is under 5, 10 and 20 %.
 *   style-neon-noir.md asks 85–90 % near-black and names no threshold, so
 *   three are reported rather than one chosen;
 * - every own entity on screen, from the development-only lamp reading: its
 *   SIG, each lamp's site radii and camera-facing area in CSS px
 *   (lampScreen.ts), and its emitted light, area times the displayed lamp's
 *   luminance in linear light. That last is what a source built from the
 *   emissive term would carry, without occlusion;
 * - the light a loud state would lose at white: the share of a unit's lamp
 *   light past white under gate 3's lamp core at a ping (SIG 95) and at its
 *   firing burst, weighted by area.
 * Then one ping at the home dolly: the conn canvas and the frame just before
 * and once its SIG 95 has arrived, and the share of pixels whose relative
 * luminance moved by at least 0.1 with the darker under 0.8, WCAG 2.3.1's
 * general-flash pair, over the frame and over the worst window of a third of
 * its width by a third of its height. Writes halo.json beside the frames.
 * Not a gate.
 */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { statsFor } from '../../packages/shared/dist/index.js';
import { decode } from './lamps.mjs';

const CAMERAS = [
  ['home', 6000, 55],
  ['close', 1800, 55],
  ['low', 3500, 12],
  ['survey', 18000, 88],
];
const SETTLE_MS = 1500;
const PING_SIG = 95;

const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const inkOf = (hex) => [1, 3, 5].map((i) => linear(parseInt(hex.slice(i, i + 2), 16) / 255));
const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
/** Gate 3's lamp core, the pixel half: past white, scaled along its hue. */
const shown = (c) => {
  const peak = Math.max(...c);
  return peak > 1 ? c.map((v) => v / peak) : c;
};

/** Encoded luma shares of an RGBA buffer, rows any order. */
function nearBlack(px) {
  const n = px.length / 4;
  const under = { 5: 0, 10: 0, 20: 0 };
  for (let i = 0; i < px.length; i += 4) {
    const luma = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
    if (luma < 0.05) under[5]++;
    if (luma < 0.1) under[10]++;
    if (luma < 0.2) under[20]++;
  }
  return Object.fromEntries(
    Object.entries(under).map(([k, v]) => [`under${k}`, Number((v / n).toFixed(4))])
  );
}

/** The conn canvas, read in the animation frame that drew it. */
const connPixels = async (page) => {
  const frame = await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => {
          const gl = document.querySelector('.perspective-host canvas').getContext('webgl2');
          const w = gl.drawingBufferWidth;
          const h = gl.drawingBufferHeight;
          const px = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
          let s = '';
          for (let i = 0; i < px.length; i += 0x8000)
            s += String.fromCharCode(...px.subarray(i, i + 0x8000));
          resolve({ w, h, b64: btoa(s) });
        })
      )
  );
  return { w: frame.w, h: frame.h, px: Buffer.from(frame.b64, 'base64') };
};

const framePixels = async (page) => {
  const img = decode(await page.screenshot());
  // RGB or RGBA rows; normalise to RGBA for one code path.
  if (img.bpp === 4) return img;
  const px = Buffer.alloc(img.w * img.h * 4);
  for (let i = 0, j = 0; i < img.px.length; i += img.bpp, j += 4) {
    px[j] = img.px[i];
    px[j + 1] = img.px[i + 1];
    px[j + 2] = img.px[i + 2];
    px[j + 3] = 255;
  }
  return { w: img.w, h: img.h, px };
};

/** WCAG 2.3.1's general-flash pair between two frames of one size. */
function flash(a, b) {
  const rel = (px, i) => luminance([px[i], px[i + 1], px[i + 2]].map((v) => linear(v / 255)));
  const { w, h } = a;
  const hit = new Uint8Array(w * h);
  let total = 0;
  for (let p = 0; p < w * h; p++) {
    const la = rel(a.px, p * 4);
    const lb = rel(b.px, p * 4);
    if (Math.abs(la - lb) >= 0.1 && Math.min(la, lb) < 0.8) {
      hit[p] = 1;
      total++;
    }
  }
  // The worst window a third of the frame each way, by a summed-area table.
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
  return {
    frameShare: Number((total / (w * h)).toFixed(4)),
    worstWindowShare: Number((worst / (ww * wh)).toFixed(4)),
  };
}

/** One own entity's lamps, as a halo source would see them. */
function entityLight(entity, isUnit) {
  let emitted = 0;
  let area = 0;
  const sites = [];
  const lossAt = (factor) => {
    let desired = 0;
    let lost = 0;
    for (const lamp of entity.lamps) {
      const want = inkOf(lamp.hex).map((v) => v * lamp.restIntensity * factor);
      desired += lamp.areaPx * luminance(want);
      lost += lamp.areaPx * (luminance(want) - luminance(shown(want)));
    }
    return desired > 0 ? Number((lost / desired).toFixed(3)) : null;
  };
  for (const lamp of entity.lamps) {
    emitted += lamp.areaPx * luminance(shown(inkOf(lamp.hex).map((v) => v * lamp.intensity)));
    area += lamp.areaPx;
    sites.push(...lamp.sitesPx);
  }
  const factor = (sig) => Math.exp((sig - entity.restSig) / 14);
  const burst = isUnit ? statsFor(entity.kind).sigFiringBurst : 0;
  return {
    name: entity.name,
    id: entity.id,
    sig: entity.sig,
    restSig: entity.restSig,
    lamps: entity.lamps.length,
    areaPx: Number(area.toFixed(1)),
    emitted: Number(emitted.toFixed(2)),
    sitesPx: sites.sort((a, b) => a - b),
    // The live factor is clamped to ×6 (glow.ts), so the cap stands in for it.
    lostAtPing: isUnit ? lossAt(Math.min(6, factor(PING_SIG))) : null,
    lostFiring: burst > 0 ? lossAt(Math.min(6, factor(entity.restSig + burst))) : null,
  };
}

const quantile = (sorted, q) =>
  sorted.length === 0 ? null : sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.waitForTimeout(6000);
  assert.equal(
    await page.evaluate(() => typeof window.__perspectiveLamps),
    'function',
    '__perspectiveLamps is missing: run against the dev server, not a production build'
  );
  const { renderer, viewport } = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return {
      renderer,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    };
  });
  const software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
  const centre = await page.evaluate(() => window.__perspectiveProbe().ownCentre);
  assert.ok(centre, 'match must contain an own force');

  const cameras = [];
  let dir = null;
  for (const [name, distance, pitchDeg] of CAMERAS) {
    await page.evaluate(
      ({ centre, distance, pitchDeg }) =>
        window.__perspectiveCamera(centre.x, centre.z, distance, {
          yawDeg: 0,
          pitchDeg,
          focusDepthM: null,
        }),
      { centre, distance, pitchDeg }
    );
    await page.waitForTimeout(SETTLE_MS);
    const conn = await connPixels(page);
    const frame = await framePixels(page);
    const reading = await page.evaluate(() => window.__perspectiveLamps());
    const probe = await page.evaluate(() => window.__perspectiveProbe());
    // In view: a model on screen whose box meets the viewport.
    const inView = (e) =>
      e.screen !== null &&
      e.screen.x1 > 0 &&
      e.screen.y1 > 0 &&
      e.screen.x0 < viewport.width &&
      e.screen.y0 < viewport.height;
    const entities = [
      ...reading.units.filter(inView).map((u) => entityLight(u, true)),
      ...reading.structures.filter(inView).map((s) => entityLight(s, false)),
    ];
    const sites = entities.flatMap((e) => e.sitesPx).sort((a, b) => a - b);
    cameras.push({
      name,
      distance,
      pitchDeg,
      hullScale: probe.hullScale,
      drawingBuffer: probe.drawingBuffer,
      nearBlack: { conn: nearBlack(conn.px), frame: nearBlack(frame.px) },
      sitesPx: {
        count: sites.length,
        min: quantile(sites, 0),
        median: quantile(sites, 0.5),
        p90: quantile(sites, 0.9),
        max: quantile(sites, 1),
      },
      entities,
    });
    dir = dirname(await shot(`halo-${name}`));
  }

  // One ping, at the home dolly, from the quietest lit hull.
  const lit = (await page.evaluate(() => window.__perspectiveLamps())).units.filter(
    (u) => u.lamps.length > 0
  );
  let ping = null;
  if (lit.length > 0) {
    const hull = lit.reduce((a, b) => (b.restSig < a.restSig ? b : a));
    await page.evaluate(
      (u) =>
        window.__perspectiveCamera(u.xM, u.zM, 6000, {
          yawDeg: 0,
          pitchDeg: 55,
          focusDepthM: null,
        }),
      hull
    );
    await page.waitForTimeout(SETTLE_MS);
    const at = (await page.evaluate(() => window.__perspectiveLamps())).units.find(
      (u) => u.id === hull.id
    );
    await page.mouse.click((at.screen.x0 + at.screen.x1) / 2, (at.screen.y0 + at.screen.y1) / 2);
    await page.waitForTimeout(400);
    const connBefore = await connPixels(page);
    const frameBefore = await framePixels(page);
    await page.keyboard.press('KeyP');
    // Sorrowgate strikes the ping, so a ping that never arrives is recorded,
    // not failed: there is no flash to read there.
    const pinged = await page
      .waitForFunction(
        ({ id, sig }) => window.__perspectiveLamps().units.find((u) => u.id === id)?.sig >= sig,
        { id: hull.id, sig: PING_SIG },
        { timeout: 5000 }
      )
      .then(
        () => true,
        () => false
      );
    if (!pinged) {
      ping = { hull: hull.name, restSig: hull.restSig, struck: true };
    } else {
      // Two frames on, so the lamps the snapshot set have drawn.
      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      );
      const connAfter = await connPixels(page);
      const frameAfter = await framePixels(page);
      ping = {
        hull: hull.name,
        restSig: hull.restSig,
        conn: flash(connBefore, connAfter),
        frame: flash(frameBefore, frameAfter),
      };
      await shot('halo-ping');
    }
  }

  const record = { renderer, software, viewport, cameras, ping };
  writeFileSync(join(dir, 'halo.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(
    JSON.stringify({
      nearBlack: cameras.map((c) => [c.name, c.nearBlack.conn.under10, c.nearBlack.frame.under10]),
      sites: cameras.map((c) => [c.name, c.sitesPx]),
      ping,
    })
  );
};
