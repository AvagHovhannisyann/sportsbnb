/**
 * English copy — the source of truth for the key set.
 *
 * `as const` is what makes `hy.ts` checkable: it fixes the shape, so the
 * Armenian dictionary is verified against it at build time and cannot silently
 * fall behind. Add a key here first, then in hy.ts; the compiler enforces the
 * order.
 *
 * Grouped by surface rather than alphabetically, so a translator working on the
 * booking flow reads its strings together and in the order they appear on
 * screen — which is what makes the difference between a translation that is
 * literally correct and one that reads naturally.
 */
export const en = {
  common: {
    loading: "Loading…",
    save: "Save",
    cancel: "Cancel",
    back: "Back",
    next: "Next",
    close: "Close",
    search: "Search",
    tryAgain: "Try again",
    perHour: "per hour",
    hour: "hour",
    hours: "hours",
    venue: "venue",
    venues: "venues",
    city: "city",
    cities: "cities",
  },

  nav: {
    venues: "Venues",
    discover: "Discover",
    community: "Community",
    blog: "Blog",
    about: "About",
    signIn: "Sign in",
    signUp: "Sign up",
    signOut: "Sign out",
    dashboard: "Dashboard",
    myBookings: "My bookings",
    profile: "Profile",
    ownerDashboard: "Owner dashboard",
    listYourVenue: "List your venue",
    language: "Language",
  },

  home: {
    bookingNow: "Booking now",
    seeEveryVenue: "See every venue",
    browseVenues: "Browse venues",
  },

  booking: {
    reserveThisVenue: "Reserve this venue",
    chooseDateAndHour: "Choose a date and an available hour.",
    selectTimeToSeeTotal: "Select an available time to see your total.",
    pricingSlot: "Pricing this slot…",
    serviceFee: "Service fee",
    total: "Total",
    noBookingFee: "No booking fee — you pay the venue's listed price.",
    feeExplainer:
      "The venue is paid its listed price in full; the service fee covers payment processing.",
    quoteUnavailable:
      "Couldn't price this slot just now — the total is confirmed at checkout.",
    reserve: "Reserve",
  },

  ownerGuide: {
    navLabel: "Owner guide",
    metaTitle: "Venue owner guide",
    metaDescription:
      "How to list your venue on Sportsbnb, set up payouts, and earn more from the hours you already have.",
  },
} as const;

export type TranslationShape = typeof en;
