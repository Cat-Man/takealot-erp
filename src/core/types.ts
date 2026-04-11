export type CurrencyCode = "ZAR";

export type ProviderKind =
  | "mock"
  | "takealot-browser"
  | "takealot-seller-api"
  | "manual-import";

export type MarketOffer = {
  sellerName: string;
  price: number;
  currency: CurrencyCode;
};

export type RepricingRule = {
  enabled: boolean;
  undercutBy: number;
  floorPrice: number;
  ceilingPrice?: number;
  costPrice: number;
  minMargin: number;
};

export type ManualMarketSnapshot = {
  competitor: MarketOffer;
  importedAt: string;
};

export type MarketSnapshotSource = "refresh" | "manual-import";

export type MarketSnapshot = {
  id: string;
  productId: string;
  productTitle: string;
  marketProvider: ProviderKind;
  offers: MarketOffer[];
  preview: ExecutionPreview;
  capturedAt: string;
  source?: MarketSnapshotSource;
};

export type ProductMonitor = {
  id: string;
  title: string;
  productUrl: string;
  offerUrl: string;
  provider: ProviderKind;
  sellerProvider?: ProviderKind;
  marketProvider?: ProviderKind;
  ownSellerName: string;
  currentPrice: number;
  offerId?: number;
  tsinId?: number;
  sellerSku?: string;
  imageUrl?: string;
  productlineId?: number;
  benchmarkPrice?: number;
  listingQuality?: number;
  stockQuantity?: number;
  listingStatus?: string;
  lastSellerSyncAt?: string;
  active?: boolean;
  rule: RepricingRule;
  manualMarketSnapshot?: ManualMarketSnapshot;
  lastOffers?: MarketOffer[];
  lastCheckedAt?: string;
  lastPreview?: ExecutionPreview;
};

export type SuggestionReason =
  | "match_lowest_competitor"
  | "floor_price_guard"
  | "ceiling_price_guard"
  | "no_competitor_offer";

export type PriceSuggestion = {
  recommendedPrice: number;
  reason: SuggestionReason;
  lowestCompetitorPrice?: number;
  matchedCompetitor?: MarketOffer;
  shouldUpdate: boolean;
  margin: number;
};

export type ExecutionPreview = {
  currentPrice: number;
  suggestedPrice: number;
  delta: number;
  margin: number;
  matchedCompetitor?: MarketOffer;
  reason: SuggestionReason;
  shouldUpdate: boolean;
};

export type ExecutionStatus = "applied" | "skipped" | "failed" | "dry_run";

export type PriceExecution = {
  id: string;
  productId: string;
  productTitle: string;
  provider: ProviderKind;
  previousPrice: number;
  suggestedPrice: number;
  appliedPrice?: number;
  status: ExecutionStatus;
  reason: SuggestionReason;
  margin: number;
  matchedCompetitor?: MarketOffer;
  executedAt: string;
};
