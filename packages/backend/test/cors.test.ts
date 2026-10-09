/**
 * The origin lock.
 *
 * These are the rules that decide whether a browser anywhere on the internet
 * can drive this server's matchmaking, held here as pure functions.
 * `corsLive.test.ts` holds that the live server applies them, which it did
 * not while they sat in a middleware Colyseus answers ahead of (#1301).
 *
 * The case worth protecting is the production one. Wide-open CORS was the old
 * default and it is invisible when it is wrong — the server comes up, serves
 * happily, and nothing says it is answering strangers.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CorsConfigError,
  type CorsPolicy,
  corsHeadersFor,
  describeCorsPolicy,
  isOriginAllowed,
  resolveCorsPolicy,
} from '../src/http/cors.ts';

describe('origin policy resolution', () => {
  it('defaults to loopback when CORS_ORIGIN is unset outside production', () => {
    assert.deepEqual(resolveCorsPolicy({}), { kind: 'loopback' });
    assert.deepEqual(resolveCorsPolicy({ NODE_ENV: 'development' }), { kind: 'loopback' });
  });

  it('refuses to resolve in production without CORS_ORIGIN', () => {
    assert.throws(() => resolveCorsPolicy({ NODE_ENV: 'production' }), CorsConfigError);
  });

  it('treats whitespace and an empty string as unset', () => {
    assert.deepEqual(resolveCorsPolicy({ CORS_ORIGIN: '   ' }), { kind: 'loopback' });
    assert.throws(
      () => resolveCorsPolicy({ CORS_ORIGIN: '', NODE_ENV: 'production' }),
      CorsConfigError
    );
  });

  it('accepts an explicit wildcard, in production too', () => {
    assert.deepEqual(resolveCorsPolicy({ CORS_ORIGIN: '*', NODE_ENV: 'production' }), {
      kind: 'any',
    });
  });

  it('splits a comma-separated list and trims each entry', () => {
    assert.deepEqual(resolveCorsPolicy({ CORS_ORIGIN: 'https://a.example, https://b.example ' }), {
      kind: 'list',
      origins: ['https://a.example', 'https://b.example'],
    });
  });

  it('rejects a list that is only separators', () => {
    assert.throws(() => resolveCorsPolicy({ CORS_ORIGIN: ' , , ' }), CorsConfigError);
  });
});

describe('origin matching', () => {
  it('allows every origin under the wildcard', () => {
    assert.equal(isOriginAllowed({ kind: 'any' }, 'https://anywhere.example'), true);
  });

  it('matches a list exactly — no prefix, no subdomain, no trailing slash', () => {
    const policy = resolveCorsPolicy({ CORS_ORIGIN: 'https://play.example' });
    assert.equal(isOriginAllowed(policy, 'https://play.example'), true);
    assert.equal(isOriginAllowed(policy, 'https://play.example/'), false);
    assert.equal(isOriginAllowed(policy, 'https://play.example.attacker.test'), false);
    assert.equal(isOriginAllowed(policy, 'http://play.example'), false);
  });

  it('allows loopback on any port, because vite.config.ts sets strictPort: false', () => {
    const policy = resolveCorsPolicy({});
    assert.equal(isOriginAllowed(policy, 'http://localhost:5173'), true);
    assert.equal(isOriginAllowed(policy, 'http://localhost:5174'), true);
    assert.equal(isOriginAllowed(policy, 'http://127.0.0.1:4173'), true);
    assert.equal(isOriginAllowed(policy, 'http://[::1]:5173'), true);
  });

  it('does not mistake a hostname that merely contains localhost for loopback', () => {
    const policy = resolveCorsPolicy({});
    assert.equal(isOriginAllowed(policy, 'http://localhost.attacker.test'), false);
    assert.equal(isOriginAllowed(policy, 'http://notlocalhost'), false);
    assert.equal(isOriginAllowed(policy, 'http://192.168.1.20:5173'), false);
  });

  it('rejects a malformed or non-http origin rather than throwing', () => {
    const policy = resolveCorsPolicy({});
    assert.equal(isOriginAllowed(policy, 'null'), false);
    assert.equal(isOriginAllowed(policy, ''), false);
    assert.equal(isOriginAllowed(policy, 'file://localhost'), false);
  });
});

describe('the headers a request gets (#1301)', () => {
  const locked: CorsPolicy = { kind: 'list', origins: ['https://play.example.com'] };

  it('echoes an allowed origin with credentials, as the SDK needs', () => {
    assert.deepEqual(corsHeadersFor(locked, 'https://play.example.com'), {
      'Access-Control-Allow-Origin': 'https://play.example.com',
      'Access-Control-Allow-Credentials': 'true',
      Vary: 'Origin',
    });
  });

  // Only `Vary`: the refusal depends on the Origin as much as the welcome does,
  // and a cache that missed it could hand the refusal to the allowed origin.
  it('gives a refused origin no allow-origin at all, so its page reads no answer', () => {
    assert.deepEqual(corsHeadersFor(locked, 'https://evil.example'), { Vary: 'Origin' });
    assert.deepEqual(corsHeadersFor({ kind: 'loopback' }, 'https://evil.example'), {
      Vary: 'Origin',
    });
  });

  it('gives a request with no Origin no allow-origin: it is not a cross-origin browser request', () => {
    assert.deepEqual(corsHeadersFor(locked, undefined), { Vary: 'Origin' });
    assert.deepEqual(corsHeadersFor(locked, null), { Vary: 'Origin' });
  });

  it('echoes every origin under the wildcard', () => {
    assert.equal(
      corsHeadersFor({ kind: 'any' }, 'https://anywhere.example')['Access-Control-Allow-Origin'],
      'https://anywhere.example'
    );
  });
});

describe('startup log line', () => {
  it('names what was applied, so an operator can see the lock took', () => {
    assert.match(describeCorsPolicy({ kind: 'loopback' }), /loopback/);
    assert.match(describeCorsPolicy({ kind: 'any' }), /any origin/);
    assert.equal(
      describeCorsPolicy({ kind: 'list', origins: ['https://a.example'] }),
      'https://a.example'
    );
  });
});
