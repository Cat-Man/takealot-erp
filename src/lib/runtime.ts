import { join } from "node:path";
import { createMockProvider } from "@/integrations/mock-provider";
import { createManualImportMarketProvider } from "@/integrations/manual-import-provider";
import {
  getTakealotSellerApiReadiness,
  loadTakealotSellerApiConfig,
  TakealotSellerApiProvider
} from "@/integrations/takealot-seller-api";
import { TakealotBrowserProvider } from "@/integrations/takealot-browser";
import type {
  MarketIntelligenceProvider,
  MarketplaceProvider
} from "@/integrations/marketplace";
import { ProductService } from "./service";
import { JsonProductStore } from "./store";

let productServiceOverride: ProductService | null = null;
let productServiceSingleton: ProductService | null = null;

function createDefaultService(): ProductService {
  const providers: Record<string, MarketplaceProvider> = {
    mock: createMockProvider(),
    "takealot-browser": new TakealotBrowserProvider({
      profileDir: process.env.TAKEALOT_PROFILE_DIR
    })
  };
  const sellerApiKey = process.env.TAKEALOT_SELLER_API_KEY?.trim();

  if (sellerApiKey) {
    providers["takealot-seller-api"] = new TakealotSellerApiProvider(
      loadTakealotSellerApiConfig(process.env)
    );
  }

  const marketProviders: Record<string, MarketIntelligenceProvider> = {
    "manual-import": createManualImportMarketProvider()
  };

  return new ProductService({
    store: new JsonProductStore(
      process.env.DATA_FILE_PATH ?? join(process.cwd(), "data", "store.json")
    ),
    providers,
    marketProviders
  });
}

export function getProductService(): ProductService {
  if (productServiceOverride) {
    return productServiceOverride;
  }

  if (!productServiceSingleton) {
    productServiceSingleton = createDefaultService();
  }

  return productServiceSingleton;
}

export function setProductServiceOverride(service: ProductService | null): void {
  productServiceOverride = service;
}

export function getTakealotSellerApiReadinessReport() {
  return getTakealotSellerApiReadiness(process.env);
}
