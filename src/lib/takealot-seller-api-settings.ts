import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  getTakealotSellerApiReadiness,
  type TakealotSellerApiReadiness
} from "@/integrations/takealot-seller-api";

type EnvLike = Record<string, string | undefined>;

export type TakealotSellerApiPersistedSettings = {
  apiKey?: string;
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
  updatedAt?: string;
};

export type TakealotSellerApiSettingsPatch = {
  apiKey?: string;
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
};

export type TakealotSellerApiSettingsView = {
  apiKeyConfigured: boolean;
  apiKeyPreview: string | null;
  baseUrl: string;
  dryRun: boolean;
  authHeaderName: string;
  authHeaderPrefix: string;
  ownListingPathTemplate: string;
  ownListingSellerNamePath: string;
  ownListingCurrentPricePath: string;
  ownListingCurrencyPath: string;
  ownListingCapturedAtPath: string;
  ownListingSellerSkuPath: string;
  ownListingStockQuantityPath: string;
  ownListingListingStatusPath: string;
  updatedAt?: string;
};

export type TakealotSellerApiSettingsReport = {
  settings: TakealotSellerApiSettingsView;
  readiness: TakealotSellerApiReadiness;
};

const DEFAULT_SETTINGS_FILE_PATH = join(
  process.cwd(),
  "data",
  "takealot-seller-api-settings.json"
);

function normalizeOptionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function maskApiKey(apiKey: string | undefined): string | null {
  if (!apiKey) {
    return null;
  }

  const visible = apiKey.slice(-4);
  return `${"*".repeat(Math.max(apiKey.length - visible.length, 4))}${visible}`;
}

function serializeSettings(
  settings: TakealotSellerApiPersistedSettings
): TakealotSellerApiPersistedSettings {
  return Object.fromEntries(
    Object.entries(settings).filter(([, value]) => value !== undefined)
  ) as TakealotSellerApiPersistedSettings;
}

export function getTakealotSellerApiSettingsFilePath(
  env: EnvLike = process.env
): string {
  return env.TAKEALOT_SELLER_API_SETTINGS_FILE_PATH?.trim() || DEFAULT_SETTINGS_FILE_PATH;
}

export function readPersistedTakealotSellerApiSettingsSync(
  env: EnvLike = process.env
): TakealotSellerApiPersistedSettings {
  try {
    const raw = readFileSync(getTakealotSellerApiSettingsFilePath(env), "utf8");
    return JSON.parse(raw) as TakealotSellerApiPersistedSettings;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

export function mergeTakealotSellerApiEnv(
  env: EnvLike = process.env
): EnvLike {
  const persisted = readPersistedTakealotSellerApiSettingsSync(env);

  return {
    ...env,
    TAKEALOT_SELLER_API_KEY:
      persisted.apiKey ?? normalizeOptionalString(env.TAKEALOT_SELLER_API_KEY),
    TAKEALOT_SELLER_API_BASE_URL:
      persisted.baseUrl ?? normalizeOptionalString(env.TAKEALOT_SELLER_API_BASE_URL),
    TAKEALOT_SELLER_API_DRY_RUN:
      persisted.dryRun === undefined
        ? env.TAKEALOT_SELLER_API_DRY_RUN
        : String(persisted.dryRun),
    TAKEALOT_SELLER_API_AUTH_HEADER_NAME:
      persisted.authHeaderName ??
      normalizeOptionalString(env.TAKEALOT_SELLER_API_AUTH_HEADER_NAME),
    TAKEALOT_SELLER_API_AUTH_HEADER_PREFIX:
      persisted.authHeaderPrefix ??
      normalizeOptionalString(env.TAKEALOT_SELLER_API_AUTH_HEADER_PREFIX),
    TAKEALOT_SELLER_API_OWN_LISTING_PATH_TEMPLATE:
      persisted.ownListingPathTemplate ??
      normalizeOptionalString(env.TAKEALOT_SELLER_API_OWN_LISTING_PATH_TEMPLATE),
    TAKEALOT_SELLER_API_OWN_LISTING_SELLER_NAME_PATH:
      persisted.ownListingSellerNamePath ??
      normalizeOptionalString(env.TAKEALOT_SELLER_API_OWN_LISTING_SELLER_NAME_PATH),
    TAKEALOT_SELLER_API_OWN_LISTING_CURRENT_PRICE_PATH:
      persisted.ownListingCurrentPricePath ??
      normalizeOptionalString(env.TAKEALOT_SELLER_API_OWN_LISTING_CURRENT_PRICE_PATH),
    TAKEALOT_SELLER_API_OWN_LISTING_CURRENCY_PATH:
      persisted.ownListingCurrencyPath ??
      normalizeOptionalString(env.TAKEALOT_SELLER_API_OWN_LISTING_CURRENCY_PATH),
    TAKEALOT_SELLER_API_OWN_LISTING_CAPTURED_AT_PATH:
      persisted.ownListingCapturedAtPath ??
      normalizeOptionalString(env.TAKEALOT_SELLER_API_OWN_LISTING_CAPTURED_AT_PATH),
    TAKEALOT_SELLER_API_OWN_LISTING_SELLER_SKU_PATH:
      persisted.ownListingSellerSkuPath ??
      normalizeOptionalString(env.TAKEALOT_SELLER_API_OWN_LISTING_SELLER_SKU_PATH),
    TAKEALOT_SELLER_API_OWN_LISTING_STOCK_QUANTITY_PATH:
      persisted.ownListingStockQuantityPath ??
      normalizeOptionalString(env.TAKEALOT_SELLER_API_OWN_LISTING_STOCK_QUANTITY_PATH),
    TAKEALOT_SELLER_API_OWN_LISTING_LISTING_STATUS_PATH:
      persisted.ownListingListingStatusPath ??
      normalizeOptionalString(env.TAKEALOT_SELLER_API_OWN_LISTING_LISTING_STATUS_PATH)
  };
}

export function getTakealotSellerApiSettingsReport(
  env: EnvLike = process.env
): TakealotSellerApiSettingsReport {
  const mergedEnv = mergeTakealotSellerApiEnv(env);
  const persisted = readPersistedTakealotSellerApiSettingsSync(env);
  const apiKey = normalizeOptionalString(mergedEnv.TAKEALOT_SELLER_API_KEY);

  return {
    settings: {
      apiKeyConfigured: Boolean(apiKey),
      apiKeyPreview: maskApiKey(apiKey),
      baseUrl: normalizeOptionalString(mergedEnv.TAKEALOT_SELLER_API_BASE_URL) ?? "",
      dryRun: mergedEnv.TAKEALOT_SELLER_API_DRY_RUN !== "false",
      authHeaderName:
        normalizeOptionalString(mergedEnv.TAKEALOT_SELLER_API_AUTH_HEADER_NAME) ?? "",
      authHeaderPrefix:
        normalizeOptionalString(mergedEnv.TAKEALOT_SELLER_API_AUTH_HEADER_PREFIX) ?? "",
      ownListingPathTemplate:
        normalizeOptionalString(
          mergedEnv.TAKEALOT_SELLER_API_OWN_LISTING_PATH_TEMPLATE
        ) ?? "",
      ownListingSellerNamePath:
        normalizeOptionalString(
          mergedEnv.TAKEALOT_SELLER_API_OWN_LISTING_SELLER_NAME_PATH
        ) ?? "",
      ownListingCurrentPricePath:
        normalizeOptionalString(
          mergedEnv.TAKEALOT_SELLER_API_OWN_LISTING_CURRENT_PRICE_PATH
        ) ?? "",
      ownListingCurrencyPath:
        normalizeOptionalString(
          mergedEnv.TAKEALOT_SELLER_API_OWN_LISTING_CURRENCY_PATH
        ) ?? "",
      ownListingCapturedAtPath:
        normalizeOptionalString(
          mergedEnv.TAKEALOT_SELLER_API_OWN_LISTING_CAPTURED_AT_PATH
        ) ?? "",
      ownListingSellerSkuPath:
        normalizeOptionalString(
          mergedEnv.TAKEALOT_SELLER_API_OWN_LISTING_SELLER_SKU_PATH
        ) ?? "",
      ownListingStockQuantityPath:
        normalizeOptionalString(
          mergedEnv.TAKEALOT_SELLER_API_OWN_LISTING_STOCK_QUANTITY_PATH
        ) ?? "",
      ownListingListingStatusPath:
        normalizeOptionalString(
          mergedEnv.TAKEALOT_SELLER_API_OWN_LISTING_LISTING_STATUS_PATH
        ) ?? "",
      updatedAt: persisted.updatedAt
    },
    readiness: getTakealotSellerApiReadiness(mergedEnv)
  };
}

export async function updateTakealotSellerApiSettings(
  patch: TakealotSellerApiSettingsPatch,
  env: EnvLike = process.env
): Promise<TakealotSellerApiSettingsReport> {
  const current = readPersistedTakealotSellerApiSettingsSync(env);
  const next: TakealotSellerApiPersistedSettings = {
    ...current,
    updatedAt: new Date().toISOString()
  };

  if (normalizeOptionalString(patch.apiKey)) {
    next.apiKey = normalizeOptionalString(patch.apiKey);
  }

  if (patch.baseUrl !== undefined) {
    next.baseUrl = normalizeOptionalString(patch.baseUrl);
  }

  if (patch.dryRun !== undefined) {
    next.dryRun = patch.dryRun;
  }

  if (patch.authHeaderName !== undefined) {
    next.authHeaderName = normalizeOptionalString(patch.authHeaderName);
  }

  if (patch.authHeaderPrefix !== undefined) {
    next.authHeaderPrefix = normalizeOptionalString(patch.authHeaderPrefix);
  }

  if (patch.ownListingPathTemplate !== undefined) {
    next.ownListingPathTemplate = normalizeOptionalString(
      patch.ownListingPathTemplate
    );
  }

  if (patch.ownListingSellerNamePath !== undefined) {
    next.ownListingSellerNamePath = normalizeOptionalString(
      patch.ownListingSellerNamePath
    );
  }

  if (patch.ownListingCurrentPricePath !== undefined) {
    next.ownListingCurrentPricePath = normalizeOptionalString(
      patch.ownListingCurrentPricePath
    );
  }

  if (patch.ownListingCurrencyPath !== undefined) {
    next.ownListingCurrencyPath = normalizeOptionalString(
      patch.ownListingCurrencyPath
    );
  }

  if (patch.ownListingCapturedAtPath !== undefined) {
    next.ownListingCapturedAtPath = normalizeOptionalString(
      patch.ownListingCapturedAtPath
    );
  }

  if (patch.ownListingSellerSkuPath !== undefined) {
    next.ownListingSellerSkuPath = normalizeOptionalString(
      patch.ownListingSellerSkuPath
    );
  }

  if (patch.ownListingStockQuantityPath !== undefined) {
    next.ownListingStockQuantityPath = normalizeOptionalString(
      patch.ownListingStockQuantityPath
    );
  }

  if (patch.ownListingListingStatusPath !== undefined) {
    next.ownListingListingStatusPath = normalizeOptionalString(
      patch.ownListingListingStatusPath
    );
  }

  const filePath = getTakealotSellerApiSettingsFilePath(env);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(serializeSettings(next), null, 2));

  return getTakealotSellerApiSettingsReport(env);
}
