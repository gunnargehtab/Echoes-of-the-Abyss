/**
 * Which regions' detail is held — docs/world-map.md §7.5 (#1459).
 *
 * The residency under node, against regions that exist only here: Sorrowgate
 * is the one placed region, and §7.5's bounds are about more than one. A load
 * is a promise the test settles by hand, so every order of arrival is a line
 * of the test rather than a race.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { WORLD } from '@echoes/shared';
import {
  DETAIL_KEEP_PX,
  DETAIL_WANT_PX,
  DetailResidency,
  projectedCellPx,
  wantedDetail,
} from '../src/game/detailResidency.ts';
import { CONN_FOV_DEG } from '../src/game/readability.ts';

/**
 * A load the test settles: each request leaves its resolvers here. A load
 * that honours its signal rejects when aborted; one that does not lands
 * whenever the test says, as a bake already past its last yield would.
 */
function loads({ honoursAbort = true } = {}) {
  const open = new Map<
    string,
    { resolve: (v: string) => void; reject: (e: Error) => void; signal: AbortSignal }
  >();
  const released: string[] = [];
  const residency = new DetailResidency<string>(
    (id, signal) =>
      new Promise<string>((resolve, reject) => {
        open.set(id, { resolve, reject, signal });
        if (honoursAbort) signal.addEventListener('abort', () => reject(new Error('aborted')));
      }),
    (id, value) => released.push(`${id}:${value}`)
  );
  const settle = async (id: string, value = `${id}-detail`) => {
    open.get(id)!.resolve(value);
    open.delete(id);
    await new Promise((r) => setTimeout(r, 0));
  };
  const fail = async (id: string) => {
    open.get(id)!.reject(new Error('no ground'));
    open.delete(id);
    await new Promise((r) => setTimeout(r, 0));
  };
  return { residency, open, released, settle, fail };
}

describe('selecting detail by projected size (§7.5)', () => {
  it('wants a region once its overview cells would read as blocks, and keeps it below that', () => {
    assert.ok(DETAIL_KEEP_PX < DETAIL_WANT_PX, 'hysteresis, not a threshold to flicker on');
    // 720 px tall at the conn view's 40°: a 1,000 m cell is 24 px at about
    // 41 km, and 16 px at about 62 km.
    const at = (km: number) => projectedCellPx(km * 1_000, 720, CONN_FOV_DEG);
    assert.ok(at(40) > DETAIL_WANT_PX && at(42) < DETAIL_WANT_PX);
    assert.ok(at(61) > DETAIL_KEEP_PX && at(63) < DETAIL_KEEP_PX);
    const near = { id: 'near', px: 40, visible: true };
    const edge = { id: 'edge', px: 20, visible: true };
    const away = { id: 'away', px: 90, visible: false };
    assert.deepEqual(
      wantedDetail([edge, near, away], new Set(), 2),
      ['near'],
      'not yet, not out of view'
    );
    assert.deepEqual(wantedDetail([edge, near], new Set(['edge']), 2), ['near', 'edge'], 'kept');
    assert.deepEqual(
      wantedDetail([edge, near], new Set(['edge']), 1),
      ['near'],
      'a session holding a slot leaves one'
    );
  });
});

describe('holding detail (§7.5)', () => {
  it('holds two at most, the one arriving and the one left', async () => {
    const { residency, open, released, settle } = loads();
    assert.equal(residency.maxResident, WORLD.DETAIL_RESIDENT);
    assert.equal(residency.maxInFlight, WORLD.DETAIL_IN_FLIGHT);
    residency.want(['a']);
    await settle('a');
    residency.want(['b']);
    await settle('b');
    assert.deepEqual([...residency.residentIds()].sort(), ['a', 'b'], 'the one left is kept');
    assert.deepEqual(residency.drawn(), ['b'], 'but only the wanted one is drawn');
    residency.want(['c']);
    await settle('c');
    assert.deepEqual([...residency.residentIds()].sort(), ['b', 'c']);
    assert.deepEqual(released, ['a:a-detail'], 'the least recently wanted goes');
    assert.equal(open.size, 0);
  });

  it('keeps two requests in flight at most, and starts the next as one lands', async () => {
    const { residency, open, settle } = loads();
    residency.want(['a', 'b', 'c']);
    assert.deepEqual([...open.keys()], ['a', 'b'], 'two at once');
    assert.equal(residency.pending, 2);
    await settle('a');
    assert.deepEqual([...open.keys()], ['b', 'c'], 'a slot freed is a slot used');
  });

  it('aborts a request for a region let go, and releases what it built if it lands anyway', async () => {
    const { residency, open, released, settle } = loads({ honoursAbort: false });
    residency.want(['a']);
    const { signal, resolve } = open.get('a')!;
    residency.want([]);
    assert.equal(signal.aborted, true, 'cancelled');
    assert.equal(residency.pending, 0);
    resolve('late');
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(released, ['a:late'], 'released, never drawn');
    assert.equal(residency.get('a'), undefined);
    assert.equal(residency.counts.cancelled, 1);
    residency.want(['b']);
    await settle('b');
    assert.deepEqual(residency.drawn(), ['b']);
  });

  it('holds nothing for a request that fails, and tries again only once it is wanted afresh', async () => {
    const { residency, open, fail, settle } = loads();
    residency.want(['a']);
    await fail('a');
    assert.equal(residency.counts.failed, 1);
    assert.equal(residency.get('a'), undefined);
    residency.want(['a']);
    assert.equal(open.size, 0, 'not retried every frame');
    residency.want([]);
    residency.want(['a']);
    assert.ok(open.has('a'), 'wanted afresh, asked again');
    await settle('a');
    assert.equal(residency.get('a'), 'a-detail');
  });

  it('lets go of what no longer fits when a session takes a slot', async () => {
    const { residency, released, settle } = loads();
    residency.want(['a', 'b']);
    await settle('a');
    await settle('b');
    residency.want(['a'], 1);
    assert.deepEqual([...residency.residentIds()], ['a'], 'one beside the session');
    assert.deepEqual(released, ['b:b-detail'], 'the one no longer wanted goes');
  });

  it('drops a region held or being built, as when a session takes it', async () => {
    const { residency, open, released, settle } = loads();
    residency.want(['home', 'b']);
    await settle('home');
    const { signal } = open.get('b')!;
    residency.drop('home');
    residency.drop('b');
    assert.deepEqual([...residency.residentIds()], [], 'nothing held');
    assert.deepEqual(released, ['home:home-detail']);
    assert.equal(signal.aborted, true, 'and nothing left building');
  });

  it('keeps a region being built down to the keep threshold, so its request is not restarted', () => {
    const { residency, open } = loads();
    residency.want(['a']);
    assert.ok(residency.keptIds().has('a'), 'in flight counts as kept');
    const between = { id: 'a', px: (DETAIL_KEEP_PX + DETAIL_WANT_PX) / 2, visible: true };
    residency.want(wantedDetail([between], residency.keptIds(), 2));
    assert.equal(residency.counts.cancelled, 0, 'not aborted between the thresholds');
    assert.ok(open.has('a'));
  });

  it('counts a session region against the bound, and releases everything on dispose', async () => {
    const { residency, released, settle, open } = loads();
    residency.want(['a'], 1);
    await settle('a');
    residency.want(['b'], 1);
    await settle('b');
    assert.deepEqual([...residency.residentIds()], ['b'], 'one slot left beside the session');
    residency.want(['c']);
    const { signal } = open.get('c')!;
    residency.dispose();
    assert.equal(signal.aborted, true);
    assert.deepEqual(released, ['a:a-detail', 'b:b-detail']);
    residency.want(['d']);
    assert.equal(open.size, 1, 'a disposed residency asks for nothing more');
  });
});
