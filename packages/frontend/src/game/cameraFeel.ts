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

const ORBIT_PARTS: readonly OrbitPart[] = ['x', 'z', 'depthM', 'yaw', 'pitch', 'distance'];

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
    // Only the last `COAST_STILL_MS` before the newest is ever read, so that
    // is what is kept: by time, not by count, since a mouse polled at 4 kHz
    // fills sixteen samples in four milliseconds, under `MIN_SPAN_MS`, and no
    // release would ever coast.
    let drop = 0;
    while (
      drop < this.samples.length - 1 &&
      atMs - this.samples[drop]!.atMs > CAMERA_FEEL.COAST_STILL_MS
    ) {
      drop++;
    }
    if (drop > 0) this.samples.splice(0, drop);
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
  /**
   * The numbers a glide still carries along its path. A jump hands it all six,
   * and a drag takes back what it moves (`take`), which the hand then owns.
   */
  private readonly glideParts = new Set<OrbitPart>();
  /**
   * For a gliding number a step has moved since the jump (`beforeStep`): the
   * end its glide still runs to, and the step's own change easing on top of
   * the glide's path (rule 3 inside rule 4). When the glide ends, what is left
   * of the change goes on easing, from wherever the two have got to.
   */
  private readonly glideEnds = new Map<OrbitPart, number | null>();
  private readonly stepOffsets = new Map<OrbitPart, number>();
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
    this.endGlide();
    this.held = false;
    this.stopCoasts();
  }

  private endGlide(): void {
    this.glideFrom = null;
    this.glideParts.clear();
    this.glideEnds.clear();
    this.stepOffsets.clear();
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
   * still arrives on it while they turn. No glide, nothing to take.
   */
  take(drawn: OrbitPose, parts: readonly OrbitPart[]): void {
    if (this.glideFrom === null) return;
    for (const part of parts) {
      this.glideParts.delete(part);
      this.glideEnds.delete(part);
      this.stepOffsets.delete(part);
      if (part === 'depthM') this.goal.depthM = drawn.depthM;
      else this.goal[part] = drawn[part];
    }
    if (this.glideParts.size === 0) this.endGlide();
  }

  /**
   * Rule 3 inside rule 4: a step is about to move where these numbers are
   * going. One a glide still carries keeps its glide to the end it had, and
   * the step's own change eases on top of the glide's path. So a notch
   * mid-glide neither lands at once by however far the glide had got nor
   * turns the rest of the glide into an ease (#1775 rounds 1 and 2). Call it
   * before the step writes the goal.
   */
  beforeStep(parts: readonly OrbitPart[]): void {
    if (this.glideFrom === null) return;
    for (const part of parts) {
      if (!this.glideParts.has(part) || this.glideEnds.has(part)) continue;
      this.glideEnds.set(part, this.goal[part]);
      this.stepOffsets.set(part, 0);
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
    this.glideParts.clear();
    for (const part of ORBIT_PARTS) this.glideParts.add(part);
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
   * One frame: move `drawn` toward the goal. The numbers a glide still
   * carries run its eased path (rule 4); the rest close their gap by the ease
   * (rule 3). `seabedAt` reads the seabed under a plan point, for a focus
   * easing to or from the ground. `holding` is a followed hull's focus: once
   * the focus has reached it, by a glide's end or by easing within `HELD_M`,
   * it is held on it exactly from then on rather than eased after.
   */
  step(
    drawn: OrbitPose,
    dtS: number,
    seabedAt: (x: number, z: number) => number,
    holding: boolean
  ): void {
    const goal = this.goal;
    const from = this.glideFrom;
    const k = easeShare(dtS);
    let s = 0;
    if (from !== null) {
      this.glideT = Math.min(1, this.glideT + dtS / CAMERA_FEEL.GLIDE_S);
      s = glideShare(this.glideT);
    }
    const glides = (part: OrbitPart) => from !== null && this.glideParts.has(part);

    if (!holding) this.held = false;
    else if (!this.held && !glides('x')) {
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
      drawn.x = glides('x')
        ? this.along('x', from!, s, k)
        : approach(drawn.x, goal.x, k, ARRIVED_M);
      drawn.z = glides('z')
        ? this.along('z', from!, s, k)
        : approach(drawn.z, goal.z, k, ARRIVED_M);
      if (glides('depthM')) {
        const end = this.glideEnds.has('depthM') ? this.glideEnds.get('depthM')! : goal.depthM;
        const seabed = seabedAt(drawn.x, drawn.z);
        const toDepth = end ?? seabed;
        drawn.depthM =
          from!.depthM! +
          (toDepth - from!.depthM!) * s +
          this.offsetToward('depthM', (goal.depthM ?? seabed) - toDepth, k);
      } else {
        drawn.depthM = easeDepth(drawn, goal, k, seabedAt);
      }
    }
    if (glides('yaw')) drawn.yaw = from!.yaw + shortArc(from!.yaw, goal.yaw) * s;
    else {
      const turn = shortArc(drawn.yaw, goal.yaw);
      drawn.yaw = Math.abs(turn) < ARRIVED_RAD ? goal.yaw : drawn.yaw + turn * k;
    }
    drawn.pitch = glides('pitch')
      ? from!.pitch + (goal.pitch - from!.pitch) * s
      : approach(drawn.pitch, goal.pitch, k, ARRIVED_RAD);
    drawn.distance = glides('distance')
      ? this.along('distance', from!, s, k)
      : approach(drawn.distance, goal.distance, k, ARRIVED_M);

    if (from !== null && this.glideT >= 1) {
      // What the glide carried arrives exactly, not by floating-point nearly.
      // A number a step moved mid-glide stays where it is drawn, its glide done
      // and its step's change still easing, from here as an ordinary ease.
      for (const part of this.glideParts) {
        if (this.glideEnds.has(part)) continue;
        if (part === 'depthM') drawn.depthM = goal.depthM;
        else drawn[part] = goal[part];
      }
      if (holding && this.glideParts.has('x') && !this.glideEnds.has('x')) this.held = true;
      this.endGlide();
    }
  }

  /**
   * A gliding number's place this frame: its path to the end it had, and a
   * step's change easing on top when a step came mid-glide (`beforeStep`).
   */
  private along(part: 'x' | 'z' | 'distance', from: OrbitPose, s: number, k: number): number {
    const goal = this.goal[part];
    const end = this.glideEnds.has(part) ? (this.glideEnds.get(part) as number) : goal;
    return from[part] + (end - from[part]) * s + this.offsetToward(part, goal - end, k);
  }

  /** A step's change on a gliding number, eased one frame toward `change` (rule 3). */
  private offsetToward(part: OrbitPart, change: number, k: number): number {
    const now = this.stepOffsets.get(part);
    if (now === undefined) return 0;
    const next = approach(now, change, k, ARRIVED_M);
    this.stepOffsets.set(part, next);
    return next;
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
