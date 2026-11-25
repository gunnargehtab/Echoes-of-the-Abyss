// Where each of High's bodies stands in the Close and Home frames at the
// match's start, which is where reduced motion holds it (#1858). Arithmetic on
// the fixture's own slots, after `npm run build:shared`, through the cameras
// frames.mjs frames from; labels.py draws the result over a frame.
//
//   node --import tsx --import ./packages/frontend/test/support/viteAssets.mjs \
//     docs/screenshots/issue-1858/labels.mjs docs/screenshots/issue-1858/software/after/labels.json
//
// The constants are whatever @echoes/shared's build holds, so the before side
// is run with the base's constants built, as frames.mjs's before side is.
import { writeFileSync } from 'node:fs';
import { PerspectiveCamera, Vector3 } from 'three';
import { terrainFor } from '../../../packages/backend/src/sim/maps/index.ts';
import { FREE_WATER_SLICE } from '../../../packages/backend/src/sim/maps/freeWaterSlice.ts';
import {
  decorationPose,
  freeWaterPlacements,
} from '../../../packages/frontend/src/game/freeWaterDecoration.ts';
import { CONN_FOV_DEG } from '../../../packages/frontend/src/game/readability.ts';
import {
  depthToWorldY,
  DEPTH_VISUAL_M_PER_M,
} from '../../../packages/frontend/src/game/perspectiveTerrain.ts';

const [out] = process.argv.slice(2);
// frames.mjs's poses: plan x, plan z, dolly, yaw, pitch, focus depth.
const POSES = { close: [542, 1958, 420, -60, 2, 300], home: [709, 1710, 1200, -34, 15, 300] };
const [W, H] = [1920, 1080];
const cameraOf = ([fx, fz, dolly, yawDeg, pitchDeg, focusDepthM]) => {
  const camera = new PerspectiveCamera(CONN_FOV_DEG, W / H, 10, 60000);
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
const low = freeWaterPlacements(terrain, true);
const own = freeWaterPlacements(terrain, true, true).slice(low.length);
// High's bodies by what they are: the loops' centres name the streams.
const groupOf = (p) => {
  if (p.slug === 'env-drift-jelly') return p.far ? 'bloom' : 'lantern';
  if (p.slug === 'env-rim-manta') return 'manta';
  if (p.slug === 'env-shoal-fry' && p.xM === 299) return 'fry';
  if (p.slug === 'env-outer-fish' && p.xM === 760) return 'rimfish';
  if (p.slug === 'env-outer-fish' && p.xM === 462) return 'mill';
  return null;
};
// The hulls at their starts, 300 m deep (docs/free-water-slice.md §4).
const HULLS = { 'Light Scout': [625, 1875], Corvette: [625, 2125], Harvester: [375, 1875] };
const frames = {};
for (const [name, pose] of Object.entries(POSES)) {
  const camera = cameraOf(pose);
  const toScreen = (at) => {
    const ndc = at.clone().project(camera);
    return [((ndc.x + 1) / 2) * W, ((1 - ndc.y) / 2) * H, ndc.z < 1];
  };
  const groups = {};
  for (const p of own) {
    const group = groupOf(p);
    if (!group) continue;
    const m = p.motion;
    const g = (groups[group] ??= { members: [], span: [Infinity, -Infinity] });
    // Its axis over a lap: `depthM` swung `depthSwingM` either way (#1713).
    g.span = [
      Math.min(g.span[0], m.depthM - m.depthSwingM),
      Math.max(g.span[1], m.depthM + m.depthSwingM),
    ];
    const pose = decorationPose(p, 0, () => 0);
    const at = new Vector3(pose.x, pose.y + m.axisM, pose.z);
    const [x, y, front] = toScreen(at);
    if (front && x >= 0 && x <= W && y >= 0 && y <= H) {
      g.members.push({ px: [x, y], depthNow: -at.y / DEPTH_VISUAL_M_PER_M });
    }
  }
  const hullPx = {};
  for (const [hull, [x, z]] of Object.entries(HULLS)) {
    hullPx[hull] = toScreen(new Vector3(x, depthToWorldY(300), z));
  }
  frames[name] = {
    eye: camera.position.toArray(),
    eyeDepth: -camera.position.y / DEPTH_VISUAL_M_PER_M,
    groups,
    hullPx,
  };
}
writeFileSync(out, JSON.stringify(frames) + '\n');
for (const [name, frame] of Object.entries(frames)) {
  const line = Object.entries(frame.groups)
    .map(([g, { members, span }]) => `${g} ${members.length} in frame, ${span.map(Math.round).join('..')} m`)
    .join('; ');
  console.log(`${name}: eye ${frame.eyeDepth.toFixed(0)} m deep; ${line}`);
}
