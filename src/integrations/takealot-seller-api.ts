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
  authHeaderName?: string;
  authHeaderPrefix?: string;
  ownListingPathTemplate?: string;
  ownListingSellerNamePath?: string;
  ownListingCurrentPricePath?: string;
  ownListingCurrencyPath?: string;
  ownListingCapturedAtPath?: string;
  ownListingSellerSkuPath?: string;
  ownListingStockQuantityPath?: string;
  ownListingListingStatusPath?: string;
  fetchImpl?: typeof fetch;
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

type TakealotSellerApiAuthMode = "placeholder" | "custom-header";

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
  authMode: TakealotSellerApiAuthMode;
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

type JsonRecord = Record<string, unknown>;

type OwnListingFieldPaths = {
  sellerName?: string;
  currentPrice?: string;
  currency?: string;
  capturedAt?: string;
  sellerSku?: string;
  stockQuantity?: string;
  listingStatus?: string;
};

function createMissingApiKeyError(): Error {
  return new Error(
    "Missing TAKEALOT_SELLER_API_KEY for Takealot Seller API provider."
  );
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPathValue(root: JsonRecord, path: string): unknown {
  const segments = path.split(".");
  let current: unknown = root;

  for (const segment of segments) {
    if (!isJsonRecord(current) || !(segment in current)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

function getCandidateValue(payload: unknown, candidates: string[]): unknown {
  if (!isJsonRecord(payload)) {
    return undefined;
  }

  const roots = [
    payload,
    payload.data,
    payload.result,
    payload.listing,
    payload.offer,
    payload.item
  ].filter(isJsonRecord);

  for (const root of roots) {
    for (const candidate of candidates) {
      const value = getPathValue(root, candidate);

      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
  }

  return undefined;
}

function readStringCandidate(payload: unknown, candidates: string[]): string | undefined {
  const value = getCandidateValue(payload, candidates);

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return undefined;
}

function readNumberCandidate(payload: unknown, candidates: string[]): number | undefined {
  const value = getCandidateValue(payload, candidates);

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function normalizeConfiguredPath(path: string | undefined): string | undefined {
  const trimmed = path?.trim();
  return trimmed ? trimmed : undefined;
}

function resolveOwnListingUrl(
  baseUrl: string,
  pathTemplate: string,
  product: ProductMonitor
): string {
  const values: Record<string, unknown> = {
    ...product,
    productId: product.id
  };
  const path = pathTemplate.replace(/\{([^}]+)\}/g, (_match, key: string) => {
    const value = values[key];

    if (value === undefined || value === null || value === "") {
      throw new Error(
        `Missing product field for Takealot Seller API own-listing path template: ${key}`
      );
    }

    return encodeURIComponent(String(value));
  });

  return new URL(path, baseUrl).toString();
}

function normalizeOwnListingPayload(
  payload: unknown,
  product: ProductMonitor,
  fieldPaths: OwnListingFieldPaths = {}
): OwnListingSnapshot {
  const currentPrice =
    (fieldPaths.currentPrice
      ? readNumberCandidate(payload, [fieldPaths.currentPrice])
      : undefined) ??
    readNumberCandidate(payload, [
      "currentPrice",
      "current_price",
      "price",
      "sellingPrice",
      "selling_price"
    ]);

  if (currentPrice === undefined) {
    throw new Error(
      "Takealot Seller API own-listing response is missing a readable current price."
    );
  }

  return {
    sellerName:
      (fieldPaths.sellerName
        ? readStringCandidate(payload, [fieldPaths.sellerName])
        : undefined) ??
      readStringCandidate(payload, [
        "sellerName",
        "seller_name",
        "seller.name",
        "seller.displayName"
      ]) ??
      product.ownSellerName,
    currentPrice,
    currency:
      ((fieldPaths.currency
        ? readStringCandidate(payload, [fieldPaths.currency])
        : undefined) ??
        readStringCandidate(payload, [
          "currency",
          "currencyCode",
          "currency_code"
        ])) === "ZAR"
        ? "ZAR"
        : "ZAR",
    capturedAt:
      (fieldPaths.capturedAt
        ? readStringCandidate(payload, [fieldPaths.capturedAt])
        : undefined) ??
      readStringCandidate(payload, [
        "capturedAt",
        "captured_at",
        "updatedAt",
        "updated_at",
        "timestamp"
      ]) ??
      new Date().toISOString(),
    sellerSku:
      (fieldPaths.sellerSku
        ? readStringCandidate(payload, [fieldPaths.sellerSku])
        : undefined) ?? readStringCandidate(payload, ["sellerSku", "seller_sku", "sku"]),
    stockQuantity:
      (fieldPaths.stockQuantity
        ? readNumberCandidate(payload, [fieldPaths.stockQuantity])
        : undefined) ??
      readNumberCandidate(payload, [
        "stockQuantity",
        "stock_quantity",
        "quantity",
        "stock"
      ]),
    listingStatus:
      (fieldPaths.listingStatus
        ? readStringCandidate(payload, [fieldPaths.listingStatus])
        : undefined) ??
      readStringCandidate(payload, ["listingStatus", "listing_status", "status"])
  };
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
    dryRun: env.TAKEALOT_SELLER_API_DRY_RUN !== "false",
    authHeaderName: env.TAKEALOT_SELLER_API_AUTH_HEADER_NAME?.trim(),
    authHeaderPrefix: env.TAKEALOT_SELLER_API_AUTH_HEADER_PREFIX?.trim(),
    ownListingPathTemplate:
      env.TAKEALOT_SELLER_API_OWN_LISTING_PATH_TEMPLATE?.trim(),
    ownListingSellerNamePath: normalizeConfiguredPath(
      env.TAKEALOT_SELLER_API_OWN_LISTING_SELLER_NAME_PATH
    ),
    ownListingCurrentPricePath: normalizeConfiguredPath(
      env.TAKEALOT_SELLER_API_OWN_LISTING_CURRENT_PRICE_PATH
    ),
    ownListingCurrencyPath: normalizeConfiguredPath(
      env.TAKEALOT_SELLER_API_OWN_LISTING_CURRENCY_PATH
    ),
    ownListingCapturedAtPath: normalizeConfiguredPath(
      env.TAKEALOT_SELLER_API_OWN_LISTING_CAPTURED_AT_PATH
    ),
    ownListingSellerSkuPath: normalizeConfiguredPath(
      env.TAKEALOT_SELLER_API_OWN_LISTING_SELLER_SKU_PATH
    ),
    ownListingStockQuantityPath: normalizeConfiguredPath(
      env.TAKEALOT_SELLER_API_OWN_LISTING_STOCK_QUANTITY_PATH
    ),
    ownListingListingStatusPath: normalizeConfiguredPath(
      env.TAKEALOT_SELLER_API_OWN_LISTING_LISTING_STATUS_PATH
    )
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
  const authHeaderName = env.TAKEALOT_SELLER_API_AUTH_HEADER_NAME?.trim();
  const ownListingPathTemplate =
    env.TAKEALOT_SELLER_API_OWN_LISTING_PATH_TEMPLATE?.trim();
  const authMode: TakealotSellerApiAuthMode = authHeaderName
    ? "custom-header"
    : "placeholder";
  const canReadOwnListings = Boolean(
    apiKeyPresent &&
      baseUrlSource === "custom-env" &&
      authHeaderName &&
      ownListingPathTemplate
  );
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
        canReadOwnListings
          ? "已配置 own listing 读取所需参数，但仍需按真实账号验证字段映射与限流行为。"
          : "鉴权头、own listing 读取和市场情报读取仍是保守占位实现，不能宣称已接通官方协议。"
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

  if (!authHeaderName) {
    recommendedActions.push("配置 TAKEALOT_SELLER_API_AUTH_HEADER_NAME。");
  }

  if (!ownListingPathTemplate) {
    recommendedActions.push(
      "配置 TAKEALOT_SELLER_API_OWN_LISTING_PATH_TEMPLATE 以启用 own listing 读取。"
    );
  }

  if (dryRun) {
    recommendedActions.push(
      "在确认官方写接口之前继续保持 dry-run；验证完成后再显式设置 TAKEALOT_SELLER_API_DRY_RUN=false。"
    );
  } else {
    recommendedActions.push(
      authMode === "custom-header"
        ? "确认官方写价 endpoint 与 payload；当前只开放了卖家侧读取链路，真实写操作仍需单独验证。"
        : "确认官方鉴权与写价协议；当前代码仍使用占位鉴权头，不能宣称已接通真实写操作。"
    );
  }

  if (canReadOwnListings) {
    recommendedActions.push(
      "用单个已知商品先验证 own listing 字段映射，再放大到批量同步。"
    );
  } else {
    recommendedActions.push("确认 own listing 读取 contract，再开放真实读接口。");
  }
  recommendedActions.push(
    "确认竞品最低价数据来源；当前不要假设 Seller API 一定提供市场情报。"
  );

  return {
    status,
    apiKeyPresent,
    baseUrl,
    baseUrlSource,
    dryRun,
    authMode,
    canAttemptLiveWrites: false,
    canReadOwnListings,
    canReadMarketIntelligence: false,
    checks,
    recommendedActions
  };
}

export class TakealotSellerApiProvider implements MarketplaceProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly dryRun: boolean;
  private readonly authHeaderName?: string;
  private readonly authHeaderPrefix?: string;
  private readonly ownListingPathTemplate?: string;
  private readonly ownListingFieldPaths: OwnListingFieldPaths;
  private readonly fetchImpl?: typeof fetch;
  private readonly transport?: TakealotSellerApiConfig["transport"];

  constructor(config: TakealotSellerApiConfig) {
    if (!config.apiKey.trim()) {
      throw createMissingApiKeyError();
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.dryRun = config.dryRun ?? false;
    this.authHeaderName = config.authHeaderName?.trim() || undefined;
    this.authHeaderPrefix = config.authHeaderPrefix?.trim() || undefined;
    this.ownListingPathTemplate = config.ownListingPathTemplate?.trim() || undefined;
    this.ownListingFieldPaths = {
      sellerName: normalizeConfiguredPath(config.ownListingSellerNamePath),
      currentPrice: normalizeConfiguredPath(config.ownListingCurrentPricePath),
      currency: normalizeConfiguredPath(config.ownListingCurrencyPath),
      capturedAt: normalizeConfiguredPath(config.ownListingCapturedAtPath),
      sellerSku: normalizeConfiguredPath(config.ownListingSellerSkuPath),
      stockQuantity: normalizeConfiguredPath(config.ownListingStockQuantityPath),
      listingStatus: normalizeConfiguredPath(config.ownListingListingStatusPath)
    };
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch?.bind(globalThis);
    this.transport = config.transport;
  }

  buildAuthHeaders(): Record<string, string> {
    if (this.authHeaderName) {
      const authValue = this.authHeaderPrefix
        ? `${this.authHeaderPrefix} ${this.apiKey}`
        : this.apiKey;

      return {
        "Content-Type": "application/json",
        [this.authHeaderName]: authValue
      };
    }

    // Placeholder only until the official Seller API auth contract is verified.
    return {
      "Content-Type": "application/json",
      "X-Takealot-Auth-Placeholder": this.apiKey
    };
  }

  async fetchOwnListing(product: ProductMonitor): Promise<OwnListingSnapshot> {
    if (this.transport) {
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

    if (!this.fetchImpl || !this.ownListingPathTemplate) {
      throw new Error(
        "Takealot Seller API own-listing endpoint is not wired yet. Verify the official seller contract before enabling reads."
      );
    }

    const response = await this.fetchImpl(
      resolveOwnListingUrl(this.baseUrl, this.ownListingPathTemplate, product),
      {
        method: "GET",
        headers: this.buildAuthHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(
        `Takealot Seller API own-listing read failed with status ${response.status}.`
      );
    }

    return normalizeOwnListingPayload(
      await response.json(),
      product,
      this.ownListingFieldPaths
    );
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
