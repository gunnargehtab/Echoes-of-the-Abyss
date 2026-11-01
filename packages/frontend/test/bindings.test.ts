/**
 * The input map — docs/ui-ux.md §9 and §11 (#191).
 *
 * The rebinder's whole risk is that it lets a player break something the
 * document already settled. §9 records two binding conflicts it resolved on
 * purpose — order queueing versus the ping preview, control groups versus unit
 * production — and both were resolved *in favour of a mouse interaction or a
 * control with no alternative route*. A rebinder that hands those keys out
 * again does not fail loudly: it makes a click quietly stop meaning what it
 * meant, with no key to press and notice.
 *
 * So the tests that matter here are the refusals.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIONS,
  actionFor,
  conflictsIn,
  DEFAULT_BINDINGS,
  isBindable,
  keyLabel,
  LAYOUTS,
  ONE_HANDED_BINDINGS,
  RESERVED_CODES,
  resolveBindings,
  type Bindings,
} from '../src/input/bindings.ts';

describe('the shipped layouts', () => {
  it('reserves confirmation only in the study and exposes saved Enter conflicts', () => {
    const bindings = { ...DEFAULT_BINDINGS, toggleNav: 'Enter' };
    assert.equal(isBindable('Enter', 'toggleNav'), true);
    assert.equal(isBindable('Enter', 'toggleNav', true), false);
    assert.deepEqual(conflictsIn(bindings), []);
    const conflicts = conflictsIn(bindings, true);
    assert.equal(conflicts.length, 1);
    assert.deepEqual(conflicts[0]!.actions, ['toggleNav']);
    assert.match(conflicts[0]!.reservedFor!, /MOVE 3D/);
    assert.equal(resolveBindings('custom', bindings).toggleNav, 'Enter');
  });
  it('binds ordinary actions and leaves the opt-in destination preview unbound', () => {
    // An unbound action is a control the player cannot reach *and cannot see
    // is missing*: the command bar still lists it, the key just does nothing.
    for (const [name, layout] of Object.entries(LAYOUTS)) {
      for (const { action, label } of ACTIONS) {
        const code = layout[action];
        if (action === 'move3d') {
          assert.equal(code, '');
          assert.equal(actionFor(layout, code), null);
          continue;
        }
        assert.ok(typeof code === 'string' && code.length > 0, `${name} leaves "${label}" unbound`);
      }
    }
  });

  it('ships no conflicts out of the box', () => {
    for (const [name, layout] of Object.entries(LAYOUTS)) {
      assert.deepEqual(
        conflictsIn(layout).map((conflict) => conflict.code),
        [],
        `${name} ships a collision`
      );
    }
  });

  it('keeps the one-handed layout inside a left hand', () => {
    // §11's commitment is not "a different layout", it is *one-handed*. A key
    // on the right half of the board is one this layout cannot reach, and
    // shipping it would meet the letter of the promise and none of it. `B` is
    // out: §9 puts it under a right hand that is on the mouse (#1436).
    const leftHand = new Set([
      'Space',
      'AltLeft',
      'Backquote',
      'Tab',
      'KeyQ',
      'KeyW',
      'KeyE',
      'KeyR',
      'KeyT',
      'KeyA',
      'KeyS',
      'KeyD',
      'KeyF',
      'KeyG',
      'KeyZ',
      'KeyX',
      'KeyC',
      'KeyV',
      'Digit1',
      'Digit2',
      'Digit3',
      'Digit4',
      'Digit5',
    ]);
    for (const { action, label } of ACTIONS.filter(
      (spec) => spec.group !== 'camera' && spec.group !== 'nav' && spec.action !== 'move3d'
    )) {
      const code = ONE_HANDED_BINDINGS[action];
      assert.ok(leftHand.has(code), `one-handed puts "${label}" on ${keyLabel(code)}`);
    }
  });

  it('moves only what the standard layout puts out of reach', () => {
    // A layout that also shuffles the keys a player already knows is a worse
    // layout, so this is a claim about restraint: a binding differs only
    // because the standard put it under a right hand, or because something
    // that moved for that reason took its key.
    const moved = ACTIONS.filter(
      ({ action }) => ONE_HANDED_BINDINGS[action] !== DEFAULT_BINDINGS[action]
    ).map(({ action }) => action);
    // `stop` moves too, although `X` is a left-hand key: the mine takes `X`
    // in this layout, so stop steps aside rather than collide with it.
    //
    // `engineOff` is the second of those, and the reason the claim above is
    // worded as it is rather than as "exactly the right-hand bindings": `Q` is
    // a left-hand key and the standard's engine off sits on it, but the ping
    // moved to `Q` here because `P` was out of reach. So engine off takes the
    // `A` beside it, which nothing in either layout wants since #1132 (#1436).
    assert.deepEqual(moved.sort(), [
      'buildSignature',
      'engineOff',
      'holdPosition',
      'mine',
      'noisemaker',
      'ping',
      'stop',
      'throttle',
    ]);
  });
});

describe('the two conflicts §9 already settled', () => {
  it('refuses the digits, which control groups have no alternative to', () => {
    // "Control groups and unit production were both assigned to the digits;
    // control groups keep them, because production also has the command bar's
    // UNITS tab and control groups have no alternative route at all."
    for (let digit = 1; digit <= 9; digit++) {
      assert.equal(isBindable(`Digit${digit}`), false, `Digit${digit} was bindable`);
    }
  });

  it('refuses the modifiers, which change what a click means', () => {
    // Shift queues an order, Ctrl subtracts from a selection. Both are the
    // resolved half of a conflict, and both lose silently if rebound over.
    for (const code of ['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'MetaLeft']) {
      assert.equal(isBindable(code), false, `${code} was bindable`);
    }
  });

  it('refuses Escape, which is the way out of a pending build', () => {
    assert.equal(isBindable('Escape'), false);
  });

  it('gives a reason for every refusal, because the screen shows it', () => {
    for (const [code, reason] of RESERVED_CODES) {
      assert.ok(reason.trim().length > 0, `${code} is refused without saying why`);
    }
  });

  it('still allows an ordinary key', () => {
    assert.equal(isBindable('KeyJ'), true);
    assert.equal(isBindable('F5'), true);
  });
});

describe('conflict detection', () => {
  it('names both actions when one code is bound twice', () => {
    const clashing: Bindings = { ...DEFAULT_BINDINGS, mine: DEFAULT_BINDINGS.ping };
    const conflicts = conflictsIn(clashing);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0]!.code, DEFAULT_BINDINGS.ping);
    assert.deepEqual(conflicts[0]!.actions.sort(), ['mine', 'ping']);
  });

  it('flags a reserved code even when only one action holds it', () => {
    // The dangerous case, and the one a duplicate check alone would miss: the
    // other claimant is a *mouse* interaction, so nothing collides in this
    // table at all. Persisted settings can carry one even though the screen
    // refuses to capture it, so the detector has to catch it too.
    const smuggled: Bindings = { ...DEFAULT_BINDINGS, mine: 'Digit3' };
    const conflicts = conflictsIn(smuggled);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0]!.code, 'Digit3');
    assert.match(conflicts[0]!.reservedFor ?? '', /control group/);
  });

  it('is quiet on a clean table', () => {
    assert.deepEqual(conflictsIn(DEFAULT_BINDINGS), []);
  });
});

describe('resolving a stored table', () => {
  it('fills an action a stored record never heard of', () => {
    // The migration case. A record written before an action existed must give
    // that action its default, not leave it unbound.
    const partial = { ping: 'KeyJ' } as Partial<Bindings>;
    const resolved = resolveBindings('default', partial);
    assert.equal(resolved.ping, 'KeyJ');
    for (const { action } of ACTIONS) {
      if (action === 'ping') continue;
      assert.equal(resolved[action], DEFAULT_BINDINGS[action], action);
    }
  });

  it('layers a custom table over the standard, not over nothing', () => {
    const resolved = resolveBindings('custom', { mine: 'KeyJ' });
    assert.equal(resolved.mine, 'KeyJ');
    assert.equal(resolved.ping, DEFAULT_BINDINGS.ping);
  });

  it('fills a custom table standard first, then one-handed, then standard anyway (#1352)', () => {
    // Standard key free: taken.
    const free = { ...DEFAULT_BINDINGS } as Partial<Bindings>;
    delete free.stop;
    assert.equal(resolveBindings('custom', free).stop, DEFAULT_BINDINGS.stop);

    // Standard key used, one-handed free: the one-handed key.
    const used = { ...ONE_HANDED_BINDINGS } as Partial<Bindings>;
    delete used.engineOff;
    assert.equal(resolveBindings('custom', used).engineOff, ONE_HANDED_BINDINGS.engineOff);

    // Both used: the standard key, and the clash shows rather than no key.
    const both = { ...used, mine: ONE_HANDED_BINDINGS.engineOff };
    const resolved = resolveBindings('custom', both);
    assert.equal(resolved.engineOff, DEFAULT_BINDINGS.engineOff);
    assert.ok(conflictsIn(resolved).some((c) => c.actions.includes('engineOff')));
  });

  it('takes the one-handed layout whole when nothing is overridden', () => {
    assert.deepEqual(resolveBindings('oneHanded', undefined), ONE_HANDED_BINDINGS);
  });

  it('ignores a stored value that is not a code', () => {
    const hostile = { ping: 42, mine: '' } as unknown as Partial<Bindings>;
    const resolved = resolveBindings('default', hostile);
    assert.equal(resolved.ping, DEFAULT_BINDINGS.ping);
    assert.equal(resolved.mine, DEFAULT_BINDINGS.mine);
  });
});

describe('dispatch', () => {
  it('shares fleet keys only across mutually exclusive NAV contexts', () => {
    assert.equal(actionFor(DEFAULT_BINDINGS, 'KeyW'), 'attackMove');
    assert.equal(actionFor(DEFAULT_BINDINGS, 'KeyW', true), 'flyForward');
    assert.equal(actionFor(DEFAULT_BINDINGS, 'KeyS'), 'rise');
    assert.equal(actionFor(DEFAULT_BINDINGS, 'KeyS', true), 'flyBack');
    assert.equal(isBindable('ArrowUp', 'lookUp'), true);
    assert.equal(isBindable('ArrowUp', 'rise'), false);
    assert.ok(conflictsIn({ ...DEFAULT_BINDINGS, toggleNav: 'KeyW' }).length > 0);
    assert.ok(conflictsIn({ ...DEFAULT_BINDINGS, flyLeft: 'KeyW' }).length > 0);
  });
  it('finds the action a code fires', () => {
    assert.equal(actionFor(DEFAULT_BINDINGS, DEFAULT_BINDINGS.ping), 'ping');
    assert.equal(actionFor(DEFAULT_BINDINGS, 'KeyJ'), null);
  });

  it('resolves a doubly bound code the way the screen says it will', () => {
    // The screen tells the player "the first action in the list wins". That is
    // a promise about `ACTIONS` order, so it is worth pinning: a reordering of
    // that array would otherwise quietly make the warning untrue.
    const clashing: Bindings = { ...DEFAULT_BINDINGS, mine: DEFAULT_BINDINGS.ping };
    const first = ACTIONS.map(({ action }) => action).find(
      (action) => clashing[action] === DEFAULT_BINDINGS.ping
    );
    assert.equal(actionFor(clashing, DEFAULT_BINDINGS.ping), first);
  });
});

describe('key labels', () => {
  it('names a key the way a player would', () => {
    assert.equal(keyLabel('KeyP'), 'P');
    assert.equal(keyLabel('Space'), 'Space');
    assert.equal(keyLabel('AltLeft'), 'Left Alt');
    assert.equal(keyLabel('Digit4'), '4');
    assert.equal(keyLabel('Slash'), '/');
  });

  it('falls through to the raw code rather than inventing a name', () => {
    // A wrong label on a binding is worse than an ugly one: the player presses
    // what it says and nothing happens.
    assert.equal(keyLabel('IntlBackslash'), 'IntlBackslash');
  });
});
