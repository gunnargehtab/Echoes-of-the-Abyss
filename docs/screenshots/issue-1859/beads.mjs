// What writing the lanterns' beads costs a frame (#1859): the figure
// docs/art-direction.md, "A far bloom of lanterns", prints. The river stands
// 120 whole lanterns beside the fleet's five, and each hangs 331 points that
// are written on the CPU every frame (jellyLight.ts `writeJellyLights`).
//
//   node --import tsx --import ./packages/frontend/test/support/viteAssets.mjs \
//     docs/screenshots/issue-1859/beads.mjs
//
// It reads the writer as it stood on `main` before the step out of git
// (`BASE`, ba9b6ba0 by default) into `.dev-loop/`, which is ignored, and runs
// both over 125 jellies: that every light agrees, and the milliseconds a
// frame each takes here. A stopwatch on this machine, in Node, and no budget:
// the test that holds the work is packages/frontend/test/jellyLight.test.ts,
// which counts it.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Matrix4, Vector3 } from 'three';
import { FREE_WATER_HIGH_LIFE } from '../../../packages/shared/dist/index.js';
import { writeJellyLights } from '../../../packages/frontend/src/game/jellyLight.ts';

const BASE = process.env.BASE ?? 'ba9b6ba0';
const JELLIES = FREE_WATER_HIGH_LIFE.JELLIES.SLOTS.length + FREE_WATER_HIGH_LIFE.BLOOM.COUNT;
const root = resolve(import.meta.dirname, '../../..');
const game = resolve(root, 'packages/frontend/src/game');
const before = execFileSync('git', ['show', `${BASE}:packages/frontend/src/game/jellyLight.ts`], {
  cwd: root,
  encoding: 'utf8',
}).replace("'./palette.ts'", JSON.stringify(pathToFileURL(resolve(game, 'palette.ts')).href));
mkdirSync(resolve(root, '.dev-loop'), { recursive: true });
const copy = resolve(root, '.dev-loop/jellyLight.base.ts');
writeFileSync(copy, before);
const { writeJellyLights: written } = await import(pathToFileURL(copy).href);

const shape = { lipY: 1.6, lipR: 3, crownY: 5.5 };
const seats = Array.from({ length: 6 }, (_, i) => new Vector3(Math.cos(i), 1.6, Math.sin(i)));
const matrix = new Matrix4().makeRotationY(0.7).setPosition(100, -30, 200);

let worst = 0;
let compared = 0;
for (const moves of [true, false]) {
  for (const time of [0, 3.3, 17.9, 250.25, 4000.5]) {
    for (const index of [0, 4, 37, JELLIES - 1]) {
      const [now, then] = [[], []];
      writeJellyLights(shape, seats, matrix, index, time, moves, (p, s, l) =>
        now.push(p.x, p.y, p.z, s, l)
      );
      written(shape, seats, matrix, index, time, moves, (p, s, l) =>
        then.push(p.x, p.y, p.z, s, l)
      );
      if (now.length !== then.length) throw new Error('the two writers hang different lights');
      now.forEach((value, i) => {
        worst = Math.max(worst, Math.abs(value - then[i]) / Math.max(1, Math.abs(then[i])));
      });
      compared += now.length / 5;
    }
  }
}
console.log(
  `${compared} lights, as ${BASE} wrote them and now: they differ by ${worst.toExponential(1)} at most, of their own size`
);

const light = () => {};
for (const [name, write] of [
  [`as ${BASE} wrote them`, written],
  ['now', writeJellyLights],
]) {
  for (const moves of [true, false]) {
    for (let warm = 0; warm < 30; warm++) {
      for (let i = 0; i < JELLIES; i++) write(shape, seats, matrix, i, warm / 60, moves, light);
    }
    const frames = 300;
    const from = performance.now();
    for (let f = 0; f < frames; f++) {
      for (let i = 0; i < JELLIES; i++) write(shape, seats, matrix, i, 10 + f / 60, moves, light);
    }
    console.log(
      `${JELLIES} jellies, ${name}, ${moves ? 'moving' : 'held'}: ` +
        `${((performance.now() - from) / frames).toFixed(2)} ms a frame`
    );
  }
}
