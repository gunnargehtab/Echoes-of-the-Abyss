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
 * load (`__perspectiveGpuQueue`, tools/render-stack/capture.mjs's method; C's
 * is heavier, `QUEUE_STEPS_C`), and C is read again with the pools off
 * through the study's switch. `<TAG>.json`
 * lands beside the frames with the renderer, the pixel ratio, every station's
 * probe and both readings; a markdown row per station is printed.
 *
 * Clips, paced (no UNPACED), full screen, filmed by a screen recorder at the
 * display's rate. The drive's window must fill the display, which drive.mjs
 * does not do: #1674's run used a copy of it that launches with
 * `--start-fullscreen` (which alone did not fill the display) and, after
 * `context.newPage()`, opens a CDP session and sends `Browser.setWindowBounds`
 * with `windowState: 'fullscreen'` for the window `Browser.getWindowForTarget`
 * names. The recorder was ffmpeg 7.1.1's `ddagrab` at 60 fps into lossless
 * `h264_nvenc`, with the display held awake (a sleeping display hands it the
 * last image again). `SCREEN_START_MS` is the recorder's wall-clock start in
 * epoch milliseconds; each hold carries `screenS`, its offset into the
 * recording, so a cut re-encodes from there:
 *
 *   SCREEN_START_MS=<ms> VIEW_W=1920 VIEW_H=1080 MODE=clip CLIP=C-still TAG=clip-C-still \
 *     node <drive.mjs, full screen> --headed --channel msedge \
 *     --entry tutorial --url 'http://localhost:5173/?arch-study=1' --out <dir> \
 *     --steps docs/screenshots/issue-1674/gpu.mjs
 *
 * `RECORD_VIDEO=<dir>` instead records Playwright's screencast, VP8 at 25 fps
 * and about 1 Mbit/s, which smears a dark frame of 256 motes, and each hold
 * then carries `videoS`. It also costs the overlay: at C on the named desktop
 * 10.4 ms a frame against 7.4 under the screen recorder alone
 * (`screencast-C-still.json`), so the filed clips run without it.
 *
 * CLIP=C-still holds C with no input for 12 s (the sift, the sway and the
 * lamps). CLIP=C-move holds C for 4 s, selects one escort, orders a short
 * move within the court (the click carries its own depth, so the JSON
 * records the hull's depth before and after and holds it to §9's "no
 * dive"), presses Stop once the hull has run RUN_M, records the wake it shed,
 * and holds the settling view to 12 s: the proof of Stop is a hull settled
 * short of the order, which a GPU run asserts and a software run, whose
 * frames outrun the key, records and warns of.
 * CLIP=H-change holds H's pose from 10:38 to 10:56 of the mission clock
 * through the received ground change, and records the tick the ruin arrived
 * and the frame the sequence began. CLIP=H-reload holds H's pose past the
 * ruin at 10:44, reloads, presses Resume and reads every frame from the first
 * that draws a landmark: §9 holds that one to the ruin, with no intact frame,
 * no sequence and no cloud after it. `REDUCED_MOTION=1` on the drive repeats
 * any clip with reduced motion. The HUD clock in the video says where each
 * hold starts and ends; `<TAG>.json` records the same ticks and the seconds
 * from the recording's start, so a cut re-encodes from that offset
 * (ffmpeg -ss <offset> -i …, never -c copy: a stream copy starts at the
 * previous keyframe, which can be seconds away).
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
/**
 * C's load, about 12 ms. The overlay spends about 7 ms a frame at C, so its
 * frames ship every 10 ms and the default load left the GPU idle for most of
 * each: C read 2.0–3.6 ms queued, the pools off above the pools on in two
 * runs of four. Behind this load it read within 0.03 ms of itself. A load at
 * every station slows the run until L and S reach a later, different scene.
 */
const QUEUE_STEPS_C = Number(process.env.QUEUE_STEPS_C ?? 40000);
/**
 * C-move's run before Stop, about a second of a Light Scout at 105–120 m/s.
 * Its wake sheds a bubble every 44 m at that speed (hullWake.ts); a scratch
 * probe at C saw the first about 0.55 s and 55 m after the order, and a 48 m
 * take, not kept, shed none.
 */
const RUN_M = Number(process.env.RUN_M ?? 120);
const OUT = resolve(process.argv[process.argv.indexOf('--out') + 1]);

/** §9's stations; H is the opening camera, re-applied so a half matches. */
const STATIONS = {
  C: [2550, 2200, 420, { pitchDeg: 35, yawDeg: 25, focusDepthM: 1450 }],
  L: [2550, 2750, 650, { pitchDeg: 12, yawDeg: 0, focusDepthM: 1450 }],
  S: [2500, 2000, 6500, { pitchDeg: 55, yawDeg: 0, focusDepthM: null }],
};

const seconds = (tick) => `${Math.floor(tick / TICK_HZ / 60)}:${String(Math.floor((tick / TICK_HZ) % 60)).padStart(2, '0')}`;

export default async ({ page, shot, recordingStartedMs = null }) => {
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
        // 240 frames is four seconds on a GPU and about five minutes on
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
      // all four inside a minute; SwiftShader's took sixteen and reached
      // the 10:40 change, so a software run warns where a GPU one fails.
      // The intact model is 2,626 triangles since #1683's refinement (2,412
      // before it); environment.ts's triBudget holds the count.
      if (study && p.landmarkTris !== 2626) {
        const past = `${name}: the ruin stands (${p.landmarkTris} triangles), so the run reached the 10:40 change`;
        if (software) console.log(`WARNING: ${past}`);
        else assert.fail(past);
      }
      let queued = null;
      if (queueable && p.gpuTimer === 'timing') {
        const steps = name.startsWith('C') ? QUEUE_STEPS_C : QUEUE_STEPS;
        await page.evaluate((steps) => window.__perspectiveGpuQueue(steps), steps);
        await page.waitForTimeout(400);
        await page.evaluate((label) => window.__perspectiveStation(label), name);
        await windowful();
        const q = await probe();
        await page.evaluate(() => window.__perspectiveGpuQueue(0));
        queued = { steps, gpuMs: q.avgGpuMs, worstGpuMs: q.worstGpuMs, loadMs: q.gpuQueue.avgMs, gpuDropped: q.gpuDropped, loadDropped: q.gpuQueue.dropped };
        assert.ok(queued.loadMs > p.avgGpuMs, `${name}: the load (${queued.loadMs} ms) ran out before the unqueued frame (${p.avgGpuMs} ms)`);
        // A load shorter than the interval between frames lets the GPU idle
        // and drop its clock, which the timer then reads as frame cost.
        assert.ok(queued.loadMs > p.avgFrameMs, `${name}: the load (${queued.loadMs} ms) is shorter than the frame interval (${p.avgFrameMs} ms)`);
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
    // C goes last: the pools-off station, behind C's heavier load, runs only
    // in the on half, and taken second it put that half's L and S a minute
    // or two of mission time behind the off half's, at another scene.
    for (const name of ['H', 'L', 'S', 'C']) {
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
    // The recording's encoder, so a reader of the JSON knows what the WebM
    // can show (playwright-core's screencast: VP8, 25 fps, about 1 Mbit/s).
    record.video = recordingStartedMs === null ? null : { codec: 'vp8', fps: 25, bitrate: '1M', startedMs: recordingStartedMs };
    const offset = () => (recordingStartedMs === null ? null : Number(((Date.now() - recordingStartedMs) / 1000).toFixed(1)));
    const screenStartMs = process.env.SCREEN_START_MS ? Number(process.env.SCREEN_START_MS) : null;
    record.screen = screenStartMs === null ? null : { startedMs: screenStartMs };
    const screenOffset = () => (screenStartMs === null ? null : Number(((Date.now() - screenStartMs) / 1000).toFixed(2)));
    const mark = async () => ({ tick: await clock(), videoS: offset(), screenS: screenOffset() });
    const hold = async (ms) => {
      const from = await mark();
      await page.waitForTimeout(ms);
      return { from, to: await mark() };
    };
    const unitAt = (id) =>
      page.evaluate((id) => {
        const u = window.__perspectiveLamps().units.find((u) => u.id === id);
        return u ? { id, xM: u.xM, zM: u.zM, depthM: u.depthM } : null;
      }, id);
    const metres = (a, b) => Math.hypot(a.xM - b.xM, a.zM - b.zM);
    const waitTick = (tick) =>
      page.waitForFunction((t) => window.__echoClock() >= t, tick, { timeout: 20 * 60 * 1000 });
    if (CLIP === 'C-still') {
      await poseAt('C');
      await page.waitForTimeout(2500);
      record.hold = await hold(12000);
    } else if (CLIP === 'C-move') {
      await poseAt('C');
      await page.waitForTimeout(2500);
      const heldAt = Date.now();
      record.held = await hold(4000);
      // One escort under the arch: the first own unit with a screen box on
      // screen, clicked at its centre; then a short move to its right on the
      // court's ground, then Stop (KeyX, bindings.ts).
      const unit = await page.evaluate(() => {
        const { units } = window.__perspectiveLamps();
        const seen = units.find(
          ({ screen }) => screen !== null && screen.x0 > 0 && screen.x1 < innerWidth && screen.y0 > 0 && screen.y1 < innerHeight
        );
        return seen
          ? { id: seen.id, name: seen.name, x: (seen.screen.x0 + seen.screen.x1) / 2, y: (seen.screen.y0 + seen.screen.y1) / 2 }
          : null;
      });
      assert.ok(unit, 'an escort on screen at C');
      const before = await unitAt(unit.id);
      await page.mouse.click(unit.x, unit.y);
      await page.waitForTimeout(800);
      record.selected = { unit, ...(await mark()) };
      // A long order, about 200 m east at C's dolly, with Stop pressed once
      // the hull has run RUN_M, or for a second and a half: an ordinary short
      // move with a wake behind it, as §9 asks, where Stop on the first
      // reading under way showed a 4 m twitch and no wake. The order's round
      // trip is tens of milliseconds on a GPU and seconds on SwiftShader,
      // and a frame there can take seconds, so the page polls for the
      // reading rather than a timer, and the proof of Stop is where the
      // hull settles: metres from where it was and well short of the order.
      await page.mouse.click(unit.x + 800, unit.y + 20, { button: 'right' });
      record.moved = { from: await mark() };
      const run = await page.evaluate(
        ({ id, start, runM }) =>
          new Promise((resolve) => {
            const t0 = performance.now();
            const out = { underWay: null, atStop: null, wakePeak: 0 };
            const poll = () => {
              const u = window.__perspectiveLamps().units.find((u) => u.id === id);
              const now = u ? { id, xM: u.xM, zM: u.zM, depthM: u.depthM, tick: window.__echoClock() } : null;
              out.wakePeak = Math.max(out.wakePeak, window.__perspectiveProbe().wakeBubbles ?? 0);
              const m = now === null ? 0 : Math.hypot(now.xM - start.xM, now.zM - start.zM);
              if (out.underWay === null && m >= 2) out.underWay = { ...now, ms: performance.now() };
              if (out.underWay !== null && (m >= runM || performance.now() - out.underWay.ms > 1500)) {
                out.atStop = now;
                return resolve(out);
              }
              if (performance.now() - t0 > 15000) return resolve(out);
              setTimeout(poll, 50);
            };
            poll();
          }),
        { id: unit.id, start: before, runM: RUN_M }
      );
      const underWay = run.underWay;
      await page.keyboard.press('KeyX');
      const stopped = await mark();
      record.moved.to = stopped;
      await page.waitForTimeout(2000);
      const settling = await unitAt(unit.id);
      await page.waitForTimeout(2000);
      const settled = await unitAt(unit.id);
      // §9's clip is twelve seconds from the hold; the move and Stop take
      // about ten, so the settled view stays on screen for the rest.
      await page.waitForTimeout(Math.max(0, heldAt + 12500 - Date.now()));
      record.stopped = { from: stopped, to: await mark() };
      // The order took and Stop took: the hull was under way when Stop was
      // pressed, it holds still from two to four seconds after, and it
      // settled far short of the order's length. The depth the click carried
      // is recorded, and bounded well under anything a dive order would do.
      record.escort = {
        before,
        underWay,
        settled,
        orderM: 200,
        atStop: run.atStop,
        movedAtStopM: run.atStop === null ? null : Number(metres(before, run.atStop).toFixed(1)),
        wakePeakWhileMoving: run.wakePeak,
        settledM: Number(metres(before, settled).toFixed(1)),
        driftAfterStopM: Number(metres(settling, settled).toFixed(2)),
        depthChangeM: Number((settled.depthM - before.depthM).toFixed(1)),
      };
      writeFileSync(join(OUT, `${TAG}.json`), JSON.stringify(record, null, 2) + '\n');
      assert.ok(underWay !== null, 'the escort moved on the order within 15 s');
      // §9's "existing wake": a hull under way sheds bubbles (hullWake.ts).
      // The probe's count is the whole fleet's, so this holds that a wake
      // appeared during the move, not that it is this hull's alone.
      if (!software) assert.ok(run.wakePeak > 0, 'a wake appeared while the escort moved');
      assert.ok(record.escort.settledM >= 2, `the escort moved ${record.escort.settledM} m on the order`);
      // A Light Scout makes 105–120 m a second on the named desktop, so on
      // SwiftShader, whose frames take seconds, the key lands after the
      // order has arrived: a software run records that and warns, a GPU run
      // fails.
      const short = `Stop cut the order short (${record.escort.settledM} m of about 200)`;
      if (record.escort.settledM >= 180) {
        if (software) console.log(`WARNING: not ${short}: the hull arrived before the key landed`);
        else assert.fail(short);
      }
      assert.ok(record.escort.driftAfterStopM <= 1, `the escort held after Stop (${record.escort.driftAfterStopM} m of drift)`);
      assert.ok(Math.abs(record.escort.depthChangeM) <= 50, `no dive: the order changed depth by ${record.escort.depthChangeM} m`);
    } else if (CLIP === 'H-change') {
      await poseAt('H');
      await waitTick((10 * 60 + 38) * TICK_HZ);
      record.hold = { from: await mark() };
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
      record.hold.to = await mark();
      Object.assign(record, arrived);
    } else if (CLIP === 'H-reload') {
      // §9: reload after 10:40 and the ruin stands from the first frame,
      // with no sequence. Resume redeems the tab's parked seat (GameClient's
      // sessionStorage token), so the reload lands in the same match.
      await poseAt('H');
      await waitTick((10 * 60 + 44) * TICK_HZ);
      await page.waitForFunction(() => window.__perspectiveProbe().landmarkTris === 732, null, { timeout: 60000 });
      record.before = { ...(await mark()), probe: await probe() };
      const reloadedAt = await mark();
      await page.reload();
      // The watcher starts on the title screen, before Resume mounts the
      // view, so the first frame that draws a landmark is the one it reads.
      await page.evaluate(() => {
        const out = { frames: 0, first: null, intactFrames: 0, collapsingFrames: 0, cloudFrames: 0 };
        window.__reloadWatch = out;
        const frame = () => {
          const p = window.__perspectiveProbe?.();
          if (p && p.landmarks > 0) {
            out.frames += 1;
            if (out.first === null) out.first = { tick: window.__echoClock(), landmarkTris: p.landmarkTris, collapsing: p.collapsing, cloudMotes: p.cloudMotes };
            if (p.landmarkTris !== 732) out.intactFrames += 1;
            if (p.collapsing) out.collapsingFrames += 1;
            if (p.cloudMotes > 0) out.cloudFrames += 1;
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      await page.getByRole('button', { name: /^Resume match/ }).click();
      await page.waitForFunction(() => (window.__reloadWatch?.frames ?? 0) > 0, null, { timeout: 120000 });
      record.reload = { from: reloadedAt, firstDrawn: await mark() };
      await page.waitForTimeout(8000);
      record.reload.to = await mark();
      record.reload.watch = await page.evaluate(() => window.__reloadWatch);
      writeFileSync(join(OUT, `${TAG}.json`), JSON.stringify(record, null, 2) + '\n');
      const { first, intactFrames, collapsingFrames, cloudFrames } = record.reload.watch;
      assert.equal(first.landmarkTris, 732, `the first drawn frame after the reload is the ruin (${first.landmarkTris} triangles)`);
      assert.equal(intactFrames, 0, 'no frame after the reload drew the intact arch');
      assert.equal(collapsingFrames, 0, 'no frame after the reload ran the sequence');
      assert.equal(cloudFrames, 0, 'no frame after the reload drew the cloud');
    } else {
      throw new Error(`CLIP must be C-still, C-move, H-change or H-reload, not ${CLIP}`);
    }
    record.frame = await shot(`${TAG}-end`);
    record.probe = await probe();
    console.log(`${TAG}: ${JSON.stringify({ ...record, probe: undefined })}`);
  } else {
    throw new Error(`MODE must be stations or clip, not ${MODE}`);
  }
  writeFileSync(join(OUT, `${TAG}.json`), JSON.stringify(record, null, 2) + '\n');
};
