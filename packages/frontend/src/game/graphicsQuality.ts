/**
 * The Graphics quality a player chooses: Low or High
 * (docs/graphics-standards.md gate 6, "Two graphics qualities";
 * docs/glossary.md, "Graphics quality").
 *
 * Low is the shipped renderer and the default. High is the lit world layer
 * (docs/art-direction.md, "Two layers, two laws"), in development until the
 * owner accepts a frame of it (#1801): production code behind this setting,
 * never behind a development URL flag.
 *
 * Three-free, like `lampHalo.ts`, so the settings store and its screen hold
 * it without a context. The view publishes what it is drawing the way the
 * lamp halo does (`lampHaloStatus.ts`): Settings is a shell screen with no
 * handle on the view.
 */

export type GraphicsQuality = 'low' | 'high';

/** TUNABLE: stays Low until the owner accepts a High frame and says it moves (gate 6). */
export const GRAPHICS_QUALITY_DEFAULT: GraphicsQuality = 'low';

/** A stored value, or the default for anything else. */
export function graphicsQualityOf(raw: unknown): GraphicsQuality {
  return raw === 'high' || raw === 'low' ? raw : GRAPHICS_QUALITY_DEFAULT;
}

/**
 * Whether this build offers the control. The hosted playtest build hides it
 * until a High frame is accepted (gate 6), and is told so when its image is
 * built (`ECHOES_HOSTED`, deploy/compose.playtest.yml).
 */
export function graphicsQualityOffered(hosted: string | undefined): boolean {
  return (hosted?.trim() ?? '') !== '1';
}

export const GRAPHICS_QUALITY_OFFERED = graphicsQualityOffered(import.meta.env?.VITE_ECHOES_HOSTED);

/** The quality a view is asked for: a build that hides the control draws Low. */
export function askedGraphicsQuality(
  setting: GraphicsQuality,
  offered = GRAPHICS_QUALITY_OFFERED
): GraphicsQuality {
  return offered ? setting : 'low';
}

/**
 * What the view is drawing. `high` is the lit world layer; `low` is the
 * shipped renderer, asked for or not; `unavailable: <reason>` is High asked
 * for and refused, by the display or by a view High does not reach yet.
 */
export type GraphicsQualityState = 'low' | 'high' | `unavailable: ${string}`;

type Listener = (state: GraphicsQualityState) => void;
const listeners = new Set<Listener>();
let current: GraphicsQualityState = 'low';

/** The state the view last published; `low` before any view has mounted. */
export function graphicsQualityStatus(): GraphicsQualityState {
  return current;
}

/** Published by the view after every change; the probe reads the same string. */
export function publishGraphicsQualityStatus(state: GraphicsQualityState): void {
  if (state === current) return;
  current = state;
  for (const listener of listeners) listener(state);
}

/** Subscribe to changes; returns the unsubscribe, `useSyncExternalStore`'s shape. */
export function subscribeGraphicsQualityStatus(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Why High was refused, or null while it is not. */
export function graphicsQualityUnavailableReason(
  state: GraphicsQualityState = current
): string | null {
  return state.startsWith('unavailable: ') ? state.slice('unavailable: '.length) : null;
}
