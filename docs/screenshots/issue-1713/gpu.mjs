import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().props === 184);
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    gl.getExtension('WEBGL_lose_context').loseContext();
    return name;
  });
  assert.doesNotMatch(renderer, /swiftshader|llvmpipe|software|basic render/i);
  assert.equal(process.env.UNPACED, '1');
  const readings = [];
  let dir;
  const waitWindow = async () => {
    try {
      await page.waitForFunction(() => {
        const p = window.__perspectiveProbe();
        return p.stationFrames >= 240 && p.gpuFrames >= 240;
      }, null, { timeout: 120000 });
    } catch (error) {
      console.error(JSON.stringify(await page.evaluate(() => ({
        probe: window.__perspectiveProbe(),
        contexts: [...document.querySelectorAll('canvas')].map((canvas) => {
          const gl = canvas.getContext('webgl2');
          return gl ? { lost: gl.isContextLost(), error: gl.getError() } : null;
        }),
      }))));
      throw error;
    }
  };
  for (const [name, x, z, distance, pitchDeg, focusDepthM] of [
    ['home', 542, 1958, 2600, 55, null],
    ['garden-close', 1875, 875, 250, 12, 275],
    ['low', 2000, 2000, 1600, 12, 850],
    ['survey', 2000, 2000, 10000, 88, null],
  ]) {
    if (process.env.GPU_STATIONS && !process.env.GPU_STATIONS.split(',').includes(name)) continue;
    // Independent stations also start independent WebGL query pools.
    if (readings.length > 0) {
      await page.reload();
      await page.waitForFunction(() => window.__perspectiveProbe?.().props === 184);
    }
    await page.evaluate(({ name, x, z, distance, pitchDeg, focusDepthM }) => {
      window.__perspectiveCamera(x, z, distance, { yawDeg: 0, pitchDeg, focusDepthM });
      window.__perspectiveStation(name);
    }, { name, x, z, distance, pitchDeg, focusDepthM });
    await waitWindow();
    const p = await page.evaluate(() => window.__perspectiveProbe());
    assert.equal(p.modelBacked, 3);
    assert.equal(p.props, 184);
    assert.equal(p.decorativePhotophores, 48);
    assert.ok(p.drawCalls <= 150 && p.triangles <= 720000);
    assert.ok(p.propTris <= 400000);
    dir = dirname(await shot(name));
    await page.evaluate(() => window.__perspectiveGpuQueue(12000));
    await page.waitForTimeout(400);
    await page.evaluate((name) => window.__perspectiveStation(name), `${name}-queued`);
    await waitWindow();
    const q = await page.evaluate(() => window.__perspectiveProbe());
    await page.evaluate(() => window.__perspectiveGpuQueue(0));
    assert.ok(q.gpuQueue.avgMs > p.avgGpuMs, `${name}: queue must outlast the frame`);
    readings.push({
      name, calls: p.drawCalls, triangles: p.triangles, propTriangles: p.propTris,
      instances: p.fixtureAssets, photophores: p.decorativePhotophores, textures: p.textures,
      environmentBytes: p.environmentBytes, haloBytes: p.haloBytes, splitBytes: p.splitBytes,
      gpuFrames: p.gpuFrames, gpuMs: p.avgGpuMs, queuedGpuMs: q.avgGpuMs,
      queueLoadMs: q.gpuQueue.avgMs, queueFrames: q.gpuFrames,
    });
    writeFileSync(join(dir, 'readings.json'), JSON.stringify({
      renderer, unpaced: true, motion: true, dpr: Number(process.env.VIEW_DPR ?? 1), readings,
    }, null, 2) + '\n');
  }
  writeFileSync(join(dir, 'readings.json'), JSON.stringify({
    renderer, unpaced: true, motion: true, dpr: Number(process.env.VIEW_DPR ?? 1), readings,
  }, null, 2) + '\n');
};
