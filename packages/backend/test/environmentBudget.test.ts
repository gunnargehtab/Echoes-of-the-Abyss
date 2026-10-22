/**
 * The environment prop reservation, summed over the shipped maps
 * (docs/graphics-standards.md gate 6: "a test sums the registry's worst case
 * over the shipped maps so the reservation cannot be exceeded by accretion").
 *
 * The frontend enforces the caps by construction — `placeProps` stops
 * spending at the instance and triangle reservations — but a registry whose
 * demand *reaches* the cap is still a bug: the spend is row-major, so the
 * cut would dress the north of a map and leave the south bare. This test
 * lives on the backend because the maps do, and it reads the frontend's
 * registry from source so a density tune and a new map are judged together.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CRYSTAL, ECONOMY, ResourceKind, type ResourceNodeInfo } from '@echoes/shared';
import { MAPS, MISSION_MAPS, terrainFor } from '../src/sim/maps/index.ts';
import type { MapDefinition } from '../src/sim/maps/types.ts';
import {
  ENVIRONMENT_PROPS,
  FIELD_PROP_SLUG,
  placeProps,
  PROP_INSTANCE_CAP,
  PROP_TRI_RESERVATION,
} from '../../frontend/src/game/environment.ts';

/**
 * The fields a match on this map publishes, as `Match.seedResourceNodes`
 * seeds them: the ore the layer stands at them spends from the same
 * reservation (#1555), so the worst case is the map's scatter plus its fields.
 */
function fieldsOf(map: MapDefinition): ResourceNodeInfo[] {
  return map.resources.map((node, i) => ({
    id: i + 1,
    x: node.x,
    y: node.y,
    kind: node.kind,
    depth: node.depthM ?? 0,
    initialAmount:
      node.amount ??
      (node.kind === ResourceKind.ResonanceCrystal
        ? CRYSTAL.FIELD_STARTING_AMOUNT
        : ECONOMY.NODE_STARTING_AMOUNT),
  }));
}

describe('environment prop budget over the shipped maps', () => {
  const heaviest = Math.max(...ENVIRONMENT_PROPS.map((spec) => spec.triBudget));

  for (const map of [...MAPS, ...MISSION_MAPS]) {
    it(`${map.id} dresses inside the gate-6 reservation without a cut`, () => {
      const placements = placeProps(
        terrainFor(map).serialize(),
        ENVIRONMENT_PROPS,
        'standard',
        fieldsOf(map)
      );
      const tris = placements.reduce(
        (sum, p) => sum + (ENVIRONMENT_PROPS.find((s) => s.slug === p.slug)?.triBudget ?? 0),
        0
      );
      // Strictly inside, with room for one more of the heaviest prop: a
      // placement list that ends exactly at the cap is one that was cut.
      assert.ok(
        placements.length < PROP_INSTANCE_CAP,
        `${map.id}: ${placements.length} props hit the ${PROP_INSTANCE_CAP} instance cap`
      );
      assert.ok(
        tris + heaviest <= PROP_TRI_RESERVATION,
        `${map.id}: ${tris} triangles leave no room under the ${PROP_TRI_RESERVATION} reservation`
      );
    });
  }

  it('stands ore at every field on every map', () => {
    // A field with nothing standing in it is the chart's rim over bare ground:
    // the pre-#1555 look, which a map seating a field in a wall would restore.
    for (const map of [...MAPS, ...MISSION_MAPS]) {
      const fields = fieldsOf(map);
      const placements = placeProps(
        terrainFor(map).serialize(),
        ENVIRONMENT_PROPS,
        'standard',
        fields
      );
      for (const field of fields) {
        const slug = FIELD_PROP_SLUG[field.kind];
        const near = placements.filter(
          (p) => p.slug === slug && Math.hypot(p.xM - field.x, p.yM - field.y) <= 200
        );
        assert.ok(
          near.length > 0,
          `${map.id}: field ${field.id} at ${field.x},${field.y} stands bare`
        );
      }
    }
  });

  it('dresses every skirmish map with something', () => {
    // The other half of the contract: densities low enough to fit must still
    // put geometry on the ground — an empty layer is the pre-asset state, not
    // a tuning outcome.
    for (const map of MAPS) {
      assert.ok(placeProps(terrainFor(map).serialize()).length > 0, `${map.id} stands bare`);
    }
  });
});
