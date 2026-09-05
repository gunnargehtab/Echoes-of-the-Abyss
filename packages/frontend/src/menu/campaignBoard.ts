/**
 * The campaign board's model — docs/ui-ux.md §14, "The campaign board".
 *
 * Split from the component for the reason `net/rooms.ts` and `input/bindings.ts`
 * are: the shape of the board and the way a keyboard walks it are rules, and
 * rules belong somewhere a test can reach without a DOM. The component below
 * this file renders what these functions return and owns nothing else.
 *
 * **The twenty-nine slots are transcribed from docs/campaign.md §1 and §4–§7,
 * and only the titles and the teaching targets are transcribed.** Whether a
 * slot can be opened is never written down here — it is read off
 * `MISSION_HEADERS`, which is what has actually shipped — so a mission that
 * lands in the catalogue lights its own slot up without this table being
 * touched. That is the whole reason the board is joined to the catalogue by
 * `campaign` and `ordinal` rather than by a mission id repeated in two places.
 *
 * The teaching lines are quoted, never written for the board. §14: missions
 * introduce themselves in the voice of whoever is speaking them, so a board
 * that summarised twenty-nine of them in one template voice would flatten the
 * thing the briefing exists to protect. Two of them read "Nothing new" and
 * "Nothing at all"; those are the documents' own words about those missions and
 * they stay.
 */

import { Faction, MISSION_HEADERS, type CampaignId, type MissionHeader } from '@echoes/shared';

/**
 * Three states, not four — docs/ui-ux.md §14.
 *
 * A mission with a document of record and no literal, and a mission that is
 * still a title and a teaching target, are the same door to a player: one that
 * does not open. Which of the twenty-eight are which is a fact about this
 * repository, and docs/campaign.md §11 is where those go.
 */
export type SlotState = 'available' | 'played' | 'unbuilt';

export interface BoardSlot {
  /** Stable across renders, and the key the roving tabindex is held by. */
  key: string;
  campaign: CampaignId;
  /** Slot within its own campaign, 1-based. Columns carry no number. */
  ordinal: number;
  title: string;
  /**
   * The one line under the title: the mission's own premise when the door
   * opens, its teaching target when it does not. Never a sentence written here.
   */
  line: string;
  state: SlotState;
  /** Present exactly when the slot can be opened. */
  missionId?: string;
  /**
   * The water the mission is played on, present with `missionId`. Public
   * already — the room sends the map on join — and what `riftChart.ts` places
   * the slot by.
   */
  mapId?: string;
}

export interface BoardColumn {
  campaign: CampaignId;
  /** *The Ledger*, *The Second Seeding*, … — docs/campaign.md §1. */
  title: string;
  /** The navy whose ink and glyph the head takes (docs/ui-ux.md §12.5). */
  faction: Faction;
  /** The commander line from the head of §4–§7, verbatim. */
  commander: string;
  /** Seven, always. §1's count is 1 + 4×7. */
  slots: readonly BoardSlot[];
}

export interface CampaignBoard {
  /**
   * One slot spanning the four columns, not a first slot repeated in each:
   * drawing it four times would draw a mission that does not exist three
   * times (docs/ui-ux.md §14).
   */
  prologue: BoardSlot;
  columns: readonly BoardColumn[];
}

/** A row of docs/campaign.md §4–§7's table, reduced to what the board shows. */
interface SlotSource {
  ordinal: number;
  title: string;
  /** The Teaches column, verbatim. Shown only while the slot is `unbuilt`. */
  teaching: string;
}

interface ColumnSource {
  campaign: CampaignId;
  title: string;
  faction: Faction;
  commander: string;
  slots: readonly SlotSource[];
}

/** docs/campaign.md §3. The prologue is built, so this line is never shown. */
const PROLOGUE_SOURCE: SlotSource = {
  ordinal: 1,
  title: 'Prologue — Sorrowgate',
  teaching: 'SIG, listening, resolution tiers, what hearing is worth',
};

const COLUMN_SOURCES: readonly ColumnSource[] = [
  {
    campaign: 'ledger',
    title: 'The Ledger',
    faction: Faction.Bathyarch,
    commander: 'Executor Odile Varr-Kest has eleven years and an actuary’s conscience.',
    slots: [
      { ordinal: 1, title: 'Asset Recovery', teaching: 'Klaxon Doctrine: fight loud, survive it' },
      { ordinal: 2, title: 'Shift Change', teaching: 'Economy, throttle, industrial hum' },
      { ordinal: 3, title: 'Baffle', teaching: 'Masking, Baffle Barge, escorting a slow thing' },
      { ordinal: 4, title: 'Exposure', teaching: 'Echo Marks and scouting the past' },
      { ordinal: 5, title: 'Tolerance', teaching: 'Depth, pressure, unhealable attrition' },
      { ordinal: 6, title: 'Prospect', teaching: 'Abyssal descent, PR, the round trip' },
      {
        ordinal: 7,
        title: 'Item Nine',
        teaching: 'Nothing new — a command mission with one decision',
      },
    ],
  },
  {
    campaign: 'seeding',
    title: 'The Second Seeding',
    faction: Faction.Pelagia,
    commander:
      'Tidespeaker Ysolde Marr cannot order anyone to do anything, and Sefa Anholt has the votes.',
    slots: [
      { ordinal: 1, title: 'Tend', teaching: 'Quiet economy, bloom-share, Silent Running' },
      { ordinal: 2, title: 'Thin Water', teaching: 'Losing a fight you did not choose' },
      {
        ordinal: 3,
        title: 'Convocation',
        teaching: 'Marr’s once-per-match ability, mass mobility',
      },
      { ordinal: 4, title: 'Deep Furrow', teaching: 'Seeding, terraforming, +1 PR zones' },
      {
        ordinal: 5,
        title: 'In Writing',
        teaching: 'Spore Veil against the best listeners in the game',
      },
      { ordinal: 6, title: 'Radicals', teaching: 'Fighting your own faction’s momentum' },
      { ordinal: 7, title: 'The Second Seeding', teaching: 'Everything at once' },
    ],
  },
  {
    campaign: 'attending',
    title: 'The Attending',
    faction: Faction.Directorate,
    commander: 'Undermarshal Setha Korrin believes the Choir is literal and cannot say so.',
    slots: [
      { ordinal: 1, title: 'Attendance', teaching: 'HYD, passive listening, patience' },
      { ordinal: 2, title: 'Intake', teaching: 'Cohort economy, cheap expendable units' },
      { ordinal: 3, title: 'The Dome', teaching: 'Cantors, listening domes, Chorus Call' },
      { ordinal: 4, title: 'Shallow', teaching: 'Your own weakness' },
      { ordinal: 5, title: 'Trench Awakening', teaching: 'Megafauna, fauna aggro, Biomass' },
      { ordinal: 6, title: 'Conclave', teaching: 'Fighting with half an army' },
      { ordinal: 7, title: 'First Arrival', teaching: 'Information into tempo' },
    ],
  },
  {
    campaign: 'chord',
    title: 'The Second Chord',
    faction: Faction.Hadron,
    commander:
      'Choirmaster Ivane Sull has a window, a raid plan on her desk, and thirty-six years of writing she has shown nobody.',
    slots: [
      {
        ordinal: 1,
        title: 'Aptitude',
        teaching: 'Directional SIG — loud in the cone, quiet on the flank',
      },
      { ordinal: 2, title: 'Standing Wave', teaching: 'Paired nodes, corridors, PF 2.0' },
      { ordinal: 3, title: 'Nineteen', teaching: 'Permanent loss' },
      {
        ordinal: 4,
        title: 'Conclave',
        teaching: 'Nothing new — a defensive mission you are meant to almost lose',
      },
      { ordinal: 5, title: 'The Three', teaching: 'Nothing at all' },
      { ordinal: 6, title: 'The Rim Deposits', teaching: 'Raiding, extraction under fire' },
      {
        ordinal: 7,
        title: 'The Second Chord',
        teaching: 'Resonance Collapse, and a 30 s SIG 100 emission',
      },
    ],
  },
];

/**
 * What the board is allowed to ask about the player.
 *
 * One question, and the record answers it: has this mission ever been finished
 * (docs/ui-ux.md §14). Taken as a function rather than as the record itself so
 * the board consumes a progression it does not define — and so a test can hand
 * it a history without touching `localStorage`.
 */
export type PlayedLookup = (missionId: string) => boolean;

function headerFor(campaign: CampaignId, ordinal: number): MissionHeader | undefined {
  return MISSION_HEADERS.find(
    (header) => header.campaign === campaign && header.ordinal === ordinal
  );
}

function slotFor(campaign: CampaignId, source: SlotSource, hasPlayed: PlayedLookup): BoardSlot {
  const key = `${campaign}-${source.ordinal}`;
  const header = headerFor(campaign, source.ordinal);
  if (header === undefined) {
    return {
      key,
      campaign,
      ordinal: source.ordinal,
      title: source.title,
      line: source.teaching,
      state: 'unbuilt',
    };
  }
  return {
    key,
    campaign,
    ordinal: source.ordinal,
    title: source.title,
    line: header.premise,
    state: hasPlayed(header.id) ? 'played' : 'available',
    missionId: header.id,
    mapId: header.mapId,
  };
}

/** Whether activating this slot opens anything. `played` is `available` plus a tick. */
export function isOpenable(slot: BoardSlot): boolean {
  return slot.state !== 'unbuilt';
}

export function buildBoard(hasPlayed: PlayedLookup): CampaignBoard {
  return {
    prologue: slotFor('prologue', PROLOGUE_SOURCE, hasPlayed),
    columns: COLUMN_SOURCES.map((source) => ({
      campaign: source.campaign,
      title: source.title,
      faction: source.faction,
      commander: source.commander,
      slots: source.slots.map((slot) => slotFor(source.campaign, slot, hasPlayed)),
    })),
  };
}

// --- Traversal --------------------------------------------------------------

/**
 * Where the roving tabindex is sitting.
 *
 * `row` 0 is the prologue lane, which spans the four columns; rows 1–7 are the
 * slots of the column named by `column`. The prologue keeps a column even
 * though it does not need one, because Down has to land somewhere and the
 * column the player arrived from is the only non-arbitrary answer.
 */
export interface BoardFocus {
  column: number;
  row: number;
}

const LAST_ROW = 7;
const LAST_COLUMN = 3;

/** The slot a focus position names. */
export function slotAt(board: CampaignBoard, focus: BoardFocus): BoardSlot {
  if (focus.row === 0) return board.prologue;
  // Both indices are clamped on every move, so this cannot miss.
  return board.columns[focus.column].slots[focus.row - 1];
}

/**
 * Where entering the board lands: the first slot that opens.
 *
 * §14: "the first thing a keyboard reaches should be a door that opens." Every
 * other slot is still one arrow key away and still announces why it will not.
 * If nothing opens at all — a build with an empty catalogue — the prologue lane
 * is still the honest place to start.
 */
export function initialFocus(board: CampaignBoard): BoardFocus {
  if (isOpenable(board.prologue)) return { column: 0, row: 0 };
  for (let row = 1; row <= LAST_ROW; row++) {
    for (let column = 0; column <= LAST_COLUMN; column++) {
      if (isOpenable(board.columns[column].slots[row - 1])) return { column, row };
    }
  }
  return { column: 0, row: 0 };
}

const clamp = (value: number, high: number): number => Math.min(Math.max(value, 0), high);

/**
 * The board's arrow keys — docs/ui-ux.md §14, "Keyboard".
 *
 * Left and Right between columns, Up and Down within one, Home and End to the
 * ends of one. The prologue is the top of every column rather than a lane
 * beside them, so Up from slot 1 reaches it and Home is the same rung: it is
 * the first mission of all four campaigns, and a traversal that made it a
 * separate region would have to invent a way in and out of that region.
 *
 * Movement clamps rather than wraps. Twenty-nine slots is enough that arriving
 * at the far column by holding Left would be a surprise rather than a
 * convenience, and the edges of the board are information — they are where the
 * campaign ends.
 *
 * Returns `null` for a key the board does not claim, so the caller can leave
 * the event alone rather than swallowing it.
 */
export function moveFocus(focus: BoardFocus, key: string): BoardFocus | null {
  switch (key) {
    case 'ArrowLeft':
      // No-op on the lane: it spans the four, so there is nothing beside it.
      return focus.row === 0 ? focus : { ...focus, column: clamp(focus.column - 1, LAST_COLUMN) };
    case 'ArrowRight':
      return focus.row === 0 ? focus : { ...focus, column: clamp(focus.column + 1, LAST_COLUMN) };
    case 'ArrowUp':
      return { ...focus, row: clamp(focus.row - 1, LAST_ROW) };
    case 'ArrowDown':
      return { ...focus, row: clamp(focus.row + 1, LAST_ROW) };
    case 'Home':
      return { ...focus, row: 0 };
    case 'End':
      return { ...focus, row: LAST_ROW };
    default:
      return null;
  }
}
