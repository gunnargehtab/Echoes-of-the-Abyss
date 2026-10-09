import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as content from '../lib/content.mjs';
import { artifactPage, dataUri } from '../lib/inline.mjs';
import { parseRoadmap } from '../lib/parse.mjs';
import { render } from '../lib/render.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const REPO = 'gunnargehtab/Echoes-of-the-Abyss';
const roadmap = parseRoadmap(readFileSync(join(root, 'docs', 'ROADMAP.md'), 'utf8'));

// Every issue the real roadmap names, half closed, each with a title no page
// for the public may carry. The real doc, so a new shape it grows is covered.
const numbers = [
  ...roadmap.phases.flatMap((p) => p.items.map((i) => i.number)),
  ...roadmap.standing.questions.map((q) => q.number).filter((n) => n !== null),
];
const states = new Map(
  numbers.map((n, i) => [
    n,
    {
      state: i % 2 === 0 ? 'closed' : 'open',
      title: `tracker-only title ${n}`,
      url: `https://github.com/${REPO}/issues/${n}`,
      createdAt: '2026-09-01T00:00:00Z',
      closedAt: i % 2 === 0 ? '2026-09-02T00:00:00Z' : null,
    },
  ])
);
const page = (audience) =>
  render({
    roadmap,
    states,
    content,
    counts: { missions: 29, maps: 3, factions: 4 },
    repo: REPO,
    generatedAt: 'now',
    fontHref: 'fonts/x.woff2',
    unplaced: 7,
    unrecorded: 5,
    renderStackHref: 'render-stack.html',
    audience,
  });

// What a reader sees, without the stylesheet's hex colours or the script.
const text = (html) =>
  html
    .replace(/<style>[\s\S]*?<\/style>/g, '')
    .replace(/<script>[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, ' ');

test('the public cut links nothing on GitHub and names no issue', () => {
  const html = page('public');
  assert.doesNotMatch(html, /github\.com/);
  assert.doesNotMatch(html, /tracker-only title/);
  assert.doesNotMatch(html, /class="ref"|class="issue"/);
  assert.doesNotMatch(text(html), /#\d+\b/, 'an issue number in the visible text');
});

test('the public cut drops the tracker counts and the audit', () => {
  const html = page('public');
  assert.doesNotMatch(html, /class="lede backlog"/);
  assert.doesNotMatch(html, /render-stack\.html/);
});

test('the public cut still says what is done, and how much', () => {
  const html = page('public');
  assert.match(html, /data-state="closed"/);
  assert.match(html, /data-state="open"/);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /<span class="state-tag">(fixed|being worked on)<\/span>/);
});

test('the private cut is the whole page', () => {
  const html = page('private');
  assert.match(html, /class="ref" href="https:\/\/github\.com\//);
  assert.match(html, /title="tracker-only title \d+"/);
  assert.match(html, /7 more open items in the tracker are/);
  assert.match(html, /5 closed issues are recorded on no row/);
  assert.match(html, /href="render-stack\.html"/);
  assert.match(html, /The project on GitHub/);
});

test('render refuses an audience it does not know', () => {
  assert.throws(() => page('team'), /audience is 'public' or 'private'/);
});

test('an inlined picture is not linked to itself', () => {
  const png = dataUri('x.png', Buffer.from([0x89, 0x50]));
  const html = render({
    roadmap,
    states,
    content,
    counts: { missions: 29, maps: 3, factions: 4 },
    repo: REPO,
    generatedAt: 'now',
    fontHref: dataUri('x.woff2', Buffer.from([1])),
    iconHref: dataUri('x.svg', Buffer.from('<svg/>')),
    sheet: { href: png, width: 2, height: 1 },
    audience: 'private',
  });
  assert.match(html, new RegExp(`<img src="${png.replace(/[+/]/g, '\\$&')}"`));
  assert.doesNotMatch(html, /<a href="data:/);
  assert.match(html, /<link rel="icon" href="data:image\/svg\+xml;base64,/);
  assert.match(html, /url\('data:font\/woff2;base64,/);
});

test('dataUri types by extension and refuses one it does not know', () => {
  assert.equal(dataUri('a.PNG', Buffer.from('hi')), 'data:image/png;base64,aGk=');
  assert.throws(() => dataUri('a.gif', Buffer.from('hi')), /No data-URI type/);
});

test('artifactPage drops the skeleton the viewer supplies, and names the page', () => {
  const html = artifactPage(page('private'), 'Echoes of the Abyss Private Roadmap');
  assert.doesNotMatch(html, /<!doctype|<html|<head>|<\/head>|<body|<\/body>|<\/html>/i);
  assert.match(html.slice(0, 8192), /<title>Echoes of the Abyss Private Roadmap<\/title>/);
  assert.match(html, /<style>/);
  assert.match(html, /<main/);
});

test('artifactPage refuses a page whose skeleton it cannot find once', () => {
  assert.throws(() => artifactPage('<p>no skeleton</p>', 'x'), /Expected one/);
});
