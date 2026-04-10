import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { MarketOffer } from "@/core/types";
import { seedProducts } from "./fixtures";
import { ProductService } from "./service";
import { JsonProductStore } from "./store";

function createProvider(offers: MarketOffer[]) {
  const appliedPrices: number[] = [];

  return {
    appliedPrices,
    provider: {
      async fetchOwnListing() {
      return {
        sellerName: "My Store",
        currentPrice: 249,
        currency: "ZAR" as const,
        capturedAt: "2026-04-09T03:00:00.000Z",
        sellerSku: "SKU-1",
        stockQuantity: 14,
        listingStatus: "active"
      };
    },
      async fetchOffers() {
        return offers;
      },
      async applyPrice(_productId: string, newPrice: number) {
        appliedPrices.push(newPrice);

        return {
          appliedPrice: newPrice,
          appliedAt: "2026-04-09T03:00:00.000Z",
          mode: "live" as const
        };
      }
    }
  };
}

describe("ProductService", () => {
  it("loads seeded products when the store file is empty", async () => {
    const filePath = join(mkdtempSync(join(tmpdir(), "takealot-seed-")), "db.json");
    const provider = createProvider([
      { sellerName: "Cable Shop", price: 238, currency: "ZAR" }
    ]);
    const service = new ProductService({
      store: new JsonProductStore(filePath),
      providers: {
        mock: provider.provider
      }
    });

    const products = await service.listProducts();

    expect(products).toHaveLength(seedProducts.length);
    expect(products[0]?.id).toBe(seedProducts[0]?.id);
  });

  it("saves repricing rule changes", async () => {
    const filePath = join(mkdtempSync(join(tmpdir(), "takealot-rule-")), "db.json");
    const provider = createProvider([
      { sellerName: "Cable Shop", price: 238, currency: "ZAR" }
    ]);
    const service = new ProductService({
      store: new JsonProductStore(filePath),
      providers: {
        mock: provider.provider
      }
    });

    await service.listProducts();
    const updated = await service.updateRule(seedProducts[0]!.id, {
      undercutBy: 3,
      floorPrice: 215
    });
    const persisted = JSON.parse(readFileSync(filePath, "utf8"));

    expect(updated.rule.undercutBy).toBe(3);
    expect(updated.rule.floorPrice).toBe(215);
    expect(persisted.products[0].rule.undercutBy).toBe(3);
  });

  it("creates an execution record when a suggested price is applied", async () => {
    const filePath = join(mkdtempSync(join(tmpdir(), "takealot-apply-")), "db.json");
    const provider = createProvider([
      { sellerName: "Cable Shop", price: 238, currency: "ZAR" }
    ]);
    const service = new ProductService({
      store: new JsonProductStore(filePath),
      providers: {
        mock: provider.provider
      }
    });

    await service.listProducts();
    const result = await service.applySuggestedPrice(seedProducts[0]!.id);

    expect(provider.appliedPrices).toEqual([233]);
    expect(result.product.currentPrice).toBe(233);
    expect(result.execution).toMatchObject({
      productId: seedProducts[0]!.id,
      provider: "mock",
      previousPrice: 249,
      suggestedPrice: 233,
      appliedPrice: 233,
      status: "applied",
      reason: "match_lowest_competitor"
    });
    expect(result.product.lastPreview?.shouldUpdate).toBe(false);
    expect(result.product.lastOffers?.find((offer) => offer.sellerName === "My Store")?.price).toBe(233);
  });

  it("can refresh market data and apply price with different providers", async () => {
    const filePath = join(mkdtempSync(join(tmpdir(), "takealot-split-")), "db.json");
    const marketOffers = [
      { sellerName: "Cable Shop", price: 238, currency: "ZAR" as const }
    ];
    const sellerAppliedPrices: number[] = [];
    const service = new ProductService({
      store: new JsonProductStore(filePath),
      providers: {
        mock: {
          async fetchOwnListing() {
            return {
              sellerName: "My Store",
              currentPrice: 249,
              currency: "ZAR" as const,
              capturedAt: "2026-04-09T03:00:00.000Z"
            };
          },
          async fetchOffers() {
            return [
              { sellerName: "Backup Seller", price: 260, currency: "ZAR" as const }
            ];
          },
          async applyPrice(_productId: string, newPrice: number) {
            sellerAppliedPrices.push(newPrice);

            return {
              appliedPrice: newPrice,
              appliedAt: "2026-04-09T03:00:00.000Z",
              mode: "live" as const
            };
          }
        },
        "takealot-browser": {
          async fetchOwnListing() {
            return {
              sellerName: "Browser Mirror",
              currentPrice: 260,
              currency: "ZAR" as const,
              capturedAt: "2026-04-09T03:00:00.000Z"
            };
          },
          async fetchOffers() {
            return marketOffers;
          },
          async applyPrice() {
            throw new Error("browser provider should not handle writes");
          }
        }
      }
    });

    await service.listProducts();
    await service.updateProductProviders(seedProducts[0]!.id, {
      sellerProvider: "mock",
      marketProvider: "takealot-browser"
    });

    const refreshed = await service.refreshProduct(seedProducts[0]!.id);
    const applied = await service.applySuggestedPrice(seedProducts[0]!.id);

    expect(refreshed.offers).toEqual([
      ...marketOffers,
      { sellerName: "My Store", price: 249, currency: "ZAR" }
    ]);
    expect(sellerAppliedPrices).toEqual([233]);
    expect(applied.execution.provider).toBe("mock");
    expect(applied.product.lastOffers?.find((offer) => offer.sellerName === "My Store")?.price).toBe(233);
  });

  it("records dry-run executions without mutating the persisted price", async () => {
    const filePath = join(mkdtempSync(join(tmpdir(), "takealot-dry-run-")), "db.json");
    const appliedPrices: number[] = [];
    const service = new ProductService({
      store: new JsonProductStore(filePath),
      providers: {
        "takealot-seller-api": {
          async fetchOwnListing() {
            return {
              sellerName: "My Store",
              currentPrice: 249,
              currency: "ZAR" as const,
              capturedAt: "2026-04-09T03:00:00.000Z"
            };
          },
          async fetchOffers() {
            return [{ sellerName: "Cable Shop", price: 238, currency: "ZAR" as const }];
          },
          async applyPrice(_productId: string, newPrice: number) {
            appliedPrices.push(newPrice);

            return {
              appliedPrice: newPrice,
              appliedAt: "2026-04-09T03:00:00.000Z",
              mode: "dry-run" as const
            };
          }
        }
      }
    });

    await service.listProducts();
    await service.updateProductProviders(seedProducts[0]!.id, {
      sellerProvider: "takealot-seller-api",
      marketProvider: "takealot-seller-api"
    });

    const result = await service.applySuggestedPrice(seedProducts[0]!.id);

    expect(appliedPrices).toEqual([233]);
    expect(result.product.currentPrice).toBe(249);
    expect(result.product.lastOffers?.find((offer) => offer.sellerName === "My Store")?.price).toBe(249);
    expect(result.execution).toMatchObject({
      provider: "takealot-seller-api",
      suggestedPrice: 233,
      appliedPrice: undefined,
      status: "dry_run"
    });
  });

  it("stores a manual competitor snapshot and switches market provider to manual-import", async () => {
    const filePath = join(mkdtempSync(join(tmpdir(), "takealot-manual-market-")), "db.json");
    const provider = createProvider([
      { sellerName: "Cable Shop", price: 238, currency: "ZAR" }
    ]);
    const service = new ProductService({
      store: new JsonProductStore(filePath),
      providers: {
        mock: provider.provider
      }
    });

    await service.listProducts();
    const result = await service.updateManualMarketSnapshot(seedProducts[0]!.id, {
      sellerName: "Manual Seller",
      price: 235
    });

    expect(result.product.marketProvider).toBe("manual-import");
    expect(result.product.manualMarketSnapshot).toMatchObject({
      competitor: {
        sellerName: "Manual Seller",
        price: 235,
        currency: "ZAR"
      }
    });
    expect(result.preview).toMatchObject({
      suggestedPrice: 230
    });
  });

  it("seeds products with active monitoring enabled by default", async () => {
    const filePath = join(mkdtempSync(join(tmpdir(), "takealot-active-default-")), "db.json");
    const provider = createProvider([
      { sellerName: "Cable Shop", price: 238, currency: "ZAR" }
    ]);
    const service = new ProductService({
      store: new JsonProductStore(filePath),
      providers: {
        mock: provider.provider
      }
    });

    const products = await service.listProducts();

    expect(products.every((product) => product.active === true)).toBe(true);
  });

  it("persists active monitoring changes", async () => {
    const filePath = join(mkdtempSync(join(tmpdir(), "takealot-active-persist-")), "db.json");
    const provider = createProvider([
      { sellerName: "Cable Shop", price: 238, currency: "ZAR" }
    ]);
    const service = new ProductService({
      store: new JsonProductStore(filePath),
      providers: {
        mock: provider.provider
      }
    });

    await service.listProducts();
    const updated = await service.updateProductSettings(seedProducts[0]!.id, {
      active: false
    });
    const persisted = JSON.parse(readFileSync(filePath, "utf8"));

    expect(updated.active).toBe(false);
    expect(persisted.products[0].active).toBe(false);
  });

  it("refreshes only products with active monitoring enabled", async () => {
    const filePath = join(mkdtempSync(join(tmpdir(), "takealot-refresh-active-")), "db.json");
    const refreshedProductIds: string[] = [];
    const service = new ProductService({
      store: new JsonProductStore(filePath),
      providers: {
        mock: {
          async fetchOwnListing(product) {
            refreshedProductIds.push(product.id);

            return {
              sellerName: "My Store",
              currentPrice: product.currentPrice,
              currency: "ZAR" as const,
              capturedAt: "2026-04-09T03:00:00.000Z"
            };
          },
          async fetchOffers(product) {
            return [
              {
                sellerName: `${product.id}-competitor`,
                price: product.currentPrice - 10,
                currency: "ZAR" as const
              }
            ];
          },
          async applyPrice(_productId: string, newPrice: number) {
            return {
              appliedPrice: newPrice,
              appliedAt: "2026-04-09T03:00:00.000Z",
              mode: "live" as const
            };
          }
        }
      }
    });

    await service.listProducts();
    await service.updateProductSettings(seedProducts[1]!.id, {
      active: false
    });

    const results = await service.refreshActiveProducts();

    expect(results).toHaveLength(1);
    expect(results[0]?.product.id).toBe(seedProducts[0]!.id);
    expect(refreshedProductIds).toEqual([seedProducts[0]!.id]);
  });

  it("stores market snapshot history for refreshes and manual imports", async () => {
    const filePath = join(mkdtempSync(join(tmpdir(), "takealot-snapshot-history-")), "db.json");
    const provider = createProvider([
      { sellerName: "Cable Shop", price: 238, currency: "ZAR" }
    ]);
    const service = new ProductService({
      store: new JsonProductStore(filePath),
      providers: {
        mock: provider.provider
      }
    });

    await service.listProducts();
    await service.refreshProduct(seedProducts[0]!.id);
    await service.updateManualMarketSnapshot(seedProducts[0]!.id, {
      sellerName: "Manual Seller",
      price: 235
    });

    const snapshots = await service.listMarketSnapshots(seedProducts[0]!.id);

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]).toMatchObject({
      productId: seedProducts[0]!.id,
      marketProvider: "manual-import",
      source: "manual-import"
    });
    expect(snapshots[1]).toMatchObject({
      productId: seedProducts[0]!.id,
      marketProvider: "mock",
      source: "refresh"
    });
  });

  it("syncs own listing fields without creating market snapshots", async () => {
    const filePath = join(mkdtempSync(join(tmpdir(), "takealot-own-listing-")), "db.json");
    const provider = createProvider([
      { sellerName: "Cable Shop", price: 238, currency: "ZAR" }
    ]);
    const service = new ProductService({
      store: new JsonProductStore(filePath),
      providers: {
        mock: provider.provider
      }
    });

    await service.listProducts();
    const result = await service.syncOwnListing(seedProducts[0]!.id);
    const snapshots = await service.listMarketSnapshots(seedProducts[0]!.id);
    const persisted = JSON.parse(readFileSync(filePath, "utf8"));

    expect(result.product).toMatchObject({
      id: seedProducts[0]!.id,
      currentPrice: 249,
      sellerSku: "SKU-1",
      stockQuantity: 14,
      listingStatus: "active",
      lastSellerSyncAt: "2026-04-09T03:00:00.000Z"
    });
    expect(result.ownListing).toMatchObject({
      sellerSku: "SKU-1",
      stockQuantity: 14,
      listingStatus: "active"
    });
    expect(snapshots).toHaveLength(0);
    expect(persisted.marketSnapshots).toEqual([]);
  });

  it("syncs own listing data only for active products in batch mode", async () => {
    const filePath = join(mkdtempSync(join(tmpdir(), "takealot-own-listing-batch-")), "db.json");
    const provider = createProvider([
      { sellerName: "Cable Shop", price: 238, currency: "ZAR" }
    ]);
    const service = new ProductService({
      store: new JsonProductStore(filePath),
      providers: {
        mock: {
          ...provider.provider,
          async fetchOwnListing(product) {
            return {
              sellerName: "My Store",
              currentPrice: product.id === "sku-1" ? 249 : 499,
              currency: "ZAR" as const,
              capturedAt: "2026-04-10T03:00:00.000Z",
              sellerSku: product.id.toUpperCase(),
              stockQuantity: product.id === "sku-1" ? 14 : 7,
              listingStatus: product.id === "sku-1" ? "active" : "paused"
            };
          }
        }
      }
    });

    await service.listProducts();
    await service.updateProductSettings(seedProducts[1]!.id, {
      active: false
    });

    const result = await service.syncActiveOwnListings();
    const persisted = JSON.parse(readFileSync(filePath, "utf8"));

    expect(result.summary).toMatchObject({
      requestedCount: 2,
      syncedCount: 1,
      skippedCount: 1
    });
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.product).toMatchObject({
      id: "sku-1",
      sellerSku: "SKU-1",
      stockQuantity: 14,
      listingStatus: "active"
    });
    expect(persisted.products[0]).toMatchObject({
      sellerSku: "SKU-1",
      stockQuantity: 14,
      listingStatus: "active"
    });
    expect(persisted.products[1].sellerSku).toBeUndefined();
    expect(persisted.products[1].stockQuantity).toBeUndefined();
  });
});
