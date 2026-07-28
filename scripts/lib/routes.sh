#!/usr/bin/env bash
# The route lists every audit sweeps, in one place.
#
# These used to live inline in a single CI step, which is the only reason the
# smoke job had to be a single CI step: nothing else could see them. Splitting
# the audits across parallel jobs needed them somewhere both could read, and a
# sourced file is also something a person can use:
#
#   source scripts/lib/routes.sh
#   node scripts/rendered-contrast.mjs player $PLAYER
#
# Placeholders — :venue, :game, :team, :booking, :payment, :slug — resolve to
# the stub ids the harness serves.

# `:venue`, `:game`, `:team`, `:booking`, `:payment` and `:slug`
# resolve to the stub ids the script serves. Dynamic routes were the
# uncovered half of the router until now — /venue/:id and the whole
# checkout chain had never loaded in CI once.
PLAYER="/ /about /blog /blog/:slug /community /contact /cookies /demo /discover
  /faq /for-owners /forgot-password /games /game/:game /game/:game/join-status /game/:game/join-success
  /login /nearby /privacy /reset-password /signup /teams /team/:team
  /join-team/SMOKE1 /terms /venues /venues/map /venue/:venue /dashboard
  /my-bookings /team/:team/edit
  /profile /settings /messages /book/:booking /booking/:booking/status
  /pay/mock/:payment /embed/booking/:venue /auth/callback"

OWNER="/owner-dashboard /owner/venues /owner/bookings /owner/hours
  /owner/pricing /owner/policies /owner/settings /owner/widget
  /owner/earnings /owner/equipment /owner/integrations
  /owner/integrations/callback /owner/analytics /owner/schedule
  /my-venues /add-venue /list-venue /venue/:venue/edit
  /venue/:venue/availability /onboarding/owner"

ADMIN="/admin /operator /operator/outreach /create-game /create-team
  /nearby/submit /onboarding/player"

# The signed-out app, which no check here had ever loaded.
#
# Every audit runs against a stubbed signed-in session — right for
# covering the interior, and it means /login and /signup redirect to
# /dashboard before anything can look at them. That hid real defects
# on the two forms every user meets first: two unnamed controls, two
# AA contrast failures, and an account-type picker whose focus ring
# was painted behind an opaque card. The public pages render a
# different header signed out, so they are worth the pass too.
ANON="/ /login /signup /forgot-password /reset-password /venues /games
  /community /teams /about /for-owners /faq /contact /nearby
  /venue/:venue /blog /demo"

# The other branch of every list page: a signed-in account with no
# data. The fixtures here are populated on purpose — an audit
# against a page full of em-dashes measures nothing — and the cost is
# that the empty branch has never been rendered by any check.
#
# That is not hypothetical. The h1-to-h3 skip on /teams was found
# through the signed-out pass and had nothing to do with being signed
# out: its h2s are "Teams I Captain" and "Teams I've Joined", which
# only exist once the user has teams, so every new account hit it.
# Sweeping the empty state directly then found /owner/equipment
# rendering no h1 at all before a first venue exists.
#
# `-empty` keeps the session and profile and serves no content rows,
# so it measures "new account" rather than "broken account".
EMPTY_PLAYER="/teams /games /venues /community /messages /dashboard /nearby /profile
  /my-bookings"
EMPTY_OWNER="/owner-dashboard /owner/venues /owner/bookings /owner/earnings
  /owner/analytics /owner/schedule /owner/equipment /owner/hours /owner/pricing"

# And the third state: the request failed. Every fixture here answers
# 200, so no check had ever rendered a page whose data did not
# arrive — and an empty state shown for a failed fetch is not a blank
# screen, it is a false statement. /owner/venues said "No venues yet"
# to an owner whose listings had not loaded, with a button offering
# to create the first one; /owner/earnings said "No transactions
# yet". TeamsPage already carried a comment making this exact
# argument about its own error branch.
ERROR_PLAYER="/teams /games /venues /community /dashboard /messages /my-bookings"
ERROR_OWNER="/owner-dashboard /owner/venues /owner/bookings /owner/earnings
  /owner/analytics /owner/equipment"

# --------------------------------------------------------------------------
# Subtracting routes from a list.
#
# Some checks legitimately cannot look at some pages. The way that was
# expressed was a second copy of $PLAYER with the exclusions edited out,
# hardcoded inline in scripts/ci/semantics.sh — and by the time anyone looked,
# it had already drifted: three routes added to $PLAYER were missing from it,
# so `heading-outline` was silently not checking them. The copy's own comment
# said "$PLAYER minus three routes" while excluding two.
#
# That is the same failure `route-coverage.mjs` exists to catch one level up,
# and route-coverage could not see it, because it reads this file and the
# second list was somewhere else. So the exclusion is now a named subtraction:
# there is one list, and what a check skips is stated rather than diffed.
# Written with `if` rather than `[ … ] && …`, and the reason is worth stating
# because the obvious worry turns out to be wrong. Every suite runs under
# `set -euo pipefail`, so `[ -z "$skip" ] && out="$out $route"` looks like it
# would kill the suite on the first excluded route. It does not: `set -e`
# exempts any command in an AND-list except the one after the final `&&`, and
# the failing test is the one before it. Checked, not assumed — the AND form
# returns the right list and exits 0.
#
# `if` is used anyway because it says what it means, and `return 0` keeps the
# function's own status off the caller's `set -e` whatever the last branch did.
without() {
  local list="$1"; shift
  local out="" route exclude skip
  for route in $list; do
    skip=""
    for exclude in "$@"; do
      if [ "$route" = "$exclude" ]; then skip=1; fi
    done
    if [ -z "$skip" ]; then out="$out $route"; fi
  done
  echo "$out"
  return 0
}

# $PLAYER minus the two routes with no outline to check, each for a stated
# reason rather than because it was inconvenient:
#
#   /auth/callback     a redirect that renders a spinner and leaves. It has no
#                      content, so it has no outline.
#   /pay/mock/:payment DEV-only; prod-bundle-check asserts it is stripped from
#                      the production build entirely.
PLAYER_OUTLINE="$(without "$PLAYER" /auth/callback /pay/mock/:payment)"
