import { handlePreflight } from "../_shared/cors.ts";
import { json, makeLogger } from "../_shared/http.ts";
import { requireAdmin, requireCronSecret, HttpError } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase.ts";

/**
 * Read the same two env vars the Lemon Squeezy adapter reads, with the same
 * defaults, rather than importing them from it.
 *
 * The adapter is the money path. A diagnostic has no business dragging the
 * checkout, verify and refund code into its own bundle just to learn a store
 * id — and keeping this dependency-free is what lets the function be deployed
 * on its own without shipping a copy of the payment code alongside it.
 *
 * The cost is that these defaults are stated twice. They are covered by
 * check 3 below: if the two ever disagree with the live store, the store
 * currency check fails loudly rather than drifting unnoticed.
 */
function storeId(): string {
  return Deno.env.get("LEMONSQUEEZY_STORE_ID") ?? "440378";
}

function storeCurrency(): string {
  return Deno.env.get("LEMONSQUEEZY_STORE_CURRENCY") ?? "AMD";
}

const log = makeLogger("payments-preflight");

/**
 * Answers one question: would a real card payment work right now?
 *
 * Every precondition for taking money lives somewhere nobody can see from the
 * outside — API keys and the webhook secret are Supabase secrets, the variant
 * and store live in Lemon Squeezy, the commission lives in a table. Before this
 * existed the only way to find out was to put a real card through and watch
 * what broke, which is a bad way to learn that a variant id is wrong.
 *
 * So this runs INSIDE the edge runtime, where the secrets actually are, and
 * reports each check as pass / fail / warn. It is read-only: it lists and reads
 * from the Lemon Squeezy API and reads our own tables. It creates no checkout,
 * charges nothing, and writes nothing.
 *
 * Admin JWT or cron secret. Never public — the output names configuration and
 * would be a gift to anyone probing the store.
 *
 * GET/POST /functions/v1/payments-preflight
 */

const API_BASE = "https://api.lemonsqueezy.com/v1";
const JSON_API = "application/vnd.api+json";

type Status = "pass" | "fail" | "warn";
type Check = { name: string; status: Status; detail: string };

/**
 * Lemon Squeezy's own cost, in basis points plus a fixed minor-unit amount.
 *
 * 5% merchant-of-record fee + 1.5% international (every Armenian card is
 * international to a US-settled store) + $0.50 fixed. The fixed part is the one
 * that bites: on a 10,000 AMD hour it is another ~2%, so the effective rate at
 * this price point is nearer 8.5% than 5%.
 *
 * Published at lemonsqueezy.com/pricing. Kept here as the floor the platform
 * commission has to clear — a commission below this means every booking is
 * settled at a loss, which is a silent, permanent leak rather than an outage.
 */
const LS_FEE_BPS = 650;
const LS_FEE_FIXED_MINOR = 200 * 100; // ~$0.50 in AMD minor units

async function lsApi(path: string): Promise<{ status: number; data: any; text: string }> {
  const key = Deno.env.get("LEMONSQUEEZY_API_KEY");
  if (!key) return { status: 0, data: null, text: "LEMONSQUEEZY_API_KEY not set" };
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        Accept: JSON_API,
        "Content-Type": JSON_API,
        Authorization: `Bearer ${key}`,
      },
    });
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    return { status: res.status, data, text };
  } catch (e) {
    return { status: 0, data: null, text: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    try {
      requireCronSecret(req);
    } catch {
      await requireAdmin(req);
    }

    const checks: Check[] = [];
    const add = (name: string, status: Status, detail: string) =>
      checks.push({ name, status, detail });

    // ---- 1. Secrets present ----------------------------------------------
    // Presence only. A wrong-but-present key is caught by the live calls below;
    // this exists to name a missing one plainly instead of surfacing it as an
    // opaque 401 three checks later.
    const required = [
      "LEMONSQUEEZY_API_KEY",
      "LEMONSQUEEZY_VARIANT_ID",
      "LEMONSQUEEZY_WEBHOOK_SECRET",
      "APP_BASE_URL",
    ];
    for (const name of required) {
      const v = Deno.env.get(name);
      add(`secret:${name}`, v ? "pass" : "fail", v ? "set" : "NOT SET");
    }
    if (Deno.env.get("PAYMENTS_MOCK_ENABLED") === "true") {
      add(
        "mock-provider",
        "warn",
        "PAYMENTS_MOCK_ENABLED=true — the mock provider can be selected. Fine for testing, must be unset before real customers.",
      );
    }

    // ---- 2. Lemon Squeezy credentials actually work ----------------------
    const me = await lsApi("/users/me");
    if (me.status === 200) {
      add("lemonsqueezy:auth", "pass", `authenticated as ${me.data?.data?.attributes?.email ?? "unknown"}`);
    } else {
      add(
        "lemonsqueezy:auth",
        "fail",
        `GET /users/me returned ${me.status || "no response"} — ${me.text.slice(0, 160)}`,
      );
    }

    // ---- 3. Store exists and its currency matches what we charge in -------
    const wantCurrency = storeCurrency().toUpperCase();
    const store = await lsApi(`/stores/${encodeURIComponent(storeId())}`);
    if (store.status === 200) {
      const actual = String(store.data?.data?.attributes?.currency ?? "").toUpperCase();
      if (actual && actual !== wantCurrency) {
        // init() refuses to charge on a mismatch, so this is a hard stop, not
        // a rounding concern: every payment would throw before redirecting.
        add(
          "lemonsqueezy:store-currency",
          "fail",
          `store ${storeId()} is ${actual}, but LEMONSQUEEZY_STORE_CURRENCY is ${wantCurrency}. Every checkout will be refused.`,
        );
      } else {
        add("lemonsqueezy:store-currency", "pass", `store ${storeId()} is ${actual || wantCurrency}`);
      }
    } else {
      add(
        "lemonsqueezy:store",
        "fail",
        `GET /stores/${storeId()} returned ${store.status || "no response"} — ${store.text.slice(0, 160)}`,
      );
    }

    // ---- 4. The variant exists and can carry our prices -------------------
    // Every checkout sends custom_price, and two documented variant attributes
    // decide whether that price survives to the card.
    //
    // `pay_what_you_want` is the variant-level switch for a customer-set price.
    // Lemon Squeezy's docs do not state outright what happens to custom_price
    // when it is false, so this is reported as a warning to check rather than a
    // failure to trust: the dangerous outcome would be the variant's list price
    // being charged instead of the venue's, which is wrong silently rather than
    // loudly. Confirm it against a real checkout before launch.
    //
    // `min_price` IS documented — when pay-what-you-want is on, it is the floor
    // a customer may pay. A venue listed below it cannot be booked at all, so
    // it is checked against the cheapest hour actually on sale.
    const variantId = Deno.env.get("LEMONSQUEEZY_VARIANT_ID");
    let minPriceMinor = 0;
    if (variantId) {
      const variant = await lsApi(`/variants/${encodeURIComponent(variantId)}`);
      if (variant.status === 200) {
        const a = variant.data?.data?.attributes ?? {};
        const pwyw = a.pay_what_you_want === true;
        minPriceMinor = typeof a.min_price === "number" ? a.min_price : 0;
        add(
          "lemonsqueezy:variant",
          pwyw ? "pass" : "warn",
          pwyw
            ? `variant ${variantId} ("${a.name ?? "?"}") is pay-what-you-want, min_price=${minPriceMinor}`
            : `variant ${variantId} ("${a.name ?? "?"}") has pay_what_you_want=false — verify with one real checkout that custom_price is honoured and the variant's own list price is not charged instead`,
        );
      } else {
        add(
          "lemonsqueezy:variant",
          "fail",
          `GET /variants/${variantId} returned ${variant.status || "no response"} — ${variant.text.slice(0, 160)}`,
        );
      }
    }

    // ---- 5. A webhook points back here, for the events we settle on ------
    // Settlement is webhook-only: without order_created nothing is ever marked
    // paid, the booking stays pending_payment and expires, and the customer is
    // charged for a booking they do not get.
    const appUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const expectedUrl = `${appUrl}/functions/v1/payments-callback-lemonsqueezy`;
    const hooks = await lsApi(`/webhooks?filter[store_id]=${encodeURIComponent(storeId())}`);
    if (hooks.status === 200) {
      const list: any[] = hooks.data?.data ?? [];
      const mine = list.find((w) => String(w?.attributes?.url ?? "") === expectedUrl);
      if (!mine) {
        add(
          "lemonsqueezy:webhook",
          "fail",
          `no webhook points at ${expectedUrl}. Found: ${
            list.map((w) => w?.attributes?.url).join(", ") || "none"
          }`,
        );
      } else {
        const events: string[] = mine.attributes?.events ?? [];
        const missing = ["order_created", "order_refunded"].filter((e) => !events.includes(e));
        add(
          "lemonsqueezy:webhook",
          missing.length ? "fail" : "pass",
          missing.length
            ? `webhook exists but is not subscribed to: ${missing.join(", ")}`
            : `subscribed to ${events.join(", ")}`,
        );
      }
    } else {
      add(
        "lemonsqueezy:webhook",
        "warn",
        `could not list webhooks (${hooks.status || "no response"}) — check by hand in the dashboard`,
      );
    }

    // ---- 6. Commission covers what Lemon Squeezy takes -------------------
    const admin = adminClient();
    const { data: setting } = await admin
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "commission_bps")
      .maybeSingle();
    const bps = Number(setting?.setting_value ?? 0);

    // Modelled on a real listed price rather than in the abstract, because the
    // fixed $0.50 makes the effective rate depend on ticket size.
    const { data: venue } = await admin
      .from("venues")
      .select("price_per_hour")
      .not("price_per_hour", "is", null)
      .order("price_per_hour", { ascending: true })
      .limit(1)
      .maybeSingle();
    const ownerMinor = Math.round(Number(venue?.price_per_hour ?? 10000) * 100);
    const feeMinor = Math.round((ownerMinor * bps) / 10000);
    const grossMinor = ownerMinor + feeMinor;
    const lsTakes = Math.round((grossMinor * LS_FEE_BPS) / 10000) + LS_FEE_FIXED_MINOR;
    const marginMinor = grossMinor - lsTakes - ownerMinor;

    if (minPriceMinor > 0 && grossMinor < minPriceMinor) {
      add(
        "lemonsqueezy:min-price",
        "fail",
        `the cheapest bookable hour costs ${(grossMinor / 100).toLocaleString()} AMD but the variant's min_price is ` +
          `${(minPriceMinor / 100).toLocaleString()} AMD — that booking cannot be checked out at all`,
      );
    }

    add(
      "commission",
      marginMinor > 0 ? "pass" : "fail",
      `commission_bps=${bps}. On the cheapest listed hour (${(ownerMinor / 100).toLocaleString()} AMD) ` +
        `the customer pays ${(grossMinor / 100).toLocaleString()}, Lemon Squeezy takes ~${(lsTakes / 100).toLocaleString()}, ` +
        `the owner is owed ${(ownerMinor / 100).toLocaleString()}, leaving the platform ${(marginMinor / 100).toLocaleString()} AMD` +
        (marginMinor > 0 ? "" : " — EVERY BOOKING SETTLES AT A LOSS"),
    );

    // ---- 7. Owners can actually be paid ----------------------------------
    // Money can be taken without this, but it can never leave: payouts-run
    // snapshots the destination, and an owner with no account produces a payout
    // row nobody can execute.
    const { count: ownerCount } = await admin
      .from("venues")
      .select("owner_id", { count: "exact", head: true })
      .not("owner_id", "is", null);
    const { count: accountCount } = await admin
      .from("owner_payout_accounts")
      .select("id", { count: "exact", head: true });
    add(
      "payout-accounts",
      (accountCount ?? 0) > 0 ? "pass" : "warn",
      `${accountCount ?? 0} payout account(s) on file for ${ownerCount ?? 0} venue owner(s). ` +
        "Owners without one can be charged for but not paid.",
    );

    // ---- 8. Holds are actually being expired ------------------------------
    // A hold that never expires holds its slot forever, so an abandoned
    // checkout quietly removes inventory.
    const { count: staleHolds } = await admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_payment")
      .lt("expires_at", new Date().toISOString());
    add(
      "expired-holds",
      (staleHolds ?? 0) === 0 ? "pass" : "warn",
      (staleHolds ?? 0) === 0
        ? "no stale holds"
        : `${staleHolds} hold(s) are past expires_at and still pending_payment — is bookings-expire scheduled?`,
    );

    const failed = checks.filter((c) => c.status === "fail");
    const warned = checks.filter((c) => c.status === "warn");
    log("preflight complete", { failed: failed.length, warned: warned.length });

    return json(req, {
      ready: failed.length === 0,
      summary: `${checks.length - failed.length - warned.length} passed, ${warned.length} warning(s), ${failed.length} failure(s)`,
      blocking: failed.map((c) => `${c.name}: ${c.detail}`),
      checks,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return json(req, { error: error.message }, error.status);
    }
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return json(req, { error: "preflight failed" }, 500);
  }
});
