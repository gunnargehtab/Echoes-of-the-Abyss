// Gate 6's fight station for the silt detail (#1083), as a run-game `--steps`
// module: the fight staged as tools/render-stack/halo-cost.mjs stages it, read
// once queued and once unqueued on one page load, written as fight.json.
//
//   UNPACED=1 node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
//     --url 'http://localhost:5173/?map=ventfront-divide&seabed-detail=1' --out <dir> \
//     --steps docs/screenshots/issue-1083/fight.mjs
//
// The layer is a URL flag, not a switch the page can turn, so off and on are
// two page loads, as capture.mjs reads them; gate 6 asks for two runs of each
// at ratio 1 and `VIEW_DPR=1.5`. Not a gate.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** halo-cost.mjs's load: about 3.6 ms on the named GPU. */
const QUEUE_STEPS = Number(process.env.QUEUE_STEPS ?? 12000);
const FRAMES = 240;
/** Where the friendly cluster sits on drive.mjs's 1440×900 viewport (stations.mjs). */
const CENTRE = { x: 720, y: 450 };

async function read(page, label, queued) {
  await page.evaluate((steps) => window.__perspectiveGpuQueue(steps), queued ? QUEUE_STEPS : 0);
  await page.waitForTimeout(400);
  await page.evaluate((name) => window.__perspectiveStation(name), label);
  await page.waitForFunction(
    (n) => {
      const p = window.__perspectiveProbe();
      return p.stationFrames >= n && p.gpuFrames >= n;
    },
    FRAMES,
    { timeout: 120000 }
  );
  const p = await page.evaluate(() => window.__perspectiveProbe());
  assert.equal(p.gpuTimer, 'timing', `${label}: the GPU timer is ${p.gpuTimer}`);
  return {
    queued,
    gpuMs: p.avgGpuMs,
    worstGpuMs: p.worstGpuMs,
    loadMs: p.gpuQueue?.avgMs ?? null,
    connMs: p.avgConnMs,
    calls: p.drawCalls,
    triangles: p.triangles,
    halo: p.halo,
  };
}

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.waitForTimeout(6000);
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
    !/swiftshader|llvmpipe|software|basic render/i.test(renderer),
    `a software rasteriser (${renderer}) gives no gate-6 time`
  );
  assert.equal(process.env.UNPACED, '1', 'gate 6 reads GPU time unpaced (drive.mjs UNPACED=1)');
  const centre = await page.evaluate(() => window.__perspectiveProbe().ownCentre);
  assert.ok(centre, 'match must contain an own force');
  // The fight, staged as halo-cost.mjs stages it: the fleet selected, a
  // noisemaker and a mine in the water, a move order, and a ping last.
  await page.evaluate(
    (c) =>
      window.__perspectiveCamera(c.x, c.z, 6000, { yawDeg: 0, pitchDeg: 55, focusDepthM: null }),
    centre
  );
  await page.waitForTimeout(400);
  await page.mouse.move(CENTRE.x - 260, CENTRE.y - 190);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(CENTRE.x - 260 + i * 65, CENTRE.y - 190 + i * 48);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
  await page.waitForTimeout(600);
  await page.keyboard.press('KeyN');
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyM');
  await page.waitForTimeout(300);
  await page.mouse.click(CENTRE.x + 210, CENTRE.y - 150, { button: 'right' });
  await page.waitForTimeout(400);
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(600);
  const dir = dirname(await shot('fight'));
  const queued = await read(page, 'fight', true);
  const unqueued = await read(page, 'fight', false);
  await page.evaluate(() => window.__perspectiveGpuQueue(0));
  assert.ok(
    queued.loadMs > unqueued.gpuMs,
    `the load took ${queued.loadMs} ms, under the unqueued frame's ${unqueued.gpuMs} ms`
  );
  const search = await page.evaluate(() => location.search);
  const record = { renderer, viewport, search, queueSteps: QUEUE_STEPS, queued, unqueued };
  writeFileSync(join(dir, 'fight.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify(record));
};
