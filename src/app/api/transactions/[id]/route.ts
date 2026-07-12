import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { getWorkspaceFromRequest } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import {
  invalidatePublicCampaignCache,
  warmPublicCampaignCaches,
} from "@/lib/public-campaign";

const updateTransactionSchema = z.object({
  campaignId: z.string().optional().nullable(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const workspace = await getWorkspaceFromRequest(request);
    const body = updateTransactionSchema.parse(await request.json());
    const prisma = getPrisma();

    const previousTransaction = await prisma.bankTransaction.findFirst({
      where: { id, workspace },
      select: { campaign: { select: { code: true } } },
    });
    if (!previousTransaction) return NextResponse.json({ error: "Không tìm thấy giao dịch." }, { status: 404 });
    if (body.campaignId) {
      const campaign = await prisma.campaign.findFirst({ where: { id: body.campaignId, workspace }, select: { id: true } });
      if (!campaign) return NextResponse.json({ error: "Thiện pháp không thuộc tài khoản này." }, { status: 400 });
    }
    const transaction = await prisma.bankTransaction.update({
      where: { id },
      data: {
        campaignId: body.campaignId || null,
        matchedKeyword: body.campaignId ? "Gán thủ công" : null,
        classificationStatus: body.campaignId ? "MANUAL" : "UNMATCHED",
      },
      include: { campaign: { select: { code: true } } },
    });

    const affectedCodes = invalidatePublicCampaignCache([
      previousTransaction?.campaign?.code,
      transaction.campaign?.code,
    ]);
    await warmPublicCampaignCaches(affectedCodes);

    return NextResponse.json(transaction);
  } catch (error) {
    return apiError(error);
  }
}
