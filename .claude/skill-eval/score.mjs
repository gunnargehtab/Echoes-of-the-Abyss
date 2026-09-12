/**
 * Score one arm of a skill A/B against its pre-registered traps.
 *
 *   node .claude/skill-eval/score.mjs --experiment 627 --range main..HEAD
 *   node .claude/skill-eval/score.mjs --experiment 627 --diff /tmp/arm-a.diff
 *   node .claude/skill-eval/score.mjs --experiment 627 --selftest
 *
 * **It grades the diff's added lines, not the tree.** Two of the drift patterns
 * match legitimately on current main — `extends Room<MatchState>` is the correct
 * 0.15 form, and `from 'colyseus'` appears inside a comment explaining why not to
 * write it — so a whole-tree scan would report a baseline of two and measure
 * nothing. What an arm *wrote* is the only thing an arm can be graded on.
 *
 * The trap file is written before either arm runs and is never on an arm's
 * branch. An arm that could read `traps.json` would be graded on a test it had
 * seen, which is not a measurement.
 */

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

function arg(name, fallback = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}

/** Added and removed lines, per file, out of a unified diff. */
function parseDiff(text) {
  const files = new Map();
  let current = null;
  for (const line of text.split('\n')) {
    const header = line.match(/^\+\+\+ b\/(.+)$/);
    if (header) {
      current = header[1];
      if (!files.has(current)) files.set(current, { added: [], removed: [] });
      continue;
    }
    if (!current) continue;
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('+')) files.get(current).added.push(line);
    else if (line.startsWith('-')) files.get(current).removed.push(line);
  }
  return files;
}

const inScope = (path, scope) => !scope || scope.some((p) => path.startsWith(p));
/** `raw` traps see the leading +/-, so a pattern can anchor on the diff marker itself. */
const body = (line) => line.slice(1);

function evaluate(trap, files, spec) {
  const scope = trap.scope ?? spec.scope;
  const re = trap.pattern ? new RegExp(trap.pattern, 'm') : null;
  const hits = [];

  const walk = (side) => {
    for (const [path, sides] of files) {
      if (trap.file && path !== trap.file) continue;
      if (!trap.file && !inScope(path, scope)) continue;
      for (const line of sides[side]) {
        const subject = trap.raw ? line : body(line);
        if (re.test(subject)) hits.push({ path, line: body(line).trim().slice(0, 120) });
      }
    }
  };

  switch (trap.direction) {
    case 'mustNotAppear': {
      walk('added');
      return { tripped: hits.length > 0, hits };
    }
    case 'mustAppear': {
      walk('added');
      return { tripped: hits.length === 0, hits };
    }
    case 'mustVanish': {
      walk('removed');
      const gone = hits.length > 0;
      hits.length = 0;
      walk('added');
      // Removed *and* not written back. A diff that deletes the guard and
      // reintroduces it three lines down has not removed it.
      return { tripped: !(gone && hits.length === 0), hits };
    }
    case 'mustSurvive': {
      walk('removed');
      const removed = hits.length;
      hits.length = 0;
      walk('added');
      // Removed and not put back is the only failing shape. A hunk that touches
      // the line and rewrites it identically is not a regression.
      return { tripped: removed > 0 && hits.length === 0, hits: [] };
    }
    case 'fileAdded': {
      // Graded on the arm's diff, never on the working tree. #627 was closed by
      // #687 *during* the session that wrote this, so the arms' base already
      // carried the file this criterion asks for — and an `existsSync` check
      // read that as satisfied. A criterion the base already meets measures the
      // base, not the arm, so it is called out rather than passed.
      const candidates = [trap.path, ...(trap.alternates ?? [])];
      const atBase = candidates.find((p) => spec.baseHas?.(p));
      if (atBase) {
        return {
          tripped: true,
          vacuous: true,
          hits: [{ path: atBase, line: 'already present at the base — this arm cannot be graded on it' }],
        };
      }
      const touched = candidates.find((p) => files.has(p) && files.get(p).added.length > 0);
      return { tripped: !touched, hits: touched ? [{ path: touched, line: 'added by this arm' }] : [] };
    }
    default:
      throw new Error(`unknown direction: ${trap.direction}`);
  }
}

function report(spec, files) {
  const results = spec.traps.map((t) => ({ trap: t, ...evaluate(t, files, spec) }));
  const width = Math.max(...results.map((r) => r.trap.id.length));

  for (const group of ['drift', 'house', 'criterion']) {
    const rows = results.filter((r) => r.trap.group === group);
    if (!rows.length) continue;
    console.log(`\n${group.toUpperCase()}`);
    for (const r of rows) {
      const verdict = r.vacuous ? 'VACUOUS' : r.tripped ? (r.trap.severity === 'tell' ? 'TELL' : 'FAIL') : 'ok';
      console.log(`  ${r.trap.id.padEnd(width)}  ${verdict}`);
      for (const h of r.hits.slice(0, 3)) console.log(`      ${h.path}: ${h.line}`);
    }
  }

  const blocking = results.filter((r) => r.tripped && r.trap.severity !== 'tell');
  const tells = results.filter((r) => r.tripped && r.trap.severity === 'tell');
  console.log(
    `\n${blocking.length} blocking, ${tells.length} tell, ` +
      `${results.length - blocking.length - tells.length} clean of ${results.length}`
  );

  const json = arg('json');
  if (typeof json === 'string') {
    const record = {
      experiment: spec.experiment,
      arm: arg('arm', 'unnamed'),
      blocking: blocking.map((r) => r.trap.id),
      tells: tells.map((r) => r.trap.id),
      results: results.map((r) => ({ id: r.trap.id, tripped: r.tripped, hits: r.hits })),
    };
    execFileSync('tee', [json], { input: JSON.stringify(record, null, 2), stdio: ['pipe', 'ignore', 'inherit'] });
    console.log(`record: ${json}`);
  }
  return blocking.length;
}



const EXP = String(arg('experiment', '627'));
const spec = JSON.parse(readFileSync(join(HERE, EXP, 'traps.json'), 'utf8'));

/**
 * The fixture lives with the experiment, because a trap file that cannot detect
 * its own trap measures nothing, and each experiment traps a different thing.
 */
const SELFTEST = () => readFileSync(join(HERE, EXP, 'selftest.diff'), 'utf8');

/** Whether a path exists at the range's base, so a trivially-met criterion shows up. */
function baseProbe(range) {
  const base = String(range).split(/\.{2,3}/)[0];
  if (!base) return undefined;
  return (path) => {
    try {
      execFileSync('git', ['cat-file', '-e', `${base}:${path}`], { cwd: REPO, stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  };
}

if (arg('selftest')) {
  // Two fixtures, because no single diff can exercise every trap. The drift
  // fixture is an arm that wrote the wrong API; the empty diff is an arm that
  // did nothing, which is what trips every `mustAppear` and `mustVanish`. A
  // pattern that fires on neither has never been executed and is not a test.
  const fixtures = [
    ['drift fixture', parseDiff(SELFTEST())],
    ['empty diff', parseDiff('')],
  ];
  for (const [name, files] of fixtures) {
    console.log(`\n=== ${name} ===`);
    report(spec, files);
  }
  const silent = spec.traps
    .filter((t) => !fixtures.some(([, files]) => evaluate(t, files, spec).tripped))
    .map((t) => t.id);
  if (silent.length) {
    console.error(`\nselftest FAILED — never tripped by either fixture: ${silent.join(', ')}`);
    process.exit(2);
  }
  console.log(`\nselftest passed: all ${spec.traps.length} traps fire on at least one fixture.`);
  process.exit(0);
}

const range = arg('range', 'main...HEAD');
if (typeof arg('diff') !== 'string') spec.baseHas = baseProbe(range);

const diffText =
  typeof arg('diff') === 'string'
    ? readFileSync(String(arg('diff')), 'utf8')
    : execFileSync('git', ['diff', '--unified=0', String(range)], {
        cwd: REPO,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      });

process.exit(report(spec, parseDiff(diffText)) > 0 ? 1 : 0);
