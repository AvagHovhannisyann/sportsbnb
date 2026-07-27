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

# Moved here from `semantics` to balance the matrix. The fit is looser than
# tap-targets-into-surface and worth naming: this suite is about what a page
# reports about itself — that a request failed, that it is still loading — and
# its title is the same kind of claim. Measured, not guessed: semantics was
# 17m48s, states 3m18s.
# WCAG 2.4.2 (Page Titled), Level A. Nothing sets a title in an SPA
# unless told to, and the string from index.html sits in the tab
# looking like a real one: 17 of the 35 player routes were still
# showing "Sportsbnb — Book Sports Venues & Join Games Near You",
# /login and /settings and the whole checkout chain among them.
# Titles now come from src/lib/routeTitles.ts via RouteMeta.
#
# Duplicates fail too — a title that does not distinguish the page
# does not describe it. Grouped by the pathname the app *lands* on,
# so a redirect (/discover to /venues, or /login to /dashboard under
# the stubbed session) is not mistaken for two pages sharing a name.
node scripts/page-titles.mjs player $PLAYER
node scripts/page-titles.mjs owner  $OWNER
node scripts/page-titles.mjs admin  $ADMIN
node scripts/page-titles.mjs anon   $ANON
