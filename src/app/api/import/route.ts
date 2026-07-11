import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { importBidvStatement } from "@/lib/importer";
import {
  invalidatePublicCampaignCache,
  warmPublicCampaignCaches,
} from "@/lib/public-campaign";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const statementText = typeof body?.statementText === "string" ? body.statementText.trim() : "";
    if (!statementText) {
      return NextResponse.json({ error: "Vui lòng dán nội dung sao kê BIDV." }, { status: 400 });
    }

    const result = await importBidvStatement(statementText);
    const affectedCodes = invalidatePublicCampaignCache(result.affectedCampaignCodes);
    await warmPublicCampaignCaches(affectedCodes);

    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
