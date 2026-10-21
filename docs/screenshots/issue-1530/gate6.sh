#!/usr/bin/env bash
# #1530 gate 6 on the GTX 1070: the whole tree at BEFORE (main before #1515)
# and at AFTER (main with #1467's nine effects), each read at
# tools/render-stack/capture.mjs's four cameras on Ventfront and Sorrowgate and
# at the fight station (docs/screenshots/issue-1083/fight.mjs), unpaced, headed
# in Edge, at ratios 1 and 1.5, two runs each. Run from the repo root with the
# dev servers up and nothing uncommitted; the trap puts the branch back.
# docs/screenshots/issue-1530/table.py tables what it writes.
set -u
cd /d/Claude
BEFORE=${BEFORE:-b6db7fe947517994fca584fba48c505faebdb2df}
AFTER=${AFTER:-d7d255dc11eeba0a5277d9a34031e7eed468af72}
BRANCH=$(git rev-parse --abbrev-ref HEAD)
OUT=.dev-loop/g6-1530
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
S='http://localhost:5173/?mission=prologue-sorrowgate'
drive() { # rev ratio run name url steps
  local dir="$OUT/$4-$1-dpr$2-r$3"
  echo "=== $(date +%H:%M:%S) $4 $1 dpr $2 run $3"
  UNPACED=1 VIEW_DPR="$2" timeout 900 node .claude/skills/run-game/scripts/drive.mjs \
    --headed --channel msedge --url "$5" --out "$dir" --steps "$6" > "$dir.log" 2>&1
  echo "exit $? $(grep -cE 'AssertionError|Error:' "$dir.log") errors"
}
for rev in ${REVS:-before after}; do
  sha=$BEFORE; [ "$rev" = after ] && sha=$AFTER
  git -c advice.detachedHead=false checkout -q --detach "$sha" || exit 1
  npm run -s build:shared > "$OUT/build-$rev.log" 2>&1 || { echo "build failed"; exit 1; }
  sleep 10; up || exit 1; sleep 15
  echo "### $rev at $(git rev-parse --short HEAD)"
  for run in ${RUNS:-1 2}; do
    for ratio in 1 1.5; do
      drive $rev $ratio $run ventfront "$V" tools/render-stack/capture.mjs
      drive $rev $ratio $run sorrowgate "$S" tools/render-stack/capture.mjs
      drive $rev $ratio $run fight "$V" docs/screenshots/issue-1083/fight.mjs
    done
  done
done
echo "=== done $(date +%H:%M:%S)"
