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

import type { TrimBus } from '../audio/engine.ts';

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
}

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  profileName: '',
  masterVolume: 1,
  busVolumes: { music: 1, world: 1, contact: 1, self: 1, ui: 1 },
  contactBoostDb: 0,
  mono: false,
  visualFirst: false,
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
  if (typeof raw !== 'object' || raw === null) return DEFAULT_SETTINGS;
  const record = raw as Record<string, unknown>;
  if (record.version !== 1) return DEFAULT_SETTINGS;
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
  };
}

export function loadSettings(): Settings {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (stored === null || stored === undefined) return DEFAULT_SETTINGS;
    return sanitise(JSON.parse(stored));
  } catch {
    return DEFAULT_SETTINGS;
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
