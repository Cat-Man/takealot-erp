import Image from "next/image";
import type { ProductMonitor } from "@/core/types";

type SellerOfferTableProps = {
  products: ProductMonitor[];
  disabled?: boolean;
  onSyncCatalog: () => void;
  onRefreshProduct: (productId: string) => void;
  onSyncOwnListing: (productId: string) => void;
  onApplyPrice: (productId: string) => void;
};

function formatMoney(value: number | undefined) {
  return value === undefined ? "待刷新" : `R${value}`;
}

export function SellerOfferTable({
  products,
  disabled,
  onSyncCatalog,
  onRefreshProduct,
  onSyncOwnListing,
  onApplyPrice
}: SellerOfferTableProps) {
  return (
    <section className="seller-offer-table">
      <div className="dashboard-meta">
        <div>
          <p className="section-label">店铺商品</p>
          <h2>店铺商品列表</h2>
        </div>
        <div className="dashboard-toolbar">
          <button
            type="button"
            className="ghost-button"
            disabled={disabled}
            onClick={onSyncCatalog}
          >
            同步店铺商品
          </button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>商品</th>
            <th>SKU</th>
            <th>TSIN</th>
            <th>PLID</th>
            <th>当前售价</th>
            <th>最低竞品</th>
            <th>建议价</th>
            <th>状态</th>
            <th>库存</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan={10}>暂无店铺商品，先点击“同步店铺商品”。</td>
            </tr>
          ) : (
            products.map((product) => (
              <tr key={product.id}>
                <td>
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.title}
                      width={40}
                      height={40}
                      unoptimized
                    />
                  ) : null}
                  <span>{product.title}</span>
                </td>
                <td>{product.sellerSku ?? product.id}</td>
                <td>{product.tsinId ?? "-"}</td>
                <td>{product.productlineId ?? "-"}</td>
                <td>{formatMoney(product.currentPrice)}</td>
                <td>
                  {product.lastPreview?.matchedCompetitor
                    ? `${product.lastPreview.matchedCompetitor.sellerName} / ${formatMoney(product.lastPreview.matchedCompetitor.price)}`
                    : "待刷新"}
                </td>
                <td>{formatMoney(product.lastPreview?.suggestedPrice)}</td>
                <td>{product.listingStatus ?? "未同步"}</td>
                <td>{product.stockQuantity ?? "未同步"}</td>
                <td>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onSyncOwnListing(product.id);
                    }}
                  >
                    同步卖家数据
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onRefreshProduct(product.id);
                    }}
                  >
                    刷新市场价
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={disabled || !product.lastPreview?.shouldUpdate}
                    onClick={() => {
                      onApplyPrice(product.id);
                    }}
                  >
                    执行调价
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
