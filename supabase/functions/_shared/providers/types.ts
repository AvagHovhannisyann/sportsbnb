/**
 * "ameria" and "idram" are retained here only so the (unwired) adapter files
 * still type-check — see registry.ts. Live providers: "lemonsqueezy" and "mock".
 */
export type ProviderKey = "lemonsqueezy" | "ameria" | "idram" | "mock";

export interface InitParams {
  orderRef: number;               // numeric order id (payments.order_ref)
  paymentId: string;              // our payments.id (uuid)
  amountMinor: number;            // minor units (AMD ×100)
  currency: string;               // ISO 4217 alpha, e.g. "AMD"
  description: string;
  backUrl: string;                // where the provider sends the user afterwards
  lang?: "am" | "en" | "ru";
}

export interface InitResult {
  redirectUrl: string;
  providerPaymentId?: string;     // Ameria PaymentID; Idram assigns later
  formFields?: Record<string, string>; // for form-post providers (Idram)
  formAction?: string;
}

export interface VerifyParams {
  providerPaymentId?: string;
  orderRef: number;
  expectedAmountMinor: number;
}

export interface VerifyResult {
  status: "paid" | "failed" | "pending";
  amountMinor?: number;
  raw: unknown;
}

export interface RefundParams {
  providerPaymentId: string;
  amountMinor: number;
}

export interface RefundResult {
  ok: boolean;
  manual?: boolean;               // true when the provider has no refund API (Idram)
  raw: unknown;
}

export interface PaymentProvider {
  key: ProviderKey;
  init(p: InitParams): Promise<InitResult>;
  verify(p: VerifyParams): Promise<VerifyResult>;
  refund(p: RefundParams): Promise<RefundResult>;
}
