import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getWorkspaceFromRequest } from "@/lib/auth";
import { importBankStatement } from "@/lib/importer";
import {
  invalidatePublicCampaignCache,
  warmPublicCampaignCaches,
} from "@/lib/public-campaign";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const workspace = await getWorkspaceFromRequest(request);
    const file = formData.get("statementFile");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: `Vui lòng chọn file sao kê ${workspace}.` }, { status: 400 });
    }
    const expectedExtension = workspace === "VIB" ? ".xlsx" : ".pdf";
    if (!file.name.toLowerCase().endsWith(expectedExtension)) {
      return NextResponse.json({ error: workspace === "VIB" ? "Tài khoản VIB chỉ hỗ trợ file Excel .xlsx." : "Tài khoản BIDV chỉ hỗ trợ file PDF." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File sao kê vượt quá dung lượng 10 MB." }, { status: 400 });
    }

    const result = await importBankStatement(workspace, Buffer.from(await file.arrayBuffer()), file.name);
    const affectedCodes = invalidatePublicCampaignCache(result.affectedCampaignCodes);
    await warmPublicCampaignCaches(affectedCodes);

    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
