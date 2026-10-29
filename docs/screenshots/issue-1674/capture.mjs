/**
 * #1674's captures of the arch study's §9 stations, as a run-game `--steps`
 * module: stations at matched mission times, one fresh tutorial session each.
 *
 *   VIEW_W=1920 VIEW_H=1080 SHOTS=C@30 TAG=d-C-on \
 *     node .claude/skills/run-game/scripts/drive.mjs --entry tutorial \
 *     --url 'http://localhost:5173/?arch-study=1' --out <dir> \
 *     --steps docs/screenshots/issue-1674/capture.mjs
 *
 * SHOTS lists `<station>@<mission seconds>`, comma-separated, taken in order
 * (`H@635,H@655` is the transit pair). The station is posed once the six hull
 * models stand, well before its time. The server clock is never stopped or
 * accelerated (docs/sorrowgate-arch-study.md §9), so a session that reaches a
 * time before it is posed fails rather than shooting late. H is the unmodified
 * opening camera; an H past the first minute re-applies the pose the session
 * opened on, and the reading records where the ground's focus clamp put it.
 *
 * The frame is a CDP capture, not Playwright's `page.screenshot`: on the
 * container's SwiftShader a 1920 × 1080 frame takes about 1.8 s to draw, the
 * Playwright call spent 11 s waiting on frames, and the CDP one about 3 s. Its
 * image is the frame drawn about a second after the call (a call at tick 1932
 * drew T+00:33 on the HUD clock), so the call leads its time by LEAD_S. The
 * HUD's own clock in the image is the frame's time; `captureTicks` brackets
 * it, the first from the wall clock at the call, the second read after it.
 *
 * Writes `<TAG>.json` beside the frames: the ticks, the requested and actual
 * pose, the probe, and the conn canvas read in the frame after the capture
 * (tools/render-stack/halo.mjs's method, its tick recorded) — the near-black
 * share, the brightest pixel and a 28 px window round each lamp the probe
 * projects.
 */
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const TICK_HZ = 60;
const LEAD_S = Number(process.env.LEAD_S ?? 1);
const STATIONS = {
  C: [2550, 2200, 420, { pitchDeg: 35, yawDeg: 25, focusDepthM: 1450 }],
  L: [2550, 2750, 650, { pitchDeg: 12, yawDeg: 0, focusDepthM: 1450 }],
  S: [2500, 2000, 6500, { pitchDeg: 55, yawDeg: 0, focusDepthM: null }],
};
const LAMP_WINDOW = 28;

const shots = (process.env.SHOTS ?? 'H@30').split(',').map((s) => {
  const [name, at] = s.split('@');
  return { name, seconds: Number(at) };
});
const TAG = process.env.TAG ?? 'capture';
const OUT = resolve(process.argv[process.argv.indexOf('--out') + 1]);

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Luma statistics over a rectangle of a bottom-up RGBA buffer, in top-down coordinates. */
function stats(px, w, h, x0 = 0, y0 = 0, x1 = w, y1 = h) {
  let max = -1;
  let at = null;
  let sum = 0;
  let under = 0;
  let n = 0;
  for (let y = Math.max(0, y0); y < Math.min(h, y1); y++) {
    const row = (h - 1 - y) * w;
    for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) {
      const i = (row + x) * 4;
      const l = luma(px[i], px[i + 1], px[i + 2]);
      sum += l;
      n++;
      if (l < 25.5) under++;
      if (l > max) {
        max = l;
        at = { x, y, rgb: [px[i], px[i + 1], px[i + 2]] };
      }
    }
  }
  if (n === 0) return null;
  return {
    maxLuma: Number(max.toFixed(1)),
    brightest: at,
    meanLuma: Number((sum / n).toFixed(2)),
    under10: Number((under / n).toFixed(4)),
    pixels: n,
  };
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
          resolve({ w, h, b64: btoa(s), tick: window.__echoClock() });
        })
      )
  );
  return { ...frame, px: Buffer.from(frame.b64, 'base64') };
};

const clock = (page) => page.evaluate(() => window.__echoClock());

const probe = (page) => page.evaluate(() => window.__perspectiveProbe());
const pose = (p) => ({
  focus: p.focus,
  distance: p.distance,
  pitchDeg: p.pitchDeg,
  yawDeg: p.yawDeg,
});

export default async ({ page }) => {
  // One page call does the setup: each call waits on the frame in hand, a
  // second or more here, and the first station is due 30 s in. It waits for
  // the six models, records the opening, and poses the first station.
  const first = shots[0].name === 'H' ? null : STATIONS[shots[0].name];
  const opened = await page.evaluate(async (firstPose) => {
    for (;;) {
      const p = window.__perspectiveProbe?.();
      if (p && p.modelBacked === 6 && typeof window.__echoClock === 'function') break;
      await new Promise((r) => setTimeout(r, 100));
    }
    const opening = window.__perspectiveProbe();
    const tick = window.__echoClock();
    if (firstPose !== null) window.__perspectiveCamera(...firstPose);
    let renderer = 'unavailable';
    const gl = document.querySelector('.perspective-host canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
    return {
      opening,
      env: {
        url: location.href,
        viewport: [innerWidth, innerHeight],
        dpr: devicePixelRatio,
        settings: localStorage.getItem('echoes.settings'),
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        renderer,
        modelsTick: tick,
      },
      wall: Date.now(),
    };
  }, first);
  // The wall time the mission clock read zero. The page shares the machine's
  // clock, so its own reading beside the tick is exact, within the 5 Hz snapshot.
  const zero = opened.wall - (opened.env.modelsTick / TICK_HZ) * 1000;
  const { env } = opened;
  const openingPose = pose(opened.opening);
  console.log(`six models at tick ${env.modelsTick}`);
  const cdp = await page.context().newCDPSession(page);

  const readings = [];
  for (const { name, seconds } of shots) {
    const tick = Math.round(seconds * TICK_HZ);
    // An H past the opening minute is H's pose re-applied, as §9's T asks.
    const reposed = name !== 'H' || seconds > 60;
    const requested =
      name === 'H'
        ? [
            openingPose.focus.xM,
            openingPose.focus.zM,
            openingPose.distance,
            {
              pitchDeg: openingPose.pitchDeg,
              yawDeg: openingPose.yawDeg,
              focusDepthM: openingPose.focus.depthM,
            },
          ]
        : STATIONS[name];
    // The setup call already posed a first station other than H.
    if (reposed && (name === 'H' || readings.length > 0)) {
      await page.evaluate((args) => window.__perspectiveCamera(...args), requested);
    }
    const callWall = zero + (tick / TICK_HZ - LEAD_S) * 1000;
    if (Date.now() >= callWall) {
      throw new Error(`${name}: posed too late for its time, ${tick}`);
    }
    await page.waitForTimeout(callWall - Date.now());
    // The call's own mission time from the wall clock: a tick read here would
    // wait on the frame in hand and delay the call by up to its 1.8 s.
    const before = Math.round(((Date.now() - zero) / 1000) * TICK_HZ);
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      optimizeForSpeed: true,
    });
    const after = await clock(page);
    const file = `${TAG}-${name}-${String(seconds).padStart(3, '0')}s.png`;
    writeFileSync(join(OUT, file), Buffer.from(data, 'base64'));
    console.log(`shot: ${join(OUT, file)}`);
    const conn = await connPixels(page);
    const p = await probe(page);
    const windows = {};
    (p.landmarkLampsPx ?? []).forEach(({ x, y }, i) => {
      const cx = Math.round(x * env.dpr);
      const cy = Math.round(y * env.dpr);
      const r = LAMP_WINDOW / 2;
      windows[`lamp_${i}`] = stats(conn.px, conn.w, conn.h, cx - r, cy - r, cx + r, cy + r);
    });
    readings.push({
      name,
      file,
      requestedTick: tick,
      captureTicks: [before, after],
      connTick: conn.tick,
      requested: reposed ? requested : 'opening, unmodified',
      actual: pose(p),
      conn: { buffer: [conn.w, conn.h], frame: stats(conn.px, conn.w, conn.h), windows },
      probe: p,
    });
    console.log(
      `${name}: capture ticks ${before}–${after} (time ${tick}), conn ${conn.tick}, ` +
        `calls ${p.drawCalls}, landmark ${p.landmarks} at ${p.landmarkTris}`
    );
  }
  writeFileSync(
    join(OUT, `${TAG}.json`),
    JSON.stringify({ ...env, openingPose, readings }, null, 2)
  );
};
