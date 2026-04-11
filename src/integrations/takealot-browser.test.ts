import { describe, expect, it, vi } from "vitest";
import { TakealotBrowserProvider } from "./takealot-browser";

describe("TakealotBrowserProvider", () => {
  it("throws a clear error when no browser profile is configured", async () => {
    const provider = new TakealotBrowserProvider();

    await expect(
      provider.fetchOffers({
        id: "SKU-ABC123",
        title: "7-inch Kids Tablet",
        productUrl:
          "https://www.takealot.com/7-inch-kids-tablet/PLID98314826",
        offerUrl: "",
        provider: "takealot-seller-api",
        sellerProvider: "takealot-seller-api",
        marketProvider: "takealot-browser",
        ownSellerName: "My Store",
        currentPrice: 833,
        rule: {
          enabled: true,
          undercutBy: 5,
          floorPrice: 780,
          ceilingPrice: 900,
          costPrice: 620,
          minMargin: 40
        }
      })
    ).rejects.toThrow(
      "Takealot browser provider requires a persistent logged-in browser profile and verified selectors. Cloudflare and seller authentication prevent blind automation."
    );
  });

  it("parses best price and other offers from a public product page snapshot", async () => {
    const fetchPageText = vi.fn(async () =>
      [
        "Best Price",
        "R 833",
        "Sold by Lumistar Store",
        "Other Offers",
        "New",
        "7 offers from R 838",
        "R 838",
        "Silk Road Elegance",
        "R 839",
        "HomeNest",
        "R 858",
        "Global Department Store"
      ].join("\n")
    );
    const provider = new TakealotBrowserProvider({
      profileDir: "/tmp/takealot-profile",
      fetchPageText
    } as never);

    const offers = await provider.fetchOffers({
      id: "SKU-ABC123",
      title: "7-inch Kids Tablet",
      productUrl:
        "https://www.takealot.com/7-inch-kids-tablet/PLID98314826",
      offerUrl: "",
      provider: "takealot-seller-api",
      sellerProvider: "takealot-seller-api",
      marketProvider: "takealot-browser",
      ownSellerName: "My Store",
      currentPrice: 833,
      rule: {
        enabled: true,
        undercutBy: 5,
        floorPrice: 780,
        ceilingPrice: 900,
        costPrice: 620,
        minMargin: 40
      }
    });

    expect(fetchPageText).toHaveBeenCalledWith(
      "https://www.takealot.com/7-inch-kids-tablet/PLID98314826"
    );
    expect(offers).toEqual([
      { sellerName: "Lumistar Store", price: 833, currency: "ZAR" },
      { sellerName: "Silk Road Elegance", price: 838, currency: "ZAR" },
      { sellerName: "HomeNest", price: 839, currency: "ZAR" },
      { sellerName: "Global Department Store", price: 858, currency: "ZAR" }
    ]);
  });
});
