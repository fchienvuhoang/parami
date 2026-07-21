import type { BankWorkspace } from "@prisma/client";
import { decimalToNumber } from "@/lib/money";
import { getPrisma } from "@/lib/prisma";

export type ReadonlyWorkspaceSummary = {
  workspace: BankWorkspace;
  account: {
    bankName: string;
    accountNumber: string;
    accountName: string | null;
    currentBalance: number;
    currency: string;
  } | null;
  totalIncome: number;
  campaigns: Array<{
    code: string;
    name: string;
    status: "ACTIVE" | "PAUSED" | "COMPLETED";
    income: number;
    transactionCount: number;
  }>;
};

export async function getReadonlyDashboardData(): Promise<ReadonlyWorkspaceSummary[]> {
  const prisma = getPrisma();
  const workspaces: BankWorkspace[] = ["VIB"];

  return Promise.all(workspaces.map(async (workspace) => {
    const [account, campaigns, transactionSums, totalIncome] = await Promise.all([
      prisma.bankAccount.findFirst({
        where: { workspace },
        orderBy: { updatedAt: "desc" },
        select: {
          bankName: true,
          accountNumber: true,
          accountName: true,
          currentBalance: true,
          currency: true,
        },
      }),
      prisma.campaign.findMany({
        where: { workspace },
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
        select: { id: true, code: true, name: true, status: true },
      }),
      prisma.bankTransaction.groupBy({
        by: ["campaignId"],
        where: { workspace, campaignId: { not: null } },
        _sum: { creditAmount: true },
        _count: { _all: true },
      }),
      prisma.bankTransaction.aggregate({
        where: { workspace },
        _sum: { creditAmount: true },
      }),
    ]);

    const incomeByCampaign = new Map(transactionSums.map((item) => [item.campaignId, item]));
    return {
      workspace,
      account: account ? {
        ...account,
        currentBalance: decimalToNumber(account.currentBalance),
      } : null,
      totalIncome: decimalToNumber(totalIncome._sum.creditAmount),
      campaigns: campaigns.map((campaign) => {
        const summary = incomeByCampaign.get(campaign.id);
        return {
          code: campaign.code,
          name: campaign.name,
          status: campaign.status,
          income: decimalToNumber(summary?._sum.creditAmount),
          transactionCount: summary?._count._all ?? 0,
        };
      }),
    };
  }));
}
