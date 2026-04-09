import { NextResponse } from "next/server";
import { getProductService } from "@/lib/runtime";

export async function POST() {
  const service = getProductService();
  const products = await service.listProducts();
  const results = await service.refreshActiveProducts();
  const refreshedProductIds = new Set(results.map((result) => result.product.id));

  return NextResponse.json({
    results,
    summary: {
      requestedCount: products.length,
      refreshedCount: results.length,
      skippedCount: products.length - refreshedProductIds.size
    }
  });
}
