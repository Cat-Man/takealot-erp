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
  sellerSku?: string;
  stockQuantity?: number;
  listingStatus?: string;
};

export type SellerCatalogOffer = {
  offerId?: number;
  tsinId?: number;
  sellerSku: string;
  title: string;
  currentPrice: number;
  listingStatus?: string;
  imageUrl?: string;
  productlineId?: number;
  benchmarkPrice?: number;
  listingQuality?: number;
  stockQuantity?: number;
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

export interface SellerCatalogProvider {
  listOwnOffers(): Promise<SellerCatalogOffer[]>;
}

export function isSellerCatalogProvider(
  provider: unknown
): provider is SellerCatalogProvider {
  return (
    typeof provider === "object" &&
    provider !== null &&
    "listOwnOffers" in provider &&
    typeof provider.listOwnOffers === "function"
  );
}

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
