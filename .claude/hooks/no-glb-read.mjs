#!/usr/bin/env node
/**
 * PreToolUse hook on Read — refuses a `.glb` and names what to use instead (#899).
 *
 * Read has no binary guard for a GLB: it prints the file into context as text,
 * all of it illegible, and the largest committed model is 625 KB. Grep already
 * skips binaries; Read is the one door left open.
 *
 * A `Read(**\/*.glb)` deny rule in `permissions` was tried first and is too
 * wide. Claude Code applies a Read deny to Bash file commands and to Glob as
 * well, so it also refused `cp` of an export into `docs/concept-art/models/` —
 * hull-intake's filing step — and `git show <rev>:<glb> > x.glb` inside the
 * repo, and Glob stopped listing GLBs at all. This blocks the one call that
 * floods context and nothing else.
 *
 * The handler's `if` in `.claude/settings.json` already narrows it to GLB
 * reads. The path is checked again here because a CLI too old to know `if`
 * runs the hook on every Read, and without this check it would refuse them all.
 */
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const path = input.tool_input?.file_path ?? '';

if (/\.glb$/i.test(path)) {
  process.stderr.write(
    `${path} is a binary glTF; Read would print it into context as text.\n` +
      'Read it with `node tools/hull-models/parts.mjs <file>` (nodes, buffers, materials)\n' +
      "or the hull-intake bake's meta.json (inventory, sizes, glow energy).\n"
  );
  process.exit(2);
}
