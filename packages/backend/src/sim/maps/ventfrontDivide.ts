/**
 * The Ventfront Divide — docs/maps.md, Map Type 1.
 *
 * "A geothermal battlefield split by erupting thermal veins."
 *
 * The map's argument is **masking**. The vent line down the middle is PF 0.45,
 * the lowest in the game, so the contested ground is also the ground where
 * nobody can hear anything — an army can be assembled inside it and only be
 * heard when it leaves. The trenches north and south are PF 1.6, which means
 * the flanking routes are the loud ones: you can go quietly through the middle
 * or quickly around the outside, never both.
 */

import { Biome, ResourceKind, VENTFRONT_DIVIDE_HEADER } from '@echoes/shared';
import type { MapDefinition } from './types.ts';

const W = VENTFRONT_DIVIDE_HEADER.widthM;
const H = VENTFRONT_DIVIDE_HEADER.heightM;

/**
 * Every rectangle below lands on the 250 m cell grid, so each paints exactly
 * the metres it reads (issue #157, docs/maps.md "How a map is written"). They
 * were re-stated that way when the centre rule landed: the cells this map
 * paints are the cells it has always played on, apart from the west plateaus,
 * which had quietly grown a column the east ones could not have — the map edge
 * clipped that same column on the far side, so a map that says it is symmetric
 * across both axes was 250 m of kelp wider on the west.
 */
export const VENTFRONT_DIVIDE: MapDefinition = {
  ...VENTFRONT_DIVIDE_HEADER,
  doc: 'docs/maps.md — Map Type 1',
  cellM: 250,
  // The seabed the map starts at, deep enough to hold the centre crystal field
  // at 2,400 m. Everything below carves into this (docs/systems-depth.md §1).
  floorM: 2600,
  regions: [
    // "Center: Thermal Veins (hot, bright, dangerous)". A broad band rather
    // than a line: it has to be wide enough to hide an army in, or the map's
    // whole proposition collapses into a corridor fight.
    //
    // 2,000 m, restated from the 1,600 m this used to read, because 2,000 m is
    // what it has always painted and the width is the proposition. Eight cell
    // rows, centred on the map's east-west axis; 1,600 m is 6.4 of them and
    // could only ever be one or the other.
    {
      x: 0,
      y: 3000,
      widthM: W,
      heightM: 2000,
      biome: Biome.ThermalVein,
      note: 'The vent line. PF 0.45 — the quiet road, and the dangerous one.',
    },
    // "North/South: Abyssal Trenches". The loud way round.
    {
      x: 0,
      y: 0,
      widthM: W,
      heightM: 1000,
      biome: Biome.AbyssalTrench,
      floorM: 2900,
      note: 'North trench — the deepest water on the map, and the loudest at PF 1.6',
    },
    {
      x: 0,
      y: H - 1000,
      widthM: W,
      heightM: 1000,
      biome: Biome.AbyssalTrench,
      floorM: 2900,
      note: 'South trench',
    },
    // "East/West: Kelp Forest Plateaus" — the base aprons, quiet enough to
    // build on without announcing every structure.
    {
      x: 0,
      y: 1250,
      widthM: 2000,
      heightM: 1750,
      biome: Biome.KelpForest,
      // A plateau in the literal sense now. 700 m clears the 600 m that
      // structures and nodule fields are seated at, and nothing more: you
      // cannot lurk deep over your own base.
      floorM: 700,
      note: 'West plateau',
    },
    {
      x: W - 2000,
      y: 1250,
      widthM: 2000,
      heightM: 1750,
      biome: Biome.KelpForest,
      floorM: 700,
      note: 'East plateau',
    },
    { x: 0, y: 5000, widthM: 2000, heightM: 1750, biome: Biome.KelpForest, floorM: 700 },
    { x: W - 2000, y: 5000, widthM: 2000, heightM: 1750, biome: Biome.KelpForest, floorM: 700 },
    // The bloom gardens — docs/maps.md, Map Type 1, and the guard-rail that
    // sites them (docs/systems-echo.md §10, docs/economy.md §9): bloom-share is
    // anchored to *exposed Shelf plateaus*, so the quietest navy earns on the
    // most reachable water on the map.
    //
    // The two transit gaps are that water. Everything between the base
    // plateaus and the vent line was unpainted — open water over the map's own
    // 2,600 m floor — and it is the ground both seats on a side cross to reach
    // the middle. A shallow kelp shelf here is 2,912 m from each of the two
    // spawns beside it and 5,557 m from the other two: shared by a pair,
    // owned by neither.
    //
    // Not the base plateaus, which are Mid-Water at 700 m and would be barred
    // anyway; and not the crossing dividers, which are already Shelf and
    // already contested but would put a *gripping* kelp field across the two
    // lanes everyone uses to cross the vent line — three navies dragged and
    // one not, which is a change to how the map is crossed rather than to who
    // earns on it.
    //
    // 380 m is the dividers' figure, for the dividers' reason: inside the
    // Shelf band with room to spare, and shallow enough that a garden reads as
    // ground you rise onto. Nothing can be built on one — structures seat at
    // 600 m, below this floor — which is the Commune's own doctrine as terrain:
    // a garden is held with hulls or it is not held.
    //
    // Two cells square, and no larger, because this ground is spoken for. The
    // only water on this map that is deep, off the vein, and outside every
    // spawn's 2,600 m fauna exclusion is a corridor about 600 m wide running
    // down x = 4,000 — which is to say the map's megafauna live exactly where
    // a neutral garden wants to be, for the same reason: it is the one place
    // far from everybody. A 1,000 m shelf here cost the map 42% of its
    // Sounder seedings and 20% of its Draymaws over 200 seeds; 500 m costs
    // 10% and 7%. The bed is 800 m across and spreads past the rim onto the
    // drop, which is what a knoll with kelp on it looks like.
    {
      x: 3750,
      y: 1750,
      widthM: 500,
      heightM: 500,
      biome: Biome.KelpForest,
      floorM: 380,
      note: 'North garden — a shallow kelp shelf in the deep transit gap',
    },
    // Mirrored across the east-west axis to the metre. The map is asserted
    // symmetric cell by cell from all four corners, and a garden a column out
    // of place is an advantage handed to two seats.
    {
      x: 3750,
      y: 5750,
      widthM: 500,
      heightM: 500,
      biome: Biome.KelpForest,
      floorM: 380,
      note: 'South garden',
    },
    // "Multiple narrow crossing points": coral pillars break the vent band up
    // so crossing it is a choice of lane rather than a straight line.
    {
      x: 2250,
      y: 3000,
      widthM: 750,
      heightM: 2000,
      biome: Biome.CoralRuins,
      // Shelf-band ground, so the divider is something you rise over rather
      // than something you route around. It was only ever an acoustic shadow
      // before; now it is also a shape.
      floorM: 380,
      note: 'Crossing divider — hard acoustic shadow, and ground',
    },
    { x: 5000, y: 3000, widthM: 750, heightM: 2000, biome: Biome.CoralRuins, floorM: 380 },
    // "Side tunnels for flanking" — the Layout Logic bullet that had nowhere to
    // live until ground could have a roof. Painted after the dividers, so they
    // bore through them rather than sitting beside them.
    //
    // Two crossings with opposite costs. Over the top you rise to 380 m and
    // make the approach in Shelf water. Through the slot you dive past 520 m,
    // which is fast and loud going in and slow coming out — but the rock is
    // between you and anything watching the shallows.
    //
    // The slot is bored through the divider's full width and sits on the map's
    // east-west axis, two cell rows of it, so both flanks are the same route
    // seen from opposite sides.
    {
      x: 2250,
      y: 3750,
      widthM: 750,
      heightM: 500,
      biome: Biome.CoralRuins,
      ceilingM: 520,
      floorM: 1400,
      note: 'West flanking tunnel — enterable only by diving under the divider',
    },
    {
      x: 5000,
      y: 3750,
      widthM: 750,
      heightM: 500,
      biome: Biome.CoralRuins,
      ceilingM: 520,
      floorM: 1400,
      note: 'East flanking tunnel',
    },
  ],
  // Four corners, facing in. The doc calls this a 1v1 or 2v2 map, so the
  // spawns are symmetric across both axes.
  spawns: [
    { x: 1200, y: 1200, foundryOffsetX: 450, foundryOffsetY: 0 },
    { x: W - 1200, y: 1200, foundryOffsetX: -450, foundryOffsetY: 0 },
    { x: 1200, y: H - 1200, foundryOffsetX: 450, foundryOffsetY: 0 },
    { x: W - 1200, y: H - 1200, foundryOffsetX: -450, foundryOffsetY: 0 },
  ],
  resources: [
    { x: 1900, y: 1450, kind: ResourceKind.Nodule, note: 'Home field, NW' },
    { x: W - 1900, y: 1450, kind: ResourceKind.Nodule },
    { x: 1900, y: H - 1450, kind: ResourceKind.Nodule },
    { x: W - 1900, y: H - 1450, kind: ResourceKind.Nodule },
    // "Toxic brine pockets near mining rigs" — the contested fields sit inside
    // the vent band, so working them is quiet and dangerous at once. Each sits
    // at its vent's centre, which is what makes working one the worst place on
    // the map to be when it fires.
    //
    // They were 500 m either side of the crystal, and the vents with them, so
    // the 700 m plumes covered the crystal too and #179's "one pass wounds
    // badly and leaves the trip possible" was being asked of a hull that had
    // also paid 238 HP of crush to be there (#491). Each pair moved out 500 m
    // together: the plumes keep their reach and keep the fields they were
    // authored to make dangerous — each still at a plume centre, where a pass
    // is lethal — and the crystal gets 200 m of clearance instead of sitting
    // inside both.
    //
    // 900 m and not further: these fields have to stay inside the Thermal Vein
    // band (y 3,000-5,000), which is what makes working them "quiet and
    // dangerous at once" and is asserted a few tests above. The vein band is
    // the constraint, the plume radius is the requirement, and 900 is the only
    // round number that satisfies both.
    { x: 4000, y: 3100, kind: ResourceKind.Nodule, amount: 6000, note: 'Contested, in the vents' },
    { x: 4000, y: 4900, kind: ResourceKind.Nodule, amount: 6000 },
    {
      x: 4000,
      y: 4000,
      kind: ResourceKind.ResonanceCrystal,
      note: 'Dead centre and deep — nobody works it without committing',
    },
  ],
  // One node per garden, at the centre of its shelf — docs/systems-flora.md §2.
  // The simulation grows a full kelp bed on each at `BLOOM_SHARE.TEND_RADIUS_M`,
  // so the bed sits wholly inside the shelf it is authored on.
  //
  // Two rather than four: a garden is worth holding only if holding it costs
  // something, and a node per seat would make the Commune's income a thing
  // they collect at home rather than a thing they stand on contested ground
  // for. Two nodes for four seats is the same arithmetic as the two contested
  // nodule fields in the vents.
  blooms: [
    { x: 4000, y: 2000, note: 'North garden' },
    { x: 4000, y: 6000, note: 'South garden' },
  ],
  hazards: [
    {
      x: 4000,
      y: 3100,
      radiusM: 700,
      kind: 'geothermal-eruption',
      note: 'Predictable intervals (doc); the mid field sits at its centre',
    },
    { x: 4000, y: 4900, radiusM: 700, kind: 'geothermal-eruption' },
    { x: 1900, y: 1450, radiusM: 400, kind: 'toxic-brine', note: 'Near mining rigs' },
    { x: W - 1900, y: H - 1450, radiusM: 400, kind: 'toxic-brine' },
  ],
};
