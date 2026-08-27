/**
 * Abyssal Rift Corridor — docs/maps.md, Map Type 3.
 *
 * "A long trench map with brutal choke points and vertical depth gameplay."
 *
 * The opposite argument to the Ventfront Divide, and the reason both exist:
 * this map has **no secrets**. The trench down the centre is PF 1.6, so sound
 * travels its whole length, and anything moving through the middle is heard
 * from end to end. Cover exists only on the side plateaus, which is what makes
 * the corridor a commitment rather than a route.
 *
 * A 1v1 map, so it has two spawns — the reason spawn counts are map data.
 */

import { ABYSSAL_RIFT_CORRIDOR_HEADER, Biome, ResourceKind } from '@echoes/shared';
import type { MapDefinition } from './types.ts';

// Long and narrow, because the doc's layout is "central trench corridor
// (long, narrow, deep)" and a square map cannot express that.
const W = ABYSSAL_RIFT_CORRIDOR_HEADER.widthM;
const H = ABYSSAL_RIFT_CORRIDOR_HEADER.heightM;

/**
 * Every rectangle below lands on the 250 m cell grid, so each paints exactly
 * the metres it reads (issue #157, docs/maps.md "How a map is written"). They
 * were re-stated that way when the centre rule landed: the cells this map
 * paints are the cells it has always played on, apart from the south vent band
 * and the north coral one, which had each grown a column their mirror image
 * had not — a rectangle ending exactly on a cell boundary used to claim the
 * cell on the far side of it.
 */
export const ABYSSAL_RIFT_CORRIDOR: MapDefinition = {
  ...ABYSSAL_RIFT_CORRIDOR_HEADER,
  doc: 'docs/maps.md — Map Type 3',
  cellM: 250,
  // The shelf either side of the rift. "Vertical depth layers with fog
  // separation" is this map's third Layout Logic bullet, and it is the floors
  // that deliver it: the corridor is not just narrow, it is a step down.
  floorM: 1400,
  regions: [
    // "Center: Abyssal Trenches" — the corridor, running the long axis.
    //
    // *Central*, not edge to edge: the first draft ran it the full width, which
    // put both starting bases inside the loudest biome in the game and made
    // the opening a permanent broadcast. The ends are base aprons instead, and
    // committing to the rift is now a thing a player does rather than a thing
    // they wake up in.
    {
      x: 1750,
      y: 2000,
      widthM: W - 3500,
      heightM: 2000,
      biome: Biome.AbyssalTrench,
      // "Long, narrow, deep", and deep enough for the crystal field seated at
      // 2,400 m in the middle of it. Dropping into the rift is a descent, which
      // is the loud direction — the map charges you to use its fast road twice.
      floorM: 2900,
      note: 'The rift. PF 1.6 for its whole length — nothing crosses it unheard.',
    },
    // Base aprons. Coral: hard acoustic shadows, so a base is defensible
    // without being silent.
    {
      x: 0,
      y: 1750,
      widthM: 2000,
      heightM: 2500,
      biome: Biome.CoralRuins,
      // "Side plateaus for expansions": 700 m clears the 600 m structures and
      // nodule fields sit at, and leaves no room to lurk deep over a base.
      floorM: 700,
      note: 'West apron',
    },
    {
      x: W - 2000,
      y: 1750,
      widthM: 2000,
      heightM: 2500,
      biome: Biome.CoralRuins,
      floorM: 700,
      note: 'East apron',
    },
    // "Side: Thermal Veins + Coral Ruins" — the only cover on the map.
    { x: 1500, y: 500, widthM: 2750, heightM: 1500, biome: Biome.ThermalVein, note: 'North vents' },
    {
      x: W - 4250,
      y: H - 2000,
      widthM: 2750,
      heightM: 1500,
      biome: Biome.ThermalVein,
      note: 'South vents',
    },
    { x: 1500, y: H - 2000, widthM: 2750, heightM: 1500, biome: Biome.CoralRuins },
    { x: W - 4250, y: 500, widthM: 2750, heightM: 1500, biome: Biome.CoralRuins },
    // "Corners: Resonance Fields" — bearings lie there, which is the reward
    // for holding a corner and the risk of walking into one.
    { x: 0, y: 0, widthM: 1250, heightM: 1250, biome: Biome.ResonanceField },
    { x: W - 1250, y: 0, widthM: 1250, heightM: 1250, biome: Biome.ResonanceField },
    { x: 0, y: H - 1250, widthM: 1250, heightM: 1250, biome: Biome.ResonanceField },
    { x: W - 1250, y: H - 1250, widthM: 1250, heightM: 1250, biome: Biome.ResonanceField },
    // "Brutal choke points": two coral shelves pinching the corridor.
    {
      x: 3250,
      y: 2000,
      widthM: 500,
      heightM: 2000,
      biome: Biome.CoralRuins,
      // Shelf ground, like the Ventfront dividers: a choke you rise over
      // rather than one you route around.
      floorM: 380,
      note: 'West choke',
    },
    { x: W - 3750, y: 2000, widthM: 500, heightM: 2000, biome: Biome.CoralRuins, floorM: 380 },
  ],
  spawns: [
    { x: 900, y: H / 2, foundryOffsetX: 0, foundryOffsetY: -450 },
    { x: W - 900, y: H / 2, foundryOffsetX: 0, foundryOffsetY: -450 },
  ],
  resources: [
    { x: 1600, y: H / 2 - 900, kind: ResourceKind.Nodule, note: 'West home field' },
    { x: W - 1600, y: H / 2 - 900, kind: ResourceKind.Nodule },
    // Expansions on the plateaus, away from the rift: taking one means leaving
    // the corridor, which is exactly the decision the map wants to force.
    { x: 2800, y: 1200, kind: ResourceKind.Nodule, amount: 5000 },
    { x: W - 2800, y: H - 1200, kind: ResourceKind.Nodule, amount: 5000 },
    {
      x: W / 2,
      y: H / 2,
      kind: ResourceKind.ResonanceCrystal,
      note: 'The middle of the rift — the loudest place on the map',
    },
  ],
  hazards: [
    {
      x: W / 2,
      y: H / 2,
      radiusM: 1400,
      kind: 'pressure-zone',
      note: 'Constant DoT (doc); the rift floor is below most hulls PR',
    },
    { x: 600, y: 600, radiusM: 900, kind: 'resonance-storm', note: 'Corner field' },
    { x: W - 600, y: 600, radiusM: 900, kind: 'resonance-storm' },
    { x: 600, y: H - 600, radiusM: 900, kind: 'resonance-storm' },
    { x: W - 600, y: H - 600, radiusM: 900, kind: 'resonance-storm' },
  ],
};
