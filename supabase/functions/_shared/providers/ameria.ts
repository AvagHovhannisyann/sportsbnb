import {
  PaymentProvider,
  InitParams,
  InitResult,
  VerifyParams,
  VerifyResult,
  RefundParams,
  RefundResult,
} from "./types.ts";
import { minorToDecimal, decimalToMinor, CURRENCY_NUMERIC } from "./money.ts";

/**
 * Ameriabank vPOS adapter (redirect flow).
 *
 * InitPayment → redirect user to the bank's payment page → bank calls BackURL
 * with query params → we NEVER trust those params and always re-verify with
 * GetPaymentDetails (ResponseCode "00" + amount match).
 *
 * Env:
 *   AMERIA_BASE_URL   (prod https://services.ameriabank.am/VPOS ;
 *                      test https://servicestest.ameriabank.am/VPOS)
 *   AMERIA_CLIENT_ID, AMERIA_USERNAME, AMERIA_PASSWORD
 *   AMERIA_TEST_CARDHOLDER_ID (sandbox only, optional)
 */

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

async function post(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const base = env("AMERIA_BASE_URL").replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Ameria ${path} HTTP ${res.status}: ${await res.text()}`);
  }
  return await res.json();
}

export const ameriaProvider: PaymentProvider = {
  key: "ameria",

  async init(p: InitParams): Promise<InitResult> {
    const body: Record<string, unknown> = {
      ClientID: env("AMERIA_CLIENT_ID"),
      Username: env("AMERIA_USERNAME"),
      Password: env("AMERIA_PASSWORD"),
      OrderID: p.orderRef,
      Amount: minorToDecimal(p.amountMinor),
      Currency: CURRENCY_NUMERIC[p.currency] ?? CURRENCY_NUMERIC.AMD,
      Description: p.description.slice(0, 250),
      BackURL: p.backUrl,
      Opaque: p.paymentId,
    };
    const testCardHolder = Deno.env.get("AMERIA_TEST_CARDHOLDER_ID");
    if (testCardHolder) body.CardHolderID = testCardHolder;

    const data = await post("/api/VPOS/InitPayment", body);
    // InitPayment success => ResponseCode 1 and a PaymentID
    if (String(data.ResponseCode) !== "1" || !data.PaymentID) {
      throw new Error(`Ameria InitPayment failed: ${data.ResponseCode} ${data.ResponseMessage ?? ""}`);
    }
    const base = env("AMERIA_BASE_URL").replace(/\/$/, "");
    const lang = p.lang ?? "en";
    return {
      redirectUrl: `${base}/Payments/Pay?id=${data.PaymentID}&lang=${lang}`,
      providerPaymentId: String(data.PaymentID),
    };
  },

  async verify(p: VerifyParams): Promise<VerifyResult> {
    if (!p.providerPaymentId) return { status: "pending", raw: null };
    const data = await post("/api/VPOS/GetPaymentDetails", {
      PaymentID: p.providerPaymentId,
      Username: env("AMERIA_USERNAME"),
      Password: env("AMERIA_PASSWORD"),
    });

    // "00" = successfully deposited. Anything else is failed/pending.
    const code = String(data.ResponseCode ?? "");
    const approved = typeof data.ApprovedAmount === "number"
      ? decimalToMinor(data.ApprovedAmount)
      : typeof data.Amount === "number"
        ? decimalToMinor(data.Amount)
        : undefined;

    if (code === "00") {
      if (approved !== undefined && approved !== p.expectedAmountMinor) {
        // Amount mismatch is treated as failure — never confirm a partial charge.
        return { status: "failed", amountMinor: approved, raw: data };
      }
      return { status: "paid", amountMinor: approved, raw: data };
    }
    // Payment not yet attempted / in progress states keep polling
    const state = String(data.PaymentState ?? data.OrderStatus ?? "").toLowerCase();
    if (state.includes("start") || state.includes("process")) {
      return { status: "pending", raw: data };
    }
    return { status: "failed", raw: data };
  },

  async refund(p: RefundParams): Promise<RefundResult> {
    const data = await post("/api/VPOS/RefundPayment", {
      PaymentID: p.providerPaymentId,
      Username: env("AMERIA_USERNAME"),
      Password: env("AMERIA_PASSWORD"),
      Amount: minorToDecimal(p.amountMinor),
    });
    const ok = String(data.ResponseCode) === "00" || String(data.ResponseCode) === "1";
    return { ok, raw: data };
  },
};
