#!/usr/bin/env node
/**
 * Build the roadmap site.
 *
 * The page is generated from two sources, and which one owns what is the whole
 * design:
 *
 * - **`docs/ROADMAP.md` owns the structure and the reasoning.** Phases, what
 *   belongs in each, why it is ordered that way, what is built, what gates
 *   what. This repository's first rule is that the docs are canonical, so the
 *   site parses the doc rather than keeping a second copy of it that would
 *   drift by Thursday. Adding a row to a phase table is how you add an item to
 *   the site.
 * - **GitHub owns the state.** Whether an issue is open or closed is not
 *   something a checked-in file can know, and a hand-maintained checkbox is
 *   wrong the moment somebody closes an issue from their phone.
 *
 * So: read the doc, ask the API what state each issue is in, render. Nothing
 * about progress is stored anywhere.
 *
 *   node tools/roadmap/build.mjs [--out dist/roadmap]
 *
 * Without a token it still builds — every item renders as "unknown" and the
 * page says so. That keeps the generator runnable locally by anyone, and means
 * a token outage produces an honest page rather than a broken build.
 *
 * Dependency-free by design (`lib/` is three plain modules), so the site
 * cannot fail to build because of something in node_modules.
 */

import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as content from './lib/content.mjs';
import { driftReport } from './lib/drift.mjs';
import { fetchIssueStates, fetchOpenIssues } from './lib/github.mjs';
import { parseRoadmap } from './lib/parse.mjs';
import { render } from './lib/render.mjs';
import { findContactSheet, pngSize } from './lib/sheet.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPO = process.env.GITHUB_REPOSITORY ?? 'gunnargehtab/Echoes-of-the-Abyss';
const TOKEN = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? '';

/**
 * The two brand assets the page needs, taken from where the shell already
 * keeps them rather than copied into this tool — one source for the logo
 * (docs/naming.md), and the frontend transcribes it.
 */
const ASSETS = [
  {
    from: join(
      repoRoot,
      'packages',
      'frontend',
      'src',
      'assets',
      'fonts',
      'big-shoulders-display-latin.woff2'
    ),
    to: join('fonts', 'big-shoulders-display-latin.woff2'),
  },
  { from: join(repoRoot, 'packages', 'frontend', 'public', 'favicon.svg'), to: 'favicon.svg' },
];

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 || i === process.argv.length - 1 ? fallback : process.argv[i + 1];
}

const out = arg('out', 'dist/roadmap');
const markdown = readFileSync(join(repoRoot, 'docs', 'ROADMAP.md'), 'utf8');
const roadmap = parseRoadmap(markdown);

if (roadmap.phases.length === 0) {
  console.error(
    'No phases found in docs/ROADMAP.md. Expected "## Phase N — Title" headings followed ' +
      'by tables with [#123](...) issue links.'
  );
  process.exit(1);
}

const numbers = [
  ...new Set([
    ...roadmap.phases.flatMap((phase) => phase.items.map((item) => item.number)),
    ...roadmap.standing.questions.map((q) => q.number).filter((n) => n !== null),
  ]),
];
const states = await fetchIssueStates(REPO, numbers, TOKEN);
if (TOKEN === '') {
  console.error('No GITHUB_TOKEN — building with every item marked unknown.');
}

// The other direction of the same question. The rows above ask the tracker
// about the doc; this asks the doc about the tracker, so an issue filed since
// the roadmap was last written is counted on the page and named in the log
// rather than silently absent from both.
const drift = driftReport({ markdown, roadmap, openIssues: await fetchOpenIssues(REPO, TOKEN) });
if (drift.unplaced.length > 0) {
  console.error(
    `Open issues with no row in docs/ROADMAP.md (${drift.unplaced.length}): ` +
      drift.unplaced.map((i) => `#${i.number} ${i.title}`).join('; ')
  );
}
if (drift.unmentioned.length > 0) {
  console.error(
    `Of those, not mentioned anywhere in the document: ` +
      drift.unmentioned.map((i) => `#${i.number}`).join(', ')
  );
}

// The roster contact sheet — the newest one an art PR committed. Its size is
// read from the file so the page can reserve the box; its absence is a
// warning, not a failure, and the page simply has no picture.
const sheetFile = findContactSheet(join(repoRoot, 'docs', 'screenshots'));
const sheetSize = sheetFile === null ? null : pngSize(readFileSync(sheetFile.path));
const sheet = sheetSize === null ? null : { ...sheetSize, href: 'roster-contact-sheet.png' };
if (sheetFile === null) console.error('No rung-roster-sprites.png under docs/screenshots.');
else if (sheetSize === null) console.error(`${sheetFile.path} is not a PNG; leaving it off.`);
else ASSETS.push({ from: sheetFile.path, to: sheet.href });

// The numbers on the stat tiles are counted from the repository rather than
// typed in, so a new mission or map shows up without anyone editing the site.
const counts = {
  missions: readdirSync(join(repoRoot, 'docs')).filter((f) => /^mission-.*\.md$/.test(f)).length,
  maps: readdirSync(join(repoRoot, 'packages', 'backend', 'src', 'sim', 'maps')).filter(
    (f) => f.endsWith('.ts') && f !== 'index.ts' && f !== 'types.ts'
  ).length,
  factions: content.factions.length,
};

// A row without player-facing copy renders in the doc's own words, which are
// written for engineers. Say so, loudly, so it gets a sentence.
const uncovered = numbers.filter(
  (n) => !(n in content.items) && roadmap.phases.some((p) => p.items.some((i) => i.number === n))
);
if (uncovered.length > 0) {
  console.error(
    `No player-facing copy in lib/content.mjs for: ${uncovered.map((n) => `#${n}`).join(', ')}`
  );
}

const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
const html = render({
  roadmap,
  states,
  content,
  counts,
  repo: REPO,
  generatedAt,
  fontHref: 'fonts/big-shoulders-display-latin.woff2',
  sheet,
  unplaced: drift.unplaced.length,
});

// Respect an absolute --out. Joining it to the repo root silently wrote the
// site *inside the working tree* at a path that looked absolute in the log.
const target = isAbsolute(out) ? out : join(repoRoot, out);
mkdirSync(join(target, 'fonts'), { recursive: true });
writeFileSync(join(target, 'index.html'), html);
for (const asset of ASSETS) copyFileSync(asset.from, join(target, asset.to));
// GitHub Pages runs Jekyll over the artifact unless told not to, and Jekyll
// drops anything it considers a hidden or special path.
writeFileSync(join(target, '.nojekyll'), '');

console.error(
  `Wrote ${join(target, 'index.html')} — ${roadmap.phases.length} phases, ${numbers.length} items, ` +
    `${states.size} states resolved, ${counts.missions} missions, ${counts.maps} maps, ` +
    `${roadmap.sprints.length} sprints, ${drift.unplaced.length} open issues unplaced, ` +
    `roster sheet ${sheetFile === null ? 'missing' : `from #${sheetFile.issue}`}.`
);
