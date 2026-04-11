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

  it("loads official Marketplace API defaults when optional env values are absent", () => {
    const config = loadTakealotSellerApiConfig({
      TAKEALOT_SELLER_API_KEY: "seller-api-key"
    });

    expect(config).toMatchObject({
      apiKey: "seller-api-key",
      baseUrl: "https://marketplace-api.takealot.com/v1",
      authHeaderName: "X-API-Key",
      ownListingPathTemplate: "/offers/by_sku/{sellerSku}"
    });
    expect(config.authHeaderPrefix).toBeUndefined();
  });

  it("builds official Marketplace API auth headers by default", () => {
    const provider = new TakealotSellerApiProvider({
      apiKey: "seller-api-key"
    });

    expect(provider.buildAuthHeaders()).toEqual({
      "Content-Type": "application/json",
      "X-API-Key": "seller-api-key"
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

  it("normalizes official Marketplace offer payloads and aggregates seller warehouse stock", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          offer_id: 123456,
          sku: "SKU-ABC123",
          selling_price: 345,
          status: "buyable",
          updated_at: "2026-04-11T08:00:00+02:00",
          seller_warehouse_stock: [
            { seller_warehouse_id: 1, quantity_available: 4 },
            { seller_warehouse_id: 2, quantity_available: 6 }
          ]
        };
      }
    }));
    const provider = new TakealotSellerApiProvider({
      apiKey: "seller-api-key",
      fetchImpl
    });

    const listing = await provider.fetchOwnListing({
      ...seedProducts[0]!,
      sellerSku: "SKU-ABC123"
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://marketplace-api.takealot.com/v1/offers/by_sku/SKU-ABC123",
      expect.objectContaining({
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": "seller-api-key"
        }
      })
    );
    expect(listing).toMatchObject({
      currentPrice: 345,
      sellerSku: "SKU-ABC123",
      stockQuantity: 10,
      listingStatus: "buyable",
      capturedAt: "2026-04-11T08:00:00+02:00"
    });
  });

  it("issues a live Marketplace API PATCH by sku when dry-run is disabled", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          selling_price: 233
        };
      }
    }));
    const provider = new TakealotSellerApiProvider({
      apiKey: "seller-api-key",
      dryRun: false,
      fetchImpl
    });

    const result = await provider.applyPrice("sku-1", 233, {
      ...seedProducts[0]!,
      sellerSku: "SKU-ABC123"
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://marketplace-api.takealot.com/v1/offers/by_sku/SKU-ABC123",
      expect.objectContaining({
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": "seller-api-key"
        },
        body: JSON.stringify({
          selling_price: 233
        })
      })
    );
    expect(result).toMatchObject({
      appliedPrice: 233,
      mode: "live"
    });
  });

  it("lists Marketplace offers for the seller catalog and normalizes offer metadata", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          items: [
            {
              offer_id: 123456,
              tsin_id: 23456789,
              sku: "SKU-ABC123",
              title: "7-inch Kids Tablet Android Tabletsg 1GB 16GB Children's Education Learnin - Blue",
              selling_price: 833,
              status: "buyable",
              image_url: "https://images.takealot.com/offer-123456.jpg",
              productline_id: 98314826,
              benchmark_price: 838,
              listing_quality: 85,
              seller_warehouse_stock: [
                { seller_warehouse_id: 1, quantity_available: 4 },
                { seller_warehouse_id: 2, quantity_available: 6 }
              ]
            }
          ],
          limit: 100
        };
      }
    }));
    const provider = new TakealotSellerApiProvider({
      apiKey: "seller-api-key",
      fetchImpl
    });

    const offers = await provider.listOwnOffers();

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("https://marketplace-api.takealot.com/v1/offers"),
      expect.objectContaining({
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": "seller-api-key"
        }
      })
    );
    expect(offers).toEqual([
      {
        offerId: 123456,
        tsinId: 23456789,
        sellerSku: "SKU-ABC123",
        title: "7-inch Kids Tablet Android Tabletsg 1GB 16GB Children's Education Learnin - Blue",
        currentPrice: 833,
        listingStatus: "buyable",
        imageUrl: "https://images.takealot.com/offer-123456.jpg",
        productlineId: 98314826,
        benchmarkPrice: 838,
        listingQuality: 85,
        stockQuantity: 10
      }
    ]);
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
      baseUrlSource: "official-default",
      dryRun: true,
      canAttemptLiveWrites: false,
      canReadOwnListings: true,
      canReadMarketIntelligence: false
    });
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
      canAttemptLiveWrites: true
    });
    expect(readiness.recommendedActions).toContain(
      "先用单个 SKU 验证 Marketplace API live PATCH，再放大到批量调价。"
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
