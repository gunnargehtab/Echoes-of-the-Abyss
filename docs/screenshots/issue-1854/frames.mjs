// World light in the colour-vision palettes (#1854), as a run-game steps
// module: each licensed family the map stands, close, at Low then at High,
// in the standard, deuteranopia and protanopia palettes. The palette and the
// quality are changed mid-match through the settings store, with no reload,
// so a frame also shows that a standing ember, prop and pool follow the change.
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
// PALETTES and FAMILIES narrow the run: tritanopia's two tokens (#1854) were
// taken with PALETTES=standard,tritanopia FAMILIES=vent,flora. Against
// `?study=free-water` the module frames a drifting jelly instead, at High
// alone, which is where a lantern is drawn (#1913).
//
// `sites.json` is every licensed prop the default placement stands on those
// two maps, by family (environment.ts `placeAll`, which is a pure function of
// the public ground). The module frames the one nearest the own base that
// stands 300 m clear of it, from 150 m.
//
// A software rasteriser's frames are labelled so in readings.json and are
// never offered for acceptance.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITES = JSON.parse(readFileSync(join(HERE, 'sites.json'), 'utf8'));
const PALETTES = (process.env.PALETTES ?? 'standard,deuteranopia,protanopia').split(',');
const QUALITIES = (process.env.QUALITY ?? 'low,high').split(',');
const FAMILIES = process.env.FAMILIES?.split(',');
// The free-water crater's first drifting jelly, held at its loop's start by
// reduced motion (docs/free-water-slice.md §5), near and with its neighbours:
// plan x and z, dolly, yaw, pitch and the depth the camera looks at.
const LANTERN_POSES = [
  { family: 'lantern', x: 319, z: 2041, distance: 45, yawDeg: 20, pitchDeg: 10, focusDepthM: 140 },
  { family: 'lanterns', x: 420, z: 2040, distance: 330, yawDeg: 20, pitchDeg: 8, focusDepthM: 135 },
];

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

  const params = new URL(page.url()).searchParams;
  const crater = params.get('study') === 'free-water';
  const map = crater ? 'free-water' : params.get('map');
  const families = crater ? {} : SITES[map];
  assert.ok(families, `no sites recorded for map ${map}`);
  const own = await page.evaluate(() => window.__perspectiveProbe().ownCentre);
  assert.ok(own, 'the own force has a centre');
  // Clear of the base's own structures, and still the nearest: a kelp tip
  // behind a foundry is no frame of a kelp tip.
  const CLEAR_M = 300;
  const from = (at) => Math.hypot(at[0] - own.x, at[1] - own.z);
  const poses = crater
    ? LANTERN_POSES
    : Object.entries(families)
        .filter(([family]) => !FAMILIES || FAMILIES.includes(family))
        .map(([family, list]) => {
          const clear = list.filter((at) => from(at) >= CLEAR_M);
          const [x, z] = (clear.length > 0 ? clear : list).reduce((best, at) =>
            from(at) < from(best) ? at : best
          );
          return { family, x, z, fromBaseM: Math.round(from([x, z])) };
        });

  // The store the shell subscribes to: the same module instance the page
  // loaded, so this is the settings screen's own write. A save lays every
  // stored setting again, the Graphics quality among them, so the two are
  // written together, and what the view then draws is read back: a frame
  // labelled with a palette or a quality it was not drawn in fails here.
  // Start the servers after any checkout: a hot reload gives the page a
  // second copy of the store, which no view subscribes to.
  const set = async (quality, palette) => {
    await page.evaluate(
      async ({ quality, palette }) => {
        const store = await import('/src/settings/store.ts');
        store.saveSettings({ palette, graphicsQuality: quality });
      },
      { quality, palette }
    );
    await page.waitForFunction(
      ({ quality, palette }) =>
        window.__perspectiveProbe().graphicsQuality.drawn === quality &&
        window.__perspectiveLamps().palette === palette,
      { quality, palette },
      { timeout: 120000 }
    );
    await page.waitForFunction(() => !window.__perspectiveProbe().programHold.holding, null, {
      timeout: 120000,
    });
    // High's targets, then one ember bucket and a frame for the pools.
    await page.waitForTimeout(software ? 5000 : 1500);
  };

  const readings = { renderer, software, map, own, poses, frames: [] };
  for (const quality of crater ? ['high'] : QUALITIES) {
    for (const palette of PALETTES) {
      await set(quality, palette);
      for (const pose of poses) {
        await page.evaluate(
          ({ x, z, distance = 150, yawDeg = 20, pitchDeg = 38, focusDepthM = null }) =>
            window.__perspectiveCamera(x, z, distance, { yawDeg, pitchDeg, focusDepthM }),
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
          worldLights: probe.graphicsQuality?.worldLights ?? null,
          props: probe.props,
        });
      }
    }
  }
  await set('low', 'standard');
  const out = process.argv[process.argv.indexOf('--out') + 1];
  writeFileSync(join(out, 'readings.json'), `${JSON.stringify(readings, null, 2)}\n`);
};
