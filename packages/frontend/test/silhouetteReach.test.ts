/**
 * How far a hull's outline stands from its centre, against the reach the
 * chart takes for it. A contact that has earned its hull is drawn as that
 * outline, and a mission marker's name keeps off the mark by a footprint
 * sized from the hull's sprite box (EchoRenderer `drawContacts`, `figure`;
 * docs/ui-ux.md §10.5, #1662). The chart cannot hold every kind in one
 * canned frame, so every kind is drawn here and measured off its own shapes
 * (test/support/inkReach.ts).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Graphics } from 'pixi.js';
import { Faction, UnitKind } from '@echoes/shared';
import { hullSpriteSizeM } from '../src/game/hullTextures.ts';
import { drawUnitSilhouette } from '../src/game/silhouettes.ts';
import { farthestInk } from './support/inkReach.ts';

/** As a contact's outline is drawn (EchoRenderer `drawContacts`): no detail. */
const STYLE = { color: 0xffffff, accent: 0xff0000, alpha: 1, detail: false } as const;

const kinds = <T extends number>(of: Record<string, string | number>): T[] =>
  Object.values(of).filter((value): value is T => typeof value === 'number');

describe('an outline’s reach', () => {
  it('keeps every hull’s outline within the half-diagonal of its sprite’s box, at any heading', () => {
    // A tracked hull's footprint takes the half-diagonal of its sprite's box
    // (EchoRenderer, `figure`), which the outline is drawn inside.
    for (const kind of kinds<UnitKind>(UnitKind)) {
      for (const faction of kinds<Faction>(Faction)) {
        const size = hullSpriteSizeM(kind, faction);
        const box = Math.hypot(size.widthM, size.heightM) / 2;
        for (const heading of [0, 0.7, Math.PI / 2, 2.1, Math.PI]) {
          const g = new Graphics();
          drawUnitSilhouette(g, kind, faction, 0, 0, heading, STYLE, 0);
          const drawn = farthestInk(g);
          assert.ok(
            drawn <= box,
            `${UnitKind[kind]} of ${Faction[faction]} at ${heading}: ${drawn.toFixed(2)} m past ${box.toFixed(2)} m`
          );
          g.destroy();
        }
      }
    }
  });
});
