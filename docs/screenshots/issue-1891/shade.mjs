// What the Lid's glow keeps under the free-water crater's walls (#1891), what
// the column over a floor takes, and how the ground past the edge falls: the
// figures README.md quotes of lidShade.ts, water.ts and outerGround.ts, and
// what reading each costs.
//
//   node --import tsx --import ./packages/frontend/test/support/viteAssets.mjs \
//     docs/screenshots/issue-1891/shade.mjs
//
// The times are a stopwatch on whatever runs this, and no budget: each is
// read when a ground is built, and again whole on a ground delta.
import { HIGH_GRAPHICS } from '@echoes/shared';
import { FREE_WATER_SLICE } from '../../../packages/backend/src/sim/maps/freeWaterSlice.ts';
import { terrainFor } from '../../../packages/backend/src/sim/maps/index.ts';
import { lidVisibility } from '../../../packages/frontend/src/game/lidShade.ts';
import {
  bakeOuterLit,
  outerDepthAtM,
  outerMesh,
} from '../../../packages/frontend/src/game/outerGround.ts';
import {
  buildHeightGrid,
  DEPTH_VISUAL_M_PER_M,
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
const seed = seabedSeed(terrain);
const rockTop = rockTopDepthM(terrain);
const grid = buildHeightGrid(terrain, seed, rockTop, true);
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

// The ground past the map's edge: its depth off the west rim and off the exit
// pool's mouth, and what the column leaves of it at the survey dolly.
const { REACH_M, BAKE_PX } = HIGH_GRAPHICS.CRATER.OUTER;
const mesh = outerMesh(terrain, grid, seed, rockTop);
console.log(`\nthe ground past the edge: ${mesh.triangles} triangles, ${mesh.positions.length / 3} vertices`);
console.log('| Past the edge, metres | Off the west rim: depth, kept | Off the pool: depth, kept |');
console.log('| --- | --- | --- |');
for (const past of [0, 250, 500, 1000, 1500, REACH_M]) {
  const cells = [
    outerDepthAtM(terrain, seed, rockTop, -past, 1875),
    outerDepthAtM(terrain, seed, rockTop, 2125, terrain.rows * terrain.cellM + past),
  ].map((depthM) => `${depthM.toFixed(0)}, ${waterColumnTransmittance(depthM, column).toFixed(2)}`);
  console.log(`| ${past} | ${cells.join(' | ')} |`);
}
const lit = {
  albedo: new Uint8Array(BAKE_PX * BAKE_PX * 4),
  relief: new Uint8Array(BAKE_PX * BAKE_PX * 4),
  heightPerDepthM: DEPTH_VISUAL_M_PER_M,
};
const bakes = [];
for (let run = 0; run < 3; run++) {
  const from = performance.now();
  bakeOuterLit(terrain, seed, rockTop, lit, BAKE_PX);
  bakes.push(performance.now() - from);
}
console.log(`its bake, ${BAKE_PX} px a side: ${Math.min(...bakes).toFixed(0)} to ${Math.max(...bakes).toFixed(0)} ms`);
