import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { getWorkspaceFromRequest } from "@/lib/auth";
import { decimalToNumber } from "@/lib/money";
import { getPrisma } from "@/lib/prisma";
import { normalizeTransferText } from "@/lib/text";

export const runtime = "nodejs";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(50),
  campaignId: z.string().trim().optional().default("all"),
  query: z.string().trim().max(250).optional().default(""),
});

export async function GET(request: Request) {
  try {
    const workspace = await getWorkspaceFromRequest(request);
    const url = new URL(request.url);
    const input = querySchema.parse({
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
      campaignId: url.searchParams.get("campaignId") ?? undefined,
      query: url.searchParams.get("query") ?? undefined,
    });
    const prisma = getPrisma();
    const normalizedQuery = normalizeTransferText(input.query);

    const where: Prisma.BankTransactionWhereInput = {
      workspace,
      ...(input.campaignId === "unmatched"
        ? { campaignId: null }
        : input.campaignId !== "all"
          ? { campaignId: input.campaignId }
          : {}),
      ...(normalizedQuery
        ? {
            OR: [
              { normalizedDescription: { contains: normalizedQuery } },
              { transactionCode: { contains: input.query, mode: "insensitive" } },
              { campaign: { name: { contains: input.query, mode: "insensitive" } } },
              { campaign: { code: { contains: input.query, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const total = await prisma.bankTransaction.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
    const page = Math.min(input.page, totalPages);
    const transactions = await prisma.bankTransaction.findMany({
      where,
      include: {
        campaign: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }, { statementRow: "desc" }],
      skip: (page - 1) * input.pageSize,
      take: input.pageSize,
    });

    return NextResponse.json({
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        transactionDate: transaction.transactionDate.toISOString(),
        createdAt: transaction.createdAt.toISOString(),
        statementRow: transaction.statementRow,
        description: transaction.description,
        transactionCode: transaction.transactionCode,
        debitAmount: decimalToNumber(transaction.debitAmount),
        creditAmount: decimalToNumber(transaction.creditAmount),
        balanceAfter:
          transaction.balanceAfter == null ? null : decimalToNumber(transaction.balanceAfter),
        matchedKeyword: transaction.matchedKeyword,
        classificationStatus: transaction.classificationStatus,
        campaign: transaction.campaign,
      })),
      total,
      page,
      pageSize: input.pageSize,
      totalPages,
    });
  } catch (error) {
    return apiError(error);
  }
}
