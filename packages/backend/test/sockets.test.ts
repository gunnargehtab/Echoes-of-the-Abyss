/**
 * The socket count per address (#1961).
 *
 * `admissionLive.test.ts` holds the cap at a real upgrade; this holds the
 * counter's own rules: an address is refused at its cap and no sooner, a
 * release gives one place back, and an address leaves the table at zero, so
 * the table is as large as the sockets open and no larger.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SocketCounter } from '../src/http/sockets.ts';

describe('the socket count', () => {
  it('refuses an address at its cap, and frees a place on release', () => {
    const counter = new SocketCounter(2);
    const from = '203.0.113.70';
    assert.equal(counter.take(from), true);
    assert.equal(counter.take(from), true);
    assert.equal(counter.take(from), false, 'past the cap');
    assert.equal(counter.heldBy(from), 2, 'a refusal holds nothing');
    assert.equal(counter.take('198.51.100.70'), true, 'another address has its own count');
    counter.release(from);
    assert.equal(counter.heldBy(from), 1);
    assert.equal(counter.take(from), true, 'a released place can be taken again');
  });

  it('forgets an address whose last socket closed', () => {
    const counter = new SocketCounter(4);
    const from = '203.0.113.71';
    counter.take(from);
    counter.take(from);
    assert.equal(counter.tracked, 1);
    counter.release(from);
    counter.release(from);
    assert.equal(counter.tracked, 0);
    counter.release(from);
    assert.equal(counter.heldBy(from), 0, 'a release past zero stays at zero');
  });
});
