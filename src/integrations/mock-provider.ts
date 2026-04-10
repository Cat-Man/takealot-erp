import type { ProductMonitor } from "@/core/types";
import type { ApplyPriceResult, MarketplaceProvider } from "./marketplace";

type AppliedUpdate = {
  productId: string;
  price: number;
};

const offerBook = {
  "sku-1": [
    { sellerName: "Cable Shop", price: 238, currency: "ZAR" as const },
    { sellerName: "Tech Hub", price: 244, currency: "ZAR" as const },
    { sellerName: "My Store", price: 249, currency: "ZAR" as const }
  ],
  "sku-2": [
    { sellerName: "Power Cell", price: 515, currency: "ZAR" as const },
    { sellerName: "Charge Spot", price: 520, currency: "ZAR" as const },
    { sellerName: "My Store", price: 499, currency: "ZAR" as const }
  ]
};

export function createMockProvider(): MarketplaceProvider & {
  getAppliedUpdates(): AppliedUpdate[];
} {
  const appliedUpdates: AppliedUpdate[] = [];

  return {
    async fetchOwnListing(product: ProductMonitor) {
      const ownOffer = (offerBook[product.id as keyof typeof offerBook] ?? []).find(
        (offer) => offer.sellerName === product.ownSellerName
      );

      return {
        sellerName: product.ownSellerName,
        currentPrice: ownOffer?.price ?? product.currentPrice,
        currency: ownOffer?.currency ?? "ZAR",
        capturedAt: new Date().toISOString(),
        sellerSku: product.id.toUpperCase(),
        stockQuantity: product.id === "sku-1" ? 14 : 32,
        listingStatus: "active"
      };
    },
    async fetchOffers(product: ProductMonitor) {
      return offerBook[product.id as keyof typeof offerBook] ?? [];
    },
    async applyPrice(
      productId: string,
      newPrice: number
    ): Promise<ApplyPriceResult> {
      appliedUpdates.push({
        productId,
        price: newPrice
      });

      return {
        appliedPrice: newPrice,
        appliedAt: new Date().toISOString(),
        mode: "live"
      };
    },
    getAppliedUpdates() {
      return appliedUpdates;
    }
  };
}
