import type {
  MarketSnapshot,
  ProductMonitor,
  ProviderKind
} from "@/core/types";
import { resolveProductProviders } from "@/integrations/marketplace";
import { RuleForm } from "./rule-form";

type ProductCardProps = {
  product: ProductMonitor;
  snapshots: MarketSnapshot[];
  disabled?: boolean;
  onRefresh: () => void;
  onApply: () => void;
  onToggleActive: () => void;
  onSaveProviders: (
    patch: Pick<ProductMonitor, "sellerProvider" | "marketProvider">
  ) => void;
  onSaveManualMarket: (patch: { sellerName: string; price: number }) => void;
  onSaveRule: (
    patch: Pick<
      ProductMonitor["rule"],
      "undercutBy" | "floorPrice" | "ceilingPrice" | "costPrice" | "minMargin"
    >
  ) => void;
};

function formatMoney(value: number) {
  return `R${value}`;
}

function formatSnapshotLine(snapshot: MarketSnapshot) {
  const competitor = snapshot.preview.matchedCompetitor;

  if (!competitor) {
    return `${snapshot.marketProvider} / 无竞品`;
  }

  return `${snapshot.marketProvider} / ${competitor.sellerName} / ${formatMoney(competitor.price)}`;
}

const providerOptions: ProviderKind[] = [
  "mock",
  "takealot-seller-api",
  "takealot-browser"
];

export function ProductCard({
  product,
  snapshots,
  disabled,
  onRefresh,
  onApply,
  onToggleActive,
  onSaveProviders,
  onSaveManualMarket,
  onSaveRule
}: ProductCardProps) {
  const preview = product.lastPreview;
  const { sellerProvider, marketProvider } = resolveProductProviders(product);
  const isActive = product.active !== false;

  return (
    <article className="product-card">
      <div className="product-head">
        <div>
          <p className="card-kicker">{product.provider}</p>
          <h3>{product.title}</h3>
        </div>
        <span className="price-chip">现价 {formatMoney(product.currentPrice)}</span>
      </div>

      <div className="monitor-strip">
        <span className={`monitor-chip ${isActive ? "is-on" : "is-off"}`}>
          {isActive ? "监控中" : "已停用"}
        </span>
        <button
          type="button"
          className="ghost-button"
          onClick={onToggleActive}
          disabled={disabled}
        >
          {isActive ? "停用监控" : "启用监控"}
        </button>
      </div>

      <dl className="metric-grid">
        <div>
          <dt>当前卖家</dt>
          <dd>{product.ownSellerName}</dd>
        </div>
        <div>
          <dt>建议价</dt>
          <dd>{preview ? formatMoney(preview.suggestedPrice) : "待刷新"}</dd>
        </div>
        <div>
          <dt>最低竞品</dt>
          <dd>
            {preview?.matchedCompetitor
              ? `${preview.matchedCompetitor.sellerName} / ${formatMoney(preview.matchedCompetitor.price)}`
              : "待刷新"}
          </dd>
        </div>
        <div>
          <dt>最近刷新</dt>
          <dd>{product.lastCheckedAt ? product.lastCheckedAt.slice(11, 19) : "未刷新"}</dd>
        </div>
      </dl>

      <div className="provider-strip">
        <p>{`卖家接入 ${sellerProvider}`}</p>
        <p>{`市场数据 ${marketProvider}`}</p>
        {product.manualMarketSnapshot ? (
          <p>
            {`手工最低竞品 ${product.manualMarketSnapshot.competitor.sellerName} / ${formatMoney(product.manualMarketSnapshot.competitor.price)}`}
          </p>
        ) : null}
      </div>

      {snapshots.length > 0 ? (
        <div className="snapshot-strip">
          <p className="snapshot-title">最近快照</p>
          <ul className="snapshot-list">
            {snapshots.slice(0, 3).map((snapshot) => (
              <li key={snapshot.id}>
                <span>{formatSnapshotLine(snapshot)}</span>
                <span>{snapshot.capturedAt.replace("T", " ").slice(5, 16)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {preview ? (
        <div className="suggestion-strip">
          <strong>{`建议价 ${formatMoney(preview.suggestedPrice)}`}</strong>
          <span>{`变化 ${preview.delta >= 0 ? "+" : ""}${preview.delta}`}</span>
          <span>{`原因 ${preview.reason}`}</span>
        </div>
      ) : null}

      <div className="card-actions">
        <button type="button" onClick={onRefresh} disabled={disabled}>
          刷新市场价
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={onApply}
          disabled={disabled || !preview?.shouldUpdate}
        >
          执行调价
        </button>
      </div>

      <form
        className="rule-form"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);

          onSaveProviders({
            sellerProvider: formData.get("sellerProvider") as ProviderKind,
            marketProvider: formData.get("marketProvider") as ProviderKind
          });
        }}
      >
        <label>
          <span>卖家 provider</span>
          <select
            name="sellerProvider"
            defaultValue={sellerProvider}
            disabled={disabled}
          >
            {providerOptions.map((option) => (
              <option key={`seller-${option}`} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>市场 provider</span>
          <select
            name="marketProvider"
            defaultValue={marketProvider}
            disabled={disabled}
          >
            {providerOptions.map((option) => (
              <option key={`market-${option}`} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="ghost-button" disabled={disabled}>
          保存 Provider
        </button>
      </form>

      <form
        className="rule-form"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);

          onSaveManualMarket({
            sellerName: String(formData.get("manualSellerName") ?? ""),
            price: Number(formData.get("manualPrice"))
          });
        }}
      >
        <label>
          <span>手工竞品卖家</span>
          <input
            name="manualSellerName"
            defaultValue={product.manualMarketSnapshot?.competitor.sellerName ?? ""}
            disabled={disabled}
          />
        </label>
        <label>
          <span>手工最低价</span>
          <input
            name="manualPrice"
            defaultValue={String(product.manualMarketSnapshot?.competitor.price ?? "")}
            disabled={disabled}
          />
        </label>
        <button type="submit" className="ghost-button" disabled={disabled}>
          保存手工最低价
        </button>
      </form>

      <RuleForm product={product} disabled={disabled} onSave={onSaveRule} />
    </article>
  );
}
