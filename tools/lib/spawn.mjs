/**
 * Spawning a gate, on every platform the gates run on.
 *
 * Extracted from `tools/gates.mjs` when `tools/claude-docs/check.mjs` became the
 * second caller. The Windows reasoning below is the whole reason this is a
 * module rather than ten lines copied twice: a runtime gotcha restated in two
 * places is a gotcha that gets fixed in one of them.
 *
 * On Windows `npm` and `npx` are `.cmd` batch files, and since the fix for
 * CVE-2024-27980 (Node 18.20.2, 20.12.2, 21.7.3) spawning a batch file without a
 * shell throws EINVAL. spawnSync does not throw it at you — it returns
 * `status: null` with `error` set — so every gate used to FAIL in 0.0s with
 * nothing printed. The only supported way to run a `.cmd` is through cmd.exe.
 *
 * Shelling out means cmd.exe parses the line, so the arguments are quoted here
 * rather than handed to spawnSync alongside `shell: true`: Node only joins those
 * with spaces (and warns that it does, DEP0190), and the doc gates pass every
 * document path as an argument. Inside double quotes cmd.exe leaves
 * `& | < > ^ ( )` alone, but still expands `%` and cannot contain a `"`, so an
 * argument holding either is refused outright rather than passed on mangled. The
 * joined line is also bounded — cmd.exe stops at 8,191 characters — which the
 * doc lists (1,793 characters for `docs/` and 641 for `.claude/` at `8cf4be6`)
 * are well inside; past it, cmd.exe
 * says the line is too long itself.
 */

import { spawnSync } from 'node:child_process';

/**
 * Run `command` with `commandArgs` in `cwd`, inheriting stdio.
 *
 * Returns whatever spawnSync returns, so a caller reads `status` for pass/fail
 * and `error` for "never started". Nothing here throws.
 */
export function spawn(command, commandArgs, options = {}) {
  const { cwd, ...rest } = options;
  if (process.platform !== 'win32') {
    return spawnSync(command, commandArgs, { cwd, stdio: 'inherit', ...rest });
  }
  const unsafe = commandArgs.find((a) => /["%]/.test(a));
  if (unsafe !== undefined) {
    return { status: null, error: new Error(`cannot pass ${unsafe} through cmd.exe`) };
  }
  const line = [command, ...commandArgs.map((a) => `"${a}"`)].join(' ');
  return spawnSync(line, { cwd, stdio: 'inherit', shell: true, ...rest });
}
