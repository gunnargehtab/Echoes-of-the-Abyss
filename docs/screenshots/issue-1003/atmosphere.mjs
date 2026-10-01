// #1003 evidence: the sway moves the eye and never the aim; the vignette on and off.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.waitForTimeout(6000);
  const reads = [];
  for (let i = 0; i < 5; i++) {
    reads.push(
      await page.evaluate(() => {
        const p = window.__perspectiveProbe();
        return {
          t: Math.round(performance.now()),
          sway: p.sway,
          focus: p.focus,
          eye: p.eye,
          yawDeg: p.yawDeg,
          pitchDeg: p.pitchDeg,
          distance: p.distance,
          drawCalls: p.drawCalls,
          triangles: p.triangles,
        };
      })
    );
    await page.waitForTimeout(2200);
  }
  for (const r of reads) console.log('probe', JSON.stringify(r));
  const on = await shot('vignette-on');
  await page.addStyleTag({ content: '.perspective-host::after { display: none !important; }' });
  await page.waitForTimeout(400);
  await shot('vignette-off');
  writeFileSync(join(dirname(on), 'sway-probe.json'), JSON.stringify(reads, null, 2));
};
