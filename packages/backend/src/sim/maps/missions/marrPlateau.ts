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

import { Biome } from '@echoes/shared';
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
  // One row per row of §11's table, in the document's order. Every rectangle
  // lands on the 250 m cell grid and paints exactly the metres it reads.
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 4000,
      heightM: 2500,
      biome: Biome.KelpForest,
      floorM: 320,
      note: 'The Terrace — the plateau. Painted first; everything else is cut into it',
    },
    {
      x: 500,
      y: 250,
      widthM: 1250,
      heightM: 750,
      biome: Biome.KelpForest,
      floorM: 250,
      note: "The Gardens — the bloom nodes and the farm rows. The share's source",
    },
    {
      x: 2250,
      y: 250,
      widthM: 750,
      heightM: 500,
      biome: Biome.KelpForest,
      floorM: 280,
      note: "The Holdfast — home, named for what anchors kelp. The spawn, and the share's delivery point",
    },
    {
      x: 250,
      y: 1000,
      widthM: 1000,
      heightM: 750,
      biome: Biome.KelpForest,
      floorM: 300,
      note: 'The West Lane — the jelly lane. The clusters have walked; the re-seat happens here',
    },
    {
      x: 0,
      y: 1750,
      widthM: 4000,
      heightM: 750,
      biome: Biome.AbyssalTrench,
      floorM: 900,
      note: "The Drop — the bare slope and the survey lane. Trench paint at the Shelf's edge: the drop carries",
    },
    {
      x: 1500,
      y: 1750,
      widthM: 1000,
      heightM: 500,
      biome: Biome.AbyssalTrench,
      floorM: 600,
      note: 'The Face — a nodule bench on the slope that two parties call theirs. The Rift has more than one, which is the problem',
    },
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
};
