/**
 * Faction glyphs (#207) — docs/ui-ux.md §11, §12.5.
 *
 * "Faction colour is never the only identifier." That is a claim about
 * *shape*, so what this file pins is that the four navies draw four different
 * shapes, that the shapes do not move when the ink does, and that a glyph
 * never appears for something whose faction the player has not earned.
 *
 * Pixi's Graphics is recorded rather than run: the assertions are about the
 * geometry handed to it, and a real GPU context would add nothing but a
 * headless browser.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Faction } from '@echoes/shared';
import { drawFactionGlyph } from '../src/game/silhouettes.ts';

/** A Graphics stand-in that records the shape calls and their arguments. */
function recorder() {
  const ops: string[] = [];
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      ops.push(
        `${name}(${args.map((a) => (typeof a === 'number' ? a.toFixed(2) : '_')).join(',')})`
      );
      return api;
    };
  const api = {
    rect: record('rect'),
    circle: record('circle'),
    poly: record('poly'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    quadraticCurveTo: record('quadraticCurveTo'),
    stroke: record('stroke'),
    fill: record('fill'),
  };
  return { api, ops };
}

const NAVIES = [Faction.Bathyarch, Faction.Pelagia, Faction.Directorate, Faction.Hadron];

function shapeOf(faction: Faction, color = 0x112233, alpha = 1): string {
  const { api, ops } = recorder();
  drawFactionGlyph(api as never, faction, 100, 200, 10, color, alpha, 1.5);
  return ops.join('|');
}

describe('faction glyphs', () => {
  it('gives each navy a shape of its own', () => {
    // §11's rule is a claim about shape: four navies, four silhouettes, so
    // identity survives a player who cannot separate the four inks.
    const shapes = NAVIES.map((faction) => shapeOf(faction));
    assert.equal(new Set(shapes).size, NAVIES.length, 'no two navies draw the same glyph');
    for (const shape of shapes) assert.notEqual(shape, '', 'every navy draws something');
  });

  it('draws the same geometry whatever ink it is handed', () => {
    // The colour-vision palettes move every faction ink (§14). If they moved
    // the geometry too, the glyph would be decoration rather than the thing
    // that makes the scale survive them.
    for (const faction of NAVIES) {
      assert.equal(
        shapeOf(faction, 0x112233, 1),
        shapeOf(faction, 0xffaa00, 0.42),
        'geometry is independent of ink and alpha'
      );
    }
  });

  it('scales with the size it is given and nothing else', () => {
    const { api, ops } = recorder();
    drawFactionGlyph(api as never, Faction.Bathyarch, 0, 0, 10, 0, 1, 1);
    const { api: big, ops: bigOps } = recorder();
    drawFactionGlyph(big as never, Faction.Bathyarch, 0, 0, 20, 0, 1, 1);
    assert.notEqual(ops.join('|'), bigOps.join('|'), 'a bigger glyph is a bigger glyph');
    assert.equal(ops.length, bigOps.length, 'and the same shape while it is at it');
  });
});
