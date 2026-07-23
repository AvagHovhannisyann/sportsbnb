import { PaymentProvider, ProviderKey } from "./types.ts";
import { ameriaProvider } from "./ameria.ts";
import { idramProvider } from "./idram.ts";
import { mockProvider, mockEnabled } from "./mock.ts";

export function getProvider(key: string): PaymentProvider {
  switch (key as ProviderKey) {
    case "ameria":
      return ameriaProvider;
    case "idram":
      return idramProvider;
    case "mock":
      if (!mockEnabled()) throw new Error("mock provider is disabled");
      return mockProvider;
    default:
      throw new Error(`unknown payment provider: ${key}`);
  }
}
