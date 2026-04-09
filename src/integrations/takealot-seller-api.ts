import type { MarketOffer, ProductMonitor } from "@/core/types";
import type {
  ApplyPriceResult,
  MarketplaceProvider,
  OwnListingSnapshot
} from "./marketplace";

export type TakealotSellerApiTransportRequest = {
  operation: "applyPrice";
  baseUrl: string;
  productId: string;
  price: number;
  headers: Record<string, string>;
};

export type TakealotSellerApiConfig = {
  apiKey: string;
  baseUrl?: string;
  dryRun?: boolean;
  transport?: (
    request: TakealotSellerApiTransportRequest
  ) => Promise<unknown> | unknown;
};

type EnvLike = Record<string, string | undefined>;

const DEFAULT_BASE_URL = "https://seller-api.takealot.local";

function createMissingApiKeyError(): Error {
  return new Error(
    "Missing TAKEALOT_SELLER_API_KEY for Takealot Seller API provider."
  );
}

export function loadTakealotSellerApiConfig(
  env: EnvLike
): TakealotSellerApiConfig {
  const apiKey = env.TAKEALOT_SELLER_API_KEY?.trim();

  if (!apiKey) {
    throw createMissingApiKeyError();
  }

  return {
    apiKey,
    baseUrl: env.TAKEALOT_SELLER_API_BASE_URL?.trim() || DEFAULT_BASE_URL,
    dryRun: env.TAKEALOT_SELLER_API_DRY_RUN !== "false"
  };
}

export class TakealotSellerApiProvider implements MarketplaceProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly dryRun: boolean;
  private readonly transport?: TakealotSellerApiConfig["transport"];

  constructor(config: TakealotSellerApiConfig) {
    if (!config.apiKey.trim()) {
      throw createMissingApiKeyError();
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.dryRun = config.dryRun ?? false;
    this.transport = config.transport;
  }

  buildAuthHeaders(): Record<string, string> {
    // Placeholder only until the official Seller API auth contract is verified.
    return {
      "Content-Type": "application/json",
      "X-Takealot-Auth-Placeholder": this.apiKey
    };
  }

  async fetchOwnListing(_product: ProductMonitor): Promise<OwnListingSnapshot> {
    throw new Error(
      "Takealot Seller API own-listing endpoint is not wired yet. Verify the official seller contract before enabling reads."
    );
  }

  async fetchOffers(_product: ProductMonitor): Promise<MarketOffer[]> {
    throw new Error(
      "Takealot Seller API market intelligence endpoint is not wired yet. Use verified seller data or an approved secondary source."
    );
  }

  async applyPrice(
    productId: string,
    newPrice: number,
    _product: ProductMonitor
  ): Promise<ApplyPriceResult> {
    if (this.dryRun) {
      return {
        appliedPrice: newPrice,
        appliedAt: new Date().toISOString(),
        mode: "dry-run"
      };
    }

    if (!this.transport) {
      throw new Error(
        "Takealot Seller API write endpoint is not configured. Keep dry-run enabled until the official protocol is verified."
      );
    }

    await this.transport({
      operation: "applyPrice",
      baseUrl: this.baseUrl,
      productId,
      price: newPrice,
      headers: this.buildAuthHeaders()
    });

    return {
      appliedPrice: newPrice,
      appliedAt: new Date().toISOString(),
      mode: "live"
    };
  }
}
