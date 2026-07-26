#!/usr/bin/env bash
# Error, loading and focus behaviour.
#
# One of four suites the `smoke` job runs in parallel. They were a single
# twenty-minute step; six more audit families landed on top of it and a check
# nobody waits for is a check nobody keeps. Split by what they measure, so a
# failure names its own area.
#
# Run locally with the dev server up:
#   npx vite --host 127.0.0.1 --port 4173 &
#   bash scripts/ci/states.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/lib/routes.sh
# Keyboard focus: WCAG 2.4.7 (an indicator is visible) and 2.2's
# 2.4.11 (it is not covered by something else). Both by screenshot
# and hit-testing, because a Tailwind ring is invisible to
# getComputedStyle — the composed box-shadow reads back as its
# transparent fallback while it is painting.
#
# A SUBSET, deliberately. This is the most expensive check here —
# 28 screenshots a route, ~19s — so all 62 routes would add about
# 21 minutes. The full sweep was run by hand before this landed and
# is clean; what it found is fixed. These ten cover the distinct
# shells and layouts, which is where the tab order actually differs:
# public marketing, list, detail, auth split-panel, player shell,
# owner shell, a data table, admin shell, and the embed widget,
# whose date strip is its own layout. Routes sharing a shell share
# their header tab order, so the marginal value of the rest is low.
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/focus-visible.mjs player \
  / /venues /venue/:venue /login /dashboard /nearby /embed/booking/:venue
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/focus-visible.mjs owner  /owner/venues /owner/earnings
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/focus-visible.mjs admin  /admin
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/focus-visible.mjs anon   /login /signup

# An empty state on a failed request is a claim about the user's own
# account that happens to be untrue. See ERROR_* above.
node scripts/error-affordance.mjs player $ERROR_PLAYER
node scripts/error-affordance.mjs owner  $ERROR_OWNER

# And the fourth state: still loading. WCAG 4.1.3 asks that a status
# message be programmatically determinable without taking focus, and
# a spinner is a status message. Forty-six wrappers held a Loader2
# with nothing to announce it — the page simply went quiet for the
# length of the request. `-slow` holds every content response open so
# the branch stays on screen to be measured.
node scripts/loading-status.mjs player /dashboard /teams /games /venues /community /messages
node scripts/loading-status.mjs owner  /owner-dashboard /owner/venues /owner/bookings /owner/earnings /owner/analytics /owner/equipment
node scripts/loading-status.mjs admin  /admin /operator
