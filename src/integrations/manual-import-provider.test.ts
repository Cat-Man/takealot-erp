import { describe, expect, it } from "vitest";
import { seedProducts } from "@/lib/fixtures";
import { createManualImportMarketProvider } from "./manual-import-provider";

describe("createManualImportMarketProvider", () => {
  it("returns the stored manual competitor offer", async () => {
    const provider = createManualImportMarketProvider();
    const product = {
      ...seedProducts[0]!,
      manualMarketSnapshot: {
        competitor: {
          sellerName: "Manual Seller",
          price: 235,
          currency: "ZAR" as const
        },
        importedAt: "2026-04-09T08:00:00.000Z"
      }
    };

    const offers = await provider.fetchOffers(product);

    expect(offers).toEqual([
      {
        sellerName: "Manual Seller",
        price: 235,
        currency: "ZAR"
      }
    ]);
  });

  it("returns an empty list when no manual snapshot exists", async () => {
    const provider = createManualImportMarketProvider();

    const offers = await provider.fetchOffers(seedProducts[0]!);

    expect(offers).toEqual([]);
  });
});
