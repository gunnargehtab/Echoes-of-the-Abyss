/**
 * The origin lock.
 *
 * These are the rules that decide whether a browser anywhere on the internet
 * can drive this server's matchmaking, so they are tested as pure functions
 * rather than through a live listener: what matters is the decision, and a
 * bound port would only test express's header plumbing.
 *
 * The case worth protecting is the production one. Wide-open CORS was the old
 * default and it is invisible when it is wrong — the server comes up, serves
 * happily, and nothing says it is answering strangers.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CorsConfigError,
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
