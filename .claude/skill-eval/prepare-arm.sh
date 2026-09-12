#!/usr/bin/env bash
# Cut one arm's branch. Run from the repository root.
#
#   .claude/skill-eval/prepare-arm.sh 627 a     # skill present  (treatment)
#   .claude/skill-eval/prepare-arm.sh 627 b     # skill removed  (control)
#   .claude/skill-eval/prepare-arm.sh 627 c     # skill and the CLAUDE.md guard removed
#
# Cut every arm of one experiment from the same base, or they are not
# comparable. The default base is origin/main, so cut them together rather than
# days apart.
set -euo pipefail

EXP="${1:?experiment id, e.g. 627}"
ARM="${2:?arm letter: a, b or c}"
BASE="${3:-origin/main}"
BRANCH="skill-eval/${EXP}-arm-${ARM}"

case "$ARM" in a|b|c) ;; *) echo "unknown arm: $ARM" >&2; exit 1 ;; esac

# The arm branch does not carry this script, so the checkout below deletes it
# out from under the shell that is running it. Bash has already read the file so
# the run finishes, but an early exit used to leave the tree parked on a
# half-cut arm. Restore on every path out, not only the happy one.
# A dirty tree cannot be cut from: the removals below are `git rm`, which refuses
# to drop a file with local modifications, and the raw git error does not say
# that the fix is to commit this harness first.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "refusing: the working tree has uncommitted changes — commit or stash first" >&2
  git status --short >&2
  exit 1
fi

ORIGINAL="$(git rev-parse --abbrev-ref HEAD)"
trap 'git checkout -q "$ORIGINAL" 2>/dev/null || true' EXIT

git fetch -q origin "${BASE#origin/}" 2>/dev/null || true
git checkout -q -B "$BRANCH" "$BASE"

# `main` carries this harness since #688 merged, so refusing a base that has it
# would refuse every cut from here on. The invariant was never "the base never
# had the answer key" — it is "the arm does not carry it", which a removal
# satisfies and the assertion below proves.
if [ -e .claude/skill-eval ]; then
  git rm -rq .claude/skill-eval
  git commit -qm "eval(${EXP}): arm ${ARM} — the arm does not carry its own answer key"
fi

if [ "$ARM" != a ]; then
  test -d .claude/skills/colyseus || { echo "refusing: no colyseus skill to remove" >&2; exit 1; }
  git rm -rq .claude/skills/colyseus
  git commit -qm "eval(${EXP}): arm ${ARM} — the vendored colyseus skill is not on disk"
fi

if [ "$ARM" = c ]; then
  # CLAUDE.md carries the same version guard in prose, so arm B measures the
  # skill's value *over that paragraph* rather than its value outright. Arm C
  # removes the paragraph too, which is the only way to price the guard itself.
  grep -qF 'The vendored `colyseus` skill documents' CLAUDE.md \
    || { echo "refusing: the CLAUDE.md guard paragraph moved; re-find it" >&2; exit 1; }
  python3 - <<'PY'
import pathlib
p = pathlib.Path('CLAUDE.md')
s = p.read_text()
start = s.index('The vendored `colyseus` skill documents')
end = s.index('\n\n', s.index('not as a description of this backend.'))
p.write_text(s[:start].rstrip('\n') + '\n\n' + s[end:].lstrip('\n'))
PY
  git commit -qam "eval(${EXP}): arm c — the CLAUDE.md version guard is also absent"
fi

# Assert the arm's shape rather than trusting the steps that built it.
KEY="$([ -e .claude/skill-eval ] && echo present || echo absent)"
SKILL="$([ -d .claude/skills/colyseus ] && echo present || echo absent)"
GUARD="$(grep -qF 'The vendored `colyseus` skill documents' CLAUDE.md && echo present || echo absent)"
case "$ARM" in
  a) WANT_SKILL=present; WANT_GUARD=present ;;
  b) WANT_SKILL=absent;  WANT_GUARD=present ;;
  c) WANT_SKILL=absent;  WANT_GUARD=absent  ;;
esac
[ "$KEY" = absent ] || { echo "refusing to push: the arm carries traps.json" >&2; exit 1; }
[ "$SKILL" = "$WANT_SKILL" ] || { echo "refusing to push: skill $SKILL, wanted $WANT_SKILL" >&2; exit 1; }
[ "$GUARD" = "$WANT_GUARD" ] || { echo "refusing to push: guard $GUARD, wanted $WANT_GUARD" >&2; exit 1; }

git push -q -u origin "$BRANCH" --force-with-lease

echo "arm ${ARM} ready: ${BRANCH}  (base $(git rev-parse --short "$BASE"))"
echo "  answer key:      ${KEY}"
echo "  colyseus skill:  ${SKILL}"
echo "  CLAUDE.md guard: ${GUARD}"
