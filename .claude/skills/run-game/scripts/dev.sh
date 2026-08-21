#!/usr/bin/env bash
#
# Start and stop the Echoes dev servers as a unit.
#
# Killing whatever holds :3000 is not enough. `npm run dev` is a tree — npm
# wrapper, concurrently, then `tsx watch` and vite supervisors — and the
# supervisors respawn their children, so port-kill alone leaves processes that
# re-bind the moment anything touches packages/shared/dist. Orphans then become
# the normal state, and the readiness probe happily goes green against a stale
# server from a previous run while your own backend crash-loops on EADDRINUSE.
#
# So: start the tree in its own session (setsid) and stop it by process group.
#
# Usage: dev.sh start | stop | status

set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
LOG="${ECHOES_DEV_LOG:-/tmp/echoes-dev.log}"
PORTS=(3000 5173)

listeners() { lsof -ti:"$1" -sTCP:LISTEN 2>/dev/null; }

stop() {
  local mypgid killed=0
  mypgid=$(ps -o pgid= -p $$ 2>/dev/null | tr -d ' ')

  for port in "${PORTS[@]}"; do
    for pid in $(listeners "$port"); do
      local pgid
      pgid=$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ')
      # Never signal our own process group — a server someone started with a
      # bare `npm run dev &` can share the caller's group, and taking that out
      # would kill the shell running this script.
      if [ -n "$pgid" ] && [ "$pgid" != "$mypgid" ]; then
        kill -TERM -- "-$pgid" 2>/dev/null && killed=1
      else
        kill -TERM "$pid" 2>/dev/null && killed=1
      fi
    done
  done

  [ "$killed" = 1 ] && sleep 2

  # Anything that ignored SIGTERM gets SIGKILL.
  for port in "${PORTS[@]}"; do
    for pid in $(listeners "$port"); do
      local pgid
      pgid=$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ')
      if [ -n "$pgid" ] && [ "$pgid" != "$mypgid" ]; then
        kill -KILL -- "-$pgid" 2>/dev/null
      else
        kill -KILL "$pid" 2>/dev/null
      fi
    done
  done
  sleep 1

  for port in "${PORTS[@]}"; do
    if [ -n "$(listeners "$port")" ]; then
      echo "dev.sh: port $port is still held after stop; investigate before starting" >&2
      return 1
    fi
  done
  return 0
}

start() {
  # Clear leftovers first, so a green readiness probe below can only mean the
  # server this call started.
  stop || return 1

  echo "dev.sh: starting (log: $LOG)"
  ( cd "$REPO" && setsid npm run dev > "$LOG" 2>&1 < /dev/null & )

  local deadline=$((SECONDS + 90))
  while [ $SECONDS -lt $deadline ]; do
    if curl -sf -o /dev/null http://localhost:5173/ && curl -sf -o /dev/null http://localhost:3000/; then
      echo "dev.sh: frontend :5173 and backend :3000 are up"
      return 0
    fi
    if grep -q 'EADDRINUSE' "$LOG" 2>/dev/null; then
      echo "dev.sh: EADDRINUSE — something else grabbed a port. See $LOG" >&2
      return 1
    fi
    sleep 1
  done

  echo "dev.sh: servers did not come up within 90s. Last lines of $LOG:" >&2
  tail -20 "$LOG" >&2
  return 1
}

status() {
  local any=1
  for port in "${PORTS[@]}"; do
    local pids
    pids=$(listeners "$port")
    if [ -n "$pids" ]; then
      echo "port $port: held by $(echo "$pids" | tr '\n' ' ')"
      any=0
    else
      echo "port $port: free"
    fi
  done
  return $any
}

case "${1:-}" in
  start) start ;;
  stop) stop && echo "dev.sh: stopped; ports free" ;;
  status) status ;;
  *)
    echo "usage: $0 start|stop|status" >&2
    exit 2
    ;;
esac
