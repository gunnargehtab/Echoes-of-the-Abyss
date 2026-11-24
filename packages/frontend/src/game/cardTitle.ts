/**
 * The selection card's first line — docs/ui-ux.md §9, "The card names a
 * mission's hull".
 *
 * Its own module so a test can hold the line to the section without booting a
 * renderer: the class alone in a skirmish, the mission's name for the hull
 * before the class in a mission that names it, and the rest of a selection
 * counted after either. Uppercase here, because the display voice is uppercase
 * (docs/style-neon-noir.md "Typography") and canvas text has no
 * text-transform.
 *
 * The name comes from the server's own-force list (`OwnUnit.callsign`) and is
 * never looked up here: a mission's literal is the server's, and the client
 * names only what it was told is its own.
 */
export function cardTitle(
  className: string,
  callsign: string | undefined,
  selected: number
): string {
  const titled = callsign === undefined ? className : `${callsign} · ${className}`;
  const shown = selected > 1 ? `${titled} +${selected - 1}` : titled;
  return shown.toUpperCase();
}
