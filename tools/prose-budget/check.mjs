/**
 * Report how long a GitHub body is against CLAUDE.md's budget.
 *
 * Advisory by default in CI: it prints the reading and exits 0, because a
 * body two words over is not worth a red check, and a merge blocked on prose
 * length would be the most annoying gate in the repository. `--strict` is the
 * blocking form, and is what to use locally before posting something long.
 *
 * Never interpolate a body into a shell command — `--env` exists so a workflow
 * can pass it through the environment instead, where nothing in it can run.
 *
 *   node tools/prose-budget/check.mjs --kind=pr --env=PR_BODY
 *   node tools/prose-budget/check.mjs --kind=comment --strict body.md
 *   pbpaste | node tools/prose-budget/check.mjs --kind=issue
 */

import { readFileSync } from 'node:fs';

import { BUDGETS, measure } from './lib/count.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const kind = flag('kind') ?? 'pr';
const strict = args.includes('--strict');

if (!(kind in BUDGETS)) {
  console.error(`unknown --kind=${kind}; expected one of ${Object.keys(BUDGETS).join(', ')}`);
  process.exit(2);
}

const envName = flag('env');
const file = args.find((a) => !a.startsWith('--'));
let body = '';
if (envName) body = process.env[envName] ?? '';
else if (file) body = readFileSync(file, 'utf8');
else body = readFileSync(0, 'utf8');

const { label, words, budget, over } = measure(kind, body);

console.log(`### ${label}: ${words} words (budget ${budget})`);
console.log('');
if (over === 0) {
  console.log('Within budget.');
} else {
  console.log(
    `Over by ${over}. Cut it to ${budget} — short sentences, facts over narrative, ` +
      'a link instead of a quotation. See CLAUDE.md, "Write short on GitHub".'
  );
  if (!strict) console.log('');
  if (!strict) console.log('_This check is advisory and never blocks a merge._');
}

process.exit(strict && over > 0 ? 1 : 0);
