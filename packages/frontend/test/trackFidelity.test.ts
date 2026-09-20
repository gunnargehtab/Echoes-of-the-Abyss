/**
 * The Asymmetric Fidelity Law's tier half, as a gate rather than as prose
 * (docs/graphics-standards.md gate 5, #834).
 *
 * #834 lifted the cap that kept a Tier-4 track on a flat silhouette. What it
 * did *not* lift is the half with a reason behind it: below Track the server
 * has sent no hull to draw, so a sprite there would be the renderer inventing
 * one. These tests are what makes that half fail loudly if someone widens the
 * rule again — they assert over every tier and over the whole ghost window,
 * not at the two points the draw loop happens to hit.
 *
 * The other half of gate 5 — no enemy geometry in the conn view, at any tier —
 * is asserted where it lives, in rendererSmoke.test.ts.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PERSISTENCE, ResolutionTier } from '@echoes/shared';
import { contactFidelity, LIVE_TRACK_MS } from '../src/game/trackFidelity.ts';

const GHOST_MS = PERSISTENCE.GHOST_MARKER_DECAY_S * 1000;

/** Every tier a contact can arrive at, Silent included. */
const TIERS = Object.values(ResolutionTier).filter(
  (v): v is ResolutionTier => typeof v === 'number'
);

/** Ages across the whole life of a mark, from just-resolved to nearly decayed. */
const AGES = [0, 1, LIVE_TRACK_MS / 2, LIVE_TRACK_MS, LIVE_TRACK_MS + 1, GHOST_MS / 2, GHOST_MS];

describe('contact fidelity — the tier half of gate 5', () => {
  it('draws no sprite below Track, at any age in the ghost window', () => {
    for (const tier of TIERS) {
      if (tier >= ResolutionTier.Track) continue;
      for (const age of AGES) {
        assert.equal(
          contactFidelity(tier, age),
          'shape',
          `tier ${tier} at ${age} ms must stay a shape: the server sent no hull to draw`
        );
      }
    }
  });

  it('gives a live Track the sprite', () => {
    assert.equal(contactFidelity(ResolutionTier.Track, 0), 'sprite');
    assert.equal(contactFidelity(ResolutionTier.Track, LIVE_TRACK_MS / 2), 'sprite');
  });

  it('takes it back the moment the Track ghosts', () => {
    // The boundary is inclusive, and stated here so a change to it is a
    // change to this line rather than a silent shift of the flicker window.
    assert.equal(contactFidelity(ResolutionTier.Track, LIVE_TRACK_MS), 'sprite');
    assert.equal(contactFidelity(ResolutionTier.Track, LIVE_TRACK_MS + 1), 'shape');
  });

  it('leaves a stale Track a shape for the rest of its decay', () => {
    // A ghost is drawn for 20 s and lit for none of it: the mark fades as a
    // last-known position, never as a hull that is still there.
    for (const age of AGES.filter((a) => a > LIVE_TRACK_MS)) {
      assert.equal(contactFidelity(ResolutionTier.Track, age), 'shape');
    }
  });

  it('keeps the live window inside the ghost window, and above one Echo pass', () => {
    // Two claims PERSISTENCE.LIVE_TRACK_S makes in prose. A live window at or
    // under one 200 ms pass would strobe the sprite on every late snapshot;
    // one at or over the ghost decay would light every stale mark on the map.
    assert.ok(LIVE_TRACK_MS > 1000 / 5, 'longer than one Echo pass at ECHO_HZ 5');
    assert.ok(LIVE_TRACK_MS < GHOST_MS, 'shorter than the ghost decay');
  });
});
