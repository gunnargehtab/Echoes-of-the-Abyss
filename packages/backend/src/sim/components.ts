/**
 * ECS components (bitecs).
 *
 * bitecs stores each field as a flat TypedArray indexed by entity id, so
 * components hold plain numbers only — no objects, no strings. Anything richer
 * (names, faction metadata) lives in side tables keyed by entity id.
 */

import { defineComponent, Types } from 'bitecs';

/** World position in metres. `depth` is the vertical axis. docs/systems-depth.md */
export const Position = defineComponent({
  x: Types.f32,
  y: Types.f32,
  depth: Types.f32,
});

/** Metres per second. */
export const Velocity = defineComponent({
  x: Types.f32,
  y: Types.f32,
});

/** Where the unit is trying to get to. Zeroed when it arrives. */
export const MoveOrder = defineComponent({
  x: Types.f32,
  y: Types.f32,
  active: Types.ui8,
});

/**
 * The Echo Layer's two numbers.
 *
 * `sig` is live and recomputed every tick from what the unit is doing;
 * `hyd` is a fixed listening sensitivity from the unit's stat block.
 */
export const Acoustic = defineComponent({
  sig: Types.f32,
  hyd: Types.f32,
  /** Remaining seconds on a transient SIG spike (firing, breaking silence). */
  spikeRemainingS: Types.f32,
  /** Magnitude of that spike. */
  spikeAmount: Types.f32,
});

/** Depth resilience. Below this rating's band, the unit takes crush attrition. */
export const Pressure = defineComponent({
  rating: Types.ui8,
});

export const Health = defineComponent({
  hp: Types.f32,
  max: Types.f32,
});

/** Which player slot owns this entity. */
export const Owner = defineComponent({
  slot: Types.ui8,
  faction: Types.ui8,
});

/** Index into the UnitKind enum. */
export const Unit = defineComponent({
  kind: Types.ui8,
});

/** Tag-ish component: silent running trades speed and weapons for quiet. */
export const SilentRunning = defineComponent({
  active: Types.ui8,
});

/** An active sonar ping in flight. docs/systems-echo.md §5. */
export const ActivePing = defineComponent({
  remainingS: Types.f32,
});
