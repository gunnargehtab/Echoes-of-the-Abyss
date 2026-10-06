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
 * Drawn in shapes since #1106. In rectangles this map read as a checkerboard
 * from the survey dolly; the outlines below draw the same ground as places. The
 * rift swells about its vents, each plateau turns a flank to the middle, the
 * trench lips break at the corners and recede across the gaps, and the reefs
 * reach out of the rift at either end.
 *
 * The shapes moved outlines, not the water between seats. Every straight line
 * from one spawn to another crosses the cells it always did, and kelp and vent
 * kept their counts; the lip's notches gave eight cells of trench to open water
 * and the reef tips took four of open water for coral. `maps.test.ts` counts
 * both. A first draft cut trench bays into the row the bases stand on, which
 * put the loudest water on the map between neighbouring seats and turned an
 * eight-minute AI duel into a 272-second rout.
 *
 * Every number below is a whole 250 m cell (issue #157, docs/maps.md "How a
 * map is written"). The rectangles before these were re-stated that way when
 * the centre rule landed: the cells this map painted were the cells it had
 * always played on, apart from the west plateaus, which had quietly grown a
 * column the east ones could not have — the map edge clipped that same column
 * on the far side, so a map that says it is symmetric across both axes was
 * 250 m of kelp wider on the west.
 *
 * The four plateaus then grew deliberately, all four at once, to close the
 * gutter their own bases stood in (#622). On the other axis: the #157 fault
 * was a *column*, 250 m of extra kelp along x on the west pair, and this was a
 * *row* — the north pair took the cell row centred 1,125 and the south pair
 * its mirror centred 6,875, thirty-two cells in total. Read it as the opposite
 * of #157 rather than a repeat: one plateau growing is a bug, and all four
 * growing into their own mirror images is a map change with a price. Symmetry
 * is what tells the two apart, which is why it is asserted cell by cell rather
 * than trusted.
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
    // 2,000 m across the reefs, eight cell rows centred on the map's east-west
    // axis, which is what the rectangle before it always painted (the 1,600 m
    // it once read was 6.4 rows and could only ever be one or the other). It
    // swells to 2,500 m about its vents, where the plumes rise, and where it
    // climbs into each plateau's flank; it narrows to 1,500 m where the
    // plateaus press in at the map's edges and where the transit gaps reach
    // down beside each reef.
    {
      shape: 'polygon',
      points: [
        [0, 3250],
        [750, 3250],
        [1000, 3000],
        [1250, 3000],
        [1250, 2750],
        [1500, 2750],
        [1750, 3000],
        [2000, 3000],
        [2000, 3250],
        [2250, 3250],
        [2250, 3000],
        [3250, 3000],
        [3500, 2750],
        [W - 3500, 2750],
        [W - 3250, 3000],
        [W - 2250, 3000],
        [W - 2250, 3250],
        [W - 2000, 3250],
        [W - 2000, 3000],
        [W - 1750, 3000],
        [W - 1500, 2750],
        [W - 1250, 2750],
        [W - 1250, 3000],
        [W - 1000, 3000],
        [W - 750, 3250],
        [W, 3250],
        [W, H - 3250],
        [W - 750, H - 3250],
        [W - 1000, H - 3000],
        [W - 1250, H - 3000],
        [W - 1250, H - 2750],
        [W - 1500, H - 2750],
        [W - 1750, H - 3000],
        [W - 2000, H - 3000],
        [W - 2000, H - 3250],
        [W - 2250, H - 3250],
        [W - 2250, H - 3000],
        [W - 3250, H - 3000],
        [W - 3500, H - 2750],
        [3500, H - 2750],
        [3250, H - 3000],
        [2250, H - 3000],
        [2250, H - 3250],
        [2000, H - 3250],
        [2000, H - 3000],
        [1750, H - 3000],
        [1500, H - 2750],
        [1250, H - 2750],
        [1250, H - 3000],
        [1000, H - 3000],
        [750, H - 3250],
        [0, H - 3250],
      ],
      biome: Biome.ThermalVein,
      note: 'The vent line. PF 0.45 — the quiet road, and the dangerous one.',
    },
    // "North/South: Abyssal Trenches". The loud way round, full width as ever.
    // The lip bites into each plateau's far corner, beside the promontory the
    // plateau pushes out over it, and falls back in two notches across the gap.
    // It keeps off the row the bases stand on, which is the line between
    // neighbouring seats.
    {
      shape: 'polygon',
      points: [
        [0, 0],
        [W, 0],
        [W, 1250],
        [W - 500, 1250],
        [W - 500, 1000],
        [W - 2750, 1000],
        [W - 2750, 750],
        [W - 3250, 750],
        [W - 3250, 1000],
        [3250, 1000],
        [3250, 750],
        [2750, 750],
        [2750, 1000],
        [500, 1000],
        [500, 1250],
        [0, 1250],
      ],
      biome: Biome.AbyssalTrench,
      floorM: 2900,
      note: 'North trench — the deepest water on the map, and the loudest at PF 1.6',
    },
    {
      shape: 'polygon',
      points: [
        [0, H],
        [W, H],
        [W, H - 1250],
        [W - 500, H - 1250],
        [W - 500, H - 1000],
        [W - 2750, H - 1000],
        [W - 2750, H - 750],
        [W - 3250, H - 750],
        [W - 3250, H - 1000],
        [3250, H - 1000],
        [3250, H - 750],
        [2750, H - 750],
        [2750, H - 1000],
        [500, H - 1000],
        [500, H - 1250],
        [0, H - 1250],
      ],
      biome: Biome.AbyssalTrench,
      floorM: 2900,
      note: 'South trench',
    },
    // "East/West: Kelp Forest Plateaus" — the base aprons, quiet enough to
    // build on without announcing every structure.
    //
    // Each runs from the trench lip to the vent band, with nothing between.
    // They used to stop a cell row short at y 1,250 and y 6,750, and the four
    // spawns sit at y 1,200 and y 6,800 — one row inside that gutter, which no
    // region painted. So every Bastion and Foundry on the default map opened
    // in open water over the map's own 2,600 m seabed at PF 1.0, which is
    // neither of the two things this region claims to be, on all four seats
    // identically (#622). Symmetric, which is exactly why nothing ever looked
    // odd about it.
    //
    // Polygons since #1106, each holding the 64 cells its square did: a
    // promontory pushed out over the trench beside a bay of it in the far
    // corner, a shoulder past the home field, and a flank cut back toward the
    // middle, so the transit gap opens on the rift. The south edge is the
    // rift's north edge point for point, so nothing lies between them.
    {
      shape: 'polygon',
      points: [
        [0, 1250],
        [500, 1250],
        [500, 750],
        [1000, 750],
        [1000, 1000],
        [2000, 1000],
        [2000, 1250],
        [2250, 1250],
        [2250, 1750],
        [2000, 1750],
        [2000, 2000],
        [1500, 2750],
        [1250, 2750],
        [1250, 3000],
        [1000, 3000],
        [750, 3250],
        [0, 3250],
      ],
      biome: Biome.KelpForest,
      // A plateau in the literal sense, and now under the bases as well. 700 m
      // clears the 600 m that structures and nodule fields are seated at, and
      // nothing more: you cannot lurk deep over your own base. In the gutter
      // you could — 2,600 m of water with THERMOCLINE.DEPTH_M inside the
      // column, so a loiter position under someone's Bastion existed and was
      // heard across the layer at 0.3.
      floorM: 700,
      note: 'West plateau',
    },
    {
      shape: 'polygon',
      points: [
        [W, 1250],
        [W - 500, 1250],
        [W - 500, 750],
        [W - 1000, 750],
        [W - 1000, 1000],
        [W - 2000, 1000],
        [W - 2000, 1250],
        [W - 2250, 1250],
        [W - 2250, 1750],
        [W - 2000, 1750],
        [W - 2000, 2000],
        [W - 1500, 2750],
        [W - 1250, 2750],
        [W - 1250, 3000],
        [W - 1000, 3000],
        [W - 750, 3250],
        [W, 3250],
      ],
      biome: Biome.KelpForest,
      floorM: 700,
      note: 'East plateau',
    },
    {
      shape: 'polygon',
      points: [
        [0, H - 1250],
        [500, H - 1250],
        [500, H - 750],
        [1000, H - 750],
        [1000, H - 1000],
        [2000, H - 1000],
        [2000, H - 1250],
        [2250, H - 1250],
        [2250, H - 1750],
        [2000, H - 1750],
        [2000, H - 2000],
        [1500, H - 2750],
        [1250, H - 2750],
        [1250, H - 3000],
        [1000, H - 3000],
        [750, H - 3250],
        [0, H - 3250],
      ],
      biome: Biome.KelpForest,
      floorM: 700,
    },
    {
      shape: 'polygon',
      points: [
        [W, H - 1250],
        [W - 500, H - 1250],
        [W - 500, H - 750],
        [W - 1000, H - 750],
        [W - 1000, H - 1000],
        [W - 2000, H - 1000],
        [W - 2000, H - 1250],
        [W - 2250, H - 1250],
        [W - 2250, H - 1750],
        [W - 2000, H - 1750],
        [W - 2000, H - 2000],
        [W - 1500, H - 2750],
        [W - 1250, H - 2750],
        [W - 1250, H - 3000],
        [W - 1000, H - 3000],
        [W - 750, H - 3250],
        [W, H - 3250],
      ],
      biome: Biome.KelpForest,
      floorM: 700,
    },
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
    //
    // That overhang is allowed and the guard-rail still binds, because since
    // #577 the guard-rail binds the gardener rather than the ground:
    // `bloomShare.ts` pays only a tender in the Shelf band, so the half of
    // each bed standing over the 2,600 m gap is kelp a hull may hide in and
    // not income it may earn from below.
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
    // "Multiple narrow crossing points": coral reefs break the vent band up
    // so crossing it is a choice of lane rather than a straight line.
    //
    // Each is the ellipse in a frame a cell longer than the rift at either
    // end, so a reef rounds off where it leaves the vents and its tip stands
    // in the transit gap: 26 cells where the rectangle held 24, all three
    // columns wide across the rift itself.
    {
      shape: 'ellipse',
      x: 2250,
      y: 2750,
      widthM: 750,
      heightM: 2500,
      biome: Biome.CoralRuins,
      // Shelf-band ground, so the divider is something you rise over rather
      // than something you route around. It was only ever an acoustic shadow
      // before; now it is also a shape.
      floorM: 380,
      note: 'Crossing divider — hard acoustic shadow, and ground',
    },
    {
      shape: 'ellipse',
      x: 5000,
      y: 2750,
      widthM: 750,
      heightM: 2500,
      biome: Biome.CoralRuins,
      floorM: 380,
    },
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
    // 900 m and not further, when they moved: these fields had to stay inside
    // the Thermal Vein band, then y 3,000-5,000, which is what makes working
    // them "quiet and dangerous at once" and is asserted a few tests above. The
    // vein band was the constraint, the plume radius the requirement, and 900
    // the only round number that satisfied both. The rift has since swelled to
    // y 2,750-5,250 about them (#1106), which loosens the constraint and moves
    // neither field.
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
    // The apron beds — docs/maps.md, "Where an ordinary bed goes".
    //
    // "East/West: Kelp Forest Plateaus" has been the biome under every base
    // since the archetype was written, and until now there was no kelp in it:
    // the map painted the ground and authored no field, so the plateaus were
    // Kelp Forest the way a name is a name. That was invisible until the
    // flora economy landed, and then it was the whole of it — a bio-reactor
    // needs a bed on ground that seats a structure at 600 m, the gardens are
    // Shelf-band at 380 m and refuse one by construction, and these four
    // plateaus at 700 m were the only ground on the map that could hold one
    // and had nothing standing on it. `reactorSite` returned null on every
    // observation of every match, so the account the flora economy was built
    // to make spendable had nowhere to be spent (#535, #547).
    //
    // Each plateau does carry a Bastion and a Foundry now: they stood in the
    // gutter north of it until #622 and stand on the plateau's own front edge
    // since. That does not take the ground back, because a bed is a field
    // rather than a footprint and the distances in the bullet below are
    // measured from this bed to those two buildings — but the sentence above
    // was written of an empty plateau and is no longer one.
    //
    // Placed in each plateau's back corner, which is chosen against the two
    // ways a bed here could be the wrong change:
    //
    // - **Off the working lane.** Kelp grips unequally — the Knights snag at
    //   0.5 where the Commune swim at 1.0 (docs/hazards.md §4) — so a field
    //   over the run from a home nodule field to its Bastion would be a tax
    //   three navies pay for the shape of their hulls. The home field is at
    //   (1900, 1450) and the Bastion at (1200, 1200); this bed's rim is
    //   1,350 m from the first and 1,076 m from the second, and the lane
    //   between them does not touch it.
    // - **Not a fifth garden.** It is behind a base rather than in the water
    //   between two, so it is the opposite decision to a bloom node: a
    //   garden is contested ground the Commune must stand on, and this is
    //   ground its owner already holds. What it costs is not distance, it is
    //   the cover over the base itself — a reactor eats the nearest canopy
    //   first, so a navy funding itself here un-hides its own apron while it
    //   does (docs/systems-flora.md §2).
    //
    // The garden's radius, for the garden's reason: 400 m is a field a hull
    // stands in rather than crosses, and a bed's 240 Biomass does not scale
    // with its area, so a larger one would buy nothing but drag.
    //
    // Four, mirrored across both axes to the metre, like everything else on
    // this map.
    {
      x: 500,
      y: 2500,
      radiusM: 400,
      kind: 'kelp-entanglement',
      note: 'North-west apron bed — the reactor ground behind the base',
    },
    { x: W - 500, y: 2500, radiusM: 400, kind: 'kelp-entanglement' },
    { x: 500, y: H - 2500, radiusM: 400, kind: 'kelp-entanglement' },
    { x: W - 500, y: H - 2500, radiusM: 400, kind: 'kelp-entanglement' },
  ],
};
