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
 *   node tools/roadmap/build.mjs [--public dist/roadmap] [--private <dir>]
 *                                [--single-file]
 *
 * Two cuts, from one set of reads. **public** is what GitHub Pages may show:
 * no issue numbers, links or titles, no tracker counts, no render-stack audit.
 * **private** is the whole page and the audit beside it. A bare run writes
 * the public cut to dist/roadmap, so a forgotten flag never puts the private
 * one where Pages looks. `--out` is the old spelling of `--public`.
 *
 * `--single-file` writes index.html alone, its font, icon and pictures inside
 * it as data URIs, and no audit page: the shape a claude.ai artifact takes
 * (lib/inline.mjs says why).
 *
 * Without a token it still builds — every item renders as "unknown" and the
 * page says so. That keeps the generator runnable locally by anyone, and means
 * a token outage produces an honest page rather than a broken build.
 *
 * Dependency-free by design (`lib/` is three plain modules), so the site
 * cannot fail to build because of something in node_modules.
 */

import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as content from './lib/content.mjs';
import { driftReport } from './lib/drift.mjs';
import { fetchAllIssues, fetchIssueStates } from './lib/github.mjs';
import { artifactPage, fileUri } from './lib/inline.mjs';
import { parseRoadmap } from './lib/parse.mjs';
import { render } from './lib/render.mjs';
import * as renderStack from './lib/renderStack.mjs';
import { findPortraits } from './lib/portraits.mjs';
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
    // A URL path, so forward slashes on every platform: it is an href too.
    to: 'fonts/big-shoulders-display-latin.woff2',
  },
  { from: join(repoRoot, 'packages', 'frontend', 'public', 'favicon.svg'), to: 'favicon.svg' },
];

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 || i === process.argv.length - 1 ? fallback : process.argv[i + 1];
}

// Where each cut goes, or null for a cut not asked for.
const outs = { public: arg('public', arg('out', null)), private: arg('private', null) };
if (outs.public === null && outs.private === null) outs.public = 'dist/roadmap';
const singleFile = process.argv.includes('--single-file');
// The audit is private, and a single file has no second page to put it on.
const withStack = outs.private !== null && !singleFile;
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
// Closed work too: the history phases are a record, and the page says how
// much of what was done no row records.
// The public cut shows neither count, so it does not ask.
const tracker = outs.private !== null ? await fetchAllIssues(REPO, TOKEN) : [];
const drift = driftReport({
  markdown,
  roadmap,
  openIssues: tracker.filter((i) => i.state === 'open'),
  closedIssues: tracker.filter((i) => i.state === 'closed'),
});
if (drift.unplaced.length > 0) {
  console.error(
    `Open issues with no row in docs/ROADMAP.md (${drift.unplaced.length}): ` +
      drift.unplaced.map((i) => `#${i.number} ${i.title}`).join('; ')
  );
}
if (drift.unrecorded.length > 0) {
  console.error(
    `Closed issues on no row, and under no issue that has one (${drift.unrecorded.length}): ` +
      drift.unrecorded.map((i) => `#${i.number}`).join(', ')
  );
}
if (drift.unmentioned.length > 0) {
  console.error(
    `Of those, not mentioned anywhere in the document: ` +
      drift.unmentioned.map((i) => `#${i.number}`).join(', ')
  );
}

// The roster contact sheet tools/hull-maps bakes with the maps. Its size is
// read from the file so the page can reserve the box; its absence is a
// warning, not a failure, and the page simply has no picture.
const sheetFile = findContactSheet(repoRoot);
const sheetSize = sheetFile === null ? null : pngSize(readFileSync(sheetFile.path));
const sheet = sheetSize === null ? null : { ...sheetSize, href: 'roster-contact-sheet.png' };
if (sheetFile === null) console.error('No roster sheet; node tools/hull-maps/sheet.mjs bakes one.');
else if (sheetSize === null) console.error(`${sheetFile.path} is not a PNG; leaving it off.`);
else ASSETS.push({ from: sheetFile.path, to: sheet.href });

// Each navy's portrait: one hull kind in every navy's water, from the renders
// tools/hull-renders committed. A missing one leaves its card without a
// picture and says so here.
const portraits = findPortraits(
  join(repoRoot, 'docs', 'concept-art', 'renders'),
  content.factions,
  content.portraitKind
);
if (portraits.missing.length > 0) {
  console.error(`No hull render for: ${portraits.missing.join(', ')}`);
}
for (const p of Object.values(portraits.found)) ASSETS.push({ from: p.path, to: p.href });

// The second page: #974's render-stack audit. Its frames are files the
// repository already owns, copied rather than embedded, and each ranked
// upgrade's tag reads the state of the issue that tracks it. A state map of
// its own, so nothing the roadmap counts or dates includes these issues.
const frames = withStack ? renderStack.findFrames(repoRoot) : { found: {}, missing: [] };
if (frames.missing.length > 0) {
  console.error(`No render-stack frame at: ${frames.missing.join(', ')}`);
}
const stackStates = withStack
  ? await fetchIssueStates(
      REPO,
      renderStack.UPGRADES.map((u) => u.issue),
      TOKEN
    )
  : new Map();

// Where the page finds each asset: beside it, or inside it.
const src = new Map(ASSETS.map((a) => [a.to, singleFile ? fileUri(a.from) : a.to]));
const fontHref = src.get('fonts/big-shoulders-display-latin.woff2');

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
const page = {
  roadmap,
  states,
  content,
  counts,
  repo: REPO,
  generatedAt,
  fontHref,
  iconHref: src.get('favicon.svg'),
  sheet: sheet === null ? null : { ...sheet, href: src.get(sheet.href) },
  unplaced: drift.unplaced.length,
  unrecorded: drift.unrecorded.length,
  portraits: Object.fromEntries(
    Object.entries(portraits.found).map(([navy, p]) => [navy, { ...p, href: src.get(p.href) }])
  ),
  renderStackHref: withStack ? renderStack.PAGE : null,
};

const copy = (from, target, to) => {
  mkdirSync(dirname(join(target, to)), { recursive: true });
  copyFileSync(from, join(target, to));
};
for (const [audience, out] of Object.entries(outs)) {
  if (out === null) continue;
  // Respect an absolute path. Joining it to the repo root silently wrote the
  // site *inside the working tree* at a path that looked absolute in the log.
  const target = isAbsolute(out) ? out : join(repoRoot, out);
  mkdirSync(target, { recursive: true });
  const html = render({ ...page, audience });
  // One file is the artifact's shape, and there the title is the gallery name.
  const name = `Echoes of the Abyss ${audience === 'private' ? 'Private Roadmap' : 'Roadmap'}`;
  writeFileSync(join(target, 'index.html'), singleFile ? artifactPage(html, name) : html);
  if (!singleFile) {
    for (const asset of ASSETS) copy(asset.from, target, asset.to);
    // GitHub Pages runs Jekyll over the artifact unless told not to, and Jekyll
    // drops anything it considers a hidden or special path.
    writeFileSync(join(target, '.nojekyll'), '');
  }
  if (audience === 'private' && withStack) {
    const stackHtml = renderStack.renderStackPage({
      states: stackStates,
      repo: REPO,
      generatedAt,
      fontHref,
      frames: frames.found,
    });
    writeFileSync(join(target, renderStack.PAGE), stackHtml);
    for (const f of Object.values(frames.found)) copy(f.path, target, f.href);
  }
  const mib = (statSync(join(target, 'index.html')).size / 2 ** 20).toFixed(1);
  console.error(`Wrote the ${audience} cut to ${join(target, 'index.html')} (${mib} MiB).`);
}

console.error(
  `${singleFile ? 'One file each' : 'Built'} — ` +
    `${roadmap.phases.length} phases, ${numbers.length} items, ` +
    `${states.size} states resolved, ${counts.missions} missions, ${counts.maps} maps, ` +
    `${roadmap.sprints.length} sprints, ${drift.unplaced.length} open issues unplaced, ` +
    `${drift.unrecorded.length} closed issues unrecorded, ` +
    `roster sheet ${sheetFile === null ? 'missing' : 'baked'}, ` +
    `${Object.keys(portraits.found).length} of ${content.factions.length} navy portraits, ` +
    (withStack
      ? `render stack with ${Object.keys(frames.found).length} of ${renderStack.FRAMES.length} frames ` +
        `and ${stackStates.size} of ${renderStack.UPGRADES.length} upgrade states.`
      : 'no render stack.')
);
