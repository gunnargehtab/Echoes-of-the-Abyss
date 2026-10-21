/**
 * Whether an in-match log is folded — docs/ui-ux.md §2 ("A panel may fold")
 * and §10.
 *
 * Remembered on the device as a convenience to whoever sits at it, and only
 * that: nothing in a log is a rule, so a fold that came back empty or could
 * not be written costs a click and never a fact. Which is why every read and
 * write is caught and swallowed — a private window, blocked site data or a
 * runner with no `localStorage` at all must still render the log, open.
 *
 * The orders panel's withheld list does **not** come through here, and that
 * is the §10.5 decision rather than an omission: a fold remembered into the
 * next mission would put that mission's rules behind a count before the
 * player had read them.
 */

import { useCallback, useState } from 'react';

/** Beside `echoes.settings` and `echoes.progression`, and not part of either. */
const STORAGE_KEY = 'echoes.hud.folds';

/** The panels that may fold and be remembered. A closed list on purpose. */
export type FoldablePanel = 'contactLog' | 'missionLog';

/**
 * How many rows a folded log keeps on screen: the newest two.
 *
 * Two rather than one because detections arrive in pairs as often as not — a
 * contact and the tier it settled on, a ping and the exposure it caused — and
 * one row would split the pair at the moment it is read (§10). Newest, so a
 * row that lands while the log is folded is always one of them: a fold never
 * hides a row the moment it arrives.
 */
export const FOLDED_ROWS = 2;

function readAll(): Partial<Record<FoldablePanel, boolean>> {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw == null) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Partial<Record<FoldablePanel, boolean>>)
      : {};
  } catch {
    return {};
  }
}

/** True only where a fold was stored as exactly `true`; anything else is open. */
export function readFold(panel: FoldablePanel): boolean {
  return readAll()[panel] === true;
}

export function writeFold(panel: FoldablePanel, folded: boolean): void {
  try {
    globalThis.localStorage?.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...readAll(), [panel]: folded })
    );
  } catch {
    // A fold that cannot be remembered is still a fold for this match.
  }
}

/** A log's fold state, starting from what this device remembered. */
export function usePanelFold(panel: FoldablePanel): [folded: boolean, toggle: () => void] {
  const [folded, setFolded] = useState(() => readFold(panel));
  const toggle = useCallback(() => {
    writeFold(panel, !folded);
    setFolded(!folded);
  }, [folded, panel]);
  return [folded, toggle];
}

export interface PanelFoldButtonProps {
  /** The panel's title, which is also the button's accessible name. */
  title: string;
  folded: boolean;
  /** The id of the region this button folds, for `aria-controls`. */
  controls: string;
  onToggle(): void;
}

/**
 * The title strip as the fold's button (§2's first rule).
 *
 * The whole strip rather than a chevron in its corner, so the target is the
 * strip's full width. The name stays the panel's title and does not change
 * with the state, because `aria-expanded` is what carries the state and a
 * screen reader announces it as it moves; a label that also flipped between
 * "collapse" and "expand" would say it twice. The chevron is decoration for a
 * sighted reader and is kept out of the name.
 */
export function PanelFoldButton({ title, folded, controls, onToggle }: PanelFoldButtonProps) {
  return (
    <button
      type="button"
      className="panel-fold"
      aria-label={title}
      aria-expanded={!folded}
      aria-controls={controls}
      onClick={onToggle}
    >
      <span>{title}</span>
      <span className="panel-fold-mark" aria-hidden="true">
        {folded ? '\u25B8' : '\u25BE'}
      </span>
    </button>
  );
}

/**
 * Whether row `index` of `count` is folded out of sight.
 *
 * Hidden rather than unmounted (§2's fourth rule): the row stays in the log's
 * `aria-live` region and in the document, whole and in order, for the moment
 * the log is opened.
 */
export function foldedOut(folded: boolean, index: number, count: number): boolean {
  return folded && index < count - FOLDED_ROWS;
}
