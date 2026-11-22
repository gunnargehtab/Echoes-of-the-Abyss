// What the Lid's glow keeps under the free-water crater's walls (#1891), and
// what reading it costs: the figures README.md quotes of lidShade.ts.
//
//   node --import tsx --import ./packages/frontend/test/support/viteAssets.mjs \
//     docs/screenshots/issue-1891/shade.mjs
//
// The time is a stopwatch on whatever runs this, and no budget: the shade is
// read once when a ground is built, never in a frame.
import { HIGH_GRAPHICS } from '@echoes/shared';
import { FREE_WATER_SLICE } from '../../../packages/backend/src/sim/maps/freeWaterSlice.ts';
import { terrainFor } from '../../../packages/backend/src/sim/maps/index.ts';
import { lidVisibility } from '../../../packages/frontend/src/game/lidShade.ts';
import {
  buildHeightGrid,
  rockTopDepthM,
} from '../../../packages/frontend/src/game/perspectiveTerrain.ts';
import { seabedSeed } from '../../../packages/frontend/src/game/seabed.ts';
import {
  waterColumnDensity,
  waterColumnTransmittance,
  waterReachM,
  waterTransmittance,
} from '../../../packages/frontend/src/game/water.ts';

const terrain = terrainFor(FREE_WATER_SLICE).serialize();
const grid = buildHeightGrid(terrain, seabedSeed(terrain), rockTopDepthM(terrain), true);
const times = [];
let visible;
for (let run = 0; run < 5; run++) {
  const from = performance.now();
  visible = lidVisibility(grid);
  times.push(performance.now() - from);
}
const at = (xM, zM) => visible[Math.round(zM / grid.stepM) * grid.vertsX + Math.round(xM / grid.stepM)];
const share = HIGH_GRAPHICS.CRATER.SHADE;
const taken = (open) => 1 - share + share * open;
// Cell centres of docs/free-water-slice.md §3.
const PLACES = [
  ['Outside rim, west', 375, 2875],
  ['Northern garden', 2125, 875],
  ['Bowl, west ring', 1375, 2375],
  ['Bowl, east ring', 3125, 2125],
  ['Deep pocket, its middle', 2125, 2125],
  ['Deep pocket, 250 m from its west wall', 1875, 2125],
  ['Exit pool', 1375, 3625],
];
console.log(`vertices ${grid.vertsX} x ${grid.vertsZ}, ${HIGH_GRAPHICS.CRATER.SHADE_RAYS} bearings`);
console.log(`read in ${Math.min(...times).toFixed(0)} to ${Math.max(...times).toFixed(0)} ms`);
console.log('| Place | Open to the water above | Share of the glow kept |');
console.log('| --- | --- | --- |');
for (const [name, x, z] of PLACES) {
  console.log(`| ${name} | ${at(x, z).toFixed(2)} | ${taken(at(x, z)).toFixed(2)} |`);
}
let least = 1;
for (const open of visible) least = Math.min(least, open);
console.log(`the least open vertex: ${least.toFixed(2)}, keeping ${taken(least).toFixed(2)}`);

const SURVEY_M = 10_000;
const column = waterColumnDensity(SURVEY_M, 1, true);
console.log(`\nat the survey dolly the eye's swim leaves ${waterTransmittance(SURVEY_M, waterReachM(SURVEY_M, true)).toFixed(2)}`);
console.log('| Floor, metres | Kept through the column |');
console.log('| --- | --- |');
for (const depthM of [250, 400, 600, 1500, 2400]) {
  console.log(`| ${depthM} | ${waterColumnTransmittance(depthM, column).toFixed(2)} |`);
}
for (const dollyM of [420, 1200, 1600, 2000, 3000, 4000, 5000, 10000]) {
  const density = waterColumnDensity(dollyM, 1, true);
  console.log(`dolly ${dollyM}: the pocket keeps ${waterColumnTransmittance(2400, density).toFixed(2)}`);
}
