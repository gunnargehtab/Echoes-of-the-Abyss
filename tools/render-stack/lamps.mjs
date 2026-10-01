/**
 * Gate 3's quiet and loud own-unit readings (docs/art-direction.md, "Shared
 * model lighting"), as a run-game `--steps` module: own hulls framed close,
 * staged quiet and loud with the player's own keys, and each state read twice,
 * as numbers and as pixels.
 *
 *   node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
 *     --url 'http://localhost:5173/?map=ventfront-divide' --out <dir> \
 *     --steps tools/render-stack/lamps.mjs
 *
 * The numbers come from window.__perspectiveLamps, which only a development
 * build installs: each hull's live and resting SIG, every lamp's export, resting
 * and applied strength, and whether the lamp adds its glow after the tone curve.
 * Gate 3's lamp core holds a resting brightest channel at white, and each
 * reading asserts it (#1021).
 * The pixels come from a crop round the hull with the HUD canvas hidden, so
 * rings and the ping's wavefront stay out of them; a full frame with the HUD
 * is shot beside each crop for review.
 *
 * A standard match opens with a Light Scout resting at SIG 6 and Caissons
 * resting at 64, so it stages every case gate 3 names: a Caisson at rest and
 * running silent (Space), and the scout at rest, with its engine off (Q) and
 * pinging (P, SIG 95 for three seconds). The ping goes last, since it reveals
 * the player. Sorrowgate strikes the ping and no own hull rests loud, so there
 * the scout's quiet states are read and the loud side is left to the match.
 *
 * Lamps follow SIG on the 5 Hz snapshot, not per frame, so a state is read
 * only once its SIG has arrived, and is rejected if the SIG moved while it was
 * read. Pairs of one hull's states, at one camera, are differenced in linear
 * light: surface light cancels and what is left is the emission the SIG moved,
 * whose hue should be the lamp ink's, taken in linear light too, unless a
 * channel clipped. The difference is approximate: about 9% of water fog is
 * mixed in after the colour-space encode at this dolly. Writes lamps.json
 * beside the frames. Not a gate.
 */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { inflateSync } from 'node:zlib';

// Gate 3's energy curve, E(SIG) = 0.45 · e^(SIG / 14) (docs/graphics-standards.md):
// the one number here with a source of its own. The hook reports the e-fold and
// the clamp the game applies (glow.ts), and the e-fold is held to this.
const DOC_EFOLD = 14;
let glowCurve = null;
const curve = (sig, rest) => Math.exp((sig - rest) / glowCurve.efold);
const factorOf = (sig, rest) =>
  Math.min(glowCurve.max, Math.max(glowCurve.min, curve(sig, rest)));

const CLOSE_M = 500;
const ECHO_MS = 200;
const MARGIN_PX = 16;

const lampsNow = (page) => page.evaluate(() => window.__perspectiveLamps());
const unitNow = async (page, id) => (await lampsNow(page)).units.find((u) => u.id === id);

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
  const { look } = await page.evaluate(() => window.__perspectiveProbe());
  const first = await lampsNow(page);
  glowCurve = first.curve;
  assert.equal(glowCurve.efold, DOC_EFOLD, "the game's glow e-fold left gate 3's curve");
  const lit = first.units.filter((u) => u.lamps.length > 0 && u.screen !== null);
  assert.ok(lit.length > 0, 'no own hull shows a model with lamps');
  const quiet = lit.reduce((a, b) => (b.restSig < a.restSig ? b : a));
  const loud = lit.reduce((a, b) => (b.restSig > a.restSig ? b : a));

  /** Put the hull at the centre of the frame and return the crop round it. */
  async function frame(unit) {
    await page.evaluate(
      (a) =>
        window.__perspectiveCamera(a.x, a.z, a.d, {
          yawDeg: 0,
          pitchDeg: 55,
          focusDepthM: a.depth,
        }),
      { x: unit.xM, z: unit.zM, d: CLOSE_M, depth: unit.depthM }
    );
    await page.waitForTimeout(3 * ECHO_MS);
    const { screen } = await unitNow(page, unit.id);
    return {
      x: Math.max(0, screen.x0 - MARGIN_PX),
      y: Math.max(0, screen.y0 - MARGIN_PX),
      width: screen.x1 - screen.x0 + 2 * MARGIN_PX,
      height: screen.y1 - screen.y0 + 2 * MARGIN_PX,
    };
  }

  /** Select the hull the way a player does, with a click on it. */
  async function select(unit) {
    const { screen } = await unitNow(page, unit.id);
    await page.mouse.click((screen.x0 + screen.x1) / 2, (screen.y0 + screen.y1) / 2);
    await page.waitForTimeout(2 * ECHO_MS);
  }

  /** Wait for the order to come back in a snapshot: every field of `want`. */
  async function until(unit, want, key) {
    await page
      .waitForFunction(
        ({ id, want }) => {
          const u = window.__perspectiveLamps().units.find((x) => x.id === id);
          if (want.silentRunning !== undefined && u.silentRunning !== want.silentRunning) return false;
          if (want.engineOff !== undefined && u.engineOff !== want.engineOff) return false;
          if (want.sigAtMost !== undefined && u.sig > want.sigAtMost) return false;
          if (want.sigAtLeast !== undefined && u.sig < want.sigAtLeast) return false;
          return true;
        },
        { id: unit.id, want },
        { timeout: 5000 }
      )
      .catch(() => assert.fail(`${key}: the hull never reached ${JSON.stringify(want)}`));
  }

  const readings = [];
  let outDir = null;
  async function read(unit, clip, state, input) {
    const before = await unitNow(page, unit.id);
    await page.evaluate(() => {
      document.querySelector('.game-host').style.visibility = 'hidden';
    });
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    );
    const png = await page.screenshot({ clip });
    await page.evaluate(() => {
      document.querySelector('.game-host').style.visibility = '';
    });
    const file = await shot(`${state}-${unit.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
    outDir = dirname(file);
    const after = await unitNow(page, unit.id);
    assert.equal(after.sig, before.sig, `${state}: SIG moved while it was read`);
    const crop = file.replace(/\.png$/, '-crop.png');
    writeFileSync(crop, png);
    for (const lamp of before.lamps) {
      assert.ok(lamp.afterToneMapping, `${state}: a lamp lost its glow-after-tone patch`);
      const expected = lamp.restIntensity * factorOf(before.sig, before.restSig);
      assert.ok(Math.abs(lamp.intensity - expected) < 1e-6, `${state}: lamp not on the curve`);
      // The hex is the linear colour rounded to 8-bit sRGB, hence the margin.
      if (lamp.exportIntensity !== undefined) {
        const channels = [1, 3, 5].map((i) => linear(parseInt(lamp.hex.slice(i, i + 2), 16) / 255));
        const peak = Math.max(...channels) * lamp.restIntensity;
        assert.ok(peak <= 1.01, `${state}: a lamp rests at ${peak.toFixed(3)}, past white`);
      }
    }
    const probe = await page.evaluate(() => window.__perspectiveProbe());
    readings.push({
      state,
      input,
      frame: file.split(/[\\/]/).pop(),
      crop: crop.split(/[\\/]/).pop(),
      clip,
      unit: {
        id: before.id,
        name: before.name,
        sig: before.sig,
        restSig: before.restSig,
        silentRunning: before.silentRunning,
        engineOff: before.engineOff,
      },
      factor: factorOf(before.sig, before.restSig),
      curve: curve(before.sig, before.restSig),
      lamps: before.lamps,
      camera: {
        distance: probe.distance,
        pitchDeg: probe.pitchDeg,
        hullScale: probe.hullScale,
        waterReachM: probe.waterReachM,
      },
      pixels: stats(decode(png), before.lamps[0]?.hex),
      image: decode(png),
    });
  }

  if (look === 'sorrowgate') {
    const clip = await frame(quiet);
    await read(quiet, clip, 'rest', 'none');
    await select(quiet);
    await page.keyboard.press('Space');
    await until(quiet, { silentRunning: true }, 'Space');
    await page.waitForTimeout(2 * ECHO_MS);
    await read(quiet, clip, 'silent', 'Space');
    await page.keyboard.press('KeyQ');
    await until(quiet, { engineOff: true }, 'Q');
    await page.waitForTimeout(2 * ECHO_MS);
    await read(quiet, clip, 'engine-off', 'Q');
  } else {
    let clip = await frame(loud);
    await read(loud, clip, 'rest', 'none');
    await select(loud);
    await page.keyboard.press('Space');
    await until(loud, { silentRunning: true, sigAtMost: 15 }, 'Space');
    await page.waitForTimeout(2 * ECHO_MS);
    await read(loud, clip, 'silent', 'Space');
    clip = await frame(quiet);
    await read(quiet, clip, 'rest', 'none');
    await select(quiet);
    await page.keyboard.press('KeyQ');
    await until(quiet, { engineOff: true }, 'Q');
    await page.waitForTimeout(2 * ECHO_MS);
    await read(quiet, clip, 'engine-off', 'Q');
    await page.keyboard.press('KeyP');
    await until(quiet, { sigAtLeast: 90 }, 'P');
    await read(quiet, clip, 'ping', 'P');
  }

  // Each hull's other states against its quietest, at one camera.
  const pairs = [];
  for (const id of new Set(readings.map((r) => r.unit.id))) {
    const own = readings.filter((r) => r.unit.id === id);
    const base = own.reduce((a, b) => (b.factor < a.factor ? b : a));
    for (const louder of own) {
      if (louder === base) continue;
      pairs.push({
        unit: louder.unit.name,
        louder: louder.state,
        quieter: base.state,
        factorStep: Number((louder.factor - base.factor).toFixed(4)),
        ...difference(louder.image, base.image, louder.lamps[0]?.hex),
      });
    }
  }
  writeFileSync(
    join(outDir, 'lamps.json'),
    JSON.stringify(
      {
        renderer,
        software,
        viewport,
        look,
        faction: first.faction,
        palette: first.palette,
        curve: glowCurve,
        readings: readings.map(({ image, ...r }) => r),
        pairs,
      },
      null,
      2
    ) + '\n'
  );
  console.log(
    JSON.stringify(
      readings.map((r) => ({
        state: r.state,
        unit: r.unit.name,
        sig: Number(r.unit.sig.toFixed(2)),
        factor: Number(r.factor.toFixed(3)),
        maxV: r.pixels.maxV,
        over08: r.pixels.over08,
        clipped: r.pixels.clipped,
      }))
    )
  );
};

// --- pixels -------------------------------------------------------------------

/** An 8-bit RGB or RGBA PNG, as Chromium writes them. */
export function decode(buf) {
  let p = 8;
  let w = 0;
  let h = 0;
  let type = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const kind = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (kind === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      type = data[9];
    } else if (kind === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const bpp = { 2: 3, 6: 4 }[type];
  assert.ok(bpp, `PNG colour type ${type} is not 8-bit RGB or RGBA`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const px = Buffer.alloc(w * h * bpp);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const q = a + b - c;
        const pa = Math.abs(q - a);
        const pb = Math.abs(q - b);
        const pc = Math.abs(q - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      px[y * stride + x] = v & 255;
    }
  }
  return { w, h, bpp, px };
}

const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** Hue in degrees and HSV saturation of an RGB triple of any scale. */
function hueSat(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (max <= 0) return { hueDeg: null, saturation: 0 };
  let hue = null;
  if (d > 0) {
    if (max === r) hue = 60 * (((g - b) / d) % 6);
    else if (max === g) hue = 60 * ((b - r) / d + 2);
    else hue = 60 * ((r - g) / d + 4);
    if (hue < 0) hue += 360;
  }
  return { hueDeg: hue === null ? null : Number(hue.toFixed(1)), saturation: Number((d / max).toFixed(3)) };
}

/** The ink's hue as stored (sRGB), or in linear light to set beside a sum. */
const inkOf = (hex, inLinear = false) =>
  hex
    ? hueSat(
        ...[1, 3, 5].map((i) => {
          const c = parseInt(hex.slice(i, i + 2), 16) / 255;
          return inLinear ? linear(c) : c;
        })
      )
    : { hueDeg: null, saturation: 0 };

/** What a quiet hull is judged by: its brightest pixels, not their hue. */
function stats(img, hex) {
  const n = img.w * img.h;
  let maxV = 0;
  let over05 = 0;
  let over08 = 0;
  let clipped = 0;
  let sumV = 0;
  const vs = [];
  for (let i = 0; i < n; i++) {
    const r = img.px[i * img.bpp];
    const g = img.px[i * img.bpp + 1];
    const b = img.px[i * img.bpp + 2];
    const v = Math.max(r, g, b) / 255;
    maxV = Math.max(maxV, v);
    sumV += v;
    if (v > 0.5) over05++;
    if (v > 0.8) over08++;
    if (r === 255 || g === 255 || b === 255) clipped++;
    vs.push([v, r, g, b]);
  }
  vs.sort((a, b) => b[0] - a[0]);
  const top = vs.slice(0, Math.max(1, Math.ceil(n / 100)));
  let hx = 0;
  let hy = 0;
  let sat = 0;
  let v = 0;
  for (const [tv, r, g, b] of top) {
    const hs = hueSat(r, g, b);
    v += tv;
    sat += hs.saturation;
    if (hs.hueDeg !== null) {
      hx += Math.cos((hs.hueDeg * Math.PI) / 180);
      hy += Math.sin((hs.hueDeg * Math.PI) / 180);
    }
  }
  const hue = (Math.atan2(hy, hx) * 180) / Math.PI;
  return {
    n,
    maxV: Number(maxV.toFixed(3)),
    over05,
    over08,
    clipped,
    meanV: Number((sumV / n).toFixed(4)),
    brightest1pc: {
      v: Number((v / top.length).toFixed(3)),
      saturation: Number((sat / top.length).toFixed(3)),
      hueDeg: Number(((hue + 360) % 360).toFixed(1)),
    },
    lampInk: inkOf(hex),
  };
}

/** The louder state minus the quieter, summed in linear light over the crop. */
function difference(a, b, hex) {
  if (a.w !== b.w || a.h !== b.h) return { comparable: false };
  const sum = [0, 0, 0];
  for (let i = 0; i < a.w * a.h; i++) {
    for (let k = 0; k < 3; k++) {
      sum[k] += linear(a.px[i * a.bpp + k] / 255) - linear(b.px[i * b.bpp + k] / 255);
    }
  }
  return {
    comparable: true,
    linearSum: sum.map((s) => Number(s.toFixed(2))),
    linearTotal: Number((sum[0] + sum[1] + sum[2]).toFixed(2)),
    ...hueSat(...sum.map((s) => Math.max(0, s))),
    lampInkLinear: inkOf(hex, true),
  };
}

