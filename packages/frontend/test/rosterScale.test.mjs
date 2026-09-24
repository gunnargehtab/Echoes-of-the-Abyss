/**
 * The size a hull or structure draws at (#882) — the roster's half of #876.
 *
 * Intake sizes a file by three's loose `Box3.setFromObject` over its parts as
 * delivered (.claude/skills/hull-intake/scripts/page.html): yaw a Z-long file
 * onto X, scale its X to the design length, centre it. So the conn view must
 * draw every committed roster model at that scale and about that centre. The
 * vertex extent, which is what the merge leaves to measure, is tighter
 * wherever a part is yawed or leaned, and drew the Pelagia Spore Veil 1.145×
 * the size intake reviewed.
 *
 * These are the committed files, parsed by three's own loader and built by the
 * real template code; only the GL context is missing, and nothing here needs
 * it. The design lengths are intake's own table, not the runtime's.
 *
 * Plain JS, and in `.mjs` on purpose: that table is `tools/hull-maps/models.mjs`,
 * which has no types for the package's TypeScript program to check against.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { Box3, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Faction, StructureKind, UnitKind } from '@echoes/shared';

import { STRUCTURES, UNITS } from '../../../tools/hull-maps/models.mjs';
import { buildTemplate, slugFor } from '../src/game/rosterModels.ts';

const MODELS = new URL('../../../docs/concept-art/models/', import.meta.url);

const kinds = (e) => Object.values(e).filter((v) => typeof v === 'number');

/** Every key the runtime can ask for whose file is committed. */
const KEYS = kinds(Faction).flatMap((faction) =>
  [
    ...kinds(UnitKind).map((unit) => ({ unit, faction })),
    ...kinds(StructureKind).map((structure) => ({ structure, faction })),
  ].filter((key) => existsSync(new URL(`${slugFor(key)}.glb`, MODELS)))
);

/** Intake's design length for a file, by the table the bake reads. */
const LENGTH_M = new Map([...UNITS, ...STRUCTURES].map((row) => [row.model, row.lengthM]));

async function parse(file) {
  const bytes = readFileSync(new URL(file, MODELS));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return (await new GLTFLoader().parseAsync(buffer, '')).scene;
}

/**
 * Where intake puts a file's vertices, as page.html canonicalises it: yaw by
 * the parts' boxes, scale their X to the design length, centre on them.
 */
function intakeDrawn(scene, lengthM) {
  const probe = scene.clone(true);
  const raw = new Box3().setFromObject(probe).getSize(new Vector3());
  if (raw.z > raw.x) probe.rotation.y = Math.PI / 2;
  const parts = new Box3().setFromObject(probe);
  const k = lengthM / parts.getSize(new Vector3()).x;
  const centre = parts.getCenter(new Vector3());
  const vertices = new Box3().setFromObject(probe, true);
  return new Box3(
    vertices.min.clone().sub(centre).multiplyScalar(k),
    vertices.max.clone().sub(centre).multiplyScalar(k)
  );
}

const close = (actual, expected, what) =>
  assert.ok(
    Math.abs(actual - expected) <= 1e-4 * Math.max(1, Math.abs(expected)),
    `${what}: ${actual} against ${expected}`
  );

describe('roster scale', () => {
  it('covers every committed hull and structure intake reviews', () => {
    const files = KEYS.map((key) => `${slugFor(key)}.glb`).sort();
    assert.deepEqual(files, [...LENGTH_M.keys()].sort());
  });

  for (const key of KEYS) {
    const file = `${slugFor(key)}.glb`;
    it(`${file} draws at the scale and centre intake reviewed`, async () => {
      const scene = await parse(file);
      const expected = intakeDrawn(scene, LENGTH_M.get(file));
      const template = buildTemplate(scene, key);
      const drawn = new Box3().setFromObject(template.root, true);
      for (const axis of ['x', 'y', 'z']) {
        close(drawn.min[axis], expected.min[axis], `${file} min ${axis}`);
        close(drawn.max[axis], expected.max[axis], `${file} max ${axis}`);
      }
      const size = drawn.getSize(new Vector3());
      close(template.lengthM, size.x, `${file} lengthM`);
      close(template.beamM, size.z, `${file} beamM`);
      close(template.heightM, size.y, `${file} heightM`);
    });
  }
});
