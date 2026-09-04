/**
 * The First — docs/mission-the-three.md §11; docs/maps.md, "Mission maps".
 *
 * The deepest chapter-house in the Order, at 2,900 m where the Resonance
 * Fields break toward the trenches (docs/habitats.md §5): a shrine, a hospice
 * and a sealed room, cut into crystal, with the First Chord still aimed down
 * the trench axis and still tuned. Twelve minutes, no combat, nothing armed on
 * either side. Three facts about this water decide the mission and all three
 * are ground rather than script.
 *
 * **The house is four ceilings, each deeper than the last** — 2,600 over the
 * approach, 2,700 over the chord, 2,750 over the hospice, 2,800 over the
 * sealed room. So the building is entered by diving under rock four times and
 * every room of it is water nobody reaches by accident. Nothing enforces that:
 * `Terrain.admits` refuses a hull above a roof, and there is no beat, no
 * predicate and no fence anywhere in the mission that says the same thing. The
 * escort's courtesies are the player's; the roofs are the map's.
 *
 * **The foot's floor is 2,700 and not 2,300, and the roof is the reason.** Two
 * cells connect only at a depth both admit, so a foot floored at the party's
 * own 2,300 m under an approach roofed at 2,600 would leave three hundred
 * metres of rock between the escort and the house and no way in at all. The
 * deeper foot buys the dive its water: the party drops to 2,650 while still
 * over the foot, crosses in, and goes on down. §11 records the number rather
 * than leaving it to be discovered here.
 *
 * **The Axis carries, and it carries the wrong way.** One strip of Abyssal
 * Trench along the south edge at PF 1.60, into a house whose instrument has
 * been pointed down it for thirty-six years — so the only loud water on the
 * map is the water the First is listening to. Its floor is 3,100 m, one
 * hundred metres below `DEPTH.MAX_M`, which is the deepest a hull can be
 * *ordered* (`match.ts`, `applyDepth`): the trench bottom is deliberately
 * somewhere the player cannot go, exactly as `mouth-rim`'s Lip is. It is also
 * the second way in — a hull that dived to 2,900 over the trench could come up
 * into the chord from the south — and the mission does not fence that either.
 * It is longer, it is 1.60 water, and a dive at 72 SIG on that bearing is the
 * loudest thing anybody could do on this map.
 *
 * Everything else the systems could have said, this ground refuses to let them
 * say. The shallowest seat is 2,300 m, so every hull is Abyssal from the first
 * tick and the four PR-3 refits in §3 cover the whole map — depth costs
 * nothing here and means one thing only, which is what the certificates cost.
 * The duct's bottom is 1,300 m, fourteen hundred metres above the shallowest
 * ground, so the thermocline's factor is 1 on every pair on the map. One
 * system per mission (docs/mission-aptitude.md §11), and the other axes are
 * given nothing to say.
 *
 * The sealed room is cut off the chord's **east** end rather than off the
 * hospice, which is a change to docs/habitats.md §5 that §13 names rather than
 * smuggles: a room behind the hospice would make the only route to the case a
 * transit through the Three's cells, and §6's whole argument is that the
 * hospice is heard and never entered.
 *
 * **Not in `MAPS` and not in `MAP_HEADERS`, deliberately** — the standing
 * argument: one seat, no resources, not balanced, resolved by mission id and
 * nothing else. No blooms and no hazard sites either, and nothing to seed:
 * below 2,700 m the column holds nothing at all (docs/bestiary.md §4), so the
 * mission runs with `fauna: false` and authors no creature.
 */

import { Biome } from '@echoes/shared';
import type { MapDefinition } from '../types.ts';

export const THE_FIRST: MapDefinition = {
  id: 'the-first',
  name: 'The First',
  idealUse: 'The Three, Second Chord 5. A house in working order, and nothing in it is safe.',
  seats: 1,
  widthM: 4000,
  heightM: 3000,
  doc: 'docs/mission-the-three.md §11; docs/maps.md — Mission maps',
  cellM: 250,
  floorM: 2700,
  // One row per row of §11's table, in the document's order. Later regions
  // overwrite earlier ones, which is what lets the Fields be painted whole and
  // the house cut into them as four roofed rooms — every one of which is a
  // ceiling laid over water that was open a line earlier. The Axis is painted
  // last and clears the foot's southern strip; it does not reach the rooms,
  // which stop at y = 2500. Every rectangle lands on the 250 m cell grid and
  // paints exactly the metres it reads.
  regions: [
    {
      x: 0,
      y: 0,
      widthM: 4000,
      heightM: 3000,
      biome: Biome.ResonanceField,
      floorM: 2700,
      note: "The Foot of the Fields — crystal country's last ground before the trenches, PF 0.70. Painted first; everything else is cut into it. The party crosses it at 2,300 m",
    },
    {
      x: 1500,
      y: 750,
      widthM: 1000,
      heightM: 1250,
      biome: Biome.ResonanceField,
      floorM: 2900,
      ceilingM: 2600,
      note: 'The Approach — the roofed way in: water only between 2,600 and 2,900 m. Entered by a deliberate dive and by nothing else',
    },
    {
      x: 1500,
      y: 2000,
      widthM: 1000,
      heightM: 500,
      biome: Biome.CoralRuins,
      floorM: 2900,
      ceilingM: 2700,
      note: "The Chord — the hall at the formation's heart. Cut structure is Coral Ruins (docs/habitats.md §8), PF 0.80 occluded. The First Chord stands here, and so does the hush",
    },
    {
      x: 1000,
      y: 2000,
      widthM: 500,
      heightM: 500,
      biome: Biome.CoralRuins,
      floorM: 2900,
      ceilingM: 2750,
      note: 'The Hospice — three cells off the chord. The Three. Heard from the hall for twelve minutes and never entered',
    },
    {
      x: 2500,
      y: 2000,
      widthM: 500,
      heightM: 500,
      biome: Biome.CoralRuins,
      floorM: 2900,
      ceilingM: 2800,
      note: 'The Sealed Room — the cut dry room, off the east end of the chord. The deepest ceiling on the map, so it is the last dive',
    },
    {
      x: 0,
      y: 2500,
      widthM: 4000,
      heightM: 500,
      biome: Biome.AbyssalTrench,
      floorM: 3100,
      note: 'The Axis — the trench the Chord is aimed down, PF 1.60. What is heard on it is heard from the south, and its floor is a hundred metres below anywhere a hull can be ordered',
    },
  ],
  // One spawn, at the foot (§11). The offsets address a pre-built Foundry the
  // mission never places: construction is locked, `startingNodules` is 0, and
  // there is nothing on this map to build or to buy.
  spawns: [{ x: 2000, y: 375, foundryOffsetX: 0, foundryOffsetY: 0 }],
  // §11 — no resources, because the First is finished. No hazard sites and no
  // blooms: the only thing that happens on this map is a house keeping its
  // hours.
  resources: [],
  hazards: [],
};
