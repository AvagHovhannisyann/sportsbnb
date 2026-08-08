import type { Language } from "@/i18n/types";

/**
 * The venue owner guide, as data.
 *
 * Long-form content does not belong in the translation dictionary. The
 * dictionary is for interface strings — a word or a sentence, looked up by key
 * — and putting several thousand words of prose in it would make both harder to
 * work with: the dictionary becomes unreadable, and the guide can no longer be
 * edited as a document.
 *
 * Structured as sections rather than as a markdown blob so the page can render
 * real headings, tables and checklists with the app's own components. That
 * matters for more than looks: a markdown blob dropped into a div gives a
 * screen-reader user no heading outline to navigate by, and the heading-outline
 * check in CI would fail it.
 *
 * The Armenian is a translation, not a transliteration — the section order
 * matches, but sentences are written to read naturally rather than to mirror
 * English word order.
 */

export interface GuideBlock {
  kind: "text" | "note" | "steps" | "table" | "checklist";
  /** Paragraph or note body. */
  body?: string;
  /** Ordered/unordered items. */
  items?: string[];
  /** Table header cells, then rows. */
  head?: string[];
  rows?: string[][];
}

export interface GuideSection {
  id: string;
  title: string;
  blocks: GuideBlock[];
}

export interface OwnerGuide {
  title: string;
  intro: string;
  readingTime: string;
  sections: GuideSection[];
}

const enGuide: OwnerGuide = {
  title: "Getting your venue on Sportsbnb",
  intro:
    "From an empty account to your first paid booking — and how to earn more from the hours you already have.",
  readingTime: "About 12 minutes to read, 30 to set up",
  sections: [
    {
      id: "before-you-start",
      title: "Before you start",
      blocks: [
        {
          kind: "text",
          body: "Gathering these first turns a 30-minute setup into a 10-minute one.",
        },
        {
          kind: "checklist",
          items: [
            "Photos of your venue — 5 to 10, taken in daylight",
            "Your bank details: IBAN and the account holder name exactly as your bank has it",
            "Your opening hours, including days you are closed",
            "Your hourly rate, and whether it changes at weekends or in the evening",
          ],
        },
      ],
    },
    {
      id: "list-your-venue",
      title: "1. List your venue",
      blocks: [
        { kind: "text", body: "Owner dashboard → Venues → Add venue" },
        {
          kind: "text",
          body: "Name: use the name people actually call it. “Nairi Arena” beats “Nairi Sports Complex LLC Field #2”. If a player cannot tell what it is at a glance, they scroll past.",
        },
        {
          kind: "text",
          body: "Photos are the single biggest factor in whether your listing converts. A venue with clear photos gets booked several times more often than the same venue with one dark phone snap. Shoot in daylight or under your floodlights. Lead with a wide shot of the whole pitch from a corner, then the surface close up, changing rooms, parking and the entrance.",
        },
        {
          kind: "text",
          body: "Address: pin the exact entrance, not the middle of the building. Players arrive by taxi, and a pin 100 metres off means a phone call to you.",
        },
        {
          kind: "text",
          body: "Sports: tick everything the surface genuinely supports. A 5-a-side pitch that also takes futsal should list both — you appear in twice as many searches.",
        },
        {
          kind: "note",
          body: "Write a description that answers what a player wants to know: “Full-size artificial turf, floodlit until 23:00. Changing rooms with hot showers. Free parking for 12 cars. Two minutes from Barekamutyun metro.” Skip the marketing language — “the premier destination for football enthusiasts” tells a player nothing.",
        },
      ],
    },
    {
      id: "opening-hours",
      title: "2. Set your opening hours",
      blocks: [
        { kind: "text", body: "Owner dashboard → Hours" },
        {
          kind: "text",
          body: "These windows are your inventory — players can only book inside them. Two things owners get wrong: being too conservative, and forgetting to block closed dates.",
        },
        {
          kind: "text",
          body: "If you would accept a 07:00 booking from a group who asked, open at 07:00. Empty early hours cost nothing to list. And block your holidays and maintenance days here, or the system will sell an hour you cannot honour and you will be the one apologising.",
        },
      ],
    },
    {
      id: "bank-details",
      title: "3. Add your bank details",
      blocks: [
        { kind: "text", body: "Owner dashboard → Earnings" },
        {
          kind: "table",
          head: ["Field", "What to enter"],
          rows: [
            ["Method", "Bank transfer (IBAN) or Idram"],
            ["Destination", "Your AM… IBAN, or your Idram ID"],
            ["Account holder", "Your name or company name, exactly as your bank has it"],
          ],
        },
        {
          kind: "note",
          body: "Get the holder name exactly right. A mismatch between the name on the account and the name you type here is the most common reason a transfer bounces. If the account is in your company’s name, use the company name — not yours.",
        },
        {
          kind: "text",
          body: "Your details are visible only to you; no player ever sees them. Do this before your first booking — earnings accumulate either way, but nothing can be sent to an account that does not exist yet.",
        },
      ],
    },
    {
      id: "cancellation-policy",
      title: "4. Choose your cancellation policy",
      blocks: [
        { kind: "text", body: "Owner dashboard → Policies" },
        {
          kind: "table",
          head: ["Policy", "Free cancellation until", "Best for"],
          rows: [
            ["Flexible", "24 hours before", "New listings, quiet slots, building reviews"],
            ["Moderate", "48 hours before", "Established venues with steady demand"],
            ["Strict", "72 hours before", "Prime slots that always sell out"],
          ],
        },
        {
          kind: "note",
          body: "Start flexible. It is the easiest thing you can do to get your first ten bookings — a player choosing between two similar venues takes the one where cancelling is easy, every time. Tighten it once you have reviews and a waiting list, not before.",
        },
        {
          kind: "text",
          body: "The policy is locked to each booking when it is made, so changing it never affects a booking someone has already paid for.",
        },
      ],
    },
    {
      id: "go-live",
      title: "5. Go live",
      blocks: [
        {
          kind: "text",
          body: "Set your venue active. It now appears in search, on the map and on the homepage.",
        },
        {
          kind: "text",
          body: "Check your own listing as a player would: open it in a private browser window, pick a date, and look at the times offered. Anything wrong — a closed day showing as open, the wrong price — you will see immediately.",
        },
      ],
    },
    {
      id: "how-money-works",
      title: "How the money works",
      blocks: [
        {
          kind: "text",
          body: "You keep 100% of your listed price. Sportsbnb takes no commission out of your rate. A separate service fee is charged to the player, on top of your price, covering card processing and running the platform.",
        },
        {
          kind: "table",
          head: ["On a booking at 8,000 ֏", "Amount"],
          rows: [
            ["Your rate — paid to you", "8,000 ֏"],
            ["Service fee — paid by the player", "1,200 ֏"],
            ["Player pays", "9,200 ֏"],
          ],
        },
        {
          kind: "steps",
          items: [
            "A player picks a time and pays by card.",
            "The slot locks immediately — nobody else can take it.",
            "You get a notification, and it appears in Bookings.",
            "The amount is added to your balance in Earnings.",
            "Once your balance passes ֏10,000 it is paid to your bank account, within 3 business days.",
          ],
        },
        {
          kind: "text",
          body: "You never chase anyone for money and never handle cash — the player has already paid before they arrive.",
        },
        {
          kind: "text",
          body: "If a player cancels inside your policy window the refund is handled automatically and comes back out of your balance. Outside the window, you keep the booking. If you have to cancel on a player, they are refunded in full. Every movement is itemised in Earnings, so your balance is always explainable.",
        },
      ],
    },
    {
      id: "pricing",
      title: "Getting your price right",
      blocks: [
        {
          kind: "text",
          body: "Start at the local going rate, not below it. Undercutting attracts price-shoppers who cancel; matching the market with better photos wins more bookings than being 10% cheaper. Then use pricing rules rather than moving your base rate around.",
        },
        {
          kind: "note",
          body: "Rates under about 3,000 ֏ per hour are difficult to process economically, because card networks charge a fixed amount per transaction regardless of size. If your natural rate is lower, sell in 2-hour blocks instead — better for you too: fewer changeovers, same revenue.",
        },
      ],
    },
    {
      id: "earning-more",
      title: "Earning more",
      blocks: [
        {
          kind: "text",
          body: "Everything below is already in your dashboard. These are the levers that separate a venue making a little from one making a lot.",
        },
        {
          kind: "text",
          body: "Charge more when demand is higher (Pricing). Your 19:00–22:00 weekday slots and Saturday afternoons are worth more than Tuesday at 11:00. A typical structure: weekday evenings at +20–30%, weekends at +20–40%. The slots sell out either way — this is the highest-return five minutes you will spend in the dashboard.",
        },
        {
          kind: "text",
          body: "Discount your dead hours. This is where the real growth is. An empty 10:00 Tuesday earns nothing; at 30% off it earns 70% of something, and brings in players who return at full price. Weekday mornings and late nights are where new demand comes from — not from competing for the Saturday slots everyone already wants.",
        },
        {
          kind: "text",
          body: "Rent equipment (Equipment). Balls, bibs, nets, rackets. This is close to pure margin — you already own it. Package items together (“Match kit: 2 balls, 12 bibs, 2 nets”) priced slightly under the sum of the parts; packages sell far better than a list of single items.",
        },
        {
          kind: "text",
          body: "Put a booking button on your own channels (Widget). Embed it on your website, or use the link in your Instagram bio and WhatsApp Business profile. Players who already know you can book and pay instantly instead of messaging and waiting — those messages are where bookings die.",
        },
        {
          kind: "text",
          body: "Connect your calendar (Integrations). If you also take bookings by phone or in person, sync so those blocks show as unavailable here. Double-booking is the one mistake that reliably costs you a customer permanently.",
        },
        {
          kind: "text",
          body: "Watch your numbers (Analytics). Your emptiest hours are your discount candidates; a day with no bookings usually means your hours or price are wrong for that day; repeat players are worth offering a regular slot.",
        },
      ],
    },
    {
      id: "first-week",
      title: "Your first week",
      blocks: [
        {
          kind: "checklist",
          items: [
            "Venue listed with 5+ daylight photos",
            "Address pinned at the actual entrance",
            "Opening hours set, closed dates blocked",
            "Bank details saved, holder name matching your bank exactly",
            "Cancellation policy set to Flexible",
            "Venue set to active",
            "Your own listing checked in a private browser window",
            "Booking link shared to Instagram and WhatsApp",
            "Peak-hour pricing rules added",
            "Equipment added, if you rent any",
          ],
        },
      ],
    },
    {
      id: "questions",
      title: "Common questions",
      blocks: [
        {
          kind: "table",
          head: ["Question", "Answer"],
          rows: [
            [
              "Do I pay anything to list?",
              "No. Listing is free and no commission is deducted from your rate — the service fee is paid by the player on top of your price.",
            ],
            [
              "When do I get paid?",
              "Once your balance passes ֏10,000, to the account saved in Earnings, within 3 business days.",
            ],
            [
              "What if a player does not turn up?",
              "The booking is already paid. Outside their cancellation window, the money is yours.",
            ],
            [
              "Can I block time for my own use?",
              "Yes — block the date in Hours, or the individual slot in Schedule.",
            ],
            [
              "Can I list more than one venue or court?",
              "Yes. Add each separately, or add courts under one venue if they book independently.",
            ],
            [
              "Can I change my price later?",
              "Any time. Existing bookings keep the price they were made at.",
            ],
            ["Can someone book 4 hours?", "Yes, up to 8 hours in a single booking."],
          ],
        },
      ],
    },
  ],
};

const hyGuide: OwnerGuide = {
  title: "Ձեր մարզավայրը Sportsbnb-ում",
  intro:
    "Դատարկ հաշվից մինչև առաջին վճարված ամրագրումը՝ և ինչպես ավելի շատ վաստակել այն ժամերից, որոնք արդեն ունեք։",
  readingTime: "Կարդալու համար՝ մոտ 12 րոպե, կարգավորելու համար՝ 30",
  sections: [
    {
      id: "before-you-start",
      title: "Նախքան սկսելը",
      blocks: [
        {
          kind: "text",
          body: "Եթե սրանք նախապես պատրաստեք, 30 րոպեանոց կարգավորումը կդառնա 10 րոպեանոց։",
        },
        {
          kind: "checklist",
          items: [
            "Ձեր մարզավայրի լուսանկարները՝ 5-ից 10 հատ, ցերեկային լույսի տակ",
            "Ձեր բանկային տվյալները՝ IBAN և հաշվետիրոջ անունը ճիշտ այնպես, ինչպես բանկում է",
            "Ձեր աշխատանքային ժամերը, ներառյալ փակ օրերը",
            "Ձեր ժամային գինը և արդյոք այն փոխվում է հանգստյան օրերին կամ երեկոյան",
          ],
        },
      ],
    },
    {
      id: "list-your-venue",
      title: "1. Ավելացրեք ձեր մարզավայրը",
      blocks: [
        { kind: "text", body: "Սեփականատիրոջ վահանակ → Մարզավայրեր → Ավելացնել" },
        {
          kind: "text",
          body: "Անվանումը՝ օգտագործեք այն անունը, որով մարդիկ իրականում կոչում են վայրը։ «Նաիրի արենա»-ն ավելի լավ է, քան «Նաիրի մարզահամալիր ՍՊԸ դաշտ #2»։ Եթե խաղացողը մեկ հայացքով չի հասկանում՝ ինչ է դա, նա պարզապես անցնում է առաջ։",
        },
        {
          kind: "text",
          body: "Լուսանկարներն ամենակարևոր գործոնն են։ Հստակ լուսանկարներով մարզավայրը ամրագրվում է մի քանի անգամ ավելի հաճախ, քան նույն մարզավայրը՝ մեկ մութ նկարով։ Նկարեք ցերեկը կամ լուսարձակների տակ։ Առաջինը՝ ամբողջ դաշտի լայն կադր անկյունից, ապա՝ ծածկույթը մոտիկից, հանդերձարանները, կայանատեղին և մուտքը։",
        },
        {
          kind: "text",
          body: "Հասցեն՝ քարտեզի վրա նշեք հենց մուտքը, ոչ թե շենքի կենտրոնը։ Խաղացողները գալիս են տաքսիով, և 100 մետր շեղումը նշանակում է զանգ ձեզ։",
        },
        {
          kind: "text",
          body: "Մարզաձևերը՝ նշեք այն ամենը, ինչին ծածկույթը իսկապես հարմար է։ Մինի ֆուտբոլի դաշտը, որտեղ կարելի է նաև ֆուտզալ խաղալ, պետք է նշի երկուսն էլ՝ այդպես դուք հայտնվում եք երկու անգամ ավելի շատ որոնումներում։",
        },
        {
          kind: "note",
          body: "Նկարագրության մեջ պատասխանեք այն, ինչ խաղացողն ուզում է իմանալ․ «Ամբողջական չափի արհեստական ծածկույթ, լուսավորված մինչև 23:00։ Հանդերձարաններ տաք ցնցուղով։ Անվճար կայանատեղի 12 մեքենայի համար։ Բարեկամության մետրոյից երկու րոպե»։ Խուսափեք գովազդային բառերից՝ դրանք ոչինչ չեն ասում խաղացողին։",
        },
      ],
    },
    {
      id: "opening-hours",
      title: "2. Նշեք ձեր աշխատանքային ժամերը",
      blocks: [
        { kind: "text", body: "Սեփականատիրոջ վահանակ → Ժամեր" },
        {
          kind: "text",
          body: "Այս ժամերը ձեր ապրանքն են՝ խաղացողները կարող են ամրագրել միայն դրանց ներսում։ Սեփականատերերը երկու սխալ են անում՝ չափազանց զգուշավոր են և մոռանում են փակել ոչ աշխատանքային օրերը։",
        },
        {
          kind: "text",
          body: "Եթե կընդունեիք ժամը 07:00-ի ամրագրումը, բացեք 07:00-ից։ Դատարկ վաղ ժամերը ոչինչ չեն արժենում։ Իսկ տոները և վերանորոգման օրերը փակեք այստեղ, այլապես համակարգը կվաճառի մի ժամ, որը դուք չեք կարող տրամադրել, և ներողություն խնդրողը դուք կլինեք։",
        },
      ],
    },
    {
      id: "bank-details",
      title: "3. Ավելացրեք ձեր բանկային տվյալները",
      blocks: [
        { kind: "text", body: "Սեփականատիրոջ վահանակ → Եկամուտներ" },
        {
          kind: "table",
          head: ["Դաշտ", "Ինչ լրացնել"],
          rows: [
            ["Եղանակ", "Բանկային փոխանցում (IBAN) կամ Idram"],
            ["Հաշվեհամար", "Ձեր AM… IBAN-ը կամ Idram ID-ն"],
            ["Հաշվետեր", "Ձեր անունը կամ ընկերության անվանումը՝ ճիշտ ինչպես բանկում է"],
          ],
        },
        {
          kind: "note",
          body: "Հաշվետիրոջ անունը գրեք ճշգրիտ։ Հաշվի վրա նշված անվան և այստեղ գրվածի անհամապատասխանությունը փոխանցման ձախողման ամենահաճախ պատճառն է։ Եթե հաշիվը ընկերության անունով է, գրեք ընկերության անվանումը, ոչ թե ձերը։",
        },
        {
          kind: "text",
          body: "Ձեր տվյալները տեսանելի են միայն ձեզ․ ոչ մի խաղացող դրանք չի տեսնում։ Արեք սա մինչև առաջին ամրագրումը՝ եկամուտը կուտակվում է ամեն դեպքում, բայց չի կարող ուղարկվել հաշվի, որը դեռ գոյություն չունի։",
        },
      ],
    },
    {
      id: "cancellation-policy",
      title: "4. Ընտրեք չեղարկման պայմանները",
      blocks: [
        { kind: "text", body: "Սեփականատիրոջ վահանակ → Պայմաններ" },
        {
          kind: "table",
          head: ["Պայման", "Անվճար չեղարկում մինչև", "Ում համար է"],
          rows: [
            ["Ճկուն", "24 ժամ առաջ", "Նոր մարզավայրեր, ազատ ժամեր, կարծիքներ հավաքելու համար"],
            ["Միջին", "48 ժամ առաջ", "Կայացած մարզավայրեր՝ կայուն պահանջարկով"],
            ["Խիստ", "72 ժամ առաջ", "Լավագույն ժամեր, որոնք միշտ լցվում են"],
          ],
        },
        {
          kind: "note",
          body: "Սկսեք ճկունից։ Սա ամենահեշտ քայլն է առաջին տասը ամրագրումը ստանալու համար՝ երկու նման մարզավայրից խաղացողը միշտ ընտրում է այն, որտեղ չեղարկելը հեշտ է։ Խստացրեք հետո՝ երբ արդեն ունենաք կարծիքներ և հերթ, ոչ թե դրանից առաջ։",
        },
        {
          kind: "text",
          body: "Պայմանը ամրագրվում է յուրաքանչյուր ամրագրման հետ դրա կատարման պահին, ուստի փոփոխությունը երբեք չի ազդում արդեն վճարված ամրագրման վրա։",
        },
      ],
    },
    {
      id: "go-live",
      title: "5. Հրապարակեք",
      blocks: [
        {
          kind: "text",
          body: "Դարձրեք ձեր մարզավայրը ակտիվ։ Այն հայտնվում է որոնման մեջ, քարտեզի և գլխավոր էջի վրա։",
        },
        {
          kind: "text",
          body: "Ստուգեք ձեր էջը այնպես, ինչպես կանի խաղացողը՝ բացեք այն թաքնված պատուհանում, ընտրեք ամսաթիվ և նայեք առաջարկվող ժամերը։ Ցանկացած սխալ՝ փակ օրը որպես բաց, սխալ գին՝ անմիջապես կերևա։",
        },
      ],
    },
    {
      id: "how-money-works",
      title: "Ինչպես է աշխատում վճարումը",
      blocks: [
        {
          kind: "text",
          body: "Դուք ստանում եք ձեր նշված գնի 100%-ը։ Sportsbnb-ը ձեր գնից միջնորդավճար չի պահում։ Առանձին սպասարկման վճար գանձվում է խաղացողից՝ ձեր գնի վրա ավելացված, և այն ծածկում է քարտային վճարման մշակումն ու հարթակի աշխատանքը։",
        },
        {
          kind: "table",
          head: ["8,000 ֏ ամրագրման դեպքում", "Գումար"],
          rows: [
            ["Ձեր գինը՝ վճարվում է ձեզ", "8,000 ֏"],
            ["Սպասարկման վճար՝ վճարում է խաղացողը", "1,200 ֏"],
            ["Խաղացողը վճարում է", "9,200 ֏"],
          ],
        },
        {
          kind: "steps",
          items: [
            "Խաղացողն ընտրում է ժամը և վճարում քարտով։",
            "Ժամն անմիջապես ամրագրվում է՝ ուրիշը չի կարող վերցնել այն։",
            "Դուք ստանում եք ծանուցում, և ամրագրումը հայտնվում է Ամրագրումներ բաժնում։",
            "Գումարն ավելացվում է ձեր հաշվեկշռին՝ Եկամուտներ բաժնում։",
            "Երբ ձեր հաշվեկշիռը գերազանցի 10,000 ֏-ը, այն փոխանցվում է ձեր բանկային հաշվին՝ 3 աշխատանքային օրվա ընթացքում։",
          ],
        },
        {
          kind: "text",
          body: "Դուք երբեք ոչ մեկից գումար չեք պահանջում և կանխիկի հետ գործ չունեք՝ խաղացողն արդեն վճարել է մինչև գալը։",
        },
        {
          kind: "text",
          body: "Եթե խաղացողը չեղարկում է ձեր պայմանների ժամկետում, վերադարձն ինքնաշխատ է և հանվում է ձեր հաշվեկշռից։ Ժամկետից դուրս՝ ամրագրումը մնում է ձերը։ Եթե դուք եք չեղարկում, խաղացողին վերադարձվում է ամբողջ գումարը։ Յուրաքանչյուր շարժում մանրամասն երևում է Եկամուտներ բաժնում, ուստի ձեր հաշվեկշիռը միշտ բացատրելի է։",
        },
      ],
    },
    {
      id: "pricing",
      title: "Ինչպես ճիշտ գնահատել",
      blocks: [
        {
          kind: "text",
          body: "Սկսեք տեղական շուկայական գնից, ոչ թե դրանից ցածր։ Ցածր գինը գրավում է նրանց, ովքեր հետո չեղարկում են։ Շուկայական գին և ավելի լավ լուսանկարներ՝ սա ավելի շատ ամրագրում է բերում, քան 10%-ով էժան լինելը։ Այնուհետև օգտագործեք գնային կանոնները՝ բազային գինը փոխելու փոխարեն։",
        },
        {
          kind: "note",
          body: "Ժամում մոտ 3,000 ֏-ից ցածր գները դժվար է մշակել տնտեսապես, քանի որ քարտային համակարգերը գանձում են ֆիքսված գումար յուրաքանչյուր գործարքից՝ անկախ չափից։ Եթե ձեր բնական գինն ավելի ցածր է, վաճառեք 2-ժամյա բլոկներով՝ ձեզ համար էլ ավելի հարմար է․ ավելի քիչ փոփոխություն, նույն եկամուտը։",
        },
      ],
    },
    {
      id: "earning-more",
      title: "Ինչպես ավելի շատ վաստակել",
      blocks: [
        {
          kind: "text",
          body: "Ամեն ինչ, ինչ նշված է ստորև, արդեն կա ձեր վահանակում։ Սրանք են այն գործիքները, որոնք տարբերում են քիչ վաստակող մարզավայրը շատ վաստակողից։",
        },
        {
          kind: "text",
          body: "Բարձրացրեք գինը, երբ պահանջարկը մեծ է (Գներ)։ Աշխատանքային օրերի 19:00–22:00-ը և շաբաթ ցերեկը ավելի արժեքավոր են, քան երեքշաբթի ժամը 11:00-ը։ Սովորական կառուցվածք՝ աշխատանքային օրերի երեկո +20–30%, հանգստյան օրեր +20–40%։ Այդ ժամերն այսպես թե այնպես լցվում են՝ սա վահանակում անցկացրած ամենաեկամտաբեր հինգ րոպեն է։",
        },
        {
          kind: "text",
          body: "Զեղչեք ձեր դատարկ ժամերը։ Իրական աճն այստեղ է։ Դատարկ երեքշաբթի 10:00-ն ոչինչ չի բերում․ 30% զեղչով այն բերում է ինչ-որ բանի 70%-ը և բերում է խաղացողների, ովքեր հետո վերադառնում են լրիվ գնով։ Աշխատանքային օրերի առավոտները և ուշ երեկոները նոր պահանջարկի աղբյուրն են՝ ոչ թե շաբաթ օրվա ժամերի համար մրցելը։",
        },
        {
          kind: "text",
          body: "Վարձով տվեք գույք (Գույք)։ Գնդակներ, մանիշակներ, ցանցեր, ռակետներ։ Սա գրեթե զուտ շահույթ է՝ գույքն արդեն ձերն է։ Միավորեք դրանք փաթեթների մեջ («Խաղի հավաքածու՝ 2 գնդակ, 12 մանիշակ, 2 ցանց») և գնահատեք մի փոքր ցածր, քան առանձին գների գումարը՝ փաթեթները վաճառվում են շատ ավելի լավ։",
        },
        {
          kind: "text",
          body: "Տեղադրեք ամրագրման կոճակը ձեր սեփական հարթակներում (Վիջեթ)։ Ներդրեք այն ձեր կայքում կամ օգտագործեք հղումը Instagram-ի և WhatsApp Business-ի պրոֆիլում։ Ձեզ արդեն ճանաչող խաղացողները կկարողանան ամրագրել և վճարել անմիջապես՝ գրելու և պատասխան սպասելու փոխարեն։ Հենց այդ նամակագրության մեջ են կորչում ամրագրումները։",
        },
        {
          kind: "text",
          body: "Միացրեք ձեր օրացույցը (Ինտեգրումներ)։ Եթե ամրագրումներ եք ընդունում նաև հեռախոսով կամ տեղում, համաժամեցրեք, որպեսզի այդ ժամերն այստեղ երևան որպես զբաղված։ Կրկնակի ամրագրումն այն սխալն է, որը հաստատ ընդմիշտ կորցնում է հաճախորդին։",
        },
        {
          kind: "text",
          body: "Հետևեք ձեր թվերին (Վերլուծություն)։ Ձեր ամենադատարկ ժամերը զեղչի թեկնածուներն են․ առանց ամրագրման օրը սովորաբար նշանակում է, որ այդ օրվա ժամերը կամ գինը սխալ են․ կրկնվող խաղացողներին արժե առաջարկել մշտական ժամ։",
        },
      ],
    },
    {
      id: "first-week",
      title: "Ձեր առաջին շաբաթը",
      blocks: [
        {
          kind: "checklist",
          items: [
            "Մարզավայրն ավելացված է 5+ ցերեկային լուսանկարով",
            "Հասցեն նշված է հենց մուտքի վրա",
            "Աշխատանքային ժամերը նշված են, փակ օրերը՝ արգելափակված",
            "Բանկային տվյալները պահպանված են, հաշվետիրոջ անունը համընկնում է բանկի հետ",
            "Չեղարկման պայմանը՝ Ճկուն",
            "Մարզավայրը՝ ակտիվ",
            "Ձեր էջը ստուգված է թաքնված պատուհանում",
            "Ամրագրման հղումը տեղադրված է Instagram-ում և WhatsApp-ում",
            "Ավելացված են պիկ ժամերի գնային կանոնները",
            "Ավելացված է գույքը, եթե վարձով եք տալիս",
          ],
        },
      ],
    },
    {
      id: "questions",
      title: "Հաճախ տրվող հարցեր",
      blocks: [
        {
          kind: "table",
          head: ["Հարց", "Պատասխան"],
          rows: [
            [
              "Ավելացնելը վճարովի՞ է",
              "Ոչ։ Ավելացնելն անվճար է, և ձեր գնից միջնորդավճար չի պահվում՝ սպասարկման վճարը վճարում է խաղացողը ձեր գնի վրա։",
            ],
            [
              "Ե՞րբ եմ ստանում գումարը",
              "Երբ ձեր հաշվեկշիռը գերազանցի 10,000 ֏-ը՝ Եկամուտներ բաժնում պահպանված հաշվին, 3 աշխատանքային օրվա ընթացքում։",
            ],
            [
              "Իսկ եթե խաղացողը չգա՞",
              "Ամրագրումն արդեն վճարված է։ Չեղարկման ժամկետից դուրս գումարը ձերն է։",
            ],
            [
              "Կարո՞ղ եմ ժամ արգելափակել իմ օգտագործման համար",
              "Այո՝ արգելափակեք օրը Ժամեր բաժնում կամ առանձին ժամը՝ Ժամանակացույցում։",
            ],
            [
              "Կարո՞ղ եմ ավելացնել մեկից ավելի մարզավայր",
              "Այո։ Ավելացրեք յուրաքանչյուրն առանձին, կամ ավելացրեք դաշտեր մեկ մարզավայրի ներսում, եթե դրանք ամրագրվում են առանձին։",
            ],
            [
              "Կարո՞ղ եմ հետո փոխել գինը",
              "Ցանկացած պահի։ Արդեն կատարված ամրագրումները պահպանում են իրենց գինը։",
            ],
            ["Հնարավո՞ր է ամրագրել 4 ժամ", "Այո, մեկ ամրագրման մեջ՝ մինչև 8 ժամ։"],
          ],
        },
      ],
    },
  ],
};

export function getOwnerGuide(language: Language): OwnerGuide {
  return language === "hy" ? hyGuide : enGuide;
}
