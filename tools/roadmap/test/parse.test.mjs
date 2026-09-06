import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseRoadmap } from '../lib/parse.mjs';
import * as content from '../lib/content.mjs';
import { driftReport, mentionedIssues, placedIssues } from '../lib/drift.mjs';
import { inline, render } from '../lib/render.mjs';
import { SHEET_FILE, findContactSheet, pngSize } from '../lib/sheet.mjs';
import { firstFiled, formatSpan, span } from '../lib/dates.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = 'gunnargehtab/Echoes-of-the-Abyss';
const url = (n) => `https://github.com/${REPO}/issues/${n}`;

const SAMPLE = `# Project Roadmap

## Where the build actually stands

Twenty-one issues are open.

| Question | Reading | Tracked |
| --- | --- | --- |
| Does a skirmish finish? | **29 of 30** ended without a winner | [#440](${url(440)}) |
| Is the frame time real? | Nothing has been timed | [#286](${url(286)}) |

What *is* done:

- the **Echo Layer** resolving per player at 5 Hz, with PropagationFactor
  integrated along the path;
- **depth as an order** — descent fast and deafening.

## Phase 1 — Make the second pillar playable

**Closed.** Depth became an order.

| Work | Issue |
| --- | --- |
| Depth orders — descent SIG | [#98](${url(98)}) |
| Depth HUD ([ui-ux.md](ui-ux.md) §8) | [#99](${url(99)}) |

**Why it went first.** Everything downstream was inert.

## Phase 3 — The map becomes an opponent

**Closed.**

| Work | Issue |
| --- | --- |
| The Drift | [#104](${url(104)}) |

## Phase 10 — What the audit found

The September 2026 audit (epic [#428](${url(428)})) read everything.

**The match that does not end**

| Work | Issue |
| --- | --- |
| Match resolution | [#440](${url(440)}) |

**Design**

| Work | Issue |
| --- | --- |
| Two exclusive hulls | [#436](${url(436)}) |
| A population cap | [#437](${url(437)}) |

**Why match resolution stands alone at the top.** Every other row is an improvement.

## Sequencing notes

Three new ones survive any reordering:

1. **Match resolution ([#440](${url(440)})) before any balance tuning.** The
   guard-rails cannot rule on one decided match.
2. **Echo pass scaling before the cap.** Both add entities.

## Ground rules

- **Docs are canonical.**

## Completed — Sprint 2 (August 2026)

Phases 1 through 5, in order, each landing as its own pull request.

Three bugs found along the way.

## Related

- **[README.md](README.md)**
`;

test('phases: heading, verdict, summary, rows', () => {
  const { phases } = parseRoadmap(SAMPLE);
  assert.deepEqual(
    phases.map((p) => p.id),
    ['Phase 1', 'Phase 3', 'Phase 10']
  );
  const [one, three, ten] = phases;
  assert.equal(one.title, 'Make the second pillar playable');
  assert.equal(one.verdict, 'Closed');
  assert.equal(one.summary, 'Depth became an order.');
  assert.deepEqual(
    one.items.map((i) => i.number),
    [98, 99]
  );
  assert.equal(one.items[0].group, null);
  // A verdict standing alone still counts as the verdict.
  assert.equal(three.verdict, 'Closed');
  assert.equal(three.summary, null);
});

test('phases: bold labels between tables name groups; bold sentences do not', () => {
  const { phases } = parseRoadmap(SAMPLE);
  const ten = phases[2];
  assert.equal(ten.verdict, null);
  assert.match(ten.summary, /^The September 2026 audit/);
  assert.deepEqual(ten.groups, ['The match that does not end', 'Design']);
  assert.deepEqual(
    ten.items.map((i) => [i.number, i.group]),
    [
      [440, 'The match that does not end'],
      [436, 'Design'],
      [437, 'Design'],
    ]
  );
});

test('standing: the status table and the built list', () => {
  const { standing } = parseRoadmap(SAMPLE);
  assert.equal(standing.intro, 'Twenty-one issues are open.');
  assert.deepEqual(
    standing.questions.map((q) => [q.question, q.number]),
    [
      ['Does a skirmish finish?', 440],
      ['Is the frame time real?', 286],
    ]
  );
  assert.deepEqual(
    standing.built.map((b) => b.lead),
    ['Echo Layer', 'depth as an order']
  );
  // Wrapped bullets are joined, and the trailing semicolon is dropped.
  assert.equal(
    standing.built[0].detail,
    'resolving per player at 5 Hz, with PropagationFactor integrated along the path'
  );
  assert.equal(standing.built[1].detail, 'descent fast and deafening');
});

test('sprints and sequencing notes', () => {
  const { sprints, sequencing } = parseRoadmap(SAMPLE);
  assert.deepEqual(sprints, [
    {
      id: 'Sprint 2',
      when: 'August 2026',
      summary: 'Phases 1 through 5, in order, each landing as its own pull request.',
    },
  ]);
  assert.equal(sequencing.length, 2);
  assert.equal(
    sequencing[0].lead,
    `Match resolution ([#440](${url(440)})) before any balance tuning.`
  );
  assert.match(sequencing[0].detail, /^The guard-rails cannot rule/);
});

test('inline markdown: code, emphasis, links, bare issue refs, and escaping', () => {
  assert.equal(inline('a `b` **c** *d*', REPO), 'a <code>b</code> <strong>c</strong> <em>d</em>');
  // Relative doc links become text; absolute ones stay links.
  assert.equal(inline('see [ui-ux.md](ui-ux.md) §8', REPO), 'see ui-ux.md §8');
  assert.equal(inline(`[#98](${url(98)})`, REPO), `<a href="${url(98)}">#98</a>`);
  assert.equal(
    inline('landed (#382)', REPO),
    `landed (<a class="issue" href="${url(382)}">#382</a>)`
  );
  assert.equal(inline('<script>', REPO), '&lt;script&gt;');
  // `~150` is a number, not a strikethrough, and `#` inside a word is left alone.
  assert.equal(inline('beyond ~150 entities', REPO), 'beyond ~150 entities');
});

test('the real roadmap parses to what the site needs', () => {
  const markdown = readFileSync(join(here, '..', '..', '..', 'docs', 'ROADMAP.md'), 'utf8');
  const roadmap = parseRoadmap(markdown);
  assert.ok(roadmap.phases.length >= 10, 'ten phases and counting');
  for (const phase of roadmap.phases) {
    assert.ok(phase.items.length > 0, `${phase.id} has rows`);
    for (const item of phase.items)
      assert.ok(item.work.length > 0, `${phase.id} #${item.number} has a description`);
  }
  assert.ok(roadmap.standing.questions.length >= 3, 'the status table');
  assert.ok(roadmap.standing.built.length >= 5, 'the built list');
  assert.ok(roadmap.sprints.length >= 3, 'the completed sprints');
  assert.ok(roadmap.sequencing.length >= 3, 'the sequencing notes');
});

test('render: builds without state, and every tracked item appears with its state', () => {
  const roadmap = parseRoadmap(SAMPLE);
  const states = new Map([
    [98, { state: 'closed', title: 'Depth', url: url(98), closedAt: null }],
    [440, { state: 'closed', title: 'Match resolution', url: url(440), closedAt: null }],
  ]);
  const counts = { missions: 29, maps: 3, factions: 4 };
  const html = render({
    roadmap,
    states,
    content,
    counts,
    repo: REPO,
    generatedAt: '2026-09-05 15:00 UTC',
    fontHref: 'fonts/x.woff2',
  });
  assert.match(html, /class="item closed" data-state="closed"[\s\S]*?#98</);
  assert.match(html, /class="item closed" data-state="closed"[\s\S]*?#440</);
  assert.match(html, /class="item unknown" data-state="unknown"[\s\S]*?#99</);
  // The player-facing sentence replaces the doc's engineering wording.
  assert.match(html, /Dive and surface on command/);
  assert.doesNotMatch(html, /Depth orders — descent SIG/);
  // Counts fill the playable cards and the stat tiles.
  assert.match(html, /A 29-mission campaign/);
  assert.match(html, /3 maps, 4 navies/);
  assert.match(html, /Last read 2026-09-05 15:00 UTC/);
  // A rough edge whose issue has closed reads as fixed, not as current.
  assert.match(html, /They do now\. The AI used to stall/);
  assert.doesNotMatch(html, /Not reliably, not yet/);
  // Nothing on the page talks about the repository's plumbing.
  assert.doesNotMatch(html, /green main|pull request|merged/i);

  const blind = render({
    roadmap,
    states: new Map(),
    content,
    counts,
    repo: REPO,
    generatedAt: 'never',
    fontHref: 'fonts/x.woff2',
  });
  assert.match(blind, /without access to the issue tracker/);
});

test('content: every row of the real roadmap has a player-facing sentence', () => {
  const markdown = readFileSync(join(here, '..', '..', '..', 'docs', 'ROADMAP.md'), 'utf8');
  const roadmap = parseRoadmap(markdown);
  const missing = roadmap.phases
    .flatMap((p) => p.items)
    .filter((i) => !(i.number in content.items))
    .map((i) => `#${i.number}`);
  assert.deepEqual(missing, [], `rows without copy in lib/content.mjs: ${missing.join(', ')}`);
  for (const phase of roadmap.phases) {
    assert.ok(content.phases[phase.number]?.title, `${phase.id} has a player-facing title`);
  }
  for (const group of roadmap.phases.flatMap((p) => p.groups)) {
    assert.ok(content.groups[group], `group "${group}" has a player-facing label`);
  }
  for (const q of roadmap.standing.questions) {
    assert.ok(content.roughEdges[q.number], `status row #${q.number} has player-facing copy`);
  }
  for (const s of roadmap.sprints) {
    assert.ok(content.sprints[s.id], `${s.id} has a player-facing summary`);
  }
});

test('sheet: the newest issue directory with a contact sheet wins, and its size is read', () => {
  const dir = mkdtempSync(join(tmpdir(), 'roadmap-sheet-'));
  for (const name of ['issue-461', 'issue-466', 'issue-470', 'logo-hud'])
    mkdirSync(join(dir, name));
  // A 1×2 PNG header is enough: signature, IHDR length and type, width, height.
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1,
    0, 0, 0, 2,
  ]);
  writeFileSync(join(dir, 'issue-461', SHEET_FILE), png);
  writeFileSync(join(dir, 'issue-466', SHEET_FILE), png);
  // issue-470 has other screenshots but no sheet, so it is not the newest sheet.
  writeFileSync(join(dir, 'issue-470', 'other.png'), png);
  writeFileSync(join(dir, 'logo-hud', SHEET_FILE), png);
  const found = findContactSheet(dir);
  assert.equal(found.issue, 466);
  assert.equal(found.path, join(dir, 'issue-466', SHEET_FILE));
  assert.deepEqual(pngSize(readFileSync(found.path)), { width: 1, height: 2 });
  assert.equal(pngSize(Buffer.from('not a png')), null);
  assert.equal(findContactSheet(join(dir, 'missing')), null);
  rmSync(dir, { recursive: true });
});

test('sheet: the repository has one, so the public page has its picture', () => {
  const found = findContactSheet(join(here, '..', '..', '..', 'docs', 'screenshots'));
  assert.ok(found !== null, 'a rung-roster-sprites.png under docs/screenshots/issue-N/');
  const size = pngSize(readFileSync(found.path));
  assert.ok(size.width > 0 && size.height > 0);
});

test('drift: open issues the roadmap has no row for, epics excluded, prose mentions noted', () => {
  const roadmap = parseRoadmap(SAMPLE);
  const issue = (number, labels = []) => ({
    number,
    title: `Issue ${number}`,
    url: url(number),
    labels,
  });
  const openIssues = [
    issue(440), // a row in Phase 10 — placed
    issue(286), // a status row — placed
    issue(428, ['epic']), // an epic — never counted
    issue(382), // mentioned nowhere in SAMPLE
    issue(99), // a row in Phase 1 — placed
  ];
  const { unplaced, unmentioned } = driftReport({
    markdown: SAMPLE + '\nThe sequel to #382 is in progress.\n',
    roadmap,
    openIssues: [...openIssues, issue(500)],
  });
  assert.deepEqual(
    unplaced.map((i) => i.number),
    [382, 500]
  );
  assert.deepEqual(
    unmentioned.map((i) => i.number),
    [500]
  );
  assert.deepEqual(
    [...placedIssues(roadmap)].sort((a, b) => a - b),
    [98, 99, 104, 286, 436, 437, 440]
  );
  assert.ok(mentionedIssues(SAMPLE).has(428));
});

test('render: the roster figure and the unplaced line appear only when there is something to show', () => {
  const roadmap = parseRoadmap(SAMPLE);
  const base = {
    roadmap,
    states: new Map(),
    content,
    counts: { missions: 29, maps: 3, factions: 4 },
    repo: REPO,
    generatedAt: 'never',
    fontHref: 'fonts/x.woff2',
  };
  const bare = render(base);
  assert.doesNotMatch(bare, /class="sheet/);
  assert.doesNotMatch(bare, /not yet placed on this roadmap/);

  const full = render({
    ...base,
    sheet: { href: 'roster-contact-sheet.png', width: 1424, height: 1204 },
    unplaced: 4,
  });
  assert.match(
    full,
    /<img src="roster-contact-sheet.png" width="1424" height="1204"[^>]*alt="Contact sheet/
  );
  assert.match(full, /The fleet, as it renders today/);
  assert.match(full, /4 more open items in the tracker are not yet placed on this roadmap/);
  assert.match(
    render({ ...base, unplaced: 1 }),
    /One more open item in the tracker is not yet placed/
  );
});

test('dates: a phase spans from its first issue filed to its last one closed', () => {
  const items = [{ number: 1 }, { number: 2 }, { number: 3 }];
  const at = (created, closed, state = 'closed') => ({
    state,
    createdAt: created,
    closedAt: closed,
  });
  const states = new Map([
    [1, at('2026-08-23T09:00:00Z', '2026-08-24T10:00:00Z')],
    [2, at('2026-08-22T09:00:00Z', '2026-08-23T10:00:00Z')],
    [3, at('2026-08-25T09:00:00Z', '2026-08-26T10:00:00Z')],
  ]);
  assert.deepEqual(span(items, states), {
    start: '2026-08-22T09:00:00Z',
    end: '2026-08-26T10:00:00Z',
    ongoing: false,
  });
  assert.equal(formatSpan(span(items, states)), '22–26 Aug 2026');

  // One item still open: the phase has no end date, however much of it closed.
  const withOpen = new Map(states);
  withOpen.set(3, at('2026-08-25T09:00:00Z', null, 'open'));
  const partial = span(items, withOpen);
  assert.equal(partial.end, null);
  assert.equal(partial.ongoing, true);
  assert.equal(formatSpan(partial), 'since 22 Aug 2026');

  // Nothing known — a build with no token draws no dates at all.
  assert.equal(span(items, new Map()), null);
  assert.equal(formatSpan(null), null);
  assert.equal(firstFiled(states), '22 Aug 2026');
});

test('dates: a range is set by how far apart its ends are', () => {
  const at = (start, end) => formatSpan({ start, end, ongoing: false });
  assert.equal(at('2026-08-23T01:00:00Z', '2026-08-23T23:00:00Z'), '23 Aug 2026');
  assert.equal(at('2026-08-15T01:00:00Z', '2026-08-24T01:00:00Z'), '15–24 Aug 2026');
  assert.equal(at('2026-08-30T01:00:00Z', '2026-09-06T01:00:00Z'), '30 Aug – 6 Sep 2026');
  assert.equal(at('2026-12-30T01:00:00Z', '2027-01-06T01:00:00Z'), '30 Dec 2026 – 6 Jan 2027');
  // The day is read in UTC, not the builder's timezone: a late-evening close
  // must not roll onto the next day for a runner east of Greenwich.
  assert.equal(at('2026-08-23T23:30:00Z', '2026-08-23T23:59:00Z'), '23 Aug 2026');
});

test('render: every phase carries the dates it ran, and the page says when it began', () => {
  const roadmap = parseRoadmap(SAMPLE);
  const states = new Map([
    [
      98,
      {
        state: 'closed',
        title: 'D',
        url: url(98),
        createdAt: '2026-08-23T01:00:00Z',
        closedAt: '2026-08-23T09:00:00Z',
      },
    ],
    [
      99,
      {
        state: 'closed',
        title: 'H',
        url: url(99),
        createdAt: '2026-08-22T01:00:00Z',
        closedAt: '2026-08-24T09:00:00Z',
      },
    ],
  ]);
  const html = render({
    roadmap,
    states,
    content,
    counts: { missions: 29, maps: 3, factions: 4 },
    repo: REPO,
    generatedAt: '2026-09-06 09:00 UTC',
    fontHref: 'fonts/x.woff2',
  });
  assert.match(html, /class="phase-when">22–24 Aug 2026</);
  assert.match(html, /The first issue on this roadmap was filed 22 Aug 2026\./);
  // A phase whose issues are unknown draws no date rather than a wrong one.
  assert.doesNotMatch(html, /phase-when">(null|undefined|NaN)/);
});
