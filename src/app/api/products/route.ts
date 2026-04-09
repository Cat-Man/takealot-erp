import { NextResponse } from "next/server";
import { getProductService } from "@/lib/runtime";

export async function GET() {
  const service = getProductService();
  const [products, executions, marketSnapshots] = await Promise.all([
    service.listProducts(),
    service.listExecutions(),
    service.listMarketSnapshots()
  ]);

  return NextResponse.json({
    products,
    executions,
    marketSnapshots
  });
}
