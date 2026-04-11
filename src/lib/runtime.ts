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
import {
  getTakealotSellerApiSettingsReport,
  mergeTakealotSellerApiEnv,
  type TakealotSellerApiSettingsPatch,
  updateTakealotSellerApiSettings
} from "./takealot-seller-api-settings";
import { ProductService } from "./service";
import { JsonProductStore } from "./store";

let productServiceOverride: ProductService | null = null;
let productServiceSingleton: ProductService | null = null;

function createDefaultService(): ProductService {
  const sellerApiEnv = mergeTakealotSellerApiEnv(process.env);
  const providers: Record<string, MarketplaceProvider> = {
    mock: createMockProvider(),
    "takealot-browser": new TakealotBrowserProvider({
      profileDir: process.env.TAKEALOT_PROFILE_DIR
    })
  };
  const sellerApiKey = sellerApiEnv.TAKEALOT_SELLER_API_KEY?.trim();

  if (sellerApiKey) {
    providers["takealot-seller-api"] = new TakealotSellerApiProvider(
      loadTakealotSellerApiConfig(sellerApiEnv)
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

export function resetProductServiceRuntime(): void {
  productServiceOverride = null;
  productServiceSingleton = null;
}

export function getTakealotSellerApiReadinessReport() {
  return getTakealotSellerApiReadiness(mergeTakealotSellerApiEnv(process.env));
}

export function getTakealotSellerApiSettingsState() {
  return getTakealotSellerApiSettingsReport(process.env);
}

export async function saveTakealotSellerApiSettings(
  patch: TakealotSellerApiSettingsPatch
) {
  const report = await updateTakealotSellerApiSettings(patch, process.env);
  resetProductServiceRuntime();
  return report;
}
