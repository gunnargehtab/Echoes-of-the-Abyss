/**
 * The record between missions — docs/ui-ux.md §14, "The record".
 *
 * The setting, read the way Halloran reads a count: in the fifth register
 * (docs/culture.md §3, the language of the record), one page per era of
 * docs/timeline.md, entered as the campaign is played. Split from the screen
 * for `campaignBoard.ts`'s reason — which pages the record reads to a given
 * history is a rule, and a rule belongs where a test can reach it.
 *
 * **Every line is public canon and none is match state.** The pages are
 * transcribed from docs/world.md and docs/timeline.md, the two documents that
 * own what happened, and they are read to the player from the shell before
 * any room exists. Nothing on them can cross the information wall because
 * nothing on them was ever behind it.
 *
 * **This is not a codex** in the sense docs/campaign.md §2 rule 3 forbids. The
 * Mouth is on it as it is in the timeline's anomaly log: measured, dated, and
 * not explained — a cycle, a reply that came early, a text nobody can read.
 * The court enters what was filed. It does not say what it means, and it
 * does not say who was right, which is the register's own rule (§3: the court
 * never says a party is right; it says what the party did). Every line was
 * held to §6's test — which faction could not have said it — and the answer
 * for each is all four, because the court states a cost without pricing it,
 * closes a question, claims no humility and offers no courtesy.
 *
 * **The surface is before, not above** (docs/world.md, writing rule). The
 * first page is the Surface Age in the past tense and the Sounding is on the
 * fifth, and nothing on any page wants the water to clear.
 */

import { MISSION_HEADERS, type CampaignId } from '@echoes/shared';
import type { PlayedLookup } from './campaignBoard.ts';

/**
 * What a page needs of the player's history before the court reads it.
 *
 * Each condition is anchored to something the player has *done* rather than
 * to a count: the drowned city is the Surface Age's, so the prologue enters
 * the first three pages; the Settlement is the four powers being constituted,
 * so it enters when the player has been one of them; the Long Arrangement was
 * four powers each able to hear the other, so it enters when the player has
 * stood on two sides; and 214 PC is the rim week, so the Present Crisis enters
 * when the player has been to the Rim. A page not yet entered is shown with
 * its condition attached, per the shell's rule that a closed door says why.
 */
export type Admission = 'prologue' | 'one-party' | 'two-parties' | 'the-rim';

export interface RecordPage {
  id: string;
  /** The era, as docs/timeline.md heads it. */
  era: string;
  /** The span, as the timeline gives it. */
  span: string;
  admission: Admission;
  /** The page, in the court's register. Paragraphs, in the authored order. */
  entries: readonly string[];
}

export const RECORD_PAGES: readonly RecordPage[] = [
  {
    id: 'surface-age',
    era: 'The Surface Age',
    span: 'before year 0',
    admission: 'prologue',
    entries: [
      'No date in this part of the record is firm, and the court does not pretend otherwise. What is entered here is entered as approximate, by parties who were not there.',
      'The deep ocean stopped turning over across roughly two generations. The middle of the ocean lost its oxygen, and the loss climbed toward the light. The water at the top went sour. The word is the old industry’s, and it is the word that survived.',
      'Deep habitation existed before the Collapse: research stations, vent-field industry, a handful of colonies. None of it was built to be lived in permanently. The Ninefold Vein was producing decades before year 0, and the Pelagion Rift was already lit and already worked.',
      'One civic deep colony was under construction in the Rift at year 0 — a transit line, a passenger terminus, a hydrophone array larger than any built since. It was half finished. Its name is not in the record. The Rift calls the ruin Sorrowgate, after the gate its dead went through, and this court sits in it.',
      'The count for the Surface Age is not kept. It was not kept at the time.',
    ],
  },
  {
    id: 'year-zero',
    era: 'Year 0 — The Salinity Collapse',
    span: 'the year the Rift counts from',
    admission: 'prologue',
    entries: [
      'The surface ocean’s chemistry crossed a threshold in the year the Rift counts from, and it has not come back. The Rift calls the crossing the Salinity Collapse, and dates everything from it. Within ten years the shallows could not be lived in.',
      'The land did not drown and did not burn. It lost the ocean, and in sour weather rolling off the water it lost shorelines in an afternoon. By the time the shore cities emptied, nobody was keeping records that survived.',
      'The top hundred and fifty metres of the ocean are sour and have been for two hundred and fourteen years. The Rift calls that layer the Lid. The Commune measures it every tide. It has not moved.',
      'The descent was not a plan. It was a rout, toward the only door with a light behind it. Everyone in this water is descended from somebody who reached a hatch in time. The court enters that as the founding fact and adds nothing to it.',
    ],
  },
  {
    id: 'the-descent',
    era: 'The Descent',
    span: '0 to 50 PC',
    admission: 'prologue',
    entries: [
      'Migration into the Rift ran uncontrolled for nine years and exceeded habitat capacity roughly fourfold. The old city fell in during these decades — the dome, the arch, the line — in a year nobody kept. That the year was lost is entered as evidence of what the years were.',
      '11 PC: the first recorded use of debt against berth space. The practice has a name now.',
      '14 PC: Halvard imploded at 1,600 m. The Bathyarch salvage combine, not yet chartered, recovered the dead. 19 PC: the Bathyarch Consortium was chartered as a vent-field concession on the strength of it. It has never acknowledged becoming a government, and it has been one for a hundred and ninety-five years.',
      '22 to 31 PC: the Hungry Decade. Surface-derived food failed. 33 PC: the kelp plateaus refused Consortium grain-debt terms and fed themselves, and the Pelagia Commune was constituted by that refusal. Within a generation they fed everyone.',
      '41 PC: acoustic detection was made doctrine. It had always been physics. From this year every navy in the Rift was rebuilt around listening, and nothing in this water has been done in silence since.',
    ],
  },
  {
    id: 'the-settlement',
    era: 'The Settlement',
    span: '50 to 120 PC',
    admission: 'one-party',
    entries: [
      '52 PC: the Deep Cohort Programme began, answering pressure with the germline instead of the hull. 63 PC: the first Cohort generation reached adulthood at 2,400 m without pressure assistance. 104 PC: the Abyssal Directorate constituted itself as the Undermarshalcy, with the Cantorate beneath it.',
      '71 PC: the Consortium’s thermal grid linked the major vent fields. Whoever runs the grid runs the air. Every party understood this at the time, and every party has acted on it since.',
      '88 PC: Anwen Sull, a Consortium survey officer, recorded pings returning from the Mouth before they could have. She was dismissed for falsifying data. In the same year the Consortium Board classified Item 9, which concerns the Mouth, and the Directorate began collecting the dreams of crews stationed near it. Item 9 has been re-classified at every sitting since. The transcripts have not been published. The record says what was filed and does not say what it contains.',
      '118 PC: the Hadron Knights were founded by schismatic Consortium acoustics engineers and the Sull family. Entry is by acoustic aptitude, tested at nine. The Order cannot grow, and it has known the arithmetic of that since its founding.',
      'Four parties stand at the end of this period. The record names them as they are named on paper — the Bathyarch Consortium, the Pelagia Commune, the Abyssal Directorate, the Hadron Knights — and notes that none of the four uses that name for itself.',
    ],
  },
  {
    id: 'the-long-arrangement',
    era: 'The Long Arrangement',
    span: '120 to 197 PC',
    admission: 'two-parties',
    entries: [
      'Seventy-seven years without a general war. The reason is entered as a fact and not as a credit to anybody: every party could hear every other party mobilise, and no offensive could be prepared in silence. Historians of the Rift call it a peace. The court records four powers holding still.',
      '121 PC: the first Baffle was installed at a Consortium refinery. Masking became an industry, and parity began to be sold in pieces.',
      '141 PC: the Sounding. The only joint expedition in the Rift’s history — Consortium hulls, Commune provisions, Directorate listeners, Knight instruments — went up through the Lid in sealed hulls and spent three tides on the surface. It found white water to the horizon, air breathable on a good wind, nothing to eat, nothing to burn, and nothing to hear. The hydrophone record is four hours long. The Directorate keeps a copy. Nobody plays it twice. The question of going back left the Rift’s politics in this year and has not been readmitted.',
      '165 PC: the Sorrowgate Arbitration Court opened in a collapsed transit dome at 1,500 m, under the layer. All four parties use it. All four deny it. Both facts are entered.',
      '178 PC: the First Chord, raised at the First Chapter-House at 2,900 m, transmitted into the Mouth. A reply arrived forty-one seconds before it could have. Three technicians have not spoken since. They write. Thirty-six years of it stands, in no language the record can read. The court enters the interval and not an interpretation.',
    ],
  },
  {
    id: 'the-present-crisis',
    era: 'The Present Crisis',
    span: '197 to 214 PC',
    admission: 'the-rim',
    entries: [
      '197 PC: a containment failure threatened Holding One. Executor Odile Varr-Kest signed the order to flood Sector Kell. 1,900 dead; the habitat saved. The flood front crossed the Kell Plateau, and Warden Juno Teel evacuated 4,000 farmers and left 200, because the boats were full. Both counts are closed.',
      '199 PC: the Enclosure. Tidespeaker Ysolde Marr had the votes to authorise armed defence and did not call for them. Her partner is among the dead.',
      '204 PC: Bloomwright Sefa Anholt seeded engineered algae at 2,200 m and it took. Habitable depth can be made. 205 PC: the Directorate stated in writing that a second seeding is an act of war. The Commune filed the letter and continued.',
      '209 PC: Ninefold Vein entered terminal decline — eleven years to insolvency without a new field. 211 PC: the crystal raids. The Order lost a junior cadre entire: nineteen, who are not replaced. 213 PC: the Mouth’s return cycle, measured at forty-three hours for a hundred and twenty-five years by four observers who do not speak to each other, was measured at thirty-nine, and is still shortening. A Directorate transcript of 96 PC gave that figure without a date.',
      '214 PC. The Commune has scheduled a second seeding. The Consortium has costed a short war against a slow collapse. The Order has a window, and a raid plan on a desk. The Directorate is preparing for something it has not named. All four require the same eleven kilometres of seabed at the Mouth’s rim, in the same week. The record is open.',
    ],
  },
];

/** What a withheld page says about itself, in the register. */
export const ADMISSION_LINE: Record<Admission, string> = {
  prologue: 'Not yet entered. The prologue is read first.',
  'one-party':
    'Not yet entered. Entered when a party has appeared — one mission of any campaign, finished.',
  'two-parties':
    'Not yet entered. Entered when a second party has appeared — missions finished in two campaigns.',
  'the-rim':
    'Not yet entered. Entered when the rim has been reached — any mission on the Rim, finished.',
};

export interface RecordReading {
  page: RecordPage;
  entered: boolean;
}

/**
 * The record as it reads to one player's history.
 *
 * Derived from the progression record on every read and stored nowhere: a
 * page is entered by what has been finished, and finishing is the only fact
 * the store keeps, so a second key would be a second copy of the first.
 */
export function readRecord(hasPlayed: PlayedLookup): RecordReading[] {
  const finished = MISSION_HEADERS.filter((header) => hasPlayed(header.id));
  const prologue = finished.some((header) => header.campaign === 'prologue');
  const parties = new Set<CampaignId>(
    finished.filter((header) => header.campaign !== 'prologue').map((header) => header.campaign)
  );
  const rim = finished.some((header) => header.mapId === 'mouth-rim');

  const admitted: Record<Admission, boolean> = {
    prologue,
    'one-party': parties.size >= 1,
    'two-parties': parties.size >= 2,
    'the-rim': rim,
  };

  return RECORD_PAGES.map((page) => ({ page, entered: admitted[page.admission] }));
}

/** "Six pages. Three entered." — the count, read aloud and left to sit. */
export function countLine(reading: readonly RecordReading[]): string {
  const words = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const entered = reading.filter((r) => r.entered).length;
  const total = words[reading.length] ?? String(reading.length);
  const count = words[entered] ?? String(entered);
  return `${total[0].toUpperCase()}${total.slice(1)} pages. ${count[0].toUpperCase()}${count.slice(1)} entered.`;
}
