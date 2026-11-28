import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { APP_CSS, parseCss } from './support/cssBox.ts';

/** Each top-level selector's declarations, every rule for it merged in order. */
function declarationsBySelector(): Map<string, Array<[string, string]>> {
  const out = new Map<string, Array<[string, string]>>();
  for (const rule of parseCss(APP_CSS)) {
    if (rule.condition !== null) continue;
    out.set(rule.selector, [...(out.get(rule.selector) ?? []), ...rule.declarations]);
  }
  return out;
}

const OFFSETS = new Set(['left', 'right', 'top', 'bottom']);
const scales = (value: string) => value.includes('var(--ui-scale');

/**
 * docs/ui-ux.md §11: the UI scale moves "every DOM panel" with the Pixi HUD.
 * A panel whose offsets follow the scale but whose type does not is anchored
 * at 200% and drawn at 100%, which is what #1969 found on MOVE 3D. Read off
 * every rule rather than a list of panels, so a new panel is held too.
 */
describe('DOM panels under the UI scale', () => {
  it('scales the type of every panel the UI scale anchors', () => {
    const anchored = [...declarationsBySelector()].filter(([, decls]) =>
      decls.some(([property, value]) => OFFSETS.has(property) && scales(value))
    );
    assert.ok(anchored.length >= 6, `the panels were found (${anchored.length})`);
    const unscaled = anchored
      .filter(
        ([, decls]) =>
          !decls.some(
            ([property, value]) =>
              (property === 'transform' || property === 'font-size' || property === 'font') &&
              scales(value)
          )
      )
      .map(([selector]) => selector);
    assert.deepEqual(unscaled, [], 'anchored by the scale, drawn at 100%');
  });
});

/**
 * A length App.css writes for the MOVE 3D panel, in px, at a UI scale and a
 * window height. Handles the `calc()` sums, products and quotients that rule
 * uses and throws on anything else, so a rewrite cannot pass by being unread.
 */
function lengthPx(value: string, uiScale: number, vh: number): number {
  const resolved = value
    .replace(/var\(--ui-scale(?:,\s*[^)]*)?\)/g, String(uiScale))
    .replace(/(\d+(?:\.\d+)?)vh/g, (_, n: string) => String((Number(n) / 100) * vh))
    .replace(/(\d+(?:\.\d+)?)px/g, '$1');
  const body = /^calc\((.*)\)$/.exec(resolved)?.[1] ?? resolved;
  assert.match(body, /^[\d.\s+\-*/()]+$/, `\`${value}\` reads as arithmetic`);
  return Function(`return (${body});`)() as number;
}

/**
 * docs/ui-ux.md §11: MOVE 3D magnifies whole, as the logs do, because it
 * scrolls, and its top stays where 100% puts it.
 */
describe('MOVE 3D preview under the UI scale', () => {
  const decls = new Map(declarationsBySelector().get('.move-preview'));

  it('magnifies whole from its bottom-left corner', () => {
    assert.equal(decls.get('transform'), 'scale(var(--ui-scale, 1))');
    assert.equal(decls.get('transform-origin'), 'bottom left');
    // Its controls ride the transform; a font size of its own would scale twice.
    assert.equal(decls.get('font'), 'inherit');
    assert.equal(decls.get('overflow'), 'auto', 'it scrolls, which is why it is the logs’ case');
  });

  for (const uiScale of [0.75, 1, 1.5, 2]) {
    it(`keeps its top 215 units down at ${uiScale * 100}%`, () => {
      for (const vh of [768, 900, 1200]) {
        const bottom = lengthPx(decls.get('bottom')!, uiScale, vh);
        // A transform draws the capped box at the scale, from its foot.
        const magnified = scales(decls.get('transform') ?? '') ? uiScale : 1;
        const drawn = lengthPx(decls.get('max-height')!, uiScale, vh) * magnified;
        const top = vh - bottom - drawn;
        assert.ok(Math.abs(top - 215 * uiScale) < 1e-9, `top at ${top} px of ${vh}`);
      }
    });
  }
});
