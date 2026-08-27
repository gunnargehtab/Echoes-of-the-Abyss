/**
 * Echo Marks, and the sonar scope's copy of them — docs/ui-ux.md §5, §13.
 *
 * The world layer has drawn residue since #106; the scope never did, which
 * made it the one instrument that did not read a layer the client was already
 * holding. Both layers now draw the same marks from the same ink, which is
 * what §5 asks for when it says "past and present must never share an ink" —
 * the rule is about marks against *contacts*, and it would be broken just as
 * badly by residue that changed colour between the two views the player reads
 * the same water in.
 *
 * The scope is not a smaller world view, though, and three things have to be
 * settled differently at 170 pixels than at map scale:
 *
 * - **Scale.** A mark styled in metres collapses toward a pixel, and a mark
 *   that is legible in the world and invisible on the scope has not been
 *   drawn. So the scope stain has a floor, and the ink the shrink cost it
 *   comes back as opacity.
 * - **Precedence.** §1.3 puts residue under live contacts. The scope draws
 *   this layer between the terrain wash and the returns, and caps its opacity
 *   below the faintest return so no stain ever out-inks a contact.
 * - **Torpedo wakes are a line, not a blob.** Sized by the same rule as the
 *   other kinds they would fatten into a bar and smear the track back into a
 *   vague area, so they get their own rule below.
 *
 * No server work and no wire change: `EchoSnapshot.marks` is already resolved
 * per listener against their HYD, and this module only draws what arrived.
 */

import type { Graphics } from 'pixi.js';
import { ECHO_MARKS, EchoMarkKind, type EchoMarkInfo } from '@echoes/shared';

/**
 * How each kind of residue is drawn.
 *
 * Deliberately dim and desaturated against the contact palette: a mark must
 * never be mistaken for a contact (docs/audio-direction.md §6 states the rule
 * for the mix; it holds for the screen too), and it must never be mistaken for
 * nothing either, "or the scouting economy dies".
 */
export const MARK_STYLE: Record<EchoMarkKind, { color: number; alpha: number; radiusM: number }> = {
  [EchoMarkKind.Battle]: { color: 0xb4553c, alpha: 0.3, radiusM: 320 },
  [EchoMarkKind.DestroyedStructure]: { color: 0x8c6a44, alpha: 0.34, radiusM: 420 },
  // The hum reads cooler and wider: it is a state, not an event, and a player
  // should be able to tell at a glance that they have found an economy rather
  // than a fight.
  [EchoMarkKind.IndustrialHum]: { color: 0x3f7f86, alpha: 0.28, radiusM: 520 },
  // Tight and pale, because a wake is the one piece of residue whose *shape*
  // carries information: laid down once a second along a torpedo's run, a
  // string of small marks draws the track it took, and a wide blob would smear
  // the line back into a single vague area (docs/systems-combat.md §12).
  [EchoMarkKind.TorpedoWake]: { color: 0x9fb6c4, alpha: 0.24, radiusM: 160 },
};

/**
 * A mark's drawn radius in metres.
 *
 * The intensity is the information — for a battle site it is how much shooting
 * happened, for the hum it is throughput — so the drawing scales with it
 * rather than merely fading. Shared by both layers so a stain cannot be one
 * size in the world and a different size on the scope.
 */
export function markRadiusM(kind: EchoMarkKind, intensity: number): number {
  return MARK_STYLE[kind].radiusM * (0.55 + intensity * 0.45);
}

/**
 * The smallest a scope stain is allowed to draw, in scope pixels.
 *
 * TUNABLE. Under this a mark is a speck indistinguishable from the terrain
 * grain; at it, a stain is still smaller and softer than a Tier-1 haze (7 px),
 * which is the return it is most likely to sit near.
 */
export const SCOPE_MARK_MIN_PX = 3;

/**
 * And the largest, in scope pixels.
 *
 * TUNABLE. A full-intensity industrial hum draws about 11 px on an 8,000 m map
 * at the wide scope, so this bites only on a map small enough that residue
 * would otherwise blanket the instrument. The layer stays a layer.
 */
export const SCOPE_MARK_MAX_PX = 12;

/**
 * The most opaque a single scope stain ring may be drawn.
 *
 * The Precedence Law's visual half: residue sits under live contacts, so it
 * may never be inked more strongly than one. The two discs below compose to
 * `1 - (1 - a/2)(1 - a)`, so the cap is solved from the Tier-1 haze's 0.22 —
 * the faintest return the scope draws — rather than picked: 0.15 composes to
 * 0.214 and the next step up crosses it. Anything above that and the ground
 * that remembers would be louder than the water that is occupied.
 */
export const SCOPE_MARK_MAX_ALPHA = 0.15;

/**
 * How much of the world alpha a scope stain keeps per unit of lost area.
 *
 * TUNABLE. A 400 m stain becomes 8 px; the wash that was legible spread over a
 * quarter of the world view is not legible in a thumbnail at the same opacity,
 * so the ink lost to the shrink comes back as opacity — bounded by the cap
 * above, which is what stops the compensation from becoming a promotion.
 */
export const SCOPE_MARK_ALPHA_GAIN = 2;

/**
 * A wake dot's radius as a fraction of the closest two marks can ever be.
 *
 * The wake's geometry survives on the scope because of a server rule rather
 * than a lucky scale: marks of one kind within `ECHO_MARKS.MERGE_RADIUS_M`
 * reinforce instead of accumulating, so two *distinct* wake marks are never
 * nearer than that, whatever the torpedo's speed or the wake interval. Sizing
 * the dot at a quarter of that span leaves at least half the gap between two
 * of them open at every zoom — a dotted track, which is what a wake is, and
 * never a bar, which is what a wake is not.
 */
export const SCOPE_WAKE_SPACING_FRACTION = 0.25;

/**
 * Below this radius in scope pixels, wakes are dropped rather than drawn.
 *
 * The issue's one judgement call, resolved in favour of dropping. A dot too
 * small to hold a gap against its neighbours is a smear that claims to be a
 * track, and a scope that smears is worse than a scope that stays quiet: the
 * player would read a continuous area where ordnance flew a line. On the
 * shipped maps and both scope sizes the dot lands at 1.1–1.7 px, so this is a
 * guard against a future map rather than a live condition — but it is the
 * difference between a rule and a coincidence.
 */
export const SCOPE_WAKE_MIN_PX = 0.75;

/**
 * The wake dot's opacity ramp, floor and ceiling.
 *
 * Compressed rather than proportional. A wake mark carries an intensity around
 * 0.05–0.3, and at the world alpha of 0.24 that is an opacity of one or two
 * percent — on a 1.7 px dot, nothing at all, which would be a dropped layer
 * pretending to be a drawn one. Decay still has to read, because §5 counts
 * decay as information rather than movement and keeps it under reduced motion,
 * so intensity moves the dot across this range instead of scaling it from
 * zero. The ceiling stays under the Tier-1 haze's 0.22 for the same reason the
 * stain cap does.
 */
export const SCOPE_WAKE_ALPHA_MIN = 0.12;
export const SCOPE_WAKE_ALPHA_MAX = 0.2;

/** The wake dot's radius in scope pixels, or null when the layer drops it. */
export function scopeWakeRadiusPx(k: number): number | null {
  const radius = ECHO_MARKS.MERGE_RADIUS_M * k * SCOPE_WAKE_SPACING_FRACTION;
  return radius >= SCOPE_WAKE_MIN_PX ? radius : null;
}

/** A stain's radius in scope pixels: metres, floored so it stays legible. */
export function scopeMarkRadiusPx(kind: EchoMarkKind, intensity: number, k: number): number {
  const metres = markRadiusM(kind, intensity) * k;
  return Math.min(SCOPE_MARK_MAX_PX, Math.max(SCOPE_MARK_MIN_PX, metres));
}

/** A stain's per-ring opacity: the world's ink, compensated and capped. */
export function scopeMarkAlpha(kind: EchoMarkKind, intensity: number): number {
  return Math.min(SCOPE_MARK_MAX_ALPHA, intensity * MARK_STYLE[kind].alpha * SCOPE_MARK_ALPHA_GAIN);
}

/**
 * Acoustic residue on the sonar scope — docs/ui-ux.md §5.
 *
 * "A separate dimmer layer, drawn beneath returns, in a colder hue." Called
 * between the scope's terrain wash and its returns, in scope-local coordinates
 * (`k` is map metres per scope pixel, and the caller has already positioned
 * the graphics at the scope's rect).
 *
 * No outline, no glyph and no crisp edge, exactly as in the world: nothing
 * here may read as a *thing*, only as ground that remembers. And nothing here
 * says whose it was or what was lost — the scouting economy is the player
 * making that inference, and a scope that made it for them would take the
 * interesting half (`shared/src/types.ts`, `EchoMarkKind`).
 */
export function drawScopeEchoMarks(g: Graphics, marks: readonly EchoMarkInfo[], k: number): void {
  const wakeRadius = scopeWakeRadiusPx(k);
  for (const mark of marks) {
    const style = MARK_STYLE[mark.kind];
    if (style === undefined) continue;
    const cx = mark.x * k;
    const cy = mark.y * k;

    if (mark.kind === EchoMarkKind.TorpedoWake) {
      // Deliberately not given the stain's floor: the floor is what would
      // fatten a string of dots into the bar this layer refuses to draw.
      if (wakeRadius === null) continue;
      const t = Math.min(1, Math.max(0, mark.intensity));
      g.circle(cx, cy, wakeRadius).fill({
        color: style.color,
        alpha: SCOPE_WAKE_ALPHA_MIN + t * (SCOPE_WAKE_ALPHA_MAX - SCOPE_WAKE_ALPHA_MIN),
      });
      continue;
    }

    // Two soft discs rather than one: residue has no edge, and a single disc
    // at any alpha reads as an object sitting on the seabed. The world layer
    // spends three on a stain hundreds of metres across; a stain a few pixels
    // across cannot show a third band, and drawing one would only cost fill.
    const radius = scopeMarkRadiusPx(mark.kind, mark.intensity, k);
    const alpha = scopeMarkAlpha(mark.kind, mark.intensity);
    g.circle(cx, cy, radius).fill({ color: style.color, alpha: alpha / 2 });
    g.circle(cx, cy, radius * 0.6).fill({ color: style.color, alpha });
  }
}
