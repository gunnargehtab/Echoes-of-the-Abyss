/**
 * The arch study's development flag — docs/sorrowgate-arch-study.md §7
 * "Isolation"; docs/graphics-standards.md gate 1, "Public landmarks" (#1637).
 *
 * The study draws Sorrowgate's public landmark, its licensed light and its
 * licensed motion on the prologue's mission look alone, and only for a
 * development build opened with `?arch-study=1`. Off, the tutorial is
 * today's; on, Radicals on the same ground, every other mission and every
 * skirmish still draw no landmark, because the view asks for a map's
 * landmarks only under the 'sorrowgate' look (PerspectiveView.ts
 * `studyLandmarks`). No shipped build can turn it on: promoting the study is
 * a written decision in graphics-standards.md, then one line here.
 */
export function archStudyEnabled(dev: boolean, search: string): boolean {
  return dev && new URLSearchParams(search).get('arch-study') === '1';
}

/** The predicate is the only gate. */
export const ARCH_STUDY_ON = archStudyEnabled(
  import.meta.env?.DEV === true,
  typeof window === 'undefined' ? '' : window.location.search
);
