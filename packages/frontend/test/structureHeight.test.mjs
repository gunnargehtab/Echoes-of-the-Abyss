/**
 * How tall a structure stands, as the sim reads it on volumetric ground
 * (docs/free-water-slice.md §9, "Structures with a height"; #1754).
 *
 * A structure there blocks hulls from the depth it stands on up to its top,
 * and `structureStatsFor(kind).heightM` is that top: the tallest of its navies'
 * committed models, at canonical scale, rounded up to the metre. The sim has no
 * model to measure, so the number lives in shared; this is what keeps it the
 * model's. A remodel that grows a structure past its number fails here.
 *
 * The top is measured the way the conn view stands the model (`standingY`):
 * the file's own y 0 sits on the depth, so the height is `groundM` plus the
 * drawn box's top. Draw scale 1, the canonical size, not a zoom's readability
 * scale. Plain `.mjs` for the reason rosterScale.test.mjs gives.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { Box3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { stripImages } from '../../../tools/hull-models/images.mjs';
import { Faction, StructureKind, structureStatsFor } from '@echoes/shared';
import { buildTemplate, slugFor } from '../src/game/rosterModels.ts';

const MODELS = new URL('../../../docs/concept-art/models/', import.meta.url);
const kinds = (e) => Object.values(e).filter((v) => typeof v === 'number');

async function parse(file) {
  const bytes = readFileSync(new URL(file, MODELS));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return (await new GLTFLoader().parseAsync(stripImages(buffer), '')).scene;
}

/** Metres from where the model stands to its top, at canonical scale. */
async function standingHeightM(key) {
  const template = buildTemplate(await parse(`${slugFor(key)}.glb`), key);
  return template.groundM + new Box3().setFromObject(template.root, true).max.y;
}

describe('structure heights', () => {
  for (const structure of kinds(StructureKind)) {
    const name = StructureKind[structure];
    it(`${name}'s heightM is its tallest model's top, to the metre`, async () => {
      const tops = [];
      for (const faction of kinds(Faction)) {
        const key = { structure, faction };
        if (existsSync(new URL(`${slugFor(key)}.glb`, MODELS)))
          tops.push(await standingHeightM(key));
      }
      assert.ok(tops.length > 0, `${name} has no committed model to measure`);
      const tallest = Math.max(...tops);
      assert.equal(
        structureStatsFor(structure).heightM,
        Math.ceil(tallest),
        `${name}: tallest model stands ${tallest.toFixed(2)} m`
      );
    });
  }
});
