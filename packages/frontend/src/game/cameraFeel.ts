import { CAMERA_FEEL } from '@echoes/shared';

/**
 * The free-water study's camera feel as arithmetic: docs/free-camera.md §4,
 * "The study's camera feel" (#1775). `PerspectiveView` owns the pose and every
 * clamp on it; this file owns only how the drawn pose moves toward the pose the
 * player asked for, so the six rules can be held by tests that need no GPU.
 */

/** The orbit's six numbers. A null depth is the seabed under the focus. */
export interface OrbitPose {
  x: number;
  z: number;
  depthM: number | null;
  yaw: number;
  pitch: number;
  distance: number;
}

/** One of the orbit's numbers, as a drag names the ones it moves. */
export type OrbitPart = keyof OrbitPose;

/** A pointer's place at a moment, for measuring the speed a drag ends at. */
export interface PointerSample {
  atMs: number;
  x: number;
  y: number;
}

/** A coast slower than this has stopped, screen pixels a second. */
export const COAST_STOP_PX_S = 4;

/**
 * Gaps an ease closes to nothing rather than chasing for ever. The camera is
 * re-applied only when its matrix moves (`PerspectiveView.applyCamera`), so an
 * ease that never quite arrived would repaint the chart every frame of a still
 * camera (#1032).
 */
const ARRIVED_M = 0.01;
const ARRIVED_RAD = 1e-5;
/** A focus easing onto the seabed lands within this, metres, and follows the ground again. */
const LANDED_M = 0.5;
/** A followed hull this close to the focus is held exactly rather than eased toward. */
const HELD_M = 0.5;
/** Fewer milliseconds than this between a measurement's ends is no measurement. */
const MIN_SPAN_MS = 8;

/** The share of a gap an ease closes in `dtS` (rule 3). */
export function easeShare(dtS: number, tauS: number = CAMERA_FEEL.EASE_S): number {
  return tauS <= 0 ? 1 : 1 - Math.exp(-dtS / tauS);
}

/** The short way round from one heading to another, radians in (−π, π]. */
export function shortArc(from: number, to: number): number {
  const turn = Math.PI * 2;
  let d = (to - from) % turn;
  if (d > Math.PI) d -= turn;
  else if (d <= -Math.PI) d += turn;
  return d;
}

/** A glide's progress, rest to rest (rule 4): no speed at either end. */
export function glideShare(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/**
 * The speed a drag was let go at, screen pixels a second (rule 2).
 *
 * Measured across the pointer's last moves rather than its last one: browsers
 * coalesce moves, so one event can carry two frames of travel and the next
 * none. Zero when the pointer had held still for `COAST_STILL_MS` before the
 * release, since a player who stopped and then let go asked for no coast; and
 * capped at `COAST_MAX_PX_S`, so a flick cannot spin the orbit round.
 */
export function releaseVelocity(
  samples: readonly PointerSample[],
  releasedAtMs: number
): { x: number; y: number } {
  const last = samples.at(-1);
  if (last === undefined || releasedAtMs - last.atMs > CAMERA_FEEL.COAST_STILL_MS) {
    return { x: 0, y: 0 };
  }
  let first = last;
  for (let i = samples.length - 2; i >= 0; i--) {
    const sample = samples[i]!;
    if (last.atMs - sample.atMs > CAMERA_FEEL.COAST_STILL_MS) break;
    first = sample;
  }
  const spanMs = last.atMs - first.atMs;
  if (spanMs < MIN_SPAN_MS) return { x: 0, y: 0 };
  let x = ((last.x - first.x) * 1000) / spanMs;
  let y = ((last.y - first.y) * 1000) / spanMs;
  const speed = Math.hypot(x, y);
  if (speed > CAMERA_FEEL.COAST_MAX_PX_S) {
    x *= CAMERA_FEEL.COAST_MAX_PX_S / speed;
    y *= CAMERA_FEEL.COAST_MAX_PX_S / speed;
  }
  return { x, y };
}

/** The pointer's recent places during one drag, kept short. */
export class DragSpeed {
  private readonly samples: PointerSample[] = [];

  begin(atMs: number, x: number, y: number): void {
    this.samples.length = 0;
    this.samples.push({ atMs, x, y });
  }

  move(atMs: number, x: number, y: number): void {
    this.samples.push({ atMs, x, y });
    // Only the last `COAST_STILL_MS` is ever read; a few more cover coalescing.
    if (this.samples.length > 16) this.samples.shift();
  }

  /** The release speed, and the drag forgotten. */
  release(atMs: number): { x: number; y: number } {
    const speed = releaseVelocity(this.samples, atMs);
    this.samples.length = 0;
    return speed;
  }

  clear(): void {
    this.samples.length = 0;
  }
}

/**
 * Where the study's orbit is going, and how it gets there.
 *
 * The drawn pose lives on `PerspectiveView`, which every reader of the camera
 * already reads; this holds the goal beside it, a glide in progress and the
 * coasts a released drag left. A drag writes the drawn pose and the goal alike
 * (rule 1), a step writes the goal alone (rule 3), and a jump records where
 * the camera was drawn before the goal moves (rules 4 and 5).
 */
export class OrbitFeel {
  /** Where the camera is going. */
  readonly goal: OrbitPose;
  /** A released pan still carrying, screen pixels a second. */
  readonly panCoast = { x: 0, y: 0 };
  /** A released orbit still carrying, screen pixels a second. */
  readonly orbitCoast = { x: 0, y: 0 };
  /** The pose a jump left from, its depth resolved to metres. */
  private glideFrom: OrbitPose | null = null;
  private glideT = 0;
  /**
   * Whether a followed hull's focus has reached it. From then on the focus is
   * written onto the hull each frame however fast it moves: re-measured every
   * frame instead, a hull moving more than `HELD_M` a frame never counted as
   * reached and the focus trailed it by an ease (#1775's drive, 54 m).
   */
  private held = false;

  constructor(drawn: OrbitPose) {
    this.goal = { ...drawn };
  }

  get gliding(): boolean {
    return this.glideFrom !== null;
  }

  get coasting(): boolean {
    return (
      this.panCoast.x !== 0 ||
      this.panCoast.y !== 0 ||
      this.orbitCoast.x !== 0 ||
      this.orbitCoast.y !== 0
    );
  }

  /**
   * Rule 5: the goal is where the camera is drawn, with no glide or coast
   * left. What a drag does first when a glide is under way, and what every
   * instant verb does after it, so the next step starts from the truth.
   */
  settle(drawn: OrbitPose): void {
    Object.assign(this.goal, drawn);
    this.glideFrom = null;
    this.held = false;
    this.stopCoasts();
  }

  stopCoasts(): void {
    this.panCoast.x = 0;
    this.panCoast.y = 0;
    this.orbitCoast.x = 0;
    this.orbitCoast.y = 0;
  }

  /**
   * Rule 5: a drag takes the numbers it moves out of a glide under way, so the
   * hand owns them at once, and the glide carries the rest to their end: Home
   * still arrives at north while the player pans, and a followed hull's focus
   * still arrives on it while they turn. `seabedM` stands in for a seabed
   * depth, as in `jump`. No glide, nothing to take.
   */
  take(drawn: OrbitPose, parts: readonly OrbitPart[], seabedM: number): void {
    const from = this.glideFrom;
    if (from === null) return;
    for (const part of parts) {
      if (part === 'depthM') {
        from.depthM = drawn.depthM ?? seabedM;
        this.goal.depthM = drawn.depthM;
      } else {
        from[part] = drawn[part];
        this.goal[part] = drawn[part];
      }
    }
  }

  /**
   * Rule 4: a jump leaves from where the camera is drawn. The caller writes
   * the goal it travels to afterwards. `seabedM` is the seabed under the drawn
   * focus, so a glide that leaves the ground has a depth to start from.
   */
  jump(drawn: OrbitPose, seabedM: number): void {
    Object.assign(this.goal, drawn);
    this.stopCoasts();
    this.glideFrom = { ...drawn, depthM: drawn.depthM ?? seabedM };
    this.glideT = 0;
    this.held = false;
  }

  /**
   * This frame's share of each coast, screen pixels, with the coasts decayed
   * by the water's drag (rule 2). The exact integral of the decay rather than
   * speed × dt, so a coast goes the same way at every frame rate.
   */
  takeCoast(dtS: number): { pan: { x: number; y: number }; orbit: { x: number; y: number } } {
    const decay = Math.exp(-dtS / CAMERA_FEEL.COAST_S);
    const reach = CAMERA_FEEL.COAST_S * (1 - decay);
    const pan = { x: this.panCoast.x * reach, y: this.panCoast.y * reach };
    const orbit = { x: this.orbitCoast.x * reach, y: this.orbitCoast.y * reach };
    for (const coast of [this.panCoast, this.orbitCoast]) {
      coast.x *= decay;
      coast.y *= decay;
      if (Math.hypot(coast.x, coast.y) < COAST_STOP_PX_S) {
        coast.x = 0;
        coast.y = 0;
      }
    }
    return { pan, orbit };
  }

  /**
   * One frame: move `drawn` toward the goal. A glide runs its eased path
   * (rule 4); otherwise each number closes its gap by the ease (rule 3).
   * `seabedAt` reads the seabed under a plan point, for a focus easing to or
   * from the ground. `holding` is a followed hull's focus: once the focus has
   * reached it, by a glide's end or by easing within `HELD_M`, it is held on
   * it exactly from then on rather than eased after.
   */
  step(
    drawn: OrbitPose,
    dtS: number,
    seabedAt: (x: number, z: number) => number,
    holding: boolean
  ): void {
    const goal = this.goal;
    const from = this.glideFrom;
    if (from !== null) {
      this.glideT = Math.min(1, this.glideT + dtS / CAMERA_FEEL.GLIDE_S);
      const s = glideShare(this.glideT);
      drawn.x = from.x + (goal.x - from.x) * s;
      drawn.z = from.z + (goal.z - from.z) * s;
      drawn.yaw = from.yaw + shortArc(from.yaw, goal.yaw) * s;
      drawn.pitch = from.pitch + (goal.pitch - from.pitch) * s;
      drawn.distance = from.distance + (goal.distance - from.distance) * s;
      const toDepth = goal.depthM ?? seabedAt(drawn.x, drawn.z);
      drawn.depthM = from.depthM! + (toDepth - from.depthM!) * s;
      if (this.glideT >= 1) {
        this.glideFrom = null;
        drawn.yaw = goal.yaw;
        drawn.depthM = goal.depthM;
        this.held = holding;
      }
      return;
    }

    const k = easeShare(dtS);
    if (!holding) this.held = false;
    else if (!this.held) {
      this.held =
        Math.hypot(goal.x - drawn.x, goal.z - drawn.z) < HELD_M &&
        Math.abs(
          (goal.depthM ?? seabedAt(goal.x, goal.z)) - (drawn.depthM ?? seabedAt(drawn.x, drawn.z))
        ) < HELD_M;
    }
    if (this.held) {
      drawn.x = goal.x;
      drawn.z = goal.z;
      drawn.depthM = goal.depthM;
    } else {
      drawn.x = approach(drawn.x, goal.x, k, ARRIVED_M);
      drawn.z = approach(drawn.z, goal.z, k, ARRIVED_M);
      drawn.depthM = easeDepth(drawn, goal, k, seabedAt);
    }
    const turn = shortArc(drawn.yaw, goal.yaw);
    drawn.yaw = Math.abs(turn) < ARRIVED_RAD ? goal.yaw : drawn.yaw + turn * k;
    drawn.pitch = approach(drawn.pitch, goal.pitch, k, ARRIVED_RAD);
    drawn.distance = approach(drawn.distance, goal.distance, k, ARRIVED_M);
  }
}

function approach(from: number, to: number, k: number, arrived: number): number {
  return Math.abs(to - from) < arrived ? to : from + (to - from) * k;
}

/**
 * The focus depth's ease. Either end may be the seabed (null), read under the
 * drawn focus: rising off it starts from the ground's depth, and easing onto
 * it lands, becoming null again, once within `LANDED_M`.
 */
function easeDepth(
  drawn: OrbitPose,
  goal: OrbitPose,
  k: number,
  seabedAt: (x: number, z: number) => number
): number | null {
  if (drawn.depthM === null && goal.depthM === null) return null;
  const seabed = seabedAt(drawn.x, drawn.z);
  const from = drawn.depthM ?? seabed;
  const to = goal.depthM ?? seabed;
  const next = approach(from, to, k, ARRIVED_M);
  if (goal.depthM === null && Math.abs(to - next) < LANDED_M) return null;
  return next;
}
