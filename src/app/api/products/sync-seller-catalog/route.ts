import { NextResponse } from "next/server";
import { getProductService } from "@/lib/runtime";

export async function POST() {
  const service = getProductService();
  const result = await service.syncSellerCatalog();

  return NextResponse.json({
    summary: {
      syncedCount: result.syncedCount,
      skippedCount: result.skippedCount
    },
    products: result.products
  });
}
