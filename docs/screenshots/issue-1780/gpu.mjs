import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// Gate 6 for the rim ray (#1777, #1780): issue-1713/gpu.mjs's reading, unpaced
// with the animation running, at the three stations that see the ray, §9's
// opening pose first. The fixture's list holds 291 props since #1777 and the
// deep fish's 156 photophores since #1771; GPU_PROPS=290 reads a revision
// before #1777.
const PROPS = Number(process.env.GPU_PROPS ?? 291);
const PHOTOPHORES = 156;
const PROP_CAP = 600000;

export default async ({ page, shot }) => {
  await page.waitForFunction((n) => window.__perspectiveProbe?.().props === n, PROPS);
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
  const waitWindow = () =>
    page.waitForFunction(
      () => {
        const p = window.__perspectiveProbe();
        return p.stationFrames >= 240 && p.gpuFrames >= 240;
      },
      null,
      { timeout: 120000 }
    );
  const write = () =>
    writeFileSync(
      join(dir, 'readings.json'),
      JSON.stringify(
        { renderer, unpaced: true, motion: true, dpr: Number(process.env.VIEW_DPR ?? 1), readings },
        null,
        2
      ) + '\n'
    );
  for (const [name, x, z, distance, yawDeg, pitchDeg, focusDepthM] of [
    ['opening-pose', 709, 1710, 1200, -34, 15, 300],
    ['home', 542, 1958, 2600, 0, 55, null],
    ['survey', 2000, 2000, 10000, 0, 88, null],
  ]) {
    // Independent stations also start independent WebGL query pools.
    if (readings.length > 0) {
      await page.reload();
      await page.waitForFunction((n) => window.__perspectiveProbe?.().props === n, PROPS);
    }
    await page.evaluate(
      ({ name, x, z, distance, yawDeg, pitchDeg, focusDepthM }) => {
        window.__perspectiveCamera(x, z, distance, { yawDeg, pitchDeg, focusDepthM });
        window.__perspectiveStation(name);
      },
      { name, x, z, distance, yawDeg, pitchDeg, focusDepthM }
    );
    await waitWindow();
    const p = await page.evaluate(() => window.__perspectiveProbe());
    assert.equal(p.modelBacked, 3);
    assert.equal(p.props, PROPS);
    assert.equal(p.decorativePhotophores, PHOTOPHORES);
    assert.ok(p.drawCalls <= 150 && p.triangles <= 720000);
    assert.ok(p.propTris <= PROP_CAP);
    dir = dirname(await shot(name));
    await page.evaluate(() => window.__perspectiveGpuQueue(12000));
    await page.waitForTimeout(400);
    await page.evaluate((name) => window.__perspectiveStation(name), `${name}-queued`);
    await waitWindow();
    const q = await page.evaluate(() => window.__perspectiveProbe());
    await page.evaluate(() => window.__perspectiveGpuQueue(0));
    assert.ok(q.gpuQueue.avgMs > p.avgGpuMs, `${name}: queue must outlast the frame`);
    readings.push({
      name,
      calls: p.drawCalls,
      triangles: p.triangles,
      propTriangles: p.propTris,
      instances: p.fixtureAssets,
      photophores: p.decorativePhotophores,
      textures: p.textures,
      environmentBytes: p.environmentBytes,
      haloBytes: p.haloBytes,
      splitBytes: p.splitBytes,
      gpuFrames: p.gpuFrames,
      gpuMs: p.avgGpuMs,
      queuedGpuMs: q.avgGpuMs,
      queueLoadMs: q.gpuQueue.avgMs,
      queueFrames: q.gpuFrames,
    });
    write();
  }
};
