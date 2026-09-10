/**
 * The authored maps, against the doc that specifies them (#107).
 *
 * PF is the game's main lever — `CLAUDE.md`: "changing a biome's PF changes
 * which factions thrive there" — so a map *is* its PF landscape, and a map
 * whose middle quietly stopped being a masked one would change the game
 * without changing a single number in `constants.ts`.
 *
 * These tests are therefore written against the claims docs/maps.md makes
 * about each archetype, not against the rectangles that happen to implement
 * them. The three maps were chosen to span the PF range, so the sharpest test
 * is the one that checks they actually differ.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Biome,
  CONSTRUCTION,
  CRYSTAL,
  DEPTH,
  DEPTH_BANDS,
  DepthBand,
  Faction,
  MAP_HEADERS,
  PROPAGATION_FACTOR,
  ResourceKind,
  SIM,
  UnitKind,
  mapHeaderById,
  ambientBandsFor,
  faunaStatsFor,
  type FaunaSpecies,
} from '@echoes/shared';
import {
  ABYSSAL_RIFT_CORRIDOR,
  DEFAULT_MAP_ID,
  KELP_LABYRINTH,
  MAPS,
  MISSION_MAPS,
  VENTFRONT_DIVIDE,
  mapById,
  terrainFor,
} from '../src/sim/maps/index.ts';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import type { MapDefinition, MapRegion } from '../src/sim/maps/index.ts';

/** Step a match until it produces an Echo snapshot. */
function advanceToSnapshot(match: Match) {
  for (let i = 0; i < SIM.TICK_HZ; i++) {
    const snapshots = match.update(1000 / SIM.TICK_HZ);
    if (snapshots !== null) return snapshots;
  }
  throw new Error('no snapshot within a second');
}

/**
 * How far a site is from the straight run between two points.
 *
 * A hazard can clear both ends of a lane by a kilometre and still sit in the
 * middle of it, so "off the working lane" is a question about the segment.
 */
function distanceToSegment(
  site: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t =
    lengthSq === 0
      ? 0
      : Math.max(0, Math.min(1, ((site.x - a.x) * dx + (site.y - a.y) * dy) / lengthSq));
  return Math.hypot(site.x - (a.x + t * dx), site.y - (a.y + t * dy));
}

/** Mean PF over a rectangle, sampled on a grid. */
function meanPf(map: MapDefinition, x: number, y: number, w: number, h: number): number {
  const terrain = terrainFor(map);
  let total = 0;
  let n = 0;
  for (let sy = y; sy < y + h; sy += map.cellM) {
    for (let sx = x; sx < x + w; sx += map.cellM) {
      total += terrain.propagationAt(sx, sy);
      n++;
    }
  }
  return total / n;
}

/**
 * How many cells a region claims, painted alone onto an otherwise uniform
 * grid.
 *
 * Painted over a sentinel biome rather than onto bare open water, because the
 * Kelp Labyrinth authors an open-water region — the ring it cuts out of the
 * coral — and counting it against an open-water grid would count nothing.
 */
function cellsClaimed(map: MapDefinition, region: MapRegion): number {
  const sentinel = region.biome === Biome.OpenWater ? Biome.AbyssalTrench : Biome.OpenWater;
  const terrain = new Terrain(map.widthM, map.heightM, map.cellM);
  terrain.fillRect(0, 0, map.widthM, map.heightM, sentinel);
  terrain.fillRect(region.x, region.y, region.widthM, region.heightM, region.biome);
  let claimed = 0;
  for (let y = map.cellM / 2; y < map.heightM; y += map.cellM) {
    for (let x = map.cellM / 2; x < map.widthM; x += map.cellM) {
      if (terrain.biomeAt(x, y) === region.biome) claimed++;
    }
  }
  return claimed;
}

/**
 * Is this map the same map from every seat? `mirror` maps a cell to the one it
 * must match. Compared on biome *and* the water column, because a map that is
 * symmetric in PF and not in floors is still handing one player a shallower
 * approach than the other.
 */
function asymmetricCells(
  map: MapDefinition,
  mirror: (col: number, row: number, cols: number, rows: number) => [number, number]
): number {
  const grid = terrainFor(map).serialize();
  let bad = 0;
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const [mc, mr] = mirror(col, row, grid.cols, grid.rows);
      const here = row * grid.cols + col;
      const there = mr * grid.cols + mc;
      if (
        grid.biomes[here] !== grid.biomes[there] ||
        grid.floor[here] !== grid.floor[there] ||
        grid.ceiling[here] !== grid.ceiling[there]
      ) {
        bad++;
      }
    }
  }
  return bad;
}

/** Share of the whole map painted with a given biome. */
function share(map: MapDefinition, biome: Biome): number {
  const terrain = terrainFor(map);
  let hits = 0;
  let n = 0;
  for (let y = 0; y < map.heightM; y += map.cellM) {
    for (let x = 0; x < map.widthM; x += map.cellM) {
      if (terrain.biomeAt(x, y) === biome) hits++;
      n++;
    }
  }
  return hits / n;
}

describe('the map catalogue', () => {
  it('has a default that resolves', () => {
    assert.ok(mapById(DEFAULT_MAP_ID) !== undefined);
    assert.equal(mapById('no-such-map'), undefined);
  });

  it('gives every map a unique id and at least two spawns', () => {
    const ids = new Set(MAPS.map((m) => m.id));
    assert.equal(ids.size, MAPS.length);
    for (const map of MAPS) {
      assert.ok(map.spawns.length >= 2, `${map.id} needs at least two spawns`);
    }
  });

  it('keeps the shared headers honest — seats is the spawn list, one header per map', () => {
    // The shell lists maps from `MAP_HEADERS` before any room exists, so the
    // header is a *claim* about the authored map. `seats` is the one field
    // with independent ground truth — a map's spawn list is its player count
    // — and this is the assertion that keeps a header edit from quietly
    // promising a seat the map cannot spawn.
    assert.equal(MAP_HEADERS.length, MAPS.length);
    for (const map of MAPS) {
      const header = mapHeaderById(map.id);
      assert.ok(header !== undefined, `${map.id} missing from MAP_HEADERS`);
      assert.equal(header.seats, map.spawns.length, `${map.id}: header seats vs spawns`);
    }
  });

  it('keeps every authored point inside its own map', () => {
    // A spawn or field off the edge would clamp silently into the border cell
    // rather than fail, which is the kind of thing nobody notices until a
    // harvester walks into a wall.
    for (const map of MAPS) {
      const inside = (x: number, y: number, what: string) => {
        assert.ok(x >= 0 && x <= map.widthM, `${map.id}: ${what} x=${x} outside`);
        assert.ok(y >= 0 && y <= map.heightM, `${map.id}: ${what} y=${y} outside`);
      };
      for (const spawn of map.spawns) inside(spawn.x, spawn.y, 'spawn');
      for (const node of map.resources) inside(node.x, node.y, 'resource');
      for (const bloom of map.blooms ?? []) inside(bloom.x, bloom.y, 'bloom');
      for (const site of map.hazards) inside(site.x, site.y, 'hazard');
      for (const region of map.regions) {
        assert.ok(region.widthM > 0 && region.heightM > 0, `${map.id}: empty region`);
      }
    }
  });

  it('authors every bloom-share node on surface plateau ground', () => {
    // The balance guard-rail is positional, not numerical: "Bloom-share
    // economy requires *surface plateau* nodes; their income is on contested
    // ground by design" (docs/systems-echo.md §10). A bloom over Mid-Water
    // would hand the quietest faction a defensible economy and delete the
    // faction's whole counter-play, so the Shelf line is asserted here where
    // the author is looking. Mission maps are held to it too — Tend's
    // gardens sit at 250 m for exactly this reason.
    for (const map of [...MAPS, ...MISSION_MAPS]) {
      const terrain = terrainFor(map);
      for (const bloom of map.blooms ?? []) {
        const floor = terrain.floorAt(bloom.x, bloom.y);
        assert.ok(
          floor <= DEPTH_BANDS[DepthBand.Shelf].max,
          `${map.id}: bloom at ${bloom.x},${bloom.y} sits over ${floor} m ground, ` +
            `below the ${DEPTH_BANDS[DepthBand.Shelf].max} m Shelf line`
        );
      }
    }
  });

  it('gives at least one skirmish map a bloom garden', () => {
    // The catalogue's own obligation, and the one this suite could not have
    // caught before there was one to catch: bloom-share is the Commune's whole
    // economy, and until #573 no map in `MAPS` authored a node — so in every
    // skirmish and every balance-harness match the system early-returned and
    // one navy had no economy of its own (docs/maps.md, "Where a bloom garden
    // goes").
    const withGardens = MAPS.filter((map) => (map.blooms ?? []).length > 0);
    assert.ok(
      withGardens.length > 0,
      'no skirmish map authors a bloom node, so the Commune cannot earn on any of them'
    );
  });

  it('sites every garden where more than one seat can reach it', () => {
    // The other half of the guard-rail, and the half a depth check cannot see:
    // a garden inside a base apron is not contested ground however shallow it
    // is (docs/maps.md, "Where a bloom garden goes"). "Shared" is stated as
    // the thing that can be measured — the two nearest seats are the same
    // distance away — which is what makes the income something a pair fights
    // over rather than something one of them collects.
    for (const map of MAPS) {
      for (const bloom of map.blooms ?? []) {
        const ranges = map.spawns
          .map((spawn) => Math.hypot(spawn.x - bloom.x, spawn.y - bloom.y))
          .sort((a, b) => a - b);
        assert.ok(ranges.length >= 2, `${map.id}: a garden needs two seats to be contested`);
        assert.ok(
          Math.abs(ranges[0]! - ranges[1]!) < 1,
          `${map.id}: the garden at ${bloom.x},${bloom.y} is ${ranges[0]!.toFixed(0)} m from ` +
            `one seat and ${ranges[1]!.toFixed(0)} m from the next — it belongs to somebody`
        );
        // And not so close to that pair that it is an apron by another name:
        // further out than the home field each of them opens on.
        const homeField = Math.min(
          ...map.resources.map((node) => Math.hypot(node.x - bloom.x, node.y - bloom.y))
        );
        assert.ok(
          ranges[0]! > homeField * 0.5,
          `${map.id}: the garden is closer to a spawn than the map's own fields are to it`
        );
      }
    }
  });

  it('never starts a player in an Abyssal Trench', () => {
    // The Kelp Labyrinth's first draft put its corner pressure pockets exactly
    // on its corner spawns, starting two players in the deepest and loudest
    // biome on the map. Cheap to write down, and it stays true for every map
    // added later.
    for (const map of MAPS) {
      const terrain = terrainFor(map);
      for (const [slot, spawn] of map.spawns.entries()) {
        assert.notEqual(
          terrain.biomeAt(spawn.x, spawn.y),
          Biome.AbyssalTrench,
          `${map.id}: slot ${slot} starts in a trench`
        );
      }
    }
  });

  it('keeps spawns far enough apart to start out of earshot', () => {
    // Two bases within hearing of each other is not an opening, it is a fight
    // — and the Echo Layer would resolve both sides at tick zero.
    for (const map of MAPS) {
      for (let a = 0; a < map.spawns.length; a++) {
        for (let b = a + 1; b < map.spawns.length; b++) {
          const first = map.spawns[a]!;
          const second = map.spawns[b]!;
          const d = Math.hypot(first.x - second.x, first.y - second.y);
          assert.ok(d > 3000, `${map.id}: spawns ${a} and ${b} are only ${d.toFixed(0)} m apart`);
        }
      }
    }
  });

  it('gives every map a crystal field, since the tech tier depends on one', () => {
    for (const map of MAPS) {
      const crystal = map.resources.filter((r) => r.kind === ResourceKind.ResonanceCrystal);
      assert.equal(crystal.length, 1, `${map.id} should have exactly one crystal field`);
    }
  });

  it('re-homes an ambient species only to a band the bestiary documents for it', () => {
    // docs/bestiary.md §4: a map may re-home the Tetherjelly to its Kelp
    // Forest band, and to nothing else. The public catalogue names no band
    // today — every skirmish map's kelp is deeper than the duct — and the
    // mission maps are held to the same rule in missions.test.ts.
    for (const map of [...MAPS, ...MISSION_MAPS]) {
      for (const [key, band] of Object.entries(map.ambientBands ?? {})) {
        const species = Number(key) as FaunaSpecies;
        assert.ok(
          ambientBandsFor(species).some(
            (documented) =>
              documented.workingDepthM === band.workingDepthM &&
              documented.seedSpreadM === band.seedSpreadM
          ),
          `${map.id} re-homes ${faunaStatsFor(species).name} to a band §4 does not document`
        );
      }
    }
  });

  it('gives every map at least one field per spawn', () => {
    for (const map of MAPS) {
      const nodules = map.resources.filter((r) => r.kind === ResourceKind.Nodule);
      assert.ok(
        nodules.length >= map.spawns.length,
        `${map.id}: ${nodules.length} fields for ${map.spawns.length} spawns`
      );
    }
  });
});

describe('every map is authored on its own cell grid', () => {
  // A cell belongs to the region whose rectangle contains its **centre**
  // (#157, docs/maps.md "How a map is written"). Two things follow, and both
  // are worth holding the maps to rather than trusting an author to remember.
  //
  // Mission maps are in scope here: this is a rule about authoring, not about
  // balance, and Sorrowgate's service lock is the narrowest rectangle anybody
  // has written.
  for (const map of [...MAPS, ...MISSION_MAPS]) {
    it(`${map.name} states every region in whole cells`, () => {
      // A rectangle on cell boundaries paints exactly the metres it reads, so
      // the map file and the map agree by construction. One that is not is
      // asking for water the grid cannot hold: it gets the whole cells whose
      // centres fall inside it, which is a quieter map than the one the file
      // describes and a difference nobody sees until PF is measured.
      for (const region of map.regions) {
        const what = region.note ?? `${region.x},${region.y}`;
        for (const [field, value] of [
          ['x', region.x],
          ['y', region.y],
          ['widthM', region.widthM],
          ['heightM', region.heightM],
        ] as const) {
          assert.equal(
            value % map.cellM,
            0,
            `${map.name}: region "${what}" has ${field}=${value}, which is not a whole ` +
              `${map.cellM} m cell — it will not paint the metres it reads`
          );
        }
      }
    });

    it(`${map.name} paints every region it authors`, () => {
      // The hazard the centre rule introduces, and the reason it is checked
      // rather than commented: a rectangle thinner than a cell can fall
      // between two centres and paint *nothing at all*, silently. A region
      // that was authored and then vanished is worse than a mis-sized one,
      // because the map still reads as though the ground is there.
      for (const region of map.regions) {
        assert.ok(
          cellsClaimed(map, region) > 0,
          `${map.name}: the region at ${region.x},${region.y} (${region.widthM}x` +
            `${region.heightM} m) claims no cell — it falls between cell centres`
        );
      }
    });
  }
});

describe('Ventfront Divide', () => {
  it('is the same map from all four corners', () => {
    // Four spawns, symmetric across both axes (the map's own comment), so any
    // cell that disagrees with its mirror is an advantage handed to one seat.
    //
    // It was not true until #157. The west plateaus reached a column east that
    // the east plateaus could not reach west, because the map edge clipped the
    // very column the touch rule was adding — 250 m of extra kelp cover, on
    // two of the four bases, invisible in a map file that says 2000 either
    // side.
    assert.equal(
      asymmetricCells(VENTFRONT_DIVIDE, (col, row, cols) => [cols - 1 - col, row]),
      0,
      'the east and west halves differ'
    );
    assert.equal(
      asymmetricCells(VENTFRONT_DIVIDE, (col, row, _cols, rows) => [col, rows - 1 - row]),
      0,
      'the north and south halves differ'
    );
  });

  it('masks its middle and carries sound on its flanks', () => {
    // "Center: Thermal Veins" (PF 0.45) with "North/South: Abyssal Trenches"
    // (PF 1.6). The map's whole proposition is that the contested ground is
    // the quiet ground and the fast routes are the loud ones.
    const middle = meanPf(VENTFRONT_DIVIDE, 3000, 3400, 2000, 1200);
    const north = meanPf(VENTFRONT_DIVIDE, 3000, 0, 2000, 800);

    assert.ok(middle < PROPAGATION_FACTOR[Biome.OpenWater], `middle PF ${middle} should mask`);
    assert.ok(north > PROPAGATION_FACTOR[Biome.OpenWater], `flank PF ${north} should carry`);
    assert.ok(north > middle * 2, 'the flanks must be dramatically louder than the middle');
  });

  it('puts its contested fields inside the masked band', () => {
    const terrain = terrainFor(VENTFRONT_DIVIDE);
    const contested = VENTFRONT_DIVIDE.resources.filter(
      (r) => r.kind === ResourceKind.Nodule && (r.amount ?? 0) > 5000
    );
    assert.ok(contested.length >= 2);
    for (const node of contested) {
      assert.equal(
        terrain.biomeAt(node.x, node.y),
        Biome.ThermalVein,
        'the expansion bait belongs in the vents'
      );
    }
  });

  it('gives every base a bed a bio-reactor can stand in', () => {
    // docs/maps.md, "Where an ordinary bed goes". The archetype has called its
    // aprons Kelp Forest since it was written and had no kelp field in them,
    // which was invisible until the flora economy needed one: a reactor seats
    // at CONSTRUCTION.WORKING_DEPTH_M, the two gardens are Shelf-band and
    // refuse a building by construction, and so the map offered no legal
    // reactor site at all (#535, #547). What is pinned is the property that
    // was missing, not the rectangles that supply it.
    const terrain = terrainFor(VENTFRONT_DIVIDE);
    const beds = VENTFRONT_DIVIDE.hazards.filter((h) => h.kind === 'kelp-entanglement');
    assert.equal(beds.length, VENTFRONT_DIVIDE.spawns.length, 'one bed per seat');
    for (const bed of beds) {
      assert.equal(terrain.biomeAt(bed.x, bed.y), Biome.KelpForest, 'a bed is kelp');
      assert.ok(
        terrain.floorAt(bed.x, bed.y) >= CONSTRUCTION.WORKING_DEPTH_M,
        `a bed at ${bed.x},${bed.y} sits on ${terrain.floorAt(bed.x, bed.y)} m and holds nothing`
      );
    }
  });

  it('keeps its beds off the run every harvester makes', () => {
    // Kelp grips unequally — the Knights snag at 0.5 where the Commune swim
    // at 1.0 (docs/hazards.md §4) — so a bed over the haul from a home nodule
    // field to its Bastion would be a movement tax three navies pay for the
    // shape of their hulls and the fourth does not. Measured against the lane
    // itself rather than against its ends: a field can clear both and still
    // sit across the middle.
    const beds = VENTFRONT_DIVIDE.hazards.filter((h) => h.kind === 'kelp-entanglement');
    const home = VENTFRONT_DIVIDE.resources.filter(
      (r) => r.kind === ResourceKind.Nodule && (r.amount ?? 0) <= 5000
    );
    assert.equal(home.length, VENTFRONT_DIVIDE.spawns.length, 'a home field per seat');
    for (const bed of beds) {
      for (const field of home) {
        for (const spawn of VENTFRONT_DIVIDE.spawns) {
          const gap = distanceToSegment(bed, field, spawn) - bed.radiusM;
          assert.ok(gap > 0, `a bed at ${bed.x},${bed.y} lies across a haul by ${-gap} m`);
        }
      }
    }
  });

  it('mirrors its beds like everything else on it', () => {
    // The gardens' rule for the gardens' reason: a bed a column out of place
    // is an advantage handed to a seat. Asserted on the sites rather than on
    // the terrain grid, because a hazard paints no cells and so is invisible
    // to the cell-by-cell symmetry test above.
    const beds = VENTFRONT_DIVIDE.hazards.filter((h) => h.kind === 'kelp-entanglement');
    const key = (x: number, y: number, r: number): string => `${x},${y},${r}`;
    const sites = new Set(beds.map((bed) => key(bed.x, bed.y, bed.radiusM)));
    for (const bed of beds) {
      const w = VENTFRONT_DIVIDE.widthM;
      const h = VENTFRONT_DIVIDE.heightM;
      assert.ok(sites.has(key(w - bed.x, bed.y, bed.radiusM)), 'no bed across the east-west axis');
      assert.ok(
        sites.has(key(bed.x, h - bed.y, bed.radiusM)),
        'no bed across the north-south axis'
      );
    }
  });
});

describe('Ventfront Divide — the crystal field has its own water', () => {
  it('keeps the vents off the crystal and on the fields they are for', () => {
    // Map *data*, asserted deliberately rather than as trivia, because the
    // gameplay consequence was hidden once already and should not be again.
    //
    // It used to be the opposite assertion. The two contested nodule fields
    // sat 500 m either side of the crystal with a 700 m eruption on each, so
    // both plumes reached the crystal and a hull working it took a *double*
    // pass — 175 HP at the current DAMAGE_PER_S, a figure #179 solved so that
    // one pass "wounds badly and leaves the trip possible".
    //
    // It leaves a *crossing* possible. What #491 measured is that nobody ever
    // makes only the crossing: the field is at 2,400 m, which is PR-3 water,
    // and the round trip costs a PR-2 hull 238 HP of unhealable crush before
    // the vent fires at all. 238 + 175 against 300, and 238 + 262 for the
    // Commune's organic hulls, is a resource that gates the tech tree and
    // cannot be worked by any navy that has to pay to get to it.
    //
    // So each vent moved out 300 m *with its field*. The plumes keep their
    // reach and keep the fields they were authored to make dangerous — each
    // still sits at a plume centre, where the falloff is 1.0 and a pass is
    // lethal — and the crystal keeps water of its own. Both halves are
    // asserted here, because fixing one by breaking the other is the obvious
    // wrong move: pulling the vents off the crystal by shrinking them, or by
    // leaving the fields behind, would buy the crystal its water at the price
    // of the thing that made the middle of this map worth arguing over.
    //
    // If either a field or a vent moves, this test fails, and whoever moved it
    // should check `hazards.test.ts`'s "leaves the Ventfront crystal field
    // workable" alongside it — that one asserts the consequence this one only
    // records the cause of.
    const map = VENTFRONT_DIVIDE;
    const field = map.resources.find((r) => r.kind === ResourceKind.ResonanceCrystal);
    assert.ok(field !== undefined, 'the map should seed a crystal field');

    const vents = map.hazards.filter((h) => h.kind === 'geothermal-eruption');
    assert.equal(vents.length, 2, 'the vent band is two eruptions');

    const reaching = vents.filter((h) => Math.hypot(h.x - field.x, h.y - field.y) <= h.radiusM);
    assert.equal(
      reaching.length,
      0,
      'no vent may reach the crystal — see the note above if this changed'
    );

    // And the other half: every vent still has a contested field at its centre.
    for (const vent of vents) {
      const covered = map.resources.filter(
        (r) => r.kind === ResourceKind.Nodule && Math.hypot(r.x - vent.x, r.y - vent.y) < 1
      );
      assert.equal(
        covered.length,
        1,
        `the vent at ${vent.x},${vent.y} exists to make a field dangerous, and needs one on it`
      );
    }
  });
});

describe('Abyssal Rift Corridor', () => {
  it('is the same map from either end', () => {
    // Not a mirror: this map's vents sit north-west and south-east, so the
    // symmetry that makes it a fair 1v1 is a half turn — each player sees the
    // same layout from their own end. The south vent band and the north coral
    // one each carried a column their opposite number did not until #157,
    // because a rectangle ending exactly on a cell boundary used to claim the
    // cell on the far side of it.
    assert.equal(
      asymmetricCells(ABYSSAL_RIFT_CORRIDOR, (col, row, cols, rows) => [
        cols - 1 - col,
        rows - 1 - row,
      ]),
      0,
      'the two halves of the corridor differ under a half turn'
    );
  });

  it('is long and narrow rather than square', () => {
    // "central trench corridor (long, narrow, deep)" — a square map cannot
    // express that, which is why map dimensions are authored per map.
    assert.ok(
      ABYSSAL_RIFT_CORRIDOR.widthM > ABYSSAL_RIFT_CORRIDOR.heightM * 1.5,
      'the corridor needs a long axis'
    );
  });

  it('carries sound the entire length of the rift', () => {
    const terrain = terrainFor(ABYSSAL_RIFT_CORRIDOR);
    const y = ABYSSAL_RIFT_CORRIDOR.heightM / 2;
    // Sampled end to end rather than at the middle: "no secrets" is a claim
    // about the whole corridor, and a trench with a gap in it is a different
    // map from the one the doc describes.
    // Sampled across the rift itself rather than the base aprons at either
    // end — "no secrets" is a claim about the corridor, and a trench with a
    // gap in it is a different map from the one the doc describes.
    const alongAxis = terrain.pathPropagation(2000, y, ABYSSAL_RIFT_CORRIDOR.widthM - 2000, y);
    assert.ok(alongAxis > 1.2, `PF along the rift was ${alongAxis}, expected a highway`);
  });

  it('is louder down its axis than the Ventfront middle is', () => {
    // The reason both maps exist: the same army is a different army on each.
    const rift = meanPf(ABYSSAL_RIFT_CORRIDOR, 2000, 2400, 4000, 1200);
    const vents = meanPf(VENTFRONT_DIVIDE, 3000, 3400, 2000, 1200);
    assert.ok(rift > vents * 2.5, `rift ${rift} vs vents ${vents}`);
  });

  it('has only two spawns, and they face down the long axis', () => {
    assert.equal(ABYSSAL_RIFT_CORRIDOR.spawns.length, 2);
    const [west, east] = ABYSSAL_RIFT_CORRIDOR.spawns;
    assert.ok(west!.x < east!.x);
    assert.equal(west!.y, east!.y, 'a 1v1 corridor should be symmetric across its long axis');
  });
});

describe('Kelp Labyrinth', () => {
  it('is the same chair from all four corners', () => {
    // KELP_LABYRINTH_HEADER declares four seats. Until #626 the map authored
    // its corner pressure pockets, both bio-reactor beds and two of its three
    // outer cold-shock sites on the NW-SE diagonal alone, so two of those four
    // chairs played a measurably different map: the nearest bed at 4,465 m
    // against 3,536 m, the nearest cold shock at 4,384 m against 1,697 m, the
    // nearest pocket at 5,124 m against 1,732 m, and — because a pocket is
    // PF 1.6 and sits on the run — a crystal approach at 0.9139 against
    // 1.1222. The beds are the sharp one: this map authors no `blooms`, so
    // they are its only legal bio-reactor ground, and `reactorSite` picks
    // between them by distance from home.
    //
    // Asserted as a *spread across the seats* rather than as those numbers, so
    // it keeps holding whatever this map is authored to be next. The Ventfront
    // and the Rift Corridor assert cell-perfect symmetry instead; this map
    // cannot yet, because its MAZE array is asymmetric block for block and
    // straightening it is a redesign of its own (#631). What this holds is the
    // half that decides a match rather than the half that decides a corridor.
    const t = terrainFor(KELP_LABYRINTH);
    const nearest = (x: number, y: number, to: ReadonlyArray<{ x: number; y: number }>) =>
      Math.min(...to.map((p) => Math.hypot(x - p.x, y - p.y)));

    const beds = KELP_LABYRINTH.hazards.filter((h) => h.kind === 'kelp-entanglement');
    const cold = KELP_LABYRINTH.hazards.filter((h) => h.kind === 'cold-shock');
    const deep = KELP_LABYRINTH.regions
      .filter((r) => r.biome === Biome.AbyssalTrench)
      .map((r) => ({ x: r.x + r.widthM / 2, y: r.y + r.heightM / 2 }));
    const home = KELP_LABYRINTH.resources.filter(
      (r) => r.kind === ResourceKind.Nodule && r.amount === undefined
    );

    const seats = KELP_LABYRINTH.spawns.map((s) => ({
      'nearest bio-reactor bed': nearest(s.x, s.y, beds),
      'nearest cold shock': nearest(s.x, s.y, cold),
      'nearest pressure pocket': nearest(s.x, s.y, deep),
      'nearest home field': nearest(s.x, s.y, home),
      'PF to the crystal': t.pathPropagation(
        s.x,
        s.y,
        KELP_LABYRINTH.widthM / 2,
        KELP_LABYRINTH.heightM / 2
      ),
    }));

    for (const metric of Object.keys(seats[0]!) as Array<keyof (typeof seats)[number]>) {
      const values = seats.map((seat) => seat[metric]);
      assert.ok(
        Math.max(...values) - Math.min(...values) < 1e-9,
        `the four seats disagree on ${metric}: ${values.map((v) => v.toFixed(4)).join(' / ')}`
      );
    }
  });

  it('does not drift further out of symmetry than its maze already is', () => {
    // A ratchet, not the answer. #631 decides whether this map wants
    // cell-perfect symmetry like the other two archetypes, or whether a maze
    // is allowed to be a maze and this becomes a documented property. Until
    // then the only wrong direction is up: every one of these cells is a
    // MAZE block's, and the seat-fairness test above is what stops that
    // mattering to a player.
    const worst = { ew: 56, ns: 64, half: 80 };
    assert.ok(
      asymmetricCells(KELP_LABYRINTH, (col, row, cols) => [cols - 1 - col, row]) <= worst.ew,
      'the east and west halves drifted further apart'
    );
    assert.ok(
      asymmetricCells(KELP_LABYRINTH, (col, row, _cols, rows) => [col, rows - 1 - row]) <= worst.ns,
      'the north and south halves drifted further apart'
    );
    assert.ok(
      asymmetricCells(KELP_LABYRINTH, (col, row, cols, rows) => [cols - 1 - col, rows - 1 - row]) <=
        worst.half,
      'the two diagonals drifted further apart'
    );
  });

  it('is mostly kelp and coral rather than open water', () => {
    // "A dense maze of kelp forests" with a coral outer ring. If open water
    // dominates, the maze is not a maze.
    const kelp = share(KELP_LABYRINTH, Biome.KelpForest);
    const coral = share(KELP_LABYRINTH, Biome.CoralRuins);
    assert.ok(kelp > 0.12, `kelp covers ${(kelp * 100).toFixed(0)}%, expected a dense maze`);
    assert.ok(coral > 0.2, `coral ring covers ${(coral * 100).toFixed(0)}%`);
  });

  it('is quieter across its middle than the other two maps', () => {
    const kelpMid = meanPf(KELP_LABYRINTH, 2000, 2000, 4000, 4000);
    const ventMid = meanPf(VENTFRONT_DIVIDE, 2000, 2000, 4000, 4000);
    const riftMid = meanPf(ABYSSAL_RIFT_CORRIDOR, 2000, 1500, 4000, 3000);
    assert.ok(kelpMid < riftMid, 'the labyrinth must be quieter than the rift');
    assert.ok(kelpMid < 1, `labyrinth mid PF ${kelpMid} should be below open water`);
    assert.ok(ventMid < riftMid);
  });

  it('spans the PF range across the three maps', () => {
    // The point of shipping three: one masked, one loud, one broken. If two
    // of them land on the same PF landscape, the third is doing no work.
    const values = [
      meanPf(KELP_LABYRINTH, 2000, 2000, 4000, 4000),
      meanPf(VENTFRONT_DIVIDE, 3000, 3400, 2000, 1200),
      meanPf(ABYSSAL_RIFT_CORRIDOR, 2000, 2400, 4000, 1200),
    ].sort((a, b) => a - b);
    assert.ok(values[2]! / values[0]! > 2, `PF range ${values[0]}..${values[2]} is too narrow`);
  });
});

describe('a match on an authored map', () => {
  it('spawns each player at an authored spawn, not at a computed corner', () => {
    for (const map of MAPS) {
      const match = new Match(map, { fauna: false, seed: 3 });
      const factions = [Faction.Bathyarch, Faction.Pelagia, Faction.Directorate, Faction.Hadron];
      for (let slot = 0; slot < map.spawns.length; slot++) {
        match.addPlayer(slot, factions[slot]!);
      }

      // Again from the snapshot, for the same process-global-id reason.
      const snapshots = advanceToSnapshot(match);
      for (let slot = 0; slot < map.spawns.length; slot++) {
        const spawn = map.spawns[slot]!;
        const found = snapshots
          .get(slot)!
          .structures.some((s) => Math.hypot(s.x - spawn.x, s.y - spawn.y) < 1);
        assert.ok(found, `${map.id}: slot ${slot} has no structure on its spawn`);
      }
    }
  });

  it('runs without a unit leaving the map', () => {
    // The corridor map is the one that would catch a leftover assumption
    // about square maps: its height is 6 km against a width of 10 km.
    //
    // Read from the snapshots rather than by scanning the component arrays.
    // bitecs entity ids are process-global, so a scan of `Position` sees every
    // entity every *other* test in this process created, on their own maps —
    // the same trap that broke the state hash and replays before it.
    const match = new Match(ABYSSAL_RIFT_CORRIDOR, { fauna: false, seed: 9 });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);

    let checked = 0;
    for (let i = 0; i < SIM.TICK_HZ * 10; i++) {
      const snapshots = match.update(1000 / SIM.TICK_HZ);
      if (snapshots === null) continue;
      for (const snapshot of snapshots.values()) {
        for (const thing of [...snapshot.units, ...snapshot.structures]) {
          checked++;
          assert.ok(
            thing.x >= 0 && thing.x <= ABYSSAL_RIFT_CORRIDOR.widthM,
            `${thing.id} at x=${thing.x} left the map`
          );
          assert.ok(
            thing.y >= 0 && thing.y <= ABYSSAL_RIFT_CORRIDOR.heightM,
            `${thing.id} at y=${thing.y} left the map`
          );
        }
      }
    }
    assert.ok(checked > 0, 'nothing was actually checked');
  });

  it('gives a harvester a field to work on every map', () => {
    for (const map of MAPS) {
      const match = new Match(map, { fauna: false, seed: 4 });
      match.addPlayer(0, Faction.Bathyarch);
      for (let i = 0; i < SIM.TICK_HZ * 3; i++) match.update(1000 / SIM.TICK_HZ);
      const snapshot = match.update(1000 / SIM.TICK_HZ);
      if (snapshot === null) continue;
      const harvester = snapshot.get(0)!.units.find((u) => u.kind === UnitKind.Harvester);
      assert.ok(harvester !== undefined, `${map.id}: no harvester`);
    }
  });
});

describe('every map has water where it seats things', () => {
  // Structures, resource fields and spawns are placed at fixed depths and
  // cannot rise. Hulls can — terrain lifts them (docs/systems-depth.md §2) —
  // so a shallow floor is a cost to a fleet and a fatal authoring error to a
  // refinery. These invariants are the difference between the two.
  //
  // world.ts seats structures at 600 m and nodule fields at 600 m; crystal
  // fields sit at CRYSTAL.FIELD_DEPTH_M. None of them consult the seabed, so
  // nothing but this test stands between a map and a Bastion inside a plateau.
  const STRUCTURE_DEPTH_M = CONSTRUCTION.WORKING_DEPTH_M;
  const NODULE_DEPTH_M = CONSTRUCTION.WORKING_DEPTH_M;

  /**
   * docs/maps.md, "How a map is written": a spawn and its Foundry stand on
   * ground the map paints.
   *
   * Containment in *some* authored rectangle, and deliberately not "a floor
   * different from the map's own". A region setting neither floor nor ceiling
   * still satisfies this — the doc sanctions a base on the base seabed inside
   * an authored region — and strengthening the predicate to the floor flags
   * fourteen legitimate placements across kelp-labyrinth, sorrowgate,
   * holding-board and the-first.
   *
   * This is the invariant that was missing while the Ventfront seated all
   * eight of its placements in an unpainted 250 m gutter (#622). Neither of
   * the assertions below could see it. The water there was 2,600 m, which is
   * comfortably deep enough for a 600 m structure, so the depth test passed;
   * and the fault was identical on all four seats, so the cell-by-cell
   * symmetry count read zero. Written over every map, catalogue and mission
   * alike, because a test scoped to the one instance somebody had in mind is
   * how the next one gets in — and this was the third time this exact shape of
   * fault reached the tree.
   */
  it('paints the ground under every base it seats, on every map', () => {
    const paints = (map: MapDefinition, x: number, y: number) =>
      map.regions.some((r) => x >= r.x && x < r.x + r.widthM && y >= r.y && y < r.y + r.heightM);

    const unpainted: string[] = [];
    for (const map of [...MAPS, ...MISSION_MAPS]) {
      for (const spawn of map.spawns) {
        if (!paints(map, spawn.x, spawn.y)) {
          unpainted.push(`${map.id}: a Bastion at ${spawn.x},${spawn.y}`);
        }
        const fx = spawn.x + spawn.foundryOffsetX;
        const fy = spawn.y + spawn.foundryOffsetY;
        if (!paints(map, fx, fy)) unpainted.push(`${map.id}: a Foundry at ${fx},${fy}`);
      }
    }

    assert.deepEqual(
      unpainted,
      [],
      `these stand on ground no region paints:\n  ${unpainted.join('\n  ')}`
    );
  });

  for (const map of MAPS) {
    describe(map.name, () => {
      it('seats every spawn and its Foundry over deep enough water', () => {
        const terrain = terrainFor(map);
        for (const spawn of map.spawns) {
          assert.ok(
            terrain.admits(spawn.x, spawn.y, STRUCTURE_DEPTH_M),
            `${map.name}: a Bastion at ${spawn.x},${spawn.y} does not fit — floor is ` +
              `${terrain.floorAt(spawn.x, spawn.y)}m, ceiling ${terrain.ceilingAt(spawn.x, spawn.y)}m`
          );
          const fx = spawn.x + spawn.foundryOffsetX;
          const fy = spawn.y + spawn.foundryOffsetY;
          assert.ok(
            terrain.admits(fx, fy, STRUCTURE_DEPTH_M),
            `${map.name}: the Foundry at ${fx},${fy} does not fit — floor is ${terrain.floorAt(fx, fy)}m`
          );
        }
      });

      it('seats every resource field over water deep enough to work it', () => {
        const terrain = terrainFor(map);
        for (const node of map.resources) {
          const depth =
            node.kind === ResourceKind.ResonanceCrystal ? CRYSTAL.FIELD_DEPTH_M : NODULE_DEPTH_M;
          assert.ok(
            terrain.admits(node.x, node.y, depth),
            `${map.name}: a ${node.kind} field at ${node.x},${node.y} works at ${depth}m, ` +
              `but the floor there is ${terrain.floorAt(node.x, node.y)}m`
          );
        }
      });

      it('authors no ground the ruleset cannot describe', () => {
        for (const region of map.regions) {
          if (region.floorM !== undefined) {
            assert.ok(
              region.floorM > 0 && region.floorM <= DEPTH.MAX_M,
              `${map.name}: a floor of ${region.floorM}m is outside the orderable range`
            );
          }
          // A ceiling deeper than its floor is solid ground. Legal, but no map
          // authors one yet, and doing it by accident would silently wall off a
          // region nobody meant to close.
          if (region.ceilingM !== undefined) {
            assert.ok(
              region.ceilingM < (region.floorM ?? map.floorM ?? DEPTH.MAX_M),
              `${map.name}: a ceiling of ${region.ceilingM}m is at or below its own floor, ` +
                `which is solid rock — say so in a note if it is deliberate`
            );
          }
        }
      });

      it('never makes a dive the only way across', () => {
        // The AI has no depth command at all: its vocabulary is attack, build,
        // harvest, move, ping, produce, silent and throttle. A roofed passage
        // is therefore a route only a human can take, so no map may depend on
        // one — the balance harness seats an AI in every slot and would report
        // matches that never make contact.
        const terrain = terrainFor(map);
        for (const spawn of map.spawns) {
          for (const other of map.spawns) {
            if (other === spawn) continue;
            const steps = 200;
            let blocked = 0;
            for (let i = 0; i <= steps; i++) {
              const t = i / steps;
              const x = spawn.x + (other.x - spawn.x) * t;
              const y = spawn.y + (other.y - spawn.y) * t;
              // A hull rises to fit, so the question is never "is this deep
              // enough" — it is "is there any water here at all".
              if (terrain.ceilingAt(x, y) > terrain.floorAt(x, y)) blocked++;
            }
            assert.equal(
              blocked,
              0,
              `${map.name}: the straight line from ${spawn.x},${spawn.y} to ` +
                `${other.x},${other.y} crosses ${blocked} samples of solid ground, and ` +
                `nothing in the simulation can path around it`
            );
          }
        }
      });
    });
  }
});
