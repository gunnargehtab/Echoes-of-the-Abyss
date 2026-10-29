/**
 * Public landmarks — docs/graphics-standards.md gate 1 "Public landmarks",
 * docs/maps.md "How a map is written", docs/sorrowgate-arch-study.md §7
 * (#1637). What the shared table promises: the arch's row is the study's
 * placement contract, its anchor cells are water in the literal and turn to
 * rock with the 10:40 beat, its state is those cells' and nothing else's, and
 * the backend never reads the table.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  landmarkCells,
  landmarkState,
  paintGround,
  PUBLIC_LANDMARKS,
  SORROWGATE_GROUND,
} from '../dist/index.js';

const ARCH = PUBLIC_LANDMARKS['sorrowgate']![0]!;

describe('the public landmark table', () => {
  it('names Sorrowgate’s arch at the study’s anchor, yaw, cells and floor (§7)', () => {
    assert.equal(PUBLIC_LANDMARKS['sorrowgate']!.length, 1, 'a map names at most one');
    assert.deepEqual(ARCH, {
      slug: 'env-ruin-transit-arch',
      anchorXM: 2550,
      anchorYM: 2125,
      yawRad: 0,
      cells: { row: 8, col0: 9, col1: 11 },
      originFloorM: 1600,
    });
    // The anchor cells are x 2250–3000, y 2000–2250 on 250 m cells, and the
    // anchor stands inside them.
    const { cellM } = SORROWGATE_GROUND;
    assert.equal(Math.floor(ARCH.anchorYM / cellM), ARCH.cells.row);
    const col = Math.floor(ARCH.anchorXM / cellM);
    assert.ok(col >= ARCH.cells.col0 && col <= ARCH.cells.col1);
  });

  it('stands intact on the literal, whose anchor cells are water at the origin floor', () => {
    const cells = paintGround(SORROWGATE_GROUND);
    for (const index of landmarkCells(ARCH, cells.cols)) {
      assert.ok(cells.ceiling[index]! <= cells.floor[index]!, `cell ${index} is rock`);
      assert.equal(cells.floor[index], ARCH.originFloorM, `cell ${index} floor`);
    }
    assert.equal(landmarkState(ARCH, cells), 'intact');
  });

  it('is ruined once any anchor cell is rock, and by nothing else (gate 1, rule 1)', () => {
    const cells = paintGround(SORROWGATE_GROUND);
    const floor = Array.from(cells.floor);
    const ceiling = Array.from(cells.ceiling);
    const grid = { cols: cells.cols, floor, ceiling };
    // A change anywhere else: the chamber's row turns to rock.
    const elsewhere = (ARCH.cells.row + 2) * cells.cols + ARCH.cells.col0;
    ceiling[elsewhere] = floor[elsewhere]! + 1;
    assert.equal(landmarkState(ARCH, grid), 'intact', 'a delta elsewhere never touches it');
    // One anchor cell to rock, as the 10:40 beat writes the whole span.
    const [, middle] = landmarkCells(ARCH, cells.cols);
    ceiling[middle!] = floor[middle!]! + 1;
    assert.equal(landmarkState(ARCH, grid), 'ruined');
  });
});

describe('the simulation never reads a landmark', () => {
  it('no backend source names the table or its state', () => {
    const root = new URL('../../backend/src/', import.meta.url).pathname;
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.ts$/.test(entry)) files.push(path);
      }
    };
    walk(root);
    assert.ok(files.length > 50, 'the backend source was found');
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      assert.ok(
        !/PUBLIC_LANDMARKS|landmarkState|landmarkCells|PublicLandmark/.test(text),
        `${file} reads the landmark table`
      );
    }
  });
});
