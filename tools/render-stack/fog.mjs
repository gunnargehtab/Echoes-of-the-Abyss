/**
 * #1016's measurement, as a run-game `--steps` module: the colour a fully
 * fogged far seabed fades to, against the water backdrop at the same depth.
 * The two should be one colour, because the fog fades a fragment into the
 * water it stands in and the backdrop paints that same water ramp
 * (packages/frontend/src/game/water.ts).
 *
 *   node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
 *     --url 'http://localhost:5173/?map=ventfront-divide' --out <dir> \
 *     --steps tools/render-stack/fog.mjs
 *
 * A close, low camera looks west along Ventfront's north trench (x 0-8000 m,
 * z 0-1000 m, floor 2,900 m). At a 250 m dolly the reach floors at 900 m, so
 * the far trench is at least 99.9% fog, and north of it the rays leave the map
 * and show backdrop. The focus is pinned to 2,800 m, so the backdrop's anchor
 * is a number the probe reports rather than a seabed sample. Pixels are sorted
 * into the two classes by casting each one's ray against the trench floor, and
 * only backdrop rays graded 2,860-2,940 m are kept: that band and the floor
 * encode to one 8-bit colour.
 *
 * The frame is read with readPixels inside the animation frame that drew it,
 * since the conn canvas keeps no drawing buffer; that also leaves out the HUD
 * canvas and its 1 px grain, which a screenshot carries. Medians, because
 * marine snow and stipple add sparse bright points to both classes. Writes
 * fog.json beside the review frame and fails when any channel of the two
 * medians differs by more than one level. Not a gate.
 *
 * At 2,900 m both colours are nearly black, so the measured frame shows the
 * fix least. A review frame comes first, before any assert can stop the run:
 * the same dolly and pitch looking west across the west plateau (floor 700 m)
 * to the map edge, where the far ground is fogged in brighter water.
 */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// The frontend's own numbers, restated because this runs in plain Node:
// DEPTH_VISUAL_M_PER_M (perspectiveTerrain.ts), BACKDROP_SPAN_M (water.ts)
// and FOV_DEG (PerspectiveView.ts). The eye-depth assert below fails if the
// first moves.
const M_PER_M = 0.22;
const BACKDROP_SPAN_M = 2200;
const FOV_DEG = 40;
const CAMERA = { x: 7600, z: 500, distance: 250, yawDeg: 90, pitchDeg: 10, focusDepthM: 2800 };
const PLATEAU = { x: 1600, z: 2000, distance: 250, yawDeg: 90, pitchDeg: 10, focusDepthM: 700 };
const FLOOR_DEPTH_M = 2900;
const BAND_M = [2860, 2940];

export default async ({ page, shot }) => {
  await page.waitForFunction(() => window.__perspectiveProbe?.().active === true);
  // Which rasteriser drew it, as capture.mjs records it: the issue asks for
  // frames from a real GPU.
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  });
  const software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
  const look = async (c) => {
    await page.evaluate((c) => {
      window.__perspectiveCamera(c.x, c.z, c.distance, {
        yawDeg: c.yawDeg,
        pitchDeg: c.pitchDeg,
        focusDepthM: c.focusDepthM,
      });
    }, c);
    await page.waitForTimeout(1500);
  };
  await look(PLATEAU);
  await shot('plateau');
  await look(CAMERA);
  const probe = await page.evaluate(() => window.__perspectiveProbe());

  const rad = Math.PI / 180;
  const pitch = CAMERA.pitchDeg * rad;
  const yaw = CAMERA.yawDeg * rad;
  // The camera as applyCamera builds it (PerspectiveView.ts).
  const focus = [CAMERA.x, -CAMERA.focusDepthM * M_PER_M, CAMERA.z];
  const flat = Math.cos(pitch) * CAMERA.distance;
  const eye = [
    focus[0] + Math.sin(yaw) * flat,
    focus[1] + Math.sin(pitch) * CAMERA.distance,
    focus[2] + Math.cos(yaw) * flat,
  ];
  assert.equal(probe.focus.depthM, CAMERA.focusDepthM, 'the focus clamp moved the anchor');
  assert.equal(probe.waterDensity, 1, 'the water setting is not the default');
  assert.equal(probe.waterReachM, 900, 'the reach is not at its floor');
  // The terrain clamp raises the eye and nothing else, so its depth is the tell.
  assert.ok(Math.abs(probe.eye.depthM + eye[1] / M_PER_M) <= 1, 'the eye was clamped');

  const frame = await page.evaluate(
    () =>
      new Promise((resolve) =>
        // The view queued its own callback for this frame before this one, so
        // this runs after renderer.render and before the buffer is discarded.
        requestAnimationFrame(() => {
          const gl = document.querySelector('.perspective-host canvas').getContext('webgl2');
          const w = gl.drawingBufferWidth;
          const h = gl.drawingBufferHeight;
          const px = new Uint8Array(w * h * 4);
          gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
          let s = '';
          for (let i = 0; i < px.length; i += 0x8000) {
            s += String.fromCharCode(...px.subarray(i, i + 0x8000));
          }
          resolve({ w, h, b64: btoa(s) });
        })
      )
  );
  const px = Buffer.from(frame.b64, 'base64');
  // readPixels rows run bottom-up.
  const at = (x, yTop) => {
    const i = ((frame.h - 1 - yTop) * frame.w + x) * 4;
    return [px[i], px[i + 1], px[i + 2]];
  };

  const unit = (v) => {
    const l = Math.hypot(...v);
    return v.map((q) => q / l);
  };
  const forward = unit(focus.map((f, k) => f - eye[k]));
  const right = unit([-forward[2], 0, forward[0]]);
  const up = [
    right[1] * forward[2] - right[2] * forward[1],
    right[2] * forward[0] - right[0] * forward[2],
    right[0] * forward[1] - right[1] * forward[0],
  ];
  const tan = Math.tan((FOV_DEG / 2) * rad);
  const aspect = frame.w / frame.h;
  const floorY = -FLOOR_DEPTH_M * M_PER_M;

  const fogged = [];
  const backdrop = [];
  for (let y = 0; y < frame.h; y++) {
    for (let x = 0; x < frame.w; x++) {
      const nx = ((x + 0.5) / frame.w) * 2 - 1;
      const ny = 1 - ((y + 0.5) / frame.h) * 2;
      const ray = unit(forward.map((f, k) => f + right[k] * nx * tan * aspect + up[k] * ny * tan));
      if (ray[1] >= 0) continue;
      const s = (floorY - eye[1]) / ray[1];
      const hitX = eye[0] + ray[0] * s;
      const hitZ = eye[2] + ray[2] * s;
      // View-space depth, as fog_vertex measures it, then water.ts's exp² curve.
      const viewZ = s * (ray[0] * forward[0] + ray[1] * forward[1] + ray[2] * forward[2]);
      const fog = 1 - Math.exp(-((viewZ / probe.waterReachM) ** 2));
      const backdropDepthM = CAMERA.focusDepthM - ray[1] * BACKDROP_SPAN_M;
      if (hitX > 60 && hitX < 7940 && hitZ > 60 && hitZ < 940 && fog >= 0.999) {
        fogged.push(at(x, y));
      } else if ((hitZ < 0 || hitX < 0) && backdropDepthM >= BAND_M[0] && backdropDepthM <= BAND_M[1]) {
        backdrop.push(at(x, y));
      }
    }
  }
  const median = (list) =>
    [0, 1, 2].map((k) => list.map((p) => p[k]).sort((a, b) => a - b)[list.length >> 1]);
  const result = {
    renderer,
    software,
    camera: CAMERA,
    probe,
    counts: { fogged: fogged.length, backdrop: backdrop.length },
    fogged: median(fogged),
    backdrop: median(backdrop),
  };
  result.delta = result.backdrop.map((b, k) => b - result.fogged[k]);
  // For a reviewer; its HUD grain lifts pixels, so the numbers come from above.
  const file = await shot('fog-seam');
  writeFileSync(join(dirname(file), 'fog.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ counts: result.counts, fogged: result.fogged, backdrop: result.backdrop, delta: result.delta }));
  assert.ok(fogged.length > 1000 && backdrop.length > 1000, 'the frame lacks one of the classes');
  assert.ok(
    result.delta.every((v) => Math.abs(v) <= 1),
    `fogged seabed ${result.fogged} against backdrop ${result.backdrop}`
  );
};
