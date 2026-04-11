import type { MarketOffer, ProductMonitor } from "@/core/types";
import type {
  ApplyPriceResult,
  MarketplaceProvider,
  OwnListingSnapshot,
  SellerCatalogOffer
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

export const TAKEALOT_MARKETPLACE_API_DEFAULT_BASE_URL =
  "https://marketplace-api.takealot.com/v1";
export const TAKEALOT_MARKETPLACE_API_DEFAULT_AUTH_HEADER_NAME = "X-API-Key";
export const TAKEALOT_MARKETPLACE_API_DEFAULT_OWN_LISTING_PATH_TEMPLATE =
  "/offers/by_sku/{sellerSku}";

export type TakealotSellerApiReadinessStatus =
  | "missing_api_key"
  | "dry_run_only"
  | "live_requested_but_guarded";

type TakealotSellerApiAuthMode = "marketplace-api-key" | "custom-header";

export type TakealotSellerApiReadinessCheck = {
  id: "api_key" | "base_url" | "mode" | "contract";
  status: "pass" | "warn" | "fail";
  message: string;
};

export type TakealotSellerApiReadiness = {
  status: TakealotSellerApiReadinessStatus;
  apiKeyPresent: boolean;
  baseUrl: string;
  baseUrlSource: "official-default" | "custom-env";
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
    if (Array.isArray(current)) {
      const index = Number(segment);

      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return undefined;
      }

      current = current[index];
      continue;
    }

    if (!isJsonRecord(current) || !(segment in current)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

function sumSellerWarehouseStock(payload: unknown): number | undefined {
  const value = getCandidateValue(payload, ["seller_warehouse_stock"]);

  if (!Array.isArray(value)) {
    return undefined;
  }

  let total = 0;
  let found = false;

  for (const item of value) {
    if (!isJsonRecord(item)) {
      continue;
    }

    const quantity = item.quantity_available;

    if (typeof quantity === "number" && Number.isFinite(quantity)) {
      total += quantity;
      found = true;
      continue;
    }

    if (typeof quantity === "string") {
      const parsed = Number(quantity.replace(/[^0-9.-]/g, ""));

      if (Number.isFinite(parsed)) {
        total += parsed;
        found = true;
      }
    }
  }

  return found ? total : undefined;
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

function buildCollectionUrl(
  baseUrl: string,
  path: string,
  query: Record<string, string | number | boolean | undefined>
): string {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const url = new URL(`${normalizedBaseUrl}/${path.replace(/^\/+/, "")}`);

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.toString();
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
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const values: Record<string, unknown> = {
    ...product,
    productId: product.id,
    sellerSku: product.sellerSku ?? product.id
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

  return `${normalizedBaseUrl}/${path.replace(/^\/+/, "")}`;
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
      sumSellerWarehouseStock(payload) ??
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
    baseUrl:
      env.TAKEALOT_SELLER_API_BASE_URL?.trim() ||
      TAKEALOT_MARKETPLACE_API_DEFAULT_BASE_URL,
    dryRun: env.TAKEALOT_SELLER_API_DRY_RUN !== "false",
    authHeaderName:
      env.TAKEALOT_SELLER_API_AUTH_HEADER_NAME?.trim() ||
      TAKEALOT_MARKETPLACE_API_DEFAULT_AUTH_HEADER_NAME,
    authHeaderPrefix: env.TAKEALOT_SELLER_API_AUTH_HEADER_PREFIX?.trim(),
    ownListingPathTemplate:
      env.TAKEALOT_SELLER_API_OWN_LISTING_PATH_TEMPLATE?.trim() ||
      TAKEALOT_MARKETPLACE_API_DEFAULT_OWN_LISTING_PATH_TEMPLATE,
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
  const baseUrl =
    env.TAKEALOT_SELLER_API_BASE_URL?.trim() ||
    TAKEALOT_MARKETPLACE_API_DEFAULT_BASE_URL;
  const baseUrlSource =
    env.TAKEALOT_SELLER_API_BASE_URL?.trim() ? "custom-env" : "official-default";
  const dryRun = env.TAKEALOT_SELLER_API_DRY_RUN !== "false";
  const configuredAuthHeaderName = env.TAKEALOT_SELLER_API_AUTH_HEADER_NAME?.trim();
  const authMode: TakealotSellerApiAuthMode = configuredAuthHeaderName
    ? "custom-header"
    : "marketplace-api-key";
  const canReadOwnListings = apiKeyPresent;
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
      status: "pass",
      message:
        baseUrlSource === "custom-env"
          ? `已配置自定义 Marketplace API 基地址: ${baseUrl}`
          : `当前使用官方 Marketplace API 默认基地址: ${baseUrl}`
    },
    {
      id: "mode",
      status: dryRun ? "pass" : "warn",
      message: dryRun
        ? "当前处于 dry-run 保护模式。"
        : "当前请求 live 模式，建议先用单个 SKU 验证真实 PATCH。"
    },
    {
      id: "contract",
      status: "warn",
      message:
        canReadOwnListings
          ? "已具备 Marketplace API own offer 读取基础条件，仍需按真实账号验证字段映射与限流行为。"
          : "缺少 API key，尚不能读取 own offer 或执行 live 调价。"
    }
  ];
  const recommendedActions = [];

  if (!apiKeyPresent) {
    recommendedActions.push("配置 TAKEALOT_SELLER_API_KEY。");
  }

  if (baseUrlSource === "custom-env") {
    recommendedActions.push(
      "确认自定义 Marketplace API Base URL 与官方环境一致，避免误指向旧网关。"
    );
  }

  if (dryRun) {
    recommendedActions.push(
      "在确认官方写接口之前继续保持 dry-run；验证完成后再显式设置 TAKEALOT_SELLER_API_DRY_RUN=false。"
    );
  } else {
    recommendedActions.push(
      "先用单个 SKU 验证 Marketplace API live PATCH，再放大到批量调价。"
    );
  }

  if (canReadOwnListings) {
    recommendedActions.push(
      "用单个已知商品先验证 own offer 字段映射，再放大到批量同步。"
    );
  } else {
    recommendedActions.push("配置 API key 后再验证 own offer 读取。");
  }
  recommendedActions.push(
    "确认竞品最低价数据来源；当前不要假设 Marketplace API 提供市场情报。"
  );

  return {
    status,
    apiKeyPresent,
    baseUrl,
    baseUrlSource,
    dryRun,
    authMode,
    canAttemptLiveWrites: apiKeyPresent && !dryRun,
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
  private readonly authHeaderName: string;
  private readonly authHeaderPrefix?: string;
  private readonly ownListingPathTemplate: string;
  private readonly ownListingFieldPaths: OwnListingFieldPaths;
  private readonly fetchImpl?: typeof fetch;
  private readonly transport?: TakealotSellerApiConfig["transport"];

  constructor(config: TakealotSellerApiConfig) {
    if (!config.apiKey.trim()) {
      throw createMissingApiKeyError();
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? TAKEALOT_MARKETPLACE_API_DEFAULT_BASE_URL;
    this.dryRun = config.dryRun ?? true;
    this.authHeaderName =
      config.authHeaderName?.trim() ||
      TAKEALOT_MARKETPLACE_API_DEFAULT_AUTH_HEADER_NAME;
    this.authHeaderPrefix = config.authHeaderPrefix?.trim() || undefined;
    this.ownListingPathTemplate =
      config.ownListingPathTemplate?.trim() ||
      TAKEALOT_MARKETPLACE_API_DEFAULT_OWN_LISTING_PATH_TEMPLATE;
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
    const authValue = this.authHeaderPrefix
      ? `${this.authHeaderPrefix} ${this.apiKey}`
      : this.apiKey;

    return {
      "Content-Type": "application/json",
      [this.authHeaderName]: authValue
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

    if (!this.fetchImpl) {
      throw new Error(
        "Takealot Marketplace API own-offer read requires fetch support in this runtime."
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

  async listOwnOffers(): Promise<SellerCatalogOffer[]> {
    if (!this.fetchImpl) {
      throw new Error(
        "Takealot Marketplace API seller catalog sync requires fetch support in this runtime."
      );
    }

    const offers: SellerCatalogOffer[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.fetchImpl(
        buildCollectionUrl(this.baseUrl, "/offers", {
          limit: 1000,
          expands: "seller_warehouse_stock",
          continuation_token: continuationToken
        }),
        {
          method: "GET",
          headers: this.buildAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(
          `Takealot Marketplace API offer list failed with status ${response.status}.`
        );
      }

      const payload = (await response.json()) as {
        items?: unknown[];
        continuation_token?: string;
      };

      for (const item of payload.items ?? []) {
        const currentPrice = readNumberCandidate(item, ["selling_price"]);
        const sellerSku = readStringCandidate(item, ["sku"]);
        const title = readStringCandidate(item, ["title"]);

        if (
          currentPrice === undefined ||
          !sellerSku ||
          !title
        ) {
          continue;
        }

        offers.push({
          offerId: readNumberCandidate(item, ["offer_id"]),
          tsinId: readNumberCandidate(item, ["tsin_id"]),
          sellerSku,
          title,
          currentPrice,
          listingStatus: readStringCandidate(item, ["status"]),
          imageUrl: readStringCandidate(item, ["image_url"]),
          productlineId: readNumberCandidate(item, ["productline_id"]),
          benchmarkPrice: readNumberCandidate(item, ["benchmark_price"]),
          listingQuality: readNumberCandidate(item, ["listing_quality"]),
          stockQuantity: sumSellerWarehouseStock(item)
        });
      }

      continuationToken = payload.continuation_token;
    } while (continuationToken);

    return offers;
  }

  async applyPrice(
    productId: string,
    newPrice: number,
    product: ProductMonitor
  ): Promise<ApplyPriceResult> {
    if (this.dryRun) {
      return {
        appliedPrice: newPrice,
        appliedAt: new Date().toISOString(),
        mode: "dry-run"
      };
    }

    if (this.transport) {
      await this.transport({
        operation: "applyPrice",
        baseUrl: this.baseUrl,
        productId,
        price: newPrice,
        headers: this.buildAuthHeaders()
      });
    } else if (this.fetchImpl) {
      const response = await this.fetchImpl(
        resolveOwnListingUrl(this.baseUrl, this.ownListingPathTemplate, product),
        {
          method: "PATCH",
          headers: this.buildAuthHeaders(),
          body: JSON.stringify({
            selling_price: newPrice
          })
        }
      );

      if (!response.ok) {
        throw new Error(
          `Takealot Marketplace API price update failed with status ${response.status}.`
        );
      }
    } else {
      throw new Error(
        "Takealot Marketplace API live price update requires fetch or transport support in this runtime."
      );
    }

    return {
      appliedPrice: newPrice,
      appliedAt: new Date().toISOString(),
      mode: "live"
    };
  }
}
