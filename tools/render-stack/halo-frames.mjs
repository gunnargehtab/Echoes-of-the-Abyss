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
 *
 * Two more stages answer #1001's calls of 4 October. **Structures**, on
 * Ventfront at the close camera: each structure's halo alone at rest, then
 * with the Foundry producing, the order a player gives, so a working
 * structure's light is read beside a resting one's. **Ridge**: own hulls at the
 * low (12°) pitch from every yaw, the seabed sampled along the sight line, and
 * where relief stands between the eye and a hull, that hull's halo alone.
 *
 * `STAGES=cameras,pings,structures,ridge` picks stages (all by default), and
 * `PING_KINDS=light-scout` the hull kinds that ping, so a TUNABLE swept by
 * editing `lampHalo.ts` between runs reads one collar in a minute. The record
 * carries the TUNABLEs the served file held.
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { decode } from './lamps.mjs';

const STAGES = new Set(
  (process.env.STAGES ?? 'cameras,pings,structures,ridge').split(',').map((s) => s.trim())
);
const PING_KINDS = process.env.PING_KINDS?.split(',').map((s) => s.trim()) ?? null;
const slug = (name) => name.toLowerCase().replace(/\s+/g, '-');

/** The halo's TUNABLEs as the served file holds them, read from its source. */
function tunables() {
  const src = readFileSync(
    new URL('../../packages/frontend/src/game/lampHalo.ts', import.meta.url),
    'utf8'
  );
  const read = (name) => Number(src.match(new RegExp(`\\b${name}: ([0-9.]+)`))?.[1]);
  return {
    energyM2: read('ENERGY_M2'),
    ceiling: read('CEILING'),
    toe: read('TOE'),
    levelWeights: JSON.parse(src.match(/\bLEVEL_WEIGHTS: (\[[^\]]*\])/)?.[1] ?? 'null'),
  };
}

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
    /**
     * The halo's light and the pixels it lifts past 10 % luma, whole frame,
     * and the most it raised any one channel, in encoded levels.
     */
    light(name) {
      const { before, after } = this.frames[name];
      let light = 0;
      let lifted = 0;
      let peak = 0;
      for (let i = 0; i < after.length; i += 4) {
        if (after[i] === before[i] && after[i + 1] === before[i + 1] && after[i + 2] === before[i + 2])
          continue;
        light += rel(after, i) - rel(before, i);
        if (luma(before, i) < 0.1 && luma(after, i) >= 0.1) lifted++;
        peak = Math.max(peak, after[i] - before[i], after[i + 1] - before[i + 1], after[i + 2] - before[i + 2]);
      }
      return { light, lifted, peak };
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
    const off = (i) =>
      Math.max(Math.abs(a[i] - ink[0]), Math.abs(a[i + 1] - ink[1]), Math.abs(a[i + 2] - ink[2]));
    return strokeOf(
      groups[k].filter((i) => off(i) <= tolerance),
      e,
      dpr,
      w,
      off
    );
  });
}

/**
 * The core is one stroke at full opacity, drawn over the collar's two glow
 * layers: at each bearing round the ring, the one pixel nearest its ink,
 * within 3 px of the ring's radius. An ink tolerance alone also takes the glow
 * and the stroke's antialiased edge wherever a lighter HUD mark lies under
 * them, as an unresolved contact's haze behind the Light Scout does in some
 * matches (205 pixels where the stroke has 159), and those then read as core
 * failing 3:1 against water the core never covered. The ring is fitted to the
 * pixels (Kåsa) rather than centred on the model's box, which sits a few
 * pixels off the hull's position; a short arc falls back to the box.
 */
function strokeOf(pixels, e, dpr, w, off) {
  if (pixels.length < 3) return pixels;
  const pts = pixels.map((i) => [((i / 4) % w) + 0.5, Math.floor(i / 4 / w) + 0.5]);
  let [cx, cy] = [e.cx * dpr, e.cy * dpr];
  const fit = fitCircle(pts);
  if (fit !== null && Math.hypot(fit.cx - cx, fit.cy - cy) < 12 * dpr) [cx, cy] = [fit.cx, fit.cy];
  const polar = pts.map(([x, y], k) => ({
    i: pixels[k],
    r: Math.hypot(x - cx, y - cy),
    a: Math.atan2(y - cy, x - cx),
  }));
  const radii = polar.map((p) => p.r).sort((p, q) => p - q);
  const radius = radii[Math.floor(radii.length / 2)];
  const bins = Math.max(8, Math.round(2 * Math.PI * radius));
  const best = new Map();
  for (const p of polar) {
    if (Math.abs(p.r - radius) > 3 * dpr) continue;
    const bin = Math.floor(((p.a + Math.PI) / (2 * Math.PI)) * bins) % bins;
    const prior = best.get(bin);
    const nearer =
      prior === undefined ||
      off(p.i) < off(prior.i) ||
      (off(p.i) === off(prior.i) && Math.abs(p.r - radius) < Math.abs(prior.r - radius));
    if (nearer) best.set(bin, p);
  }
  return [...best.values()].map((p) => p.i);
}

/** The least-squares circle through points (Kåsa), or null if they are degenerate. */
function fitCircle(pts) {
  // Solve [Sxx Sxy Sx; Sxy Syy Sy; Sx Sy n]·[D E F] = −[Sxz Syz Sz], z = x² + y².
  let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0, sxz = 0, syz = 0, sz = 0;
  for (const [x, y] of pts) {
    const z = x * x + y * y;
    sxx += x * x;
    sxy += x * y;
    syy += y * y;
    sx += x;
    sy += y;
    sxz += x * z;
    syz += y * z;
    sz += z;
  }
  const m = [
    [sxx, sxy, sx, -sxz],
    [sxy, syy, sy, -syz],
    [sx, sy, pts.length, -sz],
  ];
  for (let c = 0; c < 3; c++) {
    let p = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-9) return null;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < 3; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k < 4; k++) m[r][k] -= f * m[c][k];
    }
  }
  const [d, e] = [m[0][3] / m[0][0], m[1][3] / m[1][1]];
  return { cx: -d / 2, cy: -e / 2 };
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
  const onCores = coresIn(cores, off, on, entities, dpr);
  return {
    on: collarContrast(on, entities, onCores),
    off: collarContrast(off, entities, cores),
    cores,
    offPair: off,
  };
}

/**
 * Cores found in one pair, located in another. A hull that travelled between
 * the pairs, so that no shift lands most of its cores on its ink, is read in
 * the second pair alone, from the pixels that match its ink exactly enough to
 * be the core and not a blended glow.
 */
function coresIn(cores, from, to, entities, dpr) {
  const aligned = alignCores(cores, from, to, entities);
  const direct = collarCores(to, entities, dpr, 10);
  return aligned.map((moved, k) =>
    moved.inked >= 0.8 * cores[k].length ? moved : Object.assign(direct[k], { method: 'moved' })
  );
}

/**
 * One hull's collar through a whole ping, halo on or off: a pair taken every
 * moment from the frame its SIG reaches 90 until it falls back. The ping's own
 * marks cross the water under the collar as it holds, so one capture reads
 * whichever moment it landed on; the worst moment is the reading.
 */
async function collarOverPing(page, u, found, dpr, haloOn) {
  await page.evaluate((on) => window.__perspectiveHalo(on), haloOn);
  await page.waitForTimeout(200);
  const loud = () =>
    page.evaluate(
      (key) => (window.__perspectiveLamps().units.find((x) => `unit:${x.id}` === key)?.sig ?? 0) >= 90,
      u.key
    );
  await page.keyboard.press('KeyP');
  const pinged = await page
    .waitForFunction(
      (key) => (window.__perspectiveLamps().units.find((x) => `unit:${x.id}` === key)?.sig ?? 0) >= 90,
      u.key,
      { timeout: 3000 }
    )
    .then(
      () => true,
      () => false
    );
  const shares = [];
  let worst = null;
  while (pinged && (await loud())) {
    const pair = await hudPair(page);
    const [cores] = coresIn([found.cores], found.offPair, pair, [u], dpr);
    const [reading] = collarContrast(pair, [u], [cores]);
    if (reading.atLeast3Share === null) continue;
    shares.push(reading.atLeast3Share);
    if (worst === null || reading.atLeast3Share < worst.atLeast3Share) worst = reading;
  }
  await page.evaluate(() => window.__perspectiveHalo(true));
  await page.waitForTimeout(200);
  return { haloOn, samples: shares.length, shares, worst };
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

/** One entity's halo alone, as `take` captured it under `name`. */
async function alone(page, name, e, sites, dpr) {
  const { light, lifted, peak } = await page.evaluate((n) => window.__haloRead.light(n), name);
  const lampPx = await page.evaluate((n) => window.__haloRead.lampPixels(n), name);
  return {
    key: e.key,
    name: e.name,
    sig: e.sig,
    sites,
    lampCssPx: round(lampPx / dpr ** 2, 1),
    lightCssPx2: round(light / dpr ** 2, 2),
    liftedCssPx: round(lifted / dpr ** 2, 1),
    peakLevels: peak,
  };
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

  // The output directory is wherever drive.mjs puts the first shot.
  let dir = null;
  const shotAt = async (name) => {
    const path = await shot(name);
    dir ??= dirname(path);
    return path;
  };

  const cameras = [];
  for (const cam of STAGES.has('cameras') ? CAMERAS : []) {
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
        reading.entities.push(await alone(page, `${name}:${e.key}`, e, sites, dpr));
      }
    }
    const onShot = await screen(page);
    await shotAt(`${name}-on`);
    if (COLLAR_CAMERAS.has(name)) {
      const { on, off } = await collars(page, entities, dpr);
      reading.collarOn = on;
      reading.collarOff = off;
    }
    await page.evaluate(() => window.__perspectiveHalo(false));
    await page.waitForTimeout(400);
    const offShot = await screen(page);
    await shotAt(`${name}-off`);
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
  if (STAGES.has('pings') && map === 'ventfront') {
    await camera(page, centre, CAMERAS[1]);
    const units = (await ownEntities(page)).filter(
      (e) => e.key.startsWith('unit:') && (PING_KINDS === null || PING_KINDS.includes(slug(e.name)))
    );
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
      await shotAt(`ping-${slug(u.name)}`);
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
      // Two more pings, the collar read through each: halo on, then off.
      const pe = entities.find((e) => e.key === u.key);
      if (pe !== undefined) {
        const found = { cores: atPing.cores[entities.indexOf(pe)], offPair: atPing.offPair };
        reading.collarOverPing = [];
        for (const haloOn of [true, false]) {
          // A ping holds SIG 95 for 3 s; each read starts from rest.
          await page.waitForTimeout(4000);
          reading.collarOverPing.push(await collarOverPing(page, pe, found, dpr, haloOn));
        }
      }
      pings.push(reading);
      console.log(JSON.stringify(reading));
      await page.waitForTimeout(4000);
    }
  }

  // Each structure's halo alone at rest, then with the Foundry producing, the
  // order a player gives (Ventfront, whose opening holds a Foundry and the
  // nodules to spend): a working structure's light beside a resting one's.
  const structures = [];
  if (STAGES.has('structures') && map === 'ventfront') {
    await camera(page, centre, CAMERAS[1]);
    const readAll = async (state) => {
      const own = (await ownEntities(page)).filter((e) => e.key.startsWith('structure:'));
      for (const s of own) {
        const { sites } = await take(page, `${state}:${s.key}`, s.key);
        const reading = { state, ...(await alone(page, `${state}:${s.key}`, s, sites, dpr)) };
        structures.push(reading);
        console.log(JSON.stringify(reading));
      }
      return own;
    };
    const foundry = (await readAll('rest')).find((s) => s.name === 'Foundry');
    if (foundry !== undefined) {
      await page.mouse.click(foundry.cx, foundry.cy);
      await page.waitForTimeout(500);
      // 1 builds the yard's first hull; the SIG it reaches says it took.
      await page.keyboard.press('Digit1');
      const working = await page
        .waitForFunction(
          (key) =>
            window.__perspectiveLamps().structures.find((x) => `structure:${x.id}` === key)?.sig >= 50,
          foundry.key,
          { timeout: 5000 }
        )
        .then(
          () => true,
          () => false
        );
      if (working) {
        await readAll('working');
        await shotAt('structures-working-on');
        await page.evaluate(() => window.__perspectiveHalo(false));
        await page.waitForTimeout(400);
        await shotAt('structures-working-off');
        await page.evaluate(() => window.__perspectiveHalo(true));
        await page.waitForTimeout(400);
      } else {
        structures.push({ key: foundry.key, name: foundry.name, state: 'working', produced: false });
      }
      await page.keyboard.press('Escape');
    }
    await page.evaluate(() => window.__haloRead.drop());
  }

  // The ridge case: each own hull at the low pitch from every yaw and three
  // dollies, the seabed sampled along the line from the eye to the hull's
  // centre. Where relief stands over that line, the hull's halo alone: a lamp
  // the ridge hides wholly adds nothing (SPEC, "The lamp").
  const ridge = { searched: 0, hidden: [] };
  if (STAGES.has('ridge')) {
    const units = await page.evaluate(() => window.__perspectiveLamps().units);
    const found = await page.evaluate((units) => {
      const Y = 0.22; // DEPTH_VISUAL_M_PER_M, perspectiveTerrain.ts
      const best = new Map();
      let searched = 0;
      for (const u of units) {
        for (const distance of [1500, 2500, 3500]) {
          for (let yawDeg = 0; yawDeg < 360; yawDeg += 10) {
            window.__perspectiveCamera(u.xM, u.zM, distance, { yawDeg, pitchDeg: 12, focusDepthM: null });
            const { eye } = window.__perspectiveProbe();
            const e = [eye.xM, -eye.depthM * Y, eye.zM];
            const t = [u.xM, -u.depthM * Y, u.zM];
            // How far the seabed stands over the sight line, world metres.
            let over = -Infinity;
            for (let k = 1; k < 200; k++) {
              const f = k / 200;
              const x = e[0] + (t[0] - e[0]) * f;
              const z = e[2] + (t[2] - e[2]) * f;
              const ground = -window.__perspectiveSeabedM(x, z) * Y;
              over = Math.max(over, ground - (e[1] + (t[1] - e[1]) * f));
            }
            searched++;
            const prior = best.get(u.id);
            if (over > 0 && (prior === undefined || over > prior.overM))
              best.set(u.id, { id: u.id, distance, yawDeg, overM: Math.round(over) });
          }
        }
      }
      return { searched, hits: [...best.values()] };
    }, units);
    ridge.searched = found.searched;
    for (const hit of found.hits) {
      const u = units.find((x) => x.id === hit.id);
      const key = `unit:${u.id}`;
      await page.evaluate(
        ({ u, hit }) =>
          window.__perspectiveCamera(u.xM, u.zM, hit.distance, {
            yawDeg: hit.yawDeg,
            pitchDeg: 12,
            focusDepthM: null,
          }),
        { u, hit }
      );
      await page.waitForTimeout(SETTLE_MS);
      const { sites } = await take(page, `ridge:${key}`, key);
      const reading = {
        ...hit,
        ...(await alone(page, `ridge:${key}`, { key, name: u.name, sig: u.sig }, sites, dpr)),
      };
      ridge.hidden.push(reading);
      console.log(JSON.stringify(reading));
      if (ridge.hidden.length === 1) await shotAt(`ridge-${slug(u.name)}`);
    }
    await page.evaluate(() => window.__haloRead.drop());
  }

  const record = {
    renderer,
    viewport,
    reducedMotion: reduced,
    map,
    tunables: tunables(),
    cameras,
    pings,
    structures,
    ridge,
  };
  dir ??= dirname(await shot('end'));
  writeFileSync(join(dir, 'halo-frames.json'), JSON.stringify(record, null, 2) + '\n');
};
