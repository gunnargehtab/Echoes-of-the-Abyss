// How bright the deep bodies read beside the lanterns, off a frame of
// frames.mjs (#1858): each comb jelly and each lantern by the fleet is stood
// where the match's start stands it, which is where reduced motion holds it,
// projected through the frame's camera, and the brightest pixel in a box about
// it is read, as Rec. 709 luma on the encoded bytes out of 255. Arithmetic on
// the fixture's own slots, after `npm run build:shared`.
//
//   node --import tsx --import ./packages/frontend/test/support/viteAssets.mjs \
//     docs/screenshots/issue-1858/deep-body/levels.mjs <close.png> <home.png>
//
// A box is the body's drawn height either way of its axis, and no less than 8
// px: it holds the body and its glow, and whatever stands behind them, so a
// body before the vent's light reads the light too. The table says which.
import { readFileSync } from 'node:fs';
import { PerspectiveCamera, Vector3 } from 'three';
import { terrainFor } from '../../../../packages/backend/src/sim/maps/index.ts';
import { FREE_WATER_SLICE } from '../../../../packages/backend/src/sim/maps/freeWaterSlice.ts';
import {
  decorationPose,
  freeWaterPlacements,
} from '../../../../packages/frontend/src/game/freeWaterDecoration.ts';
import { CONN_FOV_DEG } from '../../../../packages/frontend/src/game/readability.ts';
import {
  depthToWorldY,
  DEPTH_VISUAL_M_PER_M,
} from '../../../../packages/frontend/src/game/perspectiveTerrain.ts';
import { decodeRgb } from '../../../../tools/hull-models/png.mjs';

const [closePng, homePng] = process.argv.slice(2);
// frames.mjs's poses: plan x, plan z, dolly, yaw, pitch, focus depth.
const POSES = { close: [542, 1958, 420, -60, 2, 300], home: [709, 1710, 1200, -34, 15, 300] };
// The body's height in its file, metres (docs/asset-prompts-3d.md Block 4).
const TALL_M = { 'env-comb-jelly': 5.0, 'env-drift-jelly': 4.11 };
const cameraOf = ([fx, fz, dolly, yawDeg, pitchDeg, focusDepthM], aspect) => {
  const camera = new PerspectiveCamera(CONN_FOV_DEG, aspect, 10, 60000);
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  const flat = dolly * Math.cos(pitch);
  const focus = new Vector3(fx, depthToWorldY(focusDepthM), fz);
  camera.position.set(
    fx + Math.sin(yaw) * flat,
    focus.y + dolly * Math.sin(pitch),
    fz + Math.cos(yaw) * flat
  );
  camera.lookAt(focus);
  camera.updateMatrixWorld();
  return camera;
};
const terrain = terrainFor(FREE_WATER_SLICE).serialize();
const bodies = freeWaterPlacements(terrain, true, true).filter(
  (p) => (p.slug === 'env-comb-jelly' || p.slug === 'env-drift-jelly') && p.far !== true
);
for (const [name, png] of [
  ['close', closePng],
  ['home', homePng],
]) {
  const { width, height, pixels } = decodeRgb(readFileSync(png));
  const camera = cameraOf(POSES[name], width / height);
  console.log(`\n${name}: ${png}`);
  console.log('| Body | Depth | From the eye | At, px | Peak, of 255 |');
  console.log('| --- | --- | --- | --- | --- |');
  const count = {};
  for (const p of bodies) {
    const n = (count[p.slug] = (count[p.slug] ?? 0) + 1);
    const pose = decorationPose(p, 0, () => 0);
    const at = new Vector3(pose.x, pose.y + p.motion.axisM, pose.z);
    const half = new Vector3(0, TALL_M[p.slug] / 2, 0);
    const [mid, top, foot] = [at, at.clone().add(half), at.clone().sub(half)].map((v) =>
      v.clone().project(camera)
    );
    const x = Math.round(((mid.x + 1) / 2) * width);
    const y = Math.round(((1 - mid.y) / 2) * height);
    const reach = Math.max(8, Math.round((Math.abs(top.y - foot.y) / 2) * height));
    let peak = 0;
    for (let j = Math.max(0, y - reach); j <= Math.min(height - 1, y + reach); j++) {
      for (let i = Math.max(0, x - reach); i <= Math.min(width - 1, x + reach); i++) {
        const o = (j * width + i) * 3;
        peak = Math.max(
          peak,
          0.2126 * pixels[o] + 0.7152 * pixels[o + 1] + 0.0722 * pixels[o + 2]
        );
      }
    }
    const label = p.slug === 'env-comb-jelly' ? `Comb ${n}` : `Lantern ${n}`;
    const depth = Math.round(-at.y / DEPTH_VISUAL_M_PER_M);
    const far = Math.round(at.distanceTo(camera.position));
    console.log(`| ${label} | ${depth} m | ${far} m | ${x}, ${y} | ${Math.round(peak)} |`);
  }
}
