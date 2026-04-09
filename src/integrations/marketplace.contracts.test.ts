import { describe, expect, it } from "vitest";
import type { ProductMonitor } from "@/core/types";
import { seedProducts } from "@/lib/fixtures";
import { createMockProvider } from "./mock-provider";
import * as marketplace from "./marketplace";

type MarketplaceModule = {
  resolveProductProviders?: (product: ProductMonitor) => {
    sellerProvider: string;
    marketProvider: string;
  };
};

describe("marketplace contracts", () => {
  it("resolves seller and market providers with legacy fallback", () => {
    const contracts = marketplace as MarketplaceModule;

    expect(contracts.resolveProductProviders).toBeTypeOf("function");
    expect(contracts.resolveProductProviders?.(seedProducts[0]!)).toEqual({
      sellerProvider: "mock",
      marketProvider: "mock"
    });
  });

  it("resolves explicit seller and market provider overrides independently", () => {
    const contracts = marketplace as MarketplaceModule;
    const product = {
      ...seedProducts[0]!,
      sellerProvider: "takealot-seller-api",
      marketProvider: "mock"
    } as ProductMonitor;

    expect(contracts.resolveProductProviders?.(product)).toEqual({
      sellerProvider: "takealot-seller-api",
      marketProvider: "mock"
    });
  });

  it("keeps the mock integration compatible with split contracts", () => {
    const provider = createMockProvider() as Record<string, unknown>;

    expect(provider.fetchOwnListing).toBeTypeOf("function");
    expect(provider.fetchOffers).toBeTypeOf("function");
    expect(provider.applyPrice).toBeTypeOf("function");
  });
});
