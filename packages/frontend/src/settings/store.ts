/**
 * Player settings — the shell's persistence layer (docs/ui-ux.md §14).
 *
 * `localStorage`, because these are *device preferences*: which volumes suit
 * these speakers, whether this player needs marks before sound. The
 * reconnection token stays in `sessionStorage` over in GameClient and is not
 * a setting — a held seat is per-tab state, not a preference.
 *
 * Storage throws in some privacy modes and lies in others, so every touch of
 * it is defensive: a missing, corrupt or foreign-versioned record loads as
 * the defaults, never as an error. Losing settings is a shrug; a shell that
 * cannot boot because JSON.parse threw is a bug.
 */

import { ACTIONS, DEFAULT_BINDINGS, type Bindings, type LayoutName } from '../input/bindings.ts';
import { PALETTES, type PaletteName } from '../game/palette.ts';
import type { TrimBus } from '../audio/engine.ts';

/** docs/ui-ux.md §11: "UI scale 75%-200%". */
export const UI_SCALE_MIN = 0.75;
export const UI_SCALE_MAX = 2;

export interface Settings {
  version: 1;
  /** Sent to the server on join; it truncates and defaults, we just remember. */
  profileName: string;
  /** User master volume, 0–1, composed under the engine's fixed headroom. */
  masterVolume: number;
  /** Per-bus user volume, linear 0–1 (docs/audio-direction.md §11). */
  busVolumes: Record<TrimBus, number>;
  /** Contact boost in dB, 0–12 — §11's one above-reference allowance. */
  contactBoostDb: number;
  /** Mono spatialisation — a rendering choice, never a loss (ui-ux.md §11). */
  mono: boolean;
  /** Visual-first preset — marks arrive at ≤ 30 ms, audio follows (§11). */
  visualFirst: boolean;
  /**
   * Which of §11's layouts the player started from. `custom` means they have
   * moved something; the layouts themselves are kept as names rather than as
   * a snapshot so a build that retunes the default layout retunes it for
   * everyone who never edited it.
   */
  bindingLayout: LayoutName;
  /** Bindings that differ from the layout. Merged over it, never replacing it. */
  bindings: Bindings;
  /** Colour-vision palette (ui-ux.md §11, tables in style-neon-noir.md). */
  palette: PaletteName;
  /** HUD magnification, 0.75-2. Never touches the world camera. */
  uiScale: number;
  /**
   * Reduced motion (§11) — static equivalents for the sweep, the exposure
   * flash and the crush badge.
   *
   * Defaults to the OS preference rather than to `false`: a player who has
   * already told their system they want less movement should not have to tell
   * this game too. The default only applies until they touch the control —
   * once written, an explicit `false` is honoured over the OS.
   */
  reducedMotion: boolean;
}

/**
 * The OS-level answer, when the record has not got one.
 *
 * Guarded twice over: `matchMedia` does not exist under the test runner, and
 * some privacy modes throw on it rather than answering.
 */
function prefersReducedMotion(): boolean {
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    return false;
  }
}

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  profileName: '',
  masterVolume: 1,
  busVolumes: { music: 1, world: 1, contact: 1, self: 1, ui: 1 },
  contactBoostDb: 0,
  mono: false,
  visualFirst: false,
  bindingLayout: 'default',
  bindings: { ...DEFAULT_BINDINGS },
  palette: 'standard',
  uiScale: 1,
  reducedMotion: false,
};

const STORAGE_KEY = 'echoes.settings';

type Listener = (settings: Settings) => void;
const listeners = new Set<Listener>();

const clamp01 = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

/**
 * Coerce whatever storage held into a valid Settings.
 *
 * Field-by-field rather than shape-validated whole: a record from a newer
 * build that added a field should keep everything this build understands.
 * An unknown *version* is different — the meaning of a field may have
 * changed, so it loads as defaults.
 */
function sanitise(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) return defaults();
  const record = raw as Record<string, unknown>;
  if (record.version !== 1) return defaults();
  const buses = (record.busVolumes ?? {}) as Record<string, unknown>;
  return {
    version: 1,
    profileName: typeof record.profileName === 'string' ? record.profileName : '',
    masterVolume: clamp01(record.masterVolume, DEFAULT_SETTINGS.masterVolume),
    busVolumes: {
      music: clamp01(buses.music, 1),
      world: clamp01(buses.world, 1),
      contact: clamp01(buses.contact, 1),
      self: clamp01(buses.self, 1),
      ui: clamp01(buses.ui, 1),
    },
    contactBoostDb:
      typeof record.contactBoostDb === 'number' && Number.isFinite(record.contactBoostDb)
        ? Math.min(12, Math.max(0, record.contactBoostDb))
        : 0,
    mono: record.mono === true,
    visualFirst: record.visualFirst === true,
    bindingLayout:
      record.bindingLayout === 'oneHanded' || record.bindingLayout === 'custom'
        ? record.bindingLayout
        : 'default',
    bindings: sanitiseBindings(record.bindings),
    palette:
      typeof record.palette === 'string' && record.palette in PALETTES
        ? (record.palette as PaletteName)
        : 'standard',
    uiScale:
      typeof record.uiScale === 'number' && Number.isFinite(record.uiScale)
        ? Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, record.uiScale))
        : 1,
    reducedMotion:
      typeof record.reducedMotion === 'boolean' ? record.reducedMotion : prefersReducedMotion(),
  };
}

/**
 * The defaults as this device would have them — everything in
 * `DEFAULT_SETTINGS`, plus whatever the OS has already said.
 */
function defaults(): Settings {
  return { ...DEFAULT_SETTINGS, reducedMotion: prefersReducedMotion() };
}

/**
 * Coerce a stored binding table.
 *
 * Every action falls back to its default independently, so a record written
 * before an action existed gains that action's default rather than leaving it
 * unbound — an unbound action is a control the player cannot reach and cannot
 * see is missing. Non-string values are simply ignored: storage is a place
 * other code writes to, and a number where a code belongs should cost the
 * player one binding, not the whole settings record.
 */
function sanitiseBindings(raw: unknown): Bindings {
  const stored = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const merged = { ...DEFAULT_BINDINGS };
  for (const { action } of ACTIONS) {
    const code = stored[action];
    if (typeof code === 'string' && code.length > 0) merged[action] = code;
  }
  return merged;
}

export function loadSettings(): Settings {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (stored === null || stored === undefined) return defaults();
    return sanitise(JSON.parse(stored));
  } catch {
    return defaults();
  }
}

export function saveSettings(patch: Partial<Omit<Settings, 'version'>>): Settings {
  const next: Settings = sanitise({ ...loadSettings(), ...patch, version: 1 });
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage refused — the settings still apply for this session.
  }
  for (const listener of listeners) listener(next);
  return next;
}

/**
 * Change notification, for whoever holds live audio/renderer handles when a
 * setting moves — the settings screen writes here, the match applies it.
 * Returns the unsubscribe.
 */
export function subscribeSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
