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

/** Index into the StructureKind enum. Mutually exclusive with Unit. */
export const Structure = defineComponent({
  kind: Types.ui8,
});

/** A structure still being commissioned. Removed when construction completes. */
export const UnderConstruction = defineComponent({
  remainingS: Types.f32,
  totalS: Types.f32,
});

/**
 * A mineable nodule field. Not owned, not acoustic, not a combatant — it is
 * terrain with a quantity attached.
 */
export const ResourceNode = defineComponent({
  remaining: Types.f32,
});

/**
 * The harvester's C&C loop, as a small state machine.
 * mode: 0 idle, 1 travelling to node, 2 mining, 3 hauling to depot.
 */
export const Harvester = defineComponent({
  mode: Types.ui8,
  cargo: Types.f32,
  /** Entity id of the target node; only meaningful in modes 1-2. */
  nodeEid: Types.eid,
  /** Entity id of the depot being hauled to; only meaningful in mode 3. */
  depotEid: Types.eid,
  /** HarvestThrottle ordinal. docs/economy.md §3. */
  throttle: Types.ui8,
});

export const HarvestMode = {
  Idle: 0,
  ToNode: 1,
  Mining: 2,
  ToDepot: 3,
} as const;

/**
 * Anything that can shoot: armed units and the Sentinel Turret.
 * A zero targetEid means no target (entity 0 is never spawned as a combatant).
 */
export const Weapon = defineComponent({
  cooldownRemainingS: Types.f32,
  /** Explicit attack order from the player; cleared when the target dies. */
  orderedTargetEid: Types.eid,
});
