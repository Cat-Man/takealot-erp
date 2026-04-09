import type { MarketOffer, ProductMonitor } from "@/core/types";
import type {
  ApplyPriceResult,
  MarketplaceProvider,
  OwnListingSnapshot
} from "./marketplace";

export type TakealotBrowserConfig = {
  profileDir: string;
  publicProductPriceSelector: string;
  publicOfferSellerSelector: string;
  publicOfferPriceSelector: string;
  sellerPriceInputSelector: string;
  sellerSaveButtonSelector: string;
};

function createMissingConfigError(): Error {
  return new Error(
    "Takealot browser provider requires a persistent logged-in browser profile and verified selectors. Cloudflare and seller authentication prevent blind automation."
  );
}

export class TakealotBrowserProvider implements MarketplaceProvider {
  constructor(private readonly config?: Partial<TakealotBrowserConfig>) {}

  async fetchOwnListing(
    _product: ProductMonitor
  ): Promise<OwnListingSnapshot> {
    if (!this.config?.profileDir) {
      throw createMissingConfigError();
    }

    throw createMissingConfigError();
  }

  async fetchOffers(_product: ProductMonitor): Promise<MarketOffer[]> {
    if (!this.config?.profileDir) {
      throw createMissingConfigError();
    }

    throw createMissingConfigError();
  }

  async applyPrice(
    _productId: string,
    _newPrice: number,
    _product: ProductMonitor
  ): Promise<ApplyPriceResult> {
    if (!this.config?.profileDir) {
      throw createMissingConfigError();
    }

    throw createMissingConfigError();
  }
}
