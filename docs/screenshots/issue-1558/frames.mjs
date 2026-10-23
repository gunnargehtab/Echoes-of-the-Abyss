export default async ({ page, shot }) => {
  await page.waitForTimeout(6000);
  await shot('home-frame');
  const aims = [
    ['zoomed-out-70', [4000, 4000, 8400, { pitchDeg: 70 }]],
    ['low-15-focus-600', [4000, 4000, 6400, { pitchDeg: 15, focusDepthM: 600 }]],
    ['turned-45-past-corner', [1200, 1200, 3000, { yawDeg: -45, pitchDeg: 30 }]],
  ];
  for (const [name, args] of aims) {
    await page.evaluate((a) => window.__perspectiveCamera(...a), args);
    await page.waitForTimeout(1500);
    await shot(name);
  }
};
