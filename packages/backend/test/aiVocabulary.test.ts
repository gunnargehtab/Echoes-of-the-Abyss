/**
 * The counts the vocabulary states about itself — #703.
 *
 * `ai/types.ts` opens by saying how wide the commander's vocabulary is: so
 * many variants against so many in-match client messages. Five other
 * sentences in this tree state one of those numbers, in `wire.ts`,
 * `CLAUDE.md`, `docs/tech-stack.md` twice and `docs/ROADMAP.md`. Every one of
 * them is prose.
 *
 * #621 was filed because a sentence in that same header asserted a set
 * equality that had been false for the life of the file, and the fix made the
 * *partition* a build error. It did not make the **arithmetic over it** one.
 * Build a verb and prune its entry — which is exactly the workflow
 * `AiUnbuilt` prescribes, and the only way it is ever meant to shrink — and
 * all six sentences go stale in the same commit with nothing to catch them.
 * That is the defect #621 was about, one level up, and #703's fourth
 * acceptance criterion is the promise this file keeps.
 *
 * **Nothing here counts a list.** The numbers are derived, and the derivation
 * rests on the assertions in `ai/types.ts` rather than on a copy of any list
 * kept here: those prove the three unions partition the in-match set, and a
 * partition is what makes the variant count a subtraction. It could not count
 * `AiCommand`'s variants in any case — a union is erased long before a test
 * can run — and the point is that it does not need to.
 *
 * Reading source from a test earns its keep here for the reason
 * `packages/shared/test/units.test.ts` sets out and `missionSafety.test.ts`
 * reuses in a stronger form: the property is about a *written sentence*, and
 * a sentence does not survive to runtime.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { CLIENT_MSG, LOBBY_MSG, SERVER_MSG } from '@echoes/shared';
import { AI_EXEMPT, AI_UNBUILT } from '../src/ai/types.ts';

/** The six numbers, each derived from the one declaration that owns it. */
const COUNT = {
  client: Object.keys(CLIENT_MSG).length,
  server: Object.keys(SERVER_MSG).length,
  lobby: LOBBY_MSG.length,
  inMatch: Object.keys(CLIENT_MSG).length - LOBBY_MSG.length,
  named: AI_UNBUILT.length + AI_EXEMPT.length,
  /**
   * The variant count, by subtraction — see the header. `AiCommand` has no
   * run-time form to count, and giving it one would be the second list this
   * file exists to avoid.
   */
  said: Object.keys(CLIENT_MSG).length - LOBBY_MSG.length - (AI_UNBUILT.length + AI_EXEMPT.length),
} as const;

type Quantity = keyof typeof COUNT;

const repoFile = (path: string) =>
  readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');

/**
 * One line, comment leaders gone and whitespace collapsed.
 *
 * So a pattern can be written as the sentence reads rather than as it wraps.
 * Every one of these sentences is wrapped by something — prettier in the two
 * TypeScript files, a human at 96 columns in the Markdown — and a pattern
 * that encodes today's line breaks fails the next time a word is added
 * upstream of it, which would make this gate a nuisance rather than a check.
 */
const flatten = (text: string) =>
  text
    .replace(/^[ \t]*\*[ \t]?/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Numbers these sentences spell out rather than write. */
const WORDS: Record<string, number> = { four: 4, five: 5, six: 6, seven: 7 };

/**
 * Every sentence in the tree that states one of the six.
 *
 * Named one by one rather than found by scanning for digits, because a scan
 * over `docs/` finds every measured figure in the design bible and a gate
 * that cannot say which sentence it means is one nobody can act on. Adding a
 * seventh statement means adding a row here, and that cost is the point: the
 * numbers are cheap to write down and expensive to keep true, so there should
 * not be many places that write them down.
 *
 * Each pattern must match **exactly once** in its file. A second copy of the
 * sentence is a second place to drift, which is the fault itself rather than
 * a duplicate of it.
 */
const SITES: { file: string; says: string; pattern: RegExp; quantities: Quantity[] }[] = [
  {
    file: 'CLAUDE.md',
    says: 'the wire, in the paragraph above the constants rule',
    pattern: /(\w+) a client may send, (\w+) the room may send/g,
    quantities: ['client', 'server'],
  },
  {
    file: 'packages/shared/src/wire.ts',
    says: '`InMatchClientMessageKey`, which is the set the subtraction starts from',
    pattern: /a seated commander may send — (\w+) of the (\w+)\./g,
    quantities: ['inMatch', 'client'],
  },
  {
    file: 'packages/backend/src/ai/types.ts',
    says: "the header's claim about how much of the interface the commander plays through",
    pattern: /\*\*(\w+) named exceptions\*\*: (\w+) variants against the (\w+) in-match client/g,
    quantities: ['named', 'said', 'inMatch'],
  },
  {
    file: 'docs/tech-stack.md',
    says: 'the wire section',
    pattern:
      /(\w+) names a client may send — (\w+) in a match and (\w+) only in the lobby — (\w+) the room may send/g,
    quantities: ['client', 'inMatch', 'lobby', 'server'],
  },
  {
    file: 'docs/tech-stack.md',
    says: '"The skirmish AI", the paragraph #621 rewrote',
    pattern: /counts today are \*\*(\w+) variants against (\w+) in-match client messages\*\*/g,
    quantities: ['said', 'inMatch'],
  },
  {
    file: 'docs/ROADMAP.md',
    says: "the #703 row's summary",
    pattern: /a vocabulary of (\w+) of (\w+)/g,
    quantities: ['said', 'inMatch'],
  },
];

describe('the vocabulary counts', () => {
  for (const site of SITES) {
    it(`holds what ${site.file} says about ${site.says}`, () => {
      const matches = [...flatten(repoFile(site.file)).matchAll(site.pattern)];
      assert.equal(
        matches.length,
        1,
        `${matches.length} sentences in ${site.file} match /${site.pattern.source}/, wanted 1. ` +
          'If the sentence was reworded, move this row with it rather than deleting it — the ' +
          'numbers it states are the thing being held, not the wording. If it was copied, ' +
          'the copy is a second place for the count to rot.'
      );

      const stated = matches[0]!.slice(1);
      assert.equal(stated.length, site.quantities.length, 'pattern and quantities disagree');

      site.quantities.forEach((quantity, index) => {
        const written = stated[index]!;
        const value = /^\d+$/.test(written) ? Number(written) : WORDS[written.toLowerCase()];
        assert.ok(
          value !== undefined,
          `${site.file} writes "${written}" where a number for ${quantity} was expected — if it ` +
            `is spelled out, add it to WORDS`
        );
        assert.equal(
          value,
          COUNT[quantity],
          `${site.file} says ${quantity} is ${written}, and the source says ${COUNT[quantity]}. ` +
            'Either the sentence went stale — the usual cause is a verb built and its `AiUnbuilt` ' +
            'entry pruned, which moves `said` and `named` together — or a count moved by ' +
            'accident. Every sentence listed in SITES states the same six numbers.'
        );
      });
    });
  }
});
