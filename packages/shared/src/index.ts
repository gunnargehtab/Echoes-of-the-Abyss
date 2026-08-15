/**
 * @echoes/shared — the single source of truth for simulation rules.
 *
 * Both the authoritative server and the client import from here so that the
 * numbers in docs/systems-echo.md and docs/systems-depth.md are transcribed
 * exactly once. If a constant appears in two packages, it will eventually
 * disagree with itself; put it here instead.
 */

export * from './types.js';
export * from './constants.js';
export * from './echo.js';
export * from './units.js';
