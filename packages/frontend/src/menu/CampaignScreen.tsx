/**
 * The campaign board — docs/ui-ux.md §14, "The campaign board".
 *
 * A board rather than a list because the order is free after the prologue
 * (docs/campaign.md §1): a list would assert a sequence the campaign refuses to
 * have. What is on it, what each slot says and which of three states it is in
 * are all decided in `campaignBoard.ts`; this file is the rendering and the
 * focus management, and it decides nothing else.
 *
 * **Every slot is a real button and none of them is `disabled`.** The title
 * screen can afford a DOM `disabled` on its one dead entry because five live
 * ones surround it. A board cannot: `disabled` takes an element out of the tab
 * order and out of most of what a screen reader will let a user do with it, so
 * twenty-eight of twenty-nine slots would vanish for exactly the players §10
 * and §11 put this whole shell in the DOM for. `aria-disabled` instead —
 * focusable, announced with its reason, inert on activation, which is why
 * `activate` guards rather than the attribute doing it.
 *
 * The grid is one tab stop with a roving `tabindex`, so Tab leaves for the back
 * control rather than walking twenty-nine slots to reach it.
 */

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { FACTION_PALETTE } from '../game/palette.ts';
import { FactionGlyph } from './FactionGlyph.tsx';
import { RiftChart } from './RiftChart.tsx';
import {
  buildBoard,
  initialFocus,
  isOpenable,
  moveFocus,
  slotAt,
  type BoardFocus,
  type BoardSlot,
  type PlayedLookup,
} from './campaignBoard.ts';
import { chartMarks, groundFor, groundLine } from './riftChart.ts';

export interface CampaignScreenProps {
  /**
   * The one question the board asks the progression record. Injected rather
   * than imported so the board consumes a record it does not define
   * (docs/ui-ux.md §14, "What the board reads, and what it must not decide").
   */
  hasPlayed: PlayedLookup;
  /** Commit to the briefing — never straight to a match. */
  onSelect(missionId: string): void;
  /** The record between missions — docs/ui-ux.md §14, "The record". */
  onRecord(): void;
  onBack(): void;
}

const hex = (value: number): string => `#${value.toString(16).padStart(6, '0')}`;

/**
 * What a slot announces beyond its title.
 *
 * The reason an unbuilt door does not open has to be audible and not only
 * visible, or "visible with the reason attached" serves only the people who can
 * see the phosphor. The teaching target is already in the label; this names the
 * state, which the dimming otherwise carries alone — and the ground, which the
 * chart otherwise carries alone: where in the Rift, how deep, and in whose
 * water is read to a screen reader here, so the chart can stay decorative.
 */
function slotDescription(slot: BoardSlot): string {
  const state = (() => {
    switch (slot.state) {
      case 'unbuilt':
        return 'Not yet built';
      case 'played':
        return 'Played';
      case 'available':
        return 'Available';
    }
  })();
  const ground = slot.mapId === undefined ? undefined : groundFor(slot.mapId);
  return ground === undefined ? state : `${state} · ${groundLine(ground)}`;
}

export function CampaignScreen({ hasPlayed, onSelect, onRecord, onBack }: CampaignScreenProps) {
  // Built once per mount: the record cannot change while the board is on
  // screen, because finishing a mission means leaving it.
  const [board] = useState(() => buildBoard(hasPlayed));
  const [marks] = useState(() => chartMarks(board));
  const [focus, setFocus] = useState<BoardFocus>(() => initialFocus(board));
  // The slot the pointer is over, if any. The chart lights one slot at a time
  // — the hovered one, else the focused one — so a mouse and a keyboard read
  // the same chart without the pointer's last position pinning it.
  const [hover, setHover] = useState<string | null>(null);
  // Whether the roving tabindex should actually pull focus. Mounting must not
  // steal it from the screen the player arrived from; the first key or click
  // inside the board arms it.
  const armed = useRef(false);
  const focused = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (armed.current) focused.current?.focus();
  }, [focus]);

  const activate = (slot: BoardSlot) => {
    // `aria-disabled` does not stop a click, which is the point of using it —
    // the slot stays reachable and stays announced. Inert is enforced here.
    if (!isOpenable(slot) || slot.missionId === undefined) return;
    onSelect(slot.missionId);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = moveFocus(focus, event.key);
    if (next === null) return;
    event.preventDefault();
    armed.current = true;
    setFocus(next);
  };

  const focusOf = (slotKey: string): BoardFocus | null => {
    if (board.prologue.key === slotKey) return { column: focus.column, row: 0 };
    for (let column = 0; column < board.columns.length; column++) {
      const row = board.columns[column].slots.findIndex((slot) => slot.key === slotKey);
      if (row !== -1) return { column, row: row + 1 };
    }
    return null;
  };

  /** A mark on the chart was pressed: the board's focus goes to its slot. */
  const pick = (slotKey: string) => {
    const at = focusOf(slotKey);
    if (at === null) return;
    armed.current = true;
    setFocus(at);
  };

  const spotlight = hover ?? slotAt(board, focus).key;
  const lit = marks.find((mark) => mark.slotKey === spotlight) ?? null;

  const renderSlot = (slot: BoardSlot, at: BoardFocus) => {
    const current = at.column === focus.column && at.row === focus.row;
    const openable = isOpenable(slot);
    return (
      <button
        type="button"
        ref={current ? focused : null}
        className={`campaign-slot campaign-slot-${slot.state}`}
        // One tab stop for the whole board: exactly one slot is in the tab
        // order, and the arrows move which.
        tabIndex={current ? 0 : -1}
        aria-disabled={openable ? undefined : true}
        onFocus={() => {
          armed.current = true;
          setFocus(at);
        }}
        onMouseEnter={() => setHover(slot.key)}
        onMouseLeave={() => setHover(null)}
        onClick={() => activate(slot)}
      >
        <span className="campaign-slot-head">
          <span className="campaign-slot-ordinal">{slot.ordinal}</span>
          <span className="campaign-slot-title">{slot.title}</span>
          {slot.state === 'played' && (
            // Cyan tells you. A played mission stays playable, so the tick is
            // added to available's treatment rather than replacing it.
            <span className="campaign-slot-tick" aria-hidden="true">
              ✓
            </span>
          )}
        </span>
        <span className="campaign-slot-line">{slot.line}</span>
        {/* Visually hidden, and deliberately: §14 warns that a board saying
            `Not yet built` twenty-eight times would read as a loading screen,
            so the state is carried on screen by the dimming and in the
            accessible name by this. Inside the button, so it is part of the
            name rather than a second announcement beside it. */}
        <span className="campaign-slot-state">{slotDescription(slot)}</span>
      </button>
    );
  };

  return (
    <div className="menu-screen" role="dialog" aria-label="Campaign">
      <div className="menu-panel menu-panel-board">
        <header className="menu-head">
          <h2>Campaign</h2>
          <p className="menu-subtitle">
            Four wars, one question. The prologue first; after it, nothing is locked.
          </p>
        </header>

        <div className="campaign-body">
          {/* Plate VII beside the table, one mark per slot, lit with the
              board's focus. Decorative to a screen reader: the same facts are
              in every slot's name. The caption under it is where the ground
              is read at a reading size. */}
          <aside className="campaign-chart" aria-hidden="true">
            <RiftChart marks={marks} spotlight={spotlight} onHover={setHover} onPick={pick} />
            <p className="campaign-chart-caption">
              {lit === null ? (
                <span className="campaign-chart-ground">The Pelagion Rift</span>
              ) : (
                <>
                  <span className="campaign-chart-title">{lit.slot.title}</span>
                  <span className="campaign-chart-ground">{lit.ground.name}</span>
                  <span className="campaign-chart-facts">
                    {lit.ground.depthM.toLocaleString('en-GB')} m · {lit.ground.whose}
                  </span>
                </>
              )}
            </p>
          </aside>

          {/* A grid, because the traversal is two-dimensional and that is how a
            screen reader is told so — nine rows counting the lane and the
            heads, four columns that carry no number against each other. */}
          <div
            className="campaign-board"
            role="grid"
            aria-label="Campaign missions"
            aria-rowcount={9}
            aria-colcount={4}
            onKeyDown={onKeyDown}
          >
            <div className="campaign-lane" role="row">
              {/* One slot spanning the four, not a first slot repeated in each:
                the prologue is one mission, and drawing it four times would
                draw a mission that does not exist three times. */}
              <div role="gridcell" aria-colspan={4} className="campaign-cell campaign-cell-lane">
                {renderSlot(board.prologue, { column: focus.column, row: 0 })}
              </div>
            </div>

            <div className="campaign-heads" role="row">
              {board.columns.map((column) => (
                <div
                  key={column.campaign}
                  role="columnheader"
                  className="campaign-head"
                  // Ink on chrome, on a screen that is not the instrument — the
                  // licensed dress of §12.5, and the only place a faction colour
                  // appears here. The slots stay cyan and magenta, or the board
                  // becomes four boards.
                  style={
                    { '--faction': hex(FACTION_PALETTE[column.faction].glow) } as CSSProperties
                  }
                >
                  <span className="campaign-head-name">
                    <FactionGlyph faction={column.faction} />
                    {column.title}
                  </span>
                  <span className="campaign-head-commander">{column.commander}</span>
                </div>
              ))}
            </div>

            {board.columns[0].slots.map((_, index) => (
              <div key={index} role="row" className="campaign-row">
                {board.columns.map((column, columnIndex) => (
                  <div key={column.campaign} role="gridcell" className="campaign-cell">
                    {renderSlot(column.slots[index], { column: columnIndex, row: index + 1 })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <footer className="menu-foot">
          {/* Cyan tells you: the record is read, never committed to. */}
          <button type="button" className="menu-secondary" onClick={onRecord}>
            The record
          </button>
          <button type="button" className="menu-back" onClick={onBack}>
            Back
          </button>
        </footer>
      </div>
    </div>
  );
}
