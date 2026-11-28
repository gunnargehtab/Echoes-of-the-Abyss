/** One opt-in gate for the camera/order study and its later authored fixture. */
export function freeWaterControlsEnabled(dev: boolean, search: string): boolean {
  const params = new URLSearchParams(search);
  return dev && (params.get('freeWaterControls') === '1' || params.get('study') === 'free-water');
}

export const FREE_WATER_CONTROLS = freeWaterControlsEnabled(
  import.meta.env?.DEV === true,
  typeof window === 'undefined' ? '' : window.location.search
);

export const FREE_WATER_SLICE =
  FREE_WATER_CONTROLS &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('study') === 'free-water';

/**
 * The crater's two-seat fight (docs/free-water-slice.md §9, #1754):
 * `?study=free-water&seats=2`, behind the study's own gate. The first client
 * creates the private room; the second adds `&room=<code>` from the lobby.
 */
export const FREE_WATER_DUEL =
  FREE_WATER_SLICE && new URLSearchParams(window.location.search).get('seats') === '2';

/** The room code the second commander joins the fight by, or undefined. */
export const FREE_WATER_DUEL_ROOM: string | undefined = FREE_WATER_DUEL
  ? (new URLSearchParams(window.location.search).get('room') ?? undefined)
  : undefined;
