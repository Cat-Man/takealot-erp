import type { MarketIntelligenceProvider } from "./marketplace";

export function createManualImportMarketProvider(): MarketIntelligenceProvider {
  return {
    async fetchOffers(product) {
      if (!product.manualMarketSnapshot) {
        return [];
      }

      return [product.manualMarketSnapshot.competitor];
    }
  };
}
