/**
 * Every navy's trim sheet, drawn once (#1005).
 *
 *   node tools/hull-models/sheets.mjs        # writes packages/frontend/src/assets/trim/<name>.png
 *
 * A sheet serves every model of its navy, so it is not in any GLB: a model
 * carries its layout on UV0 and a tag on each laid-out material naming the
 * sheet (trim.mjs), and the client attaches the image at load
 * (packages/frontend/src/game/trimSheets.ts), as the chart's bake does for
 * its albedo pass (hull-intake bake.mjs `--trim`). The image is the
 * committed output of the navy's `TRIM` table in its faction module, drawn
 * by trim.mjs `drawTrimSheet` with no random number in it, so check.mjs
 * redraws each and compares it with the committed file to two grey levels,
 * the slack the occlusion map is allowed. A navy without a `TRIM` export
 * has no sheet, and no model of it is laid out.
 */
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SHEET_DIR, drawTrimSheet } from './trim.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const repo = resolve(here, '../..');

/** Each navy's `TRIM`, by the sheet's name, read off the faction modules. */
export async function navyTrims() {
  const out = new Map();
  for (const file of readdirSync(join(here, 'factions')).sort()) {
    if (!file.endsWith('.mjs')) continue;
    const mod = await import(pathToFileURL(join(here, 'factions', file)).href);
    if (mod.TRIM) out.set(mod.TRIM.name, mod.TRIM);
  }
  return out;
}

/** The committed path of a sheet by its name. */
export const sheetPath = (name) => join(repo, SHEET_DIR, `${name}.png`);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(join(repo, SHEET_DIR), { recursive: true });
  for (const [name, trim] of await navyTrims()) {
    const sheet = drawTrimSheet(trim);
    writeFileSync(sheetPath(name), sheet.png);
    console.log(
      `${name}.png: ${sheet.size}², ${sheet.png.length} bytes, a wrap every ${sheet.wrapM} m, ` +
        `mean ${sheet.mean.toFixed(3)}`
    );
  }
}
