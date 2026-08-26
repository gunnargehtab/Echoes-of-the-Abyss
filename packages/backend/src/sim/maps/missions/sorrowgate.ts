/**
 * Sorrowgate — docs/mission-sorrowgate.md §11; docs/maps.md, "Mission maps".
 *
 * The terminus of a pre-collapse civic transit line, and the line ran out over
 * a deep basin. Two facts about the water decide the whole mission and both are
 * ground rather than script: the chamber sits at 1,500 m and the thermocline
 * sits at 1,200 m, so nothing said in the court carries upward; and the basin
 * underneath is Abyssal Trench at PF 1.6, which is how a ping fired in the
 * chamber reaches something living in it.
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately.** The public
 * catalogue is what the setup screen renders and what `maps.test.ts` holds to
 * two-to-four seats, a crystal field and a nodule field per spawn — every one
 * of which a one-seat chamber with no economy fails, and rightly. A mission
 * owns its own water: this map is resolved by mission id and cannot be chosen
 * in a skirmish. It is also why the six header fields are authored inline here
 * instead of spread from a shared header — there is no public half of it.
 *
 * Cut from Map Type 5's shape (multi-layered ruins, collapsed domes, a tunnel
 * beneath the main lane) without being a Sunken Metropolis: that archetype
 * promises a four-seat competitive layout and this is a room the player is
 * scripted into.
 */

import { Biome } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const SORROWGATE: MapDefinition = {
  id: 'sorrowgate',
  name: 'Sorrowgate',
  idealUse: 'Prologue only. A court, a gate, and the water underneath it.',
  seats: 1,
  widthM: 5000,
  heightM: 4000,
  doc: 'docs/mission-sorrowgate.md §11; docs/maps.md — Mission maps',
  cellM: 250,
  floorM: 1600,
  // One row per row of §11's table, in the document's order, so the two can be
  // read side by side. Later regions overwrite earlier ones where they overlap,
  // which is what lets the districts be painted whole and everything else cut
  // into them.
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 4000,
      biome: Biome.CoralRuins,
      floorM: 1600,
      note: 'The Districts — the drowned city. Painted first; everything else is cut into it',
    },
    {
      x: 1600,
      y: 0,
      widthM: 1800,
      heightM: 700,
      biome: Biome.CoralRuins,
      // Above the 1,200 m layer, which is the whole reason this is where the
      // tenders are going: the layer is a wall, and nothing follows you up.
      floorM: 340,
      note: 'The Upper Concourse — the passenger terminus. The extraction point',
    },
    {
      x: 2000,
      y: 700,
      widthM: 1000,
      heightM: 900,
      biome: Biome.CoralRuins,
      // A 900 m floor is what makes "where 1,200 m is crossed" a fact about the
      // ground rather than an instruction: a hull cannot be in the Descent at
      // all without having climbed above the thermocline to get there.
      floorM: 900,
      note: 'The Descent — the step between the Concourse and the city',
    },
    {
      x: 200,
      y: 1400,
      widthM: 1200,
      heightM: 900,
      biome: Biome.ThermalVein,
      // Stated rather than inherited, so this file reads row for row against
      // §11's table: the approach is city floor, and only its water is quiet.
      floorM: 1600,
      note: 'The West Approach. PF 0.45 — the one road where the flight can be loud and get away with it. Nothing tells the player this',
    },
    {
      x: 1900,
      y: 1900,
      widthM: 300,
      heightM: 450,
      biome: Biome.CoralRuins,
      floorM: 1500,
      // The only roofed water on the map, and after the arch goes it is the
      // only way out of the chamber. §11's 300 m against a 250 m cell rounds
      // out to two columns, so the lock is narrower in the fiction than on the
      // grid; what has to survive the rounding is that it is covered, and a
      // route nobody can be watched taking.
      ceilingM: 1300,
      note: 'The Service Lock — roofed water joining the chamber to the districts',
    },
    {
      x: 2100,
      y: 2300,
      widthM: 900,
      heightM: 900,
      biome: Biome.CoralRuins,
      floorM: 1500,
      note: 'The Gate — the dome and the chamber. The court',
    },
    {
      x: 1700,
      y: 3200,
      widthM: 1700,
      heightM: 800,
      biome: Biome.AbyssalTrench,
      // PF 1.6 and 2,400 m: sound runs a long way along this basin's axis, and
      // nothing the player owns is rated to follow it down. The mission's floor
      // is authored here, in the terrain, rather than enforced anywhere.
      floorM: 2400,
      note: 'The Commit — the basin the city committed its dead into. Needs PR-3',
    },
  ],
  // One spawn, at the arch. The offsets address a pre-built Foundry that a
  // mission never places: there is no economy here and nothing to build, and
  // the mission seats its own order of battle in the constructor.
  spawns: [{ x: 2550, y: 2150, foundryOffsetX: 0, foundryOffsetY: 0 }],
  resources: [],
  hazards: [],
};
