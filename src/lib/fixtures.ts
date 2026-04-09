import type { ProductMonitor } from "@/core/types";

export const seedProducts: ProductMonitor[] = [
  {
    id: "sku-1",
    title: "Anker USB-C Cable",
    productUrl: "https://www.takealot.com/product/sku-1",
    offerUrl: "https://sellers.takealot.com/offers/sku-1",
    provider: "mock",
    ownSellerName: "My Store",
    currentPrice: 249,
    active: true,
    rule: {
      enabled: true,
      undercutBy: 5,
      floorPrice: 210,
      ceilingPrice: 280,
      costPrice: 170,
      minMargin: 20
    }
  },
  {
    id: "sku-2",
    title: "Baseus 65W Charger",
    productUrl: "https://www.takealot.com/product/sku-2",
    offerUrl: "https://sellers.takealot.com/offers/sku-2",
    provider: "mock",
    ownSellerName: "My Store",
    currentPrice: 499,
    active: true,
    rule: {
      enabled: true,
      undercutBy: 10,
      floorPrice: 450,
      ceilingPrice: 560,
      costPrice: 390,
      minMargin: 35
    }
  }
];
