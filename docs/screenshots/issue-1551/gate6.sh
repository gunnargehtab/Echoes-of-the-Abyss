#!/usr/bin/env bash
# #1551 gate 6 on the GTX 1070: the whole tree at BEFORE (main just before
# #1536, a6e380da) and at AFTER (main with #1536's last merge, 3fdb6015), each
# read at tools/render-stack/capture.mjs's four cameras on Ventfront, unpaced,
# headed in Chrome, at ratios 1 and 1.5, two runs each (RUNS="3 4" adds two
# more under their own names). Run from the repo root
# with the dev servers up and nothing uncommitted; the trap puts the branch
# back. docs/screenshots/issue-1551/table.py tables what it writes.
set -u
cd "$(git rev-parse --show-toplevel)"
BEFORE=${BEFORE:-a6e380da}
AFTER=${AFTER:-3fdb6015}
BRANCH=$(git rev-parse --abbrev-ref HEAD)
OUT=${OUT:-.dev-loop/g6-1551}
mkdir -p "$OUT"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then echo "tree has uncommitted changes"; exit 1; fi
restore() { git switch -q "$BRANCH" && npm run -s build:shared >/dev/null 2>&1; echo "restored $BRANCH"; }
trap restore EXIT
up() {
  for i in $(seq 1 90); do
    a=$(curl -s -o /dev/null -w '%{http_code}' localhost:3000)
    b=$(curl -s -o /dev/null -w '%{http_code}' localhost:5173)
    [ "$a" = 200 ] && [ "$b" = 200 ] && return 0
    sleep 2
  done
  echo "servers did not come back"; return 1
}
V='http://localhost:5173/?map=ventfront-divide'
drive() { # rev ratio run
  local dir="$OUT/ventfront-$1-dpr$2-r$3"
  echo "=== $(date +%H:%M:%S) $1 dpr $2 run $3"
  UNPACED=1 VIEW_DPR="$2" timeout 900 node .claude/skills/run-game/scripts/drive.mjs \
    --headed --channel chrome --url "$V" --out "$dir" --steps tools/render-stack/capture.mjs \
    > "$dir.log" 2>&1
  echo "exit $? $(grep -cE 'AssertionError|Error:' "$dir.log") errors"
}
for rev in ${REVS:-before after}; do
  sha=$BEFORE; [ "$rev" = after ] && sha=$AFTER
  git -c advice.detachedHead=false checkout -q --detach "$sha" || exit 1
  npm run -s build:shared > "$OUT/build-$rev.log" 2>&1 || { echo "build failed"; exit 1; }
  sleep 10; up || exit 1; sleep 15
  echo "### $rev at $(git rev-parse --short HEAD)"
  for run in ${RUNS:-1 2}; do
    for ratio in 1 1.5; do drive $rev $ratio $run; done
  done
done
echo "=== done $(date +%H:%M:%S)"
