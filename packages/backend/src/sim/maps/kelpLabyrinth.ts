/**
 * Kelp Labyrinth — docs/maps.md, Map Type 2.
 *
 * "A dense maze of kelp forests with hidden paths and stealth zones."
 *
 * The third argument, and the reason these three were chosen: this map is
 * neither a masked middle nor an exposed one, it is **broken sightlines**.
 * Kelp is PF 0.55 and, per docs/environments.md, everything in it "sounds
 * close and dead" — so the maze does not hide an army so much as destroy the
 * player's ability to tell how far away one is. A contact at Tier 2 in here is
 * far less useful than the same contact in open water.
 *
 * The maze is built from kelp blocks with open-water corridors between them,
 * which is what "multiple winding routes" is when written as data: the routes
 * are the gaps.
 */

import { Biome, KELP_LABYRINTH_HEADER, ResourceKind } from '@echoes/shared';
import type { MapDefinition } from './types.ts';

const W = KELP_LABYRINTH_HEADER.widthM;
const H = KELP_LABYRINTH_HEADER.heightM;

/** Kelp blocks of the central maze. The corridors are what is left over. */
const MAZE: Array<[number, number, number, number]> = [
  [2000, 2000, 1400, 900],
  [3800, 2000, 900, 1900],
  [5100, 2000, 900, 900],
  [2000, 3300, 900, 1400],
  [3300, 4300, 1400, 900],
  [5100, 3300, 900, 1900],
  [2000, 5100, 1900, 900],
  [4300, 5100, 1400, 900],
  [3300, 2900, 400, 900],
  [4300, 3300, 700, 400],
];

export const KELP_LABYRINTH: MapDefinition = {
  ...KELP_LABYRINTH_HEADER,
  doc: 'docs/maps.md — Map Type 2',
  cellM: 250,
  // Mid-Water throughout. This map's argument is broken sightlines, not
  // pressure, so the ground is mostly level and the maze does the work.
  floorM: 1800,
  regions: [
    // "Outer ring: Coral Ruins" — painted first, as the ground everything
    // else sits on. Hard shadows, so the ring is where ambushes start.
    { x: 0, y: 0, widthM: W, heightM: H, biome: Biome.CoralRuins, note: 'Outer ring' },
    // The open expansion ring, cut out of the coral.
    {
      x: 1200,
      y: 1200,
      widthM: W - 2400,
      heightM: H - 2400,
      biome: Biome.OpenWater,
      note: '"Open outer ring for expansions"',
    },
    // "Center: Kelp Forest Plateaus" — the maze itself.
    ...MAZE.map(([x, y, widthM, heightM]) => ({
      x,
      y,
      widthM,
      heightM,
      biome: Biome.KelpForest,
    })),
    // "Deep pockets: Abyssal pressure zones" — the shortcut through the maze
    // is also the one that costs hull.
    {
      x: 3600,
      y: 3600,
      widthM: 800,
      heightM: 800,
      biome: Biome.AbyssalTrench,
      // Deep enough for the crystal field seated at 2,400 m. "Behind the maze"
      // is now also "below it".
      floorM: 2600,
      note: 'Central pocket — the fast way across, and the loud one',
    },
    // Thermal vents on the ring. The doc's biome list for this map does not
    // include them, but Thermal Draw is tapped from veins and a map with none
    // would put its players permanently on the Bastion's own plant with no way
    // to scale. Sited on the open ring rather than in the maze, so taking one
    // is exposed — which is the trade the resource is supposed to create.
    { x: 3200, y: 900, widthM: 1600, heightM: 500, biome: Biome.ThermalVein },
    { x: 3200, y: H - 1400, widthM: 1600, heightM: 500, biome: Biome.ThermalVein },
    // "Hidden tunnels connecting corners" — on the diagonals, and clear of
    // the spawns. They sat *on* the corner spawns in the first draft, which
    // would have started two players in the deepest, loudest biome on the map.
    { x: 1800, y: 1800, widthM: 600, heightM: 600, biome: Biome.AbyssalTrench, floorM: 2600 },
    {
      x: W - 2400,
      y: H - 2400,
      widthM: 600,
      heightM: 600,
      biome: Biome.AbyssalTrench,
      floorM: 2600,
    },
    // "Hidden tunnels connecting corners" — the Layout Logic bullet this map
    // has carried since it was written, with no way to express it until ground
    // could have a roof.
    //
    // One under each side wall, joining that side's two corners beneath the
    // coral ring. The ceiling sits below the 600 m that structures and nodule
    // fields are seated at, so nothing can be built in one: it is a road, not
    // ground. Entering costs a dive, and a maze whose walls you can pass under
    // is a different maze to a scout who thought of it.
    {
      x: 400,
      y: 2000,
      widthM: 500,
      heightM: 4000,
      biome: Biome.CoralRuins,
      ceilingM: 700,
      floorM: 1800,
      note: 'West wall tunnel — joins the two western corners, out of sight',
    },
    {
      x: W - 900,
      y: 2000,
      widthM: 500,
      heightM: 4000,
      biome: Biome.CoralRuins,
      ceilingM: 700,
      floorM: 1800,
      note: 'East wall tunnel',
    },
  ],
  // Diagonal spawns: the doc's "hidden tunnels connecting corners" makes the
  // diagonal the interesting axis, so the two players sit on it.
  spawns: [
    { x: 900, y: 900, foundryOffsetX: 500, foundryOffsetY: 200 },
    { x: W - 900, y: H - 900, foundryOffsetX: -500, foundryOffsetY: -200 },
    { x: W - 900, y: 900, foundryOffsetX: -500, foundryOffsetY: 200 },
    { x: 900, y: H - 900, foundryOffsetX: 500, foundryOffsetY: -200 },
  ],
  resources: [
    { x: 1700, y: 1100, kind: ResourceKind.Nodule, note: 'Home field, NW' },
    { x: W - 1700, y: H - 1100, kind: ResourceKind.Nodule },
    { x: W - 1700, y: 1100, kind: ResourceKind.Nodule },
    { x: 1700, y: H - 1100, kind: ResourceKind.Nodule },
    // Expansions on the open ring: safe to reach, impossible to defend
    // quietly, because holding them means standing outside the kelp.
    { x: W / 2, y: 1500, kind: ResourceKind.Nodule, amount: 5500 },
    { x: W / 2, y: H - 1500, kind: ResourceKind.Nodule, amount: 5500 },
    {
      x: W / 2,
      y: H / 2,
      kind: ResourceKind.ResonanceCrystal,
      note: 'In the central pocket — deep, loud, and behind the maze',
    },
  ],
  hazards: [
    { x: 3400, y: 3400, radiusM: 1200, kind: 'kelp-entanglement', note: 'Maze core' },
    { x: 4600, y: 4600, radiusM: 1200, kind: 'kelp-entanglement' },
    // "Cold shock currents in deeper pockets" (doc), and all three sit on the
    // NW-SE diagonal — the same axis the two primary spawns and the hidden
    // corner tunnels are on. So they are one current sampled three times, not
    // three unrelated ones, and they all run the same way: 45 degrees, which
    // is NW to SE.
    //
    // That is deliberately asymmetric, on the one map whose stated ideal use
    // is asymmetric play. The north-west player attacks with the water and
    // withdraws against it; the south-east player approaches against it and
    // pulls out with it. Neither is strictly better — it is the depth bargain
    // (fast in, slow out) rotated into the horizontal plane, handed to one
    // side and reversed for the other. Worth watching in playtests; if it
    // reads as a straight advantage rather than a different shape of game,
    // turn the outer two to flow inward and leave the centre alone.
    {
      x: W / 2,
      y: H / 2,
      radiusM: 600,
      kind: 'cold-shock',
      flowDeg: 45,
      note: 'Cold shock currents in the deeper pockets (doc) — over the crystal',
    },
    { x: 2100, y: 2100, radiusM: 400, kind: 'cold-shock', flowDeg: 45 },
    { x: W - 2100, y: H - 2100, radiusM: 400, kind: 'cold-shock', flowDeg: 45 },
  ],
};
