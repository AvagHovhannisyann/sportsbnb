import {
  PaymentProvider,
  InitParams,
  InitResult,
  VerifyParams,
  VerifyResult,
  RefundParams,
  RefundResult,
} from "./types.ts";

/**
 * Lemon Squeezy adapter (hosted checkout + webhook settlement).
 *
 * Flow:
 *   init()    POST /v1/checkouts with a custom_price and our payments.id carried
 *             in checkout_data.custom → redirect the user to data.attributes.url.
 *   settle    Lemon Squeezy calls payments-callback-lemonsqueezy with
 *             `order_created`; that function verifies the X-Signature HMAC and
 *             calls settlePaidPayment(). The order id lands on
 *             payments.provider_payment_id there — init() cannot know it yet.
 *   verify()  Real lookup: GET /v1/orders/<order id>, status mapped honestly.
 *             Returns "pending" until the webhook has recorded an order id,
 *             because there is no way to find an order from a checkout id or
 *             from our custom data (the API has no filter for either).
 *   refund()  Real API: POST /v1/orders/<order id>/refund. Verified against the
 *             live API — the route exists (an unauthenticated POST returns 401
 *             "Unauthenticated", not the 404 "route could not be found" that
 *             non-existent routes return) and is documented at
 *             docs.lemonsqueezy.com/api/orders/issue-refund. Unlike Idram this
 *             provider does NOT need the manual-refund escape hatch.
 *
 * Money: `custom_price`, order `total` and the refund `amount` are all integer
 * minor units of the STORE currency (AMD for store 440378), which is exactly how
 * payments.amount_minor is stored — no decimal conversion anywhere.
 *
 * Env: LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_VARIANT_ID,
 *      LEMONSQUEEZY_STORE_ID (default "440378"),
 *      LEMONSQUEEZY_STORE_CURRENCY (default "AMD"),
 *      LEMONSQUEEZY_WEBHOOK_SECRET (used by the callback function).
 */

const API_BASE = "https://api.lemonsqueezy.com/v1";
const JSON_API = "application/vnd.api+json";

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

export function storeId(): string {
  return Deno.env.get("LEMONSQUEEZY_STORE_ID") ?? "440378";
}

export function storeCurrency(): string {
  return Deno.env.get("LEMONSQUEEZY_STORE_CURRENCY") ?? "AMD";
}

async function api(
  path: string,
  init: { method: string; body?: unknown },
): Promise<{ status: number; data: Record<string, any> | null; text: string }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: init.method,
    headers: {
      Accept: JSON_API,
      "Content-Type": JSON_API,
      Authorization: `Bearer ${env("LEMONSQUEEZY_API_KEY")}`,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  let data: Record<string, any> | null = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { status: res.status, data, text };
}

/**
 * Timing-safe comparison of two byte arrays. Length is not secret (the digest
 * length is fixed), so an early return on a length mismatch is fine.
 */
function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function hexToBytes(hex: string): Uint8Array | null {
  const clean = hex.trim().toLowerCase();
  if (clean.length === 0 || clean.length % 2 !== 0 || !/^[0-9a-f]+$/.test(clean)) return null;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/**
 * Verify a Lemon Squeezy webhook.
 *
 * `X-Signature` is a hex HMAC-SHA256 of the RAW request body under the webhook
 * secret. The caller MUST pass the untouched body text — re-serialising parsed
 * JSON changes the bytes and the signature will never match (and a webhook that
 * parses before it verifies is not verified at all).
 */
export async function verifyLemonSqueezySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;
  const provided = hexToBytes(signatureHeader);
  if (!provided) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return timingSafeEqualBytes(provided, new Uint8Array(mac));
}

export const lemonSqueezyProvider: PaymentProvider = {
  key: "lemonsqueezy",

  async init(p: InitParams): Promise<InitResult> {
    // custom_price is denominated in the store's currency; charging an AMD
    // store a figure computed in another currency would silently overcharge.
    if (p.currency.toUpperCase() !== storeCurrency().toUpperCase()) {
      throw new Error(
        `Lemon Squeezy store currency is ${storeCurrency()}, cannot charge ${p.currency}`,
      );
    }
    if (!Number.isInteger(p.amountMinor) || p.amountMinor <= 0) {
      throw new Error(`invalid amountMinor: ${p.amountMinor}`);
    }

    const { status, data, text } = await api("/checkouts", {
      method: "POST",
      body: {
        data: {
          type: "checkouts",
          attributes: {
            custom_price: p.amountMinor,
            product_options: {
              name: p.description.slice(0, 250),
              redirect_url: p.backUrl,
            },
            checkout_data: {
              custom: {
                // Comes back as meta.custom_data.payment_id on the webhook —
                // this is the only link between the order and our payment row.
                payment_id: p.paymentId,
                order_ref: String(p.orderRef),
              },
            },
          },
          relationships: {
            store: { data: { type: "stores", id: storeId() } },
            variant: { data: { type: "variants", id: env("LEMONSQUEEZY_VARIANT_ID") } },
          },
        },
      },
    });

    const url = data?.data?.attributes?.url;
    if (status < 200 || status >= 300 || typeof url !== "string") {
      throw new Error(`Lemon Squeezy createCheckout failed: HTTP ${status} ${text.slice(0, 300)}`);
    }

    // Deliberately no providerPaymentId: the checkout id is NOT an order id, and
    // storing it would make verify() query /v1/orders with the wrong id. The
    // webhook writes the real order id when the order is created.
    return { redirectUrl: url };
  },

  async verify(p: VerifyParams): Promise<VerifyResult> {
    if (!p.providerPaymentId) {
      // No order id yet — the order_created webhook has not arrived.
      return { status: "pending", raw: { note: "no lemonsqueezy order id recorded yet" } };
    }

    const { status, data, text } = await api(`/orders/${encodeURIComponent(p.providerPaymentId)}`, {
      method: "GET",
    });

    if (status === 404) return { status: "pending", raw: { note: "order not found (yet)" } };
    if (status < 200 || status >= 300) {
      throw new Error(`Lemon Squeezy getOrder failed: HTTP ${status} ${text.slice(0, 300)}`);
    }

    const attrs = data?.data?.attributes ?? {};
    const total = typeof attrs.total === "number" ? attrs.total : undefined;
    const orderStatus = String(attrs.status ?? "").toLowerCase();

    // A refunded order was paid once, but it must never be settled now.
    if (orderStatus === "refunded" || attrs.refunded === true) {
      return { status: "failed", amountMinor: total, raw: data };
    }
    if (orderStatus === "paid") {
      const currencyOk = String(attrs.currency ?? storeCurrency()).toUpperCase() ===
        storeCurrency().toUpperCase();
      if (!currencyOk || (total !== undefined && total !== p.expectedAmountMinor)) {
        // Never confirm a charge that isn't the amount we asked for.
        return { status: "failed", amountMinor: total, raw: data };
      }
      return { status: "paid", amountMinor: total, raw: data };
    }
    if (orderStatus === "pending") return { status: "pending", raw: data };
    return { status: "failed", raw: data };
  },

  async refund(p: RefundParams): Promise<RefundResult> {
    if (!p.providerPaymentId) {
      // No order id means the webhook never landed; there is nothing to refund
      // through the API, so hand it to a human rather than reporting success.
      return { ok: false, manual: true, raw: { note: "no lemonsqueezy order id on payment" } };
    }

    const orderId = p.providerPaymentId;
    const { status, data, text } = await api(`/orders/${encodeURIComponent(orderId)}/refund`, {
      method: "POST",
      body: {
        data: {
          type: "orders",
          id: String(orderId),
          // Omitting `amount` would refund in full; we always send the policy
          // figure so partial refunds are exact.
          attributes: { amount: p.amountMinor },
        },
      },
    });

    if (status < 200 || status >= 300) {
      return { ok: false, raw: { status, body: text.slice(0, 500) } };
    }
    const attrs = data?.data?.attributes ?? {};
    const refunded = typeof attrs.refunded_amount === "number" ? attrs.refunded_amount : undefined;
    return { ok: true, raw: { refundedAmountMinor: refunded, order: data } };
  },
};
