import type { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { getWorkspaceFromRequest } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { makeCampaignCode, normalizeTransferText } from "@/lib/text";
import { invalidatePublicCampaignCache, warmPublicCampaignCaches } from "@/lib/public-campaign";

const updateCampaignSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED"]),
  keywords: z.array(z.string().min(1)).default([]),
});

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const workspace = await getWorkspaceFromRequest(request);
    const body = updateCampaignSchema.parse(await request.json());
    const prisma = getPrisma();
    const code = makeCampaignCode(body.code);
    const keywords = uniqueKeywords([body.code, ...body.keywords]);
    const previousCampaign = await prisma.campaign.findFirst({
      where: { id, workspace },
      select: { code: true },
    });
    if (!previousCampaign) return NextResponse.json({ error: "Không tìm thấy thiện pháp." }, { status: 404 });

    const campaign = await prisma.$transaction(async (tx: TransactionClient) => {
      await tx.campaignKeyword.deleteMany({
        where: { campaignId: id },
      });

      return tx.campaign.update({
        where: { id },
        data: {
          code,
          name: body.name.trim(),
          description: body.description?.trim() || null,
          status: body.status,
          keywords: {
            createMany: {
              data: keywords.map((keyword) => ({
                keyword,
                normalizedKeyword: normalizeTransferText(keyword),
              })),
              skipDuplicates: true,
            },
          },
        },
        include: {
          keywords: true,
        },
      });
    });
    const affectedCodes = invalidatePublicCampaignCache([previousCampaign?.code, campaign.code]);
    await warmPublicCampaignCaches(affectedCodes);

    return NextResponse.json(campaign);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const workspace = await getWorkspaceFromRequest(request);
    const prisma = getPrisma();

    const campaign = await prisma.campaign.findFirst({
      where: { id, workspace },
      select: {
        code: true,
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Không tìm thấy thiện pháp." }, { status: 404 });
    }

    if (campaign._count.transactions > 0) {
      return NextResponse.json(
        {
          error: "Chỉ có thể xóa thiện pháp chưa có giao dịch sao kê.",
        },
        { status: 409 },
      );
    }

    await prisma.campaign.delete({ where: { id } });
    invalidatePublicCampaignCache([campaign.code]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

function uniqueKeywords(keywords: string[]) {
  const seen = new Set<string>();
  return keywords
    .map((keyword) => keyword.trim())
    .filter((keyword) => {
      const normalized = normalizeTransferText(keyword);
      if (!normalized || seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
}
