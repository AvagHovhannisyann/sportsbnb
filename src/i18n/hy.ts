import type { Dictionary } from "./types";
import type { TranslationShape } from "./en";

/**
 * Eastern Armenian.
 *
 * Typed as Dictionary<TranslationShape>, so a key added to en.ts and forgotten
 * here fails `tsc`. That is the point of the whole arrangement: an Armenian
 * visitor should never be the one who discovers a missing translation.
 *
 * Punctuation is Armenian, not Latin. Sentences end with ։ (U+0589, verjaket),
 * not with a full stop — the two look similar at small sizes and are not
 * interchangeable to a reader, any more than a comma and a semicolon are. The
 * emphasis mark ՝ (U+055D) is used where a clause needs the pause that English
 * gets from a dash.
 *
 * Vocabulary note: "մարզավայր" (sports venue) is used throughout rather than
 * the looser "վայր" (place), because the product only ever means the former and
 * the shorter word reads as though a term were missing.
 */
export const hy: Dictionary<TranslationShape> = {
  common: {
    loading: "Բեռնվում է…",
    save: "Պահպանել",
    cancel: "Չեղարկել",
    back: "Հետ",
    next: "Հաջորդը",
    close: "Փակել",
    search: "Որոնել",
    tryAgain: "Կրկին փորձել",
    perHour: "ժամը",
    hour: "ժամ",
    hours: "ժամ",
    venue: "մարզավայր",
    venues: "մարզավայր",
    city: "քաղաք",
    cities: "քաղաք",
  },

  nav: {
    venues: "Մարզավայրեր",
    discover: "Բացահայտել",
    community: "Համայնք",
    blog: "Բլոգ",
    about: "Մեր մասին",
    signIn: "Մուտք",
    signUp: "Գրանցվել",
    signOut: "Ելք",
    dashboard: "Վահանակ",
    myBookings: "Իմ ամրագրումները",
    profile: "Պրոֆիլ",
    ownerDashboard: "Սեփականատիրոջ վահանակ",
    listYourVenue: "Ավելացնել ձեր մարզավայրը",
    language: "Լեզու",
  },

  home: {
    bookingNow: "Ամրագրվում է հիմա",
    seeEveryVenue: "Տեսնել բոլոր մարզավայրերը",
    browseVenues: "Դիտել մարզավայրերը",
  },

  booking: {
    reserveThisVenue: "Ամրագրել այս մարզավայրը",
    chooseDateAndHour: "Ընտրեք ամսաթիվը և ազատ ժամը։",
    selectTimeToSeeTotal: "Ընտրեք ազատ ժամ՝ ընդհանուր գումարը տեսնելու համար։",
    pricingSlot: "Հաշվարկվում է…",
    serviceFee: "Սպասարկման վճար",
    total: "Ընդամենը",
    noBookingFee: "Առանց ամրագրման վճարի՝ դուք վճարում եք մարզավայրի նշված գինը։",
    feeExplainer:
      "Մարզավայրը ստանում է իր նշված գինն ամբողջությամբ՝ սպասարկման վճարը ծածկում է վճարման մշակման ծախսը։",
    quoteUnavailable:
      "Այս պահին չհաջողվեց հաշվարկել գինը՝ ընդհանուր գումարը կհաստատվի վճարման էջում։",
    reserve: "Ամրագրել",
  },

  ownerGuide: {
    navLabel: "Սեփականատիրոջ ուղեցույց",
    metaTitle: "Մարզավայրի սեփականատիրոջ ուղեցույց",
    metaDescription:
      "Ինչպես ավելացնել ձեր մարզավայրը Sportsbnb-ում, կարգավորել վճարումների ստացումը և ավելի շատ վաստակել ձեր ազատ ժամերից։",
  },
};
