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
 * Mock provider for development and E2E tests, enabled only when
 * PAYMENTS_MOCK_ENABLED=true. "Redirects" to the app's own mock-pay page,
 * where the tester chooses succeed / fail; payments-verify honors the choice.
 */

export function mockEnabled(): boolean {
  return Deno.env.get("PAYMENTS_MOCK_ENABLED") === "true";
}

export const mockProvider: PaymentProvider = {
  key: "mock",

  init(p: InitParams): Promise<InitResult> {
    if (!mockEnabled()) throw new Error("mock provider is disabled");
    const appUrl = Deno.env.get("APP_BASE_URL") ?? "http://localhost:8080";
    return Promise.resolve({
      redirectUrl: `${appUrl}/pay/mock/${p.paymentId}`,
      providerPaymentId: `mock_${p.orderRef}`,
    });
  },

  // The mock "bank" decision arrives via payments-verify's mockOutcome input;
  // stand-alone verify treats mock payments as paid (tests override).
  verify(p: VerifyParams): Promise<VerifyResult> {
    if (!mockEnabled()) throw new Error("mock provider is disabled");
    return Promise.resolve({ status: "paid", amountMinor: p.expectedAmountMinor, raw: { mock: true } });
  },

  refund(_p: RefundParams): Promise<RefundResult> {
    if (!mockEnabled()) throw new Error("mock provider is disabled");
    return Promise.resolve({ ok: true, raw: { mock: true } });
  },
};
