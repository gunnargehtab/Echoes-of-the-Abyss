// Wrap the locked shot, then measure a settled ten-second home-frame station.
import shoot from './shoot.mjs';
import { writeFileSync } from 'node:fs';

export default async ({ page, shot }) => {
  await shoot({ page, shot });
  const renderer = await page.evaluate(() => {
    const gl = document.querySelector('canvas').getContext('webgl2');
    if (gl === null) throw new Error('The world canvas has no WebGL2 context');
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
  });
  await page.evaluate(() => window.__perspectiveStation('dream-home'));
  await page.waitForTimeout(10000);
  const probe = await page.evaluate(() => window.__perspectiveProbe());
  const result = {
    renderer,
    software: /swiftshader|llvmpipe|software|basic render/i.test(renderer),
    probe,
  };
  writeFileSync(process.env.DREAM_METRICS ?? '.dream-loop/metrics.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
};
