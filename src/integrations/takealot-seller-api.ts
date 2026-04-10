import type { MarketOffer, ProductMonitor } from "@/core/types";
import type {
  ApplyPriceResult,
  MarketplaceProvider,
  OwnListingSnapshot
} from "./marketplace";

export type TakealotSellerApiTransportRequest = {
  operation: "fetchOwnListing" | "applyPrice";
  baseUrl: string;
  productId: string;
  price?: number;
  headers: Record<string, string>;
};

export type TakealotSellerApiConfig = {
  apiKey: string;
  baseUrl?: string;
  dryRun?: boolean;
  transport?: (
    request: TakealotSellerApiTransportRequest
  ) => Promise<unknown> | unknown;
};

type EnvLike = Record<string, string | undefined>;

const DEFAULT_BASE_URL = "https://seller-api.takealot.local";

export type TakealotSellerApiReadinessStatus =
  | "missing_api_key"
  | "dry_run_only"
  | "live_requested_but_guarded";

export type TakealotSellerApiReadinessCheck = {
  id: "api_key" | "base_url" | "mode" | "contract";
  status: "pass" | "warn" | "fail";
  message: string;
};

export type TakealotSellerApiReadiness = {
  status: TakealotSellerApiReadinessStatus;
  apiKeyPresent: boolean;
  baseUrl: string;
  baseUrlSource: "default-placeholder" | "custom-env";
  dryRun: boolean;
  authMode: "placeholder";
  canAttemptLiveWrites: boolean;
  canReadOwnListings: boolean;
  canReadMarketIntelligence: boolean;
  checks: TakealotSellerApiReadinessCheck[];
  recommendedActions: string[];
};

type TransportOwnListingPayload = {
  sellerName: string;
  currentPrice: number;
  currency: "ZAR";
  capturedAt: string;
  sellerSku?: string;
  stockQuantity?: number;
  listingStatus?: string;
};

function createMissingApiKeyError(): Error {
  return new Error(
    "Missing TAKEALOT_SELLER_API_KEY for Takealot Seller API provider."
  );
}

export function loadTakealotSellerApiConfig(
  env: EnvLike
): TakealotSellerApiConfig {
  const apiKey = env.TAKEALOT_SELLER_API_KEY?.trim();

  if (!apiKey) {
    throw createMissingApiKeyError();
  }

  return {
    apiKey,
    baseUrl: env.TAKEALOT_SELLER_API_BASE_URL?.trim() || DEFAULT_BASE_URL,
    dryRun: env.TAKEALOT_SELLER_API_DRY_RUN !== "false"
  };
}

export function getTakealotSellerApiReadiness(
  env: EnvLike
): TakealotSellerApiReadiness {
  const apiKeyPresent = Boolean(env.TAKEALOT_SELLER_API_KEY?.trim());
  const baseUrl = env.TAKEALOT_SELLER_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const baseUrlSource =
    env.TAKEALOT_SELLER_API_BASE_URL?.trim() ? "custom-env" : "default-placeholder";
  const dryRun = env.TAKEALOT_SELLER_API_DRY_RUN !== "false";
  const status = !apiKeyPresent
    ? "missing_api_key"
    : dryRun
      ? "dry_run_only"
      : "live_requested_but_guarded";
  const checks: TakealotSellerApiReadinessCheck[] = [
    {
      id: "api_key",
      status: apiKeyPresent ? "pass" : "fail",
      message: apiKeyPresent
        ? "已检测到 TAKEALOT_SELLER_API_KEY。"
        : "缺少 TAKEALOT_SELLER_API_KEY。"
    },
    {
      id: "base_url",
      status: baseUrlSource === "custom-env" ? "pass" : "warn",
      message:
        baseUrlSource === "custom-env"
          ? `已配置自定义 Seller API 基地址: ${baseUrl}`
          : "仍在使用占位 Seller API 基地址。"
    },
    {
      id: "mode",
      status: dryRun ? "pass" : "warn",
      message: dryRun
        ? "当前处于 dry-run 保护模式。"
        : "当前请求 live 模式，但真实写接口仍未验证。"
    },
    {
      id: "contract",
      status: "warn",
      message:
        "鉴权头、own listing 读取和市场情报读取仍是保守占位实现，不能宣称已接通官方协议。"
    }
  ];
  const recommendedActions = [];

  if (!apiKeyPresent) {
    recommendedActions.push("配置 TAKEALOT_SELLER_API_KEY。");
  }

  if (baseUrlSource === "default-placeholder") {
    recommendedActions.push(
      "配置 TAKEALOT_SELLER_API_BASE_URL 为真实 Seller API 基地址。"
    );
  }

  if (dryRun) {
    recommendedActions.push(
      "在确认官方写接口之前继续保持 dry-run；验证完成后再显式设置 TAKEALOT_SELLER_API_DRY_RUN=false。"
    );
  } else {
    recommendedActions.push(
      "确认官方鉴权与写价协议；当前代码仍使用占位鉴权头，不能宣称已接通真实写操作。"
    );
  }

  recommendedActions.push("确认 own listing 读取 contract，再开放真实读接口。");
  recommendedActions.push(
    "确认竞品最低价数据来源；当前不要假设 Seller API 一定提供市场情报。"
  );

  return {
    status,
    apiKeyPresent,
    baseUrl,
    baseUrlSource,
    dryRun,
    authMode: "placeholder",
    canAttemptLiveWrites: false,
    canReadOwnListings: false,
    canReadMarketIntelligence: false,
    checks,
    recommendedActions
  };
}

export class TakealotSellerApiProvider implements MarketplaceProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly dryRun: boolean;
  private readonly transport?: TakealotSellerApiConfig["transport"];

  constructor(config: TakealotSellerApiConfig) {
    if (!config.apiKey.trim()) {
      throw createMissingApiKeyError();
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.dryRun = config.dryRun ?? false;
    this.transport = config.transport;
  }

  buildAuthHeaders(): Record<string, string> {
    // Placeholder only until the official Seller API auth contract is verified.
    return {
      "Content-Type": "application/json",
      "X-Takealot-Auth-Placeholder": this.apiKey
    };
  }

  async fetchOwnListing(product: ProductMonitor): Promise<OwnListingSnapshot> {
    if (!this.transport) {
      throw new Error(
        "Takealot Seller API own-listing endpoint is not wired yet. Verify the official seller contract before enabling reads."
      );
    }

    const payload = (await this.transport({
      operation: "fetchOwnListing",
      baseUrl: this.baseUrl,
      productId: product.id,
      headers: this.buildAuthHeaders()
    })) as TransportOwnListingPayload;

    return {
      sellerName: payload.sellerName,
      currentPrice: payload.currentPrice,
      currency: payload.currency,
      capturedAt: payload.capturedAt,
      sellerSku: payload.sellerSku,
      stockQuantity: payload.stockQuantity,
      listingStatus: payload.listingStatus
    };
  }

  async fetchOffers(_product: ProductMonitor): Promise<MarketOffer[]> {
    throw new Error(
      "Takealot Seller API market intelligence endpoint is not wired yet. Use verified seller data or an approved secondary source."
    );
  }

  async applyPrice(
    productId: string,
    newPrice: number,
    _product: ProductMonitor
  ): Promise<ApplyPriceResult> {
    if (this.dryRun) {
      return {
        appliedPrice: newPrice,
        appliedAt: new Date().toISOString(),
        mode: "dry-run"
      };
    }

    if (!this.transport) {
      throw new Error(
        "Takealot Seller API write endpoint is not configured. Keep dry-run enabled until the official protocol is verified."
      );
    }

    await this.transport({
      operation: "applyPrice",
      baseUrl: this.baseUrl,
      productId,
      price: newPrice,
      headers: this.buildAuthHeaders()
    });

    return {
      appliedPrice: newPrice,
      appliedAt: new Date().toISOString(),
      mode: "live"
    };
  }
}
