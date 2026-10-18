// #1460: the pilot's surround, drawn because the room named the region.
// Veil off (as #1457's frames) so the exterior's relief reads; a survey and
// a corner frame, each with the probe's counts.
export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked > 0);
  await page.evaluate(async () => {
    const store = await import('/src/settings/store.ts');
    store.saveSettings({ acousticVeil: 0 });
  });
  await page.waitForTimeout(4000);
  const frames = [
    ['survey', [2500, 2000, 16000, { yawDeg: 0, pitchDeg: 88 }]],
    ['corner-se', [5000, 4000, 4200, { yawDeg: 45, pitchDeg: 35 }]],
  ];
  const rows = [];
  for (const [name, args] of frames) {
    await page.evaluate((a) => window.__perspectiveCamera(...a), args);
    await page.waitForTimeout(2500);
    await shot(name);
    const p = await page.evaluate(() => window.__perspectiveProbe());
    rows.push({ name, calls: p.drawCalls, triangles: p.triangles });
  }
  console.log(JSON.stringify(rows));
};
