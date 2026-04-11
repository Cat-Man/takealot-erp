import { describe, expect, it, vi } from "vitest";
import { seedProducts } from "@/lib/fixtures";
import {
  TakealotSellerApiProvider,
  getTakealotSellerApiReadiness,
  loadTakealotSellerApiConfig
} from "./takealot-seller-api";

describe("TakealotSellerApiProvider", () => {
  it("throws a clear error when the API key is missing", () => {
    expect(() => loadTakealotSellerApiConfig({})).toThrow(
      "Missing TAKEALOT_SELLER_API_KEY for Takealot Seller API provider."
    );
  });

  it("loads real own-listing read settings from env", () => {
    const config = loadTakealotSellerApiConfig({
      TAKEALOT_SELLER_API_KEY: "seller-api-key",
      TAKEALOT_SELLER_API_BASE_URL: "https://seller-api.takealot.example",
      TAKEALOT_SELLER_API_AUTH_HEADER_NAME: "Authorization",
      TAKEALOT_SELLER_API_AUTH_HEADER_PREFIX: "Bearer",
      TAKEALOT_SELLER_API_OWN_LISTING_PATH_TEMPLATE: "/offers/{productId}"
    });

    expect(config).toMatchObject({
      apiKey: "seller-api-key",
      baseUrl: "https://seller-api.takealot.example",
      authHeaderName: "Authorization",
      authHeaderPrefix: "Bearer",
      ownListingPathTemplate: "/offers/{productId}"
    });
  });

  it("builds placeholder auth headers without pretending the protocol is verified", () => {
    const provider = new TakealotSellerApiProvider({
      apiKey: "seller-api-key"
    });

    expect(provider.buildAuthHeaders()).toEqual({
      "Content-Type": "application/json",
      "X-Takealot-Auth-Placeholder": "seller-api-key"
    });
  });

  it("blocks real writes when dry-run mode is enabled", async () => {
    const transport = vi.fn();
    const provider = new TakealotSellerApiProvider({
      apiKey: "seller-api-key",
      dryRun: true,
      transport
    });

    const result = await provider.applyPrice(
      seedProducts[0]!.id,
      233,
      seedProducts[0]!
    );

    expect(result).toMatchObject({
      appliedPrice: 233,
      mode: "dry-run"
    });
    expect(transport).not.toHaveBeenCalled();
  });

  it("fetches a normalized own listing through an injected transport without hardcoding protocol details", async () => {
    const transport = vi.fn(async (request) => {
      expect((request as { operation: string }).operation).toBe("fetchOwnListing");

      return {
        sellerName: "My Store",
        currentPrice: 249,
        currency: "ZAR",
        capturedAt: "2026-04-10T02:00:00.000Z",
        sellerSku: "TAKEALOT-SKU-1",
        stockQuantity: 8,
        listingStatus: "active"
      };
    });
    const provider = new TakealotSellerApiProvider({
      apiKey: "seller-api-key",
      dryRun: true,
      transport
    });

    const listing = await provider.fetchOwnListing(seedProducts[0]!);

    expect(listing).toMatchObject({
      sellerName: "My Store",
      currentPrice: 249,
      currency: "ZAR",
      sellerSku: "TAKEALOT-SKU-1",
      stockQuantity: 8,
      listingStatus: "active"
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("fetches a normalized own listing through real fetch when read config is present", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          data: {
            seller_name: "My Store",
            price: 249,
            currency: "ZAR",
            sku: "TAKEALOT-SKU-1",
            quantity: 8,
            status: "active"
          }
        };
      }
    }));
    const provider = new TakealotSellerApiProvider({
      apiKey: "seller-api-key",
      baseUrl: "https://seller-api.takealot.example",
      authHeaderName: "Authorization",
      authHeaderPrefix: "Bearer",
      ownListingPathTemplate: "/offers/{productId}",
      fetchImpl
    });

    const listing = await provider.fetchOwnListing(seedProducts[0]!);

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://seller-api.takealot.example/offers/sku-1",
      expect.objectContaining({
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer seller-api-key"
        }
      })
    );
    expect(listing).toMatchObject({
      sellerName: "My Store",
      currentPrice: 249,
      currency: "ZAR",
      sellerSku: "TAKEALOT-SKU-1",
      stockQuantity: 8,
      listingStatus: "active"
    });
  });

  it("prefers configured own-listing response paths when the payload uses non-default field names", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          data: {
            attributes: {
              merchant: {
                display_name: "Mapped Store"
              },
              pricing: {
                current: {
                  amount: "259.00",
                  currency: "ZAR"
                }
              },
              seller: {
                sku_code: "ALT-SKU-1"
              },
              inventory: {
                available_to_sell: "12"
              },
              lifecycle: {
                state_label: "buyable"
              },
              synced_at: "2026-04-11T02:00:00.000Z"
            }
          }
        };
      }
    }));
    const provider = new TakealotSellerApiProvider({
      apiKey: "seller-api-key",
      baseUrl: "https://seller-api.takealot.example",
      authHeaderName: "Authorization",
      authHeaderPrefix: "Bearer",
      ownListingPathTemplate: "/offers/{productId}",
      ownListingSellerNamePath: "attributes.merchant.display_name",
      ownListingCurrentPricePath: "attributes.pricing.current.amount",
      ownListingCurrencyPath: "attributes.pricing.current.currency",
      ownListingCapturedAtPath: "attributes.synced_at",
      ownListingSellerSkuPath: "attributes.seller.sku_code",
      ownListingStockQuantityPath: "attributes.inventory.available_to_sell",
      ownListingListingStatusPath: "attributes.lifecycle.state_label",
      fetchImpl
    });

    const listing = await provider.fetchOwnListing(seedProducts[0]!);

    expect(listing).toMatchObject({
      sellerName: "Mapped Store",
      currentPrice: 259,
      currency: "ZAR",
      capturedAt: "2026-04-11T02:00:00.000Z",
      sellerSku: "ALT-SKU-1",
      stockQuantity: 12,
      listingStatus: "buyable"
    });
  });

  it("reports missing_api_key when no Seller API credentials are configured", () => {
    const readiness = getTakealotSellerApiReadiness({});

    expect(readiness.status).toBe("missing_api_key");
    expect(readiness.apiKeyPresent).toBe(false);
    expect(readiness.canAttemptLiveWrites).toBe(false);
    expect(readiness.recommendedActions).toContain(
      "配置 TAKEALOT_SELLER_API_KEY。"
    );
  });

  it("reports dry_run_only when the API key exists but the provider still uses guarded defaults", () => {
    const readiness = getTakealotSellerApiReadiness({
      TAKEALOT_SELLER_API_KEY: "seller-api-key"
    });

    expect(readiness).toMatchObject({
      status: "dry_run_only",
      apiKeyPresent: true,
      baseUrlSource: "default-placeholder",
      dryRun: true,
      canAttemptLiveWrites: false,
      canReadOwnListings: false,
      canReadMarketIntelligence: false
    });
    expect(readiness.recommendedActions).toContain(
      "配置 TAKEALOT_SELLER_API_BASE_URL 为真实 Seller API 基地址。"
    );
  });

  it("reports a guarded live configuration when custom base URL is set but the contract remains unverified", () => {
    const readiness = getTakealotSellerApiReadiness({
      TAKEALOT_SELLER_API_KEY: "seller-api-key",
      TAKEALOT_SELLER_API_BASE_URL: "https://seller-api.takealot.example",
      TAKEALOT_SELLER_API_DRY_RUN: "false"
    });

    expect(readiness).toMatchObject({
      status: "live_requested_but_guarded",
      apiKeyPresent: true,
      baseUrl: "https://seller-api.takealot.example",
      baseUrlSource: "custom-env",
      dryRun: false,
      canAttemptLiveWrites: false
    });
    expect(readiness.recommendedActions).toContain(
      "确认官方鉴权与写价协议；当前代码仍使用占位鉴权头，不能宣称已接通真实写操作。"
    );
  });

  it("reports own-listing reads as available only when verified read config is present", () => {
    const readiness = getTakealotSellerApiReadiness({
      TAKEALOT_SELLER_API_KEY: "seller-api-key",
      TAKEALOT_SELLER_API_BASE_URL: "https://seller-api.takealot.example",
      TAKEALOT_SELLER_API_AUTH_HEADER_NAME: "Authorization",
      TAKEALOT_SELLER_API_AUTH_HEADER_PREFIX: "Bearer",
      TAKEALOT_SELLER_API_OWN_LISTING_PATH_TEMPLATE: "/offers/{productId}"
    });

    expect(readiness).toMatchObject({
      status: "dry_run_only",
      apiKeyPresent: true,
      baseUrlSource: "custom-env",
      authMode: "custom-header",
      canReadOwnListings: true,
      canAttemptLiveWrites: false
    });
  });
});
