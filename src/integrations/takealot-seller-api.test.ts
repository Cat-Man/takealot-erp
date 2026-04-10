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
});
