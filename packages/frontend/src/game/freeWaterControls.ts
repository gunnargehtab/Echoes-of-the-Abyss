/** One opt-in gate for the camera/order study and its later authored fixture. */
export function freeWaterControlsEnabled(dev: boolean, search: string): boolean {
  const params = new URLSearchParams(search);
  return dev && (params.get('freeWaterControls') === '1' || params.get('study') === 'free-water');
}

export const FREE_WATER_CONTROLS = freeWaterControlsEnabled(
  import.meta.env?.DEV === true,
  typeof window === 'undefined' ? '' : window.location.search
);
