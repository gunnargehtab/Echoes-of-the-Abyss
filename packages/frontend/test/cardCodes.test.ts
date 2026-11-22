/**
 * A code names one thing — docs/ui-ux.md §9 (#1886).
 *
 * The card and the own-force readouts abbreviate hulls, structures and refits
 * to three letters, and the squad page prefixes the harvest throttle the same
 * way. A code sits beside any other its navy fields: the Knights' Herald read
 * `HLD` beside their Hold refit, and the Directorate's Thurible `THR` beside
 * its Harvester's throttle. So the property is asserted over every code, not
 * the two pairs.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  REFIT_SHORT,
  STRUCTURE_SHORT,
  THROTTLE_CODE,
  UNIT_SHORT,
} from '../src/game/EchoRenderer.ts';

describe('the card codes (docs/ui-ux.md §9)', () => {
  it('give no two things the same code', () => {
    const named: Array<[string, string]> = [
      ...Object.entries(UNIT_SHORT).map(([kind, code]): [string, string] => [code, `unit ${kind}`]),
      ...Object.entries(STRUCTURE_SHORT).map(([kind, code]): [string, string] => [
        code,
        `structure ${kind}`,
      ]),
      ...Object.entries(REFIT_SHORT).map(([kind, code]): [string, string] => [
        code,
        `refit ${kind}`,
      ]),
      [THROTTLE_CODE, 'the harvest throttle'],
    ];
    const owner = new Map<string, string>();
    for (const [code, what] of named) {
      const earlier = owner.get(code);
      assert.equal(earlier, undefined, `${code} names both ${earlier} and ${what}`);
      owner.set(code, what);
    }
  });
});
