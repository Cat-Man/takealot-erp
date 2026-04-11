import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProductMonitor } from "@/core/types";
import { SellerOfferTable } from "./seller-offer-table";

const products: ProductMonitor[] = [
  {
    id: "SKU-ABC123",
    title:
      "7-inch Kids Tablet Android Tabletsg 1GB 16GB Children's Education Learnin - Blue",
    productUrl:
      "https://www.takealot.com/7-inch-kids-tablet-android-tabletsg-1gb-16gb-childrens-education-learnin-blue/PLID98314826",
    offerUrl: "",
    provider: "takealot-seller-api",
    sellerProvider: "takealot-seller-api",
    marketProvider: "takealot-browser",
    ownSellerName: "My Store",
    currentPrice: 833,
    offerId: 123456,
    tsinId: 23456789,
    sellerSku: "SKU-ABC123",
    imageUrl: "https://images.takealot.com/offer-123456.jpg",
    productlineId: 98314826,
    benchmarkPrice: 838,
    listingQuality: 85,
    stockQuantity: 10,
    listingStatus: "buyable",
    rule: {
      enabled: true,
      undercutBy: 5,
      floorPrice: 780,
      ceilingPrice: 900,
      costPrice: 620,
      minMargin: 40
    },
    lastPreview: {
      currentPrice: 833,
      suggestedPrice: 832,
      delta: -1,
      margin: 212,
      matchedCompetitor: {
        sellerName: "Lumistar Store",
        price: 833,
        currency: "ZAR"
      },
      reason: "match_lowest_competitor",
      shouldUpdate: true
    },
    lastCheckedAt: "2026-04-11T10:00:00.000Z"
  }
];

describe("SellerOfferTable", () => {
  it("renders seller catalog columns and row actions", () => {
    render(
      <SellerOfferTable
        products={products}
        disabled={false}
        onSyncCatalog={vi.fn()}
        onRefreshProduct={vi.fn()}
        onSyncOwnListing={vi.fn()}
        onApplyPrice={vi.fn()}
      />
    );

    expect(screen.getByText("店铺商品列表")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "同步店铺商品" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "商品" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "SKU" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "TSIN" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "PLID" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "当前售价" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "最低竞品" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "建议价" })).toBeInTheDocument();
    expect(screen.getByText("SKU-ABC123")).toBeInTheDocument();
    expect(screen.getByText("Lumistar Store / R833")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "同步卖家数据" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "刷新市场价" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "执行调价" })).toBeInTheDocument();
  });
});
