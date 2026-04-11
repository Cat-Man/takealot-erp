import type { MarketOffer, ProductMonitor } from "@/core/types";
import type {
  ApplyPriceResult,
  MarketplaceProvider,
  OwnListingSnapshot
} from "./marketplace";

export type TakealotBrowserConfig = {
  profileDir: string;
  fetchPageText?: (url: string) => Promise<string>;
  browserChannel?: "chrome" | "chromium";
  publicProductPriceSelector: string;
  publicOfferSellerSelector: string;
  publicOfferPriceSelector: string;
  sellerPriceInputSelector: string;
  sellerSaveButtonSelector: string;
};

function createMissingConfigError(): Error {
  return new Error(
    "Takealot browser provider requires a persistent logged-in browser profile and verified selectors. Cloudflare and seller authentication prevent blind automation."
  );
}

function parseRandValue(value: string): number | undefined {
  const match = value.match(/R\s*([\d,]+)/i);

  if (!match) {
    return undefined;
  }

  const parsed = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isPossibleSellerName(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  if (parseRandValue(trimmed) !== undefined) {
    return false;
  }

  if (/^sold by\s+/i.test(trimmed)) {
    return false;
  }

  if (
    /^(best price|other offers|estimated delivery|t&cs apply|seller score|new|get it today|delivery|fastest delivery)$/i.test(
      trimmed
    )
  ) {
    return false;
  }

  return /[a-z]/i.test(trimmed);
}

function dedupeOffers(offers: MarketOffer[]): MarketOffer[] {
  const seen = new Set<string>();
  const deduped: MarketOffer[] = [];

  for (const offer of offers) {
    const key = `${offer.sellerName}::${offer.price}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(offer);
  }

  return deduped;
}

function parseCompetitionOffers(
  pageText: string,
  ownSellerName?: string
): MarketOffer[] {
  const offers: MarketOffer[] = [];
  const lines = pageText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const bestPriceIndex = lines.findIndex((line) => /^Best Price$/i.test(line));

  if (bestPriceIndex >= 0) {
    const soldByLine = lines
      .slice(bestPriceIndex, Math.min(bestPriceIndex + 12, lines.length))
      .find((line) => /^Sold by\s+/i.test(line));
    const bestPriceLine = lines
      .slice(bestPriceIndex, Math.min(bestPriceIndex + 6, lines.length))
      .find((line) => parseRandValue(line) !== undefined);
    const bestPrice = bestPriceLine ? parseRandValue(bestPriceLine) : undefined;
    const bestSeller = soldByLine?.replace(/^Sold by\s+/i, "").trim();

    if (bestPrice !== undefined && bestSeller && bestSeller !== ownSellerName) {
      offers.push({
        sellerName: bestSeller,
        price: bestPrice,
        currency: "ZAR"
      });
    }
  }

  const otherOffersIndex = lines.findIndex((line) => /^Other Offers$/i.test(line));

  if (otherOffersIndex >= 0) {
    for (let index = otherOffersIndex + 1; index < lines.length - 1; index += 1) {
      const price = parseRandValue(lines[index]!);
      const sellerName = lines[index + 1]?.trim();

      if (
        price === undefined ||
        !sellerName ||
        !isPossibleSellerName(sellerName) ||
        sellerName === ownSellerName
      ) {
        continue;
      }

      offers.push({
        sellerName,
        price,
        currency: "ZAR"
      });
    }
  }

  return dedupeOffers(offers);
}

export class TakealotBrowserProvider implements MarketplaceProvider {
  constructor(private readonly config?: Partial<TakealotBrowserConfig>) {}

  private async loadPublicProductText(url: string): Promise<string> {
    if (this.config?.fetchPageText) {
      return this.config.fetchPageText(url);
    }

    if (!this.config?.profileDir) {
      throw createMissingConfigError();
    }

    const { chromium } = await import("playwright");
    const context = await chromium.launchPersistentContext(this.config.profileDir, {
      headless: true,
      channel: this.config.browserChannel ?? "chrome"
    });

    try {
      const page = context.pages()[0] ?? (await context.newPage());

      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000
      });
      await page.waitForLoadState("networkidle", {
        timeout: 15000
      }).catch(() => undefined);

      return page.locator("body").innerText();
    } finally {
      await context.close();
    }
  }

  async fetchOwnListing(
    _product: ProductMonitor
  ): Promise<OwnListingSnapshot> {
    if (!this.config?.profileDir) {
      throw createMissingConfigError();
    }

    throw createMissingConfigError();
  }

  async fetchOffers(product: ProductMonitor): Promise<MarketOffer[]> {
    if (!this.config?.profileDir && !this.config?.fetchPageText) {
      throw createMissingConfigError();
    }

    const pageText = await this.loadPublicProductText(product.productUrl);
    return parseCompetitionOffers(pageText, product.ownSellerName);
  }

  async applyPrice(
    _productId: string,
    _newPrice: number,
    _product: ProductMonitor
  ): Promise<ApplyPriceResult> {
    if (!this.config?.profileDir) {
      throw createMissingConfigError();
    }

    throw createMissingConfigError();
  }
}
