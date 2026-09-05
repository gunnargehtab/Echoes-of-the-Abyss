/**
 * The board on the chart — docs/ui-ux.md §14, "The chart"; docs/world-map.md
 * §5, "Where the Campaign Happens".
 *
 * Split from the component for `campaignBoard.ts`'s reason: where a mission
 * stands in the Rift, how deep, and in whose water are facts, and facts belong
 * somewhere a test can reach without a DOM. `RiftChart.tsx` draws what these
 * functions return and decides nothing about the world.
 *
 * **The gazetteer is transcribed, never invented.** Each ground is a map the
 * catalogue already names by `mapId`, placed where Plate VII places its region
 * (docs/concept-art/plate-07-rift-chart.svg — the coordinates below are the
 * plate's own, in its 2000 × 2750 space), at the depth docs/world-map.md §3
 * gives the *place* — the reading a player would give the ground, "the First
 * at 2,900 m" — in the water that section says it is. Not the map's base
 * floor from the mission document's §11: the two differ on eight grounds, and
 * the rail marks the place (#422; docs/ui-ux.md §14, "The chart"). A ground
 * the catalogue does not stand on is not here, and a mission the catalogue
 * adds on a ground that is not here fails `riftChart.test.ts` rather than
 * drawing nowhere — as does a depth that drifts from §3.
 *
 * Whose water and whose mission are two different facts, and the chart keeps
 * them apart: a mark takes its **campaign's** ink, the ground it stands on is
 * named in the **water's**. A Directorate slot on the Kell Shoulder is a red
 * mark on the plateaus' country, which is the mission in one glance — the
 * shoulder is where the cohorts go shallow and suffer for it.
 */

import { Faction } from '@echoes/shared';
import type { BoardSlot, CampaignBoard } from './campaignBoard.ts';

/**
 * A place the campaign is played, as the chart needs it.
 *
 * `water` is `null` for ground nobody holds — the drowned city, the rim, the
 * Fourth that two parties claim and neither patrols alone — and `whose` says so in
 * words either way, because "nobody's" is a fact about the Rift and not an
 * absence of one.
 */
export interface Ground {
  mapId: string;
  /** The place, as docs/world-map.md §3 names it. */
  name: string;
  /** The region of §3 it sits in, as Plate VII labels it. */
  region: string;
  /**
   * The depth the rail marks: the place's, from docs/world-map.md §3 — the
   * court at 1,500 m rather than Sorrowgate's 1,600 m map floor, the First
   * Trench's shallow band at 1,800 rather than the 2,400 its map falls to.
   * The rail is a gazetteer, not a playing-depth gauge (#422), and
   * `riftChart.test.ts` holds every row to §3's number.
   */
  depthM: number;
  water: Faction | null;
  /** Whose water it is, in the water's own word for itself. */
  whose: string;
  /** Plate VII's coordinates for the place. */
  x: number;
  y: number;
}

/**
 * Plate VII's depth rail, as (metres, y) pairs — the survey's own ticks, so a
 * mark's depth on the rail agrees with the plate a player might have seen.
 * The rail is not linear: the plate gives the shallows room because that is
 * where the names are, and the Mouth one tick because nothing stands on it.
 */
export const DEPTH_RAIL: ReadonlyArray<readonly [number, number]> = [
  [0, 430],
  [400, 612],
  [1200, 1152],
  [1800, 1552],
  [4410, 2400],
];

/** The plate's y for a depth, interpolated between the rail's ticks. */
export function railY(depthM: number): number {
  const first = DEPTH_RAIL[0];
  const last = DEPTH_RAIL[DEPTH_RAIL.length - 1];
  if (depthM <= first[0]) return first[1];
  if (depthM >= last[0]) return last[1];
  for (let i = 1; i < DEPTH_RAIL.length; i++) {
    const [d0, y0] = DEPTH_RAIL[i - 1];
    const [d1, y1] = DEPTH_RAIL[i];
    if (depthM <= d1) return y0 + ((depthM - d0) / (d1 - d0)) * (y1 - y0);
  }
  return last[1];
}

const WHOSE: Record<Faction, string> = {
  [Faction.Bathyarch]: 'the concern’s water',
  [Faction.Pelagia]: 'the plateaus’ water',
  [Faction.Directorate]: 'the cohorts’ water',
  [Faction.Hadron]: 'the Order’s water',
};

function held(faction: Faction): Pick<Ground, 'water' | 'whose'> {
  return { water: faction, whose: WHOSE[faction] };
}

/**
 * Every ground the catalogue stands on — docs/world-map.md §5's table, one row
 * per map rather than per campaign block. Regions in the plate's order, north
 * to south.
 */
export const GROUNDS: readonly Ground[] = [
  // The Plateaus — the Rift's north shoulder.
  {
    mapId: 'marr-plateau',
    name: 'Marr Plateau',
    region: 'The Plateaus',
    depthM: 320,
    ...held(Faction.Pelagia),
    x: 560,
    y: 560,
  },
  {
    mapId: 'kell-shoulder',
    name: 'The Kell Shoulder',
    region: 'The Plateaus',
    depthM: 340,
    // The one Shelf ground in the Rift with no plateau on it, and still the
    // Commune's own country (docs/world-map.md §3).
    ...held(Faction.Pelagia),
    x: 1270,
    y: 650,
  },
  {
    mapId: 'anholt-furrow',
    name: 'The Furrow, under Anholt’s terrace',
    region: 'The Plateaus',
    // The furrow itself — the seeded floor at 2,200 m, not the Foot at 900
    // where the plateau's lane comes down (docs/world-map.md §3).
    depthM: 2200,
    ...held(Faction.Pelagia),
    x: 900,
    y: 720,
  },
  // The West Wall — the industrial shore.
  {
    mapId: 'holding-underworks',
    name: 'The Underworks, under Holding One',
    region: 'The West Wall',
    depthM: 1300,
    ...held(Faction.Bathyarch),
    x: 537,
    y: 1110,
  },
  {
    mapId: 'holding-board',
    name: 'Board country, the Underway',
    region: 'The West Wall',
    depthM: 1350,
    ...held(Faction.Bathyarch),
    x: 537,
    y: 1130,
  },
  {
    mapId: 'ninefold-face-six',
    name: 'Face Six, Ninefold Vein',
    region: 'The West Wall',
    depthM: 1000,
    ...held(Faction.Bathyarch),
    x: 600,
    y: 1360,
  },
  {
    mapId: 'ninefold-workings',
    name: 'The Upper Workings, Ninefold Vein',
    region: 'The West Wall',
    depthM: 1100,
    ...held(Faction.Bathyarch),
    x: 652,
    y: 1364,
  },
  // The Drowned City — mid-Rift, neutral ground.
  {
    mapId: 'sorrowgate',
    name: 'Sorrowgate, the drowned city',
    region: 'The Drowned City',
    depthM: 1500,
    water: null,
    whose: 'nobody’s water — all four deny using it',
    x: 1000,
    y: 1330,
  },
  // The Resonance Fields — the east slope.
  {
    mapId: 'outer-formations',
    name: 'The Third’s outer formations',
    region: 'The Resonance Fields',
    depthM: 1700,
    ...held(Faction.Hadron),
    x: 1300,
    y: 1272,
  },
  {
    mapId: 'the-fifth',
    name: 'The Fifth',
    region: 'The Resonance Fields',
    depthM: 1700,
    ...held(Faction.Hadron),
    x: 1344,
    y: 1452,
  },
  {
    mapId: 'the-rest',
    name: 'The Rest',
    region: 'The Resonance Fields',
    // The Head, at 1,600 m: the trench head the place is named for, above
    // the Order's bench at 1,750 and the floor at 2,150 (docs/world-map.md §3).
    depthM: 1600,
    ...held(Faction.Hadron),
    x: 1393,
    y: 1507,
  },
  {
    mapId: 'the-first',
    name: 'The First Chapter-House',
    region: 'The Resonance Fields',
    depthM: 2900,
    ...held(Faction.Hadron),
    x: 1314,
    y: 1682,
  },
  // The Trench Country — the southern deep.
  {
    mapId: 'first-trench-margin',
    name: 'The Western Margin, First Trench',
    region: 'The Trench Country',
    depthM: 1800,
    // The concern surveys it; the water is the top step of the cohorts'
    // country (docs/mission-exposure.md §1).
    ...held(Faction.Directorate),
    x: 770,
    y: 1795,
  },
  {
    mapId: 'shallow-band',
    name: 'The shallow band, the First Trench',
    region: 'The Trench Country',
    depthM: 1800,
    ...held(Faction.Directorate),
    x: 860,
    y: 1850,
  },
  {
    mapId: 'fourth-trench',
    name: 'The Fourth Trench',
    region: 'The Trench Country',
    depthM: 1700,
    water: null,
    whose: 'claimed by the concern and the cohorts, and neither patrols it alone',
    x: 840,
    y: 1988,
  },
  {
    mapId: 'fourth-foot',
    name: 'The Fourth’s foot',
    region: 'The Trench Country',
    // The Foot, the last bench at 2,400 m, where the listening dome stands —
    // not the fan above it (docs/world-map.md §3).
    depthM: 2400,
    ...held(Faction.Directorate),
    x: 960,
    y: 2060,
  },
  {
    mapId: 'banding-ground',
    name: 'The banding ground, the upper Ninth',
    region: 'The Trench Country',
    depthM: 2400,
    ...held(Faction.Directorate),
    x: 990,
    y: 2210,
  },
  {
    mapId: 'upper-terraces',
    name: 'Sufficiency’s upper terraces',
    region: 'The Trench Country',
    // The top of the city: Sufficiency runs 2,750–3,400 m and the terraces
    // the calling is seated on are its upper ones (docs/world-map.md §3).
    depthM: 2750,
    ...held(Faction.Directorate),
    x: 900,
    y: 2270,
  },
  {
    mapId: 'attending-galleries',
    name: 'The attending galleries, Sufficiency',
    region: 'The Trench Country',
    // The galleries stand at 3,000 m on the Ninth's axis, the deepest any
    // hull is ordered; the axis under them falls to 4,100 (docs/world-map.md §3).
    depthM: 3000,
    ...held(Faction.Directorate),
    x: 930,
    y: 2312,
  },
  // The Mouth — the far south, nobody's.
  {
    mapId: 'mouth-rim',
    name: 'The Rim, the Mouth’s northern edge',
    region: 'The Mouth',
    depthM: 2600,
    water: null,
    whose: 'nobody’s water — four reasons converging',
    x: 1000,
    y: 2286,
  },
];

export function groundFor(mapId: string): Ground | undefined {
  return GROUNDS.find((ground) => ground.mapId === mapId);
}

/** "Sorrowgate, the drowned city · 1,500 m · nobody’s water — all four deny using it". */
export function groundLine(ground: Ground): string {
  return `${ground.name} · ${ground.depthM.toLocaleString('en-GB')} m · ${ground.whose}`;
}

/**
 * One mark per slot, on the ground its mission is played on.
 *
 * Twenty-nine slots stand on twenty grounds — five of them on the Rim — so
 * marks that share a ground are fanned in a small ring around it rather than
 * drawn on top of one another. The fan is deterministic in slot order, which
 * is the catalogue's order, so the same slot is always the same mark.
 */
export interface ChartMark {
  /** The slot's key, which is what the board's focus is held by. */
  slotKey: string;
  slot: BoardSlot;
  ground: Ground;
  /** The campaign's navy — its ink on the chart. `null` is the prologue. */
  faction: Faction | null;
  x: number;
  y: number;
}

/** Radius of the fan, in the plate's units. Wide enough that five marks read as five. */
const FAN_RADIUS = 44;

export function chartMarks(board: CampaignBoard): ChartMark[] {
  const slots: Array<{ slot: BoardSlot; faction: Faction | null }> = [
    { slot: board.prologue, faction: null },
    ...board.columns.flatMap((column) =>
      column.slots.map((slot) => ({ slot, faction: column.faction }))
    ),
  ];
  const byGround = new Map<string, number>();
  const counts = new Map<string, number>();
  const marks: ChartMark[] = [];
  for (const { slot } of slots) {
    if (slot.mapId !== undefined) counts.set(slot.mapId, (counts.get(slot.mapId) ?? 0) + 1);
  }
  for (const { slot, faction } of slots) {
    // An unbuilt slot has no map to stand on and is not drawn: the chart is
    // where the built campaign is, and a mark on a guessed ground would be
    // the chart asserting something the catalogue has not.
    if (slot.mapId === undefined) continue;
    const ground = groundFor(slot.mapId);
    if (ground === undefined) continue;
    const share = counts.get(slot.mapId) ?? 1;
    const index = byGround.get(slot.mapId) ?? 0;
    byGround.set(slot.mapId, index + 1);
    // One mark sits on the place; several sit around it, starting north so
    // the first is where a single one would be.
    const angle = -Math.PI / 2 + (index / share) * Math.PI * 2;
    const spread = share === 1 ? 0 : FAN_RADIUS;
    marks.push({
      slotKey: slot.key,
      slot,
      ground,
      faction,
      x: ground.x + Math.cos(angle) * spread,
      y: ground.y + Math.sin(angle) * spread,
    });
  }
  return marks;
}
