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
