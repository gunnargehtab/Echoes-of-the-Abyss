#!/usr/bin/env bash
# Cut one arm's branch. Run from the repository root.
#
#   .claude/skill-eval/prepare-arm.sh 627 a     # skill present  (treatment)
#   .claude/skill-eval/prepare-arm.sh 627 b     # skill removed  (control)
#   .claude/skill-eval/prepare-arm.sh 627 c     # skill and the CLAUDE.md guard removed
#
# Arms are cut from origin/main, never from the branch carrying this harness.
# That is not tidiness: `traps.json` is the pre-registered answer key, and an arm
# that could read it would be graded on a test it had seen.
set -euo pipefail

EXP="${1:?experiment id, e.g. 627}"
ARM="${2:?arm letter: a, b or c}"
BASE="${3:-origin/main}"
BRANCH="skill-eval/${EXP}-arm-${ARM}"

git fetch origin "${BASE#origin/}" 2>/dev/null || true
git checkout -B "$BRANCH" "$BASE"

if [ -e .claude/skill-eval ]; then
  echo "refusing: the harness is present on this base, so the arm could read traps.json" >&2
  exit 1
fi

case "$ARM" in
  a)
    test -d .claude/skills/colyseus || { echo "refusing: arm A needs the skill present" >&2; exit 1; }
    ;;
  b|c)
    test -d .claude/skills/colyseus || { echo "refusing: nothing to remove" >&2; exit 1; }
    git rm -rq .claude/skills/colyseus
    git commit -qm "eval(${EXP}): arm ${ARM} — the vendored colyseus skill is not on disk"
    ;;
  *) echo "unknown arm: $ARM" >&2; exit 1 ;;
esac

if [ "$ARM" = "c" ]; then
  # CLAUDE.md carries the same version guard in prose, so arm B measures the
  # skill's value *over that paragraph* rather than its value outright. Arm C
  # removes the paragraph too, which is the only way to price the guard itself.
  anchor='The vendored `colyseus` skill documents'
  grep -qF "$anchor" CLAUDE.md || { echo "refusing: the CLAUDE.md guard paragraph moved; re-find it" >&2; exit 1; }
  python3 - <<'PY'
import pathlib, re
p = pathlib.Path('CLAUDE.md')
s = p.read_text()
start = s.index('The vendored `colyseus` skill documents')
end = s.index('\n\n', s.index('not as a description of this backend.'))
p.write_text(s[:start].rstrip('\n') + '\n\n' + s[end:].lstrip('\n'))
PY
  git commit -qam "eval(${EXP}): arm c — the CLAUDE.md version guard is also absent"
fi

git push -u origin "$BRANCH" --force-with-lease
echo
echo "arm ${ARM} ready: ${BRANCH}"
echo "  colyseus skill: $([ -d .claude/skills/colyseus ] && echo present || echo absent)"
echo "  CLAUDE.md guard: $(grep -qF 'The vendored `colyseus` skill documents' CLAUDE.md && echo present || echo absent)"
