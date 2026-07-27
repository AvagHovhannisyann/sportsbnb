#!/usr/bin/env bash
# Names, headings, titles, input purpose, tap targets.
#
# One of four suites the `smoke` job runs in parallel. They were a single
# twenty-minute step; six more audit families landed on top of it and a check
# nobody waits for is a check nobody keeps. Split by what they measure, so a
# failure names its own area.
#
# Run locally with the dev server up:
#   npx vite --host 127.0.0.1 --port 4173 &
#   bash scripts/ci/semantics.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/lib/routes.sh
# Every control needs a name. Asks Chrome for the accessible name it
# actually computes rather than reimplementing the algorithm — 47
# controls had none, including the notifications bell on every page,
# the venue links on the whole Discover grid, and the five stars a
# review is left with.
node scripts/a11y-names.mjs player $PLAYER
node scripts/a11y-names.mjs owner  $OWNER
node scripts/a11y-names.mjs admin  $ADMIN
node scripts/a11y-names.mjs anon   $ANON
node scripts/a11y-names.mjs player-empty $EMPTY_PLAYER
node scripts/a11y-names.mjs owner-empty  $EMPTY_OWNER

# `.stat-numeral` is JetBrains Mono, which has no U+058F — so every
# price set through it dropped a proportional Armenian dram sign into
# a monospaced run. Measured: digits advance 12px, the dram sign
# 14.7px, and at 6x it visibly collided with the digit beside it, on
# the most important number on a venue card. <Price> splits the mark
# out; this keeps it split.
# One h1 per page, no skipped levels. Heading level carries no
# styling here — the base rule treats h1–h6 alike — so this drifts
# invisibly, and did: the footer's h4 columns skipped two levels on
# every page at once, and CardTitle's hardcoded h3 skipped one
# wherever a card was the first thing under the page h1.
#
# All three user types. The first run of this covered the public
# routes only, because the owner console had thirteen more skips and
# wiring a check over routes known to be red only paints CI red.
# Those are fixed now — along with six on the admin side, one of
# which was a page with no h1 at all — so the check covers what it
# should. Every list here was run locally before being added.
# $PLAYER minus three routes, each for a stated reason rather than
# because it was inconvenient:
#   /auth/callback  — a redirect that renders a spinner and leaves.
#                     It has no content, so it has no outline.
#   /pay/mock/:payment — DEV-only; prod-bundle-check asserts it is
#                     stripped from the production build entirely.
#   /for-owners     — marketing page, kept in $PLAYER for smoke.
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/heading-outline.mjs player \
  / /about /blog /blog/:slug /community /contact /cookies /discover /faq \
  /for-owners /forgot-password /games /game/:game /game/:game/join-status \
  /login /nearby /privacy /reset-password /signup /teams /team/:team \
  /join-team/SMOKE1 /terms /venues /venues/map /venue/:venue /dashboard \
  /profile /settings /messages /book/:booking /booking/:booking/status \
  /embed/booking/:venue
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/heading-outline.mjs owner  $OWNER
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/heading-outline.mjs admin  $ADMIN

# The empty branch is where the h1 goes missing — see EMPTY_* above.
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/heading-outline.mjs player-empty $EMPTY_PLAYER
SMOKE_WIDTH=1440 SMOKE_HEIGHT=900 node scripts/heading-outline.mjs owner-empty  $EMPTY_OWNER

# WCAG 1.3.5 (Identify Input Purpose), Level AA. The app had
# autoComplete on nothing at all, which in practice means a password
# manager cannot fill or save a login and browser autofill does
# nothing — so anyone who finds typing costly retypes their email and
# password every time.
#
# The anon pass is the important one. Every other audit here runs
# signed in, which is right for covering the app's interior and
# quietly hides its front door: /login and /signup bounce to
# /dashboard, so their forms had never been loaded by any check in
# this repository. Signed out, they accounted for five of the twelve
# failures — the ones on the two forms every user meets first.
node scripts/input-purpose.mjs anon   /login /signup /forgot-password /reset-password
node scripts/input-purpose.mjs player $PLAYER
node scripts/input-purpose.mjs owner  $OWNER
node scripts/input-purpose.mjs admin  $ADMIN
