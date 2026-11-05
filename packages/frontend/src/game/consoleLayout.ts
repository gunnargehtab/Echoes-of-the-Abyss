/**
 * The console's block geometry (docs/art-direction.md "HUD Layout"), in HUD
 * px: what `EchoRenderer` draws the console's five blocks from, and what the
 * shell stands a DOM panel beside one of them with. One function for both,
 * so a panel placed "beside the command block" is beside the block the HUD
 * actually drew at this width, not beside a copy of the arithmetic.
 */
import { CONSOLE_HEIGHT } from './uiScale.ts';

/** The tab row's height along the console's top. */
export const TAB_HEIGHT = 24;
/** Breathing room between the console's own edge and its blocks. */
export const CONSOLE_PAD = 8;
/** Between two blocks. Tight: the blocks are the instrument, the gaps are not. */
export const BLOCK_GAP = 8;

/**
 * What each block needs to say, in px.
 *
 * Four of the five are fixed because their content is: a scope is square, a
 * command card is four columns of a known width, a selection card holds six
 * stats. Production takes whatever is left, because a queue is the one block
 * that reads better wider. Which blocks go when the width runs out, and in
 * what order, is decided in `consoleBlocks`.
 */
export const BLOCK_W = {
  scope: 170,
  selection: 300,
  fleet: 230,
  commands: 380,
  productionMin: 240,
} as const;

export interface ConsoleBlocks {
  y: number;
  h: number;
  scope: { x: number; w: number };
  commands: { x: number; w: number };
  selection?: { x: number; w: number };
  fleet?: { x: number; w: number };
  production?: { x: number; w: number };
}

/** The blocks a HUD `width` by `height` px holds, and where each stands. */
export function consoleBlocks(width: number, height: number): ConsoleBlocks {
  const y = height - CONSOLE_HEIGHT + TAB_HEIGHT + 4;
  const h = CONSOLE_HEIGHT - TAB_HEIGHT - 4 - CONSOLE_PAD;
  const left = CONSOLE_PAD + 2;
  const right = width - CONSOLE_PAD - 2;

  // Blocks are dropped rather than squeezed when the width runs out, because
  // a block narrower than its content is a block that lies about holding it.
  // The order is what each one costs to lose:
  //
  // - **Fleet first.** Its facts have somewhere else to be — the hulls in
  //   hand are also the selection card's, and the groups are also the
  //   digits. It is the block that makes them quick, not the only one that
  //   makes them reachable.
  // - **Production next**, and reluctantly: production being visible without
  //   a tab is this console's whole argument.
  // - **Selection after that**, because the world view carries a hull's state
  //   on the hull itself.
  //
  // Scope and commands never go. One is the only view of the whole map, and
  // the other is the mouse's route to every order.
  //
  // So a block is kept only when every block that outlasts it fits too: each
  // test below adds its own cost to theirs. Testing a block against the room
  // left after the others let the fleet come back once selection had gone
  // (#957), and gave production the longest life of the three.
  const fixed = BLOCK_W.scope + BLOCK_GAP + BLOCK_W.commands;
  const room = right - left - fixed;
  const selectionCost = BLOCK_GAP + BLOCK_W.selection;
  const productionCost = BLOCK_GAP + BLOCK_W.productionMin;
  const fleetCost = BLOCK_GAP + BLOCK_W.fleet;
  const wantsSelection = room >= selectionCost;
  const wantsProduction = room >= selectionCost + productionCost;
  const wantsFleet = room >= selectionCost + productionCost + fleetCost;

  let x = left;
  const scope = { x, w: BLOCK_W.scope };
  x += scope.w + BLOCK_GAP;

  const selection = wantsSelection ? { x, w: BLOCK_W.selection } : undefined;
  if (selection !== undefined) x += selection.w + BLOCK_GAP;

  const fleet = wantsFleet ? { x, w: BLOCK_W.fleet } : undefined;
  if (fleet !== undefined) x += fleet.w + BLOCK_GAP;

  const commands = { x, w: BLOCK_W.commands };
  x += commands.w + BLOCK_GAP;

  // At least `productionMin` wide by `wantsProduction`, and wider whenever
  // the room is. Once production has gone, what it held stays bare glass on
  // purpose: the other four blocks are as wide as their content (`BLOCK_W`),
  // and giving the room to one would only pad it.
  const production = wantsProduction ? { x, w: right - x } : undefined;
  return { y, h, scope, commands, selection, fleet, production };
}
