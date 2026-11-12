/**
 * How far an outline stands from its centre, against the reach a mark's
 * plate takes for it (docs/art-direction.md, "The plate under a mark";
 * #1801). A plate under a contact's mark holds "the outline it has earned,
 * to its corners", and the chart cannot hold every kind in one canned frame,
 * so every kind is drawn here and measured off its own shapes
 * (test/support/inkReach.ts). How the plates are composed about a whole
 * symbol is rendererSmoke.test.ts.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Graphics } from 'pixi.js';
import { Faction, StructureKind, UnitKind, structureStatsFor } from '@echoes/shared';
import { hullSpriteSizeM } from '../src/game/hullTextures.ts';
import {
  drawStructureSilhouette,
  drawUnitSilhouette,
  structureOutlineReachM,
} from '../src/game/silhouettes.ts';
import { farthestInk } from './support/inkReach.ts';

/** As a contact's outline is drawn (EchoRenderer `drawContacts`): no detail. */
const STYLE = { color: 0xffffff, accent: 0xff0000, alpha: 1, detail: false } as const;

const kinds = <T extends number>(of: Record<string, string | number>): T[] =>
  Object.values(of).filter((value): value is T => typeof value === 'number');

describe('an outline’s reach', () => {
  it('is exactly how far every structure kind’s outline is drawn', () => {
    const past: StructureKind[] = [];
    for (const kind of kinds<StructureKind>(StructureKind)) {
      const radiusM = structureStatsFor(kind).radiusM;
      const g = new Graphics();
      drawStructureSilhouette(g, kind, 0, 0, radiusM, STYLE, 0);
      const drawn = farthestInk(g);
      const reach = structureOutlineReachM(kind, radiusM);
      assert.ok(
        Math.abs(drawn - reach) < 1e-6 * radiusM,
        `${StructureKind[kind]}: drawn to ${drawn.toFixed(3)} m, reach ${reach.toFixed(3)} m`
      );
      if (reach > radiusM * (1 + 1e-9)) past.push(kind);
      g.destroy();
    }
    // The kinds a plate sized by the footing alone left short: the four
    // halls, to their corners, and the Spore Veil, to its longest lobe.
    assert.deepEqual(
      past.sort((a, b) => a - b),
      [
        StructureKind.Refinery,
        StructureKind.Foundry,
        StructureKind.Slipway,
        StructureKind.BaffleBarge,
        StructureKind.SporeVeil,
      ].sort((a, b) => a - b)
    );
  });

  it('keeps every hull’s outline within the half-diagonal of its sprite’s box, at any heading', () => {
    // A tracked hull's plate takes the half-diagonal of its sprite's box
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
