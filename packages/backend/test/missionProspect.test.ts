/**
 * The Ledger 6 — docs/mission-prospect.md, against a live match.
 *
 * - **The refit is bought, and it is a mission fact** (§2): every expedition
 *   hull spawns at PR-3 while the roster's own ratings stand unchanged.
 * - **Nobody on the rim is armed** (§5): four navies, weapons-cold, and the
 *   convergence mechanically incapable of the war everyone is early for.
 * - **The survey is soundings at the trade standard** (§6): six faces, two
 *   calibrated readers, three per bank, at the figures both campaign
 *   documents quote.
 * - **An idle expedition returns short** — the twenty-two-minute run closes
 *   Partial: the column never left the staging, so the ascent reads met and
 *   the field does not, with the ledger's unheard line and both attendant
 *   gaps assembled beneath it.
 * - **The ascent is read where the hulls are** (§8): a survey that reads four
 *   faces and stays on the rim is the rim's, and three hulls in the staging
 *   are the column off it, whichever of the four read the faces (#1210).
 *
 * And the ground §11 draws in shapes since #1146, for all five missions on
 * it: every authored point, leg and mission-region cell on the ground it
 * stood on in rectangles, read off the painted cells.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Biome,
  MissionOutcome,
  ObjectiveStatus,
  SIM,
  STRUCTURE_AURAS,
  StructureKind,
  THERMOCLINE,
  UnitKind,
  statsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { defineQuery, hasComponent } from 'bitecs';
import { Owner, Pressure, Unit, Weapon } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { Pathfinder } from '../src/sim/pathfinding.ts';
import { MOUTH_RIM, missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import {
  ATTENDING_FIRST_ARRIVAL,
  CHORD_RIM_DEPOSITS,
  CHORD_SECOND_CHORD,
  LEDGER_PROSPECT,
  SEEDING_SECOND_SEEDING,
  inRegion,
  type MissionDefinition,
} from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

const hulls = defineQuery([Unit, Owner]);

describe('the writ, run out — docs/mission-prospect.md §2, §5, §6, §8', () => {
  it('reads the survey and its certificates off one idle descent', () => {
    const map = missionMapById(LEDGER_PROSPECT.mapId)!;
    const match = new Match(map, { mission: LEDGER_PROSPECT, fauna: false, seed: 61 });

    // §2 — the refit: every player hull at PR-3, bought, while the roster's
    // own Cruiser stays a PR-2 hull for everybody else.
    let armedAnywhere = 0;
    for (const eid of hulls(match.world)) {
      if (hasComponent(match.world, Weapon, eid)) armedAnywhere++;
      if (Owner.slot[eid] !== LEDGER_PROSPECT.playerSlot) continue;
      assert.equal(Pressure.rating[eid], 3, 'an expedition hull sailed without its certificate');
    }
    assert.equal(statsFor(UnitKind.Cruiser).pressureRating, 2, 'the refit leaked into the roster');
    // §5 — four navies, one rim, and nothing armed on any of them.
    assert.equal(armedAnywhere, 0, 'something on the rim is carrying a weapon');

    // §6 — six faces at the trade standard, three per calibrated reader.
    const soundings = LEDGER_PROSPECT.soundings ?? [];
    assert.equal(soundings.length, 6);
    for (const sounding of soundings) {
      assert.equal(sounding.radiusM, 400);
      assert.equal(sounding.holdTicks, 20 * SIM.TICK_HZ);
      assert.equal(sounding.sig, 80);
    }
    assert.equal(soundings.filter((s) => s.tag === 'reader-west').length, 3);
    assert.equal(soundings.filter((s) => s.tag === 'reader-east').length, 3);

    for (let tick = 0; tick <= T(22, 30); tick++) {
      match.update(STEP_MS);
      if (match.missionOver !== null) break;
    }
    const result = match.missionOver;
    assert.ok(result !== null, 'the writ never turned north');
    // §8 — an idle expedition never left the staging: the ascent reads met,
    // the field does not, and the close is the middle reading with the
    // ledger's line and both attendant gaps beneath it.
    //
    // The ledger's line is the *heard* one, and it is the model's arithmetic
    // rather than a choice: the flagship is a Cruiser, which idles at SIG 55
    // (§5 — "the survey is loud by trade"), the charting pair's HYD 70 scouts
    // classify that from 2,823 m through PF 1.0 and stand 2,607 m off the
    // staging at 00:00, and from 04:00 the watch's HYD 85 submersibles sit
    // 2,940 m off it on the terraces against a 3,188 m classification range.
    // Sixty seconds of that is the whole writ. Before #323 this read
    // "classified by nobody", because nothing on the rim was being resolved
    // for — the expedition was never quieter, only unheard.
    assert.equal(result.outcome, MissionOutcome.Partial);
    assert.match(result.epilogue, /returns short of standard/);
    assert.match(result.epilogue, /classified, at length, by ears that keep records/);
    assert.match(result.epilogue, /western return was not resolved/);
    assert.match(result.epilogue, /file does not believe/);
  });

  it('reads a column that proves the field and stays on the rim as kept (#1210)', () => {
    // §8: the ascent is read where the hulls are. The issue's run: four faces
    // read by 05:25 with the column on the slopes and terraces, which a
    // latched ascent closed Complete on the fourth face.
    const run = ascent('rim');
    assert.ok(run.provedAtTick !== null, 'the survey never read four faces');
    assert.equal(run.outcome, MissionOutcome.Lost, 'a survey the rim kept came off it');
    assert.ok(run.closedAtTick >= T(22), 'the writ closed before the turn');
    assert.equal(run.statusAtClose('the-field'), ObjectiveStatus.Met);
    assert.equal(run.statusAtClose('the-ascent'), ObjectiveStatus.Pending);
    assert.equal(run.inStagingAtClose, 0, 'a hull came home unordered');
    assert.match(run.epilogue, /The rim keeps the survey/);
  });

  it('closes Complete on the pass a column that proved the field is back in the staging', () => {
    // The positive control: the same run, sent home once the fourth face is
    // read. It cannot close on that pass, with the column on the rim, and it
    // closes the first pass three of the four are back in the staging.
    const run = ascent('home');
    assert.ok(run.provedAtTick !== null, 'the survey never read four faces');
    assert.equal(run.outcome, MissionOutcome.Complete, 'the column came off and was not read');
    assert.ok(run.closedAtTick > run.provedAtTick, 'it closed with the column on the rim');
    assert.ok(run.closedAtTick < T(22), 'the column home did not close the writ');
    assert.equal(run.statusAtClose('the-ascent'), ObjectiveStatus.Met);
    assert.ok(run.inStagingAtClose >= 3, 'it closed with fewer than three hulls home');
  });

  it('counts any three hulls in the staging as the column off, whichever read the faces', () => {
    // §8 asks three hulls of four, and §6 counts the faces for the whole
    // survey, so three in the staging are the column off the rim while the
    // eastern reader takes the last face. The writ closes on that face, with
    // the reader still on the terraces — the call #1210 took, pinned so a
    // change argues with it.
    const run = ascent('last-face');
    assert.equal(run.outcome, MissionOutcome.Complete, 'three hulls home were not the column off');
    assert.equal(run.closedAtTick, run.provedAtTick, 'the writ waited for the last reader');
    assert.equal(run.statusAtClose('the-field'), ObjectiveStatus.Met);
    assert.equal(run.inStagingAtClose, 3, 'the last reader came home, or a held hull left');
  });
});

/**
 * §8's ascent, played over the issue's run (#1210). `rim` orders the flagship
 * and the bunkerage to y 1,800 and the readers to faces three and four on the
 * first snapshot, then two and five at 05:00, and leaves them there. `home`
 * sends all four back to the staging on the pass the fourth face is read.
 * `last-face` holds the flagship and the bunkerage at the staging and reads
 * one face at a time: the western reader takes face three and goes home, then
 * the eastern takes four, five and six.
 */
function ascent(plan: 'rim' | 'home' | 'last-face') {
  const map = missionMapById(LEDGER_PROSPECT.mapId)!;
  const match = new Match(map, { mission: LEDGER_PROSPECT, fauna: false, seed: 77 });
  const player = LEDGER_PROSPECT.playerSlot;
  const staging = LEDGER_PROSPECT.regions.find((region) => region.id === 'staging')!;
  const faces = new Map((LEDGER_PROSPECT.soundings ?? []).map((s) => [s.id, s]));
  const toFace = (id: number, face: string) =>
    match.orderMove(player, id, faces.get(face)!.x, faces.get(face)!.y);
  let column: { flagship: number; bunkerage: number; west: number; east: number } | null = null;
  let last: EchoSnapshot | undefined;
  let read = 0;
  let provedAtTick: number | null = null;
  for (let tick = 0; tick <= T(22, 30); tick++) {
    const own = match.update(STEP_MS)?.get(player) as EchoSnapshot | undefined;
    last = own ?? last;
    if (own !== undefined && column === null) {
      const of = (kind: UnitKind) => own.units.filter((u) => u.kind === kind);
      const [west, east] = of(UnitKind.Corvette).sort((a, b) => a.x - b.x);
      column = {
        flagship: of(UnitKind.Cruiser)[0]!.id,
        bunkerage: of(UnitKind.Harvester)[0]!.id,
        west: west!.id,
        east: east!.id,
      };
      if (plan === 'last-face') toFace(column.west, 'face-three');
      else {
        match.orderMove(player, column.flagship, 2900, 1800);
        match.orderMove(player, column.bunkerage, 3100, 1800);
        toFace(column.west, 'face-three');
        toFace(column.east, 'face-four');
      }
    }
    if (column !== null && plan !== 'last-face' && match.world.tick === T(5)) {
      toFace(column.west, 'face-two');
      toFace(column.east, 'face-five');
    }
    const view = match.takeMissionView();
    const field = view?.objectives.find((o) => o.id === 'the-field');
    const done = field?.progress?.done ?? read;
    if (column !== null && plan === 'last-face' && done > read) {
      // One face at a time, so each new count is the hull just ordered.
      if (done === 1) {
        match.orderMove(player, column.west, 2850, 350);
        toFace(column.east, 'face-four');
      }
      if (done === 2) toFace(column.east, 'face-five');
      if (done === 3) toFace(column.east, 'face-six');
    }
    read = done;
    if (provedAtTick === null && field?.status === ObjectiveStatus.Met) {
      provedAtTick = match.world.tick;
      // Home to the staging, north of the slopes.
      if (plan === 'home') {
        for (const [i, id] of Object.values(column!).entries()) {
          match.orderMove(player, id, 2700 + i * 200, 500);
        }
      }
    }
    if (match.missionOver !== null) break;
  }
  const over = match.missionOver;
  assert.ok(over !== null, 'the writ never turned north');
  return {
    outcome: over.outcome,
    epilogue: over.epilogue,
    provedAtTick,
    closedAtTick: match.world.tick,
    inStagingAtClose: (last?.units ?? []).filter((u) => inRegion(staging, u.x, u.y)).length,
    statusAtClose: (id: string) => over.objectives.find((o) => o.id === id)?.status,
  };
}

describe('The Rim, as docs/mission-prospect.md §11 draws it (#1146)', () => {
  // The map is drawn in shapes since #1146, and a reshape is new content,
  // never a lever: every place the five missions on it seat, sound, order or
  // drive stands on the ground it stood on in rectangles. Asked of the painted
  // cells, because the cell is what a hull's floor and PF are read from. In
  // rectangles §11's rows were four bands a kilometre deep each, so the ground
  // a point stood on is its band's.
  const ground = terrainFor(MOUTH_RIM);
  const cellM = MOUTH_RIM.cellM;
  const at = (x: number, y: number) => [
    ground.biomeAt(x, y),
    ground.floorAt(x, y),
    ground.ceilingAt(x, y),
  ];
  const BANDS = {
    staging: [Biome.OpenWater, 1500, 0],
    slopes: [Biome.OpenWater, 2200, 0],
    terraces: [Biome.ResonanceField, 2600, 0],
    lip: [Biome.AbyssalTrench, 3100, 0],
  } as const;
  const DEEP = [Biome.OpenWater, 2600, 0];
  const bandOf = (y: number) =>
    BANDS[y < 1000 ? 'staging' : y < 2000 ? 'slopes' : y < 3000 ? 'terraces' : 'lip'];
  const MISSIONS: readonly MissionDefinition[] = [
    LEDGER_PROSPECT,
    SEEDING_SECOND_SEEDING,
    ATTENDING_FIRST_ARRIVAL,
    CHORD_RIM_DEPOSITS,
    CHORD_SECOND_CHORD,
  ];
  type Point = { what: string; x: number; y: number; depthM?: number };
  /** Every point a mission seats, marks, sounds, orders or drives, read off its literal. */
  const pointsOf = (mission: MissionDefinition): Point[] => {
    const points: Point[] = MOUTH_RIM.spawns.map((spawn) => ({ what: 'the spawn', ...spawn }));
    for (const party of mission.parties) {
      for (const thing of [...party.units, ...(party.structures ?? []), ...(party.emitters ?? [])])
        points.push({ what: thing.tag, x: thing.x, y: thing.y, depthM: thing.depthM });
    }
    for (const marker of mission.markers)
      points.push({ what: marker.id, x: marker.x, y: marker.y });
    for (const sounding of mission.soundings ?? [])
      points.push({ what: sounding.id, x: sounding.x, y: sounding.y });
    for (const row of mission.walk?.rows ?? []) points.push({ what: row.id, x: row.x, y: row.y });
    if (mission.commanderAbility !== undefined) {
      const { id, x, y } = mission.commanderAbility;
      points.push({ what: id, x, y });
    }
    for (const beat of [...mission.beats, ...(mission.conditionalBeats ?? [])]) {
      if (beat.kind === 'move') points.push({ what: `${beat.tag}'s move`, x: beat.x, y: beat.y });
      if (beat.kind === 'transit') {
        for (const leg of beat.legs) points.push({ what: `${beat.tag}'s leg`, x: leg.x, y: leg.y });
      }
      if (beat.kind === 'creature') {
        if (beat.spawnAt !== undefined) points.push({ what: beat.tag, ...beat.spawnAt });
        points.push({ what: `${beat.tag}, driven`, x: beat.driveTo.x, y: beat.driveTo.y });
      }
    }
    return points;
  };
  type Leg = { what: string; from: Point; to: Point; deepestM: number; move: boolean };
  /** Every scripted leg: a hull's seat, then its moves in tick order, and each creature's drive. */
  const legsOf = (mission: MissionDefinition): Leg[] => {
    const legs: Leg[] = [];
    const where = new Map<string, Point>();
    for (const party of mission.parties) {
      for (const unit of party.units) where.set(unit.tag, { what: unit.tag, ...unit });
    }
    for (const beat of [...mission.beats].sort((a, b) => a.atTick - b.atTick)) {
      if (beat.kind === 'move') {
        const from = where.get(beat.tag)!;
        const to = { what: beat.tag, x: beat.x, y: beat.y, depthM: beat.depthM ?? from.depthM };
        legs.push({
          what: beat.tag,
          from,
          to,
          deepestM: Math.max(from.depthM!, to.depthM!),
          move: true,
        });
        where.set(beat.tag, to);
      }
      if (beat.kind === 'creature' && beat.spawnAt !== undefined) {
        const from = { what: beat.tag, ...beat.spawnAt };
        const to = { what: beat.tag, ...beat.driveTo };
        legs.push({
          what: beat.tag,
          from,
          to,
          deepestM: Math.max(from.depthM, to.depthM ?? 0),
          move: false,
        });
      }
    }
    return legs;
  };

  it('stands every authored point of all five missions on the ground it stood on', () => {
    // The counts keep a point from dropping out unasked: the spawn, every
    // seat, emitter, marker and sounding, and every move and creature point.
    const counts: Record<string, number> = {};
    for (const mission of MISSIONS) {
      const points = pointsOf(mission);
      counts[mission.id] = points.length;
      for (const { what, x, y } of points) {
        assert.deepEqual(at(x, y), bandOf(y), `${mission.id}: ${what} at ${x},${y}`);
      }
    }
    assert.deepEqual(counts, {
      'ledger-prospect': 37,
      'seeding-second-seeding': 59,
      'attending-first-arrival': 48,
      'chord-rim-deposits': 65,
      'chord-second-chord': 98,
    });
  });

  it('keeps every cell of every mission region on the ground it stood on', () => {
    let cells = 0;
    for (const mission of MISSIONS) {
      for (const region of mission.regions) {
        for (let y = region.y + cellM / 2; y < region.y + region.heightM; y += cellM) {
          for (let x = region.x + cellM / 2; x < region.x + region.widthM; x += cellM) {
            assert.deepEqual(at(x, y), bandOf(y), `${mission.id}: ${region.id} at ${x},${y}`);
            cells++;
          }
        }
      }
    }
    // Prospect's staging, the furrow, First Arrival's hold, the Rim
    // Deposits' staging and three faces, and the Second Chord's staging,
    // cache and node water: every cell centre.
    assert.equal(cells, 96 + 4 + 96 + 108 + 104);
  });

  it('walks every scripted leg over the same water, held at the same depth', () => {
    // Where the slopes' foot is cut back the floor is 2,600 m, not 2,200 m:
    // Open Water both, so a leg crosses the same biome, and a hull is held at
    // the same depth there unless its leg is ordered below 2,200 m.
    let legs = 0;
    for (const mission of MISSIONS) {
      for (const leg of legsOf(mission)) {
        legs++;
        const { from, to, deepestM } = leg;
        const n = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 10));
        for (let i = 0; i <= n; i++) {
          const x = from.x + ((to.x - from.x) * i) / n;
          const y = from.y + ((to.y - from.y) * i) / n;
          const [biome, floorM] = bandOf(y);
          const where = `${mission.id}: ${leg.what} at ${Math.round(x)},${Math.round(y)}`;
          assert.equal(ground.biomeAt(x, y), biome, where);
          assert.equal(Math.min(ground.floorAt(x, y), deepestM), Math.min(floorM, deepestM), where);
        }
      }
    }
    assert.equal(legs, 16 + 30 + 16 + 29 + 59, 'every leg of all five missions');
  });

  it("cuts the slopes back in 9 cells, to the deep water, out of every seated Spire's grant", () => {
    // §11: the bay and the south-east corner, all Open Water at the Deep
    // Water's 2,600 m, so no cell's biome or PF moved. No point of them lies
    // within the six hundred metres of a Sounding Spire the missions seat.
    const spires = MISSIONS.flatMap((mission) =>
      mission.parties.flatMap((party) =>
        (party.structures ?? []).filter((s) => s.kind === StructureKind.SoundingSpire)
      )
    );
    assert.equal(spires.length, 5, "the Rim Deposits' two nodes, and the Second Chord's three");
    const cut: string[] = [];
    for (let y = cellM / 2; y < MOUTH_RIM.heightM; y += cellM) {
      for (let x = cellM / 2; x < MOUTH_RIM.widthM; x += cellM) {
        if (at(x, y).join() === bandOf(y).join()) continue;
        cut.push(`${x},${y}`);
        assert.deepEqual(at(x, y), DEEP, `${x},${y} is the deep water`);
        assert.equal(bandOf(y), BANDS.slopes, `${x},${y} is cut from the slopes`);
        for (const spire of spires) {
          const dx = Math.max(Math.abs(spire.x - x) - cellM / 2, 0);
          const dy = Math.max(Math.abs(spire.y - y) - cellM / 2, 0);
          assert.ok(
            Math.hypot(dx, dy) > STRUCTURE_AURAS.SOUNDING_SPIRE.RADIUS_M,
            `${x},${y} is inside ${spire.tag}'s grant`
          );
        }
      }
    }
    assert.equal(cut.length, 9, 'six in the bay, three in the corner');
  });

  it('routes every scripted move round the ground it was routed round in rectangles', () => {
    // A move whose straight segment the ground refuses is planned by
    // `Pathfinder.findPath`, and a partial route ends at the reachable cell
    // nearest the order, so a cut cell can pull a hull off its scripted track
    // without the segment ever crossing it (#1146: a gully at the slopes' foot
    // did, for the Second Seeding's 20:30 ascent). So every move is asked from
    // every 125 m of its leg, at every 25 m of the depths it spans, against
    // the map as it was, with the Slopes the box they were.
    const boxes = terrainFor({
      ...MOUTH_RIM,
      regions: MOUTH_RIM.regions.map((region, i) =>
        i === 2
          ? {
              x: 0,
              y: 1000,
              widthM: 6000,
              heightM: 1000,
              biome: region.biome,
              floorM: region.floorM,
            }
          : region
      ),
    });
    const cut = (x: number, y: number) => at(x, y).join() !== bandOf(y).join();
    const pathfinder = new Pathfinder(ground.cols, ground.rows);
    const route: number[] = [];
    const was: number[] = [];
    let moves = 0;
    let planned = 0;
    for (const mission of MISSIONS) {
      for (const leg of legsOf(mission)) {
        if (!leg.move) continue;
        moves++;
        const { from, to } = leg;
        const shallowM = Math.min(from.depthM!, to.depthM!);
        const n = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 125));
        for (let depthM = shallowM; depthM <= leg.deepestM; depthM += 25) {
          for (let i = 0; i <= n; i++) {
            const x = from.x + ((to.x - from.x) * i) / n;
            const y = from.y + ((to.y - from.y) * i) / n;
            const where = `${mission.id}: ${leg.what} from ${Math.round(x)},${Math.round(y)} at ${depthM} m`;
            const straight = ground.segmentAdmits(x, y, to.x, to.y, depthM);
            assert.equal(straight, boxes.segmentAdmits(x, y, to.x, to.y, depthM), where);
            if (straight) continue;
            planned++;
            pathfinder.findPath(ground, x, y, to.x, to.y, depthM, route);
            pathfinder.findPath(boxes, x, y, to.x, to.y, depthM, was);
            assert.deepEqual(route, was, `${where}: the route it took in rectangles`);
            // And the route as steered — waypoint to waypoint, then straight
            // at the order — never enters a cut cell at a depth the cut
            // changed the answer for. At 2,200 m or shallower a cut cell
            // admits a hull exactly as the slopes did: First Arrival's party
            // is planned through the corner at 1,525 m, as it was.
            if (depthM <= BANDS.slopes[1]) continue;
            const corners = [x, y, ...route, to.x, to.y];
            for (let c = 2; c < corners.length; c += 2) {
              const [ax, ay, bx, by] = corners.slice(c - 2, c + 2) as [
                number,
                number,
                number,
                number,
              ];
              const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 10));
              for (let k = 0; k <= steps; k++) {
                const px = ax + ((bx - ax) * k) / steps;
                const py = ay + ((by - ay) * k) / steps;
                assert.ok(!cut(px, py), `${where}: its route enters the cut cell at ${px},${py}`);
              }
            }
          }
          if (leg.deepestM === shallowM) break;
        }
      }
    }
    assert.equal(moves, 15 + 29 + 15 + 28 + 58, 'every scripted move of all five missions');
    assert.ok(planned > 0, 'some move is refused its straight segment and planned');
  });

  it('steps the floor down every column, below the layer, and never up on the way south', () => {
    const rows = MOUTH_RIM.heightM / cellM;
    for (let x = cellM / 2; x < MOUTH_RIM.widthM; x += cellM) {
      const floors = Array.from({ length: rows }, (_, r) => ground.floorAt(x, (r + 0.5) * cellM));
      for (let r = 0; r < rows; r++) {
        assert.ok(
          floors[r]! > THERMOCLINE.DEPTH_M,
          `the floor at ${x}, row ${r} is below the layer`
        );
        if (r > 0)
          assert.ok(floors[r]! >= floors[r - 1]!, `the floor rises southward at ${x}, row ${r}`);
      }
      // §11: the slopes' top row runs the map's whole width under the staging.
      assert.deepEqual(at(x, 1125), BANDS.slopes, `the slopes' top row at x ${x}`);
    }
  });
});
