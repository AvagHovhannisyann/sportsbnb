#!/usr/bin/env bash
# Contrast of every token and of the text actually rendered.
#
# One of four suites the `smoke` job runs in parallel. They were a single
# twenty-minute step; six more audit families landed on top of it and a check
# nobody waits for is a check nobody keeps. Split by what they measure, so a
# failure names its own area.
#
# Run locally with the dev server up:
#   npx vite --host 127.0.0.1 --port 4173 &
#   bash scripts/ci/contrast.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/lib/routes.sh
# Contrast of every design token against every surface it lands on,
# both themes. Cheap — one page load — and it is the only thing that
# catches a colour that looks fine and is not: --destructive read as
# an ordinary error red while failing AA in both of its roles at
# once, and light-theme --warning was 2.18:1 on white.
node scripts/contrast-audit.mjs
node scripts/contrast-audit.mjs --light

# Contrast of what is actually rendered, against the backdrop it
# actually lands on — text under WCAG 1.4.3, load-bearing icons
# under 1.4.11. The other two contrast checks both pass things this
# catches: contrast-audit scores hand-listed (token, surface) pairs,
# and palette-contrast scores a raw palette colour against its *best*
# surface. On the owner's earnings ledger `text-emerald-600` is
# 4.13:1 on the card — under AA, on the one screen where a number is
# money — and palette-contrast passed it correctly by its own rule,
# because emerald-600 does reach AA on the darkest surface in the
# theme. It was not sitting on that one.
#
# One pass per route rather than two: this was two scripts, each
# loading all 62 routes and running its own scroll sweep, at ~4s per
# route per audit.
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/rendered-contrast.mjs player $PLAYER
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/rendered-contrast.mjs owner  $OWNER
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/rendered-contrast.mjs admin  $ADMIN
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/rendered-contrast.mjs anon   $ANON
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/rendered-contrast.mjs player-empty $EMPTY_PLAYER
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/rendered-contrast.mjs owner-empty  $EMPTY_OWNER
