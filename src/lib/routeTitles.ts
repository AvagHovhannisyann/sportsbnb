/**
 * A title for every route, in one table.
 *
 * WCAG 2.4.2 (Page Titled) is Level A — the strictest tier — and asks that a
 * page have a title describing its topic or purpose. In a single-page app
 * nothing sets one unless something is told to, and measuring
 * `document.title` on all 62 routes found 17 of the 35 player routes still
 * showing the string baked into `index.html`:
 *
 *   "Sportsbnb — Book Sports Venues & Join Games Near You"
 *
 * on /login, /signup, /dashboard, /profile, /settings, /messages, /community,
 * and every step of the checkout chain. Eighteen pages did render `SEOHead`,
 * which is why this was invisible: the pattern existed and was simply not
 * applied everywhere, and a marketing title on the settings page still looks
 * like a title. The cost is real — every browser tab, every history entry and
 * every bookmark for those pages is identical, and a screen reader announces
 * the same sentence on each navigation.
 *
 * A table rather than forty edits. Adding `<SEOHead>` to each page would have
 * worked and would have left no single place to see what the titles are, to
 * notice two pages sharing one, or to check the set in a test. Pages that want
 * more than a static string — a venue name, a blog post — keep their own
 * `SEOHead` and override this, because `RouteMeta` renders above `<Routes>`.
 *
 * Titles here are the bare topic. `SEOHead` appends " | Sportsbnb"; passing
 * the site name as well is what made /nearby read "Nearby Sports Fields |
 * Sportsbnb | Sportsbnb".
 */
export type RouteTitle = {
  /** react-router path pattern, matched with `matchPath`. */
  path: string;
  title: string;
  /**
   * Signed-in surfaces and one-time links: nothing here should reach an index.
   * Not a WCAG matter — it rides along because this is the one place that
   * already knows which routes are private.
   */
  noIndex?: boolean;
};

/**
 * Order matters only where patterns overlap; `matchPath` is exact per entry,
 * so the specific `/venue/:id/edit` cannot be shadowed by `/venue/:id`.
 */
export const ROUTE_TITLES: RouteTitle[] = [
  // Public
  { path: '/community', title: 'Community — Players, Teams & Games' },
  { path: '/venues/map', title: 'Venue Map' },
  { path: '/game/:id', title: 'Game Details' },
  { path: '/game/:id/join-status', title: 'Game Join Status', noIndex: true },
  { path: '/game/:id/join-success', title: 'Game Join Status', noIndex: true },
  { path: '/team/:id', title: 'Team Details' },
  { path: '/team/:id/edit', title: 'Edit Team', noIndex: true },

  // Auth
  { path: '/login', title: 'Log In', noIndex: true },
  { path: '/signup', title: 'Sign Up', noIndex: true },
  { path: '/forgot-password', title: 'Reset Your Password', noIndex: true },
  { path: '/reset-password', title: 'Choose a New Password', noIndex: true },
  { path: '/auth/callback', title: 'Signing You In', noIndex: true },

  // Player, signed in
  { path: '/dashboard', title: 'Your Dashboard', noIndex: true },
  { path: '/my-bookings', title: 'My Bookings', noIndex: true },
  { path: '/profile', title: 'Your Profile', noIndex: true },
  { path: '/settings', title: 'Settings', noIndex: true },
  { path: '/messages', title: 'Messages', noIndex: true },
  { path: '/onboarding/player', title: 'Set Up Your Account', noIndex: true },

  // Booking and payment
  { path: '/book/:id', title: 'Complete Your Booking', noIndex: true },
  { path: '/booking/:id/status', title: 'Booking Status', noIndex: true },
  { path: '/pay/mock/:id', title: 'Test Payment', noIndex: true },

  // Embedded widget — rendered inside someone else's page.
  { path: '/embed/booking/:venueId', title: 'Book a Venue', noIndex: true },

  // Owner
  { path: '/owner-dashboard', title: 'Owner Dashboard', noIndex: true },
  { path: '/owner/venues', title: 'Your Venues', noIndex: true },
  { path: '/owner/schedule', title: 'Schedule', noIndex: true },
  { path: '/owner/bookings', title: 'Bookings', noIndex: true },
  { path: '/owner/hours', title: 'Opening Hours', noIndex: true },
  { path: '/owner/pricing', title: 'Pricing', noIndex: true },
  { path: '/owner/equipment', title: 'Equipment', noIndex: true },
  { path: '/owner/integrations', title: 'Integrations', noIndex: true },
  { path: '/owner/integrations/callback', title: 'Connecting Your Calendar', noIndex: true },
  { path: '/owner/policies', title: 'Cancellation Policies', noIndex: true },
  { path: '/owner/settings', title: 'Owner Settings', noIndex: true },
  { path: '/owner/widget', title: 'Booking Widget', noIndex: true },
  { path: '/owner/earnings', title: 'Earnings & Payouts', noIndex: true },
  { path: '/owner/analytics', title: 'Analytics', noIndex: true },
  { path: '/add-venue', title: 'Add a Venue', noIndex: true },
  { path: '/list-venue', title: 'List Your Venue', noIndex: true },
  { path: '/venue/:id/edit', title: 'Edit Venue', noIndex: true },
  { path: '/venue/:id/availability', title: 'Venue Availability', noIndex: true },
  { path: '/onboarding/owner', title: 'Set Up Your Venue', noIndex: true },

  // Admin and operator
  { path: '/admin', title: 'Admin', noIndex: true },
  { path: '/operator', title: 'Operator Console', noIndex: true },
  { path: '/operator/outreach', title: 'Outreach', noIndex: true },
  { path: '/create-game', title: 'Create a Game', noIndex: true },
  { path: '/create-team', title: 'Create a Team', noIndex: true },
  { path: '/nearby/submit', title: 'Submit a Field', noIndex: true },
  { path: '/join-team/:code', title: 'Join a Team', noIndex: true },
];
