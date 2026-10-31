/**
 * #1683's per-pixel readings of docs/sorrowgate-arch-study.md §11 "H, order",
 * as a run-game `--steps` module: the escorts' pixels with the study on and
 * off, and a vent ember's mean breath.
 *
 * MODE=escorts (the default) poses STATION (C, or H for the opening camera)
 * once the six hull models stand, and at the first animation frame whose tick
 * reaches AT seconds of the mission clock reads that frame's conn canvas:
 * `<TAG>-frame.png` is that frame, lossless, and `<TAG>.json` carries the
 * reading tick, every own unit's screen box and the probe. With MOTES=0 the
 * drifting motes are left out of every frame (`__perspectiveMotes`): the snow,
 * the sift and the plumes move between two sessions' frames and differed by
 * up to 115 levels in boxes with and without an escort (#1683's README). Two
 * sessions, the study on and off, compare per pixel inside each box
 * (`compare.py`).
 *
 *   MOTES=0 STATION=C AT=30 TAG=e-C-on VIEW_W=1920 VIEW_H=1080 \
 *     node .claude/skills/run-game/scripts/drive.mjs --entry tutorial \
 *     --url 'http://localhost:5173/?arch-study=1' --out <dir> \
 *     --steps docs/screenshots/issue-1683/pair.mjs
 *
 * MODE=ember reads the probe's first standing chimney (`ventPlumeAt`, the West
 * Approach vent #1637 read) with the camera over its mouth at C's dolly and
 * angles, so the mouth is the frame's centre. For BUCKETS of the ember's 5 Hz
 * buckets (`emberFlicker`), one frame a bucket, it reads the brightest warm
 * pixel (red over blue by at least 40) in a 60 px window round the centre.
 * The mean is the ember's mean breath; #1637 read 83 over twelve.
 */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const TICK_HZ = 60;
const MODE = process.env.MODE ?? 'escorts';
const STATION = process.env.STATION ?? 'C';
const AT = Number(process.env.AT ?? 30);
const TAG = process.env.TAG ?? `${MODE}-${STATION}`;
const MOTES = process.env.MOTES !== '0';
const BUCKETS = Number(process.env.BUCKETS ?? 60);
const OUT = resolve(process.argv[process.argv.indexOf('--out') + 1]);

const STATIONS = {
  C: [2550, 2200, 420, { pitchDeg: 35, yawDeg: 25, focusDepthM: 1450 }],
  L: [2550, 2750, 650, { pitchDeg: 12, yawDeg: 0, focusDepthM: 1450 }],
};

export default async ({ page }) => {
  await page.waitForFunction(
    () =>
      window.__perspectiveProbe?.().modelBacked === 6 && typeof window.__echoClock === 'function',
    null,
    { timeout: 120000 }
  );
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  });
  const study = new URL(page.url()).searchParams.get('arch-study') === '1';
  if (!MOTES) await page.evaluate(() => window.__perspectiveMotes(false));
  const record = { tag: TAG, mode: MODE, study, motes: MOTES, renderer, url: page.url() };

  if (MODE === 'escorts') {
    if (STATION !== 'H') {
      await page.evaluate((args) => window.__perspectiveCamera(...args), STATIONS[STATION]);
    }
    const tick = Math.round(AT * TICK_HZ);
    const now = await page.evaluate(() => window.__echoClock());
    assert.ok(now < tick - TICK_HZ, `posed at ${now}, under a second before tick ${tick}`);
    // The first frame at or past the tick, read inside its own animation
    // frame after the game's callback drew it (capture.mjs's method).
    const reading = await page.evaluate(
      (tick) =>
        new Promise((done) => {
          const frame = () => {
            if (window.__echoClock() < tick) {
              requestAnimationFrame(frame);
              return;
            }
            const readingTick = window.__echoClock();
            const gl = document.querySelector('.perspective-host canvas').getContext('webgl2');
            const w = gl.drawingBufferWidth;
            const h = gl.drawingBufferHeight;
            const px = new Uint8Array(w * h * 4);
            gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
            const probe = window.__perspectiveProbe();
            const units = window.__perspectiveLamps().units.map((u) => ({
              id: u.id,
              name: u.name,
              xM: u.xM,
              zM: u.zM,
              depthM: u.depthM,
              restSig: u.restSig,
              screen: u.screen,
            }));
            // The rows bottom-up, as GL reads them, flipped into an image.
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const g = canvas.getContext('2d');
            const image = g.createImageData(w, h);
            for (let y = 0; y < h; y++) {
              image.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
            }
            g.putImageData(image, 0, 0);
            done({
              readingTick,
              width: w,
              height: h,
              dpr: devicePixelRatio,
              units,
              probe: {
                drawCalls: probe.drawCalls,
                triangles: probe.triangles,
                landmarks: probe.landmarks,
                landmarkTris: probe.landmarkTris,
                siftMotes: probe.siftMotes,
                focus: probe.focus,
                distance: probe.distance,
                pitchDeg: probe.pitchDeg,
                yawDeg: probe.yawDeg,
              },
              png: canvas.toDataURL('image/png').slice('data:image/png;base64,'.length),
            });
          };
          requestAnimationFrame(frame);
        }),
      tick
    );
    writeFileSync(join(OUT, `${TAG}-frame.png`), Buffer.from(reading.png, 'base64'));
    delete reading.png;
    Object.assign(record, { station: STATION, at: AT, tick, frame: `${TAG}-frame.png`, ...reading });
    console.log(
      `${TAG}: tick ${reading.readingTick}, ${reading.units.length} units, ${reading.units.filter((u) => u.screen).length} on screen, calls ${reading.probe.drawCalls}`
    );
  } else if (MODE === 'ember') {
    const vent = await page.evaluate(() => window.__perspectiveProbe().ventPlumeAt);
    assert.ok(vent, 'a standing chimney');
    const [, , dolly, angles] = STATIONS.C;
    await page.evaluate(
      ([x, z, d, a]) => window.__perspectiveCamera(x, z, d, a),
      [vent.x, vent.z, dolly, { ...angles, focusDepthM: vent.depthM }]
    );
    await page.waitForTimeout(2500);
    const reads = await page.evaluate(
      (buckets) =>
        new Promise((done) => {
          const out = [];
          let last = -1;
          const frame = () => {
            const bucket = Math.floor(performance.now() / 200);
            // One frame a bucket, a frame after it turns, once the ember
            // has taken the bucket's level.
            if (bucket !== last) {
              last = bucket;
              requestAnimationFrame(frame);
              return;
            }
            if (out.length > 0 && out[out.length - 1].bucket === bucket) {
              requestAnimationFrame(frame);
              return;
            }
            const gl = document.querySelector('.perspective-host canvas').getContext('webgl2');
            const w = gl.drawingBufferWidth;
            const h = gl.drawingBufferHeight;
            const r = Math.round(30 * devicePixelRatio);
            const px = new Uint8Array(4 * r * 2 * r * 2);
            gl.readPixels(Math.round(w / 2) - r, Math.round(h / 2) - r, 2 * r, 2 * r, gl.RGBA, gl.UNSIGNED_BYTE, px);
            let best = { luma: 0, rgb: null };
            for (let i = 0; i < px.length; i += 4) {
              const [R, G, B] = [px[i], px[i + 1], px[i + 2]];
              if (R - B < 40) continue;
              const luma = 0.2126 * R + 0.7152 * G + 0.0722 * B;
              if (luma > best.luma) best = { luma, rgb: [R, G, B] };
            }
            out.push({ bucket, tick: window.__echoClock(), warmMax: Number(best.luma.toFixed(1)), rgb: best.rgb });
            if (out.length >= buckets) done(out);
            else requestAnimationFrame(frame);
          };
          requestAnimationFrame(frame);
        }),
      BUCKETS
    );
    const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const warm = reads.map((x) => x.warmMax);
    Object.assign(record, {
      vent,
      pose: { dolly, ...angles, focusDepthM: vent.depthM },
      reads,
      meanBreath: Number(mean(warm).toFixed(1)),
      meanFirst12: Number(mean(warm.slice(0, 12)).toFixed(1)),
      range: [Math.min(...warm), Math.max(...warm)],
    });
    await page.screenshot({ path: join(OUT, `${TAG}.png`) });
    console.log(
      `${TAG}: vent (${vent.x.toFixed(0)}, ${vent.z.toFixed(0)}, ${vent.depthM.toFixed(0)} m), ${reads.length} buckets, mean ${record.meanBreath}, first 12 ${record.meanFirst12}, range ${record.range.join('–')}`
    );
  } else {
    throw new Error(`MODE ${MODE}: escorts or ember`);
  }
  writeFileSync(join(OUT, `${TAG}.json`), `${JSON.stringify(record, null, 2)}\n`);
};
