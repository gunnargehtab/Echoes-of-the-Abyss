/**
 * The page's uncaught errors, as reports (#1576; net/reports.ts).
 *
 * The real hook, on a stand-in event target: the runner has no `window`, and
 * what is under test is what reaches the sender, not the browser's dispatch.
 * `reportsLive.test.ts` in the backend holds what the server does with one.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { type ClientReport, REPORTS } from '@echoes/shared';
import {
  clientBuild,
  httpBase,
  installErrorReports,
  leaveReportRoom,
  setReportRoom,
} from '../src/net/reports.ts';

/** An `EventTarget` that can raise the two events a page raises. */
function page() {
  const target = new EventTarget();
  return {
    target: target as unknown as Window,
    throwUncaught(error: unknown, message = ''): void {
      target.dispatchEvent(Object.assign(new Event('error'), { error, message }));
    },
    rejectUnhandled(reason: unknown): void {
      target.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason }));
    },
  };
}

function hooked() {
  const sent: ClientReport[] = [];
  const p = page();
  installErrorReports(p.target, (report) => sent.push(report));
  return { ...p, sent };
}

describe("the page's error reports", () => {
  it('sends an uncaught error and an unhandled rejection, tagged with the build and room', () => {
    setReportRoom('AbC123xyz');
    try {
      const { throwUncaught, rejectUnhandled, sent } = hooked();
      throwUncaught(new Error('the conn view went wrong'));
      rejectUnhandled(new Error('a model failed to load'));
      assert.deepEqual(
        sent.map(({ kind, message, build, roomId }) => ({ kind, message, build, roomId })),
        [
          { kind: 'error', message: 'the conn view went wrong', build: 'dev', roomId: 'AbC123xyz' },
          {
            kind: 'rejection',
            message: 'a model failed to load',
            build: 'dev',
            roomId: 'AbC123xyz',
          },
        ]
      );
      assert.match(sent[0]?.stack ?? '', /the conn view went wrong/);
    } finally {
      leaveReportRoom('AbC123xyz');
    }
  });

  it('carries the error, the build and the room, and nothing else', () => {
    const { throwUncaught, sent } = hooked();
    throwUncaught(new Error('x'));
    assert.deepEqual(Object.keys(sent[0] ?? {}).sort(), [
      'build',
      'kind',
      'message',
      'roomId',
      'stack',
    ]);
    assert.equal(sent[0]?.roomId, null, 'outside a room');
  });

  it('reports a thrown non-error and a cross-origin "Script error." by their text', () => {
    const { throwUncaught, rejectUnhandled, sent } = hooked();
    rejectUnhandled('no reason given');
    throwUncaught(null, 'Script error.');
    assert.deepEqual(
      sent.map(({ message, stack }) => [message, stack]),
      [
        ['no reason given', ''],
        ['Script error.', ''],
      ]
    );
  });

  it('sends each distinct error once, and at most the per-page cap', () => {
    const { throwUncaught, sent } = hooked();
    const error = new Error('every frame');
    for (let i = 0; i < 60; i += 1) throwUncaught(error);
    assert.equal(sent.length, 1, 'a frame loop says so once');
    for (let i = 0; i < REPORTS.MAX_PER_PAGE + 5; i += 1) throwUncaught(new Error(`e${i}`));
    assert.equal(sent.length, REPORTS.MAX_PER_PAGE);
  });

  it('trims a report to the bounds the server keeps', () => {
    const { throwUncaught, sent } = hooked();
    const error = new Error('m'.repeat(REPORTS.MAX_MESSAGE_CHARS * 2));
    error.stack = 's'.repeat(REPORTS.MAX_STACK_CHARS * 2);
    throwUncaught(error);
    assert.equal(sent[0]?.message.length, REPORTS.MAX_MESSAGE_CHARS);
    assert.equal(sent[0]?.stack.length, REPORTS.MAX_STACK_CHARS);
    assert.ok(JSON.stringify(sent[0]).length < REPORTS.MAX_BODY_BYTES, 'fits the body cap');
  });

  it('survives a sender that throws', () => {
    const p = page();
    installErrorReports(p.target, () => {
      throw new Error('the network went wrong too');
    });
    assert.doesNotThrow(() => p.throwUncaught(new Error('first')));
  });

  it("leaves another client's room alone when one leaves", () => {
    setReportRoom('second');
    leaveReportRoom('first');
    const { throwUncaught, sent } = hooked();
    throwUncaught(new Error('x'));
    assert.equal(sent[0]?.roomId, 'second');
    leaveReportRoom('second');
  });

  it("posts to the game server's HTTP origin", () => {
    assert.equal(httpBase('wss://play.example.com:3000'), 'https://play.example.com:3000');
    assert.equal(httpBase('ws://localhost:3000/'), 'http://localhost:3000');
  });

  it('reads the build from the bundle, and `dev` when it was not given one', () => {
    const previous = process.env.VITE_ECHOES_BUILD;
    try {
      delete process.env.VITE_ECHOES_BUILD;
      assert.equal(clientBuild(), 'dev');
      process.env.VITE_ECHOES_BUILD = '';
      assert.equal(clientBuild(), 'dev');
      process.env.VITE_ECHOES_BUILD = '1d57f61';
      assert.equal(clientBuild(), '1d57f61');
    } finally {
      if (previous === undefined) delete process.env.VITE_ECHOES_BUILD;
      else process.env.VITE_ECHOES_BUILD = previous;
    }
  });
});
