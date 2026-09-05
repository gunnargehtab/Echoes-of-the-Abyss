/**
 * The board on the chart (#410) — docs/ui-ux.md §14, "The chart".
 *
 * What is checked is the transcription, because a chart that placed a mission
 * on the wrong water would look exactly like one that placed it on the right
 * water: every ground the catalogue stands on is in the gazetteer, every depth
 * is on the plate's rail, whose water each ground is agrees with
 * docs/world-map.md §3 for the grounds that document argues about, and the
 * twenty-nine slots come out as marks that do not sit on top of one another.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Faction, MISSION_HEADERS } from '@echoes/shared';
import { buildBoard } from '../src/menu/campaignBoard.ts';
import {
  DEPTH_RAIL,
  GROUNDS,
  chartMarks,
  groundFor,
  groundLine,
  railY,
} from '../src/menu/riftChart.ts';

const nothingPlayed = () => false;

describe('the gazetteer', () => {
  it('has a ground for every water the catalogue plays on', () => {
    // The chart draws the built campaign, so a mission on a ground the chart
    // does not know would be a mark drawn nowhere — and nothing on screen
    // would say so.
    for (const header of MISSION_HEADERS) {
      assert.ok(
        groundFor(header.mapId) !== undefined,
        `${header.id}: no ground for ${header.mapId}`
      );
    }
  });

  it('carries no ground the catalogue does not stand on', () => {
    // The gazetteer is docs/world-map.md §5 one row per map, not §3 whole: a
    // place with no mission on it belongs to the plate, not to the board.
    const played = new Set(MISSION_HEADERS.map((header) => header.mapId));
    for (const ground of GROUNDS) {
      assert.ok(played.has(ground.mapId), `${ground.mapId}: no mission plays here`);
    }
    assert.equal(new Set(GROUNDS.map((ground) => ground.mapId)).size, GROUNDS.length);
  });

  it('keeps every ground inside the plate and on its rail', () => {
    const [shallowest] = DEPTH_RAIL[0];
    const [deepest] = DEPTH_RAIL[DEPTH_RAIL.length - 1];
    for (const ground of GROUNDS) {
      assert.ok(ground.depthM > shallowest && ground.depthM < deepest, ground.mapId);
      // Plate VII's chart area: x 240–1760 between the frame's rules, y under
      // the Lid and above the Mouth.
      assert.ok(ground.x >= 240 && ground.x <= 1760, `${ground.mapId}: off the plate`);
      assert.ok(ground.y >= 390 && ground.y <= 2400, `${ground.mapId}: off the plate`);
    }
  });

  it('runs north-shallow to south-deep, as the Rift does', () => {
    // docs/world-map.md §1: that one gradient organises everything. The
    // plateaus sit above the west wall, the wall above the fields' deep end,
    // and everything above the trench country and the rim.
    const y = (mapId: string) => groundFor(mapId)!.y;
    assert.ok(y('marr-plateau') < y('holding-underworks'));
    assert.ok(y('holding-underworks') < y('the-first'));
    assert.ok(y('the-first') < y('attending-galleries'));
    assert.ok(y('sorrowgate') < y('mouth-rim'));
  });

  it('says whose water each ground is, per world-map.md §3', () => {
    // The pairs the document argues about, and that the campaign turns on: a
    // Directorate mission on the plateaus' shoulder, a Consortium survey on
    // the cohorts' margin, and the three grounds nobody holds.
    assert.equal(groundFor('kell-shoulder')?.water, Faction.Pelagia);
    assert.equal(groundFor('first-trench-margin')?.water, Faction.Directorate);
    assert.equal(groundFor('sorrowgate')?.water, null);
    assert.equal(groundFor('fourth-trench')?.water, null);
    assert.equal(groundFor('mouth-rim')?.water, null);
    for (const ground of GROUNDS) {
      assert.ok(ground.whose.length > 0, `${ground.mapId}: whose water is unsaid`);
    }
  });

  it('reads a ground as place, depth and water', () => {
    assert.equal(
      groundLine(groundFor('sorrowgate')!),
      'Sorrowgate, the drowned city · 1,500 m · nobody’s water — all four deny using it'
    );
  });

  it('marks the place’s depth from world-map.md §3, not the map’s floor (#422)', () => {
    // The rail is a gazetteer: the depth under a slot is the reading a player
    // would give the ground, which is §3's number for the place. The map's
    // base floor from each mission document's §11 differs on eight of these,
    // and the chart's own label says *depth*, so §3 wins — one row per map,
    // held here so a literal's floor cannot drift back into the column.
    const PLACE_DEPTHS: Record<string, number> = {
      'marr-plateau': 320, // the plateau
      'kell-shoulder': 340, // the shoulder, at the Concourse's own depth
      'anholt-furrow': 2200, // the seeded floor, not the Foot at 900
      'holding-underworks': 1300, // the Holding's lowest berths, over the roofed works
      'holding-board': 1350, // Board country, at the bottom of the city
      'ninefold-face-six': 1000, // the founding field, 900–1,400 m
      'ninefold-workings': 1100, // the upper workings, astride the layer
      sorrowgate: 1500, // the court
      'outer-formations': 1700, // the Third's outer formations
      'the-fifth': 1700, // the canyon's floor
      'the-rest': 1600, // the Head
      'the-first': 2900, // the deepest chapter-house
      'first-trench-margin': 1800, // the First Trench
      'shallow-band': 1800, // the First Trench
      'fourth-trench': 1700, // the pipe's floor
      'fourth-foot': 2400, // the Foot, the last bench
      'banding-ground': 2400, // the upper Ninth, 1,500–2,400 m
      'upper-terraces': 2750, // the top of Sufficiency, 2,750–3,400 m
      'attending-galleries': 3000, // the galleries, on the axis
      'mouth-rim': 2600, // the Terraces, where every rim mission is fought
    };
    for (const ground of GROUNDS) {
      assert.equal(ground.depthM, PLACE_DEPTHS[ground.mapId], `${ground.mapId}: not §3's depth`);
    }
    assert.equal(Object.keys(PLACE_DEPTHS).length, GROUNDS.length);
  });
});

describe('the depth rail', () => {
  it('passes through the plate’s own ticks', () => {
    for (const [depth, y] of DEPTH_RAIL) assert.equal(railY(depth), y);
  });

  it('never goes up as the water goes down', () => {
    let last = -Infinity;
    for (let depth = -100; depth <= 5000; depth += 50) {
      const y = railY(depth);
      assert.ok(y >= last, `${depth} m`);
      last = y;
    }
  });
});

describe('the marks', () => {
  const board = buildBoard(nothingPlayed);
  const marks = chartMarks(board);

  it('draws every slot that opens, and nothing that does not', () => {
    const openable = [board.prologue, ...board.columns.flatMap((c) => c.slots)].filter(
      (slot) => slot.missionId !== undefined
    );
    assert.equal(marks.length, openable.length);
    assert.equal(marks.length, 29);
  });

  it('inks a mark in its campaign’s navy, and the prologue in none', () => {
    const prologue = marks.find((mark) => mark.slot.campaign === 'prologue');
    assert.equal(prologue?.faction, null);
    for (const column of board.columns) {
      for (const slot of column.slots) {
        const mark = marks.find((m) => m.slotKey === slot.key);
        assert.equal(mark?.faction, column.faction, slot.key);
      }
    }
  });

  it('fans the slots that share a ground so none is drawn over another', () => {
    const seen = new Set<string>();
    for (const mark of marks) {
      const at = `${mark.x.toFixed(1)},${mark.y.toFixed(1)}`;
      assert.ok(!seen.has(at), `${mark.slotKey} sits on another mark`);
      seen.add(at);
    }
    // Five missions on the Rim, none on top of the place itself.
    const rim = marks.filter((mark) => mark.ground.mapId === 'mouth-rim');
    assert.equal(rim.length, 5);
  });

  it('leaves a lone mark exactly on its place', () => {
    const lone = marks.find((mark) => mark.ground.mapId === 'the-first');
    assert.ok(lone !== undefined);
    assert.equal(lone.x, lone.ground.x);
    assert.equal(lone.y, lone.ground.y);
  });
});
