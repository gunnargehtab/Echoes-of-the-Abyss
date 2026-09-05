import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseRoadmap } from '../lib/parse.mjs';
import * as content from '../lib/content.mjs';
import { inline, render } from '../lib/render.mjs';

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
