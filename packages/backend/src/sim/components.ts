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

/**
 * The hull's bow, in radians — docs/systems-echo.md §8.
 *
 * **Separate from `Velocity` because it has to survive a stop.** Heading was
 * derivable before this component existed: a Tier-4 contact reported
 * `atan2(Velocity.y, Velocity.x)`, which is correct while a hull is under way
 * and meaningless the instant it is not — a stopped hull has zero velocity and
 * therefore no bearing at all. §8 says a stopped hull holds the last course it
 * had, and directional signature makes that load-bearing rather than cosmetic:
 * docs/mission-aptitude.md §4's sounding is twenty seconds of a *stationary*
 * hull whose bow decides who hears it.
 *
 * So this is written by movement and never cleared by it. `Ordnance.heading` is
 * the same idea for a thing that points and goes; this is the same idea for a
 * thing that points, goes, and then stops still pointing.
 *
 * Carried by hulls only. A structure has no bow, which is why `spawnStructure`
 * does not add this and why the Echo pass can test for the component instead of
 * asking what kind of entity it is holding.
 */
export const Heading = defineComponent({
  /** Radians, `atan2(y, x)`, +x is 0 — the same convention as every other bearing. */
  rad: Types.f32,
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
  /**
   * 1 while the hull is under the floor-following standing order
   * (docs/systems-depth.md §2, "Steering along the ground"). While set, the
   * depth system retargets `targetM` from the local floor each tick; a manual
   * depth order clears it, because the newer instruction is the player's
   * current mind.
   */
  follow: Types.ui8,
});

/** Depth resilience. Below this rating's band, the unit takes crush attrition. */
export const Pressure = defineComponent({
  rating: Types.ui8,
  /** Aura-granted rating bonus (Sounding Spire). Rewritten each tick. */
  bonus: Types.ui8,
  /**
   * Cumulative hull this unit has lost to depth and can never get back, in HP.
   *
   * Tracked separately from `Health.hp` because these are the damage sources no
   * repair may ever undo, so the HUD has to be able to draw the permanently
   * lost portion of the bar differently from the part a future repair system
   * will refill (docs/ui-ux.md §8).
   *
   * Two writers, both in the pressure system and both depth: crush attrition
   * below a hull's Pressure Rating (docs/systems-depth.md §2), and the
   * Directorate's shallow-water poisoning above the Shelf line (§3). Named for
   * what the number *means* rather than for either source, because the HUD asks
   * one question of it — how much of this bar is gone for good — and the answer
   * must not depend on which way the hull overreached.
   */
  unhealable: Types.f32,
  /**
   * Sour exposure accrued in the Lid, in seconds (docs/systems-depth.md §2).
   * Counts up while the hull is above LID.DEPTH_M, capped at LID.GRACE_S —
   * bleeding is a state, not a deepening debt — and recovers below the Lid at
   * LID_GRACE_RECOVERY_PER_S, so bobbing on the boundary loses grace faster
   * than it wins it back.
   */
  sourS: Types.f32,
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

/**
 * A creature of the Drift — docs/bestiary.md.
 *
 * Deliberately *not* a Unit. Fauna carry Position, Acoustic, Owner and Health
 * like everything else, so the Echo Layer resolves them with no special case
 * at all — which is what makes §3's central claim true: at Tier 1 and Tier 2
 * nothing distinguishes a grazer from a cruiser. Only classification at Tier 3
 * tells them apart, because only then does the pass look at what components an
 * entity has.
 */
export const Fauna = defineComponent({
  species: Types.ui8,
  /** FaunaStage. */
  stage: Types.ui8,
  /** Seconds spent at or above Interest, and below it. */
  interestS: Types.f32,
  quietS: Types.f32,
  /** Seconds spent Interested, for §2's 20 s auto-commit. */
  interestedS: Types.f32,
  /** Seconds left of the Cooling disengage. */
  coolingS: Types.f32,
  /** The entity it is currently answering — the loudest, not the nearest. */
  targetEid: Types.eid,
  /** Perceived loudness of that target, last time it listened. */
  heard: Types.f32,
  /** Countdown to the next sense pass, so not every creature listens per tick. */
  senseS: Types.f32,
  /** Where it drifts back to when it cools off. */
  homeX: Types.f32,
  homeY: Types.f32,
  /**
   * The depth it holds when nothing pulls it off — the species' working depth
   * (docs/bestiary.md §4), unless an authored transit says otherwise. A
   * mission's colossus crosses the water its document puts it in: a Sounder
   * at its own 2,000 m can neither enter a muster floored at 1,900 nor grind
   * a hull holding station a hundred metres above it (docs/mission-intake.md
   * §6, §13), so the drive that steers it says how deep it runs.
   */
  homeDepth: Types.f32,
  /**
   * Scavengers only — the Echo Mark the swarm is currently drawn to, by the
   * mark's own stable id (0 = none). An id rather than a position because a
   * reinforced mark moves, and the swarm should follow the residue, not the
   * spot it first smelled it at.
   */
  scavengeMarkId: Types.ui32,
  /**
   * Lampfry only — seconds until a scattered shoal reforms. Zero means the
   * shoal is formed; any presence inside the scatter radius pins it at the
   * full reform window (docs/bestiary.md §4).
   */
  scatterS: Types.f32,
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
  /**
   * Who this structure's aura is *for*, which is usually — but not always —
   * who owns it.
   *
   * Set to `Owner.slot` at spawn and left alone by everything except a mission,
   * so for a skirmish the two are the same number and `aurasSystem` behaves
   * exactly as it always has.
   *
   * It exists because `Owner.slot` is three things at once: the aura grant key
   * here, the Echo Layer's friend/foe test, and the filter that decides whether
   * a hull is in your own force or in your contact list. The Prologue's court
   * withdraws the array it lends the flight whenever the flight is loud
   * (docs/mission-sorrowgate.md §4) — and doing that by moving ownership also
   * moved the other two: the player's own Cantor vanished from their force and
   * reappeared, at the same instant, as a fully-resolved Tier-4 foreign
   * structure in the middle of the chamber they were standing in. Withdrawing
   * a grant is not the same act as changing hands, and now it is not the same
   * write either.
   */
  grantSlot: Types.ui8,
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
  /**
   * Why the hull went Idle without being told to: 0 none, else
   * HarvestIdleReason ordinal + 1. Only meaningful while mode is Idle — a
   * player's move order and a fresh spawn both write 0, because a chosen
   * quiet is not a stall (docs/ui-ux.md §5).
   */
  idleReason: Types.ui8,
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

/**
 * Something a weapon put in the water — docs/systems-combat.md §2.
 *
 * Mutually exclusive with `Unit` and `Structure`, and that exclusivity is what
 * every other system keys off: movement moves Units, production makes Units,
 * separation spaces Units, and ordnance is none of those. What it *does* carry
 * is Position, Acoustic, Owner and Health, so the Echo Layer resolves it with
 * no special case at all — a running torpedo is a contact because nothing marks
 * it out as anything else.
 *
 * The seeker's sensitivity lives here rather than in `Acoustic.hyd`, which is
 * deliberately left at zero: `Acoustic.hyd` is what makes an entity a *listener
 * for its owner*, and a torpedo must not double as a free scout. The seeker
 * hears for itself and tells nobody.
 */
export const Ordnance = defineComponent({
  /** Index into the OrdnanceKind enum. */
  kind: Types.ui8,
  /** Seconds of run, lifetime or decoy life left. Expiry is not detonation. */
  remainingS: Types.f32,
  /** Radians. Ordnance has no MoveOrder — it points, and it goes. */
  heading: Types.f32,
  /** The seeker's listening sensitivity. 0 for ordnance that does not seek. */
  seekerHyd: Types.f32,
  /** What the seeker currently holds, or 0. */
  targetEid: Types.eid,
  /**
   * Where the launch believed the target was.
   *
   * For a Tier-2 bearing-only launch this is the *ghost* position, which lies
   * by up to 15% of range (docs/systems-combat.md §7) — the torpedo swims at
   * the lie and the seeker has to find the truth on the way. Steered toward
   * whenever the seeker holds nothing.
   */
  aimX: Types.f32,
  aimY: Types.f32,
  /**
   * Inherited from the launcher. Below the depth this rating covers, ordnance
   * implodes rather than pressing on (docs/systems-combat.md §8).
   */
  pressureRating: Types.ui8,
  /** Countdown to the next seeker re-evaluation, so seekers do not all fire on one tick. */
  seekerCooldownS: Types.f32,
  /** Countdown to the next wake mark. */
  wakeCooldownS: Types.f32,
  /**
   * Seconds a mine still needs before it can trigger.
   *
   * A mine you dropped this second is not yet a mine. It is also what the
   * laying hull is broadcasting through (docs/systems-combat.md §6): the field
   * is silent, but *making* it is not, so the arming clock and the noise are
   * the same clock.
   */
  armingS: Types.f32,
  /**
   * Seconds this piece of ordnance keeps ringing after it went off.
   *
   * A detonation is SPEC'd at SIG 90, and an event that existed for one 60 Hz
   * tick would carry a signature no listener in the game could ever resolve —
   * the Echo pass runs at 5 Hz. So the bang outlives the bomb, does no further
   * damage, and cannot trigger again.
   */
  detonatingS: Types.f32,
  /**
   * Depth a falling charge is set to detonate at, in metres.
   *
   * Its own field rather than a reuse of `aimX`/`aimY`, because those name a
   * place on the surface of the map and this names a place in the water column.
   * A depth charge is the one weapon whose aim is entirely vertical.
   */
  targetDepthM: Types.f32,
});

/**
 * Ordnance aboard a hull that can launch it.
 *
 * A magazine and not a cooldown, because scarcity is the torpedo's whole
 * identity against the gun's endless ammo (docs/systems-combat.md §5): the
 * decision a player makes is "is this worth one of my two", and a cooldown
 * would ask them "can I be bothered to wait" instead.
 */
export const Magazine = defineComponent({
  torpedoes: Types.ui8,
  /** Seconds until the next torpedo is aboard; only counts down at a depot. */
  rearmRemainingS: Types.f32,
});

/**
 * A hull's countermeasure suite — docs/systems-combat.md §5.
 *
 * A cooldown rather than a magazine, unlike torpedoes, and the asymmetry is
 * deliberate: a torpedo is an offensive commitment you can run out of, while a
 * decoy is a reflex you can only use so often. What limits it is not supply
 * but the fact that deploying one makes real noise at your real position — so
 * the interesting cost is acoustic, and a stock count would only add a second,
 * duller one on top.
 */
export const Countermeasure = defineComponent({
  cooldownRemainingS: Types.f32,
});

/**
 * A hull in the act of laying a mine — docs/systems-combat.md §6.
 *
 * Exists so the *laying* can be loud while the field is silent. Read by
 * acoustics as a SIG floor, exactly like a descent: you cannot lay a minefield
 * quietly, and a scout that hears construction-grade noise in open water and
 * finds no structure there has learned something worth knowing.
 */
export const Laying = defineComponent({
  remainingS: Types.f32,
});

/**
 * An authored, placed sound source — the taps of docs/mission-asset-recovery.md
 * §6: struck iron, in a worked pattern, on the interval.
 *
 * The carrier entity is the ordnance shape — Position, Acoustic, Owner, Health
 * and nothing else a hull would have — so the Echo Layer resolves it per
 * observer exactly like anything audible, and its Tier-3 classification names
 * *nothing*: no kind, no structure, no species, no faction. Audible, locatable,
 * and not a unit, as a property of the component signature rather than of any
 * new payload rule.
 *
 * Acoustics derives its SIG from this pattern the way it derives every SIG
 * from what the thing is doing: `sig` through each on-window, zero between
 * strikes and once silenced. A SIG-0 emitter is undetectable like anything
 * else at SIG 0 — the mix's absences are information (docs/audio-direction.md).
 */
export const StaticEmitter = defineComponent({
  /** The authored loudness of each strike window. */
  sig: Types.f32,
  /** Ticks from the start of one strike window to the start of the next. */
  periodTicks: Types.ui32,
  /** Ticks of each period the emitter is loud. */
  onTicks: Types.ui32,
  /** 1 while transmitting on its pattern; 0 once silenced. */
  active: Types.ui8,
});
