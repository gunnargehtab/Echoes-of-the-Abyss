// World light in the colour-vision palettes (#1854), as a run-game steps
// module: each licensed family the map stands, close, at Low then at High,
// in the standard, deuteranopia and protanopia palettes. The palette is
// changed mid-match through the settings store, with no reload, so a frame
// also shows that a standing ember, prop and pool follow the change.
//
//   SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' \
//     node .claude/skills/run-game/scripts/drive.mjs \
//     --url 'http://localhost:5173/?map=ventfront-divide' \
//     --out /tmp/issue-1854/after/ventfront --steps docs/screenshots/issue-1854/frames.mjs
//
// and the same against `?map=abyssal-rift-corridor`, the one skirmish map that
// stands a crystal. A before set is this module against servers at the base
// commit. `sheet.py` lays the two sets beside each other.
//
// `sites.json` is every licensed prop the default placement stands on those
// two maps, by family (environment.ts `placeAll`, which is a pure function of
// the public ground). The module frames the one nearest the own base, where
// the acoustic veil leaves the ground at full colour.
//
// A software rasteriser's frames are labelled so in readings.json and are
// never offered for acceptance.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITES = JSON.parse(readFileSync(join(HERE, 'sites.json'), 'utf8'));
const PALETTES = ['standard', 'deuteranopia', 'protanopia'];
const QUALITIES = (process.env.QUALITY ?? 'low,high').split(',');

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().modelBacked >= 3, null, {
    timeout: 120000,
  });
  await page.waitForFunction(() => window.__perspectiveProbe().props > 0, null, {
    timeout: 120000,
  });
  await page.waitForTimeout(3000);
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  });
  const software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
  if (software) {
    console.log(
      'WARNING: a software rasteriser drew this capture. Its frames may guide a round and ' +
        'are never offered for acceptance.'
    );
  }

  const map = new URL(page.url()).searchParams.get('map');
  const families = SITES[map];
  assert.ok(families, `no sites recorded for map ${map}`);
  const own = await page.evaluate(() => window.__perspectiveProbe().ownCentre);
  assert.ok(own, 'the own force has a centre');
  const poses = Object.entries(families).map(([family, list]) => {
    const [x, z] = list.reduce((best, at) =>
      Math.hypot(at[0] - own.x, at[1] - own.z) < Math.hypot(best[0] - own.x, best[1] - own.z)
        ? at
        : best
    );
    return { family, x, z, fromBaseM: Math.round(Math.hypot(x - own.x, z - own.z)) };
  });

  // The store the shell subscribes to: the same module instance the page
  // loaded, so this is the settings screen's own write.
  const setPalette = async (name) => {
    await page.evaluate(async (name) => {
      const store = await import('/src/settings/store.ts');
      store.saveSettings({ palette: name });
    }, name);
    // One ember bucket and a frame for the pools to stand again.
    await page.waitForTimeout(software ? 2500 : 600);
  };
  const setQuality = async (quality) => {
    const drawn = await page.evaluate((q) => window.__perspectiveQuality(q), quality);
    assert.equal(drawn, quality, `the view draws ${drawn}, asked ${quality}`);
    await page.waitForFunction(() => !window.__perspectiveProbe().programHold.holding, null, {
      timeout: 120000,
    });
    await page.waitForTimeout(software ? 4000 : 1500);
  };

  const readings = { renderer, software, map, own, poses, frames: [] };
  for (const quality of QUALITIES) {
    await setQuality(quality);
    for (const palette of PALETTES) {
      await setPalette(palette);
      for (const pose of poses) {
        await page.evaluate(
          ({ x, z }) =>
            window.__perspectiveCamera(x, z, 260, { yawDeg: 20, pitchDeg: 38, focusDepthM: null }),
          pose
        );
        await page.waitForTimeout(software ? 2500 : 800);
        const name = `${quality}-${palette}-${pose.family}`;
        await shot(name);
        const probe = await page.evaluate(() => window.__perspectiveProbe());
        readings.frames.push({
          name,
          quality,
          palette,
          family: pose.family,
          worldLights: probe.worldLights ?? null,
          props: probe.props,
        });
      }
    }
  }
  await setPalette('standard');
  const out = process.argv[process.argv.indexOf('--out') + 1];
  writeFileSync(join(out, 'readings.json'), `${JSON.stringify(readings, null, 2)}\n`);
};
