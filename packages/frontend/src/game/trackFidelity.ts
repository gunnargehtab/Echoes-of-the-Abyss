/**
 * How much of a contact the renderer has earned the right to draw — the
 * Asymmetric Fidelity Law (docs/graphics-standards.md gate 5) as a function
 * rather than as a condition buried in the draw loop.
 *
 * Its own module for the reason readability.ts is one: a rule a doc states is
 * worth pinning under test without a GL context, and this is the whole of what
 * #834 changed. The draw loop asks once and then draws; it never re-decides.
 *
 * This answers only the half of gate 5 that is about *tiers*. The other half —
 * the enemy is never geometry in the conn view, at any tier — is enforced
 * where it lives, by PerspectiveView never being handed a contact at all.
 */

import { PERSISTENCE, ResolutionTier } from '@echoes/shared';

/**
 * How long since its last resolution a track still counts as live, in
 * milliseconds. Two Echo passes — see PERSISTENCE.LIVE_TRACK_S for why two
 * and not one.
 */
export const LIVE_TRACK_MS = PERSISTENCE.LIVE_TRACK_S * 1000;

/**
 * - `sprite` — the hull's baked art, stroked threat-red. A live Tier-4 track,
 *   and nothing else.
 * - `shape` — the flat resolved outline, filled. Every tier below Track, and a
 *   Track that has gone to ghost.
 */
export type ContactFidelity = 'sprite' | 'shape';

/**
 * What one contact has earned this frame.
 *
 * `ageMs` is time since the contact was last *resolved*, not since it was
 * first heard: a track the player is still holding is live however long they
 * have held it, and one they stopped holding a moment ago is not.
 */
export function contactFidelity(tier: ResolutionTier, ageMs: number): ContactFidelity {
  // Below Track there is nothing to draw a sprite *from*. The server attaches
  // `kind` and `faction` no earlier than Tier 3 and `hp`/`heading` no earlier
  // than Tier 4 (packages/backend/src/sim/systems/echoLayer.ts), so this is
  // not a stylistic cap — it is the shape of the payload. It is the half of
  // the law that does not move.
  if (tier < ResolutionTier.Track) return 'shape';
  // A ghost is a last-known position. A lit hull sitting on one would claim a
  // present tense the Echo Layer never granted (docs/ui-ux.md §4), so the
  // sprite is what a *live* track earns and the outline is what survives it.
  if (ageMs > LIVE_TRACK_MS) return 'shape';
  return 'sprite';
}
