/**
 * Gate 3's lamp core (#1021), held over every committed roster lamp in every
 * palette: docs/graphics-standards.md gate 3.
 *
 * Before it, 50 of 151 lamp materials rested past white under the standard
 * palette (72 under the red-green ones), so the 8-bit canvas clipped them
 * channel by channel: the Consortium scout's amber drew yellow, Hadron lamps
 * drew white, and a quieted hull whose lamp sat far past white drew as bright
 * as at rest. The core holds a lamp's resting brightest channel at white
 * along its faction's glow ink, worked out after the recolour because the ink
 * is the palette's.
 *
 * These are the committed files, parsed by three's loader and built by the
 * real template code (the rosterScale.test.mjs precedent), so a new model or
 * a new palette is held the day it lands. The per-palette count of lamps the
 * core moved is a positive control, not a pinned number: a census that moved
 * nothing would be passing without testing anything.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { Color, Mesh, MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Faction, StructureKind, UnitKind } from '@echoes/shared';

import { buildTemplate, slugFor } from '../src/game/rosterModels.ts';
import { PALETTES } from '../src/game/palette.ts';
import { GLOW_FACTOR_MAX, GLOW_FACTOR_MIN, glowFactor, lampCoreRest } from '../src/game/glow.ts';

const MODELS = new URL('../../../docs/concept-art/models/', import.meta.url);

const kinds = (e) => Object.values(e).filter((v) => typeof v === 'number');

const KEYS = kinds(Faction).flatMap((faction) =>
  [
    ...kinds(UnitKind).map((unit) => ({ unit, faction })),
    ...kinds(StructureKind).map((structure) => ({ structure, faction })),
  ].filter((key) => existsSync(new URL(`${slugFor(key)}.glb`, MODELS)))
);

const parsed = new Map();
async function parse(file) {
  if (!parsed.has(file)) {
    const bytes = readFileSync(new URL(file, MODELS));
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    parsed.set(file, (await new GLTFLoader().parseAsync(buffer, '')).scene);
  }
  return parsed.get(file);
}

/** The lamps a template carries, by the predicate rosterModelInstance clones on. */
function lamps(root) {
  const found = new Set();
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      if (material instanceof MeshStandardMaterial && material.emissive.getHex() !== 0) {
        found.add(material);
      }
    }
  });
  return [...found];
}

const peakOf = ({ r, g, b }) => Math.max(r, g, b);

describe('lamp core: the rest (gate 3)', () => {
  it('holds a brightest channel past white at white, and leaves one under it alone', () => {
    assert.equal(lampCoreRest(3.11 / 3.5, 3.5), 1 / (3.11 / 3.5), 'the scout: held at white');
    assert.equal(lampCoreRest(0.5, 1.2), 1.2, 'a lamp resting at 0.6 keeps its strength');
    assert.equal(lampCoreRest(1, 1), 1, 'one resting exactly at white is already there');
  });

  it("every roster lamp rests at or under white, in its faction's ink, in every palette", async () => {
    for (const [name, palette] of Object.entries(PALETTES)) {
      let total = 0;
      let held = 0;
      for (const key of KEYS) {
        const template = buildTemplate(
          await parse(`${slugFor(key)}.glb`),
          key,
          'standard',
          palette
        );
        const ink = new Color(palette.faction[key.faction].glow);
        for (const lamp of lamps(template.root)) {
          total++;
          const label = `${name} ${slugFor(key)} ${lamp.name}`;
          const peak = peakOf(lamp.emissive);
          const rest = peak * lamp.emissiveIntensity;
          const exported = peak * lamp.userData.exportIntensity;
          assert.equal(lamp.emissive.getHex(), ink.getHex(), `${label}: the faction's glow ink`);
          assert.ok(rest <= 1 + 1e-9, `${label}: rests at ${rest.toFixed(3)}, past white`);
          if (exported > 1) {
            held++;
            assert.ok(Math.abs(rest - 1) < 1e-9, `${label}: held at white, not under it`);
          } else {
            assert.equal(
              lamp.emissiveIntensity,
              lamp.userData.exportIntensity,
              `${label}: untouched`
            );
          }
          // Each live state is the rest times the factor: under white every
          // quieter state draws strictly darker, which the clip had stopped.
          for (const factor of [GLOW_FACTOR_MIN, glowFactor(1.75, 6), 0.99]) {
            assert.ok(
              Math.min(1, rest * factor) < Math.min(1, rest),
              `${label}: dims at ×${factor}`
            );
          }
          assert.ok(Math.min(1, rest * GLOW_FACTOR_MAX) >= Math.min(1, rest), `${label}: flares`);
        }
      }
      assert.ok(total >= 151, `${name}: positive control, the roster's lamps, saw ${total}`);
      assert.ok(held > 0, `${name}: positive control, some lamp rested past white and was held`);
    }
  });
});
