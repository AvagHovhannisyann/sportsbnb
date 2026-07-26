#!/usr/bin/env bash
# Every route loads, at desktop and phone width.
#
# One of four suites the `smoke` job runs in parallel. They were a single
# twenty-minute step; six more audit families landed on top of it and a check
# nobody waits for is a check nobody keeps. Split by what they measure, so a
# failure names its own area.
#
# Run locally with the dev server up:
#   npx vite --host 127.0.0.1 --port 4173 &
#   bash scripts/ci/routes.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/lib/routes.sh
node scripts/smoke-routes.mjs player $PLAYER
node scripts/smoke-routes.mjs owner  $OWNER
node scripts/smoke-routes.mjs admin  $ADMIN
node scripts/smoke-routes.mjs anon   $ANON
node scripts/smoke-routes.mjs player-empty $EMPTY_PLAYER
node scripts/smoke-routes.mjs owner-empty  $EMPTY_OWNER
# Same routes at phone width. Horizontal overflow is already checked
# per route, so this costs one extra pass and covers a surface that
# had only ever been spot-checked by hand — it found sideways scroll
# on the owner dashboard, opening hours, pricing, both admin consoles
# and the venue page, none of which reproduce without data on screen.
export SMOKE_WIDTH=375 SMOKE_HEIGHT=812
node scripts/smoke-routes.mjs player $PLAYER
node scripts/smoke-routes.mjs owner  $OWNER
node scripts/smoke-routes.mjs admin  $ADMIN
node scripts/smoke-routes.mjs anon   $ANON
node scripts/smoke-routes.mjs player-empty $EMPTY_PLAYER
node scripts/smoke-routes.mjs owner-empty  $EMPTY_OWNER
