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
import { MAPS, MISSION_MAPS, terrainFor } from '../src/sim/maps/index.ts';
import {
  ENVIRONMENT_PROPS,
  placeProps,
  PROP_INSTANCE_CAP,
  PROP_TRI_RESERVATION,
} from '../../frontend/src/game/environment.ts';

describe('environment prop budget over the shipped maps', () => {
  const heaviest = Math.max(...ENVIRONMENT_PROPS.map((spec) => spec.triBudget));

  for (const map of [...MAPS, ...MISSION_MAPS]) {
    it(`${map.id} dresses inside the gate-6 reservation without a cut`, () => {
      const placements = placeProps(terrainFor(map).serialize());
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

  it('dresses every skirmish map with something', () => {
    // The other half of the contract: densities low enough to fit must still
    // put geometry on the ground — an empty layer is the pre-asset state, not
    // a tuning outcome.
    for (const map of MAPS) {
      assert.ok(placeProps(terrainFor(map).serialize()).length > 0, `${map.id} stands bare`);
    }
  });
});
