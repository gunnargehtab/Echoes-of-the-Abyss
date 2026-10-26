/**
 * The skirmish's one order (#1588) — docs/ui-ux.md §10.5.
 *
 * §10.5 promises three things of the row: it states the rule that wins the
 * match, *destroy the enemy Bastion*, with its gloss; it reads *every* enemy
 * Bastion with three or four seated; and with one seated it says nothing ends
 * the match. Its status word never moves and it has no marker, since nothing
 * about another Bastion reaches the client. The harvester row is at the foot.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { render } from './support/screen.ts';
import { HarvestIdleReason, HarvestThrottle, UnitKind, type OwnUnit } from '@echoes/shared';
import { SkirmishOrders, harvestRow } from '../src/game/SkirmishOrders.tsx';

async function orders(seated: number) {
  return render(createElement(SkirmishOrders, { seated }));
}

describe('the skirmish states what wins it', () => {
  it('names the enemy Bastion, and what losing yours costs', async () => {
    const view = await orders(2);
    try {
      assert.ok(view.shows('Destroy the enemy Bastion'));
      assert.ok(view.shows('Lose yours and you are out.'));
      assert.equal(
        view.byClass('objectives-status').props.children,
        'win',
        'a status word that is the rule, not a progress claim'
      );
      assert.equal(view.allByClass('objectives-row')[0]!.type, 'p', 'no marker, so no button');
    } finally {
      await view.unmount();
    }
  });

  it('says every enemy Bastion when there is more than one', async () => {
    for (const seated of [3, 4]) {
      const view = await orders(seated);
      try {
        assert.ok(view.shows('Destroy every enemy Bastion'), `${seated} seated`);
      } finally {
        await view.unmount();
      }
    }
  });

  it('says plainly that a match with nobody to beat does not end', async () => {
    const view = await orders(1);
    try {
      assert.ok(view.shows('No enemy is seated'));
      assert.ok(view.shows('Nothing ends this match but leaving it.'));
      assert.equal(view.shows('Destroy the enemy Bastion'), false);
    } finally {
      await view.unmount();
    }
  });
});

/**
 * The harvester row (#1589) — docs/ui-ux.md §10.5. Two forms: the one working
 * harvester named, and a new one waiting for a field pointed at. A harvester
 * seen working and then parked is a chosen quiet, not a new one, and a stalled
 * one is §5's to speak for.
 */
describe('the skirmish names the harvester', () => {
  const harvester = (id: number, extra: Partial<OwnUnit> = {}): OwnUnit =>
    ({ id, kind: UnitKind.Harvester, throttle: HarvestThrottle.Standard, ...extra }) as OwnUnit;
  const scout = { id: 9, kind: UnitKind.LightScout } as OwnUnit;

  it('names the one working harvester, as a skirmish opens', () => {
    const worked = new Set<number>();
    assert.deepEqual(harvestRow([scout, harvester(1, { harvesting: true })], worked), {
      kind: 'opening',
    });
  });

  it('points at a new harvester waiting for a field, ahead of the working one', () => {
    const worked = new Set<number>();
    const row = harvestRow([harvester(1, { harvesting: true }), harvester(2)], worked);
    assert.deepEqual(row, { kind: 'waiting', count: 1 });
    assert.deepEqual(
      harvestRow([harvester(1, { harvesting: true }), harvester(2), harvester(3)], worked),
      { kind: 'waiting', count: 2 }
    );
  });

  it('says nothing of a harvester it has seen work and the player parked', () => {
    const worked = new Set<number>();
    harvestRow([harvester(1, { harvesting: true }), harvester(2, { harvesting: true })], worked);
    assert.equal(
      harvestRow([harvester(1, { harvesting: true }), harvester(2)], worked),
      null,
      'a parked harvester read as a new one'
    );
  });

  it('leaves a stalled harvester, and one aboard, to the rest of the HUD', () => {
    const worked = new Set<number>();
    assert.equal(harvestRow([harvester(1, { idle: HarvestIdleReason.MinedOut })], worked), null);
    assert.equal(harvestRow([harvester(1, { aboard: 7 })], worked), null);
  });

  it('forgets a harvester that is gone, so a recycled id starts over', () => {
    const worked = new Set<number>();
    harvestRow([harvester(1, { harvesting: true })], worked);
    harvestRow([scout], worked);
    assert.deepEqual(harvestRow([harvester(1)], worked), { kind: 'waiting', count: 1 });
  });

  it('draws each form with its gloss', async () => {
    const opening = await render(
      createElement(SkirmishOrders, { seated: 2, harvest: { kind: 'opening' } })
    );
    try {
      assert.ok(opening.shows('Your harvester is working a field'));
      assert.ok(opening.shows('Build more at the Bastion.'));
    } finally {
      await opening.unmount();
    }
    const waiting = await render(
      createElement(SkirmishOrders, { seated: 2, harvest: { kind: 'waiting', count: 1 } })
    );
    try {
      assert.ok(waiting.shows('A new harvester is waiting for a field'));
      assert.ok(waiting.shows('Select it, then right-click a nodule field.'));
    } finally {
      await waiting.unmount();
    }
  });
});
