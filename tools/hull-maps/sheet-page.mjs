/**
 * The roster contact sheet, drawn in the browser by the game's own sprite code.
 *
 * sheet.mjs bundles this file with esbuild and runs it in Chromium. Every
 * sprite on the sheet comes from hullSpriteCanvas / structureSpriteCanvas,
 * the same bake the chart and the conn view draw a player's own force with,
 * so the sheet cannot show a hull the game would draw differently. Which hulls
 * and structures each navy has is the game's rule too: unitAvailableTo for the
 * hulls (craft included, since a carrier's craft is in the water with it) and
 * the common structures plus the navy's own FACTION_STRUCTURE.
 *
 * Each sprite is fitted to its cell rather than drawn to one scale, so a 20 m
 * craft is as legible as a 150 m Bulwark; the label carries the length.
 */

import {
  Faction,
  FACTION_STRUCTURE,
  StructureKind,
  structureStatsFor,
  UNIT_STATS,
  unitAvailableTo,
  UnitKind,
} from '@echoes/shared';

import { FACTION_FULL_NAME } from '../../packages/frontend/src/game/factions.ts';
import { cssColor } from '../../packages/frontend/src/game/bake.ts';
import { FACTION_PALETTE } from '../../packages/frontend/src/game/palette.ts';
import { HULL_LENGTH_M } from '../../packages/frontend/src/game/silhouettes.ts';
import { hullSpriteCanvas, loadHullArt } from '../../packages/frontend/src/game/hullTextures.ts';
import {
  loadStructureArt,
  structureSpriteCanvas,
} from '../../packages/frontend/src/game/structureTextures.ts';

const WIDTH = 1600;
const PAD = 16;
const HEADER = 30;
const LABEL = 18;
const GAP = 14;
const HULL = { columns: 10, art: 70 };
const STRUCTURE = { columns: 8, art: 120 };
const BACKGROUND = '#070a10';
const RULE = 'rgba(53, 224, 255, 0.14)';
const TEXT = '#8fd3dc';

const enumValues = (e) => Object.values(e).filter((v) => typeof v === 'number');

/** Each navy's hulls and structures, in the enums' order. */
export function rosters() {
  const signatures = new Set(Object.values(FACTION_STRUCTURE));
  return enumValues(Faction).map((faction) => ({
    faction,
    name: FACTION_FULL_NAME[faction],
    hulls: enumValues(UnitKind).filter((kind) => unitAvailableTo(kind, faction)),
    structures: enumValues(StructureKind).filter(
      (kind) => !signatures.has(kind) || FACTION_STRUCTURE[faction] === kind
    ),
  }));
}

function rowsOf(count, columns) {
  return Math.ceil(count / columns);
}

/** The sprite, fitted into a box, never enlarged past its own pixels. */
function fit(ctx, sprite, x, y, w, h) {
  const scale = Math.min(w / sprite.width, h / sprite.height, 1);
  const dw = sprite.width * scale;
  const dh = sprite.height * scale;
  ctx.drawImage(sprite, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function grid(ctx, items, top, columns, artH, draw) {
  const cellW = (WIDTH - 2 * PAD) / columns;
  items.forEach((item, i) => {
    const x = PAD + (i % columns) * cellW;
    const y = top + Math.floor(i / columns) * (artH + LABEL);
    const { sprite, label } = draw(item);
    if (sprite !== null) fit(ctx, sprite, x + 6, y + 4, cellW - 12, artH - 8);
    ctx.fillStyle = TEXT;
    ctx.fillText(label, x + cellW / 2, y + artH + LABEL - 5, cellW - 8);
  });
  return top + rowsOf(items.length, columns) * (artH + LABEL);
}

/**
 * Bake every sprite, lay the sheet out, and return it as a PNG data URL with
 * the counts drawn. Sprites whose art fails to decode are reported rather
 * than silently left blank.
 */
async function bakeRosterSheet() {
  const navies = rosters();
  await Promise.all(
    navies.flatMap((n) => [
      ...n.hulls.map((kind) => loadHullArt(kind, n.faction)),
      ...n.structures.map((kind) => loadStructureArt(kind, n.faction)),
    ])
  );

  const sectionH = (n) =>
    HEADER +
    rowsOf(n.hulls.length, HULL.columns) * (HULL.art + LABEL) +
    GAP +
    rowsOf(n.structures.length, STRUCTURE.columns) * (STRUCTURE.art + LABEL) +
    GAP;
  const height = PAD + navies.reduce((sum, n) => sum + sectionH(n), 0);

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, WIDTH, height);

  const blank = [];
  let top = PAD;
  for (const n of navies) {
    ctx.font = '600 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = cssColor(FACTION_PALETTE[n.faction].primary);
    ctx.fillText(
      `${n.name} · ${n.hulls.length} hulls · ${n.structures.length} structures`,
      PAD,
      top + 20
    );
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    top = grid(ctx, n.hulls, top + HEADER, HULL.columns, HULL.art, (kind) => {
      const sprite = hullSpriteCanvas(kind, n.faction);
      if (sprite === null) blank.push(`${n.name}: ${UNIT_STATS[kind].name}`);
      return { sprite, label: `${UNIT_STATS[kind].name} · ${HULL_LENGTH_M[kind]} m` };
    });
    top = grid(ctx, n.structures, top + GAP, STRUCTURE.columns, STRUCTURE.art, (kind) => {
      const sprite = structureSpriteCanvas(kind, n.faction);
      if (sprite === null) blank.push(`${n.name}: ${structureStatsFor(kind).name}`);
      return { sprite, label: structureStatsFor(kind).name };
    });
    top += GAP;
    ctx.fillStyle = RULE;
    ctx.fillRect(PAD, top - GAP / 2, WIDTH - 2 * PAD, 1);
  }

  return {
    png: canvas.toDataURL('image/png'),
    width: WIDTH,
    height,
    navies: navies.map((n) => ({
      name: n.name,
      hulls: n.hulls.length,
      structures: n.structures.length,
    })),
    blank,
  };
}

globalThis.bakeRosterSheet = bakeRosterSheet;
