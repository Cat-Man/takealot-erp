import type {
  ExecutionPreview,
  MarketOffer,
  PriceSuggestion,
  ProductMonitor
} from "./types";

export function findLowestCompetitorOffer(
  offers: MarketOffer[],
  ownSellerName: string
): MarketOffer | undefined {
  return offers
    .filter((offer) => offer.sellerName !== ownSellerName)
    .sort((left, right) => left.price - right.price)[0];
}

export function calculateSuggestedPrice(
  product: ProductMonitor,
  offers: MarketOffer[]
): PriceSuggestion {
  const competitor = findLowestCompetitorOffer(offers, product.ownSellerName);

  if (!competitor) {
    return {
      recommendedPrice: product.currentPrice,
      reason: "no_competitor_offer",
      shouldUpdate: false,
      margin: product.currentPrice - product.rule.costPrice
    };
  }

  const marginFloor = product.rule.costPrice + product.rule.minMargin;
  const rawTarget = competitor.price - product.rule.undercutBy;
  const floorBound = Math.max(product.rule.floorPrice, marginFloor);
  const boundedTarget = Math.max(rawTarget, floorBound);
  const finalTarget =
    typeof product.rule.ceilingPrice === "number"
      ? Math.min(boundedTarget, product.rule.ceilingPrice)
      : boundedTarget;

  let reason: PriceSuggestion["reason"] = "match_lowest_competitor";

  if (finalTarget === floorBound && rawTarget < floorBound) {
    reason = "floor_price_guard";
  } else if (
    typeof product.rule.ceilingPrice === "number" &&
    finalTarget === product.rule.ceilingPrice &&
    boundedTarget > product.rule.ceilingPrice
  ) {
    reason = "ceiling_price_guard";
  }

  return {
    recommendedPrice: finalTarget,
    reason,
    lowestCompetitorPrice: competitor.price,
    matchedCompetitor: competitor,
    shouldUpdate: finalTarget !== product.currentPrice,
    margin: finalTarget - product.rule.costPrice
  };
}

export function createExecutionPreview(
  product: ProductMonitor,
  offers: MarketOffer[]
): ExecutionPreview {
  const suggestion = calculateSuggestedPrice(product, offers);

  return {
    currentPrice: product.currentPrice,
    suggestedPrice: suggestion.recommendedPrice,
    delta: suggestion.recommendedPrice - product.currentPrice,
    margin: suggestion.margin,
    matchedCompetitor: suggestion.matchedCompetitor,
    reason: suggestion.reason,
    shouldUpdate: suggestion.shouldUpdate
  };
}
