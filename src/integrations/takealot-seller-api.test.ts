import { describe, expect, it, vi } from "vitest";
import { seedProducts } from "@/lib/fixtures";
import {
  TakealotSellerApiProvider,
  loadTakealotSellerApiConfig
} from "./takealot-seller-api";

describe("TakealotSellerApiProvider", () => {
  it("throws a clear error when the API key is missing", () => {
    expect(() => loadTakealotSellerApiConfig({})).toThrow(
      "Missing TAKEALOT_SELLER_API_KEY for Takealot Seller API provider."
    );
  });

  it("builds placeholder auth headers without pretending the protocol is verified", () => {
    const provider = new TakealotSellerApiProvider({
      apiKey: "seller-api-key"
    });

    expect(provider.buildAuthHeaders()).toEqual({
      "Content-Type": "application/json",
      "X-Takealot-Auth-Placeholder": "seller-api-key"
    });
  });

  it("blocks real writes when dry-run mode is enabled", async () => {
    const transport = vi.fn();
    const provider = new TakealotSellerApiProvider({
      apiKey: "seller-api-key",
      dryRun: true,
      transport
    });

    const result = await provider.applyPrice(
      seedProducts[0]!.id,
      233,
      seedProducts[0]!
    );

    expect(result).toMatchObject({
      appliedPrice: 233,
      mode: "dry-run"
    });
    expect(transport).not.toHaveBeenCalled();
  });
});
