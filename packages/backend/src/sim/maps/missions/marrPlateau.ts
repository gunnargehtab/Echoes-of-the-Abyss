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
 */

import { Biome, FaunaSpecies, TETHERJELLY_KELP_BAND } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const MARR_PLATEAU: MapDefinition = {
  id: 'marr-plateau',
  name: 'Marr Plateau',
  idealUse: 'The Second Seeding, mission one. A garden terrace, a working day, and a survey.',
  seats: 1,
  widthM: 4000,
  heightM: 2500,
  doc: 'docs/mission-tend.md §11; docs/maps.md — Mission maps',
  cellM: 250,
  floorM: 320,
  // One row per row of §11's table, in the document's order. Later regions
  // overwrite earlier ones; every number a shape states is a whole 250 m cell,
  // and a cell is its region's when the shape holds its centre (#1148). The
  // reshape is new content, never a lever: five cells moved, none under a
  // place either mission seats, orders or bounds, and the plateau has as many
  // Kelp Forest cells as it had. `missionTend.test.ts` pins both missions'
  // ground.
  regions: [
    // A box because it is the whole map, painted first.
    {
      x: 0,
      y: 0,
      widthM: 4000,
      heightM: 2500,
      biome: Biome.KelpForest,
      floorM: 320,
      note: 'The Terrace — the plateau. Painted first; everything else is cut into it',
    },
    // A box because Tend restates it as the `gardens` region the share's
    // loads are worked in: a shape that painted other cells would draw garden
    // the mission does not count.
    {
      x: 500,
      y: 250,
      widthM: 1250,
      heightM: 750,
      biome: Biome.KelpForest,
      floorM: 250,
      note: "The Gardens — the bloom nodes and the farm rows. The share's source",
    },
    // A box because Convocation restates it as the `holdfast` region a
    // foreign hull holds, and Tend's `holdfast` and `ovens` lie inside it.
    {
      x: 2250,
      y: 250,
      widthM: 750,
      heightM: 500,
      biome: Biome.KelpForest,
      floorM: 280,
      note: "The Holdfast — home, named for what anchors kelp. The spawn, and the share's delivery point",
    },
    // A box because Tend restates it as the `west-lane` region the re-seat
    // is counted in.
    {
      x: 250,
      y: 1000,
      widthM: 1000,
      heightM: 750,
      biome: Biome.KelpForest,
      floorM: 300,
      note: 'The West Lane — the jelly lane. The clusters have walked; the re-seat happens here',
    },
    // The lip runs on a slant to the west edge, so the terrace reaches two
    // rows further south in the edge column, and the drop reaches two rows
    // north up the east edge from Teel's Landing. No line from a place either
    // mission seats, sends or holds the player to another party's authored
    // position crosses the four cells that changed biome, but a hull that
    // strays into either edge column is now heard through different water.
    {
      shape: 'polygon',
      points: [
        [0, 2500],
        [250, 2000],
        [500, 1750],
        [3750, 1750],
        [4000, 1000],
        [4000, 2500],
      ],
      biome: Biome.AbyssalTrench,
      floorM: 900,
      note: "The Drop — the bare slope and the survey lane. Trench paint at the Shelf's edge: the drop carries",
    },
    // The bench's east end runs on a slant, so its north-east cell is the
    // Drop's 900 m, trench like the bench. Every other cell is held: the
    // watch's edge in its north row, the sweep's lane along its south row, and
    // the heavy's climb across its north-west corner.
    {
      shape: 'polygon',
      points: [
        [1500, 1750],
        [2250, 1750],
        [2500, 2250],
        [1500, 2250],
      ],
      biome: Biome.AbyssalTrench,
      floorM: 600,
      note: 'The Face — a nodule bench on the slope that two parties call theirs. The Rift has more than one, which is the problem',
    },
    // A box because Tend restates it as the `landing` region the gift is
    // delivered to.
    {
      x: 3500,
      y: 1750,
      widthM: 500,
      heightM: 500,
      biome: Biome.KelpForest,
      floorM: 400,
      note: "Teel's Landing — the neighbouring terrace's storm-bitten edge. The gift's destination",
    },
  ],
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
