"use client";

import { useState, useTransition } from "react";
import type {
  MarketSnapshot,
  PriceExecution,
  ProductMonitor
} from "@/core/types";
import type { TakealotSellerApiSettingsReport } from "@/lib/takealot-seller-api-settings";
import { ExecutionTable } from "./execution-table";
import { ProductCard } from "./product-card";
import { SellerApiSettingsPanel } from "./seller-api-settings-panel";
import { SellerOfferTable } from "./seller-offer-table";

type DashboardProps = {
  initialProducts: ProductMonitor[];
  initialExecutions: PriceExecution[];
  initialMarketSnapshots: MarketSnapshot[];
  initialSellerApiSettings: TakealotSellerApiSettingsReport;
};

type RefreshResponse = {
  product: ProductMonitor;
  offers: ProductMonitor["lastOffers"];
  preview: ProductMonitor["lastPreview"];
  checkedAt: string;
  snapshot: MarketSnapshot;
};

type ApplyResponse = {
  product: ProductMonitor;
  execution: PriceExecution;
};

type OwnListingSyncResponse = {
  product: ProductMonitor;
  syncedAt: string;
};

type RuleResponse = {
  product: ProductMonitor;
};

type ProviderResponse = {
  product: ProductMonitor;
};

type SettingsResponse = {
  product: ProductMonitor;
};

type ManualMarketResponse = RefreshResponse;

type BatchRefreshResponse = {
  results: RefreshResponse[];
  summary: {
    requestedCount: number;
    refreshedCount: number;
    skippedCount: number;
  };
};

type BatchOwnListingSyncResponse = {
  results: OwnListingSyncResponse[];
  summary: {
    requestedCount: number;
    syncedCount: number;
    skippedCount: number;
  };
};

type SellerCatalogSyncResponse = {
  summary: {
    syncedCount: number;
    skippedCount: number;
  };
  products: ProductMonitor[];
};

function mergeSnapshots(
  current: MarketSnapshot[],
  incoming: MarketSnapshot[]
): MarketSnapshot[] {
  const seen = new Set<string>();
  const merged: MarketSnapshot[] = [];

  for (const snapshot of [...incoming, ...current]) {
    if (seen.has(snapshot.id)) {
      continue;
    }

    seen.add(snapshot.id);
    merged.push(snapshot);
  }

  return merged;
}

export function Dashboard({
  initialProducts,
  initialExecutions,
  initialMarketSnapshots,
  initialSellerApiSettings
}: DashboardProps) {
  const [products, setProducts] = useState(initialProducts);
  const [executions, setExecutions] = useState(initialExecutions);
  const [marketSnapshots, setMarketSnapshots] = useState(initialMarketSnapshots);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sellerCatalogProducts = products.filter(
    (product) => product.provider === "takealot-seller-api"
  );
  const cardProducts = products.filter(
    (product) => product.provider !== "takealot-seller-api"
  );

  async function syncSellerCatalog() {
    const response = await fetch("/api/products/sync-seller-catalog", {
      method: "POST"
    });
    const payload = (await response.json()) as SellerCatalogSyncResponse;

    setProducts(payload.products);
    setMessage(
      `已同步 ${payload.summary.syncedCount} 个店铺商品，跳过 ${payload.summary.skippedCount} 个`
    );
  }

  async function refreshProduct(productId: string) {
    const response = await fetch(`/api/products/${productId}/refresh`, {
      method: "POST"
    });
    const payload = (await response.json()) as RefreshResponse;

    setProducts((current) =>
      current.map((product) => (product.id === productId ? payload.product : product))
    );
    setMarketSnapshots((current) => mergeSnapshots(current, [payload.snapshot]));
    setMessage(`已刷新 ${payload.product.title} 的市场报价`);
  }

  async function refreshActiveProductsBatch() {
    const response = await fetch("/api/products/refresh-active", {
      method: "POST"
    });
    const payload = (await response.json()) as BatchRefreshResponse;
    const refreshedProducts = new Map(
      payload.results.map((result) => [result.product.id, result.product])
    );

    setProducts((current) =>
      current.map((product) => refreshedProducts.get(product.id) ?? product)
    );
    setMarketSnapshots((current) =>
      mergeSnapshots(
        current,
        payload.results.map((result) => result.snapshot)
      )
    );
    setMessage(
      `已批量刷新 ${payload.summary.refreshedCount} 个 active 商品，跳过 ${payload.summary.skippedCount} 个`
    );
  }

  async function syncOwnListing(productId: string) {
    const response = await fetch(`/api/products/${productId}/sync-own-listing`, {
      method: "POST"
    });
    const payload = (await response.json()) as OwnListingSyncResponse;

    setProducts((current) =>
      current.map((product) => (product.id === productId ? payload.product : product))
    );
    setMessage(`已同步 ${payload.product.title} 的卖家数据`);
  }

  async function syncActiveOwnListingsBatch() {
    const response = await fetch("/api/products/sync-own-listings-active", {
      method: "POST"
    });
    const payload = (await response.json()) as BatchOwnListingSyncResponse;
    const syncedProducts = new Map(
      payload.results.map((result) => [result.product.id, result.product])
    );

    setProducts((current) =>
      current.map((product) => syncedProducts.get(product.id) ?? product)
    );
    setMessage(
      `已批量同步 ${payload.summary.syncedCount} 个 active 商品的卖家数据，跳过 ${payload.summary.skippedCount} 个`
    );
  }

  async function applyPrice(productId: string) {
    const response = await fetch(`/api/products/${productId}/apply`, {
      method: "POST"
    });
    const payload = (await response.json()) as ApplyResponse;

    setProducts((current) =>
      current.map((product) => (product.id === productId ? payload.product : product))
    );
    setExecutions((current) => [payload.execution, ...current]);
    setMessage(`已执行 ${payload.product.title} 的调价动作`);
  }

  async function saveRule(
    productId: string,
    patch: Pick<
      ProductMonitor["rule"],
      "undercutBy" | "floorPrice" | "ceilingPrice" | "costPrice" | "minMargin"
    >
  ) {
    const response = await fetch(`/api/products/${productId}/rule`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(patch)
    });
    const payload = (await response.json()) as RuleResponse;

    setProducts((current) =>
      current.map((product) => (product.id === productId ? payload.product : product))
    );
    setMessage(`已保存 ${payload.product.title} 的规则`);
  }

  async function saveProviders(
    productId: string,
    patch: Pick<ProductMonitor, "sellerProvider" | "marketProvider">
  ) {
    const response = await fetch(`/api/products/${productId}/providers`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(patch)
    });
    const payload = (await response.json()) as ProviderResponse;

    setProducts((current) =>
      current.map((product) => (product.id === productId ? payload.product : product))
    );
    setMessage(`已保存 ${payload.product.title} 的 provider 绑定`);
  }

  async function saveManualMarket(
    productId: string,
    patch: { sellerName: string; price: number }
  ) {
    const response = await fetch(`/api/products/${productId}/manual-market`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(patch)
    });
    const payload = (await response.json()) as ManualMarketResponse;

    setProducts((current) =>
      current.map((product) => (product.id === productId ? payload.product : product))
    );
    setMarketSnapshots((current) => mergeSnapshots(current, [payload.snapshot]));
    setMessage(`已保存 ${payload.product.title} 的手工最低价`);
  }

  async function saveSettings(
    productId: string,
    patch: Pick<ProductMonitor, "active">
  ) {
    const response = await fetch(`/api/products/${productId}/settings`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(patch)
    });
    const payload = (await response.json()) as SettingsResponse;

    setProducts((current) =>
      current.map((product) => (product.id === productId ? payload.product : product))
    );
    setMessage(
      `${payload.product.title} 已${payload.product.active === false ? "停用" : "启用"}监控`
    );
  }

  return (
    <section className="dashboard">
      <SellerApiSettingsPanel
        initialReport={initialSellerApiSettings}
        disabled={isPending}
        onSaved={(nextMessage) => {
          setMessage(nextMessage);
        }}
      />

      <div className="dashboard-meta">
        <div>
          <p className="section-label">运营看板</p>
          <h2>当前监控商品</h2>
        </div>
        <div className="dashboard-toolbar">
          <button
            type="button"
            className="ghost-button"
            disabled={isPending}
            onClick={() => {
              startTransition(() => {
                void refreshActiveProductsBatch();
              });
            }}
          >
            刷新 active 商品
          </button>
          <button
            type="button"
            className="ghost-button"
            disabled={isPending}
            onClick={() => {
              startTransition(() => {
                void syncActiveOwnListingsBatch();
              });
            }}
          >
            同步 active 卖家数据
          </button>
          <p className="status-note">
            {message ??
              "真实接入走 Seller API-first；browser fallback 仅作后备。先用 mock 验证规则，再补 API key、权限和市场数据来源。"}
          </p>
        </div>
      </div>

      <SellerOfferTable
        products={sellerCatalogProducts}
        disabled={isPending}
        onSyncCatalog={() => {
          startTransition(() => {
            void syncSellerCatalog();
          });
        }}
        onRefreshProduct={(productId) => {
          startTransition(() => {
            void refreshProduct(productId);
          });
        }}
        onSyncOwnListing={(productId) => {
          startTransition(() => {
            void syncOwnListing(productId);
          });
        }}
        onApplyPrice={(productId) => {
          startTransition(() => {
            void applyPrice(productId);
          });
        }}
      />

      <div className="product-grid">
        {cardProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            snapshots={marketSnapshots.filter((snapshot) => snapshot.productId === product.id)}
            disabled={isPending}
            onRefresh={() => {
              startTransition(() => {
                void refreshProduct(product.id);
              });
            }}
            onApply={() => {
              startTransition(() => {
                void applyPrice(product.id);
              });
            }}
            onSyncOwnListing={() => {
              startTransition(() => {
                void syncOwnListing(product.id);
              });
            }}
            onSaveProviders={(patch) => {
              startTransition(() => {
                void saveProviders(product.id, patch);
              });
            }}
            onSaveManualMarket={(patch) => {
              startTransition(() => {
                void saveManualMarket(product.id, patch);
              });
            }}
            onToggleActive={() => {
              startTransition(() => {
                void saveSettings(product.id, {
                  active: product.active === false
                });
              });
            }}
            onSaveRule={(patch) => {
              startTransition(() => {
                void saveRule(product.id, patch);
              });
            }}
          />
        ))}
      </div>

      <ExecutionTable executions={executions} />
    </section>
  );
}
