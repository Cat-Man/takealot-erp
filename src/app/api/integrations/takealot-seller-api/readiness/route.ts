import { NextResponse } from "next/server";
import { getTakealotSellerApiReadinessReport } from "@/lib/runtime";

export async function GET() {
  return NextResponse.json(getTakealotSellerApiReadinessReport());
}
