import { randomUUID } from "node:crypto";
import {
  calculateSuggestedPrice,
  createExecutionPreview
} from "@/core/repricing";
import type {
  MarketSnapshot,
  MarketOffer,
  PriceExecution,
  ProductMonitor,
  ProviderKind,
  RepricingRule
} from "@/core/types";
import {
  isSellerCatalogProvider,
  resolveProductProviders,
  type MarketIntelligenceProvider,
  type MarketplaceProvider,
  type OwnListingSnapshot,
  type SellerCatalogOffer,
  type SellerOperationsProvider
} from "@/integrations/marketplace";
import { seedProducts } from "./fixtures";
import type { JsonProductStore, StoreState } from "./store";

type RulePatch = Partial<RepricingRule>;
type ProviderPatch = Partial<
  Pick<ProductMonitor, "sellerProvider" | "marketProvider">
>;
type ProductSettingsPatch = Partial<Pick<ProductMonitor, "active">>;
type ManualMarketSnapshotPatch = {
  sellerName: string;
  price: number;
  currency?: "ZAR";
};

type ProductServiceOptions = {
  store: JsonProductStore;
  providers?: Record<string, MarketplaceProvider>;
  sellerProviders?: Record<string, SellerOperationsProvider>;
  marketProviders?: Record<string, MarketIntelligenceProvider>;
};

export class ProductService {
  private readonly store: JsonProductStore;
  private readonly sellerProviders: Record<string, SellerOperationsProvider>;
  private readonly marketProviders: Record<string, MarketIntelligenceProvider>;

  constructor(options: ProductServiceOptions) {
    this.store = options.store;
    const sharedProviders = options.providers ?? {};

    this.sellerProviders = {
      ...sharedProviders,
      ...(options.sellerProviders ?? {})
    };
    this.marketProviders = {
      ...sharedProviders,
      ...(options.marketProviders ?? {})
    };
  }

  async listProducts(): Promise<ProductMonitor[]> {
    const state = await this.ensureState();
    return state.products;
  }

  async listExecutions(): Promise<PriceExecution[]> {
    const state = await this.ensureState();
    return state.executions;
  }

  async listMarketSnapshots(productId?: string): Promise<MarketSnapshot[]> {
    const state = await this.ensureState();

    if (!productId) {
      return state.marketSnapshots;
    }

    return state.marketSnapshots.filter((snapshot) => snapshot.productId === productId);
  }

  async syncSellerCatalog(): Promise<{
    syncedCount: number;
    skippedCount: number;
    products: ProductMonitor[];
  }> {
    const state = await this.ensureState();
    const provider = this.sellerProviders["takealot-seller-api"];

    if (!provider) {
      throw new Error("Missing seller provider: takealot-seller-api");
    }

    if (!isSellerCatalogProvider(provider)) {
      throw new Error(
        "Configured takealot-seller-api provider does not support seller catalog sync."
      );
    }

    const existingBySku = new Map(
      state.products
        .filter((product) => product.sellerSku || product.id)
        .map((product) => [product.sellerSku ?? product.id, product] as const)
    );
    const importedProducts = (await provider.listOwnOffers()).map((offer) =>
      this.mapSellerCatalogOfferToProduct(offer, existingBySku.get(offer.sellerSku))
    );
    const isDemoSeedCatalog =
      state.products.length > 0 &&
      state.products.every(
        (product) =>
          product.provider === "mock" &&
          seedProducts.some((seed) => seed.id === product.id)
      );
    const preservedProducts = isDemoSeedCatalog
      ? []
      : state.products.filter((product) => {
          const sellerSku = product.sellerSku ?? product.id;
          return !importedProducts.some((entry) => entry.sellerSku === sellerSku);
        });

    state.products = [...importedProducts, ...preservedProducts];
    await this.store.write(state);

    return {
      syncedCount: importedProducts.length,
      skippedCount: 0,
      products: state.products
    };
  }

  async updateRule(productId: string, patch: RulePatch): Promise<ProductMonitor> {
    const state = await this.ensureState();
    const product = this.getProduct(state, productId);

    product.rule = {
      ...product.rule,
      ...patch
    };

    await this.store.write(state);

    return product;
  }

  async updateProductSettings(
    productId: string,
    patch: ProductSettingsPatch
  ): Promise<ProductMonitor> {
    const state = await this.ensureState();
    const product = this.getProduct(state, productId);

    if (patch.active !== undefined) {
      product.active = patch.active;
    }

    await this.store.write(state);

    return product;
  }

  async updateProductProviders(
    productId: string,
    patch: ProviderPatch
  ): Promise<ProductMonitor> {
    const state = await this.ensureState();
    const product = this.getProduct(state, productId);

    if (patch.sellerProvider !== undefined) {
      product.sellerProvider = patch.sellerProvider;
    }

    if (patch.marketProvider !== undefined) {
      product.marketProvider = patch.marketProvider;
    }

    await this.store.write(state);

    return product;
  }

  async syncOwnListing(productId: string): Promise<{
    product: ProductMonitor;
    ownListing: OwnListingSnapshot;
    syncedAt: string;
  }> {
    const state = await this.ensureState();
    const product = this.getProduct(state, productId);
    const { sellerProvider } = this.getProviders(product);
    const ownListing = await sellerProvider.fetchOwnListing(product);

    product.ownSellerName = ownListing.sellerName;
    product.currentPrice = ownListing.currentPrice;
    product.sellerSku = ownListing.sellerSku;
    product.stockQuantity = ownListing.stockQuantity;
    product.listingStatus = ownListing.listingStatus;
    product.lastSellerSyncAt = ownListing.capturedAt;

    await this.store.write(state);

    return {
      product,
      ownListing,
      syncedAt: ownListing.capturedAt
    };
  }

  async syncActiveOwnListings(): Promise<{
    results: Array<{
      product: ProductMonitor;
      ownListing: OwnListingSnapshot;
      syncedAt: string;
    }>;
    summary: {
      requestedCount: number;
      syncedCount: number;
      skippedCount: number;
    };
  }> {
    const products = await this.listProducts();
    const results = [];

    for (const product of products) {
      if (product.active === false) {
        continue;
      }

      results.push(await this.syncOwnListing(product.id));
    }

    return {
      results,
      summary: {
        requestedCount: products.length,
        syncedCount: results.length,
        skippedCount: products.length - results.length
      }
    };
  }

  async refreshProduct(productId: string): Promise<{
    product: ProductMonitor;
    offers: ProductMonitor["lastOffers"];
    preview: ProductMonitor["lastPreview"];
    checkedAt: string;
    snapshot: MarketSnapshot;
  }> {
    const state = await this.ensureState();
    const product = this.getProduct(state, productId);
    const { sellerProvider, marketProviderKey, marketProvider } =
      this.getProviders(product);
    const ownListing = await sellerProvider.fetchOwnListing(product);
    const offers = this.ensureOwnOffer(
      await marketProvider.fetchOffers(product),
      product,
      ownListing
    );
    const preview = createExecutionPreview(product, offers);
    const checkedAt = new Date().toISOString();

    product.lastOffers = offers;
    product.lastPreview = preview;
    product.lastCheckedAt = checkedAt;
    const snapshot = this.recordMarketSnapshot(
      state,
      product,
      marketProviderKey,
      offers,
      preview,
      checkedAt,
      "refresh"
    );

    await this.store.write(state);

    return {
      product,
      offers,
      preview,
      checkedAt,
      snapshot
    };
  }

  async updateManualMarketSnapshot(
    productId: string,
    patch: ManualMarketSnapshotPatch
  ): Promise<{
    product: ProductMonitor;
    offers: ProductMonitor["lastOffers"];
    preview: ProductMonitor["lastPreview"];
    checkedAt: string;
    snapshot: MarketSnapshot;
  }> {
    const state = await this.ensureState();
    const product = this.getProduct(state, productId);
    const checkedAt = new Date().toISOString();

    product.manualMarketSnapshot = {
      competitor: {
        sellerName: patch.sellerName,
        price: patch.price,
        currency: patch.currency ?? "ZAR"
      },
      importedAt: checkedAt
    };
    product.marketProvider = "manual-import";

    const offers = this.ensureOwnOffer(
      [product.manualMarketSnapshot.competitor],
      product
    );
    const preview = createExecutionPreview(product, offers);

    product.lastOffers = offers;
    product.lastPreview = preview;
    product.lastCheckedAt = checkedAt;
    const snapshot = this.recordMarketSnapshot(
      state,
      product,
      "manual-import",
      offers,
      preview,
      checkedAt,
      "manual-import"
    );

    await this.store.write(state);

    return {
      product,
      offers,
      preview,
      checkedAt,
      snapshot
    };
  }

  async applySuggestedPrice(
    productId: string
  ): Promise<{ product: ProductMonitor; execution: PriceExecution }> {
    const state = await this.ensureState();
    const product = this.getProduct(state, productId);
    const { sellerProviderKey, sellerProvider, marketProvider } =
      this.getProviders(product);
    const ownListing = await sellerProvider.fetchOwnListing(product);
    const offers = this.ensureOwnOffer(
      await marketProvider.fetchOffers(product),
      product,
      ownListing
    );
    const suggestion = calculateSuggestedPrice(product, offers);
    const preview = createExecutionPreview(product, offers);
    let trackedOffers = offers;
    let appliedPrice: number | undefined;
    let executedAt = new Date().toISOString();
    let status: PriceExecution["status"] = "skipped";

    if (suggestion.shouldUpdate) {
      const result = await sellerProvider.applyPrice(
        product.id,
        suggestion.recommendedPrice,
        product
      );
      executedAt = result.appliedAt;

      if (result.mode === "dry-run") {
        status = "dry_run";
      } else {
        appliedPrice = result.appliedPrice;
        product.currentPrice = result.appliedPrice;
        status = "applied";
        trackedOffers = offers.map((offer) =>
          offer.sellerName === product.ownSellerName
            ? {
                ...offer,
                price: result.appliedPrice
              }
            : offer
        );
      }
    }

    product.lastOffers = trackedOffers;
    product.lastCheckedAt = executedAt;
    product.lastPreview = createExecutionPreview(product, trackedOffers);

    const execution: PriceExecution = {
      id: randomUUID(),
      productId: product.id,
      productTitle: product.title,
      provider: sellerProviderKey,
      previousPrice: preview.currentPrice,
      suggestedPrice: preview.suggestedPrice,
      appliedPrice,
      status,
      reason: preview.reason,
      margin: preview.margin,
      matchedCompetitor: preview.matchedCompetitor,
      executedAt
    };

    state.executions.unshift(execution);
    await this.store.write(state);

    return { product, execution };
  }

  async refreshActiveProducts(): Promise<
    Array<{
      product: ProductMonitor;
      offers: ProductMonitor["lastOffers"];
      preview: ProductMonitor["lastPreview"];
      checkedAt: string;
      snapshot: MarketSnapshot;
    }>
  > {
    const products = await this.listProducts();
    const results = [];

    for (const product of products) {
      if (product.active === false) {
        continue;
      }

      results.push(await this.refreshProduct(product.id));
    }

    return results;
  }

  private async ensureState(): Promise<StoreState> {
    const state = await this.store.read();
    let mutated = false;

    if (state.products.length === 0) {
      state.products = structuredClone(seedProducts);
      mutated = true;
    }

    if (!Array.isArray(state.marketSnapshots)) {
      state.marketSnapshots = [];
      mutated = true;
    }

    for (const product of state.products) {
      if (product.active === undefined) {
        product.active = true;
        mutated = true;
      }
    }

    if (mutated) {
      await this.store.write(state);
    }

    return state;
  }

  private getProduct(state: StoreState, productId: string): ProductMonitor {
    const product = state.products.find((entry) => entry.id === productId);

    if (!product) {
      throw new Error(`Unknown product: ${productId}`);
    }

    return product;
  }

  private mapSellerCatalogOfferToProduct(
    offer: SellerCatalogOffer,
    existing?: ProductMonitor
  ): ProductMonitor {
    const defaultRule = structuredClone(seedProducts[0]!.rule);

    return {
      id: offer.sellerSku,
      title: offer.title,
      productUrl:
        existing?.productUrl ??
        this.buildPublicProductUrl(offer.title, offer.productlineId),
      offerUrl: existing?.offerUrl ?? "",
      provider: "takealot-seller-api",
      sellerProvider: "takealot-seller-api",
      marketProvider: existing?.marketProvider ?? "takealot-browser",
      ownSellerName: existing?.ownSellerName ?? "My Store",
      currentPrice: offer.currentPrice,
      offerId: offer.offerId,
      tsinId: offer.tsinId,
      sellerSku: offer.sellerSku,
      imageUrl: offer.imageUrl,
      productlineId: offer.productlineId,
      benchmarkPrice: offer.benchmarkPrice,
      listingQuality: offer.listingQuality,
      stockQuantity: offer.stockQuantity,
      listingStatus: offer.listingStatus,
      lastSellerSyncAt: existing?.lastSellerSyncAt,
      active: existing?.active ?? true,
      rule: existing?.rule ?? defaultRule,
      manualMarketSnapshot: existing?.manualMarketSnapshot,
      lastOffers: existing?.lastOffers,
      lastCheckedAt: existing?.lastCheckedAt,
      lastPreview: existing?.lastPreview
    };
  }

  private buildPublicProductUrl(title: string, productlineId?: number): string {
    if (!productlineId) {
      return "https://www.takealot.com";
    }

    const slug = title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return `https://www.takealot.com/${slug}/PLID${productlineId}`;
  }

  private getProviders(product: ProductMonitor): {
    sellerProviderKey: ProviderKind;
    marketProviderKey: ProviderKind;
    sellerProvider: SellerOperationsProvider;
    marketProvider: MarketIntelligenceProvider;
  } {
    const { sellerProvider, marketProvider } = resolveProductProviders(product);
    const resolvedSellerProvider = this.sellerProviders[sellerProvider];
    const resolvedMarketProvider = this.marketProviders[marketProvider];

    if (!resolvedSellerProvider) {
      throw new Error(`Missing seller provider: ${sellerProvider}`);
    }

    if (!resolvedMarketProvider) {
      throw new Error(`Missing market provider: ${marketProvider}`);
    }

    return {
      sellerProviderKey: sellerProvider,
      marketProviderKey: marketProvider,
      sellerProvider: resolvedSellerProvider,
      marketProvider: resolvedMarketProvider
    };
  }

  private ensureOwnOffer(
    offers: MarketOffer[],
    product: ProductMonitor,
    ownListing?: Pick<OwnListingSnapshot, "currentPrice" | "currency">
  ) {
    if (ownListing) {
      product.currentPrice = ownListing.currentPrice;
    }

    const existing = offers.find(
      (offer) => offer.sellerName === product.ownSellerName
    );

    if (existing) {
      return offers;
    }

    return [
      ...offers,
      {
        sellerName: product.ownSellerName,
        price: ownListing?.currentPrice ?? product.currentPrice,
        currency: ownListing?.currency ?? "ZAR"
      }
    ];
  }

  private recordMarketSnapshot(
    state: StoreState,
    product: ProductMonitor,
    marketProvider: ProviderKind,
    offers: MarketOffer[],
    preview: NonNullable<ProductMonitor["lastPreview"]>,
    capturedAt: string,
    source: MarketSnapshot["source"]
  ) {
    const snapshot: MarketSnapshot = {
      id: randomUUID(),
      productId: product.id,
      productTitle: product.title,
      marketProvider,
      offers,
      preview,
      capturedAt,
      source
    };

    state.marketSnapshots.unshift(snapshot);

    return snapshot;
  }
}
