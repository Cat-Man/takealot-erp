import { NextResponse } from "next/server";
import {
  getTakealotSellerApiSettingsState,
  saveTakealotSellerApiSettings
} from "@/lib/runtime";

type SettingsPatch = {
  apiKey?: string;
  baseUrl?: string;
  dryRun?: boolean;
  authHeaderName?: string;
  authHeaderPrefix?: string;
  ownListingPathTemplate?: string;
};

export async function GET() {
  return NextResponse.json(getTakealotSellerApiSettingsState());
}

export async function PATCH(request: Request) {
  const patch = (await request.json()) as SettingsPatch;
  const result = await saveTakealotSellerApiSettings(patch);

  return NextResponse.json(result);
}
