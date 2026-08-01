import { PaymentProvider, ProviderKey } from "./types.ts";
import { lemonSqueezyProvider } from "./lemonsqueezy.ts";
import { mockProvider, mockEnabled } from "./mock.ts";

/**
 * Live payment providers.
 *
 * Lemon Squeezy is the only real provider. Ameria vPOS and Idram are
 * deliberately UNWIRED — their adapters (./ameria.ts, ./idram.ts) and their
 * callback functions are still on disk and still deployed, but they are no
 * longer selectable here, so no new payment can be created against them.
 * Re-enabling either is a matter of re-importing it and adding its case back.
 *
 * Consequence to be aware of: a legacy payment row whose `provider` is
 * "ameria"/"idram" can no longer be refunded through payments-refund, because
 * getProvider() will throw for it. Those have to be refunded in the provider's
 * merchant cabinet (Ameria/Idram) and reconciled by hand.
 */
export function getProvider(key: string): PaymentProvider {
  switch (key as ProviderKey) {
    case "lemonsqueezy":
      return lemonSqueezyProvider;
    case "mock":
      if (!mockEnabled()) throw new Error("mock provider is disabled");
      return mockProvider;
    default:
      throw new Error(`unknown payment provider: ${key}`);
  }
}
