/**
 * The chromatic split's frames, read against docs/art-direction.md,
 * "Atmosphere rides on top", as a run-game `--steps` module (#1003).
 *
 *   node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
 *     --url 'http://localhost:5173/?map=ventfront-divide' --out <dir> \
 *     --steps tools/render-stack/split-frames.mjs
 *
 * `VIEW_DPR=1.5` takes the second ratio and `?mission=prologue-sorrowgate` the
 * second map. At capture.mjs's four cameras it takes one frame's conn canvas
 * before the split and after it (`__perspectiveSplitFrame`), and reads:
 *
 * - **The middle**: every pixel inside the clear ellipse, which must come back
 *   unchanged, byte for byte;
 * - **The band**: every pixel past it, recomputed in JS from the frame before
 *   the split by the SPEC's rule (red from the image pushed out, green from the
 *   image pulled in, blue the brighter, bilinear and clamped at the edge) and
 *   compared with what the GPU drew. Agreement within a level or two is the
 *   proof of the 1 px bound and of the colours, on the real GPU;
 * - **A crop**: the 32-pixel window of the band the split moved most, before,
 *   after and their difference ×8, magnified 8× with no smoothing.
 *
 * The rule's two numbers are read from `chromaticSplit.ts`, so the check is of
 * the shader against the constants it was given. Writes split-frames.json and
 * one crop PNG a camera beside the frames. Headed, on a GPU. Not a gate.
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CAMERAS = [
  ['home', 6000, 55],
  ['close', 1800, 55],
  ['low', 3500, 12],
  ['survey', 18000, 88],
];
const SETTLE_MS = 600;
const CROP = 32;
const ZOOM = 8;

/** CHROMATIC_SPLIT's two numbers, read from the source the client was built from. */
function splitConstants() {
  const here = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(
    join(here, '../../packages/frontend/src/game/chromaticSplit.ts'),
    'utf8'
  );
  const number = (name) => {
    const match = source.match(new RegExp(`${name}: ([0-9.]+),`));
    assert.ok(match, `chromaticSplit.ts has no ${name}`);
    return Number(match[1]);
  };
  return { separationPx: number('SEPARATION_PX'), inner: number('INNER') };
}

/** Installed in the page: the frames stay there, and only their readings leave. */
function install() {
  window.__splitRead = {
    frames: {},
    async take(name) {
      const frame = await window.__perspectiveSplitFrame();
      if (frame === null) return null;
      this.frames[name] = frame;
      return { width: frame.width, height: frame.height };
    },
    check(name, { separationPx, inner }) {
      const { width: W, height: H, before: B, after: A } = this.frames[name];
      const cx = W / 2;
      const cy = H / 2;
      const half = separationPx / 2;
      const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
      // three's copy is LinearFilter and ClampToEdge: texel centres at +0.5.
      const sample = (x, y, c) => {
        const qx = x - 0.5;
        const qy = y - 0.5;
        const i = Math.floor(qx);
        const j = Math.floor(qy);
        const fx = qx - i;
        const fy = qy - j;
        const i0 = clamp(i, 0, W - 1);
        const i1 = clamp(i + 1, 0, W - 1);
        const j0 = clamp(j, 0, H - 1);
        const j1 = clamp(j + 1, 0, H - 1);
        const at = (u, v) => B[(v * W + u) * 4 + c];
        return (
          (at(i0, j0) * (1 - fx) + at(i1, j0) * fx) * (1 - fy) +
          (at(i0, j1) * (1 - fx) + at(i1, j1) * fx) * fy
        );
      };
      const delta = new Float32Array(W * H);
      const out = {
        inside: 0,
        insideChanged: 0,
        band: 0,
        bandChanged: 0,
        maxError: 0,
        within1: 0,
        within2: 0,
        maxDelta: 0,
        maxSeparationPx: 0,
      };
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const k = (y * W + x) * 4;
          const fx = x + 0.5;
          const fy = y + 0.5;
          const vx = fx - cx;
          const vy = fy - cy;
          const share = Math.hypot(vx / cx, vy / cy) / Math.SQRT2;
          const ramp = clamp((share - inner) / (1 - inner), 0, 1);
          const d = Math.max(
            Math.abs(A[k] - B[k]),
            Math.abs(A[k + 1] - B[k + 1]),
            Math.abs(A[k + 2] - B[k + 2])
          );
          if (ramp <= 0) {
            out.inside++;
            if (d > 0) out.insideChanged++;
            continue;
          }
          out.band++;
          if (d > 0) out.bandChanged++;
          delta[y * W + x] = d;
          out.maxDelta = Math.max(out.maxDelta, d);
          const len = Math.hypot(vx, vy);
          const dx = (vx / len) * half * ramp;
          const dy = (vy / len) * half * ramp;
          out.maxSeparationPx = Math.max(out.maxSeparationPx, 2 * half * ramp);
          const r = sample(fx - dx, fy - dy, 0);
          const g = sample(fx + dx, fy + dy, 1);
          const b = Math.max(sample(fx - dx, fy - dy, 2), sample(fx + dx, fy + dy, 2));
          const err = Math.max(Math.abs(A[k] - r), Math.abs(A[k + 1] - g), Math.abs(A[k + 2] - b));
          out.maxError = Math.max(out.maxError, err);
          if (err <= 1) out.within1++;
          if (err <= 2) out.within2++;
        }
      }
      // The crop: the window whose summed change is largest, from an
      // integral image, every 4 px.
      const S = new Float64Array((W + 1) * (H + 1));
      for (let y = 0; y < H; y++) {
        let row = 0;
        for (let x = 0; x < W; x++) {
          row += delta[y * W + x];
          S[(y + 1) * (W + 1) + x + 1] = S[y * (W + 1) + x + 1] + row;
        }
      }
      const size = this.cropSize;
      let best = { x: 0, y: 0, sum: -1 };
      for (let y = 0; y + size <= H; y += 4) {
        for (let x = 0; x + size <= W; x += 4) {
          const sum =
            S[(y + size) * (W + 1) + x + size] -
            S[y * (W + 1) + x + size] -
            S[(y + size) * (W + 1) + x] +
            S[y * (W + 1) + x];
          if (sum > best.sum) best = { x, y, sum };
        }
      }
      out.crop = { x: best.x, yFromTop: H - best.y - size, size };
      this.crops[name] = best;
      return out;
    },
    cropSize: 0,
    crops: {},
    /** Before, after and |after − before| × 8, each magnified with no smoothing. */
    cropPng(name, zoom) {
      const { width: W, before: B, after: A } = this.frames[name];
      const { x: x0, y: y0 } = this.crops[name];
      const size = this.cropSize;
      const gap = 8;
      const panel = size * zoom;
      const canvas = document.createElement('canvas');
      canvas.width = panel * 3 + gap * 2;
      canvas.height = panel + 20;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const panels = [
        ['before', (k) => [B[k], B[k + 1], B[k + 2]]],
        ['after', (k) => [A[k], A[k + 1], A[k + 2]]],
        [
          '|diff| x8',
          (k) => [0, 1, 2].map((c) => Math.min(255, Math.abs(A[k + c] - B[k + c]) * 8)),
        ],
      ];
      panels.forEach(([label, colour], p) => {
        const left = p * (panel + gap);
        for (let j = 0; j < size; j++) {
          for (let i = 0; i < size; i++) {
            // Rows are bottom-up: the crop's top row is its highest y.
            const k = ((y0 + size - 1 - j) * W + x0 + i) * 4;
            const [r, g, b] = colour(k);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(left + i * zoom, 20 + j * zoom, zoom, zoom);
          }
        }
        ctx.fillStyle = '#ccc';
        ctx.font = '12px monospace';
        ctx.fillText(label, left + 4, 14);
      });
      return canvas.toDataURL('image/png').slice('data:image/png;base64,'.length);
    },
  };
}

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.waitForTimeout(6000);
  const constants = splitConstants();
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
  assert.ok(
    await page.evaluate(() => typeof window.__perspectiveSplitFrame === 'function'),
    'this client predates the split frame hook'
  );
  await page.evaluate(install);
  await page.evaluate((size) => (window.__splitRead.cropSize = size), CROP);
  const centre = await page.evaluate(() => window.__perspectiveProbe().ownCentre);
  assert.ok(centre, 'match must contain an own force');
  const state = await page.evaluate(() => window.__perspectiveProbe().split);
  assert.equal(state, 'on', `the split is ${state}`);

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
    const size = await page.evaluate((n) => window.__splitRead.take(n), name);
    assert.ok(size, `${name}: no frame came back`);
    const reading = await page.evaluate(
      ({ n, constants }) => window.__splitRead.check(n, constants),
      { n: name, constants }
    );
    const png = await page.evaluate(({ n, zoom }) => window.__splitRead.cropPng(n, zoom), {
      n: name,
      zoom: ZOOM,
    });
    const path = await shot(name);
    dir ??= dirname(path);
    writeFileSync(join(dir, `split-crop-${name}.png`), Buffer.from(png, 'base64'));
    const probe = await page.evaluate(() => window.__perspectiveProbe());
    const record = {
      name,
      ...size,
      ...reading,
      passes: probe.passes,
      drawCalls: probe.drawCalls,
      triangles: probe.triangles,
      splitBytes: probe.splitBytes,
    };
    console.log(JSON.stringify(record));
    cameras.push(record);
  }
  const out = { renderer, viewport, constants, cameras };
  writeFileSync(join(dir, 'split-frames.json'), JSON.stringify(out, null, 2) + '\n');
};
