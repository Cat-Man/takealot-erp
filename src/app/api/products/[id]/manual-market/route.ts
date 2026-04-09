import { NextResponse } from "next/server";
import { getProductService } from "@/lib/runtime";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const patch = await request.json();
  const service = getProductService();
  const result = await service.updateManualMarketSnapshot(id, patch);

  return NextResponse.json(result);
}
