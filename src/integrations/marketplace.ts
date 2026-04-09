import type {
  CurrencyCode,
  MarketOffer,
  ProductMonitor,
  ProviderKind
} from "@/core/types";

export type OwnListingSnapshot = {
  sellerName: string;
  currentPrice: number;
  currency: CurrencyCode;
  capturedAt: string;
};

export type ApplyPriceResult = {
  appliedPrice: number;
  appliedAt: string;
  mode: "live" | "dry-run";
};

export interface SellerOperationsProvider {
  fetchOwnListing(product: ProductMonitor): Promise<OwnListingSnapshot>;
  applyPrice(
    productId: string,
    newPrice: number,
    product: ProductMonitor
  ): Promise<ApplyPriceResult>;
}

export interface MarketIntelligenceProvider {
  fetchOffers(product: ProductMonitor): Promise<MarketOffer[]>;
}

export interface MarketplaceProvider
  extends SellerOperationsProvider,
    MarketIntelligenceProvider {}

export type ResolvedProductProviders = {
  sellerProvider: ProviderKind;
  marketProvider: ProviderKind;
};

export function resolveProductProviders(
  product: ProductMonitor
): ResolvedProductProviders {
  return {
    sellerProvider: product.sellerProvider ?? product.provider,
    marketProvider: product.marketProvider ?? product.provider
  };
}
