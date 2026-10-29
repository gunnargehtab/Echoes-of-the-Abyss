/**
 * #1674's GPU clause of docs/sorrowgate-arch-study.md §9, as a run-game
 * `--steps` module for the named desktop GPU: the 240-frame stations with
 * GPU time, unpaced and queued, C with the pools on and off, and the clips.
 * A software rasteriser runs it too, and its JSON says so: those millisecond
 * fields are the rasteriser's and are not evidence (run-game SKILL.md).
 *
 * Stations, one session per half and per pixel ratio (`VIEW_DPR=1.5` for the
 * second), headed on a desktop, unpaced for the GPU reading:
 *
 *   UNPACED=1 VIEW_W=1920 VIEW_H=1080 TAG=gpu-on-dpr1 \
 *     node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
 *     --entry tutorial --url 'http://localhost:5173/?arch-study=1' --out <dir> \
 *     --steps docs/screenshots/issue-1674/gpu.mjs
 *
 * The off half drops `?arch-study=1`. Each station is held for 240 frames of
 * both painters and 240 GPU frames, read unqueued and then behind the queue
 * load (`__perspectiveGpuQueue`, tools/render-stack/capture.mjs's method), and
 * C is read again with the pools off through the study's switch. `<TAG>.json`
 * lands beside the frames with the renderer, the pixel ratio, every station's
 * probe and both readings; a markdown row per station is printed.
 *
 * Clips, paced (no UNPACED), with the drive recording the session
 * (`RECORD_VIDEO=<dir>`, a WebM of the whole page from the title screen on):
 *
 *   RECORD_VIDEO=<dir> VIEW_W=1920 VIEW_H=1080 MODE=clip CLIP=C-still TAG=clip-C-still \
 *     node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
 *     --entry tutorial --url 'http://localhost:5173/?arch-study=1' --out <dir> \
 *     --steps docs/screenshots/issue-1674/gpu.mjs
 *
 * CLIP=C-still holds C with no input for 12 s (the sift, the sway and the
 * lamps). CLIP=C-move holds C for 4 s, selects one escort, orders a short
 * horizontal move within the court, then Stop, and holds the settling view.
 * CLIP=H-change holds H's pose from 10:38 to 10:56 of the mission clock
 * through the received ground change, and records the tick the ruin arrived
 * and the frame the sequence began. `REDUCED_MOTION=1` on the drive repeats
 * any clip with reduced motion. The HUD clock in the video says where each
 * hold starts and ends; `<TAG>.json` records the same ticks, so the clip can
 * be cut from the recording without re-timing it (ffmpeg -c copy).
 */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const TICK_HZ = 60;
const MODE = process.env.MODE ?? 'stations';
const CLIP = process.env.CLIP ?? 'C-still';
const TAG = process.env.TAG ?? (MODE === 'clip' ? `clip-${CLIP}` : 'gpu');
/** halo-cost.mjs's load: about 3.6 ms on the named GPU (gpuQueueLoad.ts). */
const QUEUE_STEPS = Number(process.env.QUEUE_STEPS ?? 12000);
const OUT = resolve(process.argv[process.argv.indexOf('--out') + 1]);

/** §9's stations; H is the opening camera, re-applied so a half matches. */
const STATIONS = {
  C: [2550, 2200, 420, { pitchDeg: 35, yawDeg: 25, focusDepthM: 1450 }],
  L: [2550, 2750, 650, { pitchDeg: 12, yawDeg: 0, focusDepthM: 1450 }],
  S: [2500, 2000, 6500, { pitchDeg: 55, yawDeg: 0, focusDepthM: null }],
};

const seconds = (tick) => `${Math.floor(tick / TICK_HZ / 60)}:${String(Math.floor((tick / TICK_HZ) % 60)).padStart(2, '0')}`;

export default async ({ page, shot }) => {
  await page.waitForFunction(
    () => window.__perspectiveProbe?.().modelBacked === 6 && typeof window.__echoClock === 'function',
    null,
    { timeout: 120000 }
  );
  await page.waitForTimeout(6000);
  const { renderer, viewport } = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) throw new Error('WebGL2 unavailable');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    // A spare context held for the whole run would share the GPU with it.
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { renderer, viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio } };
  });
  const software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
  if (software) {
    console.log(
      'WARNING: a software rasteriser drew this run. Its millisecond fields measure the ' +
        'rasteriser, not the scene; §9 accepts GPU time from the named desktop GPU only.'
    );
  }
  const unpaced = process.env.UNPACED === '1';
  const reducedMotion = process.env.REDUCED_MOTION === '1';
  const study = new URL(page.url()).searchParams.get('arch-study') === '1';
  const opening = await page.evaluate(() => window.__perspectiveProbe());
  const home = [opening.focus.xM, opening.focus.zM, opening.distance, { pitchDeg: opening.pitchDeg, yawDeg: opening.yawDeg, focusDepthM: null }];
  const probe = () => page.evaluate(() => window.__perspectiveProbe());
  const clock = () => page.evaluate(() => window.__echoClock());
  const poseAt = (name) =>
    page.evaluate((args) => window.__perspectiveCamera(...args), name === 'H' ? home : STATIONS[name]);
  const switches = (s) => page.evaluate((s) => window.__archStudy?.(s) ?? null, s);
  const record = { tag: TAG, mode: MODE, renderer, software, unpaced, reducedMotion, study, viewport, url: page.url() };

  if (MODE === 'stations') {
    const queueable = await page.evaluate(() => typeof window.__perspectiveGpuQueue === 'function');
    const readings = [];
    const windowful = () =>
      page.waitForFunction(
        () => {
          const p = window.__perspectiveProbe();
          const gpu = p.gpuTimer !== 'timing' || p.gpuFrames >= 240;
          return p.stationFrames >= 240 && p.overlayFrames >= 240 && gpu;
        },
        null,
        // 240 frames is four seconds on a GPU and over seven minutes on
        // SwiftShader at 1920 × 1080, whose run proves the mechanics only.
        { timeout: 15 * 60 * 1000 }
      );
    // One station: 240 frames unqueued, then 240 behind the load.
    const station = async (name) => {
      await page.evaluate((label) => window.__perspectiveStation(label), name);
      await windowful();
      const p = await probe();
      if (p.gpuTimer !== undefined) {
        assert.equal(p.gpuTimer, software ? 'software' : 'timing', `${name}: GPU timer`);
      }
      // §9's stations are the intact arch with its lamps. A GPU run holds
      // all four inside a minute; SwiftShader's took eighteen and reached
      // the 10:40 change, so a software run warns where a GPU one fails.
      if (study && p.landmarkTris !== 2412) {
        const past = `${name}: the ruin stands (${p.landmarkTris} triangles), so the run reached the 10:40 change`;
        if (software) console.log(`WARNING: ${past}`);
        else assert.fail(past);
      }
      let queued = null;
      if (queueable && p.gpuTimer === 'timing') {
        await page.evaluate((steps) => window.__perspectiveGpuQueue(steps), QUEUE_STEPS);
        await page.waitForTimeout(400);
        await page.evaluate((label) => window.__perspectiveStation(label), name);
        await windowful();
        const q = await probe();
        await page.evaluate(() => window.__perspectiveGpuQueue(0));
        queued = { gpuMs: q.avgGpuMs, worstGpuMs: q.worstGpuMs, loadMs: q.gpuQueue.avgMs, gpuDropped: q.gpuDropped, loadDropped: q.gpuQueue.dropped };
        assert.ok(queued.loadMs > p.avgGpuMs, `${name}: the load (${queued.loadMs} ms) ran out before the unqueued frame (${p.avgGpuMs} ms)`);
      }
      const tick = await clock();
      const file = await shot(`${TAG}-${name}`);
      readings.push({ name, tick, file, probe: p, queued });
      console.log(
        `| ${name} | ${seconds(tick)} | ${p.drawCalls} | ${p.triangles} | ${p.landmarks} (${p.landmarkTris}) | ${p.siftMotes} / ${p.cloudMotes} | ${p.gpuTimer} | ${p.avgGpuMs ?? '-'} / ${p.worstGpuMs ?? '-'} | ${queued ? `${queued.gpuMs} / ${queued.worstGpuMs}` : '-'} | ${p.avgConnMs} | ${p.avgOverlayMs} | ${p.avgFrameMs} |`
      );
    };
    console.log(`renderer: ${renderer}${software ? ' (software)' : ''}; dpr ${viewport.dpr}; ${unpaced ? 'unpaced' : 'paced'}; study ${study ? 'on' : 'off'}`);
    console.log('| station | clock | calls | triangles | landmark (tris) | sift / cloud | gpuTimer | gpu avg / worst ms | queued avg / worst ms | conn ms | overlay ms | frame ms |');
    console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const name of ['H', 'C', 'L', 'S']) {
      await poseAt(name);
      await page.waitForTimeout(2500);
      await station(name);
      if (name === 'C' && study) {
        const state = await switches({ pools: false, lamps: true });
        assert.ok(state !== null && state.pools === false, 'the study switch took the pools off');
        await page.waitForTimeout(800);
        await station('C-pools-off');
        await switches({ pools: true, lamps: true });
        await page.waitForTimeout(800);
      }
    }
    record.readings = readings;
  } else if (MODE === 'clip') {
    const hold = async (ms) => {
      const from = await clock();
      await page.waitForTimeout(ms);
      return { from, to: await clock() };
    };
    const waitTick = (tick) =>
      page.waitForFunction((t) => window.__echoClock() >= t, tick, { timeout: 20 * 60 * 1000 });
    if (CLIP === 'C-still') {
      await poseAt('C');
      await page.waitForTimeout(2500);
      record.hold = await hold(12000);
    } else if (CLIP === 'C-move') {
      await poseAt('C');
      await page.waitForTimeout(2500);
      record.held = await hold(4000);
      // One escort under the arch: the first own unit with a screen box on
      // screen, clicked at its centre; then a short move to its right on the
      // court's ground, then Stop (KeyX, bindings.ts).
      const unit = await page.evaluate(() => {
        const { units } = window.__perspectiveLamps();
        const seen = units.find(
          ({ screen }) => screen !== null && screen.x0 > 0 && screen.x1 < innerWidth && screen.y0 > 0 && screen.y1 < innerHeight
        );
        return seen ? { x: (seen.screen.x0 + seen.screen.x1) / 2, y: (seen.screen.y0 + seen.screen.y1) / 2 } : null;
      });
      assert.ok(unit, 'an escort on screen at C');
      await page.mouse.click(unit.x, unit.y);
      await page.waitForTimeout(800);
      record.selected = { at: unit, tick: await clock() };
      await page.mouse.click(unit.x + 160, unit.y + 20, { button: 'right' });
      record.moved = await hold(4000);
      await page.keyboard.press('KeyX');
      record.stopped = await hold(4000);
    } else if (CLIP === 'H-change') {
      await poseAt('H');
      await waitTick((10 * 60 + 38) * TICK_HZ);
      record.hold = { from: await clock() };
      // The ruin arrives on the received ground: the first probe that reads
      // the ruined state, and the first that reads the sequence running.
      const arrived = await page.evaluate(
        ({ end }) =>
          new Promise((resolve) => {
            const out = { ruinTick: null, sequenceTick: null };
            const frame = () => {
              const p = window.__perspectiveProbe();
              const t = window.__echoClock();
              if (out.ruinTick === null && p.landmarkTris === 732) out.ruinTick = t;
              if (out.sequenceTick === null && p.collapsing) out.sequenceTick = t;
              if (t >= end) resolve(out);
              else requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
          }),
        { end: (10 * 60 + 56) * TICK_HZ }
      );
      record.hold.to = await clock();
      Object.assign(record, arrived);
    } else {
      throw new Error(`CLIP must be C-still, C-move or H-change, not ${CLIP}`);
    }
    record.frame = await shot(`${TAG}-end`);
    record.probe = await probe();
    console.log(`${TAG}: ${JSON.stringify({ ...record, probe: undefined })}`);
  } else {
    throw new Error(`MODE must be stations or clip, not ${MODE}`);
  }
  writeFileSync(join(OUT, `${TAG}.json`), JSON.stringify(record, null, 2) + '\n');
};
