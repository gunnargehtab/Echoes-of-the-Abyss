/**
 * The skirmish's one order (#1588) — docs/ui-ux.md §10.5.
 *
 * §10.5 promises three things of the row: it states the rule that wins the
 * match, *destroy the enemy Bastion*, with its gloss; it reads *every* enemy
 * Bastion with three or four seated; and with one seated it says nothing ends
 * the match. Its status word never moves and it has no marker, since nothing
 * about another Bastion reaches the client.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { render } from './support/screen.ts';
import { SkirmishOrders } from '../src/game/SkirmishOrders.tsx';

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
