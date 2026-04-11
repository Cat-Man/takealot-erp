import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { GET as getReadiness } from "../readiness/route";
import { GET as getSettings, PATCH as updateSettings } from "./route";

describe("takealot seller api settings route", () => {
  const previousSettingsFilePath = process.env.TAKEALOT_SELLER_API_SETTINGS_FILE_PATH;
  const previousApiKey = process.env.TAKEALOT_SELLER_API_KEY;
  const previousBaseUrl = process.env.TAKEALOT_SELLER_API_BASE_URL;
  const previousDryRun = process.env.TAKEALOT_SELLER_API_DRY_RUN;
  const previousAuthHeaderName = process.env.TAKEALOT_SELLER_API_AUTH_HEADER_NAME;
  const previousAuthHeaderPrefix = process.env.TAKEALOT_SELLER_API_AUTH_HEADER_PREFIX;
  const previousOwnListingPathTemplate =
    process.env.TAKEALOT_SELLER_API_OWN_LISTING_PATH_TEMPLATE;

  afterEach(() => {
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
  });

  it("persists masked seller api settings and updates readiness", async () => {
    const settingsFilePath = join(
      mkdtempSync(join(tmpdir(), "takealot-seller-api-settings-")),
      "settings.json"
    );

    process.env.TAKEALOT_SELLER_API_SETTINGS_FILE_PATH = settingsFilePath;
    delete process.env.TAKEALOT_SELLER_API_KEY;
    delete process.env.TAKEALOT_SELLER_API_BASE_URL;
    delete process.env.TAKEALOT_SELLER_API_DRY_RUN;
    delete process.env.TAKEALOT_SELLER_API_AUTH_HEADER_NAME;
    delete process.env.TAKEALOT_SELLER_API_AUTH_HEADER_PREFIX;
    delete process.env.TAKEALOT_SELLER_API_OWN_LISTING_PATH_TEMPLATE;

    const patchResponse = await updateSettings(
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
          ownListingPathTemplate: "/offers/{productId}",
          ownListingSellerNamePath: "attributes.merchant.display_name",
          ownListingCurrentPricePath: "attributes.pricing.current.amount",
          ownListingCurrencyPath: "attributes.pricing.current.currency",
          ownListingCapturedAtPath: "attributes.synced_at",
          ownListingSellerSkuPath: "attributes.seller.sku_code",
          ownListingStockQuantityPath: "attributes.inventory.available_to_sell",
          ownListingListingStatusPath: "attributes.lifecycle.state_label"
        })
      })
    );
    const patchPayload = await patchResponse.json();
    const getResponse = await getSettings();
    const getPayload = await getResponse.json();
    const readinessResponse = await getReadiness();
    const readinessPayload = await readinessResponse.json();
    const persisted = JSON.parse(readFileSync(settingsFilePath, "utf8"));

    expect(patchPayload.settings).toMatchObject({
      apiKeyConfigured: true,
      baseUrl: "https://seller-api.takealot.example",
      dryRun: true,
      authHeaderName: "Authorization",
      authHeaderPrefix: "Bearer",
      ownListingPathTemplate: "/offers/{productId}",
      ownListingSellerNamePath: "attributes.merchant.display_name",
      ownListingCurrentPricePath: "attributes.pricing.current.amount",
      ownListingCurrencyPath: "attributes.pricing.current.currency",
      ownListingCapturedAtPath: "attributes.synced_at",
      ownListingSellerSkuPath: "attributes.seller.sku_code",
      ownListingStockQuantityPath: "attributes.inventory.available_to_sell",
      ownListingListingStatusPath: "attributes.lifecycle.state_label"
    });
    expect(patchPayload.settings.apiKeyPreview).toEqual(expect.stringContaining("key"));
    expect(getPayload.settings).toMatchObject({
      apiKeyConfigured: true,
      baseUrl: "https://seller-api.takealot.example"
    });
    expect(readinessPayload).toMatchObject({
      apiKeyPresent: true,
      baseUrlSource: "custom-env",
      canReadOwnListings: true,
      authMode: "custom-header"
    });
    expect(persisted).toMatchObject({
      apiKey: "seller-api-key",
      baseUrl: "https://seller-api.takealot.example",
      dryRun: true,
      authHeaderName: "Authorization",
      authHeaderPrefix: "Bearer",
      ownListingPathTemplate: "/offers/{productId}",
      ownListingSellerNamePath: "attributes.merchant.display_name",
      ownListingCurrentPricePath: "attributes.pricing.current.amount",
      ownListingCurrencyPath: "attributes.pricing.current.currency",
      ownListingCapturedAtPath: "attributes.synced_at",
      ownListingSellerSkuPath: "attributes.seller.sku_code",
      ownListingStockQuantityPath: "attributes.inventory.available_to_sell",
      ownListingListingStatusPath: "attributes.lifecycle.state_label"
    });
  });
});
