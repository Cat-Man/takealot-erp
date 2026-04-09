import { resolveProductProviders } from "@/integrations/marketplace";
import { Dashboard } from "@/components/dashboard";
import { getProductService } from "@/lib/runtime";

async function loadInitialData() {
  const service = getProductService();
  const products = await service.listProducts();

  for (const product of products) {
    const { marketProvider } = resolveProductProviders(product);

    if (marketProvider === "mock" && !product.lastPreview) {
      await service.refreshProduct(product.id);
    }
  }

  return {
    products: await service.listProducts(),
    executions: await service.listExecutions(),
    marketSnapshots: await service.listMarketSnapshots()
  };
}

export default async function Home() {
  const { products, executions, marketSnapshots } = await loadInitialData();

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Takealot Repricing</p>
        <h1>抓最低价，按规则改自己的 Takealot 商品价</h1>
        <p className="lede">
          这是一套本地运营后台。`mock` 模式可以直接演示完整闭环；真实
          Takealot 现在按 `Seller API-first` 设计推进，浏览器自动化只保留为
          `browser fallback`，不再作为主路线。
        </p>
      </section>
      <Dashboard
        initialProducts={products}
        initialExecutions={executions}
        initialMarketSnapshots={marketSnapshots}
      />
    </main>
  );
}
