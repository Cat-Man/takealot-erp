import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMockProvider } from "@/integrations/mock-provider";
import { seedProducts } from "@/lib/fixtures";
import { setProductServiceOverride } from "@/lib/runtime";
import { ProductService } from "@/lib/service";
import { JsonProductStore } from "@/lib/store";
import { GET as listProducts } from "./route";
import { POST as applyPrice } from "./[id]/apply/route";
import { PATCH as updateManualMarket } from "./[id]/manual-market/route";
import { PATCH as updateProviders } from "./[id]/providers/route";
import { POST as refreshProduct } from "./[id]/refresh/route";
import { POST as syncOwnListing } from "./[id]/sync-own-listing/route";
import { PATCH as updateRule } from "./[id]/rule/route";
import { PATCH as updateSettings } from "./[id]/settings/route";
import { POST as refreshActiveProducts } from "./refresh-active/route";
import { POST as syncActiveOwnListings } from "./sync-own-listings-active/route";
import { GET as getSellerApiReadiness } from "../integrations/takealot-seller-api/readiness/route";
import { PATCH as updateSellerApiSettings } from "../integrations/takealot-seller-api/settings/route";

describe("products routes", () => {
  let service: ProductService;

  beforeEach(async () => {
    const filePath = join(mkdtempSync(join(tmpdir(), "takealot-routes-")), "db.json");
    service = new ProductService({
      store: new JsonProductStore(filePath),
      providers: {
        mock: createMockProvider()
      }
    });

    await service.listProducts();
    setProductServiceOverride(service);
  });

  afterEach(() => {
    setProductServiceOverride(null);
  });

  it("lists products", async () => {
    await service.refreshProduct("sku-1");

    const response = await listProducts();
    const payload = await response.json();

    expect(payload.products).toHaveLength(seedProducts.length);
    expect(payload.executions).toEqual([]);
    expect(payload.marketSnapshots).toHaveLength(1);
    expect(payload.marketSnapshots[0]).toMatchObject({
      productId: "sku-1",
      source: "refresh"
    });
  });

  it("updates repricing rules", async () => {
    const response = await updateRule(
      new Request("http://localhost/api/products/sku-1/rule", {
        method: "PATCH",
        body: JSON.stringify({
          undercutBy: 2,
          floorPrice: 212
        }),
        headers: {
          "content-type": "application/json"
        }
      }),
      {
        params: Promise.resolve({
          id: "sku-1"
        })
      }
    );
    const payload = await response.json();

    expect(payload.product.rule.undercutBy).toBe(2);
    expect(payload.product.rule.floorPrice).toBe(212);
  });

  it("updates seller and market providers for a product", async () => {
    const response = await updateProviders(
      new Request("http://localhost/api/products/sku-1/providers", {
        method: "PATCH",
        body: JSON.stringify({
          sellerProvider: "takealot-seller-api",
          marketProvider: "takealot-browser"
        }),
        headers: {
          "content-type": "application/json"
        }
      }),
      {
        params: Promise.resolve({
          id: "sku-1"
        })
      }
    );
    const payload = await response.json();

    expect(payload.product.sellerProvider).toBe("takealot-seller-api");
    expect(payload.product.marketProvider).toBe("takealot-browser");
  });

  it("updates active monitoring settings for a product", async () => {
    const response = await updateSettings(
      new Request("http://localhost/api/products/sku-1/settings", {
        method: "PATCH",
        body: JSON.stringify({
          active: false
        }),
        headers: {
          "content-type": "application/json"
        }
      }),
      {
        params: Promise.resolve({
          id: "sku-1"
        })
      }
    );
    const payload = await response.json();

    expect(payload.product.active).toBe(false);
  });

  it("stores a manual market snapshot and returns a refreshed preview", async () => {
    const response = await updateManualMarket(
      new Request("http://localhost/api/products/sku-1/manual-market", {
        method: "PATCH",
        body: JSON.stringify({
          sellerName: "Manual Seller",
          price: 235
        }),
        headers: {
          "content-type": "application/json"
        }
      }),
      {
        params: Promise.resolve({
          id: "sku-1"
        })
      }
    );
    const payload = await response.json();

    expect(payload.product.marketProvider).toBe("manual-import");
    expect(payload.product.manualMarketSnapshot).toMatchObject({
      competitor: {
        sellerName: "Manual Seller",
        price: 235
      }
    });
    expect(payload.preview).toMatchObject({
      suggestedPrice: 230,
      matchedCompetitor: {
        sellerName: "Manual Seller",
        price: 235
      }
    });
  });

  it("refreshes market data and returns a preview", async () => {
    const response = await refreshProduct(
      new Request("http://localhost/api/products/sku-1/refresh", {
        method: "POST"
      }),
      {
        params: Promise.resolve({
          id: "sku-1"
        })
      }
    );
    const payload = await response.json();

    expect(payload.preview).toMatchObject({
      suggestedPrice: 233,
      delta: -16
    });
    expect(payload.offers[0]).toMatchObject({
      sellerName: "Cable Shop",
      price: 238
    });
  });

  it("syncs own listing data and returns updated seller-side fields", async () => {
    const response = await syncOwnListing(
      new Request("http://localhost/api/products/sku-1/sync-own-listing", {
        method: "POST"
      }),
      {
        params: Promise.resolve({
          id: "sku-1"
        })
      }
    );
    const payload = await response.json();

    expect(payload.product).toMatchObject({
      id: "sku-1",
      sellerSku: "SKU-1",
      stockQuantity: 14,
      listingStatus: "active"
    });
    expect(payload.ownListing).toMatchObject({
      sellerSku: "SKU-1",
      stockQuantity: 14,
      listingStatus: "active"
    });
  });

  it("refreshes only active products in batch mode", async () => {
    await updateSettings(
      new Request("http://localhost/api/products/sku-2/settings", {
        method: "PATCH",
        body: JSON.stringify({
          active: false
        }),
        headers: {
          "content-type": "application/json"
        }
      }),
      {
        params: Promise.resolve({
          id: "sku-2"
        })
      }
    );

    const response = await refreshActiveProducts(
      new Request("http://localhost/api/products/refresh-active", {
        method: "POST"
      })
    );
    const payload = await response.json();

    expect(payload.results).toHaveLength(1);
    expect(payload.results[0].product.id).toBe("sku-1");
    expect(payload.summary).toMatchObject({
      requestedCount: 2,
      refreshedCount: 1,
      skippedCount: 1
    });
  });

  it("syncs own listing data only for active products in batch mode", async () => {
    await updateSettings(
      new Request("http://localhost/api/products/sku-2/settings", {
        method: "PATCH",
        body: JSON.stringify({
          active: false
        }),
        headers: {
          "content-type": "application/json"
        }
      }),
      {
        params: Promise.resolve({
          id: "sku-2"
        })
      }
    );

    const response = await syncActiveOwnListings(
      new Request("http://localhost/api/products/sync-own-listings-active", {
        method: "POST"
      })
    );
    const payload = await response.json();

    expect(payload.summary).toMatchObject({
      requestedCount: 2,
      syncedCount: 1,
      skippedCount: 1
    });
    expect(payload.results).toHaveLength(1);
    expect(payload.results[0].product).toMatchObject({
      id: "sku-1",
      sellerSku: "SKU-1",
      stockQuantity: 14
    });
  });

  it("applies the suggested price and returns an execution record", async () => {
    const response = await applyPrice(
      new Request("http://localhost/api/products/sku-1/apply", {
        method: "POST"
      }),
      {
        params: Promise.resolve({
          id: "sku-1"
        })
      }
    );
    const payload = await response.json();

    expect(payload.product.currentPrice).toBe(233);
    expect(payload.execution).toMatchObject({
      status: "applied",
      appliedPrice: 233
    });
  });

  it("returns a guarded Seller API readiness report from the integration route", async () => {
    const previousApiKey = process.env.TAKEALOT_SELLER_API_KEY;
    const previousBaseUrl = process.env.TAKEALOT_SELLER_API_BASE_URL;
    const previousDryRun = process.env.TAKEALOT_SELLER_API_DRY_RUN;

    delete process.env.TAKEALOT_SELLER_API_KEY;
    delete process.env.TAKEALOT_SELLER_API_BASE_URL;
    delete process.env.TAKEALOT_SELLER_API_DRY_RUN;

    try {
      const response = await getSellerApiReadiness();
      const payload = await response.json();

      expect(payload).toMatchObject({
        status: "missing_api_key",
        apiKeyPresent: false,
        baseUrlSource: "default-placeholder",
        dryRun: true,
        canAttemptLiveWrites: false
      });
    } finally {
      if (previousApiKey === undefined) {
        delete process.env.TAKEALOT_SELLER_API_KEY;
      } else {
        process.env.TAKEALOT_SELLER_API_KEY = previousApiKey;
      }

      if (previousBaseUrl === undefined) {
        delete process.env.TAKEALOT_SELLER_API_BASE_URL;
      } else {
        process.env.TAKEALOT_SELLER_API_BASE_URL = previousBaseUrl;
      }

      if (previousDryRun === undefined) {
        delete process.env.TAKEALOT_SELLER_API_DRY_RUN;
      } else {
        process.env.TAKEALOT_SELLER_API_DRY_RUN = previousDryRun;
      }
    }
  });

  it("reports own-listing reads as available when Seller API read env is configured", async () => {
    const previousApiKey = process.env.TAKEALOT_SELLER_API_KEY;
    const previousBaseUrl = process.env.TAKEALOT_SELLER_API_BASE_URL;
    const previousDryRun = process.env.TAKEALOT_SELLER_API_DRY_RUN;
    const previousAuthHeaderName =
      process.env.TAKEALOT_SELLER_API_AUTH_HEADER_NAME;
    const previousAuthHeaderPrefix =
      process.env.TAKEALOT_SELLER_API_AUTH_HEADER_PREFIX;
    const previousOwnListingPathTemplate =
      process.env.TAKEALOT_SELLER_API_OWN_LISTING_PATH_TEMPLATE;

    process.env.TAKEALOT_SELLER_API_KEY = "seller-api-key";
    process.env.TAKEALOT_SELLER_API_BASE_URL = "https://seller-api.takealot.example";
    process.env.TAKEALOT_SELLER_API_DRY_RUN = "true";
    process.env.TAKEALOT_SELLER_API_AUTH_HEADER_NAME = "Authorization";
    process.env.TAKEALOT_SELLER_API_AUTH_HEADER_PREFIX = "Bearer";
    process.env.TAKEALOT_SELLER_API_OWN_LISTING_PATH_TEMPLATE = "/offers/{productId}";

    try {
      const response = await getSellerApiReadiness();
      const payload = await response.json();

      expect(payload).toMatchObject({
        status: "dry_run_only",
        apiKeyPresent: true,
        baseUrlSource: "custom-env",
        authMode: "custom-header",
        canReadOwnListings: true,
        canAttemptLiveWrites: false
      });
    } finally {
      if (previousApiKey === undefined) {
        delete process.env.TAKEALOT_SELLER_API_KEY;
      } else {
        process.env.TAKEALOT_SELLER_API_KEY = previousApiKey;
      }

      if (previousBaseUrl === undefined) {
        delete process.env.TAKEALOT_SELLER_API_BASE_URL;
      } else {
        process.env.TAKEALOT_SELLER_API_BASE_URL = previousBaseUrl;
      }

      if (previousDryRun === undefined) {
        delete process.env.TAKEALOT_SELLER_API_DRY_RUN;
      } else {
        process.env.TAKEALOT_SELLER_API_DRY_RUN = previousDryRun;
      }

      if (previousAuthHeaderName === undefined) {
        delete process.env.TAKEALOT_SELLER_API_AUTH_HEADER_NAME;
      } else {
        process.env.TAKEALOT_SELLER_API_AUTH_HEADER_NAME = previousAuthHeaderName;
      }

      if (previousAuthHeaderPrefix === undefined) {
        delete process.env.TAKEALOT_SELLER_API_AUTH_HEADER_PREFIX;
      } else {
        process.env.TAKEALOT_SELLER_API_AUTH_HEADER_PREFIX = previousAuthHeaderPrefix;
      }

      if (previousOwnListingPathTemplate === undefined) {
        delete process.env.TAKEALOT_SELLER_API_OWN_LISTING_PATH_TEMPLATE;
      } else {
        process.env.TAKEALOT_SELLER_API_OWN_LISTING_PATH_TEMPLATE =
          previousOwnListingPathTemplate;
      }
    }
  });

  it("reports own-listing reads as available when gui-saved Seller API settings exist", async () => {
    const previousSettingsFilePath = process.env.TAKEALOT_SELLER_API_SETTINGS_FILE_PATH;
    const previousApiKey = process.env.TAKEALOT_SELLER_API_KEY;
    const previousBaseUrl = process.env.TAKEALOT_SELLER_API_BASE_URL;
    const previousDryRun = process.env.TAKEALOT_SELLER_API_DRY_RUN;
    const previousAuthHeaderName =
      process.env.TAKEALOT_SELLER_API_AUTH_HEADER_NAME;
    const previousAuthHeaderPrefix =
      process.env.TAKEALOT_SELLER_API_AUTH_HEADER_PREFIX;
    const previousOwnListingPathTemplate =
      process.env.TAKEALOT_SELLER_API_OWN_LISTING_PATH_TEMPLATE;

    process.env.TAKEALOT_SELLER_API_SETTINGS_FILE_PATH = join(
      mkdtempSync(join(tmpdir(), "takealot-seller-api-gui-")),
      "settings.json"
    );
    delete process.env.TAKEALOT_SELLER_API_KEY;
    delete process.env.TAKEALOT_SELLER_API_BASE_URL;
    delete process.env.TAKEALOT_SELLER_API_DRY_RUN;
    delete process.env.TAKEALOT_SELLER_API_AUTH_HEADER_NAME;
    delete process.env.TAKEALOT_SELLER_API_AUTH_HEADER_PREFIX;
    delete process.env.TAKEALOT_SELLER_API_OWN_LISTING_PATH_TEMPLATE;

    try {
      await updateSellerApiSettings(
        new Request("http://localhost/api/integrations/takealot-seller-api/settings", {
          method: "PATCH",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            apiKey: "seller-api-key",
            baseUrl: "https://seller-api.takealot.example",
            dryRun: true,
            authHeaderName: "Authorization",
            authHeaderPrefix: "Bearer",
            ownListingPathTemplate: "/offers/{productId}"
          })
        })
      );

      const response = await getSellerApiReadiness();
      const payload = await response.json();

      expect(payload).toMatchObject({
        status: "dry_run_only",
        apiKeyPresent: true,
        baseUrlSource: "custom-env",
        authMode: "custom-header",
        canReadOwnListings: true,
        canAttemptLiveWrites: false
      });
    } finally {
      if (previousSettingsFilePath === undefined) {
        delete process.env.TAKEALOT_SELLER_API_SETTINGS_FILE_PATH;
      } else {
        process.env.TAKEALOT_SELLER_API_SETTINGS_FILE_PATH = previousSettingsFilePath;
      }

      if (previousApiKey === undefined) {
        delete process.env.TAKEALOT_SELLER_API_KEY;
      } else {
        process.env.TAKEALOT_SELLER_API_KEY = previousApiKey;
      }

      if (previousBaseUrl === undefined) {
        delete process.env.TAKEALOT_SELLER_API_BASE_URL;
      } else {
        process.env.TAKEALOT_SELLER_API_BASE_URL = previousBaseUrl;
      }

      if (previousDryRun === undefined) {
        delete process.env.TAKEALOT_SELLER_API_DRY_RUN;
      } else {
        process.env.TAKEALOT_SELLER_API_DRY_RUN = previousDryRun;
      }

      if (previousAuthHeaderName === undefined) {
        delete process.env.TAKEALOT_SELLER_API_AUTH_HEADER_NAME;
      } else {
        process.env.TAKEALOT_SELLER_API_AUTH_HEADER_NAME = previousAuthHeaderName;
      }

      if (previousAuthHeaderPrefix === undefined) {
        delete process.env.TAKEALOT_SELLER_API_AUTH_HEADER_PREFIX;
      } else {
        process.env.TAKEALOT_SELLER_API_AUTH_HEADER_PREFIX = previousAuthHeaderPrefix;
      }

      if (previousOwnListingPathTemplate === undefined) {
        delete process.env.TAKEALOT_SELLER_API_OWN_LISTING_PATH_TEMPLATE;
      } else {
        process.env.TAKEALOT_SELLER_API_OWN_LISTING_PATH_TEMPLATE =
          previousOwnListingPathTemplate;
      }
    }
  });
});
