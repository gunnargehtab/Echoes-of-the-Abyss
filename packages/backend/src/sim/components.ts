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
  /**
   * Emission-side propagation multiplier, 1 unless inside an allied Baffle
   * Barge bubble. Written by the auras system each tick; the Echo Layer
   * multiplies terrain PF by it, so masking composes with biome cover.
   */
  pfFactor: Types.f32,
  /**
   * Emission multiplier, 1 unless inside a Spore Veil cloud (symmetric —
   * friend or foe). Written by the auras system each tick; acoustics applies
   * it to the derived SIG, so the veil quiets whatever the entity is doing.
   */
  sigFactor: Types.f32,
});

/**
 * Where the unit is trying to get to vertically. docs/systems-depth.md §2.
 *
 * Separate from MoveOrder because the two axes are genuinely independent: a
 * hull can dive while crossing ground, and the vertical leg obeys its own
 * asymmetric rates rather than the hull's speed stat.
 */
export const DepthOrder = defineComponent({
  /** Ordered depth in metres. Meaningless while `active` is 0. */
  targetM: Types.f32,
  active: Types.ui8,
  /**
   * 1 on ticks where the hull is actually descending. Written by the depth
   * system and read by acoustics, so "descent is loud" is a fact about this
   * tick rather than something two systems each re-derive and disagree on.
   */
  descending: Types.ui8,
});

/** Depth resilience. Below this rating's band, the unit takes crush attrition. */
export const Pressure = defineComponent({
  rating: Types.ui8,
  /** Aura-granted rating bonus (Sounding Spire). Rewritten each tick. */
  bonus: Types.ui8,
  /**
   * Cumulative crush attrition this hull has taken, in HP.
   *
   * Tracked separately from `Health.hp` because crush is the one damage source
   * that no repair may ever undo (docs/systems-depth.md §2), so the HUD has to
   * be able to draw the permanently lost portion of the bar differently from
   * the part a future repair system will refill (docs/ui-ux.md §8).
   */
  crushTaken: Types.f32,
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
  /** ResourceKind ordinal. Nodule fields and crystal fields are worked alike
   *  but priced, paced and placed differently (docs/economy.md §2, §7). */
  kind: Types.ui8,
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
  /** ResourceKind ordinal of whatever is in the hold. */
  cargoKind: Types.ui8,
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
