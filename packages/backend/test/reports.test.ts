/**
 * The error report's shape and the per-address limiter, as pure functions
 * (#1576). `reportsLive.test.ts` holds the route on a live server.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { REPORTS } from '@echoes/shared';
import { parseClientReport, ReportLimiter } from '../src/http/reports.ts';

const valid = {
  kind: 'rejection',
  message: 'a model failed to load',
  stack: '',
  build: 'dev',
  roomId: 'AbC_12-xy',
};

describe('reading a client report', () => {
  it('takes a report of the shape the client sends', () => {
    assert.deepEqual(parseClientReport(valid), valid);
    assert.deepEqual(parseClientReport({ ...valid, roomId: null }), { ...valid, roomId: null });
  });

  it('refuses anything that is not that shape', () => {
    for (const body of [
      null,
      'error',
      [valid],
      { ...valid, kind: 'warning' },
      { ...valid, message: 7 },
      { ...valid, stack: undefined },
      { ...valid, build: '' },
      // A build tag and a room id go into a log line verbatim, so a newline or
      // a quote in either is refused rather than escaped.
      { ...valid, build: 'dev\n{"source":"server"}' },
      { ...valid, roomId: 'a room' },
      { ...valid, roomId: undefined },
    ]) {
      assert.equal(parseClientReport(body), null, JSON.stringify(body));
    }
  });

  it('cuts an over-long message and stack to the bounds the client trims to', () => {
    const report = parseClientReport({
      ...valid,
      message: 'm'.repeat(REPORTS.MAX_MESSAGE_CHARS + 50),
      stack: 's'.repeat(REPORTS.MAX_STACK_CHARS + 50),
    });
    assert.equal(report?.message.length, REPORTS.MAX_MESSAGE_CHARS);
    assert.equal(report?.stack.length, REPORTS.MAX_STACK_CHARS);
  });

  it('keeps only the fields it names', () => {
    assert.deepEqual(parseClientReport({ ...valid, seed: 42, world: {} }), valid);
  });
});

describe('the per-address report limit', () => {
  it('spends a window per address, and refills it once the window passes', () => {
    const limiter = new ReportLimiter(3, 1000);
    for (let i = 0; i < 3; i += 1) assert.equal(limiter.allow('a', 0), true);
    assert.equal(limiter.allow('a', 999), false, 'the fourth inside the window');
    assert.equal(limiter.allow('b', 999), true, 'another address has its own window');
    assert.equal(limiter.allow('a', 1000), true, 'a fresh window');
  });

  it('remembers a bounded number of addresses', () => {
    const limiter = new ReportLimiter(1, 1000);
    const bound = REPORTS.MAX_TRACKED_ADDRESSES;
    for (let i = 0; i < bound; i += 1) limiter.allow(`old-${i}`, 0);
    assert.equal(limiter.tracked, bound);
    // Every old window has expired by now, so making room drops them all.
    limiter.allow('new', 5000);
    assert.equal(limiter.tracked, 1);
  });
});
