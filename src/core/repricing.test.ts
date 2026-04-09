import { describe, expect, it } from "vitest";
import {
  calculateSuggestedPrice,
  createExecutionPreview,
  findLowestCompetitorOffer
} from "./repricing";
import type { MarketOffer, ProductMonitor } from "./types";

const product: ProductMonitor = {
  id: "sku-1",
  title: "Anker USB-C Cable",
  productUrl: "https://www.takealot.com/product/sku-1",
  offerUrl: "https://sellers.takealot.com/offers/sku-1",
  provider: "mock",
  ownSellerName: "My Store",
  currentPrice: 249,
  rule: {
    enabled: true,
    undercutBy: 5,
    floorPrice: 210,
    ceilingPrice: 280,
    costPrice: 170,
    minMargin: 20
  }
};

describe("findLowestCompetitorOffer", () => {
  it("ignores the current seller when finding the lowest offer", () => {
    const offers: MarketOffer[] = [
      { sellerName: "My Store", price: 220, currency: "ZAR" },
      { sellerName: "Cable Shop", price: 225, currency: "ZAR" },
      { sellerName: "Tech Hub", price: 229, currency: "ZAR" }
    ];

    expect(findLowestCompetitorOffer(offers, product.ownSellerName)).toEqual({
      sellerName: "Cable Shop",
      price: 225,
      currency: "ZAR"
    });
  });
});

describe("calculateSuggestedPrice", () => {
  it("undercuts the cheapest competitor when the price stays above the margin floor", () => {
    const suggestion = calculateSuggestedPrice(product, [
      { sellerName: "Cable Shop", price: 238, currency: "ZAR" },
      { sellerName: "Tech Hub", price: 244, currency: "ZAR" }
    ]);

    expect(suggestion).toMatchObject({
      recommendedPrice: 233,
      reason: "match_lowest_competitor",
      lowestCompetitorPrice: 238,
      shouldUpdate: true
    });
  });

  it("clamps the recommendation to the floor price when the market is too cheap", () => {
    const suggestion = calculateSuggestedPrice(product, [
      { sellerName: "Cable Shop", price: 198, currency: "ZAR" }
    ]);

    expect(suggestion).toMatchObject({
      recommendedPrice: 210,
      reason: "floor_price_guard",
      lowestCompetitorPrice: 198,
      shouldUpdate: true
    });
  });

  it("keeps the current price when no competitor offer exists", () => {
    const suggestion = calculateSuggestedPrice(product, [
      { sellerName: "My Store", price: 249, currency: "ZAR" }
    ]);

    expect(suggestion).toMatchObject({
      recommendedPrice: 249,
      reason: "no_competitor_offer",
      shouldUpdate: false
    });
  });
});

describe("createExecutionPreview", () => {
  it("creates an execution preview with delta and matched competitor details", () => {
    const preview = createExecutionPreview(product, [
      { sellerName: "Cable Shop", price: 238, currency: "ZAR" }
    ]);

    expect(preview).toMatchObject({
      currentPrice: 249,
      suggestedPrice: 233,
      delta: -16,
      matchedCompetitor: {
        sellerName: "Cable Shop",
        price: 238
      }
    });
  });
});
