import {
  PaymentProvider,
  InitParams,
  InitResult,
  VerifyParams,
  VerifyResult,
  RefundParams,
  RefundResult,
} from "./types.ts";
import { minorToDecimal } from "./money.ts";
import { crypto as stdCrypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

/**
 * Idram wallet adapter (form-post redirect flow).
 *
 * The user is form-POSTed to Idram's payment page. Idram then calls our result
 * URL server-to-server twice: a precheck (EDP_PRECHECK=YES → reply "OK") and a
 * confirmation carrying EDP_CHECKSUM, which we verify before marking paid.
 *
 * Refunds: Idram exposes no refund API — refunds are performed manually in the
 * merchant cabinet, so refund() only signals `manual`.
 *
 * Env: IDRAM_MERCHANT_ID (EDP_REC_ACCOUNT), IDRAM_SECRET_KEY,
 *      IDRAM_PAYMENT_URL (default https://banking.idram.am/Payment/GetPayment)
 */

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`${name} is not configured`);
  return v;
}

async function md5Hex(input: string): Promise<string> {
  const digest = await stdCrypto.subtle.digest("MD5", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify the confirmation checksum:
 * MD5(EDP_REC_ACCOUNT:EDP_AMOUNT:SECRET_KEY:EDP_BILL_NO:EDP_PAYER_ACCOUNT:EDP_TRANS_ID:EDP_TRANS_DATE)
 */
export async function verifyIdramChecksum(fields: Record<string, string>): Promise<boolean> {
  const secret = env("IDRAM_SECRET_KEY");
  const parts = [
    fields.EDP_REC_ACCOUNT,
    fields.EDP_AMOUNT,
    secret,
    fields.EDP_BILL_NO,
    fields.EDP_PAYER_ACCOUNT,
    fields.EDP_TRANS_ID,
    fields.EDP_TRANS_DATE,
  ];
  if (parts.some((p) => p === undefined || p === null)) return false;
  const expected = await md5Hex(parts.join(":"));
  return expected.toLowerCase() === (fields.EDP_CHECKSUM ?? "").toLowerCase();
}

export const idramProvider: PaymentProvider = {
  key: "idram",

  // Returns form fields; the client auto-submits them to Idram.
  init(p: InitParams): Promise<InitResult> {
    const action = Deno.env.get("IDRAM_PAYMENT_URL") ?? "https://banking.idram.am/Payment/GetPayment";
    const fields: Record<string, string> = {
      EDP_LANGUAGE: (p.lang ?? "en").toUpperCase(),
      EDP_REC_ACCOUNT: env("IDRAM_MERCHANT_ID"),
      EDP_DESCRIPTION: p.description.slice(0, 250),
      EDP_AMOUNT: minorToDecimal(p.amountMinor).toFixed(2),
      EDP_BILL_NO: String(p.orderRef),
    };
    return Promise.resolve({ redirectUrl: action, formAction: action, formFields: fields });
  },

  // Idram has no polling API in the basic integration: the confirmation
  // callback is the source of truth. verify() therefore reports what the
  // callback recorded (the caller checks the DB) — here always "pending".
  verify(_p: VerifyParams): Promise<VerifyResult> {
    return Promise.resolve({ status: "pending", raw: { note: "idram is callback-driven" } });
  },

  refund(_p: RefundParams): Promise<RefundResult> {
    return Promise.resolve({ ok: false, manual: true, raw: { note: "manual refund via Idram merchant cabinet" } });
  },
};
