#!/usr/bin/env bash
# Glass, numerals, and content that moves after it lands.
#
# One of four suites the `smoke` job runs in parallel. They were a single
# twenty-minute step; six more audit families landed on top of it and a check
# nobody waits for is a check nobody keeps. Split by what they measure, so a
# failure names its own area.
#
# Run locally with the dev server up:
#   npx vite --host 127.0.0.1 --port 4173 &
#   bash scripts/ci/surface.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/lib/routes.sh
# A skeleton exists to hold the space its content lands in, so a
# skeleton of the wrong shape causes the shift it was added to
# prevent. Both cases here were already wrong when this was written:
# the venues grid held a 5/4 box for a 3/2 card (43px jump per row,
# under a comment asserting the two matched) and the venue hero was
# 69px out because the gallery's height depended on the photo count.
# SMOKE_WIDTH is still 375 from the sweep above; run both.
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/layout-shift.mjs
node scripts/layout-shift.mjs

# Text on the glass header, against what is actually scrolling under
# it. contrast-audit checks tokens against declared surfaces and
# structurally cannot see this: at --glass-alpha 0.72 the same five
# nav links read 7.4:1 over the dark hero and 3.0:1 over a light
# section further down the home page, with no colour having changed.
# Both themes: which direction is dangerous depends on the tint of
# the glass. A dark bar is washed out by light content, a light bar
# by dark content, and the light theme failed at 3.55-3.80:1 while
# the dark one passed.
#
# The route list is measured, not guessed. This check costs ~14s a
# route per theme, so it cannot run everywhere; glass-risk.mjs ranks
# routes by how much the backdrop luminance under the bar actually
# varies, which is the only thing that can produce the failure. Over
# all 62 routes it came out as / and /for-owners at 0.908,
# /owner-dashboard at 0.544, and everything else at 0.083 or below.
# The previous hand-picked list had three of those low-variance
# routes in it and neither of the two high ones. Re-run glass-risk
# after any layout change that adds a light section.
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/glass-contrast.mjs player / /for-owners
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/glass-contrast.mjs --light player / /for-owners
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/glass-contrast.mjs owner  /owner-dashboard
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/glass-contrast.mjs --light owner /owner-dashboard
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/numeral-glyphs.mjs player $PLAYER
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/numeral-glyphs.mjs owner  $OWNER
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/numeral-glyphs.mjs admin  $ADMIN

# Moved here from `semantics` to balance the matrix. It belongs: this suite is
# the geometry one — what is painted where, and whether it moves — and 2.5.8 is
# a measurement of box sizes. Before the move `semantics` ran 17m48s against
# 2m59s here, and the whole matrix waited on it.
# Tap targets at phone width, against WCAG 2.2 SC 2.5.8 including
# its spacing exception. The app passes today; this holds the line.
# Its value was never the number — it was that measuring boxes led
# to twelve sport checkboxes that no keyboard could reach and
# twenty-five controls a screen reader could not name.
node scripts/tap-targets.mjs player $PLAYER
node scripts/tap-targets.mjs owner  $OWNER
node scripts/tap-targets.mjs admin  $ADMIN
