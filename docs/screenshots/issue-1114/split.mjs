// A run-game steps module (#1114): capture.mjs's close camera, read queued
// behind its 12,000-step load with each pass timed on its own as well
// (gpuTimer.ts's split), over three windows of 240 frames. The split says which
// pass a cost lands in; the frame it sums to is not gate 6's reading, which
// capture.mjs takes unsplit.
//
//   UNPACED=1 VIEW_DPR=1.5 node .claude/skills/run-game/scripts/drive.mjs --headed \
//     --channel msedge --url 'http://localhost:5173/?map=ventfront-divide&seabed-detail=0' \
//     --out <dir> --steps docs/screenshots/issue-1114/split.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.waitForTimeout(6000);
  const centre = await page.evaluate(() => window.__perspectiveProbe().ownCentre);
  await page.evaluate((c) => {
    window.__perspectiveCamera(c.x, c.z, 1800, { yawDeg: 0, pitchDeg: 55, focusDepthM: null });
    window.__perspectiveGpuQueue(12000);
    window.__perspectiveGpuSplit(true);
  }, centre);
  const dir = dirname(await shot('close'));
  const out = [];
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__perspectiveStation('close'));
    await page.waitForFunction(
      () => {
        const p = window.__perspectiveProbe();
        return p.stationFrames >= 240 && p.gpuFrames >= 240;
      },
      null,
      { timeout: 120000 }
    );
    const p = await page.evaluate(() => window.__perspectiveProbe());
    out.push({ gpuMs: p.avgGpuMs, loadMs: p.gpuQueue?.avgMs, parts: p.gpuParts, calls: p.drawCalls });
    // The split's series start over only with the switch.
    await page.evaluate(() => {
      window.__perspectiveGpuSplit(false);
      window.__perspectiveGpuSplit(true);
    });
  }
  writeFileSync(join(dir, 'split.json'), JSON.stringify(out, null, 2) + '\n');
  for (const r of out) {
    const parts = Object.entries(r.parts ?? {}).map(([k, v]) => `${k} ${v.avgMs}`).join(', ');
    console.log(`SPLIT frame ${r.gpuMs} | ${parts}`);
  }
};
