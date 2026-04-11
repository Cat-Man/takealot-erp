import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { MarketSnapshot, PriceExecution, ProductMonitor } from "@/core/types";
import { Dashboard } from "./dashboard";

const products: ProductMonitor[] = [
  {
    id: "sku-1",
    title: "Anker USB-C Cable",
    productUrl: "https://www.takealot.com/product/sku-1",
    offerUrl: "https://sellers.takealot.com/offers/sku-1",
    provider: "mock",
    sellerProvider: "takealot-seller-api",
    marketProvider: "mock",
    ownSellerName: "My Store",
    currentPrice: 249,
    rule: {
      enabled: true,
      undercutBy: 5,
      floorPrice: 210,
      ceilingPrice: 280,
      costPrice: 170,
      minMargin: 20
    },
    lastPreview: {
      currentPrice: 249,
      suggestedPrice: 233,
      delta: -16,
      margin: 63,
      matchedCompetitor: {
        sellerName: "Cable Shop",
        price: 238,
        currency: "ZAR"
      },
      reason: "match_lowest_competitor",
      shouldUpdate: true
    },
    lastCheckedAt: "2026-04-09T03:00:00.000Z"
  }
];

const executions: PriceExecution[] = [
  {
    id: "exec-1",
    productId: "sku-1",
    productTitle: "Anker USB-C Cable",
    provider: "mock",
    previousPrice: 249,
    suggestedPrice: 233,
    status: "dry_run",
    reason: "match_lowest_competitor",
    margin: 63,
    matchedCompetitor: {
      sellerName: "Cable Shop",
      price: 238,
      currency: "ZAR"
    },
    executedAt: "2026-04-09T03:00:00.000Z"
  }
];

const snapshots: MarketSnapshot[] = [
  {
    id: "snapshot-1",
    productId: "sku-1",
    productTitle: "Anker USB-C Cable",
    marketProvider: "manual-import",
    offers: [
      {
        sellerName: "Manual Seller",
        price: 235,
        currency: "ZAR"
      }
    ],
    preview: {
      currentPrice: 249,
      suggestedPrice: 230,
      delta: -19,
      margin: 60,
      matchedCompetitor: {
        sellerName: "Manual Seller",
        price: 235,
        currency: "ZAR"
      },
      reason: "match_lowest_competitor",
      shouldUpdate: true
    },
    capturedAt: "2026-04-09T08:00:00.000Z",
    source: "manual-import"
  }
];

const sellerApiSettings = {
  settings: {
    apiKeyConfigured: true,
    apiKeyPreview: "*********-key",
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
  },
  readiness: {
    status: "dry_run_only",
    apiKeyPresent: true,
    baseUrl: "https://seller-api.takealot.example",
    baseUrlSource: "custom-env",
    dryRun: true,
    authMode: "custom-header",
    canAttemptLiveWrites: false,
    canReadOwnListings: true,
    canReadMarketIntelligence: false,
    checks: [],
    recommendedActions: []
  }
};

describe("Dashboard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders products and repricing actions", () => {
    render(
      <Dashboard
        initialProducts={products}
        initialExecutions={executions}
        initialMarketSnapshots={snapshots}
        initialSellerApiSettings={sellerApiSettings}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Anker USB-C Cable" })
    ).toBeInTheDocument();
    expect(screen.getByText("建议价 R233")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "刷新市场价" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "执行调价" })).toBeInTheDocument();
    expect(screen.getByText("最近执行")).toBeInTheDocument();
  });

  it("labels Seller API as the preferred real integration path", () => {
    render(
      <Dashboard
        initialProducts={products}
        initialExecutions={executions}
        initialMarketSnapshots={snapshots}
        initialSellerApiSettings={sellerApiSettings}
      />
    );

    expect(screen.getAllByText(/Seller API-first/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/browser fallback/i).length).toBeGreaterThan(0);
  });

  it("shows split providers and dry-run execution messaging", () => {
    render(
      <Dashboard
        initialProducts={products}
        initialExecutions={executions}
        initialMarketSnapshots={snapshots}
        initialSellerApiSettings={sellerApiSettings}
      />
    );

    expect(screen.getAllByText("卖家接入 takealot-seller-api").length).toBeGreaterThan(0);
    expect(screen.getAllByText("市场数据 mock").length).toBeGreaterThan(0);
    expect(screen.getAllByText("dry_run (模拟执行)").length).toBeGreaterThan(0);
  });

  it("shows manual market import controls and imported competitor summary", () => {
    render(
      <Dashboard
        initialProducts={[
          {
            ...products[0]!,
            marketProvider: "manual-import",
            manualMarketSnapshot: {
              competitor: {
                sellerName: "Manual Seller",
                price: 235,
                currency: "ZAR"
              },
              importedAt: "2026-04-09T08:00:00.000Z"
            }
          }
        ]}
        initialExecutions={executions}
        initialMarketSnapshots={snapshots}
        initialSellerApiSettings={sellerApiSettings}
      />
    );

    expect(
      screen.getAllByRole("button", { name: "保存手工最低价" }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("手工最低竞品 Manual Seller / R235").length
    ).toBeGreaterThan(0);
  });

  it("shows active monitoring controls, batch refresh action, and recent snapshots", () => {
    render(
      <Dashboard
        initialProducts={[
          {
            ...products[0]!,
            active: true
          }
        ]}
        initialExecutions={executions}
        initialMarketSnapshots={snapshots}
        initialSellerApiSettings={sellerApiSettings}
      />
    );

    expect(
      screen.getByRole("button", { name: "刷新 active 商品" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "同步 active 卖家数据" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "停用监控" })).toBeInTheDocument();
    expect(screen.getByText("监控中")).toBeInTheDocument();
    expect(screen.getByText("最近快照")).toBeInTheDocument();
    expect(
      screen.getByText("manual-import / Manual Seller / R235")
    ).toBeInTheDocument();
  });

  it("shows own listing sync controls and seller-side fields", () => {
    render(
      <Dashboard
        initialProducts={[
          {
            ...products[0]!,
            sellerSku: "SKU-1",
            stockQuantity: 14,
            listingStatus: "active",
            lastSellerSyncAt: "2026-04-10T02:00:00.000Z"
          }
        ]}
        initialExecutions={executions}
        initialMarketSnapshots={snapshots}
        initialSellerApiSettings={sellerApiSettings}
      />
    );

    expect(screen.getByRole("button", { name: "同步卖家数据" })).toBeInTheDocument();
    expect(screen.getByText("SKU-1")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("shows a seller api settings panel with readiness context and save action", () => {
    render(
      <Dashboard
        initialProducts={products}
        initialExecutions={executions}
        initialMarketSnapshots={snapshots}
        initialSellerApiSettings={sellerApiSettings}
      />
    );

    expect(screen.getByText("Seller API 接入设置")).toBeInTheDocument();
    expect(screen.getByText("API key 已配置")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://seller-api.takealot.example")).toBeInTheDocument();
    expect(screen.getByDisplayValue("/offers/{productId}")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("attributes.pricing.current.amount")
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("attributes.inventory.available_to_sell")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存 Seller API 设置" })).toBeInTheDocument();
  });
});
