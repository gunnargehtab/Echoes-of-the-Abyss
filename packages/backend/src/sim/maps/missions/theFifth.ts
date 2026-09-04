/**
 * The Fifth — docs/mission-standing-wave.md §11; docs/maps.md, "Mission maps".
 *
 * A canyon in crystal that rings at a fifth, on the Resonance Fields' southern
 * margin where crystal country breaks toward the trenches. Four regions, and
 * §11 is emphatic that the third is the one doing the work: the North Gallery
 * is the Bastion's ground, the anchor every build radius is measured from, and
 * the region the terminal objective names — and its floor is 250 m shallower
 * than the defile's, which is what makes it *above* the corridor in "be
 * outside it when it closes".
 *
 * **Two systems are arranged to have nothing to say, and both by ground** —
 * docs/mission-aptitude.md §11's argument reused. Every metre here is
 * Mid-Water (rim 1,450, floor 1,700, mouth 1,780, against a 400–1,800 m band),
 * so the party is PR-2 throughout and nothing crushes; and the thermocline
 * duct ends at 1,300 m, 150 m above the shallowest ground, so every pair is
 * Below-to-Below and the layer's factor is 1 on all of them. One system per
 * mission, and the system is the corridor.
 *
 * **The South Mouth is a trench, and that is the second fact about this water
 * that decides the mission** (§1): PF 1.60 down the axis, so anything loud in
 * the Fifth is heard down it by whatever is further down than the deep
 * houses. A megaphone built in the Fifth is pointed at the bottom of the Rift.
 *
 * No resources, no hazard sites, no fauna: the Knight economy is a stipend
 * paid against the Bastion (docs/economy.md §6), and a crystal node in the
 * Fifth would make the mission about cutting crystal in a canyon rather than
 * about closing one (§3). Not in `MAPS` and not in `MAP_HEADERS`, for the
 * standing argument: one seat, not balanced, resolved by mission id only.
 */

import { Biome } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const THE_FIFTH: MapDefinition = {
  id: 'the-fifth',
  name: 'The Fifth',
  idealUse:
    'The Second Chord, mission two. A crystal defile that is the only covered road between trench country and the northern slope, and a works order to close it.',
  seats: 1,
  widthM: 5000,
  heightM: 4000,
  doc: 'docs/mission-standing-wave.md §11; docs/maps.md — Mission maps',
  cellM: 250,
  floorM: 1700,
  // One row per row of §11's table, in the document's order: the shoulders
  // are painted first and the three cut into them, so the Gallery and the
  // Mouth overwrite the Fields the way docs/maps.md requires. Every rectangle
  // lands on the 250 m cell grid and paints exactly the metres it reads.
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 5000,
      heightM: 4000,
      biome: Biome.ResonanceField,
      floorM: 1700,
      note: 'The southern shoulders — crystal country, painted first. PF 0.70, scattered; off the defile it is ground nobody in this mission has a reason to be on',
    },
    {
      x: 2000,
      y: 500,
      widthM: 1000,
      heightM: 3000,
      biome: Biome.ResonanceField,
      floorM: 1700,
      note: 'The Fifth — the defile. A kilometre wall to wall, three kilometres long, and the only covered line between trench country and the northern slope',
    },
    {
      x: 1750,
      y: 0,
      widthM: 1500,
      heightM: 500,
      biome: Biome.ResonanceField,
      floorM: 1450,
      note: "The North Gallery — where the Fifth opens into the Third's country. The spawn, the Bastion, and the region §8 extracts to; 250 m above the defile",
    },
    {
      x: 1750,
      y: 3500,
      widthM: 1500,
      heightM: 500,
      biome: Biome.AbyssalTrench,
      floorM: 1780,
      note: "The South Mouth — where crystal country breaks toward the trenches. PF 1.60 axial: the strip that carries, and the column's entrance",
    },
  ],
  // One spawn, in the Gallery beside the Bastion at 1,450 m. The Foundry
  // offsets address a structure the works never place: the Order builds one
  // thing in this mission and it is not a yard (§3).
  spawns: [{ x: 2500, y: 400, foundryOffsetX: 0, foundryOffsetY: 0 }],
  resources: [],
  hazards: [],
};
