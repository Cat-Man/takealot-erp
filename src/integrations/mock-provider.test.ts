import { describe, expect, it } from "vitest";
import { seedProducts } from "@/lib/fixtures";
import { createMockProvider } from "./mock-provider";

describe("createMockProvider", () => {
  it("returns deterministic offers for a known product", async () => {
    const provider = createMockProvider();

    const offers = await provider.fetchOffers(seedProducts[0]!);

    expect(offers).toEqual([
      { sellerName: "Cable Shop", price: 238, currency: "ZAR" },
      { sellerName: "Tech Hub", price: 244, currency: "ZAR" },
      { sellerName: "My Store", price: 249, currency: "ZAR" }
    ]);
  });

  it("records applied price updates", async () => {
    const provider = createMockProvider();

    const result = await provider.applyPrice(
      seedProducts[0]!.id,
      233,
      seedProducts[0]!
    );

    expect(result).toMatchObject({
      appliedPrice: 233
    });
    expect(provider.getAppliedUpdates()).toEqual([
      {
        productId: seedProducts[0]!.id,
        price: 233
      }
    ]);
  });
});
