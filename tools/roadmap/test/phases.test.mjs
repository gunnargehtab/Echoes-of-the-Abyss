import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as content from '../lib/content.mjs';
import { driftReport } from '../lib/drift.mjs';
import { parseRoadmap } from '../lib/parse.mjs';
import { render } from '../lib/render.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const REPO = 'gunnargehtab/Echoes-of-the-Abyss';
const url = (n) => `https://github.com/${REPO}/issues/${n}`;

// History, then the plan: one phase Now, one Next, and Later outside the
// sequence. Each shape here is one the real document uses.
const DOC = `# Roadmap

## Phase 10 — What the audit found

**Closed.** The audit's rows.

| Work | Issue |
| --- | --- |
| Match resolution | [#440](${url(440)}) |

## Phase 11 — The carriers

**Now.** The one phase being worked.

**Done when:** the commander flies a carrier, and no row below is open.

**The carriers**

| Work | Issue |
| --- | --- |
| Wave 8 | [#839](${url(839)}) |

## Phase 12 — An ocean you can read

**Next.** Starts when Phase 11's test passes.

**Done when:** the frame is timed on a real GPU.

| Work | Issue |
| --- | --- |
| Frame time | [#286](${url(286)}) |

## Later — Parked and unscheduled

**Later.** Nothing here is dated.

**Competitive play**

| Work | Issue |
| --- | --- |
| A competitive-mode document | [#439](${url(439)}) |

Prose between tables is not a row.
`;

const states = new Map([
  [
    440,
    {
      state: 'closed',
      title: 'x',
      url: url(440),
      createdAt: '2026-09-05T00:00:00Z',
      closedAt: '2026-09-06T00:00:00Z',
    },
  ],
  [
    839,
    { state: 'open', title: 'x', url: url(839), createdAt: '2026-09-20T00:00:00Z', closedAt: null },
  ],
  [
    286,
    { state: 'open', title: 'x', url: url(286), createdAt: '2026-08-30T00:00:00Z', closedAt: null },
  ],
  [
    439,
    { state: 'open', title: 'x', url: url(439), createdAt: '2026-09-05T00:00:00Z', closedAt: null },
  ],
]);

test('phases: Now, Next and Later are read with their tests', () => {
  const { phases } = parseRoadmap(DOC);
  assert.deepEqual(
    phases.map((p) => [p.id, p.key, p.verdict, p.later]),
    [
      ['Phase 10', 10, 'Closed', false],
      ['Phase 11', 11, 'Now', false],
      ['Phase 12', 12, 'Next', false],
      ['Later', 'later', 'Later', true],
    ]
  );
  const [, now, next, later] = phases;
  assert.equal(now.done, 'the commander flies a carrier, and no row below is open.');
  assert.equal(now.summary, 'The one phase being worked.');
  assert.deepEqual(now.groups, ['The carriers']);
  assert.equal(next.done, 'the frame is timed on a real GPU.');
  assert.equal(later.number, null);
  assert.deepEqual(
    later.items.map((i) => i.number),
    [439]
  );
});

test('render: Now is dated, Next and Later are not, and each test is shown', () => {
  const html = render({
    roadmap: parseRoadmap(DOC),
    states,
    content,
    counts: { missions: 29, maps: 3, factions: 4 },
    repo: REPO,
    generatedAt: 'now',
    fontHref: 'fonts/x.woff2',
  });
  const card = (key) =>
    html.match(
      new RegExp(
        `<details class="phase [^"]*" id="phase-${key}"[\\s\\S]*?</details>\\s*(?=<details class="phase|</div>)`
      )
    )[0];
  assert.match(card(11), /class="phase active"/);
  assert.match(card(11), /class="phase-when">since 20 Sep 2026</);
  assert.match(card(11), /<span class="verdict">now</);
  assert.match(card(11), /class="done-when"><b>Done when<\/b>/);
  assert.doesNotMatch(card(12), /class="phase-when"/, 'Next has not started, so it has no date');
  assert.match(card(12), /<span class="verdict">next</);
  assert.doesNotMatch(card('later'), /class="phase-when"/, 'Later is undated by definition');
  assert.match(card('later'), /class="phase later"/);
  // Later has a section and a nav link of its own, and is not a phase to finish.
  assert.match(html, /<section id="later">/);
  assert.match(html, /<a href="#later">Later<\/a>/);
  assert.match(html, /of 3 on the roadmap/);
  assert.ok(html.indexOf('id="phase-10"') > html.indexOf('<section id="past">'), 'history is past');
  assert.ok(html.indexOf('id="phase-12"') < html.indexOf('<section id="later">'), 'Next is ahead');
});

test('drift: an epic row stands for its sub-issues, open and closed', () => {
  const roadmap = parseRoadmap(DOC);
  const issue = (number, state, parent = null, labels = [], stateReason = null) => ({
    number,
    title: `Issue ${number}`,
    url: url(number),
    state,
    stateReason,
    labels,
    parent,
  });
  const { unplaced, unrecorded } = driftReport({
    markdown: DOC,
    roadmap,
    openIssues: [
      issue(863, 'open', 839), // under a Now row — placed through its parent
      issue(900, 'open', 901), // under an epic with no row — unplaced
      issue(901, 'open', null, ['epic']), // an epic never counts as missing work
    ],
    closedIssues: [
      issue(838, 'closed', 839), // under a row — recorded
      issue(850, 'closed', 863), // two levels down — still recorded
      issue(700, 'closed'), // done, on no row — unrecorded
      issue(701, 'closed', null, ['duplicate']), // not work done
      issue(702, 'closed', null, [], 'not_planned'), // not work done
    ],
  });
  assert.deepEqual(
    unplaced.map((i) => i.number),
    [900]
  );
  assert.deepEqual(
    unrecorded.map((i) => i.number),
    [700]
  );
});

// The rule the document now states: one phase runs at a time. A second Now,
// a Now or Next without its test, or a plan phase numbered below the history
// fails here rather than quietly on the page.
test('the real roadmap runs one phase at a time', () => {
  const { phases } = parseRoadmap(readFileSync(join(root, 'docs', 'ROADMAP.md'), 'utf8'));
  const now = phases.filter((p) => p.verdict === 'Now');
  const next = phases.filter((p) => p.verdict === 'Next');
  assert.equal(now.length, 1, 'exactly one phase is Now');
  assert.ok(next.length <= 1, 'at most one phase is Next');
  for (const p of [...now, ...next]) assert.ok(p.done, `${p.id} says when it is done`);
  const history = phases.filter((p) => !p.later && p.verdict !== 'Now' && p.verdict !== 'Next');
  const newestHistory = Math.max(...history.map((p) => p.number));
  assert.ok(now[0].number > newestHistory, 'Now comes after every history phase');
  if (next.length === 1)
    assert.equal(next[0].number, now[0].number + 1, 'Next is right behind Now');
  assert.equal(phases.filter((p) => p.later).length, 1, 'one Later section');
  for (const p of history)
    assert.match(p.verdict ?? '', /^Closed/, `${p.id} is history, so closed`);
});
