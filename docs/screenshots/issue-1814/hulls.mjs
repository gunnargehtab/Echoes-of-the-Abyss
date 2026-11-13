// A hull in the world's light (#1814), as a run-game steps module: the
// Commune's Corvette from the nearest the conn camera comes, in the
// free-water crater with the HUD on, where its cladding is judged.
//
//   SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' VIEW_W=1920 VIEW_H=1080 \
//     node .claude/skills/run-game/scripts/drive.mjs --url 'http://localhost:5173/?study=free-water' \
//     --out docs/screenshots/issue-1814/software/rim --steps docs/screenshots/issue-1814/hulls.mjs
//
// The three target cameras, Home, Close and Survey, are
// docs/screenshots/issue-1801/frames.mjs, run into this folder. This module
// adds what they are too far to show:
//
// `near-port` and `near-bow`: a low eye 190 m and 240 m off the hull at its
// own depth, tools/hull-models/blender/frames.mjs's two.
//
// GARDEN=1 first sends the three hulls into the garden, as
// docs/screenshots/issue-1801/plates.mjs does, and takes `garden` over them
// before the near cameras: the world's own sources stand there, and none
// stands on the rim the hulls open on. TRAVEL_S is how long they are given.
//
// QUALITY=low takes the same cameras at Low. PLATES=bare takes each High
// frame a second time with the plates off (`__perspectivePlates`), the
// development switch a player has no setting for. A software rasteriser's
// frames guide a round and are never offered for acceptance (the dev-loop
// skill, "Look work").
import assert from 'node:assert/strict';

const aim = (page, x, z, distance, yawDeg, pitchDeg, focusDepthM) =>
  page.evaluate((a) => window.__perspectiveCamera(a.x, a.z, a.distance, a), {
    x,
    z,
    distance,
    yawDeg,
    pitchDeg,
    focusDepthM,
  });

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked >= 3, null, {
    timeout: 120000,
  });
  await page.waitForFunction(() => window.__perspectiveProbe().props > 0, null, {
    timeout: 120000,
  });
  const quality = process.env.QUALITY === 'low' ? 'low' : 'high';
  const drawn = await page.evaluate((q) => window.__perspectiveQuality(q), quality);
  assert.equal(drawn, quality, `the view draws ${drawn}`);
  await page.waitForFunction(() => !window.__perspectiveProbe().programHold.holding, null, {
    timeout: 120000,
  });
  const software = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|llvmpipe|software|basic render/i.test(name);
  });
  if (software) {
    console.log('WARNING: a software rasteriser drew this capture. Not offered for acceptance.');
  }
  // A High template is built the first time a model is placed at High.
  await page.waitForTimeout(software ? 8000 : 3000);
  const corvette = () =>
    page.evaluate(() => window.__perspectiveLamps().units.find((u) => u.name === 'Corvette'));
  const take = async (name) => {
    await page.waitForTimeout(software && quality === 'high' ? 8000 : 2500);
    await shot(name);
    if (quality !== 'high' || process.env.PLATES !== 'bare') return;
    await page.evaluate(() => window.__perspectivePlates(false));
    await page.waitForTimeout(software ? 4000 : 1500);
    await shot(`${name}-bare`);
    await page.evaluate(() => window.__perspectivePlates(true));
  };

  if (process.env.GARDEN === '1') {
    // At the survey dolly the map is square to the screen, north up, so a
    // plan point is a pixel (issue-1801/plates.mjs).
    await aim(page, 2000, 2000, 10000, 0, 88, null);
    await page.waitForTimeout(software ? 5000 : 2000);
    const view = page.viewportSize();
    const px = (xM, zM) => {
      const k = view.height / 1080;
      return [(650 + xM / 6.45) * k + (view.width - 1920 * k) / 2, (232 + zM / 6.45) * k];
    };
    const [x0, y0] = px(150, 1650);
    const [x1, y1] = px(950, 2300);
    await page.mouse.move(x0, y0);
    await page.mouse.down({ button: 'left' });
    await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 });
    await page.mouse.move(x1, y1, { steps: 4 });
    await page.mouse.up({ button: 'left' });
    await page.waitForTimeout(1500);
    const [gx, gy] = px(1300, 1000);
    await page.mouse.click(gx, gy, { button: 'right' });
    await page.waitForTimeout(Number(process.env.TRAVEL_S ?? 90) * 1000);
    await aim(page, 1300, 1000, 1000, -34, 32, 300);
    await take('garden');
  }

  const hull = await corvette();
  assert.ok(hull, 'the study seats no Corvette');
  await aim(page, hull.xM, hull.zM, 190, -150, 16, hull.depthM);
  await take('near-port');
  await aim(page, hull.xM, hull.zM, 240, 125, 22, hull.depthM);
  await take('near-bow');
  const probe = await page.evaluate(() => window.__perspectiveProbe());
  console.log(
    `${quality}: ${probe.passes.join(' ')} · ${probe.drawCalls} calls · ${probe.triangles} triangles`
  );
};
