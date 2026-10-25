/**
 * Marr Plateau — docs/mission-tend.md §11; docs/maps.md, "Mission maps".
 *
 * One of the great garden terraces on the Rift's north shoulder, and the
 * shallowest map the campaign will ever play. Two facts about the water decide
 * the whole mission and both are ground rather than script: the plateau's
 * working water is 250–320 m, above every predator's pursuit band — the
 * Shelf's safety is the depth rules doing what they always do — and the drop's
 * bare slope carries sound the way bare rock does, which is why the plateau
 * hears a sweep four minutes out, and why a sweep hears a garden that forgets
 * itself (§1).
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — the standing
 * argument: one seat, not balanced, resolved by mission id and nothing else.
 * The Drop's trench paint at the Shelf's edge is Asset Recovery's authoring
 * freedom pointed the other way: biome is acoustics, not band.
 *
 * **The ground is shared's** (`MARR_PLATEAU_GROUND`, #1630), as the Fourth's
 * Foot's is: the continuous world draws this map before any room exists
 * (docs/world-map.md §7.9), so its regions are authored once, in
 * `@echoes/shared`, and spread in here. What stays here is the spawn.
 */

import { FaunaSpecies, MARR_PLATEAU_GROUND, TETHERJELLY_KELP_BAND } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const MARR_PLATEAU: MapDefinition = {
  id: 'marr-plateau',
  name: 'Marr Plateau',
  idealUse: 'The Second Seeding, mission one. A garden terrace, a working day, and a survey.',
  seats: 1,
  doc: 'docs/mission-tend.md §11; docs/maps.md — Mission maps',
  ...MARR_PLATEAU_GROUND,
  // One spawn, at the Holdfast. The offsets address a pre-built Foundry a
  // mission never places: nothing to build, and the day seats itself.
  spawns: [{ x: 2625, y: 375, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // No nodule fields and no crystal: the plateau's income is bloom-share
  // (docs/economy.md §6), and its nodes are below.
  resources: [],
  // Three garden nodes in the Gardens, on farm-row spacing — the share's
  // source, and the tithe's idea anchored to exactly this ground.
  blooms: [
    { x: 750, y: 500, note: 'The north garden rows' },
    { x: 1125, y: 625, note: 'The mid rows' },
    { x: 1500, y: 500, note: 'The east rows, nearest the Holdfast' },
  ],
  // No hazard sites — the plateau's weather is other people (§11).
  hazards: [],
  // The jelly lane is Kelp Forest at a 300 m floor and the plateau has no
  // duct — its deepest ground is the Drop at 900 m — so the Tetherjelly
  // rests here in its Kelp Forest band, 250 m ±50 m (docs/bestiary.md §4,
  // "One species, two waters"). Named rather than inferred: the plateau is
  // the one shipped map whose kelp is shallower than the duct.
  ambientBands: { [FaunaSpecies.Tetherjelly]: TETHERJELLY_KELP_BAND },
};
