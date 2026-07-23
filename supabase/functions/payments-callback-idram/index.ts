import { makeLogger } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";
import { verifyIdramChecksum } from "../_shared/providers/idram.ts";
import { settlePaidPayment } from "../_shared/payments.ts";

const log = makeLogger("payments-callback-idram");

/**
 * Idram server-to-server result URL.
 *  1. Precheck: form fields with EDP_PRECHECK=YES — reply "OK" if the order is payable.
 *  2. Confirmation: fields incl. EDP_CHECKSUM — verify the secret-key hash and
 *     the amount before settling, then reply "OK".
 * Anything else gets a non-OK body so Idram treats the payment as failed.
 */
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ERROR", { status: 405 });

  const form = await req.formData().catch(() => null);
  if (!form) return new Response("ERROR: bad form", { status: 400 });

  const fields: Record<string, string> = {};
  for (const [k, v] of form.entries()) fields[k] = String(v);

  const billNo = fields.EDP_BILL_NO;
  if (!billNo || !/^\d+$/.test(billNo)) return new Response("ERROR: bad bill no", { status: 400 });

  const admin = adminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("order_ref", Number(billNo))
    .eq("provider", "idram")
    .maybeSingle();

  if (!payment) {
    log("unknown order", { billNo });
    return new Response("ERROR: unknown order", { status: 404 });
  }

  const expectedAmount = (payment.amount_minor / 100).toFixed(2);

  // --- Precheck ---
  if ((fields.EDP_PRECHECK ?? "").toUpperCase() === "YES") {
    const payable =
      ["created", "redirected"].includes(payment.status) &&
      fields.EDP_REC_ACCOUNT === Deno.env.get("IDRAM_MERCHANT_ID") &&
      Number(fields.EDP_AMOUNT) === Number(expectedAmount);
    log("precheck", { billNo, payable });
    return new Response(payable ? "OK" : "ERROR: not payable", { status: payable ? 200 : 409 });
  }

  // --- Confirmation ---
  if (!(await verifyIdramChecksum(fields))) {
    log("checksum failed", { billNo });
    return new Response("ERROR: checksum", { status: 401 });
  }
  if (Number(fields.EDP_AMOUNT) !== Number(expectedAmount)) {
    log("amount mismatch", { billNo, got: fields.EDP_AMOUNT, expected: expectedAmount });
    return new Response("ERROR: amount mismatch", { status: 409 });
  }

  await admin
    .from("payments")
    .update({ provider_payment_id: fields.EDP_TRANS_ID ?? null, updated_at: new Date().toISOString() })
    .eq("id", payment.id);

  const settled = await settlePaidPayment(payment.id, fields);
  log("confirmation", { billNo, ok: settled.ok, already: settled.alreadySettled });

  // Idram requires the literal body "OK" to consider the payment delivered.
  return new Response(settled.ok ? "OK" : "ERROR: settle failed", { status: settled.ok ? 200 : 500 });
});
