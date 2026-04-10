import { NextResponse } from "next/server";
import { getProductService } from "@/lib/runtime";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const service = getProductService();
  const result = await service.syncOwnListing(id);

  return NextResponse.json(result);
}
