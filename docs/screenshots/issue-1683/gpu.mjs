/**
 * #1683's GPU clause of docs/sorrowgate-arch-study.md §11: GPU time with the
 * court bounce and the distance grade on and off, on the named desktop GPU,
 * as a run-game `--steps` module. One session with the study on reads each of
 * §9's stations under four settings of the study's switches: both on, the
 * bounce off, the grade off, both off. Off compiles the term out of its
 * materials (landmarkLight.ts `setCourtBounceCompiled`, distanceGrade.ts
 * `setDistanceGradeOn`), so the reading times the code, not a zeroed uniform.
 *
 * The settings run in the order on, bounce, grade, both, then back (both,
 * grade, bounce, on), so a drift through the station's minute weighs on every
 * setting alike. Each reading is 240 GPU frames behind #1674's queue load
 * (`__perspectiveGpuQueue`): 3.6 ms, and 12 ms at C, whose frames ship every
 * 10 ms (#1674's README, "The GPU run"). A software rasteriser runs it too and
 * its JSON says so: those milliseconds are not evidence.
 *
 *   UNPACED=1 VIEW_W=1920 VIEW_H=1080 TAG=gpu-dpr1-r1 \
 *     node .claude/skills/run-game/scripts/drive.mjs --headed --channel chrome \
 *     --entry tutorial --url 'http://localhost:5173/?arch-study=1' --out <dir> \
 *     --steps docs/screenshots/issue-1683/gpu.mjs
 *
 * `VIEW_DPR=1.5` takes the second ratio. `<TAG>.json` lands beside the frames
 * with the renderer, the pixel ratio and every reading; a markdown row per
 * station is printed.
 */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const TICK_HZ = 60;
const TAG = process.env.TAG ?? 'gpu';
const QUEUE_STEPS = Number(process.env.QUEUE_STEPS ?? 12000);
const QUEUE_STEPS_C = Number(process.env.QUEUE_STEPS_C ?? 40000);
const OUT = resolve(process.argv[process.argv.indexOf('--out') + 1]);

/** §9's stations, as #1674's gpu.mjs poses them; H is the opening camera. */
const STATIONS = {
  C: [2550, 2200, 420, { pitchDeg: 35, yawDeg: 25, focusDepthM: 1450 }],
  L: [2550, 2750, 650, { pitchDeg: 12, yawDeg: 0, focusDepthM: 1450 }],
  S: [2500, 2000, 6500, { pitchDeg: 55, yawDeg: 0, focusDepthM: null }],
};
const SETTINGS = ['on', 'bounce-off', 'grade-off', 'both-off'];
const ORDER = [...SETTINGS, ...[...SETTINGS].reverse()];

const clockOf = (tick) =>
  `${Math.floor(tick / TICK_HZ / 60)}:${String(Math.floor((tick / TICK_HZ) % 60)).padStart(2, '0')}`;
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const ms = (x) => x.toFixed(2);

export default async ({ page, shot }) => {
  await page.waitForFunction(
    () =>
      window.__perspectiveProbe?.().modelBacked === 6 && typeof window.__echoClock === 'function',
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
    return {
      renderer,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    };
  });
  const software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
  if (software) {
    console.log('WARNING: a software rasteriser drew this run; its milliseconds are not evidence.');
  }
  const study = new URL(page.url()).searchParams.get('arch-study') === '1';
  assert.ok(study, 'the study is on: §11 times its switches');
  const switches = (s) => page.evaluate((s) => window.__archStudy(s), s);
  const stands = await switches({});
  const gain = stands.bounce;
  assert.ok(gain > 0 && stands.grade, 'the study opens with the bounce and the grade on');
  const SWITCH = {
    on: { bounce: gain, grade: true },
    'bounce-off': { bounce: 0, grade: true },
    'grade-off': { bounce: gain, grade: false },
    'both-off': { bounce: 0, grade: false },
  };
  const opening = await page.evaluate(() => window.__perspectiveProbe());
  const home = [
    opening.focus.xM,
    opening.focus.zM,
    opening.distance,
    { pitchDeg: opening.pitchDeg, yawDeg: opening.yawDeg, focusDepthM: null },
  ];
  const probe = () => page.evaluate(() => window.__perspectiveProbe());
  const clock = () => page.evaluate(() => window.__echoClock());
  const poseAt = (name) =>
    page.evaluate((args) => window.__perspectiveCamera(...args), name === 'H' ? home : STATIONS[name]);
  const windowful = () =>
    page.waitForFunction(
      () => {
        const p = window.__perspectiveProbe();
        const gpu = p.gpuTimer !== 'timing' || p.gpuFrames >= 240;
        return p.stationFrames >= 240 && gpu;
      },
      null,
      { timeout: 15 * 60 * 1000 }
    );

  const record = {
    tag: TAG,
    renderer,
    software,
    unpaced: process.env.UNPACED === '1',
    viewport,
    url: page.url(),
    gain,
    order: ORDER,
    stations: [],
  };
  console.log(`renderer: ${renderer}; dpr ${viewport.dpr}; bounce gain ${gain}`);
  console.log(
    '| station | clock | load ms | on | bounce off | grade off | both off | bounce | grade | both |'
  );
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const name of ['H', 'L', 'S', 'C']) {
    await poseAt(name);
    await page.waitForTimeout(2500);
    const steps = name === 'C' ? QUEUE_STEPS_C : QUEUE_STEPS;
    await page.evaluate((steps) => window.__perspectiveGpuQueue(steps), steps);
    await page.waitForTimeout(400);
    const from = await clock();
    const readings = [];
    for (const setting of ORDER) {
      const state = await switches(SWITCH[setting]);
      assert.equal(state.bounce, SWITCH[setting].bounce, `${name} ${setting}: the bounce`);
      assert.equal(state.grade, SWITCH[setting].grade, `${name} ${setting}: the grade`);
      // The switch recompiles on the next draw; let the link land before
      // the window opens, so no reading carries a compile.
      await page.waitForTimeout(1000);
      await page.evaluate((label) => window.__perspectiveStation(label), `${name}-${setting}`);
      await windowful();
      const p = await probe();
      if (!software) assert.equal(p.gpuTimer, 'timing', `${name} ${setting}: GPU timer`);
      // §9's stations are the intact arch; 2,626 triangles since #1683.
      if (p.landmarkTris !== 2626) {
        const past = `${name} ${setting}: the ruin stands (${p.landmarkTris} triangles)`;
        if (software) console.log(`WARNING: ${past}`);
        else assert.fail(past);
      }
      assert.ok(
        p.gpuQueue.avgMs > p.avgFrameMs,
        `${name} ${setting}: the load (${p.gpuQueue.avgMs} ms) is shorter than the frame interval (${p.avgFrameMs} ms)`
      );
      readings.push({
        setting,
        tick: await clock(),
        gpuMs: p.avgGpuMs,
        worstGpuMs: p.worstGpuMs,
        gpuDropped: p.gpuDropped,
        loadMs: p.gpuQueue.avgMs,
        loadDropped: p.gpuQueue.dropped,
        frameMs: p.avgFrameMs,
        connMs: p.avgConnMs,
        drawCalls: p.drawCalls,
        triangles: p.triangles,
        landmarkTris: p.landmarkTris,
      });
    }
    await switches(SWITCH.on);
    await page.evaluate(() => window.__perspectiveGpuQueue(0));
    await page.waitForTimeout(1000);
    const file = await shot(`${TAG}-${name}`);
    const by = Object.fromEntries(
      SETTINGS.map((s) => [s, mean(readings.filter((r) => r.setting === s).map((r) => r.gpuMs))])
    );
    const cost = {
      bounce: by.on - by['bounce-off'],
      grade: by.on - by['grade-off'],
      both: by.on - by['both-off'],
    };
    record.stations.push({ name, from, file, steps, means: by, cost, readings });
    console.log(
      `| ${name} | ${clockOf(from)} | ${ms(mean(readings.map((r) => r.loadMs)))} | ${SETTINGS.map((s) => ms(by[s])).join(' | ')} | ${ms(cost.bounce)} | ${ms(cost.grade)} | ${ms(cost.both)} |`
    );
  }
  writeFileSync(join(OUT, `${TAG}.json`), `${JSON.stringify(record, null, 2)}\n`);
};
