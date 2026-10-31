import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export default async ({ page, shot }) => {
  await page.waitForTimeout(6000);
  const hardware = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { renderer, dpr: devicePixelRatio };
  });
  const centre = await page.evaluate(() => window.__perspectiveProbe().ownCentre);
  const software = /swiftshader|llvmpipe|software|basic render/i.test(hardware.renderer);
  const readings = [];
  let dir;
  for (const [name, distance, pitchDeg] of [
    ['home', 6000, 55], ['close', 1800, 55], ['low', 3500, 12], ['survey', 18000, 88],
    ['rolled', 200, 12],
  ]) {
    await page.keyboard.press('Home');
    await page.evaluate(({ centre, distance, pitchDeg, name }) => {
      window.__perspectiveCamera(centre.x, centre.z, distance, {
        yawDeg: 0, pitchDeg, focusDepthM: name === 'rolled' ? 350 : null,
      });
    }, { centre, distance, pitchDeg, name });
    if (name === 'rolled') {
      await page.keyboard.press('F9');
      for (let i = 0; i < 12; i++) await page.getByRole('button', { name: 'Roll left', exact: true }).click();
      await page.keyboard.press('Escape');
    }
    const sample = async () => {
      await page.evaluate((name) => window.__perspectiveStation(name), name);
      await page.waitForFunction(() => {
        const p = window.__perspectiveProbe();
        return p.stationFrames >= 240 && p.overlayFrames >= 240 &&
          (p.gpuTimer !== 'timing' || p.gpuFrames >= 240);
      }, null, { timeout: 120000 });
      return page.evaluate(() => {
        const p = window.__perspectiveProbe();
        return {
          eye: p.eye, orientation: p.orientation, drawCalls: p.drawCalls, triangles: p.triangles,
          props: p.props, propInstances: p.propInstances, textures: p.textures,
          environmentBytes: p.environmentBytes, haloBytes: p.haloBytes, splitBytes: p.splitBytes,
          gpuTimer: p.gpuTimer, avgGpuMs: p.avgGpuMs, worstGpuMs: p.worstGpuMs,
          gpuFrames: p.gpuFrames, queue: p.gpuQueue,
        };
      });
    };
    const plain = await sample();
    dir = dirname(await shot(name));
    let queued = null;
    if (!software && plain.gpuTimer === 'timing') {
      await page.evaluate((steps) => window.__perspectiveGpuQueue(steps), Number(process.env.QUEUE_STEPS ?? 12000));
      queued = await sample();
      await page.evaluate(() => window.__perspectiveGpuQueue(0));
      assert.ok(queued.queue.avgMs > plain.avgGpuMs,
        `${name}: queued load ${queued.queue.avgMs} must outlast frame ${plain.avgGpuMs}`);
    }
    readings.push({ name, plain, queued });
  }
  writeFileSync(join(dir, 'gpu.json'), JSON.stringify({
    hardware, software, unpaced: process.env.UNPACED === '1', readings,
  }, null, 2));
};
