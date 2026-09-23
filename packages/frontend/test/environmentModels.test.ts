/**
 * The size a prop draws at (#876). Block 4 of docs/asset-prompts-3d.md makes
 * `Footprint` "the canonical scale hull-intake sizes against", and intake
 * measures a file with three's loose `Box3.setFromObject` over its parts
 * (.claude/skills/hull-intake/scripts/page.html). So the runtime must draw
 * each committed prop at the scale that measure gives it. The vertex extent,
 * which is what the merge leaves to measure, is smaller wherever a part
 * leans, and drew the boulder 1.23× the size intake reviewed.
 *
 * These are the committed files, parsed by three's own loader and built by
 * the real template code; only the GL context is missing, and nothing here
 * needs it.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { Box3, Vector3, type Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ENVIRONMENT_PROPS } from '../src/game/environment.ts';
import { buildTemplate, type EnvTemplate } from '../src/game/environmentModels.ts';

const MODELS = new URL('../../../docs/concept-art/models/', import.meta.url);

async function parse(slug: string): Promise<Group> {
  const bytes = readFileSync(new URL(`${slug}.glb`, MODELS));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return (await new GLTFLoader().parseAsync(buffer, '')).scene;
}

/** Intake's measure, as page.html takes it: the parts' boxes, larger of X and Z. */
function intakeFootprint(scene: Group): number {
  const size = new Box3().setFromObject(scene).getSize(new Vector3());
  return Math.max(size.x, size.z);
}

/** What a template draws: the bounds of its baked, metre-true vertices. */
function drawn(template: EnvTemplate): Box3 {
  const box = new Box3();
  for (const { geometry } of template.parts) {
    geometry.computeBoundingBox();
    box.union(geometry.boundingBox!);
  }
  return box;
}

const close = (actual: number, expected: number, what: string) =>
  assert.ok(
    Math.abs(actual - expected) <= 1e-4 * Math.max(1, expected),
    `${what}: ${actual} against ${expected}`
  );

describe('prop scale', () => {
  for (const spec of ENVIRONMENT_PROPS) {
    it(`${spec.slug} draws at the scale intake reviewed`, async () => {
      const scene = await parse(spec.slug);
      const k = spec.footprintM / intakeFootprint(scene);
      const vertices = new Box3().setFromObject(scene, true).getSize(new Vector3());
      const box = drawn(buildTemplate(scene, spec.footprintM, spec.swayM));
      const size = box.getSize(new Vector3());
      close(size.x, vertices.x * k, `${spec.slug} x`);
      close(size.y, vertices.y * k, `${spec.slug} height`);
      close(size.z, vertices.z * k, `${spec.slug} z`);
      // Props stand: the lowest vertex, not a leaning part's box, is the ground.
      close(box.min.y, 0, `${spec.slug} base`);
    });
  }

  it('stands the boulder 6 m tall, as its Block 4 row does', async () => {
    const spec = ENVIRONMENT_PROPS.find((p) => p.slug === 'env-open-boulder')!;
    const size = drawn(buildTemplate(await parse(spec.slug), spec.footprintM, spec.swayM)).getSize(
      new Vector3()
    );
    // 12 m by the parts' boxes is 9.77 m across the vertices; drawn at 12,
    // it stood 7.4 m tall.
    close(size.y, 6, 'boulder height');
    close(Math.max(size.x, size.z), 9.7736, 'boulder vertex extent');
  });
});
