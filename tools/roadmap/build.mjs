#!/usr/bin/env node
/**
 * Build the roadmap site.
 *
 * The page is generated from two sources, and which one owns what is the whole
 * design:
 *
 * - **`docs/ROADMAP.md` owns the structure and the reasoning.** Phases, what
 *   belongs in each, and why it is ordered that way. This repository's first
 *   rule is that the docs are canonical, so the site parses the doc rather
 *   than keeping a second copy of it that would drift by Thursday. Adding a
 *   row to a phase table is how you add an item to the site.
 * - **GitHub owns the state.** Whether an issue is open or closed is not
 *   something a checked-in file can know, and a hand-maintained checkbox is
 *   wrong the moment somebody closes an issue from their phone.
 *
 * So: read the phases out of the doc, ask the API what state each issue is in,
 * render. Nothing about progress is stored anywhere.
 *
 *   node tools/roadmap/build.mjs [--out dist/roadmap]
 *
 * Without a token it still builds — every item renders as "unknown" and the
 * page says so. That keeps the generator runnable locally by anyone, and means
 * a token outage produces an honest page rather than a broken build.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPO = process.env.GITHUB_REPOSITORY ?? 'gunnargehtab/Echoes-of-the-Abyss';
const TOKEN = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? '';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 || i === process.argv.length - 1 ? fallback : process.argv[i + 1];
}

/**
 * Pull the phase tables out of the roadmap.
 *
 * Deliberately a small, strict parser rather than a markdown library: it reads
 * exactly the shape this document already uses — an `## Phase N — Title`
 * heading, then rows of `| description | [#123](url) |` — and anything it does
 * not recognise it ignores rather than guesses at. A generator that silently
 * invents structure from prose would put things on a public page that nobody
 * wrote.
 */
function parsePhases(markdown) {
  const phases = [];
  let current = null;

  for (const line of markdown.split('\n')) {
    const heading = /^##\s+(Phase\s+\d+)\s+—\s+(.+?)\s*$/.exec(line);
    if (heading !== null) {
      current = { id: heading[1], title: heading[2], items: [] };
      phases.push(current);
      continue;
    }
    // Any other H2 ends the phase: "Sequencing notes" is not a phase.
    if (/^##\s+/.test(line)) {
      current = null;
      continue;
    }
    if (current === null || !line.startsWith('|')) continue;

    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 2) continue;
    const issue = /\[#(\d+)\]/.exec(cells[1] ?? '');
    if (issue === null) continue;

    current.items.push({
      // Strip the doc's own markdown links out of the description — the site
      // has nowhere to send a relative link to another design document.
      work: (cells[0] ?? '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'),
      number: Number(issue[1]),
    });
  }
  return phases.filter((phase) => phase.items.length > 0);
}

/** Ask GitHub what state these issues are in. Empty map when there is no token. */
async function fetchStates(numbers) {
  const states = new Map();
  if (TOKEN === '') return states;

  for (const number of numbers) {
    const response = await fetch(`https://api.github.com/repos/${REPO}/issues/${number}`, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${TOKEN}`,
        'user-agent': 'echoes-roadmap-build',
      },
    }).catch(() => null);
    if (response === null || !response.ok) continue;
    const issue = await response.json();
    states.set(number, {
      state: issue.state,
      title: issue.title,
      url: issue.html_url,
    });
  }
  return states;
}

const escape = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function render(phases, states, generatedAt) {
  const all = phases.flatMap((phase) => phase.items);
  const known = all.filter((item) => states.has(item.number));
  const done = known.filter((item) => states.get(item.number).state === 'closed');
  const pct = known.length === 0 ? 0 : Math.round((done.length / known.length) * 100);

  const phaseHtml = phases
    .map((phase) => {
      const items = phase.items;
      const closed = items.filter((i) => states.get(i.number)?.state === 'closed').length;
      const rated = items.filter((i) => states.has(i.number)).length;
      const complete = rated > 0 && closed === rated;

      const rows = items
        .map((item) => {
          const known = states.get(item.number);
          const state = known?.state ?? 'unknown';
          const href = known?.url ?? `https://github.com/${REPO}/issues/${item.number}`;
          return `        <li class="item ${state}">
          <span class="mark" aria-hidden="true"></span>
          <span class="work">${escape(item.work)}</span>
          <a class="ref" href="${escape(href)}">#${item.number}</a>
        </li>`;
        })
        .join('\n');

      return `      <section class="phase${complete ? ' complete' : ''}">
        <header>
          <h2>${escape(phase.id)} <span class="phase-title">${escape(phase.title)}</span></h2>
          <p class="count">${closed} of ${rated || items.length}</p>
        </header>
        <ul>
${rows}
        </ul>
      </section>`;
    })
    .join('\n');

  const provenance =
    states.size === 0
      ? `<p class="warn">Built without a GitHub token, so no issue state could be read.
        Every item below is shown as unknown.</p>`
      : `<p class="stamp">Issue state read from GitHub at ${escape(generatedAt)}.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Echoes of the Abyss — Roadmap</title>
<meta name="description" content="Development progress for Echoes of the Abyss, a browser-native RTS with acoustic fog of war.">
<style>
  /* docs/style-neon-noir.md. Cyan is the interface voice, magenta the chrome. */
  :root {
    --abyss-void: #03080e;
    --abyss-floor: #070e1a;
    --abyss-panel: #0a1424;
    --abyss-glass: #0d1c28;
    --neon-cyan: #35e0ff;
    --neon-magenta: #ff3da6;
    --neon-teal: #5fd0c0;
    --neon-amber: #f2b233;
    --text-bright: #d6e6f0;
    --text-dim: #6f8a9c;
    --text-cyan: #a8d0e0;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 3rem 1.25rem 5rem;
    background: var(--abyss-void);
    color: var(--text-dim);
    font: 15px/1.65 ui-monospace, Consolas, monospace;
    /* Depth is always below: the gradient runs into black downward. */
    background-image: linear-gradient(var(--abyss-floor), var(--abyss-void) 60%);
    background-repeat: no-repeat;
  }
  main { max-width: 62rem; margin: 0 auto; }
  h1 {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--neon-cyan);
    text-shadow: 0 0 10px rgba(53, 224, 255, 0.35);
  }
  .tagline { margin: 0.4rem 0 2rem; font-size: 0.85rem; }
  .overall {
    border: 1px solid rgba(255, 61, 166, 0.4);
    border-radius: 4px;
    background: var(--abyss-glass);
    padding: 1rem 1.2rem;
    margin-bottom: 2.5rem;
  }
  .bar {
    height: 6px;
    border-radius: 3px;
    background: rgba(53, 224, 255, 0.12);
    overflow: hidden;
    margin: 0.7rem 0 0.5rem;
  }
  .bar span {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--neon-teal), var(--neon-cyan));
    box-shadow: 0 0 10px rgba(53, 224, 255, 0.5);
  }
  .headline { font-size: 0.95rem; color: var(--text-bright); letter-spacing: 0.06em; }
  .stamp, .warn { margin: 0; font-size: 0.72rem; }
  .warn { color: var(--neon-amber); }
  .phase {
    border: 1px solid rgba(53, 224, 255, 0.16);
    border-radius: 4px;
    background: var(--abyss-panel);
    padding: 1rem 1.2rem;
    margin-bottom: 1rem;
  }
  .phase.complete { border-color: rgba(95, 208, 192, 0.4); }
  .phase header { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }
  .phase h2 {
    margin: 0;
    font-size: 0.8rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-cyan);
  }
  .phase-title { color: var(--text-dim); letter-spacing: 0.08em; text-transform: none; }
  .count { margin: 0; font-size: 0.72rem; letter-spacing: 0.12em; opacity: 0.7; }
  .phase ul { list-style: none; margin: 0.8rem 0 0; padding: 0; }
  .item { display: grid; grid-template-columns: 1rem 1fr auto; gap: 0.7rem; padding: 0.3rem 0; font-size: 0.82rem; }
  .item + .item { border-top: 1px solid rgba(53, 224, 255, 0.07); }
  .mark { width: 9px; height: 9px; border-radius: 50%; align-self: center; border: 1px solid currentColor; }
  /* State is never colour alone — a filled dot and a dimmed row carry it too. */
  .item.closed { color: var(--neon-teal); }
  .item.closed .mark { background: var(--neon-teal); }
  .item.closed .work { text-decoration: line-through; opacity: 0.55; }
  .item.open { color: var(--neon-amber); }
  .item.unknown { color: var(--text-dim); opacity: 0.6; }
  .work { color: inherit; }
  .item.open .work, .item.unknown .work { color: var(--text-bright); }
  .ref { color: var(--text-cyan); text-decoration: none; opacity: 0.8; }
  .ref:hover, .ref:focus-visible { text-decoration: underline; opacity: 1; }
  footer { margin-top: 2.5rem; font-size: 0.72rem; opacity: 0.6; }
  footer a { color: var(--text-cyan); }
  @media (prefers-reduced-motion: no-preference) {
    .bar span { transition: width 0.6s ease; }
  }
</style>
</head>
<body>
<main>
  <h1>Echoes of the Abyss</h1>
  <p class="tagline">A browser-native, server-authoritative RTS with acoustic fog of war.
    You do not see the enemy. You hear them, badly.</p>

  <div class="overall">
    <p class="headline">${done.length} of ${known.length || all.length} tracked items complete — ${pct}%</p>
    <div class="bar"><span style="width: ${pct}%"></span></div>
    ${provenance}
  </div>

${phaseHtml}

  <footer>
    <p>Generated from <code>docs/ROADMAP.md</code>, which owns the structure, and the
      GitHub issue API, which owns the state. Nothing about progress is stored in this
      page. &middot; <a href="https://github.com/${REPO}">Repository</a></p>
  </footer>
</main>
</body>
</html>
`;
}

const out = arg('out', 'dist/roadmap');
const markdown = readFileSync(join(repoRoot, 'docs', 'ROADMAP.md'), 'utf8');
const phases = parsePhases(markdown);

if (phases.length === 0) {
  console.error(
    'No phases found in docs/ROADMAP.md. Expected "## Phase N — Title" headings followed ' +
      'by tables with [#123](...) issue links.'
  );
  process.exit(1);
}

const numbers = [...new Set(phases.flatMap((phase) => phase.items.map((item) => item.number)))];
const states = await fetchStates(numbers);
if (TOKEN === '') {
  console.error('No GITHUB_TOKEN — building with every item marked unknown.');
}

const html = render(phases, states, new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC');
// Respect an absolute --out. Joining it to the repo root silently wrote the
// site *inside the working tree* at a path that looked absolute in the log.
const target = isAbsolute(out) ? out : join(repoRoot, out);
mkdirSync(target, { recursive: true });
writeFileSync(join(target, 'index.html'), html);

console.error(
  `Wrote ${join(target, 'index.html')} — ${phases.length} phases, ${numbers.length} items, ` +
    `${states.size} states resolved.`
);
