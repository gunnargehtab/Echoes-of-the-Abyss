#!/bin/bash
#
# SessionStart hook — leaves a fresh web session in a state where the gates in
# CONTRIBUTING.md can actually run.
#
# A remote session starts from a cold clone: no node_modules, and no
# packages/shared/dist. That second one is the failure CLAUDE.md calls "the
# thing that breaks first" — packages/frontend and packages/backend import
# @echoes/shared by its *build output*, so without a dist/ they fail
# type-check and module resolution in ways that do not point at the cause.
# Every root script rebuilds shared for you, but an agent that reaches for a
# workspace script directly gets the confusing version instead.
#
set -euo pipefail

# Local checkouts manage their own node_modules; this only exists to bootstrap
# the ephemeral remote containers.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# npm install rather than the npm ci that CONTRIBUTING prescribes for humans:
# the container image is cached after this hook completes, and `ci` deletes
# node_modules on every run, which throws that cache away each session. The
# lockfile is still respected for anything already satisfied.
npm install --no-audit --no-fund

# ...and then put the lockfile back. package-lock.json was authored by npm 11+,
# which records a `libc` field per optional platform dependency; the npm 10 in
# this image does not know that field and silently drops all 42 of them on any
# write. Left alone, every unattended session would begin with a dirty tree and
# could commit that churn into a PR that has nothing to do with dependencies.
#
# Safe to do unconditionally here: the hook runs before the session has done any
# work, so there is never a deliberate lockfile change to clobber. A session that
# genuinely adds a dependency edits it afterwards, and that edit survives.
git -C "$PWD" checkout -- package-lock.json 2>/dev/null || true

# Both later gates depend on this, so pay for it once here rather than
# discovering it mid-task.
npm run build:shared
