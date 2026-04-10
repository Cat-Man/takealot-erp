import { NextResponse } from "next/server";
import { getProductService } from "@/lib/runtime";

export async function POST() {
  const service = getProductService();
  const result = await service.syncActiveOwnListings();

  return NextResponse.json(result);
}
